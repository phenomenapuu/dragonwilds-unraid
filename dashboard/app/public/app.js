'use strict';
// Everything the server sends (player names, log lines) is inserted with textContent, never innerHTML.

const $ = (id) => document.getElementById(id);
let current = null;
let logKey = '';

/* ---------- formatting ---------- */

function ago(ts, { short = false } = {}) {
  if (!ts) return 'never';
  const s = Math.max(0, (Date.now() - Date.parse(ts)) / 1000);
  if (s < 45) return short ? 'now' : 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min${short ? '' : ' ago'}`;
  if (s < 86400) return `${Math.round(s / 3600)} h${short ? '' : ' ago'}`;
  return `${Math.round(s / 86400)} d${short ? '' : ' ago'}`;
}

function duration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return '<1 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60} min`;
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24} h`;
}

function bytes(n) {
  if (n == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const dateTime = (ts) => (ts ? new Date(ts).toLocaleString() : '—');
const clock = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
}

const setFact = (id, value, sub) => {
  $(id).textContent = value;
  if (sub !== undefined) $(`${id}Sub`).textContent = sub || ' ';
};

/* ---------- data ---------- */

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', 'x-dw': '1', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

let unreachable = false;

async function refresh() {
  try {
    const res = await api('/api/state');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    current = res.body;
    unreachable = false;
    document.body.classList.remove('is-loading');
    render(current);
  } catch (err) {
    unreachable = true;
    $('beacon').dataset.level = 'bad';
    $('verdictText').textContent = 'Dashboard unreachable';
    $('verdictStatus').textContent = 'No connection to the dashboard.';
    $('verdictNote').textContent = `The page can't reach the dashboard service (${err.message}). Retrying every 5 seconds.`;
  }
}

/* ---------- verdict ---------- */

// The headline answers the question that brought the owner here, in the server's own name.
function verdict(s) {
  const st = s.status || {};
  const name = s.settings?.serverName || 'The server';
  const players = s.online.length;
  const h = s.health;

  if (s.controlError) {
    return { level: 'bad', label: 'Control unreachable', line: "Can't read the server", note: s.controlError };
  }
  if (!st.exists) {
    return { level: 'bad', label: 'Missing', line: 'The container is gone', note: 'Nothing named Dragonwilds is installed on this host any more. Recreate it with server/run-server.sh.' };
  }
  if (!st.running) {
    return {
      level: 'bad',
      label: 'Stopped',
      line: `${name} is offline`,
      note: `The container exited with code ${st.exitCode}${st.oomKilled ? ' after running out of memory' : ''}. Nobody can join until it starts again.`,
    };
  }
  if (h.level === 'warn' && h.label === 'Starting') {
    return { level: 'warn', label: 'Starting', line: `${name} is starting`, note: `${h.detail}. This takes a few minutes after an update; players can't join yet.` };
  }
  if (h.level !== 'ok') {
    return { level: 'warn', label: h.label, line: `${name} may not be reachable`, note: `${h.detail}. If players can't join, restart the server.` };
  }
  if (players > 0) {
    const names = s.online.map((p) => p.name);
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
    return { level: 'ok', label: 'Online', line: `${list} ${names.length === 1 ? 'is' : 'are'} playing`, note: `${name} is up and listed in the in-game server browser.` };
  }
  return { level: 'ok', label: 'Online', line: `${name} is up`, note: 'Listed in the in-game server browser. Nobody is playing right now.' };
}

// Problems that deserve space at the top even when the server itself is fine.
function alerts(s) {
  const out = [];
  if (s.update?.level === 'bad') out.push({ level: 'bad', title: 'The game server needs an update', body: s.update.message });
  const latest = s.backups?.items?.[0];
  if (latest && Date.now() - Date.parse(latest.mtime) > 48 * 3600 * 1000) {
    out.push({ level: 'warn', title: 'Backups have stopped', body: `The newest backup is from ${dateTime(latest.mtime)}. The nightly User Script may have failed or been disabled.` });
  }
  if (s.backups && !s.backups.items.length) {
    out.push({ level: 'warn', title: 'No backups yet', body: 'Nothing has been backed up. Add the backup User Script, or use Back up now.' });
  }
  if (s.status?.oomKilled) {
    out.push({ level: 'bad', title: 'The server ran out of memory', body: 'It was killed by the memory limit. Raise DW_MEMORY in config.sh if this repeats.' });
  }
  return out;
}

