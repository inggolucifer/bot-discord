/**
 * scripts/v11/auditTheme.js
 * Audits cross-theme placement across all 29 canonical regions & 833 chunks.
 * Verifies 0 cross-theme forbidden violations and >= 6 hero prop types per region.
 * Writes detailed report to review/v11_theme_matrix.md.
 */

const fs = require('fs');
const path = require('path');
const worldData = require('../../utils/worldData');
const { getTileAt } = require('../../utils/proceduralWorldEngine');
const { getRegionAt } = require('../../utils/worldRegionEngine');
const objectScatter = require('../../utils/objectScatter');
const themeForbidden = require('../../world-data/theme-forbidden-v11.json');

const REGIONS = worldData.getAllRegions();
const ANCHORS = worldData.getAnchors();

// 833 Canonical Chunks (same set as auditGridV10.js)
const CHUNK_SET = new Set();

// 1. 52 Anchor chunks
for (const a of ANCHORS) {
  const cx = Math.floor(a.x / 32);
  const cy = Math.floor(a.y / 32);
  CHUNK_SET.add(`${cx},${cy}`);
  // Also add 1-ring neighbors for anchors
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ncx = cx + dx;
      const ncy = cy + dy;
      if (ncx >= 0 && ncx < 156 && ncy >= 0 && ncy < 156) {
        CHUNK_SET.add(`${ncx},${ncy}`);
      }
    }
  }
}

// 2. Deterministic pseudo-random sample chunks across continent
let seed = 20261027;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

while (CHUNK_SET.size < 833) {
  const cx = Math.floor(rand() * 156);
  const cy = Math.floor(rand() * 156);
  CHUNK_SET.add(`${cx},${cy}`);
}

const CHUNKS = Array.from(CHUNK_SET).map(k => {
  const [cx, cy] = k.split(',').map(Number);
  return { cx, cy };
});

console.log(`=== AUDIT TEMA REGION & LARANGAN SILANG V11 (auditTheme.js) ===`);
console.log(`Auditing ${CHUNKS.length} chunks across 29 regions...\n`);

const violations = [];
const regionPropsMap = new Map();
for (const r of REGIONS) {
  regionPropsMap.set(r.id, new Set());
}

let totalObjectsAudited = 0;
let xueshanViolations = 0;

for (let i = 0; i < CHUNKS.length; i++) {
  const { cx, cy } = CHUNKS[i];
  const objs = objectScatter.getChunkObjects(cx, cy) || [];
  totalObjectsAudited += objs.length;

  for (const obj of objs) {
    const tile = getTileAt(obj.x, obj.y);
    const reg = (tile && tile.regionId) ? { id: tile.regionId } : getRegionAt(obj.x, obj.y);
    const regId = reg ? reg.id : 'unknown';

    if (regionPropsMap.has(regId)) {
      regionPropsMap.get(regId).add(obj.defId);
    }

    // Check forbidden violations
    const themeId = themeForbidden.regions[regId] || 'temperate';
    const themeData = themeForbidden.themes[themeId];
    if (themeData && Array.isArray(themeData.forbiddenPatterns)) {
      for (const pat of themeData.forbiddenPatterns) {
        const re = new RegExp(pat, 'i');
        if (re.test(obj.defId)) {
          const v = {
            chunk: `${cx},${cy}`,
            x: obj.x,
            y: obj.y,
            defId: obj.defId,
            regionId: regId,
            themeId,
            matchedPattern: pat
          };
          violations.push(v);

          if (regId === 'northern_desolate' || (obj.x >= 2300 && obj.x <= 2400 && obj.y >= 4250 && obj.y <= 4350)) {
            xueshanViolations++;
          }
        }
      }
    }
  }
}

// Check Xueshan Village specifically
const xueshanAnchor = ANCHORS.find(a => a.id === 'desa_xueshan') || { x: 2350, y: 4300 };
const xueshanChunkX = Math.floor(xueshanAnchor.x / 32);
const xueshanChunkY = Math.floor(xueshanAnchor.y / 32);
let xueshanCherryOrBamboo = 0;

