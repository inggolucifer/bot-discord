"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function FarmingMinigame({ onComplete, onCancel }: { onComplete: (telemetry: any) => void, onCancel: () => void }) {
    const totalNotes = 12;
    const [notes, setNotes] = useState<{ id: number; type: string; x: number; active: boolean; result?: string }[]>([]);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [finished, setFinished] = useState(false);

    const requestRef = useRef<number>(0);
    const lastTime = useRef(performance.now());

    const spawnedCount = useRef(0);
    const timeSinceLastSpawn = useRef(0);
    const spawnInterval = 750; // ms

    const noteTypes = ['SEED', 'WATER', 'HARVEST'];

    const telemetryRef = useRef({
        scores: [] as number[],
        perfectCount: 0,
        goodCount: 0,
        missCount: 0,
        actions: 0
    });

    useEffect(() => {
        const loop = (time: number) => {
            const deltaTime = time - lastTime.current;
            lastTime.current = time;

            // Spawn notes
            if (spawnedCount.current < totalNotes) {
                timeSinceLastSpawn.current += deltaTime;
                let currentInterval = spawnInterval;
                if (spawnedCount.current > 8) currentInterval = 550; // speed up near end

                if (timeSinceLastSpawn.current >= currentInterval) {
                    timeSinceLastSpawn.current = 0;
                    const type = noteTypes[Math.floor(Math.random() * noteTypes.length)];
                    setNotes(prev => [...prev, { id: spawnedCount.current, type, x: 100, active: true }]);
                    spawnedCount.current++;
                }
            }

            // Move notes
            setNotes(prev => {
                let hasActive = false;
                const nextNotes = prev.map(note => {
                    if (!note.active) return note;
                    const newX = note.x - (deltaTime * 0.04); // Speed factor
                    if (newX < -10) { // Passed the zone and missed
                        if (note.result === undefined) {
                            telemetryRef.current.missCount++;
                            telemetryRef.current.scores.push(0);
                            setCombo(0);
                            return { ...note, x: newX, active: false, result: 'Miss' };
                        }
                    }
                    if (newX >= -10) hasActive = true;
                    return { ...note, x: newX };
                });

                if (spawnedCount.current >= totalNotes && !hasActive && !finished) {
                    handleFinish();
                }

                return nextNotes;
            });

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [finished]);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'a' || e.key === '1') handleAction('SEED');
            if (e.key === 's' || e.key === '2') handleAction('WATER');
            if (e.key === 'd' || e.key === '3') handleAction('HARVEST');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [notes]);

    const handleAction = (actionType: string) => {
        if (finished) return;
        telemetryRef.current.actions++;

        setNotes(prev => {
            const nextNotes = [...prev];
            // Find the active note closest to the hit zone (x = 10)
            let targetIdx = -1;
            let minDistance = 999;

            for (let i = 0; i < nextNotes.length; i++) {
                if (nextNotes[i].active && nextNotes[i].x < 40) { // Only consider notes relatively close
                    const dist = Math.abs(nextNotes[i].x - 10);
                    if (dist < minDistance) {
                        minDistance = dist;
                        targetIdx = i;
                    }
                }
            }

            if (targetIdx !== -1) {
                const note = nextNotes[targetIdx];
                if (note.type !== actionType) {
                    // Wrong button
                    note.active = false;
                    note.result = 'Miss';
                    telemetryRef.current.missCount++;
                    telemetryRef.current.scores.push(0);
                    setCombo(0);
                } else {
                    // Correct button, check timing (Hit zone is around x=10)
                    const dist = Math.abs(note.x - 10);
                    let result = 'Miss';
                    let noteScore = 0;

                    if (dist <= 8) { // Perfect window
                        result = 'Perfect';
                        noteScore = 1.0;
                        telemetryRef.current.perfectCount++;
                        setCombo(c => c + 1);
                    } else if (dist <= 18) { // Good window
                        result = 'Good';
                        noteScore = 0.65;
                        telemetryRef.current.goodCount++;
                        setCombo(0);
                    } else { // Miss window
                        telemetryRef.current.missCount++;
                        setCombo(0);
                    }

                    note.active = false;
                    note.result = result;
                    telemetryRef.current.scores.push(noteScore);
                }
            }

            return nextNotes;
        });
    };

    const handleFinish = () => {
        setFinished(true);
        cancelAnimationFrame(requestRef.current!);

        const { scores, perfectCount, goodCount, missCount, actions } = telemetryRef.current;
        const total = totalNotes;
        const baseAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;

        // Combo bonus: +0.02 per streak after 3, max +0.10
        let comboBonus = 0;
        if (combo >= 3) {
            comboBonus = Math.min((combo - 2) * 0.02, 0.10);
        }

        const finalAccuracy = Math.min(Math.max(baseAvg + comboBonus, 0), 1.0);
        const finalScore = Math.round(finalAccuracy * 100);

        setTimeout(() => {
            onComplete({
                type: 'farming',
                accuracy: finalAccuracy,
                score: finalScore,
                actions,
                perfectCount,
                missCount,
                durationMs: performance.now() - 0 // Rough estimate, we don't track start exactly here, could add if needed
            });
        }, 1000);
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 select-none">
            <h3 className="text-xl text-amber-500 font-bold mb-2">Irama Musim Tanam</h3>
            <div className="flex justify-between w-full max-w-md text-sm text-gray-400 mb-4">
                <span>Combo: <span className={combo >= 3 ? "text-amber-400 font-bold" : ""}>{combo}</span></span>
                <span>Progres: {spawnedCount.current}/{totalNotes}</span>
            </div>

            <div className="relative w-full max-w-md h-24 bg-gray-800 rounded-lg overflow-hidden border border-amber-900/50 shadow-inner mb-8">
                {/* Hit Zone Marker */}
                <div className="absolute left-[10%] top-0 bottom-0 w-8 border-x-2 border-amber-500 bg-amber-500/20 z-0"></div>

                {/* Notes */}
                {notes.map(note => (
                    <div
                        key={note.id}
                        className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shadow-lg z-10 transition-opacity ${!note.active ? 'opacity-0 scale-150 duration-300' : ''}`}
                        style={{ left: `${note.x}%` }}
                    >
                        {note.type === 'SEED' && <div className="w-full h-full bg-green-600 rounded-full border-2 border-white flex items-center justify-center text-sm">🌱</div>}
                        {note.type === 'WATER' && <div className="w-full h-full bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-sm">💧</div>}
                        {note.type === 'HARVEST' && <div className="w-full h-full bg-yellow-500 rounded-full border-2 border-white flex items-center justify-center text-sm">🌾</div>}

                        {/* Feedback Text */}
                        {note.result && (
                            <div className={`absolute -top-6 text-sm font-bold ${note.result === 'Perfect' ? 'text-amber-400' : note.result === 'Good' ? 'text-green-400' : 'text-red-500'}`}>
                                {note.result}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                <button
                    className="py-4 bg-green-700 hover:bg-green-600 rounded-lg text-white font-bold shadow-lg active:scale-95 transition"
                    onClick={() => handleAction('SEED')}
                >
                    <div className="text-2xl mb-1">🌱</div>
                    Tanam (A)
                </button>
                <button
                    className="py-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold shadow-lg active:scale-95 transition"
                    onClick={() => handleAction('WATER')}
                >
                    <div className="text-2xl mb-1">💧</div>
                    Siram (S)
                </button>
                <button
                    className="py-4 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white font-bold shadow-lg active:scale-95 transition"
                    onClick={() => handleAction('HARVEST')}
                >
                    <div className="text-2xl mb-1">🌾</div>
                    Panen (D)
                </button>
            </div>

            <button
                className="mt-8 px-6 py-2 bg-red-900/80 hover:bg-red-800 rounded text-white font-bold transition"
                onClick={onCancel}
            >
                Batal
            </button>
        </div>
    );
}
