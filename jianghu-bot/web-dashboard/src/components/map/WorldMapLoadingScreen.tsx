'use client';
import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, Shield, Flame, Mountain, Wind, Feather } from 'lucide-react';

interface WorldMapLoadingScreenProps {
  isReady?: boolean;
  onFadeComplete?: () => void;
  customTip?: string;
}

const CULTIVATION_TIPS = [
  {
    icon: Mountain,
    title: 'Penjelajahan Alam Liar',
    text: 'Gunakan Kuda Ferghana atau Pedang Terbang untuk menghemat konsumsi stamina langkah dan melintasi tebing terjal tanpa terhalang.'
  },
  {
    icon: Wind,
    title: 'Iklim & Suhu Ekstrem',
    text: 'Suhu dingin di malam hari dapat memicu Hipotermia pada tubuh fana. Masuklah ke bangunan atau gunakan tenda untuk bertahan hidup.'
  },
  {
    icon: Shield,
    title: 'Seni Pertahanan Kuda-Kuda Besi',
    text: 'Saat musuh mengumpulkan hawa membunuh, pasang Kuda-Kuda Besi (Tangkis) untuk menahan 50% damage dan memulihkan Stance serta Qi.'
  },
  {
    icon: Flame,
    title: 'Pengikatan Hukum Fondasi Fana',
    text: 'Gulungan Hukum Alam (Law) hanya dapat dipatri ketika dantianmu masih di ranah Mortal. Pilih elemen yang selaras dengan takdir Dao-mu!'
  },
  {
    icon: Sparkles,
    title: 'Intisari Stance Break',
    text: 'Menghancurkan Stance musuh hingga 0 memicu status BREAK, memberikan bonus 50% damage serangan fisik dan spiritual.'
  },
  {
    icon: Feather,
    title: 'Pelatihan Bela Diri',
    text: 'Tingkatkan kemahiran senjata (Pedang, Golok, Tinju) melalui pertarungan nyata untuk memenuhi syarat mempelajari kitab esoteris tinggi.'
  }
];

