"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { getPlayerFromProfileResponse } from '@/lib/profileHelper';

import RecipePicker from '../components/RecipePicker';
import ToolPicker from '../components/ToolPicker';
import RequirementsPanel from '../components/RequirementsPanel';
import ProfessionSkillBadge from '../components/ProfessionSkillBadge';
import CookingMinigame from '../components/CookingMinigame';

export default function CookingPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [recipeId, setRecipeId] = useState('');
    const [toolItemId, setToolItemId] = useState('');
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const { data: profileRaw, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: () => api.get('/player/profile').then(res => res.data),
    });

    const { data: recipesRaw, isLoading: isLoadingRecipes } = useQuery({
        queryKey: ['recipes', 'cooking'],
        queryFn: () => api.get('/professions/recipes?profession=cooking').then(res => res.data),
    });

    const profile = getPlayerFromProfileResponse(profileRaw);
    const recipes = recipesRaw?.data || recipesRaw || [];

    const startMutation = useMutation({
        mutationFn: (data: { profession: string, recipeId: string, toolItemId: string }) => api.post('/professions/start', data),
        onSuccess: (data) => {
            const payload = data.data?.data ?? data.data;
            if (payload && payload.sessionId) {
                setActiveSessionId(payload.sessionId);
            }
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal memulai.');
        }
    });

    const completeMutation = useMutation({
        mutationFn: (data: { sessionId: string, telemetryData: any }) => api.post('/professions/complete', data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });

            const d = res.data?.data ?? res.data;

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
            setRecipeId('');
            setToolItemId('');
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Gagal menyelesaikan minigame.');
            setActiveSessionId(null);
        }
    });

    if (isLoading || !profile) return <div className="p-8 text-center text-white">Memuat...</div>;

    const cookingProf = profile.professions?.cooking;
    if (!cookingProf?.isUnlocked) {
        return (
            <div className="container mx-auto p-4 max-w-4xl text-center mt-20">
                <h2 className="text-2xl text-red-500 font-bold mb-4">Profesi Terkunci</h2>
                <p className="text-gray-400 mb-6">Kamu belum mempelajari profesi Memasak.</p>
                <button onClick={() => router.push('/professions')} className="px-6 py-2 bg-orange-600 rounded text-white font-bold">
                    Buka di Menu Profesi
                </button>
            </div>
        );
    }

    const selectedRecipe = recipes.find((r: any) => r.id === recipeId);

    const handleStart = () => {
        if (!recipeId || !toolItemId) {
            alert("Pilih resep dan alat terlebih dahulu!");
            return;
        }
        startMutation.mutate({ profession: 'cooking', recipeId, toolItemId });
    };

    const handleMinigameComplete = (telemetryData: any) => {
        if (activeSessionId) {
            completeMutation.mutate({ sessionId: activeSessionId, telemetryData });
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl text-gray-100">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => router.push('/professions')} className="text-orange-500 hover:text-orange-400 font-bold flex items-center gap-2">
                    &larr; Kembali
                </button>
                <ProfessionSkillBadge level={cookingProf.level || 1} exp={cookingProf.exp || 0} />
            </div>

            <PageHeader title="Memasak" description="Olah bahan mentah jadi makanan bergizi." />

            {!activeSessionId ? (
                <div className="bg-gray-900 border border-orange-500/50 p-8 rounded-xl shadow-2xl mt-8">
                    <h2 className="text-2xl font-bold mb-6 text-orange-500 border-b border-gray-700 pb-2">Persiapan Memasak</h2>

                    <div className="space-y-8 mb-8">
                        <RecipePicker
                            recipes={recipes}
                            selectedRecipeId={recipeId}
                            onSelect={(id) => { setRecipeId(id); setToolItemId(''); }}
                            isLoading={isLoadingRecipes}
                        />

                        {selectedRecipe && (
                            <div className="grid md:grid-cols-2 gap-8">
                                <ToolPicker
                                    inventory={profile.inventory || []}
                                    toolType={selectedRecipe.toolType}
                                    selectedToolId={toolItemId}
                                    onSelect={setToolItemId}
                                />
                                <RequirementsPanel
                                    currentEnergy={profile.energy?.current || 0}
                                    requiredMaterials={selectedRecipe.materials}
                                    inventory={profile.inventory || []}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-4 border-t border-gray-800 pt-6">
                        <button
                            onClick={handleStart}
                            disabled={startMutation.isPending || !recipeId || !toolItemId}
                            className="px-8 py-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {startMutation.isPending ? 'Memulai...' : 'Mulai Memasak (-10 Energy)'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-8 bg-gray-900 border border-orange-500/50 rounded-xl shadow-2xl overflow-hidden">
                    <CookingMinigame
                        onComplete={handleMinigameComplete}
                        onCancel={() => setActiveSessionId(null)}
                    />
                </div>
            )}
        </div>
    );
}
