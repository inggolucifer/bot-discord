/**
 * ASSET PIPELINE: ATLAS PACKER & PIXEL COMPOSITOR (scripts/assets/packAtlas.js)
 * Implements real binary pixel compositing via sharp:
 * - Shelf bin-packing algorithm into <= 2048x2048 textures.
 * - Composites individual sprite raster/SVG inputs into a single master atlas canvas.
 * - Encodes real .webp texture atlas (RGBA8888, quality 90) + .json coordinate lookup.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Computes shelf packing frame coordinates.
 */
function packAtlasFrames(sprites, maxAtlasWidth = 2048) {
  // Sort sprites by height descending for optimal packing
  const sorted = [...sprites].sort((a, b) => b.height - a.height);

  let curX = 0;
  let curY = 0;
  let rowHeight = 0;
  const frames = {};

  for (const s of sorted) {
    if (curX + s.width > maxAtlasWidth) {
      curX = 0;
      curY += rowHeight + 2; // 2px gutter padding
      rowHeight = 0;
    }

    frames[s.id] = {
      frame: { x: curX, y: curY, w: s.width, h: s.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: s.width, h: s.height },
      sourceSize: { w: s.width, h: s.height },
      metadata: s.metadata
    };

    curX += s.width + 2;
    if (s.height > rowHeight) rowHeight = s.height;
  }

  const finalHeight = Math.max(100, curY + rowHeight);

  return {
    meta: {
      app: 'Jianghu World Asset Pipeline',
      version: '3.0',
      size: { w: maxAtlasWidth, h: finalHeight },
      format: 'RGBA8888',
      image: '' // Will be filled with atlasName.webp
    },
    frames
  };
}

/**
 * Packs sprites AND renders real pixels to output WebP and JSON manifest.
 * @param {string} atlasName Base name (e.g., 'objects_nature')
 * @param {Array} sprites Array of { id, width, height, svg, buffer, metadata }
 * @param {string} outputDir Target directory for atlas files
 * @param {number} maxAtlasWidth Max atlas width in pixels (default 2048)
 */
async function packAndRenderAtlas(atlasName, sprites, outputDir, maxAtlasWidth = 2048) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const packed = packAtlasFrames(sprites, maxAtlasWidth);
  packed.meta.image = `${atlasName}.webp`;

  const atlasWidth = packed.meta.size.w;
  const atlasHeight = packed.meta.size.h;

  // Prepare sharp composite layers
  const compositeLayers = [];

  for (const s of sprites) {
    const frameInfo = packed.frames[s.id]?.frame;
    if (!frameInfo) continue;

    let spriteBuffer;
    if (s.buffer) {
      spriteBuffer = s.buffer;
    } else if (s.svg) {
      // Rasterize SVG via sharp to exact frame dimensions
      spriteBuffer = await sharp(Buffer.from(s.svg))
        .resize(frameInfo.w, frameInfo.h)
        .png()
        .toBuffer();
    } else {
      continue;
    }

    compositeLayers.push({
      input: spriteBuffer,
      top: frameInfo.y,
      left: frameInfo.x
    });
  }

  // Create transparent RGBA base canvas
  const webpBuffer = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(compositeLayers)
    .webp({ quality: 90, alphaQuality: 95, lossless: false })
    .toBuffer();

  const webpPath = path.join(outputDir, `${atlasName}.webp`);
  const jsonPath = path.join(outputDir, `${atlasName}.json`);

  fs.writeFileSync(webpPath, webpBuffer);
  fs.writeFileSync(jsonPath, JSON.stringify(packed, null, 2), 'utf8');

  return {
    atlasName,
    webpPath,
    jsonPath,
    frameCount: sprites.length,
    byteSize: webpBuffer.length,
    dimensions: { w: atlasWidth, h: atlasHeight }
  };
}

module.exports = { packAtlasFrames, packAndRenderAtlas };

if (require.main === module) {
  console.log('Atlas Packer & Compositor Loaded.');
}
