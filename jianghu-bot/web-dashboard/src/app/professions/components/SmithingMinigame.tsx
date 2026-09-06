"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function SmithingMinigame({ onComplete, onCancel }: { onComplete: (score: number, telemetry: any) => void, onCancel: () => void }) {
    const [needlePos, setNeedlePos] = useState(0); // 0 to 100
    const [hits, setHits] = useState(0);
    const maxHits = 5;

    const requestRef = useRef<number>(0);
    const lastTime = useRef(performance.now());
    const direction = useRef(1); // 1 right, -1 left
    const speed = useRef(120); // speed increases over time
    const posRef = useRef(0);
    const [telemetry, setTelemetry] = useState<number[]>([]);

    const targetZoneStart = 40;
    const targetZoneEnd = 60;

    useEffect(() => {
        const loop = (time: number) => {
            const deltaTime = (time - lastTime.current) / 1000;
            lastTime.current = time;

            posRef.current += speed.current * direction.current * deltaTime;

            if (posRef.current > 100) {
                posRef.current = 100;
                direction.current = -1;
            } else if (posRef.current < 0) {
                posRef.current = 0;
                direction.current = 1;
            }

            setNeedlePos(posRef.current);
            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, []);

    const handleHit = () => {
        const currentPos = posRef.current;
        const isHit = currentPos >= targetZoneStart && currentPos <= targetZoneEnd;

        let score = 0;
        if (isHit) {
            // center is 50, closer to 50 is better
            const distFromCenter = Math.abs(50 - currentPos);
            score = 1 - (distFromCenter / 10); // 1 is perfect, drops to 0 at edges
            if (score < 0) score = 0;
        }

        const newTelemetry = [...telemetry, score];
        setTelemetry(newTelemetry);
        setHits(prev => prev + 1);

        speed.current += 30; // gets faster!

        if (hits + 1 >= maxHits) {
            cancelAnimationFrame(requestRef.current!);
            // Compute average accuracy
            const accuracy = newTelemetry.reduce((a, b) => a + b, 0) / maxHits;
            setTimeout(() => {
                onComplete(100, { accuracy, type: 'smithing' });
            }, 500);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <h3 className="text-xl text-amber-500 font-bold mb-2">Pukul tepat di area merah!</h3>
            <p className="text-gray-400 mb-8">Sisa Pukulan: {maxHits - hits}</p>

            <div className="relative w-full max-w-md h-12 bg-gray-800 rounded-lg overflow-hidden border border-gray-600 shadow-inner">
                {/* Target Zone */}
                <div
                    className="absolute h-full bg-red-600/80"
                    style={{ left: `${targetZoneStart}%`, right: `${100 - targetZoneEnd}%` }}
                >
                    <div className="absolute left-1/2 top-0 h-full w-0.5 bg-yellow-400 -translate-x-1/2"></div>
                </div>

                {/* The Needle */}
                <motion.div
                    className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_8px_white] z-10"
                    style={{ left: `${needlePos}%`, transform: 'translateX(-50%)' }}
                />
            </div>

            <div className="mt-8 flex gap-4">
                <button
                    className="px-6 py-2 bg-red-900/80 hover:bg-red-800 rounded text-white font-bold transition"
                    onClick={onCancel}
                >
                    Batal
                </button>
                <button
                    className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded text-black text-xl font-bold shadow-lg transform active:scale-95 transition"
                    onClick={handleHit}
                    disabled={hits >= maxHits}
                >
                    TEMPA! 🔨
                </button>
            </div>
        </div>
    );
}
