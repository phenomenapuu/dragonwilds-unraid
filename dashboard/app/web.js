// dw-dash: web dashboard. Has no Docker access; talks only to dw-control over the internal network.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PORT = 8890;
const CONTROL = process.env.CONTROL_URL || 'http://dw-control:8080';
const TOKEN = process.env.CONTROL_TOKEN || '';
const DATA = '/data';
const AUTH_FILE = path.join(DATA, 'auth.json');
const PLAYERS_FILE = path.join(DATA, 'players.json');
const LOG_BUFFER = 500;
const SESSION_MS = 12 * 60 * 60 * 1000;
const HEARTBEAT_STALE_MS = 3 * 60 * 1000;

// ---------- Password ----------
function hashPassword(pw, salt = randomBytes(16)) {
  const hash = scryptSync(pw, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt: salt.toString('hex'), hash: hash.toString('hex') };
}

function newPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(20);
  let s = '';
  for (let i = 0; i < 20; i++) s += alphabet[bytes[i] % alphabet.length];
  return s.match(/.{5}/g).join('-');
}

function writePassword() {
  const pw = newPassword();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(hashPassword(pw)), { mode: 0o600 });
  fs.writeFileSync(path.join(DATA, 'INITIAL_PASSWORD.txt'), pw + '\n', { mode: 0o600 });
  return pw;
}

if (process.argv[2] === 'reset-password') {
  console.log(`New dashboard password: ${writePassword()}`);
  process.exit(0);
}
if (TOKEN.length < 32) {
  console.error('CONTROL_TOKEN missing or too short');
  process.exit(1);
}
if (!fs.existsSync(AUTH_FILE)) {
  writePassword();
  console.log('Generated dashboard password; see INITIAL_PASSWORD.txt in the data folder.');
}

function checkPassword(pw) {
  const { salt, hash } = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  const got = hashPassword(pw, Buffer.from(salt, 'hex')).hash;
  return timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(hash, 'hex'));
}

// ---------- Sessions & rate limiting ----------
const sessions = new Map(); // token -> expiry
const failures = new Map(); // ip -> [timestamps]

function sessionFrom(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)dwsid=([a-f0-9]{64})/);
  if (!m) return null;
  const exp = sessions.get(m[1]);
  if (!exp || exp < Date.now()) { sessions.delete(m[1]); return null; }
  return m[1];
}

function tooManyFailures(ip) {
  const recent = (failures.get(ip) || []).filter((t) => t > Date.now() - 15 * 60 * 1000);
  failures.set(ip, recent);
  return recent.length >= 5;
}

