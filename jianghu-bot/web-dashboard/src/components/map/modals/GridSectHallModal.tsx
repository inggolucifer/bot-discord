'use client';
import React, { useState, useEffect } from 'react';
import { Shield, Users, Coins, BookOpen, Award, X, Sparkles, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface GridSectHallModalProps {
  sectName: string;
  sectId?: string;
  onClose: () => void;
  onOpenExam?: (sectId: string) => void;
}

export default function GridSectHallModal({
  sectName,
  sectId,
  onClose,
  onOpenExam
}: GridSectHallModalProps) {
  const [sectData, setSectData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [donateAmount, setDonateAmount] = useState<number>(10);
  const [donateLoading, setDonateLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSect();
  }, [sectName]);

  const fetchSect = async () => {
    try {
      const res = await api.get('/sect');
      setSectData(res.data?.sect || null);
    } catch (err) {
      console.error('Failed to fetch sect:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async () => {
    setDonateLoading(true);
    setMsg(null);
    try {
      await api.post('/sect/donate', { type: 'silver', amount: donateAmount });
      setMsg(`Berhasil mendonasikan ${donateAmount} Perak ke perbendaharaan sekte!`);
      fetchSect();
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Gagal donasi.');
    } finally {
      setDonateLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#1f1b2b] to-[#0d0a17] border border-purple-600/70 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <Shield className="w-6 h-6 text-purple-400" />
          <h2 className="text-base font-serif font-bold text-purple-200">{sectName || 'Balai Sekte Spiritual'}</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Markas perguruan persilatan & pusat pewarisan ilmu esoterik.</p>

        {msg && (
          <div className="mb-3 bg-purple-950/60 border border-purple-700 text-purple-200 p-2.5 rounded-lg text-xs">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Menyambut kehadiran pendekar...</div>
        ) : (
          <div className="space-y-4">
            {/* Status Keanggotaan */}
            <div className="bg-[#120f1f] border border-purple-900/60 rounded-lg p-3.5 flex justify-between items-center text-xs">
              <div>
                <span className="text-gray-400">Status Pendekar: </span>
                <span className="text-purple-300 font-bold">{sectData ? sectData.role || 'Murid Luar' : 'Bukan Anggota'}</span>
              </div>
              <span className="text-amber-400 font-mono font-semibold">
                Kekayaan Sekte: {sectData?.totalWealth || 15000} Perak
              </span>
            </div>

            {sectData ? (
              // Fitur Murid Sekte
              <div className="bg-[#120f1f] border border-gray-800 rounded-lg p-3.5 space-y-3 text-xs">
                <h4 className="font-serif font-bold text-purple-200 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" /> Donasi Kas Sekte
                </h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(parseInt(e.target.value) || 1)}
                    className="w-24 bg-black/60 border border-gray-700 rounded px-2 py-1.5 text-amber-200 text-xs font-mono"
                  />
                  <span className="self-center text-gray-400">Perak</span>
                  <button
                    onClick={handleDonate}
                    disabled={donateLoading}
                    className="ml-auto px-4 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded font-serif font-bold transition-colors disabled:opacity-50"
                  >
                    {donateLoading ? 'Mengirim...' : 'Kirim Donasi'}
                  </button>
                </div>
              </div>
            ) : (
              // Bukan Murid -> Ujian Masuk Sekte
              <div className="bg-[#120f1f] border border-amber-900/60 rounded-lg p-4 space-y-2 text-xs">
                <h4 className="font-serif font-bold text-amber-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" /> Ujian Seleksi Penerimaan Murid
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  Gerbang sekte terbuka bagi para pengelana berbakat. Ikuti serangkaian ujian kitab batin dan ujian fisik untuk diterima menjadi murid resmi.
                </p>
                <button
                  onClick={() => {
                    if (onOpenExam) onOpenExam(sectId || 'heavenly_sword');
                    onClose();
                  }}
                  className="mt-2 w-full py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 text-white font-serif font-bold rounded-lg shadow-lg border border-amber-500/50 transition-all active:scale-95"
                >
                  Ikuti Ujian Masuk Sekte
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-4 pt-3 border-t border-purple-950">
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
