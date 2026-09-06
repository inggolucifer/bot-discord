"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import FishingMinigame from './components/FishingMinigame';
import SmithingMinigame from './components/SmithingMinigame';

// Mock types since we don't have full definitions here
type PlayerData = any;

const PROFESSIONS = [
    { id: 'farming', name: 'Bertani', icon: '🌾', desc: 'Tanam dan panen material alam.', component: 'default' },
    { id: 'fishing', name: 'Memancing', icon: '🎣', desc: 'Tangkap ikan eksotis dari sungai.', component: 'fishing' },
    { id: 'cooking', name: 'Memasak', icon: '🍳', desc: 'Olah bahan mentah jadi makanan bergizi.', component: 'default' },
    { id: 'alchemy', name: 'Alkimia', icon: '⚗️', desc: 'Racik pil kultivasi tingkat tinggi.', component: 'default' },
    { id: 'smithing', name: 'Menempa', icon: '🔨', desc: 'Tempa logam jadi senjata dan alat kuat.', component: 'smithing' },
];

export default function ProfessionsPage() {
    const queryClient = useQueryClient();
    const [selectedProf, setSelectedProf] = useState<any>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [recipeId, setRecipeId] = useState<string>(''); // Needs to be selected in real app
    const [toolItemId, setToolItemId] = useState<string>(''); // Needs to be selected from inventory in real app

    const { data: profile, isLoading } = useQuery<PlayerData>({
        queryKey: ['profile'],
        queryFn: () => api.get('/player/profile').then(res => res.data),
    });

    const unlockMutation = useMutation({
        mutationFn: (prof: string) => api.post('/professions/unlock', { profession: prof }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            alert('Profesi berhasil dibuka!');
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal membuka profesi.');
        }
    });

    const startMutation = useMutation({
        mutationFn: (data: { profession: string, recipeId: string, toolItemId: string }) => api.post('/professions/start', data),
        onSuccess: (data) => {
            setActiveSessionId(data.data.sessionId);
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal memulai minigame. Pastikan energi dan material cukup.');
            setSelectedProf(null);
        }
    });

    const completeMutation = useMutation({
        mutationFn: (data: { sessionId: string, telemetryData: any }) => api.post('/professions/complete', data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            const d = res.data;
            if (d.success) {
                if (d.isMasterpiece) {
                    alert(`🌟 MASTERPIECE! Kualitas: ${d.quality}x\n${d.message}`);
                } else {
                    alert(`Sukses! Kualitas: ${d.quality}x\n${d.message}`);
                }
            } else {
                alert(`Gagal...\n${d.message}`);
            }
            if (d.toolBroken) {
                alert("Alatmu telah hancur!");
            }
            setSelectedProf(null);
            setActiveSessionId(null);
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal menyelesaikan minigame.');
            setSelectedProf(null);
            setActiveSessionId(null);
        }
    });

    if (isLoading || !profile) return <div className="p-8 text-center text-white">Memuat...</div>;

    const playerProfs = profile.professions || {};

    // Helper to start the game (mocking recipe and tool selection for now since UI for that is complex)
    const handleStartClick = (prof: any) => {
        // In a real app, open a modal to select Recipe and Tool.
        // For testing, we will just set the prof and expect the user to have valid items.
        // But since we need to send recipeId and toolItemId to start:
        // We'll prompt for them or just open a mock interface.
        setSelectedProf(prof);
    };

    const handleConfirmStart = () => {
        if (!recipeId || !toolItemId) {
            alert("Harap isi Recipe ID dan Tool Item ID (ObjectId Mongoose)");
            return;
        }
        startMutation.mutate({ profession: selectedProf.id, recipeId, toolItemId });
    };

    const handleMinigameComplete = (score: number, telemetry: any) => {
        if (activeSessionId) {
            completeMutation.mutate({ sessionId: activeSessionId, telemetryData: telemetry });
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-6xl text-gray-100">
            <h1 className="text-3xl font-bold mb-6 text-amber-500 tracking-wider">Sistem Profesi & Kemahiran</h1>

            <div className="bg-gray-800 p-4 rounded mb-6 border border-gray-700">
                <p>Energy: <span className="text-amber-400 font-bold">{profile.energy?.current || 100}</span> / 100</p>
                <p className="text-sm text-gray-400">Setiap minigame membutuhkan 10 Energy.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROFESSIONS.map((prof) => {
                    const isUnlocked = playerProfs[prof.id]?.isUnlocked;
                    const level = playerProfs[prof.id]?.level || 1;
                    const exp = playerProfs[prof.id]?.exp || 0;
                    const maxExp = level * 100;

                    return (
                        <motion.div
                            key={prof.id}
                            whileHover={{ scale: 1.02 }}
                            className="bg-gray-800/80 border border-gray-700 p-6 rounded-lg shadow-lg relative overflow-hidden"
                        >
                            <div className="text-4xl mb-4">{prof.icon}</div>
                            <h2 className="text-xl font-bold text-white mb-2">{prof.name}</h2>
                            <p className="text-sm text-gray-400 mb-4">{prof.desc}</p>

                            {isUnlocked ? (
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Level {level}</span>
                                        <span>{exp} / {maxExp} EXP</span>
                                    </div>
                                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-amber-500 h-full" style={{ width: `${(exp/maxExp)*100}%` }}></div>
                                    </div>
                                    <button
                                        onClick={() => handleStartClick(prof)}
                                        className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition"
                                    >
                                        Mulai {prof.name}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <button
                                        onClick={() => unlockMutation.mutate(prof.id)}
                                        disabled={unlockMutation.isPending}
                                        className="w-full bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white border border-amber-600/50 py-2 rounded transition"
                                    >
                                        Buka (50 Silver)
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Preparation / Minigame Modal */}
            <AnimatePresence>
            {selectedProf && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
                >
                    <div className="bg-gray-900 border border-amber-500/50 p-8 rounded-xl max-w-2xl w-full shadow-2xl">
                        {!activeSessionId ? (
                            // Pre-game selection form (Mock for this test task)
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-amber-500">Persiapan: {selectedProf.name}</h2>
                                <p className="mb-4 text-gray-300">Pilih resep dan alat (Simulasi). Pastikan Anda memiliki alat dan material di inventory!</p>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Nama Resep (e.g. Besi Murni, Ikan Segar Dasar)</label>
                                        <input
                                            type="text"
                                            value={recipeId}
                                            onChange={e => setRecipeId(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                                            placeholder="Masukkan nama resep"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Tool Item ID (Dari inventory Mongoose)</label>
                                        <input
                                            type="text"
                                            value={toolItemId}
                                            onChange={e => setToolItemId(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                                            placeholder="Masukkan ObjectId alat"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4">
                                    <button
                                        onClick={() => setSelectedProf(null)}
                                        className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleConfirmStart}
                                        disabled={startMutation.isPending}
                                        className="px-6 py-2 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold transition"
                                    >
                                        {startMutation.isPending ? 'Memulai...' : 'Mulai (-10 Energy)'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Active Minigame Area
                            <div>
                                {selectedProf.component === 'fishing' && (
                                    <FishingMinigame
                                        onComplete={handleMinigameComplete}
                                        onCancel={() => { setSelectedProf(null); setActiveSessionId(null); }}
                                    />
                                )}
                                {selectedProf.component === 'smithing' && (
                                    <SmithingMinigame
                                        onComplete={handleMinigameComplete}
                                        onCancel={() => { setSelectedProf(null); setActiveSessionId(null); }}
                                    />
                                )}
                                {selectedProf.component === 'default' && (
                                    <div className="text-center py-12">
                                        <h3 className="text-2xl text-amber-500 font-bold mb-4">Minigame Sedang Berjalan...</h3>
                                        <p className="text-gray-400 mb-8">Kerjakan tugas dengan cepat!</p>
                                        <button
                                            onClick={() => handleMinigameComplete(100, { accuracy: 0.8, type: 'default' })}
                                            className="px-6 py-3 rounded bg-green-600 hover:bg-green-500 text-white font-bold transition mx-2"
                                        >
                                            Selesaikan Tugas
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}
