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

  var HUB_ARTICLE_IDS = ['competition-hub', 'new-client-hub', 'first-aid-hub'];
  var REMOVED_ARTICLE_IDS = ['warmup-2', 'prep-level', 'beginner-level', 'middle-level', 'advanced-level'];

  var HUB_ARTICLES_FALLBACK = [
    {
      id: 'competition-hub',
      title: 'Подготовка к соревнованиям',
      excerpt: 'Правила подготовки выступления · допуск · страховка',
      date: '2024-01-12',
      views: 0,
      category: 'Соревнования',
      type: 'hub',
      accent: '#FF2D2D',
      body: [],
      videos: [],
      items: [
        { id: 'rules', title: 'Правила подготовки выступления', body: [], videos: [] },
        { id: 'admission', title: 'Допуск к соревнованиям', body: [], videos: [] },
        { id: 'spotting', title: 'Страховка во время выступления', body: [], videos: [] },
      ],
    },
    {
      id: 'new-client-hub',
      title: 'Новый клиент',
      excerpt: 'Пробная тренировка · пробный месяц · взаимодействие',
      date: '2024-01-12',
      views: 0,
      category: 'Клиенты',
      type: 'hub',
      accent: '#FF2D2D',
      body: [],
      videos: [],
      items: [
        {
          id: 'trial-workout',
          title: 'Пробная тренировка',
          body: [
            'Не стоит забывать и про новых клиентов. Для них мы разработали определённые правила проведения пробной тренировки.',
            'На пробном занятии тренер знакомится с ребёнком, оценивает уровень подготовки, показывает формат занятий и даёт безопасную нагрузку без перегруза.',
          ],
          videos: [],
        },
        {
          id: 'trial-month',
          title: 'Пробный месяц',
          body: [
            'При покупке пробного месяца у нового клиента уже есть тренировочное расписание на 8 тренировок с разными темами.',
            'Так ребёнок проходит основные направления методики центра и родители видят систему занятий до оформления абонемента.',
          ],
          videos: [],
        },
        {
          id: 'interaction',
          title: 'Взаимодействие с новым клиентом',
          body: [
            'Не стоит забывать и про новых клиентов — выстраивайте доверие с первого контакта: консультация, правила центра, безопасность и понятные ожидания от занятий.',
          ],
          videos: [],
        },
      ],
    },
    {
      id: 'first-aid-hub',
      title: 'Оказание первой помощи',
      excerpt: 'Действия тренера · экстренные ситуации · самочувствие подопечного',
      date: '2024-01-12',
      views: 0,
      category: 'Первая помощь',
      type: 'hub',
      accent: '#FF2D2D',
      body: [],
      videos: [],
      items: [
        { id: 'emergency', title: 'Действия тренера в чрезвычайных ситуациях', body: [], videos: [] },
        { id: 'feeling-bad', title: 'Действия тренера если подопечному стало плохо', body: [], videos: [] },
        {
          id: 'wellness-monitor',
          title: 'Как отследить и предотвратить ухудшение самочувствия',
          body: [],
          videos: [],
        },
      ],
    },
  ];

  function cloneData(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getHubTemplates(fallbackSource) {
    var fromEmbed = window.WORKOUT_CONTENT && window.WORKOUT_CONTENT.articles;
    var list = (fromEmbed || [])
      .filter(function (a) {
        return HUB_ARTICLE_IDS.indexOf(a.id) >= 0;
      })
      .map(cloneData);
    if (list.length >= HUB_ARTICLE_IDS.length) return list;

    if (fallbackSource && fallbackSource.articles) {
      list = fallbackSource.articles
        .filter(function (a) {
          return HUB_ARTICLE_IDS.indexOf(a.id) >= 0;
        })
        .map(cloneData);
      if (list.length >= HUB_ARTICLE_IDS.length) return list;
    }

    return HUB_ARTICLES_FALLBACK.map(cloneData);
  }

  function mergeHubItemBodies(targetItems, sourceItems) {
    (sourceItems || []).forEach(function (src) {
      var tgt = (targetItems || []).find(function (it) {
        return it.id === src.id;
      });
      if (!tgt) {
        targetItems.push(cloneData(src));
        return;
      }
      var hasBody =
        tgt.body &&
        tgt.body.length &&
        tgt.body.some(function (p) {
          return String(p || '').trim().length > 0;
        });
      if (!hasBody && src.body && src.body.length) {
        tgt.body = src.body.slice();
      }
      if ((!tgt.videos || !tgt.videos.length) && src.videos && src.videos.length) {
        tgt.videos = src.videos.slice();
      }
    });
  }

  function ensureHubArticles(fallbackSource) {
    if (!contentData || !contentData.articles) return;
    var templates = getHubTemplates(fallbackSource);

    templates.forEach(function (tpl) {
      var idx = contentData.articles.findIndex(function (a) {
        return a.id === tpl.id;
      });
      if (idx < 0) {
        contentData.articles.push(cloneData(tpl));
        return;
      }
      var existing = contentData.articles[idx];
      if (existing.type !== 'hub' || !existing.items || !existing.items.length) {
        contentData.articles[idx] = cloneData(tpl);
        return;
      }
      existing.category = tpl.category;
      existing.title = existing.title || tpl.title;
      existing.type = 'hub';
      if (!existing.excerpt) existing.excerpt = tpl.excerpt;
      mergeHubItemBodies(existing.items, tpl.items);
    });
  }

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

    var urls = [
      assetUrl('data/content.json'),
      assetUrl('data/content.json') + '?t=' + Date.now(),
    ];

    for (var u = 0; u < urls.length && !serverData; u++) {
      try {
        var res = await fetch(urls[u], { cache: 'no-store' });
        if (!res.ok) continue;
        serverData = await res.json();
        contentData = serverData;
      } catch (e) {
        loadError = e;
      }
    }

    if (!serverData && window.WORKOUT_CONTENT && window.WORKOUT_CONTENT.articles) {
      serverData = window.WORKOUT_CONTENT;
      contentData = serverData;
      loadError = null;
    }

    if (!contentData) {
      contentData = { site: {}, articles: [] };
    }

    var useDraft =
      window.SiteConfigStore && window.SiteConfigStore.isDraftEnabled
        ? window.SiteConfigStore.isDraftEnabled()
        : localStorage.getItem('workout_site_draft_enabled') === '1';

    if (useDraft) {
      var local = localStorage.getItem(STORAGE_CONTENT);
      if (local) {
        try {
          var parsed = JSON.parse(local);
          if (parsed && parsed.articles && parsed.articles.length) {
            contentData = parsed;
          } else {
            localStorage.removeItem(STORAGE_CONTENT);
          }
        } catch (err) {
          localStorage.removeItem(STORAGE_CONTENT);
        }
      }
    } else {
      localStorage.removeItem(STORAGE_CONTENT);
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

    ensureHubArticles(serverData);
    migrateSectionsToArticles();
    mergeLegacyHubArticles();
    ensureHubArticles(serverData);
    if (contentData && contentData.articles) {
      contentData.articles = contentData.articles.filter(function (a) {
        if (REMOVED_ARTICLE_IDS.indexOf(a.id) >= 0) return false;
        if (a.category === 'Уровни') return false;
        return true;
      });
    }
    return contentData;
  }

  function mergeLegacyHubArticles() {
    if (!contentData || !contentData.articles) return;
    var legacyComp = {
      'comp-rules': 'rules',
      'comp-admission': 'admission',
      'comp-spotting': 'spotting',
    };
    var legacyClient = {
      'client-trial-workout': 'trial-workout',
      'client-trial-month': 'trial-month',
      'client-interaction': 'interaction',
    };
    var compHub = contentData.articles.find(function (a) {
      return a.id === 'competition-hub';
    });
    var clientHub = contentData.articles.find(function (a) {
      return a.id === 'new-client-hub';
    });
    var toRemove = [];

    contentData.articles.forEach(function (art) {
      var compKey = legacyComp[art.id];
      if (compKey && compHub && compHub.items) {
        var cItem = compHub.items.find(function (it) {
          return it.id === compKey;
        });
        if (cItem && art.body && art.body.length && (!cItem.body || !cItem.body.length)) {
          cItem.body = art.body.slice();
        }
        if (cItem && art.videos && art.videos.length && (!cItem.videos || !cItem.videos.length)) {
          cItem.videos = art.videos.slice();
        }
        toRemove.push(art.id);
      }
      var clientKey = legacyClient[art.id];
      if (clientKey && clientHub && clientHub.items) {
        var clItem = clientHub.items.find(function (it) {
          return it.id === clientKey;
        });
        if (clItem && art.body && art.body.length && (!clItem.body || !clItem.body.length)) {
          clItem.body = art.body.slice();
        }
        if (clItem && art.videos && art.videos.length && (!clItem.videos || !clItem.videos.length)) {
          clItem.videos = art.videos.slice();
        }
        toRemove.push(art.id);
      }
    });

    if (toRemove.length) {
      contentData.articles = contentData.articles.filter(function (a) {
        return toRemove.indexOf(a.id) < 0;
      });
    }

    if (!compHub && toRemove.some(function (id) { return Object.prototype.hasOwnProperty.call(legacyComp, id); })) {
      contentData.articles.push({
        id: 'competition-hub',
        title: 'Подготовка к соревнованиям',
        type: 'hub',
        category: 'Соревнования',
        excerpt: 'Правила подготовки выступления · допуск · страховка',
        date: '2024-01-12',
        views: 0,
        accent: '#FF2D2D',
        body: [],
        videos: [],
        items: [
          { id: 'rules', title: 'Правила подготовки выступления', body: [], videos: [] },
          { id: 'admission', title: 'Допуск к соревнованиям', body: [], videos: [] },
          { id: 'spotting', title: 'Страховка во время выступления', body: [], videos: [] },
        ],
      });
    }
    if (!clientHub && toRemove.some(function (id) { return Object.prototype.hasOwnProperty.call(legacyClient, id); })) {
      contentData.articles.push({
        id: 'new-client-hub',
        title: 'Новый клиент',
        type: 'hub',
        category: 'Клиенты',
        excerpt: 'Пробная тренировка · пробный месяц · взаимодействие',
        date: '2024-01-12',
        views: 0,
        accent: '#FF2D2D',
        body: [],
        videos: [],
        items: [
          { id: 'trial-workout', title: 'Пробная тренировка', body: [], videos: [] },
          { id: 'trial-month', title: 'Пробный месяц', body: [], videos: [] },
          { id: 'interaction', title: 'Взаимодействие с новым клиентом', body: [], videos: [] },
        ],
      });
    }
  }

  function migrateSectionsToArticles() {
    if (!contentData || !contentData.articles) return;
    var idMap = {
      rules: 'comp-rules',
      admission: 'comp-admission',
      spotting: 'comp-spotting',
      'trial-workout': 'client-trial-workout',
      'trial-month': 'client-trial-month',
      interaction: 'client-interaction',
    };
    var sources = [];

    try {
      var local = localStorage.getItem('workout_sections_data');
      if (local) sources.push(JSON.parse(local));
    } catch (e) {
      /* ignore */
    }
    if (window.WORKOUT_SECTIONS) sources.push(window.WORKOUT_SECTIONS);

    sources.forEach(function (data) {
      (data.sections || []).forEach(function (sec) {
        if (sec.id !== 'competition' && sec.id !== 'new-client') return;
        (sec.items || []).forEach(function (item) {
          var articleId = idMap[item.id];
          if (!articleId) return;
          var art = contentData.articles.find(function (a) {
            return a.id === articleId;
          });
          if (!art) return;
          var desc = String(item.description || '').trim();
          if (desc) {
            var hasBody = art.body && art.body.length && art.body.some(function (p) {
              return String(p || '').trim().length > 0;
            });
            if (!hasBody) art.body = [desc];
          }
          if (item.photo && !art.photo) art.photo = item.photo;
          if (desc && (!art.excerpt || !art.excerpt.trim())) {
            art.excerpt = desc.length > 140 ? desc.slice(0, 137) + '…' : desc;
          }
        });
      });
    });
  }

  function saveContentLocal(data) {
    contentData = data;
    ensureHubArticles(window.WORKOUT_CONTENT || null);
    if (window.SiteConfigStore && window.SiteConfigStore.setDraftEnabled) {
      window.SiteConfigStore.setDraftEnabled(true);
    }
    localStorage.setItem(STORAGE_CONTENT, JSON.stringify(contentData));
  }

  function clearContentLocal() {
    localStorage.removeItem(STORAGE_CONTENT);
  }

  function setDraftEnabled(value) {
    if (window.SiteConfigStore && window.SiteConfigStore.setDraftEnabled) {
      window.SiteConfigStore.setDraftEnabled(value);
    }
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
    setDraftEnabled,
  };
})();
