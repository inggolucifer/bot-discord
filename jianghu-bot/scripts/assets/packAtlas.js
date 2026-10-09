/**
 * ASSET PIPELINE: ATLAS PACKER (scripts/assets/packAtlas.js)
 * Packs sprites into rectangular bin-packed atlases (<= 2048x2048) with JSON coordinate lookup.
 */

const fs = require('fs');
const path = require('path');

function packAtlasFrames(sprites, maxAtlasWidth = 2048) {
  // Sort sprites by height descending (Shelf bin-packing algorithm)
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

  const finalHeight = curY + rowHeight;

  return {
    meta: {
      app: 'Jianghu World Asset Pipeline',
      version: '2.0',
      size: { w: maxAtlasWidth, h: finalHeight },
      format: 'RGBA8888'
    },
    frames
  };
}

module.exports = { packAtlasFrames };

if (require.main === module) {
  console.log('Atlas Packer Loaded.');
}
