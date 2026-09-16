require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
const mongoose = require('mongoose');
const GridZone = require('../models/GridZone');
const ZoneTile = require('../models/ZoneTile');

async function seedPilotGrid(targetGuildId = null) {
  const guildId = targetGuildId || process.env.DEFAULT_GUILD_ID || '1169651733470126100';
  const zoneId = 'xingcun_village';

  console.log(`[SEED] Memulai seeding GridZone dan ZoneTile untuk '${zoneId}' (Guild: ${guildId})...`);

  // 1. Buat atau perbarui GridZone
  const zone = await GridZone.findOneAndUpdate(
    { guildId, zoneId },
    {
      $set: {
        guildId,
        zoneId,
        name: 'Desa Xingcun',
        regionSlug: 'central_plains',
        settlementSlug: 'desa_xingcun',
        zoneType: 'settlement',
        width: 32,
        height: 32,
        spawnPoint: { x: 16, y: 16 },
        climate: {
          baseTemperature: 22,
          spiritualQiDensity: 12,
          defaultTerrain: 'settlement'
        },
        dangerTier: 1,
        minRealmIndex: 0,
        isActive: true
      }
    },
    { upsert: true, new: true }
  );

  console.log(`[SEED] GridZone '${zone.name}' (${zone.width}x${zone.height}) berhasil di-upsert.`);

  // 2. Bersihkan tile lama untuk zona ini
  await ZoneTile.deleteMany({ guildId, zoneId });

  // 3. Bangun 32x32 Tiles
  const tiles = [];
  const W = 32;
  const H = 32;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let tile = {
        guildId,
        zoneId,
        tileX: x,
        tileY: y,
        tileType: 'ground',
        terrainType: 'settlement',
        isSolid: false,
        isClaimable: false,
        isDoor: false,
        staminaCostMultiplier: 1.0,
        label: null
      };

      // A. Perbatasan Luar (Dinding/Pagar Pembatas) kecuali gerbang utama (x: 16, y: 0) dan (x: 16, y: 31)
      const isNorthGate = (x === 16 && y === 0);
      const isSouthGate = (x === 16 && y === 31);
      const isEastGate = (x === 31 && y === 16);
      const isWestGate = (x === 0 && y === 16);

      if (x === 0 || x === W - 1 || y === 0 || y === H - 1) {
        if (!isNorthGate && !isSouthGate && !isEastGate && !isWestGate) {
          tile.tileType = 'wall';
          tile.terrainType = 'mountain';
          tile.isSolid = true;
          tile.label = 'Pagar Pembatas Desa';
        } else {
          tile.tileType = 'road';
          tile.terrainType = 'road';
          tile.staminaCostMultiplier = 0.8;
          tile.label = 'Gerbang Wilayah Desa';
        }
      }
      // B. Jalan Utama Silang (Persimpangan Utama di tengah)
      else if (x === 15 || x === 16 || y === 15 || y === 16) {
        tile.tileType = 'road';
        tile.terrainType = 'road';
        tile.staminaCostMultiplier = 0.8;
      }
      // C. Sungai Kecil Melintang di Utara (y: 6 & 7), dilewati jembatan di x: 15..16
      else if (y === 6 || y === 7) {
        if (x !== 15 && x !== 16) {
          tile.tileType = 'water';
          tile.terrainType = 'water';
          tile.isSolid = true; // Air dalam tanpa perahu tidak bisa dilintasi
          tile.label = 'Aliran Sungai Xingcun';
        } else {
          tile.tileType = 'road';
          tile.terrainType = 'road';
          tile.label = 'Jembatan Kayu Sungai';
        }
      }

      tiles.push(tile);
    }
  }

  // Helper untuk update tile di array sebelum batch insert
  const getTileRef = (tx, ty) => tiles.find(t => t.tileX === tx && t.tileY === ty);

  // D. Resource Nodes
  // 1. Pohon Bambu Rimbun
  let tNode1 = getTileRef(8, 8);
  if (tNode1) {
    tNode1.tileType = 'resource_node';
    tNode1.resourceType = 'wood';
    tNode1.label = 'Rumpun Bambu Hijau';
  }
  // 2. Spot Memancing di Sungai
  let tNode2 = getTileRef(20, 6);
  if (tNode2) {
    tNode2.tileType = 'resource_node';
    tNode2.resourceType = 'fish';
    tNode2.label = 'Dermaga Pancing Sungai';
    tNode2.isSolid = false; // Bisa didekati dari pinggir sungai
  }
  // 3. Ladang Herba Liar
  let tNode3 = getTileRef(24, 24);
  if (tNode3) {
    tNode3.tileType = 'resource_node';
    tNode3.resourceType = 'herb';
    tNode3.label = 'Tanaman Ginseng Liar';
  }

  // E. Kavling Tanah yang Dapat Diklaim Pemain (Buildable Plots)
  const claimablePlots = [
    { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 11 }, { x: 11, y: 11 },
    { x: 20, y: 10 }, { x: 21, y: 10 }, { x: 20, y: 11 }, { x: 21, y: 11 }
  ];
  for (const p of claimablePlots) {
    let tClaim = getTileRef(p.x, p.y);
    if (tClaim) {
      tClaim.tileType = 'buildable_plot';
      tClaim.terrainType = 'claimable';
      tClaim.isClaimable = true;
      tClaim.plotPriceSilver = 100;
      tClaim.label = `Kavling Tanah (${p.x}, ${p.y})`;
    }
  }

  // F. Bangunan Toko Obat Xingcun (Footprint 2x2 solid, Pintu di depan)
  // Footprint solid: (12, 13), (13, 13), (12, 14)
  const medShopSolid = [{ x: 12, y: 13 }, { x: 13, y: 13 }, { x: 12, y: 14 }, { x: 13, y: 14 }];
  for (const p of medShopSolid) {
    let t = getTileRef(p.x, p.y);
    if (t) {
      t.tileType = 'wall';
      t.isSolid = true;
      t.buildingName = 'Toko Obat Herbal Xingcun';
      t.buildingType = 'shop';
    }
  }
  // Pintu Toko Obat di (13, 15)
  let medDoor = getTileRef(13, 15);
  if (medDoor) {
    medDoor.tileType = 'door';
    medDoor.isSolid = false;
    medDoor.isDoor = true;
    medDoor.buildingName = 'Toko Obat Herbal Xingcun';
    medDoor.label = 'Pintu Masuk Toko Obat';
  }

  // G. Bangunan Balai Desa Xingcun (Footprint 2x2 solid, Pintu di depan)
  const hallSolid = [{ x: 18, y: 13 }, { x: 19, y: 13 }, { x: 18, y: 14 }, { x: 19, y: 14 }];
  for (const p of hallSolid) {
    let t = getTileRef(p.x, p.y);
    if (t) {
      t.tileType = 'wall';
      t.isSolid = true;
      t.buildingName = 'Balai Desa Xingcun';
      t.buildingType = 'residence';
    }
  }
  // Pintu Balai Desa di (18, 15)
  let hallDoor = getTileRef(18, 15);
  if (hallDoor) {
    hallDoor.tileType = 'door';
    hallDoor.isSolid = false;
    hallDoor.isDoor = true;
    hallDoor.buildingName = 'Balai Desa Xingcun';
    hallDoor.label = 'Pintu Masuk Balai Desa';
  }

  // 4. Batch Insert ke MongoDB
  console.log(`[SEED] Mengunggah ${tiles.length} ZoneTile ke MongoDB...`);
  await ZoneTile.insertMany(tiles);

  console.log(`[SEED] Berhasil menyelesaikan seeding pilot grid '${zoneId}'!`);
  return { zone, tileCount: tiles.length };
}

// Jika dijalankan langsung lewat CLI
if (require.main === module) {
  (async () => {
    try {
      if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI belum terdefinisi di .env');
        process.exit(1);
      }
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Terhubung ke MongoDB Atlas.');
      await seedPilotGrid();
    } catch (err) {
      console.error('Error saat seeding:', err);
    } finally {
      await mongoose.disconnect();
      process.exit(0);
    }
  })();
}

module.exports = { seedPilotGrid };
