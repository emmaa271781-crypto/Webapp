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

// Check if index.html still references old files and fix it
const indexPath = path.join(publicDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('app.js') || indexContent.includes('style.css')) {
    console.error('❌ ERROR: index.html still references old app.js or style.css!');
    console.error('   The old public/index.html was not replaced by Vite build.');
    console.error('   Attempting to replace with React version from src/index.html...');
    
    const srcIndexPath = path.join(projectRoot, 'src', 'index.html');
    if (fs.existsSync(srcIndexPath)) {
      const srcIndexContent = fs.readFileSync(srcIndexPath, 'utf8');
      // Vite will have processed this, so we need to check if assets were built
      const assetsDir = path.join(publicDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        const assetFiles = fs.readdirSync(assetsDir);
        const jsFile = assetFiles.find(f => f.endsWith('.js'));
        const cssFile = assetFiles.find(f => f.endsWith('.css'));
        
        if (jsFile && cssFile) {
          // Build the correct index.html with Vite-processed assets
          const correctIndex = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Classroom CS - Modern Chat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/assets/${cssFile}" />
  </head>
  <body>
    <div id="root"></div>
    <script src="https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js"></script>
    <script type="module" src="/assets/${jsFile}"></script>
  </body>
</html>`;
          fs.writeFileSync(indexPath, correctIndex);
          console.log('✅ Fixed index.html with correct React references');
        } else {
          console.error('   ⚠️  Assets not found - build may have failed');
        }
      } else {
        console.error('   ⚠️  Assets directory not found - build may have failed');
      }
    } else {
      console.error('   ❌ src/index.html not found!');
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
