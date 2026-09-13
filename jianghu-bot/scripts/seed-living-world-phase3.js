require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Item = require('../models/Item');
const Shop = require('../models/Shop');
const AdminLog = require('../models/AdminLog');
const argv = process.argv.slice(2);
const guildIdIndex = argv.indexOf('--guildId');
const dryRunIndex = argv.indexOf('--dry-run');

if (guildIdIndex === -1 || argv.length <= guildIdIndex + 1) {
    console.error('Missing required argument: --guildId <id>');
    process.exit(1);
}

const GUILD_ID = argv[guildIdIndex + 1];
const isDryRun = dryRunIndex !== -1;

const itemsToSeed = [
    {
        name: 'Jubah Bulu Tebal',
        rank: 'Common',
        category: 'armor',
        tier: 1,
        baseAtk: 0,
        baseDef: 5,
        baseHp: 50,
        description: 'Jubah yang terbuat dari bulu tebal, sangat efektif menahan udara dingin ekstrem.',
        coldResistance: 15,
        heatResistance: 0,
        basePrice: 50, // 50 silver = menengah
        priceCurrency: 'silver',
        minRealmIndex: 0
    },
    {
        name: 'Jubah Sutra Tipis',
        rank: 'Common',
        category: 'armor',
        tier: 1,
        baseAtk: 0,
        baseDef: 2,
        baseHp: 20,
        description: 'Jubah sutra yang sangat tipis dan sejuk, cocok untuk daerah gurun atau panas ekstrem.',
        coldResistance: 0,
        heatResistance: 15,
        basePrice: 50,
        priceCurrency: 'silver',
        minRealmIndex: 0
    }
];

async function seed() {
    try {
        console.log(`[Phase 3 Seed] Starting seed for Guild ID: ${GUILD_ID} ${isDryRun ? '(DRY RUN)' : ''}`);

        if (!isDryRun) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('Connected to MongoDB.');
        }

        let addedItemsCount = 0;
        let addedShopCount = 0;

        for (const itemData of itemsToSeed) {
            const query = { guildId: GUILD_ID, name: itemData.name };
            const existingItem = isDryRun ? null : await Item.findOne(query);

            let createdItem;

            if (existingItem) {
                console.log(`[Item] "${itemData.name}" already exists, updating resistance fields.`);
                if (!isDryRun) {
                    existingItem.coldResistance = itemData.coldResistance;
                    existingItem.heatResistance = itemData.heatResistance;
                    await existingItem.save();
                }
                createdItem = existingItem;
            } else {
                console.log(`[Item] Creating "${itemData.name}"...`);
                if (!isDryRun) {
                    createdItem = await Item.create({ guildId: GUILD_ID, ...itemData });
                    addedItemsCount++;
                } else {
                    createdItem = { _id: `dummy_${itemData.name}` };
                }
            }

            // Shop logic
            const shopQuery = { guildId: GUILD_ID, 'items.itemId': createdItem._id };
            const shopWithItem = isDryRun ? null : await Shop.findOne(shopQuery);

            if (!shopWithItem) {
               console.log(`[Shop] Adding "${itemData.name}" to global shop...`);
               if (!isDryRun) {
                   // Add to global shop (locationTag: null)
                   // Find an existing global shop to attach to, or create one if it doesn't exist.
                   // To keep it simple and safe, we can find a general goods shop if it exists.
                   let shop = await Shop.findOne({ guildId: GUILD_ID, locationTag: null });

                   if (!shop) {
                        shop = await Shop.create({
                             guildId: GUILD_ID,
                             name: 'Toko Penjahit Keliling',
                             description: 'Toko keliling yang menjual berbagai pakaian.',
                             locationTag: null,
                             items: []
                        });
                   }

                   shop.items.push({
                        itemId: createdItem._id,
                        priceModifier: 1.0,
                        stock: -1 // infinite
                   });
                   await shop.save();
                   addedShopCount++;
               }
            } else {
               console.log(`[Shop] "${itemData.name}" is already in a shop.`);
            }
        }

        if (!isDryRun) {
            await AdminLog.create({
                guildId: GUILD_ID,
                adminId: 'SYSTEM_MIGRATION_SCRIPT',
                action: 'SEED_PHASE3_CLIMATE',
                details: `Seeded climate items (Phase 3). Added ${addedItemsCount} items and ${addedShopCount} shop entries.`
            });
            console.log('Seed completed and logged.');
            await mongoose.disconnect();
        } else {
            console.log('Dry run completed.');
        }

    } catch (error) {
        console.error('Seed failed:', error);
        if (!isDryRun) mongoose.disconnect();
        process.exit(1);
    }
}

seed();