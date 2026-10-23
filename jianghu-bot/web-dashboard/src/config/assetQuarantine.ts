/**
 * ASSET QUARANTINE REGISTRY (web-dashboard/src/config/assetQuarantine.ts)
 * Plan V7 Phase HA: Quarantines code-generated placeholder sprites and bad artifacts.
 */

export const QUARANTINED_FAMILIES = [
  'ring_monster_tier2',
  'ring_monster_tier3',
  'ring_monster_tier4',
  'ring_monster_tier5',
  'marker_quest_beacon'
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
