'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import { Swords, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Flame, Shield, CheckCircle } from 'lucide-react';

interface KataQteMinigameProps {
    discipline?: 'sword' | 'saber' | 'fist' | 'finger' | 'staff';
    onClose: () => void;
    onCompleted?: (result: any) => void;
}

const DIRECTIONS = [
    { key: 'ArrowUp', alias: 'w', label: 'Tebasan Atas', icon: ArrowUp, symbol: '↑' },
    { key: 'ArrowDown', alias: 's', label: 'Tusukan Bawah', icon: ArrowDown, symbol: '↓' },
    { key: 'ArrowLeft', alias: 'a', label: 'Sabetan Kiri', icon: ArrowLeft, symbol: '←' },
    { key: 'ArrowRight', alias: 'd', label: 'Sapuan Kanan', icon: ArrowRight, symbol: '→' }
];

export default function KataQteMinigame({ discipline = 'sword', onClose, onCompleted }: KataQteMinigameProps) {
    const [currentTarget, setCurrentTarget] = useState<any>(null);
    const [timeLeftPercent, setTimeLeftPercent] = useState<number>(100);
    const [streakCount, setStreakCount] = useState<number>(0);
    const [successCount, setSuccessCount] = useState<number>(0);
    const [totalRounds, setTotalRounds] = useState<number>(10);
    const [currentRound, setCurrentRound] = useState<number>(1);
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [report, setReport] = useState<any>(null);
    const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);

    const timerRef = useRef<any>(null);
    const TIME_LIMIT_MS = 1200; // 1.2 detik sesuai cetak biru

    const pickNextTarget = () => {
        const rand = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        setCurrentTarget(rand);
        setTimeLeftPercent(100);
    };

    useEffect(() => {
        pickNextTarget();
    }, []);

    useEffect(() => {
        if (isFinished || !currentTarget) return;

        const intervalStep = 50;
        const decrement = (intervalStep / TIME_LIMIT_MS) * 100;

        timerRef.current = setInterval(() => {
            setTimeLeftPercent(prev => {
                if (prev <= decrement) {
                    handleFail();
                    return 100;
                }
                return prev - decrement;
            });
        }, intervalStep);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentTarget, isFinished]);

    // Handle Keyboard input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished || !currentTarget) return;
            const pressed = e.key;

            if (pressed === currentTarget.key || pressed.toLowerCase() === currentTarget.alias) {
                handleSuccess();
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(pressed.toLowerCase())) {
                handleFail();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTarget, isFinished, streakCount, currentRound]);

    const handleSuccess = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        sound.playSwordChime(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);

        const newStreak = streakCount + 1;
        setStreakCount(newStreak);
        setSuccessCount(s => s + 1);
        setFeedback({ text: `KOMBO ${newStreak}x!`, color: 'text-amber-300' });

        advanceRound(newStreak, successCount + 1);
    };

    const handleFail = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        sound.playSwordChime(false);
        setStreakCount(0);
        setFeedback({ text: 'TERLAMBAT!', color: 'text-red-400' });

        advanceRound(0, successCount);
    };

    const advanceRound = (currentStreak: number, currentSuccesses: number) => {
        if (currentRound >= totalRounds) {
            finishMinigame(currentStreak, currentSuccesses);
        } else {
            setCurrentRound(r => r + 1);
            setTimeout(() => {
                setFeedback(null);
                pickNextTarget();
            }, 300);
        }
    };

    const finishMinigame = async (finalStreak: number, finalSuccesses: number) => {
        setIsFinished(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const res = await api.post('/minigame/kata/submit', {
                discipline,
                streakCount: finalStreak,
                successCount: finalSuccesses
            });
            setReport(res.data);
            if (onCompleted) onCompleted(res.data);
        } catch (err) {
            console.error('Gagal submit kata QTE:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none">
            <div className="bg-[#0e141f] border border-amber-900/60 rounded-2xl w-full max-w-md landscape:max-w-xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-[#181a24] px-4 py-2.5 landscape:py-1.5 border-b border-[#282d3f] flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <Swords className="w-4 h-4 text-amber-500 animate-pulse" />
                        <h3 className="font-serif font-bold text-amber-200 text-sm sm:text-base">Rangkaian Kuda-Kuda Silat (QTE)</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xs sm:text-sm font-semibold px-2 py-1"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-5 landscape:p-3 flex flex-col items-center">
                    {!isFinished ? (
                        <>
                            {/* Round & Streak Counter */}
                            <div className="flex justify-between w-full text-xs font-mono text-gray-400 mb-1.5">
                                <span>Jurus: <strong className="text-white">{currentRound} / {totalRounds}</strong></span>
                                <span className="flex items-center gap-1 text-amber-400 font-bold">
                                    <Flame className="w-3.5 h-3.5 fill-amber-400" /> Combo: {streakCount}x
                                </span>
                            </div>

                            {/* Timer Progress Bar */}
                            <div className="w-full h-1.5 sm:h-2 bg-gray-800 rounded-full overflow-hidden mb-3 landscape:mb-2 border border-gray-700">
                                <div
                                    className={`h-full transition-all duration-75 ${timeLeftPercent > 40 ? 'bg-amber-400' : 'bg-red-500'}`}
                                    style={{ width: `${timeLeftPercent}%` }}
                                />
                            </div>

                            {/* Play Area: Side-by-side in landscape */}
                            <div className="flex flex-col landscape:flex-row items-center justify-around w-full gap-3 landscape:gap-4 my-1">
                                {/* Stance Vector Circle */}
                                <div className="relative w-36 h-36 sm:w-44 sm:h-44 landscape:w-32 landscape:h-32 rounded-full border-4 border-amber-900/50 bg-[#121622] flex flex-col items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.2)] select-none shrink-0">
                                    {currentTarget && (
                                        <>
                                            <div className="w-14 h-14 sm:w-18 sm:h-18 landscape:w-12 landscape:h-12 rounded-full bg-gradient-to-br from-amber-600 to-red-600 flex items-center justify-center text-white shadow-xl animate-pulse">
                                                <span className="text-2xl sm:text-3xl landscape:text-2xl font-extrabold">{currentTarget.symbol}</span>
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-serif font-bold text-amber-200 mt-1 sm:mt-1.5">
                                                {currentTarget.label}
                                            </span>
                                        </>
                                    )}

                                    {feedback && (
                                        <div className={`absolute inset-0 flex items-center justify-center bg-black/70 rounded-full text-sm sm:text-base font-bold ${feedback.color} backdrop-blur-xs`}>
                                            {feedback.text}
                                        </div>
                                    )}
                                </div>

                                {/* Directional Touch Buttons for Mobile / Mouse */}
                                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full max-w-[200px] landscape:max-w-[180px]">
                                    <div />
                                    <button
                                        onClick={() => currentTarget?.key === 'ArrowUp' ? handleSuccess() : handleFail()}
                                        className="p-2 sm:p-3 landscape:p-1.5 bg-[#1b2333] hover:bg-amber-900 active:scale-90 text-amber-300 rounded-xl border border-gray-700 flex items-center justify-center shadow-md text-base sm:text-lg font-bold"
                                    >
                                        ↑
                                    </button>
                                    <div />
                                    <button
                                        onClick={() => currentTarget?.key === 'ArrowLeft' ? handleSuccess() : handleFail()}
                                        className="p-2 sm:p-3 landscape:p-1.5 bg-[#1b2333] hover:bg-amber-900 active:scale-90 text-amber-300 rounded-xl border border-gray-700 flex items-center justify-center shadow-md text-base sm:text-lg font-bold"
                                    >
                                        ←
                                    </button>
                                    <div className="flex items-center justify-center text-[9px] text-gray-500 font-mono">
                                        WASD
                                    </div>
                                    <button
                                        onClick={() => currentTarget?.key === 'ArrowRight' ? handleSuccess() : handleFail()}
                                        className="p-2 sm:p-3 landscape:p-1.5 bg-[#1b2333] hover:bg-amber-900 active:scale-90 text-amber-300 rounded-xl border border-gray-700 flex items-center justify-center shadow-md text-base sm:text-lg font-bold"
                                    >
                                        →
                                    </button>
                                    <div />
                                    <button
                                        onClick={() => currentTarget?.key === 'ArrowDown' ? handleSuccess() : handleFail()}
                                        className="p-2 sm:p-3 landscape:p-1.5 bg-[#1b2333] hover:bg-amber-900 active:scale-90 text-amber-300 rounded-xl border border-gray-700 flex items-center justify-center shadow-md text-base sm:text-lg font-bold"
                                    >
                                        ↓
                                    </button>
                                    <div />
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Result Dialog */
                        <div className="w-full flex flex-col items-center text-center py-2">
                            <div className="w-12 h-12 rounded-full bg-red-900/50 border-2 border-red-500 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                <Swords className="w-6 h-6 text-red-300" />
                            </div>
                            <h4 className="font-serif font-bold text-base sm:text-lg text-amber-200 mb-1">Hasil Latihan Silat</h4>
                            <p className="text-xs text-gray-300 mb-3">
                                {report?.message || 'Rangkaian jurus selesai dilatih.'}
                            </p>

                            <div className="grid grid-cols-2 gap-2 w-full mb-5">
                                <div className="bg-[#141b28] border border-[#27354c] p-3 rounded-lg">
                                    <span className="text-[10px] text-gray-400 block">Jurus Sukses</span>
                                    <strong className="text-emerald-400 text-lg">{successCount} / {totalRounds}</strong>
                                </div>
                                <div className="bg-[#141b28] border border-[#27354c] p-3 rounded-lg">
                                    <span className="text-[10px] text-gray-400 block">Kemahiran Ditambah</span>
                                    <strong className="text-amber-400 text-lg">+{report?.proficiencyPoints || 100}</strong>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full bg-[#1b2537] hover:bg-[#25334d] text-amber-200 font-bold py-2.5 rounded-xl border border-amber-900/60 transition-colors text-sm"
                            >
                                Tutup Latihan
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
