require('dotenv').config();
const mongoose = require('mongoose');
const ZoneTile = require('../models/ZoneTile');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    // Asumsi guildId default untuk testing, bisa diubah
    const guildId = process.env.DEFAULT_GUILD_ID || '1169651733470126100'; 
    const zoneId = 'central_plains_bamboo_forest';

    await ZoneTile.deleteMany({ zoneId });

    const tiles = [
      { guildId, zoneId, tileX: 5, tileY: 5, tileType: 'resource_node', label: 'Pohon Bambu Tua' },
      { guildId, zoneId, tileX: 7, tileY: 7, tileType: 'npc_spawn', label: 'Tetua Hutan Bambu' },
      { guildId, zoneId, tileX: 12, tileY: 8, tileType: 'poi', label: '1', hidden: false },
      { guildId, zoneId, tileX: 20, tileY: 15, tileType: 'poi', label: '2', hidden: true }, // FASE G3 prep
      { guildId, zoneId, tileX: 10, tileY: 12, tileType: 'buildable_plot' }
    ];

    await ZoneTile.insertMany(tiles);
    console.log('Seed Zona berhasil!');
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

seed();
