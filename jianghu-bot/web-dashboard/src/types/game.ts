/**
 * Jianghu World / Immortal-X: Unified Game Types Contract
 * Defines all shared domain types for Player, Inventory, Cultivation, Grid Sandbox, and Assets.
 */

export type CurrencyType = 'copper' | 'silver' | 'gold' | 'jade' | 'spirit';

export interface Currency {
  copper: number;
  silver: number;
  gold: number;
  jade: number;
  spirit: number;
}

export type ItemRank = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical';

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'helmet'
  | 'pants'
  | 'boots'
  | 'herb'
  | 'pill'
  | 'consume'
  | 'material'
  | 'artifact'
  | 'accessories'
  | 'law'
  | 'manual'
  | 'tool'
  | 'mount'
  | 'none';

export interface ItemData {
  _id: string;
  name: string;
  rank: ItemRank;
  category: ItemCategory;
  tier: number;
  toolType?: 'fishing_rod' | 'furnace' | 'forge' | 'kitchen_tool' | 'farming_tool' | null;
  weaponType?: string | null;
  requiredKungfuSkill?: string | null;
  requiredKungfuLevel?: number;
  baseAtk?: number;
  baseDef?: number;
  baseHp?: number;
  baseSpd?: number;
  maxDurability?: number | null;
  description?: string;
  imageUrl?: string | null;
  effect?: string | null;
  effectType?: string | null;
  effectValue?: number | null;
  weight: number;
  capacityBonus?: number;
  mountType?: string | null;
  staminaReduction?: number;
  staminaReductionPercent?: number;
  travelSpeedBonus?: number;
  minRealmIndex?: number;
  basePrice?: number;
  priceCurrency?: CurrencyType;
}

export interface InventoryItem {
  _id: string;
  itemId: ItemData | string;
  quantity: number;
  creatorName?: string | null;
  qualityMultiplier?: number;
  durability?: number | null;
  maxDurability?: number | null;
  isEquipped?: boolean;
}

export interface EquipmentSlots {
  weapon: string | ItemData | null;
  armor: string | ItemData | null;
  helmet: string | ItemData | null;
  pants: string | ItemData | null;
  boots: string | ItemData | null;
  accessory: string | ItemData | null;
  mount?: string | ItemData | null;
}

export interface CultivationInfo {
  realm: string;
  stage: number;
  qi: number;
  lastSyncAt?: string | Date;
  isFlawedFoundation?: boolean;
}

export interface LocationInfo {
  regionSlug: string;
  settlementName: string;
  buildingName?: string | null;
  buildingType?: string | null;
}

export interface GridPosition {
  zoneId: string;
  tileX: number;
  tileY: number;
}

export type ZoneTileType =
  | 'poi'
  | 'resource_node'
  | 'buildable_plot'
  | 'npc_spawn'
  | 'dungeon_entrance'
  | 'hazard';

export interface ZoneTile {
  _id: string;
  zoneId: string;
  tileX: number;
  tileY: number;
  tileType: ZoneTileType;
  label?: string | null;
  hidden?: boolean;
  resourceType?: 'wood' | 'ore' | 'herb' | null;
  nodeRespawnAt?: string | null;
  ownerType?: 'player' | 'sect' | null;
  ownerId?: string | null;
  ownerName?: string | null;
  plotPriceSilver?: number;
  buildingName?: string | null;
  buildingImageUrl?: string | null;
  buildingType?: string | null;
  isOccupied?: boolean;
  isUnderConstruction?: boolean;
  constructionCompleteAt?: string | null;
  isOpenToPublic?: boolean;
  isPubliclyVisible?: boolean;
}

export interface SpiritualRootStats {
  fire: number;
  water: number;
  lightning: number;
  wind: number;
  earth: number;
  wood: number;
}

export interface ArtisanshipStats {
  alchemy: number;
  forge: number;
  talismans: number;
  herbology: number;
  mining: number;
}

export interface ExtendedCombatStats {
  critRate: number;
  critRes: number;
  agility: number;
  critDmg: number;
  critDr: number;
  travelSpeed: number;
  martialRes: number;
  spiritualRes: number;
}

export interface ExtendedPlayerStats {
  maxLifespan: number;
  mood: number;
  luck: number;
  insight: number;
  vitality: number;
  maxVitality: number;
  innerEnergy: number;
  maxInnerEnergy: number;
  focus: number;
  maxFocus: number;
  critRate: number;
  critResist: number;
  agility: number;
  critDmg: number;
  critDmgReduce: number;
  travelSpeed: number;
  martialRes: number;
  spiritualRes: number;
  spiritualRoot: SpiritualRootStats;
  artisanship: ArtisanshipStats;
}

export interface AlignmentData {
  righteous: number;
  demonic: number;
}

export interface CombatStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critRate?: number;
  critRes?: number;
  agility?: number;
  critDmg?: number;
  critDr?: number;
  travelSpeed?: number;
  martialRes?: number;
  spiritualRes?: number;
  dodgeRate?: number;
  damageReduction?: number;
}

export interface PlayerEnergy {
  current: number;
  lastUpdated: string | Date;
}

export interface PlayerConditions {
  poison: number;
  injury: number;
  bleed: number;
  intox: number;
  frozen: number;
  psychosis: number;
  burn: number;
  knockback: number;
}

