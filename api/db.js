/* ==========================================================================
   STUDIO API · data layer
   Node built-ins only: node:sqlite + node:crypto. No npm packages, so this
   cannot pull anything into the other projects running on the same box.

   Business rows (design / version / collection / project / brand / website /
   file / folder / tag / change log) live in one `records` table keyed by
   workspace_id. Every read and write in the API goes through workspaceId —
   that is what makes the isolation real rather than cosmetic.
   ========================================================================== */
'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DATA_DIR = process.env.STUDIO_DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'studio.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  email_norm    TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token                TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL,
  active_workspace_id  TEXT,
  created_at           TEXT NOT NULL,
  expires_at           TEXT NOT NULL,
  last_seen            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  logo        TEXT,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ws_owner ON workspaces(owner_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   TEXT PRIMARY KEY,
  workspace_id         TEXT NOT NULL UNIQUE,
  plan_id              TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active',
  started_at           TEXT NOT NULL,
  current_period_start TEXT NOT NULL,
  current_period_end   TEXT,
  updated_at           TEXT NOT NULL
);

-- composite key on purpose: the same asset id may legitimately exist in two
-- different workspaces, so the row identity is (workspace_id, id)
CREATE TABLE IF NOT EXISTS records (
  workspace_id TEXT NOT NULL,
  id          TEXT NOT NULL,
  type        TEXT NOT NULL,
  data        TEXT NOT NULL,
  deleted_at  TEXT,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (workspace_id, id)
);
CREATE INDEX IF NOT EXISTS idx_records_ws ON records(workspace_id, type);
CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
`);

/* ---------------- helpers ---------------- */
const nowIso = () => new Date().toISOString();
const uid = (p) => p + '_' + crypto.randomBytes(9).toString('hex');

function q1(sql, ...args) { return db.prepare(sql).get(...args); }
function qall(sql, ...args) { return db.prepare(sql).all(...args).map(r => ({ ...r })); }
function run(sql, ...args) { return db.prepare(sql).run(...args); }

/* ---------------- users ---------------- */
const Users = {
  create(email, name, passwordHash, passwordSalt) {
    const id = uid('u');
    const now = nowIso();
    run('INSERT INTO users (id,email,email_norm,name,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      id, email, email.trim().toLowerCase(), name, passwordHash, passwordSalt, now, now);
    return Users.byId(id);
  },
  byId(id) { return q1('SELECT * FROM users WHERE id = ?', id); },
  byEmail(email) { return q1('SELECT * FROM users WHERE email_norm = ?', String(email || '').trim().toLowerCase()); },
  update(id, patch) {
    const u = Users.byId(id);
    if (!u) return null;
    const email = patch.email === undefined ? u.email : patch.email;
    const name = patch.name === undefined ? u.name : patch.name;
    run('UPDATE users SET email=?, email_norm=?, name=?, updated_at=? WHERE id=?',
      email, String(email).trim().toLowerCase(), name, nowIso(), id);
    return Users.byId(id);
  },
  setPassword(id, hash, salt) {
    run('UPDATE users SET password_hash=?, password_salt=?, updated_at=? WHERE id=?', hash, salt, nowIso(), id);
  },
  count() { return q1('SELECT COUNT(*) AS n FROM users').n; }
};

/* ---------------- sessions ---------------- */
const Sessions = {
  create(userId, workspaceId) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    run('INSERT INTO sessions (token,user_id,active_workspace_id,created_at,expires_at,last_seen) VALUES (?,?,?,?,?,?)',
      token, userId, workspaceId || null, new Date(now).toISOString(),
      new Date(now + 30 * 86400000).toISOString(), new Date(now).toISOString());
    return Sessions.byToken(token);
  },
  byToken(token) {
    if (!token) return null;
    const s = q1('SELECT * FROM sessions WHERE token = ?', token);
    if (!s) return null;
    if (new Date(s.expires_at).getTime() < Date.now()) { Sessions.destroy(token); return null; }
    return s;
  },
  touch(token) { run('UPDATE sessions SET last_seen=? WHERE token=?', nowIso(), token); },
  setWorkspace(token, workspaceId) { run('UPDATE sessions SET active_workspace_id=? WHERE token=?', workspaceId, token); },
  destroy(token) { run('DELETE FROM sessions WHERE token = ?', token); },
  destroyForUser(userId) { run('DELETE FROM sessions WHERE user_id = ?', userId); }
};

/* ---------------- workspaces ---------------- */
function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'workspace';
}

const Workspaces = {
  create(ownerId, name, opts = {}) {
    const id = uid('ws');
    const now = nowIso();
    let slug = slugify(opts.slug || name);
    if (q1('SELECT id FROM workspaces WHERE slug = ?', slug)) slug = slug + '-' + id.slice(-4);
    run('INSERT INTO workspaces (id,owner_id,name,slug,logo,description,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      id, ownerId, name, slug, opts.logo || null, opts.description || '', now, now);
    return Workspaces.byId(id);
  },
  byId(id) { return q1('SELECT * FROM workspaces WHERE id = ?', id); },
  listForUser(userId) {
    return qall('SELECT * FROM workspaces WHERE owner_id = ? ORDER BY created_at', userId);
  },
  countForUser(userId) { return q1('SELECT COUNT(*) AS n FROM workspaces WHERE owner_id = ?', userId).n; },
  update(id, patch) {
    const w = Workspaces.byId(id);
    if (!w) return null;
    const name = patch.name === undefined ? w.name : patch.name;
    const description = patch.description === undefined ? w.description : patch.description;
    const logo = patch.logo === undefined ? w.logo : patch.logo;
    run('UPDATE workspaces SET name=?, description=?, logo=?, updated_at=? WHERE id=?', name, description, logo, nowIso(), id);
    return Workspaces.byId(id);
  },
  destroy(id) {
    run('DELETE FROM records WHERE workspace_id = ?', id);
    run('DELETE FROM subscriptions WHERE workspace_id = ?', id);
    run('DELETE FROM workspaces WHERE id = ?', id);
  }
};

/* ---------------- subscriptions ---------------- */
const Subscriptions = {
  ensure(workspaceId, planId) {
    const s = Subscriptions.byWorkspace(workspaceId);
    if (s) return s;
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 86400000);
    run('INSERT INTO subscriptions (id,workspace_id,plan_id,status,started_at,current_period_start,current_period_end,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      uid('sub'), workspaceId, planId, 'active', now.toISOString(), now.toISOString(), end.toISOString(), now.toISOString());
    return Subscriptions.byWorkspace(workspaceId);
  },
  byWorkspace(workspaceId) { return q1('SELECT * FROM subscriptions WHERE workspace_id = ?', workspaceId); },
  setPlan(workspaceId, planId, status) {
    const s = Subscriptions.byWorkspace(workspaceId);
    if (!s) return Subscriptions.ensure(workspaceId, planId);
    run('UPDATE subscriptions SET plan_id=?, status=?, updated_at=? WHERE workspace_id=?', planId, status || s.status, nowIso(), workspaceId);
    return Subscriptions.byWorkspace(workspaceId);
  },
  setPeriod(workspaceId, start, end, status) {
    run('UPDATE subscriptions SET current_period_start=?, current_period_end=?, status=?, updated_at=? WHERE workspace_id=?',
      start, end, status, nowIso(), workspaceId);
    return Subscriptions.byWorkspace(workspaceId);
  }
};

/* ---------------- business records ---------------- */
const RECORD_TYPES = ['design', 'collection', 'project', 'brand', 'website',
                      'folder', 'file', 'tag', 'version_event', 'taxonomy'];

const Records = {
  put(workspaceId, type, row) {
    const data = JSON.stringify(row);
    const now = nowIso();
    const exists = q1('SELECT id FROM records WHERE id = ? AND workspace_id = ?', row.id, workspaceId);
    if (exists) {
      run('UPDATE records SET data=?, type=?, deleted_at=?, updated_at=? WHERE id=? AND workspace_id=?',
        data, type, row.deletedAt || null, now, row.id, workspaceId);
    } else {
      run('INSERT INTO records (id,workspace_id,type,data,deleted_at,updated_at) VALUES (?,?,?,?,?,?)',
        row.id, workspaceId, type, data, row.deletedAt || null, now);
    }
    return row;
  },
  get(workspaceId, id) {
    const r = q1('SELECT * FROM records WHERE id = ? AND workspace_id = ?', id, workspaceId);
    return r ? JSON.parse(r.data) : null;
  },
  /* every listing in the app goes through here — a row from another
     workspace simply does not exist as far as this call is concerned */
  list(workspaceId, type, includeDeleted) {
    const sql = includeDeleted
      ? 'SELECT data FROM records WHERE workspace_id = ? AND type = ?'
      : 'SELECT data FROM records WHERE workspace_id = ? AND type = ? AND deleted_at IS NULL';
    return db.prepare(sql).all(workspaceId, type).map(r => JSON.parse(r.data));
  },
  remove(workspaceId, id) { run('DELETE FROM records WHERE id = ? AND workspace_id = ?', id, workspaceId); },
  removeAll(workspaceId) { run('DELETE FROM records WHERE workspace_id = ?', workspaceId); },
  count(workspaceId, type) {
    return q1('SELECT COUNT(*) AS n FROM records WHERE workspace_id = ? AND type = ? AND deleted_at IS NULL', workspaceId, type).n;
  }
};

module.exports = { db, uid, nowIso, Users, Sessions, Workspaces, Subscriptions, Records, RECORD_TYPES, slugify };
