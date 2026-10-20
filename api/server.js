/* ==========================================================================
   STUDIO API · server
   One process, one origin: it serves /api/* and the static site, so cookies
   work everywhere and there is no CORS to get wrong.
   Node built-ins only — no npm packages on this box.
   ========================================================================== */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const db = require('./db');
const Plans = require('./plans');
const Auth = require('./auth');
const { Users, Sessions, Workspaces, Subscriptions, Records, RECORD_TYPES, uid, nowIso, slugify } = db;

const PORT = Number(process.env.STUDIO_PORT || 8099);
const ROOT = process.env.STUDIO_WEB_ROOT || path.join(__dirname, '..');
const DEV_PLANS = process.env.STUDIO_DEV_PLANS === '1';

/* ---------------- http helpers ---------------- */
function send(res, status, body, headers = {}) {
  const payload = Buffer.from(JSON.stringify(body == null ? {} : body), 'utf8');
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': payload.length,
    'Cache-Control': 'no-store'
  }, headers));
  res.end(payload);
}
const ok = (res, body) => send(res, 200, body);
const fail = (res, status, error, message, extra) =>
  send(res, status, Object.assign({ error, message: message || error }, extra || {}));

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let tooBig = false;
    req.on('data', c => {
      raw += c;
      if (raw.length > 40 * 1024 * 1024) { tooBig = true; req.destroy(); }
    });
    req.on('end', () => {
      if (tooBig) return reject(new Error('PAYLOAD_TOO_LARGE'));
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('BAD_JSON')); }
    });
    req.on('error', reject);
  });
}

/* ---------------- static files ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};
function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) return fail(res, 403, 'FORBIDDEN');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      /* unknown paths fall back to the app shell; the client router decides */
      return serveStatic(req, res, '/index.html');
    }
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const cache = /\.html$|\.js$|\.css$/.test(ext)
      ? 'no-cache'
      : 'public, max-age=2592000';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------------- workspace state assembly ---------------- */
function stateOf(workspaceId, includeDeleted) {
  /* Soft-deleted rows are part of the workspace state: the recycle bin lives
     on the client, so dropping them here would make recovery impossible. */
  return {
    workspaceId: workspaceId,
    designs: Records.list(workspaceId, 'design', includeDeleted),
    collections: Records.list(workspaceId, 'collection', includeDeleted),
    projects: Records.list(workspaceId, 'project', includeDeleted),
    brands: Records.list(workspaceId, 'brand', includeDeleted),
    websites: Records.list(workspaceId, 'website', includeDeleted),
    folders: Records.list(workspaceId, 'folder', includeDeleted),
    files: Records.list(workspaceId, 'file', includeDeleted),
    tags: Records.list(workspaceId, 'tag', includeDeleted),
    versionEvents: Records.list(workspaceId, 'version_event', includeDeleted)
  };
}
function taxonomyOf(workspaceId) {
  const t = Records.list(workspaceId, 'taxonomy')[0];
  return t || null;
}
function workspaceSummary(w, userId) {
  const sub = Subscriptions.ensure(w.id, Plans.DEFAULT_PLAN_ID);
  const s = Plans.summary(sub.plan_id, w.id, Workspaces.countForUser(userId));
  return {
    id: w.id, name: w.name, slug: w.slug, logo: w.logo, description: w.description,
    createdAt: w.created_at, updatedAt: w.updated_at,
    plan: { id: s.plan.id, key: s.plan.key, name: s.plan.name },
    subscription: {
      status: sub.status,
      startedAt: sub.started_at,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end
    },
    usage: s.usage,
    overLimit: s.anyOverLimit
  };
}
function mePayload(ctx) {
  const list = Workspaces.listForUser(ctx.user.id).map(w => workspaceSummary(w, ctx.user.id));
  const active = ctx.workspace || list[0] || null;
  let state = null, taxonomy = null, plan = null;
  if (active) {
    state = stateOf(active.id, true);
    taxonomy = taxonomyOf(active.id);
    const sub = Subscriptions.ensure(active.id, Plans.DEFAULT_PLAN_ID);
    plan = Plans.summary(sub.plan_id, active.id, list.length);
  }
  return {
    user: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name, createdAt: ctx.user.created_at },
    workspaces: list,
    activeWorkspaceId: active ? active.id : null,
    state: state,
    taxonomy: taxonomy,
    plan: plan,
    devPlans: DEV_PLANS
  };
}

