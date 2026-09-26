'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Skull, Award, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface TribulationWave {
  wave: number;
  damage: number;
  survived: boolean;
}

export interface TribulationData {
  survived: boolean;
  wavesCleared: number;
  totalDamage: number;
  survivalHP: number;
  waveDetails: TribulationWave[];
  tribulationTitle?: string;
}

interface HeavenlyTribulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tribulation: TribulationData | null;
  newRealmName?: string;
  newLevelCap?: number | null;
  isSuccess: boolean;
  message?: string;
}

export default function HeavenlyTribulationModal({
  isOpen,
  onClose,
  tribulation,
  newRealmName,
  newLevelCap,
  isSuccess,
  message
}: HeavenlyTribulationModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [flashing, setFlashing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      // Animasi gelombang berurutan
      const timer1 = setTimeout(() => {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 200);
        setCurrentStep(1);
      }, 700);

      const timer2 = setTimeout(() => {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 200);
        setCurrentStep(2);
      }, 1600);

      const timer3 = setTimeout(() => {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 300);
        setCurrentStep(3);
      }, 2500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen]);

  if (!isOpen || !tribulation) return null;

  const waves = tribulation.waveDetails || [
    { wave: 1, damage: 100, survived: true },
    { wave: 2, damage: 130, survived: true },
    { wave: 3, damage: 160, survived: tribulation.survived }
  ];

  const waveTitles = [
    'Gelombang 1: Guntur Pemecah Meridian',
    'Gelombang 2: Kilat Pelebur Sumsum',
    'Gelombang 3: Petir Kesengsaraan Langit Purba'
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
        {/* Efek Kilatan Petir di Layar */}
        {flashing && (
          <div className="fixed inset-0 bg-purple-500/30 z-[1000000] pointer-events-none transition-opacity duration-100" />
        )}

        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-[#191124] via-[#0d0914] to-[#08060c] border-2 border-purple-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(168,85,247,0.35)] text-stone-100 overflow-hidden my-8"
        >
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 blur-[100px] pointer-events-none rounded-full" />
          <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-amber-500/10 blur-[90px] pointer-events-none rounded-full" />

          {/* Header */}
          <div className="text-center space-y-2 relative z-10 mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 font-mono text-xs uppercase tracking-widest shadow-inner">
              <Zap size={14} className="text-yellow-400 animate-bounce" />
              <span>Tribulasi Petir Surgawi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-amber-200 to-yellow-300 drop-shadow">
              {tribulation.tribulationTitle || 'Ujian Kesengsaraan Langit Sembilan Awan'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 max-w-lg mx-auto leading-relaxed">
              Langit semesta menguji fondasi tubuh fisik dan kesiapan spiritualmu dengan sambaran petir berkekuatan destruktif!
            </p>
          </div>

          {/* Bar Perbandingan Survival HP vs Total Damage */}
          <div className="grid grid-cols-2 gap-3 mb-6 relative z-10 bg-black/50 p-4 rounded-2xl border border-purple-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <Shield size={20} />
              </div>
              <div>
                <div className="text-[10px] text-stone-400 font-mono">Daya Tahan Fisik (Survival HP)</div>
                <div className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                  {tribulation.survivalHP.toLocaleString()} <span className="text-xs text-stone-500">HP</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
                <Zap size={20} className="text-yellow-400" />
              </div>
              <div>
                <div className="text-[10px] text-stone-400 font-mono">Total Damage Petir</div>
                <div className="text-base sm:text-lg font-bold font-mono text-purple-300">
                  {tribulation.totalDamage.toLocaleString()} <span className="text-xs text-stone-500">DMG</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Gelombang Sambaran Petir */}
          <div className="space-y-3 mb-6 relative z-10">
            {waves.map((w, idx) => {
              const isRevealed = currentStep > idx;
              const isWaveCleared = w.survived;

              return (
                <div
                  key={w.wave}
                  className={`p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                    isRevealed
                      ? isWaveCleared
                        ? 'bg-purple-950/30 border-purple-500/50 shadow-md'
                        : 'bg-red-950/40 border-red-500/60 shadow-lg'
                      : 'bg-black/30 border-stone-800/60 opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        isRevealed
                          ? isWaveCleared
                            ? 'bg-purple-600/40 text-purple-200 border border-purple-400/50'
                            : 'bg-red-600/40 text-red-200 border border-red-400/50'
                          : 'bg-stone-800 text-stone-500'
                      }`}
                    >
                      W{w.wave}
                    </div>
                    <div>
                      <div className="font-serif font-bold text-xs sm:text-sm text-stone-200">
                        {waveTitles[idx] || `Gelombang ${w.wave}`}
                      </div>
                      <div className="text-[11px] font-mono text-stone-400">
                        Intensitas Sambaran: <span className="text-yellow-400 font-bold">{w.damage.toLocaleString()} DMG</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {isRevealed ? (
                      isWaveCleared ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold shadow-sm">
                          <CheckCircle2 size={13} /> LULUS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/80 border border-red-500/50 text-red-300 font-mono text-xs font-bold shadow-sm">
                          <XCircle size={13} /> JEBOL
                        </span>
                      )
                    ) : (
                      <span className="text-xs font-mono text-stone-600 italic">Menunggu...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Akhir & Hasil Terobosan */}
          {currentStep >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border text-center space-y-2 mb-6 relative z-10 ${
                tribulation.survived && isSuccess
                  ? 'bg-gradient-to-r from-amber-950/50 via-purple-950/50 to-amber-950/50 border-amber-500/50 shadow-xl'
                  : 'bg-red-950/40 border-red-500/50 shadow-xl'
              }`}
            >
              {tribulation.survived && isSuccess ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-serif font-bold text-lg">
                    <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
                    <span>TRIBULASI BERHASIL DILALUI DENGAN GEMILANG!</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed max-w-md mx-auto">
                    {message || 'Dantianmu telah dimurnikan oleh kilat surgawi. Batas wadah fisikmu meluas secara drastis!'}
                  </p>
                  {newLevelCap && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 font-mono text-xs font-bold mt-2">
                      <Award size={15} className="text-yellow-400" />
                      <span>Batas Level Karakter Terbuka Hingga: Level {newLevelCap}!</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-red-300 font-serif font-bold text-base">
                    <Skull className="w-5 h-5 text-red-400" />
                    <span>GAGAL MENAHAN KESENGSARAAN PETIR SURGAWI!</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed max-w-md mx-auto">
                    {message || 'Kapasitas pertahanan fisikmu roboh. Perkuat DEF, Vitalitas, atau gunakan pil pelindung meridian sebelum mencoba lagi.'}
                  </p>
                </>
              )}
            </motion.div>
          )}

          {/* Action Button */}
          <div className="flex justify-center relative z-10">
            <Button
              onClick={onClose}
              className={`w-full sm:w-auto px-8 py-3 rounded-xl font-serif font-bold text-sm shadow-xl transition-all ${
                tribulation.survived && isSuccess
                  ? 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-600'
              }`}
            >
              {tribulation.survived && isSuccess
                ? '✨ Konsolidasikan Dantian & Lanjutkan Perjalanan'
                : 'Kembali & Pulihkan Meridian Tubuh'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
