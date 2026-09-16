const mongoose = require('mongoose');
const dns = require('dns');

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu';
    if (mongoUri.startsWith('mongodb+srv')) {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch (_) {}
    }
    await mongoose.connect(mongoUri);
    console.log(`[DATABASE] Terhubung ke MongoDB dengan sukses (${process.env.MONGODB_URI ? 'URI env' : 'localhost fallback'}).`);
  } catch (err) {
    console.error('[DATABASE] Gagal konek ke MongoDB:', err);
    process.exit(1);
  }
}

module.exports = { connectDB };
