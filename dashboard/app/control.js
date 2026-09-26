// dw-control: the only component with Docker access.
// Exposes a fixed set of operations on ONE container over an internal-only network.
// No passthrough, no user-supplied container names, no user-supplied regexes.
import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';

const CONTAINER = process.env.DW_CONTAINER || 'Dragonwilds';
const STEAM_APP_ID = process.env.DW_STEAM_APP_ID || '4019830';
const TOKEN = process.env.CONTROL_TOKEN || '';
const PORT = 8080;
const INI = '/game/Saved/Config/LinuxServer/DedicatedServer.ini';
const SAVED_PARENT = '/game';
const BACKUP_DIR = '/backups';
const KEEP_BACKUPS = Number(process.env.DW_KEEP_BACKUPS) || 7;

if (TOKEN.length < 32) {
  console.error('CONTROL_TOKEN missing or too short');
  process.exit(1);
}

// ---------- Docker Engine API over the unix socket ----------
function docker(method, apiPath, { maxBytes = 4 * 1024 * 1024, timeoutMs = 90_000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: '/var/run/docker.sock', path: `/v1.43${apiPath}`, method, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        let size = 0;
        res.on('data', (c) => {
          size += c.length;
          if (size > maxBytes) { req.destroy(new Error('docker response too large')); return; }
          chunks.push(c);
        });
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('docker request timed out')));
    req.on('error', reject);
    req.end();
  });
}

async function dockerJson(method, apiPath, opts) {
  const r = await docker(method, apiPath, opts);
  if (r.status >= 400) throw new Error(`docker ${method} ${apiPath} -> ${r.status}: ${r.body.toString().slice(0, 200)}`);
  return r.body.length ? JSON.parse(r.body.toString()) : null;
}

// ---------- Redaction: secrets must never leave this process ----------
function redact(line) {
  return line
    .replace(/([?&]p=)[^?&\s]*/g, '$1***')
    .replace(/(WorldPassword\s*[:=]\s*).*/gi, '$1***')
    .replace(/(AdminPassword\s*[:=]\s*).*/gi, '$1***');
}

// ---------- Game log file ----------
// Read the game's own log file rather than `docker logs`: the server's stdout is block-buffered,
// so Docker receives lines minutes late when the server is idle. The file is written promptly,
// and each line carries the game's own UTC timestamp.
const LOG_FILE = '/game/Saved/Logs/RSDragonwilds.log';
const TAIL_LINES = 500;
const MAX_CHUNK = 4 * 1024 * 1024;

// Lines the dashboard needs for player tracking and health, used for the full-file scan.
const EVENT_RE = /Player ADDED to session|Player Removed from session|Save completed SUCCESSFULLY|operation HeartbeatSession to service Sessions|listening on port 7777|Error:|Fatal/;
const UE_TS = /^\[(\d{4})\.(\d\d)\.(\d\d)-(\d\d)\.(\d\d)\.(\d\d):(\d{3})\]/;

function parseLine(raw) {
  const text = redact(raw.replace(/\r$/, ''));
  const m = text.match(UE_TS);
  const ts = m ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7])).toISOString() : null;
  return { ts, text };
}

// id = inode; the game renames the old file to a backup and starts a new one each run.
async function readGameLog(reqId, reqOffset) {
  let st;
  try { st = await fs.stat(LOG_FILE); } catch { return { missing: true }; }
  const id = String(st.ino);

  if (reqId !== id || reqOffset > st.size) {
    const events = [];
    const tail = [];
    if (st.size > 0) {
      const rl = readline.createInterface({ input: createReadStream(LOG_FILE, { start: 0, end: st.size - 1 }), crlfDelay: Infinity });
      for await (const raw of rl) {
        if (!raw) continue;
        const l = parseLine(raw);
        if (EVENT_RE.test(l.text)) { events.push(l); if (events.length > 20000) events.splice(0, 5000); }
        tail.push(l);
        if (tail.length > TAIL_LINES) tail.shift();
      }
    }
    return { reset: true, id, offset: st.size, size: st.size, events, tail };
  }

  const len = Math.min(st.size - reqOffset, MAX_CHUNK);
  if (len <= 0) return { reset: false, id, offset: reqOffset, size: st.size, lines: [] };
  const buf = Buffer.alloc(len);
  const fh = await fs.open(LOG_FILE, 'r');
  try { await fh.read(buf, 0, len, reqOffset); } finally { await fh.close(); }
  const lastNl = buf.lastIndexOf(0x0a);
  if (lastNl < 0) return { reset: false, id, offset: reqOffset, size: st.size, lines: [] }; // partial line, wait
  const lines = buf.toString('utf8', 0, lastNl).split('\n').filter(Boolean).map(parseLine);
  return { reset: false, id, offset: reqOffset + lastNl + 1, size: st.size, lines };
}

