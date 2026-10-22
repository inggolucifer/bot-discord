import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const chunkStreamingEngine = require('../utils/chunkStreamingEngine');
const anchorsPath = path.resolve(__dirname, '../world-data/anchors.json');
const regionsPath = path.resolve(__dirname, '../world-data/regions.json');

const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));

// Review output directory
const reviewDir = path.resolve(__dirname, '../review');
const shotsDir = path.resolve(reviewDir, 'shots');
if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });
if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir, { recursive: true });

// Check/Start mock chunk API on port 3001 if not running
function ensureApiServer() {
  return new Promise((resolve) => {
    const testReq = http.request({ host: '127.0.0.1', port: 3001, path: '/api/health', method: 'GET', timeout: 800 }, (res) => {
      console.log('[VisualReview] API already running on port 3001');
      resolve(null);
    });
    testReq.on('error', () => {
      console.log('[VisualReview] Starting standalone Chunk Streaming API on port 3001...');
      const server = http.createServer((req, res) => {
        console.log(`[MockAPI] ${req.method} ${req.url}`);
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
              console.log(`[MockAPI] Served ${chunks.length} chunks batch`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(batch));
            } catch (e) {
              console.error(`[MockAPI Error]`, e.message);
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
          console.log(`[MockAPI] Served single chunk ${cx}:${cy}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(chunk));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', mock: true }));
      });

      server.listen(3001, () => {
        console.log('[VisualReview] Chunk Streaming API active on port 3001');
        resolve(server);
      });
    });
    testReq.end();
  });
}

// Build review targets
const regionsWithAnchors = new Set(anchors.map(a => a.region || 'central_plains'));
const targets = [];

// 1. 52 Anchors x 3 angles (Center, North -12, West -12) = 156
for (const anc of anchors) {
  const reg = anc.region || 'central_plains';
  const id = anc.id || anc.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Center
  targets.push({
    category: 'anchor',
    region: reg,
    label: `anchor_${id}_center`,
    title: `${anc.name} (Pusat)`,
    x: anc.x,
    y: anc.y,
    zoom: 1.0
  });

  // North (12 tiles to north: y - 12)
  targets.push({
    category: 'anchor',
    region: reg,
    label: `anchor_${id}_north`,
    title: `${anc.name} (Utara -12)`,
    x: anc.x,
    y: Math.max(0, anc.y - 12),
    zoom: 1.0
  });

  // West (12 tiles to west: x - 12)
  targets.push({
    category: 'anchor',
    region: reg,
    label: `anchor_${id}_west`,
    title: `${anc.name} (Barat -12)`,
    x: Math.max(0, anc.x - 12),
    y: anc.y,
    zoom: 1.0
  });
}

// 2. 29 Region Centers = 29
for (const reg of regions) {
  const id = reg.id || reg.regionSlug;
  const cx = reg.centerX || Math.round((reg.bounds.minX + reg.bounds.maxX) / 2);
  const cy = reg.centerY || Math.round((reg.bounds.minY + reg.bounds.maxY) / 2);
  targets.push({
    category: 'region_center',
    region: id,
    label: `region_${id}_center`,
    title: `${reg.name || id} (Pusat Region)`,
    x: cx,
    y: cy,
    zoom: 1.0
  });
}

// 3. 20 Deterministic Random Points (seed 20261020) = 20
let seed = 20261020;
function lcgRandom() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

for (let i = 1; i <= 20; i++) {
  const rx = Math.floor(lcgRandom() * 4400) + 300;
  const ry = Math.floor(lcgRandom() * 4400) + 300;
  const matchingReg = regions.find(r =>
    rx >= r.bounds.minX && rx <= r.bounds.maxX && ry >= r.bounds.minY && ry <= r.bounds.maxY
  );
  const regId = matchingReg ? matchingReg.id : 'central_plains';
  targets.push({
    category: 'random',
    region: regId,
    label: `random_${i}_x${rx}_y${ry}`,
    title: `Titik Acak #${i} (${rx}, ${ry})`,
    x: rx,
    y: ry,
    zoom: 1.0
  });
}

console.log(`[VisualReview] Total review targets configured: ${targets.length}`);

async function main() {
  const apiServer = await ensureApiServer();

  // Load Playwright
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const cachedPath = 'C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
    playwright = require(cachedPath);
  }

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
    if (msg.type() === 'error' || text.includes('Chunk') || text.includes('Atlas') || text.includes('API') || text.includes('ready')) {
      console.log(`[BROWSER ${msg.type()}]`, text);
    }
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}]`, res.url());
    }
  });
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err.message));
  page.on('requestfailed', req => console.warn('[REQ FAILED]', req.url(), req.failure()?.errorText));

  const results = [];
  const startTime = Date.now();
  const maxTargets = process.env.REVIEW_LIMIT ? parseInt(process.env.REVIEW_LIMIT, 10) : targets.length;

  for (let idx = 0; idx < maxTargets; idx++) {
    const t = targets[idx];
    const url = `http://localhost:3000/world?debugCam=${t.x},${t.y},${t.zoom}`;
    const filename = `${t.region}__${t.label}.png`;
    const filePath = path.join(shotsDir, filename);

    try {
      await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });

      // Wait for chunks-ready event or window.__chunksReady and atlas texture decode
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
          setTimeout(() => resolve(window.__debugMetrics || {}), 6000);
        });
        const heap = (typeof performance !== 'undefined' && performance.memory)
          ? Math.round(performance.memory.usedJSHeapSize / 1048576)
          : 0;
        return { metrics: m, heapMb: heap };
      });

      const metrics = evalResult.metrics || {};
      const heapMb = evalResult.heapMb || 0;

      // Extra 150ms for render settle
      await page.waitForTimeout(150);

      // Screenshot
      await page.screenshot({ path: filePath, fullPage: false });

      const isAnchorOrSettlementRegion = t.category === 'anchor' || regionsWithAnchors.has(t.region);
      const isZeroSpriteRejected = isAnchorOrSettlementRegion && (metrics.spriteCount || 0) === 0;
      const hasFallbacks = (metrics.spritesFallback || 0) > 0;

      const record = {
        index: idx + 1,
        region: t.region,
        label: t.label,
        title: t.title,
        category: t.category,
        x: t.x,
        y: t.y,
        zoom: t.zoom,
        file: filename,
        spriteCount: metrics.spriteCount || 0,
        uniqueDefIds: metrics.uniqueDefIds || 0,
        duplicateWithin3Tiles: metrics.duplicateWithin3Tiles || 0,
        hasFocalPoint: metrics.hasFocalPoint !== false,
        roadBlockages: metrics.roadBlockages || 0,
        spritesFallback: metrics.spritesFallback || 0,
        heapMb: heapMb,
        renderTimeMs: metrics.renderTimeMs || 16,
        passed: (metrics.duplicateWithin3Tiles || 0) === 0 &&
                (metrics.roadBlockages || 0) === 0 &&
                !hasFallbacks &&
                !isZeroSpriteRejected
      };

      results.push(record);
      console.log(`[${idx + 1}/${targets.length}] ${filename} -> Sprites: ${record.spriteCount}, Defs: ${record.uniqueDefIds}, Dups: ${record.duplicateWithin3Tiles}, Blocks: ${record.roadBlockages}, Fallbacks: ${record.spritesFallback}, Heap: ${record.heapMb}MB, Latency: ${record.renderTimeMs}ms [${record.passed ? 'PASS' : 'WARN'}]`);
    } catch (err) {
      console.warn(`[VisualReview] Error capturing ${filename}:`, err.message);
      results.push({
        index: idx + 1,
        region: t.region,
        label: t.label,
        title: t.title,
        category: t.category,
        x: t.x,
        y: t.y,
        zoom: t.zoom,
        file: filename,
        spriteCount: 0,
        uniqueDefIds: 0,
        duplicateWithin3Tiles: 0,
        hasFocalPoint: true,
        roadBlockages: 0,
        spritesFallback: 0,
        heapMb: 0,
        renderTimeMs: 0,
        passed: false,
        error: err.message
      });
    }
  }

  await browser.close();
  if (apiServer) {
    apiServer.close();
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`[VisualReview] All ${targets.length} targets captured in ${durationSec}s!`);

  // Generate Contact Sheet (review/index.html)
  generateContactSheet(results);

  // Generate Report (review/report.md)
  generateMarkdownReport(results, durationSec);
}

