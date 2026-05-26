/**
 * Загрузка и сохранение контента сайта
 */

export const STORAGE_CONTENT = 'workout_content_data';
export const STORAGE_SESSION = 'workout_admin_session';
export const STORAGE_PASSWORD = 'workout_admin_password_hash';
export const STORAGE_JSONBIN = 'workout_jsonbin_settings';

let contentData = null;
let adminConfig = null;

export function getContentData() {
  return contentData;
}

export function setContentData(data) {
  contentData = data;
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function loadAdminConfig() {
  if (adminConfig) return adminConfig;
  try {
    const res = await fetch('data/admin-config.json');
    if (res.ok) adminConfig = await res.json();
  } catch {
    adminConfig = {};
  }
  return adminConfig;
}

export function getPasswordHash() {
  return localStorage.getItem(STORAGE_PASSWORD) || adminConfig?.passwordHash || '';
}

export async function verifyPassword(password) {
  const hash = await sha256(password);
  return hash === getPasswordHash();
}

export function isAdminLoggedIn() {
  return sessionStorage.getItem(STORAGE_SESSION) === '1';
}

export function setAdminLoggedIn(value) {
  if (value) sessionStorage.setItem(STORAGE_SESSION, '1');
  else sessionStorage.removeItem(STORAGE_SESSION);
}

function getJsonBinSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_JSONBIN) || '{}');
  } catch {
    return {};
  }
}

async function fetchJsonBin() {
  const cfg = await loadAdminConfig();
  const local = getJsonBinSettings();
  const binId = local.binId || cfg.jsonBinId;
  const accessKey = local.accessKey || cfg.jsonBinAccessKey;
  if (!binId) return null;

  const headers = { 'X-Bin-Meta': 'false' };
  if (accessKey) headers['X-Access-Key'] = accessKey;

  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers });
  if (!res.ok) return null;
  const json = await res.json();
  return json.record || null;
}

export async function loadContent() {
  const remote = await fetchJsonBin();
  if (remote?.articles) {
    contentData = remote;
    return contentData;
  }

  try {
    const res = await fetch('data/content.json');
    if (!res.ok) throw new Error('fetch failed');
    contentData = await res.json();
  } catch {
    contentData = { site: {}, articles: [] };
  }

  const local = localStorage.getItem(STORAGE_CONTENT);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed?.articles?.length) contentData = parsed;
    } catch {
      /* keep server version */
    }
  }

  return contentData;
}

export function saveContentLocal(data) {
  contentData = data;
  localStorage.setItem(STORAGE_CONTENT, JSON.stringify(data));
}

export function clearContentLocal() {
  localStorage.removeItem(STORAGE_CONTENT);
}

export async function publishToJsonBin(data) {
  const settings = getJsonBinSettings();
  if (!settings.binId || !settings.masterKey) {
    throw new Error('Настройте JSONBin в панели администратора');
  }
  const res = await fetch(`https://api.jsonbin.io/v3/b/${settings.binId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': settings.masterKey,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка публикации в облако');
  saveContentLocal(data);
  return true;
}

export function downloadContentJson(data = contentData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'content.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importContentFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.articles) throw new Error('Неверный формат');
        saveContentLocal(data);
        resolve(data);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

export function slugId(title) {
  const cyr = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  let s = title.toLowerCase().trim();
  s = [...s].map((ch) => cyr[ch] ?? ch).join('');
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s || `article-${Date.now()}`;
}
