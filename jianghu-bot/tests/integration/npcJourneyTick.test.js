const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Npc = require('../../models/Npc');
const { runJourneyTick } = require('../../services/npcJourneyTick');
const { runScheduleBatchTick } = require('../../services/npcScheduler');

describe('NPC Journey Tick Integration (M3)', () => {
  let mongoServer;

  const dummyAnchorMap = {
    desa_a: { id: 'desa_a', name: 'Desa A', regionSlug: 'reg_1', type: 'village', x: 100, y: 100, tileX: 100, tileY: 100 },
    desa_b: { id: 'desa_b', name: 'Desa B', regionSlug: 'reg_1', type: 'town', x: 200, y: 100, tileX: 200, tileY: 100 }
  };

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
  });

  it('1. NPC wanderLevel 2 at home starts a journey on eligible tick', async () => {
    const npc = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Pengelana Satu',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 1 },
      schedule: {
        currentAnchorId: 'desa_a',
        homeAnchorId: 'desa_a',
        wanderLevel: 2,
        lastJourneyDay: -1,
        activityState: 'idle',
        tileX: 100,
        tileY: 100
      },
      attributes: { travelSpeed: 10 }
    });

    // Run tick at a known timestamp
    const now = 36000000; // gameDay = 10
    const res = await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    const updated = await Npc.findById(npc._id);
    expect(updated.schedule.activityState).toBe('traveling');
    expect(updated.schedule.targetDestination).not.toBeNull();
    expect(updated.schedule.targetDestination.toId).toBe('desa_b');
    expect(updated.schedule.lastJourneyDay).toBe(10);
  });

  it('2. Halfway through journey, coordinates change and are between the two anchors', async () => {
    const now = 36000000;
    const destJourney = {
      type: 'journey',
      purpose: 'berkelana',
      fromId: 'desa_a',
      toId: 'desa_b',
      pathAnchors: ['desa_a', 'desa_b'],
      startedAt: now,
      etaAt: now + 600000,
      totalTiles: 100,
      legs: [{ ax: 100, ay: 100, bx: 200, by: 100, len: 100 }],
      stayMs: 1800000
    };
    const npc = await Npc.create({
      name: 'Pengelana Dua',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 1 },
      schedule: {
        currentAnchorId: 'desa_a',
        homeAnchorId: 'desa_a',
        wanderLevel: 2,
        lastJourneyDay: 10,
        activityState: 'traveling',
        targetDestination: destJourney,
        tileX: 100,
        tileY: 100
      },
      attributes: { travelSpeed: 10 }
    });

    // Advance now halfway
    const halfwayNow = now + 300000;
    await runJourneyTick({ Npc, now: halfwayNow, anchorMap: dummyAnchorMap, graph: dummyGraph, isWalkableFn });

    const halfway = await Npc.findById(npc._id);
    expect(halfway.tileX).toBeGreaterThan(100);
    expect(halfway.tileX).toBeLessThan(200);
    expect(halfway.schedule.activityState).toBe('traveling');
  });

  it('3. After etaAt, currentAnchorId is destination and activityState is visiting with stayUntil set', async () => {
    const now = 36000000;
    const destJourney = {
      type: 'journey',
      purpose: 'berkelana',
      fromId: 'desa_a',
      toId: 'desa_b',
      pathAnchors: ['desa_a', 'desa_b'],
      startedAt: now,
      etaAt: now + 600000,
      totalTiles: 100,
      legs: [{ ax: 100, ay: 100, bx: 200, by: 100, len: 100 }],
      stayMs: 1800000
    };
    const npc = await Npc.create({
      name: 'Pengelana Tiga',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 1 },
      schedule: {
        currentAnchorId: 'desa_a',
        homeAnchorId: 'desa_a',
        wanderLevel: 2,
        lastJourneyDay: 10,
        activityState: 'traveling',
        targetDestination: destJourney,
        tileX: 100,
        tileY: 100
      },
      attributes: { travelSpeed: 10 }
    });

    // Advance past etaAt
    await runJourneyTick({ Npc, now: destJourney.etaAt + 1000, anchorMap: dummyAnchorMap, graph: dummyGraph, isWalkableFn });

    const arrived = await Npc.findById(npc._id);
    expect(arrived.schedule.activityState).toBe('visiting');
    expect(arrived.schedule.currentAnchorId).toBe('desa_b');
    expect(arrived.schedule.targetDestination).toBeNull();
    expect(arrived.schedule.stayUntil).not.toBeNull();
  });

  it('4. After stayUntil expires, starts return journey home', async () => {
    const now = 36000000;
    const npc = await Npc.create({
      name: 'Pengelana Empat',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 1 },
      schedule: {
        currentAnchorId: 'desa_b',
        homeAnchorId: 'desa_a',
        wanderLevel: 2,
        lastJourneyDay: 10,
        activityState: 'visiting',
        stayUntil: new Date(now - 10000), // Expired
        tileX: 200,
        tileY: 100
      },
      attributes: { travelSpeed: 10 }
    });

    await runJourneyTick({ Npc, now, anchorMap: dummyAnchorMap, graph: dummyGraph, isWalkableFn });

    const returning = await Npc.findById(npc._id);
    expect(returning.schedule.activityState).toBe('traveling');
    expect(returning.schedule.targetDestination).not.toBeNull();
    expect(returning.schedule.targetDestination.purpose).toBe('pulang');
    expect(returning.schedule.targetDestination.toId).toBe('desa_a');
  });

  it('5. Essential NPCs NEVER start journey or change state', async () => {
    const now = 36000000;
    const essentialNpc = await Npc.create({
      name: 'Tetua Penting',
      vitalStatus: { isAlive: true, isEssential: true },
      cultivation: { realmIndex: 5 },
      schedule: {
        currentAnchorId: 'desa_a',
        homeAnchorId: 'desa_a',
        wanderLevel: 0,
        activityState: 'meditating',
        tileX: 100,
        tileY: 100
      }
    });

    await runJourneyTick({ Npc, now, anchorMap: dummyAnchorMap, graph: dummyGraph, isWalkableFn });

    const checked = await Npc.findById(essentialNpc._id);
    expect(checked.schedule.activityState).toBe('meditating');
    expect(checked.schedule.targetDestination).toBeNull();
  });

  it('6. runScheduleBatchTick does NOT overwrite traveling NPCs', async () => {
    const travelingNpc = await Npc.create({
      name: 'Pengelana Enam',
      vitalStatus: { isAlive: true, isEssential: false },
      schedule: {
        currentAnchorId: 'desa_a',
        homeAnchorId: 'desa_a',
        wanderLevel: 2,
        activityState: 'traveling',
        currentFacility: '',
        targetDestination: { type: 'journey', toId: 'desa_b' },
        tileX: 150,
        tileY: 100
      }
    });

    // Run batch schedule tick (5-min schedule system)
    await runScheduleBatchTick({ Npc, force: true });

    const checked = await Npc.findById(travelingNpc._id);
    expect(checked.schedule.activityState).toBe('traveling');
    expect(checked.schedule.targetDestination).not.toBeNull();
  });
});
