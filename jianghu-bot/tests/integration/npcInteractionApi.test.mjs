import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Npc from '../../models/Npc.js';
import Player from '../../models/Player.js';
import NpcPlayerRelation from '../../models/NpcPlayerRelation.js';
import npcInteractionRoutes from '../../web-api/routes/npcInteraction.js';
import { generateDeterministicNpc } from '../../services/npcGenerator.js';
import { JWT_SECRET } from '../../web-api/utils/jwtSecret.js';
import { getTotalCopper } from '../../utils/currency.js';

describe('V27 Server-Authoritative NPC Interaction API Suite', () => {
  let app;
  let testPlayer;
  let testNpc;
  let righteousNpc;
  let authToken;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/npc', npcInteractionRoutes);

    // Setup in-memory models
    const playerId = new mongoose.Types.ObjectId();
    testPlayer = new Player({
      _id: playerId,
      userId: 'test_player_user_1',
      characterName: 'Pendekar Angin',
      currency: { copper: 500, silver: 10, gold: 0, jade: 0, spirit: 0 },
      stamina: 50,
      inventory: [],
      wantedLevel: 0
    });

    authToken = jwt.sign(
      { id: playerId.toString(), userId: 'test_player_user_1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const npcDoc = generateDeterministicNpc({
      name: 'Wang Shu',
      personalityPrimary: 'pragmatic'
    }, 'seed_test_npc');
    testNpc = new Npc(npcDoc);
    testNpc._id = new mongoose.Types.ObjectId();

    const righteousDoc = generateDeterministicNpc({
      name: 'Zhuge Liang',
      personalityPrimary: 'righteous'
    }, 'seed_righteous_npc');
    righteousNpc = new Npc(righteousDoc);
    righteousNpc._id = new mongoose.Types.ObjectId();

    // Stub Mongoose findById
    Npc.findById = async (id) => {
      if (id.toString() === testNpc._id.toString()) return testNpc;
      if (id.toString() === righteousNpc._id.toString()) return righteousNpc;
      return null;
    };

    Player.findById = async (id) => {
      if (id.toString() === testPlayer._id.toString()) return testPlayer;
      return null;
    };

    Player.findOne = async () => testPlayer;

    // Stub NpcPlayerRelation
    const relationsStore = new Map();
    NpcPlayerRelation.findOne = async ({ playerId, npcId }) => {
      const key = `${playerId}_${npcId}`;
      return relationsStore.get(key) || null;
    };

    NpcPlayerRelation.prototype.save = async function() {
      const key = `${this.playerId}_${this.npcId}`;
      relationsStore.set(key, this);
      return this;
    };

    Player.prototype.save = async function() {
      return this;
    };
  });

  it('GET /api/npc/profile/:npcId returns complete profile and initial neutral affinity', async () => {
    const res = await request(app)
      .get(`/api/npc/profile/${testNpc._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.npc.name).toBe(testNpc.name);
    expect(res.body.relation.affinity).toBe(0);
    expect(res.body.relation.affinityStage).toBe('neutral');
  });

  it('POST /api/npc/action/:npcId with chat increases affinity and enforces daily cap of 3', async () => {
    // Chat 1
    const res1 = await request(app)
      .post(`/api/npc/action/${testNpc._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'chat' });
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.newAffinity).toBeGreaterThan(0);

    // Chat 2
    const res2 = await request(app)
      .post(`/api/npc/action/${testNpc._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'chat' });
    expect(res2.status).toBe(200);

    // Chat 3
    const res3 = await request(app)
      .post(`/api/npc/action/${testNpc._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'chat' });
    expect(res3.status).toBe(200);

    // Chat 4 (Cap Reached)
    const res4 = await request(app)
      .post(`/api/npc/action/${testNpc._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'chat' });
    expect(res4.status).toBe(400);
    expect(res4.body.message).toContain('Batas obrolan harian tercapai');
  });

  it('POST /api/npc/action/:npcId with bribe deducts copper and checks personality reaction', async () => {
    const initialTotalCopper = getTotalCopper(testPlayer.currency);

    // Bribe pragmatic NPC
    const res = await request(app)
      .post(`/api/npc/action/${testNpc._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'bribe', payload: { amount: 100 } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getTotalCopper(testPlayer.currency)).toBe(initialTotalCopper - 100);
    expect(res.body.message).toContain('senyum puas');

    // Bribe righteous NPC -> anger!
    const resRighteous = await request(app)
      .post(`/api/npc/action/${righteousNpc._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'bribe', payload: { amount: 100 } });

    expect(resRighteous.status).toBe(200);
    expect(resRighteous.body.message).toContain('menepis koin Anda dengan geram');
    expect(resRighteous.body.deltaAffinity).toBe(-10);
  });

  it('POST /api/npc/action/:npcId with confess/propose fails if affinity is below threshold', async () => {
    // Propose to righteous NPC (affinity is negative or 0)
    const res = await request(app)
      .post(`/api/npc/action/${righteousNpc._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'propose' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Afinitas belum mencukupi untuk ikatan Pasangan Dao');
  });

  it('POST /api/npc/action/:npcId with steal triggers caught and increases player wantedLevel', async () => {
    // Force fail steal by using high NPC insight
    righteousNpc.attributes.insight = 999;
    testPlayer.attributes = { agility: 1 };

    const initialWanted = testPlayer.wantedLevel;

    const res = await request(app)
      .post(`/api/npc/action/${righteousNpc._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'steal' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Tertangkap basah');
    expect(testPlayer.wantedLevel).toBe(initialWanted + 1);
  });
});
