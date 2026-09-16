'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point } from '@/hooks/useAStarGridPath';

export interface TileData {
  tileX: number;
  tileY: number;
  terrainType: string;
  tileType: string;
  isSolid?: boolean;
  resourceType?: string | null;
  label?: string | null;
  settlementName?: string | null;
  chineseName?: string | null;
  isSettlementOrigin?: boolean;
  settlementData?: any;
  plotPriceSilver?: number;
  isOccupied?: boolean;
  buildingName?: string | null;
  baseTemperature?: number;
  spiritualQiDensity?: number;
}

interface TaleOfImmortalCanvasProps {
  tiles: TileData[];
  playerPos: { x: number; y: number };
  targetTile: Point | null;
  activePath: Point[];
  exploredChunks: string[];
  isWalking: boolean;
  onTileClick: (tile: TileData) => void;
  onTileHover?: (tile: TileData | null) => void;
  characterSpriteUrl?: string | null;
}

export default function TaleOfImmortalCanvas({
  tiles,
  playerPos,
  targetTile,
  activePath,
  exploredChunks,
  isWalking,
  onTileClick,
  onTileHover
}: TaleOfImmortalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera State (Panning & Zooming)
  const [camera, setCamera] = useState<{ x: number; y: number; zoom: number }>({
    x: playerPos.x,
    y: playerPos.y,
    zoom: 1.0
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cameraStart, setCameraStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<TileData | null>(null);

  // Ukuran dasar per tile dalam pixel
  const BASE_TILE_SIZE = 54;

  // Set explored chunks untuk O(1) Fog of War lookup
  const exploredChunkSet = React.useMemo(() => new Set(exploredChunks), [exploredChunks]);

  // Set solid tiles untuk rendering rintangan
  const tileMap = React.useMemo(() => {
    const map = new Map<string, TileData>();
    for (const t of tiles) {
      map.set(`${t.tileX},${t.tileY}`, t);
    }
    return map;
  }, [tiles]);

  // Pusatkan kamera pada pemain saat pertama kali dimuat atau reset
  const centerOnPlayer = useCallback(() => {
    setCamera(prev => ({ ...prev, x: playerPos.x, y: playerPos.y }));
  }, [playerPos.x, playerPos.y]);

  // Jika pemain bergerak terus menerus, kamera otomatis mengikuti secara mulus
  useEffect(() => {
    if (isWalking) {
      setCamera(prev => ({
        ...prev,
        x: prev.x + (playerPos.x - prev.x) * 0.25,
        y: prev.y + (playerPos.y - prev.y) * 0.25
      }));
    }
  }, [playerPos.x, playerPos.y, isWalking]);

  // ============================================================================
  // RENDERING ENGINE UTAMA (GUOHUA SHAN SHUI AESTHETICS - THE TALE OF IMMORTAL)
  // ============================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const currentTileSize = BASE_TILE_SIZE * camera.zoom;

      // Bersihkan kanvas dengan warna dasar kertas perkamen sutra (Xuan Paper)
      ctx.fillStyle = '#f5f2eb';
      ctx.fillRect(0, 0, width, height);

      // Hitung koordinat pojok kiri atas viewport dalam koordinat tile dunia
      const viewTilesX = width / currentTileSize;
      const viewTilesY = height / currentTileSize;

      const minTileX = Math.floor(camera.x - viewTilesX / 2) - 1;
      const maxTileX = Math.ceil(camera.x + viewTilesX / 2) + 1;
      const minTileY = Math.floor(camera.y - viewTilesY / 2) - 1;
      const maxTileY = Math.ceil(camera.y + viewTilesY / 2) + 1;

      // Fungsi konversi koordinat dunia ke koordinat layar
      const toScreenX = (wx: number) => (wx - camera.x + viewTilesX / 2) * currentTileSize;
      const toScreenY = (wy: number) => (wy - camera.y + viewTilesY / 2) * currentTileSize;

      // 1. Gambar Garis Kisi Halus Tinta (Ink Grid Lines)
      ctx.strokeStyle = 'rgba(60, 64, 70, 0.08)';
      ctx.lineWidth = 1;
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const sx = toScreenX(tx);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
      }
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const sy = toScreenY(ty);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
      }

      // 2. Gambar Medan Dasar (Terrain Watercolor & Shading)
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          const sx = toScreenX(tx);
          const sy = toScreenY(ty);

          const terrain = tile?.terrainType || 'plains';

          // Warna dasar cat air tradisional sesuai bioma
          if (terrain === 'bamboo_forest') {
            ctx.fillStyle = '#eaf2e8';
          } else if (terrain === 'forest') {
            ctx.fillStyle = '#e2ebe3';
          } else if (terrain === 'river') {
            ctx.fillStyle = '#dcebf2';
          } else if (terrain === 'swamp') {
            ctx.fillStyle = '#ede5f0';
          } else if (terrain === 'glacial') {
            ctx.fillStyle = '#eef5f8';
          } else if (terrain === 'mountain') {
            ctx.fillStyle = '#eae6e1';
          } else if (terrain === 'settlement') {
            ctx.fillStyle = '#f0ebe1';
          } else {
            ctx.fillStyle = '#f7f4ed';
          }

          ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
        }
      }

      // 3. Gambar Elemen Alam Shanshui (Gunung Tinta, Hutan Pinus, Bambu, Air)
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          if (!tile) continue;

          const sx = toScreenX(tx);
          const sy = toScreenY(ty);
          const terrain = tile.terrainType;

          // Puncak Gunung Tinta Shan Shui (Gambar 1)
          if (terrain === 'mountain' || terrain === 'glacial') {
            const isGlacial = terrain === 'glacial';
            // Siluet puncak batu bertingkat
            ctx.save();
            ctx.fillStyle = isGlacial ? 'rgba(95, 125, 145, 0.45)' : 'rgba(75, 80, 88, 0.5)';
            ctx.beginPath();
            ctx.moveTo(sx + currentTileSize * 0.1, sy + currentTileSize * 0.95);
            ctx.lineTo(sx + currentTileSize * 0.35, sy + currentTileSize * 0.15);
            ctx.lineTo(sx + currentTileSize * 0.65, sy + currentTileSize * 0.4);
            ctx.lineTo(sx + currentTileSize * 0.85, sy + currentTileSize * 0.1);
            ctx.lineTo(sx + currentTileSize * 0.98, sy + currentTileSize * 0.95);
            ctx.closePath();
            ctx.fill();

            // Lapisan kabut putih di kaki gunung
            const mistGrad = ctx.createLinearGradient(sx, sy + currentTileSize * 0.6, sx, sy + currentTileSize);
            mistGrad.addColorStop(0, 'rgba(245, 242, 235, 0.0)');
            mistGrad.addColorStop(1, 'rgba(245, 242, 235, 0.85)');
            ctx.fillStyle = mistGrad;
            ctx.fillRect(sx, sy + currentTileSize * 0.5, currentTileSize, currentTileSize * 0.5);

            // Garis goresan kuas tinta di tebing
            ctx.strokeStyle = isGlacial ? '#3d566e' : '#2f343b';
            ctx.lineWidth = 1.2 * camera.zoom;
            ctx.beginPath();
            ctx.moveTo(sx + currentTileSize * 0.35, sy + currentTileSize * 0.15);
            ctx.lineTo(sx + currentTileSize * 0.45, sy + currentTileSize * 0.6);
            ctx.moveTo(sx + currentTileSize * 0.85, sy + currentTileSize * 0.1);
            ctx.lineTo(sx + currentTileSize * 0.75, sy + currentTileSize * 0.65);
            ctx.stroke();
            ctx.restore();
          }

          // Rumpun Hutan Bambu
          else if (terrain === 'bamboo_forest') {
            ctx.save();
            ctx.strokeStyle = '#4b6f44';
            ctx.lineWidth = 1.2 * camera.zoom;
            // Batang bambu ramping
            for (let b = 0; b < 3; b++) {
              const bx = sx + currentTileSize * (0.25 + b * 0.25);
              ctx.beginPath();
              ctx.moveTo(bx, sy + currentTileSize * 0.9);
              ctx.lineTo(bx - 2, sy + currentTileSize * 0.25);
              ctx.stroke();

              // Daun bambu runcing
              ctx.fillStyle = '#5c8a52';
              ctx.beginPath();
              ctx.ellipse(bx + 4, sy + currentTileSize * 0.35, 6 * camera.zoom, 2 * camera.zoom, -Math.PI / 4, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          // Hutan Pinus Kuno
          else if (terrain === 'forest') {
            ctx.save();
            ctx.fillStyle = '#3a5043';
            // Bentuk segitiga pohon pinus bertumpuk
            const px = sx + currentTileSize * 0.5;
            for (let layer = 0; layer < 2; layer++) {
              const py = sy + currentTileSize * (0.35 + layer * 0.25);
              ctx.beginPath();
              ctx.moveTo(px, py - 8 * camera.zoom);
              ctx.lineTo(px - 10 * camera.zoom, py + 6 * camera.zoom);
              ctx.lineTo(px + 10 * camera.zoom, py + 6 * camera.zoom);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          }

          // Aliran Sungai / Air
          else if (terrain === 'river') {
            ctx.save();
            ctx.strokeStyle = 'rgba(70, 130, 160, 0.4)';
            ctx.lineWidth = 1.5 * camera.zoom;
            ctx.beginPath();
            ctx.arc(sx + currentTileSize * 0.3, sy + currentTileSize * 0.5, 8 * camera.zoom, 0, Math.PI);
            ctx.arc(sx + currentTileSize * 0.7, sy + currentTileSize * 0.5, 8 * camera.zoom, Math.PI, 0);
            ctx.stroke();
            ctx.restore();
          }

          // Titik Sumber Daya Alam (Pohon Bambu, Besi, Herba)
          if (tile.tileType === 'resource_node') {
            ctx.save();
            const cx = sx + currentTileSize / 2;
            const cy = sy + currentTileSize / 2;

            ctx.fillStyle = '#0f766e';
            ctx.beginPath();
            ctx.arc(cx, cy, 6 * camera.zoom, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(8, 10 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icon = tile.resourceType === 'ore' ? '⛏' : tile.resourceType === 'herb' ? '🌿' : '🪓';
            ctx.fillText(icon, cx, cy);
            ctx.restore();
          }
        }
      }

      // 4. Gambar Landmark Pemukiman / Kota Multikotak (Gambar 2: XiTong City)
      for (const t of tiles) {
        if (t.isSettlementOrigin && t.settlementData) {
          const sData = t.settlementData;
          const sx = toScreenX(t.tileX);
          const sy = toScreenY(t.tileY);
          const cWidth = sData.spanWidth * currentTileSize;
          const cHeight = sData.spanHeight * currentTileSize;

          ctx.save();
          // Kompleks Bangunan Pagoda Bertingkat Tradisional
          ctx.fillStyle = '#4a3f35';
          ctx.fillRect(sx + 8, sy + cHeight * 0.4, cWidth - 16, cHeight * 0.55);

          // Atap bertingkat gaya kuil tiongkok (Curved eaves)
          ctx.fillStyle = '#8c3d2e'; // Merah bata tradisional
          for (let r = 0; r < 2; r++) {
            const roofY = sy + cHeight * (0.25 + r * 0.2);
            ctx.beginPath();
            ctx.moveTo(sx + 4, roofY + 8 * camera.zoom);
            ctx.lineTo(sx + cWidth * 0.5, roofY - 6 * camera.zoom);
            ctx.lineTo(sx + cWidth - 4, roofY + 8 * camera.zoom);
            ctx.closePath();
            ctx.fill();
          }

          // Spanduk Nama Kota
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          const labelWidth = Math.min(140 * camera.zoom, cWidth * 0.9);
          ctx.fillRect(sx + (cWidth - labelWidth) / 2, sy + cHeight * 0.75, labelWidth, 18 * camera.zoom);

          ctx.fillStyle = '#fef08a';
          ctx.font = `bold ${Math.max(9, 11 * camera.zoom)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sData.name, sx + cWidth / 2, sy + cHeight * 0.75 + 9 * camera.zoom);

          // Badge Angka Peristiwa Aktif (seperti badge '64', '4' di Gambar 2)
          if (sData.activeEventCount) {
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(sx + 16 * camera.zoom, sy + cHeight * 0.45, 10 * camera.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(7, 9 * camera.zoom)}px sans-serif`;
            ctx.fillText(String(sData.activeEventCount), sx + 16 * camera.zoom, sy + cHeight * 0.45);
          }

          ctx.restore();
        }
      }

      // 5. Gambar Kabut Misteri (Fog of War) Lembut (Gambar 1 & 3)
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const chunkX = Math.floor(tx / 16);
          const chunkY = Math.floor(ty / 16);
          const isExplored = exploredChunkSet.has(`${chunkX},${chunkY}`);

          if (!isExplored) {
            const sx = toScreenX(tx);
            const sy = toScreenY(ty);

            // Kabut tinta semi-transparan bergulung
            ctx.fillStyle = 'rgba(215, 210, 200, 0.92)';
            ctx.fillRect(sx, sy, currentTileSize + 0.5, currentTileSize + 0.5);

            // Garis pembatas kabut kotak halus
            ctx.strokeStyle = 'rgba(180, 175, 165, 0.4)';
            ctx.strokeRect(sx, sy, currentTileSize, currentTileSize);
          }
        }
      }

      // 6. Visualisasi Garis Jalur Navigasi A* Kuning Bercahaya (Gambar 3)
      if (activePath && activePath.length > 1) {
        ctx.save();
        // Glow effect
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12 * camera.zoom;
        ctx.strokeStyle = '#eab308'; // Kuning emas
        ctx.lineWidth = 4 * camera.zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        activePath.forEach((pt, index) => {
          const px = toScreenX(pt.x) + currentTileSize / 2;
          const py = toScreenY(pt.y) + currentTileSize / 2;
          if (index === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Titik-titik waypoint kecil di sepanjang garis
        ctx.fillStyle = '#ffffff';
        activePath.forEach(pt => {
          const px = toScreenX(pt.x) + currentTileSize / 2;
          const py = toScreenY(pt.y) + currentTileSize / 2;
          ctx.beginPath();
          ctx.arc(px, py, 2 * camera.zoom, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }

      // 7. Kotak Seleksi Tile Target (Border Kuning Terang)
      if (targetTile) {
        const sx = toScreenX(targetTile.x);
        const sy = toScreenY(targetTile.y);
        ctx.save();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5 * camera.zoom;
        ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);

        // Panah bidik di tengah target
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(sx + currentTileSize / 2, sy + currentTileSize / 2, 4 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 8. Karakter Pendekar & Pedang Terbang (Flying Sword) (Gambar 2 & 3)
      const px = toScreenX(playerPos.x) + currentTileSize / 2;
      const py = toScreenY(playerPos.y) + currentTileSize / 2;

      ctx.save();
      // Efek bayangan di tanah
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(px, py + 12 * camera.zoom, 12 * camera.zoom, 4 * camera.zoom, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pedang Terbang Bercahaya (Flying Sword Sprite)
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8 * camera.zoom;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      // Bentuk pedang spiritual melayang
      ctx.moveTo(px - 14 * camera.zoom, py + 4 * camera.zoom);
      ctx.lineTo(px + 16 * camera.zoom, py + 4 * camera.zoom);
      ctx.lineTo(px + 10 * camera.zoom, py + 7 * camera.zoom);
      ctx.lineTo(px - 12 * camera.zoom, py + 7 * camera.zoom);
      ctx.closePath();
      ctx.fill();

      // Siluet Pendekar Jubah Putih/Abu-abu Berdiri Anggun
      ctx.shadowBlur = 0;
      // Jubah
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(px - 5 * camera.zoom, py + 4 * camera.zoom);
      ctx.lineTo(px + 5 * camera.zoom, py + 4 * camera.zoom);
      ctx.lineTo(px + 3 * camera.zoom, py - 10 * camera.zoom);
      ctx.lineTo(px - 3 * camera.zoom, py - 10 * camera.zoom);
      ctx.closePath();
      ctx.fill();

      // Kepala / Rambut Kuncir Panjang
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(px, py - 14 * camera.zoom, 4 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();

      // Aura Roh di sekeliling pendekar
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py - 6 * camera.zoom, 16 * camera.zoom, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [camera, tiles, playerPos, targetTile, activePath, exploredChunkSet, isWalking, tileMap]);

  // ============================================================================
  // INTERAKSI MOUSE: PAN, ZOOM, & KLIK TILE TERKALIBRASI
  // ============================================================================
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

    // Jika sedang drag untuk panning
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

    // Hitung koordinat hover yang akurat
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

    const tile = tileMap.get(`${hoverX},${hoverY}`) || {
      tileX: hoverX,
      tileY: hoverY,
      terrainType: 'plains',
      tileType: 'walkable'
    };

    setHoveredTile(tile);
    if (onTileHover) onTileHover(tile);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Jika pergeseran mouse sangat kecil (< 5 pixel), anggap sebagai KLIK TILE
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
        const selectedTile = tileMap.get(`${clickX},${clickY}`) || {
          tileX: clickX,
          tileY: clickY,
          terrainType: 'plains',
          tileType: 'walkable'
        };
        onTileClick(selectedTile);
      }
    }
  };

  // Zoom dengan Wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.45, Math.min(2.2, prev.zoom * zoomFactor))
    }));
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#0a0d14] flex flex-col items-center justify-center">
      {/* Canvas Viewport */}
      <canvas
        ref={canvasRef}
        width={1024}
        height={640}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing border border-[#383329] shadow-2xl"
      />

      {/* Kontrol Navigasi Mengambang (Floating Compass & Reset) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={centerOnPlayer}
          className="bg-black/80 hover:bg-black text-amber-300 border border-amber-800/60 px-3 py-1.5 rounded-lg text-xs font-serif font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95"
          title="Fokuskan Kamera ke Karakter"
        >
          <span>🎯 Pusatkan Karakter</span>
        </button>
        <button
          onClick={() => setCamera(prev => ({ ...prev, zoom: 1.0 }))}
          className="bg-black/80 hover:bg-black text-gray-300 border border-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-mono shadow-lg backdrop-blur-md"
          title="Reset Zoom"
        >
          {Math.round(camera.zoom * 100)}%
        </button>
      </div>

      {/* Global Coordinates Radar Minimap (5000x5000) */}
      <div className="absolute bottom-4 right-4 z-20 bg-black/85 border border-amber-900/60 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md text-right pointer-events-none">
        <div className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Koordinat Benua</div>
        <div className="text-xs font-mono font-bold text-amber-300">
          X: {playerPos.x} | Y: {playerPos.y}
        </div>
        <div className="text-[9px] text-gray-500 font-mono">Dunia: 5000 x 5000 Tile</div>
      </div>

      {/* Hover Info Tag */}
      {hoveredTile && (
        <div className="absolute top-4 left-4 z-20 bg-black/80 border border-amber-900/50 px-3 py-1 rounded-md text-xs text-amber-100 backdrop-blur-sm pointer-events-none">
          <span className="font-semibold">{hoveredTile.label || hoveredTile.terrainType}</span> ({hoveredTile.tileX}, {hoveredTile.tileY})
        </div>
      )}
    </div>
  );
}
