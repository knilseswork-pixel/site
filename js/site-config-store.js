/**
 * Конфигурация сайта (навигация, страницы) — site-config.json
 */
(function () {
  var STORAGE_CONFIG = 'workout_site_config_data';
  var STORAGE_DRAFT = 'workout_site_draft_enabled';
  var STORAGE_CONFIG_VERSION = 'workout_site_config_server_version';

  var siteConfig = null;

  function assetUrl(path) {
    return window.Workout && window.Workout.assetUrl ? window.Workout.assetUrl(path) : path;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function isDraftEnabled() {
    return localStorage.getItem(STORAGE_DRAFT) === '1';
  }

  function setDraftEnabled(value) {
    if (value) localStorage.setItem(STORAGE_DRAFT, '1');
    else localStorage.removeItem(STORAGE_DRAFT);
  }

  function getDefaultConfig() {
    if (window.WORKOUT_SITE_CONFIG) return clone(window.WORKOUT_SITE_CONFIG);
    return {
      version: 1,
      site: { heroBadge: '', heroTitle: 'WORKOUT', heroText: '' },
      mainTabs: [
        { id: 'materials', label: 'Материалы', type: 'materials' },
        { id: 'sections', label: 'База элементов', type: 'sections' },
      ],
      materialFilters: [{ id: 'all', label: 'Все', category: '' }],
      customPages: [],
    };
  }

  async function loadSiteConfig() {
    var serverData = null;
    var urls = [assetUrl('data/site-config.json'), assetUrl('data/site-config.json') + '?t=' + Date.now()];

    for (var i = 0; i < urls.length && !serverData; i++) {
      try {
        var res = await fetch(urls[i], { cache: 'no-store' });
        if (res.ok) serverData = await res.json();
      } catch (e) {
        /* next */
      }
    }

    if (!serverData) serverData = getDefaultConfig();

    siteConfig = clone(serverData);
    localStorage.setItem(STORAGE_CONFIG_VERSION, String(serverData.version || 1));

    if (isDraftEnabled()) {
      var local = localStorage.getItem(STORAGE_CONFIG);
      if (local) {
        try {
          var parsed = JSON.parse(local);
          if (parsed && parsed.mainTabs) siteConfig = parsed;
        } catch (e) {
          localStorage.removeItem(STORAGE_CONFIG);
        }
      }
    } else {
      localStorage.removeItem(STORAGE_CONFIG);
    }

    return siteConfig;
  }

  function getSiteConfig() {
    return siteConfig;
  }

  function saveSiteConfigLocal(data) {
    siteConfig = data;
    setDraftEnabled(true);
    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(data));
  }

  function clearSiteConfigLocal() {
    localStorage.removeItem(STORAGE_CONFIG);
  }

  function downloadSiteConfigJson(data) {
    var payload = data || siteConfig;
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function getCategories() {
    var filters = (siteConfig && siteConfig.materialFilters) || [];
    return filters
      .map(function (f) {
        return f.category;
      })
      .filter(function (c) {
        return c && String(c).trim();
      });
  }

  window.SiteConfigStore = {
    loadSiteConfig: loadSiteConfig,
    getSiteConfig: getSiteConfig,
    saveSiteConfigLocal: saveSiteConfigLocal,
    clearSiteConfigLocal: clearSiteConfigLocal,
    downloadSiteConfigJson: downloadSiteConfigJson,
    getCategories: getCategories,
    isDraftEnabled: isDraftEnabled,
    setDraftEnabled: setDraftEnabled,
    clearAllDrafts: function () {
      setDraftEnabled(false);
      clearSiteConfigLocal();
      localStorage.removeItem('workout_content_data');
      localStorage.removeItem('workout_sections_data');
    },
  };
})();
