/**
 * services/settlementFacilityService.js
 * 
 * Lapisan Bisnis Interaksi Fasilitas Pemukiman Jianghu (Tale of Immortal style)
 * - Kandang Kuda (Courier Stables): Beli tunggangan & pakan kuda
 * - Paviliun Kitab (Manual Pavilion): Katalog & pemahaman kitab jurus dasar
 * - Bengkel (Workshop): Reparasi durabilitas perlengkapan tempur
 * - Kedai (Tavern): Santap hidangan arak & dengar gosip dunia persilatan
 */

const Item = require('../models/Item');
const Manual = require('../models/Manual');
const { payCurrency, hasEnoughCurrency, getTotalCopper } = require('../utils/currency');

const CORE_MANUALS_DEFINITIONS = [
  {
    name: 'Kitab Langkah Angin',
    description: 'Meringankan beban langkah, mengurangi konsumsi stamina dan meningkatkan kelincahan.',
    minRealmIndex: 0,
    maxLevel: 10,
    timeToComprehendHours: 4,
    baseCost: 50,
    costCurrency: 'silver',
    flatBonusPerLevel: { spd: 5 },
    requiredSkillType: 'special',
    requiredSkillPoints: 0
  },
  {
    name: 'Sutra Pedang Bambu Hijau',
    description: 'Meningkatkan serangan tebasan pedang dasar +20 ATK.',
    minRealmIndex: 0,
    maxLevel: 10,
    timeToComprehendHours: 6,
    baseCost: 75,
    costCurrency: 'silver',
    flatBonusPerLevel: { atk: 6 },
    requiredSkillType: 'sword',
    requiredSkillPoints: 0
  },
  {
    name: 'Metode Tinju Batu Hitam',
    description: 'Memperkuat daya tahan tubuh dan tinju pendekar.',
    minRealmIndex: 0,
    maxLevel: 10,
    timeToComprehendHours: 5,
    baseCost: 60,
    costCurrency: 'silver',
    flatBonusPerLevel: { def: 4, hp: 20 },
    requiredSkillType: 'fist',
    requiredSkillPoints: 0
  },
  {
    name: 'Sutra Pernapasan Batin Murni',
    description: 'Mempercepat regenerasi Qi saat meditasi di paviliun.',
    minRealmIndex: 1,
    maxLevel: 10,
    timeToComprehendHours: 8,
    baseCost: 120,
    costCurrency: 'silver',
    flatBonusPerLevel: { hp: 50, atk: 4, def: 4 },
    requiredSkillType: 'core',
    requiredSkillPoints: 0
  }
];

const TAVERN_RUMORS = [
  'Ada kabar bahwa seorang pemburu melihat Serigala Roh Darah berkeliaran di dekat koordinat (2452, 2481). Hati-hati jika melangkah ke sana!',
  'Di puncak barat, konon kabut di Lembah Roh menyembunyikan herba roh tingkat tinggi yang dilindungi formasi kuno.',
  'Dermaga Donghai kabarnya sedang ramai oleh pendekar yang ingin menyeberang menuju pulau terlarang.',
  'Para tetua sekte mengatakan bahwa kultivator fana yang murni harus segera mematri Hukum Alam sebelum menembus ranah Qi Refining.',
  'Memakai Kuda Jinak Jianghu dapat memangkas separuh konsumsi stamina langkah kaki saat melintasi hutan belantara.'
];

/**
 * Menjamin keberadaan 4 manual awal di database secara idempoten
 */
async function ensureCoreManuals() {
  for (const def of CORE_MANUALS_DEFINITIONS) {
    const existing = await Manual.findOne({ name: def.name });
    if (!existing) {
      await Manual.create({
        guildId: 'global',
        ...def
      });
      console.log(`[CORE-MANUALS] Manual baru didaftarkan: ${def.name}`);
    }
  }
}

/**
 * Mengambil daftar manual di Paviliun Kitab beserta status kepemilikan pemain
 */
async function getManualPavilionList(player) {
  await ensureCoreManuals();
  const manuals = await Manual.find({
    name: { $in: CORE_MANUALS_DEFINITIONS.map(d => d.name) }
  }).lean();

  const learnedManualIds = new Set(
    (player.manuals || []).map(m => String(m.manualId?._id || m.manualId))
  );

  return manuals.map(m => ({
    id: m._id.toString(),
    name: m.name,
    description: m.description,
    minRealmIndex: m.minRealmIndex,
    price: m.baseCost,
    currency: m.costCurrency === 'silver' ? 'Perak' : m.costCurrency,
    flatBonus: m.flatBonusPerLevel,
    isLearned: learnedManualIds.has(String(m._id)),
    requiredSkillType: m.requiredSkillType
  }));
}

