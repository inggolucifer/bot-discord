/**
 * scripts/packMasterV9Assets.js
 * Master atlas packing & integration script for:
 * 1. 8 Water Scene Assets -> scenes_water_0.webp & scenes_water_0.json
 * 2. 11 High-Res Assets -> biome_highres_0.webp & biome_highres_0.json
 * 3. Master atlas index update (index.json & atlas_index.json)
 * 4. scale-canon.json update
 * 5. frame-substitutions-v9.json update
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const atlasDir = path.join(rootDir, 'web-dashboard/public/assets/atlas');
const waterDir = path.join(rootDir, 'world-data/assets_water');
const highresDir = path.join(rootDir, 'world-data/assets_highres');

const WATER_SPECS = [
  { id: 'ancient_submerged_stone_bridge', file: 'ancient_submerged_stone_bridge.png', cw: 4, ch: 3, visualW: 4, visualH: 3, maxH: 600, category: 'water_scene' },
  { id: 'celestial_floating_wind_pagoda_shrine', file: 'celestial_floating_wind_pagoda_shrine.png', cw: 4, ch: 4, visualW: 4, visualH: 5, maxH: 620, category: 'water_scene' },
  { id: 'floating_cloud_rock_isle', file: 'floating_cloud_rock_isle.png', cw: 4, ch: 4, visualW: 4, visualH: 4, maxH: 600, category: 'water_scene' },
  { id: 'ghost_ship_frozen_ice_wreck', file: 'ghost_ship_frozen_ice_wreck.png', cw: 4, ch: 3, visualW: 5, visualH: 4, maxH: 600, category: 'water_scene' },
  { id: 'glacial_iceberg_floating', file: 'glacial_iceberg_floating.png', cw: 4, ch: 4, visualW: 4, visualH: 4, maxH: 600, category: 'water_scene' },
  { id: 'leviathan_spine_arch_reef', file: 'leviathan_spine_arch_reef.png', cw: 4, ch: 3, visualW: 5, visualH: 4, maxH: 600, category: 'water_scene' },
  { id: 'sea_dragon_skeleton_remnant', file: 'sea_dragon_skeleton_remnant.png', cw: 4, ch: 3, visualW: 5, visualH: 4, maxH: 600, category: 'water_scene' },
  { id: 'sea_shipwreck_abandoned', file: 'sea_shipwreck_abandoned.png', cw: 4, ch: 3, visualW: 5, visualH: 4, maxH: 600, category: 'water_scene' }
];

const HIGHRES_SPECS = [
  { id: 'mt_bastion_wall', file: 'mt_bastion_wall.png', cw: 5, ch: 4, visualW: 5, visualH: 4.5, maxH: 480, category: 'mountain', variants: ['mt_bastion_wall_v1', 'mt_bastion_wall_v2', 'mt_bastion_wall_v3', 'mt_bastion_wall_v4'] },
  { id: 'mt_ridge_double', file: 'mt_ridge_double.png', cw: 5, ch: 4, visualW: 5, visualH: 4, maxH: 460, category: 'mountain', variants: ['mt_ridge_double_v1', 'mt_ridge_double_v2', 'mt_ridge_double_v3', 'mt_ridge_double_v4', 'mt_ridge_double_v5', 'mt_ridge_double_v6'] },
  { id: 'mt_twin_peaks', file: 'mt_twin_peaks.png', cw: 4, ch: 4, visualW: 4, visualH: 4, maxH: 460, category: 'mountain', variants: ['mt_twin_peaks_v1', 'mt_twin_peaks_v2', 'mt_twin_peaks_v3', 'mt_twin_peaks_v4', 'mt_twin_peaks_v5', 'mt_twin_peaks_v6'] },
  { id: 'pagoda_2x2', file: 'pagoda_2x2.png', cw: 4, ch: 4, visualW: 4, visualH: 6, maxH: 490, category: 'building', variants: ['building_spirit_pagoda', 'building_pagoda_tower'] },
  { id: 'landmark_azure_mountain_sword_peak_monolith', file: 'landmark_azure_mountain_sword_peak_monolith.png', cw: 3, ch: 3, visualW: 3, visualH: 5.5, maxH: 490, category: 'landmark', variants: [] },
  { id: 'landmark_thundersteppe_lightning_attractor_pillar', file: 'landmark_thundersteppe_lightning_attractor_pillar.png', cw: 3, ch: 3, visualW: 2.5, visualH: 5, maxH: 490, category: 'landmark', variants: [] },
  { id: 'mt_karst_pillar', file: 'mt_karst_pillar.png', cw: 2, ch: 2, visualW: 2.5, visualH: 5, maxH: 480, category: 'mountain', variants: ['mt_karst_pillar_v1', 'mt_karst_pillar_v2', 'mt_karst_pillar_v3', 'mt_karst_pillar_v4', 'mt_karst_pillar_v5', 'mt_karst_pillar_v6'] },
  { id: 'karst_pillar_1x1', file: 'karst_pillar_1x1.png', cw: 1, ch: 1, visualW: 1.5, visualH: 4, maxH: 480, category: 'mountain', variants: [] },
  { id: 'tree_pine_ancient', file: 'tree_pine_ancient.png', cw: 2, ch: 2, visualW: 2.5, visualH: 3.5, maxH: 440, category: 'tree', variants: ['tree_pine_ancient_v1', 'tree_pine_ancient_v2', 'tree_pine_ancient_v3', 'tree_pine_ancient_v4', 'tree_pine_ancient_v5', 'tree_pine_ancient_v6'] },
  { id: 'tree_cypress_frost', file: 'tree_cypress_frost.png', cw: 2, ch: 2, visualW: 2, visualH: 3.5, maxH: 440, category: 'tree', variants: ['tree_cypress_frost_v1', 'tree_cypress_frost_v2', 'tree_cypress_frost_v3', 'tree_cypress_frost_v4', 'tree_cypress_frost_v5'] },
  { id: 'tree_dead_wood', file: 'tree_dead_wood.png', cw: 2, ch: 2, visualW: 2, visualH: 3.5, maxH: 440, category: 'tree', variants: ['tree_dead_wood_v1', 'tree_dead_wood_v2', 'tree_dead_wood_v3', 'tree_dead_wood_v4', 'tree_dead_wood_v5', 'tree_dead_wood_v6'] }
];

async function packPage(pageName, items, srcBaseDir, colsCount = 3) {
  console.log(`\n=== PACKING ATLAS PAGE: ${pageName} ===`);
  const MAX_W = 2048;
  const GUTTER = 8;
  
  // 1. Resize sprites if needed
  const prepared = [];
  for (const item of items) {
    const srcPath = path.join(srcBaseDir, item.file);
    const orig = sharp(srcPath);
    const meta = await orig.metadata();
    
    let targetW = meta.width;
    let targetH = meta.height;
    
    if (item.maxH && meta.height > item.maxH) {
      const scale = item.maxH / meta.height;
      targetH = Math.round(meta.height * scale);
      targetW = Math.round(meta.width * scale);
    }
    
    // Fit column limit
    const colMaxW = Math.floor((MAX_W - (colsCount + 1) * GUTTER) / colsCount);
    if (targetW > colMaxW) {
      const scale = colMaxW / targetW;
      targetW = colMaxW;
      targetH = Math.round(targetH * scale);
    }
    
    const buf = await orig.resize(targetW, targetH).png().toBuffer();
    prepared.push({
      ...item,
      buf,
      w: targetW,
      h: targetH
    });
  }
  
  // 2. Shelf packing
  let curX = GUTTER;
  let curY = GUTTER;
  let rowH = 0;
  const placements = [];
  const compositeLayers = [];
  
  for (const p of prepared) {
    if (curX + p.w + GUTTER > MAX_W) {
      curX = GUTTER;
      curY += rowH + GUTTER;
      rowH = 0;
    }
    
    placements.push({
      ...p,
      x: curX,
      y: curY
    });
    
    compositeLayers.push({
      input: p.buf,
      left: curX,
      top: curY
    });
    
    curX += p.w + GUTTER;
    if (p.h > rowH) rowH = p.h;
  }
  
  const finalH = curY + rowH + GUTTER;
  console.log(`Atlas canvas size: ${MAX_W} x ${finalH} px`);
  
  // 3. Create WebP
  const canvasBuffer = await sharp({
    create: {
      width: MAX_W,
      height: finalH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(compositeLayers)
    .webp({ quality: 90, effort: 6 })
    .toBuffer();
    
  const webpPath = path.join(atlasDir, `${pageName}.webp`);
  const jsonPath = path.join(atlasDir, `${pageName}.json`);
  
  fs.writeFileSync(webpPath, canvasBuffer);
  console.log(`-> Wrote ${pageName}.webp (${(canvasBuffer.length / 1024).toFixed(1)} KB)`);
  
  // 4. Create Page JSON
  const framesDict = {};
  for (const pl of placements) {
    framesDict[pl.id] = {
      frame: { x: pl.x, y: pl.y, w: pl.w, h: pl.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: pl.w, h: pl.h },
      sourceSize: { w: pl.w, h: pl.h },
      metadata: {
        id: pl.id,
        atlas: pageName,
        frame: pl.id,
        category: pl.category,
        footprint: { cw: pl.cw, ch: pl.ch },
        anchor: { x: 0.5, y: 0.95 },
        collision: pl.category === 'tree' ? 'soft' : 'solid',
        overhangCells: 0.8
      }
    };
    
    // Register variants if any
    if (pl.variants) {
      for (const vId of pl.variants) {
        framesDict[vId] = {
          ...framesDict[pl.id],
          metadata: {
            ...framesDict[pl.id].metadata,
            id: vId,
            frame: vId
          }
        };
      }
    }
  }
  
  const pageJson = {
    meta: {
      app: 'Jianghu World V9 Master Asset Pipeline',
      version: '9.0',
      size: { w: MAX_W, h: finalH },
      format: 'RGBA8888',
      image: `${pageName}.webp`
    },
    frames: framesDict
  };
  
  fs.writeFileSync(jsonPath, JSON.stringify(pageJson, null, 2), 'utf8');
  console.log(`-> Wrote ${pageName}.json with ${Object.keys(framesDict).length} frames`);
  
  return { pageName, width: MAX_W, height: finalH, file: `${pageName}.webp`, json: `${pageName}.json`, frames: framesDict };
}

async function main() {
  console.log('=== STARTING MASTER V9 ATLAS PACKING ===');
  
  // 1. Pack Water Scenes
  const waterResult = await packPage('scenes_water_0', WATER_SPECS, waterDir, 3);
  
  // 2. Pack High-Res Mountain & Trees
  const highresResult = await packPage('biome_highres_0', HIGHRES_SPECS, highresDir, 4);
  
  // 3. Update atlas_index.json and index.json
  const indexFiles = [
    path.join(atlasDir, 'atlas_index.json'),
    path.join(atlasDir, 'index.json')
  ];
  
  const newPages = [
    {
      name: waterResult.pageName,
      width: waterResult.width,
      height: waterResult.height,
      file: waterResult.file,
      json: waterResult.json,
      decodedMb: +( (waterResult.width * waterResult.height * 4) / (1024 * 1024) ).toFixed(1)
    },
    {
      name: highresResult.pageName,
      width: highresResult.width,
      height: highresResult.height,
      file: highresResult.file,
      json: highresResult.json,
      decodedMb: +( (highresResult.width * highresResult.height * 4) / (1024 * 1024) ).toFixed(1)
    }
  ];
  
  for (const idxFile of indexFiles) {
    if (!fs.existsSync(idxFile)) continue;
    const idxData = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
    
    // Add / update pages
    for (const np of newPages) {
      const existing = idxData.pages.findIndex(p => p.name === np.name);
      if (existing >= 0) {
        idxData.pages[existing] = np;
      } else {
        idxData.pages.push(np);
      }
    }
    
    // Register all frames
    for (const res of [waterResult, highresResult]) {
      for (const [fId, fObj] of Object.entries(res.frames)) {
        idxData.frames[fId] = {
          page: res.pageName,
          frame: fObj.frame,
          anchor: fObj.metadata.anchor,
          footprint: fObj.metadata.footprint,
          collision: fObj.metadata.collision,
          overhangCells: fObj.metadata.overhangCells
        };
      }
    }
    
    idxData.totalFrames = Object.keys(idxData.frames).length;
    fs.writeFileSync(idxFile, JSON.stringify(idxData, null, 2), 'utf8');
    console.log(`[PASS] Updated ${path.basename(idxFile)}: ${idxData.totalFrames} total frames`);
  }
  
  // 4. Update scaleCanon.json
  const scaleCanonPath = path.join(rootDir, 'world-data/scale-canon.json');
  const dashCanonPath = path.join(rootDir, 'web-dashboard/src/config/scaleCanon.json');
  const scaleCanon = JSON.parse(fs.readFileSync(scaleCanonPath, 'utf8'));
  
  const allSpecs = [...WATER_SPECS, ...HIGHRES_SPECS];
  for (const s of allSpecs) {
    const fObj = waterResult.frames[s.id] || highresResult.frames[s.id];
    if (fObj) {
      const pxPerTile = +(fObj.frame.w / s.visualW).toFixed(1);
      scaleCanon[s.id] = {
        id: s.id,
        page: fObj.metadata.atlas,
        category: s.category,
        srcW: fObj.frame.w,
        srcH: fObj.frame.h,
        visualW: s.visualW,
        visualH: s.visualH,
        pxPerTile,
        anchor: fObj.metadata.anchor,
        collision: fObj.metadata.collision
      };
      
      if (s.variants) {
        for (const v of s.variants) {
          scaleCanon[v] = {
            ...scaleCanon[s.id],
            id: v
          };
        }
      }
    }
  }
  
  fs.writeFileSync(scaleCanonPath, JSON.stringify(scaleCanon, null, 2), 'utf8');
  if (fs.existsSync(dashCanonPath)) {
    fs.writeFileSync(dashCanonPath, JSON.stringify(scaleCanon, null, 2), 'utf8');
  }
  console.log('[PASS] Updated scaleCanon.json');
  
  // 5. Update frame-substitutions-v9.json
  const substPath = path.join(rootDir, 'world-data/frame-substitutions-v9.json');
  if (fs.existsSync(substPath)) {
    const subst = JSON.parse(fs.readFileSync(substPath, 'utf8'));
    // Redirect substituted keys directly to their new high-res versions
    for (const s of HIGHRES_SPECS) {
      if (s.variants) {
        for (const v of s.variants) {
          subst[v] = s.id;
        }
      }
      subst[s.id] = s.id;
    }
    fs.writeFileSync(substPath, JSON.stringify(subst, null, 2), 'utf8');
    console.log('[PASS] Updated frame-substitutions-v9.json');
  }
  
  console.log('\n[PASS] ALL NEW V9 MASTER ASSETS INTEGRATED 100%!');
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
