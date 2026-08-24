'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowLeftRight, Check, X, Ban } from 'lucide-react';

interface BarterItem {
  itemId: {
    _id: string;
    name: string;
  };
  quantity: number;
}

interface Currency {
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
    if (currency.silver > 0) parts.push(`${currency.silver} 🥈`);
    if (currency.gold > 0) parts.push(`${currency.gold} 🥇`);
    if (currency.jade > 0) parts.push(`${currency.jade} 💎`);
    if (currency.spirit > 0) parts.push(`${currency.spirit} 🔮`);
    return parts.length > 0 ? parts.join(', ') : '0';
  };

  if (!hasCharacter) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#c5a880] font-serif mb-2 flex items-center gap-3">
            <ArrowLeftRight className="text-blue-500" /> Meja Barter
          </h1>
          <p className="text-gray-400 text-sm">Tawaran pertukaran item dan mata uang</p>
        </div>
        <button
          onClick={fetchBarters}
          disabled={loading}
          className="bg-[#1a1a1a] hover:bg-[#333] text-[#c5a880] px-4 py-2 rounded text-sm border border-[#444] transition-colors"
        >
          {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 text-red-400 p-3 rounded text-center text-sm">
          {error}
        </div>
      )}

      {loading && barters.length === 0 ? (
        <div className="text-center py-20 text-[#c5a880] animate-pulse">Memeriksa meja barter...</div>
      ) : barters.length === 0 ? (
        <div className="bg-black/80 border border-[#333] rounded-lg p-10 text-center shadow-[0_0_15px_rgba(0,0,0,0.5)] text-gray-500">
          Tidak ada tawaran barter yang tertunda.
        </div>
      ) : (
        <div className="grid gap-6">
          {barters.map(barter => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isIncoming = (user as any)?.userId === barter.toUserId || user?.id === barter.toUserId;

            return (
              <div key={barter._id} className="bg-black/80 border border-[#444] rounded-lg p-5 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative">

                <div className="absolute top-0 right-0 bg-[#222] text-gray-400 text-[10px] px-2 py-1 rounded-bl-lg rounded-tr-lg border-b border-l border-[#444]">
                  Kadaluarsa: {new Date(barter.expiresAt).toLocaleTimeString()}
                </div>

                <h3 className="text-center font-bold text-lg mb-4 text-[#c5a880]">
                  {isIncoming ? (
                     <span>Tawaran dari <span className="text-white">{barter.fromPlayerName}</span></span>
                  ) : (
                     <span>Menunggu jawaban dari <span className="text-white">{barter.toPlayerName}</span></span>
                  )}
                </h3>

                <div className="flex flex-col md:flex-row gap-4 items-stretch justify-center mb-6">
                  {/* Pihak 1 (Pengirim) */}
                  <div className="flex-1 bg-[#111] p-4 rounded border border-[#333]">
                    <div className="text-sm text-gray-500 mb-2 border-b border-[#333] pb-1">
                      Ditawarkan oleh {barter.fromPlayerName}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Currency:</span> {renderCurrency(barter.offerCurrency)}</div>
                      <div>
                         <span className="text-gray-400">Item:</span>
                         {barter.offerItems.length === 0 ? ' Tidak ada' : (
                           <ul className="list-disc list-inside mt-1 ml-2 text-gray-300 text-xs">
                             {barter.offerItems.map((oi, idx) => (
                               <li key={idx}>{oi.itemId.name} (x{oi.quantity})</li>
                             ))}
                           </ul>
                         )}
                      </div>
                    </div>
                  </div>

                  {/* Icon Panah */}
                  <div className="flex items-center justify-center text-[#c5a880]">
                    <ArrowLeftRight size={24} className="md:rotate-0 rotate-90" />
                  </div>

                  {/* Pihak 2 (Penerima) */}
                  <div className="flex-1 bg-[#111] p-4 rounded border border-[#333]">
                    <div className="text-sm text-gray-500 mb-2 border-b border-[#333] pb-1">
                      Diminta dari {barter.toPlayerName}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Currency:</span> {renderCurrency(barter.requestCurrency)}</div>
                      <div>
                         <span className="text-gray-400">Item:</span>
                         {barter.requestItems.length === 0 ? ' Tidak ada' : (
                           <ul className="list-disc list-inside mt-1 ml-2 text-gray-300 text-xs">
                             {barter.requestItems.map((ri, idx) => (
                               <li key={idx}>{ri.itemId.name} (x{ri.quantity})</li>
                             ))}
                           </ul>
                         )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4">
                  {isIncoming ? (
                    <>
                      <button
                        onClick={() => handleRespond(barter._id, 'accept')}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-2 bg-green-900/40 hover:bg-green-800 text-green-400 hover:text-white px-6 py-2 rounded text-sm border border-green-700/50 transition-colors disabled:opacity-50"
                      >
                        <Check size={16} /> {actionLoading === barter._id ? 'Memproses...' : 'Terima'}
                      </button>
                      <button
                        onClick={() => handleRespond(barter._id, 'decline')}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-2 bg-red-900/40 hover:bg-red-800 text-red-400 hover:text-white px-6 py-2 rounded text-sm border border-red-700/50 transition-colors disabled:opacity-50"
                      >
                        <X size={16} /> {actionLoading === barter._id ? 'Memproses...' : 'Tolak'}
                      </button>
                    </>
                  ) : (
                    <button
                        onClick={() => handleCancel(barter._id)}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-2 bg-[#8b0000] hover:bg-red-800 text-white px-6 py-2 rounded text-sm transition-colors disabled:opacity-50"
                      >
                        <Ban size={16} /> {actionLoading === barter._id ? 'Memproses...' : 'Batalkan Tawaran'}
                    </button>
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
