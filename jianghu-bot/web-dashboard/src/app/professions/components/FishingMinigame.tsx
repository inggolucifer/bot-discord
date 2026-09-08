"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function FishingMinigame({ onComplete, onCancel, difficulty = 'normal' }: { onComplete: (telemetry: any) => void, onCancel: () => void, difficulty?: 'normal' | 'hard' }) {
    const [progress, setProgress] = useState(0); // 0 to 100
    const [fishPos, setFishPos] = useState(50); // 0 to 100
    const [catcherPos, setCatcherPos] = useState(50); // 0 to 100
    const [isHooked, setIsHooked] = useState(false);

    const requestRef = useRef<number>(0);
    const lastTime = useRef(performance.now());

    // Mechanics
    const catcherHeight = difficulty === 'hard' ? 20 : 30; // Percentage of bar
    const fishVelocity = useRef(0);
    const fishTarget = useRef(50);
    const fishChangeTimer = useRef(0);

    const isPressing = useRef(false);
    const catcherVelocity = useRef(0);

    // Telemetry
    const telemetryRef = useRef({
        insideSamples: 0,
        totalSamples: 0,
        startTime: performance.now(),
        sampleTimer: 0
    });

    const gameEnded = useRef(false);
    const timeoutTimer = useRef(0);
    const maxDuration = 25000; // 25s timeout

    useEffect(() => {
        const loop = (time: number) => {
            if (gameEnded.current) return;

            const deltaTime = time - lastTime.current;
            lastTime.current = time;

            timeoutTimer.current += deltaTime;
            if (timeoutTimer.current >= maxDuration) {
                handleFinish();
                return;
            }

            // Fish Logic (Erratic movement)
            fishChangeTimer.current -= deltaTime;
            if (fishChangeTimer.current <= 0) {
                fishChangeTimer.current = difficulty === 'hard' ? 400 + Math.random() * 600 : 700 + Math.random() * 1000;
                fishTarget.current = Math.random() * 100;
            }

            const dist = fishTarget.current - fishPos;
            const fishAccel = difficulty === 'hard' ? 0.05 : 0.02;
            fishVelocity.current += dist * fishAccel * (deltaTime / 16);
            fishVelocity.current *= 0.85; // friction

            let newFishPos = fishPos + fishVelocity.current;
            if (newFishPos < 0) { newFishPos = 0; fishVelocity.current *= -0.5; }
            if (newFishPos > 100) { newFishPos = 100; fishVelocity.current *= -0.5; }
            setFishPos(newFishPos);

            // Catcher Logic
            if (isPressing.current) {
                catcherVelocity.current -= 0.8 * (deltaTime / 16); // up is negative conceptually, but we map 0 as bottom, 100 as top. Let's make it intuitive: pressing increases pos.
            } else {
                catcherVelocity.current -= 0.6 * (deltaTime / 16); // Gravity
            }

            if (isPressing.current) {
                catcherVelocity.current += 1.4 * (deltaTime / 16); // Up force overrides gravity
            }

            catcherVelocity.current *= 0.85; // drag

            let newCatcherPos = catcherPos + catcherVelocity.current;
            if (newCatcherPos < 0) { newCatcherPos = 0; catcherVelocity.current = 0; }
            if (newCatcherPos > 100) { newCatcherPos = 100; catcherVelocity.current = 0; }
            setCatcherPos(newCatcherPos);

            // Hook Logic
            // Catcher pos is center of catcher.
            const catcherTop = newCatcherPos + (catcherHeight / 2);
            const catcherBottom = newCatcherPos - (catcherHeight / 2);
            const currentlyHooked = newFishPos <= catcherTop && newFishPos >= catcherBottom;
            setIsHooked(currentlyHooked);

            // Progress Logic
            let newProgress = progress;
            if (currentlyHooked) {
                newProgress += 0.2 * (deltaTime / 16);
            } else {
                newProgress -= 0.1 * (deltaTime / 16);
            }
            if (newProgress < 0) newProgress = 0;
            if (newProgress >= 100) {
                newProgress = 100;
                handleFinish();
            }
            setProgress(newProgress);

            // Telemetry sampling (every ~100ms)
            telemetryRef.current.sampleTimer += deltaTime;
            if (telemetryRef.current.sampleTimer >= 100) {
                telemetryRef.current.sampleTimer = 0;
                telemetryRef.current.totalSamples++;
                if (currentlyHooked) telemetryRef.current.insideSamples++;
            }

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [fishPos, catcherPos, progress, difficulty]);

    const handleFinish = () => {
        if (gameEnded.current) return;
        gameEnded.current = true;
        cancelAnimationFrame(requestRef.current);

        const tel = telemetryRef.current;
        const accuracy = tel.totalSamples > 0 ? tel.insideSamples / tel.totalSamples : 0;

        setTimeout(() => {
            onComplete({
                type: 'fishing',
                accuracy: accuracy,
                score: Math.round(progress), // final progress
                durationMs: performance.now() - tel.startTime
            });
        }, 500);
    };

    // Interaction Handlers
    const startPress = (e: React.SyntheticEvent) => {
        e.preventDefault(); // prevent scroll on mobile
        isPressing.current = true;
    };
    const endPress = () => {
        isPressing.current = false;
    };

    return (
        <div
            className="flex flex-col items-center justify-center p-4 touch-none select-none"
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchEnd={endPress}
            onTouchCancel={endPress}
        >
            <h3 className="text-xl text-amber-500 font-bold mb-4">Tahan Untuk Menarik!</h3>

            <div className="flex items-center gap-8 h-80">
                {/* Main Fishing Bar */}
                <div
                    className="relative w-12 h-full bg-blue-900/50 border-2 border-gray-600 rounded-xl overflow-hidden shadow-inner cursor-pointer"
                    onMouseDown={startPress}
                    onTouchStart={startPress}
                >
                    {/* Background indicator for pressing */}
                    <div className={`absolute inset-0 bg-blue-400/10 transition-opacity ${isPressing.current ? 'opacity-100' : 'opacity-0'}`}></div>

                    {/* Catcher */}
                    <div
                        className={`absolute w-full left-0 rounded transition-colors duration-200 border-y-4 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${isHooked ? 'bg-green-500/50 border-green-400' : 'bg-gray-400/50 border-gray-300'}`}
                        style={{
                            height: `${catcherHeight}%`,
                            bottom: `${catcherPos - (catcherHeight/2)}%`,
                        }}
                    ></div>

                    {/* Fish */}
                    <motion.div
                        className="absolute w-8 h-8 left-1.5 bg-contain bg-center bg-no-repeat z-10"
                        style={{
                            bottom: `calc(${fishPos}% - 16px)`,
                            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'white\'%3E%3Cpath d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z\'/%3E%3C/svg%3E")' // Placeholder fish
                        }}
                        animate={isHooked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ repeat: isHooked ? Infinity : 0, duration: 0.3 }}
                    >🐟</motion.div>
                </div>

                {/* Progress Bar */}
                <div className="relative w-6 h-full bg-gray-800 border border-gray-700 rounded overflow-hidden">
                    <div
                        className={`absolute bottom-0 w-full transition-all duration-100 ${progress >= 100 ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ height: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <p className="mt-6 text-sm text-gray-400">Tekan / Tahan pada area bar untuk menaikkan kail.</p>

            <button
                className="mt-6 px-6 py-2 bg-red-900/80 hover:bg-red-800 rounded text-white font-bold transition"
                onClick={onCancel}
            >
                Batal
            </button>
        </div>
    );
}
