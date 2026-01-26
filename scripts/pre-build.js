const fs = require('fs');
const path = require('path');

// Delete old index.html and old files before Vite builds to ensure clean build
const projectRoot = path.join(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const indexPath = path.join(publicDir, 'index.html');

console.log('🔧 Pre-build: Cleaning old files...');

// Always delete old app.js and style.css if they exist
const oldFiles = ['app.js', 'style.css'];
oldFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`   Deleting old ${file}...`);
    fs.unlinkSync(filePath);
  }
});

// Check and delete old index.html if it references old files
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('app.js') || indexContent.includes('style.css')) {
    console.log('   Found old index.html with app.js references');
    console.log('   Deleting it so Vite can create the correct React version...');
    fs.unlinkSync(indexPath);
    console.log('   ✅ Old index.html deleted');
  } else if (!indexContent.includes('root') && !indexContent.includes('React')) {
    // If it doesn't have React markers, it's probably old
    console.log('   index.html exists but doesn\'t look like React version');
    console.log('   Deleting to ensure Vite creates fresh one...');
    fs.unlinkSync(indexPath);
    console.log('   ✅ Old index.html deleted');
  } else {
    console.log('   ✅ index.html looks correct (React version)');
  }
} else {
  console.log('   No existing index.html - Vite will create it');
}

console.log('✅ Pre-build complete - ready for Vite build');
