'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import { Flame, Snowflake, Sparkles, AlertTriangle, CheckCircle, Wind } from 'lucide-react';

interface CrucibleEquilibriumMinigameProps {
    onClose: () => void;
    onCompleted?: (result: any) => void;
}

export default function CrucibleEquilibriumMinigame({ onClose, onCompleted }: CrucibleEquilibriumMinigameProps) {
    const [temperature, setTemperature] = useState<number>(50); // 0 (Extreme Yin) to 100 (Extreme Yang)
    const [secondsLeft, setSecondsLeft] = useState<number>(30);
    const [timeInEquilibrium, setTimeInEquilibrium] = useState<number>(0);
    const [consecutiveOutOfZone, setConsecutiveOutOfZone] = useState<number>(0);
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [isExploded, setIsExploded] = useState<boolean>(false);
    const [report, setReport] = useState<any>(null);

    const timerRef = useRef<any>(null);
    const simRef = useRef<any>(null);

    // Green Equilibrium Zone: 40 to 60
    const ZONE_MIN = 40;
    const ZONE_MAX = 60;

    useEffect(() => {
        // Main countdown timer (30s)
        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    finishAlchemy(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Simulation loop: 100ms ticks
        simRef.current = setInterval(() => {
            setTemperature(temp => {
                // Natural random thermal drift (-2 to +2)
                const drift = (Math.random() - 0.5) * 4.5;
                const newTemp = Math.min(100, Math.max(0, temp + drift));

                // Check equilibrium
                const inZone = newTemp >= ZONE_MIN && newTemp <= ZONE_MAX;
                if (inZone) {
                    setTimeInEquilibrium(t => t + 0.1);
                    setConsecutiveOutOfZone(0);
                } else {
                    setConsecutiveOutOfZone(c => {
                        const updated = c + 0.1;
                        if (updated >= 3.5) {
                            // Ledakan kuali!
                            triggerExplosion();
                        }
                        return updated;
                    });
                }

                return newTemp;
            });
        }, 100);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (simRef.current) clearInterval(simRef.current);
        };
    }, []);

    // Keyboard controls: A / Panah Kiri = Yin, D / Panah Kanan = Yang
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished) return;
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
                e.preventDefault();
                handleApplyYin();
            } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
                e.preventDefault();
                handleApplyYang();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFinished]);

    const handleApplyYang = () => {
        if (isFinished) return;
        sound.playCauldronSizzle();
        setTemperature(t => Math.min(100, t + 6));
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    };

    const handleApplyYin = () => {
        if (isFinished) return;
        sound.playCauldronSizzle();
        setTemperature(t => Math.max(0, t - 6));
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    };

    const triggerExplosion = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (simRef.current) clearInterval(simRef.current);
        setIsExploded(true);
        finishAlchemy(true);
    };

    const finishAlchemy = async (exploded: boolean) => {
        setIsFinished(true);
        if (timerRef.current) clearInterval(timerRef.current);
        if (simRef.current) clearInterval(simRef.current);

        try {
            const res = await api.post('/minigame/crucible/submit', {
                durationInEquilibriumSec: timeInEquilibrium,
                isExploded: exploded
            });
            setReport(res.data);
            if (onCompleted) onCompleted(res.data);
        } catch (err) {
            console.error('Gagal submit alkimia:', err);
        }
    };

    const inZone = temperature >= ZONE_MIN && temperature <= ZONE_MAX;
    const warningActive = consecutiveOutOfZone >= 1.5;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none">
            <div className="bg-[#0e141f] border border-amber-900/60 rounded-2xl w-full max-w-md landscape:max-w-xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-[#181a24] px-4 py-2.5 landscape:py-1.5 border-b border-[#282d3f] flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                        <h3 className="font-serif font-bold text-amber-200 text-sm sm:text-base">Pengendalian Tungku Yin-Yang</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xs sm:text-sm font-semibold px-2 py-1"
                    >
                        ✕
                    </button>
                </div>

                {/* Main Content */}
                <div className="p-3.5 sm:p-5 landscape:p-3 flex flex-col items-center">
                    {!isFinished ? (
                        <>
                            <div className="flex justify-between w-full text-xs font-mono text-gray-300 mb-1.5">
                                <span>Waktu: <strong className="text-amber-300 font-bold">{secondsLeft}s</strong></span>
                                <span>Stabilitas Hijau: <strong className="text-emerald-400 font-bold">{Math.round(timeInEquilibrium)}s / 30s</strong></span>
                            </div>

                            {/* Warning if out of balance */}
                            {warningActive && (
                                <div className="w-full bg-red-950/80 border border-red-600/80 text-red-200 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 mb-2 animate-pulse">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span>Bahaya! Suhu kuali tidak stabil! Ledakan dalam {(3.5 - consecutiveOutOfZone).toFixed(1)}s!</span>
                                </div>
                            )}

                            {/* Thermometer Gauge */}
                            <div className="relative w-full h-8 sm:h-10 landscape:h-8 bg-[#0a0d14] rounded-xl border border-gray-700 overflow-hidden shadow-inner my-2 sm:my-3 landscape:my-1.5">
                                {/* Yin Zone (Left, Blue) */}
                                <div className="absolute left-0 top-0 bottom-0 w-[40%] bg-blue-950/60 border-r border-blue-600/30 flex items-center pl-2">
                                    <Snowflake className="w-3.5 h-3.5 text-blue-400 opacity-60" />
                                    <span className="text-[9px] text-blue-300 ml-1 font-mono">Dingin (Yin)</span>
                                </div>

                                {/* Equilibrium Zone (Center, Green) */}
                                <div className="absolute left-[40%] top-0 bottom-0 w-[20%] bg-emerald-950/80 border-x-2 border-emerald-500/80 flex items-center justify-center">
                                    <span className="text-[9px] text-emerald-300 font-bold tracking-wider uppercase">Seimbang</span>
                                </div>

                                {/* Yang Zone (Right, Red) */}
                                <div className="absolute left-[60%] top-0 bottom-0 w-[40%] bg-red-950/60 border-l border-red-600/30 flex items-center justify-end pr-2">
                                    <span className="text-[9px] text-amber-300 mr-1 font-mono">Panas (Yang)</span>
                                    <Flame className="w-3.5 h-3.5 text-amber-400 opacity-60" />
                                </div>

                                {/* Thermal Needle Indicator */}
                                <div
                                    className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_12px_#ffffff] transition-all duration-75 -translate-x-1/2 z-20"
                                    style={{ left: `${temperature}%` }}
                                >
                                    <div className="w-2.5 h-2.5 bg-amber-400 rounded-full -translate-x-[2px] -translate-y-0.5 shadow-md" />
                                </div>
                            </div>

                            {/* Control Levers */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full mt-2 landscape:mt-1">
                                <button
                                    onClick={handleApplyYin}
                                    className="p-2.5 sm:p-3.5 landscape:py-2 bg-gradient-to-b from-blue-900 to-blue-950 hover:from-blue-800 hover:to-blue-900 active:scale-95 text-blue-200 rounded-xl border border-blue-600/50 shadow-lg flex flex-col items-center gap-1 transition-all"
                                >
                                    <Snowflake className="w-5 h-5 landscape:w-4 landscape:h-4 text-blue-400" />
                                    <span className="font-serif font-bold text-xs">Tuas Es (Yin)</span>
                                    <span className="text-[9px] text-blue-300/80 hidden sm:inline">Turunkan Suhu (A / ←)</span>
                                </button>

                                <button
                                    onClick={handleApplyYang}
                                    className="p-2.5 sm:p-3.5 landscape:py-2 bg-gradient-to-b from-amber-800 to-red-950 hover:from-amber-700 hover:to-red-900 active:scale-95 text-amber-200 rounded-xl border border-amber-600/50 shadow-lg flex flex-col items-center gap-1 transition-all"
                                >
                                    <Flame className="w-5 h-5 landscape:w-4 landscape:h-4 text-amber-400" />
                                    <span className="font-serif font-bold text-xs">Tuas Api (Yang)</span>
                                    <span className="text-[9px] text-amber-300/80 hidden sm:inline">Naikkan Hawa (D / →)</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Report Dialog */
                        <div className="w-full flex flex-col items-center text-center py-2">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-xl ${isExploded ? 'bg-red-950 border-2 border-red-500' : 'bg-emerald-950 border-2 border-emerald-500'}`}>
                                {isExploded ? <AlertTriangle className="w-6 h-6 text-red-400" /> : <Sparkles className="w-6 h-6 text-emerald-300" />}
                            </div>
                            <h4 className="font-serif font-bold text-base sm:text-lg text-amber-200 mb-1">
                                {isExploded ? 'Ledakan Kuali Peleburan!' : 'Peleburan Alkimia Selesai'}
                            </h4>
                            <p className="text-xs text-gray-300 mb-3">
                                {report?.message || 'Proses alkimia selesai.'}
                            </p>

                            {!isExploded && (
                                <div className="grid grid-cols-2 gap-2 w-full mb-3">
                                    <div className="bg-[#141b28] border border-[#27354c] p-2 sm:p-3 rounded-lg">
                                        <span className="text-[10px] text-gray-400 block">Kemurnian Pil</span>
                                        <strong className="text-emerald-400 text-base sm:text-lg">{report?.purityPercent || 0}%</strong>
                                    </div>
                                    <div className="bg-[#141b28] border border-[#27354c] p-2 sm:p-3 rounded-lg">
                                        <span className="text-[10px] text-gray-400 block">Bonus Qi Diperoleh</span>
                                        <strong className="text-amber-400 text-base sm:text-lg">+{report?.qiBonus || 50}</strong>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full bg-[#1b2537] hover:bg-[#25334d] text-amber-200 font-bold py-2 sm:py-2.5 rounded-xl border border-amber-900/60 transition-colors text-xs sm:text-sm"
                            >
                                Selesai & Tutup
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