/* ---------- render ---------- */

function render(s) {
  const st = s.status || {};
  const v = verdict(s);

  $('beacon').dataset.level = v.level;
  $('verdictText').textContent = v.line;
  $('verdictStatus').textContent = `${v.label}. ${v.line}. ${v.note}`;
  $('verdictNote').textContent = v.note;
  document.title = `${v.label} · ${s.settings?.serverName || 'Dragonwilds'}`;

  $('alerts').replaceChildren(
    ...alerts(s).map((a) => el('div', { class: 'alert', 'data-level': a.level }, [el('strong', { text: a.title }), el('span', { text: a.body })]))
  );

  renderFacts(s, st);
  renderControls(s, st);
  renderPlayers(s);
  renderSpec(s, st);
  renderBackups(s);
  renderErrors(s);
  renderLog(s);

  $('footerText').textContent = `Updated ${clock(s.updatedAt) || '—'} · refreshes every 5 seconds`;
}

function renderFacts(s, st) {
  const online = s.online.length;
  setFact('factPlayers', st.running ? String(online) : '—', online ? s.online.map((p) => p.name).join(', ') : `${plural(s.players.length, 'player has', 'players have')} played`);

  if (st.running) {
    setFact('factUptime', duration(Date.now() - Date.parse(st.startedAt)), `since ${clock(st.startedAt)}`);
  } else {
    setFact('factUptime', 'Offline', st.finishedAt && !st.finishedAt.startsWith('0001') ? `stopped ${ago(st.finishedAt)}` : '');
  }

  setFact('factSave', ago(s.lastSave, { short: true }), s.lastSave ? clock(s.lastSave) : 'none this run');
  $('factSave').closest('.fact').classList.toggle('is-stale', !s.lastSave);

  const backup = s.backups?.items?.[0];
  setFact('factBackup', backup ? ago(backup.mtime, { short: true }) : 'none', backup ? bytes(backup.size) : 'nothing saved yet');

  const memPct = st.memLimit ? (st.memUsage / st.memLimit) * 100 : 0;
  setFact('factMem', st.memUsage != null ? bytes(st.memUsage) : '—', st.memLimit ? `of ${bytes(st.memLimit)}` : '');
  gauge('gaugeMem', memPct);

  const cpuCeiling = (st.cpuLimit || 1) * 100;
  setFact('factCpu', st.cpuPercent != null ? `${st.cpuPercent.toFixed(0)}%` : '—', st.cpuLimit ? `of ${plural(st.cpuLimit, 'core', 'cores')}` : '');
  gauge('gaugeCpu', st.cpuPercent != null ? (st.cpuPercent / cpuCeiling) * 100 : 0);
}

function gauge(id, pct) {
  const bar = $(id);
  bar.style.transform = `scaleX(${Math.max(0, Math.min(100, pct)) / 100})`;
  bar.dataset.level = pct >= 90 ? 'bad' : pct >= 75 ? 'warn' : 'ok';
}

function renderControls(s, st) {
  const job = s.job || {};
  const busy = !!job.running;
  $('authBtn').textContent = s.authed ? 'Log out' : 'Log in';

  for (const btn of document.querySelectorAll('[data-action]')) {
    const action = btn.dataset.action;
    let disabled = !s.authed || busy || !st.exists || unreachable;
    if (action === 'start') disabled ||= st.running;
    if (action === 'stop' || action === 'restart') disabled ||= !st.running;
    btn.disabled = disabled;
  }

  const note = $('jobStatus');
  note.replaceChildren();
  delete note.dataset.tone;
  if (!s.authed) note.textContent = 'Log in to use the controls.';
  else if (busy) note.append(el('span', { class: 'spinner' }), el('span', { text: job.step || 'Working…' }));
  else if (job.finishedAt) {
    note.dataset.tone = job.ok ? 'ok' : 'bad';
    note.textContent = `${job.message} · ${ago(job.finishedAt)}`;
  } else note.textContent = 'Ready.';
}

