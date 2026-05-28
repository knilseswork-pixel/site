/**
 * Панель администратора — редактирование без кода
 */
(function () {
  const S = window.WorkoutStore;
  const STORAGE_PASSWORD = S.STORAGE_PASSWORD;
  const STORAGE_JSONBIN = S.STORAGE_JSONBIN;
  const getContentData = () => S.getContentData();
  const clearContentLocal = () => S.clearContentLocal();
  const downloadContentJson = () => S.downloadContentJson();
  const importContentFromFile = (f) => S.importContentFromFile(f);
  const isAdminLoggedIn = () => S.isAdminLoggedIn();
  const loadAdminConfig = () => S.loadAdminConfig();
  const loadContent = () => S.loadContent();
  const publishToJsonBin = (d) => S.publishToJsonBin(d);
  const saveContentLocal = (d) => S.saveContentLocal(d);
  const setAdminLoggedIn = (v) => S.setAdminLoggedIn(v);
  const sha256 = (t) => S.sha256(t);
  const slugId = (t) => S.slugId(t);
  const verifyPassword = (p) => S.verifyPassword(p);

  const $ = (sel, root = document) => (root || document).querySelector(sel);
  const $$ = (sel, root = document) => Array.prototype.slice.call(root.querySelectorAll(sel));

  const CATEGORIES = ['Методика', 'Разминка', 'Соревнования', 'Клиенты', 'Первая помощь'];

let editingId = null;

function notifyContentUpdated() {
  window.dispatchEvent(new CustomEvent('content-updated'));
}

function openAdmin() {
  $('#adminPanel')?.classList.add('is-open');
  document.body.classList.add('admin-open');
  renderAdminList();
  if (window.SectionsAdmin) window.SectionsAdmin.renderList();
}

function closeAdmin() {
  $('#adminPanel')?.classList.remove('is-open');
  document.body.classList.remove('admin-open');
  hideEditor();
}

function showLogin() {
  $('#adminLogin')?.classList.remove('hidden');
  $('#adminApp')?.classList.add('hidden');
}

function showApp() {
  $('#adminLogin')?.classList.add('hidden');
  $('#adminApp')?.classList.remove('hidden');
  if (window.SectionsAdmin) window.SectionsAdmin.renderList();
}

async function tryLogin(password) {
  if (await verifyPassword(password)) {
    setAdminLoggedIn(true);
    showApp();
    return true;
  }
  return false;
}

function renderAdminList() {
  const list = $('#adminArticleList');
  const data = getContentData();
  if (!list || !data) return;

  var articles = data.articles || [];
  if (window.WorkoutLevelSort) {
    articles = window.WorkoutLevelSort.sortByLevel(articles);
  }

  list.innerHTML = articles
    .map(
      (a) => `
    <li class="admin-list__item">
      <div class="admin-list__info">
        <strong>${escapeHtml(a.title)}</strong>
        <span>${escapeHtml(a.category)} · ${a.date || ''}</span>
      </div>
      <div class="admin-list__actions">
        <button type="button" class="admin-btn admin-btn--sm" data-edit="${a.id}">Изменить</button>
        <button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-del="${a.id}">Удалить</button>
      </div>
    </li>`
    )
    .join('');

  list.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEditor(btn.dataset.edit));
  });
  list.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => deleteArticle(btn.dataset.del));
  });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function hideEditor() {
  editingId = null;
  $('#adminEditor')?.classList.add('hidden');
}

function openEditor(id = null) {
  editingId = id;
  const editor = $('#adminEditor');
  editor?.classList.remove('hidden');

  const data = getContentData();
  const article = id ? data.articles.find((a) => a.id === id) : null;
  const isHub = article?.type === 'hub' && article?.items?.length;

  $('#editorTitle').value = article?.title || '';
  $('#editorExcerpt').value = article?.excerpt || '';
  $('#editorDate').value = article?.date || new Date().toISOString().slice(0, 10);
  if (window.WorkoutMain && window.WorkoutMain.populateCategorySelect) {
    window.WorkoutMain.populateCategorySelect();
  }
  $('#editorCategory').value = article?.category || 'Методика';
  $('#editorBody').value = (article?.body || []).join('\n\n');
  $('#editorVideos').value = formatVideosForEditor(article?.videos || []);

  const hubBox = $('#editorHubItems');
  const bodyWrap = $('#editorBodyWrap');
  const videosWrap = $('#editorVideos')?.closest('label');
  if (isHub && hubBox) {
    bodyWrap?.classList.add('hidden');
    videosWrap?.classList.add('hidden');
    hubBox.classList.remove('hidden');
    hubBox.innerHTML = (article.items || [])
      .map(
        (item, i) => `
      <div class="admin-hub-item">
        <h4>${escapeHtml(item.title)}</h4>
        <label>Текст <span class="label-hint">абзацы через пустую строку</span>
          <textarea id="hubItem${i}Body" rows="5">${escapeHtml((item.body || []).join('\n\n'))}</textarea>
        </label>
        <label>Видео VK <span class="label-hint">Название | ссылка</span>
          <textarea id="hubItem${i}Videos" rows="2">${escapeHtml(formatVideosForEditor(item.videos || []))}</textarea>
        </label>
      </div>`
      )
      .join('');
  } else {
    bodyWrap?.classList.remove('hidden');
    videosWrap?.classList.remove('hidden');
    hubBox?.classList.add('hidden');
    if (hubBox) hubBox.innerHTML = '';
  }
}

