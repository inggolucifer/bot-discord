const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');
const RegionMap = require('../models/RegionMap');
const Location = require('../models/Location');
const travelDistances = require('../config/travelDistances');

const args = process.argv.slice(2);
const guildIdArg = args.find(a => a.startsWith('--guildId='));
const isDryRun = args.includes('--dry-run');

if (!guildIdArg) {
    console.error('Error: --guildId=<id> is required.');
    process.exit(1);
}
const guildId = guildIdArg.split('=')[1];

const regions = [
  { regionSlug: 'central_plains', displayName: 'Central Plains', worldMapX: 50, worldMapY: 50, themeColor: '#d4a373', dangerTier: 1 },
  { regionSlug: 'azure_mountain_range', displayName: 'Azure Mountain Range', worldMapX: 25, worldMapY: 30, themeColor: '#7a9e9f', dangerTier: 2 },
  { regionSlug: 'eastern_sea_region', displayName: 'Eastern Sea Region', worldMapX: 80, worldMapY: 45, themeColor: '#4ea8de', dangerTier: 3 },
  { regionSlug: 'southern_demon_domain', displayName: 'Southern Demon Domain', worldMapX: 60, worldMapY: 80, themeColor: '#9d0208', dangerTier: 4 },
  { regionSlug: 'western_sacred_deserts', displayName: 'Western Sacred Deserts', worldMapX: 20, worldMapY: 70, themeColor: '#ffba08', dangerTier: 4 },
  { regionSlug: 'northern_desolate_territory', displayName: 'Northern Desolate Territory', worldMapX: 45, worldMapY: 15, themeColor: '#cad2c5', dangerTier: 5 }
];

const settlementCoordinates = {
  'central_plains': {
    'Desa Xingcun': { x: 45, y: 55, type: 'village' },
    'Tianjing': { x: 50, y: 50, type: 'city' },
    'Luoyang Kecil': { x: 55, y: 45, type: 'city' },
    'Fengyang': { x: 40, y: 40, type: 'village' },
    'Desa Tiedao': { x: 60, y: 60, type: 'village' },
    'Ibukota Central': { x: 65, y: 40, type: 'city' }
  },
  'azure_mountain_range': {
    'Tri-Sect Mountain Outpost': { x: 50, y: 70, type: 'landmark' },
    'Azure Sect Approach': { x: 60, y: 50, type: 'sect_hall' }
  },
  'eastern_sea_region': {
    'Pelabuhan Timur': { x: 30, y: 50, type: 'city' },
    'Eastern Market Port': { x: 40, y: 60, type: 'city' }
  },
  'southern_demon_domain': {
    'Scar of Heaven Camp': { x: 50, y: 40, type: 'landmark' },
    'Southern Watch': { x: 50, y: 30, type: 'landmark' }
  },
  'western_sacred_deserts': {
    'Oasis Barat': { x: 70, y: 50, type: 'village' },
    'Desert Relay': { x: 80, y: 50, type: 'landmark' }
  },
  'northern_desolate_territory': {
    'Pos Tundra Utara': { x: 50, y: 70, type: 'landmark' },
    'Northern Caravan Post': { x: 50, y: 80, type: 'landmark' }
  }
};


async function seed() {
    await connectDB();
    console.log(`Starting Phase A Region/Map Seed for guild: ${guildId}${isDryRun ? ' (DRY RUN)' : ''}`);

    try {
        if (!isDryRun) {
            for (const region of regions) {
                await RegionMap.findOneAndUpdate(
                    { regionSlug: region.regionSlug },
                    { $set: region },
                    { upsert: true, new: true }
                );
            }
            console.log('Seeded RegionMaps.');

            for (const settlement of travelDistances.settlements) {
                const coords = settlementCoordinates[settlement.regionSlug] && settlementCoordinates[settlement.regionSlug][settlement.name];

                if (coords) {
                     await Location.findOneAndUpdate(
                        { guildId, regionSlug: settlement.regionSlug, settlementName: settlement.name, buildingType: 'plaza' },
                        {
                            $set: {
                                mapX: coords.x,
                                mapY: coords.y,
                                mapIconType: coords.type
                            }
                        }
                    );
                } else {
                    console.warn(`No coordinates defined for ${settlement.name} in ${settlement.regionSlug}. Map coordinates not set.`);
                }
            }
            console.log('Seeded Location coordinates for plazas.');
        } else {
             console.log(`Dry run mode: Would have upserted ${regions.length} RegionMaps.`);
             console.log(`Dry run mode: Would have updated Location coordinates for ${travelDistances.settlements.length} settlements.`);
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await disconnectDB();
        console.log('Done.');
        process.exit(0);
    }
}

seed();