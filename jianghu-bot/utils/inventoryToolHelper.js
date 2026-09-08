/**
 * Helper to manage tool items in the player's inventory.
 * A tool is defined as having category === 'tool' OR toolType != null.
 */

function isToolItem(itemDoc) {
    if (!itemDoc) return false;
    return itemDoc.category === 'tool' || itemDoc.toolType != null;
}

/**
 * Builds a new inventory entry for a tool, ensuring durability is set.
 */
function buildToolInventoryEntry(itemDoc, quantity = 1, extras = {}) {
    const defaultMax = itemDoc.maxDurability && itemDoc.maxDurability > 0 ? itemDoc.maxDurability : 20; // safe fallback
    return {
        itemId: itemDoc._id,
        quantity: quantity,
        durability: defaultMax,
        maxDurability: defaultMax,
        ...extras
    };
}

/**
 * Heals/initializes the durability of a tool already in the inventory.
 * Mutates the inventoryEntry.
 */
function ensureToolDurability(inventoryEntry, itemDoc) {
    if (!isToolItem(itemDoc)) return false;

    // If it's already initialized and > 0, or specifically 0 (broken), do nothing
    if (inventoryEntry.durability != null && inventoryEntry.maxDurability != null) {
        return true;
    }

    const defaultMax = itemDoc.maxDurability && itemDoc.maxDurability > 0 ? itemDoc.maxDurability : 20;
    inventoryEntry.maxDurability = defaultMax;
    // Only set to max if it was null/undefined. If it was 0, it's broken.
    if (inventoryEntry.durability == null) {
        inventoryEntry.durability = defaultMax;
    }
    return true;
}

/**
 * Validates if a tool can be used for a profession.
 */
function canUseTool(inventoryEntry, itemDoc, { requiredToolType, minToolTier }) {
    if (!isToolItem(itemDoc)) return { valid: false, error: 'Bukan alat yang valid.' };

    if (itemDoc.toolType !== requiredToolType) {
        return { valid: false, error: `Alat tidak cocok untuk resep ini.` };
    }

    // Ensure durability is initialized before checking
    ensureToolDurability(inventoryEntry, itemDoc);

    if (inventoryEntry.durability <= 0) {
        return { valid: false, error: `Alat ini sudah rusak dan tidak bisa digunakan.` };
    }

    const playerToolTier = itemDoc.tier || 1;
    const requiredTier = minToolTier || 1;
    if (playerToolTier < requiredTier) {
        return { valid: false, error: `Alat terlalu rendah. Resep ini membutuhkan alat minimal Tier ${requiredTier} (Alatmu Tier ${playerToolTier}).` };
    }

    return { valid: true };
}

module.exports = {
    isToolItem,
    buildToolInventoryEntry,
    ensureToolDurability,
    canUseTool
};
