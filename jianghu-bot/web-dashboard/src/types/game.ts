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
