/* Service worker: Web Push + локальный тест уведомления. v4 */
self.addEventListener('install', function () {
  self.skipWaiting();
});
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var title = 'Срочно';
  var body = '';
  var tag = 'urgent';
  try {
    if (event.data) {
      var j = event.data.json();
      if (j.title) title = j.title;
      if (j.body) body = j.body;
      if (j.tag) tag = j.tag;
    }
  } catch (e) {}
  if (typeof tag === 'string' && tag.length > 120) {
    tag = tag.slice(0, 120);
  }
  var swUrl = self.location.href;
  var iconUrl = new URL('./push-icon.png', swUrl).href;
  var openUrl = new URL('./', swUrl).href;
  // На части Android vibrate/requireInteraction в связке с push ломают показ — сначала проще.
  var simple = {
    body: body || title,
    tag: tag,
    renotify: true,
    icon: iconUrl,
    badge: iconUrl,
    data: { url: openUrl },
  };
  var bare = {
    body: body || title,
    tag: tag,
    renotify: true,
    data: { url: openUrl },
  };
  event.waitUntil(
    self.registration.showNotification(title, simple).catch(function () {
      return self.registration.showNotification(title, bare);
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var swUrl = self.location.href;
  var url = new URL('./', swUrl).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.url.indexOf(self.location.origin) !== -1 && 'focus' in c) {
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
