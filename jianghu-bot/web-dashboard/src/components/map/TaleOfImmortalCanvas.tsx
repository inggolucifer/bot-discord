'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point } from '@/hooks/useAStarGridPath';
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
  spawnedMonster?: {
    key: string;
    name: string;
    tier?: number;
    hp?: number;
    maxHp?: number;
    atk?: number;
    def?: number;
    spd?: number;
    imageUrl?: string | null;
  } | null;
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
  focusTile?: Point | null;
  weather?: 'rain' | 'snow' | 'miasma' | 'none';
  isNight?: boolean;
  onOpenSearch?: () => void;
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
  focusTile = null,
  weather = 'none',
  isNight = false,
  onOpenSearch
}: TaleOfImmortalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    zoom: 1.0
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cameraStart, setCameraStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<TileData | null>(null);

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
  
  const { loadedImages } = useGlobalAssetLoader();
  
  // Client-Side Prediction / Tweening state
  const animatedPlayerPos = useRef({ x: playerPos.x, y: playerPos.y });

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

  // Recenter if focusTile is supplied or changes
  useEffect(() => {
    if (focusTile) {
      setCamera(prev => ({ ...prev, x: focusTile.x, y: focusTile.y }));
    }
  }, [focusTile?.x, focusTile?.y]);

  // Auto-sync camera if player position jumps (e.g. on initial data load)
  const prevPlayerPos = useRef(playerPos);
  useEffect(() => {
    if (!isWalking && !focusTile) {
      const dist = Math.max(
        Math.abs(playerPos.x - prevPlayerPos.current.x),
        Math.abs(playerPos.y - prevPlayerPos.current.y)
      );
      if (dist > 3) {
        setCamera(prev => ({ ...prev, x: playerPos.x, y: playerPos.y }));
        animatedPlayerPos.current = { x: playerPos.x, y: playerPos.y };
      }
    }
    prevPlayerPos.current = playerPos;
  }, [playerPos.x, playerPos.y, isWalking, focusTile]);

  useEffect(() => {
    if (isWalking) {
      setCamera(prev => ({
        ...prev,
        x: prev.x + (playerPos.x - prev.x) * 0.25,
        y: prev.y + (playerPos.y - prev.y) * 0.25
      }));
    }
  }, [playerPos.x, playerPos.y, isWalking]);

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

      // Kertas Perkamen / Sutra Xuan Putih Lembut (Guohua Shan Shui Paper)
      if (loadedImages.ui?.parchment_bg) {
        ctx.drawImage(loadedImages.ui.parchment_bg, 0, 0, width, height);
      } else {
        const bgGradient = ctx.createRadialGradient(width / 2, height / 2, height / 5, width / 2, height / 2, width);
        bgGradient.addColorStop(0, '#faf8f4');
        bgGradient.addColorStop(0.7, '#f4eee1');
        bgGradient.addColorStop(1, '#ebe3d3');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
      }
      
      // Tekstur serat kertas seni tradisional
      ctx.fillStyle = 'rgba(90, 75, 55, 0.02)';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 137.5) % width, (i * 269.3) % height, 1.5, 1.5);
      }

      const viewTilesX = width / currentTileSize;
      const viewTilesY = height / currentTileSize;
      const minTileX = Math.floor(camera.x - viewTilesX / 2) - 1;
      const maxTileX = Math.ceil(camera.x + viewTilesX / 2) + 1;
      const minTileY = Math.floor(camera.y - viewTilesY / 2) - 1;
      const maxTileY = Math.ceil(camera.y + viewTilesY / 2) + 1;

      const toScreenX = (wx: number) => (wx - camera.x + viewTilesX / 2) * currentTileSize;
      const toScreenY = (wy: number) => (wy - camera.y + viewTilesY / 2) * currentTileSize;

      // 1. Gambar Medan Dasar dengan Gaya Lukisan Tinta & Global Assets
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
            // FALLBACK PROCEDURAL SHAN SHUI (LUKISAN TINTA ORIENTAL)
            if (terrain === 'river' || terrain === 'swamp' || terrain === 'demonic_swamp' || terrain === 'eastern_sea') {
              // Air Mineral Tinta Mengalir Lembut
              const isDemonic = terrain === 'demonic_swamp' || terrain === 'swamp';
              ctx.fillStyle = isDemonic ? 'rgba(120, 95, 130, 0.28)' : 'rgba(168, 205, 218, 0.35)';
              ctx.fillRect(sx, sy, currentTileSize, currentTileSize);

              // Riak gelombang tinta putih lembut
              ctx.strokeStyle = isDemonic ? 'rgba(180, 140, 200, 0.35)' : 'rgba(255, 255, 255, 0.5)';
              ctx.lineWidth = Math.max(1, 1.2 * camera.zoom);
              ctx.beginPath();
              const waveOffset1 = Math.sin(time * 1.8 + tx * 0.7 + ty * 0.5) * 4 * camera.zoom;
              ctx.moveTo(sx + currentTileSize * 0.1, sy + currentTileSize * 0.4 + waveOffset1);
              ctx.quadraticCurveTo(sx + currentTileSize * 0.5, sy + currentTileSize * 0.35 - waveOffset1, sx + currentTileSize * 0.9, sy + currentTileSize * 0.45 + waveOffset1);
              ctx.moveTo(sx + currentTileSize * 0.2, sy + currentTileSize * 0.75 - waveOffset1);
              ctx.quadraticCurveTo(sx + currentTileSize * 0.6, sy + currentTileSize * 0.8 + waveOffset1, sx + currentTileSize * 0.85, sy + currentTileSize * 0.7 - waveOffset1);
              ctx.stroke();
            } 
            else if (terrain === 'bamboo_forest' || terrain === 'forest') {
              // RUMPUN BAMBU / RIMBA TINTA WUXIA (Persis seperti referensi lukisan Dinasti Song)
              const isBamboo = terrain === 'bamboo_forest';
              const sway = Math.sin(time * 1.5 + tx * 0.6 + ty * 0.4) * 2 * camera.zoom;

              // Batang Bambu / Pohon Slender Tinta
              const stalkCount = isBamboo ? 4 : 3;
              for (let s = 0; s < stalkCount; s++) {
                const baseX = sx + currentTileSize * (0.2 + s * 0.22);
                const baseY = sy + currentTileSize * 0.88;
                const topX = baseX + sway * (0.6 + s * 0.2);
                const topY = sy + currentTileSize * (0.15 + (s % 2) * 0.1);

                // Batang
                ctx.strokeStyle = isBamboo ? (s % 2 === 0 ? '#263b2c' : '#1c2d22') : '#362d26';
                ctx.lineWidth = Math.max(1.2, (isBamboo ? 2.2 : 3) * camera.zoom);
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.quadraticCurveTo((baseX + topX) / 2 + sway * 0.5, (baseY + topY) / 2, topX, topY);
                ctx.stroke();

                // Ruas bambu
                if (isBamboo) {
                  ctx.fillStyle = '#142018';
                  for (let n = 1; n <= 3; n++) {
                    const nodeY = baseY - (baseY - topY) * (n * 0.26);
                    const nodeX = baseX + (topX - baseX) * (n * 0.26);
                    ctx.fillRect(nodeX - 2 * camera.zoom, nodeY - 1, 4 * camera.zoom, 2);
                  }
                }

                // Daun Bambu Feathery Lanceolate (Sapuan kuas khas Guohua)
                const leafColor = isBamboo 
                  ? (s % 2 === 0 ? '#38573d' : '#28422d') 
                  : (s % 2 === 0 ? '#2f4538' : '#1f3328');
                ctx.fillStyle = leafColor;

                const leafY = topY + currentTileSize * 0.08;
                for (let l = -2; l <= 2; l++) {
                  ctx.beginPath();
                  const lx = topX + l * 4 * camera.zoom;
                  const ly = leafY + Math.abs(l) * 3 * camera.zoom;
                  ctx.ellipse(lx, ly, Math.max(3, 7 * camera.zoom), Math.max(1.5, 2.5 * camera.zoom), (l * 0.4) + (sway * 0.05), 0, Math.PI * 2);
                  ctx.fill();
                }
              }

              // Bebatuan Tinta di Kaki Rumpun
              ctx.fillStyle = '#3c4740';
              ctx.beginPath();
              ctx.ellipse(sx + currentTileSize * 0.35, sy + currentTileSize * 0.86, 6 * camera.zoom, 3.5 * camera.zoom, 0, 0, Math.PI * 2);
              ctx.ellipse(sx + currentTileSize * 0.65, sy + currentTileSize * 0.88, 5 * camera.zoom, 3 * camera.zoom, 0, 0, Math.PI * 2);
              ctx.fill();

              // Kabut Lembut di Kaki Rumpun Pohon (Mist Wash khas lukisan Shan Shui)
              const mistGrad = ctx.createLinearGradient(0, sy + currentTileSize * 0.72, 0, sy + currentTileSize);
              mistGrad.addColorStop(0, 'rgba(250, 248, 244, 0)');
              mistGrad.addColorStop(1, 'rgba(250, 248, 244, 0.75)');
              ctx.fillStyle = mistGrad;
              ctx.fillRect(sx, sy + currentTileSize * 0.7, currentTileSize, currentTileSize * 0.3);
            }
            else if (terrain === 'mountain' || terrain === 'glacial' || terrain === 'azure_mountain' || terrain === 'northern_glacial') {
              const isGlacial = terrain === 'glacial' || terrain === 'northern_glacial';
              
              // Tebing Batu Berlapis Kuas Tinta
              ctx.fillStyle = isGlacial ? 'rgba(195, 220, 235, 0.45)' : 'rgba(190, 185, 178, 0.4)';
              ctx.fillRect(sx, sy, currentTileSize, currentTileSize);

              ctx.fillStyle = isGlacial ? '#5b798c' : '#4d4842';
              ctx.beginPath();
              ctx.moveTo(sx + currentTileSize * 0.1, sy + currentTileSize * 0.9);
              ctx.lineTo(sx + currentTileSize * 0.5, sy + currentTileSize * 0.18);
              ctx.lineTo(sx + currentTileSize * 0.9, sy + currentTileSize * 0.9);
              ctx.closePath();
              ctx.fill();

              // Bayangan tebing samping
              ctx.fillStyle = isGlacial ? '#3f5666' : '#332f2b';
              ctx.beginPath();
              ctx.moveTo(sx + currentTileSize * 0.5, sy + currentTileSize * 0.18);
              ctx.lineTo(sx + currentTileSize * 0.9, sy + currentTileSize * 0.9);
              ctx.lineTo(sx + currentTileSize * 0.5, sy + currentTileSize * 0.9);
              ctx.closePath();
              ctx.fill();

              // Puncak Salju / Kabut Puncak
              if (isGlacial) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(sx + currentTileSize * 0.35, sy + currentTileSize * 0.45);
                ctx.lineTo(sx + currentTileSize * 0.5, sy + currentTileSize * 0.18);
                ctx.lineTo(sx + currentTileSize * 0.65, sy + currentTileSize * 0.45);
                ctx.closePath();
                ctx.fill();
              }
            }
            else if (terrain === 'settlement') {
              ctx.fillStyle = 'rgba(228, 220, 206, 0.65)';
              ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
            }
            else if (terrain === 'western_desert') {
              ctx.fillStyle = '#e8d4a8';
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
             ctx.fillStyle = 'rgba(255, 165, 0, 0.05)'; 
             ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
          }

          // 2.5B Indikator Tanah Milik Pemain (Hanya jika sudah dibeli)
          if (tile.isClaimable && !tile.buildingName && !tile.isUnderConstruction && tile.ownerId) {
            ctx.fillStyle = '#10b981';
            ctx.font = `bold ${Math.max(7, 9 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🚩 Milik', sx + currentTileSize / 2, sy + currentTileSize * 0.55);
          }

          // 2.5C Spot Memancing (Hanya jika secara eksplisit terdapat sumber daya ikan)
          if (tile.resourceType === 'fish' && !tile.isSolid) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
            ctx.font = `${Math.max(8, 11 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🐟', sx + currentTileSize * 0.75, sy + currentTileSize * 0.35);
          }

          // 2.5D Tanaman Pertanian (Crop)
          if (tile.cropType) {
            ctx.fillStyle = '#84cc16';
            ctx.font = `${Math.max(8, 12 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🌾', sx + currentTileSize * 0.5, sy + currentTileSize * 0.55);
          }

          // 2.6 Player Asset / Construction / Scaffolding Overlay
          if (tile.buildingName || tile.isUnderConstruction || tile.propertyStructureId) {
            const bx = sx + currentTileSize * 0.15;
            const by = sy + currentTileSize * 0.15;
            const bw = currentTileSize * 0.7;
            const bh = currentTileSize * 0.7;

            const isCurrentlyBuilding = Boolean(
              tile.isUnderConstruction && 
              tile.constructionCompleteAt &&
              new Date(tile.constructionCompleteAt).getTime() > Date.now()
            );

            if (isCurrentlyBuilding) {
              // Scaffolding kayu perancah
              ctx.strokeStyle = '#d97706';
              ctx.lineWidth = Math.max(1, 2 * camera.zoom);
              ctx.strokeRect(bx, by, bw, bh);
              ctx.beginPath();
              ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by + bh);
              ctx.moveTo(bx + bw, by); ctx.lineTo(bx, by + bh);
              ctx.stroke();

              ctx.fillStyle = '#f59e0b';
              ctx.font = `bold ${Math.max(8, 10 * camera.zoom)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText('🔨 Membangun', sx + currentTileSize / 2, sy + currentTileSize * 0.85);
            } else {
              // Bangunan Selesai (Completed Building)
              let assetImg = (loadedImages.assets as any)?.[tile.buildingName || ''];
              if (assetImg) {
                ctx.drawImage(assetImg, bx, by, bw, bh);
              } else {
                // Gambar Arsitektur Paviliun Wuxia Oriental Artistik
                // 1. Fondasi batu
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(bx - bw * 0.05, by + bh * 0.7, bw * 1.1, bh * 0.3);
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = Math.max(1, 1 * camera.zoom);
                ctx.strokeRect(bx - bw * 0.05, by + bh * 0.7, bw * 1.1, bh * 0.3);

                // 2. Dinding kayu merah/vermilion
                ctx.fillStyle = '#7f1d1d';
                ctx.fillRect(bx + bw * 0.1, by + bh * 0.32, bw * 0.8, bh * 0.42);

                // 3. Jendela lentera emas bercahaya
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(bx + bw * 0.35, by + bh * 0.44, bw * 0.3, bh * 0.22);
                ctx.strokeStyle = '#b45309';
                ctx.strokeRect(bx + bw * 0.35, by + bh * 0.44, bw * 0.3, bh * 0.22);

                // 4. Atap Genteng Bersayap (Swept Pagoda Eaves)
                ctx.fillStyle = '#b45309';
                ctx.beginPath();
                ctx.moveTo(bx - bw * 0.15, by + bh * 0.35);
                ctx.quadraticCurveTo(bx + bw * 0.1, by + bh * 0.18, bx + bw * 0.5, by + bh * 0.02);
                ctx.quadraticCurveTo(bx + bw * 0.9, by + bh * 0.18, bx + bw * 1.15, by + bh * 0.35);
                ctx.lineTo(bx + bw * 0.95, by + bh * 0.35);
                ctx.lineTo(bx + bw * 0.5, by + bh * 0.15);
                ctx.lineTo(bx + bw * 0.05, by + bh * 0.35);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = Math.max(1, 1.5 * camera.zoom);
                ctx.stroke();

                // 5. Ikon Profesi / Fasilitas
                const n = (tile.buildingName || '').toLowerCase();
                const t = (tile.buildingType || '').toLowerCase();
                let bIcon = '🏛️';
                if (n.includes('tempa') || n.includes('bengkel') || n.includes('besi') || t === 'blacksmith') bIcon = '⚒️';
                else if (n.includes('rumah') || n.includes('kediaman') || n.includes('gubuk') || t === 'residence') bIcon = '🏡';
                else if (n.includes('obat') || n.includes('apotek') || n.includes('alkimia') || n.includes('kuali')) bIcon = '🏺';
                else if (n.includes('dojo') || n.includes('perguruan') || n.includes('latihan') || t === 'dojo') bIcon = '🥋';
                else if (n.includes('dapur') || n.includes('masak') || n.includes('makan')) bIcon = '🍲';
                else if (n.includes('padi') || n.includes('gandum') || n.includes('lahan') || n.includes('kebun') || t === 'farm_barn') bIcon = '🌾';
                else if (n.includes('tambang') || n.includes('batu')) bIcon = '⛏️';
                else if (n.includes('kayu') || n.includes('pemotongan')) bIcon = '🪓';
                else if (n.includes('ikan') || n.includes('pemancingan') || n.includes('tambak') || t === 'fish_pond') bIcon = '🐟';
                else if (n.includes('toko') || n.includes('kios') || n.includes('warung') || t === 'shop') bIcon = '🏪';

                ctx.font = `${Math.max(10, 13 * camera.zoom)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(bIcon, sx + currentTileSize / 2, by + bh * 0.6);
              }

              // Label Nama Bangunan Selesai
              const bLabel = tile.buildingName || 'Bangunan';
              ctx.font = `bold ${Math.max(7, 8.5 * camera.zoom)}px sans-serif`;
              ctx.textAlign = 'center';
              const textMetrics = ctx.measureText(bLabel);
              const textW = textMetrics.width;
              const pillW = textW + 8 * camera.zoom;
              const pillH = 11 * camera.zoom;
              const pillX = sx + (currentTileSize - pillW) / 2;
              const pillY = sy + currentTileSize * 0.88 - pillH;

              ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
              ctx.fillRect(pillX, pillY, pillW, pillH);
              ctx.strokeStyle = '#d97706';
              ctx.lineWidth = 1;
              ctx.strokeRect(pillX, pillY, pillW, pillH);

              ctx.fillStyle = '#fef08a';
              ctx.fillText(bLabel, sx + currentTileSize / 2, pillY + pillH - 2.5 * camera.zoom);

              // Mini HP bar
              const hpPercent = Math.max(0, Math.min(1, (tile.assetHp ?? 100) / (tile.assetMaxHp ?? 100)));
              ctx.fillStyle = 'rgba(0,0,0,0.6)';
              ctx.fillRect(bx, by - 4 * camera.zoom, bw, 3 * camera.zoom);
              ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.2 ? '#eab308' : '#ef4444';
              ctx.fillRect(bx, by - 4 * camera.zoom, bw * hpPercent, 3 * camera.zoom);
            }
          }

          // 2.7 Landmark Ekspedisi / Dungeon Gate (Hanya jika node ekspedisi eksplisit)
          if (tile.isExpeditionNode) {
            const ex = sx + currentTileSize * 0.2;
            const ey = sy + currentTileSize * 0.2;
            const ew = currentTileSize * 0.6;
            const eh = currentTileSize * 0.6;
            ctx.fillStyle = 'rgba(79, 70, 229, 0.25)';
            ctx.fillRect(ex, ey, ew, eh);
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = Math.max(1, 1.5 * camera.zoom);
            ctx.strokeRect(ex, ey, ew, eh);
            ctx.fillStyle = '#c7d2fe';
            ctx.font = `bold ${Math.max(8, 10 * camera.zoom)}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🌀 Dungeon', sx + currentTileSize / 2, sy + currentTileSize * 0.85);
          }
          ctx.restore();
        }
      }

      // 2.8 Garis Grid Presisi: Garis Tipis Satu Sapuan (Shan Shui Grid)
      ctx.save();
      ctx.strokeStyle = 'rgba(165, 155, 142, 0.35)'; // Abu-abu perkamen tipis & elegan
      ctx.lineWidth = 1;

      // Garis grid vertikal (tx dari minTileX sampai maxTileX + 1)
      for (let tx = minTileX; tx <= maxTileX + 1; tx++) {
        const sx = Math.floor(toScreenX(tx)) + 0.5;
        const startY = Math.max(0, Math.floor(toScreenY(minTileY)));
        const endY = Math.min(height, Math.floor(toScreenY(maxTileY + 1)));
        ctx.beginPath();
        ctx.moveTo(sx, startY);
        ctx.lineTo(sx, endY);
        ctx.stroke();
      }

      // Garis grid horizontal (ty dari minTileY sampai maxTileY + 1)
      for (let ty = minTileY; ty <= maxTileY + 1; ty++) {
        const sy = Math.floor(toScreenY(ty)) + 0.5;
        const startX = Math.max(0, Math.floor(toScreenX(minTileX)));
        const endX = Math.min(width, Math.floor(toScreenX(maxTileX + 1)));
        ctx.beginPath();
        ctx.moveTo(startX, sy);
        ctx.lineTo(endX, sy);
        ctx.stroke();
      }
      ctx.restore();

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

      // 4.5 Badge Angka NPC di Sudut Petak (Hanya jika benar-benar ada NPC aktif yang valid di petak ini)
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          // Jika tidak ada NPC aktif pada petak ini, biarkan kosong tanpa lingkaran hitam atau angka
          if (!tile || !Array.isArray(tile.npcs) || tile.npcs.length === 0 || !tile.npcCount || tile.npcCount <= 0) continue;

          const chunkX = Math.floor(tx / 16);
          const chunkY = Math.floor(ty / 16);
          if (!exploredChunkSet.has(`${chunkX},${chunkY}`)) continue;

          const sx = toScreenX(tx);
          const sy = toScreenY(ty);

          ctx.save();
          const badgeR = Math.max(6.5, 8.5 * camera.zoom);
          const badgeX = sx + Math.max(9, 11 * camera.zoom);
          const badgeY = sy + Math.max(9, 11 * camera.zoom);

          // Bayangan lembut lingkaran
          ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
          ctx.shadowBlur = 4 * camera.zoom;

          // Lingkaran bulat hitam / charcoal bergradien
          const badgeGrad = ctx.createLinearGradient(badgeX - badgeR, badgeY - badgeR, badgeX + badgeR, badgeY + badgeR);
          badgeGrad.addColorStop(0, '#374151');
          badgeGrad.addColorStop(0.5, '#1f2937');
          badgeGrad.addColorStop(1, '#111827');
          ctx.fillStyle = badgeGrad;
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
          ctx.fill();

          // Ring pembatas perak / putih halus
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = Math.max(0.8, 1.2 * camera.zoom);
          ctx.stroke();

          // Angka putih tebal di tengah lingkaran
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(8, 10 * camera.zoom)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(tile.npcs.length), badgeX, badgeY);
          ctx.restore();
        }
      }

      // 4.6 Monster Aktif di Petak Spesifik (Hanya jika benar-benar ada entitas monster yang ditempatkan)
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = tileMap.get(`${tx},${ty}`);
          if (!tile || !tile.spawnedMonster || !tile.spawnedMonster.name) continue;

          const chunkX = Math.floor(tx / 16);
          const chunkY = Math.floor(ty / 16);
          if (!exploredChunkSet.has(`${chunkX},${chunkY}`)) continue;

          const sx = toScreenX(tx);
          const sy = toScreenY(ty);

          ctx.save();
          // Aura Merah Crimson Menyala di Lantai Petak
          ctx.fillStyle = 'rgba(220, 38, 38, 0.22)';
          ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = Math.max(1, 1.5 * camera.zoom);
          ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);

          // Icon Siluman / Monster di Tengah Petak
          const mSize = currentTileSize * 0.55;
          const my = sy + currentTileSize * 0.15;
          ctx.font = `${Math.max(12, 16 * camera.zoom)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🐺', sx + currentTileSize / 2, my + mSize * 0.5);

          // Tag Nama Monster di Bawah Petak
          const mLabel = tile.spawnedMonster.name;
          ctx.font = `bold ${Math.max(6.5, 8 * camera.zoom)}px sans-serif`;
          const textW = ctx.measureText(mLabel).width;
          const pillW = textW + 6 * camera.zoom;
          const pillH = 10 * camera.zoom;
          const pillX = sx + (currentTileSize - pillW) / 2;
          const pillY = sy + currentTileSize * 0.88 - pillH;

          ctx.fillStyle = 'rgba(15, 5, 5, 0.85)';
          ctx.fillRect(pillX, pillY, pillW, pillH);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(pillX, pillY, pillW, pillH);

          ctx.fillStyle = '#fca5a5';
          ctx.fillText(mLabel, sx + currentTileSize / 2, pillY + pillH - 2 * camera.zoom);
          ctx.restore();
        }
      }

      // 5. Jalur A* Kuning Bercahaya (Glow Path - Pita Emas Bersih & Bersudut Siku)
      if (activePath && activePath.length > 1) {
        ctx.save();
        ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
        ctx.shadowBlur = 12 * camera.zoom;
        ctx.strokeStyle = '#f59e0b';
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

        // Garis inti kilau emas muda
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = Math.max(1, 1.6 * camera.zoom);
        ctx.shadowBlur = 0;
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

      // 6.5 Sorotan Emas Petak Karakter Aktif (Persis Seperti di Gambar Referensi Pengguna)
      const curTileX = Math.round(animatedPlayerPos.current.x);
      const curTileY = Math.round(animatedPlayerPos.current.y);
      const pTileSx = toScreenX(curTileX);
      const pTileSy = toScreenY(curTileY);

      ctx.save();
      // Warna kuning emas transparan hangat mengisi petak aktif
      ctx.fillStyle = 'rgba(254, 243, 199, 0.35)';
      ctx.fillRect(pTileSx, pTileSy, currentTileSize, currentTileSize);

      // Bingkai luar emas bercahaya tegas
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = Math.max(1.5, 2.4 * camera.zoom);
      ctx.shadowColor = 'rgba(245, 158, 11, 0.65)';
      ctx.shadowBlur = 8 * camera.zoom;
      ctx.strokeRect(pTileSx + 0.5, pTileSy + 0.5, currentTileSize - 1, currentTileSize - 1);

      // Garis bingkai dalam emas halus
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.strokeRect(pTileSx + 3 * camera.zoom, pTileSy + 3 * camera.zoom, currentTileSize - 6 * camera.zoom, currentTileSize - 6 * camera.zoom);
      ctx.restore();

      // 7. Avatar Karakter Utama (Spiritual Aura)
      // Client-Side Prediction (Tweening) untuk pergerakan map yang smooth
      animatedPlayerPos.current.x += (playerPos.x - animatedPlayerPos.current.x) * 0.15;
      animatedPlayerPos.current.y += (playerPos.y - animatedPlayerPos.current.y) * 0.15;

      const px = toScreenX(animatedPlayerPos.current.x) + currentTileSize / 2;
      const py = toScreenY(animatedPlayerPos.current.y) + currentTileSize / 2;
      
      ctx.save();
      if (loadedImages.sprites?.player_default) {
        const pw = currentTileSize * 1.5;
        const ph = pw * 1.5;
        ctx.drawImage(loadedImages.sprites.player_default, px - pw/2, py - ph/2 - 10*camera.zoom, pw, ph);
        
        if (loadedImages.sprites?.flying_sword_aura) {
          ctx.drawImage(loadedImages.sprites.flying_sword_aura, px - pw/2, py + 5*camera.zoom, pw, pw/2);
        }
      } else {
        // Bayangan lembut karakter
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(px, py + 11 * camera.zoom, 12 * camera.zoom, 4.5 * camera.zoom, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Aura Qi berdenyut lembut
        const auraPulse = 13 + Math.sin(time * 4) * 2.5;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.beginPath();
        ctx.arc(px, py - 5 * camera.zoom, auraPulse * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        
        // Sprite Pendekar Wuxia (Jubah & Rambut Khas)
        ctx.fillStyle = '#1e293b'; // Jubah hitam/abu gelap pendekar
        ctx.beginPath();
        ctx.moveTo(px, py - 16 * camera.zoom);
        ctx.lineTo(px + 7 * camera.zoom, py + 9 * camera.zoom);
        ctx.lineTo(px - 7 * camera.zoom, py + 9 * camera.zoom);
        ctx.closePath();
        ctx.fill();

        // Selendang putih/perak
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(px - 2 * camera.zoom, py - 12 * camera.zoom, 4 * camera.zoom, 18 * camera.zoom);
        
        // Kepala & Sanggul Rambut
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(px, py - 17 * camera.zoom, 4.5 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        // Topknot / Sanggul
        ctx.beginPath();
        ctx.arc(px, py - 22 * camera.zoom, 2.2 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
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

  // Touch Handlers for Mobile (Geser Peta & Tap untuk Info Petak)
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
      const newZoom = Math.min(2.5, Math.max(0.45, +(touchState.current.initialZoom * scale).toFixed(2)));
      setCamera(prev => ({ ...prev, zoom: newZoom }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(false);

    // Jika ketukan bersih (moved distance < 12px), buka info petak yang diklik
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
        const selectedTile = tileMap.get(`${clickX},${clickY}`) || {
          tileX: clickX,
          tileY: clickY,
          terrainType: 'plains',
          tileType: 'walkable'
        };
        onTileClick(selectedTile);
      }
    }

    touchState.current.isPinching = false;
    touchState.current.initialPinchDist = null;
  };

  // Nonaktifkan zoom mouse wheel per instruksi user (hanya pakai tombol + dan -)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  const handleZoomIn = () => {
    setCamera(prev => ({
      ...prev,
      zoom: Math.min(2.5, +(prev.zoom + 0.15).toFixed(2))
    }));
  };

  const handleZoomOut = () => {
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.45, +(prev.zoom - 0.15).toFixed(2))
    }));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden bg-[#e3d5bd] flex flex-col items-center justify-center font-sans">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair active:cursor-grabbing border border-[#383329] shadow-2xl touch-none"
      />

      {/* HUD Controls (+ dan - Zoom Spasial) - Berada di sisi kiri atas di bawah bar navigasi agar bebas tabrakan */}
      <div className="absolute top-14 left-3 sm:top-16 sm:left-4 z-20 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={centerOnPlayer}
          className="bg-[#292218]/90 hover:bg-[#3d3324] text-[#d8c3a5] border border-[#524530] px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-serif font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95"
          title="Pusatkan Karakter"
        >
          <span>🎯 Pusatkan</span>
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-[#292218]/90 hover:bg-[#3d3324] text-[#d8c3a5] border border-[#524530] w-7 h-7 rounded-md text-sm font-bold shadow-lg backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
          title="Perkecil Peta (-)"
        >
          -
        </button>
        <button
          onClick={() => setCamera(prev => ({ ...prev, zoom: 1.0 }))}
          className="bg-[#292218]/90 hover:bg-[#3d3324] text-[#8c7a5f] border border-[#524530] px-2 py-1 rounded-md text-xs font-mono shadow-lg backdrop-blur-md"
          title="Reset Zoom 100%"
        >
          {Math.round(camera.zoom * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="bg-[#292218]/90 hover:bg-[#3d3324] text-[#d8c3a5] border border-[#524530] w-7 h-7 rounded-md text-sm font-bold shadow-lg backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
          title="Perbesar Peta (+)"
        >
          +
        </button>
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="bg-[#292218]/90 hover:bg-[#3d3324] text-[#d8c3a5] border border-[#524530] px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-serif font-bold shadow-lg backdrop-blur-md flex items-center gap-1 transition-all active:scale-95 ml-1"
            title="Cari Landmark, Sekte & Markah Koordinat"
          >
            <span>🔍 Cari</span>
          </button>
        )}
      </div>
    </div>
  );
}