function formatVideosForEditor(videos) {
  return videos
    .map((v) => {
      const url = v.embed || v.src || '';
      return `${v.title || 'Видео'} | ${url}`;
    })
    .join('\n');
}

function parseVideosFromEditor(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    let title = `Видео ${i + 1}`;
    let url = line;
    if (line.includes('|')) {
      const [t, u] = line.split('|').map((s) => s.trim());
      title = t || title;
      url = u;
    }
    const iframe = url.match(/src=["']([^"']+)["']/i);
    if (iframe) url = iframe[1];
    if (window.WorkoutMedia && window.WorkoutMedia.isDriveUrl(url)) {
      const norm = window.WorkoutMedia.normalizeVideo(url);
      if (norm.type === 'embed') return { title, embed: norm.url };
    }
    if (url.includes('vk.com') || url.includes('youtube') || url.includes('youtu.be')) {
      return { title, embed: url };
    }
    return { title, src: url };
  });
}

function collectEditorData() {
  const title = $('#editorTitle').value.trim();
  const excerpt = $('#editorExcerpt').value.trim();
  const date = $('#editorDate').value || new Date().toISOString().slice(0, 10);
  const category = $('#editorCategory').value;
  const data = getContentData();
  const existing = editingId ? data.articles.find((a) => a.id === editingId) : null;

  if (existing?.type === 'hub' && existing.items) {
    const items = existing.items.map((item, i) => {
      const bodyEl = $(`#hubItem${i}Body`);
      const videosEl = $(`#hubItem${i}Videos`);
      return {
        ...item,
        body: (bodyEl?.value || '')
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean),
        videos: parseVideosFromEditor(videosEl?.value || ''),
      };
    });
    return {
      ...existing,
      title,
      excerpt,
      date,
      category,
      items,
    };
  }

  const body = $('#editorBody').value
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const videos = parseVideosFromEditor($('#editorVideos').value);

  let id = editingId || slugId(title);
  if (!editingId && data.articles.some((a) => a.id === id)) {
    id = `${id}-${Date.now()}`;
  }

  return {
    id,
    title,
    excerpt,
    date,
    category,
    accent: '#FF2D2D',
    body,
    videos,
  };
}

function saveArticle() {
  const article = collectEditorData();
  const data = getContentData();
  const idx = data.articles.findIndex((a) => a.id === article.id);
  if (idx >= 0) data.articles[idx] = article;
  else data.articles.unshift(article);

  saveContentLocal(data);
  notifyContentUpdated();
  renderAdminList();
  hideEditor();
  showToast('Материал сохранён');
}

function deleteArticle(id) {
  if (!confirm('Удалить этот материал?')) return;
  const data = getContentData();
  data.articles = data.articles.filter((a) => a.id !== id);
  saveContentLocal(data);
  notifyContentUpdated();
  renderAdminList();
  showToast('Удалено');
}

function showToast(msg) {
  const t = $('#adminToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('is-visible');
  setTimeout(() => t.classList.remove('is-visible'), 2800);
}

async function handlePublishCloud() {
  try {
    await publishToJsonBin(getContentData());
    showToast('Опубликовано в облако — видят все');
  } catch (e) {
    alert(e.message || 'Ошибка облака');
  }
}

function saveJsonBinSettings() {
  const settings = {
    binId: $('#jsonBinId').value.trim(),
    accessKey: $('#jsonBinAccessKey').value.trim(),
    masterKey: $('#jsonBinMasterKey').value.trim(),
  };
  localStorage.setItem(STORAGE_JSONBIN, JSON.stringify(settings));
  showToast('Настройки облака сохранены');
}

function loadJsonBinSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_JSONBIN) || '{}');
    if (s.binId) $('#jsonBinId').value = s.binId;
    if (s.accessKey) $('#jsonBinAccessKey').value = s.accessKey;
    if (s.masterKey) $('#jsonBinMasterKey').value = s.masterKey;
  } catch {
    /* ignore */
  }
}

