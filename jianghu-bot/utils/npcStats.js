/**
 * Pure Deterministic Attribute Calculator for Jianghu Bot Living NPCs (V27)
 * Authoritative 5-Pillar framework with Zero-Decimal policy (all integers).
 */

const fs = require('fs');
const path = require('path');

// Safe lazy loading of static world-data
let traitsCache = null;
let destiniesCache = null;
let personalitiesCache = null;

function getWorldData() {
  if (!traitsCache) {
    const worldDataDir = path.resolve(__dirname, '../world-data');
    traitsCache = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'npc-dao-traits-v27.json'), 'utf-8'));
    destiniesCache = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'npc-destinies-v27.json'), 'utf-8'));
    personalitiesCache = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'npc-personalities-v27.json'), 'utf-8'));
  }
  return { traits: traitsCache, destinies: destiniesCache, personalities: personalitiesCache };
}

const REALM_BASE_LIFESPAN = [
  100,    // 0: Mortal Foundation
  150,    // 1: Qi Refining
  250,    // 2: Foundation Establishment
  500,    // 3: Core Formation
  1000,   // 4: Nascent Soul
  2000,   // 5: Soul Transformation
  5000,   // 6: Void Severing
  10000,  // 7: Tribulation Crossing
  99999   // 8: Immortal Ascension
];

function computeNpcMaxLifespan(realmIndex = 0, daoTraits = [], innateDestinies = [], acquiredDestinies = []) {
  const safeRealm = Math.max(0, Math.min(8, Math.floor(realmIndex)));
  let maxAge = REALM_BASE_LIFESPAN[safeRealm] || 100;

  const { destinies } = getWorldData();
  const allDestinyDefs = [...destinies.innate, ...destinies.acquired];

  const allDestinyIds = [...(innateDestinies || []), ...(acquiredDestinies || [])];
  for (const id of allDestinyIds) {
    const def = allDestinyDefs.find(d => d.id === id);
    if (def && def.statModifiers && def.statModifiers.lifespanBonus) {
      maxAge += def.statModifiers.lifespanBonus;
    }
  }

  return Math.floor(maxAge);
}

