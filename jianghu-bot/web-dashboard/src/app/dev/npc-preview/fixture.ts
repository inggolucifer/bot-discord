import { NpcFullProfile, NpcPlayerRelationData } from '@/types/npc';

export const NPC_FIXTURE: NpcFullProfile = {
  _id: '67cb01f99999999999999999',
  name: 'Xi Hua',
  title: 'Tetua Sekte Roh Suci',
  gender: 'female',
  race: 'human',
  description: 'Tetua terkemuka dari Sekte Roh Suci Cabang Yun Mo dengan aura batin agung dan pedang hijau giok.',
  regionSlug: 'tianyuan_world_map',
  settlementName: 'Kota Yun Mo',
  buildingName: 'Balai Sekte Roh Suci',
  sectName: 'Sekte Roh Suci Cabang Yun Mo',
  reputation: 24146,
  interests: ['Bambu', 'Seruling Xiao'],
  portraitUrl: '/assets/npc/xihua_standing_perfect.png',
  imageUrl: '/assets/npc/xihua_standing_perfect.png',
  greeting: 'Salam rekan pendekar. Angin dingin berhembus lembut di puncak pegunungan hari ini.',
  personality: {
    primary: 'righteous',
    secondary: 'free_spirited',
    morality: 75,
    temperament: 60
  },
  dao: {
    traits: ['sword_heart', 'frost_essence'],
    comprehensionLevel: 6,
    heartState: 'serene'
  },
  destiny: {
    innate: ['dual_talents', 'aniseed_bean', 'intelligent'],
    acquired: ['unobstructed']
  },
  lifespan: {
    currentAge: 380,
    maxAge: 810,
    isImmortal: false,
    deathTimestamp: null
  },
  attributes: {
    hp: 100,
    maxHp: 100,
    attack: 586,
    defense: 355,
    agility: 406,
    vitality: 9863,
    maxVitality: 11435,
    energy: 1782,
    maxEnergy: 1985,
    focus: 1866,
    maxFocus: 2137,
    luck: 100,
    insight: 150,
    critRate: 666,
    critRes: 587,
    critDmg: 522,
    critDr: 329,
    travelSpeed: 1300,
    martialRes: 116,
    spiritualRes: 135,
    mood: 70,
    stamina: 33,
    charisma: 95,
    roots: {
      fire: 311,
      water: 108,
      lightning: 76,
      wind: 247,
      earth: 117,
      wood: 91
    },
    kungfuSkills: {
      blade: 34,
      spear: 172,
      sword: 210,
      fist: 53,
      palm: 297,
      finger: 157
    },
    professions: {
      alchemy: 173,
      smithing: 37,
      farming: 60,
      mining: 20,
      fishing: 15,
      cooking: 45,
      talismans: 26,
      fengshui: 38
    }
  },
  cultivation: {
    realmIndex: 4,
    stage: 9,
    realmName: 'Nascent Soul (VI) Akhir',
    stageLabel: 'Tingkat 9',
    exp: 45000,
    breakthroughRate: 0.85,
    bottlenecks: false
  },
  schedule: {
    currentAnchorId: 'yunmo_city',
    currentFacility: 'sect_hall',
    homeAnchorId: 'yunmo_city',
    tileX: 2500,
    tileY: 2500,
    activityState: 'idle'
  },
  vitalStatus: {
    isAlive: true,
    isInjured: false,
    isEssential: true,
    essentialRole: 'elder'
  },
  inventory: [
    {
      itemId: 'inv_item_sword_01',
      name: 'Pedang Bintang Giok Hijau',
      category: 'weapon',
      quantity: 1,
      equippedSlot: 'weapon',
      qualityTier: 'rare'
    },
    {
      itemId: 'inv_item_pill_01',
      name: 'Pil Teratai Salju Surgawi',
      category: 'pill',
      quantity: 3,
      qualityTier: 'rare'
    }
  ],
  social: {
    role: 'elder',
    familyId: null,
    sectId: 'sect_yunmo_branch',
    sectRank: 'Tetua',
    masterId: null,
    apprentices: [],
    partnerId: null,
    swornBrothers: []
  }
};

export const RELATION_FIXTURE: NpcPlayerRelationData = {
  affinity: 15,
  affinityStage: 'neutral',
  stage: 'neutral',
  interactionCountDaily: {
    chat: 1,
    gift: 0,
    spar: 0,
    date: '2026-11-09'
  },
  specialStatus: {
    isDaoCompanion: false,
    isMaster: false,
    isApprentice: false,
    isSwornSibling: false
  },
  history: [
    {
      timestamp: new Date().toISOString(),
      action: 'greeting',
      delta: 0,
      note: 'Bertemu di Balai Sekte Roh Suci.'
    }
  ]
};
