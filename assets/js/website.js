/* ==========================================================================
   STUDIO · Website — module shell for the public-site layer (Phase 4)
   website.js       → overview (website.html)
   website-edit.js  → home page editor (website-edit.html)
   ========================================================================== */
(function () {
  'use strict';

  var A = window.StudioApp, S = window.StudioStore, I = window.StudioI18n;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, t = A.t, lang = A.lang;
  var head = qs('#whHead'), root = qs('#whRoot');

  if (!root) return;

  function statusPill(status) {
    return '<span class="pill pill--' + (status === 'published' ? 'active' : 'draft') + ' pill--sm">' +
      esc(t(status === 'published' ? 'web.published' : 'web.draft')) + '</span>';
  }

  function previewURL(w) { return 'https://' + (w.slug || 'studio') + '.studio.site'; }

  /* ======================= empty states ======================= */
  function renderNoBrand() {
    head.innerHTML = '<div><h1 data-i18n="p.website.title"></h1><p class="ph-sub" data-i18n="p.website.sub"></p></div>';
    root.innerHTML =
      '<div class="empty-state">' +
        '<div class="es-mark"></div>' +
        '<h2 class="es-title">' + esc(t('web.needBrand')) + '</h2>' +
        '<p class="es-hint">' + esc(t('web.needBrandHint')) + '</p>' +
        '<div class="es-btn"><a class="btn" href="brand.html"><span>' + esc(t('web.gotoBrand')) + '</span><span class="arr"></span></a></div>' +
      '</div>';
    I.apply(lang(), head);
  }

  function renderNoSite() {
    head.innerHTML =
      '<div><h1 data-i18n="p.website.title"></h1><p class="ph-sub" data-i18n="p.website.sub"></p></div>';
    root.innerHTML =
      '<div class="empty-state">' +
        '<div class="es-mark"></div>' +
        '<h2 class="es-title">' + esc(t('web.empty.title')) + '</h2>' +
        '<p class="es-hint">' + esc(t('web.empty.hint')) + '</p>' +
        '<div class="es-btn"><button class="btn" id="whCreate" type="button">' +
          '<span>' + esc(t('web.empty.btn')) + '</span><span class="arr"></span></button></div>' +
      '</div>';
    qs('#whCreate').addEventListener('click', function () {
      S.createWebsite({});
      A.toast(t('t.siteCreated'));
      location.href = 'website-edit.html';
    });
    I.apply(lang(), head);
  }

  /* ======================= overview ======================= */
  function renderOverview() {
    var w = S.website(), b = S.brand();
    var works = S.websiteWorks(), colls = S.websiteCollections();

    head.innerHTML =
      '<div><h1 data-i18n="p.website.title"></h1><p class="ph-sub" data-i18n="p.website.sub"></p></div>' +
      '<div class="ph-actions">' +
        '<a class="btn btn-ghost" href="site.html" target="_blank" rel="noopener"><span data-i18n="web.preview"></span><span class="arr arr-up"></span></a>' +
        '<a class="btn" href="website-edit.html"><span data-i18n="web.edit"></span><span class="arr"></span></a>' +
      '</div>';

    var order = (w.sections || []).slice().sort(function (a, c) { return a.order - c.order; })
      .map(function (s) { return t('wsec.' + s.type); }).join(' · ');
    /* the site data is never deleted by a downgrade — it is only frozen */
    var locked = S.can('website.edit').ok === false;
    var lockNote = locked
      ? '<p class="web-lock">' + esc(t('web.locked')) + '<a class="link-btn" href="pricing.html">' +
          esc(t('plan.compare')) + '</a></p>'
      : '';

    root.innerHTML =
      lockNote +
      '<div class="wh-grid" data-enter>' +
        '<div class="wh-preview">' +
          '<div class="wh-preview-chrome">' +
            '<span class="wpc-dot"></span><span class="wpc-dot"></span><span class="wpc-dot"></span>' +
            '<span class="wpc-url">' + esc(previewURL(w)) + '</span>' +
          '</div>' +
          '<div class="wh-frame-wrap" id="whFrameWrap">' +
            '<div class="frame-loading" id="whLoading">' + esc(t('web.loading')) + '</div>' +
            '<div class="wh-scaler" id="whScaler">' +
              '<iframe id="whFrame" src="site.html?preview=1" scrolling="no" title="' + esc(t('web.preview')) + '"></iframe>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<aside class="wh-side">' +
          '<div class="meta-block">' +
            '<p class="label">' + esc(t('web.info')) + '</p>' +
            '<dl class="meta-rows">' +
              '<div class="meta-row"><dt>' + esc(t('web.siteName')) + '</dt><dd>' + esc(w.name) + '</dd></div>' +
              '<div class="meta-row"><dt>' + esc(t('meta.status')) + '</dt><dd>' + statusPill(w.status) + '</dd></div>' +
              '<div class="meta-row"><dt>' + esc(t('web.brandUsed')) + '</dt>' +
                '<dd><a href="brand.html">' + esc(b.name || 'Studio') + '</a></dd></div>' +
              '<div class="meta-row"><dt>' + esc(t('meta.updated')) + '</dt><dd>' + esc(I.rel(w.updatedAt)) + '</dd></div>' +
            '</dl>' +
          '</div>' +

          '<div class="meta-block">' +
            '<p class="label">' + esc(t('web.address')) + '</p>' +
            '<p class="wh-url">' + esc(previewURL(w)) + '</p>' +
            '<p class="wh-url-note">' + esc(t('web.addressNote')) + '</p>' +
            '<button class="btn btn-ghost btn-sm" id="whCopyUrl" type="button"><span>' + esc(t('web.copyAddress')) + '</span></button>' +
          '</div>' +

          '<div class="meta-block">' +
            '<p class="label">' + esc(t('web.homeContent')) + '</p>' +
            '<dl class="meta-rows">' +
              '<div class="meta-row"><dt>' + esc(t('wsec.featured_works')) + '</dt><dd>' + works.length + '</dd></div>' +
              '<div class="meta-row"><dt>' + esc(t('wsec.featured_collections')) + '</dt><dd>' + colls.length + '</dd></div>' +
            '</dl>' +
            '<p class="wh-order">' + esc(order) + '</p>' +
          '</div>' +

          '<div class="wh-actions">' +
            (w.status === 'published'
              ? '<button class="btn btn-ghost btn-sm" id="whUnpublish" type="button"><span>' + esc(t('web.unpublish')) + '</span></button>'
              : '<button class="btn btn-sm" id="whPublish" type="button"><span>' + esc(t('web.publish')) + '</span><span class="arr"></span></button>') +
          '</div>' +
          '<div class="wh-danger">' +
            '<button class="link-btn is-danger" id="whDelete" type="button">' + esc(t('del.websiteTitle')) + '</button>' +
          '</div>' +
        '</aside>' +
      '</div>';

    I.apply(lang(), head);

    /* scaled, read-only home page preview */
    var wrap = qs('#whFrameWrap'), scaler = qs('#whScaler'), frame = qs('#whFrame');
    function fit(h) {
      h = h || 900;
      var s = wrap.clientWidth / 1440;
      scaler.style.transform = 'scale(' + s + ')';
      scaler.style.height = h + 'px';
      /* overview shows the first screen only — the full page lives behind
         the "preview" button */
      wrap.style.height = Math.min(Math.round(h * s), 620) + 'px';
    }
    fit();
    window.addEventListener('resize', function () { fit(wrap.getAttribute('data-h') * 1 || 900); });
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.type === 'site-height' && frame && e.source === frame.contentWindow) {
        wrap.setAttribute('data-h', d.height);
        fit(d.height);
      }
    });
    frame.addEventListener('load', function () {
      var ld = qs('#whLoading'); if (ld) ld.classList.add('is-off');
      fit(wrap.getAttribute('data-h') * 1 || 900);
    });

    qs('#whCopyUrl').addEventListener('click', function () {
      var url = previewURL(w);
      var done = function () { A.toast(t('t.copied') + ' · ' + url); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else done();
    });

    var delSite = qs('#whDelete');
    if (delSite) delSite.addEventListener('click', function () {
      var lock = S.can('website.edit');
      if (!lock.ok) { A.toast(lock.message, { error: true }); return; }
      A.confirm({
        title: t('del.websiteTitle'), hint: t('del.websiteHint'),
        confirmLabel: t('del.continue'), danger: true,
        onConfirm: function () {
          var ok = S.deleteWebsite();
          if (!ok) { A.toast(t('err.deleteFailed')); return; }
          A.toast(t('del.done'));
          location.reload();
        }
      });
    });

    var pub = qs('#whPublish'), unpub = qs('#whUnpublish');
    if (pub) pub.addEventListener('click', function () {
      S.setWebsiteStatus('published'); A.toast(t('t.sitePublished')); render();
    });
    if (unpub) unpub.addEventListener('click', function () {
      S.setWebsiteStatus('draft'); A.toast(t('t.siteUnpublished')); render();
    });
  }

  function render() {
    if (!S.hasBrand()) { renderNoBrand(); return; }
    if (!S.hasWebsite()) { renderNoSite(); return; }
    renderOverview();
  }

  A.page(render);
})();
