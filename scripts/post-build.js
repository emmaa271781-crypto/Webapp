const fs = require('fs');
const path = require('path');

// Remove old files that might interfere
// __dirname is scripts/, so go up one level to get project root
const projectRoot = path.join(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const oldFiles = ['app.js', 'style.css'];

console.log('🧹 Cleaning up old files...');
oldFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`   Removing old ${file}...`);
    fs.unlinkSync(filePath);
  }
});

// Check if index.html still references old files and warn
const indexPath = path.join(publicDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('app.js') || indexContent.includes('style.css')) {
    console.error('❌ ERROR: index.html still references old app.js or style.css!');
    console.error('   This means Vite did not properly build the React app.');
    console.error('   The old public/index.html may have been preserved.');
    console.error('   Attempting to fix by checking if src/index.html exists...');
    
    const srcIndexPath = path.join(projectRoot, 'src', 'index.html');
    if (fs.existsSync(srcIndexPath)) {
      console.log('   Found src/index.html - Vite should have used this.');
      console.log('   The build may have failed or the old file was not replaced.');
    }
  } else {
    console.log('✅ index.html is clean (no old file references)');
  }
}

// Copy service worker to public directory after build
const swDest = path.join(projectRoot, 'public', 'sw.js');

// Check if service worker already exists (from old build or manually created)
if (fs.existsSync(swDest)) {
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
