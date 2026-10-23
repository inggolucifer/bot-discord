const { getTileAt } = require('../utils/proceduralWorldEngine');
const { getRegionAt, REGIONS } = require('../utils/worldRegionEngine');
const worldData = require('../utils/worldData');

const targetRegions = ['mist_insect_valley', 'frostmoon_sea', 'floating_wind_isles', 'eastern_sea', 'spirit_wood_sea'];

for (const regId of targetRegions) {
  const reg = REGIONS.find(r => r.id === regId);
  const anchors = worldData.getAnchors().filter(a => a.regionId === regId);
  console.log('=== REGION:', regId, 'Bounds:', reg ? reg.bounds : 'none');
  console.log('  Anchors:', anchors.map(a => `${a.name} (${a.x}, ${a.y})`));
  
  if (reg && reg.bounds) {
    let landSamples = [];
    const step = 25;
    for (let y = reg.bounds.minY; y <= reg.bounds.maxY; y += step) {
      for (let x = reg.bounds.minX; x <= reg.bounds.maxX; x += step) {
        const t = getTileAt(x, y);
        if (t.terrainType !== 'ocean') {
          landSamples.push({ x, y, terrain: t.terrainType, label: t.label });
        }
      }
    }
    console.log('  Found', landSamples.length, 'land samples. First 5:', landSamples.slice(0, 5));
  }
}
