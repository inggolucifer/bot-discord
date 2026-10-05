/**
 * scripts/backfillLawItemTagsAndTier.js
 *
 * Idempotent migration/backfill script for MongoDB `items` collection:
 * - Backfills missing tags (gu_food, beast_food, ore, element essences, breakthrough_material, spirit_stone)
 * - Backfills missing tier based on rank/rarity
 * - Sets default category 'material' for essence items if category is empty
 * - Protects weapons, armors, and mounts from improper feed/ore tags
 *
 * Usage:
 *   node jianghu-bot/scripts/backfillLawItemTagsAndTier.js          (dry-run preview)
 *   node jianghu-bot/scripts/backfillLawItemTagsAndTier.js --apply  (write to database)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const RANK_TIER_MAP = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
  mythical: 6,
  immortal: 7,
  divine: 8,
  mortal: 1,
  spiritual: 2
};

function resolveTier(item) {
  const rawTier = item.tier ?? item.itemTier;
  if (typeof rawTier === 'number' && !isNaN(rawTier) && rawTier > 0) return Math.floor(rawTier);
  if (typeof rawTier === 'string' && !isNaN(Number(rawTier)) && Number(rawTier) > 0) return Math.floor(Number(rawTier));
  const r = String(item.rank || item.rarity || '').toLowerCase();
  return RANK_TIER_MAP[r] || 1;
}

async function runBackfill() {
  const isApply = process.argv.includes('--apply');
  console.log(`================================================================`);
  console.log(`🛠️ BACKFILL LAW ITEM TAGS & TIER (${isApply ? 'APPLY MODE' : 'DRY-RUN MODE'})`);
  console.log(`================================================================\n`);

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI tidak ditemukan di file .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const itemsColl = db.collection('items');

  const allItems = await itemsColl.find({}).toArray();
  console.log(`[BACKFILL] Total item ditemukan di database: ${allItems.length}`);

  let updatedCount = 0;
  let tierUpdatedCount = 0;
  let guTagsAdded = 0;
  let beastTagsAdded = 0;
  let oreTagsAdded = 0;
  let elementTagsAdded = 0;
  let btTagsAdded = 0;

  const samples = [];

  for (const item of allItems) {
    const name = String(item.name || '');
    const cat = String(item.category || '').toLowerCase();
    const isEquipment = ['weapon', 'armor', 'equipment', 'accessory', 'helm', 'pants', 'boots', 'mount', 'tool'].includes(cat) ||
      /(cangkul|beliung|pancingan|arit|palu|jarum|pisau|kapak|gergaji|wajan|kuali|perkakas|tombak|pedang|golok|busur|tameng|zirah|baju.*besi|sepatu)/i.test(name);

    let docModified = false;
    const currentTags = Array.isArray(item.tags) ? item.tags.map(String) : [];
    const newTags = new Set(currentTags);

    // 1. Tier Backfill if missing
    let newTier = item.tier;
    if (newTier === undefined || newTier === null || (typeof newTier === 'number' && isNaN(newTier))) {
      newTier = resolveTier(item);
      tierUpdatedCount++;
      docModified = true;
    }

    let newCategory = item.category;

    // 2. Tag Backfill (Exclude pure equipment and tools)
    if (!isEquipment) {
      // A. Gu insect / larva / bug / scorpion
      if (/(serangga|larva|cacing|\bulat\b|pakan.*gu|insect|kalajengking|empedu.*serangga|bibit.*gu)/i.test(name)) {
        ['gu_food', 'gu_feed', 'essence', 'material'].forEach(t => newTags.add(t));
        guTagsAdded++;
      }

      // B. Honey / nectar / jelly / sweet sap
      if (/(madu|nectar|jelly|getah.*manis)/i.test(name)) {
        ['gu_food', 'gu_feed', 'essence', 'material'].forEach(t => newTags.add(t));
        guTagsAdded++;
      }

      // C. Beast meat / food / egg / organ
      if (/(daging|meat|\bikan\b|jantung|telur.*beast|ransum|buruan|satwa.*roh)/i.test(name)) {
        ['beast_food', 'meat', 'essence', 'material'].forEach(t => newTags.add(t));
        beastTagsAdded++;
      }

      // D. Ore / mineral / whetstone / raw metals
      if (/(bijih|\bore\b|besi|\bbatu.*asah\b|mineral|whetstone|tembaga|perak.*kasar|emas.*kasar|batu.*kasar)/i.test(name)) {
        if (!/basah/i.test(name) || /batu.*asah/i.test(name)) {
          ['ore', 'mineral', 'material', 'essence'].forEach(t => newTags.add(t));
          oreTagsAdded++;
        }
      }

      // E. Elements
      if (/(api|\bbara\b|phoenix|flame|pyro)/i.test(name) && !/barang/i.test(name)) {
        ['fire_essence', 'fire_catalyst', 'essence'].forEach(t => newTags.add(t));
        elementTagsAdded++;
      }
      if (/(\bair\b|mata.*air|air.*bersih|es|azure|tide|aqua|embun|salju)/i.test(name) && !/cair/i.test(name)) {
        ['water_essence', 'water_catalyst', 'essence'].forEach(t => newTags.add(t));
        elementTagsAdded++;
      }
      if (/(petir|kilat|thunder|lightning)/i.test(name)) {
        ['lightning_essence', 'lightning_catalyst', 'essence'].forEach(t => newTags.add(t));
        elementTagsAdded++;
      }
      if (/(angin|badai|storm|gale|wind)/i.test(name)) {
        ['wind_essence', 'wind_catalyst', 'essence'].forEach(t => newTags.add(t));
        elementTagsAdded++;
      }
      if (/(tanah|earth|stone|batu.*gunung|pasir)/i.test(name) && !/batu.*asah/i.test(name)) {
        ['earth_essence', 'earth_catalyst', 'essence'].forEach(t => newTags.add(t));
        elementTagsAdded++;
      }
      if (/(kayu|hutan|daun|wood|bambu|akar|herba)/i.test(name)) {
        ['wood_essence', 'wood_catalyst', 'essence'].forEach(t => newTags.add(t));
        elementTagsAdded++;
      }

      // F. Spirit Stones & Breakthrough Materials
      if (/(batu roh|spirit stone|spirit_stone)/i.test(name)) {
        ['spirit_stone', 'breakthrough_material', 'catalyst', 'essence', 'material'].forEach(t => newTags.add(t));
        btTagsAdded++;
      }
      if (/(katalis|terobosan|breakthrough)/i.test(name)) {
        ['breakthrough_catalyst', 'catalyst', 'breakthrough_material', 'material'].forEach(t => newTags.add(t));
        btTagsAdded++;
      }

      // G. Pills
      if (/(pil|dan|elixir)/i.test(name)) {
        newTags.add('pill');
        if (/(pil.*terobos|breakthrough.*pill|pil.*penerobos)/i.test(name)) {
          newTags.add('breakthrough_pill');
        }
      }

      // H. Demonic items
      if (/(darah.*siluman|darah.*iblis|blood.*vial)/i.test(name)) {
        ['blood_essence', 'blood_vial', 'essence'].forEach(t => newTags.add(t));
      }
      if (/(racun|bisa|venom)/i.test(name)) {
        ['venom_essence', 'venom_sac', 'essence'].forEach(t => newTags.add(t));
      }
      if (/(turbid|keruh|inti.*siluman)/i.test(name)) {
        ['turbid_essence', 'beast_core', 'essence'].forEach(t => newTags.add(t));
      }
      if (/(tribute|persembahan|tumbal)/i.test(name)) {
        ['tribute_item', 'essence'].forEach(t => newTags.add(t));
      }
      if (/(nether|yin|abyssal)/i.test(name)) {
        ['nether_essence', 'yin_stone', 'essence'].forEach(t => newTags.add(t));
      }

      // Category correction for essence items with empty category
      if (newTags.has('essence') && (!newCategory || newCategory === 'none')) {
        newCategory = 'material';
        docModified = true;
      }
    }

    if (newTags.size > currentTags.length) {
      docModified = true;
    }

    if (docModified) {
      updatedCount++;
      const finalTags = Array.from(newTags);

      if (samples.length < 15) {
        samples.push({
          name,
          category: newCategory,
          tier: newTier,
          addedTags: finalTags.filter(t => !currentTags.includes(t))
        });
      }

      if (isApply) {
        await itemsColl.updateOne(
          { _id: item._id },
          {
            $set: {
              tags: finalTags,
              tier: newTier,
              category: newCategory
            }
          }
        );
      }
    }
  }

  console.log(`\n--- SUMMARY BACKFILL ---`);
  console.log(`Total Item Terpengaruh : ${updatedCount} dari ${allItems.length}`);
  console.log(`Tier Diperbarui         : ${tierUpdatedCount}`);
  console.log(`Tag Gu Ditambahkan      : ${guTagsAdded}`);
  console.log(`Tag Beast Ditambahkan   : ${beastTagsAdded}`);
  console.log(`Tag Ore/Mineral Ditambah: ${oreTagsAdded}`);
  console.log(`Tag Elemen Ditambahkan  : ${elementTagsAdded}`);
  console.log(`Tag BT/Batu Roh Ditambah: ${btTagsAdded}`);
  console.log(`Mode Operasi            : ${isApply ? 'APPLY (SUKSES DITULIS KE DB)' : 'DRY-RUN (TIDAK ADA PERUBAHAN TERTULIS)'}\n`);

  console.log(`--- CONTOH 15 ITEM YANG DIPERBARUI ---`);
  console.log(JSON.stringify(samples, null, 2));

  await mongoose.disconnect();
  console.log(`\n[BACKFILL] Selesai.`);
  return { updatedCount, isApply };
}

if (require.main === module) {
  runBackfill()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[BACKFILL] Error:', err);
      process.exit(1);
    });
}

module.exports = { runBackfill };
