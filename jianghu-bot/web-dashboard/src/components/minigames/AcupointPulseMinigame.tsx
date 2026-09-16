'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import { Sparkles, Heart, Activity, CheckCircle, XCircle, Volume2, VolumeX } from 'lucide-react';

interface AcupointPulseMinigameProps {
    onClose: () => void;
    onCompleted?: (result: any) => void;
}

const ACUPOINT_NODES = [
    { id: 1, name: 'Baihui (Puncak Kepala)', x: 50, y: 12 },
    { id: 2, name: 'Tiantu (Pangkal Leher)', x: 50, y: 22 },
    { id: 3, name: 'Shanzhong (Pusat Dada)', x: 50, y: 34 },
    { id: 4, name: 'Zhongwan (Ulu Hati)', x: 50, y: 46 },
    { id: 5, name: 'Qihai (Lautan Qi)', x: 50, y: 56 },
    { id: 6, name: 'Guanyuan (Gerbang Esensi)', x: 50, y: 66 },
    { id: 7, name: 'Hegu Kanan (Lembah Harimau)', x: 26, y: 42 },
    { id: 8, name: 'Quchi Kanan (Kolam Lekukan)', x: 34, y: 32 },
    { id: 9, name: 'Hegu Kiri (Lembah Harimau)', x: 74, y: 42 },
    { id: 10, name: 'Quchi Kiri (Kolam Lekukan)', x: 66, y: 32 },
    { id: 11, name: 'Zusanli Kanan (Tiga Li Kaki)', x: 42, y: 80 },
    { id: 12, name: 'Yongquan (Mata Air Memancar)', x: 50, y: 92 }
];

