"use client";

import React from 'react';
import WorldBossModal from '@/components/cultivation/WorldBossModal';

export default function WorldBossPage() {
  return (
    <div className="container mx-auto px-3 sm:px-6 py-6 max-w-5xl">
      <WorldBossModal isOpen={true} isStandalone={true} />
    </div>
  );
}
