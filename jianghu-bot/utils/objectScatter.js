/**
 * JIANGHU WORLD — SERVER-SIDE DETERMINISTIC OBJECT SCATTER ENGINE (utils/objectScatter.js)
 * Implements Fase D Specification:
 * - Deterministic Poisson-disc & noise-cluster scattering per 32x32 chunk.
 * - Multi-cell footprint collision (largest -> smallest) with road/settlement/water rejection.
 * - Full integration with asset-bindings.json:
 *   - 29 Regional Landmarks & Set-Pieces
 *   - Regional Illustrated Monsters (monsters_0..2)
 *   - Biome-specific Nature Scatters (weeping peach blossom, ginkgo gold canopy, scarlet maple, volcanic pillars, lotus ponds, karst, frost pine, dead wood, desert cairns, camellia shrubs)
 *   - Settlement Density Rings (wayside shrines, tea stalls, lanterns, cottages, dock warehouses)
 * - Enforces <= 140 objects budget per chunk.
 */

const worldData = require('./worldData');
const { getTileAt, WORLD_SEED } = require('./proceduralWorldEngine');
const { getRegionAt } = require('./worldRegionEngine');
const assetBindings = require('../config/asset-bindings.json');
const quarantineData = require('../world-data/asset-quarantine.json');
const quarantinedFamilies = quarantineData.quarantinedFamilies || [];
const scaleCanon = require('../world-data/scale-canon.json');
const frameSubstitutions = require('../world-data/frame-substitutions-v9.json');

