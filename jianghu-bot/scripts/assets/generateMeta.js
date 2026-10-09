/**
 * ASSET PIPELINE: METADATA GENERATOR (scripts/assets/generateMeta.js)
 * Generates JSON metadata schema according to Jianghu World §3.2 Specification:
 * - id, atlas, frame, px {w, h}, footprint {cw, ch}, anchor {x, y}, overhangCells, collision, staminaMult, fogFoot, tags.
 */

const fs = require('fs');
const path = require('path');

function createObjectMetadata(config) {
  const {
    id,
    atlas = 'objects_nature',
    category = 'nature',
    width = 100,
    height = 200,
    cw = 1,
    ch = 1,
    collision = 'solid',
    staminaMult = 1.0,
    fogFoot = true,
    tags = []
  } = config;

  const cellRefPx = 100;
  const overhangCells = Math.max(0, +(height / cellRefPx - ch).toFixed(2));
  const anchorY = +(1.0 - (0.05 / Math.max(1, ch))).toFixed(2);

  return {
    id,
    atlas,
    frame: id,
    category,
    px: { w: width, h: height },
    footprint: { cw, ch },
    anchor: { x: 0.5, y: anchorY },
    overhangCells,
    collision,
    staminaMult,
    sortBias: 0,
    variants: [id],
    tint: { hueJitter: 3, valueJitter: 0.05 },
    flipX: true,
    fogFoot,
    tags: Array.from(new Set([...tags, category]))
  };
}

module.exports = { createObjectMetadata };

if (require.main === module) {
  console.log('Asset Metadata Helper Loaded.');
}
