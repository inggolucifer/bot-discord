'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowLeftRight, Check, X, Ban, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';

interface BarterItem {
  itemId: {
    _id: string;
    name: string;
  };
  quantity: number;
}

interface Currency {
  copper: number;
  silver: number;
  gold: number;
  jade: number;
  spirit: number;
}

interface Barter {
  _id: string;
  fromUserId: string;
  toUserId: string;
  fromPlayerName: string;
  toPlayerName: string;
  offerItems: BarterItem[];
  offerCurrency: Currency;
  requestItems: BarterItem[];
  requestCurrency: Currency;
  status: string;
  expiresAt: string;
}

export default function BarterPage() {
  const { user, hasCharacter } = useAuthStore();
  const [barters, setBarters] = useState<Barter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBarters = async () => {
    try {
      setLoading(true);
      const res = await api.get('/barter');
      setBarters(res.data.barters);
      setError('');
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      setError(e.response?.data?.error || 'Gagal memuat tawaran barter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasCharacter) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    setTimeout(() => fetchBarters(), 0);
  }, [hasCharacter]);

  const handleRespond = async (barterId: string, action: 'accept' | 'decline') => {
    try {
      setActionLoading(barterId);
      await api.post('/barter/respond', { barterId, action });
      fetchBarters(); // Refresh data
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      const msg = e.response?.data?.error || 'Gagal merespon barter.';
      setError(msg);
      // Hapus pesan error setelah 3 detik
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (barterId: string) => {
    try {
      setActionLoading(barterId);
      await api.post('/barter/cancel', { barterId });
      fetchBarters(); // Refresh data
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      const msg = e.response?.data?.error || 'Gagal membatalkan barter.';
      setError(msg);
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const renderCurrency = (currency: Currency) => {
    const parts = [];
    if (currency.copper > 0) parts.push(`${currency.copper} 🟤`);
    if (currency.silver > 0) parts.push(`${currency.silver} 🥈`);
    if (currency.gold > 0) parts.push(`${currency.gold} 🥇`);
    if (currency.jade > 0) parts.push(`${currency.jade} 💎`);
    if (currency.spirit > 0) parts.push(`${currency.spirit} 🔮`);
    return parts.length > 0 ? parts.join(', ') : '0';
  };

  if (!hasCharacter) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
      <PageHeader
        title="Meja Barter"
        description="Tawaran pertukaran item dan mata uang."
        action={
          <Button variant="outline" onClick={fetchBarters} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 text-red-400 p-3 rounded-lg text-center text-sm">
          {error}
        </div>
      )}

      {loading && barters.length === 0 ? (
        <LoadingState text="Memeriksa meja barter..." />
      ) : barters.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight />}
          title="Tidak Ada Barter Aktif"
          description="Saat ini tidak ada tawaran barter yang melibatkan Anda."
        />
      ) : (
        <div className="grid gap-6">
          {barters.map(barter => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isIncoming = (user as any)?.userId === barter.toUserId || user?.id === barter.toUserId;

            return (
              <div key={barter._id} className="bg-[#111] border border-[#1e3a5f]/50 hover:border-[#1e3a5f] transition-colors rounded-xl p-5 shadow-[0_0_15px_rgba(30,58,95,0.1)] relative">

                <div className="absolute top-0 right-0 bg-black/60 text-gray-500 text-[10px] sm:text-xs px-3 py-1 rounded-bl-lg rounded-tr-xl border-b border-l border-[#333]">
                  Batas Waktu: {new Date(barter.expiresAt).toLocaleTimeString()}
                </div>

                <h3 className="text-center font-bold text-lg sm:text-xl mb-6 mt-2 text-[#c5a880] font-serif">
                  {isIncoming ? (
                     <span>Tawaran dari <span className="text-white">{barter.fromPlayerName}</span></span>
                  ) : (
                     <span>Menunggu dari <span className="text-white">{barter.toPlayerName}</span></span>
                  )}
                </h3>

                <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-stretch justify-center mb-6">
                  {/* Pihak 1 (Pengirim) */}
                  <div className="flex-1 bg-black/40 p-4 sm:p-5 rounded-lg border border-[#333]">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b border-[#333] pb-2 text-center md:text-left">
                      Ditawarkan ({barter.fromPlayerName})
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex flex-wrap justify-between items-center gap-2 bg-[#111] p-2 rounded">
                        <span className="text-gray-400">Currency</span>
                        <span className="font-mono text-gray-200">{renderCurrency(barter.offerCurrency)}</span>
                      </div>
                      <div className="bg-[#111] p-2 rounded">
                         <span className="text-gray-400 block mb-1">Item:</span>
                         {barter.offerItems.length === 0 ? <span className="text-gray-600 italic">Tidak ada</span> : (
                           <ul className="space-y-1 mt-1 text-gray-300 text-xs">
                             {barter.offerItems.map((oi, idx) => (
                               <li key={idx} className="flex flex-wrap justify-between items-center gap-1 bg-black/50 px-2 py-1 rounded">
                                 <span>{oi.itemId.name}</span>
                                 <span className="text-gray-500 font-mono">x{oi.quantity}</span>
                               </li>
                             ))}
                           </ul>
                         )}
                      </div>
                    </div>
                  </div>

                  {/* Icon Panah */}
                  <div className="flex items-center justify-center text-blue-500 py-2 md:py-0">
                    <ArrowLeftRight size={28} className="md:rotate-0 rotate-90" />
                  </div>

                  {/* Pihak 2 (Penerima) */}
                  <div className="flex-1 bg-black/40 p-4 sm:p-5 rounded-lg border border-[#333]">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b border-[#333] pb-2 text-center md:text-left">
                      Diminta ({barter.toPlayerName})
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex flex-wrap justify-between items-center gap-2 bg-[#111] p-2 rounded">
                         <span className="text-gray-400">Currency</span>
                         <span className="font-mono text-gray-200">{renderCurrency(barter.requestCurrency)}</span>
                      </div>
                      <div className="bg-[#111] p-2 rounded">
                         <span className="text-gray-400 block mb-1">Item:</span>
                         {barter.requestItems.length === 0 ? <span className="text-gray-600 italic">Tidak ada</span> : (
                           <ul className="space-y-1 mt-1 text-gray-300 text-xs">
                             {barter.requestItems.map((ri, idx) => (
                               <li key={idx} className="flex flex-wrap justify-between items-center gap-1 bg-black/50 px-2 py-1 rounded">
                                 <span>{ri.itemId.name}</span>
                                 <span className="text-gray-500 font-mono">x{ri.quantity}</span>
                               </li>
                             ))}
                           </ul>
                         )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap sm:flex-row justify-center gap-3 sm:gap-4 mt-6">
                  {isIncoming ? (
                    <>
                      <Button
                        variant="success"
                        onClick={() => handleRespond(barter._id, 'accept')}
                        disabled={actionLoading !== null}
                        className="w-full sm:w-auto"
                      >
                        {actionLoading === barter._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Terima Tawaran
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleRespond(barter._id, 'decline')}
                        disabled={actionLoading !== null}
                        className="w-full sm:w-auto"
                      >
                        {actionLoading === barter._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                        Tolak
                      </Button>
                    </>
                  ) : (
                    <Button
                        variant="destructive"
                        onClick={() => handleCancel(barter._id)}
                        disabled={actionLoading !== null}
                        className="w-full sm:w-auto"
                      >
                        {actionLoading === barter._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                        Batalkan Tawaran
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
