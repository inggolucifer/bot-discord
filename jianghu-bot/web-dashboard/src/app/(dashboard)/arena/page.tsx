"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { toast } from '@/components/ui/Toast';
import { Swords, Play, Skull, Shield, Zap, RefreshCw, Flame, Search, User, Wind } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ArenaPage() {
    const { token, user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
        const [selectedOpponentId, setSelectedOpponentId] = useState('');

    const { data: rawOpponents, isLoading: isOpponentsLoading } = useQuery({
        queryKey: ['arenaOpponents'],
        queryFn: async () => {
            const { data } = await api.get('/leaderboard/wealth?limit=50');
            return data;
        },
        enabled: !!token
    });

    const opponents = React.useMemo(() => {
        if (!rawOpponents || !rawOpponents.data) return [];
        return rawOpponents.data.filter((p: any) => p.discordId !== user?.id);
    }, [rawOpponents, user]);
    const [searchQuery, setSearchQuery] = useState('');

    const [isBattling, setIsBattling] = useState(false);
    const [battleData, setBattleData] = useState<any>(null);
    const [currentLogIndex, setCurrentLogIndex] = useState(0);

    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!token) {
            router.push('/auth/login');
            return;
        }
    }, [token]);

    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [currentLogIndex, battleData]);



    const startBattle = async () => {
        if (!selectedOpponentId) {
            toast.show({ message: 'Pilih lawan terlebih dahulu!', type: 'error' });
            return;
        }

        setIsBattling(true);
        setBattleData(null);
        setCurrentLogIndex(0);

        try {
            const res = await api.post('/battle/simulate',
                { opponentDiscordId: selectedOpponentId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                setBattleData(res.data.data);
                // Start log playback
                playBattleAnimation(res.data.data.logs);
            }
        } catch (error: any) {
            setIsBattling(false);
            toast.show({ message: error.response?.data?.error || 'Gagal memulai duel.', type: 'error' });
        }
    };

    const playBattleAnimation = (logs: any[]) => {
        let index = 0;
        const interval = setInterval(() => {
            if (index >= logs.length) {
                clearInterval(interval);
                return;
            }
            setCurrentLogIndex(index);
            index++;
        }, 1200); // 1.2 detik per log
    };

    const skipAnimation = () => {
        if (battleData && battleData.logs) {
            setCurrentLogIndex(battleData.logs.length - 1);
        }
    };

    const resetBattle = () => {
        setIsBattling(false);
        setBattleData(null);
        setCurrentLogIndex(0);
    };

    const filteredPlayers = opponents?.filter((p: any) => p.characterName.toLowerCase().includes(searchQuery.toLowerCase()));

    const getLogIcon = (type: string) => {
        switch(type) {
            case 'attack': return <Swords size={16} className="text-red-400" />;
            case 'heal': return <Flame size={16} className="text-pink-400" />;
            case 'poison_tick':
            case 'poison_apply': return <Skull size={16} className="text-green-400" />;
            case 'shield_gain':
            case 'shield_block':
            case 'shield_break': return <Shield size={16} className="text-blue-400" />;
            case 'stun_apply':
            case 'stun_skip': return <Zap size={16} className="text-yellow-400" />;
            case 'reflect': return <RefreshCw size={16} className="text-purple-400" />;
            case 'dodge': return <Wind size={16} className="text-teal-400" />;
            default: return <Swords size={16} className="text-gray-400" />;
        }
    };

    if (loading || isOpponentsLoading) return <LoadingState text="Menyiapkan Arena Duel..." />;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Battle Arena"
                description="Simulasi duel antar pendekar. Buktikan kekuatan formasi dan hukum alammu!"
            />

            {!isBattling ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="col-span-1 lg:col-span-1 bg-[#111] border-[#333]">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Swords className="text-red-500" /> Pilih Lawan
                            </h3>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Cari nama..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black border border-[#444] rounded pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                />
                            </div>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {filteredPlayers?.map((p: any) => (
                                    <div
                                        key={p.discordId}
                                        onClick={() => setSelectedOpponentId(p.discordId)}
                                        className={`p-3 border rounded cursor-pointer transition-colors flex items-center justify-between ${selectedOpponentId === p.discordId ? 'bg-red-900/20 border-red-500' : 'bg-black/40 border-[#333] hover:border-red-500/50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border border-[#444] overflow-hidden">
                                                {p.characterImage ? <img src={p.characterImage} alt="" className="w-full h-full object-cover"/> : <User size={16} className="text-gray-400"/>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-200 text-sm">{p.characterName}</div>
                                                <div className="text-xs text-gray-500">{p.realm}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredPlayers?.length === 0 && <p className="text-center text-sm text-gray-500 py-4">Lawan tidak ditemukan.</p>}
                            </div>

                            <Button
                                className="w-full mt-4 bg-red-800 hover:bg-red-700 font-bold"
                                disabled={!selectedOpponentId}
                                onClick={startBattle}
                            >
                                <Play size={16} className="mr-2" /> Mulai Duel
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="col-span-1 lg:col-span-2 flex flex-col justify-center items-center p-8 bg-[url('/img/arena-bg.jpg')] bg-cover bg-center bg-no-repeat rounded-lg border border-[#333] relative overflow-hidden min-h-[400px]">
                         <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                         <div className="relative z-10 text-center space-y-4">
                             <Swords size={64} className="text-gray-500/50 mx-auto" />
                             <h2 className="text-2xl font-serif text-gray-400">Pilih lawan untuk memulai visualisasi pertarungan</h2>
                         </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex justify-between items-center bg-[#111] p-4 rounded-lg border border-[#333]">
                        <Button variant="outline" onClick={resetBattle} size="sm">Kembali</Button>
                        <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
                            <Swords className="text-red-500" /> Duel Arena
                        </h2>
                        <Button variant="outline" onClick={skipAnimation} size="sm" disabled={!battleData || currentLogIndex === battleData.logs.length - 1}>Skip Animasi</Button>
                    </div>

                    {battleData && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Visualizer Area */}
                            <div className="col-span-1 lg:col-span-2 bg-[#0a0a0a] rounded-lg border border-[#222] relative overflow-hidden flex flex-col min-h-[500px]">
                                {/* Background Image placeholder */}
                                <div className="absolute inset-0 bg-gradient-to-b from-[#1a0f0f] to-[#0a0a0a] opacity-50"></div>

                                {/* Health Bars */}
                                <div className="relative z-10 flex justify-between p-6 w-full">
                                    {/* P1 */}
                                    <div className="w-2/5 space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="font-bold text-white text-lg">{battleData.challenger.name}</span>
                                        </div>
                                        <div className="h-4 bg-[#222] rounded-full overflow-hidden border border-[#444] w-full">
                                            <div
                                                className="h-full bg-green-500 transition-all duration-300"
                                                style={{ width: `${Math.max(0, (battleData.logs[currentLogIndex]?.p1Hp / battleData.result.p1MaxHp) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-right text-gray-400 font-mono">
                                            {battleData.logs[currentLogIndex]?.p1Hp} / {battleData.result.p1MaxHp}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center font-bold text-red-500 text-2xl px-4 italic font-serif">VS</div>

                                    {/* P2 */}
                                    <div className="w-2/5 space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="font-bold text-white text-lg">{battleData.opponent.name}</span>
                                        </div>
                                        <div className="h-4 bg-[#222] rounded-full overflow-hidden border border-[#444] w-full flex justify-end">
                                            <div
                                                className="h-full bg-red-500 transition-all duration-300"
                                                style={{ width: `${Math.max(0, (battleData.logs[currentLogIndex]?.p2Hp / battleData.result.p2MaxHp) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-left text-gray-400 font-mono">
                                            {battleData.logs[currentLogIndex]?.p2Hp} / {battleData.result.p2MaxHp}
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Action Text (Center Area) */}
                                <div className="flex-1 relative z-10 flex items-center justify-center p-8 text-center">
                                    {battleData.logs[currentLogIndex] && (
                                        <div
                                            key={`log-${currentLogIndex}`}
                                            className="animate-in slide-in-from-bottom-4 fade-in duration-300"
                                        >
                                            {battleData.logs[currentLogIndex].type === 'round_start' ? (
                                                <div className="text-2xl font-bold text-yellow-500 uppercase tracking-widest bg-black/50 px-6 py-2 rounded-full border border-yellow-500/30">
                                                    {battleData.logs[currentLogIndex].text.replace(/\*\*/g, '')}
                                                </div>
                                            ) : battleData.logs[currentLogIndex].type === 'battle_end' ? (
                                                <div className="text-3xl font-bold text-green-400 uppercase tracking-widest bg-black/80 p-8 rounded-lg border-2 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                                                    {battleData.logs[currentLogIndex].text.replace(/\*\*/g, '')}
                                                </div>
                                            ) : (
                                                <div className="text-xl font-medium text-white max-w-lg mx-auto bg-black/40 p-4 rounded backdrop-blur-sm border border-[#333]">
                                                    {battleData.logs[currentLogIndex].text.replace(/\*\*/g, '')}

                                                    {/* Optional Action Data display like damage numbers */}
                                                    {battleData.logs[currentLogIndex].actionData?.damage > 0 && (
                                                        <div className={`text-3xl font-bold mt-2 font-mono ${battleData.logs[currentLogIndex].actionData.isCrit ? 'text-yellow-400 scale-125' : 'text-red-400'}`}>
                                                            -{battleData.logs[currentLogIndex].actionData.damage}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Logs Area */}
                            <div className="col-span-1 bg-[#111] rounded-lg border border-[#333] flex flex-col max-h-[500px]">
                                <div className="p-3 border-b border-[#333] font-bold text-[#c5a880] flex justify-between items-center">
                                    <span>Combat Log</span>
                                    <Badge variant="outline">Round {battleData.logs[currentLogIndex]?.round || 1}</Badge>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3" ref={logContainerRef}>
                                    {battleData.logs.slice(0, currentLogIndex + 1).map((log: any, idx: number) => (
                                        <div key={idx} className={`text-sm ${log.type === 'round_start' ? 'text-yellow-500 font-bold border-b border-[#333] pb-1 mt-4 first:mt-0' : log.type === 'battle_end' ? 'text-green-400 font-bold text-base mt-4' : 'text-gray-300'} flex gap-2`}>
                                            {!['round_start', 'battle_end'].includes(log.type) && (
                                                <span className="shrink-0 mt-0.5">{getLogIcon(log.type)}</span>
                                            )}
                                            <span dangerouslySetInnerHTML={{__html: log.text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/\*(.*?)\*/g, '<em class="text-gray-400">$1</em>')}}></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
