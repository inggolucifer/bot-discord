const mongoose = require('mongoose');
const Monster = require('../models/Monster');
const Item = require('../models/Item');
const AdminLog = require('../models/AdminLog');

// Configuration
const MONSTERS = [
  // General
  {
    key: 'bandit_generic',
    name: 'Bandit Jalanan',
    regionSlug: 'central_plains', // Base bandit, can be encountered everywhere actually, but mapped here as fallback
    tier: 1,
    minRealmIndex: 0,
    statBlock: { hp: 120, atk: 12, def: 5, spd: 8 },
    dropTable: [
      { itemName: 'Makanan Matang', chance: 0.3, quantityMin: 1, quantityMax: 2 },
      { itemName: 'Obat Luka Dasar', chance: 0.2, quantityMin: 1, quantityMax: 1 }
    ],
    currencyDrop: { copperMin: 10, copperMax: 50, silverMin: 0, silverMax: 0 },
    affiliation: 'Bandit',
    description: 'Sekelompok penjahat kelas teri yang suka memalak pelancong.',
    isActive: true
  },
  // 1. Central Plains
  {
    key: 'serigala_dataran',
    name: 'Serigala Dataran',
    regionSlug: 'central_plains',
    tier: 1,
    minRealmIndex: 0,
    statBlock: { hp: 80, atk: 15, def: 3, spd: 12 },
    dropTable: [
      { itemName: 'Daging Buas', chance: 0.6, quantityMin: 1, quantityMax: 2 },
      { itemName: 'Kulit Hewan Biasa', chance: 0.4, quantityMin: 1, quantityMax: 1 }
    ],
    currencyDrop: { copperMin: 5, copperMax: 15, silverMin: 0, silverMax: 0 },
    description: 'Hewan buas yang biasa ditemui di dataran tengah.',
    isActive: true
  },
  {
    key: 'pencuri_lihai',
    name: 'Pencuri Lihai',
    regionSlug: 'central_plains',
    tier: 2,
    minRealmIndex: 0,
    statBlock: { hp: 150, atk: 20, def: 8, spd: 25 },
    dropTable: [
      { itemName: 'Pil Qi Kondensasi', chance: 0.1, quantityMin: 1, quantityMax: 1 }
    ],
    currencyDrop: { copperMin: 50, copperMax: 100, silverMin: 0, silverMax: 0 },
    affiliation: 'Sindikat Bayangan',
    description: 'Pencuri yang gesit dan sering menargetkan kultivator pemula.',
    isActive: true
  },

  // 2. Azure Mountain Range
  {
    key: 'kera_batu_azure',
    name: 'Kera Batu Azure',
    regionSlug: 'azure_mountain_range',
    tier: 2,
    minRealmIndex: 1,
    statBlock: { hp: 300, atk: 35, def: 20, spd: 15 },
    dropTable: [
      { itemName: 'Batu Spiritual Kasar', chance: 0.5, quantityMin: 1, quantityMax: 3 }
    ],
    currencyDrop: { copperMin: 20, copperMax: 80, silverMin: 0, silverMax: 1 },
    description: 'Kera berbulu keras seperti batu, hidup di tebing curam.',
    isActive: true
  },
  {
    key: 'macan_awan_putih',
    name: 'Macan Awan Putih',
    regionSlug: 'azure_mountain_range',
    tier: 3,
    minRealmIndex: 2,
    statBlock: { hp: 500, atk: 60, def: 25, spd: 40 },
    dropTable: [
      { itemName: 'Taring Macan Awan', chance: 0.8, quantityMin: 1, quantityMax: 2 },
      { itemName: 'Inti Monster Tier 1', chance: 0.1, quantityMin: 1, quantityMax: 1 }
    ],
    currencyDrop: { copperMin: 0, copperMax: 0, silverMin: 1, silverMax: 3 },
    description: 'Penguasa pegunungan yang sangat lincah bagai awan.',
    isActive: true
  },

  // 3. Southern Demon Domain
  {
    key: 'kelelawar_darah_selatan',
    name: 'Kelelawar Darah',
    regionSlug: 'southern_demon_domain',
    tier: 3,
    minRealmIndex: 2,
    statBlock: { hp: 400, atk: 55, def: 15, spd: 50 },
    dropTable: [
      { itemName: 'Sayap Kelelawar Iblis', chance: 0.7, quantityMin: 1, quantityMax: 3 }
    ],
    currencyDrop: { copperMin: 10, copperMax: 50, silverMin: 1, silverMax: 2 },
    affiliation: 'Kultus Iblis Selatan',
    description: 'Hewan buas yang haus darah, konon dipelihara oleh kultus iblis.',
    isActive: true
  },
  {
    key: 'golem_rawa_beracun',
    name: 'Golem Rawa Beracun',
    regionSlug: 'southern_demon_domain',
    tier: 4,
    minRealmIndex: 3,
    statBlock: { hp: 1200, atk: 80, def: 60, spd: 10 },
    dropTable: [
      { itemName: 'Lumpur Beracun', chance: 0.9, quantityMin: 2, quantityMax: 5 },
      { itemName: 'Inti Monster Tier 2', chance: 0.2, quantityMin: 1, quantityMax: 1 }
    ],
    currencyDrop: { copperMin: 0, copperMax: 0, silverMin: 2, silverMax: 5 },
    description: 'Monster raksasa yang terbentuk dari rawa mematikan.',
    isActive: true
  },

  // 4. Eastern Sea Region
  {
    key: 'kepiting_baja_timur',
    name: 'Kepiting Baja',
    regionSlug: 'eastern_sea_region',
    tier: 3,
    minRealmIndex: 2,
    statBlock: { hp: 800, atk: 40, def: 50, spd: 15 },
    dropTable: [
      { itemName: 'Cangkang Kepiting Baja', chance: 0.8, quantityMin: 1, quantityMax: 2 }
    ],
    currencyDrop: { copperMin: 50, copperMax: 200, silverMin: 0, silverMax: 1 },
    description: 'Kepiting raksasa dengan cangkang sekeras baja.',
    isActive: true
  },
  {
    key: 'bajak_laut_timur',
    name: 'Perompak Laut Timur',
    regionSlug: 'eastern_sea_region',
    tier: 4,
    minRealmIndex: 3,
    statBlock: { hp: 900, atk: 85, def: 35, spd: 45 },
    dropTable: [
      { itemName: 'Mutiara Laut Dalam', chance: 0.1, quantityMin: 1, quantityMax: 1 }
    ],
    currencyDrop: { copperMin: 0, copperMax: 0, silverMin: 3, silverMax: 8 },
    affiliation: 'Bajak Laut Timur',
    description: 'Perompak kejam yang menguasai jalur perdagangan laut timur.',
    isActive: true
  },

  // 5. Northern Desolate Territory
  {
    key: 'beruang_es_utara',
    name: 'Beruang Es Utara',
    regionSlug: 'northern_desolate_territory',
    tier: 4,
    minRealmIndex: 3,
    statBlock: { hp: 1500, atk: 100, def: 45, spd: 20 },
    dropTable: [
      { itemName: 'Bulu Beruang Es', chance: 0.8, quantityMin: 1, quantityMax: 3 }
    ],
    currencyDrop: { copperMin: 0, copperMax: 0, silverMin: 4, silverMax: 6 },
    description: 'Beruang raksasa yang beradaptasi dengan cuaca dingin ekstrem.',
    isActive: true
  },
  {
    key: 'bandit_salju_utara',
    name: 'Penjarah Salju',
    regionSlug: 'northern_desolate_territory',
    tier: 5,
    minRealmIndex: 4,
    statBlock: { hp: 2000, atk: 130, def: 60, spd: 35 },
    dropTable: [
      { itemName: 'Inti Es Spiritual', chance: 0.3, quantityMin: 1, quantityMax: 1 }
    ],
    currencyDrop: { copperMin: 0, copperMax: 0, silverMin: 10, silverMax: 20 },
    affiliation: 'Gerombolan Utara',
    description: 'Penjahat ganas yang bertahan hidup di dataran es.',
    isActive: true
  },

  // 6. Western Sacred Deserts
  {
    key: 'kalajengking_pasir',
    name: 'Kalajengking Pasir Kematian',
    regionSlug: 'western_sacred_deserts',
    tier: 4,
    minRealmIndex: 3,
    statBlock: { hp: 1000, atk: 110, def: 40, spd: 30 },
    dropTable: [
      { itemName: 'Racun Kalajengking', chance: 0.6, quantityMin: 1, quantityMax: 2 }
    ],
    currencyDrop: { copperMin: 100, copperMax: 500, silverMin: 1, silverMax: 3 },
    description: 'Kalajengking raksasa yang bersembunyi di bawah pasir panas.',
    isActive: true
  },
  {
    key: 'bandit_gurun_barat',
    name: 'Penyergap Gurun',
    regionSlug: 'western_sacred_deserts',
    tier: 5,
    minRealmIndex: 4,
    statBlock: { hp: 1800, atk: 150, def: 55, spd: 40 },
    dropTable: [
      { itemName: 'Batu Spiritual Biasa', chance: 0.4, quantityMin: 1, quantityMax: 2 }
    ],
    currencyDrop: { copperMin: 0, copperMax: 0, silverMin: 15, silverMax: 25 },
    affiliation: 'Bandit Gurun',
    description: 'Kelompok penyamun yang sangat ahli dalam menyamar di gurun pasir.',
    isActive: true
  }
];

