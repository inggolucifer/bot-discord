const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Npc = require('../../models/Npc');
const Player = require('../../models/Player');
const NpcVendetta = require('../../models/NpcVendetta');
const NpcAmbush = require('../../models/NpcAmbush');
const { runVendettaTick } = require('../../services/npcVendettaEngine');
const { runJourneyTick } = require('../../services/npcJourneyTick');

describe('NPC Hunter vs Scheduled Journey Conflict Integration (V31 F3)', () => {
  let mongoServer;

  const dummyAnchorMap = {
    desa_a: { id: 'desa_a', name: 'Desa A', regionSlug: 'reg_1', type: 'village', x: 50, y: 50, tileX: 50, tileY: 50 },
    desa_b: { id: 'desa_b', name: 'Desa B', regionSlug: 'reg_1', type: 'town', x: 500, y: 500, tileX: 500, tileY: 500 }
  };

  const dummyAnchors = [
    { id: 'desa_a', name: 'Desa A', type: 'village', x: 50, y: 50, tileX: 50, tileY: 50, v20: { exclusionRadius: 10 } },
    { id: 'desa_b', name: 'Desa B', type: 'town', x: 500, y: 500, tileX: 500, tileY: 500, v20: { exclusionRadius: 10 } }
  ];

  const dummyGraph = {
    shortestPath(from, to) {
      return { path: [from, to], totalLi: 20 };
    }
  };

  const isWalkableFn = () => true;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Npc.deleteMany({});
    await Player.deleteMany({});
    await NpcVendetta.deleteMany({});
    await NpcAmbush.deleteMany({});
  });

  it('(a) Hunter traveling on a journey cancels journey upon hunting; runJourneyTick does not overwrite coordinates', async () => {
    const now = 50000000;

    const player = await Player.create({
      discordId: 'player_target_1',
      characterName: 'Pendekar Target',
      gridPosition: { tileX: 100, tileY: 100 },
      updatedAt: new Date(now)
    });

    const hunter = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
      name: 'Pemburu Berjalan',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 2 },
      tileX: 200,
      tileY: 100,
      schedule: {
        tileX: 200,
        tileY: 100,
        currentAnchorId: 'desa_a',
        homeAnchorId: 'desa_a',
        wanderLevel: 2,
        activityState: 'traveling',
        targetDestination: {
          type: 'journey',
          fromId: 'desa_a',
          toId: 'desa_b',
          purpose: 'berkelana',
          startedAt: now - 10000,
          etaAt: now + 500000,
          totalTiles: 100,
          legs: [
            { ax: 200, ay: 100, bx: 250, by: 100, len: 50 }
          ]
        }
      },
      attributes: { travelSpeed: 10 }
    });

    const vendetta = await NpcVendetta.create({
      hunterNpcId: hunter._id,
      targetId: player._id,
      targetType: 'player',
      reason: 'Dendam masa lalu',
      resolved: false
    });

    // 1. Run vendetta tick: hunter detects player and stalks closer
    await runVendettaTick({
      now,
      anchors: dummyAnchors,
      isWalkableFn
    });

    let updatedHunter = await Npc.findById(hunter._id);
    expect(updatedHunter.schedule.activityState).toBe('hunting');
    expect(updatedHunter.schedule.targetDestination).toBeNull();
    const huntedX = updatedHunter.tileX;
    // Moved closer from 200 towards player at 100 (e.g. 160)
    expect(huntedX).toBeLessThan(200);

    // 2. Run journey tick immediately after: must NOT overwrite hunting state or coords back to old journey
    await runJourneyTick({
      Npc,
      now: now + 5000,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    updatedHunter = await Npc.findById(hunter._id);
    expect(updatedHunter.schedule.activityState).toBe('hunting');
    expect(updatedHunter.schedule.targetDestination).toBeNull();
    expect(updatedHunter.tileX).toBe(huntedX);
    expect(updatedHunter.schedule.tileX).toBe(huntedX);
  });

  it('(b) When vendetta is resolved, hunter becomes idle; if away from home, eventually returns via runJourneyTick', async () => {
    let now = 50000000;

    const player = await Player.create({
      discordId: 'player_target_2',
      characterName: 'Pendekar Damai',
      gridPosition: { tileX: 100, tileY: 100 },
      updatedAt: new Date(now)
    });

    const hunter = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439022'),
      name: 'Pemburu Insaf',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 2 },
      tileX: 200,
      tileY: 100,
      schedule: {
        tileX: 200,
        tileY: 100,
        currentAnchorId: 'desa_b', // Far from home
        homeAnchorId: 'desa_a',
        wanderLevel: 1,
        activityState: 'hunting',
        targetDestination: null,
        stayUntil: null
      },
      attributes: { travelSpeed: 10 }
    });

    const vendetta = await NpcVendetta.create({
      hunterNpcId: hunter._id,
      targetId: player._id,
      targetType: 'player',
      reason: 'Dendam selesai',
      resolved: true // Already resolved
    });

    // 1. Run vendetta tick: hunter stops hunting, resets to idle, and gets stayUntil = now because away from home
    await runVendettaTick({
      now,
      anchors: dummyAnchors,
      isWalkableFn
    });

    let updatedHunter = await Npc.findById(hunter._id);
    expect(updatedHunter.schedule.activityState).toBe('idle');
    expect(updatedHunter.schedule.stayUntil).not.toBeNull();

    // 2. Advance time and run journey tick: hunter starts journey home
    now += 1000;
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    updatedHunter = await Npc.findById(hunter._id);
    expect(updatedHunter.schedule.activityState).toBe('traveling');
    expect(updatedHunter.schedule.targetDestination).not.toBeNull();
    expect(updatedHunter.schedule.targetDestination.toId).toBe('desa_a');
    expect(updatedHunter.schedule.targetDestination.purpose).toBe('pulang');

    // 3. Arrive home
    now = updatedHunter.schedule.targetDestination.etaAt + 1000;
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    updatedHunter = await Npc.findById(hunter._id);
    expect(updatedHunter.schedule.currentAnchorId).toBe('desa_a');
    expect(updatedHunter.schedule.activityState).toBe('idle');
    expect(updatedHunter.schedule.stayUntil).toBeNull();
  });

  it('(c) Hunter resets to idle when online target player flees > 200 tiles away (lost trail)', async () => {
    const now = 50000000;
    const player = await Player.create({
      discordId: 'player_flee_far',
      characterName: 'Pendekar Kabur Jauh',
      gridPosition: { tileX: 600, tileY: 600 }
    });
    await Player.updateOne({ _id: player._id }, { $set: { updatedAt: new Date(now) } }, { timestamps: false });

    const hunter = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439023'),
      name: 'Pemburu Kehilangan Jejak',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false },
      tileX: 200,
      tileY: 100,
      schedule: {
        tileX: 200,
        tileY: 100,
        currentAnchorId: 'desa_b',
        homeAnchorId: 'desa_a',
        wanderLevel: 1,
        activityState: 'hunting',
        targetDestination: null,
        stayUntil: null
      }
    });

    await NpcVendetta.create({
      hunterNpcId: hunter._id,
      targetId: player._id,
      targetType: 'player',
      reason: 'Dendam kabur jauh',
      resolved: false
    });

    await runVendettaTick({
      now,
      anchors: dummyAnchors,
      isWalkableFn
    });

    const updated = await Npc.findById(hunter._id);
    expect(updated.schedule.activityState).toBe('idle');
    expect(updated.schedule.stayUntil).not.toBeNull();
  });

  it('(d) Non-wandering hunter (wanderLevel 0) displaced away returns home when player goes offline (>10 min)', async () => {
    let now = 50000000;
    const offlinePlayer = await Player.create({
      discordId: 'player_went_offline',
      characterName: 'Pendekar Offline',
      gridPosition: { tileX: 160, tileY: 100 }
    });
    await Player.updateOne(
      { _id: offlinePlayer._id },
      { $set: { updatedAt: new Date(now - 15 * 60 * 1000) } },
      { timestamps: false }
    );

    const residentHunter = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439024'),
      name: 'Penjaga Pendendam',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false },
      tileX: 200,
      tileY: 100,
      schedule: {
        tileX: 200,
        tileY: 100,
        currentAnchorId: 'desa_b',
        homeAnchorId: 'desa_a',
        wanderLevel: 0, // normally resident!
        activityState: 'hunting',
        targetDestination: null,
        stayUntil: null
      },
      attributes: { travelSpeed: 10 }
    });

    await NpcVendetta.create({
      hunterNpcId: residentHunter._id,
      targetId: offlinePlayer._id,
      targetType: 'player',
      reason: 'Dendam saat pemain offline',
      resolved: false
    });

    await runVendettaTick({ now, anchors: dummyAnchors, isWalkableFn });

    let checked = await Npc.findById(residentHunter._id);
    expect(checked.schedule.activityState).toBe('idle');
    expect(checked.schedule.stayUntil).not.toBeNull();

    // runJourneyTick must return wanderLevel=0 hunter back home
    now += 1000;
    await runJourneyTick({ Npc, now, anchorMap: dummyAnchorMap, graph: dummyGraph, isWalkableFn });

    checked = await Npc.findById(residentHunter._id);
    expect(checked.schedule.activityState).toBe('traveling');
    expect(checked.schedule.targetDestination.purpose).toBe('pulang');
    expect(checked.schedule.targetDestination.toId).toBe('desa_a');

    now = checked.schedule.targetDestination.etaAt + 1000;
    await runJourneyTick({ Npc, now, anchorMap: dummyAnchorMap, graph: dummyGraph, isWalkableFn });

    checked = await Npc.findById(residentHunter._id);
    expect(checked.schedule.currentAnchorId).toBe('desa_a');
    expect(checked.schedule.activityState).toBe('idle');
    expect(checked.schedule.stayUntil).toBeNull();
  });

  it('(e) Hunter displaced in wilderness (>30 tiles from homeAnchor while currentAnchorId === homeAnchorId) walks back home after vendetta resolved', async () => {
    let now = 50000000;
    const player = await Player.create({
      discordId: 'player_displaced_case',
      characterName: 'Pendekar Rimba',
      gridPosition: { tileX: 220, tileY: 220 }
    });
    await Player.updateOne({ _id: player._id }, { $set: { updatedAt: new Date(now) } }, { timestamps: false });

    // Home anchor desa_a is at (50, 50), hunter chased out to (200, 100) before arriving desa_b
    const displacedHunter = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439025'),
      name: 'Pemburu Tersesat',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false },
      tileX: 200,
      tileY: 100,
      schedule: {
        tileX: 200,
        tileY: 100,
        currentAnchorId: 'desa_a',
        homeAnchorId: 'desa_a',
        wanderLevel: 1,
        activityState: 'hunting',
        targetDestination: null,
        stayUntil: null
      },
      attributes: { travelSpeed: 10 }
    });

    await NpcVendetta.create({
      hunterNpcId: displacedHunter._id,
      targetId: player._id,
      targetType: 'player',
      reason: 'Dendam selesai di rimba',
      resolved: true
    });

    await runVendettaTick({ now, anchors: dummyAnchors, isWalkableFn });

    now += 1000;
    await runJourneyTick({ Npc, now, anchorMap: dummyAnchorMap, graph: dummyGraph, isWalkableFn });

    let checked = await Npc.findById(displacedHunter._id);
    expect(checked.schedule.activityState).toBe('traveling');
    expect(checked.schedule.targetDestination.purpose).toBe('pulang');
    expect(checked.schedule.targetDestination.toId).toBe('desa_a');

    now = checked.schedule.targetDestination.etaAt + 1000;
    await runJourneyTick({ Npc, now, anchorMap: dummyAnchorMap, graph: dummyGraph, isWalkableFn });

    checked = await Npc.findById(displacedHunter._id);
    expect(checked.tileX).toBe(50);
    expect(checked.tileY).toBe(50);
    expect(checked.schedule.activityState).toBe('idle');
    expect(checked.schedule.stayUntil).toBeNull();
  });
});
