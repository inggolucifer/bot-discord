const fs = require('fs');
const path = require('path');

const atlasIndex = JSON.parse(fs.readFileSync(path.join(__dirname, '../web-dashboard/public/assets/atlas/atlas_index.json'), 'utf8'));
const scaleCanon = JSON.parse(fs.readFileSync(path.join(__dirname, '../web-dashboard/src/config/scaleCanon.json'), 'utf8'));

// Read objectScatter.js
const scatterContent = fs.readFileSync(path.join(__dirname, '../utils/objectScatter.js'), 'utf8');

// Regex for string literals
const regex = /['"]([a-zA-Z0-9_]+)['"]/g;
const matches = [];
let match;
while ((match = regex.exec(scatterContent)) !== null) {
  matches.push(match[1]);
}

const spriteIds = new Set(matches.filter(id => 
  id.startsWith('tree_') || 
  id.startsWith('nature_') || 
  id.startsWith('plant_') || 
  id.startsWith('flora_') || 
  id.startsWith('bamboo') || 
  id.startsWith('building_') || 
  id.startsWith('prop_') ||
  id.startsWith('resource_') ||
  id.startsWith('rock_')
));

console.log('Total candidate sprite IDs in objectScatter.js:', spriteIds.size);

const missingFromAtlas = [];
const missingFromScale = [];
const ok = [];

for (const id of spriteIds) {
  const inAtlas = !!(atlasIndex.frames && atlasIndex.frames[id]);
  const inScale = !!scaleCanon[id];
  if (!inAtlas) missingFromAtlas.push(id);
  if (!inScale) missingFromScale.push(id);
  if (inAtlas && inScale) ok.push(id);
}

console.log('OK in both:', ok.length);
console.log('Missing from atlas_index.json (' + missingFromAtlas.length + '):', missingFromAtlas);
console.log('Missing from scaleCanon.json (' + missingFromScale.length + '):', missingFromScale);

// Also check all frames in atlas_index that start with tree_
const atlasTreeFrames = Object.keys(atlasIndex.frames || {}).filter(k => k.startsWith('tree_'));
console.log('\nAtlas frames starting with tree_ (' + atlasTreeFrames.length + '):', atlasTreeFrames.slice(0, 20));

// Check frames starting with nature_
const atlasNatureFrames = Object.keys(atlasIndex.frames || {}).filter(k => k.startsWith('nature_'));
console.log('Atlas frames starting with nature_ (' + atlasNatureFrames.length + '):', atlasNatureFrames.slice(0, 20));

// Check frames starting with bamboo
const atlasBambooFrames = Object.keys(atlasIndex.frames || {}).filter(k => k.startsWith('bamboo'));
console.log('Atlas frames starting with bamboo (' + atlasBambooFrames.length + '):', atlasBambooFrames);
