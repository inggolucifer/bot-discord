/**
 * ============================================================================
 *  JIANHU BOT — SEED ECONOMY v3.1 (Deskripsi Konkret · Rantai Terhubung · Fair)
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

/** Daya tahan default (jam produksi) per nama item — tool tahan lama, consumable 1 jam */
const DURABILITY_HOURS = {
  // Tools primitif
  'Batu Tajam': 12,
  'Kapak Batu': 24,
  'Tombak Kayu': 24,
  'Alat Pancing Kayu': 24,
  'Pisau Tulang': 18,
  'Pengikis Kulit': 18,
  // Tools besi
  'Cangkul Besi': 36,
  'Kapak Besi': 48,
  'Beliung Besi': 36,
  'Pisau Jagal': 24,
  'Palu Tempa': 48,
  'Gergaji Besi': 36,
  'Sekop Besi': 36,
  'Jarum Jahit Besi': 48,
  // Tools tinggi
  'Beliung Baja Hitam': 48,
  'Cangkul Giok': 60,
  'Kapak Petir Surgawi': 72,
  'Beliung Penekan Qi': 72,
  'Palu Formasi Array': 72,
  'Pisau Bedah Qi': 36,
  // Modern tools
  'Kunci Inggris Besi': 48,
  'Obeng Presisi': 48,
  'Mesin Bor Portable': 60,
  'Las Listrik Qi': 60,
  'Scanner Aura': 72,
  'Printer Formasi': 72,
};

/** Consumable per jam (bibit, pakan, pil nutrisi worker, bahan bakar) */
const CONSUMABLE_PER_HOUR = new Set([
  'Bibit Gandum', 'Bibit Padi', 'Bibit Kapas', 'Bibit Anggur', 'Bibit Bambu', 'Bibit Sayur',
  'Bibit Jagung', 'Bibit Kedelai', 'Bibit Teh', 'Bibit Ginseng Darah', 'Bibit Teratai Roh',
  'Bibit Rumput Sumsum', 'Bibit Bunga Bulan', 'Bibit Akar Naga',
  'Pakan Ternak', 'Pakan Spirit Beast', 'Daun Bambu Hitam',
  'Pil Nutrisi Pekerja', 'Pil Nutrisi Tinggi', 'Pil Jiwa Stabil',
  'Bahan Bakar Uap', 'Bahan Bakar Spirit', 'Pelumas Mesin', 'Roti Panggang', 'Kayu Bakar',
]);

function durabilityOf(itemName) {
  if (DURABILITY_HOURS[itemName] != null) return DURABILITY_HOURS[itemName];
  if (CONSUMABLE_PER_HOUR.has(itemName)) return 1;
  // default: material mentah / semi = tahan sedang jika dipakai sebagai input
  if (/Kapak|Beliung|Cangkul|Tombak|Pancing|Palu|Gergaji|Pisau|Jarum|Sekop|Bor|Las|Scanner|Printer|Kunci|Obeng/i.test(itemName)) {
    return 36;
  }
  return 1;
}

function makeInput(itemName, quantity = 1) {
  const doc = itemCache.get(itemName);
  if (!doc) throw new Error(`[SEED] Input item belum di-cache: ${itemName}`);
  return {
    itemId: doc._id,
    itemName,
    quantity,
    durabilityHours: durabilityOf(itemName),
  };
}



