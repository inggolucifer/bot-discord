"use client";

import React from 'react';
import DailyHubModal from '@/components/cultivation/DailyHubModal';

export default function DailyHubPage() {
  return (
    <div className="container mx-auto px-3 sm:px-6 py-6 max-w-5xl">
      <DailyHubModal isOpen={true} isStandalone={true} />
    </div>
  );
}