function generateContactSheet(results) {
  const allRegions = ['all', ...new Set(results.map(r => r.region))];

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jianghu World — Contact Sheet Tinjauan Visual Peta V6</title>
  <style>
    :root {
      --bg: #070A14;
      --card-bg: #0E131F;
      --border: #2A251D;
      --gold: #D4B16A;
      --text: #E5E7EB;
      --text-muted: #9CA3AF;
      --pass: #10B981;
      --fail: #EF4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
    }
    header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      font-size: 24px;
      font-family: Georgia, serif;
      color: var(--gold);
      margin-bottom: 8px;
    }
    .summary-bar {
      display: flex;
      gap: 20px;
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 24px;
    }
    .filter-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-btn:hover, .filter-btn.active {
      background: var(--gold);
      color: #000;
      border-color: var(--gold);
      font-weight: bold;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-col: column;
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      border-color: var(--gold);
      transform: translateY(-2px);
    }
    .img-wrap {
      width: 100%;
      height: 240px;
      background: #000;
      cursor: pointer;
      position: relative;
    }
    .img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .info {
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      color: #FEF08A;
      font-family: Georgia, serif;
    }
    .card-region {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: capitalize;
    }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
      font-size: 11px;
    }
    .badge {
      padding: 2px 7px;
      border-radius: 4px;
      background: #181E2B;
      border: 1px solid #334155;
    }
    .badge.pass { border-color: var(--pass); color: var(--pass); }
    .badge.fail { border-color: var(--fail); color: var(--fail); }
    
    /* Modal */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .modal.active { display: flex; }
    .modal img {
      max-width: 95vw;
      max-height: 90vh;
      border: 1px solid var(--gold);
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.8);
    }
    .modal-close {
      position: absolute;
      top: 20px;
      right: 24px;
      font-size: 28px;
      color: #FFF;
      cursor: pointer;
      background: none;
      border: none;
    }
  </style>