function renderPlayers(s) {
  const online = $('onlineNow');
  if (s.online.length) {
    online.replaceChildren(
      ...s.online.map((p) => el('span', { class: 'player-chip' }, [el('span', { text: p.name }), el('small', { text: duration(Date.now() - Date.parse(p.since)) })]))
    );
  } else {
    online.replaceChildren(el('p', { class: 'quiet-line', text: s.status?.running ? 'Nobody is playing right now.' : 'The server is offline, so nobody can be online.' }));
  }

  $('rosterBody').replaceChildren(
    ...(s.players.length
      ? s.players.map((p) => {
          const live = p.online ? Date.now() - Date.parse(s.online.find((o) => o.id === p.id)?.since || Date.now()) : 0;
          return el('tr', { class: p.online ? 'is-online' : null }, [
            el('td', { text: p.name, title: p.id }),
            el('td', { text: p.online ? 'playing now' : ago(p.lastSeen), title: dateTime(p.lastSeen) }),
            el('td', { class: 'num', text: String(p.sessions) }),
            el('td', { class: 'num', text: duration(p.totalMs + live) }),
          ]);
        })
      : [el('tr', {}, el('td', { colspan: '4', class: 'quiet-line', text: 'Nobody has played yet. Players appear here the first time they join.' }))])
  );

  $('activityList').replaceChildren(
    ...(s.events.length
      ? s.events.slice(0, 12).map((e) =>
          el('li', {}, [
            el('span', {}, [el('span', { class: 'who', text: e.name }), ' ', el('span', { class: `verb-${e.type}`, text: e.type === 'join' ? 'joined' : 'left' })]),
            el('time', { datetime: e.ts, title: dateTime(e.ts), text: ago(e.ts) }),
          ])
        )
      : [el('li', { class: 'quiet-line', text: 'No joins or leaves recorded yet.' })])
  );
}

function buildValue(update) {
  const installed = update?.installed?.buildId;
  const latest = update?.latest?.buildId;
  if (!installed) return update?.level === 'info' ? 'updating…' : 'unknown';
  if (update.level === 'bad') return el('span', { class: 'bad', text: `${installed} — ${latest || '?'} available` });
  if (update.level === 'ok') return el('span', { class: 'ok', text: `${installed} · current` });
  return `${installed}${latest ? ` · latest ${latest}` : ''}`;
}

function renderSpec(s, st) {
  const set = s.settings || {};
  const rows = [
    ['World', set.worldName],
    ['Game build', buildValue(s.update)],
    ['Password', set.hasWorldPassword ? 'Set' : 'None — anyone can join'],
    ['Platforms', set.platformPolicy],
    ['Owner', el('code', { text: set.ownerId || '—' })],
    ['Ports', (st.ports || []).join(', ')],
    ['Limits', st.memLimit ? `${bytes(st.memLimit)} · ${plural(st.cpuLimit, 'core', 'cores')}` : null],
    ['Restarts', st.restartCount != null ? String(st.restartCount) : null],
    ['Image built', st.imageCreated ? ago(st.imageCreated) : null],
    ['Epic heartbeat', s.lastHeartbeat ? ago(s.lastHeartbeat) : 'none yet'],
  ];
  $('specList').replaceChildren(
    ...rows.filter(([, v]) => v != null && v !== '').flatMap(([k, v]) => [el('dt', { text: k }), el('dd', {}, v instanceof Node ? v : String(v))])
  );
}

function renderBackups(s) {
  const b = s.backups;
  if (!b) { $('backupNote').textContent = 'Reading the backup folder…'; return; }
  $('backupNote').textContent = b.items.length
    ? `${plural(b.items.length, 'archive', 'archives')} · ${bytes(b.totalSize)} · nightly at 04:00`
    : 'No archives yet.';
  $('backupList').replaceChildren(
    ...b.items.slice(0, 8).map((i) =>
      el('li', {}, [
        el('span', { class: 'when', title: i.name, text: `${dateTime(i.mtime)}` }),
        el('span', { class: 'size', text: bytes(i.size) }),
      ])
    )
  );
}

