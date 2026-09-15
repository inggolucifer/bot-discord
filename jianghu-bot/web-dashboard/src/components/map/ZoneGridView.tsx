import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import { Map as MapIcon, Pickaxe, Search, Eye, Footprints, DoorOpen, MessageSquare, ShieldAlert, Sparkles } from 'lucide-react';

interface Tile {
  _id: string;
  tileX: number;
  tileY: number;
  tileType: string;
  label: string;
  hidden: boolean;
  resourceType?: string;
  nodeRespawnAt?: string;
  ownerName?: string;
  ownerId?: string;
  ownerType?: string;
  plotPriceSilver?: number;
  isOccupied?: boolean;
  isUnderConstruction?: boolean;
  buildingName?: string;
}

interface ZoneGridViewProps {
  zoneId: string;
  onBackToWorld: () => void;
}

export default function ZoneGridView({ zoneId, onBackToWorld }: ZoneGridViewProps) {
  const [zoneConfig, setZoneConfig] = useState<any>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [playerGrid, setPlayerGrid] = useState<any>(null);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number; specialTile?: Tile } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const walkTimeoutRef = useRef<any>(null);

  // Virtualization constants
  const VIEWPORT_WIDTH_TILES = 11;
  const VIEWPORT_HEIGHT_TILES = 9;
  const TILE_SIZE = 64; // pixels

  const fetchZoneData = async () => {
    try {
      const res = await api.get(`/world/zone/${zoneId}`);
      if (res.data.config) setZoneConfig(res.data.config);
      if (res.data.tiles) setTiles(res.data.tiles);
      if (res.data.playerGrid) setPlayerGrid(res.data.playerGrid);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memuat zona');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZoneData();
    return () => {
      if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
    };
  }, [zoneId]);

  const handleTileClick = async (clickedX: number, clickedY: number) => {
    if (!playerGrid?.position) return;
    const px = playerGrid.position.tileX;
    const py = playerGrid.position.tileY;

    const specialTile = tiles.find(t => t.tileX === clickedX && t.tileY === clickedY);
    const dist = Math.max(Math.abs(px - clickedX), Math.abs(py - clickedY));

    setSelectedTile({ x: clickedX, y: clickedY, specialTile });

    // If standing on the tile (dist === 0)
    if (dist === 0) {
      if (specialTile?.tileType === 'resource_node') {
        handleGather(clickedX, clickedY);
      } else if (specialTile?.tileType === 'npc_spawn') {
        setActionMessage(`Kamu berada di dekat ${specialTile.label || 'NPC'}. Buka tab NPC/Quest untuk berinteraksi.`);
        setTimeout(() => setActionMessage(null), 4000);
      } else if (specialTile?.tileType === 'buildable_plot' && specialTile.isOccupied) {
        handleEnterBuilding(clickedX, clickedY);
      }
      return;
    }

    // If clicked adjacent resource node (dist === 1)
    if (dist === 1 && specialTile?.tileType === 'resource_node') {
      handleGather(clickedX, clickedY);
      return;
    }

    // Otherwise attempt move
    handleMove(clickedX, clickedY);
  };

  const handleMove = async (targetX: number, targetY: number) => {
    if (isWalking) {
      setActionMessage('Karakter masih sedang melangkah menuju tujuan sebelumnya!');
      setTimeout(() => setActionMessage(null), 2500);
      return;
    }

    const px = playerGrid?.position?.tileX ?? 0;
    const py = playerGrid?.position?.tileY ?? 0;
    const dist = Math.max(Math.abs(px - targetX), Math.abs(py - targetY));

    if (dist > (zoneConfig?.maxMovePerAction || 5)) {
      setActionMessage(`Terlalu jauh! Jarak maksimal per langkah adalah 5 tile.`);
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }

    try {
      const res = await api.post('/world/zone/move', { targetX, targetY, zoneId });
      if (res.data.playerGrid) {
        setPlayerGrid(res.data.playerGrid);
      }

      const durationSec = res.data.durationSeconds || 1;
      setIsWalking(true);
      setActionMessage(`Melangkah ke (${targetX}, ${targetY})... (~${durationSec}s)`);

      if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
      walkTimeoutRef.current = setTimeout(async () => {
        try {
          const resolveRes = await api.post('/world/zone/resolve-move');
          setIsWalking(false);
          if (resolveRes.data.playerGrid) {
            setPlayerGrid(resolveRes.data.playerGrid);
          }
          if (resolveRes.data.encounter?.encountered) {
            const enc = resolveRes.data.encounter;
            const won = enc.battleResult?.winner === 'player';
            setActionMessage(`⚔️ Disergap oleh ${enc.enemyName}! Hasil pertarungan: ${won ? 'MENANG' : 'KALAH'}`);
          } else {
            setActionMessage(`Tiba di (${targetX}, ${targetY})`);
          }
          fetchZoneData();
          setTimeout(() => setActionMessage(null), 3500);
        } catch {
          setIsWalking(false);
          fetchZoneData();
        }
      }, durationSec * 1000);
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || 'Gagal bergerak');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleSearch = async () => {
    try {
      const res = await api.post('/world/zone/search', { zoneId });
      if (res.data.playerGrid) setPlayerGrid(res.data.playerGrid);
      if (res.data.tiles) setTiles(res.data.tiles);
      setActionMessage('Pencarian selesai: ' + res.data.message);
      fetchZoneData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || 'Gagal mencari');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleGather = async (tileX: number, tileY: number) => {
    try {
      const res = await api.post('/world/zone/gather', { tileX, tileY, zoneId });
      if (res.data.playerGrid) setPlayerGrid(res.data.playerGrid);
      setActionMessage(res.data.message);
      fetchZoneData(); // Refresh to update nodeRespawnAt
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || 'Gagal panen');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleEnterBuilding = async (tileX: number, tileY: number) => {
    try {
      const res = await api.post('/world/zone/enter-building', { tileX, tileY });
      setActionMessage(res.data.message);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || 'Gagal memasuki bangunan');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleBuyPlot = async (tileX: number, tileY: number) => {
    try {
      const res = await api.post('/world/zone/buy-plot', { tileX, tileY });
      setActionMessage(res.data.message || 'Berhasil membeli plot tanah!');
      fetchZoneData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || 'Gagal membeli plot tanah');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // Derive visible tiles for virtualization
  const visibleGrid = useMemo(() => {
    if (!zoneConfig || !playerGrid?.position) return null;
    
    const px = playerGrid.position.tileX;
    const py = playerGrid.position.tileY;

    const startX = Math.max(0, px - Math.floor(VIEWPORT_WIDTH_TILES / 2));
    const endX = Math.min(zoneConfig.gridWidth - 1, startX + VIEWPORT_WIDTH_TILES - 1);
    
    const startY = Math.max(0, py - Math.floor(VIEWPORT_HEIGHT_TILES / 2));
    const endY = Math.min(zoneConfig.gridHeight - 1, startY + VIEWPORT_HEIGHT_TILES - 1);

    const grid = [];
    const exploredSet = new Set(playerGrid.exploredTileIndexes || []);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tileIndex = y * zoneConfig.gridWidth + x;
        const isExplored = exploredSet.has(tileIndex);
        const specialTile = tiles.find(t => t.tileX === x && t.tileY === y);
        
        grid.push({
          x,
          y,
          isExplored,
          specialTile
        });
      }
    }
    return { grid, startX, startY };
  }, [zoneConfig, playerGrid, tiles]);

  if (loading) return <div className="w-full h-96 flex items-center justify-center text-gray-400">Memuat Zona...</div>;
  if (error) return <div className="w-full h-96 flex items-center justify-center text-red-500">{error}</div>;

  const currentPx = playerGrid?.position?.tileX ?? 0;
  const currentPy = playerGrid?.position?.tileY ?? 0;
  const selectedDist = selectedTile != null
    ? Math.max(Math.abs(currentPx - selectedTile.x), Math.abs(currentPy - selectedTile.y))
    : null;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#2a3142] shadow-2xl bg-[#0b0e14] flex flex-col">
      {/* HUD: Top Bar */}
      <div className="absolute top-3 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <button
          onClick={onBackToWorld}
          className="pointer-events-auto bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-lg border border-gray-600 flex items-center gap-2 backdrop-blur-sm transition-colors text-sm shadow-md"
        >
          <MapIcon className="w-4 h-4" /> Peta Dunia
        </button>

        <div className="bg-black/70 border border-amber-900/60 px-4 py-1.5 rounded-lg backdrop-blur-sm shadow-md flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
           <h3 className="text-amber-200 font-serif font-bold text-sm tracking-wide">{zoneConfig?.displayName || 'Zone'}</h3>
           <span className="text-xs text-gray-400 font-mono">({currentPx}, {currentPy})</span>
        </div>
      </div>

      {/* HUD: Walking / Action Message */}
      {actionMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-black/85 border border-amber-500/60 text-amber-200 px-5 py-2.5 rounded-lg shadow-2xl font-medium text-sm animate-in fade-in slide-in-from-top-2 backdrop-blur-md">
          {actionMessage}
        </div>
      )}

      {/* Grid Viewport */}
      <div className="flex-1 flex items-center justify-center pointer-events-none select-none relative overflow-hidden">
         {/* Subtle ambient background texture */}
         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

         <div 
           className="relative" 
           style={{
             width: VIEWPORT_WIDTH_TILES * TILE_SIZE,
             height: VIEWPORT_HEIGHT_TILES * TILE_SIZE,
             pointerEvents: 'auto'
           }}
         >
           {visibleGrid?.grid.map((cell) => {
             const isPlayerHere = currentPx === cell.x && currentPy === cell.y;
             const isSelected = selectedTile?.x === cell.x && selectedTile?.y === cell.y;
             
             return (
               <div
                 key={`${cell.x}-${cell.y}`}
                 onClick={() => handleTileClick(cell.x, cell.y)}
                 className={`absolute transition-all flex flex-col items-center justify-center cursor-pointer
                    ${!cell.isExplored 
                       ? 'bg-[#06080d] border border-gray-900/80' 
                       : 'bg-[#151c27] hover:bg-[#1f2a3a] border border-[#232f42]/70'}
                    ${isSelected ? 'ring-2 ring-amber-400 z-30 shadow-[0_0_12px_rgba(251,191,36,0.5)]' : ''}`}
                 style={{
                   left: (cell.x - visibleGrid.startX) * TILE_SIZE,
                   top: (cell.y - visibleGrid.startY) * TILE_SIZE,
                   width: TILE_SIZE,
                   height: TILE_SIZE
                 }}
               >
                 {/* Fog of War Tile */}
                 {!cell.isExplored ? (
                   <div className="flex flex-col items-center justify-center opacity-40">
                     <span className="text-[9px] text-gray-700">?</span>
                   </div>
                 ) : (
                   <>
                     {/* Coordinate Badge */}
                     <span className="text-[9px] text-gray-600 font-mono absolute top-0.5 left-1 leading-none">{cell.x},{cell.y}</span>
                     
                     {/* Resource Node (FASE G6) */}
                     {cell.specialTile?.tileType === 'resource_node' && (
                        <div className="flex flex-col items-center mt-2.5">
                           <Pickaxe className={`w-4 h-4 ${cell.specialTile.nodeRespawnAt && new Date(cell.specialTile.nodeRespawnAt).getTime() > Date.now() ? 'text-gray-500' : 'text-emerald-400 animate-bounce'}`} />
                           <span className="text-[9px] text-emerald-300 font-bold truncate max-w-[56px] text-center">
                              {cell.specialTile.label || cell.specialTile.resourceType || 'Resource'}
                           </span>
                        </div>
                     )}

                     {/* POI */}
                     {cell.specialTile?.tileType === 'poi' && (
                        <div className="w-6 h-6 rounded-full bg-amber-900/80 border-2 border-amber-500 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                           <span className="text-xs font-bold text-amber-200">{cell.specialTile.label || '1'}</span>
                        </div>
                     )}

                     {/* Hazard */}
                     {cell.specialTile?.tileType === 'hazard' && (
                        <div className="text-red-500 font-bold text-lg drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]">☠</div>
                     )}

                     {/* NPC Spawn (FASE G8) */}
                     {cell.specialTile?.tileType === 'npc_spawn' && (
                        <div className="flex flex-col items-center mt-1">
                           <div className="w-5 h-5 rounded-full bg-purple-900 border-2 border-purple-400 flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                              <span className="text-[8px] font-bold text-purple-200">NPC</span>
                           </div>
                           <span className="text-[8px] text-purple-300 font-bold truncate max-w-[56px] text-center mt-0.5">
                              {cell.specialTile.label || 'NPC'}
                           </span>
                        </div>
                     )}

                     {/* Buildable Plot / Assets (FASE G5) */}
                     {cell.specialTile?.tileType === 'buildable_plot' && (
                        <div className="flex flex-col items-center px-0.5">
                          {cell.specialTile.isOccupied ? (
                            <div className="text-center">
                              <span className="block text-[10px] font-bold text-blue-300 truncate max-w-[56px]">{cell.specialTile.buildingName}</span>
                              <span className="block text-[8px] text-gray-400">({cell.specialTile.ownerName})</span>
                              {cell.specialTile.isUnderConstruction && (
                                <span className="block text-[7px] bg-yellow-600/80 px-1 rounded text-black font-bold">BANGUN</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] text-gray-500 border border-dashed border-gray-600 px-1 rounded">Plot</span>
                          )}
                        </div>
                     )}

                     {/* Player Avatar */}
                     {isPlayerHere && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                           <div className="w-7 h-7 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_14px_rgba(59,130,246,0.9)] animate-pulse flex items-center justify-center">
                              <span className="text-white text-[10px] font-extrabold">P1</span>
                           </div>
                        </div>
                     )}
                   </>
                 )}
               </div>
             );
           })}
         </div>
      </div>

      {/* HUD: Bottom Action Bar & Tile Inspector */}
      <div className="bg-[#10151f]/95 border-t border-[#2a3142] px-4 py-2.5 z-20 flex justify-between items-center backdrop-blur-md">
        {/* Selected Tile Inspector */}
        <div className="flex items-center gap-3 text-xs text-gray-300">
          {selectedTile ? (
            <>
              <span className="font-semibold text-amber-300">Tile ({selectedTile.x}, {selectedTile.y})</span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">Jarak: <strong className="text-gray-200">{selectedDist}</strong> tile</span>
              {selectedTile.specialTile && (
                <>
                  <span className="text-gray-500">|</span>
                  <span className="text-emerald-400 font-medium capitalize">{selectedTile.specialTile.tileType.replace('_', ' ')}: {selectedTile.specialTile.label || selectedTile.specialTile.buildingName || ''}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-gray-500 italic">Klik sebuah tile untuk memeriksa atau melangkah.</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
           {/* Contextual Action Button */}
           {selectedTile && selectedDist != null && (
             <>
               {selectedTile.specialTile?.tileType === 'resource_node' && selectedDist <= 1 && (
                 <button
                   onClick={() => handleGather(selectedTile.x, selectedTile.y)}
                   className="bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-700/50 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-colors"
                 >
                   <Pickaxe className="w-3.5 h-3.5" /> Panen Sumber Daya
                 </button>
               )}

               {selectedTile.specialTile?.tileType === 'buildable_plot' && selectedTile.specialTile.isOccupied && selectedDist <= 1 && (
                 <button
                   onClick={() => handleEnterBuilding(selectedTile.x, selectedTile.y)}
                   className="bg-blue-900/80 hover:bg-blue-800 text-blue-200 px-3 py-1.5 rounded-lg border border-blue-700/50 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-colors"
                 >
                   <DoorOpen className="w-3.5 h-3.5" /> Masuk Bangunan
                 </button>
               )}

               {selectedTile.specialTile?.tileType === 'buildable_plot' && !selectedTile.specialTile.isOccupied && selectedDist <= 1 && (
                 <button
                   onClick={() => handleBuyPlot(selectedTile.x, selectedTile.y)}
                   className="bg-amber-900/90 hover:bg-amber-800 text-amber-200 px-3 py-1.5 rounded-lg border border-amber-600/60 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-colors"
                 >
                   <Sparkles className="w-3.5 h-3.5" /> Beli Plot ({selectedTile.specialTile.plotPriceSilver || 500} Silver)
                 </button>
               )}

               {selectedDist > 0 && selectedDist <= 5 && (
                 <button
                   onClick={() => handleMove(selectedTile.x, selectedTile.y)}
                   disabled={isWalking}
                   className="bg-amber-900/80 hover:bg-amber-800 disabled:opacity-50 text-amber-200 px-3 py-1.5 rounded-lg border border-amber-700/50 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-colors"
                 >
                   <Footprints className="w-3.5 h-3.5" /> {isWalking ? 'Melangkah...' : 'Melangkah ke Sini'}
                 </button>
               )}
             </>
           )}

           {/* Search Button */}
           <button
              onClick={handleSearch}
              className="bg-blue-950/80 hover:bg-blue-900 text-blue-200 px-3 py-1.5 rounded-lg border border-blue-800/60 flex items-center gap-1.5 text-xs font-semibold shadow-md backdrop-blur-sm transition-colors"
           >
              <Search className="w-3.5 h-3.5" /> Cari Sekitar
           </button>
        </div>
      </div>
    </div>
  );
}
