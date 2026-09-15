const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const Location = require('../models/Location');

const args = process.argv.slice(2);
const guildIdArg = args.find(a => a.startsWith('--guildId='));
const isDryRun = args.includes('--dry-run');

if (!guildIdArg) {
    console.error('Error: --guildId=<id> is required.');
    process.exit(1);
}
const guildId = guildIdArg.split('=')[1];

async function seed() {
    await connectDB();
    console.log(`Starting Phase 14 Location Seed for guild: ${guildId}${isDryRun ? ' (DRY RUN)' : ''}`);

    const newSettlements = [
        { regionSlug: 'central_plains', name: 'Ibukota Central' },
        { regionSlug: 'azure_mountain_range', name: 'Azure Sect Approach' },
        { regionSlug: 'southern_demon_domain', name: 'Southern Watch' },
        { regionSlug: 'eastern_sea_region', name: 'Eastern Market Port' },
        { regionSlug: 'northern_desolate_territory', name: 'Northern Caravan Post' },
        { regionSlug: 'western_sacred_deserts', name: 'Desert Relay' }
    ];

    for (const s of newSettlements) {
        const plazaLocation = {
             guildId: guildId,
             regionSlug: s.regionSlug,
             settlementName: s.name,
             buildingName: 'Plaza Pusat',
             buildingType: 'plaza',
             description: `Pusat dari ${s.name}.`
        };

        if (isDryRun) {
             console.log(`[DRY RUN] Would upsert location: ${s.name} (Plaza Pusat)`);
        } else {
             await Location.updateOne(
                  { guildId, regionSlug: s.regionSlug, settlementName: s.name, buildingName: 'Plaza Pusat' },
                  { $set: plazaLocation },
                  { upsert: true }
             );
             console.log(`Upserted location: ${s.name} (Plaza Pusat)`);
        }
    }

    await disconnectDB();
    console.log('Seed completed.');
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
