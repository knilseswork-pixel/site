/**
 * Публикация JSON-файлов напрямую в GitHub через REST API
 * Репозиторий и ветка зашиты — нужно только ввести токен один раз.
 */
(function () {
  var STORAGE_GH = 'workout_github_settings';

  /* ── Зашитые настройки ── */
  var DEFAULT_REPO   = 'knilseswork-pixel/site';
  var DEFAULT_BRANCH = 'main';

  /* Папки файлов в репозитории */
  var FILE_PATHS = {
    siteConfig : 'data/site-config.json',
    content    : 'data/content.json',
    sections   : 'data/sections.json',
  };

  /* ── Хранение токена ── */
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(STORAGE_GH) || '{}');
      /* Всегда используем зашитые значения, токен — из localStorage */
      s.repo   = DEFAULT_REPO;
      s.branch = DEFAULT_BRANCH;
      return s;
    } catch (e) {
      return { repo: DEFAULT_REPO, branch: DEFAULT_BRANCH };
    }
  }

  function saveSettings(s) {
    /* Сохраняем только токен; repo и branch берём из констант */
    localStorage.setItem(STORAGE_GH, JSON.stringify({ token: s.token || '' }));
  }

  function getSettings() {
    return loadSettings();
  }

  function isPlaceholderToken(token) {
    var t = String(token || '').trim();
    return !t || t === 'YOUR_TOKEN_HERE' || t === 'ghp_xxxxxxxxxxxxxxxx';
  }

  function getEmbeddedToken() {
    var t = String(window.__WORKOUT_GH_TOKEN__ || '').trim();
    return isPlaceholderToken(t) ? '' : t;
  }

  function getActiveToken() {
    var embedded = getEmbeddedToken();
    if (embedded) return embedded;
    var s = loadSettings();
    return (s.token || '').trim();
  }

  function hasEmbeddedToken() {
    return !!getEmbeddedToken();
  }

  function hasToken() {
    return !!getActiveToken();
  }

  /* ── Base64 для браузера ── */
  function toBase64(str) {
    /* encodeURIComponent + unescape позволяет корректно кодировать юникод */
    return btoa(unescape(encodeURIComponent(str)));
  }

  /* ── GitHub API helpers ── */
  function apiBase() {
    return 'https://api.github.com/repos/' + DEFAULT_REPO;
  }

  function authHeaderValue(token) {
    var t = String(token || '').trim();
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
      return (
        'Токен недействителен (401). Создайте новый: github.com/settings/tokens → classic → scope repo. ' +
        'Вставьте в js/github-token.config.js и залейте файл на сайт.'
      );
    }
    if (status === 403) {
      return 'Нет прав (403). Нужен scope repo или доступ Contents к репозиторию site.';
    }
    return 'HTTP ' + status;
  }

  /* Получить SHA файла — нужен для обновления существующего файла */
  async function getFileSha(token, filePath) {
    var res = await fetch(apiBase() + '/contents/' + filePath, {
      headers: authHeaders(token),
    });
    if (res.status === 404) return null;           /* файла ещё нет — создадим */
    if (!res.ok) throw new Error(authErrorHint(res.status) + ' (' + filePath + ')');
    var json = await res.json();
    return json.sha || null;
  }

  /* Создать или обновить один файл */
  async function pushFile(token, filePath, jsonContent, commitMessage) {
    var sha     = await getFileSha(token, filePath);
    var body    = {
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
      var errText = await res.text();
      var hint = '';
      if (res.status === 401 || res.status === 403) {
        throw new Error(authErrorHint(res.status) + ' (' + filePath + ')');
      }
      if (res.status === 409) hint = ' — конфликт SHA, попробуйте ещё раз';
      throw new Error('GitHub ' + res.status + hint + '\n' + filePath);
    }
    return await res.json();
  }

  /**
   * Публикует все JSON-файлы в репозиторий.
   * @param {object}   files      { content, sections, siteConfig } — объекты данных
   * @param {function} onProgress (statusString) => void
   */
  async function publishAll(files, onProgress) {
    var token = getActiveToken();
    if (!token) {
      throw new Error(
        'Токен не задан. Вставьте ghp_... в js/github-token.config.js и загрузите файл на хостинг.'
      );
    }
    var check = await checkToken();
    if (!check.ok) {
      throw new Error(authErrorHint(check.status || 401));
    }
    var ts    = new Date().toLocaleString('ru');
    var msg   = 'site update ' + ts;

    var tasks = [
      { key: 'siteConfig', label: 'site-config.json' },
      { key: 'content',    label: 'content.json' },
      { key: 'sections',   label: 'sections.json' },
    ].filter(function (t) { return files[t.key] != null; });

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (onProgress) onProgress('📤 ' + t.label + ' (' + (i + 1) + '/' + tasks.length + ')…');
      var jsonStr = JSON.stringify(files[t.key], null, 2);
      await pushFile(token, FILE_PATHS[t.key], jsonStr, msg);
    }

    if (onProgress) onProgress('✅ Готово! GitHub Pages обновится через ~1 минуту.');
  }

  /* Проверить, что токен вообще рабочий */
  async function checkToken() {
    var token = getActiveToken();
    if (!token) return { ok: false, reason: 'Токен не задан' };
    try {
      var res = await fetch('https://api.github.com/user', {
        headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return { ok: false, reason: authErrorHint(res.status), status: res.status };
      var user = await res.json();
      return { ok: true, login: user.login };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  window.GitHubPush = {
    DEFAULT_REPO   : DEFAULT_REPO,
    DEFAULT_BRANCH : DEFAULT_BRANCH,
    loadSettings   : loadSettings,
    saveSettings   : saveSettings,
    getSettings    : getSettings,
    hasToken         : hasToken,
    hasEmbeddedToken : hasEmbeddedToken,
    getActiveToken   : getActiveToken,
    publishAll       : publishAll,
    checkToken       : checkToken,
  };
})();
