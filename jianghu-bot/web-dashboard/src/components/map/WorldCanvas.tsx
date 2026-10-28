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
  resolveMonsterAtlasFrameWithFallback,
  renderWorldEdgeClouds,
  scaleCanon
} from '@/lib/proceduralObjects';
import { CANONICAL_REGIONS, CANONICAL_LANDMARKS } from '@/config/canonicalRegions';
import { Compass, ZoomIn, ZoomOut, Target, Map as MapIcon, Layers, Navigation, Hammer } from 'lucide-react';
import { atlasLoader } from '@/lib/atlasLoader';
import { groundTextures } from '@/lib/groundTextures';
import { isDefIdQuarantined } from '@/config/assetQuarantine';
import { chunkManager, CHUNK_SIZE, MAX_CHUNK_X, MAX_CHUNK_Y } from '@/lib/chunkManager';
import {
  renderL1TerrainBase,
  renderL2BiomeTransitions,
  renderL3GroundDecal,
  renderL4AutotileGround,
  renderBiomeAmbientFog,
  getRegionColorAt
} from '@/lib/groundRenderer';
import WorldMapLoadingScreen from './WorldMapLoadingScreen';
import { getWorldRasterImageSync, loadWorldRasterImage } from '@/lib/worldRasterLoader';
import { computeSpriteRect, GridEntry } from '@/lib/gridRect';
import gridCanonData from '@/config/gridCanon.json';

const gridCanon = (gridCanonData.frames || {}) as Record<string, GridEntry>;
export const ZONE_DEFAULT_ZOOM = 1.4;

// Re-export TileData for backward compatibility
export type { TileData };

export interface WorldCanvasProps {
  mode?: CanvasViewMode;
  tiles: TileData[];
  playerPos: { x: number; y: number };
  playerReady?: boolean;
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
  debugCam?: { x: number; y: number; zoom: number };
  paused?: boolean;
}

interface YSortEntry {
  type: 'object' | 'player' | 'monster' | 'npc';
  sortKey: number;
  tileX: number;
  tileY: number;
  footprintBottomY: number;
  data: any;
}

const RESOURCE_ICON_FRAMES: Record<string, string[]> = {
  herb: ['icon_res_herb', 'resource_ancient_herb_garden'],
  ore:  ['icon_res_ore', 'resource_iron_ore', 'resource_heavenly_iron_ore'],
  wood: ['icon_res_wood', 'resource_spirit_wood', 'resource_ironwood_log'],
  fish: ['icon_res_fish', 'resource_golden_carp', 'resource_spirit_koi_pool'],
};

function getRegionAt(wx: number, wy: number) {
  for (const reg of CANONICAL_REGIONS) {
    if (wx >= reg.bounds.minX && wx <= reg.bounds.maxX && wy >= reg.bounds.minY && wy <= reg.bounds.maxY) {
      return reg;
    }
  }
  return CANONICAL_REGIONS[0];
}

function getObjectPriority(def: WorldObjectDef): number {
  if (def.tags?.includes('landmark') || def.tags?.includes('setpiece')) return 1;
  if (def.tags?.includes('building') || def.tags?.includes('structure') || def.id.includes('house') || def.id.includes('gate') || def.id.includes('tower')) return 2;
  if (def.tags?.includes('tree') || def.id.includes('tree') || def.id.includes('pine') || def.id.includes('bamboo')) return 3;
  if (def.tags?.includes('rock') || def.id.includes('rock') || def.id.includes('pillar') || def.id.includes('cliff')) return 4;
  return 5;
}

