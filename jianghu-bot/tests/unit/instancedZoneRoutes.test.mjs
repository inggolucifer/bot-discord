import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const { JWT_SECRET } = require('../../web-api/utils/jwtSecret');
const testToken = jwt.sign(
  { id: 'test_player_001', userId: 'test_player_001', discordId: 'test_player_001', username: 'PendekarTest' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// Mock Player model
const mockPlayer = {
  _id: 'test_player_001',
  discordId: 'test_player_001',
  characterName: 'PendekarTest',
  currentHp: 1000,
  maxHp: 1000,
  save: vi.fn().mockResolvedValue(true)
};

const Player = require('../../models/Player');
vi.spyOn(Player, 'findOne').mockResolvedValue(mockPlayer);

const instancedZoneRoutes = require('../../web-api/routes/instancedZones.js');

const app = express();
app.use(express.json());
app.use('/api/instanced-zones', instancedZoneRoutes);

describe('Instanced Zone Routes (V24 H6)', () => {
  it('1. GET /session returns null when no active session', async () => {
    const res = await request(app)
      .get('/api/instanced-zones/session')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session).toBeNull();
  });

  it('2. POST /enter rejects when missing zoneId', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('zoneId wajib');
  });

  it('3. POST /enter rejects invalid zoneType', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        zoneId: 'z_test',
        zoneType: 'invalid_type'
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('tidak valid');
  });

  it('4. POST /enter initializes a spirit_valley session with 9 rooms', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        zoneId: 'zone_sv_test',
        zoneType: 'spirit_valley',
        dangerTier: 3
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.type).toBe('spirit_valley');
    expect(res.body.session.rooms.length).toBe(9);
    expect(res.body.session.currentRoomIndex).toBe(0);
  });

  it('5. GET /session now returns the active spirit_valley session', async () => {
    const res = await request(app)
      .get('/api/instanced-zones/session')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body.session).not.toBeNull();
    expect(res.body.session.type).toBe('spirit_valley');
  });

  it('6. POST /step rejects when missing action parameter', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/step')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Aksi wajib');
  });

  it('7. POST /step executes disarm_trap on current room', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/step')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        action: 'disarm_trap'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stepResult.ok).toBe(true);
  });

  it('8. POST /step executes clear_room and increments room index', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/step')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        action: 'clear_room'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.currentRoomIndex).toBe(1);
  });

  it('9. POST /claim rejects when session is not yet completed', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/claim')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('belum selesai');
  });

  it('10. Progressing through all remaining rooms marks session as completed', async () => {
    for (let r = 1; r < 8; r++) {
      await request(app)
        .post('/api/instanced-zones/step')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ action: 'clear_room' });
    }
    const finalStep = await request(app)
      .post('/api/instanced-zones/step')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ action: 'clear_room' });
    expect(finalStep.body.session.status).toBe('completed');
  });

  it('11. POST /claim successfully awards rewards and clears session upon completion', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/claim')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rewards.length).toBeGreaterThan(0);

    // Session is now cleared
    const checkRes = await request(app)
      .get('/api/instanced-zones/session')
      .set('Authorization', `Bearer ${testToken}`);
    expect(checkRes.body.session).toBeNull();
  });

  it('12. POST /enter initializes a defense_circle session with 5 waves', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        zoneId: 'zone_dc_test',
        zoneType: 'defense_circle',
        dangerTier: 2
      });
    expect(res.status).toBe(200);
    expect(res.body.session.type).toBe('defense_circle');
    expect(res.body.session.waves.length).toBe(5);
    expect(res.body.session.currentWave).toBe(1);
  });

  it('13. POST /enter initializes an elemental_land session with shards loot', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        zoneId: 'zone_el_test',
        zoneType: 'elemental_land',
        element: 'fire',
        dangerTier: 3
      });
    expect(res.status).toBe(200);
    expect(res.body.session.type).toBe('elemental_land');
    expect(res.body.session.element).toBe('fire');
    expect(res.body.session.rewards.quantity).toBeGreaterThan(0);
    expect(res.body.session.rewards.shardKey).toBeDefined();
  });
});
