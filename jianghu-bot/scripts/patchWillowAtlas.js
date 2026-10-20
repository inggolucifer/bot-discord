const sharp = require('../node_modules/sharp');
const path = require('path');
const fs = require('fs');

const ATLAS_PAGE = path.join(__dirname, '../web-dashboard/public/assets/atlas/biome_nature_7.webp');
const BACKUP_PAGE = path.join(__dirname, '../web-dashboard/public/assets/atlas/biome_nature_7.webp.bak');
const SOURCE_PNG = path.join(__dirname, '../willow_transparent.png');

const WILLOW_RECTS = [
  { id: 'tree_willow_river_v1', left: 888, top: 1249, width: 192, height: 192, flip: false, scale: 1.0 },
  { id: 'tree_willow_river_v2', left: 1082, top: 1249, width: 192, height: 192, flip: true, scale: 0.96 },
  { id: 'tree_willow_river_v3', left: 1276, top: 1249, width: 192, height: 192, flip: false, scale: 0.92 },
  { id: 'tree_willow_river_v4', left: 1470, top: 1249, width: 192, height: 192, flip: true, scale: 1.0 },
  { id: 'tree_willow_river_v5', left: 1664, top: 1249, width: 192, height: 192, flip: false, scale: 0.95 },
  { id: 'tree_willow_river_v6', left: 0, top: 1443, width: 192, height: 192, flip: true, scale: 0.90 }
];

async function patch() {
  if (!fs.existsSync(BACKUP_PAGE)) {
    fs.copyFileSync(ATLAS_PAGE, BACKUP_PAGE);
    console.log('Created backup:', BACKUP_PAGE);
  }

  // Load base atlas page
  const { data: pageData, info: pageInfo } = await sharp(BACKUP_PAGE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`Base atlas page: ${pageInfo.width}x${pageInfo.height}`);

  // 1. Zero out old willow rects (erase old black sticks completely)
  for (const rect of WILLOW_RECTS) {
    for (let dy = 0; dy < rect.height; dy++) {
      const py = rect.top + dy;
      if (py >= pageInfo.height) continue;
      for (let dx = 0; dx < rect.width; dx++) {
        const px = rect.left + dx;
        if (px >= pageInfo.width) continue;
        const idx = (py * pageInfo.width + px) * pageInfo.channels;
        pageData[idx] = 0;
        pageData[idx + 1] = 0;
        pageData[idx + 2] = 0;
        pageData[idx + 3] = 0;
      }
    }
  }

  // 2. Generate 6 sprite variants
  const composites = [];
  for (const rect of WILLOW_RECTS) {
    let pipeline = sharp(SOURCE_PNG).trim();

    if (rect.flip) {
      pipeline = pipeline.flop();
    }

    const targetInnerW = Math.round(184 * rect.scale);
    const targetInnerH = Math.round(184 * rect.scale);

    const variantBuffer = await pipeline
      .resize(targetInnerW, targetInnerH, { fit: 'inside' })
      .extend({
        top: Math.floor((192 - targetInnerH) / 2),
        bottom: Math.ceil((192 - targetInnerH) / 2),
        left: Math.floor((192 - targetInnerW) / 2),
        right: Math.ceil((192 - targetInnerW) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    composites.push({
      input: variantBuffer,
      left: rect.left,
      top: rect.top
    });
    console.log(`Prepared variant for ${rect.id} at [${rect.left}, ${rect.top}]`);
  }

  // 3. Save cleaned base to image buffer and composite variants
  const cleanedBase = await sharp(pageData, {
    raw: {
      width: pageInfo.width,
      height: pageInfo.height,
      channels: pageInfo.channels
    }
  })
    .composite(composites)
    .webp({ quality: 90, lossless: false })
    .toFile(ATLAS_PAGE);

  console.log(`\nSuccessfully patched biome_nature_7.webp! Size: ${cleanedBase.size} bytes`);
}

patch().catch(console.error);
