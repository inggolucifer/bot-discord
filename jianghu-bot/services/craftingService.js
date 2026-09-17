const Player = require('../models/Player');
const Item = require('../models/Item');
const PropertyStructure = require('../models/PropertyStructure');
const ZoneTile = require('../models/ZoneTile');
const ActivityLog = require('../models/ActivityLog');
const { getCurrentStamina } = require('../utils/stamina');

const CRAFT_RECIPES = {
  smithing: {
    'Pedang Besi Tempa': {
      requiredLevel: 1,
      staminaCost: 10,
      materials: [
        { name: 'Bijih Besi', quantity: 2 },
        { name: 'Kayu Mentah', quantity: 1 }
      ],
      output: {
        name: 'Pedang Besi Tempa',
        type: 'equipment',
        subType: 'weapon',
        rarity: 'common',
        description: 'Pedang baja tajam hasil tempaan pandai besi Jianghu.'
      }
    },
    'Cangkul Baja Kokoh': {
      requiredLevel: 1,
      staminaCost: 8,
      materials: [
        { name: 'Bijih Besi', quantity: 2 }
      ],
      output: {
        name: 'Cangkul Baja Kokoh',
        type: 'material',
        rarity: 'common',
        description: 'Cangkul tahan lama untuk bertani di lahan pemukiman.'
      }
    }
  },
  cooking: {
    'Sup Ikan Mas': {
      requiredLevel: 1,
      staminaCost: 5,
      materials: [
        { name: 'Ikan Nila Sungai', quantity: 1 }
      ],
      output: {
        name: 'Sup Ikan Mas',
        type: 'consumable',
        rarity: 'common',
        description: 'Sup ikan hangat penambah tenaga (+25 Stamina instan).'
      },
      staminaRestore: 25
    },
    'Roti Gandum Panggang': {
      requiredLevel: 1,
      staminaCost: 5,
      materials: [
        { name: 'Gandum Emas', quantity: 2 }
      ],
      output: {
        name: 'Roti Gandum Panggang',
        type: 'consumable',
        rarity: 'common',
        description: 'Roti gandum renyah pengisi perut (+20 Stamina instan).'
      },
      staminaRestore: 20
    }
  }
};

function awardExp(professions, expType, expGain) {
  if (!professions) professions = {};
  if (!professions[expType]) {
    professions[expType] = { level: 1, exp: 0, isUnlocked: true };
  }
  professions[expType].isUnlocked = true;
  professions[expType].exp += expGain;

  let reqExp = professions[expType].level * 100;
  let leveledUp = false;
  while (professions[expType].exp >= reqExp) {
    professions[expType].exp -= reqExp;
    professions[expType].level += 1;
    reqExp = professions[expType].level * 100;
    leveledUp = true;
  }
  return { prof: professions[expType], leveledUp };
}

