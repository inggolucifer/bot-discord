/**
 * Unified TypeScript Contracts for Living NPC Ecosystem (V27)
 * Defines data shapes for VN dialogue, 7-tab profile panel, and relation models.
 */

export type AffinityStage =
  | 'nemesis'
  | 'hateful'
  | 'wary'
  | 'neutral'
  | 'friendly'
  | 'close_friend'
  | 'soulmate';

export interface NpcAttributes {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  agility: number;
  vitality: number;
  energy: number;
  focus: number;
  luck: number;
  insight: number;
  critRate: number;
  critRes: number;
  critDmg: number;
  critDr?: number;
  travelSpeed: number;
  martialRes: number;
  spiritualRes: number;
  mood?: number;
  stamina?: number;
  charisma?: number;
  maxVitality?: number;
  maxEnergy?: number;
  maxFocus?: number;
  roots: {
    fire: number;
    water: number;
    lightning: number;
    wind: number;
    earth: number;
    wood: number;
  };
  kungfuSkills: {
    blade: number;
    spear: number;
    sword: number;
    fist: number;
    palm: number;
    finger: number;
  };
  professions: {
    alchemy: number;
    smithing: number;
    farming: number;
    mining: number;
    fishing: number;
    cooking: number;
    talismans: number;
    fengshui?: number;
  };
}

export interface NpcInventoryItem {
  itemId?: string;
  name: string;
  category: string;
  quantity: number;
  equippedSlot?: string | null;
  qualityTier?: string;
}

export interface NpcPlayerRelationData {
  affinity: number;
  affinityStage: AffinityStage;
  stage?: AffinityStage;
  interactionCountDaily: {
    chat: number;
    gift: number;
    spar: number;
    date: string;
  };
  specialStatus: {
    isDaoCompanion?: boolean;
    isMaster?: boolean;
    isApprentice?: boolean;
    isSwornSibling?: boolean;
  };
  history: Array<{
    timestamp: string | Date;
    action: string;
    delta: number;
    note: string;
  }>;
}

export interface NpcFullProfile {
  _id: string;
  name: string;
  title: string;
  gender: 'male' | 'female' | 'neutral';
  race?: string;
  description: string;
  regionSlug: string;
  settlementName: string;
  buildingName: string;
  sectName?: string;
  reputation?: number;
  interests?: string[];
  portraitUrl?: string | null;
  imageUrl?: string | null;
  greeting?: string;
  personality: {
    primary: string;
    secondary: string;
    morality: number;
    temperament: number;
  };
  dao: {
    traits: string[];
    comprehensionLevel: number;
    heartState: string;
  };
  destiny: {
    innate: string[];
    acquired: string[];
  };
  lifespan: {
    currentAge: number;
    maxAge: number;
    isImmortal?: boolean;
    deathTimestamp?: string | null;
  };
  attributes: NpcAttributes;
  cultivation: {
    realmIndex: number;
    realmName?: string;
    stageLabel?: string;
    stage: number;
    exp: number;
    breakthroughRate?: number;
    bottlenecks?: boolean;
  };
  schedule: {
    currentAnchorId: string;
    currentFacility: string;
    homeAnchorId: string;
    tileX?: number;
    tileY?: number;
    activityState: string;
  };
  vitalStatus: {
    isAlive: boolean;
    isInjured?: boolean;
    isEssential?: boolean;
    essentialRole?: string;
  };
  inventory: NpcInventoryItem[];
  social: {
    role?: string;
    familyId?: string | null;
    sectId?: string | null;
    sectRank?: string;
    masterId?: string | null;
    apprentices?: string[];
    partnerId?: string | null;
    swornBrothers?: string[];
  };
}

export interface DialogueChoice {
  id: string;
  label: string;
  icon: string;
  actionType: string;
  category: 'social' | 'gift' | 'martial' | 'special' | 'intrigue';
  disabled?: boolean;
  disabledReason?: string;
}

export interface DialogueHistoryEntry {
  id: string;
  speaker: 'npc' | 'player';
  text: string;
  timestamp: number;
}
