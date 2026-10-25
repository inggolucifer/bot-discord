const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Item = require('../models/Item');
const challengeItems = require('../world-data/challenge-items-v9.json');

const DEFAULT_GUILD_ID = process.env.DEFAULT_GUILD_ID || 'default_guild';

async function seedChallengeItems(guildId = DEFAULT_GUILD_ID) {
  let seeded = 0;
  for (const it of challengeItems) {
    await Item.findOneAndUpdate(
      { guildId, name: it.name },
      { ...it, guildId },
      { upsert: true, new: true }
    );
    seeded++;
  }
  return { success: true, count: seeded };
}

if (require.main === module) {
  (async () => {
    try {
      const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu-bot';
      await mongoose.connect(dbUri);
      console.log('Connected to MongoDB.');
      const res = await seedChallengeItems();
      console.log(`[PASS] ${res.count} challenge items successfully seeded.`);
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Seeding error:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { seedChallengeItems, challengeItems };
