/**
 * Админ: редактирование разделов (sections.json)
 */
(function () {
  var SS = window.SectionsStore;
  var editingSectionId = null;
  var editingItemId = null;

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

    list.innerHTML = (data.sections || [])
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
    var ed = $('#adminSectionEditor');
    if (ed) ed.classList.add('hidden');
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
    var host = $('#adminSectionEditorFields');
    var titleEl = $('#adminSectionEditorTitle');
    if (!host) return;

    if (titleEl) titleEl.textContent = sec.title + ' → ' + item.title;

    var html = field('Фото (URL или путь, напр. images/prep.jpg)', 'secPhoto', item.photo || '', 0);

    if (tpl === 'static-level' || tpl === 'simple-block') {
      html += field('Описание', 'secDescription', item.description || '', 5);
      if (tpl === 'static-level') {
        html += field('Подводящие упражнения', 'secPrep', item.preparatoryExercises || '', 4);
        html += field('Ошибки', 'secErrors', item.errors || '', 4);
      }
    }

    if (tpl === 'dynamic-level') {
      html +=
        '<label class="admin-field">Видео VK <span class="label-hint">Название | ссылка или iframe</span>' +
        '<textarea id="secVideos" rows="4">' +
        escapeHtml(formatVideosForEditor(item.videos)) +
        '</textarea></label>';
      html += field('Описание', 'secDescription', item.description || '', 5);
      html += field('Подводящие упражнения', 'secPrep', item.preparatoryExercises || '', 4);
      html += field('Ошибки', 'secErrors', item.errors || '', 4);
      html += field('Страховка', 'secSpotting', item.spotting || '', 4);
    }

    if (tpl === 'gpp-level' || tpl === 'sfpp-level') {
      (item.groups || []).forEach(function (g, idx) {
        html += '<div class="admin-group-block" data-group-idx="' + idx + '">';
        html += '<h4 class="admin-group-block__title">' + escapeHtml(g.label) + '</h4>';
        html += field('Фото', 'secGphoto' + idx, g.photo || '', 0);
        html += field('Описание', 'secGdesc' + idx, g.description || '', 3);
        html += field('Цель' + (tpl === 'gpp-level' ? '' : ' упражнения'), 'secGgoal' + idx, g.goal || '', 2);
        if (tpl === 'gpp-level') {
          html += field('Принцип действия', 'secGprinciple' + idx, g.principle || '', 2);
          html += field('Ошибки', 'secGerrors' + idx, g.errors || '', 2);
        }
        html += '</div>';
      });
    }

    host.innerHTML = html;
    $('#adminSectionEditor').classList.remove('hidden');
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function collectSectionEditorData() {
    var found = SS.findItem(editingSectionId, editingItemId);
    if (!found) return null;
    var item = JSON.parse(JSON.stringify(found.item));
    var tpl = found.section.template;

    var photoEl = $('#secPhoto');
    if (photoEl) item.photo = photoEl.value.trim();

    if (tpl === 'static-level' || tpl === 'simple-block') {
      item.description = ($('#secDescription') || {}).value || '';
      if (tpl === 'static-level') {
        item.preparatoryExercises = ($('#secPrep') || {}).value || '';
        item.errors = ($('#secErrors') || {}).value || '';
      }
    }

    if (tpl === 'dynamic-level') {
      item.videos = parseVideosFromEditor(($('#secVideos') || {}).value);
      item.description = ($('#secDescription') || {}).value || '';
      item.preparatoryExercises = ($('#secPrep') || {}).value || '';
      item.errors = ($('#secErrors') || {}).value || '';
      item.spotting = ($('#secSpotting') || {}).value || '';
    }

    if (tpl === 'gpp-level' || tpl === 'sfpp-level') {
      (item.groups || []).forEach(function (g, idx) {
        var p = $('#secGphoto' + idx);
        var d = $('#secGdesc' + idx);
        var goal = $('#secGgoal' + idx);
        if (p) g.photo = p.value.trim();
        if (d) g.description = d.value.trim();
        if (goal) g.goal = goal.value.trim();
        if (tpl === 'gpp-level') {
          var pr = $('#secGprinciple' + idx);
          var er = $('#secGerrors' + idx);
          if (pr) g.principle = pr.value.trim();
          if (er) g.errors = er.value.trim();
        }
      });
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
