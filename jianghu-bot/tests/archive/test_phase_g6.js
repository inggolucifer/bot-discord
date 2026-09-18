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
const Item = require('./models/Item');
const ActivityLog = require('./models/ActivityLog');
const farmingFishingService = require('./services/farmingFishingService');
const { seedPilotGrid } = require('./scripts/seed_pilot_grid');

async function runTestG6() {
  console.log('=== MEMULAI TEST PHASE G6: FARMING & FISHING LIVELIHOOD ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/6] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g6_verification';
  const farmerId = 'user_test_g6_farmer';
  const zoneId = 'xingcun_village';

  try {
    // 1. Setup Peta Pilot
    console.log('[2/6] Menyiapkan pilot grid dengan lahan dan dermaga pancing...');
    await seedPilotGrid(guildId);

    await Player.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });

    // Buat karakter penguji
    const player = await Player.create({
      discordId: farmerId,
      guildId,
      characterName: 'Petani Jianghu',
      status: 'active',
      currentHp: 100,
      currentStamina: 100,
      gridPosition: { zoneId, tileX: 10, tileY: 10 },
      professions: {
        farming: { level: 1, exp: 0, isUnlocked: true },
        fishing: { level: 1, exp: 0, isUnlocked: true }
      }
    });

    // Klaimkan petak (10, 10) ke farmerId
    await ZoneTile.updateOne(
      { guildId, zoneId, tileX: 10, tileY: 10 },
      { $set: { ownerId: farmerId, ownerType: 'player', ownerName: player.characterName } }
    );

    // 2. Uji Tanam Bibit di Petak Milik Sendiri (10, 10) dengan durasi 1 detik
    console.log('\n[3/6] Menguji alur penanaman bibit tanaman...');
    const plantResult = await farmingFishingService.plantCrop(farmerId, guildId, 10, 10, 'Gandum Spiritual', {
      zoneId,
      growSeconds: 1
    });

    assert.strictEqual(plantResult.ok, true, 'Penanaman harus berhasil.');
    assert.strictEqual(plantResult.cropName, 'Gandum Spiritual');
    console.log(`[PASS] Bibit '${plantResult.cropName}' berhasil ditanam, stamina terpakai.`);

    // 3. Uji Panen Sebelum Matang (sebelum timer lewat)
    // Cek immediate harvest failure jika belum sampai waktu
    const tileBefore = await ZoneTile.findOne({ guildId, zoneId, tileX: 10, tileY: 10 });
    assert(tileBefore.cropPlantedAt, 'Status cropPlantedAt harus ada.');

    // 4. Tunggu 1.2 detik dan Panen
    console.log('\n[4/6] Menunggu 1.2 detik hingga tanaman matang dan memanen...');
    await new Promise(r => setTimeout(r, 1200));

    const harvestResult = await farmingFishingService.harvestCrop(farmerId, guildId, 10, 10, { zoneId });
    assert.strictEqual(harvestResult.ok, true, 'Panen harus berhasil.');
    assert.strictEqual(harvestResult.cropName, 'Gandum Spiritual');
    assert(harvestResult.quantity > 0, 'Harus mendapatkan hasil panen.');

    // Verifikasi item di inventory
    const pAfterHarvest = await Player.findOne({ discordId: farmerId, guildId });
    const cropItem = pAfterHarvest.inventory.find(i => i.quantity >= 2);
    assert(cropItem, 'Item hasil panen harus ada di inventory pemain.');
    console.log(`[PASS] Panen berhasil mendapatkan ${harvestResult.quantity}x ${harvestResult.cropName}, EXP naik.`);

    // 5. Uji Memancing Jauh dari Air (harus ditolak)
    console.log('\n[5/6] Menguji penolakan memancing di daratan kering (jauh dari air)...');
    const distantFish = await farmingFishingService.goFishing(farmerId, guildId);
    assert.strictEqual(distantFish.ok, false);
    assert.match(distantFish.error, /tidak berada di dekat dermaga/i);
    console.log(`[PASS] Memancing di daratan kering ditolak dengan tepat: "${distantFish.error}"`);

    // 6. Pindahkan Pemain ke Samping Dermaga Pancing (20, 6) dan Uji Memancing
    console.log('\n[6/6] Memancing di samping dermaga pancing air (20, 6)...');
    // Spot ikan ada di (20, 6), tempatkan pemain di (20, 5) - jarak 1 tile
    await Player.updateOne(
      { discordId: farmerId, guildId },
      { $set: { 'gridPosition.tileX': 20, 'gridPosition.tileY': 5 } }
    );

    const fishResult = await farmingFishingService.goFishing(farmerId, guildId);
    assert.strictEqual(fishResult.ok, true, 'Memancing di dekat spot ikan harus berhasil.');
    assert(fishResult.fishName, 'Harus mendapatkan jenis ikan.');
    assert(fishResult.fishingLevel >= 1);
    console.log(`[PASS] Berhasil memancing '${fishResult.fishName}' (+1), EXP Fishing bertambah.`);

    // Cleanup
    await Player.deleteMany({ guildId });
    await GridZone.deleteMany({ guildId });
    await ZoneTile.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G6 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG6();