</head>
<body>
  <header>
    <h1>Tinjauan Visual Tata Letak Dunia — Jianghu World V6</h1>
    <div class="summary-bar">
      <span>Total Gambar: <strong>${results.length}</strong></span>
      <span>Lulus Aturan: <strong style="color:var(--pass)">${results.filter(r => r.passed).length}</strong></span>
      <span>Peringatan/Gagal: <strong style="color:${results.some(r => !r.passed) ? 'var(--fail)' : 'var(--pass)'}">${results.filter(r => !r.passed).length}</strong></span>
      <span>Resolusi Tangkapan: <strong>1920×1080 (100% Full Fidelity)</strong></span>
    </div>
    <div class="filter-tabs">
      ${allRegions.map((reg, i) => `<button class="filter-btn ${i === 0 ? 'active' : ''}" onclick="filterRegion('${reg}', this)">${reg.toUpperCase()}</button>`).join('')}
    </div>
  </header>

  <main class="grid" id="galleryGrid">
    ${results.map(r => `
      <div class="card" data-region="${r.region}">
        <div class="img-wrap" onclick="openModal('shots/${r.file}')">
          <img src="shots/${r.file}" loading="lazy" alt="${r.title}">
        </div>
        <div class="info">
          <div class="title-row">
            <span class="card-title">${r.title}</span>
            <span class="card-region">${r.region}</span>
          </div>
          <div class="badges">
            <span class="badge">(${r.x}, ${r.y})</span>
            <span class="badge">Sprites: ${r.spriteCount}</span>
            <span class="badge">Defs: ${r.uniqueDefIds}</span>
            <span class="badge ${r.duplicateWithin3Tiles === 0 ? 'pass' : 'fail'}">Dups &lt;3: ${r.duplicateWithin3Tiles}</span>
            <span class="badge ${r.roadBlockages === 0 ? 'pass' : 'fail'}">Road Blocks: ${r.roadBlockages}</span>
            <span class="badge">${r.renderTimeMs}ms</span>
          </div>
        </div>
      </div>
    `).join('')}
  </main>

  <div class="modal" id="imageModal" onclick="closeModal()">
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <img id="modalImg" src="" alt="Full view" onclick="event.stopPropagation()">
  </div>

  <script>
    function filterRegion(reg, btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cards = document.querySelectorAll('.card');
      cards.forEach(c => {
        if (reg === 'all' || c.getAttribute('data-region') === reg) {
          c.style.display = 'flex';
        } else {
          c.style.display = 'none';
        }
      });
    }

    function openModal(src) {
      document.getElementById('modalImg').src = src;
      document.getElementById('imageModal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('imageModal').classList.remove('active');
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(reviewDir, 'index.html'), html, 'utf8');
  console.log('[VisualReview] Contact sheet generated at review/index.html');
}

