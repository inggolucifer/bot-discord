const mongoose = require('mongoose');
const Player = require('../models/Player');
const AdminLog = require('../models/AdminLog');
require('dotenv').config();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const guildIdArg = args.find(a => a.startsWith('--guildId='));
const guildId = guildIdArg ? guildIdArg.split('=')[1] : null;

async function run() {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(`Connected to MongoDB. Dry run: ${dryRun}, GuildId filter: ${guildId || 'ALL'}`);

    try {
        const query = { currentLocation: { $exists: false } };
        if (guildId) query.guildId = guildId;

        const players = await Player.find(query);
        console.log(`Found ${players.length} players to migrate.`);

        for (const player of players) {
            if (!dryRun) {
                player.currentLocation = {
                    regionSlug: 'central_plains',
                    settlementName: 'Desa Xingcun',
                    buildingName: null
                };
                await player.save();
                console.log(`Updated player ${player.discordId}`);
            } else {
                console.log(`[DRY-RUN] Would update player ${player.discordId}`);
            }
        }

        if (!dryRun && players.length > 0) {
            await AdminLog.create({
                guildId: guildId || 'ALL',
                adminId: 'SYSTEM_MIGRATION_SCRIPT',
                action: 'migrate_player_location',
                details: `Migrated ${players.length} players to default location.`
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

run();
