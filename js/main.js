/**
 * WORKOUT Sport Center — главный скрипт
 */
(function () {
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

  function renderVideoBlock(v) {
    var title = v.title || 'Видео';
    if (v.src) {
      var src = videoSrc(v.src);
      return (
        '<div class="video-block"><h3>' + title + '</h3>' +
        '<video class="video-player" controls playsinline preload="metadata" src="' + src + '"></video></div>'
      );
    }
    if (v.embed) {
      return (
        '<div class="video-block"><h3>' + title + '</h3>' +
        '<iframe src="' + v.embed + '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
      );
    }
    return '';
  }

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

  function getFilteredArticles() {
    var data = getContentData();
    if (!data || !data.articles) return [];
    return data.articles.filter(function (a) {
      var matchFilter = activeFilter === 'all' || a.category === activeFilter;
      var q = searchQuery.toLowerCase().trim();
      var matchSearch = !q ||
        a.title.toLowerCase().indexOf(q) >= 0 ||
        a.excerpt.toLowerCase().indexOf(q) >= 0 ||
        a.category.toLowerCase().indexOf(q) >= 0;
      return matchFilter && matchSearch;
    });
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
        '<p class="card__excerpt">' + escapeHtml(article.excerpt) + '</p>' +
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

    $('#detailContent').innerHTML = (article.body || []).map(markdownLite).join('');

    var videosEl = $('#detailVideos');
    var videos = article.videos || [];
    if (videos.length) {
      videosEl.innerHTML = videos.map(renderVideoBlock).join('');
      videosEl.hidden = false;
    } else {
      videosEl.innerHTML = '';
      videosEl.hidden = true;
    }

    $('#detailMedia').innerHTML = '<img src="' + (window.Workout.assetUrl('logo.jpg')) + '" alt="" class="detail__hero-logo" width="80" height="80">';

    var bmBtn = $('#detailBookmark');
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

  function bindEvents() {
    $$('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeFilter = btn.dataset.filter;
        $$('[data-filter]').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        renderCards();
      });
    });

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
      if (e.key === 'Escape' && openArticleId) closeDetail();
    });

    window.addEventListener('content-updated', function () {
      if (openArticleId) closeDetail();
      renderStats();
      renderCards();
    });
  }

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
      await loadContent();
      if (window.WorkoutAdmin) await window.WorkoutAdmin.init();
      bindEvents();
      renderStats();
      renderCards();
    } catch (e) {
      console.error(e);
      var banner = $('#loadBanner');
      if (banner) {
        banner.classList.remove('hidden');
        var t = $('#loadBannerText');
        if (t) t.textContent = 'Ошибка загрузки сайта. Обновите страницу или откройте через Chrome/Safari.';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
