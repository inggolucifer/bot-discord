/**
 * scripts/v13/densityDiagnosis.js
 * Diagnoses root causes of density drop (Finding F1)
 * Compares HEAD vs commit 8139c20 and breaks down discarded object stages.
 * Writes review/v13_density_diagnosis.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const headScatterPath = path.resolve(PROJECT_ROOT, 'utils/objectScatter.js');

// Load 8139c20 version of objectScatter
const v11ScatterCode = execSync('git show 8139c20:jianghu-bot/utils/objectScatter.js', {
  cwd: PROJECT_ROOT,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024
});

// Create isolated module for v11
const v11Path = path.resolve(PROJECT_ROOT, 'utils/temp_v11_scatter.js');
fs.writeFileSync(v11Path, v11ScatterCode, 'utf8');
const v11Scatter = require(v11Path);

// Instrument HEAD scatter to measure breakdown
const headScatterCode = fs.readFileSync(headScatterPath, 'utf8');

// Instrumented hook
const instrumentedCode = headScatterCode.replace(
  '// --- V12 P4: Strict Anti-Lattice Constraint & Dominance Enforcement ---',
  `
  global.__diagPreAntiLattice = objects.length;
  // --- V12 P4: Strict Anti-Lattice Constraint & Dominance Enforcement ---
  `
).replace(
  'unmarkFootprint(obj, occupiedGrid);\n      continue;',
  `
  unmarkFootprint(obj, occupiedGrid);
  global.__diagDominanceDropped = (global.__diagDominanceDropped || 0) + 1;
  continue;
  `
);

const instPath = path.resolve(PROJECT_ROOT, 'utils/temp_inst_scatter.js');
fs.writeFileSync(instPath, instrumentedCode, 'utf8');
const headScatter = require(instPath);

const CHUNKS = [
  // Plains
  { name: 'plains_1', region: 'central_plains', cx: 70, cy: 70 },
  { name: 'plains_2', region: 'central_plains', cx: 71, cy: 70 },
  { name: 'plains_3', region: 'central_plains', cx: 70, cy: 71 },
  // Utara
  { name: 'utara_1', region: 'northern_desolate', cx: 70, cy: 20 },
  { name: 'utara_2', region: 'northern_desolate', cx: 71, cy: 20 },
  { name: 'utara_3', region: 'northern_desolate', cx: 72, cy: 20 },
  // Thundersteppe
  { name: 'thunder_1', region: 'thundersteppe', cx: 40, cy: 40 },
  { name: 'thunder_2', region: 'thundersteppe', cx: 41, cy: 40 },
  { name: 'thunder_3', region: 'thundersteppe', cx: 42, cy: 40 },
  // Nine Springs
  { name: 'nine_1', region: 'nine_springs_delta', cx: 100, cy: 70 },
  { name: 'nine_2', region: 'nine_springs_delta', cx: 101, cy: 70 },
  { name: 'nine_3', region: 'nine_springs_delta', cx: 102, cy: 70 }
];

function runDiagnosis() {
  const comparisons = [];

  for (const c of CHUNKS) {
    global.__diagPreAntiLattice = 0;
    global.__diagDominanceDropped = 0;

    const v11Objs = v11Scatter.getChunkObjects(c.cx, c.cy);
    const headObjs = headScatter.getChunkObjects(c.cx, c.cy);
    const preAnti = global.__diagPreAntiLattice;
    const domDrop = global.__diagDominanceDropped;
    const antiDrop = preAnti - headObjs.length;

    comparisons.push({
      name: c.name,
      region: c.region,
      cx: c.cx,
      cy: c.cy,
      v11Count: v11Objs.length,
      headCount: headObjs.length,
      preAntiLattice: preAnti,
      droppedByDominance: domDrop,
      droppedByAntiLatticeShiftFail: antiDrop - domDrop,
      totalDroppedPostProcess: antiDrop
    });
  }

  // Cleanup temp files
  try { fs.unlinkSync(v11Path); } catch (e) {}
  try { fs.unlinkSync(instPath); } catch (e) {}

  // Format diagnosis report
  const mdLines = [
    '# Diagnosis Penurunan Kepadatan Spasial (V13 P1 / Temuan F1)',
    '',
    '> **Tujuan**: Mengidentifikasi penyebab pasti regresi kepadatan 8 dari 29 region (terutama Central Plains 28→7, Nine Springs 28→5) dari commit V11 (`8139c20`) ke HEAD (`a34b58e`).',
    '',
    '## 1. Tabel Perbandingan 12 Chunk (HEAD vs V11)',
    '',
    '| Chunk | Region | V11 (8139c20) | HEAD Akhir | Pra-AntiLattice | Dibuang Dominasi | Dibuang Shift Gagal | Total Dibuang Pasca-Proses |',
    '|---|---|:---:|:---:|:---:|:---:|:---:|:---:|'
  ];

  for (const row of comparisons) {
    mdLines.push(
      `| **${row.name}** (${row.cx},${row.cy}) | \`${row.region}\` | **${row.v11Count}** | **${row.headCount}** | ${row.preAntiLattice} | ${row.droppedByDominance} | ${row.droppedByAntiLatticeShiftFail} | **${row.totalDroppedPostProcess}** |`
    );
  }

  mdLines.push(
    '',
    '## 2. Temuan Kunci Akar Masalah (Root Cause Breakdown)',
    '',
    '1. **Penghapusan Destruktif pada Anti-Lattice Shift Fail (L2229)**:',
    '   - Saat objek terdeteksi memiliki x atau y yang sama dengan objek lain se-family (`xCount >= 2` atau `yCount >= 2`), objek langsung di-`unmarkFootprint`.',
    '   - Ketika 8 vektor pergeseran diagonal (radius 1-2) terhalang atau gagal lolos `canPlaceFootprint`, objek **TIDAK DIKEMBALIKAN** ke dalam array, melainkan **DIBUANG PERMANEN**.',
    '   - Batas `xCount < 2 && yCount < 2` dihitung pada level seluruh `family` (misal seluruh `tree` atau `nature`), bukan `defId`. Di chunk 32x32, pohon di (10, 2) dan pohon di (10, 30) dianggap kolinear dan dibuang.',
    '',
    '2. **Spiral Penyusutan Dominance Cap (L2204)**:',
    '   - `curCnt >= Math.floor(objects.length * 0.28)` dihitung menggunakan `objects.length` dari sisa objek di tahap pasca-proses.',
    '   - Pada chunk jarang dengan 15-20 objek, batas ini menjadi 4 per `defId`. Objek yang valid langsung dibuang, menurunkan jumlah objek lebih lanjut, sehingga budget menyusut secara spiral.',
    '',
    '3. **Tidak Adanya Mekanisme Refill**:',
    '   - V11 menargetkan budget 110-130 untuk wilderness. Namun di V12, tidak ada pass pengisian ulang (*refill*) ketika jumlah objek akhir < 85% budget.',
    '',
    '4. **Tindakan Perbaikan P1**:',
    '   - Ubah anti-lattice menjadi non-destruktif: Jika shift gagal, **pertahankan objek** (toleransi kolinearitas non-seragam <= 3).',
    '   - Batas dominasi dihitung dari `TARGET_BUDGET` (bukan sisa objek): `maxPerDef = Math.max(5, Math.floor(0.28 * TARGET_BUDGET))`.',
    '   - Terapkan pass **refill** deterministik di akhir `getChunkObjects` jika objek akhir < 85% budget.',
    '   - Pastikan pool aset aktif di 29 region memiliki minimal 12 defId aktif.'
  );

  const outReportPath = path.resolve(PROJECT_ROOT, 'review/v13_density_diagnosis.md');
  fs.writeFileSync(outReportPath, mdLines.join('\n'), 'utf8');
  console.log(`[densityDiagnosis] Diagnosis written to ${outReportPath}`);
  console.table(comparisons);
  return comparisons;
}

if (require.main === module) {
  runDiagnosis();
}

module.exports = { runDiagnosis };
