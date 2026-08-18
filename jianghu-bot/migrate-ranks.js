// Jalankan SEKALI SAJA setelah update kode ini di VPS (kalau bot kamu sudah pernah dipakai sebelumnya):
//   node migrate-ranks.js
//
// Script ini mengubah rank lama (Fan-Grade, Huang-Grade, dst) yang tersimpan di database
// menjadi rank baru berbahasa Inggris (Common, Uncommon, dst), supaya data item/pet/asset lama
// yang sudah dibuat sebelumnya TIDAK RUSAK dan tetap bisa diedit dengan modal yang baru.
//
// Aman dijalankan berkali-kali (idempotent) — kalau rank sudah baru, tidak akan diubah lagi.

require('dotenv').config();
const mongoose = require('mongoose');

const RANK_MAP = {
  'Fan-Grade': 'Common',
  'Huang-Grade': 'Uncommon',
  'Xuan-Grade': 'Rare',
  'Di-Grade': 'Epic',
  'Tian-Grade': 'Legendary',
  'Sheng-Grade': 'Mythical',
};

async function migrateCollection(collectionName) {
  const db = mongoose.connection.db;
  const collection = db.collection(collectionName);
  let totalUpdated = 0;

  for (const [oldRank, newRank] of Object.entries(RANK_MAP)) {
    const result = await collection.updateMany({ rank: oldRank }, { $set: { rank: newRank } });
    if (result.modifiedCount > 0) {
      console.log(`  [${collectionName}] ${oldRank} -> ${newRank}: ${result.modifiedCount} dokumen diupdate`);
      totalUpdated += result.modifiedCount;
    }
  }
  return totalUpdated;
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[MIGRATE] Terhubung ke database.\n');

    console.log('Migrasi koleksi "items"...');
    const itemsUpdated = await migrateCollection('items');

    console.log('Migrasi koleksi "pets"...');
    const petsUpdated = await migrateCollection('pets');

    console.log('Migrasi koleksi "assets"...');
    const assetsUpdated = await migrateCollection('assets');

    console.log(`\n[MIGRATE] Selesai! Total dokumen diupdate: ${itemsUpdated + petsUpdated + assetsUpdated}`);
    console.log('[MIGRATE] Item/pet/asset lama yang basePrice-nya masih 0 (default) akan otomatis dianggap "belum dijual/tidak bisa dijual ke sistem" sampai kamu set harga lewat /admin-edit-item, /admin-edit-pet, atau /admin-edit-asset.');
  } catch (err) {
    console.error('[MIGRATE] Gagal migrasi:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
