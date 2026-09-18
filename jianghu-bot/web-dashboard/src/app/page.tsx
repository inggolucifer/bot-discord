'use client';

import { Suspense, useState } from 'react';
import { WorldPageContent } from '@/app/world/page';
import DashboardModal from '@/components/modals/DashboardModal';
import PlayerStatsModal from '@/components/modals/PlayerStatsModal';
import NpcInteractionModal from '@/components/modals/NpcInteractionModal';
import AchievementsModal from '@/components/modals/AchievementsModal';
import SettingsModal from '@/components/modals/SettingsModal';
import LandingMenu from '@/components/menu/LandingMenu';
import { useUIStore } from '@/lib/store';
import { Compass, User, Trophy } from 'lucide-react';

export default function RootApp() {
  const { setActiveModal, activeModal, isTileInspectorActive } = useUIStore();
  const [showLanding, setShowLanding] = useState(true);

  if (showLanding) {
    return (
      <div className="fixed inset-0 z-[60] w-screen h-screen overflow-hidden">
        <LandingMenu onEnterWorld={() => setShowLanding(false)} />
        {/* Modals accessible from landing menu (Achievements, Settings) */}
        <AchievementsModal />
        <SettingsModal />
      </div>
    );
  }

  return (
    <div className="relative w-full flex-1 min-h-0 h-full overflow-hidden flex flex-col">
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0 flex flex-col">
         <Suspense fallback={<div className="p-8 text-center text-amber-200">Menghubungkan ke Benua Jianghu...</div>}>
           <WorldPageContent />
         </Suspense>
      </div>

      {/* Persistent UI Overlays (Floating Buttons) - Vertically stacked above GlobalChat */}
      <div className="fixed bottom-20 right-4 z-30 flex flex-col gap-2.5">
         {!isTileInspectorActive && !activeModal && (
           <>
             {/* Player Stats Sheet (Image 3) */}
             <button 
               onClick={() => setActiveModal('stats')}
               className="bg-[#121722]/90 hover:bg-amber-900/90 text-amber-300 p-2.5 sm:p-3 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:scale-105 transition-all border border-amber-500/70 backdrop-blur-md flex items-center justify-center"
               title="Lembar Status Pendekar (Stats Sheet)"
             >
               <User size={20} className="text-amber-300" />
             </button>

             {/* Dashboard / Manajemen */}
             <button 
               onClick={() => setActiveModal('dashboard')}
               className="bg-[#121722]/90 hover:bg-amber-900/90 text-amber-300 p-2.5 sm:p-3 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:scale-105 transition-all border border-amber-600/60 backdrop-blur-md flex items-center justify-center"
               title="Tas Qiankun & Inventori"
             >
               <Compass size={20} className="animate-spin-slow" />
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
