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
  Coins,
  Hammer,
  Compass
} from 'lucide-react';
import ThermalStatusBadge from '../ui/ThermalStatusBadge';
import PropertyInteriorView from './PropertyInteriorView';
import TaleOfImmortalCanvas, { TileData } from './TaleOfImmortalCanvas';
import SettlementPanoramaView from './SettlementPanoramaView';
import ScenicCourtyardView from './ScenicCourtyardView';
import WorldScrollMapView from './WorldScrollMapView';
import BattleArena from '../battle/BattleArena';
import { findAStarPath, Point } from '@/hooks/useAStarGridPath';
import { useAuthStore, useUIStore } from '@/lib/store';
import GridAssetDetailCard from './modals/GridAssetDetailCard';
import GridAssetBuildModal from './modals/GridAssetBuildModal';
import GridProfessionWorkbench from './modals/GridProfessionWorkbench';
import GridExpeditionModal from './modals/GridExpeditionModal';
import { LandPriceInfo } from '@/lib/landPrice';
import GridSectHallModal from './modals/GridSectHallModal';
import GridAmbushCombatModal from './modals/GridAmbushCombatModal';
import GridTileInspectorCard from './GridTileInspectorCard';
import LandscapeOrientationPrompt from '../ui/LandscapeOrientationPrompt';
import NpcPanel from '@/app/world/NpcPanel';
import MapSearchModal from './modals/MapSearchModal';
import WorldMapLoadingScreen from './WorldMapLoadingScreen';

interface ZoneGridViewProps {
  zoneId: string;
  onBackToWorld: () => void;
  targetFocusTile?: { x: number; y: number } | null;
  onSubViewChange?: (mode: 'map' | 'settlement' | 'courtyard') => void;
  climateData?: any;
  onBattleActiveChange?: (active: boolean) => void;
}

