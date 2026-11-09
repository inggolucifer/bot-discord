/**
 * Deterministic Living NPC Generator for Jianghu Bot V27
 * Pure Mulberry32 PRNG. Zero Math.random().
 */

const fs = require('fs');
const path = require('path');
const { makeRng, rangeInt, pickOne, pickWeighted, shuffle } = require('../utils/npcRng');
const { computeNpcAttributes, computeNpcMaxLifespan, getWorldData } = require('../utils/npcStats');

let surnamesCache = null;
let givenNamesCache = null;

function getNameData() {
  if (!surnamesCache) {
    const worldDataDir = path.resolve(__dirname, '../world-data');
    surnamesCache = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'npc-surnames-v27.json'), 'utf-8'));
    givenNamesCache = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'npc-given-names-v27.json'), 'utf-8'));
  }
  return { surnames: surnamesCache, givenNames: givenNamesCache };
}

const ROLE_PROFILES = {
  innkeeper: {
    titles: ['Pemilik Penginapan', 'Tuan Tanah Penginapan', 'Penjaga Losmen'],
    preferredPersonalities: ['pragmatic', 'honest', 'free_spirited'],
    defaultFacility: 'inn',
    professions: { cooking: 20 },
    starterItems: [
      { name: 'Arak Beras Fermentasi', category: 'wine', quantity: 5, qualityTier: 'common' },
      { name: 'Kunci Kamar Penginapan', category: 'misc', quantity: 1, qualityTier: 'common' }
    ]
  },
  blacksmith: {
    titles: ['Pandai Besi', 'Empu Tempa', 'Tukang Senjata'],
    preferredPersonalities: ['honest', 'righteous', 'pragmatic'],
    defaultFacility: 'workshop',
    professions: { smithing: 30, mining: 15 },
    starterItems: [
      { name: 'Palu Besi Tempa', category: 'weapon', quantity: 1, equippedSlot: 'weapon', qualityTier: 'common' },
      { name: 'Bijih Besi Kasar', category: 'material', quantity: 10, qualityTier: 'common' }
    ]
  },
  alchemist: {
    titles: ['Tabib Pemukiman', 'Ahli Ramuan Roh', 'Alkemis Herbal'],
    preferredPersonalities: ['righteous', 'honest', 'aloof'],
    defaultFacility: 'market',
    professions: { alchemy: 30, farming: 20 },
    starterItems: [
      { name: 'Pil Pemulih Darah Rendah', category: 'pill', quantity: 3, qualityTier: 'common' },
      { name: 'Herba Roh Daun Giok', category: 'herb', quantity: 5, qualityTier: 'common' }
    ]
  },
  guard: {
    titles: ['Penjaga Gerbang', 'Kapten Pengawal', 'Pendekar Penjaga'],
    preferredPersonalities: ['righteous', 'honest', 'ruthless'],
    defaultFacility: 'gate',
    professions: {},
    starterItems: [
      { name: 'Tombak Penjaga Besi', category: 'weapon', quantity: 1, equippedSlot: 'weapon', qualityTier: 'common' },
      { name: 'Zirah Kulit Serigala', category: 'armor', quantity: 1, equippedSlot: 'chest', qualityTier: 'common' }
    ]
  },
  cultivator: {
    titles: ['Pengelana Bebas', 'Pendekar Mandiri', 'Murid Kelana'],
    preferredPersonalities: ['free_spirited', 'aloof', 'ambitious', 'eccentric'],
    defaultFacility: 'tavern',
    professions: {},
    starterItems: [
      { name: 'Pedang Baja Tempa', category: 'weapon', quantity: 1, equippedSlot: 'weapon', qualityTier: 'common' },
      { name: 'Jubah Sutra Pengelana', category: 'armor', quantity: 1, equippedSlot: 'chest', qualityTier: 'common' }
    ]
  },
  sect_disciple: {
    titles: ['Murid Luar Sekte', 'Murid Dalam Sekte', 'Murid Inti'],
    preferredPersonalities: ['righteous', 'ambitious', 'aloof'],
    defaultFacility: 'sect_hall',
    professions: {},
    starterItems: [
      { name: 'Pedang Lambang Sekte', category: 'weapon', quantity: 1, equippedSlot: 'weapon', qualityTier: 'uncommon' },
      { name: 'Seragam Jubah Sekte', category: 'armor', quantity: 1, equippedSlot: 'chest', qualityTier: 'uncommon' }
    ]
  }
};

