const fs = require('fs');
const path = require('path');

const scatterPath = path.resolve(__dirname, '../../utils/objectScatter.js');
let content = fs.readFileSync(scatterPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add top-level SSOT loading
const topImportTarget = `const MANMADE_SET = new Set(require('../world-data/manmade-defids-v20.json'));`;
const topImportRepl = `const MANMADE_SET = new Set(require('../world-data/manmade-defids-v20.json'));

const STANDALONE_HOMES = (() => {
  try {
    return require('../world-data/standalone-homes-v20.json');
  } catch (e) {
    return [];
  }
})();

const RUINS_DATA = (() => {
  try {
    return require('../world-data/ruins-v20.json');
  } catch (e) {
    return [];
  }
})();`;

if (content.includes(topImportTarget) && !content.includes('STANDALONE_HOMES')) {
  content = content.replace(topImportTarget, topImportRepl);
}

// 2. Replace Section 3 (old random hut generator) with SSOT loading
const startSec3 = `  // 3. Wilderness Huts Outside Villages & Companion Props (Prompt 4 SSOT)`;
const endSec3 = `  // 3.6 16x16 Quadrant Mini-Landmarks (Prompt V11 P5)`;

const pStart = content.indexOf(startSec3);
const pEnd = content.indexOf(endSec3);

if (pStart !== -1 && pEnd !== -1) {
  const replSec3 = `  // 3. V20 Authoritative Standalone Wilderness Homes & Ruins
  const homesInChunk = STANDALONE_HOMES.filter(h =>
    h.x >= startTileX && h.x <= endTileX &&
    h.y >= startTileY && h.y <= endTileY
  );

  for (const home of homesInChunk) {
    occupiedGrid.set(\`\${home.x},\${home.y}\`, home.id);
    objects.push({
      id: home.id,
      defId: home.defId,
      x: home.x,
      y: home.y,
      customLabel: home.houseName,
      occupantName: home.occupantName,
      profession: home.profession,
      dialog: home.dialog,
      collision: 'solid',
      cw: 1,
      ch: 1,
      tags: ['standalone_home', 'shelter', home.profession]
    });
  }

  const ruinsInChunk = RUINS_DATA.filter(r =>
    r.x >= startTileX && r.x <= endTileX &&
    r.y >= startTileY && r.y <= endTileY
  );

  for (const ruin of ruinsInChunk) {
    occupiedGrid.set(\`\${ruin.x},\${ruin.y}\`, ruin.id);
    objects.push({
      id: ruin.id,
      defId: ruin.defId,
      x: ruin.x,
      y: ruin.y,
      customLabel: ruin.name,
      kind: ruin.kind,
      collision: 'solid',
      cw: 1,
      ch: 1,
      tags: ['ruin', ruin.kind]
    });
  }

`;

  content = content.slice(0, pStart) + replSec3 + content.slice(pEnd);
  console.log('[P7] Replaced old random hut generator with V20 standalone homes and ruins.');
} else {
  console.error('[P7] Could not find Section 3 boundaries in objectScatter.js', pStart, pEnd);
}

fs.writeFileSync(scatterPath, content, 'utf8');
console.log('Saved objectScatter.js.');
