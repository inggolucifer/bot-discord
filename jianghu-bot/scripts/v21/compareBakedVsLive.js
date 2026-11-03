const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('../../node_modules/@napi-rs/canvas');
const { initNodeGroundRenderer, renderChunk, bakeChunk } = require('./lib/nodeGroundRenderer');

const BOT_ROOT = path.resolve(__dirname, '../..');
const BAKED_DIR = path.join(BOT_ROOT, 'web-dashboard/public/baked');
const Z0_DIR = path.join(BAKED_DIR, 'z0');
const REVIEW_DIR = path.join(BOT_ROOT, 'review');
const REPORT_PATH = path.join(REVIEW_DIR, 'v21_compare_baked.json');

if (!fs.existsSync(REVIEW_DIR)) {
  fs.mkdirSync(REVIEW_DIR, { recursive: true });
}

// PRNG Linear Congruential Generator (LCG) dengan seed 1618
function createPrng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

async function runCompare() {
  console.log('======================================================================');
  console.log(' JIANGHU V21 — COMPARATOR PIKSEL BAKED VS LIVE (F1 GATE VERIFICATION)');
  console.log(' Seed: 1618 | Ambang: Rata-rata |ΔRGB| <= 1.0 | Pct |Δ| > 12 <= 0.2%');
  console.log('======================================================================');

  await initNodeGroundRenderer();
  console.log('[COMPARE] Renderer terinisialisasi.');

  const prng = createPrng(1618);
  const sampleChunks = [];
  const TOTAL_SAMPLES = 12;

  // Hasilkan 12 koordinat chunk acak deterministik
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const cx = Math.floor(prng() * 120) + 10;
    const cy = Math.floor(prng() * 120) + 10;
    sampleChunks.push({ cx, cy });
  }

  const results = [];
  let grandTotalDelta = 0;
  let grandTotalGt12 = 0;
  const pixelsPerChunk = 1728 * 1728;
  const grandTotalPixels = pixelsPerChunk * TOTAL_SAMPLES;

  for (let sIdx = 0; sIdx < sampleChunks.length; sIdx++) {
    const { cx, cy } = sampleChunks[sIdx];
    const key = `${cx}_${cy}`;
    const z0Path = path.join(Z0_DIR, `${key}.webp`);

    // 1. Render live langsung
    const liveCanvas = renderChunk(cx, cy, 54);
    const liveCtx = liveCanvas.getContext('2d');
    const liveData = liveCtx.getImageData(0, 0, 1728, 1728).data;

    // 2. Pastikan file baked ada (bila belum, bake on the fly)
    if (!fs.existsSync(z0Path)) {
      const baked = bakeChunk(cx, cy);
      if (!fs.existsSync(Z0_DIR)) fs.mkdirSync(Z0_DIR, { recursive: true });
      fs.writeFileSync(z0Path, baked.z0Buffer);
    }

    // 3. Muat file baked WebP
    const bakedBuf = fs.readFileSync(z0Path);
    const bakedImg = await loadImage(bakedBuf);
    const bakedCanvas = createCanvas(1728, 1728);
    const bakedCtx = bakedCanvas.getContext('2d');
    bakedCtx.drawImage(bakedImg, 0, 0);
    const bakedData = bakedCtx.getImageData(0, 0, 1728, 1728).data;

    // 4. Bandingkan piksel demi piksel
    let chunkTotalDelta = 0;
    let chunkGt12 = 0;

    for (let i = 0; i < liveData.length; i += 4) {
      const dr = Math.abs(liveData[i] - bakedData[i]);
      const dg = Math.abs(liveData[i + 1] - bakedData[i + 1]);
      const db = Math.abs(liveData[i + 2] - bakedData[i + 2]);
      const meanDelta = (dr + dg + db) / 3;

      chunkTotalDelta += meanDelta;
      if (Math.max(dr, dg, db) > 12) {
        chunkGt12++;
      }
    }

    const chunkAvgDelta = chunkTotalDelta / pixelsPerChunk;
    const chunkPctGt12 = (chunkGt12 / pixelsPerChunk) * 100;

    grandTotalDelta += chunkTotalDelta;
    grandTotalGt12 += chunkGt12;

    const pass = chunkAvgDelta <= 1.0 && chunkPctGt12 <= 0.2;
    results.push({
      sample: sIdx + 1,
      cx,
      cy,
      avgDeltaRGB: Number(chunkAvgDelta.toFixed(4)),
      pctGt12: Number(chunkPctGt12.toFixed(4)),
      status: pass ? 'PASS' : 'FAIL'
    });

    console.log(`[SAMPLE ${sIdx + 1}/${TOTAL_SAMPLES}] Chunk (${cx}, ${cy}) -> Avg |ΔRGB|: ${chunkAvgDelta.toFixed(4)}, |Δ| > 12: ${chunkPctGt12.toFixed(4)}% [${pass ? 'PASS' : 'FAIL'}]`);
  }

  const overallAvgDelta = grandTotalDelta / grandTotalPixels;
  const overallPctGt12 = (grandTotalGt12 / grandTotalPixels) * 100;
  const overallPass = overallAvgDelta <= 1.0 && overallPctGt12 <= 0.2;

  const summary = {
    seed: 1618,
    sampleCount: TOTAL_SAMPLES,
    pixelsPerSample: pixelsPerChunk,
    thresholds: {
      maxAvgDeltaRGB: 1.0,
      maxPctGt12: 0.2
    },
    metrics: {
      overallAvgDeltaRGB: Number(overallAvgDelta.toFixed(4)),
      overallPctGt12: Number(overallPctGt12.toFixed(4)),
      status: overallPass ? 'PASS' : 'FAIL'
    },
    samples: results,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), 'utf8');

  console.log('======================================================================');
  console.log(' HASIL AKHIR COMPARATOR F1:');
  console.log(` - Overall Avg |ΔRGB| : ${overallAvgDelta.toFixed(4)} (Batas: <= 1.0) -> ${overallAvgDelta <= 1.0 ? 'PASS' : 'FAIL'}`);
  console.log(` - Overall |Δ| > 12   : ${overallPctGt12.toFixed(4)}% (Batas: <= 0.2%) -> ${overallPctGt12 <= 0.2 ? 'PASS' : 'FAIL'}`);
  console.log(` - Status Keseluruhan : ${overallPass ? 'LULUS (PASS)' : 'GAGAL (FAIL)'}`);
  console.log(` - Laporan tersimpan  : ${REPORT_PATH}`);
  console.log('======================================================================');

  if (!overallPass) {
    process.exit(1);
  }
}

runCompare().catch(err => {
  console.error('[COMPARE ERROR]:', err);
  process.exit(1);
});
