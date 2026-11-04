'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import WorldCanvas from '@/components/map/WorldCanvas';

// Titik acak di luar manifest.json (seed 1618)
const OUTSIDE_POINTS = [
  { x: 160, y: 4075, label: 'P1_5_127' },
  { x: 2833, y: 560, label: 'P2_88_17' },
  { x: 183, y: 1424, label: 'P3_5_44' }
];

export default function PerfBenchClient() {
  const searchParams = useSearchParams();

  const scenario = (searchParams.get('scenario') || 'S1').toUpperCase();
  const durationSec = Math.max(3, parseInt(searchParams.get('duration') || '15', 10));
  const durationMs = durationSec * 1000;
  const autostart = searchParams.get('autostart') !== '0';

  // Tentukan parameter awal sesuai skenario
  let initialX = 2750;
  let initialY = 2350;
  let initialZoom = 1.4;

  if (scenario === 'S1') {
    initialX = 2750;
    initialY = 2350;
    initialZoom = 1.4;
  } else if (scenario === 'S2') {
    initialX = 2455;
    initialY = 2485;
    initialZoom = 1.4;
  } else if (scenario === 'S3') {
    initialX = OUTSIDE_POINTS[0].x;
    initialY = OUTSIDE_POINTS[0].y;
    initialZoom = 1.4;
  } else if (scenario === 'S4') {
    initialX = 2750;
    initialY = 2350;
    initialZoom = 0.35; // Jangkauan luas ~25 chunk
  } else if (scenario === 'S5') {
    initialX = OUTSIDE_POINTS[1].x;
    initialY = OUTSIDE_POINTS[1].y;
    initialZoom = 0.35; // Jangkauan luas ~25 chunk di luar area baked
  }

  // Override dari URL query jika ada
  if (searchParams.get('x')) initialX = parseFloat(searchParams.get('x')!);
  if (searchParams.get('y')) initialY = parseFloat(searchParams.get('y')!);
  if (searchParams.get('zoom')) initialZoom = parseFloat(searchParams.get('zoom')!);

  const [playerPos, setPlayerPos] = useState({ x: initialX, y: initialY });
  const [debugCam] = useState({ x: initialX, y: initialY, zoom: initialZoom });
  const [benchmarkDone, setBenchmarkDone] = useState(false);
  const [frameCount, setFrameCount] = useState(0);

  const isRunningRef = useRef(false);
  const frameDeltasRef = useRef<number[]>([]);
  const startTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const memoryStartRef = useRef(0);

  useEffect(() => {
    // Siapkan interface window untuk Playwright CDP controller
    const perfWindow = window as any;
    perfWindow.__isPerfReady = true;
    perfWindow.__perfBenchmarkDone = false;
    perfWindow.__perfBenchmarkResults = null;

    const startBenchmark = () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      frameDeltasRef.current = [];
      memoryStartRef.current = (performance as any).memory?.usedJSHeapSize || 0;
      startTimeRef.current = performance.now();
      lastFrameTimeRef.current = performance.now();

      const loop = (now: number) => {
        if (!isRunningRef.current) return;

        const delta = now - lastFrameTimeRef.current;
        lastFrameTimeRef.current = now;

        // Catat interval frame tanpa memicu re-render React tiap frame (anti-overhead)
        if (delta > 0 && delta < 1000) {
          frameDeltasRef.current.push(delta);
        }

        const elapsed = now - startTimeRef.current;

        // Skrip pergerakan kamera berdasarkan skenario (hanya update state jika koordinat petak berganti)
        if (scenario === 'S2') {
          // Pan cepat di dataran dalam area baked (kecepatan ~25 petak/detik)
          const t = elapsed / 1000;
          const nextX = Math.round(2455 + Math.sin(t * 0.8) * 180);
          const nextY = Math.round(2485 + Math.cos(t * 0.8) * 150);
          setPlayerPos(prev => (prev.x !== nextX || prev.y !== nextY ? { x: nextX, y: nextY } : prev));
        } else if (scenario === 'S3') {
          // Pan cepat di luar area baked (berpindah antar titik acak seed 1618)
          const t = elapsed / 1000;
          const ptIdx = Math.floor(t / 5) % OUTSIDE_POINTS.length;
          const nextPtIdx = (ptIdx + 1) % OUTSIDE_POINTS.length;
          const subT = (t % 5) / 5;
          const curP = OUTSIDE_POINTS[ptIdx];
          const nextP = OUTSIDE_POINTS[nextPtIdx];
          const nextX = Math.round(curP.x + (nextP.x - curP.x) * subT);
          const nextY = Math.round(curP.y + (nextP.y - curP.y) * subT);
          setPlayerPos(prev => (prev.x !== nextX || prev.y !== nextY ? { x: nextX, y: nextY } : prev));
        } else if (scenario === 'S4' || scenario === 'S5') {
          // Gerak perlahan saat zoom luas untuk memicu re-render petak
          const t = elapsed / 1000;
          const baseP = scenario === 'S4' ? { x: 2750, y: 2350 } : OUTSIDE_POINTS[1];
          const nextX = Math.round(baseP.x + Math.sin(t * 0.4) * 20);
          const nextY = Math.round(baseP.y + Math.cos(t * 0.4) * 20);
          setPlayerPos(prev => (prev.x !== nextX || prev.y !== nextY ? { x: nextX, y: nextY } : prev));
        }

        if (elapsed >= durationMs) {
          isRunningRef.current = false;
          const memoryEnd = (performance as any).memory?.usedJSHeapSize || 0;
          const results = {
            scenario,
            durationMs: elapsed,
            samplesCount: frameDeltasRef.current.length,
            frameDeltas: frameDeltasRef.current,
            memoryStart: memoryStartRef.current,
            memoryEnd
          };
          perfWindow.__perfBenchmarkResults = results;
          perfWindow.__perfBenchmarkDone = true;
          setBenchmarkDone(true);
          return;
        }

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    };

    perfWindow.__startPerfBenchmark = startBenchmark;

    if (autostart) {
      // Jeda 600ms pemanasan aset agar kanvas siap sebelum mencatat
      const timer = setTimeout(startBenchmark, 600);
      return () => clearTimeout(timer);
    }
  }, [scenario, durationMs, autostart]);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#0a0a0f]">
      {/* Benchmark HUD Header */}
      <div className="absolute top-2 left-2 z-50 bg-[#10141f]/90 border border-amber-600/60 p-2.5 rounded-lg text-xs font-mono text-amber-200 pointer-events-none shadow-xl flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400">[V22 PERF BENCH]</span>
          <span>Skenario: <span className="text-white font-bold">{scenario}</span></span>
          <span>Pos: ({playerPos.x}, {playerPos.y})</span>
          <span>Zoom: {debugCam.zoom}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-300">
          <span>Sampel Frame: <strong className="text-emerald-400">{frameCount}</strong></span>
          <span>Status: {benchmarkDone ? <strong className="text-emerald-400">SELESAI (15s)</strong> : <strong className="text-yellow-400 animate-pulse">MEREKAM...</strong>}</span>
        </div>
      </div>

      <WorldCanvas
        mode="zone"
        tiles={[]}
        playerPos={playerPos}
        playerReady={true}
        debugCam={debugCam}
        paused={false}
      />
    </div>
  );
}
