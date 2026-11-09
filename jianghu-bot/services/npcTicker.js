/**
 * Distributed Background NPC Simulation Ticker (V28 / B3)
 * Orchestrates schedules, recovery, and population replenishment with single-leader lock.
 */

const os = require('os');
const mongoose = require('mongoose');
const { evaluateNpcSchedule } = require('./npcScheduler');
const { runRecoveryTick } = require('./npcLifecycle');
const { runPopulationTick } = require('./npcPopulationManager');

let activeIntervals = [];
let isLeader = false;

async function acquireSimulationLock(db, lockHolder, now = Date.now()) {
  try {
    const col = db.collection ? db.collection('npc_sim_lock') : null;
    if (!col || typeof col.findOneAndUpdate !== 'function') return true;

    const res = await col.findOneAndUpdate(
      {
        _id: 'leader',
        $or: [
          { until: { $lt: new Date(now) } },
          { holder: lockHolder }
        ]
      },
      {
        $set: {
          holder: lockHolder,
          until: new Date(now + 120000)
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    return !!res;
  } catch (err) {
    // If lock fails due to duplicate or lock held by other node, return false
    return false;
  }
}

async function runScheduleBatchTick({ Npc, now = Date.now(), isWalkableFn = null, rng = null }) {
  if (!Npc || typeof Npc.find !== 'function') return 0;

  const gameHour = Math.floor(now / (3600 * 1000 / 24)) % 24;
  const activeNpcs = await Npc.find({ 'vitalStatus.isAlive': true });
  const bulkOps = [];

  for (const npc of activeNpcs) {
    const res = evaluateNpcSchedule(npc, gameHour, { isWalkableFn, rng });
    if (res.changed) {
      bulkOps.push({
        updateOne: {
          filter: { _id: npc._id },
          update: {
            $set: {
              'schedule.activityState': res.activityState,
              'schedule.currentFacility': res.currentFacility,
              'schedule.tileX': res.tileX,
              'schedule.tileY': res.tileY,
              tileX: res.tileX,
              tileY: res.tileY,
              buildingName: res.currentFacility
            }
          }
        }
      });
    }
  }

  if (bulkOps.length > 0 && typeof Npc.bulkWrite === 'function') {
    await Npc.bulkWrite(bulkOps);
  }

  return bulkOps.length;
}

function startNpcTicker({
  intervalMs = 300000,
  Npc = null,
  NpcFamily = null,
  NpcEvent = null,
  autoRun = true
} = {}) {
  const lockHolder = `${process.pid}@${os.hostname()}`;
  const getDb = () => mongoose.connection?.db;

  const NpcModel = Npc || (mongoose.models?.Npc ? mongoose.models.Npc : null);
  const NpcEventModel = NpcEvent || (mongoose.models?.NpcEvent ? mongoose.models.NpcEvent : null);

  const stop = () => {
    activeIntervals.forEach(clearInterval);
    activeIntervals = [];
  };

  if (!autoRun) {
    return { stop };
  }

  // 1. Recovery Loop: Every 60 seconds
  const recoveryInterval = setInterval(async () => {
    try {
      const db = getDb();
      if (db) {
        const hasLock = await acquireSimulationLock(db, lockHolder, Date.now());
        if (!hasLock) return;
      }
      await runRecoveryTick(Date.now(), { Npc: NpcModel });
    } catch (err) {
      console.error('[NpcTicker] Recovery tick error:', err);
    }
  }, 60000);
  activeIntervals.push(recoveryInterval);

  // 2. Schedule Loop: Every 5 minutes (or intervalMs)
  const scheduleInterval = setInterval(async () => {
    try {
      const db = getDb();
      if (db) {
        const hasLock = await acquireSimulationLock(db, lockHolder, Date.now());
        if (!hasLock) return;
      }
      await runScheduleBatchTick({ Npc: NpcModel, now: Date.now() });
    } catch (err) {
      console.error('[NpcTicker] Schedule tick error:', err);
    }
  }, intervalMs);
  activeIntervals.push(scheduleInterval);

  // 3. Population Loop: Every 10 minutes
  const populationInterval = setInterval(async () => {
    try {
      const db = getDb();
      if (db) {
        const hasLock = await acquireSimulationLock(db, lockHolder, Date.now());
        if (!hasLock) return;
      }
      await runPopulationTick({ Npc: NpcModel, NpcEvent: NpcEventModel, now: Date.now() });
    } catch (err) {
      console.error('[NpcTicker] Population tick error:', err);
    }
  }, 600000);
  activeIntervals.push(populationInterval);

  console.log(`[NpcTicker] Living simulation ticker started (Leader: ${lockHolder}).`);
  return { stop };
}

function stopNpcTicker() {
  activeIntervals.forEach(clearInterval);
  activeIntervals = [];
}

module.exports = {
  startNpcTicker,
  stopNpcTicker,
  acquireSimulationLock,
  runScheduleBatchTick
};
