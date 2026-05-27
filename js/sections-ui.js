/**
 * Отображение больших разделов (Статические, Динамические, ОФП…)
 */
(function () {
  var SS = window.SectionsStore;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function assetUrl(path) {
    if (!path) return '';
    var s = String(path).trim();
    if (window.WorkoutMedia && window.WorkoutMedia.isDriveUrl(s)) {
      s = window.WorkoutMedia.normalizeImageUrl(s);
    }
    if (/^https?:\/\//i.test(s)) return s;
    return window.Workout && window.Workout.assetUrl ? window.Workout.assetUrl(s) : s;
  }

  function renderPhotoImg(photoUrl, alt) {
    var raw = String(photoUrl || '').trim();
    if (!raw) return '';
    if (window.WorkoutMedia && window.WorkoutMedia.isDriveUrl(raw)) {
      var urls = window.WorkoutMedia.getDriveImageUrls(raw);
      if (urls && urls.preview) {
        return (
          '<div class="drive-photo-wrap">' +
          '<iframe class="drive-photo-frame" src="' +
          escapeHtml(urls.preview) +
          '" title="' +
          escapeHtml(alt || 'Фото') +
          '" loading="lazy" allow="autoplay" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
          '<a class="drive-photo-open" href="' +
          escapeHtml(urls.open) +
          '" target="_blank" rel="noopener noreferrer">Открыть в Google Drive</a>' +
          '<p class="drive-photo-hint">Не видно фото? В Drive: Поделиться → «Все, у кого есть ссылка» → Читатель</p>' +
          '</div>'
        );
      }
    }
    var src = assetUrl(raw);
    var attrs =
      'class="item-photo" src="' +
      escapeHtml(src) +
      '" alt="' +
      escapeHtml(alt || '') +
      '" loading="lazy"';
    if (window.WorkoutMedia && window.WorkoutMedia.isDriveUrl(raw)) {
      var driveUrls = window.WorkoutMedia.getDriveImageUrls(raw);
      if (driveUrls) {
        var chain = [driveUrls.fallback, driveUrls.fallback2].filter(Boolean);
        if (chain.length) {
          attrs += ' data-drive-fb="' + escapeHtml(chain.join('|')) + '"';
          attrs +=
            ' onerror="var p=this.dataset.driveFb;if(!p){return}var a=p.split(\'|\');var n=parseInt(this.dataset.driveFi||\'0\',10);if(n<a.length){this.dataset.driveFi=String(n+1);this.src=a[n]}else{this.classList.add(\'item-photo--broken\')}"';
        }
      }
    }
    return '<img ' + attrs + '>';
  }

  function hasContent(text) {
    return String(text || '').trim().length > 0;
  }

  function sortItems(items) {
    if (window.WorkoutLevelSort) return window.WorkoutLevelSort.sortByLevel(items);
    return items || [];
  }

  function shortTitle(title) {
    return String(title || '')
      .replace(/уровень/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function itemPreview(item, template) {
    if (hasContent(item.description)) return item.description.slice(0, 120) + '…';
    if (item.photo) return 'Есть фото';
    if (template === 'dynamic-level') {
      var els = item.elements || [];
      if (els.length) return els.length + ' элементов';
      return 'Добавьте элементы в админке';
    }
    if (item.groups && item.groups.some(function (g) {
      return g.exercises && g.exercises.length;
    })) {
      var n = 0;
      item.groups.forEach(function (g) {
        n += (g.exercises || []).length;
      });
      return n + ' упражнений · 3 группы';
    }
    if (item.groups && item.groups.length) return 'Заполнено блоков: ' + item.groups.length;
    return 'Нажмите, чтобы открыть и заполнить';
  }

  function usesMuscleGroups(tpl) {
    return window.SectionsGroups
      ? window.SectionsGroups.templateUsesMuscleGroups(tpl)
      : tpl === 'gpp-level' || tpl === 'sfpp-level' || tpl === 'static-level';
  }

  function renderExerciseDetail(ex, tpl) {
    var html =
      '<div class="gpp-exercise-detail">' +
      '<button type="button" class="gpp-back" data-gpp-back="list">← ' +
      (tpl === 'dynamic-level' ? 'К списку элементов' : 'К списку упражнений') +
      '</button>' +
      '<h3 class="gpp-exercise-detail__title">' +
      escapeHtml(ex.title) +
      '</h3>';
    if (tpl === 'dynamic-level' && ex.videos && ex.videos.length) {
      html += renderVideos(ex.videos);
    }
    html +=
      block('Описание', '<p>' + textToHtml(ex.description) + '</p>') +
      block('Цель', '<p>' + textToHtml(ex.goal) + '</p>') +
      block('Принцип действия', '<p>' + textToHtml(ex.principle) + '</p>') +
      block('Ошибки', '<p>' + textToHtml(ex.errors) + '</p>');
    if (tpl === 'dynamic-level') {
      html += block('Страховка', '<p>' + textToHtml(ex.spotting) + '</p>');
    }
    html += '</div>';
    return html;
  }

  function bindGppLevelNav(container, item, tpl) {
    var groups = item.groups || [];
    var groupsEl = container.querySelector('.gpp-groups');
    var listEl = container.querySelector('.gpp-exercise-list');
    var detailEl = container.querySelector('.gpp-exercise-view');
    var listTitle = container.querySelector('.gpp-exercise-list__title');
    var listItems = container.querySelector('.gpp-exercise-items');
    var listBack = container.querySelector('[data-gpp-back="groups"]');

    function showGroups() {
      groupsEl.classList.remove('hidden');
      listEl.classList.add('hidden');
      detailEl.classList.add('hidden');
      detailEl.innerHTML = '';
    }

    if (listBack) listBack.addEventListener('click', showGroups);

    function showList(groupId) {
      var g = groups.find(function (x) {
        return x.id === groupId;
      });
      if (!g) return;
      groupsEl.classList.add('hidden');
      listEl.classList.remove('hidden');
      detailEl.classList.add('hidden');
      detailEl.innerHTML = '';
      if (listTitle) listTitle.textContent = g.label;
      if (listItems) {
        var exercises = g.exercises || [];
        listItems.innerHTML = exercises.length
          ? exercises
              .map(function (ex) {
                return (
                  '<li><button type="button" class="gpp-exercise-btn" data-ex-id="' +
                  escapeHtml(ex.id) +
                  '">' +
                  escapeHtml(ex.title) +
                  '</button></li>'
                );
              })
              .join('')
          : '<li class="gpp-exercise-empty">Пока нет упражнений — добавьте в админке.</li>';
      }
      if (listItems) listItems.querySelectorAll('.gpp-exercise-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var ex = (g.exercises || []).find(function (e) {
            return e.id === btn.dataset.exId;
          });
          if (!ex) return;
          listItems.querySelectorAll('.gpp-exercise-btn').forEach(function (b) {
            b.classList.remove('is-active');
          });
          btn.classList.add('is-active');
          listEl.classList.add('hidden');
          detailEl.classList.remove('hidden');
          detailEl.innerHTML = renderExerciseDetail(ex, tpl);
          detailEl.querySelector('[data-gpp-back="list"]').addEventListener('click', function () {
            showList(g.id);
          });
          detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    groupsEl.querySelectorAll('.gpp-group-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showList(btn.dataset.groupId);
      });
    });
  }

  function bindDynamicElementsNav(container, item) {
    var listEl = container.querySelector('.dynamic-elements-list');
    var detailEl = container.querySelector('.dynamic-element-view');
    var listItems = container.querySelector('.dynamic-element-items');
    var elements = item.elements || [];

    function showList() {
      listEl.classList.remove('hidden');
      detailEl.classList.add('hidden');
      detailEl.innerHTML = '';
    }

    if (listItems) {
      listItems.innerHTML = elements.length
        ? elements
            .map(function (ex) {
              return (
                '<li><button type="button" class="gpp-exercise-btn" data-el-id="' +
                escapeHtml(ex.id) +
                '">' +
                escapeHtml(ex.title) +
                '</button></li>'
              );
            })
            .join('')
        : '<li class="gpp-exercise-empty">Пока нет элементов — добавьте в админке.</li>';

      listItems.querySelectorAll('.gpp-exercise-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var ex = elements.find(function (e) {
            return e.id === btn.dataset.elId;
          });
          if (!ex) return;
          listItems.querySelectorAll('.gpp-exercise-btn').forEach(function (b) {
            b.classList.remove('is-active');
          });
          btn.classList.add('is-active');
          listEl.classList.add('hidden');
          detailEl.classList.remove('hidden');
          detailEl.innerHTML = renderExerciseDetail(ex, 'dynamic-level');
          detailEl.querySelector('[data-gpp-back="list"]').addEventListener('click', showList);
          detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  }

  function renderDynamicElementsLevel(item) {
    return (
      '<div class="dynamic-level-ui gpp-level-ui" data-dynamic-level="1">' +
      '<p class="gpp-level-ui__hint">Выберите элемент:</p>' +
      '<div class="dynamic-elements-list gpp-exercise-list">' +
      '<ul class="gpp-exercise-items dynamic-element-items"></ul>' +
      '</div>' +
      '<div class="dynamic-element-view gpp-exercise-view hidden"></div>' +
      '</div>'
    );
  }

  function renderGppExerciseLevel(item, tpl) {
    var groups = item.groups || [];
    var btns = groups
      .map(function (g) {
        var count = (g.exercises || []).length;
        return (
          '<button type="button" class="gpp-group-btn" data-group-id="' +
          escapeHtml(g.id) +
          '">' +
          '<span class="gpp-group-btn__label">' +
          escapeHtml(g.label) +
          '</span>' +
          '<span class="gpp-group-btn__count">' +
          count +
          ' упр.</span></button>'
        );
      })
      .join('');
    return (
      '<div class="gpp-level-ui" data-gpp-level="1" data-section-template="' +
      escapeHtml(tpl || '') +
      '">' +
      '<p class="gpp-level-ui__hint">Выберите группу мышц — откроется список элементов.</p>' +
      '<div class="gpp-groups">' +
      btns +
      '</div>' +
      '<div class="gpp-exercise-list hidden">' +
      '<button type="button" class="gpp-back gpp-back--top" data-gpp-back="groups">← К группам</button>' +
      '<h3 class="gpp-exercise-list__title"></h3>' +
      '<ul class="gpp-exercise-items"></ul>' +
      '</div>' +
      '<div class="gpp-exercise-view hidden"></div>' +
      '</div>'
    );
  }

  var SECTIONS_IN_MATERIALS = ['competition', 'new-client'];

  function renderSectionsList() {
    var root = $('#sectionsRoot');
    if (!root) return;
    var data = SS.getSectionsData();
    var sections = (data.sections || []).filter(function (sec) {
      return SECTIONS_IN_MATERIALS.indexOf(sec.id) < 0;
    });

    root.innerHTML = sections
      .map(function (sec) {
        var cards = sortItems(sec.items || [])
          .map(function (item) {
            var label = shortTitle(item.title) || item.title;
            return (
              '<article class="section-card" role="button" tabindex="0" data-section-id="' +
              escapeHtml(sec.id) +
              '" data-item-id="' +
              escapeHtml(item.id) +
              '" title="' +
              escapeHtml(item.title) +
              '">' +
              '<div class="section-card__body">' +
              '<h4 class="section-card__title">' +
              escapeHtml(label) +
              '</h4>' +
              '<p class="section-card__excerpt">' +
              escapeHtml(itemPreview(item, sec.template)) +
              '</p>' +
              '</div></article>'
            );
          })
          .join('');

        return (
          '<section class="mega-section" id="sec-' +
          escapeHtml(sec.id) +
          '">' +
          '<h2 class="mega-section__title">' +
          escapeHtml(sec.title) +
          '</h2>' +
          '<div class="section-cards">' +
          cards +
          '</div></section>'
        );
      })
      .join('');

    root.querySelectorAll('.section-card').forEach(function (card) {
      card.addEventListener('click', function () {
        openSectionItem(card.dataset.sectionId, card.dataset.itemId);
      });
      card.addEventListener('touchend', function () {
        card.blur();
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSectionItem(card.dataset.sectionId, card.dataset.itemId);
        }
      });
    });
  }

  function block(title, html) {
    if (!html || !String(html).trim()) return '';
    return (
      '<div class="content-block">' +
      '<h3 class="content-block__title">' +
      escapeHtml(title) +
      '</h3>' +
      '<div class="content-block__body prose">' +
      html +
      '</div></div>'
    );
  }

  function textToHtml(text) {
    return escapeHtml(text).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  }

  function renderVideos(videos) {
    if (!videos || !videos.length) return '';
    if (!window.renderVideoBlock) return '';
    return (
      '<div class="content-block"><h3 class="content-block__title">Видео элемента</h3>' +
      videos.map(window.renderVideoBlock).join('') +
      '</div>'
    );
  }

  function openSectionItem(sectionId, itemId) {
    var found = SS.findItem(sectionId, itemId);
    if (!found) return;
    var sec = found.section;
    var item = found.item;
    var tpl = sec.template;

    var detail = $('#detail');
    var html = '';

    $('#detailCategory').textContent = sec.title;
    $('#detailTitle').textContent = item.title;
    $('#detailMeta').textContent = '';

    if (item.photo) {
      html += '<div class="item-photo-wrap">' + renderPhotoImg(item.photo, item.title) + '</div>';
    }

    if (tpl === 'dynamic-level') {
      if (window.SectionsGroups) window.SectionsGroups.ensureDynamicElements(item);
      if (hasContent(item.description)) {
        html += block('Описание уровня', '<p>' + textToHtml(item.description) + '</p>');
      }
      if (hasContent(item.spotting)) {
        html += block('Страховка (общая для уровня)', '<p>' + textToHtml(item.spotting) + '</p>');
      }
      html += renderDynamicElementsLevel(item);
    } else if (usesMuscleGroups(tpl)) {
      if (window.SectionsGroups) window.SectionsGroups.ensureItemMuscleGroups(item);
      if (hasContent(item.description)) {
        html += block('Описание уровня', '<p>' + textToHtml(item.description) + '</p>');
      }
      if (hasContent(item.preparatoryExercises)) {
        html += block('Подводящие упражнения', '<p>' + textToHtml(item.preparatoryExercises) + '</p>');
      }
      if (hasContent(item.errors) && tpl === 'static-level') {
        html += block('Ошибки (общие)', '<p>' + textToHtml(item.errors) + '</p>');
      }
      html += renderGppExerciseLevel(item, tpl);
    } else if (tpl === 'simple-block') {
      html += block('Описание', '<p>' + textToHtml(item.description) + '</p>');
    }

    $('#detailContent').innerHTML = html || '<p class="prose">Контент пока не заполнен. Используйте админ-панель.</p>';
    var dynamicRoot = $('#detailContent .dynamic-level-ui');
    if (dynamicRoot) bindDynamicElementsNav(dynamicRoot, item);
    var gppRoot = $('#detailContent .gpp-level-ui:not(.dynamic-level-ui)');
    if (gppRoot) bindGppLevelNav(gppRoot, item, tpl);
    $('#detailVideos').innerHTML = '';
    $('#detailVideos').hidden = true;
    $('#detailMedia').innerHTML = item.photo
      ? ''
      : '<img src="' + assetUrl('logo.jpg') + '" alt="" class="detail__hero-logo" width="80" height="80">';

    var bmBtn = $('#detailBookmark');
    if (bmBtn) bmBtn.style.visibility = 'hidden';

    detail.classList.add('is-open');
    detail.setAttribute('aria-hidden', 'false');
    document.body.classList.add('detail-open');
    $('.detail__body', detail).scrollTop = 0;
  }

  function setView(view) {
    var materials = $('#viewMaterials');
    var sections = $('#viewSections');
    var filters = $('#headerFilters');
    var searchWrap = $('.header__search-wrap');
    var btns = document.querySelectorAll('[data-main-view]');
    btns.forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.mainView === view);
    });
    if (materials) materials.classList.toggle('hidden', view !== 'materials');
    if (sections) sections.classList.toggle('hidden', view !== 'sections');
    if (filters) filters.classList.toggle('hidden', view !== 'materials');
    if (searchWrap) searchWrap.classList.toggle('hidden', view !== 'materials');
    if (view === 'sections') renderSectionsList();
  }

  async function init() {
    await SS.loadSections();
    renderSectionsList();
    window.addEventListener('sections-updated', renderSectionsList);
  }

  window.SectionsUI = { init: init, renderSectionsList: renderSectionsList };
})();
