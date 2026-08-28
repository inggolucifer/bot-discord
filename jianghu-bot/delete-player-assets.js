require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI tidak ditemukan di .env');
    process.exit(1);
  }

  try {
    console.log('Menghubungkan ke database...');
    await mongoose.connect(uri);
    console.log('Berhasil terhubung ke database.');

    console.log('Menghapus semua asset dari seluruh player...');
    const result = await Player.updateMany({}, { $set: { assets: [] } });

    console.log(`Operasi selesai. Jumlah player yang diperbarui: ${result.modifiedCount}`);
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Koneksi database ditutup.');
    process.exit(0);
  }
}

main();
