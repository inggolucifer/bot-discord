/**
 * NPC Profile Visibility & Cultivation Fog Engine (V28 / A5)
 * Builds a strictly whitelisted, integer-sanitized NPC profile with
 * cultivation fog masking based on player insight and realm disparity.
 */

const { getRealmName } = require('../utils/cultivation');
const { getPlayerRealmIndex } = require('./npcActions');

/**
 * Builds visible NPC profile safe for transmission to client.
 *
 * @param {Object} npc - NPC document
 * @param {Object} player - Player document
 * @param {Object} relation - NpcPlayerRelation document
 * @returns {Object} Clean whitelisted profile
 */
function buildVisibleProfile(npc, player = {}, relation = {}) {
  const affinity = relation?.affinity ?? 0;
  const playerInsight = player?.extendedStats?.insight ?? 10;
  const playerRealm = getPlayerRealmIndex(player || {});
  const npcRealmIndex = npc.cultivation?.realmIndex ?? 0;

  // 1. General Whitelisted Fields
  const profile = {
    _id: npc._id,
    name: npc.name,
    title: npc.title || 'Warga Jianghu',
    gender: npc.gender || 'male',
    description: npc.description || '',
    greeting: npc.greeting || 'Ada perlu, pengembara?',
    portraitUrl: npc.portraitUrl || null,
    imageUrl: npc.imageUrl || null,
    regionSlug: npc.regionSlug || 'wilayah_fana',
    settlementName: npc.settlementName || 'Desa Bunga Persik',
    buildingName: npc.buildingName || null
  };

  // 2. Personality (Morality & Temperament masked unless affinity >= 40)
  profile.personality = {
    primary: npc.personality?.primary || 'righteous',
    secondary: npc.personality?.secondary || 'honest'
  };
  if (affinity >= 40) {
    profile.personality.morality = Math.floor(npc.personality?.morality ?? 50);
    profile.personality.temperament = Math.floor(npc.personality?.temperament ?? 50);
  }

  // 3. Dao (Comprehension masked unless affinity >= 60)
  profile.dao = {
    traits: Array.isArray(npc.dao?.traits) ? [...npc.dao.traits] : [],
    heartState: npc.dao?.heartState || 'serene'
  };
  if (affinity >= 60) {
    profile.dao.comprehensionLevel = Math.floor(npc.dao?.comprehensionLevel ?? 1);
  }

  // 4. Destiny (Innate & Acquired revealed if affinity >= 20 or insight >= 25)
  if (affinity >= 20 || playerInsight >= 25) {
    profile.destiny = {
      innate: Array.isArray(npc.destiny?.innate) ? [...npc.destiny.innate] : [],
      acquired: Array.isArray(npc.destiny?.acquired) ? [...npc.destiny.acquired] : []
    };
  } else {
    profile.destiny = {
      innate: [],
      acquired: []
    };
  }

  // 5. Lifespan (Age revealed if insight >= 15 or affinity >= 20)
  if (playerInsight >= 15 || affinity >= 20) {
    profile.lifespan = {
      currentAge: Math.floor(npc.lifespan?.currentAge ?? 20),
      maxAge: Math.floor(npc.lifespan?.maxAge ?? 100)
    };
  } else {
    profile.lifespan = {
      currentAge: null,
      maxAge: null
    };
  }

  // 6. Cultivation Fog (npcRealm > playerRealm + 2 && insight < 30)
  const isCultivationFog = (npcRealmIndex > playerRealm + 2) && playerInsight < 30;
  if (isCultivationFog) {
    profile.cultivation = {
      realm: 'Tak Terduga',
      realmIndex: null,
      stage: null
    };
  } else {
    profile.cultivation = {
      realm: getRealmName(npcRealmIndex),
      realmIndex: npcRealmIndex,
      stage: npc.cultivation?.stage ?? 1,
      exp: npc.cultivation?.exp ?? 0
    };
  }

  // 7. Five Pillars Stats (Combat masked if realm diff >= 2 && insight < 25)
  const isCombatFog = ((npcRealmIndex >= playerRealm + 2) && playerInsight < 25) || isCultivationFog;

  profile.stats = {
    general: {
      health: Math.floor(npc.attributes?.hp ?? npc.stats?.baseHp ?? 100),
      stamina: Math.floor(npc.attributes?.stamina ?? 80),
      vitality: Math.floor(npc.extendedStats?.vitality ?? 100),
      energy: Math.floor(npc.extendedStats?.innerEnergy ?? 100),
      focus: Math.floor(npc.extendedStats?.focus ?? 100),
      luck: Math.floor(npc.extendedStats?.luck ?? 10),
      insight: Math.floor(npc.extendedStats?.insight ?? 10)
    },
    combat: isCombatFog ? null : {
      atk: Math.floor(npc.attributes?.attack ?? npc.stats?.baseAtk ?? 15),
      def: Math.floor(npc.attributes?.defense ?? npc.stats?.baseDef ?? 10),
      agility: Math.floor(npc.attributes?.agility ?? npc.extendedStats?.agility ?? 10),
      critRate: Math.floor(npc.extendedStats?.critRate || 5),
      critRes: Math.floor(npc.extendedStats?.critResist || 0),
      critDmg: Math.floor(npc.extendedStats?.critDmg || 150),
      critDr: Math.floor(npc.extendedStats?.critDmgReduce || 0),
      travelSpeed: Math.floor(npc.extendedStats?.travelSpeed || 100),
      martialRes: Math.floor(npc.extendedStats?.martialRes || 0),
      spiritualRes: Math.floor(npc.extendedStats?.spiritualRes || 0)
    },
    martialArts: {
      blade: Math.floor(npc.attributes?.kungfuSkills?.blade ?? npc.kungfuSkills?.blade ?? 0),
      spear: Math.floor(npc.attributes?.kungfuSkills?.spear ?? npc.kungfuSkills?.spear ?? 0),
      sword: Math.floor(npc.attributes?.kungfuSkills?.sword ?? npc.kungfuSkills?.sword ?? 0),
      fist: Math.floor(npc.attributes?.kungfuSkills?.fist ?? npc.kungfuSkills?.fist ?? 0),
      palm: Math.floor(npc.attributes?.kungfuSkills?.palm ?? npc.kungfuSkills?.palm ?? 0),
      finger: Math.floor(npc.attributes?.kungfuSkills?.finger ?? npc.kungfuSkills?.finger ?? 0)
    },
    spiritualRoot: {
      fire: Math.floor(npc.extendedStats?.spiritualRoot?.fire ?? npc.spiritualRoot?.fire ?? 0),
      water: Math.floor(npc.extendedStats?.spiritualRoot?.water ?? npc.spiritualRoot?.water ?? 0),
      lightning: Math.floor(npc.extendedStats?.spiritualRoot?.lightning ?? npc.spiritualRoot?.lightning ?? 0),
      wind: Math.floor(npc.extendedStats?.spiritualRoot?.wind ?? npc.spiritualRoot?.wind ?? 0),
      earth: Math.floor(npc.extendedStats?.spiritualRoot?.earth ?? npc.spiritualRoot?.earth ?? 0),
      wood: Math.floor(npc.extendedStats?.spiritualRoot?.wood ?? npc.spiritualRoot?.wood ?? 0)
    },
    artisanship: {
      alchemy: Math.floor(npc.attributes?.professions?.alchemy ?? 0),
      forge: Math.floor(npc.attributes?.professions?.smithing ?? 0),
      herbology: Math.floor(npc.attributes?.professions?.farming ?? 0),
      mining: Math.floor(npc.attributes?.professions?.mining ?? 0),
      fishing: Math.floor(npc.attributes?.professions?.fishing ?? 0),
      cooking: Math.floor(npc.attributes?.professions?.cooking ?? 0),
      talismans: Math.floor(npc.attributes?.professions?.talismans ?? 0)
    }
  };

  // 8. Inventory (Unequipped backpack items masked unless affinity >= 50 or insight >= 40)
  const canSeeFullInventory = affinity >= 50 || playerInsight >= 40;
  profile.inventory = (npc.inventory || [])
    .filter(item => canSeeFullInventory || Boolean(item.equippedSlot))
    .map(item => ({
      itemId: item.itemId || item._id,
      name: item.name,
      category: item.category || 'misc',
      quantity: item.quantity ?? 1,
      equippedSlot: item.equippedSlot || null,
      qualityTier: item.qualityTier || 'common'
    }));

  // 9. Social Whitelist (NO internal DB IDs or sensitive family refs)
  profile.social = {
    sectRank: npc.social?.sectRank || 'none'
  };

  return profile;
}

module.exports = {
  buildVisibleProfile
};
