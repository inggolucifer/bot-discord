'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point } from '@/hooks/useAStarGridPath';
import MapActionOverlay from './MapActionOverlay';
import { useGlobalAssetLoader } from '@/hooks/useGlobalAssetLoader';

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
  regionId?: string;
  regionName?: string;
  territoryType?: string;
  dangerTier?: number;
  ambushRiskRate?: number;
  factionName?: string | null;
  staminaCost?: number;
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
  onActionWalk?: () => void;
  onActionInspect?: () => void;
  onClearTarget?: () => void;
  weather?: 'rain' | 'snow' | 'miasma' | 'none';
  isNight?: boolean;
}

export default function TaleOfImmortalCanvas({
  tiles,
  playerPos,
  targetTile,
  activePath,
  exploredChunks,
  isWalking,
  onTileClick,
  onTileHover,
  onActionWalk,
  onActionInspect,
  onClearTarget,
  weather = 'none',
  isNight = false
}: TaleOfImmortalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera State
  const [camera, setCamera] = useState<{ x: number; y: number; zoom: number }>({
    x: playerPos.x,
    y: playerPos.y,
    zoom: 1.0
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cameraStart, setCameraStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<TileData | null>(null);
  
  const { loadedImages } = useGlobalAssetLoader();
  
  // Track overlay position
  const [overlayPos, setOverlayPos] = useState<{x: number, y: number} | null>(null);

  const BASE_TILE_SIZE = 54;
  const exploredChunkSet = React.useMemo(() => new Set(exploredChunks), [exploredChunks]);
  const tileMap = React.useMemo(() => {
    const map = new Map<string, TileData>();
    for (const t of tiles) map.set(`${t.tileX},${t.tileY}`, t);
    return map;
  }, [tiles]);

  const centerOnPlayer = useCallback(() => {
    setCamera(prev => ({ ...prev, x: playerPos.x, y: playerPos.y }));
  }, [playerPos.x, playerPos.y]);

  useEffect(() => {
    if (isWalking) {
      setCamera(prev => ({
        ...prev,
        x: prev.x + (playerPos.x - prev.x) * 0.25,
        y: prev.y + (playerPos.y - prev.y) * 0.25
      }));
    }
  }, [playerPos.x, playerPos.y, isWalking]);

  // Update Overlay Position when camera or target changes
  useEffect(() => {
    if (!targetTile || !canvasRef.current) {
      setOverlayPos(null);
      return;
    }
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const currentTileSize = BASE_TILE_SIZE * camera.zoom;
    const viewTilesX = canvas.width / currentTileSize;
    const viewTilesY = canvas.height / currentTileSize;
    
    // Position at the top-center of the target tile
    const screenX = (targetTile.x - camera.x + viewTilesX / 2) * currentTileSize + (currentTileSize / 2);
    const screenY = (targetTile.y - camera.y + viewTilesY / 2) * currentTileSize;
    
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    setOverlayPos({
      x: screenX * scaleX,
      y: screenY * scaleY
    });
  }, [targetTile, camera, BASE_TILE_SIZE]);

  // Rendering Engine
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

      // Kertas Perkamen Latar Belakang (Parchment Silk)
      if (loadedImages.ui?.parchment_bg) {
        ctx.drawImage(loadedImages.ui.parchment_bg, 0, 0, width, height);
      } else {
        const bgGradient = ctx.createRadialGradient(width/2, height/2, height/4, width/2, height/2, width);
        bgGradient.addColorStop(0, '#f2eadd');
        bgGradient.addColorStop(1, '#e3d5bd');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
      }
      
      // Tambahkan noise lembut untuk efek tekstur kertas
      ctx.fillStyle = 'rgba(100, 80, 50, 0.03)';
      for(let i=0; i<100; i++) {
        ctx.fillRect(Math.random()*width, Math.random()*height, 2, 2);
      }

      const viewTilesX = width / currentTileSize;
      const viewTilesY = height / currentTileSize;
      const minTileX = Math.floor(camera.x - viewTilesX / 2) - 1;
      const maxTileX = Math.ceil(camera.x + viewTilesX / 2) + 1;
      const minTileY = Math.floor(camera.y - viewTilesY / 2) - 1;
      const maxTileY = Math.ceil(camera.y + viewTilesY / 2) + 1;

      const toScreenX = (wx: number) => (wx - camera.x + viewTilesX / 2) * currentTileSize;
      const toScreenY = (wy: number) => (wy - camera.y + viewTilesY / 2) * currentTileSize;

      // 1. Gambar Garis Grid Semi-transparan (Estetik)
      ctx.strokeStyle = 'rgba(120, 100, 70, 0.15)'; // Warna emas/tinta pudar
      ctx.lineWidth = 1;
      ctx.globalCompositeOperation = 'multiply';
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const sx = toScreenX(tx);
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, height); ctx.stroke();
      }
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const sy = toScreenY(ty);
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(width, sy); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';

      // 2. Gambar Medan Dasar dengan Gaya Lukisan Tinta
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          if (!tile) continue;
          
          const sx = toScreenX(tx);
          const sy = toScreenY(ty);
          const terrain = tile.terrainType;

          ctx.save();
          
          let imgObj: HTMLImageElement | null | undefined = undefined;
          if (terrain === 'river' || terrain === 'eastern_sea') imgObj = loadedImages.terrain?.river;
          else if (terrain === 'bamboo_forest') imgObj = loadedImages.terrain?.bamboo_forest;
          else if (terrain === 'forest') imgObj = loadedImages.terrain?.forest;
          else if (terrain === 'mountain' || terrain === 'azure_mountain') imgObj = loadedImages.terrain?.azure_mountain;
          else if (terrain === 'glacial' || terrain === 'northern_glacial') imgObj = loadedImages.terrain?.northern_glacial;
          else if (terrain === 'swamp' || terrain === 'demonic_swamp') imgObj = loadedImages.terrain?.demonic_swamp;
          else if (terrain === 'western_desert') imgObj = loadedImages.terrain?.western_desert;
          else if (terrain === 'settlement') imgObj = loadedImages.terrain?.settlement_floor;
          else imgObj = loadedImages.terrain?.plains;

          if (imgObj) {
            ctx.drawImage(imgObj, sx, sy, currentTileSize, currentTileSize);
            // Optionally, add water ripple overlay even on images
            if (terrain === 'river' || terrain === 'eastern_sea' || terrain === 'swamp') {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
              ctx.beginPath();
              const waveOffset = Math.sin(time + tx * 0.5 + ty * 0.5) * 5 * camera.zoom;
              ctx.moveTo(sx + 5, sy + currentTileSize/2 + waveOffset);
              ctx.quadraticCurveTo(sx + currentTileSize/2, sy + currentTileSize/2 - waveOffset, sx + currentTileSize - 5, sy + currentTileSize/2 + waveOffset);
              ctx.stroke();
            }
          } else {
            // FALLBACK PROCEDURAL
            if (terrain === 'river' || terrain === 'swamp' || terrain === 'demonic_swamp' || terrain === 'eastern_sea') {
              ctx.fillStyle = (terrain === 'river' || terrain === 'eastern_sea') ? 'rgba(135, 180, 200, 0.4)' : 'rgba(160, 175, 160, 0.4)';
              ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.beginPath();
              const waveOffset = Math.sin(time + tx * 0.5 + ty * 0.5) * 5 * camera.zoom;
              ctx.moveTo(sx + 5, sy + currentTileSize/2 + waveOffset);
              ctx.quadraticCurveTo(sx + currentTileSize/2, sy + currentTileSize/2 - waveOffset, sx + currentTileSize - 5, sy + currentTileSize/2 + waveOffset);
              ctx.stroke();
            } 
            else if (terrain === 'bamboo_forest' || terrain === 'forest') {
              ctx.fillStyle = terrain === 'bamboo_forest' ? 'rgba(160, 190, 140, 0.4)' : 'rgba(120, 150, 120, 0.4)';
              ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
              ctx.fillStyle = terrain === 'bamboo_forest' ? '#5c8a52' : '#3a5043';
              const sway = Math.sin(time * 2 + tx) * 2 * camera.zoom;
              ctx.beginPath();
              ctx.moveTo(sx + currentTileSize/2 + sway, sy + currentTileSize*0.2);
              ctx.lineTo(sx + currentTileSize*0.2, sy + currentTileSize*0.8);
              ctx.lineTo(sx + currentTileSize*0.8, sy + currentTileSize*0.8);
              ctx.fill();
            }
            else if (terrain === 'mountain' || terrain === 'glacial' || terrain === 'azure_mountain' || terrain === 'northern_glacial') {
              const isGlacial = terrain === 'glacial' || terrain === 'northern_glacial';
              ctx.fillStyle = isGlacial ? 'rgba(180, 210, 230, 0.5)' : 'rgba(180, 175, 170, 0.5)';
              ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
              ctx.fillStyle = isGlacial ? '#6a8a9a' : '#5a5550';
              ctx.beginPath();
              ctx.moveTo(sx + currentTileSize*0.1, sy + currentTileSize*0.9);
              ctx.lineTo(sx + currentTileSize*0.5, sy + currentTileSize*0.2);
              ctx.lineTo(sx + currentTileSize*0.9, sy + currentTileSize*0.9);
              ctx.fill();
              if (isGlacial) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.moveTo(sx + currentTileSize*0.35, sy + currentTileSize*0.45);
                ctx.lineTo(sx + currentTileSize*0.5, sy + currentTileSize*0.2);
                ctx.lineTo(sx + currentTileSize*0.65, sy + currentTileSize*0.45);
                ctx.fill();
              }
            }
            else if (terrain === 'settlement') {
              ctx.fillStyle = 'rgba(220, 205, 185, 0.6)';
              ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
            }
            else if (terrain === 'western_desert') {
              ctx.fillStyle = '#e2cca0';
              ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
            }
          }

          // 2.5 Territory Overlays
          if (tile.territoryType === 'danger_zone') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)'; // Red tint for danger
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
          } else if (tile.territoryType === 'sect_territory') {
            ctx.fillStyle = 'rgba(128, 0, 128, 0.1)'; // Purple tint for sect
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
          } else if (tile.territoryType === 'monster_zone') {
             // Let's add a small icon or just a very faint orange tint
             ctx.fillStyle = 'rgba(255, 165, 0, 0.05)'; 
             ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
          }
          ctx.restore();
        }
      }

      // 3. Landmark Kota Besar
      for (const t of tiles) {
        if (t.isSettlementOrigin && t.settlementData) {
          const sData = t.settlementData;
          const sx = toScreenX(t.tileX);
          const sy = toScreenY(t.tileY);
          const cWidth = sData.spanWidth * currentTileSize;
          const cHeight = sData.spanHeight * currentTileSize;
          const sName = sData.name;

          ctx.save();
          let landmarkImg: HTMLImageElement | null | undefined = (loadedImages.sects as any)?.[sName] || (loadedImages.cities as any)?.[sName];
          if (!landmarkImg && sData.type === 'city') landmarkImg = loadedImages.cities?.default_city;
          if (!landmarkImg && sData.type === 'village') landmarkImg = loadedImages.cities?.default_village;

          if (landmarkImg) {
            ctx.drawImage(landmarkImg, sx, sy, cWidth, cHeight);
          } else {
            // Atap merah kuil
            ctx.fillStyle = '#8c3d2e'; 
            ctx.beginPath();
            ctx.moveTo(sx + 4, sy + cHeight * 0.4);
            ctx.lineTo(sx + cWidth * 0.5, sy + cHeight * 0.1);
            ctx.lineTo(sx + cWidth - 4, sy + cHeight * 0.4);
            ctx.fill();
            
            ctx.fillStyle = '#4a3f35';
            ctx.fillRect(sx + 10, sy + cHeight * 0.4, cWidth - 20, cHeight * 0.4);

            // Stempel Nama Kota (Merah Kaligrafi)
            const labelWidth = Math.min(160 * camera.zoom, cWidth * 0.9);
            ctx.fillStyle = 'rgba(140, 30, 30, 0.9)';
            ctx.fillRect(sx + (cWidth - labelWidth)/2, sy + cHeight * 0.8, labelWidth, 22 * camera.zoom);
            
            ctx.fillStyle = '#fceabb';
            ctx.font = `bold ${Math.max(10, 12 * camera.zoom)}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(sName, sx + cWidth/2, sy + cHeight * 0.8 + 11 * camera.zoom);
          }
          ctx.restore();
        }
      }

      // 4. Kabut Misteri Lembut (Ink Cloud Fog of War)
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const chunkX = Math.floor(tx / 16);
          const chunkY = Math.floor(ty / 16);
          if (!exploredChunkSet.has(`${chunkX},${chunkY}`)) {
            const sx = toScreenX(tx);
            const sy = toScreenY(ty);
            // Kabut tinta putih/krem tebal
            ctx.fillStyle = 'rgba(235, 230, 218, 0.98)';
            ctx.fillRect(sx-1, sy-1, currentTileSize+2, currentTileSize+2);
            
            // Efek pinggiran kabut (tinta pudar)
            ctx.fillStyle = 'rgba(180, 175, 160, 0.2)';
            ctx.beginPath();
            ctx.arc(sx + currentTileSize/2, sy + currentTileSize/2, currentTileSize * 0.8, 0, Math.PI*2);
            ctx.fill();
          }
        }
      }

      // 5. Jalur A* Kuning Bercahaya (Glow Path)
      if (activePath && activePath.length > 1) {
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15 * camera.zoom;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5 * camera.zoom;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        ctx.beginPath();
        activePath.forEach((pt, idx) => {
          const px = toScreenX(pt.x) + currentTileSize/2;
          const py = toScreenY(pt.y) + currentTileSize/2;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      }

      // 6. Seleksi Target Estetik (Mandala / Kaligrafi Kursor)
      if (targetTile) {
        const sx = toScreenX(targetTile.x);
        const sy = toScreenY(targetTile.y);
        ctx.save();
        ctx.translate(sx + currentTileSize/2, sy + currentTileSize/2);
        ctx.rotate(time * 1.5);
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)';
        ctx.lineWidth = 2 * camera.zoom;
        
        ctx.beginPath();
        const r = currentTileSize * 0.45;
        // Bintang 4 sudut melengkung
        for(let i=0; i<4; i++) {
          ctx.rotate(Math.PI/2);
          ctx.moveTo(r, 0);
          ctx.quadraticCurveTo(0, 0, 0, r);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 7. Avatar Karakter Utama (Spiritual Aura)
      const px = toScreenX(playerPos.x) + currentTileSize/2;
      const py = toScreenY(playerPos.y) + currentTileSize/2;
      
      ctx.save();
      if (loadedImages.sprites?.player_default) {
        const pw = currentTileSize * 1.5;
        const ph = pw * 1.5;
        ctx.drawImage(loadedImages.sprites.player_default, px - pw/2, py - ph/2 - 10*camera.zoom, pw, ph);
        
        if (loadedImages.sprites?.flying_sword_aura) {
          ctx.drawImage(loadedImages.sprites.flying_sword_aura, px - pw/2, py + 5*camera.zoom, pw, pw/2);
        }
      } else {
        // Bayangan
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(px, py + 12*camera.zoom, 14*camera.zoom, 5*camera.zoom, 0, 0, Math.PI*2); ctx.fill();
        
        // Aura berdenyut
        const auraPulse = 14 + Math.sin(time*5) * 3;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.beginPath(); ctx.arc(px, py - 6*camera.zoom, auraPulse * camera.zoom, 0, Math.PI*2); ctx.fill();
        
        // Sprite Sederhana Pendekar
        ctx.fillStyle = '#e2e8f0'; // Jubah putih/perak
        ctx.beginPath();
        ctx.moveTo(px, py - 18*camera.zoom);
        ctx.lineTo(px + 8*camera.zoom, py + 8*camera.zoom);
        ctx.lineTo(px - 8*camera.zoom, py + 8*camera.zoom);
        ctx.fill();
        
        ctx.fillStyle = '#0f172a'; // Rambut
        ctx.beginPath(); ctx.arc(px, py - 18*camera.zoom, 5*camera.zoom, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();

      // 8. Efek Cuaca (Weather Overlay)
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
        // Kabut ungu beracun
        const miasmaGradient = ctx.createRadialGradient(width/2, height/2, height/4, width/2, height/2, width);
        miasmaGradient.addColorStop(0, 'rgba(120, 50, 150, 0.1)');
        miasmaGradient.addColorStop(1, 'rgba(80, 20, 100, 0.4)');
        ctx.fillStyle = miasmaGradient;
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = 'rgba(150, 50, 200, 0.15)';
        for (let i = 0; i < 50; i++) {
          const mx = (Math.random() * width + Math.cos(time*0.5 + i) * 50) % width;
          const my = (Math.random() * height + Math.sin(time*0.5 + i) * 50) % height;
          ctx.beginPath();
          ctx.arc(mx, my, (15 + Math.random() * 20) * camera.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 9. Filter Malam (Night Filter)
      if (isNight) {
        ctx.fillStyle = 'rgba(10, 15, 35, 0.65)';
        ctx.fillRect(0, 0, width, height);
        
        // Buat cahaya kecil di sekitar avatar (Lantern effect)
        ctx.globalCompositeOperation = 'destination-out';
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
    return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
  }, [camera, tiles, playerPos, targetTile, activePath, exploredChunkSet, isWalking, tileMap, loadedImages, weather, isNight]);

  // Interaksi Mouse
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

    const tile = tileMap.get(`${hoverX},${hoverY}`);
    if (tile && onTileHover) {
      onTileHover(tile);
      setHoveredTile(tile);
    } else {
      if (onTileHover) onTileHover(null);
      setHoveredTile(null);
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
        const selectedTile = tileMap.get(`${clickX},${clickY}`) || {
          tileX: clickX, tileY: clickY, terrainType: 'plains', tileType: 'walkable'
        };
        onTileClick(selectedTile);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.45, Math.min(2.5, prev.zoom * zoomFactor))
    }));
  };

  const selectedTileData = targetTile ? tileMap.get(`${targetTile.x},${targetTile.y}`) : null;

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#e3d5bd] flex flex-col items-center justify-center font-sans">
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair active:cursor-grabbing border border-[#383329] shadow-2xl"
      />

      {/* Map Action Overlay Pop-up */}
      {overlayPos && selectedTileData && onActionWalk && !isWalking && (
        <MapActionOverlay 
          x={overlayPos.x} 
          y={overlayPos.y} 
          tile={selectedTileData}
          onWalk={onActionWalk}
          onInspect={onActionInspect || (() => {})}
          onClose={() => onClearTarget && onClearTarget()}
        />
      )}

      {/* HUD Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={centerOnPlayer}
          className="bg-[#292218]/90 hover:bg-[#3d3324] text-[#d8c3a5] border border-[#524530] px-3 py-1.5 rounded-sm text-xs font-serif font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95"
        >
          <span>🎯 Pusatkan Karakter</span>
        </button>
        <button
          onClick={() => setCamera(prev => ({ ...prev, zoom: 1.0 }))}
          className="bg-[#292218]/90 hover:bg-[#3d3324] text-[#8c7a5f] border border-[#524530] px-2.5 py-1.5 rounded-sm text-xs font-mono shadow-lg backdrop-blur-md"
        >
          {Math.round(camera.zoom * 100)}%
        </button>
      </div>

      <div className="absolute bottom-4 right-4 z-20 bg-[#292218]/90 border border-[#524530] px-3 py-1.5 rounded-sm shadow-xl backdrop-blur-md text-right pointer-events-none">
        <div className="text-[10px] text-[#8c7a5f] font-mono tracking-wider uppercase">Koordinat Benua</div>
        <div className="text-xs font-mono font-bold text-[#d8c3a5]">
          X: {playerPos.x} | Y: {playerPos.y}
        </div>
      </div>
      
      {/* Target Tile Debug */}
      {hoveredTile && !isDragging && (
        <div className="absolute top-4 left-4 z-20 bg-[#292218]/90 border border-[#524530] px-3 py-1.5 rounded-sm text-xs text-[#d8c3a5] backdrop-blur-sm pointer-events-none shadow-lg">
          <span className="font-bold text-[#fde047]">{hoveredTile.label || hoveredTile.terrainType}</span> ({hoveredTile.tileX}, {hoveredTile.tileY})
        </div>
      )}
    </div>
  );
}
