'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Compass } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[JIANGHU-ERROR-BOUNDARY]', error);
    try {
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message || 'Unknown Next.js App Router Error',
          stack: error.stack?.slice(0, 1500),
          component: 'app/error.tsx',
          url: typeof window !== 'undefined' ? window.location.href : ''
        })
      }).catch(() => {});
    } catch (_) {}
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0b0f19]/90 border border-amber-600/40 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-75" />

        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-950/40 border border-amber-500/50 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-7 h-7 animate-pulse" />
        </div>

        <h2 className="text-xl font-serif font-bold text-amber-200 mb-2 tracking-wide">
          Gangguan Aliran Qi Terdeteksi
        </h2>

        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          Terjadi ketidakstabilan formasi spiritual pada layar ini. Cobalah menyelaraskan kembali dantian Anda atau kembali ke peta dunia.
        </p>

        {error.message && (
          <div className="mb-6 p-2.5 bg-black/50 border border-red-900/40 rounded-lg text-left overflow-x-auto max-h-24 text-[11px] font-mono text-red-300/80">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 font-medium text-xs transition-colors shadow-lg shadow-amber-950/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>

          <a
            href="/world"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-gray-200 border border-slate-700 font-medium text-xs transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ke Peta Dunia</span>
          </a>
        </div>
      </div>
    </div>
  );
}
