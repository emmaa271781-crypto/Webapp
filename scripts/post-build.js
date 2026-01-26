const fs = require('fs');
const path = require('path');

// Copy service worker to public directory after build
const swSource = path.join(__dirname, 'public', 'sw.js');
const swDest = path.join(__dirname, 'public', 'sw.js');

// Only copy if source exists and is different
if (fs.existsSync(swSource)) {
  console.log('✅ Service worker preserved');
} else {
  console.log('⚠️  Service worker not found, creating default...');
  const defaultSW = `self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data = { body: event.data.text() };
    }
  }
  const title = data.title || "New message";
  const options = {
    body: data.body || "Open Classroom CS to view.",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return null;
      })
  );
});`;
  fs.writeFileSync(swDest, defaultSW);
}

console.log('✅ Post-build script completed');
