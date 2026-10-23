const fs = require('fs');
const quarantine = JSON.parse(fs.readFileSync('world-data/asset-quarantine.json', 'utf8'));

// Test what happens if we lift quarantine on all patched real assets
const patchedFamilies = [
  'mt_bastion_wall', 'mt_twin_peaks', 'mt_azure_crag', 'mt_ridge_double', 'mt_karst_pillar',
  'tree_spirit_peach', 'tree_cypress_frost', 'tree_pine_ancient', 'tree_dead_wood',
  'bamboo_jade', 'bamboo_mist', 'bamboo_dark', 'bamboo_clump_2x1', 'bamboo_clump_2x2',
  'building_pagoda_tower', 'building_sect_gate', 'building_road_inn', 'building_farm_hut',
  'building_stone_torii', 'building_tea_pavilion',
  'rock_crag_cluster', 'rock_cleft_stone', 'rock_boulder_moss'
];

const remainingQuarantine = quarantine.quarantinedFamilies.filter(f => !patchedFamilies.includes(f));
console.log('Quarantined families before:', quarantine.quarantinedFamilies.length);
console.log('Quarantined families after unquarantining patched art:', remainingQuarantine);

// Now let's test objectScatter with temporary unquarantine
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

// Temporarily mutate quarantine data in memory
const qData = require('../world-data/asset-quarantine.json');
qData.quarantinedFamilies.length = 0;
qData.quarantinedFamilies.push(...remainingQuarantine);

console.log('\n--- Object Counts With Quarantine Lifted ---');
for (const t of TARGETS) {
  const cx = Math.floor(t.x / 32);
  const cy = Math.floor(t.y / 32);
  // Clear chunk cache to test fresh generation
  const objs = objectScatter.getChunkObjects(cx, cy, 99999);
  console.log(`[${t.id}] chunk(${cx}, ${cy}) -> ${objs.length} objects`);
}
