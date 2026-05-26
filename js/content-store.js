/**
 * Загрузка и сохранение контента (без ES-модулей — совместимость с телефонами)
 */
(function () {
  const STORAGE_CONTENT = 'workout_content_data';
  const STORAGE_SESSION = 'workout_admin_session';
  const STORAGE_SESSION_UNTIL = 'workout_admin_until';
  const STORAGE_PASSWORD = 'workout_admin_password_hash';
  const STORAGE_JSONBIN = 'workout_jsonbin_settings';

  let contentData = null;
  let adminConfig = null;

  function assetUrl(path) {
    return window.Workout?.assetUrl ? window.Workout.assetUrl(path) : path;
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function loadAdminConfig() {
    if (adminConfig) return adminConfig;
    try {
      const res = await fetch(assetUrl('data/admin-config.json'));
      if (res.ok) adminConfig = await res.json();
    } catch {
      adminConfig = {};
    }
    return adminConfig;
  }

  function getPasswordHash() {
    return localStorage.getItem(STORAGE_PASSWORD) || adminConfig?.passwordHash || '';
  }

  async function verifyPassword(password) {
    const hash = await sha256(password);
    return hash === getPasswordHash();
  }

  function isAdminLoggedIn() {
    if (sessionStorage.getItem(STORAGE_SESSION) === '1') return true;
    var until = parseInt(localStorage.getItem(STORAGE_SESSION_UNTIL) || '0', 10);
    if (until > Date.now()) {
      sessionStorage.setItem(STORAGE_SESSION, '1');
      return true;
    }
    return false;
  }

  function setAdminLoggedIn(value) {
    if (value) {
      sessionStorage.setItem(STORAGE_SESSION, '1');
      /* 30 дней на этом устройстве (телефон или ПК) */
      localStorage.setItem(STORAGE_SESSION_UNTIL, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    } else {
      sessionStorage.removeItem(STORAGE_SESSION);
      localStorage.removeItem(STORAGE_SESSION_UNTIL);
    }
  }

  function getJsonBinSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_JSONBIN) || '{}');
    } catch {
      return {};
    }
  }

  async function fetchJsonBin() {
    const cfg = await loadAdminConfig();
    const local = getJsonBinSettings();
    const binId = local.binId || cfg.jsonBinId;
    const accessKey = local.accessKey || cfg.jsonBinAccessKey;
    if (!binId) return null;

    const headers = { 'X-Bin-Meta': 'false' };
    if (accessKey) headers['X-Access-Key'] = accessKey;

    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.record || null;
  }

  async function loadContent() {
    let loadError = null;
    var serverData = null;

    try {
      var url = assetUrl('data/content.json');
      var res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      serverData = await res.json();
      contentData = serverData;
    } catch (e) {
      loadError = e;
      contentData = { site: {}, articles: [] };
    }

    var local = localStorage.getItem(STORAGE_CONTENT);
    if (local) {
      try {
        var parsed = JSON.parse(local);
        if (parsed && parsed.articles && parsed.articles.length) {
          contentData = parsed;
        }
      } catch (err) {
        /* keep server */
      }
    }

    var jsonBinSettings = getJsonBinSettings();
    if (jsonBinSettings.binId && jsonBinSettings.accessKey) {
      var remote = await fetchJsonBin();
      if (remote && remote.articles && remote.articles.length) {
        contentData = remote;
      }
    }

    if (!contentData || !contentData.articles || !contentData.articles.length) {
      if (serverData && serverData.articles && serverData.articles.length) {
        contentData = serverData;
      }
    }

    if (!contentData || !contentData.articles || !contentData.articles.length) {
      window.Workout = window.Workout || {};
      window.Workout.loadError = loadError;
    }

    return contentData;
  }

  function saveContentLocal(data) {
    contentData = data;
    localStorage.setItem(STORAGE_CONTENT, JSON.stringify(data));
  }

  function clearContentLocal() {
    localStorage.removeItem(STORAGE_CONTENT);
  }

  async function publishToJsonBin(data) {
    const settings = getJsonBinSettings();
    if (!settings.binId || !settings.masterKey) {
      throw new Error('Настройте JSONBin в панели администратора');
    }
    const res = await fetch(`https://api.jsonbin.io/v3/b/${settings.binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': settings.masterKey,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка публикации в облако');
    saveContentLocal(data);
    return true;
  }

  function downloadContentJson(data) {
    const payload = data || contentData;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'content.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importContentFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data.articles) throw new Error('Неверный формат');
          saveContentLocal(data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  }

  function slugId(title) {
    const cyr = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
      к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
      х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    };
    let s = title.toLowerCase().trim();
    s = [...s].map((ch) => cyr[ch] ?? ch).join('');
    s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return s || 'article-' + Date.now();
  }

  window.WorkoutStore = {
    STORAGE_PASSWORD,
    STORAGE_JSONBIN,
    getContentData: () => contentData,
    setContentData: (d) => { contentData = d; },
    sha256,
    loadAdminConfig,
    getPasswordHash,
    verifyPassword,
    isAdminLoggedIn,
    setAdminLoggedIn,
    loadContent,
    saveContentLocal,
    clearContentLocal,
    publishToJsonBin,
    downloadContentJson,
    importContentFromFile,
    slugId,
    assetUrl,
  };
})();
