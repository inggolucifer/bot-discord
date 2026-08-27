const fs = require('fs');

const content = `const Player = require('../models/Player');
const Sect = require('../models/Sect');
const Asset = require('../models/Asset');
const GuildConfig = require('../models/GuildConfig');
const { calculateProgress } = require('./assetProgress');
const { isUnderConstruction } = require('./crafting');
const { logTransaction } = require('./logger');

let isProcessing = false;

async function runWorkerAutoProcess(client) {
    if (isProcessing) return;
    isProcessing = true;
    try {
        // Ambil semua aset yang bisa memproduksi baik itu currency (dailyProfit > 0) atau item (workerOutputQuantity > 0)
        // Dan aset yang sedang dibangun juga akan diproses agar progress update-nya real-time (karena tidak ada filter disini)
        const allAssets = await Asset.find({});
        const assetMap = new Map();
        for (const asset of allAssets) {
            assetMap.set(asset._id.toString(), asset);
        }

        const guildConfigs = new Map();

        // Cari semua player yang punya aset
        const players = await Player.find({ 'assets.0': { $exists: true }, status: 'active' });

        for (const player of players) {
            let playerUpdated = false;
            let guildConfig = guildConfigs.get(player.guildId);
            if (!guildConfig) {
                guildConfig = await GuildConfig.findOne({ guildId: player.guildId });
                guildConfigs.set(player.guildId, guildConfig);
            }

            for (const owned of player.assets) {
                const assetConfig = assetMap.get(owned.assetId.toString());
                if (!assetConfig) continue;

                const progressMs = calculateProgress(owned) + (owned.progressAccumulated || 0);

                // --- FASE PEMBANGUNAN ---
                if (isUnderConstruction(owned) || owned.status === 'pending' || owned.status === 'building') {
                    // Update the dynamic constructionCompleteAt based on accumulated progress
                    if (!owned.originalConstructionStart) {
                         // Fallback jika tdk ada start (baru), set sekarang + jam config
                         owned.originalConstructionStart = owned.lastProgressUpdate || new Date();
                         owned.progressAccumulated = 0; // reset to 0 as base
                    }

                    const neededMs = assetConfig.constructionTimeHours * 3600 * 1000;
                    if (progressMs >= neededMs) {
                        // PEMBANGUNAN SELESAI
                        owned.status = 'active';
                        owned.constructionCompleteAt = null; // Tandai beres
                        owned.progressAccumulated = progressMs - neededMs; // Sisanya langsung jadi modal profit
                        owned.lastProgressUpdate = new Date();
                        playerUpdated = true;

                        if (guildConfig && guildConfig.workerChannelId) {
                            try {
                                const channel = await client.channels.fetch(guildConfig.workerChannelId).catch(() => null);
                                if (channel) {
                                    channel.send(\`🎉 <@\${player.discordId}>, pembangunan aset **\${assetConfig.name}** telah selesai dan langsung beroperasi!\`);
                                }
                            } catch (e) {}
                        }
                    } else {
                        // Masih proses, simpan progress, update last update
                        owned.progressAccumulated = progressMs;
                        owned.lastProgressUpdate = new Date();

                        // Kalkulasi ulang ETA untuk di-show di frontend (meskipun sebenernya ETA itu sekedar target date, kita butuh fixed point dari current time)
                        const remainingMs = neededMs - owned.progressAccumulated;
                        // Karena speed sekarang bisa berubah (dari pekerja), constructionCompleteAt adalah Date.now() + remainingMs (diasumsikan kalau jalannya 1.0x).
                        // Sebenarnya kalau speed > 1.0, selesainya akan lebih cepat. Di sini diset agar konsisten di cek UI.
                        owned.constructionCompleteAt = new Date(Date.now() + remainingMs);

                        playerUpdated = true;
                        continue; // Masih dibangun, tidak usah proses profit.
                    }
                }

                // --- FASE PRODUKSI ---
                if (owned.status !== 'active') continue;

                // Hitung active workers valid
                let activeWorkersCount = 0;
                if (owned.assignedWorkers && owned.assignedWorkers.length > 0) {
                    activeWorkersCount = owned.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
                }

                // Crafting Station tdk memproduksi otomatis.
                if (assetConfig.isCraftingStation) {
                     // Tetap reset timer update supaya tidak luber ke max int
                     owned.progressAccumulated = 0;
                     owned.lastProgressUpdate = new Date();
                     continue;
                }

                // Aset butuh minimal 1 pekerja per unit (jika Tipe 3, atau jg Tipe 1 yang bukan Crafting Station)
                let productiveQuantity = Math.min(activeWorkersCount, owned.quantity);
                if (productiveQuantity <= 0) {
                     // Berhenti bekerja, tidak menambah accumulated
                     owned.lastProgressUpdate = new Date(); // Update Date agar progress tdk numpuk di old date
                     continue;
                }

                // Kita asumsikan saat di Fase Produksi, progress baru = progressMs hasil calculate yg barusan (atau dari sisa selesainya konstruksi).
                const hoursPassed = Math.floor(progressMs / (3600 * 1000));

                if (hoursPassed < 1) {
                     owned.progressAccumulated = progressMs;
                     owned.lastProgressUpdate = new Date();
                     playerUpdated = true;
                     continue; // Belum cukup 1 jam
                }

                // Cek kebutuhan input material per jam (jika ada)
                let affordableHours = hoursPassed;
                let missingMaterialName = null;

                if (assetConfig.workerInputMaterials && assetConfig.workerInputMaterials.length > 0) {
                    for (const input of assetConfig.workerInputMaterials) {
                        const neededPerHour = input.quantity * productiveQuantity;
                        const ownedItem = player.inventory.find(i => i.itemId.equals(input.itemId));
                        const availableQuantity = ownedItem ? ownedItem.quantity : 0;
                        const maxAffordableForThisMat = Math.floor(availableQuantity / neededPerHour);

                        if (maxAffordableForThisMat < affordableHours) {
                            affordableHours = maxAffordableForThisMat;
                            if (affordableHours === 0 && !missingMaterialName) {
                                missingMaterialName = input.itemName;
                            }
                        }
                    }
                }

                if (affordableHours === 0) {
                    if (!owned.isHalted) {
                        owned.isHalted = true;
                        owned.lastWarningSentAt = new Date();
                        if (guildConfig && guildConfig.workerChannelId) {
                            try {
                                const channel = await client.channels.fetch(guildConfig.workerChannelId).catch(() => null);
                                if (channel) {
                                    channel.send(\`⚠️ <@\${player.discordId}>, pekerja di aset **\${assetConfig.name}** milikmu telah **berhenti bekerja** karena kekurangan material: **\${missingMaterialName}**! Segera isi ulang inventory-mu.\`);
                                }
                            } catch (e) {}
                        }
                    }
                    owned.progressAccumulated = 0; // Halted, rugi waktu
                    owned.lastProgressUpdate = new Date();
                    playerUpdated = true;
                    continue;
                }

                // Eksekusi produksi sesuai \`affordableHours\`
                let claimedLoot = false;

                // Deduct Input
                if (assetConfig.workerInputMaterials && assetConfig.workerInputMaterials.length > 0) {
                    for (const input of assetConfig.workerInputMaterials) {
                        const totalNeeded = input.quantity * affordableHours * productiveQuantity;
                        const ownedItem = player.inventory.find(i => i.itemId.equals(input.itemId));
                        ownedItem.quantity -= totalNeeded;
                        if(ownedItem.quantity < 0) ownedItem.quantity = 0;
                    }
                }

                // Add Currency (Tipe 1)
                if (assetConfig.dailyProfit > 0) {
                    const profit = affordableHours * assetConfig.dailyProfit * productiveQuantity;
                    player.currency[assetConfig.profitCurrency] += profit;
                    claimedLoot = true;
                }

                // Add Output Item (Tipe 3)
                if (assetConfig.workerOutputItemId && assetConfig.workerOutputQuantity > 0) {
                    const totalOutput = assetConfig.workerOutputQuantity * affordableHours * productiveQuantity;
                    let outputItem = player.inventory.find(i => i.itemId.equals(assetConfig.workerOutputItemId));
                    if (outputItem) {
                        outputItem.quantity += totalOutput;
                    } else {
                        player.inventory.push({
                            itemId: assetConfig.workerOutputItemId,
                            quantity: totalOutput
                        });
                    }
                    claimedLoot = true;
                }

                // Reset state
                const consumedMs = affordableHours * 3600 * 1000;
                const leftoverMs = progressMs - consumedMs;
                owned.progressAccumulated = (affordableHours < hoursPassed) ? 0 : leftoverMs;
                owned.lastProgressUpdate = new Date();

                if (owned.isHalted) owned.isHalted = false;
                playerUpdated = true;
            }

            if (playerUpdated) {
                await player.save().catch(e => console.error('[WorkerAutoProcess] Failed to save player:', e));
            }
        }

        // Process Sects
        await runWorkerAutoProcessSects(client, allAssets, assetMap, guildConfigs);
    } finally {
        isProcessing = false;
    }
}

// Continuation for Sects
async function runWorkerAutoProcessSects(client, allAssets, assetMap, guildConfigs) {
    // Cari sekte yang punya aset aktif
    const sects = await Sect.find({ 'assets.0': { $exists: true } });

    for (const sect of sects) {
        let sectUpdated = false;

        let guildConfig = guildConfigs.get(sect.guildId);
        if (!guildConfig) {
            guildConfig = await GuildConfig.findOne({ guildId: sect.guildId });
            guildConfigs.set(sect.guildId, guildConfig);
        }

        for (const owned of sect.assets) {
             const assetConfig = assetMap.get(owned.assetId.toString());
             if (!assetConfig) continue;

             const now = Date.now();
             const lastUpdate = owned.lastClaimAt ? owned.lastClaimAt.getTime() : (sect.createdAt.getTime());
             const progressMs = now - lastUpdate;

             if (owned.constructionCompleteAt && owned.constructionCompleteAt.getTime() > now) {
                  // Sekte construction tidak pakai pekerja (saat ini) jadi progress fix.
                  // Belum kelar, jgn proses.
                  continue;
             }

             if (assetConfig.isCraftingStation) {
                  owned.lastClaimAt = new Date(); // Tetap update time state biar ga overflow
                  sectUpdated = true;
                  continue;
             }

             const hoursPassed = Math.floor(progressMs / (3600 * 1000));
             if (hoursPassed < 1) continue;

             let affordableHours = hoursPassed;
             let missingMaterialName = null;

             if (assetConfig.workerInputMaterials && assetConfig.workerInputMaterials.length > 0) {
                 for (const input of assetConfig.workerInputMaterials) {
                     const neededPerHour = input.quantity * owned.quantity;
                     const ownedItem = sect.resources.find(r => r.itemId.equals(input.itemId));
                     const availableQuantity = ownedItem ? ownedItem.quantity : 0;
                     const maxAffordableForThisMat = Math.floor(availableQuantity / neededPerHour);

                     if (maxAffordableForThisMat < affordableHours) {
                         affordableHours = maxAffordableForThisMat;
                         if (affordableHours === 0 && !missingMaterialName) {
                             missingMaterialName = input.itemName;
                         }
                     }
                 }
             }

             if (affordableHours === 0) {
                 if (!owned.isHalted) {
                     owned.isHalted = true;
                     owned.lastWarningSentAt = new Date();
                     if (guildConfig && guildConfig.workerChannelId) {
                         try {
                             const channel = await client.channels.fetch(guildConfig.workerChannelId).catch(() => null);
                             if (channel) {
                                 let mention = \`Ketua Sekte **\${sect.name}**\`;
                                 if (sect.leaderId) mention = \`<\@\${sect.leaderId}>\`;
                                 channel.send(\`⚠️ \${mention}, aset sekte **\${assetConfig.name}** telah **berhenti beroperasi** karena kekurangan material: **\${missingMaterialName}**!\`);
                             }
                         } catch (e) {}
                     }
                 }
                 owned.lastClaimAt = new Date();
                 sectUpdated = true;
                 continue;
             }

             // Deduct
             if (assetConfig.workerInputMaterials && assetConfig.workerInputMaterials.length > 0) {
                 for (const input of assetConfig.workerInputMaterials) {
                     const totalNeeded = input.quantity * affordableHours * owned.quantity;
                     const ownedItem = sect.resources.find(r => r.itemId.equals(input.itemId));
                     ownedItem.quantity -= totalNeeded;
                     if (ownedItem.quantity < 0) ownedItem.quantity = 0;
                 }
             }

             // Add Currency (Tipe 1)
             if (assetConfig.dailyProfit > 0) {
                 const profit = affordableHours * assetConfig.dailyProfit * owned.quantity;
                 sect.currency[assetConfig.profitCurrency] += profit;
             }

             // Add Output Item (Tipe 3)
             if (assetConfig.workerOutputItemId && assetConfig.workerOutputQuantity > 0) {
                 const totalOutput = assetConfig.workerOutputQuantity * affordableHours * owned.quantity;
                 let outputItem = sect.resources.find(r => r.itemId.equals(assetConfig.workerOutputItemId));
                 if (outputItem) {
                     outputItem.quantity += totalOutput;
                 } else {
                     sect.resources.push({
                         itemId: assetConfig.workerOutputItemId,
                         quantity: totalOutput
                     });
                 }
             }

             if (affordableHours < hoursPassed) {
                 owned.lastClaimAt = new Date();
             } else {
                 const advanceMs = affordableHours * 3600 * 1000;
                 owned.lastClaimAt = new Date(lastUpdate + advanceMs);
             }

             if (owned.isHalted) owned.isHalted = false;
             sectUpdated = true;
        }

        if (sectUpdated) {
            await sect.save().catch(e => console.error('[WorkerAutoProcess] Failed to save sect:', e));
        }
    }
}
module.exports = { runWorkerAutoProcess };
`;
fs.writeFileSync('jianghu-bot/utils/workerAutoProcess.js', content);