function hash2d(x, y) {
  let h = ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// Known atlas frames SSOT (Prompt 1.1)
const knownFramesData = require('../config/known-frames.json');
const KNOWN_FRAMES = new Set(knownFramesData);

const CHUNK_SIZE = 32;

// Authored Props SSOT (Prompt 2.1 & 2.2)
const authoredPropsData = require('../world-data/authored-props.json');
const AUTHORED_BY_CHUNK = new Map();
if (authoredPropsData && Array.isArray(authoredPropsData.props)) {
  for (const p of authoredPropsData.props) {
    const cx = Math.floor(p.x / CHUNK_SIZE);
    const cy = Math.floor(p.y / CHUNK_SIZE);
    const key = `${cx},${cy}`;
    if (!AUTHORED_BY_CHUNK.has(key)) {
      AUTHORED_BY_CHUNK.set(key, []);
    }
    AUTHORED_BY_CHUNK.get(key).push(p);
  }
}

// SSOT of authored road tiles for clearance checking
const AUTHORED_ROAD_TILES = new Set();
if (authoredPropsData && Array.isArray(authoredPropsData.roads)) {
  for (const r of authoredPropsData.roads) {
    if (r.direction === 'EW') {
      const y = r.from.y;
      for (let x = Math.min(r.from.x, r.to.x); x <= Math.max(r.from.x, r.to.x); x++) {
        AUTHORED_ROAD_TILES.add(`${x},${y}`);
      }
    } else if (r.direction === 'NS') {
      const x = r.from.x;
      for (let y = Math.min(r.from.y, r.to.y); y <= Math.max(r.from.y, r.to.y); y++) {
        AUTHORED_ROAD_TILES.add(`${x},${y}`);
      }
    }
  }
}

// Spatial grid cell sizing for wilderness huts (Prompt 4 SSOT)
const HUT_GRID_SPACING = {
  // S = 40 (Populated regions & fertile plains)
  central_plains: 40,
  nine_springs_delta: 40,
  mirror_lake: 40,
  beast_prairies: 40,

  // S = 60 (Mountain ranges, highlands, desert, steppe, frozen tundra, passes)
  azure_mountain_range: 60,
  western_sacred_desert: 60,
  hermit_highlands: 60,
  thundersteppe: 60,
  northern_desolate: 60,
  ore_teeth_range: 60,
  western_gorge_labyrinth: 60,
  spirit_wood_sea: 60,
  mist_insect_valley: 60,
  godthunder_peaks: 60,
  border_march: 60,

  // S = 90 (High danger, demonic domains, volcanic, abyssal, ruins)
  crimson_battlefield: 90,
  venom_mire: 90,
  southern_demon_domain: 90,
  abyssal_scar: 90,
  southern_plague_woods: 90,
  formation_barrens: 90,
  sword_gorge: 90,
  lava_spine: 90,
  immortal_ruins_valley: 90,
  void_rift: 90
};

const HUT_LABELS = {
  hut_desert_adobe_day: 'Pondok Bata Lumpur Gurun',
  hut_desert_adobe_dusk: 'Pondok Bata Lumpur Gurun',
  hut_snow_thatched_day: 'Gubuk Jerami Salju',
  hut_snow_thatched_dusk: 'Gubuk Jerami Salju',
  hut_bamboo_field_day: 'Pondok Ladang Bambu',
  hut_bamboo_field_dusk: 'Pondok Ladang Bambu',
  hut_mountain_hermit_day: 'Pondok Pertapa Gunung',
  hut_mountain_hermit_dusk: 'Pondok Pertapa Gunung',
  hut_obsidian_stone_day: 'Pondok Batu Obsidian Lahar',
  hut_obsidian_stone_dusk: 'Pondok Batu Obsidian Lahar',
  hut_steppe_shepherd_day: 'Pondok Gembala Padang Rumput',
  hut_steppe_shepherd_dusk: 'Pondok Gembala Padang Rumput',
  hut_stilt_fisher_day: 'Pondok Panggung Nelayan',
  hut_stilt_fisher_dusk: 'Pondok Panggung Nelayan',
  hut_pine_woodcutter_day: 'Pondok Penebang Pinus',
  hut_pine_woodcutter_dusk: 'Pondok Penebang Pinus',
  hut_charcoal_burner_day: 'Pondok Pembakar Arang',
  hut_charcoal_burner_dusk: 'Pondok Pembakar Arang',
  hut_hunter_thatched_day: 'Pondok Pemburu Rimba',
  hut_hunter_thatched_dusk: 'Pondok Pemburu Rimba',
  hut_daoist_shrine_day: 'Kuil Pertapaan Daois',
  hut_daoist_shrine_dusk: 'Kuil Pertapaan Daois',
  hut_tea_harvester_day: 'Pondok Pemetik Teh',
  hut_tea_harvester_dusk: 'Pondok Pemetik Teh',
  hut_abandoned_thatched_ruin: 'Gubuk Jerami Terbengkalai',
  hut_abandoned_bamboo_shelter: 'Pondok Bambu Runtuh',
  hut_abandoned_charred_bandit: 'Bekas Sarang Bandit Hangus',
  hut_abandoned_hermit_ruin: 'Reruntuhan Pertapaan Kuno',
  hut_abandoned_mossy_shack: 'Gubuk Lumut Usang',
  hut_abandoned_stone_overgrown: 'Pondok Batu Ditumbuhi Ilalang'
};

function selectWildernessHutDef(regionId, terrainType, isAbandoned, randVal) {
  if (isAbandoned) {
    if (regionId === 'mist_insect_valley' || terrainType.includes('bamboo')) {
      return 'hut_abandoned_bamboo_shelter';
    }
    if (['lava_spine', 'crimson_battlefield', 'southern_demon_domain', 'void_rift'].includes(regionId)) {
      return 'hut_abandoned_charred_bandit';
    }
    if (['azure_mountain_range', 'hermit_highlands', 'godthunder_peaks', 'sword_gorge'].includes(regionId) || terrainType.includes('mountain')) {
      return 'hut_abandoned_hermit_ruin';
    }
    if (['venom_mire', 'southern_plague_woods', 'spirit_wood_sea'].includes(regionId) || terrainType.includes('swamp')) {
      return 'hut_abandoned_mossy_shack';
    }
    if (['western_sacred_desert', 'western_gorge_labyrinth', 'formation_barrens'].includes(regionId) || terrainType.includes('desert') || terrainType.includes('sand')) {
      return 'hut_abandoned_stone_overgrown';
    }
    return 'hut_abandoned_thatched_ruin';
  }

  const variant = randVal < 0.35 ? 'dusk' : 'day';

  if (['western_sacred_desert', 'western_gorge_labyrinth'].includes(regionId) || terrainType.includes('desert') || terrainType.includes('sand')) {
    return `hut_desert_adobe_${variant}`;
  }
  if (regionId === 'northern_desolate' || terrainType.includes('snow') || terrainType.includes('glacier')) {
    return `hut_snow_thatched_${variant}`;
  }
  if (regionId === 'mist_insect_valley' || terrainType.includes('bamboo')) {
    return `hut_bamboo_field_${variant}`;
  }
  if (['azure_mountain_range', 'hermit_highlands', 'godthunder_peaks'].includes(regionId) || terrainType.includes('mountain_peak')) {
    return `hut_mountain_hermit_${variant}`;
  }
  if (['lava_spine', 'abyssal_scar', 'immortal_ruins_valley', 'void_rift'].includes(regionId)) {
    return `hut_obsidian_stone_${variant}`;
  }
  if (['thundersteppe', 'beast_prairies'].includes(regionId)) {
    return `hut_steppe_shepherd_${variant}`;
  }
  if (['nine_springs_delta', 'mirror_lake'].includes(regionId) || terrainType.includes('river')) {
    return `hut_stilt_fisher_${variant}`;
  }
  if (regionId === 'spirit_wood_sea' || terrainType === 'forest' || terrainType === 'spirit_wood') {
    return `hut_pine_woodcutter_${variant}`;
  }
  if (['ore_teeth_range', 'sword_gorge'].includes(regionId)) {
    return `hut_charcoal_burner_${variant}`;
  }
  if (['southern_plague_woods', 'venom_mire', 'southern_demon_domain', 'crimson_battlefield'].includes(regionId)) {
    return `hut_hunter_thatched_${variant}`;
  }
  if (regionId === 'formation_barrens' || randVal > 0.80) {
    return `hut_daoist_shrine_${variant}`;
  }
  return `hut_tea_harvester_${variant}`;
}

function selectCompanionPropPool(hutDefId, isAbandoned) {
  if (isAbandoned) {
    return [
      'prop_extinguished_campfire',
      'prop_wooden_fence_corner',
      'prop_stone_prayer_stela',
      'prop_water_storage_urn'
    ];
  }
  if (hutDefId.includes('fisher')) {
    return [
      'prop_drying_fish_rack',
      'prop_water_storage_urn',
      'prop_small_stone_well',
      'prop_moored_rowboat'
    ];
  }
  if (hutDefId.includes('tea') || hutDefId.includes('harvester') || hutDefId.includes('bamboo')) {
    return [
      'prop_bamboo_tool_rack',
      'prop_tea_kettle_stove',
      'prop_drying_herb_rack',
      'prop_vegetable_patch',
      'prop_water_storage_urn'
    ];
  }
  if (hutDefId.includes('woodcutter') || hutDefId.includes('charcoal') || hutDefId.includes('hunter')) {
    return [
      'prop_firewood_stack',
      'prop_wooden_fence_corner',
      'prop_small_stone_well',
      'prop_drying_herb_rack',
      'prop_bamboo_tool_rack'
    ];
  }
  if (hutDefId.includes('shrine') || hutDefId.includes('hermit')) {
    return [
      'prop_stone_prayer_stela',
      'prop_tea_kettle_stove',
      'prop_small_stone_well',
      'prop_water_storage_urn'
    ];
  }
  return [
    'prop_vegetable_patch',
    'prop_small_stone_well',
    'prop_firewood_stack',
    'prop_tea_kettle_stove',
    'prop_wooden_fence_corner'
  ];
}

function resolveDef(defId, fallbackDefId = null) {
  let target = defId;
  if (target && frameSubstitutions[target]) {
    target = frameSubstitutions[target];
  } else if (target) {
    const base = target.replace(/_v\d+$/, '');
    if (frameSubstitutions[base]) {
      target = frameSubstitutions[base];
    }
  }
  if (target && KNOWN_FRAMES.has(target) && !isQuarantined(target)) return target;

  let fallback = fallbackDefId;
  if (fallback && frameSubstitutions[fallback]) {
    fallback = frameSubstitutions[fallback];
  } else if (fallback) {
    const base = fallback.replace(/_v\d+$/, '');
    if (frameSubstitutions[base]) {
      fallback = frameSubstitutions[base];
    }
  }
  if (fallback && KNOWN_FRAMES.has(fallback) && !isQuarantined(fallback)) return fallback;
  return null;
}

const WATER_TERRAINS = new Set(['sea', 'ocean', 'sea_reef', 'island_reef', 'lake_deep', 'lake', 'river', 'river_shallow']);
const WATER_EXEMPT_REGEX = /lotus|coral|reef|boat|drift|dock|island|reed|stream|water/;

function matchesTerrain(allowedList, actualTerrain) {
  if (!allowedList || !Array.isArray(allowedList)) return true;
  if (allowedList.includes(actualTerrain)) return true;
  // Substring & alias matching for procedural generator terrain varieties
  if (actualTerrain.includes('lake') || actualTerrain.includes('river') || actualTerrain.includes('sea') || actualTerrain.includes('ocean')) {
    if (allowedList.some(t => t.includes('lake') || t.includes('river') || t.includes('sea') || t.includes('ocean') || t.includes('pond') || t.includes('water') || t === 'island_reef' || t === 'sea_reef')) return true;
  }
  if (actualTerrain.includes('mountain') || actualTerrain.includes('crag') || actualTerrain.includes('peak') || actualTerrain === 'cliff') {
    if (allowedList.some(t => t.includes('mountain') || t === 'cliff' || t === 'hill' || t === 'canyon_floor')) return true;
  }
  if (actualTerrain.includes('desert') || actualTerrain.includes('sand') || actualTerrain.includes('dune')) {
    if (allowedList.some(t => t.includes('desert') || t.includes('sand') || t.includes('dune') || t === 'arid_dirt')) return true;
  }
  if (actualTerrain.includes('bamboo')) {
    if (allowedList.some(t => t.includes('bamboo'))) return true;
  }
  if (actualTerrain.includes('swamp') || actualTerrain === 'poison_pool') {
    if (allowedList.some(t => t.includes('swamp') || t === 'miasma_waste' || t === 'poison_pool')) return true;
  }
  if (actualTerrain.includes('volcan') || actualTerrain === 'crater' || actualTerrain === 'basalt' || actualTerrain === 'lava_flow') {
    if (allowedList.some(t => t === 'volcanic' || t === 'crater' || t === 'basalt' || t === 'lava_flow')) return true;
  }
  if (actualTerrain === 'forest' || actualTerrain === 'spirit_wood') {
    if (allowedList.some(t => t === 'plains' || t === 'meadow' || t === 'peach_blossom' || t === 'forest' || t === 'spirit_wood')) return true;
  }
  if (actualTerrain === 'battlefield_ash' || actualTerrain === 'lightning_scar') {
    if (allowedList.some(t => t === 'dirt' || t === 'plains' || t === 'dead_wood' || t === 'abyssal_scar')) return true;
  }
  if (actualTerrain === 'sword_gorge_pass') {
    if (allowedList.some(t => t.includes('canyon') || t.includes('cliff') || t.includes('mountain'))) return true;
  }
  if (actualTerrain === 'ruin_floor' || actualTerrain === 'formation_tile') {
    if (allowedList.some(t => t === 'ruin_floor' || t === 'formation_tile')) return true;
  }
  return false;
}

function isAllowedOnTerrain(defId, terrainType, isAnchor = false) {
  if (!defId || !terrainType) return true;

  // Water terrain restriction is absolute for random scatter (Prompt 1.5)
  if (WATER_TERRAINS.has(terrainType)) {
    if (isAnchor && terrainType === 'island_reef') return true;
    if (!WATER_EXEMPT_REGEX.test(defId)) return false;
  }

  // 1. Check in natureScatters
  for (const cat of Object.values(assetBindings.natureScatters || {})) {
    if (Array.isArray(cat)) {
      const entry = cat.find(e => e.defId === defId);
      if (entry) {
        if (entry.terrains && Array.isArray(entry.terrains)) {
          return matchesTerrain(entry.terrains, terrainType);
        }
        if (WATER_TERRAINS.has(terrainType)) {
          return WATER_EXEMPT_REGEX.test(defId);
        }
        return true;
      }
    }
  }

  // 2. Check in landmarks
  if (assetBindings.landmarks) {
    for (const lm of Object.values(assetBindings.landmarks)) {
      if (lm && lm.defId === defId) {
        if (lm.terrains && Array.isArray(lm.terrains)) {
          return matchesTerrain(lm.terrains, terrainType);
        }
        if (WATER_TERRAINS.has(terrainType)) {
          return WATER_EXEMPT_REGEX.test(defId);
        }
        return true;
      }
    }
  }

  // 3. Fallback: if water terrain, only allow water objects
  if (WATER_TERRAINS.has(terrainType)) {
    if (isAnchor && terrainType === 'island_reef') return true;
    return WATER_EXEMPT_REGEX.test(defId);
  }

  return true;
}

function getCanonCollision(defId, fallbackCw = 1, fallbackCh = 1) {
  const actualDef = resolveDef(defId) || defId;
  const canon = scaleCanon[actualDef] || scaleCanon[defId];
  if (canon && canon.collision) {
    return {
      w: canon.collision.w,
      h: canon.collision.h,
      offsetX: canon.collision.offsetX || 0
    };
  }
  return { w: fallbackCw, h: fallbackCh, offsetX: 0 };
}

function isQuarantined(defId) {
  if (!defId) return false;
  return quarantinedFamilies.some(family => defId.startsWith(family) || defId.includes(family));
}

// Pseudo-random number generator (Mulberry32)
function createPRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// In-memory chunk cache to ensure O(1) performance and determinism
const chunkCache = new Map();

/**
 * Checks if a multi-cell footprint (cw x ch) at (x, y) can be placed without collision.
 */
function canPlaceFootprint(startX, startY, cw, ch, occupiedGrid, getTileFn, isAnchor = false, defId = null, objects = null, collisionOverride = false) {
  const actualDefId = resolveDef(defId) || defId;

  // Phase HA: Asset Quarantine rejection (never place code-generated placeholder sprites)
  if (actualDefId && isQuarantined(actualDefId)) {
    return false;
  }

  // Prompt C4: Limit tree_dead_wood dominance (40% weight + max 1 cluster per 16x16 in non-dead_wood biomes)
  if (!isAnchor && actualDefId && actualDefId.startsWith('tree_dead_wood_')) {
    const tile = getTileFn(startX, startY);
    const regId = (tile && tile.regionId) || '';
    const tt = (tile && tile.terrainType) || '';
    const isDeadWoodNative = ['venom_mire', 'southern_plague_woods', 'southern_demon_domain', 'crimson_battlefield', 'abyssal_scar', 'lava_spine', 'void_rift'].includes(regId) || ['dead_wood', 'swamp', 'miasma_waste'].includes(tt);

    const deadWoodGate = (hash2d(startX * 37 + 101, startY * 71 + 203) % 100) < 40;
    if (!deadWoodGate) return false;

    if (!isDeadWoodNative && objects && objects.length > 0) {
      for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];
        if (o.defId && o.defId.startsWith('tree_dead_wood_')) {
          const dist = Math.max(Math.abs(startX - o.x), Math.abs(startY - o.y));
          if (dist < 16) return false;
        }
      }
    }
  }

  // 0. Anti-clumping dispersion: identical defId must not appear within 3 tiles (Chebyshev < 3)
  if (!isAnchor && defId && objects && objects.length > 0) {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      if (o.defId === defId) {
        const dist = Math.max(Math.abs(startX - o.x), Math.abs(startY - o.y));
        if (dist < 3) return false;
      }
    }

    // Intra-chunk dominance limit rule (Prompt 1.3 & Prompt 4 SSOT)
    // Dynamic cap per chunk guarantees single-type dominance <= 18% across all merged viewports
    if (objects.length > 0) {
      const sameCount = objects.filter(o => o.defId === defId).length;
      if (sameCount >= 1) {
        let maxAllowed = 2;
        const len = objects.length;
        if (len >= 24) maxAllowed = 3;
        if (len >= 40) maxAllowed = 4;
        if (len >= 56) maxAllowed = 5;
        if (len >= 74) maxAllowed = 6;
        if (len >= 92) maxAllowed = 7;
        if (len >= 110) maxAllowed = 8;
        if (sameCount + 1 > maxAllowed) {
          return false;
        }
      }
    }

    // 14-Tile Minimum Spacing for Small Huts (Fase E in Plan V8)
    const isHutDef = defId.includes('cottage') || defId.includes('shack') || defId.includes('hut');
    if (isHutDef) {
      for (const o of objects) {
        if (o.defId && (o.defId.includes('cottage') || o.defId.includes('shack') || o.defId.includes('hut'))) {
          const hDist = Math.max(Math.abs(startX - o.x), Math.abs(startY - o.y));
          if (hDist < 14) return false;
        }
      }
    }
  }

  // Always verify root/origin tile (startX, startY)
  const originTile = getTileFn(startX, startY);
  if (!originTile) return false;
  const ot = originTile.terrainType || '';
  const isBridge = defId && (defId.includes('bridge') || defId.includes('pontoon'));
  if (!isBridge && (ot.includes('road') || (!isAnchor && ot.includes('pass')))) return false;
  if (WATER_TERRAINS.has(ot) && !isAnchor && !isBridge && (!defId || !WATER_EXEMPT_REGEX.test(defId))) return false;

  // Use base collision footprint from scale-canon if available (or collisionOverride)
  const col = collisionOverride ? { w: cw, h: ch, offsetX: 0 } : getCanonCollision(defId, cw, ch);
  if (col.w === 0 && col.h === 0) {
    return true;
  }

  const baseStartX = startX + Math.round(col.offsetX);
  const baseStartY = startY;

  for (let dy = 0; dy < col.h; dy++) {
    for (let dx = 0; dx < col.w; dx++) {
      const tx = baseStartX + dx;
      const ty = baseStartY + dy;
      const key = `${tx},${ty}`;

      // 1. Grid already occupied by another object
      if (occupiedGrid.has(key)) return false;

      // 2. Tile underlying check (roads, water, settlement)
      const tile = getTileFn(tx, ty);
      if (!tile) return false;
      const t = tile.terrainType || '';

      // Check allowed terrain for defId (Prompt 1.5)
      if (defId && !isAllowedOnTerrain(defId, t, isAnchor)) {
        return false;
      }

      // Do not block roads or passes (bridges exempt)
      if (!isBridge && (t.includes('road') || (!isAnchor && t.includes('pass')))) {
        return false;
      }

      // Water restriction (unless anchor or water-exempt)
      if (WATER_TERRAINS.has(t)) {
        if (!isAnchor && (!defId || !WATER_EXEMPT_REGEX.test(defId))) {
          return false;
        }
      }

      // If NOT an anchor set-piece, do not overlap settlement cores
      if (!isAnchor) {
        if (t === 'settlement' || tile.isSettlementOrigin) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Marks multi-cell footprint cells as occupied in grid.
 */
function markFootprintOccupied(startX, startY, cw, ch, occupiedGrid, objId, defId = null, collisionOverride = false) {
  const col = collisionOverride ? { w: cw, h: ch, offsetX: 0 } : getCanonCollision(defId, cw, ch);
  if (col.w === 0 && col.h === 0) {
    return;
  }
  const baseStartX = startX + Math.round(col.offsetX);
  const baseStartY = startY;
  for (let dy = 0; dy < col.h; dy++) {
    for (let dx = 0; dx < col.w; dx++) {
      occupiedGrid.set(`${baseStartX + dx},${baseStartY + dy}`, objId);
    }
  }
}

const REGION_LANDMARK_CENTERS = {
  central_plains: { x: 2700, y: 2800 },
  nine_springs_delta: { x: 2400, y: 2450 },
  azure_mountain_range: { x: 2200, y: 3340 },
  northern_desolate: { x: 2120, y: 4180 },
  thundersteppe: { x: 2400, y: 4000 },
  godthunder_peaks: { x: 3540, y: 4500 },
  mirror_lake: { x: 3100, y: 3100 },
  beast_prairies: { x: 1400, y: 3800 },
  western_sacred_desert: { x: 820, y: 2220 },
  western_gorge_labyrinth: { x: 500, y: 1500 },
  hermit_highlands: { x: 1200, y: 4200 },
  border_march: { x: 2300, y: 1950 },
  lava_spine: { x: 1100, y: 700 },
  venom_mire: { x: 2600, y: 900 },
  southern_demon_domain: { x: 1900, y: 1400 },
  crimson_battlefield: { x: 2900, y: 600 },
  abyssal_scar: { x: 1900, y: 600 },
  southern_plague_woods: { x: 3400, y: 550 },
  bone_sea_coast: { x: 1750, y: 150 },
  spirit_wood_sea: { x: 3700, y: 1300 },
  mist_insect_valley: { x: 4150, y: 750 },
  formation_barrens: { x: 3600, y: 2200 },
  sword_gorge: { x: 3400, y: 3250 },
  ore_teeth_range: { x: 3625, y: 2800 },
  eastern_sea: { x: 3880, y: 2750 },
  frostmoon_sea: { x: 4650, y: 4050 },
  floating_wind_isles: { x: 4600, y: 2700 },
  immortal_ruins_valley: { x: 600, y: 1000 },
  void_rift: { x: 250, y: 4750 }
};

/**
 * Generates or retrieves scattered objects for a single 32x32 chunk.
 */
function getChunkObjects(chunkX, chunkY, worldSeed = WORLD_SEED) {
  const cacheKey = `${chunkX},${chunkY}_${worldSeed}`;
  if (chunkCache.has(cacheKey)) {
    return chunkCache.get(cacheKey);
  }

  // Derive chunk deterministic seed
  const chunkSeed = (worldSeed ^ (chunkX * 73856093) ^ (chunkY * 19349663)) >>> 0;
  const rand = createPRNG(chunkSeed);

  const startTileX = chunkX * CHUNK_SIZE;
  const startTileY = chunkY * CHUNK_SIZE;
  const endTileX = startTileX + CHUNK_SIZE - 1;
  const endTileY = startTileY + CHUNK_SIZE - 1;

  const objects = [];
  const occupiedGrid = new Map();
  const chunkRegion = getRegionAt(startTileX + 16, startTileY + 16);
  const isPopulated = ['central_plains', 'nine_springs_delta', 'mirror_lake'].includes(chunkRegion.id);

  // Density Noise Field (Fase D in Plan V8): modulated budget between 35 and 110 (ceiling 140, boosted in populated)
  const densityNoise = Math.sin(chunkX * 0.37 + 1.3) * Math.cos(chunkY * 0.37 + 0.9) * 0.5 + 0.5;
  const baseBudget = isPopulated ? 65 : 35;
  const maxObjectsBudget = Math.floor(baseBudget + densityNoise * (isPopulated ? 55 : 75));

  // 1. Set-pieces from anchors & 29 Regional Landmarks
  const anchorsInChunk = worldData.getAnchors().filter(a =>
    a.x >= startTileX && a.x <= endTileX &&
    a.y >= startTileY && a.y <= endTileY
  );

  for (const a of anchorsInChunk) {
    const region = getRegionAt(a.x, a.y);
    const landmarkBinding = assetBindings.landmarks[region.id];

    let structureDef = { defId: 'building_village_thatched_cottage', cw: 2, ch: 2, collision: 'solid' };

    if (a.id === 'xitong_city' || a.name.toLowerCase().includes('xitong')) {
      structureDef = { defId: 'xitong_city_landmark', cw: 4, ch: 3, collision: 'solid' };
    } else if (a.type === 'sect') {
      structureDef = { defId: 'building_sect_library', cw: 3, ch: 2, collision: 'solid' };
    } else if (a.type === 'capital_city' || a.type === 'major_city' || a.type === 'city') {
      structureDef = { defId: 'building_spirit_pagoda', cw: 3, ch: 3, collision: 'solid' };
    } else if (a.name.toLowerCase().includes('dermaga') || a.name.toLowerCase().includes('dock') || a.name.toLowerCase().includes('port') || a.type === 'port') {
      structureDef = { defId: 'building_dock_warehouse', cw: 3, ch: 2, collision: 'solid' };
    } else if (a.type === 'village' || a.type === 'hamlet') {
      structureDef = { defId: 'building_village_thatched_cottage', cw: 2, ch: 2, collision: 'solid' };
    } else if (a.type === 'outpost') {
      structureDef = { defId: 'building_stone_torii_v1', cw: 2, ch: 2, collision: 'solid' };
    } else if (landmarkBinding && (a.type === 'landmark' || a.type === 'focal')) {
      structureDef = {
        defId: landmarkBinding.defId,
        cw: landmarkBinding.cw || 3,
        ch: landmarkBinding.ch || 3,
        collision: landmarkBinding.collision || 'solid'
      };
    }

    if (canPlaceFootprint(a.x, a.y, structureDef.cw, structureDef.ch, occupiedGrid, getTileAt, true)) {
      const objId = `anchor_${a.id}`;
      markFootprintOccupied(a.x, a.y, structureDef.cw, structureDef.ch, occupiedGrid, objId, structureDef.defId);
      objects.push({
        id: objId,
        defId: structureDef.defId,
        x: a.x,
        y: a.y,
        customLabel: a.name,
        collision: structureDef.collision,
        tags: ['setpiece', a.type, region.id]
      });
    }
  }

  // 1b. Regional Landmark Placement at Focal Origin (ensures all 29 regions have their grand setpiece)
  for (const [regId, focal] of Object.entries(REGION_LANDMARK_CENTERS)) {
    if (focal.x >= startTileX && focal.x <= endTileX && focal.y >= startTileY && focal.y <= endTileY) {
      const landmarkDef = assetBindings.landmarks[regId];
      if (landmarkDef && !isQuarantined(landmarkDef.defId)) {
        const lx = focal.x;
        const ly = focal.y;
        if (canPlaceFootprint(lx, ly, landmarkDef.cw || 3, landmarkDef.ch || 3, occupiedGrid, getTileAt, true, landmarkDef.defId, objects)) {
          const objId = `landmark_${regId}`;
          markFootprintOccupied(lx, ly, landmarkDef.cw || 3, landmarkDef.ch || 3, occupiedGrid, objId, landmarkDef.defId);
          objects.push({
            id: objId,
            defId: landmarkDef.defId,
            x: lx,
            y: ly,
            customLabel: landmarkDef.name,
            collision: landmarkDef.collision || 'solid',
            tags: ['landmark', 'regional_setpiece', regId]
          });
        }
      }
    }
  }

  // 1c. Authored props (Prompt 2.2)
  let authoredCount = 0;
  const authoredInChunk = AUTHORED_BY_CHUNK.get(`${chunkX},${chunkY}`) || [];
  for (const p of authoredInChunk) {
    const defId = resolveDef(p.defId, p.fallbackDefId);
    if (!defId) continue;
    const cw = p.cw || 1, ch = p.ch || 1;
    // isAnchor=true: lewati anti-gerombol & batas dominasi; tabrakan tetap dicek
    // collisionOverride=true: paksa tabrakan 1x1 agar canon 3x2 cottage tidak menolak penempatan
    if (!canPlaceFootprint(p.x, p.y, cw, ch, occupiedGrid, getTileAt, true, defId, objects, true)) continue;
    markFootprintOccupied(p.x, p.y, cw, ch, occupiedGrid, p.id, defId, true);
    objects.push({
      id: p.id,
      defId,
      x: p.x,
      y: p.y,
      collision: p.collision,
      enterable: !!p.enterable,
      structureTemplate: p.structureTemplate,
      facing: p.facing,
      tags: ['authored', p.kind, p.anchorId, p.region, (p.defId && p.defId.startsWith('hut_')) ? 'hut' : null, p.kind === 'house' ? 'shelter' : null].filter(Boolean)
    });
    authoredCount++;
  }

  // 1-tile buffer zone around authored houses to protect yards from random scatter (Prompt 2.2.5)
  for (const p of authoredInChunk) {
    if (p.kind === 'house') {
      const cw = p.cw || 1, ch = p.ch || 1;
      for (let by = p.y - 1; by <= p.y + ch; by++) {
        for (let bx = p.x - 1; bx <= p.x + cw; bx++) {
          const bKey = `${bx},${by}`;
          if (!occupiedGrid.has(bKey)) {
            occupiedGrid.set(bKey, `${p.id}_buffer`);
          }
        }
      }
    }
  }

  // 2. Settlement Density Rings: Outskirts structures around nearby anchors (radius <= 8 tiles)
  const nearbyAnchors = worldData.getAnchors().filter(a =>
    a.x >= (startTileX - 8) && a.x <= (endTileX + 8) &&
    a.y >= (startTileY - 8) && a.y <= (endTileY + 8)
  );

  if (nearbyAnchors.length > 0) {
    const outskirts = assetBindings.settlementObjects.outskirts;
    for (const a of nearbyAnchors) {
      const ringCount = Math.floor(rand() * 3) + 2; // 2..4 outskirts objects per anchor
      for (let i = 0; i < ringCount; i++) {
        if (objects.length - authoredCount >= maxObjectsBudget) break;
        const angle = rand() * Math.PI * 2;
        const dist = 3 + rand() * 4; // dist 3..7 tiles from anchor center
        const ox = Math.round(a.x + Math.cos(angle) * dist);
        const oy = Math.round(a.y + Math.sin(angle) * dist);

        if (ox >= startTileX && ox <= endTileX && oy >= startTileY && oy <= endTileY) {
          const itemDef = outskirts[Math.floor(rand() * outskirts.length)];
          if (canPlaceFootprint(ox, oy, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = `outskirt_${ox}_${oy}`;
            markFootprintOccupied(ox, oy, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x: ox,
              y: oy,
              collision: itemDef.collision,
              tags: ['settlement_outskirts']
            });
          }
        }
      }
    }
  }

  // 3. Wilderness Huts Outside Villages & Companion Props (Prompt 4 SSOT)
  const allAnchors = worldData.getAnchors();
  const chunkSpacings = new Set();
  const samplePoints = [
    [startTileX + 16, startTileY + 16],
    [startTileX, startTileY],
    [endTileX, startTileY],
    [startTileX, endTileY],
    [endTileX, endTileY]
  ];
  for (const [sx, sy] of samplePoints) {
    const r = getRegionAt(sx, sy);
    const sp = HUT_GRID_SPACING[r.id];
    if (sp) chunkSpacings.add(sp);
  }

  for (const S of chunkSpacings) {
    const minCellX = Math.floor((startTileX - 3) / S);
    const maxCellX = Math.floor((endTileX + 3) / S);
    const minCellY = Math.floor((startTileY - 3) / S);
    const maxCellY = Math.floor((endTileY + 3) / S);

    for (let cy = minCellY; cy <= maxCellY; cy++) {
      for (let cx = minCellX; cx <= maxCellX; cx++) {
        const cellMinX = cx * S;
        const cellMinY = cy * S;
        const cellCenterX = cellMinX + Math.floor(S / 2);
        const cellCenterY = cellMinY + Math.floor(S / 2);
        const cellRegion = getRegionAt(cellCenterX, cellCenterY);

        // Only process if this cell's primary region matches S
        if (HUT_GRID_SPACING[cellRegion.id] !== S) continue;

        const cellSeed = (worldSeed ^ (cx * 73856093) ^ (cy * 19349663) ^ (S * 83492791)) >>> 0;
        const cellRand = createPRNG(cellSeed);

        // Deterministic candidate search within cell (Prompt 4 SSOT: Up to 3 huts in fertile S=40, up to 2 in S=60/90)
        const cellHuts = [];
        const maxHutSlots = S === 40 ? 3 : 2;
        const minHutDist = S === 40 ? 12 : 16;
        for (let hutSlot = 0; hutSlot < maxHutSlots; hutSlot++) {
          let winningHut = null;
          for (const preferScenic of [true, false]) {
            if (winningHut) break;
            const searchRand = createPRNG((cellSeed + hutSlot * 31337 + (preferScenic ? 1013 : 2027)) >>> 0);
            for (let attempt = 0; attempt < 32; attempt++) {
              const candX = cellMinX + 2 + Math.floor(searchRand() * (S - 4));
              const candY = cellMinY + 2 + Math.floor(searchRand() * (S - 4));

              // If placing secondary/tertiary hut, ensure spacing Chebyshev >= minHutDist
              if (cellHuts.length > 0) {
                const tooClose = cellHuts.some(h => Math.max(Math.abs(candX - h.x), Math.abs(candY - h.y)) < minHutDist);
                if (tooClose) continue;
              }

              const tile = getTileAt(candX, candY);
              if (!tile) continue;
              const t = tile.terrainType || '';
              // Allow hermit huts & ruins on mountain/cliff/rock terrain
              if (tile.isSolid && !t.includes('mountain') && !t.includes('cliff') && !t.includes('rock') && !t.includes('crag') && !t.includes('peak') && !t.includes('pass')) continue;
              if (WATER_TERRAINS.has(t) || t.includes('road') || t.includes('pass') || t === 'settlement' || tile.isSettlementOrigin) continue;

              // Anchor rejection (Chebyshev >= 8)
              let nearAnchor = false;
              for (const a of allAnchors) {
                if (Math.max(Math.abs(candX - a.x), Math.abs(candY - a.y)) < 8) {
                  nearAnchor = true;
                  break;
                }
              }
              if (nearAnchor) continue;

              // Road rejection (Chebyshev >= 3)
              let nearRoad = false;
              for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                  const checkX = candX + dx;
                  const checkY = candY + dy;
                  const nt = getTileAt(checkX, checkY);
                  if (nt && (nt.terrainType.includes('road') || AUTHORED_ROAD_TILES.has(`${checkX},${checkY}`))) {
                    nearRoad = true;
                    break;
                  }
                }
                if (nearRoad) break;
              }
              if (nearRoad) continue;

              // Prefer scenic (4 cardinal checks at dist 3, fast O(1))
              if (preferScenic) {
                let isScenic = false;
                const SCENIC_CHECKS = [{ dx: 3, dy: 0 }, { dx: -3, dy: 0 }, { dx: 0, dy: 3 }, { dx: 0, dy: -3 }];
                for (const sc of SCENIC_CHECKS) {
                  const nt = getTileAt(candX + sc.dx, candY + sc.dy);
                  if (nt) {
                    const ntt = nt.terrainType || '';
                    if (WATER_TERRAINS.has(ntt) || ntt.includes('road') || ntt.includes('forest') || ntt === 'spirit_wood' || ntt.includes('mountain')) {
                      isScenic = true;
                      break;
                    }
                  }
                }
                if (!isScenic) continue;
              }

              winningHut = { x: candX, y: candY };
              break;
            }
          }
          if (winningHut) cellHuts.push(winningHut);
          else if (hutSlot === 0) break;
        }

        for (let hi = 0; hi < cellHuts.length; hi++) {
          const winningHut = cellHuts[hi];
          const hutRand = createPRNG((cellSeed + hi * 47329) >>> 0);
          const hx = winningHut.x;
          const hy = winningHut.y;
          const hutTile = getTileAt(hx, hy);
          const effectiveDanger = Math.max(hutTile.dangerTier || 1, cellRegion.dangerTier || 1);
          const isHighDanger = effectiveDanger >= 4;

          // Proportions roll
          const propRoll = hutRand();
          let isAbandoned = false;
          let enterable = false;
          let structureTemplate = 'hut_6x5';

          if (isHighDanger) {
            if (propRoll < 0.35) {
              isAbandoned = true;
              enterable = true;
              structureTemplate = 'hut_abandoned_6x5';
            } else if (propRoll < 0.70) {
              isAbandoned = false;
              enterable = true;
              structureTemplate = 'hut_6x5';
            } else {
              isAbandoned = false;
              enterable = false;
              structureTemplate = 'hut_6x5';
            }
          } else {
            if (propRoll < 0.10) {
              isAbandoned = true;
              enterable = true;
              structureTemplate = 'hut_abandoned_6x5';
            } else if (propRoll < 0.45) {
              isAbandoned = false;
              enterable = true;
              structureTemplate = 'hut_6x5';
            } else {
              isAbandoned = false;
              enterable = false;
              structureTemplate = 'hut_6x5';
            }
          }

          const hutDefId = selectWildernessHutDef(cellRegion.id, hutTile.terrainType || '', isAbandoned, hutRand());
          const hutName = HUT_LABELS[hutDefId] || (isAbandoned ? 'Gubuk Terbengkalai' : 'Pondok Singgah Musafir');
          const hutCol = getCanonCollision(hutDefId, 1, 1);

          // Place hut if inside this chunk
          if (hx >= startTileX && hx <= endTileX && hy >= startTileY && hy <= endTileY) {
            if (canPlaceFootprint(hx, hy, hutCol.w, hutCol.h, occupiedGrid, getTileAt, false, hutDefId, objects)) {
              const objId = `wilderness_hut_${hx}_${hy}`;
              markFootprintOccupied(hx, hy, hutCol.w, hutCol.h, occupiedGrid, objId, hutDefId);
              objects.push({
                id: objId,
                defId: hutDefId,
                x: hx,
                y: hy,
                collision: 'solid',
                enterable,
                isAbandoned,
                structureTemplate,
                customLabel: hutName,
                tags: ['hut', 'wilderness_hut', 'shelter', isAbandoned ? 'abandoned' : (enterable ? 'enterable' : 'decorative'), cellRegion.id]
              });
            }
          }

          // Companion props (0..3)
          const numProps = Math.floor(hutRand() * 4);
          if (numProps > 0) {
            const propPool = selectCompanionPropPool(hutDefId, isAbandoned);
            const COMPANION_OFFSETS = [
              { dx: -2, dy: -1 }, { dx: -2, dy: 0 }, { dx: -2, dy: 1 },
              { dx: 2, dy: -1 }, { dx: 2, dy: 0 }, { dx: 2, dy: 1 },
              { dx: -1, dy: 2 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 },
              { dx: -1, dy: -2 }, { dx: 0, dy: -2 }, { dx: 1, dy: -2 }
            ];

            const shuffledOffsets = [...COMPANION_OFFSETS].sort((a, b) => {
              const hA = ((a.dx * 37 + a.dy * 19) + cellSeed + hi * 17) % 100;
              const hB = ((b.dx * 37 + b.dy * 19) + cellSeed + hi * 17) % 100;
              return hA - hB;
            });

            let placedProps = 0;
            for (const off of shuffledOffsets) {
              if (placedProps >= numProps) break;
              const px = hx + off.dx;
              const py = hy + off.dy;

              if (px < startTileX || px > endTileX || py < startTileY || py > endTileY) {
                placedProps++;
                continue;
              }

              const pTile = getTileAt(px, py);
              if (!pTile || (pTile.isSolid && !pTile.terrainType.includes('mountain') && !pTile.terrainType.includes('cliff'))) continue;
              const pt = pTile.terrainType || '';
              const propDefId = propPool[(placedProps + Math.floor(hutRand() * propPool.length)) % propPool.length];

              if (WATER_TERRAINS.has(pt) && propDefId !== 'prop_moored_rowboat') continue;
              if (pt.includes('road') || pt.includes('pass') || pt === 'settlement' || pTile.isSettlementOrigin) continue;

              const pCol = getCanonCollision(propDefId, 1, 1);
              if (canPlaceFootprint(px, py, pCol.w, pCol.h, occupiedGrid, getTileAt, false, propDefId, objects)) {
                const pObjId = `companion_prop_${px}_${py}`;
                markFootprintOccupied(px, py, pCol.w, pCol.h, occupiedGrid, pObjId, propDefId);
                objects.push({
                  id: pObjId,
                  defId: propDefId,
                  x: px,
                  y: py,
                  collision: (propDefId === 'prop_extinguished_campfire' || propDefId === 'prop_vegetable_patch') ? 'none' : 'soft',
                  tags: ['companion_prop', 'prop', cellRegion.id]
                });
                placedProps++;
              }
            }
          }
        }
      }
    }
  }

  // 4. Procedural Biome Scatter by Terrain & Region
  for (let y = startTileY; y <= endTileY; y++) {
    for (let x = startTileX; x <= endTileX; x++) {
      if (objects.length - authoredCount >= maxObjectsBudget) break;

      const tileKey = `${x},${y}`;
      if (occupiedGrid.has(tileKey)) continue;

      const tile = getTileAt(x, y);
      const terrain = tile.terrainType || '';
      const region = getRegionAt(x, y);

      // --- WATER TERRAINS (SEA, OCEAN, LAKES, RIVERS, REEFS) ---
      if (WATER_TERRAINS.has(terrain)) {
        const roll = rand();
        if (roll < 0.085) {
          let waterPool = [];
          if (region.id === 'frostmoon_sea') {
            waterPool = [
              'resource_snow_lotus',
              'nature_scatter_coastal_glowing_coral_rock',
              'nature_mossy_river_driftwood',
              'prop_moored_rowboat',
              'nature_reed_bed_marsh',
              'nature_scatter_celestial_lotus_pond_rockery',
              'nature_lotus_pond_cluster',
              'nature_mossy_stream_cascade',
              'structure_prof_fishing_bamboo_raft_spirit_net_dock',
              'nature_willow_lone_stream',
              'building_ferry_dock_shed',
              'nature_mountain_waterfall_splash_basin'
            ];
          } else if (region.id === 'eastern_sea') {
            waterPool = [
              'nature_scatter_coastal_glowing_coral_rock',
              'nature_lotus_pond_cluster',
              'nature_scatter_celestial_lotus_pond_rockery',
              'nature_mossy_river_driftwood',
              'nature_reed_bed_marsh',
              'prop_moored_rowboat',
              'nature_mossy_stream_cascade',
              'structure_prof_fishing_bamboo_raft_spirit_net_dock',
              'nature_willow_lone_stream',
              'building_ferry_dock_shed',
              'nature_mountain_waterfall_splash_basin'
            ];
          } else if (region.id === 'floating_wind_isles') {
            waterPool = [
              'nature_scatter_coastal_glowing_coral_rock',
              'nature_scatter_celestial_lotus_pond_rockery',
              'nature_lotus_pond_cluster',
              'nature_mossy_river_driftwood',
              'prop_moored_rowboat',
              'nature_reed_bed_marsh',
              'nature_mossy_stream_cascade',
              'structure_prof_fishing_bamboo_raft_spirit_net_dock',
              'nature_willow_lone_stream',
              'building_ferry_dock_shed',
              'nature_mountain_waterfall_splash_basin'
            ];
          } else if (region.id === 'bone_sea_coast') {
            waterPool = [
              'nature_scatter_coastal_glowing_coral_rock',
              'nature_mossy_river_driftwood',
              'prop_moored_rowboat',
              'nature_reed_bed_marsh',
              'nature_scatter_celestial_lotus_pond_rockery',
              'nature_lotus_pond_cluster',
              'nature_mossy_stream_cascade',
              'structure_prof_fishing_bamboo_raft_spirit_net_dock',
              'nature_willow_lone_stream',
              'building_ferry_dock_shed',
              'nature_mountain_waterfall_splash_basin'
            ];
          } else if (region.id === 'mirror_lake') {
            waterPool = [
              'nature_lotus_pond_cluster',
              'nature_scatter_celestial_lotus_pond_rockery',
              'nature_reed_bed_marsh',
              'nature_mossy_river_driftwood',
              'prop_moored_rowboat',
              'nature_scatter_coastal_glowing_coral_rock',
              'nature_mossy_stream_cascade',
              'structure_prof_fishing_bamboo_raft_spirit_net_dock',
              'nature_willow_lone_stream',
              'building_ferry_dock_shed',
              'nature_mountain_waterfall_splash_basin'
            ];
          } else {
            // Interior lakes, ponds, deltas, and rivers
            waterPool = [
              'nature_lotus_pond_cluster',
              'nature_scatter_celestial_lotus_pond_rockery',
              'nature_reed_bed_marsh',
              'nature_mossy_river_driftwood',
              'prop_moored_rowboat',
              'nature_scatter_coastal_glowing_coral_rock',
              'nature_mossy_stream_cascade',
              'structure_prof_fishing_bamboo_raft_spirit_net_dock',
              'nature_willow_lone_stream',
              'building_ferry_dock_shed',
              'nature_mountain_waterfall_splash_basin'
            ];
          }

          const startIdx = Math.floor(rand() * waterPool.length);
          for (let wi = 0; wi < waterPool.length; wi++) {
            const defId = waterPool[(startIdx + wi) % waterPool.length];
            const col = getCanonCollision(defId, 1, 1);
            if (canPlaceFootprint(x, y, col.w, col.h, occupiedGrid, getTileAt, false, defId, objects)) {
              const objId = `water_obj_${x}_${y}`;
              markFootprintOccupied(x, y, col.w, col.h, occupiedGrid, objId, defId);
              objects.push({
                id: objId,
                defId,
                x,
                y,
                collision: (defId === 'nature_lotus_pond_cluster' || defId === 'nature_scatter_celestial_lotus_pond_rockery' || defId === 'resource_snow_lotus' || defId === 'nature_mossy_stream_cascade') ? 'none' : 'soft',
                tags: ['water_scatter', region.id]
              });
              break;
            }
          }
        }
      }

      // --- MOUNTAIN, ROCK, PEAK, CRAG, HILL & CLIFF SCATTER ---
      else if (terrain === 'azure_mountain' || terrain.includes('mountain') || terrain.includes('crag') || terrain.includes('peak') || terrain === 'cliff' || terrain === 'hill' || terrain.includes('canyon') || region.id === 'ore_teeth_range') {
        const roll = rand();
        if (roll < 0.35) {
          const candidateRocks = assetBindings.natureScatters.rocks.filter(r =>
            !r.biomes || r.biomes.includes(region.id) || r.biomes.includes('mountain') || r.biomes.includes('ore_teeth_range')
          );
          const candidateFlora = [
            assetBindings.natureScatters.trees.find(t => t.defId.includes('pine_ancient')) || assetBindings.natureScatters.trees[2],
            assetBindings.natureScatters.trees.find(t => t.defId.includes('twisted_juniper')) || assetBindings.natureScatters.trees[1],
            ...assetBindings.natureScatters.trees.filter(t => t.defId.startsWith('tree_dead_wood_')),
            ...(assetBindings.natureScatters.shrubs || []).filter(s => s.biomes && (s.biomes.includes('mountain') || s.biomes.includes('ore_teeth_range')))
          ].filter(Boolean);
          const pool = [...candidateRocks, ...candidateFlora];
          const startIdx = Math.floor(rand() * pool.length);
          for (let ri = 0; ri < pool.length; ri++) {
            const rDef = pool[(startIdx + ri) % pool.length];
            if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt, false, rDef.defId, objects)) {
              const objId = `mountain_${x}_${y}`;
              markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId, rDef.defId);
              objects.push({
                id: objId,
                defId: rDef.defId,
                x,
                y,
                collision: rDef.collision,
                tags: ['mountain', 'barrier', region.id]
              });
              break;
            }
          }
        }
      }

      // --- DESERT & ARID DUNES ---
      else if (terrain.includes('desert') || terrain.includes('sand') || terrain.includes('dune') || terrain === 'oasis' || region.id === 'western_sacred_desert' || region.id === 'western_gorge_labyrinth') {
        const roll = rand();
        if (roll < 0.26) {
          const desertRocks = assetBindings.natureScatters.rocks.filter(r =>
            !r.biomes || r.biomes.includes('western_sacred_desert') || r.biomes.includes('desert')
          );
          const deadWoods = assetBindings.natureScatters.trees.filter(t => t.defId.startsWith('tree_dead_wood_'));
          const candidateFlora = [
            assetBindings.natureScatters.trees.find(t => t.defId.includes('locust')) || assetBindings.natureScatters.trees[12],
            ...(assetBindings.natureScatters.shrubs || []).filter(s => s.biomes.includes('western_sacred_desert') || s.biomes.includes('desert')),
            ...deadWoods
          ].filter(Boolean);
          const pool = [...desertRocks, ...candidateFlora];
          const startIdx = Math.floor(rand() * pool.length);
          for (let pi = 0; pi < pool.length; pi++) {
            const itemDef = pool[(startIdx + pi) % pool.length];
            if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
              const objId = `desert_${x}_${y}`;
              markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
              objects.push({
                id: objId,
                defId: itemDef.defId,
                x,
                y,
                collision: itemDef.collision,
                tags: ['desert', region.id]
              });
              break;
            }
          }
        }
      }

      // --- DEAD WOOD, LAVA, VOLCANIC OBSIDIAN, BASALT & CRATER ---
      else if (terrain === 'dead_wood' || terrain.includes('lava') || terrain.includes('volcano') || terrain === 'basalt' || terrain === 'crater' || region.id === 'lava_spine') {
        const roll = rand();
        if (roll < 0.26) {
          const volcanicPillars = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('lava_spine') || r.biomes.includes('abyssal_scar'))
          );
          const deadTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('lava_spine') || t.biomes.includes('dead_wood'))
          );
          const stumps = (assetBindings.natureScatters.shrubs || []).filter(s =>
            s.biomes && s.biomes.includes('lava_spine')
          );
          const pool = [...volcanicPillars, ...deadTrees, ...stumps];
          const startIdx = Math.floor(rand() * pool.length);
          for (let pi = 0; pi < pool.length; pi++) {
            const itemDef = pool[(startIdx + pi) % pool.length];
            if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
              const objId = `volcanic_${x}_${y}`;
              markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
              objects.push({
                id: objId,
                defId: itemDef.defId,
                x,
                y,
                collision: itemDef.collision,
                tags: ['volcanic', 'dead_wood', region.id]
              });
              break;
            }
          }
        }
      }

      // --- SWAMP, DEMONIC SWAMP, POISON POOL & MIASMA WETLANDS ---
      else if (terrain === 'swamp' || terrain === 'demonic_swamp' || terrain === 'poison_pool' || region.id === 'venom_mire' || region.id === 'southern_plague_woods') {
        const roll = rand();
        if (roll < 0.26) {
          const swampTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('swamp') || t.biomes.includes('venom_mire') || t.biomes.includes('southern_plague_woods') || t.biomes.includes('dead_wood'))
          );
          const swampRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('venom_mire') || r.biomes.includes('abyssal_scar') || r.biomes.includes('mountain') || r.biomes.includes('southern_plague_woods'))
          );
          const swampWaters = (assetBindings.natureScatters.waters || []).filter(w =>
            w.biomes && w.biomes.includes('venom_mire')
          );
          const swampStumps = (assetBindings.natureScatters.shrubs || []).filter(s =>
            s.biomes && (s.biomes.includes('dead_wood') || s.biomes.includes('lava_spine'))
          );
          const pool = [...swampTrees, ...swampRocks, ...swampWaters, ...swampStumps];
          const startIdx = Math.floor(rand() * pool.length);
          for (let pi = 0; pi < pool.length; pi++) {
            const itemDef = pool[(startIdx + pi) % pool.length];
            if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
              const objId = `swamp_${x}_${y}`;
              markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
              objects.push({
                id: objId,
                defId: itemDef.defId,
                x,
                y,
                collision: itemDef.collision,
                tags: ['swamp', 'miasma', region.id]
              });
              break;
            }
          }
        }
      }

      // --- BATTLEFIELD ASH, MIASMA WASTE & ABYSS EDGE ---
      else if (terrain === 'battlefield_ash' || terrain === 'miasma_waste' || terrain === 'abyss_edge' || region.id === 'crimson_battlefield' || region.id === 'abyssal_scar' || region.id === 'void_rift' || region.id === 'southern_demon_domain') {
        const roll = rand();
        if (roll < 0.28) {
          const abyssRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('abyssal_scar') || r.biomes.includes('void_rift') || r.biomes.includes('crimson_battlefield') || r.biomes.includes('southern_demon_domain') || r.biomes.includes('mountain'))
          );
          const abyssTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('abyssal_scar') || t.biomes.includes('crimson_battlefield') || t.biomes.includes('southern_demon_domain') || t.biomes.includes('dead_wood') || t.biomes.includes('void_rift'))
          );
          const abyssShrubs = (assetBindings.natureScatters.shrubs || []).filter(s =>
            s.biomes && (s.biomes.includes('crimson_battlefield') || s.biomes.includes('abyssal_scar'))
          );
          const pool = [...abyssRocks, ...abyssTrees, ...abyssShrubs];
          const startIdx = Math.floor(rand() * pool.length);
          for (let pi = 0; pi < pool.length; pi++) {
            const itemDef = pool[(startIdx + pi) % pool.length];
            if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
              const objId = `abyss_${x}_${y}`;
              markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
              objects.push({
                id: objId,
                defId: itemDef.defId,
                x,
                y,
                collision: itemDef.collision,
                tags: ['abyss', 'desolate', region.id]
              });
              break;
            }
          }
        }
      }

      // --- CANYON, CLIFF & GORGE ---
      else if (terrain === 'cliff' || terrain === 'canyon_floor' || region.id === 'sword_gorge' || region.id === 'western_gorge_labyrinth') {
        const roll = rand();
        if (roll < 0.32) {
          const gorgeRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('sword_gorge') || r.biomes.includes('western_gorge_labyrinth') || r.biomes.includes('mountain'))
          );
          const gorgeTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('sword_gorge') || t.biomes.includes('mountain'))
          );
          const pool = [...gorgeRocks, ...gorgeTrees];
          const startIdx = Math.floor(rand() * pool.length);
          for (let pi = 0; pi < pool.length; pi++) {
            const itemDef = pool[(startIdx + pi) % pool.length];
            if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
              const objId = `gorge_${x}_${y}`;
              markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
              objects.push({
                id: objId,
                defId: itemDef.defId,
                x,
                y,
                collision: itemDef.collision,
                tags: ['gorge', 'cliff', region.id]
              });
              break;
            }
          }
        }
      }

      // --- SNOW, GLACIER, ICE CRACK & FROZEN TUNDRA ---
      else if (terrain === 'snow' || terrain === 'glacier' || terrain === 'ice_crack' || region.id === 'northern_desolate') {
        const roll = rand();
        if (roll < 0.25) {
          const frostTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('northern_desolate') || t.biomes.includes('mountain'))
          );
          const frostRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('northern_desolate') || r.biomes.includes('mountain'))
          );
          const pool = [...frostTrees, ...frostRocks];
          const startIdx = Math.floor(rand() * pool.length);
          for (let pi = 0; pi < pool.length; pi++) {
            const itemDef = pool[(startIdx + pi) % pool.length];
            if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
              const objId = `frost_${x}_${y}`;
              markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
              objects.push({
                id: objId,
                defId: itemDef.defId,
                x,
                y,
                collision: itemDef.collision,
                tags: ['frost', 'tundra', region.id]
              });
              break;
            }
          }
        }
      }

      // --- ISLAND REEFS, FLOATING ISLES & COASTAL SHORES ---
      else if (terrain === 'island_reef' || terrain.includes('island') || terrain.includes('reef') || region.id === 'floating_wind_isles' || region.id === 'eastern_sea' || region.id === 'bone_sea_coast') {
        const roll = rand();
        if (roll < 0.30) {
          const islandWaters = (assetBindings.natureScatters.waters || []).filter(w =>
            w.biomes && (w.biomes.includes('eastern_sea') || w.biomes.includes('floating_wind_isles') || w.biomes.includes('bone_sea_coast'))
          );
          const islandRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('eastern_sea') || r.biomes.includes('floating_wind_isles') || r.biomes.includes('mountain'))
          );
          const islandTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('eastern_sea') || t.biomes.includes('floating_wind_isles'))
          );
          const pool = [...islandWaters, ...islandRocks, ...islandTrees];
          const startIdx = Math.floor(rand() * pool.length);
          for (let pi = 0; pi < pool.length; pi++) {
            const itemDef = pool[(startIdx + pi) % pool.length];
            if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
              const objId = `island_${x}_${y}`;
              markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
              objects.push({
                id: objId,
                defId: itemDef.defId,
                x,
                y,
                collision: itemDef.collision,
                tags: ['island', 'reef', region.id]
              });
              break;
            }
          }
        }
      }

      // --- FORMATION BARRENS ---
      else if (terrain === 'formation_tile' || region.id === 'formation_barrens') {
        const roll = rand();
        if (roll < 0.25) {
          const formRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('formation_barrens') || r.biomes.includes('mountain'))
          );
          const formShrubs = (assetBindings.natureScatters.shrubs || []).filter(s =>
            s.biomes && (s.biomes.includes('thundersteppe') || s.biomes.includes('formation_barrens'))
          );
          const formTrees = assetBindings.natureScatters.trees.filter(t =>
            t.biomes && (t.biomes.includes('formation_barrens') || t.biomes.includes('dead_wood'))
          );
          const pool = [...formRocks, ...formShrubs, ...formTrees];
          const startIdx = Math.floor(rand() * pool.length);
          for (let pi = 0; pi < pool.length; pi++) {
            const itemDef = pool[(startIdx + pi) % pool.length];
            if (itemDef && canPlaceFootprint(x, y, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
              const objId = `formation_${x}_${y}`;
              markFootprintOccupied(x, y, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
              objects.push({
                id: objId,
                defId: itemDef.defId,
                x,
                y,
                collision: itemDef.collision,
                tags: ['formation', region.id]
              });
              break;
            }
          }
        }
      }


      // --- BAMBOO GROVE CLUSTER ---
      else if (terrain.includes('bamboo')) {
        const roll = rand();
        if (roll < 0.45) {
          const bDefs = assetBindings.natureScatters.bamboo;
          const bDef = bDefs[Math.floor(rand() * bDefs.length)];
          if (canPlaceFootprint(x, y, bDef.cw, bDef.ch, occupiedGrid, getTileAt, false, bDef.defId, objects)) {
            const objId = `bamboo_${x}_${y}`;
            markFootprintOccupied(x, y, bDef.cw, bDef.ch, occupiedGrid, objId, bDef.defId);
            objects.push({
              id: objId,
              defId: bDef.defId,
              x,
              y,
              collision: bDef.collision,
              tags: ['bamboo', 'vegetation']
            });
          }
        }
      }

      // --- FOREST, SPIRIT WOOD & DENSE WOODLAND ---
      else if (terrain === 'forest' || terrain === 'spirit_wood' || region.id === 'spirit_wood_sea') {
        const roll = rand();
        if (roll < 0.35) {
          const candidateTrees = assetBindings.natureScatters.trees.filter(t =>
            !t.biomes || t.biomes.includes(region.id) || t.biomes.includes('forest')
          );
          const tDef = candidateTrees.length > 0
            ? candidateTrees[Math.floor(rand() * candidateTrees.length)]
            : assetBindings.natureScatters.trees[0];

          if (canPlaceFootprint(x, y, tDef.cw, tDef.ch, occupiedGrid, getTileAt, false, tDef.defId, objects)) {
            const objId = `tree_${x}_${y}`;
            markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId, tDef.defId);
            objects.push({
              id: objId,
              defId: tDef.defId,
              x,
              y,
              collision: tDef.collision,
              tags: ['tree', region.id]
            });
          }
        } else if (roll < 0.42) {
          const mossRocks = assetBindings.natureScatters.rocks.filter(r =>
            r.biomes && (r.biomes.includes('spirit_wood_sea') || r.biomes.includes('plains'))
          );
          if (mossRocks.length > 0) {
            const rDef = mossRocks[Math.floor(rand() * mossRocks.length)];
            if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt, false, rDef.defId, objects)) {
              const objId = `forest_rock_${x}_${y}`;
              markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId, rDef.defId);
              objects.push({
                id: objId,
                defId: rDef.defId,
                x,
                y,
                collision: rDef.collision,
                tags: ['forest_rock', region.id]
              });
            }
          }
        }
      }

      // --- WATER EDGES & DELTA FLORA ---
      else if (terrain.includes('lake') || terrain.includes('pond') || terrain === 'pond_lotus' || terrain === 'river') {
        const roll = rand();
        if (roll < 0.18) {
          const wDefs = assetBindings.natureScatters.waters;
          const wDef = wDefs[Math.floor(rand() * wDefs.length)];
          if (canPlaceFootprint(x, y, wDef.cw, wDef.ch, occupiedGrid, getTileAt, false, wDef.defId, objects)) {
            const objId = `water_veg_${x}_${y}`;
            markFootprintOccupied(x, y, wDef.cw, wDef.ch, occupiedGrid, objId, wDef.defId);
            objects.push({
              id: objId,
              defId: wDef.defId,
              x,
              y,
              collision: wDef.collision,
              tags: ['water_flora', region.id]
            });
          }
        } else if (roll < 0.24) {
          const willow = assetBindings.natureScatters.trees.find(t => t.defId.includes('willow'));
          if (willow && canPlaceFootprint(x, y, willow.cw, willow.ch, occupiedGrid, getTileAt, false, willow.defId, objects)) {
            const objId = `willow_${x}_${y}`;
            markFootprintOccupied(x, y, willow.cw, willow.ch, occupiedGrid, objId, willow.defId);
            objects.push({
              id: objId,
              defId: willow.defId,
              x,
              y,
              collision: willow.collision,
              tags: ['water_tree', region.id]
            });
          }
        }
      }

      // --- PLAINS, MEADOW & PRAIRIE SCATTER ---
      else if (terrain === 'plains' || terrain === 'meadow' || terrain === 'farmland' || terrain === 'herb_field' || region.id === 'central_plains' || region.id === 'beast_prairies' || region.id === 'border_march' || region.id === 'nine_springs_delta' || region.id === 'mirror_lake') {
        const roll = rand();
        const treeThreshold = isPopulated ? 0.09 : 0.06;
        const shrubThreshold = isPopulated ? 0.22 : 0.12;
        const rockThreshold = isPopulated ? 0.30 : 0.16;

        if (roll < treeThreshold) {
          const candidateTrees = assetBindings.natureScatters.trees.filter(t =>
            !t.biomes || t.biomes.includes(region.id) || t.biomes.includes('plains')
          );
          if (candidateTrees.length > 0) {
            const startIdx = Math.floor(rand() * candidateTrees.length);
            for (let ti = 0; ti < candidateTrees.length; ti++) {
              const tDef = candidateTrees[(startIdx + ti) % candidateTrees.length];
              if (canPlaceFootprint(x, y, tDef.cw, tDef.ch, occupiedGrid, getTileAt, false, tDef.defId, objects)) {
                const objId = `tree_${x}_${y}`;
                markFootprintOccupied(x, y, tDef.cw, tDef.ch, occupiedGrid, objId, tDef.defId);
                objects.push({
                  id: objId,
                  defId: tDef.defId,
                  x,
                  y,
                  collision: tDef.collision,
                  tags: ['tree', 'scholar', region.id]
                });
                break;
              }
            }
          }
        } else if (roll < shrubThreshold) {
          const shrubs = (assetBindings.natureScatters.shrubs || []).filter(s =>
            !s.biomes || s.biomes.includes(region.id) || s.biomes.includes('plains') || s.biomes.includes('meadow')
          );
          if (shrubs.length > 0) {
            const startIdx = Math.floor(rand() * shrubs.length);
            for (let si = 0; si < shrubs.length; si++) {
              const sDef = shrubs[(startIdx + si) % shrubs.length];
              if (canPlaceFootprint(x, y, sDef.cw, sDef.ch, occupiedGrid, getTileAt, false, sDef.defId, objects)) {
                const objId = `shrub_${x}_${y}`;
                markFootprintOccupied(x, y, sDef.cw, sDef.ch, occupiedGrid, objId, sDef.defId);
                objects.push({
                  id: objId,
                  defId: sDef.defId,
                  x,
                  y,
                  collision: sDef.collision,
                  tags: ['shrub', region.id]
                });
                break;
              }
            }
          }
        } else if (roll < rockThreshold) {
          const candidateRocks = assetBindings.natureScatters.rocks.filter(r =>
            !r.biomes || r.biomes.includes(region.id) || r.biomes.includes('plains')
          );
          if (candidateRocks.length > 0) {
            const startIdx = Math.floor(rand() * candidateRocks.length);
            for (let ri = 0; ri < candidateRocks.length; ri++) {
              const rDef = candidateRocks[(startIdx + ri) % candidateRocks.length];
              if (canPlaceFootprint(x, y, rDef.cw, rDef.ch, occupiedGrid, getTileAt, false, rDef.defId, objects)) {
                const objId = `rock_${x}_${y}`;
                markFootprintOccupied(x, y, rDef.cw, rDef.ch, occupiedGrid, objId, rDef.defId);
                objects.push({
                  id: objId,
                  defId: rDef.defId,
                  x,
                  y,
                  collision: rDef.collision,
                  tags: ['rock', region.id]
                });
                break;
              }
            }
          }
        }
      }
    }
  }


  // Apply frame substitutions to all objects before caching and returning (Prompt C2)
  for (let i = 0; i < objects.length; i++) {
    const origId = objects[i].defId;
    const resolved = resolveDef(origId);
    if (resolved && resolved !== origId) {
      objects[i].defId = resolved;
    }
  }

  // Cache up to 256 chunks in memory
  if (chunkCache.size > 256) {
    const firstKey = chunkCache.keys().next().value;
    chunkCache.delete(firstKey);
  }
  chunkCache.set(cacheKey, objects);

  return objects;
}

