'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import AuthPortalModal from '@/components/auth/AuthPortalModal';

export default function AuthPage() {
  const { token, user, appearanceCompleted } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Jika sudah login dan sudah menyelesaikan penampilan, arahkan ke beranda
    if (token && user && appearanceCompleted) {
      router.push('/');
    }
  }, [token, user, appearanceCompleted, router]);

  return <AuthPortalModal onSuccess={() => router.push('/')} />;
}
