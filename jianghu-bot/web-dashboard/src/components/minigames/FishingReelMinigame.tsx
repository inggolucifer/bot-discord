'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import { Fish, Sparkles, CheckCircle2, X, AlertTriangle, Waves } from 'lucide-react';

interface FishingReelMinigameProps {
  onClose: () => void;
  onCompleted?: (result: any) => void;
  zoneId?: string;
}

export default function FishingReelMinigame({ onClose, onCompleted, zoneId }: FishingReelMinigameProps) {
  // Posisi ikan (0 s/d 100%)
  const [fishPos, setFishPos] = useState<number>(50);
  // Posisi bar joran tarikan pemain (0 s/d 100%)
  const [reelPos, setReelPos] = useState<number>(50);
  // Status tarikan tombol (ditekan atau dilepas)
  const [isPulling, setIsPulling] = useState<boolean>(false);
  // Progress tangkapan (0 s/d 100%)
  const [progress, setProgress] = useState<number>(30);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [caughtFish, setCaughtFish] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loopRef = useRef<any>(null);
  const velocityRef = useRef<number>(0);
  const fishTargetRef = useRef<number>(50);

  // Ukuran zona aman joran (lebar bar toleransi 24%)
  const BAR_TOLERANCE = 24;

  useEffect(() => {
    // Loop perubahan target ikan setiap 700ms
    const fishMovementInterval = setInterval(() => {
      fishTargetRef.current = Math.min(85, Math.max(15, Math.random() * 80 + 10));
    }, 750);

    // Game loop 60fps (16ms)
    loopRef.current = setInterval(() => {
      if (isFinished) return;

      // 1. Gerakkan ikan ke arah targetnya dengan inertia lembut
      setFishPos(current => {
        const diff = fishTargetRef.current - current;
        return current + diff * 0.08;
      });

      // 2. Fisika tarikan joran: jika menarik -> naik; jika lepas -> meluncur turun
      setReelPos(current => {
        if (isPulling) {
          velocityRef.current = Math.min(velocityRef.current + 0.6, 3.8);
        } else {
          velocityRef.current = Math.max(velocityRef.current - 0.5, -3.5);
        }
        return Math.min(100 - BAR_TOLERANCE / 2, Math.max(BAR_TOLERANCE / 2, current + velocityRef.current));
      });

      // 3. Evaluasi apakah ikan berada di dalam jangkauan bar joran
      setReelPos(rPos => {
        setFishPos(fPos => {
          const isOverlapping = Math.abs(rPos - fPos) <= BAR_TOLERANCE / 2;

          setProgress(p => {
            const nextP = isOverlapping ? p + 0.55 : p - 0.35;
            if (nextP >= 100) {
              handleCatchSuccess();
              return 100;
            }
            if (nextP <= 0) {
              handleFishEscape();
              return 0;
            }
            return nextP;
          });

          return fPos;
        });
        return rPos;
      });
    }, 20);

    return () => {
      clearInterval(fishMovementInterval);
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [isPulling, isFinished]);

  // Handle tombol tahan/lepas (Mouse & Touch & Keyboard Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPulling(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPulling(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleCatchSuccess = async () => {
    setIsFinished(true);
    if (loopRef.current) clearInterval(loopRef.current);
    sound.playDiscovery();

    try {
      const res = await api.post('/grid/profession/fish', { zoneId: zoneId || 'tianyuan_world_map' });
      if (res.data.ok) {
        setIsSuccess(true);
        setCaughtFish(res.data);
        if (onCompleted) onCompleted(res.data);
      } else {
        setError(res.data.error || 'Gagal memproses hasil tangkapan.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Koneksi terputus saat menarik joran.');
    }
  };

  const handleFishEscape = () => {
    setIsFinished(true);
    if (loopRef.current) clearInterval(loopRef.current);
    setIsSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#0f172a] to-[#070b13] border border-cyan-500/70 rounded-2xl max-w-sm landscape:max-w-xl w-full p-4 sm:p-5 landscape:p-3 shadow-2xl relative flex flex-col items-center max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-1.5 transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1 text-cyan-300 shrink-0">
          <Waves className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-sm sm:text-base font-serif font-bold tracking-wide">Tarik Joran Ikan Spiritual</h2>
        </div>
        <p className="text-[10px] sm:text-[11px] text-gray-400 text-center mb-2 landscape:mb-1">
          Tahan tombol atau spasi untuk menyeimbangkan joran pada posisi ikan!
        </p>

        {/* Play Area: Side-by-side in landscape */}
        <div className="flex flex-col landscape:flex-row items-center justify-around w-full gap-3 landscape:gap-4 my-1">
          {/* Indikator Tabung Pancing Vertikal */}
          <div className="relative w-16 sm:w-20 h-52 sm:h-64 landscape:h-48 bg-[#080d1a] border-2 border-cyan-600/60 rounded-full overflow-hidden shadow-inner flex items-center justify-center shrink-0">
            {/* Air Bergelombang Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/60 to-transparent" />

            {/* Bar Toleransi Joran Hijau / Emas (Mengikuti reelPos) */}
            <div
              className="absolute w-full rounded-md bg-cyan-500/30 border-y-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all duration-75"
              style={{
                height: `${BAR_TOLERANCE}%`,
                bottom: `${Math.max(0, Math.min(100 - BAR_TOLERANCE, reelPos - BAR_TOLERANCE / 2))}%`
              }}
            />

            {/* Target Ikan yang Berenang (Mengikuti fishPos) */}
            <div
              className="absolute flex items-center justify-center text-xl transition-all duration-100 z-10"
              style={{
                bottom: `${Math.max(4, Math.min(92, fishPos))}%`
              }}
            >
              <Fish className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)] animate-bounce" />
            </div>
          </div>

          {/* Right Controls Column */}
          <div className="w-full flex flex-col justify-center space-y-2 sm:space-y-3">
            {/* Progress Bar Tangkapan */}
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-gray-400">Tangkapan:</span>
                <span className={`font-bold ${progress >= 75 ? 'text-emerald-400' : progress >= 40 ? 'text-amber-300' : 'text-cyan-300'}`}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-gray-800">
                <div
                  className={`h-full transition-all duration-100 rounded-full ${
                    progress >= 75
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : progress >= 40
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Tombol Interaktif Tarik Joran */}
            {!isFinished && (
              <button
                onMouseDown={() => setIsPulling(true)}
                onMouseUp={() => setIsPulling(false)}
                onTouchStart={() => setIsPulling(true)}
                onTouchEnd={() => setIsPulling(false)}
                className={`w-full py-2.5 sm:py-3 rounded-xl font-serif font-bold text-xs sm:text-sm tracking-wide shadow-xl border transition-all active:scale-95 ${
                  isPulling
                    ? 'bg-amber-600 border-amber-300 text-white shadow-amber-900/50'
                    : 'bg-cyan-900/80 hover:bg-cyan-800 border-cyan-400/80 text-cyan-100 shadow-cyan-950/60'
                }`}
              >
                {isPulling ? '🎣 Menahan Joran...!' : 'Tahan / Klik Untuk Menarik'}
              </button>
            )}
          </div>
        </div>

        {/* Layar Hasil Sukses / Lepas */}
        {isFinished && isSuccess && (
          <div className="w-full bg-emerald-950/80 border border-emerald-500/70 p-4 rounded-xl text-center space-y-2 animate-in zoom-in-95">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="font-serif font-bold text-emerald-200 text-sm">Strike Berhasil!</h3>
            <p className="text-xs text-gray-200">
              Mendapatkan 1x <span className="font-bold text-amber-300">{caughtFish?.fishName || 'Ikan Spiritual'}</span>!
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs"
            >
              Simpan ke Tas
            </button>
          </div>
        )}

        {isFinished && !isSuccess && (
          <div className="w-full bg-red-950/80 border border-red-500/70 p-4 rounded-xl text-center space-y-2 animate-in zoom-in-95">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="font-serif font-bold text-red-200 text-sm">Ikan Lepas!</h3>
            <p className="text-xs text-gray-300">
              {error || 'Tarikan joran terlalu kendor sehingga ikan meloloskan diri ke dasar air.'}
            </p>
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
