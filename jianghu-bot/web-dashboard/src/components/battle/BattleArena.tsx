'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { 
    Sword, Shield, Zap, Skull, Sparkles, MoveRight, 
    Flame, Heart, Trophy, AlertCircle, RefreshCw, X,
    ChevronLeft, Award, Package, Clock, Users, ArrowRight
} from 'lucide-react';

interface BattleArenaProps {
    battleId: string;
    onBattleEnd: (result: string, rewards?: any) => void;
}

export default function BattleArena({ battleId, onBattleEnd }: BattleArenaProps) {
    const [mounted, setMounted] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlayerTurn, setIsPlayerTurn] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [activeSkillId, setActiveSkillId] = useState<string | null>(null);

    // Pokemon-style command mode: 'COMMAND' (Fight / Run) vs 'SKILLS' (Skill grid)
    const [actionMode, setActionMode] = useState<'COMMAND' | 'SKILLS'>('COMMAND');
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

    // Death countdown state (4-hour timer)
    const [deathRemainingSeconds, setDeathRemainingSeconds] = useState<number>(4 * 3600);

    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Initial state fetch
    const fetchState = async () => {
        try {
            const res = await api.get(`/battle/state/${battleId}`);
            if (res.data.session) {
                setSession(res.data.session);
                // Default target is first alive enemy
                const aliveEnemy = res.data.session.enemies?.find((e: any) => !e.isDead);
                if (aliveEnemy) {
                    setSelectedTargetId(aliveEnemy.entityId);
                }
            }
            setLoading(false);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal memuat status arena pertempuran');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchState();
    }, [battleId]);

    // Update isPlayerTurn and auto-scroll logs
    useEffect(() => {
        if (!session) return;

        const isTurn = session.status === 'ongoing' && 
                       Array.isArray(session.turnQueue) && 
                       session.turnQueue.length > 0 && 
                       session.turnQueue[0] === session.player?.entityId;
        setIsPlayerTurn(isTurn);

        // Jika target yang dipilih mati, otomatis pindahkan ke musuh yang masih hidup
        const currentTarget = session.enemies?.find((e: any) => e.entityId === selectedTargetId);
        if (!currentTarget || currentTarget.isDead) {
            const nextAlive = session.enemies?.find((e: any) => !e.isDead);
            if (nextAlive) {
                setSelectedTargetId(nextAlive.entityId);
            }
        }

        // Smooth scroll combat logs to latest
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [session, selectedTargetId]);

    // Timer countdown untuk status lost (4 jam)
    useEffect(() => {
        if (session?.status !== 'lost') return;
        const interval = setInterval(() => {
            setDeathRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [session?.status]);

    const formatCountdown = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
    };

    // Eksekusi aksi pemain secara server-authoritative
    const handleAction = async (actionType: string, skillId?: string) => {
        if (isActionLoading || !session) return;

        setIsActionLoading(true);
        setActiveSkillId(skillId || actionType);
        setError(null);

        try {
            const aliveEnemy = session.enemies.find((e: any) => !e.isDead);
            const tgt = selectedTargetId || (aliveEnemy ? aliveEnemy.entityId : null);

            const res = await api.post(`/battle/action/${battleId}`, {
                actionType,
                skillId,
                targetId: tgt
            });

            if (res.data.session) {
                setSession(res.data.session);
                // Reset kembali ke COMMAND mode setelah aksi sukses
                setActionMode('COMMAND');
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Aksi gagal dieksekusi';
            alert(msg);
        } finally {
            setIsActionLoading(false);
            setActiveSkillId(null);
        }
    };

    if (!mounted || typeof document === 'undefined') return null;

    if (loading) {
        return createPortal(
            <div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col items-center justify-center bg-[#070a14] text-amber-300 gap-4 font-serif">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                <div className="text-lg tracking-wider font-bold">Memasuki Medan Tempur Jianghu...</div>
                <div className="text-xs text-gray-500">Mempersiapkan dantian dan konsentrasi Qi</div>
            </div>,
            document.body
        );
    }

    if (error) {
        return createPortal(
            <div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col items-center justify-center bg-[#070a14] text-red-400 gap-4 p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <div className="text-lg font-bold font-serif">{error}</div>
                <button
                    onClick={() => onBattleEnd('error')}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm transition-colors border border-gray-700"
                >
                    Kembali ke Peta
                </button>
            </div>,
            document.body
        );
    }

    if (!session) return null;

    const player = session.player;
    const enemies = session.enemies || [];
    const enemyQueue = session.enemyQueue || [];
    const allies = session.allies || [];

    // Helper icon rendering
    const renderSkillIcon = (skill: any) => {
        if (skill.icon) return <span className="text-base">{skill.icon}</span>;
        if (skill.isBasicAttack) return <Sword className="w-4 h-4 text-amber-400" />;
        if (skill.type === 'defend') return <Shield className="w-4 h-4 text-blue-400" />;
        if (skill.type === 'heal') return <Heart className="w-4 h-4 text-emerald-400" />;
        return <Flame className="w-4 h-4 text-orange-400" />;
    };

    const renderElementBadge = (elem?: string) => {
        const e = (elem || 'neutral').toLowerCase();
        const map: Record<string, { label: string, color: string, icon: string }> = {
            fire: { label: 'Api', color: 'bg-red-950/80 text-red-400 border-red-800', icon: '🔥' },
            water: { label: 'Air', color: 'bg-blue-950/80 text-blue-400 border-blue-800', icon: '💧' },
            wood: { label: 'Kayu', color: 'bg-emerald-950/80 text-emerald-400 border-emerald-800', icon: '🪵' },
            metal: { label: 'Logam', color: 'bg-amber-950/80 text-amber-400 border-amber-800', icon: '⚔️' },
            earth: { label: 'Tanah', color: 'bg-yellow-950/80 text-yellow-500 border-yellow-800', icon: '🪨' },
            lightning: { label: 'Petir', color: 'bg-purple-950/80 text-purple-400 border-purple-800', icon: '⚡' },
            dark: { label: 'Gelap', color: 'bg-gray-900/80 text-purple-300 border-gray-700', icon: '🌑' },
            light: { label: 'Cahaya', color: 'bg-amber-900/60 text-yellow-200 border-amber-600', icon: '☀️' },
            neutral: { label: 'Fisik', color: 'bg-gray-900/80 text-gray-400 border-gray-800', icon: '⚪' }
        };
        const item = map[e] || map.neutral;
        return (
            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono flex items-center gap-0.5 ${item.color}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
            </span>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col justify-between bg-[#070a14] font-sans select-none overflow-hidden text-gray-200">
            {/* Ambient Background Glow Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-[#070a14] to-[#04060b] pointer-events-none" />

            {/* TOP HEADER BAR */}
            <div className="relative z-10 flex items-center justify-between px-4 py-2.5 bg-black/70 border-b border-amber-900/40 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <span className="text-lg">⚔️</span>
                    <h1 className="font-serif font-bold text-amber-300 text-sm sm:text-base tracking-wide">
                        ARENA PERTEMPURAN JIANGHU
                    </h1>
                    <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">[{session.battleId}]</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-xs font-mono text-gray-400">
                        Ronde: <span className="text-amber-400 font-bold">{session.currentTick || 1}</span>
                    </div>

                    {session.status === 'ongoing' ? (
                        <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isPlayerTurn 
                                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/70 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse' 
                                : 'bg-gray-900/90 text-gray-400 border border-gray-800'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${isPlayerTurn ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                            {isPlayerTurn ? 'GILIRANMU' : 'MEMPROSES...'}
                        </div>
                    ) : (
                        <span className="px-3 py-1 bg-amber-900/60 text-amber-300 border border-amber-600 text-xs rounded-full font-bold">
                            SELESAI
                        </span>
                    )}
                </div>
            </div>

            {/* BATTLEFIELD STAGE */}
            <div className="flex-1 relative z-10 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto gap-3">
                
                {/* 1. ACTIVE ENEMIES SECTION (Supports up to 4 active + queue badge) */}
                <div className="w-full flex flex-col items-center gap-2">
                    {/* Queue Indicator Banner if reserve enemies exist */}
                    {enemyQueue.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-950/70 border border-purple-600/50 rounded-full text-[10px] sm:text-xs text-purple-200 font-mono animate-pulse">
                            <Users className="w-3 h-3 text-purple-400" />
                            <span>Bala Bantuan Mengintai: <strong>+{enemyQueue.length} Musuh</strong> dalam Antrian</span>
                        </div>
                    )}

                    <div className="w-full flex justify-center items-stretch gap-2 sm:gap-4 overflow-x-auto py-1 scrollbar-none">
                        {enemies.map((enemy: any) => {
                            const isSelected = selectedTargetId === enemy.entityId && !enemy.isDead;
                            const isBoss = enemy.tierSize === 'boss';

                            return (
                                <div 
                                    key={enemy.entityId} 
                                    onClick={() => {
                                        if (!enemy.isDead) setSelectedTargetId(enemy.entityId);
                                    }}
                                    className={`relative flex flex-col items-center flex-1 min-w-[130px] max-w-[200px] p-2 rounded-2xl border transition-all duration-300 cursor-pointer ${
                                        enemy.isDead 
                                            ? 'opacity-35 grayscale scale-95 border-gray-900 bg-black/40 cursor-not-allowed' 
                                            : isSelected
                                            ? 'border-amber-400/90 bg-[#121827]/90 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.02]'
                                            : 'border-red-900/50 bg-[#0d121f]/80 hover:border-red-600/80 hover:bg-[#111728]'
                                    }`}
                                >
                                    {/* Dead Overlay */}
                                    {enemy.isDead && (
                                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 rounded-2xl">
                                            <div className="flex flex-col items-center">
                                                <Skull className="w-8 h-8 text-red-600 animate-pulse" />
                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1">Tumbang</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Selection Reticle Badge */}
                                    {isSelected && (
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-black text-[9px] font-bold px-2 py-0.2 rounded-full shadow font-mono flex items-center gap-1">
                                            <span>TARGET</span>
                                        </div>
                                    )}

                                    {/* Monster Avatar */}
                                    <div className={`relative ${isBoss ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-20 h-20 sm:w-24 sm:h-24'} rounded-xl bg-gradient-to-b from-gray-900 to-black border ${isBoss ? 'border-amber-600' : 'border-red-800/80'} mb-1.5 overflow-hidden flex items-center justify-center shadow-inner`}>
                                        {enemy.imageUrl ? (
                                            <img src={enemy.imageUrl} alt={enemy.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={`${isBoss ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'} filter drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]`}>
                                                {isBoss ? '👹' : (enemy.tierSize === 'large' ? '🐉' : '🐺')}
                                            </div>
                                        )}

                                        {/* Level Badge */}
                                        <div className="absolute top-1 right-1 bg-black/80 px-1.5 py-0.2 rounded text-[9px] font-bold text-red-400 border border-red-900/60 font-mono">
                                            Lv.{enemy.level || 1}
                                        </div>
                                    </div>

                                    {/* Monster Name & Element */}
                                    <div className="w-full text-center mb-1">
                                        <h3 className="font-serif font-bold text-xs sm:text-sm text-red-200 truncate">{enemy.name}</h3>
                                        <div className="flex justify-center items-center gap-1 mt-0.5">
                                            {renderElementBadge(enemy.element)}
                                            {isBoss && (
                                                <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-600 px-1 rounded font-bold font-mono">
                                                    BOSS
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* HP Bar */}
                                    <div className="w-full">
                                        <div className="flex justify-between items-center text-[9px] text-gray-400 font-mono mb-0.5">
                                            <span className="text-red-400 font-bold">HP</span>
                                            <span>{enemy.hp}/{enemy.maxHp}</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-red-950">
                                            <div 
                                                className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                                style={{ width: `${Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100))}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stance Bar */}
                                    <div className="w-full mt-1">
                                        <div className="flex justify-between items-center text-[8px] text-purple-300 font-mono mb-0.2">
                                            <span>Stance</span>
                                            <span>{enemy.stance <= 0 ? '⚡ BREAK' : `${enemy.stance}`}</span>
                                        </div>
                                        <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden border border-purple-950">
                                            <div 
                                                className={`h-full transition-all duration-300 ${
                                                    enemy.stance <= 0 ? 'bg-yellow-400 animate-pulse' : 'bg-purple-600'
                                                }`}
                                                style={{ width: `${Math.max(0, Math.min(100, (enemy.stance / (enemy.maxStance || 100)) * 100))}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Status Debuff Badges (Poison, Stun, etc.) */}
                                    {Array.isArray(enemy.debuffs) && enemy.debuffs.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-1 mt-1.5 w-full">
                                            {enemy.debuffs.map((d: any, dIdx: number) => (
                                                <span 
                                                    key={dIdx} 
                                                    title={d.description || d.name}
                                                    className="text-[9px] bg-red-950/90 text-red-300 border border-red-700/80 px-1 py-0.2 rounded font-mono flex items-center gap-0.5"
                                                >
                                                    <span>{d.icon || (d.type === 'poison' ? '☠️' : '⚡')}</span>
                                                    <span>{d.duration}R</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. COMBAT LOGS (COMPACT CENTER DISPLAY) */}
                <div className="w-full max-w-2xl mx-auto h-24 sm:h-28 bg-black/60 border border-amber-900/30 rounded-xl p-2 sm:p-2.5 overflow-y-auto backdrop-blur-sm shadow-inner flex flex-col gap-1 text-xs scrollbar-thin">
                    {session.logs && session.logs.slice(-15).map((log: any, idx: number) => {
                        const isPlayer = log.actor === player?.name;
                        const isSystem = log.actor === 'System';
                        const isAlly = allies.some((a: any) => a.name === log.actor);

                        return (
                            <div 
                                key={idx} 
                                className={`text-[11px] leading-relaxed py-0.5 border-b border-gray-800/30 last:border-b-0 ${
                                    isSystem ? 'text-amber-400 font-serif font-bold italic' :
                                    isPlayer ? 'text-cyan-200' :
                                    isAlly ? 'text-emerald-300' : 'text-red-300'
                                }`}
                            >
                                <span className="font-bold opacity-80">[{log.actor}]:</span> {log.message}
                            </div>
                        );
                    })}
                    <div ref={logsEndRef} />
                </div>

                {/* 3. ALLIES STRIP (If any present: Pets / NPCs) */}
                {allies.length > 0 && (
                    <div className="w-full max-w-2xl mx-auto flex items-center gap-2 overflow-x-auto px-1 py-0.5 scrollbar-none">
                        <span className="text-[10px] text-gray-400 font-mono font-bold uppercase shrink-0">Sekutu:</span>
                        {allies.map((ally: any) => (
                            <div key={ally.entityId} className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-700/40 px-2 py-1 rounded-lg shrink-0">
                                <span className="text-xs">🐾</span>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-emerald-200 font-bold truncate max-w-[90px]">{ally.name}</span>
                                    <div className="w-14 h-1 bg-gray-900 rounded-full overflow-hidden mt-0.5">
                                        <div 
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${Math.max(0, Math.min(100, (ally.hp / ally.maxHp) * 100))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 4. PLAYER BATTLER SECTION */}
                <div className="w-full max-w-2xl mx-auto bg-[#0a0e1a]/95 border border-blue-900/60 rounded-2xl p-3 backdrop-blur-md shadow-2xl flex items-center gap-3">
                    {/* Cultivator Avatar */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-b from-blue-950 to-black border-2 border-blue-600/70 shrink-0 overflow-hidden shadow-[0_0_12px_rgba(59,130,246,0.3)] flex items-center justify-center">
                        {player?.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-2xl sm:text-3xl">🧙‍♂️</div>
                        )}
                        <div className="absolute top-0.5 left-0.5 bg-blue-950/90 px-1 rounded text-[8px] font-mono text-blue-300 font-bold">
                            Lv.{player?.level || 1}
                        </div>
                    </div>

                    {/* Cultivator Vitals & Buffs */}
                    <div className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <h2 className="font-serif font-bold text-blue-200 text-xs sm:text-sm">{player?.name}</h2>
                                {player?.buffs && player.buffs.map((b: any, bIdx: number) => (
                                    <span key={bIdx} className="text-[9px] bg-blue-950 text-blue-300 border border-blue-700 px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5">
                                        <span>{b.icon || '🛡️'}</span>
                                        <span>{b.name}</span>
                                    </span>
                                ))}
                            </div>
                            <div className="text-[10px] text-amber-300 font-mono font-bold">
                                {isPlayerTurn ? '⚡ SIAP BERAKSI' : '⏳ MENUNGGU...'}
                            </div>
                        </div>

                        {/* HP & Qi Bars Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* HP Bar */}
                            <div>
                                <div className="flex justify-between text-[9px] text-gray-400 mb-0.2 font-mono">
                                    <span className="text-emerald-400 font-bold">HP</span>
                                    <span>{player?.hp}/{player?.maxHp}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-emerald-950">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                        style={{ width: `${Math.max(0, Math.min(100, (player?.hp / player?.maxHp) * 100))}%` }}
                                    />
                                </div>
                            </div>

                            {/* Qi Bar */}
                            <div>
                                <div className="flex justify-between text-[9px] text-gray-400 mb-0.2 font-mono">
                                    <span className="text-cyan-400 font-bold">Qi</span>
                                    <span>{player?.qi}/{player?.maxQi}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-cyan-950">
                                    <div 
                                        className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                        style={{ width: `${Math.max(0, Math.min(100, (player?.qi / player?.maxQi) * 100))}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stance Bar */}
                        <div>
                            <div className="flex justify-between text-[8px] text-gray-400 font-mono">
                                <span className="text-amber-400">Stance</span>
                                <span>{player?.stance}/{player?.maxStance}</span>
                            </div>
                            <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden border border-amber-950 mt-0.2">
                                <div 
                                    className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
                                    style={{ width: `${Math.max(0, Math.min(100, (player?.stance / player?.maxStance) * 100))}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* 5. BOTTOM ACTION DOCK (POKEMON / RPG MAKER STYLE COMMAND BAR) */}
            <div className="relative z-20 bg-[#080d19] border-t border-amber-900/50 p-3 sm:p-4 backdrop-blur-md shadow-2xl max-w-full overflow-hidden">
                <div className="max-w-2xl mx-auto w-full">

                    {/* MODE A: COMMAND SELECTION (FIGHT vs RUN) */}
                    {actionMode === 'COMMAND' ? (
                        <div className="grid grid-cols-2 gap-3 w-full animate-in fade-in zoom-in-95 duration-200">
                            {/* Tombol FIGHT */}
                            <button
                                onClick={() => setActionMode('SKILLS')}
                                disabled={!isPlayerTurn || isActionLoading}
                                className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border font-serif font-bold text-sm sm:text-base tracking-wider transition-all shadow-xl ${
                                    (!isPlayerTurn || isActionLoading)
                                        ? 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-500 text-amber-100 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            >
                                <Sword className="w-5 h-5 text-amber-300" />
                                <span>BERTARUNG (FIGHT)</span>
                            </button>

                            {/* Tombol RUN */}
                            <button
                                onClick={() => handleAction('flee')}
                                disabled={!isPlayerTurn || isActionLoading}
                                className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border font-serif font-bold text-sm sm:text-base tracking-wider transition-all shadow-xl ${
                                    (!isPlayerTurn || isActionLoading)
                                        ? 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-gray-900 to-gray-800 hover:bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            >
                                <MoveRight className="w-5 h-5 text-gray-400" />
                                <span>KABUR (RUN)</span>
                            </button>
                        </div>
                    ) : (
                        /* MODE B: SKILL SELECTION (CONTAINED GRID, TIDAK TEMBUS KE SAMPING) */
                        <div className="flex flex-col gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                            {/* Bar Navigasi Kembali */}
                            <div className="flex justify-between items-center pb-1 border-b border-gray-800">
                                <button
                                    onClick={() => setActionMode('COMMAND')}
                                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-serif font-bold transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Kembali ke Menu Aksi</span>
                                </button>
                                <span className="text-[10px] text-gray-400 font-mono">
                                    Target: <strong className="text-red-300">{enemies.find((e: any) => e.entityId === selectedTargetId)?.name || 'Musuh'}</strong>
                                </span>
                            </div>

                            {/* Grid Jurus: Slot 1 Basic Attack Senjata + Slot 2+ Manual Teknik */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                                {player?.skills && player.skills.map((skill: any, idx: number) => {
                                    const canAffordQi = (player.qi || 0) >= (skill.qiCost || 0);
                                    const isCoolingDown = (skill.currentCooldown || 0) > 0;
                                    const isDisabled = !isPlayerTurn || isActionLoading || !canAffordQi || isCoolingDown;
                                    const isCurrentlyCasting = isActionLoading && activeSkillId === skill.skillId;

                                    return (
                                        <button
                                            key={skill.skillId || idx}
                                            onClick={() => handleAction('skill', skill.skillId)}
                                            disabled={isDisabled}
                                            className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                                                skill.isBasicAttack
                                                    ? 'bg-gradient-to-br from-[#1b1c2b] to-[#0e101b] border-amber-500/70 hover:border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                                    : 'bg-gradient-to-br from-[#121827] to-[#090d17] border-blue-900/60 hover:border-blue-500'
                                            } ${
                                                isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:scale-[1.01] active:scale-[0.99]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full mb-1">
                                                <div className="flex items-center gap-1.5 font-serif font-bold text-xs sm:text-sm text-gray-100 truncate">
                                                    {renderSkillIcon(skill)}
                                                    <span className="truncate">{skill.name}</span>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {skill.isBasicAttack ? (
                                                        <span className="text-[8px] bg-amber-950 text-amber-300 border border-amber-700 px-1 rounded font-mono">
                                                            SENJATA
                                                        </span>
                                                    ) : (
                                                        <span className="text-[8px] bg-blue-950 text-blue-300 border border-blue-700 px-1 rounded font-mono">
                                                            KITAB
                                                        </span>
                                                    )}
                                                    {isCurrentlyCasting && <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />}
                                                </div>
                                            </div>

                                            <div className="text-[10px] text-gray-400 line-clamp-1 mb-1 font-sans">
                                                {skill.description}
                                            </div>

                                            <div className="flex items-center justify-between text-[9px] font-mono border-t border-gray-800/80 pt-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={canAffordQi ? 'text-cyan-400 font-bold' : 'text-red-400 font-bold'}>
                                                        {skill.qiCost > 0 ? `⚡ ${skill.qiCost} Qi` : '🆓 0 Qi'}
                                                    </span>
                                                    <span className="text-gray-400">Power: {skill.power}</span>
                                                </div>

                                                {isCoolingDown ? (
                                                    <span className="text-amber-400 font-bold bg-amber-950/90 px-1.5 py-0.2 rounded border border-amber-800">
                                                        ⏳ {skill.currentCooldown}R
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-400 font-bold">Siap</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 6. VICTORY / DEFEAT / FLED MODAL OVERLAY */}
            {session.status !== 'ongoing' && (
                <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300 text-center">
                    
                    {/* MODAL KEMENANGAN (WON) */}
                    {session.status === 'won' && (
                        <div className="flex flex-col items-center max-w-md w-full bg-gradient-to-b from-[#141b2d] to-[#0a0f1d] border-2 border-amber-500/80 p-5 sm:p-6 rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.3)]">
                            <Trophy className="w-14 h-14 sm:w-16 sm:h-16 text-amber-400 mb-2 animate-bounce" />
                            <h2 className="font-serif font-black text-xl sm:text-2xl text-amber-300 tracking-wider mb-1">
                                KEMENANGAN TELAH DIRAIH!
                            </h2>
                            <p className="text-xs text-gray-300 mb-4">
                                Seluruh musuh berhasil ditundukkan. Dantianmu menyerap intisari pengalaman bertarung.
                            </p>

                            {/* Rewards Plate */}
                            {session.rewards && (
                                <div className="w-full bg-black/70 border border-amber-600/40 rounded-xl p-3 sm:p-4 mb-4 flex flex-col gap-3 text-left">
                                    {/* EXP & Perak */}
                                    <div className="grid grid-cols-2 gap-2 text-center pb-2 border-b border-gray-800">
                                        <div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">EXP Kultivasi</div>
                                            <div className="text-base font-bold font-mono text-cyan-400">
                                                +{session.rewards.exp} EXP
                                            </div>
                                        </div>
                                        <div className="border-l border-gray-800 pl-2">
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Keping Perak</div>
                                            <div className="text-base font-bold font-mono text-amber-300">
                                                +{session.rewards.silver} Perak
                                            </div>
                                        </div>
                                    </div>

                                    {/* KungFu XP Senjata */}
                                    {Array.isArray(session.rewards.kungfuExp) && session.rewards.kungfuExp.length > 0 && (
                                        <div className="flex flex-col gap-1 pb-2 border-b border-gray-800">
                                            <div className="text-[10px] text-gray-400 uppercase font-mono flex items-center gap-1">
                                                <Award className="w-3 h-3 text-amber-400" />
                                                <span>Penguasaan Kungfu & Senjata</span>
                                            </div>
                                            {session.rewards.kungfuExp.map((k: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-xs font-mono bg-[#162032] px-2 py-1 rounded">
                                                    <span className="text-amber-200 font-bold">{k.weaponName}</span>
                                                    <span className="text-emerald-400 font-bold">+{k.amount} XP</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Item Loot */}
                                    {Array.isArray(session.rewards.items) && session.rewards.items.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                            <div className="text-[10px] text-gray-400 uppercase font-mono flex items-center gap-1">
                                                <Package className="w-3 h-3 text-cyan-400" />
                                                <span>Barang & Harta Diperoleh</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {session.rewards.items.map((it: any, idx: number) => (
                                                    <span key={idx} className="text-xs bg-[#121927] border border-cyan-800/60 text-cyan-200 px-2 py-0.5 rounded font-mono">
                                                        📦 {it.name} <strong className="text-amber-300">x{it.quantity}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => onBattleEnd(session.status, session.rewards)}
                                className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-serif font-bold text-sm rounded-xl border border-amber-400 shadow-xl transition-all"
                            >
                                ⚔️ Ambil Hadiah & Kembali ke Peta
                            </button>
                        </div>
                    )}

                    {/* MODAL KEKALAHAN / KEMATIAN DENGAN COUNTDOWN 4 JAM (LOST) */}
                    {session.status === 'lost' && (
                        <div className="flex flex-col items-center max-w-md w-full bg-gradient-to-b from-[#250d0d] to-[#100505] border-2 border-red-600/80 p-5 sm:p-6 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.3)]">
                            <Skull className="w-14 h-14 sm:w-16 sm:h-16 text-red-500 mb-2 animate-pulse" />
                            <h2 className="font-serif font-black text-xl sm:text-2xl text-red-400 tracking-wider mb-1">
                                KAMU TELAH TUMBANG!
                            </h2>
                            <p className="text-xs text-gray-300 mb-3">
                                Dantianmu mengalami luka parah akibat serangan fatal lawan.
                            </p>

                            {/* 4-Hour Recovery Countdown Box */}
                            <div className="w-full bg-black/70 border border-red-800/60 rounded-xl p-4 mb-4 flex flex-col items-center gap-2">
                                <div className="text-[11px] text-red-300 font-serif flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-red-400 animate-spin" />
                                    <span>Masa Pemulihan Dantian (4 Jam Istirahat):</span>
                                </div>

                                <div className="text-2xl sm:text-3xl font-mono font-black text-amber-300 tracking-widest bg-[#1a0808] px-4 py-2 rounded-lg border border-red-900 shadow-inner">
                                    {formatCountdown(deathRemainingSeconds)}
                                </div>

                                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                                    Karaktermu harus diam di tempat dan bermeditasi untuk memulihkan meridian yang retak sebelum dapat kembali bertarung di dunia Jianghu.
                                </p>
                            </div>

                            <button
                                onClick={() => onBattleEnd(session.status)}
                                className="w-full py-3 bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white font-serif font-bold text-sm rounded-xl border border-red-500 shadow-xl transition-all"
                            >
                                🩸 Mengakui Kekalahan & Beristirahat
                            </button>
                        </div>
                    )}

                    {/* MODAL KABUR (FLED) */}
                    {session.status === 'fled' && (
                        <div className="flex flex-col items-center max-w-md w-full bg-gradient-to-b from-[#161a24] to-[#0c0f17] border-2 border-gray-600/70 p-5 sm:p-6 rounded-2xl shadow-xl">
                            <MoveRight className="w-14 h-14 text-gray-400 mb-2" />
                            <h2 className="font-serif font-black text-xl text-gray-200 tracking-wider mb-1">
                                BERHASIL MELARIKAN DIRI!
                            </h2>
                            <p className="text-xs text-gray-400 mb-4">
                                Kamu mundur dengan selamat ke jarak yang aman menggunakan ilmu Qinggong.
                            </p>

                            <button
                                onClick={() => onBattleEnd(session.status)}
                                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-serif font-bold text-sm rounded-xl border border-gray-600 shadow-xl transition-all"
                            >
                                Kembali ke Peta
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>,
        document.body
    );
}
