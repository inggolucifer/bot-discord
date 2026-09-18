'use client';

import React from 'react';

interface PersonalityBadgesProps {
  tags?: string[];
  internalTrait?: string | null;
  externalTrait?: string | null;
  compact?: boolean;
}

export default function PersonalityBadges({
  tags = [],
  internalTrait,
  externalTrait,
  compact = false
}: PersonalityBadgesProps) {
  const getBadgeStyle = (tag: string) => {
    const lower = tag.toLowerCase();
    if (lower.includes('evil') || lower.includes('demonic') || lower.includes('kejam')) {
      return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    }
    if (lower.includes('protective') || lower.includes('righteous') || lower.includes('pelindung')) {
      return 'bg-[#21293a] text-sky-200 border-[#3b4d6e]';
    }
    if (lower.includes('self-centered') || lower.includes('egoist') || lower.includes('dingin')) {
      return 'bg-[#23252d] text-slate-300 border-[#3f4350]';
    }
    if (lower.includes('carefree') || lower.includes('santai') || lower.includes('bebas')) {
      return 'bg-[#1b2f28] text-emerald-300 border-[#2f5344]';
    }
    return 'bg-[#1e2330] text-amber-200 border-[#473c2a]';
  };

  const allTags = [...tags];
  if (internalTrait && !allTags.includes(internalTrait)) {
    allTags.push(internalTrait);
  }
  if (externalTrait && !allTags.includes(externalTrait)) {
    allTags.push(externalTrait);
  }

  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {allTags.map((tag, idx) => (
        <span
          key={idx}
          className={`px-2.5 py-0.5 rounded-full font-serif border font-medium transition-all ${
            compact ? 'text-[10px]' : 'text-xs'
          } ${getBadgeStyle(tag)}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
