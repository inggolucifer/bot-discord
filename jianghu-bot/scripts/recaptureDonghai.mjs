import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const chunkStreamingEngine = require('../utils/chunkStreamingEngine');
const reviewDir = path.resolve(__dirname, '../review/shots/user_check');
const artifactDir = 'C:/Users/User/.gemini/antigravity-ide/brain/0f265647-32a9-467b-9815-99c251a190e0';

function ensureApiServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      console.log('[MOCK REQ]', req.method, req.url);
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

      if (req.method === 'POST' && (req.url === '/api/world/chunks' || req.url === '/world/chunks')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const chunks = data.chunks || data.coords || [];
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

      if (req.method === 'GET' && (req.url.startsWith('/api/world/chunk/') || req.url.startsWith('/world/chunk/'))) {
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

    server.listen(3001, () => {
      console.log('[API Server] Mock API listening on port 3001');
      resolve(server);
    });
  });
}

async function main() {
  console.log('Recapturing zona_02_dermaga_donghai...');
  const apiServer = await ensureApiServer();

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
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const url = 'http://localhost:3000/world?debugCam=3920,2697,1.2';
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('Waiting for canvas and loading screen fadeout...');
  await page.waitForSelector('canvas', { state: 'visible', timeout: 30000 });

  // Wait until loading screen is completely removed from DOM or opacity 0
  await page.waitForFunction(() => {
    const loader = document.querySelector('div[class*="transition-opacity"]');
    if (!loader) return true;
    return loader.classList.contains('opacity-0') || loader.classList.contains('pointer-events-none');
  }, { timeout: 30000 }).catch(() => {});

  await page.evaluate(async () => {
    if (window.atlasLoader) await window.atlasLoader.preloadCoreAtlases();
    if (window.groundTextures && !window.groundTextures.ready) await window.groundTextures.load();
    if (window.chunkManager) window.chunkManager.updateCamera(3920, 2697, 1.2);
  });

  // Give 4s for all chunks and animations to settle
  await page.waitForTimeout(4000);

  const outPath = path.join(reviewDir, 'zona_02_dermaga_donghai.png');
  const artifactPath = path.join(artifactDir, 'zona_02_dermaga_donghai.png');

  await page.screenshot({ path: outPath, fullPage: false });
  fs.copyFileSync(outPath, artifactPath);

  const stats = fs.statSync(artifactPath);
  console.log(`Successfully recaptured zona_02_dermaga_donghai.png (${(stats.size / 1024).toFixed(0)} KB)`);

  await browser.close();
  if (apiServer) apiServer.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
