
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { motion } from 'framer-motion';

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

    const { data: profile, isLoading } = useQuery<PlayerData>({
        queryKey: ['profile'],
        queryFn: () => api.get('/player/profile').then(res => res.data),
    });

    const unlockMutation = useMutation({
        mutationFn: (prof: string) => api.post('/professions/unlock', { profession: prof }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
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
                            onClick={() => {
                                if (isUnlocked) {
                                    router.push(`/professions/${prof.id}`);
                                }
                            }}
                            className={`bg-gray-800/80 border border-gray-700 p-6 rounded-lg shadow-lg relative overflow-hidden ${isUnlocked ? 'cursor-pointer hover:border-amber-500' : ''}`}
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
                                    <div className="mt-4 text-center text-amber-400 text-sm font-bold">
                                        Masuk Halaman {prof.name} &rarr;
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            unlockMutation.mutate(prof.id);
                                        }}
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
        </div>
    );
}
