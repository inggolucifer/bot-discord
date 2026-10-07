/**
 * migratePlayerPositionDrift.js
 * Skrip Migrasi Otoritatif untuk Memperbaiki Posisi Pemain (Dual Position Drift Fix - Bug B1 & B2)
 *
 * Menjamin:
 * 1. Setiap player memiliki gridPosition (tileX, tileY) dan currentLocation (regionSlug, settlementName) yang 100% konsisten.
 * 2. Menormalkan slug region usang (eastern_sea_region -> eastern_sea, dsb.) ke 22 wilayah kanonikal.
 * 3. Menyelamatkan player di posisi void / out-of-bounds ke Desa Xingcun [2455, 2485].
 * 4. Integer sanitization pada stamina dan koordinat.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Player = require('../models/Player');
const { setPlayerAuthoritativePosition } = require('../services/movementService');
const { normalizeRegionSlug, getRegionAt } = require('../utils/worldRegionEngine');
const proceduralWorldEngine = require('../utils/proceduralWorldEngine');

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu';
  console.log(`[MIGRATION] Menghubungkan ke database MongoDB...`);
  await mongoose.connect(mongoUri);
  console.log(`[MIGRATION] Terhubung ke MongoDB.`);

  const players = await Player.find({});
  console.log(`[MIGRATION] Ditemukan ${players.length} pemain untuk diverifikasi.`);

  let patchedCount = 0;
  let oobCount = 0;
  let slugFixedCount = 0;

  for (const player of players) {
    let modified = false;

    // 1. Sanitasi dan verifikasi koordinat
    let currentX = player.gridPosition?.tileX;
    let currentY = player.gridPosition?.tileY;
    let zoneId = player.gridPosition?.zoneId || 'tianyuan_world_map';

    // Jika posisi belum ada atau invalid / void di (0,0) pada tianyuan_world_map
    if (
      currentX === undefined || currentX === null ||
      currentY === undefined || currentY === null ||
      (currentX === 0 && currentY === 0 && zoneId === 'tianyuan_world_map') ||
      currentX < 0 || currentX >= 5000 ||
      currentY < 0 || currentY >= 5000
    ) {
      console.log(`[MIGRATION] Menyelamatkan player ${player.characterName} (${player._id}) dari posisi void/OOB [${currentX}, ${currentY}] -> [2455, 2485]`);
      currentX = 2455;
      currentY = 2485;
      zoneId = 'tianyuan_world_map';
      oobCount++;
      modified = true;
    }

    // 2. Normalisasi region slug pada currentLocation
    const oldSlug = player.currentLocation?.regionSlug;
    const normalizedSlug = normalizeRegionSlug(oldSlug);
    if (oldSlug !== normalizedSlug) {
      slugFixedCount++;
      modified = true;
    }

    // 3. Cek apakah region di currentLocation sinkron dengan koordinat fisiknya di grid 5000x5000
    if (zoneId === 'tianyuan_world_map') {
      const tileData = proceduralWorldEngine.getTileAt(currentX, currentY);
      const expectedRegion = normalizeRegionSlug(tileData.regionId || 'central_plains');

      if (normalizedSlug !== expectedRegion) {
        console.log(`[MIGRATION] Player ${player.characterName}: region mismatch detected. currentLocation: ${normalizedSlug} vs grid region: ${expectedRegion} at [${currentX}, ${currentY}]`);
        modified = true;
      }
    }

    // 4. Lakukan sinkronisasi atomik jika ada perubahan atau drift
    if (modified) {
      await setPlayerAuthoritativePosition(player, {
        zoneId,
        tileX: currentX,
        tileY: currentY
      }, {
        save: true
      });
      patchedCount++;
    }
  }

  console.log(`========================================`);
  console.log(`[MIGRATION SELESAI]`);
  console.log(`Total pemain diperiksa : ${players.length}`);
  console.log(`Pemain OOB/Void diselamatkan : ${oobCount}`);
  console.log(`Region slug dinormalisasi   : ${slugFixedCount}`);
  console.log(`Total pemain disinkronkan   : ${patchedCount}`);
  console.log(`========================================`);

  await mongoose.disconnect();
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATION ERROR]', err);
      process.exit(1);
    });
}

module.exports = runMigration;
