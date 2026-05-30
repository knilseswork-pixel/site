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
let materialHubEditor = null;

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

function mountMaterialHubEditor(items) {
  if (!window.WorkoutHubItemsEditor) return null;
  var root = $('#editorHubItems');
  if (root) root.dataset.hubBound = '';
  materialHubEditor = window.WorkoutHubItemsEditor.mount(root, items || []);
  return materialHubEditor;
}

function openEditor(id = null) {
  editingId = id;
  const editor = $('#adminEditor');
  editor?.classList.remove('hidden');

  const data = getContentData();
  const article = id ? data.articles.find((a) => a.id === id) : null;
  const hubItems = window.WorkoutHubItemsEditor
    ? window.WorkoutHubItemsEditor.getList(article || {})
    : article?.items || article?.subSections || [];

  $('#editorTitle').value = article?.title || '';
  $('#editorExcerpt').value = article?.excerpt || '';
  $('#editorDate').value = article?.date || new Date().toISOString().slice(0, 10);
  if (window.WorkoutMain && window.WorkoutMain.populateCategorySelect) {
    window.WorkoutMain.populateCategorySelect();
  }
  $('#editorCategory').value = article?.category || 'Методика';
  $('#editorBody').value = (article?.body || []).join('\n\n');
  $('#editorVideos').value = window.WorkoutHubItemsEditor
    ? window.WorkoutHubItemsEditor.formatVideosForEditor(article?.videos || [])
    : '';

  const hasHub = hubItems.length > 0;
  $('#editorBodyWrap')?.classList.toggle('hidden', hasHub);
  $('#editorVideos')?.closest('label')?.classList.toggle('hidden', hasHub);
  mountMaterialHubEditor(hubItems);
}

