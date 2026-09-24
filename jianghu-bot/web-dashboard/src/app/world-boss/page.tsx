"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import WorldBossModal from '@/components/cultivation/WorldBossModal';

export default function WorldBossPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <WorldBossModal isOpen={true} onClose={() => router.push('/cultivation')} />
    </div>
  );
}
