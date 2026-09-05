"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookOpen, Shield, Wind, Droplet, Flame, Mountain, Zap, Sun, Moon, Skull, HeartPulse, RefreshCw, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { useRouter } from 'next/navigation';

export default function SkillsClient() {
    const { token } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'error'|'success', text: string} | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [isLearnModalOpen, setIsLearnModalOpen] = useState(false);
  const [selectedLawToLearn, setSelectedLawToLearn] = useState<any>(null);


  const handleLearnLaw = async () => {
    if (!selectedLawToLearn) return;
    setActionLoading(true);
    try {
      await api.post('/player/laws/learn', { lawId: selectedLawToLearn._id });
      alert('Berhasil mempelajari Hukum Alam.');
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      setIsLearnModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal mempelajari Hukum Alam.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetLaw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmation !== 'RESET LAW') {
      alert('Ketik RESET LAW untuk mengkonfirmasi.');
      return;
    }
    setActionLoading(true);
    try {
      const invRes = await api.get('/inventory');
      const inv = invRes.data.data;
      const resetItem = inv.find((i: any) => i.name === 'Teratai Kelahiran Kembali');

      if (!resetItem) {
        alert('Kamu tidak memiliki item Teratai Kelahiran Kembali.');
        setActionLoading(false);
        return;
      }

      await api.post('/player/laws/reset', { itemName: resetItem.name });
      alert('Berhasil mereset Hukum Alam.');
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      setIsResetModalOpen(false);
      setResetConfirmation('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal mereset Hukum Alam.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComprehend = async (manualId: string) => {
    setActionLoading(true);
    try {
      await api.post('/player/skills/comprehend', { manualId });
      setMessage({ type: 'success', text: 'Berhasil memulai comprehend.' });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Gagal comprehend.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = async (manualId: string) => {
    setActionLoading(true);
    try {
      await api.post('/player/skills/upgrade', { manualId });
      setMessage({ type: 'success', text: 'Berhasil upgrade level manual.' });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Gagal upgrade manual.' });
    } finally {
      setActionLoading(false);
    }
  };


    useEffect(() => {
        if (!token) {
            router.push('/auth/login');
        }
    }, [token]);

    const { data: rawProfile, isLoading } = useQuery({
        queryKey: ['playerProfile'],
        queryFn: async () => {
            const { data } = await api.get('/player/profile');
            return data;
        },
        enabled: !!token
    });

    const { data: rawLaws } = useQuery({
        queryKey: ['availableLaws'],
        queryFn: async () => {
            const { data } = await api.get('/player/laws');
            return data.data;
        },
        enabled: !!token
    });

    const profile = rawProfile?.data || rawProfile;

    if (loading || isLoading) return <LoadingState text="Memuat Kitab & Hukum Alam..." />;

    if (!profile) return <EmptyState title="Gagal Memuat" description="Tidak dapat memuat data skill." icon={<BookOpen size={48} />} />;


    const { laws = [], manuals = [] } = profile;
    const isMortal = profile.realm === 'Mortal' || profile.systemCultivation?.realm === 'Fondasi Fana (Mortal Foundation)';

    const getElementIcon = (element: string) => {
        switch (element?.toLowerCase()) {
            case 'api': return <Flame size={16} className="text-red-500" />;
            case 'air': return <Droplet size={16} className="text-blue-500" />;
            case 'angin': return <Wind size={16} className="text-teal-400" />;
            case 'tanah': return <Mountain size={16} className="text-yellow-700" />;
            case 'petir': return <Zap size={16} className="text-purple-400" />;
            case 'cahaya': return <Sun size={16} className="text-yellow-400" />;
            case 'kegelapan': return <Moon size={16} className="text-gray-400" />;
            default: return <Shield size={16} className="text-gray-500" />;
        }
    };

    const getEffectIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'damage': return <Flame size={16} className="text-red-500 mr-1" />;
            case 'lifesteal': return <HeartPulse size={16} className="text-pink-500 mr-1" />;
            case 'stun': return <Zap size={16} className="text-yellow-400 mr-1" />;
            case 'poison': return <Skull size={16} className="text-green-500 mr-1" />;
            case 'shield': return <Shield size={16} className="text-blue-400 mr-1" />;
            case 'reflect': return <RefreshCw size={16} className="text-purple-400 mr-1" />;
            case 'cleanse': return <Wind size={16} className="text-teal-400 mr-1" />;
            default: return <BookOpen size={16} className="text-gray-400 mr-1" />;
        }
    };

    const formatEffectType = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'damage': return 'Serangan';
            case 'lifesteal': return 'Lifesteal';
            case 'stun': return 'Stun';
            case 'poison': return 'Racun (DoT)';
            case 'shield': return 'Perisai Qi';
            case 'reflect': return 'Refleksi Serangan';
            case 'cleanse': return 'Pembersih Debuff';
            default: return type || 'Pasif';
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Kitab & Hukum Alam"
                description="Koleksi jurus, manual, dan pemahaman hukum alam semesta yang kamu miliki."
            />

            {/* Laws Section */}
            <section>
                <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                    <Wind className="text-teal-400" size={24} />
                    <h2 className="text-2xl font-serif font-bold text-white">Pemahaman Hukum Alam</h2>

            <Modal isOpen={isLearnModalOpen} onClose={() => setIsLearnModalOpen(false)} title="Konfirmasi Pelajari Hukum Alam">
                <div className="space-y-4 text-gray-300">
                    <p>Apakah kamu yakin ingin mengikat takdirmu dengan <strong>{selectedLawToLearn?.name}</strong>?</p>
                    <p className="text-sm text-orange-400">Peringatan: Jiwa fanamu hanya bisa menampung SATU Hukum Alam. Pilihan ini akan memengaruhi seluruh perjalanan kultivasimu.</p>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={() => setIsLearnModalOpen(false)}>Batal</Button>
                        <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleLearnLaw} disabled={actionLoading}>Pelajari</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Peringatan Bahaya: Reset Hukum Alam">
                <form onSubmit={handleResetLaw} className="space-y-4 text-gray-300">
                    <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex gap-3">
                        <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-red-400 mb-1">Tindakan Permanen</h4>
                            <p className="text-sm text-gray-300">
                                Mereset Hukum Alam akan menghapus ikatanmu saat ini dan mengkonsumsi 1x <strong className="text-white">Teratai Kelahiran Kembali</strong> dari inventory.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm mb-2 text-gray-400">Ketik <strong>RESET LAW</strong> untuk melanjutkan:</label>
                        <input
                            type="text"
                            value={resetConfirmation}
                            onChange={(e) => setResetConfirmation(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-md p-2 text-white"
                            placeholder="RESET LAW"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsResetModalOpen(false)}>Batal</Button>
                        <Button type="submit" variant="destructive" disabled={actionLoading || resetConfirmation !== 'RESET LAW'}>Eksekusi Reset</Button>
                    </div>
                </form>
            </Modal>

            <ToastContainer />
        </div>

                {laws.length === 0 ? (
                    <EmptyState title="Belum Memahami Hukum Alam" description="Kamu belum memahami satupun hukum alam semesta. Cari peluang pencerahan!" icon={<Wind size={40} />} className="py-6" />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {laws.map((law: any) => (
                            <motion.div key={law._id} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
                              <Card className="bg-gradient-to-br from-[#111] to-[#1a1a1a] border-[#c5a880]/30 hover:border-[#c5a880] transition-colors relative overflow-hidden group h-full">
                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <CardContent className="p-5 relative z-10">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-lg font-bold text-[#c5a880] flex items-center gap-2">
                                            {getElementIcon(law.element)}
                                            {law.name}
                                        </h3>
                                        <Badge variant="outline" className="text-xs">{law.element || 'Netral'}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 line-clamp-3">{law.description || 'Tidak ada deskripsi.'}</p>
                                    <div className="bg-black/40 p-3 rounded border border-[#333] text-xs space-y-1">
                                        <div className="text-gray-300 font-semibold mb-1 border-b border-[#444] pb-1">Bonus Atribut:</div>
                                        {law.multiplierBonus?.hp > 0 && <div>+{(law.multiplierBonus.hp * 100).toFixed(0)}% HP</div>}
                                        {law.multiplierBonus?.atk > 0 && <div>+{(law.multiplierBonus.atk * 100).toFixed(0)}% Attack</div>}
                                        {law.multiplierBonus?.def > 0 && <div>+{(law.multiplierBonus.def * 100).toFixed(0)}% Defense</div>}
                                        {law.multiplierBonus?.spd > 0 && <div>+{(law.multiplierBonus.spd * 100).toFixed(0)}% Speed</div>}
                                        {(!law.multiplierBonus || Object.values(law.multiplierBonus).every((v: any) => v === 0)) && <div className="text-gray-500 italic">Pasif tersembunyi.</div>}
                                    </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* Manuals Section */}
            <section>
                <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                    <BookOpen className="text-[#c5a880]" size={24} />
                    <h2 className="text-2xl font-serif font-bold text-white">Jurus & Manual</h2>
                </div>

                {manuals.length === 0 ? (
                    <EmptyState title="Tidak Ada Jurus" description="Kamu belum mempelajari satupun jurus bela diri." icon={<BookOpen size={40} />} className="py-6" />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {manuals.map((m: any) => (
                            <motion.div key={m.id} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
                              <Card className="bg-[#111] border-[#333] hover:border-[#c5a880]/50 transition-colors h-full">
                                <CardContent className="p-5 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-white">{m.name}</h3>
                                        <Badge variant="default" className="text-xs">Level {m.level} / {m.maxLevel}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 flex-grow">{m.description || 'Kitab kuno.'}</p>

                                    <div className="mt-auto pt-4 border-t border-[#333]">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Efek Jurus dalam Pertarungan</h4>
                                        <div className="flex items-center justify-between bg-black/50 border border-[#222] rounded p-3">
                                            <div className="flex items-center">
                                                {getEffectIcon(m.effectType)}
                                                <span className="text-sm font-medium text-gray-200">{formatEffectType(m.effectType)}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400">Peluang Aktif</div>
                                                <div className="text-sm font-bold text-yellow-500">{(m.triggerChance * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                      {m.isComprehending ? (
                                        <div className="flex flex-col gap-2 border-t border-gray-700/50 pt-3">
                                          <p className="text-xs text-blue-400 flex items-center justify-center gap-1"><RefreshCw size={12} className="animate-spin" /> Sedang Comprehend</p>
                                          <Button size="sm" variant="outline" className="w-full border-[#c5a880] text-[#c5a880] hover:bg-[#c5a880]/10" disabled={actionLoading} onClick={() => handleUpgrade(m.manualId)}>Selesaikan (Upgrade)</Button>
                                        </div>
                                      ) : (
                                        <div className="border-t border-gray-700/50 pt-3">
                                          <Button size="sm" variant="outline" className="w-full border-blue-500 text-blue-500 hover:bg-blue-500/10" disabled={actionLoading || m.level >= m.maxLevel} onClick={() => handleComprehend(m.manualId)}>{m.level >= m.maxLevel ? 'Level Maksimal' : 'Comprehend'}</Button>
                                        </div>
                                      )}
                                    </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
