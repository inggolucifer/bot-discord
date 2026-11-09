const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Player = require('../../models/Player');
const Npc = require('../../models/Npc');
const NpcAmbush = require('../../models/NpcAmbush');
const NpcVendetta = require('../../models/NpcVendetta');
const NpcPlayerRelation = require('../../models/NpcPlayerRelation');
const { runVendettaTick } = require('../../services/npcVendettaEngine');

describe('NPC Hunt & Hostile Ambush Integration Tests (H2)', () => {
  let mongoServer;
  let dummyAnchors;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    dummyAnchors = [
      { id: 'desa_damai', name: 'Desa Damai', type: 'village', x: 2000, y: 2000, v20: { exclusionRadius: 10 } }
    ];
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Player.deleteMany({});
    await Npc.deleteMany({});
    await NpcAmbush.deleteMany({});
    await NpcVendetta.deleteMany({});
    await NpcPlayerRelation.deleteMany({});
  });

  it('1. Online player with hunter 100 tiles away: after 1 tick hunter moves closer and state is hunting', async () => {
    const now = Date.now();
    const player = await Player.create({
      discordId: 'player_online_1',
      characterName: 'Pendekar Satu',
      gridPosition: { tileX: 100, tileY: 100 },
      updatedAt: new Date(now)
    });

    const hunter = await Npc.create({
      name: 'Pemburu Dendam Satu',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
      schedule: { tileX: 200, tileY: 100, activityState: 'idle' }
    });

    await NpcVendetta.create({
      targetId: player._id,
      targetType: 'player',
      hunterNpcId: hunter._id,
      reason: 'Kematian kerabat',
      resolved: false
    });

    await runVendettaTick({ now, anchors: dummyAnchors, isWalkableFn: () => true });

    const updatedHunter = await Npc.findById(hunter._id);
    expect(updatedHunter.tileX).toBeLessThan(200);
    expect(updatedHunter.schedule.activityState).toBe('hunting');
  });

  it('2. Hunter within 24 tiles triggers NpcAmbush with kind vendetta', async () => {
    const now = Date.now();
    const player = await Player.create({
      discordId: 'player_online_2',
      characterName: 'Pendekar Dua',
      gridPosition: { tileX: 100, tileY: 100 },
      updatedAt: new Date(now)
    });

    const hunter = await Npc.create({
      name: 'Pemburu Dendam Dua',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
      schedule: { tileX: 120, tileY: 100, activityState: 'hunting' } // dist = 20 <= 24
    });

    await NpcVendetta.create({
      targetId: player._id,
      targetType: 'player',
      hunterNpcId: hunter._id,
      reason: 'Kematian kerabat',
      resolved: false
    });

    // Mock RNG to guarantee ambush trigger (chance = 1.0)
    const alwaysPassRng = () => 0.01;
    await runVendettaTick({ now, anchors: dummyAnchors, isWalkableFn: () => true, rng: alwaysPassRng });

    const ambush = await NpcAmbush.findOne({ targetPlayerId: player._id });
    expect(ambush).not.toBeNull();
    expect(ambush.kind).toBe('vendetta');
    expect(ambush.hunterNpcId.toString()).toBe(hunter._id.toString());
  });

  it('3. Player inside settlement exclusion: no ambush is triggered and hunter does not enter', async () => {
    const now = Date.now();
    // Inside desa_damai (2000, 2000) exclusion radius 10
    const player = await Player.create({
      discordId: 'player_inside_city',
      characterName: 'Pendekar Kota',
      gridPosition: { tileX: 2000, tileY: 2000 },
      updatedAt: new Date(now)
    });

    const hunter = await Npc.create({
      name: 'Pemburu Diluar',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
      schedule: { tileX: 2025, tileY: 2000, activityState: 'hunting' }
    });

    await NpcVendetta.create({
      targetId: player._id,
      targetType: 'player',
      hunterNpcId: hunter._id,
      reason: 'Kematian kerabat',
      resolved: false
    });

    const alwaysPassRng = () => 0.01;
    await runVendettaTick({ now, anchors: dummyAnchors, isWalkableFn: () => true, rng: alwaysPassRng });

    const ambush = await NpcAmbush.findOne({ targetPlayerId: player._id });
    expect(ambush).toBeNull();
  });

  it('4. Hostile ambush: affinity -80 within 12 tiles creates kind hostile, cooldown 6 hours blocks 2nd tick', async () => {
    const now = Date.now();
    const player = await Player.create({
      discordId: 'player_hostile_1',
      characterName: 'Pendekar Musuh',
      gridPosition: { tileX: 100, tileY: 100 },
      updatedAt: new Date(now)
    });

    const hostileNpc = await Npc.create({
      name: 'Musuh Bebuyutan',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
      schedule: { tileX: 108, tileY: 100, activityState: 'idle' } // dist = 8 <= 12
    });

    const relation = await NpcPlayerRelation.create({
      playerId: player._id,
      npcId: hostileNpc._id,
      affinity: -80,
      lastAmbushAt: null
    });

    const alwaysPassRng = () => 0.01;
    await runVendettaTick({ now, anchors: dummyAnchors, isWalkableFn: () => true, rng: alwaysPassRng });

    const ambush = await NpcAmbush.findOne({ targetPlayerId: player._id, hunterNpcId: hostileNpc._id });
    expect(ambush).not.toBeNull();
    expect(ambush.kind).toBe('hostile');
    expect(ambush.reason).toBe('benci');

    const updatedRel = await NpcPlayerRelation.findById(relation._id);
    expect(updatedRel.lastAmbushAt).not.toBeNull();

    // Second tick within 6 hours (e.g. 1 hour later) must NOT create another ambush
    await NpcAmbush.deleteMany({}); // Clear pending to test cooldown specifically
    await runVendettaTick({ now: now + 3600000, anchors: dummyAnchors, isWalkableFn: () => true, rng: alwaysPassRng });
    const secondAmbush = await NpcAmbush.findOne({ targetPlayerId: player._id, hunterNpcId: hostileNpc._id });
    expect(secondAmbush).toBeNull();
  });

  it('5. Affinity -30 (> -60) never triggers hostile ambush', async () => {
    const now = Date.now();
    const player = await Player.create({
      discordId: 'player_hostile_2',
      characterName: 'Pendekar Netral',
      gridPosition: { tileX: 100, tileY: 100 },
      updatedAt: new Date(now)
    });

    const npc = await Npc.create({
      name: 'NPC Sedikit Benci',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
      schedule: { tileX: 105, tileY: 100, activityState: 'idle' }
    });

    await NpcPlayerRelation.create({
      playerId: player._id,
      npcId: npc._id,
      affinity: -30
    });

    const alwaysPassRng = () => 0.01;
    await runVendettaTick({ now, anchors: dummyAnchors, isWalkableFn: () => true, rng: alwaysPassRng });

    const ambush = await NpcAmbush.findOne({ targetPlayerId: player._id });
    expect(ambush).toBeNull();
  });

  it('6. Essential NPCs never trigger hostile ambush', async () => {
    const now = Date.now();
    const player = await Player.create({
      discordId: 'player_hostile_3',
      characterName: 'Pendekar Lawan Esensial',
      gridPosition: { tileX: 100, tileY: 100 },
      updatedAt: new Date(now)
    });

    const essentialNpc = await Npc.create({
      name: 'Tetua Esensial Benci',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: true, isInjured: false },
      schedule: { tileX: 105, tileY: 100, activityState: 'idle' }
    });

    await NpcPlayerRelation.create({
      playerId: player._id,
      npcId: essentialNpc._id,
      affinity: -90
    });

    const alwaysPassRng = () => 0.01;
    await runVendettaTick({ now, anchors: dummyAnchors, isWalkableFn: () => true, rng: alwaysPassRng });

    const ambush = await NpcAmbush.findOne({ targetPlayerId: player._id });
    expect(ambush).toBeNull();
  });

  it('7. Offline player (updatedAt > 10 minutes) is never ambushed', async () => {
    const now = Date.now();
    const offlinePlayer = await Player.create({
      discordId: 'player_offline',
      characterName: 'Pendekar Tidur',
      gridPosition: { tileX: 100, tileY: 100 }
    });
    await Player.updateOne({ _id: offlinePlayer._id }, { $set: { updatedAt: new Date(now - 15 * 60 * 1000) } }, { timestamps: false });

    const hunter = await Npc.create({
      name: 'Pemburu Cari Yang Offline',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
      schedule: { tileX: 110, tileY: 100, activityState: 'hunting' }
    });

    await NpcVendetta.create({
      targetId: offlinePlayer._id,
      targetType: 'player',
      hunterNpcId: hunter._id,
      reason: 'Kematian kerabat',
      resolved: false
    });

    const alwaysPassRng = () => 0.01;
    await runVendettaTick({ now, anchors: dummyAnchors, isWalkableFn: () => true, rng: alwaysPassRng });

    const ambush = await NpcAmbush.findOne({ targetPlayerId: offlinePlayer._id });
    expect(ambush).toBeNull();
  });
});
