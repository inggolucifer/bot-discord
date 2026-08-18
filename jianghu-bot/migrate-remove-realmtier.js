// Jalankan SEKALI SAJA setelah update ini (sistem tier ranah dihapus, cukup nama ranah saja).
// Script ini membersihkan field "realmTier" yang lama dari semua dokumen Player supaya database
// rapi (field ini sudah tidak dipakai kode manapun lagi, jadi aman dihapus / dibiarkan pun tidak masalah,
// tapi lebih bersih kalau dihapus).
//
// Aman dijalankan berkali-kali. TIDAK mengubah data lain (currency, inventory, dll tetap utuh).

require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[MIGRATE-REALM] Terhubung ke database.\n');

    const db = mongoose.connection.db;
    const result = await db.collection('players').updateMany(
      { realmTier: { $exists: true } },
      { $unset: { realmTier: '' } }
    );

    console.log(`[MIGRATE-REALM] Selesai! Field "realmTier" dibersihkan dari ${result.modifiedCount} player.`);
    console.log('[MIGRATE-REALM] Ranah sekarang murni teks tanpa tier, siap dipakai untuk auto-role.');
  } catch (err) {
    console.error('[MIGRATE-REALM] Gagal migrasi:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();

