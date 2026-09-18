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
const ActivityLog = require('./models/ActivityLog');
const forageTrainingService = require('./services/forageTrainingService');
const { seedPilotGrid } = require('./scripts/seed_pilot_grid');
const { generateDefaultEstateLayout } = require('./utils/propertyManager');

async function runTestG8() {
  console.log('=== MEMULAI TEST PHASE G8: FORAGING & KUNGFU TRAINING (DIMINISHING RETURNS) ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/6] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g8_master_verification';
  const discipleId = 'user_test_g8_martial_disciple';
  const zoneId = 'xingcun_village';

  try {
    // 1. Setup Peta Pilot
    console.log('[2/6] Menyiapkan pilot grid dengan pohon bambu dan sasana dojo...');
    await seedPilotGrid(guildId);

    await Player.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });
    await PropertyStructure.deleteMany({ guildId });

    // Buat Sasana Dojo Interior
    const dojoStructure = await PropertyStructure.create({
      guildId,
      zoneId,
      tileX: 18,
      tileY: 18,
      ownerId: 'npc_shifu',
      ownerName: 'Guru Besar Dojo',
      structureName: 'Dojo Perguruan Harimau Putih',
      structureType: 'dojo',
      interiorLayoutCompressed: generateDefaultEstateLayout(12, 12),
      isOpenToPublic: true
    });

    // Buat Karakter Penguji di posisi (8, 7) - jarak 1 tile dari Rumpun Bambu (8, 8)
    const player = await Player.create({
      discordId: discipleId,
      guildId,
      characterName: 'Murid Padepokan G8',
      status: 'active',
      currentHp: 100,
      currentStamina: 200, // Banyak stamina untuk uji diminishing returns
      gridPosition: { zoneId, tileX: 8, tileY: 7 },
      kungfuSkills: { fist: 0, sword: 0 }
    });

    // 2. Uji Meramu / Mengambil Bambu dari Node (8, 8)
    console.log('\n[3/6] Menguji pengumpulan kayu bambu pada node (8, 8)...');
    const gatherResult = await forageTrainingService.gatherResource(discipleId, guildId, {
      overrideCooldownSeconds: 5
    });

    assert.strictEqual(gatherResult.ok, true, 'Pengumpulan herba/kayu harus berhasil.');
    assert.strictEqual(gatherResult.resourceType, 'wood');
    assert(gatherResult.quantity >= 2, 'Harus mendapatkan minimal 2 kayu.');
    console.log(`[PASS] Berhasil menebang '${gatherResult.itemName}' (+${gatherResult.quantity}), stamina berkurang.`);

    // 3. Uji Penolakan Saat Node Masih Cooldown
    console.log('\n[4/6] Menguji penolakan saat node masih dalam masa cooldown...');
    const cooldownGather = await forageTrainingService.gatherResource(discipleId, guildId);
    assert.strictEqual(cooldownGather.ok, false);
    assert.match(cooldownGather.error, /baru saja dipanen/i);
    console.log(`[PASS] Cooldown aktif menolak farming berulang: "${cooldownGather.error}"`);

    // 4. Uji Penolakan Latihan di Luar Dojo
    console.log('\n[5/6] Menguji penolakan latihan kungfu saat tidak berada di sasana dojo...');
    const outdoorTrain = await forageTrainingService.trainKungfu(discipleId, guildId, 'fist');
    assert.strictEqual(outdoorTrain.ok, false);
    assert.match(outdoorTrain.error, /harus berada di dalam dojo/i);
    console.log(`[PASS] Latihan di luar sasana ditolak: "${outdoorTrain.error}"`);

    // 5. Masuk ke Dojo dan Uji Kurva Diminishing Returns
    console.log('\n[6/6] Memasuki Dojo dan menguji kurva Diminishing Returns (Sesi 1 s.d. Sesi 12)...');
    await Player.updateOne(
      { discordId: discipleId, guildId },
      { $set: { 'gridPosition.interiorInstanceId': dojoStructure._id } }
    );

    // Sesi 1 (100% efisiensi = 10 EXP)
    const session1 = await forageTrainingService.trainKungfu(discipleId, guildId, 'fist');
    assert.strictEqual(session1.ok, true);
    assert.strictEqual(session1.expGained, 10, 'Sesi 1 harus mendapat 10 EXP (100%).');
    assert.match(session1.returnTier, /100%/);

    // Simulasikan 5 sesi berikutnya dengan membuat entri log
    for (let i = 2; i <= 6; i++) {
      await ActivityLog.create({
        guildId,
        discordId: discipleId,
        actionType: 'training_session',
        details: { skill: 'fist', sessionNumber: i }
      });
    }

    // Sekarang sesi ke-7 (Tingkat kelelahan sedang 50% = 5 EXP)
    const session7 = await forageTrainingService.trainKungfu(discipleId, guildId, 'fist');
    assert.strictEqual(session7.ok, true);
    assert.strictEqual(session7.expGained, 5, 'Sesi 7 harus turun menjadi 5 EXP (50%).');
    assert.match(session7.returnTier, /50%/);

    // Simulasikan hingga sesi ke-11
    for (let i = 8; i <= 11; i++) {
      await ActivityLog.create({
        guildId,
        discordId: discipleId,
        actionType: 'training_session',
        details: { skill: 'fist', sessionNumber: i }
      });
    }

    // Sekarang sesi ke-12 (Tingkat kelelahan ekstrem 10% = 1 EXP)
    const session12 = await forageTrainingService.trainKungfu(discipleId, guildId, 'fist');
    assert.strictEqual(session12.ok, true);
    assert.strictEqual(session12.expGained, 1, 'Sesi 12 harus turun menjadi 1 EXP (10%).');
    assert.match(session12.returnTier, /10%/);

    console.log(`[PASS] Kurva Diminishing Returns terbukti presisi:`);
    console.log(`       - Sesi 1 (Awal)   : +${session1.expGained} EXP (${session1.returnTier})`);
    console.log(`       - Sesi 7 (Lelah)  : +${session7.expGained} EXP (${session7.returnTier})`);
    console.log(`       - Sesi 12 (Cap)   : +${session12.expGained} EXP (${session12.returnTier})`);

    // Cleanup
    await Player.deleteMany({ guildId });
    await GridZone.deleteMany({ guildId });
    await ZoneTile.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });
    await PropertyStructure.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G8 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG8();
