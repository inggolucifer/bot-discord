import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import computeSpriteRect directly from TypeScript library
const { computeSpriteRect } = await import('../web-dashboard/src/lib/gridRect.ts');

// Load grid canon data
const canonPath = path.join(__dirname, '..', 'world-data', 'grid-canon-v10.json');
const canonData = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
const frames = canonData.frames || {};

// Load objectScatter via createRequire
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const objectScatter = require('../utils/objectScatter');

console.log('=== TEST RENDER RECT V10 (testRenderRect.mjs) ===');
console.log('Menguji presisi piksel computeSpriteRect terhadap 2.000 objek dunia nyata...');

const T = 54;
const toX = (wx) => wx * T;
const toY = (wy) => wy * T;

let testedCount = 0;
const targetCount = 2000;
let violations = {
  contentLeftMisaligned: 0,
  contentLeftPixelMisaligned: 0,
  contentBottomPixelMisaligned: 0,
  contentWidthMismatch: 0,
  missingCanon: 0
};

// Kumpulkan objek dari berbagai chunk
let cx = 60;
let cy = 70;
const maxChunks = 200;
let chunkProcessed = 0;

while (testedCount < targetCount && chunkProcessed < maxChunks) {
  const objs = objectScatter.getChunkObjects(cx, cy);
  chunkProcessed++;

  for (const obj of objs) {
    if (testedCount >= targetCount) break;

    const actualDefId = objectScatter.resolveDef ? objectScatter.resolveDef(obj.defId) : obj.defId;
    const g = frames[actualDefId] || frames[obj.defId];

    if (!g) {
      violations.missingCanon++;
      continue;
    }

    testedCount++;
    const rect = computeSpriteRect(g, obj.x, obj.y, T, toX, toY);

    // 1. contentLeft = toX(tx + (g.fw - g.vw)/2). Karena vw === fw (integer), (g.fw - g.vw)/2 = 0, jadi contentLeft = obj.x * 54
    const expectedContentLeft = obj.x * T;
    const actualContentLeft = rect.drawX + g.bbox.x0 * rect.dw;
    const actualContentBottom = rect.drawY + g.bbox.y1 * rect.dh;
    const actualContentWidth = (g.bbox.x1 - g.bbox.x0) * rect.dw;
    const expectedContentWidth = g.vw * T;

    // contentLeftPx % 54 === 0
    if (Math.abs(expectedContentLeft % T) > 0.001) {
      violations.contentLeftMisaligned++;
    }

    // (drawX + bbox.x0 * dw) % 54 ≈ 0 (±0.01)
    const leftRem = Math.abs(actualContentLeft % T);
    const leftDistToGrid = Math.min(leftRem, T - leftRem);
    if (leftDistToGrid > 0.01) {
      violations.contentLeftPixelMisaligned++;
    }

    // (drawY + bbox.y1 * dh) % 54 ≈ 0 (±0.01)
    const bottomRem = Math.abs(actualContentBottom % T);
    const bottomDistToGrid = Math.min(bottomRem, T - bottomRem);
    if (bottomDistToGrid > 0.01) {
      violations.contentBottomPixelMisaligned++;
    }

    // lebar konten = vw * 54 ± 0.5 px
    if (Math.abs(actualContentWidth - expectedContentWidth) > 0.5) {
      violations.contentWidthMismatch++;
    }
  }

  cx = (cx + 3) % 150;
  if (cx < 10) cy = (cy + 5) % 150;
}

console.log(`\nTotal Objek Diuji: ${testedCount} (dari ${chunkProcessed} chunk)`);
console.table([
  { Test: 'V-R1: contentLeftPx % 54 == 0', Violations: violations.contentLeftMisaligned, Target: '0' },
  { Test: 'V-R2: Content Left on Grid (±0.01px)', Violations: violations.contentLeftPixelMisaligned, Target: '0' },
  { Test: 'V-R3: Content Bottom on Grid (±0.01px)', Violations: violations.contentBottomPixelMisaligned, Target: '0' },
  { Test: 'V-R4: Content Width == vw * 54 (±0.5px)', Violations: violations.contentWidthMismatch, Target: '0' },
  { Test: 'V-R5: Missing Canon Entries', Violations: violations.missingCanon, Target: '0' }
]);

const totalViolations = Object.values(violations).reduce((a, b) => a + b, 0);

if (testedCount < targetCount) {
  console.error(`GAGAL: Hanya berhasil menguji ${testedCount} objek (target >= ${targetCount})`);
  process.exit(1);
}

if (totalViolations > 0) {
  console.error(`GAGAL: Terdeteksi ${totalViolations} pelanggaran rumus render!`);
  process.exit(1);
}

console.log('[PASS] computeSpriteRect 100% presisi dan sejajar grid sempurna!');
process.exit(0);
