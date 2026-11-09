// globals: describe, it, beforeAll, afterAll, expect are provided by Vitest (globals: true)
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const Player = require('../../models/Player');
const Npc = require('../../models/Npc');
const NpcAmbush = require('../../models/NpcAmbush');
const NpcVendetta = require('../../models/NpcVendetta');
const npcInteractionRoutes = require('../../web-api/routes/npcInteraction');
const { JWT_SECRET } = require('../../web-api/utils/jwtSecret');

describe('NPC Ambush Routes Integration (P0)', () => {
  let mongoServer;
  let app;
  let player1;
  let player2;
  let hunter;
  let ambush1;
  let vendetta1;
  let token1;
  let token2;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/npc', npcInteractionRoutes);

    const discordId1 = 'discord_p0_user_1';
    const discordId2 = 'discord_p0_user_2';

    player1 = await Player.create({
      discordId: discordId1,
      email: 'player1_ambush@test.com',
      characterName: 'Pendekar Satu',
      gender: 'Laki-laki',
      stats: { hp: 100, maxHp: 100, baseAtk: 20, baseDef: 10 },
      attributes: { hp: 100, attack: 20, defense: 10 },
      currentStamina: 50,
      stamina: 50
    });

    player2 = await Player.create({
      discordId: discordId2,
      email: 'player2_ambush@test.com',
      characterName: 'Pendekar Dua',
      gender: 'Perempuan',
      stats: { hp: 100, maxHp: 100, baseAtk: 20, baseDef: 10 },
      attributes: { hp: 100, attack: 20, defense: 10 },
      currentStamina: 50,
      stamina: 50
    });

    hunter = await Npc.create({
      name: 'Pemburu Kegelapan',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 2 },
      attributes: { hp: 80, attack: 25, defense: 15 }
    });

    vendetta1 = await NpcVendetta.create({
      hunterNpcId: hunter._id,
      targetId: player1._id,
      targetType: 'player',
      grudgeLevel: 5,
      reason: 'Dendam pembunuhan saudara seperguruan',
      resolved: false
    });

    ambush1 = await NpcAmbush.create({
      hunterNpcId: hunter._id,
      targetPlayerId: player1._id,
      status: 'pending',
      tileX: 2450,
      tileY: 2480,
      expiresAt: new Date(Date.now() + 3600 * 1000)
    });

    token1 = jwt.sign({ userId: discordId1 }, JWT_SECRET, { expiresIn: '1h' });
    token2 = jwt.sign({ userId: discordId2 }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('GET /api/npc/ambush/pending returns 200 and loads pending ambush for owner with kind vendetta', async () => {
    const res = await request(app)
      .get('/api/npc/ambush/pending')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ambush).not.toBeNull();
    expect(res.body.ambush.id.toString()).toBe(ambush1._id.toString());
    expect(res.body.ambush.kind).toBe('vendetta');
    expect(res.body.ambush.hunterName).toBe(hunter.name);
    expect(res.body.ambush.familyName).toBeDefined();
    expect(res.body.ambush.reason).toBeDefined();
  });

  it('GET /api/npc/ambush/pending distinguishes hostile kind', async () => {
    // Create hostile ambush for player 2
    const hostileAmbush = await NpcAmbush.create({
      hunterNpcId: hunter._id,
      targetPlayerId: player2._id,
      kind: 'hostile',
      reason: 'benci',
      status: 'pending',
      tileX: 2450,
      tileY: 2480,
      expiresAt: new Date(Date.now() + 3600 * 1000)
    });

    const res = await request(app)
      .get('/api/npc/ambush/pending')
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ambush).not.toBeNull();
    expect(res.body.ambush.kind).toBe('hostile');
    expect(res.body.ambush.reason).toBe('benci');
    expect(res.body.ambush.hunterName).toBe(hunter.name);

    await NpcAmbush.deleteOne({ _id: hostileAmbush._id });
  });

  it('POST /api/npc/ambush/:id/resolve with choice fight resolves ambush', async () => {
    const res = await request(app)
      .post(`/api/npc/ambush/${ambush1._id}/resolve`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ choice: 'fight' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedAmbush = await NpcAmbush.findById(ambush1._id);
    expect(updatedAmbush.status).not.toBe('pending');
  });

  it('POST /api/npc/ambush/:id/resolve from another player returns 403 or 404 without changing ambush', async () => {
    // Create another pending ambush for player 1
    const ambushOther = await NpcAmbush.create({
      hunterNpcId: hunter._id,
      targetPlayerId: player1._id,
      status: 'pending',
      tileX: 2451,
      tileY: 2481,
      expiresAt: new Date(Date.now() + 3600 * 1000)
    });

    const res = await request(app)
      .post(`/api/npc/ambush/${ambushOther._id}/resolve`)
      .set('Authorization', `Bearer ${token2}`) // Player 2 trying to resolve Player 1's ambush
      .send({ choice: 'fight' });

    expect([403, 404]).toContain(res.status);

    const checkAmbush = await NpcAmbush.findById(ambushOther._id);
    expect(checkAmbush.status).toBe('pending');
  });
});
