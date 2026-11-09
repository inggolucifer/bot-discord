const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

const Npc = require('../../models/Npc');
const NpcFamily = require('../../models/NpcFamily');
const { killNpc } = require('../../services/npcLifecycle');
const { seedNpcLivingEcosystem } = require('../../scripts/v27/seedNpcLivingEcosystem');

describe('Essential Story NPC Lifecycle Protection (P1 Integration)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Seed ecosystem into in-memory test database
    await seedNpcLivingEcosystem({ db: true });
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('verifies all essential story NPCs are protected from death: downed status and isAlive remains true', async () => {
    const essentialNpcs = await Npc.find({ 'vitalStatus.isEssential': true });
    expect(essentialNpcs.length).toBeGreaterThanOrEqual(18);

    // Verify key story NPCs are in the essential set
    const essentialNames = essentialNpcs.map(n => n.name);
    expect(essentialNames).toContain('Shuang Ke');
    expect(essentialNames).toContain('Wu Binglin');
    expect(essentialNames).toContain('Yin Ci');
    expect(essentialNames).toContain('Li Keke');

    const killerId = new mongoose.Types.ObjectId();
    const killerInfo = { type: 'player', name: 'Penguji Langit', id: killerId };

    for (const npc of essentialNpcs) {
      const res = await killNpc(npc, killerInfo);

      expect(res.status).toBe('downed');
      expect(res.isEssential).toBe(true);

      // Verify in-memory state
      expect(npc.vitalStatus.isAlive).toBe(true);
      expect(npc.vitalStatus.isInjured).toBe(true);
      expect(npc.vitalStatus.injurySeverity).toBe(3);
      expect(npc.vitalStatus.downedUntil).not.toBeNull();
      expect(npc.vitalStatus.downedUntil instanceof Date).toBe(true);
      expect(npc.attributes.hp).toBe(1);

      // Verify reloaded document from DB
      const dbNpc = await Npc.findById(npc._id);
      expect(dbNpc.vitalStatus.isAlive).toBe(true);
      expect(dbNpc.vitalStatus.isInjured).toBe(true);
      expect(dbNpc.vitalStatus.isEssential).toBe(true);
    }
  });
});