// Helper to construct basic items if they don't exist
const ensureItemsExist = async (guildId, isDryRun) => {
  const itemNames = new Set();
  MONSTERS.forEach(m => m.dropTable.forEach(drop => itemNames.add(drop.itemName)));

  const missingNames = [];
  for (const name of itemNames) {
    const exists = await Item.findOne({ guildId, name });
    if (!exists) {
      missingNames.push(name);
    }
  }

  if (missingNames.length > 0) {
    console.log(`[Item] Sedang membuat ${missingNames.length} item material fallback...`);
    if (!isDryRun) {
      for (const name of missingNames) {
        await Item.create({
          guildId,
          name,
          rank: 'Common',
          category: 'material',
          tier: 1,
          description: `Bahan material hasil buruan dari monster. (${name})`,
          basePrice: 10
        });
      }
    } else {
      console.log(`[DRY-RUN] Akan membuat item: ${missingNames.join(', ')}`);
    }
  }
};

const run = async () => {
  const args = process.argv.slice(2);
  const guildArg = args.find(a => a.startsWith('--guildId='));
  const isDryRun = args.includes('--dry-run');

  if (!guildArg) {
    console.error('Error: Argumen --guildId wajib diberikan! Contoh: --guildId=123456789');
    process.exit(1);
  }

  const guildId = guildArg.split('=')[1];
  console.log(`Menjalankan Seed Monster untuk Guild ID: ${guildId} | Dry Run: ${isDryRun}`);

  try {
    const { connectDB } = require('../config/database');
    await connectDB();

    await ensureItemsExist(guildId, isDryRun);

    // Fetch existing items for reference mapping
    const existingItems = await Item.find({ guildId });
    const itemMap = {};
    existingItems.forEach(i => {
      itemMap[i.name] = i._id;
    });

    let updatedCount = 0;
    let createdCount = 0;

    for (const mData of MONSTERS) {
      const dropTableMapped = mData.dropTable.map(drop => {
         const matchedId = itemMap[drop.itemName] || null;
         return {
            itemId: matchedId,
            itemName: drop.itemName,
            chance: drop.chance,
            quantityMin: drop.quantityMin,
            quantityMax: drop.quantityMax
         };
      });

      const monsterPayload = {
         ...mData,
         guildId,
         dropTable: dropTableMapped
      };

      if (!isDryRun) {
         const result = await Monster.findOneAndUpdate(
           { guildId, key: mData.key },
           { $set: monsterPayload },
           { upsert: true, new: true, setDefaultsOnInsert: true }
         );

         if (result.createdAt.getTime() === result.updatedAt.getTime()) {
           createdCount++;
         } else {
           updatedCount++;
         }
      } else {
         console.log(`[DRY-RUN] Akan memproses monster: ${mData.key} (${mData.name})`);
         createdCount++; // assume created for logging
      }
    }

    if (!isDryRun) {
        await AdminLog.create({
            guildId,
            adminId: 'SYSTEM_MIGRATION_SCRIPT',
            action: 'seed_monsters',
            details: `Fase 6: Seed ${createdCount} baru, update ${updatedCount} monster.`
        });
        console.log(`Berhasil memproses monster: ${createdCount} dibuat, ${updatedCount} diupdate.`);
    }

    console.log('Seed selesai.');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding monsters:', err);
    process.exit(1);
  }
};

run();