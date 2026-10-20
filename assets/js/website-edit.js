/* ==========================================================================
   STUDIO · Website editor (Phase 4)
   Left: home page structure (draggable) · Centre: live scaled preview
   Right: settings for the selected module.

   Everything the site shows is a reference: featured work points at
   designIds, featured series at collectionIds. Editing a design in the
   library changes the site — nothing is copied.
   ========================================================================== */
(function () {
  'use strict';

  var A = window.StudioApp, S = window.StudioStore, I = window.StudioI18n;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, t = A.t, lang = A.lang, img = A.img;

  var structEl = qs('#wpeStruct'), stageEl = qs('#wpeStage'), setEl = qs('#wpeSettings');
  if (!structEl) return;

  var sel = 'hero';
  var frame, wrap, scaler;
  var saveTimer = null;

  function W() { return S.website(); }

  /* ---------- live preview plumbing ---------- */
  function refresh() {
    if (!frame) return;
    try {
      var cw = frame.contentWindow;
      if (cw && typeof cw.SiteRender === 'function') { cw.SiteRender(); return; }
      if (cw) cw.postMessage('site-render', '*');
    } catch (e) {}
  }

  function fit(h) {
    if (!wrap) return;
    h = h || 900;
    var s = wrap.clientWidth / 1440;
    if (s > 1) s = 1;
    scaler.style.transform = 'scale(' + s + ')';
    scaler.style.height = h + 'px';
    wrap.style.height = Math.round(h * s) + 'px';
  }

  function buildStage() {
    stageEl.innerHTML =
      '<div class="wpe-frame-wrap" id="wpeWrap">' +
        '<div class="frame-loading" id="wpeLoading">' + esc(t('web.loading')) + '</div>' +
        '<div class="wpe-scaler" id="wpeScaler">' +
          '<iframe id="wpeFrame" src="site.html?preview=1" scrolling="no" title="' + esc(t('web.preview')) + '"></iframe>' +
        '</div>' +
      '</div>';
    wrap = qs('#wpeWrap'); scaler = qs('#wpeScaler'); frame = qs('#wpeFrame');
    fit();
    frame.addEventListener('load', function () {
      var ld = qs('#wpeLoading'); if (ld) ld.classList.add('is-off');
      fit(wrap.getAttribute('data-h') * 1 || 900);
    });
    window.addEventListener('resize', function () { fit(wrap.getAttribute('data-h') * 1 || 900); });
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.type === 'site-height' && frame && e.source === frame.contentWindow) {
        wrap.setAttribute('data-h', d.height);
        fit(d.height);
      }
    });
  }

  /* ---------- saving feedback ---------- */
  function touch(label) {
    var el = qs('#wpeSave');
    if (el) el.textContent = t('web.saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var e2 = qs('#wpeSave');
      if (e2) e2.textContent = t('web.savedAt') + ' ' + I.rel(new Date().toISOString());
    }, 420);
    if (label) refresh();
  }

  /* ---------- structure column ---------- */
  function sectionSub(type) {
    if (type === 'hero') {
      var s = S.siteSection('hero');
      var d = S.heroDesign();
      return (s && s.headline ? s.headline : (S.brand().name || 'Studio')) +
             (d ? ' · ' + S.name(d, lang()) : '');
    }
    if (type === 'featured_works') return S.websiteWorks().length + ' ' + t('unit.designs');
    if (type === 'featured_collections') return S.websiteCollections().length + ' ' + t('unit.collections');
    if (type === 'about') return t('wsec.aboutSub');
    return '';
  }

  function renderStruct() {
    var w = W();
    var list = w.sections.slice().sort(function (a, b) { return a.order - b.order; });
    structEl.innerHTML =
      '<div class="wpe-struct-head">' +
        '<p class="label">' + esc(t('web.structure')) + '</p>' +
        '<p class="wpe-struct-home">' + esc(t('web.home')) + '</p>' +
      '</div>' +
      '<div class="wpe-struct-list" id="wpeList">' +
        list.map(function (s) {
          return '<button class="wpe-item' + (s.type === sel ? ' is-on' : '') + '" type="button" ' +
            'data-type="' + s.type + '" draggable="true">' +
            '<span class="wpe-grip" aria-hidden="true"></span>' +
            '<span class="wpe-item-text">' +
              '<span class="wpe-item-name">' + esc(t('wsec.' + s.type)) + '</span>' +
              '<span class="wpe-item-sub">' + esc(sectionSub(s.type)) + '</span>' +
            '</span>' +
          '</button>';
        }).join('') +
      '</div>' +
      '<p class="wpe-drag-hint">' + esc(t('web.dragHint')) + '</p>';

    var listEl = qs('#wpeList');
    listEl.addEventListener('click', function (e) {
      var item = e.target.closest('.wpe-item');
      if (!item || item.classList.contains('is-dragging')) return;
      sel = item.getAttribute('data-type');
      renderStruct();
      renderSettings();
    });
    enableStructDrag(listEl);
  }

  function enableStructDrag(listEl) {
    var dragType = null;
    qsa('.wpe-item', listEl).forEach(function (item) {
      item.addEventListener('dragstart', function (e) {
        dragType = item.getAttribute('data-type');
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragType); } catch (err) {}
      });
      item.addEventListener('dragend', function () {
        item.classList.remove('is-dragging');
        qsa('.drag-over', listEl).forEach(function (x) { x.classList.remove('drag-over'); });
        dragType = null;
      });
      item.addEventListener('dragover', function (e) {
        if (!dragType || dragType === item.getAttribute('data-type')) return;
        e.preventDefault();
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', function () { item.classList.remove('drag-over'); });
      item.addEventListener('drop', function (e) {
        e.preventDefault();
        item.classList.remove('drag-over');
        var to = item.getAttribute('data-type');
        if (!dragType || to === dragType) return;
        var types = qsa('.wpe-item', listEl).map(function (x) { return x.getAttribute('data-type'); });
        var from = types.indexOf(dragType);
        types.splice(from, 1);
        types.splice(types.indexOf(to), 0, dragType);
        S.setSectionOrder(types);
        dragType = null;
        A.toast(t('t.reordered'));
        renderStruct();
        refresh();
      });
    });
  }

  /* ---------- settings column ---------- */
  function renderSettings() {
    var s = S.siteSection(sel);
    if (!s) { setEl.innerHTML = ''; return; }
    var lock = S.can('website.edit');
    var body = '';
    if (sel === 'hero') {
      var heroD = S.siteSection('hero').designId ? S.design(S.siteSection('hero').designId) : null;
      body =
        '<div class="field"><label class="field-label">' + esc(t('wsec.heroHeadline')) + '</label>' +
          '<input class="input" id="shHeadline" type="text" placeholder="' + esc(t('wsec.heroHeadlinePh')) + '" value="' + esc(s.headline || '') + '"></div>' +
        '<div class="field"><label class="field-label">' + esc(t('wsec.heroIntro')) + '</label>' +
          '<textarea class="textarea" id="shIntro" placeholder="' + esc(t('wsec.heroIntroPh')) + '">' + esc(s.intro || '') + '</textarea></div>' +
        '<div class="field"><label class="field-label">' + esc(t('wsec.heroVisual')) + '</label>' +
          '<div class="wpe-visual">' +
            (heroD
              ? '<span class="wpe-visual-fig"><img src="' + img(heroD.cover) + '" alt=""></span>' +
                '<span class="wpe-visual-name">' + esc(S.name(heroD, lang())) + '</span>'
              : '<span class="wpe-visual-empty">' + esc(t('wsec.heroVisualEmpty')) + '</span>') +
          '</div>' +
          '<div class="wpe-visual-acts">' +
            '<button class="link-btn" type="button" id="shPickVisual">' + esc(heroD ? t('wsec.changeVisual') : t('wsec.pickVisual')) + '</button>' +
            (heroD ? '<button class="link-btn is-danger" type="button" id="shClearVisual">' + esc(t('act.remove')) + '</button>' : '') +
          '</div>' +
          '<p class="m-hint">' + esc(t('wsec.heroVisualHint')) + '</p>' +
        '</div>';
    } else if (sel === 'featured_works') {
      var works = S.websiteWorks();
      body =
        '<div class="wpe-set-head">' +
          '<p class="wpe-set-count">' + works.length + ' ' + esc(t('unit.designs')) + '</p>' +
          '<button class="link-btn" type="button" id="swAddWorks">' + esc(t('wsec.addWorks')) + '</button>' +
        '</div>' +
        (works.length
          ? '<div class="wpe-work-list" id="swWorkList">' + works.map(function (d) {
              return '<div class="wpe-work" data-id="' + d.id + '" draggable="true">' +
                '<span class="wpe-work-fig"><img src="' + img(d.cover) + '" alt=""></span>' +
                '<a class="wpe-work-name" href="design.html?id=' + d.id + '" title="' + esc(t('wsec.openSource')) + '">' +
                  esc(S.name(d, lang())) + '</a>' +
                '<button class="wpe-work-x" type="button" data-remove="' + d.id + '" title="' + esc(t('act.remove')) + '">×</button>' +
              '</div>';
            }).join('') + '</div>' +
            '<p class="wpe-drag-hint">' + esc(t('web.dragWorkHint')) + '</p>'
          : '<p class="wpe-empty">' + esc(t('wsec.noWorks')) + '</p>') +
        '<p class="m-hint">' + esc(t('wsec.refNote')) + '</p>';
    } else if (sel === 'featured_collections') {
      var colls = S.websiteCollections();
      body =
        '<div class="wpe-set-head">' +
          '<p class="wpe-set-count">' + colls.length + ' ' + esc(t('unit.collections')) + '</p>' +
          '<button class="link-btn" type="button" id="swAddColls">' + esc(t('wsec.addSeries')) + '</button>' +
        '</div>' +
        (colls.length
          ? '<div class="wpe-work-list">' + colls.map(function (c) {
              return '<div class="wpe-work" data-id="' + c.id + '">' +
                '<span class="wpe-work-fig"><img src="' + img(c.cover) + '" alt=""></span>' +
                '<span class="wpe-work-name">' + esc(S.name(c, lang())) + '</span>' +
                '<button class="wpe-work-x" type="button" data-remove-coll="' + c.id + '" title="' + esc(t('act.remove')) + '">×</button>' +
              '</div>';
            }).join('') + '</div>'
          : '<p class="wpe-empty">' + esc(t('wsec.noSeries')) + '</p>') +
        '<p class="m-hint">' + esc(t('wsec.refNote')) + '</p>';
    } else if (sel === 'about') {
      body =
        '<p class="wpe-note">' + esc(t('wsec.aboutNote')) + '</p>' +
        '<dl class="meta-rows" style="margin-top:16px">' +
          '<div class="meta-row"><dt>' + esc(t('bf.description')) + '</dt><dd>' + (S.brand().description ? '✓' : '—') + '</dd></div>' +
          '<div class="meta-row"><dt>' + esc(t('bf.positioning')) + '</dt><dd>' + (S.brand().positioning ? '✓' : '—') + '</dd></div>' +
          '<div class="meta-row"><dt>' + esc(t('bv.title')) + '</dt><dd>' + S.brand().keywords.length + '</dd></div>' +
        '</dl>' +
        '<a class="btn btn-ghost btn-sm" style="margin-top:20px" href="brand.html?view=info">' +
          '<span>' + esc(t('web.editBrandInfo')) + '</span><span class="arr"></span></a>';
    }

    setEl.innerHTML =
      '<div class="wpe-set-head-main"><h2>' + esc(t('wsec.' + sel)) + '</h2></div>' +
      (lock.ok ? '' : '<p class="web-lock">' + esc(t('web.locked')) +
        '<a class="link-btn" href="pricing.html">' + esc(t('plan.compare')) + '</a></p>') +
      '<div class="wpe-set-body">' + body + '</div>';

    bindSettings();
  }

  function bindSettings() {
    var h = qs('#shHeadline'), intro = qs('#shIntro');
    if (h) h.addEventListener('input', function () {
      S.updateSection('hero', { headline: h.value });
      touch(true); renderStruct();
    });
    if (intro) intro.addEventListener('input', function () {
      S.updateSection('hero', { intro: intro.value });
      touch(true);
    });
    var pv = qs('#shPickVisual');
    if (pv) pv.addEventListener('click', pickHeroVisual);
    var cv = qs('#shClearVisual');
    if (cv) cv.addEventListener('click', function () {
      S.updateSection('hero', { designId: null });
      touch(true); renderSettings(); renderStruct();
    });

    var aw = qs('#swAddWorks');
    if (aw) aw.addEventListener('click', pickWorks);
    var ac = qs('#swAddColls');
    if (ac) ac.addEventListener('click', pickCollections);

    var wl = qs('#swWorkList');
    if (wl) enableWorkDrag(wl);
  }

  /* reorder featured work by dragging */
  function enableWorkDrag(listEl) {
    var dragId = null;
    qsa('.wpe-work', listEl).forEach(function (row) {
      row.addEventListener('dragstart', function (e) {
        dragId = row.getAttribute('data-id');
        row.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragId); } catch (err) {}
      });
      row.addEventListener('dragend', function () {
        row.classList.remove('is-dragging');
        qsa('.drag-over', listEl).forEach(function (x) { x.classList.remove('drag-over'); });
        dragId = null;
      });
      row.addEventListener('dragover', function (e) {
        if (!dragId || dragId === row.getAttribute('data-id')) return;
        e.preventDefault();
        row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', function () { row.classList.remove('drag-over'); });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        row.classList.remove('drag-over');
        var to = row.getAttribute('data-id');
        if (!dragId || to === dragId) return;
        var ids = qsa('.wpe-work', listEl).map(function (x) { return x.getAttribute('data-id'); });
        ids.splice(ids.indexOf(dragId), 1);
        ids.splice(ids.indexOf(to), 0, dragId);
        S.setWebsiteWorkOrder(ids);
        dragId = null;
        A.toast(t('t.reordered'));
        touch(true); renderSettings(); renderStruct();
      });
    });
  }

  /* ---------- pickers ---------- */
  function pickWorks() {
    var s = S.siteSection('featured_works');
    var exclude = s.designIds.slice();
    if (exclude.length >= 12) { A.toast(t('web.limitWorks')); return; }
    A.pickDesigns({
      exclude: exclude,
      title: t('wsec.pickWorks'),
      onDone: function (ids) {
        if (!ids.length) return;
        S.setWebsiteWorks(ids);
        A.toast(t('t.addedDesigns', { n: ids.length }));
        touch(true); renderSettings(); renderStruct();
      }
    });
  }

  function pickCollections() {
    var cur = S.siteSection('featured_collections').collectionIds.slice();
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="pick-search"><input class="input" type="search" placeholder="' + esc(t('ph.searchCollection')) + '"></div>' +
      '<div class="pick-list"></div>' +
      '<div class="m-hint">' + esc(t('wsec.refNote')) + '</div>';
    var listEl = qs('.pick-list', body);
    if (!S.collections().length) listEl.innerHTML = '<p class="pick-empty">' + esc(t('m.noCollections')) + '</p>';
    S.collections().forEach(function (c) {
      var on = cur.indexOf(c.id) !== -1;
      var row = document.createElement('label');
      row.className = 'pick-row';
      row.setAttribute('data-id', c.id);
      row.setAttribute('data-name', (c.name + ' ' + c.nameEn).toLowerCase());
      row.innerHTML =
        '<input type="checkbox"' + (on ? ' checked' : '') + '>' +
        '<span class="pick-thumb"><img src="' + img(c.cover) + '" alt=""></span>' +
        '<span class="pick-text"><span class="pick-name">' + esc(S.name(c, lang())) + '</span>' +
        '<span class="pick-sub">' + c.designIds.length + ' ' + esc(t('unit.designs')) + '</span></span>';
      listEl.appendChild(row);
    });
    var search = qs('input[type="search"]', body);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      qsa('.pick-row', listEl).forEach(function (r) {
        r.style.display = !q || r.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
      });
    });
    A.modal({
      title: t('wsec.pickSeries'), body: body, size: 'sm',
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.confirm'), primary: true, onClick: function (c) {
          var now = qsa('.pick-row', listEl).filter(function (r) { return qs('input', r).checked; })
            .map(function (r) { return r.getAttribute('data-id'); });
          var added = now.filter(function (id) { return cur.indexOf(id) === -1; });
          var gone = cur.filter(function (id) { return now.indexOf(id) === -1; });
          if (added.length) S.setWebsiteCollections(added);
          gone.forEach(function (id) { S.removeWebsiteCollection(id); });
          c();
          if (added.length) A.toast(t('t.addedCollections', { n: added.length }));
          touch(true); renderSettings(); renderStruct();
        } }
      ]
    });
  }

  function pickHeroVisual() {
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="pick-search"><input class="input" type="search" placeholder="' + esc(t('ph.search')) + '"></div>' +
      '<div class="pick-grid"></div>';
    var grid = qs('.pick-grid', body);
    var av = S.filterDesigns({});
    av.forEach(function (d) {
      var cell = document.createElement('label');
      cell.className = 'pick-cell';
      cell.setAttribute('data-id', d.id);
      cell.setAttribute('data-name', (d.name + ' ' + d.nameEn).toLowerCase());
      cell.innerHTML =
        '<span class="pick-fig"><img src="' + img(d.cover) + '" alt="" loading="lazy"></span>' +
        '<span class="pick-name">' + esc(S.name(d, lang())) + '</span>' +
        '<span class="pick-sub">' + esc(S.typeLabel(d.type, lang())) + ' · ' + d.year + '</span>';
      cell.addEventListener('click', function () {
        S.updateSection('hero', { designId: d.id });
        closeModal();
        A.toast(t('t.saved'));
        touch(true); renderSettings(); renderStruct();
      });
      grid.appendChild(cell);
    });
    var search = qs('input[type="search"]', body);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      qsa('.pick-cell', grid).forEach(function (c) {
        c.style.display = !q || c.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
      });
    });
    var m = A.modal({
      title: t('wsec.pickVisual'), body: body, size: 'lg', focus: false,
      footer: [{ label: t('act.cancel'), onClick: function (c) { c(); } }]
    });
    function closeModal() { m && m.close && m.close(); }
  }

  /* ---------- boot ---------- */
  /* one delegated listener for the whole settings column — it is a persistent
     node, so binding per render would stack duplicates */
  function onSettingsClick(e) {
    var rm = e.target.closest('[data-remove]');
    if (rm) {
      S.removeWebsiteWork(rm.getAttribute('data-remove'));
      A.toast(t('t.removed'));
      touch(true); renderSettings(); renderStruct();
      return;
    }
    var rc = e.target.closest('[data-remove-coll]');
    if (rc) {
      S.removeWebsiteCollection(rc.getAttribute('data-remove-coll'));
      A.toast(t('t.removed'));
      touch(true); renderSettings(); renderStruct();
    }
  }

  function boot() {
    setEl.addEventListener('click', onSettingsClick);
    if (!S.hasBrand()) {
      stageEl.innerHTML = '<div class="empty-state" style="margin:0"><div class="es-mark"></div>' +
        '<h2 class="es-title">' + esc(t('web.needBrand')) + '</h2>' +
        '<p class="es-hint">' + esc(t('web.needBrandHint')) + '</p>' +
        '<div class="es-btn"><a class="btn" href="brand.html"><span>' + esc(t('web.gotoBrand')) + '</span><span class="arr"></span></a></div></div>';
      structEl.innerHTML = '';
      setEl.innerHTML = '';
      return;
    }
    if (!S.hasWebsite()) { S.createWebsite({}); }
    if (!S.hasWebsite()) {
      stageEl.innerHTML = '<div class="empty-state" style="margin:0"><div class="es-mark"></div>' +
        '<h2 class="es-title">' + esc(t('web.empty.title')) + '</h2>' +
        '<p class="es-hint">' + esc(t('web.empty.hint')) + '</p></div>';
      return;
    }

    var nameEl = qs('#wpeName');
    nameEl.value = W().name;
    nameEl.addEventListener('input', function () {
      S.updateWebsite({ name: nameEl.value });
      touch(false);
    });

    qs('#wpePreview').addEventListener('click', function () {
      window.open('site.html', '_blank', 'noopener');
    });

    buildStage();
    renderStruct();
    renderSettings();
    touch(false);
  }

  var booted = false;
  A.page(function () {
    /* first paint builds the shell; later calls (language switch) only
       re-render the panels — the preview iframe is never reloaded */
    if (!booted) {
      booted = true;
      boot();
      var sv = qs('#wpeSave');
      if (sv && S.hasWebsite()) sv.textContent = t('web.savedAt') + ' ' + I.rel(W().updatedAt);
    } else {
      if (!S.hasWebsite()) return;
      renderStruct();
      renderSettings();
      refresh();
    }
  });
})();
