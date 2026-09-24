"use client";

import React from 'react';
import SectArenaModal from '@/components/cultivation/SectArenaModal';

export default function SectArenaPage() {
  return (
    <div className="container mx-auto px-3 sm:px-6 py-6 max-w-5xl">
      <SectArenaModal isOpen={true} isStandalone={true} />
    </div>
  );
}
