'use client';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Point } from '@/hooks/useAStarGridPath';
import { useGlobalAssetLoader } from '@/hooks/useGlobalAssetLoader';
import {
  TileData,
  CanvasViewMode,
  MapObjectInstance,
  WorldObjectDef,
  RegionTopology,
  WorldLandmark
} from '@/types/world';
import {
  OBJECT_DEFINITIONS,
  renderL0XuanPaper,
  renderL1TerrainCell,
  renderL3FootMist,
  renderL4ProceduralObject,
  renderL6FogOfWarCell,
  renderL7MonsterInkRing,
  renderL7NpcBadge,
  renderL7ResourceSparkle,
  renderL7AggroRadius,
  getMonsterIcon,
  renderWorldEdgeClouds
} from '@/lib/proceduralObjects';
import { CANONICAL_REGIONS, CANONICAL_LANDMARKS } from '@/config/canonicalRegions';
import { Compass, ZoomIn, ZoomOut, Target, Map as MapIcon, Layers, Navigation } from 'lucide-react';
import { atlasLoader } from '@/lib/atlasLoader';

// Re-export TileData for backward compatibility
export type { TileData };

export interface WorldCanvasProps {
  mode?: CanvasViewMode;
  tiles: TileData[];
  playerPos: { x: number; y: number };
  targetTile?: Point | null;
  activePath?: Point[];
  exploredChunks?: string[];
  isWalking?: boolean;
  onTileClick?: (tile: TileData) => void;
  onTileHover?: (tile: TileData | null) => void;
  onActionWalk?: () => void;
  onActionInspect?: () => void;
  onClearTarget?: () => void;
  focusTile?: Point | null;
  weather?: 'rain' | 'snow' | 'miasma' | 'none';
  isNight?: boolean;
  onOpenSearch?: () => void;
  onRecenterPlayer?: () => void;
  onModeChange?: (mode: CanvasViewMode) => void;
  onSelectRegion?: (regionSlug: string, centerX?: number, centerY?: number) => void;
}

interface YSortEntry {
  type: 'object' | 'player' | 'monster' | 'npc';
  sortKey: number;
  tileX: number;
  tileY: number;
  footprintBottomY: number;
  data: any;
}

