/**
 * Базовый путь для GitHub Pages (репозиторий в подпапке, напр. /site/)
 */
(function () {
  function detectBase() {
    const path = window.location.pathname || '/';
    if (path.endsWith('/')) return path;
    if (/\.(html?)$/i.test(path)) {
      const base = path.replace(/\/[^/]*$/, '/');
      return base || '/';
    }
    return path + '/';
  }

  window.Workout = window.Workout || {};
  window.Workout.basePath = detectBase();

  window.Workout.assetUrl = function (relativePath) {
    const clean = String(relativePath).replace(/^\//, '');
    return window.Workout.basePath + clean;
  };

  /* Подсказка в консоли при отладке на телефоне */
  window.Workout.debugBase = window.Workout.basePath;
})();
