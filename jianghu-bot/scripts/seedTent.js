const mongoose = require('mongoose');
const Item = require('../models/Item');
const { connectDB, disconnectDB } = require('../config/database');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const guildIdIdx = args.indexOf('--guildId');
if (guildIdIdx === -1 || !args[guildIdIdx + 1]) {
  console.error("Please provide --guildId <id>");
  process.exit(1);
}
const guildId = args[guildIdIdx + 1];

async function seed() {
  await connectDB();
  const tent = await Item.findOne({ name: 'Tenda Sederhana', guildId });
  if (tent) {
    console.log("Tent already exists");
  } else {
    console.log("Creating Tent");
    if (!dryRun) {
      await Item.create({
        guildId,
        name: 'Tenda Sederhana',
        rank: 'Common',
        category: 'consume',
        tier: 1,
        description: 'Digunakan untuk beristirahat dengan lebih baik dan memulihkan stamina lebih cepat saat di pemukiman.',
        basePrice: {
          copper: 0,
          silver: 50,
          gold: 0,
          jade: 0,
          spirit: 0
        },
        weight: 2
      });
      console.log("Tent created");
    }
  }
  await disconnectDB();
}
seed().catch(console.error);
