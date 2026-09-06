"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function FishingMinigame({ onComplete, onCancel }: { onComplete: (score: number, telemetry: any) => void, onCancel: () => void }) {
    const [fishPos, setFishPos] = useState(50);
    const [barPos, setBarPos] = useState(50);
    const [progress, setProgress] = useState(0); // 0 to 100
    const [isPressing, setIsPressing] = useState(false);
    const [telemetry, setTelemetry] = useState<number[]>([]);

    const requestRef = useRef<number>(0);
    const fishVelocity = useRef(0);
    const barVelocity = useRef(0);
    const lastTime = useRef(performance.now());
    const progressRef = useRef(0);
    const posRef = { fish: 50, bar: 50 }; // mutable refs for loop

    const containerHeight = 300;
    const barHeight = 60; // relative to 100 scale

    // Game loop
    useEffect(() => {
        const loop = (time: number) => {
            const deltaTime = (time - lastTime.current) / 1000;
            lastTime.current = time;

            // Update bar position
            if (isPressing) {
                barVelocity.current += 150 * deltaTime;
            } else {
                barVelocity.current -= 150 * deltaTime;
            }

            // Friction and limits for bar
            barVelocity.current *= 0.9;
            posRef.bar += barVelocity.current * deltaTime;

            if (posRef.bar > 100 - (barHeight/containerHeight)*50) {
                posRef.bar = 100 - (barHeight/containerHeight)*50;
                barVelocity.current = 0;
            }
            if (posRef.bar < (barHeight/containerHeight)*50) {
                posRef.bar = (barHeight/containerHeight)*50;
                barVelocity.current = 0;
            }

            // Update fish position (Random erratic movement)
            if (Math.random() < 0.05) {
                fishVelocity.current += (Math.random() - 0.5) * 200;
            }
            fishVelocity.current += (Math.random() - 0.5) * 20; // jitter
            fishVelocity.current *= 0.95; // friction
            posRef.fish += fishVelocity.current * deltaTime;

            if (posRef.fish > 100) {
                posRef.fish = 100;
                fishVelocity.current *= -0.5;
            }
            if (posRef.fish < 0) {
                posRef.fish = 0;
                fishVelocity.current *= -0.5;
            }

            // Check intersection (Fish inside bar)
            const halfBar = (barHeight/containerHeight) * 50;
            const isInside = Math.abs(posRef.fish - posRef.bar) < halfBar;

            if (isInside) {
                progressRef.current += 15 * deltaTime; // gaining progress
            } else {
                progressRef.current -= 10 * deltaTime; // losing progress
            }

            if (progressRef.current < 0) progressRef.current = 0;

            setFishPos(posRef.fish);
            setBarPos(posRef.bar);
            setProgress(progressRef.current);

            // Collect telemetry (accuracy)
            setTelemetry(prev => [...prev.slice(-50), isInside ? 1 : 0]);

            if (progressRef.current >= 100) {
                // Win
                const accuracy = telemetry.reduce((a, b) => a + b, 0) / Math.max(telemetry.length, 1);
                onComplete(100, { accuracy, type: 'fishing' });
                return;
            }

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [isPressing]);

    const handlePointerDown = () => setIsPressing(true);
    const handlePointerUp = () => setIsPressing(false);

    return (
        <div className="flex flex-col items-center justify-center p-4 select-none touch-none">
            <h3 className="text-xl text-amber-500 font-bold mb-4">Tahan klik agar Ikan berada di zona Hijau!</h3>

            <div className="flex gap-8 items-end">
                {/* Fishing Bar Container */}
                <div
                    className="relative w-12 bg-blue-900/50 rounded-full border-2 border-amber-900 overflow-hidden"
                    style={{ height: containerHeight }}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                >
                    {/* The Green Bar (Controlled by player) */}
                    <div
                        className="absolute w-full bg-green-500/80 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                        style={{
                            height: barHeight,
                            bottom: `${barPos}%`,
                            transform: 'translateY(50%)'
                        }}
                    ></div>

                    {/* The Fish */}
                    <div
                        className="absolute w-8 h-8 left-2 flex items-center justify-center text-2xl drop-shadow-md z-10"
                        style={{
                            bottom: `${fishPos}%`,
                            transform: 'translateY(50%)'
                        }}
                    >
                        🐟
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-6 bg-gray-800 rounded-full border border-gray-700 overflow-hidden flex flex-col justify-end" style={{ height: containerHeight }}>
                    <div
                        className={`w-full transition-all duration-100 ${progress > 80 ? 'bg-amber-400' : 'bg-green-400'}`}
                        style={{ height: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <div className="mt-8 flex gap-4">
                <button
                    className="px-6 py-2 bg-red-900/80 hover:bg-red-800 rounded text-white font-bold transition"
                    onClick={onCancel}
                >
                    Batal
                </button>
            </div>
        </div>
    );
}
