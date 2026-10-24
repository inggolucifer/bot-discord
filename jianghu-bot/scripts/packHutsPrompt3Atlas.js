/**
 * scripts/packHutsPrompt3Atlas.js
 * 
 * PROMPT 3 Master Integration Script:
 * 1. Reads 42 hut & ground prop entries from world-data/jianghu_hut_assets_v8.csv
 * 2. Ingests all 42 256x256 RGBA PNGs from assets_picked/
 * 3. Packs sprites into settlement_4.webp and settlement_4.json (<= 2048x2048)
 * 4. Integrates settlement_4 into atlas_index.json and index.json
 * 5. Rebuilds known-frames.json (via scripts/buildKnownFrames.js)
 * 6. Generates contact sheet at review/hut_contact_sheet.png
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const csvPath = path.join(rootDir, 'world-data/jianghu_hut_assets_v8.csv');
const pickedDir = path.join(rootDir, 'assets_picked');
const atlasDir = path.join(rootDir, 'web-dashboard/public/assets/atlas');
const reviewDir = path.join(rootDir, 'review');

if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

async function packHutsAtlas() {
  console.log('=== STARTING PROMPT 3: ATLAS PACKING & INTEGRATION ===\n');

  // 1. Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.trim().split('\n').slice(1);
  const items = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    // parse CSV with quotes
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const cols = [];
    let match;
    while ((match = regex.exec(line)) !== null && cols.length < 12) {
      let val = match[1] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      cols.push(val.trim());
      if (regex.lastIndex >= line.length) break;
    }

    const [id, archetype, name, palette, purpose, placement, cw, ch, colW, colH, enterable, biomes, prompt] = cols;
    items.push({
      id,
      archetype,
      name,
      palette,
      purpose,
      placement,
      cw: parseInt(cw) || 1,
      ch: parseInt(ch) || 1,
      colW: parseInt(colW) || 1,
      colH: parseInt(colH) || 1,
      enterable: enterable === 'true',
      biomes: (biomes || '').split(',').map(b => b.trim()),
      prompt
    });
  }

  console.log(`[INFO] Loaded ${items.length} assets from CSV.`);

  // 2. Validate all 42 PNG files exist in assets_picked
  for (const item of items) {
    const pngPath = path.join(pickedDir, `${item.id}.png`);
    if (!fs.existsSync(pngPath)) {
      throw new Error(`Asset not found in assets_picked/: ${item.id}.png`);
    }
  }
  console.log('[PASS] All 42 assets confirmed present in assets_picked/.');

  // 3. Compute shelf packing layout
  const MAX_ATLAS_WIDTH = 2048;
  const GUTTER = 2;
  const SPRITE_SIZE = 256;

  let curX = 0;
  let curY = 0;
  let rowHeight = 0;

  const framesManifest = {};
  const compositeLayers = [];

  for (const item of items) {
    if (curX + SPRITE_SIZE > MAX_ATLAS_WIDTH) {
      curX = 0;
      curY += rowHeight + GUTTER;
      rowHeight = 0;
    }

    const frameRect = {
      x: curX,
      y: curY,
      w: SPRITE_SIZE,
      h: SPRITE_SIZE
    };

    framesManifest[item.id] = {
      frame: frameRect,
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: SPRITE_SIZE, h: SPRITE_SIZE },
      sourceSize: { w: SPRITE_SIZE, h: SPRITE_SIZE },
      metadata: {
        id: item.id,
        atlas: 'settlement_4',
        frame: item.id,
        category: 'building',
        footprint: { cw: item.cw, ch: item.ch },
        anchor: { x: 0.5, y: 0.92 },
        collision: item.colW > 0 ? 'solid' : 'none',
        overhangCells: 0.5
      }
    };

    const pngBuffer = fs.readFileSync(path.join(pickedDir, `${item.id}.png`));
    compositeLayers.push({
      input: pngBuffer,
      top: curY,
      left: curX
    });

    curX += SPRITE_SIZE + GUTTER;
    if (SPRITE_SIZE > rowHeight) rowHeight = SPRITE_SIZE;
  }

  const finalAtlasHeight = curY + rowHeight;
  console.log(`[INFO] Atlas dimensions: ${MAX_ATLAS_WIDTH} x ${finalAtlasHeight} px`);

  // 4. Create master atlas image buffer
  const blankCanvas = await sharp({
    create: {
      width: MAX_ATLAS_WIDTH,
      height: finalAtlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(compositeLayers)
    .webp({ quality: 90, effort: 6 })
    .toBuffer();

  const webpOutputPath = path.join(atlasDir, 'settlement_4.webp');
  const jsonOutputPath = path.join(atlasDir, 'settlement_4.json');

  fs.writeFileSync(webpOutputPath, blankCanvas);
  console.log(`[PASS] Wrote settlement_4.webp (${(blankCanvas.length / 1024).toFixed(1)} KB)`);

  const settlement4Json = {
    meta: {
      app: 'Jianghu World Asset Pipeline V8',
      version: '8.0',
      size: { w: MAX_ATLAS_WIDTH, h: finalAtlasHeight },
      format: 'RGBA8888',
      image: 'settlement_4.webp'
    },
    frames: framesManifest
  };

  fs.writeFileSync(jsonOutputPath, JSON.stringify(settlement4Json, null, 2), 'utf8');
  console.log(`[PASS] Wrote settlement_4.json with ${Object.keys(framesManifest).length} frames.`);

  // 5. Update atlas_index.json & index.json
  const atlasIndexPaths = [
    path.join(atlasDir, 'atlas_index.json'),
    path.join(atlasDir, 'index.json')
  ];

  for (const idxPath of atlasIndexPaths) {
    const idxData = JSON.parse(fs.readFileSync(idxPath, 'utf8'));

    // Check or append page
    const existingPageIdx = idxData.pages.findIndex(p => p.name === 'settlement_4');
    const pageObj = {
      name: 'settlement_4',
      width: MAX_ATLAS_WIDTH,
      height: finalAtlasHeight,
      file: 'settlement_4.webp',
      json: 'settlement_4.json',
      decodedMb: +( (MAX_ATLAS_WIDTH * finalAtlasHeight * 4) / (1024 * 1024) ).toFixed(1)
    };

    if (existingPageIdx >= 0) {
      idxData.pages[existingPageIdx] = pageObj;
    } else {
      idxData.pages.push(pageObj);
    }

    // Add / update frames in frames mapping
    for (const [frameId, fData] of Object.entries(framesManifest)) {
      idxData.frames[frameId] = {
        page: 'settlement_4',
        frame: fData.frame,
        anchor: fData.metadata.anchor,
        footprint: fData.metadata.footprint,
        collision: fData.metadata.collision,
        overhangCells: fData.metadata.overhangCells
      };
    }

    idxData.totalFrames = Object.keys(idxData.frames).length;
    fs.writeFileSync(idxPath, JSON.stringify(idxData, null, 2), 'utf8');
    console.log(`[PASS] Updated ${path.basename(idxPath)}: total frames = ${idxData.totalFrames}`);
  }

  // 6. Run buildKnownFrames.js to register new frames in known-frames.json
  console.log('\n[INFO] Updating config/known-frames.json...');
  execSync('node scripts/buildKnownFrames.js', { cwd: rootDir, stdio: 'inherit' });

  // 7. Run buildScaleCanon.mjs to update scale-canon.json
  console.log('\n[INFO] Updating scale-canon.json...');
  execSync('node scripts/buildScaleCanon.mjs', { cwd: rootDir, stdio: 'inherit' });

  // 8. Generate Visual Contact Sheet (review/hut_contact_sheet.png)
  console.log('\n[INFO] Generating Visual Contact Sheet (review/hut_contact_sheet.png)...');
  await generateContactSheet(items);

  console.log('\n=== PROMPT 3 COMPLETED SUCCESSFULLY! ===\n');
}

async function generateContactSheet(items) {
  const COLS = 6;
  const ROWS = Math.ceil(items.length / COLS);
  const CELL_W = 256;
  const CELL_H = 256;
  const LABEL_H = 36;
  const PAD = 16;

  const totalW = COLS * (CELL_W + PAD) + PAD;
  const totalH = ROWS * (CELL_H + LABEL_H + PAD) + PAD;

  const layers = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    const x = PAD + col * (CELL_W + PAD);
    const y = PAD + row * (CELL_H + LABEL_H + PAD);

    // Sprite
    const spritePath = path.join(pickedDir, `${item.id}.png`);
    const spriteBuf = fs.readFileSync(spritePath);
    layers.push({
      input: spriteBuf,
      left: x,
      top: y
    });

    // Label banner
    const cleanId = item.id.replace('hut_', '').replace('prop_', '');
    const svgLabel = `
      <svg width="${CELL_W}" height="${LABEL_H}">
        <rect width="${CELL_W}" height="${LABEL_H}" rx="4" fill="#141a29" stroke="#3a4768" stroke-width="1"/>
        <text x="${CELL_W / 2}" y="15" font-family="monospace" font-size="11" font-weight="bold" fill="#e8c07d" text-anchor="middle">${cleanId}</text>
        <text x="${CELL_W / 2}" y="28" font-family="sans-serif" font-size="9" fill="#9db0d1" text-anchor="middle">${item.name}</text>
      </svg>
    `;
    const labelBuf = Buffer.from(svgLabel);
    layers.push({
      input: labelBuf,
      left: x,
      top: y + CELL_H + 2
    });
  }

  const contactSheet = await sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: { r: 10, g: 14, b: 24, alpha: 1 } // Deep Ink background
    }
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const outPath = path.join(reviewDir, 'hut_contact_sheet.png');
  fs.writeFileSync(outPath, contactSheet);
  console.log(`[PASS] Wrote contact sheet: ${outPath} (${(contactSheet.length / 1024).toFixed(1)} KB, ${totalW}x${totalH} px)`);
}

if (require.main === module) {
  packHutsAtlas().catch(err => {
    console.error('[FATAL ERROR]', err);
    process.exit(1);
  });
}

module.exports = { packHutsAtlas };
