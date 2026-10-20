/* ==========================================================================
   STUDIO API · authentication
   scrypt password hashing + server-side session cookies. Node built-ins only.
   The server never trusts a userId / workspaceId sent by the client: identity
   always comes from the session token, workspace ownership is re-checked on
   every request.
   ========================================================================== */
'use strict';
const crypto = require('node:crypto');
const { Users, Sessions, Workspaces } = require('./db');

const COOKIE = 'studio_sid';
const SESSION_DAYS = 30;

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), s, 64).toString('hex');
  return { hash, salt: s };
}
function verifyPassword(password, user) {
  if (!user) return false;
  const h = crypto.scryptSync(String(password), user.password_salt, 64).toString('hex');
  const a = Buffer.from(h, 'hex');
  const b = Buffer.from(user.password_hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i === -1) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function tokenFrom(req) {
  return parseCookies(req.headers.cookie)[COOKIE] || null;
}

function setSessionCookie(res, token) {
  const attrs = [
    COOKIE + '=' + token,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + (SESSION_DAYS * 86400)
  ];
  const existing = res.getHeader('Set-Cookie');
  const line = attrs.join('; ');
  if (existing) res.setHeader('Set-Cookie', [].concat(existing, line));
  else res.setHeader('Set-Cookie', line);
}
function clearSessionCookie(res) {
  const line = COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
  res.setHeader('Set-Cookie', line);
}

/* identity + active workspace, resolved from the session only */
function context(req) {
  const token = tokenFrom(req);
  const session = Sessions.byToken(token);
  if (!session) return { user: null, session: null, workspace: null };
  const user = Users.byId(session.user_id);
  if (!user) return { user: null, session: null, workspace: null };
  let workspace = session.active_workspace_id ? Workspaces.byId(session.active_workspace_id) : null;
  /* a workspace that belongs to somebody else is never usable, even if the
     session somehow points at it */
  if (workspace && workspace.owner_id !== user.id) workspace = null;
  if (!workspace) {
    const mine = Workspaces.listForUser(user.id);
    workspace = mine[0] || null;
    if (workspace) Sessions.setWorkspace(token, workspace.id);
  }
  return { user, session, workspace, token };
}

/* a workspace referenced in the URL/body must belong to the session user */
function assertWorkspace(ctx, workspaceId) {
  if (!ctx.user) return { ok: false, status: 401, error: 'NOT_AUTHENTICATED' };
  if (!workspaceId) return { ok: false, status: 400, error: 'WORKSPACE_REQUIRED' };
  const w = Workspaces.byId(workspaceId);
  if (!w || w.owner_id !== ctx.user.id) {
    /* deliberately indistinguishable from "not found" */
    return { ok: false, status: 404, error: 'WORKSPACE_NOT_FOUND' };
  }
  return { ok: true, workspace: w };
}

/* cheap guard against a page posting to another origin */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch (e) { return false; }
}

/* very small login throttle — enough to stop a script hammering the form */
const attempts = new Map();
function loginAllowed(key) {
  const rec = attempts.get(key) || { n: 0, until: 0 };
  if (rec.until && Date.now() < rec.until) return false;
  if (rec.until && Date.now() >= rec.until) attempts.delete(key);
  return true;
}
function loginFailed(key) {
  const rec = attempts.get(key) || { n: 0, until: 0 };
  rec.n += 1;
  if (rec.n >= 6) rec.until = Date.now() + 5 * 60 * 1000;
  attempts.set(key, rec);
}
function loginSucceeded(key) { attempts.delete(key); }

module.exports = {
  COOKIE, SESSION_DAYS,
  hashPassword, verifyPassword,
  tokenFrom, setSessionCookie, clearSessionCookie,
  context, assertWorkspace, sameOrigin,
  loginAllowed, loginFailed, loginSucceeded
};
