require('dotenv').config();
const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const Item = require('../models/Item');

const GUILD_ID = '1537840876578148392';

// HANYA DEMONIC CULTIVATION (KONTRAK ABYSS) YANG MEMERLUKAN ALTAR DI LAHAN PETA!
const DEMONIC_ALTAR_ASSET = {
  name: 'Altar Kurban Darah Abyss',
  rank: 'Uncommon',
  description: 'Altar persembahan darah gelap bertatahkan batu obsidian jurang Abyss untuk menyembah entitas iblis kuno dan memperpanjang kontrak iblis.',
  basePrice: 50,
  priceCurrency: 'silver',
  dailyProfit: 0,
  profitCurrency: 'copper',
  isCraftingStation: true,
  buildable: true,
  constructionTimeHours: 1,
  minRealmIndex: 0,
  materialNames: [
    { name: 'Batu Obsidian Hitam Abyss', quantity: 3 },
    { name: 'Botol Esensi Darah Segar', quantity: 2 }
  ]
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Bersihkan asset non-demonic altar yang sempat ter-seed
  await Asset.deleteMany({
    name: {
      $in: [
        'Altar Bak Mandi Raga Vajra',
        'Kendi Penyuling Gu Purba',
        'Altar Tempa Jiwa Nether',
        'Kandang Penangkaran Siluman',
        'Altar Pagoda Resonansi Elemen'
      ]
    }
  });
  console.log('✓ Membersihkan entri non-demonic altar dari koleksi Asset.');

  // Upsert Altar Kurban Darah Abyss (Khusus Demonic Abyssal Pact)
  const buildRequirements = [];
  for (const mat of DEMONIC_ALTAR_ASSET.materialNames) {
    const itemDoc = await Item.findOne({ name: mat.name });
    buildRequirements.push({
      itemId: itemDoc ? itemDoc._id : new mongoose.Types.ObjectId(),
      itemName: mat.name,
      quantity: mat.quantity,
      durabilityHours: 1
    });
  }

  const payload = {
    guildId: GUILD_ID,
    name: DEMONIC_ALTAR_ASSET.name,
    rank: DEMONIC_ALTAR_ASSET.rank,
    description: DEMONIC_ALTAR_ASSET.description,
    basePrice: DEMONIC_ALTAR_ASSET.basePrice,
    priceCurrency: DEMONIC_ALTAR_ASSET.priceCurrency,
    dailyProfit: DEMONIC_ALTAR_ASSET.dailyProfit,
    profitCurrency: DEMONIC_ALTAR_ASSET.profitCurrency,
    isCraftingStation: DEMONIC_ALTAR_ASSET.isCraftingStation,
    buildable: DEMONIC_ALTAR_ASSET.buildable,
    constructionTimeHours: DEMONIC_ALTAR_ASSET.constructionTimeHours,
    minRealmIndex: DEMONIC_ALTAR_ASSET.minRealmIndex,
    buildRequirements,
    recipes: []
  };

  await Asset.findOneAndUpdate(
    { name: DEMONIC_ALTAR_ASSET.name },
    { $set: payload },
    { upsert: true, new: true }
  );
  console.log(`✓ Upserted Demonic Altar Asset: ${DEMONIC_ALTAR_ASSET.name}`);

  console.log('\n🎉 Selesai mengonfigurasi Altar Kurban Darah Abyss khusus Demonic Cultivation!');
  await mongoose.disconnect();
}

main().catch(console.error);
