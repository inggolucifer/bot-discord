// Jalankan SEKALI SAJA setelah update ini (sistem currency sekarang otomatis "naik tingkat":
// 100 Silver -> 1 Gold, 100 Gold -> 1 Jade, 100 Jade -> 1 Spirit).
//
// Script ini merapikan SEMUA player & sect yang sudah ada supaya currency-nya langsung sesuai
// aturan baru (misal ada player dengan 250 Silver akan otomatis jadi 50 Silver + 2 Gold).
// TIDAK ADA nilai kekayaan yang hilang -- ini murni konversi satuan, totalnya tetap sama persis.
//
// Aman dijalankan berkali-kali (idempotent).

require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');
const Sect = require('./models/Sect');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[MIGRATE-CURRENCY] Terhubung ke database.\n');

    const players = await Player.find({});
    console.log(`[MIGRATE-CURRENCY] Menormalisasi currency ${players.length} player...`);
    for (const player of players) {
      await player.save(); // pre-save hook otomatis menormalisasi + hitung ulang totalWealth
    }

    const sects = await Sect.find({});
    console.log(`[MIGRATE-CURRENCY] Menormalisasi currency ${sects.length} sekte...`);
    for (const sect of sects) {
      await sect.save();
    }

    console.log(`\n[MIGRATE-CURRENCY] Selesai! ${players.length} player dan ${sects.length} sekte sudah dinormalisasi.`);
    console.log('[MIGRATE-CURRENCY] Currency sekarang otomatis naik tingkat di setiap transaksi berikutnya.');
  } catch (err) {
    console.error('[MIGRATE-CURRENCY] Gagal migrasi:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();

