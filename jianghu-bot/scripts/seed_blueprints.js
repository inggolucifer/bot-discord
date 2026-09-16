require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const Blueprint = require('../models/Blueprint');

const BLUEPRINTS = [
  {
    blueprintId: 'rumah_kayu_sederhana',
    name: 'Rumah Kayu Sederhana',
    category: 'residence',
    description: 'Tempat tinggal asri yang mempercepat regenerasi stamina.',
    requiredSilver: 50,
    requiredMaterials: [
      { itemName: 'Kayu Glondongan', quantity: 10 }
    ],
    buildDurationSeconds: 180,
    minRealmIndex: 0
  },
  {
    blueprintId: 'bengkel_tempa_baja',
    name: 'Bengkel Tempa Pandai Besi',
    category: 'blacksmith',
    description: 'Fasilitas tempa yang dilengkapi landasan baja dan tungku peleburan.',
    requiredSilver: 120,
    requiredMaterials: [
      { itemName: 'Kayu Glondongan', quantity: 15 },
      { itemName: 'Batu Kali', quantity: 10 }
    ],
    buildDurationSeconds: 300,
    minRealmIndex: 1
  },
  {
    blueprintId: 'kios_obat_herbal',
    name: 'Kios Apotek Herbal',
    category: 'shop',
    description: 'Toko herbal dengan kuali alkimia kuno untuk meracik ramuan obat.',
    requiredSilver: 100,
    requiredMaterials: [
      { itemName: 'Kayu Glondongan', quantity: 12 }
    ],
    buildDurationSeconds: 240,
    minRealmIndex: 0
  },
  {
    blueprintId: 'dojo_bela_diri',
    name: 'Dojo Perguruan Bela Diri',
    category: 'dojo',
    description: 'Sasana latihan jurus silat dan penempaan meridian kungfu.',
    requiredSilver: 200,
    requiredMaterials: [
      { itemName: 'Kayu Glondongan', quantity: 20 },
      { itemName: 'Batu Kali', quantity: 20 }
    ],
    buildDurationSeconds: 600,
    minRealmIndex: 2
  }
];

async function seedBlueprints() {
  console.log('[SEED] Memulai seeding katalog Blueprint...');
  for (const bp of BLUEPRINTS) {
    await Blueprint.findOneAndUpdate(
      { blueprintId: bp.blueprintId },
      { $set: { ...bp, isActive: true } },
      { upsert: true, new: true }
    );
    console.log(`[SEED] Blueprint '${bp.name}' tersimpan.`);
  }
  console.log('[SEED] Selesai seeding katalog Blueprint!');
}

if (require.main === module) {
  (async () => {
    try {
      if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI belum diatur di .env');
        process.exit(1);
      }
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Terhubung ke MongoDB Atlas.');
      await seedBlueprints();
    } catch (err) {
      console.error('Error saat seeding blueprints:', err);
    } finally {
      await mongoose.disconnect();
      process.exit(0);
    }
  })();
}

module.exports = { seedBlueprints };