export default function WorldCanvas({
  mode = 'zone',
  tiles,
  playerPos,
  targetTile = null,
  activePath = [],
  exploredChunks = [],
  isWalking = false,
  onTileClick,
  onTileHover,
  onActionWalk,
  onActionInspect,
  onClearTarget,
  focusTile = null,
  weather = 'none',
  isNight = false,
  onOpenSearch,
  onRecenterPlayer,
  onModeChange,
  onSelectRegion
}: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const BASE_TILE_SIZE = 54;
  const { loadedImages } = useGlobalAssetLoader();

  // Active View Mode state (Macro vs Zone)
  const [currentMode, setCurrentMode] = useState<CanvasViewMode>(mode);
  useEffect(() => {
    setCurrentMode(mode);
    if (mode === 'macro') {
      setCamera(prev => ({ ...prev, zoom: 0.18 }));
    } else {
      setCamera(prev => ({ ...prev, zoom: 1.0 }));
    }
  }, [mode]);

  // Responsive Canvas Size (Never Stretches - 1:1 Aspect Ratio)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const { clientWidth, clientHeight } = container;
      if (clientWidth > 0 && clientHeight > 0) {
        if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
          canvas.width = clientWidth;
          canvas.height = clientHeight;
        }
      }
    };

    handleResize();
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Camera State
  const [camera, setCamera] = useState<{ x: number; y: number; zoom: number }>({
    x: focusTile ? focusTile.x : playerPos.x,
    y: focusTile ? focusTile.y : playerPos.y,
    zoom: mode === 'macro' ? 0.18 : 1.0
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cameraStart, setCameraStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<TileData | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<any | null>(null);

  // Build Mode State (Fase 18)
  const [isBuildMode, setIsBuildMode] = useState(false);

  // Preload Core WebP Atlases on Mount (Fase 19)
  useEffect(() => {
    atlasLoader.preloadCoreAtlases();
  }, []);

  // Keyboard shortcut: 'B' toggles Mode Bangun
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'b' || e.key === 'B') {
        setIsBuildMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Client-Side Tweening
  const animatedPlayerPos = useRef({ x: playerPos.x, y: playerPos.y });

  // Mobile Touch Pan & Tap State
  const touchState = useRef<{
    startX: number;
    startY: number;
    cameraStartX: number;
    cameraStartY: number;
    movedDist: number;
    initialPinchDist: number | null;
    initialZoom: number;
    isPinching: boolean;
  }>({
    startX: 0,
    startY: 0,
    cameraStartX: 0,
    cameraStartY: 0,
    movedDist: 0,
    initialPinchDist: null,
    initialZoom: 1.0,
    isPinching: false
  });

  // Explored Chunk Lookup
  const exploredChunkSet = useMemo(() => new Set(exploredChunks), [exploredChunks]);

  // Fast Tile Map Lookup
  const tileMap = useMemo(() => {
    const map = new Map<string, TileData>();
    for (const t of tiles) {
      map.set(`${t.tileX},${t.tileY}`, t);
    }
    return map;
  }, [tiles]);

  // Recenter Camera Callback
  const centerOnPlayer = useCallback(() => {
    setCamera(prev => ({ ...prev, x: playerPos.x, y: playerPos.y }));
    animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
    onRecenterPlayer?.();
  }, [playerPos.x, playerPos.y, onRecenterPlayer]);

  // Auto-sync Camera on Focus or Teleport
  const prevFocusTile = useRef<Point | null>(focusTile);
  useEffect(() => {
    if (focusTile) {
      setCamera(prev => ({ ...prev, x: focusTile.x, y: focusTile.y }));
    } else if (prevFocusTile.current && !focusTile) {
      setCamera(prev => ({ ...prev, x: playerPos.x, y: playerPos.y }));
      animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
    }
    prevFocusTile.current = focusTile;
  }, [focusTile?.x, focusTile?.y, playerPos.x, playerPos.y]);

  // Sync Camera when Walking
  useEffect(() => {
    if (isWalking) {
      setCamera(prev => ({
        ...prev,
        x: prev.x + (playerPos.x - prev.x) * 0.25,
        y: prev.y + (playerPos.y - prev.y) * 0.25
      }));
    }
  }, [playerPos.x, playerPos.y, isWalking]);

  // Toggle Mode Handler
  const handleToggleMode = () => {
    const nextMode = currentMode === 'zone' ? 'macro' : 'zone';
    setCurrentMode(nextMode);
    onModeChange?.(nextMode);
    if (nextMode === 'macro') {
      setCamera(prev => ({ ...prev, zoom: 0.18 }));
    } else {
      setCamera(prev => ({ ...prev, x: playerPos.x, y: playerPos.y, zoom: 1.0 }));
    }
  };

  // ==========================================================================
  // MAIN 10-LAYER RENDERING LOOP
  // ==========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number = 0;
    let time = 0;

    const render = () => {
      time += 0.02;
      const width = canvas.width;
      const height = canvas.height;
      const currentTileSize = BASE_TILE_SIZE * camera.zoom;

      // ----------------------------------------------------------------------
      // L0: KERTAS DASAR (Xuan Paper Texture & Ultra-faint Grid)
      // ----------------------------------------------------------------------
      renderL0XuanPaper(ctx, width, height, camera.zoom, loadedImages.ui?.parchment_bg);

      const viewTilesX = width / currentTileSize;
      const viewTilesY = height / currentTileSize;
      const minTileX = Math.floor(camera.x - viewTilesX / 2) - 1;
      const maxTileX = Math.ceil(camera.x + viewTilesX / 2) + 1;
      const minTileY = Math.floor(camera.y - viewTilesY / 2) - 1;
      const maxTileY = Math.ceil(camera.y + viewTilesY / 2) + 1;

      const toScreenX = (wx: number) => (wx - camera.x + viewTilesX / 2) * currentTileSize;
      const toScreenY = (wy: number) => (wy - camera.y + viewTilesY / 2) * currentTileSize;

      // ======================================================================
      // BRANCH: MACRO MODE (CONTINENT OVERVIEW 5000x5000)
      // ======================================================================
      if (currentMode === 'macro') {
        // 1. Draw 29 Canonical Regions Bounds & Watercolor Washes
        CANONICAL_REGIONS.forEach((reg: any) => {
          const rx = toScreenX(reg.bounds.minX);
          const ry = toScreenY(reg.bounds.minY);
          const rw = (reg.bounds.maxX - reg.bounds.minX) * currentTileSize;
          const rh = (reg.bounds.maxY - reg.bounds.minY) * currentTileSize;

          // Soft watercolor regional tint
          ctx.save();
          ctx.fillStyle = reg.palette?.terrainColor ? `${reg.palette.terrainColor}33` : 'rgba(77, 115, 72, 0.2)';
          ctx.fillRect(rx, ry, rw, rh);

          // Boundary calligraphy stroke
          ctx.strokeStyle = reg.palette?.accent || '#D4B16A';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(rx, ry, rw, rh);

          // Regional Calligraphy Label
          const cx = rx + rw / 2;
          const cy = ry + rh / 2;
          ctx.fillStyle = '#2D3330';
          ctx.font = `bold ${Math.max(10, 14 * camera.zoom * 2.5)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(reg.displayName, cx, cy - 8);

          if (reg.chineseName) {
            ctx.fillStyle = '#8C3D2E';
            ctx.font = `bold ${Math.max(9, 12 * camera.zoom * 2.5)}px serif`;
            ctx.fillText(reg.chineseName, cx, cy + 10);
          }

          // Danger Tier Badge
          const tier = reg.dangerTier || 1;
          let tierColor = '#10B981';
          if (tier === 2) tierColor = '#06B6D4';
          else if (tier === 3) tierColor = '#F59E0B';
          else if (tier === 4) tierColor = '#EF4444';
          else if (tier === 5) tierColor = '#A855F7';

          ctx.fillStyle = tierColor;
          ctx.font = `bold ${Math.max(8, 10 * camera.zoom * 2)}px sans-serif`;
          ctx.fillText(`Tier ${tier}`, cx, cy + 26);
          ctx.restore();
        });

        // 2. Draw Landmarks (Cities, Sects, Passes, Ports)
        CANONICAL_LANDMARKS.forEach(lm => {
          const lx = toScreenX(lm.x);
          const ly = toScreenY(lm.y);

          ctx.save();
          let icon = '🏛️';
          if (lm.type === 'sect') icon = '⛩️';
          else if (lm.type === 'secret_realm') icon = '🗝️';
          else if (lm.type === 'port') icon = '⛵';
          else if (lm.type === 'pass') icon = '🛡️';
          else if (lm.type === 'village') icon = '🏡';

          ctx.font = `${Math.max(12, 16 * camera.zoom * 2)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icon, lx, ly);

          // Landmark Label Tag
          ctx.font = `bold ${Math.max(8, 9 * camera.zoom * 2)}px sans-serif`;
          const textW = ctx.measureText(lm.name).width;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(lx - textW / 2 - 4, ly + 10, textW + 8, 12);
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(lx - textW / 2 - 4, ly + 10, textW + 8, 12);
          ctx.fillStyle = '#FEF08A';
          ctx.fillText(lm.name, lx, ly + 18);
          ctx.restore();
        });

        // 3. Draw Player Location Pin
        const plx = toScreenX(playerPos.x);
        const ply = toScreenY(playerPos.y);
        ctx.save();
        const pulseR = 12 + Math.sin(time * 4) * 4;
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(plx, ply, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(plx, ply, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Anda', plx, ply - 10);
        ctx.restore();

        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // ======================================================================
      // BRANCH: ZONE MODE (MICRO-GRID EXPLORATION 10-LAYER SHUIMO)
      // ======================================================================

      // ----------------------------------------------------------------------
      // L1 & L2: WASH TERRAIN & DETAIL TANAH DATAR (1-Cell Non-Overflow)
      // ----------------------------------------------------------------------
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          const sx = toScreenX(tx);
          const sy = toScreenY(ty);

          if (!tile) {
            if (tx >= 0 && tx < 5000 && ty >= 0 && ty < 5000) {
              ctx.strokeStyle = 'rgba(180, 160, 130, 0.08)';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(sx, sy, currentTileSize, currentTileSize);
            }
            continue;
          }

          // Render flat ground wash & micro texture
          renderL1TerrainCell(ctx, sx, sy, currentTileSize, tile.terrainType, time, tx, ty);

          // Territory overlay tints
          if (tile.territoryType === 'death_zone') {
            ctx.fillStyle = 'rgba(147, 51, 234, 0.18)';
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
          } else if (tile.territoryType === 'danger_zone') {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
          } else if (tile.territoryType === 'hunting_zone') {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
          } else if (tile.territoryType === 'sect_territory') {
            ctx.fillStyle = 'rgba(128, 0, 128, 0.1)';
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
          }

          // Resource Gathering Node
          if (tile.resourceType && !tile.isSolid && !tile.buildingName) {
            let resIcon = '🌿';
            if (tile.resourceType === 'wood') resIcon = tile.terrainType.includes('bamboo') ? '🎋' : '🪵';
            else if (tile.resourceType === 'ore') resIcon = '⛏️';
            else if (tile.resourceType === 'fish') resIcon = '🐟';
            else if (tile.resourceType === 'herb') resIcon = '🌿';

            ctx.save();
            ctx.font = `${Math.max(9, 11 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(resIcon, sx + currentTileSize * 0.8, sy + currentTileSize * 0.25);
            ctx.restore();
          }

          // Claimed Land / Farmland
          if (tile.isClaimable && !tile.buildingName && !tile.isUnderConstruction && tile.ownerId) {
            ctx.fillStyle = '#10B981';
            ctx.font = `bold ${Math.max(7, 9 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🚩 Milik', sx + currentTileSize / 2, sy + currentTileSize * 0.55);
          }
          if (tile.cropType) {
            ctx.font = `${Math.max(8, 12 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🌾', sx + currentTileSize * 0.5, sy + currentTileSize * 0.55);
          }
        }
      }

      // Grid Lines (Ultra-crisp 1px with alpha 0.06 - 0.25)
      ctx.save();
      ctx.strokeStyle = 'rgba(165, 155, 142, 0.25)';
      ctx.lineWidth = 1;
      for (let tx = minTileX; tx <= maxTileX + 1; tx++) {
        const sx = Math.floor(toScreenX(tx)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(sx, Math.max(0, toScreenY(minTileY)));
        ctx.lineTo(sx, Math.min(height, toScreenY(maxTileY + 1)));
        ctx.stroke();
      }
      for (let ty = minTileY; ty <= maxTileY + 1; ty++) {
        const sy = Math.floor(toScreenY(ty)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, toScreenX(minTileX)), sy);
        ctx.lineTo(Math.min(width, toScreenX(maxTileX + 1)), sy);
        ctx.stroke();
      }
      ctx.restore();

      // ----------------------------------------------------------------------
      // L2.5: BUILD ZONE OVERLAY (When isBuildMode is active - Fase 18)
      // ----------------------------------------------------------------------
      if (isBuildMode) {
        ctx.save();
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          for (let tx = minTileX; tx <= maxTileX; tx++) {
            const tile = tileMap.get(`${tx},${ty}`);
            const sx = toScreenX(tx);
            const sy = toScreenY(ty);

            if (!tile) continue;

            if (tile.ownerId) {
              // Owned plot: Amber Gold
              ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
              ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
              ctx.strokeStyle = '#F59E0B';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
            } else if (tile.isClaimable) {
              if (tile.dangerTier === 2) {
                // Frontier (Tier 2): Ochre
                ctx.fillStyle = 'rgba(217, 119, 6, 0.25)';
                ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
                ctx.strokeStyle = '#D97706';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
              } else {
                // Open (Tier 1): Jade Green
                ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
                ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
                ctx.strokeStyle = '#10B981';
                ctx.lineWidth = 1.2;
                ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
              }
            } else {
              // Forbidden or buffer
              const isBuffer = Boolean(tile.territoryType === 'settlement_buffer' || tile.isSettlementTile);
              if (isBuffer) {
                // Buffer: Slate Blue with dashed boundary
                ctx.fillStyle = 'rgba(71, 85, 105, 0.28)';
                ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
                ctx.strokeStyle = '#64748B';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
              } else {
                // Forbidden: Cinnabar Cross-Hatch
                ctx.fillStyle = 'rgba(220, 38, 38, 0.16)';
                ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
                ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(sx, sy + currentTileSize);
                ctx.lineTo(sx + currentTileSize, sy);
                ctx.stroke();
              }
            }
          }
        }

        // Ghost footprint placement preview at hovered tile
        if (hoveredTile) {
          const hsx = toScreenX(hoveredTile.tileX);
          const hsy = toScreenY(hoveredTile.tileY);
          const isBuildable = hoveredTile.isClaimable && !hoveredTile.ownerId;
          ctx.fillStyle = isBuildable ? 'rgba(16, 185, 129, 0.38)' : 'rgba(220, 38, 38, 0.38)';
          ctx.fillRect(hsx, hsy, currentTileSize, currentTileSize);
          ctx.strokeStyle = isBuildable ? '#10B981' : '#EF4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(hsx, hsy, currentTileSize, currentTileSize);
        }
        ctx.restore();
      }

      // ----------------------------------------------------------------------
      // L3 & L4: Y-SORTED OBJECTS & ENTITIES (MAX 140 OBJECTS PER FRAME)
      // ----------------------------------------------------------------------
      const ySortQueue: YSortEntry[] = [];

      // 1. Collect Visible Tall Objects
      let objCount = 0;
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          if (objCount >= 140) break;
          const tile = tileMap.get(`${tx},${ty}`);
          if (!tile) continue;

          // Check if tile has explicit map objects
          if (tile.objects && tile.objects.length > 0) {
            for (const obj of tile.objects) {
              const def = OBJECT_DEFINITIONS[obj.defId] || OBJECT_DEFINITIONS.karst_pillar_1x1;
              const bottomY = obj.y + def.footprint.ch;
              ySortQueue.push({
                type: 'object',
                sortKey: bottomY * 1000 + obj.x + (def.sortBias || 0),
                tileX: obj.x,
                tileY: obj.y,
                footprintBottomY: bottomY,
                data: { def, instance: obj }
              });
              objCount++;
            }
          } else {
            // Procedural Tall Object Generation for natural landmarks
            let autoDefId: string | null = null;
            if (tile.terrainType === 'azure_mountain' || tile.terrainType === 'mountain' || tile.terrainType === 'mountain_rock') {
              const hash = (tx * 73856093 ^ ty * 19349663) >>> 0;
              if (hash % 3 === 0) autoDefId = 'karst_pillar_1x1';
              else if (hash % 3 === 1) autoDefId = 'mt_rock_2x1';
            } else if (tile.terrainType.includes('bamboo')) {
              const hash = (tx * 31 + ty * 17) % 5;
              if (hash === 0) autoDefId = 'bamboo_clump_1x1';
              else if (hash === 1) autoDefId = 'bamboo_clump_2x1';
            } else if (tile.terrainType.includes('forest') || tile.terrainType === 'spirit_wood') {
              const hash = (tx * 19 + ty * 43) % 4;
              if (hash === 0) autoDefId = 'pine_tree_1x1';
            } else if (tile.buildingName || tile.isSettlementOrigin) {
              if (tile.isSettlementOrigin) autoDefId = 'sect_gate_3x2';
              else autoDefId = 'village_house_2x1';
            }

            if (autoDefId && OBJECT_DEFINITIONS[autoDefId]) {
              const def = OBJECT_DEFINITIONS[autoDefId];
              const bottomY = ty + def.footprint.ch;
              ySortQueue.push({
                type: 'object',
                sortKey: bottomY * 1000 + tx + (def.sortBias || 0),
                tileX: tx,
                tileY: ty,
                footprintBottomY: bottomY,
                data: { def, instance: { id: `auto_${tx}_${ty}`, defId: autoDefId, x: tx, y: ty } }
              });
              objCount++;
            }
          }
        }
      }

      // 2. Insert Player into Y-Sort Queue
      animatedPlayerPos.current.x += (playerPos.x - animatedPlayerPos.current.x) * 0.15;
      animatedPlayerPos.current.y += (playerPos.y - animatedPlayerPos.current.y) * 0.15;
      const pTileX = animatedPlayerPos.current.x;
      const pTileY = animatedPlayerPos.current.y;
      ySortQueue.push({
        type: 'player',
        sortKey: (pTileY + 1) * 1000 + pTileX,
        tileX: pTileX,
        tileY: pTileY,
        footprintBottomY: pTileY + 1,
        data: null
      });

      // Sort by sortKey (Bottom-most objects drawn last)
      ySortQueue.sort((a, b) => a.sortKey - b.sortKey);

      // 3. Render Y-Sorted Queue with Player Occlusion (Alpha 0.55 + Silhouette)
      for (const item of ySortQueue) {
        if (item.type === 'object') {
          const { def, instance } = item.data as { def: WorldObjectDef; instance: MapObjectInstance };
          const ox = toScreenX(instance.x);
          const oy = toScreenY(instance.y - def.overhangCells);

          // L3: Foot Mist
          if (def.fogFoot) {
            const footX = toScreenX(instance.x + def.footprint.cw * 0.5);
            const footY = toScreenY(instance.y + def.footprint.ch);
            renderL3FootMist(ctx, footX, footY, def.footprint.cw * currentTileSize, currentTileSize * 0.35);
          }

          // Player Occlusion Check
          let objAlpha = 1.0;
          const isPlayerBehind =
            pTileY >= instance.y - def.overhangCells &&
            pTileY <= instance.y + def.footprint.ch &&
            pTileX >= instance.x - 0.5 &&
            pTileX <= instance.x + def.footprint.cw + 0.5;

          if (isPlayerBehind && item.sortKey > (pTileY + 1) * 1000 + pTileX) {
            objAlpha = 0.55;
          }

          // L4: Render Procedural Tall Object
          renderL4ProceduralObject(ctx, def.id, ox, oy, currentTileSize, time, objAlpha, instance.flipX);

          // Building Label
          const t = tileMap.get(`${instance.x},${instance.y}`);
          if (t && t.buildingName) {
            const bLabel = t.buildingName;
            ctx.font = `bold ${Math.max(7, 8.5 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            const textW = ctx.measureText(bLabel).width;
            const pillW = textW + 8 * camera.zoom;
            const pillH = 11 * camera.zoom;
            const pillX = ox + (def.footprint.cw * currentTileSize - pillW) / 2;
            const pillY = oy + (def.footprint.ch + def.overhangCells) * currentTileSize - pillH;

            ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
            ctx.fillRect(pillX, pillY, pillW, pillH);
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 1;
            ctx.strokeRect(pillX, pillY, pillW, pillH);
            ctx.fillStyle = '#FEF08A';
            ctx.fillText(bLabel, pillX + pillW / 2, pillY + pillH - 2.5 * camera.zoom);
          }
        } else if (item.type === 'player') {
          // Render Player Character
          const px = toScreenX(animatedPlayerPos.current.x) + currentTileSize / 2;
          const py = toScreenY(animatedPlayerPos.current.y) + currentTileSize / 2;

          ctx.save();
          if (loadedImages.sprites?.player_default) {
            const pw = currentTileSize * 1.5;
            const ph = pw * 1.5;
            ctx.drawImage(loadedImages.sprites.player_default, px - pw / 2, py - ph / 2 - 10 * camera.zoom, pw, ph);
            if (loadedImages.sprites?.flying_sword_aura) {
              ctx.drawImage(loadedImages.sprites.flying_sword_aura, px - pw / 2, py + 5 * camera.zoom, pw, pw / 2);
            }
          } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
            ctx.beginPath();
            ctx.ellipse(px, py + 11 * camera.zoom, 12 * camera.zoom, 4.5 * camera.zoom, 0, 0, Math.PI * 2);
            ctx.fill();

            const auraPulse = 13 + Math.sin(time * 4) * 2.5;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
            ctx.beginPath();
            ctx.arc(px, py - 5 * camera.zoom, auraPulse * camera.zoom, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1E293B';
            ctx.beginPath();
            ctx.moveTo(px, py - 16 * camera.zoom);
            ctx.lineTo(px + 7 * camera.zoom, py + 9 * camera.zoom);
            ctx.lineTo(px - 7 * camera.zoom, py + 9 * camera.zoom);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#F1F5F9';
            ctx.fillRect(px - 2 * camera.zoom, py - 12 * camera.zoom, 4 * camera.zoom, 18 * camera.zoom);

            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.arc(px, py - 17 * camera.zoom, 4.5 * camera.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py - 22 * camera.zoom, 2.2 * camera.zoom, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // ----------------------------------------------------------------------
      // L5: KABUT ATMOSFER (Parallax Ink Cloud Wash)
      // ----------------------------------------------------------------------
      ctx.save();
      const atmoGrad = ctx.createLinearGradient(0, 0, width, height);
      atmoGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      atmoGrad.addColorStop(0.5, 'rgba(240, 235, 225, 0.08)');
      atmoGrad.addColorStop(1, 'rgba(210, 200, 185, 0.04)');
      ctx.fillStyle = atmoGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // ----------------------------------------------------------------------
      // L6: FOG OF WAR (3-State Ink Mask & World Edge Clouds)
      // ----------------------------------------------------------------------
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const chunkX = Math.floor(tx / 16);
          const chunkY = Math.floor(ty / 16);
          const isExplored = exploredChunkSet.has(`${chunkX},${chunkY}`);
          if (!isExplored) {
            const sx = toScreenX(tx);
            const sy = toScreenY(ty);
            renderL6FogOfWarCell(ctx, sx, sy, currentTileSize, 'unknown');
          }
        }
      }

      // World Boundary Ink Clouds (x, y near 0 or 4999)
      const isLeft = minTileX <= 0;
      const isRight = maxTileX >= 4999;
      const isTop = minTileY <= 0;
      const isBottom = maxTileY >= 4999;
      renderWorldEdgeClouds(ctx, width, height, isLeft, isRight, isTop, isBottom, time);

      // ----------------------------------------------------------------------
      // L7: MARKER UI (NPC Badges, Monster Rings, Path Glow, Player Frame)
      // ----------------------------------------------------------------------

      // 1. NPC Badges
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          if (!tile || !Array.isArray(tile.npcs) || tile.npcs.length === 0 || !tile.npcCount || tile.npcCount <= 0) continue;
          const chunkX = Math.floor(tx / 16);
          const chunkY = Math.floor(ty / 16);
          if (!exploredChunkSet.has(`${chunkX},${chunkY}`)) continue;

          const sx = toScreenX(tx);
          const sy = toScreenY(ty);
          const badgeR = Math.max(6.5, 8.5 * camera.zoom);
          const badgeX = sx + Math.max(9, 11 * camera.zoom);
          const badgeY = sy + Math.max(9, 11 * camera.zoom);

          let attitude: 'friendly' | 'neutral' | 'hostile' | 'quest' = 'neutral';
          if (tile.npcs.some((n: any) => n.hasQuest)) attitude = 'quest';
          else if (tile.npcs.some((n: any) => n.relation === 'friend' || n.relation === 'confidant')) attitude = 'friendly';
          else if (tile.npcs.some((n: any) => n.relation === 'enemy')) attitude = 'hostile';

          renderL7NpcBadge(ctx, badgeX, badgeY, badgeR, tile.npcs.length, attitude);
        }
      }

      // 2. Active Monsters on Specific Tiles (Ink Ring, Dynamic Icon, Aggro Radius & Boss Banner)
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          if (!tile || !tile.spawnedMonster || !tile.spawnedMonster.name) continue;
          const chunkX = Math.floor(tx / 16);
          const chunkY = Math.floor(ty / 16);
          if (!exploredChunkSet.has(`${chunkX},${chunkY}`)) continue;

          const sx = toScreenX(tx);
          const sy = toScreenY(ty);
          const m = tile.spawnedMonster;
          const isTargeted = targetTile && targetTile.x === tx && targetTile.y === ty;

          // Aggro danger radius (2 tiles) if targeted
          if (isTargeted) {
            renderL7AggroRadius(
              ctx,
              sx + currentTileSize * 0.5,
              sy + currentTileSize * 0.5,
              currentTileSize * 2.2,
              time
            );
          }

          renderL7MonsterInkRing(
            ctx,
            sx + currentTileSize * 0.5,
            sy + currentTileSize * 0.5,
            currentTileSize * 0.42,
            m.tier || 1,
            Boolean(m.isBoss),
            time
          );

          // Dynamic species icon
          const speciesIcon = getMonsterIcon(m.name, m.key);
          ctx.font = `${Math.max(12, 16 * camera.zoom)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(speciesIcon, sx + currentTileSize / 2, sy + currentTileSize * 0.5);

          // Boss Warning Badge
          if (m.isBoss || (m.tier && m.tier >= 5)) {
            ctx.font = `bold ${Math.max(6, 7.5 * camera.zoom)}px sans-serif`;
            ctx.fillStyle = '#DC2626';
            ctx.fillText('👑 BOSS', sx + currentTileSize / 2, sy + currentTileSize * 0.18);
          }

          const mLabel = m.name;
          ctx.font = `bold ${Math.max(6.5, 8 * camera.zoom)}px sans-serif`;
          const textW = ctx.measureText(mLabel).width;
          const pillW = textW + 6 * camera.zoom;
          const pillH = 10 * camera.zoom;
          const pillX = sx + (currentTileSize - pillW) / 2;
          const pillY = sy + currentTileSize * 0.88 - pillH;

          ctx.fillStyle = 'rgba(15, 5, 5, 0.85)';
          ctx.fillRect(pillX, pillY, pillW, pillH);
          ctx.strokeStyle = (m.isBoss || (m.tier && m.tier >= 4)) ? '#EF4444' : '#F59E0B';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(pillX, pillY, pillW, pillH);
          ctx.fillStyle = '#FCA5A5';
          ctx.fillText(mLabel, sx + currentTileSize / 2, pillY + pillH - 2 * camera.zoom);
        }
      }

      // 3. Spiritual Resource Gathering Nodes (Sparkling Particles)
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          if (!tile || (!tile.resourceType && tile.tileType !== 'resource_node')) continue;
          const chunkX = Math.floor(tx / 16);
          const chunkY = Math.floor(ty / 16);
          if (!exploredChunkSet.has(`${chunkX},${chunkY}`)) continue;

          const sx = toScreenX(tx);
          const sy = toScreenY(ty);
          const isDormant = Boolean(
            tile.nodeRespawnAt && new Date(tile.nodeRespawnAt).getTime() > Date.now()
          );

          renderL7ResourceSparkle(
            ctx,
            sx + currentTileSize * 0.5,
            sy + currentTileSize * 0.5,
            currentTileSize * 0.45,
            tile.resourceType || 'herb',
            time,
            isDormant
          );

          // Resource Pill Label
          if (!isDormant) {
            const resLabel = tile.label || (
              tile.resourceType === 'herb' ? 'Herba Roh' :
              tile.resourceType === 'ore' ? 'Urat Bijih' :
              tile.resourceType === 'wood' ? 'Kayu Roh' :
              tile.resourceType === 'fish' ? 'Lubuk Ikan' : 'Sumber Daya'
            );
            ctx.font = `bold ${Math.max(6, 7.5 * camera.zoom)}px sans-serif`;
            const textW = ctx.measureText(resLabel).width;
            const pillW = textW + 6 * camera.zoom;
            const pillH = 9 * camera.zoom;
            const pillX = sx + (currentTileSize - pillW) / 2;
            const pillY = sy + currentTileSize * 0.88 - pillH;

            ctx.fillStyle = 'rgba(6, 20, 16, 0.85)';
            ctx.fillRect(pillX, pillY, pillW, pillH);
            ctx.strokeStyle = tile.resourceType === 'ore' ? '#F59E0B' : '#10B981';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(pillX, pillY, pillW, pillH);
            ctx.fillStyle = tile.resourceType === 'ore' ? '#FDE68A' : '#A7F3D0';
            ctx.fillText(resLabel, sx + currentTileSize / 2, pillY + pillH - 2 * camera.zoom);
          }
        }
      }

      // 3. Active A* Glowing Path Ribbon
      if (activePath && activePath.length > 1) {
        ctx.save();
        ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
        ctx.shadowBlur = 12 * camera.zoom;
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = Math.max(3.5, 4.8 * camera.zoom);
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        ctx.beginPath();
        activePath.forEach((pt, idx) => {
          const px = toScreenX(pt.x) + currentTileSize / 2;
          const py = toScreenY(pt.y) + currentTileSize / 2;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = Math.max(1, 1.6 * camera.zoom);
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Target Selection Mandala
      if (targetTile) {
        const sx = toScreenX(targetTile.x);
        const sy = toScreenY(targetTile.y);
        ctx.save();
        ctx.translate(sx + currentTileSize / 2, sy + currentTileSize / 2);
        ctx.rotate(time * 1.5);
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)';
        ctx.lineWidth = 2 * camera.zoom;

        ctx.beginPath();
        const r = currentTileSize * 0.45;
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.moveTo(r, 0);
          ctx.quadraticCurveTo(0, 0, 0, r);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 5. Active Player Cell Golden Frame
      const curTileX = Math.round(animatedPlayerPos.current.x);
      const curTileY = Math.round(animatedPlayerPos.current.y);
      const pTileSx = toScreenX(curTileX);
      const pTileSy = toScreenY(curTileY);

      ctx.save();
      ctx.fillStyle = 'rgba(254, 243, 199, 0.35)';
      ctx.fillRect(pTileSx, pTileSy, currentTileSize, currentTileSize);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = Math.max(1.5, 2.4 * camera.zoom);
      ctx.shadowColor = 'rgba(245, 158, 11, 0.65)';
      ctx.shadowBlur = 8 * camera.zoom;
      ctx.strokeRect(pTileSx + 0.5, pTileSy + 0.5, currentTileSize - 1, currentTileSize - 1);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.strokeRect(pTileSx + 3 * camera.zoom, pTileSy + 3 * camera.zoom, currentTileSize - 6 * camera.zoom, currentTileSize - 6 * camera.zoom);
      ctx.restore();

      // ----------------------------------------------------------------------
      // L8: WEATHER OVERLAY (Rain, Snow, Miasma)
      // ----------------------------------------------------------------------
      ctx.save();
      if (weather === 'rain') {
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 200; i++) {
          const rx = (Math.random() * width + time * 300) % width;
          const ry = (Math.random() * height + time * 500) % height;
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 5, ry + 15);
        }
        ctx.stroke();
      } else if (weather === 'snow') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        for (let i = 0; i < 150; i++) {
          const sx = (Math.random() * width + Math.sin(time + i) * 20) % width;
          const sy = (Math.random() * height + time * 100) % height;
          ctx.moveTo(sx, sy);
          ctx.arc(sx, sy, Math.random() * 2 * camera.zoom, 0, Math.PI * 2);
        }
        ctx.fill();
      } else if (weather === 'miasma') {
        const miasmaGradient = ctx.createRadialGradient(width / 2, height / 2, height / 4, width / 2, height / 2, width);
        miasmaGradient.addColorStop(0, 'rgba(120, 50, 150, 0.1)');
        miasmaGradient.addColorStop(1, 'rgba(80, 20, 100, 0.4)');
        ctx.fillStyle = miasmaGradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Night Filter
      if (isNight) {
        ctx.fillStyle = 'rgba(10, 15, 35, 0.65)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-out';
        const px = toScreenX(animatedPlayerPos.current.x) + currentTileSize / 2;
        const py = toScreenY(animatedPlayerPos.current.y) + currentTileSize / 2;
        const lanternGlow = ctx.createRadialGradient(px, py, 10 * camera.zoom, px, py, 100 * camera.zoom);
        lanternGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        lanternGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        lanternGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = lanternGlow;
        ctx.beginPath();
        ctx.arc(px, py, 100 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [camera, tiles, playerPos, targetTile, activePath, exploredChunkSet, isWalking, tileMap, loadedImages, weather, isNight, currentMode]);

  // Mouse & Touch Pan/Zoom Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setCameraStart({ x: camera.x, y: camera.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      const currentTileSize = BASE_TILE_SIZE * camera.zoom;
      const dx = (e.clientX - dragStart.x) / currentTileSize;
      const dy = (e.clientY - dragStart.y) / currentTileSize;
      setCamera(prev => ({
        ...prev,
        x: Math.max(0, Math.min(4999, cameraStart.x - dx)),
        y: Math.max(0, Math.min(4999, cameraStart.y - dy))
      }));
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const screenX = (e.clientX - rect.left) * scaleX;
    const screenY = (e.clientY - rect.top) * scaleY;

    const currentTileSize = BASE_TILE_SIZE * camera.zoom;
    const viewTilesX = canvas.width / currentTileSize;
    const viewTilesY = canvas.height / currentTileSize;

    const hoverX = Math.floor(camera.x - viewTilesX / 2 + screenX / currentTileSize);
    const hoverY = Math.floor(camera.y - viewTilesY / 2 + screenY / currentTileSize);

    if (currentMode === 'macro') {
      const reg = CANONICAL_REGIONS.find((r: any) =>
        hoverX >= r.bounds.minX && hoverX <= r.bounds.maxX &&
        hoverY >= r.bounds.minY && hoverY <= r.bounds.maxY
      );
      setHoveredRegion(reg || null);
    } else {
      const tile = tileMap.get(`${hoverX},${hoverY}`);
      if (tile && onTileHover) {
        onTileHover(tile);
        setHoveredTile(tile);
      } else {
        if (onTileHover) onTileHover(null);
        setHoveredTile(null);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const moveDist = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
    setIsDragging(false);

    if (moveDist < 6 && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const screenX = (e.clientX - rect.left) * scaleX;
      const screenY = (e.clientY - rect.top) * scaleY;
      const currentTileSize = BASE_TILE_SIZE * camera.zoom;
      const viewTilesX = canvas.width / currentTileSize;
      const viewTilesY = canvas.height / currentTileSize;

      const clickX = Math.floor(camera.x - viewTilesX / 2 + screenX / currentTileSize);
      const clickY = Math.floor(camera.y - viewTilesY / 2 + screenY / currentTileSize);

      if (clickX >= 0 && clickX < 5000 && clickY >= 0 && clickY < 5000) {
        if (currentMode === 'macro') {
          const reg = CANONICAL_REGIONS.find((r: any) =>
            clickX >= r.bounds.minX && clickX <= r.bounds.maxX &&
            clickY >= r.bounds.minY && clickY <= r.bounds.maxY
          );
          if (reg && onSelectRegion) {
            onSelectRegion(reg.regionSlug, reg.centerX, reg.centerY);
          }
        } else {
          const selectedTile = tileMap.get(`${clickX},${clickY}`) || {
            tileX: clickX,
            tileY: clickY,
            terrainType: 'plains',
            tileType: 'walkable'
          };
          onTileClick?.(selectedTile);
        }
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        cameraStartX: camera.x,
        cameraStartY: camera.y,
        movedDist: 0,
        initialPinchDist: null,
        initialZoom: camera.zoom,
        isPinching: false
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchState.current.initialPinchDist = dist;
      touchState.current.initialZoom = camera.zoom;
      touchState.current.isPinching = true;
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && !touchState.current.isPinching) {
      const touch = e.touches[0];
      const dxPixels = touch.clientX - touchState.current.startX;
      const dyPixels = touch.clientY - touchState.current.startY;
      touchState.current.movedDist += Math.hypot(dxPixels, dyPixels);

      const currentTileSize = BASE_TILE_SIZE * camera.zoom;
      const dxTiles = dxPixels / currentTileSize;
      const dyTiles = dyPixels / currentTileSize;

      setCamera(prev => ({
        ...prev,
        x: Math.max(0, Math.min(4999, touchState.current.cameraStartX - dxTiles)),
        y: Math.max(0, Math.min(4999, touchState.current.cameraStartY - dyTiles))
      }));
    } else if (e.touches.length === 2 && touchState.current.initialPinchDist) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = currentDist / touchState.current.initialPinchDist;
      const minZ = currentMode === 'macro' ? 0.08 : 0.2;
      const maxZ = currentMode === 'macro' ? 0.6 : 2.5;
      const newZoom = Math.min(maxZ, Math.max(minZ, +(touchState.current.initialZoom * scale).toFixed(2)));
      setCamera(prev => ({ ...prev, zoom: newZoom }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    if (!touchState.current.isPinching && touchState.current.movedDist < 12 && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const touch = e.changedTouches[0];
      if (!touch) return;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const screenX = (touch.clientX - rect.left) * scaleX;
      const screenY = (touch.clientY - rect.top) * scaleY;

      const currentTileSize = BASE_TILE_SIZE * camera.zoom;
      const viewTilesX = canvas.width / currentTileSize;
      const viewTilesY = canvas.height / currentTileSize;

      const clickX = Math.floor(camera.x - viewTilesX / 2 + screenX / currentTileSize);
      const clickY = Math.floor(camera.y - viewTilesY / 2 + screenY / currentTileSize);

      if (clickX >= 0 && clickX < 5000 && clickY >= 0 && clickY < 5000) {
        if (currentMode === 'macro') {
          const reg = CANONICAL_REGIONS.find((r: any) =>
            clickX >= r.bounds.minX && clickX <= r.bounds.maxX &&
            clickY >= r.bounds.minY && clickY <= r.bounds.maxY
          );
          if (reg && onSelectRegion) {
            onSelectRegion(reg.regionSlug, reg.centerX, reg.centerY);
          }
        } else {
          const selectedTile = tileMap.get(`${clickX},${clickY}`) || {
            tileX: clickX,
            tileY: clickY,
            terrainType: 'plains',
            tileType: 'walkable'
          };
          onTileClick?.(selectedTile);
        }
      }
    }
    touchState.current.isPinching = false;
    touchState.current.initialPinchDist = null;
  };

  const handleZoomIn = () => {
    setCamera(prev => ({
      ...prev,
      zoom: Math.min(currentMode === 'macro' ? 0.6 : 2.5, +(prev.zoom + 0.1).toFixed(2))
    }));
  };

  const handleZoomOut = () => {
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(currentMode === 'macro' ? 0.08 : 0.2, +(prev.zoom - 0.1).toFixed(2))
    }));
  };

  const getBuildLoreReason = (tile: TileData | null) => {
    if (!tile) return '';
    if (tile.isClaimable) {
      if (tile.dangerTier === 2) {
        return 'Tanah perbatasan (Frontier Tier 2). Pajak pembangunan x1.2.';
      }
      return 'Tanah subur dan kokoh di dataran aman (Tier 1), siap untuk didirikan bangunan.';
    }
    if (tile.isSolid) {
      return 'Tanah terhalang oleh formasi batu cadas/pegunungan solid yang mustahil ditembus.';
    }
    if (tile.dangerTier && tile.dangerTier >= 3) {
      return 'Wilayah ini terlalu ganas (Tier 3+) dan dipenuhi energi iblis untuk pemukiman manusia.';
    }
    if (tile.terrainType?.includes('river') || tile.terrainType?.includes('road')) {
      return 'Dilarang mendirikan bangunan di atas aliran air atau jalan umum Jianghu.';
    }
    return 'Berada di dalam zona penyangga (buffer) pemukiman/sekte/celah terlarang.';
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-[#EAE1CE] flex flex-col items-center justify-center font-sans"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={e => e.preventDefault()}
        className="w-full h-full cursor-crosshair active:cursor-grabbing border border-[#383329] shadow-2xl touch-none"
      />

      {/* L9: HUD CONTROLS (Vertical Floating Wuxia Dock on Left) */}
      <div className="absolute top-1/2 -translate-y-1/2 left-2 sm:left-3 z-20 flex flex-col items-center gap-1 pointer-events-auto bg-[#18140E]/90 p-1 rounded-xl border border-[#453826]/70 shadow-xl backdrop-blur-md">
        <button
          onClick={handleZoomIn}
          className="w-7 h-7 sm:w-8 sm:h-8 bg-[#292218] hover:bg-[#3D3324] text-[#D8C3A5] rounded-lg text-sm sm:text-base font-bold flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm"
          title="Perbesar Peta (+)"
        >
          +
        </button>
        <button
          onClick={() => setCamera(prev => ({ ...prev, zoom: currentMode === 'macro' ? 0.18 : 1.0 }))}
          className="px-1 py-0.5 text-[10px] sm:text-xs font-mono text-[#A89578] hover:text-[#E0D3BC] transition-colors"
          title="Reset Zoom"
        >
          {Math.round(camera.zoom * 100)}%
        </button>
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 sm:w-8 sm:h-8 bg-[#292218] hover:bg-[#3D3324] text-[#D8C3A5] rounded-lg text-sm sm:text-base font-bold flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm"
          title="Perkecil Peta (-)"
        >
          -
        </button>
        <div className="w-5 h-px bg-[#453826]/70 my-0.5" />
        <button
          onClick={centerOnPlayer}
          className="w-7 h-7 sm:w-8 sm:h-8 bg-[#292218] hover:bg-[#3D3324] text-[#D8C3A5] rounded-lg text-xs flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm"
          title="Pusatkan Kamera ke Karakter"
        >
          🎯
        </button>
        <button
          onClick={handleToggleMode}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm ${
            currentMode === 'macro'
              ? 'bg-amber-700 text-white border border-amber-400'
              : 'bg-[#292218] hover:bg-[#3D3324] text-[#D8C3A5]'
          }`}
          title={currentMode === 'macro' ? 'Kembali ke Eksplorasi Grid' : 'Buka Peta Makro 5000×5000'}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsBuildMode(prev => !prev)}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm ${
            isBuildMode
              ? 'bg-emerald-700 text-white border border-emerald-400 ring-2 ring-emerald-500/50'
              : 'bg-[#292218] hover:bg-[#3D3324] text-[#D8C3A5]'
          }`}
          title={isBuildMode ? 'Matikan Mode Bangun (B)' : 'Aktifkan Mode Bangun (B)'}
        >
          🏗️
        </button>
      </div>

      {/* Mode Bangun Hover Info Card (Fase 18) */}
      {isBuildMode && hoveredTile && currentMode === 'zone' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#0E121A]/95 border border-amber-600/70 p-3 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-1 min-w-[320px] max-w-[420px] animate-in fade-in">
          <div className="flex justify-between items-center">
            <span className="font-serif font-bold text-amber-200 text-sm">
              Kavling ({hoveredTile.tileX}, {hoveredTile.tileY}) • {hoveredTile.terrainType}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              hoveredTile.isClaimable
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : 'bg-red-950 text-red-300 border-red-500'
            }`}>
              {hoveredTile.isClaimable ? '✅ DAPAT DIBANGUN' : '🚫 DILARANG BANGUN'}
            </span>
          </div>
          <div className="text-xs text-gray-300 mt-1">
            {getBuildLoreReason(hoveredTile)}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">
            Tekan B untuk keluar dari Mode Bangun.
          </div>
        </div>
      )}

      {/* Macro Mode Region Tooltip */}
      {currentMode === 'macro' && hoveredRegion && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#0E121A]/95 border border-amber-600/70 p-3 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-1 min-w-[260px] animate-in fade-in">
          <div className="flex justify-between items-center">
            <span className="font-serif font-bold text-amber-200 text-sm">
              {hoveredRegion.displayName} {hoveredRegion.chineseName && `(${hoveredRegion.chineseName})`}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              hoveredRegion.dangerTier === 1 ? 'bg-emerald-950 text-emerald-300 border-emerald-500' :
              hoveredRegion.dangerTier === 2 ? 'bg-cyan-950 text-cyan-300 border-cyan-500' :
              hoveredRegion.dangerTier === 3 ? 'bg-amber-950 text-amber-300 border-amber-500' :
              hoveredRegion.dangerTier === 4 ? 'bg-red-950 text-red-300 border-red-500' :
              'bg-purple-950 text-purple-300 border-purple-500'
            }`}>
              Tier {hoveredRegion.dangerTier}
            </span>
          </div>
          <div className="text-[11px] text-gray-300">
            Suhu: {hoveredRegion.tempRangeC?.min}°C ~ {hoveredRegion.tempRangeC?.max}°C • Kerapatan Qi: {hoveredRegion.qiDensityModifier}x
          </div>
          {hoveredRegion.resourceTags && hoveredRegion.resourceTags.length > 0 && (
            <div className="text-[10px] text-amber-400/80 truncate">
              Sumber Daya: {hoveredRegion.resourceTags.slice(0, 4).join(', ')}
            </div>
          )}
          <div className="text-[10px] text-gray-400 italic mt-1">
            Klik untuk membuka grid region ini ({hoveredRegion.centerX}, {hoveredRegion.centerY})
          </div>
        </div>
      )}
    </div>
  );
}