function renderErrors(s) {
  const tally = $('errorTally');
  tally.textContent = String(s.errors.length);
  if (s.errors.length) tally.dataset.level = 'bad'; else delete tally.dataset.level;
  $('errorList').replaceChildren(
    ...(s.errors.length
      ? s.errors.slice(0, 20).map((e) =>
          el('li', {}, [
            el('span', { class: 'meta', text: `${dateTime(e.ts)}${e.count > 1 ? ` · ${e.count} times` : ''}` }),
            el('span', { class: 'text', text: e.text }),
          ])
        )
      : [el('li', { class: 'quiet-line', text: 'Nothing unexpected since the server started. Harmless engine warnings are filtered out.' })])
  );
}

const NOISE = /Verbose:|ProcessRemoteFunction|called from actor .* while actor is being destroyed|DominionPlayerEquipment|LogSkinnedMeshComp|DominionCombatMode|DominionBlockComponent|HttpRequestComplete|LogScorchSubsystem|UnregisterTaggedObject/;

function renderLog(s) {
  const verbose = $('logAll').checked;
  const query = $('logSearch').value.trim().toLowerCase();
  const key = `${s.logs.length}|${s.logs.at(-1)?.ts}|${verbose}|${query}`;
  if (key === logKey) return;
  logKey = key;

  const pre = $('log');
  const follow = $('logFollow').checked;
  const frag = document.createDocumentFragment();
  let shown = 0;

  for (const line of s.logs) {
    if (!verbose && NOISE.test(line.text)) continue;
    if (query && !line.text.toLowerCase().includes(query)) continue;
    const level = /Error:|Fatal/.test(line.text) ? 'lv-error'
      : /Warning:/.test(line.text) ? 'lv-warn'
      : /Player ADDED|Player Removed|Join succeeded/.test(line.text) ? 'lv-player'
      : '';
    frag.append(el('span', { class: 'stamp', text: `${clock(line.ts)}  ` }), el('span', { class: level || null, text: line.text }), '\n');
    shown++;
  }
  if (!shown) frag.append(el('span', { class: 'stamp', text: query ? 'Nothing in the log matches that.' : 'Waiting for the server to write to its log…' }));

  pre.replaceChildren(frag);
  if (follow) pre.scrollTop = pre.scrollHeight;
}

/* ---------- interaction ---------- */

function confirmAction(title, text, okLabel) {
  return new Promise((resolve) => {
    const dialog = $('confirmDialog');
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    $('confirmOk').textContent = okLabel;
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.showModal();
  });
}

const CONFIRM = {
  stop: ['Stop the server?', 'The world is saved first, then the server goes offline until you start it again.', 'Stop server'],
  restart: ['Restart the server?', 'The world is saved first. The server is unavailable for a minute or so, and it checks for a game update on the way back up.', 'Restart'],
  backup: ['Back up now?', 'The server stops briefly so the save is consistent, then starts again.', 'Back up'],
};

for (const btn of document.querySelectorAll('[data-action]')) {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;
    const needsConfirm = CONFIRM[action] && (action !== 'backup' || current?.status?.running);
    if (needsConfirm) {
      const playing = current?.online?.length || 0;
      const [title, text, okLabel] = CONFIRM[action];
      const withPlayers = playing ? `${text} ${plural(playing, 'player is', 'players are')} playing right now and will be disconnected.` : text;
      if (!(await confirmAction(title, withPlayers, okLabel))) return;
    }
    btn.disabled = true;
    const res = await api(`/api/action/${action}`, { method: 'POST' });
    if (!res.ok) {
      $('jobStatus').dataset.tone = 'bad';
      $('jobStatus').textContent = res.body.error || `That didn't work (HTTP ${res.status}).`;
    }
    refresh();
  });
}

$('authBtn').addEventListener('click', async () => {
  if (current?.authed) {
    await api('/api/logout', { method: 'POST' });
    refresh();
    return;
  }
  $('loginError').hidden = true;
  $('password').value = '';
  $('loginDialog').showModal();
  $('password').focus();
});

$('loginCancel').addEventListener('click', () => $('loginDialog').close());

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const res = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
  if (res.ok) {
    $('loginDialog').close();
    refresh();
  } else {
    $('loginError').textContent = res.body.error || 'That password was not accepted.';
    $('loginError').hidden = false;
  }
});

for (const id of ['logAll', 'logSearch']) $(id).addEventListener('input', () => current && renderLog(current));

document.body.classList.add('is-loading');
refresh();
setInterval(refresh, 5000);
