/**
 * Realm & Law English Localization Utilities
 * Memastikan tampilan ranah menggunakan nama bahasa Inggris profesional Tale of Immortal.
 */

export const STANDARD_REALMS_EN: Record<string, string> = {
  'fondasi fana': 'Mortal Foundation',
  'mortal': 'Mortal Realm',
  'pemurnian qi': 'Qi Condensation',
  'qi refining': 'Qi Refining',
  'pembangunan fondasi': 'Foundation Establishment',
  'foundation building': 'Foundation Establishment',
  'inti emas': 'Core Formation',
  'golden core': 'Core Formation',
  'jiwa baru lahir': 'Nascent Soul',
  'nascent soul': 'Nascent Soul',
  'pembentukan sukma': 'Soul Transformation',
  'soul formation': 'Soul Transformation',
  'penyatuan hampa': 'Void Refinement',
  'void tribulation': 'Void Refinement',
  'mahayana': 'Great Ascension',
  'true immortal': 'True Immortal'
};

export const LAW_RANK_NAMES_EN: Record<string, string[]> = {
  element_phoenix_fire: [
    'Flickering Spark',
    'Kindling Flame',
    'Young Phoenix Wing',
    'First Nirvana',
    'Awakened Phoenix Blaze',
    'Core Magma Soul',
    'Crown of Celestial Fire',
    'Immortal Firebird',
    'Apex Phoenix Primordial'
  ],
  element_azure_water: [
    'Morning Dewdrop',
    'Silver Stream',
    'Azure Ocean Tide',
    'Rushing Dragon Current',
    'Pure Ocean Heart',
    'Frozen Soul Glacier',
    'Abyssal Maelstrom',
    'Bottomless Celestial Sea',
    'Perfect Azure Dragon'
  ],
  element_xuanwu_earth: [
    'Bedrock Pebble',
    'Solid Clay',
    'Unyielding Granite',
    'Earthsteel Cliff',
    'Volcanic Core',
    'Great Tectonic Plate',
    'Leyline Sovereign',
    'Ancient Xuanwu Carapace',
    'Perfect Xuanwu'
  ],
  element_qingdi_wood: [
    'First Sprout',
    'Wild Grass Root',
    'Iron Bamboo Spire',
    'Gnarled Ancient Tree',
    'Living Primeval Forest',
    'World Tree Nexus',
    'Blossoming Tree of Life',
    'Celestial Canopy',
    'Verdant Sovereign (Qingdi)'
  ],
  element_roc_wind: [
    'Gentle Gale',
    'Minor Dust Whirl',
    'Prairie Gust',
    'Razor Wind Blade',
    'Sky Tempest',
    'Soaring Roc Wings',
    'Ninefold Storm',
    'Astral Hurricane',
    'Apex Ancient Roc'
  ],
  element_godthunder_light: [
    'Static Spark',
    'Fingertip Bolt',
    'Stormcloud Flash',
    'First Heavenly Thunder',
    'Azure Lightning Arc',
    'Pure Violet Thunder',
    'Seventh Divine Tribulation',
    'Ninefold Holy Lightning',
    'God of Thunder'
  ],
  body_tempering: [
    'Mortal Flesh',
    'Iron Skin',
    'Forged Steel Bones',
    'Copper Sinew',
    'Open Meridians',
    'Golden Marrow',
    'Dragon Blood Veins',
    'Indestructible Vajra Body',
    'Tyrant Primordial Body'
  ],
  gu_master: [
    'Larva Planter',
    'Hive Keeper',
    'Gu Nurturer',
    'Swarm Commander',
    'Gu Fusion Master',
    'Aperture Lord',
    'Ten Thousand Swarm Sovereign',
    'Chaos Hive Primordial',
    'Apex Gu Emperor'
  ],
  natal_artifact: [
    'Mortal Vestige',
    'Luminescent Relic',
    'Nascent Spirit Armament',
    'Heart Core Artifact',
    'Living Soul Treasure',
    'Breathing Relic',
    'Soul-Bound Primordial',
    'Celestial Sovereign Relic',
    'Perfect Natal Sovereign'
  ],
  natal_beast: [
    'Mortal Companion',
    'Lesser Spirit Beast',
    'Young Talented Familiar',
    'Ascending Spirit Beast',
    'Metamorphic Familiar',
    'Awakened Ancient Soul',
    'Celestial Winged Beast',
    'True Divine Beast',
    'Apex Primordial Deity'
  ],
  demonic_turbid_core: [
    'Turbid Qi Inhaler',
    'Beast Core Absorber',
    'Young Core Purifier',
    'Monster Aura Smelter',
    'Miasma Sovereign',
    'Dark Core Glutton',
    'Tyrant Core Eater',
    'Devouring Beast King',
    'Apex Devourer Fiend'
  ],
  demonic_blood_soul: [
    'Blood Inhaler',
    'Mortal Blood Drinker',
    'Soul Binder',
    'First Soul Banner',
    'Silent Life Reaper',
    'Rippling Blood Sea',
    'Nine Soul Master',
    'Lord of Blood Nether',
    'Apex Blood Sovereign'
  ],
  demonic_myriad_venom: [
    'Mild Toxin Licker',
    'Venom Drinker',
    'Toxin Immune Flesh',
    'Venom Sac Awakening',
    'Myriad Venom Alchemist',
    'Death-Immune Poison Body',
    'Corrosive Venom Drake',
    'Abyssal Venom Sea',
    'Apex Venom Fiend'
  ],
  demonic_abyssal_pact: [
    'Abyssal Whisperer',
    'First Pact Holder',
    'Blood Contractor',
    'Demon Vessel',
    'Fourth Seal Unlocked',
    'Abyssal Right Hand',
    'Avatar of the Void',
    'Abyss Throne Heir',
    'Apex Demon Sovereign'
  ],
  demonic_nether_darkness: [
    'Fading Shadow',
    'Thin Yin Mist',
    'Creeping Twilight',
    'Eternal Night Mantle',
    'Umbral Domain Master',
    'Nether Yin Sovereign',
    'Nine-Layer Void Walker',
    'Ancient Darkness Lord',
    'Apex Nether Monarch'
  ]
};

