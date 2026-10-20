/* ==========================================================================
   STUDIO · Cloud space — files & folders (Phase 5)
   Overview · browse (grid / list) · search / filter / sort · upload queue
   · file detail with live links · recycle bin (soft delete + restore)

   Honest about what this is: files are persisted in the browser's
   localStorage as data URLs. There is no cloud service behind it, and the UI
   says so. Nothing here pretends to be a synced drive.
   ========================================================================== */
(function () {
  'use strict';

  var A = window.StudioApp, S = window.StudioStore, I = window.StudioI18n;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, t = A.t, lang = A.lang;

  var headEl = qs('#flHead'), root = qs('#flRoot');
  if (!root) return;

  var VIEWS = ['home', 'browse', 'trash'];
  /* files bigger than this are recorded as metadata only — we cannot keep a
     40 MB source file inside localStorage, and we must not claim we did */
  var MAX_CONTENT = 400 * 1024;

  function readView() {
    var v = (location.search.match(/[?&]view=([a-z]+)/) || [])[1];
    return VIEWS.indexOf(v) === -1 ? 'home' : v;
  }
  var view = readView();
  var curFolder = (location.search.match(/[?&]folder=([a-z0-9]+)/) || [])[1] || null;
  /* deep link from search / design detail: open one file's detail directly */
  var pendingFile = (location.search.match(/[?&]file=([A-Za-z0-9]+)/) || [])[1] || null;
  var mode = 'grid';
  var sel = [];
  var q = '', kind = 'all', sortKey = 'updated', sortDir = 'desc';
  var uploads = [];

  function go(v, folderId) {
    if (VIEWS.indexOf(v) === -1) v = 'home';
    view = v;
    if (v === 'browse') curFolder = folderId || null;
    if (v !== 'browse') curFolder = null;
    sel = [];
    try {
      var url = 'files.html' + (v === 'home' ? '' : '?view=' + v + (curFolder ? '&folder=' + curFolder : ''));
      history.replaceState(null, '', url);
    } catch (e) {}
    render();
  }

  /* ================= helpers ================= */
  /* only an image data URL can be painted as <img>; a stored PDF/ZIP data URL
     would render as a broken image */
  function isPreview(f) { return !!f && f.kind === 'image' && !!f.dataUrl; }

  function ext(name) {
    var p = String(name || '').split('.');
    return p.length > 1 ? p.pop().toLowerCase().slice(0, 4) : '';
  }
  function siblings(folderId) {
    return S.filesIn(folderId);
  }
  function applySort(list, folders) {
    var dir = sortDir === 'asc' ? 1 : -1;
    var s = function (a, b) {
      if (sortKey === 'name') {
        var an = (a.name || '').toLowerCase(), bn = (b.name || '').toLowerCase();
        return an < bn ? -dir : an > bn ? dir : 0;
      }
      if (sortKey === 'size') {
        var as = a.size || 0, bs = b.size || 0;
        if (as === bs) return 0;
        return as < bs ? -dir : dir;
      }
      var at = new Date(a.updatedAt || a.createdAt).getTime();
      var bt = new Date(b.updatedAt || b.createdAt).getTime();
      if (at === bt) return 0;
      return at < bt ? -dir : dir;
    };
    folders.sort(function (a, b) {
      /* folders always lead, unless sorting by name */
      if (sortKey === 'name') return s(a, b);
      return a.name < b.name ? -1 : 1;
    });
    list.sort(s);
  }
  function filtered(list) {
    var out = list.filter(function (f) {
      if (kind !== 'all' && f.kind !== kind) return false;
      if (q && (f.name || '').toLowerCase().indexOf(q.toLowerCase()) === -1) return false;
      return true;
    });
    return out;
  }
  function toggleSel(id) {
    var i = sel.indexOf(id);
    if (i === -1) sel.push(id); else sel.splice(i, 1);
  }

  /* ================= shell ================= */
  function renderShell() {
    var rep = S.storageReport();
    headEl.innerHTML =
      '<div><h1 data-i18n="p.files.title"></h1>' +
        '<p class="ph-sub" data-i18n="p.files.sub"></p></div>' +
      '<div class="ph-actions">' +
        '<button class="btn btn-ghost btn-sm" id="flNewFolder" type="button"><span>' + esc(t('cl.newFolder')) + '</span></button>' +
        '<button class="btn btn-sm" id="flUpload" type="button"><span>' + esc(t('cl.upload')) + '</span><span class="arr"></span></button>' +
      '</div>';
    qs('#flNewFolder').addEventListener('click', function () { folderModal(null, curFolder); });
    qs('#flUpload').addEventListener('click', openUploader);
    I.apply(lang(), headEl);
    return rep;
  }

  function navRow(rep) {
    return '<div class="cl-nav" data-enter>' +
      '<button class="cl-nav-btn' + (view === 'home' ? ' is-on' : '') + '" data-v="home" type="button">' + esc(t('cl.home')) + '</button>' +
      '<button class="cl-nav-btn' + (view === 'browse' ? ' is-on' : '') + '" data-v="browse" type="button">' + esc(t('cl.browse')) + '</button>' +
      '<button class="cl-nav-btn' + (view === 'trash' ? ' is-on' : '') + '" data-v="trash" type="button">' +
        esc(t('cl.trash')) + (rep.trashedCount ? '<span class="cl-nav-n">' + rep.trashedCount + '</span>' : '') + '</button>' +
    '</div>';
  }

  /* ================= overview ================= */
  function renderHome() {
    var rep = renderShell();
    var recentUp = S.allFiles().slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }).slice(0, 6);
    var recentAcc = S.allFiles().filter(function (f) { return f.lastAccessedAt; })
      .sort(function (a, b) { return new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt); }).slice(0, 6);

    var kinds = Object.keys(rep.byKind);
    root.innerHTML =
      navRow(rep) +

      '<div class="cl-limit" data-enter>' +
        '<p class="cl-limit-title">' + esc(t('cl.limit.title')) + '</p>' +
        '<p class="cl-limit-body">' + esc(t('cl.limit.body')) + '</p>' +
      '</div>' +

      '<div class="cl-stats" data-enter>' +
        '<div class="cl-stat"><p class="cl-stat-n">' + rep.fileCount + '</p><p class="cl-stat-l">' + esc(t('cl.stats.files')) + '</p></div>' +
        '<div class="cl-stat"><p class="cl-stat-n">' + rep.folderCount + '</p><p class="cl-stat-l">' + esc(t('cl.stats.folders')) + '</p></div>' +
        '<div class="cl-stat is-wide">' +
          '<p class="cl-stat-n">' + esc(A.prettySize(rep.logicalBytes)) + '</p>' +
          '<p class="cl-stat-l">' + esc(t('cl.stats.storage')) + '</p>' +
          '<p class="cl-stat-note">' + esc(t('cl.stats.scope')) + '</p>' +
          '<p class="cl-stat-note">' + esc(t('cl.stats.note')) + '</p>' +
        '</div>' +
        '<div class="cl-stat">' +
          '<p class="cl-stat-n">' + rep.trashedCount + '</p>' +
          '<p class="cl-stat-l">' + esc(t('cl.trash')) + '</p>' +
        '</div>' +
      '</div>' +

      '<div class="cl-duo" data-enter>' +
        '<section class="cl-block">' +
          '<div class="cl-block-head"><h2>' + esc(t('cl.recent.upload')) + '</h2></div>' +
          (recentUp.length
            ? '<div class="cl-thumbs">' + recentUp.map(thumbCard).join('') + '</div>'
            : '<p class="cl-mini-empty">' + esc(t('cl.empty.browse')) + '</p>') +
        '</section>' +
        '<section class="cl-block">' +
          '<div class="cl-block-head"><h2>' + esc(t('cl.recent.access')) + '</h2></div>' +
          (recentAcc.length
            ? '<div class="cl-thumbs">' + recentAcc.map(thumbCard).join('') + '</div>'
            : '<p class="cl-mini-empty">' + esc(t('cl.empty.access')) + '</p>') +
        '</section>' +
      '</div>' +

      '<section class="cl-block" data-enter>' +
        '<div class="cl-block-head">' +
          '<h2>' + esc(t('cl.types')) + '</h2>' +
          '<button class="link-btn" data-v="browse" type="button">' + esc(t('cl.viewAll')) + '</button>' +
        '</div>' +
        (kinds.length
          ? '<div class="cl-types">' + kinds.map(function (k) {
              return '<button class="cl-type" data-kind="' + k + '" type="button">' +
                '<span class="cl-type-n">' + rep.byKind[k] + '</span>' +
                '<span class="cl-type-l">' + esc(S.kindLabel(k, lang())) + '</span></button>';
            }).join('') + '</div>'
          : '<p class="cl-mini-empty">' + esc(t('cl.empty.title')) + '</p>') +
      '</section>' +

      '<section class="cl-block" data-enter>' +
        '<div class="cl-block-head"><h2>' + esc(t('cl.browse')) + '</h2>' +
          '<button class="link-btn" data-v="browse" type="button">' + esc(t('cl.viewAll')) + '</button></div>' +
        '<div class="cl-folder-row">' +
          S.folders(null).map(folderCard).join('') +
          '<button class="cl-folder is-new" id="flNewRoot" type="button"><span class="cl-folder-plus">+</span>' +
            '<span class="cl-folder-name">' + esc(t('cl.newFolder')) + '</span></button>' +
        '</div>' +
      '</section>';

    bindCommon();
    var nr = qs('#flNewRoot');
    if (nr) nr.addEventListener('click', function () { folderModal(null, null); });
    qsa('.cl-type', root).forEach(function (b) {
      b.addEventListener('click', function () { kind = b.getAttribute('data-kind'); go('browse'); });
    });
    qsa('.cl-thumb', root).forEach(function (el) {
      el.addEventListener('click', function () { openFile(el.getAttribute('data-id')); });
    });
  }

  function thumbCard(f) {
    return '<button class="cl-thumb" type="button" data-id="' + f.id + '">' +
      '<span class="cl-thumb-fig">' +
        (isPreview(f) ? '<img src="' + f.dataUrl + '" alt="">' : '<span class="cl-ext">' + esc(ext(f.name)) + '</span>') +
      '</span>' +
      '<span class="cl-thumb-name">' + esc(f.name) + '</span>' +
      '<span class="cl-thumb-sub">' + esc(A.prettySize(f.size)) + ' · ' + esc(S.kindLabel(f.kind, lang())) + '</span>' +
    '</button>';
  }

  function folderCard(f) {
    return '<button class="cl-folder" type="button" data-folder="' + f.id + '">' +
      '<span class="cl-folder-name">' + esc(f.name) + '</span>' +
      '<span class="cl-folder-sub">' + esc(I.rel(f.updatedAt)) + '</span>' +
    '</button>';
  }

  /* ================= browse ================= */
  function renderBrowse() {
    var rep = renderShell();
    var folders = S.folders(curFolder);
    /* a search must also filter folders, otherwise the "no matches" state can
       never appear while any folder exists */
    if (q) {
      var lq = q.toLowerCase();
      folders = folders.filter(function (f) { return (f.name || '').toLowerCase().indexOf(lq) !== -1; });
    }
    var files = filtered(siblings(curFolder));
    applySort(files, folders);

    var path = curFolder ? S.folderPath(curFolder) : [];
    var crumbs = '<button class="cl-crumb" data-folder="" type="button">' + esc(t('cl.browse')) + '</button>' +
      path.map(function (f) {
        return '<span class="cl-crumb-sep">/</span><button class="cl-crumb" data-folder="' + f.id + '" type="button">' + esc(f.name) + '</button>';
      }).join('');

    root.innerHTML =
      navRow(rep) +
      '<div class="cl-crumbs" data-enter>' + crumbs + '</div>' +

      '<div class="cl-toolbar" data-enter>' +
        '<div class="search-box"><input class="input" id="flSearch" type="search" placeholder="' + esc(t('cl.searchPh')) + '" value="' + esc(q) + '"></div>' +
        '<div class="chips" id="flKinds"></div>' +
        '<div class="cl-sort">' +
          '<select class="select" id="flSort">' +
            '<option value="updated"' + (sortKey === 'updated' ? ' selected' : '') + '>' + esc(t('cl.sort.time')) + '</option>' +
            '<option value="name"' + (sortKey === 'name' ? ' selected' : '') + '>' + esc(t('cl.sort.name')) + '</option>' +
            '<option value="size"' + (sortKey === 'size' ? ' selected' : '') + '>' + esc(t('cl.sort.size')) + '</option>' +
          '</select>' +
          '<button class="cl-dir" id="flDir" type="button" title="' + esc(sortDir === 'asc' ? t('cl.sort.asc') : t('cl.sort.desc')) + '">' +
            (sortDir === 'asc' ? '↑' : '↓') + '</button>' +
        '</div>' +
        '<div class="view-toggle">' +
          '<button type="button" data-mode="grid"' + (mode === 'grid' ? ' class="is-on"' : '') + '>' + esc(t('view.grid')) + '</button>' +
          '<button type="button" data-mode="list"' + (mode === 'list' ? ' class="is-on"' : '') + '>' + esc(t('view.list')) + '</button>' +
        '</div>' +
      '</div>' +

      '<div id="flBody"></div>';

    /* kind chips */
    var chips = qs('#flKinds');
    chips.innerHTML = '<button class="chip' + (kind === 'all' ? ' is-on' : '') + '" data-kind="all" type="button">' + esc(t('cl.kind.all')) + '</button>' +
      S.FILEKINDS.map(function (k) {
        return '<button class="chip' + (kind === k ? ' is-on' : '') + '" data-kind="' + k + '" type="button">' + esc(S.kindLabel(k, lang())) + '</button>';
      }).join('');

    var body = qs('#flBody');
    var hasAny = folders.length || files.length;

    if (!hasAny) {
      body.innerHTML = (q || kind !== 'all')
        ? '<div class="empty-state"><div class="es-mark"></div><h2 class="es-title">' + esc(t('cl.empty.search')) + '</h2>' +
          '<p class="es-hint">' + esc(t('cl.empty.searchHint')) + '</p></div>'
        : '<div class="empty-state"><div class="es-mark"></div><h2 class="es-title">' + esc(t('cl.empty.browse')) + '</h2>' +
          '<p class="es-hint">' + esc(t('cl.empty.browseHint')) + '</p>' +
          '<div class="es-btn"><button class="btn" id="emptyUpload" type="button"><span>' + esc(t('cl.upload')) + '</span><span class="arr"></span></button></div></div>';
      var eu = qs('#emptyUpload');
      if (eu) eu.addEventListener('click', openUploader);
    } else {
      body.innerHTML =
        (folders.length ? '<div class="cl-folders' + (mode === 'list' ? ' is-list' : '') + '">' + folders.map(function (f) {
            var meta = S.folderMeta(f.id);
            return '<div class="cl-folder-item" data-folder="' + f.id + '">' +
              '<span class="cl-fi-icon"></span>' +
              '<span class="cl-fi-main"><span class="cl-fi-name">' + esc(f.name) + '</span>' +
                '<span class="cl-fi-sub">' + meta.files + ' ' + esc(t('cl.stats.files')) +
                (meta.folders ? ' · ' + meta.folders + ' ' + esc(t('cl.stats.folders')) : '') + '</span></span>' +
              '<button class="cl-fi-more" type="button" data-fmenu="' + f.id + '" aria-label="' + esc(t('act.more')) + '">···</button>' +
            '</div>';
          }).join('') + '</div>' : '') +
        '<div class="cl-files' + (mode === 'list' ? ' is-list' : ' is-grid') + '">' + files.map(function (f) {
          return fileItem(f);
        }).join('') + '</div>';
    }

    bindCommon();
    bindBrowse();
  }

  function fileItem(f) {
    var selOn = sel.indexOf(f.id) !== -1;
    if (mode === 'list') {
      return '<div class="cl-row' + (selOn ? ' is-sel' : '') + '" data-file="' + f.id + '">' +
        '<span class="cl-row-check"><input type="checkbox"' + (selOn ? ' checked' : '') + '></span>' +
        '<span class="cl-row-fig">' + (isPreview(f) ? '<img src="' + f.dataUrl + '" alt="">' : '<span class="cl-ext">' + esc(ext(f.name)) + '</span>') + '</span>' +
        '<span class="cl-row-name">' + esc(f.name) + '</span>' +
        '<span class="cl-row-kind">' + esc(S.kindLabel(f.kind, lang())) + '</span>' +
        '<span class="cl-row-size">' + esc(A.prettySize(f.size)) + '</span>' +
        '<span class="cl-row-time">' + esc(I.rel(f.updatedAt)) + '</span>' +
        '<button class="cl-row-more" type="button" data-fmenu2="' + f.id + '" aria-label="' + esc(t('act.more')) + '">···</button>' +
      '</div>';
    }
    return '<div class="cl-card' + (selOn ? ' is-sel' : '') + '" data-file="' + f.id + '">' +
      '<span class="cl-card-check"><input type="checkbox"' + (selOn ? ' checked' : '') + '></span>' +
      '<span class="cl-card-fig">' + (isPreview(f) ? '<img src="' + f.dataUrl + '" alt="">' : '<span class="cl-ext">' + esc(ext(f.name)) + '</span>') + '</span>' +
      '<span class="cl-card-body">' +
        '<span class="cl-card-name">' + esc(f.name) + '</span>' +
        '<span class="cl-card-sub">' + esc(S.kindLabel(f.kind, lang())) + ' · ' + esc(A.prettySize(f.size)) + '</span>' +
        '<span class="cl-card-time">' + esc(I.rel(f.updatedAt)) + '</span>' +
      '</span>' +
      (f.hasContent ? '' : '<span class="cl-card-flag" title="' + esc(t('cl.file.storage.meta')) + '">' + esc(t('cl.file.flagMeta')) + '</span>') +
      '<button class="cl-card-more" type="button" data-fmenu2="' + f.id + '" aria-label="' + esc(t('act.more')) + '">···</button>' +
    '</div>';
  }

  function bindBrowse() {
    var body = qs('#flBody');
    qs('#flSearch').addEventListener('input', function (e) {
      q = e.target.value.trim();
      renderBrowse();
      var el = qs('#flSearch');
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    qs('#flKinds').addEventListener('click', function (e) {
      var b = e.target.closest('[data-kind]');
      if (!b) return;
      kind = b.getAttribute('data-kind');
      renderBrowse();
    });
    qs('#flSort').addEventListener('change', function (e) { sortKey = e.target.value; renderBrowse(); });
    qs('#flDir').addEventListener('click', function () { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; renderBrowse(); });
    qsa('.view-toggle button', root).forEach(function (b) {
      b.addEventListener('click', function () { mode = b.getAttribute('data-mode'); renderBrowse(); });
    });

    qsa('.cl-crumb[data-folder]', root).forEach(function (b) {
      b.addEventListener('click', function () { go('browse', b.getAttribute('data-folder') || null); });
    });

    body.addEventListener('click', function (e) {
      var cb = e.target.closest('input[type="checkbox"]');
      if (cb) {
        var card = e.target.closest('[data-file]');
        if (card) { toggleSel(card.getAttribute('data-file')); renderBrowse(); }
        return;
      }
      var folder = e.target.closest('[data-folder]');
      if (folder && !e.target.closest('[data-fmenu]')) {
        go('browse', folder.getAttribute('data-folder'));
        return;
      }
      var fm = e.target.closest('[data-fmenu]');
      if (fm) { folderMenu(fm.getAttribute('data-fmenu'), fm); return; }
      var fm2 = e.target.closest('[data-fmenu2]');
      if (fm2) { fileMenu(fm2.getAttribute('data-fmenu2'), fm2); return; }
      var file = e.target.closest('[data-file]');
      if (file) {
        /* plain click opens the detail; checkbox toggles selection */
        openFile(file.getAttribute('data-file'));
      }
    });
  }

  /* ================= recycle bin ================= */
  function renderTrash() {
    var rep = renderShell();
    var tr = S.trash();
    root.innerHTML =
      navRow(rep) +
      '<div class="cl-trash-head" data-enter>' +
        '<p class="cl-trash-note">' + esc(t('cl.empty.trashHint')) + '</p>' +
        (tr.files.length + tr.folders.length
          ? '<button class="btn btn-ghost btn-sm is-danger" id="flEmptyTrash" type="button"><span>' + esc(t('cl.trash.empty')) + '</span></button>'
          : '') +
      '</div>';

    if (!tr.files.length && !tr.folders.length) {
      root.insertAdjacentHTML('beforeend',
        '<div class="empty-state" data-enter><div class="es-mark"></div>' +
        '<h2 class="es-title">' + esc(t('cl.empty.trash')) + '</h2>' +
        '<p class="es-hint">' + esc(t('cl.empty.trashHint')) + '</p></div>');
    } else {
      var rows = tr.folders.map(function (f) {
        return '<div class="cl-row"><span class="cl-row-kind">' + esc(t('cl.trash.folderLabel')) + '</span>' +
          '<span class="cl-row-name">' + esc(f.name) + '</span>' +
          '<span class="cl-row-time">' + esc(I.rel(f.deletedAt)) + '</span>' +
          '<span class="cl-row-acts">' +
            '<button class="link-btn" data-restore-folder="' + f.id + '" type="button">' + esc(t('cl.trash.restore')) + '</button>' +
            '<button class="link-btn is-danger" data-purge-folder="' + f.id + '" type="button">' + esc(t('cl.trash.purge')) + '</button>' +
          '</span></div>';
      }).join('') + tr.files.map(function (f) {
        return '<div class="cl-row">' +
          '<span class="cl-row-fig">' + (isPreview(f) ? '<img src="' + f.dataUrl + '" alt="">' : '<span class="cl-ext">' + esc(ext(f.name)) + '</span>') + '</span>' +
          '<span class="cl-row-name">' + esc(f.name) + '</span>' +
          '<span class="cl-row-time">' + esc(I.rel(f.deletedAt)) + '</span>' +
          '<span class="cl-row-acts">' +
            '<button class="link-btn" data-restore-file="' + f.id + '" type="button">' + esc(t('cl.trash.restore')) + '</button>' +
            '<button class="link-btn is-danger" data-purge-file="' + f.id + '" type="button">' + esc(t('cl.trash.purge')) + '</button>' +
          '</span></div>';
      }).join('');
      root.insertAdjacentHTML('beforeend', '<div class="cl-trash-list" data-enter>' + rows + '</div>');
    }

    bindCommon();
    var et = qs('#flEmptyTrash');
    if (et) et.addEventListener('click', function () {
      var n = S.trash().files.length + S.trash().folders.length;
      A.confirm({
        title: t('cl.trash.empty'), hint: t('cl.trash.emptyHint', { n: n }),
        confirmLabel: t('cl.trash.empty'), danger: true,
        onConfirm: function () {
          var res = S.emptyTrash();
          A.toast(res.skipped ? t('tr.skipped', { n: res.skipped }) : t('t.trashEmptied'));
          render();
        }
      });
    });
    qsa('[data-restore-file]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        S.restoreFiles([b.getAttribute('data-restore-file')]);
        A.toast(t('t.fileRestored')); render();
      });
    });
    qsa('[data-restore-folder]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        S.restoreFolder(b.getAttribute('data-restore-folder'));
        A.toast(t('t.fileRestored')); render();
      });
    });
    qsa('[data-purge-file]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-purge-file');
        var f = S.file(id, true);
        A.confirm({
          title: t('cl.trash.purge'), hint: t('cl.trash.purgeHint', { name: f ? f.name : '' }),
          confirmLabel: t('cl.trash.purge'), danger: true,
          onConfirm: function () {
            var res = S.purgeItem('file', id);
            if (res.ok) { A.toast(t('t.filePurged')); render(); return; }
            if (res.reason === 'in-use') {
              var n = (res.usage.designs || []).length + (res.usage.versions || []).length;
              A.toast(t('tr.inUse', { n: n }));
              return;
            }
            A.toast(t('tr.purgeFailed'));
          }
        });
      });
    });
    qsa('[data-purge-folder]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-purge-folder');
        var f = S.folder(id, true);
        A.confirm({
          title: t('cl.trash.purge'), hint: t('cl.trash.purgeHint', { name: f ? f.name : '' }),
          confirmLabel: t('cl.trash.purge'), danger: true,
          onConfirm: function () {
            var res = S.purgeItem('folder', id);
            if (res.ok) A.toast(t('t.filePurged')); else A.toast(t('tr.purgeFailed'));
            render();
          }
        });
      });
    });
  }

  /* ================= menus ================= */
  function folderMenu(id, anchor) {
    var f = S.folder(id);
    if (!f) return;
    var meta = S.folderMeta(id);
    A.menu(anchor, [
      { label: t('cl.folder.rename'), onClick: function () { folderModal(f, f.parentFolderId); } },
      { label: t('cl.folder.move'), onClick: function () { moveModal({ folders: [id] }); } },
      { divider: true },
      { label: t('cl.folder.delete'), danger: true, onClick: function () {
        var hint = (meta.files || meta.folders)
          ? t('cl.folder.deleteHint', { name: f.name, files: meta.files, folders: meta.folders })
          : t('cl.folder.deleteHintEmpty');
        A.confirm({
          title: t('cf.deleteFolder'), hint: hint,
          confirmLabel: t('act.delete'), danger: true,
          onConfirm: function () { S.deleteFolder(id); A.toast(t('t.fileDeleted')); render(); }
        });
      } }
    ]);
  }

  function fileMenu(id, anchor) {
    var f = S.file(id);
    if (!f) return;
    A.menu(anchor, [
      { label: t('cl.file.detail'), onClick: function () { openFile(id); } },
      { label: t('cl.file.rename'), onClick: function () { renameFileModal(f); } },
      { label: t('cl.file.move'), onClick: function () { moveModal({ files: [id] }); } },
      { divider: true },
      { label: t('cl.file.delete'), danger: true, onClick: function () {
        A.confirm({
          title: t('cf.deleteFile'), hint: deleteFileHint([id]),
          confirmLabel: t('act.delete'), danger: true,
          onConfirm: function () { S.deleteFiles([id]); A.toast(t('t.fileDeleted')); render(); }
        });
      } }
    ]);
  }

  /* deleting a file that still backs a design or a version is allowed, but the
     confirmation must say what will break — the bytes stay recoverable until
     the trash is emptied, and the trash refuses to purge a referenced file */
  function deleteFileHint(ids) {
    var n = 0;
    ids.forEach(function (id) {
      var u = S.fileUsage(id);
      if (u) n += u.designs.length + u.versions.length;
    });
    var base = ids.length > 1 ? t('cf.deleteFilesHint', { n: ids.length }) : t('cf.deleteFileHint');
    return base + (n ? ' ' + t('del.fileInUse', { n: n }) : '');
  }

  /* ================= folder modals ================= */
  function folderModal(existing, parentId) {
    var isEdit = !!existing;
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="field"><label class="field-label">' + esc(t('cl.folder.namePh')) + '</label>' +
        '<input class="input" id="fdName" type="text" maxlength="120" placeholder="' + esc(t('cl.folder.namePh')) + '" value="' + esc(existing ? existing.name : '') + '"></div>';
    A.modal({
      title: isEdit ? t('cl.folder.rename') : t('cl.newFolder'), body: body, size: 'sm',
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: isEdit ? t('act.save') : t('act.create'), primary: true, onClick: function (c) {
          var name = qs('#fdName', body).value.trim();
          if (!name) { qs('#fdName', body).focus(); return; }
          var res = isEdit ? S.renameFolder(existing.id, name) : S.createFolder({ name: name, parentFolderId: parentId });
          c();
          if (res) A.toast(isEdit ? t('t.folderRenamed') : t('t.folderCreated'));
          else A.toast(t('cl.nameTaken'));
          render();
        } }
      ]
    });
  }

  function renameFileModal(f) {
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="field"><label class="field-label">' + esc(t('cl.file.rename')) + '</label>' +
        '<input class="input" id="flName" type="text" maxlength="160" value="' + esc(f.name) + '"></div>';
    A.modal({
      title: t('cl.file.rename'), body: body, size: 'sm',
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.save'), primary: true, onClick: function (c) {
          var name = qs('#flName', body).value.trim();
          if (!name) { qs('#flName', body).focus(); return; }
          var res = S.renameFile(f.id, name);
          c();
          A.toast(res ? t('t.folderRenamed') : t('cl.nameTaken'));
          render();
        } }
      ]
    });
  }

  /* move files and/or folders — cycles and self-moves are filtered out */
  function moveModal(opts) {
    var folderIds = opts.folders || [];
    var fileIds = opts.files || [];
    var body = document.createElement('div');
    var list = S.allFolders().filter(function (f) {
      if (folderIds.indexOf(f.id) !== -1) return false;
      var bad = folderIds.some(function (id) { return !S.canMoveFolder(id, f.id); });
      return !bad;
    });
    body.innerHTML =
      '<p class="m-hint">' + esc(t('cl.moveHint')) + '</p>' +
      '<div class="pick-list">' +
        '<label class="pick-row" data-fid=""><input type="radio" name="mv"><span class="pick-text">' +
          '<span class="pick-name">' + esc(t('cl.folder.moveToRoot')) + '</span></span></label>' +
        list.map(function (f) {
          var depth = S.folderPath(f.id).length - 1;
          return '<label class="pick-row" data-fid="' + f.id + '"><input type="radio" name="mv">' +
            '<span class="pick-text"><span class="pick-name">' +
            (depth ? '<span style="color:var(--ink-3)">' + new Array(depth + 1).join('— ') + '</span>' : '') +
            esc(f.name) + '</span></span></label>';
        }).join('') +
      '</div>';
    if (!list.length) body.insertAdjacentHTML('afterbegin', '<p class="pick-empty">' + esc(t('cl.noTarget')) + '</p>');

    A.modal({
      title: t('cl.folder.move'), body: body, size: 'sm',
      footer: [
        { label: t('act.cancel'), onClick: function (c) { c(); } },
        { label: t('act.confirm'), primary: true, onClick: function (c) {
          var pick = qsa('.pick-row', body).filter(function (r) { return qs('input', r).checked; })[0];
          var target = pick ? (pick.getAttribute('data-fid') || null) : null;
          var n = 0;
          if (fileIds.length) n += S.moveFiles(fileIds, target);
          folderIds.forEach(function (id) { if (S.moveFolder(id, target)) n++; });
          c();
          if (n) A.toast(t('t.fileMoved', { n: n }));
          sel = [];
          render();
        } }
      ]
    });
  }

  /* ================= file detail ================= */
  function openFile(id) {
    var f = S.file(id);
    if (!f) return;
    S.touchFile(id);
    var ctx = S.fileContext(id);
    var folder = f.folderId ? S.folder(f.folderId) : null;

    var body = document.createElement('div');
    body.className = 'cl-detail';
    body.innerHTML =
      '<div class="cl-detail-fig">' +
        (isPreview(f)
          ? '<img src="' + f.dataUrl + '" alt="">'
          : '<div class="cl-detail-icon"><span class="cl-ext is-lg">' + esc(ext(f.name) || '—') + '</span>' +
            '<p class="cl-detail-nonote">' + esc(t('cl.file.noPreview')) + '</p></div>') +
      '</div>' +
      '<div class="cl-detail-info">' +
        '<h3 class="cl-detail-name">' + esc(f.name) + '</h3>' +
        '<dl class="meta-rows">' +
          '<div class="meta-row"><dt>' + esc(t('cl.file.format')) + '</dt><dd>' + esc((ext(f.name) || f.mimeType || '—').toUpperCase()) + '</dd></div>' +
          '<div class="meta-row"><dt>' + esc(t('cl.file.size')) + '</dt><dd>' + esc(A.prettySize(f.size)) + '</dd></div>' +
          '<div class="meta-row"><dt>' + esc(t('cl.file.folder')) + '</dt><dd>' + esc(folder ? folder.name : t('cl.folder.moveToRoot')) + '</dd></div>' +
          '<div class="meta-row"><dt>' + esc(t('cl.file.source')) + '</dt><dd>' + esc(t('cl.file.sourceUpload')) + '</dd></div>' +
          '<div class="meta-row"><dt>' + esc(t('cl.file.storage')) + '</dt><dd>' +
            esc(f.hasContent ? t('cl.file.storage.local') : t('cl.file.storage.meta')) + '</dd></div>' +
          '<div class="meta-row"><dt>' + esc(t('cl.file.created')) + '</dt><dd>' + esc(I.date(f.createdAt)) + '</dd></div>' +
          '<div class="meta-row"><dt>' + esc(t('meta.updated')) + '</dt><dd>' + esc(I.date(f.updatedAt)) + '</dd></div>' +
          '<div class="meta-row"><dt>' + esc(t('cl.file.accessed')) + '</dt><dd>' + esc(f.lastAccessedAt ? I.rel(f.lastAccessedAt) : '—') + '</dd></div>' +
        '</dl>' +

        '<p class="info-label" style="margin-top:26px">' + esc(t('cl.file.links')) + '</p>' +
        '<div class="cl-links">' +
          '<div class="cl-link-block">' +
            '<p class="cl-link-l">' + esc(t('cl.file.linkDesigns')) + '</p>' +
            (ctx.designs.length
              ? '<div class="chipset">' + ctx.designs.map(function (d) {
                  return '<a class="chip-link" href="design.html?id=' + d.id + '">' + esc(S.name(d, lang())) +
                    '<button class="chip-x" data-unlink="' + d.id + '" type="button" title="' + esc(t('cl.file.removeLink')) + '">×</button></a>';
                }).join('') + '</div>'
              : '<p class="text-muted-note">' + esc(t('cl.file.linkNone')) + '</p>') +
            '<button class="link-btn" id="flLinkDesign" type="button">' + esc(t('cl.file.addDesignLink')) + '</button>' +
          '</div>' +
          '<div class="cl-link-block">' +
            '<p class="cl-link-l">' + esc(t('cl.file.linkProjects')) + '</p>' +
            (ctx.projects.length
              ? '<div class="chipset">' + ctx.projects.map(function (p) {
                  return '<a class="chip-link" href="project.html?id=' + p.id + '">' + esc(S.name(p, lang())) + '</a>';
                }).join('') + '</div>'
              : '<p class="text-muted-note">—</p>') +
            '<p class="cl-link-l" style="margin-top:16px">' + esc(t('cl.file.linkCollections')) + '</p>' +
            (ctx.collections.length
              ? '<div class="chipset">' + ctx.collections.map(function (c) {
                  return '<a class="chip-link" href="collection.html?id=' + c.id + '">' + esc(S.name(c, lang())) + '</a>';
                }).join('') + '</div>'
              : '<p class="text-muted-note">—</p>') +
            '<p class="cl-link-l" style="margin-top:16px">' + esc(t('cl.file.linkBrand')) + '</p>' +
            '<p class="text-muted-note">' + (ctx.brandAssetCount ? esc(t('cl.file.brandUsed', { n: ctx.brandAssetCount })) : '—') + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var footer = [
      { label: t('cl.file.move'), onClick: function (c) { c(); moveModal({ files: [id] }); } },
      { label: t('cl.file.rename'), onClick: function (c) { c(); renameFileModal(f); } }
    ];
    if (f.dataUrl) {
      footer.push({ label: t('cl.file.download'), onClick: function () {
        var a = document.createElement('a');
        a.href = f.dataUrl;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } });
    }
    footer.push({ label: t('cl.file.delete'), danger: true, onClick: function (c) {
      c();
      A.confirm({
        title: t('cf.deleteFile'), hint: deleteFileHint([id]),
        confirmLabel: t('act.delete'), danger: true,
        onConfirm: function () { S.deleteFiles([id]); A.toast(t('t.fileDeleted')); render(); }
      });
    } });

    A.modal({ title: t('cl.file.detail'), body: body, size: 'lg', focus: false, footer: footer });

    qsa('[data-unlink]', body).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        S.unlinkFileFromDesign(id, b.getAttribute('data-unlink'));
        A.toast(t('t.linkRemoved'));
        A.closeModal();
        setTimeout(function () { openFile(id); }, 240);
      });
    });
    var lb = qs('#flLinkDesign', body);
    if (lb) lb.addEventListener('click', function () {
      var exclude = f.designIds.slice();
      A.pickDesigns({
        exclude: exclude, title: t('cl.file.addDesignLink'),
        onDone: function (ids) {
          if (!ids.length) return;
          ids.forEach(function (did) { S.linkFileToDesign(id, did); });
          A.toast(t('t.linkAdded'));
          openFile(id);
        }
      });
    });
  }

  /* ================= upload ================= */
  function openUploader() {
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="upload-zone" id="upZone">' +
        '<div class="uz-icon"></div>' +
        '<p class="uz-title">' + esc(t('cl.upload')) + '</p>' +
        '<p class="uz-note">' + esc(t('cl.uploadDrop')) + '</p>' +
        '<p class="uz-note">' + esc(t('cl.uploadHint')) + '</p>' +
        '<input type="file" multiple hidden>' +
      '</div>' +
      '<p class="m-hint">' + esc(t('cl.up.note')) + '</p>' +
      '<div class="cl-upload-list" id="upList"></div>';
    var input = qs('input[type=file]', body);

    function ingest(files) {
      if (!files || !files.length) return;
      Array.prototype.forEach.call(files, function (file) {
        uploads.push({
          id: 'u' + Math.random().toString(36).slice(2, 9),
          name: file.name, size: file.size, kind: A.fileKind(file),
          status: 'queued', reason: '', file: file
        });
      });
      renderUploads(qs('#upList', body) || qs('#upList'));
      process();
    }

    var zone = qs('#upZone', body);
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

    A.modal({
      title: t('cl.upload'), body: body, size: 'lg', focus: false,
      footer: [
        { label: t('cl.up.clearDone'), onClick: function () {
          uploads = uploads.filter(function (u) { return u.status !== 'done'; });
          renderUploads(qs('#upList', body));
        } },
        { label: t('act.close') || t('act.cancel'), primary: true, onClick: function (c) { c(); render(); } }
      ]
    });
    renderUploads(qs('#upList', body));
  }

  function renderUploads(el) {
    if (!el) return;
    if (!uploads.length) { el.innerHTML = ''; return; }
    var label = { queued: t('cl.up.queued'), working: t('cl.up.working'), done: t('cl.up.done'), error: t('cl.up.error') };
    var reason = { quota: t('cl.up.errQuota'), read: t('cl.up.errRead'), folder: t('cl.up.errFolder') };
    el.innerHTML = uploads.map(function (u) {
      return '<div class="cl-up' + (u.status === 'error' ? ' is-error' : '') + '" data-uid="' + u.id + '">' +
        '<span class="cl-up-dot is-' + u.status + '"></span>' +
        '<span class="cl-up-name">' + esc(u.name) + '</span>' +
        '<span class="cl-up-sub">' + esc(A.prettySize(u.size)) + '</span>' +
        '<span class="cl-up-state">' + esc(label[u.status]) +
          (u.status === 'error' && u.reason ? ' · ' + esc(reason[u.reason] || u.reason) : '') +
          (u.status === 'done' && !u.saved ? ' · ' + esc(t('cl.file.storage.meta')) : '') + '</span>' +
        (u.status === 'error' ? '<button class="link-btn" data-retry="' + u.id + '" type="button">' + esc(t('cl.up.retry')) + '</button>' : '') +
      '</div>';
    }).join('');
    qsa('[data-retry]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-retry');
        uploads.forEach(function (u) { if (u.id === id) { u.status = 'queued'; u.reason = ''; } });
        process();
      });
    });
  }

  var processing = false;
  function process() {
    if (processing) return;
    var next = null;
    uploads.forEach(function (u) { if (!next && u.status === 'queued') next = u; });
    if (!next) { processing = false; return; }
    processing = true;
    next.status = 'working';
    var el = qs('#upList');
    renderUploads(el);

    var finish = function (ok, reason, saved) {
      var done = function () {
        next.status = ok ? 'done' : 'error';
        next.reason = ok ? '' : reason;
        next.saved = !!saved;
        renderUploads(qs('#upList'));
        processing = false;
        process();
        render();
      };
      setTimeout(done, 260);          /* let the "uploading" state be visible */
    };

    if (!next.file) { finish(false, 'read'); return; }

    if (A.isImageFile(next.file)) {
      A.readImage(next.file, 1200, function (dataUrl) {
        if (!dataUrl) { finish(false, 'read'); return; }
        var res = S.addFile({
          name: next.file.name, mimeType: next.file.type, size: next.file.size,
          kind: 'image', dataUrl: dataUrl, folderId: curFolder
        });
        finish(res.ok, res.reason, true);
      });
      return;
    }

    if (next.file.size > MAX_CONTENT) {
      /* cannot keep the body — record the file, and say so plainly */
      var r0 = S.addFile({
        name: next.file.name, mimeType: next.file.type, size: next.file.size,
        kind: A.fileKind(next.file), dataUrl: null, folderId: curFolder,
        note: 'content-not-stored'
      });
      finish(r0.ok, r0.reason, false);
      return;
    }

    var fr = new FileReader();
    fr.onload = function () {
      var r = S.addFile({
        name: next.file.name, mimeType: next.file.type, size: next.file.size,
        kind: A.fileKind(next.file), dataUrl: fr.result, folderId: curFolder
      });
      finish(r.ok, r.reason, true);
    };
    fr.onerror = function () { finish(false, 'read'); };
    fr.readAsDataURL(next.file);
  }

  /* ================= selection bar ================= */
  function renderSelBar() {
    var old = qs('#clSelBar');
    if (old) old.remove();
    if (view !== 'browse' || !sel.length) return;
    var bar = document.createElement('div');
    bar.id = 'clSelBar';
    bar.className = 'cl-selbar';
    bar.innerHTML =
      '<span class="cl-selbar-n">' + esc(t('cl.sel.count', { n: sel.length })) + '</span>' +
      '<button class="btn btn-ghost btn-sm" data-act="move" type="button"><span>' + esc(t('cl.sel.move')) + '</span></button>' +
      '<button class="btn btn-ghost btn-sm is-danger" data-act="del" type="button"><span>' + esc(t('cl.sel.delete')) + '</span></button>' +
      '<button class="link-btn" data-act="clear" type="button">' + esc(t('cl.sel.clear')) + '</button>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'clear') { sel = []; render(); }
      if (act === 'move') moveModal({ files: sel.slice() });
      if (act === 'del') {
        A.confirm({
          title: t('cf.deleteFiles'), hint: deleteFileHint(sel),
          confirmLabel: t('act.delete'), danger: true,
          onConfirm: function () {
            S.deleteFiles(sel.slice());
            A.toast(t('t.fileDeleted'));
            sel = [];
            render();
          }
        });
      }
    });
  }

  /* ================= common bindings ================= */
  function bindCommon() {
    qsa('[data-v]', root).forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-v')); });
    });
    renderSelBar();
    A.enter();
  }

  /* ================= render ================= */
  function render() {
    view = VIEWS.indexOf(view) === -1 ? 'home' : view;
    if (view === 'home') renderHome();
    else if (view === 'browse') renderBrowse();
    else renderTrash();
    I.apply(lang(), headEl);
    if (pendingFile) {
      var fid = pendingFile;
      pendingFile = null;
      setTimeout(function () {
        if (S.file(fid)) openFile(fid);
        /* a deep link to a file that is in the recycle bin must say so,
           not open nothing at all */
        else if (S.file(fid, true)) A.toast(t('t.fileDeleted'));
      }, 220);
    }
  }

  window.addEventListener('popstate', function () { view = readView(); render(); });
  document.addEventListener('studio:quota', function () { A.toast(t('t.quota')); });

  A.page(render);
})();
