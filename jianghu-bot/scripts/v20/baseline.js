const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const BOT_ROOT = path.resolve(__dirname, '../..');
const WORLD_DATA = path.join(BOT_ROOT, 'world-data');
const DOCS_V20 = path.join(BOT_ROOT, 'docs/v20');

// Ensure docs/v20 exists
if (!fs.existsSync(DOCS_V20)) {
  fs.mkdirSync(DOCS_V20, { recursive: true });
}

console.log('[BASELINE] Memulai pengukuran baseline V20...');

// 1. ANCHORS
const anchors = JSON.parse(fs.readFileSync(path.join(WORLD_DATA, 'anchors.json'), 'utf8'));
const anchorsByType = {};
for (const a of anchors) {
  anchorsByType[a.type] = (anchorsByType[a.type] || 0) + 1;
}
console.log(`[BASELINE] Total anchors: ${anchors.length}, per tipe:`, anchorsByType);

// 2. AUTHORED HOUSES & PROPS
const authored = JSON.parse(fs.readFileSync(path.join(WORLD_DATA, 'authored-props.json'), 'utf8'));
const authoredKinds = {};
const housesByAnchor = {};
let totalAuthoredHouses = 0;

for (const p of authored.props) {
  authoredKinds[p.kind] = (authoredKinds[p.kind] || 0) + 1;
  if (p.kind === 'house') {
    totalAuthoredHouses++;
    const aid = p.anchorId || 'unknown';
    if (!housesByAnchor[aid]) housesByAnchor[aid] = [];
    housesByAnchor[aid].push({ id: p.id, defId: p.defId, x: p.x, y: p.y });
  }
}
console.log(`[BASELINE] Authored props total: ${authored.props.length}, kinds:`, authoredKinds);
console.log(`[BASELINE] Authored houses total: ${totalAuthoredHouses}`);

// 3. SCALE CANON & CATEGORIZATION
const scaleCanon = JSON.parse(fs.readFileSync(path.join(BOT_ROOT, 'web-dashboard/src/config/scaleCanon.json'), 'utf8'));

function categorizeDefId(defId) {
  const canon = scaleCanon[defId];
  const cat = canon?.category || '';
  if (defId.startsWith('hut_') || defId.startsWith('village_house') || cat === 'building') return 'house';
  if (defId.startsWith('landmark_') || cat === 'landmark') return 'landmark';
  if (defId.startsWith('prop_') || cat === 'prop') return 'prop';
  if (cat === 'tree' || cat === 'bamboo' || cat === 'nature' || cat === 'rock' || cat === 'mountain' || cat === 'water_scene') return 'nature';
  return 'other';
}

// 4. OBJECTS PER ANCHOR IN EXCLUSION ZONE (FROM CHUNK STREAMING ENGINE)
const { getStaticChunk } = require('../../utils/chunkStreamingEngine.js');

const EXCLUSION_RADII = {
  hamlet: 6,
  village: 10,
  town: 14,
  major_city: 24,
  capital_city: 36,
  sect: 16,
  outpost: 8,
  port: 10,
  island: 10,
  secret_realm: 6,
  danger_zone: 8
};

console.log('[BASELINE] Menghitung objek per anchor dalam zona eksklusi...');
const objectsPerAnchor = [];
const chunkCache = new Map();

function getCachedChunk(cx, cy) {
  const key = `${cx}:${cy}`;
  if (!chunkCache.has(key)) {
    chunkCache.set(key, getStaticChunk(cx, cy));
  }
  return chunkCache.get(key);
}

for (const a of anchors) {
  const radius = EXCLUSION_RADII[a.type] || 10;
  const minX = a.x - radius;
  const maxX = a.x + a.spanWidth - 1 + radius;
  const minY = a.y - radius;
  const maxY = a.y + a.spanHeight - 1 + radius;

  const minCx = Math.max(0, Math.floor(minX / 32));
  const maxCx = Math.min(156, Math.floor(maxX / 32));
  const minCy = Math.max(0, Math.floor(minY / 32));
  const maxCy = Math.min(156, Math.floor(maxY / 32));

  const counts = { house: 0, prop: 0, landmark: 0, nature: 0, other: 0, total: 0 };
  const seenObj = new Set();

  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const chunk = getCachedChunk(cx, cy);
      if (!chunk || !chunk.scatter) continue;
      for (const obj of chunk.scatter) {
        if (obj.x >= minX && obj.x <= maxX && obj.y >= minY && obj.y <= maxY) {
          const ukey = `${obj.x},${obj.y},${obj.defId}`;
          if (!seenObj.has(ukey)) {
            seenObj.add(ukey);
            const cat = categorizeDefId(obj.defId);
            counts[cat] = (counts[cat] || 0) + 1;
            counts.total++;
          }
        }
      }
    }
  }

  objectsPerAnchor.push({
    id: a.id,
    name: a.name,
    type: a.type,
    x: a.x,
    y: a.y,
    spanWidth: a.spanWidth,
    spanHeight: a.spanHeight,
    exclusionRadius: radius,
    counts
  });
}

