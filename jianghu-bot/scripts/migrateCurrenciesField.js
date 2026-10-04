require('dotenv').config();
const mongoose = require('mongoose');
const { normalizeCurrency, addCopper, convertToCopper } = require('../utils/currencyNormalize');

async function migrateCurrenciesField() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu-bot';
  console.log(`[MIGRATION] Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('[MIGRATION] Connected to MongoDB.');

  const db = mongoose.connection.db;
  const playersCol = db.collection('players');

  // Query raw documents that still have the legacy `currencies` field
  const cursor = playersCol.find({ currencies: { $exists: true } });
  let migratedCount = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    console.log(`[MIGRATION] Found legacy currencies in player: ${doc.characterName || doc._id}`);

    const legacyCurrencies = doc.currencies || {};
    const currentCurrency = doc.currency || { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };

    // Merge legacy currencies into current currency
    const legacyCopper = convertToCopper(legacyCurrencies);
    const updatedCurrency = { ...currentCurrency };
    addCopper(updatedCurrency, legacyCopper);
    normalizeCurrency(updatedCurrency);

    await playersCol.updateOne(
      { _id: doc._id },
      {
        $set: { currency: updatedCurrency },
        $unset: { currencies: "" }
      }
    );
    migratedCount++;
    console.log(`[MIGRATION] Migrated player ${doc.characterName || doc._id} (added ${legacyCopper} copper from legacy currencies).`);
  }

  console.log(`[MIGRATION] Finished. Total migrated documents: ${migratedCount}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  migrateCurrenciesField().catch((err) => {
    console.error('[MIGRATION ERROR]', err);
    process.exit(1);
  });
}

module.exports = migrateCurrenciesField;
