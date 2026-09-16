'use client';
import React, { useState } from 'react';
import { Swords, ShieldAlert, Footprints, Coins, X, Skull } from 'lucide-react';
import api from '@/lib/api';

interface GridAmbushCombatModalProps {
  enemyName?: string;
  encounterMessage?: string;
  onResolved: (resultMsg: string) => void;
  onClose: () => void;
}

export default function GridAmbushCombatModal({
  enemyName = 'Kelompok Bandit Hutan Liar',
  encounterMessage = 'Langkahmu terhenti! Sekelompok musuh bersenjata menghadang di balik semak tebal.',
  onResolved,
  onClose
}: GridAmbushCombatModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChoice = async (choice: 'fight' | 'surrender' | 'flee') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/world/travel/resolve-ambush', { choice });
      const msg = res.data?.travel?.ambushResult?.message || res.data?.message || 'Pertempuran selesai.';
      onResolved(msg);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyelesaikan penyergapan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-b from-[#2b1515] to-[#120808] border border-red-600/80 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500/80 mx-auto flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse">
          <Skull className="w-8 h-8 text-red-400" />
        </div>

        <h2 className="text-xl font-serif font-bold text-red-300 mb-1 tracking-wide">
          Disergap di Zona Bahaya!
        </h2>
        <h3 className="text-sm font-serif font-semibold text-amber-300 mb-3">{enemyName}</h3>

        <p className="text-xs text-gray-300 leading-relaxed mb-4 bg-black/50 p-3 rounded-lg border border-red-900/40">
          {encounterMessage}
        </p>

        {error && (
          <div className="mb-3 bg-red-900/60 border border-red-500 text-red-200 p-2 rounded text-xs">
            {error}
          </div>
        )}

        {/* Tombol Keputusan */}
        <div className="space-y-2.5">
          <button
            onClick={() => handleChoice('fight')}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 text-white font-serif font-bold rounded-lg text-xs shadow-lg border border-red-500/60 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Swords className="w-4 h-4 text-red-200" />
            <span>Hunus Senjata & Lawan (Risiko Tinggi)</span>
          </button>

          <button
            onClick={() => handleChoice('surrender')}
            disabled={loading}
            className="w-full py-2 bg-[#221818] hover:bg-[#332222] text-amber-200 font-serif font-semibold rounded-lg text-xs border border-amber-900/50 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Beri Uang Damai (Bayar Upeti)</span>
          </button>

          <button
            onClick={() => handleChoice('flee')}
            disabled={loading}
            className="w-full py-2 bg-black/40 hover:bg-black/60 text-gray-400 hover:text-gray-200 font-serif rounded-lg text-xs border border-gray-800 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Kabur dengan Ilmu Qinggong</span>
          </button>
        </div>
      </div>
    </div>
  );
}
