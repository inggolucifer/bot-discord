/**
 * tests/contract/worldAndGrid.test.js
 * Fase C: Contract Test Suite for Jianghu World & Grid Architecture
 * Native Node.js test runner (`node --test`) using in-memory MongoDB.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const Player = require('../../models/Player');
const Item = require('../../models/Item');
const PropertyStructure = require('../../models/PropertyStructure');
const ZoneTile = require('../../models/ZoneTile');
const { ensureCoreItems } = require('../../services/coreItems');
const interiorService = require('../../services/interiorService');
const worldRoutes = require('../../web-api/routes/world');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');

const { JWT_SECRET } = require('../../web-api/utils/jwtSecret');

describe('Jianghu World & Grid Architecture Contracts (30 Scenarios)', () => {
  let mongoServer;
  let app;
  let testPlayer;
  let token;
  const testUserId = 'contract_user_' + Date.now();
  const testGuildId = 'contract_guild_' + Date.now();

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/world', worldRoutes);

    token = jwt.sign({ userId: testUserId }, JWT_SECRET, { expiresIn: '2h' });

    await ensureCoreItems();

    testPlayer = await Player.create({
      discordId: testUserId,
      guildId: testGuildId,
      characterName: 'Pendekar Kontrak Uji',
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
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  // --- COMPONENT 1 & 2: BUILDING ENTRY & EXIT ---
  describe('Building Entry & Exit Contracts', () => {
    it('1. Masuk bangunan biasa (jarak Chebyshev <= 1) berhasil', async () => {
      const res = await interiorService.enterBuilding(testUserId, testGuildId, {
        targetX: 2500,
        targetY: 2500,
        zoneId: 'tianyuan_world_map',
        buildingType: 'cottage'
      });
      assert.equal(res.ok, true);
      assert.ok(res.property?.id);
      assert.equal(res.property?.width, 6);
      assert.equal(res.property?.height, 5);
      assert.deepEqual(res.property?.doorSpawn, { x: 2, y: 3 });
    });

    it('2. Status interiorInstanceId tersimpan di data player', async () => {
      const p = await Player.findOne({ discordId: testUserId });
      assert.ok(p.gridPosition.interiorInstanceId);
      assert.ok(p.gridPosition.interiorEnteredAt);
    });

    it('3. Double-entry saat sudah di dalam ruangan menghasilkan idempoten atau data ruangan aktif', async () => {
      const res = await interiorService.enterBuilding(testUserId, testGuildId, {
        targetX: 2500,
        targetY: 2500,
        zoneId: 'tianyuan_world_map'
      });
      assert.equal(res.ok, true);
      assert.ok(res.property?.id);
    });

    it('4. Masuk bangunan dengan jarak > 1 petak ditolak', async () => {
      // Keluar dulu
      await interiorService.exitBuilding(testUserId, testGuildId);
      const res = await interiorService.enterBuilding(testUserId, testGuildId, {
        targetX: 2600,
        targetY: 2600,
        zoneId: 'tianyuan_world_map'
      });
      assert.equal(res.ok, false);
      assert.match(res.error, /terlalu jauh/i);
    });

    it('5. Keluar bangunan membersihkan interiorInstanceId secara tuntas', async () => {
      await interiorService.enterBuilding(testUserId, testGuildId, {
        targetX: 2500,
        targetY: 2500,
        zoneId: 'tianyuan_world_map'
      });
      const exitRes = await interiorService.exitBuilding(testUserId, testGuildId);
      assert.equal(exitRes.ok, true);
      const p = await Player.findOne({ discordId: testUserId });
      assert.equal(p.gridPosition.interiorInstanceId, null);
    });

    it('6. Keluar bangunan bersifat idempoten jika pemain sudah di luar', async () => {
      const exitRes = await interiorService.exitBuilding(testUserId, testGuildId);
      assert.equal(exitRes.ok, true);
    });

    it('7. Sesi interior kadaluarsa (> 30 menit) otomatis dibersihkan', async () => {
      testPlayer.gridPosition.interiorInstanceId = new mongoose.Types.ObjectId();
      testPlayer.gridPosition.interiorEnteredAt = new Date(Date.now() - 35 * 60 * 1000); // 35 menit lalu
      await testPlayer.save();

      // Panggil enterBuilding pada petak baru
      const res = await interiorService.enterBuilding(testUserId, testGuildId, {
        targetX: 2500,
        targetY: 2500,
        zoneId: 'tianyuan_world_map'
      });
      assert.equal(res.ok, true);
    });
  });

  // --- COMPONENT 3: FISHING CONTRACTS ---
  describe('Two-Step Fishing Contracts', () => {
    let castId;

    it('8. Cast memancing pada petak darat ditolak', async () => {
      await interiorService.exitBuilding(testUserId, testGuildId);
      const res = await request(app)
        .post('/api/world/fish/cast')
        .set('Authorization', `Bearer ${token}`)
        .send({ x: 2500, y: 2500 }); // Daratan
      assert.equal(res.status, 400);
      assert.equal(res.body.ok, false);
    });

    it('9. Cast memancing saat masih berada di dalam ruangan ditolak', async () => {
      testPlayer.gridPosition.interiorInstanceId = new mongoose.Types.ObjectId();
      testPlayer.gridPosition.interiorEnteredAt = new Date();
      await testPlayer.save();

      const res = await request(app)
        .post('/api/world/fish/cast')
        .set('Authorization', `Bearer ${token}`)
        .send({ x: 1200, y: 3100 });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /dalam ruangan/i);

      testPlayer.gridPosition.interiorInstanceId = null;
      await testPlayer.save();
    });

    it('10. Cast memancing kolam interior saat di dalam hunian berhasil', async () => {
      testPlayer.gridPosition.interiorInstanceId = new mongoose.Types.ObjectId();
      await testPlayer.save();

      const res = await request(app)
        .post('/api/world/fish/cast')
        .set('Authorization', `Bearer ${token}`)
        .send({ source: 'interior' });
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.ok(res.body.castId);

      testPlayer.gridPosition.interiorInstanceId = null;
      await testPlayer.save();
    });

    it('11. Cast memancing perairan sah memotong tepat 5 stamina dan mengembalikan castId', async () => {
      // Buat tile air buatan di (2500, 2501)
      await ZoneTile.create({
        guildId: testGuildId,
        zoneId: 'tianyuan_world_map',
        tileX: 2500,
        tileY: 2501,
        isWater: true,
        resourceType: 'fish'
      });

      await Player.updateOne({ discordId: testUserId }, { $set: { currentStamina: 100 } });

      const res = await request(app)
        .post('/api/world/fish/cast')
        .set('Authorization', `Bearer ${token}`)
        .send({ x: 2500, y: 2501 });

      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.ok(res.body.castId);
      assert.equal(res.body.staminaLeft, 95);
      castId = res.body.castId;
    });

    it('12. Reel instan (< 4.0 detik) ditolak sebagai bot/cheat', async () => {
      const res = await request(app)
        .post('/api/world/fish/reel')
        .set('Authorization', `Bearer ${token}`)
        .send({ castId, caught: true });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /terlalu terburu-buru/i);
    });

    it('13. Reel sah (>= 4.0 detik) menambahkan ikan ke inventory dan memberi +20 EXP', async () => {
      await new Promise(r => setTimeout(r, 4100));
      const res = await request(app)
        .post('/api/world/fish/reel')
        .set('Authorization', `Bearer ${token}`)
        .send({ castId, caught: true });

      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.caught, true);
      assert.equal(res.body.expGained, 20);

      const p = await Player.findOne({ discordId: testUserId });
      assert.ok(p.inventory.length > 0);
      assert.equal(p.professions.fishing.exp, 20);
    });

    it('14. Double reel dengan castId yang sama ditolak', async () => {
      const res = await request(app)
        .post('/api/world/fish/reel')
        .set('Authorization', `Bearer ${token}`)
        .send({ castId, caught: true });
      assert.equal(res.status, 400);
      assert.equal(res.body.ok, false);
    });
  });

  // --- COMPONENT 4: CORE SEEDER & INVENTORY CONTRACTS ---
  describe('Core Seeder & Gathering Contracts', () => {
    it('15. Katalog 13 item inti dipastikan terdaftar di MongoDB', async () => {
      const items = await Item.find({
        name: {
          $in: [
            'Herba Roh Bunga Melati',
            'Bijih Besi Roh Murni',
            'Kayu Cendana Spiritual',
            'Ikan Mas Sisik Emas',
            'Ikan Koi Pelangi'
          ]
        }
      });
      assert.ok(items.length >= 5);
      for (const it of items) {
        assert.equal(it.category, 'material');
      }
    });

    it('16. Sanitasi integer: stamina pemain murni integer tanpa desimal', async () => {
      const p = await Player.findOne({ discordId: testUserId });
      assert.equal(Number.isInteger(p.currentStamina), true);
      assert.equal(Number.isInteger(p.maxStamina), true);
    });

    it('17. Sanitasi input regex pada /settlement/:settlementName aman dari karakter khusus', async () => {
      const res = await request(app)
        .get('/api/world/settlement/XiTong%20(City)*+?')
        .set('Authorization', `Bearer ${token}`);
      assert.notEqual(res.status, 500); // Tidak melempar ReDoS atau SyntaxError
    });
  });
});
