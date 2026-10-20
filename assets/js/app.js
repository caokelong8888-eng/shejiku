/* ==========================================================================
   STUDIO · App — Phase 2 shared shell & components (PC desktop)
   Sidebar · modals · confirm · toast · menus · design cards · pickers · drag sort
   ========================================================================== */
(function () {
  'use strict';

  var S = window.StudioStore, I = window.StudioI18n;
  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = function (k, v) { return I.t(k, v); };
  var lang = function () { return I.current(); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  /* design.cover is normally a bare path ('jw/x.jpg'). A current version may
     point at a cloud-space file, which is already absolute ('assets/…') or a
     data URL — those must pass through untouched. */
  var img = function (f) {
    if (!f) return 'assets/img/jw/placeholder.jpg';
    if (/^(data:|https?:|assets\/|\/)/.test(f)) return f;
    return 'assets/img/' + f;
  };

  var ICONS = {
    space: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    collections: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
    projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
    brand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14.5L7 22l5-2.5L17 22l-1.5-7.5"/></svg>',
    website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4L12 22l-9-9V4h9l8.6 8.6a1.4 1.4 0 010 2z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h9M17 6h3M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    arrow: '<span class="arr"></span>'
  };

  /* ================= sidebar shell ================= */
  function sidebarHTML() {
    var item = function (nav, href, icon, key) {
      return '<a class="side-item" href="' + href + '" data-nav="' + nav + '">' + icon +
             '<span data-i18n="' + key + '"></span></a>';
    };
    var soon = function (icon, key) {
      return '<button class="side-item is-soon" type="button" disabled>' + icon +
             '<span data-i18n="' + key + '"></span></button>';
    };
    return '<a class="side-brand logo" href="index.html" aria-label="Studio">' +
             '<span class="logo-mark" aria-hidden="true"></span><span class="logo-type">Studio</span></a>' +
           '<button class="side-ws" id="wsSwitch" type="button">' +
             '<div style="text-align:left"><p class="label" style="font-size:9.5px;padding-bottom:3px" data-i18n="side.ws">工作区</p>' +
             '<p class="ws-name">' + esc(S.workspace ? S.workspace.name : '') + '</p>' +
           '</div><svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>' +

           '<nav class="side-group"><p class="label side-label" data-i18n="side.space">空间</p>' +
             item('dashboard', 'dashboard.html', ICONS.space, 'side.myspace') +
             item('library', 'library.html', ICONS.library, 'side.library') +
             item('tags', 'tags.html', ICONS.tag, 'side.tags') +
             item('collections', 'collections.html', ICONS.collections, 'side.collections') +
             item('projects', 'projects.html', ICONS.projects, 'side.projects') +
           '</nav>' +

           '<nav class="side-group"><p class="label side-label" data-i18n="side.brand">品牌</p>' +
             item('brand', 'brand.html', ICONS.brand, 'side.brandid') +
             item('website', 'website.html', ICONS.website, 'side.website') +
           '</nav>' +

           '<nav class="side-group"><p class="label side-label" data-i18n="side.res">资源</p>' +
             item('files', 'files.html', ICONS.cloud, 'side.cloud') +
             item('trash', 'trash.html', ICONS.trash, 'side.trash') +
           '</nav>' +

           '<nav class="side-group"><p class="label side-label" data-i18n="side.account">账户</p>' +
             item('settings', 'settings.html', ICONS.settings, 'side.settings') +
             item('pricing', 'pricing.html', ICONS.plan, 'side.plans') +
           '</nav>' +

           '<div class="side-user">' +
             '<span class="avatar">' + esc(((S.user() && S.user().name) || 'U').slice(0, 1).toUpperCase()) + '</span>' +
             '<div><p class="u-name">' + esc((S.user() && S.user().name) || '') + '</p>' +
               '<p class="u-role">' + esc((S.user() && S.user().email) || '') + '</p></div>' +
             '<button class="side-logout" type="button" data-i18n="act.logout" title="' + esc(t('act.logout')) + '">' +
               '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 17l5-5-5-5"/><path d="M20 12H9"/><path d="M12 3H5v18h7"/></svg>' +
             '</button>' +
           '</div>';
  }

  function injectShell() {
    /* global search entry — every dashboard page gets it */
    var actions = qs('.dash-top .top-actions');
    if (actions && !qs('#topSearchBtn')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'topSearchBtn';
      btn.className = 'top-search';
      btn.innerHTML = '<span class="ts-icon" aria-hidden="true"></span><span class="ts-label">' + esc(t('sp.entry')) + '</span>' +
                      '<kbd class="ts-kbd">⌘K</kbd>';
      btn.addEventListener('click', function () { openSearch(); });
      actions.insertBefore(btn, actions.firstChild);
      /* show the platform-appropriate modifier */
      if (!/Mac|iPhone|iPad/.test(navigator.platform || '')) {
        var k = qs('.ts-kbd', btn);
        if (k) k.textContent = 'Ctrl K';
      }
    }
    var side = qs('#dashSide');
    if (side) {
      side.innerHTML = sidebarHTML();
      var page = document.body.getAttribute('data-page');
      var nav = ({ dashboard: 'dashboard', library: 'library', design: 'library',
                   collections: 'collections', collection: 'collections',
                   projects: 'projects', project: 'projects',
                   brand: 'brand',
                   website: 'website', 'website-edit': 'website',
                   files: 'files', tags: 'tags', trash: 'trash' })[page];
      qsa('.side-item[data-nav]', side).forEach(function (a) {
        if (a.getAttribute('data-nav') === nav) a.classList.add('active');
      });
      /* workspace switcher — test workspaces are the isolation harness */
      var wsBtn = qs('#wsSwitch', side);
      if (wsBtn) wsBtn.addEventListener('click', function () {
        var items = S.workspaces().map(function (w) {
          return {
            label: w.name + ' · ' + ((w.plan && w.plan.name) || ''),
            on: w.id === (S.workspace && S.workspace.id),
            onClick: function () {
              if (w.id === (S.workspace && S.workspace.id)) return;
              /* the switch is a server round-trip; only then do we repaint */
              S.switchWorkspace(w.id).then(function () { location.href = 'dashboard.html'; })
                .catch(function (e) { toast(e && e.message || t('err.generic'), { error: true }); });
            }
          };
        });
        items.push({ divider: true });
        items.push({
          label: t('ws.create'),
          onClick: function () { openWorkspaceModal(); }
        });
        items.push({
          label: t('ws.manage'),
          onClick: function () { location.href = 'settings.html?tab=workspace'; }
        });
        menu(wsBtn, items);
      });

      var out = qs('.side-logout', side);
      if (out) out.addEventListener('click', function () {
        confirmDialog({
          title: t('cf.logout'), hint: t('cf.logoutHint'),
          confirmLabel: t('act.logout'),
          onConfirm: function () {
            S.logout().then(function () { location.href = 'login.html'; },
              function () { location.href = 'login.html'; });
          }
        });
      });
    }
    /* off-canvas drawer (kept from phase 1, desktop-first) */
    var scrim = qs('#sideScrim'), menuBtn = qs('#menuBtn');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.addEventListener('click', function () {
        side.classList.toggle('is-open');
        if (scrim) scrim.classList.toggle('is-on', side.classList.contains('is-open'));
      });
    }
    if (scrim) scrim.addEventListener('click', function () {
      if (side) side.classList.remove('is-open');
      scrim.classList.remove('is-on');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && side) {
        side.classList.remove('is-open');
        if (scrim) scrim.classList.remove('is-on');
      }
    });
  }

  /* ================= modal ================= */
  var modalRoot, modalScrim;
  function ensureModal() {
    if (modalRoot) return;
    modalScrim = document.createElement('div');
    modalScrim.className = 'modal-scrim';
    modalRoot = document.createElement('div');
    modalRoot.className = 'modal';
    modalRoot.hidden = true;
    modalRoot.innerHTML =
      '<div class="modal-panel" role="dialog" aria-modal="true">' +
        '<header class="modal-head"><h3 class="modal-title"></h3>' +
          '<button class="modal-x" type="button" aria-label="Close"></button></header>' +
        '<div class="modal-body"></div>' +
        '<footer class="modal-foot"></footer>' +
      '</div>';
    document.body.appendChild(modalScrim);
    document.body.appendChild(modalRoot);
    modalScrim.addEventListener('click', closeModal);
    qs('.modal-x', modalRoot).addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modalRoot.hidden) closeModal(); });
  }
  function closeModal(force) {
    if (!modalRoot || modalRoot.hidden) return;
    /* a form that already holds typed content must not vanish on a stray
       Escape or scrim click — ask first, and come back to the same form */
    if (!force && modalCurrent && typeof modalCurrent.dirty === 'function' && modalCurrent.dirty()) {
      var owner = modalCurrent;
      confirmDialog({
        title: t('cf.leaveTitle'),
        hint: t('cf.leaveHint'),
        confirmLabel: t('cf.leave'),
        danger: true,
        onConfirm: function () {
          owner.dirty = null;
          closeModal(true);
        }
      });
      return;
    }
    if (modalStack.length) {
      var prev = modalStack.pop();
      modal(prev, true);
      return;
    }
    modalRoot.classList.remove('is-in');
    modalScrim.classList.remove('is-in');
    document.body.classList.remove('modal-open');
    setTimeout(function () {
      modalRoot.hidden = true;
      qs('.modal-body', modalRoot).innerHTML = '';
      qs('.modal-foot', modalRoot).innerHTML = '';
    }, 220);
  }
  /* Dialogs can open dialogs (e.g. the version form → file picker). The one
     the user sees is the top of the stack; closing it returns to the previous
     one instead of dropping the whole flow. */
  var modalStack = [];
  var modalCurrent = null;

  function modal(opts, restoring) {
    ensureModal();
    if (!restoring && modalRoot && !modalRoot.hidden && modalRoot.classList.contains('is-in')) {
      /* push the dialog being covered, not the one opening */
      modalStack.push(modalCurrent);
    }
    modalCurrent = opts;
    var panel = qs('.modal-panel', modalRoot);
    panel.className = 'modal-panel' + (opts.size === 'lg' ? ' is-lg' : '') + (opts.size === 'sm' ? ' is-sm' : '');
    qs('.modal-title', modalRoot).textContent = opts.title || '';
    var body = qs('.modal-body', modalRoot);
    body.innerHTML = '';
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    var foot = qs('.modal-foot', modalRoot);
    foot.innerHTML = '';
    (opts.footer || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm' + (b.primary ? '' : ' btn-ghost') + (b.danger ? ' is-danger' : '');
      btn.textContent = b.label;
      btn.addEventListener('click', function () { b.onClick && b.onClick(closeModal); });
      foot.appendChild(btn);
    });
    if (!(opts.footer || []).length) foot.style.display = 'none'; else foot.style.display = '';
    modalRoot.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(function () {
      modalRoot.classList.add('is-in');
      modalScrim.classList.add('is-in');
    });
    I.apply(lang(), panel);
    var first = qs('input,textarea,button.btn:not(.btn-ghost)', body);
    if (first && opts.focus !== false) setTimeout(function () { first.focus(); }, 240);
    return { close: closeModal, body: body };
  }
  function confirmDialog(o) {
    modal({
      size: 'sm',
      title: o.title,
      body: '<p class="confirm-hint">' + esc(o.hint || '') + '</p>',
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: o.confirmLabel || t('act.confirm'), danger: !!o.danger, primary: true,
          onClick: function (c) { c(); o.onConfirm && o.onConfirm(); } }
      ]
    });
  }

  /* ================= toast ================= */
  function toast(msg, opts) {
    opts = opts || {};
    var wrap = qs('#toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastWrap';
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    /* three at a time is plenty; older confirmations make way */
    var live = qsa('.toast', wrap);
    if (live.length >= 3) live[0].remove();
    var el = document.createElement('div');
    el.className = 'toast' + (opts.error ? ' is-error' : '');
    el.textContent = msg;
    if (opts.action && opts.actionLabel) {
      var act = document.createElement('button');
      act.type = 'button';
      act.className = 'toast-act';
      act.textContent = opts.actionLabel;
      act.addEventListener('click', function () { el.remove(); opts.action(); });
      el.appendChild(act);
    }
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    setTimeout(function () {
      el.classList.remove('is-in');
      setTimeout(function () { el.remove(); }, 260);
    }, opts.error ? 5200 : 2400);
  }

  /* ================= pop menu ================= */
  var openMenu = null;
  function menu(anchor, items) {
    closeMenu();
    var m = document.createElement('div');
    m.className = 'pop-menu';
    items.forEach(function (it) {
      if (it.divider) { m.appendChild(Object.assign(document.createElement('div'), { className: 'pop-div' })); return; }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pop-item' + (it.danger ? ' is-danger' : '') + (it.on ? ' is-on' : '');
      b.innerHTML = '<span>' + esc(it.label) + '</span>' + (it.on ? '<span class="pop-tick">✓</span>' : '');
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        closeMenu();
        it.onClick && it.onClick();
      });
      m.appendChild(b);
    });
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    var w = m.offsetWidth, h = m.offsetHeight;
    var left = Math.min(r.right - w, window.innerWidth - w - 12);
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 6);
    m.style.left = Math.max(12, left) + 'px';
    m.style.top = top + 'px';
    requestAnimationFrame(function () { m.classList.add('is-in'); });
    openMenu = m;
    setTimeout(function () {
      document.addEventListener('click', onDocClick);
      window.addEventListener('scroll', closeMenu, true);
      window.addEventListener('resize', closeMenu);
    }, 0);
  }
  function onDocClick(e) { if (openMenu && !openMenu.contains(e.target)) closeMenu(); }
  function closeMenu() {
    if (!openMenu) return;
    openMenu.remove();
    openMenu = null;
    document.removeEventListener('click', onDocClick);
    window.removeEventListener('scroll', closeMenu, true);
    window.removeEventListener('resize', closeMenu);
  }

  /* ================= design card ================= */
  function designAssoc(d) {
    var parts = [];
    var n = d.collectionIds.length;
    parts.push(n ? (n + ' ' + t('unit.collections')) : t('dd.noCollections'));
    var p = d.projectId ? S.project(d.projectId) : null;
    parts.push(p ? S.name(p, lang()) : t('dd.noProject'));
    return parts.join(' · ');
  }

  function designCard(d, opts) {
    opts = opts || {};
    var card = document.createElement('article');
    card.className = 'design-card' + (opts.draggable ? ' is-draggable' : '');
    card.setAttribute('data-id', d.id);
    if (opts.draggable) card.setAttribute('draggable', 'true');

    var href = 'design.html?id=' + d.id;
    if (opts.context === 'collection' && opts.collectionId) href += '&from=collection&cid=' + opts.collectionId;
    if (opts.context === 'project' && opts.projectId) href += '&from=project&pid=' + opts.projectId;

    if (opts.selectable) {
      var pick = document.createElement('label');
      pick.className = 'dc-check';
      pick.title = t('sel.pick');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.setAttribute('data-pick', d.id);
      cb.checked = !!(opts.selectedIds && opts.selectedIds.indexOf(d.id) !== -1);
      cb.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', function () {
        card.classList.toggle('is-sel', cb.checked);
        if (opts.onSelect) opts.onSelect(d.id, cb.checked);
      });
      pick.appendChild(cb);
      card.appendChild(pick);
      if (cb.checked) card.classList.add('is-sel');
    }

    card.insertAdjacentHTML('beforeend',
      '<a class="dc-fig" href="' + href + '"><img src="' + img(d.cover) + '" alt="' + esc(S.name(d, lang())) + '" loading="lazy"></a>' +
      '<div class="dc-meta"><h3 class="dc-name"><a href="' + href + '">' + esc(S.name(d, lang())) + '</a></h3>' +
        '<span class="view-cue">' + esc(t('act.openDesign')) + '<span class="arr"></span></span>' +
        '<button class="dc-more" type="button" aria-label="' + esc(t('act.more')) + '">···</button>' +
      '</div>' +
      '<p class="dc-sub">' + esc(S.typeLabel(d.type, lang())) + ' · ' + d.year + '</p>' +
      (opts.showAssoc === false ? '' : '<p class="dc-assoc">' + esc(designAssoc(d)) + '</p>'));

    var more = qs('.dc-more', card);
    if (more) more.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var items = typeof opts.menuItems === 'function' ? opts.menuItems(d)
                : (opts.menuItems || cardMenuItems(d, opts));
      menu(more, items);
    });
    if (opts.removeButton) {
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'dc-remove';
      rm.setAttribute('aria-label', opts.removeButton.label || '');
      rm.title = opts.removeButton.label || '';
      rm.textContent = '×';
      rm.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        opts.removeButton.onClick && opts.removeButton.onClick(d);
      });
      card.appendChild(rm);
      if (more) more.style.display = 'none';
    }
    return card;
  }

  function cardMenuItems(d, opts) {
    opts = opts || {};
    var items = [];
    if (opts.context === 'collection') {
      items.push({ label: t('act.openDesign'), onClick: function () { location.href = 'design.html?id=' + d.id + '&from=collection&cid=' + opts.collectionId; } });
      items.push({ label: t('cd.removeDesign'), danger: true, onClick: function () {
        confirmDialog({
          title: t('cf.removeFromCollection'), hint: t('cf.removeFromCollectionHint'),
          confirmLabel: t('act.remove'), danger: true,
          onConfirm: function () { S.removeDesignFromCollection(opts.collectionId, d.id); toast(t('t.removed')); opts.onChange && opts.onChange(); }
        });
      } });
      return items;
    }
    if (opts.context === 'project') {
      items.push({ label: t('act.openDesign'), onClick: function () { location.href = 'design.html?id=' + d.id + '&from=project&pid=' + opts.projectId; } });
      items.push({ label: t('pd.removeDesign'), danger: true, onClick: function () {
        confirmDialog({
          title: t('cf.removeFromProject'), hint: t('cf.removeFromProjectHint'),
          confirmLabel: t('act.remove'), danger: true,
          onConfirm: function () { S.removeDesignFromProject(opts.projectId, d.id); toast(t('t.removed')); opts.onChange && opts.onChange(); }
        });
      } });
      return items;
    }
    /* library context */
    items.push({ label: t('act.openDesign'), onClick: function () { location.href = 'design.html?id=' + d.id; } });
    items.push({ divider: true });
    items.push({ label: t('dd.addToCollection'), onClick: function () { pickCollections([d.id], opts.onChange); } });
    items.push({ label: t('dd.addToProject'), onClick: function () { pickProject(d.id, opts.onChange); } });
    items.push({ label: d.favorite ? t('t.unfavorited') : t('t.favorited'), on: d.favorite,
      onClick: function () { var on = S.toggleFavorite(d.id); toast(on ? t('t.favorited') : t('t.unfavorited')); opts.onChange && opts.onChange(); } });
    items.push({ label: d.archived ? t('t.unarchived') : t('f.archived'), on: d.archived,
      onClick: function () { var on = S.toggleArchive(d.id); toast(on ? t('t.archived') : t('t.unarchived')); opts.onChange && opts.onChange(); } });
    return items;
  }

  /* ================= pickers ================= */
  function pickCollections(designIds, onDone) {
    var body = document.createElement('div');
    var list = S.collections();
    body.innerHTML =
      '<div class="pick-search"><input class="input" type="search" placeholder="' + esc(t('ph.searchCollection')) + '"></div>' +
      '<div class="pick-list"></div>' +
      '<div class="m-hint">' + esc(t('m.pickHint')) + '</div>';
    var listEl = qs('.pick-list', body);
    if (!list.length) {
      listEl.innerHTML = '<p class="pick-empty">' + esc(t('m.noCollections')) + '</p>';
    } else {
      list.forEach(function (c) {
        var has = c.designIds.filter(function (x) { return designIds.indexOf(x) !== -1; }).length;
        var all = has === designIds.length;
        var row = document.createElement('label');
        row.className = 'pick-row' + (all ? ' is-done' : '');
        row.setAttribute('data-id', c.id);
        row.setAttribute('data-name', (c.name + ' ' + c.nameEn).toLowerCase());
        row.innerHTML =
          '<input type="checkbox" ' + (all ? 'disabled checked' : '') + '>' +
          '<span class="pick-thumb"><img src="' + img(c.cover) + '" alt=""></span>' +
          '<span class="pick-text"><span class="pick-name">' + esc(S.name(c, lang())) + '</span>' +
          '<span class="pick-sub">' + c.designIds.length + ' ' + esc(t('unit.designs')) +
          (all ? ' · ' + esc(t('m.selected')) : '') + '</span></span>';
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
    function selected() {
      return qsa('.pick-row', listEl).filter(function (r) {
        var cb = qs('input', r); return cb.checked && !cb.disabled;
      });
    }
    modal({
      title: t('m.pickCollections'), body: body, size: 'sm',
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.add'), primary: true, onClick: function (c) {
          var rows = selected(), n = 0;
          rows.forEach(function (r) {
            n += S.addDesignsToCollection(r.getAttribute('data-id'), designIds);
          });
          c();
          if (n) toast(t('t.addedCollections', { n: n }));
          onDone && onDone();
        } }
      ]
    });
    /* live button label — bound synchronously, so a fast selection on a slow
       connection can never outrun the listener */
    var btn = qs('.modal-foot .btn:not(.btn-ghost)');
    var upd = function () {
      var n = selected().length;
      if (btn) { btn.textContent = t('act.add') + (n ? ' (' + n + ')' : ''); btn.disabled = !n; }
    };
    body.addEventListener('change', upd);
    upd();
  }

  /* Bulk tagging: add or remove one or more tags across a selection.
     Reports what actually changed — never "all done" when nothing moved. */
  function pickTags(opts) {
    opts = opts || {};
    var mode = opts.mode === 'remove' ? 'remove' : 'add';
    var ids = opts.designIds || [];
    var body = document.createElement('div');
    body.className = 'pt';

    body.innerHTML =
      '<p class="pt-hint">' + esc(t(mode === 'add' ? 'pt.addHint' : 'pt.removeHint', { n: ids.length })) + '</p>' +
      '<div class="pick-search"><input class="input" type="search" placeholder="' + esc(t('pt.search')) + '"></div>' +
      (mode === 'add'
        ? '<div class="pt-new"><input class="input" id="ptNew" type="text" placeholder="' + esc(t('pt.newPh')) + '">' +
          '<button class="btn btn-sm" type="button" id="ptNewBtn">' + esc(t('pt.newBtn')) + '</button></div>'
        : '') +
      '<div class="pick-list pt-list"></div>' +
      '<p class="m-hint" id="ptNote"></p>';

    var listEl = qs('.pt-list', body);
    var chosen = {};

    function rows() {
      var tags = S.tags().map(function (tg) {
        var have = 0;
        ids.forEach(function (id) {
          var d = S.design(id);
          if (d && (d.tagIds || []).indexOf(tg.id) !== -1) have++;
        });
        return { tag: tg, have: have };
      });
      if (mode === 'remove') tags = tags.filter(function (x) { return x.have > 0; });
      return tags;
    }

    function draw() {
      var items = rows();
      if (!items.length) {
        listEl.innerHTML = '<p class="pick-empty">' +
          esc(t(mode === 'add' ? 'pt.noTags' : 'pt.noTagsOnSelection')) + '</p>';
        return;
      }
      listEl.innerHTML = items.map(function (x) {
        var all = x.have === ids.length;
        return '<label class="pick-row' + (all && mode === 'add' ? ' is-done' : '') + '" data-id="' + x.tag.id + '" ' +
          'data-name="' + esc((x.tag.name + ' ' + (x.tag.nameEn || '')).toLowerCase()) + '">' +
          '<input type="checkbox" ' + (chosen[x.tag.id] ? 'checked' : '') + '>' +
          '<span class="pick-thumb pt-thumb">' + esc(String(S.tagLabel(x.tag, lang())).slice(0, 1)) + '</span>' +
          '<span class="pick-text"><span class="pick-name">' + esc(x.tag.name) + '</span>' +
          '<span class="pick-sub">' + x.have + '/' + ids.length + ' ' + esc(t('pt.have')) +
          (all && mode === 'add' ? ' · ' + esc(t('pt.allHave')) : '') + '</span></span></label>';
      }).join('');
      upd();
    }

    function selectedTags() {
      return qsa('.pick-row', listEl).filter(function (r) {
        var cb = qs('input', r); return cb.checked;
      }).map(function (r) { return { id: r.getAttribute('data-id'), name: qs('.pick-name', r).textContent }; });
    }

    function upd() {
      var n = selectedTags().length;
      var btn = qs('.modal-foot .btn:not(.btn-ghost)');
      if (btn) {
        btn.textContent = t(mode === 'add' ? 'pt.applyAdd' : 'pt.applyRemove') + (n ? ' (' + n + ')' : '');
        btn.disabled = !n;
      }
      var note = qs('#ptNote');
      if (note) note.textContent = n ? '' : t('pt.pickOne');
    }

    listEl.addEventListener('change', function (e) {
      var row = e.target.closest('.pick-row');
      if (!row) return;
      var id = row.getAttribute('data-id');
      if (e.target.checked) chosen[id] = true; else delete chosen[id];
      upd();
    });

    var search = qs('input[type="search"]', body);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      qsa('.pick-row', listEl).forEach(function (r) {
        r.style.display = !q || r.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
      });
    });

    if (mode === 'add') {
      var newInput = qs('#ptNew', body);
      var create = function () {
        var v = newInput.value.trim();
        if (!v) return;
        var res = S.createTag(v);
        if (!res.ok) { toast(t('pt.tagEmpty')); return; }
        chosen[res.tag.id] = true;
        newInput.value = '';
        draw();
        if (res.existed) toast(t('pt.tagExists'));
      };
      qs('#ptNewBtn', body).addEventListener('click', create);
      newInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); create(); }
      });
    }

    draw();

    modal({
      title: mode === 'add' ? t('pt.titleAdd') : t('pt.titleRemove'),
      body: body, size: 'sm', focus: false,
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t(mode === 'add' ? 'pt.applyAdd' : 'pt.applyRemove'), primary: true, onClick: function (c) {
          var tags = selectedTags();
          var changed = 0, unchanged = 0;
          tags.forEach(function (tg) {
            var r = mode === 'add'
              ? S.addTagToDesigns(ids, tg.id)
              : S.removeTagFromDesigns(ids, tg.id);
            changed += r.changed;
            unchanged += r.unchanged;
          });
          c();
          toast(t(mode === 'add' ? 'pt.doneAdd' : 'pt.doneRemove', { n: changed, u: unchanged }));
          opts.onDone && opts.onDone(changed);
        } }
      ]
    });
    upd();
  }

  /* Choose existing cloud-space files (a version references them by id). */
  function pickFiles(opts) {
    opts = opts || {};
    var picked = {};
    (opts.selectedIds || []).forEach(function (id) { picked[id] = true; });
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="pick-search"><input class="input" type="search" placeholder="' + esc(t('pf.search')) + '"></div>' +
      '<div class="pick-list pf-list"></div>' +
      '<p class="m-hint">' + esc(t('pf.hint')) + '</p>';
    var listEl = qs('.pf-list', body);
    var all = (S.allFiles ? S.allFiles() : []).slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    function draw() {
      if (!all.length) {
        listEl.innerHTML = '<p class="pick-empty">' + esc(t('pf.empty')) + '</p>';
        return;
      }
      listEl.innerHTML = all.map(function (f) {
        var thumb = (f.kind === 'image' && f.dataUrl)
          ? '<img src="' + f.dataUrl + '" alt="">'
          : '<span class="cl-ext">' + esc((f.name.split('.').pop() || '').slice(0, 4)) + '</span>';
        return '<label class="pick-row" data-id="' + f.id + '" data-name="' + esc(f.name.toLowerCase()) + '">' +
          '<input type="checkbox"' + (picked[f.id] ? ' checked' : '') + '>' +
          '<span class="pick-thumb">' + thumb + '</span>' +
          '<span class="pick-text"><span class="pick-name">' + esc(f.name) + '</span>' +
          '<span class="pick-sub">' + esc(S.kindLabel(f.kind, lang())) + ' · ' + esc(prettySize(f.size)) +
          (f.hasContent ? '' : ' · ' + esc(t('cl.file.flagMeta'))) + '</span></span></label>';
      }).join('');
    }
    draw();

    listEl.addEventListener('change', function (e) {
      var row = e.target.closest('.pick-row');
      if (!row) return;
      if (e.target.checked) picked[row.getAttribute('data-id')] = true;
      else delete picked[row.getAttribute('data-id')];
      var btn = qs('.modal-foot .btn:not(.btn-ghost)');
      var n = Object.keys(picked).length;
      if (btn) { btn.textContent = t('act.save') + (n ? ' (' + n + ')' : ''); btn.disabled = !n; }
    });

    var search = qs('input[type="search"]', body);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      qsa('.pick-row', listEl).forEach(function (r) {
        r.style.display = !q || r.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
      });
    });

    modal({
      title: opts.title || t('pf.title'), body: body, size: 'sm', focus: false,
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.save'), primary: true, onClick: function (c) {
          c();
          opts.onDone && opts.onDone(Object.keys(picked));
        } }
      ]
    });
  }

  function pickProject(designId, onDone) {
    var body = document.createElement('div');
    var list = S.projects();
    var designs = S.designsByProject;
    body.innerHTML =
      '<div class="pick-search"><input class="input" type="search" placeholder="' + esc(t('ph.searchProject')) + '"></div>' +
      '<div class="pick-list"></div>' +
      '<div class="m-hint">' + esc(t('m.pickHint')) + '</div>';
    var listEl = qs('.pick-list', body);
    if (!list.length) listEl.innerHTML = '<p class="pick-empty">' + esc(t('m.noProjects')) + '</p>';
    var curProj = S.design(designId) ? S.design(designId).projectId : null;
    list.forEach(function (p) {
      var row = document.createElement('label');
      row.className = 'pick-row';
      row.setAttribute('data-id', p.id);
      row.setAttribute('data-name', (p.name + ' ' + p.nameEn).toLowerCase());
      var cover = designs(p.id)[0];
      row.innerHTML =
        '<input type="radio" name="pickproj" ' + (curProj === p.id ? 'checked' : '') + '>' +
        '<span class="pick-thumb"><img src="' + img(cover ? cover.cover : 'vase.jpg') + '" alt=""></span>' +
        '<span class="pick-text"><span class="pick-name">' + esc(S.name(p, lang())) + '</span>' +
        '<span class="pick-sub">' + esc(S.projStatusLabel(p.status, lang())) + ' · ' + p.designIds.length + ' ' + esc(t('unit.designs')) + '</span></span>';
      listEl.appendChild(row);
    });
    var search = qs('input[type="search"]', body);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      qsa('.pick-row', listEl).forEach(function (r) {
        r.style.display = !q || r.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
      });
    });
    modal({
      title: t('m.pickProject'), body: body, size: 'sm',
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.confirm'), primary: true, onClick: function (c) {
          var sel = qsa('.pick-row', listEl).filter(function (r) { return qs('input', r).checked; })[0];
          c();
          if (sel) { S.setDesignProject(designId, sel.getAttribute('data-id')); toast(t('t.addedProject')); }
          onDone && onDone();
        } }
      ]
    });
  }

  function pickDesigns(opts) {
    var body = document.createElement('div');
    /* never offer an asset from another workspace, a deleted one, or an
       archived one — the picker is a write path, not just a list */
    var avail = S.filterDesigns({}).filter(function (d) {
      return opts.exclude.indexOf(d.id) === -1;
    });
    body.innerHTML =
      '<div class="pick-search"><input class="input" type="search" placeholder="' + esc(t('ph.search')) + '"></div>' +
      '<div class="pick-grid"></div>';
    var grid = qs('.pick-grid', body);
    if (!avail.length) grid.innerHTML = '<p class="pick-empty">' + esc(t('empty.pick.hint')) + '</p>';
    avail.forEach(function (d) {
      var cell = document.createElement('label');
      cell.className = 'pick-cell';
      cell.setAttribute('data-id', d.id);
      cell.setAttribute('data-name', (d.name + ' ' + d.nameEn).toLowerCase());
      cell.innerHTML =
        '<input type="checkbox">' +
        '<span class="pick-fig"><img src="' + img(d.cover) + '" alt="" loading="lazy"></span>' +
        '<span class="pick-name">' + esc(S.name(d, lang())) + '</span>' +
        '<span class="pick-sub">' + esc(S.typeLabel(d.type, lang())) + ' · ' + d.year + '</span>';
      grid.appendChild(cell);
    });
    var search = qs('input[type="search"]', body);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      qsa('.pick-cell', grid).forEach(function (c) {
        c.style.display = !q || c.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
      });
    });
    function selectedIds() {
      return qsa('.pick-cell', grid).filter(function (c) {
        var cb = qs('input', c);
        return cb.checked && c.style.display !== 'none';
      }).map(function (c) { return c.getAttribute('data-id'); });
    }
    modal({
      title: opts.title, body: body, size: 'lg', focus: false,
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.add'), primary: true, onClick: function (c) {
          var ids = qsa('.pick-cell', grid).filter(function (c) { return qs('input', c).checked; })
            .map(function (c) { return c.getAttribute('data-id'); });
          c();
          opts.onDone && opts.onDone(ids);
        } }
      ]
    });
    /* live button label — synchronous binding (see pickCollections) */
    var btn = qs('.modal-foot .btn:not(.btn-ghost)');
    var upd = function () {
      var n = selectedIds().length;
      if (btn) { btn.textContent = t('act.add') + (n ? ' (' + n + ')' : ''); btn.disabled = !n; }
    };
    body.addEventListener('change', upd);
    upd();
  }

  /* ================= drag sort ================= */
  function enableDragSort(grid, onSave) {
    var dragEl = null;
    qsa('.design-card', grid).forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        dragEl = card;
        card.classList.add('is-dragging');
        try { e.dataTransfer.setData('text/plain', card.getAttribute('data-id')); } catch (err) {}
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('is-dragging');
        qsa('.drag-over', grid).forEach(function (x) { x.classList.remove('drag-over'); });
      });
      card.addEventListener('dragover', function (e) {
        if (!dragEl || dragEl === card) return;
        e.preventDefault();
        card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', function () { card.classList.remove('drag-over'); });
      card.addEventListener('drop', function (e) {
        e.preventDefault();
        card.classList.remove('drag-over');
        if (!dragEl || dragEl === card) return;
        var cards = qsa('.design-card', grid);
        var from = cards.indexOf(dragEl), to = cards.indexOf(card);
        if (from < to) card.after(dragEl); else card.before(dragEl);
        onSave(qsa('.design-card', grid).map(function (c) { return c.getAttribute('data-id'); }));
      });
    });
  }

  /* ================= forms: collection / project ================= */
  var COVERS = ['vase', 'paper', 'linen', 'sphere', 'textile', 'amber', 'corner',
                'swatches', 'shadows', 'poster', 'grass', 'brass', 'stones', 'chair'];

  function collectionForm(existing) {
    var d = existing || {};
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="field"><label class="field-label">' + esc(t('f.name')) + '</label>' +
        '<input class="input" id="fName" type="text" maxlength="80" placeholder="' + esc(t('f.namePh')) + '" value="' + esc(d.name || '') + '"></div>' +
      '<div class="field"><label class="field-label">' + esc(t('f.desc')) + '</label>' +
        '<textarea class="textarea" id="fDesc" placeholder="' + esc(t('f.descPh')) + '">' + esc(d.description || '') + '</textarea></div>' +
      '<div class="field"><label class="field-label">' + esc(t('f.cover')) + '</label>' +
        '<div class="cover-picker" id="fCover"></div></div>' +
      '<div class="field"><label class="field-label">' + esc(t('f.status')) + '</label>' +
        '<div class="radio-row">' +
          '<label class="radio-opt"><input type="radio" name="fStatus" value="draft"><span>' + esc(S.collStatusLabel('draft', lang())) + '</span></label>' +
          '<label class="radio-opt"><input type="radio" name="fStatus" value="public"><span>' + esc(S.collStatusLabel('public', lang())) + '</span></label>' +
        '</div></div>';
    var picker = qs('#fCover', body);
    var cur = d.cover || 'vase.jpg';
    COVERS.forEach(function (f) {
      var file = f + '.jpg';
      var l = document.createElement('label');
      l.className = 'cover-opt';
      l.innerHTML = '<input type="radio" name="fCover" value="' + file + '"' + (file === cur ? ' checked' : '') + '>' +
        '<span class="co-fig"><img src="' + img(file) + '" alt=""></span>';
      picker.appendChild(l);
    });
    var st = d.status || 'draft';
    qsa('input[name="fStatus"]', body).forEach(function (r) { if (r.value === st) r.checked = true; });
    return {
      body: body,
      read: function () {
        var status = qsa('input[name="fStatus"]', body).filter(function (r) { return r.checked; })[0];
        var cover = qsa('input[name="fCover"]', body).filter(function (r) { return r.checked; })[0];
        return {
          name: qs('#fName', body).value.trim(),
          description: qs('#fDesc', body).value.trim(),
          cover: cover ? cover.value : 'vase.jpg',
          status: status ? status.value : 'draft'
        };
      }
    };
  }

  function openCollectionModal(opts) {
    opts = opts || {};
    var f = collectionForm(opts.existing);
    var isEdit = !!opts.existing;
    var initial = JSON.stringify(f.read());
    var saved = false;
    modal({
      title: isEdit ? t('m.editCollection') : t('m.newCollection'),
      body: f.body,
      dirty: function () { return !saved && JSON.stringify(f.read()) !== initial; },
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: isEdit ? t('act.save') : t('act.create'), primary: true, onClick: function (c) {
          var v = f.read();
          if (!v.name) { qs('#fName', f.body).focus(); toast(t('de.nameRequired')); return; }
          var res;
          if (isEdit) { res = S.updateCollection(opts.existing.id, v); toast(t('t.saved')); }
          else { res = S.createCollection(v); toast(t('t.created')); }
          saved = true;
          c();
          opts.onSaved && opts.onSaved(res, !isEdit);
        } }
      ]
    });
  }

  function projectForm(existing) {
    var d = existing || {};
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="field"><label class="field-label">' + esc(t('f.name')) + '</label>' +
        '<input class="input" id="fName" type="text" maxlength="80" placeholder="' + esc(t('f.namePh')) + '" value="' + esc(d.name || '') + '"></div>' +
      '<div class="field"><label class="field-label">' + esc(t('f.desc')) + '</label>' +
        '<textarea class="textarea" id="fDesc" placeholder="' + esc(t('f.descPhProject')) + '">' + esc(d.description || '') + '</textarea></div>' +
      '<div class="field"><label class="field-label">' + esc(t('f.status')) + '</label>' +
        '<div class="radio-row">' + Object.keys(S.PSTAT).map(function (k) {
          var on = (d.status || 'planning') === k;
          return '<label class="radio-opt"><input type="radio" name="fStatus" value="' + k + '"' + (on ? ' checked' : '') + '>' +
                 '<span>' + esc(S.projStatusLabel(k, lang())) + '</span></label>';
        }).join('') + '</div></div>';
    return {
      body: body,
      read: function () {
        var status = qsa('input[name="fStatus"]', body).filter(function (r) { return r.checked; })[0];
        return {
          name: qs('#fName', body).value.trim(),
          description: qs('#fDesc', body).value.trim(),
          status: status ? status.value : 'planning'
        };
      }
    };
  }

  function openProjectModal(opts) {
    opts = opts || {};
    var f = projectForm(opts.existing);
    var isEdit = !!opts.existing;
    var initial = JSON.stringify(f.read());
    var saved = false;
    modal({
      title: isEdit ? t('m.editProject') : t('m.newProject'),
      body: f.body,
      dirty: function () { return !saved && JSON.stringify(f.read()) !== initial; },
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: isEdit ? t('act.save') : t('act.create'), primary: true, onClick: function (c) {
          var v = f.read();
          if (!v.name) { qs('#fName', f.body).focus(); toast(t('de.nameRequired')); return; }
          var res;
          if (isEdit) { res = S.updateProject(opts.existing.id, v); toast(t('t.saved')); }
          else { res = S.createProject(v); toast(t('t.created')); }
          saved = true;
          c();
          opts.onSaved && opts.onSaved(res, !isEdit);
        } }
      ]
    });
  }

  /* ================= workspace ================= */
  /* A new workspace is empty on purpose: no designs, files, brand or site are
     copied from anywhere. */
  function openWorkspaceModal() {
    var pre = S.can('workspace.create');
    if (!pre.ok) { toast(pre.message + (pre.limit ? '（' + pre.limit + '）' : ''), { error: true }); return; }
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="field"><label class="field-label">' + esc(t('ws.name')) + '</label>' +
        '<input class="input" id="wsName" type="text" maxlength="60" placeholder="' + esc(t('ws.namePh')) + '"></div>' +
      '<div class="field"><label class="field-label">' + esc(t('ws.logo')) + '</label>' +
        '<div class="ws-logo-row"><div class="ws-logo-fig" id="wsLogoFig"><span class="df-cover-empty">' + esc(t('ws.noLogo')) + '</span></div>' +
          '<div><button class="btn btn-ghost btn-sm" type="button" id="wsLogoBtn"><span>' + esc(t('ws.pickLogo')) + '</span></button>' +
          '<p class="de-note">' + esc(t('ws.logoHint')) + '</p></div>' +
          '<input type="file" accept="image/*" hidden></div></div>' +
      '<p class="m-hint">' + esc(t('ws.emptyNote')) + '</p>';
    var logo = null;
    var input = qs('input[type="file"]', body);
    qs('#wsLogoBtn', body).addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f || !isImageFile(f)) return;
      readImage(f, 320, function (url) {
        if (!url) return;
        logo = url;
        qs('#wsLogoFig', body).innerHTML = '<img src="' + url + '" alt="">';
      });
      input.value = '';
    });
    function submit(c) {
      var name = qs('#wsName', body).value.trim();
      if (!name) { toast(t('ws.nameRequired')); return; }
      S.createWorkspace({ name: name, logo: logo }).then(function () {
        c();
        toast(t('ws.created'));
        location.href = 'dashboard.html';
      }).catch(function (e) {
        toast(e && e.message || t('err.generic'), { error: true });
      });
    }
    var modalRef = modal({
      title: t('ws.create'), body: body, size: 'sm',
      dirty: function () { return !!(qs('#wsName', body).value.trim() || logo); },
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.create'), primary: true, onClick: function (c) { submit(c); } }
      ]
    });
    return modalRef;
  }

  /* plan switching — only offered where the server says simulation is on */
  function openPlanModal() {
    if (!S.devPlans()) {
      modal({
        title: t('plan.title'), size: 'sm', focus: false,
        body: (function () {
          var d = document.createElement('div');
          d.innerHTML = '<p class="confirm-hint">' + esc(t('plan.noPayments')) + '</p>' +
            '<p class="m-hint">' + esc(t('plan.noPaymentsHint')) + '</p>';
          return d;
        })(),
        footer: [{ label: t('act.close'), primary: true, onClick: function (c) { c(); } }]
      });
      return;
    }
    S.plans().then(function (res) {
      var cur = S.plan();
      var body = document.createElement('div');
      body.innerHTML = '<p class="pt-hint">' + esc(t('plan.simNote')) + '</p>' +
        '<div class="plan-pick">' + res.plans.map(function (p) {
          return '<label class="plan-opt' + (cur && cur.id === p.id ? ' is-on' : '') + '">' +
            '<input type="radio" name="planPick" value="' + p.id + '"' + (cur && cur.id === p.id ? ' checked' : '') + '>' +
            '<span class="po-name">' + esc(p.name) + '</span>' +
            '<span class="po-price">' + esc(p.priceNote) + '<i>' + esc(p.periodNote) + '</i></span>' +
            '<span class="po-tag">' + esc(p.tagline) + '</span></label>';
        }).join('') + '</div>';
      modal({
        title: t('plan.changeTitle'), body: body, size: 'sm', focus: false,
        footer: [
          { label: t('act.cancel'), onClick: function (c) { c(); } },
          { label: t('plan.apply'), primary: true, onClick: function (c) {
            var picked = qsa('input[name="planPick"]', body).filter(function (x) { return x.checked; })[0];
            if (!picked) return;
            S.changePlan(picked.value).then(function (res2) {
              c();
              toast(t('plan.changed', { name: res2.summary.plan.name }));
              setTimeout(function () { location.reload(); }, 500);
            }).catch(function (e) { toast(e && e.message || t('err.generic'), { error: true }); });
          } }
        ]
      });
    }).catch(function (e) { toast(e && e.message || t('err.generic'), { error: true }); });
  }

  /* ================= create a design asset ================= */
  /* One deliberate entry point. It writes the same fields the library already
     understands — no parallel model, no placeholder record. */
  function openDesignModal(opts) {
    opts = opts || {};
    var draft = {
      name: '', type: 'ring', metal: '', stone: '', status: 'concept',
      style: '', theme: '', description: '', cover: null,
      tagIds: [], collectionIds: [], projectId: ''
    };
    var body = document.createElement('div');
    body.className = 'df';

    body.innerHTML =
      '<div class="df-grid">' +
        '<div class="df-field df-span"><label class="de-label">' + esc(t('df.name')) + '</label>' +
          '<input class="input" id="dfName" type="text" maxlength="60" placeholder="' + esc(t('df.namePh')) + '"></div>' +
        '<div class="df-field"><label class="de-label">' + esc(t('df.type')) + '</label>' +
          '<select class="select" id="dfType">' + Object.keys(S.TYPES).map(function (k) {
            return '<option value="' + k + '"' + (k === 'ring' ? ' selected' : '') + '>' + esc(S.typeLabel(k, lang())) + '</option>';
          }).join('') + '</select></div>' +
        '<div class="df-field"><label class="de-label">' + esc(t('dd.designStatus')) + '</label>' +
          '<select class="select" id="dfStatus">' + Object.keys(S.DSTAT).map(function (k) {
            return '<option value="' + k + '"' + (k === 'concept' ? ' selected' : '') + '>' + esc(S.dstatLabel(k, lang())) + '</option>';
          }).join('') + '</select></div>' +
        '<div class="df-field"><label class="de-label">' + esc(t('dd.metal')) + '</label>' +
          '<select class="select" id="dfMetal"><option value="">' + esc(t('df.unspecified')) + '</option>' +
            Object.keys(S.METALS).map(function (k) { return '<option value="' + k + '">' + esc(S.metalLabel(k, lang())) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="df-field"><label class="de-label">' + esc(t('dd.stone')) + '</label>' +
          '<select class="select" id="dfStone"><option value="">' + esc(t('df.unspecified')) + '</option>' +
            Object.keys(S.STONES).map(function (k) { return '<option value="' + k + '">' + esc(S.stoneLabel(k, lang())) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="df-field"><label class="de-label">' + esc(t('dim.style')) + '</label>' +
          '<select class="select" id="dfStyle"><option value="">' + esc(t('df.unspecified')) + '</option>' +
            S.taxOptions('style').map(function (o) { return '<option value="' + o.key + '">' + esc(lang() === 'en' ? (o.en || o.zh) : o.zh) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="df-field"><label class="de-label">' + esc(t('dim.theme')) + '</label>' +
          '<select class="select" id="dfTheme"><option value="">' + esc(t('df.unspecified')) + '</option>' +
            S.taxOptions('theme').map(function (o) { return '<option value="' + o.key + '">' + esc(lang() === 'en' ? (o.en || o.zh) : o.zh) + '</option>'; }).join('') +
          '</select></div>' +
        '<div class="df-field df-span"><label class="de-label">' + esc(t('df.desc')) + '</label>' +
          '<textarea class="textarea" id="dfDesc" rows="2" placeholder="' + esc(t('de.descPh')) + '"></textarea></div>' +
      '</div>' +

      '<div class="df-grid">' +
      '<div class="df-field df-cover-field"><label class="de-label">' + esc(t('df.cover')) + '</label>' +
        '<div class="df-cover">' +
          '<div class="df-cover-fig" id="dfCoverFig"><span class="df-cover-empty">' + esc(t('df.noCover')) + '</span></div>' +
          '<div class="df-cover-acts">' +
            '<button class="btn btn-ghost btn-sm" type="button" id="dfPickCover"><span>' + esc(t('df.pickCover')) + '</span></button>' +
            '<button class="link-btn is-danger" type="button" id="dfDropCover" hidden>' + esc(t('df.removeCover')) + '</button>' +
            '<p class="de-note">' + esc(t('df.coverHint')) + '</p>' +
          '</div>' +
          '<input type="file" accept="image/*" hidden>' +
        '</div>' +
      '</div>' +

      '<div class="df-field"><label class="de-label">' + esc(t('de.tags')) + '</label>' +
        '<div class="de-tagbox" id="dfTagBox"><input id="dfTagInput" type="text" maxlength="30" placeholder="' + esc(t('de.tagsPh')) + '"></div>' +
        '<div class="de-suggest" id="dfSuggest"></div>' +
      '</div>' +
      '</div>' +

      '<div class="df-grid">' +
        '<div class="df-field"><label class="de-label">' + esc(t('df.collections')) + '</label>' +
          '<div class="df-checks" id="dfColls"></div></div>' +
        '<div class="df-field"><label class="de-label">' + esc(t('df.project')) + '</label>' +
          '<select class="select" id="dfProject"><option value="">' + esc(t('df.noProject')) + '</option>' +
            S.projects().map(function (p) { return '<option value="' + p.id + '">' + esc(S.name(p, lang())) + '</option>'; }).join('') +
          '</select></div>' +
      '</div>';

    var nameEl = qs('#dfName', body);
    var tagBox = qs('#dfTagBox', body);
    var tagInput = qs('#dfTagInput', body);
    var coverFig = qs('#dfCoverFig', body);
    var fileInput = qs('input[type="file"]', body);

    /* cover */
    function paintCover() {
      coverFig.innerHTML = draft.cover
        ? '<img src="' + draft.cover + '" alt="">'
        : '<span class="df-cover-empty">' + esc(t('df.noCover')) + '</span>';
      qs('#dfDropCover', body).hidden = !draft.cover;
    }
    qs('#dfPickCover', body).addEventListener('click', function () { fileInput.click(); });
    coverFig.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      if (!isImageFile(f)) { toast(t('t.uploadFailed'), { error: true }); return; }
      readImage(f, 1400, function (dataUrl) {
        if (!dataUrl) { toast(t('t.uploadFailed'), { error: true }); return; }
        draft.cover = dataUrl;
        paintCover();
      });
      fileInput.value = '';
    });
    qs('#dfDropCover', body).addEventListener('click', function () {
      draft.cover = null; paintCover();
    });

    /* tags */
    function paintTags() {
      qsa('.tagchip', tagBox).forEach(function (x) { x.remove(); });
      draft.tagIds.forEach(function (id) {
        var tg = S.tag(id);
        if (!tg) return;
        var chip = document.createElement('span');
        chip.className = 'tagchip';
        chip.innerHTML = esc(S.tagLabel(tg, lang())) + '<button class="tc-x" type="button" data-drop="' + id + '">×</button>';
        tagBox.insertBefore(chip, tagInput);
      });
      paintSuggest();
    }
    function paintSuggest() {
      var q = tagInput.value.trim().toLowerCase();
      var pool = S.tags().filter(function (tg) {
        if (draft.tagIds.indexOf(tg.id) !== -1) return false;
        return !q || tg.name.toLowerCase().indexOf(q) !== -1 || (tg.nameEn || '').toLowerCase().indexOf(q) !== -1;
      });
      var box = qs('#dfSuggest', body);
      var exact = q && S.tagByName(tagInput.value.trim());
      var items = pool.slice(0, 6).map(function (tg) {
        return '<button type="button" data-pick="' + tg.id + '">' + esc(S.tagLabel(tg, lang())) + '</button>';
      });
      if (q && !exact) items.unshift('<button type="button" data-new="1">＋ ' + esc(t('pt.newBtn')) + '：' + esc(tagInput.value.trim()) + '</button>');
      box.innerHTML = items.join('');
    }
    function addTag(id) {
      if (draft.tagIds.indexOf(id) === -1) draft.tagIds.push(id);
      tagInput.value = '';
      paintTags();
      tagInput.focus();
    }
    tagInput.addEventListener('input', paintSuggest);
    tagInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var v = tagInput.value.trim();
      if (!v) return;
      var exact = S.tagByName(v);
      if (exact) { addTag(exact.id); return; }
      var res = S.createTag(v);
      if (res.ok) addTag(res.tag.id);
    });
    body.addEventListener('click', function (e) {
      var drop = e.target.closest('[data-drop]');
      if (drop && drop.closest('#dfTagBox')) {
        draft.tagIds = draft.tagIds.filter(function (x) { return x !== drop.getAttribute('data-drop'); });
        paintTags(); return;
      }
      var pick = e.target.closest('[data-pick]');
      if (pick) { addTag(pick.getAttribute('data-pick')); return; }
      if (e.target.closest('[data-new]')) {
        var res = S.createTag(tagInput.value.trim());
        if (res.ok) addTag(res.tag.id);
      }
    });

    /* collections */
    var colls = S.collections();
    var collsEl = qs('#dfColls', body);
    if (!colls.length) {
      collsEl.innerHTML = '<p class="m-hint">' + esc(t('df.noCollections')) + '</p>';
    } else {
      collsEl.innerHTML = colls.map(function (c) {
        return '<label class="df-check"><input type="checkbox" value="' + c.id + '">' +
          '<span>' + esc(S.name(c, lang())) + '</span>' +
          '<i>' + c.designIds.length + '</i></label>';
      }).join('');
      collsEl.addEventListener('change', function () {
        draft.collectionIds = qsa('input:checked', collsEl).map(function (x) { return x.value; });
      });
    }

    paintCover();
    paintTags();

    var initial = '';
    var saved = false;
    var snapshot = function () {
      return JSON.stringify({
        name: nameEl.value, type: qs('#dfType', body).value, status: qs('#dfStatus', body).value,
        metal: qs('#dfMetal', body).value, stone: qs('#dfStone', body).value,
        style: qs('#dfStyle', body).value, theme: qs('#dfTheme', body).value,
        desc: qs('#dfDesc', body).value, cover: draft.cover,
        tags: draft.tagIds.slice().sort(), colls: draft.collectionIds.slice().sort(),
        project: qs('#dfProject', body).value
      });
    };

    var m = modal({
      title: t('df.title'),
      body: body,
      size: 'lg',
      dirty: function () { return !saved && snapshot() !== initial; },
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('df.create'), primary: true, onClick: function (c) {
          var name = nameEl.value.trim();
          if (!name) { toast(t('de.nameRequired')); nameEl.focus(); return; }
          var res = S.createDesign({
            name: name,
            type: qs('#dfType', body).value,
            status: qs('#dfStatus', body).value,
            metal: qs('#dfMetal', body).value,
            stone: qs('#dfStone', body).value,
            style: qs('#dfStyle', body).value,
            theme: qs('#dfTheme', body).value,
            description: qs('#dfDesc', body).value.trim(),
            cover: draft.cover,
            tagIds: draft.tagIds,
            collectionIds: draft.collectionIds,
            projectId: qs('#dfProject', body).value || null
          });
          if (!res.ok) {
            toast(res.reason === 'plan' ? res.message
              : res.reason === 'quota' ? t('err.quota') : t('de.nameRequired'), { error: true });
            return;
          }
          saved = true;
          c();
          toast(t('df.created'));
          opts.onSaved && opts.onSaved(res.design);
        } }
      ]
    });
    initial = snapshot();
    setTimeout(function () { nameEl.focus(); }, 260);
    return m;
  }

  /* ================= file helpers (Phase 3 uploads) ================= */
  /* Downscale before storing: the whole platform lives in localStorage,
     so an untouched 4 MB camera file would blow the quota immediately. */
  function readImage(file, maxDim, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var scale = Math.min(1, maxDim / Math.max(im.width, im.height));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * scale));
        c.height = Math.max(1, Math.round(im.height * scale));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        /* keep transparency for png / svg-ish sources */
        var lossless = /png|svg/i.test(file.type || '') || /\.png$/i.test(file.name || '');
        try { cb(c.toDataURL(lossless ? 'image/png' : 'image/jpeg', 0.86)); }
        catch (e) { cb(null); }
      };
      im.onerror = function () { cb(null); };
      im.src = fr.result;
    };
    fr.onerror = function () { cb(null); };
    fr.readAsDataURL(file);
  }

  function isImageFile(file) {
    return /^image\//.test(file.type || '') || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(file.name || '');
  }

  function fileKind(file) {
    var f = file || {}, n = (f.name || '').toLowerCase();
    if (isImageFile(f)) return 'image';
    if (/\.(ai|psd|sketch|fig|eps|indd)$/.test(n)) return 'design';
    if (/\.pdf$/.test(n)) return 'pdf';
    if (/\.(docx?|txt|md|rtf)$/.test(n)) return 'doc';
    if (/\.(ttf|otf|woff2?)$/.test(n)) return 'font';
    if (/\.(zip|rar|7z)$/.test(n)) return 'archive';
    return 'other';
  }

  function prettySize(bytes) {
    if (bytes === 0 || bytes === '0') return '0 B';
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  /* ================= global search palette (Phase 6) ================= */
  var RECENT_KEY = 'studio-recent-search';
  var spEl = null, spInput = null, spBody = null, spActive = -1, spTimer = null;

  function recentTerms() {
    try {
      var raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(raw) ? raw.slice(0, 6) : [];
    } catch (e) { return []; }
  }
  function saveRecent(list) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6))); } catch (e) {}
  }
  function pushRecent(q) {
    q = String(q || '').trim();
    if (!q) return;
    var list = recentTerms().filter(function (x) { return String(x).toLowerCase() !== q.toLowerCase(); });
    list.unshift(q);
    saveRecent(list);
  }
  function dropRecent(term) {
    saveRecent(recentTerms().filter(function (x) { return x !== term; }));
  }

  function buildSearch() {
    if (spEl) return;
    spEl = document.createElement('div');
    spEl.className = 'sp';
    spEl.hidden = true;
    spEl.innerHTML =
      '<div class="sp-scrim"></div>' +
      '<div class="sp-panel" role="dialog" aria-label="' + esc(t('sp.title')) + '">' +
        '<div class="sp-head">' +
          '<span class="sp-glass" aria-hidden="true"></span>' +
          '<input class="sp-input" type="text" autocomplete="off" spellcheck="false" ' +
            'placeholder="' + esc(t('sp.placeholder')) + '">' +
          '<kbd class="sp-kbd">Esc</kbd>' +
        '</div>' +
        '<div class="sp-body"></div>' +
        '<div class="sp-foot">' +
          '<span><kbd>↑</kbd><kbd>↓</kbd> ' + esc(t('sp.hintMove')) + '</span>' +
          '<span><kbd>↵</kbd> ' + esc(t('sp.hintOpen')) + '</span>' +
          '<span><kbd>Esc</kbd> ' + esc(t('sp.hintClose')) + '</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(spEl);
    spInput = qs('.sp-input', spEl);
    spBody = qs('.sp-body', spEl);

    qs('.sp-scrim', spEl).addEventListener('click', closeSearch);
    spInput.addEventListener('input', function () {
      clearTimeout(spTimer);
      spTimer = setTimeout(runSearch, 140);
    });
    spInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); activate(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
    });
    spBody.addEventListener('click', function (e) {
      var item = e.target.closest('[data-open]');
      if (item) { openResult(item); return; }
      var term = e.target.closest('[data-term]');
      if (term) { spInput.value = term.getAttribute('data-term'); runSearch(); spInput.focus(); return; }
      var del = e.target.closest('[data-drop]');
      if (del) { e.preventDefault(); dropRecent(del.getAttribute('data-drop')); runSearch(); return; }
      var clr = e.target.closest('[data-clear]');
      if (clr) { saveRecent([]); runSearch(); }
    });
  }

  function openSearch(seed) {
    buildSearch();
    spEl.hidden = false;
    document.body.classList.add('sp-open');
    requestAnimationFrame(function () { spEl.classList.add('is-in'); });
    spInput.value = seed || '';
    spInput.focus();
    runSearch();
  }
  function closeSearch() {
    if (!spEl || spEl.hidden) return;
    spEl.classList.remove('is-in');
    document.body.classList.remove('sp-open');
    setTimeout(function () { if (spEl) spEl.hidden = true; }, 180);
  }
  function toggleSearch() {
    if (spEl && !spEl.hidden) closeSearch(); else openSearch();
  }

  function highlight(text, q) {
    var src = String(text == null ? '' : text);
    if (!q) return esc(src);
    var i = src.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return esc(src);
    return esc(src.slice(0, i)) + '<mark>' + esc(src.slice(i, i + q.length)) + '</mark>' + esc(src.slice(i + q.length));
  }

  function rowHTML(kind, id, title, sub, thumbSrc, extra) {
    return '<button class="sp-item" type="button" data-open="1" data-type="' + kind + '" data-id="' + esc(id) + '">' +
      '<span class="sp-thumb">' +
        (thumbSrc ? '<img src="' + thumbSrc + '" alt="">' : '<span class="sp-thumb-mark">' + esc(extra || '·') + '</span>') +
      '</span>' +
      '<span class="sp-main"><span class="sp-title">' + title + '</span>' +
      '<span class="sp-sub">' + esc(sub) + '</span></span>' +
    '</button>';
  }

  function groupHTML(label, rowsHTML) {
    if (!rowsHTML) return '';
    return '<div class="sp-group"><p class="sp-group-label">' + esc(label) + '</p>' + rowsHTML + '</div>';
  }

  function runSearch() {
    if (!spEl) return;
    var q = spInput.value.trim();
    spActive = -1;
    if (!q) { renderIdle(); return; }

    var r = S.searchAll(q, { limit: 5 });
    if (!r.total) {
      spBody.innerHTML =
        '<div class="sp-empty">' +
          '<p class="sp-empty-title">' + esc(t('sp.empty')) + '</p>' +
          '<p class="sp-empty-hint">' + esc(t('sp.emptyHint', { q: q })) + '</p>' +
        '</div>';
      return;
    }

    var html = '';
    html += groupHTML(t('sp.designs'), r.designs.map(function (d) {
      return rowHTML('design', d.id,
        highlight(S.name(d, lang()), q),
        [S.typeLabel(d.type, lang()), d.materialNote, d.year].filter(Boolean).join(' · '),
        d.cover ? img(d.cover) : null, S.typeLabel(d.type, lang()).slice(0, 1));
    }).join(''));
    html += groupHTML(t('sp.versions'), (r.versions || []).map(function (x) {
      var v = x.v, d = x.d;
      return rowHTML('version', v.id, highlight(v.name, q),
        'V' + v.versionNumber + ' · ' + S.name(d, lang()) + ' · ' + I.rel(v.createdAt),
        d.cover ? img(d.cover) : null, 'V' + v.versionNumber);
    }).join(''));
    html += groupHTML(t('sp.collections'), r.collections.map(function (c) {
      return rowHTML('collection', c.id, highlight(S.name(c, lang()), q),
        c.designIds.length + ' ' + t('unit.designs'),
        c.cover ? 'assets/img/' + c.cover : null, '·');
    }).join(''));
    html += groupHTML(t('sp.projects'), r.projects.map(function (p) {
      return rowHTML('project', p.id, highlight(S.name(p, lang()), q),
        S.projStatusLabel(p.status, lang()) + ' · ' + p.designIds.length + ' ' + t('unit.designs'), null, '项目');
    }).join(''));
    html += groupHTML(t('sp.brand'), r.brand.map(function (b) {
      return rowHTML('brand', b.id, highlight(b.name || '', q),
        (b.englishName || '') + ' · ' + t('sp.brandSub'), b.logo || null, '品牌');
    }).join(''));
    html += groupHTML(t('sp.files'), r.files.map(function (f) {
      var folder = f.folderId ? S.folder(f.folderId) : null;
      return rowHTML('file', f.id, highlight(f.name, q),
        S.kindLabel(f.kind, lang()) + (folder ? ' · ' + folder.name : ''),
        (f.kind === 'image' && f.dataUrl) ? f.dataUrl : null, (f.name.split('.').pop() || '').slice(0, 4));
    }).join(''));
    html += groupHTML(t('sp.tags'), r.tags.map(function (tg) {
      return rowHTML('tag', tg.id, highlight(S.tagLabel(tg, lang()), q),
        S.tagUsage(tg.id) + ' ' + t('unit.designs'), null, '标签');
    }).join(''));
    html += groupHTML(t('sp.folders'), r.folders.map(function (f) {
      var meta = S.folderMeta(f.id);
      return rowHTML('folder', f.id, highlight(f.name, q),
        meta.files + ' ' + t('cl.stats.files') + ' · ' + meta.folders + ' ' + t('cl.stats.folders'),
        null, '目录');
    }).join(''));

    spBody.innerHTML = html;
  }

  function renderIdle() {
    var recents = recentTerms();
    var quick = [
      ['dashboard.html', t('side.myspace')],
      ['library.html', t('side.library')],
      ['collections.html', t('side.collections')],
      ['projects.html', t('side.projects')],
      ['tags.html', t('side.tags')],
      ['files.html', t('side.cloud')]
    ].map(function (x) {
      return '<a class="sp-quick" href="' + x[0] + '"><span class="sp-quick-mark">' + esc(x[1].slice(0, 1)) + '</span>' +
        '<span>' + esc(x[1]) + '</span></a>';
    }).join('');

    var hist = recents.length
      ? '<div class="sp-group"><p class="sp-group-label">' + esc(t('sp.recent')) +
          '<button class="sp-clear" type="button" data-clear="1">' + esc(t('sp.clearAll')) + '</button></p>' +
          recents.map(function (term) {
            return '<div class="sp-term">' +
              '<button class="sp-term-go" type="button" data-term="' + esc(term) + '">' +
                '<span class="sp-term-icon"></span><span>' + esc(term) + '</span></button>' +
              '<button class="sp-term-x" type="button" data-drop="' + esc(term) + '" title="' + esc(t('act.delete')) + '">×</button>' +
            '</div>';
          }).join('') + '</div>'
      : '<div class="sp-group"><p class="sp-group-label">' + esc(t('sp.recentEmpty')) + '</p>' +
        '<p class="sp-empty-hint" style="padding:0 14px 10px">' + esc(t('sp.recentEmptyHint')) + '</p></div>';

    spBody.innerHTML = hist +
      '<div class="sp-group"><p class="sp-group-label">' + esc(t('sp.quick')) + '</p>' +
      '<div class="sp-quicks">' + quick + '</div></div>';
  }

  function spItemEls() { return qsa('.sp-item', spBody); }
  function moveActive(dir) {
    var items = spItemEls();
    if (!items.length) return;
    spActive = (spActive + dir + items.length) % items.length;
    items.forEach(function (el, i) { el.classList.toggle('is-on', i === spActive); });
    var cur = items[spActive];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  }
  function activate() {
    var items = spItemEls();
    if (!items.length) return;
    openResult(items[spActive >= 0 ? spActive : 0]);
  }
  function openResult(el) {
    var type = el.getAttribute('data-type');
    var id = el.getAttribute('data-id');
    var q = spInput ? spInput.value.trim() : '';
    if (q) pushRecent(q);
    var url = null;
    if (type === 'design') url = 'design.html?id=' + id;
    else if (type === 'collection') url = 'collection.html?id=' + id;
    else if (type === 'project') url = 'project.html?id=' + id;
    else if (type === 'brand') url = 'brand.html';
    else if (type === 'file') url = 'files.html?view=browse&file=' + id;
    else if (type === 'folder') url = 'files.html?view=browse&folder=' + id;
    else if (type === 'tag') url = 'tags.html?tag=' + id;
    else if (type === 'version') {
      var mv = S.version(id);
      if (mv) url = 'design.html?id=' + mv.designAssetId + '&version=' + id;
    }
    if (url) window.location.href = url;
  }

  /* Ctrl+K / Cmd+K anywhere; Esc closes. Never fires while typing in a field
     except for the palette's own input, which handles its own keys. */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      toggleSearch();
      return;
    }
    if (e.key === 'Escape' && spEl && !spEl.hidden) {
      e.preventDefault();
      closeSearch();
      return;
    }
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && (!spEl || spEl.hidden)) {
      e.preventDefault();
      openSearch();
    }
  });

  /* ================= page registry ================= */
  var pageFn = null;
  var rendering = false;
  /* module entry sequence — reused by in-page view switches (brand module) */
  function enter() {
    qsa('[data-enter]').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('is-in'); }, 90 + i * 70);
    });
  }
  function runPage() {
    if (rendering || !pageFn) return;
    rendering = true;
    try {
      pageFn();
      I.apply(lang());
      enter();
    } finally { rendering = false; }
  }
  /* A protected page never paints before the session is known, and never
     paints at all when there is no session — it goes to the login page with
     a pointer back to where the user was. */
  var bootPromise = null;
  function goLogin() {
    var next = location.pathname.split('/').pop() + location.search;
    location.href = 'login.html?next=' + encodeURIComponent(next);
  }
  function boot() {
    if (S.ready()) { runPage(); return; }
    if (!bootPromise) {
      bootPromise = S.boot().then(function () {
        injectShell();
        I.apply(lang());
      });
    }
    bootPromise.then(function () { runPage(); }).catch(function (e) {
      console.error(e);
      if (e && (e.status === 401 || e.code === 'NOT_AUTHENTICATED')) goLogin();
      else surfaceError(e && e.message ? e.message : t('err.loadHint'));
    });
  }
  function page(fn) {
    pageFn = fn;
    boot();
  }
  document.addEventListener('studio:lang', function () { if (S.ready()) runPage(); });

  /* ================= error surface ================= */
  /* Failures must be visible but never turn the page into a stack trace. */
  var lastErrAt = 0;
  function surfaceError(message) {
    var now = Date.now();
    if (now - lastErrAt < 4000) return;
    lastErrAt = now;
    toast(message, { error: true, actionLabel: t('err.reload'), action: function () { location.reload(); } });
  }
  window.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') return;   /* images have a fallback */
    console.error(e.error || e.message);
    surfaceError(t('err.loadHint'));
  });
  window.addEventListener('unhandledrejection', function (e) {
    console.error(e.reason);
    surfaceError(t('err.loadHint'));
  });
  document.addEventListener('studio:quota', function () {
    toast(t('err.quota'), { error: true });
  });

  /* Follow a link only after the queued writes have landed. location.href
     assignments bypass the click handler below, so page code calls this. */
  function go(url) {
    var pending = (S.flush && S.isDirty && S.isDirty()) ? S.flush() : Promise.resolve();
    pending.then(function () { location.href = url; }, function () { location.href = url; });
  }

  /* ================= write safety =================
     An internal link clicked straight after an edit must not drop the edit:
     the browser cancels in-flight requests on navigation, so we let the
     queued write finish and then follow the link. */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^[a-z]+:/i.test(href)) return;
    if (!S.isDirty || !S.isDirty() || !S.flush) return;
    var pending = S.flush();
    if (!pending || typeof pending.then !== 'function') return;
    e.preventDefault();
    pending.then(function () { location.href = href; }, function () { location.href = href; });
  }, true);

  /* ================= boot ================= */
  /* any failed image falls back to the neutral placeholder — never a broken icon */
  document.addEventListener('error', function (e) {
    var el = e.target;
    if (el && el.tagName === 'IMG' && !el.getAttribute('data-fallback')) {
      el.setAttribute('data-fallback', '1');
      el.classList.add('is-fallback');
      el.src = 'assets/img/jw/placeholder.jpg';
    }
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    /* public pages (landing, login, pricing) paint immediately; protected
       pages wait for the session inside page() */
    if (!document.body.classList.contains('dash')) injectShell();
    I.apply(lang());
  });

  /* the API tells us about plan limits and lost sessions in words, not codes */
  document.addEventListener('studio:error', function (e) {
    var d = e.detail || {};
    if (d.code === 'NOT_AUTHENTICATED') { goLogin(); return; }
    toast(d.message || t('err.generic'), { error: true });
  });

  /* a change made in another tab or in the preview frame */
  window.addEventListener('storage', function () {});

  window.StudioApp = {
    page: page, toast: toast, modal: modal, confirm: confirmDialog, menu: menu,
    enter: enter, closeModal: closeModal, search: openSearch, closeSearch: closeSearch,
    surfaceError: surfaceError,
    designCard: designCard, pickCollections: pickCollections, pickProject: pickProject,
    pickDesigns: pickDesigns, enableDragSort: enableDragSort,
    pickTags: pickTags, pickFiles: pickFiles, openDesignModal: openDesignModal,
    readImage: readImage, isImageFile: isImageFile, fileKind: fileKind, prettySize: prettySize,
    openCollectionModal: openCollectionModal, openProjectModal: openProjectModal,
    readImage: readImage, isImageFile: isImageFile, fileKind: fileKind, prettySize: prettySize,
    openWorkspaceModal: openWorkspaceModal, openPlanModal: openPlanModal, go: go,
    COVERS: COVERS,
    rel: function (iso) { return I.rel(iso); }, date: function (iso) { return I.date(iso); },
    qs: qs, qsa: qsa, esc: esc, img: img, t: t, lang: lang, icons: ICONS
  };
})();
