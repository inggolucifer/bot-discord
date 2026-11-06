/**
 * services/coreShop.js
 * Inisialisasi listing item inti & kebutuhan ekspedisi ke katalog Shop sistem (V26 M8, P1)
 */

const Item = require('../models/Item');
const Shop = require('../models/Shop');

const SHOP_ITEM_KEYS = [
  'item_monster_repellent_charm',
  'item_monster_attraction_charm',
  'item_spirit_key',
  'item_spirit_fruit',
  'item_spirit_stone_low'
];

/**
 * Memastikan semua item inti dan jimat ekspedisi terdaftar di katalog toko (idempoten)
 */
async function ensureCoreShopListings() {
  for (const itemKey of SHOP_ITEM_KEYS) {
    const item = await Item.findOne({ itemKey });
    if (!item) continue;

    const existingListing = await Shop.findOne({ refId: item._id, refModel: 'Item' });
    if (!existingListing) {
      await Shop.create({
        guildId: 'global',
        category: 'item',
        refId: item._id,
        refModel: 'Item',
        price: item.buyPrice || item.basePrice || 10,
        priceCurrency: item.priceCurrency || 'silver',
        stock: -1,
        isActive: true,
        addedBy: 'System Oracle'
      });
      console.log(`[CORE-SHOP] Listing toko dibuat untuk item: ${item.name} (${itemKey})`);
    }
  }
}

module.exports = {
  ensureCoreShopListings,
  SHOP_ITEM_KEYS
};
