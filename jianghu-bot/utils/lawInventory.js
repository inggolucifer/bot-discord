/**
 * Module: utils/lawInventory.js
 * Centralized Authoritative Inventory Helpers for 20 Law Cultivation
 */

const {
  findInventoryIndex,
  consumeInventoryItem,
  listEligibleInventory,
  isItemEligibleForPurpose,
  isBreakthroughMaterial
} = require('./lawCultivationEngine');

module.exports = {
  findInventoryIndex,
  consumeInventoryItem,
  listEligibleInventory,
  isItemEligibleForPurpose,
  isBreakthroughMaterial
};
