const mongoose = require('mongoose');
const Location = require('../models/Location');
const ZoneTile = require('../models/ZoneTile');
require('dotenv').config();

async function seedLocationToGrid() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Terhubung ke database.');

    const locations = await Location.find({ zoneId: { $ne: null }, mapX: { $ne: null }, mapY: { $ne: null } });
    console.log(`Ditemukan ${locations.length} lokasi dengan koordinat mapX, mapY.`);

    let updatedCount = 0;
    for (const loc of locations) {
      // Find the corresponding ZoneTile
      const tile = await ZoneTile.findOne({
        guildId: loc.guildId,
        zoneId: loc.zoneId,
        tileX: loc.mapX,
        tileY: loc.mapY
      });

      if (tile) {
        // Update tile
        tile.locationId = loc._id;
        tile.isBuildingEntrance = true;
        tile.buildingName = loc.buildingName;
        tile.buildingType = loc.buildingType;
        if (!tile.label) tile.label = loc.buildingName;
        
        await tile.save();
        updatedCount++;
      } else {
        // Create new tile if missing (though typically they are pre-generated)
        await ZoneTile.create({
          guildId: loc.guildId,
          zoneId: loc.zoneId,
          tileX: loc.mapX,
          tileY: loc.mapY,
          locationId: loc._id,
          isBuildingEntrance: true,
          buildingName: loc.buildingName,
          buildingType: loc.buildingType,
          label: loc.buildingName,
          tileType: 'poi',
          isSolid: true
        });
        updatedCount++;
      }
    }

    console.log(`Berhasil memetakan ${updatedCount} Location ke ZoneTile.`);
    process.exit(0);
  } catch (err) {
    console.error('Error saat seeding:', err);
    process.exit(1);
  }
}

seedLocationToGrid();
