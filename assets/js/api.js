/* ==========================================================================
   STUDIO · API client (Phase 11)
   Same-origin calls only: the API serves both /api/* and the site, so the
   session cookie just works and there is no CORS to configure.

   Failures are surfaced, not swallowed: 401 sends the user to the login
   page, plan limits come back as a real message instead of silence.
   ========================================================================== */
(function () {
  'use strict';

  var listeners = [];

  function request(method, path, body) {
    var opts = {
      method: method,
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(path, opts).then(function (res) {
      if (res.status === 401) { fire('unauthorized'); throw err(401, '登录状态已失效，请重新登录', 'NOT_AUTHENTICATED'); }
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
        if (!res.ok) {
          var code = data.error || 'HTTP_' + res.status;
          throw err(res.status, data.message || code, code, data.detail);
        }
        return data;
      });
    });
  }

  function err(status, message, code, detail) {
    var e = new Error(message || code || '请求失败');
    e.status = status; e.code = code; e.detail = detail;
    return e;
  }

  function fire(type, payload) {
    listeners.forEach(function (fn) { try { fn(type, payload); } catch (e) {} });
  }

  var Api = {
    on: function (fn) { listeners.push(fn); },
    me: function () { return request('GET', '/api/auth/me'); },
    login: function (email, password) { return request('POST', '/api/auth/login', { email: email, password: password }); },
    register: function (data) { return request('POST', '/api/auth/register', data); },
    logout: function () { return request('POST', '/api/auth/logout', {}); },
    saveAccount: function (patch) { return request('PATCH', '/api/account', patch); },
    setPassword: function (currentPassword, newPassword) {
      return request('POST', '/api/account/password', { currentPassword: currentPassword, newPassword: newPassword });
    },
    state: function () { return request('GET', '/api/state'); },
    /* full-state sync: the server diffs it, enforces workspace ownership and
       plan limits, then returns the authoritative state */
    sync: function (state) { return request('POST', '/api/sync', { state: state }); },
    importLocal: function (state, workspaceId) { return request('POST', '/api/import', { state: state, workspaceId: workspaceId }); },
    workspaces: function () { return request('GET', '/api/workspaces'); },
    createWorkspace: function (data) { return request('POST', '/api/workspaces', data); },
    updateWorkspace: function (id, patch) { return request('PATCH', '/api/workspaces/' + id, patch); },
    selectWorkspace: function (id) { return request('POST', '/api/workspaces/' + id + '/select', {}); },
    workspaceImpact: function (id) { return request('GET', '/api/workspaces/' + id + '/impact'); },
    deleteWorkspace: function (id, confirmName) {
      return request('DELETE', '/api/workspaces/' + id, { confirmName: confirmName, confirmDelete: true });
    },
    plans: function () { return request('GET', '/api/plans'); },
    subscription: function () { return request('GET', '/api/subscription'); },
    changePlan: function (planId) { return request('POST', '/api/subscription/change', { planId: planId }); },
    usage: function () { return request('GET', '/api/usage'); }
  };

  window.StudioApi = Api;
})();
