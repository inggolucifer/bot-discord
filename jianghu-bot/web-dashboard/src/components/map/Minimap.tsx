'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Compass, Map as MapIcon, Maximize2, ZoomIn, ZoomOut, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { CANONICAL_LANDMARKS, CANONICAL_REGIONS } from '@/config/canonicalRegions';
import { getWorldRasterImageSync, loadWorldRasterImage } from '@/lib/worldRasterLoader';

export interface MinimapProps {
  playerPos: { x: number; y: number };
  cameraPos?: { x: number; y: number; zoom?: number };
  targetTile?: { x: number; y: number } | null;
  activePath?: Array<{ x: number; y: number }>;
  regionName?: string;
  regionChineseName?: string;
  dangerTier?: number;
  exploredChunks?: string[];
  onOpenMacroMap?: () => void;
  onSelectCoordinate?: (x: number, y: number) => void;
  className?: string;
}

type ZoomLevel = 'focus' | 'near' | 'regional' | 'macro';

const ZOOM_LEVELS: ZoomLevel[] = ['focus', 'near', 'regional', 'macro'];

const ZOOM_CONFIG: Record<ZoomLevel, { radius: number; label: string }> = {
  focus: { radius: 35, label: 'Fokus' },
  near: { radius: 120, label: 'Dekat' },
  regional: { radius: 500, label: 'Wilayah' },
  macro: { radius: 2500, label: 'Benua' }
};

