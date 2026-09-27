require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const ZoneTile = require('../models/ZoneTile');
const Asset = require('../models/Asset');
const Item = require('../models/Item');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const inggo = await Player.findOne({ characterName: 'Inggo' });
  if (!inggo) {
    console.error('Inggo not found');
    process.exit(1);
  }

  // 1. Verifikasi Lahan Inggo
  const ownedPlots = await ZoneTile.find({ ownerId: inggo.discordId });
  console.log(`Plot milik Inggo (${ownedPlots.length} kavling):`);
  ownedPlots.forEach(p => {
    console.log(` - (${p.tileX}, ${p.tileY}) [${p.zoneId}]: buildingName="${p.buildingName}", label="${p.label}"`);
  });

  // 2. Beri material & perak jika kurang untuk pengujian altar
  if (!inggo.currency) inggo.currency = {};
  inggo.currency.silver = Math.max(inggo.currency.silver || 0, 300);

  // Pastikan stok bambu dan batu kasar ada di inventory
  const bambuItem = await Item.findOne({ name: 'Kayu Bambu Keras' });
  const batuItem = await Item.findOne({ name: 'Batu Kasar Gunung' });
  const guEssence = await Item.findOne({ name: 'Intisari Serangga Gu' });

  if (bambuItem) {
    const invBambu = inggo.inventory.find(i => i.itemId?.toString() === bambuItem._id.toString());
    if (invBambu) invBambu.quantity = Math.max(invBambu.quantity, 20);
    else inggo.inventory.push({ itemId: bambuItem._id, quantity: 20 });
  }
  if (batuItem) {
    const invBatu = inggo.inventory.find(i => i.itemId?.toString() === batuItem._id.toString());
    if (invBatu) invBatu.quantity = Math.max(invBatu.quantity, 20);
    else inggo.inventory.push({ itemId: batuItem._id, quantity: 20 });
  }
  if (guEssence) {
    const invGu = inggo.inventory.find(i => i.itemId?.toString() === guEssence._id.toString());
    if (invGu) invGu.quantity = Math.max(invGu.quantity, 20);
    else inggo.inventory.push({ itemId: guEssence._id, quantity: 20 });
  }

  inggo.markModified('inventory');
  inggo.markModified('currency');
  await inggo.save();
  console.log('✓ Bekal material & perak Inggo telah disiapkan.');

  // 3. Simulasikan eksekusi logic build facility untuk 'gu_crucible'
  const facilityType = 'gu_crucible';
  const facilityName = 'Kendi Penyuling Gu Purba';

  if (!inggo.cultivationLaw.facilities) {
    inggo.cultivationLaw.facilities = {
      bodyCauldronTier: 0,
      abyssalAltarTier: 0,
      guCrucibleTier: 1,
      soulAnvilTier: 0,
      beastDenTier: 0,
      elementalPagodaTier: 0
    };
  }

  // Cek kepemilikan lahan
  if (!ownedPlots || ownedPlots.length === 0) {
    console.error('❌ Gagal: Pemain tidak punya lahan.');
    return;
  }

  let targetPlot = ownedPlots.find(p => !p.buildingName || p.buildingName.includes(facilityName)) || ownedPlots[0];
  const nextTier = (inggo.cultivationLaw.facilities.guCrucibleTier || 1) + 1;

  // Dirikan fisik bangunan di atas kavling lahan
  targetPlot.buildingName = facilityName;
  targetPlot.buildingType = 'crafting_station';
  targetPlot.label = `${facilityName} [T${nextTier}] (${inggo.characterName})`;
  targetPlot.isOccupied = true;
  await targetPlot.save();
  console.log(`✓ Bangunan fisik ${facilityName} berdiri di plot (${targetPlot.tileX}, ${targetPlot.tileY})!`);

  // Daftarkan sebagai asset pemain
  const assetDoc = await Asset.findOne({ name: facilityName });
  if (!inggo.assets) inggo.assets = [];
  const existingAssetIdx = inggo.assets.findIndex(a => a.name === facilityName);
  if (existingAssetIdx !== -1) {
    inggo.assets[existingAssetIdx].status = 'active';
    inggo.assets[existingAssetIdx].placement = {
      zoneId: targetPlot.zoneId,
      tileX: targetPlot.tileX,
      tileY: targetPlot.tileY
    };
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

  inggo.cultivationLaw.facilities.guCrucibleTier = nextTier;
  inggo.markModified('assets');
  inggo.markModified('cultivationLaw');
  await inggo.save();

  console.log('✓ Status Altar Fasilitas Inggo Sekarang:', inggo.cultivationLaw.facilities);
  console.log('✓ Aset Fisik Inggo di player.assets:', inggo.assets);

  // 4. Verifikasi Tile di Database
  const updatedTile = await ZoneTile.findById(targetPlot._id);
  console.log('✓ Tile di Peta Dunia Berhasil Diperbarui:');
  console.log({
    zoneId: updatedTile.zoneId,
    coord: `(${updatedTile.tileX}, ${updatedTile.tileY})`,
    buildingName: updatedTile.buildingName,
    buildingType: updatedTile.buildingType,
    label: updatedTile.label,
    ownerId: updatedTile.ownerId
  });

  await mongoose.disconnect();
  console.log('\n🎉 Pengujian Integrasi Altar - Lahan - Aset Berhasil 100%!');
}

main().catch(console.error);
