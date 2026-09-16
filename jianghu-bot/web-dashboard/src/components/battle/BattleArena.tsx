'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Sword, Shield, Zap, Wind, Skull, Sparkles, MoveRight } from 'lucide-react';

interface BattleArenaProps {
    battleId: string;
    onBattleEnd: (result: string, rewards?: any) => void;
}

export default function BattleArena({ battleId, onBattleEnd }: BattleArenaProps) {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlayerTurn, setIsPlayerTurn] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Tick polling
    const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchState = async () => {
        try {
            const res = await api.get(`/battle/state/${battleId}`);
            setSession(res.data.session);
            setLoading(false);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal memuat status pertarungan');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchState();
        return () => stopTick();
    }, [battleId]);

    useEffect(() => {
        if (!session) return;

        if (session.status !== 'ongoing') {
            stopTick();
            // Wait a bit to show the final state, then end
            setTimeout(() => {
                onBattleEnd(session.status, session.rewards);
            }, 3000);
            return;
        }

        const isTurn = session.turnQueue.length > 0 && session.turnQueue[0] === session.player.entityId;
        setIsPlayerTurn(isTurn);

        if (!isTurn && session.status === 'ongoing') {
            startTick();
        } else {
            stopTick();
        }
    }, [session]);

    const startTick = () => {
        if (tickIntervalRef.current) return;
        tickIntervalRef.current = setInterval(async () => {
            try {
                const res = await api.post(`/battle/tick/${battleId}`);
                if (res.data.session) {
                    setSession(res.data.session);
                }
            } catch (err) {
                console.error(err);
            }
        }, 1000); // Polling every 1 second
    };

    const stopTick = () => {
        if (tickIntervalRef.current) {
            clearInterval(tickIntervalRef.current);
            tickIntervalRef.current = null;
        }
    };

    const handleAction = async (actionType: string, skillId?: string, targetId?: string) => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        try {
            const tgt = targetId || (session.enemies.find((e:any) => !e.isDead)?.entityId);
            const res = await api.post(`/battle/action/${battleId}`, { actionType, skillId, targetId: tgt });
            setSession(res.data.session);
            setSelectedAction(null);
            setSelectedTarget(null);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Aksi gagal');
        } finally {
            setIsActionLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-amber-200">Memasuki Arena Pertempuran...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!session) return null;

    const player = session.player;
    const enemies = session.enemies;

    return (
        <div className="relative w-full h-[85vh] bg-[#0a0f18] rounded-xl overflow-hidden flex flex-col font-sans select-none border border-amber-900/40 shadow-2xl">
            {/* Background Image / Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black/80 pointer-events-none" />
            
            {/* Header */}
            <div className="relative z-10 flex justify-between items-center p-4 bg-black/50 border-b border-amber-800/30 backdrop-blur-sm">
                <div className="text-amber-300 font-serif font-bold text-lg">⚔️ Pertempuran Terjadi!</div>
                <div className="text-gray-400 text-sm">Status: {session.status.toUpperCase()}</div>
            </div>

            {/* Arena Space */}
            <div className="flex-1 relative z-10 p-6 flex flex-col justify-between">
                
                {/* Enemies Row */}
                <div className="flex justify-center gap-8 mb-12 mt-4">
                    {enemies.map((enemy: any) => (
                        <div key={enemy.entityId} className={`relative flex flex-col items-center transition-all ${enemy.isDead ? 'opacity-30 grayscale' : 'animate-in zoom-in'}`}>
                            {enemy.isDead && <div className="absolute inset-0 flex items-center justify-center z-20"><Skull className="w-16 h-16 text-red-600/80" /></div>}
                            
                            <div className="w-32 h-32 bg-gray-800 rounded-lg border-2 border-red-900/50 mb-2 overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                                {enemy.imageUrl ? (
                                    <img src={enemy.imageUrl} alt={enemy.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl">👹</div>
                                )}
                            </div>
                            
                            <div className="bg-black/80 px-3 py-1.5 rounded border border-red-900/60 text-center w-40 backdrop-blur-md">
                                <h3 className="text-red-200 font-bold text-sm truncate">{enemy.name}</h3>
                                <div className="text-gray-400 text-[10px]">Lv. {enemy.level}</div>
                                
                                {/* HP Bar */}
                                <div className="w-full h-2 bg-gray-900 rounded-full mt-1.5 overflow-hidden">
                                    <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                                </div>
                                <div className="text-[9px] text-gray-300 text-right mt-0.5">{enemy.hp}/{enemy.maxHp} HP</div>

                                {/* ATB Bar */}
                                <div className="w-full h-1 bg-gray-900 rounded-full mt-1 overflow-hidden">
                                    <div className="h-full bg-yellow-400 transition-all duration-200" style={{ width: `${(enemy.atb / enemy.maxAtb) * 100}%` }} />
                                </div>

                                {/* Stance Bar */}
                                <div className="w-full h-1 bg-gray-900 rounded-full mt-1 overflow-hidden">
                                    <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${(enemy.stance / enemy.maxStance) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Combat Logs Overlay (Right Side) */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-72 h-64 overflow-y-auto bg-black/60 border border-gray-800/60 rounded-lg p-3 backdrop-blur-sm pointer-events-none flex flex-col-reverse shadow-xl scrollbar-hide">
                    <div className="flex flex-col gap-2">
                        {session.logs.slice(-10).map((log: any, i: number) => (
                            <div key={i} className="text-xs text-gray-300 leading-relaxed border-b border-gray-800/50 pb-1">
                                <span className={log.actor === player.name ? 'text-blue-300 font-semibold' : 'text-red-300 font-semibold'}>
                                    [{log.actor}]
                                </span> {log.message}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Player Row */}
                <div className="flex justify-center mt-auto pb-4">
                    <div className="relative flex items-end gap-6 w-full max-w-2xl bg-black/40 p-4 rounded-xl border border-blue-900/30 backdrop-blur-md shadow-2xl">
                        
                        {/* Player Avatar */}
                        <div className="w-24 h-24 bg-gray-800 rounded-lg border-2 border-blue-600/50 overflow-hidden shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                            {player.imageUrl ? (
                                <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl bg-blue-950">🧙‍♂️</div>
                            )}
                        </div>

                        {/* Player Stats */}
                        <div className="flex-1">
                            <h2 className="text-blue-200 font-bold text-lg mb-1">{player.name}</h2>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {/* HP */}
                                <div>
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                        <span>HP (Darah)</span>
                                        <span>{player.hp}/{player.maxHp}</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(player.hp / player.maxHp) * 100}%` }} />
                                    </div>
                                </div>
                                
                                {/* Qi */}
                                <div>
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                        <span>Qi (Energi)</span>
                                        <span>{player.qi}/{player.maxQi}</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${(player.qi / player.maxQi) * 100}%` }} />
                                    </div>
                                </div>

                                {/* ATB */}
                                <div className="col-span-2 mt-1">
                                    <div className="flex justify-between text-[10px] text-amber-200/70 mb-0.5 font-bold">
                                        <span>ATB (Kecepatan)</span>
                                        <span>{isPlayerTurn ? 'READY' : 'WAITING'}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden ring-1 ring-amber-900/30">
                                        <div className={`h-full transition-all duration-200 ${isPlayerTurn ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-yellow-600/50'}`} style={{ width: `${(player.atb / player.maxAtb) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Action Menu (Bottom Bar) */}
            <div className={`relative z-20 bg-[#0d131f] border-t border-blue-900/50 p-4 transition-all duration-300 ${isPlayerTurn ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-50 absolute bottom-0 w-full'}`}>
                {isPlayerTurn ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        <button 
                            onClick={() => handleAction('attack', 'basic_attack')}
                            disabled={isActionLoading}
                            className="shrink-0 flex items-center justify-center gap-2 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/60 px-6 py-3 rounded-lg font-bold shadow-lg transition-colors min-w-[140px]"
                        >
                            <Sword className="w-5 h-5" /> Serang
                        </button>
                        
                        {/* Skills */}
                        {player.skills.filter((s:any) => s.skillId !== 'basic_attack').map((skill: any) => (
                            <button
                                key={skill.skillId}
                                onClick={() => handleAction('skill', skill.skillId)}
                                disabled={isActionLoading || skill.currentCooldown > 0 || player.qi < skill.qiCost}
                                className={`shrink-0 flex flex-col items-start justify-center bg-blue-950/60 hover:bg-blue-900/80 border ${skill.type === 'ultimate' ? 'border-purple-500/60' : 'border-blue-700/50'} px-5 py-2 rounded-lg transition-colors min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <div className={`font-bold text-sm flex items-center gap-1 ${skill.type === 'ultimate' ? 'text-purple-300' : 'text-blue-200'}`}>
                                    {skill.type === 'ultimate' && <Sparkles className="w-3.5 h-3.5" />}
                                    {skill.name}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px]">
                                    <span className={player.qi < skill.qiCost ? 'text-red-400' : 'text-cyan-300'}>{skill.qiCost} Qi</span>
                                    {skill.currentCooldown > 0 ? (
                                        <span className="text-amber-500 font-bold">CD: {skill.currentCooldown}T</span>
                                    ) : (
                                        <span className="text-gray-400">Siap</span>
                                    )}
                                </div>
                            </button>
                        ))}

                        <div className="flex-1" />

                        <button 
                            onClick={() => handleAction('flee')}
                            disabled={isActionLoading}
                            className="shrink-0 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700 px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors"
                        >
                            <MoveRight className="w-4 h-4" /> Kabur
                        </button>
                    </div>
                ) : (
                    <div className="text-center text-amber-500/50 font-bold py-2 animate-pulse tracking-widest text-sm">
                        MENUNGGU GILIRAN...
                    </div>
                )}
            </div>

            {/* Victory/Loss Overlay */}
            {session.status !== 'ongoing' && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                    <h1 className={`text-5xl font-serif font-black mb-4 ${session.status === 'won' ? 'text-amber-400' : session.status === 'lost' ? 'text-red-600' : 'text-gray-400'}`}>
                        {session.status === 'won' ? 'KEMENANGAN!' : session.status === 'lost' ? 'GUGUR!' : 'MELARIKAN DIRI!'}
                    </h1>
                    {session.rewards && session.status === 'won' && (
                        <div className="bg-gray-900/80 border border-amber-500/50 p-6 rounded-xl flex flex-col items-center shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                            <h3 className="text-amber-200 font-bold mb-3">Rampasan Pertempuran</h3>
                            <div className="flex gap-6 text-sm">
                                <span className="text-blue-300">+{session.rewards.exp} EXP</span>
                                <span className="text-gray-300">+{session.rewards.silver} Keping Perak</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
