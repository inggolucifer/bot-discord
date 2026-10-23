/**
 * patchBatch3AndFixTrees.js
 * 
 * 1. Re-processes and fixes tree_pine_ancient and tree_cypress_frost with smart cavity keying
 *    to completely eliminate trapped white patches between branches on biome_nature_7.
 * 2. Processes the 5 new Batch 3 user assets:
 *    - bamboo_grove (media_1792738883104.jpg)
 *    - rock_cleft_stone (media_1792738883589.jpg)
 *    - building_farm_hut (media_1792738883679.jpg)
 *    - building_tea_pavilion (media_1792738883726.jpg) [Smart cavity keying: pillar/railing gaps 100% transparent]
 *    - rock_boulder_moss (media_1792738883856.jpg)
 * 3. Non-destructively patches atlas pages: biome_nature_7, core_1, settlement_0, settlement_3, biome_nature_5, core_0.
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

// 1. Source definitions with tailored keying parameters
const SOURCES = {
  tree_pine_ancient: {
    file: 'media_1792737500001.jpg',
    colorDistThreshold: 28,
    allowInternalCavities: true,
    minCavitySize: 15,
    featherMargin: 18
  },
  tree_cypress_frost: {
    file: 'media_1792737500051.jpg',
    colorDistThreshold: 28,
    allowInternalCavities: true,
    minCavitySize: 8,
    featherMargin: 18
  },
  bamboo_grove: {
    file: 'media_1792738883104.jpg',
    colorDistThreshold: 28,
    allowInternalCavities: true,
    minCavitySize: 15,
    featherMargin: 18
  },
  rock_cleft_stone: {
    file: 'media_1792738883589.jpg',
    colorDistThreshold: 26,
    allowInternalCavities: true,
    minCavitySize: 20,
    featherMargin: 18
  },
  building_farm_hut: {
    file: 'media_1792738883679.jpg',
    colorDistThreshold: 26,
    allowInternalCavities: false, // Solid building walls/thatch
    minCavitySize: 100,
    featherMargin: 18
  },
  building_tea_pavilion: {
    file: 'media_1792738883726.jpg',
    colorDistThreshold: 35,
    allowInternalCavities: true, // Wood pillar, railing, and ceiling gaps must be transparent!
    minCavitySize: 5,
    featherMargin: 18
  },
  rock_boulder_moss: {
    file: 'media_1792738883856.jpg',
    colorDistThreshold: 26,
    allowInternalCavities: true,
    minCavitySize: 20,
    featherMargin: 18
  }
};

// 2. Sprite mapping to atlas frame IDs
const SPRITE_MAP = {
  // --- Fixed Ancient Pine Trees (biome_nature_7 & core_1) ---
  tree_pine_ancient_v1: { src: 'tree_pine_ancient', flip: false, scale: 1.0 },
  tree_pine_ancient_v2: { src: 'tree_pine_ancient', flip: true, scale: 0.95 },
  tree_pine_ancient_v3: { src: 'tree_pine_ancient', flip: false, scale: 0.92 },
  tree_pine_ancient_v4: { src: 'tree_pine_ancient', flip: true, scale: 1.0 },
  tree_pine_ancient_v5: { src: 'tree_pine_ancient', flip: false, scale: 0.96 },
  tree_pine_ancient_v6: { src: 'tree_pine_ancient', flip: true, scale: 0.90 },
  pine_tree_1x1:        { src: 'tree_pine_ancient', flip: false, scale: 1.0 },

  // --- Fixed Frost Cypress Trees (biome_nature_7) ---
  tree_cypress_frost_v1: { src: 'tree_cypress_frost', flip: false, scale: 1.0 },
  tree_cypress_frost_v2: { src: 'tree_cypress_frost', flip: true, scale: 0.95 },
  tree_cypress_frost_v3: { src: 'tree_cypress_frost', flip: false, scale: 0.92 },
  tree_cypress_frost_v4: { src: 'tree_cypress_frost', flip: true, scale: 1.0 },
  tree_cypress_frost_v5: { src: 'tree_cypress_frost', flip: false, scale: 0.96 },
  tree_cypress_frost_v6: { src: 'tree_cypress_frost', flip: true, scale: 0.90 },

  // --- Bamboo Sprites (biome_nature_7, core_1, biome_nature_5, core_0) ---
  bamboo_jade_2x2_l_sparse:    { src: 'bamboo_grove', flip: false, scale: 1.0 },
  bamboo_jade_2x2_l_dense:     { src: 'bamboo_grove', flip: true, scale: 0.98 },
  bamboo_mist_2x2_l_sparse:    { src: 'bamboo_grove', flip: false, scale: 0.95 },
  bamboo_mist_2x2_l_dense:     { src: 'bamboo_grove', flip: true, scale: 0.93 },
  bamboo_dark_2x2_l_sparse:    { src: 'bamboo_grove', flip: false, scale: 0.96 },
  bamboo_dark_2x2_l_dense:     { src: 'bamboo_grove', flip: true, scale: 0.92 },
  nature_bamboo_sparse_single: { src: 'bamboo_grove', flip: false, scale: 0.95 },
  bamboo_jade_2x1_m_sparse:    { src: 'bamboo_grove', flip: false, scale: 1.0 },
  bamboo_jade_2x1_m_dense:     { src: 'bamboo_grove', flip: true, scale: 0.96 },
  bamboo_mist_2x1_m_sparse:    { src: 'bamboo_grove', flip: false, scale: 0.94 },
  bamboo_mist_2x1_m_dense:     { src: 'bamboo_grove', flip: true, scale: 0.92 },
  bamboo_dark_2x1_m_sparse:    { src: 'bamboo_grove', flip: false, scale: 0.95 },
  bamboo_dark_2x1_m_dense:     { src: 'bamboo_grove', flip: true, scale: 0.90 },
  bamboo_jade_1x1_s_sparse:    { src: 'bamboo_grove', flip: false, scale: 1.0 },
  bamboo_jade_1x1_s_dense:     { src: 'bamboo_grove', flip: true, scale: 0.96 },
  bamboo_mist_1x1_s_sparse:    { src: 'bamboo_grove', flip: false, scale: 0.94 },
  bamboo_mist_1x1_s_dense:     { src: 'bamboo_grove', flip: true, scale: 0.92 },
  bamboo_dark_1x1_s_sparse:    { src: 'bamboo_grove', flip: false, scale: 0.95 },
  bamboo_dark_1x1_s_dense:     { src: 'bamboo_grove', flip: true, scale: 0.90 },
  bamboo_clump_2x2:            { src: 'bamboo_grove', flip: false, scale: 1.0 },
  bamboo_clump_2x1:            { src: 'bamboo_grove', flip: true, scale: 1.0 },
  bamboo_clump_1x1:            { src: 'bamboo_grove', flip: false, scale: 1.0 },
  bamboo_forest_cluster:       { src: 'bamboo_grove', flip: false, scale: 1.0 },
  resource_ancient_lightning_bamboo: { src: 'bamboo_grove', flip: false, scale: 1.0 },

  // --- Cleft Spirit Rocks (biome_nature_7) ---
  rock_cleft_stone_v1: { src: 'rock_cleft_stone', flip: false, scale: 1.0 },
  rock_cleft_stone_v2: { src: 'rock_cleft_stone', flip: true, scale: 0.96 },
  rock_cleft_stone_v3: { src: 'rock_cleft_stone', flip: false, scale: 0.92 },
  rock_cleft_stone_v4: { src: 'rock_cleft_stone', flip: true, scale: 0.90 },

  // --- Mossy Boulders & Rock Crags (biome_nature_7 & biome_nature_5) ---
  rock_crag_cluster_v1:                { src: 'rock_boulder_moss', flip: false, scale: 1.0 },
  rock_crag_cluster_v2:                { src: 'rock_boulder_moss', flip: true, scale: 0.96 },
  rock_crag_cluster_v3:                { src: 'rock_boulder_moss', flip: false, scale: 0.92 },
  rock_crag_cluster_v4:                { src: 'rock_boulder_moss', flip: true, scale: 0.90 },
  rock_boulder_moss_v1:                { src: 'rock_boulder_moss', flip: false, scale: 1.0 },
  rock_boulder_moss_v2:                { src: 'rock_boulder_moss', flip: true, scale: 0.95 },
  rock_boulder_moss_v3:                { src: 'rock_boulder_moss', flip: false, scale: 0.92 },
  rock_boulder_moss_v4:                { src: 'rock_boulder_moss', flip: true, scale: 0.90 },
  nature_mossy_wild_stepping_boulders: { src: 'rock_boulder_moss', flip: false, scale: 1.0 },
  nature_granite_boulder_basking:      { src: 'rock_boulder_moss', flip: false, scale: 1.0 },
  nature_boulder_cluster_river:        { src: 'rock_boulder_moss', flip: true, scale: 0.95 },

  // --- Thatched Farmhouse Huts (settlement_3 & core_1) ---
  building_farm_hut_v1: { src: 'building_farm_hut', flip: false, scale: 1.0 },
  building_farm_hut_v2: { src: 'building_farm_hut', flip: true, scale: 0.96 },
  building_farm_hut_v3: { src: 'building_farm_hut', flip: false, scale: 0.92 },
  building_farm_hut_v4: { src: 'building_farm_hut', flip: true, scale: 0.90 },
  village_house_2x1:    { src: 'building_farm_hut', flip: false, scale: 1.0 },

  // --- Roadside Tea Pavilions (settlement_3, settlement_0, core_1) ---
  building_tea_pavilion_v1:                                  { src: 'building_tea_pavilion', flip: false, scale: 1.0 },
  building_tea_pavilion_v2:                                  { src: 'building_tea_pavilion', flip: true, scale: 0.96 },
  building_tea_pavilion_v3:                                  { src: 'building_tea_pavilion', flip: false, scale: 0.92 },
  building_tea_pavilion_v4:                                  { src: 'building_tea_pavilion', flip: true, scale: 0.90 },
  structure_scatter_roadside_tea_and_rest_pavilion_gazebo:   { src: 'building_tea_pavilion', flip: false, scale: 1.0 },
  pavilion_1x1:                                              { src: 'building_tea_pavilion', flip: false, scale: 1.0 }
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
  console.log('=== STARTING BATCH 3 & TREE CAVITY FIX PATCH PIPELINE ===\n');
  const cleanBuffers = await prepareCleanSourceBuffers();
  await patchAtlasPages(cleanBuffers);
  console.log('\n=== ALL BATCH 3 & TREE ASSETS SUCCESSFULLY PATCHED! ===\n');
}

main().catch(err => {
  console.error('[FATAL] Patch error:', err);
  process.exit(1);
});