/* entitlement counters used by mutate() */
function counters(workspaceId) {
  const designs = Records.list(workspaceId, 'design');
  const files = Records.list(workspaceId, 'file');
  let storage = 0;
  files.forEach(f => { if (!f.deletedAt && f.dataUrl) storage += Math.round(String(f.dataUrl).length * 0.75); });
  return {
    designCount: designs.filter(d => !d.deletedAt).length,
    storageBytes: storage,
    workspaceCount: null
  };
}

function bytesOf(row) {
  return row && row.dataUrl ? Math.round(String(row.dataUrl).length * 0.75) : 0;
}

/* ---------------- mutation ---------------- */
function applyOp(ctx, workspaceId, op) {
  const type = op.type;
  if (RECORD_TYPES.indexOf(type) === -1) return { error: 'UNKNOWN_TYPE', type: type };
  const sub = Subscriptions.ensure(workspaceId, Plans.DEFAULT_PLAN_ID);
  const planId = sub.plan_id;
  const c = counters(workspaceId);

  if (op.op === 'create') {
    const row = Object.assign({}, op.data || {}, { id: op.data && op.data.id ? op.data.id : uid(type.slice(0, 2)) });
    if (type === 'design') {
      const r = Plans.check(planId, 'design.create', { designCount: c.designCount });
      if (!r.ok) return { error: r.code, message: r.message, detail: r.detail };
    }
    if (type === 'file') {
      const r = Plans.check(planId, 'file.create', { storageBytes: c.storageBytes, addBytes: bytesOf(row) });
      if (!r.ok) return { error: r.code, message: r.message, detail: r.detail };
    }
    Records.put(workspaceId, type, row);
    return { applied: true, id: row.id, row: row };
  }

  if (op.op === 'update') {
    const existing = Records.get(workspaceId, op.id);
    if (!existing) return { error: 'NOT_FOUND', id: op.id };
    const row = Object.assign({}, existing, op.data || {}, { id: op.id });
    /* a version may not be added past the plan limit */
    if (type === 'design' && Array.isArray(row.versions) && Array.isArray(existing.versions)) {
      if (row.versions.length > existing.versions.length) {
        const r = Plans.check(planId, 'version.create', { versionCount: row.versions.filter(v => !v.deletedAt).length });
        if (!r.ok) return { error: r.code, message: r.message, detail: r.detail };
      }
    }
    if (type === 'website') {
      const r = Plans.check(planId, 'website.edit', {});
      if (!r.ok) return { error: r.code, message: r.message, detail: r.detail };
    }
    if (type === 'file' && bytesOf(row) > bytesOf(existing)) {
      const r = Plans.check(planId, 'file.create', {
        storageBytes: c.storageBytes, addBytes: bytesOf(row) - bytesOf(existing)
      });
      if (!r.ok) return { error: r.code, message: r.message, detail: r.detail };
    }
    Records.put(workspaceId, type, row);
    return { applied: true, id: row.id, row: row };
  }

  if (op.op === 'delete') {
    const existing = Records.get(workspaceId, op.id);
    /* the website module is read-only on a plan without it — no deletes */
    if (type === 'website') {
      const r = Plans.check(planId, 'website.edit', {});
      if (!r.ok) return { error: r.code, message: r.message, detail: r.detail };
    }
    if (!existing) return { error: 'NOT_FOUND', id: op.id };
    Records.put(workspaceId, type, Object.assign({}, existing, { deletedAt: nowIso() }));
    return { applied: true, id: op.id };
  }

  if (op.op === 'purge') {
    const existing = Records.get(workspaceId, op.id);
    if (!existing) return { error: 'NOT_FOUND', id: op.id };
    Records.remove(workspaceId, op.id);
    return { applied: true, id: op.id };
  }

  return { error: 'UNKNOWN_OP', op: op.op };
}