for (let dy = -1; dy <= 1; dy++) {
  for (let dx = -1; dx <= 1; dx++) {
    const objs = objectScatter.getChunkObjects(xueshanChunkX + dx, xueshanChunkY + dy) || [];
    for (const o of objs) {
      if (/cherry|bamboo/i.test(o.defId)) {
        xueshanCherryOrBamboo++;
      }
    }
  }
}

console.log(`Total objek diinspeksi: ${totalObjectsAudited}`);
console.log(`Pelanggaran larangan silang: ${violations.length}`);
console.log(`Pelanggaran cherry/bamboo di Xueshan: ${xueshanCherryOrBamboo}`);

// Region props count summary
const regionSummary = [];
for (const r of REGIONS) {
  const set = regionPropsMap.get(r.id) || new Set();
  const count = set.size;
  const themeId = themeForbidden.regions[r.id] || 'temperate';
  const pass = count >= 6;
  regionSummary.push({
    id: r.id,
    name: r.name,
    theme: themeId,
    distinctProps: count,
    status: pass ? 'PASS' : 'WARN'
  });
}

// Generate review/v11_theme_matrix.md
const outLines = [
  '# REVIEW V11 — MATRIKS TEMA REGION & LARANGAN SILANG',
  `Dihasilkan secara otomatis oleh \`scripts/v11/auditTheme.js\` pada ${new Date().toISOString()}`,
  '',
  '## 1. Ringkasan Eksekutif Gerbang Gate P4',
  '',
  '| Gerbang | Target | Realisasi | Status |',
  '|---|---|---|---|',
  `| Total Chunk Diaudit | >= 833 | ${CHUNKS.length} | PASS |`,
  `| Total Objek Diinspeksi | - | ${totalObjectsAudited} | INFO |`,
  `| Pelanggaran Larangan Silang | 0 | ${violations.length} | ${violations.length === 0 ? 'PASS' : 'FAIL'} |`,
  `| Cherry/Bamboo di Desa Xueshan | 0 | ${xueshanCherryOrBamboo} | ${xueshanCherryOrBamboo === 0 ? 'PASS' : 'FAIL'} |`,
  '',
  '## 2. Matriks Tema 29 Region Kanonikal',
  '',
  '| Region ID | Nama Region | Tema | Distinct Props | Minimal 6 Props | Status |',
  '|---|---|---|---|---|---|'
];

for (const s of regionSummary) {
  outLines.push(`| \`${s.id}\` | ${s.name} | \`${s.theme}\` | ${s.distinctProps} | >= 6 | **${s.status}** |`);
}

outLines.push('');
outLines.push('## 3. Rincian Pelanggaran (Jika Ada)');
outLines.push('');
if (violations.length === 0) {
  outLines.push('**0 Pelanggaran Ditemukan.** Seluruh flora dan prop terisolasi secara sempurna sesuai tema bioma kanonikal.');
} else {
  outLines.push('| Koordinat | Chunk | Region | DefId | Pola Terlarang |');
  outLines.push('|---|---|---|---|---|');
  for (const v of violations.slice(0, 50)) {
    outLines.push(`| (${v.x}, ${v.y}) | \`${v.chunk}\` | \`${v.regionId}\` | \`${v.defId}\` | \`${v.matchedPattern}\` |`);
  }
}

const outPath = path.resolve(__dirname, '../../review/v11_theme_matrix.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
console.log(`\nLaporan matriks tema ditulis ke: review/v11_theme_matrix.md`);

if (violations.length > 0 || xueshanCherryOrBamboo > 0) {
  console.error(`\n[FAIL] Gate P4 Gagal: Ditemukan pelanggaran tema!`);
  process.exit(1);
} else {
  console.log(`\n[PASS] Gate P4 Lolos 100%! 0 pelanggaran tema silang.`);
  process.exit(0);
}
