"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import SectArenaModal from '@/components/cultivation/SectArenaModal';

export default function SectArenaPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <SectArenaModal isOpen={true} onClose={() => router.push('/cultivation')} />
    </div>
  );
}
