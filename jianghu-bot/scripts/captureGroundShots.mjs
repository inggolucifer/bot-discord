/**
 * scripts/captureGroundShots.mjs
 * Gerbang Visual Prompt B6:
 * Captures 1280x720 viewport screenshots at 10 fixed locations,
 * computes visual variance metrics (unique colors, luminance std, lag-54 autocorrelation),
 * and verifies all 10 locations pass quality thresholds.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const chunkStreamingEngine = require('../utils/chunkStreamingEngine');

const outDir = path.resolve(__dirname, '../review/shots/v9_ground');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function ensureApiServer() {
  return new Promise((resolve) => {
    const testReq = http.request({ host: '127.0.0.1', port: 3001, path: '/api/health', method: 'GET', timeout: 800 }, () => {
      console.log('[API Server] API already running on port 3001');
      resolve(null);
    });
    testReq.on('error', () => {
      console.log('[API Server] Starting standalone Chunk Streaming API on port 3001...');
      const server = http.createServer((req, res) => {
        const origin = req.headers.origin || 'http://localhost:3000';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          return res.end();
        }

        if (req.url === '/api/auth/me') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ authenticated: false, user: null }));
        }

        if (req.method === 'POST' && req.url === '/api/world/chunks') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const chunks = data.chunks || [];
              const batch = chunkStreamingEngine.getStaticChunksBatch(chunks);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(batch));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'GET' && req.url.startsWith('/api/world/chunk/')) {
          const parts = req.url.split('/');
          const cx = parseInt(parts[parts.length - 2], 10);
          const cy = parseInt(parts[parts.length - 1], 10);
          const chunk = chunkStreamingEngine.getStaticChunk(cx, cy);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(chunk));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, status: 'online' }));
      });

      server.listen(3001, '127.0.0.1', () => {
        console.log('[API Server] Standalone Mock API listening on http://127.0.0.1:3001');
        resolve(server);
      });
    });
    testReq.end();
  });
}

const targets = [
  { name: 'xingcun_village', x: 2050, y: 2650 },
  { name: 'canghai', x: 3700, y: 2550 },
  { name: 'demon_gate', x: 2500, y: 800 },
  { name: 'azure_pass', x: 2600, y: 3340 },
  { name: 'desert_oasis', x: 820, y: 2220 },
  { name: 'frost_village', x: 2350, y: 4300 },
  { name: 'lava_spine', x: 1350, y: 950 },
  { name: 'lake_edge', x: 3100, y: 3100 },
  { name: 'thunder_sect', x: 2400, y: 4000 },
  { name: 'river_crossing', x: 2036, y: 2651 }
];

async function analyzeImage(imagePath) {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // (a) uniqueColors on 64x36 sample grid
  const GRID_X = 64;
  const GRID_Y = 36;
  const uniqueColorSet = new Set();
  for (let gy = 0; gy < GRID_Y; gy++) {
    const py = Math.floor(gy * (height / GRID_Y));
    for (let gx = 0; gx < GRID_X; gx++) {
      const px = Math.floor(gx * (width / GRID_X));
      const idx = (py * width + px) * channels;
      const rgb = (data[idx] << 16) | (data[idx + 1] << 8) | data[idx + 2];
      uniqueColorSet.add(rgb);
    }
  }
  const uniqueColors = uniqueColorSet.size;

  // (b) lumaStd across all pixels
  let lumaSum = 0;
  let lumaSqSum = 0;
  const totalPixels = width * height;
  const colLumaSum = new Float64Array(width);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = (rowOffset + x) * channels;
      const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      lumaSum += luma;
      lumaSqSum += luma * luma;
      colLumaSum[x] += luma;
    }
  }

  const meanLuma = lumaSum / totalPixels;
  const variance = (lumaSqSum / totalPixels) - (meanLuma * meanLuma);
  const lumaStd = Math.sqrt(Math.max(0, variance));

  // (c) boxAutocorr at lag 54px on column-average row
  const colAvg = new Float64Array(width);
  let colAvgMean = 0;
  for (let x = 0; x < width; x++) {
    colAvg[x] = colLumaSum[x] / height;
    colAvgMean += colAvg[x];
  }
  colAvgMean /= width;

  let colVar = 0;
  for (let x = 0; x < width; x++) {
    const diff = colAvg[x] - colAvgMean;
    colVar += diff * diff;
  }
  colVar /= width;

  const LAG = 54;
  let cov = 0;
  const lagSamples = width - LAG;
  for (let x = 0; x < lagSamples; x++) {
    cov += (colAvg[x] - colAvgMean) * (colAvg[x + LAG] - colAvgMean);
  }
  cov /= lagSamples;

  const boxAutocorr = colVar > 1e-6 ? Math.abs(cov / colVar) : 0;

  return { uniqueColors, lumaStd, boxAutocorr };
}

async function main() {
  console.log('=== AUDIT VISUAL TANAH V9 (captureGroundShots.mjs) ===\n');
  const apiServer = await ensureApiServer();

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const cachedPath = 'C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
    playwright = require(cachedPath);
  }

  console.log('[Chrome] Meluncurkan peramban Chromium...');
  const browser = await playwright.chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  // Warm up page and load ground textures
  console.log('[Setup] Memuat canvas dan groundTextures...');
  await page.goto('http://127.0.0.1:3000/world?debugCam=2050,2650,1.0', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    if (window.atlasLoader) await window.atlasLoader.preloadCoreAtlases();
    if (window.groundTextures) await window.groundTextures.load();
  });
  await page.waitForTimeout(1500);

  console.log('\n| Lokasi | Titik (x,y) | Unique Colors (>=400) | Luma Std (6-40) | Lag-54 Autocorr (<0.35) | Status |');
  console.log('|---|---|---|---|---|---|');

  let failedCount = 0;
  const results = [];

  for (const t of targets) {
    const url = `http://127.0.0.1:3000/world?debugCam=${t.x},${t.y},1.0`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForFunction(() => window.__chunksReady === true, { timeout: 10000 });
    } catch (_) {}

    await page.evaluate(async () => {
      if (window.groundTextures && !window.groundTextures.ready) {
        await window.groundTextures.load();
      }
    });

    await page.waitForTimeout(1200);

    const outPath = path.join(outDir, `${t.name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });

    const metrics = await analyzeImage(outPath);
    const passColors = metrics.uniqueColors >= 400;
    const passLuma = metrics.lumaStd >= 6.0 && metrics.lumaStd <= 40.0;
    const passAutocorr = metrics.boxAutocorr < 0.35;
    const isPass = passColors && passLuma && passAutocorr;

    if (!isPass) failedCount++;

    const statusStr = isPass ? 'PASS' : 'FAIL';
    console.log(
      `| ${t.name} | (${t.x},${t.y}) | ${metrics.uniqueColors} | ${metrics.lumaStd.toFixed(2)} | ${metrics.boxAutocorr.toFixed(3)} | ${statusStr} |`
    );

    results.push({ ...t, ...metrics, isPass });
  }

  await browser.close();
  if (apiServer) apiServer.close();

  console.log(`\nTotal Titik Diperiksa: ${targets.length}`);
  console.log(`Pelanggaran: ${failedCount}`);

  if (failedCount > 0) {
    console.error(`\n[FAIL] Terdapat ${failedCount} tangkapan layar yang tidak memenuhi ambang visual.`);
    process.exit(1);
  } else {
    console.log(`\n[GERBANG B6 PASS] Seluruh 10 titik visual tanah memenuhi kriteria:`);
    console.log(`- Unique colors >= 400`);
    console.log(`- Luma Std antara 6.0 s/d 40.0`);
    console.log(`- Autokorelasi lag-54 < 0.35 (tanpa pola kotak berulang)`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
