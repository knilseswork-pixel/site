/**
 * Увеличение фото и видео (Google Drive iframe) по клику
 */
(function () {
  var lb = null;
  var bodyEl = null;

  function ensureLightbox() {
    if (lb) return lb;
    lb = document.createElement('div');
    lb.className = 'media-lightbox';
    lb.id = 'mediaLightbox';
    lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML =
      '<div class="media-lightbox__backdrop" data-media-lightbox-close></div>' +
      '<div class="media-lightbox__panel" role="dialog" aria-modal="true" aria-label="Просмотр медиа">' +
      '<button type="button" class="media-lightbox__close" data-media-lightbox-close aria-label="Закрыть">×</button>' +
      '<div class="media-lightbox__body" id="mediaLightboxBody"></div>' +
      '<a class="media-lightbox__external hidden" id="mediaLightboxExternal" target="_blank" rel="noopener noreferrer">Открыть в Google Drive</a>' +
      '</div>';
    document.body.appendChild(lb);
    bodyEl = lb.querySelector('#mediaLightboxBody');
    var ext = lb.querySelector('#mediaLightboxExternal');

    lb.addEventListener('click', function (e) {
      if (e.target.closest('[data-media-lightbox-close]')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('is-open')) close();
    });

    return lb;
  }

  function openDrivePreview(previewUrl, openUrl, title) {
    ensureLightbox();
    var ext = lb.querySelector('#mediaLightboxExternal');
    bodyEl.innerHTML =
      '<iframe class="media-lightbox__iframe" src="' +
      escapeAttr(previewUrl) +
      '" title="' +
      escapeAttr(title || 'Медиа') +
      '" allow="autoplay; encrypted-media; fullscreen" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>';
    if (openUrl && ext) {
      ext.href = openUrl;
      ext.classList.remove('hidden');
    } else if (ext) {
      ext.classList.add('hidden');
    }
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('media-lightbox-open');
  }

  function openImage(src, alt) {
    ensureLightbox();
    var ext = lb.querySelector('#mediaLightboxExternal');
    bodyEl.innerHTML =
      '<img class="media-lightbox__img" src="' +
      escapeAttr(src) +
      '" alt="' +
      escapeAttr(alt || '') +
      '">';
    if (ext) ext.classList.add('hidden');
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('media-lightbox-open');
  }

  function close() {
    if (!lb) return;
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('media-lightbox-open');
    bodyEl.innerHTML = '';
  }

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function handleZoomClick(el) {
    var kind = el.getAttribute('data-media-zoom');
    if (kind === 'drive' || kind === 'drive-video') {
      var preview = el.getAttribute('data-drive-preview');
      var open = el.getAttribute('data-drive-open') || '';
      var title = el.getAttribute('data-media-title') || '';
      if (preview) openDrivePreview(preview, open, title);
      return;
    }
    if (kind === 'img') {
      var src = el.getAttribute('data-img-src');
      if (src) openImage(src, el.getAttribute('data-media-title') || '');
    }
  }

  function init() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-media-zoom]');
      if (!trigger) return;
      e.preventDefault();
      handleZoomClick(trigger);
    });
    document.addEventListener('keydown', function (e) {
      var trigger = e.target.closest('[data-media-zoom]');
      if (!trigger) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleZoomClick(trigger);
      }
    });
  }

  window.WorkoutMediaLightbox = {
    init: init,
    openDrivePreview: openDrivePreview,
    openImage: openImage,
    close: close,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