/* ---------------- routes ---------------- */
const routes = [];
function route(method, pattern, handler) {
  const parts = pattern.split('/').filter(Boolean);
  routes.push({ method, parts, handler });
}
function match(method, pathname) {
  const segs = pathname.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.method !== method) continue;
    if (r.parts.length !== segs.length) continue;
    const params = {};
    let hit = true;
    for (let i = 0; i < r.parts.length; i++) {
      if (r.parts[i].startsWith(':')) params[r.parts[i].slice(1)] = decodeURIComponent(segs[i]);
      else if (r.parts[i] !== segs[i]) { hit = false; break; }
    }
    if (hit) return { handler: r.handler, params };
  }
  return null;
}

/* --- auth --- */
route('POST', '/api/auth/register', async (req, res, ctx, body) => {
  const email = String(body.email || '').trim();
  const password = String(body.password || '');
  const name = String(body.name || '').trim() || email.split('@')[0];
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(res, 400, 'BAD_EMAIL', '请输入有效的邮箱');
  if (password.length < 8) return fail(res, 400, 'WEAK_PASSWORD', '密码至少 8 位');
  if (Users.byEmail(email)) return fail(res, 409, 'EMAIL_TAKEN', '该邮箱已注册');
  const { hash, salt } = Auth.hashPassword(password);
  const user = Users.create(email, name, hash, salt);

  /* first workspace, always blank — nothing is copied from anywhere */
  const ws = Workspaces.create(user.id, String(body.workspaceName || '').trim() || '我的工作室');
  Subscriptions.ensure(ws.id, Plans.DEFAULT_PLAN_ID);
  const session = Sessions.create(user.id, ws.id);
  Auth.setSessionCookie(res, session.token);
  return ok(res, mePayload({ user, session, workspace: ws }));
});

route('POST', '/api/auth/login', async (req, res, ctx, body) => {
  const email = String(body.email || '').trim();
  const key = email.toLowerCase() + '|' + (req.socket.remoteAddress || '');
  if (!Auth.loginAllowed(key)) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '尝试次数过多，请 5 分钟后再试');
  const user = Users.byEmail(email);
  if (!user || !Auth.verifyPassword(String(body.password || ''), user)) {
    Auth.loginFailed(key);
    return fail(res, 401, 'BAD_CREDENTIALS', '邮箱或密码不正确');
  }
  Auth.loginSucceeded(key);
  const mine = Workspaces.listForUser(user.id);
  const session = Sessions.create(user.id, mine[0] ? mine[0].id : null);
  Auth.setSessionCookie(res, session.token);
  return ok(res, mePayload({ user, session, workspace: mine[0] || null }));
});

route('POST', '/api/auth/logout', async (req, res, ctx) => {
  const token = Auth.tokenFrom(req);
  if (token) Sessions.destroy(token);
  Auth.clearSessionCookie(res);
  return ok(res, { ok: true });
});

route('GET', '/api/auth/me', async (req, res, ctx) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  return ok(res, mePayload(ctx));
});

/* password reset is not implemented — say so plainly instead of pretending */
route('GET', '/api/auth/password-reset', async (req, res) =>
  fail(res, 501, 'NOT_SUPPORTED', '暂不支持自助找回密码：当前没有接入邮件服务'));
route('POST', '/api/auth/password-reset', async (req, res) =>
  fail(res, 501, 'NOT_SUPPORTED', '暂不支持自助找回密码：当前没有接入邮件服务'));

/* --- account --- */
route('PATCH', '/api/account', async (req, res, ctx, body) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  const patch = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.email !== undefined) {
    const email = String(body.email).trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(res, 400, 'BAD_EMAIL', '请输入有效的邮箱');
    const clash = Users.byEmail(email);
    if (clash && clash.id !== ctx.user.id) return fail(res, 409, 'EMAIL_TAKEN', '该邮箱已注册');
    patch.email = email;
  }
  const user = Users.update(ctx.user.id, patch);
  return ok(res, { user: { id: user.id, email: user.email, name: user.name } });
});

