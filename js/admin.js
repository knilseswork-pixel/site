/**
 * Панель администратора — редактирование без кода
 */

import {
  STORAGE_PASSWORD,
  STORAGE_JSONBIN,
  clearContentLocal,
  downloadContentJson,
  getContentData,
  importContentFromFile,
  isAdminLoggedIn,
  loadAdminConfig,
  loadContent,
  publishToJsonBin,
  saveContentLocal,
  setAdminLoggedIn,
  sha256,
  slugId,
  verifyPassword,
} from './content-store.js';

const $ = (sel, root = document) => root.querySelector(sel);

const CATEGORIES = ['Уровни', 'Методика', 'Разминка'];

let editingId = null;

function notifyContentUpdated() {
  window.dispatchEvent(new CustomEvent('content-updated'));
}

function openAdmin() {
  $('#adminPanel')?.classList.add('is-open');
  document.body.classList.add('admin-open');
  renderAdminList();
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

  list.innerHTML = (data.articles || [])
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

  $('#editorTitle').value = article?.title || '';
  $('#editorExcerpt').value = article?.excerpt || '';
  $('#editorDate').value = article?.date || new Date().toISOString().slice(0, 10);
  $('#editorCategory').value = article?.category || 'Уровни';
  $('#editorBody').value = (article?.body || []).join('\n\n');
  $('#editorVideos').value = formatVideosForEditor(article?.videos || []);
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
  const body = $('#editorBody').value
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const videos = parseVideosFromEditor($('#editorVideos').value);

  let id = editingId || slugId(title);
  const data = getContentData();
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

function bindAdminEvents() {
  $('#adminOpenBtn')?.addEventListener('click', () => {
    if (isAdminLoggedIn()) {
      openAdmin();
      showApp();
    } else {
      openAdmin();
      showLogin();
    }
  });

  $('#adminCloseBtn')?.addEventListener('click', closeAdmin);
  $('#adminBackdrop')?.addEventListener('click', closeAdmin);

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
    if (!confirm('Сбросить локальные изменения и загрузить с сервера?')) return;
    clearContentLocal();
    await loadContent();
    notifyContentUpdated();
    renderAdminList();
    showToast('Загружено с сервера');
  });

  $('#adminPublishCloud')?.addEventListener('click', handlePublishCloud);
  $('#saveJsonBinSettings')?.addEventListener('click', saveJsonBinSettings);
  $('#changePasswordBtn')?.addEventListener('click', changePassword);

  $$('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.admin-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      $$('.admin-tab-panel').forEach((p) => p.classList.toggle('hidden', p.dataset.tab !== tab.dataset.tab));
    });
  });
}

export async function initAdmin() {
  await loadAdminConfig();
  loadJsonBinSettings();
  bindAdminEvents();
}
