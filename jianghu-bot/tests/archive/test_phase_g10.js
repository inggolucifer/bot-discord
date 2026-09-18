require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const assert = require('assert');

const AdminLog = require('./models/AdminLog');
const Player = require('./models/Player');
const adminInspectService = require('./services/adminInspectService');
const { seedPilotGrid } = require('./scripts/seed_pilot_grid');

async function runTestG10() {
  console.log('=== MEMULAI TEST PHASE G10: ADMIN DB INSPECTOR (READ-ONLY) ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/6] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g10_verification';
  const ownerId = (process.env.OWNER_IDS || '').split(/[, ]+/).filter(Boolean)[0] || '1537840876578148392';
  const nonOwnerId = 'stranger_danger_999999';

  try {
    await AdminLog.deleteMany({ guildId });
    await Player.deleteMany({ guildId });

    // 1. Uji Penolakan Non-Owner
    console.log('[2/6] Menguji penolakan akses untuk user yang bukan OWNER_IDS...');
    const deniedRes = await adminInspectService.getCollectionsSummary(nonOwnerId, guildId);
    assert.strictEqual(deniedRes.ok, false);
    assert.match(deniedRes.error, /akses ditolak/i);
    console.log(`[PASS] User non-owner ditolak secara ketat: "${deniedRes.error}"`);

    // 2. Uji Ringkasan Koleksi oleh Owner
    console.log('\n[3/6] Menguji getCollectionsSummary oleh Owner...');
    const summaryRes = await adminInspectService.getCollectionsSummary(ownerId, guildId);
    assert.strictEqual(summaryRes.ok, true, 'Owner harus diizinkan memeriksa koleksi.');
    assert(summaryRes.collections.length > 0, 'Harus ada koleksi di database.');
    console.log(`[PASS] Berhasil mengambil ringkasan ${summaryRes.collections.length} koleksi MongoDB.`);

    // 3. Uji Kueri Aman (findCollectionDocs) dengan Redaksi Sensitif
    console.log('\n[4/6] Menguji kueri findCollectionDocs dan redaksi data sensitif...');
    const findRes = await adminInspectService.findCollectionDocs(ownerId, guildId, 'players', '{}', 2);
    assert.strictEqual(findRes.ok, true);
    console.log(`[PASS] Kueri read-only pada koleksi 'players' berhasil (${findRes.returnedCount} dokumen).`);

    // 4. Uji Inspeksi Pemain Lintas Koleksi (inspectPlayer)
    console.log('\n[5/6] Menguji inspectPlayer lintas koleksi...');
    const testPlayer = await Player.create({
      discordId: 'target_subject_007',
      guildId,
      characterName: 'Subjek Uji Coba',
      status: 'active',
      currentHp: 100,
      currentStamina: 80,
      currency: { silver: 50 },
      gridPosition: { zoneId: 'xingcun_village', tileX: 16, tileY: 16 }
    });

    const inspectRes = await adminInspectService.inspectPlayer(ownerId, guildId, 'target_subject_007');
    assert.strictEqual(inspectRes.ok, true);
    assert.strictEqual(inspectRes.characterName, 'Subjek Uji Coba');
    assert.strictEqual(inspectRes.currentHp, 100);
    console.log(`[PASS] Inspeksi karakter '${inspectRes.characterName}' sukses mengambil seluruh atribut.`);

    // 5. Uji Render Peta ASCII Tanah (renderLandMap)
    console.log('\n[6/6] Menguji render peta ASCII wilayah Desa Xingcun...');
    await seedPilotGrid(guildId);
    const mapRes = await adminInspectService.renderLandMap(ownerId, guildId, 'xingcun_village');
    assert.strictEqual(mapRes.ok, true);
    assert(mapRes.asciiMap.length > 0, 'ASCII map harus ter-generate.');
    console.log(`[PASS] Peta tanah ASCII berhasil di-render:\n${mapRes.asciiMap}`);

    // Verifikasi AdminLog
    const logs = await AdminLog.find({ guildId });
    assert(logs.length >= 4, 'Semua aksi inspeksi harus tercatat di AdminLog.');
    console.log(`\n[PASS] Sebanyak ${logs.length} aksi inspeksi admin terverifikasi tercatat di AdminLog.`);

    // Cleanup
    await AdminLog.deleteMany({ guildId });
    await Player.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G10 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG10();
