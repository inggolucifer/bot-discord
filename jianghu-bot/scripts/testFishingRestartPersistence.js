/**
 * scripts/testFishingRestartPersistence.js
 * Contract test for Prompt 1.6:
 * Cast -> restart process -> reel succeeds;
 * Double reel rejected;
 * Reel after expiration rejected.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Player = require('../models/Player');
const FishCast = require('../models/FishCast');
const worldRoutes = require('../web-api/routes/world');
const { JWT_SECRET } = require('../web-api/utils/jwtSecret');

async function runTest() {
  console.log('=== UJI KONTRAK PERSISTENSI MEMANCING (PROMPT 1.6) ===\n');

  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);

  const testDiscordId = 'fisher_persist_' + Date.now();
  const token = jwt.sign({ userId: testDiscordId }, JWT_SECRET, { expiresIn: '1h' });

  // Create test player with ample stamina
  const player = await Player.create({
    discordId: testDiscordId,
    guildId: 'test_guild',
    characterName: 'Pendekar Nelayan Persisten',
    gender: 'Pria',
    currentHp: 100,
    maxHp: 100,
    currentStamina: 100,
    maxStamina: 100,
    gridPosition: {
      zoneId: 'tianyuan_world_map',
      tileX: 2050,
      tileY: 2650
    }
  });

  const app = express();
  app.use(express.json());
  app.use('/api/world', worldRoutes);

  try {
    // 1. Manually create a cast simulating a cast that started 5 seconds ago before server restarted
    const castId = 'cast_persisted_' + Date.now();
    await FishCast.create({
      castId,
      playerId: testDiscordId,
      fishName: 'Ikan Mas Sisik Emas',
      difficulty: 1,
      startedAt: new Date(Date.now() - 5000), // 5 seconds ago (> 4s anti-cheat)
      expiresAt: new Date(Date.now() + 85000), // still valid
      resolved: false
    });

    console.log('[1/4] Cast berhasil disimpan di MongoDB (simulasi sesi sebelum restart):', castId);

    // 2. Perform reel on the simulated new server instance
    const reelRes = await request(app)
      .post('/api/world/fish/reel')
      .set('Authorization', `Bearer ${token}`)
      .send({ castId, caught: true });

    if (reelRes.status !== 200 || !reelRes.body.ok) {
      throw new Error(`Reel setelah restart gagal: ${JSON.stringify(reelRes.body)}`);
    }
    console.log('[PASS] [2/4] Reel berhasil setelah restart!');

    // 3. Double reel must be rejected
    const doubleReel = await request(app)
      .post('/api/world/fish/reel')
      .set('Authorization', `Bearer ${token}`)
      .send({ castId, caught: true });

    if (doubleReel.status !== 400 || doubleReel.body.ok !== false) {
      throw new Error(`Reel kedua tidak ditolak: status ${doubleReel.status}`);
    }
    console.log('[PASS] [3/4] Reel ganda berhasil ditolak!');

    // 4. Expired cast (> 90s) must be rejected
    const expiredCastId = 'cast_expired_' + Date.now();
    await FishCast.create({
      castId: expiredCastId,
      playerId: testDiscordId,
      fishName: 'Ikan Roh Sisik Biru',
      difficulty: 1,
      startedAt: new Date(Date.now() - 100000),
      expiresAt: new Date(Date.now() - 10000), // expired 10s ago
      resolved: false
    });

    const expiredReel = await request(app)
      .post('/api/world/fish/reel')
      .set('Authorization', `Bearer ${token}`)
      .send({ castId: expiredCastId, caught: true });

    if (expiredReel.status !== 400 || expiredReel.body.ok !== false) {
      throw new Error(`Reel expired tidak ditolak: status ${expiredReel.status}`);
    }
    console.log('[PASS] [4/4] Reel kedaluwarsa (> 90s) berhasil ditolak!');

    console.log('\n=== SEMUA UJI KONTRAK PERSISTENSI MEMANCING LULUS (100%) ===\n');
  } finally {
    await Player.deleteOne({ discordId: testDiscordId });
    await FishCast.deleteMany({ playerId: testDiscordId });
    await mongoose.disconnect();
  }
}

runTest().catch(err => {
  console.error('[FATAL] Uji kontrak memancing gagal:', err);
  process.exit(1);
});
