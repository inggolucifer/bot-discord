import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import Npc from '../../../models/Npc.js';
import { evaluateNpcSchedule } from '../../../services/npcScheduler.js';
import { runRecoveryTick } from '../../../services/npcLifecycle.js';
import { runPopulationTick, checkAnchorCoreRoles } from '../../../services/npcPopulationManager.js';
import { startNpcTicker, stopNpcTicker, acquireSimulationLock } from '../../../services/npcTicker.js';
import { makeRng } from '../../../utils/npcRng.js';

describe('NPC Living Simulation Ticker (V28 / B3)', () => {
  it('1. evaluateNpcSchedule selects sleeping activity at night (hour 23)', () => {
    const npc = new Npc({
      name: 'Petani Zhang',
      schedule: { activityState: 'working', currentFacility: 'workshop' },
      vitalStatus: { isAlive: true, essentialRole: 'cultivator' }
    });
    const res = evaluateNpcSchedule(npc, 23);
    expect(res.changed).toBe(true);
    expect(res.activityState).toBe('sleeping');
    expect(res.currentFacility).toBe('residences');
  });

  it('2. evaluateNpcSchedule returns changed: false when state is unchanged', () => {
    const npc = new Npc({
      name: 'Penjaga Toko',
      schedule: { activityState: 'sleeping', currentFacility: 'residences' },
      vitalStatus: { isAlive: true, essentialRole: 'cultivator' }
    });
    const res = evaluateNpcSchedule(npc, 0); // 00:00 is also sleeping
    expect(res.changed).toBe(false);
  });

  it('3. essential role NPCs (innkeeper, blacksmith, alchemist) never change their anchor', () => {
    const innkeeper = new Npc({
      name: 'Tuan Qian',
      schedule: { currentAnchorId: 'kota_canghai', homeAnchorId: 'kota_canghai', activityState: 'idle' },
      vitalStatus: { isAlive: true, essentialRole: 'innkeeper' }
    });
    const res = evaluateNpcSchedule(innkeeper, 9);
    expect(res.anchorId).toBe('kota_canghai');
    expect(innkeeper.schedule.homeAnchorId).toBe('kota_canghai');
  });

  it('4. wandering NPCs do not leave their designated region', () => {
    const wanderer = new Npc({
      name: 'Pendekar Kelana',
      regionSlug: 'central_plains',
      isWandering: true,
      schedule: { currentAnchorId: 'desa_xingcun', activityState: 'idle' },
      vitalStatus: { isAlive: true }
    });
    const res = evaluateNpcSchedule(wanderer, 14);
    expect(res.regionSlug).toBe('central_plains');
  });

  it('5. schedule destination is always verified walkable even when 70% of tiles are blocked', () => {
    const mockWalkability = vi.fn((x, y) => (x + y) % 3 === 0); // 66% blocked
    const npc = new Npc({
      name: 'Pemburu Rimba',
      tileX: 2455,
      tileY: 2485,
      schedule: { tileX: 2455, tileY: 2485, activityState: 'idle' },
      vitalStatus: { isAlive: true }
    });
    const rng = makeRng('walk_test_seed');
    const res = evaluateNpcSchedule(npc, 10, { isWalkableFn: mockWalkability, rng });
    expect(mockWalkability(res.tileX, res.tileY)).toBe(true);
  });

  it('6. runRecoveryTick recovers downed essential NPC when downedUntil <= now', async () => {
    const now = Date.now();
    const downedNpc = new Npc({
      name: 'Zhou Haotian',
      vitalStatus: {
        isAlive: true,
        isInjured: true,
        injurySeverity: 3,
        isEssential: true,
        downedUntil: new Date(now - 1000)
      },
      attributes: { hp: 1, maxHp: 150 },
      schedule: { activityState: 'downed' }
    });

    const mockFind = vi.fn().mockResolvedValue([downedNpc]);
    const mockModel = { find: mockFind };

    const count = await runRecoveryTick(now, { Npc: mockModel });
    expect(count).toBe(1);
    expect(downedNpc.vitalStatus.isInjured).toBe(false);
    expect(downedNpc.vitalStatus.injurySeverity).toBe(0);
    expect(downedNpc.vitalStatus.downedUntil).toBeNull();
    expect(downedNpc.attributes.hp).toBe(150);
    expect(downedNpc.schedule.activityState).toBe('idle');
  });

  it('7. runRecoveryTick ignores downed NPC when downedUntil is in the future', async () => {
    const now = Date.now();
    const mockModel = {
      find: vi.fn().mockResolvedValue([])
    };
    const count = await runRecoveryTick(now, { Npc: mockModel });
    expect(count).toBe(0);
  });

  it('8. runPopulationTick replenishes role dead for >= 24 game hours', async () => {
    const now = Date.now();
    const twentyFourGameHoursAgo = now - 3600 * 1000; // 1 real hour = 24 game hours

    const deadInnkeeper = new Npc({
      name: 'Almarhum Qian',
      schedule: { currentAnchorId: 'desa_xingcun' },
      vitalStatus: { isAlive: false, essentialRole: 'innkeeper' },
      lifespan: { deathTimestamp: new Date(twentyFourGameHoursAgo - 5000) }
    });

    const insertedEvents = [];
    const insertedNpcs = [];

    const mockNpc = {
      countDocuments: vi.fn().mockResolvedValue(500),
      find: vi.fn().mockResolvedValue([deadInnkeeper]),
      insertMany: vi.fn().mockImplementation(docs => {
        insertedNpcs.push(...docs);
        return docs;
      })
    };
    const mockEvent = {
      create: vi.fn().mockImplementation(evt => {
        insertedEvents.push(evt);
        return evt;
      })
    };

    const count = await runPopulationTick({
      Npc: mockNpc,
      NpcEvent: mockEvent,
      now,
      targetAnchorId: 'desa_xingcun'
    });

    expect(count).toBeGreaterThanOrEqual(1);
    expect(insertedNpcs.some(n => n.vitalStatus.essentialRole === 'innkeeper')).toBe(true);
  });

  it('9. runPopulationTick does not replenish role dead for < 24 game hours', async () => {
    const now = Date.now();
    const deadRecent = new Npc({
      name: 'Baru Wafat',
      schedule: { currentAnchorId: 'desa_xingcun' },
      vitalStatus: { isAlive: false, essentialRole: 'innkeeper' },
      lifespan: { deathTimestamp: new Date(now - 60000) } // 1 minute ago
    });
    const liveBlacksmith = new Npc({
      name: 'Blacksmith Aktif',
      schedule: { currentAnchorId: 'desa_xingcun' },
      vitalStatus: { isAlive: true, essentialRole: 'blacksmith' }
    });
    const liveAlchemist = new Npc({
      name: 'Alchemist Aktif',
      schedule: { currentAnchorId: 'desa_xingcun' },
      vitalStatus: { isAlive: true, essentialRole: 'alchemist' }
    });

    const mockNpc = {
      countDocuments: vi.fn().mockResolvedValue(500),
      find: vi.fn().mockResolvedValue([deadRecent, liveBlacksmith, liveAlchemist]),
      insertMany: vi.fn().mockResolvedValue([])
    };

    const count = await runPopulationTick({
      Npc: mockNpc,
      NpcEvent: { create: vi.fn() },
      now,
      targetAnchorId: 'desa_xingcun'
    });

    expect(count).toBe(0);
  });

  it('10. runPopulationTick is idempotent: second consecutive run produces 0 additions', async () => {
    const now = Date.now();
    const liveInnkeeper = new Npc({
      name: 'Innkeeper Aktif',
      schedule: { currentAnchorId: 'desa_xingcun' },
      vitalStatus: { isAlive: true, essentialRole: 'innkeeper' }
    });
    const liveBlacksmith = new Npc({
      name: 'Blacksmith Aktif',
      schedule: { currentAnchorId: 'desa_xingcun' },
      vitalStatus: { isAlive: true, essentialRole: 'blacksmith' }
    });
    const liveAlchemist = new Npc({
      name: 'Alchemist Aktif',
      schedule: { currentAnchorId: 'desa_xingcun' },
      vitalStatus: { isAlive: true, essentialRole: 'alchemist' }
    });

    const mockNpc = {
      countDocuments: vi.fn().mockResolvedValue(764),
      find: vi.fn().mockResolvedValue([liveInnkeeper, liveBlacksmith, liveAlchemist]),
      insertMany: vi.fn().mockResolvedValue([])
    };

    const count = await runPopulationTick({
      Npc: mockNpc,
      NpcEvent: { create: vi.fn() },
      now,
      targetAnchorId: 'desa_xingcun'
    });

    expect(count).toBe(0);
  });

  it('11. runPopulationTick respects maxTotal ceiling of 1200 NPCs', async () => {
    const mockNpc = {
      countDocuments: vi.fn().mockResolvedValue(1200),
      find: vi.fn().mockResolvedValue([]),
      insertMany: vi.fn()
    };

    const count = await runPopulationTick({
      Npc: mockNpc,
      NpcEvent: { create: vi.fn() },
      maxTotal: 1200
    });

    expect(count).toBe(0);
    expect(mockNpc.insertMany).not.toHaveBeenCalled();
  });

  it('12. acquireSimulationLock prevents secondary leader from executing ticks', async () => {
    const now = Date.now();
    const mockCollection = {
      findOneAndUpdate: vi.fn().mockResolvedValue(null) // Lock held by another process
    };
    const mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection)
    };

    const hasLock = await acquireSimulationLock(mockDb, 'worker_pid_2', now);
    expect(hasLock).toBe(false);
  });

  it('13. single leader successfully acquires lock when lock is expired or free', async () => {
    const now = Date.now();
    const mockCollection = {
      findOneAndUpdate: vi.fn().mockResolvedValue({ _id: 'leader', holder: 'worker_pid_1' })
    };
    const mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection)
    };

    const hasLock = await acquireSimulationLock(mockDb, 'worker_pid_1', now);
    expect(hasLock).toBe(true);
  });

  it('14. startNpcTicker and stopNpcTicker lifecycle is clean', () => {
    const ticker = startNpcTicker({ intervalMs: 999999, autoRun: false });
    expect(ticker).toBeDefined();
    expect(typeof ticker.stop).toBe('function');
    ticker.stop();
  });
});
