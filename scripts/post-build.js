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

// Check if index.html still references old files and delete it if so
// Vite should have already created the correct one during build
const indexPath = path.join(publicDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('app.js') || indexContent.includes('style.css')) {
    console.error('❌ ERROR: index.html still references old app.js or style.css!');
    console.error('   The old public/index.html was not replaced by Vite build.');
    
    // Check if Vite actually built assets
    const assetsDir = path.join(publicDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      const assetFiles = fs.readdirSync(assetsDir);
      const jsFiles = assetFiles.filter(f => f.endsWith('.js') && f.includes('main'));
      const cssFiles = assetFiles.filter(f => f.endsWith('.css') && f.includes('main'));
      
      if (jsFiles.length > 0 && cssFiles.length > 0) {
        console.log('   ✅ Vite assets found - old index.html should not exist!');
        console.log('   Deleting old index.html - Vite should have created the correct one.');
        fs.unlinkSync(indexPath);
        console.log('   ⚠️  WARNING: Deleted old index.html. If Vite did not create a new one,');
        console.log('      the build may have failed. Check Vite build output above.');
      } else {
        console.error('   ❌ Vite assets not found - build likely failed');
      }
    } else {
      console.error('   ❌ Assets directory not found - Vite build did not complete');
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