/**
 * Retrieves scattered objects across a multi-chunk viewport window.
 */
function getViewportObjects(minTileX, minTileY, maxTileX, maxTileY, worldSeed = WORLD_SEED) {
  const minChunkX = Math.floor(minTileX / CHUNK_SIZE);
  const maxChunkX = Math.floor(maxTileX / CHUNK_SIZE);
  const minChunkY = Math.floor(minTileY / CHUNK_SIZE);
  const maxChunkY = Math.floor(maxTileY / CHUNK_SIZE);

  const result = [];
  const maxBudget = 140;

  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      if (result.length >= maxBudget) break;
      const chunkObjs = getChunkObjects(cx, cy, worldSeed);
      for (const obj of chunkObjs) {
        if (result.length >= maxBudget) break;
        if (obj.x >= minTileX && obj.x <= maxTileX && obj.y >= minTileY && obj.y <= maxTileY) {
          result.push(obj);
        }
      }
    }
  }

  // Filter: landmarks must be strictly within requested bounds (Prompt 1.4)
  return result.filter(obj => {
    if (obj.tags && obj.tags.includes('landmark')) {
      return obj.x >= minTileX && obj.x <= maxTileX && obj.y >= minTileY && obj.y <= maxTileY;
    }
    return true;
  });
}

module.exports = {
  CHUNK_SIZE,
  getChunkObjects,
  getViewportObjects,
  isQuarantined,
  getCanonCollision,
  resolveDef,
  isAllowedOnTerrain,
  KNOWN_FRAMES
};
