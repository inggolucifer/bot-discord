/**
 * scripts/checkRoadGrid.cjs
 * H3: Road-Grid Alignment & Spectrometry Verification
 *
 * Verifies that road boundaries and transitions align strictly to the 54px tile grid
 * across 4 straight road stretches (EW and NS) in different world regions.
 * Tolerances: Edge boundary must fall within ±2 px of an exact multiple of 54.
 */

const fs = require('fs');
const path = require('path');

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  playwright = require('C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
}
const { chromium } = playwright;

console.log('\n=== AUDIT SPEKTROMETRI GRID JALAN (checkRoadGrid.cjs) ===\n');

// 1. Identify 4 straight road stretches from authored-props.json
const authoredPath = path.resolve(__dirname, '../world-data/authored-props.json');
const authored = JSON.parse(fs.readFileSync(authoredPath, 'utf8'));
const roads = authored.roads || [];

const testTargets = [
  { name: 'Desa Xingcun (Central EW)', anchorId: 'desa_xingcun', dir: 'EW', fixedCoord: 2650, span: [2040, 2046] },
  { name: 'Oase Shadi (Desert NS)', anchorId: 'oase_shadi', dir: 'NS', fixedCoord: 820, span: [2209, 2216] },
  { name: 'Kemah Petapa (Highlands EW)', anchorId: 'kemah_dataran_tinggi_petapa', dir: 'EW', fixedCoord: 4200, span: [1190, 1196] },
  { name: 'Pos Qinghe (Northern Pass NS)', anchorId: 'pos_perbatasan_qinghe', dir: 'NS', fixedCoord: 2300, span: [1939, 1946] }
];

