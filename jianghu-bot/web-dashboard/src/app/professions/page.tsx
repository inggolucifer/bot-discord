
"use client";

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { getPlayerFromProfileResponse } from '@/lib/profileHelper';
import React, { useState, useEffect, useMemo } from 'react';

type PlayerData = any;

const PROFESSIONS = [
    { id: 'farming', name: 'Bertani', icon: '🌾', desc: 'Tanam dan panen material alam.' },
    { id: 'fishing', name: 'Memancing', icon: '🎣', desc: 'Tangkap ikan eksotis dari sungai.' },
    { id: 'cooking', name: 'Memasak', icon: '🍳', desc: 'Olah bahan mentah jadi makanan bergizi.' },
    { id: 'alchemy', name: 'Alkimia', icon: '⚗️', desc: 'Racik pil kultivasi tingkat tinggi.' },
    { id: 'smithing', name: 'Menempa', icon: '🔨', desc: 'Tempa logam jadi senjata dan alat kuat.' },
];

export default function ProfessionsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isGuideOpen, setIsGuideOpen] = useState<boolean | null>(null);

    const { data: profileRaw, isLoading } = useQuery<PlayerData>({
        queryKey: ['profile'],
        queryFn: () => api.get('/player/profile').then(res => res.data),
    });

    const unlockMutation = useMutation({
        mutationFn: (prof: string) => api.post('/professions/unlock', { profession: prof }),
        onSuccess: (data) => {
            if (data.data?.professions) {
                queryClient.setQueryData(['profile'], (oldData: any) => {
                    if (!oldData) return oldData;
                    if (oldData.data) {
                        return { ...oldData, data: { ...oldData.data, professions: data.data.professions } };
                    }
                    return { ...oldData, professions: data.data.professions };
                });
            }
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal membuka profesi.');
        }
    });

    const player = getPlayerFromProfileResponse(profileRaw);
    const playerProfs = player?.professions || {};

    const unlockedCount = useMemo(() => {
        let count = 0;
        for (const p of PROFESSIONS) {
            if (playerProfs[p.id]?.isUnlocked) count++;
        }
        return count;
    }, [playerProfs]);

    useEffect(() => {
        if (isGuideOpen === null && !isLoading) {
            setIsGuideOpen(unlockedCount < 2);
        }
    }, [unlockedCount, isLoading, isGuideOpen]);

    // Timer for counting ready plots if farming unlocked
    const [currentTime, setCurrentTime] = useState(new Date().getTime());
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date().getTime());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const farmStats = useMemo(() => {
        let readyCount = 0;
        let growingCount = 0;
        let depletedCount = 0;
        let emptyCount = 0;

        if (playerProfs.farming?.farmPlots) {
            const now = currentTime;
            playerProfs.farming.farmPlots.forEach((plot: any) => {
                if (plot.isDepleted && plot.depletedUntil) {
                    if (now < new Date(plot.depletedUntil).getTime()) {
                        depletedCount++;
                    } else {
                        emptyCount++;
                    }
                } else if (plot.cropId && plot.harvestAt) {
                    if (now < new Date(plot.harvestAt).getTime()) {
                        growingCount++;
                    } else {
                        readyCount++;
                    }
                } else {
                    emptyCount++;
                }
            });
        }
        return { readyCount, growingCount, depletedCount, emptyCount };
    }, [playerProfs.farming?.farmPlots, currentTime]);

    if (isLoading || !profileRaw) return <div className="p-8 text-center text-white">Memuat...</div>;

    const hasTool = (player?.inventory || []).some((item: any) => item.itemId?.toolType && (item.durability == null || item.durability > 0));

    return (
        <div className="container mx-auto p-4 max-w-6xl text-gray-100">
            <h1 className="text-3xl font-bold mb-6 text-amber-500 tracking-wider">Sistem Profesi & Kemahiran</h1>

            {playerProfs.farming?.isUnlocked && farmStats.readyCount > 0 && (
                <div className="mb-6 p-4 bg-green-900/40 border border-green-500 rounded-lg flex items-center justify-between shadow-lg shadow-green-900/20">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🌾</span>
                        <div>
                            <h3 className="text-xl font-bold text-green-400">Ada {farmStats.readyCount} plot siap panen!</h3>
                            <p className="text-sm text-green-200">Hasil panenmu sudah menunggu untuk diambil.</p>
                        </div>
                    </div>
                    <button onClick={() => router.push('/professions/farming')} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg transition-colors">
                        Panen Sekarang
                    </button>
                </div>
            )}

            {playerProfs.farming?.isUnlocked && farmStats.readyCount === 0 && farmStats.growingCount > 0 && (
                <div className="mb-6 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg flex items-center gap-3">
                    <span className="text-xl">🌱</span>
                    <span className="text-blue-200">{farmStats.growingCount} plot sedang tumbuh...</span>
                </div>
            )}

            <div className="mb-6 bg-gray-900 border border-amber-600/50 rounded-lg overflow-hidden">
                <button
                    onClick={() => setIsGuideOpen(!isGuideOpen)}
                    className="w-full flex justify-between items-center p-4 bg-amber-900/30 hover:bg-amber-900/50 transition-colors"
                >
                    <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                        <span>🔰</span> Panduan Pemula: Memulai Profesi
                    </h2>
                    <span className="text-amber-500">{isGuideOpen ? '▼' : '▲'}</span>
                </button>

                {isGuideOpen && (
                    <div className="p-5 border-t border-amber-900/30 text-gray-300">
                        <p className="mb-4">Ikuti langkah-langkah berikut untuk memulai karir profesimu di Jianghu:</p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs mt-0.5 ${unlockedCount > 0 ? 'bg-green-900 border-green-500 text-green-400' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>{unlockedCount > 0 ? '✓' : '1'}</span>
                                <div>
                                    <strong className="block text-white">Buka minimal 1 profesi</strong>
                                    <span className="text-sm text-gray-400">Klik tombol "Buka (50 Silver)" pada kartu profesi di bawah.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs mt-0.5 ${hasTool ? 'bg-green-900 border-green-500 text-green-400' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>{hasTool ? '✓' : '2'}</span>
                                <div>
                                    <strong className="block text-white">Siapkan Tool T1</strong>
                                    <span className="text-sm text-gray-400">Pastikan kamu memiliki setidaknya 1 tool (seperti Cangkul) dengan durabilitas &gt; 0 di Inventory. Beli di Market jika perlu.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs text-gray-400 mt-0.5">3</span>
                                <div>
                                    <strong className="block text-white">Farming: Tanam → Tunggu → Panen</strong>
                                    <span className="text-sm text-gray-400">Bertani tidak instan! Tanam bibit, tunggu countdown selesai, baru kamu bisa memanennya.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs text-gray-400 mt-0.5">4</span>
                                <div>
                                    <strong className="block text-white">Gunakan Pupuk dengan Bijak</strong>
                                    <span className="text-sm text-gray-400">Pupuk hanya bisa digunakan saat plot dalam status GROWING untuk mempercepat waktu panen.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs text-gray-400 mt-0.5">5</span>
                                <div>
                                    <strong className="block text-white">Resep Blueprint</strong>
                                    <span className="text-sm text-gray-400">Beberapa resep (ikon 🔒) membutuhkan Blueprint. Pelajari Blueprint dari inventory terlebih dahulu sebelum bisa di-craft.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            <div className="bg-gray-800 p-4 rounded mb-6 border border-gray-700">
                <p>Energy: <span className="text-amber-400 font-bold">{player?.energy?.current || 100}</span> / 100</p>
                <p className="text-sm text-gray-400">Setiap minigame / aktivitas profesi membutuhkan Energy.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROFESSIONS.map((prof) => {
                    const isUnlocked = playerProfs[prof.id]?.isUnlocked;
                    const level = playerProfs[prof.id]?.level || 1;
                    const exp = playerProfs[prof.id]?.exp || 0;
                    const maxExp = Math.floor(50 * level + 15 * level * level);

                    return (
                        <motion.div
                            key={prof.id}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => {
                                if (isUnlocked) {
                                    router.push(`/professions/${prof.id}`);
                                }
                            }}
                            className={`bg-gray-800/80 border p-6 rounded-lg shadow-lg relative overflow-hidden ${isUnlocked ? 'border-amber-500/50 cursor-pointer hover:border-amber-400' : 'border-gray-700'}`}
                        >
                            {!isUnlocked && (
                                <div className="absolute top-2 right-2 bg-gray-900/80 px-2 py-1 rounded text-xs text-gray-500 font-bold border border-gray-700">
                                    LOCKED
                                </div>
                            )}
                            {isUnlocked && (
                                <div className="absolute top-2 right-2 bg-amber-900/40 px-2 py-1 rounded text-xs text-amber-400 font-bold border border-amber-500/30">
                                    UNLOCKED
                                </div>
                            )}
                            <div className="text-4xl mb-4">{prof.icon}</div>
                            <h2 className="text-xl font-bold text-white mb-2">{prof.name}</h2>
                            <p className="text-sm text-gray-400 mb-4">{prof.desc}</p>

                            {isUnlocked === true ? (
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-bold text-amber-200">Level {level}</span>
                                        <span className="text-gray-400">{exp} / {maxExp} EXP</span>
                                    </div>
                                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, (exp/maxExp)*100)}%` }}></div>
                                    </div>
                                    <div className="mt-4 text-center text-amber-400 text-sm font-bold">
                                        Masuk Halaman {prof.name} &rarr;
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            unlockMutation.mutate(prof.id);
                                        }}
                                        disabled={unlockMutation.isPending}
                                        className="w-full bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white border border-amber-600/50 py-2 rounded transition disabled:opacity-50"
                                    >
                                        {unlockMutation.isPending ? 'Membuka...' : 'Buka (50 Silver)'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </div>
        </div>
    );
}