async function upsertItem(data) {
  const filter = { guildId: data.guildId, name: data.name };

  let desc = data.description || '-';
  const dur = durabilityOf(data.name);
  if (dur > 1 && !/Daya tahan alat:/.test(desc)) {
    desc = `${desc} Daya tahan alat: ${dur} jam kerja.`;
  }

  const update = {
    $set: {
      rank: data.rank || 'Common',
      category: data.category || 'none',
      tier: data.tier ?? 1,
      description: desc,
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
    g({ name: 'Batu Tajam', rank: 'Common', category: 'material', tier: 1, description: 'Batu sungai yang diasah hingga tajam. Alat pertama umat manusia — untuk menguliti, mengukir, dan bertahan hidup. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Kapak Batu', rank: 'Common', category: 'consume', tier: 1, description: 'Kepala batu diikat ke gagang kayu. Dipakai menebang pohon kecil dan membelah kayu bakar. Dijual di System Shop. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Tombak Kayu', rank: 'Common', category: 'consume', tier: 1, description: 'Tombak runcing dari kayu keras. Senjata berburu hewan kecil di Area Buruan Primitif. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Alat Pancing Kayu', rank: 'Common', category: 'consume', tier: 1, description: 'Kail bambu + benang sederhana. Wajib untuk Dermaga Nelayan dan kolam ikan. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Pisau Tulang', rank: 'Common', category: 'consume', tier: 1, description: 'Pisau dari tulang hewan buruan. Menguliti dan memotong daging mentah. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Pengikis Kulit', rank: 'Common', category: 'consume', tier: 1, description: 'Alat mengikis bulu & lemak dari kulit mentah sebelum disamak. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Cangkul Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Cangkul bilah besi. Dibutuhkan sawah, kebun, dan lahan pertanian. Di-craft di tungku (bukan shop). Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Kapak Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Kapak kokoh dari batangan besi. Input Area Penebangan Kayu & hutan tingkat desa. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 45, priceCurrency: 'silver' }),
    g({ name: 'Beliung Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Alat gali bijih dangkal. Wajib Tambang Tembaga, Timah, Besi, dan Galian Batu Bara. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Pisau Jagal', rank: 'Common', category: 'consume', tier: 1, description: 'Pisau pemroses hasil buruan menjadi daging & kulit mentah. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 35, priceCurrency: 'silver' }),
    g({ name: 'Gergaji Besi', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Gergaji gigi besi. Mempercepat potong kayu mentah menjadi papan di bengkel. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Palu Tempa', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Palu penempa logam. Kunci craft tool besi, baja, dan senjata di tungku lanjutan. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Alat Tenun Sederhana', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Alat tenun tangan. Mengubah benang kapas menjadi kain katun. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Jarum Jahit Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Jarum besi untuk menjahit kain & kulit menjadi pakaian atau tas. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Sekop Besi', rank: 'Common', category: 'consume', tier: 1, description: 'Sekop gali tanah dan kerikil. Berguna di lahan tanah liat & konstruksi. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 35, priceCurrency: 'silver' }),
    g({ name: 'Beliung Baja Hitam', rank: 'Rare', category: 'consume', tier: 3, description: 'Beliung dari baja hitam mistis. Menambang mineral langka: Giok Roh, Besi Dingin, Emas dalam. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang.', basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Pisau Bedah Qi', rank: 'Rare', category: 'consume', tier: 3, description: 'Pisau bedah yang tidak merusak inti energi. Memotong organ spirit beast untuk bahan alkimia. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Palu Formasi Array', rank: 'Epic', category: 'consume', tier: 5, description: 'Palu ukir formasi. Dipakai menempa pusaka dan mengukir array pada giok/logam. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Cangkul Giok', rank: 'Epic', category: 'consume', tier: 5, description: 'Cangkul berlapis giok. Tidak merusak akar herbal roh — wajib kebun ginseng & teratai. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.', basePrice: 25, priceCurrency: 'gold' }),
    g({ name: 'Kapak Petir Surgawi', rank: 'Epic', category: 'consume', tier: 5, description: 'Kapak bermuatan petir. Satu-satunya yang mampu menebang Kayu Surga. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.', basePrice: 1, priceCurrency: 'jade' }),
    g({ name: 'Beliung Penekan Qi', rank: 'Legendary', category: 'consume', tier: 7, description: 'Beliung yang menekan ledakan Qi bumi. Dipakai Tambang Kristal Ilahi & Batu Roh. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang.', basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Jarum Meridian', rank: 'Epic', category: 'consume', tier: 5, description: 'Jarum akupunktur kultivator. Bahan craft jimat & perawatan luka meridian. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.', basePrice: 30, priceCurrency: 'gold' }),
    g({ name: 'Kuas Jimat', rank: 'Rare', category: 'consume', tier: 3, description: 'Kuas bulu beast + batang bambu hitam. Menulis talisman dengan darah spirit beast. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang.', basePrice: 5, priceCurrency: 'gold' }),
  ];
  items.push(...tools);

  // SEEDS FOOD
  const food = [
    g({ name: 'Buah Liar', rank: 'Common', category: 'consume', tier: 1, description: 'Buah hutan yang bisa dipetik di Pohon Buah Liar. Bahan barter awal atau dimakan. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 1, priceCurrency: 'silver', effect: 'Memulihkan 5 Hunger' }),
    g({ name: 'Daging Mentah', rank: 'Common', category: 'consume', tier: 1, description: 'Hasil Area Buruan. Harus diolah (bakar/masak) sebelum bernilai lebih. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Kayu Bakar', rank: 'Common', category: 'consume', tier: 1, description: 'Ranting kering. Bahan bakar tungku, dapur, dan beberapa resep olahan. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Air Bersih', rank: 'Common', category: 'consume', tier: 1, description: 'Air sungai jernih. Bahan masak, fermentasi, dan beberapa proses kimia dasar. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Bibit Gandum', rank: 'Common', category: 'material', tier: 1, description: 'Bibit musim semi. Input wajib Lahan Gandum setiap siklus produksi. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Padi', rank: 'Common', category: 'material', tier: 1, description: 'Bibit padi air. Input wajib Sawah Padi. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Kapas', rank: 'Common', category: 'material', tier: 1, description: 'Bibit kapas. Input Kebun Kapas → serat → benang → kain. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Bibit Anggur', rank: 'Common', category: 'material', tier: 1, description: 'Biji anggur. Untuk kebun anggur & bahan wine di pabrik fermentasi. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Bibit Bambu', rank: 'Common', category: 'material', tier: 1, description: 'Tunas bambu. Menanam hutan bambu untuk bahan bangunan ringan. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Sayur', rank: 'Common', category: 'material', tier: 1, description: 'Campuran bibit dapur. Input kebun sayur tingkat desa. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Bibit Jagung', rank: 'Common', category: 'material', tier: 1, description: 'Bibit jagung. Alternatif pertanian & pakan. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Kedelai', rank: 'Common', category: 'material', tier: 1, description: 'Bibit kedelai. Bahan tahu, kecap, dan pakan protein. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bibit Teh', rank: 'Uncommon', category: 'material', tier: 2, description: 'Bibit pohon teh. Daunnya diolah menjadi teh jual di kedai. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Pakan Ternak', rank: 'Common', category: 'consume', tier: 1, description: 'Campuran rumput & dedak. Input wajib peternakan ayam/sapi/kambing. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Roti Panggang', rank: 'Common', category: 'consume', tier: 1, description: 'Roti sederhana dari tepung. Sering jadi input pekerja di beberapa asset. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 15, priceCurrency: 'silver', effect: 'Memulihkan 15 Hunger' }),
    g({ name: 'Nasi Putih', rank: 'Common', category: 'consume', tier: 1, description: 'Nasi dari beras tumbuk. Makanan pokok hasil rantai padi. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 18, priceCurrency: 'silver', effect: 'Memulihkan 18 Hunger' }),
    g({ name: 'Daging Bakar', rank: 'Common', category: 'consume', tier: 1, description: 'Daging yang dipanggang di api unggun. Nilai jual lebih tinggi dari mentah. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 12, priceCurrency: 'silver', effect: 'Memulihkan 20 Hunger' }),
    g({ name: 'Sup Tulang', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Sup dari tulang buruan. Olahan dapur tingkat desa. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 30, priceCurrency: 'silver', effect: 'Memulihkan 35 Hunger' }),
    g({ name: 'Bibit Ginseng Darah', rank: 'Rare', category: 'material', tier: 3, description: 'Bibit herbal murim. Input Kebun Ginseng Darah. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Bibit Teratai Roh', rank: 'Epic', category: 'material', tier: 5, description: 'Benih teratai penyerap Qi. Input Kebun Teratai Surgawi. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Bibit Rumput Sumsum', rank: 'Epic', category: 'material', tier: 5, description: 'Bibit herbal perombak tulang. Bahan Pil Penempa Tulang. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Bibit Bunga Bulan', rank: 'Rare', category: 'material', tier: 3, description: 'Bunga yang mekar di malam hari. Bahan jimat & pil malam. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Bibit Akar Naga', rank: 'Legendary', category: 'material', tier: 7, description: 'Akar yang menyerap Qi bumi. Kebun tingkat legend. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Daun Bambu Hitam', rank: 'Rare', category: 'material', tier: 3, description: 'Daun dari Bambu Hitam. Pakan favorit Ulat Salju & spirit beast vegetarian. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Pakan Spirit Beast', rank: 'Rare', category: 'consume', tier: 3, description: 'Pakan berenergi tinggi untuk pet beast & peternakan mistis. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang.', basePrice: 5, priceCurrency: 'gold' }),
    g({ name: 'Pil Nutrisi Pekerja', rank: 'Epic', category: 'consume', tier: 5, description: 'Pil agar pekerja realm tinggi tetap produktif. Input asset legend. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.', basePrice: 80, priceCurrency: 'gold', effect: 'Memulihkan 100 Hunger' }),
    g({ name: 'Pil Nutrisi Tinggi', rank: 'Legendary', category: 'consume', tier: 7, description: 'Nutrisi puncak untuk pekerja & ritual tingkat dewa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang.', basePrice: 3, priceCurrency: 'jade', effect: 'Memulihkan 200 Hunger' }),
  ];
  items.push(...food);

  // RAW
  const raw = [
    g({ name: 'Gandum', rank: 'Common', category: 'material', tier: 1, description: 'Hasil Lahan Gandum. Digiling di Kincir Air menjadi Tepung Terigu. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Padi Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Hasil Sawah Padi. Ditumbuk menjadi Beras Putih. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Kapas Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Hasil Kebun Kapas. Dipintal menjadi Benang. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Jagung Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Hasil ladang jagung. Pakan atau digiling. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Kedelai Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Hasil kebun kedelai. Bahan olahan protein. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Anggur Segar', rank: 'Common', category: 'consume', tier: 1, description: 'Hasil kebun anggur. Bahan utama Anggur Merah (Wine). Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Daun Teh Mentah', rank: 'Uncommon', category: 'material', tier: 2, description: 'Daun segar dari kebun teh. Diolah menjadi teh kering. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Telur Mentah', rank: 'Common', category: 'consume', tier: 1, description: 'Hasil Peternakan Ayam. Bahan masak & barter. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Susu Sapi', rank: 'Common', category: 'consume', tier: 1, description: 'Hasil Peternakan Sapi. Bahan keju & minuman. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Susu Kambing', rank: 'Common', category: 'consume', tier: 1, description: 'Hasil peternakan kambing. Alternatif susu & keju. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Kulit Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Kulit hewan buruan/jagal. Disamak menjadi Kulit Samak. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Wol Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Bulu domba. Dipintal menjadi benang wol. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bulu Ayam', rank: 'Common', category: 'material', tier: 1, description: 'Bulu hasil peternakan. Bahan bantal, panah, atau kuas murah. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Ikan Air Tawar', rank: 'Common', category: 'consume', tier: 1, description: 'Hasil Dermaga/kolam. Bisa diasinkan atau dimasak. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Ikan Laut', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Hasil perairan laut. Bergizi, bahan ikan asin premium. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Udang Sungai', rank: 'Common', category: 'consume', tier: 1, description: 'Udang air tawar. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Madu Liar', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Madu lebah hutan. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Lilinya Lebah', rank: 'Uncommon', category: 'material', tier: 2, description: 'Lilin alami. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 12, priceCurrency: 'silver' }),
    g({ name: 'Tanah Liat', rank: 'Common', category: 'material', tier: 1, description: 'Hasil Lahan Tanah Liat. Dibakar menjadi Batu Bata. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Tanah Liat Merah', rank: 'Uncommon', category: 'material', tier: 2, description: 'Tanah liat kualitas genteng. Bahan Genteng Keramik. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Batu Kasar', rank: 'Common', category: 'material', tier: 1, description: 'Hasil Tambang Batu Kasar. Dipahat menjadi Balok Batu. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Pasir Putih', rank: 'Common', category: 'material', tier: 1, description: 'Hasil Galian Pasir. Bahan utama Kaca Kusam. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Batu Kapur', rank: 'Common', category: 'material', tier: 1, description: 'Hasil galian kapur. Bahan Semen Mentah. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Air Laut', rank: 'Common', category: 'material', tier: 1, description: 'Air dari pantai/tambak. Direbus menjadi Garam Dapur. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Garam Kasar', rank: 'Common', category: 'material', tier: 1, description: 'Garam penguapan tambak. Pengawet & bumbu. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 3, priceCurrency: 'silver' }),
    g({ name: 'Kerikil Sungai', rank: 'Common', category: 'material', tier: 1, description: 'Kerikil untuk pondasi & campuran bangunan. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Kayu Mentah', rank: 'Common', category: 'material', tier: 1, description: 'Hasil Area Penebangan. Dipotong menjadi Papan Kayu di bengkel. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 1, priceCurrency: 'silver' }),
    g({ name: 'Bambu', rank: 'Common', category: 'material', tier: 1, description: 'Batang bambu. Bahan bangunan ringan, alat pancing, dan kerajinan. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Kayu Pinus', rank: 'Common', category: 'material', tier: 1, description: 'Kayu pinus harum. Bahan perabotan & dupa murah. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'silver' }),
    g({ name: 'Kayu Jati', rank: 'Uncommon', category: 'material', tier: 2, description: 'Kayu jati tahan lama. Bahan bangunan menengah. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Kayu Ulin (Ironwood)', rank: 'Rare', category: 'material', tier: 3, description: 'Kayu sekeras besi dari Hutan Kayu Ulin. Bahan bangunan epic. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'gold' }),
    g({ name: 'Kayu Persik Berdarah', rank: 'Rare', category: 'material', tier: 3, description: 'Kayu penolak bala dari Pohon Persik Darah. Menyerap energi Yang. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 6, priceCurrency: 'gold' }),
    g({ name: 'Bambu Hitam (Black Bamboo)', rank: 'Rare', category: 'material', tier: 3, description: 'Bambu mistis tahan tebasan. Bahan senjata & formasi. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 5, priceCurrency: 'gold' }),
    g({ name: 'Kayu Sandalwood', rank: 'Rare', category: 'material', tier: 3, description: 'Kayu harum. Bahan dupa, ukiran, dan gagang pusaka. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 7, priceCurrency: 'gold' }),
    g({ name: 'Kayu Surga (Heavenly Wood)', rank: 'Legendary', category: 'material', tier: 7, description: 'Kayu legendaris. Hanya ditebang Kapak Petir Surgawi — pilar istana dewa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Kayu Jiwa (Soulwood)', rank: 'Legendary', category: 'material', tier: 7, description: 'Kayu yang menyimpan jiwa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Batu Bara', rank: 'Common', category: 'material', tier: 1, description: 'Bahan bakar panas dari galian. Wajib lebur logam di tungku & mesin uap industri. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'silver' }),
    g({ name: 'Bijih Tembaga', rank: 'Common', category: 'material', tier: 1, description: 'Bijih kemerahan dari Tambang Tembaga. Dilebur menjadi Batangan Tembaga. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Bijih Timah', rank: 'Common', category: 'material', tier: 1, description: 'Bijih lunak dari Tambang Timah. Dipadu dengan tembaga menjadi Perunggu. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Bijih Besi', rank: 'Uncommon', category: 'material', tier: 2, description: 'Bijih keras dari Tambang Besi. Dilebur menjadi Batangan Besi — fondasi era besi. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Bijih Perak', rank: 'Uncommon', category: 'material', tier: 2, description: 'Logam putih. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 25, priceCurrency: 'silver' }),
    g({ name: 'Bijih Emas', rank: 'Rare', category: 'material', tier: 3, description: 'Bijih berharga dari Tambang Emas. Dilebur menjadi Batangan Emas. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Bijih Timbal', rank: 'Common', category: 'material', tier: 1, description: 'Logam berat. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Bijih Seng', rank: 'Common', category: 'material', tier: 1, description: 'Logam paduan. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Batu Meteor Api', rank: 'Rare', category: 'material', tier: 3, description: 'Batu panas jatuh dari langit. Bahan tempa Baja Hitam Mistis. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Bijih Besi Dingin (Cold Iron)', rank: 'Epic', category: 'material', tier: 5, description: 'Besi bermuatan es dari Tambang Besi Dingin. Bahan senjata anti-panas & pusaka. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 20, priceCurrency: 'gold' }),
    g({ name: 'Bijih Giok Roh', rank: 'Epic', category: 'material', tier: 5, description: 'Batu penampung Qi dari Tambang Giok Roh. Diukir menjadi Jimat Giok Roh. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 25, priceCurrency: 'gold' }),
    g({ name: 'Bijih Mithril', rank: 'Epic', category: 'material', tier: 5, description: 'Logam ringan sekuat baja. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 40, priceCurrency: 'gold' }),
    g({ name: 'Pecahan Batu Roh', rank: 'Epic', category: 'material', tier: 5, description: 'Serpihan batu roh — mata uang dunia kultivasi. Dipadatkan menjadi Batu Roh Utuh. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 40, priceCurrency: 'gold' }),
    g({ name: 'Kristal Roh Ilahi', rank: 'Legendary', category: 'material', tier: 7, description: 'Inti kristal dari Tambang Kristal Ilahi. Jantung formasi & reaktor spirit. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Bijih Star Iron', rank: 'Legendary', category: 'material', tier: 7, description: 'Besi bintang jatuh. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 5, priceCurrency: 'jade' }),
    g({ name: 'Inti Bumi', rank: 'Mythical', category: 'material', tier: 9, description: 'Inti energi bumi purba. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 1, priceCurrency: 'spirit' }),
    g({ name: 'Ginseng Darah', rank: 'Rare', category: 'herb', tier: 3, description: 'Ginseng merah menyala dari Kebun Ginseng. Bahan Pil Pengumpul Qi. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Daun dan akarnya menyerap esensi langit dan bumi selama bertahun-tahun.', basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Rumput Pembersih Sumsum', rank: 'Epic', category: 'herb', tier: 5, description: 'Herbal perombak tulang. Bahan utama Pil Penempa Tulang. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Daun dan akarnya menyerap esensi langit dan bumi selama bertahun-tahun.', basePrice: 35, priceCurrency: 'gold' }),
    g({ name: 'Teratai Roh Langit', rank: 'Legendary', category: 'herb', tier: 7, description: 'Bunga teratai penyerap Qi langit. Bahan fondasi kultivasi tinggi. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Daun dan akarnya menyerap esensi langit dan bumi selama bertahun-tahun.', basePrice: 8, priceCurrency: 'jade' }),
    g({ name: 'Bunga Bulan', rank: 'Rare', category: 'herb', tier: 3, description: 'Mekar di malam, serap Yin. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Daun dan akarnya menyerap esensi langit dan bumi selama bertahun-tahun.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Akar Naga', rank: 'Legendary', category: 'herb', tier: 7, description: 'Akar legendaris penyerap Qi bumi. Bahan alkimia tingkat dewa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Daun dan akarnya menyerap esensi langit dan bumi selama bertahun-tahun.', basePrice: 10, priceCurrency: 'jade' }),
    g({ name: 'Daun Longevity', rank: 'Epic', category: 'herb', tier: 5, description: 'Memperpanjang umur sedikit. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Daun dan akarnya menyerap esensi langit dan bumi selama bertahun-tahun.', basePrice: 50, priceCurrency: 'gold' }),
    g({ name: 'Bunga Api Surgawi', rank: 'Epic', category: 'herb', tier: 5, description: 'Bunga elemen api. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Daun dan akarnya menyerap esensi langit dan bumi selama bertahun-tahun.', basePrice: 45, priceCurrency: 'gold' }),
    g({ name: 'Rumput Es Abadi', rank: 'Epic', category: 'herb', tier: 5, description: 'Rumput elemen es. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Daun dan akarnya menyerap esensi langit dan bumi selama bertahun-tahun.', basePrice: 45, priceCurrency: 'gold' }),
    g({ name: 'Darah Spirit Beast', rank: 'Rare', category: 'material', tier: 3, description: 'Darah beast berenergi. Tinta talisman & bahan Baja Darah. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Kepompong Ulat Salju', rank: 'Epic', category: 'material', tier: 5, description: 'Kepompong dari Peternakan Ulat Salju. Berisi benang Sutra Ulat Salju. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Tanduk Unicorn Muda', rank: 'Epic', category: 'material', tier: 5, description: 'Tanduk penyucian. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 60, priceCurrency: 'gold' }),
    g({ name: 'Sisik Naga Muda', rank: 'Legendary', category: 'material', tier: 7, description: 'Sisik naga tingkat rendah. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 5, priceCurrency: 'jade' }),
    g({ name: 'Hati Phoenix', rank: 'Legendary', category: 'material', tier: 7, description: 'Hati burung api. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 8, priceCurrency: 'jade' }),
  ];
  items.push(...raw);

  // PROCESSED
  const processed = [
    g({ name: 'Batu Bata', rank: 'Common', category: 'material', tier: 1, description: 'Tanah liat yang dibakar di tungku. Bahan bangunan paling dasar untuk hampir semua bangunan. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Genteng Keramik', rank: 'Uncommon', category: 'material', tier: 2, description: 'Atap dari tanah liat merah. Melindungi bangunan dari hujan & api. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 25, priceCurrency: 'silver' }),
    g({ name: 'Papan Kayu', rank: 'Common', category: 'material', tier: 1, description: 'Kayu mentah yang dipotong rapi di bengkel. Rangka dinding, lantai, dan perabotan. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 8, priceCurrency: 'silver' }),
    g({ name: 'Balok Batu', rank: 'Common', category: 'material', tier: 1, description: 'Batu kasar yang dipahat. Pondasi & dinding bangunan kokoh. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Kaca Kusam', rank: 'Common', category: 'material', tier: 1, description: 'Pasir putih yang dilebur. Jendela, botol, dan bahan lensa dasar. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Semen Mentah', rank: 'Uncommon', category: 'material', tier: 2, description: 'Campuran kapur + tanah liat. Perekat bangunan tingkat kota. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Tepung Terigu', rank: 'Common', category: 'material', tier: 1, description: 'Gandum yang digiling di Kincir Air. Bahan roti & kue. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Beras Putih', rank: 'Common', category: 'material', tier: 1, description: 'Padi yang ditumbuk. Dimasak menjadi Nasi Putih. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Tepung Jagung', rank: 'Common', category: 'material', tier: 1, description: 'Jagung digiling. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 7, priceCurrency: 'silver' }),
    g({ name: 'Tahu', rank: 'Common', category: 'consume', tier: 1, description: 'Olahan kedelai. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 10, priceCurrency: 'silver', effect: 'Memulihkan 12 Hunger' }),
    g({ name: 'Kain Katun', rank: 'Common', category: 'material', tier: 1, description: 'Hasil tenun benang. Pakaian desa, tikar, dan bahan craft kain. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Benang Wol', rank: 'Common', category: 'material', tier: 1, description: 'Wol dipintal. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 12, priceCurrency: 'silver' }),
    g({ name: 'Kain Wol', rank: 'Uncommon', category: 'material', tier: 2, description: 'Kain wol hangat. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Kulit Samak', rank: 'Uncommon', category: 'material', tier: 2, description: 'Kulit mentah yang disamak. Bahan armor ringan, tas, dan sepatu. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Keju', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Susu yang difermentasi. Makanan tahan lama & jual di pasar. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 25, priceCurrency: 'silver', effect: 'Memulihkan 25 Hunger' }),
    g({ name: 'Ikan Asin', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Ikan yang diasinkan. Tahan lama untuk perjalanan & jual. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 18, priceCurrency: 'silver', effect: 'Memulihkan 22 Hunger' }),
    g({ name: 'Anggur Merah (Wine)', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Hasil fermentasi anggur. Minuman kedai & bahan barter. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Arak Beras (Sake)', rank: 'Rare', category: 'consume', tier: 3, description: 'Hasil fermentasi beras. Minuman murim & ritual. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Teh Hijau', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Teh kualitas baik. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Madu Murni', rank: 'Uncommon', category: 'consume', tier: 2, description: 'Madu disaring. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.', basePrice: 25, priceCurrency: 'silver' }),
    g({ name: 'Batangan Tembaga', rank: 'Common', category: 'material', tier: 1, description: 'Tembaga murni hasil lebur. Bahan perunggu, kawat, dan kerajinan. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Batangan Timah', rank: 'Common', category: 'material', tier: 1, description: 'Timah murni hasil lebur. Dipadu tembaga menjadi Perunggu. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Perunggu', rank: 'Uncommon', category: 'material', tier: 2, description: 'Paduan tembaga + timah. Senjata & alat era perunggu. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Batangan Besi', rank: 'Uncommon', category: 'material', tier: 2, description: 'Besi lebur dari bijih. Bahan tool besi, baja, dan senjata desa. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Baja Keras', rank: 'Rare', category: 'material', tier: 3, description: 'Besi yang ditempa berulang. Bahan senjata murim & rangka mesin. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Batangan Emas', rank: 'Rare', category: 'material', tier: 3, description: 'Emas kemurnian tinggi. Mata uang barter tingkat tinggi & ukiran mewah. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Batangan Perak', rank: 'Uncommon', category: 'material', tier: 2, description: 'Perak murni. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Kuningan', rank: 'Uncommon', category: 'material', tier: 2, description: 'Paduan tembaga+seng. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 45, priceCurrency: 'silver' }),
    g({ name: 'Baja Hitam Mistis', rank: 'Epic', category: 'material', tier: 5, description: 'Baja + batu meteor. Bahan senjata gelap & bangunan legend. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 60, priceCurrency: 'gold' }),
    g({ name: 'Batangan Besi Dingin', rank: 'Epic', category: 'material', tier: 5, description: 'Besi dingin murni. Senjata aura es & penahan panas. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 150, priceCurrency: 'gold' }),
    g({ name: 'Baja Darah (Blood Steel)', rank: 'Epic', category: 'material', tier: 5, description: 'Baja hitam + darah beast. Senjata menghisap vitalitas. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 180, priceCurrency: 'gold' }),
    g({ name: 'Batangan Mithril', rank: 'Epic', category: 'material', tier: 5, description: 'Mithril murni. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 200, priceCurrency: 'gold' }),
    g({ name: 'Sutra Ulat Salju', rank: 'Epic', category: 'material', tier: 5, description: 'Benang dari kepompong ulat salju. Kain mewah & bahan jubah kultivator. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 100, priceCurrency: 'gold' }),
    g({ name: 'Jimat Giok Roh', rank: 'Legendary', category: 'material', tier: 7, description: 'Giok yang diukir formasi. Menampung Qi & proteksi singkat. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 6, priceCurrency: 'jade' }),
    g({ name: 'Kertas Jimat', rank: 'Rare', category: 'material', tier: 3, description: 'Kertas roh. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 20, priceCurrency: 'gold' }),
    g({ name: 'Batu Roh Utuh', rank: 'Legendary', category: 'material', tier: 7, description: '100 pecahan batu roh yang dipadatkan. Mata uang & bahan ritual tinggi. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Benang Jiwa', rank: 'Legendary', category: 'material', tier: 7, description: 'Benang dari kayu jiwa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Pelat Star Iron', rank: 'Legendary', category: 'material', tier: 7, description: 'Pelat besi bintang. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.', basePrice: 8, priceCurrency: 'jade' }),
  ];
  items.push(...processed);

  // PILLS
  const pills = [
    g({ name: 'Pil Pemulih Luka Ringan', rank: 'Uncommon', category: 'pill', tier: 2, description: 'Menutup luka luar. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Pil Pemulih Luka Berat', rank: 'Rare', category: 'pill', tier: 3, description: 'Menyembuhkan luka dalam. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Pil Pengumpul Qi', rank: 'Epic', category: 'pill', tier: 5, description: 'Pil dari ginseng darah + pecahan batu roh. Mempercepat kultivasi dasar. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Pil Pembersih Meridian', rank: 'Epic', category: 'pill', tier: 5, description: 'Membersihkan sumbatan. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Pil Penempa Tulang', rank: 'Legendary', category: 'pill', tier: 7, description: 'Pil dari rumput sumsum. Memperkuat tulang & fondasi tubuh. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 15, priceCurrency: 'jade' }),
    g({ name: 'Pil Loncatan Realm', rank: 'Legendary', category: 'pill', tier: 7, description: 'Bantu terobosan realm (risiko). Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 25, priceCurrency: 'jade' }),
    g({ name: 'Pil Keabadian Semu', rank: 'Mythical', category: 'pill', tier: 9, description: 'Perpanjang umur signifikan. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 1, priceCurrency: 'spirit' }),
    g({ name: 'Pil Detoksifikasi', rank: 'Rare', category: 'pill', tier: 3, description: 'Membersihkan racun. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 4, priceCurrency: 'gold' }),
    g({ name: 'Pil Penguat Tubuh', rank: 'Rare', category: 'pill', tier: 3, description: 'Meningkatkan ketahanan fisik. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 5, priceCurrency: 'gold' }),
    g({ name: 'Pil Pemurnian Darah', rank: 'Epic', category: 'pill', tier: 5, description: 'Memurnikan darah kultivator. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Pil Jiwa Stabil', rank: 'Legendary', category: 'pill', tier: 7, description: 'Menstabilkan jiwa setelah trauma. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 12, priceCurrency: 'jade' }),
    g({ name: 'Pil Ascension', rank: 'Mythical', category: 'pill', tier: 9, description: 'Membantu loncatan ke Immortal. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.', basePrice: 3, priceCurrency: 'spirit' }),
  ];
  items.push(...pills);

  // WEAPONS
  const weapons = [
    g({ name: 'Pedang Besi Biasa', rank: 'Common', category: 'weapon', tier: 1, description: 'Pedang standar desa. Benda umum yang menjadi tulang punggung perekonomian fana. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Tombak Besi', rank: 'Common', category: 'weapon', tier: 1, description: 'Tombak perang dasar. Benda umum yang menjadi tulang punggung perekonomian fana. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 70, priceCurrency: 'silver' }),
    g({ name: 'Kapak Perang Besi', rank: 'Common', category: 'weapon', tier: 1, description: 'Kapak dua tangan. Benda umum yang menjadi tulang punggung perekonomian fana. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 90, priceCurrency: 'silver' }),
    g({ name: 'Busur Kayu', rank: 'Common', category: 'weapon', tier: 1, description: 'Busur pendekar desa. Benda umum yang menjadi tulang punggung perekonomian fana. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 60, priceCurrency: 'silver' }),
    g({ name: 'Pedang Baja', rank: 'Uncommon', category: 'weapon', tier: 2, description: 'Pedang baja keras. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Tombak Baja', rank: 'Uncommon', category: 'weapon', tier: 2, description: 'Tombak baja. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Pedang Perunggu', rank: 'Uncommon', category: 'weapon', tier: 2, description: 'Pedang upacara & perang. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Pedang Baja Hitam', rank: 'Rare', category: 'weapon', tier: 3, description: 'Menyalurkan Qi. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Pedang Darah Spirit', rank: 'Epic', category: 'weapon', tier: 5, description: 'Haus darah dari Baja Darah. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Pedang Besi Dingin', rank: 'Epic', category: 'weapon', tier: 5, description: 'Aura es membekukan. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Pedang Mithril', rank: 'Epic', category: 'weapon', tier: 5, description: 'Ringan & mematikan. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Pedang Star Iron', rank: 'Legendary', category: 'weapon', tier: 7, description: 'Pedang dari besi bintang. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 10, priceCurrency: 'jade' }),
    g({ name: 'Tombak Naga', rank: 'Legendary', category: 'weapon', tier: 7, description: 'Tombak bertatah sisik naga. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 12, priceCurrency: 'jade' }),
    g({ name: 'Pedang Jiwa', rank: 'Legendary', category: 'weapon', tier: 7, description: 'Pedang yang mengikat jiwa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 15, priceCurrency: 'jade' }),
    g({ name: 'Pedang Primordial', rank: 'Mythical', category: 'weapon', tier: 9, description: 'Pedang dari awal penciptaan. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.', basePrice: 2, priceCurrency: 'spirit' }),
  ];
  items.push(...weapons);

  // CLOTH ACCESSORIES
  const cloth = [
    g({ name: 'Jubah Katun', rank: 'Common', category: 'cloth', tier: 1, description: 'Pakaian sehari-hari. Benda umum yang menjadi tulang punggung perekonomian fana. Menawarkan perlindungan energi sekaligus kenyamanan.', basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Jubah Kulit', rank: 'Uncommon', category: 'cloth', tier: 2, description: 'Tahan gores. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Menawarkan perlindungan energi sekaligus kenyamanan.', basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Jubah Wol', rank: 'Uncommon', category: 'cloth', tier: 2, description: 'Hangat di musim dingin. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Menawarkan perlindungan energi sekaligus kenyamanan.', basePrice: 70, priceCurrency: 'silver' }),
    g({ name: 'Jubah Sutra Salju', rank: 'Epic', category: 'cloth', tier: 5, description: 'Ringan & kuat. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Menawarkan perlindungan energi sekaligus kenyamanan.', basePrice: 1, priceCurrency: 'jade' }),
    g({ name: 'Jubah Baja Hitam', rank: 'Epic', category: 'cloth', tier: 5, description: 'Armor ringan dari baja mistis. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Menawarkan perlindungan energi sekaligus kenyamanan.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Jubah Bintang', rank: 'Legendary', category: 'cloth', tier: 7, description: 'Jubah dari pelat Star Iron. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Menawarkan perlindungan energi sekaligus kenyamanan.', basePrice: 8, priceCurrency: 'jade' }),
    g({ name: 'Jubah Immortal', rank: 'Mythical', category: 'cloth', tier: 9, description: 'Jubah dewa. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Menawarkan perlindungan energi sekaligus kenyamanan.', basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Cincin Giok Dasar', rank: 'Rare', category: 'accessories', tier: 3, description: 'Penampung Qi kecil. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang.', basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Cincin Baja Hitam', rank: 'Epic', category: 'accessories', tier: 5, description: 'Cincin penyimpan Qi. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.', basePrice: 1, priceCurrency: 'jade' }),
    g({ name: 'Kalung Batu Roh', rank: 'Epic', category: 'accessories', tier: 5, description: 'Mempercepat regenerasi Qi. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Mahkota Giok Roh', rank: 'Legendary', category: 'accessories', tier: 7, description: 'Melindungi jiwa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang.', basePrice: 10, priceCurrency: 'jade' }),
    g({ name: 'Jimat Perlindungan Dasar', rank: 'Rare', category: 'artifact', tier: 3, description: 'Menahan satu serangan. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Benda magis dengan hukum alam yang terukir di dalamnya.', basePrice: 10, priceCurrency: 'gold' }),
    g({ name: 'Jimat Ledakan Api', rank: 'Epic', category: 'artifact', tier: 5, description: 'Jimat serangan elemen api. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Benda magis dengan hukum alam yang terukir di dalamnya.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Jimat Perisai Qi', rank: 'Epic', category: 'artifact', tier: 5, description: 'Perisai Qi sementara. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Benda magis dengan hukum alam yang terukir di dalamnya.', basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Array Flag Dasar', rank: 'Rare', category: 'artifact', tier: 3, description: 'Bendera formasi sederhana. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Benda magis dengan hukum alam yang terukir di dalamnya.', basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Array Flag Lanjutan', rank: 'Legendary', category: 'artifact', tier: 7, description: 'Bendera formasi tingkat tinggi. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Benda magis dengan hukum alam yang terukir di dalamnya.', basePrice: 8, priceCurrency: 'jade' }),
  ];
  items.push(...cloth);

  // Extra herbs & snacks for volume
  const herbNames = ['Rumput Qi', 'Daun Spirit', 'Akar Bulan', 'Bunga Emas', 'Jamur Gua', 'Lumut Batu', 'Akar Api', 'Daun Es', 'Bunga Angin', 'Rumput Petir', 'Akar Petir', 'Bunga Cahaya', 'Daun Kegelapan', 'Jamur Qi', 'Rumput Yin'];
  herbNames.forEach((n, i) => {
    const rank = i < 4 ? 'Uncommon' : i < 10 ? 'Rare' : 'Epic';
    const tier = rank === 'Uncommon' ? 2 : rank === 'Rare' ? 3 : 5;
    const price = rank === 'Uncommon' ? 30 : rank === 'Rare' ? 8 : 40;
    const curr = rank === 'Uncommon' ? 'silver' : 'gold';
    items.push(g({ name: n, rank, category: 'herb', tier, description: `Herbal ${rank.toLowerCase()} liar. Bahan alkimia, pil, dan barter kultivator.`, basePrice: price, priceCurrency: curr }));
  });
  const snacks = ['Kue Beras', 'Kue Gandum', 'Ikan Bakar', 'Udang Rebus', 'Telur Dadar', 'Bubur Gandum', 'Sup Sayur', 'Daging Asap', 'Kue Jagung', 'Bubur Kedelai'];
  snacks.forEach((n, i) => {
    items.push(g({ name: n, rank: 'Common', category: 'consume', tier: 1, description: 'Makanan olahan sederhana. Benda umum yang menjadi tulang punggung perekonomian fana.', basePrice: 10 + i * 2, priceCurrency: 'silver', effect: 'Memulihkan 10-20 Hunger' }));
  });


  // ========== QUALITY UNIQUE ITEMS (seru jangka panjang) ==========
  // Special materials for late-game sinks
  const uniqueMats = [
    g({ name: "Benang Laba-laba Kristal", rank: "Epic", category: "material", tier: 5, description: "Benang sangat kuat dari laba-laba kristal. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 70, priceCurrency: "gold" }),
    g({ name: "Air Mata Phoenix", rank: "Legendary", category: "material", tier: 7, description: "Air mata yang menyembuhkan luka jiwa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 8, priceCurrency: "jade" }),
    g({ name: "Tanduk Qilin", rank: "Legendary", category: "material", tier: 7, description: "Tanduk keberuntungan tingkat dewa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 10, priceCurrency: "jade" }),
    g({ name: "Sisik Qinglong", rank: "Mythical", category: "material", tier: 9, description: "Sisik naga biru penunggu timur. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 1, priceCurrency: "spirit" }),
    g({ name: "Bulu Zhuque", rank: "Mythical", category: "material", tier: 9, description: "Bulu burung api penunggu selatan. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 1, priceCurrency: "spirit" }),
    g({ name: "Cakar Baihu", rank: "Mythical", category: "material", tier: 9, description: "Cakar harimau putih penunggu barat. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 1, priceCurrency: "spirit" }),
    g({ name: "Cangkang Xuanwu", rank: "Mythical", category: "material", tier: 9, description: "Cangkang kura-kura penunggu utara. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 1, priceCurrency: "spirit" }),
    g({ name: "Inti Primordial", rank: "Mythical", category: "material", tier: 9, description: "Inti dari awal penciptaan. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 2, priceCurrency: "spirit" }),
  ];
  items.push(...uniqueMats);

  // Unique pills for progression & sink
  const uniquePills = [
    g({ name: "Pil Fondasi Sempurna", rank: "Legendary", category: "pill", tier: 7, description: "Menyempurnakan fondasi kultivasi. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.", basePrice: 20, priceCurrency: "jade" }),
    g({ name: "Pil Pencerahan Jiwa", rank: "Legendary", category: "pill", tier: 7, description: "Membantu memahami hukum alam. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.", basePrice: 18, priceCurrency: "jade" }),
    g({ name: "Pil Penjaga Jiwa", rank: "Epic", category: "pill", tier: 5, description: "Melindungi jiwa dari serangan spiritual. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.", basePrice: 3, priceCurrency: "jade" }),
    g({ name: "Pil Regenerasi Total", rank: "Epic", category: "pill", tier: 5, description: "Memulihkan tubuh hampir sempurna. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.", basePrice: 4, priceCurrency: "jade" }),
    g({ name: "Pil Immortal Draft", rank: "Mythical", category: "pill", tier: 9, description: "Draf awal menuju keabadian. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.", basePrice: 2, priceCurrency: "spirit" }),
  ];
  items.push(...uniquePills);

  // Unique weapons / artifacts for late game goals
  const uniqueGear = [
    g({ name: "Pedang Langit Putih", rank: "Legendary", category: "weapon", tier: 7, description: "Pedang legendaris penolak kejahatan. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.", basePrice: 12, priceCurrency: "jade" }),
    g({ name: "Tombak Naga Hitam", rank: "Legendary", category: "weapon", tier: 7, description: "Tombak yang menggigilkan jiwa. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.", basePrice: 14, priceCurrency: "jade" }),
    g({ name: "Kipas Angin Surgawi", rank: "Epic", category: "weapon", tier: 5, description: "Kipas yang mengendalikan angin. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.", basePrice: 3, priceCurrency: "jade" }),
    g({ name: "Belati Bayangan", rank: "Epic", category: "weapon", tier: 5, description: "Belati yang menghilang di bayangan. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Jimat Kebangkitan", rank: "Legendary", category: "artifact", tier: 7, description: "Jimat yang bisa membangkitkan sekali. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Benda magis dengan hukum alam yang terukir di dalamnya.", basePrice: 15, priceCurrency: "jade" }),
    g({ name: "Segel Dimensi", rank: "Mythical", category: "artifact", tier: 9, description: "Segel yang mengunci ruang. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Benda magis dengan hukum alam yang terukir di dalamnya.", basePrice: 2, priceCurrency: "spirit" }),
    g({ name: "Lentera Jiwa Abadi", rank: "Mythical", category: "artifact", tier: 9, description: "Lentera yang menuntun jiwa yang tersesat. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Benda magis dengan hukum alam yang terukir di dalamnya.", basePrice: 3, priceCurrency: "spirit" }),
  ];
  items.push(...uniqueGear);


  // =========================================================================
  // ERA PABRIK (INDUSTRI) + ERA MODERN
  // Disesuaikan ke setting Jianghu/Xianxia (steampunk murim + modern kultivasi)
  // =========================================================================

  // --- Industrial Materials & Components ---
  const industrial = [
    g({ name: "Batu Bara Berkualitas", rank: "Uncommon", category: "material", tier: 2, description: "Batu bara padat untuk mesin uap & peleburan industri. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 12, priceCurrency: "silver" }),
    g({ name: "Minyak Mentah", rank: "Uncommon", category: "material", tier: 2, description: "Minyak dari sumur dangkal. Disuling menjadi Minyak Olahan. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 20, priceCurrency: "silver" }),
    g({ name: "Minyak Olahan", rank: "Rare", category: "material", tier: 3, description: "Hasil suling minyak mentah. Bahan bakar & pelumas mesin. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 3, priceCurrency: "gold" }),
    g({ name: "Karet Mentah", rank: "Uncommon", category: "material", tier: 2, description: "Getah kebun karet. Diolah menjadi Karet Olahan. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 15, priceCurrency: "silver" }),
    g({ name: "Karet Olahan", rank: "Rare", category: "material", tier: 3, description: "Karet siap pakai. Roda, seal, dan komponen mesin. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 2, priceCurrency: "gold" }),
    g({ name: "Kawat Tembaga", rank: "Uncommon", category: "material", tier: 2, description: "Tembaga ditarik halus. Konduktor dasar & komponen chip Qi. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 30, priceCurrency: "silver" }),
    g({ name: "Kawat Baja", rank: "Rare", category: "material", tier: 3, description: "Kawat baja kuat. Kabel struktur & pegas. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 2, priceCurrency: "gold" }),
    g({ name: "Roda Gigi Besi", rank: "Uncommon", category: "material", tier: 2, description: "Komponen mesin dasar dari besi. Rangka transmisi uap. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 40, priceCurrency: "silver" }),
    g({ name: "Roda Gigi Baja", rank: "Rare", category: "material", tier: 3, description: "Roda gigi presisi. Jantung Inti Mesin Uap. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 3, priceCurrency: "gold" }),
    g({ name: "Pegas Baja", rank: "Rare", category: "material", tier: 3, description: "Pegas mekanisme. Senjata getar & mesin otomatis. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 2, priceCurrency: "gold" }),
    g({ name: "Pelat Baja Tebal", rank: "Rare", category: "material", tier: 3, description: "Pelat untuk rangka kapal, pabrik, dan armor berat. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 4, priceCurrency: "gold" }),
    g({ name: "Baut & Mur", rank: "Common", category: "material", tier: 1, description: "Pengikat mesin. Selalu dibutuhkan perakitan industri. Benda umum yang menjadi tulang punggung perekonomian fana. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 8, priceCurrency: "silver" }),
    g({ name: "Uap Terkondensasi", rank: "Uncommon", category: "material", tier: 2, description: "Energi uap dalam bentuk padat sementara. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 25, priceCurrency: "silver" }),
    g({ name: "Inti Mesin Uap", rank: "Rare", category: "material", tier: 3, description: "Jantung mesin uap murim. Merakit senapan uap & pembangkit. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 8, priceCurrency: "gold" }),
    g({ name: "Katalis Kimia Dasar", rank: "Rare", category: "material", tier: 3, description: "Mempercepat reaksi di laboratorium kimia murim. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 5, priceCurrency: "gold" }),
    g({ name: "Asam Industri", rank: "Rare", category: "material", tier: 3, description: "Asam pengolahan logam & pemurnian bijih. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 4, priceCurrency: "gold" }),
    g({ name: "Kaca Optik", rank: "Rare", category: "material", tier: 3, description: "Kaca jernih presisi. Bahan Lensa Presisi. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 6, priceCurrency: "gold" }),
    g({ name: "Lensa Presisi", rank: "Epic", category: "material", tier: 5, description: "Lensa untuk scanner, senjata, dan alat ukur aura. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 40, priceCurrency: "gold" }),
  ];
  items.push(...industrial);

  // --- Modern Materials & Components ---
  const modern = [
    g({ name: "Bijih Aluminium", rank: "Rare", category: "material", tier: 3, description: "Logam ringan modern. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 5, priceCurrency: "gold" }),
    g({ name: "Batangan Aluminium", rank: "Epic", category: "material", tier: 5, description: "Aluminium murni. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 30, priceCurrency: "gold" }),
    g({ name: "Serat Karbon Mentah", rank: "Epic", category: "material", tier: 5, description: "Serat super kuat. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 50, priceCurrency: "gold" }),
    g({ name: "Pelat Serat Karbon", rank: "Legendary", category: "material", tier: 7, description: "Pelat ringan sekuat baja mistis. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 4, priceCurrency: "jade" }),
    g({ name: "Chip Qi Sederhana", rank: "Epic", category: "material", tier: 5, description: "Chip yang menyimpan & mengatur aliran Qi. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 60, priceCurrency: "gold" }),
    g({ name: "Chip Qi Lanjutan", rank: "Legendary", category: "material", tier: 7, description: "Chip Qi tingkat tinggi. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 5, priceCurrency: "jade" }),
    g({ name: "Baterai Spirit", rank: "Epic", category: "material", tier: 5, description: "Menyimpan energi spirit. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 45, priceCurrency: "gold" }),
    g({ name: "Kabel Optik Qi", rank: "Legendary", category: "material", tier: 7, description: "Menghantar Qi dengan kerugian minimal. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 6, priceCurrency: "jade" }),
    g({ name: "Sensor Aura", rank: "Epic", category: "material", tier: 5, description: "Mendeteksi fluktuasi aura. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 55, priceCurrency: "gold" }),
    g({ name: "Modul Formasi Portabel", rank: "Legendary", category: "material", tier: 7, description: "Formasi dalam bentuk modul. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 8, priceCurrency: "jade" }),
    g({ name: "Plastik Spirit", rank: "Rare", category: "material", tier: 3, description: "Material sintetis tahan Qi. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 4, priceCurrency: "gold" }),
    g({ name: "Alloy Modern", rank: "Epic", category: "material", tier: 5, description: "Paduan logam modern + mistis. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 70, priceCurrency: "gold" }),
    g({ name: "Inti Reaktor Spirit", rank: "Mythical", category: "material", tier: 9, description: "Jantung pembangkit spirit tingkat dewa. Item ini memancarkan aura primordial yang menggetarkan kekosongan, sebuah legenda yang diidamkan oleh para tetua dunia kultivasi. Bahan baku esensial, fondasi bagi bangunan megah maupun pusaka mematikan.", basePrice: 2, priceCurrency: "spirit" }),
  ];
  items.push(...modern);

  // --- Industrial & Modern Tools ---
  const eraTools = [
    g({ name: "Kunci Inggris Besi", rank: "Uncommon", category: "consume", tier: 2, description: "Alat perakitan mesin. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.", basePrice: 1, priceCurrency: "gold" }),
    g({ name: "Obeng Presisi", rank: "Rare", category: "consume", tier: 3, description: "Untuk komponen halus. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang.", basePrice: 3, priceCurrency: "gold" }),
    g({ name: "Mesin Bor Portable", rank: "Rare", category: "consume", tier: 3, description: "Bor untuk logam & batu. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang.", basePrice: 8, priceCurrency: "gold" }),
    g({ name: "Las Listrik Qi", rank: "Epic", category: "consume", tier: 5, description: "Las yang menggunakan Qi. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.", basePrice: 1, priceCurrency: "jade" }),
    g({ name: "Scanner Aura", rank: "Epic", category: "consume", tier: 5, description: "Memindai komposisi material & aura. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Printer Formasi", rank: "Legendary", category: "consume", tier: 7, description: "Mencetak formasi dasar secara otomatis. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang.", basePrice: 6, priceCurrency: "jade" }),
  ];
  items.push(...eraTools);

  // --- Industrial & Modern Weapons / Gear ---
  const eraGear = [
    g({ name: "Senapan Uap", rank: "Rare", category: "weapon", tier: 3, description: "Senjata proyektif bertenaga uap. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.", basePrice: 12, priceCurrency: "gold" }),
    g({ name: "Pedang Getar Baja", rank: "Epic", category: "weapon", tier: 5, description: "Pedang yang bergetar frekuensi tinggi. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Tongkat Stun Qi", rank: "Epic", category: "weapon", tier: 5, description: "Menyetrum meridian lawan. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya. Mampu menyalurkan Qi pembunuh, senjata ini mematikan di tangan ahlinya.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Armor Pelat Baja", rank: "Rare", category: "cloth", tier: 3, description: "Armor berat industri. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Menawarkan perlindungan energi sekaligus kenyamanan.", basePrice: 10, priceCurrency: "gold" }),
    g({ name: "Armor Serat Karbon", rank: "Legendary", category: "cloth", tier: 7, description: "Armor ringan super kuat. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Menawarkan perlindungan energi sekaligus kenyamanan.", basePrice: 8, priceCurrency: "jade" }),
    g({ name: "Kacamata Optik", rank: "Rare", category: "accessories", tier: 3, description: "Melihat detail jauh. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang.", basePrice: 5, priceCurrency: "gold" }),
    g({ name: "Jam Tangan Qi", rank: "Epic", category: "accessories", tier: 5, description: "Mengukur aliran Qi & waktu. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.", basePrice: 2, priceCurrency: "jade" }),
    g({ name: "Komunikasi Spirit", rank: "Legendary", category: "artifact", tier: 7, description: "Alat komunikasi jarak jauh via spirit wave. Kualitas legendaris dari benda ini memancarkan tekanan surgawi yang samar, peninggalan era yang telah lama hilang. Benda magis dengan hukum alam yang terukir di dalamnya.", basePrice: 10, priceCurrency: "jade" }),
  ];
  items.push(...eraGear);

  // --- Industrial Consumables ---
  const eraConsume = [
    g({ name: "Bahan Bakar Uap", rank: "Uncommon", category: "consume", tier: 2, description: "Bahan bakar mesin uap. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.", basePrice: 15, priceCurrency: "silver" }),
    g({ name: "Bahan Bakar Spirit", rank: "Epic", category: "consume", tier: 5, description: "Bahan bakar mesin spirit modern. Ditempa dengan teknik tingkat tinggi, memancarkan resonansi energi yang kuat bagi siapa saja yang mendekatinya.", basePrice: 40, priceCurrency: "gold" }),
    g({ name: "Pelumas Mesin", rank: "Uncommon", category: "consume", tier: 2, description: "Menjaga mesin tetap mulus. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.", basePrice: 20, priceCurrency: "silver" }),
    g({ name: "Ransum Industri", rank: "Uncommon", category: "consume", tier: 2, description: "Makanan padat pekerja pabrik. Memiliki kualitas jauh di atas rata-rata, sering dipakai oleh sekte-sekte luar untuk murid andalan mereka.", basePrice: 25, priceCurrency: "silver", effect: "Memulihkan 30 Hunger" }),
    g({ name: "Pil Stamina Pabrik", rank: "Rare", category: "pill", tier: 3, description: "Stamina untuk shift panjang. Jarang ditemukan di dunia biasa, benda ini menjadi rebutan di berbagai balai lelang. Memiliki wangi harum alkimia yang khas, menyimpan khasiat yang mampu mengubah nasib.", basePrice: 4, priceCurrency: "gold" }),
  ];
  items.push(...eraConsume);


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
    g({ name: 'Pohon Buah Liar', description: "Pohon kuno di pinggir hutan yang akarnya menyerap embun pagi. Tempat ini memberikan hasil bagi mereka yang mau berusaha.", rank: 'Common', workerOutputItemId: idOf('Buah Liar'), workerOutputItemName: 'Buah Liar', workerOutputQuantity: 2, workerInputMaterials: [], constructionTimeHours: 0, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 5, priceCurrency: 'silver' }),
    g({ name: 'Area Buruan Primitif', description: "Jejak hewan buas terukir di tanah berbatu. Hutan ini penuh bahaya, namun menawarkan hasil buruan bagi pendekar yang gigih.", rank: 'Common', workerOutputItemId: idOf('Daging Mentah'), workerOutputItemName: 'Daging Mentah', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Tombak Kayu'), itemName: 'Tombak Kayu', quantity: 1 }], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Tombak Kayu'), itemName: 'Tombak Kayu', quantity: 1 }], basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Lahan Tanah Liat Primitif', description: "Pinggiran sungai dengan lumpur tebal yang menyimpan intisari bumi, bahan dasar bagi karya para pembangun.", rank: 'Common', workerOutputItemId: idOf('Tanah Liat'), workerOutputItemName: 'Tanah Liat', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Tambang Batu Kasar Primitif', description: "Gua dangkal di kaki gunung, tempat di mana suara pahatan memecah kesunyian demi membongkar kekuatan batu alam.", rank: 'Common', workerOutputItemId: idOf('Batu Kasar'), workerOutputItemName: 'Batu Kasar', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Galian Pasir Putih', description: "Hamparan pasir halus di tepi danau yang memantulkan sinar rembulan, cocok untuk dilebur menjadi karya seni.", rank: 'Common', workerOutputItemId: idOf('Pasir Putih'), workerOutputItemName: 'Pasir Putih', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Galian Batu Kapur', description: "Tebing putih kapur yang rapuh namun berharga, menyimpan jejak lautan purba yang telah lama mengering.", rank: 'Common', workerOutputItemId: idOf('Batu Kapur'), workerOutputItemName: 'Batu Kapur', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }], basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Area Penebangan Kayu Dasar', description: "Rimbunan pohon keras yang tumbuh menjulang, menantang para penebang untuk membuktikan ketajaman kapak mereka.", rank: 'Common', workerOutputItemId: idOf('Kayu Mentah'), workerOutputItemName: 'Kayu Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Kapak Batu'), itemName: 'Kapak Batu', quantity: 1 }], constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Batu'), itemName: 'Kapak Batu', quantity: 2 }], basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Sungai Dangkal', description: "Aliran sungai jernih yang tenang, menyembunyikan kehidupan di bawah riak airnya.", rank: 'Common', workerOutputItemId: idOf('Ikan Air Tawar'), workerOutputItemName: 'Ikan Air Tawar', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Alat Pancing Kayu'), itemName: 'Alat Pancing Kayu', quantity: 1 }], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Alat Pancing Kayu'), itemName: 'Alat Pancing Kayu', quantity: 1 }], basePrice: 12, priceCurrency: 'silver' }),
    g({ name: 'Sarang Lebah Liar', description: "Sarang alami di antara dahan raksasa. Dengungan lebah menyiratkan kerja keras tanpa henti.", rank: 'Uncommon', workerOutputItemId: idOf('Madu Liar'), workerOutputItemName: 'Madu Liar', workerOutputQuantity: 1, workerInputMaterials: [], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Pisau Tulang'), itemName: 'Pisau Tulang', quantity: 1 }], basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Sawah Gandum', description: "Hamparan keemasan yang menari ditiup angin. Ladang ini adalah denyut nadi kehidupan bagi rakyat jelata.", rank: 'Common', workerOutputItemId: idOf('Gandum'), workerOutputItemName: 'Gandum', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Gandum'), itemName: 'Bibit Gandum', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Gandum'), itemName: 'Bibit Gandum', quantity: 5 }], basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Sawah Padi', description: "Sawah berundak yang tergenang air, cermin dari langit. Bulir padinya menyimpan kekuatan tanah.", rank: 'Common', workerOutputItemId: idOf('Padi Mentah'), workerOutputItemName: 'Padi Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Padi'), itemName: 'Bibit Padi', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Padi'), itemName: 'Bibit Padi', quantity: 5 }], basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Kebun Kapas', description: "Bunga-bunga kapas seputih awan, menjanjikan kehangatan dan kelembutan bagi mereka yang merawatnya.", rank: 'Common', workerOutputItemId: idOf('Kapas Mentah'), workerOutputItemName: 'Kapas Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Kapas'), itemName: 'Bibit Kapas', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Kapas'), itemName: 'Bibit Kapas', quantity: 5 }], basePrice: 55, priceCurrency: 'silver' }),
    g({ name: 'Kebun Jagung', description: "Ladang jagung yang tumbuh tinggi menutupi pandangan, menjadi lumbung energi bagi dunia fana.", rank: 'Common', workerOutputItemId: idOf('Jagung Mentah'), workerOutputItemName: 'Jagung Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Jagung'), itemName: 'Bibit Jagung', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Jagung'), itemName: 'Bibit Jagung', quantity: 5 }], basePrice: 48, priceCurrency: 'silver' }),
    g({ name: 'Kebun Kedelai', description: "Lahan hijau kedelai yang sederhana namun menyimpan sejuta manfaat bagi tubuh manusia.", rank: 'Common', workerOutputItemId: idOf('Kedelai Mentah'), workerOutputItemName: 'Kedelai Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Kedelai'), itemName: 'Bibit Kedelai', quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Kedelai'), itemName: 'Bibit Kedelai', quantity: 5 }], basePrice: 48, priceCurrency: 'silver' }),
    g({ name: 'Hutan Bambu', description: "Rumpun bambu yang bergoyang berirama. Batangnya lurus dan kuat, melambangkan keteguhan seorang pendekar.", rank: 'Common', workerOutputItemId: idOf('Bambu'), workerOutputItemName: 'Bambu', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Bambu'), itemName: 'Bibit Bambu', quantity: 1 }], constructionTimeHours: 3, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Bambu'), itemName: 'Bibit Bambu', quantity: 5 }], basePrice: 45, priceCurrency: 'silver' }),
    g({ name: 'Kebun Anggur', description: "Rambatan anggur di perbukitan yang menyerap sari bumi, bersiap untuk menghasilkan minuman para bangsawan.", rank: 'Uncommon', workerOutputItemId: idOf('Anggur Segar'), workerOutputItemName: 'Anggur Segar', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Anggur'), itemName: 'Bibit Anggur', quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Anggur'), itemName: 'Bibit Anggur', quantity: 8 }], basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Kebun Teh', description: "Kebun di dataran tinggi yang diselimuti kabut. Daunnya menyimpan esensi ketenangan dan pencerahan.", rank: 'Uncommon', workerOutputItemId: idOf('Daun Teh Mentah'), workerOutputItemName: 'Daun Teh Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Bibit Teh'), itemName: 'Bibit Teh', quantity: 1 }], constructionTimeHours: 10, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }, { itemId: idOf('Bibit Teh'), itemName: 'Bibit Teh', quantity: 5 }], basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Tambak Garam', description: "Hamparan ladang garam putih yang berkilauan, mengkristalkan esensi dari samudra yang luas.", rank: 'Common', workerOutputItemId: idOf('Air Laut'), workerOutputItemName: 'Air Laut', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Roti Panggang'), itemName: 'Roti Panggang', quantity: 1 }], constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Besi'), itemName: 'Cangkul Besi', quantity: 1 }], basePrice: 60, priceCurrency: 'silver' }),
    g({ name: 'Peternakan Ayam', description: "Pohon kuno di pinggir hutan yang akarnya menyerap embun pagi. Tempat ini memberikan hasil bagi mereka yang mau berusaha.", rank: 'Common', workerOutputItemId: idOf('Telur Mentah'), workerOutputItemName: 'Telur Mentah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Pakan Ternak'), itemName: 'Pakan Ternak', quantity: 1 }], constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 15 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 10 }], basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Peternakan Sapi', description: 'Kandang sapi. Input: Pakan Ternak. Hasil: Susu (bahan keju). Struktur kokoh dan mulai terorganisir, menjadi langkah awal meninggalkan perekonomian desa yang primitif.', rank: 'Uncommon', workerOutputItemId: idOf('Susu Sapi'), workerOutputItemName: 'Susu Sapi', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pakan Ternak'), itemName: 'Pakan Ternak', quantity: 2 }], constructionTimeHours: 12, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 30 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 20 }], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Peternakan Domba', description: '1 Wol Mentah/jam. Butuh 1 Pakan Ternak/jam. Struktur kokoh dan mulai terorganisir, menjadi langkah awal meninggalkan perekonomian desa yang primitif.', rank: 'Uncommon', workerOutputItemId: idOf('Wol Mentah'), workerOutputItemName: 'Wol Mentah', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pakan Ternak'), itemName: 'Pakan Ternak', quantity: 1 }], constructionTimeHours: 10, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 25 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 15 }], basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Area Penebangan Kayu Besi', description: 'Hutan lebih dalam. Hasil: 3 Kayu Mentah/jam. Input: Kapak Besi. Upgrade jelas dari Dasar. Struktur kokoh dan mulai terorganisir, menjadi langkah awal meninggalkan perekonomian desa yang primitif.', rank: 'Uncommon', workerOutputItemId: idOf('Kayu Mentah'), workerOutputItemName: 'Kayu Mentah', workerOutputQuantity: 3, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 2 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 10 }], basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Hutan Pinus', description: '2 Kayu Pinus/jam. Butuh 1 Kapak Besi/jam. Struktur kokoh dan mulai terorganisir, menjadi langkah awal meninggalkan perekonomian desa yang primitif.', rank: 'Uncommon', workerOutputItemId: idOf('Kayu Pinus'), workerOutputItemName: 'Kayu Pinus', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 2 }], basePrice: 90, priceCurrency: 'silver' }),
    g({ name: 'Hutan Jati', description: '1 Kayu Jati/jam. Butuh 1 Kapak Besi/jam. Struktur kokoh dan mulai terorganisir, menjadi langkah awal meninggalkan perekonomian desa yang primitif.', rank: 'Uncommon', workerOutputItemId: idOf('Kayu Jati'), workerOutputItemName: 'Kayu Jati', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 12, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 3 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 10 }], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Tambang Batu Bara Dangkal', description: '2 Batu Bara/jam. Butuh 1 Beliung Besi/jam. Tempat kerja sederhana namun krusial, denyut nadi kehidupan awal bagi penduduk desa untuk bertahan hidup.', rank: 'Common', workerOutputItemId: idOf('Batu Bara'), workerOutputItemName: 'Batu Bara', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 10 }], basePrice: 90, priceCurrency: 'silver' }),
    g({ name: 'Tambang Bijih Besi Dangkal', description: '1 Bijih Besi/jam. Butuh 1 Beliung Besi/jam. Struktur kokoh dan mulai terorganisir, menjadi langkah awal meninggalkan perekonomian desa yang primitif.', rank: 'Uncommon', workerOutputItemId: idOf('Bijih Besi'), workerOutputItemName: 'Bijih Besi', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 12, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 2 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 20 }], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Tambang Tembaga', description: 'Urutan tembaga. Input: Beliung Besi. Bijih → Batangan Tembaga. Tempat kerja sederhana namun krusial, denyut nadi kehidupan awal bagi penduduk desa untuk bertahan hidup.', rank: 'Common', workerOutputItemId: idOf('Bijih Tembaga'), workerOutputItemName: 'Bijih Tembaga', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 15 }], basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Tambang Timah', description: 'Urutan timah. Input: Beliung Besi. Dipadu tembaga → Perunggu. Tempat kerja sederhana namun krusial, denyut nadi kehidupan awal bagi penduduk desa untuk bertahan hidup.', rank: 'Common', workerOutputItemId: idOf('Bijih Timah'), workerOutputItemName: 'Bijih Timah', workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 15 }], basePrice: 1, priceCurrency: 'gold' }),
    g({ name: 'Tambang Perak', description: '1 Bijih Perak/jam. Butuh 1 Beliung Besi/jam. Struktur kokoh dan mulai terorganisir, menjadi langkah awal meninggalkan perekonomian desa yang primitif.', rank: 'Uncommon', workerOutputItemId: idOf('Bijih Perak'), workerOutputItemName: 'Bijih Perak', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 1 }], constructionTimeHours: 16, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Besi'), itemName: 'Beliung Besi', quantity: 2 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 25 }], basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Tambang Emas Dangkal', description: '1 Bijih Emas/jam. Butuh 1 Beliung Baja Hitam/jam. Bangunan khusus dengan efisiensi tinggi, dioperasikan oleh pekerja terlatih. Sangat penting untuk produksi tingkat lanjut.', rank: 'Rare', workerOutputItemId: idOf('Bijih Emas'), workerOutputItemName: 'Bijih Emas', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }], constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 10 }], basePrice: 10, priceCurrency: 'gold' }),
    g({ name: 'Hutan Kayu Ulin', description: '1 Kayu Ulin/jam. Butuh 1 Kapak Besi/jam. Bangunan khusus dengan efisiensi tinggi, dioperasikan oleh pekerja terlatih. Sangat penting untuk produksi tingkat lanjut.', rank: 'Rare', workerOutputItemId: idOf('Kayu Ulin (Ironwood)'), workerOutputItemName: 'Kayu Ulin (Ironwood)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 3 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 5 }], basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Hutan Bambu Hitam', description: '1 Bambu Hitam/jam. Butuh 1 Kapak Besi/jam. Bangunan khusus dengan efisiensi tinggi, dioperasikan oleh pekerja terlatih. Sangat penting untuk produksi tingkat lanjut.', rank: 'Rare', workerOutputItemId: idOf('Bambu Hitam (Black Bamboo)'), workerOutputItemName: 'Bambu Hitam (Black Bamboo)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 3 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 5 }], basePrice: 7, priceCurrency: 'gold' }),
    g({ name: 'Hutan Sandalwood', description: '1 Kayu Sandalwood/jam. Butuh 1 Kapak Besi/jam. Bangunan khusus dengan efisiensi tinggi, dioperasikan oleh pekerja terlatih. Sangat penting untuk produksi tingkat lanjut.', rank: 'Rare', workerOutputItemId: idOf('Kayu Sandalwood'), workerOutputItemName: 'Kayu Sandalwood', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }], constructionTimeHours: 30, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 3 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 8 }], basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Kebun Ginseng Darah', description: "Tanah merah yang subur, merawat akar-akar berharga yang menyerap saripati darah dan Qi murni dari alam.", rank: 'Rare', workerOutputItemId: idOf('Ginseng Darah'), workerOutputItemName: 'Ginseng Darah', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Bibit Ginseng Darah'), itemName: 'Bibit Ginseng Darah', quantity: 1 }], constructionTimeHours: 36, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Giok'), itemName: 'Cangkul Giok', quantity: 1 }, { itemId: idOf('Bibit Ginseng Darah'), itemName: 'Bibit Ginseng Darah', quantity: 3 }], basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Kebun Bunga Bulan', description: "Tanah merah yang subur, merawat akar-akar berharga yang menyerap saripati darah dan Qi murni dari alam.", rank: 'Rare', workerOutputItemId: idOf('Bunga Bulan'), workerOutputItemName: 'Bunga Bulan', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Bibit Bunga Bulan'), itemName: 'Bibit Bunga Bulan', quantity: 1 }], constructionTimeHours: 36, buildable: true, buildRequirements: [{ itemId: idOf('Cangkul Giok'), itemName: 'Cangkul Giok', quantity: 1 }, { itemId: idOf('Bibit Bunga Bulan'), itemName: 'Bibit Bunga Bulan', quantity: 3 }], basePrice: 14, priceCurrency: 'gold' }),
    g({ name: 'Tambang Batu Roh Lapis Luar', description: "Gua kristal yang memancarkan pendar energi samar. Setiap retakannya adalah nafas bumi yang bocor.", rank: 'Epic', workerOutputItemId: idOf('Pecahan Batu Roh'), workerOutputItemName: 'Pecahan Batu Roh', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Roti Panggang'), itemName: 'Roti Panggang', quantity: 1 }], constructionTimeHours: 72, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 30 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 50 }], basePrice: 40, priceCurrency: 'gold' }),
    g({ name: 'Tambang Besi Dingin', description: "Lubang tambang yang memancarkan aura es menggigit. Hanya mereka yang kuat yang mampu bertahan di dalamnya.", rank: 'Epic', workerOutputItemId: idOf('Bijih Besi Dingin (Cold Iron)'), workerOutputItemName: 'Bijih Besi Dingin (Cold Iron)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }], constructionTimeHours: 72, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 2 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 40 }], basePrice: 50, priceCurrency: 'gold' }),
    g({ name: 'Tambang Mithril', description: "Urat bijih perak yang bersinar kebiruan, bahan legendaris yang ringan namun mustahil dihancurkan.", rank: 'Epic', workerOutputItemId: idOf('Bijih Mithril'), workerOutputItemName: 'Bijih Mithril', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }], constructionTimeHours: 96, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 2 }, { itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 10 }], basePrice: 80, priceCurrency: 'gold' }),
    g({ name: 'Tambang Giok Roh', description: "Gunung batu yang memendam giok hijau murni, tempat di mana energi spiritual dunia mengkristal menjadi batu.", rank: 'Epic', workerOutputItemId: idOf('Bijih Giok Roh'), workerOutputItemName: 'Bijih Giok Roh', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 1 }], constructionTimeHours: 80, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Baja Hitam'), itemName: 'Beliung Baja Hitam', quantity: 2 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 25 }], basePrice: 60, priceCurrency: 'gold' }),
    g({ name: 'Kebun Teratai Surgawi', description: "Kolam awan tempat mekarnya teratai putih tanpa noda, menyerap embun surgawi yang jatuh dari langit.", rank: 'Legendary', workerOutputItemId: idOf('Teratai Roh Langit'), workerOutputItemName: 'Teratai Roh Langit', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pil Nutrisi Pekerja'), itemName: 'Pil Nutrisi Pekerja', quantity: 1 }], constructionTimeHours: 120, buildable: true, buildRequirements: [{ itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 50 }, { itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 20 }, { itemId: idOf('Bibit Teratai Roh'), itemName: 'Bibit Teratai Roh', quantity: 5 }], basePrice: 5, priceCurrency: 'jade' }),
    g({ name: 'Kebun Akar Naga', description: "Tanah berukir yang berdenyut layaknya jantung. Akar-akarnya menjalar seperti urat nadi naga tanah.", rank: 'Legendary', workerOutputItemId: idOf('Akar Naga'), workerOutputItemName: 'Akar Naga', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pil Nutrisi Pekerja'), itemName: 'Pil Nutrisi Pekerja', quantity: 1 }], constructionTimeHours: 144, buildable: true, buildRequirements: [{ itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 40 }, { itemId: idOf('Bibit Akar Naga'), itemName: 'Bibit Akar Naga', quantity: 3 }], basePrice: 6, priceCurrency: 'jade' }),
    g({ name: 'Tambang Kristal Ilahi', description: "Inti kristal bercahaya di dasar bumi terdalam, memancarkan resonansi yang menggetarkan jiwa.", rank: 'Legendary', workerOutputItemId: idOf('Kristal Roh Ilahi'), workerOutputItemName: 'Kristal Roh Ilahi', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Pil Nutrisi Pekerja'), itemName: 'Pil Nutrisi Pekerja', quantity: 1 }], constructionTimeHours: 144, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Penekan Qi'), itemName: 'Beliung Penekan Qi', quantity: 1 }, { itemId: idOf('Baja Darah (Blood Steel)'), itemName: 'Baja Darah (Blood Steel)', quantity: 15 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 30 }], basePrice: 8, priceCurrency: 'jade' }),
    g({ name: 'Hutan Kayu Surga', description: "Pohon-pohon raksasa yang menyentuh langit, diselimuti oleh aura emas surgawi yang tak bisa ditembus senjata fana.", rank: 'Legendary', workerOutputItemId: idOf('Kayu Surga (Heavenly Wood)'), workerOutputItemName: 'Kayu Surga (Heavenly Wood)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Petir Surgawi'), itemName: 'Kapak Petir Surgawi', quantity: 1 }], constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Petir Surgawi'), itemName: 'Kapak Petir Surgawi', quantity: 1 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 5 }], basePrice: 10, priceCurrency: 'jade' }),
    g({ name: 'Hutan Kayu Jiwa', description: "Pepohonan gelap berbisik yang dahan-dahannya menyimpan ingatan dan jiwa-jiwa dari era masa lampau.", rank: 'Legendary', workerOutputItemId: idOf('Kayu Jiwa (Soulwood)'), workerOutputItemName: 'Kayu Jiwa (Soulwood)', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Kapak Petir Surgawi'), itemName: 'Kapak Petir Surgawi', quantity: 1 }], constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Kapak Petir Surgawi'), itemName: 'Kapak Petir Surgawi', quantity: 1 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 8 }], basePrice: 12, priceCurrency: 'jade' }),
    g({ name: 'Tambang Star Iron', description: "Kawah jatuhnya bintang yang membawa logam hitam pekat, menyerap pendaran dari konstelasi langit.", rank: 'Legendary', workerOutputItemId: idOf('Bijih Star Iron'), workerOutputItemName: 'Bijih Star Iron', workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf('Beliung Penekan Qi'), itemName: 'Beliung Penekan Qi', quantity: 1 }], constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Beliung Penekan Qi'), itemName: 'Beliung Penekan Qi', quantity: 1 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 10 }], basePrice: 15, priceCurrency: 'jade' }),
  ];
  assets.push(...prod);

  // CRAFTING (full chain)
  const craft = [
    g({ name: 'Tungku Tanah Liat Sederhana', description: "Tungku api panas yang terus menyala, memanggang tanah menjadi bata untuk perlindungan umat manusia.", rank: 'Common', isCraftingStation: true, constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 20 }, { itemId: idOf('Batu Kasar'), itemName: 'Batu Kasar', quantity: 10 }], recipes: [ { recipeName: 'Bakar Batu Bata', resultItemId: idOf('Batu Bata'), resultItemName: 'Batu Bata', resultQuantity: 4, materials: [{ itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 5 }, { itemId: idOf('Kayu Bakar'), itemName: 'Kayu Bakar', quantity: 2 }] }, { recipeName: 'Panggang Daging', resultItemId: idOf('Daging Bakar'), resultItemName: 'Daging Bakar', resultQuantity: 1, materials: [{ itemId: idOf('Daging Mentah'), itemName: 'Daging Mentah', quantity: 1 }, { itemId: idOf('Kayu Bakar'), itemName: 'Kayu Bakar', quantity: 1 }] }, { recipeName: 'Buat Garam', resultItemId: idOf('Garam Kasar'), resultItemName: 'Garam Kasar', resultQuantity: 2, materials: [{ itemId: idOf('Air Laut'), itemName: 'Air Laut', quantity: 5 }] } ], basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Bengkel Kayu Desa', description: "Bau serbuk gergaji dan getah menyelimuti bengkel ini, tempat di mana kayu kasar dibentuk menjadi mahakarya.", rank: 'Common', isCraftingStation: true, constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 30 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 10 }], recipes: [ { recipeName: 'Potong Papan (Batu)', resultItemId: idOf('Papan Kayu'), resultItemName: 'Papan Kayu', resultQuantity: 1, materials: [{ itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 4 }, { itemId: idOf('Kapak Batu'), itemName: 'Kapak Batu', quantity: 1 }] }, { recipeName: 'Potong Papan (Besi)', resultItemId: idOf('Papan Kayu'), resultItemName: 'Papan Kayu', resultQuantity: 2, materials: [{ itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 3 }, { itemId: idOf('Kapak Besi'), itemName: 'Kapak Besi', quantity: 1 }] }, { recipeName: 'Buat Kapak Batu', resultItemId: idOf('Kapak Batu'), resultItemName: 'Kapak Batu', resultQuantity: 1, materials: [{ itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 2 }, { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 1 }] }, { recipeName: 'Buat Tombak Kayu', resultItemId: idOf('Tombak Kayu'), resultItemName: 'Tombak Kayu', resultQuantity: 1, materials: [{ itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 2 }, { itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }] }, { recipeName: 'Buat Alat Pancing', resultItemId: idOf('Alat Pancing Kayu'), resultItemName: 'Alat Pancing Kayu', resultQuantity: 1, materials: [{ itemId: idOf('Bambu'), itemName: 'Bambu', quantity: 2 }, { itemId: idOf('Benang Wol'), itemName: 'Benang Wol', quantity: 1 }] } ], basePrice: 50, priceCurrency: 'silver' }),
    g({ name: 'Penggilingan Desa', description: "Batu giling raksasa yang berputar tiada henti, mengubah hasil panen mentah menjadi makanan pokok bagi penduduk.", rank: 'Common', isCraftingStation: true, constructionTimeHours: 10, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 20 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 15 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 10 }], recipes: [ { recipeName: 'Giling Tepung', resultItemId: idOf('Tepung Terigu'), resultItemName: 'Tepung Terigu', resultQuantity: 2, materials: [{ itemId: idOf('Gandum'), itemName: 'Gandum', quantity: 3 }] }, { recipeName: 'Tumbuk Beras', resultItemId: idOf('Beras Putih'), resultItemName: 'Beras Putih', resultQuantity: 2, materials: [{ itemId: idOf('Padi Mentah'), itemName: 'Padi Mentah', quantity: 3 }] }, { recipeName: 'Giling Jagung', resultItemId: idOf('Tepung Jagung'), resultItemName: 'Tepung Jagung', resultQuantity: 2, materials: [{ itemId: idOf('Jagung Mentah'), itemName: 'Jagung Mentah', quantity: 3 }] }, { recipeName: 'Buat Roti', resultItemId: idOf('Roti Panggang'), resultItemName: 'Roti Panggang', resultQuantity: 2, materials: [{ itemId: idOf('Tepung Terigu'), itemName: 'Tepung Terigu', quantity: 2 }, { itemId: idOf('Kayu Bakar'), itemName: 'Kayu Bakar', quantity: 1 }] }, { recipeName: 'Buat Nasi', resultItemId: idOf('Nasi Putih'), resultItemName: 'Nasi Putih', resultQuantity: 2, materials: [{ itemId: idOf('Beras Putih'), itemName: 'Beras Putih', quantity: 2 }, { itemId: idOf('Air Bersih'), itemName: 'Air Bersih', quantity: 1 }] }, { recipeName: 'Buat Tahu', resultItemId: idOf('Tahu'), resultItemName: 'Tahu', resultQuantity: 2, materials: [{ itemId: idOf('Kedelai Mentah'), itemName: 'Kedelai Mentah', quantity: 3 }] } ], basePrice: 80, priceCurrency: 'silver' }),
    g({ name: 'Tempat Penenunan', description: "Suara alat tenun yang berirama konstan, memintal benang tipis menjadi lembaran kain yang kuat dan hangat.", rank: 'Uncommon', isCraftingStation: true, constructionTimeHours: 16, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 25 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 20 }], recipes: [ { recipeName: 'Tenun Kain Katun', resultItemId: idOf('Kain Katun'), resultItemName: 'Kain Katun', resultQuantity: 1, materials: [{ itemId: idOf('Kapas Mentah'), itemName: 'Kapas Mentah', quantity: 4 }, { itemId: idOf('Alat Tenun Sederhana'), itemName: 'Alat Tenun Sederhana', quantity: 1 }] }, { recipeName: 'Pintal Benang Wol', resultItemId: idOf('Benang Wol'), resultItemName: 'Benang Wol', resultQuantity: 2, materials: [{ itemId: idOf('Wol Mentah'), itemName: 'Wol Mentah', quantity: 3 }] }, { recipeName: 'Tenun Kain Wol', resultItemId: idOf('Kain Wol'), resultItemName: 'Kain Wol', resultQuantity: 1, materials: [{ itemId: idOf('Benang Wol'), itemName: 'Benang Wol', quantity: 4 }] } ], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Tungku Peleburan Dasar', description: "Panas menyengat dari api batu bara. Logam dilebur dalam wadah, memulai peradaban besi dan perunggu.", rank: 'Uncommon', isCraftingStation: true, constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 40 }, { itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 20 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 10 }], recipes: [ { recipeName: 'Lebur Tembaga', resultItemId: idOf('Batangan Tembaga'), resultItemName: 'Batangan Tembaga', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Tembaga'), itemName: 'Bijih Tembaga', quantity: 3 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 1 }] }, { recipeName: 'Lebur Timah', resultItemId: idOf('Batangan Timah'), resultItemName: 'Batangan Timah', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Timah'), itemName: 'Bijih Timah', quantity: 3 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 1 }] }, { recipeName: 'Paduan Perunggu', resultItemId: idOf('Perunggu'), resultItemName: 'Perunggu', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Tembaga'), itemName: 'Batangan Tembaga', quantity: 2 }, { itemId: idOf('Batangan Timah'), itemName: 'Batangan Timah', quantity: 1 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 2 }] }, { recipeName: 'Buat Semen', resultItemId: idOf('Semen Mentah'), resultItemName: 'Semen Mentah', resultQuantity: 2, materials: [{ itemId: idOf('Batu Kapur'), itemName: 'Batu Kapur', quantity: 3 }, { itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 2 }] }, { recipeName: 'Lebur Kaca', resultItemId: idOf('Kaca Kusam'), resultItemName: 'Kaca Kusam', resultQuantity: 1, materials: [{ itemId: idOf('Pasir Putih'), itemName: 'Pasir Putih', quantity: 5 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 2 }] } ], basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Tungku Peleburan Lanjutan', description: "Api pijar yang sanggup melelehkan baja. Di sinilah senjata para pendekar ditempa di tengah keringat.", rank: 'Uncommon', isCraftingStation: true, constructionTimeHours: 36, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 80 }, { itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 40 }, { itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 20 }], recipes: [ { recipeName: 'Lebur Besi', resultItemId: idOf('Batangan Besi'), resultItemName: 'Batangan Besi', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Besi'), itemName: 'Bijih Besi', quantity: 3 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 2 }] }, { recipeName: 'Tempa Baja Keras', resultItemId: idOf('Baja Keras'), resultItemName: 'Baja Keras', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 3 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Lebur Emas', resultItemId: idOf('Batangan Emas'), resultItemName: 'Batangan Emas', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Emas'), itemName: 'Bijih Emas', quantity: 5 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 3 }] }, { recipeName: 'Lebur Perak', resultItemId: idOf('Batangan Perak'), resultItemName: 'Batangan Perak', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Perak'), itemName: 'Bijih Perak', quantity: 4 }, { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 2 }] }, { recipeName: 'Tempa Cangkul Besi', resultItemId: idOf('Cangkul Besi'), resultItemName: 'Cangkul Besi', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Kapak Besi', resultItemId: idOf('Kapak Besi'), resultItemName: 'Kapak Besi', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Beliung Besi', resultItemId: idOf('Beliung Besi'), resultItemName: 'Beliung Besi', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Pisau Jagal', resultItemId: idOf('Pisau Jagal'), resultItemName: 'Pisau Jagal', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 1 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Palu Tempa', resultItemId: idOf('Palu Tempa'), resultItemName: 'Palu Tempa', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2 }, { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 1 }, { itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1 }] }, { recipeName: 'Samak Kulit', resultItemId: idOf('Kulit Samak'), resultItemName: 'Kulit Samak', resultQuantity: 1, materials: [{ itemId: idOf('Kulit Mentah'), itemName: 'Kulit Mentah', quantity: 2 }, { itemId: idOf('Garam Kasar'), itemName: 'Garam Kasar', quantity: 1 }] } ], basePrice: 8, priceCurrency: 'gold' }),
    g({ name: 'Bengkel Tempa Murim', description: "Denting palu di atas paron memecah keheningan. Senjata dan pusaka fana lahir dari tangan pengrajin di sini.", rank: 'Rare', isCraftingStation: true, constructionTimeHours: 48, buildable: true, buildRequirements: [{ itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 20 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 100 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 50 }], recipes: [ { recipeName: 'Tempa Pedang Baja', resultItemId: idOf('Pedang Baja'), resultItemName: 'Pedang Baja', resultQuantity: 1, materials: [{ itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 3 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Tempa Pedang Baja Hitam', resultItemId: idOf('Pedang Baja Hitam'), resultItemName: 'Pedang Baja Hitam', resultQuantity: 1, materials: [{ itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 2 }, { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1 }] }, { recipeName: 'Tempa Pedang Besi Biasa', resultItemId: idOf('Pedang Besi Biasa'), resultItemName: 'Pedang Besi Biasa', resultQuantity: 1, materials: [{ itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 3 }, { itemId: idOf('Palu Tempa'), itemName: 'Palu Tempa', quantity: 1 }] }, { recipeName: 'Buat Jubah Kulit', resultItemId: idOf('Jubah Kulit'), resultItemName: 'Jubah Kulit', resultQuantity: 1, materials: [{ itemId: idOf('Kulit Samak'), itemName: 'Kulit Samak', quantity: 4 }, { itemId: idOf('Jarum Jahit Besi'), itemName: 'Jarum Jahit Besi', quantity: 1 }] } ], basePrice: 25, priceCurrency: 'gold' }),
    g({ name: 'Paviliun Alkimia', description: "Wangi dedaunan roh dan pil suci mengudara. Kawah alkimia mendidihkan harapan bagi para kultivator.", rank: 'Epic', isCraftingStation: true, constructionTimeHours: 72, buildable: true, buildRequirements: [{ itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 15 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 30 }, { itemId: idOf('Genteng Keramik'), itemName: 'Genteng Keramik', quantity: 50 }], recipes: [ { recipeName: 'Suling Pil Pengumpul Qi', resultItemId: idOf('Pil Pengumpul Qi'), resultItemName: 'Pil Pengumpul Qi', resultQuantity: 1, materials: [{ itemId: idOf('Ginseng Darah'), itemName: 'Ginseng Darah', quantity: 2 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 5 }] }, { recipeName: 'Suling Pil Penempa Tulang', resultItemId: idOf('Pil Penempa Tulang'), resultItemName: 'Pil Penempa Tulang', resultQuantity: 1, materials: [{ itemId: idOf('Rumput Pembersih Sumsum'), itemName: 'Rumput Pembersih Sumsum', quantity: 3 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 10 }] }, { recipeName: 'Padatkan Batu Roh', resultItemId: idOf('Batu Roh Utuh'), resultItemName: 'Batu Roh Utuh', resultQuantity: 1, materials: [{ itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 100 }] }, { recipeName: 'Suling Pil Pemulih Berat', resultItemId: idOf('Pil Pemulih Luka Berat'), resultItemName: 'Pil Pemulih Luka Berat', resultQuantity: 1, materials: [{ itemId: idOf('Ginseng Darah'), itemName: 'Ginseng Darah', quantity: 1 }, { itemId: idOf('Madu Murni'), itemName: 'Madu Murni', quantity: 2 }] }, { recipeName: 'Buat Baja Darah', resultItemId: idOf('Baja Darah (Blood Steel)'), resultItemName: 'Baja Darah (Blood Steel)', resultQuantity: 1, materials: [{ itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 1 }, { itemId: idOf('Darah Spirit Beast'), itemName: 'Darah Spirit Beast', quantity: 3 }] }, { recipeName: 'Buat Sutra Ulat Salju', resultItemId: idOf('Sutra Ulat Salju'), resultItemName: 'Sutra Ulat Salju', resultQuantity: 1, materials: [{ itemId: idOf('Kepompong Ulat Salju'), itemName: 'Kepompong Ulat Salju', quantity: 5 }] } ], basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Bengkel Pusaka Tinggi', description: "Api spiritual berkobar, tempat pertemuan antara langit dan logam, menciptakan senjata penakluk langit.", rank: 'Legendary', isCraftingStation: true, constructionTimeHours: 120, buildable: true, buildRequirements: [{ itemId: idOf('Baja Darah (Blood Steel)'), itemName: 'Baja Darah (Blood Steel)', quantity: 20 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 10 }, { itemId: idOf('Kayu Surga (Heavenly Wood)'), itemName: 'Kayu Surga (Heavenly Wood)', quantity: 15 }], recipes: [ { recipeName: 'Tempa Pedang Darah Spirit', resultItemId: idOf('Pedang Darah Spirit'), resultItemName: 'Pedang Darah Spirit', resultQuantity: 1, materials: [{ itemId: idOf('Baja Darah (Blood Steel)'), itemName: 'Baja Darah (Blood Steel)', quantity: 3 }, { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1 }] }, { recipeName: 'Tempa Pedang Star Iron', resultItemId: idOf('Pedang Star Iron'), resultItemName: 'Pedang Star Iron', resultQuantity: 1, materials: [{ itemId: idOf('Pelat Star Iron'), itemName: 'Pelat Star Iron', quantity: 2 }, { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 2 }] }, { recipeName: 'Buat Jimat Giok Roh', resultItemId: idOf('Jimat Giok Roh'), resultItemName: 'Jimat Giok Roh', resultQuantity: 1, materials: [{ itemId: idOf('Bijih Giok Roh'), itemName: 'Bijih Giok Roh', quantity: 5 }, { itemId: idOf('Pecahan Batu Roh'), itemName: 'Pecahan Batu Roh', quantity: 10 }] }, { recipeName: 'Buat Jubah Sutra Salju', resultItemId: idOf('Jubah Sutra Salju'), resultItemName: 'Jubah Sutra Salju', resultQuantity: 1, materials: [{ itemId: idOf('Sutra Ulat Salju'), itemName: 'Sutra Ulat Salju', quantity: 5 }, { itemId: idOf('Jarum Meridian'), itemName: 'Jarum Meridian', quantity: 1 }] } ], basePrice: 10, priceCurrency: 'jade' }),
  ];
  assets.push(...craft);

  // INCOME
  const income = [
    g({ name: 'Tikar Pengemis', description: "Sebuah tikar usang di sudut pasar, mengumpulkan uang receh dari para pejalan yang bersimpati.", rank: 'Common', dailyProfit: 2, profitCurrency: 'silver', constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf('Kain Katun'), itemName: 'Kain Katun', quantity: 2 }], basePrice: 10, priceCurrency: 'silver' }),
    g({ name: 'Warung Desa', description: "Kedai sederhana di persimpangan, menyajikan makanan hangat bagi para pengembara yang letih.", rank: 'Common', dailyProfit: 5, profitCurrency: 'silver', constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 15 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 10 }], basePrice: 60, priceCurrency: 'silver' }),
    g({ name: 'Kuil Leluhur Desa', description: "Dupa harum selalu mengepul di kuil yang sunyi ini, memberikan ketenangan batin bagi warga sekitar.", rank: 'Uncommon', dailyProfit: 15, profitCurrency: 'silver', constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 40 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 25 }], basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Kedai Teh', description: "Suara seduhan teh dan perbincangan lirih. Tempat pertukaran informasi dan peristirahatan sejenak.", rank: 'Uncommon', dailyProfit: 25, profitCurrency: 'silver', constructionTimeHours: 30, buildable: true, buildRequirements: [{ itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 40 }, { itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 30 }, { itemId: idOf('Kain Katun'), itemName: 'Kain Katun', quantity: 10 }], basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Kedai Arak Murim', description: "Suara gelas beradu dan gelak tawa pendekar menggema. Di sinilah persahabatan dan duel mematikan sering dimulai.", rank: 'Rare', dailyProfit: 55, profitCurrency: 'silver', constructionTimeHours: 48, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 150 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 100 }, { itemId: idOf('Genteng Keramik'), itemName: 'Genteng Keramik', quantity: 60 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 8 }], basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Penginapan Kota', description: "Lentera gantung menyambut para tamu di malam hari. Kasur empuk dan dinding kokoh menjanjikan keamanan.", rank: 'Rare', dailyProfit: 70, profitCurrency: 'silver', constructionTimeHours: 60, buildable: true, buildRequirements: [{ itemId: idOf('Batu Bata'), itemName: 'Batu Bata', quantity: 200 }, { itemId: idOf('Papan Kayu'), itemName: 'Papan Kayu', quantity: 120 }, { itemId: idOf('Genteng Keramik'), itemName: 'Genteng Keramik', quantity: 80 }, { itemId: idOf('Kain Wol'), itemName: 'Kain Wol', quantity: 20 }], basePrice: 25, priceCurrency: 'gold' }),
    g({ name: 'Balai Lelang Kota', description: "Gedung mewah tempat harta karun dipertukarkan dengan koin emas. Mata elang para pedagang tak pernah tertidur.", rank: 'Epic', dailyProfit: 4, profitCurrency: 'gold', constructionTimeHours: 96, buildable: true, buildRequirements: [{ itemId: idOf('Semen Mentah'), itemName: 'Semen Mentah', quantity: 80 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 40 }, { itemId: idOf('Kaca Kusam'), itemName: 'Kaca Kusam', quantity: 40 }, { itemId: idOf('Kayu Ulin (Ironwood)'), itemName: 'Kayu Ulin (Ironwood)', quantity: 15 }], basePrice: 80, priceCurrency: 'gold' }),
    g({ name: 'Markas Sekte Luar', description: "Paviliun pelatihan yang megah, dipenuhi oleh murid-murid baru yang bermimpi mencapai keabadian.", rank: 'Epic', dailyProfit: 8, profitCurrency: 'gold', constructionTimeHours: 120, buildable: true, buildRequirements: [{ itemId: idOf('Balok Batu'), itemName: 'Balok Batu', quantity: 150 }, { itemId: idOf('Baja Keras'), itemName: 'Baja Keras', quantity: 60 }, { itemId: idOf('Sutra Ulat Salju'), itemName: 'Sutra Ulat Salju', quantity: 10 }, { itemId: idOf('Kayu Persik Berdarah'), itemName: 'Kayu Persik Berdarah', quantity: 20 }], basePrice: 150, priceCurrency: 'gold' }),
    g({ name: 'Paviliun Harta Surgawi', description: "Bangunan megah di atas puncak gunung, tempat penyimpanan artefak kuno yang memancarkan energi dahsyat.", rank: 'Legendary', dailyProfit: 1, profitCurrency: 'jade', constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 50 }, { itemId: idOf('Kayu Surga (Heavenly Wood)'), itemName: 'Kayu Surga (Heavenly Wood)', quantity: 20 }, { itemId: idOf('Kristal Roh Ilahi'), itemName: 'Kristal Roh Ilahi', quantity: 8 }, { itemId: idOf('Batu Roh Utuh'), itemName: 'Batu Roh Utuh', quantity: 3 }], basePrice: 15, priceCurrency: 'jade' }),
    g({ name: 'Istana Terapung', description: "Kastil yang melayang di antara lautan awan, manifestasi dari kekuatan absolut yang melampaui dunia fana.", rank: 'Legendary', dailyProfit: 1, profitCurrency: 'jade', constructionTimeHours: 168, buildable: true, buildRequirements: [{ itemId: idOf('Jimat Giok Roh'), itemName: 'Jimat Giok Roh', quantity: 30 }, { itemId: idOf('Baja Darah (Blood Steel)'), itemName: 'Baja Darah (Blood Steel)', quantity: 30 }, { itemId: idOf('Batu Roh Utuh'), itemName: 'Batu Roh Utuh', quantity: 5 }], basePrice: 20, priceCurrency: 'jade' }),
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
    { name: "Toko Kelontong", description: "12 Silver/hari.", profit: 12, curr: "silver", rank: "Common", time: 12, price: 80, pcurr: "silver", mats: [["Papan Kayu", 20], ["Batu Bata", 15]] },
    { name: "Bengkel Desa", description: "20 Silver/hari.", profit: 20, curr: "silver", rank: "Uncommon", time: 20, price: 2, pcurr: "gold", mats: [["Papan Kayu", 30], ["Batu Bata", 25], ["Batangan Besi", 5]] },
    { name: "Rumah Bordir", description: "30 Silver/hari.", profit: 30, curr: "silver", rank: "Uncommon", time: 24, price: 3, pcurr: "gold", mats: [["Papan Kayu", 25], ["Kain Katun", 20]] },
    { name: "Apotek Desa", description: "40 Silver/hari.", profit: 40, curr: "silver", rank: "Uncommon", time: 30, price: 4, pcurr: "gold", mats: [["Batu Bata", 40], ["Papan Kayu", 30], ["Kaca Kusam", 10]] },
    { name: "Dojo Murim", description: "2 Gold/hari.", profit: 2, curr: "gold", rank: "Rare", time: 48, price: 20, pcurr: "gold", mats: [["Baja Keras", 15], ["Batu Bata", 100], ["Papan Kayu", 60]] },
    { name: "Toko Senjata", description: "3 Gold/hari.", profit: 3, curr: "gold", rank: "Rare", time: 60, price: 30, pcurr: "gold", mats: [["Baja Keras", 25], ["Batu Bata", 120], ["Papan Kayu", 50]] },
    { name: "Paviliun Teh Mewah", description: "5 Gold/hari.", profit: 5, curr: "gold", rank: "Epic", time: 80, price: 60, pcurr: "gold", mats: [["Kayu Ulin (Ironwood)", 20], ["Sutra Ulat Salju", 5], ["Batu Bata", 150]] },
    { name: "Balai Perdagangan", description: "6 Gold/hari.", profit: 6, curr: "gold", rank: "Epic", time: 100, price: 100, pcurr: "gold", mats: [["Baja Keras", 40], ["Semen Mentah", 50], ["Kaca Kusam", 30]] },
    { name: "Kuil Kultivasi", description: "10 Gold/hari.", profit: 10, curr: "gold", rank: "Epic", time: 120, price: 120, pcurr: "gold", mats: [["Baja Hitam Mistis", 20], ["Pecahan Batu Roh", 30], ["Kayu Persik Berdarah", 15]] },
    { name: "Menara Array", description: "1 Jade/hari.", profit: 1, curr: "jade", rank: "Legendary", time: 168, price: 12, pcurr: "jade", mats: [["Kristal Roh Ilahi", 10], ["Jimat Giok Roh", 20], ["Batu Roh Utuh", 5]] },
  ];

  moreIncome.forEach(inc => {
    try {

      let factor = 1;
      if (inc.rank === 'Mythical') factor = 15;
      else if (inc.rank === 'Legendary') factor = 10;
      else if (inc.rank === 'Epic') factor = 5;
      else if (inc.rank === 'Rare') factor = 3;
      else if (inc.rank === 'Uncommon') factor = 2;
      else factor = 1.5;
      const reqs = inc.mats.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: Math.ceil(q * factor) }));

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
      description: "Memasak makanan olahan.",
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
      description: "Fermentasi minuman.",
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

      let factor = 1;
      if (c.rank === 'Mythical') factor = 15;
      else if (c.rank === 'Legendary') factor = 10;
      else if (c.rank === 'Epic') factor = 5;
      else if (c.rank === 'Rare') factor = 3;
      else if (c.rank === 'Uncommon') factor = 2;
      else factor = 1.5;
      const reqs = c.reqs.map(([n, q]) => ({ itemId: idOf(n), itemName: n, quantity: Math.ceil(q * factor) }));

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
          { itemId: idOf("Batu Roh Utuh"), itemName: "Batu Roh Utuh", quantity: 30 },
        ],
        basePrice: p.price,
        priceCurrency: p.curr,
      }));
    } catch(e) {}
  });

  // Unique income / prestige buildings (still max 1 jade)
  const prestige = [
    { name: "Paviliun Empat Dewa", description: "Pusat dari energi empat penjuru langit. Kuil ini diberkati langsung oleh dewa-dewa primordial.", profit: 1, curr: "jade", rank: "Mythical", time: 240, price: 25, pcurr: "jade",
      mats: [["Sisik Qinglong",1],["Bulu Zhuque",1],["Cakar Baihu",1],["Cangkang Xuanwu",1],["Inti Primordial",1]] },
    { name: "Menara Observasi Langit", description: "Menara tinggi penusuk langit, mengintip rahasia bintang dan pergerakan nasib alam semesta.", profit: 12, curr: "gold", rank: "Legendary", time: 168, price: 10, pcurr: "jade",
      mats: [["Kristal Roh Ilahi",15],["Kayu Surga (Heavenly Wood)",20],["Baja Hitam Mistis",30]] },
    { name: "Perpustakaan Ilmu Terlarang", description: "Gulungan kitab kuno dan gulungan jade berjejer rapi, menyembunyikan ilmu hitam dan putih masa lalu.", profit: 8, curr: "gold", rank: "Epic", time: 120, price: 80, pcurr: "gold",
      mats: [["Papan Kayu",100],["Batu Bata",150],["Sutra Ulat Salju",10],["Pecahan Batu Roh",20]] },
  ];
  prestige.forEach(pr => {
    try {

      let factor = 1;
      if (pr.rank === 'Mythical') factor = 15;
      else if (pr.rank === 'Legendary') factor = 10;
      else if (pr.rank === 'Epic') factor = 5;
      else if (pr.rank === 'Rare') factor = 3;
      else if (pr.rank === 'Uncommon') factor = 2;
      else factor = 1.5;
      const reqs = pr.mats.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: Math.ceil(q * factor) }));

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
      description: "Memproduksi pelat & komponen baja industri.",
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
      description: "Merakit inti mesin uap & komponen.",
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
      description: "Menghasilkan katalis, asam, dan bahan kimia.",
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

      let factor = 1;
      if (c.rank === 'Mythical') factor = 15;
      else if (c.rank === 'Legendary') factor = 10;
      else if (c.rank === 'Epic') factor = 5;
      else if (c.rank === 'Rare') factor = 3;
      else if (c.rank === 'Uncommon') factor = 2;
      else factor = 1.5;
      const reqs = c.reqs.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: Math.ceil(q * factor) }));

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
      description: "Memproduksi chip & modul formasi modern.",
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
      description: "Merakit senjata & armor era modern.",
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

      let factor = 1;
      if (c.rank === 'Mythical') factor = 15;
      else if (c.rank === 'Legendary') factor = 10;
      else if (c.rank === 'Epic') factor = 5;
      else if (c.rank === 'Rare') factor = 3;
      else if (c.rank === 'Uncommon') factor = 2;
      else factor = 1.5;
      const reqs = c.reqs.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: Math.ceil(q * factor) }));

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
    { name: "Pabrik Tekstil", description: "Barisan mesin jahit otomatis, menenun ratusan kain dalam sehari di bawah deru yang memekakkan telinga.", profit: 3, curr: "gold", rank: "Rare", time: 60, price: 25, pcurr: "gold",
      mats: [["Batu Bata", 100], ["Papan Kayu", 60], ["Roda Gigi Besi", 10], ["Kain Katun", 20]] },
    { name: "Pabrik Senjata Ringan", description: "Gudang senjata industri yang mengalirkan alat pembunuh dalam jumlah masif ke tangan prajurit.", profit: 5, curr: "gold", rank: "Epic", time: 90, price: 50, pcurr: "gold",
      mats: [["Pelat Baja Tebal", 25], ["Baja Keras", 30], ["Roda Gigi Baja", 15]] },
    { name: "Pembangkit Uap", description: "Raksasa pemakan batu bara yang memompa tenaga ke seluruh penjuru kota lewat pipa-pipa hitam tebal.", profit: 6, curr: "gold", rank: "Epic", time: 100, price: 60, pcurr: "gold",
      mats: [["Inti Mesin Uap", 5], ["Pelat Baja Tebal", 30], ["Batu Bara Berkualitas", 50]] },
    { name: "Pusat Data Spirit", description: "Monolit kristal yang berdenyut, memproses dan menyimpan seluruh aliran data dari jaringan Qi dunia.", profit: 1, curr: "jade", rank: "Legendary", time: 168, price: 15, pcurr: "jade",
      mats: [["Chip Qi Lanjutan", 10], ["Baterai Spirit", 20], ["Kabel Optik Qi", 10], ["Kristal Roh Ilahi", 8]] },
    { name: "Pabrik Reaktor Spirit", description: "Reaktor raksasa yang menyerap aura primordial, menghasilkan energi tanpa batas seperti bintang jatuh.", profit: 1, curr: "jade", rank: "Mythical", time: 240, price: 30, pcurr: "jade",
      mats: [["Inti Reaktor Spirit", 1], ["Modul Formasi Portabel", 5], ["Pelat Serat Karbon", 20], ["Chip Qi Lanjutan", 15]] },
  ];
  eraIncome.forEach(inc => {
    try {

      let factor = 1;
      if (inc.rank === 'Mythical') factor = 15;
      else if (inc.rank === 'Legendary') factor = 10;
      else if (inc.rank === 'Epic') factor = 5;
      else if (inc.rank === 'Rare') factor = 3;
      else if (inc.rank === 'Uncommon') factor = 2;
      else factor = 1.5;
      const reqs = inc.mats.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: Math.ceil(q * factor) }));

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


  // =========================================================================
  // ASET KURASI PROFESIONAL (nama bagus · rantai jelas · harga adil)
  // Setiap node punya peran di rantai: raw → olah → craft / jual
  // =========================================================================
  const curatedNodes = [
    // --- KAYU: Kapak → Kayu → Papan (bengkel) ---
    { name: "Hutan Desa", out: "Kayu Mentah", q: 2, inputs: [["Kapak Batu", 1]], rank: "Common", time: 3, price: 20, curr: "silver",
      build: [["Kapak Batu", 2]], description: "IN: Kapak Batu → OUT: 2 Kayu Mentah/jam → olah jadi Papan di Bengkel Kayu." },
    { name: "Hutan Rimba Dalam", out: "Kayu Mentah", q: 3, inputs: [["Kapak Besi", 1]], rank: "Uncommon", time: 10, price: 1, curr: "gold",
      build: [["Kapak Besi", 2], ["Papan Kayu", 12]], description: "IN: Kapak Besi → OUT: 3 Kayu Mentah/jam. Upgrade Hutan Desa." },
    { name: "Hutan Pinus Kabut", out: "Kayu Pinus", q: 2, inputs: [["Kapak Besi", 1]], rank: "Uncommon", time: 12, price: 2, curr: "gold",
      build: [["Kapak Besi", 2], ["Papan Kayu", 15]], description: "IN: Kapak Besi → OUT: Kayu Pinus → papan premium / bangunan menengah." },
    { name: "Hutan Ulin Leluhur", out: "Kayu Ulin (Ironwood)", q: 1, inputs: [["Kapak Besi", 1]], rank: "Rare", time: 30, price: 8, curr: "gold",
      build: [["Kapak Besi", 3], ["Baja Keras", 5], ["Papan Kayu", 20]], description: "IN: Kapak Besi → OUT: Kayu Ulin → bangunan epic & senjata kayu mistis." },

    // --- BATU/TAMBANG: Beliung → bijih → lebur di Tungku ---
    { name: "Tebing Batu Desa", out: "Batu Kasar", q: 2, inputs: [["Batu Tajam", 1]], rank: "Common", time: 2, price: 12, curr: "silver",
      build: [["Batu Tajam", 1]], description: "IN: Batu Tajam → OUT: Batu Kasar → pahat Balok Batu di bengkel." },
    { name: "Lahan Tanah Liat Sungai", out: "Tanah Liat", q: 2, inputs: [["Batu Tajam", 1]], rank: "Common", time: 2, price: 12, curr: "silver",
      build: [["Batu Tajam", 1]], description: "IN: Batu Tajam → OUT: Tanah Liat → bakar Batu Bata di tungku." },
    { name: "Tambang Batu Bara Desa", out: "Batu Bara", q: 2, inputs: [["Beliung Besi", 1]], rank: "Common", time: 10, price: 1, curr: "gold",
      build: [["Beliung Besi", 1], ["Papan Kayu", 12]], description: "IN: Beliung Besi → OUT: Batu Bara → bahan bakar tungku & mesin." },
    { name: "Tambang Tembaga Desa", out: "Bijih Tembaga", q: 2, inputs: [["Beliung Besi", 1]], rank: "Common", time: 10, price: 1, curr: "gold",
      build: [["Beliung Besi", 1], ["Balok Batu", 12]], description: "IN: Beliung → OUT: Bijih Tembaga → Batangan → Perunggu." },
    { name: "Tambang Besi Lereng", out: "Bijih Besi", q: 1, inputs: [["Beliung Besi", 1]], rank: "Uncommon", time: 16, price: 3, curr: "gold",
      build: [["Beliung Besi", 2], ["Balok Batu", 20]], description: "IN: Beliung → OUT: Bijih Besi → Batangan Besi → tool & baja." },
    { name: "Tambang Emas Terlarang", out: "Bijih Emas", q: 1, inputs: [["Beliung Baja Hitam", 1]], rank: "Rare", time: 48, price: 15, curr: "gold",
      build: [["Beliung Baja Hitam", 2], ["Baja Keras", 15]], description: "IN: Beliung Baja Hitam → OUT: Bijih Emas → Batangan Emas (sink luxury)." },

    // --- PERTANIAN: Bibit → panen → giling/masak ---
    { name: "Ladang Gandum Desa", out: "Gandum", q: 2, inputs: [["Bibit Gandum", 1]], rank: "Common", time: 6, price: 55, curr: "silver",
      build: [["Cangkul Besi", 1], ["Bibit Gandum", 5]], description: "IN: Bibit Gandum → OUT: Gandum → Tepung (Kincir) → Roti (Dapur)." },
    { name: "Sawah Padi Desa", out: "Padi Mentah", q: 2, inputs: [["Bibit Padi", 1]], rank: "Common", time: 6, price: 55, curr: "silver",
      build: [["Cangkul Besi", 1], ["Bibit Padi", 5]], description: "IN: Bibit Padi → OUT: Padi → Beras → Nasi / Sake." },
    { name: "Kebun Kapas Desa", out: "Kapas Mentah", q: 2, inputs: [["Bibit Kapas", 1]], rank: "Common", time: 6, price: 60, curr: "silver",
      build: [["Cangkul Besi", 1], ["Bibit Kapas", 5]], description: "IN: Bibit Kapas → OUT: Kapas → Benang → Kain Katun (tenun)." },
    { name: "Kebun Anggur Lereng", out: "Anggur Segar", q: 2, inputs: [["Bibit Anggur", 1]], rank: "Uncommon", time: 12, price: 2, curr: "gold",
      build: [["Cangkul Besi", 1], ["Bibit Anggur", 5], ["Papan Kayu", 10]], description: "IN: Bibit Anggur → OUT: Anggur → Wine (fermentasi)." },

    // --- TERNAK & LAUT ---
    { name: "Kandang Ayam Desa", out: "Telur Mentah", q: 2, inputs: [["Pakan Ternak", 1]], rank: "Common", time: 8, price: 70, curr: "silver",
      build: [["Papan Kayu", 15], ["Pakan Ternak", 5]], description: "IN: Pakan Ternak → OUT: Telur → masak / jual player shop." },
    { name: "Padang Penggembalaan", out: "Susu Sapi", q: 1, inputs: [["Pakan Ternak", 1]], rank: "Uncommon", time: 14, price: 2, curr: "gold",
      build: [["Papan Kayu", 25], ["Pakan Ternak", 10]], description: "IN: Pakan → OUT: Susu → Keju (fermentasi)." },
    { name: "Dermaga Nelayan Desa", out: "Ikan Air Tawar", q: 2, inputs: [["Alat Pancing Kayu", 1]], rank: "Common", time: 8, price: 60, curr: "silver",
      build: [["Papan Kayu", 12], ["Alat Pancing Kayu", 2]], description: "IN: Alat Pancing → OUT: Ikan → masak / Ikan Asin." },

    // --- BURUAN ---
    { name: "Hutan Buruan Desa", out: "Daging Mentah", q: 1, inputs: [["Tombak Kayu", 1]], rank: "Common", time: 4, price: 25, curr: "silver",
      build: [["Tombak Kayu", 2]], description: "IN: Tombak Kayu → OUT: Daging Mentah → Daging Bakar / Kulit." },

    // --- HERBAL MURIM ---
    { name: "Kebun Ginseng Darah", out: "Ginseng Darah", q: 1, inputs: [["Bibit Ginseng Darah", 1]], rank: "Rare", time: 40, price: 10, curr: "gold",
      build: [["Cangkul Giok", 1], ["Bibit Ginseng Darah", 3], ["Papan Kayu", 20]], description: "IN: Bibit Ginseng → OUT: Ginseng Darah → Pil Pengumpul Qi (Kawah Alkimia)." },
    { name: "Rawa Rumput Sumsum", out: "Rumput Pembersih Sumsum", q: 1, inputs: [["Bibit Rumput Sumsum", 1]], rank: "Epic", time: 56, price: 25, curr: "gold",
      build: [["Cangkul Giok", 1], ["Pecahan Batu Roh", 10]], description: "IN: Bibit Sumsum → OUT: Rumput Sumsum → Pil Penempa Tulang." },
  ];

  curatedNodes.forEach(n => {
    try {
      const inputs = (n.inputs || []).map(([name, q]) => makeInput(name, q));
      const builds = (n.build || []).map(([name, q]) => ({ itemId: idOf(name), itemName: name, quantity: q, durabilityHours: 1 }));
      const inputDesc = inputs.map(i => i.itemName).join(', ');
      const desc = n.desc + (inputs.length ? ` | Tool/input: ${inputDesc}` : '');
      assets.push(g({
        name: n.name,
        description: desc,
        rank: n.rank,
        workerOutputItemId: idOf(n.out),
        workerOutputItemName: n.out,
        workerOutputQuantity: n.q,
        workerInputMaterials: inputs,
        constructionTimeHours: n.time,
        buildable: true,
        buildRequirements: builds,
        basePrice: n.price,
        priceCurrency: n.curr,
      }));
    } catch (e) { /* item belum ada */ }
  });

  // Income bernama baik (bukan Warung Timur dll)
  const curatedIncome = [
    // ROI: bangun sebentar, profit kecil, balik modal terasa (bukan instan, bukan siksa)
    { name: "Tikar Pengemis", description: "Sebuah tikar usang di sudut pasar, mengumpulkan uang receh dari para pejalan yang bersimpati.", profit: 8, curr: "silver", rank: "Common", time: 2, price: 25, pcurr: "silver", mats: [["Kain Katun", 2]] },
    { name: "Warung Nasi Kampung", description: "Wanginya nasi panas mengepul dari kedai sederhana, menyatukan penduduk desa di jam istirahat.", profit: 18, curr: "silver", rank: "Common", time: 10, price: 90, pcurr: "silver", mats: [["Papan Kayu", 18], ["Batu Bata", 12]] },
    { name: "Kedai Teh Pinggir Jalan", description: "Persinggahan bagi kereta kuda dan musafir. Teh hangatnya merilekskan otot-otot yang tegang.", profit: 30, curr: "silver", rank: "Uncommon", time: 20, price: 2, pcurr: "gold", mats: [["Papan Kayu", 28], ["Batu Bata", 22], ["Kain Katun", 5]] },
    { name: "Kuil Leluhur Desa", description: "Dupa harum selalu mengepul di kuil yang sunyi ini, memberikan ketenangan batin bagi warga sekitar.", profit: 28, curr: "silver", rank: "Uncommon", time: 28, price: 3, pcurr: "gold", mats: [["Batu Bata", 55], ["Papan Kayu", 35]] },
    { name: "Kedai Arak Murim", description: "Suara gelas beradu dan gelak tawa pendekar menggema. Di sinilah persahabatan dan duel mematikan sering dimulai.", profit: 55, curr: "silver", rank: "Rare", time: 56, price: 18, pcurr: "gold", mats: [["Batu Bata", 100], ["Papan Kayu", 80], ["Baja Keras", 10]] },
    { name: "Balai Lelang Kota", description: "Gedung mewah tempat harta karun dipertukarkan dengan koin emas. Mata elang para pedagang tak pernah tertidur.", profit: 90, curr: "silver", rank: "Epic", time: 100, price: 45, pcurr: "gold", mats: [["Semen Mentah", 80], ["Baja Keras", 40], ["Kaca Kusam", 30]] },
    { name: "Paviliun Harta Surgawi", description: "Bangunan megah di atas puncak gunung, tempat penyimpanan artefak kuno yang memancarkan energi dahsyat.", profit: 1, curr: "jade", rank: "Legendary", time: 168, price: 18, pcurr: "jade", mats: [["Baja Hitam Mistis", 40], ["Kristal Roh Ilahi", 8], ["Batu Roh Utuh", 3]] },
  ];
  curatedIncome.forEach(inc => {
    try {

      let factor = 1;
      if (inc.rank === 'Mythical') factor = 15;
      else if (inc.rank === 'Legendary') factor = 10;
      else if (inc.rank === 'Epic') factor = 5;
      else if (inc.rank === 'Rare') factor = 3;
      else if (inc.rank === 'Uncommon') factor = 2;
      else factor = 1.5;
      const reqs = inc.mats.map(([n,q]) => ({ itemId: idOf(n), itemName: n, quantity: Math.ceil(q * factor) }));

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



  // =========================================================================
  // SAMBUNGKAN ITEM YATIM (Legendary / Mythical) KE RANTAI EKONOMI
  // Produksi material tinggi + station craft yang mengonsumsi & menghasilkan gear/pil
  // =========================================================================

  // --- Node produksi material tinggi (butuh input mahal = sink) ---
  const lateNodes = [
    { name: "Kawah Meteor Jatuh", out: "Inti Meteor", q: 1, inputs: [["Pil Nutrisi Tinggi", 1]], rank: "Legendary", time: 120, price: 10, curr: "jade",
      build: [["Baja Hitam Mistis", 20], ["Kristal Roh Ilahi", 5]], description: "IN: Pil Nutrisi Tinggi → OUT: Inti Meteor → tempa senjata legendaris." },
    { name: "Ladang Debu Bintang", out: "Debu Bintang", q: 1, inputs: [["Pil Nutrisi Tinggi", 1]], rank: "Legendary", time: 120, price: 10, curr: "jade",
      build: [["Kristal Roh Ilahi", 8], ["Pecahan Batu Roh", 30]], description: "IN: Pil Nutrisi Tinggi → OUT: Debu Bintang → jimat & array." },
    { name: "Retakan Dimensi Kecil", out: "Serpihan Dimensi", q: 1, inputs: [["Pil Nutrisi Tinggi", 1]], rank: "Mythical", time: 168, price: 3, curr: "spirit",
      build: [["Inti Meteor", 3], ["Debu Bintang", 3], ["Batu Roh Utuh", 5]], description: "IN: Pil Nutrisi Tinggi → OUT: Serpihan Dimensi → Segel Dimensi / gear myth." },
    { name: "Hutan Tulang Naga", out: "Kayu Dragonbone", q: 1, inputs: [["Kapak Petir Surgawi", 1]], rank: "Legendary", time: 144, price: 12, curr: "jade",
      build: [["Kapak Petir Surgawi", 1], ["Kayu Surga (Heavenly Wood)", 10]], description: "IN: Kapak Petir → OUT: Kayu Dragonbone → gagang pusaka." },
    { name: "Sarang Phoenix Muda", out: "Hati Phoenix", q: 1, inputs: [["Pil Nutrisi Tinggi", 1]], rank: "Legendary", time: 144, price: 15, curr: "jade",
      build: [["Bulu Zhuque", 1], ["Kristal Roh Ilahi", 5]], description: "IN: Pil Nutrisi Tinggi → OUT: Hati Phoenix → Pil Immortal / temper." },
    { name: "Kolam Jiwa Sunyi", out: "Benang Jiwa", q: 1, inputs: [["Pil Jiwa Stabil", 1]], rank: "Legendary", time: 120, price: 12, curr: "jade",
      build: [["Sutra Ulat Salju", 10], ["Pecahan Batu Roh", 20]], description: "IN: Pil Jiwa Stabil → OUT: Benang Jiwa → jubah & jimat jiwa." },
  ];
  lateNodes.forEach(n => {
    try {
      const inputs = (n.inputs || []).map(([name, q]) => makeInput(name, q));
      const builds = (n.build || []).map(([name, q]) => ({ itemId: idOf(name), itemName: name, quantity: q, durabilityHours: 1 }));
      const inputDesc = inputs.map(i => i.itemName).join(', ');
      assets.push(g({
        name: n.name,
        description: n.desc + (inputs.length ? ` | Input: ${inputDesc}` : ''),
        rank: n.rank,
        workerOutputItemId: idOf(n.out),
        workerOutputItemName: n.out,
        workerOutputQuantity: n.q,
        workerInputMaterials: inputs,
        constructionTimeHours: n.time,
        buildable: true,
        buildRequirements: builds,
        basePrice: n.price,
        priceCurrency: n.curr,
      }));
    } catch (e) {}
  });


  try {
    const herbNodes = [
      { name: "Kebun Daun Longevity", out: "Daun Longevity", q: 1, inputs: [["Pil Nutrisi Pekerja", 1]], rank: "Epic", time: 72, price: 30, curr: "gold",
        build: [["Cangkul Giok", 1], ["Pecahan Batu Roh", 15]], description: "IN: Pil Nutrisi Pekerja → OUT: Daun Longevity → pil/jimat." },
      { name: "Kawah Bunga Api Surgawi", out: "Bunga Api Surgawi", q: 1, inputs: [["Pil Nutrisi Pekerja", 1]], rank: "Epic", time: 72, price: 30, curr: "gold",
        build: [["Cangkul Giok", 1], ["Batu Meteor Api", 5]], description: "IN: Pil Nutrisi → OUT: Bunga Api → Jimat Ledakan Api." },
      { name: "Rawa Es Abadi", out: "Rumput Es Abadi", q: 1, inputs: [["Pil Nutrisi Pekerja", 1]], rank: "Epic", time: 72, price: 30, curr: "gold",
        build: [["Cangkul Giok", 1], ["Batangan Besi Dingin", 3]], description: "IN: Pil Nutrisi → OUT: Rumput Es → Pil Pembersih Meridian." },
      { name: "Kebun Teratai Langit", out: "Teratai Roh Langit", q: 1, inputs: [["Bibit Teratai Roh", 1]], rank: "Legendary", time: 120, price: 8, curr: "jade",
        build: [["Bibit Teratai Roh", 3], ["Kristal Roh Ilahi", 3]], description: "IN: Bibit Teratai → OUT: Teratai Roh Langit → Pil Loncatan Realm." },
      { name: "Lereng Akar Naga", out: "Akar Naga", q: 1, inputs: [["Bibit Akar Naga", 1]], rank: "Legendary", time: 144, price: 10, curr: "jade",
        build: [["Bibit Akar Naga", 2], ["Batu Roh Utuh", 2]], description: "IN: Bibit Akar Naga → OUT: Akar Naga → craft lanjutan." },
    ];
    herbNodes.forEach(n => {
      try {
        assets.push(g({
          name: n.name,
          description: n.desc,
          rank: n.rank,
          workerOutputItemId: idOf(n.out),
          workerOutputItemName: n.out,
          workerOutputQuantity: n.q,
          workerInputMaterials: n.inputs.map(([a,b])=>({itemId:idOf(a),itemName:a,quantity:b})),
          constructionTimeHours: n.time,
          buildable: true,
          buildRequirements: n.build.map(([a,b])=>({itemId:idOf(a),itemName:a,quantity:b})),
          basePrice: n.price,
          priceCurrency: n.curr,
        }));
      } catch(e) {}
    });
  } catch(e) {}

  // --- Station: menyambungkan material → pil / senjata / artifact ---
  const wireRecipes = [];
  const tryRecipe = (rn, res, rq, mats) => {
    try {
      wireRecipes.push({
        recipeName: rn,
        resultItemId: idOf(res),
        resultItemName: res,
        resultQuantity: rq,
        materials: mats.map(([n, q]) => ({ itemId: idOf(n), itemName: n, quantity: q })),
      });
    } catch (e) {}
  };

  // Pil (sink herbal + batu roh)
  tryRecipe("Suling Pil Nutrisi Tinggi", "Pil Nutrisi Tinggi", 1, [["Pil Nutrisi Pekerja", 2], ["Ginseng Darah", 2], ["Pecahan Batu Roh", 5]]);
  tryRecipe("Suling Pil Fondasi Sempurna", "Pil Fondasi Sempurna", 1, [["Pil Penempa Tulang", 1], ["Rumput Pembersih Sumsum", 2], ["Batu Roh Utuh", 1]]);
  tryRecipe("Suling Pil Pencerahan Jiwa", "Pil Pencerahan Jiwa", 1, [["Pil Pengumpul Qi", 2], ["Benang Jiwa", 1], ["Kristal Roh Ilahi", 1]]);
  tryRecipe("Suling Pil Jiwa Stabil", "Pil Jiwa Stabil", 1, [["Pil Pengumpul Qi", 1], ["Pecahan Batu Roh", 10], ["Debu Bintang", 1]]);
  tryRecipe("Suling Pil Loncatan Realm", "Pil Loncatan Realm", 1, [["Pil Fondasi Sempurna", 1], ["Teratai Roh Langit", 1], ["Batu Roh Utuh", 2]]);
  tryRecipe("Suling Pil Immortal Draft", "Pil Immortal Draft", 1, [["Pil Loncatan Realm", 1], ["Hati Phoenix", 1], ["Inti Primordial", 1]]);
  tryRecipe("Suling Pil Keabadian Semu", "Pil Keabadian Semu", 1, [["Pil Immortal Draft", 1], ["Serpihan Dimensi", 1], ["Inti Bumi", 1]]);
  tryRecipe("Suling Pil Ascension", "Pil Ascension", 1, [["Pil Keabadian Semu", 1], ["Inti Primordial", 1], ["Serpihan Dimensi", 2]]);

  // Senjata / armor (sink metal + myth mats)
  tryRecipe("Tempa Pedang Langit Putih", "Pedang Langit Putih", 1, [["Baja Darah (Blood Steel)", 3], ["Inti Meteor", 1], ["Palu Formasi Array", 1]]);
  tryRecipe("Tempa Tombak Naga Hitam", "Tombak Naga Hitam", 1, [["Baja Hitam Mistis", 3], ["Sisik Naga Muda", 1], ["Kayu Dragonbone", 1]]);
  tryRecipe("Tempa Pedang Jiwa", "Pedang Jiwa", 1, [["Batangan Besi Dingin", 2], ["Benang Jiwa", 2], ["Palu Formasi Array", 1]]);
  tryRecipe("Tempa Pedang Primordial", "Pedang Primordial", 1, [["Pedang Langit Putih", 1], ["Inti Primordial", 1], ["Serpihan Dimensi", 1]]);
  tryRecipe("Jahit Jubah Bintang", "Jubah Bintang", 1, [["Sutra Ulat Salju", 5], ["Debu Bintang", 2], ["Benang Jiwa", 1]]);
  tryRecipe("Jahit Jubah Immortal", "Jubah Immortal", 1, [["Jubah Bintang", 1], ["Hati Phoenix", 1], ["Serpihan Dimensi", 1]]);
  tryRecipe("Ukir Mahkota Giok Roh", "Mahkota Giok Roh", 1, [["Jimat Giok Roh", 3], ["Kristal Roh Ilahi", 2], ["Debu Bintang", 1]]);
  tryRecipe("Rakit Jimat Kebangkitan", "Jimat Kebangkitan", 1, [["Jimat Giok Roh", 2], ["Hati Phoenix", 1], ["Batu Roh Utuh", 1]]);
  tryRecipe("Rakit Segel Dimensi", "Segel Dimensi", 1, [["Serpihan Dimensi", 2], ["Modul Formasi Portabel", 1], ["Inti Meteor", 1]]);
  tryRecipe("Rakit Lentera Jiwa Abadi", "Lentera Jiwa Abadi", 1, [["Benang Jiwa", 2], ["Kristal Roh Ilahi", 2], ["Debu Bintang", 2]]);
  tryRecipe("Rakit Array Flag Lanjutan", "Array Flag Lanjutan", 1, [["Jimat Giok Roh", 4], ["Debu Bintang", 1], ["Kabel Optik Qi", 1]]);
  tryRecipe("Tempa Armor Serat Karbon", "Armor Serat Karbon", 1, [["Pelat Serat Karbon", 4], ["Alloy Modern", 2], ["Karet Olahan", 2]]);
  tryRecipe("Rakit Komunikasi Spirit", "Komunikasi Spirit", 1, [["Chip Qi Lanjutan", 1], ["Baterai Spirit", 2], ["Sensor Aura", 1]]);

  // Material paduan myth (supaya Inti Bumi dll punya jalan masuk)
  
  tryRecipe("Suling Air Mata Phoenix", "Air Mata Phoenix", 1, [["Hati Phoenix", 1], ["Pil Nutrisi Tinggi", 1]]);
  tryRecipe("Tempa Tanduk Qilin", "Tanduk Qilin", 1, [["Kristal Roh Ilahi", 2], ["Debu Bintang", 1], ["Batu Roh Utuh", 1]]);
  tryRecipe("Tempa Tombak Naga", "Tombak Naga", 1, [["Tombak Naga Hitam", 1], ["Sisik Naga Muda", 1]]);
  tryRecipe("Rakit Printer Formasi", "Printer Formasi", 1, [["Modul Formasi Portabel", 1], ["Chip Qi Lanjutan", 1], ["Lensa Presisi", 2]]);

  
  // --- Epic+ yatim: disambungkan agar berguna ---
  tryRecipe("Tenun Kepompong Salju", "Sutra Ulat Salju", 1, [["Kepompong Ulat Salju", 3]]);
  tryRecipe("Lebur Batangan Mithril", "Batangan Mithril", 1, [["Bijih Besi Dingin (Cold Iron)", 2], ["Batu Meteor Api", 1], ["Batu Bara Berkualitas", 2]]);
  tryRecipe("Tempa Pelat Mithril", "Pelat Mithril", 1, [["Batangan Mithril", 2], ["Palu Formasi Array", 1]]);
  tryRecipe("Tempa Pelat Star Iron", "Pelat Star Iron", 1, [["Inti Meteor", 1], ["Baja Hitam Mistis", 2], ["Palu Formasi Array", 1]]);
  tryRecipe("Tempa Pedang Besi Dingin", "Pedang Besi Dingin", 1, [["Batangan Besi Dingin", 2], ["Palu Formasi Array", 1]]);
  tryRecipe("Tempa Pedang Mithril", "Pedang Mithril", 1, [["Batangan Mithril", 2], ["Palu Formasi Array", 1]]);
  tryRecipe("Jahit Jubah Baja Hitam", "Jubah Baja Hitam", 1, [["Baja Hitam Mistis", 3], ["Sutra Ulat Salju", 2]]);
  tryRecipe("Ukir Cincin Baja Hitam", "Cincin Baja Hitam", 1, [["Baja Hitam Mistis", 1], ["Pecahan Batu Roh", 3]]);
  tryRecipe("Ukir Kalung Batu Roh", "Kalung Batu Roh", 1, [["Pecahan Batu Roh", 8], ["Batangan Emas", 1]]);
  tryRecipe("Tulis Jimat Ledakan Api", "Jimat Ledakan Api", 1, [["Darah Spirit Beast", 1], ["Batu Meteor Api", 1], ["Kuas Jimat", 1]]);
  tryRecipe("Tulis Jimat Perisai Qi", "Jimat Perisai Qi", 1, [["Pecahan Batu Roh", 5], ["Kuas Jimat", 1]]);
  tryRecipe("Suling Pil Pembersih Meridian", "Pil Pembersih Meridian", 1, [["Ginseng Darah", 2], ["Pecahan Batu Roh", 4]]);
  tryRecipe("Suling Pil Pemurnian Darah", "Pil Pemurnian Darah", 1, [["Ginseng Darah", 1], ["Rumput Pembersih Sumsum", 1]]);
  tryRecipe("Suling Pil Penjaga Jiwa", "Pil Penjaga Jiwa", 1, [["Pil Pengumpul Qi", 1], ["Benang Jiwa", 1]]);
  tryRecipe("Suling Pil Regenerasi Total", "Pil Regenerasi Total", 1, [["Pil Nutrisi Tinggi", 1], ["Hati Phoenix", 1]]);
  tryRecipe("Tempa Kipas Angin Surgawi", "Kipas Angin Surgawi", 1, [["Sutra Ulat Salju", 3], ["Debu Bintang", 1], ["Palu Formasi Array", 1]]);
  tryRecipe("Tempa Belati Bayangan", "Belati Bayangan", 1, [["Baja Hitam Mistis", 1], ["Benang Jiwa", 1]]);
  tryRecipe("Potong Kayu Phoenix", "Kayu Phoenix", 1, [["Kayu Surga (Heavenly Wood)", 1], ["Kapak Petir Surgawi", 1]]);
  tryRecipe("Lebur Batangan Platinum", "Batangan Platinum", 1, [["Bijih Emas", 3], ["Batu Meteor Api", 2]]);
  tryRecipe("Lebur Kaca Roh", "Kaca Roh", 1, [["Kaca Optik", 2], ["Pecahan Batu Roh", 3]]);
  tryRecipe("Tenun Kain Giok", "Kain Giok", 1, [["Sutra Ulat Salju", 2], ["Bijih Giok Roh", 2]]);
  tryRecipe("Rakit Las Listrik Qi", "Las Listrik Qi", 1, [["Inti Mesin Uap", 1], ["Kawat Tembaga", 3], ["Baterai Spirit", 1]]);
  tryRecipe("Rakit Scanner Aura", "Scanner Aura", 1, [["Sensor Aura", 1], ["Lensa Presisi", 1], ["Chip Qi Sederhana", 1]]);
  tryRecipe("Olahan Daun Longevity", "Pil Pengumpul Qi", 1, [["Daun Longevity", 2], ["Ginseng Darah", 1]]);
  tryRecipe("Olahan Bunga Api Surgawi", "Jimat Ledakan Api", 1, [["Bunga Api Surgawi", 2], ["Darah Spirit Beast", 1]]);
  tryRecipe("Olahan Rumput Es Abadi", "Pil Pembersih Meridian", 1, [["Rumput Es Abadi", 2], ["Pecahan Batu Roh", 2]]);
  tryRecipe("Ukir Tanduk Unicorn", "Tanduk Unicorn Muda", 1, [["Tanduk Qilin", 1], ["Kristal Roh Ilahi", 1]]);
  tryRecipe("Tanam Bibit Teratai", "Teratai Roh Langit", 1, [["Bibit Teratai Roh", 1], ["Pil Nutrisi Pekerja", 1], ["Pecahan Batu Roh", 5]]);
  tryRecipe("Tanam Bibit Akar Naga", "Akar Naga", 1, [["Bibit Akar Naga", 1], ["Pil Nutrisi Tinggi", 1]]);
  tryRecipe("Tempa Jarum Meridian", "Jarum Meridian", 1, [["Batangan Besi Dingin", 1], ["Palu Formasi Array", 1]]);

  
  tryRecipe("Tempa Pedang Getar Baja", "Pedang Getar Baja", 1, [["Alloy Modern", 2], ["Pegas Baja", 2], ["Palu Formasi Array", 1]]);
  tryRecipe("Rakit Tongkat Stun Qi", "Tongkat Stun Qi", 1, [["Chip Qi Sederhana", 1], ["Baterai Spirit", 1], ["Kawat Tembaga", 2]]);
  tryRecipe("Rakit Jam Tangan Qi", "Jam Tangan Qi", 1, [["Chip Qi Sederhana", 1], ["Batangan Emas", 1], ["Lensa Presisi", 1]]);
  tryRecipe("Suling Bahan Bakar Spirit", "Bahan Bakar Spirit", 1, [["Minyak Olahan", 2], ["Pecahan Batu Roh", 3]]);

  tryRecipe("Padatkan Inti Bumi", "Inti Bumi", 1, [["Kristal Roh Ilahi", 3], ["Inti Meteor", 2], ["Batu Roh Utuh", 2]]);
  tryRecipe("Anyam Sisik Naga Muda", "Sisik Naga Muda", 1, [["Baja Darah (Blood Steel)", 2], ["Darah Spirit Beast", 3], ["Pecahan Batu Roh", 10]]);

  try {
    const reqs = [
      { itemId: idOf("Baja Hitam Mistis"), itemName: "Baja Hitam Mistis", quantity: 150 },
      { itemId: idOf("Kristal Roh Ilahi"), itemName: "Kristal Roh Ilahi", quantity: 50 },
      { itemId: idOf("Batu Roh Utuh"), itemName: "Batu Roh Utuh", quantity: 30 },
    ];
    assets.push(g({
      name: "Paviliun Pusaka Abadi",
      description: "Puncak dari segala puncak karya tangan, di mana bahan langit dan bumi dilebur menjadi pusaka tak terkalahkan.",
      rank: "Legendary",
      isCraftingStation: true,
      constructionTimeHours: 168,
      buildable: true,
      buildRequirements: reqs,
      recipes: wireRecipes,
      basePrice: 20,
      priceCurrency: "jade",
    }));
  } catch (e) {}

  // Income prestige yang butuh myth mats (sink + tujuan akhir)
  try {
    assets.push(g({
      name: "Altar Empat Dewa",
      description: "IN: Sisik/Bulu/Cakar/Cangkang Empat Dewa + Inti Primordial → OUT: 1 Jade/hari (cap).",
      rank: "Mythical",
      dailyProfit: 1,
      profitCurrency: "jade",
      constructionTimeHours: 240,
      buildable: true,
      buildRequirements: [
        { itemId: idOf("Sisik Qinglong"), itemName: "Sisik Qinglong", quantity: 1 },
        { itemId: idOf("Bulu Zhuque"), itemName: "Bulu Zhuque", quantity: 1 },
        { itemId: idOf("Cakar Baihu"), itemName: "Cakar Baihu", quantity: 1 },
        { itemId: idOf("Cangkang Xuanwu"), itemName: "Cangkang Xuanwu", quantity: 1 },
        { itemId: idOf("Inti Primordial"), itemName: "Inti Primordial", quantity: 1 },
      ],
      basePrice: 30,
      priceCurrency: "jade",
    }));
  } catch (e) {}



  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    let baseDesc = "";
    const name = a.name;
    if (name.includes('Pohon Buah Liar')) baseDesc = "Pohon kuno di pinggir hutan mistis yang akarnya menyerap embun pagi spiritual. Tempat ini memberikan pencerahan dan hasil bagi mereka yang mau berusaha.";
    else if (name.includes('Buruan')) baseDesc = "Jejak hewan buas terukir di tanah berbatu. Area ini dipenuhi Qi liar, menantang para kultivator untuk membuktikan insting pemburu mereka.";
    else if (name.includes('Tanah Liat')) baseDesc = "Lumpur tebal yang menyimpan intisari elemen Bumi, bahan dasar bagi karya para pembangun dan pembuat formasi.";
    else if (name.includes('Batu Kasar') || name.includes('Tebing Batu')) baseDesc = "Gua dangkal di kaki gunung surgawi, tempat di mana gema pahatan memecah kesunyian demi membongkar kekuatan batu alam.";
    else if (name.includes('Pasir Putih')) baseDesc = "Hamparan pasir halus di tepi danau yang memantulkan sinar rembulan, memancarkan Yin Qi yang cocok untuk dilebur menjadi karya seni.";
    else if (name.includes('Batu Kapur')) baseDesc = "Tebing kapur putih yang menyimpan jejak lautan purba, memendam sisa-sisa energi naga air yang telah lama mengering.";
    else if (name.includes('Penebangan') || name.includes('Kayu') || name.includes('Kayu Besi') || name.includes('Kayu Ulin')) baseDesc = "Rimbunan pohon keras yang tumbuh menjulang membelah awan, menantang para penebang untuk membuktikan ketajaman kapak dan Qi mereka.";
    else if (name.includes('Sungai') || name.includes('Kolam') || name.includes('Air Tawar') || name.includes('Laut') || name.includes('Dermaga') || name.includes('Tambak Udang')) baseDesc = "Perairan tenang yang menyembunyikan pusaran Qi air di dasar riaknya. Tempat memancing ketenangan jiwa dan hasil laut.";
    else if (name.includes('Sarang Lebah')) baseDesc = "Sarang alami di antara dahan raksasa. Dengungan lebah menyiratkan hukum alam tentang kerja keras tanpa henti.";
    else if (name.includes('Gandum') || name.includes('Padi') || name.includes('Kapas') || name.includes('Jagung') || name.includes('Kedelai') || name.includes('Sayur')) baseDesc = "Hamparan keemasan yang menari ditiup angin Qi. Ladang ini adalah denyut nadi kehidupan dan sumber energi fana bagi para penduduk.";
    else if (name.includes('Bambu')) baseDesc = "Rumpun bambu yang bergoyang mengikuti aliran Yin dan Yang. Batangnya lurus dan lentur, melambangkan keteguhan dao seorang pendekar.";
    else if (name.includes('Anggur')) baseDesc = "Rambatan anggur di perbukitan yang menyerap sari bumi, bersiap untuk difermentasi menjadi arak dewata pemabuk.";
    else if (name.includes('Teh')) baseDesc = "Kebun di puncak gunung yang diselimuti kabut abadi. Daunnya menyerap esensi langit, memberikan ketenangan dan pencerahan dao.";
    else if (name.includes('Garam')) baseDesc = "Hamparan ladang kristal putih yang berkilauan, mengkristalkan esensi elemen air dari samudra tak bertepi.";
    else if (name.includes('Ayam') || name.includes('Sapi') || name.includes('Domba') || name.includes('Kambing') || name.includes('Kandang') || name.includes('Penggembalaan')) baseDesc = "Tempat memelihara makhluk fana yang perlahan menyerap Qi lingkungan, menghasilkan bahan bernutrisi tinggi bagi tubuh.";
    else if (name.includes('Pinus') || name.includes('Jati') || name.includes('Ulin') || name.includes('Ebony') || name.includes('Maple') || name.includes('Ek')) baseDesc = "Hutan dengan aura kayu yang kental. Pepohonannya bernafas bersama bumi, menghasilkan kayu keras bermutu tinggi untuk paviliun mewah.";
    else if (name.includes('Batu Bara')) baseDesc = "Galian gelap yang memendam kristal api bumi. Batu bara ini adalah bahan bakar utama untuk tungku-tungku peleburan logam.";
    else if (name.includes('Tambang Tembaga') || name.includes('Tambang Timah') || name.includes('Tambang Besi') || name.includes('Tambang Perak') || name.includes('Tambang Emas') || name.includes('Tambang Nikel') || name.includes('Tambang Kobalt') || name.includes('Tambang Platinum') || name.includes('Tambang Obsidian') || name.includes('Galian Kuarsa') || name.includes('Tambang Ametis') || name.includes('Tambang Aluminium')) baseDesc = "Urat bumi yang memancarkan aura logam berharga. Setiap ketukan beliung membebaskan esensi logam yang terkunci jutaan tahun.";
    else if (name.includes('Giok')) baseDesc = "Tambang yang memendam batu penampung roh. Tempat di mana energi spiritual dunia mengkristal menjadi urat nadi giok.";
    else if (name.includes('Sandalwood')) baseDesc = "Hutan harum yang menenangkan jiwa. Kayunya sering dibakar dalam ritual atau dipahat menjadi gagang pusaka penangkal iblis.";
    else if (name.includes('Ginseng') || name.includes('Bunga Bulan') || name.includes('Rumput Sumsum') || name.includes('Rumput Qi') || name.includes('Daun Spirit') || name.includes('Daun Longevity') || name.includes('Bunga Api') || name.includes('Rumput Es') || name.includes('Bunga Moon')) baseDesc = "Lahan suci bertanah merah, merawat akar dan dedaunan berharga yang menyerap saripati Yin, Yang, dan Qi murni dari alam semesta.";
    else if (name.includes('Batu Roh')) baseDesc = "Gua kristal yang memancarkan pendar energi absolut. Setiap retakannya melepaskan nafas bumi yang menjadi mata uang dunia kultivasi.";
    else if (name.includes('Besi Dingin')) baseDesc = "Lubang tambang yang memancarkan aura es menggigit tulang. Hanya mereka yang bermental baja yang mampu menahan dinginnya.";
    else if (name.includes('Mithril')) baseDesc = "Urat bijih perak yang bersinar kebiruan dari bintang jatuh. Bahan mistis yang sangat ringan namun mustahil dihancurkan.";
    else if (name.includes('Teratai')) baseDesc = "Kolam awan tempat mekarnya bunga tanpa noda, menyerap embun surgawi yang jatuh perlahan dari langit kesembilan.";
    else if (name.includes('Akar Naga')) baseDesc = "Tanah berukir yang berdenyut layaknya jantung raksasa. Akar-akarnya menjalar jauh seperti urat nadi naga bumi purba.";
    else if (name.includes('Kristal Ilahi')) baseDesc = "Inti kristal bercahaya di kedalaman dunia yang belum terjamah, memancarkan resonansi yang menggetarkan fondasi jiwa.";
    else if (name.includes('Kayu Surga')) baseDesc = "Pohon-pohon raksasa yang menyentuh tirai surga, diselimuti oleh aura keemasan yang tak tertembus oleh senjata fana apapun.";
    else if (name.includes('Kayu Jiwa')) baseDesc = "Pepohonan gelap berbisik yang dahan-dahannya menyimpan ingatan dan jeritan jiwa-jiwa dari era perang masa lampau.";
    else if (name.includes('Star Iron')) baseDesc = "Kawah jatuhnya bintang besar yang membawa logam hitam pekat, masih berdenyut menyerap pendaran dari konstelasi kosmik.";
    else if (name.includes('Tungku') || name.includes('Bengkel') || name.includes('Pabrik') || name.includes('Dapur') || name.includes('Destilasi')) baseDesc = "Asap dupa dan api spiritual mengepul dari tempat ini. Di sinilah bahan mentah dilebur dengan hukum alam menjadi karya agung.";
    else if (name.includes('Kincir') || name.includes('Penggilingan') || name.includes('Penenunan')) baseDesc = "Roda mekanisme yang berputar mengikuti ritme Dao. Mengubah panen dan serat menjadi kebutuhan dasar yang menopang peradaban.";
    else if (name.includes('Paviliun Alkimia') || name.includes('Laboratorium')) baseDesc = "Wangi herba ilahi dan pil suci mengudara tebal. Kawah alkimianya mendidihkan harapan bagi para kultivator yang ingin menentang langit.";
    else if (name.includes('Tikar Pengemis') || name.includes('Warung') || name.includes('Kuil') || name.includes('Kedai') || name.includes('Penginapan') || name.includes('Balai') || name.includes('Markas') || name.includes('Toko') || name.includes('Rumah Bordir') || name.includes('Apotek') || name.includes('Dojo') || name.includes('Menara') || name.includes('Paviliun Teh') || name.includes('Paviliun Harta')) baseDesc = "Bangunan tempat bertemunya berbagai nasib. Denyut ekonomi dan perputaran koin terjadi di sini, mengalirkan kekayaan di antara para manusia fana dan kultivator.";
    else if (name.includes('Istana Terapung')) baseDesc = "Kastil yang melayang megah di antara lautan awan, manifestasi dari kekuatan absolut yang memandang rendah dunia fana di bawahnya.";
    else if (name.includes('Altar') || name.includes('Perpustakaan') || name.includes('Pusat Data') || name.includes('Menara Observasi')) baseDesc = "Pusat spiritual yang menyimpan rahasia penciptaan dan hukum tertinggi alam semesta. Tempat bermukimnya keajaiban.";
    else if (name.includes('Air Mata Phoenix') || name.includes('Laba-laba Kristal') || name.includes('Kawah Meteor') || name.includes('Debu Bintang') || name.includes('Retakan Dimensi') || name.includes('Tulang Naga') || name.includes('Sarang Phoenix') || name.includes('Kolam Jiwa')) baseDesc = "Zona anomali spiritual dengan tekanan energi ekstrem. Hanya eksistensi tingkat tinggi yang mampu mengekstrak sumber daya legendaris dari tempat ini.";
    else if (name.includes('Minyak') || name.includes('Karet') || name.includes('Serat Karbon')) baseDesc = "Bahan langka di era mekanisasi mistis. Menggabungkan teknologi masa depan dengan aliran Qi purba.";
    else baseDesc = "Tempat yang memancarkan energi unik di dunia Jianghu. Kombinasi hukum alam dan usaha keras manusia akan membuahkan hasil di sini.";

    let reqStr = "";
    if (a.workerInputMaterials && a.workerInputMaterials.length > 0) {
        const inputs = a.workerInputMaterials.map(m => m.itemName || m.name).filter(Boolean).join(', ');
        if (inputs) {
            reqStr = ` (Butuh ${inputs} untuk beroperasi)`;
        }
    }

    a.description = baseDesc + reqStr;
  }

  return assets;
}

// ---------------------------------------------------------------------------
// PET BUILDER (~55)
// ---------------------------------------------------------------------------
function buildAllPets(guildId) {
  const g = (o) => ({ guildId, createdBy: 'System Oracle', ...o });
  return [
    g({ name: 'Ayam Hutan', rank: 'Common', tier: 1, description: 'Memasak roti, nasi, garam, dan olahan dapur desa. Hewan fana biasa, teman setia untuk penduduk desa dan petualang pemula.', element: 'Netral', baseHp: 40, baseAtk: 8, baseDef: 4, baseSpd: 12, basePrice: 20, priceCurrency: 'silver' }),
    g({ name: 'Anjing Pemburu', rank: 'Common', tier: 1, description: 'Anjing setia. Hewan fana biasa, teman setia untuk penduduk desa dan petualang pemula.', element: 'Netral', baseHp: 55, baseAtk: 12, baseDef: 6, baseSpd: 14, basePrice: 40, priceCurrency: 'silver' }),
    g({ name: 'Kucing Liar', rank: 'Common', tier: 1, description: 'Gesit mandiri. Hewan fana biasa, teman setia untuk penduduk desa dan petualang pemula.', element: 'Netral', baseHp: 35, baseAtk: 10, baseDef: 3, baseSpd: 18, basePrice: 25, priceCurrency: 'silver' }),
    g({ name: 'Ular Rumput', rank: 'Common', tier: 1, description: 'Racun ringan. Hewan fana biasa, teman setia untuk penduduk desa dan petualang pemula. Memiliki kedekatan murni dengan elemen Tanah.', element: 'Tanah', baseHp: 30, baseAtk: 14, baseDef: 2, baseSpd: 15, basePrice: 30, priceCurrency: 'silver' }),
    g({ name: 'Burung Pipit Roh', rank: 'Common', tier: 1, description: 'Pembawa kabar. Hewan fana biasa, teman setia untuk penduduk desa dan petualang pemula. Memiliki kedekatan murni dengan elemen Angin.', element: 'Angin', baseHp: 25, baseAtk: 6, baseDef: 2, baseSpd: 22, basePrice: 35, priceCurrency: 'silver' }),
    g({ name: 'Tikus Tanah', rank: 'Common', tier: 1, description: 'Penggali handal. Hewan fana biasa, teman setia untuk penduduk desa dan petualang pemula. Memiliki kedekatan murni dengan elemen Tanah.', element: 'Tanah', baseHp: 28, baseAtk: 7, baseDef: 5, baseSpd: 16, basePrice: 18, priceCurrency: 'silver' }),
    g({ name: 'Katak Kolam', rank: 'Common', tier: 1, description: 'Hidup di air tawar. Hewan fana biasa, teman setia untuk penduduk desa dan petualang pemula. Memiliki kedekatan murni dengan elemen Air.', element: 'Air', baseHp: 32, baseAtk: 6, baseDef: 4, baseSpd: 10, basePrice: 15, priceCurrency: 'silver' }),
    g({ name: 'Serigala Abu', rank: 'Uncommon', tier: 2, description: 'Hidup berkelompok. Hewan yang mulai menunjukkan tanda-tanda mutasi spiritual, gesit dan memiliki insting tajam.', element: 'Netral', baseHp: 70, baseAtk: 18, baseDef: 10, baseSpd: 16, basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Elang Gunung', rank: 'Uncommon', tier: 2, description: 'Penglihatan tajam. Hewan yang mulai menunjukkan tanda-tanda mutasi spiritual, gesit dan memiliki insting tajam. Memiliki kedekatan murni dengan elemen Angin.', element: 'Angin', baseHp: 50, baseAtk: 20, baseDef: 6, baseSpd: 20, basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Kura-kura Batu', rank: 'Uncommon', tier: 2, description: 'Pertahanan tinggi. Hewan yang mulai menunjukkan tanda-tanda mutasi spiritual, gesit dan memiliki insting tajam. Memiliki kedekatan murni dengan elemen Tanah.', element: 'Tanah', baseHp: 120, baseAtk: 8, baseDef: 25, baseSpd: 4, basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Rubah Api Kecil', rank: 'Uncommon', tier: 2, description: 'Menguasai api dasar. Hewan yang mulai menunjukkan tanda-tanda mutasi spiritual, gesit dan memiliki insting tajam. Memiliki kedekatan murni dengan elemen Api.', element: 'Api', baseHp: 45, baseAtk: 22, baseDef: 5, baseSpd: 17, basePrice: 4, priceCurrency: 'gold' }),
    g({ name: 'Kodok Racun', rank: 'Uncommon', tier: 2, description: 'Kulit beracun. Hewan yang mulai menunjukkan tanda-tanda mutasi spiritual, gesit dan memiliki insting tajam. Memiliki kedekatan murni dengan elemen Air.', element: 'Air', baseHp: 40, baseAtk: 16, baseDef: 8, baseSpd: 10, basePrice: 3, priceCurrency: 'gold' }),
    g({ name: 'Beruang Coklat Muda', rank: 'Uncommon', tier: 2, description: 'Kekuatan fisik besar. Hewan yang mulai menunjukkan tanda-tanda mutasi spiritual, gesit dan memiliki insting tajam. Memiliki kedekatan murni dengan elemen Tanah.', element: 'Tanah', baseHp: 100, baseAtk: 20, baseDef: 15, baseSpd: 8, basePrice: 4, priceCurrency: 'gold' }),
    g({ name: 'Ular Air', rank: 'Uncommon', tier: 2, description: 'Berenang cepat. Hewan yang mulai menunjukkan tanda-tanda mutasi spiritual, gesit dan memiliki insting tajam. Memiliki kedekatan murni dengan elemen Air.', element: 'Air', baseHp: 48, baseAtk: 15, baseDef: 6, baseSpd: 14, basePrice: 2, priceCurrency: 'gold' }),
    g({ name: 'Harimau Putih Muda', rank: 'Rare', tier: 3, description: 'Bakat mistis. Makhluk langka dengan garis keturunan unik, sering diincar oleh penjinak beast profesional.', element: 'Netral', baseHp: 100, baseAtk: 30, baseDef: 15, baseSpd: 18, basePrice: 15, priceCurrency: 'gold' }),
    g({ name: 'Ular Beracun Hitam', rank: 'Rare', tier: 3, description: 'Racun tembus meridian. Makhluk langka dengan garis keturunan unik, sering diincar oleh penjinak beast profesional. Memiliki kedekatan murni dengan elemen Kegelapan.', element: 'Kegelapan', baseHp: 60, baseAtk: 28, baseDef: 8, baseSpd: 16, basePrice: 12, priceCurrency: 'gold' }),
    g({ name: 'Burung Phoenix Muda', rank: 'Rare', tier: 3, description: 'Anak burung api. Makhluk langka dengan garis keturunan unik, sering diincar oleh penjinak beast profesional. Memiliki kedekatan murni dengan elemen Api.', element: 'Api', baseHp: 70, baseAtk: 25, baseDef: 10, baseSpd: 19, basePrice: 20, priceCurrency: 'gold' }),
    g({ name: 'Kuda Angin', rank: 'Rare', tier: 3, description: 'Berlari di atas angin. Makhluk langka dengan garis keturunan unik, sering diincar oleh penjinak beast profesional. Memiliki kedekatan murni dengan elemen Angin.', element: 'Angin', baseHp: 90, baseAtk: 15, baseDef: 12, baseSpd: 28, basePrice: 18, priceCurrency: 'gold' }),
    g({ name: 'Ikan Naga Sungai', rank: 'Rare', tier: 3, description: 'Hampir menjadi naga. Makhluk langka dengan garis keturunan unik, sering diincar oleh penjinak beast profesional. Memiliki kedekatan murni dengan elemen Air.', element: 'Air', baseHp: 80, baseAtk: 22, baseDef: 14, baseSpd: 12, basePrice: 16, priceCurrency: 'gold' }),
    g({ name: 'Laba-laba Kristal', rank: 'Rare', tier: 3, description: 'Jaring kristal. Makhluk langka dengan garis keturunan unik, sering diincar oleh penjinak beast profesional. Memiliki kedekatan murni dengan elemen Tanah.', element: 'Tanah', baseHp: 55, baseAtk: 24, baseDef: 18, baseSpd: 14, basePrice: 14, priceCurrency: 'gold' }),
    g({ name: 'Serigala Petir', rank: 'Rare', tier: 3, description: 'Memanggil petir. Makhluk langka dengan garis keturunan unik, sering diincar oleh penjinak beast profesional. Memiliki kedekatan murni dengan elemen Petir.', element: 'Petir', baseHp: 85, baseAtk: 32, baseDef: 12, baseSpd: 20, basePrice: 22, priceCurrency: 'gold' }),
    g({ name: 'Macan Tutul Bayangan', rank: 'Rare', tier: 3, description: 'Menghilang di bayangan. Makhluk langka dengan garis keturunan unik, sering diincar oleh penjinak beast profesional. Memiliki kedekatan murni dengan elemen Kegelapan.', element: 'Kegelapan', baseHp: 75, baseAtk: 30, baseDef: 10, baseSpd: 24, basePrice: 18, priceCurrency: 'gold' }),
    g({ name: 'Elang Petir', rank: 'Rare', tier: 3, description: 'Sayap berkelistrikan. Makhluk langka dengan garis keturunan unik, sering diincar oleh penjinak beast profesional. Memiliki kedekatan murni dengan elemen Petir.', element: 'Petir', baseHp: 65, baseAtk: 28, baseDef: 8, baseSpd: 26, basePrice: 20, priceCurrency: 'gold' }),
    g({ name: 'Naga Air Muda', rank: 'Epic', tier: 5, description: 'Naga air tumbuh. Spirit beast tingkat tinggi dengan intelek luar biasa, mampu memahami bahasa manusia dan menguasai hukum alam. Memiliki kedekatan murni dengan elemen Air.', element: 'Air', baseHp: 150, baseAtk: 40, baseDef: 25, baseSpd: 15, basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Phoenix Api', rank: 'Epic', tier: 5, description: 'Api surgawi. Spirit beast tingkat tinggi dengan intelek luar biasa, mampu memahami bahasa manusia dan menguasai hukum alam. Memiliki kedekatan murni dengan elemen Api.', element: 'Api', baseHp: 130, baseAtk: 45, baseDef: 20, baseSpd: 22, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Harimau Putih Dewa', rank: 'Epic', tier: 5, description: 'Sudah tersadarkan. Spirit beast tingkat tinggi dengan intelek luar biasa, mampu memahami bahasa manusia dan menguasai hukum alam. Memiliki kedekatan murni dengan elemen Cahaya.', element: 'Cahaya', baseHp: 160, baseAtk: 42, baseDef: 28, baseSpd: 20, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Ular Naga Racun', rank: 'Epic', tier: 5, description: 'Racun mematikan. Spirit beast tingkat tinggi dengan intelek luar biasa, mampu memahami bahasa manusia dan menguasai hukum alam. Memiliki kedekatan murni dengan elemen Kegelapan.', element: 'Kegelapan', baseHp: 110, baseAtk: 48, baseDef: 18, baseSpd: 18, basePrice: 2, priceCurrency: 'jade' }),
    g({ name: 'Garuda Angin', rank: 'Epic', tier: 5, description: 'Penguasa angin. Spirit beast tingkat tinggi dengan intelek luar biasa, mampu memahami bahasa manusia dan menguasai hukum alam. Memiliki kedekatan murni dengan elemen Angin.', element: 'Angin', baseHp: 120, baseAtk: 38, baseDef: 22, baseSpd: 30, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Kura-kura Xuanwu Muda', rank: 'Epic', tier: 5, description: 'Penunggu utara. Spirit beast tingkat tinggi dengan intelek luar biasa, mampu memahami bahasa manusia dan menguasai hukum alam. Memiliki kedekatan murni dengan elemen Air.', element: 'Air', baseHp: 220, baseAtk: 20, baseDef: 45, baseSpd: 6, basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Singa Petir', rank: 'Epic', tier: 5, description: 'Tubuh penuh kilat. Spirit beast tingkat tinggi dengan intelek luar biasa, mampu memahami bahasa manusia dan menguasai hukum alam. Memiliki kedekatan murni dengan elemen Petir.', element: 'Petir', baseHp: 140, baseAtk: 50, baseDef: 24, baseSpd: 18, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Rubah Sembilan Ekor Muda', rank: 'Epic', tier: 5, description: 'Bakat ilusi & api. Spirit beast tingkat tinggi dengan intelek luar biasa, mampu memahami bahasa manusia dan menguasai hukum alam. Memiliki kedekatan murni dengan elemen Api.', element: 'Api', baseHp: 100, baseAtk: 42, baseDef: 15, baseSpd: 25, basePrice: 4, priceCurrency: 'jade' }),
    g({ name: 'Banteng Besi', rank: 'Epic', tier: 5, description: 'Kulit sekeras baja. Spirit beast tingkat tinggi dengan intelek luar biasa, mampu memahami bahasa manusia dan menguasai hukum alam. Memiliki kedekatan murni dengan elemen Tanah.', element: 'Tanah', baseHp: 200, baseAtk: 35, baseDef: 40, baseSpd: 8, basePrice: 3, priceCurrency: 'jade' }),
    g({ name: 'Naga Emas Kuno', rank: 'Legendary', tier: 7, description: 'Hidup ribuan tahun. Binatang buas kuno berkekuatan penghancur surga, legenda yang hanya diceritakan dalam dongeng masa lalu. Memiliki kedekatan murni dengan elemen Cahaya.', element: 'Cahaya', baseHp: 300, baseAtk: 70, baseDef: 40, baseSpd: 20, basePrice: 15, priceCurrency: 'jade' }),
    g({ name: 'Phoenix Abadi', rank: 'Legendary', tier: 7, description: 'Tidak mati permanen. Binatang buas kuno berkekuatan penghancur surga, legenda yang hanya diceritakan dalam dongeng masa lalu. Memiliki kedekatan murni dengan elemen Api.', element: 'Api', baseHp: 250, baseAtk: 75, baseDef: 35, baseSpd: 25, basePrice: 18, priceCurrency: 'jade' }),
    g({ name: 'Qilin Surgawi', rank: 'Legendary', tier: 7, description: 'Keberuntungan dewa. Binatang buas kuno berkekuatan penghancur surga, legenda yang hanya diceritakan dalam dongeng masa lalu. Memiliki kedekatan murni dengan elemen Cahaya.', element: 'Cahaya', baseHp: 280, baseAtk: 60, baseDef: 50, baseSpd: 18, basePrice: 20, priceCurrency: 'jade' }),
    g({ name: 'Naga Hitam Abyss', rank: 'Legendary', tier: 7, description: 'Dari kedalaman abyss. Binatang buas kuno berkekuatan penghancur surga, legenda yang hanya diceritakan dalam dongeng masa lalu. Memiliki kedekatan murni dengan elemen Kegelapan.', element: 'Kegelapan', baseHp: 320, baseAtk: 80, baseDef: 38, baseSpd: 16, basePrice: 22, priceCurrency: 'jade' }),
    g({ name: 'Kun Peng', rank: 'Legendary', tier: 7, description: 'Raksasa jadi burung. Binatang buas kuno berkekuatan penghancur surga, legenda yang hanya diceritakan dalam dongeng masa lalu. Memiliki kedekatan murni dengan elemen Angin.', element: 'Angin', baseHp: 350, baseAtk: 65, baseDef: 30, baseSpd: 28, basePrice: 25, priceCurrency: 'jade' }),
    g({ name: 'Rubah Sembilan Ekor', rank: 'Legendary', tier: 7, description: 'Ilusi tingkat dewa. Binatang buas kuno berkekuatan penghancur surga, legenda yang hanya diceritakan dalam dongeng masa lalu. Memiliki kedekatan murni dengan elemen Api.', element: 'Api', baseHp: 200, baseAtk: 70, baseDef: 25, baseSpd: 30, basePrice: 20, priceCurrency: 'jade' }),
    g({ name: 'Naga Petir', rank: 'Legendary', tier: 7, description: 'Menguasai badai. Binatang buas kuno berkekuatan penghancur surga, legenda yang hanya diceritakan dalam dongeng masa lalu. Memiliki kedekatan murni dengan elemen Petir.', element: 'Petir', baseHp: 290, baseAtk: 78, baseDef: 35, baseSpd: 22, basePrice: 18, priceCurrency: 'jade' }),
    g({ name: 'Naga Primordial', rank: 'Mythical', tier: 9, description: 'Dari awal penciptaan. Roh binatang suci penjaga dimensi. Kehadirannya membawa keajaiban dunia dan keberuntungan absolut.', element: 'Netral', baseHp: 500, baseAtk: 100, baseDef: 60, baseSpd: 25, basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Phoenix Primordial', rank: 'Mythical', tier: 9, description: 'Lahir dari api pertama. Roh binatang suci penjaga dimensi. Kehadirannya membawa keajaiban dunia dan keberuntungan absolut. Memiliki kedekatan murni dengan elemen Api.', element: 'Api', baseHp: 450, baseAtk: 110, baseDef: 50, baseSpd: 30, basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Xuanwu Abadi', rank: 'Mythical', tier: 9, description: 'Penunggu utara abadi. Roh binatang suci penjaga dimensi. Kehadirannya membawa keajaiban dunia dan keberuntungan absolut. Memiliki kedekatan murni dengan elemen Air.', element: 'Air', baseHp: 600, baseAtk: 50, baseDef: 90, baseSpd: 8, basePrice: 3, priceCurrency: 'spirit' }),
    g({ name: 'Baihu Langit', rank: 'Mythical', tier: 9, description: 'Harimau putih penunggu barat. Roh binatang suci penjaga dimensi. Kehadirannya membawa keajaiban dunia dan keberuntungan absolut. Memiliki kedekatan murni dengan elemen Cahaya.', element: 'Cahaya', baseHp: 480, baseAtk: 105, baseDef: 55, baseSpd: 28, basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Zhuque Surga', rank: 'Mythical', tier: 9, description: 'Burung vermilion selatan. Roh binatang suci penjaga dimensi. Kehadirannya membawa keajaiban dunia dan keberuntungan absolut. Memiliki kedekatan murni dengan elemen Api.', element: 'Api', baseHp: 420, baseAtk: 115, baseDef: 45, baseSpd: 32, basePrice: 2, priceCurrency: 'spirit' }),
    g({ name: 'Qinglong Timur', rank: 'Mythical', tier: 9, description: 'Naga biru penunggu timur. Roh binatang suci penjaga dimensi. Kehadirannya membawa keajaiban dunia dan keberuntungan absolut. Memiliki kedekatan murni dengan elemen Air.', element: 'Air', baseHp: 520, baseAtk: 95, baseDef: 65, baseSpd: 24, basePrice: 3, priceCurrency: 'spirit' }),
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
    // Masalah: seed lama pakai nama berbeda (mis. "Area Penebang Kayu" 2/jam).
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
      "Area Penebangan Kayu":      { workerOutputQuantity: 2, constructionTimeHours: 2,
        forceInput: "Kapak Batu" }, // entry primitif (dulu 2/jam)
      "Area Penebangan Kayu Dasar": { workerOutputQuantity: 2, constructionTimeHours: 2,
        forceInput: "Kapak Batu" },
      "Area Penebangan Kayu Besi":  { workerOutputQuantity: 3, constructionTimeHours: 8,
        forceInput: "Kapak Besi" }, // HARUS lebih baik dari Dasar

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
        let needsInput = fix.forceInput || (doc.workerInputMaterials && doc.workerInputMaterials.length > 0 ? doc.workerInputMaterials[0].itemName : null);
        let baseDesc = doc.description.replace(/^\d+ .*?\/jam(\. Butuh .*?\/jam\.)?/i, '').trim();
        if (needsInput && !baseDesc.includes("Membutuhkan")) {
          baseDesc += ` Membutuhkan ${needsInput} untuk beroperasi.`;
        }
        $set.description = baseDesc;
      }
      if (fix.dailyProfit !== undefined) {
        $set.description = doc.description.replace(/^[\d\.]+ (silver|gold|jade|copper)\/hari\.\s*/i, '');
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


    // =====================================================================
    // DEDUPE: asset yang output-nya sama tapi tier tidak jelas
    // =====================================================================
    // Aturan: untuk tiap workerOutputItemName, asset dengan rank/cost lebih tinggi
    // HARUS punya output >= asset lebih murah. Jika tidak → naikkan output.
    const allWorker = await Asset.find({
      guildId,
      workerOutputItemName: { $ne: null, $exists: true },
      workerOutputQuantity: { $gt: 0 },
    }).lean();

    const byItem = {};
    for (const a of allWorker) {
      const key = a.workerOutputItemName;
      if (!byItem[key]) byItem[key] = [];
      byItem[key].push(a);
    }

    let dedupeFixed = 0;
    for (const [itemName, list] of Object.entries(byItem)) {
      if (list.length < 2) continue;

      // Urutkan: yang constructionTime / basePrice lebih rendah = tier bawah
      list.sort((a, b) => {
        const ca = (a.constructionTimeHours || 0) + (a.basePrice || 0);
        const cb = (b.constructionTimeHours || 0) + (b.basePrice || 0);
        return ca - cb;
      });

      let prevQty = 0;
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        let targetQty = a.workerOutputQuantity || 1;

        // Tier lebih mahal/lama harus >= tier sebelumnya
        if (i > 0 && targetQty < prevQty) {
          targetQty = Math.min(prevQty + 1, 4); // max 4/jam tetap adil
        }
        // Cap global tetap
        if (targetQty > 4) targetQty = 4;

        // Kayu Mentah: hanya 2 jalur resmi
        if (itemName === "Kayu Mentah") {
          if (/Dasar|Primitif|Area Penebangan Kayu$/i.test(a.name) && !/Besi/i.test(a.name)) {
            targetQty = 2;
          } else if (/Besi/i.test(a.name)) {
            targetQty = 3;
          } else if (!/Ulin|Surga|Ebony|Pinus|Maple|Jati/i.test(a.name)) {
            // Duplikat generator zona → turunkan jadi 1 agar tidak menyaingi jalur resmi
            targetQty = 1;
          }
        }

        if (targetQty !== a.workerOutputQuantity) {
          await Asset.updateOne(
            { _id: a._id },
            {
              $set: {
                workerOutputQuantity: targetQty,
                description: a.description.replace(/^\d+ .*?\/jam(\. Butuh .*?\/jam\.)?/i, '').trim(),
                createdBy: "System Oracle (dedupe)",
              },
            }
          );
          console.log(`      DEDUPE: "${a.name}" ${itemName} ${a.workerOutputQuantity} → ${targetQty}/jam`);
          dedupeFixed++;
        }
        prevQty = Math.max(prevQty, targetQty);
      }
    }
    console.log(`      → ${dedupeFixed} asset di-normalisasi (anti-rancu).\n`);

    

    // =====================================================================
    // ARSIPKAN ASSET JELEK (nama zona/spam generator)
    // buildable=false, output=0, profit=0 — tidak bisa dibangun lagi
    // =====================================================================
    const JUNK_NAME = /(Utama|Cadangan|Kecil)$|^(Area (Kayu|Batu|Bijih|Herbal|Ikan|Buruan) )|^(Ladang|Hutan|Tambang Dangkal|Tambang Dalam|Kebun Herbal|Peternakan|Perairan) .*(Utama|Cadangan|Kecil)$|^(Warung|Kios|Stan|Pondok|Gubuk|Kedai Kecil|Toko Kecil|Lapak) |^(Pasar|Pelabuhan|Desa|Kota|Pinggiran) Lapak |^(Balai|Paviliun|Aula|Gedung|Menara|Kuil|Dojo|Bengkel) .+ \d+$|Area Penebangan Kayu Dasar|Area Penebangan Kayu Besi|^(Ladang|Hutan|Tambang|Kebun|Peternakan) .* \d+$/;
    // Catatan: Area Penebangan Kayu Dasar/Besi diganti nama kurasi "Hutan Desa" / "Hutan Rimba Dalam"

    const junk = await Asset.find({ guildId, name: { $regex: JUNK_NAME } });
    let archived = 0;
    for (const doc of junk) {
      // Jangan arsipkan curated names
      if (/^(Hutan Desa|Hutan Rimba Dalam|Hutan Pinus Kabut|Hutan Ulin Leluhur|Tebing Batu Desa|Tambang Batu Bara Desa|Tambang Tembaga Desa|Tambang Besi Lereng|Tambang Emas Terlarang|Ladang Gandum Desa|Sawah Padi Desa|Kebun Kapas Desa|Kebun Anggur Lereng|Kandang Ayam Desa|Padang Penggembalaan|Dermaga Nelayan Desa|Warung Nasi Kampung|Kedai Teh Pinggir Jalan)$/.test(doc.name)) {
        continue;
      }
            // Hapus Asset secara permanen
      await Asset.deleteOne({ _id: doc._id });

      // Hapus referensi dari Shop
      await Shop.deleteMany({ refId: doc._id });

      archived++;
    }
    if (archived > 0) {
      console.log(`      → ${archived} asset spam/jelek diarsipkan (buildable=false, output=0).\n`);
    }

    

    // =====================================================================
    // DAYA TAHAN TOOL: stamp durabilityHours di semua workerInputMaterials & bersihkan deskripsi
    // =====================================================================
    console.log('[3c/5] Stamp daya tahan tool & bersihkan deskripsi...');
    const allForDur = await Asset.find({ guildId });
    let durFixed = 0;
    for (const doc of allForDur) {
      let changed = false;
      const next = (doc.workerInputMaterials || []).map((mat) => {
        const name = mat.itemName || '';
        const d = durabilityOf(name);
        const obj = mat.toObject ? mat.toObject() : { ...mat };
        if (obj.durabilityHours !== d) {
          changed = true;
          obj.durabilityHours = d;
        }
        if (!obj.quantity || obj.quantity < 1) obj.quantity = 1;
        return obj;
      });
      // Bersihkan deskripsi dari string "(tahan X jam)" atau "[...tahan Xj]"
      let descChanged = false;
      if (doc.description) {
        const cleanedDesc = doc.description
          .replace(/\(tahan \d+ jam\)/g, '')
          .replace(/\[.*?tahan \d+j.*?\]/g, '')
          .replace(/\s+/g, ' ') // rapikan spasi berlebih
          .trim();
        if (doc.description !== cleanedDesc) {
          doc.description = cleanedDesc;
          descChanged = true;
        }
      }

      if (changed || descChanged) {
        if (changed) doc.workerInputMaterials = next;
        doc.createdBy = doc.createdBy || 'System Oracle';
        await doc.save();
        durFixed++;
      }
    }
    console.log(`      → ${durFixed} asset di-update (daya tahan & pembersihan deskripsi).\n`);


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
