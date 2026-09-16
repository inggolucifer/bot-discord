'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import {
  Map as MapIcon,
  Pickaxe,
  Search,
  Footprints,
  DoorOpen,
  Sparkles,
  Music,
  ShieldAlert,
  Building2,
  Trees,
  SquareX
} from 'lucide-react';
import ThermalStatusBadge from '../ui/ThermalStatusBadge';
import PropertyInteriorView from './PropertyInteriorView';
import TaleOfImmortalCanvas, { TileData } from './TaleOfImmortalCanvas';
import SettlementPanoramaView from './SettlementPanoramaView';
import ScenicCourtyardView from './ScenicCourtyardView';
import WorldScrollMapView from './WorldScrollMapView';
import { findAStarPath, Point } from '@/hooks/useAStarGridPath';

interface ZoneGridViewProps {
  zoneId: string;
  onBackToWorld: () => void;
}

export default function ZoneGridView({ zoneId, onBackToWorld }: ZoneGridViewProps) {
  const activeZoneId = zoneId && zoneId !== 'central_plains_bamboo_forest' ? zoneId : 'tianyuan_world_map';

  const [zoneConfig, setZoneConfig] = useState<any>(null);
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [playerGrid, setPlayerGrid] = useState<any>(null);
  const [exploredChunks, setExploredChunks] = useState<string[]>([]);

  // Selection & Navigasi
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [activePath, setActivePath] = useState<Point[]>([]);
  const [pathSteps, setPathSteps] = useState<number>(0);
  const [isWalking, setIsWalking] = useState(false);

  // View Mode: 'map' | 'settlement' | 'courtyard'
  const [viewMode, setViewMode] = useState<'map' | 'settlement' | 'courtyard'>('map');
  const [activeSettlementName, setActiveSettlementName] = useState<string>('XiTong City');
  const [activeCourtyardName, setActiveCourtyardName] = useState<string>('Paviliun Gazebo Puncak Pinus');

  // State lainnya
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isBgmOn, setIsBgmOn] = useState(false);
  const [interiorData, setInteriorData] = useState<any | null>(null);
  const [thermalStatus, setThermalStatus] = useState<any | null>(null);
  const [showMacroMap, setShowMacroMap] = useState(false);

  const walkIntervalRef = useRef<any>(null);

  // Set tile solid untuk pathfinding
  const solidTilesSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of tiles) {
      if (t.isSolid) {
        set.add(`${t.tileX},${t.tileY}`);
      }
    }
    return set;
  }, [tiles]);

  // Fetch Zone Data
  const fetchZoneData = useCallback(async (cx?: number, cy?: number) => {
    try {
      const px = cx !== undefined ? cx : playerGrid?.position?.tileX;
      const py = cy !== undefined ? cy : playerGrid?.position?.tileY;

      const queryParams = px !== undefined && py !== undefined ? `?centerX=${px}&centerY=${py}&radius=22` : '';
      const res = await api.get(`/world/zone/${activeZoneId}${queryParams}`);

      if (res.data.config) setZoneConfig(res.data.config);
      if (res.data.tiles) setTiles(res.data.tiles);
      if (res.data.playerGrid) setPlayerGrid(res.data.playerGrid);
      if (res.data.exploredChunks) setExploredChunks(res.data.exploredChunks);

      setError(null);
      setLoading(false);
    } catch (err: any) {
      console.error('[ZoneGridView] Error fetching zone:', err);
      const serverMsg = err.response?.data?.error || err.message;
      setError(serverMsg || 'Gagal memuat peta');
      setLoading(false);
    }
  }, [activeZoneId, playerGrid?.position?.tileX, playerGrid?.position?.tileY]);

  useEffect(() => {
    fetchZoneData();
    return () => {
      if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);
      sound.stopBgm();
    };
  }, [activeZoneId]);

  const handleToggleBgm = () => {
    if (isBgmOn) {
      sound.stopBgm();
      setIsBgmOn(false);
    } else {
      sound.startAmbientBgm();
      setIsBgmOn(true);
    }
  };

  const showMessage = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Klik pada sebuah tile di kanvas
  const handleTileClick = (tile: TileData) => {
    if (isWalking) {
      showMessage('Karakter sedang melangkah! Klik "Hentikan Langkah" jika ingin berhenti.');
      return;
    }

    setSelectedTile(tile);
    const px = playerGrid?.position?.tileX ?? 2455;
    const py = playerGrid?.position?.tileY ?? 2485;

    // Hitung pathfinding A* ke target
    const result = findAStarPath(px, py, tile.tileX, tile.tileY, solidTilesSet, 60);

    if (result.reachable) {
      setActivePath(result.path);
      setPathSteps(result.totalSteps);
    } else {
      setActivePath([]);
      setPathSteps(0);
      if (tile.isSolid) {
        showMessage('Jalur terhalang oleh tebing batu yang mustahil ditembus!');
      }
    }
  };

  // Memulai perjalanan kontinu langkah demi langkah (Tale of Immortal Style)
  const handleStartWalking = () => {
    if (activePath.length <= 1) return;
    if (isWalking) return;

    setIsWalking(true);
    sound.playGuzheng(520, 0.3);
    showMessage(`Mulai meluncur ke (${selectedTile?.tileX}, ${selectedTile?.tileY})...`);

    // Potong titik awal karena pemain sudah berada di sana
    const waypoints = activePath.slice(1);
    let stepIndex = 0;

    if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);

    // Langkah kontinu per 240ms (halus dan tidak terasa kaku)
    walkIntervalRef.current = setInterval(async () => {
      if (stepIndex >= waypoints.length) {
        // Tiba di tujuan
        clearInterval(walkIntervalRef.current);
        setIsWalking(false);
        setActivePath([]);

        const finalPoint = waypoints[waypoints.length - 1];
        
        // Sinkronisasi langkah terakhir sudah dieksekusi di tick sebelumnya (saat stepIndex === waypoints.length).
        // Kita hanya perlu menunggu sejenak agar request tersebut selesai di database, lalu refresh data.
        setTimeout(() => {
          showMessage(`Tiba di tujuan (${finalPoint.x}, ${finalPoint.y})`);
          fetchZoneData(finalPoint.x, finalPoint.y);
        }, 500);
        return;
      }

      const currentStep = waypoints[stepIndex];
      stepIndex++;

      // Update posisi pemain di UI secara lokal instan
      setPlayerGrid((prev: any) => ({
        ...prev,
        position: { ...prev?.position, tileX: currentStep.x, tileY: currentStep.y }
      }));

      // Kirim sinkronisasi langkah ke server tiap 5 langkah atau langkah terakhir
      if (stepIndex % 5 === 0 || stepIndex === waypoints.length) {
        try {
          const batchWaypoints = waypoints.slice(Math.max(0, stepIndex - 5), stepIndex);
          const res = await api.post('/world/zone/step-move', {
            waypoints: batchWaypoints,
            zoneId: activeZoneId
          });

          if (res.data.exploredChunks) setExploredChunks(res.data.exploredChunks);

          // Jika terhenti lebih awal (stamina habis atau disergap musuh)
          if (res.data.stoppedEarly) {
            clearInterval(walkIntervalRef.current);
            setIsWalking(false);
            setActivePath([]);
            showMessage(`🛑 Perjalanan terhenti: ${res.data.stopReason || 'Disergap!'}`);
            fetchZoneData(currentStep.x, currentStep.y);
          }
        } catch (err: any) {
          console.error('[StepMove] Sync error:', err);
        }
      }
    }, 240);
  };

  // Batalkan perjalanan
  const handleStopWalking = () => {
    if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);
    setIsWalking(false);
    setActivePath([]);
    showMessage('Perjalanan dihentikan.');
    fetchZoneData();
  };

  // Masuk ke Pemukiman / Kota (Gambar 4)
  const handleEnterSettlement = (cityName: string) => {
    setActiveSettlementName(cityName);
    setViewMode('settlement');
  };

  // Masuk ke Halaman Meditasi Khusus (Gambar 5)
  const handleEnterCourtyard = (pavilionName: string) => {
    setActiveCourtyardName(pavilionName);
    setViewMode('courtyard');
  };

  // Panen Sumber Daya (Anti-OP)
  const handleGather = async (tileX: number, tileY: number) => {
    try {
      const res = await api.post('/world/zone/gather', { tileX, tileY, zoneId: activeZoneId });
      showMessage(res.data.message || 'Berhasil mengumpulkan bahan mentah!');
      fetchZoneData();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal memanen');
    }
  };

  // Cari Sekitar
  const handleSearch = async () => {
    try {
      const res = await api.post('/world/zone/search', { zoneId: activeZoneId });
      showMessage(res.data.message || 'Pencarian selesai!');
      fetchZoneData();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal mencari sekitar');
    }
  };

  if (error) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-3 text-center bg-[#0b0e14] rounded-xl border border-red-900/40 p-6">
        <span className="text-red-400 font-medium text-sm max-w-md">{error}</span>
        <button
          onClick={() => { setError(null); setLoading(true); fetchZoneData(); }}
          className="px-4 py-1.5 bg-amber-900/70 hover:bg-amber-800 text-amber-200 border border-amber-600/50 rounded-lg text-xs font-semibold shadow-md transition-colors"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  // Render Tampilan Panorama Kota (Gambar 4)
  if (viewMode === 'settlement') {
    return (
      <SettlementPanoramaView
        settlementName={activeSettlementName}
        onExitCity={() => setViewMode('map')}
      />
    );
  }

  // Render Halaman Meditasi Khusus (Gambar 5)
  if (viewMode === 'courtyard') {
    return (
      <ScenicCourtyardView
        locationName={activeCourtyardName}
        onExit={() => setViewMode('map')}
      />
    );
  }

  // Render Interior Properti Rumah Pemain
  if (interiorData) {
    return <PropertyInteriorView propertyData={interiorData} onExit={() => setInteriorData(null)} />;
  }

  const px = playerGrid?.position?.tileX ?? 2455;
  const py = playerGrid?.position?.tileY ?? 2485;
  const distToSelected = selectedTile ? Math.max(Math.abs(px - selectedTile.tileX), Math.abs(py - selectedTile.tileY)) : null;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-amber-900/60 shadow-2xl bg-[#080b11] select-none flex flex-col">
      {/* HUD Top Bar */}
      <div className="absolute top-3 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowMacroMap(true)}
            className="bg-black/80 hover:bg-black text-amber-300 px-3 py-1.5 rounded-lg border border-amber-800/60 flex items-center gap-1.5 backdrop-blur-md text-xs font-serif font-bold shadow-lg transition-all"
          >
            <MapIcon className="w-4 h-4 text-amber-400" />
            <span>Peta Benua</span>
          </button>

          <button
            onClick={handleToggleBgm}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 backdrop-blur-md text-xs font-semibold shadow-lg transition-all ${
              isBgmOn ? 'bg-amber-950/80 border-amber-500 text-amber-200' : 'bg-black/80 border-gray-700 text-gray-400'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>{isBgmOn ? 'Musik: On' : 'Musik: Off'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <ThermalStatusBadge initialThermalData={thermalStatus} />
          <div className="bg-black/85 border border-amber-900/70 px-3.5 py-1.5 rounded-lg backdrop-blur-md shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h3 className="text-amber-200 font-serif font-bold text-xs tracking-wider">
              {zoneConfig?.chineseName || '天元'} {zoneConfig?.displayName || 'Benua Jianghu'}
            </h3>
            <span className="text-[11px] text-amber-400/90 font-mono font-bold">({px}, {py})</span>
          </div>
        </div>
      </div>

      {/* Floating Action Notice Alert */}
      {actionMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-black/90 border border-amber-500/80 text-amber-200 px-5 py-2.5 rounded-lg shadow-2xl font-medium text-xs backdrop-blur-md animate-in fade-in">
          {actionMessage}
        </div>
      )}

      {/* TALE OF IMMORTAL SHAN SHUI CANVAS ENGINE */}
      <div className="flex-1 w-full h-full relative">
        <TaleOfImmortalCanvas
          tiles={tiles}
          playerPos={{ x: px, y: py }}
          targetTile={selectedTile ? { x: selectedTile.tileX, y: selectedTile.tileY } : null}
          activePath={activePath}
          exploredChunks={exploredChunks}
          isWalking={isWalking}
          onTileClick={handleTileClick}
          onActionWalk={handleStartWalking}
          onActionHarvest={(tx, ty) => handleGather(tx, ty)}
          onActionInspect={handleSearch}
          onClearTarget={() => {
            setSelectedTile(null);
            setActivePath([]);
          }}
        />
      </div>

      {showMacroMap && (
        <WorldScrollMapView
          playerPos={{ x: px, y: py }}
          onClose={() => setShowMacroMap(false)}
        />
      )}

      {/* Bottom HUD: Action Bar, Navigasi & Inspektur */}
      <div className="bg-[#0e121a]/95 border-t border-amber-900/40 px-4 py-2.5 z-20 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-3 text-xs text-gray-300">
          {selectedTile ? (
            <>
              <span className="font-semibold text-amber-300 font-serif">
                Tile ({selectedTile.tileX}, {selectedTile.tileY})
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">
                Jarak: <strong className="text-gray-200">{distToSelected}</strong> tile
                {pathSteps > 0 && ` (~${pathSteps} langkah)`}
              </span>
              {selectedTile.label && (
                <>
                  <span className="text-gray-600">|</span>
                  <span className="text-emerald-400 font-medium">
                    {selectedTile.label}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-gray-400 italic">
              Klik tile mana saja pada lukisan peta untuk menentukan arah langkah.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Hentikan Perjalanan saat sedang jalan */}
          {isWalking && (
            <button
              onClick={handleStopWalking}
              className="bg-red-950 hover:bg-red-900 text-red-200 px-3.5 py-1.5 rounded-lg border border-red-700 flex items-center gap-1.5 text-xs font-semibold shadow-lg transition-all animate-pulse"
            >
              <SquareX className="w-3.5 h-3.5" /> Hentikan Langkah
            </button>
          )}

          {/* Tombol Masuk Kota (Gambar 4) jika berada di settlement */}
          {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.settlementName && (
            <button
              onClick={() => handleEnterSettlement(selectedTile.settlementName || 'XiTong City')}
              className="bg-blue-900/90 hover:bg-blue-800 text-blue-100 px-3.5 py-1.5 rounded-lg border border-blue-500/60 flex items-center gap-1.5 text-xs font-serif font-bold shadow-lg transition-all"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              <span>Masuk {selectedTile.settlementName}</span>
            </button>
          )}

          {/* Tombol Masuk Paviliun Meditasi (Gambar 5) jika berada di scenic courtyard */}
          {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.label?.includes('Paviliun') && (
            <button
              onClick={() => handleEnterCourtyard(selectedTile.label || 'Paviliun Gazebo')}
              className="bg-amber-950 hover:bg-amber-900 text-amber-200 px-3.5 py-1.5 rounded-lg border border-amber-600/60 flex items-center gap-1.5 text-xs font-serif font-bold shadow-lg transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Masuk Taman Paviliun</span>
            </button>
          )}

          {/* Tombol Cari Sekitar */}
          <button
            onClick={handleSearch}
            className="bg-[#182130] hover:bg-[#222e42] text-gray-200 px-3 py-1.5 rounded-lg border border-gray-700 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" /> Cari Sekitar
          </button>
        </div>
      </div>
    </div>
  );
}
