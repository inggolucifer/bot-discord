'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/lib/store';
import api from '@/lib/api';
import { 
  X, MessageSquare, Gift, Swords, Shield, HeartHandshake, UserPlus, 
  HelpCircle, Compass, RefreshCw, AlertTriangle, Skull, Sparkles, BookOpen
} from 'lucide-react';
import StatGrid from '@/components/character/StatGrid';
import DestinyTraits from '@/components/character/DestinyTraits';
import PersonalityBadges from '@/components/character/PersonalityBadges';
import AlignmentBar from '@/components/character/AlignmentBar';
import FallbackImage from '@/components/FallbackImage';
import { GLOBAL_ASSETS } from '@/config/globalAssets';

type NpcTab = 'stats' | 'skills' | 'artifact' | 'backstory' | 'family' | 'social' | 'taoistMind';

export default function NpcInteractionModal() {
  const { activeModal, activeNpcId, setActiveNpcId, closeModal } = useUIStore();
  const [activeTab, setActiveTab] = useState<NpcTab>('stats');
  const [npcData, setNpcData] = useState<any>(null);
  const [nearbyNpcs, setNearbyNpcs] = useState<any[]>([]);
  const [availableQuests, setAvailableQuests] = useState<any[]>([]);
  const [dialogHistory, setDialogHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isConfirmingHostile, setIsConfirmingHostile] = useState<'theft' | 'attack' | null>(null);

  const isOpen = activeModal === 'npcInteraction' && !!activeNpcId;

  useEffect(() => {
    if (isOpen && activeNpcId) {
      fetchNpcDetails(activeNpcId);
      fetchNearbyNpcs();
    }
  }, [isOpen, activeNpcId]);

  const fetchNpcDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const res = await api.get(`/world/npc/${id}`);
      if (res.data?.npc) {
        setNpcData(res.data.npc);
        setAvailableQuests(res.data.availableQuests || []);
      } else {
        setError('Data NPC tidak ditemukan.');
      }

      // Initial greeting talk
      try {
        const talkRes = await api.post(`/world/npc/${id}/talk`, {});
        if (talkRes.data?.message) {
          setDialogHistory([talkRes.data.message]);
        }
      } catch (talkErr) {
        // Fallback greeting
        setDialogHistory(['Salam kenal, rekan sesama pengelana dunia persilatan.']);
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyapa tokoh Jianghu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyNpcs = async () => {
    try {
      const res = await api.get('/world/people');
      if (res.data?.success && res.data?.data) {
        // Collect NPCs in current zone/settlement
        const npcs = res.data.data.npcs || [];
        setNearbyNpcs(npcs);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  const handleAction = async (actionType: string) => {
    if (!activeNpcId) return;
    setActionMessage(null);
    try {
      if (actionType === 'talk') {
        const res = await api.post(`/world/npc/${activeNpcId}/talk`, {});
        setDialogHistory(prev => [res.data?.message || 'NPC tersenyum dan mengangguk.', ...prev.slice(0, 4)]);
        setActiveTab('backstory');
      } else if (actionType === 'gift') {
        setActionMessage('🎁 Kamu mempersembahkan teh harum dan batu giok. Hubungan meningkat!');
      } else if (actionType === 'spar') {
        setActionMessage('⚔️ NPC menerima tantangan sparring latihan santai!');
      } else if (actionType === 'bond') {
        setActionMessage('🤝 Hubungan persaudaraan semakin erat.');
      } else if (actionType === 'dualCultivation') {
        setActionMessage('☯️ Duduk bersila bersama menyelaraskan sirkulasi Qi langit dan bumi.');
      } else {
        setActionMessage(`Aksi [${actionType}] berhasil dilakukan.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || `Gagal mengeksekusi aksi ${actionType}.`);
    }
  };

  const handleHostileAction = (type: 'theft' | 'attack') => {
    setIsConfirmingHostile(type);
  };

  const executeHostileAction = async () => {
    if (!isConfirmingHostile || !activeNpcId) return;
    const type = isConfirmingHostile;
    setIsConfirmingHostile(null);
    try {
      if (type === 'attack') {
        setActionMessage('⚔️ Menghunus pedang! Pertarungan dimulai...');
      } else {
        setActionMessage('🧤 Mencoba merogoh kantong qiankun target... Target waspada!');
      }
    } catch (err: any) {
      setError('Aksi gagal.');
    }
  };

  if (!isOpen) return null;

  const tabs: { key: NpcTab; label: string }[] = [
    { key: 'stats', label: 'Stats' },
    { key: 'skills', label: 'Skills' },
    { key: 'artifact', label: 'Artifact' },
    { key: 'backstory', label: 'Backstory' },
    { key: 'family', label: 'Family' },
    { key: 'social', label: 'Social' },
    { key: 'taoistMind', label: 'Taoist Mind' }
  ];

  // Map NPC data to standard format for StatGrid
  const dummyNpcStats = {
    age: npcData?.age || 28,
    extendedStats: {
      maxLifespan: npcData?.maxLifespan || 810,
      mood: 70,
      vitality: 9863,
      maxVitality: 11435,
      innerEnergy: 1782,
      maxInnerEnergy: 1985,
      focus: 1866,
      maxFocus: 2137,
      luck: 100,
      insight: 150,
      critRate: 666,
      critResist: 587,
      agility: 406,
      critDmg: 522,
      critDmgReduce: 329,
      travelSpeed: 1300,
      martialRes: 116,
      spiritualRes: 135,
      spiritualRoot: { fire: 311, water: 108, lightning: 76, wind: 247, earth: 117, wood: 91 },
      artisanship: { alchemy: 173, forge: 37, fengShui: 38, talismans: 26, herbology: 60, mining: 20 }
    },
    combatStats: {
      hp: 100,
      maxHp: 100,
      atk: 586,
      def: 355,
      spd: 406,
      critRate: 666,
      critRes: 587,
      agility: 406,
      critDmg: 522,
      critDr: 329,
      travelSpeed: 1300,
      martialRes: 116,
      spiritualRes: 135
    },
    kungfuSkills: {
      saber: 34,
      staff: 172,
      sword: 210,
      fist: 53,
      special: 297,
      finger: 157
    }
  };

  const npcName = npcData?.name || 'Tokoh Misterius';
  const npcSect = npcData?.sect || 'Sacred Spirit Sect Yun Mo Branch';
  const npcPosition = npcData?.title || 'Tetua (Elder)';
  const npcRealm = npcData?.realm || 'Nascent Soul (VI) Late';
  const npcSex = npcData?.gender || 'Wanita';
  const npcCharisma = 'Ilahi (Divine)';
  const npcReputation = 'Termasyhur (Renowned)';
  const npcInterests = ['Bambu Kuno', 'Seruling Xiao', 'Kaligrafi'];
  const npcNature = ['Dual Talents', 'Aniseed Flavored Bean', 'Intelligent'];
  const npcNurture = ['Unobstructed (Bebas Halangan)'];
  const npcAlignment = { righteous: 200, demonic: 100 };

  // Resolve standing full-body art from GLOBAL_ASSETS.npcs or ui_panels
  const standingArtUrl = 
    (GLOBAL_ASSETS.npcs as any)?.[npcName] ||
    (npcData?.slug && (GLOBAL_ASSETS.npcs as any)?.[npcData.slug]) ||
    npcData?.standingImageUrl ||
    (npcSex === 'Wanita' 
      ? ((GLOBAL_ASSETS.npcs as any)?.['default_standing_female'] || GLOBAL_ASSETS.ui_panels?.npc_default_female)
      : ((GLOBAL_ASSETS.npcs as any)?.['default_standing_male'] || GLOBAL_ASSETS.ui_panels?.npc_default_male)) ||
    npcData?.avatarUrl ||
    '';

  // Custom Wuxia Standing Silhouette & Halo Fallback Node
  const standingFallbackNode = (
    <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center bg-gradient-to-b from-[#131826] via-[#0c101a] to-[#07090f] p-4 relative overflow-hidden select-none">
      {/* Background Spiritual Aura Halo */}
      <div className="absolute w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
      <div className="absolute w-28 h-28 rounded-full bg-amber-500/15 blur-xl" />
      
      {/* Standing Silhouette Graphic */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-900/50 to-[#101420] border-2 border-amber-500/70 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(245,158,11,0.35)] mb-3 group-hover:scale-105 transition-transform">
          {npcSex === 'Wanita' ? '🧝‍♀️' : '🧙‍♂️'}
        </div>
        <div className="px-3 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs font-serif font-bold tracking-wider shadow-sm">
          {npcName}
        </div>
        <div className="text-[11px] text-stone-400 mt-1">
          {npcPosition}
        </div>
        <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">
          {npcRealm}
        </div>
      </div>

      {/* Decorative Traditional Mist */}
      <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      onClick={closeModal}
    >
      {/* Ancient Dark Scroll Frame */}
      <div 
        className="relative w-full max-w-6xl max-h-[96vh] sm:max-h-[92vh] bg-[#0c0f17] border-2 border-[#574730] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-[#d9ceb8] font-serif"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 40px rgba(197, 168, 128, 0.25), inset 0 0 60px rgba(0,0,0,0.9)'
        }}
      >
        {/* Top Row: Nearby NPCs Scrollable Avatars */}
        <div className="bg-[#121622] border-b border-[#3d3322] px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1 flex-1 pr-4">
            <span className="text-[11px] text-stone-400 font-sans uppercase tracking-wider shrink-0 mr-1">
              Tokoh Sekitar:
            </span>
            {nearbyNpcs.length > 0 ? (
              nearbyNpcs.map((n) => {
                const isSelected = n._id === activeNpcId;
                return (
                  <button
                    key={n._id}
                    onClick={() => setActiveNpcId(n._id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs whitespace-nowrap transition-all shrink-0 ${
                      isSelected 
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                        : 'bg-[#181d29] border-[#2e374a] text-stone-300 hover:border-amber-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span>{n.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md border bg-amber-950/80 border-amber-500 text-amber-200 text-xs">
                  {npcName} (Sedang Bicara)
                </span>
              </div>
            )}
          </div>

          <button 
            onClick={closeModal}
            className="p-1 rounded-full bg-[#241c13] hover:bg-rose-900 border border-[#5a4325] text-amber-200 hover:text-white transition-all shadow-md shrink-0"
            title="Tutup Panel Interaksi"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: Full-Body Standing Portrait & Action Command Column */}
          <div className="w-full md:w-64 lg:w-72 bg-[#090b11] border-b md:border-b-0 md:border-r border-[#382f20] p-3 flex flex-col justify-between overflow-y-auto custom-scrollbar shrink-0">
            <div>
              {/* NPC Full-Body Standing Art Container */}
              <div className="relative w-full aspect-[9/14] max-h-72 sm:max-h-80 rounded-lg overflow-hidden border-2 border-[#52442d] bg-[#0d111a] mb-3 shadow-inner group">
                <FallbackImage
                  src={standingArtUrl}
                  alt={npcName}
                  fallbackNode={standingFallbackNode}
                  className="w-full h-full object-contain object-bottom"
                />
                
                {/* Title badge overlay top-right */}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-amber-600/50 text-amber-300 text-[10px] shadow">
                  {npcData?.title || 'Pengelana (Stranger)'}
                </div>

                {/* Standing Art Indicator Label */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-stone-700 text-stone-400 text-[9px] font-sans">
                  Tokoh Berdiri (Standing Art)
                </div>
              </div>

              {/* Action Buttons (Social & Martial) */}
              <div className="grid grid-cols-2 gap-1.5 text-xs font-serif">
                <button 
                  onClick={() => handleAction('talk')}
                  className="py-1 px-2 rounded bg-[#181e2b] hover:bg-[#252f44] border border-[#38435d] text-stone-200 flex items-center justify-center gap-1 transition-all"
                >
                  <MessageSquare size={13} className="text-sky-400" /> Sapa (Talk)
                </button>
                <button 
                  onClick={() => handleAction('gift')}
                  className="py-1 px-2 rounded bg-[#181e2b] hover:bg-[#252f44] border border-[#38435d] text-stone-200 flex items-center justify-center gap-1 transition-all"
                >
                  <Gift size={13} className="text-amber-400" /> Hadiah (Gift)
                </button>
                <button 
                  onClick={() => handleAction('bond')}
                  className="py-1 px-2 rounded bg-[#181e2b] hover:bg-[#252f44] border border-[#38435d] text-stone-200 flex items-center justify-center gap-1 transition-all"
                >
                  <HeartHandshake size={13} className="text-rose-400" /> Akrab (Bond)
                </button>
                <button 
                  onClick={() => handleAction('spar')}
                  className="py-1 px-2 rounded bg-[#181e2b] hover:bg-[#252f44] border border-[#38435d] text-stone-200 flex items-center justify-center gap-1 transition-all"
                >
                  <Swords size={13} className="text-yellow-400" /> Sparring
                </button>
                <button 
                  onClick={() => handleAction('dualCultivation')}
                  className="py-1 px-2 rounded bg-[#181e2b] hover:bg-[#252f44] border border-[#38435d] text-stone-200 flex items-center justify-center gap-1 transition-all"
                >
                  <Sparkles size={13} className="text-purple-400" /> Semadi Berdua
                </button>
                <button 
                  onClick={() => handleAction('debate')}
                  className="py-1 px-2 rounded bg-[#181e2b] hover:bg-[#252f44] border border-[#38435d] text-stone-200 flex items-center justify-center gap-1 transition-all"
                >
                  <BookOpen size={13} className="text-teal-400" /> Debat Dao
                </button>
              </div>

              {/* Hostile Actions */}
              <div className="mt-3 pt-2 border-t border-[#262117] grid grid-cols-2 gap-1.5 text-xs">
                <button 
                  onClick={() => handleHostileAction('theft')}
                  className="py-1 px-2 rounded bg-[#2a1315] hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 flex items-center justify-center gap-1 transition-all"
                >
                  🧤 Curi (Theft)
                </button>
                <button 
                  onClick={() => handleHostileAction('attack')}
                  className="py-1 px-2 rounded bg-gradient-to-r from-red-950 to-rose-900 hover:from-red-900 hover:to-rose-800 border border-red-600 text-red-100 flex items-center justify-center gap-1 font-semibold transition-all shadow-md"
                >
                  <Skull size={13} className="text-red-400" /> Serang!
                </button>
              </div>
            </div>

            {/* Alignment Bar Bottom Left */}
            <div className="mt-3 pt-2 border-t border-[#2a2418]">
              <AlignmentBar 
                righteous={npcAlignment.righteous} 
                demonic={npcAlignment.demonic} 
                compact 
              />
            </div>
          </div>

          {/* Right Panel: Tabs and Detailed Information */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#131722] via-[#0d1017] to-[#080a0f]">
            
            {/* Top Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#3b3223] overflow-x-auto custom-scrollbar">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-t-lg font-serif text-xs font-semibold whitespace-nowrap transition-all border-t border-x ${
                      isActive 
                        ? 'bg-[#1b212f] text-amber-300 border-[#574730] border-b-transparent shadow-sm' 
                        : 'bg-transparent text-stone-400 border-transparent hover:text-stone-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Notification messages */}
            {actionMessage && (
              <div className="mx-4 mt-2 p-2 rounded bg-emerald-950/70 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-400" />
                {actionMessage}
              </div>
            )}
            {error && (
              <div className="mx-4 mt-2 p-2 rounded bg-rose-950/70 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-400" />
                {error}
              </div>
            )}

            {/* Hostile Confirmation Modal Overlay */}
            {isConfirmingHostile && (
              <div className="mx-4 mt-2 p-3 rounded-lg bg-red-950/90 border-2 border-red-600 text-red-100 text-xs flex flex-col gap-2 animate-in fade-in shadow-xl">
                <div className="font-bold flex items-center gap-2 text-sm">
                  <AlertTriangle size={16} className="text-red-400" />
                  Konfirmasi Aksi Bermusuhan: {isConfirmingHostile === 'attack' ? 'Serang NPC' : 'Mencuri Barang'}
                </div>
                <p className="text-stone-300">
                  Aksi ini akan meningkatkan reputasi Iblis (Demonic), menurunkan hubungan dengan sekte terkait, dan dapat memicu pertarungan hidup atau mati! Apakah kamu yakin?
                </p>
                <div className="flex justify-end gap-2 mt-1">
                  <button 
                    onClick={() => setIsConfirmingHostile(null)}
                    className="px-3 py-1 bg-stone-800 hover:bg-stone-700 rounded text-stone-300"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={executeHostileAction}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-white font-bold"
                  >
                    Ya, Lanjutkan!
                  </button>
                </div>
              </div>
            )}

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5">
              
              {/* TAB: STATS (Matches Image 1) */}
              {activeTab === 'stats' && (
                <div className="space-y-4">
                  {/* Identity Summary Header */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 bg-[#111520] border border-[#30291d] rounded-lg">
                    <div className="lg:col-span-8 space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div><span className="text-stone-500">Nama:</span> <span className="font-bold text-amber-200">{npcName}</span></div>
                        <div><span className="text-stone-500">Sekte:</span> <span className="text-amber-300">{npcSect}</span></div>
                        <div><span className="text-stone-500">Jabatan:</span> {npcPosition}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div><span className="text-stone-500">Ras:</span> {npcSex === 'Wanita' ? 'Manusia (Perempuan)' : 'Manusia (Laki-laki)'}</div>
                        <div><span className="text-stone-500">Ranah:</span> <span className="text-sky-300 font-semibold">{npcRealm}</span></div>
                        <div><span className="text-stone-500">Karisma:</span> <span className="text-amber-400">{npcCharisma}</span></div>
                        <div><span className="text-stone-500">Reputasi:</span> <span className="text-emerald-300">{npcReputation}</span></div>
                      </div>
                      <div className="pt-1 text-[11px] text-stone-400">
                        <span className="text-stone-500">Minat:</span> {npcInterests.join(' • ')}
                      </div>
                    </div>

                    <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-[#2e271a] lg:pl-3">
                      <DestinyTraits nature={npcNature} nurture={npcNurture} compact />
                    </div>
                  </div>

                  {/* Detailed 5 Stat Categories for NPC */}
                  <StatGrid player={dummyNpcStats} compact />
                </div>
              )}

              {/* TAB: BACKSTORY & DIALOGUE */}
              {activeTab === 'backstory' && (
                <div className="space-y-4 font-serif">
                  <div className="bg-[#121622] border border-[#3b3223] p-4 rounded-xl">
                    <h4 className="text-base font-bold text-amber-300 mb-2">Percakapan Terakhir</h4>
                    <div className="space-y-2">
                      {dialogHistory.map((msg, i) => (
                        <div key={i} className="flex gap-2.5 bg-[#171c2a] p-3 rounded-lg border border-[#2b3345]">
                          <MessageSquare size={16} className="text-sky-400 shrink-0 mt-0.5" />
                          <p className="text-stone-200 text-xs leading-relaxed italic">"{msg}"</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {availableQuests.length > 0 && (
                    <div className="bg-[#121622] border border-[#3b3223] p-4 rounded-xl">
                      <h4 className="text-base font-bold text-amber-300 mb-2">Tugas & Permintaan yang Tersedia</h4>
                      <div className="space-y-2">
                        {availableQuests.map((q: any) => (
                          <div key={q._id} className="p-3 bg-[#171c2a] border border-[#2b3345] rounded-lg flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-amber-200">{q.title}</div>
                              <div className="text-stone-400 text-[11px] mt-0.5">{q.description}</div>
                            </div>
                            <button 
                              onClick={() => handleAction(`Ambil Tugas: ${q.title}`)}
                              className="px-3 py-1 bg-amber-800 hover:bg-amber-700 text-amber-100 rounded text-xs"
                            >
                              Terima Tugas
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: SKILLS */}
              {activeTab === 'skills' && (
                <div className="p-4 bg-[#121622] rounded-xl border border-[#3b3223] text-xs space-y-3">
                  <h4 className="font-bold text-amber-300 text-sm">Ilmu Beladiri & Mantra Spiritual NPC</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-[#171c2a] rounded-lg border border-[#2d3648]">
                      <div className="font-bold text-amber-200">Tebasan Bunga Persik Azure</div>
                      <div className="text-stone-400 text-[11px] mt-0.5">Jurus pedang tingkat tinggi dengan elemen angin.</div>
                    </div>
                    <div className="p-3 bg-[#171c2a] rounded-lg border border-[#2d3648]">
                      <div className="font-bold text-sky-200">Pelindung Teratai Air Sembilan Lapis</div>
                      <div className="text-stone-400 text-[11px] mt-0.5">Mantra pertahanan air yang memantulkan 30% damage lawan.</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ARTIFACT */}
              {activeTab === 'artifact' && (
                <div className="p-4 bg-[#121622] rounded-xl border border-[#3b3223] text-xs">
                  <h4 className="font-bold text-amber-300 text-sm mb-2">Artefak Spiritual Bawaan</h4>
                  <div className="p-3 bg-[#171c2a] rounded-lg border border-[#2d3648] flex gap-3 items-center">
                    <div className="text-3xl">🪈</div>
                    <div>
                      <div className="font-bold text-amber-200">Seruling Giok Azure Sembilan Lembah</div>
                      <div className="text-stone-400 text-[11px]">Artefak kelas Langka (Rare) peninggalan tetua sekte terdahulu.</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: FAMILY & SOCIAL */}
              {(activeTab === 'family' || activeTab === 'social') && (
                <div className="p-4 bg-[#121622] rounded-xl border border-[#3b3223] text-xs text-stone-400 italic text-center py-8">
                  Jejak silsilah dan hubungan sosial tokoh ini tercatat di arsip aula tetua sekte.
                </div>
              )}

              {/* TAB: TAOIST MIND */}
              {activeTab === 'taoistMind' && (
                <div className="p-4 bg-[#121622] rounded-xl border border-[#3b3223] text-xs space-y-2">
                  <h4 className="font-bold text-amber-300 text-sm">Prinsip Pikiran Dao (Taoist Mind)</h4>
                  <p className="text-stone-300 leading-relaxed">
                    "Mengalir bagaikan air pegunungan, tidak mendamba ketenaran fana, namun tak gentar membelah badai saat sekte terancam."
                  </p>
                  <div className="mt-2 text-amber-400 font-semibold">Tipe Dao: Jalan Tengah (Middle Way)</div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
