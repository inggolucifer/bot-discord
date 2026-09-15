const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const Item = require('../models/Item');
const Monster = require('../models/Monster');
const Npc = require('../models/Npc');
const Location = require('../models/Location');
const Manual = require('../models/Manual');

async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const guildIdIndex = args.indexOf('--guildId');

  if (guildIdIndex === -1 || !args[guildIdIndex + 1]) {
    console.error("Please provide --guildId <ID>");
    process.exit(1);
  }

  const guildId = args[guildIdIndex + 1];

  await connectDB();

  console.log(`Starting Image backfill (Phase 15) for guild: ${guildId} | Dry Run: ${isDryRun}`);

  const items = await Item.find({ guildId, imageUrl: null }).limit(5);
  for (let item of items) {
    console.log(`Setting placeholder for Item: ${item.name}`);
    if (!isDryRun) {
      item.imageUrl = 'https://placehold.co/100x100/png?text=' + encodeURIComponent(item.name);
      await item.save();
    }
  }

  const monsters = await Monster.find({ guildId, imageUrl: null }).limit(5);
  for (let mon of monsters) {
    console.log(`Setting placeholder for Monster: ${mon.name}`);
    if (!isDryRun) {
      mon.imageUrl = 'https://placehold.co/100x100/png?text=' + encodeURIComponent(mon.name);
      await mon.save();
    }
  }

  const npcs = await Npc.find({ guildId, imageUrl: null, portraitUrl: null }).limit(5);
  for (let npc of npcs) {
    console.log(`Setting placeholder for NPC: ${npc.name}`);
    if (!isDryRun) {
      npc.imageUrl = 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(npc.name);
      npc.portraitUrl = npc.imageUrl;
      await npc.save();
    }
  }

  const locations = await Location.find({ guildId, imageUrl: null }).limit(5);
  for (let loc of locations) {
    console.log(`Setting placeholder for Location: ${loc.settlementName} - ${loc.buildingName}`);
    if (!isDryRun) {
      loc.imageUrl = 'https://placehold.co/400x200/png?text=' + encodeURIComponent(loc.buildingName);
      await loc.save();
    }
  }

  console.log("Image backfill script complete.");
  process.exit(0);
}

run().catch(console.error);
