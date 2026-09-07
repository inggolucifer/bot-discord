const fs = require('fs');
const path = 'MongoDB/jianghu.items.json';

try {
    const data = fs.readFileSync(path, 'utf8');
    const items = JSON.parse(data);

    let updated = 0;

    // Helper function to scale stats based on tier (1-5) and rank (Common -> Mythical)
    function calculatePerfectStats(category, tier, rank) {
        // Safe defaults
        tier = tier || 1;
        rank = rank || 'Common';

        // Multipliers
        const tierMultipliers = { 1: 1.0, 2: 1.8, 3: 3.0, 4: 5.5, 5: 10.0 };
        const rankMultipliers = { 'Common': 1.0, 'Uncommon': 1.5, 'Rare': 2.5, 'Epic': 4.0, 'Legendary': 7.0, 'Mythical': 12.0 };

        const tm = tierMultipliers[tier] || 1.0;
        const rm = rankMultipliers[rank] || 1.0;
        const totalMult = tm * rm;

        let stats = {};

        // Base templates
        if (category === 'weapon') {
            stats.baseAtk = Math.floor(15 * totalMult);
        } else if (category === 'armor') {
            stats.baseHp = Math.floor(80 * totalMult);
            stats.baseDef = Math.floor(8 * totalMult);
        } else if (category === 'helmet') {
            stats.baseHp = Math.floor(40 * totalMult);
            stats.baseDef = Math.floor(5 * totalMult);
        } else if (category === 'pants') {
            stats.baseHp = Math.floor(50 * totalMult);
            stats.baseDef = Math.floor(6 * totalMult);
        } else if (category === 'boots') {
            stats.baseHp = Math.floor(30 * totalMult);
            stats.baseDef = Math.floor(4 * totalMult);
            stats.baseSpd = Math.floor(3 * totalMult);
        } else if (category === 'accessories') {
            // Accessories usually give balanced small buffs
            stats.baseHp = Math.floor(25 * totalMult);
            stats.baseAtk = Math.floor(5 * totalMult);
            stats.baseDef = Math.floor(3 * totalMult);
            stats.baseSpd = Math.floor(2 * totalMult);
        }

        return stats;
    }

    const equipmentCategories = ['weapon', 'armor', 'helmet', 'pants', 'boots', 'accessories'];

    for (const item of items) {
        if (equipmentCategories.includes(item.category)) {
            const perfectStats = calculatePerfectStats(item.category, item.tier, item.rank);

            let changed = false;
            // Only update if stats differ or don't exist
            for (const [key, val] of Object.entries(perfectStats)) {
                if (item[key] !== val) {
                    item[key] = val;
                    changed = true;
                }
            }

            if (changed) {
                updated++;
            }
        }
    }

    fs.writeFileSync(path, JSON.stringify(items, null, 2));
    console.log(`Successfully generated and applied perfect ecosystem stats to ${updated} equipment items in JSON seed.`);
} catch (error) {
    console.error('Failed to parse or write JSON:', error);
}
