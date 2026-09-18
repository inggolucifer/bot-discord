'use client';

import React from 'react';
import { useUIStore } from '@/lib/store';
import { X, Award, CheckCircle, Lock, Trophy } from 'lucide-react';

export default function AchievementsModal() {
  const { activeModal, closeModal } = useUIStore();
  if (activeModal !== 'achievements') return null;

  const achievements = [
    { id: 1, title: 'Langkah Pertama di Jianghu', desc: 'Melangkahkan kaki di petak dunia terbuka Tale of Immortal.', completed: true, exp: 50 },
    { id: 2, title: 'Pembasmi Monster Pertama', desc: 'Mengalahkan seekor siluman buas dalam pertarungan Turn-Based.', completed: true, exp: 100 },
    { id: 3, title: 'Pencerahan Dantian', desc: 'Mengikat satu Hukum Alam Utama (Law) pada tubuh fana.', completed: true, exp: 200 },
    { id: 4, title: 'Murid Sah Sekte Agung', desc: 'Lolos dari seleksi 3 babak ujian masuk sekte.', completed: false, exp: 350 },
    { id: 5, title: 'Penjelajah Labirin Gua Kuno', desc: 'Menemukan peti harta karun di kedalaman dungeon 20x20.', completed: false, exp: 500 },
    { id: 6, title: 'Kultivator Ranah Inti Emas', desc: 'Mencapai ranah Golden Core (IV) dan melampaui kematian fana.', completed: false, exp: 1000 },
  ];

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

        <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-3 pr-1">
          {achievements.map((ach) => (
            <div 
              key={ach.id}
              className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                ach.completed 
                  ? 'bg-[#181d28] border-amber-500/50 shadow-sm' 
                  : 'bg-[#121620] border-[#252c3d] opacity-75'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full border ${
                  ach.completed ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-stone-900 border-stone-700 text-stone-500'
                }`}>
                  {ach.completed ? <CheckCircle size={18} /> : <Lock size={18} />}
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${ach.completed ? 'text-amber-200' : 'text-stone-400'}`}>
                    {ach.title}
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">{ach.desc}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-sans text-amber-400 font-semibold">+{ach.exp} EXP</span>
              </div>
            </div>
          ))}
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
