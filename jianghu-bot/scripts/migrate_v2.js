/**
 * Migration Script v2: Player Schema & Integrity Normalizer
 *
 * Usage:
 *   node scripts/migrate_v2.js [--dry-run] [--force]
 *
 * Responsibilities:
 * 1. Upgrades Player documents to schemaVersion: 2
 * 2. Normalizes currency and resolves negative/NaN values
 * 3. Guarantees currentLocation & gridPosition defaults
 * 4. Sanitizes inventory array (removes orphan or null itemId references)
 * 5. Guarantees cultivation system defaults
 * 6. Logs all changes to AdminLog for traceability
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const Item = require('../models/Item');
const AdminLog = require('../models/AdminLog');
const { normalizeCurrency } = require('../utils/currencyNormalize');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu';
  console.log(`[MIGRATION-V2] Connecting to MongoDB... (dryRun: ${dryRun}, force: ${force})`);

  try {
    await mongoose.connect(mongoUri);
    console.log('[MIGRATION-V2] Connected successfully.');

    // Query: either schemaVersion < 2, or schemaVersion missing, or force
    const query = force ? {} : {
      $or: [
        { schemaVersion: { $exists: false } },
        { schemaVersion: { $lt: 2 } }
      ]
    };

    const totalTarget = await Player.countDocuments(query);
    console.log(`[MIGRATION-V2] Found ${totalTarget} player(s) eligible for v2 migration.`);

    if (totalTarget === 0) {
      console.log('[MIGRATION-V2] All player records are already up to date with schemaVersion 2.');
      return;
    }

    // Cache existing valid Item IDs to check for orphaned items in inventories
    const validItems = await Item.find({}, '_id').lean();
    const validItemIdSet = new Set(validItems.map(i => i._id.toString()));

    const players = await Player.find(query);

    let updatedCount = 0;
    let sanitizedInventoryCount = 0;
    let normalizedCurrencyCount = 0;

    for (const player of players) {
      let isModified = false;

      // 1. Schema version
      if (player.schemaVersion !== 2) {
        player.schemaVersion = 2;
        isModified = true;
      }

      // 2. Currency Normalization & NaN/Negative Sanitization
      if (!player.currency) {
        player.currency = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
        isModified = true;
      } else {
        const c = player.currency;
        const keys = ['copper', 'silver', 'gold', 'jade', 'spirit'];
        for (const k of keys) {
          if (typeof c[k] !== 'number' || isNaN(c[k]) || c[k] < 0) {
            c[k] = Math.max(0, Number(c[k]) || 0);
            isModified = true;
            normalizedCurrencyCount++;
          }
        }
        normalizeCurrency(player.currency);
      }

      // 3. Current Location Fallback
      if (!player.currentLocation || !player.currentLocation.regionSlug) {
        player.currentLocation = {
          regionSlug: 'central_plains',
          settlementName: 'Desa Xingcun',
          buildingName: null
        };
        isModified = true;
      }

      // 4. Grid Position Fallback
      if (!player.gridPosition || !player.gridPosition.zoneId) {
        player.gridPosition = {
          zoneId: 'central_plains_bamboo_forest',
          tileX: 0,
          tileY: 0
        };
        isModified = true;
      }

      // 5. Cultivation Defaults
      if (!player.systemCultivation || !player.systemCultivation.realm) {
        player.systemCultivation = {
          realm: 'Fondasi Fana (Mortal Foundation)',
          stage: 0,
          qi: 0,
          lastSyncAt: new Date(),
          isFlawedFoundation: false
        };
        isModified = true;
      }

      // 6. Inventory Sanitization
      if (Array.isArray(player.inventory) && player.inventory.length > 0) {
        const initialLen = player.inventory.length;
        player.inventory = player.inventory.filter(invItem => {
          if (!invItem || !invItem.itemId) return false;
          const idStr = invItem.itemId.toString();
          if (!validItemIdSet.has(idStr)) return false; // filter out orphan item references
          if (typeof invItem.quantity !== 'number' || invItem.quantity <= 0) return false;
          return true;
        });
        if (player.inventory.length !== initialLen) {
          sanitizedInventoryCount += (initialLen - player.inventory.length);
          isModified = true;
        }
      }

      // Save if modified
      if (isModified) {
        if (!dryRun) {
          await player.save();
        }
        updatedCount++;
      }
    }

    console.log(`[MIGRATION-V2] Completed!`);
    console.log(`  - Total players inspected: ${players.length}`);
    console.log(`  - Players updated: ${updatedCount} ${dryRun ? '(DRY-RUN - NOT SAVED)' : '(SAVED)'}`);
    console.log(`  - Currencies normalized: ${normalizedCurrencyCount}`);
    console.log(`  - Corrupted/orphan inventory items removed: ${sanitizedInventoryCount}`);

    if (!dryRun && updatedCount > 0) {
      try {
        await AdminLog.create({
          guildId: 'SYSTEM',
          adminId: 'SYSTEM_MIGRATION_V2',
          action: 'schema_v2_migration',
          details: `Migrated ${updatedCount} players to schemaVersion 2. Normalized ${normalizedCurrencyCount} currencies, removed ${sanitizedInventoryCount} orphan items.`
        });
      } catch (logErr) {
        console.warn('[MIGRATION-V2] Note: AdminLog write skipped:', logErr.message);
      }
    }

  } catch (err) {
    console.error('[MIGRATION-V2] Migration failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[MIGRATION-V2] Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
