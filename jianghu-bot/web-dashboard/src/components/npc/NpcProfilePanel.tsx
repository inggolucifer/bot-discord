'use client';

import React, { useState } from 'react';
import { NpcFullProfile, NpcPlayerRelationData } from '@/types/npc';

interface NpcProfilePanelProps {
  npc: NpcFullProfile;
  relation: NpcPlayerRelationData;
  familyData?: any;
  isOpen: boolean;
  onClose: () => void;
  onOpenDialogue?: () => void;
  onStartBattle?: (mode: 'npc_spar' | 'npc_duel') => Promise<void>;
  onAction?: (action: string, payload?: any) => Promise<void>;
}

type TabKey = 'stats' | 'skills' | 'artifact' | 'backstory' | 'family' | 'social' | 'taoist';

export const NpcProfilePanel: React.FC<NpcProfilePanelProps> = ({
  npc,
  relation,
  familyData,
  isOpen,
  onClose,
  onOpenDialogue,
  onStartBattle,
  onAction
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('stats');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const getTierBadge = (tier: string = 'gray') => {
    switch (tier.toLowerCase()) {
      case 'red': return 'text-red-300 border-red-500/60 bg-red-950/80';
      case 'gold':
      case 'orange': return 'text-amber-200 border-amber-500/80 bg-amber-800/90';
      case 'purple': return 'text-purple-300 border-purple-500/70 bg-purple-900/80';
      case 'blue': return 'text-blue-200 border-blue-500/70 bg-blue-900/80';
      case 'green': return 'text-emerald-300 border-emerald-500/70 bg-emerald-900/80';
      default: return 'text-stone-300 border-stone-600/70 bg-stone-800/80';
    }
  };

  const getRelationScriptText = () => {
    if (relation.specialStatus.isDaoCompanion) return 'Dao Companion';
    if (relation.specialStatus.isSwornSibling) return 'Sworn Sibling';
    if (relation.specialStatus.isMaster) return 'Master';
    if (relation.specialStatus.isApprentice) return 'Disciple';

    const aff = relation.affinity || 0;
    if (aff >= 80) return 'Close Friend';
    if (aff >= 50) return 'Friend';
    if (aff >= 20) return 'Acquaintance';
    if (aff <= -60) return 'Nemesis';
    if (aff <= -20) return 'Hateful';
    return 'Stranger';
  };

  const morality = Math.max(0, Math.min(100, npc.personality?.morality ?? 50));
  const righteousVal = Math.round(morality * 4); // 0..400 scale
  const demonicVal = Math.round((100 - morality) * 4);
  const totalAlign = righteousVal + demonicVal || 100;
  const righteousPct = Math.round((righteousVal / totalAlign) * 100);
  const demonicPct = 100 - righteousPct;

  const handleActionClick = async (actionKey: string) => {
    if (actionKey === 'talk') {
      if (onOpenDialogue) onOpenDialogue();
      return;
    }
    if (actionKey === 'spar') {
      if (onStartBattle) {
        await onStartBattle('npc_spar');
      } else {
        setActionFeedback(`Memulai uji tanding dengan ${npc.name}...`);
      }
      return;
    }
    if (actionKey === 'attack') {
      if (onStartBattle) {
        await onStartBattle('npc_duel');
      } else {
        setActionFeedback(`[PERINGATAN DENDAM] Menyerang ${npc.name} secara mematikan!`);
      }
      return;
    }
    if (onAction) {
      await onAction(actionKey);
    } else {
      setActionFeedback(`Aksi [${actionKey.toUpperCase()}] berhasil dijalankan terhadap ${npc.name}.`);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'stats', label: 'Stats' },
    { key: 'skills', label: 'Skills' },
    { key: 'artifact', label: 'Artifact' },
    { key: 'backstory', label: 'Backstory' },
    { key: 'family', label: 'Family' },
    { key: 'social', label: 'Social' },
    { key: 'taoist', label: 'Taoist Mind' }
  ];

  return (
    <div className="fixed inset-0 z-[99995] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-serif select-none">
      
      {/* MASTER WUXIA PANEL CONTAINER */}
      <div className="w-full max-w-6xl max-h-[94vh] bg-[#0c1017]/95 border-2 border-[#4a3525] rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden relative">
        
        {/* Brass Wuxia Corner Ornaments */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500/70 pointer-events-none z-30" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-500/70 pointer-events-none z-30" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-500/70 pointer-events-none z-30" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500/70 pointer-events-none z-30" />

        {/* TOP ROW: 7 RECTANGULAR TABS & GOLDEN CIRCULAR CLOSE BUTTON */}
        <div className="px-3 sm:px-6 py-2.5 bg-gradient-to-r from-[#17110d] via-[#241710] to-[#17110d] border-b border-[#3d2b1f] flex items-center justify-between gap-2 shrink-0 z-20">
          
          <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto text-xs py-0.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 sm:px-4 py-1.5 rounded-sm text-xs transition uppercase tracking-wider ${
                    isActive
                      ? 'bg-gradient-to-b from-[#e8dfcf] to-[#c8bcab] text-[#1a1410] font-bold border border-[#78644e] shadow-[0_0_12px_rgba(243,229,171,0.25)]'
                      : 'bg-gradient-to-b from-[#241c16] to-[#14100c] text-[#9c8e7e] border border-[#3c2e22] hover:text-[#dfd3c3] hover:border-[#5c4735]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Golden Circular (X) Exit Button */}
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#caa165] to-[#734f21] border border-[#f3e5ab] text-[#1c1209] hover:text-white hover:brightness-110 flex items-center justify-center font-bold text-sm shadow-[0_0_8px_rgba(202,161,101,0.5)] shrink-0 transition"
            title="Tutup (Esc)"
          >
            ✕
          </button>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex flex-col lg:flex-row p-3 sm:p-5 gap-4 overflow-y-auto">
          
          {/* ============================================================ */}
          {/* LEFT FLANK: STANDING ART, ALIGNMENT & FLANKING ACTIONS       */}
          {/* ============================================================ */}
          <div className="w-full lg:w-[280px] shrink-0 flex flex-col items-center border-b lg:border-b-0 lg:border-r border-[#2d2218] pb-4 lg:pb-0 lg:pr-4">
            
            {/* Top Row: Inspect Magnifier & Script Status */}
            <div className="w-full flex items-center justify-between mb-1 px-1">
              <span className="text-stone-400 text-sm cursor-pointer hover:text-amber-300" title="Detail Penampilan">🔍</span>
              <span className="text-2xl text-amber-100 tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] italic font-serif">
                {getRelationScriptText()}
              </span>
              <span className="w-4" />
            </div>

            {/* Standing Art + Flanking Action Buttons */}
            <div className="relative w-full flex justify-between items-center my-1">
              
              {/* Left Flank: 10 Vertical Stacked Action Buttons */}
              <div className="flex flex-col space-y-1 z-20 w-[72px]">
                <button
                  onClick={() => handleActionClick('talk')}
                  className="bg-gradient-to-b from-[#2a221b] to-[#171410] border border-[#4a3828] hover:border-[#8a6a48] text-[#c4b5a2] hover:text-[#f5ece0] text-[11px] py-1 px-1 text-center font-medium rounded-sm transition shadow"
                >
                  Talk
                </button>
                <button
                  onClick={() => handleActionClick('bond')}
                  disabled
                  className="bg-[#171410] border border-[#33251a] text-[#6b5c4f] text-[11px] py-1 px-1 text-center font-medium rounded-sm opacity-50 cursor-not-allowed"
                >
                  Bond
                </button>
                <button
                  onClick={() => handleActionClick('partner')}
                  disabled
                  className="bg-[#171410] border border-[#33251a] text-[#6b5c4f] text-[11px] py-1 px-1 text-center font-medium rounded-sm opacity-50 cursor-not-allowed"
                >
                  Partner
                </button>
                <button
                  onClick={() => handleActionClick('mentorship')}
                  disabled
                  className="bg-[#171410] border border-[#33251a] text-[#6b5c4f] text-[11px] py-1 px-1 text-center font-medium rounded-sm opacity-50 cursor-not-allowed"
                >
                  Mentorship
                </button>
                <button
                  onClick={() => handleActionClick('request')}
                  disabled
                  className="bg-[#171410] border border-[#33251a] text-[#6b5c4f] text-[11px] py-1 px-1 text-center font-medium rounded-sm opacity-50 cursor-not-allowed"
                >
                  Request
                </button>
                <button
                  onClick={() => handleActionClick('gift')}
                  className="bg-gradient-to-b from-[#2a221b] to-[#171410] border border-[#4a3828] hover:border-[#8a6a48] text-[#c4b5a2] hover:text-[#f5ece0] text-[11px] py-1 px-1 text-center font-medium rounded-sm transition shadow"
                >
                  Gift
                </button>
                <button
                  onClick={() => handleActionClick('spar')}
                  className="bg-gradient-to-b from-[#2a221b] to-[#171410] border border-[#4a3828] hover:border-[#8a6a48] text-[#c4b5a2] hover:text-[#f5ece0] text-[11px] py-1 px-1 text-center font-medium rounded-sm transition shadow"
                >
                  Spar
                </button>
                <button
                  onClick={() => handleActionClick('dual_cult')}
                  disabled
                  className="bg-[#171410] border border-[#33251a] text-[#6b5c4f] text-[11px] py-1 px-1 text-center font-medium rounded-sm opacity-50 cursor-not-allowed"
                >
                  Dual Cult
                </button>
                <button
                  onClick={() => handleActionClick('debate')}
                  className="bg-gradient-to-b from-[#2a221b] to-[#171410] border border-[#4a3828] hover:border-[#8a6a48] text-[#c4b5a2] hover:text-[#f5ece0] text-[11px] py-1 px-1 text-center font-medium rounded-sm transition shadow"
                >
                  Debate
                </button>
                <button
                  onClick={() => handleActionClick('invite')}
                  disabled
                  className="bg-[#171410] border border-[#33251a] text-[#6b5c4f] text-[11px] py-1 px-1 text-center font-medium rounded-sm opacity-50 cursor-not-allowed"
                >
                  Invite
                </button>
              </div>

              {/* Center: Standing Full-Body Art with Soft Bottom Fade */}
              <div className="relative flex-1 h-[340px] flex items-center justify-center overflow-hidden px-1">
                {npc.imageUrl ? (
                  <img
                    src={npc.imageUrl}
                    alt={npc.name}
                    className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]"
                    style={{
                      maskImage: 'linear-gradient(to bottom, black 72%, transparent 98%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 98%)'
                    }}
                  />
                ) : (
                  <svg className="w-full h-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]" viewBox="0 0 200 340">
                    <defs>
                      <linearGradient id="robeGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={npc.gender === 'female' ? '#40916c' : '#78350f'} />
                        <stop offset="60%" stopColor={npc.gender === 'female' ? '#2d6a4f' : '#451a03'} />
                        <stop offset="100%" stopColor="#1b120c" />
                      </linearGradient>
                      <linearGradient id="innerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d8f3dc" />
                        <stop offset="100%" stopColor="#95d5b2" />
                      </linearGradient>
                    </defs>
                    {/* Back Hair */}
                    <path d="M75,70 Q55,150 68,230 Q100,240 132,230 Q145,150 125,70 Z" fill="#18181b" />
                    {/* Robe Base */}
                    <path d="M72,130 L100,122 L128,130 L152,320 L48,320 Z" fill="url(#robeGrad)" />
                    {/* Inner Cloth */}
                    <path d="M85,128 L100,165 L115,128 L130,320 L70,320 Z" fill="url(#innerGrad)" opacity="0.85" />
                    {/* Slit Reveal */}
                    <path d="M68,210 Q62,260 66,320 L86,320 Q84,250 82,210 Z" fill="#fbe9db" />
                    {/* Torso & Skin */}
                    <path d="M82,105 Q100,120 118,105 L116,130 Q100,138 84,130 Z" fill="#fbe9db" />
                    {/* Sleeves */}
                    <path d="M75,130 Q40,165 42,215 Q65,225 78,180 Z" fill="url(#robeGrad)" />
                    <path d="M125,130 Q160,165 158,215 Q135,225 122,180 Z" fill="url(#robeGrad)" />
                    {/* Sash */}
                    <rect x="76" y="166" width="48" height="10" fill="#f4f1de" rx="2" />
                    <rect x="94" y="164" width="12" height="14" fill="#d4af37" rx="1" />
                    {/* Head */}
                    <ellipse cx="100" cy="78" rx="18" ry="22" fill="#fbe9db" />
                    <ellipse cx="100" cy="42" rx="14" ry="12" fill="#18181b" />
                    <line x1="72" y1="46" x2="128" y2="38" stroke="#f3e5ab" strokeWidth="2.5" />
                    <circle cx="128" cy="38" r="3.5" fill="#52b788" />
                    <ellipse cx="94" cy="77" rx="2" ry="1.5" fill="#1b120c" />
                    <ellipse cx="106" cy="77" rx="2" ry="1.5" fill="#1b120c" />
                    <path d="M96,88 Q100,91 104,88" stroke="#be123c" strokeWidth="1.8" fill="none" />
                  </svg>
                )}
              </div>

              {/* Right Flank: 4 Action Buttons */}
              <div className="flex flex-col space-y-1.5 z-20 w-[72px] self-end mb-2">
                <button
                  onClick={() => handleActionClick('recruit')}
                  disabled
                  className="bg-[#171410] border border-[#33251a] text-[#6b5c4f] text-[11px] py-1 px-1 text-center font-medium rounded-sm opacity-50 cursor-not-allowed"
                >
                  Recruitment
                </button>
                <button
                  onClick={() => handleActionClick('mark')}
                  className="bg-gradient-to-b from-[#2a221b] to-[#171410] border border-[#4a3828] hover:border-[#8a6a48] text-[#c4b5a2] hover:text-[#f5ece0] text-[11px] py-1 px-1 text-center font-medium rounded-sm transition shadow"
                >
                  Mark
                </button>
                <button
                  onClick={() => handleActionClick('theft')}
                  className="bg-gradient-to-b from-[#7a2222] to-[#420f0f] border border-[#aa3333] hover:border-[#dd4444] text-[#ffdada] hover:text-white text-[11px] py-1 px-1 text-center font-bold rounded-sm tracking-wide transition shadow"
                >
                  Theft
                </button>
                <button
                  onClick={() => handleActionClick('attack')}
                  className="bg-gradient-to-b from-[#7a2222] to-[#420f0f] border border-[#aa3333] hover:border-[#dd4444] text-[#ffdada] hover:text-white text-[11px] py-1 px-1 text-center font-bold rounded-sm tracking-wide transition shadow"
                >
                  Attack
                </button>
              </div>
            </div>

            {/* Alignment Bar (Righteous vs Demonic) Directly Under Standing Art */}
            <div className="w-full mt-2">
              <div className="flex justify-between text-[11px] font-bold mb-0.5">
                <span className="text-amber-300">Righteous {righteousVal}</span>
                <span className="text-rose-400">Demonic {demonicVal}</span>
              </div>
              <div className="w-full h-3.5 bg-stone-950 border border-amber-600/80 rounded-sm overflow-hidden flex shadow-inner">
                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: `${righteousPct}%` }} />
                <div className="h-full bg-gradient-to-r from-rose-800 to-rose-600" style={{ width: `${demonicPct}%` }} />
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CENTER & RIGHT: MASTER ATTRIBUTES & PROFILES                 */}
          {/* ============================================================ */}
          <div className="flex-1 flex flex-col justify-between">
            
            {/* TAB CONTENT */}
            <div className="flex-1 flex flex-col">
              
              {/* TAB 1: STATS */}
              {activeTab === 'stats' && (
                <div className="space-y-4">
                  {/* Top 4-Column Identity Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-b border-[#30241b] pb-4">
                    {/* Col 1 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-stone-400">Name:</span>
                        <span className="font-bold text-amber-100 text-sm">{npc.name}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-stone-400">Race:</span>
                        <span className="text-stone-200">Human</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-stone-400">Sex:</span>
                        <span className="text-stone-200 capitalize">{npc.gender}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-stone-400">Charisma:</span>
                        <span className="text-amber-300 font-bold">Divine</span>
                      </div>
                      <div className="text-[11px] text-stone-400 truncate">
                        <span>Interests:</span>
                        <span className="text-stone-300 ml-1">Bambooware, Tea, Manuals</span>
                      </div>
                    </div>

                    {/* Col 2 */}
                    <div className="space-y-1.5">
                      <div className="truncate">
                        <span className="text-stone-400">Sect:</span>
                        <span className="text-amber-200 font-medium ml-1">{npc.settlementName || 'Bebas Mandiri'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-stone-400">Position:</span>
                        <span className="text-stone-200 font-bold">{npc.title || 'Warga Jianghu'}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-stone-400">Realm:</span>
                        <span className="text-cyan-300 font-bold ml-1">
                          Ranah Tingkat {npc.cultivation.realmIndex} (Tahap {npc.cultivation.stage})
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-stone-400">Reputation:</span>
                        <span className="text-amber-300 ml-1">
                          {npc.social?.sectRank ? `${npc.social.sectRank}(${Math.floor(npc.attributes.defense * 20)})` : `Renowned(${Math.floor(npc.attributes.defense * 20)})`}
                        </span>
                      </div>
                    </div>

                    {/* Col 3 */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-stone-400 block text-[11px]">Internal Traits:</span>
                        <span className="text-amber-200 font-bold capitalize">
                          {npc.personality?.primary ? npc.personality.primary.replace(/_/g, ' ') : 'Middle Way'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px]">External Traits:</span>
                        <span className="text-stone-200 capitalize">
                          {npc.personality?.secondary ? npc.personality.secondary.replace(/_/g, ' ') : 'Traditional, Carefree'}
                        </span>
                      </div>
                    </div>

                    {/* Col 4 */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-stone-400 block text-[11px] mb-1">Destiny (Nature)</span>
                        <div className="flex flex-wrap gap-1">
                          {(npc.destiny?.innate || []).map((d) => (
                            <span key={d} className={`px-2 py-0.5 rounded text-[10px] border font-medium ${getTierBadge('blue')}`}>
                              {d.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {(!npc.destiny?.innate || npc.destiny.innate.length === 0) && (
                            <span className="px-2 py-0.5 rounded text-[10px] border font-medium bg-stone-800 border-stone-600 text-stone-300">
                              Fondasi Fana
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px] mb-1">Destiny (Nurture)</span>
                        <div className="flex flex-wrap gap-1">
                          {(npc.destiny?.acquired || []).map((d) => (
                            <span key={d} className={`px-2 py-0.5 rounded text-[10px] border font-medium ${getTierBadge('purple')}`}>
                              {d.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {(!npc.destiny?.acquired || npc.destiny.acquired.length === 0) && (
                            <span className="px-2 py-0.5 rounded text-[10px] border font-medium bg-stone-800/80 border-stone-600/70 text-stone-300">
                              Tanpa Halangan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom 5-Column Master Attributes Container */}
                  <div className="bg-[#080b10] border border-[#30241b] rounded-lg p-3 sm:p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs shadow-inner">
                    
                    {/* PILLAR 1: GENERAL */}
                    <div className="col-span-2 md:col-span-1 border-r border-[#201812] pr-2">
                      <h4 className="text-center font-bold text-amber-300/90 border-b border-[#201812] pb-1.5 mb-2 uppercase tracking-wider text-[11px]">
                        General
                      </h4>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-1" title="Usia / Batas Usia">
                            <span>👤</span>
                            <span className="text-stone-400">Lifespan</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.lifespan.currentAge)}/{Math.floor(npc.lifespan.maxAge)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Suasana Hati">
                            <span>⌛</span>
                            <span className="text-stone-400">Mood</span>
                            <span className="font-mono text-stone-200 ml-auto">70/70</span>
                          </div>
                          <div className="flex items-center space-x-1" title="Kesehatan Tubuh Fana">
                            <span className="text-emerald-400 font-bold">+</span>
                            <span className="text-stone-400">Health</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.hp)}/{Math.floor(npc.attributes.maxHp)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Stamina Gerak">
                            <span className="text-amber-400">⚡</span>
                            <span className="text-stone-400">Stamina</span>
                            <span className="font-mono text-stone-200 ml-auto">80/80</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-1" title="Darah & Vitalitas">
                            <span className="text-rose-400">❤️</span>
                            <span className="text-stone-400">Vitality</span>
                            <span className="font-mono text-stone-200 ml-auto text-[10px]">
                              {Math.floor(npc.attributes.vitality)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Intisari Qi">
                            <span className="text-cyan-400">🌀</span>
                            <span className="text-stone-400">Energy</span>
                            <span className="font-mono text-stone-200 ml-auto text-[10px]">
                              {Math.floor(npc.attributes.energy)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Fokus Batin">
                            <span className="text-purple-400">🎯</span>
                            <span className="text-stone-400">Focus</span>
                            <span className="font-mono text-stone-200 ml-auto text-[10px]">
                              {Math.floor(npc.attributes.focus)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Keberuntungan">
                            <span>🎲</span>
                            <span className="text-stone-400">Luck</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.luck)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Pemahaman Kitab">
                            <span className="text-amber-300">👁️</span>
                            <span className="text-stone-400">Insight</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.insight)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PILLAR 2: COMBAT */}
                    <div className="col-span-2 md:col-span-1 border-r border-[#201812] pr-2">
                      <h4 className="text-center font-bold text-amber-300/90 border-b border-[#201812] pb-1.5 mb-2 uppercase tracking-wider text-[11px]">
                        Combat
                      </h4>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-1" title="Kekuatan Serangan Murni">
                            <span className="text-amber-400">⚔️</span>
                            <span className="text-stone-400">ATK</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.attack)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Pertahanan Fisik">
                            <span className="text-emerald-400">🛡️</span>
                            <span className="text-stone-400">DEF</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.defense)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Kecepatan Langkah Spasial">
                            <span>👣</span>
                            <span className="text-stone-400">Speed</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.travelSpeed)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Resistensi Beladiri">
                            <span>🥋</span>
                            <span className="text-stone-400">M-RES</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.martialRes)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Resistensi Spiritual">
                            <span className="text-cyan-400">🔮</span>
                            <span className="text-stone-400">S-RES</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.spiritualRes)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-1" title="Peluang Serangan Kritikal">
                            <span className="text-rose-400">🎯</span>
                            <span className="text-stone-400">CRIT</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.critRate)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Resistensi Kritikal">
                            <span className="text-emerald-400">🛡️</span>
                            <span className="text-stone-400">C-RES</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.critRes)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Kelincahan / Inisiatif Tempur">
                            <span className="text-sky-300">💨</span>
                            <span className="text-stone-400">Agility</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.agility)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Pengganda Kerusakan Kritikal">
                            <span className="text-amber-400">💥</span>
                            <span className="text-stone-400">C-DMG</span>
                            <span className="font-mono text-stone-200 ml-auto">
                              {Math.floor(npc.attributes.critDmg)}%
                            </span>
                          </div>
                          <div className="flex items-center space-x-1" title="Pengurangan Kerusakan Kritikal Lawan">
                            <span className="text-stone-400">🔰</span>
                            <span className="text-stone-400">C-DR</span>
                            <span className="font-mono text-stone-200 ml-auto">150%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PILLAR 3: MARTIAL ARTS */}
                    <div className="border-r border-[#201812] pr-2">
                      <h4 className="text-center font-bold text-amber-300/90 border-b border-[#201812] pb-1.5 mb-2 uppercase tracking-wider text-[11px]">
                        Martial Arts
                      </h4>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-400">🗡️</span>
                          <span className="text-stone-400">Blade</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.kungfuSkills?.blade ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-200">🥢</span>
                          <span className="text-stone-400">Spear</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.kungfuSkills?.spear ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sky-300">⚔️</span>
                          <span className="text-stone-400">Sword</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.kungfuSkills?.sword ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-stone-300">👊</span>
                          <span className="text-stone-400">Fist</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.kungfuSkills?.fist ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-rose-300">✋</span>
                          <span className="text-stone-400">Palm</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.kungfuSkills?.palm ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-stone-300">👆</span>
                          <span className="text-stone-400">Finger</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.kungfuSkills?.finger ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PILLAR 4: SPIRITUAL ROOT */}
                    <div className="border-r border-[#201812] pr-2">
                      <h4 className="text-center font-bold text-amber-300/90 border-b border-[#201812] pb-1.5 mb-2 uppercase tracking-wider text-[11px]">
                        Spiritual Root
                      </h4>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-rose-500">🔥</span>
                          <span className="text-stone-400">Fire</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.roots?.fire ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-cyan-400">💧</span>
                          <span className="text-stone-400">Water</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.roots?.water ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-400">⚡</span>
                          <span className="text-stone-400">Lightning</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.roots?.lightning ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-emerald-300">🌪️</span>
                          <span className="text-stone-400">Wind</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.roots?.wind ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-700">⛰️</span>
                          <span className="text-stone-400">Earth</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.roots?.earth ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-emerald-500">🌲</span>
                          <span className="text-stone-400">Wood</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.roots?.wood ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PILLAR 5: ARTISANSHIP */}
                    <div>
                      <h4 className="text-center font-bold text-amber-300/90 border-b border-[#201812] pb-1.5 mb-2 uppercase tracking-wider text-[11px]">
                        Artisanship
                      </h4>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-purple-400">⚗️</span>
                          <span className="text-stone-400">Alchemy</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.professions?.alchemy ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-stone-300">🔨</span>
                          <span className="text-stone-400">Forge</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.professions?.smithing ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-cyan-300">🧭</span>
                          <span className="text-stone-400">Feng Shui</span>
                          <span className="font-mono text-stone-200 ml-auto">38</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-300">📜</span>
                          <span className="text-stone-400">Talismans</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.professions?.talismans ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-emerald-400">🌿</span>
                          <span className="text-stone-400">Herbology</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.professions?.farming ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-stone-400">⛏️</span>
                          <span className="text-stone-400">Mining</span>
                          <span className="font-mono text-stone-200 ml-auto">
                            {Math.floor(npc.attributes.professions?.mining ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 2: SKILLS */}
              {activeTab === 'skills' && (
                <div className="space-y-4">
                  <div className="border-b border-[#30241b] pb-2 flex justify-between items-center">
                    <h3 className="text-amber-200 font-bold text-sm">Kitab Esoteris & Slot Tempur Terpasang</h3>
                    <span className="text-xs text-stone-400">Ranah {npc.cultivation.realmIndex}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-[#0d1117] border border-[#30241b] rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-amber-300 font-bold text-xs">Jurus Intisari {npc.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">Adaptif</span>
                      </div>
                      <p className="text-[11px] text-stone-400">Teknik dasar bela diri perguruan warisan sekte.</p>
                      <div className="mt-2 text-[10px] text-stone-500 font-mono">Kemahiran: Lv.{npc.cultivation.stage || 1}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ARTIFACT */}
              {activeTab === 'artifact' && (
                <div className="space-y-4">
                  <div className="border-b border-[#30241b] pb-2 flex justify-between items-center">
                    <h3 className="text-amber-200 font-bold text-sm">Artefak Spiritual & Barang Bawaan</h3>
                    <span className="text-xs text-stone-400">Total: {npc.inventory?.length || 0} Barang</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(npc.inventory || []).map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-[#0e1219] border border-[#2d2218] rounded flex items-center justify-between">
                        <div>
                          <span className="text-stone-200 font-medium block">{item.name}</span>
                          <span className="text-[10px] text-stone-500 uppercase">{item.category} • Tier {item.qualityTier || 'common'}</span>
                        </div>
                        <span className="text-amber-400 font-mono font-bold">x{item.quantity}</span>
                      </div>
                    ))}
                    {(!npc.inventory || npc.inventory.length === 0) && (
                      <span className="text-stone-500 italic">Tas kosong atau tersembunyi.</span>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: BACKSTORY */}
              {activeTab === 'backstory' && (
                <div className="space-y-3">
                  <div className="border-b border-[#30241b] pb-2 flex justify-between items-center">
                    <h3 className="text-amber-200 font-bold text-sm">Kronik Perjalanan Hidup Jianghu</h3>
                    <span className="text-xs text-stone-400">Asal: {npc.settlementName}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-[#0d1117] border-l-2 border-amber-500 rounded-r flex justify-between">
                      <div>
                        <span className="text-amber-300 font-bold block text-[11px]">Tahun Terbuka</span>
                        <span className="text-stone-300">Lahir di {npc.settlementName} dan mulai memupuk fondasi fana.</span>
                      </div>
                      <span className="text-stone-500 text-[10px]">Awal Kultivasi</span>
                    </div>
                    <div className="p-2.5 bg-[#0d1117] border-l-2 border-cyan-500 rounded-r flex justify-between">
                      <div>
                        <span className="text-cyan-300 font-bold block text-[11px]">Terobosan Ranah</span>
                        <span className="text-stone-300">
                          Menembus Ranah Tingkat {npc.cultivation.realmIndex} Tahap {npc.cultivation.stage}.
                        </span>
                      </div>
                      <span className="text-stone-500 text-[10px]">Kultivasi Aktif</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: FAMILY */}
              {activeTab === 'family' && (
                <div className="space-y-3">
                  <div className="border-b border-[#30241b] pb-2 flex justify-between items-center">
                    <h3 className="text-amber-200 font-bold text-sm">Silsilah Klan & Keluarga</h3>
                    <span className="text-xs text-stone-400">Klan: {familyData?.familyName || 'Mandiri'}</span>
                  </div>
                  {familyData ? (
                    <div>
                      <p className="text-stone-300 font-bold mb-2">{familyData.familyName} (Prestise: {familyData.clanPrestige})</p>
                      <div className="space-y-1">
                        {familyData.members?.map((m: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs py-1 border-b border-stone-800/40">
                            <span className="text-stone-400">{m.role.toUpperCase()} (Gen {m.generation})</span>
                            <span className="text-stone-200">{m.npcId?.name || 'Anggota Klan'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-stone-500 italic text-xs">Karakter ini hidup sebagai pengelana mandiri tanpa klan terdaftar.</p>
                  )}
                </div>
              )}

              {/* TAB 6: SOCIAL */}
              {activeTab === 'social' && (
                <div className="space-y-3">
                  <div className="border-b border-[#30241b] pb-2 flex justify-between items-center">
                    <h3 className="text-amber-200 font-bold text-sm">Jaringan Hubungan & Afinitas</h3>
                    <span className="text-xs text-stone-400">
                      Afinitas dengan Anda: {relation.affinity > 0 ? `+${relation.affinity}` : relation.affinity}/100
                    </span>
                  </div>
                  <div className="p-3 bg-[#0d1117] border border-[#30241b] rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-3 py-1 rounded border text-xs font-mono font-bold text-amber-300 border-amber-600 bg-amber-950/60">
                        Status: {relation.affinityStage.toUpperCase()}
                      </span>
                      {relation.specialStatus.isDaoCompanion && (
                        <span className="px-2 py-0.5 bg-rose-950 border border-rose-600 text-rose-300 rounded text-xs">
                          💖 Pasangan Dao
                        </span>
                      )}
                      {relation.specialStatus.isSwornSibling && (
                        <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-300 rounded text-xs">
                          🤝 Saudara Sejiwa
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-stone-900 rounded-full h-2.5 overflow-hidden border border-stone-800">
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${Math.max(0, Math.min(100, Math.floor((relation.affinity + 100) / 2)))}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: TAOIST MIND */}
              {activeTab === 'taoist' && (
                <div className="space-y-3">
                  <div className="border-b border-[#30241b] pb-2 flex justify-between items-center">
                    <h3 className="text-amber-200 font-bold text-sm">Keadaan Hati Dao & Kestabilan Spiritual</h3>
                    <span className="text-xs text-stone-400">Status: {npc.dao?.heartState || 'Stabil'}</span>
                  </div>
                  <div className="p-4 bg-[#0d1117] border border-[#30241b] rounded-lg space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-amber-300 font-bold">Kestabilan Hati Dao (Dao Heart Stability)</span>
                        <span className="text-stone-300 font-mono">
                          {Math.floor((npc.cultivation.stage || 1) * 10 + 60)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden border border-stone-800">
                        <div
                          className="bg-cyan-500 h-full"
                          style={{ width: `${Math.min(100, (npc.cultivation.stage || 1) * 10 + 60)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-stone-300 leading-relaxed text-[11px]">
                      {npc.description || `Tokoh kultivator yang melintasi dunia persilatan dengan tekad teguh menggapai keabadian Langit dan Bumi.`}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-800">
                      {(npc.dao?.traits || []).map((t) => (
                        <span key={t} className="px-2.5 py-1 bg-amber-950/70 border border-amber-600/60 text-amber-300 rounded text-[11px]">
                          {t.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* ACTION FEEDBACK / TOAST */}
            {actionFeedback && (
              <div className="mt-3 p-2 bg-[#1a130e] border border-amber-600/50 rounded text-xs text-amber-200 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-base">📜</span>
                  <span>{actionFeedback}</span>
                </div>
                <button onClick={() => setActionFeedback(null)} className="text-stone-400 hover:text-stone-200 text-xs ml-2">
                  ✕
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default NpcProfilePanel;
