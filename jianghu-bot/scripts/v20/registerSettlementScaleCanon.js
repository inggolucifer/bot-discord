const fs = require('fs');
const path = require('path');

const scaleCanonPath = path.resolve(__dirname, '../../web-dashboard/src/config/scaleCanon.json');
const settlementSpritesPath = path.resolve(__dirname, '../../world-data/settlement-sprites-v20.json');

const scaleCanon = JSON.parse(fs.readFileSync(scaleCanonPath, 'utf8'));
const settlementSprites = JSON.parse(fs.readFileSync(settlementSpritesPath, 'utf8'));

let added = 0;
let updated = 0;

for (const [key, sprite] of Object.entries(settlementSprites)) {
  const existing = scaleCanon[key];
  const entry = {
    id: key,
    page: sprite.page || 'settlement_0',
    category: 'settlement_marker',
    class: 'settlement_marker',
    srcW: 1024,
    srcH: 768,
    visualW: sprite.visualW,
    visualH: sprite.visualH,
    ratio: Math.round((sprite.visualH / sprite.visualW) * 10000) / 10000,
    collision: {
      w: sprite.collision.w,
      h: sprite.collision.h,
      mode: 'solid',
      offsetX: 0
    },
    pxPerTile: 100,
    anchor: {
      x: sprite.anchor?.x || 0.5,
      y: sprite.anchor?.y || 0.92
    },
    frameDefId: sprite.frameDefId,
    placeholder: sprite.placeholder || false,
    light: null
  };

  if (!existing) {
    scaleCanon[key] = entry;
    added++;
  } else {
    scaleCanon[key] = { ...existing, ...entry };
    updated++;
  }
}

fs.writeFileSync(scaleCanonPath, JSON.stringify(scaleCanon, null, 2), 'utf8');
console.log(`Registered settlement sprites to scaleCanon.json: ${added} added, ${updated} updated.`);
