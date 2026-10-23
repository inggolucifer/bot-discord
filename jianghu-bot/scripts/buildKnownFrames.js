/**
 * scripts/buildKnownFrames.js
 * Scans all atlas JSON files in web-dashboard/public/assets/atlas/
 * (excluding atlas_index.json and index.json) and extracts all valid frame keys.
 * Writes output to config/known-frames.json.
 */

const fs = require('fs');
const path = require('path');

const ATLAS_DIR = path.resolve(__dirname, '../web-dashboard/public/assets/atlas');
const OUTPUT_FILE = path.resolve(__dirname, '../config/known-frames.json');

const frameSet = new Set();

if (fs.existsSync(ATLAS_DIR)) {
  const files = fs.readdirSync(ATLAS_DIR);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    if (file === 'atlas_index.json' || file === 'index.json') continue;

    const fullPath = path.join(ATLAS_DIR, file);
    try {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (content && content.frames) {
        if (Array.isArray(content.frames)) {
          for (const item of content.frames) {
            if (item.filename) frameSet.add(item.filename);
            else if (item.id) frameSet.add(item.id);
          }
        } else if (typeof content.frames === 'object') {
          for (const key of Object.keys(content.frames)) {
            frameSet.add(key);
          }
        }
      }
    } catch (err) {
      console.warn(`[buildKnownFrames] Failed to parse ${file}: ${err.message}`);
    }
  }
}

const framesArray = Array.from(frameSet).sort();
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(framesArray, null, 2), 'utf8');
console.log(`[buildKnownFrames] Successfully wrote ${framesArray.length} known frames to ${OUTPUT_FILE}`);
