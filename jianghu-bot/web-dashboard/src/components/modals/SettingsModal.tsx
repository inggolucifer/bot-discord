'use client';

import React, { useState } from 'react';
import { useUIStore } from '@/lib/store';
import { X, Settings, Volume2, Monitor, Bell, Shield } from 'lucide-react';

export default function SettingsModal() {
  const { activeModal, closeModal } = useUIStore();
  const [bgmVolume, setBgmVolume] = useState(80);
  const [sfxVolume, setSfxVolume] = useState(90);
  const [graphicsQuality, setGraphicsQuality] = useState('high');

  if (activeModal !== 'settings') return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
      onClick={closeModal}
    >
      <div 
        className="w-full max-w-xl bg-[#0f131d] border-2 border-[#826b48] rounded-xl shadow-2xl p-4 sm:p-6 text-[#e3d7bf] font-serif flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#3b3223]">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-lg">
            <Settings size={20} className="text-amber-400" />
            Pengaturan Game (Settings)
          </div>
          <button 
            onClick={closeModal}
            className="p-1 rounded-full bg-[#201811] hover:bg-rose-900 border border-[#523f27] text-amber-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-4 pr-1 text-xs">
          
          {/* Audio Section */}
          <div className="bg-[#141824] p-3.5 rounded-lg border border-[#2b354a] space-y-3">
            <h4 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
              <Volume2 size={16} className="text-amber-400" /> Audio & Musik Tradisional
            </h4>
            <div>
              <div className="flex justify-between text-stone-300 mb-1">
                <span>Musik Latar (BGM Guqin/Flute):</span>
                <span className="text-amber-400">{bgmVolume}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={bgmVolume} 
                onChange={(e) => setBgmVolume(Number(e.target.value))}
                className="w-full accent-amber-500 bg-stone-800"
              />
            </div>
            <div>
              <div className="flex justify-between text-stone-300 mb-1">
                <span>Efek Suara Tempur & Langkah (SFX):</span>
                <span className="text-amber-400">{sfxVolume}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={sfxVolume} 
                onChange={(e) => setSfxVolume(Number(e.target.value))}
                className="w-full accent-amber-500 bg-stone-800"
              />
            </div>
          </div>

          {/* Graphics Section */}
          <div className="bg-[#141824] p-3.5 rounded-lg border border-[#2b354a] space-y-3">
            <h4 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
              <Monitor size={16} className="text-amber-400" /> Kualitas Visual & Partikel
            </h4>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((q) => (
                <button
                  key={q}
                  onClick={() => setGraphicsQuality(q)}
                  className={`flex-1 py-1.5 rounded uppercase font-semibold text-xs border transition-all ${
                    graphicsQuality === q 
                      ? 'bg-amber-900/80 border-amber-500 text-amber-200' 
                      : 'bg-[#1b212f] border-[#364259] text-stone-400'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="pt-2 border-t border-[#3b3223] text-right">
          <button 
            onClick={closeModal}
            className="px-4 py-1.5 rounded bg-[#2b2216] hover:bg-amber-900/60 border border-amber-700 text-amber-200 text-xs font-semibold"
          >
            Simpan & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
