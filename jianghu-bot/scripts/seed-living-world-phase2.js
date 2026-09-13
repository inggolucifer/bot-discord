const mongoose = require('mongoose');
const Location = require('../models/Location');
const Item = require('../models/Item');
const Shop = require('../models/Shop');
const AdminLog = require('../models/AdminLog');
require('dotenv').config();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const guildIdArg = args.find(a => a.startsWith('--guildId='));
const guildId = guildIdArg ? guildIdArg.split('=')[1] : null;

if (!guildId) {
    console.error('Usage: node seed-living-world-phase2.js --guildId=<ID> [--dry-run]');
    process.exit(1);
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(`Connected to MongoDB. Dry run: ${dryRun}`);

    try {
        const locationsToSeed = [
            { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: 'Toko Umum Xingcun', buildingType: 'shop', shopTag: 'xingcun_general' },
            { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: 'Ladang Desa', buildingType: 'farm' },
            { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: 'Dojo Latihan', buildingType: 'dojo' },
            { regionSlug: 'central_plains', settlementName: 'Tianjing', buildingName: 'Toko Pusaka Kaisar', buildingType: 'shop', shopTag: 'tianjing_imperial' },
            { regionSlug: 'central_plains', settlementName: 'Tianjing', buildingName: 'Pusat Tempa Kekaisaran', buildingType: 'blacksmith' },
            { regionSlug: 'azure_mountain_range', settlementName: 'Tri-Sect Mountain Outpost', buildingName: 'Pos Dagang Azure', buildingType: 'shop', shopTag: 'azure_hub' },
            { regionSlug: 'southern_demon_domain', settlementName: 'Scar of Heaven Camp', buildingName: 'Tenda Pedagang Gelap', buildingType: 'shop', shopTag: 'southern_hub' },
            { regionSlug: 'eastern_sea_region', settlementName: 'Pelabuhan Timur', buildingName: 'Toko Kelautan', buildingType: 'shop', shopTag: 'eastern_hub' },
            { regionSlug: 'northern_desolate_territory', settlementName: 'Pos Tundra Utara', buildingName: 'Gudang Perbekalan Tundra', buildingType: 'shop', shopTag: 'northern_hub' },
            { regionSlug: 'western_sacred_deserts', settlementName: 'Oasis Barat', buildingName: 'Pasar Oasis', buildingType: 'shop', shopTag: 'western_hub' },
        ];

        for (const loc of locationsToSeed) {
            const exists = await Location.findOne({ guildId, regionSlug: loc.regionSlug, settlementName: loc.settlementName, buildingName: loc.buildingName });
            if (!exists) {
                if (!dryRun) {
                    await Location.create({ ...loc, guildId });
                    console.log(`Created Location: ${loc.settlementName} - ${loc.buildingName}`);
                } else {
                    console.log(`[DRY-RUN] Would create Location: ${loc.settlementName} - ${loc.buildingName}`);
                }
            } else {
                if (!dryRun) {
                    exists.buildingType = loc.buildingType;
                    exists.shopTag = loc.shopTag || null;
                    await exists.save();
                    console.log(`Updated Location: ${loc.settlementName} - ${loc.buildingName}`);
                } else {
                    console.log(`[DRY-RUN] Would update Location: ${loc.settlementName} - ${loc.buildingName}`);
                }
            }
        }

        // Seed Item Surat Jaminan Biro Pengawalan
        let escortItem = await Item.findOne({ name: 'Surat Jaminan Biro Pengawalan' });
        if (!escortItem) {
            if (!dryRun) {
                escortItem = await Item.create({
                    name: 'Surat Jaminan Biro Pengawalan',
                    type: 'consume',
                    rarity: 'Uncommon',
                    description: 'Surat yang dikeluarkan oleh Biro Pengawalan ternama. Menurunkan peluang disergap bandit saat dalam perjalanan.',
                    effectType: 'travel_safeguard',
                    effectValue: 0.3,
                    basePrice: 500,
                    sellPrice: 100,
                    minRealmIndex: 0
                });
                console.log('Created Item: Surat Jaminan Biro Pengawalan');
            } else {
                console.log(`[DRY-RUN] Would create Item: Surat Jaminan Biro Pengawalan`);
                escortItem = { _id: 'dummy_id' };
            }
        }

        if (escortItem && !dryRun) {
            // Add to general shop
            const existsShop = await Shop.findOne({ guildId, refModel: 'Item', refId: escortItem._id });
            if (!existsShop) {
                await Shop.create({
                    guildId,
                    category: 'item',
                    refId: escortItem._id,
                    refModel: 'Item',
                    price: 500,
                    priceCurrency: 'silver',
                    stock: -1,
                    locationTag: 'xingcun_general',
                    addedBy: 'SYSTEM_MIGRATION'
                });
                console.log('Added Surat Jaminan Biro Pengawalan to Shop (xingcun_general)');
            }
        }

        // Update imperial manuals locationTag
        if (!dryRun) {
            const manualItems = await Item.find({ type: 'manual' });
            for (const item of manualItems) {
                if (item.name.includes('Imperial') || item.name.includes('Kekaisaran') || item.description.includes('Imperial')) {
                    await Shop.updateMany(
                        { guildId, refModel: 'Item', refId: item._id },
                        { $set: { locationTag: 'tianjing_imperial' } }
                    );
                    console.log(`Updated Shop locationTag for Imperial manual: ${item.name}`);
                }
            }

            // Assign some items to general shop
            const basicItems = await Item.find({ name: { $in: ['Pil Penyembuh Rendah', 'Pil Pengumpul Qi', 'Ransum Kering', 'Pupuk Dasar'] } });
            for (const item of basicItems) {
                await Shop.updateMany(
                    { guildId, refModel: 'Item', refId: item._id },
                    { $set: { locationTag: 'xingcun_general' } }
                );
                console.log(`Updated Shop locationTag for basic item: ${item.name}`);
            }

            await AdminLog.create({
                guildId,
                adminId: 'SYSTEM_MIGRATION_SCRIPT',
                action: 'seed_living_world_phase2',
                details: 'Seeded Location and updated Shop tags.'
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

run();
