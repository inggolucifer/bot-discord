"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function SmithingMinigame({ onComplete, onCancel }: { onComplete: (telemetry: any) => void, onCancel: () => void }) {
    const [needlePos, setNeedlePos] = useState(0); // 0 to 100
    const [hits, setHits] = useState(0);
    const maxHits = 6;

    const [feedback, setFeedback] = useState<{text: string, color: string, id: number} | null>(null);
    const feedbackId = useRef(0);

    const requestRef = useRef<number>(0);
    const lastTime = useRef(performance.now());
    const direction = useRef(1); // 1 right, -1 left
    const speed = useRef(120); // speed increases over time
    const posRef = useRef(0);

    const telemetryRef = useRef({
        scores: [] as number[],
        perfectCount: 0,
        goodCount: 0,
        missCount: 0,
        startTime: performance.now()
    });

    // Dynamic zone logic
    const [zone, setZone] = useState({ start: 40, end: 60 });
    const targetZoneStart = zone.start;
    const targetZoneEnd = zone.end;
    const center = (targetZoneStart + targetZoneEnd) / 2;
    const width = targetZoneEnd - targetZoneStart;
    const perfectWidth = width * 0.2; // 20% of zone is perfect

    useEffect(() => {
        const loop = (time: number) => {
            if (hits >= maxHits) return;
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
    }, [hits]);

    const handleHit = () => {
        if (hits >= maxHits) return;
        const currentPos = posRef.current;

        const distFromCenter = Math.abs(center - currentPos);
        let score = 0;
        let hitType = 'Miss';

        if (distFromCenter <= perfectWidth / 2) {
            score = 1.0;
            hitType = 'Perfect';
            telemetryRef.current.perfectCount++;
        } else if (currentPos >= targetZoneStart && currentPos <= targetZoneEnd) {
            score = 0.6;
            hitType = 'Good';
            telemetryRef.current.goodCount++;
        } else {
            score = 0;
            hitType = 'Miss';
            telemetryRef.current.missCount++;
        }

        telemetryRef.current.scores.push(score);

        const nextHits = hits + 1;
        setHits(nextHits);

        // Show feedback
        feedbackId.current++;
        let fText = "Melenceng";
        let fColor = "text-red-500";
        if (hitType === 'Perfect') { fText = "Sempurna!"; fColor = "text-amber-400"; }
        if (hitType === 'Good') { fText = "Bagus"; fColor = "text-green-400"; }
        setFeedback({ text: fText, color: fColor, id: feedbackId.current });

        // Update difficulty for next hit
        speed.current = Math.min(speed.current + 40, 350); // cap speed

        // Sometimes shrink zone slightly
        if (hitType === 'Perfect' || hitType === 'Good') {
            const newWidth = Math.max(width - 2, 8); // cap minimum width
            const newStart = center - (newWidth / 2);
            setZone({ start: newStart, end: newStart + newWidth });
        }

        if (nextHits >= maxHits) {
            cancelAnimationFrame(requestRef.current!);
            const tel = telemetryRef.current;
            const accuracy = tel.scores.length > 0 ? tel.scores.reduce((a,b)=>a+b,0) / maxHits : 0;
            const finalScore = Math.round(accuracy * 100);

            setTimeout(() => {
                onComplete({
                    type: 'smithing',
                    accuracy: accuracy,
                    score: finalScore,
                    perfectCount: tel.perfectCount,
                    missCount: tel.missCount,
                    durationMs: performance.now() - tel.startTime
                });
            }, 800);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <h3 className="text-xl text-amber-500 font-bold mb-2">Pukul tepat di tengah area!</h3>
            <p className="text-gray-400 mb-6">Sisa Pukulan: {maxHits - hits}</p>

            <div className="h-8 mb-2 flex items-center justify-center">
                {feedback && (
                    <motion.div
                        key={feedback.id}
                        initial={{ opacity: 1, y: 0, scale: 1.2 }}
                        animate={{ opacity: 0, y: -20, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className={`text-lg font-bold ${feedback.color} drop-shadow-md`}
                    >
                        {feedback.text}
                    </motion.div>
                )}
            </div>

            <div
                className="relative w-full max-w-md h-16 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 shadow-inner cursor-pointer"
                onClick={handleHit} // Allow clicking the bar
            >
                {/* Target Zone */}
                <div
                    className="absolute h-full bg-orange-600/50"
                    style={{ left: `${targetZoneStart}%`, width: `${width}%` }}
                >
                    {/* Perfect Center */}
                    <div
                        className="absolute top-0 h-full bg-amber-400/80"
                        style={{ left: `50%`, width: `${(perfectWidth / width) * 100}%`, transform: 'translateX(-50%)' }}
                    ></div>
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
                    className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded text-black text-xl font-bold shadow-lg transform active:scale-95 transition disabled:opacity-50"
                    onClick={handleHit}
                    disabled={hits >= maxHits}
                >
                    TEMPA! 🔨
                </button>
            </div>
        </div>
    );
}
