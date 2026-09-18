require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const assert = require('assert');
const express = require('express');
const http = require('http');

const Player = require('./models/Player');
const GridZone = require('./models/GridZone');
const ZoneTile = require('./models/ZoneTile');
const PropertyStructure = require('./models/PropertyStructure');
const ActivityLog = require('./models/ActivityLog');
const gridSimulationRoutes = require('./web-api/routes/gridSimulation');
const { seedPilotGrid } = require('./scripts/seed_pilot_grid');

async function makeRequest(app, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const payload = body ? JSON.stringify(body) : null;

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          server.close();
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (payload) req.write(payload);
      req.end();
    });
  });
}

async function runTestG11() {
  console.log('=== MEMULAI TEST PHASE G11: WEB DASHBOARD API PARITY ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI belum diatur di .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/6] Terhubung ke MongoDB Atlas.');

  const guildId = 'test_guild_g11_verification';
  const webUserId = 'user_test_g11_web_player';
  const zoneId = 'xingcun_village';

  // Setup express test server
  const app = express();
  app.use(express.json());
  app.use('/api/grid', gridSimulationRoutes);

  try {
    // 1. Setup Peta Pilot
    console.log('[2/6] Menyiapkan pilot grid untuk web API endpoint...');
    await seedPilotGrid(guildId);

    await Player.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });

    // Buat player di koordinat (16, 16) dengan 200 perak & 100 stamina
    const player = await Player.create({
      discordId: webUserId,
      guildId,
      characterName: 'Pengguna Web Jianghu',
      status: 'active',
      currentHp: 100,
      currentStamina: 100,
      currency: { copper: 0, silver: 200, gold: 0 },
      gridPosition: { zoneId, tileX: 16, tileY: 16 }
    });

    // 2. Test GET /api/grid/zone/:zoneId
    console.log('\n[3/6] Menguji GET /api/grid/zone/xingcun_village...');
    const zoneRes = await makeRequest(app, 'GET', `/api/grid/zone/${zoneId}?guildId=${guildId}`);
    assert.strictEqual(zoneRes.status, 200);
    assert.strictEqual(zoneRes.data.ok, true);
    assert.strictEqual(zoneRes.data.tiles.length, 1024, 'Harus mengembalikan 1024 petak tile.');
    console.log(`[PASS] Endpoint GET zona berhasil mengembalikan ${zoneRes.data.tiles.length} petak.`);

    // 3. Test POST /api/grid/move (Melangkah ke Utara)
    console.log('\n[4/6] Menguji POST /api/grid/move (Langkah ke Utara)...');
    const moveRes = await makeRequest(app, 'POST', '/api/grid/move', {
      discordId: webUserId,
      guildId,
      direction: 'utara'
    });
    assert.strictEqual(moveRes.status, 200);
    assert.strictEqual(moveRes.data.ok, true);
    assert.strictEqual(moveRes.data.newPosition.tileX, 16);
    assert.strictEqual(moveRes.data.newPosition.tileY, 15);
    console.log(`[PASS] Endpoint POST move berhasil memindahkan posisi karakter ke (16, 15).`);

    // 4. Test POST /api/grid/land/purchase (Beli Kavling 10, 10)
    console.log('\n[5/6] Menguji POST /api/grid/land/purchase...');
    const buyRes = await makeRequest(app, 'POST', '/api/grid/land/purchase', {
      discordId: webUserId,
      guildId,
      x: 10,
      y: 10,
      zoneId
    });
    assert.strictEqual(buyRes.status, 200);
    assert.strictEqual(buyRes.data.ok, true);
    assert.strictEqual(buyRes.data.pricePaid, 100);
    console.log(`[PASS] Endpoint POST purchase land berhasil membeli kavling (10, 10) via Web API.`);

    // 5. Test POST /api/grid/profession/fish (Mancing di dermaga 20, 6)
    console.log('\n[6/6] Menguji POST /api/grid/profession/fish via Web API...');
    await Player.updateOne(
      { discordId: webUserId, guildId },
      { $set: { 'gridPosition.tileX': 20, 'gridPosition.tileY': 5 } }
    );

    const fishRes = await makeRequest(app, 'POST', '/api/grid/profession/fish', {
      discordId: webUserId,
      guildId
    });
    assert.strictEqual(fishRes.status, 200);
    assert.strictEqual(fishRes.data.ok, true);
    assert(fishRes.data.fishName, 'Harus mendapatkan hasil ikan.');
    console.log(`[PASS] Endpoint POST mancing berhasil menangkap '${fishRes.data.fishName}'.`);

    // Cleanup
    await Player.deleteMany({ guildId });
    await GridZone.deleteMany({ guildId });
    await ZoneTile.deleteMany({ guildId });
    await ActivityLog.deleteMany({ guildId });
    console.log('\n[CLEANUP] Data test guild berhasil dibersihkan.');

    console.log('\n=====================================================================');
    console.log('✅ SELURUH PENGUJIAN FASE G11 LULUS DENGAN SEMPURNA (100% SUCCESS) ✅');
    console.log('=====================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST GAGAL:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTestG11();
