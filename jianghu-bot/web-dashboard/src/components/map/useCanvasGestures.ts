/**
 * JIANGHU WORLD — CANVAS PAN, ZOOM & TOUCH GESTURE HOOK (components/map/useCanvasGestures.ts)
 * Handles mouse drag panning, wheel zoom, single-touch panning, and dual-touch pinch-to-zoom.
 */

import { useRef, useState } from 'react';
import { CameraState } from './StaticLayerRenderer';
import { CanvasViewMode, TileData } from '@/types/world';
import { screenToWorldTile } from './InteractionOverlay';

export interface UseCanvasGesturesParams {
  camera: CameraState;
  setCamera: React.Dispatch<React.SetStateAction<CameraState>>;
  currentMode: CanvasViewMode;
  getEffectiveTileSize: (w: number, h: number, z: number, m: CanvasViewMode) => number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  tileMap: Map<string, TileData>;
  chunkManager: any;
  canonicalRegions: any[];
  onTileClick?: (tile: TileData) => void;
  onTileHover?: (tile: TileData | null) => void;
  onSelectRegion?: (regionSlug: string, centerX?: number, centerY?: number) => void;
  setHoveredTile: (tile: TileData | null) => void;
  setHoveredRegion: (region: any | null) => void;
  baseTileSize?: number;
}

export function useCanvasGestures({
  camera,
  setCamera,
  currentMode,
  getEffectiveTileSize,
  canvasRef,
  tileMap,
  chunkManager,
  canonicalRegions,
  onTileClick,
  onTileHover,
  onSelectRegion,
  setHoveredTile,
  setHoveredRegion,
  baseTileSize = 54
}: UseCanvasGesturesParams) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cameraStart, setCameraStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
    const { tileX, tileY } = screenToWorldTile(screenX, screenY, canvas.width, canvas.height, camera.x, camera.y, currentTileSize);

    if (currentMode === 'macro') {
      const reg = canonicalRegions.find((r: any) =>
        tileX >= r.bounds.minX && tileX <= r.bounds.maxX &&
        tileY >= r.bounds.minY && tileY <= r.bounds.maxY
      );
      setHoveredRegion(reg || null);
    } else {
      const tile = tileMap.get(`${tileX},${tileY}`) || chunkManager.getTile(tileX, tileY);
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
      const { tileX, tileY } = screenToWorldTile(screenX, screenY, canvas.width, canvas.height, camera.x, camera.y, currentTileSize);

      if (currentMode === 'macro') {
        const reg = canonicalRegions.find((r: any) =>
          tileX >= r.bounds.minX && tileX <= r.bounds.maxX &&
          tileY >= r.bounds.minY && tileY <= r.bounds.maxY
        );
        if (reg && onSelectRegion) {
          onSelectRegion(reg.regionSlug, reg.centerX, reg.centerY);
        }
      } else {
        const selectedTile = tileMap.get(`${tileX},${tileY}`) || chunkManager.getTile(tileX, tileY) || {
          tileX,
          tileY,
          terrainType: 'plains',
          tileType: 'walkable'
        };
        onTileClick?.(selectedTile);
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
      touchState.current.initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
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

      const currentTileSize = baseTileSize * camera.zoom;
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
      const currentTileSize = baseTileSize * camera.zoom;
      const { tileX, tileY } = screenToWorldTile(screenX, screenY, canvas.width, canvas.height, camera.x, camera.y, currentTileSize);

      if (currentMode === 'macro') {
        const reg = canonicalRegions.find((r: any) =>
          tileX >= r.bounds.minX && tileX <= r.bounds.maxX &&
          tileY >= r.bounds.minY && tileY <= r.bounds.maxY
        );
        if (reg && onSelectRegion) {
          onSelectRegion(reg.regionSlug, reg.centerX, reg.centerY);
        }
      } else {
        const selectedTile = tileMap.get(`${tileX},${tileY}`) || chunkManager.getTile(tileX, tileY) || {
          tileX,
          tileY,
          terrainType: 'plains',
          tileType: 'walkable'
        };
        onTileClick?.(selectedTile);
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

  return {
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleZoomIn,
    handleZoomOut
  };
}