class CraftingService {
  /**
   * Menempa senjata atau perkakas di bengkel pandai besi
   */
  async craftSmithing(discordId, guildId, recipeKey, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    // 1. Validasi Lokasi: Harus berada di dalam bengkel atau dekat fasilitas tempa
    const interiorId = player.gridPosition?.interiorInstanceId;
    let hasForgeAccess = false;

    if (interiorId) {
      const structure = await PropertyStructure.findById(interiorId);
      if (structure && (structure.structureType === 'blacksmith' || structure.forgeAnvilTier >= 1)) {
        hasForgeAccess = true;
      }
    }

    if (!hasForgeAccess && !options.bypassLocationCheck) {
      // Cek apakah berdiri di dekat bengkel outdoor
      const tile = await ZoneTile.findOne({
        guildId,
        zoneId: player.gridPosition?.zoneId,
        tileX: player.gridPosition?.tileX,
        tileY: player.gridPosition?.tileY
      });
      if (tile && (tile.buildingType === 'blacksmith' || tile.label?.toLowerCase().includes('tempa'))) {
        hasForgeAccess = true;
      }
    }

    if (!hasForgeAccess && !options.bypassLocationCheck) {
      return {
        ok: false,
        error: 'Kamu tidak berada di bengkel pandai besi! Masuklah ke dalam Bengkel Tempa untuk menggunakan landasan tempa.'
      };
    }

    // 2. Resep
    const recipe = CRAFT_RECIPES.smithing[recipeKey];
    if (!recipe) {
      const available = Object.keys(CRAFT_RECIPES.smithing).join(', ');
      return { ok: false, error: `Resep tempa '${recipeKey}' tidak ditemukan. Pilihan: ${available}.` };
    }

    // 3. Stamina
    const currentStamina = getCurrentStamina(player);
    if (currentStamina < recipe.staminaCost) {
      return { 
        ok: false, 
        error: `Stamina tidak mencukupi untuk menempa! (Dibutuhkan: ${recipe.staminaCost}, Dimiliki: ${Math.floor(currentStamina)}).` 
      };
    }

    // 4. Material Check & Deduction
    for (const mat of recipe.materials) {
      const itemDocs = await Item.find({ guildId, name: new RegExp(`^${mat.name}$`, 'i') }).select('_id');
      const matchingIds = itemDocs.map(d => d._id.toString());
      const availableQty = player.inventory
        .filter(inv => matchingIds.includes(inv.itemId?.toString()))
        .reduce((sum, inv) => sum + inv.quantity, 0);

      if (availableQty < mat.quantity) {
        return {
          ok: false,
          error: `Bahan tempa kurang! Membutuhkan ${mat.quantity}x ${mat.name} (Dimiliki: ${availableQty}).`
        };
      }
    }

    // Potong Bahan
    for (const mat of recipe.materials) {
      const itemDocs = await Item.find({ guildId, name: new RegExp(`^${mat.name}$`, 'i') }).select('_id');
      const matchingIds = itemDocs.map(d => d._id.toString());
      let needed = mat.quantity;

      for (let i = player.inventory.length - 1; i >= 0 && needed > 0; i--) {
        const inv = player.inventory[i];
        if (matchingIds.includes(inv.itemId?.toString())) {
          if (inv.quantity <= needed) {
            needed -= inv.quantity;
            player.inventory.splice(i, 1);
          } else {
            inv.quantity -= needed;
            needed = 0;
          }
        }
      }
    }

    // Potong Stamina
    player.currentStamina = Math.max(0, currentStamina - recipe.staminaCost);

    // Buat/Ambil Item Output
    let outputItem = await Item.findOne({ guildId, name: recipe.output.name });
    if (!outputItem) {
      outputItem = await Item.create({
        guildId,
        ...recipe.output
      });
    }

    player.inventory.push({ itemId: outputItem._id, quantity: 1, creatorName: player.characterName });

    // EXP Smithing
    if (!player.professions) player.professions = {};
    const expRes = awardExp(player.professions, 'smithing', 35);
    await player.save();

    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'smith_craft',
      details: { recipeName: recipeKey, outputItem: recipe.output.name },
      serverValidated: true,
      itemOriginLogged: true
    });

    return {
      ok: true,
      craftedItem: recipe.output.name,
      smithingLevel: expRes.prof.level,
      remainingStamina: player.currentStamina,
      leveledUp: expRes.leveledUp
    };
  }

  /**
   * Memasak hidangan di dapur
   */
  async craftCooking(discordId, guildId, recipeKey, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const recipe = CRAFT_RECIPES.cooking[recipeKey];
    if (!recipe) {
      const available = Object.keys(CRAFT_RECIPES.cooking).join(', ');
      return { ok: false, error: `Resep masak '${recipeKey}' tidak ditemukan. Pilihan: ${available}.` };
    }

    const currentStamina = getCurrentStamina(player);
    if (currentStamina < recipe.staminaCost) {
      return { ok: false, error: `Stamina tidak mencukupi untuk memasak! (Butuh: ${recipe.staminaCost}).` };
    }

    // Cek Bahan
    for (const mat of recipe.materials) {
      const itemDocs = await Item.find({ guildId, name: new RegExp(`^${mat.name}$`, 'i') }).select('_id');
      const matchingIds = itemDocs.map(d => d._id.toString());
      const availableQty = player.inventory
        .filter(inv => matchingIds.includes(inv.itemId?.toString()))
        .reduce((sum, inv) => sum + inv.quantity, 0);

      if (availableQty < mat.quantity) {
        return {
          ok: false,
          error: `Bahan masakan kurang! Memerlukan ${mat.quantity}x ${mat.name} (Dimiliki: ${availableQty}).`
        };
      }
    }

    // Potong Bahan
    for (const mat of recipe.materials) {
      const itemDocs = await Item.find({ guildId, name: new RegExp(`^${mat.name}$`, 'i') }).select('_id');
      const matchingIds = itemDocs.map(d => d._id.toString());
      let needed = mat.quantity;

      for (let i = player.inventory.length - 1; i >= 0 && needed > 0; i--) {
        const inv = player.inventory[i];
        if (matchingIds.includes(inv.itemId?.toString())) {
          if (inv.quantity <= needed) {
            needed -= inv.quantity;
            player.inventory.splice(i, 1);
          } else {
            inv.quantity -= needed;
            needed = 0;
          }
        }
      }
    }

    player.currentStamina = Math.max(0, currentStamina - recipe.staminaCost);

    let outputItem = await Item.findOne({ guildId, name: recipe.output.name });
    if (!outputItem) {
      outputItem = await Item.create({
        guildId,
        ...recipe.output
      });
    }

    player.inventory.push({ itemId: outputItem._id, quantity: 1, creatorName: player.characterName });

    if (!player.professions) player.professions = {};
    const expRes = awardExp(player.professions, 'cooking', 25);
    await player.save();

    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'cook_dish',
      details: { recipeName: recipeKey, outputItem: recipe.output.name },
      serverValidated: true,
      itemOriginLogged: true
    });

    return {
      ok: true,
      craftedDish: recipe.output.name,
      cookingLevel: expRes.prof.level,
      remainingStamina: player.currentStamina,
      leveledUp: expRes.leveledUp
    };
  }

  /**
   * Mengonsumsi makanan untuk memulihkan stamina
   */
  async consumeDish(discordId, guildId, dishName) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const itemDocs = await Item.find({ guildId, name: new RegExp(`^${dishName}$`, 'i') }).select('_id');
    const matchingIds = itemDocs.map(d => d._id.toString());

    const slotIndex = player.inventory.findIndex(inv => matchingIds.includes(inv.itemId?.toString()));
    if (slotIndex === -1) {
      return { ok: false, error: `Kamu tidak memiliki ${dishName} di dalam tas inventori.` };
    }

    // Konsumsi 1 item
    if (player.inventory[slotIndex].quantity <= 1) {
      player.inventory.splice(slotIndex, 1);
    } else {
      player.inventory[slotIndex].quantity -= 1;
    }

    // Pulihkan Stamina
    const currentStamina = getCurrentStamina(player);
    const restoreAmount = 25;
    player.currentStamina = currentStamina + restoreAmount;
    await player.save();

    return {
      ok: true,
      dishName,
      restoredStamina: restoreAmount,
      newStamina: player.currentStamina
    };
  }
}

module.exports = new CraftingService();
