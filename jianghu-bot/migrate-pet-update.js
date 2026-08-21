require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');
const Pet = require('./models/Pet');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Update Pet default maxLevel to 100 for all existing pets
    const petUpdateResult = await Pet.updateMany(
      {},
      { $set: { maxLevel: 100 } }
    );
    console.log(`Updated ${petUpdateResult.modifiedCount} Pet documents to maxLevel 100.`);

    // 2. Update players with new petSlots and default statMultipliers if missing
    const players = await Player.find({});
    let playersUpdated = 0;

    for (let player of players) {
      let modified = false;

      // Adjust petSlots based on currently owned pets (if they have > 2 pets already)
      if (!player.petSlots || player.petSlots < 2) {
        player.petSlots = Math.max(2, player.pets.length);
        modified = true;
      } else if (player.petSlots < player.pets.length) {
         player.petSlots = player.pets.length;
         modified = true;
      }

      // Add default stat multipliers for existing pets
      if (player.pets && player.pets.length > 0) {
        player.pets.forEach(pet => {
          if (!pet.statMultipliers || !pet.statMultipliers.hp) {
            pet.statMultipliers = {
              hp: 1.0,
              atk: 1.0,
              def: 1.0,
              spd: 1.0
            };
            modified = true;
          }
        });
      }

      if (modified) {
        // use updateOne to avoid pre-save hooks if not necessary, but here we can just save since pre-save normalizes currency
        player.markModified('pets');
        await player.save();
        playersUpdated++;
      }
    }

    console.log(`Updated ${playersUpdated} Player documents (petSlots & statMultipliers).`);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
