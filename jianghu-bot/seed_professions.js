const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Item = require('./models/Item');

dotenv.config({ path: './.env' }); // Make sure you adjust this if your path differs

const GUILD_ID = process.env.GUILD_ID || '1177659556819443743'; // Assuming default guild id for tests

async function seed() {
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is not set!");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB.");

    const tools = [
        {
            guildId: GUILD_ID,
            name: "Cangkul Pemula",
            rank: "Common",
            category: "tool",
            tier: 1,
            toolType: "farming_tool",
            maxDurability: 50,
            description: "Cangkul kayu kasar untuk bertani. Durability: 50",
            basePrice: 50,
            priceCurrency: "copper"
        },
        {
            guildId: GUILD_ID,
            name: "Pancingan Bambu",
            rank: "Common",
            category: "tool",
            tier: 1,
            toolType: "fishing_rod",
            maxDurability: 30,
            description: "Pancingan sederhana dari bambu. Durability: 30",
            basePrice: 50,
            priceCurrency: "copper"
        },
        {
            guildId: GUILD_ID,
            name: "Wajan Besi",
            rank: "Common",
            category: "tool",
            tier: 1,
            toolType: "kitchen_tool",
            maxDurability: 100,
            description: "Wajan standar untuk memasak. Durability: 100",
            basePrice: 2,
            priceCurrency: "silver"
        },
        {
            guildId: GUILD_ID,
            name: "Tungku Alkimia Dasar",
            rank: "Uncommon",
            category: "tool",
            tier: 1,
            toolType: "furnace",
            maxDurability: 20,
            description: "Tungku kecil untuk meracik pil. Rentan meledak jika salah suhu. Durability: 20",
            basePrice: 5,
            priceCurrency: "silver"
        },
        {
            guildId: GUILD_ID,
            name: "Palu Tempa Besi",
            rank: "Uncommon",
            category: "tool",
            tier: 1,
            toolType: "forge",
            maxDurability: 40,
            description: "Palu berat untuk membentuk logam. Durability: 40",
            basePrice: 5,
            priceCurrency: "silver"
        },
        {
            guildId: GUILD_ID,
            name: "Junk (Sampah)",
            rank: "Common",
            category: "none",
            tier: 1,
            description: "Sisa-sisa material yang gagal diolah.",
            basePrice: 1,
            priceCurrency: "copper"
        }
    ];

    for (let toolData of tools) {
        const existing = await Item.findOne({ name: toolData.name, guildId: GUILD_ID });
        if (!existing) {
            await Item.create(toolData);
            console.log(`Created: ${toolData.name}`);
        } else {
            console.log(`Already exists: ${toolData.name}`);
        }
    }

    console.log("Seeding complete!");
    mongoose.disconnect();
}

seed();
