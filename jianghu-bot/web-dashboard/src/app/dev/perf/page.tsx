import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import PerfBenchClient from './PerfBenchClient';

/**
 * Halaman Benchmark Performa V22 (/dev/perf)
 * Khusus lingkungan pengembangan; otomatis mengembalikan 404 pada production build.
 */
export default function PerfBenchPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <Suspense fallback={<div className="w-screen h-screen bg-[#070a14] text-amber-200 p-6 font-mono text-sm">Menyiapkan lingkungan uji performa V22...</div>}>
      <PerfBenchClient />
    </Suspense>
  );
}
