/**
 * starterKits.js
 * Konfigurasi 8 Titik Kelahiran Karakter Baru (Origin Spawn Biome/Faction) & Starter Kits Otoritatif
 * Single Source of Truth didelegasikan ke world-data/spawns.json via worldData.js.
 * Sesuai Master Plan docs/WORLD_MAP_MASTER_PLAN.md & SSOT Invariants.
 */

const worldData = require('../utils/worldData');

const SPAWNS_LIST = worldData.getOriginSpawns();
const ORIGIN_SPAWNS = {};

for (const spawn of SPAWNS_LIST) {
  ORIGIN_SPAWNS[spawn.id] = spawn;
}

// Retroactive aliases untuk kompatibilitas riwayat karakter lama
ORIGIN_SPAWNS.northern_ice = ORIGIN_SPAWNS.hermit_highlands || ORIGIN_SPAWNS.central_plains;
ORIGIN_SPAWNS.southern_demon_border = ORIGIN_SPAWNS.southern_heiyan || ORIGIN_SPAWNS.border_march || ORIGIN_SPAWNS.central_plains;
ORIGIN_SPAWNS.mist_insect_valley = ORIGIN_SPAWNS.nine_springs_delta || ORIGIN_SPAWNS.central_plains;

function getOriginSpawn(originId) {
  return ORIGIN_SPAWNS[originId] || ORIGIN_SPAWNS.central_plains;
}

module.exports = {
  ORIGIN_SPAWNS,
  getOriginSpawn
};