export default function WorldCanvas({
  mode = 'zone',
  tiles,
  playerPos,
  playerReady = true,
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
  onSelectRegion,
  debugCam,
  paused = false
}: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const BASE_TILE_SIZE = 54;
  const { loadedImages } = useGlobalAssetLoader();
  const nightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const warnedMissingDefsRef = useRef<Set<string>>(new Set());
  const fallbackSpritesCountRef = useRef<number>(0);

  // Active View Mode state (Macro vs Zone)
  const [currentMode, setCurrentMode] = useState<CanvasViewMode>(mode);
  useEffect(() => {
    setCurrentMode(mode);
    if (mode === 'macro') {
      setCamera(prev => ({ ...prev, zoom: 0.18 }));
    } else {
      setCamera(prev => ({ ...prev, zoom: ZONE_DEFAULT_ZOOM }));
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
    x: debugCam ? debugCam.x : (focusTile ? focusTile.x : playerPos.x),
    y: debugCam ? debugCam.y : (focusTile ? focusTile.y : playerPos.y),
    zoom: debugCam ? debugCam.zoom : (mode === 'macro' ? 0.18 : ZONE_DEFAULT_ZOOM)
  });

  const hasFiredReadyRef = useRef(false);
  const fpsRef = useRef(60);
  const lastFrameTimeRef = useRef(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const ambientParticlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    color: string;
    rot: number;
    vRot: number;
  }>>([]);

  useEffect(() => {
    if (debugCam) {
      setCamera({
        x: debugCam.x,
        y: debugCam.y,
        zoom: debugCam.zoom
      });
      animatedPlayerPos.current = { x: debugCam.x, y: debugCam.y };
      hasFiredReadyRef.current = false;
      if (typeof window !== 'undefined') {
        (window as any).__chunksReady = false;
        (window as any).__panCameraTo = (x: number, y: number) => {
          setCamera(prev => ({ ...prev, x, y }));
          animatedPlayerPos.current = { x, y };
        };
        (window as any).__dbg = {
          getChunkBitmap: (cx: number, cy: number) => chunkManager.getChunkBitmap(cx, cy, 54)
        };
      }
    }
  }, [debugCam?.x, debugCam?.y, debugCam?.zoom]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cameraStart, setCameraStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<TileData | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<any | null>(null);

  // Unified Effective Tile Size: Scales 5000x5000 continent in Macro mode, 54px in Zone mode
  const getEffectiveTileSize = useCallback((w: number, h: number, z: number, m: CanvasViewMode) => {
    if (m === 'macro') {
      return (Math.min(w, h) * 0.92 / 5000) * (z / 0.18);
    }
    return BASE_TILE_SIZE * z;
  }, []);

  // Build Mode State (Fase 18)
  const [isBuildMode, setIsBuildMode] = useState(false);

  // V12 P9: Grid Overlay State (Default ON, persist in localStorage, overridden by ?grid=0|1)
  const [showGrid, setShowGrid] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has('grid')) {
          return params.get('grid') === '1';
        }
        const saved = localStorage.getItem('jianghu_show_grid');
        if (saved !== null) {
          return saved === 'true';
        }
      } catch (e) {}
    }
    return true; // Default ON (Tale of Immortal style)
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jianghu_show_grid', String(showGrid));
      } catch (e) {}
      (window as any).__setShowGrid = setShowGrid;
      (window as any).__getShowGrid = () => showGrid;
    }
  }, [showGrid]);

  // Preload Core WebP Atlases & Ground Textures on Mount (Fase 19 / V9 / V11 / V12)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).atlasReady = false;
    }
    atlasLoader.preloadCoreAtlases().then(() => {
      if (typeof window !== 'undefined') {
        (window as any).atlasReady = true;
      }
    }).catch(() => {});
    groundTextures.load().then(() => {
      chunkManager.clearCache();
    }).catch(() => {});
    loadWorldRasterImage().catch(() => {});
  }, []);

  // Keyboard shortcut: 'B' toggles Mode Bangun, 'G' toggles Grid Overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'b' || e.key === 'B') {
        setIsBuildMode(prev => !prev);
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGrid(prev => !prev);
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

  // Camera Initial Snapped Ref & Animation State (Bug 1 Fix)
  const hasInitialCentered = useRef(false);
  const cameraAnimFrameRef = useRef<number | null>(null);
  const prevPlayerPos = useRef({ x: playerPos.x, y: playerPos.y });
  const debugCamFrameCountRef = useRef(0);
  const debugCamMountTimeRef = useRef(performance.now());

  // Smooth camera pan animation helper (250ms easing cubic-out)
  const animateCameraTo = useCallback((targetX: number, targetY: number, targetZoom?: number, durationMs = 250) => {
    if (cameraAnimFrameRef.current) {
      cancelAnimationFrame(cameraAnimFrameRef.current);
    }
    setCamera(currentCam => {
      const startX = currentCam.x;
      const startY = currentCam.y;
      const startZoom = currentCam.zoom;
      const endZoom = targetZoom !== undefined ? targetZoom : startZoom;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const ease = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
        setCamera({
          x: startX + (targetX - startX) * ease,
          y: startY + (targetY - startY) * ease,
          zoom: startZoom + (endZoom - startZoom) * ease
        });
        if (progress < 1) {
          cameraAnimFrameRef.current = requestAnimationFrame(step);
        } else {
          cameraAnimFrameRef.current = null;
        }
      };

      cameraAnimFrameRef.current = requestAnimationFrame(step);
      return currentCam;
    });
  }, []);

  // Cleanup camera animation frame on unmount
  useEffect(() => {
    return () => {
      if (cameraAnimFrameRef.current) {
        cancelAnimationFrame(cameraAnimFrameRef.current);
      }
    };
  }, []);

  // Snap camera once playerReady becomes true (Bug 1 Fix)
  useEffect(() => {
    if (playerReady && !hasInitialCentered.current) {
      const targetX = focusTile ? focusTile.x : playerPos.x;
      const targetY = focusTile ? focusTile.y : playerPos.y;
      setCamera({
        x: targetX,
        y: targetY,
        zoom: currentMode === 'macro' ? 0.18 : 1.0
      });
      animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
      hasInitialCentered.current = true;
    }
  }, [playerReady, playerPos.x, playerPos.y, focusTile, currentMode]);

  // Recenter Camera Callback with 250ms smooth transition
  const centerOnPlayer = useCallback(() => {
    const targetX = focusTile ? focusTile.x : playerPos.x;
    const targetY = focusTile ? focusTile.y : playerPos.y;
    animateCameraTo(targetX, targetY, currentMode === 'macro' ? 0.18 : 1.0, 250);
    animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
    onRecenterPlayer?.();
  }, [playerPos.x, playerPos.y, focusTile, currentMode, animateCameraTo, onRecenterPlayer]);

  // Auto-sync Camera on Focus Tile Changes
  const prevFocusTile = useRef<Point | null>(focusTile);
  useEffect(() => {
    if (focusTile) {
      animateCameraTo(focusTile.x, focusTile.y, undefined, 250);
    } else if (prevFocusTile.current && !focusTile) {
      animateCameraTo(playerPos.x, playerPos.y, undefined, 250);
      animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
    }
    prevFocusTile.current = focusTile;
  }, [focusTile?.x, focusTile?.y, playerPos.x, playerPos.y, animateCameraTo]);

  // Teleport detection: player position changed by > 1 tile while not walking
  useEffect(() => {
    const dx = Math.abs(playerPos.x - prevPlayerPos.current.x);
    const dy = Math.abs(playerPos.y - prevPlayerPos.current.y);
    if ((dx > 1 || dy > 1) && !isWalking && !isDragging && hasInitialCentered.current) {
      animateCameraTo(playerPos.x, playerPos.y, undefined, 250);
      animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
    }
    prevPlayerPos.current = { x: playerPos.x, y: playerPos.y };
  }, [playerPos.x, playerPos.y, isWalking, isDragging, animateCameraTo]);

  // Sync Camera when Walking (anti-jerk: do not override if user is actively dragging)
  useEffect(() => {
    if (isWalking && !isDragging) {
      setCamera(prev => ({
        ...prev,
        x: prev.x + (playerPos.x - prev.x) * 0.25,
        y: prev.y + (playerPos.y - prev.y) * 0.25
      }));
    }
  }, [playerPos.x, playerPos.y, isWalking, isDragging]);

  // Toggle Mode Handler with smooth transition
  const handleToggleMode = () => {
    const nextMode = currentMode === 'zone' ? 'macro' : 'zone';
    setCurrentMode(nextMode);
    onModeChange?.(nextMode);
    const targetX = focusTile ? focusTile.x : playerPos.x;
    const targetY = focusTile ? focusTile.y : playerPos.y;
    const targetZoom = nextMode === 'macro' ? 0.18 : 1.0;
    animateCameraTo(targetX, targetY, targetZoom, 250);
  };

  // Fase C2: Sinkronisasi kamera ke chunkManager untuk progressive chunk streaming
  useEffect(() => {
    if (camera.x !== undefined && camera.y !== undefined) {
      chunkManager.updateCamera(camera.x, camera.y, camera.zoom);
    }
  }, [Math.floor(camera.x / 16), Math.floor(camera.y / 16), camera.zoom]);

  // Fase C2: Repaint trigger saat chunk baru selesai dimuat
  const [, setChunkTick] = useState(0);
  useEffect(() => {
    const unsub = chunkManager.subscribe(() => {
      setChunkTick(t => (t + 1) % 1000);
    });
    return () => unsub();
  }, []);

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
      if (paused) return;
      const frameStartTime = performance.now();
      fallbackSpritesCountRef.current = 0;
      time += 0.02;
      const width = canvas.width;
      const height = canvas.height;
      const currentTileSize = getEffectiveTileSize(width, height, camera.zoom, currentMode);

      // Ensure crisp high quality bicubic interpolation across all canvas layers
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

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

      // Fase A (Bug 2 / B7): Array penampung simpul sumber daya untuk lapisan label terpisah
      const eligibleResourceLabels: Array<{
        tile: TileData;
        screenX: number;
        screenY: number;
        dist: number;
        label: string;
      }> = [];
      const seenLabelCells = new Set<string>();

      // Fase H4: Array penampung sumber cahaya multi-lamp (max 24)
      const visibleLights: Array<{
        sx: number;
        sy: number;
        radius: number;
        color: string;
        flicker: number;
      }> = [];

      // ======================================================================
      // BRANCH: MACRO MODE (CONTINENT OVERVIEW 5000x5000)
      // ======================================================================
      if (currentMode === 'macro') {
        // 0. Base Macro Continent Organic Raster (Fase H5)
        const rasterImg = getWorldRasterImageSync();
        if (rasterImg && rasterImg.complete && rasterImg.naturalWidth > 0) {
          const rx0 = toScreenX(0);
          const ry0 = toScreenY(0);
          const rx1 = toScreenX(5000);
          const ry1 = toScreenY(5000);
          ctx.drawImage(rasterImg, rx0, ry0, rx1 - rx0, ry1 - ry0);
        } else {
          renderL0XuanPaper(ctx, canvas.width, canvas.height, camera.zoom);
        }

        // 1. Draw 29 Canonical Regions Bounds & Calligraphy Labels
        CANONICAL_REGIONS.forEach((reg: any) => {
          const rx = toScreenX(reg.bounds.minX);
          const ry = toScreenY(reg.bounds.minY);
          const rw = (reg.bounds.maxX - reg.bounds.minX) * currentTileSize;
          const rh = (reg.bounds.maxY - reg.bounds.minY) * currentTileSize;

          const isHovered = hoveredRegion?.regionSlug === reg.regionSlug;

          ctx.save();
          if (isHovered) {
            ctx.fillStyle = reg.palette?.accent ? `${reg.palette.accent}26` : 'rgba(212, 177, 106, 0.15)';
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 1.8;
            ctx.strokeRect(rx, ry, rw, rh);
          } else {
            // Subtle boundary calligraphy stroke
            ctx.strokeStyle = reg.palette?.accent ? `${reg.palette.accent}44` : 'rgba(212, 177, 106, 0.25)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(rx, ry, rw, rh);
          }

          // Regional Calligraphy Label
          const cx = rx + rw / 2;
          const cy = ry + rh / 2;
          ctx.fillStyle = isHovered ? '#FFFFFF' : '#F3E8D0';
          ctx.font = `bold ${Math.max(10, 14 * camera.zoom * 2.5)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(reg.displayName, cx, cy - 8);

          if (reg.chineseName) {
            ctx.fillStyle = isHovered ? '#F59E0B' : '#D4B16A';
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
          let char = '城';
          let badgeBg = '#1E293B';
          let badgeBorder = '#D4B16A';
          if (lm.type === 'sect') {
            char = '宗';
            badgeBg = '#451A03';
            badgeBorder = '#F59E0B';
          } else if (lm.type === 'secret_realm') {
            char = '秘';
            badgeBg = '#3B0764';
            badgeBorder = '#C084FC';
          } else if (lm.type === 'port') {
            char = '津';
            badgeBg = '#0C4A6E';
            badgeBorder = '#38BDF8';
          } else if (lm.type === 'pass') {
            char = '关';
            badgeBg = '#7F1D1D';
            badgeBorder = '#F87171';
          } else if (lm.type === 'village') {
            char = '村';
            badgeBg = '#064E3B';
            badgeBorder = '#34D399';
          }

          const badgeR = Math.max(7, 10 * camera.zoom * 2);
          ctx.beginPath();
          ctx.arc(lx, ly, badgeR, 0, Math.PI * 2);
          ctx.fillStyle = badgeBg;
          ctx.fill();
          ctx.strokeStyle = badgeBorder;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = '#FEF08A';
          ctx.font = `bold ${Math.max(8, 10 * camera.zoom * 2)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(char, lx, ly + 0.5);

          // Landmark Label Tag
          ctx.font = `bold ${Math.max(8, 9 * camera.zoom * 2)}px sans-serif`;
          const textW = ctx.measureText(lm.name).width;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(lx - textW / 2 - 4, ly + badgeR + 3, textW + 8, 12);
          ctx.strokeStyle = badgeBorder;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(lx - textW / 2 - 4, ly + badgeR + 3, textW + 8, 12);
          ctx.fillStyle = '#FEF08A';
          ctx.fillText(lm.name, lx, ly + badgeR + 11);
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
      // L1: CHUNK GROUND BITMAPS (G0-G3 & Static G4 Autotiles)
      // ----------------------------------------------------------------------
      const minChunkX = Math.max(0, Math.floor(minTileX / CHUNK_SIZE));
      const maxChunkX = Math.min(MAX_CHUNK_X, Math.floor(maxTileX / CHUNK_SIZE));
      const minChunkY = Math.max(0, Math.floor(minTileY / CHUNK_SIZE));
      const maxChunkY = Math.min(MAX_CHUNK_Y, Math.floor(maxTileY / CHUNK_SIZE));

      const renderedChunkKeys = new Set<string>();

      for (let cy = minChunkY; cy <= maxChunkY; cy++) {
        for (let cx = minChunkX; cx <= maxChunkX; cx++) {
          const bitmap = chunkManager.getChunkBitmap(cx, cy, 54);
          if (bitmap) {
            const csx = toScreenX(cx * CHUNK_SIZE);
            const csy = toScreenY(cy * CHUNK_SIZE);
            const csw = CHUNK_SIZE * currentTileSize;
            const csh = CHUNK_SIZE * currentTileSize;
            ctx.drawImage(bitmap, csx, csy, csw, csh);
            renderedChunkKeys.add(`${cx}:${cy}`);
          }
        }
      }

      // ----------------------------------------------------------------------
      // L2: FALLBACK PER-TILE & DYNAMIC GROUND OVERLAYS (G4 Waves, Territory, Plots)
      // ----------------------------------------------------------------------
      const getNeighborTerrain = (wx: number, wy: number) => {
        const t = tileMap.get(`${wx},${wy}`) || chunkManager.getTile(wx, wy);
        return t?.terrainType;
      };

      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const cx = Math.floor(tx / CHUNK_SIZE);
          const cy = Math.floor(ty / CHUNK_SIZE);
          const chunkHasBitmap = renderedChunkKeys.has(`${cx}:${cy}`);

          const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
          const sx = toScreenX(tx);
          const sy = toScreenY(ty);

          if (!tile) {
            if (camera.zoom >= 0.35 && tx >= 0 && tx < 5000 && ty >= 0 && ty < 5000) {
              ctx.strokeStyle = 'rgba(180, 160, 130, 0.12)';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(sx, sy, currentTileSize, currentTileSize);
            }
            continue;
          }

          // If chunk bitmap was not cached/drawn, render procedural ground layers
          if (!chunkHasBitmap) {
            renderL1TerrainBase(ctx, sx, sy, currentTileSize, tile.terrainType, tx, ty);
            renderL2BiomeTransitions(ctx, sx, sy, currentTileSize, tx, ty, tile.terrainType, getNeighborTerrain);
            renderL3GroundDecal(ctx, sx, sy, currentTileSize, tx, ty, tile.terrainType);
          }

          // Dynamic G4 River Wave Shimmer (animated ripple arcs)
          const isWater = tile.terrainType.includes('river') || tile.terrainType.includes('water') || tile.terrainType.includes('lake') || tile.terrainType.includes('sea');
          if (isWater) {
            renderL4AutotileGround(ctx, sx, sy, currentTileSize, tx, ty, tile.terrainType, time, getNeighborTerrain);
          } else if (!chunkHasBitmap && tile.terrainType.includes('road')) {
            renderL4AutotileGround(ctx, sx, sy, currentTileSize, tx, ty, tile.terrainType, time, getNeighborTerrain);
          }

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

          // Claimed Land / Farmland
          if (tile.isClaimable && !tile.buildingName && !tile.isUnderConstruction && tile.ownerId) {
            ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
            const pw = currentTileSize * 0.7;
            const ph = Math.max(9, 11 * camera.zoom);
            const px = sx + (currentTileSize - pw) / 2;
            const py = sy + currentTileSize * 0.45;
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle = '#34D399';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(px, py, pw, ph);
            ctx.fillStyle = '#A7F3D0';
            ctx.font = `bold ${Math.max(7, 8 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('MILIK', sx + currentTileSize / 2, py + ph / 2);
          }
          if (tile.cropType) {
            ctx.fillStyle = '#F59E0B';
            ctx.font = `bold ${Math.max(8, 11 * camera.zoom)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('田', sx + currentTileSize * 0.5, sy + currentTileSize * 0.55);
          }
        }
      }

      // Region Color Tint Multiply (4-6% multiply overlay with smooth 12-tile organic blend)
      const blendedRegionColor = getRegionColorAt(camera.x, camera.y);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = blendedRegionColor;
      ctx.globalAlpha = 0.05;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // ----------------------------------------------------------------------
      // L2.8: SHAN SHUI GRID LINES (Tale of Immortal Style, Cached Chunk Bitmaps)
      // ----------------------------------------------------------------------
      if (showGrid && camera.zoom >= 0.25) {
        ctx.save();
        if (camera.zoom >= 0.50) {
          // Full grid: draw cached chunk grid bitmaps
          for (let cy = minChunkY; cy <= maxChunkY; cy++) {
            for (let cx = minChunkX; cx <= maxChunkX; cx++) {
              const gridBmp = chunkManager.getChunkGridBitmap(cx, cy, 54);
              if (gridBmp) {
                const csx = Math.round(toScreenX(cx * CHUNK_SIZE)) + 0.5;
                const csy = Math.round(toScreenY(cy * CHUNK_SIZE)) + 0.5;
                const csw = Math.round(CHUNK_SIZE * currentTileSize);
                const csh = Math.round(CHUNK_SIZE * currentTileSize);
                ctx.drawImage(gridBmp, csx, csy, csw, csh);
              }
            }
          }
        } else {
          // Zoom between 0.25 and 0.50: only draw major 8-cell lines
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(40, 30, 20, 0.22)';
          const startMajorX = Math.floor(minTileX / 8) * 8;
          const endMajorX = Math.ceil((maxTileX + 1) / 8) * 8;
          for (let tx = startMajorX; tx <= endMajorX; tx += 8) {
            const sx = Math.round(toScreenX(tx)) + 0.5;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, height);
            ctx.stroke();
          }
          const startMajorY = Math.floor(minTileY / 8) * 8;
          const endMajorY = Math.ceil((maxTileY + 1) / 8) * 8;
          for (let ty = startMajorY; ty <= endMajorY; ty += 8) {
            const sy = Math.round(toScreenY(ty)) + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(width, sy);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // ----------------------------------------------------------------------
      // L2.5: BUILD ZONE OVERLAY (When isBuildMode is active - Fase 18)
      // ----------------------------------------------------------------------
      if (isBuildMode) {
        ctx.save();
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          for (let tx = minTileX; tx <= maxTileX; tx++) {
            const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
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
      // L3 & L4: Y-SORTED OBJECTS & ENTITIES (Frustum Culling & 1,500 Sprite Budget - Fase G)
      // ----------------------------------------------------------------------
      const ySortQueue: YSortEntry[] = [];
      const MAX_SPRITE_BUDGET = 1500;
      const candidateObjects: Array<{
        def: WorldObjectDef;
        instance: MapObjectInstance;
        priority: number;
        bottomY: number;
      }> = [];

      const objMinTileX = Math.max(0, minTileX - 6);
      const objMaxTileX = Math.min(4999, maxTileX + 6);
      const objMinTileY = Math.max(0, minTileY - 6);
      const objMaxTileY = Math.min(4999, maxTileY + 6);

      for (let ty = objMinTileY; ty <= objMaxTileY; ty++) {
        for (let tx = objMinTileX; tx <= objMaxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
          if (!tile) continue;

          // Check if tile has explicit map objects (H0: procedural fallback & O(n^2) anti-clumping removed)
          if (tile.objects && tile.objects.length > 0) {
            for (const obj of tile.objects) {
              if (isDefIdQuarantined(obj.defId)) {
                continue;
              }

              let def = OBJECT_DEFINITIONS[obj.defId];
              if (!def && scaleCanon[obj.defId]) {
                const sc = scaleCanon[obj.defId];
                def = {
                  id: obj.defId,
                  name: obj.defId,
                  px: { w: sc.srcW || 256, h: sc.srcH || 256 },
                  footprint: { cw: Math.max(1, Math.round(sc.visualW || 2)), ch: Math.max(1, Math.round(sc.visualH || 2)) },
                  anchor: sc.anchor || { x: 0.5, y: 0.95 },
                  overhangCells: 0.5,
                  collision: sc.collision || 'solid',
                  staminaMult: 1.0,
                  sortBias: 0,
                  fogFoot: true,
                  tags: [sc.category || 'nature']
                };
              }
              if (!def) {
                if (!warnedMissingDefsRef.current.has(obj.defId)) {
                  warnedMissingDefsRef.current.add(obj.defId);
                  console.warn(`[WorldCanvas] Unknown defId '${obj.defId}', skipping.`);
                }
                continue;
              }

              // LOD Tuning: at zoom < 0.50, skip small micro-clutter (tiny shrubs, 1x1 flora) unless landmark/structure/tree
              if (camera.zoom < 0.50 && def.footprint.cw <= 1 && def.footprint.ch <= 1) {
                const isImportant = def.tags?.includes('landmark') || def.tags?.includes('setpiece') || def.tags?.includes('monster') || def.tags?.includes('structure') || def.tags?.includes('tree') || def.tags?.includes('bamboo') || obj.defId.startsWith('tree_') || obj.defId.startsWith('bamboo_');
                if (!isImportant) continue;
              }

              const priority = getObjectPriority(def);
              const g = gridCanon[obj.defId];
              const fh = g ? g.fh : def.footprint.ch;
              candidateObjects.push({
                def,
                instance: obj,
                priority,
                bottomY: obj.y + fh
              });
            }
          }
        }
      }

      // If budget exceeded, sort by priority (1=Landmark > 2=Building > 3=Tree > 4=Rock > 5=Decor) and trim
      if (candidateObjects.length > MAX_SPRITE_BUDGET) {
        candidateObjects.sort((a, b) => a.priority - b.priority);
        candidateObjects.length = MAX_SPRITE_BUDGET;
      }

      for (const cand of candidateObjects) {
        ySortQueue.push({
          type: 'object',
          sortKey: cand.bottomY * 1000 + cand.instance.x + (cand.def.sortBias || 0),
          tileX: cand.instance.x,
          tileY: cand.instance.y,
          footprintBottomY: cand.bottomY,
          data: { def: cand.def, instance: cand.instance }
        });
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

      // 3. Render Y-Sorted Queue with Player Occlusion (Buildings strictly 100% Solid Opacity)
      let isPlayerBehindBuilding = false;

      for (const item of ySortQueue) {
        if (item.type === 'object') {
          const { def, instance } = item.data as { def: WorldObjectDef; instance: MapObjectInstance };
          const g = gridCanon[def.id];
          const canon = scaleCanon[def.id];

          let drawX: number;
          let drawY: number;
          let dw: number;
          let dh: number;
          let footX: number;
          let footY: number;
          let colH: number;

          if (g) {
            const rect = computeSpriteRect(g, instance.x, instance.y, currentTileSize, toScreenX, toScreenY);
            drawX = rect.drawX;
            drawY = rect.drawY;
            dw = rect.dw;
            dh = rect.dh;
            footX = rect.footX;
            footY = rect.footY;
            colH = g.fh;
          } else {
            // Contract Scale Canon: Visual width & height derived with EXACT original aspect ratio
            const visualW = canon ? canon.visualW : def.footprint.cw;
            const visualH = canon ? canon.visualH : (def.footprint.ch + def.overhangCells);
            const colW = canon?.collision?.w ?? def.footprint.cw;
            colH = canon?.collision?.h ?? def.footprint.ch;
            const colOffsetX = canon?.collision?.offsetX ?? (def.footprint.cw * 0.5);
            const anchorX = canon?.anchor?.x ?? def.anchor.x;
            const anchorY = canon?.anchor?.y ?? def.anchor.y;

            footX = toScreenX(instance.x + colOffsetX);
            footY = toScreenY(instance.y + colH);
            dw = visualW * currentTileSize;
            dh = visualH * currentTileSize;
            drawX = footX - dw * anchorX;
            drawY = footY - dh * anchorY;
          }

          // L3: Authoritative Tile-Footprint Shadow (Prompt V11 P6 - B10)
          // Width = 0.8 * fw cells, Height = 0.28 cells, Center = (x + fw/2, y + fh - 0.18)
          const isSpriteReady = atlasLoader.isSpriteReady(def.id);
          if (isSpriteReady) {
            const isXsObject = g
              ? (g.class === 'XS' || (g.fw <= 1 && g.fh <= 1 && (def.tags?.includes('flora') || def.tags?.includes('herb') || def.tags?.includes('crop'))))
              : (canon?.class === 'XS' || (def.footprint.cw <= 1 && def.footprint.ch <= 1 && (def.tags?.includes('flora') || def.tags?.includes('herb') || def.tags?.includes('crop'))));
            if (!isXsObject) {
              const fw = g ? g.fw : (def.footprint?.cw || 1);
              const shadowCenterX = footX;
              const shadowCenterY = footY - 0.18 * currentTileSize;
              const shadowW = 0.8 * fw * currentTileSize;
              const shadowH = 0.28 * currentTileSize;
              const isSolid = (g?.mode === 'solid' || def.collision === 'solid' || canon?.collision === 'solid');
              const shadowAlpha = isSolid ? 0.22 : 0.12;

              ctx.save();
              ctx.fillStyle = `rgba(10, 14, 20, ${shadowAlpha})`;
              ctx.beginPath();
              ctx.ellipse(shadowCenterX, shadowCenterY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          // Fase H4 & Fase E: Multi-Lamp Light Source Collection (Cap at 24 visible lights)
          const isHut = def.id.includes('cottage') || def.id.includes('hermitage') || def.id.includes('hut') || def.id.includes('shack') || (instance as any)?.hutType === 'living' || (instance as any)?.isEnterable;
          const hutLight = (isHut && (instance as any)?.hutType !== 'abandoned') ? { r: 3.2, color: '#F59E0B', flicker: 0.06 } : null;
          const lightSource = canon?.light || hutLight;
          if (lightSource && visibleLights.length < 24) {
            visibleLights.push({
              sx: footX,
              sy: footY - (colH * 0.45 * currentTileSize),
              radius: Math.max(35, lightSource.r * currentTileSize),
              color: lightSource.color || '#F59E0B',
              flicker: lightSource.flicker || 0.06
            });
          }

          // Building & Structure Identification
          const isBuilding =
            def.tags?.includes('building') ||
            def.tags?.includes('structure') ||
            def.tags?.includes('landmark') ||
            canon?.category === 'building' ||
            canon?.category === 'landmark' ||
            def.id.startsWith('building_') ||
            def.id.startsWith('structure_') ||
            def.id.startsWith('landmark_') ||
            def.id.includes('pagoda') ||
            def.id.includes('pavilion') ||
            def.id.includes('altar') ||
            def.id.includes('citadel') ||
            def.id.includes('city') ||
            def.id.includes('gate');

          // Player Occlusion Check
          let objAlpha = 1.0;
          let isPlayerBehind = false;
          if (g) {
            isPlayerBehind =
              pTileY >= instance.y - g.vh * 0.8 &&
              pTileY <= instance.y + g.fh &&
              pTileX >= instance.x - g.vw * 0.4 &&
              pTileX <= instance.x + g.vw * 0.6;
          } else {
            const visualW = canon ? canon.visualW : def.footprint.cw;
            const visualH = canon ? canon.visualH : (def.footprint.ch + def.overhangCells);
            isPlayerBehind =
              pTileY >= instance.y - visualH * 0.8 &&
              pTileY <= instance.y + colH &&
              pTileX >= instance.x - visualW * 0.4 &&
              pTileX <= instance.x + visualW * 0.6;
          }

          const isBlockingPlayer = isPlayerBehind && item.sortKey > (pTileY + 1) * 1000 + pTileX;

          if (isBuilding) {
            // BUILDINGS & LANDMARKS ARE NEVER FADED (Always 100% Solid Opacity)
            objAlpha = 1.0;
            if (isBlockingPlayer) {
              isPlayerBehindBuilding = true;
            }
          } else if (isBlockingPlayer) {
            // Only soft foliage for trees/bushes (gentle 0.80, never washed-out 0.55)
            objAlpha = 0.80;
          }

          // L4: Render Procedural Tall Object (undistorted aspect ratio, 100% solid buildings)
          renderL4ProceduralObject(ctx, def.id, drawX, drawY, dw, time, objAlpha, instance.flipX, dh);

          // Building Label
          const t = tileMap.get(`${instance.x},${instance.y}`) || chunkManager.getTile(instance.x, instance.y);
          if (t && t.buildingName && (camera.zoom >= 0.65 || t.isSettlementOrigin)) {
            const bLabel = t.buildingName;
            ctx.font = `bold ${Math.max(7, 8.5 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            const textW = ctx.measureText(bLabel).width;
            const pillW = textW + 8 * camera.zoom;
            const pillH = 11 * camera.zoom;
            const pillX = footX - pillW / 2;
            const pillY = footY + 4 * camera.zoom;

            ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
            ctx.fillRect(pillX, pillY, pillW, pillH);
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 1;
            ctx.strokeRect(pillX, pillY, pillW, pillH);
            ctx.fillStyle = '#FEF08A';
            ctx.fillText(bLabel, pillX + pillW / 2, pillY + pillH - 2.5 * camera.zoom);
          }
        } else if (item.type === 'player') {
          // Render Player Character (Standardized to human height 0.9 cell, width 0.55 cell)
          const footX = toScreenX(animatedPlayerPos.current.x + 0.5);
          const footY = toScreenY(animatedPlayerPos.current.y + 1.0);
          const pw = currentTileSize * 0.55;
          const ph = currentTileSize * 0.90;

          ctx.save();
          // Player Footprint Shadow
          ctx.fillStyle = 'rgba(10, 14, 20, 0.25)';
          ctx.beginPath();
          ctx.ellipse(footX, footY - currentTileSize * 0.08, pw * 0.45, currentTileSize * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();

          if (loadedImages.sprites?.player_default) {
            ctx.drawImage(loadedImages.sprites.player_default, footX - pw / 2, footY - ph, pw, ph);
            if (loadedImages.sprites?.flying_sword_aura) {
              ctx.drawImage(loadedImages.sprites.flying_sword_aura, footX - pw / 2, footY - currentTileSize * 0.1, pw, currentTileSize * 0.25);
            }
          } else {
            // Radiant Qi Aura
            const auraPulse = (pw * 0.72) + Math.sin(time * 3.5) * (currentTileSize * 0.04);
            ctx.fillStyle = 'rgba(45, 212, 191, 0.20)';
            ctx.beginPath();
            ctx.arc(footX, footY - ph * 0.48, auraPulse, 0, Math.PI * 2);
            ctx.fill();

            // Outer Robe Body (Jade / Cyan Daoist Robe #1E6075)
            ctx.fillStyle = '#1E6075';
            ctx.beginPath();
            ctx.moveTo(footX, footY - ph * 0.72);
            ctx.lineTo(footX + pw * 0.46, footY - currentTileSize * 0.05);
            ctx.lineTo(footX - pw * 0.46, footY - currentTileSize * 0.05);
            ctx.closePath();
            ctx.fill();

            // Inner Silk Robe (Cream White #F8FAFC) - crossed chest collar
            ctx.fillStyle = '#F8FAFC';
            ctx.beginPath();
            ctx.moveTo(footX, footY - ph * 0.72);
            ctx.lineTo(footX + pw * 0.14, footY - ph * 0.48);
            ctx.lineTo(footX - pw * 0.14, footY - ph * 0.48);
            ctx.closePath();
            ctx.fill();

            // Gold Silk Sash / Waistband (#C5A880)
            ctx.fillStyle = '#C5A880';
            ctx.fillRect(footX - pw * 0.22, footY - ph * 0.50, pw * 0.44, ph * 0.09);
            // Sash tails hanging down
            ctx.fillRect(footX - pw * 0.06, footY - ph * 0.41, pw * 0.12, ph * 0.18);

            // Skin Neck & Face (#FBD38D)
            ctx.fillStyle = '#FBD38D';
            ctx.beginPath();
            ctx.arc(footX, footY - ph * 0.78, pw * 0.22, 0, Math.PI * 2);
            ctx.fill();

            // Dark Hair & Topknot Bun (#0F172A)
            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.arc(footX, footY - ph * 0.81, pw * 0.24, Math.PI, Math.PI * 2);
            ctx.fill();
            // Hair bun on top
            ctx.beginPath();
            ctx.arc(footX, footY - ph * 0.94, pw * 0.13, 0, Math.PI * 2);
            ctx.fill();

            // Jade Hairpin (#10B981)
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = Math.max(1.5, currentTileSize * 0.035);
            ctx.beginPath();
            ctx.moveTo(footX - pw * 0.24, footY - ph * 0.94);
            ctx.lineTo(footX + pw * 0.24, footY - ph * 0.94);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // If player is behind a building, render radiant Qi silhouette over the building
      if (isPlayerBehindBuilding) {
        const px = toScreenX(animatedPlayerPos.current.x) + currentTileSize / 2;
        const py = toScreenY(animatedPlayerPos.current.y) + currentTileSize / 2;
        ctx.save();
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.beginPath();
        ctx.arc(px, py - 6 * camera.zoom, 11 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(px, py - 14 * camera.zoom, 3.5 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ----------------------------------------------------------------------
      // L5: KABUT ATMOSFER (Cinematic Edge Vignette - Crystal Clear Center)
      // ----------------------------------------------------------------------
      ctx.save();
      const atmoGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, Math.min(width, height) * 0.35,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.75
      );
      atmoGrad.addColorStop(0, 'rgba(245, 240, 230, 0)');
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
          const isFogActive = exploredChunkSet.size > 0;
          const isExplored = !isFogActive || exploredChunkSet.has(`${chunkX},${chunkY}`);
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

      // 1. NPC Badges (Black circle #1B1F1E, diameter 0.34 tile at top-right, white text, visible if count >= 1 and zoom >= 0.8)
      if (camera.zoom >= 0.8) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          for (let tx = minTileX; tx <= maxTileX; tx++) {
            const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
            const count = (tile?.npcCount || (Array.isArray(tile?.npcs) ? tile.npcs.length : 0)) || 0;
            if (!tile || count < 1) continue;
            const chunkX = Math.floor(tx / 16);
            const chunkY = Math.floor(ty / 16);
            if (exploredChunkSet.size > 0 && !exploredChunkSet.has(`${chunkX},${chunkY}`)) continue;

            const sx = toScreenX(tx);
            const sy = toScreenY(ty);
            // Diameter 0.34 tile -> radius 0.17 tile
            const badgeR = Math.max(5, currentTileSize * 0.17);
            const badgeX = sx + currentTileSize - badgeR - 2;
            const badgeY = sy + badgeR + 2;

            let attitude: 'friendly' | 'neutral' | 'hostile' | 'quest' = 'neutral';
            if (Array.isArray(tile.npcs)) {
              if (tile.npcs.some((n: any) => n.hasQuest)) attitude = 'quest';
              else if (tile.npcs.some((n: any) => n.relation === 'friend' || n.relation === 'confidant')) attitude = 'friendly';
              else if (tile.npcs.some((n: any) => n.relation === 'enemy')) attitude = 'hostile';
            }

            renderL7NpcBadge(ctx, badgeX, badgeY, badgeR, count, attitude);
          }
        }
      }

      // 2. Active Monsters on Specific Tiles (Ink Ring, Dynamic Icon, Aggro Radius & Boss Banner)
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
          if (!tile || !tile.spawnedMonster || !tile.spawnedMonster.name) continue;
          const chunkX = Math.floor(tx / 16);
          const chunkY = Math.floor(ty / 16);
          if (exploredChunkSet.size > 0 && !exploredChunkSet.has(`${chunkX},${chunkY}`)) continue;

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

          // Render Illustrated Monster Sprite from Atlas (Zero emoji fallback)
          const monsterFrame = resolveMonsterAtlasFrameWithFallback(m.name, m.key, m.tier || 1);
          let drawn = monsterFrame && atlasLoader.hasFrame(monsterFrame)
            ? atlasLoader.drawSprite(
                ctx,
                monsterFrame,
                sx + currentTileSize * 0.12,
                sy + currentTileSize * 0.12,
                currentTileSize * 0.76,
                currentTileSize * 0.76
              )
            : false;

          if (!drawn && monsterFrame) {
            drawn = atlasLoader.drawAtlasFrame(
              ctx,
              'markers_entities',
              monsterFrame,
              sx + currentTileSize * 0.12,
              sy + currentTileSize * 0.12,
              currentTileSize * 0.76,
              currentTileSize * 0.76
            );
          }

          if (!drawn) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx + currentTileSize * 0.5, sy + currentTileSize * 0.5, currentTileSize * 0.28, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.fill();
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#EF4444';
            ctx.font = `bold ${Math.max(8, 10 * camera.zoom)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('兽', sx + currentTileSize * 0.5, sy + currentTileSize * 0.5 + 0.5);
            ctx.restore();
          }

          // Garis tipis merah di sekeliling kamp elit (Prompt E4)
          if (m.isElite) {
            ctx.save();
            ctx.strokeStyle = '#DC2626';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
            ctx.restore();
          }

          // Boss Warning Badge & Skull Icon (Prompt E4)
          if (m.isBoss || (m.tier && m.tier >= 5)) {
            if (m.isBoss) {
              ctx.save();
              ctx.font = `${Math.max(10, 14 * camera.zoom)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              ctx.fillText('💀', sx + currentTileSize * 0.5, sy + currentTileSize * 0.08);
              ctx.restore();
            }

            const bWidth = currentTileSize * 0.65;
            const bHeight = Math.max(9, 11 * camera.zoom);
            const bx = sx + (currentTileSize - bWidth) / 2;
            const by = sy + currentTileSize * 0.08;
            ctx.fillStyle = '#7F1D1D';
            ctx.fillRect(bx, by, bWidth, bHeight);
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(bx, by, bWidth, bHeight);
            ctx.fillStyle = '#FEE2E2';
            ctx.font = `bold ${Math.max(6, 7.5 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('BOSS', sx + currentTileSize / 2, by + bHeight / 2);
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

      // 3. Spiritual Resource Gathering Nodes (Atlas Sprite & Subtle Sparkle - zoom >= 0.75 or hovered)
      if (camera.zoom >= 0.75 || hoveredTile) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          for (let tx = minTileX; tx <= maxTileX; tx++) {
            const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
            if (!tile || (!tile.resourceType && tile.tileType !== 'resource_node')) continue;
            const chunkX = Math.floor(tx / 16);
            const chunkY = Math.floor(ty / 16);
            if (exploredChunkSet.size > 0 && !exploredChunkSet.has(`${chunkX},${chunkY}`)) continue;

            const sx = toScreenX(tx);
            const sy = toScreenY(ty);
            const isDormant = Boolean(
              tile.nodeRespawnAt && new Date(tile.nodeRespawnAt).getTime() > Date.now()
            );

            // Resource Node Rendering (Prompt V11 P7 - B7 / V12 P7)
            const isHovered = hoveredTile && hoveredTile.tileX === tile.tileX && hoveredTile.tileY === tile.tileY;
            if (camera.zoom >= 0.75 || isHovered) {
              const rt = tile.resourceType || 'herb';
              const candidates = RESOURCE_ICON_FRAMES[rt] || ['icon_res_herb'];
              let drawn = false;
              for (const frameId of candidates) {
                if (atlasLoader.drawAtlasFrame(
                  ctx,
                  'icons',
                  frameId,
                  sx + currentTileSize * 0.25,
                  sy + currentTileSize * 0.25,
                  currentTileSize * 0.5,
                  currentTileSize * 0.5,
                  0.85
                ) || atlasLoader.drawAtlasFrame(
                  ctx,
                  'objects_nature',
                  frameId,
                  sx + currentTileSize * 0.25,
                  sy + currentTileSize * 0.25,
                  currentTileSize * 0.5,
                  currentTileSize * 0.5,
                  0.85
                )) {
                  drawn = true;
                  break;
                }
              }

              // Subtle 6% aura glow around resource sprite
              ctx.save();
              ctx.beginPath();
              ctx.arc(sx + currentTileSize * 0.5, sy + currentTileSize * 0.5, currentTileSize * 0.35, 0, Math.PI * 2);
              const glowColor = rt === 'herb' ? 'rgba(52, 211, 153, 0.06)' :
                                rt === 'ore' ? 'rgba(245, 158, 11, 0.06)' :
                                rt === 'wood' ? 'rgba(168, 85, 247, 0.06)' : 'rgba(56, 189, 248, 0.06)';
              ctx.fillStyle = glowColor;
              ctx.fill();
              ctx.restore();

              renderL7ResourceSparkle(
                ctx,
                sx + currentTileSize * 0.5,
                sy + currentTileSize * 0.5,
                currentTileSize * 0.38,
                tile.resourceType || 'herb',
                time,
                isDormant
              );

              // Single-Label Rule & Strict Proximity Filter (Prompt V11 P7 - B7 / V12 P7)
              // Shown on hover, selection, or close radius <= 1.5 tiles from player
              // Never draw label on player position unless resource is explicitly on that tile
              if (!isDormant) {
                const dist = Math.max(Math.abs(tile.tileX - playerPos.x), Math.abs(tile.tileY - playerPos.y));
                const isSelected = targetTile && targetTile.x === tile.tileX && targetTile.y === tile.tileY;
                const isPlayerOnCell = Math.floor(playerPos.x) === tile.tileX && Math.floor(playerPos.y) === tile.tileY;

                // Max 1 label per cell; never draw on player cell unless resource node is there
                const cellKey = `${tile.tileX},${tile.tileY}`;
                if (!seenLabelCells.has(cellKey)) {
                  if (isHovered || isSelected || (camera.zoom >= 0.75 && dist <= 1.5 && (!isPlayerOnCell || tile.resourceType))) {
                    seenLabelCells.add(cellKey);
                    const resLabel = (
                      tile.resourceType === 'herb' ? 'Herba Roh' :
                      tile.resourceType === 'ore' ? 'Urat Bijih' :
                      tile.resourceType === 'wood' ? 'Kayu Roh' :
                      tile.resourceType === 'fish' ? 'Lubuk Ikan' :
                      tile.label || 'Sumber Daya'
                    );
                    eligibleResourceLabels.push({
                      tile,
                      screenX: sx + currentTileSize * 0.5,
                      screenY: sy + currentTileSize * 0.85,
                      dist: isHovered ? -1 : dist,
                      label: resLabel
                    });
                  }
                }
              }
            }
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

      // ----------------------------------------------------------------------
      // G6: BIOME AMBIENT ATMOSPHERE & DRIFTING MIST OVERLAY
      // ----------------------------------------------------------------------
      const curRegion = getRegionAt(camera.x, camera.y);
      renderBiomeAmbientFog(ctx, width, height, curRegion, time, camera.zoom);

      // Night Filter (H0 / H4: Offscreen Canvas + Multi-Lamp Additive Light, Never Erase Map Pixels)
      if (isNight) {
        if (!nightCanvasRef.current) {
          nightCanvasRef.current = document.createElement('canvas');
        }
        const nightCanvas = nightCanvasRef.current;
        if (nightCanvas.width !== width || nightCanvas.height !== height) {
          nightCanvas.width = width;
          nightCanvas.height = height;
        }

        const nightCtx = nightCanvas.getContext('2d');
        if (nightCtx) {
          nightCtx.clearRect(0, 0, width, height);
          nightCtx.fillStyle = 'rgba(10, 15, 35, 0.68)';
          nightCtx.fillRect(0, 0, width, height);

          // All light sources: Player personal lantern + visible multi-lamp sources (up to 24)
          const px = toScreenX(animatedPlayerPos.current.x) + currentTileSize / 2;
          const py = toScreenY(animatedPlayerPos.current.y) + currentTileSize / 2;
          const allLights = [
            {
              sx: px,
              sy: py,
              radius: Math.max(45, currentTileSize * 3.5),
              color: '#FFAA50',
              flicker: 0.04
            },
            ...visibleLights
          ];

          // 1. Punch hole ONLY on the offscreen night layer for all lights
          nightCtx.globalCompositeOperation = 'destination-out';
          for (let i = 0; i < allLights.length; i++) {
            const lit = allLights[i];
            const flicker = 1.0 + Math.sin(time * 6 + i * 2.3) * lit.flicker;
            const r = lit.radius * flicker;
            const glow = nightCtx.createRadialGradient(lit.sx, lit.sy, 8 * camera.zoom, lit.sx, lit.sy, r);
            glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
            glow.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
            glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
            nightCtx.fillStyle = glow;
            nightCtx.beginPath();
            nightCtx.arc(lit.sx, lit.sy, r, 0, Math.PI * 2);
            nightCtx.fill();
          }
          nightCtx.globalCompositeOperation = 'source-over';

          // 2. Draw dark night layer onto main canvas without deleting underlying map pixels
          ctx.drawImage(nightCanvas, 0, 0);

          // 3. Add warm additive light tint around player and multi-lamp sources
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < allLights.length; i++) {
            const lit = allLights[i];
            const flicker = 1.0 + Math.sin(time * 6 + i * 2.3) * lit.flicker;
            const warmRadius = lit.radius * 1.15 * flicker;
            const warmGlow = ctx.createRadialGradient(lit.sx, lit.sy, 6 * camera.zoom, lit.sx, lit.sy, warmRadius);

            if (lit.color === '#50E3C2') {
              // Cyan spirit crystal
              warmGlow.addColorStop(0, 'rgba(80, 227, 194, 0.30)');
              warmGlow.addColorStop(0.5, 'rgba(80, 227, 194, 0.12)');
              warmGlow.addColorStop(1, 'rgba(80, 227, 194, 0)');
            } else if (lit.color === '#FFD700') {
              // Golden relic
              warmGlow.addColorStop(0, 'rgba(255, 215, 0, 0.32)');
              warmGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.14)');
              warmGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
            } else if (lit.color === '#FF7720') {
              // Fiery brazier
              warmGlow.addColorStop(0, 'rgba(255, 119, 32, 0.32)');
              warmGlow.addColorStop(0.5, 'rgba(255, 119, 32, 0.14)');
              warmGlow.addColorStop(1, 'rgba(255, 119, 32, 0)');
            } else if (lit.color === '#F59E0B') {
              // Warm amber window glow from living cottages / huts
              warmGlow.addColorStop(0, 'rgba(245, 158, 11, 0.36)');
              warmGlow.addColorStop(0.45, 'rgba(245, 158, 11, 0.16)');
              warmGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
            } else {
              // Warm amber lantern
              warmGlow.addColorStop(0, 'rgba(255, 170, 80, 0.28)');
              warmGlow.addColorStop(0.5, 'rgba(255, 160, 60, 0.12)');
              warmGlow.addColorStop(1, 'rgba(255, 150, 40, 0)');
            }

            ctx.fillStyle = warmGlow;
            ctx.beginPath();
            ctx.arc(lit.sx, lit.sy, warmRadius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      ctx.restore();

      // ======================================================================
      // 11. DEDICATED XUAN PAPER RESOURCE LABEL PASS (Prompt V11 P7 - B7 / V12 P7)
      // ======================================================================
      if (currentMode === 'zone' && eligibleResourceLabels.length > 0 && (camera.zoom >= 0.75 || hoveredTile)) {
        // Urutkan berdasarkan jarak terdekat ke pemain (hovered dist = -1 duluan)
        eligibleResourceLabels.sort((a, b) => a.dist - b.dist);

        const renderedBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];
        const maxLabels = 8;
        const fontSize = Math.max(11, Math.min(13, Math.floor(12 * Math.max(1.0, camera.zoom))));

        ctx.font = `bold ${fontSize}px "Cinzel", "Noto Serif SC", serif, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const item of eligibleResourceLabels) {
          if (renderedBoxes.length >= maxLabels) break;

          const textWidth = ctx.measureText(item.label).width;
          const paddingX = 8;
          const paddingY = 4;
          const boxWidth = textWidth + paddingX * 2;
          const boxHeight = fontSize + paddingY * 2;

          // Clamp coordinates inside canvas boundaries to prevent clipping on top or sides
          const boxX = Math.max(8, Math.min(width - boxWidth - 8, item.screenX - boxWidth / 2));
          let boxY = item.screenY - boxHeight - 8;
          // If clipped off the top edge, flip to below the tile node
          if (boxY < 8) {
            boxY = Math.min(height - boxHeight - 8, item.screenY + 12);
          } else {
            boxY = Math.min(height - boxHeight - 8, boxY);
          }

          // Simple collision avoidance
          let overlaps = false;
          for (const box of renderedBoxes) {
            if (
              boxX < box.x + box.w &&
              boxX + boxWidth > box.x &&
              boxY < box.y + box.h &&
              boxY + boxHeight > box.y
            ) {
              overlaps = true;
              break;
            }
          }
          if (overlaps) continue;

          renderedBoxes.push({ x: boxX, y: boxY, w: boxWidth, h: boxHeight });

          ctx.save();
          // Drop shadow halus
          ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 2;

          // Background Kertas Xuan
          ctx.fillStyle = '#F4F1EA';
          ctx.beginPath();
          const r = 4;
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, r);
          } else {
            ctx.rect(boxX, boxY, boxWidth, boxHeight);
          }
          ctx.fill();

          // Panah kecil mengarah ke simpul tile
          const arrowX = Math.max(boxX + 8, Math.min(boxX + boxWidth - 8, item.screenX));
          ctx.beginPath();
          if (boxY < item.screenY) {
            // Box is above tile, arrow points down
            ctx.moveTo(arrowX - 4, boxY + boxHeight);
            ctx.lineTo(arrowX + 4, boxY + boxHeight);
            ctx.lineTo(arrowX, boxY + boxHeight + 4);
          } else {
            // Box is below tile, arrow points up
            ctx.moveTo(arrowX - 4, boxY);
            ctx.lineTo(arrowX + 4, boxY);
            ctx.lineTo(arrowX, boxY - 4);
          }
          ctx.closePath();
          ctx.fill();

          // Border Tinta Gelap 1px
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = '#2E3A38';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, r);
          } else {
            ctx.rect(boxX, boxY, boxWidth, boxHeight);
          }
          ctx.stroke();

          // Garis aksen halus di bagian atas (emas untuk ore, giok/zamrud untuk lainnya)
          ctx.strokeStyle = item.tile.resourceType === 'ore' ? '#D97706' : '#059669';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(boxX + r, boxY + 1.5);
          ctx.lineTo(boxX + boxWidth - r, boxY + 1.5);
          ctx.stroke();

          // Teks Tinta Gelap (centered inside clamped box)
          ctx.fillStyle = '#1A2421';
          ctx.fillText(item.label, boxX + boxWidth / 2, boxY + boxHeight / 2 + 1);

          ctx.restore();
        }
      }

      // ----------------------------------------------------------------------
      // L8.5: PROCEDURAL AMBIENT PARTICLES PER BIOME (Fase G)
      // ----------------------------------------------------------------------
      const curFps = fpsRef.current;
      if (currentMode === 'zone' && camera.zoom >= 0.4 && weather === 'none' && !isNight && curFps >= 40) {
        const currentRegion = getRegionAt(camera.x, camera.y);
        const biomeSlug = currentRegion.regionSlug || '';
        const maxParticles = 120;
        const particles = ambientParticlesRef.current;

        // Populate particles if needed
        while (particles.length < maxParticles) {
          let color = '#FFAAA6'; // default peach petal
          let vy = 0.6 + Math.random() * 0.8;
          let vx = 0.4 + Math.random() * 0.6;
          let size = 2 + Math.random() * 2.5;

          if (biomeSlug === 'central_plains') {
            color = '#FFAAA6'; // pink peach blossom
            vx = 0.8 + Math.random() * 0.7;
            vy = 0.5 + Math.random() * 0.6;
          } else if (biomeSlug === 'nine_springs_delta') {
            color = 'rgba(214, 230, 242, 0.45)'; // mist waft
            vx = 0.2 + Math.random() * 0.3;
            vy = 0.1 + Math.random() * 0.2;
            size = 6 + Math.random() * 8;
          } else if (biomeSlug.includes('north') || biomeSlug.includes('frost') || biomeSlug.includes('snow')) {
            color = '#FFFFFF'; // snowflake
            vx = (Math.random() - 0.5) * 0.4;
            vy = 0.8 + Math.random() * 0.9;
          } else if (biomeSlug.includes('lava') || biomeSlug.includes('demon')) {
            color = Math.random() > 0.5 ? '#FF5722' : '#FF9800'; // volcanic ember
            vx = (Math.random() - 0.5) * 0.5;
            vy = -(0.7 + Math.random() * 1.0); // float upward
          } else if (biomeSlug.includes('venom') || biomeSlug.includes('insect') || biomeSlug.includes('mire')) {
            color = '#A8E6CF'; // teal toxic spore
            vx = (Math.random() - 0.5) * 0.4;
            vy = (Math.random() - 0.5) * 0.4;
            size = 1.8 + Math.random() * 2.2;
          } else if (biomeSlug.includes('desert') || biomeSlug.includes('ruins')) {
            color = '#FFD700'; // golden sand mote
            vx = 1.2 + Math.random() * 1.5;
            vy = (Math.random() - 0.5) * 0.3;
          } else if (biomeSlug.includes('wood') || biomeSlug.includes('forest')) {
            color = '#A7F3D0'; // emerald Qi mote
            vx = (Math.random() - 0.5) * 0.3;
            vy = -(0.4 + Math.random() * 0.6); // float upward
            size = 2.5 + Math.random() * 2.5;
          }

          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx,
            vy,
            size,
            alpha: 0.2 + Math.random() * 0.6,
            color,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.05
          });
        }

        ctx.save();
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vRot;

          // Wrap around canvas
          if (p.x > width + 20) p.x = -10;
          if (p.x < -20) p.x = width + 10;
          if (p.y > height + 20) p.y = -10;
          if (p.y < -20) p.y = height + 10;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          if (p.size > 5) {
            // Mist / cloud puff
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Petal or diamond particle
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.restore();
      }

      // ----------------------------------------------------------------------
      // DEBUG CAM SCREENSHOT HOOK & METRIC CALCULATION (Fase E)
      // ----------------------------------------------------------------------
      const renderEndTime = performance.now();
      const frameRenderMs = Math.round(renderEndTime - frameStartTime);
      const dt = renderEndTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = renderEndTime;
      if (dt > 0) {
        fpsRef.current = fpsRef.current * 0.9 + (1000 / dt) * 0.1;
      }

      if (debugCam && !hasFiredReadyRef.current) {
        debugCamFrameCountRef.current++;
        const isHotReady = chunkManager.areHotChunksReady(camera.x, camera.y, camera.zoom);
        if (isHotReady) {
          // Gather visible objects in viewport
          const visObjs: Array<{ defId: string; x: number; y: number }> = [];
          for (const item of ySortQueue) {
            if (item.type === 'object' && item.data?.instance) {
              visObjs.push({
                defId: item.data.instance.defId,
                x: item.data.instance.x,
                y: item.data.instance.y
              });
            }
          }

          // Verify that all visible sprite textures and ground textures are resident in GPU memory (Prompt K1)
          const areGroundTexturesReady = camera.zoom < 0.35 || groundTextures.ready;
          const areTexturesReady = (visObjs.length > 0
            ? visObjs.every(o => atlasLoader.isSpriteReady(o.defId))
            : debugCamFrameCountRef.current >= 15) && areGroundTexturesReady;

          const timeSinceMount = performance.now() - debugCamMountTimeRef.current;

          if (areTexturesReady || timeSinceMount > 12000) {
            // Duplicate within 3 tiles (Chebyshev < 3)
            let dupCount = 0;
            for (let i = 0; i < visObjs.length; i++) {
              for (let j = i + 1; j < visObjs.length; j++) {
                if (visObjs[i].defId === visObjs[j].defId) {
                  const dist = Math.max(Math.abs(visObjs[i].x - visObjs[j].x), Math.abs(visObjs[i].y - visObjs[j].y));
                  if (dist < 3) {
                    dupCount++;
                  }
                }
              }
            }

            // Road blockages: solid objects placed on road tiles
            let roadBlockCount = 0;
            for (const obj of visObjs) {
              const t = tileMap.get(`${obj.x},${obj.y}`) || chunkManager.getTile(obj.x, obj.y);
              if (t && (t.terrainType === 'road' || (t as any).isRoad)) {
                const def = OBJECT_DEFINITIONS[obj.defId];
                if (def && def.collision === 'solid') {
                  roadBlockCount++;
                }
              }
            }

            // Focal point presence
            const hasFocal = visObjs.some(o => {
              const def = OBJECT_DEFINITIONS[o.defId];
              return def && (def.tags?.includes('landmark') || def.tags?.includes('structure') || def.tags?.includes('setpiece'));
            }) || tiles.some(t => t.buildingName || t.isSettlementOrigin);

            const metrics = {
              spriteCount: visObjs.length,
              uniqueDefIds: new Set(visObjs.map(o => o.defId)).size,
              duplicateWithin3Tiles: dupCount,
              hasFocalPoint: hasFocal,
              roadBlockages: roadBlockCount,
              renderTimeMs: frameRenderMs,
              spritesFallback: fallbackSpritesCountRef.current
            };

            if (typeof window !== 'undefined') {
              (window as any).__debugMetrics = metrics;
              (window as any).__chunksReady = true;
              (window as any).atlasReady = true;
              window.dispatchEvent(new CustomEvent('chunks-ready', { detail: metrics }));
            }
            hasFiredReadyRef.current = true;
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [camera, tiles, playerPos, targetTile, activePath, exploredChunkSet, isWalking, tileMap, loadedImages, weather, isNight, currentMode, paused]);

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
      const currentTileSize = getEffectiveTileSize(canvas.width, canvas.height, camera.zoom, currentMode);
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

    const currentTileSize = getEffectiveTileSize(canvas.width, canvas.height, camera.zoom, currentMode);
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
      const tile = tileMap.get(`${hoverX},${hoverY}`) || chunkManager.getTile(hoverX, hoverY);
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
      const currentTileSize = getEffectiveTileSize(canvas.width, canvas.height, camera.zoom, currentMode);
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
          const selectedTile = tileMap.get(`${clickX},${clickY}`) || chunkManager.getTile(clickX, clickY) || {
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
          const selectedTile = tileMap.get(`${clickX},${clickY}`) || chunkManager.getTile(clickX, clickY) || {
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

      {/* L9: HUD CONTROLS (Vertical Floating Wuxia Dock on Left - Hidden in debugCam) */}
      {!debugCam && (
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
            <Target className="w-3.5 h-3.5" />
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
            <Hammer className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mode Bangun Hover Info Card (Fase 18) */}
      {!debugCam && isBuildMode && hoveredTile && currentMode === 'zone' && (
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
              {hoveredTile.isClaimable ? 'DAPAT DIBANGUN' : 'DILARANG BANGUN'}
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
      {!debugCam && currentMode === 'macro' && hoveredRegion && (
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
      {/* Fase A (Bug 1): Tampilkan layar pemuatan jika koordinat pemain belum siap dari server */}
      {!debugCam && playerReady === false && (
        <WorldMapLoadingScreen isReady={false} />
      )}
    </div>
  );
}