// 5. TRACKED FILES PER DIRECTORY
console.log('[BASELINE] Memindai file ter-track git...');
const trackedFilesRaw = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/);
const fileStats = {
  totalFiles: trackedFilesRaw.length,
  totalBytes: 0,
  byDirectory: {}
};

for (const f of trackedFilesRaw) {
  const fullPath = path.join(ROOT, f);
  let bytes = 0;
  try {
    bytes = fs.statSync(fullPath).size;
  } catch (_) {}
  fileStats.totalBytes += bytes;

  // Group by directory
  let dirKey = 'root';
  if (f.startsWith('jianghu-bot/review/')) dirKey = 'jianghu-bot/review';
  else if (f.startsWith('jianghu-bot/assets_picked/')) dirKey = 'jianghu-bot/assets_picked';
  else if (f.startsWith('jianghu-bot/scripts/')) {
    const m = f.match(/^jianghu-bot\/scripts\/([^/]+)/);
    dirKey = m ? `jianghu-bot/scripts/${m[1]}` : 'jianghu-bot/scripts';
  } else if (f.startsWith('jianghu-bot/web-dashboard/')) dirKey = 'jianghu-bot/web-dashboard';
  else if (f.startsWith('jianghu-bot/world-data/')) dirKey = 'jianghu-bot/world-data';
  else if (f.startsWith('jianghu-bot/')) dirKey = 'jianghu-bot/other';
  else if (f.startsWith('graphify-out/')) dirKey = 'graphify-out';
  else if (f.startsWith('v10_pack/')) dirKey = 'v10_pack';
  else if (f.startsWith('v9_extracted/')) dirKey = 'v9_extracted';

  if (!fileStats.byDirectory[dirKey]) {
    fileStats.byDirectory[dirKey] = { files: 0, bytes: 0 };
  }
  fileStats.byDirectory[dirKey].files++;
  fileStats.byDirectory[dirKey].bytes += bytes;
}

// 6. BENCHMARK GETSTATICCHUNK (200 DETERMINISTIC SAMPLES)
console.log('[BASELINE] Mengukur performa getStaticChunk (200 sampel)...');
const sampleChunks = [];
for (let i = 0; i < 200; i++) {
  // Deterministic LCG
  const cx = ((i * 37 + 13) % 150) + 3;
  const cy = ((i * 53 + 29) % 150) + 3;
  sampleChunks.push({ cx, cy });
}

const timings = [];
// Clear cache before benchmark
chunkCache.clear();
for (const { cx, cy } of sampleChunks) {
  const t0 = process.hrtime.bigint();
  getStaticChunk(cx, cy);
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  timings.push(ms);
}

timings.sort((a, b) => a - b);
const p50 = timings[Math.floor(timings.length * 0.5)];
const p95 = timings[Math.floor(timings.length * 0.95)];
const mean = timings.reduce((a, b) => a + b, 0) / timings.length;

console.log(`[BASELINE] Benchmark getStaticChunk p50=${p50.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, mean=${mean.toFixed(2)}ms`);

// 7. PRE-EXISTING TEST STATUS
const preExistingFailures = [
  {
    tool: 'syntaxCheckAll.js',
    status: 'failed',
    reason: 'scratch/test_cpf_time.js syntax error (untracked scratch file in .gitignore not skipped by syntaxCheckAll)',
    file: 'scratch/test_cpf_time.js'
  }
];

const baselineData = {
  createdAt: new Date().toISOString(),
  headCommit: 'd15a950c',
  branch: 'v20-map-rebuild',
  anchorsCount: anchors.length,
  anchorsByType,
  authoredPropsCount: authored.props.length,
  authoredKinds,
  totalAuthoredHouses,
  housesByAnchorCount: Object.keys(housesByAnchor).reduce((acc, k) => {
    acc[k] = housesByAnchor[k].length;
    return acc;
  }, {}),
  objectsPerAnchor,
  fileStats,
  chunkBenchmark: {
    sampleCount: timings.length,
    p50Ms: Number(p50.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    meanMs: Number(mean.toFixed(2))
  },
  preExistingFailures
};

fs.writeFileSync(path.join(DOCS_V20, 'baseline.json'), JSON.stringify(baselineData, null, 2), 'utf8');
console.log('[BASELINE] Berhasil menulis docs/v20/baseline.json!');