// ---------- Control client ----------
async function control(method, p) {
  const r = await fetch(CONTROL + p, { method, headers: { 'x-control-token': TOKEN }, signal: AbortSignal.timeout(60_000) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 409) throw new Error(body.error || `control ${p} -> ${r.status}`);
  return { status: r.status, body };
}

// ---------- Persistent player history ----------
let history = { players: {}, events: [] };
try { history = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8')); } catch { /* first run */ }
const eventKeys = new Set(history.events.map((e) => `${e.ts}|${e.type}|${e.id}`));
let historyDirty = false;

function recordEvent(type, id, name, ts) {
  const key = `${ts}|${type}|${id}`;
  if (eventKeys.has(key)) return false;
  eventKeys.add(key);
  history.events.push({ ts, type, id, name });
  if (history.events.length > 300) history.events.splice(0, history.events.length - 300);
  const p = (history.players[id] ||= { name, firstSeen: ts, lastSeen: ts, totalMs: 0, sessions: 0 });
  p.name = name;
  p.lastSeen = ts;
  if (type === 'join') p.sessions += 1;
  historyDirty = true;
  return true;
}

setInterval(async () => {
  if (!historyDirty) return;
  historyDirty = false;
  const tmp = PLAYERS_FILE + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(history));
  await fsp.rename(tmp, PLAYERS_FILE);
}, 10_000);

// ---------- Live state ----------
const state = {
  status: null, settings: null, backups: null, job: null,
  online: new Map(), // id -> { name, since }
  logs: [], errors: [],
  lastSave: null, lastHeartbeat: null, listeningAt: null,
  runStartedAt: null, fileId: null, offset: 0, lastTs: null,
  controlError: null, updatedAt: null,
};

// Error lines the game prints during normal operation on a healthy server (observed 2026-09).
const BENIGN_ERRORS = /TryGetWeaponSkillForAttackingActor|Navmesh bounds are too large|No Online Subsystem found|Failed to fetch relevant OnlineSubsystem|LogStreaming: Error: CreateExport|No static data available for spell|Local Player Character not found/;

const JOIN_RE =/Player ADDED to session \[([0-9a-f]{32})\]-\[(.*)\]\s*$/;
const LEAVE_RE = /Player Removed from session \[([0-9a-f]{32})\]-\[(.*)\]\s*$/;

// history.closed remembers which sessions already counted toward playtime, so re-scanning
// logs after a dashboard restart never adds the same session twice.
history.closed ||= [];
const closedKeys = new Set(history.closed);

function closeSession(id, endTs) {
  const s = state.online.get(id);
  if (!s) return;
  state.online.delete(id);
  const key = `${id}|${s.since}`;
  if (closedKeys.has(key)) return;
  closedKeys.add(key);
  history.closed.push(key);
  if (history.closed.length > 1000) history.closed.splice(0, history.closed.length - 1000);
  const p = history.players[id];
  if (p) { p.totalMs += Math.max(0, Date.parse(endTs) - Date.parse(s.since)); p.lastSeen = endTs; }
  historyDirty = true;
}

function processLine({ ts, text }, { buffer }) {
  let m;
  if ((m = text.match(JOIN_RE))) {
    if (recordEvent('join', m[1], m[2], ts) || !state.online.has(m[1])) state.online.set(m[1], { name: m[2], since: ts });
  } else if ((m = text.match(LEAVE_RE))) {
    recordEvent('leave', m[1], m[2], ts);
    closeSession(m[1], ts);
  } else if (text.includes('Save completed SUCCESSFULLY')) {
    state.lastSave = ts;
  } else if (text.includes('Finished successful HTTP request for operation HeartbeatSession')) {
    state.lastHeartbeat = ts;
  } else if (text.includes('listening on port 7777')) {
    state.listeningAt ||= ts;
  }
  if (/\bError:|Fatal/.test(text) && !BENIGN_ERRORS.test(text)) {
    // Collapse repeats of the same message (ignoring UE's timestamp prefix and actor instance numbers).
    const sig = text.replace(/^\[[^\]]*\]\[ *\d+\]/, '').replace(/_\d{6,}/g, '_N');
    const existing = state.errors.find((e) => e.sig === sig);
    if (existing) { existing.ts = ts; existing.count += 1; }
    else {
      state.errors.push({ ts, text, sig, count: 1 });
      if (state.errors.length > 50) state.errors.shift();
    }
  }
  if (buffer) {
    state.logs.push({ ts, text });
    if (state.logs.length > LOG_BUFFER) state.logs.shift();
  }
}

// Lines without the game's timestamp prefix (continuations, early boot) inherit the previous one.
function fillTs(l) {
  if (l.ts) state.lastTs = l.ts;
  else l.ts = state.lastTs || new Date().toISOString();
  return l;
}

async function readGameLog() {
  for (let i = 0; i < 10; i++) {
    const r = (await control('GET', `/gamelog?id=${encodeURIComponent(state.fileId || '')}&offset=${state.offset}`)).body;
    if (r.missing) return;
    if (r.reset) {
      // New log file = the game (re)started. Anyone still marked online was disconnected.
      if (state.fileId) for (const id of [...state.online.keys()]) closeSession(id, state.lastTs || new Date().toISOString());
      Object.assign(state, { logs: [], errors: [], lastSave: null, lastHeartbeat: null, listeningAt: null, fileId: r.id, offset: r.offset });
      for (const l of r.events) processLine(fillTs(l), { buffer: false });
      state.logs = r.tail.map((l) => ({ ts: l.ts || state.lastTs, text: l.text }));
      return;
    }
    for (const l of r.lines) processLine(fillTs(l), { buffer: true });
    state.offset = r.offset;
    if (r.offset >= r.size || !r.lines.length) return;
  }
}

async function poll() {
  try {
    const [status, job] = await Promise.all([control('GET', '/status'), control('GET', '/job')]);
    state.status = status.body;
    state.job = job.body;
    const st = status.body;
    // Container restarted: the game keeps writing to the previous log file until it boots,
    // so don't trust that file's health markers for the new run.
    if (st.startedAt && st.startedAt !== state.runStartedAt) {
      if (state.runStartedAt) Object.assign(state, { lastHeartbeat: null, listeningAt: null });
      state.runStartedAt = st.startedAt;
    }
    await readGameLog();
    if (st.exists && !st.running && state.online.size) {
      for (const id of [...state.online.keys()]) closeSession(id, st.finishedAt);
    }
    state.controlError = null;
    state.updatedAt = new Date().toISOString();
  } catch (e) {
    state.controlError = e.message;
    console.error('poll failed:', e.message);
  }
}

