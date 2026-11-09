import React from 'react';

export interface StatRowProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}

/**
 * Standardized Attribute Row (V29)
 * Two-column baseline layout preventing overlap and truncation at all viewports.
 * Label min 40% width, normal white-space, no ellipsis. Value right-aligned.
 */
export function StatRow({ label, value, className = '' }: StatRowProps) {
  const displayVal =
    value !== null && value !== undefined && value !== '' ? String(value) : '---';

  return (
    <div
      className={`grid grid-cols-[minmax(40%,1fr)_auto] gap-x-3 items-baseline text-[12.5px] leading-tight py-[2px] ${className}`}
    >
      <span
        className="text-[color:var(--npc-mute,#9a9686)]"
        style={{ whiteSpace: 'normal', minWidth: '40%' }}
      >
        {label}
      </span>
      <span className="tabular-nums text-right text-[color:var(--npc-cream,#e8e2d0)] font-medium">
        {displayVal}
      </span>
    </div>
  );
}
