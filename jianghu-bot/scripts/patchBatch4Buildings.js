/**
 * patchBatch4Buildings.js
 * 
 * Ingests the 4 new Batch 4 architectural assets:
 * 1. building_road_inn (media_1792740719838.jpg) -> settlement_3 (v1-v4) & settlement_2 (building_inn_roadside)
 * 2. building_stone_torii (media_1792740719905.jpg) -> settlement_3 (v1-v4) & core_1 (stone_torii_1x1)
 * 3. building_sect_gate (media_1792740719951.jpg) -> settlement_3 (v1-v4, building_ancestral_shrine_gate) & core_1 (sect_gate_3x2)
 * 4. building_pagoda_tower (media_1792740719967.jpg) -> settlement_3 (v1-v4), core_0 (pagoda_2x2), settlement_0 (building_spirit_pagoda)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { processLuminanceKey } = require('./assets/luminanceKey');
const { calculateTrimBounds } = require('./assets/trimPadding');

const atlasDir = path.resolve(__dirname, '../web-dashboard/public/assets/atlas');
const uploadDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077/.user_uploaded';
const pickedDir = path.resolve(__dirname, '../assets_picked');
if (!fs.existsSync(pickedDir)) fs.mkdirSync(pickedDir, { recursive: true });

const INDEX_JSON = path.join(atlasDir, 'index.json');
const indexManifest = JSON.parse(fs.readFileSync(INDEX_JSON, 'utf8'));

// 1. Source definitions
const SOURCES = {
  building_road_inn: {
    file: 'media_1792740719838.jpg',
    colorDistThreshold: 28,
    allowInternalCavities: true,
    minCavitySize: 15,
    featherMargin: 18
  },
  building_stone_torii: {
    file: 'media_1792740719905.jpg',
    colorDistThreshold: 32,
    allowInternalCavities: true, // Archways must be transparent!
    minCavitySize: 10,
    featherMargin: 18
  },
  building_sect_gate: {
    file: 'media_1792740719951.jpg',
    colorDistThreshold: 32,
    allowInternalCavities: true, // Gateway opening must be transparent!
    minCavitySize: 10,
    featherMargin: 18
  },
  building_pagoda_tower: {
    file: 'media_1792740719967.jpg',
    colorDistThreshold: 26,
    allowInternalCavities: false, // Solid tower
    minCavitySize: 100,
    featherMargin: 18
  }
};

// 2. Sprite mapping to atlas frame IDs
const SPRITE_MAP = {
  // Roadside Inn / Tavern
  building_road_inn_v1:    { src: 'building_road_inn', flip: false, scale: 1.0 },
  building_road_inn_v2:    { src: 'building_road_inn', flip: true, scale: 0.96 },
  building_road_inn_v3:    { src: 'building_road_inn', flip: false, scale: 0.92 },
  building_road_inn_v4:    { src: 'building_road_inn', flip: true, scale: 0.90 },
  building_inn_roadside:   { src: 'building_road_inn', flip: false, scale: 1.0 },

  // Ancient Stone Torii / Arch Gate
  building_stone_torii_v1: { src: 'building_stone_torii', flip: false, scale: 1.0 },
  building_stone_torii_v2: { src: 'building_stone_torii', flip: true, scale: 0.96 },
  building_stone_torii_v3: { src: 'building_stone_torii', flip: false, scale: 0.92 },
  building_stone_torii_v4: { src: 'building_stone_torii', flip: true, scale: 0.90 },
  stone_torii_1x1:         { src: 'building_stone_torii', flip: false, scale: 1.0 },

  // Grand Sect Gate
  building_sect_gate_v1:          { src: 'building_sect_gate', flip: false, scale: 1.0 },
  building_sect_gate_v2:          { src: 'building_sect_gate', flip: true, scale: 0.96 },
  building_sect_gate_v3:          { src: 'building_sect_gate', flip: false, scale: 0.92 },
  building_sect_gate_v4:          { src: 'building_sect_gate', flip: true, scale: 0.90 },
  sect_gate_3x2:                  { src: 'building_sect_gate', flip: false, scale: 1.0 },
  building_ancestral_shrine_gate: { src: 'building_sect_gate', flip: false, scale: 1.0 },

  // Multi-tiered Pagoda Tower
  building_pagoda_tower_v1: { src: 'building_pagoda_tower', flip: false, scale: 1.0 },
  building_pagoda_tower_v2: { src: 'building_pagoda_tower', flip: true, scale: 0.96 },
  building_pagoda_tower_v3: { src: 'building_pagoda_tower', flip: false, scale: 0.92 },
  building_pagoda_tower_v4: { src: 'building_pagoda_tower', flip: true, scale: 0.90 },
  pagoda_2x2:               { src: 'building_pagoda_tower', flip: false, scale: 1.0 },
  building_spirit_pagoda:   { src: 'building_pagoda_tower', flip: false, scale: 1.0 }
};

async function prepareCleanSourceBuffers() {
  const cleanBuffers = {};

  for (const [key, cfg] of Object.entries(SOURCES)) {
    const rawPath = path.join(uploadDir, cfg.file);
    console.log(`[LuminanceKey] Processing ${key} (${cfg.file})...`);

    const { data, info } = await sharp(rawPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const keyedBuffer = processLuminanceKey(data, info.width, info.height, {
      colorDistThreshold: cfg.colorDistThreshold,
      allowInternalCavities: cfg.allowInternalCavities,
      minCavitySize: cfg.minCavitySize,
      featherMargin: cfg.featherMargin
    });

    const bounds = calculateTrimBounds(keyedBuffer, info.width, info.height, 10, 4);

    const trimmedPng = await sharp(keyedBuffer, {
      raw: { width: info.width, height: info.height, channels: 4 }
    })
      .extract({ left: bounds.minX, top: bounds.minY, width: bounds.width, height: bounds.height })
      .png()
      .toBuffer();

    const outPickedPath = path.join(pickedDir, `${key}_clean.png`);
    fs.writeFileSync(outPickedPath, trimmedPng);
    console.log(`  -> Trimmed to ${bounds.width}x${bounds.height}, saved to ${outPickedPath}`);

    cleanBuffers[key] = trimmedPng;
  }

  return cleanBuffers;
}

async function patchAtlasPages(cleanBuffers) {
  // Group targets by atlas page
  const pageGroups = {};

  for (const [spriteId, config] of Object.entries(SPRITE_MAP)) {
    const frameMeta = indexManifest.frames[spriteId];
    if (!frameMeta) {
      console.warn(`[WARN] Sprite ${spriteId} not found in index.json! Skipping.`);
      continue;
    }

    const page = frameMeta.page;
    if (!pageGroups[page]) pageGroups[page] = [];
    pageGroups[page].push({
      id: spriteId,
      rect: frameMeta.frame,
      ...config
    });
  }

  console.log('\n[PATCH] Atlas Pages to update:', Object.keys(pageGroups));

  for (const [pageName, sprites] of Object.entries(pageGroups)) {
    const pageWebp = path.join(atlasDir, `${pageName}.webp`);
    const pageBak = path.join(atlasDir, `${pageName}.webp.bak`);

    if (!fs.existsSync(pageWebp)) {
      console.error(`[ERR] Atlas page not found: ${pageWebp}`);
      continue;
    }

    if (!fs.existsSync(pageBak)) {
      fs.copyFileSync(pageWebp, pageBak);
      console.log(`[BACKUP] Created ${pageName}.webp.bak`);
    }

    const { data: pageData, info: pageInfo } = await sharp(pageWebp)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log(`\nPatching ${pageName}.webp (${pageInfo.width}x${pageInfo.height}) with ${sprites.length} sprites...`);

    // 1. Clear out old rectangle areas (erase placeholder stick/polygon drawings completely)
    for (const s of sprites) {
      const { x, y, w, h } = s.rect;
      for (let dy = 0; dy < h; dy++) {
        const py = y + dy;
        if (py >= pageInfo.height) continue;
        for (let dx = 0; dx < w; dx++) {
          const px = x + dx;
          if (px >= pageInfo.width) continue;
          const idx = (py * pageInfo.width + px) * pageInfo.channels;
          pageData[idx] = 0;
          pageData[idx + 1] = 0;
          pageData[idx + 2] = 0;
          pageData[idx + 3] = 0;
        }
      }
    }

    // 2. Prepare sharp composites for each sprite
    const composites = [];
    for (const s of sprites) {
      const srcBuf = cleanBuffers[s.src];
      if (!srcBuf) continue;

      let pipe = sharp(srcBuf);
      if (s.flip) pipe = pipe.flop();

      const { w, h, x, y } = s.rect;
      const targetW = Math.max(10, Math.round((w - 4) * s.scale));
      const targetH = Math.max(10, Math.round((h - 4) * s.scale));

      // Resize fitting inside bounding rect and anchoring to bottom-center
      const resizedBuf = await pipe
        .resize(targetW, targetH, { fit: 'inside' })
        .png()
        .toBuffer();

      const resizedMeta = await sharp(resizedBuf).metadata();
      const actualW = resizedMeta.width;
      const actualH = resizedMeta.height;

      // Bottom-aligned, horizontally centered in slot
      const posX = x + Math.floor((w - actualW) / 2);
      const posY = y + (h - actualH);

      composites.push({
        input: resizedBuf,
        left: posX,
        top: posY
      });

      console.log(`  -> Composite: ${s.id} [${actualW}x${actualH}] at (${posX}, ${posY})`);
    }

    // 3. Write patched WebP
    sharp.cache(false);
    const patchedResult = await sharp(pageData, {
      raw: {
        width: pageInfo.width,
        height: pageInfo.height,
        channels: pageInfo.channels
      }
    })
      .composite(composites)
      .webp({ quality: 92, lossless: false })
      .toFile(pageWebp);

    console.log(`[SUCCESS] Patched ${pageName}.webp (${(patchedResult.size / 1024).toFixed(1)} KB)`);
  }
}

async function main() {
  console.log('=== STARTING BATCH 4 ARCHITECTURAL BUILDINGS PATCH PIPELINE ===\n');
  const cleanBuffers = await prepareCleanSourceBuffers();
  await patchAtlasPages(cleanBuffers);
  console.log('\n=== ALL BATCH 4 BUILDINGS SUCCESSFULLY PATCHED! ===\n');
}

main().catch(err => {
  console.error('[FATAL] Patch error:', err);
  process.exit(1);
});
