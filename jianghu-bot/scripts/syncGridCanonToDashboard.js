'use strict';
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'world-data', 'grid-canon-v10.json');
const destDir = path.join(__dirname, '..', 'web-dashboard', 'src', 'config');
const dest = path.join(destDir, 'gridCanon.json');

if (!fs.existsSync(src)) {
  console.error('[syncGridCanonToDashboard] Error: Source file does not exist:', src);
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
const data = JSON.parse(fs.readFileSync(dest, 'utf8'));
const frameCount = Object.keys(data.frames || {}).length;
console.log(`[syncGridCanonToDashboard] Successfully synced ${frameCount} grid canon frames to ${dest}`);
