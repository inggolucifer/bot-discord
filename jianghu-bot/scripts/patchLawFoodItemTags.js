/**
 * scripts/patchLawFoodItemTags.js
 * 
 * Idempotent migration/patch script:
 * 1. Items with larva/serangga/madu/cacing/ulat/pakan names get ['gu_food', 'gu_feed', 'essence', 'material'].
 * 2. Items with meat/daging/buruan names get ['beast_food', 'meat', 'essence', 'material'].
 * 3. Weapons, armors, and accessories are strictly excluded from feed tags.
 */

const mongoose = require('mongoose');
const Item = require('../models/Item');

async function patchFoodItemTags(guildId = null) {
  const query = guildId ? { guildId } : {};
  const items = await Item.find(query);

  let guPatched = 0;
  let beastPatched = 0;

  for (const item of items) {
    const cat = String(item.category || '').toLowerCase();
    const name = String(item.name || '');
    const isEquipment = ['weapon', 'armor', 'equipment', 'accessory', 'helm', 'pants', 'boots', 'mount'].includes(cat);
    if (isEquipment) continue;

    const currentTags = Array.isArray(item.tags) ? item.tags.map(String) : [];
    const newTags = new Set(currentTags);
    let modified = false;

    // Gu regex match
    if (/(serangga|madu|cacing|ulat|larva|pakan|empedu|getah|insect|jelly|nectar|gu\b)/i.test(name)) {
      ['gu_food', 'gu_feed', 'essence', 'material'].forEach(t => newTags.add(t));
      if (newTags.size > currentTags.length) {
        guPatched++;
        modified = true;
      }
    }

    // Beast meat regex match
    if (/(daging|meat|buruan|satwa|hewan|unggas)/i.test(name)) {
      ['beast_food', 'meat', 'essence', 'material'].forEach(t => newTags.add(t));
      if (newTags.size > currentTags.length) {
        beastPatched++;
        modified = true;
      }
    }

    if (modified) {
      item.tags = Array.from(newTags);
      await item.save();
    }
  }

  return { guPatched, beastPatched, totalProcessed: items.length };
}

if (require.main === module) {
  (async () => {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu';
      console.log('[PATCH-TAGS] Connecting to MongoDB:', uri);
      await mongoose.connect(uri);

      const res = await patchFoodItemTags();
      console.log(`[PATCH-TAGS] Success! Patched ${res.guPatched} Gu items and ${res.beastPatched} Beast items out of ${res.totalProcessed} total items.`);

      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('[PATCH-TAGS] Error:', err);
      process.exit(1);
    }
  })();
}

module.exports = { patchFoodItemTags };
