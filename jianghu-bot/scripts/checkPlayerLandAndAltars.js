require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Player = mongoose.model('Player', new mongoose.Schema({}, { strict: false }));
  const ZoneTile = mongoose.model('ZoneTile', new mongoose.Schema({}, { strict: false }));
  const Asset = mongoose.model('Asset', new mongoose.Schema({}, { strict: false }));

  const inggo = await Player.findOne({ characterName: 'Inggo' });
  console.log('Player Inggo:', {
    discordId: inggo?.discordId,
    currency: inggo?.currency,
    assetsCount: inggo?.assets?.length || 0,
    facilities: inggo?.facilities,
    law: inggo?.cultivationLaw?.activeLawType,
    gridPos: inggo?.gridPosition
  });

  const ownedTiles = await ZoneTile.find({ ownerId: inggo?.discordId });
  console.log('Owned tiles count for Inggo:', ownedTiles.length);
  ownedTiles.forEach(t => console.log(' - Tile:', t.zoneId, `(${t.tileX}, ${t.tileY})`, 'Building:', t.buildingName, 'Label:', t.label));

  const claimableTiles = await ZoneTile.find({ isClaimable: true }).limit(5);
  console.log('Sample claimable tiles:', claimableTiles.map(t => ({ zoneId: t.zoneId, x: t.tileX, y: t.tileY, price: t.plotPriceSilver })));

  const altarsInDb = await Asset.find({ name: { $regex: /altar|kendi|kandang|tungku/i } });
  console.log('Altars in Asset collection:', altarsInDb.map(a => a.name));

  await mongoose.disconnect();
}

main().catch(console.error);
