// Immediate activation on update
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Custom Service Worker handler for school duty notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Support background push messages if web push is configured
self.addEventListener('push', (event) => {
  let title = 'Ново училищно съобщение';
  let options = {
    body: 'Имате ново съобщение в График за дежурства.',
    icon: '/pwa-calendar-192.png',
    badge: '/pwa-calendar-192.png',
    vibrate: [200, 100, 200],
    tag: 'school-duty-broadcast',
    renotify: true,
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || data.message || options.body;
      if (data.url) options.data.url = data.url;
    } catch {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});
