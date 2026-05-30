/**
 * Навигация и пользовательские страницы из site-config.json
 */
(function () {
  var SC = window.SiteConfigStore;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function textToHtml(text) {
    return escapeHtml(text).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  }

  function applyHero() {
    var cfg = SC.getSiteConfig();
    if (!cfg || !cfg.site) return;
    var badge = $('.hero__badge');
    var title = $('.hero__title');
    var text = $('.hero__text');
    if (badge && cfg.site.heroBadge) badge.textContent = cfg.site.heroBadge;
    if (title && cfg.site.heroTitle) title.textContent = cfg.site.heroTitle;
    if (text && cfg.site.heroText) text.textContent = cfg.site.heroText;
  }

  function renderMainTabs() {
    var nav = $('#headerMainNav');
    if (!nav) return;
    var cfg = SC.getSiteConfig();
    var tabs = (cfg && cfg.mainTabs) || [];
    nav.innerHTML = tabs
      .map(function (tab, i) {
        var viewId = tab.type === 'page' ? 'page-' + tab.pageId : tab.id;
        return (
          '<button type="button" class="header__link' +
          (i === 0 ? ' is-active' : '') +
          '" data-main-view="' +
          escapeHtml(viewId) +
          '" data-tab-type="' +
          escapeHtml(tab.type) +
          '" data-page-id="' +
          escapeHtml(tab.pageId || '') +
          '">' +
          escapeHtml(tab.label) +
          '</button>'
        );
      })
      .join('');
  }

  function renderFilters() {
    var nav = $('#headerFilters');
    if (!nav) return;
    var cfg = SC.getSiteConfig();
    var filters = (cfg && cfg.materialFilters) || [];
    nav.innerHTML = filters
      .map(function (f, i) {
        var val = f.category ? f.category : 'all';
        return (
          '<button type="button" class="header__link' +
          (i === 0 ? ' is-active' : '') +
          '" data-filter="' +
          escapeHtml(val) +
          '">' +
          escapeHtml(f.label) +
          '</button>'
        );
      })
      .join('');
  }

  function renderCustomPage(page) {
    var html = '<p class="sections-intro">' + escapeHtml(page.intro || '') + '</p>';
    (page.blocks || []).forEach(function (block) {
      if (block.type === 'text') {
        html +=
          '<div class="content-block"><h3 class="content-block__title">' +
          escapeHtml(block.title || 'Текст') +
          '</h3><div class="content-block__body prose">' +
          (block.body || []).map(function (p) {
            return '<p>' + textToHtml(p) + '</p>';
          }).join('') +
          '</div></div>';
      }
      if (block.type === 'hub') {
        var btns = (block.items || [])
          .map(function (item) {
            return (
              '<button type="button" class="gpp-group-btn hub-topic-btn custom-hub-item" data-item-id="' +
              escapeHtml(item.id) +
              '"><span class="gpp-group-btn__label">' +
              escapeHtml(item.title) +
              '</span></button>'
            );
          })
          .join('');
        html +=
          '<div class="content-block content-block--group"><h3 class="content-block__title">' +
          escapeHtml(block.title || 'Раздел') +
          '</h3><div class="gpp-groups hub-topics">' +
          btns +
          '</div><div class="custom-hub-detail prose hidden"></div></div>';
      }
    });
    return html;
  }

  function bindCustomPageInteractions(root, page) {
    root.querySelectorAll('.content-block--group').forEach(function (groupEl) {
      var detail = groupEl.querySelector('.custom-hub-detail');
      var blockTitle = groupEl.querySelector('.content-block__title');
      var block = (page.blocks || []).find(function (b) {
        return b.type === 'hub' && b.title === (blockTitle && blockTitle.textContent);
      });
      if (!block) return;
      groupEl.querySelectorAll('.custom-hub-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = (block.items || []).find(function (it) {
            return it.id === btn.dataset.itemId;
          });
          if (!item || !detail) return;
          detail.classList.remove('hidden');
          detail.innerHTML =
            '<button type="button" class="gpp-back custom-hub-back">← Назад</button><h3>' +
            escapeHtml(item.title) +
            '</h3>' +
            (item.body || []).map(function (p) {
              return '<p>' + textToHtml(p) + '</p>';
            }).join('') +
            (item.videos && item.videos.length && window.renderVideoBlock
              ? item.videos.map(window.renderVideoBlock).join('')
              : '');
          detail.querySelector('.custom-hub-back').addEventListener('click', function () {
            detail.classList.add('hidden');
            detail.innerHTML = '';
          });
        });
      });
    });
  }

  function renderAllCustomViews() {
    var host = $('#customPagesRoot');
    if (!host) return;
    var cfg = SC.getSiteConfig();
    var pages = (cfg && cfg.customPages) || [];
    host.innerHTML = pages
      .map(function (page) {
        return (
          '<div id="viewPage-' +
          escapeHtml(page.id) +
          '" class="custom-page-view hidden" data-page-id="' +
          escapeHtml(page.id) +
          '">' +
          renderCustomPage(page) +
          '</div>'
        );
      })
      .join('');
    pages.forEach(function (page) {
      var el = $('#viewPage-' + page.id);
      if (el) bindCustomPageInteractions(el, page);
    });
  }

  function setMainView(viewId) {
    var materials = $('#viewMaterials');
    var sections = $('#viewSections');
    var filters = $('#headerFilters');
    var searchWrap = $('.header__search-wrap');
    var customRoot = $('#customPagesRoot');

    var isMaterials = viewId === 'materials';
    var isSections = viewId === 'sections';
    var isPage = viewId.indexOf('page-') === 0;
    var pageId = isPage ? viewId.replace('page-', '') : '';

    if (materials) materials.classList.toggle('hidden', !isMaterials);
    if (sections) sections.classList.toggle('hidden', !isSections);
    if (customRoot) {
      customRoot.classList.toggle('hidden', !isPage);
      customRoot.querySelectorAll('.custom-page-view').forEach(function (v) {
        v.classList.toggle('hidden', v.dataset.pageId !== pageId);
      });
    }
    if (filters) filters.classList.toggle('hidden', !isMaterials);
    if (searchWrap) searchWrap.classList.toggle('hidden', !isMaterials);

    document.querySelectorAll('[data-main-view]').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.mainView === viewId);
    });

    if (isSections && window.SectionsUI) window.SectionsUI.renderSectionsList();
    if (isMaterials && window.WorkoutMain) window.WorkoutMain.renderCards();
  }

  function bindNav() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-main-view]');
      if (!btn) return;
      setMainView(btn.dataset.mainView);
    });
  }

  async function init() {
    await SC.loadSiteConfig();
    applyHero();
    renderMainTabs();
    renderFilters();
    renderAllCustomViews();
    bindNav();
    window.dispatchEvent(new CustomEvent('site-config-updated'));
  }

  window.SiteNav = {
    init: init,
    setMainView: setMainView,
    renderMainTabs: renderMainTabs,
    renderFilters: renderFilters,
    renderAllCustomViews: renderAllCustomViews,
    applyHero: applyHero,
  };
})();
