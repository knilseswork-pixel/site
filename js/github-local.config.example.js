/**
 * Необязательно: переопределение токена только на этом ПК.
 * Для всех админов используйте js/github-token.config.js
 */
(function () {
  if (window.__WORKOUT_GH_TOKEN__) return;
  window.__WORKOUT_GH_TOKEN__ = 'YOUR_TOKEN_HERE';
})();
