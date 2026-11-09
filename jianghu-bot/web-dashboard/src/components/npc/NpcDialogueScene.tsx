'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NpcFullProfile, NpcPlayerRelationData } from '@/types/npc';
import { GlyphClose, GlyphMouse } from './glyphs';
import { InkBackdrop } from './InkBackdrop';
import { Silhouette } from './Silhouette';
import {
  createRunner,
  tick,
  advance,
  isLastLine,
  currentSpeaker,
  getVisibleText,
  DialogueLine,
  DialogueRunnerState
} from '@/lib/npcDialogueRunner';
import api from '@/lib/api';
import './npcTheme.css';

export interface NpcDialogueSceneProps {
  npc: NpcFullProfile;
  relation: NpcPlayerRelationData;
  isOpen?: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onRefreshRelation?: () => void;
  onStartBattle?: (mode: 'npc_spar' | 'npc_duel') => void;
  initialLines?: DialogueLine[];
}

export function NpcDialogueScene({
  npc,
  relation,
  isOpen = true,
  onClose,
  onOpenProfile,
  onRefreshRelation,
  onStartBattle,
  initialLines
}: NpcDialogueSceneProps) {
  // Default initial greeting line
  const defaultLines: DialogueLine[] = initialLines || [
    {
      speaker: 'npc',
      speakerName: npc.name,
      text:
        relation.affinity > 50
          ? `Salam hangat, sahabatku! Senang sekali melihat langkahmu tiba di sini hari ini.`
          : relation.affinity < -20
          ? `Mau apa lagi kamu datang ke sini? Jangan sampai pedangku kehilangan kesabaran.`
          : `Salam, rekan pendekar. Angin persilatan bertiup tenang di pemukiman hari ini. Ada urusan apa menemuiku?`
    }
  ];

  const [runnerState, setRunnerState] = useState<DialogueRunnerState>(() =>
    createRunner(defaultLines)
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus root when opened
  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  // Main animation frame tick loop for typewriter
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const dt = Math.max(0, time - lastTimeRef.current);
      lastTimeRef.current = time;

      setRunnerState((prev) => {
        if (!prev.isTyping || prev.completed) return prev;
        return tick(prev, dt, 45);
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Advance dialogue handler
  const handleAdvance = useCallback(() => {
    setRunnerState((prev) => advance(prev));
  }, []);

  // Keyboard controls: Space/Enter advances, Escape closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        // Prevent default spacebar scroll
        e.preventDefault();
        handleAdvance();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleAdvance]);

  // Execute dialogue choice action
  const handleChoice = async (actionId: string) => {
    if (actionLoading) return;

    if (actionId === 'view_profile') {
      onOpenProfile();
      return;
    }

    if (actionId === 'dismiss') {
      onClose();
      return;
    }

    if (actionId === 'spar') {
      if (onStartBattle) {
        onStartBattle('npc_spar');
      }
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await api.post(`/npc/action/${npc._id}`, {
        action: actionId,
        payload: { amount: 100 }
      });

      if (res.data?.success) {
        if (onRefreshRelation) onRefreshRelation();

        const replyText =
          res.data.dialogue?.text ||
          res.data.message ||
          'Tanggapan diterima dengan tenang.';

        // Push NPC response as next line and advance to it
        setRunnerState((prev) => {
          const nextLines: DialogueLine[] = [
            ...prev.lines,
            {
              speaker: 'npc',
              speakerName: npc.name,
              text: replyText
            }
          ];
          const nextIndex = prev.lines.length;
          return {
            lines: nextLines,
            lineIndex: nextIndex,
            charProgress: 0,
            isTyping: true,
            choicesVisible: false,
            completed: false
          };
        });
      } else {
        setActionError(res.data?.message || 'Aksi tidak dapat dilaksanakan.');
      }
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || 'Gagal menghubungi tokoh persilatan.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const speaker = currentSpeaker(runnerState);
  const isPlayerActive = speaker === 'player';
  const isNpcActive = speaker === 'npc';
  const visibleText = getVisibleText(runnerState);
  const lastLine = isLastLine(runnerState);
  const showChoices = lastLine && !runnerState.isTyping;

  // 4 Primary choices + 4 Secondary choices via "Lainnya"
  const primaryChoices = [
    { id: 'chat', label: 'Bicara' },
    { id: 'gift', label: 'Beri Hadiah' },
    { id: 'spar', label: 'Adu Latih' },
    { id: 'dismiss', label: 'Pamit' }
  ];

  const secondaryChoices = [
    { id: 'debate', label: 'Berdebat' },
    { id: 'dual_cultivation', label: 'Latihan Bersama' },
    { id: 'request_favor', label: 'Minta Bantuan' },
    { id: 'view_profile', label: 'Lihat Profil' }
  ];

  const dialogContent = (
    <div
      ref={containerRef}
      tabIndex={-1}
      data-npc-root="true"
      role="dialog"
      aria-modal="true"
      aria-label={`Percakapan dengan ${npc.name}`}
      className="npc-ui fixed inset-0 w-screen h-screen overflow-hidden flex flex-col justify-end select-none outline-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        backgroundColor: 'var(--npc-night, #0e0f12)',
        fontFamily: 'var(--npc-font, system-ui, sans-serif)'
      }}
    >
      {/* 1. Backdrop Layer (Procedural Ink Mountain SVG with flat colors) */}
      <InkBackdrop />

      {/* 2. Top Bar: Title & Close Button */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        <button
          onClick={onClose}
          aria-label="Tutup Percakapan"
          className="w-8 h-8 flex items-center justify-center border transition cursor-pointer"
          style={{
            backgroundColor: 'var(--npc-night-2, #17181c)',
            borderColor: 'var(--npc-line, #2c2e34)',
            color: 'var(--npc-cream, #e8e2d0)',
            borderRadius: 'var(--npc-radius, 2px)'
          }}
        >
          <GlyphClose size={16} />
        </button>
      </div>

      {/* 3. Standing Portraits Stage */}
      <div
        className={`relative w-full flex-1 flex items-end justify-between px-6 md:px-20 pointer-events-none ${
          showChoices ? 'pb-[180px] sm:pb-0' : 'pb-0'
        } max-h-[calc(100vh-170px)]`}
      >
        {/* Left: Player Standing Figure (Hidden on mobile) */}
        <div
          className={`hidden sm:flex flex-col items-center justify-end w-[320px] max-h-[74vh] transition-all duration-180 ${
            isPlayerActive
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-55 brightness-80 translate-y-2'
          }`}
        >
          <Silhouette gender="male" className="h-[65vh] w-auto" />
        </div>

        {/* Right: NPC Standing Figure (Pure Silhouette) */}
        <div
          className={`flex flex-col items-center justify-end w-full sm:w-[380px] max-h-[45vh] sm:max-h-[74vh] transition-all duration-180 mx-auto sm:mx-0 ${
            isNpcActive
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-55 brightness-80 translate-y-2'
          }`}
        >
          <Silhouette gender={npc.gender} className="h-[45vh] sm:h-[65vh] w-auto" />
        </div>
      </div>

      {/* 4. Choice Options Overlay (Floating above dialogue box, right-aligned, clear of nameplate) */}
      {showChoices && (
        <div data-npc-choices-container="true" className="relative z-40 max-w-[900px] w-[min(94vw,900px)] mx-auto flex flex-col items-end mb-8 sm:mb-9 px-2 pointer-events-auto">
          <div className="w-full sm:w-[320px] grid grid-cols-2 sm:flex sm:flex-col gap-1.5">
            {!showMoreActions ? (
              <>
                {primaryChoices.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleChoice(c.id)}
                    disabled={actionLoading}
                    className="w-full h-[44px] px-3 flex items-center justify-center font-medium text-sm transition cursor-pointer border"
                    style={{
                      backgroundColor: 'var(--npc-parchment, #d8d2c0)',
                      color: 'var(--npc-ink, #1d1c19)',
                      borderColor: 'var(--npc-parchment-edge, #8c8672)',
                      borderRadius: 'var(--npc-radius, 2px)'
                    }}
                  >
                    {c.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowMoreActions(true)}
                  disabled={actionLoading}
                  className="col-span-2 sm:col-span-1 w-full h-[44px] px-3 flex items-center justify-center font-medium text-sm transition cursor-pointer border"
                  style={{
                    backgroundColor: 'var(--npc-parchment, #d8d2c0)',
                    color: 'var(--npc-ink, #1d1c19)',
                    borderColor: 'var(--npc-parchment-edge, #8c8672)',
                    borderRadius: 'var(--npc-radius, 2px)'
                  }}
                >
                  Lainnya
                </button>
              </>
            ) : (
              <>
                {secondaryChoices.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleChoice(c.id)}
                    disabled={actionLoading}
                    className="w-full h-[44px] px-3 flex items-center justify-center font-medium text-sm transition cursor-pointer border"
                    style={{
                      backgroundColor: 'var(--npc-parchment, #d8d2c0)',
                      color: 'var(--npc-ink, #1d1c19)',
                      borderColor: 'var(--npc-parchment-edge, #8c8672)',
                      borderRadius: 'var(--npc-radius, 2px)'
                    }}
                  >
                    {c.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowMoreActions(false)}
                  disabled={actionLoading}
                  className="col-span-2 sm:col-span-1 w-full h-[44px] px-3 flex items-center justify-center font-medium text-sm transition cursor-pointer border"
                  style={{
                    backgroundColor: 'var(--npc-parchment, #d8d2c0)',
                    color: 'var(--npc-ink, #1d1c19)',
                    borderColor: 'var(--npc-parchment-edge, #8c8672)',
                    borderRadius: 'var(--npc-radius, 2px)'
                  }}
                >
                  Kembali
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. Main Visual Novel Dialogue Box */}
      <div className="relative z-30 w-full pb-4 sm:pb-6 px-3 flex flex-col items-center">
        <div
          data-npc-dialogue-box="true"
          onClick={handleAdvance}
          className="relative max-w-[900px] w-[min(94vw,900px)] min-h-[140px] sm:h-[150px] p-5 sm:px-7 sm:py-5 cursor-pointer select-none transition"
          style={{
            backgroundColor: 'var(--npc-parchment, #d8d2c0)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.07'/%3E%3C/svg%3E")`,
            border: '2px solid var(--npc-parchment-edge, #8c8672)',
            borderRadius: 'var(--npc-radius, 2px)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.35)'
          }}
        >
          {/* Nameplate: Player (Left) or NPC (Right) */}
          <div
            className="absolute -top-[27px] px-6 h-[26px] flex items-center font-semibold text-[13px] tracking-wide pointer-events-none"
            style={{
              [isPlayerActive ? 'left' : 'right']: '12px',
              backgroundColor: 'var(--npc-night, #0e0f12)',
              color: 'var(--npc-cream, #e8e2d0)',
              clipPath: 'polygon(0 0, 100% 0, 94% 100%, 6% 100%)',
              letterSpacing: '0.03em'
            }}
          >
            {isPlayerActive ? 'Pendekar' : npc.name}
          </div>

          {/* Dialogue Text Content with Tabular numbers & aria live */}
          <div
            aria-live="polite"
            className="w-full h-full overflow-y-auto text-[17px] leading-[1.65]"
            style={{
              color: 'var(--npc-ink, #1d1c19)',
              fontFamily: 'var(--npc-font, system-ui, sans-serif)'
            }}
          >
            {actionLoading ? (
              <span className="text-[color:var(--npc-ink-soft)]">...</span>
            ) : actionError ? (
              <span className="text-[color:var(--npc-seal,#a3231f)] font-medium">
                {actionError}
              </span>
            ) : (
              visibleText
            )}
          </div>

          {/* Mouse prompt indicator (blinking only when typewriter finished) */}
          {!runnerState.isTyping && !actionLoading && (
            <div
              className="absolute bottom-3 right-4 flex items-center gap-1.5 npc-mouse-indicator text-[color:var(--npc-ink-soft,#4b473d)]"
            >
              <GlyphMouse size={16} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : dialogContent;
}
