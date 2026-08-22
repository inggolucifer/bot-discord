const Player = require('../models/Player');
const Sect = require('../models/Sect');
const Asset = require('../models/Asset');
const GuildConfig = require('../models/GuildConfig');
const { calculateProgress } = require('./assetProgress');

let isProcessing = false;

async function runWorkerAutoProcess(client) {
    if (isProcessing) return;
    isProcessing = true;
    try {
    // 1. Get all assets that actually produce items (workerOutputItemId is not null) AND require inputs
    const producingAssets = await Asset.find({
        workerOutputItemId: { $ne: null },
        $expr: { $gt: [{ $size: "$workerInputMaterials" }, 0] } // Hanya aset yang membutuhkan input
    });
    if (!producingAssets.length) {
        isProcessing = false;
        return;
    }

    // Map of asset configurations for fast lookup
    const assetMap = new Map();
    for (const asset of producingAssets) {
        assetMap.set(asset._id.toString(), asset);
    }

    const guildConfigs = new Map(); // Cache guild configs

    // 2. Process Players
    // Find players who own at least one active asset that is in our producingAssets list
    const producingAssetIds = producingAssets.map(a => a._id);

    // A player might have multiple assets, check all of them
    // To optimize memory, we iterate through players who have active assigned workers
    const players = await Player.find({
        'assets': {
            $elemMatch: {
                assetId: { $in: producingAssetIds },
                status: 'active'
            }
        }
    });

    for (const player of players) {
        let playerUpdated = false;

        let guildConfig = guildConfigs.get(player.guildId);
        if (!guildConfig) {
            guildConfig = await GuildConfig.findOne({ guildId: player.guildId });
            guildConfigs.set(player.guildId, guildConfig);
        }

        for (const owned of player.assets) {
            if (owned.status !== 'active') continue;

            const assetConfig = assetMap.get(owned.assetId.toString());
            if (!assetConfig) continue;

            // Check if there is an active worker
            let hasActiveWorker = false;
            if (owned.assignedWorkers && owned.assignedWorkers.length > 0) {
                // Simplified check: if it has workers assigned, we assume they are active.
                // In a robust system, you'd check worker expiration times here if applicable.
                hasActiveWorker = true;
            }

            // Only Tipe 3 requires active workers (or is producing something)
            if (!assetConfig.isCraftingStation && !hasActiveWorker) {
                continue;
            }

            if (assetConfig.workerOutputQuantity <= 0) continue;

            // Calculate hours passed
            const progressMs = calculateProgress(owned) + (owned.progressAccumulated || 0);
            const hoursPassed = Math.floor(progressMs / (3600 * 1000));

            if (hoursPassed < 1) continue; // Not enough time for 1 cycle (1 hour)

            // Calculate needed materials for this cycle (hoursPassed)
            let hasEnoughMaterials = true;
            let missingMaterialName = '';

            const neededMaterials = [];
            for (const input of assetConfig.workerInputMaterials) {
                const totalNeeded = input.quantity * hoursPassed * owned.quantity;
                const ownedItem = player.inventory.find(i => i.itemId.equals(input.itemId));
                if (!ownedItem || ownedItem.quantity < totalNeeded) {
                    hasEnoughMaterials = false;
                    missingMaterialName = input.itemName;
                    break;
                }
                neededMaterials.push({ itemId: input.itemId, totalNeeded });
            }

            if (!hasEnoughMaterials) {
                // Check if we need to send a warning
                if (!owned.isHalted) {
                    owned.isHalted = true; // Mark as halted
                    owned.lastWarningSentAt = new Date();
                    playerUpdated = true;

                    // Send warning message
                    if (guildConfig && guildConfig.workerChannelId) {
                        try {
                            const channel = await client.channels.fetch(guildConfig.workerChannelId).catch(() => null);
                            if (channel) {
                                channel.send(`⚠️ <@${player.discordId}>, pekerja di aset **${assetConfig.name}** milikmu telah **berhenti bekerja** karena kekurangan material: **${missingMaterialName}**! Segera isi ulang inventory-mu.`);
                            }
                        } catch (e) {
                            console.error('[WorkerAutoProcess] Failed to send warning:', e);
                        }
                    }
                }
                continue; // Skip production for this asset
            }

            // If we have enough materials, perform production
            // 1. Deduct materials
            for (const needed of neededMaterials) {
                const ownedItem = player.inventory.find(i => i.itemId.equals(needed.itemId));
                ownedItem.quantity -= needed.totalNeeded;
                // If it hits 0, you could remove it, but keeping it 0 is fine too.
                if(ownedItem.quantity < 0) ownedItem.quantity = 0; // Fallback
            }

            // 2. Add outputs
            const totalOutput = assetConfig.workerOutputQuantity * hoursPassed * owned.quantity;
            let outputItem = player.inventory.find(i => i.itemId.equals(assetConfig.workerOutputItemId));
            if (outputItem) {
                outputItem.quantity += totalOutput;
            } else {
                player.inventory.push({
                    itemId: assetConfig.workerOutputItemId,
                    quantity: totalOutput
                });
            }

            // 3. Reset state & progress
            const leftoverMs = progressMs - (hoursPassed * 3600 * 1000);
            owned.progressAccumulated = leftoverMs;
            owned.lastProgressUpdate = new Date();

            if (owned.isHalted) {
                owned.isHalted = false; // Reset halted flag if it resumed
            }
            playerUpdated = true;
        }

        if (playerUpdated) {
            await player.save().catch(e => console.error('[WorkerAutoProcess] Failed to save player:', e));
        }
    }

    // Process Sects
    await runWorkerAutoProcessSects(client, producingAssets, assetMap, guildConfigs);
    } finally {
        isProcessing = false;
    }
}

