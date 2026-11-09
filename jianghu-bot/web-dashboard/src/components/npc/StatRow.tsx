import React from 'react';

export interface StatRowProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}

/**
 * Standardized Attribute Row (V28)
 * Two-column baseline layout preventing overlap at all viewports.
 */
export function StatRow({ label, value, className = '' }: StatRowProps) {
  const displayVal =
    value !== null && value !== undefined && value !== '' ? String(value) : '---';

  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-baseline text-[12.5px] leading-tight py-[2px] ${className}`}
    >
      <span className="min-w-0 truncate text-[color:var(--npc-mute,#9a9686)]">
        {label}
      </span>
      <span className="tabular-nums text-right text-[color:var(--npc-cream,#e8e2d0)] font-medium">
        {displayVal}
      </span>
    </div>
  );
}
