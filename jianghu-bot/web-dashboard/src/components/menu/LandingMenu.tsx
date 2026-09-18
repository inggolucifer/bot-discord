'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore, useUIStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { 
  Compass, Award, Settings, LogOut, Volume2, VolumeX, 
  Sparkles, ExternalLink, ChevronRight
} from 'lucide-react';
import FallbackImage from '@/components/FallbackImage';
import { GLOBAL_ASSETS } from '@/config/globalAssets';

interface LandingMenuProps {
  onEnterWorld: () => void;
}

export default function LandingMenu({ onEnterWorld }: LandingMenuProps) {
  const { user, token, logout } = useAuthStore();
  const { setActiveModal } = useUIStore();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(true);

  // Background animated misty water particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes: water droplets, spiritual dust & cherry blossom petals
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.2) * 0.6,
      speedY: Math.random() * 0.8 + 0.2,
      opacity: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.4 ? 'rgba(210, 230, 255, ' : 'rgba(240, 215, 175, '
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleEnterWorld = () => {
    if (!token) {
      router.push('/auth');
      return;
    }
    onEnterWorld();
  };

  const handleAchievements = () => {
    setActiveModal('achievements');
  };

  const handleSettings = () => {
    setActiveModal('settings');
  };

  const handleQuit = async () => {
    if (confirm('Apakah kamu yakin ingin keluar dari alam Jianghu?')) {
      await logout();
      router.push('/auth');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#090d15] text-[#e8dfcf] font-serif">
      
      {/* Background Classical Chinese Watercolor Ink Wash Art */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
        style={{
          backgroundImage: `radial-gradient(ellipse at center, rgba(13,19,33,0.3) 0%, rgba(8,11,18,0.85) 100%), url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069&auto=format&fit=crop')`,
          filter: 'contrast(105%) brightness(95%)'
        }}
      />

      {/* Floating Misty Particle Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

      {/* Right Side Scenic Painting Vignette (Water Dragon & Pleasure Boat on tranquil lake) */}
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 pointer-events-none opacity-40 md:opacity-85 mix-blend-screen overflow-hidden flex items-center justify-center">
        <div className="relative w-full h-full max-w-4xl flex items-center justify-center">
          {/* Subtle glowing water aura */}
          <div className="absolute w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-950/20 via-transparent to-transparent" />
        </div>
      </div>

      {/* Foreground UI Layer */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between p-6 sm:p-10 md:p-14">
        
        {/* Top Header: Audio / User Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#141a27]/80 border border-[#3e3425] text-xs text-amber-200 backdrop-blur-md shadow-lg flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400 animate-spin-slow" />
              <span>Immortal X • Dunia Persilatan Jianghu</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="p-2 rounded-full bg-[#161d2d]/80 hover:bg-[#232f48] border border-[#443827] text-amber-300 transition-all backdrop-blur-md shadow-md"
              title={isAudioMuted ? 'Nyalakan Musik Tradisional' : 'Matikan Musik'}
            >
              {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            {user ? (
              <div className="px-3 py-1 rounded-full bg-[#161d2d]/80 border border-[#443827] text-xs text-stone-300 backdrop-blur-md">
                Kultivator: <span className="text-amber-300 font-semibold">{user.username}</span>
              </div>
            ) : (
              <button
                onClick={() => router.push('/auth')}
                className="px-3 py-1 rounded-full bg-amber-900/60 hover:bg-amber-800 border border-amber-500 text-xs text-amber-200 transition-all backdrop-blur-md"
              >
                Masuk Akun
              </button>
            )}
          </div>
        </div>

        {/* Center / Left: Calligraphy Logo & Main Action Menu */}
        <div className="my-auto max-w-xl flex flex-col items-start space-y-8">
          
          {/* Main Title / Logo in Ink Calligraphy Style */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="text-5xl sm:text-7xl font-bold tracking-widest text-[#f5ebd7] drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)] select-none font-serif">
                江湖八荒
              </div>
              <div className="w-9 h-9 rounded-md bg-red-900/80 border border-red-500 text-red-100 flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                仙
              </div>
            </div>
            <div className="text-2xl sm:text-4xl font-serif font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-500 uppercase pl-1 drop-shadow-[0_2px_15px_rgba(245,158,11,0.5)]">
              IMMORTAL X
            </div>
            <p className="text-xs sm:text-sm text-stone-300 pl-1 max-w-md leading-relaxed font-sans">
              Menembus kabut fana, meniti tangga keabadian, dan memahat takdir sejati di semesta sembilan benua.
            </p>
          </div>

          {/* Menu Button List (4 Plaque Buttons - Mod Removed as instructed) */}
          <div className="flex flex-col gap-3 w-64 sm:w-72">
            
            {/* 1. Enter World */}
            <button
              onClick={handleEnterWorld}
              className="relative group overflow-hidden px-5 py-3 rounded-lg bg-gradient-to-r from-[#2a241b] via-[#3a3224] to-[#2a241b] hover:from-[#54462e] hover:to-[#3d321f] border-2 border-[#876e47] hover:border-[#c5a880] text-[#f2e7d3] hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.7)] transition-all duration-300 text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl group-hover:rotate-12 transition-transform">🐉</span>
                <span className="font-serif font-bold text-base tracking-wider">
                  Enter World
                </span>
              </div>
              <ChevronRight size={18} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
              {/* Shimmer line */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>

            {/* 2. Achievements */}
            <button
              onClick={handleAchievements}
              className="relative group overflow-hidden px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#181d28] via-[#212736] to-[#181d28] hover:from-[#2a3348] hover:to-[#212736] border border-[#404c66] hover:border-amber-400/70 text-[#d8d3c5] hover:text-amber-200 shadow-md transition-all duration-300 text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg text-amber-300">📜</span>
                <span className="font-serif font-semibold text-sm tracking-wider">
                  Achievements
                </span>
              </div>
              <Award size={16} className="text-stone-400 group-hover:text-amber-300 transition-colors" />
            </button>

            {/* 3. Settings */}
            <button
              onClick={handleSettings}
              className="relative group overflow-hidden px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#181d28] via-[#212736] to-[#181d28] hover:from-[#2a3348] hover:to-[#212736] border border-[#404c66] hover:border-amber-400/70 text-[#d8d3c5] hover:text-amber-200 shadow-md transition-all duration-300 text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg text-stone-300">⚙️</span>
                <span className="font-serif font-semibold text-sm tracking-wider">
                  Settings
                </span>
              </div>
              <Settings size={16} className="text-stone-400 group-hover:text-amber-300 transition-colors" />
            </button>

            {/* 4. Quit */}
            <button
              onClick={handleQuit}
              className="relative group overflow-hidden px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#181d28] via-[#241c1c] to-[#181d28] hover:from-[#3d2020] hover:to-[#261717] border border-[#543b3b] hover:border-rose-500 text-stone-300 hover:text-rose-200 shadow-md transition-all duration-300 text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg text-rose-400">🚪</span>
                <span className="font-serif font-semibold text-sm tracking-wider">
                  Quit Game
                </span>
              </div>
              <LogOut size={16} className="text-rose-400 group-hover:translate-x-1 transition-transform" />
            </button>

          </div>

        </div>

        {/* Bottom Footer: Version & Legal Note */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 font-sans border-t border-[#2a241b] pt-3">
          <div>Jianghu Bot • Immortal X (v1.2.0)</div>
          <div className="mt-1 sm:mt-0 text-stone-400">
            Dunia Terbuka 5000x5000 • Tanpa Modul Eksternal
          </div>
        </div>

      </div>

    </div>
  );
}