route('POST', '/api/account/password', async (req, res, ctx, body) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  if (!Auth.verifyPassword(String(body.currentPassword || ''), ctx.user)) {
    return fail(res, 403, 'BAD_PASSWORD', '当前密码不正确');
  }
  const next = String(body.newPassword || '');
  if (next.length < 8) return fail(res, 400, 'WEAK_PASSWORD', '新密码至少 8 位');
  const { hash, salt } = Auth.hashPassword(next);
  Users.setPassword(ctx.user.id, hash, salt);
  return ok(res, { ok: true });
});

/* --- workspaces --- */
route('GET', '/api/workspaces', async (req, res, ctx) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  return ok(res, { workspaces: Workspaces.listForUser(ctx.user.id).map(w => workspaceSummary(w, ctx.user.id)) });
});

route('POST', '/api/workspaces', async (req, res, ctx, body) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  const cur = ctx.workspace ? Subscriptions.ensure(ctx.workspace.id, Plans.DEFAULT_PLAN_ID) : null;
  const planId = cur ? cur.plan_id : Plans.DEFAULT_PLAN_ID;
  const r = Plans.check(planId, 'workspace.create', { workspaceCount: Workspaces.countForUser(ctx.user.id) });
  if (!r.ok) return fail(res, 402, r.code, r.message, { detail: r.detail });
  const name = String(body.name || '').trim();
  if (!name) return fail(res, 400, 'BAD_NAME', '请输入工作区名称');
  const ws = Workspaces.create(ctx.user.id, name, { logo: body.logo || null, description: body.description || '' });
  Subscriptions.ensure(ws.id, Plans.DEFAULT_PLAN_ID);
  /* a new workspace is empty by design — no designs, files, brand or site */
  Sessions.setWorkspace(ctx.token || Auth.tokenFrom(req), ws.id);
  return ok(res, { workspace: workspaceSummary(ws, ctx.user.id), state: stateOf(ws.id, false), taxonomy: null });
});

route('POST', '/api/workspaces/:id/select', async (req, res, ctx, body, params) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  const guard = Auth.assertWorkspace(ctx, params.id);
  if (!guard.ok) return fail(res, guard.status, guard.error);
  Sessions.setWorkspace(ctx.token || Auth.tokenFrom(req), params.id);
  return ok(res, {
    workspace: workspaceSummary(guard.workspace, ctx.user.id),
    state: stateOf(params.id, true),
    taxonomy: taxonomyOf(params.id),
    plan: Plans.summary(Subscriptions.ensure(params.id, Plans.DEFAULT_PLAN_ID).plan_id,
      params.id, Workspaces.countForUser(ctx.user.id))
  });
});

route('PATCH', '/api/workspaces/:id', async (req, res, ctx, body, params) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  const guard = Auth.assertWorkspace(ctx, params.id);
  if (!guard.ok) return fail(res, guard.status, guard.error);
  const patch = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return fail(res, 400, 'BAD_NAME', '请输入工作区名称');
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = String(body.description);
  if (body.logo !== undefined) patch.logo = body.logo;
  const ws = Workspaces.update(params.id, patch);
  return ok(res, { workspace: workspaceSummary(ws, ctx.user.id) });
});

route('GET', '/api/workspaces/:id/impact', async (req, res, ctx, body, params) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  const guard = Auth.assertWorkspace(ctx, params.id);
  if (!guard.ok) return fail(res, guard.status, guard.error);
  const impact = {
    name: guard.workspace.name,
    designs: Records.list(params.id, 'design').length,
    collections: Records.list(params.id, 'collection').length,
    projects: Records.list(params.id, 'project').length,
    files: Records.list(params.id, 'file').length,
    folders: Records.list(params.id, 'folder').length,
    brands: Records.list(params.id, 'brand').length,
    websites: Records.list(params.id, 'website').length,
    tags: Records.list(params.id, 'tag').length
  };
  impact.total = impact.designs + impact.collections + impact.projects + impact.files +
    impact.folders + impact.brands + impact.websites;
  return ok(res, impact);
});

