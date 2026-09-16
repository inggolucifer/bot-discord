'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface VirtualDPadProps {
  onDirection: (dx: number, dy: number) => void;
  disabled?: boolean;
}

export default function VirtualDPad({ onDirection, disabled = false }: VirtualDPadProps) {
  const [activeBtn, setActiveBtn] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Throttle interval for holding down the button
  const startMove = (dx: number, dy: number, dirStr: string) => {
    if (disabled) return;
    setActiveBtn(dirStr);
    onDirection(dx, dy); // Trigger once immediately

    // Then start repeating after a short delay
    intervalRef.current = setInterval(() => {
      onDirection(dx, dy);
    }, 300); // 300ms throttling to align with A* movement step time
  };

  const stopMove = () => {
    setActiveBtn(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const ButtonClass = (dir: string) => `
    w-12 h-12 bg-black/60 border border-amber-900/50 rounded-xl flex items-center justify-center
    backdrop-blur-sm transition-all text-amber-500 shadow-[0_0_15px_rgba(0,0,0,0.8)]
    active:scale-90 active:bg-amber-900/80 active:text-amber-100 touch-none select-none
    ${activeBtn === dir ? 'bg-amber-900/80 text-amber-100 scale-90' : 'hover:bg-black/80 hover:text-amber-400'}
    ${disabled ? 'opacity-50 pointer-events-none' : ''}
  `;

  return (
    <div className="fixed bottom-6 left-6 z-40 sm:hidden">
      <div className="grid grid-cols-3 gap-2 p-2 bg-black/30 rounded-full backdrop-blur-md border border-white/5">
        
        {/* Top row */}
        <div />
        <button 
          className={ButtonClass('up')}
          onPointerDown={() => startMove(0, -1, 'up')}
          onPointerUp={stopMove}
          onPointerLeave={stopMove}
          onContextMenu={(e) => e.preventDefault()}
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <div />

        {/* Middle row */}
        <button 
          className={ButtonClass('left')}
          onPointerDown={() => startMove(-1, 0, 'left')}
          onPointerUp={stopMove}
          onPointerLeave={stopMove}
          onContextMenu={(e) => e.preventDefault()}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="w-12 h-12 rounded-full bg-amber-900/20 border border-amber-900/40 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-amber-500/30" />
        </div>
        <button 
          className={ButtonClass('right')}
          onPointerDown={() => startMove(1, 0, 'right')}
          onPointerUp={stopMove}
          onPointerLeave={stopMove}
          onContextMenu={(e) => e.preventDefault()}
        >
          <ArrowRight className="w-6 h-6" />
        </button>

        {/* Bottom row */}
        <div />
        <button 
          className={ButtonClass('down')}
          onPointerDown={() => startMove(0, 1, 'down')}
          onPointerUp={stopMove}
          onPointerLeave={stopMove}
          onContextMenu={(e) => e.preventDefault()}
        >
          <ArrowDown className="w-6 h-6" />
        </button>
        <div />

      </div>
    </div>
  );
}