export default function WorldMapLoadingScreen({
  isReady = false,
  onFadeComplete,
  customTip
}: WorldMapLoadingScreenProps) {
  const [progress, setProgress] = useState(15);
  const [tipIndex, setTipIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Cycle tips every 4 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % CULTIVATION_TIPS.length);
    }, 4000);
    return () => clearInterval(tipInterval);
  }, []);

  // Animate progress smoothly
  useEffect(() => {
    if (isReady) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        const fadeTimer = setTimeout(() => {
          setIsDone(true);
          onFadeComplete?.();
        }, 600);
        return () => clearTimeout(fadeTimer);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 92) return 92;
          const increment = Math.max(1, Math.floor((92 - prev) * 0.15));
          return Math.min(92, prev + increment);
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isReady, onFadeComplete]);

  if (isDone) return null;

  // Dynamic phase text based on progress
  let phaseText = 'Membuka segel gulungan peta purba Benua Tianyuan...';
  if (progress >= 85) {
    phaseText = 'Menyibak kabur spiritual... Memasuki Benua Jianghu!';
  } else if (progress >= 60) {
    phaseText = 'Menghubungkan dantian pendekar ke koordinat spasial...';
  } else if (progress >= 40) {
    phaseText = 'Memetakan petak pemukiman, sumber daya & siluman liar...';
  } else if (progress >= 20) {
    phaseText = 'Menyelaraskan Qi langit, suhu iklim & formasi heksagram...';
  }

  const currentTip = CULTIVATION_TIPS[tipIndex];
  const TipIcon = currentTip.icon;

  return (
    <div
      className={`fixed inset-0 z-[10000] w-screen h-screen flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden bg-[#060913] transition-opacity duration-600 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient Celestial Qi Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-[#0a0f20] to-[#04060b] pointer-events-none" />

      {/* Decorative Wuxia Top Calligraphy Header */}
      <div className="relative z-10 flex flex-col items-center text-center mt-4 sm:mt-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-2 text-amber-500/80 text-[11px] sm:text-xs font-mono tracking-[0.3em] uppercase mb-1">
          <span>❖</span>
          <span>Benua Tianyuan 5000 x 5000</span>
          <span>❖</span>
        </div>
        <h1 className="font-serif font-black text-2xl sm:text-4xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-600 drop-shadow-[0_2px_15px_rgba(245,158,11,0.3)]">
          MEMBENTANGKAN PETA JIANGHU
        </h1>
        <p className="text-[11px] sm:text-xs text-amber-200/60 font-serif italic mt-1 tracking-widest">
          天地初開 · 萬象森羅 · 氣貫乾坤
        </p>
      </div>

      {/* CENTRAL VISUAL: ANCIENT BAGUA YIN-YANG COMPASS */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        {/* Outer Rotating Celestial Halo */}
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
          
          {/* Subtle Outer Pulsing Qi Ring */}
          <div className="absolute inset-0 rounded-full border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.15)] animate-ping duration-1000 opacity-20" />

          {/* Bagua Trigram Outer Ring (Rotates Clockwise) */}
          <div className="absolute inset-0 rounded-full border-2 border-amber-600/40 animate-[spin_24s_linear_infinite] flex items-center justify-center">
            {/* Trigram Symbols Placed Around Perimeter */}
            <span className="absolute -top-3 text-amber-400 font-bold text-sm select-none">☰</span>
            <span className="absolute -bottom-3 text-amber-400 font-bold text-sm select-none">☷</span>
            <span className="absolute -left-3 text-amber-400 font-bold text-sm select-none">☵</span>
            <span className="absolute -right-3 text-amber-400 font-bold text-sm select-none">☲</span>
            <span className="absolute top-4 left-4 text-amber-400/80 font-bold text-xs select-none">☴</span>
            <span className="absolute top-4 right-4 text-amber-400/80 font-bold text-xs select-none">☱</span>
            <span className="absolute bottom-4 left-4 text-amber-400/80 font-bold text-xs select-none">☶</span>
            <span className="absolute bottom-4 right-4 text-amber-400/80 font-bold text-xs select-none">☳</span>
          </div>

          {/* Middle Counter-Rotating Compass Needle Ring */}
          <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-dashed border-amber-400/30 animate-[spin_16s_linear_infinite_reverse] flex items-center justify-center">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <div className="h-full w-0.5 bg-gradient-to-b from-transparent via-amber-400/40 to-transparent absolute" />
          </div>

          {/* Inner Yin-Yang & Golden Core Container */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-b from-[#141b2f] to-[#0a0f1d] border-2 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.3)] flex flex-col items-center justify-center">
            {/* Pulsing Core Pearl */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.6)] flex items-center justify-center animate-pulse">
              <Compass className="w-7 h-7 sm:w-9 sm:h-9 text-[#0b0f19]" />
            </div>

            {/* Percentage Display Pill */}
            <div className="absolute -bottom-3 bg-black/90 px-2.5 py-0.5 rounded-full border border-amber-500/70 text-[10px] sm:text-xs font-mono font-bold text-amber-300 shadow-md">
              {progress}%
            </div>
          </div>
        </div>

        {/* Dynamic Loading Phase Text */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="text-xs sm:text-sm text-amber-200 font-serif tracking-wide text-center">
            {phaseText}
          </div>

          {/* Glowing Silk Progress Bar */}
          <div className="w-64 sm:w-80 h-2 bg-black/80 rounded-full border border-amber-900/60 p-0.5 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-300 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM CULTIVATOR WISDOM / TIPS PANEL */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-black/70 border border-amber-900/50 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md shadow-2xl animate-in fade-in duration-700 mb-2">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center shrink-0 shadow-md">
            <TipIcon className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider font-mono">
              Petunjuk Jianghu · {currentTip.title}
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-sans mt-0.5 transition-all duration-500">
              {customTip || currentTip.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
