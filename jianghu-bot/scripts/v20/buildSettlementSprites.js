const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const ANCHORS_PATH = path.join(BOT_ROOT, 'world-data/anchors.json');
const OUT_PATH = path.join(BOT_ROOT, 'world-data/settlement-sprites-v20.json');

console.log('[SPRITES] Membangun settlement-sprites-v20.json...');

const anchors = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));

// Standard visual multipliers per tier class (Section 3.1)
const TIER_VISUALS = {
  hamlet: { visualW: 3.0, visualH: 2.6, frame: 'xitong_city_landmark' },
  village: { visualW: 4.6, visualH: 4.0, frame: 'xitong_city_landmark' },
  town: { visualW: 5.6, visualH: 4.6, frame: 'xitong_city_landmark' },
  major_city: { visualW: 8.0, visualH: 6.5, frame: 'landmark_border_march_iron_garrison_gatehouse' },
  capital_city: { visualW: 11.0, visualH: 8.5, frame: 'landmark_border_march_iron_garrison_gatehouse' },
  sect: { visualW: 8.0, visualH: 7.0, frame: 'building_spirit_pagoda' },
  outpost: { visualW: 5.0, visualH: 3.6, frame: 'landmark_border_march_iron_garrison_gatehouse' },
  port: { visualW: 6.5, visualH: 5.0, frame: 'xitong_city_landmark' },
  island: { visualW: 6.0, visualH: 5.0, frame: 'building_spirit_pagoda' },
  secret_realm: { visualW: 3.5, visualH: 3.0, frame: 'building_spirit_pagoda' },
  danger_zone: { visualW: 5.0, visualH: 4.0, frame: 'landmark_border_march_iron_garrison_gatehouse' }
};

const sprites = {};

for (const a of anchors) {
  const markerDefId = a.v20?.markerDefId;
  if (!markerDefId) continue;

  if (sprites[markerDefId]) continue; // already defined

  const tier = a.type || 'village';
  const tierConfig = TIER_VISUALS[tier] || TIER_VISUALS.village;
  const spanW = a.spanWidth || 3;
  const spanH = a.spanHeight || 3;

  sprites[markerDefId] = {
    id: markerDefId,
    page: 'core_0',
    frameDefId: tierConfig.frame,
    placeholder: true,
    visualW: tierConfig.visualW,
    visualH: tierConfig.visualH,
    collision: {
      w: spanW,
      h: Math.max(1, spanH - 1),
      mode: 'solid'
    },
    anchor: {
      x: 0.5,
      y: 0.92
    },
    ambient: [
      { defId: 'prop_stone_lantern', dx: -1, dy: spanH - 1 }
    ]
  };
}

fs.writeFileSync(OUT_PATH, JSON.stringify(sprites, null, 2), 'utf8');
console.log(`[SPRITES] Berhasil mendaftarkan ${Object.keys(sprites).length} definisi marker sprite di ${OUT_PATH}!`);
