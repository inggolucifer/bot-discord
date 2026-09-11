export const RATE_TO_COPPER = {
    copper: 1,
    silver: 100,
    gold: 10000,
    jade: 1000000,
    spirit: 100000000,
};

export function getTotalCopperEquivalent(currency: any): number {
    if (!currency) return 0;
    return Math.round(
        (currency.copper || 0) * RATE_TO_COPPER.copper +
        (currency.silver || 0) * RATE_TO_COPPER.silver +
        (currency.gold || 0) * RATE_TO_COPPER.gold +
        (currency.jade || 0) * RATE_TO_COPPER.jade +
        (currency.spirit || 0) * RATE_TO_COPPER.spirit
    );
}
