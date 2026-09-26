'use client';

import { usePathname } from 'next/navigation';
import { useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMapRoute = pathname === '/world' || pathname === '/' || pathname === '/explore';
  const showMobileMapNav = useUIStore((s) => s.showMobileMapNav);

  return (
    <main
      className={cn(
        'flex-1 w-full min-h-0 relative z-10 flex flex-col transition-all duration-300',
        isMapRoute && !showMobileMapNav ? 'pb-0 h-[100dvh]' : 'pb-16 lg:pb-0'
      )}
    >
      {children}
    </main>
  );
}
