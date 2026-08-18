// Jalankan SEKALI SAJA setelah update fitur baru ini (leaderboard butuh field totalWealth
// yang baru ditambahkan). Script ini menghitung ulang totalWealth SEMUA player yang sudah
// terdaftar sebelumnya, supaya /leaderboard langsung akurat sejak awal (tidak perlu nunggu
// mereka bertransaksi dulu).
//
// Aman dijalankan berkali-kali (idempotent), TIDAK mengubah currency/inventory/apapun selain
// field totalWealth (yang memang murni hasil hitungan, bukan data manual).
//
// Cara pakai: node migrate-wealth.js

require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[MIGRATE-WEALTH] Terhubung ke database.\n');

    const players = await Player.find({});
    console.log(`[MIGRATE-WEALTH] Menghitung ulang totalWealth untuk ${players.length} player...`);

    let updated = 0;
    for (const player of players) {
      // .save() otomatis memicu pre-save hook yang menghitung ulang totalWealth dari currency saat ini
      await player.save();
      updated++;
    }

    console.log(`\n[MIGRATE-WEALTH] Selesai! ${updated} player berhasil diupdate totalWealth-nya.`);
    console.log('[MIGRATE-WEALTH] /leaderboard sekarang sudah akurat sejak awal.');
  } catch (err) {
    console.error('[MIGRATE-WEALTH] Gagal migrasi:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();

