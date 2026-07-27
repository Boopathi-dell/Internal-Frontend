self.addEventListener("push", (event) => {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  const data = event.data ? event.data.json() : {};
  const title = data.title || "New Notification";
  const message = data.body || "You have a new message.";
  const icon = data.icon || "/logo192.png"; // Assuming standard React icon exists
  const badge = data.badge || "/logo192.png";
  const url = data.url || "/";

  const options = {
    body: message,
    icon: icon,
    badge: badge,
    vibrate: [200, 100, 200, 100, 200, 100, 200], // Vibrate to get attention
    data: {
      url: url
    },
    requireInteraction: true // Keep it on screen until user clicks
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url.includes(new URL(urlToOpen, self.location.origin).href) && "focus" in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
