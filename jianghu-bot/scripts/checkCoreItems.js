const mongoose = require('mongoose');
require('dotenv').config();
const Item = require('../models/Item');

const CORE_GATHER_ITEMS = [
  'Herba Roh Bunga Melati',
  'Bijih Besi Roh Murni',
  'Kayu Cendana Spiritual',
  'Ikan Mas Sisik Emas'
];

const CORE_FISH_ITEMS = [
  'Ikan Koi Pelangi',
  'Ikan Roh Sisik Biru',
  'Belut Listrik Spiritual',
  'Ikan Salmon Giok Dingin'
];

async function checkCoreItems() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu';
  console.log(`[CHECK-CORE-ITEMS] Connecting to MongoDB: ${uri}`);
  
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log('[CHECK-CORE-ITEMS] Connected successfully.');

    const allTargets = [...CORE_GATHER_ITEMS, ...CORE_FISH_ITEMS];
    const foundItems = await Item.find({ name: { $in: allTargets } }).select('name type category rarity').lean();
    
    const foundNames = new Set(foundItems.map(i => i.name));
    const missing = allTargets.filter(name => !foundNames.has(name));

    console.log('\n--- STATUS ITEM INTI DUNIA & IKAN ---');
    console.log(`Ditemukan: ${foundItems.length} dari ${allTargets.length} item.`);
    for (const item of foundItems) {
      console.log(`  [OK] ${item.name} (${item.type || item.category || 'material'}, ${item.rarity || 'common'})`);
    }

    if (missing.length > 0) {
      console.log('\n[PERINGATAN] Item berikut BELUM ADA di database:');
      for (const m of missing) {
        console.log(`  [HILANG] "${m}"`);
      }
      console.log('\n[SEEDING] Menjalankan ensureCoreItems()...');
      const { ensureCoreItems } = require('../services/coreItems');
      await ensureCoreItems();

      const refound = await Item.find({ name: { $in: allTargets } }).select('name type category rarity').lean();
      console.log(`\n[SUKSES] Setelah penyelarasan: ${refound.length} dari ${allTargets.length} item aktif di database.`);
    } else {
      console.log('\n[SUKSES] Semua item inti dunia lengkap dan siap digunakan.');
    }

    await mongoose.disconnect();
    return { ok: true, found: foundItems.length, missing };
  } catch (err) {
    console.warn(`[CHECK-CORE-ITEMS] Tidak dapat terhubung ke MongoDB lokal (${err.message}).`);
    console.log('[INFO] Pastikan MongoDB aktif saat menjalankan bot atau gunakan mongodb-memory-server pada tes otomatis.');
    return { ok: false, error: err.message };
  }
}

if (require.main === module) {
  checkCoreItems().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { checkCoreItems, CORE_GATHER_ITEMS, CORE_FISH_ITEMS };
