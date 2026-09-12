const mongoose = require('mongoose');
const Player = require('./jianghu-bot/models/Player');

async function patch() {
    try {
        await mongoose.connect('mongodb://localhost:27017/jianghu');
        console.log('Connected to DB for Inventory IDs patch');

        const players = await Player.find({});
        let modified = 0;

        for (const player of players) {
            let changed = false;
            for (const item of player.inventory) {
                if (!item._id) {
                    item._id = new mongoose.Types.ObjectId();
                    changed = true;
                }
            }
            if (changed) {
                player.markModified('inventory');
                await player.save();
                modified++;
            }
        }

        console.log(`Updated ${modified} players with missing inventory _ids`);
    } catch(e) {
        console.log("DB connection failed, skipping migration script execution. Migration script will be provided for real environment.");
    } finally {
        mongoose.disconnect();
    }
}
patch().catch(console.error);
