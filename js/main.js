/**
 * WORKOUT Sport Center — главный скрипт
 */
(function () {
  window.addEventListener('error', function (event) {
    try {
      var banner = document.getElementById('loadBanner');
      var text = document.getElementById('loadBannerText');
      if (!banner || !text) return;
      banner.classList.remove('hidden');
      var msg = (event && event.message) ? event.message : 'Ошибка скрипта';
      text.textContent = 'Ошибка: ' + msg;
    } catch (e) {
      /* ignore */
    }
  });

  window.addEventListener('unhandledrejection', function (event) {
    try {
      var banner = document.getElementById('loadBanner');
      var text = document.getElementById('loadBannerText');
      if (!banner || !text) return;
      banner.classList.remove('hidden');
      var msg = event && event.reason ? (event.reason.message || String(event.reason)) : 'Promise rejection';
      text.textContent = 'Ошибка: ' + msg;
    } catch (e) {
      /* ignore */
    }
  });
  const S = window.WorkoutStore;
  const getContentData = () => S.getContentData();
  const loadContent = () => S.loadContent();

  const STORAGE_BOOKMARKS = 'workout_bookmarks';

  let activeFilter = 'all';
  let searchQuery = '';
  let openArticleId = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.prototype.slice.call(root.querySelectorAll(sel));

  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  function formatDate(iso) {
    const d = new Date(iso);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_BOOKMARKS) || '[]');
    } catch (e) {
      return [];
    }
  }

  function toggleBookmark(id) {
    const list = getBookmarks();
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(id);
    localStorage.setItem(STORAGE_BOOKMARKS, JSON.stringify(list));
    return list.indexOf(id) >= 0;
  }

  function isBookmarked(id) {
    return getBookmarks().indexOf(id) >= 0;
  }

  function videoSrc(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return path.split('/').map(function (part, i) {
      return i === 0 ? part : encodeURIComponent(part);
    }).join('/');
  }

  function isMobileViewer() {
    return window.matchMedia('(max-width: 900px)').matches ||
      window.matchMedia('(pointer: coarse)').matches;
  }

  function isDriveMedia(url) {
    return window.WorkoutMedia && window.WorkoutMedia.isDriveUrl(url);
  }

  function renderDriveVideoBlock(title, embedUrl, openUrl) {
    var safeEmbed = embedUrl.replace(/"/g, '&quot;');
    var safeOpen = openUrl.replace(/"/g, '&quot;');
    if (isMobileViewer()) {
      return (
        '<div class="video-block video-block--drive-mobile">' +
        '<h3>' + title + '</h3>' +
        '<a class="vk-open-card" href="' + safeOpen + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="vk-open-card__icon" aria-hidden="true">▶</span>' +
        '<span class="vk-open-card__text">Смотреть в Google Drive</span>' +
        '<span class="vk-open-card__sub">Файл должен быть доступен по ссылке</span>' +
        '</a></div>'
      );
    }
    return (
      '<div class="video-block video-block--drive">' +
      '<h3>' + title + '</h3>' +
      '<button type="button" class="drive-video-zoom" data-media-zoom="drive-video" data-drive-preview="' +
      safeEmbed +
      '" data-drive-open="' +
      safeOpen +
      '" data-media-title="' +
      title +
      '">' +
      '<div class="video-frame-wrap video-frame-wrap--drive">' +
      '<iframe src="' +
      safeEmbed +
      '" tabindex="-1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
      '</div>' +
      '<span class="drive-photo-zoom__badge">Нажмите для просмотра на весь экран</span>' +
      '</button>' +
      '<a class="vk-open-link" href="' + safeOpen + '" target="_blank" rel="noopener noreferrer">Открыть в Google Drive</a>' +
      '</div>'
    );
  }

  function vkEmbedToWatchUrl(embed) {
    try {
      var u = new URL(embed, window.location.href);
      var oid = u.searchParams.get('oid');
      var id = u.searchParams.get('id');
      var hash = u.searchParams.get('hash');
      if (!oid || !id) return embed;
      var pathId = oid.charAt(0) === '-' ? 'video-' + oid.slice(1) + '_' + id : 'video' + oid + '_' + id;
      var url = 'https://vk.com/' + pathId;
      if (hash) url += '?hash=' + hash;
      return url;
    } catch (e) {
      return embed;
    }
  }

  function renderVideoBlock(v) {
    var title = escapeHtml(v.title || 'Видео');
    var WM = window.WorkoutMedia;
    if (v.src) {
      var rawSrc = v.src;
      if (WM && WM.isDriveUrl(rawSrc)) {
        var driveFromSrc = WM.normalizeVideo(rawSrc);
        if (driveFromSrc.type === 'embed') {
          return renderDriveVideoBlock(title, driveFromSrc.url, driveFromSrc.openUrl || WM.driveOpenUrl(rawSrc));
        }
      }
      var src = videoSrc(rawSrc);
      return (
        '<div class="video-block"><h3>' + title + '</h3>' +
        '<video class="video-player" controls playsinline preload="metadata" src="' + escapeHtml(src) + '"></video></div>'
      );
    }
    if (v.embed) {
      if (isDriveMedia(v.embed)) {
        var openDrive = WM ? WM.driveOpenUrl(v.embed) : v.embed;
        var previewDrive = v.embed;
        if (WM) {
          var normDrive = WM.normalizeVideo(v.embed);
          if (normDrive.type === 'embed') {
            previewDrive = normDrive.url;
            openDrive = normDrive.openUrl || openDrive;
          }
        }
        return renderDriveVideoBlock(title, previewDrive, openDrive);
      }

      var watchUrl = vkEmbedToWatchUrl(v.embed);
      var safeEmbed = v.embed.replace(/"/g, '&quot;');
      var safeWatch = watchUrl.replace(/"/g, '&quot;');

      if (isMobileViewer()) {
        return (
          '<div class="video-block video-block--vk-mobile">' +
          '<h3>' + title + '</h3>' +
          '<a class="vk-open-card" href="' + safeWatch + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="vk-open-card__icon" aria-hidden="true">▶</span>' +
          '<span class="vk-open-card__text">Смотреть в VK</span>' +
          '<span class="vk-open-card__sub">Нажмите — откроется приложение или сайт VK</span>' +
          '</a></div>'
        );
      }

      return (
        '<div class="video-block video-block--vk">' +
        '<h3>' + title + '</h3>' +
        '<div class="video-frame-wrap">' +
        '<iframe src="' + safeEmbed + '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
        '</div>' +
        '<a class="vk-open-link" href="' + safeWatch + '" target="_blank" rel="noopener noreferrer">Не воспроизводится? Открыть в VK</a>' +
        '</div>'
      );
    }
    return '';
  }

  window.renderVideoBlock = renderVideoBlock;

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function markdownLite(text) {
    if (text.indexOf('•') >= 0) {
      var parts = text.split('\n');
      var items = parts.filter(function (p) { return p.trim().indexOf('•') === 0; })
        .map(function (p) { return '<li>' + p.replace(/^•\s*/, '') + '</li>'; });
      var before = parts.filter(function (p) { return p.trim().indexOf('•') !== 0 && p.trim(); }).join(' ');
      var html = before ? '<p>' + before + '</p>' : '';
      if (items.length) html += '<ul>' + items.join('') + '</ul>';
      return html;
    }
    var html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>');
    return '<p>' + html + '</p>';
  }

  function hubList(article) {
    if (!article) return [];
    if (window.WorkoutHubItemsEditor) return window.WorkoutHubItemsEditor.getList(article);
    return article.items || article.subSections || [];
  }

  function isHubArticle(article) {
    return article && (article.type === 'hub' || hubList(article).length > 0);
  }

  function hubItemMatchesSearch(item, q) {
    if (!q) return true;
    var t = (item.title || '').toLowerCase();
    var body = (item.body || []).join(' ').toLowerCase();
    return t.indexOf(q) >= 0 || body.indexOf(q) >= 0;
  }

  function articleMatchesSearch(article, q) {
    if (!q) return true;
    if (
      article.title.toLowerCase().indexOf(q) >= 0 ||
      article.excerpt.toLowerCase().indexOf(q) >= 0 ||
      article.category.toLowerCase().indexOf(q) >= 0
    ) {
      return true;
    }
    if (isHubArticle(article)) {
      return hubList(article).some(function (item) {
        return hubItemMatchesSearch(item, q);
      });
    }
    return false;
  }

  function renderHubLevel(article) {
    var items = hubList(article);
    var btns = items
      .map(function (item) {
        return (
          '<button type="button" class="gpp-group-btn hub-topic-btn" data-hub-item-id="' +
          escapeHtml(item.id) +
          '">' +
          '<span class="gpp-group-btn__label">' +
          escapeHtml(item.title) +
          '</span></button>'
        );
      })
      .join('');
    var intro = '';
    if (article.excerpt) {
      intro = '<p class="sections-intro hub-level-intro">' + escapeHtml(article.excerpt) + '</p>';
    }
    var emptyHint = items.length
      ? ''
      : '<p class="gpp-level-ui__hint">Подразделы пока не добавлены. Заполните в админ-панели.</p>';
    return (
      '<div class="gpp-level-ui hub-materials-ui">' +
      intro +
      '<p class="gpp-level-ui__hint">Выберите раздел:</p>' +
      emptyHint +
      '<div class="gpp-groups hub-topics">' +
      btns +
      '</div>' +
      '<div class="gpp-exercise-view hub-item-view hidden"></div>' +
      '</div>'
    );
  }

  function renderHubItemContent(item) {
    var html =
      '<div class="gpp-exercise-detail">' +
      '<button type="button" class="gpp-back hub-back-topics">← К разделам</button>' +
      '<h3 class="gpp-exercise-detail__title">' +
      escapeHtml(item.title) +
      '</h3>' +
      '<div class="prose hub-item-body">';
    if (item.body && item.body.length) {
      html += item.body.map(markdownLite).join('');
    } else {
      html += '<p>Текст пока не добавлен. Заполните в админ-панели.</p>';
    }
    html += '</div></div>';
    return html;
  }

  function bindHubNav(container, article) {
    var topicsEl = container.querySelector('.hub-topics');
    var viewEl = container.querySelector('.hub-item-view');

    function showTopics() {
      topicsEl.classList.remove('hidden');
      viewEl.classList.add('hidden');
      viewEl.innerHTML = '';
    }

    topicsEl.querySelectorAll('.hub-topic-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = hubList(article).find(function (it) {
          return it.id === btn.dataset.hubItemId;
        });
        if (!item) return;
        topicsEl.classList.add('hidden');
        viewEl.classList.remove('hidden');
        viewEl.innerHTML = renderHubItemContent(item);
        var videos = item.videos || [];
        var videosEl = $('#detailVideos');
        if (videos.length && window.renderVideoBlock) {
          videosEl.innerHTML = videos.map(renderVideoBlock).join('');
          videosEl.hidden = false;
        } else {
          videosEl.innerHTML = '';
          videosEl.hidden = true;
        }
        viewEl.querySelector('.hub-back-topics').addEventListener('click', function () {
          videosEl.innerHTML = '';
          videosEl.hidden = true;
          showTopics();
        });
        viewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function getFilteredArticles() {
    var data = getContentData();
    if (!data || !data.articles) return [];
    var q = searchQuery.toLowerCase().trim();
    var list = data.articles.filter(function (a) {
      var matchFilter = activeFilter === 'all' || a.category === activeFilter;
      return matchFilter && articleMatchesSearch(a, q);
    });
    if (!window.WorkoutLevelSort) return list;
    var leveled = [];
    var rest = [];
    list.forEach(function (a) {
      if (window.WorkoutLevelSort.getLevelRank(a) < 1000) leveled.push(a);
      else rest.push(a);
    });
    return window.WorkoutLevelSort.sortByLevel(leveled).concat(rest);
  }

  function showLoadBanner() {
    var banner = $('#loadBanner');
    if (!banner) return;
    var data = getContentData();
    var err = window.Workout && window.Workout.loadError;
    if (err || !data || !data.articles || !data.articles.length) {
      banner.classList.remove('hidden');
      var msg = $('#loadBannerText');
      if (msg) {
        if (err) {
          msg.textContent = 'Не удалось загрузить материалы. Проверьте, что на сайте есть папка data/content.json. ' +
            'Попробуйте обновить страницу.';
        } else {
          msg.textContent = 'Материалы не найдены. Загрузите data/content.json на сервер.';
        }
      }
    } else {
      banner.classList.add('hidden');
    }
  }

  function renderStats() {
    var data = getContentData();
    var articles = (data && data.articles) || [];
    var el = $('#heroStats');
    if (!el) return;
    el.innerHTML =
      '<div class="hero__stat"><strong>' + articles.length + '</strong>материалов</div>' +
      '<div class="hero__stat"><strong>' + getBookmarks().length + '</strong>в закладках</div>';
  }

  function renderCards() {
    var grid = $('#cardsGrid');
    var empty = $('#gridEmpty');
    var articles = getFilteredArticles();

    if (!grid) return;

    grid.innerHTML = '';
    grid.classList.remove('is-ready');
    if (empty) empty.classList.toggle('hidden', articles.length > 0);

    articles.forEach(function (article, i) {
      var saved = isBookmarked(article.id);
      var underline = article.title.length < 35 ? ' card__title--underline' : '';
      var card = document.createElement('article');
      card.className = 'card';
      card.style.setProperty('--i', i);
      card.dataset.id = article.id;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML =
        '<div class="card__media">' +
        '<div class="card__media-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></svg></div>' +
        '<div class="card__accent"></div>' +
        '<button type="button" class="card__bookmark' + (saved ? ' is-saved' : '') + '" data-bookmark="' + article.id + '" aria-label="Закладка">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></button></div>' +
        '<div class="card__body"><span class="card__category">' + escapeHtml(article.category) + '</span>' +
        '<h3 class="card__title' + underline + '">' + escapeHtml(article.title) + '</h3>' +
        '<p class="card__excerpt">' +
        escapeHtml(
          isHubArticle(article)
            ? (article.items || []).map(function (it) { return it.title; }).join(' · ')
            : article.excerpt
        ) +
        '</p>' +
        '<p class="card__meta">' + formatDate(article.date) + '</p></div>';

      card.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('[data-bookmark]')) return;
        openDetail(article.id, card);
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail(article.id, card);
        }
      });

      var bm = card.querySelector('[data-bookmark]');
      bm.addEventListener('click', function (e) {
        e.stopPropagation();
        var now = toggleBookmark(article.id);
        bm.classList.toggle('is-saved', now);
        renderStats();
      });

      grid.appendChild(card);
    });

    if (articles.length) {
      requestAnimationFrame(function () {
        grid.classList.add('is-ready');
      });
    }

    showLoadBanner();
  }

  function openDetail(id, sourceCard) {
    var data = getContentData();
    var article = data.articles.find(function (a) { return a.id === id; });
    if (!article) return;

    openArticleId = id;
    var detail = $('#detail');
    var panel = $('#detailPanel');

    $('#detailCategory').textContent = article.category;
    $('#detailTitle').textContent = article.title;
    $('#detailMeta').textContent = formatDate(article.date);

    var videosEl = $('#detailVideos');
    if (isHubArticle(article)) {
      $('#detailContent').innerHTML = renderHubLevel(article);
      var hubRoot = $('#detailContent .hub-materials-ui');
      if (hubRoot) bindHubNav(hubRoot, article);
      videosEl.innerHTML = '';
      videosEl.hidden = true;
    } else {
      $('#detailContent').innerHTML = (article.body || []).map(markdownLite).join('');
      var videos = article.videos || [];
      if (videos.length) {
        videosEl.innerHTML = videos.map(renderVideoBlock).join('');
        videosEl.hidden = false;
      } else {
        videosEl.innerHTML = '';
        videosEl.hidden = true;
      }
    }

    $('#detailMedia').innerHTML = '<img src="' + (window.Workout.assetUrl('logo.jpg')) + '" alt="" class="detail__hero-logo" width="80" height="80">';

    var bmBtn = $('#detailBookmark');
    if (bmBtn) bmBtn.style.visibility = '';
    bmBtn.classList.toggle('is-saved', isBookmarked(id));
    bmBtn.onclick = function () {
      var now = toggleBookmark(id);
      bmBtn.classList.toggle('is-saved', now);
      $$('[data-bookmark="' + id + '"]').forEach(function (b) {
        b.classList.toggle('is-saved', now);
      });
      renderStats();
    };

    if (window.innerWidth >= 768 && sourceCard) runFlipTransition(sourceCard);

    detail.classList.add('is-open');
    detail.setAttribute('aria-hidden', 'false');
    document.body.classList.add('detail-open');

    requestAnimationFrame(function () {
      panel.scrollTop = 0;
      var body = $('.detail__body', panel);
      if (body) body.scrollTo(0, 0);
    });
  }

  function closeDetail() {
    $('#detail').classList.remove('is-open');
    $('#detail').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('detail-open');
    openArticleId = null;
    var bmBtn = $('#detailBookmark');
    if (bmBtn) bmBtn.style.visibility = '';
    var ghost = $('#cardGhost');
    ghost.classList.remove('is-active');
    ghost.style.cssText = '';
  }

  function runFlipTransition(card) {
    var ghost = $('#cardGhost');
    var rect = card.getBoundingClientRect();
    ghost.innerHTML = card.innerHTML;
    ghost.style.cssText = 'top:' + rect.top + 'px;left:' + rect.left + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;border-radius:var(--radius-lg)';
    ghost.classList.add('is-active');
    requestAnimationFrame(function () {
      var panel = $('#detailPanel');
      var panelRect = panel.getBoundingClientRect();
      ghost.style.top = panelRect.top + 'px';
      ghost.style.left = panelRect.left + 'px';
      ghost.style.width = panelRect.width + 'px';
      ghost.style.height = '200px';
      ghost.style.borderRadius = '0';
      ghost.style.opacity = '0';
    });
    setTimeout(function () {
      ghost.classList.remove('is-active');
      ghost.style.cssText = '';
    }, 650);
  }

  function populateCategorySelect() {
    var sel = document.getElementById('editorCategory');
    if (!sel) return;
    var cats = [];
    if (window.SiteConfigStore && window.SiteConfigStore.getCategories) {
      cats = window.SiteConfigStore.getCategories();
    }
    if (!cats.length) {
      cats = ['Методика', 'Разминка', 'Соревнования', 'Клиенты', 'Первая помощь'];
    }
    sel.innerHTML = cats
      .map(function (c) {
        return '<option>' + escapeHtml(c) + '</option>';
      })
      .join('');
  }

  function bindFilterEvents() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn || !btn.closest('#headerFilters')) return;
      activeFilter = btn.dataset.filter;
      $$('[data-filter]').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      renderCards();
    });
  }

  function bindEvents() {
    bindFilterEvents();

    var search = $('#searchInput');
    if (search) {
      search.addEventListener('input', function (e) {
        searchQuery = e.target.value;
        renderCards();
      });
    }

    $$('[data-action="close-detail"]').forEach(function (el) {
      el.addEventListener('click', closeDetail);
    });

    var home = $('[data-action="home"]');
    if (home) {
      home.addEventListener('click', function (e) {
        e.preventDefault();
        closeDetail();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('#detail').classList.contains('is-open')) closeDetail();
    });

    window.addEventListener('content-updated', function () {
      if (openArticleId) closeDetail();
      renderStats();
      renderCards();
    });

    window.addEventListener('site-config-updated', function () {
      populateCategorySelect();
      if (openArticleId) closeDetail();
      renderCards();
    });
  }

  window.WorkoutMain = {
    renderCards: renderCards,
    renderStats: renderStats,
    populateCategorySelect: populateCategorySelect,
    isHubArticle: isHubArticle,
    renderHubLevel: renderHubLevel,
    bindHubNav: bindHubNav,
  };

  function fixStaticAssets() {
    if (!window.Workout || !window.Workout.assetUrl) return;
    var css = document.getElementById('mainStylesheet');
    if (css) css.href = window.Workout.assetUrl('css/main.css');
    var logo = $('.header__logo');
    if (logo) logo.src = window.Workout.assetUrl('logo.jpg');
    var flogo = $('.footer__logo');
    if (flogo) flogo.src = window.Workout.assetUrl('logo.jpg');
    var icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = window.Workout.assetUrl('logo.jpg');
  }

  async function init() {
    try {
      fixStaticAssets();
      if (window.SiteConfigStore) await window.SiteConfigStore.loadSiteConfig();
      await loadContent();
      if (window.SectionsStore) await window.SectionsStore.loadSections();
      if (window.SiteNav) await window.SiteNav.init();
      if (window.WorkoutAdmin) {
        try {
          await window.WorkoutAdmin.init();
        } catch (adminErr) {
          console.error('Admin init failed:', adminErr);
        }
      }
      if (window.SectionsAdmin) window.SectionsAdmin.init();
      if (window.SiteBuilder) window.SiteBuilder.init();
      if (window.SectionsUI) await window.SectionsUI.init();
      bindEvents();
      populateCategorySelect();
      renderStats();
      renderCards();
    } catch (e) {
      console.error(e);
      var banner = $('#loadBanner');
      if (banner) {
        banner.classList.remove('hidden');
        var t = $('#loadBannerText');
        if (t) {
          var msg = (e && (e.message || e.toString && e.toString())) ? String(e.message || e.toString()) : 'Неизвестная ошибка';
          t.textContent = 'Ошибка загрузки: ' + msg;
        }
      }
    }
  }

  window.WorkoutBoot = init;
})();
