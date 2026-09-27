const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Player = require('../models/Player');
const Item = require('../models/Item');

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu-bot');
  console.log('=== 1. DIAGNOSIS KARAKTER INGGO ===');
  const inggo = await Player.findOne({ characterName: 'Inggo' });
  if (inggo) {
    console.log({
      characterName: inggo.characterName,
      lawType: inggo.cultivationLaw?.activeLawType,
      rank: inggo.cultivationLaw?.rank,
      stage: inggo.cultivationLaw?.stage,
      qi: inggo.cultivationLaw?.qi,
      maxQi: inggo.cultivationLaw?.maxQi,
      guSlots: inggo.cultivationLaw?.guSlots,
      currency: inggo.currency,
      inventoryCount: (inggo.inventory || []).length
    });
  }

  console.log('\n=== 2. SAMPLE ITEMS DI DATABASE ===');
  const items = await Item.find({}).limit(20).lean();
  console.log(`Total item di katalog: ${await Item.countDocuments()}`);
  const categories = await Item.distinct('category');
  console.log('Kategori yang ada:', categories);

  const herbs = await Item.find({ category: { $in: ['herb', 'consume', 'material'] } }).limit(10).lean();
  console.log('Contoh Bahan/Herba/Consume:', herbs.map(h => ({ name: h.name, category: h.category, rank: h.rank })));

  await mongoose.connection.close();
}

diagnose().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
