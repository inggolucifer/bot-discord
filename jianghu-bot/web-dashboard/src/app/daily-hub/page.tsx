"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import DailyHubModal from '@/components/cultivation/DailyHubModal';
import { PageHeader } from '@/components/ui/PageHeader';

export default function DailyHubPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <DailyHubModal isOpen={true} onClose={() => router.push('/cultivation')} />
    </div>
  );
}
