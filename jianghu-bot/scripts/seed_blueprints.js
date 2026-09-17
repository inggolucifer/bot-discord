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
    description: 'Pondok hunian asri dari kayu mentah yang mempercepat pemulihan stamina (Aset Tier 1).',
    requiredSilver: 30,
    requiredMaterials: [
      { itemId: new mongoose.Types.ObjectId('6a91b15aa9e03dc91c54bfc3'), itemName: 'Kayu Mentah', quantity: 15 },
      { itemId: new mongoose.Types.ObjectId('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 8 }
    ],
    buildDurationSeconds: 180,
    minRealmIndex: 0,
    defaultInteriorTier: 1
  },
  {
    blueprintId: 'kios_obat_herbal',
    name: 'Kios Apotek Herbal',
    category: 'shop',
    description: 'Toko herbal bertingkat dengan etalase dan rak obat dari papan kayu pernis (Aset Tier 2).',
    requiredSilver: 80,
    requiredMaterials: [
      { itemId: new mongoose.Types.ObjectId('6a91b15ba9e03dc91c54bff2'), itemName: 'Papan Kayu', quantity: 12 },
      { itemId: new mongoose.Types.ObjectId('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 10 }
    ],
    buildDurationSeconds: 240,
    minRealmIndex: 1,
    defaultInteriorTier: 2
  },
  {
    blueprintId: 'bengkel_tempa_baja',
    name: 'Bengkel Tempa Pandai Besi',
    category: 'blacksmith',
    description: 'Fasilitas tempa kokoh dengan dinding papan kayu, landasan baja, dan tungku peleburan (Aset Tier 2).',
    requiredSilver: 120,
    requiredMaterials: [
      { itemId: new mongoose.Types.ObjectId('6a91b15ba9e03dc91c54bff2'), itemName: 'Papan Kayu', quantity: 15 },
      { itemId: new mongoose.Types.ObjectId('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 15 },
      { itemId: new mongoose.Types.ObjectId('6a91b15ba9e03dc91c54bff3'), itemName: 'Bijih Besi', quantity: 5 }
    ],
    buildDurationSeconds: 300,
    minRealmIndex: 1,
    defaultInteriorTier: 2
  },
  {
    blueprintId: 'dojo_bela_diri',
    name: 'Dojo Perguruan Bela Diri',
    category: 'dojo',
    description: 'Sasana megah dengan lantai papan kayu pernis untuk latihan jurus silat dan penempaan meridian kungfu (Aset Tier 3).',
    requiredSilver: 200,
    requiredMaterials: [
      { itemId: new mongoose.Types.ObjectId('6a91b15ba9e03dc91c54bff2'), itemName: 'Papan Kayu', quantity: 25 },
      { itemId: new mongoose.Types.ObjectId('6a91b15aa9e03dc91c54bfc2'), itemName: 'Batu Kasar', quantity: 20 },
      { itemId: new mongoose.Types.ObjectId('6a91b15ba9e03dc91c54bff5'), itemName: 'Batangan Besi', quantity: 5 }
    ],
    buildDurationSeconds: 600,
    minRealmIndex: 2,
    defaultInteriorTier: 3
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