function generateDeterministicNpc(options = {}, seed = 'jianghu_npc_seed') {
  const rng = makeRng(seed);
  const { surnames, givenNames } = getNameData();
  const { traits, destinies, personalities } = getWorldData();

  // 1. Gender & Name
  const gender = options.gender || (rng() < 0.52 ? 'male' : 'female');
  let fullName = options.name;

  if (!fullName) {
    const surnameObj = options.surname
      ? { pinyin: options.surname }
      : pickWeighted(rng, surnames, (s) => s.weight);
    const surname = surnameObj ? surnameObj.pinyin : 'Li';

    const namePool = givenNames[gender] || givenNames.male;
    const givenName = options.givenName || pickOne(rng, namePool) || 'Qing';
    fullName = `${surname} ${givenName}`;
  }

  // 2. Role & Profile
  const role = options.role || 'cultivator';
  const roleProfile = ROLE_PROFILES[role] || ROLE_PROFILES.cultivator;
  const title = options.title || pickOne(rng, roleProfile.titles);

  // 3. Cultivation Realm & Stage
  const realmIndex = options.targetRealmIndex !== undefined
    ? Math.max(0, Math.min(8, Math.floor(options.targetRealmIndex)))
    : (rng() < 0.65 ? 0 : (rng() < 0.90 ? 1 : 2));

  const stage = options.targetStage !== undefined
    ? Math.max(1, Math.min(9, Math.floor(options.targetStage)))
    : rangeInt(rng, 1, 5);

  // 4. Personality
  let primaryPersonalityId = options.personalityPrimary;
  if (!primaryPersonalityId) {
    if (roleProfile.preferredPersonalities && rng() < 0.75) {
      primaryPersonalityId = pickOne(rng, roleProfile.preferredPersonalities);
    } else {
      primaryPersonalityId = pickOne(rng, personalities).id;
    }
  }

  const primaryPDef = personalities.find(p => p.id === primaryPersonalityId) || personalities[0];
  const secondaryPersonalityId = options.personalitySecondary ||
    pickOne(rng, personalities.filter(p => p.id !== primaryPersonalityId)).id;

  const morality = rangeInt(rng, primaryPDef.moralityRange[0], primaryPDef.moralityRange[1]);
  const temperament = rangeInt(rng, primaryPDef.temperamentRange[0], primaryPDef.temperamentRange[1]);

  // 5. Dao Traits (1-3 traits depending on realm)
  const traitCount = realmIndex === 0 ? 1 : (realmIndex <= 2 ? rangeInt(rng, 1, 2) : rangeInt(rng, 2, 3));
  const shuffledTraits = shuffle(rng, traits);
  const daoTraitIds = options.daoTraits || shuffledTraits.slice(0, traitCount).map(t => t.id);

  // 6. Destinies
  const innateDestiny = options.innateDestiny || pickOne(rng, destinies.innate).id;
  const acquiredDestinies = [];
  if (realmIndex >= 1 && rng() < 0.5) {
    acquiredDestinies.push(pickOne(rng, destinies.acquired).id);
  }

  // 7. Lifespan & Age
  const maxAge = computeNpcMaxLifespan(realmIndex, daoTraitIds, [innateDestiny], acquiredDestinies);
  let minAge = 18;
  let maxPossibleAge = 40;

  if (realmIndex === 1) { minAge = 22; maxPossibleAge = 80; }
  else if (realmIndex === 2) { minAge = 35; maxPossibleAge = 160; }
  else if (realmIndex >= 3) { minAge = 60; maxPossibleAge = Math.min(maxAge - 50, 400); }

  const currentAge = options.currentAge || rangeInt(rng, minAge, Math.min(maxPossibleAge, maxAge - 5));

  // 8. Attributes
  const attributes = computeNpcAttributes({
    realmIndex,
    stage,
    personalityId: primaryPersonalityId,
    daoTraits: daoTraitIds,
    innateDestinies: [innateDestiny],
    acquiredDestinies,
    professionsInput: roleProfile.professions || {},
    kungfuSkillsInput: options.kungfuSkills || {}
  });

  // 9. Location & Schedule
  const homeAnchorId = options.anchorId || options.homeAnchorId || 'kota_canghai';
  const currentFacility = options.facility || roleProfile.defaultFacility || 'inn';
  const settlementName = options.settlementName || 'Kota Canghai';
  const regionSlug = options.regionSlug || 'donghai_coastal_plain';

  // 10. Inventory
  const inventory = options.inventory || (roleProfile.starterItems ? [...roleProfile.starterItems] : []);

  return {
    name: fullName,
    title,
    gender,
    description: options.description || `${title} dari ${settlementName}. Memiliki kepribadian ${primaryPDef.name}.`,
    regionSlug,
    settlementName,
    buildingName: currentFacility,
    portraitUrl: options.portraitUrl || '',
    imageUrl: options.imageUrl || '',
    greeting: options.greeting || `Salam, pengelana. Saya ${fullName}, ${title} di ${settlementName}.`,
    dialogLines: [],
    questIds: [],
    isActive: true,
    minRealmIndexToTalk: 0,
    zoneId: options.zoneId || 'tianyuan_world_map',
    tileX: options.tileX !== undefined ? options.tileX : 0,
    tileY: options.tileY !== undefined ? options.tileY : 0,

    personality: {
      primary: primaryPersonalityId,
      secondary: secondaryPersonalityId,
      morality,
      temperament
    },

    dao: {
      traits: daoTraitIds,
      comprehensionLevel: Math.max(1, stage),
      heartState: 'serene'
    },

    destiny: {
      innate: [innateDestiny],
      acquired: acquiredDestinies
    },

    lifespan: {
      currentAge,
      maxAge,
      deathTimestamp: null,
      isImmortal: realmIndex >= 8
    },

    attributes,
    inventory,

    cultivation: {
      realmIndex,
      stage,
      exp: 0,
      breakthroughRate: 0.5,
      bottlenecks: false
    },

    schedule: {
      currentAnchorId: homeAnchorId,
      currentFacility,
      homeAnchorId,
      tileX: options.tileX !== undefined ? options.tileX : 0,
      tileY: options.tileY !== undefined ? options.tileY : 0,
      activityState: 'idle',
      targetDestination: null
    },

    social: {
      familyId: options.familyId || null,
      sectId: options.sectId || null,
      sectRank: options.sectRank || 'none',
      masterId: options.masterId || null,
      apprentices: [],
      partnerId: options.partnerId || null,
      swornBrothers: []
    },

    vitalStatus: {
      isAlive: true,
      isInjured: false,
      injurySeverity: 0,
      isMissing: false,
      isEssential: options.isEssential || false,
      essentialRole: options.essentialRole || (options.isEssential ? role : '')
    }
  };
}

module.exports = {
  ROLE_PROFILES,
  generateDeterministicNpc,
  getNameData
};
