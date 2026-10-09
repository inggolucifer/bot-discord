/**
 * JIANGHU WORLD / IMMORTAL-X: UNIFIED WORLD & MAP TYPES CONTRACT
 * Single Source of Truth for WorldCanvas, Zone Grid, Terrain, Objects, and Regional Topology.
 */

import { Point } from '@/hooks/useAStarGridPath';

export type CanvasViewMode = 'macro' | 'zone' | 'settlement' | 'interior';

export type FogStatus = 'unknown' | 'silhouette' | 'explored';

export type CollisionType = 'solid' | 'soft' | 'none';

export type NpcAttitude = 'friendly' | 'neutral' | 'hostile' | 'quest';

export interface WorldObjectDef {
  id: string;
  name?: string;
  atlas?: string;
  frame?: string;
  px: { w: number; h: number };
  footprint: { cw: number; ch: number };
  anchor: { x: number; y: number }; // default bottom center { x: 0.5, y: 1.0 }
  overhangCells: number;
  collision: CollisionType;
  staminaMult?: number;
  sortBias?: number;
  variants?: string[];
  tint?: { hueJitter?: number; valueJitter?: number };
  flipX?: boolean;
  fogFoot?: boolean;
  tags?: string[];
}

export interface MapObjectInstance {
  id: string;
  defId: string;
  x: number; // Anchor tileX
  y: number; // Anchor tileY
  variant?: number | string;
  flipX?: boolean;
  scale?: number;
  state?: any;
  customLabel?: string;
}

export interface SpawnedMonsterData {
  key: string;
  name: string;
  tier?: number;
  isBoss?: boolean;
  isElite?: boolean;
  hp?: number;
  maxHp?: number;
  atk?: number;
  def?: number;
  spd?: number;
  imageUrl?: string | null;
}

export interface TileData {
  tileX: number;
  tileY: number;
  terrainType: string;
  tileType: string;
  isSolid?: boolean;
  resourceType?: string | null;
  nodeRespawnAt?: string | Date | null;
  label?: string | null;
  settlementName?: string | null;
  chineseName?: string | null;
  isSettlementOrigin?: boolean;
  settlementData?: any;
  isOccupied?: boolean;
  buildingName?: string | null;
  buildingType?: string | null;
  isDoor?: boolean;
  propertyStructureId?: string | null;
  isClaimable?: boolean;
  plotPriceSilver?: number;
  ownerId?: string | null;
  ownerName?: string | null;
  cropType?: string | null;
  baseTemperature?: number;
  spiritualQiDensity?: number;
  regionId?: string;
  regionName?: string;
  territoryType?: string;
  dangerTier?: number;
  ambushRiskRate?: number;
  factionName?: string | null;
  staminaCost?: number;
  isUnderConstruction?: boolean;
  constructionCompleteAt?: string | null;
  assetHp?: number;
  assetMaxHp?: number;
  isExpeditionNode?: boolean;
  npcCount?: number;
  npcs?: any[];
  spawnedMonster?: SpawnedMonsterData | null;
  objects?: MapObjectInstance[];
}

export interface RegionTopology {
  regionSlug: string;
  displayName: string;
  chineseName?: string;
  worldMapX: number;
  worldMapY: number;
  centerX: number;
  centerY: number;
  dangerTier: number;
  qiDensityModifier?: number;
  walkDefault?: 'open' | 'restricted' | 'blocked';
  tempRangeC?: { min: number; max: number };
  terrainType?: string;
  description?: string;
  lawAffinities?: string[];
  resourceTags?: string[];
  discovered?: boolean;
  color?: string;
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface WorldLandmark {
  x: number;
  y: number;
  name: string;
  chineseName?: string;
  type: string;
  region?: string;
  dangerTier?: number;
}