async function pollSlow() {
  try {
    const [settings, backups] = await Promise.all([control('GET', '/settings'), control('GET', '/backups')]);
    state.settings = settings.body;
    state.backups = backups.body;
  } catch (e) {
    console.error('slow poll failed:', e.message);
  }
}

// ---------- Latest public build on Steam ----------
// dw-control has no internet on purpose, so the web container asks api.steamcmd.net (a public
// mirror of SteamCMD's app info) for the current public build of the server app.
const STEAM_APP = process.env.DW_STEAM_APP_ID || '4019830';
state.latest = null; // { buildId, released, checkedAt } | { error, checkedAt }

async function checkLatestBuild() {
  try {
    const r = await fetch(`https://api.steamcmd.net/v1/info/${STEAM_APP}`, { signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const pub = (await r.json())?.data?.[STEAM_APP]?.depots?.branches?.public;
    if (!pub?.buildid) throw new Error('no public build in response');
    state.latest = {
      buildId: pub.buildid,
      released: pub.timeupdated ? new Date(Number(pub.timeupdated) * 1000).toISOString() : null,
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    state.latest = { ...(state.latest?.buildId ? state.latest : {}), error: e.message, checkedAt: new Date().toISOString() };
    console.error('latest build check failed:', e.message);
  }
}
setInterval(checkLatestBuild, 30 * 60 * 1000);
checkLatestBuild();

function updateStatus() {
  const installed = state.settings?.build;
  const latest = state.latest;
  const base = { installed, latest };
  // While the container boots, SteamCMD runs before the game and the install record is in flux.
  // listeningAt may come from the previous run's log file until the game rotates it, so only
  // count it if it's newer than the container start.
  const st = state.status;
  const gameUp = state.listeningAt && st?.startedAt && Date.parse(state.listeningAt) >= Date.parse(st.startedAt);
  const UPDATE_RUNNING = 1024;
  const inFlux = installed && (installed.buildId === '0' || installed.stateFlags & UPDATE_RUNNING);
  if (st?.running && (!gameUp || inFlux) && Date.now() - Date.parse(st.startedAt) < 40 * 60 * 1000) {
    return { ...base, level: 'info', message: 'Server is starting â€” SteamCMD installs any game update before the game launches.' };
  }
  if (!installed) return { ...base, level: 'unknown', message: 'Installed build unknown (install record missing â€” update may be in progress).' };
  if (latest?.buildId && Number(installed.buildId) < Number(latest.buildId)) {
    const failed = installed.stateFlags !== 4;
    return {
      ...base,
      level: 'bad',
      message: failed
        ? `Update failed: the server is on build ${installed.buildId}, but Steam has ${latest.buildId}. Players on the new version can't join. The last update attempt didn't finish â€” restart the server to retry; if it keeps failing, check the Dragonwilds container log for SteamCMD errors.`
        : `Out of date: the server is on build ${installed.buildId}, but Steam has ${latest.buildId}. Players on the new version can't join until the server restarts (it updates on every start).`,
    };
  }
  if (installed.stateFlags !== 4 && installed.stateFlags) {
    return { ...base, level: 'bad', message: `SteamCMD reports the install needs an update (state ${installed.stateFlags}) â€” the last update attempt failed. Restart the server to retry.` };
  }
  if (!latest?.buildId) return { ...base, level: 'unknown', message: `Build ${installed.buildId}; couldn't check Steam for the latest build.` };
  return { ...base, level: 'ok', message: `Up to date (build ${installed.buildId}).` };
}

let polling = false;
async function pollLoop() {
  if (polling) return;
  polling = true;
  try { await poll(); } finally { polling = false; }
}
setInterval(pollLoop, 5000);
setInterval(pollSlow, 60_000);
pollLoop();
pollSlow();

function health() {
  const st = state.status;
  if (state.controlError && !st) return { level: 'unknown', label: 'Unknown', detail: state.controlError };
  if (!st?.exists) return { level: 'down', label: 'Missing', detail: 'Container not found' };
  if (!st.running) return { level: 'down', label: 'Stopped', detail: `Exited with code ${st.exitCode}` };
  const up = Date.now() - Date.parse(st.startedAt);
  const hbThisRun = state.lastHeartbeat && Date.parse(state.lastHeartbeat) >= Date.parse(st.startedAt);
  const hb = hbThisRun ? Date.now() - Date.parse(state.lastHeartbeat) : Infinity;
  if (hb < HEARTBEAT_STALE_MS) return { level: 'ok', label: 'Online', detail: 'Listed in the server browser' };
  const gameUp = state.listeningAt && Date.parse(state.listeningAt) >= Date.parse(st.startedAt);
  if (up < 10 * 60 * 1000 || (!gameUp && up < 40 * 60 * 1000)) return { level: 'warn', label: 'Starting', detail: gameUp ? 'Loading world' : 'Updating / booting' };
  return { level: 'warn', label: 'Degraded', detail: 'Running, but no heartbeat to Epic in 3+ minutes' };
}

function publicState(authed) {
  return {
    authed,
    health: health(),
    status: state.status,
    settings: state.settings,
    update: updateStatus(),
    backups: state.backups,
    job: state.job,
    online: [...state.online.entries()].map(([id, s]) => ({ id, ...s })),
    players: Object.entries(history.players)
      .map(([id, p]) => ({ id, ...p, online: state.online.has(id) }))
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)),
    events: history.events.slice(-40).reverse(),
    logs: state.logs,
    errors: state.errors.slice().sort((a, b) => b.ts.localeCompare(a.ts)).map(({ ts, text, count }) => ({ ts, text, count })),
    lastSave: state.lastSave,
    lastHeartbeat: state.lastHeartbeat,
    controlError: state.controlError,
    updatedAt: state.updatedAt,
  };
}

// ---------- HTTP ----------
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'],
};
const staticFiles = Object.fromEntries(
  Object.entries(STATIC).map(([route, [file, type]]) => [route, { body: fs.readFileSync(new URL(`./public/${file}`, import.meta.url)), type }])
);

