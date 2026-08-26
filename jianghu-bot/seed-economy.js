/**
 * ============================================================================
 *  JIANHU BOT — SEED ECONOMY v3.0 FINAL (Complete · Fair · Long-term Stable)
 * ============================================================================
 *  Satu kali run = semua item, asset, pet, shop tersinkron & diperbaiki.
 *  Desain: Era Batu → Besi → Industri/Murim → Tinggi → Kultivasi.
 *  Output rendah + input wajib + rantai panjang → barter & player shop hidup.
 *  ROI mengikuti ECONOMY_ORACLE. Max 1 Jade/hari individu.
 *
 *  Cara pakai:  node seed-economy.js
 * ============================================================================
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Item   = require('./models/Item');
const Asset  = require('./models/Asset');
const Pet    = require('./models/Pet');
const Shop   = require('./models/Shop');
const Player = require('./models/Player');

// ---------------------------------------------------------------------------
// CACHE & HELPERS
// ---------------------------------------------------------------------------
const itemCache  = new Map();
const assetCache = new Map();
const petCache   = new Map();

function idOf(name) {
  const doc = itemCache.get(name);
  if (!doc) throw new Error(`[SEED] Item belum ada di cache: "${name}". Pastikan urutan create benar.`);
  return doc._id;
}

async function upsertItem(data) {
  const filter = { guildId: data.guildId, name: data.name };
  const update = {
    $set: {
      rank: data.rank || 'Common',
      category: data.category || 'none',
      tier: data.tier ?? 1,
      description: data.description || '-',
      effect: data.effect || null,
      origin: data.origin || null,
      basePrice: data.basePrice ?? 0,
      priceCurrency: data.priceCurrency || 'silver',
      imageUrl: data.imageUrl || null,
      createdBy: 'System Oracle',
    },
  };
  const doc = await Item.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  itemCache.set(data.name, doc);
  return doc;
}

async function upsertAsset(data) {
  const filter = { guildId: data.guildId, name: data.name };
  const clean = { ...data };
  delete clean.guildId;
  delete clean.name;
  // Paksa update SEMUA field ekonomi (termasuk yang lama tidak seimbang)
  const doc = await Asset.findOneAndUpdate(
    filter,
    {
      $set: {
        description: clean.description ?? '-',
        rank: clean.rank ?? 'Common',
        dailyProfit: clean.dailyProfit ?? 0,
        profitCurrency: clean.profitCurrency ?? 'silver',
        isCraftingStation: clean.isCraftingStation ?? false,
        recipes: clean.recipes ?? [],
        workerOutputItemId: clean.workerOutputItemId ?? null,
        workerOutputItemName: clean.workerOutputItemName ?? null,
        workerOutputQuantity: clean.workerOutputQuantity ?? 0,
        workerInputMaterials: clean.workerInputMaterials ?? [],
        basePrice: clean.basePrice ?? 0,
        priceCurrency: clean.priceCurrency ?? 'silver',
        constructionTimeHours: clean.constructionTimeHours ?? 0,
        buildable: clean.buildable ?? false,
        buildRequirements: clean.buildRequirements ?? [],
        imageUrl: clean.imageUrl ?? null,
        createdBy: 'System Oracle',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
  assetCache.set(data.name, doc);
  return doc;
}

async function upsertPet(data) {
  const filter = { guildId: data.guildId, name: data.name };
  const update = {
    $set: {
      rank: data.rank || 'Common',
      tier: data.tier ?? 1,
      description: data.description || '-',
      effect: data.effect || null,
      origin: data.origin || null,
      baseHp: data.baseHp ?? 50,
      baseAtk: data.baseAtk ?? 10,
      baseDef: data.baseDef ?? 5,
      baseSpd: data.baseSpd ?? 8,
      maxLevel: data.maxLevel ?? 100,
      element: data.element || 'Netral',
      growthRate: data.growthRate ?? 1.0,
      basePrice: data.basePrice ?? 0,
      priceCurrency: data.priceCurrency || 'silver',
      imageUrl: data.imageUrl || null,
      createdBy: 'System Oracle',
    },
  };
  const doc = await Pet.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  petCache.set(data.name, doc);
  return doc;
}

async function upsertShop({ guildId, category, refId, refModel, price, priceCurrency, stock = -1 }) {
  await Shop.findOneAndUpdate(
    { guildId, refId },
    { $set: { category, refModel, price, priceCurrency, stock, isActive: true, addedBy: 'System Oracle' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ---------------------------------------------------------------------------
// ITEM BUILDER
// ---------------------------------------------------------------------------
function buildAllItems(guildId) {
  const g = (o) => ({ guildId, createdBy: 'System Oracle', ...o });
  const items = [];

  // TOOLS
  const tools = [
    g({ name: 'Batu Tajam', rank: 'Common', category: 'material', tier: 1, description: 'Batu yang ditajamkan. Alat paling primitif.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Kapak Batu', rank: 'Common', category: 'consume', tier: 1, description: 'Kapak batu + kayu. Penebangan ringan.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Tombak Kayu', rank: 'Common', category: 'consume', tier: 1, description: 'Tombak berburu hewan kecil.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Alat Pancing Kayu', rank: 'Common', category: 'consume', tier: 1, description: 'Kail bambu sederhana.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Pisau Tulang', rank: 'Common', category: 'consume', tier: 1, description: 'Pisau dari tulang hewan.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Pengikis Kulit', rank: 'Common', category: 'consume', tier: 1, description: 'Alat menguliti hewan.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Cangkul Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Cangkul besi dasar pertanian.', basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Kapak Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Kapak besi kokoh.', basePrice: 45, priceCurrency: 'silver' }),
    g({ name: 'Beliung Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Alat tambang bijih dangkal.', basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Pisau Jagal', rank: 'Common', category: 'consume', tier: 1, description: 'Pisau memproses daging & kulit.', basePrice: 35, priceCurrency: 'silver' }),
    g({ name: 'Gergaji Besi', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Gergaji memotong kayu jadi papan.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Palu Tempa', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Palu penempa logam.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Alat Tenun Sederhana', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Alat tenun tangan.', basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Jarum Jahit Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Jarum untuk menjahit kain & kulit.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Sekop Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Sekop untuk menggali tanah.', basePrice: 35, priceCurrency: 'silver' }),
    g({ name: 'Beliung Baja Hitam', rank: 'Rare', category: 'consume', tier: 3, description: 'Menambang mineral mistis.', basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Pisau Bedah Qi', rank: 'Rare', category: 'consume', tier: 3, description: 'Bedah spirit beast tanpa merusak energi.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Palu Formasi Array', rank: 'Epic', category: 'consume', tier: 5, description: 'Palu penempa pusaka & array.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Cangkul Giok', rank: 'Epic', category: 'consume', tier: 5, description: 'Tidak merusak akar herbal roh.', basePrice: 25, priceCurrency: 'gold' }),
    g({ name: 'Kapak Petir Surgawi', rank: 'Epic', category: 'consume', tier: 5, description: 'Membelah kayu dewa.', basePrice: 1, priceCurrency: 'jade' }),
    g({ name: 'Beliung Penekan Qi', rank: 'Legendary', category: 'consume', tier: 7, description: 'Menekan ledakan energi bumi.', basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Jarum Meridian', rank: 'Epic', category: 'consume', tier: 5, description: 'Jarum akupunktur kultivator.', basePrice: 30, priceCurrency: 'gold' }),
    g({ name: 'Kuas Jimat', rank: 'Rare', category: 'consume', tier: 3, description: 'Kuas menuliskan jimat.', basePrice: 5, priceCurrency: 'gold' }),
  ];
  items.push(...tools);

  // SEEDS FOOD
  const food = [
    g({ name: 'Buah Liar', rank: 'Common', category: 'consume', tier: 1, description: 'Buah hutan darurat.', basePrice: 1, priceCurrency: 'silver', effect: 'Memulihkan 5 Hunger' }),
    g({ name: 'Daging Mentah', rank: 'Common', category: 'consume', tier: 1, description: 'Daging buruan. Harus dimasak.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Kayu Bakar', rank: 'Common', category: 'consume', tier: 1, description: 'Ranting kering.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Air Bersih', rank: 'Common', category: 'consume', tier: 1, description: 'Air sungai bersih.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Bibit Gandum', rank: 'Common', category: 'material', tier: 1, description: 'Biji gandum.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Padi', rank: 'Common', category: 'material', tier: 1, description: 'Bibit padi air.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Kapas', rank: 'Common', category: 'material', tier: 1, description: 'Serat kapas.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Bibit Anggur', rank: 'Common', category: 'material', tier: 1, description: 'Biji anggur.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Bibit Bambu', rank: 'Common', category: 'material', tier: 1, description: 'Tunas bambu.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Sayur', rank: 'Common', category: 'material', tier: 1, description: 'Campuran sayur dapur.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Bibit Jagung', rank: 'Common', category: 'material', tier: 1, description: 'Bibit jagung.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Kedelai', rank: 'Common', category: 'material', tier: 1, description: 'Bibit kedelai.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Teh', rank: 'Uncommon', category: 'material', tier: 2, description: 'Bibit pohon teh.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Pakan Ternak', rank: 'Common', category: 'consume', tier: 1, description: 'Rumput + dedak.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Roti Panggang', rank: 'Common', category: 'consume', tier: 1, description: 'Roti pekerja.', basePrice: 15, priceCurrency: 'silver', effect: 'Memulihkan 15 Hunger' }),
    g({ name: 'Nasi Putih', rank: 'Common', category: 'consume', tier: 1, description: 'Nasi pulen.', basePrice: 18, priceCurrency: 'silver', effect: 'Memulihkan 18 Hunger' }),
    g({ name: 'Daging Bakar', rank: 'Common', category: 'consume', tier: 1, description: 'Daging panggang.', basePrice: 12, priceCurrency: 'silver', effect: 'Memulihkan 20 Hunger' }),
    g({ name: 'Sup Tulang', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Sup bergizi tinggi.', basePrice: 30, priceCurrency: 'silver', effect: 'Memulihkan 35 Hunger' }),
    g({ name: 'Bibit Ginseng Darah', rank: 'Rare', category: 'material', tier: 3, description: 'Bibit ginseng penguat darah.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Bibit Teratai Roh', rank: 'Epic', category: 'material', tier: 5, description: 'Benih teratai penyerap energi.', basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Bibit Rumput Sumsum', rank: 'Epic', category: 'material', tier: 5, description: 'Bibit herbal perombak tulang.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Bibit Bunga Bulan', rank: 'Rare', category: 'material', tier: 3, description: 'Bunga yang mekar di malam hari.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Bibit Akar Naga', rank: 'Legendary', category: 'material', tier: 7, description: 'Akar yang menyerap Qi bumi.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Daun Bambu Hitam', rank: 'Rare', category: 'material', tier: 3, description: 'Pakan spirit beast vegetarian.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Pakan Spirit Beast', rank: 'Rare', category: 'consume', tier: 3, description: 'Makanan berenergi tinggi.', basePrice: 5, priceCurrency: 'gold' }),
    g({ name: 'Pil Nutrisi Pekerja', rank: 'Epic', category: 'consume', tier: 5, description: 'Pil agar tidak lapar seharian.', basePrice: 80, priceCurrency: 'gold', effect: 'Memulihkan 100 Hunger' }),
    g({ name: 'Pil Nutrisi Tinggi', rank: 'Legendary', category: 'consume', tier: 7, description: 'Nutrisi untuk pekerja realm tinggi.', basePrice: 3, priceCurrency: 'jade', effect: 'Memulihkan 200 Hunger' }),
  ];
  items.push(...food);

  // RAW
  const raw = [
    g({ name: 'Gandum', rank: 'Common', category: 'material', tier: 1, description: 'Biji gandum mentah.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Padi Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Padi belum ditumbuk.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Kapas Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Kapas putih.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Jagung Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Jagung segar.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Kedelai Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Kedelai segar.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Anggur Segar', rank: 'Common', category: 'consume', tier: 1, description: 'Anggur ranum.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Daun Teh Mentah', rank: 'Uncommon', category: 'material', tier: 2, description: 'Daun teh segar.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Telur Mentah', rank: 'Common', category: 'consume', tier: 1, description: 'Telur ayam.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Susu Sapi', rank: 'Common', category: 'consume', tier: 1, description: 'Susu segar.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Susu Kambing', rank: 'Common', category: 'consume', tier: 1, description: 'Susu kambing.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Kulit Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Kulit hewan.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Wol Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Bulu domba.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bulu Ayam', rank: 'Common', category: 'material', tier: 1, description: 'Bulu untuk bantal/panah.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Ikan Air Tawar', rank: 'Common', category: 'consume', tier: 1, description: 'Ikan sungai.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Ikan Laut', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Ikan laut bergizi.', basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Udang Sungai', rank: 'Common', category: 'consume', tier: 1, description: 'Udang air tawar.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Madu Liar', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Madu lebah hutan.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Lilinya Lebah', rank: 'Uncommon', category: 'material', tier: 2, description: 'Lilin alami.', basePrice: 12, priceCurrency: 'silver' }),
    g({ name: 'Tanah Liat', rank: 'Common', category: 'material', tier: 1, description: 'Lumpur pembuat bata.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Tanah Liat Merah', rank: 'Uncommon', category: 'material', tier: 2, description: 'Tanah genteng.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Batu Kasar', rank: 'Common', category: 'material', tier: 1, description: 'Batu fana.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Pasir Putih', rank: 'Common', category: 'material', tier: 1, description: 'Pasir kaca & bangunan.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Batu Kapur', rank: 'Common', category: 'material', tier: 1, description: 'Bahan semen.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Air Laut', rank: 'Common', category: 'material', tier: 1, description: 'Bahan garam.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Garam Kasar', rank: 'Common', category: 'material', tier: 1, description: 'Garam penguapan.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Kerikil Sungai', rank: 'Common', category: 'material', tier: 1, description: 'Kerikil untuk konstruksi.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Kayu Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Kayu segar hutan.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Bambu', rank: 'Common', category: 'material', tier: 1, description: 'Batang bambu.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Kayu Pinus', rank: 'Common', category: 'material', tier: 1, description: 'Kayu pinus harum.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Kayu Jati', rank: 'Uncommon', category: 'material', tier: 2, description: 'Kayu jati tahan lama.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Kayu Ulin (Ironwood)', rank: 'Rare', category: 'material', tier: 3, description: 'Kayu sekeras besi.', basePrice: 4, priceCurrency: 'gold' }),
    g({ name: 'Kayu Persik Berdarah', rank: 'Rare', category: 'material', tier: 3, description: 'Penolak bala, serap Yang.', basePrice: 6, priceCurrency: 'gold' }),
    g({ name: 'Bambu Hitam (Black Bamboo)', rank: 'Rare', category: 'material', tier: 3, description: 'Tahan tebasan pedang.', basePrice: 5, priceCurrency: 'gold' }),
    g({ name: 'Kayu Sandalwood', rank: 'Rare', category: 'material', tier: 3, description: 'Kayu harum untuk dupa & pusaka.', basePrice: 7, priceCurrency: 'gold' }),
    g({ name: 'Kayu Surga (Heavenly Wood)', rank: 'Legendary', category: 'material', tier: 7, description: 'Pilar istana dewa.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Kayu Jiwa (Soulwood)', rank: 'Legendary', category: 'material', tier: 7, description: 'Kayu yang menyimpan jiwa.', basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Batu Bara', rank: 'Common', category: 'material', tier: 1, description: 'Bahan bakar tungku.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bijih Tembaga', rank: 'Common', category: 'material', tier: 1, description: 'Logam kemerahan.', basePrice: 6, priceCurrency: 'silver' }),
    g({ name: 'Bijih Timah', rank: 'Common', category: 'material', tier: 1, description: 'Logam lunak.', basePrice: 6, priceCurrency: 'silver' }),
    g({ name: 'Bijih Besi', rank: 'Uncommon', category: 'material', tier: 2, description: 'Logam keras dasar.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Bijih Perak', rank: 'Uncommon', category: 'material', tier: 2, description: 'Logam putih.', basePrice: 25, priceCurrency: 'silver' }),
    g({ name: 'Bijih Emas', rank: 'Rare', category: 'material', tier: 3, description: 'Logam berharga.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Bijih Timbal', rank: 'Common', category: 'material', tier: 1, description: 'Logam berat.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Bijih Seng', rank: 'Common', category: 'material', tier: 1, description: 'Logam paduan.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Batu Meteor Api', rank: 'Rare', category: 'material', tier: 3, description: 'Batu panas langit.', basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Bijih Besi Dingin (Cold Iron)', rank: 'Epic', category: 'material', tier: 5, description: 'Aura es.', basePrice: 20, priceCurrency: 'gold' }),
    g({ name: 'Bijih Giok Roh', rank: 'Epic', category: 'material', tier: 5, description: 'Penampung Qi alam.', basePrice: 25, priceCurrency: 'gold' }),
    g({ name: 'Bijih Mithril', rank: 'Epic', category: 'material', tier: 5, description: 'Logam ringan sekuat baja.', basePrice: 40, priceCurrency: 'gold' }),
    g({ name: 'Pecahan Batu Roh', rank: 'Epic', category: 'material', tier: 5, description: 'Mata uang kultivasi rendah.', basePrice: 40, priceCurrency: 'gold' }),
    g({ name: 'Kristal Roh Ilahi', rank: 'Legendary', category: 'material', tier: 7, description: 'Inti formasi tinggi.', basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Bijih Star Iron', rank: 'Legendary', category: 'material', tier: 7, description: 'Besi bintang jatuh.', basePrice: 5, priceCurrency: 'jade' }),
    g({ name: 'Inti Bumi', rank: 'Mythical', category: 'material', tier: 9, description: 'Inti energi bumi purba.', basePrice: 1, priceCurrency: 'spirit' }),
    g({ name: 'Ginseng Darah', rank: 'Rare', category: 'herb', tier: 3, description: 'Ginseng merah penguat darah.', basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Rumput Pembersih Sumsum', rank: 'Epic', category: 'herb', tier: 5, description: 'Bahan pil pondasi.', basePrice: 35, priceCurrency: 'gold' }),
    g({ name: 'Teratai Roh Langit', rank: 'Legendary', category: 'herb', tier: 7, description: 'Membentuk fondasi.', basePrice: 8, priceCurrency: 'jade' }),
    g({ name: 'Bunga Bulan', rank: 'Rare', category: 'herb', tier: 3, description: 'Mekar di malam, serap Yin.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Akar Naga', rank: 'Legendary', category: 'herb', tier: 7, description: 'Akar penyerap Qi bumi.', basePrice: 10, priceCurrency: 'jade' }),
    g({ name: 'Daun Longevity', rank: 'Epic', category: 'herb', tier: 5, description: 'Memperpanjang umur sedikit.', basePrice: 50, priceCurrency: 'gold' }),
    g({ name: 'Bunga Api Surgawi', rank: 'Epic', category: 'herb', tier: 5, description: 'Bunga elemen api.', basePrice: 45, priceCurrency: 'gold' }),
    g({ name: 'Rumput Es Abadi', rank: 'Epic', category: 'herb', tier: 5, description: 'Rumput elemen es.', basePrice: 45, priceCurrency: 'gold' }),
    g({ name: 'Darah Spirit Beast', rank: 'Rare', category: 'material', tier: 3, description: 'Tinta talisman & baja darah.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Kepompong Ulat Salju', rank: 'Epic', category: 'material', tier: 5, description: 'Benang sutra abadi.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Tanduk Unicorn Muda', rank: 'Epic', category: 'material', tier: 5, description: 'Tanduk penyucian.', basePrice: 60, priceCurrency: 'gold' }),
    g({ name: 'Sisik Naga Muda', rank: 'Legendary', category: 'material', tier: 7, description: 'Sisik naga tingkat rendah.', basePrice: 5, priceCurrency: 'jade' }),
    g({ name: 'Hati Phoenix', rank: 'Legendary', category: 'material', tier: 7, description: 'Hati burung api.', basePrice: 8, priceCurrency: 'jade' }),
  ];
  items.push(...raw);

  // PROCESSED
  const processed = [
    g({ name: 'Batu Bata', rank: 'Common', category: 'material', tier: 1, description: 'Tanah liat bakar.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Genteng Keramik', rank: 'Uncommon', category: 'material', tier: 2, description: 'Genteng atap kokoh.', basePrice: 25, priceCurrency: 'silver' }),
    g({ name: 'Papan Kayu', rank: 'Common', category: 'material', tier: 1, description: 'Kayu dihaluskan.', basePrice: 6, priceCurrency: 'silver' }),
    g({ name: 'Balok Batu', rank: 'Common', category: 'material', tier: 1, description: 'Batu dipahat.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Kaca Kusam', rank: 'Common', category: 'material', tier: 1, description: 'Kaca lebur pasir.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Semen Mentah', rank: 'Uncommon', category: 'material', tier: 2, description: 'Campuran kapur.', basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Tepung Terigu', rank: 'Common', category: 'material', tier: 1, description: 'Gandum digiling.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Beras Putih', rank: 'Common', category: 'material', tier: 1, description: 'Padi ditumbuk.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Tepung Jagung', rank: 'Common', category: 'material', tier: 1, description: 'Jagung digiling.', basePrice: 7, priceCurrency: 'silver' }),
    g({ name: 'Tahu', rank: 'Common', category: 'consume', tier: 1, description: 'Olahan kedelai.', basePrice: 10, priceCurrency: 'silver', effect: 'Memulihkan 12 Hunger' }),
    g({ name: 'Kain Katun', rank: 'Common', category: 'material', tier: 1, description: 'Kain tenun kapas.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Benang Wol', rank: 'Common', category: 'material', tier: 1, description: 'Wol dipintal.', basePrice: 12, priceCurrency: 'silver' }),
    g({ name: 'Kain Wol', rank: 'Uncommon', category: 'material', tier: 2, description: 'Kain wol hangat.', basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Kulit Samak', rank: 'Uncommon', category: 'material', tier: 2, description: 'Kulit disamak.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Keju', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Olahan susu.', basePrice: 25, priceCurrency: 'silver', effect: 'Memulihkan 25 Hunger' }),
    g({ name: 'Ikan Asin', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Ikan diawetkan.', basePrice: 18, priceCurrency: 'silver', effect: 'Memulihkan 22 Hunger' }),
    g({ name: 'Anggur Merah (Wine)', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Fermentasi anggur.', basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Arak Beras (Sake)', rank: 'Rare', category: 'consume', tier: 3, description: 'Minuman murim.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Teh Hijau', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Teh kualitas baik.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Madu Murni', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Madu disaring.', basePrice: 25, priceCurrency: 'silver' }),
    g({ name: 'Batangan Tembaga', rank: 'Common', category: 'material', tier: 1, description: 'Tembaga dilebur.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Batangan Timah', rank: 'Common', category: 'material', tier: 1, description: 'Timah murni.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Perunggu', rank: 'Uncommon', category: 'material', tier: 2, description: 'Paduan tembaga+timah.', basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Batangan Besi', rank: 'Uncommon', category: 'material', tier: 2, description: 'Besi dilebur.', basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Baja Keras', rank: 'Rare', category: 'material', tier: 3, description: 'Besi ditempa berulang.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Batangan Emas', rank: 'Rare', category: 'material', tier: 3, description: 'Emas murni.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Batangan Perak', rank: 'Uncommon', category: 'material', tier: 2, description: 'Perak murni.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Kuningan', rank: 'Uncommon', category: 'material', tier: 2, description: 'Paduan tembaga+seng.', basePrice: 45, priceCurrency: 'silver' }),
    g({ name: 'Baja Hitam Mistis', rank: 'Epic', category: 'material', tier: 5, description: 'Logam senjata roh.', basePrice: 60, priceCurrency: 'gold' }),
    g({ name: 'Batangan Besi Dingin', rank: 'Epic', category: 'material', tier: 5, description: 'Besi dingin dilebur.', basePrice: 150, priceCurrency: 'gold' }),
    g({ name: 'Baja Darah (Blood Steel)', rank: 'Epic', category: 'material', tier: 5, description: 'Direndam darah beast.', basePrice: 180, priceCurrency: 'gold' }),
    g({ name: 'Batangan Mithril', rank: 'Epic', category: 'material', tier: 5, description: 'Mithril murni.', basePrice: 200, priceCurrency: 'gold' }),
    g({ name: 'Sutra Ulat Salju', rank: 'Epic', category: 'material', tier: 5, description: 'Kain sekuat baja.', basePrice: 100, priceCurrency: 'gold' }),
    g({ name: 'Jimat Giok Roh', rank: 'Legendary', category: 'material', tier: 7, description: 'Media array tertinggi.', basePrice: 6, priceCurrency: 'jade' }),
    g({ name: 'Kertas Jimat', rank: 'Rare', category: 'material', tier: 3, description: 'Kertas roh.', basePrice: 20, priceCurrency: 'gold' }),
    g({ name: 'Batu Roh Utuh', rank: 'Legendary', category: 'material', tier: 7, description: 'Batu roh dipadatkan.', basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Benang Jiwa', rank: 'Legendary', category: 'material', tier: 7, description: 'Benang dari kayu jiwa.', basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Pelat Star Iron', rank: 'Legendary', category: 'material', tier: 7, description: 'Pelat besi bintang.', basePrice: 8, priceCurrency: 'jade' }),
  ];
  items.push(...processed);

  // PILLS
  const pills = [
    g({ name: 'Pil Pemulih Luka Ringan', rank: 'Uncommon', category: 'pill', tier: 2, description: 'Menutup luka luar.', basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Pil Pemulih Luka Berat', rank: 'Rare', category: 'pill', tier: 3, description: 'Menyembuhkan luka dalam.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Pil Pengumpul Qi', rank: 'Epic', category: 'pill', tier: 5, description: 'Sirkulasi Qi besar.', basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Pil Pembersih Meridian', rank: 'Epic', category: 'pill', tier: 5, description: 'Membersihkan sumbatan.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Pil Penempa Tulang', rank: 'Legendary', category: 'pill', tier: 7, description: 'Membangun ulang tulang.', basePrice: 15, priceCurrency: 'jade' }),
    g({ name: 'Pil Loncatan Realm', rank: 'Legendary', category: 'pill', tier: 7, description: 'Bantu terobosan realm (risiko).', basePrice: 25, priceCurrency: 'jade' }),
    g({ name: 'Pil Keabadian Semu', rank: 'Mythical', category: 'pill', tier: 9, description: 'Perpanjang umur signifikan.', basePrice: 1, priceCurrency: 'spirit' }),
    g({ name: 'Pil Detoksifikasi', rank: 'Rare', category: 'pill', tier: 3, description: 'Membersihkan racun.', basePrice: 4, priceCurrency: 'gold' }),
    g({ name: 'Pil Penguat Tubuh', rank: 'Rare', category: 'pill', tier: 3, description: 'Meningkatkan ketahanan fisik.', basePrice: 5, priceCurrency: 'gold' }),
    g({ name: 'Pil Pemurnian Darah', rank: 'Epic', category: 'pill', tier: 5, description: 'Memurnikan darah kultivator.', basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Pil Jiwa Stabil', rank: 'Legendary', category: 'pill', tier: 7, description: 'Menstabilkan jiwa setelah trauma.', basePrice: 12, priceCurrency: 'jade' }),
    g({ name: 'Pil Ascension', rank: 'Mythical', category: 'pill', tier: 9, description: 'Membantu loncatan ke Immortal.', basePrice: 3, priceCurrency: 'spirit' }),
  ];
  items.push(...pills);

  // WEAPONS
  const weapons = [
    g({ name: 'Pedang Besi Biasa', rank: 'Common', category: 'weapon', tier: 1, description: 'Pedang standar desa.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Tombak Besi', rank: 'Common', category: 'weapon', tier: 1, description: 'Tombak perang dasar.', basePrice: 70, priceCurrency: 'silver' }),
    g({ name: 'Kapak Perang Besi', rank: 'Common', category: 'weapon', tier: 1, description: 'Kapak dua tangan.', basePrice: 90, priceCurrency: 'silver' }),
    g({ name: 'Busur Kayu', rank: 'Common', category: 'weapon', tier: 1, description: 'Busur pendekar desa.', basePrice: 60, priceCurrency: 'silver' }),
    g({ name: 'Pedang Baja', rank: 'Uncommon', category: 'weapon', tier: 2, description: 'Pedang baja keras.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Tombak Baja', rank: 'Uncommon', category: 'weapon', tier: 2, description: 'Tombak baja.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Pedang Perunggu', rank: 'Uncommon', category: 'weapon', tier: 2, description: 'Pedang upacara & perang.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Pedang Baja Hitam', rank: 'Rare', category: 'weapon', tier: 3, description: 'Menyalurkan Qi.', basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Pedang Darah Spirit', rank: 'Epic', category: 'weapon', tier: 5, description: 'Haus darah dari Baja Darah.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Pedang Besi Dingin', rank: 'Epic', category: 'weapon', tier: 5, description: 'Aura es membekukan.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Pedang Mithril', rank: 'Epic', category: 'weapon', tier: 5, description: 'Ringan & mematikan.', basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Pedang Star Iron', rank: 'Legendary', category: 'weapon', tier: 7, description: 'Pedang dari besi bintang.', basePrice: 10, priceCurrency: 'jade' }),
    g({ name: 'Tombak Naga', rank: 'Legendary', category: 'weapon', tier: 7, description: 'Tombak bertatah sisik naga.', basePrice: 12, priceCurrency: 'jade' }),
    g({ name: 'Pedang Jiwa', rank: 'Legendary', category: 'weapon', tier: 7, description: 'Pedang yang mengikat jiwa.', basePrice: 15, priceCurrency: 'jade' }),
    g({ name: 'Pedang Primordial', rank: 'Mythical', category: 'weapon', tier: 9, description: 'Pedang dari awal penciptaan.', basePrice: 2, priceCurrency: 'spirit' }),
  ];
  items.push(...weapons);

  // CLOTH ACCESSORIES
  const cloth = [
    g({ name: 'Jubah Katun', rank: 'Common', category: 'cloth', tier: 1, description: 'Pakaian sehari-hari.', basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Jubah Kulit', rank: 'Uncommon', category: 'cloth', tier: 2, description: 'Tahan gores.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Jubah Wol', rank: 'Uncommon', category: 'cloth', tier: 2, description: 'Hangat di musim dingin.', basePrice: 70, priceCurrency: 'silver' }),
    g({ name: 'Jubah Sutra Salju', rank: 'Epic', category: 'cloth', tier: 5, description: 'Ringan & kuat.', basePrice: 1, priceCurrency: 'jade' }),
    g({ name: 'Jubah Baja Hitam', rank: 'Epic', category: 'cloth', tier: 5, description: 'Armor ringan dari baja mistis.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Jubah Bintang', rank: 'Legendary', category: 'cloth', tier: 7, description: 'Jubah dari pelat Star Iron.', basePrice: 8, priceCurrency: 'jade' }),
    g({ name: 'Jubah Immortal', rank: 'Mythical', category: 'cloth', tier: 9, description: 'Jubah dewa.', basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Cincin Giok Dasar', rank: 'Rare', category: 'accessories', tier: 3, description: 'Penampung Qi kecil.', basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Cincin Baja Hitam', rank: 'Epic', category: 'accessories', tier: 5, description: 'Cincin penyimpan Qi.', basePrice: 1, priceCurrency: 'jade' }),
    g({ name: 'Kalung Batu Roh', rank: 'Epic', category: 'accessories', tier: 5, description: 'Mempercepat regenerasi Qi.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Mahkota Giok Roh', rank: 'Legendary', category: 'accessories', tier: 7, description: 'Melindungi jiwa.', basePrice: 10, priceCurrency: 'jade' }),
    g({ name: 'Jimat Perlindungan Dasar', rank: 'Rare', category: 'artifact', tier: 3, description: 'Menahan satu serangan.', basePrice: 10, priceCurrency: 'gold' }),
    g({ name: 'Jimat Ledakan Api', rank: 'Epic', category: 'artifact', tier: 5, description: 'Jimat serangan elemen api.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Jimat Perisai Qi', rank: 'Epic', category: 'artifact', tier: 5, description: 'Perisai Qi sementara.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Array Flag Dasar', rank: 'Rare', category: 'artifact', tier: 3, description: 'Bendera formasi sederhana.', basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Array Flag Lanjutan', rank: 'Legendary', category: 'artifact', tier: 7, description: 'Bendera formasi tingkat tinggi.', basePrice: 8, priceCurrency: 'jade' }),
  ];
  items.push(...cloth);

  // Extra herbs & snacks for volume
  const herbNames = ['Rumput Qi', 'Daun Spirit', 'Akar Bulan', 'Bunga Emas', 'Jamur Gua', 'Lumut Batu', 'Akar Api', 'Daun Es', 'Bunga Angin', 'Rumput Petir', 'Akar Petir', 'Bunga Cahaya', 'Daun Kegelapan', 'Jamur Qi', 'Rumput Yin'];
  herbNames.forEach((n, i) => {
    const rank = i < 4 ? 'Uncommon' : i < 10 ? 'Rare' : 'Epic';
    const tier = rank === 'Uncommon' ? 2 : rank === 'Rare' ? 3 : 5;
    const price = rank === 'Uncommon' ? 30 : rank === 'Rare' ? 8 : 40;
    const curr = rank === 'Uncommon' ? 'silver' : 'gold';
    items.push(g({ name: n, rank, category: 'herb', tier, description: `Herbal ${rank.toLowerCase()} dari alam.`, basePrice: price, priceCurrency: curr }));
  });
  const snacks = ['Kue Beras', 'Kue Gandum', 'Ikan Bakar', 'Udang Rebus', 'Telur Dadar', 'Bubur Gandum', 'Sup Sayur', 'Daging Asap', 'Kue Jagung', 'Bubur Kedelai'];
  snacks.forEach((n, i) => {
    items.push(g({ name: n, rank: 'Common', category: 'consume', tier: 1, description: 'Makanan olahan sederhana.', basePrice: 10 + i * 2, priceCurrency: 'silver', effect: 'Memulihkan 10-20 Hunger' }));
  });


  // ========== MASS EXPANSION: MORE MATERIALS, HERBS, GEAR ==========
  // Additional ores & stones
  const moreRaw = [
    g({ name: "Bijih Nikel", rank: "Uncommon", category: "material", tier: 2, description: "Logam paduan tahan karat.", basePrice: 18, priceCurrency: "silver" }),
    g({ name: "Bijih Kobalt", rank: "Rare", category: "material", tier: 3, description: "Logam biru misterius.", basePrice: 3, priceCurrency: "gold" }),
    g({ name: "Bijih Platinum", rank: "Epic", category: "material", tier: 5, description: "Logam mulia langka.", basePrice: 50, priceCurrency: "gold" }),
    g({ name: "Batu Obsidian", rank: "Rare", category: "material", tier: 3, description: "Batu vulkanik tajam.", basePrice: 5, priceCurrency: "gold" }),
    g({ name: "Kristal Kuarsa", rank: "Uncommon", category: "material", tier: 2, description: "Kristal bening penyalur energi.", basePrice: 25, priceCurrency: "silver" }),
    g({ name: "Batu Ametis", rank: "Rare", category: "material", tier: 3, description: "Batu ungu penenang jiwa.", basePrice: 6, priceCurrency: "gold" }),
    g({ name: "Giok Hijau", rank: "Rare", category: "material", tier: 3, description: "Giok kualitas baik.", basePrice: 8, priceCurrency: "gold" }),
    g({ name: "Giok Putih", rank: "Epic", category: "material", tier: 5, description: "Giok murni penampung Qi.", basePrice: 30, priceCurrency: "gold" }),
    g({ name: "Inti Meteor", rank: "Legendary", category: "material", tier: 7, description: "Inti batu meteor yang masih panas.", basePrice: 6, priceCurrency: "jade" }),
    g({ name: "Debu Bintang", rank: "Legendary", category: "material", tier: 7, description: "Debu dari bintang jatuh.", basePrice: 7, priceCurrency: "jade" }),
    g({ name: "Serpihan Dimensi", rank: "Mythical", category: "material", tier: 9, description: "Serpihan ruang-waktu.", basePrice: 1, priceCurrency: "spirit" }),
  ];
  items.push(...moreRaw);

  // More woods
  const moreWood = [
    g({ name: "Kayu Maple", rank: "Common", category: "material", tier: 1, description: "Kayu maple keras.", basePrice: 2, priceCurrency: "silver" }),
    g({ name: "Kayu Ek", rank: "Uncommon", category: "material", tier: 2, description: "Kayu ek kuat.", basePrice: 12, priceCurrency: "silver" }),
    g({ name: "Kayu Ebony", rank: "Rare", category: "material", tier: 3, description: "Kayu hitam legam.", basePrice: 5, priceCurrency: "gold" }),
    g({ name: "Kayu Phoenix", rank: "Epic", category: "material", tier: 5, description: "Kayu yang pernah terbakar api phoenix.", basePrice: 40, priceCurrency: "gold" }),
    g({ name: "Kayu Dragonbone", rank: "Legendary", category: "material", tier: 7, description: "Kayu yang menyerap tulang naga.", basePrice: 4, priceCurrency: "jade" }),
  ];
  items.push(...moreWood);

  // Mass herbs (tiered)
  const herbBase = ["Qi", "Spirit", "Moon", "Sun", "Dragon", "Phoenix", "Tiger", "Turtle", "Wind", "Thunder", "Ice", "Fire", "Earth", "Water", "Light", "Dark", "Blood", "Bone", "Soul", "Void"];
  herbBase.forEach((h, i) => {
    const ranks = ["Uncommon", "Rare", "Epic", "Legendary"];
    const rank = ranks[Math.min(Math.floor(i / 5), 3)];
    const tier = rank === "Uncommon" ? 2 : rank === "Rare" ? 3 : rank === "Epic" ? 5 : 7;
    const price = rank === "Uncommon" ? 25 + i : rank === "Rare" ? 5 + i : rank === "Epic" ? 30 + i * 2 : 2;
    const curr = rank === "Legendary" ? "jade" : rank === "Uncommon" ? "silver" : "gold";
    items.push(g({ name: `Rumput ${h}`, rank, category: "herb", tier, description: `Herbal ${h.toLowerCase()} berkualitas ${rank}.`, basePrice: price, priceCurrency: curr }));
    items.push(g({ name: `Daun ${h}`, rank, category: "herb", tier, description: `Daun ${h.toLowerCase()} berkualitas ${rank}.`, basePrice: price, priceCurrency: curr }));
    items.push(g({ name: `Akar ${h}`, rank, category: "herb", tier, description: `Akar ${h.toLowerCase()} berkualitas ${rank}.`, basePrice: Math.floor(price * 1.2), priceCurrency: curr }));
    items.push(g({ name: `Bunga ${h}`, rank, category: "herb", tier, description: `Bunga ${h.toLowerCase()} berkualitas ${rank}.`, basePrice: Math.floor(price * 1.1), priceCurrency: curr }));
  });

  // More processed
  const moreProc = [
    g({ name: "Batangan Nikel", rank: "Uncommon", category: "material", tier: 2, description: "Nikel murni.", basePrice: 45, priceCurrency: "silver" }),
    g({ name: "Batangan Kobalt", rank: "Rare", category: "material", tier: 3, description: "Kobalt murni.", basePrice: 4, priceCurrency: "gold" }),
    g({ name: "Batangan Platinum", rank: "Epic", category: "material", tier: 5, description: "Platinum murni.", basePrice: 120, priceCurrency: "gold" }),
    g({ name: "Kaca Jernih", rank: "Uncommon", category: "material", tier: 2, description: "Kaca berkualitas tinggi.", basePrice: 40, priceCurrency: "silver" }),
    g({ name: "Kaca Roh", rank: "Epic", category: "material", tier: 5, description: "Kaca penampung Qi.", basePrice: 50, priceCurrency: "gold" }),
    g({ name: "Sutra Biasa", rank: "Uncommon", category: "material", tier: 2, description: "Sutra kualitas biasa.", basePrice: 50, priceCurrency: "silver" }),
    g({ name: "Sutra Emas", rank: "Rare", category: "material", tier: 3, description: "Sutra berkilau emas.", basePrice: 8, priceCurrency: "gold" }),
    g({ name: "Kain Giok", rank: "Epic", category: "material", tier: 5, description: "Kain anyaman serat giok.", basePrice: 80, priceCurrency: "gold" }),
    g({ name: "Pelat Baja", rank: "Rare", category: "material", tier: 3, description: "Pelat baja untuk armor.", basePrice: 3, priceCurrency: "gold" }),
    g({ name: "Pelat Mithril", rank: "Epic", category: "material", tier: 5, description: "Pelat mithril ringan.", basePrice: 150, priceCurrency: "gold" }),
  ];
  items.push(...moreProc);

  // More weapons
  const wTypes = ["Pedang", "Tombak", "Kapak", "Busur", "Belati", "Tongkat", "Cambuk", "Kipas"];
  const wMats = [
    { m: "Besi", rank: "Common", tier: 1, price: 70, curr: "silver" },
    { m: "Perunggu", rank: "Uncommon", tier: 2, price: 2, curr: "gold" },
    { m: "Baja", rank: "Uncommon", tier: 2, price: 3, curr: "gold" },
    { m: "Baja Hitam", rank: "Rare", tier: 3, price: 12, curr: "gold" },
    { m: "Besi Dingin", rank: "Epic", tier: 5, price: 2, curr: "jade" },
    { m: "Mithril", rank: "Epic", tier: 5, price: 3, curr: "jade" },
    { m: "Star Iron", rank: "Legendary", tier: 7, price: 8, curr: "jade" },
    { m: "Primordial", rank: "Mythical", tier: 9, price: 1, curr: "spirit" },
  ];
  wTypes.forEach(wt => {
    wMats.forEach(wm => {
      const name = `${wt} ${wm.m}`;
      if (items.some(it => it.name === name)) return;
      items.push(g({ name, rank: wm.rank, category: "weapon", tier: wm.tier, description: `${wt} dari ${wm.m}.`, basePrice: wm.price, priceCurrency: wm.curr }));
    });
  });

  // More cloth/armor
  const cTypes = ["Jubah", "Armor", "Sarung Tangan", "Sepatu", "Topi", "Sabuk"];
  const cMats = [
    { m: "Katun", rank: "Common", tier: 1, price: 25, curr: "silver" },
    { m: "Kulit", rank: "Uncommon", tier: 2, price: 60, curr: "silver" },
    { m: "Wol", rank: "Uncommon", tier: 2, price: 55, curr: "silver" },
    { m: "Sutra", rank: "Rare", tier: 3, price: 5, curr: "gold" },
    { m: "Sutra Salju", rank: "Epic", tier: 5, price: 1, curr: "jade" },
    { m: "Baja Hitam", rank: "Epic", tier: 5, price: 2, curr: "jade" },
    { m: "Mithril", rank: "Legendary", tier: 7, price: 6, curr: "jade" },
    { m: "Immortal", rank: "Mythical", tier: 9, price: 1, curr: "spirit" },
  ];
  cTypes.forEach(ct => {
    cMats.forEach(cm => {
      const name = `${ct} ${cm.m}`;
      if (items.some(it => it.name === name)) return;
      items.push(g({ name, rank: cm.rank, category: "cloth", tier: cm.tier, description: `${ct} dari ${cm.m}.`, basePrice: cm.price, priceCurrency: cm.curr }));
    });
  });

  // More pills
  const pillEffects = ["Pemulih", "Penguat", "Pembersih", "Loncatan", "Detoks", "Stabil", "Nutrisi", "Qi", "Jiwa", "Tulang", "Meridian", "Darah", "Kulit", "Mata", "Telinga"];
  pillEffects.forEach((pe, i) => {
    const rank = i < 4 ? "Uncommon" : i < 8 ? "Rare" : i < 12 ? "Epic" : "Legendary";
    const tier = rank === "Uncommon" ? 2 : rank === "Rare" ? 3 : rank === "Epic" ? 5 : 7;
    const price = rank === "Uncommon" ? 40 : rank === "Rare" ? 3 : rank === "Epic" ? 2 : 10;
    const curr = rank === "Uncommon" ? "silver" : rank === "Rare" ? "gold" : "jade";
    items.push(g({ name: `Pil ${pe} Dasar`, rank, category: "pill", tier, description: `Pil ${pe.toLowerCase()} tingkat dasar.`, basePrice: price, priceCurrency: curr }));
    items.push(g({ name: `Pil ${pe} Lanjutan`, rank: rank === "Legendary" ? "Mythical" : rank, category: "pill", tier: Math.min(tier + 2, 9), description: `Pil ${pe.toLowerCase()} tingkat lanjut.`, basePrice: price * 3, priceCurrency: curr === "silver" ? "gold" : curr }));
  });

  // More artifacts & accessories
  const artNames = ["Jimat", "Cincin", "Kalung", "Gelang", "Mahkota", "Anting", "Bros", "Segel", "Bendera Array", "Lentera Roh"];
  artNames.forEach((an, i) => {
    ["Dasar", "Menengah", "Tinggi", "Surgawi"].forEach((lv, j) => {
      const rank = j === 0 ? "Rare" : j === 1 ? "Epic" : j === 2 ? "Legendary" : "Mythical";
      const tier = j === 0 ? 3 : j === 1 ? 5 : j === 2 ? 7 : 9;
      const price = j === 0 ? 8 : j === 1 ? 2 : j === 2 ? 8 : 1;
      const curr = j === 0 ? "gold" : j < 3 ? "jade" : "spirit";
      items.push(g({ name: `${an} ${lv}`, rank, category: j < 2 ? "accessories" : "artifact", tier, description: `${an} tingkat ${lv.toLowerCase()}.`, basePrice: price, priceCurrency: curr }));
    });
  });

  // More consume / food variants
  const foods = ["Sup", "Kue", "Roti", "Nasi", "Bubur", "Daging", "Ikan", "Sayur", "Buah", "Teh", "Arak", "Madu"];
  foods.forEach((f, i) => {
    ["Biasa", "Bergizi", "Kultivasi", "Surgawi"].forEach((q, j) => {
      const rank = j === 0 ? "Common" : j === 1 ? "Uncommon" : j === 2 ? "Rare" : "Epic";
      const tier = j + 1;
      const price = j === 0 ? 12 : j === 1 ? 30 : j === 2 ? 2 : 20;
      const curr = j < 2 ? "silver" : j === 2 ? "gold" : "gold";
      items.push(g({ name: `${f} ${q}`, rank, category: "consume", tier, description: `${f} kualitas ${q.toLowerCase()}.`, basePrice: price, priceCurrency: curr, effect: "Memulihkan Hunger" }));
    });
  });


  // FINAL ITEM PUSH
  const elements = ["Api", "Air", "Tanah", "Angin", "Petir", "Cahaya", "Kegelapan", "Es", "Racun", "Logam"];
  elements.forEach((el, ei) => {
    ["Kristal", "Inti", "Debu", "Serpihan", "Batu"].forEach((pref, pi) => {
      const rank = pi < 2 ? "Rare" : pi < 4 ? "Epic" : "Legendary";
      const tier = rank === "Rare" ? 3 : rank === "Epic" ? 5 : 7;
      const price = rank === "Rare" ? 5 + ei : rank === "Epic" ? 25 + ei * 2 : 3;
      const curr = rank === "Legendary" ? "jade" : "gold";
      items.push(g({ name: `${pref} ${el}`, rank, category: "material", tier, description: `${pref} elemen ${el}.`, basePrice: price, priceCurrency: curr }));
    });
  });
  // More tools
  const toolActs = ["Kapak", "Beliung", "Cangkul", "Palu", "Pisau", "Gergaji", "Jarum", "Kuas"];
  const toolQual = ["Besi", "Baja", "Baja Hitam", "Giok", "Mithril", "Star Iron"];
  toolActs.forEach(ta => {
    toolQual.forEach((tq, tqi) => {
      const name = `${ta} ${tq}`;
      if (items.some(it => it.name === name)) return;
      const rank = tqi < 1 ? "Common" : tqi < 2 ? "Uncommon" : tqi < 3 ? "Rare" : tqi < 4 ? "Epic" : "Legendary";
      const tier = tqi < 1 ? 1 : tqi < 2 ? 2 : tqi < 3 ? 3 : tqi < 4 ? 5 : 7;
      const price = tqi < 1 ? 40 : tqi < 2 ? 2 : tqi < 3 ? 8 : tqi < 4 ? 1 : 4;
      const curr = tqi < 1 ? "silver" : tqi < 3 ? "gold" : "jade";
      items.push(g({ name, rank, category: "consume", tier, description: `${ta} kualitas ${tq}.`, basePrice: price, priceCurrency: curr }));
    });
  });


  // ========== QUALITY UNIQUE ITEMS (seru jangka panjang) ==========
  // Special materials for late-game sinks
  const uniqueMats = [
    g({ name: "Benang Laba-laba Kristal", rank: "Epic", category: "material", tier: 5, description: "Benang sangat kuat dari laba-laba kristal.", basePrice: 70, priceCurrency: "gold" }),
    g({ name: "Air Mata Phoenix", rank: "Legendary", category: "material", tier: 7, description: "Air mata yang menyembuhkan luka jiwa.", basePrice: 8, priceCurrency: "jade" }),
    g({ name: "Tanduk Qilin", rank: "Legendary", category: "material", tier: 7, description: "Tanduk keberuntungan tingkat dewa.", basePrice: 10, priceCurrency: "jade" }),
    g({ name: "Sisik Qinglong", rank: "Mythical", category: "material", tier: 9, description: "Sisik naga biru penunggu timur.", basePrice: 1, priceCurrency: "spirit" }),
    g({ name: "Bulu Zhuque", rank: "Mythical", category: "material", tier: 9, description: "Bulu burung api penunggu selatan.", basePrice: 1, priceCurrency: "spirit" }),
    g({ name: "Cakar Baihu", rank: "Mythical", category: "material", tier: 9, description: "Cakar harimau putih penunggu barat.", basePrice: 1, priceCurrency: "spirit" }),
    g({ name: "Cangkang Xuanwu", rank: "Mythical", category: "material", tier: 9, description: "Cangkang kura-kura penunggu utara.", basePrice: 1, priceCurrency: "spirit" }),
    g({ name: "Inti Primordial", rank: "Mythical", category: "material", tier: 9, description: "Inti dari awal penciptaan.", basePrice: 2, priceCurrency: "spirit" }),
  ];
  items.push(...uniqueMats);

  // Unique pills for progression & sink
  const uniquePills = [
    g({ name: "Pil Fondasi Sempurna", rank: "Legendary", category: "pill", tier: 7, description: "Menyempurnakan fondasi kultivasi.", basePrice: 20, priceCurrency: "jade" }),
    g({ name: "Pil Pencerahan Jiwa", rank: "Legendary", category: "pill", tier: 7, description: "Membantu memahami hukum alam.", basePrice: 18, priceCurrency: "jade" }),
    g({ name: "Pil Penjaga Jiwa", rank: "Epic", category: "pill", tier: 5, description: "Melindungi jiwa dari serangan spiritual.", basePrice: 3, priceCurrency: "jade" }),
    g({ name: "Pil Regenerasi Total", rank: "Epic", category: "pill", tier: 5, description: "Memulihkan tubuh hampir sempurna.", basePrice: 4, priceCurrency: "jade" }),
    g({ name: "Pil Immortal Draft", rank: "Mythical", category: "pill", tier: 9, description: "Draf awal menuju keabadian.", basePrice: 2, priceCurrency: "spirit" }),
  ];
  items.push(...uniquePills);

  // Unique weapons / artifacts for late game goals
  const uniqueGear = [
    g({ name: "Pedang Langit Putih", rank: "Legendary", category: "weapon", tier: 7, description: "Pedang legendaris penolak kejahatan.", basePrice: 12, priceCurrency: "jade" }),
    g({ name: "Tombak Naga Hitam", rank: "Legendary", category: "weapon", tier: 7, description: "Tombak yang menggigilkan jiwa.", basePrice: 14, priceCurrency: "jade" }),
    g({ name: "Kipas Angin Surgawi", rank: "Epic", category: "weapon", tier: 5, description: "Kipas yang mengendalikan angin.", basePrice: 3, priceCurrency: "jade" }),
    g({ name: "Belati Bayangan", rank: "Epic", category: "weapon", tier: 5, description: "Belati yang menghilang di bayangan.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Jimat Kebangkitan", rank: "Legendary", category: "artifact", tier: 7, description: "Jimat yang bisa membangkitkan sekali.", basePrice: 15, priceCurrency: "jade" }),
    g({ name: "Segel Dimensi", rank: "Mythical", category: "artifact", tier: 9, description: "Segel yang mengunci ruang.", basePrice: 2, priceCurrency: "spirit" }),
    g({ name: "Lentera Jiwa Abadi", rank: "Mythical", category: "artifact", tier: 9, description: "Lentera yang menuntun jiwa yang tersesat.", basePrice: 3, priceCurrency: "spirit" }),
  ];
  items.push(...uniqueGear);


  // =========================================================================
  // ERA PABRIK (INDUSTRI) + ERA MODERN
  // Disesuaikan ke setting Jianghu/Xianxia (steampunk murim + modern kultivasi)
  // =========================================================================

  // --- Industrial Materials & Components ---
  const industrial = [
    g({ name: "Batu Bara Berkualitas", rank: "Uncommon", category: "material", tier: 2, description: "Batu bara padat untuk mesin uap.", basePrice: 12, priceCurrency: "silver" }),
    g({ name: "Minyak Mentah", rank: "Uncommon", category: "material", tier: 2, description: "Minyak bumi dasar industri.", basePrice: 20, priceCurrency: "silver" }),
    g({ name: "Minyak Olahan", rank: "Rare", category: "material", tier: 3, description: "Minyak hasil penyulingan.", basePrice: 3, priceCurrency: "gold" }),
    g({ name: "Karet Mentah", rank: "Uncommon", category: "material", tier: 2, description: "Getah pohon karet.", basePrice: 15, priceCurrency: "silver" }),
    g({ name: "Karet Olahan", rank: "Rare", category: "material", tier: 3, description: "Karet siap pakai.", basePrice: 2, priceCurrency: "gold" }),
    g({ name: "Kawat Tembaga", rank: "Uncommon", category: "material", tier: 2, description: "Kawat konduktor dasar.", basePrice: 30, priceCurrency: "silver" }),
    g({ name: "Kawat Baja", rank: "Rare", category: "material", tier: 3, description: "Kawat baja kuat.", basePrice: 2, priceCurrency: "gold" }),
    g({ name: "Roda Gigi Besi", rank: "Uncommon", category: "material", tier: 2, description: "Komponen mesin dasar.", basePrice: 40, priceCurrency: "silver" }),
    g({ name: "Roda Gigi Baja", rank: "Rare", category: "material", tier: 3, description: "Komponen mesin presisi.", basePrice: 3, priceCurrency: "gold" }),
    g({ name: "Pegas Baja", rank: "Rare", category: "material", tier: 3, description: "Pegas untuk mekanisme.", basePrice: 2, priceCurrency: "gold" }),
    g({ name: "Pelat Baja Tebal", rank: "Rare", category: "material", tier: 3, description: "Pelat untuk rangka mesin & kapal.", basePrice: 4, priceCurrency: "gold" }),
    g({ name: "Baut & Mur", rank: "Common", category: "material", tier: 1, description: "Pengikat mesin.", basePrice: 8, priceCurrency: "silver" }),
    g({ name: "Uap Terkondensasi", rank: "Uncommon", category: "material", tier: 2, description: "Energi uap dalam bentuk padat sementara.", basePrice: 25, priceCurrency: "silver" }),
    g({ name: "Inti Mesin Uap", rank: "Rare", category: "material", tier: 3, description: "Jantung mesin uap murim.", basePrice: 8, priceCurrency: "gold" }),
    g({ name: "Katalis Kimia Dasar", rank: "Rare", category: "material", tier: 3, description: "Mempercepat reaksi kimia.", basePrice: 5, priceCurrency: "gold" }),
    g({ name: "Asam Industri", rank: "Rare", category: "material", tier: 3, description: "Asam untuk pengolahan logam.", basePrice: 4, priceCurrency: "gold" }),
    g({ name: "Kaca Optik", rank: "Rare", category: "material", tier: 3, description: "Kaca presisi untuk lensa.", basePrice: 6, priceCurrency: "gold" }),
    g({ name: "Lensa Presisi", rank: "Epic", category: "material", tier: 5, description: "Lensa untuk alat ukur & senjata.", basePrice: 40, priceCurrency: "gold" }),
  ];
  items.push(...industrial);

  // --- Modern Materials & Components ---
  const modern = [
    g({ name: "Bijih Aluminium", rank: "Rare", category: "material", tier: 3, description: "Logam ringan modern.", basePrice: 5, priceCurrency: "gold" }),
    g({ name: "Batangan Aluminium", rank: "Epic", category: "material", tier: 5, description: "Aluminium murni.", basePrice: 30, priceCurrency: "gold" }),
    g({ name: "Serat Karbon Mentah", rank: "Epic", category: "material", tier: 5, description: "Serat super kuat.", basePrice: 50, priceCurrency: "gold" }),
    g({ name: "Pelat Serat Karbon", rank: "Legendary", category: "material", tier: 7, description: "Pelat ringan sekuat baja mistis.", basePrice: 4, priceCurrency: "jade" }),
    g({ name: "Chip Qi Sederhana", rank: "Epic", category: "material", tier: 5, description: "Chip yang menyimpan & mengatur aliran Qi.", basePrice: 60, priceCurrency: "gold" }),
    g({ name: "Chip Qi Lanjutan", rank: "Legendary", category: "material", tier: 7, description: "Chip Qi tingkat tinggi.", basePrice: 5, priceCurrency: "jade" }),
    g({ name: "Baterai Spirit", rank: "Epic", category: "material", tier: 5, description: "Menyimpan energi spirit.", basePrice: 45, priceCurrency: "gold" }),
    g({ name: "Kabel Optik Qi", rank: "Legendary", category: "material", tier: 7, description: "Menghantar Qi dengan kerugian minimal.", basePrice: 6, priceCurrency: "jade" }),
    g({ name: "Sensor Aura", rank: "Epic", category: "material", tier: 5, description: "Mendeteksi fluktuasi aura.", basePrice: 55, priceCurrency: "gold" }),
    g({ name: "Modul Formasi Portabel", rank: "Legendary", category: "material", tier: 7, description: "Formasi dalam bentuk modul.", basePrice: 8, priceCurrency: "jade" }),
    g({ name: "Plastik Spirit", rank: "Rare", category: "material", tier: 3, description: "Material sintetis tahan Qi.", basePrice: 4, priceCurrency: "gold" }),
    g({ name: "Alloy Modern", rank: "Epic", category: "material", tier: 5, description: "Paduan logam modern + mistis.", basePrice: 70, priceCurrency: "gold" }),
    g({ name: "Inti Reaktor Spirit", rank: "Mythical", category: "material", tier: 9, description: "Jantung pembangkit spirit tingkat dewa.", basePrice: 2, priceCurrency: "spirit" }),
  ];
  items.push(...modern);

  // --- Industrial & Modern Tools ---
  const eraTools = [
    g({ name: "Kunci Inggris Besi", rank: "Uncommon", category: "consume", tier: 2, description: "Alat perakitan mesin.", basePrice: 1, priceCurrency: "gold" }),
    g({ name: "Obeng Presisi", rank: "Rare", category: "consume", tier: 3, description: "Untuk komponen halus.", basePrice: 3, priceCurrency: "gold" }),
    g({ name: "Mesin Bor Portable", rank: "Rare", category: "consume", tier: 3, description: "Bor untuk logam & batu.", basePrice: 8, priceCurrency: "gold" }),
    g({ name: "Las Listrik Qi", rank: "Epic", category: "consume", tier: 5, description: "Las yang menggunakan Qi.", basePrice: 1, priceCurrency: "jade" }),
    g({ name: "Scanner Aura", rank: "Epic", category: "consume", tier: 5, description: "Memindai komposisi material & aura.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Printer Formasi", rank: "Legendary", category: "consume", tier: 7, description: "Mencetak formasi dasar secara otomatis.", basePrice: 6, priceCurrency: "jade" }),
  ];
  items.push(...eraTools);

  // --- Industrial & Modern Weapons / Gear ---
  const eraGear = [
    g({ name: "Senapan Uap", rank: "Rare", category: "weapon", tier: 3, description: "Senjata proyektif bertenaga uap.", basePrice: 12, priceCurrency: "gold" }),
    g({ name: "Pedang Getar Baja", rank: "Epic", category: "weapon", tier: 5, description: "Pedang yang bergetar frekuensi tinggi.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Tongkat Stun Qi", rank: "Epic", category: "weapon", tier: 5, description: "Menyetrum meridian lawan.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Armor Pelat Baja", rank: "Rare", category: "cloth", tier: 3, description: "Armor berat industri.", basePrice: 10, priceCurrency: "gold" }),
    g({ name: "Armor Serat Karbon", rank: "Legendary", category: "cloth", tier: 7, description: "Armor ringan super kuat.", basePrice: 8, priceCurrency: "jade" }),
    g({ name: "Kacamata Optik", rank: "Rare", category: "accessories", tier: 3, description: "Melihat detail jauh.", basePrice: 5, priceCurrency: "gold" }),
    g({ name: "Jam Tangan Qi", rank: "Epic", category: "accessories", tier: 5, description: "Mengukur aliran Qi & waktu.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Komunikasi Spirit", rank: "Legendary", category: "artifact", tier: 7, description: "Alat komunikasi jarak jauh via spirit wave.", basePrice: 10, priceCurrency: "jade" }),
  ];
  items.push(...eraGear);

  // --- Industrial Consumables ---
  const eraConsume = [
    g({ name: "Bahan Bakar Uap", rank: "Uncommon", category: "consume", tier: 2, description: "Bahan bakar mesin uap.", basePrice: 15, priceCurrency: "silver" }),
    g({ name: "Bahan Bakar Spirit", rank: "Epic", category: "consume", tier: 5, description: "Bahan bakar mesin spirit modern.", basePrice: 40, priceCurrency: "gold" }),
    g({ name: "Pelumas Mesin", rank: "Uncommon", category: "consume", tier: 2, description: "Menjaga mesin tetap mulus.", basePrice: 20, priceCurrency: "silver" }),
    g({ name: "Ransum Industri", rank: "Uncommon", category: "consume", tier: 2, description: "Makanan padat pekerja pabrik.", basePrice: 25, priceCurrency: "silver", effect: "Memulihkan 30 Hunger" }),
    g({ name: "Pil Stamina Pabrik", rank: "Rare", category: "pill", tier: 3, description: "Stamina untuk shift panjang.", basePrice: 4, priceCurrency: "gold" }),
  ];
  items.push(...eraConsume);


  // ========== MEGA PUSH ITEMS KE ~1000 ==========
  // Variant material by region/quality
  const regions = ["Utara", "Selatan", "Timur", "Barat", "Tengah", "Pegunungan", "Lembah", "Pantai", "Gurun", "Rawa"];
  const matTypes = ["Bijih", "Batu", "Kristal", "Debu", "Serpihan", "Inti"];
  const elements2 = ["Api", "Air", "Tanah", "Angin", "Petir", "Es", "Racun", "Cahaya", "Kegelapan", "Logam", "Kayu", "Tanah Liat"];
  regions.forEach((reg, ri) => {
    matTypes.forEach((mt, mi) => {
      elements2.forEach((el, ei) => {
        if ((ri + mi + ei) % 3 !== 0) return; // thin out to avoid pure spam
        const rank = ri < 3 ? "Uncommon" : ri < 6 ? "Rare" : ri < 8 ? "Epic" : "Legendary";
        const tier = rank === "Uncommon" ? 2 : rank === "Rare" ? 3 : rank === "Epic" ? 5 : 7;
        const price = rank === "Uncommon" ? 20 + ei : rank === "Rare" ? 4 + ei : rank === "Epic" ? 25 + ei * 2 : 2 + ei;
        const curr = rank === "Legendary" ? "jade" : rank === "Uncommon" ? "silver" : "gold";
        const name = `${mt} ${el} ${reg}`;
        if (items.some(it => it.name === name)) return;
        items.push(g({ name, rank, category: "material", tier, description: `${mt} elemen ${el} dari ${reg}.`, basePrice: price, priceCurrency: curr }));
      });
    });
  });

  // More herbs by region
  const herbParts = ["Rumput", "Daun", "Akar", "Bunga", "Jamur", "Lumut", "Kulit Kayu", "Getah"];
  herbParts.forEach((hp, hpi) => {
    regions.forEach((reg, ri) => {
      if ((hpi + ri) % 2 !== 0) return;
      const rank = ri < 4 ? "Uncommon" : ri < 7 ? "Rare" : "Epic";
      const tier = rank === "Uncommon" ? 2 : rank === "Rare" ? 3 : 5;
      const price = rank === "Uncommon" ? 18 + ri : rank === "Rare" ? 5 + ri : 30 + ri * 2;
      const curr = rank === "Uncommon" ? "silver" : "gold";
      const name = `${hp} ${reg}`;
      if (items.some(it => it.name === name)) return;
      items.push(g({ name, rank, category: "herb", tier, description: `${hp} khas ${reg}.`, basePrice: price, priceCurrency: curr }));
    });
  });

  // More food variants
  const foodBases = ["Sup", "Kue", "Bubur", "Roti", "Nasi", "Daging", "Ikan", "Sayur", "Buah", "Teh", "Arak", "Madu", "Keju", "Tahu", "Telur"];
  const foodQuals = ["Sederhana", "Bergizi", "Premium", "Kultivasi", "Surgawi"];
  foodBases.forEach((fb, fi) => {
    foodQuals.forEach((fq, fqi) => {
      const rank = fqi === 0 ? "Common" : fqi === 1 ? "Uncommon" : fqi === 2 ? "Rare" : fqi === 3 ? "Epic" : "Legendary";
      const tier = fqi + 1;
      const price = fqi === 0 ? 10 + fi : fqi === 1 ? 25 + fi : fqi === 2 ? 2 + Math.floor(fi/3) : fqi === 3 ? 20 + fi : 2;
      const curr = fqi < 2 ? "silver" : fqi < 4 ? "gold" : "jade";
      const name = `${fb} ${fq}`;
      if (items.some(it => it.name === name)) return;
      items.push(g({ name, rank, category: "consume", tier, description: `${fb} kualitas ${fq.toLowerCase()}.`, basePrice: price, priceCurrency: curr, effect: "Memulihkan Hunger" }));
    });
  });

  // More pills
  const pillThemes = ["Pemulih", "Penguat", "Pembersih", "Loncatan", "Detoks", "Stabil", "Qi", "Jiwa", "Tulang", "Meridian", "Darah", "Kulit", "Mata", "Telinga", "Hati", "Paru", "Ginjal", "Limpa", "Otak", "Fondasi"];
  const pillTiers = ["Dasar", "Menengah", "Lanjutan", "Sempurna", "Dewa"];
  pillThemes.forEach((pt, pti) => {
    pillTiers.forEach((pl, pli) => {
      const rank = pli === 0 ? "Uncommon" : pli === 1 ? "Rare" : pli === 2 ? "Epic" : pli === 3 ? "Legendary" : "Mythical";
      const tier = pli === 0 ? 2 : pli === 1 ? 3 : pli === 2 ? 5 : pli === 3 ? 7 : 9;
      const price = pli === 0 ? 40 : pli === 1 ? 3 : pli === 2 ? 2 : pli === 3 ? 12 : 1;
      const curr = pli === 0 ? "silver" : pli === 1 ? "gold" : pli < 4 ? "jade" : "spirit";
      const name = `Pil ${pt} ${pl}`;
      if (items.some(it => it.name === name)) return;
      items.push(g({ name, rank, category: "pill", tier, description: `Pil ${pt.toLowerCase()} tingkat ${pl.toLowerCase()}.`, basePrice: price, priceCurrency: curr }));
    });
  });

  return items;
}

// ---------------------------------------------------------------------------
// ASSET BUILDER
// ---------------------------------------------------------------------------
function buildAllAssets(guildId) {
  const g = (o) => ({ guildId, createdBy: 'System Oracle', ...o });
  const assets = [];

  // PRODUCTION (balanced low output + input)
  const prod = [
    g({ name: 'Pohon Buah Liar', description: '2 Buah Liar/jam. Tanpa input.', rank: 'Common', workerOutputItemId: idOf('Buah Liar'), workerOutputItemName: 'Buah Liar', workerOutputQuantity: 2, workerInputMaterials: [], constructionTimeHours: 0, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Area Buruan Primitif', description: '1 Daging Mentah/jam.', rank: 'Common', workerOutputItemId: idOf('Daging Mentah'), workerOutputItemName: 'Daging Mentah', workerOutputQuantity: 1, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Tombak Kayu'), itemName: 'Tombak Kayu', quantity: 1 }], basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Lahan Tanah Liat Primitif', description: '2 Tanah Liat/jam.', rank: 'Common', workerOutputItemId: idOf('Tanah Liat'), workerOutputItemName: 'Tanah Liat', workerOutputQuantity: 2, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Tambang Batu Kasar Primitif', description: '2 Batu Kasar/jam.', rank: 'Common', workerOutputItemId: idOf('Batu Kasar'), workerOutputItemName: 'Batu Kasar', workerOutputQuantity: 2, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Galian Pasir Putih', description: '3 Pasir Putih/jam.', rank: 'Common', workerOutputItemId: idOf('Pasir Putih'), workerOutputItemName: 'Pasir Putih', workerOutputQuantity: 3, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Galian Batu Kapur', description: '2 Batu Kapur/jam.', rank: 'Common', workerOutputItemId: idOf('Batu Kapur'), workerOutputItemName: 'Batu Kapur', workerOutputQuantity: 2, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Area Penebangan Kayu Dasar', description: '2 Kayu Mentah/jam. Butuh 1 Kapak Batu/jam.', rank: 'Common', workerOutputItemId: idOf('Kayu Mentah'), workerOutputItemName: 'Kayu Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Kapak Batu'), itemName: 'Kapak Batu', quantity: 1 }], constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Batu'), itemName: 'Kapak Batu', quantity: 2 }], basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Sungai Dangkal', description: '2 Ikan Air Tawar/jam. Butuh 1 Alat Pancing/jam.', rank: 'Common', workerOutputItemId: idOf('Ikan Air Tawar'), workerOutputItemName: 'Ikan Air Tawar', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Alat Pancing Kayu'), itemName: 'Alat Pancing Kayu', quantity: 1 }], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Alat Pancing Kayu'), itemName: 'Alat Pancing Kayu', quantity: 1 }], basePrice: 12, priceCurrency: 'silver' }),
    g({ name: 'Sarang Lebah Liar', description: '1 Madu Liar/jam.', rank: 'Uncommon', workerOutputItemId: idOf('Madu Liar'), workerOutputItemName: 'Madu Liar', workerOutputQuantity: 1, workerInputMaterials: [], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Pisau Tulang'), itemName: 'Pisau Tulang', quantity: 1 }], basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Sawah Gandum', description: '3 Gandum/jam. Butuh 1 Bibit Gandum/jam.', rank: 'Common', workerOutputItemId: idOf('Gandum'), workerOutputItemName: 'Gandum', workerOutputQuantity: 3, workerInputMaterials: [{ itemId: idOf('Bibit Gandum'), itemName: 'Bibit Gandum', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Gandum'), itemName: 'Bibit Gandum', quantity: 5 }], basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Sawah Padi', description: '3 Padi Mentah/jam. Butuh 1 Bibit Padi/jam.', rank: 'Common', workerOutputItemId: idOf('Padi Mentah'), workerOutputItemName: 'Padi Mentah', workerOutputQuantity: 3, workerInputMaterials: [{ itemId: idOf('Bibit Padi'), itemName: 'Bibit Padi', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Padi'), itemName: 'Bibit Padi', quantity: 5 }], basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Kebun Kapas', description: '3 Kapas Mentah/jam. Butuh 1 Bibit Kapas/jam.', rank: 'Common', workerOutputItemId: idOf('Kapas Mentah'), workerOutputItemName: 'Kapas Mentah', workerOutputQuantity: 3, workerInputMaterials: [{ itemId: idOf('Bibit Kapas'), itemName: 'Bibit Kapas', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Kapas'), itemName: 'Bibit Kapas', quantity: 5 }], basePrice: 55, priceCurrency: 'silver' }),
    g({ name: 'Kebun Jagung', description: '3 Jagung Mentah/jam. Butuh 1 Bibit Jagung/jam.', rank: 'Common', workerOutputItemId: idOf('Jagung Mentah'), workerOutputItemName: 'Jagung Mentah', workerOutputQuantity: 3, workerInputMaterials: [{ itemId: idOf('Bibit Jagung'), itemName: 'Bibit Jagung', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Jagung'), itemName: 'Bibit Jagung', quantity: 5 }], basePrice: 48, priceCurrency: 'silver' }),
    g({ name: 'Kebun Kedelai', description: '3 Kedelai Mentah/jam. Butuh 1 Bibit Kedelai/jam.', rank: 'Common', workerOutputItemId: idOf('Kedelai Mentah'), workerOutputItemName: 'Kedelai Mentah', workerOutputQuantity: 3, workerInputMaterials: [{ itemId: idOf('Bibit Kedelai'), itemName: 'Bibit Kedelai', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Kedelai'), itemName: 'Bibit Kedelai', quantity: 5 }], basePrice: 48, priceCurrency: 'silver' }),
    g({ name: 'Hutan Bambu', description: '3 Bambu/jam. Butuh 1 Bibit Bambu/jam.', rank: 'Common', workerOutputItemId: idOf('Bambu'), workerOutputItemName: 'Bambu', workerOutputQuantity: 3, workerInputMaterials: [{ itemId: idOf('Bibit Bambu'), itemName: 'Bibit Bambu', quantity: 1 }], constructionTimeHours: 3, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Bambu'), itemName: 'Bibit Bambu', quantity: 5 }], basePrice: 45, priceCurrency: 'silver' }),
    g({ name: 'Kebun Anggur', description: '2 Anggur Segar/jam. Butuh 1 Bibit Anggur/jam.', rank: 'Uncommon', workerOutputItemId: idOf('Anggur Segar'), workerOutputItemName: 'Anggur Segar', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Anggur'), itemName: 'Bibit Anggur', quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Anggur'), itemName: 'Bibit Anggur', quantity: 8 }], basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Kebun Teh', description: '2 Daun Teh Mentah/jam. Butuh 1 Bibit Teh/jam.', rank: 'Uncommon', workerOutputItemId: idOf('Daun Teh Mentah'), workerOutputItemName: 'Daun Teh Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Teh'), itemName: 'Bibit Teh', quantity: 1 }], constructionTimeHours: 10, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Teh'), itemName: 'Bibit Teh', quantity: 5 }], basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Tambak Garam', description: '4 Air Laut/jam. Butuh 1 Roti Panggang/jam.', rank: 'Common', workerOutputItemId: idOf('Air Laut'), workerOutputItemName: 'Air Laut', workerOutputQuantity: 4, workerInputMaterials: [{ itemId: idOf('Roti Panggang'), itemName: 'Roti Panggang', quantity: 1 }], constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }], basePrice: 60, priceCurrency: 'silver' }),
    g({ name: 'Peternakan Ayam', description: '2 Telur Mentah/jam. Butuh 1 Pakan Ternak/jam.', rank: 'Common', workerOutputItemId: idOf('Telur Mentah'), workerOutputItemName: 'Telur Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Pakan Ternak'), itemName: 'Pakan Ternak', quantity: 1 }], constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 15 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 10 }], basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Peternakan Sapi', description: '1 Susu Sapi/jam. Butuh 2 Pakan Ternak/jam.', rank: 'Uncommon', workerOutputItemId: idOf('Susu Sapi'), workerOutputItemName: 'Susu Sapi', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pakan Ternak'), itemName: 'Pakan Ternak', quantity: 2 }], constructionTimeHours: 12, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 30 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 20 }], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Peternakan Domba', description: '1 Wol Mentah/jam. Butuh 1 Pakan Ternak/jam.', rank: 'Uncommon', workerOutputItemId: idOf('Wol Mentah'), workerOutputItemName: 'Wol Mentah', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pakan Ternak'), itemName: 'Pakan Ternak', quantity: 1 }], constructionTimeHours: 10, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 25 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 15 }], basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Area Penebangan Kayu Besi', description: '2 Kayu Mentah/jam. Butuh 1 Kapak Besi/jam.', rank: 'Common', workerOutputItemId: idOf('Kayu Mentah'), workerOutputItemName: 'Kayu Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 2 }], basePrice: 70, priceCurrency: 'silver' }),
    g({ name: 'Hutan Pinus', description: '2 Kayu Pinus/jam. Butuh 1 Kapak Besi/jam.', rank: 'Uncommon', workerOutputItemId: idOf('Kayu Pinus'), workerOutputItemName: 'Kayu Pinus', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 2 }], basePrice: 90, priceCurrency: 'silver' }),
    g({ name: 'Hutan Jati', description: '1 Kayu Jati/jam. Butuh 1 Kapak Besi/jam.', rank: 'Uncommon', workerOutputItemId: idOf('Kayu Jati'), workerOutputItemName: 'Kayu Jati', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 12, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 3 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 10 }], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Tambang Batu Bara Dangkal', description: '2 Batu Bara/jam. Butuh 1 Beliung Besi/jam.', rank: 'Common', workerOutputItemId: idOf('Batu Bara'), workerOutputItemName: 'Batu Bara', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 10 }], basePrice: 90, priceCurrency: 'silver' }),
    g({ name: 'Tambang Bijih Besi Dangkal', description: '1 Bijih Besi/jam. Butuh 1 Beliung Besi/jam.', rank: 'Uncommon', workerOutputItemId: idOf('Bijih Besi'), workerOutputItemName: 'Bijih Besi', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 12, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 2 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 20 }], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Tambang Tembaga', description: '2 Bijih Tembaga/jam. Butuh 1 Beliung Besi/jam.', rank: 'Common', workerOutputItemId: idOf('Bijih Tembaga'), workerOutputItemName: 'Bijih Tembaga', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 15 }], basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Tambang Timah', description: '2 Bijih Timah/jam. Butuh 1 Beliung Besi/jam.', rank: 'Common', workerOutputItemId: idOf('Bijih Timah'), workerOutputItemName: 'Bijih Timah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 15 }], basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Tambang Perak', description: '1 Bijih Perak/jam. Butuh 1 Beliung Besi/jam.', rank: 'Uncommon', workerOutputItemId: idOf('Bijih Perak'), workerOutputItemName: 'Bijih Perak', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 16, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 2 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 25 }], basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Tambang Emas Dangkal', description: '1 Bijih Emas/jam. Butuh 1 Beliung Baja Hitam/jam.', rank: 'Rare', workerOutputItemId: idOf('Bijih Emas'), workerOutputItemName: 'Bijih Emas', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }], constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 10 }], basePrice: 10, priceCurrency: 'gold' }),
    g({ name: 'Hutan Kayu Ulin', description: '1 Kayu Ulin/jam. Butuh 1 Kapak Besi/jam.', rank: 'Rare', workerOutputItemId: idOf('Kayu Ulin (Ironwood)'), workerOutputItemName: 'Kayu Ulin (Ironwood)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 3 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 5 }], basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Hutan Bambu Hitam', description: '1 Bambu Hitam/jam. Butuh 1 Kapak Besi/jam.', rank: 'Rare', workerOutputItemId: idOf('Bambu Hitam (Black Bamboo)'), workerOutputItemName: 'Bambu Hitam (Black Bamboo)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 3 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 5 }], basePrice: 7, priceCurrency: 'gold' }),
    g({ name: 'Hutan Sandalwood', description: '1 Kayu Sandalwood/jam. Butuh 1 Kapak Besi/jam.', rank: 'Rare', workerOutputItemId: idOf('Kayu Sandalwood'), workerOutputItemName: 'Kayu Sandalwood', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 30, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 3 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 8 }], basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Kebun Ginseng Darah', description: '1 Ginseng Darah/jam. Butuh 1 Bibit Ginseng Darah/jam.', rank: 'Rare', workerOutputItemId: idOf('Ginseng Darah'), workerOutputItemName: 'Ginseng Darah', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Bibit Ginseng Darah'), itemName: 'Bibit Ginseng Darah', quantity: 1 }], constructionTimeHours: 36, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Giok'), itemName: 'Cangkul Giok', quantity: 1 }, { itemId: idOf('Bibit Ginseng Darah'), itemName: 'Bibit Ginseng Darah', quantity: 3 }], basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Kebun Bunga Bulan', description: '1 Bunga Bulan/jam. Butuh 1 Bibit Bunga Bulan/jam.', rank: 'Rare', workerOutputItemId: idOf('Bunga Bulan'), workerOutputItemName: 'Bunga Bulan', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Bibit Bunga Bulan'), itemName: 'Bibit Bunga Bulan', quantity: 1 }], constructionTimeHours: 36, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Giok'), itemName: 'Cangkul Giok', quantity: 1 }, { itemId: idOf('Bibit Bunga Bulan'), itemName: 'Bibit Bunga Bulan', quantity: 3 }], basePrice: 14, priceCurrency: 'gold' }),
    g({ name: 'Tambang Batu Roh Lapis Luar', description: '1 Pecahan Batu Roh/jam. Butuh 1 Roti Panggang/jam.', rank: 'Epic', workerOutputItemId: idOf('Pecahan Batu Roh'), workerOutputItemName: 'Pecahan Batu Roh', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Roti Panggang'), itemName: 'Roti Panggang', quantity: 1 }], constructionTimeHours: 72, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 30 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 50 }], basePrice: 40, priceCurrency: 'gold' }),
    g({ name: 'Tambang Besi Dingin', description: '1 Bijih Besi Dingin/jam. Butuh 1 Beliung Baja Hitam/jam.', rank: 'Epic', workerOutputItemId: idOf('Bijih Besi Dingin (Cold Iron)'), workerOutputItemName: 'Bijih Besi Dingin (Cold Iron)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }], constructionTimeHours: 72, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 2 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 40 }], basePrice: 50, priceCurrency: 'gold' }),
    g({ name: 'Tambang Mithril', description: '1 Bijih Mithril/jam. Butuh 1 Beliung Baja Hitam/jam.', rank: 'Epic', workerOutputItemId: idOf('Bijih Mithril'), workerOutputItemName: 'Bijih Mithril', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }], constructionTimeHours: 96, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 2 }, { itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 10 }], basePrice: 80, priceCurrency: 'gold' }),
    g({ name: 'Tambang Giok Roh', description: '1 Bijih Giok Roh/jam. Butuh 1 Beliung Baja Hitam/jam.', rank: 'Epic', workerOutputItemId: idOf('Bijih Giok Roh'), workerOutputItemName: 'Bijih Giok Roh', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }], constructionTimeHours: 80, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 2 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 25 }], basePrice: 60, priceCurrency: 'gold' }),
    g({ name: 'Kebun Teratai Surgawi', description: '1 Teratai Roh Langit/jam. Butuh 1 Pil Nutrisi Pekerja/jam.', rank: 'Legendary', workerOutputItemId: idOf('Teratai Roh Langit'), workerOutputItemName: 'Teratai Roh Langit', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pil Nutrisi Pekerja'), itemName: 'Pil Nutrisi Pekerja', quantity: 1 }], constructionTimeHours: 120, buildable: true, buildRequirements: [{ itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 50 }, { itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 20 }, { itemId: idOf('Bibit Teratai Roh'), itemName: 'Bibit Teratai Roh', quantity: 5 }], basePrice: 5, priceCurrency: 'jade' }),
    g({ name: 'Kebun Akar Naga', description: '1 Akar Naga/jam. Butuh 1 Pil Nutrisi Pekerja/jam.', rank: 'Legendary', workerOutputItemId: idOf('Akar Naga'), workerOutputItemName: 'Akar Naga', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pil Nutrisi Pekerja'), itemName: 'Pil Nutrisi Pekerja', quantity: 1 }], constructionTimeHours: 144, buildable: true, buildRequirements: [{ itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 40 }, { itemId: idOf('Bibit Akar Naga'), itemName: 'Bibit Akar Naga', quantity: 3 }], basePrice: 6, priceCurrency: 'jade' }),
    g({ name: 'Tambang Kristal Ilahi', description: '1 Kristal Roh Ilahi/jam. Butuh 1 Pil Nutrisi Pekerja/jam.', rank: 'Legendary', workerOutputItemId: idOf('Kristal Roh Ilahi'), workerOutputItemName: 'Kristal Roh Ilahi', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pil Nutrisi Pekerja'), itemName: 'Pil Nutrisi Pekerja', quantity: 1 }], constructionTimeHours: 144, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Penekan Qi'), itemName: 'Beliung Penekan Qi', quantity: 1 }, { itemId: idOf('Baja Darah (Blood Steel)'), itemName: 'Baja Darah (Blood Steel)', quantity: 15 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 30 }], basePrice: 8, priceCurrency: 'jade' }),
    g({ name: 'Hutan Kayu Surga', description: '1 Kayu Surga/jam. Butuh 1 Kapak Petir Surgawi/jam.', rank: 'Legendary', workerOutputItemId: idOf('Kayu Surga (Heavenly Wood)'), workerOutputItemName: 'Kayu Surga (Heavenly Wood)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Petir Surgawi'), itemName: 'Kapak Petir Surgawi', quantity: 1 }], constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Petir Surgawi'), itemName: 'Kapak Petir Surgawi', quantity: 1 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 5 }], basePrice: 10, priceCurrency: 'jade' }),
    g({ name: 'Hutan Kayu Jiwa', description: '1 Kayu Jiwa/jam. Butuh 1 Kapak Petir Surgawi/jam.', rank: 'Legendary', workerOutputItemId: idOf('Kayu Jiwa (Soulwood)'), workerOutputItemName: 'Kayu Jiwa (Soulwood)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Petir Surgawi'), itemName: 'Kapak Petir Surgawi', quantity: 1 }], constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Petir Surgawi'), itemName: 'Kapak Petir Surgawi', quantity: 1 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 8 }], basePrice: 12, priceCurrency: 'jade' }),
    g({ name: 'Tambang Star Iron', description: '1 Bijih Star Iron/jam. Butuh 1 Beliung Penekan Qi/jam.', rank: 'Legendary', workerOutputItemId: idOf('Bijih Star Iron'), workerOutputItemName: 'Bijih Star Iron', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Penekan Qi'), itemName: 'Beliung Penekan Qi', quantity: 1 }], constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Penekan Qi'), itemName: 'Beliung Penekan Qi', quantity: 1 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 10 }], basePrice: 15, priceCurrency: 'jade' }),
  ];
  assets.push(...prod);

  // CRAFTING (full chain)
  const craft = [
    g({ name: 'Tungku Tanah Liat Sederhana', description: 'Membakar bata & memasak dasar.', rank: 'Common', isCraftingStation: true, constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 20 }, { itemId: idOf('Batu Kasar'), itemName: 'Batu Kasar', quantity: 10 }], recipes: [ { recipeName: 'Bakar Batu Bata', resultItemId: idOf('Batu Bata'), resultItemName: 'Batu Bata', resultQuantity: 4, materials: [{ itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 5 }, { itemId: idOf('Kayu Bakar'), itemName: 'Kayu Bakar', quantity: 2 }] }, { recipeName: 'Panggang Daging', resultItemId: idOf('Daging Bakar'), resultItemName: 'Daging Bakar', resultQuantity: 1, materials: [{ itemId: idOf('Daging Mentah'), itemName: 'Daging Mentah', quantity: 1 }, { itemId: idOf('Kayu Bakar'), itemName: 'Kayu Bakar', quantity: 1 }] }, { recipeName: 'Buat Garam', resultItemId: idOf('Garam Kasar'), resultItemName: 'Garam Kasar', resultQuantity: 2, materials: [{ itemId: idOf('Air Laut'), itemName: 'Air Laut', quantity: 5 }] } ], basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Bengkel Kayu Desa', description: 'Mengolah kayu & alat primitif.', rank: 'Common', isCraftingStation: true, constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 30 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 10 }], recipes: [ { recipeName: 'Potong Papan (Batu)', resultItemId: idOf('Papan Kayu'), resultItemName: 'Papan Kayu', resultQuantity: 1, materials: [{ itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 4 }, { itemId: idOf('Kapak Batu'), itemName: 'Kapak Batu', quantity: 1 }] }, { recipeName: 'Potong Papan (Besi)', resultItemId: idOf('Papan Kayu'), resultItemName: 'Papan Kayu', resultQuantity: 2, materials: [{ itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 3 }, { itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }] }, { recipeName: 'Buat Kapak Batu', resultItemId: idOf('Kapak Batu'), resultItemName: 'Kapak Batu', resultQuantity: 1, materials: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 2 }, { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 1 }] }, { recipeName: 'Buat Tombak Kayu', resultItemId: idOf('Tombak Kayu'), resultItemName: 'Tombak Kayu', resultQuantity: 1, materials: [{ itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 2 }, { itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }] }, { recipeName: 'Buat Alat Pancing', resultItemId: idOf('Alat Pancing Kayu'), resultItemName: 'Alat Pancing Kayu', resultQuantity: 1, materials: [{ itemId: idOf('Bambu'), itemName: 'Bambu', quantity: 2 }, { itemId: idOf('Benang Wol'), itemName: 'Benang Wol', quantity: 1 }] } ], basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Penggilingan Desa', description: 'Mengolah hasil pertanian.', rank: 'Common', isCraftingStation: true, constructionTimeHours: 10, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 20 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 15 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 10 }], recipes: [ { recipeName: 'Giling Tepung', resultItemId: idOf('Tepung Terigu'), resultItemName: 'Tepung Terigu', resultQuantity: 2, materials: [{ itemId: idOf('Gandum'), itemName: 'Gandum', quantity: 3 }] }, { recipeName: 'Tumbuk Beras', resultItemId: idOf('Beras Putih'), resultItemName: 'Beras Putih', resultQuantity: 2, materials: [{ itemId: idOf('Padi Mentah'), itemName: 'Padi Mentah', quantity: 3 }] }, { recipeName: 'Giling Jagung', resultItemId: idOf('Tepung Jagung'), resultItemName: 'Tepung Jagung', resultQuantity: 2, materials: [{ itemId: idOf('Jagung Mentah'), itemName: 'Jagung Mentah', quantity: 3 }] }, { recipeName: 'Buat Roti', resultItemId: idOf('Roti Panggang'), resultItemName: 'Roti Panggang', resultQuantity: 2, materials: [{ itemId: idOf('Tepung Terigu'), itemName: 'Tepung Terigu', quantity: 2 }, { itemId: idOf('Kayu Bakar'), itemName: 'Kayu Bakar', quantity: 1 }] }, { recipeName: 'Buat Nasi', resultItemId: idOf('Nasi Putih'), resultItemName: 'Nasi Putih', resultQuantity: 2, materials: [{ itemId: idOf('Beras Putih'), itemName: 'Beras Putih', quantity: 2 }, { itemId: idOf('Air Bersih'), itemName: 'Air Bersih', quantity: 1 }] }, { recipeName: 'Buat Tahu', resultItemId: idOf('Tahu'), resultItemName: 'Tahu', resultQuantity: 2, materials: [{ itemId: idOf('Kedelai Mentah'), itemName: 'Kedelai Mentah', quantity: 3 }] } ], basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Tempat Penenunan', description: 'Menenun kain dari serat.', rank: 'Uncommon', isCraftingStation: true, constructionTimeHours: 16, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 25 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 20 }], recipes: [ { recipeName: 'Tenun Kain Katun', resultItemId: idOf('Kain Katun'), resultItemName: 'Kain Katun', resultQuantity: 1, materials: [{ itemId: idOf('Kapas Mentah'), itemName: 'Kapas Mentah', quantity: 4 }, { itemId: idOf('Alat Tenun Sederhana'), itemName: 'Alat Tenun Sederhana', quantity: 1 }] }, { recipeName: 'Pintal Benang Wol', resultItemId: idOf('Benang Wol'), resultItemName: 'Benang Wol', resultQuantity: 2, materials: [{ itemId: idOf('Wol Mentah'), itemName: 'Wol Mentah', quantity: 3 }] }, { recipeName: 'Tenun Kain Wol', resultItemId: idOf('Kain Wol'), resultItemName: 'Kain Wol', resultQuantity: 1, materials: [{ itemId: idOf('Benang Wol'), itemName: 'Benang Wol', quantity: 4 }] } ], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Tungku Peleburan Dasar', description: 'Melebur tembaga, timah, perunggu.', rank: 'Uncommon', isCraftingStation: true, constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 40 }, { itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 20 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 10 }], recipes: [ { recipeName: 'Lebur Tembaga', resultItemId: idOf('Batangan Tembaga'), resultItemName: 'Batangan Tembaga', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Tembaga'), itemName: 'Bijih Tembaga', quantity: 3 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 1 }] }, { recipeName: 'Lebur Timah', resultItemId: idOf('Batangan Timah'), resultItemName: 'Batangan Timah', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Timah'), itemName: 'Bijih Timah', quantity: 3 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 1 }] }, { recipeName: 'Paduan Perunggu', resultItemId: idOf('Perunggu'), resultItemName: 'Perunggu', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Tembaga'), itemName: 'Batangan Tembaga', quantity: 2 }, { itemId: idOf('Batangan Timah'), itemName: 'Batangan Timah', quantity: 1 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 2 }] }, { recipeName: 'Buat Semen', resultItemId: idOf('Semen Mentah'), resultItemName: 'Semen Mentah', resultQuantity: 2, materials: [{ itemId: idOf('Batu Kapur'), itemName: 'Batu Kapur', quantity: 3 }, { itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 2 }] }, { recipeName: 'Lebur Kaca', resultItemId: idOf('Kaca Kusam'), resultItemName: 'Kaca Kusam', resultQuantity: 1, materials: [{ itemId: idOf('Pasir Putih'), itemName: 'Pasir Putih', quantity: 5 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 2 }] } ], basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Tungku Peleburan Lanjutan', description: 'Melebur besi, baja, emas, perak.', rank: 'Uncommon', isCraftingStation: true, constructionTimeHours: 36, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 80 }, { itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 40 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 20 }], recipes: [ { recipeName: 'Lebur Besi', resultItemId: idOf('Batangan Besi'), resultItemName: 'Batangan Besi', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Besi'), itemName: 'Bijih Besi', quantity: 3 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 2 }] }, { recipeName: 'Tempa Baja Keras', resultItemId: idOf('Baja Keras'), resultItemName: 'Baja Keras', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 3 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Lebur Emas', resultItemId: idOf('Batangan Emas'), resultItemName: 'Batangan Emas', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Emas'), itemName: 'Bijih Emas', quantity: 5 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 3 }] }, { recipeName: 'Lebur Perak', resultItemId: idOf('Batangan Perak'), resultItemName: 'Batangan Perak', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Perak'), itemName: 'Bijih Perak', quantity: 4 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 2 }] }, { recipeName: 'Tempa Cangkul Besi', resultItemId: idOf('Cangkul Besi'), resultItemName: 'Cangkul Besi', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Kapak Besi', resultItemId: idOf('Kapak Besi'), resultItemName: 'Kapak Besi', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Beliung Besi', resultItemId: idOf('Beliung Besi'), resultItemName: 'Beliung Besi', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Pisau Jagal', resultItemId: idOf('Pisau Jagal'), resultItemName: 'Pisau Jagal', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 1 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Palu Tempa', resultItemId: idOf('Palu Tempa'), resultItemName: 'Palu Tempa', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 1 }, { itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }] }, { recipeName: 'Samak Kulit', resultItemId: idOf('Kulit Samak'), resultItemName: 'Kulit Samak', resultQuantity: 1, materials: [{ itemId: idOf('Kulit Mentah'), itemName: 'Kulit Mentah', quantity: 2 }, { itemId: idOf('Garam Kasar'), itemName: 'Garam Kasar', quantity: 1 }] } ], basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Bengkel Tempa Murim', description: 'Senjata & armor tingkat menengah.', rank: 'Rare', isCraftingStation: true, constructionTimeHours: 48, buildable: true, buildRequirements: [{ itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 20 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 100 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 50 }], recipes: [ { recipeName: 'Tempa Pedang Baja', resultItemId: idOf('Pedang Baja'), resultItemName: 'Pedang Baja', resultQuantity: 1, materials: [{ itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 3 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Pedang Baja Hitam', resultItemId: idOf('Pedang Baja Hitam'), resultItemName: 'Pedang Baja Hitam', resultQuantity: 1, materials: [{ itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 2 }, { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1 }] }, { recipeName: 'Tempa Pedang Besi Biasa', resultItemId: idOf('Pedang Besi Biasa'), resultItemName: 'Pedang Besi Biasa', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 3 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Buat Jubah Kulit', resultItemId: idOf('Jubah Kulit'), resultItemName: 'Jubah Kulit', resultQuantity: 1, materials: [{ itemId: idOf('Kulit Samak'), itemName: 'Kulit Samak', quantity: 4 }, { itemId: idOf('Jarum Jahit Besi'), itemName: 'Jarum Jahit Besi', quantity: 1 }] } ], basePrice: 25, priceCurrency: 'gold' }),
    g({ name: 'Paviliun Alkimia', description: 'Meramu pil & mengolah herbal roh.', rank: 'Epic', isCraftingStation: true, constructionTimeHours: 72, buildable: true, buildRequirements: [{ itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 15 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 30 }, { itemId: idOf('Genteng Keramik'), itemName: 'Genteng Keramik', quantity: 50 }], recipes: [ { recipeName: 'Suling Pil Pengumpul Qi', resultItemId: idOf('Pil Pengumpul Qi'), resultItemName: 'Pil Pengumpul Qi', resultQuantity: 1, materials: [{ itemId: idOf('Ginseng Darah'), itemName: 'Ginseng Darah', quantity: 2 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 5 }] }, { recipeName: 'Suling Pil Penempa Tulang', resultItemId: idOf('Pil Penempa Tulang'), resultItemName: 'Pil Penempa Tulang', resultQuantity: 1, materials: [{ itemId: idOf('Rumput Pembersih Sumsum'), itemName: 'Rumput Pembersih Sumsum', quantity: 3 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 10 }] }, { recipeName: 'Padatkan Batu Roh', resultItemId: idOf('Batu Roh Utuh'), resultItemName: 'Batu Roh Utuh', resultQuantity: 1, materials: [{ itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 100 }] }, { recipeName: 'Suling Pil Pemulih Berat', resultItemId: idOf('Pil Pemulih Luka Berat'), resultItemName: 'Pil Pemulih Luka Berat', resultQuantity: 1, materials: [{ itemId: idOf('Ginseng Darah'), itemName: 'Ginseng Darah', quantity: 1 }, { itemId: idOf('Madu Murni'), itemName: 'Madu Murni', quantity: 2 }] }, { recipeName: 'Buat Baja Darah', resultItemId: idOf('Baja Darah (Blood Steel)'), resultItemName: 'Baja Darah (Blood Steel)', resultQuantity: 1, materials: [{ itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 1 }, { itemId: idOf('Darah Spirit Beast'), itemName: 'Darah Spirit Beast', quantity: 3 }] }, { recipeName: 'Buat Sutra Ulat Salju', resultItemId: idOf('Sutra Ulat Salju'), resultItemName: 'Sutra Ulat Salju', resultQuantity: 1, materials: [{ itemId: idOf('Kepompong Ulat Salju'), itemName: 'Kepompong Ulat Salju', quantity: 5 }] } ], basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Bengkel Pusaka Tinggi', description: 'Membuat senjata & artifact tingkat tinggi.', rank: 'Legendary', isCraftingStation: true, constructionTimeHours: 120, buildable: true, buildRequirements: [{ itemId: idOf('Baja Darah (Blood Steel)'), itemName: 'Baja Darah (Blood Steel)', quantity: 20 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 10 }, { itemId: idOf('Kayu Surga (Heavenly Wood)'), itemName: 'Kayu Surga (Heavenly Wood)', quantity: 15 }], recipes: [ { recipeName: 'Tempa Pedang Darah Spirit', resultItemId: idOf('Pedang Darah Spirit'), resultItemName: 'Pedang Darah Spirit', resultQuantity: 1, materials: [{ itemId: idOf('Baja Darah (Blood Steel)'), itemName: 'Baja Darah (Blood Steel)', quantity: 3 }, { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1 }] }, { recipeName: 'Tempa Pedang Star Iron', resultItemId: idOf('Pedang Star Iron'), resultItemName: 'Pedang Star Iron', resultQuantity: 1, materials: [{ itemId: idOf('Pelat Star Iron'), itemName: 'Pelat Star Iron', quantity: 2 }, { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 2 }] }, { recipeName: 'Buat Jimat Giok Roh', resultItemId: idOf('Jimat Giok Roh'), resultItemName: 'Jimat Giok Roh', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Giok Roh'), itemName: 'Bijih Giok Roh', quantity: 5 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 10 }] }, { recipeName: 'Buat Jubah Sutra Salju', resultItemId: idOf('Jubah Sutra Salju'), resultItemName: 'Jubah Sutra Salju', resultQuantity: 1, materials: [{ itemId: idOf('Sutra Ulat Salju'), itemName: 'Sutra Ulat Salju', quantity: 5 }, { itemId: idOf('Jarum Meridian'), itemName: 'Jarum Meridian', quantity: 1 }] } ], basePrice: 10, priceCurrency: 'jade' }),
  ];
  assets.push(...craft);

  // INCOME
  const income = [
    g({ name: 'Tikar Pengemis', description: '3 Silver/hari.', rank: 'Common', dailyProfit: 3, profitCurrency: 'silver', constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Kain Katun'), itemName: 'Kain Katun', quantity: 2 }], basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Warung Desa', description: '8 Silver/hari.', rank: 'Common', dailyProfit: 8, profitCurrency: 'silver', constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 15 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 10 }], basePrice: 60, priceCurrency: 'silver' }),
    g({ name: 'Kuil Leluhur Desa', description: '15 Silver/hari.', rank: 'Uncommon', dailyProfit: 15, profitCurrency: 'silver', constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 40 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 25 }], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Kedai Teh', description: '25 Silver/hari.', rank: 'Uncommon', dailyProfit: 25, profitCurrency: 'silver', constructionTimeHours: 30, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 40 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 30 }, { itemId: idOf('Kain Katun'), itemName: 'Kain Katun', quantity: 10 }], basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Kedai Arak Murim', description: '80 Silver/hari.', rank: 'Rare', dailyProfit: 80, profitCurrency: 'silver', constructionTimeHours: 48, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 150 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 100 }, { itemId: idOf('Genteng Keramik'), itemName: 'Genteng Keramik', quantity: 60 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 8 }], basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Penginapan Kota', description: '1.5 Gold/hari.', rank: 'Rare', dailyProfit: 150, profitCurrency: 'silver', constructionTimeHours: 60, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 200 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 120 }, { itemId: idOf('Genteng Keramik'), itemName: 'Genteng Keramik', quantity: 80 }, { itemId: idOf('Kain Wol'), itemName: 'Kain Wol', quantity: 20 }], basePrice: 25, priceCurrency: 'gold' }),
    g({ name: 'Balai Lelang Kota', description: '4 Gold/hari.', rank: 'Epic', dailyProfit: 4, profitCurrency: 'gold', constructionTimeHours: 96, buildable: true, buildRequirements: [{ itemId: idOf('Semen Mentah'), itemName: 'Semen Mentah', quantity: 80 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 40 }, { itemId: idOf('Kaca Kusam'), itemName: 'Kaca Kusam', quantity: 40 }, { itemId: idOf('Kayu Ulin (Ironwood)'), itemName: 'Kayu Ulin (Ironwood)', quantity: 15 }], basePrice: 80, priceCurrency: 'gold' }),
    g({ name: 'Markas Sekte Luar', description: '8 Gold/hari.', rank: 'Epic', dailyProfit: 8, profitCurrency: 'gold', constructionTimeHours: 120, buildable: true, buildRequirements: [{ itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 150 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 60 }, { itemId: idOf('Sutra Ulat Salju'), itemName: 'Sutra Ulat Salju', quantity: 10 }, { itemId: idOf('Kayu Persik Berdarah'), itemName: 'Kayu Persik Berdarah', quantity: 20 }], basePrice: 150, priceCurrency: 'gold' }),
    g({ name: 'Paviliun Harta Surgawi', description: '1 Jade/hari (batas max individu).', rank: 'Legendary', dailyProfit: 1, profitCurrency: 'jade', constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 50 }, { itemId: idOf('Kayu Surga (Heavenly Wood)'), itemName: 'Kayu Surga (Heavenly Wood)', quantity: 20 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 8 }, { itemId: idOf('Batu Roh Utuh'), itemName: 'Batu Roh Utuh', quantity: 3 }], basePrice: 15, priceCurrency: 'jade' }),
    g({ name: 'Istana Terapung', description: '1 Jade/hari (batas max individu).', rank: 'Legendary', dailyProfit: 1, profitCurrency: 'jade', constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Jimat Giok Roh'), itemName: 'Jimat Giok Roh', quantity: 30 }, { itemId: idOf('Baja Darah (Blood Steel)'), itemName: 'Baja Darah (Blood Steel)', quantity: 30 }, { itemId: idOf('Batu Roh Utuh'), itemName: 'Batu Roh Utuh', quantity: 5 }], basePrice: 20, priceCurrency: 'jade' }),
  ];
  assets.push(...income);


  // ========== MASS EXPANSION ASSETS ==========
  // More production nodes (balanced)
  const moreProdNames = [
    { name: "Kebun Sayur", out: "Bibit Sayur", q: 2, in: "Bibit Sayur", inQ: 1, rank: "Common", time: 3, price: 40, curr: "silver", tool: "Cangkul Besi" },
    { name: "Kebun Buah", out: "Buah Liar", q: 2, in: null, inQ: 0, rank: "Common", time: 2, price: 25, curr: "silver", tool: "Cangkul Besi" },
    { name: "Kolam Ikan", out: "Ikan Air Tawar", q: 2, in: "Roti Panggang", inQ: 1, rank: "Common", time: 4, price: 50, curr: "silver", tool: "Alat Pancing Kayu" },
    { name: "Tambak Udang", out: "Udang Sungai", q: 2, in: "Roti Panggang", inQ: 1, rank: "Uncommon", time: 6, price: 80, curr: "silver", tool: "Alat Pancing Kayu" },
    { name: "Hutan Maple", out: "Kayu Maple", q: 2, in: "Kapak Besi", inQ: 1, rank: "Common", time: 5, price: 60, curr: "silver", tool: "Kapak Besi" },
    { name: "Hutan Ek", out: "Kayu Ek", q: 1, in: "Kapak Besi", inQ: 1, rank: "Uncommon", time: 10, price: 1, curr: "gold", tool: "Kapak Besi" },
    { name: "Hutan Ebony", out: "Kayu Ebony", q: 1, in: "Kapak Besi", inQ: 1, rank: "Rare", time: 24, price: 6, curr: "gold", tool: "Kapak Besi" },
    { name: "Tambang Nikel", out: "Bijih Nikel", q: 1, in: "Beliung Besi", inQ: 1, rank: "Uncommon", time: 12, price: 2, curr: "gold", tool: "Beliung Besi" },
    { name: "Tambang Kobalt", out: "Bijih Kobalt", q: 1, in: "Beliung Baja Hitam", inQ: 1, rank: "Rare", time: 30, price: 8, curr: "gold", tool: "Beliung Baja Hitam" },
    { name: "Tambang Platinum", out: "Bijih Platinum", q: 1, in: "Beliung Baja Hitam", inQ: 1, rank: "Epic", time: 72, price: 40, curr: "gold", tool: "Beliung Baja Hitam" },
    { name: "Tambang Obsidian", out: "Batu Obsidian", q: 1, in: "Beliung Baja Hitam", inQ: 1, rank: "Rare", time: 36, price: 10, curr: "gold", tool: "Beliung Baja Hitam" },
    { name: "Galian Kuarsa", out: "Kristal Kuarsa", q: 2, in: "Beliung Besi", inQ: 1, rank: "Uncommon", time: 10, price: 1, curr: "gold", tool: "Beliung Besi" },
    { name: "Tambang Ametis", out: "Batu Ametis", q: 1, in: "Beliung Baja Hitam", inQ: 1, rank: "Rare", time: 40, price: 12, curr: "gold", tool: "Beliung Baja Hitam" },
    { name: "Tambang Giok Hijau", out: "Giok Hijau", q: 1, in: "Beliung Baja Hitam", inQ: 1, rank: "Rare", time: 48, price: 15, curr: "gold", tool: "Beliung Baja Hitam" },
    { name: "Tambang Giok Putih", out: "Giok Putih", q: 1, in: "Beliung Baja Hitam", inQ: 1, rank: "Epic", time: 80, price: 50, curr: "gold", tool: "Beliung Baja Hitam" },
    { name: "Kebun Rumput Qi", out: "Rumput Qi", q: 1, in: "Bibit Sayur", inQ: 1, rank: "Uncommon", time: 12, price: 1, curr: "gold", tool: "Cangkul Giok" },
    { name: "Kebun Daun Spirit", out: "Daun Spirit", q: 1, in: "Bibit Sayur", inQ: 1, rank: "Rare", time: 24, price: 5, curr: "gold", tool: "Cangkul Giok" },
    { name: "Kebun Bunga Moon", out: "Bunga Moon", q: 1, in: "Bibit Bunga Bulan", inQ: 1, rank: "Rare", time: 30, price: 8, curr: "gold", tool: "Cangkul Giok" },
    { name: "Peternakan Kambing", out: "Susu Kambing", q: 1, in: "Pakan Ternak", inQ: 1, rank: "Uncommon", time: 8, price: 1, curr: "gold", tool: null },
    { name: "Area Buruan Menengah", out: "Daging Mentah", q: 2, in: "Tombak Kayu", inQ: 1, rank: "Uncommon", time: 6, price: 70, curr: "silver", tool: "Tombak Kayu" },
    { name: "Laut Dalam", out: "Ikan Laut", q: 1, in: "Alat Pancing Kayu", inQ: 1, rank: "Uncommon", time: 12, price: 2, curr: "gold", tool: "Alat Pancing Kayu" },
  ];

  moreProdNames.forEach(p => {
    try {
      const outId = idOf(p.out);
      const inputs = p.in ? [{ itemId: idOf(p.in), itemName: p.in, quantity: p.inQ }] : [];
      const builds = [];
      if (p.tool) {
        try { builds.push({ itemId: idOf(p.tool), itemName: p.tool, quantity: 1 }); } catch(e) {}
      }
      builds.push({ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 });
      assets.push(g({
        name: p.name,
        description: `${p.q} ${p.out}/jam` + (p.in ? `. Butuh ${p.inQ} ${p.in}/jam.` : "."),
        rank: p.rank,
        workerOutputItemId: outId,
        workerOutputItemName: p.out,
        workerOutputQuantity: p.q,
        workerInputMaterials: inputs,
        constructionTimeHours: p.time,
        buildable: true,
        buildRequirements: builds,
        basePrice: p.price,
        priceCurrency: p.curr,
      }));
    } catch (e) { /* skip if item missing */ }
  });

  // More income buildings progressive
  const moreIncome = [
    { name: "Toko Kelontong", desc: "12 Silver/hari.", profit: 12, curr: "silver", rank: "Common", time: 12, price: 80, pcurr: "silver", mats: [["Papan Kayu", 20], ["Batu Bata", 15]] },
    { name: "Bengkel Desa", desc: "20 Silver/hari.", profit: 20, curr: "silver", rank: "Uncommon", time: 20, price: 2, pcurr: "gold", mats: [["Papan Kayu", 30], ["Batu Bata", 25], ["Batangan Besi", 5]] },
    { name: "Rumah Bordir", desc: "30 Silver/hari.", profit: 30, curr: "silver", rank: "Uncommon", time: 24, price: 3, pcurr: "gold", mats: [["Papan Kayu", 25], ["Kain Katun", 20]] },
    { name: "Apotek Desa", desc: "40 Silver/hari.", profit: 40, curr: "silver", rank: "Uncommon", time: 30, price: 4, pcurr: "gold", mats: [["Batu Bata", 40], ["Papan Kayu", 30], ["Kaca Kusam", 10]] },
    { name: "Dojo Murim", desc: "2 Gold/hari.", profit: 2, curr: "gold", rank: "Rare", time: 48, price: 20, pcurr: "gold", mats: [["Baja Keras", 15], ["Batu Bata", 100], ["Papan Kayu", 60]] },
    { name: "Toko Senjata", desc: "3 Gold/hari.", profit: 3, curr: "gold", rank: "Rare", time: 60, price: 30, pcurr: "gold", mats: [["Baja Keras", 25], ["Batu Bata", 120], ["Papan Kayu", 50]] },
    { name: "Paviliun Teh Mewah", desc: "5 Gold/hari.", profit: 5, curr: "gold", rank: "Epic", time: 80, price: 60, pcurr: "gold", mats: [["Kayu Ulin (Ironwood)", 20], ["Sutra Ulat Salju", 5], ["Batu Bata", 150]] },
    { name: "Balai Perdagangan", desc: "6 Gold/hari.", profit: 6, curr: "gold", rank: "Epic", time: 100, price: 100, pcurr: "gold", mats: [["Baja Keras", 40], ["Semen Mentah", 50], ["Kaca Kusam", 30]] },
    { name: "Kuil Kultivasi", desc: "10 Gold/hari.", profit: 10, curr: "gold", rank: "Epic", time: 120, price: 120, pcurr: "gold", mats: [["Baja Hitam Mistis", 20], ["Pecahan Batu Roh", 30], ["Kayu Persik Berdarah", 15]] },
    { name: "Menara Array", desc: "1 Jade/hari.", profit: 1, curr: "jade", rank: "Legendary", time: 168, price: 12, pcurr: "jade", mats: [["Kristal Roh Ilahi", 10], ["Jimat Giok Roh", 20], ["Batu Roh Utuh", 5]] },
  ];

  moreIncome.forEach(inc => {
    try {
      const reqs = inc.mats.map(([n, q]) => ({ itemId: idOf(n), itemName: n, quantity: q }));
      assets.push(g({
        name: inc.name,
        description: inc.desc,
        rank: inc.rank,
        dailyProfit: inc.profit,
        profitCurrency: inc.curr,
        constructionTimeHours: inc.time,
        buildable: true,
        buildRequirements: reqs,
        basePrice: inc.price,
        priceCurrency: inc.pcurr,
      }));
    } catch (e) {}
  });

  // More specialized crafting
  const moreCraft = [
    {
      name: "Dapur Umum",
      desc: "Memasak makanan olahan.",
      rank: "Common",
      time: 6,
      price: 40,
      curr: "silver",
      reqs: [["Papan Kayu", 15], ["Batu Bata", 10], ["Tanah Liat", 10]],
      recipes: [
        { rn: "Buat Sup Tulang", res: "Sup Tulang", rq: 1, mats: [["Daging Mentah", 2], ["Kayu Bakar", 1]] },
        { rn: "Buat Ikan Asin", res: "Ikan Asin", rq: 1, mats: [["Ikan Air Tawar", 2], ["Garam Kasar", 1]] },
        { rn: "Buat Keju", res: "Keju", rq: 1, mats: [["Susu Sapi", 2]] },
      ]
    },
    {
      name: "Destilasi Anggur",
      desc: "Fermentasi minuman.",
      rank: "Uncommon",
      time: 16,
      price: 2,
      curr: "gold",
      reqs: [["Papan Kayu", 20], ["Batu Bata", 15], ["Kaca Kusam", 5]],
      recipes: [
        { rn: "Fermentasi Wine", res: "Anggur Merah (Wine)", rq: 1, mats: [["Anggur Segar", 5]] },
        { rn: "Buat Sake", res: "Arak Beras (Sake)", rq: 1, mats: [["Beras Putih", 4], ["Air Bersih", 2]] },
      ]
    },
  ];

  moreCraft.forEach(c => {
    try {
      const reqs = c.reqs.map(([n, q]) => ({ itemId: idOf(n), itemName: n, quantity: q }));
      const recipes = c.recipes.map(r => ({
        recipeName: r.rn,
        resultItemId: idOf(r.res),
        resultItemName: r.res,
        resultQuantity: r.rq,
        materials: r.mats.map(([n, q]) => ({ itemId: idOf(n), itemName: n, quantity: q }))
      }));
      assets.push(g({
        name: c.name,
        description: c.desc,
        rank: c.rank,
        isCraftingStation: true,
        constructionTimeHours: c.time,
        buildable: true,
        buildRequirements: reqs,
        recipes,
        basePrice: c.price,
        priceCurrency: c.curr,
      }));
    } catch (e) {}
  });


  // ========== MEGA ASSET EXPANSION (resource nodes + buildings) ==========
  // Generate many balanced production assets by resource families
  const resourceFamilies = [
    { prefix: "Ladang", outs: ["Gandum", "Padi Mentah", "Jagung Mentah", "Kedelai Mentah", "Kapas Mentah"], tool: "Cangkul Besi", seedMap: { "Gandum": "Bibit Gandum", "Padi Mentah": "Bibit Padi", "Jagung Mentah": "Bibit Jagung", "Kedelai Mentah": "Bibit Kedelai", "Kapas Mentah": "Bibit Kapas" }, rank: "Common", q: 2, time: 4, price: 45, curr: "silver" },
    { prefix: "Hutan", outs: ["Kayu Mentah", "Bambu", "Kayu Pinus", "Kayu Maple"], tool: "Kapak Besi", rank: "Common", q: 2, time: 4, price: 50, curr: "silver" },
    { prefix: "Tambang Dangkal", outs: ["Batu Bara", "Bijih Tembaga", "Bijih Timah", "Bijih Besi", "Batu Kasar"], tool: "Beliung Besi", rank: "Common", q: 1, time: 8, price: 70, curr: "silver" },
    { prefix: "Tambang Dalam", outs: ["Bijih Perak", "Bijih Emas", "Bijih Nikel", "Kristal Kuarsa"], tool: "Beliung Baja Hitam", rank: "Rare", q: 1, time: 24, price: 8, curr: "gold" },
    { prefix: "Kebun Herbal", outs: ["Rumput Qi", "Daun Spirit", "Akar Moon", "Bunga Sun", "Rumput Fire"], tool: "Cangkul Giok", rank: "Rare", q: 1, time: 20, price: 6, curr: "gold" },
    { prefix: "Peternakan", outs: ["Telur Mentah", "Susu Sapi", "Wol Mentah", "Susu Kambing"], tool: null, inItem: "Pakan Ternak", rank: "Uncommon", q: 1, time: 8, price: 1, curr: "gold" },
    { prefix: "Perairan", outs: ["Ikan Air Tawar", "Ikan Laut", "Udang Sungai"], tool: "Alat Pancing Kayu", rank: "Common", q: 2, time: 5, price: 40, curr: "silver" },
  ];

  let assetCounter = 0;
  resourceFamilies.forEach(fam => {
    fam.outs.forEach((out, oi) => {
      for (let variant = 1; variant <= 3; variant++) {
        try {
          const name = `${fam.prefix} ${out.replace(/ Mentah| \(.*\)/g, "")} ${variant === 1 ? "Utama" : variant === 2 ? "Cadangan" : "Kecil"}`;
          const outId = idOf(out);
          const inputs = [];
          if (fam.seedMap && fam.seedMap[out]) {
            inputs.push({ itemId: idOf(fam.seedMap[out]), itemName: fam.seedMap[out], quantity: 1 });
          } else if (fam.inItem) {
            inputs.push({ itemId: idOf(fam.inItem), itemName: fam.inItem, quantity: 1 });
          } else if (fam.tool) {
            inputs.push({ itemId: idOf(fam.tool), itemName: fam.tool, quantity: 1 });
          }
          const builds = [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 8 + variant * 2 }];
          if (fam.tool) {
            try { builds.push({ itemId: idOf(fam.tool), itemName: fam.tool, quantity: 1 }); } catch(e) {}
          }
          assets.push(g({
            name,
            description: `${fam.q} ${out}/jam. Variant ${variant}.`,
            rank: fam.rank,
            workerOutputItemId: outId,
            workerOutputItemName: out,
            workerOutputQuantity: Math.max(1, fam.q - (variant - 1)),
            workerInputMaterials: inputs,
            constructionTimeHours: fam.time + variant * 2,
            buildable: true,
            buildRequirements: builds,
            basePrice: fam.price + variant * 5,
            priceCurrency: fam.curr,
          }));
          assetCounter++;
        } catch (e) {}
      }
    });
  });

  // Generate many small income shacks / stalls
  const stallTypes = ["Warung", "Kios", "Stan", "Pondok", "Gubuk", "Kedai Kecil", "Toko Kecil", "Lapak"];
  const stallGoods = ["Makanan", "Minuman", "Obat", "Alat", "Pakaian", "Senjata", "Herbal", "Jimat", "Buku", "Perhiasan"];
  stallTypes.forEach((st, si) => {
    stallGoods.forEach((sg, gi) => {
      try {
        const name = `${st} ${sg}`;
        const profit = 5 + si * 2 + gi;
        assets.push(g({
          name,
          description: `${profit} Silver/hari dari penjualan ${sg.toLowerCase()}.`,
          rank: profit < 15 ? "Common" : "Uncommon",
          dailyProfit: profit,
          profitCurrency: "silver",
          constructionTimeHours: 4 + si,
          buildable: true,
          buildRequirements: [
            { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 8 },
            { itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 5 },
          ],
          basePrice: 30 + profit * 2,
          priceCurrency: "silver",
        }));
        assetCounter++;
      } catch (e) {}
    });
  });

  // Mid-tier halls
  const halls = ["Balai", "Paviliun", "Aula", "Gedung", "Menara"];
  const hallPurposes = ["Pertemuan", "Latihan", "Meditasi", "Perdagangan", "Penyimpanan", "Penelitian", "Pengobatan", "Senjata"];
  halls.forEach((h, hi) => {
    hallPurposes.forEach((hp, hpi) => {
      try {
        const name = `${h} ${hp}`;
        const profit = 50 + hi * 20 + hpi * 10;
        assets.push(g({
          name,
          description: `${profit} Silver/hari.`,
          rank: profit < 100 ? "Uncommon" : "Rare",
          dailyProfit: profit,
          profitCurrency: "silver",
          constructionTimeHours: 24 + hi * 12,
          buildable: true,
          buildRequirements: [
            { itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 40 + hi * 20 },
            { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 30 + hi * 15 },
            { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 2 + hi },
          ],
          basePrice: Math.floor(profit / 10),
          priceCurrency: "gold",
        }));
        assetCounter++;
      } catch (e) {}
    });
  });

  console.log("Mega assets added approx:", assetCounter);


  // FINAL ASSET PUSH - more variants
  const zones = ["Utara", "Selatan", "Timur", "Barat", "Tengah", "Pegunungan", "Lembah", "Pantai", "Hutan Dalam", "Gurun"];
  const resTypes = ["Kayu", "Batu", "Bijih", "Herbal", "Ikan", "Buruan"];
  zones.forEach((z, zi) => {
    resTypes.forEach((rt, rti) => {
      try {
        const outMap = { "Kayu": "Kayu Mentah", "Batu": "Batu Kasar", "Bijih": "Bijih Besi", "Herbal": "Rumput Qi", "Ikan": "Ikan Air Tawar", "Buruan": "Daging Mentah" };
        const out = outMap[rt] || "Kayu Mentah";
        const name = `Area ${rt} ${z}`;
        assets.push(g({
          name,
          description: `1-2 ${out}/jam di zona ${z}.`,
          rank: zi < 3 ? "Common" : zi < 6 ? "Uncommon" : "Rare",
          workerOutputItemId: idOf(out),
          workerOutputItemName: out,
          workerOutputQuantity: zi < 5 ? 2 : 1,
          workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }],
          constructionTimeHours: 6 + zi * 2,
          buildable: true,
          buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }, { itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 5 }],
          basePrice: 40 + zi * 10,
          priceCurrency: "silver",
        }));
      } catch(e) {}
    });
  });
  // More sect-style buildings
  const sectBuild = ["Gerbang", "Dinding", "Menara Jaga", "Asrama", "Dapur Umum", "Gudang", "Perpustakaan", "Arena Latihan", "Kolam Meditasi", "Altar"];
  sectBuild.forEach((sb, sbi) => {
    try {
      assets.push(g({
        name: `${sb} Sekte`,
        description: `${10 + sbi * 5} Silver/hari dari fasilitas sekte.`,
        rank: sbi < 4 ? "Uncommon" : "Rare",
        dailyProfit: 10 + sbi * 5,
        profitCurrency: "silver",
        constructionTimeHours: 12 + sbi * 6,
        buildable: true,
        buildRequirements: [
          { itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 30 + sbi * 10 },
          { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 + sbi * 8 },
        ],
        basePrice: 1 + sbi,
        priceCurrency: "gold",
      }));
    } catch(e) {}
  });


  // ========== QUALITY UNIQUE ASSETS ==========
  // Late-game production (very expensive input, low output = sink)
  const lateProd = [
    { name: "Kebun Air Mata Phoenix", out: "Air Mata Phoenix", q: 1, in: "Pil Nutrisi Tinggi", rank: "Legendary", time: 168, price: 12, curr: "jade" },
    { name: "Sarang Laba-laba Kristal", out: "Benang Laba-laba Kristal", q: 1, in: "Pil Nutrisi Pekerja", rank: "Epic", time: 96, price: 60, curr: "gold" },
    { name: "Altar Qilin", out: "Tanduk Qilin", q: 1, in: "Pil Nutrisi Tinggi", rank: "Legendary", time: 168, price: 15, curr: "jade" },
  ];
  lateProd.forEach(p => {
    try {
      assets.push(g({
        name: p.name,
        description: `1 ${p.out}/jam. Butuh ${p.in}/jam. Sink tingkat tinggi.`,
        rank: p.rank,
        workerOutputItemId: idOf(p.out),
        workerOutputItemName: p.out,
        workerOutputQuantity: p.q,
        workerInputMaterials: [{ itemId: idOf(p.in), itemName: p.in, quantity: 1 }],
        constructionTimeHours: p.time,
        buildable: true,
        buildRequirements: [
          { itemId: idOf("Kristal Roh Ilahi"), itemName: "Kristal Roh Ilahi", quantity: 8 },
          { itemId: idOf("Batu Roh Utuh"), itemName: "Batu Roh Utuh", quantity: 3 },
        ],
        basePrice: p.price,
        priceCurrency: p.curr,
      }));
    } catch(e) {}
  });

  // Unique income / prestige buildings (still max 1 jade)
  const prestige = [
    { name: "Paviliun Empat Dewa", desc: "1 Jade/hari. Prestise tertinggi individu.", profit: 1, curr: "jade", rank: "Mythical", time: 240, price: 25, pcurr: "jade",
      mats: [["Sisik Qinglong",1],["Bulu Zhuque",1],["Cakar Baihu",1],["Cangkang Xuanwu",1],["Inti Primordial",1]] },
    { name: "Menara Observasi Langit", desc: "12 Gold/hari.", profit: 12, curr: "gold", rank: "Legendary", time: 168, price: 10, pcurr: "jade",
      mats: [["Kristal Roh Ilahi",15],["Kayu Surga (Heavenly Wood)",20],["Baja Hitam Mistis",30]] },
    { name: "Perpustakaan Ilmu Terlarang", desc: "8 Gold/hari.", profit: 8, curr: "gold", rank: "Epic", time: 120, price: 80, pcurr: "gold",
      mats: [["Papan Kayu",100],["Batu Bata",150],["Sutra Ulat Salju",10],["Pecahan Batu Roh",20]] },
  ];
  prestige.forEach(pr => {
    try {
      const reqs = pr.mats.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: q }));
      assets.push(g({
        name: pr.name,
        description: pr.desc,
        rank: pr.rank,
        dailyProfit: pr.profit,
        profitCurrency: pr.curr,
        constructionTimeHours: pr.time,
        buildable: true,
        buildRequirements: reqs,
        basePrice: pr.price,
        priceCurrency: pr.pcurr,
      }));
    } catch(e) {}
  });


  // =========================================================================
  // ERA PABRIK + MODERN ASSETS
  // =========================================================================

  // --- Industrial Production ---
  const indProd = [
    { name: "Tambang Batu Bara Dalam", out: "Batu Bara Berkualitas", q: 2, in: "Beliung Besi", rank: "Uncommon", time: 16, price: 2, curr: "gold" },
    { name: "Sumur Minyak Dangkal", out: "Minyak Mentah", q: 1, in: "Beliung Besi", rank: "Uncommon", time: 20, price: 3, curr: "gold" },
    { name: "Kebun Karet", out: "Karet Mentah", q: 2, in: "Cangkul Besi", rank: "Uncommon", time: 12, price: 1, curr: "gold" },
    { name: "Pabrik Roda Gigi", out: "Roda Gigi Besi", q: 1, in: "Batangan Besi", rank: "Uncommon", time: 24, price: 3, curr: "gold", isCraft: false },
  ];
  indProd.forEach(p => {
    try {
      const inputs = p.in ? [{ itemId: idOf(p.in), itemName: p.in, quantity: 1 }] : [];
      assets.push(g({
        name: p.name,
        description: `${p.q} ${p.out}/jam. Era industri.`,
        rank: p.rank,
        workerOutputItemId: idOf(p.out),
        workerOutputItemName: p.out,
        workerOutputQuantity: p.q,
        workerInputMaterials: inputs,
        constructionTimeHours: p.time,
        buildable: true,
        buildRequirements: [
          { itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 50 },
          { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 10 },
          { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 30 },
        ],
        basePrice: p.price,
        priceCurrency: p.curr,
      }));
    } catch(e) {}
  });

  // --- Industrial Crafting Stations ---
  const indCraft = [
    {
      name: "Pabrik Peleburan Baja",
      desc: "Memproduksi pelat & komponen baja industri.",
      rank: "Rare", time: 48, price: 15, curr: "gold",
      reqs: [["Batu Bata", 120], ["Baja Keras", 30], ["Batu Bara", 50]],
      recipes: [
        { rn: "Buat Pelat Baja Tebal", res: "Pelat Baja Tebal", rq: 1, mats: [["Baja Keras", 3], ["Batu Bara Berkualitas", 2]] },
        { rn: "Buat Roda Gigi Baja", res: "Roda Gigi Baja", rq: 1, mats: [["Baja Keras", 2], ["Batu Bara Berkualitas", 1]] },
        { rn: "Buat Kawat Baja", res: "Kawat Baja", rq: 2, mats: [["Baja Keras", 1], ["Batu Bara", 1]] },
        { rn: "Buat Pegas Baja", res: "Pegas Baja", rq: 2, mats: [["Baja Keras", 1]] },
      ]
    },
    {
      name: "Bengkel Mesin Uap",
      desc: "Merakit inti mesin uap & komponen.",
      rank: "Rare", time: 60, price: 20, curr: "gold",
      reqs: [["Pelat Baja Tebal", 20], ["Roda Gigi Baja", 15], ["Batu Bata", 80]],
      recipes: [
        { rn: "Rakit Inti Mesin Uap", res: "Inti Mesin Uap", rq: 1, mats: [["Roda Gigi Baja", 4], ["Pegas Baja", 2], ["Pelat Baja Tebal", 2], ["Batu Bara Berkualitas", 3]] },
        { rn: "Buat Kawat Tembaga", res: "Kawat Tembaga", rq: 2, mats: [["Batangan Tembaga", 2]] },
        { rn: "Olahan Minyak", res: "Minyak Olahan", rq: 1, mats: [["Minyak Mentah", 3], ["Katalis Kimia Dasar", 1]] },
        { rn: "Olahan Karet", res: "Karet Olahan", rq: 1, mats: [["Karet Mentah", 3]] },
      ]
    },
    {
      name: "Laboratorium Kimia Murim",
      desc: "Menghasilkan katalis, asam, dan bahan kimia.",
      rank: "Epic", time: 72, price: 40, curr: "gold",
      reqs: [["Batu Bata", 100], ["Kaca Kusam", 30], ["Baja Keras", 20], ["Pecahan Batu Roh", 10]],
      recipes: [
        { rn: "Buat Katalis Dasar", res: "Katalis Kimia Dasar", rq: 1, mats: [["Asam Industri", 1], ["Pecahan Batu Roh", 2]] },
        { rn: "Buat Asam Industri", res: "Asam Industri", rq: 1, mats: [["Batu Bara", 2], ["Air Laut", 3]] },
        { rn: "Buat Kaca Optik", res: "Kaca Optik", rq: 1, mats: [["Pasir Putih", 5], ["Batu Bara Berkualitas", 2]] },
        { rn: "Buat Lensa Presisi", res: "Lensa Presisi", rq: 1, mats: [["Kaca Optik", 2], ["Palu Formasi Array", 1]] },
      ]
    },
  ];
  indCraft.forEach(c => {
    try {
      const reqs = c.reqs.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: q }));
      const recipes = c.recipes.map(r => ({
        recipeName: r.rn,
        resultItemId: idOf(r.res),
        resultItemName: r.res,
        resultQuantity: r.rq,
        materials: r.mats.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: q }))
      }));
      assets.push(g({
        name: c.name,
        description: c.desc,
        rank: c.rank,
        isCraftingStation: true,
        constructionTimeHours: c.time,
        buildable: true,
        buildRequirements: reqs,
        recipes,
        basePrice: c.price,
        priceCurrency: c.curr,
      }));
    } catch(e) {}
  });

  // --- Modern Production & Craft ---
  const modProd = [
    { name: "Tambang Aluminium", out: "Bijih Aluminium", q: 1, in: "Beliung Baja Hitam", rank: "Rare", time: 48, price: 12, curr: "gold" },
    { name: "Pabrik Serat Karbon", out: "Serat Karbon Mentah", q: 1, in: "Pil Nutrisi Pekerja", rank: "Epic", time: 96, price: 50, curr: "gold" },
  ];
  modProd.forEach(p => {
    try {
      assets.push(g({
        name: p.name,
        description: `1 ${p.out}/jam. Era modern.`,
        rank: p.rank,
        workerOutputItemId: idOf(p.out),
        workerOutputItemName: p.out,
        workerOutputQuantity: p.q,
        workerInputMaterials: [{ itemId: idOf(p.in), itemName: p.in, quantity: 1 }],
        constructionTimeHours: p.time,
        buildable: true,
        buildRequirements: [
          { itemId: idOf("Pelat Baja Tebal"), itemName: "Pelat Baja Tebal", quantity: 20 },
          { itemId: idOf("Baja Hitam Mistis"), itemName: "Baja Hitam Mistis", quantity: 10 },
        ],
        basePrice: p.price,
        priceCurrency: p.curr,
      }));
    } catch(e) {}
  });

  const modCraft = [
    {
      name: "Pabrik Chip Qi",
      desc: "Memproduksi chip & modul formasi modern.",
      rank: "Legendary", time: 120, price: 8, curr: "jade",
      reqs: [["Baja Hitam Mistis", 30], ["Kristal Roh Ilahi", 15], ["Pelat Baja Tebal", 20]],
      recipes: [
        { rn: "Buat Chip Qi Sederhana", res: "Chip Qi Sederhana", rq: 1, mats: [["Pecahan Batu Roh", 10], ["Kawat Tembaga", 5], ["Lensa Presisi", 1]] },
        { rn: "Buat Chip Qi Lanjutan", res: "Chip Qi Lanjutan", rq: 1, mats: [["Chip Qi Sederhana", 2], ["Kristal Roh Ilahi", 2], ["Batu Roh Utuh", 1]] },
        { rn: "Buat Baterai Spirit", res: "Baterai Spirit", rq: 1, mats: [["Pecahan Batu Roh", 8], ["Karet Olahan", 2]] },
        { rn: "Buat Modul Formasi", res: "Modul Formasi Portabel", rq: 1, mats: [["Chip Qi Lanjutan", 1], ["Jimat Giok Roh", 2], ["Kabel Optik Qi", 1]] },
        { rn: "Buat Pelat Serat Karbon", res: "Pelat Serat Karbon", rq: 1, mats: [["Serat Karbon Mentah", 3], ["Katalis Kimia Dasar", 1]] },
        { rn: "Buat Alloy Modern", res: "Alloy Modern", rq: 1, mats: [["Batangan Aluminium", 2], ["Baja Hitam Mistis", 1], ["Katalis Kimia Dasar", 1]] },
      ]
    },
    {
      name: "Bengkel Senjata Modern",
      desc: "Merakit senjata & armor era modern.",
      rank: "Legendary", time: 144, price: 10, curr: "jade",
      reqs: [["Pelat Baja Tebal", 30], ["Baja Darah (Blood Steel)", 15], ["Kristal Roh Ilahi", 10]],
      recipes: [
        { rn: "Rakit Senapan Uap", res: "Senapan Uap", rq: 1, mats: [["Inti Mesin Uap", 1], ["Pelat Baja Tebal", 3], ["Kawat Baja", 2]] },
        { rn: "Tempa Pedang Getar", res: "Pedang Getar Baja", rq: 1, mats: [["Alloy Modern", 2], ["Pegas Baja", 2], ["Palu Formasi Array", 1]] },
        { rn: "Rakit Armor Serat Karbon", res: "Armor Serat Karbon", rq: 1, mats: [["Pelat Serat Karbon", 4], ["Karet Olahan", 2]] },
        { rn: "Buat Komunikasi Spirit", res: "Komunikasi Spirit", rq: 1, mats: [["Chip Qi Lanjutan", 1], ["Baterai Spirit", 2], ["Sensor Aura", 1]] },
      ]
    },
  ];
  modCraft.forEach(c => {
    try {
      const reqs = c.reqs.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: q }));
      const recipes = c.recipes.map(r => ({
        recipeName: r.rn,
        resultItemId: idOf(r.res),
        resultItemName: r.res,
        resultQuantity: r.rq,
        materials: r.mats.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: q }))
      }));
      assets.push(g({
        name: c.name,
        description: c.desc,
        rank: c.rank,
        isCraftingStation: true,
        constructionTimeHours: c.time,
        buildable: true,
        buildRequirements: reqs,
        recipes,
        basePrice: c.price,
        priceCurrency: c.curr,
      }));
    } catch(e) {}
  });

  // --- Industrial & Modern Income ---
  const eraIncome = [
    { name: "Pabrik Tekstil", desc: "3 Gold/hari dari produksi kain massal.", profit: 3, curr: "gold", rank: "Rare", time: 60, price: 25, pcurr: "gold",
      mats: [["Batu Bata", 100], ["Papan Kayu", 60], ["Roda Gigi Besi", 10], ["Kain Katun", 20]] },
    { name: "Pabrik Senjata Ringan", desc: "5 Gold/hari.", profit: 5, curr: "gold", rank: "Epic", time: 90, price: 50, pcurr: "gold",
      mats: [["Pelat Baja Tebal", 25], ["Baja Keras", 30], ["Roda Gigi Baja", 15]] },
    { name: "Pembangkit Uap", desc: "6 Gold/hari dari penjualan energi.", profit: 6, curr: "gold", rank: "Epic", time: 100, price: 60, pcurr: "gold",
      mats: [["Inti Mesin Uap", 5], ["Pelat Baja Tebal", 30], ["Batu Bara Berkualitas", 50]] },
    { name: "Pusat Data Spirit", desc: "1 Jade/hari. Batas max individu.", profit: 1, curr: "jade", rank: "Legendary", time: 168, price: 15, pcurr: "jade",
      mats: [["Chip Qi Lanjutan", 10], ["Baterai Spirit", 20], ["Kabel Optik Qi", 10], ["Kristal Roh Ilahi", 8]] },
    { name: "Pabrik Reaktor Spirit", desc: "1 Jade/hari. Teknologi puncak.", profit: 1, curr: "jade", rank: "Mythical", time: 240, price: 30, pcurr: "jade",
      mats: [["Inti Reaktor Spirit", 1], ["Modul Formasi Portabel", 5], ["Pelat Serat Karbon", 20], ["Chip Qi Lanjutan", 15]] },
  ];
  eraIncome.forEach(inc => {
    try {
      const reqs = inc.mats.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: q }));
      assets.push(g({
        name: inc.name,
        description: inc.desc,
        rank: inc.rank,
        dailyProfit: inc.profit,
        profitCurrency: inc.curr,
        constructionTimeHours: inc.time,
        buildable: true,
        buildRequirements: reqs,
        basePrice: inc.price,
        priceCurrency: inc.pcurr,
      }));
    } catch(e) {}
  });


  // ========== MEGA PUSH ASSETS KE ~500 ==========
  // More resource nodes by region
  const zoneList = ["Utara", "Selatan", "Timur", "Barat", "Tengah", "Pegunungan", "Lembah", "Pantai", "Gurun", "Rawa", "Hutan Lebat", "Dataran Tinggi"];
  const resList = [
    { out: "Kayu Mentah", q: 2, tool: "Kapak Batu", rank: "Common" },
    { out: "Batu Kasar", q: 2, tool: "Batu Tajam", rank: "Common" },
    { out: "Tanah Liat", q: 2, tool: "Batu Tajam", rank: "Common" },
    { out: "Daging Mentah", q: 1, tool: "Tombak Kayu", rank: "Common" },
    { out: "Ikan Air Tawar", q: 2, tool: "Alat Pancing Kayu", rank: "Common" },
    { out: "Bijih Besi", q: 1, tool: "Beliung Besi", rank: "Uncommon" },
    { out: "Batu Bara", q: 2, tool: "Beliung Besi", rank: "Common" },
    { out: "Gandum", q: 2, tool: "Cangkul Besi", rank: "Common" },
  ];
  zoneList.forEach((z, zi) => {
    resList.forEach((r, ri) => {
      try {
        const name = `${r.out.replace(/ Mentah| Kasar/g, "")} ${z} ${ri + 1}`;
        if (assets.some(a => a.name === name)) return;
        const inputs = r.tool ? [{ itemId: idOf(r.tool), itemName: r.tool, quantity: 1 }] : [];
        // For farm products need seed if possible
        if (r.out === "Gandum") {
          try { inputs.length = 0; inputs.push({ itemId: idOf("Bibit Gandum"), itemName: "Bibit Gandum", quantity: 1 }); } catch(e) {}
        }
        assets.push(g({
          name,
          description: `${r.q} ${r.out}/jam di zona ${z}.`,
          rank: r.rank,
          workerOutputItemId: idOf(r.out),
          workerOutputItemName: r.out,
          workerOutputQuantity: Math.max(1, r.q - (zi > 6 ? 1 : 0)),
          workerInputMaterials: inputs,
          constructionTimeHours: 4 + zi * 2 + (r.rank === 'Uncommon' ? 6 : r.rank === 'Rare' ? 12 : 0),
          buildable: true,
          buildRequirements: [
            { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 6 + Math.floor(zi / 2) },
            { itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 4 },
          ],
          basePrice: 30 + zi * 5 + ri * 3,
          priceCurrency: "silver",
        }));
      } catch(e) {}
    });
  });

  // More small income stalls by district
  const districts = ["Pasar", "Pelabuhan", "Desa", "Kota", "Pinggiran", "Pegunungan", "Lembah", "Pantai"];
  const stallGoods2 = ["Makanan", "Minuman", "Obat", "Alat", "Pakaian", "Senjata", "Herbal", "Jimat", "Buku", "Perhiasan", "Kayu", "Logam", "Kain", "Ikan", "Daging"];
  districts.forEach((d, di) => {
    stallGoods2.forEach((sg, sgi) => {
      try {
        const name = `${d} Lapak ${sg}`;
        if (assets.some(a => a.name === name)) return;
        const profit = 4 + di * 2 + sgi;
        assets.push(g({
          name,
          description: `${profit} Silver/hari.`,
          rank: profit < 15 ? "Common" : "Uncommon",
          dailyProfit: profit,
          profitCurrency: "silver",
          constructionTimeHours: 4 + di * 2,
          buildable: true,
          buildRequirements: [
            { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 6 },
            { itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 4 },
          ],
          basePrice: 25 + profit * 2,
          priceCurrency: "silver",
        }));
      } catch(e) {}
    });
  });

  // More mid halls
  const hallTypes = ["Balai", "Paviliun", "Aula", "Gedung", "Menara", "Kuil", "Dojo", "Bengkel"];
  const hallFuncs = ["Pertemuan", "Latihan", "Meditasi", "Perdagangan", "Penyimpanan", "Penelitian", "Pengobatan", "Senjata", "Formasi", "Alkimia"];
  hallTypes.forEach((ht, hti) => {
    hallFuncs.forEach((hf, hfi) => {
      try {
        const name = `${ht} ${hf} ${hti + 1}`;
        if (assets.some(a => a.name === name)) return;
        const profit = 40 + hti * 15 + hfi * 8;
        assets.push(g({
          name,
          description: `${profit} Silver/hari.`,
          rank: profit < 80 ? "Uncommon" : "Rare",
          dailyProfit: profit,
          profitCurrency: "silver",
          constructionTimeHours: 24 + hti * 12 + Math.floor(profit / 20),
          buildable: true,
          buildRequirements: [
            { itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 30 + hti * 15 },
            { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 + hti * 10 },
            { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 1 + Math.floor(hti / 2) },
          ],
          basePrice: Math.max(1, Math.floor(profit / 15)),
          priceCurrency: "gold",
        }));
      } catch(e) {}
    });
  });

  return assets;
}

