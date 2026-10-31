'use client';
import { Suspense } from 'react';
import WorldMapLoadingScreen from "@/components/map/WorldMapLoadingScreen";
import WorldPageContent from './WorldPageContent';

export default function WorldPage() {
  return (
    <Suspense fallback={<WorldMapLoadingScreen isReady={false} />}>
      <WorldPageContent />
    </Suspense>
  );
}
