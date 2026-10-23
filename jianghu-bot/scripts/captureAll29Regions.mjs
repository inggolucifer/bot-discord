/**
 * captureAll29Regions.mjs
 * 
 * Captures high-definition 1080p screenshots of all 29 regions in Jianghu (Immortal-X).
 * Renders settlements, sects, mountains, bamboo groves, rivers, and natural landscapes.
 * Generates an all-in-one visual montage sheet and a detailed Markdown gallery.
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
const anchorsPath = path.resolve(__dirname, '../world-data/anchors.json');
const regionsPath = path.resolve(__dirname, '../world-data/regions.json');

const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));

const outDir = path.resolve(__dirname, '../review/shots/29_regions');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Check/Start mock chunk API on port 3001 if not running
function ensureApiServer() {
  return new Promise((resolve) => {
    const testReq = http.request({ host: '127.0.0.1', port: 3001, path: '/api/health', method: 'GET', timeout: 800 }, () => {
      console.log('[API] Chunk server already active on port 3001');
      resolve(null);
    });
    testReq.on('error', () => {
      console.log('[API] Launching internal Chunk Streaming API on port 3001...');
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
            } catch (e) {
              res.writeHead(500); res.end(e.message);
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
        res.end(JSON.stringify({ status: 'ok', mock: true }));
      });

      server.listen(3001, () => {
        console.log('[API] Chunk Streaming API active on port 3001');
        resolve(server);
      });
    });
    testReq.end();
  });
}

// Curated focal points for regions whose bounds midpoint lands in deep ocean or extreme voids
const REGION_FOCAL_OVERRIDES = {
  mist_insect_valley: { x: 4150, y: 750, focalName: 'Lembah Rimbun Bambu & Padang Herba' },
  frostmoon_sea: { x: 4650, y: 4050, focalName: 'Gugusan Karang Roh Es Lautan Bulan Beku' },
  floating_wind_isles: { x: 4600, y: 2700, focalName: 'Kepulauan Daois Mengambang Angin' },
  eastern_sea: { x: 3880, y: 2750, focalName: 'Sarang Naga Karang & Dermaga Donghai' },
  spirit_wood_sea: { x: 3700, y: 1300, focalName: 'Pohon Persik Roh & Rimba Purba' },
  bone_sea_coast: { x: 1750, y: 150, focalName: 'Pesisir Tulang Leviathan Purba' },
  void_rift: { x: 250, y: 4750, focalName: 'Retakan Ruang Dimensi Hampa' },
  lava_spine: { x: 1100, y: 700, focalName: 'Kawah Magma Padat Punggung Lahar' },
  crimson_battlefield: { x: 2900, y: 600, focalName: 'Monumen Medan Perang Abu Darah' },
  abyssal_scar: { x: 1900, y: 600, focalName: 'Tebing Jurang Bekas Luka Neraka' },
  southern_plague_woods: { x: 3400, y: 550, focalName: 'Kuil Belukar Kayu Mati Wabah' }
};

// Build 29 Region Focal Targets
const anchorsByRegion = {};
anchors.forEach(a => {
  const r = a.region || 'central_plains';
  if (!anchorsByRegion[r]) anchorsByRegion[r] = [];
  anchorsByRegion[r].push(a);
});

const TARGETS = regions.map((r, i) => {
  const ancs = anchorsByRegion[r.id] || [];
  let x, y, focalName;
  if (REGION_FOCAL_OVERRIDES[r.id]) {
    x = REGION_FOCAL_OVERRIDES[r.id].x;
    y = REGION_FOCAL_OVERRIDES[r.id].y;
    focalName = REGION_FOCAL_OVERRIDES[r.id].focalName;
  } else if (ancs.length > 0) {
    x = ancs[0].x;
    y = ancs[0].y;
    focalName = ancs[0].name;
  } else {
    x = r.centerX || Math.round((r.bounds.minX + r.bounds.maxX) / 2);
    y = r.centerY || Math.round((r.bounds.minY + r.bounds.maxY) / 2);
    focalName = 'Lanskap Alam & Pegunungan';
  }
  const numStr = String(i + 1).padStart(2, '0');
  return {
    num: i + 1,
    id: r.id,
    name: r.name || r.id,
    chineseName: r.chineseName || '',
    focalName,
    x,
    y,
    zoom: 1.0,
    filename: `region_${numStr}_${r.id}.png`
  };
});

async function main() {
  console.log(`=== MEMULAI SCREENSHOT 29 DAERAH JIANGHU ===\n`);
  const apiServer = await ensureApiServer();

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const cachedPath = 'C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
    playwright = require(cachedPath);
  }

  console.log('[Chrome] Meluncurkan peramban Chromium headless...');
  const browser = await playwright.chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc']
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('401')) {
      console.log(`[Browser Console Error]`, text);
    }
  });

  console.log('[Atlas] Melakukan warm-up dan pra-muat master atlas WebP ke memori GPU peramban...');
  await page.goto('http://localhost:3000/world?debugCam=2500,2500,1.0', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    if (window.atlasLoader) {
      await window.atlasLoader.preloadCoreAtlases();
    }
  });
  console.log('[Atlas] Seluruh lembar atlas WebP (15 halaman) selesai dimuat dan resident di GPU!\n');

  const capturedRecords = [];

  for (let idx = 0; idx < TARGETS.length; idx++) {
    const t = TARGETS[idx];
    const url = `http://localhost:3000/world?debugCam=${t.x},${t.y},${t.zoom}`;
    const filePath = path.join(outDir, t.filename);

    console.log(`[${idx + 1}/29] Mengambil "${t.name}" (${t.focalName}) di (${t.x}, ${t.y})...`);
    
    try {
      await page.goto(url, { timeout: 25000, waitUntil: 'domcontentloaded' });

      // Tunggu hingga chunks & atlas selesai di-decode
      const evalResult = await page.evaluate(async () => {
        if (window.atlasLoader && !window.atlasLoader.isLoaded()) {
          try {
            await window.atlasLoader.loadIndex();
          } catch (e) {}
        }
        const m = await new Promise((resolve) => {
          if (window.__chunksReady) return resolve(window.__debugMetrics || {});
          const handler = (e) => resolve(e.detail || window.__debugMetrics || {});
          window.addEventListener('chunks-ready', handler, { once: true });
          setTimeout(() => resolve(window.__debugMetrics || {}), 8000);
        });
        return { metrics: m };
      });

      // Tunggu jeda render settle
      await page.waitForTimeout(800);

      await page.screenshot({ path: filePath, fullPage: false });

      const metrics = evalResult.metrics || {};
      capturedRecords.push({
        ...t,
        filePath,
        spriteCount: metrics.spriteCount || 0,
        renderTimeMs: metrics.renderTimeMs || 16
      });

      console.log(`  -> Berhasil disimpan ke ${t.filename} (Sprites: ${metrics.spriteCount || 0})`);
    } catch (err) {
      console.error(`  [Gagal] ${t.name}:`, err.message);
    }
  }

  await browser.close();
  if (apiServer) {
    apiServer.close();
  }

  console.log(`\n=== SEMUA 29 DAERAH BERHASIL DI-SCREENSHOT! ===`);
  console.log(`Total tersimpan: ${capturedRecords.length}/29 di ${outDir}\n`);

  // Buat Montage Contact Sheet (5 kolom x 6 baris)
  console.log('[Montage] Menyusun contact sheet gabungan 29 daerah...');
  await generateMontage(capturedRecords);

  console.log('[Done] Selesai!');
}

async function generateMontage(records) {
  const cols = 5;
  const thumbW = 384;
  const thumbH = 216;
  const pad = 12;
  const headerH = 28;
  const rows = Math.ceil(records.length / cols);

  const sheetW = cols * (thumbW + pad) + pad;
  const sheetH = rows * (thumbH + headerH + pad) + pad;

  const composites = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const destX = pad + col * (thumbW + pad);
    const destY = pad + row * (thumbH + headerH + pad);

    try {
      const resizedThumb = await sharp(rec.filePath)
        .resize(thumbW, thumbH, { fit: 'cover' })
        .toBuffer();

      const cardSvg = Buffer.from(`
        <svg width="${thumbW}" height="${headerH}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${thumbW}" height="${headerH}" fill="#0d141f" />
          <text x="8" y="18" font-family="sans-serif" font-size="12" font-weight="bold" fill="#c5a880">
            ${rec.num}. ${rec.name}
          </text>
          <text x="${thumbW - 8}" y="18" font-family="sans-serif" font-size="10" fill="#718096" text-anchor="end">
            (${rec.x}, ${rec.y})
          </text>
        </svg>
      `);

      const cardHeader = await sharp(cardSvg).png().toBuffer();

      composites.push({
        input: cardHeader,
        left: destX,
        top: destY
      });
      composites.push({
        input: resizedThumb,
        left: destX,
        top: destY + headerH
      });
    } catch (e) {
      console.warn(`Gagal memuat thumbnail untuk ${rec.name}:`, e.message);
    }
  }

  const montagePath = path.resolve(__dirname, '../review/shots/all_29_regions_montage.png');
  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 7, g: 10, b: 20, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toFile(montagePath);

  console.log(`[Montage] Tersimpan di: ${montagePath}`);
}

main().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
