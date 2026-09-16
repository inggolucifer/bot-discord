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
const Blueprint = require('./models/Blueprint');
const PropertyStructure = require('./models/PropertyStructure');
const Item = require('./models/Item');
const ActivityLog = require('./models/ActivityLog');
const constructionService = require('./services/constructionService');
const interiorService = require('./services/interiorService');
const { seedPilotGrid } = require('./scripts/seed_pilot_grid');

async function runTestG5() {
  console.log('=== MEMULAI TEST PHASE G5: ASSET CONSTRUCTION & BLUEPRINT SYSTEM ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/7] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g5_verification';
  const builderId = 'user_test_g5_architect';
  const zoneId = 'xingcun_village';

  try {
    // 1. Setup Peta Pilot
    console.log('[2/7] Menyiapkan pilot grid dan katalog blueprint...');
    await seedPilotGrid(guildId);

    await Player.deleteMany({ guildId });
    await Blueprint.deleteMany({});
    await ActivityLog.deleteMany({ guildId });
    await PropertyStructure.deleteMany({ guildId });

    // 2. Buat Test Item Bahan Bangunan
    let woodItem = await Item.findOne({ guildId, name: 'Kayu Glondongan' });
    if (!woodItem) {
      woodItem = await Item.create({
        guildId,
        name: 'Kayu Glondongan',
        type: 'material',
        rarity: 'common',
        description: 'Bahan baku kayu pohon untuk pondasi bangunan.'
      });
    }

    // 3. Buat Blueprint Rumah Panggung
    const bp = await Blueprint.create({
      blueprintId: 'rumah_panggung_uji',
      name: 'Rumah Panggung Kayu Jati',
      category: 'residence',
      description: 'Kediaman kayu bertingkat yang nyaman untuk meditasi kultivator.',
      requiredSilver: 50,
      requiredMaterials: [{ itemId: woodItem._id, itemName: 'Kayu Glondongan', quantity: 5 }],
      buildDurationSeconds: 1 // 1 detik untuk kebutuhan automated test
    });

    console.log(`[PASS] Blueprint '${bp.name}' berhasil dibuat di database.`);

    // 4. Buat Pemain Pemilik Tanah (10, 10) dengan 100 Perak dan 10x Kayu
    const player = await Player.create({
      discordId: builderId,
      guildId,
      characterName: 'Arsitek Agung',
      status: 'active',
      currency: { copper: 0, silver: 100, gold: 0 },
      inventory: [{ itemId: woodItem._id, quantity: 10 }],
      gridPosition: { zoneId, tileX: 10, tileY: 10 }
    });

    // Klaimkan petak (10, 10) ke builderId
    await ZoneTile.updateOne(
      { guildId, zoneId, tileX: 10, tileY: 10 },
      { $set: { ownerId: builderId, ownerType: 'player', ownerName: player.characterName } }
    );

    // 5. Uji Penolakan Membangun di Tanah yang Bukan Milik Sendiri (11, 10)
    console.log('\n[3/7] Menguji penolakan membangun di tanah tanpa izin kepemilikan...');
    const unownedBuild = await constructionService.startConstruction(builderId, guildId, 11, 10, bp.blueprintId, { zoneId });
    assert.strictEqual(unownedBuild.ok, false);
    assert.match(unownedBuild.error, /hanya dapat mendirikan bangunan di atas petak tanah milikmu sendiri/i);
    console.log(`[PASS] Penolakan kepemilikan tanah berhasil: "${unownedBuild.error}"`);

    // 6. Uji Mulai Konstruksi di Petak (10, 10)
    console.log('\n[4/7] Memulai konstruksi bangunan di petak milik sendiri (10, 10)...');
    const startBuild = await constructionService.startConstruction(builderId, guildId, 10, 10, bp.blueprintId, { 
      zoneId, 
      overrideDurationSeconds: 1 
    });

    assert.strictEqual(startBuild.ok, true, 'Konstruksi harus berhasil dimulai.');
    assert.strictEqual(startBuild.remainingSilver, 50, 'Perak harus berkurang dari 100 menjadi 50.');

    // Verifikasi pemotongan material di inventory
    const updatedPlayer = await Player.findOne({ discordId: builderId, guildId });
    const remainingWood = updatedPlayer.inventory.find(i => i.itemId.toString() === woodItem._id.toString());
    assert.strictEqual(remainingWood.quantity, 5, 'Kayu harus berkurang dari 10 menjadi 5.');

    // Verifikasi status petak tanah
    const buildingTile = await ZoneTile.findOne({ guildId, zoneId, tileX: 10, tileY: 10 });
    assert.strictEqual(buildingTile.isUnderConstruction, true);
    assert.strictEqual(buildingTile.buildingName, bp.name);
    console.log(`[PASS] Konstruksi berhasil dimulai, material dan koin terpotong, status tile: isUnderConstruction = true.`);

    // 7. Tunggu Timer 1 Detik dan Lakukan Finalisasi
    console.log('\n[5/7] Menunggu 1.2 detik untuk timer konstruksi selesai...');
    await new Promise(r => setTimeout(r, 1200));

    console.log('\n[6/7] Memfinalisasi bangunan via checkAndFinalizeConstruction...');
    const finishBuild = await constructionService.checkAndFinalizeConstruction(guildId, zoneId, 10, 10);
    assert.strictEqual(finishBuild.ok, true);
    assert.strictEqual(finishBuild.isBuildingDone, true);
    assert(finishBuild.structureId, 'Harus menghasilkan instance PropertyStructure.');

    const finalizedTile = await ZoneTile.findOne({ guildId, zoneId, tileX: 10, tileY: 10 });
    assert.strictEqual(finalizedTile.isUnderConstruction, false);
    assert.strictEqual(finalizedTile.isDoor, true);
    console.log(`[PASS] Bangunan selesai! Tile bertanda pintu (isDoor = true) dan interior terhubung.`);

    // 8. Uji Masuk ke Bangunan Baru
    console.log('\n[7/7] Menguji masuk ke interior bangunan baru yang selesai dibangun...');
    const enterNewBuilding = await interiorService.enterBuilding(builderId, guildId);
    assert.strictEqual(enterNewBuilding.ok, true);
    assert.strictEqual(enterNewBuilding.structureName, bp.name);
    console.log(`[PASS] Berhasil masuk ke dalam interior '${enterNewBuilding.structureName}'.`);

    // Cleanup
    await Player.deleteMany({ guildId });
    await GridZone.deleteMany({ guildId });
    await ZoneTile.deleteMany({ guildId });
    await Blueprint.deleteMany({});
    await ActivityLog.deleteMany({ guildId });
    await PropertyStructure.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G5 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG5();
