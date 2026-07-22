self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: data.icon || '/assets/logo-red.png',
        badge: '/assets/logo-red.png',
        data: data.url,
      };

      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (e) {
      console.error('Error parsing push data', e);
      // Fallback if data is not JSON
      event.waitUntil(
        self.registration.showNotification(event.data.text(), {
          icon: '/assets/logo-red.png',
          badge: '/assets/logo-red.png'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});
