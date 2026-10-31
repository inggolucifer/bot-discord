import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const chunkStreamingEngine = require('../utils/chunkStreamingEngine');
const playwright = require('C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');

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
    return res.end(JSON.stringify({ authenticated: true, user: { id: 'test_user', name: 'Pendekar Jianghu' } }));
  }

  if (req.method === 'POST' && req.url === '/api/world/chunks') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const chunks = data.chunks || [];
        const batch = chunkStreamingEngine.getStaticChunksBatch(chunks);
        console.log(`[API MOCK] Served ${chunks.length} chunks`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(batch));
      } catch (err) {
        console.error('[API MOCK ERR]', err);
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
  res.end(JSON.stringify({ ok: true }));
});

server.listen(3001, async () => {
  console.log('[API MOCK] Listening on http://localhost:3001');

  const browser = await playwright.chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));

  console.log('Navigating to http://localhost:3000/world?debugCam=2050,2650,1.3 ...');
  await page.goto('http://localhost:3000/world?debugCam=2050,2650,1.3', { timeout: 30000 });

  console.log('Waiting for groundTextures and atlases to be ready in browser...');
  const readyInfo = await page.evaluate(async () => {
    // Wait until window.groundTextures and window.chunkManager are available
    while (!window.groundTextures || !window.chunkManager) {
      await new Promise(r => setTimeout(r, 100));
    }

    console.log('[EVAL] groundTextures found, loading...');
    await window.groundTextures.load();
    if (window.atlasLoader) await window.atlasLoader.preloadCoreAtlases();

    console.log('[EVAL] Clearing cache to force rich textured chunk bitmaps...');
    window.chunkManager.clearCache();
    window.chunkManager.updateCamera(2050, 2650, 1.3);

    return {
      groundReady: window.groundTextures.ready,
      groundImagesSize: window.groundTextures.images.size,
      chunksCount: window.chunkManager.chunks.size
    };
  });
  console.log('Ready info:', readyInfo);

  // Wait 3 seconds for render loop to paint
  await page.waitForTimeout(3000);

  const canvasStats = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i+1]; b += d[i+2];
    }
    const count = d.length / 4;
    return {
      r: (r / count).toFixed(1),
      g: (g / count).toFixed(1),
      b: (b / count).toFixed(1)
    };
  });
  console.log('Canvas Stats with 100% Real AI ground textures:', canvasStats);

  await page.screenshot({ path: 'test_real_ground.png' });
  console.log('Saved screenshot to test_real_ground.png');

  await browser.close();
  server.close();
  process.exit(0);
});
