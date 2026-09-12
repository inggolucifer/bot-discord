require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const { SYSTEM_REALMS } = require('../utils/cultivation');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu';

const isDryRun = process.argv.includes('--dry-run');

const narrativeToSystemMapping = {
    'Mortal': { realm: 'Fondasi Fana (Mortal Foundation)', stage: 0 },
    'Fana': { realm: 'Fondasi Fana (Mortal Foundation)', stage: 0 },
    'Qi Condensation': { realm: 'Pemurnian Qi (Qi Refining)', stage: 1 },
    'Qi Refining': { realm: 'Pemurnian Qi (Qi Refining)', stage: 1 },
    'Pemurnian Qi': { realm: 'Pemurnian Qi (Qi Refining)', stage: 1 },
    'Foundation Establishment': { realm: 'Pembentukan Fondasi (Foundation Establishment)', stage: 1 },
    'Pembentukan Fondasi': { realm: 'Pembentukan Fondasi (Foundation Establishment)', stage: 1 },
    'Foundation': { realm: 'Pembentukan Fondasi (Foundation Establishment)', stage: 1 },
    'Core Formation': { realm: 'Pembentukan Inti (Core Formation)', stage: 1 },
    'Pembentukan Inti': { realm: 'Pembentukan Inti (Core Formation)', stage: 1 },
    'Inti': { realm: 'Pembentukan Inti (Core Formation)', stage: 1 },
    'Nascent Soul': { realm: 'Roh Bayi (Nascent Soul)', stage: 1 },
    'Roh Bayi': { realm: 'Roh Bayi (Nascent Soul)', stage: 1 },
    'Nascent': { realm: 'Roh Bayi (Nascent Soul)', stage: 1 },
    'Soul Transformation': { realm: 'Transformasi Roh (Soul Transformation)', stage: 1 },
    'Transformasi Roh': { realm: 'Transformasi Roh (Soul Transformation)', stage: 1 },
    'Void Severing': { realm: 'Pemutus Kehampaan (Void Severing)', stage: 1 },
    'Pemutus Kehampaan': { realm: 'Pemutus Kehampaan (Void Severing)', stage: 1 },
    'Tribulation Crossing': { realm: 'Penerobosan Tribulasi (Tribulation Crossing) ⚡', stage: 1 },
    'Penerobosan Tribulasi': { realm: 'Penerobosan Tribulasi (Tribulation Crossing) ⚡', stage: 1 },
    'Immortal Ascension': { realm: 'Kenaikan Abadi (Immortal Ascension)', stage: 1 },
    'Kenaikan Abadi': { realm: 'Kenaikan Abadi (Immortal Ascension)', stage: 1 }
};

async function migrate() {
    try {
        console.log(`Menghubungkan ke database: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);
        console.log('Koneksi berhasil.');

        if (isDryRun) {
            console.log('--- MODE DRY-RUN AKTIF. TIDAK ADA PERUBAHAN YANG DISIMPAN KE DATABASE ---');
        }

        const players = await Player.find({});
        console.log(`Ditemukan ${players.length} player di database.`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const player of players) {
            try {
                // Skip if systemCultivation already has progress
                if (
                    player.systemCultivation &&
                    (
                        player.systemCultivation.realm !== 'Fondasi Fana (Mortal Foundation)' ||
                        player.systemCultivation.stage > 0 ||
                        player.systemCultivation.qi > 0
                    )
                ) {
                    skippedCount++;
                    continue;
                }

                // Skip if narrative realm is just Mortal (default)
                if (!player.realm || player.realm === 'Mortal' || player.realm.toLowerCase() === 'mortal' || player.realm.toLowerCase() === 'fana') {
                    skippedCount++;
                    continue;
                }

                // Simple heuristic mapping
                let mappedRealm = 'Pemurnian Qi (Qi Refining)';
                let mappedStage = 1;

                const narrativeRealm = player.realm;
                const narrativeStage = player.stage || '-';

                // Coba cocokkan dengan nama realm terdekat (kasar)
                if (narrativeToSystemMapping[narrativeRealm]) {
                    mappedRealm = narrativeToSystemMapping[narrativeRealm].realm;
                    mappedStage = narrativeToSystemMapping[narrativeRealm].stage;
                } else {
                    // Fallback search
                    const lowerRealm = narrativeRealm.toLowerCase();
                    for (const [key, val] of Object.entries(narrativeToSystemMapping)) {
                        if (lowerRealm.includes(key.toLowerCase())) {
                            mappedRealm = val.realm;
                            mappedStage = val.stage;
                            break;
                        }
                    }
                }

                // Coba tentukan stage dari narrative
                const lowerStage = narrativeStage.toLowerCase();
                const numericMatch = lowerStage.match(/\d+/);

                if (numericMatch) {
                    mappedStage = Math.max(1, Math.min(9, parseInt(numericMatch[0], 10)));
                } else if (lowerStage.includes('awal') || lowerStage.includes('early')) {
                    mappedStage = 2; // 1-3
                } else if (lowerStage.includes('menengah') || lowerStage.includes('mid')) {
                    mappedStage = 5; // 4-6
                } else if (lowerStage.includes('akhir') || lowerStage.includes('late')) {
                    mappedStage = 7; // 7-8
                } else if (lowerStage.includes('puncak') || lowerStage.includes('peak')) {
                    mappedStage = 9; // 9
                }

                console.log(`Migrasi: [${player.characterName}] ${player.realm} (${player.stage}) -> ${mappedRealm} (Tahap ${mappedStage})`);

                player.systemCultivation = {
                    realm: mappedRealm,
                    stage: mappedStage,
                    qi: 0,
                    lastSyncAt: new Date(),
                    isFlawedFoundation: false
                };

                if (!isDryRun) {
                    player.markModified('systemCultivation');
                    await player.save();
                }

                migratedCount++;

            } catch (err) {
                console.error(`Gagal memigrasi player ${player.discordId} (${player.characterName}):`, err);
                errorCount++;
            }
        }

        console.log('\n--- RINGKASAN MIGRASI ---');
        console.log(`Total Player  : ${players.length}`);
        console.log(`Berhasil Migrasi : ${migratedCount}`);
        console.log(`Di-skip (sudah sistem) : ${skippedCount}`);
        console.log(`Error         : ${errorCount}`);
        console.log('-------------------------\n');

    } catch (error) {
        console.error('Koneksi atau proses gagal:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Koneksi ditutup.');
    }
}

migrate();
