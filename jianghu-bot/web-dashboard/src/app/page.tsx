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

      {/* Persistent UI Overlays (Floating Buttons) */}
      <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-3">
         {activeModal !== 'dashboard' && (
           <button 
             onClick={() => setActiveModal('dashboard')}
             className="bg-amber-700/90 hover:bg-amber-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(217,119,6,0.5)] transition-all border border-amber-500/50"
           >
             <Compass size={24} />
           </button>
         )}
      </div>

      {/* Floating Modals */}
      <DashboardModal />
    </div>
  );
}