// ---------- Status ----------
async function getStatus() {
  const r = await docker('GET', `/containers/${CONTAINER}/json`);
  if (r.status === 404) return { exists: false };
  if (r.status >= 400) throw new Error(`inspect -> ${r.status}`);
  const c = JSON.parse(r.body.toString());
  const status = {
    exists: true,
    state: c.State.Status,
    running: c.State.Running,
    startedAt: c.State.StartedAt,
    finishedAt: c.State.FinishedAt,
    exitCode: c.State.ExitCode,
    restartCount: c.RestartCount,
    oomKilled: c.State.OOMKilled,
    image: c.Config.Image,
    memLimit: c.HostConfig.Memory,
    cpuLimit: c.HostConfig.NanoCpus / 1e9,
    ports: Object.keys(c.NetworkSettings.Ports || {}),
  };
  try {
    const img = await dockerJson('GET', `/images/${encodeURIComponent(c.Image)}/json`);
    status.imageCreated = img.Created;
  } catch { /* ignore */ }
  if (c.State.Running) {
    try {
      const s = await dockerJson('GET', `/containers/${CONTAINER}/stats?stream=false`, { timeoutMs: 15_000 });
      const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
      const sysDelta = (s.cpu_stats.system_cpu_usage || 0) - (s.precpu_stats.system_cpu_usage || 0);
      const online = s.cpu_stats.online_cpus || 1;
      status.cpuPercent = sysDelta > 0 ? (cpuDelta / sysDelta) * online * 100 : 0;
      const cache = s.memory_stats.stats?.inactive_file ?? s.memory_stats.stats?.total_inactive_file ?? 0;
      status.memUsage = Math.max(0, (s.memory_stats.usage || 0) - cache);
      status.pids = s.pids_stats?.current;
      const nets = Object.values(s.networks || {});
      status.netRx = nets.reduce((a, n) => a + n.rx_bytes, 0);
      status.netTx = nets.reduce((a, n) => a + n.tx_bytes, 0);
    } catch (e) {
      status.statsError = e.message;
    }
  }
  return status;
}

// ---------- Settings (read-only, no password) ----------
async function getSettings() {
  const txt = await fs.readFile(INI, 'utf8');
  const get = (k) => (txt.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim() ?? '';
  return {
    serverName: get('ServerName'),
    worldName: get('DefaultWorldName'),
    ownerId: get('OwnerId'),
    platformPolicy: get('PlatformPolicy'),
    hasWorldPassword: get('WorldPassword').length > 0,
    crashDumps: get('bAllowSendingCrashDumps'),
    build: await getInstalledBuild(),
  };
}

// SteamCMD's install record. StateFlags 4 = fully installed; 6 = installed but an update is pending
// (i.e. the last update attempt failed).
const APP_MANIFEST = `/steamapps/appmanifest_${STEAM_APP_ID}.acf`;
async function getInstalledBuild() {
  try {
    const txt = await fs.readFile(APP_MANIFEST, 'utf8');
    const get = (k) => (txt.match(new RegExp(`"${k}"\\s+"([^"]*)"`)) || [])[1] ?? null;
    return {
      buildId: get('buildid'),
      stateFlags: Number(get('StateFlags')),
      lastUpdated: get('LastUpdated') ? new Date(Number(get('LastUpdated')) * 1000).toISOString() : null,
    };
  } catch {
    return null;
  }
}

// ---------- Backups ----------
async function listBackups() {
  const names = (await fs.readdir(BACKUP_DIR)).filter((n) => /^dragonwilds-.*\.tar\.gz$/.test(n));
  const items = await Promise.all(
    names.map(async (name) => {
      const st = await fs.stat(path.join(BACKUP_DIR, name));
      return { name, size: st.size, mtime: st.mtime.toISOString() };
    })
  );
  items.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return { items, totalSize: items.reduce((a, b) => a + b.size, 0) };
}

function runTar(outFile) {
  return new Promise((resolve, reject) => {
    const p = spawn('tar', ['-czf', outFile, '-C', SAVED_PARENT, 'Saved'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`tar exited ${code}: ${err.slice(0, 300)}`))));
  });
}

