'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      setError('Kode otorisasi tidak ditemukan.');
      return;
    }

    const authenticate = async () => {
      try {
        const redirectUri = process.env.NEXT_PUBLIC_URL
          ? `${process.env.NEXT_PUBLIC_URL}/auth/callback`
          : 'http://localhost:3000/auth/callback';

        const res = await api.post('/auth/login', { code, redirectUri });

        login(res.data.token, res.data.user);

        // Redirect home after successful login
        router.push('/');
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Gagal login melalui Discord.');
      }
    };

    authenticate();
  }, [searchParams, router, login]);

  return (
    <div className="flex-grow flex items-center justify-center min-h-[60vh]">
      <div className="bg-[#1a1a1a] jianghu-border p-8 rounded-lg text-center max-w-md w-full">
        {error ? (
          <div>
            <h2 className="text-red-500 font-bold text-xl mb-4">Login Gagal</h2>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-black border border-[#333] hover:border-[#c5a880] text-gray-300 px-4 py-2 rounded transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        ) : (
          <div className="animate-pulse">
            <h2 className="text-[#c5a880] font-bold text-xl font-serif mb-2">Menghubungkan ke Sekte...</h2>
            <p className="text-sm text-gray-500">Membaca Kitab Suci Discord...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="flex justify-center p-20 text-[#c5a880]">Memuat...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}