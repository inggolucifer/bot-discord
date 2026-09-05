const { convertToCopper, convertFromCopper, RATE_TO_COPPER } = require('./currencyNormalize');
const Player = require('../models/Player');
const Sect = require('../models/Sect');
const Asset = require('../models/Asset');
const GuildConfig = require('../models/GuildConfig');
const { splitSectProfit } = require('./sectProfitSplit');
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


            // --- RISK SYSTEM (BANDIT & DISASTER) ---
            const now = Date.now();
            const DISASTER_CYCLE = 20 * 24 * 3600 * 1000;
            const BANDIT_CYCLE = 5 * 24 * 3600 * 1000;

            let riskTriggered = false;
            if (!player.lastDisasterHitAt) { player.lastDisasterHitAt = new Date(); playerUpdated = true; }
            if (!player.lastBanditHitAt) { player.lastBanditHitAt = new Date(); playerUpdated = true; }
            const lastDisaster = player.lastDisasterHitAt.getTime();
            if (now - lastDisaster >= DISASTER_CYCLE) {
                // Trigger disaster
                const activeAssets = player.assets.filter(a => a.status === 'active' && !a.isDamaged && !isUnderConstruction(a));
                if (activeAssets.length > 0) {
                    const target = activeAssets[Math.floor(Math.random() * activeAssets.length)];
                    target.isDamaged = true;
                    target.isHalted = true;
                    target.damageType = 'disaster';
                    player.lastDisasterHitAt = new Date();
                    playerUpdated = true;
                    riskTriggered = true;

                    const assetConfig = assetMap.get(target.assetId.toString());
                    try {
                        const user = await client.users.fetch(player.discordId).catch(() => null);
                        const msg = `⚠️ **BENCANA ALAM!** Aset **${assetConfig ? assetConfig.name : 'Unknown'}** milikmu terkena bencana dan sekarang **RUSAK (Halted)**. Perbaiki aset tersebut agar bisa beroperasi kembali.`;
                        if (user) await user.send(msg);
                        if (client.io) {
                            client.io.to(player.discordId).emit('user_update', { message: msg });
                        }
                    } catch (e) {}
                }
            }

            const lastBandit = player.lastBanditHitAt.getTime();
            if (!riskTriggered && now - lastBandit >= BANDIT_CYCLE) {
                // Trigger bandit
                const activeAssets = player.assets.filter(a => a.status === 'active' && !a.isDamaged && !isUnderConstruction(a));

                // Filter out assets guarded by valid guards
                const vulnerableAssets = activeAssets.filter(a => !a.guardEndTime || a.guardEndTime.getTime() < now);

                if (vulnerableAssets.length > 0) {
                    const target = vulnerableAssets[Math.floor(Math.random() * vulnerableAssets.length)];
                    target.isDamaged = true;
                    target.isHalted = true;
                    target.damageType = 'bandit';
                    player.lastBanditHitAt = new Date();
                    playerUpdated = true;

                    const assetConfig = assetMap.get(target.assetId.toString());
                    try {
                        const user = await client.users.fetch(player.discordId).catch(() => null);
                        const msg = `⚠️ **SERANGAN BANDIT!** Aset **${assetConfig ? assetConfig.name : 'Unknown'}** diserang bandit karena tidak ada penjagaan. Aset tersebut kini **RUSAK (Halted)**.`;
                        if (user) await user.send(msg);
                        if (client.io) {
                            client.io.to(player.discordId).emit('user_update', { message: msg });
                        }
                    } catch (e) {}
                } else if (activeAssets.length > 0) {
                    // All assets were guarded. Bandit cycle resets anyway because they tried and failed.
                    player.lastBanditHitAt = new Date();
                    playerUpdated = true;
                }
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

                        try {
                            const user = await client.users.fetch(player.discordId).catch(() => null);
                            if (user) {
                                await user.send(`🎉 Pembangunan aset **${assetConfig.name}** milikmu telah selesai dan langsung beroperasi!`).catch(() => null);
                            }
                        } catch (e) {}
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
                if (owned.isDamaged) {
                    owned.isHalted = true;
                    owned.progressAccumulated = progressMs;
                    owned.lastProgressUpdate = new Date();
                    playerUpdated = true;
                    continue;
                }


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
                     playerUpdated = true;
                     continue;
                }

                // Aset butuh minimal 1 pekerja per unit (jika Tipe 3, atau jg Tipe 1 yang bukan Crafting Station)
                let productiveQuantity = Math.min(activeWorkersCount, owned.quantity);
                if (productiveQuantity <= 0) {
                     owned.progressAccumulated = progressMs;
                     owned.lastProgressUpdate = new Date();
                     playerUpdated = true;
                     continue;
                }

                // Kita asumsikan saat di Fase Produksi, progress baru = progressMs hasil calculate yg barusan (atau dari sisa selesainya konstruksi).
                const hoursPassed = Math.floor(progressMs / (3600 * 1000));

                if (hoursPassed < 1) {
                     if (owned.isHalted) {
                         let hasMaterialsForOneHour = true;
                         if (assetConfig.workerInputMaterials && assetConfig.workerInputMaterials.length > 0) {
                             for (const input of assetConfig.workerInputMaterials) {
                                 const neededPerHour = input.quantity * productiveQuantity;
                                 const ownedItem = player.inventory.find(i => i.itemId.equals(input.itemId));
                                 const availableQuantity = ownedItem ? ownedItem.quantity : 0;
                                 if (availableQuantity < neededPerHour) {
                                     hasMaterialsForOneHour = false;
                                     break;
                                 }
                             }
                         }
                         if (hasMaterialsForOneHour) {
                             owned.isHalted = false;
                             playerUpdated = true;
                         }
                     }

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

                        // Validasi keras: Untuk MEMULAI kerja, pemain minimal harus punya tool = kebutuhan base * pekerja
                        if (availableQuantity < neededPerHour) {
                            affordableHours = 0;
                            if (!missingMaterialName) missingMaterialName = input.itemName;
                            break;
                        }

                        const durability = input.durabilityHours || 1;
                        let maxAffordableForThisMat = hoursPassed;

                        if (durability === 1) {
                            maxAffordableForThisMat = Math.floor(availableQuantity / neededPerHour);
                        } else {
                            if (!owned.toolDurabilityUsage) owned.toolDurabilityUsage = new Map();
                            const currentUsage = owned.toolDurabilityUsage.get(input.itemId.toString()) || 0;
                            // Deterministic tracking:
                            // We have availableQuantity tools. Each tool lasts 'durability' hours.
                            // We need 'neededPerHour' tools working per hour.
                            // So total working hours we can afford = (availableQuantity * durability) - currentUsage
                            // Since we need 'neededPerHour' per hour, we divide by it.
                            maxAffordableForThisMat = Math.floor(Math.max(0, (availableQuantity * durability) - currentUsage) / neededPerHour);
                        }

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
                        try {
                            const user = await client.users.fetch(player.discordId).catch(() => null);
                            const msg = `⚠️ Pekerja di aset **${assetConfig.name}** milikmu telah **berhenti bekerja** karena kekurangan material: **${missingMaterialName}**! Segera isi ulang inventory-mu.`;
                            if (user) {
                                await user.send(msg).catch(() => null);
                            }
                            if (client.io) {
                                client.io.to(player.discordId).emit('user_update', { message: msg });
                            }
                        } catch (e) {}
                    }
                    owned.progressAccumulated = 0; // Halted, rugi waktu
                    owned.lastProgressUpdate = new Date();
                    playerUpdated = true;
                    continue;
                }

                // Eksekusi produksi sesuai `affordableHours`
                let claimedLoot = false;

                // Deduct Input
                if (assetConfig.workerInputMaterials && assetConfig.workerInputMaterials.length > 0) {
                    for (const input of assetConfig.workerInputMaterials) {
                        const baseNeeded = input.quantity * productiveQuantity;
                        const durability = input.durabilityHours || 1;
                        let totalBroken = 0;

                        if (durability === 1) {
                            totalBroken = baseNeeded * affordableHours;
                        } else {
                            if (!owned.toolDurabilityUsage) owned.toolDurabilityUsage = new Map();
                            let currentUsage = owned.toolDurabilityUsage.get(input.itemId.toString()) || 0;

                            // Calculate new usage
                            currentUsage += (baseNeeded * affordableHours);

                            // Tools broken are how many full durability cycles we crossed
                            totalBroken = Math.floor(currentUsage / durability);

                            // Remainder becomes the new usage state
                            const remainder = currentUsage % durability;
                            owned.toolDurabilityUsage.set(input.itemId.toString(), remainder);
                            playerUpdated = true;
                        }

                        if (totalBroken > 0) {
                            const ownedItem = player.inventory.find(i => i.itemId.equals(input.itemId));
                            if (ownedItem) {
                                ownedItem.quantity -= totalBroken;
                                if(ownedItem.quantity < 0) ownedItem.quantity = 0;
                            }
                        }
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

        // --- RISK SYSTEM (BANDIT & DISASTER) FOR SECT ---
        const now = Date.now();
        const DISASTER_CYCLE = 20 * 24 * 3600 * 1000;
        const BANDIT_CYCLE = 5 * 24 * 3600 * 1000;

        let riskTriggered = false;
        if (!sect.lastDisasterHitAt) { sect.lastDisasterHitAt = new Date(); sectUpdated = true; }
        if (!sect.lastBanditHitAt) { sect.lastBanditHitAt = new Date(); sectUpdated = true; }

        const lastDisaster = sect.lastDisasterHitAt.getTime();
        if (now - lastDisaster >= DISASTER_CYCLE) {
            const activeAssets = sect.assets.filter(a => a.status === 'active' && !a.isDamaged && !isUnderConstruction(a));
            if (activeAssets.length > 0) {
                const target = activeAssets[Math.floor(Math.random() * activeAssets.length)];
                target.isDamaged = true;
                target.isHalted = true;
                target.damageType = 'disaster';
                sect.lastDisasterHitAt = new Date();
                sectUpdated = true;
                riskTriggered = true;
            }
        }

        const lastBandit = sect.lastBanditHitAt.getTime();
        if (!riskTriggered && now - lastBandit >= BANDIT_CYCLE) {
            const activeAssets = sect.assets.filter(a => a.status === 'active' && !a.isDamaged && !isUnderConstruction(a));
            const vulnerableAssets = activeAssets.filter(a => !a.guardEndTime || a.guardEndTime.getTime() < now);

            if (vulnerableAssets.length > 0) {
                const target = vulnerableAssets[Math.floor(Math.random() * vulnerableAssets.length)];
                target.isDamaged = true;
                target.isHalted = true;
                target.damageType = 'bandit';
                sect.lastBanditHitAt = new Date();
                sectUpdated = true;
            } else if (activeAssets.length > 0) {
                sect.lastBanditHitAt = new Date();
                sectUpdated = true;
            }
        }

        for (const owned of sect.assets) {
             const assetConfig = assetMap.get(owned.assetId.toString());
             if (!assetConfig) continue;

             const now = Date.now();
             const lastUpdate = owned.lastClaimAt ? owned.lastClaimAt.getTime() : (sect.createdAt.getTime());
             const progressMs = now - lastUpdate;

             if (owned.status === 'pending' || owned.status === 'building' || (owned.constructionCompleteAt && owned.constructionCompleteAt.getTime() > now)) {
                  // Sekte construction tidak pakai pekerja (saat ini) jadi progress fix.
                  if (owned.constructionCompleteAt && owned.constructionCompleteAt.getTime() <= now) {
                      owned.status = 'active';
                      owned.constructionCompleteAt = null;
                      owned.lastClaimAt = new Date();
                      sectUpdated = true;
                      continue; // Skip the rest of the loop for this hour so it doesn't instantly produce materials
                  } else {
                      continue;
                  }
             }

             if (assetConfig.isCraftingStation) {
                  owned.lastClaimAt = new Date(); // Tetap update time state biar ga overflow
                  sectUpdated = true;
                  continue;
             }

             const hoursPassed = Math.floor(progressMs / (3600 * 1000));
             if (hoursPassed < 1) {
                 if (owned.isHalted) {
                     let hasMaterialsForOneHour = true;
                     if (assetConfig.workerInputMaterials && assetConfig.workerInputMaterials.length > 0) {
                         for (const input of assetConfig.workerInputMaterials) {
                             const neededPerHour = input.quantity * owned.quantity;
                             const ownedItem = sect.resources.find(r => r.itemId.equals(input.itemId));
                             const availableQuantity = ownedItem ? ownedItem.quantity : 0;
                             if (availableQuantity < neededPerHour) {
                                 hasMaterialsForOneHour = false;
                                 break;
                             }
                         }
                     }
                     if (hasMaterialsForOneHour) {
                         owned.isHalted = false;
                         sectUpdated = true;
                     }
                 }

                 owned.lastClaimAt = new Date(now - progressMs);
                 sectUpdated = true;
                 continue;
             }

             let affordableHours = hoursPassed;
             let missingMaterialName = null;

             if (assetConfig.workerInputMaterials && assetConfig.workerInputMaterials.length > 0) {
                 for (const input of assetConfig.workerInputMaterials) {
                     const neededPerHour = input.quantity * owned.quantity;
                     const ownedItem = sect.resources.find(r => r.itemId.equals(input.itemId));
                     const availableQuantity = ownedItem ? ownedItem.quantity : 0;

                     // Validasi keras: minimal punya alat untuk mulai
                     if (availableQuantity < neededPerHour) {
                         affordableHours = 0;
                         if (!missingMaterialName) missingMaterialName = input.itemName;
                         break;
                     }

                     const durability = input.durabilityHours || 1;
                     let maxAffordableForThisMat = hoursPassed;

                     if (durability === 1) {
                         maxAffordableForThisMat = Math.floor(availableQuantity / neededPerHour);
                     } else {
                         if (!owned.toolDurabilityUsage) owned.toolDurabilityUsage = new Map();
                         const currentUsage = owned.toolDurabilityUsage.get(input.itemId.toString()) || 0;
                         maxAffordableForThisMat = Math.floor(Math.max(0, (availableQuantity * durability) - currentUsage) / neededPerHour);
                     }

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
                     if (sect.leaderId) {
                         try {
                             const user = await client.users.fetch(sect.leaderId).catch(() => null);
                             const msg = `⚠️ Pekerja di aset sekte **${assetConfig.name}** telah **berhenti bekerja** karena sekte kekurangan material: **${missingMaterialName}**! Segera isi ulang gudang sekte.`;
                             if (user) {
                                 await user.send(msg).catch(() => null);
                             }
                             if (client.io) {
                                client.io.to(sect.leaderId).emit('user_update', { message: msg });
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
                     const baseNeeded = input.quantity * owned.quantity;
                     const durability = input.durabilityHours || 1;
                     let totalBroken = 0;

                     if (durability === 1) {
                         totalBroken = baseNeeded * affordableHours;
                     } else {
                         if (!owned.toolDurabilityUsage) owned.toolDurabilityUsage = new Map();
                         let currentUsage = owned.toolDurabilityUsage.get(input.itemId.toString()) || 0;

                         currentUsage += (baseNeeded * affordableHours);
                         totalBroken = Math.floor(currentUsage / durability);
                         const remainder = currentUsage % durability;
                         owned.toolDurabilityUsage.set(input.itemId.toString(), remainder);
                         sectUpdated = true;
                     }

                     if (totalBroken > 0) {
                         const ownedItem = sect.resources.find(r => r.itemId.equals(input.itemId));
                         if (ownedItem) {
                             ownedItem.quantity -= totalBroken;
                             if (ownedItem.quantity < 0) ownedItem.quantity = 0;
                         }
                     }
                 }
             }

             // Add Currency (Tipe 1)
             if (assetConfig.dailyProfit > 0) {
                 const profit = affordableHours * assetConfig.dailyProfit * owned.quantity;
                 // Distribusikan ke anggota sesuai persentase sectProfitSplit
                 const shares = splitSectProfit(sect, profit);
                 if (shares && shares.length > 0) {
                     for (const share of shares) {
                         // Find the player in database directly and give them the currency (lazy load)
                         const memberPlayer = await Player.findOne({ discordId: share.userId, guildId: sect.guildId });
                         if (memberPlayer) {
                                                          const profitCopper = share.amount * RATE_TO_COPPER[assetConfig.profitCurrency];
                             const totalCopper = convertToCopper(memberPlayer.currency) + profitCopper;
                             memberPlayer.currency = convertFromCopper(totalCopper);
                             await memberPlayer.save();
                         }
                     }
                 } else {
                     // Fallback ke kas sekte jika kosong anggotanya (meski jarang)
                     sect.currency[assetConfig.profitCurrency] += profit;
                 }
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
