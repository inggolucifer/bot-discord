"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

// Mock types since we don't have full definitions here
type PlayerData = any;

const PROFESSIONS = [
    { id: 'farming', name: 'Bertani', icon: '🌾', desc: 'Tanam dan panen material alam.' },
    { id: 'fishing', name: 'Memancing', icon: '🎣', desc: 'Tangkap ikan eksotis dari sungai.' },
    { id: 'cooking', name: 'Memasak', icon: '🍳', desc: 'Olah bahan mentah jadi makanan bergizi.' },
    { id: 'alchemy', name: 'Alkimia', icon: '⚗️', desc: 'Racik pil kultivasi tingkat tinggi.' },
    { id: 'smithing', name: 'Menempa', icon: '🔨', desc: 'Tempa logam jadi senjata dan alat kuat.' },
];

export default function ProfessionsPage() {
    const queryClient = useQueryClient();
    const [selectedProf, setSelectedProf] = useState<string | null>(null);

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

    if (isLoading || !profile) return <div className="p-8 text-center text-white">Memuat...</div>;

    const playerProfs = profile.professions || {};

    return (
        <div className="container mx-auto p-4 max-w-6xl text-gray-100">
            <h1 className="text-3xl font-bold mb-6 text-amber-500 tracking-wider">Sistem Profesi & Kemahiran</h1>

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
                                        onClick={() => setSelectedProf(prof.id)}
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

            {/* Minigame Modal Placeholder */}
            {selectedProf && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 border border-amber-500/30 p-6 rounded-xl max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-4 text-amber-500">Minigame: {selectedProf}</h2>
                        <p className="text-gray-300 mb-6">
                            Area ini akan diisi dengan UI minigame interaktif (misalnya bar tension, klik tepat waktu, dll)
                            menggunakan framer-motion untuk animasi yang halus.
                        </p>

                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setSelectedProf(null)}
                                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={() => {
                                    alert('Simulasi menang!');
                                    setSelectedProf(null);
                                }}
                                className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold transition"
                            >
                                Simulasi Menang (Skor 80)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