const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
};

function send(res, code, obj, extra = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { ...SECURITY_HEADERS, 'content-type': 'application/json', ...extra });
  res.end(body);
}

function readBody(req, limit = 2048) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > limit) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Cross-site request guard for state-changing calls (on top of SameSite=Strict cookies).
function sameOrigin(req) {
  if (req.headers['x-dw'] !== '1') return false;
  const origin = req.headers.origin;
  return !origin || origin === `http://${req.headers.host}`;
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const ip = req.socket.remoteAddress;
    try {
      if (req.method === 'GET' && staticFiles[url.pathname]) {
        const f = staticFiles[url.pathname];
        res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': f.type });
        return res.end(f.body);
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        return send(res, 200, publicState(!!sessionFrom(req)));
      }
      if (req.method === 'POST' && url.pathname === '/api/login') {
        if (!sameOrigin(req)) return send(res, 403, { error: 'Bad origin' });
        if (tooManyFailures(ip)) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
        let pw = '';
        try { pw = String(JSON.parse(await readBody(req)).password || ''); } catch { /* empty */ }
        if (!pw || !checkPassword(pw)) {
          failures.get(ip).push(Date.now());
          return send(res, 401, { error: 'Wrong password' });
        }
        const token = randomBytes(32).toString('hex');
        sessions.set(token, Date.now() + SESSION_MS);
        return send(res, 200, { ok: true }, {
          'set-cookie': `dwsid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`,
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/logout') {
        const s = sessionFrom(req);
        if (s) sessions.delete(s);
        return send(res, 200, { ok: true }, { 'set-cookie': 'dwsid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
      }
      const m = url.pathname.match(/^\/api\/action\/(start|stop|restart|backup)$/);
      if (req.method === 'POST' && m) {
        if (!sameOrigin(req)) return send(res, 403, { error: 'Bad origin' });
        if (!sessionFrom(req)) return send(res, 401, { error: 'Log in first' });
        const r = await control('POST', `/action/${m[1]}`);
        console.log(`action ${m[1]} from ${ip}: ${r.status}`);
        setTimeout(pollLoop, 1000);
        return send(res, r.status, r.body);
      }
      send(res, 404, { error: 'not found' });
    } catch (e) {
      console.error(e);
      send(res, 500, { error: e.message });
    }
  })
  .listen(PORT, () => console.log(`dw-dash listening on ${PORT}`));
