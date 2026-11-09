const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

async function ensureNpcWorld({ Npc, NpcFamily }) {
  if (process.env.NPC_SEED_ON_BOOT === 'false') {
    console.log('[NpcBootstrap] NPC_SEED_ON_BOOT is false, skipping bootstrap.');
    return { ok: true, skipped: true };
  }

  const snapshotPath = path.resolve(__dirname, '../world-data/npc-ecosystem-snapshot-v27.json');
  if (!fs.existsSync(snapshotPath)) {
    console.warn('[NpcBootstrap] Snapshot not found at:', snapshotPath);
    return { ok: false, reason: 'snapshot_missing' };
  }

  const dataset = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const snapshotNpcCount = dataset.npcs?.length || 0;

  const currentCount = await Npc.countDocuments({ 'schedule.currentAnchorId': { $exists: true } });
  console.log(`[NpcBootstrap] Active NPCs in DB: ${currentCount} / Snapshot required: ${snapshotNpcCount}`);

  if (currentCount >= snapshotNpcCount) {
    console.log('[NpcBootstrap] Database already contains full NPC population. Skipping upsert.');
    return { ok: true, count: currentCount };
  }

  console.log(`[NpcBootstrap] Upserting ${snapshotNpcCount} NPCs in chunks of 200...`);
  const chunkSize = 200;
  let totalUpserted = 0;

  for (let i = 0; i < dataset.npcs.length; i += chunkSize) {
    const chunk = dataset.npcs.slice(i, i + chunkSize);
    const ops = chunk.map(npc => {
      const { _id, ...rest } = npc;
      return {
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(_id) },
          update: { $set: rest },
          upsert: true
        }
      };
    });
    const res = await Npc.bulkWrite(ops);
    totalUpserted += (res.upsertedCount || 0) + (res.modifiedCount || 0);
  }

  if (Array.isArray(dataset.families) && dataset.families.length > 0 && NpcFamily) {
    const famOps = dataset.families.map(fam => {
      const { _id, ...rest } = fam;
      return {
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(_id) },
          update: { $set: rest },
          upsert: true
        }
      };
    });
    await NpcFamily.bulkWrite(famOps);
  }

  console.log(`[NpcBootstrap] Ecosystem bootstrap complete. Total processed: ${totalUpserted}`);
  return { ok: true, count: totalUpserted };
}

module.exports = {
  ensureNpcWorld
};
