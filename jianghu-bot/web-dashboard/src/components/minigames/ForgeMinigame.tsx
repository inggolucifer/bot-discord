'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import { Hammer, Flame, CheckCircle2, X, AlertTriangle } from 'lucide-react';

interface ForgeMinigameProps {
  onClose: () => void;
  onCompleted?: (result: any) => void;
  sessionId: string;
}

export default function ForgeMinigame({ onClose, onCompleted, sessionId }: ForgeMinigameProps) {
  // Posisi target (0 s/d 100%)
  const [targetPos, setTargetPos] = useState<number>(50);
  // Posisi cursor pemain (0 s/d 100%)
  const [cursorPos, setCursorPos] = useState<number>(0);
  // Jumlah tempa sukses
  const [hits, setHits] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [rewards, setRewards] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loopRef = useRef<any>(null);
  const directionRef = useRef<number>(1);
  const maxHits = 5;
  const speed = 2.0;

  // Ukuran zona aman joran (lebar bar toleransi 20%)
  const BAR_TOLERANCE = 20;

  useEffect(() => {
    // Loop perubahan target secara statis di awal
    setTargetPos(Math.min(80, Math.max(20, Math.random() * 80 + 10)));

    // Game loop 60fps (16ms)
    loopRef.current = setInterval(() => {
      setCursorPos(prev => {
        let nextPos = prev + (directionRef.current * speed);
        if (nextPos >= 100) {
            nextPos = 100;
            directionRef.current = -1;
        } else if (nextPos <= 0) {
            nextPos = 0;
            directionRef.current = 1;
        }
        return nextPos;
      });
    }, 16);

    return () => {
      clearInterval(loopRef.current);
    };
  }, []);

  const handleHit = () => {
    if (isFinished) return;

    // Cek apakah posisi cursor ada di dalam toleransi target
    const diff = Math.abs(cursorPos - targetPos);
    if (diff <= BAR_TOLERANCE / 2) {
       // Sukses memukul
       const newHits = hits + 1;
       setHits(newHits);
       sound.playSwordChime(true);

       if (newHits >= maxHits) {
           handleSuccess();
       } else {
           // Pindah target
           setTargetPos(Math.min(80, Math.max(20, Math.random() * 80 + 10)));
           // Acak posisi cursor
           setCursorPos(0);
       }
    } else {
       // Gagal memukul
       handleFail();
    }
  };

  const handleSuccess = async () => {
    setIsFinished(true);
    if (loopRef.current) clearInterval(loopRef.current);
    sound.playDiscovery();

    try {
      const res = await api.post('/professions/complete', { sessionId, telemetryData: { hits } });
      if (res.data) {
        setIsSuccess(true);
        setRewards(res.data.result);
        if (onCompleted) onCompleted(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Koneksi terputus saat menempa.');
    }
  };

  const handleFail = async () => {
    setIsFinished(true);
    if (loopRef.current) clearInterval(loopRef.current);
    setIsSuccess(false);
    sound.playSwordChime(false);

    try {
      // API assumes no telemetry failure sends false success or similar if expected
      const res = await api.post('/professions/complete', { sessionId, telemetryData: { hits, failed: true } });
      if (onCompleted) onCompleted(res.data);
    } catch (err: any) {
       setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#11141c] border border-orange-900/50 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-950 to-red-950 p-3 flex justify-between items-center border-b border-orange-900/40">
          <div className="flex items-center gap-2 text-orange-400 font-bold font-serif text-sm">
            <Hammer size={18} />
            <span>Mini-Game Menempa</span>
          </div>
          <button onClick={onClose} disabled={!isFinished} className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
            <X size={20} />
          </button>
        </div>

        {/* Game Area */}
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center relative min-h-[250px]">
          {error ? (
             <div className="flex flex-col items-center text-red-400 text-center animate-in zoom-in">
               <AlertTriangle size={48} className="mb-4 opacity-80" />
               <p className="font-bold mb-2">Terjadi Kesalahan</p>
               <p className="text-xs opacity-70 mb-4">{error}</p>
               <button onClick={onClose} className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-800 rounded-md text-red-200 text-sm transition-colors">Tutup</button>
             </div>
          ) : isFinished ? (
             <div className="flex flex-col items-center text-center animate-in zoom-in duration-300">
               {isSuccess ? (
                 <>
                   <div className="w-16 h-16 rounded-full bg-orange-900/30 border border-orange-500/50 flex items-center justify-center mb-4">
                     <CheckCircle2 size={32} className="text-orange-400" />
                   </div>
                   <h3 className="text-xl font-bold text-orange-300 font-serif mb-2">Peralatan Tertempa!</h3>
                   <p className="text-xs text-stone-400 mb-6 max-w-[200px]">Kamu berhasil membentuk material menjadi karya.</p>
                 </>
               ) : (
                 <>
                   <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-500/50 flex items-center justify-center mb-4">
                     <X size={32} className="text-red-400" />
                   </div>
                   <h3 className="text-xl font-bold text-red-400 font-serif mb-2">Besi Hancur!</h3>
                   <p className="text-xs text-stone-400 mb-6 max-w-[200px]">Pukulanmu meleset dan merusak material...</p>
                 </>
               )}
               <button onClick={onClose} className="px-6 py-2.5 bg-gradient-to-r from-orange-800 to-red-900 hover:from-orange-700 hover:to-red-800 text-white font-bold rounded-lg shadow-lg border border-orange-700/50 transition-all active:scale-95 text-sm w-full">
                 Kembali
               </button>
             </div>
          ) : (
             <div className="w-full flex flex-col items-center gap-6">
                 {/* Panduan */}
                 <div className="text-center">
                    <p className="text-stone-300 text-sm font-serif mb-1">Tekan tepat pada zona aman!</p>
                    <p className="text-stone-500 text-xs">Pukulan: {hits} / {maxHits}</p>
                 </div>

                 {/* Bar Horizontal */}
                 <div className="w-full h-8 bg-gray-900 rounded-full relative overflow-hidden border border-gray-700">
                     {/* Zona Target */}
                     <div
                         className="absolute top-0 bottom-0 bg-orange-500/40 border-l-2 border-r-2 border-orange-400"
                         style={{
                             left: `${Math.max(0, targetPos - BAR_TOLERANCE/2)}%`,
                             width: `${BAR_TOLERANCE}%`
                         }}
                     />
                     {/* Kursor Bergerak */}
                     <div
                         className="absolute top-0 bottom-0 w-1.5 bg-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] z-10 -ml-[3px]"
                         style={{ left: `${cursorPos}%` }}
                     />
                 </div>

                 {/* Tombol Pukul */}
                 <button
                     className="w-full py-4 bg-gradient-to-b from-orange-600 to-orange-800 border-2 border-orange-400 text-white font-bold text-xl rounded-xl shadow-[0_5px_0_#9a3412] active:shadow-[0_0px_0_#9a3412] active:translate-y-[5px] transition-all"
                     onPointerDown={handleHit}
                 >
                     PUKUL PAlU
                 </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
