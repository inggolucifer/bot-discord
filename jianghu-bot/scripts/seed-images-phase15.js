const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const Item = require('../models/Item');
const Monster = require('../models/Monster');
const Npc = require('../models/Npc');
const Location = require('../models/Location');
const Manual = require('../models/Manual');
const catalog = require('../config/imageCatalog');
const { isUsableUrl } = require('../utils/imageResolve');

/**
 * Phase 15 - Admin Image Sync Script
 *
 * Isi dulu config/imageCatalog.js lalu jalankan seed untuk sync ke DB (opsional).
 * Script ini tidak memaksa memasukkan placeholder ke database.
 *
 * Usage: node scripts/seed-images-phase15.js --guildId <ID> [--dry-run]
 */
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

  console.log(`Starting Image Sync (Phase 15) for guild: ${guildId} | Dry Run: ${isDryRun}`);

  // Sync Items
  for (const [key, url] of Object.entries(catalog.items)) {
    if (!isUsableUrl(url)) continue;

    // We assume key can be item name
    const items = await Item.find({ guildId, name: key });
    for (let item of items) {
      if (item.imageUrl !== url) {
        console.log(`Updating Item ${item.name} imageUrl -> ${url}`);
        if (!isDryRun) {
          item.imageUrl = url;
          await item.save();
        }
      }
    }
  }

  // Sync Monsters
  for (const [key, url] of Object.entries(catalog.monsters)) {
    if (!isUsableUrl(url)) continue;

    const monsters = await Monster.find({ guildId, $or: [{ name: key }, { key: key }] });
    for (let mon of monsters) {
      if (mon.imageUrl !== url) {
        console.log(`Updating Monster ${mon.name} imageUrl -> ${url}`);
        if (!isDryRun) {
          mon.imageUrl = url;
          await mon.save();
        }
      }
    }
  }

  // Sync NPCs
  for (const [key, url] of Object.entries(catalog.npcs)) {
    if (!isUsableUrl(url)) continue;

    const npcs = await Npc.find({ guildId, name: key });
    for (let npc of npcs) {
      if (npc.portraitUrl !== url || npc.imageUrl !== url) {
        console.log(`Updating NPC ${npc.name} imageUrl -> ${url}`);
        if (!isDryRun) {
          npc.portraitUrl = url;
          npc.imageUrl = url;
          await npc.save();
        }
      }
    }
  }

  // Sync Locations
  for (const [key, url] of Object.entries(catalog.locations)) {
    if (!isUsableUrl(url)) continue;

    const locations = await Location.find({ guildId, $or: [{ settlementName: key }, { regionSlug: key }] });
    for (let loc of locations) {
      if (loc.imageUrl !== url) {
        console.log(`Updating Location ${loc.settlementName} imageUrl -> ${url}`);
        if (!isDryRun) {
          loc.imageUrl = url;
          await loc.save();
        }
      }
    }
  }

  console.log("Image sync complete.");
  process.exit(0);
}

run().catch(console.error);
