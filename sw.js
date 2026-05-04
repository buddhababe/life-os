const CACHE = 'lifeos-v2';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/main.js', '/js/saju.js', '/js/store.js', '/js/evolution.js', '/js/firebase-init.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

// Message from main thread to schedule notifications
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SCHEDULE_NOTIF') {
    scheduleLocalNotifications(e.data.notifications);
  }
});

function scheduleLocalNotifications(notifications) {
  notifications.forEach(n => {
    const now = new Date();
    let target = new Date();
    target.setHours(n.hour, n.min, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    setTimeout(() => {
      showNotification(n.title, n.body);
      // Reschedule for tomorrow
      setInterval(() => showNotification(n.title, n.body), 24 * 60 * 60 * 1000);
    }, delay);
  });
}

function showNotification(title, body) {
  if (Notification.permission === 'granted') {
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'lifeos-reminder',
      requireInteraction: false
    });
  }
}
