require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported
}
const mongoose = require('mongoose');
const assert = require('assert');

const GridZone = require('./models/GridZone');
const ZoneTile = require('./models/ZoneTile');
const gridZoneService = require('./services/gridZoneService');
const { seedPilotGrid } = require('./scripts/seed_pilot_grid');

async function runTestG1() {
  console.log('=== MEMULAI TEST PHASE G1: GRID SCHEMA FOUNDATION & PILOT SEEDING ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/5] Berhasil terhubung ke MongoDB Atlas.');

  const testGuildId = 'test_guild_g1_verification';
  const zoneId = 'xingcun_village';

  try {
    // 1. Jalankan Seeding Pilot untuk Guild Uji Coba
    console.log('[2/5] Menjalankan seedPilotGrid untuk test guild...');
    const seedResult = await seedPilotGrid(testGuildId);
    assert(seedResult.zone, 'GridZone harus berhasil di-generate.');
    assert.strictEqual(seedResult.tileCount, 1024, 'Jumlah tile 32x32 harus tepat 1024 petak.');
    console.log(`[PASS] Seeding 1024 petak untuk '${zoneId}' sukses 100%.`);

    // 2. Verifikasi GridZone di Database
    console.log('\n[3/5] Menguji metadata GridZone via gridZoneService...');
    const zoneMeta = await gridZoneService.getGridZone(testGuildId, zoneId);
    assert(zoneMeta, 'Metadata zona harus dapat ditemukan di DB.');
    assert.strictEqual(zoneMeta.name, 'Desa Xingcun');
    assert.strictEqual(zoneMeta.width, 32);
    assert.strictEqual(zoneMeta.height, 32);
    assert.strictEqual(zoneMeta.spawnPoint.x, 16);
    assert.strictEqual(zoneMeta.spawnPoint.y, 16);
    assert.strictEqual(zoneMeta.dangerTier, 1);
    console.log('[PASS] Verifikasi metadata GridZone sukses.');

    // 3. Verifikasi Compound Unique Index Anti-Dupe pada ZoneTile
    console.log('\n[4/5] Menguji keandalan Compound Unique Index ZoneTile...');
    let duplicateRejected = false;
    try {
      await ZoneTile.create({
        guildId: testGuildId,
        zoneId,
        tileX: 16,
        tileY: 16,
        tileType: 'ground'
      });
    } catch (err) {
      if (err.code === 11000) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'MongoDB harus menolak duplikasi tile pada koordinat yang sama (E11000).');
    console.log('[PASS] Compound Unique Index (guildId, zoneId, tileX, tileY) bekerja sempurna mencegah dupe.');

    // 4. Verifikasi Logika Passability & Collision pada gridZoneService
    console.log('\n[5/5] Menguji logika passability, collision, stamina multiplier, dan door detection...');

    // A. Uji di luar batas (Out of bounds)
    const oob1 = await gridZoneService.isTilePassable(testGuildId, zoneId, -1, 10);
    assert.strictEqual(oob1.passable, false);
    assert.match(oob1.reason, /luar batas/);

    const oob2 = await gridZoneService.isTilePassable(testGuildId, zoneId, 32, 16);
    assert.strictEqual(oob2.passable, false);
    assert.match(oob2.reason, /luar batas/);
    console.log('[PASS] Validasi batas peta (Bounds Check) berhasil.');

    // B. Uji Dinding Bangunan Solid (Toko Obat)
    const solidWall = await gridZoneService.isTilePassable(testGuildId, zoneId, 12, 13);
    assert.strictEqual(solidWall.passable, false);
    assert.match(solidWall.reason, /Toko Obat Herbal Xingcun/);
    console.log('[PASS] Validasi rintangan solid bangunan berhasil (terhalang dinding).');

    // C. Uji Pintu Masuk Bangunan (Door Tile)
    const doorTile = await gridZoneService.isTilePassable(testGuildId, zoneId, 13, 15);
    assert.strictEqual(doorTile.passable, true);
    assert.strictEqual(doorTile.isDoor, true);
    console.log('[PASS] Validasi pintu bangunan berhasil (dapat dilewati & bertanda door).');

    // D. Uji Jalan Utama (Road) & Diskon Stamina
    const roadTile = await gridZoneService.isTilePassable(testGuildId, zoneId, 16, 16);
    assert.strictEqual(roadTile.passable, true);
    assert.strictEqual(roadTile.staminaCostMultiplier, 0.8);
    console.log('[PASS] Validasi jalan utama berhasil (passable dengan stamina multiplier 0.8).');

    // E. Uji Air Sungai Dalam (Water)
    const waterTileNonSwimmer = await gridZoneService.isTilePassable(testGuildId, zoneId, 5, 6, { canSwim: false, canFly: false });
    assert.strictEqual(waterTileNonSwimmer.passable, false);
    assert.match(waterTileNonSwimmer.reason, /Perairan sungai dalam/);

    const waterTileSwimmer = await gridZoneService.isTilePassable(testGuildId, zoneId, 5, 6, { canSwim: true });
    assert.strictEqual(waterTileSwimmer.passable, true);
    console.log('[PASS] Validasi perairan berhasil (pemain biasa terhalang, perenang lolos).');

    // F. Uji Resource Nodes
    const bambooNode = await gridZoneService.getTile(testGuildId, zoneId, 8, 8);
    assert.strictEqual(bambooNode.resourceType, 'wood');

    const fishNode = await gridZoneService.getTile(testGuildId, zoneId, 20, 6);
    assert.strictEqual(fishNode.resourceType, 'fish');

    const herbNode = await gridZoneService.getTile(testGuildId, zoneId, 24, 24);
    assert.strictEqual(herbNode.resourceType, 'herb');
    console.log('[PASS] Verifikasi seluruh resource nodes (wood, fish, herb) sukses.');

    // G. Uji Buildable Land Plots
    const landPlot = await gridZoneService.getTile(testGuildId, zoneId, 10, 10);
    assert.strictEqual(landPlot.isClaimable, true);
    assert.strictEqual(landPlot.plotPriceSilver, 100);
    console.log('[PASS] Verifikasi kavling tanah klaimable sukses.');

    // Bersihkan data uji coba
    await GridZone.deleteMany({ guildId: testGuildId });
    await ZoneTile.deleteMany({ guildId: testGuildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G1 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG1();
