/* ==========================================================================
   STUDIO · Brand Website renderer
   Renders the workspace's public site from Brand + design library data.
   Nothing is duplicated: every element here resolves live references.

   Loaded by site.html. Also used as the live preview inside the editor
   (iframe → ?preview=1), where it reports its height back to the parent
   and re-renders on request.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.StudioStore, I = window.StudioI18n;
  var isPreview = /[?&]preview=1/.test(location.search);

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  /* same rule as the dashboard: a cover is either a seed path, an upload
     (data URL) or an already-absolute asset path */
  var img = function (f) {
    if (!f) return 'assets/img/jw/placeholder.jpg';
    if (/^(data:|https?:|assets\/|\/)/.test(f)) return f;
    return 'assets/img/' + f;
  };
  var lang = function () { return I.current(); };
  var t = function (k, v) { return I.t(k, v); };

  /* ---------- brand system → CSS variables ---------- */
  function colorOf(b, type, fallback) {
    if (b && b.colors) {
      for (var i = 0; i < b.colors.length; i++) if (b.colors[i].type === type) return b.colors[i].hex;
    }
    return fallback;
  }
  function applyBrandVars(b) {
    var st = document.documentElement.style;
    st.setProperty('--s-bg', colorOf(b, 'background', '#F6F4EF'));
    st.setProperty('--s-text', colorOf(b, 'text', '#1D1B18'));
    st.setProperty('--s-primary', colorOf(b, 'primary', '#1D1B18'));
    st.setProperty('--s-secondary', colorOf(b, 'secondary', '#E4E1D8'));
    st.setProperty('--s-accent', colorOf(b, 'accent', '#8C8880'));
    var f = b && b.fonts ? b.fonts : {};
    st.setProperty('--s-heading', S.fontStack(f.heading || 'Cormorant Garamond'));
    st.setProperty('--s-body', S.fontStack(f.body || 'Inter'));
    st.setProperty('--s-accent-face', S.fontStack(f.accent || 'Inter'));
  }

  /* ---------- module renderers ---------- */
  function markHTML(b, cls) {
    if (b.logo) return '<img src="' + b.logo + '" alt="' + esc(b.name || '') + '">';
    if (b.logoMark) return '<img src="' + b.logoMark + '" alt="' + esc(b.name || '') + '">';
    return '<span class="s-mark" aria-hidden="true"></span>';
  }

  function navHTML() {
    var w = S.website();
    var order = w ? w.sections.map(function (s) { return s.type; }) : S.SITE_SECTIONS;
    var items = [];
    if (order.indexOf('featured_works') !== -1 && S.websiteWorks().length) items.push(['works', t('site.nav.works')]);
    if (order.indexOf('featured_collections') !== -1 && S.websiteCollections().length) items.push(['collections', t('site.nav.collections')]);
    if (order.indexOf('about') !== -1) items.push(['about', t('site.nav.about')]);
    return items.map(function (it) {
      return '<a href="#' + it[0] + '">' + esc(it[1]) + '</a>';
    }).join('');
  }

  function heroHTML(b, s, d) {
    var name = (s && s.headline) || b.name || 'Studio';
    var tagline = b.tagline || '';
    var intro = (s && s.intro) || b.description || '';
    var visual = d ? d.cover : (S.websiteCollections()[0] ? S.websiteCollections()[0].cover : null);
    return '<section class="s-hero" id="hero">' +
      '<div class="s-wrap">' +
        '<div class="s-hero-logo">' + markHTML(b) + '</div>' +
        '<h1 class="s-serif">' + esc(name) + '</h1>' +
        (tagline ? '<p class="s-hero-tagline">' + esc(tagline) + '</p>' : '') +
        (intro ? '<p class="s-hero-intro">' + esc(intro) + '</p>' : '') +
        (visual ? '<div class="s-hero-visual"><img src="' + img(visual) + '" alt=""></div>' : '') +
      '</div>' +
    '</section>';
  }

  function worksHTML(works) {
    if (!works.length) return emptyBlock('works', t('site.empty.works'));
    return '<section class="s-section" id="works"><div class="s-wrap">' +
      '<div class="s-section-head">' +
        '<div><h2>' + esc(t('site.works')) + '</h2><p>' + esc(t('site.worksSub')) + '</p></div>' +
        '<span class="s-count">' + esc(t('site.countWorks', { n: works.length })) + '</span>' +
      '</div>' +
      '<div class="s-works">' + works.map(function (d) {
        return '<article class="s-work">' +
          '<span class="s-work-fig"><img src="' + img(d.cover) + '" alt="' + esc(S.name(d, lang())) + '" loading="lazy"></span>' +
          '<h3 class="s-work-name">' + esc(S.name(d, lang())) + '</h3>' +
          '<p class="s-work-sub">' + esc(S.typeLabel(d.type, lang())) + ' · ' + d.year + '</p>' +
        '</article>';
      }).join('') + '</div>' +
    '</div></section>';
  }

  function collectionsHTML(colls) {
    if (!colls.length) return emptyBlock('collections', t('site.empty.collections'));
    return '<section class="s-section" id="collections"><div class="s-wrap">' +
      '<div class="s-section-head">' +
        '<div><h2>' + esc(t('site.collections')) + '</h2><p>' + esc(t('site.collectionsSub')) + '</p></div>' +
        '<span class="s-count">' + esc(t('site.countColl', { n: colls.length })) + '</span>' +
      '</div>' +
      '<div class="s-colls">' + colls.map(function (c) {
        return '<article class="s-coll">' +
          '<span class="s-coll-fig"><img src="' + img(c.cover) + '" alt="' + esc(S.name(c, lang())) + '" loading="lazy"></span>' +
          '<h3 class="s-coll-name">' + esc(S.name(c, lang())) + '</h3>' +
          '<p class="s-coll-sub">' + c.designIds.length + ' ' + esc(t('unit.designs')) + '</p>' +
          (S.desc(c, lang()) ? '<p class="s-coll-desc">' + esc(S.desc(c, lang())) + '</p>' : '') +
        '</article>';
      }).join('') + '</div>' +
    '</div></section>';
  }

  function aboutHTML(b) {
    var facts = '';
    if (b.positioning) facts += '<div class="s-fact"><dt>' + esc(t('bf.positioning')) + '</dt><dd>' + esc(b.positioning) + '</dd></div>';
    if (b.location) facts += '<div class="s-fact"><dt>' + esc(t('bf.location')) + '</dt><dd>' + esc(b.location) + '</dd></div>';
    if (b.foundedYear) facts += '<div class="s-fact"><dt>' + esc(t('bf.founded')) + '</dt><dd>' + esc(b.foundedYear) + '</dd></div>';

    var para = b.description || '';
    if (!para && !facts && !b.keywords.length) return emptyBlock('about', t('site.empty.about'));

    return '<section class="s-section" id="about"><div class="s-wrap">' +
      '<div class="s-about">' +
        '<div><p class="s-label s-marker">' + esc(t('site.about')) + '</p>' +
          (b.englishName ? '<p class="s-serif" style="font-size:38px;margin-top:22px">' + esc(b.englishName) + '</p>' : '') +
        '</div>' +
        '<div class="s-about-body">' +
          (para ? '<p>' + esc(para) + '</p>' : '') +
          (facts ? '<dl class="s-about-facts">' + facts + '</dl>' : '') +
          (b.keywords.length ? '<div class="s-kw">' + b.keywords.map(function (k) {
            return '<span>' + esc(k) + '</span>';
          }).join('') + '</div>' : '') +
        '</div>' +
      '</div>' +
    '</div></section>';
  }

  function footHTML(b, slug) {
    var year = new Date().getFullYear();
    return '<footer class="s-foot"><div class="s-wrap"><div class="s-foot-in">' +
      '<div><div class="s-foot-logo">' + markHTML(b) +
        '<span class="s-foot-name">' + esc(b.name || 'Studio') + '</span></div>' +
        '<p class="s-foot-copy">' + esc(t('site.rights', { year: year, name: b.name || 'Studio' })) + '</p>' +
      '</div>' +
      '<p class="s-foot-meta">' + esc(slug || '') + '</p>' +
    '</div></div></footer>';
  }

  /* blanks are informative in the editor, invisible on a real site */
  function emptyBlock(type, msg) {
    if (!isPreview) return '';
    return '<section class="s-section" id="' + type + '"><div class="s-wrap">' +
      '<div class="s-blank-block" style="border:1px dashed color-mix(in srgb, var(--s-text) 22%, transparent);' +
      'padding:52px 32px;text-align:center;color:color-mix(in srgb, var(--s-text) 50%, transparent);font-size:13.5px">' +
      esc(msg) + '</div></div></section>';
  }

  /* ---------- document assembly ---------- */
  function render() {
    var root = document.getElementById('siteRoot');
    if (!root) return;
    /* the preview frame has its own store instance: pull the session first */
    if (!S.ready()) {
      S.boot().then(function () { render(); }).catch(function () { render(); });
      return;
    }
    var b = S.brand();

    if (!b) {
      applyBrandVars(null);
      root.innerHTML =
        '<div class="s-blank"><div>' +
          '<h1>' + esc(t('site.noBrand')) + '</h1>' +
          '<p>' + esc(t('site.noBrandHint')) + '</p>' +
        '</div></div>';
      report();
      return;
    }

    applyBrandVars(b);

    var w = S.website();
    var sections = w && w.sections.length
      ? w.sections.slice().sort(function (a, c) { return a.order - c.order; })
      : S.SITE_SECTIONS.map(function (type, i) { return { type: type, order: i + 1 }; });

    var works = S.websiteWorks();
    var colls = S.websiteCollections();
    var heroD = S.heroDesign();

    var body = sections.map(function (s) {
      if (s.type === 'hero') return heroHTML(b, s, heroD);
      if (s.type === 'featured_works') return worksHTML(works);
      if (s.type === 'featured_collections') return collectionsHTML(colls);
      if (s.type === 'about') return aboutHTML(b);
      return '';
    }).join('');

    root.innerHTML =
      '<header class="s-head" id="siteHead"><div class="s-wrap"><div class="s-head-in">' +
        '<a class="s-logo" href="#hero">' + markHTML(b) +
          '<span class="s-logo-name">' + esc(b.name || 'Studio') + '</span></a>' +
        '<nav class="s-nav">' + navHTML() + '</nav>' +
      '</div></div></header>' +
      '<main>' + body + '</main>' +
      footHTML(b, w ? w.slug : '');

    document.title = (b.name || 'Studio') + (b.tagline ? ' — ' + b.tagline : '');

    var head = document.getElementById('siteHead');
    var onScroll = function () {
      if (head) head.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    window.removeEventListener('scroll', window.__siteScroll);
    window.__siteScroll = onScroll;
    window.addEventListener('scroll', onScroll);
    onScroll();

    /* smooth in-page nav without the parent frame navigating away */
    document.querySelectorAll('.s-nav a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var el = document.querySelector(a.getAttribute('href'));
        if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
      });
    });

    report();
  }

  /* tell the editor how tall the site is so it can size the frame */
  var lastH = 0;
  function report() {
    if (!isPreview || window.parent === window) return;
    var h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    if (Math.abs(h - lastH) < 2) return;
    lastH = h;
    try { window.parent.postMessage({ type: 'site-height', height: h }, '*'); } catch (e) {}
  }

  window.addEventListener('message', function (e) {
    if (e.data === 'site-render') { refreshAndDraw(); }
  });
  /* This frame keeps its own mirror, so an edit done in the editor has to be
     pulled again before painting — otherwise the preview silently shows the
     state it loaded with. */
  function refreshAndDraw() {
    if (S && typeof S.refresh === 'function') {
      S.refresh().then(function () { render(); }).catch(function () { render(); });
    } else {
      render();
    }
  }
  try {
    if ('BroadcastChannel' in window) {
      var ch = new BroadcastChannel('studio-data');
      ch.onmessage = function () { refreshAndDraw(); };
    }
  } catch (e) {}
  /* the public site also needs a graceful fallback for missing images */
  document.addEventListener('error', function (e) {
    var el = e.target;
    if (el && el.tagName === 'IMG' && !el.getAttribute('data-fallback')) {
      el.setAttribute('data-fallback', '1');
      el.src = 'assets/img/jw/placeholder.jpg';
    }
  }, true);

  window.addEventListener('resize', report);
  window.addEventListener('load', report);
  setTimeout(report, 320);

  /* exposed so the editor can re-render without a reload */
  window.SiteRender = refreshAndDraw;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();

  document.addEventListener('studio:lang', render);
})();
