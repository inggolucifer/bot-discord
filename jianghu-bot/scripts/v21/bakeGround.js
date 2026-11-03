const fs = require('fs');
const path = require('path');
const { initNodeGroundRenderer, bakeChunk } = require('./lib/nodeGroundRenderer');

const BOT_ROOT = path.resolve(__dirname, '../..');
const DASHBOARD_DIR = path.join(BOT_ROOT, 'web-dashboard');
const PUBLIC_DIR = path.join(DASHBOARD_DIR, 'public');
const BAKED_DIR = path.join(PUBLIC_DIR, 'baked');
const Z0_DIR = path.join(BAKED_DIR, 'z0');
const Z1_DIR = path.join(BAKED_DIR, 'z1');
const Z2_DIR = path.join(BAKED_DIR, 'z2');
const MANIFEST_PATH = path.join(BAKED_DIR, 'manifest.json');
const ANCHORS_PATH = path.join(BOT_ROOT, 'world-data/anchors.json');

// Parse CLI args
const args = process.argv.slice(2);
let isSample = args.includes('--sample');
let isForce = args.includes('--force');
let radius = 1;
const radiusIdx = args.indexOf('--radius');
if (radiusIdx !== -1 && args[radiusIdx + 1]) {
  radius = parseInt(args[radiusIdx + 1], 10) || 1;
}
let limit = Infinity;
const limitIdx = args.indexOf('--limit');
if (limitIdx !== -1 && args[limitIdx + 1]) {
  limit = parseInt(args[limitIdx + 1], 10) || Infinity;
}
let specificChunks = null;
const chunksIdx = args.indexOf('--chunks');
if (chunksIdx !== -1 && args[chunksIdx + 1]) {
  specificChunks = args[chunksIdx + 1].split(';').map(s => {
    const [cx, cy] = s.split(',').map(Number);
    return { cx, cy };
  });
}

// Ensure directories exist
for (const dir of [BAKED_DIR, Z0_DIR, Z1_DIR, Z2_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function runBake() {
  console.log('======================================================================');
  console.log(' JIANGHU V21 — GROUND TILES BAKE PIPELINE (scripts/v21/bakeGround.js)');
  console.log('======================================================================');

  await initNodeGroundRenderer();
  console.log('[BAKE] Renderer & textures terinisialisasi.');

  let chunksToBake = [];

  if (specificChunks) {
    chunksToBake = specificChunks;
    console.log(`[BAKE] Memproses ${chunksToBake.length} chunk spesifik dari argumen...`);
  } else if (isSample) {
    // 12 chunk deterministik untuk pengujian cepat
    const sampleCoords = [
      { cx: 84, cy: 87 }, // Tianjing
      { cx: 64, cy: 82 }, // Xingcun
      { cx: 75, cy: 76 }, // Luoyang Kecil
      { cx: 92, cy: 81 }, // Fengyang
      { cx: 96, cy: 89 }, // Tiedao
      { cx: 122, cy: 84 }, // Donghai Port
      { cx: 25, cy: 69 },  // Desert Oasis
      { cx: 66, cy: 130 }, // Tundra Snow
      { cx: 50, cy: 50 },
      { cx: 70, cy: 70 },
      { cx: 80, cy: 85 },
      { cx: 90, cy: 95 }
    ];
    chunksToBake = sampleCoords;
    console.log(`[BAKE] Mode --sample: Memproses ${chunksToBake.length} chunk sampel...`);
  } else {
    // Core mode: 52 anchor pemukiman dengan radius R
    if (!fs.existsSync(ANCHORS_PATH)) {
      throw new Error(`Anchors file tidak ditemukan: ${ANCHORS_PATH}`);
    }
    const anchors = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));
    const chunkSet = new Map();

    for (const anc of anchors) {
      const baseCx = Math.floor(anc.x / 32);
      const baseCy = Math.floor(anc.y / 32);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const cx = baseCx + dx;
          const cy = baseCy + dy;
          if (cx >= 0 && cx <= 156 && cy >= 0 && cy <= 156) {
            const key = `${cx}_${cy}`;
            if (!chunkSet.has(key)) {
              chunkSet.set(key, { cx, cy, anchor: anc.id });
            }
          }
        }
      }
    }
    chunksToBake = Array.from(chunkSet.values());
    console.log(`[BAKE] Mode --core: Ditemukan ${chunksToBake.length} chunk unik di sekitar 52 anchor (radius ${radius})...`);
  }

  if (limit < chunksToBake.length) {
    chunksToBake = chunksToBake.slice(0, limit);
    console.log(`[BAKE] Dibatasi menjadi ${limit} chunk sesuai argumen --limit.`);
  }

  // Load existing manifest if any
  let manifest = {
    version: 'v21.1',
    rendererVersion: 'groundRenderer_v21',
    generatedAt: new Date().toISOString(),
    totalChunks: 0,
    chunks: {}
  };
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (_) {}
  }

  const startTime = Date.now();
  let bakedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < chunksToBake.length; i++) {
    const { cx, cy } = chunksToBake[i];
    const key = `${cx}_${cy}`;
    const z0Path = path.join(Z0_DIR, `${key}.webp`);
    const z1Path = path.join(Z1_DIR, `${key}.webp`);
    const z2Path = path.join(Z2_DIR, `${key}.webp`);

    if (!isForce && manifest.chunks[key] && fs.existsSync(z0Path) && fs.existsSync(z1Path) && fs.existsSync(z2Path)) {
      skippedCount++;
      continue;
    }

    const t0 = Date.now();
    const result = bakeChunk(cx, cy);

    fs.writeFileSync(z0Path, result.z0Buffer);
    fs.writeFileSync(z1Path, result.z1Buffer);
    fs.writeFileSync(z2Path, result.z2Buffer);

    manifest.chunks[key] = {
      cx,
      cy,
      z0: { file: `z0/${key}.webp`, size: result.z0Buffer.length, sha256: result.sha256_z0 },
      z1: { file: `z1/${key}.webp`, size: result.z1Buffer.length, sha256: result.sha256_z1 },
      z2: { file: `z2/${key}.webp`, size: result.z2Buffer.length, sha256: result.sha256_z2 },
      updatedAt: new Date().toISOString()
    };

    bakedCount++;
    const tElapsed = Date.now() - t0;
    if (bakedCount % 10 === 0 || bakedCount === chunksToBake.length || isSample) {
      console.log(`[BAKE ${i + 1}/${chunksToBake.length}] Chunk (${cx}, ${cy}) selesai (${tElapsed}ms). Total baked: ${bakedCount}`);
    }
  }

  manifest.totalChunks = Object.keys(manifest.chunks).length;
  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('======================================================================');
  console.log(`[BAKE SELESAI] Total: ${bakedCount} baked, ${skippedCount} skipped, waktu: ${totalTime}s.`);
  console.log(`[BAKE] Manifest tersimpan di: ${MANIFEST_PATH} (${manifest.totalChunks} entri chunk).`);
  console.log('======================================================================');
}

runBake().catch(err => {
  console.error('[BAKE FATAL ERROR]:', err);
  process.exit(1);
});