export default function ZoneGridView({ 
  zoneId, 
  onBackToWorld, 
  targetFocusTile, 
  onSubViewChange, 
  climateData,
  onBattleActiveChange 
}: ZoneGridViewProps) {
  const activeZoneId = zoneId || 'tianyuan_world_map';

  const { user } = useAuthStore();
  const [zoneConfig, setZoneConfig] = useState<any>(null);
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [playerGrid, setPlayerGrid] = useState<any>(null);
  const [exploredChunks, setExploredChunks] = useState<string[]>([]);
  const [playerLandStats, setPlayerLandStats] = useState<{ ownedPlotsCount: number; nextPrice?: LandPriceInfo } | null>(null);

  // Selection & Navigasi
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [activePath, setActivePath] = useState<Point[]>([]);

  // Sinkronisasi status inspektur petak ke store global
  useEffect(() => {
    useUIStore.getState().setIsTileInspectorActive(Boolean(selectedTile));
    return () => {
      useUIStore.getState().setIsTileInspectorActive(false);
    };
  }, [selectedTile]);
  const [pathSteps, setPathSteps] = useState<number>(0);
  const [isWalking, setIsWalking] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFocusTile, setSearchFocusTile] = useState<{ x: number; y: number } | null>(null);
  const [floatingNotices, setFloatingNotices] = useState<{ id: number; text: string; color: 'emerald' | 'amber' | 'cyan' | 'red' }[]>([]);

  const addFloatingNotice = (text: string, color: 'emerald' | 'amber' | 'cyan' | 'red' = 'emerald') => {
    const id = Date.now() + Math.random();
    setFloatingNotices(prev => [...prev, { id, text, color }]);
    setTimeout(() => {
      setFloatingNotices(prev => prev.filter(n => n.id !== id));
    }, 2500);
  };

  // Lingkungan & Cuaca Dinamis (Tale of Immortal Atmosphere)
  const weatherMode: 'rain' | 'snow' | 'miasma' | 'none' = useMemo(() => {
    const rawWeather = (climateData?.weather || '').toLowerCase();
    if (rawWeather.includes('hujan') || rawWeather.includes('rain')) return 'rain';
    if (rawWeather.includes('salju') || rawWeather.includes('snow')) return 'snow';
    if (rawWeather.includes('beracun') || rawWeather.includes('racun') || rawWeather.includes('miasma')) return 'miasma';
    return 'none';
  }, [climateData?.weather]);

  const isNightMode: boolean = useMemo(() => {
    if (climateData?.isNight !== undefined) return Boolean(climateData.isNight);
    const hour = new Date().getHours();
    return hour < 6 || hour >= 18;
  }, [climateData?.isNight]);

  // Modals state
  const [assetDetailTile, setAssetDetailTile] = useState<TileData | null>(null);
  const [buildModalTile, setBuildModalTile] = useState<TileData | null>(null);
  const [professionWorkbench, setProfessionWorkbench] = useState<{
    type: 'smithing' | 'cooking' | 'alchemy' | 'fishing' | 'farming';
    name: string;
  } | null>(null);
  const [expeditionModalTile, setExpeditionModalTile] = useState<TileData | null>(null);
  const [sectModalTile, setSectModalTile] = useState<TileData | null>(null);
  const [ambushModalData, setAmbushModalData] = useState<{
    enemyName?: string;
    encounterMessage?: string;
  } | null>(null);
  const [talkingNpc, setTalkingNpc] = useState<any | null>(null);

  // View Mode: 'map' | 'settlement' | 'courtyard'
  const [viewMode, setViewMode] = useState<'map' | 'settlement' | 'courtyard'>('map');
  const [activeSettlementName, setActiveSettlementName] = useState<string>('XiTong City');
  const [activeCourtyardName, setActiveCourtyardName] = useState<string>('Paviliun Gazebo Puncak Pinus');

  // State lainnya
  const [loading, setLoading] = useState(true);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isBgmOn, setIsBgmOn] = useState(false);
  const [interiorData, setInteriorData] = useState<any | null>(null);
  const [thermalStatus, setThermalStatus] = useState<any | null>(null);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [showMacroMap, setShowMacroMap] = useState(false);

  useEffect(() => {
    onBattleActiveChange?.(Boolean(activeBattleId));
  }, [activeBattleId, onBattleActiveChange]);

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

  // Fetch Zone Data (Radius 16: Ringan, Cepat, dan Menghemat Bandwidth)
  const fetchZoneData = useCallback(async (cx?: number, cy?: number) => {
    try {
      const px = cx !== undefined ? cx : playerGrid?.position?.tileX;
      const py = cy !== undefined ? cy : playerGrid?.position?.tileY;

      const queryParams = px !== undefined && py !== undefined ? `?centerX=${px}&centerY=${py}&radius=16` : '';
      const res = await api.get(`/world/zone/${activeZoneId}${queryParams}`);

      if (res.data.config) setZoneConfig(res.data.config);
      if (res.data.tiles) {
        // Tile Merging Cache: Pertahankan petak yang sudah dimuat agar saat kembali dari pencarian jauh tidak terjadi layar blank
        setTiles(prev => {
          const map = new Map<string, TileData>();
          for (const t of prev) {
            map.set(`${t.tileX},${t.tileY}`, t);
          }
          for (const t of res.data.tiles) {
            map.set(`${t.tileX},${t.tileY}`, t);
          }
          if (map.size > 5000) {
            const centerTileX = px ?? 2455;
            const centerTileY = py ?? 2485;
            const sorted = Array.from(map.values()).sort((a, b) => {
              const distA = Math.hypot(a.tileX - centerTileX, a.tileY - centerTileY);
              const distB = Math.hypot(b.tileX - centerTileX, b.tileY - centerTileY);
              return distA - distB;
            });
            return sorted.slice(0, 3500);
          }
          return Array.from(map.values());
        });
      }
      if (res.data.playerGrid) setPlayerGrid(res.data.playerGrid);
      if (res.data.exploredChunks) setExploredChunks(res.data.exploredChunks);
      if (res.data.playerLandStats) setPlayerLandStats(res.data.playerLandStats);

      setError(null);
      setLoading(false);
    } catch (err: any) {
      console.error('[ZoneGridView] Error fetching zone:', err);
      const serverMsg = err.response?.data?.error || err.message;
      setError(serverMsg || 'Gagal memuat peta');
      setLoading(false);
    }
  }, [activeZoneId, playerGrid?.position?.tileX, playerGrid?.position?.tileY]);

  // Pusatkan kembali kamera ke posisi karakter (menghilangkan layar blank setelah cari tempat jauh)
  const handleRecenterToPlayer = useCallback(() => {
    setSearchFocusTile(null);
    setSelectedTile(null);
    setActivePath([]);
    const px = playerGrid?.position?.tileX ?? 2455;
    const py = playerGrid?.position?.tileY ?? 2485;
    fetchZoneData(px, py);
    showMessage(`🎯 Kamera dipusatkan kembali ke posisi karakter (${px}, ${py})`);
  }, [playerGrid?.position?.tileX, playerGrid?.position?.tileY, fetchZoneData]);

  useEffect(() => {
    fetchZoneData();
    return () => {
      if (walkIntervalRef.current) clearInterval(walkIntervalRef.current);
      sound.stopBgm();
    };
  }, [activeZoneId]);

  // Auto-fokus dan pilih tile jika targetFocusTile diberikan
  useEffect(() => {
    if (targetFocusTile && tiles.length > 0) {
      const found = tiles.find(t => t.tileX === targetFocusTile.x && t.tileY === targetFocusTile.y);
      if (found) {
        setSelectedTile(found);
        if (found.buildingName || found.isUnderConstruction || found.propertyStructureId) {
          setAssetDetailTile(found);
        }
      }
    }
  }, [targetFocusTile, tiles]);

  // Auto-refresh data zona saat ada bangunan yang selesai konstruksi
  useEffect(() => {
    const underConstructionTiles = tiles.filter(t => t.isUnderConstruction && t.constructionCompleteAt);
    if (underConstructionTiles.length === 0) return;

    const now = Date.now();
    let minWaitMs = Infinity;
    for (const t of underConstructionTiles) {
      const finishTime = new Date(t.constructionCompleteAt!).getTime();
      const diff = finishTime - now;
      if (diff <= 0) {
        minWaitMs = 500;
        break;
      } else if (diff < minWaitMs) {
        minWaitMs = diff;
      }
    }

    if (minWaitMs !== Infinity && minWaitMs < 3600000) {
      const timer = setTimeout(() => {
        fetchZoneData();
      }, Math.max(1000, minWaitMs + 600));
      return () => clearTimeout(timer);
    }
  }, [tiles]);

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

  // Handler seleksi dari modal pencarian landmark & bookmark koordinat
  const handleSelectSearchResult = (targetX: number, targetY: number, label?: string) => {
    setIsSearchModalOpen(false);
    const px = playerGrid?.position?.tileX ?? 2455;
    const py = playerGrid?.position?.tileY ?? 2485;

    // Jika pengguna memilih posisi karakternya sendiri, bersihkan bidikan dan kembali ke karakter
    if (targetX === px && targetY === py) {
      handleRecenterToPlayer();
      return;
    }

    setSearchFocusTile({ x: targetX, y: targetY });

    const existingTile = tiles.find(t => t.tileX === targetX && t.tileY === targetY);
    if (existingTile) {
      setSelectedTile(existingTile);
      const result = findAStarPath(px, py, targetX, targetY, solidTilesSet, 60);
      if (result.reachable) {
        setActivePath(result.path);
        setPathSteps(result.totalSteps);
      }
    } else {
      setSelectedTile({
        tileX: targetX,
        tileY: targetY,
        terrainType: 'plains',
        tileType: 'ground',
        label: label || `Koordinat (${targetX}, ${targetY})`
      });
      fetchZoneData(targetX, targetY);
    }
    showMessage(`📍 Membidik ${label ? label + ' ' : ''}(${targetX}, ${targetY})`);
    sound.playDiscovery();
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
            sound.playSwordSlash();
            showMessage(`🛑 Perjalanan terhenti: ${res.data.stopReason || 'Disergap!'}`);
            if (res.data.encounter?.encountered || res.data.encounter?.triggered) {
              setAmbushModalData({
                enemyName: res.data.encounter.enemyName || 'Musuh Rimba Liar',
                encounterMessage: res.data.stopReason || 'Disergap oleh musuh di zona bahaya!'
              });
            }
            if (res.data.arrivedPosition) {
              fetchZoneData(res.data.arrivedPosition.tileX, res.data.arrivedPosition.tileY);
            } else {
              fetchZoneData();
            }
          } else if (res.data.encounter?.encountered || res.data.encounter?.triggered) {
            sound.playSwordSlash();
            showMessage(`⚔️ Disergap oleh ${res.data.encounter.enemyName || 'Musuh'}!`);
            setAmbushModalData({
              enemyName: res.data.encounter.enemyName || 'Musuh Rimba Liar',
              encounterMessage: 'Disergap oleh musuh di zona bahaya!'
            });
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

      // Bunyi derap langkah wuxia
      sound.playFootstep();

      // Update posisi pemain di UI secara lokal instan (hanya visual)
      setPlayerGrid((prev: any) => ({
        ...prev,
        position: { ...prev?.position, tileX: currentStep.x, tileY: currentStep.y }
      }));
    }, 240);
  };

  const handleDirectionalMove = async (dx: number, dy: number) => {
    if (isWalking) return;
    const px = playerGrid?.position?.tileX ?? 2455;
    const py = playerGrid?.position?.tileY ?? 2485;
    const nextX = px + dx;
    const nextY = py + dy;

    // Cek rintangan
    if (solidTilesSet.has(`${nextX},${nextY}`)) {
        showMessage('Jalur terhalang!');
        return;
    }

    sound.playFootstep();

    // Prediksi lokal
    setPlayerGrid((prev: any) => ({
      ...prev,
      position: { ...prev?.position, tileX: nextX, tileY: nextY }
    }));

    try {
      const res = await api.post('/world/zone/step-move', {
        waypoints: [{ x: nextX, y: nextY }],
        zoneId: activeZoneId
      });

      if (res.data.exploredChunks) setExploredChunks(res.data.exploredChunks);

      if (res.data.arrivedPosition) {
        setPlayerGrid((prev: any) => ({
          ...prev,
          position: { ...prev?.position, tileX: res.data.arrivedPosition.tileX, tileY: res.data.arrivedPosition.tileY }
        }));
      }

      if (res.data.staminaDepleted) {
        showMessage('Peringatan: Stamina habis!');
      }

      if (res.data.encounter?.encountered || res.data.encounter?.triggered) {
        sound.playSwordSlash();
        showMessage(`⚔️ Disergap oleh ${res.data.encounter.enemyName || 'Musuh'}!`);
        setAmbushModalData({
          enemyName: res.data.encounter.enemyName || 'Musuh Rimba Liar',
          encounterMessage: 'Disergap oleh musuh di zona bahaya!'
        });
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Gagal sinkronisasi.';
      showMessage(`⚠️ ${errMsg}`);
      fetchZoneData(px, py); // rollback
    }
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
    onSubViewChange?.('settlement');
  };

  // Masuk ke Halaman Meditasi Khusus (Gambar 5)
  const handleEnterCourtyard = (pavilionName: string) => {
    setActiveCourtyardName(pavilionName);
    setViewMode('courtyard');
    onSubViewChange?.('courtyard');
  };


  // Cari Sekitar
  const handleSearch = async () => {
    try {
      const res = await api.post('/world/zone/search', { zoneId: activeZoneId });
      sound.playDiscovery();
      showMessage(res.data.message || 'Pencarian selesai!');
      addFloatingNotice(res.data.message || 'Selesai menjelajah sekitar', 'amber');
      fetchZoneData();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal mencari sekitar');
    }
  };

  // Bangun Aset / Profesi di Tanah Milik
  const handleStartBuildAsset = async (assetName: string, assetBlueprintId?: string) => {
    if (!buildModalTile) return;
    try {
      const res = await api.post('/world/zone/build', {
        tileX: buildModalTile.tileX,
        tileY: buildModalTile.tileY,
        assetName: assetName,
        assetBlueprintId: assetBlueprintId,
        isOpenToPublic: true
      });
      if (res.data?.success) {
        showMessage(`🎉 Pembangunan ${assetName} dimulai! Pekerja mulai beraksi.`);
        setBuildModalTile(null);
        fetchZoneData();
      } else {
        showMessage(`❌ ${res.data?.error || 'Gagal memulai pembangunan'}`);
      }
    } catch (err: any) {
      showMessage(`❌ ${err.response?.data?.error || 'Gagal memulai pembangunan'}`);
    }
  };

  // Masuk Interior Bangunan (Toko / Rumah / Workbench Profesi)
  const handleEnterBuilding = async (tile: TileData) => {
    const bName = (tile.buildingName || tile.label || '').toLowerCase();
    if (bName.includes('tempa') || bName.includes('smith')) {
      setProfessionWorkbench({ type: 'smithing', name: tile.buildingName || 'Bengkel Tempa' });
      return;
    }
    if (bName.includes('dapur') || bName.includes('masak') || bName.includes('cook')) {
      setProfessionWorkbench({ type: 'cooking', name: tile.buildingName || 'Dapur Kedai' });
      return;
    }
    if (bName.includes('alkimia') || bName.includes('alchemy')) {
      setProfessionWorkbench({ type: 'alchemy', name: tile.buildingName || 'Paviliun Alkimia' });
      return;
    }
    if (bName.includes('kolam') || bName.includes('tambak') || bName.includes('koi')) {
      setProfessionWorkbench({ type: 'fishing', name: tile.buildingName || 'Kolam Ikan Rohani' });
      return;
    }
    if (bName.includes('lahan') || bName.includes('tani') || bName.includes('padi') || bName.includes('herbal')) {
      setProfessionWorkbench({ type: 'farming', name: tile.buildingName || 'Lahan Pertanian' });
      return;
    }

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
            6: { name: 'Petak Herbal', isSolid: false, interactable: true, action: 'minigame_harvest' },
            7: { name: 'Pintu Keluar', isSolid: false, interactable: true, action: 'exit_property' },
            8: { name: 'Kolam Ikan Rohani', isSolid: true, interactable: true, action: 'minigame_fishing' },
            9: { name: 'Dapur Masak', isSolid: true, interactable: true, action: 'minigame_cooking' }
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
      let res;
      try {
        res = await api.post('/world/zone/buy-plot', {
          tileX: tile.tileX,
          tileY: tile.tileY
        });
      } catch (err1) {
        res = await api.post('/grid/land/purchase', {
          x: tile.tileX,
          y: tile.tileY,
          zoneId: activeZoneId
        });
      }
      if (res.data.success || res.data.ok) {
        const priceLabel = res.data.priceLabel || res.data.message || 'sesuai tarif';
        showMessage(`🎉 Berhasil membeli kavling tanah (${tile.tileX}, ${tile.tileY}) seharga ${priceLabel}!`);
        if (res.data.ownedPlotsCount !== undefined) {
          setPlayerLandStats({
            ownedPlotsCount: res.data.ownedPlotsCount,
            nextPrice: res.data.nextPrice
          });
        }
        fetchZoneData();
      } else {
        showMessage(`❌ ${res.data.error || 'Gagal membeli tanah'}`);
      }
    } catch (err: any) {
      showMessage(err.response?.data?.error || err.message || 'Gagal membeli tanah');
    }
  };

  // Memancing
  const handleFish = async () => {
    try {
      const res = await api.post('/grid/profession/fish', { zoneId: activeZoneId });
      if (res.data.ok) {
        sound.playDiscovery();
        showMessage(`🎣 Strike! Mendapatkan 1x ${res.data.fishName} (Level Pancing: ${res.data.fishingLevel})`);
        addFloatingNotice(`🎣 +1 ${res.data.fishName}`, 'cyan');
        fetchZoneData();
      } else {
        showMessage(`❌ ${res.data.error}`);
      }
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Gagal memancing');
    }
  };

  // Meramu / Panen Alam (Biaya 5 Stamina)
  const handleForage = async () => {
    try {
      const res = await api.post('/grid/profession/forage', { zoneId: activeZoneId });
      if (res.data.ok) {
        sound.playDiscovery();
        const cost = res.data.staminaCost ?? 5;
        showMessage(`🌿 Berhasil memanen ${res.data.quantity}x ${res.data.itemName}! (-${cost} Stamina)`);
        addFloatingNotice(`🌿 +${res.data.quantity} ${res.data.itemName} (-${cost} Stamina)`, 'emerald');
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
        sound.playGuzheng(440, 0.4);
        showMessage(`🌱 Berhasil menanam Gandum Emas di petak (${tile.tileX}, ${tile.tileY})!`);
        addFloatingNotice(`🌱 Gandum Emas Ditanam`, 'amber');
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
        sound.playDiscovery();
        showMessage(`🌾 Berhasil memanen ${res.data.quantity}x ${res.data.cropName}!`);
        addFloatingNotice(`🌾 +${res.data.quantity} ${res.data.cropName}`, 'amber');
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
        onExitCity={() => {
          setViewMode('map');
          onSubViewChange?.('map');
        }}
      />
    );
  }

  // Render Halaman Meditasi Khusus (Gambar 5)
  if (viewMode === 'courtyard') {
    return (
      <ScenicCourtyardView
        locationName={activeCourtyardName}
        onExit={() => {
          setViewMode('map');
          onSubViewChange?.('map');
        }}
      />
    );
  }

  const isMacro = activeZoneId === 'tianyuan_world_map';
  const defaultX = targetFocusTile?.x ?? (isMacro ? 2455 : 10);
  const defaultY = targetFocusTile?.y ?? (isMacro ? 2485 : 10);
  const px = playerGrid?.position?.tileX ?? defaultX;
  const py = playerGrid?.position?.tileY ?? defaultY;
  const distToSelected = selectedTile ? Math.max(Math.abs(px - selectedTile.tileX), Math.abs(py - selectedTile.tileY)) : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#080b11] select-none flex flex-col">
      
      {/* Background layer which gets blurred if an interior is open */}
      <div className={`absolute inset-0 flex flex-col transition-all duration-500 ${interiorData ? 'blur-md pointer-events-none scale-105 opacity-60' : ''}`}>
        
        {/* HUD Top Bar */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-20 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto flex-nowrap">
            <button
              onClick={() => setShowMacroMap(true)}
              className="bg-black/80 hover:bg-black text-amber-300 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-amber-800/60 flex items-center gap-1 backdrop-blur-md text-[11px] sm:text-xs font-serif font-bold shadow-lg transition-all flex-shrink-0"
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Peta</span>
            </button>

            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="bg-black/80 hover:bg-black text-amber-300 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-amber-800/60 flex items-center gap-1 backdrop-blur-md text-[11px] sm:text-xs font-serif font-bold shadow-lg transition-all flex-shrink-0"
              title="Cari Landmark, Sekte & Markah Koordinat"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Cari</span>
            </button>

            <button
              onClick={handleToggleBgm}
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border flex items-center gap-1 backdrop-blur-md text-[11px] sm:text-xs font-semibold shadow-lg transition-all flex-shrink-0 ${
                isBgmOn ? 'bg-amber-950/80 border-amber-500 text-amber-200' : 'bg-black/80 border-gray-700 text-gray-400'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBgmOn ? 'Musik' : 'Bisu'}</span>
            </button>

            {/* Badge Lokasi Ringkas: Klik untuk Pusatkan ke Karakter */}
            <button 
              onClick={handleRecenterToPlayer}
              title={`Lokasi Karakter: (${px}, ${py}). Klik untuk pusatkan kamera.`}
              className="flex items-center gap-1.5 bg-black/85 hover:bg-amber-950/80 border border-amber-900/70 hover:border-amber-500/70 px-2 sm:px-2.5 py-1 rounded-lg backdrop-blur-md shadow-md text-xs flex-shrink-0 cursor-pointer transition-all active:scale-95 group pointer-events-auto"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="text-[11px] text-amber-400/95 group-hover:text-amber-300 font-mono font-bold tracking-tight">({px}, {py})</span>
              {searchFocusTile && (
                <span className="text-[10px] text-amber-300/90 font-serif ml-0.5">🎯</span>
              )}
            </button>

            <ThermalStatusBadge initialThermalData={thermalStatus} />
          </div>

          {/* Sisi kanan dikosongkan agar Bar Stamina dari world/page.tsx tidak pernah tertimpa */}
          <div />
        </div>

        {/* Floating Action Notice Alert */}
        {actionMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-black/90 border border-amber-500/80 text-amber-200 px-5 py-2.5 rounded-lg shadow-2xl font-medium text-xs backdrop-blur-md animate-in fade-in">
            {actionMessage}
          </div>
        )}

        {/* Banner Indikator saat Membidik Tempat Jauh via Fitur Cari */}
        {searchFocusTile && (
          <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/90 border border-amber-500/80 text-amber-200 px-3 py-1.5 rounded-full shadow-2xl font-serif text-xs backdrop-blur-md animate-in fade-in">
            <span className="text-amber-400">📍 Membidik: ({searchFocusTile.x}, {searchFocusTile.y})</span>
            <button
              onClick={handleRecenterToPlayer}
              className="px-2.5 py-0.5 bg-amber-900/80 hover:bg-amber-800 text-amber-100 rounded-full border border-amber-500 text-[11px] font-sans font-semibold transition-all active:scale-95 flex items-center gap-1"
            >
              🎯 Kembali ke Karakter
            </button>
          </div>
        )}

        {/* TALE OF IMMORTAL SHAN SHUI CANVAS ENGINE */}
        <div className="flex-1 min-h-0 w-full h-full relative">
        <TaleOfImmortalCanvas
          tiles={tiles}
          playerPos={{ x: px, y: py }}
          focusTile={searchFocusTile || (targetFocusTile ? { x: targetFocusTile.x, y: targetFocusTile.y } : null)}
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
          weather={weatherMode}
          isNight={isNightMode}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onRecenterPlayer={handleRecenterToPlayer}
        />

        {/* Floating Numbers & Notices (Gathering / Panen Feedback) */}
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center justify-center gap-2">
          {floatingNotices.map((notice) => (
            <div
              key={notice.id}
              className={`px-4 py-1.5 rounded-full font-serif font-bold text-sm tracking-wide shadow-2xl backdrop-blur-md border animate-in fade-in zoom-in slide-out-to-top-8 duration-700 transition-all ${
                notice.color === 'emerald'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/70 shadow-emerald-950/50'
                  : notice.color === 'amber'
                  ? 'bg-amber-950/90 text-amber-300 border-amber-500/70 shadow-amber-950/50'
                  : notice.color === 'cyan'
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/70 shadow-cyan-950/50'
                  : 'bg-red-950/90 text-red-300 border-red-500/70 shadow-red-950/50'
              }`}
            >
              {notice.text}
            </div>
          ))}
        </div>

        {/* Card Spasial Inspektur Petak Grid (Wuxia Tile Card - Muncul Setiap Petak Diklik) */}
        {selectedTile && (
          <GridTileInspectorCard
            tile={selectedTile}
            playerPos={{ x: px, y: py }}
            currentUserId={user?.id || (user as any)?.userId || (user as any)?.discordId}
            pathSteps={pathSteps}
            isWalking={isWalking}
            onWalkToTile={handleStartWalking}
            onTalkToNpc={(npc) => setTalkingNpc(npc)}
            onChallengeMonster={async (monsterKey) => {
              try {
                const tileKey = selectedTile ? `${selectedTile.tileX},${selectedTile.tileY}` : undefined;
                const res = await api.post('/battle/start', {
                  targetId: monsterKey,
                  targetType: 'monster',
                  zoneId: activeZoneId,
                  tileKey,
                  monsterData: selectedTile?.spawnedMonster
                });
                if (res.data?.success && res.data.battleId) {
                  setActiveBattleId(res.data.battleId);
                }
              } catch (err: any) {
                if (err.response?.data?.code === 'DEATH_RECOVERY') {
                  const remMs = err.response.data.remainingMs || 0;
                  const hours = Math.floor(remMs / 3600000);
                  const mins = Math.floor((remMs % 3600000) / 60000);
                  alert(`💀 Dantian Terluka Parah!\nKamu sedang dalam masa pemulihan (Sisa: ${hours} jam ${mins} menit) setelah gugur melawan ${err.response.data.killedBy || 'Siluman Liar'}.\nIstirahatkan dantianmu sebelum bertarung kembali!`);
                } else {
                  alert(err.response?.data?.error || 'Gagal memulai pertempuran');
                }
              }
            }}
            onPurchaseLand={handlePurchaseLand}
            onOpenBuildModal={(t) => setBuildModalTile(t)}
            onEnterBuilding={handleEnterBuilding}
            onEnterSettlement={handleEnterSettlement}
            onEnterSect={(t) => setSectModalTile(t)}
            onEnterExpedition={(t) => setExpeditionModalTile(t)}
            onFish={handleFish}
            onForage={handleForage}
            onPlantCrop={handlePlantCrop}
            onHarvestCrop={handleHarvestCrop}
            onSearchArea={handleSearch}
            playerLandStats={playerLandStats || undefined}
            onConstructionFinished={() => fetchZoneData()}
            onClose={() => {
              setSelectedTile(null);
              setActivePath([]);
              useUIStore.getState().setIsTileInspectorActive(false);
            }}
          />
        )}
      </div>

      {showMacroMap && (
        <WorldScrollMapView
          playerPos={{ x: px, y: py }}
          onClose={() => setShowMacroMap(false)}
        />
      )}

      {/* Bottom HUD: Action Bar, Navigasi & Inspektur (Disembunyikan jika sedang bertarung) */}
      {!activeBattleId && (
      <div className="bg-[#0e121a]/95 border-t border-amber-900/40 px-2.5 sm:px-4 pr-16 sm:pr-24 py-1.5 sm:py-2.5 z-20 flex justify-between items-center backdrop-blur-md gap-2">
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-300 min-w-0 overflow-hidden">
          {selectedTile ? (
            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="font-semibold text-amber-300 font-serif whitespace-nowrap">
                ({selectedTile.tileX}, {selectedTile.tileY})
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400 whitespace-nowrap">
                {distToSelected} petak{pathSteps > 0 && ` (~${pathSteps} langkah)`}
              </span>
              <span className="text-gray-600 hidden sm:inline">|</span>
              <span className="text-blue-300 font-medium hidden sm:inline truncate">
                {selectedTile.regionName || 'Central Plains'}
              </span>
              <span className="text-gray-600 hidden md:inline">|</span>
              <span className={`hidden md:inline font-medium ${
                selectedTile.territoryType === 'danger_zone' ? 'text-red-400 font-bold' :
                selectedTile.territoryType === 'monster_zone' ? 'text-orange-400' :
                selectedTile.territoryType === 'sect_territory' ? 'text-purple-400' :
                selectedTile.territoryType === 'settlement' ? 'text-blue-400' :
                'text-emerald-400'
              }`}>
                {selectedTile.territoryType === 'danger_zone' ? 'Bahaya' :
                 selectedTile.territoryType === 'monster_zone' ? 'Monster' :
                 selectedTile.territoryType === 'sect_territory' ? 'Sekte' :
                 selectedTile.territoryType === 'settlement' ? 'Pemukiman' :
                 'Alam Liar'}
              </span>
              {selectedTile.label && (
                <span className="text-amber-200/90 font-medium truncate hidden lg:inline">
                  • {selectedTile.label}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 italic text-[11px] sm:text-xs truncate">
              Geser dan klik petak untuk inspeksi dan berjalan.
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Tombol Hentikan Perjalanan saat sedang jalan */}
          {isWalking && (
            <button
              onClick={handleStopWalking}
              className="bg-red-950 hover:bg-red-900 text-red-200 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border border-red-700 flex items-center gap-1 text-[11px] sm:text-xs font-semibold shadow-lg transition-all animate-pulse"
            >
              <SquareX className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hentikan</span>
            </button>
          )}

          {/* Tombol Aksi Cepat Desktop (Di mobile dihandle penuh oleh GridTileInspectorCard agar tidak tumpang tindih) */}
          <div className="hidden lg:flex items-center gap-1.5 sm:gap-2">
            {/* Tombol Masuk Kota jika berada di settlement */}
            {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.settlementName && (
              <button
                onClick={() => handleEnterSettlement(selectedTile.settlementName || 'XiTong City')}
                className="bg-blue-900/90 hover:bg-blue-800 text-blue-100 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border border-blue-500/60 flex items-center gap-1 text-[11px] sm:text-xs font-serif font-bold shadow-lg transition-all"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-300" />
                <span>Masuk {selectedTile.settlementName}</span>
              </button>
            )}

            {/* Tombol Masuk Paviliun Meditasi jika berada di scenic courtyard */}
            {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.label?.includes('Paviliun') && (
              <button
                onClick={() => handleEnterCourtyard(selectedTile.label || 'Paviliun Gazebo')}
                className="bg-amber-950 hover:bg-amber-900 text-amber-200 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border border-amber-600/60 flex items-center gap-1 text-[11px] sm:text-xs font-serif font-bold shadow-lg transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Masuk Paviliun</span>
              </button>
            )}

            {/* Tombol Masuk Bangunan Interior (Rumah / Toko) */}
            {selectedTile && distToSelected !== null && distToSelected <= 1 && (selectedTile.buildingName || selectedTile.isDoor || selectedTile.propertyStructureId) && (
              <button
                onClick={() => handleEnterBuilding(selectedTile)}
                className="bg-emerald-950 hover:bg-emerald-900 text-emerald-200 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border border-emerald-600/60 flex items-center gap-1 text-[11px] sm:text-xs font-serif font-bold shadow-lg transition-all"
              >
                <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Masuk Bangunan</span>
              </button>
            )}

            {/* Tombol Inspeksi Aset / Detail Card */}
            {selectedTile && (selectedTile.buildingName || selectedTile.isUnderConstruction || selectedTile.propertyStructureId) && (
              <button
                onClick={() => setAssetDetailTile(selectedTile)}
                className="bg-stone-800 hover:bg-stone-700 text-amber-200 px-3 py-1.5 rounded-lg border border-amber-600/50 flex items-center gap-1.5 text-xs font-serif font-bold shadow-md transition-all"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Inspeksi Aset</span>
              </button>
            )}

            {/* Tombol Bangun Aset / Profesi jika tanah milik sendiri */}
            {selectedTile && distToSelected !== null && distToSelected <= 1 && selectedTile.isClaimable && selectedTile.ownerId && (!selectedTile.buildingName && !selectedTile.isUnderConstruction) && (
              <button
                onClick={() => setBuildModalTile(selectedTile)}
                className="bg-amber-800 hover:bg-amber-700 text-amber-100 px-3.5 py-1.5 rounded-lg border border-amber-400/70 flex items-center gap-1.5 text-xs font-serif font-bold shadow-lg transition-all animate-pulse"
              >
                <Hammer className="w-3.5 h-3.5 text-amber-300" />
                <span>Bangun Aset / Profesi</span>
              </button>
            )}

            {/* Tombol Masuk Ekspedisi Dungeon */}
            {selectedTile && distToSelected !== null && distToSelected <= 1 && (selectedTile.isExpeditionNode || selectedTile.label?.toLowerCase().includes('gua') || selectedTile.label?.toLowerCase().includes('makam') || selectedTile.label?.toLowerCase().includes('ekspedisi')) && (
              <button
                onClick={() => setExpeditionModalTile(selectedTile)}
                className="bg-indigo-950 hover:bg-indigo-900 text-indigo-100 px-3.5 py-1.5 rounded-lg border border-indigo-500/70 flex items-center gap-1.5 text-xs font-serif font-bold shadow-lg transition-all"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-300" />
                <span>Masuk Ekspedisi</span>
              </button>
            )}

            {/* Tombol Masuk Balai Sekte */}
            {selectedTile && distToSelected !== null && distToSelected <= 1 && (selectedTile.territoryType === 'sect_territory' || selectedTile.label?.includes('Sekte') || selectedTile.label?.includes('Dojo')) && (
              <button
                onClick={() => setSectModalTile(selectedTile)}
                className="bg-purple-950 hover:bg-purple-900 text-purple-100 px-3.5 py-1.5 rounded-lg border border-purple-500/70 flex items-center gap-1.5 text-xs font-serif font-bold shadow-lg transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-300" />
                <span>Masuk Balai Sekte</span>
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
      )}

      {/* Modal Detail Aset (Inspector Card) */}
      {assetDetailTile && (
        <GridAssetDetailCard
          tile={assetDetailTile}
          playerPos={{ x: px, y: py }}
          onEnter={(t) => {
            setAssetDetailTile(null);
            handleEnterBuilding(t);
          }}
          onClose={() => setAssetDetailTile(null)}
        />
      )}

      {/* Modal Pembangunan Aset / Profesi */}
      {buildModalTile && (
        <GridAssetBuildModal
          tile={buildModalTile}
          onBuild={handleStartBuildAsset}
          onClose={() => setBuildModalTile(null)}
        />
      )}

      {/* Modal Workbench Profesi */}
      {professionWorkbench && (
        <GridProfessionWorkbench
          professionType={professionWorkbench.type}
          buildingName={professionWorkbench.name}
          tileCoordinates={{ x: px, y: py }}
          zoneId={activeZoneId}
          onClose={() => setProfessionWorkbench(null)}
          onActionSuccess={(msg) => showMessage(msg)}
        />
      )}

      {/* Modal Ekspedisi Dungeon */}
      {expeditionModalTile && (
        <GridExpeditionModal
          dungeonName={expeditionModalTile.label || 'Gua Kuno Terlarang'}
          tileCoordinates={{ x: expeditionModalTile.tileX, y: expeditionModalTile.tileY }}
          onClose={() => setExpeditionModalTile(null)}
          onSuccess={(msg) => showMessage(msg)}
        />
      )}

      {/* Modal Balai Sekte */}
      {sectModalTile && (
        <GridSectHallModal
          sectName={sectModalTile.label || sectModalTile.factionName || 'Balai Sekte'}
          sectId={sectModalTile.regionId}
          onClose={() => setSectModalTile(null)}
        />
      )}

      {/* Modal Encounter Ambush */}
      {ambushModalData && (
        <GridAmbushCombatModal
          enemyName={ambushModalData.enemyName}
          encounterMessage={ambushModalData.encounterMessage}
          onResolved={(resMsg, isBattle) => {
             if (isBattle) {
                 setActiveBattleId(resMsg); // resMsg is battleId in this case
             } else {
                 showMessage(resMsg);
             }
          }}
          onClose={() => setAmbushModalData(null)}
        />
      )}

      {/* Modal Interaksi Dialog NPC dari Peta */}
      {talkingNpc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0e131d] border border-amber-600/70 rounded-2xl p-4 sm:p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <NpcPanel
              npcId={talkingNpc._id}
              onBack={() => setTalkingNpc(null)}
              onQuestAccepted={() => {
                showMessage(`📜 Menerima quest dari ${talkingNpc.name}`);
              }}
            />
          </div>
        </div>
      )}
      {/* Modal Cari Landmark & Markah Koordinat */}
      {isSearchModalOpen && (
        <MapSearchModal
          currentPos={{ x: px, y: py }}
          selectedPos={selectedTile ? { x: selectedTile.tileX, y: selectedTile.tileY } : null}
          onSelectLocation={handleSelectSearchResult}
          onClose={() => setIsSearchModalOpen(false)}
        />
      )}
      </div>

      {/* Render Battle Arena Fullscreen Modal */}
      {activeBattleId && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen bg-[#070a14] flex flex-col items-center justify-center p-0 m-0 overflow-hidden">
           <div className="w-full h-full flex flex-col">
             <BattleArena 
                 battleId={activeBattleId} 
                 onBattleEnd={(result, rewards) => {
                     setActiveBattleId(null);
                     if (result === 'won') {
                         showMessage(`🏆 Menang! Mendapatkan +${rewards?.exp || 0} EXP dan +${rewards?.silver || 0} Perak`);
                         if (selectedTile) {
                             setSelectedTile((prev: any) => prev ? { ...prev, spawnedMonster: undefined, label: 'Bekas Sarang (Kosong)' } : null);
                             setTiles((prev: any[]) => prev.map((t: any) => 
                                 (t.tileX === selectedTile.tileX && t.tileY === selectedTile.tileY) 
                                     ? { ...t, spawnedMonster: undefined, label: 'Bekas Sarang (Kosong)' } 
                                     : t
                             ));
                         }
                     } else if (result === 'fled') {
                         showMessage(`🏃 Berhasil meloloskan diri dari pertempuran.`);
                     } else {
                         showMessage(`💀 Pertarungan selesai dengan status: ${result}`);
                     }
                     fetchZoneData();
                 }} 
             />
           </div>
        </div>
      )}

      {/* Render Interior Properti Rumah Pemain as a Modal Overlay */}
      {interiorData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 fade-in duration-200">
           <div className="w-full max-w-3xl h-[88vh] max-h-[88vh] flex flex-col shadow-2xl ring-1 ring-amber-500/50 rounded-xl overflow-hidden bg-[#090c13]">
             <PropertyInteriorView propertyData={interiorData} onExit={() => setInteriorData(null)} />
           </div>
        </div>
      )}

      {/* Virtual D-Pad dihapus sesuai permintaan user agar layar mobile bersih & luas */}

      {/* Peringatan & Rekomendasi Orientasi Lanskap Mobile */}
      <LandscapeOrientationPrompt />

      {/* Sistem Layar Loading Peta Jianghu (Anti-Blank & Mulus) */}
      {!isInitialLoadDone && (
        <WorldMapLoadingScreen
          isReady={!loading && tiles.length > 0 && Boolean(playerGrid)}
          onFadeComplete={() => setIsInitialLoadDone(true)}
        />
      )}

    </div>
  );
}
