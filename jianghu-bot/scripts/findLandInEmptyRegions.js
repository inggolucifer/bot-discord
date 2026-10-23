const proceduralWorldEngine = require('../utils/proceduralWorldEngine');
const { getRegionAt } = require('../utils/worldRegionEngine');
const regions = JSON.parse(fs = require('fs').readFileSync('world-data/regions.json', 'utf8'));

const emptyRegions = ['venom_mire', 'spirit_wood_sea', 'mist_insect_valley', 'frostmoon_sea', 'floating_wind_isles', 'void_rift'];

for (const regId of emptyRegions) {
  const reg = regions.find(r => r.id === regId);
  if (!reg) continue;
  const b = reg.bounds;
  console.log(`\n=== Finding land in ${reg.name} (${regId}) [${b.minX}..${b.maxX}, ${b.minY}..${b.maxY}] ===`);
  
  const terrainCounts = {};
  let bestLandX = null, bestLandY = null, bestTerrain = null;

  for (let y = b.minY; y <= b.maxY; y += 40) {
    for (let x = b.minX; x <= b.maxX; x += 40) {
      const tile = proceduralWorldEngine.getTileAt(x, y);
      const tt = tile.terrainType || 'ocean';
      terrainCounts[tt] = (terrainCounts[tt] || 0) + 1;

      if (!bestLandX && tt !== 'ocean' && tt !== 'lake_deep' && tt !== 'lake_shallow' && tt !== 'river') {
        bestLandX = x;
        bestLandY = y;
        bestTerrain = tt;
      }
    }
  }

  console.log('Terrains found:', terrainCounts);
  if (bestLandX) {
    console.log(`Found land at (${bestLandX}, ${bestLandY}) terrain: ${bestTerrain}`);
  } else {
    console.log('Region is 100% water body!');
  }
}