export default function AcupointPulseMinigame({ onClose, onCompleted }: AcupointPulseMinigameProps) {
    const [currentNodeIndex, setCurrentNodeIndex] = useState<number>(0);
    const [pulseProgress, setPulseProgress] = useState<number>(0); // 0 to 100
    const [score, setScore] = useState<number>(0);
    const [perfectHits, setPerfectHits] = useState<number>(0);
    const [goodHits, setGoodHits] = useState<number>(0);
    const [missHits, setMissHits] = useState<number>(0);
    const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [finalReport, setFinalReport] = useState<any>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    const animFrameRef = useRef<any>(null);
    const lastTimeRef = useRef<number>(0);
    const pulseDuration = 1800; // ms per node

    useEffect(() => {
        let startTime = performance.now();
        lastTimeRef.current = startTime;

        const loop = (now: number) => {
            if (isFinished) return;
            const elapsed = now - startTime;
            const progress = (elapsed % pulseDuration) / pulseDuration * 100;
            setPulseProgress(progress);

            // Auto-advance if player missed clicking
            const newIndex = Math.floor(elapsed / pulseDuration);
            if (newIndex >= ACUPOINT_NODES.length) {
                handleFinish();
                return;
            }

            if (newIndex !== currentNodeIndex) {
                setCurrentNodeIndex(newIndex);
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [isFinished, currentNodeIndex]);

    const handleTapNode = (nodeIndex: number) => {
        if (isFinished || nodeIndex !== currentNodeIndex) return;

        // Perfect window: progress between 40% and 60%
        // Good window: progress between 25% and 75%
        const diffFromTarget = Math.abs(pulseProgress - 50);

        if (diffFromTarget <= 12) {
            // PERFECT HIT (toleransi ~150ms)
            setScore(s => s + 100);
            setPerfectHits(p => p + 1);
            setFeedback({ text: 'PERFECT! (Resonansi Murni)', color: 'text-amber-300' });
            sound.playQiPulse(true);
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
        } else if (diffFromTarget <= 25) {
            // GOOD HIT
            setScore(s => s + 60);
            setGoodHits(g => g + 1);
            setFeedback({ text: 'GOOD! (Qi Selaras)', color: 'text-emerald-300' });
            sound.playQiPulse(false);
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
        } else {
            // MISS
            setMissHits(m => m + 1);
            setFeedback({ text: 'MISS! (Napas Goyah)', color: 'text-red-400' });
        }

        setTimeout(() => setFeedback(null), 700);
    };

    const handleFinish = async () => {
        setIsFinished(true);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        const totalAttempts = Math.max(1, perfectHits + goodHits + missHits);
        const accuracy = Math.round(((perfectHits * 1.0 + goodHits * 0.6) / ACUPOINT_NODES.length) * 100);

        setSubmitting(true);
        try {
            const res = await api.post('/minigame/acupoint/submit', {
                accuracyPercent: accuracy,
                perfectHits,
                totalNodes: ACUPOINT_NODES.length
            });
            setFinalReport(res.data);
            if (onCompleted) onCompleted(res.data);
        } catch (err) {
            console.error('Gagal submit akupunktur:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const activeNode = ACUPOINT_NODES[currentNodeIndex] || ACUPOINT_NODES[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#0e141f] border border-amber-900/60 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-[#141c2c] px-5 py-3 border-b border-[#243147] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-amber-400 animate-pulse" />
                        <h3 className="font-serif font-bold text-amber-200 text-base">Resonansi Titik Akupunktur</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-sm font-semibold px-2 py-1 rounded-md"
                    >
                        ✕
                    </button>
                </div>

                {/* Body Area */}
                <div className="p-5 flex flex-col items-center">
                    {!isFinished ? (
                        <>
                            <p className="text-xs text-gray-300 text-center mb-3">
                                Sentuh simpul meridian saat cincin pulsa Qi berimpit sempurna dengan titik akupunktur.
                            </p>

                            {/* Diagram Siluet Tubuh */}
                            <div className="relative w-72 h-80 bg-[#070a10] border border-cyan-900/40 rounded-xl overflow-hidden shadow-inner flex items-center justify-center select-none">
                                {/* Garis-garis Meridian Latar */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 100 100">
                                    <line x1="50" y1="12" x2="50" y2="92" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
                                    <line x1="50" y1="34" x2="26" y2="42" stroke="#38bdf8" strokeWidth="0.8" />
                                    <line x1="50" y1="34" x2="74" y2="42" stroke="#38bdf8" strokeWidth="0.8" />
                                    <line x1="50" y1="66" x2="42" y2="80" stroke="#38bdf8" strokeWidth="0.8" />
                                </svg>

                                {/* Simpul-simpul Akupunktur */}
                                {ACUPOINT_NODES.map((node, idx) => {
                                    const isActive = idx === currentNodeIndex;
                                    const isPast = idx < currentNodeIndex;

                                    return (
                                        <div
                                            key={node.id}
                                            onClick={() => handleTapNode(idx)}
                                            style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer transition-all flex items-center justify-center
                                                ${isActive
                                                    ? 'w-10 h-10 bg-amber-500/30 border-2 border-amber-400 z-20 shadow-[0_0_16px_rgba(251,191,36,0.8)]'
                                                    : isPast
                                                        ? 'w-5 h-5 bg-emerald-900/60 border border-emerald-500/80 z-10'
                                                        : 'w-4 h-4 bg-gray-800/80 border border-gray-600/60 opacity-60 z-10'}`}
                                        >
                                            {/* Cincin Pulsa Animasi saat Aktif */}
                                            {isActive && (
                                                <div
                                                    className="absolute rounded-full border-2 border-cyan-400 pointer-events-none animate-ping"
                                                    style={{
                                                        width: `${Math.max(16, 50 - pulseProgress * 0.3)}px`,
                                                        height: `${Math.max(16, 50 - pulseProgress * 0.3)}px`,
                                                        opacity: 1 - Math.abs(pulseProgress - 50) / 50
                                                    }}
                                                />
                                            )}
                                            <span className="text-[8px] font-bold text-white pointer-events-none">{node.id}</span>
                                        </div>
                                    );
                                })}

                                {/* Feedback Banner */}
                                {feedback && (
                                    <div className={`absolute top-4 font-bold text-sm bg-black/80 px-3 py-1 rounded-full shadow-lg ${feedback.color} animate-bounce`}>
                                        {feedback.text}
                                    </div>
                                )}
                            </div>

                            {/* Node Target Info & Button */}
                            <div className="w-full mt-4 flex flex-col items-center">
                                <div className="text-xs text-amber-200 font-medium mb-2">
                                    Simpul Saat Ini: <span className="font-bold text-white">{activeNode.name}</span>
                                </div>
                                <button
                                    onClick={() => handleTapNode(currentNodeIndex)}
                                    className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 active:scale-95 text-white font-serif font-bold py-3 rounded-xl shadow-lg border border-amber-500/50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4 text-amber-200" />
                                    Selaraskan Napas Qi (Sentuh)
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Report Dialog */
                        <div className="w-full flex flex-col items-center text-center py-3">
                            <div className="w-14 h-14 rounded-full bg-amber-900/60 border-2 border-amber-500 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                                <Sparkles className="w-7 h-7 text-amber-300" />
                            </div>
                            <h4 className="font-serif font-bold text-lg text-amber-200 mb-1">Hasil Pelatihan Akupunktur</h4>
                            <p className="text-xs text-gray-300 mb-4 max-w-sm">
                                {finalReport?.message || 'Latihan selesai disinkronkan ke tubuhmu.'}
                            </p>

                            <div className="grid grid-cols-3 gap-2 w-full mb-5">
                                <div className="bg-[#141b28] border border-[#27354c] p-2.5 rounded-lg">
                                    <span className="text-[10px] text-gray-400 block">Perfect</span>
                                    <strong className="text-amber-400 text-base">{perfectHits}</strong>
                                </div>
                                <div className="bg-[#141b28] border border-[#27354c] p-2.5 rounded-lg">
                                    <span className="text-[10px] text-gray-400 block">Good</span>
                                    <strong className="text-emerald-400 text-base">{goodHits}</strong>
                                </div>
                                <div className="bg-[#141b28] border border-[#27354c] p-2.5 rounded-lg">
                                    <span className="text-[10px] text-gray-400 block">Skor Kemahiran</span>
                                    <strong className="text-cyan-400 text-base">+{finalReport?.neigongPoints || score}</strong>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full bg-[#1b2537] hover:bg-[#25334d] text-amber-200 font-bold py-2.5 rounded-xl border border-amber-900/60 transition-colors text-sm"
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
