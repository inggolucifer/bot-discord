'use client';

import { Map, Clock, ArrowRight, Loader2, Pickaxe, CheckCircle2, AlertTriangle, Hammer, X, Users, Search, PackageOpen } from "lucide-react";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRouter } from "next/navigation";
import FallbackImage from '@/components/FallbackImage';
import { getRarityColor, getRarityTextClass } from '@/lib/rarity';
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

interface Worker {
  workerId: string;
  assignedAt: string;
  endTime: string | null;
}

interface Asset {
  id: string;
  name: string;
  description: string;
  type: string;
  quantity: number;
  assignedWorkers: Worker[];
  underConstruction: boolean;
  constructionCompleteAt: string | null;
  status: string;
  progressPercent: number;
  remainingMs: number;
}

interface BuildableAsset {
  _id: string;
  name: string;
  description: string;
  type: string;
  buildable: boolean;
  constructionTimeHours: number;
  buildRequirements: { itemId: { _id: string, name: string }; quantity: number }[];
  imageUrl?: string;
  rank?: string;
  basePrice?: number;
  priceCurrency?: string;
}

const Countdown = ({ targetDate }: { targetDate: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(targetDate).getTime() - new Date().getTime();

            if (difference > 0) {
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft(`${hours}j ${minutes}m ${seconds}s`);
            } else {
                setTimeLeft('Selesai (Refresh/Klaim)');
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return <span>{timeLeft}</span>;
};

export default function AssetsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'move'>('info');
  const [activePageTab, setActivePageTab] = useState<'my-assets' | 'build-asset'>('my-assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkerIdToMove, setSelectedWorkerIdToMove] = useState<string>('');
  const [targetAssetId, setTargetAssetId] = useState<string>('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);

  const [buildableAssets, setBuildableAssets] = useState<BuildableAsset[]>([]);
  const [inventory, setInventory] = useState<{id: string, quantity: number}[]>([]);
  const [loadingBuildable, setLoadingBuildable] = useState(false);
  const [buildActionLoading, setBuildActionLoading] = useState(false);

  const [npcDuration, setNpcDuration] = useState<number>(1);

  const fetchAssets = async () => {
      try {
          const res = await api.get('/player/assets');
          setAssets(res.data.data);
      } catch (err) {
          console.error(err);
          setError((err as {response?: {data?: {error?: string}}}).response?.data?.error || 'Gagal memuat data aset.');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    if (!user) {
        const timeout = setTimeout(() => setLoading(false), 0);
        return () => clearTimeout(timeout);
    }
      const timeout = setTimeout(() => fetchAssets(), 0);
      return () => clearTimeout(timeout);
  }, [user]);

  const handleWorkSelf = async () => {
      if(!selectedAsset) return;
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/assets/work-self', { assetId: selectedAsset.id });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchAssets(), 0);
          setSelectedAsset(null);
      } catch (err) {
          setActionMessage({ type: 'error', text: (err as {response?: {data?: {error?: string}}}).response?.data?.error || 'Gagal mulai kerja mandiri.' });
      } finally {
          setActionLoading(false);
      }
  }

  const handleStopWorkSelf = async () => {
      if(!selectedAsset) return;
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/assets/stop-work', { assetId: selectedAsset.id });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchAssets(), 0);
          setSelectedAsset(null);
      } catch (err) {
          setActionMessage({ type: 'error', text: (err as {response?: {data?: {error?: string}}}).response?.data?.error || 'Gagal berhenti kerja.' });
      } finally {
          setActionLoading(false);
      }
  }

  const handleHireNpc = async () => {
      if(!selectedAsset) return;
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/assets/hire-npc', { assetId: selectedAsset.id, hours: npcDuration });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchAssets(), 0);
          setSelectedAsset(null);
      } catch (err) {
          setActionMessage({ type: 'error', text: (err as {response?: {data?: {error?: string}}}).response?.data?.error || 'Gagal menyewa NPC.' });
      } finally {
          setActionLoading(false);
      }
  }

  const handleMoveWorker = async () => {
      if(!selectedAsset || !selectedWorkerIdToMove || !targetAssetId) return;
      setMoveLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/assets/move-worker', {
              workerId: selectedWorkerIdToMove,
              fromAssetId: selectedAsset.id,
              toAssetId: targetAssetId
          });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchAssets(), 0);
          setSelectedAsset(null);
      } catch (err) {
          setActionMessage({ type: 'error', text: (err as {response?: {data?: {error?: string}}}).response?.data?.error || 'Gagal memindah pekerja.' });
      } finally {
          setMoveLoading(false);
      }
  }

  const fetchBuildableAssets = async () => {
      setLoadingBuildable(true);
      try {
          const [assetsRes, invRes] = await Promise.all([
              api.get('/almanack/assets'),
              api.get('/inventory')
          ]);
          const buildable = assetsRes.data.data.filter((a: {buildable: boolean}) => a.buildable);
          setBuildableAssets(buildable);
          if (invRes.data && invRes.data.data) {
              setInventory(invRes.data.data || []);
          }
      } catch (err) {
          console.error(err);
          setActionMessage({ type: 'error', text: 'Gagal memuat daftar aset yang bisa dibangun.' });
      } finally {
          setLoadingBuildable(false);
      }
  }

  useEffect(() => {
      if (activePageTab === 'build-asset' && buildableAssets.length === 0) {
          const timeout = setTimeout(() => fetchBuildableAssets(), 0);
          return () => clearTimeout(timeout);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageTab]);

  const filteredBuildableAssets = buildableAssets.filter(asset =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.description && asset.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ).map(asset => {
      let canBuild = true;
      if (asset.buildRequirements && asset.buildRequirements.length > 0) {
          for (const req of asset.buildRequirements) {
              const invItem = inventory.find(i => i.id === (req.itemId as { _id: string })._id);
              if (!invItem || invItem.quantity < req.quantity) {
                  canBuild = false;
                  break;
              }
          }
      }
      return { ...asset, canBuild };
  }).sort((a, b) => {
      if (a.canBuild && !b.canBuild) return -1;
      if (!a.canBuild && b.canBuild) return 1;
      return a.name.localeCompare(b.name);
  });

  const handleBuildAsset = async (assetId: string) => {
      setBuildActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/almanack/build-asset', { assetId });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => {
              fetchAssets();
              fetchBuildableAssets();
          }, 0);
      } catch (err) {
          setActionMessage({ type: 'error', text: (err as {response?: {data?: {error?: string}}}).response?.data?.error || 'Gagal membangun aset.' });
      } finally {
          setBuildActionLoading(false);
      }
  }

  const handleCompleteConstruction = async (assetId: string) => {
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/assets/claim-progress', { assetId });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchAssets(), 0);
      } catch (err) {
          setActionMessage({ type: 'error', text: (err as {response?: {data?: {error?: string}}}).response?.data?.error || 'Gagal menyelesaikan pembangunan aset.' });
      } finally {
          setActionLoading(false);
      }
  }

  const handleClaimProfit = async () => {
      setClaimLoading(true);
      setActionMessage(null);
      try {
                    const messageLines = [];
          if (res.data.data.claimed && res.data.data.claimed.length > 0) {
              messageLines.push(`Berhasil klaim: ${res.data.data.claimed.join(', ')}`);
          } else {
              messageLines.push('Tidak ada profit atau produksi yang bisa diklaim saat ini.');
          }
          if (res.data.data.waiting && res.data.data.waiting.length > 0) {
              messageLines.push(`Menunggu (belum 1 jam): ${res.data.data.waiting.join(', ')}`);
          }
          if (res.data.data.other && res.data.data.other.length > 0) {
              messageLines.push(`Lainnya: ${res.data.data.other.join(', ')}`);
          }

          setActionMessage({ type: res.data.data.claimed && res.data.data.claimed.length > 0 ? 'success' : 'error', text: messageLines.join(' | ') });
          await setTimeout(() => fetchAssets(), 0);
      } catch (err) {
          setActionMessage({ type: 'error', text: (err as {response?: {data?: {error?: string}}}).response?.data?.error || 'Gagal klaim profit.' });
      } finally {
          setClaimLoading(false);
      }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">
      <PageHeader
        title="Manajemen Aset"
        description="Pantau pembangunan aset, produksi tambang, dan kelola pekerja Anda."
        action={
          <div className="flex flex-col sm:flex-row gap-3">
              {activePageTab === 'build-asset' && (
                 <div className="relative w-full sm:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                   <input
                     type="text"
                     placeholder="Cari blueprint..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-[#111] border border-[#444] rounded-md pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#c5a880] transition-colors"
                   />
                 </div>
              )}
              {activePageTab === 'my-assets' && user && (
                  <Button variant="default" onClick={handleClaimProfit} disabled={claimLoading} className="bg-green-700 hover:bg-green-600 text-white">
                      {claimLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Pickaxe size={16} className="mr-2" />}
                      Claim Profit
                  </Button>
              )}
              <Button variant="outline" onClick={() => activePageTab === 'my-assets' ? fetchAssets() : fetchBuildableAssets()}>
                  Refresh Data
              </Button>
          </div>
        }
      />

      {!user && !loading ? (
        <EmptyState
            icon={<Map />}
            title="Akses Ditolak"
            description="Silakan login menggunakan Discord untuk melihat Aset Anda."
        />
      ) : (
      <>
      <div className="flex border-b border-[#333] gap-4 sm:gap-6 overflow-x-auto custom-scrollbar">
        <button
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activePageTab === 'my-assets' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => {setActivePageTab('my-assets'); setActionMessage(null);}}
        >
          <Map size={16} /> Aset Saya ({assets.length})
        </button>
        <button
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activePageTab === 'build-asset' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => {setActivePageTab('build-asset'); setActionMessage(null);}}
        >
          <Hammer size={16} /> Bangun Aset
        </button>
      </div>

      {actionMessage && (
          <div className={`p-4 rounded-lg flex items-center justify-between border ${actionMessage.type === 'success' ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-red-900/20 border-red-900/50 text-red-400'}`}>
              <span className="text-sm">{actionMessage.text}</span>
              <button onClick={() => setActionMessage(null)}><X size={16}/></button>
          </div>
      )}



      {/* Tab: Aset Saya */}
      {activePageTab === 'my-assets' && (
        <>
            {loading && <LoadingState text="Memuat peta aset..." />}

            {error && (
                <div className="py-10 text-center text-red-500 bg-red-900/10 border border-red-900/50 rounded-lg">
                {error}
                </div>
            )}

            {user && !loading && assets.length === 0 && !error && (
                <EmptyState
                icon={<Hammer />}
                title="Belum Ada Aset"
                description="Anda belum memiliki aset apapun. Buka tab 'Bangun Aset' untuk membangun aset baru menggunakan item Blueprint (Cetak Biru)."
                />
            )}

            {user && !loading && assets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {assets.map(asset => (
                        <div
                        key={asset.id}
                        className={`relative flex flex-col rounded-lg border p-4 sm:p-5 transition-all duration-300 hover:shadow-lg ${asset.underConstruction ? 'bg-[#1a110a] border-orange-900/40 hover:border-orange-700/60' : 'bg-[#111] border-[#333] hover:border-[#8b0000]/50'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 pr-2">
                                <h3 className="font-serif font-bold text-lg text-[#c5a880] truncate">{asset.name}</h3>
                                <p className="text-xs text-gray-500 mt-1 capitalize flex items-center gap-1"><PackageOpen size={12}/> {asset.type}</p>
                                </div>
                                <Badge variant={asset.underConstruction ? 'warning' : 'outline'} className={asset.underConstruction ? 'bg-orange-900/80 text-orange-200' : 'border-[#444] text-gray-300'}>
                                    {asset.underConstruction ? 'Membangun' : 'Aktif'}
                                </Badge>
                            </div>

                            <p className="text-sm text-gray-400 mb-4 line-clamp-2 h-10">{asset.description}</p>

                            <div className="grid grid-cols-2 gap-2 mb-4 bg-black/40 p-2 rounded-md border border-[#333]/50">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Jumlah</p>
                                    <p className="text-sm font-bold text-white">{asset.quantity}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Pekerja</p>
                                    <p className="text-sm font-bold text-white flex items-center gap-1">
                                        <Users size={12} className="text-gray-400"/>
                                        {asset.assignedWorkers.length} {asset.underConstruction ? '' : '/ 1'}
                                    </p>
                                </div>
                            </div>

                            {asset.underConstruction && asset.constructionCompleteAt && (
                                <div className="mb-4 bg-orange-900/20 p-2 rounded-md border border-orange-900/30">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-orange-400">Progres</span>
                                        <span className="text-orange-400 font-mono"><Countdown targetDate={asset.constructionCompleteAt} /></span>
                                    </div>
                                    <div className="w-full bg-black/50 rounded-full h-1.5 border border-orange-900/50 overflow-hidden">
                                        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${asset.progressPercent}%` }}></div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-4 border-t border-[#333]/50 flex justify-end">
                                {asset.underConstruction && asset.progressPercent >= 100 ? (
                                    <Button size="sm" variant="default" onClick={() => handleCompleteConstruction(asset.id)} disabled={actionLoading} className="w-full sm:w-auto bg-green-700 hover:bg-green-600 text-white">
                                        <CheckCircle2 className="w-4 h-4 mr-1" /> Selesaikan Bangunan
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="outline" onClick={() => setSelectedAsset(asset)} className="ml-auto text-xs w-full sm:w-auto">
                                        Kelola <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
      )}

      {/* Tab: Bangun Aset */}
      {user && activePageTab === 'build-asset' && (
          <div className="space-y-4">
              {loadingBuildable ? (
                  <LoadingState text="Memuat daftar blueprint..." />
              ) : filteredBuildableAssets.length === 0 ? (
                  <EmptyState icon={<Hammer/>} title="Tidak Ada Aset" description="Tidak ada aset yang bisa dibangun atau cocok dengan pencarian." />
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {filteredBuildableAssets.map((asset: BuildableAsset) => (
                          <div key={asset._id} className={`bg-[#111] border p-4 sm:p-5 rounded-lg flex flex-col gap-3 relative overflow-hidden group hover:border-[#c5a880]/50 hover:shadow-lg transition-all ${getRarityColor(asset.rank || '')}`}>
                              <div className="flex items-start gap-4">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-md border border-[#333] flex-shrink-0 flex items-center justify-center p-1 shadow-inner">
                                    <FallbackImage
                                        src={asset.imageUrl || ""}
                                        alt={asset.name}
                                        className="max-w-full max-h-full object-contain"
                                        fallbackNode={<div className="text-2xl sm:text-4xl">🏛️</div>}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold text-sm sm:text-base leading-tight mb-1.5 ${getRarityTextClass(asset.rank || '')} truncate`} title={asset.name}>{asset.name}</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Badge variant="success" className="text-[9px] sm:text-[10px] py-0 h-4 bg-[#1f402e]/80">Blueprint</Badge>
                                        <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 h-4 border-[#333] bg-black/40 capitalize">{asset.type}</Badge>
                                    </div>
                                </div>
                              </div>
                              <p className="text-[10px] sm:text-xs text-gray-400 italic mb-2 line-clamp-3 bg-black/30 p-2 rounded border border-[#333]/50">{asset.description}</p>

                              <div className="mt-auto pt-3 border-t border-[#333] text-[10px] sm:text-xs text-gray-400 space-y-2">
                                  <p className="flex flex-wrap sm:flex-nowrap justify-between gap-x-2"><span>Waktu Bangun:</span> <span className="text-orange-400 font-mono">{asset.constructionTimeHours} Jam</span></p>

                                  <div className="mt-2 bg-black/40 p-2 rounded border border-[#333]/50">
                                      <span className="text-gray-400 block mb-1.5 font-semibold">Material Dibutuhkan:</span>
                                      {asset.buildRequirements && asset.buildRequirements.length > 0 ? (
                                          <div className="flex flex-wrap gap-1.5">
                                              {asset.buildRequirements.map((req: { itemId?: { name: string }, quantity: number }, i: number) => (
                                                  <div key={i} className="flex items-center gap-1 bg-[#111] border border-[#444] px-1.5 py-0.5 rounded-sm">
                                                      <span className="text-[#c5a880] truncate max-w-[80px]" title={req.itemId?.name || 'Unknown Item'}>{req.itemId?.name || 'Unknown Item'}</span>
                                                      <span className="text-gray-500 font-mono">x{req.quantity}</span>
                                                  </div>
                                              ))}
                                          </div>
                                      ) : (
                                          <span className="text-gray-600 italic">Tidak ada material khusus.</span>
                                      )}
                                  </div>

                                  <Button
                                      variant={(asset as BuildableAsset & {canBuild: boolean}).canBuild ? "default" : "secondary"}
                                      size="sm"
                                      onClick={() => handleBuildAsset(asset._id)}
                                      disabled={buildActionLoading || !(asset as BuildableAsset & {canBuild: boolean}).canBuild}
                                      className="w-full mt-3"
                                  >
                                      {buildActionLoading ? <Loader2 size={14} className="animate-spin"/> : <><Hammer size={14} className="mr-2"/> Bangun Aset Ini</>}
                                  </Button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* Asset Management Modal */}
      <Modal
        isOpen={!!selectedAsset}
        onClose={() => { setSelectedAsset(null); setActionMessage(null); }}
        title={selectedAsset?.name || 'Kelola Aset'}
      >
          {selectedAsset && (
              <div>
                  <div className="flex border-b border-[#333] mb-4 overflow-x-auto">
                      <button
                          onClick={() => setActiveTab('info')}
                          className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${activeTab === 'info' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                          Informasi
                      </button>
                      <button
                          onClick={() => setActiveTab('move')}
                          className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${activeTab === 'move' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                          Pindah Pekerja
                      </button>
                  </div>

                  {activeTab === 'info' && (
                      <div className="space-y-6">
                          <p className="text-sm text-gray-300 bg-black/30 p-3 rounded-lg border border-[#333]/50 leading-relaxed">{selectedAsset.description}</p>

                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <div className="bg-black/50 p-4 rounded-lg border border-[#333] flex flex-col items-center justify-center text-center">
                                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                                  <p className={`font-bold text-sm sm:text-base ${selectedAsset.underConstruction ? 'text-orange-400' : selectedAsset.status === 'Halted (Terhenti)' ? 'text-red-400' : 'text-green-400'}`}>
                                      {selectedAsset.underConstruction ? 'Sedang Dibangun' : selectedAsset.status}
                                  </p>
                              </div>
                              <div className="bg-black/50 p-4 rounded-lg border border-[#333] flex flex-col items-center justify-center text-center">
                                  <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Jumlah</p>
                                  <p className="font-bold text-white text-lg sm:text-xl">{selectedAsset.quantity}</p>
                              </div>
                          </div>

                          {selectedAsset.underConstruction && selectedAsset.constructionCompleteAt && (
                              <div className="p-4 bg-orange-900/10 border border-orange-900/30 rounded-lg flex flex-col items-center justify-center text-center">
                                  <p className="text-xs text-orange-400/80 mb-2 flex items-center gap-2"><Clock size={14}/> Selesai Dalam</p>
                                  <p className="text-xl sm:text-2xl font-mono font-bold text-orange-400">
                                      <Countdown targetDate={selectedAsset.constructionCompleteAt} />
                                  </p>
                              </div>
                          )}

                          <div>
                              <h3 className="text-sm font-bold text-gray-400 border-b border-[#333] pb-2 mb-3">Daftar Pekerja ({selectedAsset.assignedWorkers.length})</h3>
                              {selectedAsset.assignedWorkers.length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">Tidak ada pekerja yang ditugaskan.</p>
                              ) : (
                                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                      {selectedAsset.assignedWorkers.map((worker, index) => (
                                          <li key={index} className="flex flex-wrap justify-between items-center gap-1 text-xs sm:text-sm bg-[#111] p-3 rounded-md border border-[#333]">
                                              <span className="font-semibold text-gray-300">
                                                  {worker.workerId.startsWith('NPC') ? worker.workerId.substring(0, 15) + '...' : worker.workerId}
                                                  {worker.workerId === user?.id && ' (Anda)'}
                                              </span>
                                              {worker.endTime && (
                                                  <span className="text-orange-400 bg-orange-900/20 px-2 py-1 rounded text-[10px] sm:text-xs flex items-center gap-1 border border-orange-900/30">
                                                      <Clock size={12} /> <Countdown targetDate={worker.endTime} />
                                                  </span>
                                              )}
                                          </li>
                                      ))}
                                  </ul>
                              )}
                          </div>

                          <div className="space-y-3">
                              {selectedAsset.assignedWorkers.some(w => w.workerId === user?.id) ? (
                                  <Button variant="outline" className="w-full border-orange-900 text-orange-400 hover:bg-orange-900/20" onClick={handleStopWorkSelf} disabled={actionLoading}>
                                      <Pickaxe className="mr-2 h-4 w-4" /> Berhenti Kerja Mandiri
                                  </Button>
                              ) : (
                                  <Button variant="destructive" className="w-full bg-[#8b0000]" onClick={handleWorkSelf} disabled={actionLoading || (!selectedAsset.underConstruction && selectedAsset.status === "active" && selectedAsset.assignedWorkers.length >= selectedAsset.quantity) || ((selectedAsset.underConstruction || selectedAsset.status !== "active") && selectedAsset.assignedWorkers.length >= 4)}>
                                      <Pickaxe className="mr-2 h-4 w-4" /> Kerja Mandiri di Aset Ini
                                  </Button>
                              )}

                              <Button variant="secondary" className="w-full" onClick={() => router.push('/worker')}>
                                  <Users className="mr-2 h-4 w-4" /> Sewa Pekerja dari Papan
                              </Button>

                              {!selectedAsset.underConstruction && selectedAsset.assignedWorkers.length >= 1 && (
                                  <p className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1 mt-3">
                                      <AlertTriangle size={12} /> Aset yang sudah jadi hanya bisa ditangani maksimal 1 pekerja.
                                  </p>
                              )}

                              <div className="pt-4 mt-4 border-t border-[#333]">
                                  <h4 className="text-xs font-bold text-gray-400 mb-2">Sewa NPC (5 Silver / Jam)</h4>
                                  <div className="flex gap-2">
                                      <input
                                          type="number"
                                          min="1"
                                          value={npcDuration}
                                          onChange={(e) => setNpcDuration(parseInt(e.target.value) || 1)}
                                          className="w-20 bg-[#111] border border-[#333] rounded px-2 text-sm text-white focus:outline-none focus:border-[#c5a880]"
                                      />
                                      <Button
                                          variant="outline"
                                          className="flex-1"
                                          onClick={handleHireNpc}
                                          disabled={actionLoading || (!selectedAsset.underConstruction && selectedAsset.status === "active" && selectedAsset.assignedWorkers.length >= selectedAsset.quantity) || ((selectedAsset.underConstruction || selectedAsset.status !== "active") && selectedAsset.assignedWorkers.length >= 4)}
                                      >
                                          Sewa NPC ({npcDuration * 5} Silver)
                                      </Button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'move' && (
                      <div className="space-y-6">
                          <p className="text-sm text-gray-400 bg-black/30 p-3 rounded-lg border border-[#333]/50">Pindahkan pekerja dari aset ini ke aset lain milikmu untuk mengoptimalkan produksi.</p>

                          {selectedAsset.assignedWorkers.length === 0 ? (
                              <div className="text-center py-8">
                                <Pickaxe className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Tidak ada pekerja di aset ini untuk dipindahkan.</p>
                              </div>
                          ) : (
                              <div className="space-y-4">
                                  <div>
                                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pilih Pekerja</label>
                                      <select
                                          value={selectedWorkerIdToMove}
                                          onChange={(e) => setSelectedWorkerIdToMove(e.target.value)}
                                          className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c5a880] text-sm appearance-none"
                                      >
                                          <option value="" disabled>-- Pilih Pekerja --</option>
                                          {selectedAsset.assignedWorkers.map((w, i) => (
                                              <option key={i} value={w.workerId}>{w.workerId.startsWith('NPC') ? w.workerId.substring(0, 15) + '...' : w.workerId}</option>
                                          ))}
                                      </select>
                                  </div>

                                  <div>
                                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pilih Aset Tujuan</label>
                                      <select
                                          value={targetAssetId}
                                          onChange={(e) => setTargetAssetId(e.target.value)}
                                          className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c5a880] text-sm appearance-none"
                                      >
                                          <option value="" disabled>-- Pilih Aset --</option>
                                          {assets.filter(a => a.id !== selectedAsset.id).map(a => (
                                              <option key={a.id} value={a.id} disabled={(!a.underConstruction && a.status === "active" && a.assignedWorkers.length >= (a.quantity || 1)) || ((a.underConstruction || a.status !== "active") && a.assignedWorkers.length >= 4)} className="disabled:text-gray-600">
                                                  {a.name} {((!a.underConstruction && a.status === "active" && a.assignedWorkers.length >= (a.quantity || 1)) || ((a.underConstruction || a.status !== "active") && a.assignedWorkers.length >= 4)) ? '(Penuh)' : ''}
                                              </option>
                                          ))}
                                      </select>
                                  </div>

                                  <Button
                                      onClick={handleMoveWorker}
                                      disabled={moveLoading || !selectedWorkerIdToMove || !targetAssetId}
                                      className="w-full mt-4"
                                      variant="default"
                                  >
                                      {moveLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <ArrowRight size={16} className="mr-2" />}
                                      Pindahkan Pekerja
                                  </Button>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          )}
      </Modal>
      </>
      )}
    </div>
  );
}
