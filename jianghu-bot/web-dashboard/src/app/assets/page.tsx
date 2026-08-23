'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, Pickaxe, CheckCircle2, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import FallbackImage from '@/components/FallbackImage';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface AssetData {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  quantity: number;
  status: string;
  underConstruction: boolean;
  constructionCompleteAt: string | null;
  assignedWorkers: unknown[];
  progressHours: number;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ claimed: string[], waiting: string[], other: string[] } | null>(null);

  const { user } = useAuthStore();
  const router = useRouter();

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/player/assets');
      setAssets(res.data.data);
    } catch (err: unknown) {
      console.error(err);
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memuat data aset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchAssets();
  }, [user, router]);

  const handleClaimProfit = async () => {
    setClaimLoading(true);
    setClaimResult(null);
    setError(null);
    try {
      const res = await api.post('/player/assets/claim-profit');
      setClaimResult(res.data.data);
      await fetchAssets(); // Refresh asset states
    } catch (err: unknown) {
      console.error(err);
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal mengklaim profit.');
    } finally {
      setClaimLoading(false);
    }
  };


  if (loading) {
    return <div className="flex justify-center p-20 text-[#c5a880]"><Loader2 className="animate-spin" size={48} /></div>;
  }

  if (error) {
    return <div className="text-center p-20 text-red-500 font-bold">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-bold font-serif text-[#c5a880]">Manajemen Aset</h1>
        <p className="text-gray-400">Pantau operasional properti dan aset milik karakter Anda.</p>
      </div>

      <div className="bg-[#1a1a1a] jianghu-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white font-serif">Aset Pribadi</h2>
          <button
            onClick={handleClaimProfit}
            disabled={claimLoading || assets.length === 0}
            className="flex items-center gap-2 bg-[#1f402e] hover:bg-green-900 disabled:bg-gray-800 disabled:text-gray-500 text-green-100 text-sm px-4 py-2 rounded border border-green-800 transition-colors shadow-[0_0_10px_rgba(31,64,46,0.5)]"
          >
            {claimLoading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
            Klaim Profit
          </button>
        </div>

        {claimResult && (
          <div className="mb-6 p-4 rounded bg-black/50 border border-green-900/50">
            <h3 className="text-green-400 font-bold mb-2">Hasil Klaim:</h3>
            {claimResult.claimed.length > 0 ? (
              <ul className="text-sm text-gray-300 list-disc list-inside">
                {claimResult.claimed.map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Tidak ada profit yang bisa diklaim saat ini.</p>
            )}
          </div>
        )}

        {assets.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Anda belum memiliki aset apapun. Beli aset di Pasar atau bangun menggunakan material.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset, index) => (
              <div key={index} className="bg-black/40 border border-[#333] rounded-lg p-4 hover:border-[#c5a880] transition-colors relative">

                {asset.underConstruction && (
                   <div className="absolute top-2 right-2 bg-orange-900/80 text-orange-200 text-[10px] px-2 py-1 rounded border border-orange-700 flex items-center gap-1 z-10">
                     <Clock size={12} /> Sedang Dibangun
                   </div>
                )}

                {!asset.underConstruction && asset.status === 'Aktif' && (
                   <div className="absolute top-2 right-2 bg-green-900/80 text-green-200 text-[10px] px-2 py-1 rounded border border-green-700 flex items-center gap-1 z-10">
                     <CheckCircle2 size={12} /> {asset.status}
                   </div>
                )}

                {asset.status === 'Halted (Terhenti)' && (
                   <div className="absolute top-2 right-2 bg-red-900/80 text-red-200 text-[10px] px-2 py-1 rounded border border-red-700 flex items-center gap-1 z-10">
                     <AlertTriangle size={12} /> Terhenti
                   </div>
                )}

                <div className="flex gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-900 rounded border border-gray-700 overflow-hidden flex-shrink-0">
                    <FallbackImage
                      src={asset.imageUrl || ''}
                      alt={asset.name}
                      fallbackHtml='<div class="w-full h-full flex items-center justify-center text-3xl">🏯</div>'
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-200">{asset.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{asset.description}</p>
                    <p className="text-xs text-[#c5a880] mt-2 font-bold">Jumlah: {asset.quantity}</p>
                  </div>
                </div>

                <div className="border-t border-[#333] pt-3 flex justify-between items-center text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Pickaxe size={14} className="text-gray-500" />
                    <span>Pekerja: {asset.assignedWorkers.length}</span>
                  </div>
                  {!asset.underConstruction && asset.status === 'Aktif' && asset.progressHours > 0 && (
                     <span className="text-green-400">Profit tersedia</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}