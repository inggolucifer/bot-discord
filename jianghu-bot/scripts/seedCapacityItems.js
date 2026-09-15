const mongoose = require('mongoose');
const Item = require('../models/Item');
const {
  CART_CAPACITY_BONUS,
  HORSE_CAPACITY_BONUS,
  STORAGE_RING_CAPACITY_BONUS,
  MAX_TRAVEL_SPEED_DISCOUNT
} = require('../config/inventoryWeight');

async function seedCapacityItems(guildId, dryRun = false) {
  if (!guildId) {
    throw new Error('guildId argument is required');
  }

  const itemsToSeed = [
    {
      name: 'Gerobak Kayu',
      rank: 'Common',
      category: 'accessories',
      description: 'Gerobak sederhana untuk membawa lebih banyak barang saat melakukan perjalanan.',
      capacityBonus: CART_CAPACITY_BONUS || 50,
      capacityMode: 'travel_only',
      capacityType: 'cart',
      basePrice: 50,
      priceCurrency: 'silver',
      weight: 10
    },
    {
      name: 'Kuda Jinak',
      rank: 'Uncommon',
      category: 'accessories',
      description: 'Kuda tunggangan yang jinak. Mempercepat perjalanan dan dapat membawa barang.',
      capacityBonus: HORSE_CAPACITY_BONUS || 20,
      capacityMode: 'always',
      capacityType: 'horse',
      travelSpeedBonus: 0.15,
      basePrice: 200,
      priceCurrency: 'silver',
      weight: 0
    },
    {
      name: 'Cincin Penyimpanan',
      rank: 'Epic',
      category: 'accessories',
      description: 'Cincin ajaib yang menyimpan ruang dimensi di dalamnya. Sangat mahal.',
      capacityBonus: STORAGE_RING_CAPACITY_BONUS || 100,
      capacityMode: 'always',
      capacityType: 'storage_ring',
      basePrice: 10,
      priceCurrency: 'jade',
      weight: 0.1
    }
  ];

  for (const itemData of itemsToSeed) {
    if (dryRun) {
      console.log(`[DRY RUN] Would seed item: ${itemData.name}`);
      continue;
    }

    const query = { guildId, name: itemData.name };
    const update = { ...itemData, guildId };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    await Item.findOneAndUpdate(query, update, options);
    console.log(`Seeded item: ${itemData.name}`);
  }
}

// Support for running as a standalone script
if (require.main === module) {
  const args = process.argv.slice(2);
  let guildId = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--guildId') {
      guildId = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  if (!guildId) {
    console.error('Error: --guildId is required');
    process.exit(1);
  }

  require('dotenv').config();
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => seedCapacityItems(guildId, dryRun))
    .then(() => {
      console.log('Seeding completed successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = seedCapacityItems;