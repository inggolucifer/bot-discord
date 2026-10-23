/**
 * scripts/testFishingGate.js
 * Fase B Verification Gate: Two-Step Server-Authoritative Fishing Suite
 * Menguji 30 skenario memancing di berbagai perairan, validasi stamina,
 * anti-cheat durasi 4 detik, penolakan reel ganda, dan kolam interior.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Player = require('../models/Player');
const Item = require('../models/Item');
const { ensureCoreItems, pickFishForRegion } = require('../services/coreItems');
const proceduralWorldEngine = require('../utils/proceduralWorldEngine');
const worldRoutes = require('../web-api/routes/world');
const { JWT_SECRET } = require('../web-api/utils/jwtSecret');

async function runFishingGate() {
  console.log('===============================================================');
  console.log('   FASE B VERIFICATION GATE: SERVER-AUTHORITATIVE FISHING     ');
  console.log('===============================================================\n');

  let mongoServer = null;
  const uri = process.env.MONGODB_URI;
  try {
    if (uri) {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log('[1/4] Terhubung ke MongoDB lokal:', uri);
    } else {
      throw new Error('No MONGODB_URI set, starting in-memory server');
    }
  } catch (err) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    const memUri = mongoServer.getUri();
    await mongoose.connect(memUri);
    console.log('[1/4] Terhubung ke MongoDB In-Memory:', memUri);
  }

  // 1. Ensure core items in DB
  const seederRes = await ensureCoreItems();
  console.log(`[2/4] Katalog item inti aktif: ${seederRes.total} item.`);

  // 2. Setup Express test app
  const app = express();
  app.use(express.json());
  app.use('/api/world', worldRoutes);

  const testDiscordId = 'test_fisher_' + Date.now();
  const testGuildId = 'test_guild_' + Date.now();
  const token = jwt.sign({ userId: testDiscordId }, JWT_SECRET, { expiresIn: '1h' });

  // 3. Create test player
  const player = await Player.create({
    discordId: testDiscordId,
    guildId: testGuildId,
    characterName: 'Pendekar Nelayan Uji',
    gender: 'Pria',
    currentHp: 100,
    maxHp: 100,
    currentStamina: 100,
    maxStamina: 100,
    gridPosition: {
      zoneId: 'tianyuan_world_map',
      tileX: 2500,
      tileY: 2500
    },
    professions: {
      fishing: { level: 1, exp: 0, isUnlocked: true }
    },
    inventory: []
  });
  console.log(`[3/4] Karakter uji dibuat: ${player.characterName} (Stamina: 100, Fishing Lv.1).\n`);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  console.log('--- PENGUJIAN INTEGRASI API /world/fish ---');

  // Cari petak air dan petak darat di peta
  let waterX = null, waterY = null;
  let landX = 2500, landY = 2500;

  // Cari petak air di sekitar (2500, 2500)
  for (let x = 2400; x <= 2600 && waterX === null; x += 5) {
    for (let y = 2400; y <= 2600; y += 5) {
      const tile = proceduralWorldEngine.getTileAt(x, y);
      if (tile.terrainType === 'river' || tile.terrainType === 'lake' || tile.isWater) {
        waterX = x;
        waterY = y;
        break;
      }
    }
  }

  // Jika tidak ditemukan di radius kecil, gunakan koordinat mirror_lake (1200, 3100)
  if (waterX === null) {
    waterX = 1200;
    waterY = 3100;
  }

  // Set player di sebelah petak air
  player.gridPosition.tileX = waterX - 1;
  player.gridPosition.tileY = waterY;
  await player.save();

  // Test 1: Cast pada petak yang terlalu jauh (> 1 petak) wajib ditolak
  const farRes = await request(app)
    .post('/api/world/fish/cast')
    .set('Authorization', `Bearer ${token}`)
    .send({ x: waterX + 5, y: waterY + 5 });
  assert(farRes.status === 400 && farRes.body.ok === false, '1. Cast petak jarak > 1 ditolak');

  // Test 2: Cast pada petak daratan murni wajib ditolak
  player.gridPosition.tileX = 2500;
  player.gridPosition.tileY = 2500;
  await player.save();
  const landRes = await request(app)
    .post('/api/world/fish/cast')
    .set('Authorization', `Bearer ${token}`)
    .send({ x: 2500, y: 2501 });
  assert(landRes.status === 400 && landRes.body.ok === false, '2. Cast pada petak darat ditolak');

  // Test 3: Cast saat masih berada di dalam ruangan wajib ditolak
  player.gridPosition.interiorInstanceId = new mongoose.Types.ObjectId();
  await player.save();
  const insideRes = await request(app)
    .post('/api/world/fish/cast')
    .set('Authorization', `Bearer ${token}`)
    .send({ x: waterX, y: waterY, source: 'world' });
  assert(insideRes.status === 400 && insideRes.body.ok === false, '3. Cast alam terbuka saat di dalam ruangan ditolak');

  // Test 4: Cast kolam interior saat di dalam ruangan wajib berhasil
  const interiorRes = await request(app)
    .post('/api/world/fish/cast')
    .set('Authorization', `Bearer ${token}`)
    .send({ source: 'interior' });
  assert(
    interiorRes.status === 200 &&
    interiorRes.body.ok === true &&
    Boolean(interiorRes.body.castId) &&
    interiorRes.body.staminaLeft === 95,
    '4. Cast kolam interior saat di dalam hunian berhasil & stamina dipotong 5'
  );

  // Keluar dari interior dan posisikan kembali di samping petak air
  player.gridPosition.interiorInstanceId = null;
  player.gridPosition.tileX = waterX - 1;
  player.gridPosition.tileY = waterY;
  await player.save();

  // Test 5: Cast sah pada petak air terbuka
  const validCastRes = await request(app)
    .post('/api/world/fish/cast')
    .set('Authorization', `Bearer ${token}`)
    .send({ x: waterX, y: waterY });
  assert(
    validCastRes.status === 200 &&
    validCastRes.body.ok === true &&
    Boolean(validCastRes.body.castId) &&
    validCastRes.body.difficulty >= 1,
    '5. Cast petak air valid menghasilkan castId dan tingkat kesulitan'
  );

  const activeCastId = validCastRes.body.castId;

  // Test 6: Instant catch (< 4.0 detik) wajib ditolak oleh server
  const fastReelRes = await request(app)
    .post('/api/world/fish/reel')
    .set('Authorization', `Bearer ${token}`)
    .send({ castId: activeCastId, caught: true });
  assert(fastReelRes.status === 400 && fastReelRes.body.ok === false, '6. Reel instan (< 4 detik) ditolak (Anti-Bot)');

  // Test 7: Non-existent / invalid castId wajib ditolak
  const fakeReelRes = await request(app)
    .post('/api/world/fish/reel')
    .set('Authorization', `Bearer ${token}`)
    .send({ castId: 'cast_invalid_fake_id_123', caught: true });
  assert(fakeReelRes.status === 400 && fakeReelRes.body.ok === false, '7. Reel castId tidak valid ditolak');

  // Test 8: Valid reel setelah 4.1 detik wajib memberikan item & EXP
  console.log('    Menunggu 4.1 detik untuk simulasi waktu tangkapan nyata...');
  await new Promise(r => setTimeout(r, 4100));

  const validReelRes = await request(app)
    .post('/api/world/fish/reel')
    .set('Authorization', `Bearer ${token}`)
    .send({ castId: activeCastId, caught: true });
  assert(
    validReelRes.status === 200 &&
    validReelRes.body.ok === true &&
    validReelRes.body.caught === true &&
    Boolean(validReelRes.body.fishItem?.name) &&
    validReelRes.body.expGained === 20,
    '8. Reel sah (>= 4 detik) berhasil memberikan ikan dan 20 EXP memancing'
  );

  // Test 9: Double reel dengan castId yang sama wajib ditolak
  const doubleReelRes = await request(app)
    .post('/api/world/fish/reel')
    .set('Authorization', `Bearer ${token}`)
    .send({ castId: activeCastId, caught: true });
  assert(doubleReelRes.status === 400 && doubleReelRes.body.ok === false, '9. Double reel dengan castId sama ditolak');

  // Test 10: Penolakan stamina rendah (< 5)
  player.currentStamina = 2;
  await player.save();
  const lowStaRes = await request(app)
    .post('/api/world/fish/cast')
    .set('Authorization', `Bearer ${token}`)
    .send({ x: waterX, y: waterY });
  assert(lowStaRes.status === 400 && lowStaRes.body.ok === false, '10. Cast dengan stamina < 5 ditolak');

  // 4. Simulasi 20 kali sebaran ikan lintas region (Menjamin ekologi Jianghu)
  console.log('\n--- SIMULASI SEBARAN 20x TANGKAPAN LINTAS REGION ---');
  const regions = ['central_plains', 'mirror_lake', 'nine_springs_delta', 'azure_mountain_range', 'interior'];
  const catchLog = {};

  for (let i = 0; i < 20; i++) {
    const reg = regions[i % regions.length];
    const isFishSpot = i % 3 === 0;
    const fish = pickFishForRegion(reg, isFishSpot);
    catchLog[fish.name] = (catchLog[fish.name] || 0) + 1;
    assert(fish.difficulty >= 1 && fish.difficulty <= 5, `Simulasi #${i + 1} (${reg}) difficulty valid [1..5]`);
  }

  console.log('Hasil Distribusi Ikan:');
  for (const [name, count] of Object.entries(catchLog)) {
    console.log(`  - ${name}: ${count}x tangkapan`);
  }

  // Cleanup player uji
  await Player.deleteOne({ _id: player._id });
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();

  console.log(`\n===============================================================`);
  console.log(`   FASE B VERIFICATION GATE SELESAI: ${passedTests}/${totalTests} UJIAN LULUS (100%)!`);
  console.log(`===============================================================\n`);
}

runFishingGate().catch(err => {
  console.error('\n[FATAL ERROR] Gagal menjalankan pengujian Fase B:', err);
  process.exit(1);
});
