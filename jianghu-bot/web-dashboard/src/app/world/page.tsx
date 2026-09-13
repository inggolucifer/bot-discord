'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Map, MapPin, Building, Activity, Navigation, ExternalLink, RefreshCw, Sun, Shield, User, MessageCircle, FileText, CheckCircle } from "lucide-react";
import NpcPanel from './NpcPanel';
import QuestLog from './QuestLog';
import SectExamModal from './SectExamModal';

export default function WorldPage() {
  const [locationData, setLocationData] = useState<any>(null);
  const [travelStatus, setTravelStatus] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchTravelStatus, 5000);
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
      }
      setSettlements(setRes.data.settlements || []);
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
      } else {
        setTravelStatus(null);
      }
      if (res.data.currentLocation) {
         setLocationData((prev: any) => ({ ...prev, currentLocation: res.data.currentLocation }));
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
      setMessage('Perjalanan dimulai!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memulai perjalanan');
    }
  };

  if (loading) return <div className="p-4 sm:p-6 lg:p-8 pt-20">Memuat dunia...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-20 max-w-7xl mx-auto space-y-8 min-h-screen pb-24">
      <PageHeader
        title="Dunia Jianghu"
        description="Jelajahi berbagai wilayah, masuki bangunan di pemukiman, atau mulai perjalanan ke tempat lain."
      />

      {error && <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-lg">{error}</div>}
      {message && <div className="bg-green-900/50 border border-green-500/50 text-green-200 p-4 rounded-lg">{message}</div>}

      {/* Travel Status Banner */}
      {travelStatus && travelStatus.status === 'traveling' && (
        <div className="bg-[#1a202c]/80 border border-blue-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <h2 className="text-xl font-serif font-bold text-blue-400 mb-2">Sedang Dalam Perjalanan</h2>
          <div className="text-gray-300 space-y-1">
            <p><span className="text-gray-500">Tujuan:</span> {travelStatus.toLocation.settlementName}</p>
            <p><span className="text-gray-500">Tiba:</span> {new Date(travelStatus.arrivalTime).toLocaleString()}</p>
          </div>
        </div>
      )}

      {travelStatus && travelStatus.status === 'arrived' && (
        <div className="bg-[#1a202c]/80 border border-green-500/30 rounded-xl p-6 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <h2 className="text-xl font-serif font-bold text-green-400 mb-2">Tiba di Tujuan!</h2>
          <p className="text-gray-300 mb-4">Kamu telah tiba di {travelStatus.toLocation.settlementName}.</p>

          {travelStatus.ambushResult?.happened && (
            <div className="mb-4 p-4 bg-red-950/50 rounded-lg border border-red-500/30">
               <p className="text-red-400 font-bold mb-1">Terjadi Penyergapan!</p>
               <p className="text-red-200/80">{travelStatus.ambushResult.message}</p>
            </div>
          )}
          <button
            onClick={() => setTravelStatus(null)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg transition-colors border border-gray-700"
          >
            Tutup Laporan
          </button>
        </div>
      )}

      {/* Climate Banner */}
      {climateData && !climateData.inComfort && (!travelStatus || travelStatus.status !== 'traveling') && (
        <div className="bg-orange-900/50 border border-orange-500/50 text-orange-200 p-4 rounded-lg shadow-md flex items-center gap-4">
           <div className="text-2xl">⚠️</div>
           <div>
              <p className="font-bold">Peringatan Suhu Ekstrem: {climateData.effectiveTemperature}°C</p>
              <p className="text-sm opacity-90">{climateData.message}</p>
              {climateData.penalties && (
                  <p className="text-sm font-semibold mt-1">
                      Efek: Qi Regenerasi -{Math.round((1 - climateData.penalties.qiRegenMultiplier) * 100)}%
                      {climateData.penalties.combatStatMultiplier < 1 && `, Stat Combat -${Math.round((1 - climateData.penalties.combatStatMultiplier) * 100)}%`}
                  </p>
              )}
           </div>
        </div>
      )}

      {/* Tabs */}
      {!travelStatus || travelStatus.status !== 'traveling' ? (
        <div className="flex gap-4 mb-6 border-b border-[#2a3142] pb-2">
            <button
                onClick={() => setActiveTab('location')}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${activeTab === 'location' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <MapPin className="w-5 h-5" /> Lokasi
            </button>
            <button
                onClick={() => setActiveTab('npcs')}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${activeTab === 'npcs' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <User className="w-5 h-5" /> NPC ({locationData?.npcsHere?.length || 0})
            </button>
            <button
                onClick={() => setActiveTab('quests')}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${activeTab === 'quests' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <FileText className="w-5 h-5" /> Quest Log
            </button>
        </div>
      ) : null}

      {/* Tab Content */}
      {(!travelStatus || travelStatus.status !== 'traveling') && activeTab === 'location' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-[#1a1f2e]/80 border border-[#2a3142] rounded-xl p-6 shadow-xl backdrop-blur-sm">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-serif font-bold text-[#c5a880]">Lokasi Saat Ini</h2>
                {climateData && (
                    <div className="text-right">
                        <span className={`text-sm font-bold ${climateData.inComfort ? 'text-green-400' : 'text-orange-400'}`}>
                            Suhu: {climateData.effectiveTemperature}°C
                        </span>
                        <span className="block text-xs text-gray-400">Cuaca: {climateData.weather}</span>
                    </div>
                )}
            </div>

            {locationData?.currentLocation && (
              <div className="mb-6 space-y-2 bg-[#0f131c] p-4 rounded-lg border border-[#2a3142]">
                <p><span className="text-gray-500 inline-block w-24">Region:</span> <span className="text-gray-300">{locationData.currentLocation.regionSlug}</span></p>
                <p><span className="text-gray-500 inline-block w-24">Settlement:</span> <span className="text-gray-300">{locationData.currentLocation.settlementName}</span></p>
                <p><span className="text-gray-500 inline-block w-24">Posisi:</span> <span className="text-[#a8c580]">{locationData.currentLocation.buildingName || 'Di jalanan/plaza'}</span></p>
              </div>
            )}

            {locationData?.currentLocation?.buildingName ? (
              <div className="flex flex-col gap-3">
                  {['sect_hall', 'dojo'].includes(locationData.currentLocation.buildingType) && locationData.currentLocation.linkedSectId && (
                      <Button
                          onClick={() => {
                              setSelectedExamSectId(locationData.currentLocation.linkedSectId);
                              setIsExamModalOpen(true);
                          }}
                          className="w-full bg-blue-900/50 hover:bg-blue-800/80 text-blue-200 border-blue-700/50"
                      >
                          <Shield className="w-4 h-4 mr-2" /> Ujian Masuk Sekte
                      </Button>
                  )}
                  <button
                    onClick={handleExit}
                    className="w-full bg-red-900/50 hover:bg-red-800/80 text-red-200 px-4 py-3 rounded-lg transition-colors border border-red-700/50 font-medium"
                  >
                    Keluar ke Jalanan
                  </button>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold mb-3 text-gray-300">Bangunan yang tersedia:</h3>
                {locationData?.buildings?.length === 0 && <p className="text-sm text-gray-500 italic">Tidak ada bangunan di sini.</p>}

                <div className="flex flex-col gap-3">
                  {locationData?.buildings?.map((b: any) => (
                    <div key={b._id} className="flex justify-between items-center bg-[#1e2532] p-3 rounded-lg border border-[#2a3142] hover:border-[#3a4152] transition-colors">
                      <div>
                        <span className="text-gray-200 block">{b.buildingName}</span>
                        <span className="text-xs text-gray-500 capitalize">{b.buildingType}</span>
                      </div>
                      <div className="flex gap-2">
                          <button
                            onClick={() => handleEnter(b.buildingName)}
                            className="bg-[#2d3748] hover:bg-[#4a5568] text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-[#4a5568]"
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

          {/* Travel Panel */}
          {(!locationData?.currentLocation?.buildingName) && (
            <div className="bg-[#1a1f2e]/80 border border-[#2a3142] rounded-xl p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-xl font-serif font-bold mb-4 text-[#80a8c5]">Perjalanan</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm mb-2 text-gray-400">Tujuan:</label>
                  <select
                    className="w-full bg-[#0f131c] text-gray-200 border border-[#2a3142] rounded-lg p-3 focus:outline-none focus:border-[#4a5568] transition-colors"
                    value={travelDestination}
                    onChange={(e) => setTravelDestination(e.target.value)}
                  >
                    <option value="">Pilih Settlement Tujuan...</option>
                    {settlements.filter(s => s.name !== locationData?.currentLocation?.settlementName).map(s => (
                      <option key={s.name} value={s.name}>{s.name} ({s.regionSlug})</option>
                    ))}
                  </select>
                </div>

                <div className="bg-[#0f131c] p-4 rounded-lg border border-[#2a3142]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useEscort}
                      onChange={(e) => setUseEscort(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-300">Gunakan Surat Jaminan Biro Pengawalan</span>
                      <p className="text-xs text-gray-500 mt-1">Mengurangi risiko disergap bandit selama perjalanan dengan mengkonsumsi 1 item.</p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleStartTravel}
                  disabled={!travelDestination}
                  className="w-full bg-blue-600/80 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/50"
                >
                  Mulai Perjalanan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(!travelStatus || travelStatus.status !== 'traveling') && activeTab === 'npcs' && (
          <div className="bg-[#1a1f2e]/80 border border-[#2a3142] rounded-xl p-6 shadow-xl backdrop-blur-sm min-h-[400px]">
              <h2 className="text-xl font-serif font-bold text-[#c5a880] mb-6 flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-blue-400" /> Orang-Orang di Sekitar
              </h2>

              {!selectedNpc ? (
                  <div>
                      {locationData?.npcsHere && locationData.npcsHere.length > 0 ? (
                          <div className="grid md:grid-cols-2 gap-4">
                              {locationData.npcsHere.map((npc: any) => (
                                  <div key={npc._id} className="bg-[#1e2532] border border-[#2a3142] rounded-lg p-4 flex justify-between items-center hover:border-blue-500/50 transition-colors">
                                      <div>
                                          <h3 className="text-lg font-bold text-gray-200">{npc.name}</h3>
                                          {npc.title && <p className="text-sm text-gray-400">{npc.title}</p>}
                                      </div>
                                      <button
                                          onClick={() => handleTalkToNpc(npc)}
                                          className="bg-blue-900/50 hover:bg-blue-800 text-blue-200 px-4 py-2 rounded-lg border border-blue-700/50 transition-colors"
                                      >
                                          Sapa
                                      </button>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-gray-500 italic text-center py-8">Tidak ada siapa-siapa di sini.</p>
                      )}
                  </div>
              ) : (
                  <NpcPanel
                      npcId={selectedNpc._id}
                      onBack={() => setSelectedNpc(null)}
                      onQuestAccepted={() => {
                          fetchQuests();
                      }}
                  />
              )}
          </div>
      )}

      {(!travelStatus || travelStatus.status !== 'traveling') && activeTab === 'quests' && (
          <QuestLog
              questLog={questLog}
              onQuestUpdated={() => {
                  fetchQuests();
              }}
          />
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
