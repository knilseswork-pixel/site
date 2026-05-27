/**
 * Хранение разделов (sections.json)
 */
(function () {
  var STORAGE_SECTIONS = 'workout_sections_data';
  var sectionsData = null;

  function assetUrl(path) {
    return window.Workout && window.Workout.assetUrl ? window.Workout.assetUrl(path) : path;
  }

  async function loadSections() {
    var serverData = null;

    var urls = [assetUrl('data/sections.json'), assetUrl('data/sections.json') + '?t=' + Date.now()];
    for (var i = 0; i < urls.length && !serverData; i++) {
      try {
        var res = await fetch(urls[i], { cache: 'no-store' });
        if (res.ok) serverData = await res.json();
      } catch (e) {
        /* next */
      }
    }

    if (!serverData && window.WORKOUT_SECTIONS) {
      serverData = window.WORKOUT_SECTIONS;
    }

    sectionsData = serverData || { sections: [] };

    var useDraft =
      window.SiteConfigStore && window.SiteConfigStore.isDraftEnabled
        ? window.SiteConfigStore.isDraftEnabled()
        : false;

    if (useDraft) {
      var local = localStorage.getItem(STORAGE_SECTIONS);
      if (local) {
        try {
          var parsed = JSON.parse(local);
          if (parsed && parsed.sections && parsed.sections.length) {
            sectionsData = parsed;
          }
        } catch (e) {
          localStorage.removeItem(STORAGE_SECTIONS);
        }
      }
    } else {
      localStorage.removeItem(STORAGE_SECTIONS);
    }

    if (window.SectionsGroups && window.SectionsGroups.migrateSectionsData) {
      sectionsData = window.SectionsGroups.migrateSectionsData(sectionsData);
    }

    return sectionsData;
  }

  function getSectionsData() {
    return sectionsData;
  }

  function saveSectionsLocal(data) {
    sectionsData = data;
    if (window.SiteConfigStore && window.SiteConfigStore.setDraftEnabled) {
      window.SiteConfigStore.setDraftEnabled(true);
    }
    localStorage.setItem(STORAGE_SECTIONS, JSON.stringify(data));
  }

  function downloadSectionsJson(data) {
    var payload = data || sectionsData;
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sections.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function findItem(sectionId, itemId) {
    var sec = (sectionsData.sections || []).find(function (s) {
      return s.id === sectionId;
    });
    if (!sec) return null;
    var item = (sec.items || []).find(function (it) {
      return it.id === itemId;
    });
    return item ? { section: sec, item: item } : null;
  }

  window.SectionsStore = {
    loadSections: loadSections,
    getSectionsData: getSectionsData,
    saveSectionsLocal: saveSectionsLocal,
    downloadSectionsJson: downloadSectionsJson,
    findItem: findItem,
  };
})();
