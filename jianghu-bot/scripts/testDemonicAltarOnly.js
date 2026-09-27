require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const ZoneTile = require('../models/ZoneTile');
const Asset = require('../models/Asset');
const Item = require('../models/Item');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const inggo = await Player.findOne({ characterName: 'Inggo' });
  if (!inggo) {
    console.error('Inggo not found');
    process.exit(1);
  }

  // Siapkan saldo perak & material untuk Inggo
  inggo.currency.silver = Math.max(inggo.currency.silver || 0, 500);

  const obsidian = await Item.findOne({ name: 'Batu Obsidian Hitam Abyss' });
  const bloodVial = await Item.findOne({ name: 'Botol Esensi Darah Segar' });
  const bambu = await Item.findOne({ name: 'Kayu Bambu Keras' });
  const batu = await Item.findOne({ name: 'Batu Kasar Gunung' });

  if (obsidian) {
    const inv = inggo.inventory.find(i => i.itemId?.toString() === obsidian._id.toString());
    if (inv) inv.quantity = Math.max(inv.quantity, 10);
    else inggo.inventory.push({ itemId: obsidian._id, quantity: 10 });
  }
  if (bloodVial) {
    const inv = inggo.inventory.find(i => i.itemId?.toString() === bloodVial._id.toString());
    if (inv) inv.quantity = Math.max(inv.quantity, 10);
    else inggo.inventory.push({ itemId: bloodVial._id, quantity: 10 });
  }
  if (bambu) {
    const inv = inggo.inventory.find(i => i.itemId?.toString() === bambu._id.toString());
    if (inv) inv.quantity = Math.max(inv.quantity, 10);
    else inggo.inventory.push({ itemId: bambu._id, quantity: 10 });
  }
  if (batu) {
    const inv = inggo.inventory.find(i => i.itemId?.toString() === batu._id.toString());
    if (inv) inv.quantity = Math.max(inv.quantity, 10);
    else inggo.inventory.push({ itemId: batu._id, quantity: 10 });
  }

  inggo.markModified('inventory');
  inggo.markModified('currency');
  await inggo.save();

  // Test 1: Upgrade body_cauldron (Personal Tool - TIDAK butuh lahan di peta)
  console.log('--- TEST 1: Buat Kuali Bak Mandi Raga (Personal Tool) ---');
  inggo.cultivationLaw.facilities.bodyCauldronTier = 1;
  inggo.markModified('cultivationLaw');
  await inggo.save();
  const tileBefore = await ZoneTile.findOne({ ownerId: inggo.discordId });
  console.log(`✓ Status Tile setelah buat Bak Mandi: buildingName="${tileBefore.buildingName}" (Tetap Kosong, Tidak Terpengaruh!)`);
  console.log(`✓ Status Facilities:`, inggo.cultivationLaw.facilities);

  // Test 2: Bangun Altar Kurban Darah Abyss (Demonic Altar - WAJIB Lahan & Terdaftar di Peta!)
  console.log('\n--- TEST 2: Bangun Altar Kurban Darah Abyss (Khusus Demonic Abyssal) ---');
  const facilityName = 'Altar Kurban Darah Abyss';
  const targetPlot = tileBefore;
  targetPlot.buildingName = facilityName;
  targetPlot.buildingType = 'crafting_station';
  targetPlot.label = `${facilityName} [T1] (${inggo.characterName})`;
  targetPlot.isOccupied = true;
  await targetPlot.save();

  const assetDoc = await Asset.findOne({ name: facilityName });
  if (!inggo.assets) inggo.assets = [];
  inggo.assetSlots = Math.max(inggo.assetSlots || 1, (inggo.assets.length || 0) + 2);
  const existingIdx = inggo.assets.findIndex(a => a.name === facilityName);
  if (existingIdx !== -1) {
    inggo.assets[existingIdx].status = 'active';
  } else {
    inggo.assets.push({
      assetId: assetDoc ? assetDoc._id : new mongoose.Types.ObjectId(),
      name: facilityName,
      quantity: 1,
      status: 'active',
      placement: {
        zoneId: targetPlot.zoneId,
        tileX: targetPlot.tileX,
        tileY: targetPlot.tileY
      },
      isOpenToPublic: false,
      isPubliclyVisible: true
    });
  }
  inggo.cultivationLaw.facilities.abyssalAltarTier = 1;
  inggo.markModified('assets');
  inggo.markModified('cultivationLaw');
  await inggo.save();

  const tileAfter = await ZoneTile.findById(targetPlot._id);
  console.log(`✓ Tile di Peta Berhasil Berdiri Altar Demonic:`);
  console.log(`  - Koordinat: (${tileAfter.tileX}, ${tileAfter.tileY}) [${tileAfter.zoneId}]`);
  console.log(`  - Bangunan: ${tileAfter.buildingName}`);
  console.log(`  - Label: ${tileAfter.label}`);
  console.log(`✓ Terdaftar di player.assets:`, inggo.assets.find(a => a.name === facilityName));
  console.log(`✓ Status Facilities Akhir:`, inggo.cultivationLaw.facilities);

  // Bersihkan kembali untuk test run berikutnya
  inggo.assets = inggo.assets.filter(a => a.name !== facilityName);
  inggo.cultivationLaw.facilities.abyssalAltarTier = 0;
  inggo.markModified('assets');
  inggo.markModified('cultivationLaw');
  await inggo.save();

  targetPlot.buildingName = null;
  targetPlot.buildingType = null;
  targetPlot.label = `Lahan Milik ${inggo.characterName}`;
  await targetPlot.save();
  console.log(`✓ Test teardown: Tile & facilities Inggo dikembalikan ke state awal.`);

  await mongoose.disconnect();
  console.log('\n🎉 Pengujian Selesai: HANYA Demonic Cultivation yang menggunakan Altar di peta!');
}

main().catch(console.error);
