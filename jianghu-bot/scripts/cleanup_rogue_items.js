const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

require('dotenv').config();
const mongoose = require('mongoose');

async function cleanup() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const db = mongoose.connection.db;

  // 1. Cek apakah ada player yang menyimpan itemId dari Kayu Glondongan atau Bijih Besi Mentah
  const rogueItems = await db.collection('items').find({
    name: { $in: ['Kayu Glondongan', 'Bijih Besi Mentah'] }
  }).toArray();

  console.log(`Menemukan ${rogueItems.length} dokumen item liar/duplikat:`);
  for (const item of rogueItems) {
    console.log(`- ID: ${item._id} | Name: "${item.name}"`);
  }

  const rogueIds = rogueItems.map(i => i._id);

  // Cari item kanonikal
  const kayuMentah = await db.collection('items').findOne({ name: 'Kayu Mentah' });
  const bijihBesi = await db.collection('items').findOne({ name: 'Bijih Besi' });

  if (!kayuMentah || !bijihBesi) {
    console.error('Item kanonikal Kayu Mentah atau Bijih Besi tidak ditemukan!');
    await mongoose.disconnect();
    return;
  }

  console.log(`\nItem Kanonikal:\n- Kayu Mentah: ${kayuMentah._id}\n- Bijih Besi: ${bijihBesi._id}\n`);

  // Jika ada player dengan rogue item, konversikan ke item kanonikal
  const players = await db.collection('players').find({
    'inventory.itemId': { $in: rogueIds }
  }).toArray();

  for (const p of players) {
    let updated = false;
    for (const slot of p.inventory) {
      if (rogueIds.some(rid => rid.toString() === (slot.itemId || '').toString())) {
        const rogueDoc = rogueItems.find(r => r._id.toString() === (slot.itemId || '').toString());
        if (rogueDoc && rogueDoc.name === 'Kayu Glondongan') {
          slot.itemId = kayuMentah._id;
          slot.name = 'Kayu Mentah';
          updated = true;
        } else if (rogueDoc && rogueDoc.name === 'Bijih Besi Mentah') {
          slot.itemId = bijihBesi._id;
          slot.name = 'Bijih Besi';
          updated = true;
        }
      }
    }
    if (updated) {
      await db.collection('players').updateOne(
        { _id: p._id },
        { $set: { inventory: p.inventory } }
      );
      console.log(`✓ Mengonversi inventory player ${p.username || p.name} ke item kanonikal.`);
    }
  }

  // Hapus item rogue dari collection items
  const deleteResult = await db.collection('items').deleteMany({
    name: { $in: ['Kayu Glondongan', 'Bijih Besi Mentah'] }
  });
  console.log(`✓ Menghapus ${deleteResult.deletedCount} dokumen liar ('Kayu Glondongan', 'Bijih Besi Mentah') dari koleksi items.`);

  // Verifikasi Blueprints
  const bps = await db.collection('blueprints').find({}).toArray();
  console.log('\nVerifikasi Blueprints Terkini:');
  for (const bp of bps) {
    console.log(`- ${bp.name}: ${JSON.stringify(bp.requiredMaterials.map(m => `${m.itemName} x${m.quantity}`))}`);
  }

  await mongoose.disconnect();
  console.log('\nPembersihan selesai dengan sukses.');
}

cleanup().catch(err => {
  console.error('Error saat pembersihan:', err);
  process.exit(1);
});
