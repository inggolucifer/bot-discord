"use client";

import { getPlayerFromProfileResponse } from '@/lib/profileHelper';



import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';

export default function AlchemyPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [recipeId, setRecipeId] = useState('');
    const [toolItemId, setToolItemId] = useState('');
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const { data: profileRaw, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: () => api.get('/player/profile').then(res => res.data),
    });

    const profile = getPlayerFromProfileResponse(profileRaw);

    const startMutation = useMutation({
        mutationFn: (data: { profession: string, recipeId: string, toolItemId: string }) => api.post('/professions/start', data),
        onSuccess: (data) => {
            setActiveSessionId(data.data.sessionId);
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal memulai.');
        }
    });

    const completeMutation = useMutation({
        mutationFn: (data: { sessionId: string, telemetryData: any }) => api.post('/professions/complete', data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
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
            setActiveSessionId(null);
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal menyelesaikan minigame.');
            setActiveSessionId(null);
        }
    });

    if (isLoading || !profile) return <div className="p-8 text-center text-white">Memuat...</div>;

    const handleMinigameComplete = () => {
        if (activeSessionId) {
            completeMutation.mutate({ sessionId: activeSessionId, telemetryData: { accuracy: 0.9 } });
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl text-gray-100">
            <button onClick={() => router.push('/professions')} className="mb-4 text-amber-500 hover:text-amber-400">
                &larr; Kembali ke Profesi
            </button>
            <PageHeader title="Alkimia" description="Racik pil kultivasi tingkat tinggi." />

            {!activeSessionId ? (
                <div className="bg-gray-900 border border-amber-500/50 p-8 rounded-xl shadow-2xl mt-8">
                    <h2 className="text-2xl font-bold mb-4 text-amber-500">Tungku Alkimia</h2>
                    <p className="mb-4 text-gray-300">Pilih resep dan alat (Simulasi).</p>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Nama Resep</label>
                            <input type="text" value={recipeId} onChange={e => setRecipeId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" placeholder="Pil Pemulih Qi Dasar" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tool Item ID</label>
                            <input type="text" value={toolItemId} onChange={e => setToolItemId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" placeholder="ObjectId Kuali Alkimia" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button onClick={() => startMutation.mutate({ profession: 'alchemy', recipeId, toolItemId })} disabled={startMutation.isPending} className="px-6 py-2 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold transition">
                            {startMutation.isPending ? 'Memulai...' : 'Mulai Meracik (-10 Energy)'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-8 text-center py-12 bg-gray-900 border border-amber-500/50 rounded-xl shadow-2xl">
                    <h3 className="text-2xl text-amber-500 font-bold mb-4">Aktivitas Sedang Berjalan...</h3>
                    <p className="text-gray-400 mb-8">Kerjakan tugas dengan cepat!</p>
                    <button
                        onClick={handleMinigameComplete}
                        disabled={completeMutation.isPending}
                        className="px-6 py-3 rounded bg-green-600 hover:bg-green-500 text-white font-bold transition mx-2"
                    >
                        {completeMutation.isPending ? 'Menyelesaikan...' : 'Angkat Pil'}
                    </button>
                </div>
            )}
        </div>
    );
}
