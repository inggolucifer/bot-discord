import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// In-memory mock store for InstancedZoneSession
let mockSessionStore = [];

const InstancedZoneSession = require('../../models/InstancedZoneSession');

InstancedZoneSession.prototype.save = vi.fn().mockImplementation(async function () {
  const existingIdx = mockSessionStore.findIndex(s => String(s._id) === String(this._id));
  if (existingIdx >= 0) {
    mockSessionStore[existingIdx] = this;
  } else {
    mockSessionStore.push(this);
  }
  return this;
});

vi.spyOn(InstancedZoneSession, 'findOne').mockImplementation((query = {}) => {
  return {
    sort: () => {
      let matches = mockSessionStore.filter(s => {
        if (query.playerId && String(s.playerId) !== String(query.playerId)) return false;
        if (query.status) {
          if (typeof query.status === 'string' && s.status !== query.status) return false;
          if (query.status.$in && !query.status.$in.includes(s.status)) return false;
        }
        if (query.zoneId && s.zoneId !== query.zoneId) return false;
        return true;
      });
      const match = matches[matches.length - 1] || null;
      return Promise.resolve(match);
    },
    then(resolve) {
      return this.sort().then(resolve);
    }
  };
});

// Mock Player
let mockPlayer = {
  _id: 'test_player_001',
  discordId: 'test_player_001',
  characterName: 'PendekarTest',
  realmIndex: 5,
  currentHp: 1000,
  maxHp: 1000,
  stamina: 100,
  silver: 10000,
  spiritStones: 10000,
  inventory: [
    { itemId: 'item_spirit_key', quantity: 5 },
    { itemId: 'spirit_fruit', quantity: 5 }
  ],
  currentPosition: { x: 3423, y: 4949 },
  isTraveling: false,
  activeBattleId: null,
  save: vi.fn().mockResolvedValue(true)
};

const Player = require('../../models/Player');
vi.spyOn(Player, 'findOne').mockImplementation(() => Promise.resolve(mockPlayer));

const instancedZoneRoutes = require('../../web-api/routes/instancedZones.js');

const app = express();
app.use(express.json());
app.use('/api/instanced-zones', instancedZoneRoutes);

