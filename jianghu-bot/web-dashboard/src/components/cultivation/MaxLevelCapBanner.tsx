"use client";

import React from 'react';
import { Award, Sparkles, ArrowRight, ShieldCheck, Flame } from 'lucide-react';

interface MaxLevelCapBannerProps {
  currentLevel: number;
  currentLevelCap: number;
  realmName: string;
  canBreakthrough?: boolean;
  onNavigateBreakthrough?: () => void;
}

export default function MaxLevelCapBanner({
  currentLevel,
  currentLevelCap,
  realmName,
  canBreakthrough,
  onNavigateBreakthrough
}: MaxLevelCapBannerProps) {
  // Only display if character reached the realm level cap
  if (currentLevel < currentLevelCap) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-950/90 via-stone-950 to-amber-950/90 p-4 sm:p-5 shadow-[0_0_25px_rgba(245,158,11,0.25)] text-stone-200">
      {/* Background ambient particle aura */}
      <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 border border-yellow-200/60 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30">
              👑
            </div>
            <div className="absolute -bottom-1 -right-1 bg-black/90 text-amber-300 font-mono text-[9px] font-bold px-1 rounded border border-amber-500/50">
              MAX
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif font-bold text-amber-200 text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                PUNCAK WADAH FISIK TERCAPAI (MAX LEVEL {currentLevelCap})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {realmName}
              </span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed font-sans max-w-2xl">
              Tubuh jasmani dan meridianmu telah matang sempurna di ranah ini. Akumulasi EXP sementara terkunci pada 
              <strong className="text-amber-300 font-mono"> Lv. {currentLevel}</strong>. Siapkan dantian dan penuhi syarat 
              terobosan untuk membuka kapasitas level berikutnya!
            </p>
          </div>
        </div>

        {onNavigateBreakthrough && (
          <button
            onClick={onNavigateBreakthrough}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-serif font-bold text-xs transition-all shadow-md ${
              canBreakthrough
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 border border-yellow-200/80 shadow-amber-500/30 animate-pulse'
                : 'bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-amber-500/40'
            }`}
          >
            <span>{canBreakthrough ? '⚡ Terobos Ranah Sekarang' : '📜 Lihat Syarat Terobosan'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
