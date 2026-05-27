/**
 * 1) Скопируйте этот файл как github-local.config.js (в той же папке js/)
 * 2) Вставьте токен вместо YOUR_TOKEN_HERE
 * 3) Сохраните. Файл в .gitignore — в GitHub не попадёт.
 *
 * Токен: https://github.com/settings/tokens → classic → scope repo
 */
(function () {
  var host = location.hostname || '';
  var isLocal =
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    location.protocol === 'file:';
  if (!isLocal) return;

  window.__WORKOUT_GH_TOKEN__ = 'YOUR_TOKEN_HERE';
})();
