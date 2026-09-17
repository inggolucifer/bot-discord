'use client';
import FallbackImage from "@/components/FallbackImage";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Map, MapPin, Building, Activity, Navigation, Compass, ExternalLink, RefreshCw, Sun, Shield, User, MessageCircle, FileText, CheckCircle, Zap, BedDouble, Tent, ChevronDown, ChevronUp, X } from "lucide-react";
import NpcPanel from './NpcPanel';
import QuestLog from './QuestLog';
import SectExamModal from './SectExamModal';
import WorldMapView from "@/components/map/WorldMapView";
import ZoneGridView from "@/components/map/ZoneGridView";

export function WorldPageContent() {
  const searchParams = useSearchParams();
  const queryZoneId = searchParams.get('zoneId');
  const queryTileX = searchParams.get('tileX');
  const queryTileY = searchParams.get('tileY');
  const targetFocusTile = queryTileX !== null && queryTileY !== null
    ? { x: Number(queryTileX), y: Number(queryTileY) }
    : null;

  const [locationData, setLocationData] = useState<any>(null);
  const [travelStatus, setTravelStatus] = useState<any>(null);
  const [restData, setRestData] = useState<any>(null);
  const [currentStamina, setCurrentStamina] = useState<number>(0);
  const [maxStamina, setMaxStamina] = useState<number>(100);
  const [restHours, setRestHours] = useState<number>(1);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [edges, setEdges] = useState<any>({});
  const [playerRealmIndex, setPlayerRealmIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [climateData, setClimateData] = useState<any>(null);
  const [travelDestination, setTravelDestination] = useState<string>('');
  const [useEscort, setUseEscort] = useState(false);

  // Sect Exam State
  const [selectedExamSectId, setSelectedExamSectId] = useState<string | null>(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'location' | 'npcs' | 'quests'>('location');
  const [questLog, setQuestLog] = useState<any[]>([]);
  const [selectedNpc, setSelectedNpc] = useState<any | null>(null);

  // UI Drawer & Rest Modal State
  const [isRestModalOpen, setIsRestModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Map View State
  const [mapView, setMapView] = useState<'grid' | 'world' | 'region'>('grid');
  const [selectedRegionSlug, setSelectedRegionSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => { fetchTravelStatus(); fetchRestStatus(); }, 5000);
    fetchRestStatus();
    return () => clearInterval(interval);
  }, []);

  const fetchQuests = async () => {
    try {
        const res = await api.get('/world/quests');
        if (res.data.questLog) setQuestLog(res.data.questLog);
    } catch (err) {
        console.error('Gagal memuat quest:', err);
    }
  };

  useEffect(() => {
      if (!loading && (!travelStatus || travelStatus.status !== 'traveling')) {
          fetchQuests();
      }
  }, [loading, travelStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locRes, travelRes, setRes, climateRes] = await Promise.all([
        api.get('/world/location'),
        api.get('/world/travel/status'),
        api.get('/world/settlements'),
        api.get('/world/climate').catch(() => ({ data: null }))
      ]);
      setLocationData(locRes.data);
      if (travelRes.data.travel) {
        setTravelStatus(travelRes.data.travel);
        if (travelRes.data.currentStamina !== undefined) setCurrentStamina(travelRes.data.currentStamina);
        if (travelRes.data.maxStamina !== undefined) setMaxStamina(travelRes.data.maxStamina);
      }
      setSettlements(setRes.data.settlements || []);
      setEdges(setRes.data.edges || {});
      setPlayerRealmIndex(setRes.data.playerRealmIndex || 0);
      if (climateRes.data) {
        setClimateData(climateRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memuat data dunia');
    } finally {
      setLoading(false);
    }
  };

  const fetchTravelStatus = async () => {
    try {
      const res = await api.get('/world/travel/status');
      if (res.data.travel) {
        setTravelStatus(res.data.travel);
        if (res.data.currentStamina !== undefined) setCurrentStamina(res.data.currentStamina);
        if (res.data.maxStamina !== undefined) setMaxStamina(res.data.maxStamina);
      } else {
        setTravelStatus(null);
      }
      if (res.data.currentLocation) {
         setLocationData((prev: any) => ({ ...prev, currentLocation: res.data.currentLocation }));
         if (!selectedRegionSlug) {
             setSelectedRegionSlug(res.data.currentLocation.regionSlug);
             setMapView('grid');
         }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEnter = async (buildingName: string) => {
    setError(null); setMessage(null);
    try {
      const res = await api.post('/world/enter', { buildingName });
      setMessage(res.data.message);
      setLocationData((prev: any) => ({ ...prev, currentLocation: res.data.currentLocation }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal masuk bangunan');
    }
  };

  const handleExit = async () => {
    setError(null); setMessage(null);
    try {
      const res = await api.post('/world/exit');
      setMessage(res.data.message);
      setLocationData((prev: any) => ({ ...prev, currentLocation: res.data.currentLocation }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal keluar bangunan');
    }
  };


  const fetchRestStatus = async () => {
    try {
      const res = await api.get("/world/rest/status");
      setRestData(res.data.rest);
      if (res.data.currentStamina !== undefined) setCurrentStamina(res.data.currentStamina);
      if (res.data.maxStamina !== undefined) setMaxStamina(res.data.maxStamina);
    } catch (err) {
      console.error("Failed to fetch rest status", err);
    }
  };

  const handleStartRest = async (mode: "tent" | "open") => {
    try {
      const res = await api.post("/world/rest/start", { mode, hours: restHours });
      setRestData(res.data.rest);
      if (res.data.currentStamina !== undefined) setCurrentStamina(res.data.currentStamina);
      if (res.data.maxStamina !== undefined) setMaxStamina(res.data.maxStamina);
      setMessage("Mulai beristirahat.");
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal mulai istirahat.");
    }
  };

  const handleCancelRest = async () => {
    try {
      const res = await api.post("/world/rest/cancel");
      setRestData(res.data.rest);
      if (res.data.currentStamina !== undefined) setCurrentStamina(res.data.currentStamina);
      if (res.data.maxStamina !== undefined) setMaxStamina(res.data.maxStamina);
      setMessage("Berhenti beristirahat.");
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal membatalkan istirahat.");
    }
  };

  const handleTalkToNpc = (npc: any) => {
      setSelectedNpc(npc);
  };

  const handleStartTravel = async () => {
    if (!travelDestination) return;
    setError(null); setMessage(null);
    try {
      const res = await api.post('/world/travel/start', {
        toSettlementName: travelDestination,
        useEscortLetter: useEscort
      });
      setTravelStatus(res.data.travel);
        if (res.data.currentStamina !== undefined) setCurrentStamina(res.data.currentStamina);
        if (res.data.maxStamina !== undefined) setMaxStamina(res.data.maxStamina);
      setMessage('Perjalanan dimulai!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memulai perjalanan');
    }
  };

  const handleStartTravelTo = async (destinationName: string) => {
      try {
          const res = await api.post('/world/travel/start', {
              toSettlementName: destinationName,
              useEscortLetter: false // Default to false from map UI click for now
          });
          setTravelStatus(res.data.travel);
          if (res.data.currentStamina !== undefined) setCurrentStamina(res.data.currentStamina);
          if (res.data.maxStamina !== undefined) setMaxStamina(res.data.maxStamina);
          setMessage(`Perjalanan ke ${destinationName} dimulai!`);
      } catch (err: any) {
          setError(err.response?.data?.error || 'Gagal memulai perjalanan');
      }
  };

  if (loading) return <div className="p-4 sm:p-6 lg:p-8 pt-20">Memuat dunia...</div>;

  return (
    <div className={`w-full h-full relative overflow-hidden ${climateData?.weather === 'Hujan' ? 'bg-blue-900/10' : climateData?.weather === 'Badai Beracun' ? 'bg-green-900/20' : climateData?.weather === 'Mendung' ? 'bg-gray-900/20' : 'bg-transparent'}`}>
      
      {/* Main Map Background */}
      <div className="absolute inset-0 flex flex-col">
        {mapView === 'world' ? (
          <div className="flex-1 w-full h-full animate-in fade-in zoom-in-95 duration-300 ease-out relative z-30">
            <WorldMapView
              onSelectRegion={(regionSlug: string) => {
                setSelectedRegionSlug(regionSlug);
                setMapView('grid');
              }}
              playerPos={locationData?.gridPosition ? { x: locationData.gridPosition.tileX, y: locationData.gridPosition.tileY } : undefined}
              currentLocation={locationData?.currentLocation}
            />
          </div>
        ) : (
          <div className="flex-1 w-full h-full animate-in fade-in zoom-in-95 duration-300 ease-out relative z-10">
            <ZoneGridView
              zoneId={queryZoneId || locationData?.gridPosition?.zoneId || 'central_plains_bamboo_forest'}
              targetFocusTile={targetFocusTile}
              onBackToWorld={() => setMapView('world')}
            />
          </div>
        )}
      </div>

      {/* Floating View Switcher */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-[#0e131d]/80 p-1.5 rounded-xl border border-gray-800 backdrop-blur-md shadow-xl">
        <button
          onClick={() => setMapView('grid')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold transition-all ${mapView === 'grid' ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white border border-amber-500 shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Compass className="w-3.5 h-3.5 text-amber-300" /> Eksplorasi Grid
        </button>
        <button
          onClick={() => setMapView('world')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold transition-all ${mapView === 'world' ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white border border-amber-500 shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Map className="w-3.5 h-3.5 text-amber-300" /> Peta Makro
        </button>
      </div>

      {/* Floating Status Bar (Stamina / Climate) - HIDDEN IN MACRO MAP */}
      {mapView !== 'world' && (
        <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-none">
          {/* Top-Right HUD Row */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Stamina Capsule */}
            <div className="bg-[#0e131d]/90 backdrop-blur-md border border-amber-700/60 shadow-[0_4px_20px_rgba(0,0,0,0.6)] rounded-xl px-3.5 py-1.5 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Stamina</span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {Math.floor(currentStamina)} / {maxStamina}
                    </span>
                  </div>
                  <div className="w-20 sm:w-28 bg-gray-800/90 rounded-full h-1.5 overflow-hidden mt-0.5 border border-amber-900/30">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      style={{ width: `${Math.min(100, Math.max(0, (currentStamina / maxStamina) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {restData && restData.status === 'resting' ? (
                <div className="flex items-center gap-2 pl-2 border-l border-gray-700/60">
                  <span className="text-[11px] text-blue-300 font-medium animate-pulse">
                    Istirahat ({restData.mode === 'tent' ? 'Tenda' : 'Terbuka'})
                  </span>
                  <button
                    onClick={handleCancelRest}
                    className="bg-red-950/90 hover:bg-red-900 text-red-200 text-[10px] px-2 py-0.5 rounded border border-red-700/60 font-semibold transition-colors"
                  >
                    Bangun
                  </button>
                </div>
              ) : (
                (!travelStatus || travelStatus.status !== 'traveling') && (
                  <button
                    onClick={() => setIsRestModalOpen(true)}
                    className="bg-gradient-to-r from-amber-950 to-amber-900 hover:from-amber-900 hover:to-amber-800 text-amber-200 text-xs px-2.5 py-1 rounded-lg border border-amber-700/60 font-serif font-bold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <BedDouble className="w-3.5 h-3.5 text-amber-300" />
                    <span>Istirahat</span>
                  </button>
                )
              )}
            </div>

            {/* Climate Pill */}
            {climateData && (
              <div className="hidden sm:flex items-center gap-1.5 bg-[#0e131d]/90 backdrop-blur-md border border-gray-800 rounded-xl px-3 py-1.5 shadow-xl text-xs">
                <span className="text-sm">{climateData.inComfort ? '🌤️' : '⚠️'}</span>
                <span className={`font-bold font-mono ${climateData.inComfort ? 'text-green-400' : 'text-orange-400'}`}>
                  {climateData.effectiveTemperature}°C
                </span>
                <span className="text-gray-400 text-[10px]">({climateData.weather})</span>
              </div>
            )}
          </div>

          {/* Notifications / Alerts beneath HUD */}
          <div className="w-80 space-y-2 pointer-events-auto">
            {error && (
              <div className="bg-red-950/90 backdrop-blur-md border border-red-500/50 text-red-200 p-2.5 rounded-lg text-xs shadow-xl animate-in fade-in flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-white ml-2"><X className="w-3.5 h-3.5"/></button>
              </div>
            )}
            {message && (
              <div className="bg-emerald-950/90 backdrop-blur-md border border-emerald-500/50 text-emerald-200 p-2.5 rounded-lg text-xs shadow-xl animate-in fade-in flex items-center justify-between">
                <span>{message}</span>
                <button onClick={() => setMessage(null)} className="text-emerald-400 hover:text-white ml-2"><X className="w-3.5 h-3.5"/></button>
              </div>
            )}

            {/* Travel Status Banner */}
            {travelStatus && travelStatus.status === 'traveling' && (
              <div className="bg-[#1a202c]/90 border border-blue-500/40 rounded-xl p-4 shadow-xl backdrop-blur-md text-xs">
                <h2 className="text-sm font-serif font-bold text-blue-400 mb-1.5">Sedang Dalam Perjalanan</h2>
                <div className="text-gray-300 space-y-1">
                  <p><span className="text-gray-500">Tujuan:</span> {travelStatus.toLocation.settlementName}</p>
                  {travelStatus.exhausted && <p className="text-yellow-400 font-semibold">Pemain kelelahan! Waktu tempuh bertambah.</p>}
                  <p><span className="text-gray-500">Tiba:</span> {new Date(travelStatus.arrivalTime).toLocaleTimeString()}</p>
                </div>
              </div>
            )}

            {/* Ambush Banner */}
            {travelStatus && travelStatus.status === 'ambushed' && (
              <div className="bg-red-950/90 border border-red-500/60 rounded-xl p-4 shadow-xl backdrop-blur-md text-xs">
                <h2 className="text-sm font-serif font-bold text-red-400 mb-1.5">Penyergapan Bandit!</h2>
                <p className="text-red-200 mb-3">{travelStatus.ambushResult?.message}</p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.post('/world/travel/resolve-ambush', { choice: 'fight' });
                        setTravelStatus(res.data.travel);
                        if (res.data.currentStamina !== undefined) setCurrentStamina(res.data.currentStamina);
                        if (res.data.maxStamina !== undefined) setMaxStamina(res.data.maxStamina);
                        if (res.data.currentLocation) setLocationData((prev: any) => ({ ...prev, currentLocation: res.data.currentLocation }));
                        fetchData();
                      } catch (e: any) {
                        setError(e.response?.data?.error || 'Gagal meresolve ambush.');
                      }
                    }}
                    className="flex-1 bg-red-800 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors"
                  >
                    Melawan
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.post('/world/travel/resolve-ambush', { choice: 'surrender' });
                        setTravelStatus(res.data.travel);
                        if (res.data.currentStamina !== undefined) setCurrentStamina(res.data.currentStamina);
                        if (res.data.maxStamina !== undefined) setMaxStamina(res.data.maxStamina);
                        if (res.data.currentLocation) setLocationData((prev: any) => ({ ...prev, currentLocation: res.data.currentLocation }));
                        fetchData();
                      } catch (e: any) {
                        setError(e.response?.data?.error || 'Gagal meresolve ambush.');
                      }
                    }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-1.5 px-3 rounded text-xs transition-colors border border-gray-700"
                  >
                    Menyerah
                  </button>
                </div>
              </div>
            )}

            {travelStatus && travelStatus.status === 'arrived' && (
              <div className="bg-[#1a202c]/90 border border-green-500/40 rounded-xl p-4 shadow-xl backdrop-blur-md text-xs">
                <h2 className="text-sm font-serif font-bold text-green-400 mb-1">Tiba di Tujuan!</h2>
                <p className="text-gray-300 mb-2">Tiba di {travelStatus.toLocation.settlementName}.</p>
                <button
                  onClick={() => setTravelStatus(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1 rounded text-xs transition-colors border border-gray-700"
                >
                  Tutup Laporan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rest Modal */}
      {isRestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0e131d] border border-amber-600/70 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-amber-900/50 pb-3">
              <h3 className="text-base font-serif font-bold text-amber-200 flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-amber-400" />
                Meditasi & Pemulihan Stamina
              </h3>
              <button
                onClick={() => setIsRestModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Pilih durasi istirahat untuk memulihkan stamina Anda. Menggunakan tenda memberikan regenerasi stamina ekstra.
            </p>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium flex justify-between">
                <span>Durasi Istirahat:</span>
                <span className="text-amber-300 font-bold font-mono">{restHours} Jam</span>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                value={restHours}
                onChange={(e) => setRestHours(parseInt(e.target.value) || 1)}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>1 Jam</span>
                <span>4 Jam</span>
                <span>8 Jam</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  handleStartRest("open");
                  setIsRestModalOpen(false);
                }}
                className="border-gray-700 hover:bg-gray-800 text-gray-200 text-xs py-2"
              >
                Istirahat Terbuka
              </Button>
              <Button
                onClick={() => {
                  handleStartRest("tent");
                  setIsRestModalOpen(false);
                }}
                className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white text-xs py-2 border border-amber-500 shadow-lg flex items-center justify-center gap-1.5"
              >
                <Tent className="w-3.5 h-3.5" />
                Gunakan Tenda
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Panel (Tabs & Content) - Collapsible Drawer */}
      {mapView !== 'world' && (
      <div className="absolute bottom-14 left-4 z-30 w-80 sm:w-96 max-h-[60vh] flex flex-col pointer-events-none animate-in fade-in">
        
        {/* Collapsible Drawer Header */}
        <div className="pointer-events-auto mb-1.5 flex items-center justify-between bg-[#0e131d]/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-amber-900/60 shadow-xl">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="flex items-center gap-2 text-xs font-serif font-bold text-amber-300 hover:text-amber-100 transition-colors w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Warta & Orang Sekitar</span>
            </span>
            {isDrawerOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>
        </div>

        {isDrawerOpen && (
        <div className="flex flex-col flex-1 min-h-0 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Tabs */}
          {!travelStatus || travelStatus.status !== 'traveling' ? (
            <div className="flex gap-1.5 mb-2 bg-[#0e131d]/95 backdrop-blur-md p-1.5 rounded-xl border border-gray-800 shadow-xl">
                <button
                    onClick={() => setActiveTab('location')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'location' ? 'bg-amber-900/40 text-amber-200 border border-amber-600/50 shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'}`}
                >
                    <MapPin className="w-3.5 h-3.5" /> Lokasi
                </button>
                <button
                    onClick={() => setActiveTab('npcs')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'npcs' ? 'bg-amber-900/40 text-amber-200 border border-amber-600/50 shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'}`}
                >
                    <User className="w-3.5 h-3.5" /> NPC
                </button>
                <button
                    onClick={() => setActiveTab('quests')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'quests' ? 'bg-amber-900/40 text-amber-200 border border-amber-600/50 shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'}`}
                >
                    <FileText className="w-3.5 h-3.5" /> Quest
                </button>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {(!travelStatus || travelStatus.status !== 'traveling') && activeTab === 'location' && (
            <div className="w-full">
              <div className="bg-[#1a1f2e]/90 border border-[#2a3142] rounded-xl p-5 shadow-xl backdrop-blur-md">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-serif font-bold text-[#c5a880]">Lokasi Saat Ini</h2>
                    {climateData && (
                        <div className="text-right">
                            <span className={`text-xs font-bold ${climateData.inComfort ? 'text-green-400' : 'text-orange-400'}`}>
                                Suhu: {climateData.effectiveTemperature}°C
                            </span>
                            <span className="block text-[10px] text-gray-400">Cuaca: {climateData.weather}</span>
                        </div>
                    )}
                </div>

                {locationData?.currentLocation && (
                  <div className="mb-5 space-y-1.5 bg-[#0f131c] p-3 rounded-lg border border-[#2a3142] text-sm">
                    <p><span className="text-gray-500 inline-block w-20">Region:</span> <span className="text-gray-300">{locationData.currentLocation.regionSlug}</span></p>
                    <p><span className="text-gray-500 inline-block w-20">Settlement:</span> <span className="text-gray-300">{locationData.currentLocation.settlementName}</span></p>
                    <p><span className="text-gray-500 inline-block w-20">Posisi:</span> <span className="text-[#a8c580]">{locationData.currentLocation.buildingName || 'Di jalanan'}</span></p>
                  </div>
                )}

                {locationData?.currentLocation?.buildingName ? (
                  <div className="flex flex-col gap-2">
                      {['sect_hall', 'dojo'].includes(locationData.currentLocation.buildingType) && locationData.currentLocation.linkedSectId && (
                          <Button
                              onClick={() => {
                                  setSelectedExamSectId(locationData.currentLocation.linkedSectId);
                                  setIsExamModalOpen(true);
                              }}
                              className="w-full bg-blue-900/50 hover:bg-blue-800/80 text-blue-200 border-blue-700/50 text-xs py-2"
                          >
                              <Shield className="w-3.5 h-3.5 mr-2" /> Ujian Masuk Sekte
                          </Button>
                      )}
                      <button
                        onClick={handleExit}
                        className="w-full bg-red-900/50 hover:bg-red-800/80 text-red-200 px-3 py-2 rounded-lg transition-colors border border-red-700/50 font-medium text-xs"
                      >
                        Keluar ke Jalanan
                      </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-300 text-xs">Bangunan yang tersedia:</h3>
                    {locationData?.buildings?.length === 0 && <p className="text-xs text-gray-500 italic">Tidak ada bangunan di sini.</p>}

                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {locationData?.buildings?.map((b: any) => (
                        <div key={b._id} className="flex justify-between items-center bg-[#1e2532] p-2.5 rounded-lg border border-[#2a3142] hover:border-[#3a4152] transition-colors">
                          <div>
                            <span className="text-gray-200 block text-xs font-semibold">{b.buildingName}</span>
                            <span className="text-[10px] text-gray-500 capitalize">{b.buildingType}</span>
                          </div>
                          <div className="flex gap-2">
                              <button
                                onClick={() => handleEnter(b.buildingName)}
                                className="bg-[#2d3748] hover:bg-[#4a5568] text-gray-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-[#4a5568]"
                              >
                                Masuk
                              </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(!travelStatus || travelStatus.status !== 'traveling') && activeTab === 'npcs' && (
              <div className="bg-[#1a1f2e]/90 border border-[#2a3142] rounded-xl p-5 shadow-xl backdrop-blur-md">
                  <h2 className="text-lg font-serif font-bold text-[#c5a880] mb-4 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-blue-400" /> Orang di Sekitar
                  </h2>

                  {!selectedNpc ? (
                      <div>
                          {locationData?.npcsHere && locationData.npcsHere.length > 0 ? (
                              <div className="flex flex-col gap-3">
                                  {locationData.npcsHere.map((npc: any) => (
                                      <div key={npc._id} className="bg-[#1e2532] border border-[#2a3142] rounded-lg p-3 flex justify-between items-center hover:border-blue-500/50 transition-colors">
                                          <div>
                                              <h3 className="text-sm font-bold text-gray-200">{npc.imageUrl ? <FallbackImage src={npc.imageUrl} alt={npc.name} className="w-6 h-6 rounded-full inline-block mr-2" fallbackNode={<span className="mr-2">{npc.imageEmoji || '🧙'}</span>} /> : <span className="mr-2">{npc.imageEmoji || '🧙'}</span>} {npc.name}</h3>
                                              {npc.title && <p className="text-[10px] text-gray-400">{npc.title}</p>}
                                          </div>
                                          <button
                                              onClick={() => handleTalkToNpc(npc)}
                                              className="bg-blue-900/50 hover:bg-blue-800 text-blue-200 px-3 py-1.5 text-xs rounded-md border border-blue-700/50 transition-colors"
                                          >
                                              Sapa
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <p className="text-gray-500 italic text-center py-6 text-xs">Tidak ada siapa-siapa di sini.</p>
                          )}
                      </div>
                  ) : (
                      <NpcPanel
                          npcId={selectedNpc._id}
                          onBack={() => setSelectedNpc(null)}
                          onQuestAccepted={() => fetchQuests()}
                      />
                  )}
              </div>
          )}

          {(!travelStatus || travelStatus.status !== 'traveling') && activeTab === 'quests' && (
              <div className="bg-[#1a1f2e]/90 border border-[#2a3142] rounded-xl p-4 shadow-xl backdrop-blur-md">
                <QuestLog
                    questLog={questLog}
                    onQuestUpdated={() => fetchQuests()}
                />
              </div>
          )}
        </div>
        </div>
        )}
      </div>
      )}

      {/* Sect Exam Modal */}
      {isExamModalOpen && selectedExamSectId && (
          <SectExamModal
              sectId={selectedExamSectId}
              onClose={() => {
                  setIsExamModalOpen(false);
                  setSelectedExamSectId(null);
                  fetchData();
              }}
          />
      )}
    </div>
  );
}

export default function WorldPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-amber-200">Menghubungkan ke Benua Jianghu...</div>}>
      <WorldPageContent />
    </Suspense>
  );
}
