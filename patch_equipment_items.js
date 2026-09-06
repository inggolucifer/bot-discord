const fs = require('fs');

const itemsPath = 'MongoDB/jianghu.items.json';
const data = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

// Common default fields
const defaults = {
    guildId: "1504794711775514856",
    __v: 0,
    createdAt: { "$date": new Date().toISOString() },
    updatedAt: { "$date": new Date().toISOString() },
    createdBy: "System Oracle",
    imageUrl: null
};

// Helm Pemula
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54c000" },
    name: "Topi Jerami Pemula",
    description: "[Durability: -] Topi jerami lusuh yang memberikan perlindungan dasar dari terik matahari.",
    category: "helmet",
    basePrice: 50,
    priceCurrency: "copper",
    rank: "Common",
    tier: 1,
    origin: "Toko / Crafting",
    baseHp: 10,
    baseDef: 2
});

// Celana Pemula
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54c001" },
    name: "Celana Kain Kasar",
    description: "[Durability: -] Celana dari kain kasar, tidak nyaman tapi lebih baik dari telanjang.",
    category: "pants",
    basePrice: 50,
    priceCurrency: "copper",
    rank: "Common",
    tier: 1,
    origin: "Toko / Crafting",
    baseHp: 15,
    baseDef: 1,
    baseSpd: 2
});

// Sepatu Pemula
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54c002" },
    name: "Sandal Jerami",
    description: "[Durability: -] Sandal ringan yang meningkatkan kecepatan lari sedikit.",
    category: "boots",
    basePrice: 40,
    priceCurrency: "copper",
    rank: "Common",
    tier: 1,
    origin: "Toko / Crafting",
    baseHp: 5,
    baseSpd: 5
});

// Patch cloth to armor
for (const item of data) {
    if (item.category === 'cloth') {
        item.category = 'armor';
    }
}

fs.writeFileSync(itemsPath, JSON.stringify(data, null, 2));
console.log('Equipment items patched');
