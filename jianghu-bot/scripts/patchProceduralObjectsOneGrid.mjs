import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const canon = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../world-data/scale-canon.json'), 'utf8'));
const procPath = path.resolve(__dirname, '../web-dashboard/src/lib/proceduralObjects.ts');
let procContent = fs.readFileSync(procPath, 'utf8');

const targetIds = [
  'nature_wild_mountain_peony_cluster',
  'nature_wild_mountain_camellia_shrub',
  'nature_ancient_tea_bush_wild_terrace',
  'building_village_chicken_coop_bamboo',
  'building_village_bamboo_duck_coop_ramp',
  'building_wayside_earth_god_miniature_shrine',
  'building_village_stone_tofu_press_bench',
  'building_wayside_stone_stele_shrine_arbor',
  'building_village_stone_grain_mortar_pestle',
  'building_village_stone_grain_roller_mill',
  'building_village_stone_grain_soaking_cistern',
  'building_village_bamboo_fish_trap_weir',
  'building_wayside_wooden_mile_marker_stele',
  'building_wayside_bamboo_courier_mailbox_stand',
  'building_wayside_bamboo_torch_beacon_brazier',
  'structure_scatter_mountain_daoist_stone_lantern_beacon',
  'ancient_relic_shennong_herbal_cauldron',
  'structure_prof_farming_spirit_herb_nursery_trellis',
  // 14 herbs
  'nature_wild_mountain_medicinal_wolfberry_bush',
  'nature_wild_mountain_medicinal_angelica',
  'nature_mountain_wild_medicinal_polygonum',
  'nature_mountain_wild_medicinal_salvia_miltiorrhiza',
  'nature_mountain_wild_medicinal_astragalus',
  'nature_wild_medicinal_ginseng_flowering',
  'nature_mountain_wild_medicinal_licorice_root',
  'nature_mountain_wild_medicinal_aconite_monkshood',
  'nature_mountain_wild_medicinal_coptis_rhizome',
  'nature_mountain_wild_medicinal_dendrobium_orchid',
  'nature_mountain_wild_medicinal_polygonatum_kingianum',
  'nature_mountain_wild_medicinal_codonopsis_dangshen',
  'nature_mountain_wild_medicinal_rehmannia_dihuang',
  'nature_mountain_wild_medicinal_baical_skullcap_huangqin',
  // Nature props & resources
  'nature_rock_stepping_stones',
  'nature_lotus_pond_cluster',
  'nature_river_pebble_shoal',
  'nature_bamboo_hanging_creeper',
  'nature_scatter_celestial_lotus_pond_rockery',
  'nature_scatter_subterranean_luminescent_mushroom_patch',
  'resource_spirit_spring',
  'resource_heavenly_iron_ore',
  'resource_spirit_koi_pool',
  'resource_ancient_herb_garden',
  'resource_ancient_sword_tomb',
  'resource_ancient_lightning_bamboo',
  // Additional props
  'building_village_well',
  'building_stone_lantern_shrine',
  'building_stone_water_basin',
  'building_blacksmith_weapon_rack',
  'building_wayside_mile_marker_stele',
  'building_wine_tavern_flagpole_sign',
  'building_stone_mill_grain_grinder',
  'building_rustic_apiary_beehives',
  'building_wayside_wooden_notice_board',
  'building_countryside_thatched_haystack_cluster',
  'building_village_stone_water_trough',
  'building_wayside_bamboo_raft_mooring_post',
  'building_wayside_bamboo_tea_shed_bench',
  'building_wayside_stone_boundary_stele',
  'building_village_bamboo_grain_drying_mat',
  'building_wayside_fortune_teller_booth',
  'building_wayside_stone_well_windlass',
  'building_wayside_straw_scarecrow_bamboo'
];

let updatedCount = 0;

for (const id of targetIds) {
  const c = canon[id];
  const regex = new RegExp(`(${id}:\\s*\\{[\\s\\S]*?)(footprint:\\s*\\{\\s*cw:\\s*\\d+,\\s*ch:\\s*\\d+\\s*\\})([\\s\\S]*?overhangCells:\\s*[\\d\\.]+)([\\s\\S]*?\\n  \\},)`, 'm');
  
  const match = procContent.match(regex);
  if (match) {
    let block = match[0];
    
    // Replace footprint with cw: 1, ch: 1
    block = block.replace(/footprint:\s*\{\s*cw:\s*\d+,\s*ch:\s*\d+\s*\}/, 'footprint: { cw: 1, ch: 1 }');
    
    // Replace px with 140x140 (or aspect proportional)
    const ratio = c ? (c.visualH / c.visualW) : 1;
    const pw = 140;
    const ph = Math.round(pw * ratio);
    block = block.replace(/px:\s*\{\s*w:\s*\d+,\s*h:\s*\d+\s*\}/, `px: { w: ${pw}, h: ${ph} }`);
    
    // Adjust overhangCells to 0.1 - 0.2
    const overhang = Math.max(0.05, Math.round((ratio - 1) * 10) / 10);
    block = block.replace(/overhangCells:\s*[\d\.]+/, `overhangCells: ${overhang}`);
    
    // For flora and herbs, collision should be 'none'
    if (id.includes('flower') || id.includes('peony') || id.includes('camellia') || id.includes('herb') || id.includes('tea_bush') || id.includes('medicinal') || id.includes('ginseng')) {
      block = block.replace(/collision:\s*'[^']+'/, "collision: 'none'");
    }
    
    procContent = procContent.replace(match[0], block);
    updatedCount++;
    console.log(`[PATCHED] ${id} -> footprint: 1x1, px: ${pw}x${ph}, overhang: ${overhang}`);
  } else {
    console.warn(`[NOT MATCHED] ${id}`);
  }
}

fs.writeFileSync(procPath, procContent, 'utf8');
console.log(`\nSuccessfully updated ${updatedCount} definitions in proceduralObjects.ts!`);
