const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  playwright = require('C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
}
const { chromium } = playwright;
const cse = require('../utils/chunkStreamingEngine');

const shotsArg = process.argv[2];
const outDirArg = process.argv[3];

if (!shotsArg || !outDirArg) {
  console.error('Usage: node scripts/captureWorld.cjs <shotsJson> <outDir>');
  process.exit(1);
}

let shots;
if (fs.existsSync(shotsArg)) {
  shots = JSON.parse(fs.readFileSync(shotsArg, 'utf8'));
} else {
  shots = JSON.parse(shotsArg);
}
const outDir = path.resolve(outDirArg);
fs.mkdirSync(outDir, { recursive: true });

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
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      try {
        const d = JSON.parse(b || '{}');
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

server.listen(3001, async () => {
  console.log('[captureWorld] Stub API running on port 3001');

  let br;
  try {
    br = await chromium.launch({ headless: true });
  } catch (err) {
    console.log('[captureWorld] Falling back to system Google Chrome...');
    br = await chromium.launch({
      headless: true,
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    });
  }

  const seenSha1 = new Map();
  const results = [];

  for (const s of shots) {
    const filePath = path.join(outDir, `${s.name}.png`);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 50000) {
      const pngBuffer = fs.readFileSync(filePath);
      const sha1 = crypto.createHash('sha1').update(pngBuffer).digest('hex');
      console.log(`\n[SKIP] Sudah ada di disk: ${s.name} (SHA-1: ${sha1})`);
      if (seenSha1.has(sha1)) {
        console.error(`[ERROR] Duplicate screenshot detected! ${s.name} has identical SHA-1 to ${seenSha1.get(sha1)}`);
        await br.close();
        server.close();
        process.exit(1);
      }
      seenSha1.set(sha1, s.name);
      continue;
    }

    const page = await br.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (err) => {
      console.error('  [pageerror]', err.message);
    });
    page.on('console', (m) => {
      const t = m.text();
      if (/GROUND|error|Error|WARN|warn|Ready|ready|chunks/i.test(t)) {
        console.log('  [page]', t.slice(0, 160));
      }
    });

    const gridParam = s.grid !== undefined ? `&grid=${s.grid}` : '';
    const url = `http://localhost:3000/world?debugCam=${s.x},${s.y},${s.zoom || 1}${gridParam}`;
    console.log(`\n[Shot] Capturing ${s.name} at (${s.x}, ${s.y}) zoom=${s.zoom || 1}${gridParam}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

    // a. window.__chunksReady === true DAN window.atlasReady === true DAN window.groundTextures.ready === true
    let chunksReady = false;
    try {
      await page.waitForFunction(
        () => window.__chunksReady === true && window.atlasReady === true && window.groundTextures && window.groundTextures.ready === true,
        { timeout: 90000 }
      );
      chunksReady = true;
    } catch (e) {
      const diag = await page.evaluate(() => ({
        chunksReady: window.__chunksReady,
        atlasReady: window.atlasReady,
        hasGroundTextures: Boolean(window.groundTextures),
        groundReady: window.groundTextures ? window.groundTextures.ready : false,
        debugMetrics: window.__debugMetrics
      })).catch(() => null);
      console.error(`[ERROR] Timeout 90s menunggu __chunksReady, atlasReady & groundTextures.ready untuk ${s.name}! Diag:`, diag);
      await page.close();
      await br.close();
      server.close();
      process.exit(1);
    }

    // Tunggu loading screen memudar sempurna
    await page.waitForFunction(() => {
      const loader = document.querySelector('div[class*="transition-opacity"]');
      return !loader || loader.classList.contains('opacity-0') || loader.classList.contains('pointer-events-none');
    }, { timeout: 30000 }).catch(() => {});

    await page.evaluate(async (s) => {
      if (window.atlasLoader) await window.atlasLoader.preloadCoreAtlases();
      if (window.groundTextures && !window.groundTextures.ready) await window.groundTextures.load();
      if (window.chunkManager) window.chunkManager.updateCamera(s.x, s.y, s.zoom || 1);
    }, s).catch(() => {});

    await page.waitForTimeout(2500);

    const isGroundReady = await page.evaluate(() => Boolean(window.groundTextures && window.groundTextures.ready));
    const debugMetrics = await page.evaluate(() => (window.__debugMetrics ? window.__debugMetrics : null));
    console.log(`  chunksReady=true, groundTextures.ready=${isGroundReady}`);
    if (debugMetrics) {
      console.log(`  debugMetrics: sprites=${debugMetrics.spriteCount}, uniqueDefs=${debugMetrics.uniqueDefIds}, renderMs=${debugMetrics.renderTimeMs?.toFixed(2)}`);
    }

    let finalBuffer = await page.screenshot();
    if (finalBuffer.length > 390 * 1024) {
      finalBuffer = await sharp(finalBuffer)
        .png({ compressionLevel: 9, palette: true, quality: 90 })
        .toBuffer();
    } else {
      finalBuffer = await sharp(finalBuffer)
        .png({ compressionLevel: 9 })
        .toBuffer();
    }
    fs.writeFileSync(filePath, finalBuffer);

    // c. SHA-1 verification
    const sha1 = crypto.createHash('sha1').update(finalBuffer).digest('hex');
    console.log(`  SHA-1: ${sha1}`);
    if (seenSha1.has(sha1)) {
      console.error(`[ERROR] Duplicate screenshot detected! ${s.name} has identical SHA-1 to ${seenSha1.get(sha1)}`);
      await br.close();
      server.close();
      process.exit(1);
    }
    seenSha1.set(sha1, s.name);

    // b. Pixel analysis (center + 8 grid points, and luminance standard deviation)
    const { data, info } = await sharp(finalBuffer).raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    const sampleCoords = [
      [640, 360], // Center
      [213, 120], [640, 120], [1067, 120],
      [213, 360],             [1067, 360],
      [213, 600], [640, 600], [1067, 600]
    ];

    let darkSampleCount = 0;
    for (const [sx, sy] of sampleCoords) {
      const idx = (sy * width + sx) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Landing / dark background color is #070a14: r=7, g=10, b=20
      if (r <= 10 && g <= 14 && b <= 25) {
        darkSampleCount++;
      }
    }

    // Luminance standard deviation
    let sumL = 0;
    let sumL2 = 0;
    const totalPixels = width * height;
    for (let i = 0; i < data.length; i += channels) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sumL += l;
      sumL2 += l * l;
    }
    const meanL = sumL / totalPixels;
    const stdL = Math.sqrt(Math.max(0, sumL2 / totalPixels - meanL * meanL));

    console.log(`  Luminance Mean: ${meanL.toFixed(2)}, StdDev: ${stdL.toFixed(2)}, DarkSamplePoints: ${darkSampleCount}/9`);

    if (darkSampleCount >= 8 || stdL < 8.0) {
      console.error(`[ERROR] Shot ${s.name} failed visual validation! stdL=${stdL.toFixed(2)} (< 8.0) or dark points=${darkSampleCount}/9`);
      await br.close();
      server.close();
      process.exit(1);
    }

    results.push({
      name: s.name,
      coords: `(${s.x},${s.y})`,
      sha1,
      stdL: stdL.toFixed(2),
      chunksReady,
      groundReady: isGroundReady,
      sprites: debugMetrics ? debugMetrics.spriteCount : 0
    });

    await page.close();
  }

  await br.close();
  server.close();

  console.log('\n=== CAPTURE WORLD SUMMARY ===');
  console.table(results);
  console.log(`[PASS] All ${results.length} shots captured with unique SHA-1 and verified active rendering!`);
  process.exit(0);
});
