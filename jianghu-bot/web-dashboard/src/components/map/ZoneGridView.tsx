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
  SquareX,
  Fish,
  Wheat,
  Home,
  Coins
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
    const allWaypoints = activePath.slice(1);
    let stepIndex = 0;

    if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);

    // Animasi lokal per 240ms — TANPA sinkronisasi server di tengah jalan
    walkIntervalRef.current = setInterval(async () => {
      if (stepIndex >= allWaypoints.length) {
        // Animasi selesai — kirim SEMUA waypoints ke server dalam satu request
        clearInterval(walkIntervalRef.current);
        walkIntervalRef.current = null;

        try {
          const res = await api.post('/world/zone/step-move', {
            waypoints: allWaypoints,
            zoneId: activeZoneId
          });

          if (res.data.exploredChunks) setExploredChunks(res.data.exploredChunks);

          if (res.data.arrivedPosition) {
            setPlayerGrid((prev: any) => ({
              ...prev,
              position: { ...prev?.position, tileX: res.data.arrivedPosition.tileX, tileY: res.data.arrivedPosition.tileY }
            }));
          }

          if (res.data.stoppedEarly) {
            showMessage(`🛑 Perjalanan terhenti: ${res.data.stopReason || 'Disergap!'}`);
            if (res.data.arrivedPosition) {
              fetchZoneData(res.data.arrivedPosition.tileX, res.data.arrivedPosition.tileY);
            } else {
              fetchZoneData();
            }
          } else if (res.data.encounter?.encountered || res.data.encounter?.triggered) {
            showMessage(`⚔️ Disergap oleh ${res.data.encounter.enemyName || 'Musuh'}!`);
            fetchZoneData(res.data.arrivedPosition?.tileX, res.data.arrivedPosition?.tileY);
          } else {
            const finalPoint = allWaypoints[allWaypoints.length - 1];
            showMessage(`Tiba di tujuan (${finalPoint.x}, ${finalPoint.y})`);
            fetchZoneData(res.data.arrivedPosition?.tileX ?? finalPoint.x, res.data.arrivedPosition?.tileY ?? finalPoint.y);
          }
        } catch (err: any) {
          const errMsg = err?.response?.data?.error || err?.message || 'Gagal sinkronisasi pergerakan ke server.';
          console.error('[StepMove] Final sync error:', err?.response?.data || err);
          showMessage(`⚠️ ${errMsg}`);
          const finalPoint = allWaypoints[allWaypoints.length - 1];
          fetchZoneData(finalPoint?.x, finalPoint?.y);
        }

        setIsWalking(false);
        setActivePath([]);
        return;
      }

      const currentStep = allWaypoints[stepIndex];
      stepIndex++;

      // Update posisi pemain di UI secara lokal instan (hanya visual)
      setPlayerGrid((prev: any) => ({
        ...prev,
        position: { ...prev?.position, tileX: currentStep.x, tileY: currentStep.y }
      }));
    }, 240);
  };

  // Batalkan perjalanan (kirim progress yang sudah dilalui saja)
  const handleStopWalking = async () => {
    if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);
    walkIntervalRef.current = null;

    // Kirim waypoints yang sudah dilalui secara visual ke server
    const walkedWaypoints = activePath.slice(1).filter((_, i) => {
      const currentPos = playerGrid?.position;
      if (!currentPos) return false;
      // Ambil semua waypoint sampai posisi pemain saat ini
      return true;
    });

    // Hitung berapa langkah yang sudah diambil berdasarkan posisi pemain saat ini
    const currentX = playerGrid?.position?.tileX;
    const currentY = playerGrid?.position?.tileY;
    const stoppedIndex = activePath.findIndex(p => p.x === currentX && p.y === currentY);
    const completedWaypoints = stoppedIndex > 0 ? activePath.slice(1, stoppedIndex + 1) : [];

    if (completedWaypoints.length > 0) {
      try {
        await api.post('/world/zone/step-move', {
          waypoints: completedWaypoints,
          zoneId: activeZoneId
        });
      } catch (err) {
        console.error('[StepMove] Stop sync error:', err);
      }
    }

    setIsWalking(false);
    setActivePath([]);
    showMessage('Perjalanan dihentikan.');
    fetchZoneData(currentX, currentY);
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

  // Masuk Interior Bangunan (Toko / Rumah)
  const handleEnterBuilding = async (tile: TileData) => {
    try {
      const res = await api.post('/grid/building/enter', {
        zoneId: activeZoneId,
        x: tile.tileX,
        y: tile.tileY
      });
      if (!res.data.ok) {
        showMessage(`❌ ${res.data.error || 'Gagal masuk bangunan'}`);
        return;
      }
      const layoutRes = await api.get(`/grid/interior/${res.data.structureId}`);
      if (layoutRes.data.ok) {
        const layout1D: number[] = [];
        for (const row of layoutRes.data.matrix) {
          for (const cell of row) {
            layout1D.push(cell.tileId);
          }
        }
        setInteriorData({
          id: res.data.structureId,
          name: res.data.structureName,
          ownerId: res.data.ownerName,
          ownerName: res.data.ownerName,
          isOwner: true,
          subGridWidth: layoutRes.data.width,
          subGridHeight: layoutRes.data.height,
          facilities: {
            qiGatheringArrayTier: 1,
            alchemyCrucibleTier: 1,
            forgeAnvilTier: 1,
            herbPlotsUnlocked: 2
          },
          layout: layout1D,
          tileMetadata: {
            0: { name: 'Lantai Kayu', isSolid: false, interactable: false },
            1: { name: 'Dinding Kayu', isSolid: true, interactable: false },
            2: { name: 'Meja Teh', isSolid: true, interactable: true, action: 'reception_chat' },
            3: { name: 'Bantal Semadi', isSolid: false, interactable: true, action: 'minigame_acupoint' },
            4: { name: 'Kuali Alkimia', isSolid: true, interactable: true, action: 'minigame_crucible' },
            5: { name: 'Landasan Tempa', isSolid: true, interactable: true, action: 'minigame_kata' },
            6: { name: 'Petak Herbal', isSolid: false, interactable: true, action: 'harvest_herbs' },
            7: { name: 'Pintu Keluar', isSolid: false, interactable: true, action: 'exit_property' }
          }
        });
      }
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal masuk bangunan');
    }
  };

  // Beli Kavling Tanah
  const handlePurchaseLand = async (tile: TileData) => {
    try {
      const res = await api.post('/grid/land/purchase', {
        x: tile.tileX,
        y: tile.tileY,
        zoneId: activeZoneId
      });
      if (res.data.ok) {
        showMessage(`🎉 Berhasil membeli kavling tanah (${tile.tileX}, ${tile.tileY}) seharga ${res.data.pricePaid} Perak!`);
        fetchZoneData();
      } else {
        showMessage(`❌ ${res.data.error}`);
      }
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal membeli tanah');
    }
  };

  // Memancing
  const handleFish = async () => {
    try {
      const res = await api.post('/grid/profession/fish', { zoneId: activeZoneId });
      if (res.data.ok) {
        showMessage(`🎣 Strike! Mendapatkan 1x ${res.data.fishName} (Level Pancing: ${res.data.fishingLevel})`);
        fetchZoneData();
      } else {
        showMessage(`❌ ${res.data.error}`);
      }
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal memancing');
    }
  };

  // Meramu / Panen Alam
  const handleForage = async () => {
    try {
      const res = await api.post('/grid/profession/forage', { zoneId: activeZoneId });
      if (res.data.ok) {
        showMessage(`🌿 Berhasil memanen ${res.data.quantity}x ${res.data.itemName}!`);
        fetchZoneData();
      } else {
        showMessage(`❌ ${res.data.error}`);
      }
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal meramu');
    }
  };

  // Tanam & Panen
  const handlePlantCrop = async (tile: TileData) => {
    try {
      const res = await api.post('/grid/profession/farm/plant', {
        x: tile.tileX,
        y: tile.tileY,
        cropName: 'Gandum Emas'
      });
      if (res.data.ok) {
        showMessage(`🌱 Berhasil menanam Gandum Emas di petak (${tile.tileX}, ${tile.tileY})!`);
        fetchZoneData();
      } else {
        showMessage(`❌ ${res.data.error}`);
      }
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal menanam bibit');
    }
  };

  const handleHarvestCrop = async (tile: TileData) => {
    try {
      const res = await api.post('/grid/profession/farm/harvest', {
        x: tile.tileX,
        y: tile.tileY
      });
      if (res.data.ok) {
        showMessage(`🌾 Berhasil memanen ${res.data.quantity}x ${res.data.cropName}!`);
        fetchZoneData();
      } else {
        showMessage(`❌ ${res.data.error}`);
      }
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal memanen tanaman');
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
              <span className="text-gray-600">|</span>
              <span className="text-blue-300 font-medium">
                {selectedTile.regionName || 'Central Plains'}
              </span>
              <span className="text-gray-600">|</span>
              <span className={
                selectedTile.territoryType === 'danger_zone' ? 'text-red-400 font-bold' :
                selectedTile.territoryType === 'monster_zone' ? 'text-orange-400 font-medium' :
                selectedTile.territoryType === 'sect_territory' ? 'text-purple-400 font-medium' :
                selectedTile.territoryType === 'locked_zone' ? 'text-gray-500 font-medium' :
                'text-emerald-400 font-medium'
              }>
                {selectedTile.territoryType === 'danger_zone' ? 'Zona Bahaya' :
                 selectedTile.territoryType === 'monster_zone' ? 'Zona Monster' :
                 selectedTile.territoryType === 'sect_territory' ? 'Wilayah Sekte' :
                 selectedTile.territoryType === 'locked_zone' ? 'Area Terlarang' :
                 selectedTile.territoryType === 'settlement' ? 'Pemukiman' :
                 'Alam Liar'}
              </span>
              {selectedTile.dangerTier && (
                <>
                  <span className="text-gray-600">|</span>
                  <span className="text-amber-500 font-medium text-[11px] px-1 bg-amber-900/30 rounded border border-amber-900/50">
                    Tier {selectedTile.dangerTier}
                  </span>
                </>
              )}
              {selectedTile.label && (
                <>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-300 font-medium">
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

          {/* Tombol Masuk Paviliun Meditasi jika berada di scenic courtyard */}
          {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.label?.includes('Paviliun') && (
            <button
              onClick={() => handleEnterCourtyard(selectedTile.label || 'Paviliun Gazebo')}
              className="bg-amber-950 hover:bg-amber-900 text-amber-200 px-3.5 py-1.5 rounded-lg border border-amber-600/60 flex items-center gap-1.5 text-xs font-serif font-bold shadow-lg transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Masuk Taman Paviliun</span>
            </button>
          )}

          {/* Tombol Masuk Bangunan Interior (Rumah / Toko) */}
          {selectedTile && distToSelected !== null && distToSelected <= 1 && (selectedTile.buildingName || selectedTile.isDoor || selectedTile.propertyStructureId) && (
            <button
              onClick={() => handleEnterBuilding(selectedTile)}
              className="bg-emerald-950 hover:bg-emerald-900 text-emerald-200 px-3.5 py-1.5 rounded-lg border border-emerald-600/60 flex items-center gap-1.5 text-xs font-serif font-bold shadow-lg transition-all"
            >
              <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Masuk {selectedTile.buildingName || 'Bangunan'}</span>
            </button>
          )}

          {/* Tombol Beli Kavling Tanah */}
          {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.isClaimable && !selectedTile.ownerId && (
            <button
              onClick={() => handlePurchaseLand(selectedTile)}
              className="bg-amber-900/90 hover:bg-amber-800 text-amber-100 px-3.5 py-1.5 rounded-lg border border-amber-500/60 flex items-center gap-1.5 text-xs font-bold shadow-lg transition-all"
            >
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <span>Klaim Tanah (100 Perak)</span>
            </button>
          )}

          {/* Tombol Tanam Tanaman */}
          {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.isClaimable && selectedTile.ownerId && !selectedTile.cropType && (
            <button
              onClick={() => handlePlantCrop(selectedTile)}
              className="bg-lime-950 hover:bg-lime-900 text-lime-200 px-3.5 py-1.5 rounded-lg border border-lime-600/60 flex items-center gap-1.5 text-xs font-bold shadow-lg transition-all"
            >
              <Wheat className="w-3.5 h-3.5 text-lime-400" />
              <span>Tanam Gandum</span>
            </button>
          )}

          {/* Tombol Panen Tanaman */}
          {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.isClaimable && selectedTile.cropType && (
            <button
              onClick={() => handleHarvestCrop(selectedTile)}
              className="bg-yellow-950 hover:bg-yellow-900 text-yellow-200 px-3.5 py-1.5 rounded-lg border border-yellow-500/70 flex items-center gap-1.5 text-xs font-bold shadow-lg transition-all"
            >
              <Wheat className="w-3.5 h-3.5 text-yellow-400" />
              <span>Panen {selectedTile.cropType}</span>
            </button>
          )}

          {/* Tombol Mancing */}
          {selectedTile && distToSelected !== null && distToSelected <= 1 && (selectedTile.resourceType === 'fish' || selectedTile.terrainType === 'water' || selectedTile.terrainType === 'river') && (
            <button
              onClick={handleFish}
              className="bg-cyan-950 hover:bg-cyan-900 text-cyan-200 px-3.5 py-1.5 rounded-lg border border-cyan-600/60 flex items-center gap-1.5 text-xs font-bold shadow-lg transition-all"
            >
              <Fish className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mancing</span>
            </button>
          )}

          {/* Tombol Panen Sumber Daya Alam (Forage) */}
          {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.resourceType && selectedTile.resourceType !== 'fish' && (
            <button
              onClick={handleForage}
              className="bg-teal-950 hover:bg-teal-900 text-teal-200 px-3.5 py-1.5 rounded-lg border border-teal-600/60 flex items-center gap-1.5 text-xs font-bold shadow-lg transition-all"
            >
              <Trees className="w-3.5 h-3.5 text-teal-400" />
              <span>Ambil Sumber Daya</span>
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
