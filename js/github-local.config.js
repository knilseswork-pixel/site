/**
 * Необязательно: локальное переопределение токена на этом компьютере.
 * Основной файл для всех — js/github-token.config.js
 */
(function () {
  if (window.__WORKOUT_GH_TOKEN__) return;
  window.__WORKOUT_GH_TOKEN__ = '';
})();
