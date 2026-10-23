const proceduralWorldEngine = require('../utils/proceduralWorldEngine');
const { getRegionAt } = require('../utils/worldRegionEngine');
const objectScatter = require('../utils/objectScatter');

const TARGETS = [
  { id: 'central_plains', x: 2050, y: 2650 },
  { id: 'nine_springs_delta', x: 2400, y: 2450 },
  { id: 'azure_mountain_range', x: 2200, y: 3340 },
  { id: 'northern_desolate', x: 2120, y: 4180 },
  { id: 'thundersteppe', x: 2400, y: 4000 },
  { id: 'godthunder_peaks', x: 3540, y: 4500 },
  { id: 'mirror_lake', x: 3100, y: 3100 },
  { id: 'beast_prairies', x: 1400, y: 3800 },
  { id: 'western_sacred_desert', x: 820, y: 2220 },
  { id: 'western_gorge_labyrinth', x: 500, y: 1500 },
  { id: 'hermit_highlands', x: 1200, y: 4200 },
  { id: 'border_march', x: 2300, y: 1950 },
  { id: 'lava_spine', x: 1100, y: 700 },
  { id: 'venom_mire', x: 2600, y: 900 },
  { id: 'southern_demon_domain', x: 1900, y: 1400 },
  { id: 'crimson_battlefield', x: 2900, y: 600 },
  { id: 'abyssal_scar', x: 1900, y: 600 },
  { id: 'southern_plague_woods', x: 3400, y: 550 },
  { id: 'bone_sea_coast', x: 1750, y: 150 },
  { id: 'spirit_wood_sea', x: 3700, y: 1300 },
  { id: 'mist_insect_valley', x: 4400, y: 1100 },
  { id: 'formation_barrens', x: 3600, y: 2200 },
  { id: 'sword_gorge', x: 3400, y: 3250 },
  { id: 'ore_teeth_range', x: 3625, y: 2800 },
  { id: 'eastern_sea', x: 3920, y: 2700 },
  { id: 'frostmoon_sea', x: 4400, y: 4500 },
  { id: 'floating_wind_isles', x: 4600, y: 2700 },
  { id: 'immortal_ruins_valley', x: 600, y: 1000 },
  { id: 'void_rift', x: 250, y: 4750 }
];

console.log('Inspecting terrain and objects at each target:\n');
for (const t of TARGETS) {
  const tile = proceduralWorldEngine.getTileAt(t.x, t.y);
  const reg = getRegionAt(t.x, t.y);
  const cx = Math.floor(t.x / 32);
  const cy = Math.floor(t.y / 32);
  const objs = objectScatter.getChunkObjects(cx, cy);
  console.log(`[${t.id}] at (${t.x}, ${t.y}) -> terrain: "${tile.terrainType}", region: "${reg.id}", chunk(${cx}, ${cy}) has ${objs.length} objs`);
}
