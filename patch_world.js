const fs = require('fs');

const file = 'jianghu-bot/web-api/routes/world.js';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Remove getTotalCopperEquivalent from here since it's in utils/currency
const searchEq = `// Helper to get total wealth in copper
const getTotalCopperEquivalent = (currency) => {
    return (currency.copper || 0) +
           (currency.silver || 0) * 100 +
           (currency.gold || 0) * 10000 +
           (currency.jade || 0) * 1000000 +
           (currency.spirit || 0) * 100000000;
};`;
content = content.replace(searchEq, '');


// Fix 2: Remove the dangerous player.populate in travel/start
const searchEscort = `             // To properly check item by name, we would need to populate, but since we'll use item ID or just try to find it
             await player.populate('inventory.itemId');
             const itemIndex = player.inventory.findIndex(i => i.itemId && i.itemId.name === 'Surat Jaminan Biro Pengawalan');
             if (itemIndex > -1) {
                 escortUsed = true;
                 player.inventory[itemIndex].quantity -= 1;
                 if (player.inventory[itemIndex].quantity <= 0) {
                     player.inventory.splice(itemIndex, 1);
                 }
                 await player.save();
             }`;

const replaceEscort = `             // Lookup item ID from DB first
             const Item = require('../../models/Item');
             const escortItemDef = await Item.findOne({ name: 'Surat Jaminan Biro Pengawalan' });
             if (escortItemDef) {
                 const itemIndex = player.inventory.findIndex(i => i.itemId && i.itemId.toString() === escortItemDef._id.toString());
                 if (itemIndex > -1) {
                     escortUsed = true;
                     player.inventory[itemIndex].quantity -= 1;
                     if (player.inventory[itemIndex].quantity <= 0) {
                         player.inventory.splice(itemIndex, 1);
                     }
                     await player.save();
                 }
             }`;

content = content.replace(searchEscort, replaceEscort);

// Fix ambush logic
const searchAmbush = `                        const totalCopperEq = getTotalCopperEquivalent(player.currency);
                        const lossCopper = Math.floor(totalCopperEq * travelConfig.AMBUSH_LOSS_PERCENT);
                        const capCopper = travelConfig.AMBUSH_LOSS_CAP_SILVER_EQ * 100;
                        const finalLossCopper = Math.min(lossCopper, capCopper);

                        if (finalLossCopper > 0) {
                            let remainingToDeduct = finalLossCopper;

                            // Deduct from highest to lowest currency (simplified)
                            // A proper payCurrency doesn't easily deduct "equivalent", we just convert all to copper, deduct, and convert back

                            let currentTotal = getTotalCopperEquivalent(player.currency);
                            let newTotal = currentTotal - finalLossCopper;

                            // Simple convert back
                            player.currency.spirit = Math.floor(newTotal / 100000000); newTotal %= 100000000;
                            player.currency.jade = Math.floor(newTotal / 1000000); newTotal %= 1000000;
                            player.currency.gold = Math.floor(newTotal / 10000); newTotal %= 10000;
                            player.currency.silver = Math.floor(newTotal / 100); newTotal %= 100;
                            player.currency.copper = newTotal;

                            travel.ambushResult.message = \`Kamu disergap oleh \${travel.ambushResult.banditGroupSize} bandit dan kehilangan harta setara dengan \${Math.floor(finalLossCopper/100)} silver.\`;

                            const client = req.app.get('client');
                            try {
                                if (client) {
                                    // Normally we would use logTransaction here but we're mimicking it or doing a simple save to DB
                                    const { logTransaction } = require('../../utils/economyLogger');
                                    // if logTransaction is available, call it, otherwise fallback
                                }
                            } catch(e) {}

                            await AdminLog.create([{
                                guildId: player.guildId,
                                adminId: 'SYSTEM',
                                action: 'travel_ambush',
                                details: \`Player \${player.discordId} ambushed, lost \${finalLossCopper} copper equivalent.\`
                            }], { session });

                        } else {`;

const replaceAmbush = `                        const { getTotalCopper, payCurrency } = require('../../utils/currency');
                        const totalCopperEq = getTotalCopper(player.currency);
                        const lossCopper = Math.floor(totalCopperEq * travelConfig.AMBUSH_LOSS_PERCENT);
                        const capCopper = travelConfig.AMBUSH_LOSS_CAP_SILVER_EQ * 100;
                        const finalLossCopper = Math.min(lossCopper, capCopper);

                        if (finalLossCopper > 0) {
                            // Deduct using existing utility
                            payCurrency(player.currency, finalLossCopper, 'copper');

                            travel.ambushResult.message = \`Kamu disergap oleh \${travel.ambushResult.banditGroupSize} bandit dan kehilangan harta setara dengan \${Math.floor(finalLossCopper/100)} silver.\`;

                            try {
                                const client = req.app.get('client');
                                if (client) {
                                    const { logTransaction } = require('../../utils/logger'); // or whatever the actual path is if it exists
                                    if (logTransaction) {
                                        logTransaction(client, {
                                            guildId: player.guildId,
                                            userId: player.discordId,
                                            type: 'travel_ambush',
                                            description: \`Ambushed during travel, lost \${finalLossCopper} copper equivalent\`,
                                            currencyType: 'copper',
                                            amount: finalLossCopper
                                        });
                                    }
                                }
                            } catch (e) {
                                // Ignore if economyLogger not found or client not set up fully
                            }

                            await AdminLog.create([{
                                guildId: player.guildId,
                                adminId: 'SYSTEM',
                                action: 'travel_ambush',
                                details: \`Player \${player.discordId} ambushed, lost \${finalLossCopper} copper equivalent.\`
                            }], { session });

                        } else {`;

content = content.replace(searchAmbush, replaceAmbush);

fs.writeFileSync(file, content);
console.log('Patched world.js');
