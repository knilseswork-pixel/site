/**
 * Публикация JSON-файлов в GitHub через REST API.
 * Токен передаётся из админки при каждой публикации (не хранится в коде сайта).
 */
(function () {
  var STORAGE_GH = 'workout_github_token';
  var DEFAULT_REPO   = 'knilseswork-pixel/site';
  var DEFAULT_BRANCH = 'main';

  var FILE_PATHS = {
    siteConfig : 'data/site-config.json',
    content    : 'data/content.json',
    sections   : 'data/sections.json',
  };

  function isPlaceholderToken(token) {
    var t = String(token || '').trim();
    return !t || t === 'YOUR_TOKEN_HERE' || t === 'ghp_xxxxxxxxxxxxxxxx';
  }

  function normalizeToken(token) {
    var t = String(token || '').trim();
    return isPlaceholderToken(t) ? '' : t;
  }

  function apiBase() {
    return 'https://api.github.com/repos/' + DEFAULT_REPO;
  }

  function authHeaderValue(token) {
    var t = normalizeToken(token);
    if (!t) return '';
    if (/^github_pat_/i.test(t)) return 'Bearer ' + t;
    return 'token ' + t;
  }

  function authHeaders(token) {
    return {
      Authorization : authHeaderValue(token),
      Accept        : 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };
  }

  function authErrorHint(status) {
    if (status === 401) {
      return 'Токен недействителен (401). Создайте новый: github.com/settings/tokens → classic → scope repo.';
    }
    if (status === 403) {
      return 'Нет прав (403). Нужен scope repo для репозитория site.';
    }
    return 'HTTP ' + status;
  }

  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function getFileSha(token, filePath) {
    var res = await fetch(apiBase() + '/contents/' + filePath, {
      headers: authHeaders(token),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(authErrorHint(res.status) + ' (' + filePath + ')');
    var json = await res.json();
    return json.sha || null;
  }

  async function pushFile(token, filePath, jsonContent, commitMessage) {
    var sha = await getFileSha(token, filePath);
    var body = {
      message : commitMessage,
      branch  : DEFAULT_BRANCH,
      content : toBase64(jsonContent),
    };
    if (sha) body.sha = sha;

    var res = await fetch(apiBase() + '/contents/' + filePath, {
      method  : 'PUT',
      headers : authHeaders(token),
      body    : JSON.stringify(body),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(authErrorHint(res.status) + ' (' + filePath + ')');
      }
      var hint = res.status === 409 ? ' — конфликт, попробуйте ещё раз' : '';
      throw new Error('GitHub ' + res.status + hint + ' (' + filePath + ')');
    }
    return await res.json();
  }

  async function checkToken(token) {
    var t = normalizeToken(token);
    if (!t) return { ok: false, reason: 'Введите токен ghp_…' };
    try {
      var res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization : authHeaderValue(t),
          Accept        : 'application/vnd.github+json',
        },
      });
      if (!res.ok) return { ok: false, reason: authErrorHint(res.status), status: res.status };
      var user = await res.json();
      return { ok: true, login: user.login };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  async function publishAll(files, onProgress, token) {
    var t = normalizeToken(token);
    if (!t) {
      throw new Error('Введите токен GitHub в поле перед публикацией.');
    }
    var check = await checkToken(t);
    if (!check.ok) {
      throw new Error(check.reason || authErrorHint(check.status || 401));
    }

    var ts = new Date().toLocaleString('ru');
    var msg = 'site update ' + ts;

    var tasks = [
      { key: 'siteConfig', label: 'site-config.json' },
      { key: 'content',    label: 'content.json' },
      { key: 'sections',   label: 'sections.json' },
    ].filter(function (x) { return files[x.key] != null; });

    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      if (onProgress) onProgress('📤 ' + task.label + ' (' + (i + 1) + '/' + tasks.length + ')…');
      await pushFile(t, FILE_PATHS[task.key], JSON.stringify(files[task.key], null, 2), msg);
    }

    if (onProgress) onProgress('✅ Готово! GitHub Pages обновится через ~1 минуту.');
  }

  function saveStoredToken(token) {
    var t = normalizeToken(token);
    try {
      if (t) localStorage.setItem(STORAGE_GH, t);
      else localStorage.removeItem(STORAGE_GH);
    } catch (e) { /* ignore */ }
  }

  function loadStoredToken() {
    try {
      return normalizeToken(localStorage.getItem(STORAGE_GH) || '');
    } catch (e) {
      return '';
    }
  }

  function clearStoredToken() {
    try {
      localStorage.removeItem(STORAGE_GH);
      localStorage.removeItem('workout_github_settings');
    } catch (e) { /* ignore */ }
    if (window.__WORKOUT_GH_TOKEN__) window.__WORKOUT_GH_TOKEN__ = '';
  }

  function hasStoredToken() {
    return !!loadStoredToken();
  }

  window.GitHubPush = {
    DEFAULT_REPO     : DEFAULT_REPO,
    DEFAULT_BRANCH   : DEFAULT_BRANCH,
    normalizeToken   : normalizeToken,
    checkToken         : checkToken,
    publishAll         : publishAll,
    saveStoredToken    : saveStoredToken,
    loadStoredToken    : loadStoredToken,
    clearStoredToken   : clearStoredToken,
    hasStoredToken     : hasStoredToken,
  };
})();
