'use strict';
// GitHub Lite - vanilla JS client for issues and PRs. Targets very old browsers (iOS 12 Safari):
// no modules, no frameworks, Bootstrap classes only for styling.
// Stick to ES2018 syntax: no ?? (nullish coalescing) or ?. (optional chaining) — use || and && instead.

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = s => esc(s).replace(/\n/g, '<br>');
const when = d => new Date(d).toLocaleString();

// view: setup | list | pr | issue | new; data caches fetched detail so UI-only
// re-renders (line selection, pending review edits) do not refetch.
let st = { tab: 'pr', state: 'open', view: 'list', num: 0, pending: [], sel: null, data: null };

function go(view, num) {
  st = Object.assign({}, st, { view, num: num || 0, pending: [], sel: null, data: null });
  render();
}

// Re-render preserving scroll position (used for in-page UI state changes)
function rerender() {
  const y = window.scrollY;
  render().then(() => window.scrollTo(0, y));
}

async function api(path, method, body) {
  const r = await fetch('https://api.github.com/repos/' + localStorage.ghRepo + path, {
    method: method || 'GET',
    headers: { Authorization: 'Bearer ' + localStorage.ghToken, Accept: 'application/vnd.github+json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw new Error((method || 'GET') + ' ' + path + ' failed (' + r.status + '): ' + (await r.text()).slice(0, 300));
  return r.status === 204 ? null : r.json();
}

const stBadge = it => it.state === 'open'
  ? '<span class="badge text-bg-success">open</span>'
  : '<span class="badge text-bg-' + (it.merged_at ? 'primary">merged' : 'secondary">closed') + '</span>';

const ciColor = c => ({
  success: 'success', failure: 'danger', error: 'danger', timed_out: 'danger',
  pending: 'warning', in_progress: 'warning', queued: 'warning', action_required: 'warning'
}[c] || 'secondary');

const card = (user, date, body, extra) =>
  '<div class="card mb-2"><div class="card-body p-2">' +
  '<div class="small text-muted">' + esc(user) + ' · ' + when(date) + (extra || '') + '</div>' +
  '<div class="text-break">' + nl2br(body) + '</div></div></div>';

const btn = (cls, action, extra, label) =>
  '<button class="btn btn-sm ' + cls + '" data-action="' + action + '" ' + (extra || '') + '>' + label + '</button>';

function shell(inner) {
  const tabBtn = (tab, label) => btn('btn' + (st.tab === tab ? '' : '-outline') + '-primary', 'tab', 'data-tab="' + tab + '"', label);
  const filterBtn = (state, label) => btn('btn' + (st.state === state ? '' : '-outline') + '-secondary', 'filter', 'data-state="' + state + '"', label);
  $('#app').innerHTML =
    '<div class="d-flex align-items-center gap-2 mb-2 flex-wrap">' +
    '<strong>' + esc(localStorage.ghRepo || '') + '</strong>' +
    '<div class="btn-group btn-group-sm">' + tabBtn('pr', 'PRs') + tabBtn('issue', 'Issues') + '</div>' +
    '<div class="btn-group btn-group-sm">' + filterBtn('open', 'Open') + filterBtn('closed', 'Closed') + '</div>' +
    btn('btn-outline-success', 'new', '', 'New issue') +
    btn('btn-outline-secondary', 'refresh', '', '↻') +
    btn('btn-outline-secondary', 'setup', '', '⚙') +
    '</div><div id="main">' + inner + '</div>';
}

async function render() {
  if (st.view === 'setup' || !localStorage.ghRepo || !localStorage.ghToken) {
    $('#app').innerHTML =
      '<h5 class="mt-3">GitHub Lite</h5>' +
      '<label class="form-label small mb-0">Repository (owner/repo)</label>' +
      '<input id="srepo" class="form-control mb-2" value="' + esc(localStorage.ghRepo || '') + '">' +
      '<label class="form-label small mb-0">Personal access token</label>' +
      '<input id="stoken" type="password" class="form-control mb-2" value="' + esc(localStorage.ghToken || '') + '">' +
      btn('btn-primary', 'savesetup', '', 'Save');
    return;
  }
  shell('<div class="text-muted">Loading…</div>');
  try {
    const html = { list: listHtml, pr: prHtml, issue: issueHtml, new: newIssueHtml }[st.view];
    $('#main').innerHTML = await html();
  } catch (e) {
    $('#main').innerHTML = '<div class="alert alert-danger text-break">' + esc(e.message) + '</div>';
  }
}

async function listHtml() {
  const items = st.tab === 'pr'
    ? await api('/pulls?state=' + st.state + '&per_page=100')
    : (await api('/issues?state=' + st.state + '&per_page=100')).filter(i => !i.pull_request);
  if (!items.length) return '<div class="text-muted">Nothing here.</div>';
  return '<div class="list-group">' + items.map(i =>
    '<a href="#" class="list-group-item list-group-item-action" data-action="open" data-num="' + i.number + '">' +
    '<div class="d-flex justify-content-between gap-2"><span class="text-break"><strong>#' + i.number + '</strong> ' + esc(i.title) + '</span>' +
    '<small class="text-muted text-nowrap">' + when(i.updated_at) + '</small></div>' +
    '<small class="text-muted">' + esc(i.user.login) + (i.draft ? ' · draft' : '') +
    (i.labels || []).map(l => ' <span class="badge text-bg-secondary">' + esc(l.name) + '</span>').join('') +
    '</small></a>').join('') + '</div>';
}

const commentBox =
  '<div class="my-2"><textarea id="cbody" class="form-control form-control-sm mb-1" rows="3" placeholder="Add a comment"></textarea>' +
  '<button class="btn btn-sm btn-primary" data-action="comment">Comment</button></div>';

const backBtn = '<button class="btn btn-sm btn-link px-0" data-action="back">← back to list</button>';

async function prHtml() {
  if (!st.data) {
    const [pr, comments, rcomments, files] = await Promise.all([
      api('/pulls/' + st.num),
      api('/issues/' + st.num + '/comments?per_page=100'),
      api('/pulls/' + st.num + '/comments?per_page=100'),
      api('/pulls/' + st.num + '/files?per_page=100')
    ]);
    // Both modern check-runs and legacy commit statuses; either may 403 on fine-grained PATs
    const [checks, status] = await Promise.all([
      api('/commits/' + pr.head.sha + '/check-runs').catch(() => ({ check_runs: [] })),
      api('/commits/' + pr.head.sha + '/status').catch(() => ({ statuses: [] }))
    ]);
    st.data = { pr, comments, rcomments, files, ci: checks.check_runs.map(c => ({ name: c.name, res: c.conclusion || c.status })).concat(status.statuses.map(s => ({ name: s.context, res: s.state }))) };
  }
  const { pr, comments, rcomments, files, ci } = st.data;
  return backBtn +
    '<h5>#' + pr.number + ' ' + esc(pr.title) + ' ' + stBadge(pr) + (pr.draft ? ' <span class="badge text-bg-light">draft</span>' : '') + '</h5>' +
    '<div class="small text-muted mb-2">' + esc(pr.user.login) + ' · ' + esc(pr.head.ref) + ' → ' + esc(pr.base.ref) + ' · updated ' + when(pr.updated_at) + '</div>' +
    (ci.length ? '<div class="mb-2">' + ci.map(c => '<span class="badge text-bg-' + ciColor(c.res) + ' me-1 mb-1">' + esc(c.name) + ': ' + esc(c.res) + '</span>').join('') + '</div>' : '') +
    (pr.body ? card(pr.user.login, pr.created_at, pr.body) : '') +
    '<h6 class="mt-3">Conversation (' + comments.length + ')</h6>' +
    (comments.map(c => card(c.user.login, c.created_at, c.body)).join('') || '<div class="text-muted small">No comments</div>') +
    commentBox +
    '<h6 class="mt-3">Review comments (' + rcomments.length + ')</h6>' +
    (rcomments.map(c => card(c.user.login, c.created_at, c.body, ' · <code>' + esc(c.path) + (c.line ? ':' + c.line : '') + '</code>')).join('') || '<div class="text-muted small">None</div>') +
    '<h6 class="mt-3">Files changed (' + files.length + ')</h6>' +
    '<div class="text-muted small mb-2">Tap a diff line to attach a review comment.</div>' +
    files.map(fileHtml).join('') +
    '<h6 class="mt-3">Your review</h6>' + pendingHtml() +
    '<textarea id="rbody" class="form-control form-control-sm mb-1" rows="2" placeholder="Review summary (optional)"></textarea>' +
    '<div class="btn-group btn-group-sm mb-4">' +
    btn('btn-outline-success', 'review', 'data-event="APPROVE"', 'Approve') +
    btn('btn-outline-primary', 'review', 'data-event="COMMENT"', 'Comment') +
    btn('btn-outline-danger', 'review', 'data-event="REQUEST_CHANGES"', 'Request changes') +
    '</div>';
}

// Box shown under the tapped diff line; text-wrap resets the pre's white-space
const lineBox = () =>
  '<div class="text-wrap bg-white border rounded p-2 m-1">' +
  '<textarea id="lbody" class="form-control form-control-sm mb-1" rows="2" placeholder="Review comment for ' + esc(st.sel.path) + ':' + st.sel.line + '"></textarea>' +
  '<button class="btn btn-sm btn-primary" data-action="addpending">Add to review</button> ' +
  '<button class="btn btn-sm btn-outline-secondary" data-action="cancelsel">Cancel</button></div>';

function fileHtml(f) {
  let old = 0, nw = 0;
  const lines = (f.patch || '').split('\n').map(l => {
    let cls = '', ln = 0, side = '';
    if (l.startsWith('@@')) {
      const m = /-(\d+)(?:,\d+)? \+(\d+)/.exec(l);
      if (m) { old = +m[1]; nw = +m[2]; }
      cls = 'bg-info-subtle';
    } else if (l.startsWith('+')) { cls = 'bg-success-subtle'; ln = nw++; side = 'RIGHT'; }
    else if (l.startsWith('-')) { cls = 'bg-danger-subtle'; ln = old++; side = 'LEFT'; }
    else { ln = nw++; old++; side = 'RIGHT'; }
    const sel = st.sel && st.sel.path === f.filename && st.sel.line === ln && st.sel.side === side;
    return '<div class="' + cls + '"' +
      (ln ? ' data-action="selline" data-path="' + esc(f.filename) + '" data-line="' + ln + '" data-side="' + side + '"' : '') +
      '>' + (esc(l) || ' ') + '</div>' + (sel ? lineBox() : '');
  }).join('');
  return '<div class="card mb-2"><div class="card-header p-1 small text-break"><strong>' + esc(f.filename) + '</strong> ' +
    '<span class="text-success">+' + f.additions + '</span> <span class="text-danger">−' + f.deletions + '</span> · ' + esc(f.status) + '</div>' +
    (f.patch ? '<pre class="mb-0 small overflow-auto">' + lines + '</pre>' : '<div class="p-1 text-muted small">No text diff</div>') + '</div>';
}

function pendingHtml() {
  if (!st.pending.length) return '<div class="text-muted small mb-2">No pending review comments.</div>';
  return st.pending.map((p, i) =>
    '<div class="alert alert-warning p-2 mb-1 small text-break"><code>' + esc(p.path) + ':' + p.line + '</code> — ' + nl2br(p.body) +
    ' <button class="btn btn-sm btn-link p-0 align-baseline" data-action="rmpending" data-i="' + i + '">remove</button></div>').join('');
}

async function issueHtml() {
  if (!st.data) {
    const [issue, comments, labels] = await Promise.all([
      api('/issues/' + st.num),
      api('/issues/' + st.num + '/comments?per_page=100'),
      api('/labels?per_page=100')
    ]);
    st.data = { issue, comments, labels };
  }
  const { issue, comments, labels } = st.data;
  const has = n => issue.labels.some(l => l.name === n);
  return backBtn +
    '<h5>#' + issue.number + ' ' + esc(issue.title) + ' ' + stBadge(issue) + '</h5>' +
    '<div class="small text-muted mb-2">' + esc(issue.user.login) + ' · ' + when(issue.created_at) + '</div>' +
    (issue.body ? card(issue.user.login, issue.created_at, issue.body) : '') +
    '<h6 class="mt-3">Comments (' + comments.length + ')</h6>' +
    (comments.map(c => card(c.user.login, c.created_at, c.body)).join('') || '<div class="text-muted small">No comments</div>') +
    commentBox +
    '<h6 class="mt-3">Labels</h6>' +
    '<div class="mb-2">' + labelChecks(labels, has) + '</div>' +
    btn('btn-primary', 'savelabels', '', 'Save labels') + ' ' +
    (issue.state === 'open'
      ? btn('btn-outline-danger', 'setstate', 'data-state="closed"', 'Close issue')
      : btn('btn-outline-success', 'setstate', 'data-state="open"', 'Reopen issue'));
}

const labelChecks = (labels, has) => labels.map(l =>
  '<label class="form-check form-check-inline small"><input class="form-check-input" type="checkbox" name="lbl" value="' + esc(l.name) + '"' +
  (has(l.name) ? ' checked' : '') + '> ' + esc(l.name) + '</label>').join('');

async function newIssueHtml() {
  const labels = await api('/labels?per_page=100');
  return backBtn +
    '<h5>New issue</h5>' +
    '<input id="ntitle" class="form-control mb-2" placeholder="Title">' +
    '<textarea id="nbody" class="form-control mb-2" rows="6" placeholder="Description"></textarea>' +
    '<div class="mb-2">' + labelChecks(labels, () => false) + '</div>' +
    btn('btn-primary', 'createissue', '', 'Create issue');
}

const checkedLabels = () => Array.prototype.slice.call(document.querySelectorAll('input[name=lbl]:checked')).map(i => i.value);

const actions = {
  setup: () => { st.view = 'setup'; render(); },
  savesetup: () => {
    localStorage.ghRepo = $('#srepo').value.trim();
    localStorage.ghToken = $('#stoken').value.trim();
    go('list');
  },
  tab: d => { st.tab = d.tab; go('list'); },
  filter: d => { st.state = d.state; go('list'); },
  refresh: () => { st.data = null; render(); },
  new: () => go('new'),
  back: () => go('list'),
  open: d => go(st.tab, +d.num),
  comment: async () => {
    const body = $('#cbody').value.trim();
    if (!body) return;
    await api('/issues/' + st.num + '/comments', 'POST', { body });
    st.data = null; render();
  },
  selline: d => { st.sel = { path: d.path, line: +d.line, side: d.side }; rerender(); },
  cancelsel: () => { st.sel = null; rerender(); },
  addpending: () => {
    const body = $('#lbody').value.trim();
    if (body) st.pending.push(Object.assign({ body }, st.sel));
    st.sel = null; rerender();
  },
  rmpending: d => { st.pending.splice(+d.i, 1); rerender(); },
  review: async d => {
    await api('/pulls/' + st.num + '/reviews', 'POST', {
      event: d.event,
      body: $('#rbody').value,
      comments: st.pending.map(p => ({ path: p.path, line: p.line, side: p.side, body: p.body }))
    });
    st.pending = []; st.data = null; render();
  },
  savelabels: async () => {
    await api('/issues/' + st.num + '/labels', 'PUT', { labels: checkedLabels() });
    st.data = null; render();
  },
  setstate: async d => {
    await api('/issues/' + st.num, 'PATCH', { state: d.state });
    st.data = null; render();
  },
  createissue: async () => {
    const title = $('#ntitle').value.trim();
    if (!title) return;
    const issue = await api('/issues', 'POST', { title, body: $('#nbody').value, labels: checkedLabels() });
    go('issue', issue.number);
  }
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = actions[t.dataset.action];
  if (!a) return;
  e.preventDefault();
  Promise.resolve(a(t.dataset)).catch(err => alert(err.message));
});

render();