export interface RealmDisplayInfo {
  realmName: string;
  stageText: string;
  fullTitle: string;
}

export function getEnglishRealmDisplay(player: any): RealmDisplayInfo {
  if (!player) {
    return {
      realmName: 'Mortal Foundation',
      stageText: 'Stage 1',
      fullTitle: 'Mortal Foundation (Stage 1)'
    };
  }

  // 1. Jika player punya Law aktif
  const law = player?.cultivationLaw;
  if (law?.activeLawType && LAW_RANK_NAMES_EN[law.activeLawType]) {
    const rankIdx = Math.max(0, Math.min(8, Number(law.rank) || 0));
    const stageIdx = (Number(law.stage) || 0) + 1;
    const rankTitle = LAW_RANK_NAMES_EN[law.activeLawType][rankIdx] || 'Mortal Foundation';
    const stageText = `Stage ${stageIdx}`;
    return {
      realmName: rankTitle,
      stageText,
      fullTitle: `${rankTitle} (${stageText})`
    };
  }

  // 2. Fallback ke sistem ranah standar dalam Bahasa Inggris
  const rawRealm = (player?.systemCultivation?.realm || player?.realm || 'Fondasi Fana').toLowerCase();
  let enRealm = 'Mortal Foundation';
  for (const [key, val] of Object.entries(STANDARD_REALMS_EN)) {
    if (rawRealm.includes(key)) {
      enRealm = val;
      break;
    }
  }

  const rawStage = player?.systemCultivation?.stage ?? player?.stage;
  const stageNum = typeof rawStage === 'number' ? rawStage : (parseInt(rawStage, 10) || 1);
  const stageText = `Stage ${stageNum}`;

  return {
    realmName: enRealm,
    stageText,
    fullTitle: `${enRealm} (${stageText})`
  };
}
