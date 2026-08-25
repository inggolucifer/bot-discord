'use client';

import { Map, Clock, ArrowRight, Loader2, Pickaxe, CheckCircle2, AlertTriangle, Hammer, X, Users } from "lucide-react";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRouter } from "next/navigation";
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
  const [selectedWorkerIdToMove, setSelectedWorkerIdToMove] = useState<string>('');
  const [targetAssetId, setTargetAssetId] = useState<string>('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const fetchAssets = async () => {
      try {
          const res = await api.get('/player/assets');
          setAssets(res.data.data);
      } catch (err: any) {
          console.error(err);
          setError(err.response?.data?.error || 'Gagal memuat data aset.');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setTimeout(() => fetchAssets(), 0);
  }, [user]);

  const handleClaimProgress = async (assetId: string) => {
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/assets/claim-progress', { assetId });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchAssets(), 0);
          if (selectedAsset?.id === assetId) setSelectedAsset(null); // Close modal if open
      } catch (err: any) {
          setActionMessage({ type: 'error', text: err.response?.data?.error || 'Gagal klaim progress.' });
      } finally {
          setActionLoading(false);
      }
  };

  const handleWorkSelf = async () => {
      if(!selectedAsset) return;
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/assets/work-self', { assetId: selectedAsset.id });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchAssets(), 0);
          setSelectedAsset(null);
      } catch(err: any) {
          setActionMessage({ type: 'error', text: err.response?.data?.error || 'Gagal mulai kerja mandiri.' });
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
      } catch(err: any) {
          setActionMessage({ type: 'error', text: err.response?.data?.error || 'Gagal berhenti kerja.' });
      } finally {
          setActionLoading(false);
      }
  }

  const handleMoveWorker = async () => {
      if (!selectedAsset || !selectedWorkerIdToMove || !targetAssetId) return;
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
      } catch(err: any) {
          setActionMessage({ type: 'error', text: err.response?.data?.error || 'Gagal memindah pekerja.' });
      } finally {
          setMoveLoading(false);
      }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">

      <PageHeader
        title="Manajemen Aset"
        description="Pantau pembangunan aset, produksi tambang, dan kelola pekerja Anda."
        action={
          <Button variant="outline" onClick={() => fetchAssets()}>
            Refresh Data
          </Button>
        }
      />

      {actionMessage && (
          <div className={`p-4 rounded-lg flex items-center justify-between border ${actionMessage.type === 'success' ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-red-900/20 border-red-900/50 text-red-400'}`}>
              <span className="text-sm">{actionMessage.text}</span>
              <button onClick={() => setActionMessage(null)}><X size={16}/></button>
          </div>
      )}

      {!user && !loading && (
        <EmptyState
            icon={<Map />}
            title="Akses Ditolak"
            description="Silakan login menggunakan Discord untuk melihat Aset Anda."
        />
      )}

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
           description="Anda belum memiliki aset apapun. Bangun aset baru menggunakan item Blueprint (Cetak Biru) melalui command Discord."
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
                           <div className="flex flex-wrap gap-2 mt-1">
                               <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-700">{asset.type}</Badge>
                               <Badge variant={asset.underConstruction ? 'warning' : (asset.status === 'Halted (Terhenti)' ? 'destructive' : 'success')} className="text-[10px]">
                                   {asset.underConstruction ? 'Membangun' : (asset.status === 'Produksi' ? 'Produksi' : asset.status)}
                               </Badge>
                           </div>
                        </div>
                        <div className="text-center bg-black/40 border border-[#333] rounded p-2 min-w-[50px]">
                           <p className="text-[10px] text-gray-500">Jml</p>
                           <p className="font-bold text-white leading-none">{asset.quantity}</p>
                        </div>
                    </div>

                    <div className="my-4 flex-1">
                        {asset.underConstruction ? (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Progress Pembangunan</span>
                                    <span>{asset.progressPercent.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-black rounded-full h-1.5 border border-[#333]">
                                  <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-1000" style={{width: `${asset.progressPercent}%`}}></div>
                                </div>
                                {asset.constructionCompleteAt && (
                                    <p className="text-[10px] text-orange-400 mt-2 flex items-center gap-1">
                                        <Clock size={12}/> <Countdown targetDate={asset.constructionCompleteAt} />
                                    </p>
                                )}
                            </div>
                        ) : (
                             <div className="text-sm text-gray-400 line-clamp-2">
                                 {asset.description}
                             </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-[#333]">
                        <div className="flex -space-x-2 mr-2">
                            {asset.assignedWorkers.length > 0 ? (
                                asset.assignedWorkers.map((w, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-gray-800 border-2 border-[#111] flex items-center justify-center text-[10px]" title={w.workerId}>
                                        👷
                                    </div>
                                ))
                            ) : (
                                <span className="text-[10px] text-gray-500 italic ml-2">0 Pekerja</span>
                            )}
                        </div>

                        {/* Actions */}
                        {asset.underConstruction && asset.progressPercent >= 100 ? (
                            <Button size="sm" variant="success" onClick={() => handleClaimProgress(asset.id)} disabled={actionLoading} className="ml-auto text-xs w-full sm:w-auto">
                                Selesaikan <CheckCircle2 className="w-3 h-3 ml-1" />
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
                                  <div className="text-center py-6 bg-black/20 rounded border border-[#333]/50">
                                      <p className="text-xs text-gray-500 italic">Tidak ada pekerja yang ditugaskan.</p>
                                  </div>
                              ) : (
                                  <ul className="space-y-2">
                                      {selectedAsset.assignedWorkers.map((w, i) => (
                                          <li key={i} className="text-xs bg-black/40 p-3 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border border-[#333]">
                                              <span className="text-gray-300 flex items-center gap-2">
                                                  <Pickaxe size={14} className="text-gray-500"/>
                                                  {w.workerId.startsWith('NPC') ? w.workerId.substring(0, 15) + '...' : 'Pemain: ' + w.workerId}
                                              </span>
                                              <span className="text-orange-400 flex items-center gap-1 font-mono">
                                                  {w.endTime && <Clock size={12} />}
                                                  {w.endTime ? <Countdown targetDate={w.endTime} /> : 'Permanen'}
                                              </span>
                                          </li>
                                      ))}
                                  </ul>
                              )}
                          </div>

                          <div className="pt-4 mt-auto space-y-2">
                              {selectedAsset.assignedWorkers.some(w => w.workerId === user?.id) ? (
                                  <Button variant="outline" className="w-full border-orange-900 text-orange-400 hover:bg-orange-900/20" onClick={handleStopWorkSelf} disabled={actionLoading}>
                                      <Pickaxe className="mr-2 h-4 w-4" /> Berhenti Kerja Mandiri
                                  </Button>
                              ) : (
                                  <Button variant="destructive" className="w-full bg-[#8b0000]" onClick={handleWorkSelf} disabled={actionLoading || (!selectedAsset.underConstruction && selectedAsset.assignedWorkers.length >= 1)}>
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
                                              <option key={a.id} value={a.id} disabled={!a.underConstruction && a.assignedWorkers.length >= 1} className="disabled:text-gray-600">
                                                  {a.name} {!a.underConstruction && a.assignedWorkers.length >= 1 ? '(Penuh)' : ''}
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
    </div>
  );
}
