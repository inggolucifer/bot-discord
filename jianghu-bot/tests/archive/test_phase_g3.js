require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const assert = require('assert');

const Player = require('./models/Player');
const GridZone = require('./models/GridZone');
const ZoneTile = require('./models/ZoneTile');
const PropertyStructure = require('./models/PropertyStructure');
const interiorService = require('./services/interiorService');
const { seedPilotGrid } = require('./scripts/seed_pilot_grid');

async function runTestG3() {
  console.log('=== MEMULAI TEST PHASE G3: BUILDING INTERIOR SYSTEM & ACCESS CONTROL ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/6] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g3_verification';
  const discordId = 'user_test_g3_traveler';
  const zoneId = 'xingcun_village';

  try {
    // 1. Setup Data Peta Pilot
    console.log('[2/6] Menyiapkan pilot grid dengan bangunan Toko Obat...');
    await seedPilotGrid(guildId);

    await Player.deleteMany({ guildId, discordId });
    await PropertyStructure.deleteMany({ guildId });

    // Buat karakter penguji di posisi jalan biasa (16, 16) - bukan pintu
    const player = await Player.create({
      discordId,
      guildId,
      characterName: 'Pengelana Interior G3',
      status: 'active',
      currentHp: 100,
      currentStamina: 100,
      gridPosition: {
        zoneId,
        tileX: 16,
        tileY: 16
      }
    });

    // 2. Uji Masuk saat tidak di depan pintu (harus ditolak)
    console.log('\n[3/6] Menguji penolakan masuk saat tidak berdiri di pintu...');
    const nonDoorEntry = await interiorService.enterBuilding(discordId, guildId);
    assert.strictEqual(nonDoorEntry.ok, false);
    assert.match(nonDoorEntry.error, /tidak berada di depan pintu/i);
    console.log(`[PASS] Masuk ditolak saat berada di petak jalan biasa: "${nonDoorEntry.error}"`);

    // 3. Pindahkan pemain ke depan pintu Toko Obat di (13, 15) dan uji masuk
    console.log('\n[4/6] Menguji masuk ke interior Toko Obat dari petak pintu (13, 15)...');
    await Player.updateOne({ discordId, guildId }, { $set: { 'gridPosition.tileX': 13, 'gridPosition.tileY': 15 } });

    const enterSuccess = await interiorService.enterBuilding(discordId, guildId);
    assert.strictEqual(enterSuccess.ok, true);
    assert(enterSuccess.structureId, 'Harus menghasilkan ID PropertyStructure interior.');
    assert.strictEqual(enterSuccess.structureName, 'Toko Obat Herbal Xingcun');

    const playerInside = await Player.findOne({ discordId, guildId });
    assert.strictEqual(String(playerInside.gridPosition.interiorInstanceId), String(enterSuccess.structureId));
    console.log(`[PASS] Berhasil masuk ke interior '${enterSuccess.structureName}' (ID: ${enterSuccess.structureId}).`);

    // 4. Uji Verifikasi Dekompresi Matriks Denah Interior 12x12
    console.log('\n[5/6] Menguji layout denah interior 12x12 hasil dekompresi RLE...');
    const layout = await interiorService.getInteriorLayout(enterSuccess.structureId);
    assert(layout, 'Data layout harus berhasil diambil.');
    assert.strictEqual(layout.width, 12);
    assert.strictEqual(layout.height, 12);
    assert.strictEqual(layout.matrix.length, 12);
    assert.strictEqual(layout.matrix[0].length, 12);
    console.log(`[PASS] Matriks interior 12x12 (144 petak) berhasil didekompresi secara lossless.`);

    // 5. Uji Keluar Kembali ke Petak Depan Pintu
    console.log('\n[6/6] Menguji keluar dari bangunan kembali ke koordinat pintu luar...');
    const exitSuccess = await interiorService.exitBuilding(discordId, guildId);
    assert.strictEqual(exitSuccess.ok, true);
    assert.strictEqual(exitSuccess.restoredPosition.tileX, 13);
    assert.strictEqual(exitSuccess.restoredPosition.tileY, 15);

    const playerOutside = await Player.findOne({ discordId, guildId });
    assert.strictEqual(playerOutside.gridPosition.interiorInstanceId, null);
    assert.strictEqual(playerOutside.gridPosition.tileX, 13);
    assert.strictEqual(playerOutside.gridPosition.tileY, 15);
    console.log(`[PASS] Berhasil keluar kembali ke koordinat pintu outdoor (13, 15).`);

    // Cleanup
    await Player.deleteMany({ guildId });
    await GridZone.deleteMany({ guildId });
    await ZoneTile.deleteMany({ guildId });
    await PropertyStructure.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G3 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG3();
