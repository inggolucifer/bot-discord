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
  element_phoenix_fire:     ['Ember Initiate', 'Kindling Flame', 'Young Firewings', 'First Nirvana', 'Rising Phoenix Blaze', 'Inner Magma Heart', 'Celestial Flame Crown', 'Eternal Firebird', 'Perfected Phoenix'],
  element_azure_water:      ['Dewdrop Initiate', 'Silver Stream', 'Blue Sea Wave', 'Dragon Current', 'Clear Inner Ocean', 'Frozen Soul Glacier', 'Abyssal Maelstrom', 'Bottomless Sky Sea', 'Perfected Azure Dragon'],
  element_xuanwu_earth:     ['Pebble Initiate', 'Hardened Clay', 'Coral Bastion', 'Steel Cliff', 'Volcanic Core', 'Continental Plate', 'Leyline Foundation', 'Primordial Xuanwu Shell', 'Perfected Xuanwu'],
  element_qingdi_wood:      ['Sprout Initiate', 'Wildgrass Roots', 'Bamboo Trunk', 'Ancient Gnarled Tree', 'Living Wildwood', 'Worldroot Nexus', 'Flowering Tree of Life', 'Heaven-Canopy Grove', 'Perfected Green Emperor'],
  element_roc_wind:         ['Breeze Initiate', 'Dust Spiral', 'Gale of the Plains', 'Razor Tempest', 'Storm of the Firmament', 'Roc Wings Unfurled', 'Nine Heavens Tornado', 'Astral Boundary Wind', 'Perfected Ancient Roc'],
  element_godthunder_light: ['Static Initiate', 'Finger Lightning', 'Blackcloud Strike', 'First Heavenbolt', 'Blue Chain Lightning', 'Pure Violet Thunder', "Seventh Heaven's Judgment", 'Nine Sacred Bolts', 'Perfected Thunder God'],
  body_tempering:           ['Common Skin Initiate', 'Hardened Flesh', 'Ironbone Temper', 'Steel-Wire Muscle', 'Open Meridians', 'Pure Golden Organs', 'Dragonblood Flow', 'Vajra Impervious Body', 'Perfected Physique'],
  gu_master:                ['Worm Planter Initiate', 'Early Nest Keeper', 'Young Gu Breeder', 'Colony Controller', 'Gu Fusion Master', 'Aperture King', 'Lord of Ten Thousand', 'Primordial Chaos Cavity', 'Perfected Gu'],
  natal_artifact:           ['Mundane Vessel Initiate', 'Glimmering Relic', 'Young Spirit Weapon', 'Inner Core Artifact', 'Living Inner Relic', 'Breathing Relic', 'Soulbound Weapon', 'Heavenly Relic', 'Perfected Relic'],
  natal_beast:              ['Mundane Cub Initiate', 'Minor Spirit Beast', 'Gifted Young Beast', 'Growing Spirit Tiger', 'Metamorphic Beast', 'Awakened Ancient Spirit', 'Skyborne Spirit Beast', 'True Spirit Dragon', 'Perfected Spirit Beast'],
  demonic_turbid_core:      ['Faint Miasma Initiate', 'Filth Core Absorber', 'Young Core Purger', 'Beast Aura Smelter', 'Miasma Sovereign', 'Black Haze Devourer', 'Dark Core Tyrant', 'Beast-Core Demon King', 'Perfected Core Demon'],
  demonic_blood_soul:       ['Blood Sip Initiate', 'Mortal Blood Drinker', 'Weak Soul Binder', 'First Soul Banner', 'Silent Lifetaker', 'Surging Blood Sea', 'Nine-Soul Overlord', 'Blood Hell King', 'Perfected Blood Demon'],
  demonic_myriad_venom:     ['Mild Venom Initiate', 'Diluted Poison Drinker', 'Toxin-Tolerant Flesh', 'Venom Sac Formed', 'Thousandfold Venom', 'Death-Immune Flesh', 'Corrosive Venom Dragon', 'Annihilating Venom Sea', 'Perfected Venom Demon'],
  demonic_abyssal_pact:     ['Faint Whisper Initiate', 'First Contract', 'Blood Covenant', 'Young Demon Vessel', 'Fourth Seal Opened', "Demon's Right Hand", 'Abyss Incarnate', 'Abyssal Throne Heir', 'Perfected Pact Demon'],
  demonic_nether_darkness:  ['Fading Shadow Initiate', 'Thin Yin Mist', 'Creeping Dark', 'Eternal Night Cloak', 'Shadow Domain', 'Nether Yin Lord', 'Nine-Layer Void', 'Ancient Darkness King', 'Perfected Nether Demon'],
  righteous_heavenly_merit: ['Kindness Initiate', 'Merit Acolyte', 'Radiant Virtue', 'Early Heavenly Merit', 'Dharma Guardian', 'Inner Merit of Virtue', 'Sacred Crown of Virtue', 'Avatar of Heavenly Merit', 'Perfected Great Merit'],
  righteous_pure_yang:      ['Pure Yang Initiate', 'Dawn Breath', 'True Yang Flame', 'Pure Golden Blood', 'Untainted Yang Body', 'Inner Sun', 'Primordial Yang Light', 'Heavenly Yang Sovereign', 'Perfected Eternal Yang'],
  righteous_sword_heart:    ['Sword Intent Initiate', 'Steel Edge', 'Clear Blade Flash', 'United Sword Heart', 'Spirit Flying Blade', 'Lord of Nine Swords', 'Domain of a Thousand Blades', 'Primordial Ancient Sword', 'Perfected Sword God'],
  righteous_formation_array:['Banner Initiate', 'Basic Grid Pattern', 'Eight-Direction Seal', 'Firm Array Foundation', 'Leyline Controller', 'Grand Formation Domain', 'Star Matrix of Heaven', 'Primordial World Seal', 'Perfected Formation Master'],
  righteous_karmic_mirror:  ['Clear Reflection Initiate', 'Dustless Mirror', 'First Karmic Gleam', 'Cause-and-Effect Sight', 'Clear Heart Mirror', "Judge of Fate's Threads", 'Eye of Karmic Law', 'Flawless Heaven Mirror', 'Perfected Great Karma']
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
