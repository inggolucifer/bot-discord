'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, Pickaxe, Coins, Clock, Building, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import FallbackImage from '@/components/FallbackImage';

interface WorkerData {
  _id: string;
  workerName: string;
  pricePerHour: number;
  maxDurationHours: number;
  isNpc?: boolean;
}

interface AssetData {
  id: string;
  name: string;
  underConstruction: boolean;
  status: string;
  assignedWorkers: unknown[];
  imageUrl: string | null;
}

export default function WorkerPage() {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [assets, setAssets] = useState<AssetData[]>([]);
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
    const timer = setTimeout(() => fetchWorkersAndAssets(), 0);
    return () => clearTimeout(timer);
  }, [user, router]);

  const handleHire = async () => {
      if (!selectedWorker || !selectedAssetId || hireDuration < 1) return;

      setHireLoading(true);
      try {
          if (selectedWorker.isNpc) {
              await api.post('/player/assets/hire-npc', { assetId: selectedAssetId, durasi: hireDuration });
          } else {
              await api.post('/player/assets/hire-player', { assetId: selectedAssetId, workerId: selectedWorker._id, durasi: hireDuration });
          }
          await fetchWorkersAndAssets();
          setSelectedWorker(null);
          alert(`Berhasil menyewa ${selectedWorker.workerName}!`);
      } catch (err: unknown) {
          console.error(err);
          alert((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal menyewa pekerja.');
      } finally {
          setHireLoading(false);
      }
  };

  if (loading) {
    return <div className="flex justify-center p-20 text-[#c5a880]"><Loader2 className="animate-spin" size={48} /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mb-10 relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center z-0">
           <span className="text-[120px] text-gray-500 leading-none select-none">⛩️</span>
        </div>
        <h1 className="text-4xl font-bold font-serif text-[#c5a880] relative z-10 drop-shadow-md">Papan Pekerja</h1>
        <p className="text-gray-400 relative z-10">Bursa kontrak pekerja bayaran Jianghu.</p>
      </div>

      {error && (
        <div className="p-4 rounded border text-center font-bold bg-red-900/30 text-red-400 border-red-800">
          {error}
        </div>
      )}

      <div className="bg-[#1a1a1a] jianghu-border rounded-lg p-6 min-h-[40vh]">
        {workers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Pickaxe size={48} className="mx-auto mb-4 opacity-50" />
            Tidak ada pekerja yang tersedia di papan saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workers.map((worker) => (
              <div key={worker._id} className={`bg-black/60 border ${worker.isNpc ? 'border-blue-900/50 hover:border-blue-600' : 'border-[#333] hover:border-[#c5a880]'} transition-colors rounded p-4 relative overflow-hidden group`}>
                 <div className={`absolute top-0 right-0 ${worker.isNpc ? 'bg-blue-900/20 group-hover:bg-blue-900/40' : 'bg-[#c5a880]/10 group-hover:bg-[#c5a880]/20'} w-16 h-16 rounded-bl-full pointer-events-none transition-colors`}></div>

                 {worker.isNpc && (
                    <div className="absolute top-2 right-2 bg-blue-900 text-blue-200 text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider z-10">
                        Sistem
                    </div>
                 )}

                 <div className="flex gap-4 items-start relative z-10">
                    <div className={`w-12 h-12 bg-gray-900 rounded-full border ${worker.isNpc ? 'border-blue-700 text-blue-400' : 'border-gray-700 text-[#c5a880]'} flex items-center justify-center flex-shrink-0`}>
                       <Pickaxe size={24} />
                    </div>
                    <div>
                       <h3 className={`font-bold font-serif ${worker.isNpc ? 'text-blue-300' : 'text-gray-200'}`}>{worker.workerName}</h3>
                       <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-400 flex items-center gap-2">
                             <Coins size={14} className="text-gray-500" />
                             Tarif: <span className="font-bold text-gray-300">{worker.pricePerHour} Silver</span> / jam
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-2">
                             <Clock size={14} className="text-gray-500" />
                             Maks: <span className="font-bold text-gray-300">{worker.maxDurationHours} jam</span>
                          </p>
                       </div>

                       <button
                          onClick={() => { setSelectedWorker(worker); setHireDuration(1); setSelectedAssetId(''); }}
                          className="mt-4 w-full bg-[#1f402e] hover:bg-green-900 text-green-100 text-xs px-3 py-2 rounded border border-green-800 transition-colors"
                       >
                          Sewa Pekerja
                       </button>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Sewa Pekerja */}
      {selectedWorker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#1a1a1a] border border-[#c5a880] rounded-lg shadow-2xl max-w-md w-full relative p-6">
                  <button
                      onClick={() => setSelectedWorker(null)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                  >
                      <X size={20} />
                  </button>

                  <h2 className="text-2xl font-bold text-[#c5a880] font-serif mb-4 flex items-center gap-2">
                      <Pickaxe size={24}/> Sewa {selectedWorker.workerName}
                  </h2>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Pilih Aset Tujuan</label>
                          <select
                              value={selectedAssetId}
                              onChange={(e) => setSelectedAssetId(e.target.value)}
                              className="w-full bg-black border border-[#555] rounded px-3 py-2 text-white focus:outline-none focus:border-[#c5a880] text-sm"
                          >
                              <option value="" disabled>-- Pilih Aset --</option>
                              {assets.map(a => (
                                  <option key={a.id} value={a.id} disabled={!a.underConstruction && a.assignedWorkers.length >= 1}>
                                      {a.name} {!a.underConstruction && a.assignedWorkers.length >= 1 ? '(Penuh)' : ''}
                                  </option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Durasi Sewa (Jam)</label>
                          <input
                              type="number"
                              min="1"
                              max={selectedWorker.maxDurationHours}
                              value={hireDuration}
                              onChange={(e) => setHireDuration(parseInt(e.target.value) || 1)}
                              className="w-full bg-black border border-[#555] rounded px-3 py-2 text-white focus:outline-none focus:border-[#c5a880] text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">Maksimal: {selectedWorker.maxDurationHours} jam</p>
                      </div>

                      <div className="p-3 bg-black/50 border border-[#333] rounded">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-gray-400 text-sm">Tarif per jam:</span>
                              <span className="text-gray-300 font-bold">{selectedWorker.pricePerHour} Silver</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-[#333] pt-1 mt-1">
                              <span className="text-gray-400 text-sm">Total Biaya:</span>
                              <span className="text-[#c5a880] font-bold text-lg">{selectedWorker.pricePerHour * hireDuration} Silver</span>
                          </div>
                      </div>

                      <button
                          onClick={handleHire}
                          disabled={hireLoading || !selectedAssetId || hireDuration < 1 || hireDuration > selectedWorker.maxDurationHours}
                          className="w-full bg-[#1f402e] hover:bg-green-900 disabled:bg-gray-800 disabled:text-gray-500 text-green-100 py-3 rounded border border-green-800 transition-colors font-bold mt-4"
                      >
                          {hireLoading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Konfirmasi Sewa'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
