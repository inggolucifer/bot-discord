/**
 * utils/instancedZoneCosts.js
 * Modul murni authoritative untuk kalkulasi biaya masuk zona instans, cooldown, dan pemberian hadiah (V26 P2, P3, P4)
 */

const { addCopper } = require('./currency');

/**
 * Memetakan konfigurasi biaya zona instans ke daftar kebutuhan item terstandarisasi
 * @param {Object} cost Konfigurasi biaya dari zona
 * @returns {Array<{ itemKey: string, quantity: number }>}
 */
function requiredItems(cost = {}) {
  const reqs = [];
  if (!cost) return reqs;

  if (cost.item && typeof cost.item === 'string') {
    reqs.push({ itemKey: cost.item, quantity: 1 });
  }

  if (cost.spiritFruits && Number(cost.spiritFruits) > 0) {
    reqs.push({ itemKey: 'item_spirit_fruit', quantity: Number(cost.spiritFruits) });
  }

  if (cost.spiritStones && Number(cost.spiritStones) > 0) {
    reqs.push({ itemKey: 'item_spirit_stone_low', quantity: Number(cost.spiritStones) });
  }

  return reqs;
}

/**
 * Menghitung total kepemilikan item pada inventaris pemain berdasarkan ObjectId itemId
 * @param {Object} player Dokumen pemain
 * @param {string|Object} itemId ObjectId item
 * @returns {number}
 */
function countOwned(player, itemId) {
  if (!player || !Array.isArray(player.inventory) || !itemId) return 0;
  const targetStr = String(itemId);
  const targetStripped = targetStr.replace(/^item_/, '');
  let total = 0;
  for (const slot of player.inventory) {
    if (slot && slot.itemId) {
      const slotIdStr = String(slot.itemId);
      const slotStripped = slotIdStr.replace(/^item_/, '');
      if (slotIdStr === targetStr || (slotStripped && slotStripped === targetStripped)) {
        total += (slot.quantity || 1);
      }
    }
  }
  return total;
}

/**
 * Memvalidasi apakah pemain mampu membayar biaya masuk zona instans
 * @param {Object} player Dokumen Mongoose Player asli
 * @param {Object} cost Konfigurasi biaya masuk
 * @param {Map<string, Object>|Object} itemIdByKey Peta itemKey -> ObjectId
 * @returns {{ ok: boolean, error?: string }}
 */
function checkEntryCost(player, cost = {}, itemIdByKey = new Map()) {
  if (!player || !cost) return { ok: true };

  // 1. Validasi Stamina (memeriksa currentStamina kanonikal)
  if (cost.stamina && Number(cost.stamina) > 0) {
    const curStamina = player.currentStamina !== undefined ? player.currentStamina : (player.stamina || 0);
    if (curStamina < cost.stamina) {
      return {
        ok: false,
        error: `Stamina tidak mencukupi (memerlukan ${cost.stamina} stamina, dimiliki ${curStamina}).`
      };
    }
  }

  // 2. Validasi Item Kunci, Buah Roh, dan Batu Roh
  const items = requiredItems(cost);
  for (const req of items) {
    const targetId = itemIdByKey instanceof Map ? itemIdByKey.get(req.itemKey) : itemIdByKey?.[req.itemKey];
    if (!targetId) {
      return {
        ok: false,
        error: `Item ${req.itemKey} belum tersedia di dunia.`
      };
    }

    const owned = countOwned(player, targetId);
    if (owned < req.quantity) {
      const kurang = req.quantity - owned;
      return {
        ok: false,
        error: `Membutuhkan item kunci '${req.itemKey}' (kurang ${kurang}).`
      };
    }
  }

  return { ok: true };
}

/**
 * Memotong biaya masuk dari dokumen pemain secara permanen di memori (tidak memanggil save())
 * @param {Object} player Dokumen Mongoose Player asli
 * @param {Object} cost Konfigurasi biaya masuk
 * @param {Map<string, Object>|Object} itemIdByKey Peta itemKey -> ObjectId
 */
