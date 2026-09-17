'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw, Maximize2, X, Compass } from 'lucide-react';

interface LandscapeOrientationPromptProps {
  onDismiss?: () => void;
}

export default function LandscapeOrientationPrompt({ onDismiss }: LandscapeOrientationPromptProps) {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Cek apakah perangkat adalah mobile / tablet (lebar <= 1024px) dalam posisi portrait (tinggi > lebar)
      const isPortrait = window.innerHeight > window.innerWidth || window.matchMedia('(orientation: portrait)').matches;
      const isMobileDevice = window.innerWidth <= 1024 || window.innerHeight <= 1024;
      setIsPortraitMobile(isPortrait && isMobileDevice);
    };

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia('(orientation: portrait)');
      mql.addEventListener?.('change', checkOrientation);
    } catch {
      // Fallback untuk browser lama
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (mql) mql.removeEventListener?.('change', checkOrientation);
    };
  }, []);

  const handleRequestFullscreenLandscape = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      // Coba kunci orientasi landscape jika didukung oleh browser seluler
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {
      // Abaikan jika browser membatasi lock otomatis
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (!isPortraitMobile || isDismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#070a10]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none animate-in fade-in duration-300">
      {/* Container Kartu Kaligrafi Wuxia */}
      <div className="relative max-w-sm w-full bg-gradient-to-b from-[#181f2c] via-[#0f141e] to-[#090d14] border border-amber-600/70 rounded-2xl p-6 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(197,168,128,0.08)] flex flex-col items-center">
        
        {/* Tombol Tutup / Lewati di pojok */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 text-gray-500 hover:text-amber-300 p-1 rounded-full hover:bg-black/40 transition-colors"
          title="Lewati Peringatan"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ornamen Sudut Khas Jianghu */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-amber-500/60" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-amber-500/60" />
        <div className="absolute bottom-2 left-2 w-3 h-2 border-b-2 border-l-2 border-amber-500/60" />
        <div className="absolute bottom-2 right-2 w-3 h-2 border-b-2 border-r-2 border-amber-500/60" />

        {/* Animasi Rotasi Ponsel Wuxia */}
        <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
          {/* Efek Aura Memutar */}
          <div className="absolute inset-0 rounded-full bg-amber-500/10 border border-amber-500/30 animate-[spin_8s_linear_infinite]" />
          
          {/* Ikon Ponsel yang Berotasi 90 Derajat */}
          <div className="relative z-10 animate-[pulse_2.5s_ease-in-out_infinite]">
            <div className="transition-transform duration-1000 transform -rotate-90 text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <Smartphone className="w-12 h-12" strokeWidth={1.5} />
            </div>
          </div>

          {/* Panah Indikator Rotasi */}
          <div className="absolute -top-1 -right-1 text-amber-400 animate-spin" style={{ animationDuration: '4s' }}>
            <RotateCw className="w-5 h-5 opacity-80" />
          </div>
        </div>

        {/* Judul & Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/50 text-[11px] font-bold text-amber-300 font-serif uppercase tracking-widest mb-2 shadow-inner">
          <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
          <span>Mode Lanskap Direkomendasikan</span>
        </div>

        <h2 className="text-lg sm:text-xl font-serif font-bold text-amber-200 tracking-wide mb-2.5">
          Putar Layar ke Posisi Mendatar
        </h2>

        <p className="text-xs text-gray-300 leading-relaxed font-sans mb-6 max-w-xs">
          Dunia Benua Jianghu dirancang untuk dinikmati dalam orientasi <strong className="text-amber-300">Landscape (Miring)</strong> agar petak penjelajahan luas, kontrol mulus, dan antarmuka tidak tumpang tindih.
        </p>

        {/* Aksi Interaktif */}
        <div className="w-full space-y-2.5">
          <button
            onClick={handleRequestFullscreenLandscape}
            className="w-full bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 hover:from-amber-600 hover:to-yellow-500 text-white font-serif font-bold text-xs py-2.5 px-4 rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2 border border-amber-400/60 active:scale-98 transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Kunci Layar Penuh (Landscape)</span>
          </button>

          <button
            onClick={handleDismiss}
            className="w-full py-1.5 text-[11px] text-gray-400 hover:text-amber-300 transition-colors font-medium underline underline-offset-4"
          >
            Tetap Lanjut di Mode Tegak (Portrait)
          </button>
        </div>

        <div className="mt-4 text-[10px] text-gray-500 italic">
          *Layar akan otomatis terbuka begitu Anda memutar posisi ponsel.
        </div>
      </div>
    </div>
  );
}
