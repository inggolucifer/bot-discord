require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');
const Shop = require('./models/Shop');
const { SYSTEM_REALMS } = require('./utils/cultivation');

// Mongoose Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected for Cultivation Seeding'))
  .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
  });

async function seedCultivationItems() {
  try {
      // GUILD ID TARGET
      const GUILD_ID = "1133314815469592596"; // This is typically standard across scripts, or should use an env var if multiple. Let's use the standard one found in other seeds or find one.
      // Better yet, I should run a query to get a guild id. But as a seed script, it usually just creates for a specific guild or all. Let's ask or use a default one for the server.
      // I will make it accept a command line arg or use a placeholder.
      // Wait, let's look at how other scripts seed. They usually require guildId.
      const guildId = process.env.GUILD_ID || "1133314815469592596"; // default to testing guild if none

      console.log(`Starting cultivation seeding for Guild: ${guildId}`);

      const rarityTiers = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythical", "Mythical", "Mythical"];
      const costTiers = [
          { currency: 'silver', amount: 50 },       // Qi Refining
          { currency: 'silver', amount: 500 },      // Foundation
          { currency: 'gold', amount: 10 },         // Core
          { currency: 'gold', amount: 50 },         // Nascent
          { currency: 'gold', amount: 200 },        // Soul
          { currency: 'jade', amount: 10 },         // Void
          { currency: 'jade', amount: 50 },         // Tribulation
          { currency: 'spirit', amount: 1 }         // Immortal
      ];

      // Mulai dari index 1 karena index 0 (Mortal) tidak butuh pil untuk ke tahap berikutnya (success rate 100%)
      for (let i = 1; i < SYSTEM_REALMS.length; i++) {
          const realm = SYSTEM_REALMS[i];
          const pillName = `Pil Terobosan: ${realm.name}`;
          const rarity = rarityTiers[i-1] || "Mythical";
          const cost = costTiers[i-1] || { currency: 'spirit', amount: 1 };

          // 1. Create Item
          let item = await Item.findOne({ name: pillName, guildId: guildId });
          if (!item) {
              item = new Item({
                  guildId: guildId,
                  name: pillName,
                  description: `Pil khusus yang memberikan tambahan peluang sukses sebesar +5% saat melakukan Breakthrough (Menerobos) di tingkat **${realm.name}**.`,
                  type: 'consumable',
                  rarity: rarity,
                  attributes: {
                      cultivationPillRealm: realm.name,
                      successBonus: 5
                  }
              });
              await item.save();
              console.log(`[Item] Created: ${pillName}`);
          } else {
              // Update existing
              item.attributes = {
                  cultivationPillRealm: realm.name,
                  successBonus: 5
              };
              item.description = `Pil khusus yang memberikan tambahan peluang sukses sebesar +5% saat melakukan Breakthrough (Menerobos) di tingkat **${realm.name}**.`;
              await item.save();
              console.log(`[Item] Updated: ${pillName}`);
          }

          // 2. Create Shop Entry
          let shopEntry = await Shop.findOne({ itemId: item._id, guildId: guildId });
          if (!shopEntry) {
              shopEntry = new Shop({
                  guildId: guildId,
                  itemId: item._id,
                  price: cost.amount,
                  currency: cost.currency,
                  stock: -1, // Infinite
                  type: 'item'
              });
              await shopEntry.save();
              console.log(`[Shop] Added: ${pillName} for ${cost.amount} ${cost.currency}`);
          } else {
              shopEntry.price = cost.amount;
              shopEntry.currency = cost.currency;
              await shopEntry.save();
              console.log(`[Shop] Updated Price: ${pillName} to ${cost.amount} ${cost.currency}`);
          }
      }

      console.log('Cultivation Items and Shop Seed Completed Successfully.');

  } catch (err) {
      console.error(err);
  } finally {
      mongoose.disconnect();
  }
}

seedCultivationItems();
