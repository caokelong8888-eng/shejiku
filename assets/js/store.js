/* ==========================================================================
   STUDIO · Store — workspace data layer (design assets · collections · projects
   · brand · website · files · tags & taxonomy)
   Workspace
     ├── Design Assets  (collectionIds[], projectId)     286 seed assets
     ├── Collections    (designIds[], sortOrder[], status)
     ├── Projects       (designIds[], status, files)
     └── Brand          (identity + colour / type system + curated refs)

   Brand never copies a design asset — it only holds reference ids
   (featuredDesignIds / featuredCollectionIds), so Design Assets stay
   the single source of truth. Website + AI layers read from here later.

   Persisted to localStorage.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'studio-data-v7';   /* phase-8 upgrades versions to records — breaks compatibility on purpose */

  /* Phase 0 data: a working jewellery atelier, not a ceramics library */
  var TYPES = {
    ring:     { zh: '戒指', en: 'Ring' },
    pendant:  { zh: '吊坠', en: 'Pendant' },
    earring:  { zh: '耳饰', en: 'Earrings' },
    necklace: { zh: '项链', en: 'Necklace' },
    bracelet: { zh: '手链', en: 'Bracelet' },
    brooch:   { zh: '胸针', en: 'Brooch' },
    set:      { zh: '套装', en: 'Set' }
  };

  var METALS = {
    gold:     { zh: '黄金',   en: 'Yellow gold' },
    rose:     { zh: '玫瑰金', en: 'Rose gold' },
    silver:   { zh: '银',     en: 'Silver' },
    platinum: { zh: '铂金',   en: 'Platinum' },
    brass:    { zh: '黄铜',   en: 'Brass' }
  };

  var STONES = {
    emerald:   { zh: '祖母绿', en: 'Emerald' },
    diamond:   { zh: '钻石',   en: 'Diamond' },
    pearl:     { zh: '珍珠',   en: 'Pearl' },
    sapphire:  { zh: '蓝宝石', en: 'Sapphire' },
    ruby:      { zh: '红宝石', en: 'Ruby' },
    moonstone: { zh: '月光石', en: 'Moonstone' },
    onyx:      { zh: '缟玛瑙', en: 'Onyx' },
    amber:     { zh: '琥珀',   en: 'Amber' },
    topaz:     { zh: '托帕石', en: 'Topaz' },
    jade:      { zh: '玉',     en: 'Jade' }
  };

  /* design completion state — separate from the project status */
  var DSTAT = {
    concept:    { zh: '概念',  en: 'Concept' },
    developing: { zh: '打样中', en: 'In progress' },
    sample:     { zh: '样品',  en: 'Sample' },
    final:      { zh: '成品',  en: 'Final' }
  };

  /* Phase 7 — two more classification dimensions, so assets have a stable
     structural axis next to the free-form tags. All five dimensions live in
     state.taxonomy; these are only the defaults used to seed a workspace. */
  var STYLES = {
    minimal:  { zh: '极简',   en: 'Minimal' },
    natural:  { zh: '自然',   en: 'Natural' },
    geometric:{ zh: '几何',   en: 'Geometric' },
    sculptural:{ zh: '雕塑感', en: 'Sculptural' },
    vintage:  { zh: '复古',   en: 'Vintage' },
    oriental: { zh: '东方',   en: 'Oriental' }
  };

  var THEMES = {
    floral:    { zh: '花卉',   en: 'Floral' },
    architecture: { zh: '建筑', en: 'Architecture' },
    organic:   { zh: '有机形态', en: 'Organic' },
    animal:    { zh: '动物',   en: 'Animal' },
    abstract:  { zh: '抽象',   en: 'Abstract' },
    light:     { zh: '光',     en: 'Light' }
  };

  /* dimension registry — order drives the filter panel and the editor */
  var DIMENSIONS = [
    { key: 'type',   label: 'dim.type' },
    { key: 'style',  label: 'dim.style' },
    { key: 'metal',  label: 'dim.metal' },
    { key: 'stone',  label: 'dim.stone' },
    { key: 'status', label: 'dim.status' },
    { key: 'theme',  label: 'dim.theme' }
  ];

  var CSTAT = { draft: { zh: '草稿', en: 'Draft' }, public: { zh: '公开', en: 'Public' } };

  var PSTAT = {
    planning: { zh: '规划中', en: 'Planning' },
    active:   { zh: '进行中', en: 'In progress' },
    done:     { zh: '已完成', en: 'Completed' },
    archived: { zh: '已归档', en: 'Archived' }
  };

  /* ---- Phase 3: brand colour roles ---- */
  var BCOLOR = {
    primary:    { zh: '主色',   en: 'Primary' },
    secondary:  { zh: '辅助色', en: 'Secondary' },
    background: { zh: '背景色', en: 'Background' },
    text:       { zh: '文字色', en: 'Text' },
    accent:     { zh: '强调色', en: 'Accent' }
  };

  /* ---- Phase 3: type system — project fonts first, then system faces ----
     Stacks use single quotes so they can be inlined into a style="" attribute
     without breaking the attribute. */
  var FONTS = [
    { name: 'Cormorant Garamond', stack: "'Cormorant Garamond', Georgia, serif" },
    { name: 'Inter',              stack: "'Inter', -apple-system, 'Helvetica Neue', sans-serif" },
    { name: 'Songti SC',          stack: "'Songti SC', 'STSong', 'SimSun', serif" },
    { name: 'PingFang SC',        stack: "'PingFang SC', 'Microsoft YaHei', sans-serif" },
    { name: 'Georgia',            stack: "Georgia, 'Times New Roman', serif" },
    { name: 'Helvetica Neue',     stack: "'Helvetica Neue', Arial, sans-serif" },
    { name: 'Courier New',        stack: "'Courier New', monospace" }
  ];

  /* starting palette — quiet, material, editorial */
  function defaultColors() {
    return [
      { id: 'bc1', name: '陶土', nameEn: 'Terracotta', hex: '#A9694B', type: 'primary' },
      { id: 'bc2', name: '亚麻', nameEn: 'Linen',      hex: '#CFC9BA', type: 'secondary' },
      { id: 'bc3', name: '纸白', nameEn: 'Paper',      hex: '#F6F4EF', type: 'background' },
      { id: 'bc4', name: '墨',   nameEn: 'Ink',        hex: '#1D1B18', type: 'text' },
      { id: 'bc5', name: '苔绿', nameEn: 'Moss',       hex: '#7C8471', type: 'accent' }
    ];
  }

  /* ---- Phase 5: file kinds (kept next to the other label maps) ---- */
  var FILEKIND = {
    image:   { zh: '图片',     en: 'Image' },
    pdf:     { zh: 'PDF',      en: 'PDF' },
    design:  { zh: '设计文件', en: 'Design file' },
    doc:     { zh: '文档',     en: 'Document' },
    font:    { zh: '字体',     en: 'Font' },
    archive: { zh: '压缩包',   en: 'Archive' },
    other:   { zh: '其他',     en: 'Other' }
  };

  var daysAgo = function (n) { return new Date(Date.now() - n * 86400000).toISOString(); };

  /* ---------------- seed ---------------- */
  function seedA() {
    /* ---- jewellery categories, metals, stones, states ---- */
    var CAT = {
      ring: {
        names: [['晨露', 'Morning Dew'], ['环序', 'Ring Order'], ['石语', 'Stone Whisper'],
                ['光年', 'Light Year'], ['弧', 'Arc'], ['拾光', 'Gathered Light']],
        desc: ['以单颗主石为核心的日常戒指，戒臂收窄以拉长指形。',
               '戒圈由两段弧线咬合而成，正面留出一线缝隙。',
               '主石抬高的镶嵌方式，让光从侧面进入。'],
        covers: ['jw/ring-emerald-gold.jpg', 'jw/ring-diamond-platinum.jpg', 'jw/ring-pearl-rose.jpg',
                 'jw/ring-sculpted-brass.jpg', 'jw/ring-sapphire-cluster.jpg', 'jw/ring-wide-band.jpg'],
        metals: ['gold', 'platinum', 'rose', 'brass', 'silver', 'gold'],
        stones: ['emerald', 'diamond', 'pearl', 'onyx', 'sapphire', 'topaz'],
        count: 18
      },
      pendant: {
        names: [['垂光', 'Hanging Light'], ['水滴', 'Teardrop'], ['静垂', 'Still Drop'],
                ['月读', 'Moon Reading'], ['一枚', 'One Piece']],
        desc: ['细链悬一枚坠饰，重心压低，走动时几乎不动。',
               '坠饰背面同样做了收边处理，反转佩戴也成立。',
               '链长可调，坠饰贴近锁骨位置。'],
        covers: ['jw/pendant-pearl-rose.jpg', 'jw/pendant-sapphire-silver.jpg',
                 'jw/pendant-moonstone-gold.jpg', 'jw/pendant-onyx.jpg'],
        metals: ['rose', 'silver', 'gold', 'platinum'],
        stones: ['pearl', 'sapphire', 'moonstone', 'onyx'],
        count: 14
      },
      earring: {
        names: [['双生', 'Twin'], ['耳畔', 'Beside the Ear'], ['轻坠', 'Light Drop'],
                ['对语', 'Dialogue'], ['环佩', 'Hoop']],
        desc: ['一对耳饰，左右重量刻意做得略有差异以便区分。',
               '上部耳扣极简，全部视觉重量落在下方坠饰。',
               '耳针与坠饰分段制作，可在工厂单独更换。'],
        covers: ['jw/earring-pearl-gold.jpg', 'jw/earring-moonstone.jpg',
                 'jw/earring-ruby-drop.jpg', 'jw/earring-hoop.jpg'],
        metals: ['gold', 'silver', 'rose', 'gold'],
        stones: ['pearl', 'moonstone', 'ruby', 'topaz'],
        count: 16
      },
      necklace: {
        names: [['长夜', 'Long Night'], ['珠序', 'Bead Order'], ['垂链', 'Drop Chain'],
                ['语句', 'Sentence'], ['静链', 'Quiet Chain']],
        desc: ['珠链逐颗挑选，直径差控制在 0.4mm 以内。',
               '链型收在锁骨下方，配高领与低领都可。',
               '中央坠饰可拆卸，日常可只戴链。'],
        covers: ['jw/necklace-gold-chain.jpg', 'jw/necklace-pearl.jpg',
                 'jw/necklace-statement.jpg', 'jw/necklace-layered.jpg'],
        metals: ['gold', 'silver', 'gold', 'rose'],
        stones: ['topaz', 'pearl', 'jade', 'amber'],
        count: 15
      },
      bracelet: {
        names: [['绕', 'Winding'], ['腕间', 'At the Wrist'], ['一节', 'One Link'],
                ['环行', 'Circling'], ['石环', 'Stone Ring']],
        desc: ['开口设计，可微调贴合腕围。',
               '链节逐节焊接，接口藏在第三与第四节之间。',
               '整圈抛光后手工拉丝，保留轻微的工具痕迹。'],
        covers: ['jw/bracelet-gold.jpg', 'jw/bracelet-gem.jpg',
                 'jw/bracelet-cuff.jpg', 'jw/bracelet-link.jpg'],
        metals: ['gold', 'silver', 'brass', 'rose'],
        stones: ['topaz', 'emerald', 'onyx', 'ruby'],
        count: 14
      },
      brooch: {
        names: [['花信', 'Flower Signal'], ['几何一', 'Geometry One'],
                ['叶序', 'Leaf Order'], ['静放', 'Quiet Bloom']],
        desc: ['胸针背面双针结构，厚面料也不易倾倒。',
               '花瓣由七片独立金属片铆接，可以微微开合。',
               '适合别在大衣翻领或包带上。'],
        covers: ['jw/brooch-floral.jpg', 'jw/brooch-geometric.jpg', 'jw/brooch-leaf.jpg'],
        metals: ['gold', 'platinum', 'brass'],
        stones: ['topaz', 'diamond', 'jade'],
        count: 12
      },
      set: {
        names: [['对戒 · 一', 'Pair One'], ['婚嫁套件', 'Bridal Set'], ['双环', 'Double Ring']],
        desc: ['两枚戒指同源起版，宽窄与石位略有差别。',
               '套件含对戒与一枚配套吊坠，同批材料制作。',
               '可作为婚嫁套件整体交付。'],
        covers: ['jw/set-pair-gold.jpg', 'jw/set-bridal.jpg', 'jw/set-rose-duo.jpg'],
        metals: ['gold', 'platinum', 'rose'],
        stones: ['emerald', 'diamond', 'moonstone'],
        count: 12
      }
    };

    var STATE_CYCLE = ['final', 'final', 'sample', 'developing', 'concept', 'final'];
    /* phase 8 — versions are real records now: name, notes, status, files */
    var VNOTE = [
      ['初始方案', '草图与比例推敲', 'final'],
      ['比例调整', '3D 建模，调整石位与戒臂厚度', 'review'],
      ['打样确认', '打样完成，确认收边与抛光', 'final'],
      ['定稿', '最终确认稿，交付工厂', 'final']
    ];

    function materialNote(metal, stone) {
      var m = (METALS[metal] || METALS.gold).zh;
      var s = STONES[stone] ? STONES[stone].zh : '';
      return (m === '黄金' ? '18K 黄金' : m) + (s ? ' · ' + s : '');
    }

    /* ---- phase 7: tag vocabulary (free-form, workspace scoped) ---- */
    var TAGDEF = [
      ['日常佩戴', 'Everyday'], ['通勤', 'Workday'], ['婚嫁', 'Bridal'], ['定制', 'Commission'],
      ['送礼', 'Gifting'], ['手工打磨', 'Hand-finished'], ['哑光', 'Matte'], ['高抛光', 'High polish'],
      ['可叠戴', 'Stackable'], ['轻量化', 'Lightweight'], ['晨光系列', 'First Light'],
      ['自然形态', 'Natural Forms'], ['蝴蝶系列', 'Butterfly'], ['建筑几何', 'Architectural'],
      ['单件', 'One-off'], ['样品', 'Sample'], ['复刻', 'Reissue'], ['待修改', 'Revision'],
      ['东方', 'Oriental'], ['雕塑感', 'Sculptural']
    ];
    var tags = TAGDEF.map(function (t, i) {
      return {
        id: 'tg' + (i + 1), workspaceId: 'ws1',
        name: t[0], nameEn: t[1],
        normalizedName: t[0].toLowerCase(),
        createdAt: daysAgo(210 - i * 4), updatedAt: daysAgo(210 - i * 4)
      };
    });

    var STYLE_CYCLE = ['minimal', 'natural', 'geometric', 'sculptural', 'minimal', 'vintage', 'oriental', 'natural'];
    var THEME_BY_TYPE = {
      ring: ['light', 'abstract', 'organic'],
      pendant: ['organic', 'floral', 'light'],
      earring: ['floral', 'light', 'organic'],
      necklace: ['organic', 'abstract', 'architecture'],
      bracelet: ['architecture', 'organic', 'abstract'],
      brooch: ['floral', 'animal', 'organic'],
      set: ['floral', 'light', 'abstract']
    };

    var designs = [];
    var idx = 0;
    Object.keys(CAT).forEach(function (type) {
      var c = CAT[type];
      for (var i = 0; i < c.count; i++) {
        var base = c.names[i % c.names.length];
        var round = Math.floor(i / c.names.length);
        var suffix = round > 0 ? ' No.' + (round + 1) : '';
        var metal = c.metals[i % c.metals.length];
        var stone = c.stones[i % c.stones.length];
        var cover = c.covers[i % c.covers.length];
        var st = STATE_CYCLE[i % STATE_CYCLE.length];
        /* structural classification — deterministic so the demo is stable */
        var style = STYLE_CYCLE[(i + idx) % STYLE_CYCLE.length];
        var theme = THEME_BY_TYPE[type][i % THEME_BY_TYPE[type].length];
        var created = 6 + idx * 2.6;
        idx++;
        /* a couple of pieces deliberately have no cover — the UI must fall back */
        if (idx === 37 || idx === 74) cover = null;
        designs.push({
          id: 'd' + idx,
          workspaceId: 'ws1',
          name: base[0] + suffix,
          nameEn: base[1] + suffix,
          type: type,
          style: style,
          theme: (idx % 23 === 0) ? null : theme,   /* a few assets left unclassified on purpose */
          metal: metal,
          stone: stone,
          status: st,
          year: 2024 + (i % 3),
          cover: cover,
          images: cover ? [cover] : [],
          description: c.desc[i % c.desc.length],
          descriptionEn: '',
          materialNote: materialNote(metal, stone),
          collectionIds: [],
          projectId: null,
          tagIds: [],
          versions: [],
          currentVersionId: null,
          favorite: idx % 7 === 0,
          archived: idx % 43 === 0,
          createdAt: daysAgo(created),
          updatedAt: daysAgo(1 + (idx * 7) % 320)
        });
      }
    });

    /* a small minority carry a fourth version — enough to exercise the
       timeline without turning every asset into a long history */
    designs.forEach(function (d) {
      var n = parseInt(String(d.id).replace('d', ''), 10) || 0;
      var count = (n % 13 === 0) ? 4 : 3;
      var born = 6 + n * 2.6;
      for (var k = 0; k < count; k++) {
        var def = VNOTE[k];
        d.versions.push({
          id: 'dv' + d.id + '-' + (k + 1),
          workspaceId: 'ws1',
          designAssetId: d.id,
          versionNumber: k + 1,
          name: def[0],
          notes: def[1],
          status: def[2],
          fileIds: [],
          createdAt: daysAgo(born + (count - 1 - k) * 6),
          updatedAt: daysAgo(born + (count - 1 - k) * 6),
          deletedAt: null
        });
      }
      d.currentVersionId = d.versions[d.versions.length - 1].id;
    });

    /* interleave categories so the library never opens on 18 rings in a row */
    (function interleave() {
      var buckets = {}, order = ['ring', 'necklace', 'earring', 'bracelet', 'pendant', 'brooch', 'set'];
      designs.forEach(function (d) { (buckets[d.type] = buckets[d.type] || []).push(d); });
      var maxN = 0;
      order.forEach(function (k) { if (buckets[k]) maxN = Math.max(maxN, buckets[k].length); });
      var mixed = [];
      for (var i = 0; i < maxN; i++) {
        order.forEach(function (k) { if (buckets[k] && buckets[k][i]) mixed.push(buckets[k][i]); });
      }
      designs = mixed;
    })();

    /* deterministic tag assignment: ~11% stay untagged so the "未标记"
       filter has something real to show */
    var SCENE = {
      ring: ['tg1', 'tg3'], pendant: ['tg1', 'tg5'], earring: ['tg1', 'tg2'],
      necklace: ['tg1', 'tg3'], bracelet: ['tg1', 'tg2'], brooch: ['tg5', 'tg15'], set: ['tg3', 'tg4']
    };
    var CRAFT = ['tg6', 'tg7', 'tg8', 'tg9', 'tg10'];
    var SERIES = ['tg11', 'tg12', 'tg13', 'tg14'];
    designs.forEach(function (d) {
      var n = parseInt(String(d.id).replace('d', ''), 10) || 0;
      var ids = [];
      if (n % 9 !== 0) {
        ids.push(SCENE[d.type][n % 2]);
        if (n % 3 !== 0) ids.push(CRAFT[n % CRAFT.length]);
        if (n % 4 === 0) ids.push(SERIES[n % SERIES.length]);
        if (n % 11 === 0) ids.push('tg16');
        if (n % 17 === 0) ids.push('tg18');
        if (d.style === 'oriental') ids.push('tg19');
        if (d.style === 'sculptural') ids.push('tg20');
      }
      d.tagIds = ids.filter(function (x, i) { return ids.indexOf(x) === i; });
    });

    /* even sampling so memberships look organic, not contiguous */
    function sample(count, offset, pool) {
      var arr = pool || designs;
      var N = arr.length, out = [];
      for (var i = 0; i < count; i++) {
        var k = (Math.floor(i * N / count) + offset) % N;
        var id = arr[k].id;
        if (out.indexOf(id) === -1) out.push(id);
      }
      return out;
    }

    var colls = [
      { id: 'c1', name: '2026 春夏 · 晨光', nameEn: 'SS26 — First Light', cover: 'jw/ring-emerald-gold.jpg', status: 'public',
        description: '以晨间的低角度光线为线索，金属表面做哑光处理，让光停在上面而不是滑过去。',
        ids: sample(24, 3), created: 148, updated: 2 },
      { id: 'c2', name: '自然形态', nameEn: 'Natural Forms', cover: 'jw/brooch-leaf.jpg', status: 'public',
        description: '从叶脉、水滴与石形中提炼的轮廓研究，大部分停留在样品阶段。',
        ids: sample(20, 11), created: 210, updated: 5 },
      { id: 'c3', name: '蝴蝶系列', nameEn: 'Butterfly Series', cover: 'jw/pendant-moonstone-gold.jpg', status: 'public',
        description: '围绕对称与翼形展开的专项系列，重点解决轻量化与镶嵌的平衡。',
        ids: sample(18, 27), created: 96, updated: 1 },
      { id: 'c4', name: '高级定制', nameEn: 'Fine Jewellery', cover: 'jw/set-bridal.jpg', status: 'public',
        description: '一对一定制的成品记录，含婚嫁套件与单件主石作品。',
        ids: sample(22, 41), created: 260, updated: 3 },
      { id: 'c5', name: '静形式', nameEn: 'Quiet Forms', cover: 'jw/ring-sculpted-brass.jpg', status: 'public',
        description: '安静、克制、以轮廓取胜的一组。多数没有主石。',
        ids: sample(16, 57), created: 300, updated: 8 },
      { id: 'c6', name: '建筑几何', nameEn: 'Architectural', cover: 'jw/brooch-geometric.jpg', status: 'draft',
        description: '关于比例、留白与几何咬合的长期练习，仍在整理中。',
        ids: sample(14, 69), created: 330, updated: 12 }
    ];

    var collections = colls.map(function (c) {
      return {
        id: c.id, workspaceId: 'ws1', name: c.name, nameEn: c.nameEn,
        description: c.description, descriptionEn: '',
        cover: c.cover, status: c.status,
        designIds: c.ids.slice(), sortOrder: c.ids.slice(),
        createdAt: daysAgo(c.created), updatedAt: daysAgo(c.updated)
      };
    });

    var projs = [
      { id: 'p1', name: '2027 春季系列', nameEn: 'Spring 2027 Series', status: 'active',
        description: '面向 2027 春季的新系列开发，从材料与形态开始，逐步收敛到成品方向。',
        ids: sample(9, 3), created: 120, updated: 1 },
      { id: 'p2', name: '私人定制 024', nameEn: 'Private Commission 024', status: 'planning',
        description: '客户定制婚戒方向，等待确认主石与金属方案。',
        ids: sample(4, 17), created: 40, updated: 6 },
      { id: 'p3', name: '蝴蝶胸针研发', nameEn: 'Butterfly Brooch R&D', status: 'active',
        description: '翼形结构的可制作性研究，探索轻量化与镶嵌的平衡。',
        ids: sample(6, 29), created: 88, updated: 4 },
      { id: 'p4', name: '新系列探索', nameEn: 'New Series Exploration', status: 'done',
        description: '开放性的方向探索，已完成阶段整理，成果并入合集。',
        ids: sample(11, 53), created: 200, updated: 22 },
      { id: 'p5', name: '2026 秋冬回顾', nameEn: 'AW26 Review', status: 'archived',
        description: '上一季作品的归档整理。',
        ids: sample(7, 71), created: 300, updated: 96 },
      { id: 'p6', name: '方向试验 · 未命名', nameEn: 'Direction Test — Untitled', status: 'planning',
        description: '刚刚立项，还没有放入具体作品。',
        ids: [], created: 3, updated: 3 }
    ];

    var projects = projs.map(function (p) {
      return {
        id: p.id, workspaceId: 'ws1', name: p.name, nameEn: p.nameEn,
        description: p.description, descriptionEn: '',
        status: p.status, designIds: p.ids.slice(),
        files: { refs: [], sketches: [], docs: [], others: [] },
        createdAt: daysAgo(p.created), updatedAt: daysAgo(p.updated)
      };
    });

    /* wire membership both ways */
    var byDesignId = {};
    designs.forEach(function (d) { byDesignId[d.id] = d; });
    collections.forEach(function (c) {
      c.designIds.forEach(function (did) {
        var d = byDesignId[did];
        if (d && d.collectionIds.indexOf(c.id) === -1) d.collectionIds.push(c.id);
      });
    });
    projects.forEach(function (p) {
      p.designIds.forEach(function (did) {
        var d = byDesignId[did];
        if (d && !d.projectId) d.projectId = p.id;
      });
    });

    /* ---- cloud space seed: folders + files (mixed types & sizes) ---- */
    var now = Date.now();
    var iso = function (days) { return new Date(now - days * 86400000).toISOString(); };
    var folders = [
      { id: 'fd1', workspaceId: 'ws1', parentFolderId: null, name: '产品摄影', createdAt: iso(90), updatedAt: iso(2), deletedAt: null },
      { id: 'fd2', workspaceId: 'ws1', parentFolderId: 'fd1', name: '2026 春夏', createdAt: iso(80), updatedAt: iso(1), deletedAt: null },
      { id: 'fd3', workspaceId: 'ws1', parentFolderId: 'fd1', name: '细节与佩戴', createdAt: iso(70), updatedAt: iso(6), deletedAt: null },
      { id: 'fd4', workspaceId: 'ws1', parentFolderId: null, name: '设计源文件', createdAt: iso(120), updatedAt: iso(4), deletedAt: null },
      { id: 'fd5', workspaceId: 'ws1', parentFolderId: null, name: '品牌素材', createdAt: iso(150), updatedAt: iso(9), deletedAt: null },
      { id: 'fd6', workspaceId: 'ws1', parentFolderId: 'fd5', name: 'Logo 与印刷', createdAt: iso(140), updatedAt: iso(11), deletedAt: null },
      { id: 'fd7', workspaceId: 'ws1', parentFolderId: null, name: '客户交付', createdAt: iso(60), updatedAt: iso(3), deletedAt: null },
      { id: 'fd8', workspaceId: 'ws1', parentFolderId: null, name: '2026 春夏产品图 · 已修图 · 高分辨率交付版本（勿删）', createdAt: iso(30), updatedAt: iso(30), deletedAt: null }
    ];

    function mkFile(id, folderId, name, kind, size, cover, days, note) {
      return {
        id: 'fl' + id, workspaceId: 'ws1', folderId: folderId,
        name: name, originalName: name, mimeType: '', size: size,
        storageKey: cover ? 'seed:' + cover : null, thumbnailKey: cover ? 'seed:' + cover : null,
        kind: kind, dataUrl: cover, hasContent: !!cover, note: note || 'seed',
        source: 'seed', designIds: [],
        createdAt: iso(days), updatedAt: iso(days), deletedAt: null, lastAccessedAt: iso(Math.max(0, days - 2))
      };
    }

    var files = [
      mkFile(1, 'fd2', 'ring-emerald-gold.jpg', 'image', 118000, 'assets/img/jw/ring-emerald-gold.jpg', 2),
      mkFile(2, 'fd2', 'pendant-pearl-rose.jpg', 'image', 96000, 'assets/img/jw/pendant-pearl-rose.jpg', 2),
      mkFile(3, 'fd2', 'necklace-pearl.jpg', 'image', 121000, 'assets/img/jw/necklace-pearl.jpg', 3),
      mkFile(4, 'fd2', 'earring-pearl-gold.jpg', 'image', 88000, 'assets/img/jw/earring-pearl-gold.jpg', 4),
      mkFile(5, 'fd3', 'bracelet-gem.jpg', 'image', 134000, 'assets/img/jw/bracelet-gem.jpg', 6),
      mkFile(6, 'fd3', 'brooch-leaf.jpg', 'image', 76000, 'assets/img/jw/brooch-leaf.jpg', 7),
      /* a file whose body was never stored — the UI must not show a broken image */
      mkFile(7, 'fd3', 'missing-preview-shot.jpg', 'image', 210000, null, 8, 'content-not-stored'),
      mkFile(8, 'fd4', 'ring-emerald-gold-v3.ai', 'design', 48200000, null, 4, 'content-not-stored'),
      mkFile(9, 'fd4', 'necklace-bead.psd', 'design', 91300000, null, 5, 'content-not-stored'),
      mkFile(10, 'fd4', 'product-line-2026.3dm', 'design', 15600000, null, 9, 'content-not-stored'),
      mkFile(11, 'fd5', 'brand-guideline-2026.pdf', 'pdf', 8400000, null, 11, 'content-not-stored'),
      mkFile(12, 'fd6', 'logo-primary.svg', 'image', 4200, 'assets/img/jw/ring-wide-band.jpg', 11),
      mkFile(13, 'fd6', 'spec-sheet-fonts.docx', 'doc', 184000, null, 12, 'content-not-stored'),
      mkFile(14, 'fd7', 'commission-024-quote.pdf', 'pdf', 96000, null, 3, 'content-not-stored'),
      mkFile(15, 'fd7', 'delivery-2026-03.zip', 'archive', 268000000, null, 3, 'content-not-stored'),
      mkFile(16, null, 'empty-placeholder.txt', 'doc', 0, null, 15, 'content-not-stored'),
      mkFile(17, null, '客户反馈汇总-关于主石尺寸与戒臂宽度调整的第二轮意见-2026-03-18.docx', 'doc', 264000, null, 5, 'content-not-stored'),
      mkFile(18, null, '产品摄影', 'other', 1200, null, 18, 'content-not-stored'),
      mkFile(19, 'fd8', 'SS26-lookbook-press.jpg', 'image', 320000, 'assets/img/jw/set-pair-gold.jpg', 30),
      /* three extra aspect ratios so cover/crop behaviour can be tested */
      mkFile(20, 'fd2', 'SS26-横幅裁切-16x9.jpg', 'image', 210000, 'assets/img/test-wide-169.jpg', 6),
      mkFile(21, 'fd2', 'SS26-竖版长图-2x5.jpg', 'image', 168000, 'assets/img/test-tall-25.jpg', 6),
      mkFile(22, 'fd8', 'SS26-方图裁切-4x3.jpg', 'image', 152000, 'assets/img/test-43.jpg', 5)
    ];

    /* ---- phase 8: version files ----
       A version references files by id; the bytes live once in the cloud space.
       Only the first ten assets get archived version files — older work simply
       has no stored source material, which is the honest state. */
    var VER_POOL = [
      'ring-emerald-gold.jpg', 'ring-diamond-platinum.jpg', 'ring-pearl-rose.jpg',
      'ring-sapphire-cluster.jpg', 'ring-sculpted-brass.jpg', 'ring-wide-band.jpg',
      'pendant-moonstone-gold.jpg', 'pendant-onyx.jpg', 'pendant-pearl-rose.jpg',
      'pendant-sapphire-silver.jpg', 'earring-pearl-gold.jpg', 'earring-moonstone.jpg',
      'earring-ruby-drop.jpg', 'earring-hoop.jpg', 'necklace-gold-chain.jpg',
      'necklace-pearl.jpg', 'necklace-layered.jpg', 'bracelet-cuff.jpg',
      'bracelet-gem.jpg', 'bracelet-gold.jpg', 'bracelet-link.jpg',
      'brooch-floral.jpg', 'brooch-geometric.jpg', 'brooch-leaf.jpg',
      'set-bridal.jpg', 'set-pair-gold.jpg', 'set-rose-duo.jpg'
    ];
    var vfId = 40;
    /* the first dozen assets (by id) carry archived version files — enough to
       compare, while older work honestly shows "no files" */
    var withFiles = designs.filter(function (d) {
      return parseInt(String(d.id).replace('d', ''), 10) <= 12;
    });
    withFiles.forEach(function (d, di) {
      d.versions.forEach(function (v, vi) {
        var src = VER_POOL[(di * 7 + vi * 5) % VER_POOL.length];
        var f = mkFile(vfId, 'fd2',
          d.name + ' · V' + v.versionNumber + ' · 主图.jpg', 'image',
          92000 + ((di * 13 + vi * 7) % 60) * 1000,
          'assets/img/jw/' + src, 10 + vi, 'version');
        f.source = 'version';
        files.push(f);
        v.fileIds.push(f.id);
        vfId++;

        /* a second view on the first and last version — different aspect ratio,
           which is exactly what the comparison view has to cope with */
        if (vi === 0 || vi === d.versions.length - 1) {
          var src2 = VER_POOL[(di * 7 + vi * 5 + 11) % VER_POOL.length];
          var f2 = mkFile(vfId, 'fd3',
            d.name + ' · V' + v.versionNumber + ' · 细节.jpg', 'image',
            78000 + ((di * 5 + vi * 3) % 40) * 1000,
            'assets/img/jw/' + src2, 10 + vi, 'version');
          f2.source = 'version';
          files.push(f2);
          v.fileIds.push(f2.id);
          vfId++;
        }
        /* source file for the latest version only, metadata only */
        if (vi === d.versions.length - 1) {
          var f3 = mkFile(vfId, 'fd4',
            d.name + ' · V' + v.versionNumber + '.ai', 'design',
            38000000 + (di * 1240000), null, 10, 'content-not-stored');
          f3.source = 'version';
          files.push(f3);
          v.fileIds.push(f3.id);
          vfId++;
        }
      });
    });

    /* ---- phase 8: change log (no invented operator identity) ---- */
    var versionEvents = [];
    var evId = 1;
    designs.forEach(function (d) {
      d.versions.forEach(function (v) {
        versionEvents.push({
          id: 've' + (evId++), workspaceId: 'ws1', designAssetId: d.id,
          versionId: v.id, eventType: 'created',
          versionNumber: v.versionNumber, versionName: v.name,
          detail: '', createdAt: v.createdAt
        });
      });
    });

    /* ---- phase 10: the primary workspace gets a real identity ----
       Phases 3–4 shipped, but only Workspace B carried a brand, so the demo
       workspace was an empty state everywhere. These records are seed data:
       every reference points at the assets created above, nothing is copied. */
    var markSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
      '<rect width="120" height="120" fill="#F6F4EF"/>' +
      '<g fill="none" stroke="#1D1B18" stroke-width="3">' +
      '<circle cx="60" cy="60" r="40"/><path d="M60 20v80"/></g>' +
      '<circle cx="60" cy="60" r="7" fill="#A98A5B"/></svg>');

    var brand = {
      id: 'brand-a', workspaceId: 'ws1',
      name: '德得珠宝', englishName: 'DEDE JEWELRY',
      tagline: '把一件首饰，做成可以传下去的东西。',
      description: '德得珠宝是一家位于广州的珠宝镶嵌工厂，为设计师与私人客户完成从起版、镶嵌到抛光交付的全流程。我们相信好的首饰不靠堆料，而靠比例、收边与佩戴时的那一点重量感。',
      positioning: '婚嫁与日常高级珠宝 · 工厂直制',
      location: '广州', foundedYear: '1998',
      keywords: ['克制', '手工打磨', '东方', '可传家', '轻量', '哑光'],
      logo: markSvg, logoReverse: null, logoMark: markSvg,
      colors: [
        { id: 'bca1', name: '纸白', nameEn: 'Paper', hex: '#F6F4EF', type: 'background' },
        { id: 'bca2', name: '墨', nameEn: 'Ink', hex: '#1D1B18', type: 'text' },
        { id: 'bca3', name: '旧金', nameEn: 'Aged Gold', hex: '#A98A5B', type: 'primary' },
        { id: 'bca4', name: '亚麻', nameEn: 'Linen', hex: '#E4E1D8', type: 'secondary' },
        { id: 'bca5', name: '石', nameEn: 'Stone', hex: '#8C8880', type: 'accent' }
      ],
      fonts: { heading: 'Cormorant Garamond', body: 'Inter', accent: 'Inter' },
      brandAssets: [
        { id: 'baa1', name: 'DEDE-logo-mark.svg', kind: 'image', size: 2400, type: 'image/svg+xml',
          dataUrl: markSvg, createdAt: daysAgo(120) },
        { id: 'baa2', name: 'brand-guideline-2026.pdf', kind: 'pdf', size: 8400000, type: 'application/pdf',
          dataUrl: null, createdAt: daysAgo(90) }
      ],
      featuredDesignIds: sample(6, 3),
      featuredCollectionIds: ['c1', 'c2', 'c4'],
      createdAt: daysAgo(200), updatedAt: daysAgo(1), deletedAt: null
    };

    var site = {
      id: 'web-a', workspaceId: 'ws1', name: '德得珠宝 · 官网',
      status: 'draft', slug: 'dede-jewelry', settings: {},
      sections: [
        { type: 'hero', order: 1, headline: '德得珠宝',
          intro: '为日常留下一件可以传下去的首饰。', designId: brand.featuredDesignIds[0] },
        { type: 'featured_works', order: 2, designIds: brand.featuredDesignIds.slice(0, 6) },
        { type: 'featured_collections', order: 3, collectionIds: ['c1', 'c2', 'c4'] },
        { type: 'about', order: 4 }
      ],
      createdAt: daysAgo(150), updatedAt: daysAgo(1), deletedAt: null
    };

    return {
      designs: designs, collections: collections, projects: projects,
      folders: folders,
      files: files,
      versionEvents: versionEvents,
      brand: brand,
      website: site,
      /* ---- phase 7 ---- */
      tags: tags,
      taxonomy: {
        type: dimOpts(TYPES),
        style: dimOpts(STYLES),
        metal: dimOpts(METALS),
        stone: dimOpts(STONES),
        status: dimOpts(DSTAT),
        theme: dimOpts(THEMES)
      }
    };
  }

  /* ==========================================================================
     Workspace B — deliberately different work, used to prove isolation.
     Ten assets, its own collections / projects / brand / site / files / tags.
     ========================================================================== */
  function seedB() {
    var age = function (n) { return new Date(Date.now() - n * 86400000).toISOString(); };
    var defs = [
      ['b1', '极光', 'Aurora', 'ring', 'platinum', 'diamond', 'minimal', 'light', 'final',
       '极细铂金边收口，主石抬高二点一毫米，光从侧面进入。', 'jw/ring-diamond-platinum.jpg', { fav: true, age: 18 }],
      ['b2', '潮汐', 'Tidal', 'pendant', 'silver', 'sapphire', 'natural', 'organic', 'final',
       '银质坠饰随角度改变明暗，链长可调。', 'jw/pendant-sapphire-silver.jpg', { age: 26 }],
      ['b3', '苔原', 'Tundra', 'earring', 'gold', 'moonstone', 'minimal', 'organic', 'review',
       '耳扣部分做到最简，全部重量落在下方石形。', 'jw/earring-moonstone.jpg', { age: 34 }],
      ['b4', '沙丘', 'Dune', 'necklace', 'gold', 'amber', 'sculptural', 'abstract', 'final',
       '链节错位排列，形成不连续的节奏。', 'jw/necklace-gold-chain.jpg', { age: 41 }],
      ['b5', '铁线', 'Iron Line', 'bracelet', 'brass', 'onyx', 'geometric', 'architecture', 'developing',
       '黄铜拉丝，开口可微调，接口藏在第三节。', 'jw/bracelet-cuff.jpg', { age: 12 }],
      ['b6', '折页', 'Fold', 'brooch', 'platinum', 'diamond', 'geometric', 'architecture', 'sample',
       '七片金属片铆接，可以微微开合。', 'jw/brooch-geometric.jpg', { age: 55 }],
      ['b7', '双生', 'Twin', 'ring', 'rose', 'ruby', 'vintage', 'floral', 'final',
       '两枚同源起版，宽窄不同，可作对戒。', 'jw/ring-pearl-rose.jpg', { age: 63, archived: true }],
      ['b8', '弧光', 'Arc Set', 'set', 'gold', 'emerald', 'sculptural', 'light', 'final',
       '对戒与吊坠同批材料制作，可整体交付。', 'jw/set-bridal.jpg', { age: 70 }],
      ['b9', '长夜', 'Long Night', 'necklace', 'silver', 'onyx', 'minimal', 'abstract', 'concept',
       '珠链逐颗挑选，直径差控制在零点四毫米内。', 'jw/necklace-statement.jpg', { age: 8 }],
      ['b10', '静物', 'Still', 'pendant', 'platinum', 'pearl', 'minimal', 'organic', 'final',
       '坠饰背面同样收边，反转佩戴也成立。', 'jw/pendant-pearl-rose.jpg', { age: 88 }]
    ];

    var designs = defs.map(function (d, i) {
      var no = i + 1;
      var versions = [];
      var count = (d[0] === 'b1') ? 5 : (no % 3 === 0 ? 2 : 3);
      var names = ['初始方案', '比例调整', '打样确认', '结构修改', '定稿'];
      var notes = ['草图与比例推敲', '3D 建模，调整石位', '打样完成，确认收边', '改戒臂结构', '最终确认稿'];
      for (var k = 0; k < count; k++) {
        versions.push({
          id: 'bdv' + d[0] + '-' + (k + 1), workspaceId: 'ws2', designAssetId: d[0],
          versionNumber: k + 1, name: names[k], notes: notes[k],
          status: k === count - 1 ? 'final' : (k === count - 2 ? 'review' : 'draft'),
          fileIds: [], createdAt: age(60 - k * 7 - i), updatedAt: age(60 - k * 7 - i),
          deletedAt: null
        });
      }
      return {
        id: d[0], workspaceId: 'ws2', name: d[1], nameEn: d[2],
        type: d[3], style: d[6], theme: d[7], metal: d[4], stone: d[5], status: d[8],
        year: 2025, cover: d[10], images: [d[10]],
        description: d[9], descriptionEn: '',
        materialNote: (METALS[d[4]] ? METALS[d[4]].zh : '') + ' · ' + (STONES[d[5]] ? STONES[d[5]].zh : ''),
        collectionIds: [], projectId: null, tagIds: [], fileIds: [],
        versions: versions, currentVersionId: versions[versions.length - 1].id,
        favorite: !!d[11].fav, archived: !!d[11].archived,
        createdAt: age(d[11].age), updatedAt: age(Math.max(1, d[11].age - 3))
      };
    });

    var byId = function (id) {
      for (var i = 0; i < designs.length; i++) if (designs[i].id === id) return designs[i];
      return null;
    };

    var tags = [
      ['btg1', '北欧', 'Nordic'], ['btg2', '银饰', 'Silver work'],
      ['btg3', '实验', 'Experimental'], ['btg4', '单件', 'One-off'],
      ['btg5', '待修改', 'Revision'], ['btg6', '礼品', 'Gifting']
    ].map(function (t, i) {
      return {
        id: t[0], workspaceId: 'ws2', name: t[1], nameEn: t[2],
        normalizedName: t[1].toLowerCase(),
        createdAt: age(120 - i * 5), updatedAt: age(120 - i * 5)
      };
    });

    var collections = [
      { id: 'bc1', name: '极光系列', nameEn: 'Aurora Series', cover: 'jw/ring-diamond-platinum.jpg',
        desc: '围绕冷光与细边展开的一组作品，以铂金和银为主。', ids: ['b1', 'b2', 'b3', 'b8'] },
      { id: 'bc2', name: '地质研究', nameEn: 'Geological Studies', cover: 'jw/brooch-geometric.jpg',
        desc: '把岩层与断面的结构移到金属上，仍在推进。', ids: ['b4', 'b5', 'b6', 'b9'] }
    ].map(function (c, i) {
      var ids = c.ids.slice();
      ids.forEach(function (id) { var d = byId(id); if (d) d.collectionIds.push(c.id); });
      return {
        id: c.id, workspaceId: 'ws2', name: c.name, nameEn: c.nameEn,
        description: c.desc, descriptionEn: '', cover: c.cover, status: i === 0 ? 'public' : 'draft',
        designIds: ids, sortOrder: ids.slice(), createdAt: age(100), updatedAt: age(6)
      };
    });

    var projects = [
      { id: 'bp1', name: '2026 北欧系列', nameEn: 'Nordic 2026', status: 'active',
        desc: '面向北欧市场的轻量化系列，重点解决佩戴舒适度。', ids: ['b1', 'b2', 'b3', 'b8', 'b10'], age: 80 },
      { id: 'bp2', name: '私人委托 041', nameEn: 'Commission 041', status: 'planning',
        desc: '客户委托的对戒与吊坠套装。', ids: ['b7'], age: 30 }
    ].map(function (p) {
      p.ids.forEach(function (id) {
        var d = byId(id);
        if (d && !d.projectId) d.projectId = p.id;
      });
      return {
        id: p.id, workspaceId: 'ws2', name: p.name, nameEn: p.nameEn,
        description: p.desc, descriptionEn: '', status: p.status,
        designIds: p.ids.slice(), files: { refs: [], sketches: [], docs: [], others: [] },
        createdAt: age(p.age), updatedAt: age(4)
      };
    });

    /* tags assignment */
    var tagMap = { b1: ['btg1', 'btg4'], b2: ['btg1', 'btg2'], b3: ['btg1', 'btg2'],
                   b4: ['btg3'], b5: ['btg3', 'btg5'], b6: ['btg3', 'btg4'],
                   b7: ['btg6'], b8: ['btg1', 'btg6'], b9: ['btg3', 'btg5'], b10: ['btg1'] };
    Object.keys(tagMap).forEach(function (id) {
      var d = byId(id);
      if (d) d.tagIds = tagMap[id].slice();
    });

    /* ---- files ---- */
    var files = [
      ['bfl1', 'bfd1', '极光 · V5 · 主图.jpg', 'jw/ring-diamond-platinum.jpg', 124000, 5],
      ['bfl2', 'bfd1', '潮汐 · V3 · 主图.jpg', 'jw/pendant-sapphire-silver.jpg', 98000, 12],
      ['bfl3', 'bfd1', '苔原 · V3 · 细节.jpg', 'jw/earring-moonstone.jpg', 76000, 20],
      ['bfl4', 'bfd2', '委托 041 · 报价.pdf', null, 88000, 3]
    ].map(function (f) {
      return {
        id: f[0], workspaceId: 'ws2', folderId: f[1], name: f[2],
        originalName: f[2], mimeType: '', size: f[4],
        storageKey: f[3] ? 'seed:' + f[3] : null, thumbnailKey: f[3] ? 'seed:' + f[3] : null,
        kind: f[3] ? 'image' : 'pdf', dataUrl: f[3] ? 'assets/img/' + f[3] : null,
        hasContent: !!f[3], note: 'seed', source: 'seed', designIds: [],
        createdAt: age(f[5]), updatedAt: age(f[5]), deletedAt: null, lastAccessedAt: age(f[5])
      };
    });
    /* pin the image files to the matching versions */
    var v1 = byId('b1').versions;
    var v2 = byId('b2').versions;
    var v3 = byId('b3').versions;
    v1[0].fileIds = ['bfl1'];
    v1[v1.length - 1].fileIds = ['bfl1'];
    v2[0].fileIds = ['bfl2'];
    v3[0].fileIds = ['bfl3'];

    var folders = [
      { id: 'bfd1', workspaceId: 'ws2', parentFolderId: null, name: '北欧系列', createdAt: age(90), updatedAt: age(2), deletedAt: null },
      { id: 'bfd2', workspaceId: 'ws2', parentFolderId: null, name: '客户交付', createdAt: age(60), updatedAt: age(3), deletedAt: null }
    ];

    var brand = {
      id: 'brand-b', workspaceId: 'ws2',
      name: 'Studio B', englishName: 'STUDIO B',
      tagline: 'Less, but precise.',
      description: '位于哥本哈根的独立首饰工作室，以冷光、细边与轻量结构为主。',
      positioning: '面向北欧市场的轻量化首饰',
      location: '哥本哈根 · 丹麦', foundedYear: '2021',
      keywords: ['克制', '几何', '冷光'],
      logo: null, logoReverse: null, logoMark: null,
      colors: [
        { id: 'bb-c1', name: '深海', nameEn: 'Deep Sea', hex: '#1F2A2E', type: 'primary' },
        { id: 'bb-c2', name: '雾灰', nameEn: 'Mist', hex: '#8A9497', type: 'secondary' },
        { id: 'bb-c3', name: '纸白', nameEn: 'Paper', hex: '#F4F2ED', type: 'background' },
        { id: 'bb-c4', name: '炭', nameEn: 'Charcoal', hex: '#191817', type: 'text' },
        { id: 'bb-c5', name: '黄铜', nameEn: 'Brass', hex: '#A8894F', type: 'accent' }
      ],
      fonts: { heading: 'Cormorant Garamond', body: 'Inter', accent: 'Inter' },
      brandAssets: [], featuredDesignIds: ['b1', 'b2', 'b3'], featuredCollectionIds: ['bc1'],
      createdAt: age(200), updatedAt: age(9), deletedAt: null
    };

    var website = {
      id: 'web-b', workspaceId: 'ws2', name: 'Studio B 官网', status: 'published',
      slug: 'studio-b', settings: {},
      sections: [
        { type: 'hero', order: 1, headline: 'Cold light, precise edges.', intro: '', designId: 'b1' },
        { type: 'featured_works', order: 2, designIds: ['b1', 'b2', 'b3', 'b8'] },
        { type: 'featured_collections', order: 3, collectionIds: ['bc1', 'bc2'] },
        { type: 'about', order: 4 }
      ],
      createdAt: age(150), updatedAt: age(5), deletedAt: null
    };

    var versionEvents = [];
    var evId = 1;
    designs.forEach(function (d) {
      d.versions.forEach(function (v) {
        versionEvents.push({
          id: 'bve' + (evId++), workspaceId: 'ws2', designAssetId: d.id,
          versionId: v.id, eventType: 'created', versionNumber: v.versionNumber,
          versionName: v.name, detail: '', createdAt: v.createdAt
        });
      });
    });

    return {
      designs: designs, collections: collections, projects: projects,
      folders: folders, files: files, tags: tags, versionEvents: versionEvents,
      brand: brand, website: website
    };
  }

  /* ==========================================================================
     seed() — both workspaces + deliberately awkward sample data
     ========================================================================== */
  function seed() {
    var a = seedA();
    var b = seedB();
    var iso = function (n) { return new Date(Date.now() - n * 86400000).toISOString(); };

    /* --- sample assets that exist to break layouts --- */
    var longName = '这是一个非常非常长的设计名称，用来测试设计卡片和详情页面在极端文本情况下是否能够保持正常布局';
    a.designs.push({
      id: 'd-long', workspaceId: 'ws1', name: longName, nameEn: 'Extremely long design name used to stress the layout',
      type: 'ring', style: 'minimal', theme: 'light', metal: 'gold', stone: 'topaz',
      status: 'final', year: 2025, cover: 'jw/ring-wide-band.jpg', images: ['jw/ring-wide-band.jpg'],
      description: '用于测试超长标题在网格卡片、列表行与详情页中的换行与截断表现。',
      descriptionEn: '', materialNote: '18K 黄金 · 托帕石',
      collectionIds: [], projectId: null, tagIds: ['tg1', 'tg7'], fileIds: [],
      versions: [
        { id: 'dvd-long-1', workspaceId: 'ws1', designAssetId: 'd-long', versionNumber: 1,
          name: '初始方案', notes: '仅为版式测试保留', status: 'final',
          fileIds: [], createdAt: iso(30), updatedAt: iso(30), deletedAt: null }
      ],
      currentVersionId: 'dvd-long-1',
      favorite: false, archived: false, createdAt: iso(30), updatedAt: iso(2)
    });

    /* one piece carries the English name used in the QA script and in the
       search example — a real name, not a hidden fixture */
    var aurora = a.designs.filter(function (d) { return d.name === '光年'; })[0];
    if (aurora) { aurora.name = '极光'; aurora.nameEn = 'Aurora'; }

    /* --- one asset with five versions --- */
    var d5 = a.designs.filter(function (d) { return d.id === 'd5'; })[0];
    if (d5) {
      ['结构修改', '定稿'].forEach(function (nm, i) {
        d5.versions.push({
          id: 'dvd5-' + (4 + i), workspaceId: 'ws1', designAssetId: 'd5',
          versionNumber: 4 + i, name: nm,
          notes: i === 0 ? '改戒臂结构与收边角度' : '最终确认稿，交付工厂',
          status: 'final', fileIds: [], createdAt: iso(20 - i * 4), updatedAt: iso(20 - i * 4),
          deletedAt: null
        });
      });
      d5.currentVersionId = d5.versions[d5.versions.length - 1].id;
    }

    /* --- one asset with many tags --- */
    var d1 = a.designs.filter(function (d) { return d.id === 'd1'; })[0];
    if (d1) d1.tagIds = ['tg1', 'tg2', 'tg5', 'tg6', 'tg11', 'tg19'];

    /* --- recycle-bin samples (soft-deleted on purpose) --- */
    a.designs.push({
      id: 'd-trash1', workspaceId: 'ws1', name: '停用的试验戒指', nameEn: 'Retired试验 Ring',
      type: 'ring', style: 'geometric', theme: 'abstract', metal: 'brass', stone: 'onyx',
      status: 'concept', year: 2023, cover: 'jw/ring-sculpted-brass.jpg', images: ['jw/ring-sculpted-brass.jpg'],
      description: '方向已放弃，保留作参考。', descriptionEn: '', materialNote: '黄铜 · 缟玛瑙',
      collectionIds: [], projectId: null, tagIds: ['tg18'], fileIds: [],
      versions: [{ id: 'dvd-trash1-1', workspaceId: 'ws1', designAssetId: 'd-trash1', versionNumber: 1,
        name: '初始方案', notes: '未继续', status: 'draft', fileIds: [],
        createdAt: iso(200), updatedAt: iso(200), deletedAt: null }],
      currentVersionId: 'dvd-trash1-1', favorite: false, archived: false,
      createdAt: iso(200), updatedAt: iso(198), deletedAt: iso(2)
    });
    a.designs.push({
      id: 'd-trash2', workspaceId: 'ws1', name: '重复拍摄的样片', nameEn: 'Duplicate sample',
      type: 'pendant', style: 'minimal', theme: 'organic', metal: 'silver', stone: 'pearl',
      status: 'sample', year: 2024, cover: null, images: [],
      description: '与另一件作品重复，等待清理。', descriptionEn: '', materialNote: '银 · 珍珠',
      collectionIds: [], projectId: null, tagIds: [], fileIds: [],
      versions: [{ id: 'dvd-trash2-1', workspaceId: 'ws1', designAssetId: 'd-trash2', versionNumber: 1,
        name: '初始方案', notes: '', status: 'draft', fileIds: [],
        createdAt: iso(150), updatedAt: iso(150), deletedAt: null }],
      currentVersionId: 'dvd-trash2-1', favorite: false, archived: false,
      createdAt: iso(150), updatedAt: iso(149), deletedAt: iso(1)
    });
    a.collections.push({
      id: 'c-trash', workspaceId: 'ws1', name: '旧系列 · 待清理', nameEn: 'Old series',
      description: '已合并到其他合集，保留在回收站。', descriptionEn: '',
      cover: null, status: 'draft', designIds: [], sortOrder: [],
      createdAt: iso(400), updatedAt: iso(40), deletedAt: iso(40)
    });
    b.designs.push({
      id: 'b-trash1', workspaceId: 'ws2', name: '取消的委托', nameEn: 'Cancelled commission',
      type: 'ring', style: 'minimal', theme: 'light', metal: 'gold', stone: 'ruby',
      status: 'concept', year: 2024, cover: null, images: [],
      description: '客户取消，留档。', descriptionEn: '', materialNote: '黄金 · 红宝石',
      collectionIds: [], projectId: null, tagIds: [], fileIds: [],
      versions: [{ id: 'bdv-b-trash1-1', workspaceId: 'ws2', designAssetId: 'b-trash1', versionNumber: 1,
        name: '初始方案', notes: '', status: 'draft', fileIds: [],
        createdAt: iso(120), updatedAt: iso(120), deletedAt: null }],
      currentVersionId: 'bdv-b-trash1-1', favorite: false, archived: false,
      createdAt: iso(120), updatedAt: iso(119), deletedAt: iso(3)
    });

    return {
      workspaces: [
        { id: 'ws1', name: 'Studio A', kind: 'test' },
        { id: 'ws2', name: 'Studio B', kind: 'test' }
      ],
      activeWorkspaceId: 'ws1',
      designs: a.designs.concat(b.designs),
      collections: a.collections.concat(b.collections),
      projects: a.projects.concat(b.projects),
      brands: [a.brand, b.brand],
      websites: [a.website, b.website],
      folders: a.folders.concat(b.folders),
      files: a.files.concat(b.files),
      tags: a.tags.concat(b.tags),
      taxonomy: a.taxonomy,
      versionEvents: a.versionEvents.concat(b.versionEvents)
    };
  }

  /* ======================================================================
     Persistence — Phase 11
     The browser is no longer the source of truth: it holds a mirror of the
     server's workspace state. Every write path still ends with save(), which
     now commits to the server; if the server refuses (plan limit, lost
     session) the mirror is rolled back to what the server actually stores.
     Reads stay synchronous, so the 16 pages keep working unchanged.
     ====================================================================== */
  var LEGACY_KEY = 'studio-data-v7';     /* phases 1–10 kept data in the browser */
  var Api = window.StudioApi;
  /* an empty shell rather than null: any read that happens before boot()
     resolves gets "nothing here", never a crash */
  var state = normalize({});
  var session = null;                    /* { user, workspaces, activeWorkspaceId, plan } */
  var lastGood = '';
  var channel = null;
  try { channel = ('BroadcastChannel' in window) ? new BroadcastChannel('studio-data') : null; } catch (e) { channel = null; }

  function normalize(s) {
    s = s || {};
    ['designs', 'collections', 'projects', 'brands', 'websites', 'folders', 'files', 'tags', 'versionEvents']
      .forEach(function (k) { if (!Array.isArray(s[k])) s[k] = []; });
    s.designs.forEach(function (d) {
      if (!d.fileIds) d.fileIds = [];
      if (!d.tagIds) d.tagIds = [];
      if (!Array.isArray(d.versions)) d.versions = [];
      if (!Array.isArray(d.collectionIds)) d.collectionIds = [];
      if (d.deletedAt === undefined) d.deletedAt = null;
      if (d.style === undefined) d.style = null;
      if (d.theme === undefined) d.theme = null;
    });
    if (!s.taxonomy) s.taxonomy = defaultTaxonomy();
    return s;
  }
  function serialize() { return JSON.stringify(state); }

  function applyState(s, taxonomy, plan) {
    state = normalize(s || (state || {}));
    if (taxonomy) state.taxonomy = taxonomy;
    if (plan && session) session.plan = plan;
    lastGood = serialize();
  }
  function applyPayload(d) {
    session = d;
    applyState(d.state, d.taxonomy, d.plan);
  }

  function surface(message, code) {
    document.dispatchEvent(new CustomEvent('studio:error', {
      detail: { message: message, code: code }
    }));
  }
  function broadcast() {
    try { if (channel) channel.postMessage({ type: 'changed' }); } catch (e) {}
    document.dispatchEvent(new CustomEvent('studio:data'));
  }

  /* pull the session + the active workspace's data */
  function boot() {
    if (!Api) { surface('数据层未加载', 'NO_API'); return Promise.reject(new Error('NO_API')); }
    return Api.me().then(function (d) { applyPayload(d); return d; });
  }

  /* commit the mirror; roll back when the server says no.
     Saves are serialised: two writes in quick succession must not let the
     older response overwrite the newer local state. */
  var saveChain = Promise.resolve();
  var saveSeq = 0;
  var dirty = false;
  function save() {
    if (!state || !Api) return true;
    var seq = ++saveSeq;
    var payload = serialize();
    dirty = true;
    saveChain = saveChain.then(function () {
      return Api.sync(JSON.parse(payload)).then(function (res) {
        if (seq === saveSeq) dirty = false;
        if (seq !== saveSeq) return true;      /* a newer write already landed */
        if (res && res.state) applyState(res.state, res.taxonomy, res.plan);
        broadcast();
        if (res && res.errors && res.errors.length) {
          surface(res.errors[0].message || res.errors[0].code, res.errors[0].code);
        }
        return true;
      }).catch(function (e) {
        if (seq === saveSeq && lastGood) {
          try { state = JSON.parse(lastGood); } catch (e2) {}
        }
        broadcast();
        surface(e && e.message ? e.message : '保存失败', e && e.code);
        return false;
      });
    });
    save.pending = saveChain;
    return true;
  }

  /* Best-effort last write when the page goes away. Deliberately not a
     synchronous XHR: blocking the main thread on a large payload would stall
     the very navigation the user asked for. Link clicks are already covered
     by the write-safety handler in app.js; this only catches tab close. */
  function flushOnExit() {
    if (!dirty || !state || !Api) return;
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/sync',
          new Blob([JSON.stringify({ state: state })], { type: 'application/json' }));
        dirty = false;
      }
    } catch (e) {}
  }
  window.addEventListener('beforeunload', flushOnExit);
  window.addEventListener('pagehide', flushOnExit);

  /* ---------- plan / usage / entitlement (mirror of the server rules) ---------- */
  function planInfo() { return (session && session.plan) || null; }
  function limits() { var p = planInfo(); return p ? p.limits : null; }
  function usageInfo() { var p = planInfo(); return p ? p.usage : null; }
  function storageUsed() { var u = usageInfo(); return u ? u.storageBytes || 0 : 0; }
  function designCount() {
    return state ? state.designs.filter(function (d) { return !d.deletedAt; }).length : 0;
  }
  /* the same rules the server applies — used to disable a button before the
     user clicks it. The server still decides; this is only the experience. */
  function can(action, ctx) {
    var lim = limits();
    if (!lim) return { ok: true };
    ctx = ctx || {};
    if (action === 'design.create' && designCount() >= lim.designs) {
      return { ok: false, code: 'PLAN_LIMIT_DESIGNS', message: '已达到当前套餐的设计数量上限', limit: lim.designs };
    }
    if (action === 'file.create' && (storageUsed() + (ctx.bytes || 0)) > lim.storageBytes) {
      return { ok: false, code: 'PLAN_LIMIT_STORAGE', message: '存储空间已达当前套餐上限', limit: lim.storageBytes };
    }
    if (action === 'version.create' && (ctx.count || 0) >= lim.versionsPerDesign) {
      return { ok: false, code: 'PLAN_LIMIT_VERSIONS', message: '版本数已达当前套餐上限', limit: lim.versionsPerDesign };
    }
    if (action === 'workspace.create' && session && session.workspaces.length >= lim.workspaces) {
      return { ok: false, code: 'PLAN_LIMIT_WORKSPACES', message: '工作区数量已达当前套餐上限', limit: lim.workspaces };
    }
    if (action === 'website.edit' && lim.website === false) {
      return { ok: false, code: 'PLAN_WEBSITE_LOCKED', message: '当前套餐未开放网站模块' };
    }
    return { ok: true };
  }

  /* phases 1–10 left data in this browser; offer to carry it over once */
  function legacyState() {
    try {
      var raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return s && Array.isArray(s.designs) ? s : null;
    } catch (e) { return null; }
  }

  function dimOpts(map) {
    return Object.keys(map).map(function (k) {
      return { key: k, zh: map[k].zh, en: map[k].en };
    });
  }
  function defaultTaxonomy() {
    return {
      type: dimOpts(TYPES), style: dimOpts(STYLES), metal: dimOpts(METALS),
      stone: dimOpts(STONES), status: dimOpts(DSTAT), theme: dimOpts(THEMES)
    };
  }

  /* ---- phase 7 helpers: tag vocabulary ---- */
  function normTag(name) {
    return String(name == null ? '' : name).trim().replace(/\s+/g, ' ').toLowerCase();
  }
  function tagById(id) {
    for (var i = 0; i < state.tags.length; i++) if (state.tags[i].id === id) return state.tags[i];
    return null;
  }
  function findByNorm(norm, exceptId) {
    for (var i = 0; i < state.tags.length; i++) {
      var t = state.tags[i];
      if (t.normalizedName === norm && t.id !== exceptId && own(t)) return t;
    }
    return null;
  }
  /* ---- completeness: four explicit checks, no invented score ----
     name       — present and not a placeholder
     description— at least 10 characters of real text
     tags       — at least one tag
     taxonomy   — both style and theme set (the two optional dimensions) */
  function completenessOf(d) {
    var missing = [];
    var name = String(d.name || '').trim();
    if (name.length < 2 || name === '未命名' || name === 'Untitled') missing.push('name');
    if (String(d.description || '').trim().length < 10) missing.push('description');
    if (!(d.tagIds || []).length) missing.push('tags');
    if (!d.style || !d.theme) missing.push('taxonomy');
    return {
      missing: missing,
      level: missing.length === 0 ? 'complete' : (missing.length === 1 ? missing[0] : 'needs')
    };
  }

  function taxOpts(dim) {
    var arr = (state.taxonomy && state.taxonomy[dim]) || [];
    return arr.slice();
  }
  function taxOpt(dim, key) {
    var arr = taxOpts(dim);
    for (var i = 0; i < arr.length; i++) if (arr[i].key === key) return arr[i];
    return null;
  }
  function taxLabel(dim, key, lang) {
    var o = taxOpt(dim, key);
    if (o) return lang === 'en' ? (o.en || o.zh) : o.zh;
    /* fall back to the built-in dictionaries for legacy values */
    var m = { type: TYPES, metal: METALS, stone: STONES, status: DSTAT, style: STYLES, theme: THEMES }[dim];
    var x = m && m[key];
    return x ? (lang === 'en' ? x.en : x.zh) : (key || '');
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 8);
  }

  function touchColl(c) { c.updatedAt = new Date().toISOString(); }

  /* Phase 11: nothing is read from the browser at import time any more — the
     app calls boot() once the session is known (see app.js). */

  function siteSection(type) {
    var w = activeWebsite();
    if (!w) return null;
    for (var i = 0; i < w.sections.length; i++) if (w.sections[i].type === type) return w.sections[i];
    return null;
  }
  function touchWebsite() {
    var w = activeWebsite();
    if (w) w.updatedAt = new Date().toISOString();
    save();
  }
  function slugify(s) {
    var out = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
    return out || 'studio';
  }

  /* ---- workspace scoping ----
     Every business row carries workspaceId. `own()` is the single gate used by
     reads, writes and deletes, so switching the active workspace immediately
     hides every other workspace's rows. */
  function ws() {
    if (session && session.activeWorkspaceId) return session.activeWorkspaceId;
    if (session && session.workspaces && session.workspaces[0]) return session.workspaces[0].id;
    return '';
  }
  function own(row) { return !!row && row.workspaceId === ws(); }

  /* brand / website are singletons *per workspace* — stored as arrays so two
     workspaces can each have their own identity and site */
  function activeBrand() {
    var list = state.brands || [];
    for (var i = 0; i < list.length; i++) {
      if (own(list[i]) && !list[i].deletedAt) return list[i];
    }
    return null;
  }
  function dormantBrand() {
    var list = state.brands || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].workspaceId === ws() && list[i].deletedAt) return list[i];
    }
    return null;
  }
  function activeWebsite() {
    var list = state.websites || [];
    for (var i = 0; i < list.length; i++) {
      if (own(list[i]) && !list[i].deletedAt) return list[i];
    }
    return null;
  }
  function dormantWebsite() {
    var list = state.websites || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].workspaceId === ws() && list[i].deletedAt) return list[i];
    }
    return null;
  }
  function folderById(id) {
    for (var i = 0; i < state.folders.length; i++) if (state.folders[i].id === id) return state.folders[i];
    return null;
  }
  function fileById(id) {
    for (var i = 0; i < state.files.length; i++) if (state.files[i].id === id) return state.files[i];
    return null;
  }
  function childFolders(parentId) {
    return state.folders.filter(function (f) {
      return own(f) && !f.deletedAt && (f.parentFolderId || null) === (parentId || null);
    });
  }
  /* every folder id below `id`, any depth — used to block cyclic moves */
  function descendantFolderIds(id) {
    var out = [], stack = [id], guard = 0;
    while (stack.length && guard++ < 500) {
      var cur = stack.pop();
      state.folders.forEach(function (f) {
        if (f.parentFolderId === cur && out.indexOf(f.id) === -1) { out.push(f.id); stack.push(f.id); }
      });
    }
    return out;
  }
  function uniqueName(name, taken) {
    var base = String(name || '').trim();
    if (taken.indexOf(base) === -1) return base;
    var n = 2;
    while (taken.indexOf(base + ' ' + n) !== -1) n++;
    return base + ' ' + n;
  }

  window.StudioStore = {
    TYPES: TYPES, CSTAT: CSTAT, PSTAT: PSTAT, DSTAT: DSTAT, METALS: METALS, STONES: STONES,
    STYLES: STYLES, THEMES: THEMES, DIMENSIONS: DIMENSIONS,
    BCOLOR: BCOLOR, FONTS: FONTS, FILEKIND: FILEKIND,
    get state() { return state; },
    get workspace() {
      var list = (session && session.workspaces) || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === ws()) return list[i];
      return { id: ws(), name: 'Workspace' };
    },
    workspaces: function () { return ((session && session.workspaces) || []).slice(); },

    /* ---- session / account (Phase 11) ---- */
    ready: function () { return !!(session && session.user); },
    boot: function () { return boot(); },
    /* pull the current workspace state again — used by the site preview,
       which lives in its own document and cannot reuse the page mirror */
    /* resolve when the queued writes have reached the server */
    flush: function () { return save.pending || Promise.resolve(); },
    /* force a commit after a direct edit of the mirror (tests, repairs) */
    persist: function () { save(); return save.pending; },
    isDirty: function () { return dirty; },
    refresh: function () {
      return Api.state().then(function (res) {
        applyState(res.state, res.taxonomy, res.plan);
        return res;
      });
    },
    user: function () { return session ? session.user : null; },
    logout: function () {
      return Api.logout().then(function () { session = null; state = null; });
    },
    plan: function () { var p = planInfo(); return p ? p.plan : null; },
    planSummary: function () { return planInfo(); },
    usage: function () { return usageInfo(); },
    limits: function () { return limits(); },
    can: function (action, ctx) { return can(action, ctx); },
    overLimit: function () { var p = planInfo(); return !!(p && p.anyOverLimit); },
    subscription: function () {
      var list = (session && session.workspaces) || [];
      var w = null;
      for (var i = 0; i < list.length; i++) if (list[i].id === ws()) w = list[i];
      return w ? w.subscription : null;
    },
    devPlans: function () { return !!(session && session.devPlans); },

    /* ---- workspaces ---- */
    createWorkspace: function (data) {
      var pre = can('workspace.create');
      if (!pre.ok) return Promise.reject(Object.assign(new Error(pre.message), { code: pre.code }));
      return Api.createWorkspace(data || {}).then(function (res) {
        if (session) {
          session.activeWorkspaceId = res.workspace.id;
          session.workspaces = session.workspaces || [];
          session.workspaces.push(res.workspace);
        }
        applyState(res.state, res.taxonomy, res.plan);
        broadcast();
        return res.workspace;
      });
    },
    updateWorkspace: function (id, patch) {
      return Api.updateWorkspace(id, patch).then(function (res) {
        if (session && session.workspaces) {
          session.workspaces = session.workspaces.map(function (w) {
            return w.id === id ? res.workspace : w;
          });
        }
        return res.workspace;
      });
    },
    workspaceImpact: function (id) { return Api.workspaceImpact(id); },
    deleteWorkspace: function (id, confirmName) {
      return Api.deleteWorkspace(id, confirmName).then(function (res) {
        if (session) {
          session.workspaces = res.workspaces || [];
          session.activeWorkspaceId = res.activeWorkspaceId;
        }
        applyState(res.state, res.taxonomy, res.plan);
        broadcast();
        return res;
      });
    },
    plans: function () { return Api.plans(); },
    changePlan: function (planId) { return Api.changePlan(planId); },
    refreshPlan: function () {
      return Api.usage().then(function (res) {
        if (session) session.plan = res;
        return res;
      });
    },

    /* data left in this browser by phases 1–10 */
    legacyState: function () { return legacyState(); },
    importLegacy: function (workspaceId) {
      var legacy = legacyState();
      if (!legacy) return Promise.resolve({ imported: 0 });
      return Api.importLocal(legacy, workspaceId || ws()).then(function (res) {
        applyState(res.state, res.taxonomy, res.plan);
        broadcast();
        return res;
      });
    },
    clearLegacy: function () {
      try { localStorage.removeItem(LEGACY_KEY); } catch (e) {}
    },

    /* every by-id read is workspace-gated: knowing another workspace's id is
       not enough to see the row, and soft-deleted rows stay out of normal
       navigation (they are only visible through trashAll) */
    /* list helpers — the only supported way for pages to enumerate rows */
    collections: function () {
      return state.collections.filter(function (c) { return own(c) && !c.deletedAt; });
    },
    projects: function () {
      return state.projects.filter(function (p) { return own(p) && !p.deletedAt; });
    },

    design: function (id) {
      var d = byId(state.designs, id);
      return (own(d) && !d.deletedAt) ? d : null;
    },
    collection: function (id) {
      var c = byId(state.collections, id);
      return (own(c) && !c.deletedAt) ? c : null;
    },
    project: function (id) {
      var p = byId(state.projects, id);
      return (own(p) && !p.deletedAt) ? p : null;
    },

    designsByCollection: function (cid) {
      var c = byId(state.collections, cid);
      if (!own(c) || c.deletedAt) return [];
      var ordered = c.sortOrder && c.sortOrder.length ? c.sortOrder : c.designIds;
      return ordered.map(function (id) { return byId(state.designs, id); })
        .filter(function (d) { return !!d && own(d) && !d.deletedAt; });
    },
    designsByProject: function (pid) {
      var p = byId(state.projects, pid);
      if (!own(p) || p.deletedAt) return [];
      return p.designIds.map(function (id) { return byId(state.designs, id); })
        .filter(function (d) { return !!d && own(d) && !d.deletedAt; });
    },
    collectionsOfDesign: function (did) {
      return state.collections.filter(function (c) {
        return own(c) && !c.deletedAt && c.designIds.indexOf(did) !== -1;
      });
    },
    notInCollection: function (cid) {
      return state.designs.filter(function (d) {
        return own(d) && !d.deletedAt && d.collectionIds.indexOf(cid) === -1;
      });
    },
    notInProject: function (pid) {
      return state.designs.filter(function (d) {
        return own(d) && !d.deletedAt && d.projectId !== pid;
      });
    },

    /* Library query: every dimension is AND-ed; within one dimension the value
       is a single choice. Text search looks at name / nameEn / description. */
    filterDesigns: function (opts) {
      opts = opts || {};
      var q = opts.q ? String(opts.q).trim().toLowerCase() : '';
      var list = state.designs.filter(function (d) {
        if (!own(d)) return false;
        if (d.deletedAt && !opts.includeDeleted) return false;
        if (opts.archived === true) {
          if (!d.archived) return false;
        } else if (d.archived) {
          return false;
        }
        if (opts.favorite && !d.favorite) return false;
        if (opts.type && opts.type !== 'all' && d.type !== opts.type) return false;
        if (opts.metal && d.metal !== opts.metal) return false;
        if (opts.stone && d.stone !== opts.stone) return false;
        if (opts.status && d.status !== opts.status) return false;
        if (opts.style && d.style !== opts.style) return false;
        if (opts.theme && d.theme !== opts.theme) return false;
        if (opts.tagId && (d.tagIds || []).indexOf(opts.tagId) === -1) return false;
        if (opts.untagged && (d.tagIds || []).length) return false;
        if (opts.collectionId && (d.collectionIds || []).indexOf(opts.collectionId) === -1) return false;
        if (opts.projectId && d.projectId !== opts.projectId) return false;
        if (opts.sinceDays) {
          var t = new Date(d.updatedAt || d.createdAt).getTime();
          if (Date.now() - t > opts.sinceDays * 86400000) return false;
        }
        /* completeness filter: 'missing' = anything incomplete,
           or a specific gap key ('tags' | 'description' | 'name' | 'taxonomy') */
        if (opts.complete) {
          var c = completenessOf(d);
          if (opts.complete === 'complete' && c.missing.length) return false;
          if (opts.complete === 'missing' && !c.missing.length) return false;
          if (opts.complete !== 'complete' && opts.complete !== 'missing' &&
              c.missing.indexOf(opts.complete) === -1) return false;
        }
        if (q) {
          var hay = [d.name, d.nameEn, d.description, d.materialNote].join(' ').toLowerCase();
          /* free-form tags are part of an asset's searchable surface */
          var tagText = (d.tagIds || []).map(function (id) {
            var tg = tagById(id);
            return tg ? tg.name + ' ' + (tg.nameEn || '') : '';
          }).join(' ');
          if (hay.indexOf(q) === -1 && tagText.toLowerCase().indexOf(q) === -1) return false;
        }
        return true;
      });
      return this.sortDesigns(list, opts.sort);
    },

    /* Stable sort: ties always break on id, so a refresh never reshuffles. */
    sortDesigns: function (list, key) {
      var arr = list.slice();
      var byId = function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; };
      if (key === 'name') {
        arr.sort(function (a, b) {
          var an = String(a.name || '').toLowerCase(), bn = String(b.name || '').toLowerCase();
          if (an !== bn) return an < bn ? -1 : 1;
          return byId(a, b);
        });
      } else if (key === 'created') {
        arr.sort(function (a, b) {
          var at = new Date(a.createdAt).getTime(), bt = new Date(b.createdAt).getTime();
          if (at !== bt) return bt - at;
          return byId(b, a);
        });
      } else {
        arr.sort(function (a, b) {
          var at = new Date(a.updatedAt || a.createdAt).getTime();
          var bt = new Date(b.updatedAt || b.createdAt).getTime();
          if (at !== bt) return bt - at;
          return byId(b, a);
        });
      }
      return arr;
    },

    /* ======================================================================
       Phase 6 — one search across the workspace.
       Only fields that actually exist are searched. Results are grouped and
       capped per type, ranked by where the match sits in the name.
       ====================================================================== */
    searchAll: function (query, opts) {
      opts = opts || {};
      var q = String(query == null ? '' : query).trim().toLowerCase();
      var empty = { designs: [], collections: [], projects: [], brand: [], files: [], folders: [], tags: [], versions: [], total: 0, q: q };
      if (!q) return empty;
      var cap = opts.limit || 6;

      function rank(text) {
        var t = String(text == null ? '' : text).toLowerCase();
        if (!t) return 0;
        if (t === q) return 100;
        if (t.indexOf(q) === 0) return 80;
        if (t.indexOf(q) !== -1) return 55;
        return 0;
      }
      function best(fields) {
        var m = 0;
        for (var i = 0; i < fields.length; i++) m = Math.max(m, rank(fields[i]));
        return m;
      }
      function take(list, scoreFn) {
        return list.map(function (x) { return { item: x, s: scoreFn(x) }; })
          .filter(function (r) { return r.s > 0; })
          .sort(function (a, b) { return b.s - a.s || (a.item.id < b.item.id ? -1 : 1); })
          .slice(0, cap)
          .map(function (r) { return r.item; });
      }

      function tagNames(d) {
        return (d.tagIds || []).map(function (id) {
          var tg = tagById(id);
          return tg ? tg.name + ' ' + (tg.nameEn || '') : '';
        }).join(' ');
      }

      var designs = take(state.designs.filter(function (d) { return own(d) && !d.archived && !d.deletedAt; }), function (d) {
        return best([d.name, d.nameEn, d.description, d.materialNote,
                     taxLabel('type', d.type, 'zh'), taxLabel('stone', d.stone, 'zh'),
                     taxLabel('style', d.style, 'zh'), taxLabel('theme', d.theme, 'zh'),
                     tagNames(d)]);
      });
      var collections = take(state.collections.filter(function (c) { return own(c) && !c.deletedAt; }), function (c) {
        return best([c.name, c.nameEn, c.description]);
      });
      var projects = take(state.projects.filter(function (p) { return own(p) && !p.deletedAt; }), function (p) {
        return best([p.name, p.nameEn, p.description]);
      });
      var brand = [];
      if (activeBrand()) {
        var b = activeBrand();
        var bs = best([b.name, b.englishName, b.tagline, b.description, (b.keywords || []).join(' ')]);
        if (bs > 0) brand.push(b);
      }
      var files = take(state.files.filter(function (f) { return own(f) && !f.deletedAt; }), function (f) {
        var folder = f.folderId ? folderById(f.folderId) : null;
        return best([f.name, folder ? folder.name : '', FILEKIND[f.kind] ? FILEKIND[f.kind].zh : '']);
      });
      var folders = take(state.folders.filter(function (f) { return own(f) && !f.deletedAt; }), function (f) {
        return best([f.name]);
      });
      /* tags are a result type of their own — opening one shows its assets */
      var tags = take(state.tags.filter(own), function (t) {
        return best([t.name, t.nameEn]);
      });
      /* versions are a *secondary* result: the asset itself ranks first */
      var pool = [];
      state.designs.forEach(function (d) {
        if (!own(d) || d.archived || d.deletedAt) return;
        (d.versions || []).forEach(function (v) {
          if (own(v) && !v.deletedAt) pool.push({ v: v, d: d });
        });
      });
      var versions = take(pool, function (x) {
        return best([x.v.name, x.v.notes]);
      }).slice(0, Math.min(cap, 4));

      return {
        designs: designs, collections: collections, projects: projects,
        brand: brand, files: files, folders: folders, tags: tags, versions: versions,
        total: designs.length + collections.length + projects.length + brand.length +
               files.length + folders.length + tags.length + versions.length,
        q: q
      };
    },

    /* dashboard: most recently touched */
    recentDesigns: function (n) {
      return state.designs.filter(function (d) { return own(d) && !d.deletedAt && !d.archived; })
        .slice().sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); })
        .slice(0, n || 6);
    },
    recentCollections: function (n) {
      return state.collections.filter(function (c) { return own(c) && !c.deletedAt; })
        .sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); })
        .slice(0, n || 3);
    },
    recentProjects: function (n) {
      return state.projects.filter(function (p) { return own(p) && !p.deletedAt; })
        .sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); })
        .slice(0, n || 3);
    },
    stats: function () {
      var mine = state.designs.filter(function (d) { return own(d) && !d.deletedAt; });
      var live = mine.filter(function (d) { return !d.archived; });
      var trashed = ['designs', 'collections', 'projects', 'files', 'folders'].reduce(function (n, k) {
        return n + (state[k] || []).filter(function (r) { return own(r) && r.deletedAt; }).length;
      }, 0);
      return {
        designs: live.length,
        allDesigns: mine.length,
        archived: mine.length - live.length,
        collections: state.collections.filter(function (c) { return own(c) && !c.deletedAt; }).length,
        projects: state.projects.filter(function (p) { return own(p) && !p.deletedAt; }).length,
        trash: trashed,
        trashDesigns: state.designs.filter(function (d) { return own(d) && d.deletedAt; }).length
      };
    },

    /* ---- collections ---- */
    createCollection: function (data) {
      var now = new Date().toISOString();
      var c = {
        id: uid('c'), workspaceId: ws(),
        name: data.name, nameEn: data.nameEn || data.name,
        description: data.description || '', descriptionEn: data.descriptionEn || data.description || '',
        cover: data.cover || 'vase.jpg', status: data.status || 'draft',
        designIds: [], sortOrder: [], createdAt: now, updatedAt: now
      };
      state.collections.unshift(c);
      save();
      return c;
    },
    updateCollection: function (id, data) {
      var c = byId(state.collections, id);
      if (!own(c) || c.deletedAt) return null;
      ['name', 'nameEn', 'description', 'descriptionEn', 'cover', 'status'].forEach(function (k) {
        if (data[k] !== undefined) c[k] = data[k];
      });
      touchColl(c); save();
      return c;
    },
    /* soft delete: relations stay on the designs, so restoring the collection
       brings its contents back without any extra bookkeeping */
    deleteCollection: function (id) {
      var c = byId(state.collections, id);
      if (!own(c) || c.deletedAt) return false;
      c.deletedAt = new Date().toISOString();
      c.updatedAt = c.deletedAt;
      save();
      return true;
    },
    restoreCollection: function (id) {
      var c = byId(state.collections, id);
      if (!own(c) || !c.deletedAt) return false;
      c.deletedAt = null;
      c.updatedAt = new Date().toISOString();
      save();
      return true;
    },
    addDesignsToCollection: function (cid, ids) {
      var c = byId(state.collections, cid);
      if (!own(c) || c.deletedAt) return 0;
      var n = 0;
      ids.forEach(function (did) {
        var d = byId(state.designs, did);
        if (!own(d) || d.deletedAt) return;
        if (c.designIds.indexOf(did) === -1) { c.designIds.push(did); c.sortOrder.push(did); n++; }
        if (d.collectionIds.indexOf(cid) === -1) d.collectionIds.push(cid);
      });
      if (n) touchColl(c);
      save();
      return n;
    },
    removeDesignFromCollection: function (cid, did) {
      var c = byId(state.collections, cid);
      if (!own(c) || c.deletedAt) return;
      c.designIds = c.designIds.filter(function (x) { return x !== did; });
      c.sortOrder = c.sortOrder.filter(function (x) { return x !== did; });
      var d = byId(state.designs, did);
      if (d) d.collectionIds = d.collectionIds.filter(function (x) { return x !== cid; });
      touchColl(c); save();
    },
    setCollectionOrder: function (cid, ids) {
      var c = byId(state.collections, cid);
      if (!own(c) || c.deletedAt) return;
      c.sortOrder = ids.slice();
      touchColl(c); save();
    },

    /* ---- projects ---- */
    createProject: function (data) {
      var now = new Date().toISOString();
      var p = {
        id: uid('p'), workspaceId: ws(),
        name: data.name, nameEn: data.nameEn || data.name,
        description: data.description || '', descriptionEn: data.descriptionEn || data.description || '',
        status: data.status || 'planning', designIds: [],
        files: { refs: [], sketches: [], docs: [], others: [] },
        createdAt: now, updatedAt: now
      };
      state.projects.unshift(p);
      save();
      return p;
    },
    updateProject: function (id, data) {
      var p = byId(state.projects, id);
      if (!own(p) || p.deletedAt) return null;
      ['name', 'nameEn', 'description', 'descriptionEn', 'status'].forEach(function (k) {
        if (data[k] !== undefined) p[k] = data[k];
      });
      p.updatedAt = new Date().toISOString(); save();
      return p;
    },
    deleteProject: function (id) {
      var p = byId(state.projects, id);
      if (!own(p) || p.deletedAt) return false;
      p.deletedAt = new Date().toISOString();
      p.updatedAt = p.deletedAt;
      save();
      return true;
    },
    restoreProject: function (id) {
      var p = byId(state.projects, id);
      if (!own(p) || !p.deletedAt) return false;
      p.deletedAt = null;
      p.updatedAt = new Date().toISOString();
      save();
      return true;
    },
    addDesignsToProject: function (pid, ids) {
      var p = byId(state.projects, pid);
      if (!own(p) || p.deletedAt) return 0;
      var n = 0;
      ids.forEach(function (did) {
        var d = byId(state.designs, did);
        if (!own(d) || d.deletedAt) return;
        if (p.designIds.indexOf(did) === -1) { p.designIds.push(did); n++; }
        d.projectId = pid;          /* one primary project per design */
      });
      if (n) p.updatedAt = new Date().toISOString();
      save();
      return n;
    },
    removeDesignFromProject: function (pid, did) {
      var p = byId(state.projects, pid);
      if (!own(p) || p.deletedAt) return;
      p.designIds = p.designIds.filter(function (x) { return x !== did; });
      var d = byId(state.designs, did);
      if (d && d.projectId === pid) d.projectId = null;
      p.updatedAt = new Date().toISOString(); save();
    },
    setDesignProject: function (did, pid) {
      var d = byId(state.designs, did);
      if (!own(d) || d.deletedAt) return;
      var target = pid ? byId(state.projects, pid) : null;
      if (pid && (!own(target) || target.deletedAt)) return;
      var old = d.projectId;
      if (old && old !== pid) {
        var op = byId(state.projects, old);
        if (op) { op.designIds = op.designIds.filter(function (x) { return x !== did; }); op.updatedAt = new Date().toISOString(); }
      }
      d.projectId = pid;
      if (target && target.designIds.indexOf(did) === -1) {
        target.designIds.push(did); target.updatedAt = new Date().toISOString();
      }
      save();
    },

    /* ---- designs ---- */
    toggleFavorite: function (did) {
      var d = byId(state.designs, did);
      if (!own(d) || d.deletedAt) return;
      d.favorite = !d.favorite; save();
      return d.favorite;
    },
    toggleArchive: function (did) {
      var d = byId(state.designs, did);
      if (!own(d) || d.deletedAt) return;
      d.archived = !d.archived; save();
      return d.archived;
    },

    /* ---- design creation (Phase 10) ----
       The first nine phases could only ever read assets that already existed;
       a real V1 needs one honest way in. Everything it writes is the same
       shape the seed uses, and every relation is validated against the
       current workspace. */
    createDesign: function (data) {
      data = data || {};
      var name = String(data.name || '').trim();
      if (!name) return { ok: false, reason: 'name' };
      var pre = can('design.create');
      if (!pre.ok) return { ok: false, reason: 'plan', message: pre.message, code: pre.code };
      var type = TYPES[data.type] ? data.type : 'ring';
      var now = new Date().toISOString();
      var metal = METALS[data.metal] ? data.metal : null;
      var stone = STONES[data.stone] ? data.stone : null;
      var d = {
        id: uid('d'), workspaceId: ws(),
        name: name,
        nameEn: String(data.nameEn || '').trim() || name,
        type: type,
        style: STYLES[data.style] ? data.style : null,
        theme: THEMES[data.theme] ? data.theme : null,
        metal: metal, stone: stone,
        status: DSTAT[data.status] ? data.status : 'concept',
        year: Number(data.year) || new Date().getFullYear(),
        cover: data.cover || null,
        images: data.cover ? [data.cover] : [],
        description: String(data.description || '').trim(),
        descriptionEn: '',
        materialNote: data.materialNote || ((metal || stone)
          ? [metal ? (metal === 'gold' ? '18K 黄金' : METALS[metal].zh) : '', stone ? STONES[stone].zh : ''].filter(Boolean).join(' · ')
          : ''),
        collectionIds: [], projectId: null,
        tagIds: (data.tagIds || []).filter(function (id) { var t = tagById(id); return own(t); }),
        fileIds: [],
        versions: [], currentVersionId: null,
        favorite: false, archived: false,
        createdAt: now, updatedAt: now, deletedAt: null
      };
      state.designs.unshift(d);

      (data.collectionIds || []).forEach(function (cid) {
        var c = byId(state.collections, cid);
        if (!own(c) || c.deletedAt) return;
        if (c.designIds.indexOf(d.id) === -1) { c.designIds.push(d.id); c.sortOrder.push(d.id); }
        d.collectionIds.push(cid);
        c.updatedAt = now;
      });

      if (data.projectId) {
        var p = byId(state.projects, data.projectId);
        if (own(p) && !p.deletedAt) {
          p.designIds.push(d.id);
          p.updatedAt = now;
          d.projectId = p.id;
        }
      }

      var okSave = save();
      if (!okSave) {
        state.designs = state.designs.filter(function (x) { return x.id !== d.id; });
        return { ok: false, reason: 'quota' };
      }
      return { ok: true, design: d };
    },

    /* ======================================================================
       Phase 7 — tags, classification, editing, completeness
       Every operation is scoped to the current workspace. Tags hold no copy
       of a design: the relation lives in design.tagIds.
       ====================================================================== */
    dimensions: function () { return DIMENSIONS.slice(); },
    taxOptions: function (dim) { return taxOpts(dim); },
    taxLabel: function (dim, key, lang) { return taxLabel(dim, key, lang); },

    /* ---- tags ---- */
    tags: function () {
      return state.tags.filter(own).slice().sort(function (a, b) {
        return a.name.localeCompare(b.name, 'zh');
      });
    },
    tag: function (id) { var t = tagById(id); return own(t) ? t : null; },
    /* display name follows the interface language when an English name exists */
    tagLabel: function (t, lang) {
      if (!t) return '';
      return lang === 'en' ? (t.nameEn || t.name) : t.name;
    },
    tagByName: function (name) {
      var n = normTag(name);
      return n ? findByNorm(n) : null;
    },
    normalizeTag: normTag,

    tagUsage: function (tagId) {
      return state.designs.filter(function (d) {
        return own(d) && !d.deletedAt && (d.tagIds || []).indexOf(tagId) !== -1;
      }).length;
    },
    designsByTag: function (tagId, includeArchived) {
      return state.designs.filter(function (d) {
        if (!own(d) || d.deletedAt) return false;
        if (!includeArchived && d.archived) return false;
        return (d.tagIds || []).indexOf(tagId) !== -1;
      });
    },
    untaggedDesigns: function (includeArchived) {
      return state.designs.filter(function (d) {
        return own(d) && !d.deletedAt && (includeArchived || !d.archived) && !(d.tagIds || []).length;
      });
    },
    tagStats: function () {
      var used = 0, unused = 0;
      state.tags.filter(own).forEach(function (t) {
        if (state.designs.some(function (d) { return own(d) && !d.deletedAt && (d.tagIds || []).indexOf(t.id) !== -1; })) used++;
        else unused++;
      });
      return { total: state.tags.filter(own).length, used: used, unused: unused };
    },

    /* returns { ok, tag, existed } — creating an existing name is not an error,
       it just hands back the tag that is already there (no duplicates) */
    createTag: function (name) {
      var display = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
      var norm = normTag(display);
      if (!norm) return { ok: false, reason: 'empty' };
      var found = findByNorm(norm);
      if (found) return { ok: true, tag: found, existed: true };
      var now = new Date().toISOString();
      var t = {
        id: uid('tg'), workspaceId: ws(),
        name: display, nameEn: '', normalizedName: norm,
        createdAt: now, updatedAt: now
      };
      state.tags.push(t);
      save();
      return { ok: true, tag: t, existed: false };
    },

    renameTag: function (id, name) {
      var t = tagById(id);
      if (!own(t)) return { ok: false, reason: 'missing' };
      var display = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
      var norm = normTag(display);
      if (!norm) return { ok: false, reason: 'empty' };
      var clash = findByNorm(norm, id);
      if (clash) return { ok: false, reason: 'duplicate', tag: clash };
      t.name = display;
      t.normalizedName = norm;
      t.updatedAt = new Date().toISOString();
      save();
      return { ok: true, tag: t };
    },

    /* merge source → target: relations move, duplicates collapse, source is gone.
       Design assets are never touched beyond their tagIds list. */
    mergeTags: function (sourceId, targetId) {
      if (sourceId === targetId) return { ok: false, reason: 'same' };
      var src = tagById(sourceId), dst = tagById(targetId);
      if (!own(src) || !own(dst)) return { ok: false, reason: 'missing' };
      var moved = 0;
      state.designs.forEach(function (d) {
        if (!own(d) || !d.tagIds) return;
        if (d.tagIds.indexOf(sourceId) === -1) return;
        d.tagIds = d.tagIds.filter(function (x) { return x !== sourceId; });
        if (d.tagIds.indexOf(targetId) === -1) d.tagIds.push(targetId);
        d.updatedAt = new Date().toISOString();
        moved++;
      });
      state.tags = state.tags.filter(function (x) { return x.id !== sourceId; });
      dst.updatedAt = new Date().toISOString();
      save();
      return { ok: true, moved: moved, tag: dst };
    },

    /* deleting a tag removes the relation only — never the design asset */
    deleteTag: function (id) {
      var t = tagById(id);
      if (!own(t)) return { ok: false, affected: 0 };
      var affected = 0;
      state.designs.forEach(function (d) {
        if (!own(d) || !d.tagIds) return;
        if (d.tagIds.indexOf(id) !== -1) {
          d.tagIds = d.tagIds.filter(function (x) { return x !== id; });
          d.updatedAt = new Date().toISOString();
          affected++;
        }
      });
      state.tags = state.tags.filter(function (x) { return x.id !== id; });
      save();
      return { ok: true, affected: affected };
    },

    addTagToDesigns: function (ids, tagId) {
      var t = tagById(tagId);
      if (!own(t)) return { ok: false, changed: 0, missing: ids.length };
      var changed = 0, now = new Date().toISOString();
      ids.forEach(function (id) {
        var d = byId(state.designs, id);
        if (!own(d) || d.deletedAt) return;
        if (!d.tagIds) d.tagIds = [];
        if (d.tagIds.indexOf(tagId) === -1) {
          d.tagIds.push(tagId);
          d.updatedAt = now;
          changed++;
        }
      });
      save();
      return { ok: true, changed: changed, unchanged: ids.length - changed, tag: t };
    },

    removeTagFromDesigns: function (ids, tagId) {
      var changed = 0, now = new Date().toISOString();
      ids.forEach(function (id) {
        var d = byId(state.designs, id);
        if (!own(d) || d.deletedAt || !d.tagIds) return;
        if (d.tagIds.indexOf(tagId) !== -1) {
          d.tagIds = d.tagIds.filter(function (x) { return x !== tagId; });
          d.updatedAt = now;
          changed++;
        }
      });
      if (changed) save();
      return { ok: true, changed: changed, unchanged: ids.length - changed };
    },

    setDesignTags: function (did, tagIds) {
      var d = byId(state.designs, did);
      if (!own(d) || d.deletedAt) return false;
      d.tagIds = (tagIds || []).filter(function (id) {
        var t = tagById(id);
        return own(t);
      });
      d.updatedAt = new Date().toISOString();
      save();
      return true;
    },

    tagsOfDesign: function (did) {
      var d = byId(state.designs, did);
      if (!own(d)) return [];
      return (d.tagIds || []).map(tagById).filter(function (t) { return own(t); });
    },

    /* ---- design edit ---- */
    updateDesign: function (did, patch) {
      var d = byId(state.designs, did);
      if (!own(d) || d.deletedAt) return null;
      var allowed = ['name', 'nameEn', 'description', 'type', 'style', 'theme',
                     'metal', 'stone', 'status', 'favorite', 'archived',
                     'cover', 'images', 'year', 'materialNote'];
      allowed.forEach(function (k) {
        if (patch[k] !== undefined) d[k] = patch[k];
      });
      if (patch.tagIds !== undefined) {
        d.tagIds = patch.tagIds.filter(function (id) { return !!tagById(id); });
      }
      d.updatedAt = new Date().toISOString();
      save();
      return d;
    },

    bulkUpdateDesigns: function (ids, patch) {
      var changed = 0, now = new Date().toISOString();
      ids.forEach(function (id) {
        var d = byId(state.designs, id);
        if (!own(d) || d.deletedAt) return;
        Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
        d.updatedAt = now;
        changed++;
      });
      if (changed) save();
      return changed;
    },

    completeness: function (d) { return d ? completenessOf(d) : null; },
    completenessStats: function () {
      var out = { complete: 0, missing: 0, name: 0, description: 0, tags: 0, taxonomy: 0 };
      state.designs.filter(function (d) { return own(d) && !d.archived && !d.deletedAt; }).forEach(function (d) {
        var c = completenessOf(d);
        if (!c.missing.length) { out.complete++; return; }
        out.missing++;
        c.missing.forEach(function (k) { out[k] = (out[k] || 0) + 1; });
      });
      return out;
    },

    /* ---- taxonomy management (classification options) ---- */
    addTaxOption: function (dim, opt) {
      if (!state.taxonomy[dim]) return { ok: false, reason: 'dimension' };
      var zh = String(opt.zh || '').trim();
      if (!zh) return { ok: false, reason: 'empty' };
      var key = String(opt.key || '').trim() ||
        ('x' + Math.random().toString(36).slice(2, 6));
      var arr = state.taxonomy[dim];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].key === key || arr[i].zh === zh) return { ok: false, reason: 'duplicate', option: arr[i] };
      }
      var o = { key: key, zh: zh, en: String(opt.en || zh).trim() };
      arr.push(o);
      save();
      return { ok: true, option: o };
    },

    renameTaxOption: function (dim, key, patch) {
      var arr = state.taxonomy[dim];
      if (!arr) return { ok: false, reason: 'dimension' };
      var opt = null;
      arr.forEach(function (o) { if (o.key === key) opt = o; });
      if (!opt) return { ok: false, reason: 'missing' };
      var zh = patch.zh === undefined ? opt.zh : String(patch.zh).trim();
      if (!zh) return { ok: false, reason: 'empty' };
      var dup = arr.some(function (o) { return o !== opt && o.zh === zh; });
      if (dup) return { ok: false, reason: 'duplicate' };
      opt.zh = zh;
      if (patch.en !== undefined) opt.en = String(patch.en).trim() || zh;
      save();
      return { ok: true, option: opt };
    },

    taxOptionUsage: function (dim, key) {
      return state.designs.filter(function (d) {
        return own(d) && d[dim] === key;
      }).length;
    },

    /* refuses to delete an option that assets still use */
    deleteTaxOption: function (dim, key) {
      var arr = state.taxonomy[dim];
      if (!arr) return { ok: false, reason: 'dimension' };
      var used = this.taxOptionUsage(dim, key);
      if (used) return { ok: false, reason: 'in-use', used: used };
      state.taxonomy[dim] = arr.filter(function (o) { return o.key !== key; });
      save();
      return { ok: true };
    },

    /* ======================================================================
       Phase 9 — data safety: soft delete, trash, references, workspaces
       Nothing valuable disappears on one click. Deleting is reversible until
       an explicit "delete permanently"; workspace id is checked on every path.
       ====================================================================== */

    /* ---- design: delete / restore ---- */
    deleteDesign: function (id) {
      var d = byId(state.designs, id);
      if (!own(d) || d.deletedAt) return { ok: false, reason: 'missing' };
      d.deletedAt = new Date().toISOString();
      d.updatedAt = d.deletedAt;
      save();
      return { ok: true };
    },

    /* restore keeps the original name, versions, tags and files. Only links
       whose other end is gone for good are dropped, so nothing comes back as
       an orphan. */
    restoreDesign: function (id) {
      var d = byId(state.designs, id);
      if (!own(d) || !d.deletedAt) return { ok: false, reason: 'missing' };
      d.deletedAt = null;
      d.updatedAt = new Date().toISOString();
      d.collectionIds = (d.collectionIds || []).filter(function (cid) {
        var c = byId(state.collections, cid);
        return own(c) && !c.deletedAt;
      });
      if (d.projectId) {
        var p = byId(state.projects, d.projectId);
        if (!own(p) || p.deletedAt) d.projectId = null;
      }
      d.fileIds = (d.fileIds || []).filter(function (fid) {
        var f = byId(state.files, fid);
        return own(f) && !f.deletedAt;
      });
      save();
      return { ok: true, design: d };
    },

    /* ---- reference counting: what would a delete affect? ---- */
    designUsage: function (id) {
      var d = byId(state.designs, id);
      if (!own(d)) return null;
      var colls = this.collectionsOfDesign(id);
      var proj = d.projectId ? byId(state.projects, d.projectId) : null;
      var brand = activeBrand();
      var site = activeWebsite();
      var works = site ? siteSection('featured_works') : null;
      var hero = site ? siteSection('hero') : null;
      var liveVersions = (d.versions || []).filter(function (v) { return !v.deletedAt; });
      var files = [];
      (d.versions || []).forEach(function (v) {
        (v.fileIds || []).forEach(function (fid) {
          var f = byId(state.files, fid);
          if (own(f) && files.indexOf(f.name) === -1) files.push(f.name);
        });
      });
      return {
        collections: colls.map(function (c) { return c.name; }),
        project: (own(proj) && !proj.deletedAt) ? proj.name : null,
        brandFeatured: !!(brand && brand.featuredDesignIds.indexOf(id) !== -1),
        siteFeatured: !!(works && works.designIds.indexOf(id) !== -1),
        siteHero: !!(hero && hero.designId === id),
        versions: liveVersions.length,
        files: files
      };
    },

    fileUsage: function (id) {
      var f = byId(state.files, id);
      if (!own(f)) return null;
      var designs = [], versions = [];
      state.designs.forEach(function (d) {
        if (!own(d) || d.deletedAt) return;
        if ((d.fileIds || []).indexOf(id) !== -1) designs.push(d.name);
        (d.versions || []).forEach(function (v) {
          if (!v.deletedAt && (v.fileIds || []).indexOf(id) !== -1) {
            versions.push('V' + v.versionNumber + ' · ' + v.name);
          }
        });
      });
      return { designs: designs, versions: versions };
    },

    /* References that survive even a soft delete: a trashed design can be
       restored, so its file must not be purged underneath it. */
    fileRefsAll: function (id) {
      var designs = [], versions = [];
      state.designs.forEach(function (d) {
        if (!own(d)) return;
        if ((d.fileIds || []).indexOf(id) !== -1) designs.push(d.name);
        (d.versions || []).forEach(function (v) {
          if (own(v) && (v.fileIds || []).indexOf(id) !== -1) {
            versions.push('V' + v.versionNumber + ' · ' + v.name);
          }
        });
      });
      return { designs: designs, versions: versions };
    },

    /* ---- trash ---- */
    trashAll: function () {
      var self = this;
      return {
        designs: state.designs.filter(function (d) { return own(d) && d.deletedAt; })
          .sort(function (a, b) { return new Date(b.deletedAt) - new Date(a.deletedAt); }),
        collections: state.collections.filter(function (c) { return own(c) && c.deletedAt; }),
        projects: state.projects.filter(function (p) { return own(p) && p.deletedAt; }),
        brands: (state.brands || []).filter(function (b) { return own(b) && b.deletedAt; }),
        websites: (state.websites || []).filter(function (w) { return own(w) && w.deletedAt; }),
        files: state.files.filter(function (f) { return own(f) && f.deletedAt; }),
        folders: state.folders.filter(function (f) { return own(f) && f.deletedAt; })
      };
    },
    trashCount: function () {
      var t = this.trashAll();
      return t.designs.length + t.collections.length + t.projects.length +
        t.brands.length + t.websites.length + t.files.length + t.folders.length;
    },

    restoreItem: function (kind, id) {
      if (kind === 'design') return this.restoreDesign(id);
      if (kind === 'collection') return this.restoreCollection(id);
      if (kind === 'project') return this.restoreProject(id);
      if (kind === 'brand') {
        var b = null;
        (state.brands || []).forEach(function (x) { if (x.id === id && own(x)) b = x; });
        if (!b || !b.deletedAt) return { ok: false, reason: 'missing' };
        if (activeBrand()) return { ok: false, reason: 'conflict' };
        b.deletedAt = null; b.updatedAt = new Date().toISOString(); save();
        return { ok: true };
      }
      if (kind === 'website') {
        var w = null;
        (state.websites || []).forEach(function (x) { if (x.id === id && own(x)) w = x; });
        if (!w || !w.deletedAt) return { ok: false, reason: 'missing' };
        if (activeWebsite()) return { ok: false, reason: 'conflict' };
        w.deletedAt = null; w.updatedAt = new Date().toISOString(); save();
        return { ok: true };
      }
      if (kind === 'file') {
        var n = this.restoreFiles([id]);
        return n ? { ok: true } : { ok: false, reason: 'missing' };
      }
      if (kind === 'folder') {
        return this.restoreFolder(id) ? { ok: true } : { ok: false, reason: 'missing' };
      }
      return { ok: false, reason: 'kind' };
    },

    /* permanent delete — relations are cleaned, files still referenced are
       refused rather than silently broken */
    purgeItem: function (kind, id) {
      if (kind === 'design') {
        var d = byId(state.designs, id);
        if (!own(d) || !d.deletedAt) return { ok: false, reason: 'missing' };
        state.designs = state.designs.filter(function (x) { return x.id !== id; });
        state.collections.forEach(function (c) {
          c.designIds = (c.designIds || []).filter(function (x) { return x !== id; });
          c.sortOrder = (c.sortOrder || []).filter(function (x) { return x !== id; });
        });
        state.projects.forEach(function (p) {
          p.designIds = (p.designIds || []).filter(function (x) { return x !== id; });
        });
        (state.brands || []).concat(state.websites || []).forEach(function (row) {
          if (row.featuredDesignIds) {
            row.featuredDesignIds = row.featuredDesignIds.filter(function (x) { return x !== id; });
          }
        });
        (state.websites || []).forEach(function (w) {
          (w.sections || []).forEach(function (sec) {
            if (sec.designIds) sec.designIds = sec.designIds.filter(function (x) { return x !== id; });
            if (sec.designId === id) sec.designId = null;
          });
        });
        state.versionEvents = (state.versionEvents || []).filter(function (e) { return e.designAssetId !== id; });
        state.files.forEach(function (f) {
          if (f.designIds) f.designIds = f.designIds.filter(function (x) { return x !== id; });
        });
        save();
        return { ok: true };
      }
      if (kind === 'collection') {
        var c = byId(state.collections, id);
        if (!own(c) || !c.deletedAt) return { ok: false, reason: 'missing' };
        state.collections = state.collections.filter(function (x) { return x.id !== id; });
        state.designs.forEach(function (dd) {
          dd.collectionIds = (dd.collectionIds || []).filter(function (x) { return x !== id; });
        });
        (state.brands || []).forEach(function (b) {
          if (b.featuredCollectionIds) {
            b.featuredCollectionIds = b.featuredCollectionIds.filter(function (x) { return x !== id; });
          }
        });
        (state.websites || []).forEach(function (w) {
          (w.sections || []).forEach(function (sec) {
            if (sec.collectionIds) sec.collectionIds = sec.collectionIds.filter(function (x) { return x !== id; });
          });
        });
        save();
        return { ok: true };
      }
      if (kind === 'project') {
        var p = byId(state.projects, id);
        if (!own(p) || !p.deletedAt) return { ok: false, reason: 'missing' };
        state.projects = state.projects.filter(function (x) { return x.id !== id; });
        state.designs.forEach(function (dd) { if (dd.projectId === id) dd.projectId = null; });
        save();
        return { ok: true };
      }
      if (kind === 'brand') {
        var b = null;
        (state.brands || []).forEach(function (x) { if (x.id === id && own(x)) b = x; });
        if (!b || !b.deletedAt) return { ok: false, reason: 'missing' };
        state.brands = state.brands.filter(function (x) { return x.id !== id; });
        save();
        return { ok: true };
      }
      if (kind === 'website') {
        var w = null;
        (state.websites || []).forEach(function (x) { if (x.id === id && own(x)) w = x; });
        if (!w || !w.deletedAt) return { ok: false, reason: 'missing' };
        state.websites = state.websites.filter(function (x) { return x.id !== id; });
        save();
        return { ok: true };
      }
      if (kind === 'file') {
        var usage = this.fileRefsAll(id);
        if (usage.designs.length || usage.versions.length) {
          return { ok: false, reason: 'in-use', usage: usage };
        }
        var nf = this.purgeFiles([id]);
        return nf ? { ok: true } : { ok: false, reason: 'missing' };
      }
      if (kind === 'folder') {
        /* detach children first: a purged folder must not leave files or
           sub-folders pointing at an id that no longer exists */
        state.files.forEach(function (fl) {
          if (fl.folderId === id) fl.folderId = null;
        });
        state.folders.forEach(function (fd) {
          if (fd.parentFolderId === id) fd.parentFolderId = null;
        });
        var nfold = this.purgeFolders([id]);
        return nfold ? { ok: true } : { ok: false, reason: 'missing' };
      }
      return { ok: false, reason: 'kind' };
    },

    emptyAllTrash: function () {
      var self = this;
      var t = this.trashAll();
      var purged = 0, skipped = [];
      ['designs', 'collections', 'projects', 'brands', 'websites', 'files', 'folders'].forEach(function (k) {
        var kind = k === 'designs' ? 'design' : k === 'collections' ? 'collection'
          : k === 'projects' ? 'project' : k === 'brands' ? 'brand'
          : k === 'websites' ? 'website' : k === 'files' ? 'file' : 'folder';
        t[k].forEach(function (row) {
          var r = self.purgeItem(kind, row.id);
          if (r.ok) purged++;
          else skipped.push({ kind: kind, name: row.name || row.id, reason: r.reason });
        });
      });
      return { purged: purged, skipped: skipped };
    },

    /* switching is a server round-trip: the session changes there, and the
       whole in-memory context is replaced so no other workspace's rows can
       survive the switch */
    switchWorkspace: function (id) {
      return Api.selectWorkspace(id).then(function (res) {
        if (session) {
          session.activeWorkspaceId = res.workspace ? res.workspace.id : id;
          if (res.workspace) {
            session.workspaces = (session.workspaces || []).map(function (w) {
              return w.id === res.workspace.id ? res.workspace : w;
            });
          }
        }
        applyState(res.state, res.taxonomy, res.plan);
        broadcast();
        return true;
      });
    },

    workspaceInfo: function () {
      var self = this;
      return ((session && session.workspaces) || []).map(function (w) {
        return {
          id: w.id, name: w.name, slug: w.slug, logo: w.logo,
          active: w.id === ws(),
          plan: w.plan, usage: w.usage, overLimit: w.overLimit
        };
      });
    },

    /* ======================================================================
       Phase 8 — versions & change history
       A version belongs to one design asset and one workspace. Files are
       referenced by id — the bytes live once in the cloud space.
       ====================================================================== */
    versionsOf: function (designId) {
      var d = byId(state.designs, designId);
      if (!own(d)) return [];
      return (d.versions || []).filter(function (v) {
        return own(v) && !v.deletedAt && v.designAssetId === d.id;
      }).sort(function (a, b) { return a.versionNumber - b.versionNumber; });
    },
    allVersionsOf: function (designId) {
      var d = byId(state.designs, designId);
      if (!own(d)) return [];
      return (d.versions || []).slice().sort(function (a, b) {
        return a.versionNumber - b.versionNumber;
      });
    },
    version: function (id) {
      var v = this.rawVersion(id);
      return (v && !v.deletedAt) ? v : null;
    },
    /* deleted versions stay on the record; the trash-like list in the detail
       page is the only way back, so it must be able to see them */
    rawVersion: function (id) {
      for (var i = 0; i < state.designs.length; i++) {
        var list = state.designs[i].versions || [];
        for (var k = 0; k < list.length; k++) {
          if (list[k].id === id) return own(list[k]) ? list[k] : null;
        }
      }
      return null;
    },
    deletedVersionsOf: function (designId) {
      var d = byId(state.designs, designId);
      if (!own(d) || d.deletedAt) return [];
      return (d.versions || []).filter(function (v) {
        return own(v) && v.deletedAt;
      }).sort(function (a, b) { return a.versionNumber - b.versionNumber; });
    },
    restoreVersion: function (versionId) {
      var v = this.rawVersion(versionId);
      if (!v || !v.deletedAt) return { ok: false, reason: 'missing' };
      var d = byId(state.designs, v.designAssetId);
      if (!own(d) || d.deletedAt) return { ok: false, reason: 'missing' };
      v.deletedAt = null;
      v.updatedAt = new Date().toISOString();
      d.updatedAt = v.updatedAt;
      this.logVersionEvent(d, v, 'versionRestored', '');
      save();
      return { ok: true, version: v };
    },
    currentVersion: function (designId) {
      var d = byId(state.designs, designId);
      if (!own(d) || !d.currentVersionId) return null;
      var v = this.version(d.currentVersionId);
      return v && !v.deletedAt ? v : null;
    },
    versionFiles: function (versionId) {
      var v = this.version(versionId);
      if (!v) return [];
      return (v.fileIds || []).map(function (id) { return fileById(id); })
        .filter(function (f) { return own(f); });
    },
    /* the first image file is what a version looks like */
    versionCover: function (v) {
      if (!v) return null;
      var fs = (v.fileIds || []).map(function (id) { return fileById(id); });
      for (var i = 0; i < fs.length; i++) {
        if (own(fs[i]) && fs[i].kind === 'image' && fs[i].dataUrl) return fs[i].dataUrl;
      }
      return null;
    },

    addVersion: function (designId, data) {
      data = data || {};
      var d = byId(state.designs, designId);
      if (!own(d)) return { ok: false, reason: 'missing' };
      if (!d.versions) d.versions = [];
      var vRoom = can('version.create', {
        count: d.versions.filter(function (v) { return !v.deletedAt; }).length + 1
      });
      if (!vRoom.ok) return { ok: false, reason: 'plan', message: vRoom.message, code: vRoom.code };
      var maxNo = 0;
      d.versions.forEach(function (v) { if (v.versionNumber > maxNo) maxNo = v.versionNumber; });
      var now = new Date().toISOString();
      var fileIds = (data.fileIds || []).filter(function (id) {
        var f = fileById(id);
        return own(f) && !f.deletedAt;
      });
      var v = {
        id: uid('dv'), workspaceId: d.workspaceId, designAssetId: d.id,
        versionNumber: maxNo + 1,
        name: String(data.name || '').trim() || ('V' + (maxNo + 1)),
        notes: String(data.notes || '').trim(),
        status: data.status || 'draft',
        fileIds: fileIds,
        createdAt: now, updatedAt: now, deletedAt: null
      };
      d.versions.push(v);
      d.currentVersionId = v.id;
      d.updatedAt = now;
      this.logVersionEvent(d, v, 'created', '');
      var cover = this.versionCover(v);
      if (cover) d.cover = cover;
      save();
      return { ok: true, version: v };
    },

    updateVersion: function (versionId, patch) {
      patch = patch || {};
      var v = this.version(versionId);
      if (!v) return { ok: false, reason: 'missing' };
      var d = byId(state.designs, v.designAssetId);
      if (!own(d)) return { ok: false, reason: 'missing' };
      var now = new Date().toISOString();
      var changed = [];

      if (patch.name !== undefined) {
        var name = String(patch.name).trim();
        if (!name) return { ok: false, reason: 'empty' };
        if (name !== v.name) {
          var oldName = v.name;
          v.name = name;
          changed.push('renamed');
          this.logVersionEvent(d, v, 'renamed', oldName);
        }
      }
      if (patch.notes !== undefined) {
        var notes = String(patch.notes).trim();
        if (notes !== v.notes) {
          v.notes = notes;
          changed.push('notes');
          this.logVersionEvent(d, v, 'notes', '');
        }
      }
      if (patch.status !== undefined && patch.status !== v.status) {
        v.status = patch.status;
        changed.push('status');
        this.logVersionEvent(d, v, 'status', patch.status);
      }
      if (patch.fileIds !== undefined) {
        v.fileIds = patch.fileIds.filter(function (id) {
          var f = fileById(id);
          return own(f) && !f.deletedAt;
        });
        changed.push('files');
      }
      if (!changed.length) return { ok: true, version: v, unchanged: true };
      v.updatedAt = now;
      d.updatedAt = now;
      save();
      return { ok: true, version: v, changed: changed };
    },

    /* explicit pointer switch; history is never rewritten */
    setCurrentVersion: function (versionId) {
      var v = this.version(versionId);
      if (!v || v.deletedAt) return { ok: false, reason: 'missing' };
      var d = byId(state.designs, v.designAssetId);
      if (!own(d)) return { ok: false, reason: 'missing' };
      if (d.currentVersionId === v.id) return { ok: true, unchanged: true, version: v };
      var prev = this.version(d.currentVersionId);
      var isRestore = !!(prev && v.versionNumber < prev.versionNumber);
      var now = new Date().toISOString();
      d.currentVersionId = v.id;
      d.updatedAt = now;
      var cover = this.versionCover(v);
      if (cover) d.cover = cover;
      this.logVersionEvent(d, v, isRestore ? 'restored' : 'current', '');
      save();
      return { ok: true, version: v, restored: isRestore, previous: prev ? prev.id : null };
    },

    /* soft delete: the current version cannot be removed, and no file is touched */
    deleteVersion: function (versionId) {
      var v = this.version(versionId);
      if (!v) return { ok: false, reason: 'missing' };
      var d = byId(state.designs, v.designAssetId);
      if (!own(d)) return { ok: false, reason: 'missing' };
      if (d.currentVersionId === v.id) return { ok: false, reason: 'current' };
      if (v.deletedAt) return { ok: false, reason: 'deleted' };
      var now = new Date().toISOString();
      v.deletedAt = now;
      v.updatedAt = now;
      d.updatedAt = now;
      this.logVersionEvent(d, v, 'deleted', '');
      save();
      return { ok: true };
    },

    /* change log — append-only, no invented operator identity */
    logVersionEvent: function (d, v, eventType, detail) {
      if (!state.versionEvents) state.versionEvents = [];
      state.versionEvents.push({
        id: uid('ve'), workspaceId: d.workspaceId || ws(),
        designAssetId: d.id, versionId: v ? v.id : null,
        eventType: eventType,
        versionNumber: v ? v.versionNumber : null,
        versionName: v ? v.name : '',
        detail: detail || '',
        createdAt: new Date().toISOString()
      });
    },
    eventsOfDesign: function (designId, limit) {
      var list = state.versionEvents.filter(function (e) {
        return own(e) && e.designAssetId === designId;
      }).sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return limit ? list.slice(0, limit) : list;
    },
    versionStats: function (designId) {
      var all = this.allVersionsOf(designId);
      var live = all.filter(function (v) { return !v.deletedAt; });
      return {
        total: live.length,
        deleted: all.length - live.length,
        current: this.currentVersion(designId)
      };
    },

    /* ======================================================================
       Phase 3 — Brand Identity
       Belongs to workspaceId. Holds identity data + curated *references*.
       ====================================================================== */
    brand: function () { return activeBrand(); },
    hasBrand: function () { return !!activeBrand(); },

    createBrand: function (data) {
      data = data || {};
      var existing = activeBrand();
      if (existing) return existing;
      /* recreating after a delete revives the same identity — one brand per
         workspace, never two */
      var revivable = dormantBrand();
      if (revivable) {
        revivable.deletedAt = null;
        revivable.updatedAt = new Date().toISOString();
        save();
        return revivable;
      }
      var now = new Date().toISOString();
      var brand = {
        id: uid('b'), workspaceId: ws(),
        name: data.name || '', englishName: data.englishName || '',
        tagline: data.tagline || '', description: data.description || '',
        positioning: data.positioning || '',
        location: data.location || '', foundedYear: data.foundedYear || '',
        keywords: [],
        logo: null, logoReverse: null, logoMark: null,
        colors: defaultColors(),
        fonts: { heading: 'Cormorant Garamond', body: 'Inter', accent: 'Inter' },
        brandAssets: [],
        featuredDesignIds: [], featuredCollectionIds: [],
        createdAt: now, updatedAt: now, deletedAt: null
      };
      state.brands.push(brand);
      save();
      return brand;
    },

    updateBrand: function (patch) {
      var b = activeBrand(); if (!b) return null;
      ['name', 'englishName', 'tagline', 'description', 'positioning', 'location', 'foundedYear']
        .forEach(function (k) { if (patch[k] !== undefined) b[k] = patch[k]; });
      b.updatedAt = new Date().toISOString();
      save();
      return b;
    },
    deleteBrand: function () {
      var b = activeBrand();
      if (!b) return false;
      b.deletedAt = new Date().toISOString();
      save();
      return true;
    },

    /* logo slots — the designer uploads assets they already own */
    setBrandLogo: function (slot, dataUrl) {
      var b = activeBrand(); if (!b) return;
      if (['logo', 'logoReverse', 'logoMark'].indexOf(slot) === -1) return;
      b[slot] = dataUrl; b.updatedAt = new Date().toISOString(); save();
    },
    removeBrandLogo: function (slot) {
      var b = activeBrand(); if (!b) return;
      b[slot] = null; b.updatedAt = new Date().toISOString(); save();
    },

    /* ---- colour system ---- */
    addBrandColor: function (c) {
      var b = activeBrand(); if (!b) return null;
      var col = {
        id: uid('bc'), name: c.name || '', nameEn: c.nameEn || c.name || '',
        hex: (c.hex || '#000000').toUpperCase(), type: c.type || 'primary'
      };
      b.colors.push(col); b.updatedAt = new Date().toISOString(); save();
      return col;
    },
    updateBrandColor: function (id, patch) {
      var b = activeBrand(); if (!b) return null;
      var c = byId(b.colors, id); if (!c) return null;
      ['name', 'nameEn', 'hex', 'type'].forEach(function (k) { if (patch[k] !== undefined) c[k] = patch[k]; });
      if (patch.hex) c.hex = patch.hex.toUpperCase();
      b.updatedAt = new Date().toISOString(); save();
      return c;
    },
    removeBrandColor: function (id) {
      var b = activeBrand(); if (!b) return;
      b.colors = b.colors.filter(function (c) { return c.id !== id; });
      b.updatedAt = new Date().toISOString(); save();
    },

    /* ---- type system ---- */
    setBrandFont: function (slot, name) {
      var b = activeBrand(); if (!b) return;
      if (['heading', 'body', 'accent'].indexOf(slot) === -1) return;
      b.fonts[slot] = name; b.updatedAt = new Date().toISOString(); save();
    },
    fontStack: function (name) {
      for (var i = 0; i < FONTS.length; i++) if (FONTS[i].name === name) return FONTS[i].stack;
      return '"Inter", sans-serif';
    },

    /* ---- visual language ---- */
    addBrandKeyword: function (kw) {
      var b = activeBrand(); if (!b) return false;
      kw = String(kw == null ? '' : kw).trim();
      if (!kw || b.keywords.indexOf(kw) !== -1) return false;
      b.keywords.push(kw); b.updatedAt = new Date().toISOString(); save();
      return true;
    },
    removeBrandKeyword: function (kw) {
      var b = activeBrand(); if (!b) return;
      b.keywords = b.keywords.filter(function (k) { return k !== kw; });
      b.updatedAt = new Date().toISOString(); save();
    },

    /* ---- brand assets: files that belong to the identity itself ---- */
    addBrandAssets: function (list) {
      var b = activeBrand(); if (!b) return 0;
      var n = 0;
      list.forEach(function (a) {
        b.brandAssets.push({
          id: uid('ba'), name: a.name, kind: a.kind || 'other',
          size: a.size || 0, type: a.type || '', dataUrl: a.dataUrl || null,
          createdAt: new Date().toISOString()
        });
        n++;
      });
      if (n) { b.updatedAt = new Date().toISOString(); save(); }
      return n;
    },
    removeBrandAsset: function (id) {
      var b = activeBrand(); if (!b) return;
      b.brandAssets = b.brandAssets.filter(function (a) { return a.id !== id; });
      b.updatedAt = new Date().toISOString(); save();
    },

    /* ---- curated references — never copies of the asset ---- */
    setFeaturedDesigns: function (ids) {
      var b = activeBrand(); if (!b) return;
      ids.forEach(function (id) {
        if (b.featuredDesignIds.length >= 12) return;      /* 3–12 representative works */
        var d = byId(state.designs, id);
        if (own(d) && !d.deletedAt && b.featuredDesignIds.indexOf(id) === -1) b.featuredDesignIds.push(id);
      });
      b.updatedAt = new Date().toISOString(); save();
    },
    removeFeaturedDesign: function (id) {
      var b = activeBrand(); if (!b) return;
      b.featuredDesignIds = b.featuredDesignIds.filter(function (x) { return x !== id; });
      b.updatedAt = new Date().toISOString(); save();
    },
    setFeaturedCollections: function (ids) {
      var b = activeBrand(); if (!b) return;
      ids.forEach(function (id) {
        var c = byId(state.collections, id);
        if (own(c) && !c.deletedAt && b.featuredCollectionIds.indexOf(id) === -1) b.featuredCollectionIds.push(id);
      });
      b.updatedAt = new Date().toISOString(); save();
    },
    removeFeaturedCollection: function (id) {
      var b = activeBrand(); if (!b) return;
      b.featuredCollectionIds = b.featuredCollectionIds.filter(function (x) { return x !== id; });
      b.updatedAt = new Date().toISOString(); save();
    },

    /* resolve references → live assets; dangling ids drop out silently */
    featuredDesigns: function () {
      var b = activeBrand(); if (!b) return [];
      return b.featuredDesignIds.map(function (id) { return byId(state.designs, id); })
        .filter(function (d) { return own(d) && !d.deletedAt; });
    },
    featuredCollections: function () {
      var b = activeBrand(); if (!b) return [];
      return b.featuredCollectionIds.map(function (id) { return byId(state.collections, id); })
        .filter(function (c) { return own(c) && !c.deletedAt; });
    },

    /* identity completeness — the "brand set-up status" meter on the overview */
    brandProgress: function () {
      var b = activeBrand();
      var checks = [
        { key: 'name',        ok: !!(b && b.name) },
        { key: 'tagline',     ok: !!(b && b.tagline) },
        { key: 'description', ok: !!(b && b.description) },
        { key: 'keywords',    ok: !!(b && b.keywords.length) },
        { key: 'logo',        ok: !!(b && b.logo) },
        { key: 'colors',      ok: !!(b && b.colors.length) },
        { key: 'fonts',       ok: !!(b && b.fonts && b.fonts.heading) }
      ];
      var done = checks.filter(function (c) { return c.ok; }).length;
      return {
        done: done, total: checks.length, pct: Math.round(done / checks.length * 100),
        missing: checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.key; })
      };
    },

    /* ======================================================================
       Phase 4 — Website
       The outward-facing layer of the workspace. It owns only *structure and
       references* (designIds / collectionIds); every word and pixel comes from
       the Brand and the design library built in phases 1–3.
       ====================================================================== */
    SITE_SECTIONS: ['hero', 'featured_works', 'featured_collections', 'about'],

    website: function () { return activeWebsite(); },
    hasWebsite: function () { return !!activeWebsite(); },

    createWebsite: function (data) {
      data = data || {};
      var existing = activeWebsite();
      if (existing) return existing;
      var revivable = dormantWebsite();
      if (revivable) {
        revivable.deletedAt = null;
        revivable.updatedAt = new Date().toISOString();
        save();
        return revivable;
      }
      var b = activeBrand();
      var now = new Date().toISOString();
      var site = {
        id: uid('w'), workspaceId: ws(),
        name: data.name || (b && b.name) || 'Studio',
        status: 'draft',
        slug: data.slug || slugify((b && (b.englishName || b.name)) || ''),
        settings: {},                       /* reserved for later phases */
        sections: [
          { type: 'hero',                 order: 1, headline: '', intro: '', designId: null },
          { type: 'featured_works',       order: 2, designIds: [] },
          { type: 'featured_collections', order: 3, collectionIds: [] },
          { type: 'about',                order: 4 }
        ],
        createdAt: now, updatedAt: now, deletedAt: null
      };
      state.websites.push(site);
      save();
      return site;
    },

    updateWebsite: function (patch) {
      var w = activeWebsite(); if (!w) return null;
      ['name', 'slug'].forEach(function (k) { if (patch[k] !== undefined) w[k] = patch[k]; });
      if (patch.slug !== undefined) w.slug = slugify(patch.slug);
      w.updatedAt = new Date().toISOString();
      save();
      return w;
    },
    setWebsiteStatus: function (status) {
      var w = activeWebsite(); if (!w) return null;
      w.status = status === 'published' ? 'published' : 'draft';
      touchWebsite();
      return w;
    },
    deleteWebsite: function () {
      var w = activeWebsite();
      if (!w) return false;
      w.deletedAt = new Date().toISOString();
      save();
      return true;
    },

    /* ---- home page structure ---- */
    siteSection: function (type) { return siteSection(type); },
    setSectionOrder: function (types) {
      var w = activeWebsite(); if (!w) return;
      var map = {};
      w.sections.forEach(function (s) { map[s.type] = s; });
      var out = [];
      types.forEach(function (t) {
        var s = map[t];
        if (s && out.indexOf(s) === -1) { s.order = out.length + 1; out.push(s); }
      });
      /* never lose a section the caller didn't mention */
      w.sections.forEach(function (s) {
        if (out.indexOf(s) === -1) { s.order = out.length + 1; out.push(s); }
      });
      w.sections = out;
      touchWebsite();
    },
    updateSection: function (type, patch) {
      var s = siteSection(type); if (!s) return null;
      Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
      touchWebsite();
      return s;
    },

    /* ---- featured work: references, never copies ---- */
    setWebsiteWorks: function (ids) {
      var s = siteSection('featured_works'); if (!s) return 0;
      var n = 0;
      ids.forEach(function (id) {
        if (s.designIds.length >= 12) return;          /* keep the home page readable */
        var d = byId(state.designs, id);
        if (own(d) && !d.deletedAt && s.designIds.indexOf(id) === -1) { s.designIds.push(id); n++; }
      });
      if (n) touchWebsite();
      return n;
    },
    removeWebsiteWork: function (id) {
      var s = siteSection('featured_works'); if (!s) return;
      s.designIds = s.designIds.filter(function (x) { return x !== id; });
      touchWebsite();
    },
    setWebsiteWorkOrder: function (ids) {
      var s = siteSection('featured_works'); if (!s) return;
      s.designIds = ids.slice();
      touchWebsite();
    },
    websiteWorks: function () {
      var s = siteSection('featured_works'); if (!s) return [];
      return s.designIds.map(function (id) { return byId(state.designs, id); })
        .filter(function (d) { return own(d) && !d.deletedAt; });
    },

    /* ---- featured collections: references, never copies ---- */
    setWebsiteCollections: function (ids) {
      var s = siteSection('featured_collections'); if (!s) return 0;
      var n = 0;
      ids.forEach(function (id) {
        var c = byId(state.collections, id);
        if (own(c) && !c.deletedAt && s.collectionIds.indexOf(id) === -1) { s.collectionIds.push(id); n++; }
      });
      if (n) touchWebsite();
      return n;
    },
    removeWebsiteCollection: function (id) {
      var s = siteSection('featured_collections'); if (!s) return;
      s.collectionIds = s.collectionIds.filter(function (x) { return x !== id; });
      touchWebsite();
    },
    websiteCollections: function () {
      var s = siteSection('featured_collections'); if (!s) return [];
      return s.collectionIds.map(function (id) { return byId(state.collections, id); })
        .filter(function (c) { return own(c) && !c.deletedAt; });
    },

    /* hero key visual: explicit choice → first featured work → none */
    heroDesign: function () {
      var s = siteSection('hero');
      if (!s) return null;
      var ok = function (d) { return own(d) && !d.deletedAt; };
      if (s.designId) {
        var d = byId(state.designs, s.designId);
        if (ok(d)) return d;
      }
      var w = siteSection('featured_works');
      if (w && w.designIds.length) {
        var first = byId(state.designs, w.designIds[0]);
        if (ok(first)) return first;
      }
      return null;
    },

    /* ======================================================================
       Phase 5 — Cloud space (folders + files)
       Every read/write is scoped to workspaceId. Deletes are soft
       (deletedAt) and recoverable from the recycle bin.
       Storage is the browser's localStorage — see storageReport().
       ====================================================================== */

    /* ---------- folders ---------- */
    folders: function (parentId) {
      return state.folders.filter(function (f) {
        return own(f) && !f.deletedAt && (f.parentFolderId || null) === (parentId || null);
      });
    },
    allFolders: function () { return state.folders.filter(function (f) { return own(f) && !f.deletedAt; }); },
    folder: function (id, includeDeleted) {
      var f = folderById(id);
      return (own(f) && (includeDeleted || !f.deletedAt)) ? f : null;
    },

    createFolder: function (data) {
      data = data || {};
      var parentId = data.parentFolderId || null;
      if (parentId) {
        var p = folderById(parentId);
        if (!own(p) || p.deletedAt) return null;
      }
      var name = uniqueName(data.name || '新文件夹', childFolders(parentId).map(function (f) { return f.name; }));
      var now = new Date().toISOString();
      var f = {
        id: uid('fd'), workspaceId: ws(), parentFolderId: parentId,
        name: name, createdAt: now, updatedAt: now, deletedAt: null
      };
      state.folders.push(f);
      save();
      return f;
    },
    renameFolder: function (id, name) {
      var f = folderById(id); if (!own(f)) return null;
      name = String(name || '').trim();
      if (!name) return null;
      var clash = childFolders(f.parentFolderId).filter(function (x) { return x.id !== id && x.name === name; });
      if (clash.length) return null;
      f.name = name; f.updatedAt = new Date().toISOString(); save();
      return f;
    },
    /* blocks: moving into itself, into a descendant (cycle), into a dead folder */
    moveFolder: function (id, parentId) {
      var f = folderById(id); if (!own(f)) return null;
      parentId = parentId || null;
      if (parentId === id) return null;
      if (parentId) {
        if (descendantFolderIds(id).indexOf(parentId) !== -1) return null;
        var p = folderById(parentId);
        if (!own(p) || p.deletedAt) return null;
      }
      var taken = childFolders(parentId).filter(function (x) { return x.id !== id; }).map(function (x) { return x.name; });
      f.name = uniqueName(f.name, taken);
      f.parentFolderId = parentId;
      f.updatedAt = new Date().toISOString(); save();
      return f;
    },
    canMoveFolder: function (id, parentId) {
      var f = folderById(id); if (!own(f)) return false;
      parentId = parentId || null;
      if (parentId === id) return false;
      if (parentId && descendantFolderIds(id).indexOf(parentId) !== -1) return false;
      if (parentId) { var p = folderById(parentId); if (!own(p) || p.deletedAt) return false; }
      return true;
    },
    /* soft delete — folder, descendants and everything inside */
    deleteFolder: function (id) {
      var f = folderById(id); if (!own(f)) return 0;
      var now = new Date().toISOString();
      var ids = [id].concat(descendantFolderIds(id));
      var n = 0;
      state.folders.forEach(function (x) {
        if (ids.indexOf(x.id) !== -1 && own(x) && !x.deletedAt) { x.deletedAt = now; x.updatedAt = now; n++; }
      });
      state.files.forEach(function (fl) {
        if (own(fl) && !fl.deletedAt && ids.indexOf(fl.folderId) !== -1) { fl.deletedAt = now; fl.updatedAt = now; n++; }
      });
      if (n) save();
      return n;
    },
    restoreFolder: function (id) {
      var f = folderById(id); if (!own(f)) return 0;
      var ids = [id].concat(descendantFolderIds(id));
      /* parent gone? re-attach at the root rather than leaving it orphaned */
      if (f.parentFolderId) {
        var p = folderById(f.parentFolderId);
        if (!own(p) || p.deletedAt) f.parentFolderId = null;
      }
      var now = new Date().toISOString(), n = 0;
      state.folders.forEach(function (x) {
        if (ids.indexOf(x.id) !== -1 && own(x) && x.deletedAt) { x.deletedAt = null; x.updatedAt = now; n++; }
      });
      state.files.forEach(function (fl) {
        if (own(fl) && fl.deletedAt && ids.indexOf(fl.folderId) !== -1) { fl.deletedAt = null; fl.updatedAt = now; n++; }
      });
      if (n) save();
      return n;
    },
    folderPath: function (id) {
      var out = [], cur = folderById(id), guard = 0;
      while (cur && own(cur) && guard++ < 50) {
        out.unshift(cur);
        cur = cur.parentFolderId ? folderById(cur.parentFolderId) : null;
      }
      return out;
    },
    /* direct children only — drives the "not empty" warning */
    folderMeta: function (id) {
      return {
        files: state.files.filter(function (fl) {
          return own(fl) && !fl.deletedAt && (fl.folderId || null) === (id || null);
        }).length,
        folders: childFolders(id).length
      };
    },

    /* ---------- files ---------- */
    filesIn: function (folderId) {
      return state.files.filter(function (fl) {
        return own(fl) && !fl.deletedAt && (fl.folderId || null) === (folderId || null);
      });
    },
    allFiles: function () { return state.files.filter(function (fl) { return own(fl) && !fl.deletedAt; }); },
    file: function (id, includeDeleted) {
      var f = fileById(id);
      return (own(f) && (includeDeleted || !f.deletedAt)) ? f : null;
    },

    /* returns { file, ok } so the uploader can show a real failure */
    addFile: function (data) {
      data = data || {};
      var folderId = data.folderId || null;
      if (folderId) {
        var f0 = folderById(folderId);
        if (!own(f0) || f0.deletedAt) return { file: null, ok: false, reason: 'folder' };
      }
      var bytes = data.dataUrl ? Math.round(String(data.dataUrl).length * 0.75) : 0;
      var room = can('file.create', { bytes: bytes });
      if (!room.ok) return { file: null, ok: false, reason: 'plan', message: room.message, code: room.code };
      var taken = state.files.filter(function (x) {
        return own(x) && !x.deletedAt && (x.folderId || null) === folderId;
      }).map(function (x) { return x.name; });
      var now = new Date().toISOString();
      var f = {
        id: uid('fl'), workspaceId: ws(),
        folderId: folderId,
        name: uniqueName(data.name || '未命名文件', taken),
        originalName: data.name || '',
        mimeType: data.mimeType || '',
        size: data.size || 0,
        storageKey: data.dataUrl ? 'local:' + uid('k') : null,
        thumbnailKey: data.dataUrl ? 'local:' + uid('t') : null,
        kind: data.kind || 'other',
        dataUrl: data.dataUrl || null,
        hasContent: !!data.dataUrl,
        note: data.note || '',
        source: 'upload',
        designIds: [],
        createdAt: now, updatedAt: now, deletedAt: null, lastAccessedAt: now
      };
      state.files.push(f);
      var okSave = save();
      if (!okSave) { state.files.pop(); return { file: null, ok: false, reason: 'quota' }; }
      return { file: f, ok: true };
    },
    renameFile: function (id, name) {
      var f = fileById(id); if (!own(f)) return null;
      name = String(name || '').trim(); if (!name) return null;
      var clash = state.files.filter(function (x) {
        return own(x) && !x.deletedAt && (x.folderId || null) === f.folderId && x.id !== id && x.name === name;
      });
      if (clash.length) return null;
      f.name = name; f.updatedAt = new Date().toISOString(); save();
      return f;
    },
    moveFiles: function (ids, folderId) {
      if (folderId) {
        var p = folderById(folderId);
        if (!own(p) || p.deletedAt) return 0;
      }
      var now = new Date().toISOString(), n = 0;
      ids.forEach(function (id) {
        var f = fileById(id); if (!own(f)) return;
        var taken = state.files.filter(function (x) {
          return own(x) && !x.deletedAt && (x.folderId || null) === (folderId || null) && x.id !== id;
        }).map(function (x) { return x.name; });
        f.name = uniqueName(f.name, taken);
        f.folderId = folderId || null;
        f.updatedAt = now; n++;
      });
      if (n) save();
      return n;
    },
    deleteFiles: function (ids) {
      var now = new Date().toISOString(), n = 0;
      ids.forEach(function (id) {
        var f = fileById(id);
        if (own(f) && !f.deletedAt) {
          f.deletedAt = now; f.updatedAt = now;
          /* keep the design links intact: a deleted file must not silently
             corrupt a design asset — links stay until explicitly removed */
          n++;
        }
      });
      if (n) save();
      return n;
    },
    restoreFiles: function (ids) {
      var now = new Date().toISOString(), n = 0;
      ids.forEach(function (id) {
        var f = fileById(id);
        if (own(f) && f.deletedAt) {
          if (f.folderId) {
            var p = folderById(f.folderId);
            if (!own(p) || p.deletedAt) f.folderId = null;   /* parent gone → root */
          }
          f.deletedAt = null; f.updatedAt = now; n++;
        }
      });
      if (n) save();
      return n;
    },
    purgeFiles: function (ids) {
      var before = state.files.length;
      state.files = state.files.filter(function (f) { return !(own(f) && ids.indexOf(f.id) !== -1); });
      if (state.files.length !== before) save();
      return before - state.files.length;
    },
    purgeFolders: function (ids) {
      var before = state.folders.length;
      state.folders = state.folders.filter(function (f) { return !(own(f) && ids.indexOf(f.id) !== -1); });
      if (state.folders.length !== before) save();
      return before - state.folders.length;
    },
    touchFile: function (id) {
      var f = fileById(id);
      if (own(f)) { f.lastAccessedAt = new Date().toISOString(); save(); }
    },

    /* ---------- recycle bin ---------- */
    trash: function () {
      return {
        files: state.files.filter(function (f) { return own(f) && f.deletedAt; }),
        folders: state.folders.filter(function (f) { return own(f) && f.deletedAt; })
      };
    },
    emptyTrash: function () {
      var self = this;
      var t = { files: [], folders: [], skipped: 0 };
      state.files = state.files.filter(function (f) {
        if (!own(f) || !f.deletedAt) return true;
        var refs = self.fileRefsAll(f.id);
        if (refs.designs.length || refs.versions.length) { t.skipped++; return true; }
        t.files.push(f.id);
        return false;
      });
      state.folders = state.folders.filter(function (f) {
        if (own(f) && f.deletedAt) { t.folders.push(f.id); return false; }
        return true;
      });
      save();
      return t;
    },

    /* ---------- links: file ↔ design asset ---------- */
    linkFileToDesign: function (fileId, designId) {
      var f = fileById(fileId), d = byId(state.designs, designId);
      if (!own(f) || !d || !own(d)) return false;
      if (f.designIds.indexOf(designId) === -1) f.designIds.push(designId);
      if (!d.fileIds) d.fileIds = [];
      if (d.fileIds.indexOf(fileId) === -1) d.fileIds.push(fileId);
      save();
      return true;
    },
    unlinkFileFromDesign: function (fileId, designId) {
      var f = fileById(fileId), d = byId(state.designs, designId);
      if (!own(f) || !d) return false;
      f.designIds = f.designIds.filter(function (x) { return x !== designId; });
      if (d.fileIds) d.fileIds = d.fileIds.filter(function (x) { return x !== fileId; });
      save();
      return true;
    },
    designsOfFile: function (fileId) {
      var f = fileById(fileId); if (!own(f)) return [];
      return f.designIds.map(function (id) { return byId(state.designs, id); })
        .filter(function (d) { return own(d) && !d.deletedAt; });
    },
    filesOfDesign: function (designId) {
      var d = byId(state.designs, designId);
      if (!own(d) || !d.fileIds) return [];
      return d.fileIds.map(function (id) { return fileById(id); })
        .filter(function (f) { return own(f) && !f.deletedAt; });
    },
    /* every file a design's versions point at — what the detail page shows */
    versionFilesOfDesign: function (designId) {
      var d = byId(state.designs, designId);
      if (!own(d)) return [];
      var out = [];
      (d.versions || []).forEach(function (v) {
        if (v.deletedAt) return;
        (v.fileIds || []).forEach(function (fid) {
          var f = fileById(fid);
          if (own(f) && !f.deletedAt && !out.some(function (x) { return x.id === f.id; })) out.push(f);
        });
      });
      return out;
    },
    /* where a file shows up, resolved live from existing links */
    fileContext: function (fileId) {
      var designs = this.designsOfFile(fileId);
      var projects = [], collections = [];
      designs.forEach(function (d) {
        if (d.projectId) {
          var p = byId(state.projects, d.projectId);
          if (own(p) && !p.deletedAt && !projects.some(function (x) { return x.id === p.id; })) projects.push(p);
        }
        (d.collectionIds || []).forEach(function (cid) {
          var c = byId(state.collections, cid);
          if (own(c) && !c.deletedAt && !collections.some(function (x) { return x.id === c.id; })) collections.push(c);
        });
      });
      var brandUse = null;
      var f = fileById(fileId);
      var b = activeBrand();
      if (b && b.brandAssets && f && f.dataUrl) {
        brandUse = b.brandAssets.filter(function (a) { return a.dataUrl && a.dataUrl === f.dataUrl; }).length || null;
      }
      return { designs: designs, projects: projects, collections: collections, brandAssetCount: brandUse };
    },

    /* ---------- storage report: measured, never guessed ---------- */
    storageReport: function () {
      var files = state.files.filter(function (f) { return own(f) && !f.deletedAt; });
      var logical = 0, stored = 0, noContent = 0;
      files.forEach(function (f) {
        logical += f.size || 0;
        if (f.dataUrl) stored += Math.round(f.dataUrl.length * 0.75);   /* base64 → bytes */
        else noContent++;
      });
      var byKind = {};
      files.forEach(function (f) { byKind[f.kind] = (byKind[f.kind] || 0) + 1; });
      return {
        fileCount: files.length,
        folderCount: state.folders.filter(function (f) { return own(f) && !f.deletedAt; }).length,
        trashedCount: state.files.filter(function (f) { return own(f) && f.deletedAt; }).length +
                      state.folders.filter(function (f) { return own(f) && f.deletedAt; }).length,
        logicalBytes: logical,
        storedBytes: stored,
        withoutContent: noContent,
        byKind: byKind,
        backend: 'localStorage',
        scope: '仅统计当前浏览器中本工作区上传并保存的文件'
      };
    },
    kindLabel: function (k, lang) { var x = FILEKIND[k] || FILEKIND.other; return lang === 'en' ? x.en : x.zh; },
    FILEKINDS: ['image', 'pdf', 'design', 'doc', 'font', 'archive', 'other'],

    /* ---- labels ---- */
    typeLabel: function (type, lang) { return taxLabel('type', type, lang); },
    metalLabel: function (m, lang) { return taxLabel('metal', m, lang); },
    stoneLabel: function (s, lang) { return taxLabel('stone', s, lang); },
    dstatLabel: function (s, lang) { return taxLabel('status', s, lang); },
    styleLabel: function (s, lang) { return taxLabel('style', s, lang); },
    themeLabel: function (s, lang) { return taxLabel('theme', s, lang); },
    dimLabel: function (dim, lang) { return taxLabel(dim, '', lang); },
    collStatusLabel: function (s, lang) { var t = CSTAT[s]; return t ? (lang === 'en' ? t.en : t.zh) : s; },
    projStatusLabel: function (s, lang) { var t = PSTAT[s]; return t ? (lang === 'en' ? t.en : t.zh) : s; },
    brandColorLabel: function (s, lang) { var t = BCOLOR[s]; return t ? (lang === 'en' ? t.en : t.zh) : s; },
    name: function (obj, lang) { return obj ? (lang === 'en' && obj.nameEn ? obj.nameEn : obj.name) : ''; },
    desc: function (obj, lang) { return obj ? (lang === 'en' && obj.descriptionEn ? obj.descriptionEn : obj.description) : ''; },
    uid: uid
  };
})();
