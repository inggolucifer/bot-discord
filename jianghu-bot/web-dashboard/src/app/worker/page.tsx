'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, Pickaxe, Coins, Clock } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface WorkerData {
  _id: string;
  workerName: string;
  pricePerHour: number;
  maxDurationHours: number;
}

export default function WorkerPage() {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const fetchWorkers = async () => {
      try {
        setLoading(true);
        const res = await api.get('/worker');
        setWorkers(res.data.data);
      } catch (err: unknown) {
        console.error(err);
        setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memuat data pekerja.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [user, router]);

  if (loading) {
    return <div className="flex justify-center p-20 text-[#c5a880]"><Loader2 className="animate-spin" size={48} /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
              <div key={worker._id} className="bg-black/60 border border-[#333] hover:border-[#c5a880] transition-colors rounded p-4 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 bg-[#c5a880]/10 w-16 h-16 rounded-bl-full pointer-events-none group-hover:bg-[#c5a880]/20 transition-colors"></div>
                 <div className="flex gap-4 items-start relative z-10">
                    <div className="w-12 h-12 bg-gray-900 rounded-full border border-gray-700 flex items-center justify-center flex-shrink-0 text-[#c5a880]">
                       <Pickaxe size={24} />
                    </div>
                    <div>
                       <h3 className="font-bold text-gray-200 font-serif">{worker.workerName}</h3>
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

                       <button className="mt-4 w-full bg-[#1f402e] hover:bg-green-900 text-green-100 text-xs px-3 py-2 rounded border border-green-800 transition-colors cursor-not-allowed opacity-50">
                          Sewa (Fitur Discord)
                       </button>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-900/10 border border-blue-900/30 rounded text-sm text-blue-400/80 text-center">
           💡 Untuk menugaskan pekerja ke aset, silakan gunakan fitur ini melalui Discord Bot untuk sementara waktu.
        </div>
      </div>
    </div>
  );
}
