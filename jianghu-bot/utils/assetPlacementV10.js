/**
 * utils/assetPlacementV10.js
 * Master Contextual Asset Placement Engine (Prompt I1 & I2)
 *
 * Deterministically places 109 non-excluded asset families across the world:
 * - village_yard (14 building_village_* variants)
 * - wayside (19 building_wayside_* variants)
 * - rustic_country (10 building_rustic/countryside variants)
 * - prof_structure (5 structure_prof_* variants)
 * - town_facility (16 building facility variants)
 * - boss_monster (31 regional boss & elite sprites)
 * - monster_marker (10 thematic monster marker variants)
 * - poi_misc & water_edge (8 decorative & aquatic structures)
 */

const fs = require('fs');
const path = require('path');
const GC = require('./gridContract');

const bossSpritesData = require('../world-data/boss-sprites-v10.json');
const bestiaryData = require('../world-data/bestiary-v2.json');

const CHUNK_SIZE = 32;

function hash2d(x, y, seed = 0) {
  let h = ((x * 374761393 + y * 668265263) ^ 0x5bf03635 ^ seed) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// 1. Village Yard 14 Variants
const VILLAGE_YARD_VARIANTS = [
  'building_village_thatched_granary_round',
  'building_village_chicken_coop_bamboo',
  'building_village_stone_water_trough',
  'building_village_bamboo_grain_drying_mat',
  'building_village_stone_pigpen_pen',
  'building_village_earthen_dyeing_vats',
  'building_village_stone_grain_mortar_pestle',
  'building_village_stone_grain_roller_mill',
  'building_village_bamboo_weaving_shed',
  'building_village_wooden_paddy_waterwheel',
  'building_village_stone_tofu_press_bench',
  'building_village_bamboo_duck_coop_ramp',
  'building_village_bamboo_fish_trap_weir',
  'building_village_stone_grain_soaking_cistern'
];

// 2. Wayside 19 Variants
const WAYSIDE_VARIANTS = [
  'building_wayside_tea_resting_shed',
  'building_wayside_earth_god_miniature_shrine',
  'building_wayside_bamboo_raft_mooring_post',
  'building_wayside_bamboo_tea_shed_bench',
  'building_wayside_stone_boundary_stele',
  'building_wayside_fortune_teller_booth',
  'building_wayside_stone_well_windlass',
  'building_wayside_straw_scarecrow_bamboo',
  'building_wayside_wooden_mile_marker_stele',
  'building_wayside_stone_stele_shrine_arbor',
  'building_wayside_stone_arch_bridge',
  'building_wayside_bamboo_courier_mailbox_stand',
  'building_wayside_stone_rain_shelter_arbor',
  'building_wayside_stone_stele_pavilion_ruin',
  'building_wayside_bamboo_torch_beacon_brazier',
  'building_wayside_mile_marker_stele',
  'building_wayside_stone_stele',
  'building_wayside_spirit_altar',
  'building_wayside_wooden_notice_board',
  'building_wine_tavern_flagpole_sign'
];

// 3. Rustic Country 10 Variants
const RUSTIC_COUNTRY_VARIANTS = [
  'building_rustic_apiary_beehives',
  'building_rustic_bamboo_fish_drying_rack',
  'building_rustic_pottery_kiln_earthen',
  'building_rustic_bamboo_water_pipe_aqueduct',
  'building_rustic_cart_straw_shed',
  'building_rustic_drying_racks',
  'building_rustic_wooden_bridge',
  'building_countryside_thatched_gazebo',
  'building_countryside_thatched_haystack_cluster',
  'building_riverside_watermill_paddle_wheel'
];

// 4. Professional Structures 5 Variants
const PROF_STRUCTURE_VARIANTS = [
  'structure_prof_alchemy_eight_trigrams_bronze_furnace',
  'structure_prof_cooking_immortal_delicacy_hearth_oven',
  'structure_prof_mining_spirit_ore_crushing_stamp_mill',
  'structure_prof_farming_spirit_herb_nursery_trellis',
  'structure_prof_smithing_celestial_bellows_anvil'
];

// 5. Town Facilities 16 Variants
const TOWN_FACILITY_VARIANTS = [
  'building_alchemist_hall',
  'building_apothecary_store',
  'building_auction_house',
  'building_blacksmith_foundry',
  'building_blacksmith_bellows_furnace',
  'building_blacksmith_weapon_rack',
  'building_forge_workshop',
  'building_granary_silo',
  'building_inn_roadside',
  'building_residential_manor',
  'building_stone_mill_grain_grinder',
  'building_tea_house',
  'building_wine_tavern_flagpole_sign',
  'building_wooden_watchtower',
  'building_spirit_pagoda',
  'building_mountain_hermitage_shack'
];

// 6. Thematic Monster Markers (10)
const ALL_MONSTER_MARKERS = [
  'monster_white_tiger',
  'monster_demon_wolf',
  'monster_iron_bear',
  'monster_sand_scorpion',
  'monster_flame_ape',
  'monster_blood_serpent',
  'monster_rock_golem',
  'monster_storm_roc',
  'monster_abyssal_serpent',
  'monster_swirl_den'
];

// Azure Mountain Pass 3 Gap Coordinates
const AZURE_PASSES = [
  { x: 2200, y: 3350, name: 'Celah Azure Barat' },
  { x: 2600, y: 3350, name: 'Celah Azure Tengah' },
  { x: 3100, y: 3200, name: 'Celah Azure Timur' }
];

// Generate candidate spawn offsets per regional boss across its 12x12 cleared lair territory
const REGIONAL_BOSS_SPAWNS = [];
for (const [regId, regData] of Object.entries(bestiaryData)) {
  const boss = regData.boss;
  if (!boss || !boss.lair) continue;
  const { centerX: lx, centerY: ly } = boss.lair;
  const bossDefId = bossSpritesData.map[regId] ? bossSpritesData.map[regId].boss : null;
  if (!bossDefId) continue;

  // Offsets inside 12x12 cleared lair territory avoiding exact center if landmark is present
  const OFFSETS = [
    { dx: -1, dy: -1 },
    { dx: 4, dy: -3 },
    { dx: -4, dy: 3 },
    { dx: 3, dy: 4 },
    { dx: -3, dy: -4 },
    { dx: 5, dy: 2 },
    { dx: -5, dy: 2 },
    { dx: -4, dy: -2 },
    { dx: -5, dy: 0 },
    { dx: -5, dy: -3 },
    { dx: -2, dy: 4 },
    { dx: -2, dy: -5 }
  ];

  for (let i = 0; i < OFFSETS.length; i++) {
    REGIONAL_BOSS_SPAWNS.push({
      regId,
      defId: bossDefId,
      x: lx + OFFSETS[i].dx,
      y: ly + OFFSETS[i].dy,
      name: i === 0 ? boss.name : `Penjaga ${boss.name}`
    });
  }
}

// Regional Elites in Crimson Battlefield & Abyssal Scar (4 spawns each)
const ELITE_SPAWNS = [
  { regId: 'crimson_battlefield', defId: 'monster_regional_crimson_battlefield_nether_warsteed', x: 2908, y: 612 },
  { regId: 'crimson_battlefield', defId: 'monster_regional_crimson_battlefield_nether_warsteed', x: 2916, y: 620 },
  { regId: 'crimson_battlefield', defId: 'monster_regional_crimson_battlefield_nether_warsteed', x: 2902, y: 604 },
  { regId: 'crimson_battlefield', defId: 'monster_regional_crimson_battlefield_nether_warsteed', x: 2922, y: 628 },
  { regId: 'abyssal_scar', defId: 'monster_regional_abyssal_shadow_fiend', x: 1904, y: 612 },
  { regId: 'abyssal_scar', defId: 'monster_regional_abyssal_shadow_fiend', x: 1912, y: 616 },
  { regId: 'abyssal_scar', defId: 'monster_regional_abyssal_shadow_fiend', x: 1892, y: 612 },
  { regId: 'abyssal_scar', defId: 'monster_regional_abyssal_shadow_fiend', x: 1894, y: 618 }
];

/**
 * Main entrypoint called from utils/objectScatter.js
 */
function placeContextualAssets(
  chunkX,
  chunkY,
  worldSeed,
  occupiedGrid,
  objects,
  helpers
) {
  const {
    canPlaceFootprint,
    markFootprintOccupied,
    getTileAt,
    getRegionAt,
    resolveDef,
    isQuarantined,
    allAnchors,
    AUTHORED_ROAD_TILES
  } = helpers;

  const startTileX = chunkX * CHUNK_SIZE;
  const startTileY = chunkY * CHUNK_SIZE;
  const endTileX = startTileX + CHUNK_SIZE - 1;
  const endTileY = startTileY + CHUNK_SIZE - 1;

  // --------------------------------------------------------------------------
  // A. REGIONAL BOSS & ELITE SPRITES (31 families)
  // --------------------------------------------------------------------------
  const bossPlacedPerReg = new Map();
  for (const b of REGIONAL_BOSS_SPAWNS) {
    if ((bossPlacedPerReg.get(b.regId) || 0) >= 3) continue;
    if (b.x >= startTileX && b.x <= endTileX && b.y >= startTileY && b.y <= endTileY) {
      if (!isQuarantined(b.defId)) {
        if (canPlaceFootprint(b.x, b.y, 2, 2, occupiedGrid, getTileAt, true, b.defId, objects)) {
          const count = bossPlacedPerReg.get(b.regId) || 0;
          bossPlacedPerReg.set(b.regId, count + 1);
          const objId = `boss_${b.regId}_${b.x}_${b.y}`;
          markFootprintOccupied(b.x, b.y, 2, 2, occupiedGrid, objId, b.defId);
          objects.push({
            id: objId,
            defId: b.defId,
            x: b.x,
            y: b.y,
            customLabel: b.name || 'Siluman Regional',
            collision: 'solid',
            tags: ['boss', 'monster', b.regId]
          });
        }
      }
    }
  }

  for (const elite of ELITE_SPAWNS) {
    if (elite.x >= startTileX && elite.x <= endTileX && elite.y >= startTileY && elite.y <= endTileY) {
      if (!isQuarantined(elite.defId) && canPlaceFootprint(elite.x, elite.y, 2, 2, occupiedGrid, getTileAt, true, elite.defId, objects)) {
        const objId = `elite_${elite.regId}_${elite.x}_${elite.y}`;
        markFootprintOccupied(elite.x, elite.y, 2, 2, occupiedGrid, objId, elite.defId);
        objects.push({
          id: objId,
          defId: elite.defId,
          x: elite.x,
          y: elite.y,
          customLabel: 'Siluman Elit Nether',
          collision: 'solid',
          tags: ['elite', 'monster', elite.regId]
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // B. MOUNTAIN PASS STONE ARCHWAYS (3 Azure Mountain Gaps)
  // --------------------------------------------------------------------------
  for (const pass of AZURE_PASSES) {
    if (pass.x >= startTileX && pass.x <= endTileX && pass.y >= startTileY && pass.y <= endTileY) {
      const archDef = 'building_mountain_pass_stone_archway';
      let placed = false;
      for (let dy = -5; dy <= 5; dy++) {
        if (placed) break;
        for (let dx = -5; dx <= 5; dx++) {
          const px = pass.x + dx;
          const py = pass.y + dy;
          if (AUTHORED_ROAD_TILES.has(`${px},${py}`)) continue;
          if (canPlaceFootprint(px, py, 2, 2, occupiedGrid, getTileAt, true, archDef, objects)) {
            const objId = `archway_${px}_${py}`;
            markFootprintOccupied(px, py, 2, 2, occupiedGrid, objId, archDef);
            objects.push({
              id: objId,
              defId: archDef,
              x: px,
              y: py,
              customLabel: pass.name,
              collision: 'solid',
              tags: ['archway', 'pass', 'azure_mountain_range']
            });
            placed = true;
            break;
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // C. VILLAGE YARDS (All 14 building_village_* variants)
  // --------------------------------------------------------------------------
  const authoredHousesInChunk = objects.filter(o => o.tags && o.tags.includes('shelter'));
  for (let hi = 0; hi < authoredHousesInChunk.length; hi++) {
    const house = authoredHousesInChunk[hi];
    const hx = house.x;
    const hy = house.y;

    const YARD_CANDIDATES = [
      { x: hx - 1, y: hy },
      { x: hx + 1, y: hy },
      { x: hx, y: hy - 1 }
    ];

    for (const cand of YARD_CANDIDATES) {
      if (cand.x < startTileX || cand.x > endTileX || cand.y < startTileY || cand.y > endTileY) continue;
      if (AUTHORED_ROAD_TILES.has(`${cand.x},${cand.y}`)) continue;

      const varIdx = (Math.abs(chunkX * 13 + chunkY * 17) + hi) % VILLAGE_YARD_VARIANTS.length;
      const yardDef = VILLAGE_YARD_VARIANTS[varIdx];

      if (canPlaceFootprint(cand.x, cand.y, 1, 1, occupiedGrid, getTileAt, false, yardDef, objects)) {
        const objId = `yard_${cand.x}_${cand.y}`;
        markFootprintOccupied(cand.x, cand.y, 1, 1, occupiedGrid, objId, yardDef);
        objects.push({
          id: objId,
          defId: yardDef,
          x: cand.x,
          y: cand.y,
          collision: 'solid',
          tags: ['village_yard', 'crafted']
        });
        break;
      }
    }
  }

  // --------------------------------------------------------------------------
  // D. WAYSIDE STRUCTURES (All 19 building_wayside_* variants along roads)
  // --------------------------------------------------------------------------
  let roadCellCounter = 0;
  for (let y = startTileY; y <= endTileY; y++) {
    for (let x = startTileX; x <= endTileX; x++) {
      if (!AUTHORED_ROAD_TILES.has(`${x},${y}`)) continue;
      roadCellCounter++;

      // Place a wayside every ~8 road cells (Prompt I1: spaced along road corridors)
      if ((roadCellCounter % 8) !== 0) continue;

      let tooCloseToAnchor = false;
      for (const a of allAnchors) {
        if (Math.max(Math.abs(x - a.x), Math.abs(y - a.y)) < 2) {
          tooCloseToAnchor = true;
          break;
        }
      }
      if (tooCloseToAnchor) continue;

      const SIDE_OFFSETS = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
      for (const off of SIDE_OFFSETS) {
        const sx = x + off.dx;
        const sy = y + off.dy;
        if (AUTHORED_ROAD_TILES.has(`${sx},${sy}`)) continue;
        if (sx < startTileX || sx > endTileX || sy < startTileY || sy > endTileY) continue;

        const tile = getTileAt(sx, sy);
        if (!tile || tile.isSolid) continue;

        const wIdx = (Math.abs(chunkX * 19 + chunkY * 23) + roadCellCounter) % WAYSIDE_VARIANTS.length;
        const waysideDef = WAYSIDE_VARIANTS[wIdx];

        const g = GC.getGrid(waysideDef);
        const fw = g ? g.fw : 1;
        const fh = g ? g.fh : 1;

        const isBridge = waysideDef.includes('bridge') || waysideDef.includes('pontoon');
        let touchesRoad = false;
        for (let dy = 0; dy < fh; dy++) {
          for (let dx = 0; dx < fw; dx++) {
            if (AUTHORED_ROAD_TILES.has(`${sx + dx},${sy + dy}`)) {
              touchesRoad = true;
              break;
            }
          }
          if (touchesRoad) break;
        }
        if (touchesRoad && !isBridge) continue;

        if (canPlaceFootprint(sx, sy, fw, fh, occupiedGrid, getTileAt, false, waysideDef, objects)) {
          const objId = `wayside_${sx}_${sy}`;
          markFootprintOccupied(sx, sy, fw, fh, occupiedGrid, objId, waysideDef);
          objects.push({
            id: objId,
            defId: waysideDef,
            x: sx,
            y: sy,
            collision: isBridge ? 'open' : 'solid',
            tags: ['wayside', 'roadside']
          });
          break;
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // E. TOWN FACILITIES & PROF STRUCTURES (Proportionate by Anchor Tier)
  // --------------------------------------------------------------------------
  const anchorsInChunk = allAnchors.filter(a =>
    a.x >= (startTileX - 32) && a.x <= (endTileX + 32) &&
    a.y >= (startTileY - 32) && a.y <= (endTileY + 32)
  );

  for (let ai = 0; ai < anchorsInChunk.length; ai++) {
    const a = anchorsInChunk[ai];
    const isMajor = a.type === 'capital_city' || a.type === 'major_city' || a.type === 'city' || a.type === 'sect';
    const isUrban = isMajor || a.type === 'town';

    // Facilities: Major cities get 10 facilities, small rural villages get 2 local facilities
    const facCount = isUrban ? 10 : 2;
    for (let fi = 0; fi < facCount; fi++) {
      let facDef = TOWN_FACILITY_VARIANTS[(ai * 7 + fi) % TOWN_FACILITY_VARIANTS.length];
      if (a.id === 'xitong_city' && fi === 0) facDef = 'xitong_city_landmark';
      if (isMajor && fi === 0) facDef = 'building_spirit_pagoda';

      const g = GC.getGrid(facDef);
      const fw = g ? g.fw : 2;
      const fh = g ? g.fh : 2;

      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = (((fi * 36) + attempt * 30) / 180) * Math.PI;
        const dist = 5 + attempt * 2;
        const fx = Math.round(a.x + Math.cos(angle) * dist);
        const fy = Math.round(a.y + Math.sin(angle) * dist);

        if (fx < startTileX || fx > endTileX || fy < startTileY || fy > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(`${fx},${fy}`)) continue;

        if (canPlaceFootprint(fx, fy, fw, fh, occupiedGrid, getTileAt, false, facDef, objects)) {
          const objId = `facility_${fx}_${fy}`;
          markFootprintOccupied(fx, fy, fw, fh, occupiedGrid, objId, facDef);
          objects.push({
            id: objId,
            defId: facDef,
            x: fx,
            y: fy,
            collision: 'solid',
            tags: ['facility', a.type]
          });
          break;
        }
      }
    }

    // Professional Craft Structure (4 for urban, 2 for rural)
    const profCount = isUrban ? 4 : 2;
    for (let pi = 0; pi < profCount; pi++) {
      const profDef = PROF_STRUCTURE_VARIANTS[(ai * 3 + pi) % PROF_STRUCTURE_VARIANTS.length];
      for (let attempt = 0; attempt < 10; attempt++) {
        const pAngle = (((pi * 90) + attempt * 36) / 180) * Math.PI;
        const pDist = 4 + attempt * 2;
        const px = Math.round(a.x + Math.cos(pAngle) * pDist);
        const py = Math.round(a.y + Math.sin(pAngle) * pDist);

        if (px < startTileX || px > endTileX || py < startTileY || py > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(`${px},${py}`)) continue;

        if (canPlaceFootprint(px, py, 1, 1, occupiedGrid, getTileAt, false, profDef, objects)) {
          const objId = `prof_${px}_${py}`;
          markFootprintOccupied(px, py, 1, 1, occupiedGrid, objId, profDef);
          objects.push({
            id: objId,
            defId: profDef,
            x: px,
            y: py,
            collision: 'solid',
            tags: ['craft_structure', 'profession']
          });
          break;
        }
      }
    }

    // Village & Settlement Signature Trees (Peach blossoms, weeping willows, bamboo, ginkgo)
    const VILLAGE_TREE_VARIANTS = [
      'tree_spirit_peach_v1',
      'tree_spirit_peach_v2',
      'tree_willow_river_v1',
      'tree_willow_river_v2',
      'bamboo_clump_2x2',
      'bamboo_clump_1x1',
      'nature_ancient_scholar_weeping_peach_blossom',
      'nature_ancient_scholar_ginkgo_gold_canopy'
    ];
    const treeLimit = isUrban ? 4 : 8;
    for (let ti = 0; ti < treeLimit; ti++) {
      const treeDef = VILLAGE_TREE_VARIANTS[(ai * 5 + ti) % VILLAGE_TREE_VARIANTS.length];
      const g = GC.getGrid(treeDef);
      const fw = g ? g.fw : 1;
      const fh = g ? g.fh : 1;

      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = (((ti * 45) + attempt * 25) / 180) * Math.PI;
        const dist = 3 + attempt * 2;
        const tx = Math.round(a.x + Math.cos(angle) * dist);
        const ty = Math.round(a.y + Math.sin(angle) * dist);

        if (tx < startTileX || tx > endTileX || ty < startTileY || ty > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(`${tx},${ty}`)) continue;

        const tile = getTileAt(tx, ty);
        if (!tile || tile.isSolid) continue;

        if (canPlaceFootprint(tx, ty, fw, fh, occupiedGrid, getTileAt, false, treeDef, objects)) {
          const objId = `village_tree_${tx}_${ty}`;
          markFootprintOccupied(tx, ty, fw, fh, occupiedGrid, objId, treeDef);
          objects.push({
            id: objId,
            defId: treeDef,
            x: tx,
            y: ty,
            collision: 'soft',
            tags: ['village_tree', 'nature', a.type]
          });
          break;
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // F. RUSTIC COUNTRYSIDE (8 for urban outskirts, 3 for rural hamlets)
  // --------------------------------------------------------------------------
  for (let ai = 0; ai < anchorsInChunk.length; ai++) {
    const a = anchorsInChunk[ai];
    const isUrban = a.type === 'capital_city' || a.type === 'major_city' || a.type === 'city' || a.type === 'sect' || a.type === 'town';
    const rusticLimit = isUrban ? 8 : 3;
    for (let ri = 0; ri < rusticLimit; ri++) {
      const rusticDef = RUSTIC_COUNTRY_VARIANTS[(ai * 7 + ri) % RUSTIC_COUNTRY_VARIANTS.length];
      const g = GC.getGrid(rusticDef);
      const fw = g ? g.fw : 2;
      const fh = g ? g.fh : 2;

      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = (((ri * 36) + attempt * 30) / 180) * Math.PI;
        const dist = 6 + attempt * 2;
        const rx = Math.round(a.x + Math.cos(angle) * dist);
        const ry = Math.round(a.y + Math.sin(angle) * dist);

        if (rx < startTileX || rx > endTileX || ry < startTileY || ry > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(`${rx},${ry}`)) continue;

        const tile = getTileAt(rx, ry);
        if (!tile || tile.isSolid) continue;

        if (canPlaceFootprint(rx, ry, fw, fh, occupiedGrid, getTileAt, false, rusticDef, objects)) {
          const objId = `rustic_${rx}_${ry}`;
          markFootprintOccupied(rx, ry, fw, fh, occupiedGrid, objId, rusticDef);
          objects.push({
            id: objId,
            defId: rusticDef,
            x: rx,
            y: ry,
            collision: 'solid',
            tags: ['rustic_country', 'outskirts']
          });
          break;
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // G. POI MISC & WATER EDGE STRUCTURES (8 variants)
  // --------------------------------------------------------------------------
  for (const a of anchorsInChunk) {
    const wDefs = ['building_ferry_dock', 'building_watermill_stream', 'building_riverside_watermill_paddle_wheel'];
    for (let wi = 0; wi < wDefs.length; wi++) {
      const wDef = wDefs[wi];
      for (let attempt = 0; attempt < 6; attempt++) {
        const wx = a.x + (wi * 4 - 4) + (attempt % 3);
        const wy = a.y + 6 + Math.floor(attempt / 3) * 2;
        if (wx < startTileX || wx > endTileX || wy < startTileY || wy > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(`${wx},${wy}`)) continue;

        if (canPlaceFootprint(wx, wy, 2, 2, occupiedGrid, getTileAt, false, wDef, objects)) {
          const objId = `w_edge_${wx}_${wy}`;
          markFootprintOccupied(wx, wy, 2, 2, occupiedGrid, objId, wDef);
          objects.push({
            id: objId,
            defId: wDef,
            x: wx,
            y: wy,
            collision: 'solid',
            tags: ['water_edge', 'facility']
          });
          break;
        }
      }
    }

    const courtyards = ['building_stone_lantern_shrine', 'building_spirit_gathering_gazebo', 'building_stone_water_basin'];
    for (let ci = 0; ci < courtyards.length; ci++) {
      const cDef = courtyards[ci];
      for (let attempt = 0; attempt < 6; attempt++) {
        const cx = a.x + (ci * 3 - 3) + (attempt % 3);
        const cy = a.y - 4 - Math.floor(attempt / 3) * 2;
        if (cx < startTileX || cx > endTileX || cy < startTileY || cy > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(`${cx},${cy}`)) continue;

        if (canPlaceFootprint(cx, cy, 1, 1, occupiedGrid, getTileAt, false, cDef, objects)) {
          const objId = `court_${cx}_${cy}`;
          markFootprintOccupied(cx, cy, 1, 1, occupiedGrid, objId, cDef);
          objects.push({
            id: objId,
            defId: cDef,
            x: cx,
            y: cy,
            collision: 'solid',
            tags: ['poi_misc', 'courtyard']
          });
          break;
        }
      }
    }
  }

  // Ancient Broken Halberd Sword Grave in Crimson Battlefield & Border March (~1 per 3 chunks)
  const chunkCenterRegion = getRegionAt(startTileX + 16, startTileY + 16);
  if (chunkCenterRegion && (chunkCenterRegion.id === 'crimson_battlefield' || chunkCenterRegion.id === 'border_march')) {
    const hSeed = hash2d(chunkX, chunkY, 3311);
    if ((hSeed % 3) === 0) {
      const hx = startTileX + 8 + (hSeed % 16);
      const hy = startTileY + 8 + ((hSeed >>> 4) % 16);
      const halberdDef = 'structure_scatter_ruin_ancient_broken_halberd_sword_grave';
      if (!AUTHORED_ROAD_TILES.has(`${hx},${hy}`) && canPlaceFootprint(hx, hy, 2, 2, occupiedGrid, getTileAt, false, halberdDef, objects)) {
        const objId = `halberd_${hx}_${hy}`;
        markFootprintOccupied(hx, hy, 2, 2, occupiedGrid, objId, halberdDef);
        objects.push({
          id: objId,
          defId: halberdDef,
          x: hx,
          y: hy,
          collision: 'solid',
          tags: ['poi_misc', 'ruin', chunkCenterRegion.id]
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // H. THEMATIC MONSTER MARKERS (All 10 variants in wilderness)
  // --------------------------------------------------------------------------
  if (chunkCenterRegion) {
    const mSeed = hash2d(chunkX, chunkY, 1193);
    if ((mSeed % 2) === 0) {
      const markerIdx = (Math.abs(chunkX * 7 + chunkY * 13) + (mSeed >>> 4)) % ALL_MONSTER_MARKERS.length;
      const markerDef = ALL_MONSTER_MARKERS[markerIdx];
      const mx = startTileX + 6 + (mSeed % 20);
      const my = startTileY + 6 + ((mSeed >>> 6) % 20);

      const tile = getTileAt(mx, my);
      if (tile && !tile.isSolid && !AUTHORED_ROAD_TILES.has(`${mx},${my}`)) {
        if (canPlaceFootprint(mx, my, 1, 1, occupiedGrid, getTileAt, false, markerDef, objects)) {
          const objId = `mmarker_${mx}_${my}`;
          markFootprintOccupied(mx, my, 1, 1, occupiedGrid, objId, markerDef);
          objects.push({
            id: objId,
            defId: markerDef,
            x: mx,
            y: my,
            collision: 'none',
            tags: ['monster_marker', 'thematic_spawn', chunkCenterRegion.id]
          });
        }
      }
    }
  }
}

module.exports = {
  placeContextualAssets,
  VILLAGE_YARD_VARIANTS,
  WAYSIDE_VARIANTS,
  RUSTIC_COUNTRY_VARIANTS,
  PROF_STRUCTURE_VARIANTS,
  TOWN_FACILITY_VARIANTS,
  ALL_MONSTER_MARKERS
};