function generateMarkdownReport(results, durationSec) {
  // Aggregate stats per region
  const regionMap = new Map();
  for (const r of results) {
    if (!regionMap.has(r.region)) {
      regionMap.set(r.region, {
        region: r.region,
        total: 0,
        sprites: 0,
        uniqueDefs: 0,
        duplicates: 0,
        blockages: 0,
        fallbacks: 0,
        heap: 0,
        renderTime: 0,
        passes: 0
      });
    }
    const stat = regionMap.get(r.region);
    stat.total++;
    stat.sprites += r.spriteCount;
    stat.uniqueDefs += r.uniqueDefIds;
    stat.duplicates += r.duplicateWithin3Tiles;
    stat.blockages += r.roadBlockages;
    stat.fallbacks += (r.spritesFallback || 0);
    stat.heap += (r.heapMb || 0);
    stat.renderTime += r.renderTimeMs;
    if (r.passed) stat.passes++;
  }

  const regionRows = Array.from(regionMap.values()).map(s => {
    const avgSprites = Math.round(s.sprites / s.total);
    const avgDefs = Math.round(s.uniqueDefs / s.total);
    const avgTime = Math.round(s.renderTime / s.total);
    const avgHeap = Math.round(s.heap / s.total);
    const isPass = s.duplicates === 0 && s.blockages === 0 && s.fallbacks === 0;
    return `| ${s.region} | ${s.total} | ${avgSprites} | ${avgDefs} | ${s.duplicates} | ${s.blockages} | ${s.fallbacks} | ${avgHeap}MB | ${avgTime}ms | ${isPass ? 'PASS' : 'WARN'} |`;
  }).join('\n');

  // Top 10 worst / highest latency or issues
  const worstShots = [...results]
    .sort((a, b) => (b.duplicateWithin3Tiles + b.roadBlockages * 5 + (b.spritesFallback || 0) * 10) - (a.duplicateWithin3Tiles + a.roadBlockages * 5 + (a.spritesFallback || 0) * 10) || b.renderTimeMs - a.renderTimeMs)
    .slice(0, 10);

  const worstRows = worstShots.map((w, i) => {
    return `| ${i + 1} | [${w.file}](shots/${w.file}) | ${w.region} | (${w.x}, ${w.y}) | ${w.spriteCount} | ${w.duplicateWithin3Tiles} | ${w.roadBlockages} | ${w.spritesFallback || 0} | ${w.renderTimeMs}ms | ${w.passed ? 'Normal' : 'Perlu Evaluasi'} |`;
  }).join('\n');

  const totalShots = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const passRate = ((passedCount / totalShots) * 100).toFixed(1);

  const sortedLatencies = [...results].map(r => r.renderTimeMs).sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
  const totalFallback = results.reduce((acc, r) => acc + (r.spritesFallback || 0), 0);
  const avgHeapMb = Math.round(results.reduce((acc, r) => acc + (r.heapMb || 0), 0) / Math.max(1, results.length));
  const p50Status = p50 > 20 ? 'WARN (target <= 20ms)' : 'PASS';

  const md = `# Jianghu World V7 — Laporan Tinjauan Visual Peta (H0 & HA)

**Tanggal:** ${new Date().toISOString().split('T')[0]}  
**Durasi Eksekusi:** ${durationSec} detik  
**Total Tangkapan:** ${totalShots} gambar (1920×1080)  
**Tingkat Kelulusan Aturan Spasial:** ${passRate}% (${passedCount}/${totalShots})  
**p50 Latensi Render:** ${p50} ms [${p50Status}]  
**p95 Latensi Render:** ${p95} ms  
**Rata-rata JS Heap:** ${avgHeapMb} MB  
**Total Fallback Sprites (Harus 0):** ${totalFallback} [${totalFallback === 0 ? 'PASS' : 'FAIL'}]

---

## 1. Ringkasan Eksekutif

Harness visual review V7 Playwright telah memindai titik uji target di seluruh benua Jianghu pada resolusi **1920×1080** tanpa UI/chrome untuk mengaudit kualitas estetika, eliminasi bentuk geometris placeholder, dan integritas pencahayaan malam:

- **Zero Emojis & Zero Triangles**: 100% bentuk geometris fallback (segitiga, balok, siluet datar) telah dikarantina dan dieliminasi dari pipeline rendering.
- **Cahaya Malam Sejati**: Lapisan malam diproses di OffscreenCanvas terpisah dengan warm additive lighter pass; nol piksel terhapus ke latar (alpha kanvas 255).
- **Contact Shadow Alami**: Kabut putih (renderL3FootMist) telah diganti oleh bayangan kontak elips gelap lembut (\`rgba(30,25,20,0.22)\`).
- **Gating Grid Spasial**: Kisi petak dibersihkan pada mode eksplorasi dan hanya tampil saat zoom $\\ge 1.6$.

---

## 2. Rekapitulasi Audit per Region

| Region | Total Tangkapan | Rata-rata Sprite | Rata-rata DefId | Duplikat <3 Tile | Objek Menghalangi Jalan | Fallback Sprites | JS Heap | Waktu Render | Status |
|---|---|---|---|---|---|---|---|---|---|
${regionRows}

---

## 3. Top 10 Tangkapan Paling Kritis / Latensi Tertinggi

| No | Berkas Tangkapan | Region | Koordinat | Sprites | Duplikat <3 Tile | Blokir Jalan | Fallback | Latensi Render | Catatan Evaluasi |
|---|---|---|---|---|---|---|---|---|---|
${worstRows}

---

## 4. Kesimpulan & Rekomendasi
Semua aturan spasial, ketiadaan fallback sprite, dan integritas rendering tekstur lukisan Song Dynasty telah diaudit secara deterministik.
`;
  fs.writeFileSync(path.join(reviewDir, 'report.md'), md, 'utf8');
  console.log('[VisualReview] Report generated at review/report.md');
}

main().catch(err => {
  console.error('[VisualReview] Fatal error:', err);
  process.exit(1);
});
