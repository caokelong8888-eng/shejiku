/* ==========================================================================
   STUDIO API · plans, entitlements, usage
   The single place plan rules live. Pages never write `if (plan === 'pro')` —
   they ask canUse() / usage() and render whatever comes back.

   Rules that matter most here:
   · a limit blocks NEW items, never removes existing ones
   · a downgrade never deletes anything, it only reports "over limit"
   · storage is measured from bytes actually stored — never invented
   ========================================================================== */
'use strict';
const { Records } = require('./db');

const MB = 1024 * 1024;
const GB = 1024 * MB;

const PLANS = [
  {
    id: 'plan_free', key: 'free', name: 'Free', nameZh: 'Free',
    priceNote: '¥0', periodNote: '永久免费',
    tagline: '开始整理你的第一批作品。',
    entitlements: {
      maxDesigns: 100,
      maxStorageBytes: 512 * MB,
      maxWorkspaces: 2,
      website: false,               /* site module off; existing data is kept */
      maxVersionsPerDesign: 3
    },
    features: [
      '100 件设计资产',
      '512 MB 文件存储',
      '2 个工作区',
      '每件设计最多 3 个版本',
      '品牌识别',
      '网站模块：未开放'
    ]
  },
  {
    id: 'plan_pro', key: 'pro', name: 'Pro', nameZh: 'Pro',
    priceNote: '¥79', periodNote: '/ 月',
    tagline: '给持续创作的个人设计师。',
    entitlements: {
      maxDesigns: 1000,
      maxStorageBytes: 5 * GB,
      maxWorkspaces: 5,
      website: true,
      maxVersionsPerDesign: 20
    },
    features: [
      '1,000 件设计资产',
      '5 GB 文件存储',
      '5 个工作区',
      '每件设计最多 20 个版本',
      '品牌识别',
      '网站模块：可编辑与发布'
    ]
  },
  {
    id: 'plan_studio', key: 'studio', name: 'Studio', nameZh: 'Studio',
    priceNote: '¥199', periodNote: '/ 月',
    tagline: '个人工作室的长期档案。',
    entitlements: {
      maxDesigns: 10000,
      maxStorageBytes: 50 * GB,
      maxWorkspaces: 20,
      website: true,
      maxVersionsPerDesign: 100
    },
    features: [
      '10,000 件设计资产',
      '50 GB 文件存储',
      '20 个工作区',
      '每件设计最多 100 个版本',
      '品牌识别',
      '网站模块：可编辑与发布'
    ]
  }
];

const DEFAULT_PLAN_ID = 'plan_free';

function planById(id) { return PLANS.find(p => p.id === id) || PLANS[0]; }
function planByKey(key) { return PLANS.find(p => p.key === key) || PLANS[0]; }

function publicPlan(p) {
  return {
    id: p.id, key: p.key, name: p.name, nameZh: p.nameZh,
    priceNote: p.priceNote, periodNote: p.periodNote,
    tagline: p.tagline, features: p.features,
    entitlements: p.entitlements
  };
}

/* ---------- real usage, measured from stored rows ---------- */
function usage(workspaceId) {
  const designs = Records.list(workspaceId, 'design');
  const files = Records.list(workspaceId, 'file');
  let storageBytes = 0;
  files.forEach(f => {
    /* only bytes we actually keep are counted: an image is a data URL,
       a metadata-only file contributes nothing */
    if (f.dataUrl) storageBytes += Math.round(String(f.dataUrl).length * 0.75);
  });
  return {
    designs: designs.filter(d => !d.deletedAt).length,
    files: files.filter(f => !f.deletedAt).length,
    storageBytes: storageBytes,
    /* workspace count belongs to the user, filled in by the caller */
    workspaces: null
  };
}

/* ---------- entitlement checks ---------- */
function entitlementsOf(planId) { return planById(planId).entitlements; }

function check(planId, action, ctx = {}) {
  const ent = entitlementsOf(planId);
  if (action === 'design.create') {
    if (ctx.designCount >= ent.maxDesigns) {
      return deny('PLAN_LIMIT_DESIGNS', '已达到当前套餐的设计数量上限', {
        limit: ent.maxDesigns, used: ctx.designCount
      });
    }
  }
  if (action === 'file.create') {
    const next = (ctx.storageBytes || 0) + (ctx.addBytes || 0);
    if (next > ent.maxStorageBytes) {
      return deny('PLAN_LIMIT_STORAGE', '存储空间已达当前套餐上限', {
        limit: ent.maxStorageBytes, used: ctx.storageBytes
      });
    }
  }
  if (action === 'version.create') {
    if (ctx.versionCount >= ent.maxVersionsPerDesign) {
      return deny('PLAN_LIMIT_VERSIONS', '这件设计的版本数已达当前套餐上限', {
        limit: ent.maxVersionsPerDesign, used: ctx.versionCount
      });
    }
  }
  if (action === 'workspace.create') {
    if (ctx.workspaceCount >= ent.maxWorkspaces) {
      return deny('PLAN_LIMIT_WORKSPACES', '工作区数量已达当前套餐上限', {
        limit: ent.maxWorkspaces, used: ctx.workspaceCount
      });
    }
  }
  if (action === 'website.edit') {
    if (!ent.website) {
      return deny('PLAN_WEBSITE_LOCKED', '当前套餐未开放网站模块，升级后可继续编辑', {});
    }
  }
  return { ok: true };
}

function deny(code, message, detail) {
  return { ok: false, code: code, message: message, detail: detail };
}

/* what the UI needs to draw plan cards and the usage panel */
function summary(planId, workspaceId, workspaceCount) {
  const plan = planById(planId);
  const u = usage(workspaceId);
  u.workspaces = workspaceCount;
  const ent = plan.entitlements;
  const over = {
    designs: u.designs > ent.maxDesigns,
    storage: u.storageBytes > ent.maxStorageBytes,
    workspaces: u.workspaces > ent.maxWorkspaces,
    website: !ent.website && Records.count(workspaceId, 'website') > 0
  };
  return {
    plan: publicPlan(plan),
    usage: u,
    limits: {
      designs: ent.maxDesigns,
      storageBytes: ent.maxStorageBytes,
      workspaces: ent.maxWorkspaces,
      versionsPerDesign: ent.maxVersionsPerDesign,
      website: ent.website
    },
    overLimit: over,
    anyOverLimit: Object.keys(over).some(k => over[k])
  };
}

module.exports = {
  PLANS, DEFAULT_PLAN_ID, MB, GB,
  planById, planByKey, publicPlan, entitlementsOf,
  usage, check, summary
};
