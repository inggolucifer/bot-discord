/**
 * Module: utils/lawInventory.js
 * Centralized Authoritative Inventory Helpers for 20 Law Cultivation
 */

const {
  findInventoryIndex,
  consumeInventoryItem,
  listEligibleInventory
} = require('./lawCultivationEngine');

module.exports = {
  findInventoryIndex,
  consumeInventoryItem,
  listEligibleInventory
};
