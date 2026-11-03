'use client';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Point } from '@/hooks/useAStarGridPath';
import { useGlobalAssetLoader } from '@/hooks/useGlobalAssetLoader';
import { TileData, CanvasViewMode } from '@/types/world';
import { CANONICAL_REGIONS } from '@/config/canonicalRegions';
import { Target, Layers, Hammer } from 'lucide-react';
import { atlasLoader } from '@/lib/atlasLoader';
import { groundTextures } from '@/lib/groundTextures';
import { chunkManager } from '@/lib/chunkManager';
import { perfProbe } from '@/lib/perfProbe';
import WorldMapLoadingScreen from './WorldMapLoadingScreen';
import { loadWorldRasterImage } from '@/lib/worldRasterLoader';
import { renderStaticLayer, renderMacroLayer, isCameraDirty, CameraState } from './StaticLayerRenderer';
import { renderDynamicLayer } from './DynamicLayerRenderer';
import { renderWeatherAndLighting, AmbientParticle } from './WeatherParticleOverlay';
import { renderInteractionLayer } from './InteractionOverlay';
import { useCanvasGestures } from './useCanvasGestures';

export const ZONE_DEFAULT_ZOOM = 1.4;

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
  focusTile = null,
  weather = 'none',
  isNight = false,
  onRecenterPlayer,
  onModeChange,
  onSelectRegion,
  debugCam,
  paused = false
}: WorldCanvasProps) {
  // Dual-Canvas Architecture (V21 F2)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const BASE_TILE_SIZE = 54;
  const { loadedImages } = useGlobalAssetLoader();
  const nightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const warnedMissingDefsRef = useRef<Set<string>>(new Set());

  // Active View Mode (Macro vs Zone)
  const [currentMode, setCurrentMode] = useState<CanvasViewMode>(mode);
  useEffect(() => {
    setCurrentMode(mode);
    setCamera(prev => ({
      ...prev,
      zoom: mode === 'macro' ? 0.18 : ZONE_DEFAULT_ZOOM
    }));
    staticDirtyRef.current = true;
  }, [mode]);

  // Camera State & Dirty Tracking
  const [camera, setCamera] = useState<CameraState>({
    x: debugCam ? debugCam.x : (focusTile ? focusTile.x : playerPos.x),
    y: debugCam ? debugCam.y : (focusTile ? focusTile.y : playerPos.y),
    zoom: debugCam ? debugCam.zoom : (mode === 'macro' ? 0.18 : ZONE_DEFAULT_ZOOM)
  });

  const prevCameraRef = useRef<CameraState | null>(null);
  const staticDirtyRef = useRef(true);
  const fpsRef = useRef(60);
  const lastFrameTimeRef = useRef(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const ambientParticlesRef = useRef<AmbientParticle[]>([]);
  const animatedPlayerPos = useRef({ x: playerPos.x, y: playerPos.y });
  const prevPlayerPos = useRef({ x: playerPos.x, y: playerPos.y });
  const hasInitialCentered = useRef(false);

  // Resize Handling for Dual Canvases
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const staticCanvas = staticCanvasRef.current;
      const dynamicCanvas = dynamicCanvasRef.current;
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      if (clientWidth > 0 && clientHeight > 0) {
        if (staticCanvas && (staticCanvas.width !== clientWidth || staticCanvas.height !== clientHeight)) {
          staticCanvas.width = clientWidth;
          staticCanvas.height = clientHeight;
          staticDirtyRef.current = true;
        }
        if (dynamicCanvas && (dynamicCanvas.width !== clientWidth || dynamicCanvas.height !== clientHeight)) {
          dynamicCanvas.width = clientWidth;
          dynamicCanvas.height = clientHeight;
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

  const [hoveredTile, setHoveredTile] = useState<TileData | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<any | null>(null);

  const getEffectiveTileSize = useCallback((w: number, h: number, z: number, m: CanvasViewMode) => {
    if (m === 'macro') {
      return (Math.min(w, h) * 0.92 / 5000) * (z / 0.18);
    }
    return BASE_TILE_SIZE * z;
  }, []);

  // Build Mode State
  const [isBuildMode, setIsBuildMode] = useState(false);

  // Grid Overlay State (Default ON)
  const [showGrid, setShowGrid] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has('grid')) return params.get('grid') === '1';
        const saved = localStorage.getItem('jianghu_show_grid');
        if (saved !== null) return saved === 'true';
      } catch (_) {}
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jianghu_show_grid', String(showGrid));
      } catch (_) {}
      (window as any).__setShowGrid = setShowGrid;
      (window as any).__getShowGrid = () => showGrid;
    }
    staticDirtyRef.current = true;
  }, [showGrid]);

  // Preload Assets
  useEffect(() => {
    atlasLoader.preloadCoreAtlases().catch(() => {});
    groundTextures.load().then(() => {
      chunkManager.clearCache();
      staticDirtyRef.current = true;
    }).catch(() => {});
    loadWorldRasterImage().catch(() => {});
  }, []);

  // Keyboard Shortcuts: 'B' Build Mode, 'G' Grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'b' || e.key === 'B') {
        setIsBuildMode(prev => !prev);
        staticDirtyRef.current = true;
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGrid(prev => !prev);
        staticDirtyRef.current = true;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Camera Animation Interpolation
  const cameraAnimRef = useRef<{
    startX: number;
    startY: number;
    startZoom: number;
    targetX: number;
    targetY: number;
    targetZoom: number;
    startTime: number;
    duration: number;
  } | null>(null);

  const animateCameraTo = useCallback((targetX: number, targetY: number, targetZoom?: number, duration = 300) => {
    cameraAnimRef.current = {
      startX: camera.x,
      startY: camera.y,
      startZoom: camera.zoom,
      targetX,
      targetY,
      targetZoom: targetZoom !== undefined ? targetZoom : camera.zoom,
      startTime: performance.now(),
      duration
    };
  }, [camera.x, camera.y, camera.zoom]);

  // Initial Player Centering
  useEffect(() => {
    if (playerReady && !hasInitialCentered.current) {
      setCamera({
        x: focusTile ? focusTile.x : playerPos.x,
        y: focusTile ? focusTile.y : playerPos.y,
        zoom: currentMode === 'macro' ? 0.18 : 1.0
      });
      animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
      hasInitialCentered.current = true;
      staticDirtyRef.current = true;
    }
  }, [playerReady, playerPos.x, playerPos.y, focusTile, currentMode]);

  const centerOnPlayer = useCallback(() => {
    const targetX = focusTile ? focusTile.x : playerPos.x;
    const targetY = focusTile ? focusTile.y : playerPos.y;
    animateCameraTo(targetX, targetY, currentMode === 'macro' ? 0.18 : 1.0, 250);
    animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
    onRecenterPlayer?.();
  }, [playerPos.x, playerPos.y, focusTile, currentMode, animateCameraTo, onRecenterPlayer]);

  // Fast Tile Lookup Map
  const tileMap = useMemo(() => {
    const map = new Map<string, TileData>();
    for (const t of tiles) {
      map.set(`${t.tileX},${t.tileY}`, t);
    }
    return map;
  }, [tiles]);

  const exploredChunkSet = useMemo(() => new Set(exploredChunks), [exploredChunks]);

  // Teleport Detection
  useEffect(() => {
    const dx = Math.abs(playerPos.x - prevPlayerPos.current.x);
    const dy = Math.abs(playerPos.y - prevPlayerPos.current.y);
    if (!isWalking && (dx > 1 || dy > 1)) {
      animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
      setCamera(prev => ({ ...prev, x: playerPos.x, y: playerPos.y }));
      chunkManager.updateCamera(playerPos.x, playerPos.y, camera.zoom);
      staticDirtyRef.current = true;
    }
    prevPlayerPos.current = { x: playerPos.x, y: playerPos.y };
  }, [playerPos.x, playerPos.y, isWalking, camera.zoom]);

  // When tiles change, invalidate static layer
  useEffect(() => {
    staticDirtyRef.current = true;
  }, [tiles]);

  // Hook Input Handlers
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleZoomIn,
    handleZoomOut
  } = useCanvasGestures({
    camera,
    setCamera,
    currentMode,
    getEffectiveTileSize,
    canvasRef: dynamicCanvasRef,
    tileMap,
    chunkManager,
    canonicalRegions: CANONICAL_REGIONS,
    onTileClick,
    onTileHover,
    onSelectRegion,
    setHoveredTile,
    setHoveredRegion,
    baseTileSize: BASE_TILE_SIZE
  });

  // ==========================================================================
  // MAIN RAF RENDER LOOP (DUAL-CANVAS WITH DIRTY CACHING)
  // ==========================================================================
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      if (paused) return;
      const frameStartTime = performance.now();
      const time = frameStartTime * 0.001;

      // Update camera animation
      if (cameraAnimRef.current) {
        const anim = cameraAnimRef.current;
        const progress = Math.min(1, (frameStartTime - anim.startTime) / anim.duration);
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        const nextCam = {
          x: anim.startX + (anim.targetX - anim.startX) * ease,
          y: anim.startY + (anim.targetY - anim.startY) * ease,
          zoom: +(anim.startZoom + (anim.targetZoom - anim.startZoom) * ease).toFixed(3)
        };
        setCamera(nextCam);
        if (progress >= 1) cameraAnimRef.current = null;
      }

      const staticCanvas = staticCanvasRef.current;
      const dynamicCanvas = dynamicCanvasRef.current;
      if (!staticCanvas || !dynamicCanvas) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const staticCtx = staticCanvas.getContext('2d');
      const dynamicCtx = dynamicCanvas.getContext('2d');
      if (!staticCtx || !dynamicCtx) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const width = dynamicCanvas.width;
      const height = dynamicCanvas.height;
      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const currentTileSize = getEffectiveTileSize(width, height, camera.zoom, currentMode);
      const toScreenX = (worldX: number) => Math.round((worldX - camera.x) * currentTileSize + width / 2);
      const toScreenY = (worldY: number) => Math.round((worldY - camera.y) * currentTileSize + height / 2);

      // ----------------------------------------------------------------------
      // 1. STATIC LAYER (DIRTY TRACKED: 0 draw calls when camera is static)
      // ----------------------------------------------------------------------
      const cameraDirty = isCameraDirty(prevCameraRef.current, camera);
      if (cameraDirty || staticDirtyRef.current) {
        chunkManager.updateCamera(camera.x, camera.y, camera.zoom);

        if (currentMode === 'macro') {
          renderMacroLayer({
            ctx: staticCtx,
            width,
            height,
            camera,
            currentTileSize,
            toScreenX,
            toScreenY,
            hoveredRegion,
            playerPos,
            time
          });
        } else {
          renderStaticLayer({
            ctx: staticCtx,
            width,
            height,
            camera,
            currentTileSize,
            tileMap,
            toScreenX,
            toScreenY,
            showGrid,
            isBuildMode,
            hoveredTile,
            time
          });
        }

        prevCameraRef.current = { ...camera };
        staticDirtyRef.current = false;
      }

      // ----------------------------------------------------------------------
      // 2. DYNAMIC LAYER (Redraws entities, weather, particles, interactions)
      // ----------------------------------------------------------------------
      dynamicCtx.clearRect(0, 0, width, height);

      if (currentMode === 'zone') {
        const { visibleLights, eligibleResourceLabels } = renderDynamicLayer({
          ctx: dynamicCtx,
          width,
          height,
          camera,
          currentTileSize,
          tileMap,
          playerPos,
          animatedPlayerPos,
          activePath,
          targetTile,
          toScreenX,
          toScreenY,
          time,
          isWalking,
          exploredChunkSet,
          hoveredTile,
          loadedImages,
          warnedMissingDefs: warnedMissingDefsRef.current
        });

        renderWeatherAndLighting({
          ctx: dynamicCtx,
          width,
          height,
          weather,
          isNight,
          time,
          zoom: camera.zoom,
          curRegion: CANONICAL_REGIONS[0],
          playerScreenPos: {
            sx: toScreenX(animatedPlayerPos.current.x) + currentTileSize / 2,
            sy: toScreenY(animatedPlayerPos.current.y) + currentTileSize / 2
          },
          currentTileSize,
          visibleLights,
          nightCanvasRef,
          ambientParticlesRef,
          fps: fpsRef.current
        });

        renderInteractionLayer({
          ctx: dynamicCtx,
          width,
          height,
          camera,
          currentTileSize,
          hoveredTile,
          selectedTile: targetTile,
          toScreenX,
          toScreenY,
          eligibleResourceLabels,
          time
        });
      }

      const renderEndTime = performance.now();
      const dt = renderEndTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = renderEndTime;
      if (dt > 0) {
        fpsRef.current = fpsRef.current * 0.9 + (1000 / dt) * 0.1;
      }

      const frameTotal = renderEndTime - frameStartTime;
      perfProbe.mark('raf:frameTotal', frameTotal);
      perfProbe.recordFrame();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [camera, tiles, playerPos, targetTile, activePath, exploredChunkSet, isWalking, tileMap, loadedImages, weather, isNight, currentMode, paused, hoveredTile, hoveredRegion, showGrid, isBuildMode]);

  const handleToggleMode = () => {
    const nextMode = currentMode === 'macro' ? 'zone' : 'macro';
    setCurrentMode(nextMode);
    onModeChange?.(nextMode);
    setCamera(prev => ({
      ...prev,
      zoom: nextMode === 'macro' ? 0.18 : ZONE_DEFAULT_ZOOM
    }));
    staticDirtyRef.current = true;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-[#0a0a0f] flex flex-col items-center justify-center font-sans"
    >
      {/* 1. Static Canvas (Ground & Base Layer) */}
      <canvas
        ref={staticCanvasRef}
        className="absolute inset-0 pointer-events-none z-0 border-none outline-none"
      />

      {/* 2. Dynamic Canvas (Entities, Weather, Interactions) */}
      <canvas
        ref={dynamicCanvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={e => e.preventDefault()}
        className="absolute inset-0 z-10 w-full h-full cursor-crosshair active:cursor-grabbing border-none outline-none touch-none"
      />

      {/* L9: HUD CONTROLS (Vertical Floating Wuxia Dock on Left) */}
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
            onClick={() => {
              setIsBuildMode(prev => !prev);
              staticDirtyRef.current = true;
            }}
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

      {/* Mode Bangun Hover Info Card */}
      {!debugCam && isBuildMode && hoveredTile && currentMode === 'zone' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#0E121A]/95 border border-amber-600/70 p-3 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-1 min-w-[320px] max-w-[420px] animate-in fade-in pointer-events-none">
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
            {hoveredTile.isClaimable ? 'Tanah subur dan kokoh di dataran aman (Tier 1), siap untuk didirikan bangunan.' : 'Wilayah terlarang atau berada di dalam zona penyangga (buffer).'}
          </div>
        </div>
      )}

      {/* Macro Mode Region Tooltip */}
      {!debugCam && currentMode === 'macro' && hoveredRegion && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#0E121A]/95 border border-amber-600/70 p-3 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-1 min-w-[260px] animate-in fade-in pointer-events-none">
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
        </div>
      )}

      {/* Loading Screen */}
      {!debugCam && playerReady === false && (
        <WorldMapLoadingScreen isReady={false} />
      )}
    </div>
  );
}
