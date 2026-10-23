/**
 * patchMountainsAtlas.js
 * Ingests the 5 newly generated Song Dynasty Shan Shui mountain assets into the WebP atlas textures:
 * 1. mt_bastion_wall (media_1792735977123.jpg) -> biome_nature_3 (v1-v4) & core_0 (mt_rock_4x3)
 * 2. mt_twin_peaks (media_1792735977027.jpg) -> biome_nature_5 (v1-v6) & core_0 (mt_rock_3x2)
 * 3. azure_peak_crag (media_1792735976826.jpg) -> biome_nature_5 (azure_peak_crag), biome_nature_6 (v1-v4), biome_nature_7 (v5-v6), core_0 (mt_rock_2x2)
 * 4. mt_ridge_double (media_1792735977189.jpg) -> biome_nature_7 (v1-v6) & core_1 (mt_rock_2x1)
 * 5. mt_karst_pillar (media_1792735977043.jpg) -> biome_nature_7 (v1-v6) & core_1 (karst_pillar_1x1)
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
  mt_bastion_wall: { file: 'media_1792735977123.jpg' },
  mt_twin_peaks:   { file: 'media_1792735977027.jpg' },
  azure_peak_crag: { file: 'media_1792735976826.jpg' },
  mt_ridge_double: { file: 'media_1792735977189.jpg' },
  mt_karst_pillar: { file: 'media_1792735977043.jpg' },
};

// 2. Mapping from sprite ID to source key & variant index
const SPRITE_MAP = {
  // Bastion wall (Fortress cliffs)
  mt_bastion_wall_v1: { src: 'mt_bastion_wall', flip: false, scale: 1.0 },
  mt_bastion_wall_v2: { src: 'mt_bastion_wall', flip: true, scale: 0.96 },
  mt_bastion_wall_v3: { src: 'mt_bastion_wall', flip: false, scale: 0.93 },
  mt_bastion_wall_v4: { src: 'mt_bastion_wall', flip: true, scale: 0.98 },
  mt_rock_4x3:        { src: 'mt_bastion_wall', flip: false, scale: 1.0 },

  // Twin peaks (Majestic double peaks)
  mt_twin_peaks_v1:   { src: 'mt_twin_peaks', flip: false, scale: 1.0 },
  mt_twin_peaks_v2:   { src: 'mt_twin_peaks', flip: true, scale: 0.96 },
  mt_twin_peaks_v3:   { src: 'mt_twin_peaks', flip: false, scale: 0.92 },
  mt_twin_peaks_v4:   { src: 'mt_twin_peaks', flip: true, scale: 1.0 },
  mt_twin_peaks_v5:   { src: 'mt_twin_peaks', flip: false, scale: 0.95 },
  mt_twin_peaks_v6:   { src: 'mt_twin_peaks', flip: true, scale: 0.90 },
  mt_rock_3x2:        { src: 'mt_twin_peaks', flip: false, scale: 1.0 },

  // Azure peak & crags
  azure_peak_crag:    { src: 'azure_peak_crag', flip: false, scale: 1.0 },
  mt_azure_crag_v1:   { src: 'azure_peak_crag', flip: false, scale: 1.0 },
  mt_azure_crag_v2:   { src: 'azure_peak_crag', flip: true, scale: 0.95 },
  mt_azure_crag_v3:   { src: 'azure_peak_crag', flip: false, scale: 0.92 },
  mt_azure_crag_v4:   { src: 'azure_peak_crag', flip: true, scale: 1.0 },
  mt_azure_crag_v5:   { src: 'azure_peak_crag', flip: false, scale: 0.96 },
  mt_azure_crag_v6:   { src: 'azure_peak_crag', flip: true, scale: 0.93 },
  mt_rock_2x2:        { src: 'azure_peak_crag', flip: false, scale: 1.0 },

  // Ridge double
  mt_ridge_double_v1: { src: 'mt_ridge_double', flip: false, scale: 1.0 },
  mt_ridge_double_v2: { src: 'mt_ridge_double', flip: true, scale: 0.95 },
  mt_ridge_double_v3: { src: 'mt_ridge_double', flip: false, scale: 0.92 },
  mt_ridge_double_v4: { src: 'mt_ridge_double', flip: true, scale: 1.0 },
  mt_ridge_double_v5: { src: 'mt_ridge_double', flip: false, scale: 0.96 },
  mt_ridge_double_v6: { src: 'mt_ridge_double', flip: true, scale: 0.90 },
  mt_rock_2x1:        { src: 'mt_ridge_double', flip: false, scale: 1.0 },

  // Karst pillar
  mt_karst_pillar_v1: { src: 'mt_karst_pillar', flip: false, scale: 1.0 },
  mt_karst_pillar_v2: { src: 'mt_karst_pillar', flip: true, scale: 0.95 },
  mt_karst_pillar_v3: { src: 'mt_karst_pillar', flip: false, scale: 0.92 },
  mt_karst_pillar_v4: { src: 'mt_karst_pillar', flip: true, scale: 1.0 },
  mt_karst_pillar_v5: { src: 'mt_karst_pillar', flip: false, scale: 0.96 },
  mt_karst_pillar_v6: { src: 'mt_karst_pillar', flip: true, scale: 0.90 },
  karst_pillar_1x1:   { src: 'mt_karst_pillar', flip: false, scale: 1.0 },
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

    console.log(`\nPatching ${pageName}.webp (${pageInfo.width}x${pageInfo.height}) with ${sprites.length} sprites...`);

    // 1. Clear out old rectangle areas (erase procedural polygons completely)
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
  console.log('=== STARTING MOUNTAIN ASSET PATCH PIPELINE ===\n');
  const cleanBuffers = await prepareCleanSourceBuffers();
  await patchAtlasPages(cleanBuffers);
  console.log('\n=== ALL MOUNTAIN ASSETS SUCCESSFULLY PATCHED! ===\n');
}

main().catch(err => {
  console.error('[FATAL] Patch error:', err);
  process.exit(1);
});
