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
const movementService = require('./services/movementService');
const staminaRegenService = require('./services/staminaRegenService');
const { seedPilotGrid } = require('./scripts/seed_pilot_grid');

async function runTestG2() {
  console.log('=== MEMULAI TEST PHASE G2: MOVEMENT ENGINE & STAMINA GATING ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/6] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g2_verification';
  const discordId = 'user_test_g2_mover';
  const zoneId = 'xingcun_village';

  try {
    // 1. Setup Data Peta Pilot
    console.log('[2/6] Menyiapkan pilot grid untuk pengujian movement...');
    await seedPilotGrid(guildId);

    // Bersihkan karakter lama jika ada
    await Player.deleteMany({ guildId, discordId });

    // Buat karakter penguji di posisi awal (16, 16) - persimpangan jalan
    const player = await Player.create({
      discordId,
      guildId,
      characterName: 'Pendekar Penguji G2',
      status: 'active',
      currentHp: 100,
      currentStamina: 100,
      talents: { sta: 10 },
      gridPosition: {
        zoneId,
        tileX: 16,
        tileY: 16,
        facing: 0
      }
    });

    console.log('[PASS] Karakter penguji berhasil dibuat di koordinat (16, 16) dengan Stamina 100.');

    // 2. Uji Pergerakan Valid ke Utara (16, 15)
    console.log('\n[3/6] Menguji pergerakan valid ke arah Utara...');
    const moveNorth = await movementService.movePlayer(discordId, guildId, 'utara');
    assert.strictEqual(moveNorth.ok, true, 'Gerakan ke utara harus berhasil.');
    assert.strictEqual(moveNorth.newPosition.tileX, 16);
    assert.strictEqual(moveNorth.newPosition.tileY, 15);
    assert(moveNorth.currentStamina < 100, 'Stamina harus berkurang setelah melangkah.');
    console.log(`[PASS] Berhasil melangkah ke (16, 15), Stamina berkurang menjadi ${moveNorth.currentStamina} (-${moveNorth.staminaCost}).`);

    // 3. Uji Collision: Mencoba menabrak dinding bangunan Toko Obat di (13, 14)
    console.log('\n[4/6] Menguji penolakan collision pada rintangan solid...');
    // Teleport sementara ke samping dinding (14, 14) lalu melangkah ke barat (13, 14)
    await Player.updateOne({ discordId, guildId }, { $set: { 'gridPosition.tileX': 14, 'gridPosition.tileY': 14 } });
    
    const bumpWall = await movementService.movePlayer(discordId, guildId, 'barat');
    assert.strictEqual(bumpWall.ok, false, 'Gerakan menabrak dinding harus ditolak.');
    assert.match(bumpWall.error, /terhalang/i);
    console.log(`[PASS] Collision dinding solid berhasil menolak langkah: "${bumpWall.error}"`);

    // 4. Uji Stamina Gate: Habiskan stamina dan uji penolakan gerak
    console.log('\n[5/6] Menguji Stamina Gating saat tenaga habis...');
    await Player.updateOne({ discordId, guildId }, { $set: { currentStamina: 0 } });

    const exhaustMove = await movementService.movePlayer(discordId, guildId, 'utara');
    assert.strictEqual(exhaustMove.ok, false, 'Gerakan saat stamina 0 harus ditolak.');
    assert.match(exhaustMove.error, /stamina tidak mencukupi/i);
    console.log(`[PASS] Stamina gate aktif menolak langkah saat tenaga 0: "${exhaustMove.error}"`);

    // 5. Uji Stamina Regen Service
    console.log('\n[6/6] Menguji StaminaRegenService (pemukiman vs rumah vs overweight)...');
    const pDoc = await Player.findOne({ discordId, guildId });
    
    // Test A: Regen di pemukiman (+2)
    const regenSettlement = staminaRegenService.applyRegenTick(pDoc, { inSettlement: true });
    assert.strictEqual(regenSettlement.gained, 2, 'Regen di pemukiman harus menambah 2 stamina.');

    // Test B: Regen di rumah pribadi (+5)
    const regenHome = staminaRegenService.applyRegenTick(pDoc, { insideOwnResidence: true });
    assert.strictEqual(regenHome.gained, 5, 'Regen di rumah pribadi harus menambah 5 stamina.');

    // Test C: Overweight (Regen beku = 0)
    pDoc.inventory = [{ itemId: new mongoose.Types.ObjectId(), quantity: 150 }]; // Berat 150 > kapasitas 50
    pDoc.baseCarryCapacity = 50;
    const regenOverweight = staminaRegenService.applyRegenTick(pDoc, { inSettlement: true });
    assert.strictEqual(regenOverweight.gained, 0, 'Regen harus beku saat overweight.');
    assert.strictEqual(regenOverweight.reason, 'encumbered');
    console.log('[PASS] Seluruh kalkulasi regenerasi dan pembekuan stamina overweight terverifikasi.');

    // Cleanup test data
    await Player.deleteMany({ guildId });
    await GridZone.deleteMany({ guildId });
    await ZoneTile.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G2 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG2();
