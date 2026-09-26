'use strict';
// All server-provided text (player names, log lines) is inserted with textContent — never innerHTML.

const $ = (id) => document.getElementById(id);
let current = null;
let lastLogKey = '';

// ---------- Formatting ----------
function ago(ts) {
  if (!ts) return 'never';
  const s = Math.max(0, (Date.now() - Date.parse(ts)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
function duration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}
function bytes(n) {
  if (n == null) return '–';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}
const dateTime = (ts) => (ts ? new Date(ts).toLocaleString() : '–');
const time = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'text') e.textContent = v;
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) e.append(c);
  return e;
}

// ---------- API ----------
async function api(path, options = {}) {
  const r = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', 'x-dw': '1', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

async function refresh() {
  try {
    const r = await api('/api/state');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    current = r.body;
    render(current);
    $('banner').hidden = !current.controlError;
    if (current.controlError) $('banner').textContent = `Can't reach the control service: ${current.controlError}`;
  } catch (e) {
    $('banner').hidden = false;
    $('banner').textContent = `Dashboard unreachable (${e.message}). Retrying…`;
  }
}

// ---------- Render ----------
function render(s) {
  const st = s.status || {};
  const set = s.settings || {};

  $('serverName').textContent = set.serverName || 'Dragonwilds server';
  document.title = `${set.serverName || 'Dragonwilds'} · ${s.health.label}`;
  $('healthPill').className = `pill pill-${s.health.level}`;
  $('healthLabel').textContent = s.health.label;
  $('healthDetail').textContent = s.health.detail || '';

  // Stats
  $('statPlayers').textContent = st.running ? String(s.online.length) : '–';
  $('statPlayersSub').textContent = s.online.length ? s.online.map((p) => p.name).join(', ') : `${s.players.length} known players`;
  if (st.running) {
    $('statUptime').textContent = duration(Date.now() - Date.parse(st.startedAt));
    const started = new Date(st.startedAt);
    const today = started.toDateString() === new Date().toDateString();
    $('statUptimeSub').textContent = `since ${today ? time(st.startedAt) : started.toLocaleDateString()}`;
  } else {
    $('statUptime').textContent = 'Offline';
    $('statUptimeSub').textContent = st.finishedAt && !st.finishedAt.startsWith('0001') ? `stopped ${ago(st.finishedAt)}` : ' ';
  }
  const cpuMax = (st.cpuLimit || 1) * 100;
  $('statCpu').textContent = st.cpuPercent != null ? `${st.cpuPercent.toFixed(0)}%` : '–';
  $('meterCpu').style.width = `${Math.min(100, ((st.cpuPercent || 0) / cpuMax) * 100)}%`;
  $('statCpu').title = `of ${st.cpuLimit || '?'} cores (${cpuMax}% max)`;
  $('statMem').textContent = st.memUsage != null ? bytes(st.memUsage) : '–';
  $('statMem').title = st.memLimit ? `of ${bytes(st.memLimit)} limit` : '';
  $('meterMem').style.width = st.memLimit ? `${Math.min(100, (st.memUsage / st.memLimit) * 100)}%` : '0';
  $('statSave').textContent = ago(s.lastSave);
  $('statSaveSub').textContent = s.lastSave ? time(s.lastSave) : 'none since start';
  const latest = s.backups?.items?.[0];
  $('statBackup').textContent = latest ? ago(latest.mtime) : 'none';
  $('statBackupSub').textContent = latest ? bytes(latest.size) : ' ';

  const ub = $('updateBanner');
  ub.hidden = s.update?.level !== 'bad';
  if (!ub.hidden) ub.replaceChildren(el('strong', { text: 'Game server needs an update' }), el('span', { text: s.update.message }));

  renderControls(s);
  renderPlayers(s);
  renderServer(s);
  renderBackups(s);
  renderErrors(s);
  renderLog(s);
  $('footer').textContent = `Updated ${s.updatedAt ? time(s.updatedAt) : '–'} · refreshes every 5 s`;
}

function renderControls(s) {
  const st = s.status || {};
  const job = s.job || {};
  $('authBtn').textContent = s.authed ? 'Log out' : 'Log in';
  const busy = !!job.running;
  for (const b of document.querySelectorAll('[data-action]')) {
    const a = b.dataset.action;
    let disabled = !s.authed || busy || !st.exists;
    if (a === 'start') disabled ||= st.running;
    if (a === 'stop' || a === 'restart') disabled ||= !st.running;
    b.disabled = disabled;
  }
  const js = $('jobStatus');
  js.replaceChildren();
  js.className = 'job subtle';
  if (!s.authed) {
    js.textContent = 'Log in to use controls.';
  } else if (busy) {
    js.className = 'job';
    js.append(el('span', { class: 'spinner' }), el('span', { text: job.step || 'Working…' }));
  } else if (job.finishedAt) {
    js.className = `job ${job.ok ? 'ok' : 'fail'}`;
    js.textContent = `${job.ok ? '✓' : '✗'} ${job.message} (${ago(job.finishedAt)})`;
  } else {
    js.textContent = 'Ready.';
  }
}

function renderPlayers(s) {
  const online = $('onlineList');
  online.replaceChildren(
    ...(s.online.length
      ? s.online.map((p) => el('span', { class: 'chip' }, [el('span', { class: 'dot' }), el('span', { text: p.name }), el('small', { text: duration(Date.now() - Date.parse(p.since)) })]))
      : [el('span', { class: 'subtle', text: s.status?.running ? 'Nobody online right now.' : 'Server is offline.' })])
  );

  $('playersBody').replaceChildren(
    ...(s.players.length
      ? s.players.map((p) => {
          const live = p.online ? Date.now() - Date.parse(s.online.find((o) => o.id === p.id)?.since || Date.now()) : 0;
          return el('tr', {}, [
            el('td', { title: p.id }, [p.online ? el('span', { class: 'online-dot' }) : null, p.name]),
            el('td', { text: p.online ? 'online now' : ago(p.lastSeen), title: dateTime(p.lastSeen) }),
            el('td', { class: 'num', text: String(p.sessions) }),
            el('td', { class: 'num', text: duration(p.totalMs + live) }),
          ]);
        })
      : [el('tr', {}, el('td', { colspan: '4', class: 'subtle', text: 'No players yet — history starts when the dashboard first sees someone join.' }))])
  );

  $('eventList').replaceChildren(
    ...(s.events.length
      ? s.events.slice(0, 15).map((e) =>
          el('li', {}, [
            el('span', { class: e.type }, [e.type === 'join' ? '→ ' : '← ', el('b', { text: e.name }), e.type === 'join' ? ' joined' : ' left']),
            el('span', { class: 'subtle', text: ago(e.ts), title: dateTime(e.ts) }),
          ])
        )
      : [el('li', { class: 'subtle', text: 'No activity recorded yet.' })])
  );
}

function renderServer(s) {
  const st = s.status || {};
  const set = s.settings || {};
  const rows = [
    ['Server name', set.serverName],
    ['World', set.worldName],
    ['Owner ID', el('code', { text: set.ownerId || '—' })],
    ['Platforms', set.platformPolicy],
    ['World password', set.hasWorldPassword ? 'Set' : 'None (open)'],
    ['Game build', buildCell(s.update)],
    ['Ports', (st.ports || []).join(', ')],
    ['Container', st.exists ? `${st.state}${st.oomKilled ? ' (out of memory!)' : ''}` : 'missing'],
    ['Restarts', st.restartCount != null ? String(st.restartCount) : '–'],
    ['Image built', st.imageCreated ? `${dateTime(st.imageCreated)} (${ago(st.imageCreated)})` : '–'],
    ['Limits', st.memLimit ? `${bytes(st.memLimit)} RAM · ${st.cpuLimit} CPU cores` : '–'],
    ['Epic heartbeat', s.lastHeartbeat ? ago(s.lastHeartbeat) : 'none yet'],
  ];
  $('serverInfo').replaceChildren(...rows.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', {}, v instanceof Node ? v : String(v ?? '–'))]));
}

function buildCell(u) {
  const inst = u?.installed?.buildId;
  const latest = u?.latest?.buildId;
  if (!inst) return u?.level === 'info' ? 'updating…' : 'unknown';
  if (u.level === 'bad') return el('span', { class: 'build-bad', text: `${inst} → ${latest || '?'} available` });
  if (u.level === 'ok') return el('span', { class: 'build-ok', text: `${inst} (latest)` });
  return `${inst}${latest ? ` · latest ${latest}` : ''}`;
}

function renderBackups(s) {
  const b = s.backups;
  if (!b) { $('backupSummary').textContent = 'Loading…'; return; }
  $('backupSummary').textContent = `${b.items.length} backups · ${bytes(b.totalSize)} · daily at 04:00, newest 7 kept`;
  $('backupList').replaceChildren(
    ...b.items.map((i) => el('li', {}, [el('span', { class: 'name', text: i.name, title: dateTime(i.mtime) }), el('span', { class: 'subtle', text: `${bytes(i.size)} · ${ago(i.mtime)}` })]))
  );
}

function renderErrors(s) {
  $('errorCount').textContent = String(s.errors.length);
  $('errorCount').className = `count${s.errors.length ? ' has' : ''}`;
  $('errorList').replaceChildren(
    ...(s.errors.length
      ? s.errors.slice(0, 25).map((e) => el('li', {}, [el('time', { text: `${dateTime(e.ts)}${e.count > 1 ? ` · ×${e.count}` : ''}` }), e.text]))
      : [el('li', { class: 'subtle', text: 'No unexpected errors since the server started.' })])
  );
}

const NOISE = /Verbose:|ProcessRemoteFunction|called from actor .* while actor is being destroyed|DominionPlayerEquipment|LogSkinnedMeshComp|DominionCombatMode|DominionBlockComponent|HttpRequestComplete|LogScorchSubsystem|UnregisterTaggedObject/;

function renderLog(s) {
  const all = $('logAll').checked;
  const q = $('logSearch').value.trim().toLowerCase();
  const key = `${s.logs.length}|${s.logs.at(-1)?.ts}|${all}|${q}`;
  if (key === lastLogKey) return;
  lastLogKey = key;

  const pre = $('log');
  const follow = $('logFollow').checked;
  const frag = document.createDocumentFragment();
  let shown = 0;
  for (const l of s.logs) {
    if (!all && NOISE.test(l.text)) continue;
    if (q && !l.text.toLowerCase().includes(q)) continue;
    const cls = /Error:|Fatal/.test(l.text) ? 'e' : /Warning:/.test(l.text) ? 'w' : /Player ADDED|Player Removed|Join succeeded/.test(l.text) ? 'p' : '';
    frag.append(el('span', { class: 't', text: `${time(l.ts)}  ` }), el('span', { class: cls, text: l.text }), '\n');
    shown++;
  }
  if (!shown) frag.append(el('span', { class: 't', text: q ? 'No lines match the filter.' : 'No log lines yet.' }));
  pre.replaceChildren(frag);
  if (follow) pre.scrollTop = pre.scrollHeight;
}

// ---------- Interactions ----------
function confirmAction(title, text, okLabel) {
  return new Promise((resolve) => {
    const d = $('confirmDialog');
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    $('confirmOk').textContent = okLabel;
    d.returnValue = '';
    d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
    d.showModal();
  });
}

const CONFIRM = {
  stop: ['Stop the server?', 'Everyone online will be disconnected. The world is saved first.', 'Stop server'],
  restart: ['Restart the server?', 'Everyone online will be disconnected for about a minute. The world is saved first.', 'Restart'],
  backup: ['Back up now?', 'The server stops briefly so the save is consistent, then starts again. Players will be disconnected.', 'Back up'],
};

for (const b of document.querySelectorAll('[data-action]')) {
  b.addEventListener('click', async () => {
    const action = b.dataset.action;
    const needsConfirm = CONFIRM[action] && (action !== 'backup' || current?.status?.running);
    if (needsConfirm) {
      const n = current?.online?.length || 0;
      const [title, text, ok] = CONFIRM[action];
      if (!(await confirmAction(title, n ? `${text} (${n} player${n > 1 ? 's' : ''} online now.)` : text, ok))) return;
    }
    b.disabled = true;
    const r = await api(`/api/action/${action}`, { method: 'POST' });
    if (!r.ok) alert(r.body.error || `Failed (${r.status})`);
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
});
$('loginCancel').addEventListener('click', () => $('loginDialog').close());
$('loginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
  if (r.ok) {
    $('loginDialog').close();
    refresh();
  } else {
    $('loginError').textContent = r.body.error || 'Login failed';
    $('loginError').hidden = false;
  }
});

for (const id of ['logAll', 'logSearch']) $(id).addEventListener('input', () => current && renderLog(current));

refresh();
setInterval(refresh, 5000);
