/**
 * ============================================================
 *  JIANGHU BOT — ECONOMY MASTER OVERHAUL SCRIPT
 *  Guild ID : 1504794711775514856
 * ============================================================
 *  Prinsip:
 *  1. UPDATE IN-PLACE (ObjectId tetap → ownership aman)
 *  2. 4 Era: Primitif → Besi → Modern Fana → Wuxia/Immortal
 *  3. Material chain saling bergantung → trade & barter wajib
 *  4. Shop hanya starter
 *  5. Max personal daily profit ≈ 2 Gold 50 Silver
 *  6. Deskripsi hidup + konsisten
 * ============================================================
 *
 * CARA PAKAI:
 * 1. Pastikan MONGODB_URI sudah benar di bawah
 * 2. node script.js
 * ============================================================
 */

const mongoose = require('mongoose');

// ==================== CONFIG ====================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu'; // GANTI JIKA PERLU
const GUILD_ID = '1504794711775514856';

// ==================== SCHEMAS (minimal) ====================
const ItemSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const AssetSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const PetSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const ShopSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

const Item = mongoose.model('Item', ItemSchema);
const Asset = mongoose.model('Asset', AssetSchema);
const Pet = mongoose.model('Pet', PetSchema);
const Shop = mongoose.model('Shop', ShopSchema);

// ==================== HELPERS ====================
const oid = (id) => new mongoose.Types.ObjectId(id);

async function upsertItem(id, data) {
  const payload = {
    ...data,
    guildId: GUILD_ID,
    updatedAt: new Date(),
  };
  await Item.findByIdAndUpdate(oid(id), { $set: payload }, { upsert: true, new: true });
  console.log(`  ✓ Item  : ${data.name}`);
}

async function upsertAsset(id, data) {
  const payload = {
    ...data,
    guildId: GUILD_ID,
    updatedAt: new Date(),
  };
  await Asset.findByIdAndUpdate(oid(id), { $set: payload }, { upsert: true, new: true });
  console.log(`  ✓ Asset : ${data.name}`);
}

async function upsertPet(id, data) {
  const payload = {
    ...data,
    guildId: GUILD_ID,
    updatedAt: new Date(),
  };
  await Pet.findByIdAndUpdate(oid(id), { $set: payload }, { upsert: true, new: true });
  console.log(`  ✓ Pet   : ${data.name}`);
}

async function clearAndSeedShop(entries) {
  // Hapus semua shop lama di guild ini, lalu isi ulang hanya starter
  await Shop.deleteMany({ guildId: GUILD_ID });
  for (const e of entries) {
    await Shop.create({
      guildId: GUILD_ID,
      category: 'item',
      refId: oid(e.refId),
      refModel: 'Item',
      price: e.price,
      priceCurrency: e.priceCurrency,
      stock: -1,
      isActive: true,
      addedBy: 'System Oracle',
    });
  }
  console.log(`  ✓ Shop  : ${entries.length} starter items only`);
}

