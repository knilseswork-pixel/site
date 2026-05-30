/**
 * Админ: редактирование разделов (sections.json)
 */
(function () {
  var SS = window.SectionsStore;
  var editingSectionId = null;
  var editingItemId = null;
  var editingSectionTemplate = null;
  var sectionHubEditor = null;
  var nestedSubsStore = {};

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function showToast(msg) {
    var t = $('#adminToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-visible');
    setTimeout(function () {
      t.classList.remove('is-visible');
    }, 2800);
  }

  function formatVideosForEditor(videos) {
    return (videos || [])
      .map(function (v) {
        return (v.title || 'Видео') + ' | ' + (v.embed || v.src || '');
      })
      .join('\n');
  }

  function parseVideosFromEditor(text) {
    var lines = String(text || '')
      .split('\n')
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    return lines.map(function (line, i) {
      var title = 'Видео ' + (i + 1);
      var url = line;
      if (line.indexOf('|') !== -1) {
        var parts = line.split('|');
        title = parts[0].trim() || title;
        url = parts.slice(1).join('|').trim();
      }
      var iframe = url.match(/src=["']([^"']+)["']/i);
      if (iframe) url = iframe[1];
      if (window.WorkoutMedia && window.WorkoutMedia.isDriveUrl(url)) {
        var norm = window.WorkoutMedia.normalizeVideo(url);
        if (norm.type === 'embed') return { title: title, embed: norm.url };
      }
      if (/vk\.com|youtube|youtu\.be/i.test(url)) {
        return { title: title, embed: url };
      }
      return { title: title, src: url };
    });
  }

  function renderSectionsAdminList() {
    var list = $('#adminSectionsList');
    if (!list) return;
    var data = SS.getSectionsData();
    if (!data) return;

    var hidden = ['competition', 'new-client'];
    list.innerHTML = (data.sections || [])
      .filter(function (sec) {
        return hidden.indexOf(sec.id) < 0;
      })
      .map(function (sec) {
        var items = (window.WorkoutLevelSort ? window.WorkoutLevelSort.sortByLevel(sec.items || []) : sec.items || [])
          .map(function (item) {
            return (
              '<li class="admin-sections__item">' +
              '<button type="button" class="admin-btn admin-btn--sm admin-sections__edit" data-sec="' +
              escapeHtml(sec.id) +
              '" data-item="' +
              escapeHtml(item.id) +
              '">' +
              escapeHtml(item.title) +
              '</button></li>'
            );
          })
          .join('');
        return (
          '<li class="admin-sections__block">' +
          '<strong class="admin-sections__heading">' +
          escapeHtml(sec.title) +
          '</strong><ul>' +
          items +
          '</ul></li>'
        );
      })
      .join('');

    list.querySelectorAll('.admin-sections__edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openSectionEditor(btn.dataset.sec, btn.dataset.item);
      });
    });
  }

  function hideSectionEditor() {
    editingSectionId = null;
    editingItemId = null;
    editingSectionTemplate = null;
    var ed = $('#adminSectionEditor');
    if (ed) ed.classList.add('hidden');
  }

  function registerNestedSubs(mountId, list) {
    nestedSubsStore[mountId] = list || [];
  }

  function syncNestedSubsFromDom() {
    var H = window.WorkoutHubItemsEditor;
    if (!H) return;
    document.querySelectorAll('[data-hub-mount]').forEach(function (el) {
      if (!el.dataset.hubBound) return;
      var id = el.getAttribute('data-hub-mount');
      if (id) nestedSubsStore[id] = H.collectFromRoot(el);
    });
  }

  function mountNestedSubsInScope(scopeEl) {
    var H = window.WorkoutHubItemsEditor;
    if (H && scopeEl) H.mountAll(scopeEl, nestedSubsStore);
  }

  function nestedSubsForEntity(entity, prefix) {
    var H = window.WorkoutHubItemsEditor;
    var mountId = prefix + '-' + (entity.id || 'x');
    var list = H ? H.getList(entity) : entity.subSections || [];
    registerNestedSubs(mountId, list);
    return H ? H.nestedMountHtml(mountId) : '';
  }

  function renderContentBlockEditor(block) {
    return (
      '<div class="admin-content-block" data-cb-id="' +
      escapeHtml(block.id) +
      '">' +
      '<div class="admin-content-block__head">' +
      '<label class="admin-field admin-field--grow">Заголовок блока<input type="text" data-f="title" value="' +
      escapeHtml(block.title) +
      '"></label>' +
      '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-action="del-content-block">Удалить</button>' +
      '</div>' +
      '<label class="admin-field">Текст <span class="label-hint">если нет подразделов ниже</span>' +
      '<textarea data-f="body" rows="3">' +
      escapeHtml(block.body || '') +
      '</textarea></label>' +
      nestedSubsForEntity(block, 'cb') +
      '</div>'
    );
  }

  function renderContentBlocksEditor(blocks) {
    return (blocks || []).map(renderContentBlockEditor).join('');
  }

  function collectContentBlocksFromDom(root) {
    if (!root) return [];
    var SG = window.SectionsGroups;
    var list = [];
    root.querySelectorAll('.admin-content-block').forEach(function (el) {
      function val(name) {
        var f = el.querySelector('[data-f="' + name + '"]');
        return f ? f.value.trim() : '';
      }
      var cbId = el.getAttribute('data-cb-id') || (SG ? SG.uniqueId('cb') : 'cb-' + Date.now());
      var mount = el.querySelector('[data-hub-mount="cb-' + cbId + '"]');
      var subSections = mount && window.WorkoutHubItemsEditor ? window.WorkoutHubItemsEditor.collectFromRoot(mount) : [];
      list.push({
        id: cbId,
        title: val('title') || 'Блок',
        body: val('body'),
        subSections: subSections,
      });
    });
    return list;
  }

  function refreshContentBlocksEditor(blocks) {
    syncNestedSubsFromDom();
    var root = $('#secContentBlocksRoot');
    if (root) {
      root.innerHTML = renderContentBlocksEditor(blocks);
      mountNestedSubsInScope(root);
    }
  }

  function bindContentBlocksEditorEvents(force) {
    var root = $('#secContentBlocksRoot');
    if (!root || (!force && root.dataset.bound === '1')) return;
    root.dataset.bound = '1';

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="del-content-block"]');
      if (!btn || !root.contains(btn)) return;
      var blockEl = btn.closest('.admin-content-block');
      var cbId = blockEl && blockEl.getAttribute('data-cb-id');
      var blocks = collectContentBlocksFromDom(root).filter(function (b) {
        return b.id !== cbId;
      });
      refreshContentBlocksEditor(blocks);
    });
  }

  function subSectionsEditorSection() {
    return (
      '<section class="admin-subsection">' +
      '<h4 class="admin-subsection__title">Подразделы (кнопки на странице)</h4>' +
      '<p class="admin-help">Кнопки на странице уровня. Подразделы также можно добавить к упражнению, элементу и текстовому блоку ниже.</p>' +
      '<div id="secHubItemsRoot" class="editor-hub-items"></div>' +
      '</section>'
    );
  }

  function mountSectionHubEditor(item) {
    if (!window.WorkoutHubItemsEditor) return null;
    var root = $('#secHubItemsRoot');
    if (root) root.dataset.hubBound = '';
    if (window.SectionsGroups) window.SectionsGroups.ensureSubSections(item);
    sectionHubEditor = window.WorkoutHubItemsEditor.mount(root, item.subSections || []);
    return sectionHubEditor;
  }

  function contentBlocksEditorSection(blocks) {
    return (
      '<section class="admin-subsection">' +
      '<h4 class="admin-subsection__title">Текстовые блоки</h4>' +
      '<p class="admin-help">Дополнительные подблоки на странице уровня: описание, подводящие, ошибки и любые свои разделы.</p>' +
      '<div id="secContentBlocksRoot" class="sec-content-blocks-root">' +
      renderContentBlocksEditor(blocks) +
      '</div>' +
      '<p><button type="button" class="admin-btn admin-btn--sm" id="secAddContentBlock">+ Добавить текстовый блок</button></p>' +
      '</section>'
    );
  }

  function bindAddContentBlockButton() {
    var addBtn = $('#secAddContentBlock');
    if (!addBtn) return;
    addBtn.onclick = function () {
      var root = $('#secContentBlocksRoot');
      if (!root) return;
      var blocks = collectContentBlocksFromDom(root);
      var SG = window.SectionsGroups;
      blocks.push({
        id: SG ? SG.uniqueId('cb') : 'cb-' + Date.now(),
        title: 'Новый блок',
        body: '',
      });
      refreshContentBlocksEditor(blocks);
    };
  }

  function setupContentBlocksEditor(item) {
    if (window.SectionsGroups) window.SectionsGroups.ensureContentBlocks(item);
    var blocksRoot = $('#secContentBlocksRoot');
    if (blocksRoot) blocksRoot.dataset.bound = '';
    bindContentBlocksEditorEvents(true);
    bindAddContentBlockButton();
  }

  function renderDynamicElementBlock(ex) {
    return (
      '<div class="admin-exercise-block" data-el-id="' +
      escapeHtml(ex.id) +
      '">' +
      '<div class="admin-exercise-block__head">' +
      '<strong>Элемент</strong>' +
      '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-action="del-element">Удалить</button>' +
      '</div>' +
      '<label class="admin-field">Название элемента<input type="text" data-f="title" value="' +
      escapeHtml(ex.title) +
      '"></label>' +
      '<label class="admin-field">Описание<textarea data-f="description" rows="3">' +
      escapeHtml(ex.description) +
      '</textarea></label>' +
      '<label class="admin-field">Цель<textarea data-f="goal" rows="2">' +
      escapeHtml(ex.goal) +
      '</textarea></label>' +
      '<label class="admin-field">Принцип действия<textarea data-f="principle" rows="2">' +
      escapeHtml(ex.principle) +
      '</textarea></label>' +
      '<label class="admin-field">Ошибки<textarea data-f="errors" rows="2">' +
      escapeHtml(ex.errors) +
      '</textarea></label>' +
      '<label class="admin-field">Страховка<textarea data-f="spotting" rows="2">' +
      escapeHtml(ex.spotting || '') +
      '</textarea></label>' +
      '<label class="admin-field">Видео <span class="label-hint">Название | ссылка VK / Drive</span>' +
      '<textarea data-f="videos" rows="2">' +
      escapeHtml(formatVideosForEditor(ex.videos || [])) +
      '</textarea></label>' +
      nestedSubsForEntity(ex, 'el') +
      '</div>'
    );
  }

  function renderDynamicElementsEditor(elements) {
    return (elements || []).map(renderDynamicElementBlock).join('');
  }

  function collectDynamicElementsFromDom(root) {
    if (!root) return [];
    var SG = window.SectionsGroups;
    var list = [];
    root.querySelectorAll('.admin-exercise-block').forEach(function (block) {
      function val(name) {
        var el = block.querySelector('[data-f="' + name + '"]');
        return el ? el.value.trim() : '';
      }
      var videosEl = block.querySelector('[data-f="videos"]');
      var elId = block.getAttribute('data-el-id') || (SG ? SG.uniqueId('el') : 'el-' + Date.now());
      var elMount = block.querySelector('[data-hub-mount="el-' + elId + '"]');
      list.push({
        id: elId,
        title: val('title') || 'Элемент',
        description: val('description'),
        goal: val('goal'),
        principle: val('principle'),
        errors: val('errors'),
        spotting: val('spotting'),
        videos: parseVideosFromEditor(videosEl ? videosEl.value : ''),
        subSections:
          elMount && window.WorkoutHubItemsEditor ? window.WorkoutHubItemsEditor.collectFromRoot(elMount) : [],
      });
    });
    return list;
  }

  function refreshDynamicElementsEditor(elements) {
    syncNestedSubsFromDom();
    var root = $('#secElementsRoot');
    if (root) {
      root.innerHTML = renderDynamicElementsEditor(elements);
      mountNestedSubsInScope(root);
    }
  }

  function bindDynamicElementsEditorEvents(force) {
    var root = $('#secElementsRoot');
    if (!root || (!force && root.dataset.bound === '1')) return;
    root.dataset.bound = '1';

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn || !root.contains(btn)) return;
      var action = btn.getAttribute('data-action');
      var elements = collectDynamicElementsFromDom(root);
      var SG = window.SectionsGroups;

      if (action === 'del-element') {
        var block = btn.closest('.admin-exercise-block');
        var elId = block && block.getAttribute('data-el-id');
        elements = elements.filter(function (ex) {
          return ex.id !== elId;
        });
        refreshDynamicElementsEditor(elements);
      }
    });
  }

  function renderGroupsEditor(groups) {
    return (groups || [])
      .map(function (g) {
        var exercises = (g.exercises || [])
          .map(function (ex) {
            return (
              '<div class="admin-exercise-block" data-ex-id="' +
              escapeHtml(ex.id) +
              '">' +
              '<div class="admin-exercise-block__head">' +
              '<strong>Упражнение</strong>' +
              '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-action="del-exercise">Удалить</button>' +
              '</div>' +
              '<label class="admin-field">Название<input type="text" data-f="title" value="' +
              escapeHtml(ex.title) +
              '"></label>' +
              '<label class="admin-field">Описание<textarea data-f="description" rows="3">' +
              escapeHtml(ex.description) +
              '</textarea></label>' +
              '<label class="admin-field">Цель<textarea data-f="goal" rows="2">' +
              escapeHtml(ex.goal) +
              '</textarea></label>' +
              '<label class="admin-field">Принцип действия<textarea data-f="principle" rows="2">' +
              escapeHtml(ex.principle) +
              '</textarea></label>' +
              '<label class="admin-field">Ошибки<textarea data-f="errors" rows="2">' +
              escapeHtml(ex.errors) +
              '</textarea></label>' +
              nestedSubsForEntity(ex, 'ex') +
              '</div>'
            );
          })
          .join('');
        return (
          '<fieldset class="admin-group-block" data-group-id="' +
          escapeHtml(g.id) +
          '">' +
          '<div class="admin-group-block__head">' +
          '<label class="admin-field admin-field--grow">Группа мышц<input type="text" data-f="label" value="' +
          escapeHtml(g.label) +
          '"></label>' +
          '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-action="del-group">Удалить группу</button>' +
          '</div>' +
          '<div class="sec-exercises-list">' +
          exercises +
          '</div>' +
          '<button type="button" class="admin-btn admin-btn--sm" data-action="add-exercise">+ Упражнение</button>' +
          '</fieldset>'
        );
      })
      .join('');
  }

  function collectGroupsFromDom(root) {
    if (!root) return [];
    var SG = window.SectionsGroups;
    var groups = [];
    root.querySelectorAll('.admin-group-block').forEach(function (fld) {
      var labelInput = fld.querySelector('[data-f="label"]');
      var g = {
        id: fld.getAttribute('data-group-id') || (SG ? SG.uniqueId('group') : 'group-' + Date.now()),
        label: labelInput ? labelInput.value.trim() : 'Группа',
        exercises: [],
      };
      fld.querySelectorAll('.admin-exercise-block').forEach(function (exBlock) {
        function val(name) {
          var el = exBlock.querySelector('[data-f="' + name + '"]');
          return el ? el.value.trim() : '';
        }
        var exId = exBlock.getAttribute('data-ex-id') || (SG ? SG.uniqueId('ex') : 'ex-' + Date.now());
        var exMount = exBlock.querySelector('[data-hub-mount="ex-' + exId + '"]');
        g.exercises.push({
          id: exId,
          title: val('title') || 'Упражнение',
          description: val('description'),
          goal: val('goal'),
          principle: val('principle'),
          errors: val('errors'),
          subSections:
            exMount && window.WorkoutHubItemsEditor ? window.WorkoutHubItemsEditor.collectFromRoot(exMount) : [],
        });
      });
      groups.push(g);
    });
    return groups;
  }

  function refreshGroupsEditor(groups) {
    syncNestedSubsFromDom();
    var root = $('#secGroupsRoot');
    if (root) {
      root.innerHTML = renderGroupsEditor(groups);
      mountNestedSubsInScope(root);
    }
  }

  function bindGroupsEditorEvents(force) {
    var root = $('#secGroupsRoot');
    if (!root || (!force && root.dataset.bound === '1')) return;
    root.dataset.bound = '1';

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn || !root.contains(btn)) return;
      var action = btn.getAttribute('data-action');
      var groups = collectGroupsFromDom(root);
      var SG = window.SectionsGroups;
      var groupField = btn.closest('.admin-group-block');

      if (action === 'add-exercise' && groupField) {
        var gid = groupField.getAttribute('data-group-id');
        var g = groups.find(function (x) {
          return x.id === gid;
        });
        if (g) {
          g.exercises.push({
            id: SG ? SG.uniqueId('ex') : 'ex-' + Date.now(),
            title: 'Новое упражнение',
            description: '',
            goal: '',
            principle: '',
            errors: '',
          });
        }
        refreshGroupsEditor(groups);
        return;
      }

      if (action === 'del-exercise') {
        var exBlock = btn.closest('.admin-exercise-block');
        var exId = exBlock && exBlock.getAttribute('data-ex-id');
        groups.forEach(function (g) {
          g.exercises = (g.exercises || []).filter(function (ex) {
            return ex.id !== exId;
          });
        });
        refreshGroupsEditor(groups);
        return;
      }

      if (action === 'del-group') {
        var delGid = groupField && groupField.getAttribute('data-group-id');
        groups = groups.filter(function (g) {
          return g.id !== delGid;
        });
        refreshGroupsEditor(groups);
        return;
      }
    });
  }

  function field(label, id, value, rows) {
    if (rows) {
      return (
        '<label class="admin-field">' +
        label +
        '<textarea id="' +
        id +
        '" rows="' +
        rows +
        '">' +
        escapeHtml(value) +
        '</textarea></label>'
      );
    }
    return (
      '<label class="admin-field">' +
      label +
      '<input type="text" id="' +
      id +
      '" value="' +
      escapeHtml(value) +
      '"></label>'
    );
  }

  function openSectionEditor(sectionId, itemId) {
    var found = SS.findItem(sectionId, itemId);
    if (!found) return;
    editingSectionId = sectionId;
    editingItemId = itemId;
    var sec = found.section;
    var item = found.item;
    var tpl = sec.template;
    editingSectionTemplate = tpl;
    var host = $('#adminSectionEditorFields');
    var titleEl = $('#adminSectionEditorTitle');
    if (!host) return;

    if (titleEl) titleEl.textContent = sec.title + ' → ' + item.title;

    var html = field('Фото (путь, или ссылка Google Drive «Поделиться»)', 'secPhoto', item.photo || '', 0);
    var usesGroups = window.SectionsGroups && window.SectionsGroups.templateUsesMuscleGroups(tpl);

    html += subSectionsEditorSection();

    if (window.SectionsGroups) window.SectionsGroups.ensureContentBlocks(item);
    html += contentBlocksEditorSection(item.contentBlocks);

    if (tpl === 'dynamic-level') {
      window.SectionsGroups.ensureDynamicElements(item);
      html += field('Краткое описание уровня (необязательно)', 'secDescription', item.description || '', 3);
      html += field('Страховка для всего уровня (необязательно)', 'secSpotting', item.spotting || '', 3);
      html +=
        '<p class="admin-help">Список динамических элементов — без групп мышц. Добавляйте элементы по одному.</p>' +
        '<div id="secElementsRoot" class="sec-elements-root">' +
        renderDynamicElementsEditor(item.elements) +
        '</div>' +
        '<p><button type="button" class="admin-btn admin-btn--sm" id="secAddElement">+ Добавить элемент</button></p>';
    } else if (usesGroups) {
      window.SectionsGroups.ensureItemMuscleGroups(item);
      html += field('Краткое описание уровня (необязательно)', 'secDescription', item.description || '', 3);
      html +=
        '<p class="admin-help">Группы мышц и упражнения — как в ОФП. Можно добавлять свои группы и пункты.</p>' +
        '<div id="secGroupsRoot" class="sec-groups-root">' +
        renderGroupsEditor(item.groups) +
        '</div>' +
        '<p><button type="button" class="admin-btn admin-btn--sm" id="secAddGroup">+ Добавить группу мышц</button></p>';
    } else if (tpl === 'simple-block') {
      html += field('Описание', 'secDescription', item.description || '', 5);
    }

    nestedSubsStore = {};
    host.innerHTML = html;
    mountSectionHubEditor(item);
    setupContentBlocksEditor(item);
    mountNestedSubsInScope(host);
    if (tpl === 'dynamic-level') {
      var elementsRoot = $('#secElementsRoot');
      if (elementsRoot) elementsRoot.dataset.bound = '';
      bindDynamicElementsEditorEvents(true);
      var addElBtn = $('#secAddElement');
      if (addElBtn) {
        addElBtn.onclick = function () {
          var root = $('#secElementsRoot');
          if (!root) return;
          var elements = collectDynamicElementsFromDom(root);
          var SG = window.SectionsGroups;
          elements.push({
            id: SG ? SG.uniqueId('el') : 'el-' + Date.now(),
            title: 'Новый элемент',
            description: '',
            goal: '',
            principle: '',
            errors: '',
            spotting: '',
            videos: [],
          });
          refreshDynamicElementsEditor(elements);
        };
      }
    } else if (usesGroups) {
      var groupsRoot = $('#secGroupsRoot');
      if (groupsRoot) groupsRoot.dataset.bound = '';
      bindGroupsEditorEvents(true);
      var addGroupBtn = $('#secAddGroup');
      if (addGroupBtn) {
        addGroupBtn.onclick = function () {
          var root = $('#secGroupsRoot');
          if (!root) return;
          var groups = collectGroupsFromDom(root);
          var SG = window.SectionsGroups;
          groups.push({
            id: SG ? SG.uniqueId('group') : 'group-' + Date.now(),
            label: 'Новая группа',
            exercises: [],
          });
          refreshGroupsEditor(groups);
        };
      }
    }
    $('#adminSectionEditor').classList.remove('hidden');
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function collectSectionEditorData() {
    syncNestedSubsFromDom();
    var found = SS.findItem(editingSectionId, editingItemId);
    if (!found) return null;
    var item = JSON.parse(JSON.stringify(found.item));
    var tpl = found.section.template;

    var photoEl = $('#secPhoto');
    if (photoEl) item.photo = photoEl.value.trim();
    item.subSections = sectionHubEditor ? sectionHubEditor.collect() : [];
    if (window.WorkoutHubItemsEditor) window.WorkoutHubItemsEditor.syncItemsAlias(item);
    item.contentBlocks = collectContentBlocksFromDom($('#secContentBlocksRoot'));
    delete item.preparatoryExercises;
    delete item.errors;

    if (tpl === 'dynamic-level') {
      item.description = ($('#secDescription') || {}).value || '';
      item.spotting = ($('#secSpotting') || {}).value || '';
      item.elements = collectDynamicElementsFromDom($('#secElementsRoot'));
      delete item.groups;
      delete item.videos;
    } else if (window.SectionsGroups && window.SectionsGroups.templateUsesMuscleGroups(tpl)) {
      item.description = ($('#secDescription') || {}).value || '';
      item.groups = collectGroupsFromDom($('#secGroupsRoot'));
      delete item.videos;
      delete item.elements;
    } else if (tpl === 'simple-block') {
      item.description = ($('#secDescription') || {}).value || '';
    }

    return item;
  }

  function saveSectionItem() {
    if (!editingSectionId || !editingItemId) return;
    var item = collectSectionEditorData();
    if (!item) return;

    var data = SS.getSectionsData();
    var sec = data.sections.find(function (s) {
      return s.id === editingSectionId;
    });
    if (!sec) return;
    var idx = sec.items.findIndex(function (it) {
      return it.id === editingItemId;
    });
    if (idx < 0) return;
    sec.items[idx] = item;
    SS.saveSectionsLocal(data);
    window.dispatchEvent(new CustomEvent('sections-updated'));
    renderSectionsAdminList();
    showToast('Раздел сохранён');
  }

  function bindSectionAdminEvents() {
    $('#adminSectionSave')?.addEventListener('click', saveSectionItem);
    $('#adminSectionCancel')?.addEventListener('click', hideSectionEditor);
    $('#adminDownloadSections')?.addEventListener('click', function () {
      SS.downloadSectionsJson();
      showToast('Файл sections.json скачан');
    });
    $('#adminImportSections')?.addEventListener('click', function () {
      $('#adminImportSectionsFile').click();
    });
    $('#adminImportSectionsFile')?.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          if (!parsed.sections) throw new Error('bad');
          SS.saveSectionsLocal(parsed);
          window.dispatchEvent(new CustomEvent('sections-updated'));
          renderSectionsAdminList();
          hideSectionEditor();
          showToast('Разделы импортированы');
        } catch (err) {
          alert('Не удалось прочитать sections.json');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    $('#adminResetSections')?.addEventListener('click', async function () {
      if (!confirm('Сбросить локальные изменения разделов?')) return;
      localStorage.removeItem('workout_sections_data');
      await SS.loadSections();
      window.dispatchEvent(new CustomEvent('sections-updated'));
      renderSectionsAdminList();
      hideSectionEditor();
      showToast('Разделы загружены с сервера');
    });
  }

  window.SectionsAdmin = {
    renderList: renderSectionsAdminList,
    init: function () {
      bindSectionAdminEvents();
      window.addEventListener('sections-updated', renderSectionsAdminList);
    },
  };
})();
