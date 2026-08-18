const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[DATABASE] Terhubung ke MongoDB dengan sukses.');
  } catch (err) {
    console.error('[DATABASE] Gagal konek ke MongoDB:', err);
    process.exit(1);
  }
}

module.exports = { connectDB };