function collectEditorData() {
  const title = $('#editorTitle').value.trim();
  const excerpt = $('#editorExcerpt').value.trim();
  const date = $('#editorDate').value || new Date().toISOString().slice(0, 10);
  const category = $('#editorCategory').value;
  const data = getContentData();
  const existing = editingId ? data.articles.find((a) => a.id === editingId) : null;

  const items = materialHubEditor ? materialHubEditor.collect() : [];

  if (items.length > 0) {
    const hub = {
      ...existing,
      id: existing?.id || slugId(title) || 'article-' + Date.now(),
      title,
      excerpt,
      date,
      category,
      type: 'hub',
      subSections: items,
      items: items,
      body: [],
      videos: [],
      accent: existing?.accent || '#FF2D2D',
    };
    if (window.WorkoutHubItemsEditor) window.WorkoutHubItemsEditor.syncItemsAlias(hub);
    return hub;
  }

  const body = $('#editorBody').value
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const videos = window.WorkoutHubItemsEditor
    ? window.WorkoutHubItemsEditor.parseVideosFromEditor($('#editorVideos').value)
    : [];

  let id = editingId || slugId(title);
  if (!editingId && data.articles.some((a) => a.id === id)) {
    id = `${id}-${Date.now()}`;
  }

  const plain = {
    ...existing,
    id,
    title,
    excerpt,
    date,
    category,
    accent: existing?.accent || '#FF2D2D',
    body,
    videos,
  };
  delete plain.type;
  delete plain.items;
  delete plain.subSections;
  return plain;
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

function getGhTokenFromInput() {
  var el = $('#ghToken');
  return el ? String(el.value || '').trim() : '';
}

function getGhTokenForUse() {
  var fromInput = getGhTokenFromInput();
  if (fromInput) return fromInput;
  if (window.GitHubPush) return window.GitHubPush.loadStoredToken();
  return '';
}

function setGhTokenInput(value) {
  var el = $('#ghToken');
  if (el) el.value = value || '';
}

function loadGhSettings() {
  if (!window.GitHubPush) return;
  var saved = window.GitHubPush.loadStoredToken();
  if (saved) {
    setGhTokenInput(saved);
    updatePublishHint('✓ Токен сохранён в этом браузере', true);
  } else {
    updatePublishHint();
  }
}

function updatePublishHint(text, ok) {
  var hint = $('#publishGhStatus');
  if (!hint) return;
  if (text) {
    hint.textContent = text;
    hint.style.color = ok ? '#4ade80' : ok === false ? '#f87171' : '';
    return;
  }
  hint.textContent = 'Введите токен и нажмите «Проверить» или сразу «Опубликовать».';
  hint.style.color = '';
}

function bindGhEvents() {
  var ghSaveBtn = $('#ghSaveBtn');
  if (ghSaveBtn) {
    ghSaveBtn.addEventListener('click', async function () {
      if (!window.GitHubPush) return;
      var token = getGhTokenFromInput();
      if (!token) {
        showToast('Вставьте токен ghp_…');
        updatePublishHint('Введите токен перед сохранением', false);
        return;
      }
      var check = await window.GitHubPush.checkToken(token);
      if (!check.ok) {
        updatePublishHint('✗ ' + (check.reason || 'Токен не принят'), false);
        showToast('Токен не принят GitHub');
        return;
      }
      window.GitHubPush.saveStoredToken(token);
      updatePublishHint('✓ Токен сохранён (' + check.login + ') в этом браузере', true);
      showToast('Токен сохранён');
    });
  }

  var ghClearBtn = $('#ghClearBtn');
  if (ghClearBtn) {
    ghClearBtn.addEventListener('click', function () {
      if (!window.GitHubPush) return;
      window.GitHubPush.clearStoredToken();
      setGhTokenInput('');
      updatePublishHint('Сохранённый токен удалён');
      showToast('Токен удалён');
    });
  }

  var ghCheckBtn = $('#ghCheckBtn');
  if (ghCheckBtn) {
    ghCheckBtn.addEventListener('click', async function () {
      if (!window.GitHubPush) return;
      var token = getGhTokenForUse();
      if (!token) {
        showToast('Вставьте токен ghp_…');
        updatePublishHint('Введите токен GitHub', false);
        return;
      }
      var btn = ghCheckBtn;
      btn.disabled = true;
      btn.textContent = 'Проверяю…';
      updatePublishHint('Проверяю токен…', null);
      try {
        var result = await window.GitHubPush.checkToken(token);
        if (result.ok) {
          updatePublishHint('✓ Токен работает (' + result.login + ')', true);
        } else {
          updatePublishHint('✗ ' + (result.reason || 'Токен не принят'), false);
        }
      } catch (e) {
        updatePublishHint('✗ ' + e.message, false);
      }
      btn.disabled = false;
      btn.textContent = 'Проверить токен';
    });
  }

  var publishGhBtn = $('#adminPublishGitHub');
  if (publishGhBtn) {
    publishGhBtn.addEventListener('click', async function () {
      if (!window.GitHubPush) {
        showToast('Модуль github-push.js не загружен');
        return;
      }

      var token = getGhTokenForUse();
      if (!token) {
        alert('Введите токен GitHub (ghp_…) или нажмите «Сохранить токен» после ввода.');
        return;
      }

      var preCheck = await window.GitHubPush.checkToken(token);
      if (!preCheck.ok) {
        alert('Токен не принят GitHub:\n\n' + (preCheck.reason || 'Ошибка'));
        updatePublishHint('✗ ' + (preCheck.reason || 'Токен не принят'), false);
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

        await window.GitHubPush.publishAll(
          files,
          function (msg) {
            btn.textContent = msg;
            showToast(msg);
          },
          token
        );

        if (window.SiteConfigStore) window.SiteConfigStore.clearAllDrafts();

        if (window.GitHubPush.hasStoredToken()) {
          setGhTokenInput(window.GitHubPush.loadStoredToken());
          updatePublishHint('✅ Опубликовано. Сохранённый токен на месте.', true);
        } else {
          updatePublishHint('✅ Опубликовано.', true);
        }
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
