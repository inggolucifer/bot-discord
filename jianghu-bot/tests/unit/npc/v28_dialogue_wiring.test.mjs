import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Npc from '../../../models/Npc.js';
import Player from '../../../models/Player.js';
import NpcPlayerRelation from '../../../models/NpcPlayerRelation.js';
import npcInteractionRoutes from '../../../web-api/routes/npcInteraction.js';
import { generateDialogueLine } from '../../../services/npcDialogueEngine.js';
import { JWT_SECRET } from '../../../web-api/utils/jwtSecret.js';

describe('Dynamic Dialogue Wiring to Server & Client (V28 / A6)', () => {
  it('generateDialogueLine returns polite gratitude dialogue for gift context on righteous NPC', () => {
    const npc = {
      name: 'Tetua Song',
      personality: { primary: 'righteous' }
    };
    const player = { characterName: 'Pendekar Hero' };
    const relation = { affinity: 25 };

    const line = generateDialogueLine({
      npc,
      player,
      relation,
      actionContext: 'gift'
    });

    expect(line.speakerName).toBe('Tetua Song');
    expect(line.text).toMatch(/terima kasih|hadiah|luar biasa/i);
    expect(Array.isArray(line.choices)).toBe(true);
    expect(line.choices.length).toBeGreaterThanOrEqual(2);
  });

  it('generateDialogueLine returns defiant resistance dialogue for threaten_resist context', () => {
    const npc = {
      name: 'Pendekar Li',
      personality: { primary: 'righteous' }
    };
    const player = { characterName: 'Pendekar Jahat' };
    const relation = { affinity: -10 };

    const line = generateDialogueLine({
      npc,
      player,
      relation,
      actionContext: 'threaten_resist'
    });

    expect(line.speakerName).toBe('Pendekar Li');
    expect(line.text).toMatch(/mengancam|lawan|pedang|membeku/i);
  });

  describe('GET /profile/:npcId Dialogue Integration', () => {
    let app;
    let testPlayer;
    let testNpc;
    let authToken;

    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use('/api/npc', npcInteractionRoutes);

      const playerId = new mongoose.Types.ObjectId();
      testPlayer = new Player({
        _id: playerId,
        discordId: 'test_player_snowflake_99',
        characterName: 'Pendekar Angin'
      });

      authToken = jwt.sign(
        { id: playerId.toString(), discordId: 'test_player_snowflake_99' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      testNpc = new Npc({
        _id: new mongoose.Types.ObjectId(),
        name: 'Bibi Lan',
        greeting: 'Selamat datang di kedai sederhana kami, Rekan Dao.',
        personality: { primary: 'righteous' }
      });

      Npc.findById = async (id) => (id.toString() === testNpc._id.toString() ? testNpc : null);
      Player.findById = async (id) => (id.toString() === testPlayer._id.toString() ? testPlayer : null);
      Player.findOne = async () => testPlayer;

      const relationsStore = new Map();
      NpcPlayerRelation.findOne = async ({ playerId, npcId }) => {
        const key = `${playerId}_${npcId}`;
        return relationsStore.get(key) || null;
      };
      NpcPlayerRelation.prototype.save = async function() {
        relationsStore.set(`${this.playerId}_${this.npcId}`, this);
        return this;
      };
    });

    it('GET /profile/:npcId returns greetingDialogue with at least 2 valid action choices', async () => {
      const res = await request(app)
        .get(`/api/npc/profile/${testNpc._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.greetingDialogue).toBeDefined();
      expect(res.body.greetingDialogue.speakerName).toBe('Bibi Lan');
      expect(res.body.greetingDialogue.text).toBeDefined();
      expect(Array.isArray(res.body.greetingDialogue.choices)).toBe(true);
      expect(res.body.greetingDialogue.choices.length).toBeGreaterThanOrEqual(2);
      expect(res.body.greetingDialogue.choices.every(c => c.id && c.label && c.action)).toBe(true);
    });
  });
});