route('DELETE', '/api/workspaces/:id', async (req, res, ctx, body, params) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  const guard = Auth.assertWorkspace(ctx, params.id);
  if (!guard.ok) return fail(res, guard.status, guard.error);
  /* ownership is already proven above; the typed name is the second lock */
  if (String(body.confirmName || '').trim() !== guard.workspace.name) {
    return fail(res, 400, 'CONFIRM_NAME', '请输入工作区名称以确认删除');
  }
  if (body.confirmDelete !== true) return fail(res, 400, 'CONFIRM_REQUIRED', '需要二次确认');
  const impact = Records.list(params.id, 'design').length + Records.list(params.id, 'file').length;
  Workspaces.destroy(params.id);
  const mine = Workspaces.listForUser(ctx.user.id);
  const token = ctx.token || Auth.tokenFrom(req);
  if (mine[0]) Sessions.setWorkspace(token, mine[0].id);
  return ok(res, {
    deleted: params.id, removedRows: impact,
    workspaces: mine.map(w => workspaceSummary(w, ctx.user.id)),
    activeWorkspaceId: mine[0] ? mine[0].id : null,
    state: mine[0] ? stateOf(mine[0].id, true) : null,
    taxonomy: mine[0] ? taxonomyOf(mine[0].id) : null
  });
});

/* --- business data --- */
route('GET', '/api/state', async (req, res, ctx) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  if (!ctx.workspace) return fail(res, 404, 'NO_WORKSPACE', '当前账号还没有工作区');
  return ok(res, {
    workspaceId: ctx.workspace.id,
    state: stateOf(ctx.workspace.id, true),
    taxonomy: taxonomyOf(ctx.workspace.id),
    plan: Plans.summary(Subscriptions.ensure(ctx.workspace.id, Plans.DEFAULT_PLAN_ID).plan_id,
      ctx.workspace.id, Workspaces.countForUser(ctx.user.id))
  });
});

route('POST', '/api/mutate', async (req, res, ctx, body) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  const guard = Auth.assertWorkspace(ctx, body.workspaceId || ctx.workspace?.id);
  if (!guard.ok) return fail(res, guard.status, guard.error);
  const ops = Array.isArray(body.ops) ? body.ops : [];
  const errors = [];
  let applied = 0;
  for (const op of ops) {
    const r = applyOp(ctx, guard.workspace.id, op);
    if (r.error) errors.push(Object.assign({ op: op.op, type: op.type, id: op.id }, r));
    else applied++;
  }
  if (errors.length && !applied) {
    const first = errors[0];
    const code = first.error || 'MUTATE_FAILED';
    return fail(res, code === 'NOT_FOUND' ? 404 : 402, code, first.message || code, { detail: first.detail, errors });
  }
  return ok(res, {
    applied, errors,
    state: stateOf(guard.workspace.id, true),
    taxonomy: taxonomyOf(guard.workspace.id),
    plan: Plans.summary(Subscriptions.ensure(guard.workspace.id, Plans.DEFAULT_PLAN_ID).plan_id,
      guard.workspace.id, Workspaces.countForUser(ctx.user.id))
  });
});

/* Full-state sync. The client keeps working against an in-memory mirror and
   sends the whole workspace state here; the server diffs it, rewrites
   ownership, enforces plan limits and returns what is actually stored.
   Nothing here trusts the incoming workspaceId — ownership is re-checked. */
const SYNC_MAP = [
  ['designs', 'design'], ['collections', 'collection'], ['projects', 'project'],
  ['brands', 'brand'], ['websites', 'website'], ['folders', 'folder'],
  ['files', 'file'], ['tags', 'tag'], ['versionEvents', 'version_event']
];

function storedBytes(rows) {
  let n = 0;
  rows.forEach(f => { if (!f.deletedAt && f.dataUrl) n += Math.round(String(f.dataUrl).length * 0.75); });
  return n;
}

