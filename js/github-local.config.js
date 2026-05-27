/**
 * ВСТАВЬТЕ СЮДА СВОЙ ТОКЕН (ghp_...) между кавычками.
 * Этот файл в .gitignore — не уйдёт в Git при push.
 * НЕ копируйте этот файл на публичный хостинг вручную!
 */
(function () {
  var host = location.hostname || '';
  var isLocal =
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    location.protocol === 'file:';
  if (!isLocal) return;

  window.__WORKOUT_GH_TOKEN__ = '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';
})();
