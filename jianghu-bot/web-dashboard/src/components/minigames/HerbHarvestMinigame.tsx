'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import { Leaf, Sparkles, CheckCircle2, X, AlertTriangle, Sprout, Scissors } from 'lucide-react';

interface HerbHarvestMinigameProps {
  cropName?: string;
  onClose: () => void;
  onCompleted?: (result: any) => void;
}

export default function HerbHarvestMinigame({ cropName = 'Herba Rohani', onClose, onCompleted }: HerbHarvestMinigameProps) {
  // Cursor posisi (0 s/d 100%)
  const [cursorPos, setCursorPos] = useState<number>(10);
  const [direction, setDirection] = useState<number>(1); // 1 ke kanan, -1 ke kiri
  // Tahap pencabutan (1: Serat Atas, 2: Serat Cabang, 3: Umbi Rohani Utama)
  const [stage, setStage] = useState<number>(1);
  const [successfulPulls, setSuccessfulPulls] = useState<number>(0);
  const [failedPulls, setFailedPulls] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loopRef = useRef<any>(null);

  // Sweet spot range (misal 42% s/d 58%)
  const SWEET_MIN = 42;
  const SWEET_MAX = 58;

  useEffect(() => {
    // Animasi osilasi kursor kiri-kanan
    loopRef.current = setInterval(() => {
      if (isFinished) return;

      setCursorPos(prev => {
        const speed = stage === 1 ? 2.2 : stage === 2 ? 2.7 : 3.2; // Semakin dalam akar semakin cepat bergoyang
        let next = prev + direction * speed;

        if (next >= 96) {
          next = 96;
          setDirection(-1);
        } else if (next <= 4) {
          next = 4;
          setDirection(1);
        }

        return next;
      });
    }, 20);

    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [direction, isFinished, stage]);

  // Handle Keyboard (Space / Enter untuk mencabut)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handlePullRoot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, cursorPos, stage, successfulPulls, failedPulls]);

  const handlePullRoot = () => {
    if (isFinished) return;

    const isHit = cursorPos >= SWEET_MIN && cursorPos <= SWEET_MAX;

    if (isHit) {
      sound.playDiscovery();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);

      const nextPulls = successfulPulls + 1;
      setSuccessfulPulls(nextPulls);
      setFeedback({ text: '✨ Tepat! Serat akar terangkat mulus!', color: 'text-emerald-300' });

      if (stage >= 3) {
        finishHarvest(nextPulls, failedPulls);
      } else {
        setStage(s => s + 1);
      }
    } else {
      sound.playSwordChime(false);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);

      const nextFails = failedPulls + 1;
      setFailedPulls(nextFails);
      setFeedback({ text: '⚠️ Kasar! Sedikit serat akar patah!', color: 'text-amber-400' });

      if (stage >= 3 || nextFails >= 2) {
        finishHarvest(successfulPulls, nextFails);
      } else {
        setStage(s => s + 1);
      }
    }

    setTimeout(() => setFeedback(null), 800);
  };

  const finishHarvest = async (successes: number, fails: number) => {
    setIsFinished(true);
    if (loopRef.current) clearInterval(loopRef.current);

    setLoading(true);
    try {
      const accuracy = Math.round((successes / 3) * 100);
      const rootsIntact = fails === 0;

      const res = await api.post('/minigame/harvest/submit', {
        cropName,
        accuracyPercent: accuracy,
        rootsIntact
      });

      setReport(res.data);
      if (onCompleted) onCompleted(res.data);
    } catch (err: any) {
      setReport({
        success: false,
        message: err.response?.data?.error || 'Gagal memproses hasil panen.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#0e1a12] via-[#09120d] to-[#050a07] border border-emerald-700/60 rounded-2xl max-w-md landscape:max-w-2xl w-full p-4 sm:p-6 landscape:p-3 shadow-2xl relative flex flex-col text-white max-h-[95vh] overflow-y-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2.5 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm sm:text-base font-serif font-bold text-emerald-200">Panen Herba & Tani Presisi</h2>
              <p className="text-[10px] text-gray-400">Cabut serat akar saat indikator berada tepat di zona hijau</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-black/40 rounded-full p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isFinished ? (
          <div className="flex flex-col landscape:flex-row items-center justify-around w-full gap-3 landscape:gap-4">
            {/* Left Column: Plant Visual & Stage */}
            <div className="w-full landscape:w-[48%] flex flex-col items-center">
              <div className="relative w-full bg-gradient-to-b from-black/60 to-black/90 border border-emerald-900/50 rounded-xl p-3 sm:p-4 landscape:p-2.5 flex flex-col items-center justify-center overflow-hidden">
                <div className="w-16 h-16 sm:w-20 sm:h-20 landscape:w-14 landscape:h-14 rounded-full border-2 border-emerald-500/50 bg-emerald-950/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Sprout className="w-8 h-8 sm:w-10 sm:h-10 landscape:w-7 landscape:h-7 text-emerald-400 animate-pulse" />
                </div>

                <div className="mt-2 text-center">
                  <span className="text-xs font-serif font-bold text-emerald-300">{cropName}</span>
                  <p className="text-[10px] sm:text-[11px] text-gray-400">
                    Tahap {stage} / 3: {stage === 1 ? 'Melepas Tanah & Serat Atas' : stage === 2 ? 'Menyelaraskan Serat Cabang' : 'Mencabut Umbi Rohani Utama'}
                  </p>
                </div>

                {/* Feedback toast */}
                {feedback && (
                  <div className={`absolute top-1.5 bg-black/90 border border-emerald-500/60 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg animate-in zoom-in-90 ${feedback.color}`}>
                    {feedback.text}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Oscillating Gauge & Pull Action */}
            <div className="w-full landscape:w-[48%] flex flex-col justify-center space-y-2.5">
              {/* Indikator Osilasi Bar Panen */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] sm:text-[11px] text-gray-300">
                  <span>Tekanan Cabut:</span>
                  <span className="text-emerald-400 font-bold">
                    {cursorPos >= SWEET_MIN && cursorPos <= SWEET_MAX ? '✨ PAS! CABUT SEKARANG' : 'Goyang Perlahan...'}
                  </span>
                </div>
                
                <div className="w-full h-6 sm:h-7 bg-black/80 rounded-full border border-gray-700 overflow-hidden relative">
                  {/* Zona Hijau Ideal (Sweet Spot) */}
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/50 border-x-2 border-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                    style={{ left: `${SWEET_MIN}%`, width: `${SWEET_MAX - SWEET_MIN}%` }}
                  >
                    <span className="text-[8px] sm:text-[9px] font-bold text-white tracking-widest uppercase">ZONA</span>
                  </div>

                  {/* Kursor Jarum Pencabut */}
                  <div
                    className="absolute top-0 bottom-0 w-2.5 bg-amber-300 rounded-full shadow-[0_0_10px_rgba(252,211,77,1)] -translate-x-1/2 transition-all duration-75"
                    style={{ left: `${cursorPos}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] sm:text-[9px] text-gray-500">
                  <span>Lemah</span>
                  <span className="text-emerald-400">Cabut Lembut</span>
                  <span>Kuat (Patah)</span>
                </div>
              </div>

              {/* Tombol Aksi Tarik */}
              <div className="pt-1">
                <button
                  onClick={handlePullRoot}
                  className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-700 via-green-600 to-teal-700 hover:from-emerald-600 hover:to-teal-600 border border-emerald-400/60 text-white font-serif font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Scissors className="w-4 h-4 text-emerald-200" />
                  <span>Tarik Serat Akar (Spasi / Klik)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Layar Laporan Panen */
          <div className="space-y-4 py-3 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
            <h3 className="text-base font-serif font-bold text-emerald-300">
              {report?.isPristine ? 'Panen Mahakarya Murni!' : 'Panen Berhasil Selesai!'}
            </h3>
            <p className="text-xs text-gray-300 font-serif">
              {report?.message || 'Akar herba berhasil dicabut dan diamankan ke tas.'}
            </p>

            {report && (
              <div className="bg-black/50 border border-emerald-800/60 rounded-lg p-3 text-left text-xs space-y-1 mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Kerapian & Keutuhan Akar:</span>
                  <strong className="text-emerald-300 font-mono">{report.accuracyPercent}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Hasil Panen Diperoleh:</span>
                  <strong className="text-amber-300 font-mono">{report.harvestQty}x {report.cropName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">EXP Pertanian:</span>
                  <strong className="text-green-300 font-mono">+{report.expGain} EXP</strong>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-serif font-bold text-xs shadow-lg border border-emerald-400/50 transition-all active:scale-95"
            >
              Simpan Hasil Panen & Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
