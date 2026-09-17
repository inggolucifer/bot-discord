'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Award, Swords, Zap, CheckCircle, XCircle, AlertCircle, X, Scroll, Coins } from 'lucide-react';
import api from '@/lib/api';

interface SectEntranceExamModalProps {
  sectId: string;
  sectName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SectEntranceExamModal({
  sectId,
  sectName = 'Sekte Pedang Langit',
  onClose,
  onSuccess
}: SectEntranceExamModalProps) {
  const [examInfo, setExamInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchExamInfo = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/sect/${sectId}/examInfo`);
        setExamInfo(res.data);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Gagal memuat informasi ujian sekte.');
      } finally {
        setLoading(false);
      }
    };
    if (sectId) fetchExamInfo();
  }, [sectId]);

  const handleStartExam = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await api.post(`/sect/${sectId}/exam/start`);
      setExamResult(res.data);
      if (res.data?.success && onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengikuti ujian masuk sekte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#121622] border-2 border-amber-900/60 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] text-gray-200 relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-950 border border-amber-700/50 flex items-center justify-center text-2xl shadow-inner">
            🏯
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-amber-300">Seleksi Ujian Masuk Sekte</h2>
            <p className="text-xs text-gray-400">{examInfo?.sectName || sectName}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-gray-400 font-serif">Meninjau kualifikasi pendekar...</p>
          </div>
        ) : examResult ? (
          /* Hasil Ujian */
          <div className="space-y-4 text-center py-2">
            <div className="text-5xl">{examResult.success ? '🎉' : '⚔️'}</div>
            <h3 className={`text-base font-serif font-bold ${examResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {examResult.success ? 'Lulus Seleksi Penerimaan Murid!' : 'Gagal dalam Duel Turnamen'}
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed px-4">
              {examResult.message}
            </p>

            {/* Tahapan yang Dilewati */}
            {examResult.stages && (
              <div className="bg-black/40 border border-gray-800 rounded-xl p-3 space-y-2 text-left text-xs">
                {examResult.stages.map((st: any) => (
                  <div key={st.stage} className="flex items-center justify-between">
                    <span className="text-gray-300 font-serif">{st.stage}. {st.name}</span>
                    {st.passed ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle size={13} /> Lulus
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1 text-[11px]">
                        <XCircle size={13} /> Gagal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Catatan Duel Sparring */}
            {examResult.log && (
              <div className="bg-black/60 border border-gray-800 rounded-xl p-3 text-left font-mono text-[10px] text-gray-400 max-h-32 overflow-y-auto custom-scrollbar">
                <div className="font-bold text-gray-300 mb-1">Catatan Pertarungan:</div>
                {examResult.log.map((line: string, idx: number) => (
                  <div key={idx} className="leading-tight py-0.5">{line}</div>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-serif font-bold text-xs rounded-xl shadow mt-2"
            >
              Tutup Pengumuman
            </button>
          </div>
        ) : (
          /* Tampilan Pendaftaran Ujian */
          <div className="space-y-4">
            {/* Persyaratan Ujian */}
            <div className="bg-[#0c1018] border border-gray-800 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="text-amber-400 font-bold font-serif flex items-center gap-1.5">
                <Scroll size={15} /> Kualifikasi & Biaya Pendaftaran:
              </div>
              <ul className="space-y-1.5 text-gray-300 list-disc list-inside">
                <li>Biaya Pendaftaran: <span className="font-mono text-yellow-400 font-bold">150 Perak</span> atau memiliki item <span className="text-amber-300 font-semibold">'Plakat Ujian Sekte'</span>.</li>
                <li>Batas Minimal Ranah: <span className="text-blue-300 font-bold">Index {examInfo?.minRealmIndex || 0}</span>.</li>
                <li>Tidak sedang terdaftar sebagai murid di sekte lain.</li>
              </ul>
            </div>

            {/* Tiga Babak Ujian */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400 font-semibold">Tiga Babak Seleksi Resmi:</div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-black/40 border border-gray-800 p-2.5 rounded-xl">
                  <div className="text-lg mb-1">🥋</div>
                  <div className="font-serif font-bold text-gray-200">Babak 1</div>
                  <div className="text-[10px] text-gray-400">Kuda-Kuda Jasmani</div>
                </div>
                <div className="bg-black/40 border border-gray-800 p-2.5 rounded-xl">
                  <div className="text-lg mb-1">🌀</div>
                  <div className="font-serif font-bold text-gray-200">Babak 2</div>
                  <div className="text-[10px] text-gray-400">Kemurnian Qi</div>
                </div>
                <div className="bg-black/40 border border-gray-800 p-2.5 rounded-xl">
                  <div className="text-lg mb-1">⚔️</div>
                  <div className="font-serif font-bold text-gray-200">Babak 3</div>
                  <div className="text-[10px] text-gray-400">Duel Sparring</div>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Tombol Mulai */}
            <button
              onClick={handleStartExam}
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-serif font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Swords size={16} />
              {submitting ? 'Menjalani Ujian...' : 'Serahkan Tiket & Mulai Ujian 3 Babak'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