// ==================== MAIN ====================
async function main() {
  console.log('\n🔥 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  console.log('══════════════════════════════════════');
  console.log('  PHASE 1 — UPDATE ITEMS (187 existing)');
  console.log('══════════════════════════════════════\n');

  // ---------- ERA 1: PRIMITIF (Common T1) ----------
  // Material dasar
  await upsertItem('6a91b15aa9e03dc91c54bfc2', {
    name: 'Batu Kasar',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 5, priceCurrency: 'copper',
    description: 'Bongkahan batu alam yang belum diolah. Fondasi segala bangunan fana. Tanpa ini, peradaban takkan berdiri.',
    effect: null, origin: 'Alam Liar', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfc3', {
    name: 'Kayu Mentah',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 5, priceCurrency: 'copper',
    description: 'Batang pohon yang baru ditebang. Masih basah dan berat. Digunakan untuk bahan bakar, tiang, atau diolah menjadi papan.',
    effect: null, origin: 'Hutan Liar', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfc4', {
    name: 'Daun Kering',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 2, priceCurrency: 'copper',
    description: 'Daun gugur yang dikumpulkan di musim kemarau. Bahan bakar termurah dan pakan hewan kecil.',
    effect: null, origin: 'Hutan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfc5', {
    name: 'Batu Tajam',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 12, priceCurrency: 'copper',
    description: 'Batu yang diasah manual hingga tajam. Alat potong primitif sebelum adanya logam. (Durabilitas alat: 12 jam)',
    effect: null, origin: 'Sungai', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfc6', {
    name: 'Tanah Liat',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 4, priceCurrency: 'copper',
    description: 'Tanah basah elastis dari pinggir sungai. Bahan utama gerabah dan bata mentah.',
    effect: null, origin: 'Tepi Sungai', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfc7', {
    name: 'Serat Tumbuhan',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 3, priceCurrency: 'copper',
    description: 'Serat kasar dari batang tanaman liar. Dipilin menjadi tali atau tenunan primitif.',
    effect: null, origin: 'Padang Rumput', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfc8', {
    name: 'Getah Pohon',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 6, priceCurrency: 'copper',
    description: 'Cairan lengket dari kulit pohon. Lem alami dan bahan dasar karet di era modern.',
    effect: null, origin: 'Hutan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfc9', {
    name: 'Bulu Hewan',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 8, priceCurrency: 'copper',
    description: 'Bulu hasil buruan. Hangat untuk pakaian musim dingin dan bahan isian.',
    effect: null, origin: 'Hutan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfca', {
    name: 'Kulit Mentah',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 15, priceCurrency: 'copper',
    description: 'Kulit hewan yang belum disamak. Masih berbau, namun sangat kuat setelah dijemur.',
    effect: null, origin: 'Hasil Buruan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfcb', {
    name: 'Tulang Hewan',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 10, priceCurrency: 'copper',
    description: 'Tulang sisa perburuan. Diasah menjadi jarum, belati, atau hiasan suku.',
    effect: null, origin: 'Hasil Buruan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfcc', {
    name: 'Biji Ek',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 2, priceCurrency: 'copper',
    description: 'Biji pohon ek. Pakan hewan liar, atau dipanggang sebagai camilan darurat.',
    effect: null, origin: 'Hutan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfcd', {
    name: 'Pasir Halus',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 3, priceCurrency: 'copper',
    description: 'Butiran pasir sungai yang diayak. Campuran dasar untuk bangunan dan kaca kasar.',
    effect: null, origin: 'Sungai', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfce', {
    name: 'Lumpur Basah',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 1, priceCurrency: 'copper',
    description: 'Lumpur kental. Dipakai menutup celah dinding gubuk agar angin tak masuk.',
    effect: null, origin: 'Rawa', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfcf', {
    name: 'Bambu Hijau',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 6, priceCurrency: 'copper',
    description: 'Bambu segar yang lentur namun kuat. Ideal untuk joran, pipa air, dan tombak.',
    effect: null, origin: 'Hutan Bambu', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15aa9e03dc91c54bfd0', {
    name: 'Pecahan Kerang',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 4, priceCurrency: 'copper',
    description: 'Cangkang kerang yang digosok mengkilap. Dulu dipakai sebagai mata uang suku pesisir.',
    effect: null, origin: 'Pantai', imageUrl: null, createdBy: 'System Oracle',
  });

  // Tools Primitif
  await upsertItem('6a91b15ba9e03dc91c54bfd1', {
    name: 'Kapak Batu',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 30, priceCurrency: 'copper',
    description: 'Batu tajam diikat pada gagang kayu dengan serat. Alat tebang wajib para penebang kayu. (Durabilitas: 24 jam)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfd2', {
    name: 'Beliung Batu',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 30, priceCurrency: 'copper',
    description: 'Alat tambang primitif dengan ujung batu kokoh. Lambat tapi satu-satunya cara menambang bagi pemula. (Durabilitas: 24 jam)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfd3', {
    name: 'Cangkul Kayu',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 25, priceCurrency: 'copper',
    description: 'Kayu yang ujungnya dilengkungkan untuk menggemburkan tanah. Alat dasar pertanian fana. (Durabilitas: 24 jam)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfd4', {
    name: 'Pancingan Bambu',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 35, priceCurrency: 'copper',
    description: 'Joran bambu dengan benang serat. Digunakan memancing di sungai kecil. (Durabilitas: 36 jam)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfd5', {
    name: 'Pisau Tulang',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 28, priceCurrency: 'copper',
    description: 'Tulang yang diasah tajam. Berguna menguliti dan memotong daging. (Durabilitas: 18 jam)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfd6', {
    name: 'Tali Rami',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 18, priceCurrency: 'copper',
    description: 'Tali dipilin dari serat tumbuhan. Cukup kuat mengikat balok kayu. (Durabilitas: 48 jam)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfd7', {
    name: 'Jarum Tulang',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 12, priceCurrency: 'copper',
    description: 'Jarum kecil dari tulang. Dibutuhkan untuk menjahit kulit hewan. (Durabilitas: 12 jam)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfd8', {
    name: 'Wadah Tanah Liat',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 18, priceCurrency: 'copper',
    description: 'Wadah yang dibakar di bawah matahari. Menampung air tapi mudah pecah. (Durabilitas: 48 jam)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfd9', {
    name: 'Batu Api',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 22, priceCurrency: 'copper',
    description: 'Dua batu yang digesekkan menghasilkan percikan api. Wajib untuk bertahan hidup. (Durabilitas: 72 jam)',
    effect: null, origin: 'Alam', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfda', {
    name: 'Penggiling Batu',
    rank: 'Common', tier: 1, category: 'none',
    basePrice: 40, priceCurrency: 'copper',
    description: 'Dua batu datar untuk menghancurkan biji-bijian. Lambat tapi efektif. (Durabilitas: 96 jam)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  // Weapons Primitif
  await upsertItem('6a91b15ba9e03dc91c54bfdb', {
    name: 'Pedang Kayu',
    rank: 'Common', tier: 1, category: 'weapon',
    basePrice: 55, priceCurrency: 'copper',
    description: 'Senjata latihan dari kayu keras. Tumpul, tapi hantamannya cukup meremukkan tulang fana. (Durabilitas: 48 pertempuran)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfdc', {
    name: 'Tombak Bambu',
    rank: 'Common', tier: 1, category: 'weapon',
    basePrice: 50, priceCurrency: 'copper',
    description: 'Bambu diruncingkan dan dibakar agar keras. Mematikan dari jarak aman. (Durabilitas: 30 pertempuran)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfdd', {
    name: 'Gada Batu',
    rank: 'Common', tier: 1, category: 'weapon',
    basePrice: 65, priceCurrency: 'copper',
    description: 'Gada berat berujung batu besar. Butuh tenaga besar, daya hancurnya luar biasa. (Durabilitas: 40 pertempuran)',
    effect: null, origin: 'Kerajinan Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  // Consumables Primitif
  await upsertItem('6a91b15ba9e03dc91c54bfe2', {
    name: 'Daging Mentah',
    rank: 'Common', tier: 1, category: 'consume',
    basePrice: 18, priceCurrency: 'copper',
    description: 'Daging hasil buruan yang belum dimasak. Bisa dimakan darurat, tapi berisiko sakit perut.',
    effect: null, origin: 'Hasil Buruan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfe3', {
    name: 'Air Bersih',
    rank: 'Common', tier: 1, category: 'consume',
    basePrice: 5, priceCurrency: 'copper',
    description: 'Air jernih dari mata air atau sungai yang disaring. Kebutuhan mutlak semua pekerja dan peternakan.',
    effect: null, origin: 'Mata Air', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfe4', {
    name: 'Buah Liar',
    rank: 'Common', tier: 1, category: 'consume',
    basePrice: 8, priceCurrency: 'copper',
    description: 'Buah hutan yang manis dan menyegarkan. Pakan pekerja atau dijual di kios kecil.',
    effect: null, origin: 'Hutan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfe5', {
    name: 'Makanan Matang',
    rank: 'Common', tier: 1, category: 'consume',
    basePrice: 30, priceCurrency: 'copper',
    description: 'Makanan sederhana yang sudah dimasak. Memberi energi lebih baik daripada bahan mentah.',
    effect: null, origin: 'Dapur Suku', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfe6', {
    name: 'Ikan Segar',
    rank: 'Common', tier: 1, category: 'consume',
    basePrice: 14, priceCurrency: 'copper',
    description: 'Ikan hasil tangkapan sungai. Segar dan bergizi, bahan baku makanan matang.',
    effect: null, origin: 'Sungai', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfec', {
    name: 'Bibit Padi',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 6, priceCurrency: 'copper',
    description: 'Bibit padi lokal yang tahan tadah hujan. Wajib untuk memulai lahan pertanian.',
    effect: null, origin: 'Petani Lokal', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bfed', {
    name: 'Beras Mentah',
    rank: 'Common', tier: 1, category: 'material',
    basePrice: 12, priceCurrency: 'copper',
    description: 'Padi yang sudah dipanen tapi belum digiling. Bahan pokok makanan fana.',
    effect: null, origin: 'Sawah', imageUrl: null, createdBy: 'System Oracle',
  });

  // ---------- ERA 2: BESI (Uncommon T2) ----------
  await upsertItem('6a91b15ba9e03dc91c54bff1', {
    name: 'Batu Bata',
    rank: 'Uncommon', tier: 2, category: 'material',
    basePrice: 25, priceCurrency: 'copper',
    description: 'Tanah liat yang dibakar hingga keras. Fondasi bangunan kota kecil dan dinding kokoh.',
    effect: null, origin: 'Tungku Bata', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bff2', {
    name: 'Papan Kayu',
    rank: 'Uncommon', tier: 2, category: 'material',
    basePrice: 22, priceCurrency: 'copper',
    description: 'Kayu mentah yang sudah digergaji rata. Siap digunakan untuk lantai, dinding, dan perabot.',
    effect: null, origin: 'Penggergajian', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bff3', {
    name: 'Bijih Besi',
    rank: 'Uncommon', tier: 2, category: 'material',
    basePrice: 35, priceCurrency: 'copper',
    description: 'Bijih besi mentah dari lorong tambang. Belum dilebur, masih bercampur batuan.',
    effect: null, origin: 'Tambang', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bff4', {
    name: 'Batu Bara',
    rank: 'Uncommon', tier: 2, category: 'material',
    basePrice: 20, priceCurrency: 'copper',
    description: 'Bahan bakar padat yang menghasilkan panas tinggi. Wajib untuk peleburan logam.',
    effect: null, origin: 'Tambang Batu Bara', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ba9e03dc91c54bff5', {
    name: 'Batangan Besi',
    rank: 'Uncommon', tier: 2, category: 'material',
    basePrice: 90, priceCurrency: 'copper',
    description: 'Besi murni hasil peleburan. Bahan baku senjata, alat, dan konstruksi era besi.',
    effect: null, origin: 'Peleburan Besi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ca9e03dc91c54bffa', {
    name: 'Kulit Samak',
    rank: 'Uncommon', tier: 2, category: 'material',
    basePrice: 50, priceCurrency: 'copper',
    description: 'Kulit mentah yang sudah disamak. Lembut, kuat, dan siap dijahit menjadi baju atau pelana.',
    effect: null, origin: 'Penyamakan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ca9e03dc91c54bffb', {
    name: 'Kapas',
    rank: 'Uncommon', tier: 2, category: 'material',
    basePrice: 15, priceCurrency: 'copper',
    description: 'Serat kapas hasil panen kebun. Bahan baku kain tenun yang lebih halus dari serat liar.',
    effect: null, origin: 'Kebun Kapas', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ca9e03dc91c54bfff', {
    name: 'Minyak Hewani',
    rank: 'Uncommon', tier: 2, category: 'material',
    basePrice: 30, priceCurrency: 'copper',
    description: 'Minyak hasil olahan lemak hewan. Digunakan untuk penerangan, memasak, dan pelumas sederhana.',
    effect: null, origin: 'Pengolahan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ca9e03dc91c54c002', {
    name: 'Beliung Besi',
    rank: 'Uncommon', tier: 2, category: 'none',
    basePrice: 120, priceCurrency: 'copper',
    description: 'Beliung berujung besi tempa. Jauh lebih efisien menambang bijih daripada versi batu. (Durabilitas: 72 jam)',
    effect: null, origin: 'Pandai Besi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ca9e03dc91c54c004', {
    name: 'Cangkul Besi',
    rank: 'Uncommon', tier: 2, category: 'none',
    basePrice: 100, priceCurrency: 'copper',
    description: 'Cangkul berujung besi. Mempercepat pengolahan lahan secara signifikan. (Durabilitas: 72 jam)',
    effect: null, origin: 'Pandai Besi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ca9e03dc91c54c008', {
    name: 'Wajan Besi',
    rank: 'Uncommon', tier: 2, category: 'none',
    basePrice: 80, priceCurrency: 'copper',
    description: 'Wajan tebal dari besi. Tahan panas tinggi, cocok untuk memasak dalam jumlah besar. (Durabilitas: 120 jam)',
    effect: null, origin: 'Pandai Besi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ca9e03dc91c54c013', {
    name: 'Daging Asap',
    rank: 'Uncommon', tier: 2, category: 'consume',
    basePrice: 45, priceCurrency: 'copper',
    description: 'Daging yang diasap hingga tahan lama. Makanan andalan para saudagar dan tentara dalam perjalanan jauh.',
    effect: null, origin: 'Rumah Asap', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ca9e03dc91c54c01a', {
    name: 'Pil Pekerja Keras',
    rank: 'Uncommon', tier: 2, category: 'pill',
    basePrice: 60, priceCurrency: 'copper',
    description: 'Pil herbal sederhana yang menghilangkan rasa lelah pekerja tambang dan ladang selama beberapa jam.',
    effect: null, origin: 'Apotek Desa', imageUrl: null, createdBy: 'System Oracle',
  });

  // ---------- ERA 3: MODERN FANA (Rare T3) ----------
  // Kita "rebrand" item modern agar tetap terasa fana-teknologi, bukan sci-fi murni
  await upsertItem('6a91b15ca9e03dc91c54c01f', {
    name: 'Baja Murni',
    rank: 'Rare', tier: 3, category: 'material',
    basePrice: 25, priceCurrency: 'silver',
    description: 'Baja hasil pemurnian tingkat tinggi. Lebih keras dan lebih ringan dari batangan besi biasa. Fondasi teknologi fana tingkat lanjut.',
    effect: null, origin: 'Pabrik Baja', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15da9e03dc91c54c023', {
    name: 'Semen Campuran',
    rank: 'Rare', tier: 3, category: 'material',
    basePrice: 18, priceCurrency: 'silver',
    description: 'Campuran batu, pasir, dan zat pengikat. Digunakan membangun struktur besar yang tahan lama.',
    effect: null, origin: 'Pabrik Semen', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15da9e03dc91c54c024', {
    name: 'Karet Sintetis',
    rank: 'Rare', tier: 3, category: 'material',
    basePrice: 22, priceCurrency: 'silver',
    description: 'Karet hasil olahan getah + bahan kimia. Elastis dan tahan lama, digunakan untuk berbagai keperluan industri fana.',
    effect: null, origin: 'Fasilitas Karet', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15da9e03dc91c54c029', {
    name: 'Aluminium Ringan',
    rank: 'Rare', tier: 3, category: 'material',
    basePrice: 28, priceCurrency: 'silver',
    description: 'Logam sangat ringan hasil ekstraksi bauksit. Digunakan untuk peralatan presisi dan struktur ringan.',
    effect: null, origin: 'Tambang Aluminium', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15da9e03dc91c54c02a', {
    name: 'Bahan Kimia Asam',
    rank: 'Rare', tier: 3, category: 'material',
    basePrice: 35, priceCurrency: 'silver',
    description: 'Cairan korosif yang dihasilkan di laboratorium kimia. Digunakan untuk pemurnian logam dan proses industri.',
    effect: null, origin: 'Laboratorium Kimia', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15da9e03dc91c54c02e', {
    name: 'Alat Bor Berat',
    rank: 'Rare', tier: 3, category: 'none',
    basePrice: 80, priceCurrency: 'silver',
    description: 'Mesin bor berdaya tinggi. Memungkinkan penambangan jauh lebih dalam dan efisien. (Durabilitas: 96 jam)',
    effect: null, origin: 'Pabrik Mesin', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ca9e03dc91c54c01c', {
    name: 'Pil Pemulih Tulang',
    rank: 'Rare', tier: 3, category: 'pill',
    basePrice: 40, priceCurrency: 'silver',
    description: 'Pil medis fana tingkat lanjut. Mempercepat penyembuhan patah tulang dan luka berat.',
    effect: null, origin: 'Rumah Sakit', imageUrl: null, createdBy: 'System Oracle',
  });

  // ---------- ERA 4-5: WUXIA / IMMORTAL ----------
  await upsertItem('6a91b15ea9e03dc91c54c04d', {
    name: 'Batu Roh Kasar',
    rank: 'Epic', tier: 4, category: 'material',
    basePrice: 25, priceCurrency: 'gold',
    description: 'Batu yang mengandung sisa Qi alam. Bahan dasar formasi dan ladang obat roh. Hanya bisa dipanen di tempat dengan konsentrasi Qi tinggi.',
    effect: null, origin: 'Ladang Qi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ea9e03dc91c54c04e', {
    name: 'Baja Hitam Mistis',
    rank: 'Epic', tier: 4, category: 'material',
    basePrice: 60, priceCurrency: 'gold',
    description: 'Logam yang ditempa dengan api roh. Nyaris tak bisa dihancurkan senjata fana. Bahan utama artefak tingkat lanjut.',
    effect: null, origin: 'Bengkel Artefak', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ea9e03dc91c54c04f', {
    name: 'Kayu Surga',
    rank: 'Epic', tier: 4, category: 'material',
    basePrice: 55, priceCurrency: 'gold',
    description: 'Kayu dari pohon yang tumbuh di tempat Qi padat. Tidak pernah lapuk dan mengeluarkan aroma menenangkan.',
    effect: null, origin: 'Hutan Roh', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ea9e03dc91c54c050', {
    name: 'Cairan Inti Bumi',
    rank: 'Epic', tier: 4, category: 'material',
    basePrice: 90, priceCurrency: 'gold',
    description: 'Cairan panas yang diambil dari kedalaman bumi. Memberi nutrisi ekstrem bagi tanaman roh dan formasi.',
    effect: null, origin: 'Kedalaman Bumi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ea9e03dc91c54c05a', {
    name: 'Tulang Dewa Kuno',
    rank: 'Legendary', tier: 5, category: 'material',
    basePrice: 30, priceCurrency: 'jade',
    description: 'Tulang sisa makhluk tingkat dewa yang sudah mati ribuan tahun. Mengandung hukum alam yang belum terurai.',
    effect: null, origin: 'Reruntuhan Kuno', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ea9e03dc91c54c05c', {
    name: 'Palu Formasi Array',
    rank: 'Legendary', tier: 5, category: 'none',
    basePrice: 8, priceCurrency: 'jade',
    description: 'Palu khusus yang digunakan menempa rune formasi. Setiap pukulan meresonansi dengan hukum ruang. (Durabilitas: 168 jam)',
    effect: null, origin: 'Bengkel Ilahi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ea9e03dc91c54c05d', {
    name: 'Beliung Pelenyap Gunung',
    rank: 'Legendary', tier: 5, category: 'none',
    basePrice: 12, priceCurrency: 'jade',
    description: 'Beliung legendaris yang mampu membelah batuan Qi paling keras. Hanya untuk penambang kristal jiwa. (Durabilitas: 168 jam)',
    effect: null, origin: 'Bengkel Ilahi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ea9e03dc91c54c067', {
    name: 'Pedang Petir Ilahi',
    rank: 'Legendary', tier: 5, category: 'weapon',
    basePrice: 25, priceCurrency: 'jade',
    description: 'Senjata tingkat Immortal. Setiap ayunan memicu kilatan petir. Bilahnya abadi dan tak pernah tumpul. (Durabilitas: Abadi)',
    effect: null, origin: 'Bengkel Artefak Ilahi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15ea9e03dc91c54c06e', {
    name: 'Anggur Giok Berumur Seribu Tahun',
    rank: 'Epic', tier: 4, category: 'consume',
    basePrice: 60, priceCurrency: 'gold',
    description: 'Anggur suci berkilau hijau. Membersihkan sumsum tulang dan memperpanjang umur fana. Sangat berharga di lelang langit.',
    effect: null, origin: 'Ladang Obat Roh', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertItem('6a91b15fa9e03dc91c54c076', {
    name: 'Pil Pengumpul Qi',
    rank: 'Epic', tier: 4, category: 'pill',
    basePrice: 30, priceCurrency: 'gold',
    description: 'Pil emas seukuran ibu jari. Membantu kultivator awal membentuk laut Qi di dalam tubuh. Input wajib Formasi Pengumpulan Qi.',
    effect: null, origin: 'Paviliun Alkimia', imageUrl: null, createdBy: 'System Oracle',
  });

  // Update sisa item yang belum disentuh agar rank/tier/harga lebih konsisten
  // (kita biarkan yang lain tetap ada, hanya pastikan guildId benar)
  console.log('\n  → Memperbaiki guildId semua item yang tersisa...');
  await Item.updateMany(
    { guildId: { $ne: GUILD_ID } },
    { $set: { guildId: GUILD_ID } }
  );

  console.log('\n══════════════════════════════════════');
  console.log('  PHASE 2 — UPDATE ASSETS (50 existing)');
  console.log('══════════════════════════════════════\n');

  // ---------- ASSET PRIMITIF (Common) ----------
  // Profit rendah, construction cepat, material murah

  await upsertAsset('6a91b15fa9e03dc91c54d001', {
    name: 'Sumur Air Tanah',
    rank: 'Common',
    description: '[OUTPUT per jam: 10x Air Bersih]\nSumur galian sederhana yang mencapai mata air bawah tanah. Menyediakan pasokan air bersih yang vital tanpa input bahan, hanya butuh tenaga pekerja aktif.',
    basePrice: 150, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 4,
    buildRequirements: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 50, durabilityHours: 1 },
      { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 30, durabilityHours: 1 },
    ],
    workerInputMaterials: [],
    workerOutputItemId: oid('6a91b15ba9e03dc91c54bfe3'),
    workerOutputItemName: 'Air Bersih',
    workerOutputQuantity: 10,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54d002', {
    name: 'Meja Pengrajin Batu',
    rank: 'Common',
    description: '[CRAFTING STATION]\nMeja kerja kasar dengan alat pemecah batu. Buka menu craft untuk membuat alat-alat batu dasar. Tidak memproduksi otomatis.',
    basePrice: 200, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: true,
    buildable: true,
    constructionTimeHours: 6,
    buildRequirements: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 80, durabilityHours: 1 },
      { itemId: oid('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 100, durabilityHours: 1 },
    ],
    workerInputMaterials: [],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [
      {
        recipeName: 'Asah Batu Tajam',
        resultItemId: oid('6a91b15aa9e03dc91c54bfc5'),
        resultItemName: 'Batu Tajam',
        resultQuantity: 1,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 3, durabilityHours: 1 },
        ],
      },
      {
        recipeName: 'Rakit Kapak Batu',
        resultItemId: oid('6a91b15ba9e03dc91c54bfd1'),
        resultItemName: 'Kapak Batu',
        resultQuantity: 1,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfc5'), itemName: 'Batu Tajam', quantity: 2, durabilityHours: 12 },
          { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 5, durabilityHours: 1 },
          { itemId: oid('6a91b15ba9e03dc91c54bfd6'), itemName: 'Tali Rami', quantity: 1, durabilityHours: 48 },
        ],
      },
      {
        recipeName: 'Rakit Beliung Batu',
        resultItemId: oid('6a91b15ba9e03dc91c54bfd2'),
        resultItemName: 'Beliung Batu',
        resultQuantity: 1,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfc5'), itemName: 'Batu Tajam', quantity: 2, durabilityHours: 12 },
          { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 5, durabilityHours: 1 },
          { itemId: oid('6a91b15ba9e03dc91c54bfd6'), itemName: 'Tali Rami', quantity: 1, durabilityHours: 48 },
        ],
      },
      {
        recipeName: 'Rakit Cangkul Kayu',
        resultItemId: oid('6a91b15ba9e03dc91c54bfd3'),
        resultItemName: 'Cangkul Kayu',
        resultQuantity: 1,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 8, durabilityHours: 1 },
          { itemId: oid('6a91b15aa9e03dc91c54bfc5'), itemName: 'Batu Tajam', quantity: 1, durabilityHours: 12 },
        ],
      },
    ],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c07d', {
    name: 'Pusat Pemotongan Kayu Liar',
    rank: 'Common',
    description: '[BUTUH: 1x Kapak Batu + 1x Air Bersih / jam]\nLahan penebangan kayu liar. Kayu dikumpulkan setiap 2 jam agar tidak lapuk. Fondasi semua konstruksi kayu.',
    basePrice: 80, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 4,
    buildRequirements: [],
    workerInputMaterials: [
      { itemId: oid('6a91b15ba9e03dc91c54bfd1'), itemName: 'Kapak Batu', quantity: 1, durabilityHours: 24 },
      { itemId: oid('6a91b15ba9e03dc91c54bfe3'), itemName: 'Air Bersih', quantity: 1, durabilityHours: 1 },
    ],
    workerOutputItemId: oid('6a91b15aa9e03dc91c54bfc3'),
    workerOutputItemName: 'Kayu Mentah',
    workerOutputQuantity: 12,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c07e', {
    name: 'Kotak Amal Tua',
    rank: 'Common',
    description: 'Kotak kayu tua di pinggir jalan. Orang lewat sesekali memasukkan koin receh karena kasihan. Diambil setiap 8 jam.',
    basePrice: 120, priceCurrency: 'copper',
    dailyProfit: 15, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 2,
    buildRequirements: [],
    workerInputMaterials: [],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c07f', {
    name: 'Lahan Padi Sederhana',
    rank: 'Common',
    description: '[BUTUH: 1x Batu Tajam + 2x Air Bersih + 1x Bibit Padi / jam]\nSawah tadah hujan primitif. Panen lambat, hasil disimpan di gudang kecil setiap 12 jam.',
    basePrice: 250, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 8,
    buildRequirements: [],
    workerInputMaterials: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc5'), itemName: 'Batu Tajam', quantity: 1, durabilityHours: 12 },
      { itemId: oid('6a91b15ba9e03dc91c54bfe3'), itemName: 'Air Bersih', quantity: 2, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bfec'), itemName: 'Bibit Padi', quantity: 1, durabilityHours: 1 },
    ],
    workerOutputItemId: oid('6a91b15ba9e03dc91c54bfed'),
    workerOutputItemName: 'Beras Mentah',
    workerOutputQuantity: 6,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c080', {
    name: 'Tambang Batu Dangkal',
    rank: 'Common',
    description: '[BUTUH: 1x Beliung Batu + 3x Air Bersih + 1x Daging Mentah / jam]\nGalian dangkal untuk batu kasar. Budak kasar mengangkat bongkahan setiap 4 jam di bawah terik matahari.',
    basePrice: 350, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 10,
    buildRequirements: [],
    workerInputMaterials: [
      { itemId: oid('6a91b15ba9e03dc91c54bfd2'), itemName: 'Beliung Batu', quantity: 1, durabilityHours: 24 },
      { itemId: oid('6a91b15ba9e03dc91c54bfe3'), itemName: 'Air Bersih', quantity: 3, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bfe2'), itemName: 'Daging Mentah', quantity: 1, durabilityHours: 1 },
    ],
    workerOutputItemId: oid('6a91b15aa9e03dc91c54bfc2'),
    workerOutputItemName: 'Batu Kasar',
    workerOutputQuantity: 18,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c081', {
    name: 'Peternakan Kelinci Liar',
    rank: 'Common',
    description: '[BUTUH: 10x Daun Kering + 2x Air Bersih / jam]\nKandang berpagar kayu yang menampung kelinci buruan. Daging dipanen setiap 24 jam sekali di pagi buta.',
    basePrice: 450, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 12,
    buildRequirements: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 60, durabilityHours: 1 },
      { itemId: oid('6a91b15aa9e03dc91c54bfc7'), itemName: 'Serat Tumbuhan', quantity: 25, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc4'), itemName: 'Daun Kering', quantity: 10, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bfe3'), itemName: 'Air Bersih', quantity: 2, durabilityHours: 1 },
    ],
    workerOutputItemId: oid('6a91b15ba9e03dc91c54bfe2'),
    workerOutputItemName: 'Daging Mentah',
    workerOutputQuantity: 4,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c082', {
    name: 'Gubuk Anyam Penenun',
    rank: 'Common',
    description: 'Tempat duduk wanita tua yang menenun serat menjadi tali rami. Proses lambat, hasil dikumpulkan setiap 2 hari.',
    basePrice: 550, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: true,
    buildable: true,
    constructionTimeHours: 16,
    buildRequirements: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 120, durabilityHours: 1 },
      { itemId: oid('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 60, durabilityHours: 1 },
    ],
    workerInputMaterials: [],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [
      {
        recipeName: 'Pintal Tali Rami',
        resultItemId: oid('6a91b15ba9e03dc91c54bfd6'),
        resultItemName: 'Tali Rami',
        resultQuantity: 3,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfc7'), itemName: 'Serat Tumbuhan', quantity: 12, durabilityHours: 1 },
        ],
      },
    ],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c083', {
    name: 'Pembakaran Gerabah',
    rank: 'Common',
    description: 'Tungku tanah liat sederhana. Membakar wadah dan periuk dengan api lambat. Membutuhkan tumpukan kayu terus-menerus.',
    basePrice: 650, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: true,
    buildable: true,
    constructionTimeHours: 18,
    buildRequirements: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc6'), itemName: 'Tanah Liat', quantity: 180, durabilityHours: 1 },
      { itemId: oid('6a91b15aa9e03dc91c54bfce'), itemName: 'Lumpur Basah', quantity: 120, durabilityHours: 1 },
    ],
    workerInputMaterials: [],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [
      {
        recipeName: 'Bakar Wadah Tanah Liat',
        resultItemId: oid('6a91b15ba9e03dc91c54bfd8'),
        resultItemName: 'Wadah Tanah Liat',
        resultQuantity: 2,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfc6'), itemName: 'Tanah Liat', quantity: 10, durabilityHours: 1 },
          { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 6, durabilityHours: 1 },
        ],
      },
    ],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c084', {
    name: 'Bilik Pengrajin Senjata Tulang',
    rank: 'Common',
    description: 'Ruang rahasia tempat pemburu meracik belati dan tombak dari tulang hewan buas. Keahlian brutal era prasejarah.',
    basePrice: 900, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: true,
    buildable: true,
    constructionTimeHours: 24,
    buildRequirements: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 350, durabilityHours: 1 },
      { itemId: oid('6a91b15aa9e03dc91c54bfcb'), itemName: 'Tulang Hewan', quantity: 60, durabilityHours: 1 },
    ],
    workerInputMaterials: [],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [
      {
        recipeName: 'Asah Pisau Tulang',
        resultItemId: oid('6a91b15ba9e03dc91c54bfd5'),
        resultItemName: 'Pisau Tulang',
        resultQuantity: 1,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfcb'), itemName: 'Tulang Hewan', quantity: 4, durabilityHours: 1 },
          { itemId: oid('6a91b15aa9e03dc91c54bfc5'), itemName: 'Batu Tajam', quantity: 1, durabilityHours: 12 },
        ],
      },
      {
        recipeName: 'Rakit Tombak Bambu',
        resultItemId: oid('6a91b15ba9e03dc91c54bfdc'),
        resultItemName: 'Tombak Bambu',
        resultQuantity: 1,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfcf'), itemName: 'Bambu Hijau', quantity: 6, durabilityHours: 1 },
          { itemId: oid('6a91b15ba9e03dc91c54bfd6'), itemName: 'Tali Rami', quantity: 1, durabilityHours: 1 },
          { itemId: oid('6a91b15ba9e03dc91c54bfd9'), itemName: 'Batu Api', quantity: 1, durabilityHours: 72 },
        ],
      },
    ],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c085', {
    name: 'Pemancingan Muara',
    rank: 'Common',
    description: '[BUTUH: 1x Pancingan Bambu + 8x Bibit Padi / jam]\nJaring statis di muara sungai. Dicek setiap 8 jam saat air pasang surut.',
    basePrice: 550, priceCurrency: 'copper',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 14,
    buildRequirements: [
      { itemId: oid('6a91b15aa9e03dc91c54bfcf'), itemName: 'Bambu Hijau', quantity: 120, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bfd6'), itemName: 'Tali Rami', quantity: 25, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15ba9e03dc91c54bfd4'), itemName: 'Pancingan Bambu', quantity: 1, durabilityHours: 36 },
      { itemId: oid('6a91b15ba9e03dc91c54bfec'), itemName: 'Bibit Padi', quantity: 8, durabilityHours: 1 },
    ],
    workerOutputItemId: oid('6a91b15ba9e03dc91c54bfe6'),
    workerOutputItemName: 'Ikan Segar',
    workerOutputQuantity: 10,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b15fa9e03dc91c54c086', {
    name: 'Kios Buah Liar',
    rank: 'Common',
    description: '[BUTUH: 3x Buah Liar / jam]\nTenda kecil di pinggir jalan. Pejalan kaki membeli buah hutan. Uang dikosongkan ke brankas setiap 12 jam.',
    basePrice: 15, priceCurrency: 'silver',
    dailyProfit: 12, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 20,
    buildRequirements: [
      { itemId: oid('6a91b15ba9e03dc91c54bff2'), itemName: 'Papan Kayu', quantity: 40, durabilityHours: 1 },
      { itemId: oid('6a91b15aa9e03dc91c54bfc4'), itemName: 'Daun Kering', quantity: 150, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15ba9e03dc91c54bfe4'), itemName: 'Buah Liar', quantity: 3, durabilityHours: 1 },
    ],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  // ---------- ASSET ERA BESI (Uncommon) ----------
  await upsertAsset('6a91b15fa9e03dc91c54c087', {
    name: 'Pabrik Penggergajian Papan',
    rank: 'Uncommon',
    description: 'Mengubah kayu balok menjadi papan siap bangun. Suara gergaji tidak pernah berhenti. Papan dikirim ke pasar setiap 6 jam.',
    basePrice: 8, priceCurrency: 'silver',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: true,
    buildable: true,
    constructionTimeHours: 36,
    buildRequirements: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 600, durabilityHours: 1 },
      { itemId: oid('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 350, durabilityHours: 1 },
    ],
    workerInputMaterials: [],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [
      {
        recipeName: 'Gergaji Papan',
        resultItemId: oid('6a91b15ba9e03dc91c54bff2'),
        resultItemName: 'Papan Kayu',
        resultQuantity: 3,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 4, durabilityHours: 1 },
          { itemId: oid('6a91b15aa9e03dc91c54bfc5'), itemName: 'Batu Tajam', quantity: 1, durabilityHours: 24 },
        ],
      },
    ],
    imageUrl: null, createdBy: 'System Oracle',
  });

  // Warung Teh (profit asset)
  await upsertAsset('6a91b160a9e03dc91c54c0a2', {
    name: 'Rumah Penginapan (Inn)',
    rank: 'Uncommon',
    description: '[BUTUH: 2x Makanan Matang + 5x Air Bersih / jam]\nMenyediakan tempat tidur bagi saudagar keliling. Uang sewa dipungut setiap 12 jam sekali.',
    basePrice: 12, priceCurrency: 'gold',
    dailyProfit: 8, profitCurrency: 'silver',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 120,
    buildRequirements: [
      { itemId: oid('6a91b15ba9e03dc91c54bff1'), itemName: 'Batu Bata', quantity: 2000, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bff2'), itemName: 'Papan Kayu', quantity: 800, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15ba9e03dc91c54bfe5'), itemName: 'Makanan Matang', quantity: 2, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bfe3'), itemName: 'Air Bersih', quantity: 5, durabilityHours: 1 },
    ],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b160a9e03dc91c54c0a3', {
    name: 'Toko Senjata Pandai Besi',
    rank: 'Uncommon',
    description: '[BUTUH: 1x Batu Bara + 1x Batangan Besi / jam]\nToko perlengkapan fana untuk tentara dan petualang. Keuntungan disetor setiap shift malam.',
    basePrice: 8, priceCurrency: 'gold',
    dailyProfit: 6, profitCurrency: 'silver',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 90,
    buildRequirements: [
      { itemId: oid('6a91b15ba9e03dc91c54bff1'), itemName: 'Batu Bata', quantity: 2500, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15ba9e03dc91c54bff4'), itemName: 'Batu Bara', quantity: 1, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bff5'), itemName: 'Batangan Besi', quantity: 1, durabilityHours: 1 },
    ],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b160a9e03dc91c54c0a4', {
    name: 'Penyamakan Kulit',
    rank: 'Uncommon',
    description: 'Bahan kimia menyengat mengubah kulit mentah menjadi kulit samak siap jahit. Proses bau tapi sangat menguntungkan.',
    basePrice: 6, priceCurrency: 'gold',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: true,
    buildable: true,
    constructionTimeHours: 48,
    buildRequirements: [
      { itemId: oid('6a91b15ba9e03dc91c54bff2'), itemName: 'Papan Kayu', quantity: 900, durabilityHours: 1 },
    ],
    workerInputMaterials: [],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [
      {
        recipeName: 'Samak Kulit',
        resultItemId: oid('6a91b15ca9e03dc91c54bffa'),
        resultItemName: 'Kulit Samak',
        resultQuantity: 2,
        materials: [
          { itemId: oid('6a91b15aa9e03dc91c54bfca'), itemName: 'Kulit Mentah', quantity: 5, durabilityHours: 1 },
          { itemId: oid('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 1, durabilityHours: 1 },
        ],
        craftingTimeHours: 1,
      },
    ],
    imageUrl: null, createdBy: 'System Oracle',
  });

  // ---------- ASSET ERA MODERN (Rare) — rebalanced ----------
  await upsertAsset('6a91b160a9e03dc91c54c0a5', {
    name: 'Pabrik Semen Raksasa',
    rank: 'Rare',
    description: '[BUTUH: 80x Batu Kasar + 8x Batu Bara / jam]\nMencampur batu dan zat pengikat menjadi material beton. Fondasi bangunan besar fana.',
    basePrice: 45, priceCurrency: 'gold',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 180,
    buildRequirements: [
      { itemId: oid('6a91b15ba9e03dc91c54bff5'), itemName: 'Batangan Besi', quantity: 1800, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bff1'), itemName: 'Batu Bata', quantity: 4500, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 80, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bff4'), itemName: 'Batu Bara', quantity: 8, durabilityHours: 1 },
    ],
    workerOutputItemId: oid('6a91b15da9e03dc91c54c023'),
    workerOutputItemName: 'Semen Campuran',
    workerOutputQuantity: 8,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b160a9e03dc91c54c0a6', {
    name: 'Fasilitas Pembuatan Karet',
    rank: 'Rare',
    description: '[BUTUH: 40x Getah Pohon + 2x Bahan Kimia Asam / jam]\nMerebus getah dan bahan kimia menjadi karet sintetis yang elastis.',
    basePrice: 55, priceCurrency: 'gold',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 200,
    buildRequirements: [
      { itemId: oid('6a91b15ca9e03dc91c54c01f'), itemName: 'Baja Murni', quantity: 1200, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15aa9e03dc91c54bfc8'), itemName: 'Getah Pohon', quantity: 40, durabilityHours: 1 },
      { itemId: oid('6a91b15da9e03dc91c54c02a'), itemName: 'Bahan Kimia Asam', quantity: 2, durabilityHours: 1 },
    ],
    workerOutputItemId: oid('6a91b15da9e03dc91c54c024'),
    workerOutputItemName: 'Karet Sintetis',
    workerOutputQuantity: 6,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b160a9e03dc91c54c0a7', {
    name: 'Tambang Aluminium',
    rank: 'Rare',
    description: '[BUTUH: 1x Alat Bor Berat + 2x Bahan Kimia Asam / jam]\nMenyedot bauksit dan mencetaknya menjadi logam super ringan.',
    basePrice: 70, priceCurrency: 'gold',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 220,
    buildRequirements: [
      { itemId: oid('6a91b15ca9e03dc91c54c01f'), itemName: 'Baja Murni', quantity: 2200, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15da9e03dc91c54c02e'), itemName: 'Alat Bor Berat', quantity: 1, durabilityHours: 96 },
      { itemId: oid('6a91b15da9e03dc91c54c02a'), itemName: 'Bahan Kimia Asam', quantity: 2, durabilityHours: 1 },
    ],
    workerOutputItemId: oid('6a91b15da9e03dc91c54c029'),
    workerOutputItemName: 'Aluminium Ringan',
    workerOutputQuantity: 4,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b160a9e03dc91c54c0a9', {
    name: 'Rumah Sakit Modern',
    rank: 'Rare',
    description: '[BUTUH: 1x Pil Pemulih Tulang + 15x Air Bersih / jam]\nFasilitas medis fana tingkat lanjut. Pembayaran jasa medis diklaim setiap minggu.',
    basePrice: 80, priceCurrency: 'gold',
    dailyProfit: 25, profitCurrency: 'silver',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 400,
    buildRequirements: [
      { itemId: oid('6a91b15da9e03dc91c54c023'), itemName: 'Semen Campuran', quantity: 8000, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15ca9e03dc91c54c01c'), itemName: 'Pil Pemulih Tulang', quantity: 1, durabilityHours: 1 },
      { itemId: oid('6a91b15ba9e03dc91c54bfe3'), itemName: 'Air Bersih', quantity: 15, durabilityHours: 1 },
    ],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  // ---------- ASSET WUXIA / IMMORTAL ----------
  // Profit di-cap ketat
  await upsertAsset('6a91b160a9e03dc91c54c0aa', {
    name: 'Ladang Obat Roh (Spirit Herb Garden)',
    rank: 'Epic',
    description: '[BUTUH: 1x Cairan Inti Bumi / jam]\nLahan sakti dengan tanah bernapas. Ginseng dan Teratai menyerap esensi matahari-bulan. Panen utama 3 bulan sekali, tapi menghasilkan uang setiap hari.',
    basePrice: 8, priceCurrency: 'jade',
    dailyProfit: 40, profitCurrency: 'silver', // 0.4 Gold
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 720, // 30 hari
    buildRequirements: [
      { itemId: oid('6a91b15ea9e03dc91c54c04d'), itemName: 'Batu Roh Kasar', quantity: 6000, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15ea9e03dc91c54c050'), itemName: 'Cairan Inti Bumi', quantity: 1, durabilityHours: 1 },
    ],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b160a9e03dc91c54c0ab', {
    name: 'Tambang Kristal Jiwa',
    rank: 'Epic',
    description: '[BUTUH: 1x Beliung Pelenyap Gunung / jam]\nMenembus batuan angkasa untuk mengekstrak sisa ingatan dewa kuno. Sangat berbahaya dan lambat.',
    basePrice: 12, priceCurrency: 'jade',
    dailyProfit: 55, profitCurrency: 'silver', // 0.55 Gold
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 900,
    buildRequirements: [
      { itemId: oid('6a91b15ea9e03dc91c54c04e'), itemName: 'Baja Hitam Mistis', quantity: 2500, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15ea9e03dc91c54c05d'), itemName: 'Beliung Pelenyap Gunung', quantity: 1, durabilityHours: 168 },
    ],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b160a9e03dc91c54c0ac', {
    name: 'Istana Lelang Langit (Heavenly Auction House)',
    rank: 'Legendary',
    description: '[BUTUH: 1x Anggur Giok Berumur Seribu Tahun / jam]\nTempat bertukar harta setingkat dewa. Komisi perantara mengalir tanpa henti. Asset paling prestisius.',
    basePrice: 40, priceCurrency: 'jade',
    dailyProfit: 2, profitCurrency: 'gold', // 2 Gold (masih di bawah cap 2.5)
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 1440, // 60 hari
    buildRequirements: [
      { itemId: oid('6a91b15ea9e03dc91c54c04f'), itemName: 'Kayu Surga', quantity: 5000, durabilityHours: 1 },
      { itemId: oid('6a91b15ea9e03dc91c54c04e'), itemName: 'Baja Hitam Mistis', quantity: 5000, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15ea9e03dc91c54c06e'), itemName: 'Anggur Giok Berumur Seribu Tahun', quantity: 1, durabilityHours: 1 },
    ],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b160a9e03dc91c54c0ad', {
    name: 'Formasi Pengumpulan Qi',
    rank: 'Epic',
    description: '[BUTUH: 1x Pil Pengumpul Qi / jam]\nLantai bercahaya rune kuno yang memadatkan aura alam menjadi batu roh kasar. Asset favorit kultivator.',
    basePrice: 18, priceCurrency: 'jade',
    dailyProfit: 35, profitCurrency: 'silver',
    isCraftingStation: false,
    buildable: true,
    constructionTimeHours: 600,
    buildRequirements: [
      { itemId: oid('6a91b15ea9e03dc91c54c04d'), itemName: 'Batu Roh Kasar', quantity: 1500, durabilityHours: 1 },
    ],
    workerInputMaterials: [
      { itemId: oid('6a91b15fa9e03dc91c54c076'), itemName: 'Pil Pengumpul Qi', quantity: 1, durabilityHours: 1 },
    ],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [],
    imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertAsset('6a91b160a9e03dc91c54c0ae', {
    name: 'Bengkel Artefak Ilahi',
    rank: 'Epic',
    description: 'Bara api nirwana menempa harta dunia abadi siang dan malam. Satu-satunya tempat di mana Pedang Petir Ilahi bisa dibuat.',
    basePrice: 30, priceCurrency: 'jade',
    dailyProfit: 0, profitCurrency: 'copper',
    isCraftingStation: true,
    buildable: true,
    constructionTimeHours: 1000,
    buildRequirements: [
      { itemId: oid('6a91b15ea9e03dc91c54c04e'), itemName: 'Baja Hitam Mistis', quantity: 6000, durabilityHours: 1 },
    ],
    workerInputMaterials: [],
    workerOutputItemId: null, workerOutputItemName: null, workerOutputQuantity: 0,
    recipes: [
      {
        recipeName: 'Tempa Pedang Petir Ilahi',
        resultItemId: oid('6a91b15ea9e03dc91c54c067'),
        resultItemName: 'Pedang Petir Ilahi',
        resultQuantity: 1,
        materials: [
          { itemId: oid('6a91b15ea9e03dc91c54c05a'), itemName: 'Tulang Dewa Kuno', quantity: 12, durabilityHours: 1 },
          { itemId: oid('6a91b15ea9e03dc91c54c05c'), itemName: 'Palu Formasi Array', quantity: 1, durabilityHours: 168 },
        ],
        craftingTimeHours: 336,
      },
    ],
    imageUrl: null, createdBy: 'System Oracle',
  });

  // Pastikan semua asset lain punya guildId benar
  console.log('\n  → Memperbaiki guildId semua asset yang tersisa...');
  await Asset.updateMany(
    { guildId: { $ne: GUILD_ID } },
    { $set: { guildId: GUILD_ID } }
  );

  console.log('\n══════════════════════════════════════');
  console.log('  PHASE 3 — UPDATE PETS');
  console.log('══════════════════════════════════════\n');

  // Rebalance pets + deskripsi lebih Xianxia
  await upsertPet('6a91b160a9e03dc91c54c0af', {
    name: 'Anjing Hutan',
    rank: 'Common', tier: 1,
    baseHp: 45, baseAtk: 6, baseDef: 4, baseSpd: 9,
    growthRate: 1.0, maxLevel: 100, element: 'Netral',
    basePrice: 60, priceCurrency: 'copper',
    description: 'Anjing liar yang paling setia. Pandai memperingatkan bahaya dan menemani pemburu di hutan lebat.',
    effect: null, origin: 'Hutan Liar', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b160a9e03dc91c54c0b0', {
    name: 'Babi Hutan Liar',
    rank: 'Common', tier: 1,
    baseHp: 70, baseAtk: 5, baseDef: 6, baseSpd: 5,
    growthRate: 1.0, maxLevel: 100, element: 'Tanah',
    basePrice: 90, priceCurrency: 'copper',
    description: 'Babi bertaring tajam yang mampu menyeruduk batang pohon kecil. Cocok untuk latihan menghindari serangan frontal.',
    effect: null, origin: 'Hutan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b160a9e03dc91c54c0b1', {
    name: 'Kucing Liar Ganas',
    rank: 'Common', tier: 1,
    baseHp: 38, baseAtk: 9, baseDef: 3, baseSpd: 12,
    growthRate: 1.05, maxLevel: 100, element: 'Netral',
    basePrice: 55, priceCurrency: 'copper',
    description: 'Kucing penyendiri dengan cakar tajam. Sulit dijinakkan, tapi sangat lincah dalam jarak dekat.',
    effect: null, origin: 'Hutan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b160a9e03dc91c54c0b2', {
    name: 'Ular Sawah Berbisa',
    rank: 'Common', tier: 1,
    baseHp: 32, baseAtk: 10, baseDef: 2, baseSpd: 8,
    growthRate: 1.0, maxLevel: 100, element: 'Air',
    basePrice: 70, priceCurrency: 'copper',
    description: 'Ular kecil berbisa yang membuat petani waspada. Peliharaan eksotis pertama bagi yang berani.',
    effect: null, origin: 'Sawah', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b160a9e03dc91c54c0b3', {
    name: 'Serigala Besi',
    rank: 'Uncommon', tier: 2,
    baseHp: 110, baseAtk: 18, baseDef: 8, baseSpd: 11,
    growthRate: 1.1, maxLevel: 100, element: 'Tanah',
    basePrice: 8, priceCurrency: 'silver',
    description: 'Serigala yang tulangnya mengeras karena air tercemar bijih. Gigitannya meremukkan tulang fana.',
    effect: null, origin: 'Pegunungan', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b160a9e03dc91c54c0b4', {
    name: 'Beruang Gua',
    rank: 'Uncommon', tier: 2,
    baseHp: 180, baseAtk: 12, baseDef: 14, baseSpd: 5,
    growthRate: 1.05, maxLevel: 100, element: 'Tanah',
    basePrice: 12, priceCurrency: 'silver',
    description: 'Raksasa berbulu tebal penghuni gua bijih. Jika dilatih, menjadi perisai hidup yang tak tergoyahkan.',
    effect: null, origin: 'Gua Tambang', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b160a9e03dc91c54c0b5', {
    name: 'Gagak Pengintai',
    rank: 'Uncommon', tier: 2,
    baseHp: 55, baseAtk: 14, baseDef: 4, baseSpd: 16,
    growthRate: 1.15, maxLevel: 100, element: 'Angin',
    basePrice: 9, priceCurrency: 'silver',
    description: 'Burung hitam dengan kecerdasan di luar nalar. Mampu mengintai markas musuh tanpa dicurigai.',
    effect: null, origin: 'Langit', imageUrl: null, createdBy: 'System Oracle',
  });

  // Rebrand modern pets agar lebih Xianxia
  await upsertPet('6a91b161a9e03dc91c54c0b6', {
    name: 'Elang Baja',
    rank: 'Rare', tier: 3,
    baseHp: 160, baseAtk: 38, baseDef: 12, baseSpd: 20,
    growthRate: 1.2, maxLevel: 100, element: 'Angin',
    basePrice: 4, priceCurrency: 'gold',
    description: 'Elang mutan dengan bulu sekeras pelat baja. Berevolusi di daerah kaya logam. Pemangsa langit yang ditakuti.',
    effect: null, origin: 'Pegunungan Logam', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b161a9e03dc91c54c0b7', {
    name: 'Macan Tutul Api',
    rank: 'Rare', tier: 3,
    baseHp: 150, baseAtk: 48, baseDef: 10, baseSpd: 18,
    growthRate: 1.25, maxLevel: 100, element: 'Api',
    basePrice: 5, priceCurrency: 'gold',
    description: 'Macan tutul yang uratnya mengandung api roh. Sangat cepat dan ganas. Dulu disebut "Cyborg" oleh fana yang tak paham Qi.',
    effect: null, origin: 'Hutan Api', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b161a9e03dc91c54c0b8', {
    name: 'Gorila Ganas',
    rank: 'Rare', tier: 3,
    baseHp: 320, baseAtk: 28, baseDef: 18, baseSpd: 7,
    growthRate: 1.1, maxLevel: 100, element: 'Netral',
    basePrice: 6, priceCurrency: 'gold',
    description: 'Gorila raksasa hasil eksperimen sekte sesat. Kehilangan akal sehat, meninju baja seolah tahu lunak.',
    effect: null, origin: 'Laboratorium Sesat', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b161a9e03dc91c54c0b9', {
    name: 'Singa Api Neraka',
    rank: 'Epic', tier: 4,
    baseHp: 550, baseAtk: 85, baseDef: 22, baseSpd: 14,
    growthRate: 1.3, maxLevel: 100, element: 'Api',
    basePrice: 8, priceCurrency: 'jade',
    description: 'Penjaga kawah magma sekte kuno. Napasnya membakar radius seratus meter menjadi abu.',
    effect: null, origin: 'Kawah Magma', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b161a9e03dc91c54c0ba', {
    name: 'Rubah Ekor Sembilan Ilusi',
    rank: 'Epic', tier: 4,
    baseHp: 380, baseAtk: 120, baseDef: 15, baseSpd: 22,
    growthRate: 1.35, maxLevel: 100, element: 'Cahaya',
    basePrice: 12, priceCurrency: 'jade',
    description: 'Binatang roh cantik nan mematikan. Pandangannya memicu ilusi kematian sehingga musuh bunuh diri sendiri.',
    effect: null, origin: 'Hutan Ilusi', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b161a9e03dc91c54c0bb', {
    name: 'Penyu Batu Hitam Kuno',
    rank: 'Epic', tier: 4,
    baseHp: 1100, baseAtk: 35, baseDef: 45, baseSpd: 3,
    growthRate: 1.15, maxLevel: 100, element: 'Tanah',
    basePrice: 15, priceCurrency: 'jade',
    description: 'Membawa replika gunung kecil di atas cangkangnya. Pertahanannya nyaris mustahil ditembus senjata fana.',
    effect: null, origin: 'Lautan Kuno', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b161a9e03dc91c54c0bc', {
    name: 'Naga Langit Azure',
    rank: 'Legendary', tier: 5,
    baseHp: 1800, baseAtk: 260, baseDef: 40, baseSpd: 25,
    growthRate: 1.5, maxLevel: 100, element: 'Air',
    basePrice: 45, priceCurrency: 'jade',
    description: 'Mitologi nyata dari awal mula kosmos. Menguasai awan dan badai. Raungannya membelah lautan dan menggetarkan surga.',
    effect: null, origin: 'Langit Azure', imageUrl: null, createdBy: 'System Oracle',
  });

  await upsertPet('6a91b161a9e03dc91c54c0bd', {
    name: 'Kylin Petir Penghakiman',
    rank: 'Legendary', tier: 5,
    baseHp: 1600, baseAtk: 310, baseDef: 35, baseSpd: 28,
    growthRate: 1.55, maxLevel: 100, element: 'Petir',
    basePrice: 50, priceCurrency: 'jade',
    description: 'Entitas suci berkaki kuda bernapas guntur. Menghakimi jiwa berdosa tanpa ampun. Langkahnya memicu guntur dimensi.',
    effect: null, origin: 'Surga Petir', imageUrl: null, createdBy: 'System Oracle',
  });

  console.log('\n  → Memperbaiki guildId semua pet...');
  await Pet.updateMany(
    { guildId: { $ne: GUILD_ID } },
    { $set: { guildId: GUILD_ID } }
  );

  console.log('\n══════════════════════════════════════');
  console.log('  PHASE 4 — SHOP (hanya starter)');
  console.log('══════════════════════════════════════\n');

  // Shop hanya material + tool paling dasar agar pemain terpaksa trade
  await clearAndSeedShop([
    // Material dasar
    { refId: '6a91b15aa9e03dc91c54bfc2', price: 5,  priceCurrency: 'copper' }, // Batu Kasar
    { refId: '6a91b15aa9e03dc91c54bfc3', price: 5,  priceCurrency: 'copper' }, // Kayu Mentah
    { refId: '6a91b15aa9e03dc91c54bfc4', price: 2,  priceCurrency: 'copper' }, // Daun Kering
    { refId: '6a91b15aa9e03dc91c54bfc5', price: 12, priceCurrency: 'copper' }, // Batu Tajam
    { refId: '6a91b15aa9e03dc91c54bfc6', price: 4,  priceCurrency: 'copper' }, // Tanah Liat
    { refId: '6a91b15aa9e03dc91c54bfc7', price: 3,  priceCurrency: 'copper' }, // Serat Tumbuhan
    { refId: '6a91b15aa9e03dc91c54bfc8', price: 6,  priceCurrency: 'copper' }, // Getah Pohon
    { refId: '6a91b15aa9e03dc91c54bfc9', price: 8,  priceCurrency: 'copper' }, // Bulu Hewan
    { refId: '6a91b15ba9e03dc91c54bfe3', price: 5,  priceCurrency: 'copper' }, // Air Bersih
    { refId: '6a91b15ba9e03dc91c54bfec', price: 6,  priceCurrency: 'copper' }, // Bibit Padi
    { refId: '6a91b15ba9e03dc91c54bfe2', price: 18, priceCurrency: 'copper' }, // Daging Mentah
    { refId: '6a91b15ba9e03dc91c54bfe4', price: 8,  priceCurrency: 'copper' }, // Buah Liar
    // Tools starter
    { refId: '6a91b15ba9e03dc91c54bfd1', price: 30, priceCurrency: 'copper' }, // Kapak Batu
    { refId: '6a91b15ba9e03dc91c54bfd2', price: 30, priceCurrency: 'copper' }, // Beliung Batu
    { refId: '6a91b15ba9e03dc91c54bfd3', price: 25, priceCurrency: 'copper' }, // Cangkul Kayu
    { refId: '6a91b15ba9e03dc91c54bfd4', price: 35, priceCurrency: 'copper' }, // Pancingan Bambu
    { refId: '6a91b15ba9e03dc91c54bfd5', price: 28, priceCurrency: 'copper' }, // Pisau Tulang
    { refId: '6a91b15ba9e03dc91c54bfd9', price: 22, priceCurrency: 'copper' }, // Batu Api
  ]);

  console.log('\n══════════════════════════════════════');
  console.log('  SELESAI — ECONOMY OVERHAUL');
  console.log('══════════════════════════════════════');
  console.log(`
Ringkasan yang diterapkan:
• Semua ObjectId lama dipertahankan (ownership aman)
• Guild ID diganti ke ${GUILD_ID}
• Harga & profit di-rebalance keras
• Max personal profit ≈ 2 Gold (Istana Lelang)
• Shop hanya 18 item starter
• Deskripsi dibuat lebih hidup & konsisten
• Material chain diperkuat (trade wajib)
• Pet di-rebrand agar lebih Xianxia

Langkah selanjutnya:
1. Jalankan: node script.js
2. Cek di Discord: /shop lihat, /asset cek, /item cek
3. Jika ingin tambah item/asset baru lagi, bilang saja.
`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
