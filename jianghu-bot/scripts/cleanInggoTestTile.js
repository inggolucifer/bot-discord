require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const ZoneTile = require('../models/ZoneTile');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const inggo = await Player.findOne({ characterName: 'Inggo' });
  if (inggo) {
    // Bersihkan assets Inggo dari non-demonic altar
    if (inggo.assets) {
      inggo.assets = inggo.assets.filter(a => a.name !== 'Kendi Penyuling Gu Purba' && a.name !== 'Altar Bak Mandi Raga Vajra');
      inggo.markModified('assets');
    }
    // Set facilities Inggo ke standar yang bersih
    if (!inggo.cultivationLaw.facilities) inggo.cultivationLaw.facilities = {};
    inggo.cultivationLaw.facilities = {
      abyssalAltarTier: 0,
      bodyCauldronTier: 0,
      guCrucibleTier: inggo.cultivationLaw.facilities.guCrucibleTier || 1
    };
    inggo.markModified('cultivationLaw');
    await inggo.save();
    console.log('✓ Player Inggo cultivation facilities & assets cleaned.');

    // Kembalikan tile milik Inggo menjadi Lahan kosong
    await ZoneTile.updateOne(
      { ownerId: inggo.discordId, buildingName: 'Kendi Penyuling Gu Purba' },
      { $set: { buildingName: null, buildingType: null, label: `Lahan Milik ${inggo.characterName}` } }
    );
    console.log('✓ ZoneTile milik Inggo kembali menjadi Lahan Kosong siap pakai.');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
