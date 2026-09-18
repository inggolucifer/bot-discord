'use client';

import React from 'react';

interface AlignmentBarProps {
  righteous?: number;
  demonic?: number;
  compact?: boolean;
}

export default function AlignmentBar({ righteous = 0, demonic = 0, compact = false }: AlignmentBarProps) {
  const total = Math.max(1, (righteous || 0) + (demonic || 0));
  const righteousPct = Math.round(((righteous || 0) / total) * 100);
  const demonicPct = 100 - righteousPct;

  return (
    <div className={`w-full ${compact ? 'text-xs' : 'text-sm'} font-serif`}>
      <div className="flex justify-between items-center text-xs font-semibold mb-1">
        <span className="text-amber-300 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-[0_0_6px_#f59e0b]" />
          Lurus (Righteous) {righteous}
        </span>
        <span className="text-rose-400 flex items-center gap-1">
          Iblis (Demonic) {demonic}
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-[0_0_6px_#f43f5e]" />
        </span>
      </div>

      <div className="h-2.5 w-full bg-[#12161f] border border-[#3b3425] rounded-full overflow-hidden flex shadow-inner">
        <div 
          style={{ width: `${righteousPct}%` }}
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
          title={`Righteous: ${righteous} (${righteousPct}%)`}
        />
        <div 
          style={{ width: `${demonicPct}%` }}
          className="h-full bg-gradient-to-r from-rose-700 via-red-600 to-rose-400 transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
          title={`Demonic: ${demonic} (${demonicPct}%)`}
        />
      </div>
    </div>
  );
}
