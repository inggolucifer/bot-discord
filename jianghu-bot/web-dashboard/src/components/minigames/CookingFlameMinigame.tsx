'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import { Flame, Utensils, Sparkles, CheckCircle2, X, AlertTriangle, Wind, Soup } from 'lucide-react';

interface CookingFlameMinigameProps {
  dishName?: string;
  onClose: () => void;
  onCompleted?: (result: any) => void;
}

export default function CookingFlameMinigame({ dishName = 'Sup Ikan Mas', onClose, onCompleted }: CookingFlameMinigameProps) {
  const [temperature, setTemperature] = useState<number>(50); // 0 (Dingin) s/d 100 (Hangus)
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [timeInGoldenZone, setTimeInGoldenZone] = useState<number>(0);
  const [seasoningPrompt, setSeasoningPrompt] = useState<{ id: number; name: string; key: string } | null>(null);
  const [seasoningHits, setSeasoningHits] = useState<number>(0);
  const [seasoningTotal, setSeasoningTotal] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isBurned, setIsBurned] = useState<boolean>(false);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const simRef = useRef<any>(null);
  const seasoningTimeoutRef = useRef<any>(null);

  // Zona Api Ideal Wok: 45 s/d 70
  const ZONE_MIN = 45;
  const ZONE_MAX = 70;

  const SEASONING_OPTIONS = [
    { name: 'Garam Api Gunung', key: 'e' },
    { name: 'Minyak Wijen Rohani', key: 'e' },
    { name: 'Daun Bawang Giok', key: 'e' },
    { name: 'Arak Beras Fermentasi', key: 'e' }
  ];

  useEffect(() => {
    // Countdown Timer 20 detik
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          finishCooking(false);
          return 0;
        }

        // Setiap kelipatan 5 detik munculkan prompt bumbu jika belum ada
        if (prev === 16 || prev === 11 || prev === 6) {
          spawnSeasoningPrompt();
        }

        return prev - 1;
      });
    }, 1000);

    // Simulasi Fisika Panas Kuali (100ms ticks)
    simRef.current = setInterval(() => {
      setTemperature(temp => {
        // Api cenderung perlahan meredup alami jika tidak ditiup (-1.2/tick)
        const cooling = -0.8 + (Math.random() - 0.5) * 1.5;
        const newTemp = Math.min(100, Math.max(0, temp + cooling));

        if (newTemp >= ZONE_MIN && newTemp <= ZONE_MAX) {
          setTimeInGoldenZone(t => t + 0.1);
        } else if (newTemp >= 95) {
          // Kuali terbakar hangus!
          setIsBurned(true);
          finishCooking(true);
        }

        return newTemp;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simRef.current) clearInterval(simRef.current);
      if (seasoningTimeoutRef.current) clearTimeout(seasoningTimeoutRef.current);
    };
  }, []);

  // Handle Keyboard (Spasi / W = Tambah Api, S = Dinginkan, E = Bumbu)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;
      if (e.code === 'Space' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleIncreaseHeat();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleDecreaseHeat();
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleApplySeasoning();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, seasoningPrompt]);

  const spawnSeasoningPrompt = () => {
    const picked = SEASONING_OPTIONS[Math.floor(Math.random() * SEASONING_OPTIONS.length)];
    setSeasoningPrompt({ id: Date.now(), name: picked.name, key: picked.key });
    setSeasoningTotal(t => t + 1);

    if (seasoningTimeoutRef.current) clearTimeout(seasoningTimeoutRef.current);
    seasoningTimeoutRef.current = setTimeout(() => {
      setSeasoningPrompt(null);
      setFeedback('Bumbu Terlambat Dimasukkan!');
      setTimeout(() => setFeedback(null), 1000);
    }, 2800);
  };

  const handleIncreaseHeat = () => {
    if (isFinished) return;
    sound.playCauldronSizzle();
    setTemperature(t => Math.min(100, t + 7));
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
  };

  const handleDecreaseHeat = () => {
    if (isFinished) return;
    setTemperature(t => Math.max(0, t - 6));
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const handleApplySeasoning = () => {
    if (isFinished || !seasoningPrompt) return;
    if (seasoningTimeoutRef.current) clearTimeout(seasoningTimeoutRef.current);
    
    sound.playCauldronSizzle();
    setSeasoningHits(h => h + 1);
    setSeasoningPrompt(null);
    setFeedback(`✨ Sempurna! Harum bumbu ${seasoningPrompt.name} meresap!`);
    setTimeout(() => setFeedback(null), 1200);
  };

  const finishCooking = async (burned: boolean) => {
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (simRef.current) clearInterval(simRef.current);
    if (seasoningTimeoutRef.current) clearTimeout(seasoningTimeoutRef.current);

    setLoading(true);
    try {
      let score = 0;
      if (!burned) {
        const heatAccuracy = Math.min(100, Math.round((timeInGoldenZone / 20) * 100));
        const seasoningAccuracy = seasoningTotal > 0 ? (seasoningHits / seasoningTotal) * 100 : 100;
        score = Math.round(heatAccuracy * 0.7 + seasoningAccuracy * 0.3);
      }

      const res = await api.post('/minigame/cooking/submit', {
        dishName,
        scorePercent: score,
        perfectSeasonings: seasoningHits
      });

      setReport(res.data);
      if (onCompleted) onCompleted(res.data);
    } catch (err: any) {
      setReport({
        success: false,
        message: err.response?.data?.error || 'Gagal menyimpan masakan.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getHeatColor = () => {
    if (temperature < ZONE_MIN) return 'from-blue-500 to-amber-500';
    if (temperature <= ZONE_MAX) return 'from-emerald-500 to-green-400';
    return 'from-orange-500 to-red-600 animate-pulse';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#1c130d] via-[#14101a] to-[#0a080e] border border-orange-700/60 rounded-2xl max-w-md landscape:max-w-2xl w-full p-4 sm:p-6 landscape:p-3 shadow-2xl relative flex flex-col text-white max-h-[95vh] overflow-y-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-orange-900/40 pb-2.5 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            <div>
              <h2 className="text-sm sm:text-base font-serif font-bold text-amber-200">Dapur Perapian & Memasak</h2>
              <p className="text-[10px] text-gray-400">Jaga panas wajan & taburkan bumbu pada saat yang tepat</p>
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
            {/* Left Column: Visual Wok & Seasoning Prompt */}
            <div className="w-full landscape:w-[48%] flex flex-col items-center space-y-2">
              <div className="relative w-full bg-gradient-to-b from-black/60 to-black/90 border border-orange-900/50 rounded-xl p-3 sm:p-4 landscape:p-2.5 flex flex-col items-center justify-center overflow-hidden">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 landscape:w-16 landscape:h-16 rounded-full border-4 flex items-center justify-center transition-all duration-300 shadow-2xl relative ${
                  temperature >= ZONE_MIN && temperature <= ZONE_MAX
                    ? 'border-emerald-500/80 bg-emerald-950/40 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                    : temperature > ZONE_MAX
                    ? 'border-red-500/80 bg-red-950/40 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse'
                    : 'border-blue-500/60 bg-blue-950/30'
                }`}>
                  <Soup className={`w-10 h-10 sm:w-12 sm:h-12 landscape:w-8 landscape:h-8 transition-transform ${temperature > ZONE_MAX ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
                  <div className="absolute -top-2 text-xs opacity-75 animate-pulse">♨️</div>
                </div>

                <div className="mt-2 text-center">
                  <span className="text-xs font-serif font-bold text-amber-300">{dishName}</span>
                  <p className="text-[10px] sm:text-[11px] text-gray-400">
                    {temperature < ZONE_MIN && '❄️ Api Redup! Tiup blower (+Panas).'}
                    {temperature >= ZONE_MIN && temperature <= ZONE_MAX && '✨ Wok Hei Sempurna! Aroma sedap meresap.'}
                    {temperature > ZONE_MAX && '🔥 Terlalu Panas! Segera tutup ventilasi!'}
                  </p>
                </div>

                {/* Feedback toast */}
                {feedback && (
                  <div className="absolute top-1.5 bg-black/90 border border-amber-500/60 text-amber-200 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg animate-in zoom-in-90">
                    {feedback}
                  </div>
                )}
              </div>

              {/* Prompt Tambah Bumbu QTE */}
              {seasoningPrompt && (
                <div className="w-full bg-gradient-to-r from-amber-950/90 via-orange-950/90 to-amber-950/90 border border-amber-400 rounded-xl p-2 sm:p-2.5 flex items-center justify-between shadow-2xl animate-bounce">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <div>
                      <span className="text-[10px] font-bold text-amber-200">Saatnya Bumbu!</span>
                      <p className="text-[10px] text-white font-serif">{seasoningPrompt.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleApplySeasoning}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg border border-amber-300 shadow-md active:scale-95"
                  >
                    Tabur! (E)
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Gauges & Controls */}
            <div className="w-full landscape:w-[48%] flex flex-col justify-center space-y-2.5">
              {/* Gauge Suhu Panas */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] sm:text-[11px] text-gray-300">
                  <span>Panas Wajan: <strong className="text-amber-300 font-mono">{Math.round(temperature)}°C</strong></span>
                  <span className="text-gray-400">Sisa Waktu: <strong className="text-orange-400 font-mono">{secondsLeft}s</strong></span>
                </div>
                
                <div className="w-full h-3.5 sm:h-4 bg-black/80 rounded-full border border-gray-700 overflow-hidden relative p-0.5">
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/30 border-x border-emerald-400"
                    style={{ left: `${ZONE_MIN}%`, width: `${ZONE_MAX - ZONE_MIN}%` }}
                  />
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getHeatColor()} transition-all duration-150`}
                    style={{ width: `${Math.min(100, Math.max(2, temperature))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] sm:text-[9px] text-gray-500">
                  <span>0° (Dingin)</span>
                  <span className="text-emerald-400">Zona Ideal (45° - 70°)</span>
                  <span>100° (Hangus)</span>
                </div>
              </div>

              {/* Tombol Kontrol Blower & Ventilasi */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleIncreaseHeat}
                  className="py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-700 to-amber-600 hover:from-orange-600 hover:to-amber-500 border border-orange-400/60 text-white font-serif font-bold text-[11px] sm:text-xs shadow-lg flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-200" />
                  <span>Tiup Api (+Panas / Spasi)</span>
                </button>
                <button
                  onClick={handleDecreaseHeat}
                  className="py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-slate-800 to-blue-900 hover:from-slate-700 hover:to-blue-800 border border-blue-500/50 text-blue-200 font-serif font-bold text-[11px] sm:text-xs shadow-lg flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <Wind className="w-3.5 h-3.5 text-blue-300" />
                  <span>Tutup Ventilasi (-Panas / S)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Layar Laporan Hasil Masakan */
          <div className="space-y-4 py-3 text-center">
            {isBurned ? (
              <div className="space-y-2">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
                <h3 className="text-base font-serif font-bold text-red-400">Masakan Hangus Terbakar!</h3>
                <p className="text-xs text-gray-400">Suhu wajan melampaui batas toleransi sehingga hidangan gosong.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
                <h3 className="text-base font-serif font-bold text-amber-300">
                  {report?.isMasterDish ? 'Mahakarya Masakan Sempurna!' : 'Hidangan Siap Disajikan!'}
                </h3>
                <p className="text-xs text-gray-300 font-serif">
                  {report?.message || 'Cita rasa masakan meresap dengan sangat lezat.'}
                </p>
                {report && (
                  <div className="bg-black/50 border border-amber-800/60 rounded-lg p-3 text-left text-xs space-y-1 mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cita Rasa & Wok Hei:</span>
                      <strong className="text-amber-300 font-mono">{report.scorePercent}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pemulihan Stamina:</span>
                      <strong className="text-emerald-300 font-mono">+{report.staminaGain} Stamina</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">EXP Memasak:</span>
                      <strong className="text-orange-300 font-mono">+{report.expGain} EXP</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-serif font-bold text-xs shadow-lg border border-amber-400/50 transition-all active:scale-95"
            >
              Kembali ke Dapur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
