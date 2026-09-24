"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import BreakthroughAnimation from '@/components/BreakthroughAnimation';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Flame, ArrowUpCircle, Loader2, Sparkles, Trophy, Swords, Moon, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CultivationData, BreakthroughResponse } from '@/lib/schemas';
import { AxiosError } from 'axios';
import LawCultivationTab from '@/components/cultivation/LawCultivationTab';
import DailyHubModal from '@/components/cultivation/DailyHubModal';
import WorldBossModal from '@/components/cultivation/WorldBossModal';
import SectArenaModal from '@/components/cultivation/SectArenaModal';
import CelestialCalendarModal from '@/components/cultivation/CelestialCalendarModal';

export default function CultivationClient() {
    const { token } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Navigasi Sub-Tab Utama (Ranah vs Hukum Semesta)
    const [mainTab, setMainTab] = useState<'realm' | 'law'>('realm');

    // Modals Event & Hub
    const [dailyHubOpen, setDailyHubOpen] = useState(false);
    const [worldBossOpen, setWorldBossOpen] = useState(false);
    const [sectArenaOpen, setSectArenaOpen] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);

    const [breakthroughModalOpen, setBreakthroughModalOpen] = useState(false);
    const [showBreakthroughAnim, setShowBreakthroughAnim] = useState(false);
    const [breakthroughResult, setBreakthroughResult] = useState<any>(null);
    const [loreWarningText, setLoreWarningText] = useState<string | null>(null);
    const [currentUsePillId, setCurrentUsePillId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('jianghu_token') && !token) {
             // Let middleware/auth logic handle redirect, but basic fallback here
        }
    }, [token]);

    const { data: rawData, isLoading: isCultivationLoading } = useQuery<{data: CultivationData}>({
        queryKey: ['cultivation'],
        queryFn: async () => {
            const { data } = await api.get('/cultivation');
            return data;
        },
        enabled: !!token,
        refetchInterval: 60000 // Poll every minute for smooth Qi updates
    });

    const cultivationData: CultivationData = rawData?.data || (rawData as any);

    const breakthroughMutation = useMutation<BreakthroughResponse, AxiosError<{error: string}>, {pillId: string | null, forceBreakthrough: boolean}>({
        mutationFn: async ({ pillId, forceBreakthrough }) => {
            const { data } = await api.post('/cultivation/breakthrough', { pillId, forceBreakthrough });
            return data;
        },
        onSuccess: (data) => {
            if (data.success) {
                if (data.isSuccess) {
                    toast.show({ message: data.message, type: 'success' });
                    setBreakthroughResult(data);
                    setShowBreakthroughAnim(true);
                } else {
                    toast.show({ message: data.message, type: 'error' });
                }
                setBreakthroughModalOpen(false);
                queryClient.invalidateQueries({ queryKey: ['cultivation'] });
                queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
            }
        },
        onError: (error) => {
            toast.show({ message: error.response?.data?.error || 'Gagal melakukan terobosan.', type: 'error' });
        },
        onSettled: () => {
            setActionLoading(false);
        }
    });

    const handleBreakthrough = (pillId: string | null, forceBreakthrough: boolean = false) => {
        setActionLoading(true);
        setCurrentUsePillId(pillId);
        breakthroughMutation.mutate({ pillId, forceBreakthrough });
    };

    if (loading || isCultivationLoading) return <LoadingState text="Menghubungkan ke Dantian..." />;

    if (!cultivationData) return <EmptyState title="Gagal Memuat" description="Tidak dapat memuat data kultivasi." icon={<Flame size={48} />} />;

    const { realm, stage, currentQi, maxQi, ratePerMinute, isReadyForBreakthrough, baseSuccessRate, isMaxLevel, usablePills, moodCost } = cultivationData;
    const progressPercent = Math.min(100, Math.max(0, (currentQi / maxQi) * 100));

    return (
        <div className="space-y-6">
            <BreakthroughAnimation isVisible={showBreakthroughAnim} onClose={() => { setShowBreakthroughAnim(false); setBreakthroughResult(null); }} />
            <PageHeader
                title="Kultivasi Spiritual & Hukum Semesta"
                description="Pantau perkembangan Qi spiritual, pelajari 15 Hukum Semesta, dan lakukan terobosan tingkat tinggi."
            />

            {/* Ribbon Tombol Aksi Cepat (Event Mingguan & Misi Harian) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-stone-800 bg-stone-950/70 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        onClick={() => setDailyHubOpen(true)}
                        className="bg-amber-600/90 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        ✨ Misi & Pencerahan
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setWorldBossOpen(true)}
                        className="border-red-500/40 text-red-300 hover:bg-red-950/40 text-xs flex items-center gap-1.5"
                    >
                        <Flame className="w-3.5 h-3.5 text-red-400" />
                        🐉 World Boss (Sabtu)
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSectArenaOpen(true)}
                        className="border-amber-500/40 text-amber-300 hover:bg-amber-950/40 text-xs flex items-center gap-1.5"
                    >
                        <Swords className="w-3.5 h-3.5 text-amber-400" />
                        ⚔️ Arena Sekte (Minggu)
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCalendarOpen(true)}
                        className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 text-xs flex items-center gap-1.5"
                    >
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        🌕 Kalender Semesta
                    </Button>
                </div>

                <div className="text-xs text-stone-500 font-mono">
                    Reset Server: 00:00 WIB
                </div>
            </div>

            {/* Sub-Tab Navigation Bar Utama */}
            <div className="flex items-center gap-3 border-b border-stone-800 pb-2">
                <button
                    onClick={() => setMainTab('realm')}
                    className={`px-5 py-2.5 rounded-lg font-serif font-bold text-sm transition-all flex items-center gap-2 ${
                        mainTab === 'realm'
                            ? 'bg-[#1e3a5f] text-white border border-blue-500/50 shadow-lg shadow-blue-900/30'
                            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                    }`}
                >
                    <span>🧘</span> TAB 1: Ranah Karakter (Mortal → Dewa)
                </button>
                <button
                    onClick={() => setMainTab('law')}
                    className={`px-5 py-2.5 rounded-lg font-serif font-bold text-sm transition-all flex items-center gap-2 ${
                        mainTab === 'law'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-lg shadow-amber-500/10'
                            : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                    }`}
                >
                    <span>📜</span> TAB 2: Hukum Semesta (15 Law Framework)
                </button>
            </div>

            {/* KONTEN TAB 2: HUKUM SEMESTA */}
            {mainTab === 'law' && (
                <LawCultivationTab />
            )}

            {/* KONTEN TAB 1: RANAH KARAKTER (REALM EXISTING) */}
            {mainTab === 'realm' && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1 lg:col-span-2 bg-[#111] border-[#c5a880]/30">
                    <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
                        <div className="relative">
                            <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full border-4 border-[#333] flex items-center justify-center relative overflow-hidden bg-black shadow-[0_0_30px_rgba(197,168,128,0.1)]">
                                {/* Water fill effect for Qi */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-blue-500/30 transition-all duration-1000 ease-in-out"
                                    style={{ height: `${progressPercent}%` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#c5a880]/20 to-transparent opacity-50" />
                                <div className="relative z-10 flex flex-col items-center">
                                    <Flame size={48} className="text-[#c5a880] mb-2 animate-pulse" />
                                    <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                                        {Math.floor(currentQi).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-gray-400">/ {maxQi.toLocaleString()} Qi</span>
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-[#1f402e] border border-green-800 rounded-full p-2 text-green-400 text-xs font-bold shadow-lg" title="Qi Generasi">
                                +{ratePerMinute.toFixed(1)}/mnt
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#c5a880] mb-2">{realm}</h2>
                            <p className="text-lg text-gray-300">Tahap {stage}</p>
                            {isMaxLevel && (
                                <p className="text-sm text-yellow-500 mt-2 font-semibold">Puncak Alam Semesta Tercapai!</p>
                            )}
                        </div>

                        <div className="w-full max-w-md mt-4">
                            {!isMaxLevel && (
                                <Button
                                    className="w-full bg-[#1e3a5f] hover:bg-blue-900 border border-blue-800 text-white font-bold py-3 text-lg"
                                    disabled={!isReadyForBreakthrough}
                                    onClick={() => setBreakthroughModalOpen(true)}
                                >
                                    <ArrowUpCircle className="mr-2" />
                                    {isReadyForBreakthrough ? 'Lakukan Terobosan' : 'Qi Belum Mencukupi'}
                                </Button>
                            )}
                            {!isReadyForBreakthrough && !isMaxLevel && (
                                <div className="w-full bg-[#222] rounded-full h-2 mt-4 overflow-hidden border border-[#444]">
                                    <div className="bg-[#c5a880] h-2 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Breakthrough Modal */}
            <Modal
                isOpen={breakthroughModalOpen}
                onClose={() => {
                    if (!actionLoading) {
                        setBreakthroughModalOpen(false);
                        setLoreWarningText(null);
                    }
                }}
                title="Konfirmasi Terobosan"
            >
                <div className="space-y-4">
                    {loreWarningText ? (
                        <div className="bg-red-900/30 border border-red-900/50 p-4 rounded mb-4">
                            <h4 className="text-red-500 font-bold mb-2">⚠️ Peringatan Surgawi</h4>
                            <p className="text-sm text-red-200">{loreWarningText}</p>
                            <div className="flex justify-end mt-4 gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setLoreWarningText(null);
                                        setBreakthroughModalOpen(false);
                                    }}
                                    disabled={actionLoading}
                                >
                                    Batal
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        setLoreWarningText(null);
                                        handleBreakthrough(currentUsePillId, true);
                                    }}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Saya Mengerti, Hancurkan Pondasi'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-300">
                                Kamu akan mencoba menerobos batas ke tingkat selanjutnya. Proses ini memiliki risiko kegagalan jika pondasimu tidak stabil.
                            </p>
                            <div className="bg-black/50 border border-[#333] rounded-lg p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Realm Saat Ini:</span>
                                    <span className="font-bold text-white">{realm} (Tahap {stage})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Biaya Mood:</span>
                                    <span className="font-bold text-rose-400">{moodCost || 25} Mood</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Peluang Sukses Dasar:</span>
                                    <span className="font-bold text-yellow-500">{baseSuccessRate}%</span>
                                </div>
                                <div className="flex justify-between border-t border-[#333] pt-2 mt-2">
                                    <span className="text-gray-300 font-bold">Projected Rate:</span>
                                    <span className="font-bold text-green-400">
                                        {Math.min(100, baseSuccessRate + (currentUsePillId && usablePills ? (usablePills.find(p => p.itemId === currentUsePillId)?.bonusPercent || 0) : 0))}%
                                    </span>
                                </div>
                            </div>

                            {usablePills && usablePills.length > 0 && (
                                <div className="bg-[#111] border border-[#333] rounded-lg p-4 mt-4 space-y-3">
                                    <p className="text-sm text-gray-300 font-bold mb-2">Pilih Pil Terobosan:</p>

                                    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-[#222]">
                                        <input
                                            type="radio"
                                            name="pillSelection"
                                            value="none"
                                            checked={currentUsePillId === null}
                                            onChange={() => setCurrentUsePillId(null)}
                                            className="w-4 h-4 text-yellow-600 bg-gray-800 border-gray-600 focus:ring-yellow-600 focus:ring-2"
                                        />
                                        <span className="text-gray-300">Tanpa Pil</span>
                                    </label>

                                    {usablePills.map(p => {
                                        const totalRate = Math.min(100, baseSuccessRate + p.bonusPercent);
                                        return (
                                        <label key={p.itemId} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-[#222]">
                                            <input
                                                type="radio"
                                                name="pillSelection"
                                                value={p.itemId}
                                                checked={currentUsePillId === p.itemId}
                                                onChange={() => setCurrentUsePillId(p.itemId)}
                                                className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 focus:ring-green-600 focus:ring-2"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-green-400 font-bold">{p.name} (x{p.count})</span>
                                                <span className="text-xs text-green-200">+{p.bonusPercent}% Peluang (Total: {totalRate}%)</span>
                                            </div>
                                        </label>
                                        );
                                    })}
                                </div>
                            )}

                            <p className="text-xs text-red-400 mt-2 text-center bg-red-900/10 p-2 rounded border border-red-900/30">
                                Risiko Gagal: Kehilangan {cultivationData.penaltyPreview ? cultivationData.penaltyPreview.percent : 25}% max Qi ≈ <span className="font-bold">{cultivationData.penaltyPreview ? cultivationData.penaltyPreview.qiAmount.toLocaleString() : Math.floor(maxQi * 0.25).toLocaleString()} Qi</span>
                            </p>

                            <Button
                                onClick={() => handleBreakthrough(currentUsePillId)}
                                disabled={actionLoading}
                                className="w-full bg-[#1e3a5f] hover:bg-blue-900 border border-blue-800 text-white font-bold mt-4"
                            >
                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Lakukan Terobosan'}
                            </Button>
                        </>
                    )}
                </div>
            </Modal>
            </>
            )}

            {/* Modal-modal Event & Hub Baru */}
            <DailyHubModal isOpen={dailyHubOpen} onClose={() => setDailyHubOpen(false)} />
            <WorldBossModal isOpen={worldBossOpen} onClose={() => setWorldBossOpen(false)} />
            <SectArenaModal isOpen={sectArenaOpen} onClose={() => setSectArenaOpen(false)} />
            <CelestialCalendarModal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />
        </div>
    );
}
