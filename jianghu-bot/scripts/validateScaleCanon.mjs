import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const scaleCanonPath = path.resolve(__dirname, '../world-data/scale-canon.json');
const anchorsPath = path.resolve(__dirname, '../world-data/anchors.json');
const reportOutPath = path.resolve(__dirname, '../review/scale_validation_report.json');

const scaleCanon = JSON.parse(fs.readFileSync(scaleCanonPath, 'utf8'));
const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));

console.log('=== VALIDATOR SKALA & GRID V7 (SCALE CANON GATE) ===\n');

const VALID_CLASSES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

let totalFrames = 0;
let distortedFrames = 0;
let unclassifiedFrames = 0;
let excessiveFootprints = 0;
const distortedList = [];

// 1. Ratio Distortion & Class Test
for (const [id, entry] of Object.entries(scaleCanon)) {
  totalFrames++;

  // Check class
  if (!VALID_CLASSES.includes(entry.class)) {
    unclassifiedFrames++;
  }

  // Check aspect ratio distortion
  const srcRatio = entry.srcH / entry.srcW;
  const visualRatio = entry.visualH / entry.visualW;
  const distortion = Math.abs((visualRatio / srcRatio) - 1.0);

  if (distortion > 0.03) {
    distortedFrames++;
    distortedList.push({ id, srcRatio, visualRatio, distortion });
  }

  // Check footprint vs visual: base collision must not exceed visual width
  if (entry.collision.w > entry.visualW + 0.5) {
    excessiveFootprints++;
  }

  // For XS, S, M: base collision should be <= 2x1 (or <= 2x2 for symmetric rocks)
  if (['XS', 'S', 'M'].includes(entry.class)) {
    if (entry.collision.w > 2 || entry.collision.h > 2) {
      excessiveFootprints++;
    }
  }
}

// 2. XL/XXL Building Entryway Clearance Test
const chunkStreamingEngine = require('../utils/chunkStreamingEngine');
let totalLargeBuildingsChecked = 0;
let blockedEntryways = 0;
const blockedList = [];

for (const anc of anchors) {
  if (anc.type === 'capital_city' || anc.type === 'major_city' || anc.type === 'sect' || (anc.footprintWidth && anc.footprintWidth >= 40)) {
    totalLargeBuildingsChecked++;
    // Check 2 tiles in front of south entrance: (anc.x, anc.y + 1) and (anc.x, anc.y + 2)
    const checkTiles = [
      { x: anc.x, y: anc.y + 1 },
      { x: anc.x, y: anc.y + 2 }
    ];

    for (const pt of checkTiles) {
      const cx = Math.floor(pt.x / 32);
      const cy = Math.floor(pt.y / 32);
      const lx = pt.x - cx * 32;
      const ly = pt.y - cy * 32;
      const isOccupied = chunkStreamingEngine.isChunkTileOccupied(cx, cy, lx, ly);
      if (isOccupied) {
        blockedEntryways++;
        blockedList.push({ anchorId: anc.id, name: anc.name, blockedTile: pt });
        break;
      }
    }
  }
}

const summary = {
  totalFrames,
  distortedFrames,
  unclassifiedFrames,
  excessiveFootprints,
  totalLargeBuildingsChecked,
  blockedEntryways,
  passRatioDistortion: distortedFrames === 0,
  passClassCoverage: unclassifiedFrames === 0,
  passFootprints: excessiveFootprints === 0,
  passEntryways: blockedEntryways === 0,
  allPassed: (distortedFrames === 0 && unclassifiedFrames === 0 && excessiveFootprints === 0 && blockedEntryways === 0)
};

fs.writeFileSync(reportOutPath, JSON.stringify({ summary, distortedList, blockedList }, null, 2), 'utf8');

console.log(`[TEST 1] Distorsi Rasio Gambar (>3%): ${distortedFrames} frame terdistorsi (Target: 0, Sebelumnya: 327) -> [${summary.passRatioDistortion ? 'PASS' : 'FAIL'}]`);
console.log(`[TEST 2] Klasifikasi Ukuran (XS-XXL): ${unclassifiedFrames} frame tanpa kelas (Target: 0) -> [${summary.passClassCoverage ? 'PASS' : 'FAIL'}]`);
console.log(`[TEST 3] Footprint Pangkal (XS-M <= 2x1/2x2): ${excessiveFootprints} frame berlebih (Target: 0) -> [${summary.passFootprints ? 'PASS' : 'FAIL'}]`);
console.log(`[TEST 4] Jalan Masuk Bangunan XL/XXL (Bebas 2 Tile): ${blockedEntryways} / ${totalLargeBuildingsChecked} terhalang -> [${summary.passEntryways ? 'PASS' : 'FAIL'}]`);

console.log('\n========================================');
console.log(`HASIL AKHIR GERBANG H1: ${summary.allPassed ? '100% LULUS (ALL PASS)' : 'GAGAL (FAIL)'}`);
console.log('========================================\n');

if (!summary.allPassed) {
  process.exit(1);
}