export default function Minimap({
  playerPos,
  cameraPos,
  targetTile,
  activePath,
  regionName = 'Central Plains',
  regionChineseName,
  dangerTier = 1,
  exploredChunks,
  onOpenMacroMap,
  onSelectCoordinate,
  className = ''
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('near');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredLandmark, setHoveredLandmark] = useState<any | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isImageReadyRef = useRef<boolean>(false);

  // Preload raster on mount
  useEffect(() => {
    loadWorldRasterImage()
      .then(() => {
        isImageReadyRef.current = true;
      })
      .catch((err) => {
        console.warn('[Minimap] Raster preload notice:', err);
      });
  }, []);

  // Zoom controls
  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => {
      const idx = ZOOM_LEVELS.indexOf(prev);
      if (idx > 0) return ZOOM_LEVELS[idx - 1];
      return prev;
    });
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => {
      const idx = ZOOM_LEVELS.indexOf(prev);
      if (idx < ZOOM_LEVELS.length - 1) return ZOOM_LEVELS[idx + 1];
      return prev;
    });
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => {
      const idx = ZOOM_LEVELS.indexOf(prev);
      const nextIdx = (idx + 1) % ZOOM_LEVELS.length;
      return ZOOM_LEVELS[nextIdx];
    });
  };

  // Canvas click to coordinates
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radarRadius = Math.min(width, height) / 2 - 8;

    const dx = clickX - cx;
    const dy = clickY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If within circular radar bezel
    if (dist <= radarRadius) {
      const radiusTiles = ZOOM_CONFIG[zoomLevel].radius;
      let targetX: number;
      let targetY: number;

      if (zoomLevel === 'macro') {
        // Macro view maps entire 5000x5000 to the circle
        targetX = Math.round((clickX / width) * 5000);
        targetY = Math.round((clickY / height) * 5000);
      } else {
        // Radar / Regional relative to player
        targetX = Math.round(playerPos.x + (dx / radarRadius) * radiusTiles);
        targetY = Math.round(playerPos.y + (dy / radarRadius) * radiusTiles);
      }

      targetX = Math.max(0, Math.min(5000, targetX));
      targetY = Math.max(0, Math.min(5000, targetY));

      if (onSelectCoordinate) {
        onSelectCoordinate(targetX, targetY);
      }
    }
  };

  // Continuous radar rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isCollapsed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const radarRadius = Math.min(width, height) / 2 - 8;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Outer Shan Shui Bronze Ring & Bezel
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(12, 16, 23, 0.95)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8C6D3B'; // Antique bronze
      ctx.stroke();

      // Subtle inner rim
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212, 177, 106, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 2. Clip to Circular Radar Screen
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
      ctx.clip();

      // 3. Draw World Raster Map
      const rasterImg = getWorldRasterImageSync();
      const radiusTiles = ZOOM_CONFIG[zoomLevel].radius;

      if (rasterImg && rasterImg.complete && rasterImg.naturalWidth > 0) {
        if (zoomLevel === 'macro') {
          // Full continent view
          ctx.drawImage(rasterImg, 0, 0, width, height);
        } else {
          // Centered on player
          // Convert world coordinates to raster pixel space (1250 px = 5000 tiles => factor 0.25)
          const pxCenter = playerPos.x * 0.25;
          const pyCenter = playerPos.y * 0.25;
          const rPixels = radiusTiles * 0.25;

          const sx = pxCenter - rPixels;
          const sy = pyCenter - rPixels;
          const sw = rPixels * 2;
          const sh = rPixels * 2;

          ctx.drawImage(rasterImg, sx, sy, sw, sh, cx - radarRadius, cy - radarRadius, radarRadius * 2, radarRadius * 2);
        }
      } else {
        // Fallback dark paper tone
        ctx.fillStyle = '#1c221d';
        ctx.fillRect(0, 0, width, height);
      }

      // 4. Subtle Distance Concentric Rings & Crosshair
      if (zoomLevel !== 'macro') {
        ctx.strokeStyle = 'rgba(212, 177, 106, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);

        // Ring 1 (1/3 radius)
        ctx.beginPath();
        ctx.arc(cx, cy, radarRadius * 0.35, 0, Math.PI * 2);
        ctx.stroke();

        // Ring 2 (2/3 radius)
        ctx.beginPath();
        ctx.arc(cx, cy, radarRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Subtle crosshair guides
        ctx.strokeStyle = 'rgba(212, 177, 106, 0.12)';
        ctx.beginPath();
        ctx.moveTo(cx, cy - radarRadius);
        ctx.lineTo(cx, cy + radarRadius);
        ctx.moveTo(cx - radarRadius, cy);
        ctx.lineTo(cx + radarRadius, cy);
        ctx.stroke();
      }

      // 5. Active Path & Target Destination Pin
      if (activePath && activePath.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();

        const toMinimapX = (wx: number) => {
          if (zoomLevel === 'macro') return (wx / 5000) * width;
          return cx + ((wx - playerPos.x) / radiusTiles) * radarRadius;
        };
        const toMinimapY = (wy: number) => {
          if (zoomLevel === 'macro') return (wy / 5000) * height;
          return cy + ((wy - playerPos.y) / radiusTiles) * radarRadius;
        };

        const startX = toMinimapX(playerPos.x);
        const startY = toMinimapY(playerPos.y);
        ctx.moveTo(startX, startY);

        for (const pt of activePath) {
          ctx.lineTo(toMinimapX(pt.x), toMinimapY(pt.y));
        }
        ctx.stroke();
        ctx.restore();
      }

      // Target Pin
      if (targetTile) {
        const toMinimapX = (wx: number) => {
          if (zoomLevel === 'macro') return (wx / 5000) * width;
          return cx + ((wx - playerPos.x) / radiusTiles) * radarRadius;
        };
        const toMinimapY = (wy: number) => {
          if (zoomLevel === 'macro') return (wy / 5000) * height;
          return cy + ((wy - playerPos.y) / radiusTiles) * radarRadius;
        };

        const tx = toMinimapX(targetTile.x);
        const ty = toMinimapY(targetTile.y);

        ctx.save();
        ctx.fillStyle = '#EF4444';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 6. Draw Nearby Canonical Landmarks
      CANONICAL_LANDMARKS.forEach((lm) => {
        let lx: number;
        let ly: number;

        if (zoomLevel === 'macro') {
          lx = (lm.x / 5000) * width;
          ly = (lm.y / 5000) * height;
        } else {
          const dx = lm.x - playerPos.x;
          const dy = lm.y - playerPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radiusTiles) return; // Outside radar range

          lx = cx + (dx / radiusTiles) * radarRadius;
          ly = cy + (dy / radiusTiles) * radarRadius;
        }

        // Pin styling based on landmark type
        let color = '#D4B16A'; // Village / Hamlet (Gold)
        let sealChar = '村';
        if (lm.type === 'city') {
          color = '#F59E0B'; // Amber
          sealChar = '城';
        } else if (lm.type === 'sect') {
          color = '#C084FC'; // Purple
          sealChar = '宗';
        } else if (lm.type === 'port') {
          color = '#38BDF8'; // Cyan
          sealChar = '津';
        } else if (lm.type === 'pass') {
          color = '#F87171'; // Red
          sealChar = '关';
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Landmark label at close zoom
        if (zoomLevel === 'focus' || zoomLevel === 'near') {
          ctx.font = 'bold 8px serif';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.fillText(sealChar, lx, ly - 4.5);
          if (zoomLevel === 'focus') {
            ctx.font = '7px sans-serif';
            ctx.fillStyle = '#FEF08A';
            ctx.fillText(lm.name.slice(0, 8), lx, ly + 8);
          }
        }
        ctx.restore();
      });

      // 7. Screen Viewport Frustum / Camera Box
      if (cameraPos && zoomLevel !== 'macro') {
        const viewW = (32 / (cameraPos.zoom || 1)) * (radarRadius / radiusTiles) * 2;
        const viewH = (18 / (cameraPos.zoom || 1)) * (radarRadius / radiusTiles) * 2;
        const camX = cx + ((cameraPos.x - playerPos.x) / radiusTiles) * radarRadius;
        const camY = cy + ((cameraPos.y - playerPos.y) / radiusTiles) * radarRadius;

        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(camX - viewW / 2, camY - viewH / 2, viewW, viewH);
        ctx.restore();
      }

      // 8. Player Beacon (Center in radar, absolute in macro)
      let plX = cx;
      let plY = cy;
      if (zoomLevel === 'macro') {
        plX = (playerPos.x / 5000) * width;
        plY = (playerPos.y / 5000) * height;
      }

      // Outer animated pulse ring
      ctx.save();
      const pulseR = 5 + Math.sin(elapsed * 4.5) * 2.5;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(plX, plY, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      // Core red beacon dot
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(plX, plY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // End clipping
      ctx.restore();

      // 9. Cardinal Direction Markers (Antique Calligraphy on Rim)
      ctx.save();
      ctx.font = 'bold 9px serif';
      ctx.fillStyle = '#D4B16A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // North (北)
      ctx.fillText('北', cx, cy - radarRadius - 1);
      // East (东)
      ctx.fillText('东', cx + radarRadius + 1, cy);
      // South (南)
      ctx.fillText('南', cx, cy + radarRadius + 2);
      // West (西)
      ctx.fillText('西', cx - radarRadius - 1, cy);
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerPos.x, playerPos.y, zoomLevel, isCollapsed, targetTile, activePath, cameraPos]);

  // Chinese & Display name resolution
  const regionMeta = useMemo(() => {
    return CANONICAL_REGIONS.find(
      r => r.regionSlug === regionName || r.displayName.toLowerCase() === regionName.toLowerCase()
    );
  }, [regionName]);

  const displayChinese = regionChineseName || regionMeta?.chineseName || '中原神州';
  const displayTitle = regionMeta?.displayName || regionName || 'Central Plains';
  const effectiveTier = regionMeta?.dangerTier || dangerTier || 1;

  let tierBadgeBg = 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50';
  if (effectiveTier === 2) tierBadgeBg = 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50';
  else if (effectiveTier === 3) tierBadgeBg = 'bg-amber-950/80 text-amber-300 border-amber-600/50';
  else if (effectiveTier === 4) tierBadgeBg = 'bg-red-950/80 text-red-300 border-red-600/50';
  else if (effectiveTier === 5) tierBadgeBg = 'bg-purple-950/80 text-purple-300 border-purple-600/50';

  // Compact Collapsed Pill View
  if (isCollapsed) {
    return (
      <div className={`pointer-events-auto select-none ${className}`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 bg-[#0c1017]/90 hover:bg-[#131b26]/95 border border-[#8c6d3b]/60 px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-serif transition-all active:scale-95 group"
          title="Buka Radar Peta Jianghu"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
          <span className="font-mono font-bold text-amber-300">
            ({playerPos.x}, {playerPos.y})
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-300 text-[11px] font-sans truncate max-w-[90px]">
            {displayTitle}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-amber-500/80" />
        </button>
      </div>
    );
  }

  return (
    <div className={`pointer-events-auto select-none flex flex-col items-end gap-1.5 ${className}`}>
      {/* Main Glassmorphic Minimap Card */}
      <div className="bg-[#0c1017]/92 backdrop-blur-md border border-[#8c6d3b]/50 rounded-2xl p-2 sm:p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex flex-col items-center gap-1.5 w-[190px] sm:w-[200px] transition-all">
        
        {/* Header: Coordinates & Collapse Toggle */}
        <div className="w-full flex items-center justify-between text-xs pb-1 border-b border-amber-900/30">
          <div className="flex items-center gap-1 text-amber-300 font-mono font-bold text-[11px]">
            <Compass className="w-3 h-3 text-amber-400 animate-spin-slow" />
            <span>({playerPos.x}, {playerPos.y})</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel === 'focus'}
              title="Perbesar Minimap (+)"
              className="w-5 h-5 flex items-center justify-center rounded text-[11px] bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/50 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-all active:scale-95"
            >
              +
            </button>
            <button
              onClick={handleToggleZoom}
              title={`Zoom: ${ZOOM_CONFIG[zoomLevel].label}. Klik untuk siklus zoom.`}
              className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/50 font-serif font-semibold transition-colors min-w-[42px] text-center"
            >
              {ZOOM_CONFIG[zoomLevel].label}
            </button>
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel === 'macro'}
              title="Perkecil Minimap (-)"
              className="w-5 h-5 flex items-center justify-center rounded text-[11px] bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/50 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-all active:scale-95"
            >
              -
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              title="Kecilkan Radar"
              className="text-gray-400 hover:text-amber-300 p-0.5 rounded transition-colors ml-0.5"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Circular Radar Canvas Viewport */}
        <div className="relative w-[170px] h-[170px] flex items-center justify-center cursor-crosshair group">
          <canvas
            ref={canvasRef}
            width={170}
            height={170}
            onClick={handleCanvasClick}
            className="rounded-full shadow-inner"
          />

          {/* Center Crosshair Sub-Indicator */}
          <div className="absolute inset-0 pointer-events-none rounded-full border border-amber-500/10" />
        </div>

        {/* Footer: Region Calligraphy & Macro Map Launch Button */}
        <div className="w-full flex items-center justify-between pt-1 border-t border-amber-900/30 text-[11px]">
          <div className="flex flex-col min-w-0 pr-1">
            <div className="flex items-center gap-1">
              <span className="font-serif font-bold text-amber-200 truncate text-[11px]">
                {displayChinese}
              </span>
              <span className={`text-[9px] px-1 py-0.2 rounded border font-sans font-bold ${tierBadgeBg}`}>
                T{effectiveTier}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 truncate font-sans">
              {displayTitle}
            </span>
          </div>

          {onOpenMacroMap && (
            <button
              onClick={onOpenMacroMap}
              title="Buka Peta Makro Seluruh Benua"
              className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-900/80 to-amber-800/80 hover:from-amber-800 hover:to-amber-700 text-amber-100 rounded-lg border border-amber-600/60 text-[10px] font-serif font-bold transition-all active:scale-95 shadow-md flex-shrink-0"
            >
              <MapIcon className="w-3 h-3 text-amber-300" />
              <span>Makro</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
