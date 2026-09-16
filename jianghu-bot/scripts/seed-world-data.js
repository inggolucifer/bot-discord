require('dotenv').config();
const dns = require('dns'); dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

const Monster = require('../models/Monster');
const RegionMap = require('../models/RegionMap');
const Sect = require('../models/Sect');

const GUILD_ID = 'DEFAULT_GUILD'; // Fallback guild id or replace dynamically

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // ==========================
        // 1. SEED REGIONS
        // ==========================
        const regions = [
            { regionSlug: 'central_plains', displayName: 'Central Plains (中原)', worldMapX: 50, worldMapY: 50, themeColor: '#4CAF50', dangerTier: 1 },
            { regionSlug: 'azure_mountain', displayName: 'Azure Mountain Range (碧山)', worldMapX: 30, worldMapY: 50, themeColor: '#009688', dangerTier: 2 },
            { regionSlug: 'southern_demon', displayName: 'Southern Demon Domain (南魔域)', worldMapX: 50, worldMapY: 70, themeColor: '#673AB7', dangerTier: 4 },
            { regionSlug: 'eastern_sea', displayName: 'Eastern Sea Region (东海)', worldMapX: 80, worldMapY: 50, themeColor: '#2196F3', dangerTier: 3 },
            { regionSlug: 'northern_desolate', displayName: 'Northern Desolate Territory (北荒)', worldMapX: 50, worldMapY: 20, themeColor: '#E0E0E0', dangerTier: 4 },
            { regionSlug: 'western_desert', displayName: 'Western Sacred Deserts (西圣漠)', worldMapX: 20, worldMapY: 50, themeColor: '#FFC107', dangerTier: 3 }
        ];

        for (const reg of regions) {
            await RegionMap.findOneAndUpdate(
                { regionSlug: reg.regionSlug },
                { ...reg },
                { upsert: true, new: true }
            );
        }
        console.log('✅ Regions seeded successfully.');

        // ==========================
        // 2. SEED MONSTERS
        // ==========================
        const monsters = [
            // Central Plains
            { key: 'serigala_malam', name: 'Serigala Malam Berbulu Hitam', regionSlug: 'central_plains', tier: 3, hp: 300, atk: 75, def: 30, spd: 40 },
            { key: 'roh_prajurit', name: 'Roh Prajurit Gugur', regionSlug: 'central_plains', tier: 3, hp: 450, atk: 50, def: 60, spd: 20 },
            
            // Azure Mountain
            { key: 'macan_es', name: 'Macan Es', regionSlug: 'azure_mountain', tier: 4, hp: 800, atk: 120, def: 80, spd: 90 },
            { key: 'ular_bambu_giok', name: 'Ular Bambu Giok Purba', regionSlug: 'azure_mountain', tier: 4, hp: 600, atk: 150, def: 50, spd: 110 },

            // Southern Demon
            { key: 'serigala_api_neraka', name: 'Serigala Api Neraka', regionSlug: 'southern_demon', tier: 4, hp: 900, atk: 140, def: 60, spd: 100 },
            { key: 'kutu_iblis', name: 'Kutu Iblis Pemakan Sumsum', regionSlug: 'southern_demon', tier: 5, hp: 1200, atk: 180, def: 150, spd: 130 },

            // Eastern Sea
            { key: 'naga_air_hitam', name: 'Naga Air Hitam', regionSlug: 'eastern_sea', tier: 5, hp: 2000, atk: 200, def: 180, spd: 80 },
            
            // Northern Desolate
            { key: 'binatang_es_abadi', name: 'Binatang Es Abadi', regionSlug: 'northern_desolate', tier: 6, hp: 5000, atk: 400, def: 500, spd: 150 },

            // Western Deserts
            { key: 'kalajengking_emas', name: 'Kalajengking Emas Beracun', regionSlug: 'western_desert', tier: 4, hp: 700, atk: 160, def: 100, spd: 70 }
        ];

        for (const mon of monsters) {
            await Monster.findOneAndUpdate(
                { guildId: GUILD_ID, key: mon.key },
                {
                    guildId: GUILD_ID,
                    key: mon.key,
                    name: mon.name,
                    regionSlug: mon.regionSlug,
                    tier: mon.tier,
                    minRealmIndex: mon.tier - 1,
                    statBlock: {
                        hp: mon.hp,
                        atk: mon.atk,
                        def: mon.def,
                        spd: mon.spd
                    }
                },
                { upsert: true, new: true }
            );
        }
        console.log(`✅ Monsters seeded successfully.`);

        // ==========================
        // 3. SEED SECTS
        // ==========================
        const sects = [
            { name: 'Heavenly Sword Pavilion', description: 'Sekte pedang lurus di Central Plains.', hallSettlementName: 'XiTong City', hallRegionSlug: 'central_plains' },
            { name: 'Profound Heaven Sect', description: 'Sekte pengguna sihir kuno.', hallSettlementName: 'Tianjing', hallRegionSlug: 'central_plains' },
            { name: 'Demonic Flame Palace', description: 'Sekte aliran hitam pengguna api neraka.', hallSettlementName: 'Kota Chishui', hallRegionSlug: 'southern_demon' },
            { name: 'Sekte Puncak Kunlun', description: 'Sekte pedang esoterik abadi.', hallSettlementName: 'Sekte Puncak Kunlun', hallRegionSlug: 'northern_desolate' }
        ];

        for (const sect of sects) {
            await Sect.findOneAndUpdate(
                { guildId: GUILD_ID, name: sect.name },
                {
                    guildId: GUILD_ID,
                    name: sect.name,
                    description: sect.description,
                    hallSettlementName: sect.hallSettlementName,
                    hallRegionSlug: sect.hallRegionSlug,
                    createdBy: 'System Oracle'
                },
                { upsert: true, new: true }
            );
        }
        console.log(`✅ Sects seeded successfully.`);

        console.log('--- SEEDING COMPLETE ---');
        process.exit(0);

    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedData();
