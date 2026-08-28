/**
 * ============================================================================
 *  JIANHU BOT — SEED ECONOMY v4.0 (Wuxia & Era Progression, Extended)
 * ============================================================================
 *  Satu kali run = semua database ekonomi DIHAPUS TOTAL dan DIBUAT BARU.
 *  Progresi: Primitif -> Besi -> Teknologi -> Murim (Kultivasi).
 *  Fitur Utama:
 *   - Economy base dimulai dari Copper (100 Copper = 1 Silver).
 *   - Max primitive profit = 10 Copper/jam.
 *   - Max end-game profit = 41 Silver/jam (~10 Gold/hari).
 *   - 200 Items & 50 Assets, seimbang dan roleplay-heavy.
 *
 *  Cara pakai: node seed-economy-4.js
 * ============================================================================
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Item = require('./models/Item');
const Asset = require('./models/Asset');
const Pet = require('./models/Pet');
const Shop = require('./models/Shop');
const Player = require('./models/Player');
const PlayerListing = require('./models/PlayerListing');
const Auction = require('./models/Auction');

const itemCache = new Map();
function idOf(name) {
  const doc = itemCache.get(name);
  if (!doc) throw new Error(`[SEED] Item belum ada di cache: "${name}".`);
  return doc._id;
}

const itemsData = require('./seed-economy-4-items.js');
const buildAssetsDataExport = require('./seed-economy-4-assets.js');
const petsData = require('./seed-economy-4-pets.js');

async function upsertItem(data) {
  const filter = { guildId: 'DEFAULT_GUILD', name: data.name };
  const update = {
    $set: {
      rank: data.rank,
      category: data.category,
      tier: data.tier,
      description: data.description,
      basePrice: data.basePrice,
      priceCurrency: data.priceCurrency,
      createdBy: 'System Oracle'
    }
  };
  const doc = await Item.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  itemCache.set(data.name, doc);
  return doc;
}

async function upsertAsset(data) {
  const filter = { guildId: 'DEFAULT_GUILD', name: data.name };
  const update = {
    $set: {
      rank: data.rank,
      description: data.description,
      dailyProfit: data.dailyProfit || 0,
      profitCurrency: data.profitCurrency || 'copper',
      isCraftingStation: data.isCraftingStation || false,
      recipes: data.recipes || [],
      workerOutputItemName: data.workerOutputItemName || null,
      workerOutputQuantity: data.workerOutputQuantity || 0,
      workerInputMaterials: data.workerInputMaterials || [],
      constructionTimeHours: data.constructionTimeHours || 0,
      buildable: data.buildable || false,
      buildRequirements: data.buildRequirements || [],
      basePrice: data.basePrice || 0,
      priceCurrency: data.priceCurrency || 'copper',
      createdBy: 'System Oracle'
    }
  };

  if (data.workerOutputItemName) {
    update.$set.workerOutputItemId = idOf(data.workerOutputItemName);
  } else {
    // If it was nullified, we need to unset or nullify it
    update.$set.workerOutputItemId = null;
  }

  return Asset.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function upsertPet(data) {
  const filter = { guildId: 'DEFAULT_GUILD', name: data.name };
  const update = {
    $set: {
      rank: data.rank,
      tier: data.tier,
      description: data.description,
      baseHp: data.baseHp,
      baseAtk: data.baseAtk,
      element: data.element,
      basePrice: data.basePrice,
      priceCurrency: data.priceCurrency,
      createdBy: 'System Oracle'
    }
  };
  return Pet.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function seedEconomy() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI tidak ditemukan di file .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Terhubung ke MongoDB.');

    console.log('🔥 [1/5] MENGHAPUS SEMUA DATA EKONOMI LAMA...');
    await Item.deleteMany({});
    await Asset.deleteMany({});
    await Pet.deleteMany({});
    await Shop.deleteMany({});
    await PlayerListing.deleteMany({});
    await Auction.deleteMany({});

    await Player.updateMany({}, {
      $set: { inventory: [], assets: [], pets: [] },
      $unset: { totalWealth: 1 }
    });
    console.log('✅ Database berhasil di-wipe.');

    console.log(`📦 [2/5] SEEDING ${itemsData.length} ITEMS (Copper Economy & Weapons)...`);
    for (const item of itemsData) {
      await upsertItem(item);
    }
    console.log(`✅ ${itemsData.length} item berhasil ditambahkan.`);

    console.log('🏭 [3/5] SEEDING ASSETS (Epic Builds)...');
    const assetsData = buildAssetsDataExport(itemCache);
    for (const asset of assetsData) {
      await upsertAsset(asset);
    }
    console.log(`✅ ${assetsData.length} asset berhasil ditambahkan.`);

    console.log(`🐾 [4/5] SEEDING ${petsData.length} PETS...`);
    for (const pet of petsData) {
      await upsertPet(pet);
    }
    console.log(`✅ ${petsData.length} pet berhasil ditambahkan.`);

    console.log('🏪 [5/5] MENGATUR SYSTEM SHOP (Semua Item Starter Primitif)...');
    const starters = [
      'Batu Kasar', 'Kayu Mentah', 'Daun Kering', 'Batu Tajam', 'Tanah Liat', 'Serat Tumbuhan', 'Getah Pohon', 'Bulu Hewan',
      'Kapak Batu', 'Beliung Batu', 'Cangkul Kayu', 'Pancingan Bambu', 'Pisau Tulang',
      'Daging Mentah', 'Air Bersih', 'Buah Liar', 'Bibit Padi', 'Makanan Matang'
    ];

    let shopCount = 0;
    for (const name of starters) {
      const item = itemCache.get(name);
      if (!item) continue;
      await Shop.findOneAndUpdate(
        { guildId: 'DEFAULT_GUILD', refId: item._id },
        {
          $set: {
            category: 'item',
            refModel: 'Item',
            price: item.basePrice,
            priceCurrency: item.priceCurrency,
            stock: -1,
            isActive: true,
            addedBy: 'System Oracle'
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      shopCount++;
    }
    console.log(`✅ ${shopCount} item starter primitif ditambahkan ke System Shop.`);

    console.log('\n=============================================================');
    console.log('🎉 SEEDING SELESAI!');
    console.log('  Ekonomi Copper & Wuxia v4.0 berhasil di-deploy.');
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Error saat seeding:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Koneksi ditutup.');
  }
}

seedEconomy();
