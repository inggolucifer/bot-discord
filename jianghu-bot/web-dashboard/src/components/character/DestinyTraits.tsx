'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface DestinyTraitsProps {
  nature?: string[];
  nurture?: string[];
  compact?: boolean;
}

export default function DestinyTraits({
  nature = ['Dual Talents'],
  nurture = ['Taoist Mind Essence'],
  compact = false
}: DestinyTraitsProps) {
  const getNatureStyle = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('spirit') || lower.includes('divine') || lower.includes('immortal')) {
      return 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 text-black border-amber-300 font-bold shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    }
    if (lower.includes('evil') || lower.includes('tortured') || lower.includes('blood') || lower.includes('soul')) {
      return 'bg-red-950/80 text-red-200 border-red-700/60 shadow-[0_0_6px_rgba(239,68,68,0.3)]';
    }
    if (lower.includes('dual') || lower.includes('talent') || lower.includes('qi')) {
      return 'bg-indigo-950/80 text-indigo-200 border-indigo-700/60 shadow-[0_0_6px_rgba(99,102,241,0.3)]';
    }
    if (lower.includes('intelligent') || lower.includes('genius') || lower.includes('wisdom')) {
      return 'bg-amber-950/80 text-amber-200 border-amber-700/60';
    }
    return 'bg-[#1b1f2b] text-stone-300 border-[#383d4e]';
  };

  const getNurtureStyle = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('essence') || lower.includes('mind') || lower.includes('taoist')) {
      return 'bg-blue-950/80 text-blue-200 border-blue-700/60 shadow-[0_0_6px_rgba(59,130,246,0.3)]';
    }
    if (lower.includes('reaver') || lower.includes('soul') || lower.includes('demon')) {
      return 'bg-rose-950/80 text-rose-200 border-rose-700/60';
    }
    if (lower.includes('branch') || lower.includes('steadfast') || lower.includes('dream')) {
      return 'bg-orange-950/80 text-orange-200 border-orange-700/60';
    }
    return 'bg-teal-950/80 text-teal-200 border-teal-700/60';
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 w-full font-serif ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Destiny Nature */}
      <div className="flex flex-col items-center">
        <div className="px-3 py-0.5 mb-2 rounded-md bg-gradient-to-r from-amber-700/50 via-amber-500/40 to-amber-700/50 border border-amber-500/60 text-amber-200 text-xs font-semibold tracking-wider uppercase shadow-sm flex items-center gap-1">
          <Sparkles size={11} className="text-amber-400" />
          Destiny (Nature)
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 w-full">
          {nature.length > 0 ? (
            nature.map((t, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded text-center border font-serif tracking-wide transition-all hover:scale-105 ${
                  compact ? 'text-[10px]' : 'text-xs'
                } ${getNatureStyle(t)}`}
              >
                {t}
              </span>
            ))
          ) : (
            <span className="text-stone-500 text-xs italic">Tanpa Takdir Khusus</span>
          )}
        </div>
      </div>

      {/* Destiny Nurture */}
      <div className="flex flex-col items-center">
        <div className="px-3 py-0.5 mb-2 rounded-md bg-gradient-to-r from-yellow-700/50 via-amber-600/40 to-yellow-700/50 border border-yellow-500/60 text-yellow-200 text-xs font-semibold tracking-wider uppercase shadow-sm flex items-center gap-1">
          <Sparkles size={11} className="text-yellow-400" />
          Destiny (Nurture)
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 w-full">
          {nurture.length > 0 ? (
            nurture.map((t, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded text-center border font-serif tracking-wide transition-all hover:scale-105 ${
                  compact ? 'text-[10px]' : 'text-xs'
                } ${getNurtureStyle(t)}`}
              >
                {t}
              </span>
            ))
          ) : (
            <span className="text-stone-500 text-xs italic">Tanpa Takdir Latihan</span>
          )}
        </div>
      </div>
    </div>
  );
}
