'use client';

import { Suspense, useState, useEffect } from 'react';
import { WorldPageContent } from '@/app/world/page';
import DashboardModal from '@/components/modals/DashboardModal';
import PlayerStatsModal from '@/components/modals/PlayerStatsModal';
import NpcInteractionModal from '@/components/modals/NpcInteractionModal';
import AchievementsModal from '@/components/modals/AchievementsModal';
import SettingsModal from '@/components/modals/SettingsModal';
import LandingMenu from '@/components/menu/LandingMenu';
import AuthPortalModal from '@/components/auth/AuthPortalModal';
import CharacterCreationStudio from '@/components/auth/CharacterCreationStudio';
import { useAuthStore, useUIStore } from '@/lib/store';
import { Compass, User, Sparkles } from 'lucide-react';

export default function RootApp() {
  const { token, user, appearanceCompleted, initialize } = useAuthStore();
  const { setActiveModal, activeModal, isTileInspectorActive, showMobileMapNav, setIsLandingMenu } = useUIStore();

  const [mounted, setMounted] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    setIsLandingMenu(showLanding);
  }, [showLanding, setIsLandingMenu]);

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  // Loading Screen saat hydrasi awal
  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[100] w-screen h-screen bg-[#070a12] flex flex-col items-center justify-center font-serif text-amber-200 select-none">
        <div className="relative w-16 h-16 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
          <Sparkles size={20} className="text-amber-400 animate-pulse" />
        </div>
        <div className="text-sm font-semibold tracking-widest uppercase text-amber-300">
          Membuka Gerbang Semesta Jianghu...
        </div>
        <div className="text-[11px] text-stone-500 mt-1 font-sans">
          Menyelaraskan Sesi & Kitab Keabadian
        </div>
      </div>
    );
  }

  // =========================================================================
  // GATE 1: JIKA PEMAIN BELUM / TIDAK LOGIN (UNAUTHENTICATED GATEKEEPER)
  // Website hanya menampilkan menu khusus login dengan info bagus & lengkap!
  // =========================================================================
  if (!token || !user) {
    return (
      <div className="fixed inset-0 z-[60] w-screen h-screen overflow-hidden">
        <AuthPortalModal />
      </div>
    );
  }

  // =========================================================================
  // GATE 2: JIKA SUDAH DAFTAR / LOGIN TAPI BELUM MEMILIH PENAMPILAN KARAKTER
  // Dialihkan langsung ke Studio Penampilan Karakter Multi-Layer (Paper-Doll)!
  // =========================================================================
  if (!appearanceCompleted) {
    return (
      <div className="fixed inset-0 z-[60] w-screen h-screen overflow-hidden">
        <CharacterCreationStudio onComplete={() => setShowLanding(true)} />
      </div>
    );
  }

  // =========================================================================
  // GATE 3: JIKA SUDAH LENGKAP TAMPILKAN MENU LANDING WUXIA (IMMORTAL X)
  // =========================================================================
  if (showLanding) {
    return (
      <div className="fixed inset-0 z-[60] w-screen h-screen overflow-hidden">
        <LandingMenu onEnterWorld={() => { setShowLanding(false); setIsLandingMenu(false); }} />
        <AchievementsModal />
        <SettingsModal />
      </div>
    );
  }

  // =========================================================================
  // MAIN GAME WORLD & DASHBOARD (AUTHENTICATED & ONBOARDED)
  // =========================================================================
  return (
    <div className="relative w-full flex-1 min-h-0 h-full overflow-hidden flex flex-col">
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0 flex flex-col">
        <Suspense fallback={<div className="p-8 text-center text-amber-200">Menghubungkan ke Benua Jianghu...</div>}>
          <WorldPageContent />
        </Suspense>
      </div>

      {/* Persistent UI Overlays (Floating Buttons) */}
      <div className={`fixed right-3 sm:right-4 z-30 flex flex-col gap-2 transition-all duration-300 ${showMobileMapNav ? 'bottom-20' : 'bottom-3'}`}>
        {!isTileInspectorActive && !activeModal && (
          <>
            {/* Player Stats Sheet */}
            <button
              onClick={() => setActiveModal('stats')}
              className="bg-[#121722]/90 hover:bg-amber-900/90 text-amber-300 p-2 sm:p-2.5 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:scale-105 active:scale-95 transition-all border border-amber-500/70 backdrop-blur-md flex items-center justify-center cursor-pointer"
              title="Lembar Status Pendekar (Stats Sheet)"
            >
              <User size={18} className="text-amber-300" />
            </button>

            {/* Dashboard / Manajemen */}
            <button
              onClick={() => setActiveModal('dashboard')}
              className="bg-[#121722]/90 hover:bg-amber-900/90 text-amber-300 p-2 sm:p-2.5 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:scale-105 active:scale-95 transition-all border border-amber-600/60 backdrop-blur-md flex items-center justify-center cursor-pointer"
              title="Tas Qiankun & Inventori"
            >
              <Compass size={18} className="animate-spin-slow" />
            </button>
          </>
        )}
      </div>

      {/* Floating Modals */}
      <DashboardModal />
      <PlayerStatsModal />
      <NpcInteractionModal />
      <AchievementsModal />
      <SettingsModal />
    </div>
  );
}
