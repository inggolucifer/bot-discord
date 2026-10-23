/**
 * patchTreesAtlas.js
 * Ingests the 5 newly generated Song Dynasty Shan Shui tree assets into the WebP atlas textures:
 * 1. tree_willow_river (media_1792737499741.jpg) -> biome_nature_7 (v1-v6) & biome_nature_5 (willow_river_curve)
 * 2. tree_spirit_peach (media_1792737499843.jpg) -> biome_nature_7 (v1-v6) & core_0 (spirit_tree_2x2)
 * 3. tree_pine_ancient (media_1792737500001.jpg) -> biome_nature_7 (v1-v6) & core_1 (pine_tree_1x1)
 * 4. tree_cypress_frost (media_1792737500051.jpg) -> biome_nature_7 (v1-v6)
 * 5. tree_dead_wood (media_1792737500098.jpg) -> biome_nature_7 (v1-v6)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { processLuminanceKey } = require('./assets/luminanceKey');
const { calculateTrimBounds } = require('./assets/trimPadding');

const atlasDir = path.resolve(__dirname, '../web-dashboard/public/assets/atlas');
const uploadDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077/.user_uploaded';
const pickedDir = path.resolve(__dirname, '../assets_picked');

const INDEX_JSON = path.join(atlasDir, 'index.json');
const indexManifest = JSON.parse(fs.readFileSync(INDEX_JSON, 'utf8'));

// 1. Source image definition
const SOURCES = {
  tree_willow_river:  { file: 'media_1792737499741.jpg' },
  tree_spirit_peach:  { file: 'media_1792737499843.jpg' },
  tree_pine_ancient:  { file: 'media_1792737500001.jpg' },
  tree_cypress_frost: { file: 'media_1792737500051.jpg' },
  tree_dead_wood:     { file: 'media_1792737500098.jpg' },
};

// 2. Mapping from sprite ID to source key & variant index
const SPRITE_MAP = {
  // Willow river trees
  tree_willow_river_v1: { src: 'tree_willow_river', flip: false, scale: 1.0 },
  tree_willow_river_v2: { src: 'tree_willow_river', flip: true, scale: 0.96 },
  tree_willow_river_v3: { src: 'tree_willow_river', flip: false, scale: 0.92 },
  tree_willow_river_v4: { src: 'tree_willow_river', flip: true, scale: 1.0 },
  tree_willow_river_v5: { src: 'tree_willow_river', flip: false, scale: 0.95 },
  tree_willow_river_v6: { src: 'tree_willow_river', flip: true, scale: 0.90 },
  willow_river_curve:   { src: 'tree_willow_river', flip: false, scale: 1.0 },

  // Spirit peach trees
  tree_spirit_peach_v1: { src: 'tree_spirit_peach', flip: false, scale: 1.0 },
  tree_spirit_peach_v2: { src: 'tree_spirit_peach', flip: true, scale: 0.95 },
  tree_spirit_peach_v3: { src: 'tree_spirit_peach', flip: false, scale: 0.92 },
  tree_spirit_peach_v4: { src: 'tree_spirit_peach', flip: true, scale: 1.0 },
  tree_spirit_peach_v5: { src: 'tree_spirit_peach', flip: false, scale: 0.96 },
  tree_spirit_peach_v6: { src: 'tree_spirit_peach', flip: true, scale: 0.91 },
  spirit_tree_2x2:      { src: 'tree_spirit_peach', flip: false, scale: 1.0 },

  // Ancient pine trees
  tree_pine_ancient_v1: { src: 'tree_pine_ancient', flip: false, scale: 1.0 },
  tree_pine_ancient_v2: { src: 'tree_pine_ancient', flip: true, scale: 0.95 },
  tree_pine_ancient_v3: { src: 'tree_pine_ancient', flip: false, scale: 0.92 },
  tree_pine_ancient_v4: { src: 'tree_pine_ancient', flip: true, scale: 1.0 },
  tree_pine_ancient_v5: { src: 'tree_pine_ancient', flip: false, scale: 0.96 },
  tree_pine_ancient_v6: { src: 'tree_pine_ancient', flip: true, scale: 0.90 },
  pine_tree_1x1:        { src: 'tree_pine_ancient', flip: false, scale: 1.0 },

  // Frost cypress trees
  tree_cypress_frost_v1: { src: 'tree_cypress_frost', flip: false, scale: 1.0 },
  tree_cypress_frost_v2: { src: 'tree_cypress_frost', flip: true, scale: 0.95 },
  tree_cypress_frost_v3: { src: 'tree_cypress_frost', flip: false, scale: 0.92 },
  tree_cypress_frost_v4: { src: 'tree_cypress_frost', flip: true, scale: 1.0 },
  tree_cypress_frost_v5: { src: 'tree_cypress_frost', flip: false, scale: 0.96 },
  tree_cypress_frost_v6: { src: 'tree_cypress_frost', flip: true, scale: 0.90 },

  // Dead wood trees
  tree_dead_wood_v1:     { src: 'tree_dead_wood', flip: false, scale: 1.0 },
  tree_dead_wood_v2:     { src: 'tree_dead_wood', flip: true, scale: 0.95 },
  tree_dead_wood_v3:     { src: 'tree_dead_wood', flip: false, scale: 0.92 },
  tree_dead_wood_v4:     { src: 'tree_dead_wood', flip: true, scale: 1.0 },
  tree_dead_wood_v5:     { src: 'tree_dead_wood', flip: false, scale: 0.96 },
  tree_dead_wood_v6:     { src: 'tree_dead_wood', flip: true, scale: 0.90 },
};

async function prepareCleanSourceBuffers() {
  const cleanBuffers = {};

  for (const [key, item] of Object.entries(SOURCES)) {
    const rawPath = path.join(uploadDir, item.file);
    console.log(`[LuminanceKey] Processing ${key} (${item.file})...`);

    const { data, info } = await sharp(rawPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const keyedBuffer = processLuminanceKey(data, info.width, info.height, {
      colorDistThreshold: 24,
      allowInternalCavities: false,
      featherMargin: 18
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

    console.log(`\nPatching ${pageName}.webp (${pageInfo.width}x${pageInfo.height}) with ${sprites.length} tree sprites...`);

    // 1. Clear out old rectangle areas (erase procedural stick/ellipse drawings completely)
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
  console.log('=== STARTING TREE ASSET PATCH PIPELINE ===\n');
  const cleanBuffers = await prepareCleanSourceBuffers();
  await patchAtlasPages(cleanBuffers);
  console.log('\n=== ALL TREE ASSETS SUCCESSFULLY PATCHED! ===\n');
}

main().catch(err => {
  console.error('[FATAL] Patch error:', err);
  process.exit(1);
});
