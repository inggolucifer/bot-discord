/**
 * JIANGHU WORLD / IMMORTAL-X — CLIENT CHUNK STREAMING MANAGER (lib/chunkManager.ts)
 * Implements Fase C2 Specification:
 * - Dynamic Ring Architecture (Hot: visible on screen, Warm: 1-chunk border, Cold: evicted).
 * - Prioritized batched fetch queue ordered by Euclidean distance to camera center.
 * - Base64 packed Uint8Array decoding with O(1) tile coordinate lookup.
 * - Pre-rendered OffscreenCanvas / Canvas background bitmap cache for high FPS rendering.
 * - Seamless integration with Socket.IO room subscriptions.
 */

import { TileData, MapObjectInstance } from '@/types/world';
import api from '@/lib/api';
import { renderChunkGroundBitmap } from '@/lib/groundRenderer';
import { groundTextures } from '@/lib/groundTextures';

export const CHUNK_SIZE = 32;
export const WORLD_WIDTH = 5000;
export const WORLD_HEIGHT = 5000;
export const MAX_CHUNK_X = Math.floor((WORLD_WIDTH - 1) / CHUNK_SIZE); // 156
export const MAX_CHUNK_Y = Math.floor((WORLD_HEIGHT - 1) / CHUNK_SIZE); // 156
export const WORLD_VERSION = 'v6_20260916';
export const MAX_RESIDENT_CHUNKS = 64;

export interface ChunkCoords {
  cx: number;
  cy: number;
}

export interface StaticChunkData {
  v: string;
  cx: number;
  cy: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  palette: string[];
  terrain: string; // Base64 packed Uint8Array
  specialTiles: Record<number, {
    resourceType?: string | null;
    label?: string | null;
    terrainLabel?: string | null;
    isSettlementOrigin?: boolean;
    settlementName?: string | null;
    chineseName?: string | null;
    autotileBitmask?: number;
    autotileFrame?: string;
    isSolid?: boolean;
    ambientDangerTier?: number;
    spiritualQiDensity?: number;
  }>;
  scatter: Array<{
    id: string;
    defId: string;
    x: number;
    y: number;
    collision: 'solid' | 'soft' | 'none';
    tags?: string[];
    customLabel?: string;
  }>;
  occupancy?: string;
  hash: string;
}

export interface LiveChunkData {
  cx: number;
  cy: number;
  timestamp: number;
  players: Array<{
    discordId: string;
    username: string;
    title?: string | null;
    realm: string;
    x: number;
    y: number;
    avatar?: string;
    outfit?: string;
  }>;
  npcs: Array<{
    id: string;
    name: string;
    title?: string;
    portraitUrl?: string;
    x: number;
    y: number;
    settlementName?: string;
  }>;
  customTiles: Array<{
    tileX: number;
    tileY: number;
    ownerId?: string;
    buildingName?: string;
    isUnderConstruction?: boolean;
    cropType?: string;
    spawnedMonster?: any;
  }>;
  defeatedMonsterKeys: string[];
}

/**
 * Universal Base64 decoding into Uint8Array (works in Node.js & Browser)
 */
