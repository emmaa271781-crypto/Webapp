const fs = require('fs');
const path = require('path');

// Delete old index.html before Vite builds to ensure it gets replaced
const projectRoot = path.join(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const indexPath = path.join(publicDir, 'index.html');

console.log('🔧 Pre-build: Checking for old index.html...');

if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('app.js') || indexContent.includes('style.css')) {
    console.log('   Found old index.html with app.js references');
    console.log('   Deleting it so Vite can create the correct React version...');
    fs.unlinkSync(indexPath);
    console.log('   ✅ Old index.html deleted');
  } else {
    console.log('   ✅ index.html looks correct (React version)');
  }
} else {
  console.log('   No existing index.html - Vite will create it');
}

console.log('✅ Pre-build complete');
