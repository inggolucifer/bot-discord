'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, Waves, Wind, Compass, Fish, Coins, Clock, Zap, X, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface FerryRoute {
  id: string;
  name: string;
  from: { regionSlug: string; settlementName: string; dockName: string };
  to: { regionSlug: string; settlementName: string; dockName: string; tileX: number; tileY: number };
  raftCostSilver: number;
  raftDurationSeconds: number;
  fastShipCostSilver: number;
}

interface FerryCrossingModalProps {
  onClose: () => void;
  onArrivalSuccess?: (newLocation: any) => void;
}

export default function FerryCrossingModal({ onClose, onArrivalSuccess }: FerryCrossingModalProps) {
  const [routes, setRoutes] = useState<FerryRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<FerryRoute | null>(null);
  const [voyageState, setVoyageState] = useState<any>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [crossing, setCrossing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fishMessage, setFishMessage] = useState<string | null>(null);

  // Muat rute yang tersedia
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        const res = await api.get('/ferry/routes');
        if (res.data?.routes) {
          setRoutes(res.data.routes);
          setSelectedRoute(res.data.routes[0] || null);
        }
      } catch (err: any) {
        console.error('Gagal memuat rute dermaga:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  // Timer countdown pelayaran rakit
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds]);

  // Handler Berlayar
  const handleStartCrossing = async (mode: 'raft' | 'fast_ship') => {
    if (!selectedRoute || crossing) return;
    try {
      setCrossing(true);
      setMessage(null);
      const res = await api.post('/ferry/cross', {
        routeId: selectedRoute.id,
        mode
      });

      if (res.data?.success) {
        if (mode === 'fast_ship') {
          setMessage(res.data.message);
          if (onArrivalSuccess) onArrivalSuccess(res.data.newLocation);
          setTimeout(() => {
            onClose();
          }, 1800);
        } else {
          // Moda Rakit (Berwaktu)
          setVoyageState(res.data.voyage);
          setRemainingSeconds(res.data.remainingSeconds || 30);
          setMessage(res.data.message);
        }
      }
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Gagal memulai penyeberangan.');
    } finally {
      setCrossing(false);
    }
  };

  // Handler Merapatkan Rakit
  const handleResolveVoyage = async () => {
    try {
      setCrossing(true);
      const res = await api.post('/ferry/resolve');
      if (res.data?.success) {
        setMessage(res.data.message);
        if (onArrivalSuccess) onArrivalSuccess(res.data.newLocation);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Gagal merapatkan rakit.');
    } finally {
      setCrossing(false);
    }
  };

  // Handler Mancing di Geladak
  const handleFishOnDeck = async () => {
    try {
      const res = await api.post('/ferry/fish-on-deck');
      if (res.data?.success) {
        setFishMessage(res.data.message);
      }
    } catch (err: any) {
      setFishMessage(err.response?.data?.error || 'Gagal melempar kail.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0e131d] border-2 border-cyan-800/50 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)] text-gray-200 relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Title Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700/50 flex items-center justify-center text-2xl shadow-inner">
            ⛵
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-cyan-300">Dermaga Penyeberangan Air</h2>
            <p className="text-xs text-gray-400">Jalur transportasi bahari membelah arus sungai dan lautan</p>
          </div>
        </div>

        {/* Jika Sedang dalam Pelayaran Rakit */}
        {voyageState && remainingSeconds > 0 ? (
          <div className="bg-[#131b29] border border-cyan-900/60 rounded-xl p-5 my-4 text-center space-y-4">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <span className="text-3xl animate-pulse">🛶</span>
            </div>

            <div>
              <h3 className="text-sm font-serif font-bold text-cyan-200">
                Rakit Bambu Sedang Melintasi Arus Air
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Tujuan: <span className="text-gray-200 font-semibold">{voyageState.destinationDockName}</span>
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="inline-flex items-center gap-2 bg-black/50 border border-cyan-800/40 px-3 py-1.5 rounded-full font-mono text-cyan-300 text-sm">
              <Clock size={16} /> {remainingSeconds} detik tersisa
            </div>

            {/* Interaksi Mancing di Geladak */}
            <div className="pt-2 border-t border-gray-800">
              <button
                onClick={handleFishOnDeck}
                className="px-4 py-2 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-serif font-bold flex items-center justify-center gap-2 mx-auto shadow"
              >
                <Fish size={16} /> Lempar Kail di Geladak (-5 STA)
              </button>
              {fishMessage && (
                <p className="text-[11px] text-emerald-400 mt-2 font-medium">{fishMessage}</p>
              )}
            </div>
          </div>
        ) : voyageState && remainingSeconds <= 0 ? (
          /* Rakit Telah Tiba */
          <div className="bg-[#131b29] border border-emerald-900/60 rounded-xl p-5 my-4 text-center space-y-3">
            <div className="text-4xl">⚓</div>
            <h3 className="text-base font-serif font-bold text-emerald-300">
              Rakit Bambu Telah Tiba di Dermaga Tujuan!
            </h3>
            <p className="text-xs text-gray-400">
              Perjalanan melintasi perairan telah selesai. Tekan tombol di bawah untuk merapat ke daratan.
            </p>
            <button
              onClick={handleResolveVoyage}
              disabled={crossing}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-serif font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 mx-auto"
            >
              <CheckCircle2 size={16} /> Merapat ke Daratan
            </button>
          </div>
        ) : (
          /* Pemilihan Rute & Moda */
          <div className="space-y-4">
            {/* Dropdown / Tab Rute */}
            <div>
              <label className="text-xs text-gray-400 font-semibold mb-1.5 block">Pilih Rute Tujuan:</label>
              <div className="space-y-2">
                {routes.map(r => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoute(r)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                      selectedRoute?.id === r.id
                        ? 'bg-cyan-950/50 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-black/40 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-200">{r.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {r.from.dockName} ➔ {r.to.dockName} ({r.to.settlementName})
                      </div>
                    </div>
                    <span className="text-lg">🛶</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dua Pilihan Moda Penyeberangan */}
            {selectedRoute && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Opsi 1: Rakit Dayung (Santai) */}
                <div className="bg-[#111724] border border-gray-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-cyan-700/60 transition-colors">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-1">
                      <span>🛶</span> Rakit Dayung Tradisional
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                      Tarif hemat rakyat. Perjalanan berwaktu nyata 30 detik dengan kesempatan memancing di atas rakit.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-yellow-400 mb-2 font-bold">
                      Biaya: {selectedRoute.raftCostSilver} Perak
                    </div>
                    <button
                      onClick={() => handleStartCrossing('raft')}
                      disabled={crossing}
                      className="w-full py-2 bg-amber-900 hover:bg-amber-800 text-amber-100 rounded-lg text-xs font-serif font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                      <Wind size={14} /> Berlayar Santai (30s)
                    </button>
                  </div>
                </div>

                {/* Opsi 2: Kapal Cepat / Pedang Terbang (Kilat) */}
                <div className="bg-[#111724] border border-cyan-900/50 rounded-xl p-3.5 flex flex-col justify-between hover:border-cyan-500/60 transition-colors">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 mb-1">
                      <span>⛵</span> Kapal Layar Cepat / Pedang
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                      Layanan premium membelah ombak. Tiba seketika di dermaga seberang tanpa waktu tunggu.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-cyan-300 mb-2 font-bold">
                      Biaya: {selectedRoute.fastShipCostSilver} Perak
                    </div>
                    <button
                      onClick={() => handleStartCrossing('fast_ship')}
                      disabled={crossing}
                      className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-serif font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                      <Zap size={14} /> Berlayar Kilat (Instan)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Banner */}
        {message && (
          <div className="mt-4 p-2.5 rounded-lg bg-black/60 border border-cyan-900/40 text-xs text-cyan-200 text-center font-serif">
            {message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
