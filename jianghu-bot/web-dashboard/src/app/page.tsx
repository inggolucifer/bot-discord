'use client';

import { Suspense } from 'react';
import { WorldPageContent } from '@/app/world/page';
import DashboardModal from '@/components/modals/DashboardModal';
import { useUIStore } from '@/lib/store';
import { Compass } from 'lucide-react';

export default function RootApp() {
  const { setActiveModal, activeModal } = useUIStore();

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden">
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0">
         <Suspense fallback={<div className="p-8 text-center text-amber-200">Menghubungkan ke Benua Jianghu...</div>}>
           <WorldPageContent />
         </Suspense>
      </div>

      {/* Persistent UI Overlays (Floating Buttons) - Vertically stacked above GlobalChat */}
      <div className="fixed bottom-20 right-4 z-30 flex flex-col gap-3">
         {activeModal !== 'dashboard' && (
           <button 
             onClick={() => setActiveModal('dashboard')}
             className="bg-[#121722]/90 hover:bg-amber-900/90 text-amber-300 p-3 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:scale-105 transition-all border border-amber-600/60 backdrop-blur-md flex items-center justify-center"
             title="Profil Pendekar & Manajemen"
           >
             <Compass size={22} className="animate-spin-slow" />
           </button>
         )}
      </div>

      {/* Floating Modals */}
      <DashboardModal />
    </div>
  );
}