async function changePassword() {
  const p1 = $('#newPassword').value;
  const p2 = $('#newPassword2').value;
  if (p1.length < 4) {
    alert('Пароль минимум 4 символа');
    return;
  }
  if (p1 !== p2) {
    alert('Пароли не совпадают');
    return;
  }
  localStorage.setItem(STORAGE_PASSWORD, await sha256(p1));
  $('#newPassword').value = '';
  $('#newPassword2').value = '';
  showToast('Пароль изменён');
}

function openAdminEntry() {
  if (isAdminLoggedIn()) {
    openAdmin();
    showApp();
  } else {
    openAdmin();
    showLogin();
    requestAnimationFrame(function () {
      var input = $('#adminPassword');
      if (input) input.focus();
    });
  }
  if (history.replaceState) {
    history.replaceState(null, '', '#admin');
  } else {
    location.hash = 'admin';
  }
}

function closeAdminPanel() {
  closeAdmin();
  if (location.hash === '#admin' && history.replaceState) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

function shouldOpenAdminFromUrl() {
  if (location.hash === '#admin') return true;
  try {
    return new URLSearchParams(location.search).get('admin') === '1';
  } catch (e) {
    return false;
  }
}

function loadGhSettings() {
  if (!window.GitHubPush) return;
  var embedded = window.GitHubPush.hasEmbeddedToken();
  var tokenBlock = $('#ghTokenBlock');
  if (tokenBlock) tokenBlock.classList.toggle('hidden', embedded);
  if (!embedded) {
    var s = window.GitHubPush.loadSettings();
    var tokenEl = $('#ghToken');
    if (s.token && tokenEl) tokenEl.value = s.token;
  }
  updatePublishHint();
}

function updatePublishHint() {
  var hint = $('#publishGhStatus');
  if (!hint || !window.GitHubPush) return;
  if (window.GitHubPush.hasToken()) {
    if (window.GitHubPush.hasEmbeddedToken()) {
      hint.textContent =
        '✓ Токен в коде (github-token.config.js) · knilseswork-pixel/site — можно публиковать.';
    } else {
      hint.textContent = '✓ Токен задан · репозиторий: knilseswork-pixel/site → всё готово.';
    }
    hint.style.color = '#4ade80';
  } else {
    hint.textContent =
      '⚙ Вставьте токен в js/github-token.config.js и залейте файл на хостинг';
    hint.style.color = '';
  }
}

function bindGhEvents() {
  var ghSaveBtn = $('#ghSaveBtn');
  if (ghSaveBtn) {
    ghSaveBtn.addEventListener('click', function () {
      if (!window.GitHubPush) return;
      var token = ($('#ghToken').value || '').trim();
      if (!token) {
        showToast('Вставьте токен ghp_…');
        return;
      }
      window.GitHubPush.saveSettings({ token: token });
      updatePublishHint();
      showToast('Токен сохранён');
    });
  }

  var ghCheckBtn = $('#ghCheckBtn');
  if (ghCheckBtn) {
    ghCheckBtn.addEventListener('click', async function () {
      if (!window.GitHubPush) return;
      var btn = ghCheckBtn;
      var status = $('#ghStatus');
      btn.disabled = true;
      btn.textContent = 'Проверяю…';
      try {
        var result = await window.GitHubPush.checkToken();
        if (result.ok) {
          status.textContent = '✓ Токен работает! Вы вошли как: ' + result.login;
          status.style.color = '#4ade80';
        } else {
          status.textContent = '✗ Токен не принят: ' + result.reason + '. Проверьте права (нужен scope: repo).';
          status.style.color = '#f87171';
        }
      } catch (e) {
        status.textContent = '✗ Ошибка: ' + e.message;
        status.style.color = '#f87171';
      }
      btn.disabled = false;
      btn.textContent = 'Проверить';
    });
  }

  var publishGhBtn = $('#adminPublishGitHub');
  if (publishGhBtn) {
    publishGhBtn.addEventListener('click', async function () {
      if (!window.GitHubPush) {
        showToast('Модуль github-push.js не загружен');
        return;
      }

      if (!window.GitHubPush.hasToken()) {
        alert(
          'Токен не задан!\n\nОткройте js/github-token.config.js\nВставьте ghp_... между кавычками, сохраните и загрузите файл на сайт.'
        );
        return;
      }

      var btn = publishGhBtn;
      var origText = btn.textContent;
      btn.disabled = true;

      try {
        var files = {
          siteConfig: window.SiteConfigStore ? window.SiteConfigStore.getSiteConfig() : null,
          content: getContentData(),
          sections: window.SectionsStore ? window.SectionsStore.getSectionsData() : null,
        };

        await window.GitHubPush.publishAll(files, function (msg) {
          btn.textContent = msg;
          showToast(msg);
        });

        if (window.SiteConfigStore) window.SiteConfigStore.clearAllDrafts();

        updatePublishHint();
      } catch (e) {
        showToast('Ошибка: ' + e.message);
        alert('Ошибка публикации:\n' + e.message);
      }

      btn.disabled = false;
      btn.textContent = origText;
    });
  }

  loadGhSettings();
}

function bindAdminEvents() {
  document.querySelectorAll('[data-admin-open]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openAdminEntry();
    });
  });

  var closeBtn = $('#adminCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeAdminPanel);
  var backdrop = $('#adminBackdrop');
  if (backdrop) backdrop.addEventListener('click', closeAdminPanel);

  window.addEventListener('hashchange', function () {
    if (location.hash === '#admin' && !$('#adminPanel').classList.contains('is-open')) {
      openAdminEntry();
    }
  });

  $('#adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = await tryLogin($('#adminPassword').value);
    if (!ok) {
      $('#adminLoginError').textContent = 'Неверный пароль';
      return;
    }
    $('#adminLoginError').textContent = '';
    $('#adminPassword').value = '';
  });

  $('#adminLogout')?.addEventListener('click', () => {
    setAdminLoggedIn(false);
    showLogin();
    showToast('Вы вышли');
  });

  $('#adminAddBtn')?.addEventListener('click', () => openEditor(null));
  $('#editorCancel')?.addEventListener('click', hideEditor);
  $('#editorSave')?.addEventListener('click', saveArticle);

  $('#adminDownloadConfig')?.addEventListener('click', () => {
    if (window.SiteConfigStore) {
      window.SiteConfigStore.downloadSiteConfigJson(window.SiteConfigStore.getSiteConfig());
      showToast('site-config.json скачан');
    }
  });

  $('#adminDownload')?.addEventListener('click', () => {
    downloadContentJson();
    showToast('Файл content.json скачан — загрузите в GitHub');
  });

  $('#adminImport')?.addEventListener('click', () => $('#adminImportFile').click());
  $('#adminImportFile')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importContentFromFile(file);
      notifyContentUpdated();
      renderAdminList();
      showToast('Импорт выполнен');
    } catch {
      alert('Не удалось прочитать файл');
    }
    e.target.value = '';
  });

  $('#adminReset')?.addEventListener('click', async () => {
    if (!confirm('Сбросить черновик и загрузить данные с GitHub?')) return;
    if (window.SiteConfigStore) window.SiteConfigStore.clearAllDrafts();
    else clearContentLocal();
    await loadContent();
    if (window.SiteConfigStore) await window.SiteConfigStore.loadSiteConfig();
    if (window.SectionsStore) await window.SectionsStore.loadSections();
    if (window.SiteNav) {
      window.SiteNav.renderMainTabs();
      window.SiteNav.renderFilters();
      window.SiteNav.renderAllCustomViews();
      window.SiteNav.applyHero();
    }
    notifyContentUpdated();
    window.dispatchEvent(new CustomEvent('site-config-updated'));
    renderAdminList();
    showToast('Загружено с сервера');
  });

  bindGhEvents();

  var publishCloudBtn = $('#adminPublishCloud');
  if (publishCloudBtn) publishCloudBtn.addEventListener('click', handlePublishCloud);
  var saveJsonBinBtn = $('#saveJsonBinSettings');
  if (saveJsonBinBtn) saveJsonBinBtn.addEventListener('click', saveJsonBinSettings);
  var changePwdBtn = $('#changePasswordBtn');
  if (changePwdBtn) changePwdBtn.addEventListener('click', changePassword);

  $$('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.admin-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      $$('.admin-tab-panel').forEach((p) => p.classList.toggle('hidden', p.dataset.tab !== tab.dataset.tab));
      if (tab.dataset.tab === 'sections' && window.SectionsAdmin) {
        window.SectionsAdmin.renderList();
      }
      if (tab.dataset.tab === 'builder' && window.SiteBuilder) {
        window.SiteBuilder.render();
      }
    });
  });
}

  async function initAdmin() {
    await loadAdminConfig();
    loadJsonBinSettings();
    bindAdminEvents();
    if (shouldOpenAdminFromUrl()) {
      openAdminEntry();
    }
  }

  window.WorkoutAdmin = {
    init: initAdmin,
    open: openAdminEntry,
    close: closeAdminPanel,
    applyGhSettings: loadGhSettings,
  };
})();
