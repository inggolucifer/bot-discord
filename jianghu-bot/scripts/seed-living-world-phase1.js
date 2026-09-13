const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const Manual = require('../models/Manual');
const Shop = require('../models/Shop');
const Item = require('../models/Item');
const Sect = require('../models/Sect');
const { AdminLog } = require('../models/AdminLog');

async function seedPhase1() {
  const args = process.argv.slice(2);
  let guildId = null;
  let dryRun = false;

  args.forEach(arg => {
    if (arg.startsWith('--guildId=')) {
      guildId = arg.split('=')[1];
    }
    if (arg === '--dry-run') {
      dryRun = true;
    }
  });

  if (!guildId) {
    console.error("❌ Error: --guildId argument is required. Example: node scripts/seed-living-world-phase1.js --guildId=1234567890");
    process.exit(1);
  }

  console.log(`🌱 Starting Phase 1 Living World Seed for guildId: ${guildId} ${dryRun ? '(DRY RUN)' : ''}`);

  require('dotenv').config();
  if (!dryRun) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  // --- REGIONS & THEMES ---
  const regions = [
    { slug: 'central_plains', name: 'Dataran Tengah', blacksmithDesc: 'Pandai besi pusat yang sibuk. Udara dipenuhi suara palu beradu besi, mencetak senjata standar prajurit.', workerDesc: 'Sawah luas membentang, menghasilkan padi dan gandum untuk menyuplai seluruh dataran.', workerOutputName: 'Padi Dataran Tengah', outputCategory: 'material' },
    { slug: 'azure_mountain_range', name: 'Azure Mountain Range', blacksmithDesc: 'Pandai besi di puncak berkabut. Api tungkunya membakar batu roh gunung, ideal untuk menempa pedang.', workerDesc: 'Kebun herba di lereng curam, memanen tanaman yang menyerap qi pegunungan yang tipis namun murni.', workerOutputName: 'Herba Embun Puncak', outputCategory: 'herb' },
    { slug: 'southern_demon_domain', name: 'Southern Demon Domain', blacksmithDesc: 'Tungku hitam yang memancarkan panas terik dan bau belerang, menempa senjata dengan aura buas.', workerDesc: 'Lahan rawa gelap tempat tumbuhnya herba beracun dan jamur iblis yang berbahaya namun berharga.', workerOutputName: 'Jamur Darah Iblis', outputCategory: 'herb' },
    { slug: 'eastern_sea_region', name: 'Eastern Sea Region', blacksmithDesc: 'Pandai besi pesisir yang menggunakan pasir besi dari dasar laut, menempa senjata lentur namun tajam.', workerDesc: 'Tambak air payau yang menghasilkan garam berkualitas dan mutiara energi dari dasar laut.', workerOutputName: 'Garam Laut Timur', outputCategory: 'material' },
    { slug: 'northern_desolate_territory', name: 'Northern Desolate Territory', blacksmithDesc: 'Tungku di dalam gua es, membutuhkan kayu khusus untuk melelehkan besi dingin dari tundra.', workerDesc: 'Pos perburuan di tengah badai salju, mengumpulkan bulu tebal dan daging hewan liar.', workerOutputName: 'Bulu Serigala Salju', outputCategory: 'material' },
    { slug: 'western_sacred_deserts', name: 'Western Sacred Deserts', blacksmithDesc: 'Tungku yang memanfaatkan panas mentari gurun, ideal untuk menempa bilah melengkung ringan dan zirah kain.', workerDesc: 'Oasis yang menjadi pusat budidaya kurma roh dan herba gurun penyimpan air.', workerOutputName: 'Kurma Pasir Roh', outputCategory: 'herb' }
  ];

  // Helper to ensure item exists
  const ensureItem = async (itemName, itemData) => {
    let item = dryRun ? null : await Item.findOne({ guildId, name: itemName });
    if (!item) {
      if (!dryRun) {
        item = new Item({ guildId, name: itemName, ...itemData });
        await item.save();
        console.log(`   [+] Created Item: ${itemName}`);
      } else {
        console.log(`   [~] Will create Item: ${itemName}`);
        item = { _id: new mongoose.Types.ObjectId(), name: itemName, ...itemData };
      }
    }
    return item;
  };

  const ensureAsset = async (assetName, assetData) => {
      let asset = dryRun ? null : await Asset.findOne({ guildId, name: assetName });
      if (!asset) {
          if (!dryRun) {
              asset = new Asset({ guildId, name: assetName, ...assetData });
              await asset.save();
              console.log(`   [+] Created Asset: ${assetName}`);
          } else {
              console.log(`   [~] Will create Asset: ${assetName}`);
          }
      }
      return asset;
  };

  const ensureManual = async (manualName, manualData) => {
      let manual = dryRun ? null : await Manual.findOne({ guildId, name: manualName });
      if (!manual) {
          if (!dryRun) {
              manual = new Manual({ guildId, name: manualName, ...manualData });
              await manual.save();
              console.log(`   [+] Created Manual: ${manualName}`);
          } else {
              console.log(`   [~] Will create Manual: ${manualName}`);
              manual = { _id: new mongoose.Types.ObjectId(), name: manualName, ...manualData };
          }
      }
      return manual;
  };

  const ensureShop = async (shopData) => {
      if (dryRun) {
          console.log(`   [~] Will create Shop Entry for: ${shopData.refModel} (${shopData.refId})`);
          return;
      }
      let shopEntry = await Shop.findOne({ guildId, refId: shopData.refId, refModel: shopData.refModel });
      if (!shopEntry) {
          shopEntry = new Shop({ guildId, ...shopData });
          await shopEntry.save();
          console.log(`   [+] Created Shop Entry for: ${shopData.refModel} (${shopData.refId})`);
      }
  };

  console.log('\n--- 1. Seeding Items ---');
  // Seed base materials
  const ironOre = await ensureItem('Biji Besi Kasar', { rank: 'Common', category: 'material', tier: 1, basePrice: 10, priceCurrency: 'copper' });
  const spiritualWood = await ensureItem('Kayu Roh Biasa', { rank: 'Common', category: 'material', tier: 1, basePrice: 10, priceCurrency: 'copper' });

  // Seed Region Output Items
  const regionOutputs = {};
  for (const region of regions) {
      regionOutputs[region.slug] = await ensureItem(region.workerOutputName, {
          rank: 'Common',
          category: region.outputCategory,
          tier: 1,
          basePrice: 50,
          priceCurrency: 'copper',
          description: `Sumber daya khas dari wilayah ${region.name}.`
      });
  }

  // Seed Blacksmith Recipe Output Items
  const blacksmithOutputs = [];
  const baseRecipes = [
      { prefix: 'Pedang', type: 'weapon', baseAtk: 15 },
      { prefix: 'Zirah', type: 'armor', baseDef: 10 },
      { prefix: 'Tombak', type: 'weapon', baseAtk: 18 },
  ];

  for (const region of regions) {
      const regionItems = [];
      let tier = 1;
      let minRealmIndex = 0;
      let price = 50;
      let currency = 'copper';

      // Adjust tiers/prices based on region for variety
      if (['northern_desolate_territory', 'western_sacred_deserts', 'southern_demon_domain'].includes(region.slug)) {
          tier = 2;
          minRealmIndex = 1;
          price = 5;
          currency = 'silver';
      }

      for (const recipeTemplate of baseRecipes) {
          const itemName = `${recipeTemplate.prefix} ${region.name}`;
          const item = await ensureItem(itemName, {
              rank: 'Common',
              category: recipeTemplate.type,
              tier: tier,
              basePrice: price,
              priceCurrency: currency,
              minRealmIndex: minRealmIndex,
              baseAtk: recipeTemplate.baseAtk || 0,
              baseDef: recipeTemplate.baseDef || 0,
              description: `Ditempa di wilayah ${region.name}.`
          });
          regionItems.push(item);
      }
      blacksmithOutputs.push({ region, items: regionItems });
  }

  console.log('\n--- 2. Seeding Assets (Blacksmith & Worker) ---');
  for (const bo of blacksmithOutputs) {
      const { region, items } = bo;
      // Asset Blacksmith
      const blacksmithName = `Pandai Besi ${region.name}`;
      let minRealmIndex = ['central_plains', 'eastern_sea_region'].includes(region.slug) ? 0 : 1;

      const recipes = items.map(outputItem => ({
          recipeName: `Pembuatan ${outputItem.name}`,
          resultItemId: outputItem._id,
          resultItemName: outputItem.name,
          resultQuantity: 1,
          materials: [
              { itemId: ironOre._id, itemName: ironOre.name, quantity: 2 },
              { itemId: spiritualWood._id, itemName: spiritualWood.name, quantity: 1 }
          ],
          craftingTimeHours: 1
      }));

      await ensureAsset(blacksmithName, {
          description: region.blacksmithDesc,
          minRealmIndex: minRealmIndex,
          isCraftingStation: true,
          recipes: recipes,
          basePrice: 1,
          priceCurrency: 'gold',
          rank: 'Rare'
      });

      // Asset Worker
      const workerName = `Lahan Produksi ${region.name}`;
      const outputItem = regionOutputs[region.slug];
      await ensureAsset(workerName, {
          description: region.workerDesc,
          minRealmIndex: minRealmIndex,
          workerOutputItemId: outputItem._id,
          workerOutputItemName: outputItem.name,
          workerOutputQuantity: 5,
          basePrice: 50,
          priceCurrency: 'silver',
          rank: 'Uncommon'
      });
  }

  console.log('\n--- 3. Seeding High-Tier Manuals & Shop ---');

  // Find a sect to bind one manual to
  let testSect = null;
  if (!dryRun) {
      testSect = await Sect.findOne({ guildId });
  }

  const manualsToSeed = [
      { name: 'Kitab Naga Kaisar', minRealmIndex: 3, effectType: 'damage', effectValue: 1.8, timeToComprehendHours: 48, baseCost: 10, costCurrency: 'jade', requiredSectId: null },
      { name: 'Teknik Pernafasan Langit', minRealmIndex: 4, effectType: 'shield', effectValue: 2.0, timeToComprehendHours: 72, baseCost: 5, costCurrency: 'spirit', requiredSectId: null },
      { name: 'Jurus Bayangan Hantu', minRealmIndex: 3, effectType: 'lifesteal', effectValue: 1.5, timeToComprehendHours: 48, baseCost: 15, costCurrency: 'jade', requiredSectId: null },
      { name: 'Seni Pedang Tanpa Bentuk', minRealmIndex: 5, effectType: 'damage', effectValue: 2.5, timeToComprehendHours: 96, baseCost: 20, costCurrency: 'spirit', requiredSectId: null }
  ];

  if (testSect) {
      manualsToSeed.push({
          name: `Jurus Rahasia ${testSect.name}`,
          minRealmIndex: 4,
          effectType: 'poison',
          effectValue: 2.0,
          timeToComprehendHours: 72,
          baseCost: 10,
          costCurrency: 'spirit',
          requiredSectId: testSect._id
      });
      console.log(`   [i] Found Sect '${testSect.name}', binding one manual to it.`);
  } else {
      console.log(`   [!] No Sect found in DB for this guild. Tested requiredSectId with null only — needs sect seed.`);
  }

  for (const mData of manualsToSeed) {
      // Seed Learn Item for Manual (Shop sells items that let you learn manuals)
      const manualName = mData.name;
      const learnItemName = `Kitab Kuno: ${manualName}`;

      const learnItem = await ensureItem(learnItemName, {
          rank: 'Mythical',
          category: 'manual',
          tier: 7,
          minRealmIndex: mData.minRealmIndex,
          basePrice: mData.baseCost,
          priceCurrency: mData.costCurrency,
          effect: `learn_manual_${manualName}`,
          description: `Membaca kitab ini akan memberimu wawasan untuk mempelajari ${manualName}.`
      });

      const manual = await ensureManual(manualName, mData);

      // Seed Shop Entry
      if (learnItem) {
          await ensureShop({
              category: 'item',
              refId: learnItem._id,
              refModel: 'Item',
              price: mData.baseCost * 2, // Shop price
              priceCurrency: mData.costCurrency,
              stock: -1
          });
      }
  }


  if (!dryRun) {
      await mongoose.disconnect();
      console.log('✅ Seeding completed and disconnected from DB.');
  } else {
      console.log('✅ Dry Run completed.');
  }
}

seedPhase1().catch(err => {
  console.error(err);
  process.exit(1);
});