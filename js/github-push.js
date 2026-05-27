/**
 * Публикация JSON-файлов напрямую в GitHub через REST API
 * Требует: Personal Access Token с правом repo (или contents:write для fine-grained)
 */
(function () {
  var STORAGE_GH = 'workout_github_settings';

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_GH) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveSettings(s) {
    localStorage.setItem(STORAGE_GH, JSON.stringify(s));
  }

  function getSettings() {
    return loadSettings();
  }

  /* Base64 для браузера */
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /* Получить текущий SHA файла (нужен для обновления) */
  async function getFileSha(api, token, path) {
    var url = api + '/contents/' + path;
    var res = await fetch(url, {
      headers: {
        Authorization: 'token ' + token,
        Accept: 'application/vnd.github+json',
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('GitHub API error ' + res.status + ' при чтении ' + path);
    var json = await res.json();
    return json.sha || null;
  }

  /* Загрузить/обновить файл */
  async function pushFile(api, token, path, content, message) {
    var sha = await getFileSha(api, token, path);
    var body = {
      message: message,
      content: toBase64(content),
    };
    if (sha) body.sha = sha;

    var res = await fetch(api + '/contents/' + path, {
      method: 'PUT',
      headers: {
        Authorization: 'token ' + token,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      var err = await res.text();
      throw new Error('Ошибка GitHub для ' + path + ': ' + err);
    }
    return await res.json();
  }

  /**
   * Публикует все три JSON файла в репозиторий
   * @param {object} files { content, sections, siteConfig }
   * @param {function} onProgress (msg) => void
   */
  async function publishAll(files, onProgress) {
    var s = loadSettings();
    if (!s.token) throw new Error('Не задан GitHub Token. Откройте Настройки → GitHub.');
    if (!s.repo) throw new Error('Не указан репозиторий (Настройки → GitHub).');

    var api = 'https://api.github.com/repos/' + s.repo.trim().replace(/^\/|\/$/g, '');
    var branch = (s.branch || 'main').trim();
    var ts = new Date().toLocaleString('ru');
    var msg = 'Обновление данных сайта ' + ts;

    var tasks = [];
    if (files.siteConfig != null) {
      tasks.push({ path: 'data/site-config.json', data: files.siteConfig });
    }
    if (files.content != null) {
      tasks.push({ path: 'data/content.json', data: files.content });
    }
    if (files.sections != null) {
      tasks.push({ path: 'data/sections.json', data: files.sections });
    }

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (onProgress) onProgress('Отправляю ' + t.path + ' (' + (i + 1) + '/' + tasks.length + ')…');
      await pushFile(api, s.token, t.path, JSON.stringify(t.data, null, 2), msg);
    }

    if (onProgress) onProgress('Готово! GitHub Pages обновится через 1–2 минуты.');
  }

  async function checkToken() {
    var s = loadSettings();
    if (!s.token) return false;
    var res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: 'token ' + s.token,
        Accept: 'application/vnd.github+json',
      },
    });
    return res.ok;
  }

  window.GitHubPush = {
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    getSettings: getSettings,
    publishAll: publishAll,
    checkToken: checkToken,
  };
})();
