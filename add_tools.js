const fs = require('fs');

const itemsFile = 'MongoDB/jianghu.items.json';
let items = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));

const generateObjectId = () => {
    const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
    const randomHex = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16)).toLowerCase();
    return timestamp + randomHex;
};

const newTools = [
    {
        "_id": { "$oid": generateObjectId() },
        "guildId": "DEFAULT_GUILD",
        "name": "Tungku Alkimia Batu",
        "rank": "Uncommon",
        "category": "tool",
        "tier": 2,
        "toolType": "furnace",
        "baseAtk": 0,
        "baseDef": 0,
        "baseHp": 0,
        "baseSpd": 0,
        "maxDurability": 50,
        "description": "Tungku alkimia kokoh dari batu, mampu menahan suhu lebih tinggi. Cocok untuk meracik pil tingkat menengah.",
        "imageUrl": null,
        "effect": null,
        "origin": "Crafting",
        "basePrice": 50,
        "priceCurrency": "copper",
        "createdBy": "System Oracle"
    },
    {
        "_id": { "$oid": generateObjectId() },
        "guildId": "DEFAULT_GUILD",
        "name": "Tungku Alkimia Besi",
        "rank": "Rare",
        "category": "tool",
        "tier": 3,
        "toolType": "furnace",
        "baseAtk": 0,
        "baseDef": 0,
        "baseHp": 0,
        "baseSpd": 0,
        "maxDurability": 100,
        "description": "Tungku alkimia dari besi hitam, dirancang untuk meracik pil kultivator yang membutuhkan kestabilan spiritual.",
        "imageUrl": null,
        "effect": null,
        "origin": "Crafting",
        "basePrice": 200,
        "priceCurrency": "copper",
        "createdBy": "System Oracle"
    }
];

// Menambahkan timestamp
const now = new Date().toISOString();
newTools.forEach(tool => {
    tool.createdAt = { "$date": now };
    tool.updatedAt = { "$date": now };
});

items = items.concat(newTools);
fs.writeFileSync(itemsFile, JSON.stringify(items, null, 2));
console.log("Berhasil menambahkan " + newTools.length + " tool baru.");
