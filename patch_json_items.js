const fs = require('fs');

const path = 'MongoDB/jianghu.items.json';
const data = fs.readFileSync(path, 'utf8');
const items = JSON.parse(data);

let updated = 0;
for (const item of items) {
    let changed = false;

    if (item.category === 'weapon' && (!item.baseAtk || item.baseAtk === 0)) {
        item.baseAtk = item.rank === 'Common' ? 10 : item.rank === 'Uncommon' ? 20 : item.rank === 'Rare' ? 40 : 15;
        changed = true;
    } else if (item.category === 'armor' && (!item.baseHp || item.baseHp === 0)) {
        item.baseHp = item.rank === 'Common' ? 50 : item.rank === 'Uncommon' ? 100 : item.rank === 'Rare' ? 200 : 75;
        item.baseDef = item.rank === 'Common' ? 5 : item.rank === 'Uncommon' ? 10 : item.rank === 'Rare' ? 20 : 7;
        changed = true;
    } else if (['helmet', 'pants', 'boots', 'accessories'].includes(item.category) && (!item.baseDef || item.baseDef === 0)) {
        item.baseDef = item.rank === 'Common' ? 3 : item.rank === 'Uncommon' ? 6 : item.rank === 'Rare' ? 12 : 4;
        item.baseHp = item.rank === 'Common' ? 20 : item.rank === 'Uncommon' ? 40 : item.rank === 'Rare' ? 80 : 30;
        if (item.category === 'boots') {
            item.baseSpd = item.rank === 'Common' ? 2 : item.rank === 'Uncommon' ? 5 : item.rank === 'Rare' ? 10 : 3;
        }
        changed = true;
    }

    if (changed) {
        updated++;
    }
}

fs.writeFileSync(path, JSON.stringify(items, null, 2));
console.log(`Updated ${updated} equipments with basic stats in JSON seed.`);
