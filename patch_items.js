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

// Item 1: Biji Gandum
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bfff" },
    name: "Biji Gandum",
    description: "Benih gandum biasa yang tumbuh cepat.",
    category: "material",
    basePrice: 5,
    priceCurrency: "copper",
    rank: "Common",
    tier: 1,
    origin: "Eksplorasi / Tani"
});

// Item 2: Biji Teratai Darah
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bffe" },
    name: "Biji Teratai Darah",
    description: "Benih langka yang bernilai tinggi, butuh waktu lama untuk tumbuh.",
    category: "material",
    basePrice: 1,
    priceCurrency: "gold",
    rank: "Rare",
    tier: 3,
    origin: "Eksplorasi"
});

// Item 3: Sup Ikan Mas
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bffd" },
    name: "Sup Ikan Mas",
    description: "Sup hangat yang sangat memulihkan tenaga. (Efek: Memulihkan Energy)",
    category: "food",
    basePrice: 50,
    priceCurrency: "silver",
    rank: "Uncommon",
    tier: 2,
    origin: "Cooking",
    effect: "buff_energy_regen_10_2h"
});

// Item 4: Sate Monster
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bffc" },
    name: "Sate Monster",
    description: "Makanan dari daging monster yang kuat. Syarat eksplorasi menengah.",
    category: "food",
    basePrice: 2,
    priceCurrency: "gold",
    rank: "Rare",
    tier: 3,
    origin: "Cooking",
    effect: "buff_hp_boost_200_1h"
});

// Item 5: Pil Pembelah Gunung
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bffb" },
    name: "Pil Pembelah Gunung",
    description: "Pil langka dari Alchemy yang meningkatkan kekuatan penghancur. (+50 ATK selama 1 jam)",
    category: "pill",
    basePrice: 10,
    priceCurrency: "gold",
    rank: "Rare",
    tier: 3,
    origin: "Alchemy",
    effect: "buff_atk_boost_50_1h"
});

// Item 6: Pupuk Tulang
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bffa" },
    name: "Pupuk Tulang",
    description: "Katalis kuat yang menyuburkan tanah instan. Dapat mengatasi kelelahan lahan (Soil Depletion).",
    category: "material",
    basePrice: 5,
    priceCurrency: "gold",
    rank: "Uncommon",
    tier: 2,
    origin: "Alchemy"
});

// Item 7: Ikan Mas
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bff9" },
    name: "Ikan Mas",
    description: "Ikan umum dari danau. Sering dimasak jadi ransum.",
    category: "material",
    basePrice: 20,
    priceCurrency: "copper",
    rank: "Common",
    tier: 1,
    origin: "Fishing"
});

// Item 8: Sepatu Bekas
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bff8" },
    name: "Sepatu Bekas",
    description: "Sampah yang kadang tersangkut di kail pancing.",
    category: "material",
    basePrice: 1,
    priceCurrency: "copper",
    rank: "Junk",
    tier: 1,
    origin: "Fishing"
});

// Item 9: Ikan Besi
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bff7" },
    name: "Ikan Besi",
    description: "Ikan bersisik keras yang sering dipancing di sungai deras.",
    category: "material",
    basePrice: 5,
    priceCurrency: "silver",
    rank: "Uncommon",
    tier: 2,
    origin: "Fishing"
});

// Item 10: Ikan Beracun
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bff6" },
    name: "Ikan Beracun",
    description: "Ikan mematikan yang menjadi materi utama pil racun di Alchemy.",
    category: "material",
    basePrice: 5,
    priceCurrency: "silver",
    rank: "Uncommon",
    tier: 2,
    origin: "Fishing"
});

// Item 11: Paus Langit Mini
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bff5" },
    name: "Paus Langit Mini",
    description: "Makhluk legendaris dalam wujud kecil. Dikonsumsi untuk menambah 200 HP.",
    category: "food",
    basePrice: 2,
    priceCurrency: "jade",
    rank: "Legendary",
    tier: 5,
    origin: "Fishing",
    effect: "buff_hp_boost_200_4h"
});

// Item 12: Tulang Naga Laut
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bff4" },
    name: "Tulang Naga Laut",
    description: "Tulang ikan sakti dari lautan Qi. Bahan andalan pandai besi untuk senjata Tier 5.",
    category: "material",
    basePrice: 5,
    priceCurrency: "jade",
    rank: "Legendary",
    tier: 5,
    origin: "Fishing"
});

// Item 13: Pupuk Alkimia
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bff3" },
    name: "Pupuk Alkimia",
    description: "Ramuan alkimia untuk menyegarkan tanah secara instan.",
    category: "material",
    basePrice: 2,
    priceCurrency: "gold",
    rank: "Uncommon",
    tier: 2,
    origin: "Alchemy"
});

// Item 14: Pil Anti-Racun
data.push({
    ...defaults,
    _id: { "$oid": "6a91b15aa9e03dc91c54bff2" },
    name: "Pil Anti-Racun",
    description: "Pil yang kebal terhadap racun udara.",
    category: "pill",
    basePrice: 5,
    priceCurrency: "gold",
    rank: "Rare",
    tier: 3,
    origin: "Alchemy",
    effect: "buff_anti_poison_0_24h"
});

fs.writeFileSync(itemsPath, JSON.stringify(data, null, 2));
console.log('Items patched');