export interface PlayerProfile {
  _id: string;
  discordId: string;
  guildId: string;
  characterName: string;
  gender: 'Pria' | 'Wanita' | 'Laki-laki' | 'Perempuan' | null;
  age: number;
  schemaVersion: number;
  level: number;
  exp: number;
  biography?: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  characterImage?: string | null;
  discordAvatar?: string | null;
  sect?: string;
  currency: Currency;
  totalWealth: number;
  systemCultivation: CultivationInfo;
  currentLocation: LocationInfo;
  gridPosition: GridPosition;
  equipment: EquipmentSlots;
  inventory?: InventoryItem[];
  conditions?: PlayerConditions;
  combatStats?: CombatStats;
  extendedStats?: ExtendedPlayerStats;
  alignment?: AlignmentData;
  destinyNature?: string[];
  destinyNurture?: string[];
  personalityTags?: string[];
  internalTraits?: string;
  externalTraits?: string;
  charisma?: string;
  interests?: string[];
  race?: string;
  reputation?: number;
  reputationTitle?: string;
  kungfuSkills?: Record<string, number>;
  manuals?: any[];
  equippedMount?: string | null;
  marriage?: any;
  energy: PlayerEnergy;
  maxEnergy: number;
  inventoryWeight: number;
  carryCapacity: number;
  hasCompletedTour?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// CULTIVATION LAW SYSTEM CONTRACTS (15 Laws × 90 Stages)
// ═══════════════════════════════════════════════════════════════

export type LawType =
  | 'element_phoenix_fire'
  | 'element_azure_water'
  | 'element_xuanwu_earth'
  | 'element_qingdi_wood'
  | 'element_roc_wind'
  | 'element_godthunder_light'
  | 'body_tempering'
  | 'gu_master'
  | 'natal_artifact'
  | 'natal_beast'
  | 'demonic_turbid_core'
  | 'demonic_blood_soul'
  | 'demonic_myriad_venom'
  | 'demonic_abyssal_pact'
  | 'demonic_nether_darkness';

export interface BoundEntityData {
  entityType: 'artifact' | 'beast' | null;
  baseItemId?: string | null;
  originalName?: string | null;
  customName?: string | null;
  rankLevel: number;
  evolutionStage: string;
  essence: number;
  maxEssence: number;
  beastCurrentHp?: number;
  beastMaxHp?: number;
  beastAtk?: number;
  beastDef?: number;
  beastSpd?: number;
}

export interface LawStatusData {
  hasLaw: boolean;
  activeLawType: LawType | null;
  lawName: string | null;
  category: string | null;
  qiType: 'qi' | 'true_qi';
  rank: number;
  stage: number;
  rankDisplayName: string;
  qi: number;
  maxQi: number;
  qiProgressPercent: number;
  isChanneling: boolean;
  channelRatePerMinute: number;
  channelMinutesUsedToday: number;
  dailyChannelCapMinutes: number;
  remainingChannelMinutesToday: number;
  loginStreak: number;
  streakBonusMinutes: number;
  lawLevelCapBonus: number;
  characterLevelCap: number;
  lawSkillPoints: number;
  unlockedSkillsCount: number;
  combatLoadout: string[];
  boundEntity?: BoundEntityData | null;
  bodyTemperingParts?: Record<string, number>;
  guSlots?: Array<{ guName: string; guType: string; level: number; hunger: number; lastFedAt?: string | Date }>;
  demonicData?: {
    turbidCoresConsumed?: number;
    corruptionIndex?: number;
    bloodEssenceVials?: number;
    soulBannerCaptures?: number;
    venomToxinLevel?: number;
    abyssalTributeDueAt?: string | Date;
    infamy?: number;
  } | null;
  element?: string | null;
  canMiniBreakthrough: boolean;
  canMajorBreakthrough: boolean;
  requiresTribulation: boolean;
  miniBreakthroughCost: {
    moodCost: number;
    vitalityCost: number;
    silverCost: number;
    materialName: string;
  };
  miniBreakthroughSuccessRate: number;
  majorBreakthroughSuccessRate: number;
  miniBreakthroughCooldownUntil?: string | null;
  majorBreakthroughCooldownUntil?: string | null;
  canClaimEpiphany: boolean;
  canBind: boolean;
  characterCurrentLevel?: number;
  requiredLevelForNextRank?: number;
  isLevelMetForNextRank?: boolean;
  majorBreakthroughBlockingReason?: string;
  tribulationDetails?: {
    survivalHP: number;
    waves: { wave: number; damage: number }[];
    maxWaveDmg: number;
    canSurvive: boolean;
    tribulationTitle?: string;
  } | null;
}

export interface LawSkillItem {
  skillId: string;
  lawType: LawType;
  tier: number;
  name: string;
  icon: string;
  description: string;
  isPassive: boolean;
  maxLevel: number;
  requiredRank: number;
  requiredParentSkillId?: string | null;
  skillPointCost: number;
  costType: 'qi' | 'true_qi' | 'hp' | 'stamina' | 'none';
  baseCost: number;
  cooldownTurns: number;
  targetType: string;
  damageMultiplier: number;
  element?: string | null;
  isUnlocked: boolean;
  isEquipped: boolean;
  canUnlock: boolean;
}

