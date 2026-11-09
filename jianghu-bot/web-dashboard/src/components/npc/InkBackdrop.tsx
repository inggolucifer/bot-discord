import React from 'react';

export interface InkBackdropProps {
  className?: string;
}

/**
 * Ink Landscape Backdrop (V29)
 * Renders procedural 3-layer ink mountain SVG with flat colors (no gradient, no blur).
 */
export function InkBackdrop({ className = '' }: InkBackdropProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none bg-[#070a14] ${className}`}>
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMax slice"
        className="w-full h-full"
        aria-hidden="true"
      >
        {/* Sky Background (Bidang warna datar tanpa gradient) */}
        <rect width="1600" height="900" fill="#0b0f17" />

        {/* Far Mountains (Lapis 1 - 38% tinggi puncak, warna datar tanpa filter blur) */}
        <polygon
          points="0,900 0,550 200,420 450,560 700,340 950,520 1200,380 1400,480 1600,400 1600,900"
          fill="var(--npc-wash-1, #7c9391)"
          opacity="0.55"
        />

        {/* Mist Ribbon 1 */}
        <rect
          x="0"
          y="480"
          width="1600"
          height="120"
          fill="rgba(255, 255, 255, 0.16)"
        />

        {/* Mid Mountains (Lapis 2 - 50% tinggi puncak) */}
        <polygon
          points="0,900 0,620 180,500 380,640 620,450 850,600 1100,460 1350,580 1600,480 1600,900"
          fill="var(--npc-wash-2, #6a8482)"
          opacity="0.75"
        />

        {/* Mist Ribbon 2 */}
        <rect
          x="0"
          y="600"
          width="1600"
          height="100"
          fill="rgba(255, 255, 255, 0.16)"
        />

        {/* Near Mountains (Lapis 3 - 62% tinggi puncak) */}
        <polygon
          points="0,900 0,680 250,580 500,720 780,540 1050,680 1320,560 1600,660 1600,900"
          fill="var(--npc-wash-3, #587371)"
          opacity="0.92"
        />

        {/* Low Valley Mist */}
        <rect
          x="0"
          y="740"
          width="1600"
          height="160"
          fill="rgba(10, 14, 16, 0.45)"
        />
      </svg>
    </div>
  );
}
