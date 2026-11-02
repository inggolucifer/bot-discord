'use strict';
/**
 * scripts/v19/determinismTest.js
 * V19 F4: Render determinism test across 6 points x 3 conditions:
 *   (a) fresh / cold browser cache
 *   (b) warm cache (page reload without server restart)
 *   (c) reversed chunk loading order (panned from right/offset before stopping at test point)
 * 
 * Compares ground-only PNGs:
 *   - Average absolute RGB difference: max |dRGB| <= 1.0
 *   - Percentage of pixels with |d| > 12: <= 0.2%
 * Output saved to: review/v19_raw/f4_determinism.json
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  playwright = require('C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
}
const { chromium } = playwright;
const cse = require('../../utils/chunkStreamingEngine');

const outDir = path.resolve(__dirname, '../../review/shots_v19/determinism');
fs.mkdirSync(outDir, { recursive: true });
const rawDir = path.resolve(__dirname, '../../review/v19_raw');
fs.mkdirSync(rawDir, { recursive: true });

const points = [
  { id: 'P01', name: 'P01_xingcun', x: 2050, y: 2650, zoom: 1.4 },
  { id: 'P04', name: 'P04_farm', x: 2450, y: 2450, zoom: 1.4 },
  { id: 'P07', name: 'P07_plains', x: 1500, y: 3350, zoom: 1.0 },
  { id: 'P11', name: 'P11_xueshan', x: 2350, y: 4300, zoom: 1.4 },
  { id: 'P13', name: 'P13_road_h', x: 2040, y: 2651, zoom: 1.4 },
  { id: 'P14', name: 'P14_road_v', x: 2053, y: 2648, zoom: 1.4 },
];

// Stub API on port 3001 to supply synchronous static chunks
const server = http.createServer((req, res) => {
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/api/auth/me') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ authenticated: false, user: null }));
  }

  if (req.method === 'POST' && req.url === '/api/world/chunks') {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(b);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cse.getStaticChunksBatch(d.chunks || [])));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/world/chunk/')) {
    const p = req.url.split('/');
    const cx = +p[p.length - 2];
    const cy = +p[p.length - 1];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(cse.getStaticChunk(cx, cy)));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('{"ok":true}');
});

async function captureAllRuns() {
  let br;
  try {
    br = await chromium.launch({ headless: true });
  } catch (err) {
    console.log('[Determinism] Falling back to system Google Chrome...');
    br = await chromium.launch({
      headless: true,
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    });
  }

  for (const pt of points) {
    console.log(`\n========================================`);
    console.log(`Testing Determinism for ${pt.name} (${pt.x}, ${pt.y}) zoom=${pt.zoom}`);
    console.log(`========================================`);

    const targetUrl = `http://localhost:3000/world?debugCam=${pt.x},${pt.y},${pt.zoom}&grid=0&ground=only`;

    // (a) Cold run (fresh context)
    console.log(`[Run A: Cold] Capturing fresh context...`);
    const contextA = await br.newContext();
    const pageA = await contextA.newPage({ viewport: { width: 1280, height: 720 } });
    await pageA.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageA.waitForFunction(() => {
      const w = window;
      return w.__chunksReady === true && w.groundTextures && w.groundTextures.ready === true;
    }, { timeout: 25000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));
    const pathCold = path.join(outDir, `${pt.id}_cold.png`);
    await pageA.screenshot({ path: pathCold });
    console.log(`  Saved ${pathCold}`);

    // (b) Warm run (page reload in same page/context)
    console.log(`[Run B: Warm] Reloading page...`);
    await pageA.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageA.waitForFunction(() => {
      const w = window;
      return w.__chunksReady === true && w.groundTextures && w.groundTextures.ready === true;
    }, { timeout: 25000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));
    const pathWarm = path.join(outDir, `${pt.id}_warm.png`);
    await pageA.screenshot({ path: pathWarm });
    console.log(`  Saved ${pathWarm}`);
    await contextA.close();

    // (c) Reversed run (approaching from offset position)
    console.log(`[Run C: Reversed] Panning from offset (+100 cells)...`);
    const contextC = await br.newContext();
    const pageC = await contextC.newPage({ viewport: { width: 1280, height: 720 } });
    const offsetUrl = `http://localhost:3000/world?debugCam=${pt.x + 80},${pt.y + 40},${pt.zoom}&grid=0&ground=only`;
    await pageC.goto(offsetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageC.waitForFunction(() => {
      const w = window;
      return w.__chunksReady === true && w.groundTextures && w.groundTextures.ready === true;
    }, { timeout: 25000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 400));

    // Now navigate to final target
    await pageC.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageC.waitForFunction(() => {
      const w = window;
      return w.__chunksReady === true && w.groundTextures && w.groundTextures.ready === true;
    }, { timeout: 25000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));
    const pathReversed = path.join(outDir, `${pt.id}_reversed.png`);
    await pageC.screenshot({ path: pathReversed });
    console.log(`  Saved ${pathReversed}`);
    await contextC.close();
  }

  await br.close();
}

function compareAll() {
  console.log('\n[Determinism] Analyzing pixel differences...');
  const pyScript = path.resolve(__dirname, 'compareDeterminism.py');
  const res = execSync(`python "${pyScript}"`, { stdio: 'inherit' });
}

server.listen(3001, async () => {
  console.log('[Determinism] Stub API server listening on 3001');
  try {
    await captureAllRuns();
    compareAll();
  } catch (err) {
    console.error('[Determinism] Error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
