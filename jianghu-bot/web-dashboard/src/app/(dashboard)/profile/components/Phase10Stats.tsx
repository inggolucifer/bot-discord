import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export function Phase10Stats() {
    const queryClient = useQueryClient();
    const [allocatePoints, setAllocatePoints] = useState({ str: 0, agi: 0, sta: 0, pow: 0, int: 0, mor: 0 });

    const { data: statsData, isLoading } = useQuery({
        queryKey: ['player-stats'],
        queryFn: async () => {
            const res = await api.get('/player/stats');
            return res.data.data;
        }
    });

    const allocateMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/player/talents/allocate', payload);
            return res.data;
        },
        onSuccess: (data) => {
            toast.show({ message: data.message, type: 'success' });
            setAllocatePoints({ str: 0, agi: 0, sta: 0, pow: 0, int: 0, mor: 0 });
            queryClient.invalidateQueries({ queryKey: ['player-stats'] });
        },
        onError: (err: any) => {
            toast.show({ message: err.response?.data?.error || 'Gagal mengalokasikan poin', type: 'error' });
        }
    });

    const practiceMutation = useMutation({
        mutationFn: async (skillType: string) => {
            const res = await api.post('/player/kungfu/practice', { skillType });
            return res.data;
        },
        onSuccess: (data) => {
            toast.show({ message: data.message, type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['player-stats'] });
        },
        onError: (err: any) => {
            toast.show({ message: err.response?.data?.error || 'Gagal latihan', type: 'error' });
        }
    });

    const practiceClaimMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/player/kungfu/practice-claim');
            return res.data;
        },
        onSuccess: (data) => {
            toast.show({ message: data.message, type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['player-stats'] });
        },
        onError: (err: any) => {
            toast.show({ message: err.response?.data?.error || 'Gagal claim latihan', type: 'error' });
        }
    });

    if (isLoading) return <div className="p-4"><Loader2 className="animate-spin text-orange-500 w-8 h-8" /></div>;
    if (!statsData) return null;

    const { level, exp, talents, unallocatedTalentPoints, computedStats, kungfuSkills } = statsData;

    const handleAllocate = (stat: keyof typeof allocatePoints, amount: number) => {
        setAllocatePoints(prev => {
            const totalAllocated = Object.values(prev).reduce((a, b) => a + b, 0);
            if (amount > 0 && totalAllocated >= unallocatedTalentPoints) return prev;
            if (prev[stat] + amount < 0) return prev;
            return { ...prev, [stat]: prev[stat] + amount };
        });
    };

    const submitAllocation = () => {
        const totalAllocated = Object.values(allocatePoints).reduce((a, b) => a + b, 0);
        if (totalAllocated <= 0) return;
        allocateMutation.mutate(allocatePoints);
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-orange-400 mb-4 border-b border-orange-500/30 pb-2">Karakter & Talenta</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold text-white mb-2">Level {level || 1}</h3>
                    <div className="text-slate-400 text-sm mb-4">EXP: {exp || 0}</div>

                    <h3 className="font-semibold text-white mb-2">Computed Stats</h3>
                    <div className="space-y-1 text-sm text-slate-300 bg-slate-800 p-3 rounded border border-slate-700">
                        <div>HP: {computedStats.currentHp} / {computedStats.maxHp}</div>
                        <div>MP: {computedStats.currentMp} / {computedStats.maxMp}</div>
                        <div>ATK: {computedStats.atk}</div>
                        <div>DEF: {computedStats.def}</div>
                        <div>SPD: {computedStats.spd}</div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-white">Talenta</h3>
                        <span className="text-sm text-orange-300">Sisa Poin: {unallocatedTalentPoints}</span>
                    </div>

                    <div className="space-y-2">
                        {['str', 'agi', 'sta', 'pow', 'int', 'mor'].map((stat) => (
                            <div key={stat} className="flex items-center justify-between bg-slate-800 p-2 rounded">
                                <span className="uppercase text-slate-300 text-sm w-12">{stat}</span>
                                <span className="text-white w-8 text-center">{talents?.[stat] || 5}</span>

                                {unallocatedTalentPoints > 0 && (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleAllocate(stat as any, -1)}
                                            className="px-2 py-0.5 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50"
                                            disabled={allocatePoints[stat as keyof typeof allocatePoints] <= 0}
                                        >
                                            -
                                        </button>
                                        <span className="text-orange-400 w-4 text-center">{allocatePoints[stat as keyof typeof allocatePoints]}</span>
                                        <button
                                            onClick={() => handleAllocate(stat as any, 1)}
                                            className="px-2 py-0.5 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50"
                                            disabled={Object.values(allocatePoints).reduce((a, b) => a + b, 0) >= unallocatedTalentPoints}
                                        >
                                            +
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {Object.values(allocatePoints).reduce((a, b) => a + b, 0) > 0 && (
                        <button
                            onClick={submitAllocation}
                            disabled={allocateMutation.isPending}
                            className="w-full mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded font-medium disabled:opacity-50"
                        >
                            {allocateMutation.isPending ? 'Menyimpan...' : 'Alokasikan Poin'}
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-6 border-t border-slate-700 pt-4">
                <h3 className="font-semibold text-white mb-4">Latihan Kungfu</h3>

                {kungfuSkills?.activePracticeSkill && (
                    <div className="mb-4 bg-orange-950/30 border border-orange-500/30 p-3 rounded flex justify-between items-center">
                        <div>
                            <div className="text-orange-200 font-medium">Sedang Berlatih: {kungfuSkills.activePracticeSkill}</div>
                            <div className="text-xs text-orange-300/70">Poin Saat Ini: {kungfuSkills[kungfuSkills.activePracticeSkill] || 0}</div>
                        </div>
                        <button
                            onClick={() => practiceClaimMutation.mutate()}
                            disabled={practiceClaimMutation.isPending}
                            className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-500"
                        >
                            Claim
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {['sword', 'saber', 'staff', 'fist', 'finger', 'special', 'forging', 'qimen', 'melody', 'healing', 'wineArt', 'hiddenWeapon', 'stealing', 'core'].map(skill => (
                        <div key={skill} className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded p-2">
                            <span className="text-sm text-slate-300 capitalize">{skill}: {kungfuSkills?.[skill] || 0}</span>
                            <button
                                onClick={() => practiceMutation.mutate(skill)}
                                disabled={practiceMutation.isPending || kungfuSkills?.activePracticeSkill === skill}
                                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50"
                            >
                                Latih
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
