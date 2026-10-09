'use client';

import React, { useEffect, useState } from 'react';

interface RegionCalligraphyBannerProps {
  regionName: string;
  chineseName?: string;
  dangerTier?: number;
  description?: string;
  durationMs?: number;
  onDismiss?: () => void;
}

export default function RegionCalligraphyBanner({
  regionName,
  chineseName,
  dangerTier = 1,
  description,
  durationMs = 3800,
  onDismiss
}: RegionCalligraphyBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [regionName, durationMs, onDismiss]);

  if (!isVisible) return null;

  // Tier color styling
  let tierColor = 'text-emerald-400 border-emerald-500/50 bg-emerald-950/60';
  let tierLabel = 'Aman (Tier 1)';
  if (dangerTier === 2) {
    tierColor = 'text-cyan-400 border-cyan-500/50 bg-cyan-950/60';
    tierLabel = 'Petualang (Tier 2)';
  } else if (dangerTier === 3) {
    tierColor = 'text-amber-400 border-amber-500/50 bg-amber-950/60';
    tierLabel = 'Waspada (Tier 3)';
  } else if (dangerTier === 4) {
    tierColor = 'text-rose-400 border-rose-500/50 bg-rose-950/60';
    tierLabel = 'Berbahaya (Tier 4)';
  } else if (dangerTier >= 5) {
    tierColor = 'text-purple-400 border-purple-500/50 bg-purple-950/60';
    tierLabel = 'Maut / Terlarang (Tier 5)';
  }

  return (
    <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
      {/* Banner Plaque Container with Ink Blur */}
      <div className="relative flex flex-col items-center px-12 py-3 bg-gradient-to-r from-transparent via-stone-950/90 to-transparent border-y border-amber-500/40 shadow-2xl backdrop-blur-sm">
        {/* Top Decorative Imperial Cord */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Chinese Calligraphy Title */}
        {chineseName && (
          <div className="text-2xl sm:text-3xl font-serif text-amber-200 tracking-[0.35em] font-bold drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
            {chineseName}
          </div>
        )}

        {/* Indonesian Canonical Region Name */}
        <div className="text-xs sm:text-sm font-serif font-bold text-gray-200 tracking-[0.2em] uppercase mt-0.5 flex items-center gap-2">
          <span className="text-amber-500">❖</span>
          <span>{regionName}</span>
          <span className="text-amber-500">❖</span>
        </div>

        {/* Danger Tier Badge */}
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm ${tierColor}`}>
            {tierLabel}
          </span>
          {description && (
            <span className="text-[10px] text-gray-400 font-serif italic max-w-xs truncate hidden sm:inline">
              — {description}
            </span>
          )}
        </div>

        {/* Bottom Decorative Imperial Cord */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      </div>
    </div>
  );
}
