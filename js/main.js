/**
 * WORKOUT Sport Center — interactive materials library
 * Content: data/content.json (built from Word via scripts/build-content.py)
 */

const STORAGE_BOOKMARKS = 'workout_bookmarks';

let contentData = null;
let activeFilter = 'all';
let searchQuery = '';
let openArticleId = null;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function formatDate(iso) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${mon} ${year}`;
}

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_BOOKMARKS) || '[]');
  } catch {
    return [];
  }
}

function toggleBookmark(id) {
  const list = getBookmarks();
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(id);
  localStorage.setItem(STORAGE_BOOKMARKS, JSON.stringify(list));
  return list.includes(id);
}

function isBookmarked(id) {
  return getBookmarks().includes(id);
}

function videoSrc(path) {
  if (!path) return '';
  return path
    .split('/')
    .map((part, i) => (i === 0 ? part : encodeURIComponent(part)))
    .join('/');
}

function renderVideoBlock(v) {
  const title = v.title || 'Видео';
  if (v.src) {
    const src = videoSrc(v.src);
    return `
      <div class="video-block">
        <h3>${title}</h3>
        <video class="video-player" controls playsinline preload="metadata" src="${src}">
          <a href="${src}">Скачать видео</a>
        </video>
      </div>`;
  }
  if (v.embed) {
    return `
      <div class="video-block">
        <h3>${title}</h3>
        <iframe src="${v.embed}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>`;
  }
  return '';
}

function markdownLite(text) {
  let html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n• /g, '</p><ul><li>')
    .replace(/\n•/g, '<li>')
    .replace(/• /g, '');

  if (text.includes('•')) {
    const parts = text.split('\n');
    const items = parts.filter((p) => p.trim().startsWith('•')).map((p) => `<li>${p.replace(/^•\s*/, '')}</li>`);
    const before = parts.filter((p) => !p.trim().startsWith('•') && p.trim()).join(' ');
    html = before ? `<p>${before}</p>` : '';
    if (items.length) html += `<ul>${items.join('')}</ul>`;
    return html;
  }

  return `<p>${html}</p>`;
}

function getFilteredArticles() {
  if (!contentData?.articles) return [];
  return contentData.articles.filter((a) => {
    const matchFilter = activeFilter === 'all' || a.category === activeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
}

function renderStats() {
  const articles = contentData?.articles || [];
  const el = $('#heroStats');
  if (!el) return;
  el.innerHTML = `
    <div class="hero__stat"><strong>${articles.length}</strong>материалов</div>
    <div class="hero__stat"><strong>${getBookmarks().length}</strong>в закладках</div>
  `;
}

function renderCards() {
  const grid = $('#cardsGrid');
  const empty = $('#gridEmpty');
  const articles = getFilteredArticles();

  grid.innerHTML = '';
  empty.classList.toggle('hidden', articles.length > 0);

  articles.forEach((article, i) => {
    const saved = isBookmarked(article.id);
    const underline = article.title.length < 35 ? ' card__title--underline' : '';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.style.setProperty('--i', i);
    card.dataset.id = article.id;
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <div class="card__media">
        <div class="card__media-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <path d="M8 12h8M12 8v8"/>
          </svg>
        </div>
        <div class="card__accent"></div>
        <button type="button" class="card__bookmark${saved ? ' is-saved' : ''}" data-bookmark="${article.id}" aria-label="Закладка">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </button>
      </div>
      <div class="card__body">
        <span class="card__category">${article.category}</span>
        <h3 class="card__title${underline}">${article.title}</h3>
        <p class="card__excerpt">${article.excerpt}</p>
        <p class="card__meta">${formatDate(article.date)}</p>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-bookmark]')) return;
      openDetail(article.id, card);
    });

    const bm = card.querySelector('[data-bookmark]');
    bm.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = toggleBookmark(article.id);
      bm.classList.toggle('is-saved', now);
      renderStats();
    });

    grid.appendChild(card);
  });
}

function openDetail(id, sourceCard) {
  const article = contentData.articles.find((a) => a.id === id);
  if (!article) return;

  openArticleId = id;
  const detail = $('#detail');
  const panel = $('#detailPanel');

  $('#detailCategory').textContent = article.category;
  $('#detailTitle').textContent = article.title;
  $('#detailMeta').textContent = formatDate(article.date);

  const contentEl = $('#detailContent');
  contentEl.innerHTML = (article.body || [])
    .map((p) => markdownLite(p))
    .join('');

  const videosEl = $('#detailVideos');
  const videos = article.videos || [];
  if (videos.length) {
    videosEl.innerHTML = videos.map(renderVideoBlock).join('');
    videosEl.hidden = false;
  } else {
    videosEl.innerHTML = '';
    videosEl.hidden = true;
  }

  $('#detailMedia').innerHTML = `<img src="logo.jpg" alt="" class="detail__hero-logo" width="80" height="80">`;

  const bmBtn = $('#detailBookmark');
  bmBtn.classList.toggle('is-saved', isBookmarked(id));
  bmBtn.onclick = () => {
    const now = toggleBookmark(id);
    bmBtn.classList.toggle('is-saved', now);
    $$(`[data-bookmark="${id}"]`).forEach((b) => b.classList.toggle('is-saved', now));
    renderStats();
  };

  if (sourceCard) runFlipTransition(sourceCard);

  detail.classList.add('is-open');
  detail.setAttribute('aria-hidden', 'false');
  document.body.classList.add('detail-open');

  requestAnimationFrame(() => {
    panel.scrollTop = 0;
    $('.detail__body', panel)?.scrollTo(0, 0);
  });
}

function closeDetail() {
  const detail = $('#detail');
  detail.classList.remove('is-open');
  detail.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('detail-open');
  openArticleId = null;
  const ghost = $('#cardGhost');
  ghost.classList.remove('is-active');
  ghost.style.cssText = '';
}

function runFlipTransition(card) {
  const ghost = $('#cardGhost');
  const rect = card.getBoundingClientRect();

  ghost.innerHTML = card.innerHTML;
  ghost.style.cssText = `
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border-radius: var(--radius-lg);
  `;
  ghost.classList.add('is-active');

  requestAnimationFrame(() => {
    const panel = $('#detailPanel');
    const panelRect = panel.getBoundingClientRect();
    ghost.style.top = `${panelRect.top}px`;
    ghost.style.left = `${panelRect.left}px`;
    ghost.style.width = `${panelRect.width}px`;
    ghost.style.height = '200px';
    ghost.style.borderRadius = '0';
    ghost.style.opacity = '0';
  });

  setTimeout(() => {
    ghost.classList.remove('is-active');
    ghost.style.cssText = '';
    ghost.style.opacity = '';
  }, 650);
}

function bindEvents() {
  $$('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      $$('[data-filter]').forEach((b) => b.classList.toggle('is-active', b === btn));
      renderCards();
    });
  });

  $('#searchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCards();
  });

  $$('[data-action="close-detail"]').forEach((el) => {
    el.addEventListener('click', closeDetail);
  });

  $('[data-action="home"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDetail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openArticleId) closeDetail();
  });
}

async function loadContent() {
  try {
    const res = await fetch('data/content.json');
    if (!res.ok) throw new Error('fetch failed');
    contentData = await res.json();
  } catch {
    console.warn('Using inline fallback — run scripts/build-content.py');
    contentData = { articles: [] };
  }
}

async function init() {
  await loadContent();
  bindEvents();
  renderStats();
  renderCards();
}

init();
