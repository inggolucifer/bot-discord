/**
 * ASSET QUARANTINE REGISTRY (web-dashboard/src/config/assetQuarantine.ts)
 * Plan V7 Phase HA: Quarantines code-generated placeholder sprites and bad artifacts.
 */

export const QUARANTINED_FAMILIES = [
  'mt_bastion_wall',
  'mt_twin_peaks',
  'mt_azure_crag',
  'mt_ridge_double',
  'mt_karst_pillar',
  'tree_spirit_peach',
  'tree_cypress_frost',
  'tree_pine_ancient',
  'tree_dead_wood',
  'bamboo_jade',
  'bamboo_mist',
  'bamboo_dark',
  'bamboo_clump_2x1',
  'bamboo_clump_2x2',
  'building_pagoda_tower',
  'building_sect_gate',
  'building_road_inn',
  'building_farm_hut',
  'building_stone_torii',
  'building_tea_pavilion',
  'ring_monster_tier2',
  'ring_monster_tier3',
  'ring_monster_tier4',
  'ring_monster_tier5',
  'marker_quest_beacon',
  'rock_crag_cluster',
  'rock_cleft_stone',
  'rock_boulder_moss'
] as const;

export const REVIEW_FAMILIES = [
  'landmark_sword_gorge_giant_fallen_blade_bridge',
  'monster_regional_crimson_nether_serpent',
  'monster_swirl_den',
  'icon_mount_flying_sword'
] as const;

export function isDefIdQuarantined(defId: string): boolean {
  if (!defId) return false;
  return QUARANTINED_FAMILIES.some(family => defId.startsWith(family) || defId.includes(family));
}
