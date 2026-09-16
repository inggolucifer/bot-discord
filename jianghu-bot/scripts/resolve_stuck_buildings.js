const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

async function resolveStuck() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ZoneTile = require('../models/ZoneTile');
  const Player = require('../models/Player');
  
  const now = new Date();
  const expired = await ZoneTile.find({
    isUnderConstruction: true,
    constructionCompleteAt: { $lte: now }
  });
  
  console.log('EXPIRED TILES TO RESOLVE:', expired.length);
  for (const tile of expired) {
    console.log('Resolving tile:', tile._id, tile.buildingName, '| completeAt:', tile.constructionCompleteAt);
    tile.isUnderConstruction = false;
    tile.isOccupied = true;
    tile.label = `${tile.buildingName} (${tile.ownerName || 'Pemain'})`;
    await tile.save();
  }
  
  const updateRes = await Player.updateMany(
    { 'assets.status': 'building', 'assets.constructionCompleteAt': { $lte: now } },
    { $set: { 'assets.$[elem].status': 'active' } },
    { arrayFilters: [{ 'elem.status': 'building', 'elem.constructionCompleteAt': { $lte: now } }] }
  );
  console.log('PLAYER ASSETS UPDATED:', updateRes.modifiedCount);
  
  console.log('ALL EXPIRED CONSTRUCTIONS RESOLVED SUCCESSFULLY!');
  await mongoose.disconnect();
}
resolveStuck();
