/**
 * Конструктор сайта в админ-панели
 */
(function () {
  var SC = window.SiteConfigStore;
  var S = window.WorkoutStore;

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
    }, 3200);
  }

  function slugId(text) {
    return String(text || 'item')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
  }

  function getConfig() {
    return SC.getSiteConfig() || { version: 1, site: {}, mainTabs: [], materialFilters: [], customPages: [] };
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

  function renderBuilder() {
    var host = $('#siteBuilderRoot');
    if (!host) return;
    var cfg = getConfig();
    var draft = SC.isDraftEnabled();

    host.innerHTML =
      '<div class="builder-draft' +
      (draft ? ' builder-draft--on' : '') +
      '">' +
      (draft
        ? '<p>⚠ Сейчас на этом устройстве показан <strong>черновик</strong>. Другие пользователи видят файлы с GitHub.</p>'
        : '<p>✓ Показываются данные с сайта (GitHub). После правок скачайте JSON и загрузите в репозиторий.</p>') +
      '</div>' +
      '<section class="builder-section">' +
      '<h3>Версия сайта</h3>' +
      '<p class="admin-help">Увеличьте число после каждой публикации — так проще понять, что обновление дошло.</p>' +
      '<label>version<input type="number" id="builderVersion" min="1" value="' +
      (cfg.version || 1) +
      '"></label>' +
      '</section>' +
      '<section class="builder-section">' +
      '<h3>Шапка главной страницы</h3>' +
      '<label>Бейдж<input type="text" id="builderHeroBadge" value="' +
      escapeHtml(cfg.site && cfg.site.heroBadge) +
      '"></label>' +
      '<label>Заголовок<input type="text" id="builderHeroTitle" value="' +
      escapeHtml(cfg.site && cfg.site.heroTitle) +
      '"></label>' +
      '<label>Текст<textarea id="builderHeroText" rows="2">' +
      escapeHtml(cfg.site && cfg.site.heroText) +
      '</textarea></label>' +
      '</section>' +
      '<section class="builder-section">' +
      '<h3>Вкладки в меню (верх)</h3>' +
      '<div id="builderTabsList"></div>' +
      '<button type="button" class="admin-btn admin-btn--sm" id="builderAddTab">+ Вкладка</button>' +
      '</section>' +
      '<section class="builder-section">' +
      '<h3>Фильтры «Материалы»</h3>' +
      '<div id="builderFiltersList"></div>' +
      '<button type="button" class="admin-btn admin-btn--sm" id="builderAddFilter">+ Категория</button>' +
      '</section>' +
      '<section class="builder-section">' +
      '<h3>Свои страницы</h3>' +
      '<p class="admin-help">Создайте страницу и привяжите её как вкладку в меню (тип «Своя страница»).</p>' +
      '<div id="builderPagesList"></div>' +
      '<button type="button" class="admin-btn admin-btn--sm" id="builderAddPage">+ Страница</button>' +
      '</section>' +
      '<section class="builder-section builder-section--publish">' +
      '<h3>Публикация для всех</h3>' +
      '<ol class="builder-steps">' +
      '<li>Нажмите «Сохранить черновик» — проверьте на сайте.</li>' +
      '<li>Скачайте все JSON (кнопки ниже).</li>' +
      '<li>Замените файлы в папке <code>data/</code> на GitHub и сделайте push.</li>' +
      '<li>Через 1–3 минуты обновление увидят все.</li>' +
      '</ol>' +
      '<button type="button" class="admin-btn admin-btn--primary" id="builderSaveDraft">Сохранить черновик на устройстве</button>' +
      '<button type="button" class="admin-btn admin-btn--primary" id="builderDownloadAll">Скачать все JSON для GitHub</button>' +
      '<button type="button" class="admin-btn" id="builderDownloadConfig">Скачать site-config.json</button>' +
      '<button type="button" class="admin-btn admin-btn--danger" id="builderUseServer">Отменить черновик — как на GitHub</button>' +
      '</section>';

    renderTabsList(cfg);
    renderFiltersList(cfg);
    renderPagesList(cfg);
    bindBuilderActions();
  }

  function renderTabsList(cfg) {
    var el = $('#builderTabsList');
    if (!el) return;
    el.innerHTML = (cfg.mainTabs || [])
      .map(function (tab, i) {
        var pages = (cfg.customPages || [])
          .map(function (p) {
            return '<option value="' + escapeHtml(p.id) + '"' + (tab.pageId === p.id ? ' selected' : '') + '>' + escapeHtml(p.title) + '</option>';
          })
          .join('');
        return (
          '<div class="builder-row" data-tab-i="' +
          i +
          '">' +
          '<input type="text" class="builder-tab-label" placeholder="Название" value="' +
          escapeHtml(tab.label) +
          '">' +
          '<select class="builder-tab-type">' +
          '<option value="materials"' +
          (tab.type === 'materials' ? ' selected' : '') +
          '>Материалы</option>' +
          '<option value="sections"' +
          (tab.type === 'sections' ? ' selected' : '') +
          '>База элементов</option>' +
          '<option value="page"' +
          (tab.type === 'page' ? ' selected' : '') +
          '>Своя страница</option>' +
          '</select>' +
          '<select class="builder-tab-page' +
          (tab.type === 'page' ? '' : ' hidden') +
          '"><option value="">— страница —</option>' +
          pages +
          '</select>' +
          '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger builder-del-tab">×</button>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderFiltersList(cfg) {
    var el = $('#builderFiltersList');
    if (!el) return;
    el.innerHTML = (cfg.materialFilters || [])
      .map(function (f, i) {
        return (
          '<div class="builder-row" data-filter-i="' +
          i +
          '">' +
          '<input type="text" class="builder-filter-label" placeholder="Название кнопки" value="' +
          escapeHtml(f.label) +
          '">' +
          '<input type="text" class="builder-filter-cat" placeholder="Категория (пусто = Все)" value="' +
          escapeHtml(f.category || '') +
          '">' +
          '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger builder-del-filter"' +
          (i === 0 ? ' disabled' : '') +
          '>×</button>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderPagesList(cfg) {
    var el = $('#builderPagesList');
    if (!el) return;
    if (!(cfg.customPages || []).length) {
      el.innerHTML = '<p class="admin-help">Пока нет своих страниц.</p>';
      return;
    }
    el.innerHTML = (cfg.customPages || [])
      .map(function (page, pi) {
        var blocks = (page.blocks || [])
          .map(function (block, bi) {
            if (block.type === 'text') {
              return (
                '<div class="builder-block" data-page="' +
                pi +
                '" data-block="' +
                bi +
                '">' +
                '<label class="admin-field">Текстовый блок<input type="text" class="builder-block-title" value="' +
                escapeHtml(block.title || 'Текст') +
                '"></label>' +
                '<textarea class="builder-block-text" rows="3">' +
                escapeHtml((block.body || []).join('\n\n')) +
                '</textarea>' +
                '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger builder-del-block">Удалить блок</button></div>'
              );
            }
            if (block.type === 'hub') {
              var items = (block.items || [])
                .map(function (it, ii) {
                  return (
                    '<div class="builder-hub-item" data-item-id="' +
                    escapeHtml(it.id || 'item-' + ii) +
                    '">' +
                    '<div class="builder-hub-item__head">' +
                    '<input type="text" class="builder-item-title" value="' +
                    escapeHtml(it.title) +
                    '" placeholder="Название пункта">' +
                    '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger builder-del-hub-item">×</button>' +
                    '</div>' +
                    '<textarea class="builder-item-body" rows="2" placeholder="Текст">' +
                    escapeHtml((it.body || []).join('\n\n')) +
                    '</textarea>' +
                    '<label class="admin-field">Видео <span class="label-hint">Название | ссылка</span>' +
                    '<textarea class="builder-item-videos" rows="2">' +
                    escapeHtml(formatVideosForEditor(it.videos || [])) +
                    '</textarea></label></div>'
                  );
                })
                .join('');
              return (
                '<div class="builder-block" data-page="' +
                pi +
                '" data-block="' +
                bi +
                '">' +
                '<label class="admin-field">Блок с кнопками<input type="text" class="builder-block-title" value="' +
                escapeHtml(block.title || 'Раздел') +
                '"></label>' +
                '<div class="builder-hub-items">' +
                items +
                '</div>' +
                '<button type="button" class="admin-btn admin-btn--sm builder-add-hub-item">+ Подраздел</button> ' +
                '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger builder-del-block">Удалить блок</button></div>'
              );
            }
            return '';
          })
          .join('');
        return (
          '<div class="builder-page" data-page-i="' +
          pi +
          '">' +
          '<h4>Страница: <input type="text" class="builder-page-title" value="' +
          escapeHtml(page.title) +
          '"></h4>' +
          '<label>Краткое описание<textarea class="builder-page-intro" rows="2">' +
          escapeHtml(page.intro || '') +
          '</textarea></label>' +
          blocks +
          '<button type="button" class="admin-btn admin-btn--sm builder-add-text-block">+ Текстовый блок</button> ' +
          '<button type="button" class="admin-btn admin-btn--sm builder-add-hub-block">+ Блок с кнопками</button> ' +
          '<button type="button" class="admin-btn admin-btn--sm admin-btn--danger builder-del-page">Удалить страницу</button>' +
          '</div>'
        );
      })
      .join('');
  }

  function collectConfigFromForm() {
    var cfg = getConfig();
    cfg.version = parseInt($('#builderVersion').value, 10) || 1;
    cfg.site = {
      heroBadge: $('#builderHeroBadge').value.trim(),
      heroTitle: $('#builderHeroTitle').value.trim(),
      heroText: $('#builderHeroText').value.trim(),
    };
    cfg.mainTabs = [];
    $('#builderTabsList')
      .querySelectorAll('.builder-row')
      .forEach(function (row) {
        var type = row.querySelector('.builder-tab-type').value;
        var tab = {
          id: type === 'page' ? 'tab-' + slugId(row.querySelector('.builder-tab-label').value) : type,
          label: row.querySelector('.builder-tab-label').value.trim() || 'Вкладка',
          type: type,
        };
        if (type === 'page') {
          tab.pageId = row.querySelector('.builder-tab-page').value;
          tab.id = 'page-' + tab.pageId;
        }
        cfg.mainTabs.push(tab);
      });
    cfg.materialFilters = [];
    $('#builderFiltersList')
      .querySelectorAll('.builder-row')
      .forEach(function (row, i) {
        cfg.materialFilters.push({
          id: 'f-' + i,
          label: row.querySelector('.builder-filter-label').value.trim() || 'Категория',
          category: row.querySelector('.builder-filter-cat').value.trim(),
        });
      });
    return cfg;
  }

  function collectPagesFromDom(cfg) {
    var pages = cfg.customPages || [];
    $('#builderPagesList')
      .querySelectorAll('.builder-page')
      .forEach(function (pageEl, pi) {
        if (!pages[pi]) return;
        pages[pi].title = pageEl.querySelector('.builder-page-title').value.trim();
        pages[pi].intro = pageEl.querySelector('.builder-page-intro').value.trim();
        var blocks = [];
        pageEl.querySelectorAll('.builder-block').forEach(function (blockEl) {
          var titleInput = blockEl.querySelector('.builder-block-title');
          var titleText = titleInput ? titleInput.value.trim() : 'Блок';
          if (blockEl.querySelector('.builder-block-text')) {
            blocks.push({
              type: 'text',
              title: titleText,
              body: blockEl
                .querySelector('.builder-block-text')
                .value.split(/\n\n+/)
                .map(function (p) {
                  return p.trim();
                })
                .filter(Boolean),
            });
          } else if (blockEl.querySelector('.builder-hub-items')) {
            var items = [];
            blockEl.querySelectorAll('.builder-hub-item').forEach(function (itemEl, ii) {
              var videosEl = itemEl.querySelector('.builder-item-videos');
              items.push({
                id: itemEl.getAttribute('data-item-id') || 'item-' + Date.now(),
                title: itemEl.querySelector('.builder-item-title').value.trim() || 'Пункт',
                body: itemEl
                  .querySelector('.builder-item-body')
                  .value.split(/\n\n+/)
                  .map(function (p) {
                    return p.trim();
                  })
                  .filter(Boolean),
                videos: parseVideosFromEditor(videosEl ? videosEl.value : ''),
              });
            });
            blocks.push({ type: 'hub', title: titleText, items: items });
          }
        });
        pages[pi].blocks = blocks;
      });
    cfg.customPages = pages;
  }

  function bindBuilderActions() {
    $('#builderAddTab')?.addEventListener('click', function () {
      var cfg = collectConfigFromForm();
      cfg.mainTabs.push({ id: 'custom-' + Date.now(), label: 'Новая вкладка', type: 'materials' });
      SC.saveSiteConfigLocal(cfg);
      renderBuilder();
    });
    $('#builderAddFilter')?.addEventListener('click', function () {
      var cfg = collectConfigFromForm();
      cfg.materialFilters.push({ id: 'f-new', label: 'Новая категория', category: 'Новая категория' });
      SC.saveSiteConfigLocal(cfg);
      renderBuilder();
    });
    $('#builderAddPage')?.addEventListener('click', function () {
      var cfg = collectConfigFromForm();
      var id = 'page-' + Date.now();
      cfg.customPages = cfg.customPages || [];
      cfg.customPages.push({
        id: id,
        title: 'Новая страница',
        intro: '',
        blocks: [{ type: 'text', title: 'Описание', body: ['Добавьте текст'] }],
      });
      SC.saveSiteConfigLocal(cfg);
      renderBuilder();
    });

    $('#builderTabsList')?.addEventListener('click', function (e) {
      if (e.target.classList.contains('builder-del-tab')) {
        var cfg = collectConfigFromForm();
        var i = parseInt(e.target.closest('.builder-row').dataset.tabI, 10);
        cfg.mainTabs.splice(i, 1);
        SC.saveSiteConfigLocal(cfg);
        renderBuilder();
      }
    });
    $('#builderTabsList')?.addEventListener('change', function (e) {
      if (e.target.classList.contains('builder-tab-type')) {
        var row = e.target.closest('.builder-row');
        var sel = row.querySelector('.builder-tab-page');
        if (sel) sel.classList.toggle('hidden', e.target.value !== 'page');
      }
    });
    $('#builderFiltersList')?.addEventListener('click', function (e) {
      if (e.target.classList.contains('builder-del-filter')) {
        var cfg = collectConfigFromForm();
        var i = parseInt(e.target.closest('.builder-row').dataset.filterI, 10);
        cfg.materialFilters.splice(i, 1);
        SC.saveSiteConfigLocal(cfg);
        renderBuilder();
      }
    });

    $('#builderPagesList')?.addEventListener('click', function (e) {
      var cfg = collectConfigFromForm();
      collectPagesFromDom(cfg);
      var pageEl = e.target.closest('.builder-page');
      var blockEl = e.target.closest('.builder-block');
      var pi = pageEl ? parseInt(pageEl.dataset.pageI, 10) : -1;

      if (e.target.classList.contains('builder-del-page') && pi >= 0) {
        cfg.customPages.splice(pi, 1);
        SC.saveSiteConfigLocal(cfg);
        renderBuilder();
        return;
      }
      if (e.target.classList.contains('builder-del-block') && blockEl) {
        var bi = parseInt(blockEl.dataset.block, 10);
        cfg.customPages[pi].blocks.splice(bi, 1);
        SC.saveSiteConfigLocal(cfg);
        renderBuilder();
        return;
      }
      if (e.target.classList.contains('builder-add-text-block') && pi >= 0) {
        cfg.customPages[pi].blocks.push({ type: 'text', title: 'Новый текст', body: [] });
        SC.saveSiteConfigLocal(cfg);
        renderBuilder();
        return;
      }
      if (e.target.classList.contains('builder-add-hub-block') && pi >= 0) {
        cfg.customPages[pi].blocks.push({
          type: 'hub',
          title: 'Новый раздел',
          items: [{ id: 'item-0', title: 'Пункт 1', body: [], videos: [] }],
        });
        SC.saveSiteConfigLocal(cfg);
        renderBuilder();
        return;
      }
      if (e.target.classList.contains('builder-add-hub-item') && blockEl) {
        var bi2 = parseInt(blockEl.dataset.block, 10);
        cfg.customPages[pi].blocks[bi2].items.push({ id: 'item-' + Date.now(), title: 'Новый подраздел', body: [], videos: [] });
        SC.saveSiteConfigLocal(cfg);
        renderBuilder();
        return;
      }
      if (e.target.classList.contains('builder-del-hub-item') && blockEl) {
        var bi3 = parseInt(blockEl.dataset.block, 10);
        var itemEl = e.target.closest('.builder-hub-item');
        var itemId = itemEl && itemEl.getAttribute('data-item-id');
        if (itemId && cfg.customPages[pi].blocks[bi3]) {
          cfg.customPages[pi].blocks[bi3].items = cfg.customPages[pi].blocks[bi3].items.filter(function (it) {
            return it.id !== itemId;
          });
          SC.saveSiteConfigLocal(cfg);
          renderBuilder();
        }
        return;
      }
    });

    $('#builderSaveDraft')?.addEventListener('click', function () {
      var cfg = collectConfigFromForm();
      collectPagesFromDom(cfg);
      SC.saveSiteConfigLocal(cfg);
      SC.setDraftEnabled(true);
      if (S && S.setDraftEnabled) S.setDraftEnabled(true);
      applySiteChanges();
      showToast('Черновик сохранён — видите только вы');
    });

    $('#builderDownloadConfig')?.addEventListener('click', function () {
      var cfg = collectConfigFromForm();
      collectPagesFromDom(cfg);
      SC.downloadSiteConfigJson(cfg);
      showToast('site-config.json скачан');
    });

    $('#builderDownloadAll')?.addEventListener('click', function () {
      var cfg = collectConfigFromForm();
      collectPagesFromDom(cfg);
      SC.downloadSiteConfigJson(cfg);
      if (S) {
        S.downloadContentJson(S.getContentData());
        setTimeout(function () {
          window.SectionsStore.downloadSectionsJson(window.SectionsStore.getSectionsData());
        }, 400);
      }
      showToast('Скачайте 3 файла в data/ на GitHub');
    });

    $('#builderUseServer')?.addEventListener('click', async function () {
      if (!confirm('Убрать черновик и загрузить данные с сайта?')) return;
      SC.clearAllDrafts();
      await SC.loadSiteConfig();
      if (S) {
        await S.loadContent();
        if (window.SectionsStore) await window.SectionsStore.loadSections();
      }
      applySiteChanges();
      renderBuilder();
      showToast('Загружено с GitHub / встроенных файлов');
    });
  }

  function applySiteChanges() {
    if (window.SiteNav) {
      window.SiteNav.applyHero();
      window.SiteNav.renderMainTabs();
      window.SiteNav.renderFilters();
      window.SiteNav.renderAllCustomViews();
      window.SiteNav.setMainView('materials');
    }
    window.dispatchEvent(new CustomEvent('site-config-updated'));
    if (window.WorkoutMain) {
      window.WorkoutMain.renderCards();
      window.WorkoutMain.populateCategorySelect();
    }
  }

  window.SiteBuilder = {
    render: renderBuilder,
    init: function () {
      window.addEventListener('site-config-updated', function () {
        /* noop — for other modules */
      });
    },
  };
})();