/**
 * Membeli dan mempelajari manual dari Paviliun Kitab
 */
async function learnPavilionManual(player, manualIdentifier) {
  await ensureCoreManuals();

  const query = manualIdentifier.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: manualIdentifier }
    : { name: manualIdentifier };

  const manual = await Manual.findOne(query);
  if (!manual) {
    throw new Error('Kitab manual tidak ditemukan di Paviliun Kitab.');
  }

  // Cek apakah sudah pernah dipelajari
  const alreadyLearned = (player.manuals || []).some(
    m => String(m.manualId?._id || m.manualId) === String(manual._id)
  );
  if (alreadyLearned) {
    throw new Error(`Kitab '${manual.name}' sudah pernah kamu pelajari.`);
  }

  // Cek syarat ranah
  const playerRealm = Number(player.realmIndex ?? 0);
  if (playerRealm < manual.minRealmIndex) {
    throw new Error(`Kapasitas ranah dantian belum mencukupi. Butuh ranah tingkat ${manual.minRealmIndex}.`);
  }

  // Validasi saldo perak
  const cost = manual.baseCost || 50;
  if (!hasEnoughCurrency(player.currency, cost, 'silver')) {
    const totalSilver = Math.floor(getTotalCopper(player.currency) / 100);
    throw new Error(`Perak tidak mencukupi. Membutuhkan ${cost} Perak (total kekayaan senilai: ${totalSilver} Perak).`);
  }

  // Potong perak secara sah
  payCurrency(player.currency, cost, 'silver');

  // Tambahkan ke koleksi manuals pemain
  if (!player.manuals) player.manuals = [];
  player.manuals.push({
    manualId: manual._id,
    level: 1,
    comprehendingUntil: null
  });

  player.markModified('currency');
  player.markModified('manuals');
  await player.save();

  return {
    success: true,
    message: `🎉 Selamat! Kamu telah resmi mempelajari '${manual.name}'! Bonus atribut aktif telah ditambahkan ke profilmu.`,
    manual: {
      id: manual._id,
      name: manual.name,
      level: 1
    },
    remainingSilver: player.currency.silver
  };
}

/**
 * Pembelian tunggangan atau perlengkapan perjalanan di Kandang Kuda
 */
async function buyStablesItem(player, itemKey, quantity = 1) {
  const allowedKeys = ['item_horse_jianghu', 'item_horse_fodder'];
  if (!allowedKeys.includes(itemKey)) {
    throw new Error('Item kandang kuda tidak valid.');
  }

  const itemDoc = await Item.findOne({ itemKey });
  if (!itemDoc) {
    throw new Error(`Item ${itemKey} belum terdaftar di katalog dunia.`);
  }

  const effectiveQty = itemKey === 'item_horse_fodder' ? Math.max(1, quantity) : 1;
  const totalCost = (itemDoc.buyPrice || 10) * effectiveQty;

  if (!hasEnoughCurrency(player.currency, totalCost, 'silver')) {
    const totalSilver = Math.floor(getTotalCopper(player.currency) / 100);
    throw new Error(`Perak tidak mencukupi. Membutuhkan ${totalCost} Perak (total kekayaan senilai: ${totalSilver} Perak).`);
  }

  payCurrency(player.currency, totalCost, 'silver');

  if (!player.inventory) player.inventory = [];

  // Jika beli kuda dan slot mount belum terpasang, langsung pasang
  let autoEquipped = false;
  if (itemDoc.category === 'mount') {
    const existingSlot = player.inventory.find(i => String(i.itemId) === String(itemDoc._id));
    let mountSlotId;
    if (existingSlot) {
      existingSlot.quantity += 1;
      mountSlotId = existingSlot._id;
    } else {
      player.inventory.push({
        itemId: itemDoc._id,
        quantity: 1,
        qualityMultiplier: 1,
        isEquipped: false
      });
      const newSlot = player.inventory[player.inventory.length - 1];
      mountSlotId = newSlot._id;
    }

    if (!player.equipment) player.equipment = {};
    if (!player.equipment.mount) {
      player.equipment.mount = mountSlotId;
      player.equippedMount = itemDoc.mountType || 'horse';
      autoEquipped = true;
    }
  } else {
    // Pakan Kuda (Consumable)
    const existingSlot = player.inventory.find(i => String(i.itemId) === String(itemDoc._id));
    if (existingSlot) {
      existingSlot.quantity += effectiveQty;
    } else {
      player.inventory.push({
        itemId: itemDoc._id,
        quantity: effectiveQty,
        qualityMultiplier: 1,
        isEquipped: false
      });
    }
  }

  player.markModified('currency');
  player.markModified('inventory');
  player.markModified('equipment');
  await player.save();

  return {
    success: true,
    message: autoEquipped
      ? `🎉 Berhasil membeli dan langsung menunggangi ${itemDoc.name}! Efisiensi stamina langkah meningkat.`
      : `🎉 Berhasil membeli ${effectiveQty}x ${itemDoc.name} seharga ${totalCost} Perak!`,
    autoEquipped,
    remainingSilver: player.currency.silver
  };
}