export function decodeBase64ToUint8(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Maps world coordinate (x, y) to chunk index
 */
export function worldToChunkCoord(worldX: number, worldY: number) {
  const cx = Math.floor(worldX / CHUNK_SIZE);
  const cy = Math.floor(worldY / CHUNK_SIZE);
  const lx = worldX - cx * CHUNK_SIZE;
  const ly = worldY - cy * CHUNK_SIZE;
  const index = ly * CHUNK_SIZE + lx;
  return { cx, cy, lx, ly, index };
}

/**
 * Computes bounding box for chunk
 */
export function chunkToBounds(cx: number, cy: number) {
  const minX = cx * CHUNK_SIZE;
  const maxX = Math.min(WORLD_WIDTH - 1, minX + CHUNK_SIZE - 1);
  const minY = cy * CHUNK_SIZE;
  const maxY = Math.min(WORLD_HEIGHT - 1, minY + CHUNK_SIZE - 1);
  return { minX, maxX, minY, maxY };
}

export class ChunkManager {
  private chunks = new Map<string, StaticChunkData>();
  private unpackedChunks = new Map<string, TileData[]>();
  private chunkBitmaps = new Map<string, HTMLCanvasElement | ImageBitmap>();
  private liveData = new Map<string, LiveChunkData>();

  private pendingFetches = new Set<string>();
  private failedFetches = new Map<string, number>();

  private hotRing = new Set<string>();
  private warmRing = new Set<string>();

  private currentCenter: { cx: number; cy: number } | null = null;
  private currentZoom = 1.0;

  private subscribers = new Set<() => void>();
  private socketInstance: any = null;
  private lastSubscribedRooms = new Set<string>();

  constructor() {}

  public getLoadedChunkCount(): number {
    return this.chunks.size;
  }

  public getHotChunkKeys(): string[] {
    return Array.from(this.hotRing);
  }

  public getWarmChunkKeys(): string[] {
    return Array.from(this.warmRing);
  }

  public subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notifySubscribers() {
    for (const fn of this.subscribers) {
      try {
        fn();
      } catch (err) {
        console.error('[ChunkManager] Subscriber callback error:', err);
      }
    }
  }

  public setSocket(socket: any) {
    this.socketInstance = socket;
    if (this.socketInstance) {
      this.socketInstance.on('chunk_player_moved', (data: any) => {
        this.handlePlayerMoved(data);
      });
      this.socketInstance.on('chunk_entity_update', (data: any) => {
        this.handleEntityUpdate(data);
      });
      this.syncSocketRooms();
    }
  }

  private syncSocketRooms() {
    if (!this.socketInstance) return;

    const currentRooms = new Set<string>();
    const roomsToSubscribe: ChunkCoords[] = [];

    for (const key of this.hotRing) {
      const [cxStr, cyStr] = key.split(':');
      const cx = parseInt(cxStr, 10);
      const cy = parseInt(cyStr, 10);
      currentRooms.add(key);
      if (!this.lastSubscribedRooms.has(key)) {
        roomsToSubscribe.push({ cx, cy });
      }
    }

    const roomsToUnsubscribe: ChunkCoords[] = [];
    for (const key of this.lastSubscribedRooms) {
      if (!currentRooms.has(key)) {
        const [cxStr, cyStr] = key.split(':');
        roomsToUnsubscribe.push({ cx: parseInt(cxStr, 10), cy: parseInt(cyStr, 10) });
      }
    }

    if (roomsToSubscribe.length > 0) {
      this.socketInstance.emit('subscribe_chunks', { chunks: roomsToSubscribe });
    }
    if (roomsToUnsubscribe.length > 0) {
      this.socketInstance.emit('unsubscribe_chunks', { chunks: roomsToUnsubscribe });
    }

    this.lastSubscribedRooms = currentRooms;
  }

  private handlePlayerMoved(data: any) {
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;
    const { cx, cy } = worldToChunkCoord(data.x, data.y);
    const key = `${cx}:${cy}`;
    const live = this.liveData.get(key);
    if (live) {
      const existingIdx = live.players.findIndex(p => p.discordId === data.discordId);
      if (existingIdx >= 0) {
        live.players[existingIdx] = { ...live.players[existingIdx], ...data };
      } else {
        live.players.push(data);
      }
      this.notifySubscribers();
    }
  }

  private handleEntityUpdate(data: any) {
    if (!data || typeof data.cx !== 'number' || typeof data.cy !== 'number') return;
    const key = `${data.cx}:${data.cy}`;
    this.liveData.set(key, data);
    this.notifySubscribers();
  }

  /**
   * Computes Hot, Warm, and Cold rings given camera center and zoom
   */
  public computeRings(centerTileX: number, centerTileY: number, zoom = 1.0) {
    const centerCx = Math.max(0, Math.min(MAX_CHUNK_X, Math.floor(centerTileX / CHUNK_SIZE)));
    const centerCy = Math.max(0, Math.min(MAX_CHUNK_Y, Math.floor(centerTileY / CHUNK_SIZE)));

    // Adaptive radius: at macro zoom (< 0.5), expand hot radius to cover broader viewport
    const hotRadius = zoom < 0.35 ? 3 : (zoom < 0.75 ? 2 : 1);
    const warmRadius = hotRadius + 1;

    const hot: ChunkCoords[] = [];
    const warm: ChunkCoords[] = [];
    const hotKeys = new Set<string>();
    const warmKeys = new Set<string>();

    for (let dy = -warmRadius; dy <= warmRadius; dy++) {
      for (let dx = -warmRadius; dx <= warmRadius; dx++) {
        const cx = centerCx + dx;
        const cy = centerCy + dy;

        if (cx < 0 || cx > MAX_CHUNK_X || cy < 0 || cy > MAX_CHUNK_Y) continue;

        const key = `${cx}:${cy}`;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));

        if (dist <= hotRadius) {
          hot.push({ cx, cy });
          hotKeys.add(key);
        } else {
          warm.push({ cx, cy });
          warmKeys.add(key);
        }
      }
    }

    return { hot, warm, hotKeys, warmKeys, centerCx, centerCy };
  }

  /**
   * Checks whether all chunks in the Hot ring for the given coordinates are loaded and unpacked
   */
  public areHotChunksReady(centerTileX: number, centerTileY: number, zoom = 1.0): boolean {
    const { hotKeys } = this.computeRings(centerTileX, centerTileY, zoom);
    for (const key of hotKeys) {
      if (!this.unpackedChunks.has(key)) return false;
    }
    return true;
  }

  /**
   * Main camera update hook: updates active rings, evicts cold chunks, schedules fetches
   */
  public updateCamera(centerTileX: number, centerTileY: number, zoom = 1.0) {
    const { hot, warm, hotKeys, warmKeys, centerCx, centerCy } = this.computeRings(centerTileX, centerTileY, zoom);

    this.currentCenter = { cx: centerCx, cy: centerCy };
    this.currentZoom = zoom;
    this.hotRing = hotKeys;
    this.warmRing = warmKeys;

    this.syncSocketRooms();
    this.evictColdChunks(hotKeys, warmKeys);

    // Collect all missing chunks in Hot and Warm rings
    const missingHot = hot.filter(c => !this.chunks.has(`${c.cx}:${c.cy}`));
    const missingWarm = warm.filter(c => !this.chunks.has(`${c.cx}:${c.cy}`));

    // Sort by Euclidean distance to center
    const sortByDistance = (a: ChunkCoords, b: ChunkCoords) => {
      const distA = Math.hypot(a.cx - centerCx, a.cy - centerCy);
      const distB = Math.hypot(b.cx - centerCx, b.cy - centerCy);
      return distA - distB;
    };

    missingHot.sort(sortByDistance);
    missingWarm.sort(sortByDistance);

    // Queue prioritize: all Hot first, then Warm
    const fetchQueue = [...missingHot, ...missingWarm];
    this.processFetchQueue(fetchQueue);
  }

  /**
   * Evicts chunks outside Hot & Warm rings if resident cache exceeds capacity
   */
  private evictColdChunks(hotKeys: Set<string>, warmKeys: Set<string>) {
    if (this.chunks.size <= MAX_RESIDENT_CHUNKS) return;

    for (const key of this.chunks.keys()) {
      if (!hotKeys.has(key) && !warmKeys.has(key)) {
        // Free bitmap if exists
        const bitmap = this.chunkBitmaps.get(key);
        if (bitmap && 'close' in bitmap && typeof (bitmap as any).close === 'function') {
          try {
            (bitmap as any).close();
          } catch (_) {}
        }
        this.chunkBitmaps.delete(key);
        this.unpackedChunks.delete(key);
        this.chunks.delete(key);
        this.liveData.delete(key);

        if (this.chunks.size <= MAX_RESIDENT_CHUNKS) {
          break;
        }
      }
    }
  }

  /**
   * Batched prioritized fetch dispatcher
   */
  private async processFetchQueue(queue: ChunkCoords[]) {
    const now = Date.now();
    const toFetch: ChunkCoords[] = [];

    for (const c of queue) {
      const key = `${c.cx}:${c.cy}`;
      if (this.pendingFetches.has(key)) continue;

      const failedAt = this.failedFetches.get(key);
      if (failedAt && now - failedAt < 5000) continue; // 5s backoff on failed

      toFetch.push(c);
      this.pendingFetches.add(key);
      if (toFetch.length >= 16) break; // Batch up to 16 chunks per request
    }

    if (toFetch.length === 0) return;

    try {
      if (toFetch.length === 1) {
        // Single chunk fetch
        const c = toFetch[0];
        const res = await api.get(`/world/chunk/${WORLD_VERSION}/${c.cx}/${c.cy}`);
        if (res.data) {
          this.ingestStaticChunk(res.data);
        }
      } else {
        // Batch chunks fetch
        const res = await api.post('/world/chunks', {
          version: WORLD_VERSION,
          chunks: toFetch
        });
        if (res.data?.chunks && Array.isArray(res.data.chunks)) {
          for (const chunk of res.data.chunks) {
            this.ingestStaticChunk(chunk);
          }
        }
      }
    } catch (err: any) {
      console.warn('[ChunkManager] Fetch failed:', err?.message || err);
      for (const c of toFetch) {
        this.failedFetches.set(`${c.cx}:${c.cy}`, Date.now());
      }
    } finally {
      for (const c of toFetch) {
        this.pendingFetches.delete(`${c.cx}:${c.cy}`);
      }
      this.notifySubscribers();
    }
  }

  /**
   * Ingests, unpacks, and caches a static chunk
   */
  public ingestStaticChunk(chunk: StaticChunkData) {
    if (!chunk || typeof chunk.cx !== 'number' || typeof chunk.cy !== 'number') return;
    const key = `${chunk.cx}:${chunk.cy}`;
    this.chunks.set(key, chunk);
    this.failedFetches.delete(key);

    // Unpack tiles
    const unpacked = this.unpackChunk(chunk);
    this.unpackedChunks.set(key, unpacked);

    // Invalidate bitmap so it will be lazily re-rendered with new chunk data
    this.chunkBitmaps.delete(key);
  }

  /**
   * Unpacks Base64 packed terrain and special metadata into 1024 TileData objects
   */
  public unpackChunk(chunk: StaticChunkData): TileData[] {
    const { cx, cy, palette, terrain, specialTiles = {}, scatter = [] } = chunk;
    const terrainBytes = decodeBase64ToUint8(terrain);
    const minX = cx * CHUNK_SIZE;
    const minY = cy * CHUNK_SIZE;

    // Map scatter objects by local tile coordinate
    const scatterByCoord = new Map<string, MapObjectInstance[]>();
    for (const obj of scatter) {
      const coordKey = `${obj.x},${obj.y}`;
      if (!scatterByCoord.has(coordKey)) scatterByCoord.set(coordKey, []);
      scatterByCoord.get(coordKey)!.push({
        id: obj.id,
        defId: obj.defId,
        x: obj.x,
        y: obj.y,
        customLabel: obj.customLabel
      });
    }

    const tiles: TileData[] = [];

    for (let dy = 0; dy < CHUNK_SIZE; dy++) {
      for (let dx = 0; dx < CHUNK_SIZE; dx++) {
        const idx = dy * CHUNK_SIZE + dx;
        const x = minX + dx;
        const y = minY + dy;

        if (x >= WORLD_WIDTH || y >= WORLD_HEIGHT) continue;

        const paletteIdx = terrainBytes[idx] !== undefined ? terrainBytes[idx] : 0;
        const terrainType = palette[paletteIdx] || 'plains';
        const special = specialTiles[idx] || {};

        const tileScatter = scatterByCoord.get(`${x},${y}`) || [];
        const isSolid = special.isSolid !== undefined
          ? special.isSolid
          : (terrainType.includes('mountain') || tileScatter.some(o => o.defId.includes('mt_')));

        const tile: TileData = {
          tileX: x,
          tileY: y,
          terrainType,
          tileType: special.isSettlementOrigin ? 'settlement' : (isSolid ? 'solid' : 'walkable'),
          isSolid,
          resourceType: special.resourceType || null,
          label: special.label || null,
          terrainLabel: special.terrainLabel || null,
          settlementName: special.settlementName || null,
          chineseName: special.chineseName || null,
          isSettlementOrigin: special.isSettlementOrigin || false,
          objects: tileScatter
        };

        tiles.push(tile);
      }
    }

    return tiles;
  }

  /**
   * Fast O(1) tile lookup
   */
  public getTile(worldX: number, worldY: number): TileData | null {
    if (worldX < 0 || worldX >= WORLD_WIDTH || worldY < 0 || worldY >= WORLD_HEIGHT) {
      return null;
    }
    const { cx, cy, index } = worldToChunkCoord(worldX, worldY);
    const key = `${cx}:${cy}`;
    const unpacked = this.unpackedChunks.get(key);
    if (!unpacked || !unpacked[index]) {
      return null;
    }

    let tile = unpacked[index];

    // Overlay live dynamic data if present
    const live = this.liveData.get(key);
    if (live) {
      const custom = live.customTiles.find(t => t.tileX === worldX && t.tileY === worldY);
      if (custom) {
        tile = {
          ...tile,
          ownerId: custom.ownerId,
          buildingName: custom.buildingName,
          isUnderConstruction: custom.isUnderConstruction,
          cropType: custom.cropType,
          spawnedMonster: custom.spawnedMonster
        };
      }
    }

    return tile;
  }

  /**
   * Fast O(1) Occupancy Bitmask Test (Fase H1)
   */
  public isTileOccupied(worldX: number, worldY: number): boolean {
    if (worldX < 0 || worldX >= WORLD_WIDTH || worldY < 0 || worldY >= WORLD_HEIGHT) {
      return true;
    }
    const { cx, cy, index } = worldToChunkCoord(worldX, worldY);
    const chunk = this.chunks.get(`${cx}:${cy}`);
    if (!chunk || !chunk.occupancy) return false;
    const bytes = decodeBase64ToUint8(chunk.occupancy);
    const byteIdx = Math.floor(index / 8);
    const bitIdx = index % 8;
    return (bytes[byteIdx] & (1 << bitIdx)) !== 0;
  }

  /**
   * Returns all loaded tiles within bounding box
   */
  public getTilesInBounds(minX: number, minY: number, maxX: number, maxY: number): TileData[] {
    const minCx = Math.max(0, Math.floor(minX / CHUNK_SIZE));
    const maxCx = Math.min(MAX_CHUNK_X, Math.floor(maxX / CHUNK_SIZE));
    const minCy = Math.max(0, Math.floor(minY / CHUNK_SIZE));
    const maxCy = Math.min(MAX_CHUNK_Y, Math.floor(maxY / CHUNK_SIZE));

    const result: TileData[] = [];

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = `${cx}:${cy}`;
        const chunkTiles = this.unpackedChunks.get(key);
        if (!chunkTiles) continue;

        for (const t of chunkTiles) {
          if (t.tileX >= minX && t.tileX <= maxX && t.tileY >= minY && t.tileY <= maxY) {
            result.push(t);
          }
        }
      }
    }

    return result;
  }

  /**
   * Returns flat array of all currently loaded tiles in memory
   */
  public getAllLoadedTiles(): TileData[] {
    const all: TileData[] = [];
    for (const chunkTiles of this.unpackedChunks.values()) {
      all.push(...chunkTiles);
    }
    return all;
  }

  /**
   * Pre-renders and caches 32x32 chunk static terrain background onto an OffscreenCanvas
   */
  public getChunkBitmap(cx: number, cy: number, tileSize = 54): HTMLCanvasElement | ImageBitmap | null {
    if (typeof document === 'undefined') return null;

    const key = `${cx}:${cy}`;
    if (this.chunkBitmaps.has(key)) {
      return this.chunkBitmaps.get(key)!;
    }

    const chunk = this.chunks.get(key);
    const tiles = this.unpackedChunks.get(key);
    if (!chunk || !tiles) return null;

    // Prompt K1: If textures are not yet ready, return provisional ground bitmap without permanent caching
    if (!groundTextures.ready) {
      groundTextures.load().then(() => {
        // Rebuild: clear provisional bitmaps and notify subscribers to render rich textures
        this.chunkBitmaps.clear();
        this.notifySubscribers();
      }).catch(() => {});

      return renderChunkGroundBitmap(
        cx,
        cy,
        tiles,
        tileSize,
        (x, y) => this.getTile(x, y)?.terrainType
      );
    }

    const canvas = renderChunkGroundBitmap(
      cx,
      cy,
      tiles,
      tileSize,
      (x, y) => this.getTile(x, y)?.terrainType
    );

    if (canvas) {
      this.chunkBitmaps.set(key, canvas);
    }
    return canvas;
  }

  /**
   * Resets all internal caches
   */
  public clear() {
    for (const bitmap of this.chunkBitmaps.values()) {
      if (bitmap && 'close' in bitmap && typeof (bitmap as any).close === 'function') {
        try {
          (bitmap as any).close();
        } catch (_) {}
      }
    }
    this.chunks.clear();
    this.unpackedChunks.clear();
    this.chunkBitmaps.clear();
    this.liveData.clear();
    this.pendingFetches.clear();
    this.failedFetches.clear();
    this.hotRing.clear();
    this.warmRing.clear();
    this.lastSubscribedRooms.clear();
  }
}

// Global Singleton Instance
export const chunkManager = new ChunkManager();
