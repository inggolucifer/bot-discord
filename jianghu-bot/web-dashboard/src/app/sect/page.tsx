'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, Users, Shield, Banknote, Pickaxe, CheckCircle2, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import FallbackImage from '@/components/FallbackImage';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface SectAssetData {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  quantity: number;
  status: string;
  underConstruction: boolean;
  constructionCompleteAt: string | null;
  profitAvailable: boolean;
  isCraftingStation: boolean;
}

// Timer Component
const Countdown = ({ targetDate }: { targetDate: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const interval = setInterval(() => {
            const distance = new Date(targetDate).getTime() - new Date().getTime();
            if (distance < 0) {
                setTimeLeft('Selesai (Refresh)');
                clearInterval(interval);
                return;
            }
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${hours}j ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return <span>{timeLeft}</span>;
};

export default function SectPage() {
  const [sect, setSect] = useState<Record<string, unknown> | null>(null);
  const [assets, setAssets] = useState<SectAssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ claimedCurrency: string[], claimedMaterial: string[], distributionSummary: string[], waiting: string[], other: string[] } | null>(null);

  const { user } = useAuthStore();
  const router = useRouter();

  const fetchSectData = async () => {
    try {
      setLoading(true);
      const [profileRes, assetsRes] = await Promise.all([
         api.get('/sect/profile'),
         api.get('/sect/assets')
      ]);
      setSect(profileRes.data.data);
      setAssets(assetsRes.data.data);
    } catch (err: unknown) {
      console.error(err);
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memuat data sekte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    const timer = setTimeout(() => fetchSectData(), 0);
    return () => clearTimeout(timer);
  }, [user, router]);

  const handleClaimProfit = async () => {
    setClaimLoading(true);
    setClaimResult(null);
    setError(null);
    try {
      const res = await api.post('/sect/assets/claim-profit');
      setClaimResult(res.data.data);
      await fetchSectData(); // Refresh asset states
    } catch (err: unknown) {
      console.error(err);
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal mengklaim profit sekte.');
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mb-10 relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none flex justify-center z-0">
           <span className="text-[120px] text-green-900/30 leading-none select-none">⛩️</span>
        </div>
        <h1 className="text-4xl font-bold font-serif text-green-500 relative z-10 drop-shadow-md">Balai Sekte</h1>
        <p className="text-gray-400 relative z-10">Pusat logistik dan koordinasi sekte Anda.</p>
      </div>

      {!sect ? (
          <div className="bg-[#1a1a1a] jianghu-border border-green-900/50 rounded-lg p-6 min-h-[40vh] flex flex-col items-center justify-center">
             <Users size={48} className="mx-auto text-gray-600 mb-4" />
             <h2 className="text-xl font-bold text-gray-300">Anda adalah Rogue Cultivator</h2>
             <p className="text-gray-500 text-sm max-w-md mx-auto text-center mt-2">
               Anda saat ini tidak tergabung dalam sekte manapun. Cari sekte di Discord dan minta undangan dari Ketua Sekte untuk bergabung.
             </p>
          </div>
      ) : (
          <>
          {/* Info Sekte Section */}
          <div className="bg-[#1a1a1a] jianghu-border border-green-900/50 rounded-lg p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-900/10 rounded-bl-full pointer-events-none"></div>
            <div className="text-center w-full space-y-6">
                 <div className="w-24 h-24 mx-auto bg-black rounded-full border-2 border-green-700 flex items-center justify-center mb-4 overflow-hidden relative z-10 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                    <FallbackImage
                       src={sect.imageUrl as string || ''}
                       alt="Sect Banner"
                       fallbackNode={<span className="text-4xl">⛩️</span>}
                       className="w-full h-full object-cover"
                    />
                 </div>

                 <h2 className="text-3xl font-bold text-white font-serif">{sect.name as string}</h2>
                 <p className="text-gray-400 max-w-lg mx-auto">{sect.description as string}</p>

                 <div className="inline-flex items-center gap-2 bg-green-900/20 text-green-400 px-4 py-2 rounded-full border border-green-800 shadow-inner">
                   <Shield size={16} /> Jabatan Anda: {sect.role as string}
                 </div>

                 <div className="border-t border-green-900/30 pt-8 mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left relative z-10">
                    <div className="bg-black/60 p-4 rounded border border-green-900/40 hover:border-green-600 transition-colors">
                       <h3 className="font-bold text-green-400 mb-2 flex items-center gap-2"><Users size={16}/> Informasi Keanggotaan</h3>
                       <p className="text-sm text-gray-300 font-semibold mb-1">Jumlah Anggota: {sect.memberCount as number}</p>
                       <p className="text-xs text-gray-500">Manajemen anggota penuh tersedia di bot Discord (menggunakan komando /sekte).</p>
                    </div>
                    <div className="bg-black/60 p-4 rounded border border-[#c5a880]/40 hover:border-[#c5a880] transition-colors">
                       <h3 className="font-bold text-[#c5a880] mb-2 flex items-center gap-2"><Banknote size={16}/> Gudang Sekte</h3>
                       <p className="text-sm text-gray-300 font-semibold mb-1">Total Kekayaan: {(sect.totalWealth as number).toLocaleString()} Silver</p>
                       <p className="text-xs text-gray-500">Aset: Spirit ({(sect.currency as Record<string, number>).spirit}), Gold ({(sect.currency as Record<string, number>).gold}), Jade ({(sect.currency as Record<string, number>).jade})</p>
                    </div>
                 </div>
              </div>
          </div>

          {/* Aset Sekte Section */}
          <div className="bg-[#1a1a1a] jianghu-border border-green-900/50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6 border-b border-green-900/30 pb-4">
              <h2 className="text-xl font-bold text-green-400 font-serif">Aset Sekte</h2>
              {(sect.role === 'Ketua' || sect.role === 'Wakil Ketua' || sect.role === 'Tetua') && (
                  <button
                    onClick={handleClaimProfit}
                    disabled={claimLoading || assets.length === 0}
                    className="flex items-center gap-2 bg-[#1f402e] hover:bg-green-900 disabled:bg-gray-800 disabled:text-gray-500 text-green-100 text-sm px-4 py-2 rounded border border-green-800 transition-colors shadow-[0_0_10px_rgba(31,64,46,0.5)]"
                  >
                    {claimLoading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                    Klaim Profit Sekte
                  </button>
              )}
            </div>

            {(sect.role !== 'Ketua' && sect.role !== 'Wakil Ketua' && sect.role !== 'Tetua') && (
                <div className="mb-6 p-3 bg-blue-900/20 border border-blue-900/50 rounded text-sm text-blue-300 flex items-center gap-2">
                    <Shield size={16}/> Hanya Ketua, Wakil, atau Tetua yang dapat melakukan klaim profit sekte.
                </div>
            )}

            {claimResult && (
              <div className="mb-6 p-4 rounded bg-black/50 border border-green-900/50">
                <h3 className="text-green-400 font-bold mb-2">Hasil Klaim Sekte:</h3>

                {claimResult.claimedCurrency.length > 0 && (
                    <div className="mb-2">
                        <p className="text-xs text-gray-400 font-bold">💰 Income (Dibagikan ke anggota):</p>
                        <ul className="text-sm text-green-300 list-disc list-inside ml-2">
                            {claimResult.claimedCurrency.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                    </div>
                )}

                {claimResult.claimedMaterial.length > 0 && (
                    <div className="mb-2">
                        <p className="text-xs text-gray-400 font-bold">⛏️ Material (Masuk Gudang):</p>
                        <ul className="text-sm text-orange-300 list-disc list-inside ml-2">
                            {claimResult.claimedMaterial.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                    </div>
                )}

                {claimResult.distributionSummary.length > 0 && (
                    <div className="mb-2 mt-4 pt-2 border-t border-green-900/30">
                        <p className="text-xs text-[#c5a880] font-bold">📊 Distribusi Profit (Langsung masuk saldo pribadi):</p>
                        <ul className="text-sm text-gray-300 list-disc list-inside ml-2">
                            {claimResult.distributionSummary.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                    </div>
                )}

                {claimResult.claimedCurrency.length === 0 && claimResult.claimedMaterial.length === 0 && (
                  <p className="text-sm text-gray-400">Tidak ada profit yang bisa diklaim saat ini.</p>
                )}
              </div>
            )}

            {assets.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                Sekte ini belum memiliki aset apapun. Gunakan /sekte bangun-asset di Discord.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset, index) => (
                  <div key={index} className="bg-black/40 border border-[#333] rounded-lg p-4 hover:border-green-800 transition-colors relative group">

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
                          fallbackNode={<div className="w-full h-full flex items-center justify-center text-3xl">🏯</div>}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-200 group-hover:text-green-400 transition-colors">{asset.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{asset.description}</p>
                        <p className="text-xs text-[#c5a880] mt-2 font-bold">Jumlah: {asset.quantity}</p>
                      </div>
                    </div>

                    <div className="border-t border-[#333] pt-3 flex justify-between items-center text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        {asset.isCraftingStation ? (
                            <span className="text-blue-400">Fasilitas Crafting</span>
                        ) : (
                            <span className="text-gray-500">Otomatis / Pasif</span>
                        )}
                      </div>
                      {!asset.underConstruction && asset.status === 'Aktif' && asset.profitAvailable && (
                         <span className="text-green-400 font-bold animate-pulse">Profit tersedia</span>
                      )}
                    </div>

                    {asset.underConstruction && asset.constructionCompleteAt && (
                        <div className="mt-3 p-2 bg-black/60 rounded border border-[#333]">
                           <p className="text-[10px] text-gray-500 mb-1">Target Selesai:</p>
                           <p className="text-xs text-orange-400 font-semibold"><Countdown targetDate={asset.constructionCompleteAt} /></p>
                        </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
          </>
      )}
    </div>
  );
}
