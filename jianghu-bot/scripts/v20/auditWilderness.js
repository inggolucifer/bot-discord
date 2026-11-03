#!/usr/bin/env node
/**
 * scripts/v20/auditWilderness.js
 * Verifikasi Otoritatif Gerbang Kualitas P7 (G7)
 * - Standalone homes count & spacing
 * - Ruins count & spacing
 * - Distance to settlement exclusion zones >= 6 tiles
 * - Generate docs/v20/standalone-homes-sample.md with ASCII maps
 */

const fs = require('fs');
const path = require('path');
const anchors = require('../../world-data/anchors.json');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const objectScatter = require('../../utils/objectScatter');
const standaloneHomes = require('../../world-data/standalone-homes-v20.json');
const ruins = require('../../world-data/ruins-v20.json');

console.log('='.repeat(70));
console.log(' AUDIT WILDERNESS HOMES & RUINS V20 (P7 GATES)');
console.log('='.repeat(70));

const errors = [];

// 1. Total counts
console.log(`Standalone homes count: ${standaloneHomes.length} (target: 60-120)`);
if (standaloneHomes.length < 60 || standaloneHomes.length > 120) {
  errors.push(`Standalone homes count ${standaloneHomes.length} out of range [60, 120]`);
}

console.log(`Wilderness ruins count: ${ruins.length} (target: 40-80)`);
if (ruins.length < 40 || ruins.length > 80) {
  errors.push(`Ruins count ${ruins.length} out of range [40, 80]`);
}

// 2. Exclusion distance check (>= 6 tiles margin)
function getMinDistToExclusion(x, y) {
  let minMargin = Infinity;
  for (const a of anchors) {
    const rad = (a.v20 && a.v20.exclusionRadius) || 10;
    const minX = a.x - rad;
    const maxX = a.x + a.spanWidth - 1 + rad;
    const minY = a.y - rad;
    const maxY = a.y + a.spanHeight - 1 + rad;

    let dx = 0;
    if (x < minX) dx = minX - x;
    else if (x > maxX) dx = x - maxX;

    let dy = 0;
    if (y < minY) dy = minY - y;
    else if (y > maxY) dy = y - maxY;

    const margin = Math.max(dx, dy);
    if (margin < minMargin) minMargin = margin;
  }
  return minMargin;
}

let homesNearExclusion = 0;
for (const h of standaloneHomes) {
  const m = getMinDistToExclusion(h.x, h.y);
  if (m < 6) {
    homesNearExclusion++;
    errors.push(`Home ${h.id} [${h.x}, ${h.y}] is too close to exclusion zone (margin: ${m} < 6)`);
  }
}
console.log(`Homes too close to exclusion zones (< 6 tiles): ${homesNearExclusion}`);

let ruinsNearExclusion = 0;
for (const r of ruins) {
  const m = getMinDistToExclusion(r.x, r.y);
  if (m < 6) {
    ruinsNearExclusion++;
    errors.push(`Ruin ${r.id} [${r.x}, ${r.y}] is too close to exclusion zone (margin: ${m} < 6)`);
  }
}
console.log(`Ruins too close to exclusion zones (< 6 tiles): ${ruinsNearExclusion}`);

// 3. Spacing between homes (>= 30 tiles Chebyshev)
let homesTooClose = 0;
for (let i = 0; i < standaloneHomes.length; i++) {
  for (let j = i + 1; j < standaloneHomes.length; j++) {
    const h1 = standaloneHomes[i];
    const h2 = standaloneHomes[j];
    const dist = Math.max(Math.abs(h1.x - h2.x), Math.abs(h1.y - h2.y));
    if (dist < 30) {
      homesTooClose++;
      errors.push(`Homes ${h1.id} and ${h2.id} too close: dist ${dist} < 30`);
    }
  }
}
console.log(`Home pairs too close (< 30 tiles): ${homesTooClose}`);

// 4. Spacing between ruins (>= 25 tiles Chebyshev)
let ruinsTooClose = 0;
for (let i = 0; i < ruins.length; i++) {
  for (let j = i + 1; j < ruins.length; j++) {
    const r1 = ruins[i];
    const r2 = ruins[j];
    const dist = Math.max(Math.abs(r1.x - r2.x), Math.abs(r1.y - r2.y));
    if (dist < 25) {
      ruinsTooClose++;
      errors.push(`Ruins ${r1.id} and ${r2.id} too close: dist ${dist} < 25`);
    }
  }
}
console.log(`Ruin pairs too close (< 25 tiles): ${ruinsTooClose}`);

// 5. Generate docs/v20/standalone-homes-sample.md with 5 samples & ASCII maps
const sampleIndices = [0, 15, 35, 55, 75];
let sampleMd = `# Sampel Rumah Menyendiri di Alam Liar (V20)

Dokumen ini memuat sampel 5 rumah NPC menyendiri di berbagai biome alam liar Jianghu beserta visualisasi tata letak ASCII di sekitarnya.

`;

for (const idx of sampleIndices) {
  const home = standaloneHomes[idx];
  if (!home) continue;

  const radius = 6;
  const minX = home.x - radius;
  const maxX = home.x + radius;
  const minY = home.y - radius;
  const maxY = home.y + radius;

  let ascii = '';
  for (let y = minY; y <= maxY; y++) {
    let row = `${String(y).padStart(5, ' ')} | `;
    for (let x = minX; x <= maxX; x++) {
      if (x === home.x && y === home.y) {
        row += 'H'; // Home
      } else {
        const tile = proceduralWorldEngine.getTileAt(x, y);
        const tt = tile?.terrainType || '';
        if (tile?.isSolid) row += '^';
        else if (tt.includes('road')) row += '#';
        else if (tt.includes('water')) row += '~';
        else row += '.';
      }
    }
    ascii += row + '\n';
  }

  sampleMd += `## ${idx + 1}. ${home.houseName} (${home.id})
- **Koordinat**: [${home.x}, ${home.y}]
- **Penghuni**: ${home.occupantName} (${home.profession})
- **DefId**: \`${home.defId}\`
- **Region**: \`${home.regionSlug}\`
- **Dialog**: *"${home.dialog}"*

\`\`\`
${ascii}\`\`\`
*Legenda: [H] Rumah Menyendiri, [.] Tanah Terbuka, [^] Bukit/Tebing, [#] Jalan Setapak, [~] Air*

---
`;
}

const samplePath = path.resolve(__dirname, '../../docs/v20/standalone-homes-sample.md');
fs.writeFileSync(samplePath, sampleMd, 'utf8');
console.log(`Generated docs/v20/standalone-homes-sample.md with 5 samples.`);

console.log('='.repeat(70));
if (errors.length === 0) {
  console.log('🎉 ALL P7 AUDIT GATES PASSED (0 ERRORS)!');
  process.exit(0);
} else {
  console.error(`💥 P7 AUDIT FAILED with ${errors.length} errors:`);
  errors.slice(0, 5).forEach(e => console.error('  -', e));
  process.exit(1);
}
