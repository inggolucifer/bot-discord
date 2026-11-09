import React from 'react';

export interface SilhouetteProps {
  gender?: 'male' | 'female' | string;
  className?: string;
}

/**
 * Wuxia Robed Standing Silhouette (V28)
 * Clean dark ink silhouette with subtle bottom gradient fade.
 */
export function Silhouette({ gender = 'male', className = '' }: SilhouetteProps) {
  const isFemale = gender === 'female';

  return (
    <div
      className={`relative flex items-end justify-center select-none pointer-events-none ${className}`}
      style={{
        maskImage: 'linear-gradient(to top, transparent 0%, black 22%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 22%, black 100%)'
      }}
    >
      <svg
        viewBox="0 0 320 600"
        fill="#1d1f22"
        opacity="0.88"
        className="w-full h-full max-h-[74vh]"
        aria-hidden="true"
      >
        {isFemale ? (
          // Female wuxia robes with hair buns and flowing sleeves
          <g>
            {/* Hair Bun / Headdress */}
            <circle cx="160" cy="70" r="22" />
            <ellipse cx="160" cy="52" rx="14" ry="10" />
            <line x1="145" y1="50" x2="185" y2="45" stroke="#1d1f22" strokeWidth="4" />
            {/* Face / Head */}
            <circle cx="160" cy="98" r="18" />
            {/* Neck & Shoulders */}
            <path d="M152,116 L140,140 L180,140 L168,116 Z" />
            {/* Flowing Upper Robe */}
            <path d="M140,140 Q110,170 80,260 Q115,265 135,210 L145,260 L175,260 L185,210 Q205,265 240,260 Q210,170 180,140 Z" />
            {/* Waist Sash */}
            <rect x="135" y="245" width="50" height="20" rx="2" />
            {/* Long Skirt Robe */}
            <path d="M135,265 L90,580 L230,580 L185,265 Z" />
          </g>
        ) : (
          // Male wuxia martial robes with shoulder cape and sword contour
          <g>
            {/* Topknot / Crown */}
            <circle cx="160" cy="65" r="24" />
            <rect x="152" y="44" width="16" height="12" rx="2" />
            {/* Head */}
            <circle cx="160" cy="95" r="20" />
            {/* Neck */}
            <rect x="154" y="112" width="12" height="18" />
            {/* Broad Shoulders & Upper Body */}
            <path d="M120,130 L60,220 L95,240 L130,190 L135,270 L185,270 L190,190 L225,240 L260,220 L200,130 Z" />
            {/* Belt */}
            <rect x="130" y="265" width="60" height="22" rx="2" />
            {/* Lower Robes */}
            <path d="M130,287 L80,580 L240,580 L190,287 Z" />
            {/* Slanted Sword Sheath Silhouette */}
            <line x1="110" y1="230" x2="60" y2="480" stroke="#1d1f22" strokeWidth="8" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
}