route('POST', '/api/sync', async (req, res, ctx, body) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  const guard = Auth.assertWorkspace(ctx, body.workspaceId || (ctx.workspace && ctx.workspace.id));
  if (!guard.ok) return fail(res, guard.status, guard.error);
  const wsId = guard.workspace.id;
  const incoming = body.state || {};
  const planId = Subscriptions.ensure(wsId, Plans.DEFAULT_PLAN_ID).plan_id;

  /* server truth, including soft-deleted rows */
  const current = {};
  SYNC_MAP.forEach(([key, type]) => {
    const m = new Map();
    Records.list(wsId, type, true).forEach(r => m.set(r.id, r));
    current[type] = { key, map: m };
  });

  /* counters used for entitlement checks, updated as we go */
  let designCount = 0;
  current.design.map.forEach(d => { if (!d.deletedAt) designCount++; });
  let storageBytes = storedBytes([...current.file.map.values()]);

  const errors = [];
  const deny = (code, message, detail) => errors.push({ code, message, detail });

  for (const [key, type] of SYNC_MAP) {
    /* a key the client does not send is left completely alone — an empty or
       partial payload must never be read as "delete everything" */
    if (!Array.isArray(incoming[key])) continue;
    const rows = incoming[key];
    const seen = new Set();
    for (const raw of rows) {
      if (!raw || !raw.id) continue;
      seen.add(raw.id);
      const row = Object.assign({}, raw, { workspaceId: wsId });
      const prev = current[type].map.get(row.id);
      const same = prev && JSON.stringify(prev) === JSON.stringify(row);
      if (same) continue;

      if (!prev) {
        if (type === 'design') {
          const r = Plans.check(planId, 'design.create', { designCount });
          if (!r.ok) { deny(r.code, r.message, r.detail); continue; }
          designCount++;
        }
        if (type === 'file') {
          const r = Plans.check(planId, 'file.create', { storageBytes, addBytes: bytesOf(row) });
          if (!r.ok) { deny(r.code, r.message, r.detail); continue; }
          storageBytes += bytesOf(row);
        }
      } else {
        if (type === 'design' && Array.isArray(row.versions)) {
          const before = Array.isArray(prev.versions) ? prev.versions.filter(v => !v.deletedAt).length : 0;
          const after = row.versions.filter(v => !v.deletedAt).length;
          if (after > before) {
            const r = Plans.check(planId, 'version.create', { versionCount: after });
            if (!r.ok) { deny(r.code, r.message, r.detail); continue; }
          }
        }
        if (type === 'website') {
          const r = Plans.check(planId, 'website.edit', {});
          if (!r.ok) { deny(r.code, r.message, r.detail); continue; }
        }
        if (type === 'file') {
          const add = bytesOf(row) - bytesOf(prev);
          if (add > 0) {
            const r = Plans.check(planId, 'file.create', { storageBytes, addBytes: add });
            if (!r.ok) { deny(r.code, r.message, r.detail); continue; }
            storageBytes += add;
          }
        }
      }
      Records.put(wsId, type, row);
    }
    /* rows present on the server but absent from the client were purged */
    current[type].map.forEach((prev, id) => {
      if (seen.has(id)) return;
      if (type === 'website') {
        const r = Plans.check(planId, 'website.edit', {});
        if (!r.ok) return;          /* never destroy site data behind a lock */
      }
      Records.remove(wsId, id);
    });
  }

  if (incoming.taxonomy) {
    Records.put(wsId, 'taxonomy', Object.assign({ id: 'tax-' + wsId }, incoming.taxonomy));
  }

  const summary = Plans.summary(planId, wsId, Workspaces.countForUser(ctx.user.id));
  return ok(res, {
    applied: true,
    errors: errors,
    state: stateOf(wsId, true),
    taxonomy: taxonomyOf(wsId),
    plan: summary
  });
});

/* one-time import of the data that already lives in this browser */
route('POST', '/api/import', async (req, res, ctx, body) => {
  if (!ctx.user) return fail(res, 401, 'NOT_AUTHENTICATED');
  const guard = Auth.assertWorkspace(ctx, body.workspaceId || ctx.workspace?.id);
  if (!guard.ok) return fail(res, guard.status, guard.error);
  const src = body.state || {};
  const map = [
    ['designs', 'design'], ['collections', 'collection'], ['projects', 'project'],
    ['brands', 'brand'], ['websites', 'website'], ['folders', 'folder'],
    ['files', 'file'], ['tags', 'tag'], ['versionEvents', 'version_event']
  ];
  let n = 0;
  map.forEach(([key, type]) => {
    (src[key] || []).forEach(row => {
      if (!row || !row.id) return;
      /* ownership is rewritten on the way in: imported rows belong to the
         workspace they land in, never to wherever they came from */
      Records.put(guard.workspace.id, type, Object.assign({}, row, { workspaceId: guard.workspace.id }));
      n++;
    });
  });
  if (src.taxonomy) Records.put(guard.workspace.id, 'taxonomy', Object.assign({ id: 'tax-' + guard.workspace.id }, src.taxonomy));
  return ok(res, {
    imported: n,
    state: stateOf(guard.workspace.id, true),
    taxonomy: taxonomyOf(guard.workspace.id),
    plan: Plans.summary(Subscriptions.ensure(guard.workspace.id, Plans.DEFAULT_PLAN_ID).plan_id,
      guard.workspace.id, Workspaces.countForUser(ctx.user.id))
  });
});

