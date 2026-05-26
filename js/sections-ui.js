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
    if (/^https?:\/\//i.test(path)) return path;
    return window.Workout && window.Workout.assetUrl ? window.Workout.assetUrl(path) : path;
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
    if (template === 'dynamic-level' && item.videos && item.videos.length) {
      return 'Видео: ' + item.videos.length;
    }
    if (item.photo) return 'Есть фото';
    if (item.groups && item.groups.length) return 'Заполнено блоков: ' + item.groups.length;
    return 'Нажмите, чтобы открыть и заполнить';
  }

  function renderSectionsList() {
    var root = $('#sectionsRoot');
    if (!root) return;
    var data = SS.getSectionsData();
    var sections = data.sections || [];

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
      html +=
        '<div class="item-photo-wrap"><img class="item-photo" src="' +
        assetUrl(item.photo) +
        '" alt="' +
        escapeHtml(item.title) +
        '"></div>';
    }

    if (tpl === 'static-level' || tpl === 'simple-block') {
      html += block('Описание', '<p>' + textToHtml(item.description) + '</p>');
      html += block('Подводящие упражнения', '<p>' + textToHtml(item.preparatoryExercises) + '</p>');
      html += block('Ошибки', '<p>' + textToHtml(item.errors) + '</p>');
    }

    if (tpl === 'dynamic-level') {
      html += renderVideos(item.videos);
      html += block('Описание', '<p>' + textToHtml(item.description) + '</p>');
      html += block('Подводящие упражнения', '<p>' + textToHtml(item.preparatoryExercises) + '</p>');
      html += block('Ошибки', '<p>' + textToHtml(item.errors) + '</p>');
      html += block('Страховка', '<p>' + textToHtml(item.spotting) + '</p>');
    }

    if (tpl === 'gpp-level' || tpl === 'sfpp-level') {
      (item.groups || []).forEach(function (g) {
        var inner = '';
        if (g.photo) {
          inner +=
            '<div class="item-photo-wrap item-photo-wrap--sm"><img class="item-photo" src="' +
            assetUrl(g.photo) +
            '" alt=""></div>';
        }
        inner += '<p><strong>Описание:</strong><br>' + textToHtml(g.description) + '</p>';
        if (tpl === 'gpp-level') {
          inner += '<p><strong>Цель:</strong><br>' + textToHtml(g.goal) + '</p>';
          inner += '<p><strong>Принцип действия:</strong><br>' + textToHtml(g.principle) + '</p>';
          inner += '<p><strong>Ошибки:</strong><br>' + textToHtml(g.errors) + '</p>';
        } else {
          inner += '<p><strong>Цель упражнения:</strong><br>' + textToHtml(g.goal) + '</p>';
        }
        html +=
          '<div class="content-block content-block--group">' +
          '<h3 class="content-block__title">' +
          escapeHtml(g.label) +
          '</h3><div class="content-block__body prose">' +
          inner +
          '</div></div>';
      });
    }

    $('#detailContent').innerHTML = html || '<p class="prose">Контент пока не заполнен. Используйте админ-панель.</p>';
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

  function bindViewSwitch() {
    document.querySelectorAll('[data-main-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setView(btn.dataset.mainView);
      });
    });
  }

  async function init() {
    await SS.loadSections();
    bindViewSwitch();
    renderSectionsList();
    window.addEventListener('sections-updated', renderSectionsList);
  }

  window.SectionsUI = { init: init, setView: setView, renderSectionsList: renderSectionsList };
})();
