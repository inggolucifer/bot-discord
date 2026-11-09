'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NpcFullProfile, NpcPlayerRelationData } from '@/types/npc';
import { StatRow } from './StatRow';
import { GlyphClose } from './glyphs';
import { Silhouette } from './Silhouette';
import {
  label,
  getEffect,
  repTier,
  reputationDisplay,
  charismaTier,
  formatRealm,
  activityLabel,
  PERSONALITY,
  DAO,
  DESTINY,
  HEART,
  ROLE,
  STAGE,
  UI_TABS,
  UI_ACTIONS
} from './npcLabels';
import { GLOBAL_ASSETS } from '@/config/globalAssets';
import api from '@/lib/api';
import './npcTheme.css';

export interface NpcProfilePanelProps {
  npc: NpcFullProfile;
  relation: NpcPlayerRelationData;
  familyData?: any;
  isOpen: boolean;
  onClose: () => void;
  onOpenDialogue?: () => void;
  onStartBattle?: (mode: 'npc_spar' | 'npc_duel') => Promise<void> | void;
  onAction?: (action: string, payload?: any) => Promise<void> | void;
}

type TabKey = 'stats' | 'skills' | 'artifact' | 'backstory' | 'family' | 'social' | 'taoist';

export function NpcProfilePanel({
  npc,
  relation,
  familyData,
  isOpen,
  onClose,
  onOpenDialogue,
  onStartBattle,
  onAction
}: NpcProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('stats');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmTimeout, setConfirmTimeout] = useState<NodeJS.Timeout | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [historyEvents, setHistoryEvents] = useState<Array<{ at: string; text: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load history when 'backstory' tab is opened
  useEffect(() => {
    if (activeTab === 'backstory' && npc?._id) {
      setHistoryLoading(true);
      api
        .get(`/npc/history/${npc._id}`)
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.history)) {
            setHistoryEvents(res.data.history);
          }
        })
        .catch(() => {})
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab, npc?._id]);

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

  if (!isOpen) return null;

  // Portrait image resolution
  const portraitUrl =
    (GLOBAL_ASSETS as any)?.npcs?.[npc.name] ||
    npc.portraitUrl ||
    '';

  // Morality alignment calculation
  const morality = Math.max(0, Math.min(100, npc.personality?.morality ?? 50));
  const righteousVal = Math.round(morality * 4); // 0..400 scale (e.g. 200)
  const demonicVal = Math.round((100 - morality) * 4); // e.g. 100
  const totalAlign = righteousVal + demonicVal || 1;
  const righteousPct = Math.round((righteousVal / totalAlign) * 100);
  const demonicPct = 100 - righteousPct;

  // Relation Stage script label
  const stKey = relation.stage || relation.affinityStage;
  const relationLabel = (stKey && STAGE[stKey]) ? STAGE[stKey].label : 'Orang Asing';

  // Action execution with 2-step confirmation for lethal/theft
  const handleActionClick = async (actionKey: string) => {
    if (actionKey === 'talk') {
      if (onOpenDialogue) onOpenDialogue();
      return;
    }

    if (actionKey === 'spar') {
      if (onStartBattle) {
        onStartBattle('npc_spar');
      }
      return;
    }

    // Dangerous actions require confirmation
    if (actionKey === 'theft' || actionKey === 'attack') {
      if (confirmAction !== actionKey) {
        setConfirmAction(actionKey);
        if (confirmTimeout) clearTimeout(confirmTimeout);
        const timer = setTimeout(() => setConfirmAction(null), 3000);
        setConfirmTimeout(timer);
        return;
      }
      // Confirmed on second click
      setConfirmAction(null);
      if (confirmTimeout) clearTimeout(confirmTimeout);

      if (actionKey === 'attack') {
        if (onStartBattle) {
          onStartBattle('npc_duel');
        }
        return;
      }

      if (actionKey === 'theft') {
        if (onAction) {
          await onAction('steal');
        }
        return;
      }
    }

    if (onAction) {
      await onAction(actionKey);
    } else {
      setActionFeedback(`Aksi ${actionKey} berhasil diproses.`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'stats', label: UI_TABS.stats },
    { key: 'skills', label: UI_TABS.skills },
    { key: 'artifact', label: UI_TABS.artifact },
    { key: 'backstory', label: UI_TABS.backstory },
    { key: 'family', label: UI_TABS.family },
    { key: 'social', label: UI_TABS.social },
    { key: 'taoist', label: UI_TABS.taoistMind }
  ];

  const panelContent = (
    <div
      data-npc-root="true"
      role="dialog"
      aria-modal="true"
      aria-label={`Profil ${npc.name}`}
      className="npc-ui fixed inset-0 w-screen h-screen overflow-y-auto flex flex-col items-center justify-start p-2 sm:p-6 select-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        backgroundColor: 'var(--npc-night, #0e0f12)',
        fontFamily: 'var(--npc-font, system-ui, sans-serif)'
      }}
    >
      {/* Top Gallery Strip (Cultivators in Region) */}
      <div className="w-full max-w-[1100px] mb-3 flex items-center justify-between border-b pb-2 pointer-events-none"
        style={{ borderColor: 'var(--npc-line, #2c2e34)' }}
      >
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          <div className="w-10 h-10 border flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: 'var(--npc-night-2, #17181c)',
              borderColor: 'var(--npc-parchment-edge, #8c8672)',
              color: 'var(--npc-cream, #e8e2d0)',
              borderRadius: 'var(--npc-radius, 2px)'
            }}
          >
            {npc.name.slice(0, 2)}
          </div>
          <span className="text-xs text-[color:var(--npc-mute,#9a9686)]">
            Pendekar di Wilayah Sekitar
          </span>
        </div>
      </div>

      {/* Main Container Card (Ink Parchment Frame) */}
      <div
        className="w-full max-w-[1100px] flex flex-col border shadow-lg relative"
        style={{
          backgroundColor: 'var(--npc-night, #0e0f12)',
          borderColor: 'var(--npc-line, #2c2e34)',
          borderRadius: 'var(--npc-radius, 2px)'
        }}
      >
        {/* Navigation Tab Header Bar */}
        <div
          className="w-full flex items-center justify-between border-b px-4 py-2 sticky top-0 z-30"
          style={{
            backgroundColor: 'var(--npc-night-2, #17181c)',
            borderColor: 'var(--npc-line, #2c2e34)'
          }}
        >
          {/* Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {tabs.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer border"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--npc-parchment, #d8d2c0)'
                      : 'var(--npc-night, #0e0f12)',
                    color: isActive
                      ? 'var(--npc-btn-ink, #1b1b1b)'
                      : 'var(--npc-cream, #e8e2d0)',
                    borderColor: isActive
                      ? 'var(--npc-parchment-edge, #8c8672)'
                      : 'var(--npc-line, #2c2e34)',
                    borderRadius: 'var(--npc-radius, 2px)'
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Tutup Panel"
            className="w-8 h-8 flex items-center justify-center border transition cursor-pointer ml-3 flex-shrink-0"
            style={{
              backgroundColor: 'var(--npc-night, #0e0f12)',
              borderColor: 'var(--npc-line, #2c2e34)',
              color: 'var(--npc-cream, #e8e2d0)',
              borderRadius: 'var(--npc-radius, 2px)'
            }}
          >
            <GlyphClose size={16} />
          </button>
        </div>

        {/* Content Body Grid */}
        <div className="w-full flex flex-col lg:flex-row p-4 sm:p-6 gap-6">
          {/* LEFT COLUMN: Actions & Standing Portrait */}
          <div className="w-full lg:w-[250px] flex flex-col items-center flex-shrink-0 border-b lg:border-b-0 lg:border-r pb-6 lg:pb-0 lg:pr-6"
            style={{ borderColor: 'var(--npc-line, #2c2e34)' }}
          >
            {/* Action Buttons Grid (Two Columns) */}
            <div className="w-full grid grid-cols-2 gap-1.5 mb-5">
              <button
                onClick={() => handleActionClick('talk')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.chat}
              </button>
              <button
                onClick={() => handleActionClick('bond')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.bond}
              </button>
              <button
                onClick={() => handleActionClick('partner')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.partner}
              </button>
              <button
                onClick={() => handleActionClick('mentorship')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.mentorship}
              </button>
              <button
                onClick={() => handleActionClick('request_favor')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.request}
              </button>
              <button
                onClick={() => handleActionClick('gift')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.gift}
              </button>
              <button
                onClick={() => handleActionClick('spar')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.spar}
              </button>
              <button
                onClick={() => handleActionClick('dual_cultivation')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.dual_cultivation}
              </button>
              <button
                onClick={() => handleActionClick('debate')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.debate}
              </button>
              <button
                onClick={() => handleActionClick('invite')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.invite}
              </button>
              <button
                disabled
                className="h-[30px] px-2 text-xs font-medium border transition flex items-center justify-center opacity-60 cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--npc-btn-off, #3c3f45)',
                  color: 'var(--npc-btn-off-ink, #a6a9ae)',
                  borderColor: 'var(--npc-line, #2c2e34)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.recruitment}
              </button>
              <button
                onClick={() => handleActionClick('mark')}
                className="h-[30px] px-2 text-xs font-medium border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-btn, #cfcfcf)',
                  color: 'var(--npc-btn-ink, #1b1b1b)',
                  borderColor: 'var(--npc-parchment-edge, #8c8672)',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {UI_ACTIONS.mark}
              </button>

              {/* Red Seal Actions: Theft & Attack */}
              <button
                onClick={() => handleActionClick('theft')}
                className="h-[30px] px-2 text-xs font-bold border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-seal, #a3231f)',
                  color: 'var(--npc-cream, #e8e2d0)',
                  borderColor: '#c43a36',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {confirmAction === 'theft' ? 'Yakin?' : UI_ACTIONS.theft}
              </button>
              <button
                onClick={() => handleActionClick('attack')}
                className="h-[30px] px-2 text-xs font-bold border transition cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--npc-seal, #a3231f)',
                  color: 'var(--npc-cream, #e8e2d0)',
                  borderColor: '#c43a36',
                  borderRadius: 'var(--npc-radius, 2px)'
                }}
              >
                {confirmAction === 'attack' ? 'Yakin?' : UI_ACTIONS.attack}
              </button>
            </div>

            {/* Standing Portrait with Calligraphic Stage Label */}
            <div className="relative w-full flex flex-col items-center justify-end">
              {/* Calligraphic Script Stage Label above head */}
              <div
                className="mb-1 text-2xl italic tracking-wide text-center"
                style={{
                  color: 'var(--npc-cream, #e8e2d0)',
                  fontFamily: 'var(--npc-font-display, Georgia, serif)'
                }}
              >
                {relationLabel}
              </div>

              {/* Portrait Figure */}
              <div
                className="relative w-full max-h-[300px] flex items-end justify-center overflow-hidden"
                style={{
                  maskImage:
                    'linear-gradient(to top, transparent 0%, black 18%, black 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to top, transparent 0%, black 18%, black 100%)'
                }}
              >
                {portraitUrl ? (
                  <img
                    src={portraitUrl}
                    alt={npc.name}
                    className="max-h-[300px] w-auto object-contain select-none pointer-events-none"
                  />
                ) : (
                  <Silhouette gender={npc.gender} className="h-[260px] w-auto" />
                )}
              </div>

              {/* Dual-Tone Alignment Bar: Righteous vs Demonic */}
              <div className="w-full mt-2 flex flex-col gap-1">
                <div className="w-full h-2.5 flex overflow-hidden border"
                  style={{
                    borderColor: 'var(--npc-line, #2c2e34)',
                    borderRadius: 'var(--npc-radius, 2px)'
                  }}
                >
                  <div
                    style={{
                      width: `${righteousPct}%`,
                      backgroundColor: 'var(--npc-jade, #3f7f6e)'
                    }}
                  />
                  <div
                    style={{
                      width: `${demonicPct}%`,
                      backgroundColor: 'var(--npc-seal, #a3231f)'
                    }}
                  />
                </div>
                <div className="w-full flex justify-between text-[11px] tabular-nums text-[color:var(--npc-mute,#9a9686)]">
                  <span>Kebajikan {righteousVal}</span>
                  <span>Hawa Iblis {demonicVal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Identity Header & Tab Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Identity Details Header */}
            <div className="w-full border-b pb-4 mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-[12.5px]"
              style={{ borderColor: 'var(--npc-line, #2c2e34)' }}
            >
              <div>
                <StatRow label="Nama:" value={npc.name} />
                <StatRow label="Ras:" value={npc.race === 'demon' ? 'Siluman' : 'Manusia'} />
                <StatRow label="Jenis Kelamin:" value={npc.gender === 'female' ? 'Wanita' : 'Pria'} />
                <StatRow label="Karisma:" value={charismaTier(npc.attributes?.charisma || 85)} />
                <StatRow label="Minat:" value={npc.interests?.join(', ') || 'Bambu, Seruling Xiao'} />
              </div>
              <div>
                <StatRow label="Sekte:" value={npc.sectName || 'Tanpa Sekte'} />
                <StatRow label="Jabatan:" value={label(ROLE, npc.social?.role) !== '(tak dikenal)' ? label(ROLE, npc.social?.role) : (npc.social?.sectRank || 'Tetua')} />
                <StatRow label="Ranah:" value={formatRealm(npc.cultivation?.realmIndex, npc.cultivation?.stage) || formatRealm(npc.cultivation?.realmName) || 'Jiwa Baru Lahir Tahap Akhir'} />
                <StatRow label="Reputasi:" value={reputationDisplay(npc.reputation || 24146)} />
              </div>
              <div>
                <StatRow label="Sifat Batin:" value={label(PERSONALITY, npc.personality?.primary)} />
                <StatRow label="Sifat Luar:" value={label(PERSONALITY, npc.personality?.secondary)} />

                {/* Destiny Badges */}
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[11px] text-[color:var(--npc-mute,#9a9686)]">Takdir (Bawaan):</span>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{
                        backgroundColor: 'var(--npc-chip-blue, #3b4fa8)',
                        borderRadius: 'var(--npc-radius, 2px)'
                      }}
                    >
                      Dua Bakat Kembar
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{
                        backgroundColor: 'var(--npc-chip-grey, #565960)',
                        borderRadius: 'var(--npc-radius, 2px)'
                      }}
                    >
                      Kacang Aniseed Roh
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{
                        backgroundColor: 'var(--npc-chip-orange, #c97a2b)',
                        borderRadius: 'var(--npc-radius, 2px)'
                      }}
                    >
                      Cerdas Bersahaja
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[11px] text-[color:var(--npc-mute,#9a9686)]">Takdir (Tempaan):</span>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 text-[11px] font-medium border text-[color:var(--npc-cream,#e8e2d0)]"
                      style={{
                        borderColor: 'var(--npc-line, #2c2e34)',
                        backgroundColor: 'var(--npc-night-2, #17181c)',
                        borderRadius: 'var(--npc-radius, 2px)'
                      }}
                    >
                      Leluasa Tanpa Rintangan
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB CONTENT: STATS (The Five-Pillar Framework) */}
            {activeTab === 'stats' && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-5 gap-y-4">
                {/* 1. General Attributes */}
                <div className="flex flex-col">
                  <div className="text-center font-semibold text-xs border-b pb-1 mb-2 tracking-wide uppercase"
                    style={{
                      color: 'var(--npc-cream, #e8e2d0)',
                      borderColor: 'var(--npc-line, #2c2e34)'
                    }}
                  >
                    Dasar
                  </div>
                  <StatRow label="Aktivitas" value={activityLabel((npc as any).activityState || (npc as any).schedule?.activityState, (npc as any).journeyTo || (npc as any).schedule?.journeyTo)} />
                  <StatRow label="Usia Hidup" value={`${npc.lifespan?.currentAge || 380}/${npc.lifespan?.maxAge || 810}`} />
                  <StatRow label="Suasana Hati" value={`${Math.floor(npc.attributes?.mood ?? 70)}/100`} />
                  <StatRow label="Kesehatan" value={`${Math.floor(npc.attributes?.hp ?? 100)}/${Math.floor(npc.attributes?.maxHp ?? 100)}`} />
                  <StatRow label="Stamina" value={`${Math.floor(npc.attributes?.stamina ?? 33)}/80`} />
                  <StatRow label="Vitalitas" value={`${Math.floor(npc.attributes?.vitality ?? 9863)}/${Math.floor(npc.attributes?.maxVitality ?? 11435)}`} />
                  <StatRow label="Energi Qi" value={`${Math.floor(npc.attributes?.energy ?? 1782)}/${Math.floor(npc.attributes?.maxEnergy ?? 1985)}`} />
                  <StatRow label="Fokus Batin" value={`${Math.floor(npc.attributes?.focus ?? 1866)}/${Math.floor(npc.attributes?.maxFocus ?? 2137)}`} />
                  <StatRow label="Keberuntungan" value={Math.floor(npc.attributes?.luck ?? 100)} />
                  <StatRow label="Wawasan Dao" value={Math.floor(npc.attributes?.insight ?? 150)} />
                </div>

                {/* 2. Combat Attributes */}
                <div className="flex flex-col">
                  <div className="text-center font-semibold text-xs border-b pb-1 mb-2 tracking-wide uppercase"
                    style={{
                      color: 'var(--npc-cream, #e8e2d0)',
                      borderColor: 'var(--npc-line, #2c2e34)'
                    }}
                  >
                    Pertarungan
                  </div>
                  <StatRow label="Serangan (ATK)" value={Math.floor(npc.attributes?.attack ?? 586)} />
                  <StatRow label="Pertahanan (DEF)" value={Math.floor(npc.attributes?.defense ?? 355)} />
                  <StatRow label="Kecepatan Jelajah" value={Math.floor(npc.attributes?.travelSpeed ?? 1300)} />
                  <StatRow label="Ketahanan Beladiri" value={Math.floor(npc.attributes?.martialRes ?? 116)} />
                  <StatRow label="Ketahanan Roh" value={Math.floor(npc.attributes?.spiritualRes ?? 135)} />
                  <StatRow label="Serangan Fatal (CRIT)" value={Math.floor(npc.attributes?.critRate ?? 666)} />
                  <StatRow label="Daya Tahan Fatal" value={Math.floor(npc.attributes?.critRes ?? 587)} />
                  <StatRow label="Kelincahan" value={Math.floor(npc.attributes?.agility ?? 406)} />
                  <StatRow label="Pengali Fatal" value={`${Math.floor(npc.attributes?.critDmg ?? 522)}%`} />
                  <StatRow label="Peredam Fatal" value={`${Math.floor(npc.attributes?.critDr ?? 329)}%`} />
                </div>

                {/* 3. Martial Arts Attributes */}
                <div className="flex flex-col">
                  <div className="text-center font-semibold text-xs border-b pb-1 mb-2 tracking-wide uppercase"
                    style={{
                      color: 'var(--npc-cream, #e8e2d0)',
                      borderColor: 'var(--npc-line, #2c2e34)'
                    }}
                  >
                    Ilmu Beladiri
                  </div>
                  <StatRow label="Golok" value={Math.floor(npc.attributes?.kungfuSkills?.blade ?? 34)} />
                  <StatRow label="Tombak" value={Math.floor(npc.attributes?.kungfuSkills?.spear ?? 172)} />
                  <StatRow label="Pedang" value={Math.floor(npc.attributes?.kungfuSkills?.sword ?? 210)} />
                  <StatRow label="Tinju" value={Math.floor(npc.attributes?.kungfuSkills?.fist ?? 53)} />
                  <StatRow label="Telapak" value={Math.floor(npc.attributes?.kungfuSkills?.palm ?? 297)} />
                  <StatRow label="Totokan Jari" value={Math.floor(npc.attributes?.kungfuSkills?.finger ?? 157)} />
                </div>

                {/* 4. Spiritual Roots */}
                <div className="flex flex-col">
                  <div className="text-center font-semibold text-xs border-b pb-1 mb-2 tracking-wide uppercase"
                    style={{
                      color: 'var(--npc-cream, #e8e2d0)',
                      borderColor: 'var(--npc-line, #2c2e34)'
                    }}
                  >
                    Akar Spiritual
                  </div>
                  <StatRow label="Api" value={Math.floor(npc.attributes?.roots?.fire ?? 311)} />
                  <StatRow label="Air" value={Math.floor(npc.attributes?.roots?.water ?? 108)} />
                  <StatRow label="Petir" value={Math.floor(npc.attributes?.roots?.lightning ?? 76)} />
                  <StatRow label="Angin" value={Math.floor(npc.attributes?.roots?.wind ?? 247)} />
                  <StatRow label="Tanah" value={Math.floor(npc.attributes?.roots?.earth ?? 117)} />
                  <StatRow label="Kayu" value={Math.floor(npc.attributes?.roots?.wood ?? 91)} />
                </div>

                {/* 5. Artisanship & Professions */}
                <div className="flex flex-col">
                  <div className="text-center font-semibold text-xs border-b pb-1 mb-2 tracking-wide uppercase"
                    style={{
                      color: 'var(--npc-cream, #e8e2d0)',
                      borderColor: 'var(--npc-line, #2c2e34)'
                    }}
                  >
                    Kemahiran
                  </div>
                  <StatRow label="Alkimia" value={Math.floor(npc.attributes?.professions?.alchemy ?? 173)} />
                  <StatRow label="Tempa" value={Math.floor(npc.attributes?.professions?.smithing ?? 37)} />
                  <StatRow label="Kertas Jimat" value={Math.floor(npc.attributes?.professions?.talismans ?? 26)} />
                  <StatRow label="Herba" value={Math.floor(npc.attributes?.professions?.farming ?? 60)} />
                  <StatRow label="Tambang" value={Math.floor(npc.attributes?.professions?.mining ?? 20)} />
                </div>
              </div>
            )}

            {/* TAB CONTENT: SKILLS */}
            {activeTab === 'skills' && (
              <div className="w-full flex flex-col gap-2 py-2">
                <span className="text-xs font-semibold text-[color:var(--npc-cream,#e8e2d0)]">
                  Jurus & Manual Beladiri yang Dikuasai:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className="p-3 border"
                    style={{
                      backgroundColor: 'var(--npc-night-2, #17181c)',
                      borderColor: 'var(--npc-line, #2c2e34)',
                      borderRadius: 'var(--npc-radius, 2px)'
                    }}
                  >
                    <div className="text-xs font-bold text-[color:var(--npc-cream,#e8e2d0)]">
                      Pedang Angin Senja (Tingkat 4)
                    </div>
                    <div className="text-[11px] text-[color:var(--npc-mute,#9a9686)] mt-1">
                      Tebasan cepat memotong aliran angin lawan, meningkatkan peluang serangan fatal.
                    </div>
                  </div>
                  <div className="p-3 border"
                    style={{
                      backgroundColor: 'var(--npc-night-2, #17181c)',
                      borderColor: 'var(--npc-line, #2c2e34)',
                      borderRadius: 'var(--npc-radius, 2px)'
                    }}
                  >
                    <div className="text-xs font-bold text-[color:var(--npc-cream,#e8e2d0)]">
                      Langkah Awan Mengambang
                    </div>
                    <div className="text-[11px] text-[color:var(--npc-mute,#9a9686)] mt-1">
                      Gerakan meringankan tubuh melintasi jurang dan meningkatkan kelincahan menghindar.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: ARTIFACT */}
            {activeTab === 'artifact' && (
              <div className="w-full flex flex-col gap-2 py-2">
                <span className="text-xs font-semibold text-[color:var(--npc-cream,#e8e2d0)]">
                  Pusaka & Harta Simpanan:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {Array.isArray(npc.inventory) && npc.inventory.length > 0 ? (
                    npc.inventory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 border flex items-center justify-between"
                        style={{
                          backgroundColor: 'var(--npc-night-2, #17181c)',
                          borderColor: 'var(--npc-line, #2c2e34)',
                          borderRadius: 'var(--npc-radius, 2px)'
                        }}
                      >
                        <span className="text-xs text-[color:var(--npc-cream,#e8e2d0)] font-medium">
                          {item.name || 'Barang Berharga'}
                        </span>
                        <span className="text-xs tabular-nums text-[color:var(--npc-mute,#9a9686)]">
                          x{item.quantity || 1}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-[color:var(--npc-mute,#9a9686)] p-3">
                      Tidak membawa pusaka pusaka luar biasa.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: BACKSTORY (Riwayat Hidup) */}
            {activeTab === 'backstory' && (
              <div className="w-full flex flex-col gap-2 py-2">
                <span className="text-xs font-semibold text-[color:var(--npc-cream,#e8e2d0)]">
                  Catatan Riwayat Hidup Jianghu:
                </span>
                {historyLoading ? (
                  <div className="text-xs text-[color:var(--npc-mute,#9a9686)] p-3">
                    Memuat catatan sejarah...
                  </div>
                ) : historyEvents.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2 mt-2">
                    {historyEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 border text-xs leading-relaxed"
                        style={{
                          backgroundColor: 'var(--npc-night-2, #17181c)',
                          borderColor: 'var(--npc-line, #2c2e34)',
                          borderRadius: 'var(--npc-radius, 2px)',
                          color: 'var(--npc-cream, #e8e2d0)'
                        }}
                      >
                        <div className="text-[11px] text-[color:var(--npc-mute,#9a9686)] mb-0.5">
                          {new Date(evt.at).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        {evt.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[color:var(--npc-mute,#9a9686)] p-3">
                    Belum ada catatan peristiwa besar tercatat.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: FAMILY */}
            {activeTab === 'family' && (
              <div className="w-full flex flex-col gap-2 py-2">
                <span className="text-xs font-semibold text-[color:var(--npc-cream,#e8e2d0)]">
                  Silsilah Keluarga & Kerabat:
                </span>
                {familyData && Array.isArray(familyData.members) && familyData.members.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {familyData.members.map((m: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 border flex flex-col"
                        style={{
                          backgroundColor: 'var(--npc-night-2, #17181c)',
                          borderColor: 'var(--npc-line, #2c2e34)',
                          borderRadius: 'var(--npc-radius, 2px)'
                        }}
                      >
                        <span className="text-xs font-bold text-[color:var(--npc-cream,#e8e2d0)]">
                          {m.npcId?.name || 'Kerabat Fana'}
                        </span>
                        <div className="text-[11px] text-[color:var(--npc-mute,#9a9686)] mt-1 flex justify-between">
                          <span>Hubungan: {m.role || 'Kerabat'}</span>
                          <span>{m.npcId?.vitalStatus?.isAlive ? 'Hidup' : 'Wafat'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[color:var(--npc-mute,#9a9686)] p-3">
                    Tidak memiliki klan keluarga atau kerabat tercatat di wilayah ini.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SOCIAL */}
            {activeTab === 'social' && (
              <div className="w-full flex flex-col gap-2 py-2">
                <span className="text-xs font-semibold text-[color:var(--npc-cream,#e8e2d0)]">
                  Jejaring Hubungan Persilatan:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className="p-3 border"
                    style={{
                      backgroundColor: 'var(--npc-night-2, #17181c)',
                      borderColor: 'var(--npc-line, #2c2e34)',
                      borderRadius: 'var(--npc-radius, 2px)'
                    }}
                  >
                    <StatRow label="Tahap Hubungan" value={relationLabel} />
                    <StatRow label="Kedekatan (Afinitas)" value={`${relation.affinity}/100`} />
                    <StatRow label="Tingkat Kepercayaan" value={relation.specialStatus?.isMaster ? 'Guru' : relation.specialStatus?.isDaoCompanion ? 'Pasangan Dao' : 'Biasa'} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TAOIST MIND */}
            {activeTab === 'taoist' && (
              <div className="w-full flex flex-col gap-2 py-2">
                <span className="text-xs font-semibold text-[color:var(--npc-cream,#e8e2d0)]">
                  Pemahaman Hati Dao & Batiniah:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className="p-3 border flex flex-col gap-1"
                    style={{
                      backgroundColor: 'var(--npc-night-2, #17181c)',
                      borderColor: 'var(--npc-line, #2c2e34)',
                      borderRadius: 'var(--npc-radius, 2px)'
                    }}
                  >
                    <div className="text-xs font-bold text-[color:var(--npc-cream,#e8e2d0)]">
                      Sifat Batin: {label(PERSONALITY, npc.personality?.primary)}
                    </div>
                    <div className="text-[11px] text-[color:var(--npc-mute,#9a9686)]">
                      {getEffect(PERSONALITY, npc.personality?.primary)}
                    </div>
                  </div>
                  <div className="p-3 border flex flex-col gap-1"
                    style={{
                      backgroundColor: 'var(--npc-night-2, #17181c)',
                      borderColor: 'var(--npc-line, #2c2e34)',
                      borderRadius: 'var(--npc-radius, 2px)'
                    }}
                  >
                    <div className="text-xs font-bold text-[color:var(--npc-cream,#e8e2d0)]">
                      Kondisi Jiwa: {label(HEART, npc.dao?.heartState || 'serene')}
                    </div>
                    <div className="text-[11px] text-[color:var(--npc-mute,#9a9686)]">
                      {getEffect(HEART, npc.dao?.heartState || 'serene')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Feedback Notification Bar */}
        {actionFeedback && (
          <div
            className="w-full px-4 py-2 border-t text-xs text-center font-medium"
            style={{
              backgroundColor: 'var(--npc-night-2, #17181c)',
              borderColor: 'var(--npc-line, #2c2e34)',
              color: 'var(--npc-cream, #e8e2d0)'
            }}
          >
            {actionFeedback}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(panelContent, document.body)
    : panelContent;
}
