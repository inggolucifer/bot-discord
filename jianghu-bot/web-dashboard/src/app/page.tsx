'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { Shield, Sword, Scroll, Users, Coins, Flame, BookOpen, Gift, RefreshCcw, Send, Sparkles, Loader2, Footprints, History } from 'lucide-react';
import FallbackImage from '@/components/FallbackImage';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

interface Currency {
    silver: number;
    gold: number;
    jade: number;
    spirit: number;
}

export default function Home() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals for new features
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Transfer Currency
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetName, setTransferTargetName] = useState('');
  const [transferCurrencyType, setTransferCurrencyType] = useState('silver');
  const [transferAmount, setTransferAmount] = useState(0);

  // Loot
  const [availableLoots, setAvailableLoots] = useState<any[]>([]);
  const [lootModalOpen, setLootModalOpen] = useState(false);

  // Transactions History
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/player/profile');
      setProfile(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 0);
    }
  };

  const fetchAvailableLoot = async () => {
      try {
          const res = await api.get('/player/loot');
          setAvailableLoots(res.data.data);
      } catch (err) {
          console.error("Loot check error", err);
      }
  };

  const fetchTransactions = async () => {
      try {
          const res = await api.get('/player/transactions');
          setTransactions(res.data.data);
      } catch (err) {
          console.error("Transactions check error", err);
      }
  };

  useEffect(() => {
    if (!user) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    setTimeout(() => fetchProfile(), 0);
    setTimeout(() => fetchAvailableLoot(), 0);
  }, [user]);

  const handleDailyClaim = async () => {
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/daily');
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchProfile(), 0);
      } catch (err: any) {
          setActionMessage({ type: 'error', text: err.response?.data?.error || 'Gagal klaim daily.' });
      } finally {
          setActionLoading(false);
      }
  };

  const handleTransfer = async () => {
      if(!transferTargetName || transferAmount <= 0) return;
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/transfer', {
              targetName: transferTargetName,
              currencyType: transferCurrencyType,
              amount: transferAmount
          });
          setActionMessage({ type: 'success', text: res.data.message });
          setTransferModalOpen(false);
          setTransferTargetName('');
          setTransferAmount(0);
          await setTimeout(() => fetchProfile(), 0);
      } catch (err: any) {
          setActionMessage({ type: 'error', text: err.response?.data?.error || 'Gagal transfer.' });
      } finally {
          setActionLoading(false);
      }
  };

  const handleClaimLoot = async (poolId: string) => {
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/player/loot', { poolId });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchAvailableLoot(), 0);
          await setTimeout(() => fetchProfile(), 0);
          if (availableLoots.length <= 1) setLootModalOpen(false);
      } catch (err: any) {
          setActionMessage({ type: 'error', text: err.response?.data?.error || 'Gagal mengambil loot.' });
      } finally {
          setActionLoading(false);
      }
  };

  if (loading) {
    return <LoadingState text="Memasuki Dunia Persilatan..." />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-0">

      {/* Notifications Area */}
      {actionMessage && (
          <div className={`p-4 rounded-lg flex items-center justify-between border ${actionMessage.type === 'success' ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-red-900/20 border-red-900/50 text-red-400'}`}>
              <span className="text-sm">{actionMessage.text}</span>
              <button onClick={() => setActionMessage(null)} className="text-gray-500 hover:text-white">✕</button>
          </div>
      )}

      {/* Welcome Hero Section */}
      <section className="relative overflow-hidden rounded-xl border border-[#c5a880]/30 bg-[#111] p-6 sm:p-10 text-center shadow-[0_0_30px_rgba(197,168,128,0.1)]">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] pointer-events-none"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#c5a880] rounded-full mix-blend-overlay filter blur-[100px] opacity-10"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#8b0000] rounded-full mix-blend-overlay filter blur-[100px] opacity-10"></div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 font-serif text-[#c5a880] tracking-wider relative z-10">
          Gerbang Menuju Dunia Persilatan
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto mb-10 relative z-10 leading-relaxed">
          Selamat datang di Pusat Manajemen Meta-Economy Jianghu RP.
          Silakan login menggunakan akun Discord Anda untuk mengelola Kultivasi, Inventory, dan Aset Anda secara langsung.
        </p>

        {/* Mock Character Status Card */}
        <div className="bg-black/80 border border-[#333] rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 max-w-3xl mx-auto text-center sm:text-left relative z-10 backdrop-blur-md shadow-lg">
          {user && profile ? (
            <>
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-[#c5a880] overflow-hidden flex-shrink-0 bg-[#1a1a1a] shadow-[0_0_20px_rgba(197,168,128,0.2)]">
                 <FallbackImage
                   src={(profile.characterImage as string) || (profile.discordAvatar as string) || "https://cdn.discordapp.com/embed/avatars/0.png"}
                   alt="Character Avatar"
                   className="w-full h-full object-cover"
                   fallbackNode={<div className="absolute inset-0 flex items-center justify-center text-4xl">🧑‍🎤</div>}
                 />
              </div>

              <div className="flex-grow w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-2 sm:gap-0 mb-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white font-serif mb-1">{profile.characterName as string}</h2>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                        <Badge variant="outline" className="text-xs bg-[#c5a880]/10 border-[#c5a880]/30 gap-1">
                            <Flame size={12} className="text-[#c5a880]" /> {profile.realm as string} ({profile.stage as string})
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-[#1f402e]/30 border-[#1f402e] text-green-300 gap-1">
                            <Users size={12} /> {profile.sect as string}
                        </Badge>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-[#222] rounded-full h-2 mt-4 border border-[#333] overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-700 to-[#c5a880] h-full rounded-full relative" style={{width: '60%'}}>
                     <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2 gap-2 gap-2">
                    <p className="text-[10px] sm:text-xs text-gray-500">Progress menuju terobosan selanjutnya</p>
                    <p className="text-[10px] sm:text-xs font-mono text-[#c5a880]">60%</p>
                </div>
              </div>
            </>
          ) : user ? (
            <div className="w-full text-center py-6 sm:py-8 flex flex-col items-center justify-center gap-4">
               <p className="text-gray-400 text-sm sm:text-base">Anda sudah login, namun karakter belum ditemukan. Silakan buat karakter di Discord.</p>
            </div>
          ) : (
             <div className="w-full text-center py-6 sm:py-8 flex flex-col items-center justify-center gap-4">
                <p className="text-gray-400 text-sm sm:text-base">Anda belum login. Silakan login untuk mengelola karakter, kultivasi, inventory, dan aset Anda.</p>
                <Button
                   onClick={() => {
                     const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
                     if (!clientId || clientId === 'YOUR_APPLICATION_ID_HERE') {
                       alert("Konfigurasi login belum lengkap (NEXT_PUBLIC_DISCORD_CLIENT_ID belum diatur). Hubungi admin.");
                       return;
                     }
                     const redirectUri = encodeURIComponent(
                       process.env.NEXT_PUBLIC_URL ? `${process.env.NEXT_PUBLIC_URL}/auth/callback` : 'http://localhost:3000/auth/callback'
                     );
                     window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
                   }}
                   variant="destructive"
                   size="lg"
                   className="shadow-[0_0_15px_rgba(139,0,0,0.6)] animate-[pulse_2s_infinite]"
                >
                   Login via Discord
                </Button>
             </div>
          )}
        </div>

        {/* NEW: Quick Actions for Daily, Loot, Transfer */}
        {user && profile && (
            <div className="mt-8 flex flex-wrap justify-center gap-3 relative z-10">
                <Button
                    variant="outline"
                    onClick={handleDailyClaim}
                    disabled={actionLoading}
                    className="bg-black/50 border-[#c5a880] text-[#c5a880] hover:bg-[#c5a880]/20"
                >
                    {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Gift size={16} className="mr-2" />}
                    Klaim Daily
                </Button>
                <Button
                    variant="outline"
                    onClick={() => setTransferModalOpen(true)}
                    className="bg-black/50 border-blue-800 text-blue-400 hover:bg-blue-900/30"
                >
                    <Send size={16} className="mr-2" />
                    Transfer Saldo
                </Button>
                <Button
                    variant="outline"
                    onClick={() => { fetchTransactions(); setHistoryModalOpen(true); }}
                    className="bg-black/50 border-gray-600 text-gray-300 hover:bg-gray-800/50"
                >
                    <History size={16} className="mr-2" />
                    Riwayat Transaksi
                </Button>
                {availableLoots.length > 0 && (
                    <Button
                        variant="destructive"
                        onClick={() => setLootModalOpen(true)}
                        className="bg-red-900/80 hover:bg-red-700 animate-[bounce-slow_2s_infinite] border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                    >
                        <Sparkles size={16} className="mr-2" />
                        Loot Tersedia ({availableLoots.length})
                    </Button>
                )}
            </div>
        )}
      </section>

      {/* Currency & Quick Stats */}
      {user && profile && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card variant="default" className="bg-[#111]">
             <CardContent className="p-3 sm:p-5 flex flex-col items-center justify-center gap-2 text-center">
                 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 border border-gray-600">
                    <Coins size={16} className="sm:w-5 sm:h-5" />
                 </div>
                 <span className="text-[10px] sm:text-xs text-gray-400 font-medium">Silver Tael</span>
                 <span className="text-lg sm:text-2xl font-bold text-gray-300 font-mono">{((profile.currency as Record<string, number>)?.silver) || 0}</span>
             </CardContent>
          </Card>
          <Card variant="gold" className="bg-[#111]">
             <CardContent className="p-3 sm:p-5 flex flex-col items-center justify-center gap-2 text-center">
                 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-900/30 flex items-center justify-center text-yellow-500 border border-yellow-700/50">
                    <Coins size={16} className="sm:w-5 sm:h-5" />
                 </div>
                 <span className="text-[10px] sm:text-xs text-gray-400 font-medium">Gold Tael</span>
                 <span className="text-lg sm:text-2xl font-bold text-yellow-500 font-mono">{((profile.currency as Record<string, number>)?.gold) || 0}</span>
             </CardContent>
          </Card>
          <Card variant="green" className="bg-[#111]">
             <CardContent className="p-3 sm:p-5 flex flex-col items-center justify-center gap-2 text-center">
                 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-900/30 flex items-center justify-center text-green-400 border border-green-700/50">
                    <Coins size={16} className="sm:w-5 sm:h-5" />
                 </div>
                 <span className="text-[10px] sm:text-xs text-gray-400 font-medium">Jade Tael</span>
                 <span className="text-lg sm:text-2xl font-bold text-green-400 font-mono">{((profile.currency as Record<string, number>)?.jade) || 0}</span>
             </CardContent>
          </Card>
          <Card variant="blue" className="bg-[#111]">
             <CardContent className="p-3 sm:p-5 flex flex-col items-center justify-center gap-2 text-center">
                 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-300 border border-blue-900/50">
                    <Coins size={16} className="sm:w-5 sm:h-5" />
                 </div>
                 <span className="text-[10px] sm:text-xs text-gray-400 font-medium">Spirit Stone</span>
                 <span className="text-lg sm:text-2xl font-bold text-blue-300 font-mono">{((profile.currency as Record<string, number>)?.spirit) || 0}</span>
             </CardContent>
          </Card>
        </section>
      )}

      {/* Quick Actions / Shortcuts */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <a href="/inventory" className="group relative bg-[#111] border border-[#333] p-5 sm:p-6 rounded-lg hover:border-[#c5a880] hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(197,168,128,0.1)] transition-all duration-300 flex flex-col items-center text-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#c5a880]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="p-3 sm:p-4 bg-black rounded-full text-[#c5a880] group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(197,168,128,0.4)] transition-all duration-300 relative z-10 border border-[#333] group-hover:border-[#c5a880]/50">
            <Scroll size={28} className="sm:w-8 sm:h-8" />
          </div>
          <h3 className="font-bold font-serif text-base sm:text-lg text-white relative z-10 group-hover:text-[#c5a880] transition-colors">Gudang & Crafting</h3>
          <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors relative z-10">Kelola inventory material, dan meracik item baru.</p>
        </a>

        <a href="/assets" className="group relative bg-[#111] border border-[#333] p-5 sm:p-6 rounded-lg hover:border-[#8b0000] hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(139,0,0,0.1)] transition-all duration-300 flex flex-col items-center text-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#8b0000]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="p-3 sm:p-4 bg-black rounded-full text-[#8b0000] group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(139,0,0,0.5)] transition-all duration-300 relative z-10 border border-[#333] group-hover:border-[#8b0000]/50">
            <Sword size={28} className="sm:w-8 sm:h-8" />
          </div>
          <h3 className="font-bold font-serif text-base sm:text-lg text-white relative z-10 group-hover:text-[#8b0000] transition-colors">Manajemen Aset</h3>
          <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors relative z-10">Tugaskan pekerja ke tambang, ladang, dan klaim hasil produksi.</p>
        </a>

        <a href="/sect" className="group relative bg-[#111] border border-[#333] p-5 sm:p-6 rounded-lg hover:border-[#1f402e] hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(31,64,46,0.1)] transition-all duration-300 flex flex-col items-center text-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-green-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="p-3 sm:p-4 bg-black rounded-full text-green-600 group-hover:text-green-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(31,64,46,0.4)] transition-all duration-300 relative z-10 border border-[#333] group-hover:border-green-800">
            <Users size={28} className="sm:w-8 sm:h-8" />
          </div>
          <h3 className="font-bold font-serif text-base sm:text-lg text-white relative z-10 group-hover:text-green-500 transition-colors">Balai Sekte</h3>
          <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors relative z-10">Pusat logistik dan komunikasi bagi anggota sekte Anda.</p>
        </a>

        <a href="/pet" className="group relative bg-[#111] border border-[#333] p-5 sm:p-6 rounded-lg hover:border-blue-900 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(30,58,138,0.1)] transition-all duration-300 flex flex-col items-center text-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="p-3 sm:p-4 bg-black rounded-full text-blue-600 group-hover:text-blue-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(30,58,138,0.4)] transition-all duration-300 relative z-10 border border-[#333] group-hover:border-blue-900">
            <Footprints size={28} className="sm:w-8 sm:h-8" />
          </div>
          <h3 className="font-bold font-serif text-base sm:text-lg text-white relative z-10 group-hover:text-blue-400 transition-colors">Pet Spiritual</h3>
          <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors relative z-10">Rawat, beri makan, dan ikuti battle dengan pet spiritualmu.</p>
        </a>
      </section>

      {/* Transfer Modal */}
      <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transfer Saldo" maxWidth="sm">
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nama Karakter Penerima</label>
                  <input
                      type="text"
                      placeholder="Masukkan Nama Karakter Penerima"
                      value={transferTargetName}
                      onChange={(e) => setTransferTargetName(e.target.value)}
                      className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
                  />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mata Uang</label>
                      <select
                          value={transferCurrencyType}
                          onChange={(e) => setTransferCurrencyType(e.target.value)}
                          className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm appearance-none"
                      >
                          <option value="silver">Silver 🥈</option>
                          <option value="gold">Gold 🥇</option>
                          <option value="jade">Jade 💎</option>
                          <option value="spirit">Spirit 🔮</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Jumlah</label>
                      <input
                          type="number"
                          min="1"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(parseInt(e.target.value) || 0)}
                          className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
                      />
                  </div>
              </div>
              <Button
                  onClick={handleTransfer}
                  disabled={actionLoading || !transferTargetName || transferAmount <= 0}
                  className="w-full bg-[#1e3a5f] hover:bg-blue-900 mt-2"
              >
                  {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}
                  Kirim Transfer
              </Button>
          </div>
      </Modal>

      {/* Loot Modal */}
      <Modal isOpen={lootModalOpen} onClose={() => setLootModalOpen(false)} title="Harta Peninggalan (Loot)" maxWidth="md">
          <div className="space-y-4">
              <p className="text-sm text-gray-300">Ada beberapa pendekar gugur yang meninggalkan hartanya untukmu.</p>
              {availableLoots.map(pool => (
                  <div key={pool._id} className="bg-black/40 border border-[#333] p-4 rounded-lg flex flex-wrap sm:flex-nowrap justify-between items-center gap-4">
                      <div>
                          <h4 className="font-bold text-red-400 mb-1">Mendiang: {pool.deceasedCharacterName}</h4>
                          <p className="text-xs text-gray-400">
                             Berisi {pool.inventory?.length || 0} Item, {pool.pets?.length || 0} Pet.
                          </p>
                      </div>
                      <Button
                         variant="destructive"
                         size="sm"
                         disabled={actionLoading}
                         onClick={() => handleClaimLoot(pool._id)}
                      >
                         {actionLoading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Sparkles size={14} className="mr-1" />}
                         Ambil Loot
                      </Button>
                  </div>
              ))}
          </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title="Riwayat Transaksi" maxWidth="md">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                      Belum ada riwayat transaksi.
                  </div>
              ) : (
                  transactions.map(tx => (
                      <div key={tx._id} className="bg-black/40 border border-[#333] p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">{new Date(tx.createdAt).toLocaleString('id-ID')}</p>
                          <p className="text-sm text-gray-300">{tx.description}</p>
                      </div>
                  ))
              )}
          </div>
      </Modal>

    </div>
  );
}
