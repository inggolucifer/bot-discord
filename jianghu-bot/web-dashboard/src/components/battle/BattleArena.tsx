'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { 
    Sword, Shield, Zap, Skull, Sparkles, MoveRight, 
    Flame, Heart, Trophy, AlertCircle, RefreshCw, X 
} from 'lucide-react';

interface BattleArenaProps {
    battleId: string;
    onBattleEnd: (result: string, rewards?: any) => void;
}

export default function BattleArena({ battleId, onBattleEnd }: BattleArenaProps) {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlayerTurn, setIsPlayerTurn] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [activeSkillId, setActiveSkillId] = useState<string | null>(null);

    const logsEndRef = useRef<HTMLDivElement>(null);

    // Initial state fetch
    const fetchState = async () => {
        try {
            const res = await api.get(`/battle/state/${battleId}`);
            if (res.data.session) {
                setSession(res.data.session);
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

        // Smooth scroll combat logs to latest
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [session]);

    // Eksekusi aksi pemain secara server-authoritative
    const handleAction = async (actionType: string, skillId?: string, targetId?: string) => {
        if (isActionLoading || !session) return;

        setIsActionLoading(true);
        setActiveSkillId(skillId || actionType);
        setError(null);

        try {
            const aliveEnemy = session.enemies.find((e: any) => !e.isDead);
            const tgt = targetId || (aliveEnemy ? aliveEnemy.entityId : null);

            const res = await api.post(`/battle/action/${battleId}`, {
                actionType,
                skillId,
                targetId: tgt
            });

            if (res.data.session) {
                setSession(res.data.session);
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Aksi gagal dieksekusi';
            alert(msg);
        } finally {
            setIsActionLoading(false);
            setActiveSkillId(null);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-[#070a14] text-amber-300 gap-4 font-serif">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                <div className="text-lg tracking-wider font-bold">Memasuki Medan Tempur Jianghu...</div>
                <div className="text-xs text-gray-500">Mempersiapkan dantian dan konsentrasi Qi</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-[#070a14] text-red-400 gap-4 p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <div className="text-lg font-bold font-serif">{error}</div>
                <button
                    onClick={() => onBattleEnd('error')}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm transition-colors border border-gray-700"
                >
                    Kembali ke Peta
                </button>
            </div>
        );
    }

    if (!session) return null;

    const player = session.player;
    const enemies = session.enemies || [];
    const aliveEnemies = enemies.filter((e: any) => !e.isDead);
    const targetEnemy = aliveEnemies[0] || enemies[0];

    // Helper icon rendering
    const renderSkillIcon = (skill: any) => {
        if (skill.skillId === 'basic_attack') return <Sword className="w-4 h-4 text-amber-400" />;
        if (skill.skillId === 'qi_strike') return <Zap className="w-4 h-4 text-cyan-400" />;
        if (skill.skillId === 'iron_wall' || skill.type === 'defend') return <Shield className="w-4 h-4 text-blue-400" />;
        if (skill.type === 'ultimate') return <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />;
        if (skill.type === 'heal') return <Heart className="w-4 h-4 text-emerald-400" />;
        return <Flame className="w-4 h-4 text-orange-400" />;
    };

    return (
        <div className="relative w-full h-full flex flex-col justify-between bg-[#070a14] font-sans select-none overflow-hidden text-gray-200">
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
            <div className="flex-1 relative z-10 p-3 sm:p-5 flex flex-col justify-between overflow-hidden gap-3">
                
                {/* 1. ENEMY BATTLER SECTION */}
                <div className="w-full flex justify-center items-center">
                    {enemies.map((enemy: any) => (
                        <div 
                            key={enemy.entityId} 
                            className={`relative flex flex-col items-center max-w-sm w-full transition-all duration-300 ${
                                enemy.isDead ? 'opacity-40 grayscale scale-95' : 'animate-in zoom-in-95'
                            }`}
                        >
                            {enemy.isDead && (
                                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 rounded-xl">
                                    <div className="flex flex-col items-center">
                                        <Skull className="w-12 h-12 text-red-600 animate-pulse" />
                                        <span className="text-xs font-bold text-red-400 uppercase tracking-widest mt-1">Tumbang</span>
                                    </div>
                                </div>
                            )}

                            {/* Monster Avatar Card */}
                            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-b from-gray-900 to-black border-2 border-red-800/80 mb-2 overflow-hidden shadow-[0_0_25px_rgba(220,38,38,0.25)] flex items-center justify-center">
                                {enemy.imageUrl ? (
                                    <img src={enemy.imageUrl} alt={enemy.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-5xl filter drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">👹</div>
                                )}

                                {/* Level Badge */}
                                <div className="absolute top-1.5 right-1.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-red-400 border border-red-900/60 font-mono">
                                    Lv.{enemy.level || 1}
                                </div>
                            </div>

                            {/* Enemy Stats Plate */}
                            <div className="w-full bg-[#0e131d]/90 border border-red-900/60 rounded-xl p-2.5 backdrop-blur-md shadow-xl flex flex-col gap-1.5">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-serif font-bold text-red-200 text-sm truncate">{enemy.name}</h3>
                                    <span className="text-[10px] text-gray-400 font-mono">{enemy.hp}/{enemy.maxHp} HP</span>
                                </div>

                                {/* HP Bar */}
                                <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden border border-red-950">
                                    <div 
                                        className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                        style={{ width: `${Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100))}%` }}
                                    />
                                </div>

                                {/* Stance Bar */}
                                <div className="flex justify-between items-center text-[9px] text-purple-300/80 font-mono">
                                    <span>Stance (Keseimbangan)</span>
                                    <span>{enemy.stance <= 0 ? '⚡ BREAK (+50% DMG)' : `${enemy.stance}/${enemy.maxStance}`}</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-purple-950">
                                    <div 
                                        className={`h-full transition-all duration-500 ${
                                            enemy.stance <= 0 ? 'bg-yellow-400 animate-pulse' : 'bg-purple-600'
                                        }`}
                                        style={{ width: `${Math.max(0, Math.min(100, (enemy.stance / enemy.maxStance) * 100))}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 2. COMBAT LOGS (CENTER OVERLAY) */}
                <div className="w-full max-w-2xl mx-auto h-28 sm:h-36 bg-black/60 border border-amber-900/30 rounded-xl p-2.5 overflow-y-auto backdrop-blur-sm shadow-inner flex flex-col gap-1 text-xs">
                    {session.logs && session.logs.map((log: any, idx: number) => {
                        const isPlayer = log.actor === player?.name;
                        const isSystem = log.actor === 'System';
                        return (
                            <div 
                                key={idx} 
                                className={`text-[11px] sm:text-xs leading-relaxed py-0.5 border-b border-gray-800/40 last:border-b-0 ${
                                    isSystem ? 'text-amber-400 font-serif font-bold italic' :
                                    isPlayer ? 'text-cyan-200' : 'text-red-300'
                                }`}
                            >
                                <span className="font-bold opacity-80">[{log.actor}]:</span> {log.message}
                            </div>
                        );
                    })}
                    <div ref={logsEndRef} />
                </div>

                {/* 3. PLAYER BATTLER SECTION */}
                <div className="w-full max-w-2xl mx-auto bg-[#0a0e1a]/90 border border-blue-900/50 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-2xl flex items-center gap-3 sm:gap-4">
                    {/* Cultivator Avatar */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-b from-blue-950 to-black border-2 border-blue-600/70 shrink-0 overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center">
                        {player?.imageUrl ? (
                            <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-3xl sm:text-4xl">🧙‍♂️</div>
                        )}
                        <div className="absolute top-1 left-1 bg-blue-950/80 px-1.5 py-0.2 rounded text-[9px] font-mono text-blue-300 font-bold">
                            Lv.{player?.level || 1}
                        </div>
                    </div>

                    {/* Cultivator Vitals */}
                    <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                            <h2 className="font-serif font-bold text-blue-200 text-sm sm:text-base flex items-center gap-1.5">
                                {player?.name}
                                {player?.buffs && player.buffs.some((b: any) => b.name === 'Kuda-Kuda Besi') && (
                                    <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-600 px-1.5 py-0.2 rounded font-sans font-normal">
                                        🛡️ Kuda-Kuda Besi (-50% DMG)
                                    </span>
                                )}
                            </h2>
                            <div className="text-[10px] text-amber-300/80 font-mono font-bold">
                                {isPlayerTurn ? '⚡ SIAP BERAKSI' : '⏳ MENUNGGU...'}
                            </div>
                        </div>

                        {/* HP & Qi Bars Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* HP Bar */}
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 font-mono">
                                    <span className="text-emerald-400 font-bold">HP (Darah)</span>
                                    <span>{player?.hp}/{player?.maxHp}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-emerald-950">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                        style={{ width: `${Math.max(0, Math.min(100, (player?.hp / player?.maxHp) * 100))}%` }}
                                    />
                                </div>
                            </div>

                            {/* Qi Bar */}
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 font-mono">
                                    <span className="text-cyan-400 font-bold">Qi (Energi)</span>
                                    <span>{player?.qi}/{player?.maxQi}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-cyan-950">
                                    <div 
                                        className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                        style={{ width: `${Math.max(0, Math.min(100, (player?.qi / player?.maxQi) * 100))}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stance Bar */}
                        <div>
                            <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                                <span className="text-amber-400">Stance (Kuda-kuda)</span>
                                <span>{player?.stance}/{player?.maxStance}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-amber-950 mt-0.5">
                                <div 
                                    className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
                                    style={{ width: `${Math.max(0, Math.min(100, (player?.stance / player?.maxStance) * 100))}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* 4. BOTTOM ACTION DOCK / FULL SKILL BAR */}
            <div className="relative z-20 bg-[#080d19] border-t border-amber-900/50 p-2.5 sm:p-4 backdrop-blur-md shadow-2xl">
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-thin">
                    
                    {/* Dynamic Skill Buttons */}
                    {player?.skills && player.skills.map((skill: any) => {
                        const canAffordQi = (player.qi || 0) >= (skill.qiCost || 0);
                        const isCoolingDown = (skill.currentCooldown || 0) > 0;
                        const isDisabled = !isPlayerTurn || isActionLoading || !canAffordQi || isCoolingDown;
                        const isCurrentlyCasting = isActionLoading && activeSkillId === skill.skillId;

                        return (
                            <button
                                key={skill.skillId}
                                onClick={() => handleAction('skill', skill.skillId)}
                                disabled={isDisabled}
                                title={skill.description}
                                className={`shrink-0 flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border transition-all text-left min-w-[130px] sm:min-w-[160px] ${
                                    skill.type === 'ultimate'
                                        ? 'bg-gradient-to-b from-purple-950/70 to-black/80 border-purple-600/70 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                        : skill.type === 'defend'
                                        ? 'bg-gradient-to-b from-blue-950/70 to-black/80 border-blue-600/70 hover:border-blue-400'
                                        : 'bg-gradient-to-b from-gray-900/90 to-black/80 border-amber-900/60 hover:border-amber-500'
                                } ${
                                    isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full mb-1">
                                    <div className="flex items-center gap-1.5 font-serif font-bold text-xs sm:text-sm text-gray-100 truncate">
                                        {renderSkillIcon(skill)}
                                        <span className="truncate">{skill.name}</span>
                                    </div>
                                    {isCurrentlyCasting && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />}
                                </div>

                                <div className="text-[10px] text-gray-400 line-clamp-1 mb-1.5 font-sans">
                                    {skill.description}
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-mono border-t border-gray-800/60 pt-1">
                                    <span className={canAffordQi ? 'text-cyan-400 font-bold' : 'text-red-400 font-bold'}>
                                        {skill.qiCost > 0 ? `⚡ ${skill.qiCost} Qi` : '🆓 0 Qi'}
                                    </span>

                                    {isCoolingDown ? (
                                        <span className="text-amber-400 font-bold bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800">
                                            ⏳ {skill.currentCooldown}R
                                        </span>
                                    ) : (
                                        <span className="text-emerald-400">Siap</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}

                    <div className="flex-1 min-w-[8px]" />

                    {/* Tombol Kabur (Flee) */}
                    <button
                        onClick={() => handleAction('flee')}
                        disabled={!isPlayerTurn || isActionLoading}
                        className={`shrink-0 flex items-center justify-center gap-1.5 px-4 sm:px-5 py-3 rounded-xl border border-gray-700 bg-gray-900/80 hover:bg-gray-800 text-gray-300 font-bold text-xs sm:text-sm transition-all shadow-lg ${
                            (!isPlayerTurn || isActionLoading) ? 'opacity-40 cursor-not-allowed' : 'hover:border-gray-500'
                        }`}
                    >
                        <MoveRight className="w-4 h-4" />
                        <span>Kabur</span>
                    </button>
                </div>
            </div>

            {/* 5. VICTORY / DEFEAT / FLED MODAL OVERLAY */}
            {session.status !== 'ongoing' && (
                <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300 text-center">
                    {session.status === 'won' ? (
                        <div className="flex flex-col items-center max-w-md w-full bg-gradient-to-b from-[#141b2d] to-[#0a0f1d] border-2 border-amber-500/70 p-6 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)]">
                            <Trophy className="w-16 h-16 text-amber-400 mb-2 animate-bounce" />
                            <h2 className="font-serif font-black text-2xl sm:text-3xl text-amber-300 tracking-wider mb-1">
                                KEMENANGAN TELAH DIRAIH!
                            </h2>
                            <p className="text-xs text-gray-300 mb-5">
                                Lawan telah ditumbangkan dengan jurus bela diri yang tangguh.
                            </p>

                            {/* Rewards Plate */}
                            {session.rewards && (
                                <div className="w-full bg-black/60 border border-amber-600/40 rounded-xl p-4 mb-5 flex justify-around text-center">
                                    <div>
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Perolehan EXP</div>
                                        <div className="text-base sm:text-lg font-bold font-mono text-cyan-400">
                                            +{session.rewards.exp} EXP
                                        </div>
                                    </div>
                                    <div className="border-r border-gray-800" />
                                    <div>
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Perolehan Perak</div>
                                        <div className="text-base sm:text-lg font-bold font-mono text-amber-300">
                                            +{session.rewards.silver} Perak
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => onBattleEnd(session.status, session.rewards)}
                                className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-serif font-bold text-sm rounded-xl border border-amber-400 shadow-xl transition-all"
                            >
                                ⚔️ Selesai & Kembali ke Dunia
                            </button>
                        </div>
                    ) : session.status === 'lost' ? (
                        <div className="flex flex-col items-center max-w-md w-full bg-gradient-to-b from-[#220d0d] to-[#0e0606] border-2 border-red-600/70 p-6 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.25)]">
                            <Skull className="w-16 h-16 text-red-500 mb-2 animate-pulse" />
                            <h2 className="font-serif font-black text-2xl sm:text-3xl text-red-400 tracking-wider mb-1">
                                KAMU TELAH TUMBANG!
                            </h2>
                            <p className="text-xs text-gray-300 mb-5">
                                Tenagamu habis dan dantianmu terluka. Beristirahatlah untuk memulihkan diri.
                            </p>

                            <button
                                onClick={() => onBattleEnd(session.status)}
                                className="w-full py-3 bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white font-serif font-bold text-sm rounded-xl border border-red-500 shadow-xl transition-all"
                            >
                                🩸 Pulihkan Diri & Kembali
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center max-w-md w-full bg-gradient-to-b from-[#161a24] to-[#0c0f17] border-2 border-gray-600/70 p-6 rounded-2xl shadow-xl">
                            <MoveRight className="w-16 h-16 text-gray-400 mb-2" />
                            <h2 className="font-serif font-black text-2xl text-gray-200 tracking-wider mb-1">
                                BERHASIL MELOLOSKAN DIRI!
                            </h2>
                            <p className="text-xs text-gray-400 mb-5">
                                Kamu mundur dengan selamat ke jarak yang aman dari ancaman.
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
        </div>
    );
}