function applyEntryCost(player, cost = {}, itemIdByKey = new Map()) {
  const check = checkEntryCost(player, cost, itemIdByKey);
  if (!check.ok) {
    throw new Error(check.error);
  }

  // 1. Kurangi Stamina
  if (cost.stamina && Number(cost.stamina) > 0) {
    const curStamina = player.currentStamina !== undefined ? player.currentStamina : (player.stamina || 0);
    const newStamina = Math.max(0, curStamina - Number(cost.stamina));
    player.currentStamina = newStamina;
    if (player.stamina !== undefined) player.stamina = newStamina;
  }

  // 2. Kurangi Item dari Slot Inventaris
  const items = requiredItems(cost);
  if (!Array.isArray(player.inventory)) player.inventory = [];

  for (const req of items) {
    const targetId = itemIdByKey instanceof Map ? itemIdByKey.get(req.itemKey) : itemIdByKey?.[req.itemKey];
    const targetStr = String(targetId);
    const targetStripped = targetStr.replace(/^item_/, '');
    let remainingToDeduct = req.quantity;

    for (let i = player.inventory.length - 1; i >= 0; i--) {
      const slot = player.inventory[i];
      if (slot && slot.itemId) {
        const slotIdStr = String(slot.itemId);
        const slotStripped = slotIdStr.replace(/^item_/, '');
        if (slotIdStr === targetStr || (slotStripped && slotStripped === targetStripped)) {
          const qty = slot.quantity || 1;
          const take = Math.min(qty, remainingToDeduct);
          slot.quantity = qty - take;
          remainingToDeduct -= take;

          if (slot.quantity <= 0) {
            player.inventory.splice(i, 1);
          }

          if (remainingToDeduct <= 0) break;
        }
      }
    }
  }

  if (typeof player.markModified === 'function') {
    player.markModified('inventory');
  }
}

/**
 * Menghitung status cooldown zona instans
 * @param {Object} recentSession Sesi non-active terbaru
 * @param {number} cooldownDays Batas cooldown dalam hari
 * @param {number} now Timestamp saat ini (default: Date.now())
 * @returns {{ blocked: boolean, sisaHari: number }}
 */
function computeCooldown(recentSession, cooldownDays, now = Date.now()) {
  if (!recentSession || !cooldownDays || cooldownDays <= 0) {
    return { blocked: false, sisaHari: 0 };
  }

  if (recentSession.status === 'active') {
    return { blocked: false, sisaHari: 0 };
  }

  const sessionTime = recentSession.updatedAt
    ? new Date(recentSession.updatedAt).getTime()
    : (recentSession.claimedAt ? new Date(recentSession.claimedAt).getTime() : now);

  const cooldownMs = cooldownDays * 86400000;
  const expiresAt = sessionTime + cooldownMs;

  if (now < expiresAt) {
    const sisaHari = Math.ceil((expiresAt - now) / 86400000);
    return { blocked: true, sisaHari: Math.max(1, sisaHari) };
  }

  return { blocked: false, sisaHari: 0 };
}

/**
 * Memberikan hadiah kepada pemain dengan penegakan skema mata uang dan slot inventaris bersih
 * @param {Object} player Dokumen Mongoose Player asli
 * @param {Array<Object>} rewards Daftar hadiah [{ item, quantity }]
 * @param {Map<string, Object>|Object} itemIdByKey Peta itemKey -> ObjectId
 */
function grantRewards(player, rewards = [], itemIdByKey = new Map()) {
  if (!player || !Array.isArray(rewards)) return;
  if (!player.currency) player.currency = {};
  if (!Array.isArray(player.inventory)) player.inventory = [];

  for (const r of rewards) {
    if (!r || !r.item) continue;
    const qty = Number(r.quantity) || 1;

    if (r.item === 'copper') {
      addCopper(player.currency, qty);
    } else if (r.item === 'silver') {
      player.currency.silver = (player.currency.silver || 0) + qty;
    } else {
      const fullKey = r.item.startsWith('item_') ? r.item : `item_${r.item}`;
      const targetId = itemIdByKey instanceof Map ? (itemIdByKey.get(fullKey) || itemIdByKey.get(r.item)) : (itemIdByKey?.[fullKey] || itemIdByKey?.[r.item]);

      if (!targetId) {
        throw new Error(`Item hadiah belum didefinisikan: ${fullKey}`);
      }

      const existingSlot = player.inventory.find(s => s && s.itemId && String(s.itemId) === String(targetId));
      if (existingSlot) {
        existingSlot.quantity = (existingSlot.quantity || 1) + qty;
      } else {
        // Hanya menyertakan field yang sah di inventoryItemSchema (itemId, quantity)
        player.inventory.push({
          itemId: targetId,
          quantity: qty
        });
      }
    }
  }

  if (typeof player.markModified === 'function') {
    player.markModified('currency');
    player.markModified('inventory');
  }
}

module.exports = {
  requiredItems,
  countOwned,
  checkEntryCost,
  applyEntryCost,
  computeCooldown,
  grantRewards
};
