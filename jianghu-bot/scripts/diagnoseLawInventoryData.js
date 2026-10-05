// scripts/diagnoseLawInventoryData.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('[DIAGNOSE] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const items = db.collection('items');
    const players = db.collection('players');

    const totalItems = await items.countDocuments({});
    const withGuTag = await items.countDocuments({ tags: { $in: ['gu_food', 'gu_feed', 'gu_larva', 'gu_essence'] } });
    const withEssence = await items.countDocuments({ tags: 'essence' });
    const noTier = await items.countDocuments({ $or: [{ tier: { $exists: false } }, { tier: null }] });
    const materialCat = await items.countDocuments({ category: 'material' });

    console.log('--- STATS ITEMS ---');
    console.log({ totalItems, withGuTag, withEssence, noTier, materialCat });

    // Sample nama mengandung larva/serangga/madu tanpa tag gu
    const missingGu = await items.find({
      name: /serangga|larva|madu|cacing|ulat|pakan|insect/i,
      tags: { $nin: ['gu_food', 'gu_feed', 'gu_larva'] }
    }).project({ name: 1, tags: 1, category: 1, tier: 1 }).limit(30).toArray();
    console.log('--- SAMPLE MISSING GU TAGS ---');
    console.log('Count missing sample:', missingGu.length);
    console.log(missingGu);

    // Sample Gu Items in DB
    const guItemsSample = await items.find({
      tags: { $in: ['gu_food', 'gu_feed', 'gu_larva', 'gu_essence'] }
    }).project({ name: 1, tags: 1, category: 1, tier: 1 }).limit(15).toArray();
    console.log('--- SAMPLE GU ITEMS IN DB (' + guItemsSample.length + ') ---');
    console.log(guItemsSample);

    // Sample Beast Items in DB
    const beastItemsSample = await items.find({
      tags: { $in: ['beast_food', 'meat'] }
    }).project({ name: 1, tags: 1, category: 1, tier: 1 }).limit(10).toArray();
    console.log('--- SAMPLE BEAST ITEMS IN DB (' + beastItemsSample.length + ') ---');
    console.log(beastItemsSample);

    // Check ALL Player Inventories:
    const allPlayers = await players.find({ 'inventory.0': { $exists: true } }).toArray();
    let totalSlots = 0;
    let nullItemIdSlots = 0;
    let nonPositiveQtySlots = 0;
    let danglingSlots = 0;

    const allItemIds = new Set((await items.find({}, { projection: { _id: 1 } }).toArray()).map(doc => doc._id.toString()));

    for (const p of allPlayers) {
      if (Array.isArray(p.inventory)) {
        for (const slot of p.inventory) {
          totalSlots++;
          if (!slot.itemId) {
            nullItemIdSlots++;
          } else {
            const rawId = slot.itemId.toString();
            if (!allItemIds.has(rawId)) {
              danglingSlots++;
            }
          }
          if (slot.quantity <= 0) {
            nonPositiveQtySlots++;
          }
        }
      }
    }

    console.log('--- STATS ALL PLAYER INVENTORIES ---');
    console.log({
      totalPlayersWithInv: allPlayers.length,
      totalSlots,
      nullItemIdSlots,
      nonPositiveQtySlots,
      danglingSlots
    });

    console.log('[DIAGNOSE] Finished successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[DIAGNOSE] Error:', err);
    process.exit(1);
  }
})();
