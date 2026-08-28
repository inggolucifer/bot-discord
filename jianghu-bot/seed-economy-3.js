/**
 * ============================================================================
 *  JIANHU BOT — SEED ECONOMY v3.0 (Wuxia & Era Progression, Extreme Scaling)
 * ============================================================================
 *  Satu kali run = semua database ekonomi DIHAPUS TOTAL dan DIBUAT BARU.
 *  Progresi: Primitif -> Besi -> Teknologi -> Murim (Kultivasi).
 *  Fitur Utama:
 *   - Skala material raksasa (mencapai ratusan ribu bahan untuk tier akhir).
 *   - Waktu pembangunan epik (berhari-hari hingga berbulan-bulan ala Clash of Clans).
 *   - Hard limit income: maksimal ~1 Jade per 3 hari di level tertinggi.
 *   - Perputaran ekonomi bertumpu pada Player Trading (barter).
 *
 *  Cara pakai: node seed-economy-3.js
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

// Cache
const itemCache = new Map();

function idOf(name) {
  const doc = itemCache.get(name);
  if (!doc) throw new Error(`[SEED] Item belum ada di cache: "${name}".`);
  return doc._id;
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================
async function seedEconomy() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI tidak ditemukan di file .env');
    }

    // Sambung MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Terhubung ke MongoDB.');

    // Setup Dummy GuildId untuk Seeders jika menggunakan logika default bot
    const guildId = 'DEFAULT_GUILD';

    // 1. WIPE SELURUH DATABASE EKONOMI
    console.log('🔥 [1/7] MENGHAPUS SEMUA DATA EKONOMI...');
    await Item.deleteMany({});
    await Asset.deleteMany({});
    await Pet.deleteMany({});
    await Shop.deleteMany({});
    await PlayerListing.deleteMany({});
    await Auction.deleteMany({});

    // Kosongkan inventory, asset, dan pet dari semua player
    await Player.updateMany({}, {
      $set: { inventory: [], assets: [], pets: [] },
      $unset: { totalWealth: 1 } // Biar pre-save hook ngitung ulang ntar
    });
    console.log('✅ Semua database ekonomi dan inventory player telah dibersihkan!\n');

    // Nanti di Step 2 kita akan buat item, dst. (Saya buat skeleton-nya dulu untuk di-test eksekusi syntax-nya)
    await runSeeder();

    console.log('\n=============================================================');
    console.log('🎉 SEEDING SELESAI!');
    console.log('  Ekonomi baru Era Primitif -> Murim berhasil di-deploy.');
    console.log('  Waktu pembangunan diperpanjang, skala resource raksasa.');
    console.log('=============================================================');
  } catch (err) {
    console.error('❌ Error saat seeding:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Koneksi ditutup.');
  }
}

seedEconomy();

// Import dummy data item
const fs = require('fs');
const itemsData = require('./seed-economy-3-items.js');

// Modifikasi script seeding
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

async function buildItems() {
  console.log('📦 [2/7] SEEDING ITEMS...');
  for (const item of itemsData) {
    await upsertItem(item);
  }
  console.log(`✅ ${itemsData.length} item berhasil ditambahkan.`);
}

// Import dummy data asset
const buildAssetsDataExport = require('./seed-economy-3-assets.js');

async function upsertAsset(data) {
  const filter = { guildId: 'DEFAULT_GUILD', name: data.name };
  const update = {
    $set: {
      rank: data.rank,
      description: data.description,
      dailyProfit: data.dailyProfit || 0,
      profitCurrency: data.profitCurrency || 'silver',
      isCraftingStation: data.isCraftingStation || false,
      recipes: data.recipes || [],
      workerOutputItemName: data.workerOutputItemName || null,
      workerOutputQuantity: data.workerOutputQuantity || 0,
      workerInputMaterials: data.workerInputMaterials || [],
      constructionTimeHours: data.constructionTimeHours || 0,
      buildable: data.buildable || false,
      buildRequirements: data.buildRequirements || [],
      basePrice: data.basePrice || 0,
      priceCurrency: data.priceCurrency || 'silver',
      createdBy: 'System Oracle'
    }
  };

  // Convert outputItemName to outputItemId
  if (data.workerOutputItemName) {
    update.$set.workerOutputItemId = idOf(data.workerOutputItemName);
  }

  const doc = await Asset.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  return doc;
}

async function buildAssets() {
  console.log('🏭 [3/7] SEEDING ASSETS (Era Progression & Epic Builds)...');
  const assetsData = buildAssetsDataExport(itemCache);
  for (const asset of assetsData) {
    await upsertAsset(asset);
  }
  console.log(`✅ ${assetsData.length} asset berhasil ditambahkan.`);
}

// Import dummy data pets
const petsData = require('./seed-economy-3-pets.js');

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

async function buildPets() {
  console.log('🐾 [4/7] SEEDING PETS...');
  for (const pet of petsData) {
    await upsertPet(pet);
  }
  console.log(`✅ ${petsData.length} pet berhasil ditambahkan.`);
}

async function buildShop() {
  console.log('🏪 [5/7] MENGATUR SYSTEM SHOP (Hanya Starter Primitif)...');

  // Hanya jual item-item dasar di System Shop
  const starters = [
    'Batu Kasar', 'Kayu Mentah', 'Daun Kering', 'Batu Tajam',
    'Kapak Batu', 'Beliung Batu', 'Daging Mentah', 'Air Bersih', 'Bibit Padi'
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
  console.log('💡 Item era Besi, Teknologi, dan Murim HANYA BISA didapat melalui player crafting dan player shop/barter.');
}

// Eksekusi semua secara sekuensial
async function runSeeder() {
  await buildItems();
  await buildAssets();
  await buildPets();
  await buildShop();
}
