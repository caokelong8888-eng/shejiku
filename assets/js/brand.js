/* ==========================================================================
   STUDIO · Brand — Phase 3 · Brand Identity
   Overview (brand board) · details with live preview · logo · colour system
   · typography · visual language · brand assets · curated references.

   Brand data lives in StudioStore.brand and always belongs to workspaceId.
   Featured work / series are *references* to design assets — never copies.
   PC desktop only.
   ========================================================================== */
(function () {
  'use strict';

  var A = window.StudioApp, S = window.StudioStore, I = window.StudioI18n;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, t = A.t, lang = A.lang, img = A.img;

  var VIEWS = ['overview', 'info', 'logo', 'colors', 'fonts', 'language', 'assets'];

  function readView() {
    var v = (location.search.match(/[?&]view=([a-z]+)/) || [])[1];
    return VIEWS.indexOf(v) === -1 ? 'overview' : v;
  }

  var view = readView();
  var headEl = qs('#brandHead');
  var root = qs('#brandRoot');
  var panel = null;
  var saveTimer = null;
  var pending = {};

  function B() { return S.brand(); }

  function go(v) {
    if (VIEWS.indexOf(v) === -1) v = 'overview';
    view = v;
    try {
      history.replaceState(null, '', 'brand.html' + (v === 'overview' ? '' : '?view=' + v));
    } catch (e) {}
    render();
  }

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return '—';
    var n = parseInt(h, 16);
    return 'rgb(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')';
  }

  function typeColor(name) { return S.fontStack(name); }

  /* ======================================================================
     1 · empty state — no brand identity yet
     ====================================================================== */
  function renderEmpty() {
    headEl.innerHTML =
      '<div><h1 data-i18n="p.brand.title"></h1>' +
      '<p class="ph-sub" data-i18n="p.brand.sub"></p></div>';

    root.innerHTML =
      '<div class="empty-state">' +
        '<div class="es-mark"></div>' +
        '<h2 class="es-title">' + esc(t('be.title')) + '</h2>' +
        '<p class="es-hint">' + esc(t('be.hint')) + '</p>' +
        '<div class="es-btn"><button class="btn" id="beStart" type="button">' +
          '<span>' + esc(t('be.btn')) + '</span><span class="arr"></span></button></div>' +
      '</div>';

    qs('#beStart').addEventListener('click', function () {
      S.createBrand({});
      A.toast(t('t.brandCreated'));
      go('info');
    });
    I.apply(lang(), headEl);
  }

  /* ======================================================================
     2 · shell — page head + left brand nav + panel
     ====================================================================== */
  function renderShell() {
    var b = B();
    headEl.innerHTML =
      '<div><h1 data-i18n="p.brand.title"></h1>' +
        '<p class="ph-sub" data-i18n="p.brand.sub"></p></div>' +
      '<div class="ph-actions">' +
        (view === 'overview'
          ? '<button class="btn" id="brandEditBtn" type="button"><span data-i18n="brand.edit"></span><span class="arr"></span></button>'
          : '<button class="btn btn-ghost" id="brandBackBtn" type="button"><span data-i18n="bn.overview"></span><span class="arr"></span></button>') +
      '</div>';

    root.innerHTML =
      '<div class="brand-layout">' +
        '<aside class="brand-nav" id="brandNav"></aside>' +
        '<section class="brand-panel" id="brandPanel"></section>' +
      '</div>';

    panel = qs('#brandPanel');

    var nav = qs('#brandNav');
    nav.innerHTML = VIEWS.map(function (v) {
      return '<button type="button" data-view="' + v + '"' + (v === view ? ' class="is-on"' : '') + '>' +
             esc(t('bn.' + v)) + '</button>';
    }).join('');

    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-view]');
      if (!btn) return;
      if (pendingDirty()) flushNow();
      go(btn.getAttribute('data-view'));
    });

    var editBtn = qs('#brandEditBtn'), backBtn = qs('#brandBackBtn');
    if (editBtn) editBtn.addEventListener('click', function () { go('info'); });
    if (backBtn) backBtn.addEventListener('click', function () { go('overview'); });

    I.apply(lang(), headEl);
    I.apply(lang(), nav);
  }

  function pendingDirty() { return Object.keys(pending).length > 0; }
  function flushNow() {
    if (!pendingDirty()) return;
    clearTimeout(saveTimer);
    S.updateBrand(pending);
    pending = {};
  }

  /* ======================================================================
     3 · brand board — the identity preview
     ====================================================================== */
  function brandBoardHTML(b) {
    var d = S.featuredDesigns()[0];
    var c = S.featuredCollections()[0];
    var visual = d ? d.cover : (c ? c.cover : null);

    var logo = b.logo
      ? '<img src="' + b.logo + '" alt="">'
      : '<span class="bb-mark" aria-hidden="true"></span>';

    var meta = '';
    if (b.location || b.foundedYear) {
      meta = '<dl class="bb-meta">' +
        (b.location ? '<div><dt>' + esc(t('bf.location')) + '</dt><dd>' + esc(b.location) + '</dd></div>' : '') +
        (b.foundedYear ? '<div><dt>' + esc(t('bf.founded')) + '</dt><dd>' + esc(b.foundedYear) + '</dd></div>' : '') +
      '</dl>';
    }

    var kws = b.keywords.length
      ? '<div class="bb-kw">' + b.keywords.map(function (k) {
          return '<span class="chip is-on">' + esc(k) + '</span>';
        }).join('') + '</div>'
      : '';

    var swatches = b.colors.length
      ? '<div class="bb-swatches">' + b.colors.map(function (col) {
          return '<span class="bb-swatch" style="background:' + esc(col.hex) + '" title="' + esc(col.hex) + '"></span>';
        }).join('') + '</div>' +
        '<div class="bb-swatch-names">' + b.colors.map(function (col) {
          return '<span>' + esc(S.name(col, lang())) + '</span>';
        }).join('') + '</div>'
      : '<p class="text-muted-note">' + esc(t('bc.emptyHint')) + '</p>';

    var type = '<ul class="bb-type">' +
      [['heading', 'bfo.heading'], ['body', 'bfo.body'], ['accent', 'bfo.accent']].map(function (p) {
        return '<li><span class="t-role">' + esc(t(p[1])) + '</span>' +
               '<span class="t-name" style="font-family:' + typeColor(b.fonts[p[0]]) + '">' + esc(b.fonts[p[0]]) + '</span></li>';
      }).join('') + '</ul>';

    return '<div class="brand-board">' +
      '<div class="bb-main">' +
        '<div class="bb-logo">' + logo + '</div>' +
        '<h2 class="bb-name">' + esc(b.name || 'Studio') + '</h2>' +
        (b.englishName ? '<p class="bb-en">' + esc(b.englishName) + '</p>' : '') +
        '<p class="bb-tagline">' + esc(b.tagline || t('bb.noTagline')) + '</p>' +
        '<p class="bb-desc">' + esc(b.description || t('bb.noDesc')) + '</p>' +
        meta + kws +
      '</div>' +
      '<div class="bb-side">' +
        '<div class="bb-visual">' +
          (visual ? '<img src="' + img(visual) + '" alt="">'
                  : '<p class="bb-visual-empty">' + esc(t('bb.visualEmpty')) + '</p>') +
        '</div>' +
        '<div class="bb-block"><p class="bb-block-label">' + esc(t('bc.title')) + '</p>' + swatches + '</div>' +
        '<div class="bb-block"><p class="bb-block-label">' + esc(t('bb.typography')) + '</p>' + type + '</div>' +
      '</div>' +
    '</div>';
  }

  function progressHTML() {
    var p = S.brandProgress();
    var miss = p.missing.map(function (k) {
      return '<button class="bp-chip" type="button" data-goto="' + gotoFor(k) + '">' + esc(t('bp.m.' + k)) + '</button>';
    }).join('');
    return '<div class="bp-bar">' +
      '<div class="bp-left">' +
        '<p class="label">' + esc(t('bp.label')) + '</p>' +
        '<p class="bp-pct">' + p.pct + '%</p>' +
        '<p class="bp-count">' + esc(t('bp.progress', { done: p.done, total: p.total })) + '</p>' +
      '</div>' +
      '<div class="bp-meter"><i style="width:' + p.pct + '%"></i></div>' +
      '<div class="bp-missing">' + (miss || '<span class="bp-chip">' + esc(t('bn.overview')) + ' ✓</span>') + '</div>' +
    '</div>';
  }

  function gotoFor(k) {
    if (k === 'keywords') return 'language';
    if (k === 'logo') return 'logo';
    if (k === 'colors') return 'colors';
    if (k === 'fonts') return 'fonts';
    return 'info';
  }

  function renderOverview() {
    var b = B();
    var works = S.featuredDesigns();
    var series = S.featuredCollections();

    panel.innerHTML =
      '<div data-enter>' + brandBoardHTML(b) + '</div>' +
      '<div data-enter>' + progressHTML() + '</div>' +

      '<section class="brand-block" data-enter id="blockSeries">' +
        '<div class="brand-block-head">' +
          '<div><h2>' + esc(t('bx.series')) + '</h2><p>' + esc(t('bx.seriesSub')) + '</p></div>' +
          '<button class="btn btn-ghost btn-sm" id="addSeriesBtn" type="button">' +
            '<span>' + esc(t('bx.addSeries')) + '</span><span class="arr"></span></button>' +
        '</div>' +
        '<div id="seriesBody"></div>' +
      '</section>' +

      '<section class="brand-block" data-enter id="blockWorks">' +
        '<div class="brand-block-head">' +
          '<div><h2>' + esc(t('bx.works')) + '</h2><p>' + esc(t('bx.worksSub')) + '</p></div>' +
          '<button class="btn btn-ghost btn-sm" id="addWorksBtn" type="button">' +
            '<span>' + esc(t('bx.addWorks')) + '</span><span class="arr"></span></button>' +
        '</div>' +
        '<div id="worksBody"></div>' +
        '<p class="bb-ref-note">' + esc(t('bx.refNote')) + '</p>' +
      '</section>' +

      '<section class="brand-danger" data-enter>' +
        '<div><h3>' + esc(t('bn.overview')) + ' · ' + esc(t('act.delete')) + '</h3>' +
          '<p class="bd-note">' + esc(t('cf.deleteBrandHint')) + '</p></div>' +
        '<button class="btn btn-ghost btn-sm is-danger" id="delBrandBtn" type="button">' +
          '<span>' + esc(t('cf.deleteBrand')) + '</span></button>' +
      '</section>';

    /* --- featured series --- */
    var sBody = qs('#seriesBody');
    if (!series.length) {
      sBody.innerHTML =
        '<div class="feat-empty-series" style="margin-top:28px">' +
          '<p class="fe-title" style="font-family:var(--font-serif);font-size:23px">' + esc(t('bx.noSeries')) + '</p>' +
          '<p class="fe-hint" style="margin-top:10px;font-size:13.5px;color:var(--ink-3)">' + esc(t('bx.noSeriesHint')) + '</p>' +
          '<div class="es-btn"><button class="btn btn-sm" id="emptyAddSeries" type="button"><span>' + esc(t('bx.addSeries')) + '</span><span class="arr"></span></button></div>' +
        '</div>';
      qs('#emptyAddSeries').addEventListener('click', pickSeries);
    } else {
      sBody.innerHTML = '<div class="coll-grid feat-grid"></div>';
      var g = qs('.coll-grid', sBody);
      series.forEach(function (coll) {
        var wrap = document.createElement('div');
        wrap.className = 'cc-wrap';
        wrap.innerHTML =
          '<a class="coll-card" href="collection.html?id=' + coll.id + '">' +
            '<div class="cc-fig"><img src="' + img(coll.cover) + '" alt="" loading="lazy"></div>' +
            '<div class="cc-body">' +
              '<div class="cc-top"><h3 class="cc-name">' + esc(S.name(coll, lang())) + '</h3>' +
                '<span class="cc-cue">' + esc(t('act.viewCollection')) + '<span class="arr"></span></span></div>' +
              '<div class="cc-sub"><span>' + coll.designIds.length + ' ' + esc(t('unit.designs')) + '</span>' +
                (coll.status ? '<span class="pill pill--' + coll.status + ' pill--sm">' + esc(S.collStatusLabel(coll.status, lang())) + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</a>' +
          '<button class="cc-remove" type="button" data-remove="' + coll.id + '" title="' + esc(t('bx.remove')) + '">×</button>';
        g.appendChild(wrap);
      });
      g.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-remove]');
        if (!btn) return;
        e.preventDefault(); e.stopPropagation();
        var id = btn.getAttribute('data-remove');
        A.confirm({
          title: t('cf.removeFeaturedSeries'), hint: t('cf.removeFeaturedSeriesHint'),
          confirmLabel: t('bx.remove'), danger: true,
          onConfirm: function () { S.removeFeaturedCollection(id); A.toast(t('t.featuredRemoved')); render(); }
        });
      });
    }

    /* --- featured work --- */
    var wBody = qs('#worksBody');
    if (!works.length) {
      wBody.innerHTML =
        '<div class="feat-empty" style="margin-top:28px">' +
          '<p class="fe-title">' + esc(t('bx.noWorks')) + '</p>' +
          '<p class="fe-hint">' + esc(t('bx.noWorksHint')) + '</p>' +
          '<div class="es-btn"><button class="btn btn-sm" id="emptyAddWorks" type="button"><span>' + esc(t('bx.addWorks')) + '</span><span class="arr"></span></button></div>' +
        '</div>';
      qs('#emptyAddWorks').addEventListener('click', pickWorks);
    } else {
      wBody.innerHTML = '<div class="design-grid feat-grid"></div>';
      var wg = qs('.design-grid', wBody);
      works.forEach(function (d) {
        wg.appendChild(A.designCard(d, {
          showAssoc: false,
          removeButton: {
            label: t('bx.remove'),
            onClick: function (d2) {
              A.confirm({
                title: t('cf.removeFeaturedWork'), hint: t('cf.removeFeaturedWorkHint'),
                confirmLabel: t('bx.remove'), danger: true,
                onConfirm: function () { S.removeFeaturedDesign(d2.id); A.toast(t('t.featuredRemoved')); render(); }
              });
            }
          }
        }));
      });
    }

    qs('#addSeriesBtn').addEventListener('click', pickSeries);
    qs('#addWorksBtn').addEventListener('click', pickWorks);

    qs('#delBrandBtn').addEventListener('click', function () {
      A.confirm({
        title: t('cf.deleteBrand'), hint: t('cf.deleteBrandHint'),
        confirmLabel: t('act.delete'), danger: true,
        onConfirm: function () { S.deleteBrand(); A.toast(t('t.brandDeleted')); go('overview'); }
      });
    });

    panel.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-goto]');
      if (chip) go(chip.getAttribute('data-goto'));
    });
  }

  /* ---------- pickers for curated references ---------- */
  function pickSeries() {
    var b = B();
    var cur = b.featuredCollectionIds.slice();
    var list = S.collections();
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="pick-search"><input class="input" type="search" placeholder="' + esc(t('ph.searchCollection')) + '"></div>' +
      '<div class="pick-list"></div>' +
      '<div class="m-hint">' + esc(t('bx.refNote')) + '</div>';

    var listEl = qs('.pick-list', body);
    if (!list.length) {
      listEl.innerHTML = '<p class="pick-empty">' + esc(t('m.noCollections')) + '</p>';
    } else {
      list.forEach(function (c) {
        var on = cur.indexOf(c.id) !== -1;
        var row = document.createElement('label');
        row.className = 'pick-row';
        row.setAttribute('data-id', c.id);
        row.setAttribute('data-name', (c.name + ' ' + c.nameEn).toLowerCase());
        row.innerHTML =
          '<input type="checkbox"' + (on ? ' checked' : '') + '>' +
          '<span class="pick-thumb"><img src="' + img(c.cover) + '" alt=""></span>' +
          '<span class="pick-text"><span class="pick-name">' + esc(S.name(c, lang())) + '</span>' +
          '<span class="pick-sub">' + c.designIds.length + ' ' + esc(t('unit.designs')) +
          (on ? ' · ' + esc(t('m.selected')) : '') + '</span></span>';
        listEl.appendChild(row);
      });
    }

    var search = qs('input[type="search"]', body);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      qsa('.pick-row', listEl).forEach(function (r) {
        r.style.display = !q || r.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
      });
    });

    A.modal({
      title: t('m.pickBrandSeries'), body: body, size: 'sm',
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.confirm'), primary: true, onClick: function (c) {
          var now = qsa('.pick-row', listEl).filter(function (r) { return qs('input', r).checked; })
            .map(function (r) { return r.getAttribute('data-id'); });
          var added = now.filter(function (id) { return cur.indexOf(id) === -1; });
          var gone = cur.filter(function (id) { return now.indexOf(id) === -1; });
          if (added.length) S.setFeaturedCollections(added);
          gone.forEach(function (id) { S.removeFeaturedCollection(id); });
          c();
          if (added.length) A.toast(t('t.featuredSeriesAdded', { n: added.length }));
          else if (gone.length) A.toast(t('t.featuredRemoved'));
          render();
        } }
      ]
    });
  }

  function pickWorks() {
    var b = B();
    var exclude = b.featuredDesignIds.slice();
    var room = 12 - exclude.length;
    if (room <= 0) { A.toast(t('bx.limit')); return; }
    A.pickDesigns({
      exclude: exclude,
      title: t('m.pickBrandWorks'),
      onDone: function (ids) {
        if (!ids.length) return;
        S.setFeaturedDesigns(ids);
        A.toast(t('t.featuredAdded', { n: ids.length }));
        render();
      }
    });
  }

  /* ======================================================================
     4 · brand details — left edit, right live preview
     ====================================================================== */
  var FIELDS = [
    { k: 'name',        label: 'bf.name',        ph: 'bf.namePh',        long: false, wide: true },
    { k: 'englishName', label: 'bf.englishName', ph: 'bf.englishNamePh', long: false, wide: true },
    { k: 'tagline',     label: 'bf.tagline',     ph: 'bf.taglinePh',     long: false, wide: true },
    { k: 'description', label: 'bf.description', ph: 'bf.descriptionPh', long: true,  wide: true },
    { k: 'positioning', label: 'bf.positioning', ph: 'bf.positioningPh', long: false, wide: true },
    { k: 'location',    label: 'bf.location',    ph: 'bf.locationPh',    long: false, wide: false },
    { k: 'foundedYear', label: 'bf.founded',     ph: 'bf.foundedPh',     long: false, wide: false }
  ];

  function val(k) {
    if (pending[k] !== undefined) return pending[k];
    var b = B();
    return b && b[k] != null ? b[k] : '';
  }

  function previewHTML() {
    var b = B();
    var logo = b.logo
      ? '<img src="' + b.logo + '" alt="">'
      : '<span class="bb-mark" aria-hidden="true"></span>';
    var name = val('name') || 'Studio';
    var kws = b.keywords.length
      ? '<div class="bfp-kw">' + b.keywords.map(function (k) { return '<span class="chip is-on">' + esc(k) + '</span>'; }).join('') + '</div>'
      : '';
    return '<p class="bfp-label">' + esc(t('bf.preview')) + '</p>' +
      '<div class="bfp-logo">' + logo + '</div>' +
      '<h2 class="bfp-name" id="pName">' + esc(name) + '</h2>' +
      '<p class="bfp-en" id="pEn">' + esc(val('englishName')) + '</p>' +
      '<p class="bfp-tagline" id="pTag">' + esc(val('tagline') || t('bb.noTagline')) + '</p>' +
      '<p class="bfp-desc" id="pDesc">' + esc(val('description') || t('bb.noDesc')) + '</p>' +
      kws +
      '<div class="bfp-foot"><span>' + esc(t('meta.updated')) + ' ' + esc(I.rel(b.updatedAt)) + '</span>' +
        '<span id="pState">' + esc(t('t.saved')) + '</span></div>';
  }

  function renderInfo() {
    var b = B();
    function single(f) {
      return '<div class="field">' +
        '<label class="field-label">' + esc(t(f.label)) + '</label>' +
        '<input class="input" type="text" data-field="' + f.k + '" placeholder="' + esc(t(f.ph)) + '" value="' + esc(val(f.k)) + '">' +
      '</div>';
    }
    function pair(f1, f2) {
      return '<div class="field">' +
        '<label class="field-label">' + esc(t(f1.label)) + '</label>' +
        '<div class="field-row">' +
          '<input class="input" type="text" data-field="' + f1.k + '" placeholder="' + esc(t(f1.ph)) + '" value="' + esc(val(f1.k)) + '">' +
          '<input class="input" type="text" data-field="' + f2.k + '" placeholder="' + esc(t(f2.ph)) + '" value="' + esc(val(f2.k)) + '">' +
        '</div>' +
      '</div>';
    }
    function area(f) {
      return '<div class="field"><label class="field-label">' + esc(t(f.label)) + '</label>' +
        '<textarea class="textarea" data-field="' + f.k + '" placeholder="' + esc(t(f.ph)) + '">' + esc(val(f.k)) + '</textarea></div>';
    }

    var rows = '';
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i], next = FIELDS[i + 1];
      if (f.long) { rows += area(f); continue; }
      if (!f.wide && next && !next.wide && !next.long) { rows += pair(f, next); i++; continue; }
      rows += single(f);
    }

    panel.innerHTML =
      '<div class="bf-layout" data-enter>' +
        '<div>' +
          '<div class="bf-form">' + rows + '</div>' +
          '<p class="bf-note">' + esc(t('bf.hint')) + ' ' + esc(t('bf.contactSoon')) + '</p>' +
        '</div>' +
        '<aside class="bf-preview"><div class="bf-preview-card" id="bfPreview">' + previewHTML() + '</div></aside>' +
      '</div>';

    /* live binding — preview follows the keystroke, storage follows shortly after */
    qsa('[data-field]', panel).forEach(function (el) {
      el.addEventListener('input', function () {
        var k = el.getAttribute('data-field');
        pending[k] = el.value;
        refreshPreview(k);
        var st = qs('#pState');
        if (st) st.textContent = '···';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          S.updateBrand(pending);
          pending = {};
          var s2 = qs('#pState');
          if (s2) s2.textContent = t('t.saved');
        }, 300);
      });
    });
  }

  /* update only the preview card — keeps focus in the field being typed */
  function refreshPreview(changed) {
    var map = { name: '#pName', englishName: '#pEn', tagline: '#pTag', description: '#pDesc' };
    Object.keys(map).forEach(function (k) {
      var el = qs(map[k]);
      if (!el) return;
      var v = val(k);
      if (k === 'name') el.textContent = v || 'Studio';
      else if (k === 'tagline') el.textContent = v || t('bb.noTagline');
      else if (k === 'description') el.textContent = v || t('bb.noDesc');
      else el.textContent = v;
      el.style.display = (k === 'englishName' && !v) ? 'none' : '';
      if (k === changed) {
        el.classList.add('is-fresh');
        setTimeout(function () { el.classList.remove('is-fresh'); }, 90);
      }
    });
  }

  /* ======================================================================
     5 · logo slots
     ====================================================================== */
  var LOGO_SLOTS = [
    { slot: 'logo',        title: 'bg.primary', hint: 'bg.primaryHint', reverse: false },
    { slot: 'logoReverse', title: 'bg.reverse', hint: 'bg.reverseHint', reverse: true },
    { slot: 'logoMark',    title: 'bg.mark',    hint: 'bg.markHint',    reverse: false }
  ];

  function renderLogo() {
    var b = B();
    panel.innerHTML =
      '<div class="brand-sec-head" data-enter>' +
        '<h2>' + esc(t('bn.logo')) + '</h2>' +
        '<p>' + esc(t('bg.empty.hint')) + '</p>' +
      '</div>' +
      '<div class="logo-slots" data-enter id="logoSlots"></div>' +
      '<p class="ls-formats" style="margin-top:20px">' + esc(t('bg.formats')) + '</p>';

    var wrap = qs('#logoSlots');
    LOGO_SLOTS.forEach(function (cfg) {
      var data = b[cfg.slot];
      var el = document.createElement('div');
      el.className = 'logo-slot';
      el.setAttribute('data-slot', cfg.slot);
      el.innerHTML =
        '<div class="ls-fig' + (cfg.reverse ? ' is-reverse' : '') + '" data-fig>' +
          (data ? '<img src="' + data + '" alt="">'
                : '<div class="ls-empty"><div class="ls-empty-mark"></div><p>' + esc(t('bg.empty.title')) + '</p></div>') +
        '</div>' +
        '<div class="ls-body">' +
          '<h3 class="ls-title">' + esc(t(cfg.title)) + '</h3>' +
          '<p class="ls-hint">' + esc(t(cfg.hint)) + '</p>' +
          '<div class="ls-actions">' +
            '<button class="link-btn" type="button" data-act="upload">' + esc(t(data ? 'bg.replace' : 'bg.upload')) + '</button>' +
            (data ? '<button class="link-btn is-danger" type="button" data-act="delete">' + esc(t('bg.delete')) + '</button>' : '') +
          '</div>' +
        '</div>' +
        '<input type="file" accept="image/*" hidden>';
      wrap.appendChild(el);
      bindLogoSlot(el, cfg.slot);
    });
    A.enter();          /* re-entered after upload / delete */
  }

  function bindLogoSlot(el, slot) {
    var input = qs('input[type="file"]', el);
    var fig = qs('[data-fig]', el);

    function accept(file) {
      if (!file) return;
      if (!A.isImageFile(file)) { A.toast(t('t.uploadFailed')); return; }
      A.readImage(file, 520, function (dataUrl) {
        if (!dataUrl) { A.toast(t('t.uploadFailed')); return; }
        S.setBrandLogo(slot, dataUrl);
        A.toast(t('t.logoUploaded'));
        renderLogo();
      });
    }

    el.addEventListener('click', function (e) {
      var actEl = e.target.closest('[data-act]');
      var act = actEl ? actEl.getAttribute('data-act') : null;
      if (act === 'delete') {
        A.confirm({
          title: t('cf.removeAssetImg'), hint: t('cf.removeAssetImgHint'),
          confirmLabel: t('act.delete'), danger: true,
          onConfirm: function () { S.removeBrandLogo(slot); A.toast(t('t.logoRemoved')); renderLogo(); }
        });
        return;
      }
      if (act === 'upload' || e.target.closest('[data-fig]')) input.click();
    });

    input.addEventListener('change', function () {
      accept(input.files && input.files[0]);
      input.value = '';
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      fig.addEventListener(ev, function (e) { e.preventDefault(); fig.classList.add('is-drop'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      fig.addEventListener(ev, function (e) { e.preventDefault(); fig.classList.remove('is-drop'); });
    });
    fig.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      accept(f);
    });
  }

  /* ======================================================================
     6 · colour system
     ====================================================================== */
  function renderColors() {
    var b = B();
    var cards = b.colors.map(function (c) {
      return '<div class="swatch" data-id="' + c.id + '">' +
        '<div class="sw-actions">' +
          '<button class="sw-btn" type="button" data-act="edit" title="' + esc(t('bc.edit')) + '">' +
            '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14.5 5.5l4 4"/></svg>' +
          '</button>' +
          '<button class="sw-btn is-danger" type="button" data-act="del" title="' + esc(t('bc.remove')) + '">×</button>' +
        '</div>' +
        '<div class="sw-chip" style="background:' + esc(c.hex) + '" data-act="copy"></div>' +
        '<div class="sw-body">' +
          '<div class="sw-top"><h3 class="sw-name">' + esc(S.name(c, lang()) || '—') + '</h3>' +
            '<span class="sw-role">' + esc(S.brandColorLabel(c.type, lang())) + '</span></div>' +
          '<div class="sw-vals">' +
            '<button class="sw-hex" type="button" data-act="copy">' + esc(c.hex) + '</button>' +
            '<span>' + esc(hexToRgb(c.hex)) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="brand-sec-head" data-enter><div class="bsh-row">' +
        '<div><h2>' + esc(t('bc.title')) + '</h2><p>' + esc(t('bc.sub')) + '</p></div>' +
        '<button class="btn btn-sm" id="addColorBtn" type="button"><span>' + esc(t('bc.add')) + '</span><span class="arr"></span></button>' +
      '</div></div>' +
      '<div class="swatch-grid" data-enter id="swatchGrid">' + cards +
        '<button class="sw-add" type="button" id="swAdd"><span><span class="plus">+</span>' + esc(t('bc.add')) + '</span></button>' +
      '</div>';

    qs('#addColorBtn').addEventListener('click', function () { colorModal(null); });
    qs('#swAdd').addEventListener('click', function () { colorModal(null); });

    qs('#swatchGrid').addEventListener('click', function (e) {
      var card = e.target.closest('.swatch');
      if (!card) return;
      var id = card.getAttribute('data-id');
      var col = null;
      b.colors.forEach(function (c) { if (c.id === id) col = c; });
      if (!col) return;
      /* the edit button holds an inline svg — step up to the real target */
      var actEl = e.target.closest('[data-act]');
      var act = actEl ? actEl.getAttribute('data-act') : null;
      if (act === 'copy') { copyText(col.hex); return; }
      if (act === 'edit') { colorModal(col); return; }
      if (act === 'del') {
        A.confirm({
          title: t('cf.removeColor'), hint: t('cf.removeColorHint'),
          confirmLabel: t('act.delete'), danger: true,
          onConfirm: function () { S.removeBrandColor(id); A.toast(t('t.colorRemoved')); renderColors(); }
        });
      }
    });
    A.enter();
  }

  function copyText(txt) {
    var done = function () { A.toast(t('t.copied') + ' · ' + txt); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
    } else fallbackCopy(txt, done);
  }
  function fallbackCopy(txt, done) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    ta.remove();
  }

  function colorModal(existing) {
    var isEdit = !!existing;
    var c = existing || { name: '', hex: '#A9694B', type: 'primary' };
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="field"><label class="field-label">' + esc(t('bc.name')) + '</label>' +
        '<input class="input" id="cName" type="text" placeholder="' + esc(t('bc.namePh')) + '" value="' + esc(c.name || '') + '"></div>' +
      '<div class="field"><label class="field-label">' + esc(t('bc.hex')) + '</label>' +
        '<div class="color-preview-row">' +
          '<div class="color-preview" id="cPrev" style="background:' + esc(c.hex) + '"></div>' +
          '<input class="color-native" type="color" id="cNative" value="' + esc(c.hex) + '">' +
          '<input class="input" id="cHex" type="text" value="' + esc(c.hex) + '" style="max-width:150px">' +
        '</div>' +
        '<p class="m-hint" id="cRgb">' + esc(hexToRgb(c.hex)) + '</p></div>' +
      '<div class="field"><label class="field-label">' + esc(t('bc.role')) + '</label>' +
        '<div class="radio-row">' + Object.keys(S.BCOLOR).map(function (k) {
          return '<label class="radio-opt"><input type="radio" name="cType" value="' + k + '"' +
                 (c.type === k ? ' checked' : '') + '><span>' + esc(S.brandColorLabel(k, lang())) + '</span></label>';
        }).join('') + '</div></div>';

    function sync(hex) {
      if (!/^#[0-9a-fA-F]{6}$/.test(hex) && !/^#[0-9a-fA-F]{3}$/.test(hex)) return;
      qs('#cPrev', body).style.background = hex;
      qs('#cNative', body).value = hex.length === 4
        ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex;
      qs('#cHex', body).value = hex.toUpperCase();
      qs('#cRgb', body).textContent = hexToRgb(hex);
    }
    qs('#cNative', body).addEventListener('input', function (e) { sync(e.target.value); });
    qs('#cHex', body).addEventListener('input', function (e) { sync(e.target.value.trim()); });

    A.modal({
      title: isEdit ? t('bc.edit') : t('bc.add'), body: body,
      footer: [
        { label: t('act.cancel'), onClick: function (cl) { cl(); } },
        { label: isEdit ? t('act.save') : t('act.add'), primary: true, onClick: function (cl) {
          var name = qs('#cName', body).value.trim();
          var hex = qs('#cHex', body).value.trim().toUpperCase();
          var typeEl = qsa('input[name="cType"]', body).filter(function (r) { return r.checked; })[0];
          var type = typeEl ? typeEl.value : 'primary';
          if (!/^#[0-9A-F]{6}$/.test(hex)) { qs('#cHex', body).focus(); return; }
          if (isEdit) { S.updateBrandColor(existing.id, { name: name, nameEn: name, hex: hex, type: type }); A.toast(t('t.colorUpdated')); }
          else { S.addBrandColor({ name: name, nameEn: name, hex: hex, type: type }); A.toast(t('t.colorAdded')); }
          cl();
          renderColors();
        } }
      ]
    });
  }

  /* ======================================================================
     7 · typography
     ====================================================================== */
  function renderFonts() {
    var b = B();
    var items = [
      { slot: 'heading', label: 'bfo.heading', cls: 'is-heading', sample: 'bfo.headingSample' },
      { slot: 'body',    label: 'bfo.body',    cls: 'is-body',    sample: 'bfo.bodySample' },
      { slot: 'accent',  label: 'bfo.accent',  cls: 'is-accent',  sample: 'bfo.accentSample' }
    ].map(function (f) {
      var name = b.fonts[f.slot];
      return '<div class="font-item" data-slot="' + f.slot + '">' +
        '<div class="fi-head">' +
          '<div><p class="fi-role">' + esc(t(f.label)) + '</p>' +
            '<p class="fi-name" style="font-family:' + typeColor(name) + '">' + esc(name) + '</p></div>' +
          '<button class="link-btn" type="button" data-act="change">' + esc(t('bfo.change')) + '</button>' +
        '</div>' +
        '<p class="fi-sample ' + f.cls + '" style="font-family:' + typeColor(name) + '">' + esc(t(f.sample)) + '</p>' +
        '<p class="fi-meta"><span>' + esc(t('bfo.sample')) + '</span><span>Aa Bb Cc · 0123</span></p>' +
      '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="brand-sec-head" data-enter><h2>' + esc(t('bfo.title')) + '</h2><p>' + esc(t('bfo.sub')) + '</p></div>' +
      '<div data-enter id="fontList">' + items + '</div>';

    qs('#fontList').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act="change"]');
      if (!btn) return;
      var item = e.target.closest('.font-item');
      fontModal(item.getAttribute('data-slot'));
    });
    A.enter();
  }

  function fontModal(slot) {
    var cur = B().fonts[slot];
    var body = document.createElement('div');
    body.innerHTML = '<div class="pick-list">' + S.FONTS.map(function (f) {
      var stack = S.fontStack(f.name);
      return '<label class="pick-row" data-name="' + esc(f.name.toLowerCase()) + '">' +
        '<input type="radio" name="fnt" value="' + esc(f.name) + '"' + (f.name === cur ? ' checked' : '') + '>' +
        '<span class="pick-text">' +
          '<span class="pick-name" style="font-family:' + stack + '">' + esc(f.name) + '</span>' +
          '<span class="pick-sub" style="font-family:' + stack + '">Aa Bb Cc · 0123 · 器物之光</span>' +
        '</span></label>';
    }).join('') + '</div>';

    A.modal({
      title: t('bfo.change'), body: body, size: 'sm',
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.save'), primary: true, onClick: function (c) {
          var pick = qsa('input[name="fnt"]', body).filter(function (r) { return r.checked; })[0];
          if (pick) { S.setBrandFont(slot, pick.value); A.toast(t('t.fontUpdated')); }
          c();
          renderFonts();
        } }
      ]
    });
  }

  /* ======================================================================
     8 · visual language
     ====================================================================== */
  function renderLanguage() {
    var b = B();
    var chips = b.keywords.length
      ? b.keywords.map(function (k) {
          return '<span class="kw-chip">' + esc(k) +
            '<button class="kw-x" type="button" data-kw="' + esc(k) + '" aria-label="' + esc(t('act.remove')) + '"></button></span>';
        }).join('')
      : '<p class="text-muted-note">' + esc(t('bv.emptyHint')) + '</p>';

    var suggest = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) {
      var word = t('bv.kw' + i);
      var on = b.keywords.indexOf(word) !== -1;
      return '<button class="kw-suggest-chip' + (on ? ' is-on' : '') + '" type="button" data-suggest="' + esc(word) + '"' +
             (on ? ' disabled' : '') + '>' + esc(word) + '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="brand-sec-head" data-enter><h2>' + esc(t('bv.title')) + '</h2><p>' + esc(t('bv.sub')) + '</p></div>' +
      '<div data-enter>' +
        '<div class="kw-list" id="kwList">' + chips + '</div>' +
        '<div class="kw-input-row">' +
          '<input class="input" id="kwInput" type="text" placeholder="' + esc(t('bv.inputPh')) + '">' +
          '<button class="btn btn-sm" id="kwAdd" type="button"><span>' + esc(t('bv.add')) + '</span></button>' +
        '</div>' +
        '<div class="kw-suggest"><p class="label">' + esc(t('bv.suggest')) + '</p>' +
          '<div class="kw-suggest-row" id="kwSuggest">' + suggest + '</div></div>' +
      '</div>';

    function add(word) {
      word = String(word || '').trim();
      if (!word) return;
      var ok = S.addBrandKeyword(word);
      if (ok) A.toast(t('t.keywordAdded'));
      render();
    }

    qs('#kwList').addEventListener('click', function (e) {
      var x = e.target.closest('[data-kw]');
      if (!x) return;
      S.removeBrandKeyword(x.getAttribute('data-kw'));
      render();
    });
    qs('#kwSuggest').addEventListener('click', function (e) {
      var b2 = e.target.closest('[data-suggest]');
      if (!b2) return;
      S.addBrandKeyword(b2.getAttribute('data-suggest'));
      A.toast(t('t.keywordAdded'));
      render();
    });
    qs('#kwAdd').addEventListener('click', function () {
      var el = qs('#kwInput');
      add(el.value.trim());
    });
    qs('#kwInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); add(e.target.value.trim()); }
    });
  }

  /* ======================================================================
     9 · brand assets
     ====================================================================== */
  var KIND_LABEL = {
    image: { zh: '图片', en: 'Image' }, pdf: { zh: 'PDF', en: 'PDF' },
    design: { zh: '设计文件', en: 'Design file' }, doc: { zh: '文档', en: 'Document' },
    font: { zh: '字体', en: 'Font' }, archive: { zh: '压缩包', en: 'Archive' },
    other: { zh: '其他', en: 'Other' }
  };
  function kindLabel(k) { var x = KIND_LABEL[k] || KIND_LABEL.other; return lang() === 'en' ? x.en : x.zh; }

  function renderAssets() {
    var b = B();
    var rows = b.brandAssets.slice().reverse().map(function (a) {
      var ext = (a.name.split('.').pop() || '').slice(0, 4);
      var thumb = a.dataUrl
        ? '<span class="ar-thumb"><img src="' + a.dataUrl + '" alt=""></span>'
        : '<span class="ar-thumb"><span class="ar-ext">' + esc(ext) + '</span></span>';
      return '<div class="asset-row" data-id="' + a.id + '">' +
        thumb +
        '<div><p class="ar-name">' + esc(a.name) + '</p>' +
          '<p class="ar-sub">' + esc(A.prettySize(a.size)) + ' · ' + esc(I.date(a.createdAt)) + '</p></div>' +
        '<span class="ar-kind">' + esc(kindLabel(a.kind)) + '</span>' +
        '<span class="ar-sub">' + (a.dataUrl ? esc(t('ba.imageNote').split('，')[0]) : '—') + '</span>' +
        '<button class="ar-del" type="button" data-act="del" title="' + esc(t('ba.delete')) + '">×</button>' +
      '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="brand-sec-head" data-enter><h2>' + esc(t('ba.title')) + '</h2><p>' + esc(t('ba.sub')) + '</p></div>' +
      '<div class="upload-zone" id="uzone" data-enter>' +
        '<div class="uz-icon"></div>' +
        '<p class="uz-title">' + esc(t('ba.upload')) + '</p>' +
        '<p class="uz-note">' + esc(t('ba.drop')) + '</p>' +
        '<p class="uz-note">' + esc(t('ba.formats')) + '</p>' +
        '<input type="file" multiple hidden>' +
      '</div>' +
      '<p class="bf-note">' + esc(t('ba.imageNote')) + ' ' + esc(t('ba.localNote')) + '</p>' +
      (b.brandAssets.length
        ? '<div class="asset-rows" id="assetRows">' + rows + '</div>'
        : '<div class="empty-state" style="margin-top:24px">' +
            '<div class="es-mark"></div>' +
            '<h2 class="es-title">' + esc(t('ba.empty')) + '</h2>' +
            '<p class="es-hint">' + esc(t('ba.emptyHint')) + '</p>' +
          '</div>');

    var zone = qs('#uzone');
    var input = qs('input[type="file"]', zone);

    function ingest(files) {
      if (!files || !files.length) return;
      var imgs = Array.prototype.filter.call(files, function (f) { return A.isImageFile(f); });
      var rest = Array.prototype.filter.call(files, function (f) { return !A.isImageFile(f); });
      var out = [];
      var todo = imgs.length;
      var finish = function () {
        /* non-image files: metadata only this phase — no cloud drive yet */
        rest.forEach(function (f) {
          out.push({ name: f.name, kind: A.fileKind(f), size: f.size, type: f.type, dataUrl: null });
        });
        var n = S.addBrandAssets(out);
        if (n) A.toast(t('t.assetUploaded', { n: n }));
        renderAssets();
      };
      if (!todo) { finish(); return; }
      imgs.forEach(function (f) {
        A.readImage(f, 900, function (dataUrl) {
          out.push({ name: f.name, kind: 'image', size: f.size, type: f.type, dataUrl: dataUrl });
          if (--todo === 0) finish();
        });
      });
    }

    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { ingest(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-drop'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-drop'); });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) ingest(e.dataTransfer.files);
    });

    var rowsEl = qs('#assetRows');
    if (rowsEl) rowsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act="del"]');
      if (!btn) return;
      var row = e.target.closest('.asset-row');
      var id = row.getAttribute('data-id');
      A.confirm({
        title: t('cf.removeAsset'), hint: t('cf.removeAssetHint'),
        confirmLabel: t('act.delete'), danger: true,
        onConfirm: function () { S.removeBrandAsset(id); A.toast(t('t.assetRemoved')); renderAssets(); }
      });
    });
    A.enter();
  }

  /* ======================================================================
     10 · render dispatcher
     ====================================================================== */
  function render() {
    view = VIEWS.indexOf(view) === -1 ? 'overview' : view;
    flushNow();                     /* don't lose half-typed brand details */
    pending = {};
    if (!S.hasBrand()) { renderEmpty(); return; }
    renderShell();
    if (view === 'overview') renderOverview();
    else if (view === 'info') renderInfo();
    else if (view === 'logo') renderLogo();
    else if (view === 'colors') renderColors();
    else if (view === 'fonts') renderFonts();
    else if (view === 'language') renderLanguage();
    else if (view === 'assets') renderAssets();
    I.apply(lang(), panel);
    A.enter();          /* view switches build fresh [data-enter] nodes — fade them in */
  }

  window.addEventListener('popstate', function () { view = readView(); render(); });

  document.addEventListener('studio:quota', function () { A.toast(t('t.quota')); });

  A.page(render);
})();