describe('V25 K2 — Hardened Instanced Zone Routes (24 Tests)', () => {
  beforeEach(() => {
    mockSessionStore = [];
    mockPlayer = {
      _id: 'test_player_001',
      discordId: 'test_player_001',
      characterName: 'PendekarTest',
      realmIndex: 5,
      currentHp: 1000,
      maxHp: 1000,
      stamina: 100,
      silver: 10000,
      spiritStones: 10000,
      inventory: [
        { itemId: 'item_spirit_key', quantity: 5 },
        { itemId: 'spirit_fruit', quantity: 5 }
      ],
      currentPosition: { x: 3423, y: 4949 }, // Right at spirit_valley_godthunder_peaks_1
      isTraveling: false,
      activeBattleId: null,
      save: vi.fn().mockResolvedValue(true)
    };
  });

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
    expect(res.body.error).toContain('zoneId wajib');
  });

  it('3. POST /enter rejects unknown zoneId not in zones-v23.json', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'zone_non_existent_123' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('tidak ditemukan');
  });

  it('4. POST /enter rejects when player is too far (> 3 tiles)', async () => {
    mockPlayer.currentPosition = { x: 100, y: 100 }; // Spirit valley is at 3423, 4949
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Terlalu jauh');
  });

  it('5. POST /enter rejects when player is traveling', async () => {
    mockPlayer.isTraveling = true;
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('perjalanan');
  });

  it('6. POST /enter rejects when player is in active battle', async () => {
    mockPlayer.activeBattleId = 'battle_123';
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('pertarungan');
  });

  it('7. POST /enter rejects when player realm is too low', async () => {
    mockPlayer.realmIndex = 0; // Tier 5 requires realmIndex >= 2
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ranah');
  });

  it('8. POST /enter rejects when player lacks entryCost item (spirit key)', async () => {
    mockPlayer.inventory = [];
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('kunci');
  });

  it('9. POST /enter rejects when stamina is insufficient', async () => {
    mockPlayer.stamina = 2; // Needs 10
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Stamina');
  });

  it('10. POST /enter successfully enters spirit_valley, deducts key & stamina, creates persistent session', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.zoneType).toBe('spirit_valley');
    expect(res.body.session.dangerTier).toBe(5);
    expect(res.body.session.rooms.length).toBe(9);
    expect(mockPlayer.stamina).toBe(90); // 100 - 10
    expect(mockPlayer.inventory.find(i => i.itemId === 'item_spirit_key').quantity).toBe(4); // 5 - 1
    expect(mockSessionStore.length).toBe(1);
  });

  it('11. POST /enter ignores client attempts to override dangerTier or zoneType', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        zoneId: 'spirit_valley_godthunder_peaks_1',
        dangerTier: 1, // Malicious client attempt to lower tier
        zoneType: 'defense_circle'
      });

    expect(res.status).toBe(200);
    expect(res.body.session.dangerTier).toBe(5); // Authoritative from file
    expect(res.body.session.zoneType).toBe('spirit_valley'); // Authoritative from file
  });

  it('12. POST /enter accepts inst_ prefix on zoneId', async () => {
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'inst_spirit_valley_godthunder_peaks_1' });

    expect(res.status).toBe(200);
    expect(res.body.session.zoneId).toBe('spirit_valley_godthunder_peaks_1');
  });

  it('13. POST /enter resumes active session if re-entering the same zone', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    const second = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    expect(second.status).toBe(200);
    expect(second.body.message).toContain('Melanjutkan');
    expect(mockSessionStore.length).toBe(1); // No duplicate session created
  });

  it('14. POST /enter rejects entering different zone while current one is active', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    mockPlayer.currentPosition = { x: 3395, y: 4927 }; // At defense circle
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'defense_circle_godthunder_peaks_1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('masih memiliki ekspedisi aktif');
  });

  it('15. GET /session returns the active session from database', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    const res = await request(app)
      .get('/api/instanced-zones/session')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.session).not.toBeNull();
    expect(res.body.session.zoneType).toBe('spirit_valley');
  });

  it('16. POST /step rejects when missing action parameter', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    const res = await request(app)
      .post('/api/instanced-zones/step')
      .set('Authorization', `Bearer ${testToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Aksi wajib');
  });

  it('17. POST /step executes disarm_trap and updates database session', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    const res = await request(app)
      .post('/api/instanced-zones/step')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ action: 'disarm_trap' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stepResult.ok).toBe(true);
  });

  it('18. POST /step executes clear_room and increments room index', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    const res = await request(app)
      .post('/api/instanced-zones/step')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ action: 'clear_room' });

    expect(res.status).toBe(200);
    expect(res.body.session.currentRoomIndex).toBe(1);
  });

  it('19. POST /step deals trap damage to player HP without falling below 1', async () => {
    mockPlayer.currentHp = 10;
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    // Force room 0 to have trap
    mockSessionStore[0].sessionData.rooms[0].hasTrap = true;
    mockSessionStore[0].sessionData.rooms[0].trapTriggered = false;

    const res = await request(app)
      .post('/api/instanced-zones/step')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ action: 'trigger_trap', options: { playerMaxHp: 1000 } });

    expect(res.status).toBe(200);
    expect(mockPlayer.currentHp).toBeGreaterThanOrEqual(1);
  });

  it('20. POST /claim rejects when session is not completed', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    const res = await request(app)
      .post('/api/instanced-zones/claim')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('belum selesai');
  });

  it('21. Progressing through all 9 rooms marks session completed and allows claiming', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    for (let r = 0; r < 9; r++) {
      await request(app)
        .post('/api/instanced-zones/step')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ action: 'clear_room' });
    }

    const claimRes = await request(app)
      .post('/api/instanced-zones/claim')
      .set('Authorization', `Bearer ${testToken}`);

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
    expect(claimRes.body.rewards.length).toBeGreaterThan(0);
    expect(mockSessionStore[0].status).toBe('claimed');
  });

  it('22. POST /claim is idempotent (returns 409 if claimed again)', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    for (let r = 0; r < 9; r++) {
      await request(app)
        .post('/api/instanced-zones/step')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ action: 'clear_room' });
    }

    const claim1 = await request(app)
      .post('/api/instanced-zones/claim')
      .set('Authorization', `Bearer ${testToken}`);
    expect(claim1.status).toBe(200);

    const claim2 = await request(app)
      .post('/api/instanced-zones/claim')
      .set('Authorization', `Bearer ${testToken}`);
    expect(claim2.status).toBe(409);
    expect(claim2.body.error).toContain('sudah diklaim');
  });

  it('23. POST /enter initializes defense_circle with survival waves', async () => {
    mockPlayer.currentPosition = { x: 3395, y: 4927 };
    const res = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'defense_circle_godthunder_peaks_1' });

    expect(res.status).toBe(200);
    expect(res.body.session.zoneType).toBe('defense_circle');
    expect(res.body.session.waves.length).toBe(5);
  });

  it('24. POST /abandon cancels the active session allowing a new one', async () => {
    await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'spirit_valley_godthunder_peaks_1' });

    const abRes = await request(app)
      .post('/api/instanced-zones/abandon')
      .set('Authorization', `Bearer ${testToken}`);

    expect(abRes.status).toBe(200);
    expect(mockSessionStore[0].status).toBe('abandoned');

    // Can now enter another zone without conflict
    mockPlayer.currentPosition = { x: 3395, y: 4927 };
    const newEnter = await request(app)
      .post('/api/instanced-zones/enter')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ zoneId: 'defense_circle_godthunder_peaks_1' });

    expect(newEnter.status).toBe(200);
  });
});