/**
 * Reparasi seluruh perlengkapan yang sedang dikenakan di Bengkel
 */
async function repairEquipment(player) {
  const repairCost = 5; // 5 Perak flat
  if (!hasEnoughCurrency(player.currency, repairCost, 'silver')) {
    throw new Error(`Perak tidak mencukupi untuk jasa reparasi. Butuh ${repairCost} Perak.`);
  }

  let repairedCount = 0;
  if (player.inventory && Array.isArray(player.inventory)) {
    for (const slot of player.inventory) {
      if (slot.isEquipped && slot.durability !== null && slot.maxDurability !== null) {
        if (slot.durability < slot.maxDurability) {
          slot.durability = slot.maxDurability;
          repairedCount++;
        }
      }
    }
  }

  payCurrency(player.currency, repairCost, 'silver');
  player.markModified('currency');
  player.markModified('inventory');
  await player.save();

  return {
    success: true,
    repairedCount,
    message: repairedCount > 0
      ? `🛠️ Berhasil memperbaiki ${repairedCount} perlengkapan tempur hingga kondisi prima 100%! (-${repairCost} Perak)`
      : `🛠️ Seluruh perlengkapanmu sudah dalam kondisi terbaik. Senjata dan zirah diasah rapi! (-${repairCost} Perak)`,
    remainingSilver: player.currency.silver
  };
}

/**
 * Santap makanan hangat & arak harum di Kedai
 */
async function tavernDine(player) {
  const dineCost = 5; // 5 Perak
  if (!hasEnoughCurrency(player.currency, dineCost, 'silver')) {
    throw new Error(`Perak tidak mencukupi untuk memesan arak dan makanan. Butuh ${dineCost} Perak.`);
  }

  payCurrency(player.currency, dineCost, 'silver');

  if (!player.extendedStats) player.extendedStats = {};
  const currentVitality = player.extendedStats.vitality ?? player.vitality ?? 100;
  const currentMood = player.extendedStats.mood ?? 80;

  const newVitality = Math.min(100, currentVitality + 20);
  const newMood = Math.min(100, currentMood + 15);

  player.extendedStats.vitality = newVitality;
  player.extendedStats.mood = newMood;
  if (player.vitality !== undefined) player.vitality = newVitality;

  player.markModified('currency');
  player.markModified('extendedStats');
  await player.save();

  return {
    success: true,
    vitality: newVitality,
    mood: newMood,
    message: `🍶 Menikmati arak bambu harum dan daging panggang kedai. Vitalitas (+20 -> ${newVitality}/100) dan Suasana Hati (+15 -> ${newMood}/100) telah dipulihkan! (-${dineCost} Perak)`,
    remainingSilver: player.currency.silver
  };
}

/**
 * Mendapatkan kabar angin/gosip acak di Kedai
 */
function getTavernRumors() {
  const roll = Math.floor(Math.random() * TAVERN_RUMORS.length);
  return {
    success: true,
    rumor: TAVERN_RUMORS[roll]
  };
}

module.exports = {
  ensureCoreManuals,
  getManualPavilionList,
  learnPavilionManual,
  buyStablesItem,
  repairEquipment,
  tavernDine,
  getTavernRumors,
  CORE_MANUALS_DEFINITIONS
};
