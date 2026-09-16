'use client';
import React, { useState, useEffect } from 'react';
import { Compass, Clock, Swords, CheckCircle, PackageOpen, X, ArrowRight, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';

interface GridExpeditionModalProps {
  dungeonName: string;
  tileCoordinates: { x: number; y: number };
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export default function GridExpeditionModal({
  dungeonName,
  tileCoordinates,
  onClose,
  onSuccess
}: GridExpeditionModalProps) {
  const [durationHours, setDurationHours] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [activeExp, setActiveExp] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    fetchExpeditionStatus();
  }, []);

  const fetchExpeditionStatus = async () => {
    try {
      const res = await api.get('/pve/status');
      if (res.data?.data) {
        setActiveExp(res.data.data);
      } else {
        setActiveExp(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  const isCompleted = activeExp && new Date() >= new Date(activeExp.endTime);

  useEffect(() => {
    if (activeExp && !isCompleted) {
      const interval = setInterval(() => {
        const diff = new Date(activeExp.endTime).getTime() - Date.now();
        if (diff <= 0) {
          setTimeRemaining(0);
          fetchExpeditionStatus();
        } else {
          setTimeRemaining(diff);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeExp, isCompleted]);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/pve/start', {
        locationId: 'ancient_cave_dungeon',
        durationHours: durationHours
      });
      if (res.data?.message && onSuccess) onSuccess(res.data.message);
      fetchExpeditionStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memulai ekspedisi.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/pve/claim');
      if (onSuccess) onSuccess('Loot ekspedisi berhasil diklaim!');
      setActiveExp(null);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal mengklaim hadiah ekspedisi.');
    } finally {
      setLoading(false);
    }
  };

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#1c182b] to-[#0c0a17] border border-indigo-500/70 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <Compass className="w-6 h-6 text-indigo-400 animate-pulse" />
          <h2 className="text-base font-serif font-bold text-indigo-200">Gerbang Ekspedisi Luar</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {dungeonName} • Koordinat ({tileCoordinates.x}, {tileCoordinates.y})
        </p>

        {error && (
          <div className="mb-3 bg-red-950/60 border border-red-700/60 text-red-200 p-2.5 rounded-lg text-xs">
            {error}
          </div>
        )}

        {statusLoading ? (
          <div className="py-8 text-center text-xs text-gray-400">Memeriksa aura dungeon...</div>
        ) : activeExp ? (
          <div className="bg-[#121021] border border-indigo-900/60 rounded-lg p-4 mb-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-indigo-400" /> Sedang Menjelajah...
              </span>
              <span className="text-indigo-400 font-mono font-bold">
                {isCompleted ? 'Selesai!' : formatRemaining(timeRemaining)}
              </span>
            </div>

            <p className="text-xs text-gray-300">
              Karaktermu sedang menyusuri lorong purba. Tingkat bahaya tinggi dengan peluang artefak langka.
            </p>

            {isCompleted && (
              <button
                onClick={handleClaim}
                disabled={loading}
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 text-white font-serif font-bold rounded-lg text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all"
              >
                <PackageOpen className="w-4 h-4" />
                <span>Klaim Rampasan & Artefak Ekspedisi</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[#121021] border border-indigo-900/60 rounded-lg p-4 mb-4 space-y-3">
            <label className="block text-xs font-semibold text-gray-300">Pilih Durasi Penjelajahan:</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map(h => (
                <button
                  key={h}
                  onClick={() => setDurationHours(h)}
                  className={`py-2 rounded border text-xs font-serif font-bold transition-all ${
                    durationHours === h
                      ? 'bg-indigo-700 border-indigo-400 text-white shadow-md'
                      : 'bg-black/40 border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {h} Jam
                </button>
              ))}
            </div>

            <div className="text-[11px] text-gray-400 bg-black/40 p-2.5 rounded border border-indigo-950 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" /> Peringatan:
              </div>
              <p>Ekspedisi akan menguras stamina fisik dan menantang siluman penjaga ruang bawah tanah.</p>
            </div>

            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-700 to-purple-600 hover:from-indigo-600 text-white font-serif font-bold rounded-lg text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{loading ? 'Memasuki Gerbang...' : 'Terjun ke Ekspedisi'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