/* --- plans / usage / subscription --- */
route('GET', '/api/plans', async (req, res) => ok(res, { plans: Plans.PLANS.map(Plans.publicPlan), devPlans: DEV_PLANS }));

route('GET', '/api/subscription', async (req, res, ctx) => {
  if (!ctx.user || !ctx.workspace) return fail(res, 401, 'NOT_AUTHENTICATED');
  const sub = Subscriptions.ensure(ctx.workspace.id, Plans.DEFAULT_PLAN_ID);
  return ok(res, {
    subscription: sub,
    summary: Plans.summary(sub.plan_id, ctx.workspace.id, Workspaces.countForUser(ctx.user.id)),
    devPlans: DEV_PLANS
  });
});

/* Plan switching exists for testing only. With STUDIO_DEV_PLANS off this is a
   403 — no client can buy a plan, because nothing here takes money. */
route('POST', '/api/subscription/change', async (req, res, ctx, body) => {
  if (!ctx.user || !ctx.workspace) return fail(res, 401, 'NOT_AUTHENTICATED');
  if (!DEV_PLANS) {
    return fail(res, 403, 'PAYMENTS_DISABLED', '尚未接入支付，无法变更套餐');
  }
  const plan = Plans.planById(body.planId) || Plans.planByKey(body.planId);
  if (!plan) return fail(res, 400, 'BAD_PLAN', '套餐不存在');
  /* a simulated change never touches a single asset */
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 86400000);
  Subscriptions.setPlan(ctx.workspace.id, plan.id, 'active');
  Subscriptions.setPeriod(ctx.workspace.id, now.toISOString(), end.toISOString(), 'active');
  return ok(res, {
    simulated: true,
    subscription: Subscriptions.byWorkspace(ctx.workspace.id),
    summary: Plans.summary(plan.id, ctx.workspace.id, Workspaces.countForUser(ctx.user.id)),
    note: '开发环境模拟变更，未发生任何真实支付'
  });
});

route('GET', '/api/usage', async (req, res, ctx) => {
  if (!ctx.user || !ctx.workspace) return fail(res, 401, 'NOT_AUTHENTICATED');
  const sub = Subscriptions.ensure(ctx.workspace.id, Plans.DEFAULT_PLAN_ID);
  return ok(res, Plans.summary(sub.plan_id, ctx.workspace.id, Workspaces.countForUser(ctx.user.id)));
});

/* ---------------- request loop ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (pathname === '/api/health') {
    return send(res, 200, { ok: true, devPlans: DEV_PLANS, users: Users.count() });
  }

  if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && !Auth.sameOrigin(req)) return fail(res, 403, 'BAD_ORIGIN');

  const hit = match(req.method, pathname);
  if (!hit) return fail(res, 404, 'NOT_FOUND');

  let body = {};
  if (req.method !== 'GET') {
    try { body = await readJson(req); }
    catch (e) { return fail(res, 400, e.message === 'PAYLOAD_TOO_LARGE' ? 'PAYLOAD_TOO_LARGE' : 'BAD_JSON'); }
  }
  const ctx = Auth.context(req);
  try {
    await hit.handler(req, res, ctx, body, hit.params);
  } catch (e) {
    console.error('[api]', req.method, pathname, e && e.message);
    return fail(res, 500, 'SERVER_ERROR', String(e && e.message || e));
  }
});

server.listen(PORT, () => {
  console.log('[studio api] http://localhost:' + PORT + '  web=' + ROOT + '  devPlans=' + DEV_PLANS);
});

module.exports = server;
