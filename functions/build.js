/**
 * Simple build: copy .js files from src/ to lib/ so Node resolves them.
 * Cloud Functions expects main in lib/index.js.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const libDir = path.join(__dirname, 'lib');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (name.endsWith('.js')) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(libDir)) {
  fs.rmSync(libDir, { recursive: true });
}
copyRecursive(srcDir, libDir);
console.log('Built functions -> lib/');