// ---------- Jobs: one operation at a time ----------
let job = { name: null, running: false, step: '', ok: null, message: '', startedAt: null, finishedAt: null };

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function containerOp(op) {
  const q = op === 'start' ? '' : '?t=60';
  const r = await docker('POST', `/containers/${CONTAINER}/${op}${q}`, { timeoutMs: 120_000 });
  // 304 = already in requested state
  if (r.status >= 400) throw new Error(`${op} -> ${r.status}: ${r.body.toString().slice(0, 200)}`);
}

const ACTIONS = {
  start: async (set) => { set('Starting server'); await containerOp('start'); return 'Server started'; },
  stop: async (set) => { set('Stopping server (saving world, up to 60s)'); await containerOp('stop'); return 'Server stopped'; },
  restart: async (set) => { set('Restarting server (saving world, up to 60s)'); await containerOp('restart'); return 'Server restarted'; },
  backup: async (set) => {
    const before = await getStatus();
    const wasRunning = before.running;
    const out = path.join(BACKUP_DIR, `dragonwilds-${stamp()}.tar.gz`);
    if (wasRunning) { set('Stopping server so the save is consistent'); await containerOp('stop'); }
    try {
      set('Compressing world save');
      await runTar(out);
    } finally {
      if (wasRunning) { set('Starting server'); await containerOp('start'); }
    }
    set('Removing old backups');
    const { items } = await listBackups();
    for (const old of items.slice(KEEP_BACKUPS)) await fs.unlink(path.join(BACKUP_DIR, old.name));
    const st = await fs.stat(out);
    return `Backup saved: ${path.basename(out)} (${(st.size / 1024).toFixed(0)} KB)`;
  },
};

function startJob(name) {
  if (job.running) return false;
  job = { name, running: true, step: 'Queued', ok: null, message: '', startedAt: new Date().toISOString(), finishedAt: null };
  const set = (step) => { job.step = step; };
  ACTIONS[name](set)
    .then((msg) => { job.ok = true; job.message = msg; })
    .catch((e) => { job.ok = false; job.message = e.message; console.error(`job ${name} failed:`, e); })
    .finally(() => { job.running = false; job.step = ''; job.finishedAt = new Date().toISOString(); });
  return true;
}

// ---------- HTTP ----------
function authed(req) {
  const got = Buffer.from(req.headers['x-control-token'] || '');
  const want = Buffer.from(TOKEN);
  return got.length === want.length && timingSafeEqual(got, want);
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

http
  .createServer(async (req, res) => {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
    const url = new URL(req.url, 'http://x');
    try {
      if (req.method === 'GET' && url.pathname === '/status') return send(res, 200, await getStatus());
      if (req.method === 'GET' && url.pathname === '/settings') return send(res, 200, await getSettings());
      if (req.method === 'GET' && url.pathname === '/backups') return send(res, 200, await listBackups());
      if (req.method === 'GET' && url.pathname === '/job') return send(res, 200, job);
      if (req.method === 'GET' && url.pathname === '/gamelog') {
        const offset = Number(url.searchParams.get('offset'));
        if (!Number.isSafeInteger(offset) || offset < 0) return send(res, 400, { error: 'bad offset' });
        return send(res, 200, await readGameLog(url.searchParams.get('id') || '', offset));
      }
      const m = url.pathname.match(/^\/action\/(start|stop|restart|backup)$/);
      if (req.method === 'POST' && m) {
        return startJob(m[1]) ? send(res, 202, { accepted: true }) : send(res, 409, { error: `Busy: ${job.name} in progress` });
      }
      send(res, 404, { error: 'not found' });
    } catch (e) {
      console.error(e);
      send(res, 500, { error: e.message });
    }
  })
  .listen(PORT, () => console.log(`dw-control listening on ${PORT}`));
