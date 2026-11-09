'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { InkBackdrop } from './InkBackdrop';
import { Silhouette } from './Silhouette';
import { GLOBAL_ASSETS } from '@/config/globalAssets';
import './npcTheme.css';

export interface PendingAmbushData {
  _id: string;
  hunterNpc: {
    _id: string;
    name: string;
    gender?: string;
    portraitUrl?: string;
    cultivation?: { realmIndex?: number; realmName?: string };
  };
  demandAmount: number;
  expiresAt: string | Date;
}

export function NpcAmbushDialog() {
  const [ambush, setAmbush] = useState<PendingAmbushData | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(60);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Poll for pending ambushes every 20s when visible
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkPendingAmbush = async () => {
      if (document.visibilityState !== 'visible' || ambush) return;
      try {
        const res = await api.get('/npc/ambush/pending');
        if (res.data?.success && res.data.ambush) {
          setAmbush(res.data.ambush);
        }
      } catch (_) {
        // Non-blocking background check
      }
    };

    // Initial check after 3 seconds
    const initialTimer = setTimeout(checkPendingAmbush, 3000);
    interval = setInterval(checkPendingAmbush, 20000);

    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [ambush]);

  // Countdown timer
  useEffect(() => {
    if (!ambush) return;

    const updateTimer = () => {
      const remainingMs = new Date(ambush.expiresAt).getTime() - Date.now();
      const sec = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeLeftSec(sec);
      if (sec <= 0 && !loading && !feedback) {
        // Default to fight on timer expiration
        handleResolve('fight');
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [ambush, loading, feedback]);

  const handleResolve = async (action: 'fight' | 'pay' | 'flee') => {
    if (!ambush || loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await api.post(`/npc/ambush/${ambush._id}/resolve`, { action });
      if (res.data?.success) {
        const msg = res.data.result?.message || 'Penyergapan telah diselesaikan.';
        setFeedback(msg);

        if (action === 'fight') {
          // If battle starts, trigger battle route
          setTimeout(() => {
            setAmbush(null);
            setFeedback(null);
            // Trigger battle via window or page refresh
            window.location.reload();
          }, 1500);
        } else {
          setTimeout(() => {
            setAmbush(null);
            setFeedback(null);
          }, 2500);
        }
      } else {
        setFeedback(res.data?.message || 'Gagal menyelesaikan penyergapan.');
        setTimeout(() => setAmbush(null), 3000);
      }
    } catch (err: any) {
      setFeedback(err?.response?.data?.message || 'Gagal memproses aksi penyergapan.');
      setTimeout(() => setAmbush(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !ambush) return null;

  const hunter = ambush.hunterNpc;
  const portraitUrl =
    (GLOBAL_ASSETS as any)?.npcs?.[hunter.name] ||
    hunter.portraitUrl ||
    '';

  const modalNode = (
    <div
      data-npc-root="true"
      role="dialog"
      aria-modal="true"
      aria-label={`Penyergapan oleh ${hunter.name}`}
      className="npc-ui fixed inset-0 z-[99995] w-screen h-screen overflow-hidden flex flex-col justify-end select-none"
      style={{
        backgroundColor: 'var(--npc-night, #0e0f12)',
        fontFamily: 'var(--npc-font, system-ui, sans-serif)'
      }}
    >
      {/* 1. Backdrop */}
      <InkBackdrop />

      {/* 2. Top Warning Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2 border shadow-lg"
        style={{
          backgroundColor: 'var(--npc-seal, #a3231f)',
          borderColor: '#c43a36',
          color: 'var(--npc-cream, #e8e2d0)',
          borderRadius: 'var(--npc-radius, 2px)'
        }}
      >
        <span className="text-xs font-bold tracking-wider uppercase">
          Penyergapan Dendam Darah: Sisa Waktu {timeLeftSec} Detik
        </span>
      </div>

      {/* 3. Standing Portrait */}
      <div className="relative w-full flex-1 flex items-end justify-center pointer-events-none pb-0 max-h-[calc(100vh-170px)]">
        <div className="flex flex-col items-center justify-end w-full sm:w-[380px] max-h-[74vh]">
          {portraitUrl ? (
            <div
              className="relative max-h-[74vh] flex items-end justify-center overflow-hidden"
              style={{
                maskImage:
                  'linear-gradient(to top, transparent 0%, black 18%, black 100%)',
                WebkitMaskImage:
                  'linear-gradient(to top, transparent 0%, black 18%, black 100%)'
              }}
            >
              <img
                src={portraitUrl}
                alt={hunter.name}
                className="max-h-[74vh] w-auto object-contain select-none pointer-events-none"
              />
            </div>
          ) : (
            <Silhouette gender={hunter.gender || 'male'} className="h-[65vh] w-auto" />
          )}
        </div>
      </div>

      {/* 4. Action Choices Floating Above Dialogue Box */}
      <div className="relative z-40 max-w-[900px] w-[min(94vw,900px)] mx-auto flex flex-col items-end mb-2 px-2 pointer-events-auto">
        <div className="w-full sm:w-[320px] flex flex-col gap-1.5">
          <button
            onClick={() => handleResolve('fight')}
            disabled={loading}
            className="w-full h-[38px] px-4 flex items-center justify-center font-bold text-sm border transition cursor-pointer"
            style={{
              backgroundColor: 'var(--npc-seal, #a3231f)',
              color: 'var(--npc-cream, #e8e2d0)',
              borderColor: '#c43a36',
              borderRadius: 'var(--npc-radius, 2px)'
            }}
          >
            Lawan (Pertarungan Hidup-Mati)
          </button>
          <button
            onClick={() => handleResolve('pay')}
            disabled={loading}
            className="w-full h-[38px] px-4 flex items-center justify-center font-medium text-sm border transition cursor-pointer"
            style={{
              backgroundColor: 'var(--npc-btn, #cfcfcf)',
              color: 'var(--npc-btn-ink, #1b1b1b)',
              borderColor: 'var(--npc-parchment-edge, #8c8672)',
              borderRadius: 'var(--npc-radius, 2px)'
            }}
          >
            Bayar Ganti Rugi ({ambush.demandAmount} Tembaga)
          </button>
          <button
            onClick={() => handleResolve('flee')}
            disabled={loading}
            className="w-full h-[38px] px-4 flex items-center justify-center font-medium text-sm border transition cursor-pointer"
            style={{
              backgroundColor: 'var(--npc-btn, #cfcfcf)',
              color: 'var(--npc-btn-ink, #1b1b1b)',
              borderColor: 'var(--npc-parchment-edge, #8c8672)',
              borderRadius: 'var(--npc-radius, 2px)'
            }}
          >
            Kabur (Uji Kelincahan)
          </button>
        </div>
      </div>

      {/* 5. Dialogue Box */}
      <div className="relative z-30 w-full pb-4 sm:pb-6 px-3 flex flex-col items-center">
        <div
          className="relative max-w-[900px] w-[min(94vw,900px)] min-h-[140px] sm:h-[150px] p-5 sm:px-7 sm:py-5 select-none"
          style={{
            backgroundColor: 'var(--npc-parchment, #d8d2c0)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.07'/%3E%3C/svg%3E")`,
            border: '2px solid var(--npc-parchment-edge, #8c8672)',
            borderRadius: 'var(--npc-radius, 2px)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.35)'
          }}
        >
          {/* Nameplate */}
          <div
            className="absolute -top-[27px] right-3 px-6 h-[26px] flex items-center font-semibold text-[13px] tracking-wide pointer-events-none"
            style={{
              backgroundColor: 'var(--npc-night, #0e0f12)',
              color: 'var(--npc-cream, #e8e2d0)',
              clipPath: 'polygon(0 0, 100% 0, 94% 100%, 6% 100%)',
              letterSpacing: '0.03em'
            }}
          >
            {hunter.name} (Pemburu Dendam)
          </div>

          <div
            className="w-full h-full overflow-y-auto text-[17px] leading-[1.65]"
            style={{
              color: 'var(--npc-ink, #1d1c19)',
              fontFamily: 'var(--npc-font, system-ui, sans-serif)'
            }}
          >
            {feedback ? (
              <span className="font-semibold text-[color:var(--npc-seal,#a3231f)]">
                {feedback}
              </span>
            ) : (
              `${hunter.name} menghadang jalan Anda dengan tatapan dingin penuh dendam! "Darah harus dibayar dengan darah, atau serahkan kompensasi ganti rugi jika ingin lewat hidup-hidup!"`
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
