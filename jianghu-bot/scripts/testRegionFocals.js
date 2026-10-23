const objectScatter = require('../utils/objectScatter');
const { getTileAt } = require('../utils/proceduralWorldEngine');
const { getRegionAt } = require('../utils/worldRegionEngine');

const candidates = {
  mist_insect_valley: [
    { x: 4100, y: 700 },
    { x: 4150, y: 750 },
    { x: 4200, y: 800 }
  ],
  frostmoon_sea: [
    { x: 3850, y: 4050 },
    { x: 3900, y: 4100 },
    { x: 3825, y: 4025 }
  ],
  floating_wind_isles: [
    { x: 4350, y: 2750 }, // Giant turtle island / reef
    { x: 4500, y: 2400 },
    { x: 4800, y: 2400 },
    { x: 4950, y: 2300 }
  ],
  eastern_sea: [
    { x: 3880, y: 2750 },
    { x: 3900, y: 2850 },
    { x: 4350, y: 2750 }
  ],
  spirit_wood_sea: [
    { x: 3500, y: 1400 },
    { x: 3600, y: 1500 },
    { x: 3800, y: 1400 },
    { x: 3700, y: 1600 }
  ]
};

for (const [regionId, coords] of Object.entries(candidates)) {
  console.log(`\n=== Testing ${regionId} ===`);
  for (const c of coords) {
    const cx = Math.floor(c.x / 32);
    const cy = Math.floor(c.y / 32);
    const objs = objectScatter.getChunkObjects(cx, cy);
    const vpObjs = objectScatter.getViewportObjects(c.x - 16, c.y - 16, c.x + 16, c.y + 16);
    const t = getTileAt(c.x, c.y);
    console.log(`  (${c.x}, ${c.y}) [chunk ${cx},${cy}]: terrain=${t.terrainType} -> chunkObjs=${objs.length}, vpObjs=${vpObjs.length}`);
  }
}
