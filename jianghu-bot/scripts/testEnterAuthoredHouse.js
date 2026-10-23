/**
 * scripts/testEnterAuthoredHouse.js
 * Contract test for Prompt 2.8 / 2.9:
 * 1. Masuk-keluar satu rumah Xingcun 20 kali tanpa error.
 * 2. Ketukan ganda (concurrent enter) = tepat 1 dokumen PropertyStructure di database.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const PropertyStructure = require('../models/PropertyStructure');
const interiorService = require('../services/interiorService');

async function runTest() {
  console.log('=== UJI MASUK-KELUAR RUMAH XINGCUN (PROMPT 2.8 & 2.9) ===\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const testId = 'tester_xingcun_' + Date.now();
  const guildId = 'test_guild';

  // Target: auth_desa_xingcun_h01 di (2047, 2648)
  const targetX = 2047;
  const targetY = 2648;

  // Hapus dokumen lama jika ada untuk koordinat ini
  await PropertyStructure.deleteMany({ guildId, tileX: targetX, tileY: targetY });

  // Buat karakter pemain di petak depan rumah (2047, 2649)
  const player = await Player.create({
    discordId: testId,
    guildId,
    characterName: 'Pengelana Xingcun',
    gender: 'Pria',
    currentHp: 100,
    maxHp: 100,
    currentStamina: 100,
    maxStamina: 100,
    gridPosition: {
      zoneId: 'tianyuan_world_map',
      tileX: 2047,
      tileY: 2649
    }
  });

  console.log(`Pemain dibuat di (${player.gridPosition.tileX}, ${player.gridPosition.tileY})`);

  // Test 1: Masuk-keluar 20 kali tanpa error
  console.log('\nMemulai pengujian 20x masuk-keluar...');
  for (let cycle = 1; cycle <= 20; cycle++) {
    const enterRes = await interiorService.enterBuilding(testId, guildId, {
      targetX,
      targetY,
      zoneId: 'tianyuan_world_map'
    });

    if (!enterRes.ok) {
      console.error(`[GAGAL] Masuk siklus ke-${cycle} gagal:`, enterRes.error);
      process.exit(1);
    }

    if (cycle === 1) {
      console.log(`- Siklus 1 berhasil. Dimensi: ${enterRes.width}x${enterRes.height}, doorSpawn:`, enterRes.doorSpawn);
      if (enterRes.width !== 6 || enterRes.height !== 5) {
        console.error('[GAGAL] Dimensi bukan 6x5!');
        process.exit(1);
      }
      if (enterRes.doorSpawn.x !== 2 || enterRes.doorSpawn.y !== 3) {
        console.error('[GAGAL] doorSpawn bukan (2, 3)!');
        process.exit(1);
      }
    }

    const exitRes = await interiorService.exitBuilding(testId, guildId);
    if (!exitRes.ok) {
      console.error(`[GAGAL] Keluar siklus ke-${cycle} gagal:`, exitRes.error);
      process.exit(1);
    }
  }
  console.log('[PASS] 20x masuk-keluar sukses tanpa satu pun error.');

  // Test 2: Ketukan ganda (concurrent enter calls) = 1 dokumen struktur
  console.log('\nMemulai pengujian ketukan ganda (double-tap concurrent)...');
  // Pastikan pemain di luar
  await interiorService.exitBuilding(testId, guildId);

  // Jalankan dua request enter secara serempak
  const [res1, res2] = await Promise.all([
    interiorService.enterBuilding(testId, guildId, { targetX, targetY, zoneId: 'tianyuan_world_map' }),
    interiorService.enterBuilding(testId, guildId, { targetX, targetY, zoneId: 'tianyuan_world_map' })
  ]);

  console.log(`- Request 1 ok: ${res1.ok}, Request 2 ok: ${res2.ok}`);

  const structureCount = await PropertyStructure.countDocuments({
    guildId,
    zoneId: 'tianyuan_world_map',
    tileX: targetX,
    tileY: targetY
  });

  console.log(`- Jumlah dokumen PropertyStructure pada (${targetX}, ${targetY}): ${structureCount}`);

  if (structureCount !== 1) {
    console.error(`[GAGAL] Ditemukan ${structureCount} dokumen (harus tepat 1)!`);
    process.exit(1);
  }
  console.log('[PASS] Ketukan ganda menghasilkan tepat 1 dokumen struktur.');

  // Cleanup test data
  await PropertyStructure.deleteMany({ guildId, tileX: targetX, tileY: targetY });
  await Player.deleteOne({ _id: player._id });

  console.log('\n[PASS] SELURUH UJI MASUK-KELUAR RUMAH XINGCUN LULUS (100%).\n');
  process.exit(0);
}

runTest().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
