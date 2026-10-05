/**
 * scripts/cleanupPlayerInventoryDangling.js
 *
 * Player inventory hygiene script:
 * - Removes invalid / null itemId entries
 * - Removes dangling itemId references that don't exist in `items` collection
 * - Removes non-positive quantity entries (<= 0)
 * - Ensures itemId is a valid ObjectId
 *
 * Usage:
 *   node jianghu-bot/scripts/cleanupPlayerInventoryDangling.js            (dry-run by default)
 *   node jianghu-bot/scripts/cleanupPlayerInventoryDangling.js --dry-run  (dry-run explicit)
 *   node jianghu-bot/scripts/cleanupPlayerInventoryDangling.js --apply    (write changes to DB)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function runCleanup() {
  const isApply = process.argv.includes('--apply');
  console.log(`================================================================`);
  console.log(`🧹 CLEANUP PLAYER INVENTORY DANGLING (${isApply ? 'APPLY MODE' : 'DRY-RUN MODE'})`);
  console.log(`================================================================\n`);

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI tidak ditemukan di file .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const itemsColl = db.collection('items');
  const playersColl = db.collection('players');

  // Load all valid Item IDs into a Set for fast lookup
  const allValidItemDocs = await itemsColl.find({}, { projection: { _id: 1 } }).toArray();
  const validItemIdSet = new Set(allValidItemDocs.map(d => d._id.toString()));
  console.log(`[CLEANUP] Valid item ID di database terdaftar: ${validItemIdSet.size}`);

  const players = await playersColl.find({ 'inventory.0': { $exists: true } }).toArray();
  console.log(`[CLEANUP] Total pemain dengan inventori: ${players.length}`);

  let totalPlayersChecked = 0;
  let playersModified = 0;
  let nullSlotsRemoved = 0;
  let nonPositiveSlotsRemoved = 0;
  let danglingSlotsRemoved = 0;

  for (const player of players) {
    totalPlayersChecked++;
    if (!Array.isArray(player.inventory)) continue;

    const originalLength = player.inventory.length;
    const cleanInventory = [];

    for (const slot of player.inventory) {
      if (!slot) continue;

      // 1. Quantity validation
      if (typeof slot.quantity !== 'number' || slot.quantity <= 0) {
        nonPositiveSlotsRemoved++;
        continue;
      }

      // 2. ItemId validation
      if (!slot.itemId) {
        nullSlotsRemoved++;
        continue;
      }

      const rawId = (slot.itemId._id || slot.itemId.id || slot.itemId).toString();

      // Check if ID is a valid hex string of length 24
      if (!/^[0-9a-fA-F]{24}$/.test(rawId)) {
        nullSlotsRemoved++;
        continue;
      }

      // 3. Dangling reference check
      if (!validItemIdSet.has(rawId)) {
        danglingSlotsRemoved++;
        continue;
      }

      // Valid slot -> normalize itemId to ObjectId
      cleanInventory.push({
        ...slot,
        itemId: new mongoose.Types.ObjectId(rawId)
      });
    }

    if (cleanInventory.length !== originalLength) {
      playersModified++;
      console.log(`[CLEANUP] Player [${player.username || player._id}]: ${originalLength} slots -> ${cleanInventory.length} slots`);

      if (isApply) {
        await playersColl.updateOne(
          { _id: player._id },
          { $set: { inventory: cleanInventory } }
        );
      }
    }
  }

  console.log(`\n--- SUMMARY INVENTORY CLEANUP ---`);
  console.log(`Total Pemain Diperiksa     : ${totalPlayersChecked}`);
  console.log(`Pemain yang Perlu Diupdate : ${playersModified}`);
  console.log(`Slot ItemId Null Dihapus   : ${nullSlotsRemoved}`);
  console.log(`Slot Qty <= 0 Dihapus      : ${nonPositiveSlotsRemoved}`);
  console.log(`Slot Dangling Ref Dihapus  : ${danglingSlotsRemoved}`);
  console.log(`Mode Operasi               : ${isApply ? 'APPLY (SUKSES DITULIS KE DB)' : 'DRY-RUN (TIDAK ADA PERUBAHAN TERTULIS)'}\n`);

  await mongoose.disconnect();
  console.log(`[CLEANUP] Selesai.`);
  return { playersModified, isApply };
}

if (require.main === module) {
  runCleanup()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[CLEANUP] Error:', err);
      process.exit(1);
    });
}

module.exports = { runCleanup };
