require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const assert = require('assert');

const Player = require('./models/Player');
const Item = require('./models/Item');
const ExpeditionSession = require('./models/ExpeditionSession');
const ActivityLog = require('./models/ActivityLog');
const expeditionService = require('./services/expeditionService');

async function runTestG9() {
  console.log('=== MEMULAI TEST PHASE G9: EXPEDITION ZONES & REALM GATING ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/6] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g9_verification';
  const mortalId = 'user_test_g9_mortal';
  const cultivatorId = 'user_test_g9_cultivator';

  try {
    await Player.deleteMany({ guildId });
    await ExpeditionSession.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });

    // 1. Buat Player Mortal (Ranah Fana - Index 0)
    await Player.create({
      discordId: mortalId,
      guildId,
      characterName: 'Manusia Biasa',
      status: 'active',
      currentHp: 100,
      currentStamina: 100,
      systemCultivation: { realm: 'Fondasi Fana (Mortal Foundation)', stage: 0 },
      gridPosition: { zoneId: 'xingcun_village', tileX: 16, tileY: 16 }
    });

    // 2. Buat Player Kultivator (Kondensasi Qi - Index 1)
    await Player.create({
      discordId: cultivatorId,
      guildId,
      characterName: 'Kultivator Qi',
      status: 'active',
      currentHp: 150,
      currentStamina: 100,
      systemCultivation: { realm: 'Kondensasi Qi (Qi Condensation)', stage: 3 },
      gridPosition: { zoneId: 'xingcun_village', tileX: 16, tileY: 16 }
    });

    console.log('[PASS] Karakter Mortal dan Kultivator Qi berhasil disiapkan.');

    // 3. Uji Penolakan Realm Gating untuk Mortal
    console.log('\n[2/6] Menguji penolakan ranah kultivasi (Mortal mencoba masuk Reruntuhan Kuno)...');
    const mortalEntry = await expeditionService.startExpedition(mortalId, guildId, 'reruntuhan_kuno');
    assert.strictEqual(mortalEntry.ok, false);
    assert.match(mortalEntry.error, /ranah kultivasimu belum mencukupi/i);
    console.log(`[PASS] Realm gating aktif menolak ranah fana: "${mortalEntry.error}"`);

    // 4. Uji Kultivator Qi Masuk ke Reruntuhan Kuno
    console.log('\n[3/6] Kultivator Qi memasuki Reruntuhan Kuno...');
    const cultEntry = await expeditionService.startExpedition(cultivatorId, guildId, 'reruntuhan_kuno');
    assert.strictEqual(cultEntry.ok, true, 'Kultivator Qi harus berhasil masuk.');
    assert.strictEqual(cultEntry.zoneId, 'expedition_ancient_ruins');
    assert.strictEqual(cultEntry.remainingStamina, 80, 'Stamina harus berkurang 20.');

    const pInDungeon = await Player.findOne({ discordId: cultivatorId, guildId });
    assert.strictEqual(pInDungeon.gridPosition.zoneId, 'expedition_ancient_ruins');
    console.log(`[PASS] Berhasil masuk ke '${cultEntry.dungeonName}', posisi dipindahkan ke ${cultEntry.zoneId}.`);

    // 5. Uji Pencarian Loot di Petak Ekspedisi
    console.log('\n[4/6] Menyisir petak reruntuhan untuk mencari pusaka relik...');
    const lootResult = await expeditionService.searchLoot(cultivatorId, guildId);
    assert.strictEqual(lootResult.ok, true, 'Pencarian loot harus berhasil.');
    assert(lootResult.lootName, 'Harus mendapatkan nama barang relik.');
    assert.strictEqual(lootResult.remainingStamina, 70, 'Stamina harus berkurang 10.');

    const pAfterLoot = await Player.findOne({ discordId: cultivatorId, guildId });
    assert(pAfterLoot.inventory.length > 0, 'Barang relik harus masuk ke inventory pemain.');
    console.log(`[PASS] Berhasil menemukan pusaka '${lootResult.lootName}' (${lootResult.rarity}), masuk ke inventori.`);

    // 6. Uji Evakuasi Keluar dari Ekspedisi
    console.log('\n[5/6] Mengevakuasi diri kembali ke Desa Xingcun...');
    const evacResult = await expeditionService.evacuateExpedition(cultivatorId, guildId);
    assert.strictEqual(evacResult.ok, true);
    assert.strictEqual(evacResult.settlement, 'Desa Xingcun');

    const pSafe = await Player.findOne({ discordId: cultivatorId, guildId });
    assert.strictEqual(pSafe.gridPosition.zoneId, 'xingcun_village');
    assert.strictEqual(pSafe.gridPosition.tileX, 16);
    assert.strictEqual(pSafe.gridPosition.tileY, 16);
    console.log(`[PASS] Berhasil dievakuasi kembali ke Desa Xingcun di koordinat (16, 16).`);

    // 7. Verifikasi ActivityLog
    console.log('\n[6/6] Memeriksa ActivityLog ekspedisi...');
    const expLog = await ActivityLog.findOne({ guildId, discordId: cultivatorId, actionType: 'expedition_loot' });
    assert(expLog, 'Aktivitas ekspedisi harus tercatat.');
    console.log('[PASS] ActivityLog ekspedisi terverifikasi.');

    // Cleanup
    await Player.deleteMany({ guildId });
    await ExpeditionSession.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G9 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG9();