// ---------------------------------------------------------------------------
// PET BUILDER (~55)
// ---------------------------------------------------------------------------
function buildAllPets(guildId) {
  const g = (o) => ({ guildId, createdBy: 'System Oracle', ...o });
  return [
    g({ name: 'Ayam Hutan', rank: 'Common', tier: 1, description: 'Ayam liar dilatih.', element: 'Netral', baseHp: 40, baseAtk: 8, baseDef: 4, baseSpd: 12, basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Anjing Pemburu', rank: 'Common', tier: 1, description: 'Anjing setia.', element: 'Netral', baseHp: 55, baseAtk: 12, baseDef: 6, baseSpd: 14, basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Kucing Liar', rank: 'Common', tier: 1, description: 'Gesit mandiri.', element: 'Netral', baseHp: 35, baseAtk: 10, baseDef: 3, baseSpd: 18, basePrice: 25, priceCurrency: 'silver' }),
    g({ name: 'Ular Rumput', rank: 'Common', tier: 1, description: 'Racun ringan.', element: 'Tanah', baseHp: 30, baseAtk: 14, baseDef: 2, baseSpd: 15, basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Burung Pipit Roh', rank: 'Common', tier: 1, description: 'Pembawa kabar.', element: 'Angin', baseHp: 25, baseAtk: 6, baseDef: 2, baseSpd: 22, basePrice: 35, priceCurrency: 'silver' }),
    g({ name: 'Tikus Tanah', rank: 'Common', tier: 1, description: 'Penggali handal.', element: 'Tanah', baseHp: 28, baseAtk: 7, baseDef: 5, baseSpd: 16, basePrice: 18, priceCurrency: 'silver' }),
    g({ name: 'Katak Kolam', rank: 'Common', tier: 1, description: 'Hidup di air tawar.', element: 'Air', baseHp: 32, baseAtk: 6, baseDef: 4, baseSpd: 10, basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Serigala Abu', rank: 'Uncommon', tier: 2, description: 'Hidup berkelompok.', element: 'Netral', baseHp: 70, baseAtk: 18, baseDef: 10, baseSpd: 16, basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Elang Gunung', rank: 'Uncommon', tier: 2, description: 'Penglihatan tajam.', element: 'Angin', baseHp: 50, baseAtk: 20, baseDef: 6, baseSpd: 20, basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Kura-kura Batu', rank: 'Uncommon', tier: 2, description: 'Pertahanan tinggi.', element: 'Tanah', baseHp: 120, baseAtk: 8, baseDef: 25, baseSpd: 4, basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Rubah Api Kecil', rank: 'Uncommon', tier: 2, description: 'Menguasai api dasar.', element: 'Api', baseHp: 45, baseAtk: 22, baseDef: 5, baseSpd: 17, basePrice: 4, priceCurrency: 'gold' }),
    g({ name: 'Kodok Racun', rank: 'Uncommon', tier: 2, description: 'Kulit beracun.', element: 'Air', baseHp: 40, baseAtk: 16, baseDef: 8, baseSpd: 10, basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Beruang Coklat Muda', rank: 'Uncommon', tier: 2, description: 'Kekuatan fisik besar.', element: 'Tanah', baseHp: 100, baseAtk: 20, baseDef: 15, baseSpd: 8, basePrice: 4, priceCurrency: 'gold' }),
    g({ name: 'Ular Air', rank: 'Uncommon', tier: 2, description: 'Berenang cepat.', element: 'Air', baseHp: 48, baseAtk: 15, baseDef: 6, baseSpd: 14, basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Harimau Putih Muda', rank: 'Rare', tier: 3, description: 'Bakat mistis.', element: 'Netral', baseHp: 100, baseAtk: 30, baseDef: 15, baseSpd: 18, basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Ular Beracun Hitam', rank: 'Rare', tier: 3, description: 'Racun tembus meridian.', element: 'Kegelapan', baseHp: 60, baseAtk: 28, baseDef: 8, baseSpd: 16, basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Burung Phoenix Muda', rank: 'Rare', tier: 3, description: 'Anak burung api.', element: 'Api', baseHp: 70, baseAtk: 25, baseDef: 10, baseSpd: 19, basePrice: 20, priceCurrency: 'gold' }),
    g({ name: 'Kuda Angin', rank: 'Rare', tier: 3, description: 'Berlari di atas angin.', element: 'Angin', baseHp: 90, baseAtk: 15, baseDef: 12, baseSpd: 28, basePrice: 18, priceCurrency: 'gold' }),
    g({ name: 'Ikan Naga Sungai', rank: 'Rare', tier: 3, description: 'Hampir menjadi naga.', element: 'Air', baseHp: 80, baseAtk: 22, baseDef: 14, baseSpd: 12, basePrice: 16, priceCurrency: 'gold' }),
    g({ name: 'Laba-laba Kristal', rank: 'Rare', tier: 3, description: 'Jaring kristal.', element: 'Tanah', baseHp: 55, baseAtk: 24, baseDef: 18, baseSpd: 14, basePrice: 14, priceCurrency: 'gold' }),
    g({ name: 'Serigala Petir', rank: 'Rare', tier: 3, description: 'Memanggil petir.', element: 'Petir', baseHp: 85, baseAtk: 32, baseDef: 12, baseSpd: 20, basePrice: 22, priceCurrency: 'gold' }),
    g({ name: 'Macan Tutul Bayangan', rank: 'Rare', tier: 3, description: 'Menghilang di bayangan.', element: 'Kegelapan', baseHp: 75, baseAtk: 30, baseDef: 10, baseSpd: 24, basePrice: 18, priceCurrency: 'gold' }),
    g({ name: 'Elang Petir', rank: 'Rare', tier: 3, description: 'Sayap berkelistrikan.', element: 'Petir', baseHp: 65, baseAtk: 28, baseDef: 8, baseSpd: 26, basePrice: 20, priceCurrency: 'gold' }),
    g({ name: 'Naga Air Muda', rank: 'Epic', tier: 5, description: 'Naga air tumbuh.', element: 'Air', baseHp: 150, baseAtk: 40, baseDef: 25, baseSpd: 15, basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Phoenix Api', rank: 'Epic', tier: 5, description: 'Api surgawi.', element: 'Api', baseHp: 130, baseAtk: 45, baseDef: 20, baseSpd: 22, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Harimau Putih Dewa', rank: 'Epic', tier: 5, description: 'Sudah tersadarkan.', element: 'Cahaya', baseHp: 160, baseAtk: 42, baseDef: 28, baseSpd: 20, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Ular Naga Racun', rank: 'Epic', tier: 5, description: 'Racun mematikan.', element: 'Kegelapan', baseHp: 110, baseAtk: 48, baseDef: 18, baseSpd: 18, basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Garuda Angin', rank: 'Epic', tier: 5, description: 'Penguasa angin.', element: 'Angin', baseHp: 120, baseAtk: 38, baseDef: 22, baseSpd: 30, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Kura-kura Xuanwu Muda', rank: 'Epic', tier: 5, description: 'Penunggu utara.', element: 'Air', baseHp: 220, baseAtk: 20, baseDef: 45, baseSpd: 6, basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Singa Petir', rank: 'Epic', tier: 5, description: 'Tubuh penuh kilat.', element: 'Petir', baseHp: 140, baseAtk: 50, baseDef: 24, baseSpd: 18, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Rubah Sembilan Ekor Muda', rank: 'Epic', tier: 5, description: 'Bakat ilusi & api.', element: 'Api', baseHp: 100, baseAtk: 42, baseDef: 15, baseSpd: 25, basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Banteng Besi', rank: 'Epic', tier: 5, description: 'Kulit sekeras baja.', element: 'Tanah', baseHp: 200, baseAtk: 35, baseDef: 40, baseSpd: 8, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Naga Emas Kuno', rank: 'Legendary', tier: 7, description: 'Hidup ribuan tahun.', element: 'Cahaya', baseHp: 300, baseAtk: 70, baseDef: 40, baseSpd: 20, basePrice: 15, priceCurrency: 'jade' }),
    g({ name: 'Phoenix Abadi', rank: 'Legendary', tier: 7, description: 'Tidak mati permanen.', element: 'Api', baseHp: 250, baseAtk: 75, baseDef: 35, baseSpd: 25, basePrice: 18, priceCurrency: 'jade' }),
    g({ name: 'Qilin Surgawi', rank: 'Legendary', tier: 7, description: 'Keberuntungan dewa.', element: 'Cahaya', baseHp: 280, baseAtk: 60, baseDef: 50, baseSpd: 18, basePrice: 20, priceCurrency: 'jade' }),
    g({ name: 'Naga Hitam Abyss', rank: 'Legendary', tier: 7, description: 'Dari kedalaman abyss.', element: 'Kegelapan', baseHp: 320, baseAtk: 80, baseDef: 38, baseSpd: 16, basePrice: 22, priceCurrency: 'jade' }),
    g({ name: 'Kun Peng', rank: 'Legendary', tier: 7, description: 'Raksasa jadi burung.', element: 'Angin', baseHp: 350, baseAtk: 65, baseDef: 30, baseSpd: 28, basePrice: 25, priceCurrency: 'jade' }),
    g({ name: 'Rubah Sembilan Ekor', rank: 'Legendary', tier: 7, description: 'Ilusi tingkat dewa.', element: 'Api', baseHp: 200, baseAtk: 70, baseDef: 25, baseSpd: 30, basePrice: 20, priceCurrency: 'jade' }),
    g({ name: 'Naga Petir', rank: 'Legendary', tier: 7, description: 'Menguasai badai.', element: 'Petir', baseHp: 290, baseAtk: 78, baseDef: 35, baseSpd: 22, basePrice: 18, priceCurrency: 'jade' }),
    g({ name: 'Naga Primordial', rank: 'Mythical', tier: 9, description: 'Dari awal penciptaan.', element: 'Netral', baseHp: 500, baseAtk: 100, baseDef: 60, baseSpd: 25, basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Phoenix Primordial', rank: 'Mythical', tier: 9, description: 'Lahir dari api pertama.', element: 'Api', baseHp: 450, baseAtk: 110, baseDef: 50, baseSpd: 30, basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Xuanwu Abadi', rank: 'Mythical', tier: 9, description: 'Penunggu utara abadi.', element: 'Air', baseHp: 600, baseAtk: 50, baseDef: 90, baseSpd: 8, basePrice: 3, priceCurrency: 'spirit' }),
    g({ name: 'Baihu Langit', rank: 'Mythical', tier: 9, description: 'Harimau putih penunggu barat.', element: 'Cahaya', baseHp: 480, baseAtk: 105, baseDef: 55, baseSpd: 28, basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Zhuque Surga', rank: 'Mythical', tier: 9, description: 'Burung vermilion selatan.', element: 'Api', baseHp: 420, baseAtk: 115, baseDef: 45, baseSpd: 32, basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Qinglong Timur', rank: 'Mythical', tier: 9, description: 'Naga biru penunggu timur.', element: 'Air', baseHp: 520, baseAtk: 95, baseDef: 65, baseSpd: 24, basePrice: 3, priceCurrency: 'spirit' }),
  ];
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function seedEconomy() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  JIANHU BOT — SEED ECONOMY v3.0 FINAL');
  console.log('══════════════════════════════════════════════════════════');
  console.log('Menghubungkan ke MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Terhubung!\n');

  try {
    const player = await Player.findOne({});
    if (!player) throw new Error('Tidak ada pemain. Lakukan /daftar dulu agar guildId diketahui.');
    const guildId = player.guildId;
    console.log(`GuildId: ${guildId}\n`);

    console.log('[1/4] Upsert Items...');
    const items = buildAllItems(guildId);
    for (const d of items) await upsertItem(d);
    console.log(`      → ${items.length} items siap.\n`);

    console.log('[2/5] Upsert Assets (template baru)...');
    const assets = buildAllAssets(guildId);
    let updatedCount = 0;
    let createdCount = 0;
    for (const d of assets) {
      const before = await Asset.findOne({ guildId, name: d.name }).lean();
      await upsertAsset(d);
      if (before) updatedCount++;
      else createdCount++;
    }
    console.log(`      → ${assets.length} assets template (${updatedCount} diupdate, ${createdCount} baru).\n`);

    // =====================================================================
    // 2b. MIGRASI PAKSA — perbaiki / nonaktifkan asset LAMA yang tidak seimbang
    // =====================================================================
    // Masalah: seed lama pakai nama berbeda (mis. "Area Penebang Kayu" 20/jam).
    // Upsert by name tidak menyentuh mereka. Solusi: deteksi & perbaiki.
    console.log('[3/5] Migrasi paksa asset LAMA (nama persis dari seed old)...');

    // Mapping eksplisit dari seed-economy.OLD.js → nilai seimbang
    // Nama HARUS sama persis dengan yang sudah ada di database
    const OLD_ASSET_FIXES = {
      // === WORKER (output tinggi → rendah + input) ===
      "Pohon Buah Liar":           { workerOutputQuantity: 2, constructionTimeHours: 0 },
      "Area Buruan Primitif":      { workerOutputQuantity: 1, constructionTimeHours: 1 },
      "Lahan Tanah Liat Primitif": { workerOutputQuantity: 2, constructionTimeHours: 1 },
      "Tambang Batu Kasar Primitif": { workerOutputQuantity: 2, constructionTimeHours: 1 },
      "Galian Pasir Putih":        { workerOutputQuantity: 2, constructionTimeHours: 2 },
      "Galian Batu Kapur":         { workerOutputQuantity: 2, constructionTimeHours: 2 },
      "Area Penebangan Kayu":      { workerOutputQuantity: 2, constructionTimeHours: 4, // DULU 20!!!
        forceInput: "Kapak Besi" },
      "Lahan Gandum":              { workerOutputQuantity: 2, constructionTimeHours: 4, forceInput: "Bibit Gandum" },
      "Sawah Padi":                { workerOutputQuantity: 2, constructionTimeHours: 4, forceInput: "Bibit Padi" },
      "Kebun Kapas":               { workerOutputQuantity: 2, constructionTimeHours: 4, forceInput: "Bibit Kapas" },
      "Hutan Bambu":               { workerOutputQuantity: 2, constructionTimeHours: 6, forceInput: "Kapak Besi" },
      "Tambak Garam":              { workerOutputQuantity: 2, constructionTimeHours: 8 },
      "Peternakan Ayam":           { workerOutputQuantity: 2, constructionTimeHours: 6, forceInput: "Pakan Ternak" },
      "Peternakan Sapi":           { workerOutputQuantity: 1, constructionTimeHours: 8, forceInput: "Pakan Ternak" },
      "Dermaga Nelayan":           { workerOutputQuantity: 2, constructionTimeHours: 6, forceInput: "Alat Pancing Kayu" },
      "Galian Batu Bara":          { workerOutputQuantity: 2, constructionTimeHours: 8, forceInput: "Beliung Besi" },
      "Tambang Tembaga":           { workerOutputQuantity: 1, constructionTimeHours: 10, forceInput: "Beliung Besi" },
      "Tambang Timah":             { workerOutputQuantity: 1, constructionTimeHours: 10, forceInput: "Beliung Besi" },
      "Tambang Besi":              { workerOutputQuantity: 1, constructionTimeHours: 12, forceInput: "Beliung Besi" },
      "Tambang Emas":              { workerOutputQuantity: 1, constructionTimeHours: 24, forceInput: "Beliung Baja Hitam" },
      "Hutan Kayu Ulin":           { workerOutputQuantity: 1, constructionTimeHours: 24, forceInput: "Kapak Besi" },
      "Kebun Bambu Hitam":         { workerOutputQuantity: 1, constructionTimeHours: 24, forceInput: "Kapak Besi" },
      "Pohon Persik Darah":        { workerOutputQuantity: 1, constructionTimeHours: 36 },
      "Peternakan Ulat Salju":     { workerOutputQuantity: 1, constructionTimeHours: 48, forceInput: "Daun Bambu Hitam" },
      "Tambang Besi Dingin":       { workerOutputQuantity: 1, constructionTimeHours: 48, forceInput: "Beliung Baja Hitam" },
      "Tambang Giok Roh":          { workerOutputQuantity: 1, constructionTimeHours: 60, forceInput: "Beliung Baja Hitam" },
      "Kawah Api Meteor":          { workerOutputQuantity: 1, constructionTimeHours: 72 },
      "Area Buruan Mistis":        { workerOutputQuantity: 1, constructionTimeHours: 48 },
      "Kebun Ginseng Darah":       { workerOutputQuantity: 1, constructionTimeHours: 36, forceInput: "Bibit Ginseng Darah" },
      "Kebun Rumput Sumsum":       { workerOutputQuantity: 1, constructionTimeHours: 48, forceInput: "Bibit Rumput Sumsum" },
      "Hutan Kayu Surgawi":        { workerOutputQuantity: 1, constructionTimeHours: 96, forceInput: "Kapak Petir Surgawi" },
      "Tambang Kristal Ilahi":     { workerOutputQuantity: 1, constructionTimeHours: 120, forceInput: "Pil Nutrisi Pekerja" },
      "Tambang Batu Roh Lapis Luar": { workerOutputQuantity: 1, constructionTimeHours: 96, forceInput: "Beliung Penekan Qi" },
      "Kebun Teratai Surgawi":     { workerOutputQuantity: 1, constructionTimeHours: 120, forceInput: "Pil Nutrisi Pekerja" },

      // === INCOME (cap berlebih) ===
      "Tikar Pengemis":       { dailyProfit: 5,  profitCurrency: "silver", constructionTimeHours: 1 },
      "Kuil Leluhur Desa":    { dailyProfit: 20, profitCurrency: "silver", constructionTimeHours: 24 },
      "Kedai Arak Murim":     { dailyProfit: 50, profitCurrency: "silver", constructionTimeHours: 48 }, // dulu 100
      "Balai Lelang Kota":    { dailyProfit: 80, profitCurrency: "silver", constructionTimeHours: 96 }, // dulu 500!!!
      "Markas Sekte Luar":    { dailyProfit: 100, profitCurrency: "silver", constructionTimeHours: 120 }, // dulu 1000!!!
      "Paviliun Harta Surgawi": { dailyProfit: 1, profitCurrency: "jade", constructionTimeHours: 168 },
      "Istana Terapung":      { dailyProfit: 1, profitCurrency: "jade", constructionTimeHours: 168 },
    };

    let fixedByName = 0;
    let fixedByThreshold = 0;

    const templateNames = new Set(assets.map(a => a.name));

    for (const [name, fix] of Object.entries(OLD_ASSET_FIXES)) {
      // Jika sudah ada di template baru dengan nama sama → biarkan hasil upsert (sudah seimbang)
      if (templateNames.has(name)) {
        console.log(`      SKIP (sudah di template baru): "${name}"`);
        continue;
      }
      const doc = await Asset.findOne({ guildId, name });
      if (!doc) continue;

      const $set = {
        workerOutputQuantity: fix.workerOutputQuantity !== undefined ? fix.workerOutputQuantity : doc.workerOutputQuantity,
        constructionTimeHours: fix.constructionTimeHours !== undefined ? fix.constructionTimeHours : doc.constructionTimeHours,
        createdBy: "System Oracle (migrated)",
      };
      if (fix.dailyProfit !== undefined) $set.dailyProfit = fix.dailyProfit;
      if (fix.profitCurrency) $set.profitCurrency = fix.profitCurrency;

      // Pasang input wajib jika diminta
      if (fix.forceInput) {
        const mat = itemCache.get(fix.forceInput);
        if (mat) {
          $set.workerInputMaterials = [{ itemId: mat._id, itemName: mat.name, quantity: 1 }];
        }
      }

      // Update description agar jelas
      if (fix.workerOutputQuantity !== undefined && doc.workerOutputItemName) {
        $set.description = `${fix.workerOutputQuantity} ${doc.workerOutputItemName}/jam` +
          (fix.forceInput ? `. Butuh 1 ${fix.forceInput}/jam.` : ".");
      }
      if (fix.dailyProfit !== undefined) {
        $set.description = `${fix.dailyProfit} ${fix.profitCurrency || doc.profitCurrency}/hari.`;
      }

      await Asset.updateOne({ _id: doc._id }, { $set });
      console.log(`      FIX by name: "${name}" → out=${$set.workerOutputQuantity ?? "-"} profit=${$set.dailyProfit ?? "-"} time=${$set.constructionTimeHours}h`);
      fixedByName++;
    }

    // Cadangan: asset lain yang masih output > 3
    const stillHigh = await Asset.find({
      guildId,
      workerOutputQuantity: { $gt: 3 },
    });
    for (const doc of stillHigh) {
      const oldQ = doc.workerOutputQuantity;
      doc.workerOutputQuantity = 2;
      if (!doc.workerInputMaterials || doc.workerInputMaterials.length === 0) {
        const roti = itemCache.get("Roti Panggang") || itemCache.get("Kayu Bakar");
        if (roti) {
          doc.workerInputMaterials = [{ itemId: roti._id, itemName: roti.name, quantity: 1 }];
        }
      }
      doc.createdBy = "System Oracle (migrated)";
      await doc.save();
      console.log(`      FIX threshold: "${doc.name}" ${oldQ}/jam → 2/jam`);
      fixedByThreshold++;
    }

    // Cap jade
    const jadeHigh = await Asset.find({ guildId, profitCurrency: "jade", dailyProfit: { $gt: 1 } });
    for (const doc of jadeHigh) {
      doc.dailyProfit = 1;
      doc.createdBy = "System Oracle (migrated)";
      await doc.save();
      console.log(`      FIX jade: "${doc.name}" → 1 jade/hari`);
      fixedByThreshold++;
    }

    // Cap silver income ekstrem (>150) yang bukan dari template baru
    const silverHigh = await Asset.find({ guildId, profitCurrency: "silver", dailyProfit: { $gt: 150 } });
    for (const doc of silverHigh) {
      if (OLD_ASSET_FIXES[doc.name]) continue; // sudah di-fix di atas
      const oldP = doc.dailyProfit;
      doc.dailyProfit = 80;
      doc.createdBy = "System Oracle (migrated)";
      await doc.save();
      console.log(`      FIX silver cap: "${doc.name}" ${oldP} → 80 silver/hari`);
      fixedByThreshold++;
    }

    console.log(`      → ${fixedByName} asset old di-fix by name.`);
    console.log(`      → ${fixedByThreshold} asset lain di-fix by threshold.\n`);

    console.log('[4/5] Upsert Pets...');
    const pets = buildAllPets(guildId);
    for (const d of pets) await upsertPet(d);
    console.log(`      → ${pets.length} pets siap.\n`);

    // =====================================================================
    // 4. SYSTEM SHOP — HANYA STARTER (kebijakan ekonomi jangka panjang)
    // =====================================================================
    // Prinsip:
    // - System Shop hanya jual tools dasar, bibit, pakan, makanan darurat.
    // - Segala sesuatu di atas itu HARUS lewat craft / barter / player market.
    // - Ini yang membuat player shop rame dan barter jadi penting.
    // - Harga = basePrice item (adil, tidak dimarkup berlebihan).
    // - Non-starter yang mungkin sudah ada di DB dari seed lama → dinonaktifkan.
    console.log('[5/5] System Shop PRIMITIF saja + nonaktifkan semua non-primitif...');

    const starters = [
      // ============================================================
      // HANYA KEHIDUPAN PRIMITIF (Stone Age)
      // Segala sesuatu setelah ini = craft / barter / player market
      // ============================================================
      // Tools primitif
      'Batu Tajam',
      'Kapak Batu',
      'Tombak Kayu',
      'Alat Pancing Kayu',
      'Pisau Tulang',
      'Pengikis Kulit',
      // Bahan & makanan darurat primitif
      'Buah Liar',
      'Kayu Bakar',
      'Air Bersih',
      'Daging Mentah',
      // Bibit paling dasar (pintu masuk pertanian, masih sangat awal)
      'Bibit Gandum',
      'Bibit Padi',
      'Bibit Sayur',
      // Pakan paling dasar
      'Pakan Ternak',
    ];

    const starterSet = new Set(starters);
    let shopCount = 0;
    let deactivated = 0;

    // 1) Aktifkan / update starters
    for (const name of starters) {
      const item = itemCache.get(name);
      if (!item) continue;
      await upsertShop({
        guildId,
        category: 'item',
        refId: item._id,
        refModel: 'Item',
        price: item.basePrice,
        priceCurrency: item.priceCurrency,
        stock: -1,
      });
      shopCount++;
    }

    // 2) Nonaktifkan semua System Shop entry yang BUKAN starter
    //    (membersihkan seed lama yang terlalu murah/mudah)
    const allShop = await Shop.find({ guildId, category: 'item', refModel: 'Item' });
    for (const entry of allShop) {
      const item = await Item.findById(entry.refId);
      if (!item) continue;
      if (!starterSet.has(item.name)) {
        if (entry.isActive) {
          entry.isActive = false;
          await entry.save();
          deactivated++;
        }
      }
    }

    console.log(`      → ${shopCount} item primitif aktif di System Shop (sisanya barter/craft/player shop).`);
    console.log(`      → ${deactivated} non-starter dinonaktifkan (player shop & craft jadi pusat).\n`);

    console.log('══════════════════════════════════════════════════════════');
    console.log('  SEEDING SELESAI');
    console.log(`  Items  : ${items.length}`);
    console.log(`  Assets : ${assets.length}`);
    console.log(`  Pets   : ${pets.length}`);
    console.log('  Template di-upsert + asset lama tidak seimbang di-migrasi paksa.');
    console.log('  Ekonomi seimbang · rantai panjang · barter & player shop hidup.');
    console.log('══════════════════════════════════════════════════════════');
  } catch (err) {
    console.error('Error saat seeding:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Koneksi ditutup.');
  }
}

seedEconomy();
