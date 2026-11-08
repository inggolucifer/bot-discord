import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Npc from '../../models/Npc.js';
import Player from '../../models/Player.js';
import PlayerBuilding from '../../models/PlayerBuilding.js';
import nearbyRoutes from '../../web-api/routes/nearby.js';
import { NearbyBroadcaster } from '../../services/nearbyBroadcaster.js';
import { JWT_SECRET } from '../../web-api/utils/jwtSecret.js';
import { generateDeterministicNpc } from '../../services/npcGenerator.js';

describe('V27 Nearby Living NPC Streaming Suite', () => {
  let app;
  let authToken;
  let testPlayer;
  let liveNpc;
  let deadNpc;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/world/nearby', nearbyRoutes);

    const playerId = new mongoose.Types.ObjectId();
    testPlayer = new Player({
      _id: playerId,
      discordId: 'discord_player_nearby_1',
      characterName: 'Pengelana Langit',
      currentPosition: { x: 2050, y: 2650 },
      gridPosition: { tileX: 2050, tileY: 2650 }
    });

    authToken = jwt.sign(
      { id: playerId.toString(), userId: 'discord_player_nearby_1', discordId: 'discord_player_nearby_1' },
      JWT_SECRET
    );

    // Live NPC near player (2052, 2651)
    const liveDoc = generateDeterministicNpc({
      name: 'Li Bai',
      tileX: 2052,
      tileY: 2651
    }, 'seed_live_npc');
    liveNpc = new Npc(liveDoc);
    liveNpc._id = new mongoose.Types.ObjectId();

    // Dead NPC near player (2051, 2650)
    const deadDoc = generateDeterministicNpc({
      name: 'Mayat Pengembara',
      tileX: 2051,
      tileY: 2650
    }, 'seed_dead_npc');
    deadNpc = new Npc(deadDoc);
    deadNpc._id = new mongoose.Types.ObjectId();
    deadNpc.vitalStatus.isAlive = false;

    // Stub Mongoose
    PlayerBuilding.find = () => ({
      lean: async () => []
    });

    Player.findOne = () => ({
      select: () => ({
        lean: async () => testPlayer
      })
    });

    Player.find = () => ({
      select: () => ({
        lean: async () => []
      })
    });

    Npc.find = (filter) => ({
      select: () => ({
        lean: async () => {
          // If filter requires isAlive: true, return only liveNpc
          if (filter['vitalStatus.isAlive'] === true) {
            return [liveNpc.toObject()];
          }
          return [liveNpc.toObject(), deadNpc.toObject()];
        }
      })
    });
  });

  it('GET /api/world/nearby returns live NPCs and strictly excludes dead NPCs (Invariant I3)', async () => {
    const res = await request(app)
      .get('/api/world/nearby')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();

    const npcItems = res.body.items.filter(i => i.type === 'npc');
    expect(npcItems.length).toBeGreaterThanOrEqual(1);

    const foundLive = npcItems.find(i => i.name === 'Li Bai');
    expect(foundLive).toBeDefined();
    expect(foundLive.dist).toBeLessThanOrEqual(5);
    expect(foundLive.type).toBe('npc');

    // INVARIANT I3: Dead NPC must NEVER appear in nearby radar
    const foundDead = npcItems.find(i => i.name === 'Mayat Pengembara');
    expect(foundDead).toBeUndefined();
  });

  it('NearbyBroadcaster tracks living NPC movement and emits nearby_delta', () => {
    const broadcaster = new NearbyBroadcaster();
    const cx = 64;
    const cy = 82;

    broadcaster.addSubscriber('socket_test_1', cx, cy);

    broadcaster.updateEntity({
      id: `npc_${liveNpc._id}`,
      type: 'npc',
      name: liveNpc.name,
      x: 2054,
      y: 2652,
      status: 'Bekerja di Kedai'
    }, cx, cy);

    let emittedRoom = null;
    let emittedEvent = null;
    let emittedPayload = null;

    const mockIo = {
      to: (room) => {
        emittedRoom = room;
        return {
          emit: (event, payload) => {
            emittedEvent = event;
            emittedPayload = payload;
          }
        };
      }
    };

    broadcaster.flushBatch(mockIo);

    expect(emittedRoom).toBe(`chunk:${cx}:${cy}`);
    expect(emittedEvent).toBe('nearby_delta');
    expect(emittedPayload).toBeDefined();
    expect(emittedPayload.entered).toBeDefined();
    expect(emittedPayload.entered.length).toBe(1);
    expect(emittedPayload.entered[0].id).toBe(`npc_${liveNpc._id}`);
  });
});
