// firebase-messaging-sw.js
// FCM 백그라운드 알림을 위한 서비스 워커 (루트에 위치 필수)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCOnFGSxz9G62JStorc4T4FFidimIrllMA",
  authDomain: "life-os-be1e0.firebaseapp.com",
  projectId: "life-os-be1e0",
  storageBucket: "life-os-be1e0.firebasestorage.app",
  messagingSenderId: "750419818481",
  appId: "1:750419818481:web:8d9deebdafeb3e5e6bf650"
});

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 (앱이 닫혀 있을 때)
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM] Background message:', payload);
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Life OS', {
    body: body || '',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'lifeos',
    requireInteraction: false,
    data: payload.data
  });
});

// 알림 클릭 → 앱 열기
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('life-os') && 'focus' in client) return client.focus();
      }
      return clients.openWindow('https://newwhy2.github.io/life-os/');
    })
  );
});
