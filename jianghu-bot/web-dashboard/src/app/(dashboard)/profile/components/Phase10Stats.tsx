'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2, Swords, ShieldCheck, HelpCircle, Dumbbell } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { KUNGFU_SKILLS_META, getKungfuLevel, getKungfuBonusSummary } from '@/lib/kungfu';

export function Phase10Stats() {
    const queryClient = useQueryClient();
    const [allocatePoints, setAllocatePoints] = useState({ str: 0, agi: 0, sta: 0, pow: 0, int: 0, mor: 0 });
    const [selectedSparSkill, setSelectedSparSkill] = useState('sword');

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

    const sparMutation = useMutation({
        mutationFn: async (skill: string) => {
            const res = await api.post('/battle/spar', { skill });
            return res.data;
        },
        onSuccess: (data) => {
            const sparInfo = data.data;
            const levelUpMsg = sparInfo?.levelUp ? ` 🌟 Naik ke Tingkat ${sparInfo.newSkillLevel}!` : '';
            toast.show({ 
                message: `Latihan tanding selesai (+${sparInfo?.expGained} XP ${sparInfo?.skill?.toUpperCase()}).${levelUpMsg} (${sparInfo?.returnTier})`, 
                type: 'success' 
            });
            queryClient.invalidateQueries({ queryKey: ['player-stats'] });
            queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
        },
        onError: (err: any) => {
            toast.show({ message: err.response?.data?.error || 'Gagal melakukan sparring', type: 'error' });
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

    const martialSkillsList = ['sword', 'saber', 'staff', 'fist', 'finger', 'hiddenWeapon', 'forging', 'stealing', 'wineArt', 'healing', 'qimen', 'melody', 'special', 'core'];

    return (
        <div className="bg-slate-900/90 border border-[#c5a880]/30 rounded-xl p-6 shadow-xl space-y-8">
            <div>
                <h2 className="text-xl font-bold text-orange-400 mb-4 border-b border-orange-500/20 pb-2 flex items-center justify-between">
                    <span>Karakter & Talenta</span>
                    <span className="text-xs font-normal text-slate-400">Poin Belum Dialokasi: <strong className="text-amber-300">{unallocatedTalentPoints}</strong></span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-white">Level {level || 1}</h3>
                            <span className="text-slate-400 text-xs">EXP: {exp?.toLocaleString() || 0}</span>
                        </div>

                        <h3 className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-2">Computed Combat Stats</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
                            <div>HP: <span className="text-emerald-400 font-bold">{computedStats.currentHp} / {computedStats.maxHp}</span></div>
                            <div>MP: <span className="text-cyan-400 font-bold">{computedStats.currentMp} / {computedStats.maxMp}</span></div>
                            <div>ATK: <span className="text-red-400 font-bold">{computedStats.atk}</span></div>
                            <div>DEF: <span className="text-blue-400 font-bold">{computedStats.def}</span></div>
                            <div>SPD: <span className="text-yellow-400 font-bold">{computedStats.spd}</span></div>
                            <div>CRIT: <span className="text-amber-400 font-bold">{((computedStats.critHitRate || 0.05) * 100).toFixed(1)}%</span></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-white">Talenta Dasar</h3>
                        </div>

                        <div className="space-y-1.5">
                            {['str', 'agi', 'sta', 'pow', 'int', 'mor'].map((stat) => (
                                <div key={stat} className="flex items-center justify-between bg-slate-800/70 p-2 rounded border border-slate-700/50">
                                    <span className="uppercase text-slate-300 text-xs font-bold w-12">{stat}</span>
                                    <span className="text-white text-xs font-bold w-8 text-center">{talents?.[stat] || 5}</span>

                                    {unallocatedTalentPoints > 0 && (
                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={() => handleAllocate(stat as any, -1)}
                                                className="px-2 py-0.5 bg-slate-700 text-white text-xs rounded hover:bg-slate-600 disabled:opacity-40"
                                                disabled={allocatePoints[stat as keyof typeof allocatePoints] <= 0}
                                            >
                                                -
                                            </button>
                                            <span className="text-orange-400 text-xs w-4 text-center">{allocatePoints[stat as keyof typeof allocatePoints]}</span>
                                            <button
                                                onClick={() => handleAllocate(stat as any, 1)}
                                                className="px-2 py-0.5 bg-slate-700 text-white text-xs rounded hover:bg-slate-600 disabled:opacity-40"
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
                                className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg font-bold text-xs shadow-md disabled:opacity-50"
                            >
                                {allocateMutation.isPending ? 'Menyimpan...' : 'Simpan Alokasi Talenta'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* KUNGFU MASTERY & TOOL PROFICIENCY SECTION */}
            <div className="border-t border-slate-700/80 pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-amber-300 flex items-center gap-2">
                            <Swords size={20} className="text-orange-400" />
                            Penguasaan Kungfu & Kemahiran Alat
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Kemahiran meningkat bertahap dan berjangka panjang melalui pertempuran nyata memakai senjata/tinju, aksi mencuri, penempaan, serta sparring di sasana.
                        </p>
                    </div>

                    {/* Sparing Launcher Widget */}
                    <div className="flex items-center gap-2 bg-slate-800/90 border border-amber-500/30 p-2 rounded-lg shrink-0">
                        <select
                            value={selectedSparSkill}
                            onChange={(e) => setSelectedSparSkill(e.target.value)}
                            className="bg-slate-900 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none"
                        >
                            <option value="sword">🗡️ Pedang</option>
                            <option value="saber">⚔️ Golok</option>
                            <option value="staff">🥢 Tongkat</option>
                            <option value="fist">👊 Tinju</option>
                            <option value="hiddenWeapon">🎯 Senjata Rahasia</option>
                        </select>
                        <button
                            onClick={() => sparMutation.mutate(selectedSparSkill)}
                            disabled={sparMutation.isPending}
                            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 shadow disabled:opacity-50"
                        >
                            {sparMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Dumbbell size={12} />}
                            Sparring (10 Stamina)
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                    {martialSkillsList.map((skillKey) => {
                        const rawExp = kungfuSkills?.[skillKey] || 0;
                        const levelInfo = getKungfuLevel(rawExp);
                        const meta = KUNGFU_SKILLS_META[skillKey] || {
                            id: skillKey,
                            name: skillKey,
                            category: 'weapon',
                            icon: '🥋',
                            description: '-',
                            trainHint: 'Gunakan dalam pertempuran.'
                        };
                        const bonusSummary = getKungfuBonusSummary(skillKey, levelInfo.level);

                        return (
                            <div 
                                key={skillKey}
                                className="bg-slate-800/60 border border-slate-700/60 hover:border-amber-500/40 rounded-lg p-3 transition-all flex flex-col justify-between"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-2xl">{meta.icon}</span>
                                        <div>
                                            <div className="text-sm font-bold text-slate-200">{meta.name}</div>
                                            <div className="text-[11px] text-amber-400 font-semibold">{bonusSummary}</div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${levelInfo.rankColor}`}>
                                            Tingkat {levelInfo.level}
                                        </span>
                                        <div className="text-[9px] text-slate-400 mt-1 font-medium">{levelInfo.rankTitle.split(' ')[0]}</div>
                                    </div>
                                </div>

                                {/* XP Progress Bar */}
                                <div className="mt-3">
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                        <span>Progres: {levelInfo.progressPercent}%</span>
                                        <span>{levelInfo.exp.toLocaleString()} XP</span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                        <div 
                                            className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 transition-all duration-500 rounded-full"
                                            style={{ width: `${levelInfo.progressPercent}%` }}
                                        />
                                    </div>
                                    <div className="text-[9px] text-slate-500 mt-1.5 flex items-center gap-1 italic">
                                        <HelpCircle size={10} className="shrink-0 text-slate-600" />
                                        <span className="truncate">{meta.trainHint}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
