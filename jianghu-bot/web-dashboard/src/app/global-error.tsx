'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[JIANGHU-GLOBAL-ERROR]', error);
    try {
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message || 'Fatal Global App Error',
          stack: error.stack?.slice(0, 1500),
          component: 'app/global-error.tsx',
          url: typeof window !== 'undefined' ? window.location.href : ''
        })
      }).catch(() => {});
    } catch (_) {}
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-[#070b13] text-gray-200 min-h-screen flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full bg-[#0b0f19] border border-amber-600/40 rounded-2xl p-6 shadow-2xl text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-950/40 border border-red-500/50 flex items-center justify-center text-red-400 font-bold text-xl">
            !
          </div>

          <h2 className="text-xl font-bold text-amber-200 mb-2">
            Formasi Semesta Terguncang
          </h2>

          <p className="text-xs text-gray-400 mb-6">
            Terjadi kegagalan kritis pada antarmuka aplikasi. Silakan muat ulang atau coba lagi.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-xl bg-amber-600/40 hover:bg-amber-600/60 text-amber-200 border border-amber-500/50 text-xs font-semibold"
            >
              Pulihkan Halaman
            </button>
            <button
              onClick={() => { if (typeof window !== 'undefined') window.location.href = '/world'; }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700 text-xs font-semibold"
            >
              Ke Dunia Utama
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
