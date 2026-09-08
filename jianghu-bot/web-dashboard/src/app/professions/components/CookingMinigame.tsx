"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function CookingMinigame({ onComplete, onCancel }: { onComplete: (telemetry: any) => void, onCancel: () => void }) {
    const [phase, setPhase] = useState<'HEAT' | 'TIMING'>('HEAT');

    // Phase 1: Heat
    const [heat, setHeat] = useState(20);
    const heatTargetMin = 45;
    const heatTargetMax = 65;
    const [timeLeft, setTimeLeft] = useState(8);

    // Phase 2: Timing
    const [needlePos, setNeedlePos] = useState(0);
    const [hits, setHits] = useState(0);
    const maxHits = 4;

    const requestRef = useRef<number>(0);
    const lastTime = useRef(performance.now());
    const direction = useRef(1);

    const telemetryRef = useRef({
        heatTimeInZone: 0,
        heatTotalTime: 0,
        actionScores: [] as number[],
        startTime: performance.now()
    });

    // Heat Phase Logic
    useEffect(() => {
        if (phase !== 'HEAT') return;

        const loop = (time: number) => {
            const deltaTime = time - lastTime.current;
            lastTime.current = time;

            // Auto increase heat
            setHeat(h => {
                let next = h + 15 * (deltaTime / 1000);
                if (next > 100) next = 100;

                // Telemetry
                telemetryRef.current.heatTotalTime += deltaTime;
                if (next >= heatTargetMin && next <= heatTargetMax) {
                    telemetryRef.current.heatTimeInZone += deltaTime;
                }
                return next;
            });

            setTimeLeft(t => {
                const next = t - (deltaTime / 1000);
                if (next <= 0) {
                    setPhase('TIMING');
                    return 0;
                }
                return next;
            });

            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [phase]);

    // Timing Phase Logic
    useEffect(() => {
        if (phase !== 'TIMING') return;
        lastTime.current = performance.now(); // reset time for phase 2

        const loop = (time: number) => {
            const deltaTime = time - lastTime.current;
            lastTime.current = time;

            setNeedlePos(pos => {
                let speed = 100; // units per second
                if (hits === 1) speed = 130;
                if (hits === 2) speed = 160;
                if (hits === 3) speed = 200;

                let next = pos + speed * direction.current * (deltaTime / 1000);
                if (next > 100) { next = 100; direction.current = -1; }
                if (next < 0) { next = 0; direction.current = 1; }
                return next;
            });

            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [phase, hits]);

    const handleCoolDown = () => {
        if (phase !== 'HEAT') return;
        setHeat(h => Math.max(0, h - 8));
    };

    const handleHit = () => {
        if (phase !== 'TIMING' || hits >= maxHits) return;

        // Target is center 45-55
        const dist = Math.abs(50 - needlePos);
        let score = 0;
        if (dist <= 5) score = 1.0;
        else if (dist <= 15) score = 0.6;
        else score = 0.0;

        telemetryRef.current.actionScores.push(score);
        const nextHits = hits + 1;
        setHits(nextHits);

        if (nextHits >= maxHits) {
            handleFinish();
        }
    };

    const handleFinish = () => {
        cancelAnimationFrame(requestRef.current!);
        const tel = telemetryRef.current;
        const heatAccuracy = tel.heatTotalTime > 0 ? tel.heatTimeInZone / tel.heatTotalTime : 0;
        const actionAccuracy = tel.actionScores.length > 0 ? tel.actionScores.reduce((a,b)=>a+b,0)/tel.actionScores.length : 0;

        const finalAccuracy = (heatAccuracy * 0.4) + (actionAccuracy * 0.6);
        const finalScore = Math.round(finalAccuracy * 100);

        setTimeout(() => {
            onComplete({
                type: 'cooking',
                accuracy: finalAccuracy,
                score: finalScore,
                actions: tel.actionScores.length + 10, // dummy estimate
                durationMs: performance.now() - tel.startTime
            });
        }, 500);
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 select-none">
            {phase === 'HEAT' && (
                <>
                    <h3 className="text-xl text-amber-500 font-bold mb-2">Jaga Api Tetap Pas!</h3>
                    <p className="text-gray-400 mb-6">Waktu Tersisa: {Math.ceil(timeLeft)}s</p>

                    <div className="relative w-12 h-64 bg-gray-800 rounded-lg overflow-hidden border border-gray-600 mb-8">
                        {/* Target Zone */}
                        <div className="absolute w-full bg-green-500/30 border-y border-green-500" style={{ bottom: `${heatTargetMin}%`, height: `${heatTargetMax - heatTargetMin}%` }}></div>

                        {/* Heat Level */}
                        <div className={`absolute bottom-0 w-full transition-all duration-75 ${heat > heatTargetMax ? 'bg-red-500' : heat < heatTargetMin ? 'bg-blue-400' : 'bg-orange-500'}`} style={{ height: `${heat}%` }}></div>
                    </div>

                    <div className="text-sm font-bold mb-4">
                        {heat > heatTargetMax ? <span className="text-red-400">Terlalu Panas!</span> :
                         heat < heatTargetMin ? <span className="text-blue-400">Kurang Panas</span> :
                         <span className="text-green-400">Sempurna!</span>}
                    </div>

                    <button
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold text-lg shadow-lg active:scale-95 transition"
                        onClick={handleCoolDown}
                    >
                        Kipas / Turunkan Api
                    </button>
                </>
            )}

            {phase === 'TIMING' && (
                <>
                    <h3 className="text-xl text-amber-500 font-bold mb-2">Waktunya Memasak!</h3>
                    <p className="text-gray-400 mb-8">Langkah: {hits}/{maxHits}</p>

                    <div className="relative w-full max-w-md h-12 bg-gray-800 rounded-lg overflow-hidden border border-gray-600 shadow-inner mb-8">
                        {/* Target Zone */}
                        <div className="absolute top-0 bottom-0 left-[45%] right-[45%] bg-amber-500/40 border-x-2 border-amber-500"></div>

                        {/* Needle */}
                        <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white]" style={{ left: `${needlePos}%` }}></div>
                    </div>

                    <button
                        className="px-10 py-4 bg-amber-600 hover:bg-amber-500 rounded-lg text-black font-bold text-xl shadow-lg active:scale-95 transition"
                        onClick={handleHit}
                        disabled={hits >= maxHits}
                    >
                        MASAK!
                    </button>
                </>
            )}

            <button
                className="mt-8 px-6 py-2 border border-red-900/80 text-red-400 hover:bg-red-900/30 rounded font-bold transition"
                onClick={onCancel}
            >
                Batal
            </button>
        </div>
    );
}
