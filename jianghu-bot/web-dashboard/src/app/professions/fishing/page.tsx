"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import FishingMinigame from '../components/FishingMinigame';

export default function FishingPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [recipeId, setRecipeId] = useState('');
    const [toolItemId, setToolItemId] = useState('');
    const [zoneId, setZoneId] = useState<number>(1);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: () => api.get('/player/profile').then(res => res.data),
    });

    const startMutation = useMutation({
        mutationFn: (data: { profession: string, recipeId: string, toolItemId: string, zoneId: number }) => api.post('/professions/start', data),
        onSuccess: (data) => {
            setActiveSessionId(data.data.sessionId);
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal memulai minigame. Pastikan energi dan material cukup.');
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

    const handleMinigameComplete = (score: number, telemetry: any) => {
        if (activeSessionId) {
            completeMutation.mutate({ sessionId: activeSessionId, telemetryData: telemetry });
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl text-gray-100">
            <button onClick={() => router.push('/professions')} className="mb-4 text-amber-500 hover:text-amber-400">
                &larr; Kembali ke Profesi
            </button>
            <PageHeader title="Memancing" description="Tangkap ikan eksotis dari sungai." />

            {!activeSessionId ? (
                <div className="bg-gray-900 border border-amber-500/50 p-8 rounded-xl shadow-2xl mt-8">
                    <h2 className="text-2xl font-bold mb-4 text-amber-500">Persiapan Memancing</h2>
                    <p className="mb-4 text-gray-300">Pilih lokasi dan umpan (Simulasi).</p>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Zone ID</label>
                            <input type="number" value={zoneId} onChange={e => setZoneId(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" placeholder="1" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Nama Resep/Lokasi (e.g. Sungai Pemula)</label>
                            <input type="text" value={recipeId} onChange={e => setRecipeId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" placeholder="Masukkan nama resep" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tool Item ID (Alat Pancing)</label>
                            <input type="text" value={toolItemId} onChange={e => setToolItemId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" placeholder="Masukkan ObjectId alat pancing" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button onClick={() => startMutation.mutate({ profession: 'fishing', recipeId, toolItemId, zoneId })} disabled={startMutation.isPending} className="px-6 py-2 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold transition">
                            {startMutation.isPending ? 'Memulai...' : 'Mulai Memancing (-10 Energy)'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-8">
                    <FishingMinigame
                        onComplete={handleMinigameComplete}
                        onCancel={() => setActiveSessionId(null)}
                    />
                </div>
            )}
        </div>
    );
}
