'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import { Fish, Sparkles, CheckCircle2, X, AlertTriangle, Waves, Anchor, Loader2 } from 'lucide-react';

interface FishingReelMinigameProps {
  targetX?: number;
  targetY?: number;
  source?: 'interior' | 'world';
  zoneId?: string;
  onClose: () => void;
  onCompleted?: (result: any) => void;
}

export default function FishingReelMinigame({
  targetX,
  targetY,
  source = 'world',
  zoneId,
  onClose,
  onCompleted
}: FishingReelMinigameProps) {
  // Phase state: 'casting' | 'playing' | 'success' | 'escaped' | 'error'
  const [phase, setPhase] = useState<'casting' | 'playing' | 'success' | 'escaped' | 'error'>('casting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fishInfo, setFishInfo] = useState<{ name: string; difficulty: number } | null>(null);
  const [caughtResult, setCaughtResult] = useState<any>(null);
  const [isPullingVisual, setIsPullingVisual] = useState<boolean>(false);

  // Simulation state in useRef to ensure silky smooth 60fps without React re-render lag
  const castIdRef = useRef<string | null>(null);
  const fishPosRef = useRef<number>(50); // 0..100
  const reelPosRef = useRef<number>(50); // 0..100
  const velocityRef = useRef<number>(0);
  const progressRef = useRef<number>(30); // 0..100
  const isPullingRef = useRef<boolean>(false);
  const finishedRef = useRef<boolean>(false);
  const fishTargetRef = useRef<number>(50);
  const targetZoneSizeRef = useRef<number>(24);
  const fishSpeedRef = useRef<number>(0.08);

  // DOM element refs for direct style updates
  const fishElRef = useRef<HTMLDivElement>(null);
  const reelElRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const targetIntervalRef = useRef<any>(null);

  // 1. Initial Cast Request on Mount
  useEffect(() => {
    let isCancelled = false;

    const initiateCast = async () => {
      try {
        const payload: any = { source, zoneId };
        if (targetX !== undefined && targetY !== undefined) {
          payload.x = targetX;
          payload.y = targetY;
        }

        const res = await api.post('/world/fish/cast', payload);
        if (isCancelled) return;

        if (res.data?.ok) {
          castIdRef.current = res.data.castId;
          targetZoneSizeRef.current = res.data.targetZoneSize || 24;
          fishSpeedRef.current = res.data.fishSpeed || 0.08;
          setFishInfo({
            name: res.data.fishName,
            difficulty: res.data.difficulty || 1
          });
          setPhase('playing');
        } else {
          setPhase('error');
          setErrorMessage(res.data?.error || 'Gagal melempar kail pancing.');
        }
      } catch (err: any) {
        if (isCancelled) return;
        setPhase('error');
        setErrorMessage(err.response?.data?.error || err.message || 'Koneksi terputus saat melempar kail.');
      }
    };

    initiateCast();

    return () => {
      isCancelled = true;
    };
  }, [targetX, targetY, source, zoneId]);

  // 2. Physics & Game Loop when playing
  useEffect(() => {
    if (phase !== 'playing') return;

    finishedRef.current = false;
    fishPosRef.current = 50;
    reelPosRef.current = 50;
    velocityRef.current = 0;
    progressRef.current = 30;

    // Periodically update fish swimming target
    targetIntervalRef.current = setInterval(() => {
      if (finishedRef.current) return;
      fishTargetRef.current = Math.min(85, Math.max(15, Math.random() * 70 + 15));
    }, 800);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (finishedRef.current) return;

      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const barSize = targetZoneSizeRef.current;
      const halfBar = barSize / 2;

      // 1. Update Fish position with smooth inertia towards target
      const fishDiff = fishTargetRef.current - fishPosRef.current;
      fishPosRef.current += fishDiff * (fishSpeedRef.current * 60) * dt;
      fishPosRef.current = Math.min(92, Math.max(8, fishPosRef.current));

      // 2. Update Tension/Reel bar physics
      if (isPullingRef.current) {
        velocityRef.current = Math.min(velocityRef.current + 180 * dt, 80);
      } else {
        velocityRef.current = Math.max(velocityRef.current - 140 * dt, -75);
      }

      reelPosRef.current += velocityRef.current * dt;
      if (reelPosRef.current < halfBar) {
        reelPosRef.current = halfBar;
        velocityRef.current = 0;
      } else if (reelPosRef.current > 100 - halfBar) {
        reelPosRef.current = 100 - halfBar;
        velocityRef.current = 0;
      }

      // 3. Overlap detection and progress update
      const isOverlapping = Math.abs(reelPosRef.current - fishPosRef.current) <= halfBar;
      if (isOverlapping) {
        progressRef.current += 16 * dt; // ~5.5s to reach 100% from 0
      } else {
        progressRef.current -= 11 * dt;
      }
      progressRef.current = Math.min(100, Math.max(0, progressRef.current));

      // 4. Direct DOM mutation for silky smooth 60fps without React re-renders
      if (fishElRef.current) {
        fishElRef.current.style.bottom = `${fishPosRef.current}%`;
      }
      if (reelElRef.current) {
        reelElRef.current.style.height = `${barSize}%`;
        reelElRef.current.style.bottom = `${Math.max(0, reelPosRef.current - halfBar)}%`;
      }
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progressRef.current}%`;
      }
      if (progressTextRef.current) {
        progressTextRef.current.innerText = `${Math.round(progressRef.current)}%`;
      }

      // 5. Evaluate win / loss condition
      if (progressRef.current >= 100) {
        finishedRef.current = true;
        handleStrikeSuccess();
        return;
      }

      if (progressRef.current <= 0) {
        finishedRef.current = true;
        handleStrikeEscape();
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (targetIntervalRef.current) clearInterval(targetIntervalRef.current);
    };
  }, [phase]);

  // 3. Robust Pointer & Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isPullingRef.current = true;
        setIsPullingVisual(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        isPullingRef.current = false;
        setIsPullingVisual(false);
      }
    };

    const handleBlur = () => {
      isPullingRef.current = false;
      setIsPullingVisual(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // 4. Server Reel Resolution Handlers
  const handleStrikeSuccess = async () => {
    if (!castIdRef.current) return;
    try {
      const res = await api.post('/world/fish/reel', {
        castId: castIdRef.current,
        caught: true
      });

      if (res.data?.ok) {
        sound.playDiscovery();
        setCaughtResult(res.data);
        setPhase('success');
        if (onCompleted) onCompleted(res.data);
      } else {
        setPhase('error');
        setErrorMessage(res.data?.error || 'Gagal memproses hasil tangkapan.');
      }
    } catch (err: any) {
      setPhase('error');
      setErrorMessage(err.response?.data?.error || err.message || 'Koneksi terputus saat menarik joran.');
    }
  };

  const handleStrikeEscape = async () => {
    if (castIdRef.current) {
      try {
        await api.post('/world/fish/reel', {
          castId: castIdRef.current,
          caught: false
        });
      } catch (err) {
        // Safe ignore on escaped reel
      }
    }
    setPhase('escaped');
  };

  const handlePullStart = () => {
    isPullingRef.current = true;
    setIsPullingVisual(true);
  };

  const handlePullEnd = () => {
    isPullingRef.current = false;
    setIsPullingVisual(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#0f172a] to-[#070b13] border border-cyan-500/70 rounded-2xl max-w-sm landscape:max-w-xl w-full p-4 sm:p-5 landscape:p-3 shadow-2xl relative flex flex-col items-center max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-1.5 transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1 text-cyan-300 shrink-0">
          <Waves className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-sm sm:text-base font-serif font-bold tracking-wide">
            {phase === 'playing' ? (fishInfo ? `Mancing: ${fishInfo.name}` : 'Tarik Joran Ikan Spiritual') : 'Memancing Jianghu'}
          </h2>
        </div>

        {/* Casting State */}
        {phase === 'casting' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs text-gray-300 font-serif">Melempar kail ke dalam perairan...</p>
            <p className="text-[10px] text-gray-500">Mencari gelombang ikan dan mengukur kedalaman air</p>
          </div>
        )}

        {/* Playing Minigame State */}
        {phase === 'playing' && (
          <>
            <p className="text-[10px] sm:text-[11px] text-gray-400 text-center mb-2 landscape:mb-1">
              Tahan tombol atau Spasi untuk menyeimbangkan bar joran pada posisi ikan!
            </p>

            <div className="flex flex-col landscape:flex-row items-center justify-around w-full gap-3 landscape:gap-4 my-1">
              {/* Vertical Water Column */}
              <div className="relative w-16 sm:w-20 h-52 sm:h-64 landscape:h-48 bg-[#080d1a] border-2 border-cyan-600/60 rounded-full overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/60 via-blue-950/40 to-transparent" />

                {/* Tension Safe Bar */}
                <div
                  ref={reelElRef}
                  className="absolute w-full rounded-md bg-cyan-500/30 border-y-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all duration-75"
                  style={{
                    height: `${targetZoneSizeRef.current}%`,
                    bottom: `${50 - targetZoneSizeRef.current / 2}%`
                  }}
                />

                {/* Swimming Fish */}
                <div
                  ref={fishElRef}
                  className="absolute flex items-center justify-center text-xl transition-all duration-75 z-10"
                  style={{ bottom: '50%' }}
                >
                  <Fish className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)] animate-pulse" />
                </div>
              </div>

              {/* Controls Column */}
              <div className="w-full flex flex-col justify-center space-y-2 sm:space-y-3">
                {/* Progress Bar */}
                <div className="w-full space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Anchor className="w-3 h-3 text-cyan-400" /> Tarikan:
                    </span>
                    <span
                      ref={progressTextRef}
                      className="font-bold text-cyan-300"
                    >
                      30%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-gray-800">
                    <div
                      ref={progressBarRef}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400 transition-all duration-75"
                      style={{ width: '30%' }}
                    />
                  </div>
                </div>

                {/* Hold to Reel Button */}
                <button
                  onPointerDown={handlePullStart}
                  onPointerUp={handlePullEnd}
                  onPointerLeave={handlePullEnd}
                  onPointerCancel={handlePullEnd}
                  className={`w-full py-3 rounded-xl font-serif font-bold text-xs sm:text-sm tracking-wide shadow-xl border transition-all active:scale-95 ${
                    isPullingVisual
                      ? 'bg-amber-600 border-amber-300 text-white shadow-amber-900/50'
                      : 'bg-cyan-900/80 hover:bg-cyan-800 border-cyan-400/80 text-cyan-100 shadow-cyan-950/60'
                  }`}
                >
                  {isPullingVisual ? 'Menahan Joran...!' : 'Tahan / Klik Untuk Menarik'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Success Screen */}
        {phase === 'success' && (
          <div className="w-full bg-emerald-950/80 border border-emerald-500/70 p-4 rounded-xl text-center space-y-2 animate-in zoom-in-95 my-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="font-serif font-bold text-emerald-200 text-sm">Strike Berhasil!</h3>
            <p className="text-xs text-gray-200">
              Mendapatkan 1x{' '}
              <span className="font-bold text-amber-300">
                {caughtResult?.fishItem?.name || fishInfo?.name || 'Ikan Spiritual'}
              </span>
              !
            </p>
            {caughtResult?.expGained && (
              <p className="text-[11px] text-emerald-300 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> +{caughtResult.expGained} EXP Profesi Mancing
                {caughtResult.leveledUp ? ' (Naik Level!)' : ''}
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-2 w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs"
            >
              Simpan ke Tas
            </button>
          </div>
        )}

        {/* Escaped Screen */}
        {phase === 'escaped' && (
          <div className="w-full bg-red-950/80 border border-red-500/70 p-4 rounded-xl text-center space-y-2 animate-in zoom-in-95 my-2">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="font-serif font-bold text-red-200 text-sm">Ikan Lepas!</h3>
            <p className="text-xs text-gray-300">
              Tarikan joran terlalu kendor sehingga ikan meloloskan diri ke dasar air.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-lg text-xs"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Error Screen */}
        {phase === 'error' && (
          <div className="w-full bg-red-950/80 border border-red-500/70 p-4 rounded-xl text-center space-y-2 animate-in zoom-in-95 my-2">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="font-serif font-bold text-red-200 text-sm">Gagal Memancing</h3>
            <p className="text-xs text-gray-300">{errorMessage || 'Terjadi kesalahan sistem.'}</p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-lg text-xs"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