// Continuation for Sects
async function runWorkerAutoProcessSects(client, producingAssets, assetMap, guildConfigs) {
    const producingAssetIds = producingAssets.map(a => a._id);
    const sects = await Sect.find({
        'assets': {
            $elemMatch: {
                assetId: { $in: producingAssetIds }
            }
        }
    });

    for (const sect of sects) {
        let sectUpdated = false;

        let guildConfig = guildConfigs.get(sect.guildId);
        if (!guildConfig) {
            guildConfig = await GuildConfig.findOne({ guildId: sect.guildId });
            guildConfigs.set(sect.guildId, guildConfig);
        }

        for (const owned of sect.assets) {
             // For Sect assets, they might not have explicit status pending/building tracked the same way,
             // but we'll assume they are active if they are not under construction.
             if (owned.constructionCompleteAt && owned.constructionCompleteAt > new Date()) continue; // Under construction

             const assetConfig = assetMap.get(owned.assetId.toString());
             if (!assetConfig || assetConfig.workerOutputQuantity <= 0) continue;

             // In Sect schema, we don't have assignedWorkers right now, so we assume sect assets auto-produce if they exist
             // (Or they might be Tipe 3 which just ticks over time)

             // calculateProgress doesn't officially exist for sects, we need to calculate it manually here
             const now = Date.now();
             const lastUpdate = owned.lastClaimAt ? owned.lastClaimAt.getTime() : (owned.constructionCompleteAt ? owned.constructionCompleteAt.getTime() : sect.createdAt.getTime());
             const progressMs = now - lastUpdate;
             const hoursPassed = Math.floor(progressMs / (3600 * 1000));

             if (hoursPassed < 1) continue;

             let hasEnoughMaterials = true;
             let missingMaterialName = '';
             const neededMaterials = [];

             for (const input of assetConfig.workerInputMaterials) {
                 const totalNeeded = input.quantity * hoursPassed * owned.quantity;
                 const ownedItem = sect.resources.find(r => r.itemId.equals(input.itemId));
                 if (!ownedItem || ownedItem.quantity < totalNeeded) {
                     hasEnoughMaterials = false;
                     missingMaterialName = input.itemName;
                     break;
                 }
                 neededMaterials.push({ itemId: input.itemId, totalNeeded });
             }

             if (!hasEnoughMaterials) {
                 if (!owned.isHalted) {
                     owned.isHalted = true;
                     owned.lastWarningSentAt = new Date();
                     sectUpdated = true;

                     if (guildConfig && guildConfig.workerChannelId) {
                         try {
                             const channel = await client.channels.fetch(guildConfig.workerChannelId).catch(() => null);
                             if (channel) {
                                 // Notify the leader or vice leader
                                 let mention = `Ketua Sekte **${sect.name}**`;
                                 if (sect.leaderId) mention = `<@${sect.leaderId}>`;
                                 channel.send(`⚠️ ${mention}, pekerja di aset sekte **${assetConfig.name}** telah **berhenti bekerja** karena kekurangan material: **${missingMaterialName}**! Segera setorkan item ke sekte.`);
                             }
                         } catch (e) {
                             console.error('[WorkerAutoProcess] Failed to send sect warning:', e);
                         }
                     }
                 }
                 continue;
             }

             // Deduct
             for (const needed of neededMaterials) {
                 const ownedItem = sect.resources.find(r => r.itemId.equals(needed.itemId));
                 ownedItem.quantity -= needed.totalNeeded;
             }

             // Add output
             const totalOutput = assetConfig.workerOutputQuantity * hoursPassed * owned.quantity;
             let outputItem = sect.resources.find(r => r.itemId.equals(assetConfig.workerOutputItemId));
             if (outputItem) {
                 outputItem.quantity += totalOutput;
             } else {
                 sect.resources.push({
                     itemId: assetConfig.workerOutputItemId,
                     quantity: totalOutput
                 });
             }

             // Update lastClaimAt to reflect the EXACT hour boundary so leftover progress isn't lost
             // e.g., if 1.5 hours passed, we advance lastClaimAt by 1 hour.
             const advanceMs = hoursPassed * 3600 * 1000;
             owned.lastClaimAt = new Date(lastUpdate + advanceMs);

             if (owned.isHalted) owned.isHalted = false;
             sectUpdated = true;
        }

        if (sectUpdated) {
            await sect.save().catch(e => console.error('[WorkerAutoProcess] Failed to save sect:', e));
        }
    }
}
module.exports = { runWorkerAutoProcess };
