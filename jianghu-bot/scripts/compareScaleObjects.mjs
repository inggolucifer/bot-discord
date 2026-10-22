import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const canon = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../world-data/scale-canon.json'), 'utf8'));
const procFile = fs.readFileSync(path.resolve(__dirname, '../web-dashboard/src/lib/proceduralObjects.ts'), 'utf8');

// Match each object definition key
const regex = /(\w+):\s*\{\s*id:\s*['"]([^'"]+)['"],\s*name:\s*['"][^'"]+['"],\s*(?:px:\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+)\s*\},\s*footprint:\s*\{\s*cw:\s*(\d+),\s*ch:\s*(\d+)\s*\}|footprint:\s*\{\s*cw:\s*(\d+),\s*ch:\s*(\d+)\s*\}[\s\S]*?px:\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+)\s*\})/g;

// Or simpler: parse each block
const lines = procFile.split('\n');
const objects = [];
let current = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const idMatch = line.match(/^\s*(\w+):\s*\{\s*$/) || line.match(/^\s*id:\s*['"]([^'"]+)['"]/);
  if (line.match(/^\s*id:\s*['"]([^'"]+)['"]/)) {
    const id = line.match(/^\s*id:\s*['"]([^'"]+)['"]/)[1];
    current = { id, startLine: i };
    objects.push(current);
  }
  if (current) {
    const cwMatch = line.match(/cw:\s*(\d+)/);
    const chMatch = line.match(/ch:\s*(\d+)/);
    const pxMatch = line.match(/px:\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+)\s*\}/);
    if (cwMatch) current.cw = parseInt(cwMatch[1]);
    if (chMatch) current.ch = parseInt(chMatch[1]);
    if (pxMatch) {
      current.pw = parseInt(pxMatch[1]);
      current.ph = parseInt(pxMatch[2]);
    }
  }
}

console.log(`Found ${objects.length} objects in proceduralObjects.ts`);

const oneGridDiscrepancies = [];
for (const obj of objects) {
  const c = canon[obj.id];
  if (c) {
    if (c.visualW <= 1.25 && (obj.cw > 1 || obj.ch > 1 || obj.pw > 200)) {
      oneGridDiscrepancies.push({
        id: obj.id,
        proc: { cw: obj.cw, ch: obj.ch, pw: obj.pw, ph: obj.ph },
        canon: { visualW: c.visualW, visualH: c.visualH, category: c.category, sizeClass: c.sizeClass }
      });
    }
  }
}

console.log(`Found ${oneGridDiscrepancies.length} objects where canon is 1-grid (visualW <= 1.25) but proceduralObjects has cw/ch > 1 or px > 200:`);
console.log(JSON.stringify(oneGridDiscrepancies, null, 2));
