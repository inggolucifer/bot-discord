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
const ActivityLog = require('./models/ActivityLog');
const landService = require('./services/landService');
const { seedPilotGrid } = require('./scripts/seed_pilot_grid');

async function runTestG4() {
  console.log('=== MEMULAI TEST PHASE G4: LAND OWNERSHIP & CONCURRENCY CONTROL ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/6] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g4_verification';
  const buyerId = 'user_test_g4_buyer';
  const competitorId = 'user_test_g4_competitor';
  const zoneId = 'xingcun_village';

  try {
    // 1. Setup Peta Pilot
    console.log('[2/6] Menyiapkan pilot grid dengan kavling tanah...');
    await seedPilotGrid(guildId);

    await Player.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });

    // Buat karakter pembeli (punya 250 perak)
    const buyer = await Player.create({
      discordId: buyerId,
      guildId,
      characterName: 'Tuan Tanah G4',
      status: 'active',
      currency: { copper: 0, silver: 250, gold: 0 },
      gridPosition: { zoneId, tileX: 16, tileY: 16 }
    });

    // 2. Uji Daftar Kavling Tersedia
    console.log('\n[3/6] Mengambil daftar kavling tanah yang dapat diklaim...');
    const plots = await landService.getAvailablePlots(guildId, zoneId);
    assert(plots.length >= 8, 'Harus ada minimal 8 kavling tanah di Desa Xingcun.');
    console.log(`[PASS] Ditemukan ${plots.length} kavling tanah kosong siap beli.`);

    // 3. Uji Pembelian Berhasil (Petak 10, 10 - Harga 100 perak)
    console.log('\n[4/6] Menguji pembelian tanah yang valid pada koordinat (10, 10)...');
    const buyResult = await landService.purchaseLandPlot(buyerId, guildId, 10, 10, zoneId);
    if (!buyResult.ok) console.log('buyResult FAILED:', buyResult);
    assert.strictEqual(buyResult.ok, true, 'Pembelian harus berhasil.');
    assert.strictEqual(buyResult.pricePaid, 100);
    assert.strictEqual(buyResult.remainingSilver, 150);

    const boughtTile = await ZoneTile.findOne({ guildId, zoneId, tileX: 10, tileY: 10 });
    assert.strictEqual(boughtTile.ownerId, buyerId);
    assert.strictEqual(boughtTile.ownerType, 'player');

    // Cek ActivityLog
    const logEntry = await ActivityLog.findOne({ guildId, discordId: buyerId, actionType: 'land_buy' });
    assert(logEntry, 'Transaksi pembelian tanah harus tercatat di ActivityLog.');
    assert.strictEqual(logEntry.details.tileX, 10);
    assert.strictEqual(logEntry.details.tileY, 10);
    console.log(`[PASS] Pembelian petak (10, 10) berhasil, saldo sisa 150 perak, log anti-cheat tercatat.`);

    // 4. Uji Penolakan Membeli Petak yang Sudah Dimiliki
    console.log('\n[5/6] Menguji penolakan pembelian petak yang sudah berpemilik...');
    const rebuyResult = await landService.purchaseLandPlot(buyerId, guildId, 10, 10, zoneId);
    assert.strictEqual(rebuyResult.ok, false);
    assert.match(rebuyResult.error, /sudah dimiliki/i);
    console.log(`[PASS] Pembelian kedua pada petak yang sama ditolak: "${rebuyResult.error}"`);

    // 5. Uji Concurrency / Race Condition Proteksi
    console.log('\n[6/6] Menguji proteksi race-condition dua pembelian bersamaan pada petak (11, 10)...');
    // Buat kompetitor dengan 200 perak
    await Player.create({
      discordId: competitorId,
      guildId,
      characterName: 'Saingan Tanah',
      status: 'active',
      currency: { copper: 0, silver: 200, gold: 0 },
      gridPosition: { zoneId, tileX: 16, tileY: 16 }
    });

    // Jalankan transaksi paralel bersamaan persis untuk petak (11, 10)
    const [p1, p2] = await Promise.all([
      landService.purchaseLandPlot(buyerId, guildId, 11, 10, zoneId),
      landService.purchaseLandPlot(competitorId, guildId, 11, 10, zoneId)
    ]);

    const successCount = (p1.ok ? 1 : 0) + (p2.ok ? 1 : 0);
    assert.strictEqual(successCount, 1, 'Tepat hanya 1 pemain yang boleh berhasil klaim petak secara paralel.');
    console.log(`[PASS] Transaksi paralel sukses terlindungi: Player 1 (ok: ${p1.ok}), Player 2 (ok: ${p2.ok}).`);

    // Cleanup
    await Player.deleteMany({ guildId });
    await GridZone.deleteMany({ guildId });
    await ZoneTile.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G4 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG4();
