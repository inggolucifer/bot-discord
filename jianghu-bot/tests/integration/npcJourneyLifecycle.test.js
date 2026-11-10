const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Npc = require('../../models/Npc');
const { runJourneyTick } = require('../../services/npcJourneyTick');
const { runScheduleBatchTick } = require('../../services/npcTicker');

describe('NPC Journey Full Lifecycle Integration (V31 F1)', () => {
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

  it('Full lifecycle: depart -> travel mid-way protected -> arrive visiting -> stay protected from schedule -> return home -> idle -> depart 24h later', async () => {
    let now = 36000000; // t0 = 10 game hours

    // (a) Create NPC wanderLevel 2 at home (desa_a)
    const npc = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Pengelana Siklus',
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

    // 1. Depart from home
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    let current = await Npc.findById(npc._id);
    expect(current.schedule.activityState).toBe('traveling');
    expect(current.schedule.targetDestination).not.toBeNull();
    const journey = current.schedule.targetDestination;
    expect(journey.toId).toBe('desa_b');

    // (b) Mid-journey: runScheduleBatchTick does NOT overwrite traveling
    now += 60000; // +1 minute
    await runScheduleBatchTick({ Npc, now, isWalkableFn });
    current = await Npc.findById(npc._id);
    expect(current.schedule.activityState).toBe('traveling');

    // Advance mid-way with journey tick
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });
    current = await Npc.findById(npc._id);
    expect(current.schedule.activityState).toBe('traveling');

    // (c) Arrive at destination: time jumps to etaAt
    now = journey.etaAt + 1000;
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });
    current = await Npc.findById(npc._id);
    expect(current.schedule.currentAnchorId).toBe('desa_b');
    expect(current.schedule.activityState).toBe('visiting');
    expect(current.schedule.stayUntil).not.toBeNull();
    const stayUntilTime = new Date(current.schedule.stayUntil).getTime();
    expect(stayUntilTime).toBeGreaterThan(now);

    // (d) Run runScheduleBatchTick on 5-min intervals during stay: activityState remains visiting
    const fiveMinutes = 5 * 60 * 1000;
    for (let t = now + fiveMinutes; t < stayUntilTime - fiveMinutes; t += fiveMinutes) {
      await runScheduleBatchTick({ Npc, now: t, isWalkableFn });
      current = await Npc.findById(npc._id);
      expect(current.schedule.activityState).toBe('visiting');
    }

    // (e) Past stayUntil: NPC departs to return home
    now = stayUntilTime + 1000;
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });
    current = await Npc.findById(npc._id);
    expect(current.schedule.activityState).toBe('traveling');
    expect(current.schedule.targetDestination).not.toBeNull();
    const returnJourney = current.schedule.targetDestination;
    expect(returnJourney.toId).toBe('desa_a');
    expect(returnJourney.purpose).toBe('pulang');

    // (f) Arrive home
    now = returnJourney.etaAt + 1000;
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });
    current = await Npc.findById(npc._id);
    expect(current.schedule.currentAnchorId).toBe('desa_a');
    expect(current.schedule.homeAnchorId).toBe('desa_a');
    expect(current.schedule.activityState).toBe('idle');
    expect(current.schedule.stayUntil).toBeNull();
    expect(current.schedule.targetDestination).toBeNull();

    // (g) 24+ game hours later on Day 37 (deterministic roll 0.53 <= 0.75): eligible to travel again
    now = 37 * 3600 * 1000;
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });
    current = await Npc.findById(npc._id);
    expect(current.schedule.activityState).toBe('traveling');
    expect(current.schedule.targetDestination.toId).toBe('desa_b');
  });

  it('(h) Legacy NPC (away from home without stayUntil) receives stayUntil and eventually returns home', async () => {
    let now = 36000000;

    // Legacy NPC at desa_b (home is desa_a), activityState has been overwritten to working, no stayUntil
    const legacyNpc = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Pengelana Macet',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 1 },
      schedule: {
        currentAnchorId: 'desa_b',
        homeAnchorId: 'desa_a',
        wanderLevel: 1,
        lastJourneyDay: 5,
        activityState: 'working',
        stayUntil: null,
        targetDestination: null,
        tileX: 200,
        tileY: 100
      },
      attributes: { travelSpeed: 10 }
    });

    // Run journey tick: should detect away without stayUntil and give stayUntil = now + 30 min
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    let current = await Npc.findById(legacyNpc._id);
    expect(current.schedule.stayUntil).not.toBeNull();
    const assignedStay = new Date(current.schedule.stayUntil).getTime();

    // Advance time past stayUntil: next journey tick starts return trip
    now = assignedStay + 1000;
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    current = await Npc.findById(legacyNpc._id);
    expect(current.schedule.activityState).toBe('traveling');
    expect(current.schedule.targetDestination.toId).toBe('desa_a');
    expect(current.schedule.targetDestination.purpose).toBe('pulang');

    // Complete return trip
    now = current.schedule.targetDestination.etaAt + 1000;
    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    current = await Npc.findById(legacyNpc._id);
    expect(current.schedule.currentAnchorId).toBe('desa_a');
    expect(current.schedule.activityState).toBe('idle');
    expect(current.schedule.stayUntil).toBeNull();
  });

  it('(i) Away NPC > 900 tiles from home still successfully initiates and completes return trip', async () => {
    let now = 36000000;
    const farAnchorMap = {
      ...dummyAnchorMap,
      kota_jauh: { id: 'kota_jauh', name: 'Kota Jauh', regionSlug: 'reg_2', type: 'city', x: 1300, y: 100, tileX: 1300, tileY: 100 }
    };

    const npc = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      name: 'Pengelana Jauh',
      gender: 'female',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 2 },
      schedule: {
        currentAnchorId: 'kota_jauh',
        homeAnchorId: 'desa_a',
        wanderLevel: 2,
        activityState: 'visiting',
        stayUntil: new Date(now - 5000), // Expired stay
        tileX: 1300,
        tileY: 100
      },
      attributes: { travelSpeed: 10 }
    });

    await runJourneyTick({
      Npc,
      now,
      anchorMap: farAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    let current = await Npc.findById(npc._id);
    expect(current.schedule.activityState).toBe('traveling');
    expect(current.schedule.targetDestination).not.toBeNull();
    expect(current.schedule.targetDestination.toId).toBe('desa_a');
    expect(current.schedule.targetDestination.purpose).toBe('pulang');
    expect(current.schedule.targetDestination.totalTiles).toBe(1200);

    // Arrive home
    now = current.schedule.targetDestination.etaAt + 1000;
    await runJourneyTick({
      Npc,
      now,
      anchorMap: farAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    current = await Npc.findById(npc._id);
    expect(current.schedule.currentAnchorId).toBe('desa_a');
    expect(current.schedule.activityState).toBe('idle');
    expect(current.schedule.stayUntil).toBeNull();
  });

  it('(j) Self-heal: NPC at homeAnchorId with activityState visiting transitions back to idle and clears stayUntil', async () => {
    const now = 36000000;
    const stuckAtHome = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      name: 'Warga Salah Status',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false },
      schedule: {
        currentAnchorId: 'desa_a',
        homeAnchorId: 'desa_a',
        wanderLevel: 1,
        lastJourneyDay: 10,
        activityState: 'visiting',
        stayUntil: new Date(now + 600000),
        tileX: 100,
        tileY: 100
      }
    });

    await runJourneyTick({
      Npc,
      now,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    const healed = await Npc.findById(stuckAtHome._id);
    expect(healed.schedule.activityState).toBe('idle');
    expect(healed.schedule.stayUntil).toBeNull();
  });

  it('(k) Away NPC NEVER starts a new outward journey before returning home even if stayUntil not yet expired', async () => {
    const now = 36000000;
    const multiAnchorMap = {
      ...dummyAnchorMap,
      desa_c: { id: 'desa_c', name: 'Desa C', regionSlug: 'reg_1', type: 'village', x: 300, y: 100, tileX: 300, tileY: 100 }
    };

    const awayNpc = await Npc.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Day 10 would normally pass roll!
      name: 'Pengelana Setia Pulang',
      gender: 'male',
      vitalStatus: { isAlive: true, isEssential: false },
      cultivation: { realmIndex: 1 },
      schedule: {
        currentAnchorId: 'desa_b',
        homeAnchorId: 'desa_a',
        wanderLevel: 2,
        lastJourneyDay: -1,
        activityState: 'visiting',
        stayUntil: new Date(now + 600000), // Not expired yet
        tileX: 200,
        tileY: 100
      }
    });

    await runJourneyTick({
      Npc,
      now,
      anchorMap: multiAnchorMap,
      graph: dummyGraph,
      isWalkableFn
    });

    const checked = await Npc.findById(awayNpc._id);
    expect(checked.schedule.activityState).toBe('visiting');
    expect(checked.schedule.targetDestination).toBeNull();
    expect(checked.schedule.currentAnchorId).toBe('desa_b');
  });
});
