"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function AlchemyMinigame({ onComplete, onCancel }: { onComplete: (telemetry: any) => void, onCancel: () => void }) {
    const [stability, setStability] = useState(0); // -100 to 100
    const [timeLeft, setTimeLeft] = useState(18);
    const [materialWindow, setMaterialWindow] = useState<{ active: boolean, timeRemaining: number }>({ active: false, timeRemaining: 0 });

    const requestRef = useRef<number>(0);
    const lastTime = useRef(performance.now());

    const driftVelocity = useRef(0);
    const driftTarget = useRef(0);
    const driftTimer = useRef(0);

    const matWindowTimer = useRef(3500); // starts after 3.5s
    const matsAdded = useRef(0);
    const maxMats = 5;

    const telemetryRef = useRef({
        timeSafe: 0,
        totalTime: 0,
        matScores: [] as number[],
        startTime: performance.now()
    });

    const isFinished = useRef(false);

    useEffect(() => {
        const loop = (time: number) => {
            if (isFinished.current) return;
            const deltaTime = time - lastTime.current;
            lastTime.current = time;

            // Timer
            setTimeLeft(prev => {
                const next = prev - (deltaTime / 1000);
                if (next <= 0) {
                    handleFinish();
                    return 0;
                }
                return next;
            });

            // Stability Drift (Erratic)
            driftTimer.current -= deltaTime;
            if (driftTimer.current <= 0) {
                driftTimer.current = 500 + Math.random() * 800;
                // As time goes down, it gets wilder
                const wildness = 1 + ((18 - timeLeft) / 18) * 1.5;
                driftTarget.current = (Math.random() - 0.5) * 150 * wildness;
            }

            driftVelocity.current += (driftTarget.current - stability) * 0.005 * (deltaTime/16);
            driftVelocity.current *= 0.90; // friction

            let nextStab = stability + driftVelocity.current;
            if (nextStab > 100) nextStab = 100;
            if (nextStab < -100) nextStab = -100;

            setStability(nextStab);

            // Telemetry Safe Zone
            telemetryRef.current.totalTime += deltaTime;
            if (Math.abs(nextStab) <= 20) {
                telemetryRef.current.timeSafe += deltaTime;
            }

            // Material Window Logic
            setMaterialWindow(prev => {
                let next = { ...prev };
                if (next.active) {
                    next.timeRemaining -= deltaTime;
                    if (next.timeRemaining <= 0) {
                        next.active = false;
                        telemetryRef.current.matScores.push(0); // Missed
                        matsAdded.current++;
                        if (matsAdded.current >= maxMats) handleFinish();
                    }
                } else {
                    matWindowTimer.current -= deltaTime;
                    if (matWindowTimer.current <= 0 && matsAdded.current < maxMats) {
                        next.active = true;
                        next.timeRemaining = 1000; // 1 second window
                        matWindowTimer.current = 3500;
                    }
                }
                return next;
            });

            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [stability, timeLeft]);

    const handleYin = () => {
        driftVelocity.current -= 15;
    };

    const handleYang = () => {
        driftVelocity.current += 15;
    };

    const handleAddMaterial = () => {
        if (!materialWindow.active) {
            // Penalty for spamming? Or just ignore. Let's ignore.
            return;
        }

        // Score based on how much time was remaining
        let score = 0;
        if (materialWindow.timeRemaining > 600) score = 1.0; // Perfect if fast
        else if (materialWindow.timeRemaining > 0) score = 0.5; // Good

        telemetryRef.current.matScores.push(score);

        setMaterialWindow({ active: false, timeRemaining: 0 });
        matsAdded.current++;

        if (matsAdded.current >= maxMats) {
            handleFinish();
        }
    };

    const handleFinish = () => {
        if (isFinished.current) return;
        isFinished.current = true;
        cancelAnimationFrame(requestRef.current!);

        const tel = telemetryRef.current;
        const stabilityRatio = tel.totalTime > 0 ? tel.timeSafe / tel.totalTime : 0;
        const matAccuracy = tel.matScores.length > 0 ? tel.matScores.reduce((a,b)=>a+b,0) / maxMats : 0;

        const finalAccuracy = (stabilityRatio * 0.5) + (matAccuracy * 0.5);
        const finalScore = Math.round(finalAccuracy * 100);

        setTimeout(() => {
            onComplete({
                type: 'alchemy',
                accuracy: finalAccuracy,
                score: finalScore,
                durationMs: performance.now() - tel.startTime
            });
        }, 500);
    };

    const getStabilityStatus = () => {
        const abs = Math.abs(stability);
        if (abs <= 20) return { text: "Qi Stabil", color: "text-green-400" };
        if (abs <= 60) return { text: "Bergolak", color: "text-yellow-400" };
        return { text: "Chaos!", color: "text-red-500 font-bold" };
    };

    const status = getStabilityStatus();

    return (
        <div className="flex flex-col items-center justify-center p-4 select-none">
            <h3 className="text-xl text-amber-500 font-bold mb-2">Stabilisasi Qi Tungku</h3>
            <p className="text-gray-400 mb-6">Waktu: {Math.ceil(timeLeft)}s</p>

            <div className={`text-lg mb-2 ${status.color}`}>{status.text}</div>

            {/* Stability Meter */}
            <div className="relative w-full max-w-md h-8 bg-gray-800 rounded-full overflow-hidden border border-gray-600 shadow-inner mb-10">
                {/* Safe Zone */}
                <div className="absolute top-0 bottom-0 left-[40%] right-[40%] bg-green-500/20 border-x-2 border-green-500"></div>
                {/* Center mark */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/50"></div>

                {/* Indicator */}
                <div
                    className="absolute top-0 bottom-0 w-3 bg-amber-400 shadow-[0_0_10px_orange]"
                    style={{ left: `calc(50% + ${stability/2}% - 6px)` }}
                ></div>
            </div>

            <div className="flex justify-between w-full max-w-md gap-4 mb-8">
                <button
                    className="flex-1 py-4 bg-blue-900/80 hover:bg-blue-800 border border-blue-500 text-blue-200 rounded font-bold text-lg active:scale-95 transition"
                    onClick={handleYin}
                >
                    &larr; Yin
                </button>
                <button
                    className="flex-1 py-4 bg-red-900/80 hover:bg-red-800 border border-red-500 text-red-200 rounded font-bold text-lg active:scale-95 transition"
                    onClick={handleYang}
                >
                    Yang &rarr;
                </button>
            </div>

            {/* Material Drop-in */}
            <div className="w-full max-w-md bg-gray-900 border border-gray-700 p-4 rounded-lg flex flex-col items-center justify-center min-h-[120px]">
                {materialWindow.active ? (
                    <button
                        className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded text-white font-bold text-lg animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)] active:scale-95 transition"
                        onClick={handleAddMaterial}
                    >
                        Masukkan Bahan! ({(materialWindow.timeRemaining/1000).toFixed(1)}s)
                    </button>
                ) : (
                    <div className="text-gray-500 text-sm">
                        Menunggu momen tepat... ({matsAdded.current}/{maxMats})
                    </div>
                )}
            </div>

            <button
                className="mt-8 px-6 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 rounded transition"
                onClick={onCancel}
            >
                Batal
            </button>
        </div>
    );
}
