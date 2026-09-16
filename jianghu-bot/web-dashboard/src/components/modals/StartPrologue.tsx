'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import api from '@/lib/api';

interface PrologueDialog {
  speaker: string;
  text: string;
  expression?: 'normal' | 'happy' | 'angry' | 'surprised';
}

const dialogs: PrologueDialog[] = [
  { speaker: 'Tetua Desa', text: 'Ah, kamu akhirnya bangun... Sudah tiga hari tiga malam kamu tertidur sejak diangkat dari sungai itu.', expression: 'normal' },
  { speaker: 'Tetua Desa', text: 'Aura Qi di tubuhmu sangat kacau. Sepertinya kamu baru saja mengalami pertarungan yang dahsyat, tapi syukurlah nyawamu tertolong.', expression: 'normal' },
  { speaker: 'Tetua Desa', text: 'Dunia Jianghu sedang tidak aman. Banyak sekte-sekte hitam yang kembali bermunculan. Kamu harus segera memulihkan kekuatanmu.', expression: 'surprised' },
  { speaker: 'Tetua Desa', text: 'Ambilah pedang kayu ini dan mulailah melatih pernapasanmu. Perjalananmu di dunia persilatan baru saja dimulai!', expression: 'happy' },
];

export default function StartPrologue({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let index = 0;
    const currentDialog = dialogs[currentStep].text;
    setIsTyping(true);
    setDisplayedText('');

    const typingInterval = setInterval(() => {
      setDisplayedText((prev) => prev + currentDialog.charAt(index));
      index++;
      if (index === currentDialog.length) {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, 40); // Kecepatan ketik (ms per karakter)

    return () => clearInterval(typingInterval);
  }, [currentStep]);

  const handleNext = async () => {
    if (isTyping) {
      // Jika sedang ngetik, langsung tampilkan semua teks
      setDisplayedText(dialogs[currentStep].text);
      setIsTyping(false);
      return;
    }

    if (currentStep < dialogs.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Selesai prologue
      setLoading(true);
      try {
        await api.post('/player/finish-prologue');
        onComplete();
      } catch (err) {
        console.error('Gagal menyelesaikan prologue:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black select-none font-sans">
      {/* Background Visual Novel (blur) */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity transition-all duration-1000"
        style={{ backgroundImage: 'url(https://i.imgur.com/8QGjV1H.png)' }} // Placeholder Desa Xingcun background
      />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Character Sprite (Kiri) */}
      <div className="absolute bottom-32 left-0 sm:left-24 animate-in fade-in slide-in-from-left duration-700">
        <div className="w-64 h-96 bg-contain bg-bottom bg-no-repeat opacity-80 hover:opacity-100 transition-opacity" style={{ backgroundImage: 'url(https://i.imgur.com/Y3UuJzX.png)' }}>
           {/* Placeholder untuk sprite Tetua Desa */}
        </div>
      </div>

      {/* Dialog Box (Bawah) */}
      <div className="absolute bottom-8 left-0 w-full px-4 sm:px-16 md:px-32">
        <div 
          onClick={handleNext}
          className="relative bg-[#0d131f]/90 border border-amber-900/50 rounded-xl p-6 shadow-2xl backdrop-blur-md cursor-pointer group transition-all"
        >
          {/* Speaker Name Tag */}
          <div className="absolute -top-4 left-6 bg-gradient-to-r from-amber-700 to-amber-900 text-white font-serif font-bold px-4 py-1 rounded shadow-lg border border-amber-500/50">
            {dialogs[currentStep].speaker}
          </div>

          {/* Dialog Text */}
          <div className="text-gray-200 mt-2 text-sm sm:text-lg min-h-[80px] leading-relaxed">
            {displayedText}
          </div>

          {/* Tap to continue indicator */}
          <div className={`absolute bottom-4 right-4 flex items-center gap-1 text-xs font-bold ${isTyping ? 'text-transparent' : 'text-amber-500 animate-pulse'}`}>
            <span className="hidden sm:inline">Tap untuk lanjut</span>
            <ChevronRight className="w-4 h-4" />
          </div>

          {loading && (
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
