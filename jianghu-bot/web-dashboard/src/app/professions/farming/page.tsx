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
import PlotSelector from '../components/PlotSelector';
import ProfessionSkillBadge from '../components/ProfessionSkillBadge';
import FarmingMinigame from '../components/FarmingMinigame';
import FertilizerModal from './FertilizerModal';

export default function FarmingPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [recipeId, setRecipeId] = useState('');
    const [toolItemId, setToolItemId] = useState('');
    const [plotIndex, setPlotIndex] = useState<number>(0);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [showFertilizerModal, setShowFertilizerModal] = useState(false);

    const { data: profileRaw, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: () => api.get('/player/profile').then(res => res.data),
    });

    const { data: recipesRaw, isLoading: isLoadingRecipes } = useQuery({
        queryKey: ['recipes', 'farming'],
        queryFn: () => api.get('/professions/recipes?profession=farming').then(res => res.data),
    });

    const profile = getPlayerFromProfileResponse(profileRaw);
    const recipes = recipesRaw?.data || recipesRaw || [];

    const startMutation = useMutation({
        mutationFn: (data: { profession: string, recipeId?: string, toolItemId: string, plotIndex: number, action: 'plant' | 'harvest' }) => api.post('/professions/start', data),
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
            queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });

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

    const farmingProf = profile.professions?.farming;
    if (!farmingProf?.isUnlocked) {
        return (
            <div className="container mx-auto p-4 max-w-4xl text-center mt-20">
                <h2 className="text-2xl text-red-500 font-bold mb-4">Profesi Terkunci</h2>
                <p className="text-gray-400 mb-6">Kamu belum mempelajari profesi Bertani.</p>
                <button onClick={() => router.push('/professions')} className="px-6 py-2 bg-amber-600 rounded text-black font-bold">
                    Buka di Menu Profesi
                </button>
            </div>
        );
    }

    const selectedRecipe = recipes.find((r: any) => r.id === recipeId);


    const handleStart = () => {
        const selectedPlot = profile?.professions?.farming?.farmPlots?.[plotIndex];
        if (!selectedPlot) {
             alert('Pilih petak yang valid.');
             return;
        }

        const isHarvest = selectedPlot.cropId && selectedPlot.harvestAt && new Date(selectedPlot.harvestAt).getTime() <= new Date().getTime();

        if (!isHarvest && !recipeId) {
            alert('Pilih resep yang ingin ditanam!');
            return;
        }
        if (!toolItemId) {
            alert('Pilih alat pertanian!');
            return;
        }

        startMutation.mutate({
            profession: 'farming',
            recipeId: isHarvest ? undefined : recipeId,
            toolItemId,
            plotIndex,
            action: isHarvest ? 'harvest' : 'plant'
        });
    };

    const activePlot = profile?.professions?.farming?.farmPlots?.[plotIndex];
    const isHarvestReady = activePlot && activePlot.cropId && activePlot.harvestAt && new Date(activePlot.harvestAt).getTime() <= new Date().getTime();


    const handleMinigameComplete = (telemetryData: any) => {
        if (activeSessionId) {
            completeMutation.mutate({ sessionId: activeSessionId, telemetryData });
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl text-gray-100">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => router.push('/professions')} className="text-amber-500 hover:text-amber-400 font-bold flex items-center gap-2">
                    &larr; Kembali
                </button>
                <ProfessionSkillBadge level={farmingProf.level || 1} exp={farmingProf.exp || 0} />
            </div>

            <PageHeader title="Bertani" description="Tanam dan panen material alam." />

            {!activeSessionId ? (
                <div className="bg-gray-900 border border-amber-500/50 p-8 rounded-xl shadow-2xl mt-8">
                    <h2 className="text-2xl font-bold mb-6 text-amber-500 border-b border-gray-700 pb-2">Persiapan Bertani</h2>

                    <div className="space-y-8 mb-8">
                        <PlotSelector
                            plots={farmingProf.farmPlots || []}
                            selectedPlotIndex={plotIndex}
                            onSelect={setPlotIndex}
                            playerCurrency={{
                                copper: profile.currency?.copper || 0,
                                silver: profile.currency?.silver || 0,
                                gold: profile.currency?.gold || 0,
                                jade: profile.currency?.jade || 0
                            }}
                        />

                        {farmingProf.farmPlots && farmingProf.farmPlots[plotIndex] && farmingProf.farmPlots[plotIndex].cropId && new Date(farmingProf.farmPlots[plotIndex].harvestAt) > new Date() && !farmingProf.farmPlots[plotIndex].fertilizerApplied && (
                            <div className="flex justify-start">
                                <button
                                    onClick={() => setShowFertilizerModal(true)}
                                    className="bg-green-700/80 hover:bg-green-600 text-green-100 px-4 py-2 rounded text-sm font-bold shadow-lg border border-green-500 transition-colors"
                                >
                                    🧪 Pakai Pupuk pada Plot #{plotIndex + 1}
                                </button>
                            </div>
                        )}

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
                                    minToolTier={selectedRecipe.minToolTier}
                                    selectedToolId={toolItemId}
                                    onSelect={setToolItemId}
                                />
                                <RequirementsPanel
                                    currentEnergy={profile.energy?.current || 0}
                                    requiredMaterials={selectedRecipe.materials}
                                    inventory={profile.inventory || []}
                                    minToolTier={selectedRecipe.minToolTier}
                                    selectedToolId={toolItemId}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-4 border-t border-gray-800 pt-6">
                        <button
                            onClick={handleStart}
                            disabled={(!isHarvestReady && !recipeId) || !toolItemId || startMutation.isPending}
                            className="px-8 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {startMutation.isPending ? 'Memulai...' : (isHarvestReady ? 'Panen Sekarang (-5 Energy)' : 'Tanam Sekarang (-5 Energy)')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-8 bg-gray-900 border border-amber-500/50 rounded-xl shadow-2xl overflow-hidden">
                    <FarmingMinigame
                        onComplete={handleMinigameComplete}
                        onCancel={() => setActiveSessionId(null)}
                    />
                </div>
            )}

            {showFertilizerModal && (
                <FertilizerModal
                    plotIndex={plotIndex}
                    inventory={profile.inventory || []}
                    onClose={() => setShowFertilizerModal(false)}
                />
            )}
        </div>
    );
}
