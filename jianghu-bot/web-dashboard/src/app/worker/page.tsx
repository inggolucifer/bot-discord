'use client';

import { Pickaxe, Clock, Coins, X, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface WorkerData {
  _id: string;
  workerId: string;
  workerName: string;
  pricePerHour: number;
  maxDurationHours: number;
  isNpc: boolean;
}

interface Asset {
  id: string;
  name: string;
  underConstruction: boolean;
  assignedWorkers: any[];
}

export default function WorkerPage() {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null);
  const [hireDuration, setHireDuration] = useState(1);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [hireLoading, setHireLoading] = useState(false);

  const { user } = useAuthStore();
  const router = useRouter();

  const fetchWorkersAndAssets = async () => {
    try {
      setLoading(true);
      const [workersRes, assetsRes] = await Promise.all([
          api.get('/worker'),
          api.get('/player/assets')
      ]);
      setWorkers(workersRes.data.data);
      setAssets(assetsRes.data.data);
    } catch (err: unknown) {
      console.error(err);
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memuat data pekerja.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    setTimeout(() => fetchWorkersAndAssets(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleHire = async () => {
      if (!selectedWorker || !selectedAssetId || hireDuration < 1) return;

      setHireLoading(true);
      try {
          if (selectedWorker.isNpc) {
              await api.post('/player/assets/hire-npc', { assetId: selectedAssetId, durasi: hireDuration });
          } else {
              await api.post('/player/assets/hire-player', { assetId: selectedAssetId, workerId: selectedWorker._id, durasi: hireDuration });
          }
          await setTimeout(() => fetchWorkersAndAssets(), 0);
          setSelectedWorker(null);
          alert(`Berhasil menyewa ${selectedWorker.workerName}!`);
      } catch (err: unknown) {
          console.error(err);
          alert((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal menyewa pekerja.');
      } finally {
          setHireLoading(false);
      }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">
      <PageHeader
        title="Papan Pekerja"
        description="Bursa kontrak pekerja bayaran Jianghu."
        action={
          <Button variant="outline" onClick={fetchWorkersAndAssets} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh Papan
          </Button>
        }
      />

      {error ? (
        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-center text-red-400">
          {error}
        </div>
      ) : loading ? (
        <LoadingState text="Membuka Papan Pekerja..." />
      ) : workers.length === 0 ? (
        <EmptyState
          icon={<Pickaxe />}
          title="Papan Kosong"
          description="Tidak ada pekerja yang tersedia di papan saat ini."
        />
      ) : (
        <div className="bg-[#111] border border-[#333] rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,0,0,0.5)] min-h-[40vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {workers.map((worker) => (
              <div key={worker._id} className={`bg-black/40 border ${worker.isNpc ? 'border-blue-900/50 hover:border-blue-500' : 'border-[#444] hover:border-[#c5a880]'} transition-all hover:shadow-lg rounded-lg p-4 sm:p-5 relative overflow-hidden group`}>
                 <div className={`absolute top-0 right-0 ${worker.isNpc ? 'bg-blue-900/20 group-hover:bg-blue-900/40' : 'bg-[#c5a880]/10 group-hover:bg-[#c5a880]/20'} w-16 h-16 rounded-bl-full pointer-events-none transition-colors`}></div>

                 {worker.isNpc && (
                    <div className="absolute top-2 right-2 bg-blue-900 text-blue-100 text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider z-10 shadow">
                        Sistem
                    </div>
                 )}

                 <div className="flex gap-4 items-start relative z-10">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-[#111] rounded-full border-2 ${worker.isNpc ? 'border-blue-700 text-blue-400' : 'border-gray-600 text-[#c5a880]'} flex items-center justify-center flex-shrink-0 shadow-inner`}>
                       <Pickaxe className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h3 className={`font-bold font-serif text-base sm:text-lg truncate ${worker.isNpc ? 'text-blue-300' : 'text-gray-200'}`} title={worker.workerName}>{worker.workerName}</h3>
                       <div className="mt-2.5 space-y-1.5">
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-400 bg-black/40 p-1.5 rounded border border-[#333]">
                             <Coins className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                             <span>Tarif: <span className="font-bold text-gray-200 font-mono">{worker.pricePerHour} Silver</span> / jam</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-400 bg-black/40 p-1.5 rounded border border-[#333]">
                             <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                             <span>Maks: <span className="font-bold text-gray-200 font-mono">{worker.maxDurationHours} jam</span></span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <Button
                    variant={worker.isNpc ? 'secondary' : 'default'}
                    className={`w-full mt-5 ${worker.isNpc ? 'bg-[#1e3a5f] hover:bg-blue-900 border-none text-blue-100' : ''}`}
                    onClick={() => { setSelectedWorker(worker); setHireDuration(1); setSelectedAssetId(''); }}
                 >
                    Sewa Pekerja
                 </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Sewa Pekerja */}
      <Modal
        isOpen={!!selectedWorker}
        onClose={() => setSelectedWorker(null)}
        title={selectedWorker ? `Sewa ${selectedWorker.workerName}` : "Sewa Pekerja"}
        maxWidth="sm"
      >
          {selectedWorker && (
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pilih Aset Tujuan</label>
                    <select
                        value={selectedAssetId}
                        onChange={(e) => setSelectedAssetId(e.target.value)}
                        className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c5a880] text-sm appearance-none"
                    >
                        <option value="" disabled>-- Pilih Aset --</option>
                        {assets.map(a => (
                            <option key={a.id} value={a.id} disabled={!a.underConstruction && a.assignedWorkers.length >= 1} className="disabled:text-gray-600">
                                {a.name} {!a.underConstruction && a.assignedWorkers.length >= 1 ? '(Penuh)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Durasi Sewa (Jam)</label>
                    <input
                        type="number"
                        min="1"
                        max={selectedWorker.maxDurationHours}
                        value={hireDuration}
                        onChange={(e) => setHireDuration(parseInt(e.target.value) || 1)}
                        className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c5a880] text-sm text-center font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5 text-right">Maksimal: {selectedWorker.maxDurationHours} jam</p>
                </div>

                <div className="p-4 bg-black/60 border border-[#333] rounded-lg shadow-inner">
                    <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                        <span className="text-gray-400 text-xs sm:text-sm">Tarif per jam:</span>
                        <span className="text-gray-300 font-mono text-sm">{selectedWorker.pricePerHour} Silver</span>
                    </div>
                    <div className="flex flex-wrap justify-between items-center border-t gap-2 border-[#333] pt-2 mt-2">
                        <span className="text-gray-400 text-xs sm:text-sm font-semibold">Total Biaya:</span>
                        <span className="text-[#c5a880] font-bold text-lg font-mono">{selectedWorker.pricePerHour * hireDuration} Silver</span>
                    </div>
                </div>

                <Button
                    onClick={handleHire}
                    disabled={hireLoading || !selectedAssetId || hireDuration < 1 || hireDuration > selectedWorker.maxDurationHours}
                    variant="success"
                    className="w-full"
                >
                    {hireLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Pickaxe size={16} className="mr-2" />}
                    Konfirmasi Sewa
                </Button>
            </div>
          )}
      </Modal>
    </div>
  );
}
