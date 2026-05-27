/**
 * Нормализация ссылок на медиа (Google Drive и др.)
 */
(function () {
  function extractDriveId(url) {
    if (!url) return null;
    var s = String(url);
    var m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    return null;
  }

  function isDriveUrl(url) {
    return /drive\.google\.com/i.test(url || '');
  }

  function driveImageUrl(id) {
    return 'https://drive.google.com/uc?export=view&id=' + id;
  }

  function driveVideoPreviewUrl(id) {
    return 'https://drive.google.com/file/d/' + id + '/preview';
  }

  function driveVideoViewUrl(id) {
    return 'https://drive.google.com/file/d/' + id + '/view';
  }

  function normalizeImageUrl(url) {
    if (!url) return '';
    var s = String(url).trim();
    if (!isDriveUrl(s)) return s;
    var id = extractDriveId(s);
    return id ? driveImageUrl(id) : s;
  }

  /**
   * @returns {{ type: 'embed'|'src', url: string, openUrl?: string }}
   */
  function normalizeVideo(url) {
    var s = String(url || '').trim();
    if (!s) return { type: 'src', url: s };
    if (!isDriveUrl(s)) return { type: 'src', url: s };
    var id = extractDriveId(s);
    if (!id) return { type: 'src', url: s };
    return {
      type: 'embed',
      url: driveVideoPreviewUrl(id),
      openUrl: driveVideoViewUrl(id),
    };
  }

  function driveOpenUrl(url) {
    var id = extractDriveId(url);
    return id ? driveVideoViewUrl(id) : url;
  }

  window.WorkoutMedia = {
    extractDriveId: extractDriveId,
    isDriveUrl: isDriveUrl,
    normalizeImageUrl: normalizeImageUrl,
    normalizeVideo: normalizeVideo,
    driveOpenUrl: driveOpenUrl,
  };
})();