function computeNpcAttributes({
  realmIndex = 0,
  stage = 1,
  personalityId = 'righteous',
  daoTraits = [],
  innateDestinies = [],
  acquiredDestinies = [],
  professionsInput = {},
  kungfuSkillsInput = {}
} = {}) {
  const { traits, destinies } = getWorldData();
  const r = Math.max(0, Math.min(8, Math.floor(realmIndex)));
  const s = Math.max(1, Math.min(10, Math.floor(stage)));

  // Base Scaled Stats
  let hp = 100 * (1 + r * 2.5) + (s - 1) * 20;
  let attack = 15 * (1 + r * 2.0) + (s - 1) * 4;
  let defense = 10 * (1 + r * 1.8) + (s - 1) * 3;
  let agility = 10 * (1 + r * 1.5) + (s - 1) * 2;
  let vitality = 100 + r * 50;
  let energy = 100 + r * 80 + (s - 1) * 15;
  let focus = 10 + r * 5;
  let luck = 10;
  let insight = 10 + r * 3;
  let critRate = 5;
  let critRes = 0;
  let critDmg = 150;
  let travelSpeed = 10;
  let martialRes = r * 3;
  let spiritualRes = r * 3;

  const roots = {
    fire: 0,
    water: 0,
    lightning: 0,
    wind: 0,
    earth: 0,
    wood: 0
  };

  const kungfuSkills = {
    blade: kungfuSkillsInput.blade || 0,
    spear: kungfuSkillsInput.spear || 0,
    sword: kungfuSkillsInput.sword || 0,
    fist: kungfuSkillsInput.fist || 0,
    palm: kungfuSkillsInput.palm || 0,
    finger: kungfuSkillsInput.finger || 0
  };

  const professions = {
    alchemy: professionsInput.alchemy || 0,
    smithing: professionsInput.smithing || 0,
    farming: professionsInput.farming || 0,
    mining: professionsInput.mining || 0,
    fishing: professionsInput.fishing || 0,
    cooking: professionsInput.cooking || 0,
    talismans: professionsInput.talismans || 0
  };

  // Apply Dao Traits
  for (const traitId of daoTraits) {
    const def = traits.find(t => t.id === traitId);
    if (!def) continue;

    if (def.statModifiers) {
      if (def.statModifiers.hp) hp += def.statModifiers.hp;
      if (def.statModifiers.attack) attack += def.statModifiers.attack;
      if (def.statModifiers.defense) defense += def.statModifiers.defense;
      if (def.statModifiers.agility) agility += def.statModifiers.agility;
      if (def.statModifiers.vitality) vitality += def.statModifiers.vitality;
      if (def.statModifiers.focus) focus += def.statModifiers.focus;
      if (def.statModifiers.insight) insight += def.statModifiers.insight;
      if (def.statModifiers.critRate) critRate += def.statModifiers.critRate;
      if (def.statModifiers.critDmg) critDmg += def.statModifiers.critDmg;
      if (def.statModifiers.critRes) critRes += def.statModifiers.critRes;
      if (def.statModifiers.travelSpeed) travelSpeed += def.statModifiers.travelSpeed;
      if (def.statModifiers.martialRes) martialRes += def.statModifiers.martialRes;
      if (def.statModifiers.spiritualRes) spiritualRes += def.statModifiers.spiritualRes;
    }

    if (def.rootAffinities) {
      for (const [element, val] of Object.entries(def.rootAffinities)) {
        if (roots[element] !== undefined) {
          roots[element] += val;
        }
      }
    }
  }

  // Apply Destinies
  const allDestinyDefs = [...destinies.innate, ...destinies.acquired];
  const allDestinyIds = [...(innateDestinies || []), ...(acquiredDestinies || [])];
  for (const destId of allDestinyIds) {
    const def = allDestinyDefs.find(d => d.id === destId);
    if (!def || !def.statModifiers) continue;

    const m = def.statModifiers;
    if (m.hp) hp += m.hp;
    if (m.attack) attack += m.attack;
    if (m.defense) defense += m.defense;
    if (m.agility) agility += m.agility;
    if (m.vitality) vitality += m.vitality;
    if (m.focus) focus += m.focus;
    if (m.luck) luck += m.luck;
    if (m.insight) insight += m.insight;
    if (m.critRate) critRate += m.critRate;
    if (m.critDmg) critDmg += m.critDmg;
    if (m.critRes) critRes += m.critRes;
    if (m.martialRes) martialRes += m.martialRes;
    if (m.spiritualRes) spiritualRes += m.spiritualRes;
  }

  // Integer Sanitization (Zero Decimal Policy)
  return {
    hp: Math.max(1, Math.floor(hp)),
    maxHp: Math.max(1, Math.floor(hp)),
    attack: Math.max(1, Math.floor(attack)),
    defense: Math.max(0, Math.floor(defense)),
    agility: Math.max(1, Math.floor(agility)),
    vitality: Math.max(1, Math.floor(vitality)),
    energy: Math.max(1, Math.floor(energy)),
    focus: Math.max(1, Math.floor(focus)),
    luck: Math.max(0, Math.floor(luck)),
    insight: Math.max(1, Math.floor(insight)),
    critRate: Math.max(0, Math.min(100, Math.floor(critRate))),
    critRes: Math.max(0, Math.floor(critRes)),
    critDmg: Math.max(100, Math.floor(critDmg)),
    travelSpeed: Math.max(1, Math.floor(travelSpeed)),
    martialRes: Math.max(0, Math.floor(martialRes)),
    spiritualRes: Math.max(0, Math.floor(spiritualRes)),
    roots: {
      fire: Math.max(0, Math.floor(roots.fire)),
      water: Math.max(0, Math.floor(roots.water)),
      lightning: Math.max(0, Math.floor(roots.lightning)),
      wind: Math.max(0, Math.floor(roots.wind)),
      earth: Math.max(0, Math.floor(roots.earth)),
      wood: Math.max(0, Math.floor(roots.wood))
    },
    kungfuSkills: {
      blade: Math.max(0, Math.floor(kungfuSkills.blade)),
      spear: Math.max(0, Math.floor(kungfuSkills.spear)),
      sword: Math.max(0, Math.floor(kungfuSkills.sword)),
      fist: Math.max(0, Math.floor(kungfuSkills.fist)),
      palm: Math.max(0, Math.floor(kungfuSkills.palm)),
      finger: Math.max(0, Math.floor(kungfuSkills.finger))
    },
    professions: {
      alchemy: Math.max(0, Math.floor(professions.alchemy)),
      smithing: Math.max(0, Math.floor(professions.smithing)),
      farming: Math.max(0, Math.floor(professions.farming)),
      mining: Math.max(0, Math.floor(professions.mining)),
      fishing: Math.max(0, Math.floor(professions.fishing)),
      cooking: Math.max(0, Math.floor(professions.cooking)),
      talismans: Math.max(0, Math.floor(professions.talismans))
    }
  };
}

module.exports = {
  REALM_BASE_LIFESPAN,
  computeNpcMaxLifespan,
  computeNpcAttributes,
  getWorldData
};
