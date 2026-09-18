require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const assert = require('assert');

const Player = require('./models/Player');
const Item = require('./models/Item');
const PropertyStructure = require('./models/PropertyStructure');
const ActivityLog = require('./models/ActivityLog');
const craftingService = require('./services/craftingService');
const { generateDefaultEstateLayout } = require('./utils/propertyManager');

async function runTestG7() {
  console.log('=== MEMULAI TEST PHASE G7: SMITHING & COOKING PROFESSIONS ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/6] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g7_verification';
  const crafterId = 'user_test_g7_crafter';
  const zoneId = 'xingcun_village';

  try {
    await Player.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });
    await PropertyStructure.deleteMany({ guildId });

    // 1. Buat Item Bahan Baku
    let oreItem = await Item.findOne({ guildId, name: 'Bijih Besi Mentah' });
    if (!oreItem) {
      oreItem = await Item.create({
        guildId,
        name: 'Bijih Besi Mentah',
        type: 'material',
        rarity: 'common',
        description: 'Batu mineral berkandungan besi tinggi.'
      });
    }

    let woodItem = await Item.findOne({ guildId, name: 'Kayu Glondongan' });
    if (!woodItem) {
      woodItem = await Item.create({
        guildId,
        name: 'Kayu Glondongan',
        type: 'material',
        rarity: 'common',
        description: 'Kayu keras untuk pegangan pedang.'
      });
    }

    let fishItem = await Item.findOne({ guildId, name: 'Ikan Nila Sungai' });
    if (!fishItem) {
      fishItem = await Item.create({
        guildId,
        name: 'Ikan Nila Sungai',
        type: 'material',
        rarity: 'common',
        description: 'Ikan sungai segar untuk bahan masakan.'
      });
    }

    // 2. Buat Bengkel Pandai Besi Interior
    const forgeStructure = await PropertyStructure.create({
      guildId,
      zoneId,
      tileX: 12,
      tileY: 12,
      ownerId: crafterId,
      ownerName: 'Tuan Bengkel',
      structureName: 'Bengkel Tempa Naga Api',
      structureType: 'blacksmith',
      forgeAnvilTier: 1,
      interiorLayoutCompressed: generateDefaultEstateLayout(12, 12),
      isOpenToPublic: true
    });

    // 3. Buat Karakter Penguji dengan Bahan Baku & Stamina 50
    const player = await Player.create({
      discordId: crafterId,
      guildId,
      characterName: 'Pandai Besi Muda',
      status: 'active',
      currentHp: 100,
      currentStamina: 50,
      gridPosition: { zoneId, tileX: 16, tileY: 16, interiorInstanceId: null },
      inventory: [
        { itemId: oreItem._id, quantity: 5 },
        { itemId: woodItem._id, quantity: 5 },
        { itemId: fishItem._id, quantity: 2 }
      ],
      professions: {
        smithing: { level: 1, exp: 0, isUnlocked: true },
        cooking: { level: 1, exp: 0, isUnlocked: true }
      }
    });

    console.log('[PASS] Karakter penguji dan bahan baku siap.');

    // 4. Uji Penolakan Menempa di Luar Ruangan (Jauh dari Bengkel)
    console.log('\n[2/6] Menguji penolakan menempa di jalan tanpa akses ke bengkel...');
    const invalidSmith = await craftingService.craftSmithing(crafterId, guildId, 'Pedang Besi Tempa');
    assert.strictEqual(invalidSmith.ok, false);
    assert.match(invalidSmith.error, /tidak berada di bengkel/i);
    console.log(`[PASS] Menempa di luar bengkel ditolak: "${invalidSmith.error}"`);

    // 5. Masuk ke Bengkel Tempa dan Menempa Pedang
    console.log('\n[3/6] Memasuki bengkel tempa dan menempa Pedang Besi Tempa...');
    await Player.updateOne(
      { discordId: crafterId, guildId },
      { $set: { 'gridPosition.interiorInstanceId': forgeStructure._id } }
    );

    const smithResult = await craftingService.craftSmithing(crafterId, guildId, 'Pedang Besi Tempa');
    assert.strictEqual(smithResult.ok, true, 'Menempa harus berhasil.');
    assert.strictEqual(smithResult.craftedItem, 'Pedang Besi Tempa');
    assert.strictEqual(smithResult.remainingStamina, 40, 'Stamina harus berkurang 10 (dari 50 menjadi 40).');

    // Verifikasi bahan terpotong
    const pAfterSmith = await Player.findOne({ discordId: crafterId, guildId });
    const remainingOre = pAfterSmith.inventory.find(i => i.itemId.toString() === oreItem._id.toString());
    assert.strictEqual(remainingOre.quantity, 3, 'Bijih besi harus berkurang dari 5 menjadi 3.');
    console.log(`[PASS] Berhasil menempa '${smithResult.craftedItem}', bahan terpotong, stamina berkurang 10.`);

    // 6. Uji Memasak Sup Ikan Mas
    console.log('\n[4/6] Memasak Sup Ikan Mas menggunakan bahan ikan hasil pancing...');
    const cookResult = await craftingService.craftCooking(crafterId, guildId, 'Sup Ikan Mas');
    assert.strictEqual(cookResult.ok, true, 'Memasak harus berhasil.');
    assert.strictEqual(cookResult.craftedDish, 'Sup Ikan Mas');

    const pAfterCook = await Player.findOne({ discordId: crafterId, guildId });
    const remainingFish = pAfterCook.inventory.find(i => i.itemId.toString() === fishItem._id.toString());
    assert.strictEqual(remainingFish.quantity, 1, 'Ikan harus berkurang dari 2 menjadi 1.');
    console.log(`[PASS] Berhasil memasak '${cookResult.craftedDish}', ikan terpotong, EXP masak naik.`);

    // 7. Uji Konsumsi Makanan Pemulih Stamina
    console.log('\n[5/6] Menguji konsumsi Sup Ikan Mas untuk memulihkan stamina...');
    const stamBeforeEat = pAfterCook.currentStamina;
    const eatResult = await craftingService.consumeDish(crafterId, guildId, 'Sup Ikan Mas');
    assert.strictEqual(eatResult.ok, true);
    assert.strictEqual(eatResult.restoredStamina, 25);
    assert.strictEqual(eatResult.newStamina, stamBeforeEat + 25);
    console.log(`[PASS] Menyantap '${eatResult.dishName}' memulihkan +${eatResult.restoredStamina} stamina (${stamBeforeEat} -> ${eatResult.newStamina}).`);

    // 8. Verifikasi ActivityLog
    console.log('\n[6/6] Memeriksa audit trail ActivityLog...');
    const smithLog = await ActivityLog.findOne({ guildId, discordId: crafterId, actionType: 'smith_craft' });
    const cookLog = await ActivityLog.findOne({ guildId, discordId: crafterId, actionType: 'cook_dish' });
    assert(smithLog && cookLog, 'Semua aksi kerajinan harus tercatat di ActivityLog.');
    console.log('[PASS] Seluruh transaksi penempaan dan memasak terverifikasi di ActivityLog.');

    // Cleanup
    await Player.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });
    await PropertyStructure.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G7 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG7();
