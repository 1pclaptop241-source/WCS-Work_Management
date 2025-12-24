self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        console.log('Push Recieved...', data);

        self.registration.showNotification(data.title, {
            body: data.body,
            // icon: '/icon.png', // Icon file missing
            data: {
                url: data.url || '/'
            }
        });
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
