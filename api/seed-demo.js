/* ==========================================================================
   STUDIO API · demo seed
   Creates ONE test user with three workspaces (Free / Pro / Studio), filled
   from the exact seed data exported from phases 9–10 (api/seed-data.json).
   Nothing new is invented here: the Pro and Studio spaces are slices of the
   same dataset so plan limits can be exercised against real-looking work.

   Run:  node api/seed-demo.js          (add --reset to wipe the database first)
   ========================================================================== */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Users, Workspaces, Subscriptions, Records, db } = require('./db');
const Plans = require('./plans');

const DEMO_EMAIL = 'demo@dede.studio';
const DEMO_PASSWORD = 'dede2026';
const DEMO_NAME = '曹总';

if (process.argv.includes('--reset')) {
  ['users', 'sessions', 'workspaces', 'subscriptions', 'records'].forEach(t => {
    try { db.exec('DELETE FROM ' + t); } catch (e) {}
  });
  console.log('数据库已清空');
}

const raw = fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8');
const seed = JSON.parse(raw);

function rowsOf(key, wsFilter) {
  return (seed[key] || []).filter(r => !wsFilter || r.workspaceId === wsFilter);
}

/* slice helper: take n designs and keep only the rows they reference */
function slice(n, offset) {
  const all = rowsOf('designs', 'ws1').filter(d => !d.deletedAt);
  const designs = [];
  for (let i = 0; i < n; i++) designs.push(all[(i * 7 + offset) % all.length]);
  const ids = {};
  designs.forEach(d => { ids[d.id] = true; });
  const uniq = Object.keys(ids).map(id => all.find(d => d.id === id)).filter(Boolean);
  return { designs: uniq, ids: ids };
}

function importInto(workspaceId, bundle, opts = {}) {
  const designs = bundle.designs || rowsOf('designs', 'ws1');
  const ids = bundle.ids || null;
  const pick = row => !ids || ids[row.id];
  let n = 0;
  const put = (type, row) => {
    if (!row || !row.id) return;
    Records.put(workspaceId, type, Object.assign({}, row, { workspaceId: workspaceId }));
    n++;
  };
  designs.forEach(d => put('design', d));
  rowsOf('collections', 'ws1').forEach(c => {
    if (!ids) return put('collection', c);
    const kept = c.designIds.filter(x => ids[x]);
    put('collection', Object.assign({}, c, { designIds: kept, sortOrder: kept }));
  });
  rowsOf('projects', 'ws1').forEach(p => {
    if (!ids) return put('project', p);
    put('project', Object.assign({}, p, { designIds: p.designIds.filter(x => ids[x]) }));
  });
  rowsOf('tags', 'ws1').forEach(t => put('tag', t));
  rowsOf('folders', 'ws1').forEach(f => put('folder', f));
  rowsOf('files', 'ws1').forEach(f => {
    if (!ids && !opts.allFiles) return;
    put('file', f);
  });
  rowsOf('versionEvents', 'ws1').forEach(e => { if (pick(e)) put('version_event', e); });

  /* brand + website for the workspace: references rewritten to kept designs */
  const brand = rowsOf('brands', 'ws1')[0];
  if (brand && (opts.brand !== false)) {
    const featured = (brand.featuredDesignIds || []).filter(x => !ids || ids[x]);
    const colls = (brand.featuredCollectionIds || []).slice(0, 3);
    Records.put(workspaceId, 'brand', Object.assign({}, brand, {
      id: 'brand-' + workspaceId, workspaceId: workspaceId,
      featuredDesignIds: featured.length ? featured : designs.slice(0, 6).map(d => d.id),
      featuredCollectionIds: colls
    }));
    n++;
  }
  const site = rowsOf('websites', 'ws1')[0];
  if (site && (opts.website !== false)) {
    const works = (site.sections.find(s => s.type === 'featured_works') || { designIds: [] })
      .designIds.filter(x => !ids || ids[x]);
    Records.put(workspaceId, 'website', Object.assign({}, site, {
      id: 'web-' + workspaceId, workspaceId: workspaceId,
      sections: site.sections.map(s => s.type === 'featured_works'
        ? Object.assign({}, s, { designIds: works.length ? works : designs.slice(0, 6).map(d => d.id) })
        : s)
    }));
    n++;
  }
  if (seed.taxonomy) {
    Records.put(workspaceId, 'taxonomy', Object.assign({ id: 'tax-' + workspaceId }, seed.taxonomy));
    n++;
  }
  return n;
}

/* ---- build ---- */
let user = Users.byEmail(DEMO_EMAIL);
if (user) {
  console.log('已存在测试账号：' + DEMO_EMAIL + '（先执行 --reset 可重建）');
} else {
  const { hash, salt } = (() => {
    const s = crypto.randomBytes(16).toString('hex');
    return { hash: crypto.scryptSync(DEMO_PASSWORD, s, 64).toString('hex'), salt: s };
  })();
  user = Users.create(DEMO_EMAIL, DEMO_NAME, hash, salt);
}

function ensureWorkspace(name, planId, bundle, opts) {
  const existing = Workspaces.listForUser(user.id).find(w => w.name === name);
  const ws = existing || Workspaces.create(user.id, name, { description: opts.description || '' });
  const n = existing ? 0 : importInto(ws.id, bundle, opts);
  Subscriptions.setPlan(ws.id, planId, 'active');
  return { ws, imported: n };
}

const a = ensureWorkspace('德得珠宝 · Free', 'plan_free', { designs: rowsOf('designs', 'ws1'), ids: null }, { allFiles: true, description: '主工作区，完整测试数据' });
const b = ensureWorkspace('Pro 测试空间', 'plan_pro', slice(30, 3), { description: 'Pro 套餐验证用' });
const c = ensureWorkspace('Studio 测试空间', 'plan_studio', slice(8, 11), { description: 'Studio 套餐验证用' });

console.log('\n测试账号：' + DEMO_EMAIL + ' / ' + DEMO_PASSWORD);
[a, b, c].forEach(({ ws, imported }) => {
  const plan = Plans.planById(Subscriptions.byWorkspace(ws.id).plan_id);
  const u = Plans.usage(ws.id);
  console.log(` · ${ws.name}  [${plan.name}]  设计 ${u.designs}/${plan.entitlements.maxDesigns}` +
    `  文件 ${u.files}  存储 ${(u.storageBytes / 1024 / 1024).toFixed(2)} MB` +
    `  网站 ${plan.entitlements.website ? '开放' : '关闭'}  导入 ${imported} 行`);
});
console.log('\n启动： STUDIO_PORT=8099 STUDIO_DEV_PLANS=1 node api/server.js');
