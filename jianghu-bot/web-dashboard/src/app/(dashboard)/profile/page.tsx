'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import FallbackImage from '@/components/FallbackImage';
import { 
  Loader2, Coins, Shield, Swords, Activity, MapPin, Zap, Info, Clock, 
  Backpack, Compass, Hammer, Sprout, Lock, Home, Award, Sparkles, User
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { motion } from 'framer-motion';
import { getRarityBorderClass } from './components/RarityHelpers';
import { StatDeltaHover } from './components/StatDeltaHover';
import Link from 'next/link';
import { Phase10Stats } from './components/Phase10Stats';
import { checkClientKungfuRequirement } from '@/lib/kungfu';
import StatGrid from '@/components/character/StatGrid';
import PlayerStatsModal from '@/components/modals/PlayerStatsModal';
import { useUIStore } from '@/lib/store';

export default function ProfilePage() {
  const { activeModal, setActiveModal } = useUIStore();

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ['player-profile-private'],
    queryFn: async () => {
      const res = await api.get('/player/profile');
      return res.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#c5a880]" />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="p-8 text-center text-red-400">
        <p>Gagal memuat profil.</p>
      </div>
    );
  }

  const profile = profileData.player ?? profileData;
  const combatStats = profileData.combatStats ?? profile.combatStats ?? { hp: 0, atk: 0, def: 0, spd: 0 };
  const equipment = profile.equipment ?? {};
  const currentEnergy = profileData.energy?.current ?? 0;
  const maxEnergy = profileData.maxEnergy ?? 100;
  const energyPercent = Math.min(100, (currentEnergy / maxEnergy) * 100);

  const currency = profile.currency ?? { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };

  const qi = Math.floor(Number(profile.systemCultivation?.qi) || 0);
  const stage = Math.floor(Number(profile.systemCultivation?.stage ?? profile.stage) || 0);
  const maxQi = Math.max(100, (stage + 1) * 100);
  const qiPercent = Math.min(100, Math.max(0, Math.floor((qi / maxQi) * 100)));
  const activeTitle = profile.activeTitle ?? 'Pendekar Pedang Surgawi';

  const mergedProfile = {
    ...profile,
    characterName: profile.characterName ?? 'Pendekar Jianghu',
    activeTitle,
    combatStats: profileData.combatStats ?? profile.combatStats ?? {},
    extendedStats: profile.extendedStats ?? profileData.extendedStats ?? {}
  };

  // Active Buffs Logic
  const now = new Date();
  const activeBuffs = (profile.activeBuffs ?? []).filter((b: any) => new Date(b.expiresAt) > now);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header Identitas & Qi Kultivasi */}
      <div className="bg-gradient-to-r from-[#141824] via-[#10131d] to-[#181c28] border-2 border-[#574730] rounded-xl p-4 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center md:items-start gap-5 relative overflow-hidden">
        {/* Decorative spiritual glow halo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#c5a880] overflow-hidden bg-black flex-shrink-0 shadow-[0_0_25px_rgba(197,168,128,0.35)]">
          {profile.avatarUrl ?? profile.characterImage ? (
            <FallbackImage 
              src={profile.avatarUrl ?? profile.characterImage ?? ''}
              alt={profile.characterName} 
              fallbackNode={<div className="w-full h-full flex items-center justify-center text-5xl">{profile.imageEmoji ?? '👤'}</div>}
            />
          ) : profile.resolvedBody ? (
            <div className="relative w-full h-full flex items-center justify-center bg-[#151922] overflow-hidden">
              {profile.resolvedBody.cloth && <img src={profile.resolvedBody.cloth} className="absolute inset-0 w-full h-full object-contain" style={{zIndex: 1}} />}
              {profile.resolvedBody.face && <img src={profile.resolvedBody.face} className="absolute inset-0 w-full h-full object-contain" style={{zIndex: 2}} />}
              {profile.resolvedBody.hair && <img src={profile.resolvedBody.hair} className="absolute inset-0 w-full h-full object-contain" style={{zIndex: 3}} />}
              {profile.resolvedBody.mask && <img src={profile.resolvedBody.mask} className="absolute inset-0 w-full h-full object-contain" style={{zIndex: 4}} />}
              {!profile.resolvedBody.face && !profile.resolvedBody.hair && !profile.resolvedBody.cloth && <div className="text-5xl">{profile.imageEmoji ?? '👤'}</div>}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">{profile.imageEmoji ?? '👤'}</div>
          )}
        </div>

        <div className="text-center md:text-left flex-1 space-y-2.5 z-10 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="text-2xl sm:text-3xl font-bold font-serif text-amber-100">{profile.characterName}</h2>
                {/* Lencana Gelar Pencapaian (Title Flexing Badge) */}
                <div className="px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-950/90 to-amber-900/60 border border-amber-500/70 text-amber-200 text-xs font-serif font-bold tracking-wider shadow-sm flex items-center gap-1.5">
                  <Award size={13} className="text-amber-400" />
                  <span>[{activeTitle}]</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-stone-400 mt-0.5 font-serif">
                {profile.sect ?? 'Tanpa Sekte (Rogue Cultivator)'}
              </p>
            </div>

            <button
              onClick={() => setActiveModal('stats')}
              className="self-center sm:self-start px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#2f2416] to-[#1e1911] hover:from-[#47361f] hover:to-[#2e261a] border border-[#c5a880]/70 text-amber-200 text-xs font-serif font-semibold shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <User size={14} className="text-amber-400" />
              <span>Lembar Status Lengkap</span>
            </button>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-sky-950/80 border border-sky-600/60 rounded px-2.5 py-1 text-xs text-sky-200 font-bold font-serif">
              <Zap size={12} className="text-sky-400" /> {profile.systemCultivation?.realm || profile.realm} (Tahap {profile.systemCultivation?.stage ?? profile.stage ?? 'Awal'})
            </span>
            {profile.systemCultivation?.isFlawedFoundation && (
              <span
                className="inline-flex items-center rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-semibold text-red-300 border border-red-700 shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-help"
                title="Penalti -5% All Stats karena menghancurkan fondasi fana secara paksa."
              >
                Fondasi Cacat
              </span>
            )}
          </div>

          {/* Resources Merged */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
             {/* Energy */}
             <div className="flex-1 bg-black/40 p-2 rounded border border-[#333]">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] text-green-400 uppercase font-bold tracking-wider flex items-center gap-1"><Activity size={10}/> Energy</span>
                   <span className="text-[10px] text-gray-300 font-bold">{Math.floor(currentEnergy)} / {maxEnergy}</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-700/50">
                    <div className="bg-green-500 h-1.5 transition-all duration-500" style={{ width: `${energyPercent}%` }}></div>
                </div>
             </div>
             {/* Currency */}
             <div className="flex-[2] bg-black/40 p-2 rounded border border-[#333] flex items-center justify-between">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1"><Coins size={10}/> Kekayaan</span>
                <div className="flex gap-2 text-xs font-bold text-gray-200">
                   <span className="flex items-center gap-0.5"><span className="text-cyan-400 text-[10px]">💎</span> {Math.floor(Number(currency.spirit) || 0).toLocaleString()}</span>
                   <span className="flex items-center gap-0.5"><span className="text-green-500 text-[10px]">🟢</span> {Math.floor(Number(currency.jade) || 0).toLocaleString()}</span>
                   <span className="flex items-center gap-0.5"><span className="text-yellow-400 text-[10px]">🟡</span> {Math.floor(Number(currency.gold) || 0).toLocaleString()}</span>
                   <span className="flex items-center gap-0.5"><span className="text-gray-300 text-[10px]">⚪</span> {Math.floor(Number(currency.silver) || 0).toLocaleString()}</span>
                   <span className="flex items-center gap-0.5"><span className="text-amber-600 text-[10px]">🟤</span> {Math.floor(Number(currency.copper) || 0).toLocaleString()}</span>
                </div>
             </div>
          </div>

          {/* Qi Cultivation Progress Bar */}
          <div className="bg-[#0b0e14]/80 p-2.5 rounded-lg border border-[#2e3748] max-w-xl">
            <div className="flex justify-between items-center text-xs font-serif mb-1">
              <span className="text-amber-300 font-semibold flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" /> Sirkulasi Inti Qi
              </span>
              <span className="text-stone-300 font-mono text-[11px] font-semibold">
                {qi} / {maxQi} ({qiPercent}%)
              </span>
            </div>
            <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-[#1f2636]">
              <div 
                className="bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-300 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                style={{ width: `${qiPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Navigation Row */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 font-serif">
          <Link href="/inventory" className="flex-1 min-w-[120px] bg-[#12151e] hover:bg-[#1c2230] border border-[#c5a880]/40 rounded-xl p-3 text-center transition-all shadow-md group">
              <Backpack className="mx-auto mb-2 text-[#c5a880] group-hover:scale-110 transition-transform" size={24} />
              <span className="text-xs sm:text-sm font-bold text-stone-200">Inventory</span>
          </Link>
          <Link href="/world" className="flex-1 min-w-[120px] bg-[#12151e] hover:bg-[#1c2230] border border-[#c5a880]/40 rounded-xl p-3 text-center transition-all shadow-md group">
              <MapPin className="mx-auto mb-2 text-[#c5a880] group-hover:scale-110 transition-transform" size={24} />
              <span className="text-xs sm:text-sm font-bold text-stone-200">Peta Dunia</span>
          </Link>
          <Link href="/cultivation" className="flex-1 min-w-[120px] bg-[#12151e] hover:bg-[#1c2230] border border-[#c5a880]/40 rounded-xl p-3 text-center transition-all shadow-md group">
              <Compass className="mx-auto mb-2 text-[#c5a880] group-hover:scale-110 transition-transform" size={24} />
              <span className="text-xs sm:text-sm font-bold text-stone-200">Kultivasi</span>
          </Link>
          <Link href="/assets" className="flex-1 min-w-[120px] bg-[#12151e] hover:bg-[#1c2230] border border-[#c5a880]/40 rounded-xl p-3 text-center transition-all shadow-md group">
              <div className="relative inline-block">
                <Home className="mx-auto mb-2 text-[#c5a880] group-hover:scale-110 transition-transform" size={24} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-stone-200 block">Lahan & Aset</span>
          </Link>
      </div>

      {/* 5 Atribut Fondasi Kultivasi (Five Pillars RPG Framework - Sesuai Foto 2) */}
      <div className="bg-gradient-to-b from-[#11141d] to-[#0d0f16] border-2 border-[#54432c] rounded-xl p-4 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.85)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3d311f] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-amber-200 tracking-wide">
              5 Pilar Fondasi Kultivasi (Five Pillars Framework)
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/50 text-amber-300 font-serif font-semibold">
              ✨ Spiritual Root & Artisanship Aktif
            </span>
          </div>
        </div>

        {/* 5-Pillar Attributes Grid: General, Combat, Martial Arts, Spiritual Root (6 Elemen), Artisanship (6 Profesi) */}
        <StatGrid player={mergedProfile} />
      </div>

      <div className="flex flex-col space-y-6 w-full mt-6">

        {/* Karakter & Talenta - Full Width */}
        <div className="w-full">
          <Phase10Stats />
        </div>

        {/* Artisanship - Full Width */}
        <div className="w-full">
            {/* Unified Artisanship & Kemahiran Profesi Section (Sistem Terpadu 1-to-1) */}
            <div className="bg-[#12151e]/90 border border-[#c5a880]/40 p-5 rounded-xl shadow-lg font-serif space-y-3">
               <div className="flex justify-between items-center border-b border-[#3b3322] pb-2.5">
                  <div className="flex items-center gap-2">
                     <Hammer size={16} className="text-amber-400" />
                     <h3 className="text-lg font-bold text-[#c5a880] uppercase tracking-wider">
                        Kemahiran Profesi & Artisanship (技艺)
                     </h3>
                  </div>
                  <span className="text-[11px] text-stone-400 font-sans">
                     Sistem Terpadu 1-to-1
                  </span>
               </div>
               
               <p className="text-[11px] text-stone-400 leading-relaxed">
                  Keahlian produksi dan pengrajin Jianghu terhubung langsung dengan Pilar Ke-5 Fondasi Kultivasi.
               </p>

               <div className="grid grid-cols-1 gap-y-2.5">
                  {[
                      { id: 'alchemy', name: 'Alkimia (Alchemy)', icon: '⚗️', artKey: 'alchemy', desc: 'Meracik pil obat dan intisari Qi' },
                      { id: 'smithing', name: 'Tempa (Forge / Smithing)', icon: '⚒️', artKey: 'forge', desc: 'Menempa pedang, baju zirah, dan perkakas' },
                      { id: 'farming', name: 'Herba & Tani (Herbology)', icon: '🌿', artKey: 'herbology', desc: 'Menanam dan memanen tanaman obat spiritual' },
                      { id: 'mining', name: 'Pertambangan (Mining)', icon: '⛏️', artKey: 'mining', desc: 'Mengekstraksi bijih besi dingin dan batu giok' },
                      { id: 'fishing', name: 'Memancing (Fishing)', icon: '🎣', artKey: 'fishing', desc: 'Menangkap ikan roh di perairan Jianghu' },
                      { id: 'cooking', name: 'Kuliner & Memasak (Cooking)', icon: '🍳', artKey: 'cooking', desc: 'Mengolah ransum dan masakan penambah stamina' },
                      { id: 'talismans', name: 'Penulisan Jimat (Talismans)', icon: '📜', artKey: 'talismans', desc: 'Menuliskan segel mantra pertahanan dan kertas jimat' }
                  ].map(prof => {
                      const profData = profile.professions?.[prof.id];
                      const artVal = mergedProfile.extendedStats?.artisanship?.[prof.artKey];
                      const isUnlocked = profData ? profData.isUnlocked : (artVal > 0);
                      const level = profData?.level ?? artVal ?? 1;
                      const exp = profData?.exp ?? 0;
                      const maxExp = Math.floor(50 * level + 15 * level * level);
                      const progress = profData ? Math.min(100, (exp / maxExp) * 100) : (artVal > 0 ? 100 : 0);

                      return (
                          <div key={prof.id} className="bg-[#181d2a] p-3 rounded-lg border border-[#2e374a] flex flex-col justify-center">
                              <div className="flex justify-between items-center mb-1.5">
                                  <div className="flex items-center gap-2.5">
                                      <span className="text-xl">{prof.icon}</span>
                                      <div>
                                          <span className="text-sm font-bold text-amber-200">{prof.name}</span>
                                          <div className="text-[10px] text-stone-400">{prof.desc}</div>
                                      </div>
                                  </div>
                                  {isUnlocked ? (
                                      <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-600/50 shadow-sm">
                                          Lv. {level}
                                      </span>
                                  ) : (
                                      <span className="text-[10px] font-bold text-stone-500 bg-[#0d1017] px-2 py-0.5 rounded border border-stone-800">
                                          Belum Terbuka
                                      </span>
                                  )}
                              </div>

                              {isUnlocked && profData ? (
                                  <div className="w-full mt-1">
                                      <div className="flex justify-between text-[10px] text-stone-400 mb-1 font-mono">
                                          <span>Progres Kemahiran</span>
                                          <span>{exp} / {maxExp} XP</span>
                                      </div>
                                      <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-[#2b3345]">
                                          <div
                                              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-1.5 transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                              style={{ width: `${progress}%` }}
                                          ></div>
                                      </div>
                                  </div>
                              ) : isUnlocked ? (
                                  <div className="text-[10px] text-amber-400/80 italic mt-1">Kemahiran aktif dari pemahaman fondasi Dao</div>
                              ) : (
                                  <div className="text-[10px] text-stone-500 italic mt-1">Latih atau pelajari di peta spasial dunia Jianghu</div>
                              )}
                          </div>
                      );
                  })}
               </div>
            </div>

        </div>

      </div>

      {/* Active Buffs - Full Width */}
      {activeBuffs.length > 0 && (
          <div className="w-full mt-6 bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-5 shadow-lg">
             <h3 className="text-sm text-[#c5a880] uppercase font-bold tracking-wider mb-3 border-b border-[#333] pb-2">Active Buffs</h3>
             <div className="flex flex-col gap-2">
                {activeBuffs.map((buff: any, idx: number) => {
                   const timeLeft = Math.max(0, new Date(buff.expiresAt).getTime() - now.getTime());
                   const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                   const mins = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

                   return (
                       <div key={idx} className="bg-indigo-900/30 border border-indigo-500/30 rounded px-3 py-2 flex justify-between items-center text-sm">
                           <span className="text-indigo-200 font-medium capitalize">{buff.buffType.replace('_', ' ')} <span className="text-green-400 font-bold ml-1">+{buff.value}</span></span>
                           <span className="text-gray-400 flex items-center gap-1"><Clock size={12}/> {hours > 0 ? `${hours}j ${mins}m` : `${mins}m`}</span>
                       </div>
                   );
                })}
             </div>
          </div>
      )}

      {/* Button Navigate to Peralatan - Full Width */}
      <div className="w-full mt-6 flex justify-center">
        <Link href="/character" className="px-6 py-2.5 bg-gradient-to-r from-[#2f2416] to-[#1e1911] hover:from-[#47361f] hover:to-[#2e261a] border border-[#c5a880]/70 rounded-lg shadow-md text-amber-200 font-serif font-bold text-sm transition-all active:scale-95 flex items-center gap-2">
          Buka Tab Karakter — Peralatan <span className="text-xl">→</span>
        </Link>
      </div>

      {/* Modal Lembar Status Pendekar */}
      {activeModal === 'stats' && <PlayerStatsModal />}
    </div>
  );
}
