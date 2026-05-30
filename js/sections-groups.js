/**
 * Группы мышц (ОФП, статика) и элементы (динамика)
 */
(function () {
  var DEFAULT_GROUPS = [
    { id: 'pulling', label: 'Тянущие', exercises: [] },
    { id: 'pushing', label: 'Толкающие', exercises: [] },
    { id: 'core', label: 'Мышцы кора', exercises: [] },
  ];

  function slugId(text) {
    return String(text || 'item')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 36);
  }

  function uniqueId(prefix) {
    return slugId(prefix) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function defaultMuscleGroups() {
    return JSON.parse(JSON.stringify(DEFAULT_GROUPS));
  }

  function templateUsesMuscleGroups(template) {
    return template !== 'dynamic-level' && template !== 'simple-block';
  }

  function templateIsDynamic(template) {
    return template === 'dynamic-level';
  }

  function flattenGroupsToElements(item) {
    var list = [];
    (item.groups || []).forEach(function (g) {
      (g.exercises || []).forEach(function (ex) {
        list.push(ex);
      });
    });
    return list;
  }

  function ensureDynamicElements(item) {
    if (Array.isArray(item.elements) && item.elements.length) {
      item.elements = item.elements.map(function (ex) {
        var el = {
          id: ex.id || uniqueId('el'),
          title: ex.title || 'Элемент',
          description: ex.description || '',
          goal: ex.goal || '',
          principle: ex.principle || '',
          errors: ex.errors || '',
          spotting: ex.spotting || '',
          videos: Array.isArray(ex.videos) ? ex.videos : [],
        };
        ensureSubSections(el);
        return el;
      });
    } else if (item.groups && item.groups.length) {
      item.elements = flattenGroupsToElements(item);
    } else if (item.videos && item.videos.length) {
      item.elements = [
        {
          id: uniqueId('el'),
          title: 'Элемент',
          description: item.description || '',
          goal: '',
          principle: '',
          errors: item.errors || '',
          spotting: item.spotting || '',
          videos: item.videos.slice(),
        },
      ];
    } else {
      item.elements = [];
    }
    delete item.groups;
    delete item.videos;
    return item;
  }

  function migrateGroup(g) {
    var group = {
      id: g.id || uniqueId('group'),
      label: g.label || 'Группа',
      exercises: Array.isArray(g.exercises) ? g.exercises : [],
    };

    if (!group.exercises.length && (g.description || g.goal || g.photo || g.principle || g.errors)) {
      group.exercises.push({
        id: uniqueId('ex'),
        title: g.label || 'Упражнение',
        description: g.description || '',
        goal: g.goal || '',
        principle: g.principle || '',
        errors: g.errors || '',
      });
    }

    return group;
  }

  function ensureItemMuscleGroups(item) {
    if (!item.groups || !item.groups.length) {
      item.groups = defaultMuscleGroups();
      return item;
    }
    item.groups = item.groups.map(function (g) {
      var group = migrateGroup(g);
      group.exercises = (group.exercises || []).map(function (ex) {
        ensureSubSections(ex);
        return ex;
      });
      return group;
    });
    return item;
  }

  function ensureContentBlocks(item) {
    if (!Array.isArray(item.contentBlocks)) item.contentBlocks = [];
    if (item.preparatoryExercises && String(item.preparatoryExercises).trim()) {
      var hasPrep = item.contentBlocks.some(function (b) {
        return /подвод/i.test(b.title || '');
      });
      if (!hasPrep) {
        item.contentBlocks.push({
          id: uniqueId('cb'),
          title: 'Подводящие упражнения',
          body: String(item.preparatoryExercises).trim(),
        });
      }
    }
    if (item.errors && String(item.errors).trim()) {
      var hasErr = item.contentBlocks.some(function (b) {
        return /ошиб/i.test(b.title || '');
      });
      if (!hasErr) {
        item.contentBlocks.push({
          id: uniqueId('cb'),
          title: 'Ошибки (общие)',
          body: String(item.errors).trim(),
        });
      }
    }
    item.contentBlocks = item.contentBlocks.map(function (b) {
      var block = {
        id: b.id || uniqueId('cb'),
        title: b.title || 'Блок',
        body: b.body != null ? String(b.body) : '',
      };
      ensureSubSections(b);
      if (b.subSections && b.subSections.length) block.subSections = b.subSections;
      return block;
    });
    return item;
  }

  function ensureSubSections(obj) {
    if (!obj) return obj;
    if (window.WorkoutHubItemsEditor) {
      window.WorkoutHubItemsEditor.ensureOn(obj, uniqueId);
      return obj;
    }
    if (!Array.isArray(obj.subSections)) obj.subSections = [];
    return obj;
  }

  function migrateSectionsData(data) {
    if (!data || !data.sections) return data;
    data.sections.forEach(function (sec) {
      if (sec.template === 'static-level' || sec.template === 'sfpp-level') {
        sec.template = 'gpp-level';
      }
      (sec.items || []).forEach(function (item) {
        if (sec.template === 'dynamic-level') {
          ensureDynamicElements(item);
        } else if (templateUsesMuscleGroups(sec.template)) {
          ensureItemMuscleGroups(item);
        }
        ensureContentBlocks(item);
        ensureSubSections(item);
      });
    });
    return data;
  }

  window.SectionsGroups = {
    DEFAULT_GROUPS: DEFAULT_GROUPS,
    defaultMuscleGroups: defaultMuscleGroups,
    templateUsesMuscleGroups: templateUsesMuscleGroups,
    templateIsDynamic: templateIsDynamic,
    ensureDynamicElements: ensureDynamicElements,
    ensureItemMuscleGroups: ensureItemMuscleGroups,
    ensureContentBlocks: ensureContentBlocks,
    ensureSubSections: ensureSubSections,
    migrateSectionsData: migrateSectionsData,
    slugId: slugId,
    uniqueId: uniqueId,
  };
})();
