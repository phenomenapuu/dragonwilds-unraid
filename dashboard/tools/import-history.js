// One-off: rebuild /data/players.json from older game logs.
// Sources: rotated game log files (/logs/RSDragonwilds-backup-*.log) and the old container's
// docker log dump (/old/old-container.log). The current RSDragonwilds.log is left to the dashboard.
import fs from 'node:fs';
import path from 'node:path';

const UE_TS = /^\[(\d{4})\.(\d\d)\.(\d\d)-(\d\d)\.(\d\d)\.(\d\d):(\d{3})\]/;
const JOIN_RE = /Player ADDED to session \[([0-9a-f]{32})\]-\[(.*)\]\s*$/;
const LEAVE_RE = /Player Removed from session \[([0-9a-f]{32})\]-\[(.*)\]\s*$/;
const RUN_START = /^---Start Server---/;

const sources = [];
for (const f of fs.readdirSync('/logs').filter((n) => /^RSDragonwilds-backup-.*\.log$/.test(n)).sort()) {
  sources.push(path.join('/logs', f));
}
if (fs.existsSync('/old/old-container.log')) sources.push('/old/old-container.log');

const sessions = new Map(); // `${id}|${join}` -> { id, name, join, leave }
const names = {};

for (const file of sources) {
  const open = new Map(); // id -> { name, join }
  let lastTs = null;
  let found = 0;
  const closeAll = () => {
    for (const [id, s] of open) {
      const key = `${id}|${s.join}`;
      if (!sessions.has(key)) sessions.set(key, { id, name: s.name, join: s.join, leave: lastTs, inferred: true });
    }
    open.clear();
  };
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.replace(/\r$/, '').replace(/\x1b\[[0-9;]*m/g, '');
    if (RUN_START.test(line)) { closeAll(); continue; }
    const m = line.match(UE_TS);
    if (!m) continue;
    const ts = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7])).toISOString();
    lastTs = ts;
    let e;
    if ((e = line.match(JOIN_RE))) {
      names[e[1]] = e[2];
      open.set(e[1], { name: e[2], join: ts });
      found++;
    } else if ((e = line.match(LEAVE_RE))) {
      const s = open.get(e[1]);
      if (s) {
        const key = `${e[1]}|${s.join}`;
        // A real leave beats an inferred end from another source covering the same session.
        const existing = sessions.get(key);
        if (!existing || existing.inferred) sessions.set(key, { id: e[1], name: e[2], join: s.join, leave: ts, inferred: false });
        open.delete(e[1]);
      }
      found++;
    }
  }
  closeAll();
  console.log(`${path.basename(file)}: ${found} join/leave lines`);
}

const history = { players: {}, events: [], closed: [] };
const list = [...sessions.values()].sort((a, b) => a.join.localeCompare(b.join));
for (const s of list) {
  const p = (history.players[s.id] ||= { name: s.name, firstSeen: s.join, lastSeen: s.leave, totalMs: 0, sessions: 0 });
  p.name = names[s.id] || s.name;
  p.sessions += 1;
  p.totalMs += Math.max(0, Date.parse(s.leave) - Date.parse(s.join));
  if (s.leave > p.lastSeen) p.lastSeen = s.leave;
  history.events.push({ ts: s.join, type: 'join', id: s.id, name: s.name });
  history.events.push({ ts: s.leave, type: 'leave', id: s.id, name: s.name });
  history.closed.push(`${s.id}|${s.join}`);
  console.log(`session: ${s.name.padEnd(12)} ${s.join} -> ${s.leave} (${Math.round((Date.parse(s.leave) - Date.parse(s.join)) / 60000)} min${s.inferred ? ', end inferred from server restart' : ''})`);
}
history.events.sort((a, b) => a.ts.localeCompare(b.ts));
history.events = history.events.slice(-300);

fs.writeFileSync('/data/players.json', JSON.stringify(history));
for (const [id, p] of Object.entries(history.players)) {
  console.log(`player: ${p.name} (${id}) sessions=${p.sessions} playtime=${Math.round(p.totalMs / 60000)} min`);
}
