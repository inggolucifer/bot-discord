const {
  BASE_CARRY_CAPACITY,
  CATEGORY_DEFAULT_WEIGHT,
  CART_CAPACITY_BONUS,
  HORSE_CAPACITY_BONUS,
  STORAGE_RING_CAPACITY_BONUS
} = require('../config/inventoryWeight');

/**
 * Returns the weight of a single item based on its document or lean object.
 * @param {Object} itemDocOrLean
 * @returns {number}
 */
function getItemWeight(itemDocOrLean) {
  if (!itemDocOrLean) return 1;
  if (itemDocOrLean.weight !== null && itemDocOrLean.weight !== undefined) {
    return itemDocOrLean.weight;
  }
  return CATEGORY_DEFAULT_WEIGHT[itemDocOrLean.category] ?? 1;
}

/**
 * Calculates the total weight of a player's inventory.
 * @param {Object} player The player document (populated or not).
 * @param {Map|Object} [itemMap] Optional map of itemId (string) to Item document for fast lookup.
 * @returns {number}
 */
function getInventoryWeight(player, itemMap = null) {
  if (!player || !player.inventory) return 0;

  let totalWeight = 0;
  for (const invItem of player.inventory) {
    if (!invItem.itemId) continue;

    let itemData = null;
    const itemIdStr = invItem.itemId._id ? invItem.itemId._id.toString() : invItem.itemId.toString();

    if (itemMap) {
      if (itemMap instanceof Map) {
        itemData = itemMap.get(itemIdStr);
      } else {
        itemData = itemMap[itemIdStr];
      }
    } else if (invItem.itemId && invItem.itemId.category) {
      itemData = invItem.itemId;
    }

    const weightPerItem = itemData ? getItemWeight(itemData) : 1;
    totalWeight += weightPerItem * (invItem.quantity || 1);
  }

  return Number(totalWeight.toFixed(2));
}

/**
 * Calculates the player's carrying capacity based on base + equipment bonuses.
 * @param {Object} player The player document.
 * @param {Object} options Options like { isTraveling: boolean }
 * @param {Array} equippedItemDocs Array of populated Item documents currently equipped.
 * @returns {number}
 */
async function getCarryCapacity(player, options = {}, equippedItemDocs = []) {
  const isTraveling = options.isTraveling || false;
  let capacity = player.baseCarryCapacity ?? BASE_CARRY_CAPACITY;

  let docs = equippedItemDocs;
  if (!docs || docs.length === 0) {
    // Attempt to automatically fetch from player.equipment if not provided
    if (player.equipment && player.equipment.accessory) {
        const accInvItem = player.inventory.find(i => i._id && i._id.toString() === player.equipment.accessory.toString());
        if (accInvItem && accInvItem.itemId) {
             const Item = require('../models/Item');
             const doc = await Item.findById(accInvItem.itemId).lean();
             if (doc) docs = [doc];
        }
    }
  }

  if (docs && docs.length > 0) {
    for (const item of docs) {
      if (!item) continue;
      if (item.capacityBonus) {
        if (item.capacityMode === 'always') {
          capacity += item.capacityBonus;
        } else if (item.capacityMode === 'travel_only' && isTraveling) {
          capacity += item.capacityBonus;
        }
      }
    }
  }

  return capacity;
}

/**
 * Checks if adding items will exceed inventory capacity.
 * @param {Object} player The player document.
 * @param {Array<{ itemDoc: Object, quantity: number }>} itemsToAdd Items to add.
 * @param {Object} options Options like { isTraveling: boolean, equippedItems: Array, itemMap: Map }
 * @returns {{ ok: boolean, currentWeight: number, capacity: number, overflow: number }}
 */
async function canAddToInventory(player, itemsToAdd, options = {}) {
  if (!options.itemMap) {
      options.itemMap = await buildInventoryItemMap(player);
  }
  const currentWeight = getInventoryWeight(player, options.itemMap);
  const capacity = await getCarryCapacity(player, options, options.equippedItems);

  let addedWeight = 0;
  for (const { itemDoc, quantity } of itemsToAdd) {
    const weight = getItemWeight(itemDoc);
    addedWeight += weight * (quantity || 1);
  }

  const newTotalWeight = currentWeight + addedWeight;
  const ok = newTotalWeight <= capacity;

  return {
    ok,
    currentWeight: Number(currentWeight.toFixed(2)),
    capacity,
    overflow: ok ? 0 : Number((newTotalWeight - capacity).toFixed(2))
  };
}

async function buildInventoryItemMap(player) {
  const Item = require('../models/Item');
  const missingIds = [];
  if (!player || !player.inventory) return {};
  for (const invItem of player.inventory) {
    if (!invItem.itemId) continue;
    if (!invItem.itemId.category) {
      missingIds.push(invItem.itemId._id || invItem.itemId);
    }
  }
  if (missingIds.length === 0) return {};
  const docs = await Item.find({ _id: { $in: missingIds } }).lean();
  const map = {};
  for (const doc of docs) {
    map[doc._id.toString()] = doc;
  }
  return map;
}

module.exports = {
  getItemWeight,
  getInventoryWeight,
  getCarryCapacity,
  canAddToInventory,
  buildInventoryItemMap
};