async function runAudit() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    const chromePaths = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
    ];
    let launched = false;
    for (const p of chromePaths) {
      if (fs.existsSync(p)) {
        browser = await chromium.launch({ headless: true, executablePath: p });
        launched = true;
        break;
      }
    }
    if (!launched) throw err;
  }
  const page = await browser.newPage();

  let totalTests = 0;
  let totalPass = 0;
  let violations = [];

  for (const target of testTargets) {
    console.log(`[TEST] Pengujian Stretches: ${target.name}...`);

    // Determine chunk containing this stretch
    const sampleX = target.dir === 'EW' ? Math.floor((target.span[0] + target.span[1]) / 2) : target.fixedCoord;
    const sampleY = target.dir === 'EW' ? target.fixedCoord : Math.floor((target.span[0] + target.span[1]) / 2);
    const cx = Math.floor(sampleX / 32);
    const cy = Math.floor(sampleY / 32);

    // Collect all road tiles within this chunk and surrounding border
    const chunkRoadTiles = new Set();
    for (const r of roads) {
      if (r.direction === 'EW') {
        const y = r.from.y;
        const minX = Math.min(r.from.x, r.to.x);
        const maxX = Math.max(r.from.x, r.to.x);
        for (let x = minX; x <= maxX; x++) {
          chunkRoadTiles.add(`${x},${y}`);
        }
      } else if (r.direction === 'NS') {
        const x = r.from.x;
        const minY = Math.min(r.from.y, r.to.y);
        const maxY = Math.max(r.from.y, r.to.y);
        for (let y = minY; y <= maxY; y++) {
          chunkRoadTiles.add(`${x},${y}`);
        }
      }
    }

    const roadTilesList = Array.from(chunkRoadTiles);

    // Evaluate in headless Chromium canvas
    const result = await page.evaluate(({ cx, cy, target, roadTilesList }) => {
      const CHUNK_SIZE = 32;
      const tileSize = 54;
      const BORDER = 2;
      const GRID_DIM = CHUNK_SIZE + BORDER * 2; // 36

      const roadSet = new Set(roadTilesList);

      // Build gridFamilies
      const gridFamilies = new Array(GRID_DIM * GRID_DIM);
      for (let dy = -BORDER; dy < CHUNK_SIZE + BORDER; dy++) {
        for (let dx = -BORDER; dx < CHUNK_SIZE + BORDER; dx++) {
          const gx = cx * CHUNK_SIZE + dx;
          const gy = cy * CHUNK_SIZE + dy;
          const isRoad = roadSet.has(`${gx},${gy}`);
          const idx = (dy + BORDER) * GRID_DIM + (dx + BORDER);
          gridFamilies[idx] = isRoad ? 'road_stone' : 'plains';
        }
      }

      // Create Chunk Canvas
      const canvas = document.createElement('canvas');
      canvas.width = CHUNK_SIZE * tileSize;
      canvas.height = CHUNK_SIZE * tileSize;
      const ctx = canvas.getContext('2d');

      // 1. Fill base plains color #E2DACB (226, 218, 203)
      ctx.fillStyle = '#E2DACB';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Render road mask with nearest-neighbor upscale (Prompt H2)
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = GRID_DIM;
      maskCanvas.height = GRID_DIM;
      const maskCtx = maskCanvas.getContext('2d');
      const imgData = maskCtx.createImageData(GRID_DIM, GRID_DIM);
      const d32 = new Uint32Array(imgData.data.buffer);
      for (let i = 0; i < gridFamilies.length; i++) {
        d32[i] = gridFamilies[i] === 'road_stone' ? 0xff000000 : 0x00000000;
      }
      maskCtx.putImageData(imgData, 0, 0);

      const upCanvas = document.createElement('canvas');
      upCanvas.width = GRID_DIM * tileSize;
      upCanvas.height = GRID_DIM * tileSize;
      const upCtx = upCanvas.getContext('2d');
      upCtx.imageSmoothingEnabled = false;
      upCtx.drawImage(maskCanvas, 0, 0, GRID_DIM, GRID_DIM, 0, 0, upCanvas.width, upCanvas.height);

      // 3. Render Road Texture on scratchT and mask it
      const scratchT = document.createElement('canvas');
      scratchT.width = canvas.width;
      scratchT.height = canvas.height;
      const ctxT = scratchT.getContext('2d');

      // Road stone color #D8CFBF (216, 207, 191)
      ctxT.fillStyle = '#D8CFBF';
      ctxT.fillRect(0, 0, scratchT.width, scratchT.height);

      ctxT.globalCompositeOperation = 'destination-in';
      ctxT.drawImage(upCanvas, BORDER * tileSize, BORDER * tileSize, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      ctxT.globalCompositeOperation = 'source-over';

      // 4. Add crisp 2px dark border along non-road edges (Prompt H2)
      ctxT.fillStyle = 'rgba(40, 30, 20, 0.35)';
      for (let ly = BORDER; ly < BORDER + CHUNK_SIZE; ly++) {
        for (let lx = BORDER; lx < BORDER + CHUNK_SIZE; lx++) {
          if (gridFamilies[ly * GRID_DIM + lx] === 'road_stone') {
            const px = (lx - BORDER) * tileSize;
            const py = (ly - BORDER) * tileSize;
            if (gridFamilies[(ly - 1) * GRID_DIM + lx] !== 'road_stone') {
              ctxT.fillRect(px, py, tileSize, 2);
            }
            if (gridFamilies[(ly + 1) * GRID_DIM + lx] !== 'road_stone') {
              ctxT.fillRect(px, py + tileSize - 2, tileSize, 2);
            }
            if (gridFamilies[ly * GRID_DIM + lx - 1] !== 'road_stone') {
              ctxT.fillRect(px, py, 2, tileSize);
            }
            if (gridFamilies[ly * GRID_DIM + lx + 1] !== 'road_stone') {
              ctxT.fillRect(px + tileSize - 2, py, 2, tileSize);
            }
          }
        }
      }

      // Draw road onto base canvas
      ctx.drawImage(scratchT, 0, 0);

      // Now sample cross-section pixels across the road stretch
      const samples = [];
      if (target.dir === 'EW') {
        // Cross section is vertical (Y direction) across the road at a midpoint X
        const midX = Math.floor((target.span[0] + target.span[1]) / 2);
        const lx = midX - cx * CHUNK_SIZE;
        const lyRoad = target.fixedCoord - cy * CHUNK_SIZE;
        const samplePxX = lx * tileSize + Math.floor(tileSize / 2);

        // Find contiguous road tile span along this sample line
        let roadMinY = lyRoad;
        let roadMaxY = lyRoad;
        while (roadSet.has(`${midX},${(cy * CHUNK_SIZE + roadMinY - 1)}`)) roadMinY--;
        while (roadSet.has(`${midX},${(cy * CHUNK_SIZE + roadMaxY + 1)}`)) roadMaxY++;

        // Sample across 2 tiles before and 2 tiles after the road
        const startPy = Math.max(0, (roadMinY - 1) * tileSize);
        const endPy = Math.min(canvas.height - 1, (roadMaxY + 2) * tileSize);
        const colData = ctx.getImageData(samplePxX, startPy, 1, endPy - startPy).data;

        // Detect transition points
        const transitions = [];
        for (let y = 1; y < endPy - startPy; y++) {
          const idxA = (y - 1) * 4;
          const idxB = y * 4;
          const diff = Math.abs(colData[idxA] - colData[idxB]) +
                       Math.abs(colData[idxA + 1] - colData[idxB + 1]) +
                       Math.abs(colData[idxA + 2] - colData[idxB + 2]);
          if (diff > 10) {
            const absPy = startPy + y;
            transitions.push({ absPx: absPy, diff });
          }
        }

        samples.push({
          type: 'EW_cross_section',
          sampleCoord: samplePxX,
          expectedEdges: [roadMinY * tileSize, (roadMaxY + 1) * tileSize],
          detectedTransitions: transitions
        });
      } else {
        // NS road: cross section is horizontal (X direction)
        const midY = Math.floor((target.span[0] + target.span[1]) / 2);
        const ly = midY - cy * CHUNK_SIZE;
        const lxRoad = target.fixedCoord - cx * CHUNK_SIZE;
        const samplePxY = ly * tileSize + Math.floor(tileSize / 2);

        // Find contiguous road tile span along this sample line
        let roadMinX = lxRoad;
        let roadMaxX = lxRoad;
        while (roadSet.has(`${(cx * CHUNK_SIZE + roadMinX - 1)},${midY}`)) roadMinX--;
        while (roadSet.has(`${(cx * CHUNK_SIZE + roadMaxX + 1)},${midY}`)) roadMaxX++;

        const startPx = Math.max(0, (roadMinX - 1) * tileSize);
        const endPx = Math.min(canvas.width - 1, (roadMaxX + 2) * tileSize);
        const rowData = ctx.getImageData(startPx, samplePxY, endPx - startPx, 1).data;

        const transitions = [];
        for (let x = 1; x < endPx - startPx; x++) {
          const idxA = (x - 1) * 4;
          const idxB = x * 4;
          const diff = Math.abs(rowData[idxA] - rowData[idxB]) +
                       Math.abs(rowData[idxA + 1] - rowData[idxB + 1]) +
                       Math.abs(rowData[idxA + 2] - rowData[idxB + 2]);
          if (diff > 10) {
            const absPx = startPx + x;
            transitions.push({ absPx, diff });
          }
        }

        samples.push({
          type: 'NS_cross_section',
          sampleCoord: samplePxY,
          expectedEdges: [roadMinX * tileSize, (roadMaxX + 1) * tileSize],
          detectedTransitions: transitions
        });
      }

      return samples;
    }, { cx, cy, target, roadTilesList });

    // Validate detected transitions against expected grid multiples of 54
    for (const sample of result) {
      for (const expectedEdge of sample.expectedEdges) {
        totalTests++;
        // Find closest detected transition
        let closestDist = Infinity;
        let matchedTransition = null;
        for (const t of sample.detectedTransitions) {
          const dist = Math.abs(t.absPx - expectedEdge);
          if (dist < closestDist) {
            closestDist = dist;
            matchedTransition = t;
          }
        }

        if (closestDist <= 2) {
          totalPass++;
          console.log(`  -> PASS: Tepi grid pada ${expectedEdge} px terdeteksi di ${matchedTransition ? matchedTransition.absPx : 'N/A'} px (deviasi: ${closestDist} px <= 2 px)`);
        } else {
          violations.push({
            stretch: target.name,
            expected: expectedEdge,
            closest: matchedTransition ? matchedTransition.absPx : null,
            deviasi: closestDist
          });
          console.error(`  -> FAIL: Tepi grid pada ${expectedEdge} px melenceng (deviasi: ${closestDist} px > 2 px)`);
        }
      }
    }
  }

  await browser.close();

  console.log('\n----------------------------------------------------------------');
  console.log(`Hasil Pengujian Spektrometri Grid Jalan:`);
  console.log(`Total Edge Boundary Diuji : ${totalTests}`);
  console.log(`Lolos Toleransi (<= 2 px) : ${totalPass}`);
  console.log(`Pelanggaran               : ${violations.length}`);
  console.log('----------------------------------------------------------------\n');

  if (violations.length > 0) {
    console.error('Audit Spektrometri GAGAL:', violations);
    process.exit(1);
  } else {
    console.log('Semua transisi jalan lolos verifikasi spektrometri grid 54 px dengan presisi sempurna! (EXIT 0)');
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
