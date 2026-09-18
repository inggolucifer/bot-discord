'use client';

import React from 'react';
import { useUIStore } from '@/lib/store';
import { X, Trophy } from 'lucide-react';

export default function AchievementsModal() {
  const { activeModal, closeModal } = useUIStore();
  if (activeModal !== 'achievements') return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
      onClick={closeModal}
    >
      <div 
        className="w-full max-w-2xl bg-[#0f131d] border-2 border-[#826b48] rounded-xl shadow-2xl p-4 sm:p-6 text-[#e3d7bf] font-serif flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#3b3223]">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-lg">
            <Trophy size={20} className="text-amber-400" />
            Pencapaian Kultivator (Achievements)
          </div>
          <button 
            onClick={closeModal}
            className="p-1 rounded-full bg-[#201811] hover:bg-rose-900 border border-[#523f27] text-amber-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Empty State - Disimpan untuk diisi nanti */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-6 bg-[#121622]/60 border border-[#2b3348] rounded-xl">
          <div className="w-16 h-16 rounded-full bg-amber-950/60 border border-amber-600/50 flex items-center justify-center text-3xl mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            📜
          </div>
          <h4 className="text-lg font-bold text-amber-200 font-serif">Pencapaian Masih Kosong</h4>
          <p className="text-xs sm:text-sm text-stone-400 max-w-sm mt-1 leading-relaxed">
            Daftar prestasi dan rekor keabadian belum dibuka. Fitur ini akan kita isi dan kembangkan pada pembaruan mendatang!
          </p>
          <div className="mt-4 px-3.5 py-1 rounded-full bg-[#1b212f] border border-[#3f4a62] text-[11px] text-stone-400 font-mono">
            Status: Kosong (Akan Diisi Nanti)
          </div>
        </div>

        <div className="pt-2 border-t border-[#3b3223] text-right">
          <button 
            onClick={closeModal}
            className="px-4 py-1.5 rounded bg-[#2b2216] hover:bg-amber-900/60 border border-amber-700 text-amber-200 text-xs font-semibold"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}
