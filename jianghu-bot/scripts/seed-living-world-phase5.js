const mongoose = require('mongoose');
require('dotenv').config();
const Npc = require('../models/Npc');
const Quest = require('../models/Quest');
const Item = require('../models/Item');
const AdminLog = require('../models/AdminLog');
const Location = require('../models/Location');

const guildIdArg = process.argv.find(arg => arg.startsWith('--guildId='));
const isDryRun = process.argv.includes('--dry-run');

const guildId = guildIdArg ? guildIdArg.split('=')[1] : null;

if (!guildId) {
    console.error('Harap berikan --guildId=<id>');
    process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jianghubot';

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Create missing item if not exist
        let gandum = await Item.findOne({ guildId, name: 'Karung Gandum' });
        if (!gandum) {
             console.log('Creating Item: Karung Gandum');
             if (!isDryRun) {
                 gandum = await Item.create({
                     guildId, name: 'Karung Gandum', rank: 'Common', category: 'material',
                     tier: 1, basePrice: 5, priceCurrency: 'copper', description: 'Gandum hasil tani.'
                 });
             } else {
                 gandum = { _id: new mongoose.Types.ObjectId() };
             }
        }

        // NPCs
        const npcs = [
            {
                name: 'Penatua Zhou',
                title: 'Penatua Desa',
                description: 'Orang tua bijak di Desa Xingcun.',
                regionSlug: 'central_plains',
                settlementName: 'Desa Xingcun',
                buildingName: null,
                greeting: 'Selamat datang di Desa Xingcun, anak muda. Ada yang bisa kakek bantu?',
                dialogLines: [
                    { id: 'intro', text: 'Desa ini sudah berdiri sejak ratusan tahun lalu.', responses: [] }
                ],
                minRealmIndexToTalk: 0
            },
            {
                name: 'Ahli Tani Lian',
                title: 'Petani Senior',
                description: 'Petani berpengalaman di Desa Xingcun.',
                regionSlug: 'central_plains',
                settlementName: 'Desa Xingcun',
                buildingName: 'Ladang Desa',
                greeting: 'Huf... cuaca hari ini cukup panas. Ladang butuh perawatan ekstra.',
                dialogLines: [],
                minRealmIndexToTalk: 0
            },
            {
                name: 'Kurir Biro Shen',
                title: 'Pengantar Pesan',
                description: 'Kurir andalan Biro Pengawalan.',
                regionSlug: 'central_plains',
                settlementName: 'Kota Tianjing',
                buildingName: null,
                greeting: 'Waktu adalah uang! Maaf, aku sedang buru-buru.',
                dialogLines: [],
                minRealmIndexToTalk: 0
            },
            {
                name: 'Pelatih Dojo Han',
                title: 'Master Bela Diri',
                description: 'Pelatih di Dojo Xingcun.',
                regionSlug: 'central_plains',
                settlementName: 'Desa Xingcun',
                buildingName: 'Dojo Latihan',
                greeting: 'Disiplin adalah kunci bela diri! Jangan malas!',
                dialogLines: [],
                minRealmIndexToTalk: 1 // Needs some level
            }
        ];

        const npcIdsMap = {};

        for (const npcData of npcs) {
            let npc = await Npc.findOne({ guildId, name: npcData.name });
            if (!npc) {
                console.log(`Creating NPC: ${npcData.name}`);
                if (!isDryRun) {
                    npc = await Npc.create({ ...npcData, guildId });
                }
            } else {
                console.log(`NPC ${npcData.name} already exists.`);
                if (!isDryRun) {
                    await Npc.updateOne({ _id: npc._id }, { $set: npcData });
                }
            }
            if (npc) npcIdsMap[npcData.name] = npc._id;
        }

        // Quests
        const quests = [
            {
                key: 'xingcun_meet_elder',
                title: 'Sapa Penatua Desa',
                description: 'Penatua Zhou ingin berbicara denganmu di plaza Desa Xingcun.',
                giverNpcId: npcIdsMap['Penatua Zhou'],
                minRealmIndex: 0,
                objectives: [
                    {
                        type: 'talk_to_npc',
                        targetNpcId: npcIdsMap['Penatua Zhou'],
                        description: 'Bicara dengan Penatua Zhou'
                    }
                ],
                rewards: { copper: 50, qiBonus: 10 }
            },
            {
                key: 'xingcun_delivery_tianjing',
                title: 'Surat untuk Tianjing',
                description: 'Antar surat dari Penatua Zhou ke Kota Tianjing.',
                giverNpcId: npcIdsMap['Penatua Zhou'],
                minRealmIndex: 0,
                requiresQuestKeysCompleted: ['xingcun_meet_elder'],
                objectives: [
                    {
                        type: 'reach_settlement',
                        targetSettlementName: 'Kota Tianjing',
                        description: 'Pergi ke Kota Tianjing'
                    },
                    {
                        type: 'talk_to_npc',
                        targetNpcId: npcIdsMap['Kurir Biro Shen'],
                        description: 'Bicara dengan Kurir Biro Shen di Tianjing'
                    }
                ],
                rewards: { silver: 1, items: [] }
            },
            {
                key: 'xingcun_farm_help',
                title: 'Bantu Ahli Tani',
                description: 'Ahli Tani Lian membutuhkan 2 Karung Gandum.',
                giverNpcId: npcIdsMap['Ahli Tani Lian'],
                minRealmIndex: 0,
                objectives: [
                    {
                        type: 'submit_item',
                        itemName: 'Karung Gandum',
                        itemId: gandum ? gandum._id : null,
                        quantity: 2,
                        description: 'Serahkan 2 Karung Gandum'
                    }
                ],
                rewards: { copper: 100, items: [] }
            },
            {
                key: 'xingcun_patience',
                title: 'Ujian Kesabaran',
                description: 'Pelatih Dojo Han mengujimu untuk bermeditasi selama 1 jam.',
                giverNpcId: npcIdsMap['Pelatih Dojo Han'],
                minRealmIndex: 1,
                objectives: [
                    {
                        type: 'wait_time',
                        durationHours: 1,
                        description: 'Meditasi selama 1 Jam'
                    }
                ],
                rewards: { qiBonus: 50 }
            }
        ];

        for (const questData of quests) {
             let quest = await Quest.findOne({ guildId, key: questData.key });
             if (!quest) {
                 console.log(`Creating Quest: ${questData.title}`);
                 if (!isDryRun) {
                     quest = await Quest.create({ ...questData, guildId });
                 }
             } else {
                 console.log(`Quest ${questData.title} already exists.`);
                 if (!isDryRun) {
                     await Quest.updateOne({ _id: quest._id }, { $set: questData });
                 }
             }

             // Link back to giver NPC
             if (!isDryRun && quest && questData.giverNpcId) {
                 await Npc.updateOne(
                     { _id: questData.giverNpcId },
                     { $addToSet: { questIds: quest._id } }
                 );
             }
        }

        // Link NPCs to Locations
        if (!isDryRun) {
            for (const npcData of npcs) {
                if (!npcIdsMap[npcData.name]) continue;

                const locQuery = {
                    guildId,
                    settlementName: npcData.settlementName,
                    buildingName: npcData.buildingName
                };

                // If it's a building, just update. If it's a settlement root, location might not have buildingName or it's just plaza/null
                if (npcData.buildingName) {
                    await Location.updateOne(locQuery, { $addToSet: { npcIds: npcIdsMap[npcData.name] } });
                } else {
                    // It's in the plaza / settlement root
                    const rootLocs = await Location.find({ guildId, settlementName: npcData.settlementName, buildingName: null });
                    // In phase 2/3 locations usually have buildingType plaza for root
                    await Location.updateMany({ guildId, settlementName: npcData.settlementName, buildingType: 'plaza' }, { $addToSet: { npcIds: npcIdsMap[npcData.name] } });
                }
            }

            await AdminLog.create({
                guildId,
                adminId: 'SYSTEM_MIGRATION_SCRIPT',
                action: 'SEED_LIVING_WORLD_PHASE5',
                details: `Seeded NPCs and Quests for phase 5.`
            });
        }

        console.log('Seed Phase 5 completed successfully.');
    } catch (e) {
        console.error('Seed error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
