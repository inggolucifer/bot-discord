'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/lib/store';
import api from '@/lib/api';
import { 
  X, User, BookOpen, Hammer, Package, Scroll, Users, Sparkles,
  Shield, Sword, Flame, Heart, Zap, RefreshCw, Award
} from 'lucide-react';
import StatGrid from '@/components/character/StatGrid';
import DestinyTraits from '@/components/character/DestinyTraits';
import PersonalityBadges from '@/components/character/PersonalityBadges';
import AlignmentBar from '@/components/character/AlignmentBar';
import FallbackImage from '@/components/FallbackImage';
import { GLOBAL_ASSETS } from '@/config/globalAssets';
import { PlayerProfile } from '@/types/game';

type ActiveTab = 'stats' | 'skills' | 'artisan' | 'item' | 'experience' | 'relations';

export default function PlayerStatsModal() {
  const { activeModal, closeModal, isTileInspectorActive } = useUIStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = activeModal === 'stats';

  useEffect(() => {
    if (isOpen) {
      fetchPlayerProfile();
    }
  }, [isOpen]);

  const fetchPlayerProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/player/profile');
      if (res.data?.success && res.data?.data) {
        setPlayer(res.data.data);
      } else {
        setError('Gagal memuat profil pendekar.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Koneksi ke server terputus.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const characterName = player?.characterName || 'Pendekar Fana';
  const sectName = player?.sect || 'Tanpa Sekte (Rogue Cultivator)';
  const realmName = player?.systemCultivation?.realm || 'Fondasi Fana (Mortal)';
  const stage = player?.systemCultivation?.stage || 0;
  const gender = player?.gender || 'Pria';
  const age = player?.age || 16;
  const race = player?.race || 'Human';
  const charisma = player?.charisma || 'Menawan (Attractive)';
  const reputation = player?.reputation || 100;
  const reputationTitle = player?.reputationTitle || 'Terkenal (Renowned)';
  const interests = player?.interests || ['Bambu', 'Seruling', 'Kitab Kuning'];
  const personalityTags = player?.personalityTags || ['Protective', 'Carefree'];
  const destinyNature = player?.destinyNature || ['Dual Talents'];
  const destinyNurture = player?.destinyNurture || ['Taoist Mind Essence'];

  const avatar = player?.characterImage || player?.avatarUrl || player?.discordAvatar || '';

  const navItems: { key: ActiveTab; label: string; icon: any }[] = [
    { key: 'stats', label: 'Stats', icon: User },
    { key: 'skills', label: 'Skills', icon: Zap },
    { key: 'artisan', label: 'Artisan', icon: Hammer },
    { key: 'item', label: 'Item', icon: Package },
    { key: 'experience', label: 'Experie', icon: Scroll },
    { key: 'relations', label: 'Relatio', icon: Users },
  ];

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      onClick={closeModal}
    >
      {/* Ancient Parchment Scroll Frame */}
      <div 
        className="relative w-full max-w-6xl max-h-[96vh] sm:max-h-[92vh] bg-[#10131d] border-2 border-[#826b48] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-[#e3d7bf]"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 40px rgba(197, 168, 128, 0.2), inset 0 0 60px rgba(0,0,0,0.8)'
        }}
      >
        {/* Ornate Top Bar with Close Button */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#171a24] via-[#221e17] to-[#171a24] border-b border-[#4d3e28]">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-serif font-bold text-base sm:text-lg tracking-widest flex items-center gap-2">
              📜 LEMBAR STATISTIK PENDEKAR (IMMORTAL STATUS)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPlayerProfile}
              disabled={loading}
              className="p-1.5 text-[#a89980] hover:text-amber-300 transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={closeModal}
              className="p-1.5 rounded-full bg-[#2a2217] hover:bg-rose-900/60 border border-[#6b5230] text-amber-200 hover:text-white transition-all shadow-md"
              title="Tutup Lembar Status"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Vertical Navigation + Main Scrollable Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Vertical Nav Icons */}
          <div className="w-14 sm:w-20 bg-[#0d1017] border-r border-[#382f21] flex flex-col items-center py-4 gap-3 shrink-0 select-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all group ${
                    isActive 
                      ? 'bg-gradient-to-b from-[#4d3b20] to-[#2b2112] text-amber-300 border border-[#967744] shadow-[0_0_12px_rgba(197,168,128,0.4)] scale-105' 
                      : 'text-stone-400 hover:text-amber-200 hover:bg-[#181d28] border border-transparent'
                  }`}
                  title={item.label}
                >
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border ${
                    isActive ? 'border-amber-400/80 bg-[#1e170d]' : 'border-stone-700 bg-[#121622]'
                  }`}>
                    <Icon size={18} className={isActive ? 'text-amber-300 animate-pulse' : 'text-stone-400'} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-serif font-medium mt-1 tracking-wider">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Scrollable Tab Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#171b26] via-[#0f121a] to-[#0a0c12]">
            {loading && !player ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-amber-200/70">
                <RefreshCw size={32} className="animate-spin text-amber-400" />
                <p className="font-serif">Menyelaraskan Qi dan Meridian Karakter...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-rose-400 font-serif">
                <p>{error}</p>
                <button 
                  onClick={fetchPlayerProfile}
                  className="mt-4 px-4 py-1.5 bg-[#2b1717] border border-rose-800 rounded text-sm text-rose-200"
                >
                  Coba Lagi
                </button>
              </div>
            ) : (
              <>
                {/* TAB 1: STATS (MAIN SHEET - MATCHES IMAGE 3) */}
                {activeTab === 'stats' && (
                  <div className="space-y-4">
                    
                    {/* Top Section: Portrait + Identity + Destiny */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start bg-[#121622]/80 border border-[#3b3323] p-3 sm:p-4 rounded-xl shadow-lg">
                      
                      {/* Character Avatar & Aura Column (4 cols) */}
                      <div className="lg:col-span-4 flex flex-col items-center text-center">
                        <div className="relative mb-2 group">
                          {/* Daoist Glowing Ring / Aura */}
                          <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/30 via-purple-500/20 to-amber-500/30 rounded-full blur-md animate-pulse" />
                          
                          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-amber-500/80 p-1 bg-[#151924] shadow-[0_0_20px_rgba(245,158,11,0.3)] overflow-hidden">
                            <FallbackImage
                              src={avatar}
                              alt={characterName}
                              fallbackCategory="avatar"
                              className="w-full h-full object-cover rounded-full"
                            />
                          </div>

                          {/* Daoist Realm Seal */}
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-800 to-amber-600 border border-amber-400 text-amber-100 text-[11px] font-serif font-bold whitespace-nowrap shadow-md">
                            {realmName} {stage > 0 ? `Tk. ${stage}` : ''}
                          </div>
                        </div>

                        {/* Alignment bar under portrait */}
                        <div className="w-full max-w-xs mt-3 px-2">
                          <AlignmentBar 
                            righteous={player?.alignment?.righteous || 50} 
                            demonic={player?.alignment?.demonic || 0} 
                            compact 
                          />
                        </div>
                      </div>

                      {/* Identity Details (5 cols) */}
                      <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-2 font-serif text-xs sm:text-sm">
                        
                        {/* Personality Badges Row */}
                        <div className="pb-2 border-b border-[#2a2419]">
                          <PersonalityBadges 
                            tags={personalityTags} 
                            internalTrait={player?.internalTraits} 
                            externalTrait={player?.externalTraits} 
                          />
                        </div>

                        {/* Name & Sect */}
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold text-amber-200 tracking-wide font-serif">
                            {characterName}
                          </h2>
                          <p className="text-stone-400 text-xs mt-0.5">
                            Sekte: <span className="text-amber-300 font-semibold">{sectName}</span>
                          </p>
                        </div>

                        {/* Core Details Grid */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-stone-300 pt-1">
                          <div>
                            <span className="text-stone-500">Ras:</span> {race}
                          </div>
                          <div>
                            <span className="text-stone-500">Kelamin:</span> {gender}
                          </div>
                          <div>
                            <span className="text-stone-500">Karisma:</span> <span className="text-amber-300">{charisma}</span>
                          </div>
                          <div>
                            <span className="text-stone-500">Reputasi:</span> <span className="text-emerald-300">{reputationTitle} ({reputation})</span>
                          </div>
                        </div>

                        {/* Interests */}
                        <div className="text-xs pt-1 border-t border-[#2a2419]">
                          <span className="text-stone-500">Minat & Hobi: </span>
                          <span className="text-stone-300">{interests.join(' • ')}</span>
                        </div>
                      </div>

                      {/* Destiny Traits (3 cols) */}
                      <div className="lg:col-span-3 flex flex-col justify-center h-full border-t lg:border-t-0 lg:border-l border-[#332b1d] lg:pl-4 pt-3 lg:pt-0">
                        <DestinyTraits 
                          nature={destinyNature} 
                          nurture={destinyNurture} 
                          compact 
                        />
                      </div>

                    </div>

                    {/* Bottom Section: 5 Detailed Stat Categories (General, Combat, Martial Arts, Spiritual Root, Artisanship) */}
                    <div className="pt-2">
                      <StatGrid player={player} />
                    </div>

                  </div>
                )}

                {/* TAB 2: SKILLS (MANUALS & JURUS) */}
                {activeTab === 'skills' && (
                  <div className="space-y-4">
                    <div className="bg-[#121622] border border-[#3b3323] p-4 rounded-xl">
                      <h3 className="text-lg font-serif font-bold text-amber-300 mb-3 flex items-center gap-2">
                        <Zap size={18} className="text-amber-400" />
                        Jurus & Kitab Manual Teknik
                      </h3>
                      {player?.manuals && player.manuals.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {player.manuals.map((m: any, idx: number) => (
                            <div key={idx} className="bg-[#181e2e] border border-[#38435d] p-3 rounded-lg flex gap-3">
                              <div className="w-12 h-12 bg-amber-950/60 border border-amber-600/50 rounded-lg flex items-center justify-center shrink-0">
                                📜
                              </div>
                              <div className="flex-1 text-xs">
                                <h4 className="font-bold text-amber-200 text-sm">{m.name}</h4>
                                <p className="text-stone-400 line-clamp-2 mt-0.5">{m.description || 'Kitab jurus rahasia.'}</p>
                                <div className="mt-1 flex items-center justify-between text-[11px] text-amber-400">
                                  <span>Tingkat: {m.level} / {m.maxLevel || 10}</span>
                                  <span>{m.effectType ? `${m.effectType} +${m.effectValue}` : ''}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-stone-400 text-sm italic py-8 text-center">
                          Belum ada kitab manual teknik yang dipelajari. Kunjungi paviliun sekte atau temukan warisan kuno di dungeon.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: ARTISAN (PROFESSIONS) */}
                {activeTab === 'artisan' && (
                  <div className="space-y-4">
                    <div className="bg-[#121622] border border-[#3b3323] p-4 rounded-xl">
                      <h3 className="text-lg font-serif font-bold text-amber-300 mb-3 flex items-center gap-2">
                        <Hammer size={18} className="text-amber-400" />
                        Profesi & Kemahiran Pengrajin
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          { name: 'Alkimia (Alchemy)', level: player?.extendedStats?.artisanship?.alchemy || 5, icon: '⚗️', desc: 'Meracik pil obat dan intisari Qi' },
                          { name: 'Penempa (Smithing)', level: player?.extendedStats?.artisanship?.forge || 5, icon: '⚒️', desc: 'Menempa pedang, baju zirah, dan artefak' },
                          { name: 'Feng Shui', level: player?.extendedStats?.artisanship?.fengShui || 5, icon: '🧭', desc: 'Geomansi dan formasi energi spiritual' },
                          { name: 'Kertas Jimat (Talismans)', level: player?.extendedStats?.artisanship?.talismans || 5, icon: '📜', desc: 'Menuliskan segel mantra pertahanan' },
                          { name: 'Herbalis (Herbology)', level: player?.extendedStats?.artisanship?.herbology || 5, icon: '🌿', desc: 'Mengenali dan memanen tanaman obat langka' },
                          { name: 'Penambang (Mining)', level: player?.extendedStats?.artisanship?.mining || 5, icon: '⛏️', desc: 'Mengekstraksi bijih besi dingin dan giok roh' },
                        ].map((art, idx) => (
                          <div key={idx} className="bg-[#181d2a] border border-[#2d3547] p-3 rounded-lg flex items-center gap-3">
                            <div className="text-2xl p-2 bg-[#10131d] rounded-md border border-[#384157]">
                              {art.icon}
                            </div>
                            <div>
                              <div className="font-bold text-amber-200 text-xs sm:text-sm">{art.name}</div>
                              <div className="text-[11px] text-amber-400 font-semibold">Tingkat Kemahiran: {art.level}</div>
                              <div className="text-[10px] text-stone-400 mt-0.5">{art.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: ITEM (EQUIPMENT SUMMARY) */}
                {activeTab === 'item' && (
                  <div className="space-y-4">
                    <div className="bg-[#121622] border border-[#3b3323] p-4 rounded-xl">
                      <h3 className="text-lg font-serif font-bold text-amber-300 mb-3 flex items-center gap-2">
                        <Package size={18} className="text-amber-400" />
                        Peralatan & Perlengkapan Tempur
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {[
                          { slot: 'Senjata', val: player?.equipment?.weapon, icon: '🗡️' },
                          { slot: 'Baju Zirah', val: player?.equipment?.armor, icon: '🥋' },
                          { slot: 'Helm', val: player?.equipment?.helmet, icon: '👑' },
                          { slot: 'Celana', val: player?.equipment?.pants, icon: '👖' },
                          { slot: 'Sepatu', val: player?.equipment?.boots, icon: '👢' },
                          { slot: 'Aksesoris', val: player?.equipment?.accessory, icon: '📿' },
                          { slot: 'Tunggangan', val: player?.equipment?.mount || player?.equippedMount, icon: '🐎' },
                        ].map((eq, idx) => (
                          <div key={idx} className="bg-[#171c29] border border-[#323c52] p-2.5 rounded-lg flex flex-col items-center text-center">
                            <span className="text-stone-400 text-[11px] mb-1">{eq.slot}</span>
                            <span className="text-2xl mb-1">{eq.icon}</span>
                            <span className="text-amber-200 font-semibold text-[11px] truncate w-full">
                              {typeof eq.val === 'object' && eq.val !== null ? (eq.val as any).name : (eq.val || 'Kosong')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: EXPERIENCE (CULTIVATION REALM PROGRESS) */}
                {activeTab === 'experience' && (
                  <div className="space-y-4">
                    <div className="bg-[#121622] border border-[#3b3323] p-4 rounded-xl font-serif">
                      <h3 className="text-lg font-bold text-amber-300 mb-3 flex items-center gap-2">
                        <Scroll size={18} className="text-amber-400" />
                        Jejak Perjalanan Dao & Terobosan
                      </h3>
                      <div className="space-y-3 text-xs sm:text-sm">
                        <div className="flex justify-between items-center p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <span className="text-stone-400">Ranah Kultivasi Saat Ini:</span>
                          <span className="font-bold text-amber-300 text-base">{realmName} (Tahap {stage})</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <span className="text-stone-400">Total Akumulasi Qi:</span>
                          <span className="font-bold text-sky-300">{player?.systemCultivation?.qi || 0} Intisari Qi</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <span className="text-stone-400">Kondisi Fondasi Dantian:</span>
                          <span className={`font-bold ${player?.systemCultivation?.isFlawedFoundation ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {player?.systemCultivation?.isFlawedFoundation ? 'Cacat / Rusak (Flawed Foundation)' : 'Murni & Sempurna (Flawless)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: RELATIONS (SECT, PETS, ALLIES) */}
                {activeTab === 'relations' && (
                  <div className="space-y-4">
                    <div className="bg-[#121622] border border-[#3b3323] p-4 rounded-xl font-serif">
                      <h3 className="text-lg font-bold text-amber-300 mb-3 flex items-center gap-2">
                        <Users size={18} className="text-amber-400" />
                        Ikatan Sosial & Sekutu
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <h4 className="font-bold text-amber-300 text-sm mb-1">Afiliasi Sekte</h4>
                          <p className="text-stone-300">{sectName}</p>
                          <p className="text-stone-500 text-[11px] mt-1">Status: Anggota Sah</p>
                        </div>
                        <div className="p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <h4 className="font-bold text-amber-300 text-sm mb-1">Pernikahan / Pasangan Dao</h4>
                          <p className="text-stone-300">
                            {player?.marriage?.status === 'married' ? 'Telah Memiliki Pasangan Dao' : 'Lajang (Single)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
