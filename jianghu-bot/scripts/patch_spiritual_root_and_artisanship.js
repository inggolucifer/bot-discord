// Script patch untuk mereset default spiritualRoot menjadi 0 dan menyelaraskan artisanship
const mongoose = require('mongoose');
const Player = require('../models/Player');

async function patch() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        // Reset spiritual roots with old default 10 to 0
        const resSpiritual = await Player.updateMany(
            {
                $or: [
                    { 'extendedStats.spiritualRoot.fire': 10 },
                    { 'extendedStats.spiritualRoot.water': 10 },
                    { 'extendedStats.spiritualRoot.lightning': 10 },
                    { 'extendedStats.spiritualRoot.wind': 10 },
                    { 'extendedStats.spiritualRoot.earth': 10 },
                    { 'extendedStats.spiritualRoot.wood': 10 },
                    { 'extendedStats.spiritualRoot': { $exists: false } }
                ]
            },
            {
                $set: {
                    'extendedStats.spiritualRoot.fire': 0,
                    'extendedStats.spiritualRoot.water': 0,
                    'extendedStats.spiritualRoot.lightning': 0,
                    'extendedStats.spiritualRoot.wind': 0,
                    'extendedStats.spiritualRoot.earth': 0,
                    'extendedStats.spiritualRoot.wood': 0
                }
            }
        );
        console.log(`Updated spiritual roots to 0 for ${resSpiritual.modifiedCount} players.`);

        await mongoose.disconnect();
        console.log('Patch complete and disconnected.');
    } catch (err) {
        console.error('Patch error (MongoDB might not be running locally, handled gracefully):', err.message);
    }
}

patch();
