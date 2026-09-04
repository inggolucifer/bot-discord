const { RATE_TO_COPPER } = require('./currencyNormalize');

/**
 * Calculates the materials and currency required to repair a damaged asset.
 * @param {Object} assetConfig - The master configuration of the asset from the DB.
 * @returns {Object} { neededMaterials: [{ itemId, itemName, quantity }], repairCostInCopper: Number }
 */
function calculateRepairCost(assetConfig) {
    const neededMaterials = [];
    let repairCostInCopper = 0;

    // Logic repair: 20% of build requirements OR 20% of base price
    if (assetConfig.buildable && assetConfig.buildRequirements && assetConfig.buildRequirements.length > 0) {
        for (const req of assetConfig.buildRequirements) {
            const repairQty = Math.max(1, Math.floor(req.quantity * 0.2));
            neededMaterials.push({ itemId: req.itemId, itemName: req.itemName, quantity: repairQty });
        }
    } else {
        const totalBasePriceInCopper = (assetConfig.basePrice || 0) * (RATE_TO_COPPER[assetConfig.priceCurrency] || 0);
        repairCostInCopper = Math.max(1, Math.floor(totalBasePriceInCopper * 0.2));
    }

    return { neededMaterials, repairCostInCopper };
}

/**
 * Calculates the daily copper cost to hire a guard for an asset based on its tier/profitability.
 * Tier rules reference: ECOSYSTEM_RULES.md
 * @param {Object} assetConfig - The master configuration of the asset from the DB.
 * @returns {Number} Daily cost in copper.
 */
function calculateDailyGuardCost(assetConfig) {
    let dailyCostCopper = 5; // Fallback Tier 1

    if (assetConfig.dailyProfit > 0) {
        // Evaluate based on daily profit
        const profitCopper = assetConfig.dailyProfit * (RATE_TO_COPPER[assetConfig.profitCurrency] || 1);

        // Cost mappings from rules:
        // T1: 20-50 copper profit -> 5 copper guard
        // T2: 1-5 silver profit -> 20 copper guard
        // T3: 10-20 silver profit -> 2 silver guard (200 copper)
        // T4: 50-100 silver profit -> 10 silver guard (1000 copper)
        // T5: 1 gold profit -> 20 silver guard (2000 copper)
        // T6: 2 gold profit -> 50 silver guard (5000 copper)
        if (profitCopper >= 20000) dailyCostCopper = 5000;
        else if (profitCopper >= 10000) dailyCostCopper = 2000;
        else if (profitCopper >= 5000) dailyCostCopper = 1000;
        else if (profitCopper >= 1000) dailyCostCopper = 200;
        else if (profitCopper >= 100) dailyCostCopper = 20;
        else dailyCostCopper = 5;
    } else {
        // Non-currency asset (Tipe 2/3), evaluate based on base price or construction time
        if (assetConfig.basePrice >= 1 && assetConfig.priceCurrency === 'gold') dailyCostCopper = 2000;
        else if (assetConfig.basePrice >= 50 && assetConfig.priceCurrency === 'silver') dailyCostCopper = 1000;
        else if (assetConfig.basePrice >= 10 && assetConfig.priceCurrency === 'silver') dailyCostCopper = 200;
        else if (assetConfig.basePrice >= 1 && assetConfig.priceCurrency === 'silver') dailyCostCopper = 20;
    }

    return dailyCostCopper;
}

module.exports = {
    calculateRepairCost,
    calculateDailyGuardCost
};
