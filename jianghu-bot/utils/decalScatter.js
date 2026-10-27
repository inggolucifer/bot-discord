/**
 * utils/decalScatter.js
 * Authoritative Server & Client SSOT for Non-Blocking Ground Decals (Prompt V11 P5).
 * Generates 40–80 natural ground decals per 32x32 chunk (wild grass, ground flowers,
 * pebbles, moss, pottery shards, fallen leaves) rendered under objects with zero collision.
 */

const { getTileAt, WORLD_SEED } = require('./proceduralWorldEngine');
const { getRegionAt } = require('./worldRegionEngine');

const CHUNK_SIZE = 32;

function createPRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const DECAL_TYPES_BY_THEME = {
  temperate: ['wild_grass', 'flower_petal', 'pebble_cluster', 'moss_spot', 'fallen_leaves'],
  cold: ['ice_pebbles', 'frost_moss', 'dead_grass_tuft', 'snow_drift_mini'],
  desert: ['dry_pebbles', 'sand_ripple', 'cracked_clay', 'pottery_shard'],
  mountain: ['shale_pebbles', 'slate_flakes', 'cliff_moss', 'small_lichen'],
  swamp: ['dark_moss', 'mud_bubble_spot', 'rotting_leaves', 'fungal_spot'],
  volcanic: ['cinder_ash', 'obsidian_pebble', 'scorched_crack'],
  grass: ['wild_grass', 'clover_tuft', 'small_field_flower', 'dry_pebbles'],
  forest: ['deep_moss', 'pine_needles', 'acorn_cluster', 'fallen_leaves', 'fern_tuft'],
  sea: ['shell_fragments', 'coastal_pebbles', 'drift_kelp_mini'],
  ruin: ['pottery_shard', 'weathered_tile_chip', 'cracked_stone_spot', 'moss_spot']
};

const DECAL_COLORS = {
  wild_grass: 'rgba(85, 120, 70, 0.45)',
  clover_tuft: 'rgba(95, 140, 80, 0.45)',
  small_field_flower: 'rgba(215, 170, 95, 0.50)',
  flower_petal: 'rgba(235, 185, 175, 0.45)',
  pebble_cluster: 'rgba(125, 115, 105, 0.40)',
  dry_pebbles: 'rgba(180, 160, 130, 0.35)',
  shale_pebbles: 'rgba(90, 85, 80, 0.40)',
  ice_pebbles: 'rgba(200, 220, 235, 0.50)',
  moss_spot: 'rgba(70, 105, 60, 0.45)',
  deep_moss: 'rgba(45, 85, 45, 0.50)',
  frost_moss: 'rgba(130, 165, 160, 0.45)',
  cliff_moss: 'rgba(95, 110, 85, 0.40)',
  fallen_leaves: 'rgba(185, 125, 60, 0.45)',
  pine_needles: 'rgba(140, 95, 55, 0.40)',
  pottery_shard: 'rgba(165, 95, 70, 0.45)',
  weathered_tile_chip: 'rgba(110, 100, 95, 0.40)',
  cinder_ash: 'rgba(50, 45, 45, 0.45)',
  sand_ripple: 'rgba(210, 185, 145, 0.35)'
};

/**
 * Returns deterministic array of decals for a chunk.
 */
function getChunkDecals(chunkX, chunkY, worldSeed = WORLD_SEED) {
  const seed = (worldSeed ^ (chunkX * 73856093) ^ (chunkY * 19349663) ^ 0x5a5a5a5a) >>> 0;
  const rand = createPRNG(seed);

  const startTileX = chunkX * CHUNK_SIZE;
  const startTileY = chunkY * CHUNK_SIZE;

  // 40 to 80 decals per chunk
  const decalBudget = Math.floor(40 + rand() * 41);
  const decals = [];

  for (let i = 0; i < decalBudget * 2; i++) {
    if (decals.length >= decalBudget) break;

    const lx = Math.floor(rand() * CHUNK_SIZE);
    const ly = Math.floor(rand() * CHUNK_SIZE);
    const gx = startTileX + lx;
    const gy = startTileY + ly;

    const tile = getTileAt(gx, gy);
    if (!tile) continue;
    const terrain = tile.terrainType || '';

    // Decals are not placed on deep water or pure solid obstacle cliffs
    if (terrain === 'ocean' || terrain === 'abyss_edge' || terrain === 'lava_flow') continue;

    const reg = getRegionAt(gx, gy);
    const themeKey = (reg && reg.id && DECAL_TYPES_BY_THEME[reg.id]) ? reg.id : 'temperate';
    const typeList = DECAL_TYPES_BY_THEME[themeKey] || DECAL_TYPES_BY_THEME.temperate;

    const type = typeList[Math.floor(rand() * typeList.length)];
    const color = DECAL_COLORS[type] || 'rgba(100, 100, 100, 0.35)';

    decals.push({
      id: `decal_${gx}_${gy}_${i}`,
      type,
      x: gx,
      y: gy,
      localX: lx,
      localY: ly,
      radius: 0.8 + rand() * 1.2, // r = 1..2 cells
      rot: rand() * Math.PI * 2,
      alpha: 0.25 + rand() * 0.35,
      color
    });
  }

  return decals;
}

module.exports = {
  CHUNK_SIZE,
  getChunkDecals,
  DECAL_TYPES_BY_THEME,
  DECAL_COLORS
};
