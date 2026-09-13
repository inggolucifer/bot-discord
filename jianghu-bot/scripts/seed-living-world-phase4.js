const mongoose = require('mongoose');
const { parseArgs } = require('util');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Sect = require('../models/Sect');
const Location = require('../models/Location');
const AdminLog = require('../models/AdminLog');
const { disconnectDB } = require('../web-api/utils/dbTransaction');

const args = parseArgs({
  options: {
    guildId: {
      type: 'string',
    },
    'dry-run': {
      type: 'boolean',
    },
  },
});

const guildId = args.values.guildId;
const isDryRun = args.values['dry-run'] || false;

if (!guildId) {
  console.error("❌ Tolong sertakan --guildId=<id>");
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jianghu';

const testSects = [
  {
    name: 'Heavenly Sword Pavilion',
    description: 'Sekte pedang suci peninggalan era kuno yang mengutamakan ketajaman jiwa.',
    exam: {
      enabled: true,
      type: 'combat',
      minRealmIndex: 1, // Require Pengembara (Qi Condensation)
      guardianStatBlock: {
        hp: 350,
        atk: 50,
        def: 25,
        spd: 30,
        name: 'Murid Penjaga Gerbang'
      },
      cooldownHours: 24
    },
    locationData: {
      regionSlug: 'central_plains',
      settlementName: 'Tianjing City',
      buildingName: 'Paviliun Pedang Langit',
      buildingType: 'sect_hall',
    }
  },
  {
    name: 'Dojo Bunga Aprikot',
    description: 'Dojo kecil di pinggiran desa yang melatih seniman bela diri pemula.',
    exam: {
      enabled: true,
      type: 'trial_task',
      minRealmIndex: 0, // Mortal Foundation
      trialTask: {
        description: 'Bermeditasi di aula dojo selama 1 jam untuk menguji keteguhan hati.',
        objectiveType: 'wait_time',
        durationHours: 1
      },
      cooldownHours: 12
    },
    locationData: {
      regionSlug: 'central_plains',
      settlementName: 'Xingcun Village',
      buildingName: 'Aula Bunga Aprikot',
      buildingType: 'dojo',
    }
  }
];

async function seedPhase4() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`🔌 Terhubung ke MongoDB. Target guildId: ${guildId}. Dry-run: ${isDryRun}`);

    for (const data of testSects) {
      let sect = await Sect.findOne({ guildId, name: data.name });

      if (!sect) {
        console.log(`[i] Sect '${data.name}' tidak ditemukan. Membuat sekte baru...`);
        sect = new Sect({
          guildId,
          name: data.name,
          description: data.description,
          createdBy: 'SYSTEM_MIGRATION_SCRIPT'
        });
      }

      sect.entranceTest = { ...sect.entranceTest, ...data.exam };

      if (!isDryRun) {
        await sect.save();
        console.log(`✅ Sekte '${data.name}' ujian entranceTest dikonfigurasi.`);
      } else {
        console.log(`(Dry Run) Sekte '${data.name}' akan diupdate ujian entranceTest-nya.`);
      }

      let loc = await Location.findOne({
        guildId,
        regionSlug: data.locationData.regionSlug,
        settlementName: data.locationData.settlementName,
        buildingName: data.locationData.buildingName,
      });

      if (!loc) {
        loc = new Location({
          guildId,
          regionSlug: data.locationData.regionSlug,
          settlementName: data.locationData.settlementName,
          buildingName: data.locationData.buildingName,
          buildingType: data.locationData.buildingType,
          linkedSectId: sect._id, // link it to the newly found/created sect
          description: `Pusat pendaftaran dan ujian masuk ${data.name}.`
        });
      } else {
        loc.linkedSectId = sect._id;
      }

      if (!isDryRun) {
        await loc.save();
        console.log(`✅ Location '${loc.buildingName}' linkedSectId di-set ke '${sect.name}'.`);
      } else {
         console.log(`(Dry Run) Location '${loc.buildingName}' akan dibuat/diupdate link-nya ke '${sect.name}'.`);
      }
    }

    if (!isDryRun) {
      await AdminLog.create({
        guildId,
        adminId: 'SYSTEM_MIGRATION_SCRIPT',
        action: 'SEED_PHASE4',
        details: 'Menambahkan data ujian masuk sekte dan lokasi sect_hall/dojo terkait.'
      });
      console.log('📝 AdminLog dicatat.');
    }

    console.log('🎉 Selesai Seed FASE 4!');
  } catch (err) {
    console.error('❌ Error during seed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedPhase4();
