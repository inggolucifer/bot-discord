'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const { activeModal, setActiveModal } = useUIStore();

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ['player-profile-private'],
    queryFn: async () => {
      const res = await api.get('/player/profile');
      return res.data.data;
    }
  });

  const equipMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      const res = await api.post('/equipment/equip', { inventoryId });
      return res.data;
    },
    onSuccess: (data) => {
      toast.show({ message: data.message || 'Item equipped', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Failed to equip item', type: 'error' });
    }
  });

  const unequipMutation = useMutation({
    mutationFn: async (slot: string) => {
      const res = await api.post('/equipment/unequip', { slot });
      return res.data;
    },
    onSuccess: (data) => {
      toast.show({ message: data.message || 'Item unequipped', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Failed to unequip item', type: 'error' });
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

  const profile = profileData.player || profileData;
  const combatStats = profileData.combatStats || profile.combatStats || { hp: 0, atk: 0, def: 0, spd: 0 };
  const equipment = profile.equipment || {};
  const currentEnergy = profileData.energy?.current || 0;
  const maxEnergy = profileData.maxEnergy || 100;
  const energyPercent = Math.min(100, (currentEnergy / maxEnergy) * 100);

  const currency = profile.currency || { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };

  const qi = Math.floor(Number(profile.systemCultivation?.qi) || 0);
  const stage = Math.floor(Number(profile.systemCultivation?.stage || profile.stage) || 0);
  const maxQi = Math.max(100, (stage + 1) * 100);
  const qiPercent = Math.min(100, Math.max(0, Math.floor((qi / maxQi) * 100)));
  const activeTitle = profile.activeTitle || 'Pendekar Pedang Surgawi';

  const mergedProfile = {
    ...profile,
    characterName: profile.characterName || 'Pendekar Jianghu',
    activeTitle,
    combatStats: profileData.combatStats || profile.combatStats || {},
    extendedStats: profile.extendedStats || profileData.extendedStats || {}
  };

  const equipmentSlots = [
    { id: 'helmet', label: 'Helmet', icon: '🪖' },
    { id: 'weapon', label: 'Weapon', icon: '🗡️' },
    { id: 'armor', label: 'Armor', icon: '👕' },
    { id: 'accessory', label: 'Accessory', icon: '💍' },
    { id: 'pants', label: 'Pants', icon: '👖' },
    { id: 'boots', label: 'Boots', icon: '👢' },
    { id: 'mount', label: 'Mount', icon: '🐎' }
  ];

  const handleEquip = (inventoryId: string) => {
    if (equipMutation.isPending || unequipMutation.isPending) return;
    equipMutation.mutate(inventoryId);
  };

  const handleUnequip = (slot: string) => {
    if (equipMutation.isPending || unequipMutation.isPending) return;
    unequipMutation.mutate(slot);
  };

  const equipableItems = profile.inventory?.filter((inv: any) =>
    !inv.isEquipped &&
    ['weapon', 'armor', 'helmet', 'pants', 'boots', 'accessories', 'mount'].includes(inv.itemId?.category)
  ) || [];

  // Farming Summary Logic
  let farmSummary = { total: 0, ready: 0, growing: 0, depleted: 0, empty: 0 };
  if (profile.professions?.farming?.farmPlots) {
      const now = new Date();
      farmSummary.total = profile.professions.farming.farmPlots.length;
      profile.professions.farming.farmPlots.forEach((plot: any) => {
          if (!plot.isUnlocked) return;
          if (plot.isDepleted) {
              if (new Date(plot.depletedUntil) > now) {
                  farmSummary.depleted++;
              } else {
                  farmSummary.empty++;
              }
          } else if (plot.cropId) {
              if (new Date(plot.harvestAt) <= now) {
                  farmSummary.ready++;
              } else {
                  farmSummary.growing++;
              }
          } else {
              farmSummary.empty++;
          }
      });
  }

  // Active Buffs Logic
  const now = new Date();
  const activeBuffs = (profile.activeBuffs || []).filter((b: any) => new Date(b.expiresAt) > now);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header Identitas & Qi Kultivasi */}
      <div className="bg-gradient-to-r from-[#141824] via-[#10131d] to-[#181c28] border-2 border-[#574730] rounded-xl p-4 sm:p-6 shadow-[0_4px_30px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center md:items-start gap-5 relative overflow-hidden">
        {/* Decorative spiritual glow halo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#c5a880] overflow-hidden bg-black flex-shrink-0 shadow-[0_0_25px_rgba(197,168,128,0.35)]">
          {profile.avatarUrl || profile.characterImage ? (
            <FallbackImage 
              src={profile.avatarUrl || profile.characterImage || ''} 
              alt={profile.characterName} 
              fallbackNode={<div className="w-full h-full flex items-center justify-center text-5xl">{profile.imageEmoji || '👤'}</div>} 
            />
          ) : profile.resolvedBody ? (
            <div className="relative w-full h-full flex items-center justify-center bg-[#151922] overflow-hidden">
              {profile.resolvedBody.cloth && <img src={profile.resolvedBody.cloth} className="absolute inset-0 w-full h-full object-contain" style={{zIndex: 1}} />}
              {profile.resolvedBody.face && <img src={profile.resolvedBody.face} className="absolute inset-0 w-full h-full object-contain" style={{zIndex: 2}} />}
              {profile.resolvedBody.hair && <img src={profile.resolvedBody.hair} className="absolute inset-0 w-full h-full object-contain" style={{zIndex: 3}} />}
              {profile.resolvedBody.mask && <img src={profile.resolvedBody.mask} className="absolute inset-0 w-full h-full object-contain" style={{zIndex: 4}} />}
              {!profile.resolvedBody.face && !profile.resolvedBody.hair && !profile.resolvedBody.cloth && <div className="text-5xl">{profile.imageEmoji || '👤'}</div>}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">{profile.imageEmoji || '👤'}</div>
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
                {profile.sect || 'Tanpa Sekte (Rogue Cultivator)'}
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
              <Zap size={12} className="text-sky-400" /> {profile.realm} (Tahap {profile.stage || 'Awal'})
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
                {farmSummary.ready > 0 && (
                    <span className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                        Panen x{farmSummary.ready}
                    </span>
                )}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Resources, Combat Stats, Equipment (Span 6) */}
        <div className="lg:col-span-6 space-y-6 flex flex-col">
          {/* Phase 10 Stats UI */}
          <Phase10Stats />

          {/* Resources */}
          <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-5 shadow-lg space-y-4">
            <h3 className="text-sm text-[#c5a880] uppercase font-bold tracking-wider border-b border-[#333] pb-2">Resources</h3>
            {/* Energy */}
            <div className="bg-black/40 p-3 rounded border border-[#333]">
               <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-green-400 uppercase font-bold tracking-wider flex items-center gap-1"><Activity size={14}/> Energy</span>
                  <span className="text-xs text-gray-300 font-bold">{Math.floor(currentEnergy)} / {maxEnergy}</span>
               </div>
               <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-700/50">
                   <div className="bg-green-500 h-2 transition-all duration-500" style={{ width: `${energyPercent}%` }}></div>
               </div>
            </div>

            {/* Currency */}
            <div className="bg-black/40 p-3 rounded border border-[#333]">
               <h3 className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1"><Coins size={14}/> Kekayaan</h3>
               <div className="flex flex-wrap gap-3 text-sm font-bold text-gray-200">
                  <span className="flex items-center gap-1"><span className="text-cyan-400">💎</span> {Math.floor(Number(currency.spirit) || 0).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><span className="text-emerald-400">🟢</span> {Math.floor(Number(currency.jade) || 0).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><span className="text-yellow-400">🟡</span> {Math.floor(Number(currency.gold) || 0).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><span className="text-gray-300">⚪</span> {Math.floor(Number(currency.silver) || 0).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><span className="text-amber-600">🟤</span> {Math.floor(Number(currency.copper) || 0).toLocaleString()}</span>
               </div>
            </div>
          </div>

          {/* Combat Stats & Equipment */}
          <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-6 shadow-lg flex flex-col items-center flex-1">
              <h3 className="text-lg font-bold text-[#c5a880] mb-6 w-full text-center border-b border-[#333] pb-2">Equipped Items</h3>
              <div className="grid grid-cols-2 gap-6 w-full max-w-xs relative mb-8">
                 {/* Decorative center line */}
                 <div className="absolute inset-y-0 left-1/2 w-px bg-[#333] -translate-x-1/2"></div>
                 {equipmentSlots.map(slot => {
                    const equippedId = equipment[slot.id];
                    const equippedInvItem = equippedId ? profile.inventory?.find((i:any) => i._id === equippedId) : null;
                    const itemData = equippedInvItem?.itemId;
                    const isMount = slot.id === 'mount';

                    return (
                      <motion.div
                         key={slot.id}
                         whileHover={{ scale: 1.02 }}
                         className={`relative bg-black/60 border-2 rounded-lg p-3 h-24 flex flex-col items-center justify-center cursor-pointer group transition-colors ${isMount ? 'col-span-2 bg-gradient-to-r from-amber-950/20 via-black/70 to-amber-950/20 border-amber-800/40' : ''} ${equippedInvItem ? getRarityBorderClass(itemData?.rank) : 'border-[#444] hover:border-[#c5a880]/70'}`}
                         onClick={() => equippedId && handleUnequip(slot.id)}
                      >
                        {equippedInvItem ? (
                           <>
                              <div className="text-2xl mb-1">{itemData?.imageUrl ? <img src={itemData.imageUrl} alt={itemData.name} className="w-8 h-8 object-contain"/> : slot.icon}</div>
                              <div className="text-xs text-center text-gray-300 font-medium truncate w-full px-1">{itemData?.name || 'Unknown'}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5 capitalize flex items-center gap-1">
                                {isMount ? (
                                  <span className="text-emerald-400 font-semibold">
                                    {itemData?.staminaReduction ? `-${itemData.staminaReduction} STA / Langkah` : itemData?.travelSpeedBonus ? `+${Math.round(itemData.travelSpeedBonus * 100)}% Speed` : 'Efisiensi Stamina'}
                                  </span>
                                ) : (
                                  slot.id
                                )}
                              </div>
                              <div className="absolute inset-0 bg-red-900/80 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <span className="text-xs font-bold text-red-100">Lepas {slot.label}</span>
                              </div>
                           </>
                        ) : (
                           <>
                              <div className="text-3xl opacity-20 mb-1">{slot.icon}</div>
                              <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">{isMount ? '🐎 Slot Tunggangan' : slot.label}</div>
                              {isMount && <div className="text-[9px] text-gray-600">Mengurangi stamina langkah</div>}
                           </>
                        )}
                      </motion.div>
                    );
                  })}
              </div>

              <div className="w-full bg-black/40 p-4 rounded border border-[#333]">
                 <h3 className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-3 border-b border-[#333] pb-2">Combat Stats</h3>
                 <div className="grid grid-cols-1 gap-y-3">
                    <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                       <span className="text-gray-400 font-bold w-12">HP</span>
                       <div className="flex flex-col items-end text-sm">
                          <span className="font-bold text-green-400 text-lg">{Math.floor(Number(combatStats.hp) || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500">
                             (Base {Math.floor(Number(combatStats._base?.hp) || 0)} {combatStats._equip?.hp ? `+ Equip ${Math.floor(Number(combatStats._equip.hp))}` : ''})
                          </span>
                       </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                       <span className="text-gray-400 font-bold w-12">ATK</span>
                       <div className="flex flex-col items-end text-sm">
                          <span className="font-bold text-red-400 text-lg">{Math.floor(Number(combatStats.atk) || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500">
                             (Base {Math.floor(Number(combatStats._base?.atk) || 0)} {combatStats._equip?.atk ? `+ Equip ${Math.floor(Number(combatStats._equip.atk))}` : ''})
                          </span>
                       </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                       <span className="text-gray-400 font-bold w-12">DEF</span>
                       <div className="flex flex-col items-end text-sm">
                          <span className="font-bold text-blue-400 text-lg">{Math.floor(Number(combatStats.def) || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500">
                             (Base {Math.floor(Number(combatStats._base?.def) || 0)} {combatStats._equip?.def ? `+ Equip ${Math.floor(Number(combatStats._equip.def))}` : ''})
                          </span>
                       </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                       <span className="text-gray-400 font-bold w-12">SPD</span>
                       <div className="flex flex-col items-end text-sm">
                          <span className="font-bold text-yellow-400 text-lg">{Math.floor(Number(combatStats.spd) || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500">
                             (Base {Math.floor(Number(combatStats._base?.spd) || 0)} {combatStats._equip?.spd ? `+ Equip ${Math.floor(Number(combatStats._equip.spd))}` : ''})
                          </span>
                       </div>
                    </div>
                 </div>
                 <p className="text-[10px] text-gray-500 mt-3 pt-2 border-t border-[#333] flex items-center gap-1">
                    <Info size={12}/> Sudah termasuk buff, equip, dan kultivasi.
                 </p>
              </div>
          </div>
        </div>

        {/* Right Column: Active Buffs, Professions, Farming Summary, Available Equip (Span 6) */}
        <div className="lg:col-span-6 space-y-6 flex flex-col">

            {/* Buffs */}
            {activeBuffs.length > 0 && (
                <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-5 shadow-lg">
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

            {/* Profession Skills Section */}
            <div className="bg-[#1a1a1a] border border-[#c5a880]/30 p-5 rounded-lg shadow-lg">
               <h3 className="text-sm text-[#c5a880] uppercase font-bold tracking-wider mb-3 border-b border-[#333] pb-2">Kemahiran Profesi</h3>
               <div className="grid grid-cols-1 gap-y-3">
                  {[
                      { id: 'farming', name: 'Bertani', icon: '🌾' },
                      { id: 'fishing', name: 'Memancing', icon: '🎣' },
                      { id: 'cooking', name: 'Memasak', icon: '🍳' },
                      { id: 'alchemy', name: 'Alkimia', icon: '⚗️' },
                      { id: 'smithing', name: 'Menempa', icon: '🔨' }
                  ].map(prof => {
                      const profData = profile.professions?.[prof.id];
                      const isUnlocked = profData?.isUnlocked;
                      const level = profData?.level || 1;
                      const exp = profData?.exp || 0;
                      // Correct EXP formula: Math.floor(50 * level + 15 * level * level)
                      const maxExp = Math.floor(50 * level + 15 * level * level);
                      const progress = Math.min(100, (exp / maxExp) * 100);

                      return (
                          <div key={prof.id} className="bg-gray-800/30 p-2.5 rounded border border-gray-700/50 flex flex-col justify-center">
                              <div className="flex justify-between items-center mb-1.5">
                                  <div className="flex items-center gap-2">
                                      <span className="text-lg">{prof.icon}</span>
                                      <span className="text-sm font-bold text-gray-300">{prof.name}</span>
                                  </div>
                                  {isUnlocked ? (
                                      <span className="text-xs font-bold text-amber-500">Lv. {level}</span>
                                  ) : (
                                      <span className="text-[10px] font-bold text-gray-500 bg-gray-900 px-2 py-0.5 rounded border border-gray-700">Terkunci</span>
                                  )}
                              </div>

                              {isUnlocked ? (
                                  <div className="w-full">
                                      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 px-1">
                                          <span>EXP</span>
                                          <span>{exp} / {maxExp}</span>
                                      </div>
                                      <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-700/50">
                                          <div
                                              className="bg-amber-500 h-1.5 transition-all duration-500"
                                              style={{ width: `${progress}%` }}
                                          ></div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="text-[10px] text-gray-500 italic mt-1 px-1">Tingkatkan di Peta Spasial Dunia</div>
                              )}
                          </div>
                      );
                  })}
               </div>
            </div>

            {/* Farming Summary */}
            {profile.professions?.farming?.isUnlocked && (
                <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-5 shadow-lg">
                   <div className="flex justify-between items-center mb-3 border-b border-[#333] pb-2">
                       <h3 className="text-sm text-[#c5a880] uppercase font-bold tracking-wider">Status Ladang</h3>
                       <Link href="/world" className="text-xs text-[#c5a880] hover:underline">Kelola di Peta &rarr;</Link>
                   </div>

                   {farmSummary.ready > 0 && (
                      <div className="mb-3 bg-green-900/40 border border-green-500/50 rounded p-2 text-center">
                          <span className="text-green-400 font-bold text-sm">Ada tanaman siap panen!</span>
                          <Link href="/world" className="ml-2 text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded transition">Panen di Peta</Link>
                      </div>
                   )}

                   <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                       <div className="bg-green-900/30 border border-green-700/50 rounded py-2 text-green-400">
                           <div className="text-xl mb-1">{farmSummary.ready}</div>
                           <div className="text-[10px] uppercase">Ready</div>
                       </div>
                       <div className="bg-blue-900/30 border border-blue-700/50 rounded py-2 text-blue-400">
                           <div className="text-xl mb-1">{farmSummary.growing}</div>
                           <div className="text-[10px] uppercase">Tumbuh</div>
                       </div>
                       <div className="bg-gray-800/50 border border-gray-600/50 rounded py-2 text-gray-300">
                           <div className="text-xl mb-1">{farmSummary.empty}</div>
                           <div className="text-[10px] uppercase">Kosong</div>
                       </div>
                       <div className="bg-red-900/30 border border-red-700/50 rounded py-2 text-red-400">
                           <div className="text-xl mb-1">{farmSummary.depleted}</div>
                           <div className="text-[10px] uppercase">Gersang</div>
                       </div>
                   </div>
                </div>
            )}

            {/* Inventory to Equip */}
            <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-5 shadow-lg flex flex-col flex-1 min-h-[300px]">
                <h3 className="text-sm font-bold text-[#c5a880] uppercase tracking-wider mb-4 border-b border-[#333] pb-2 flex justify-between items-center">
                   <span>Available Equipment</span>
                   <span className="text-xs bg-black/50 px-2 py-1 rounded text-gray-400 border border-[#333]">{equipableItems.length} items</span>
                </h3>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                   {equipableItems.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center">
                         Tidak ada equipment yang bisa dipakai di inventory.
                      </div>
                   ) : (
                      equipableItems.map((inv: any) => {
                          const slotKey = inv.itemId?.category === 'cloth' ? 'armor' 
                            : inv.itemId?.category === 'accessories' ? (inv.itemId?.capacityType === 'horse' ? 'mount' : 'accessory')
                            : inv.itemId?.category;
                          const equippedId = equipment[slotKey];
                          const equippedInvItem = equippedId ? profile.inventory?.find((i:any) => i._id === equippedId) : null;
                          const kungfuCheck = checkClientKungfuRequirement(profile.kungfuSkills, inv.itemId);

                          return (
                             <StatDeltaHover key={inv._id} itemHovered={inv} equippedItem={equippedInvItem}>
                                <motion.div
                                   whileHover={{ x: 4 }}
                                   className={`bg-black/40 border-l-4 rounded p-3 transition-colors flex justify-between items-center group cursor-pointer ${kungfuCheck.allowed ? getRarityBorderClass(inv.itemId?.rank) : 'border-red-500/70 opacity-80'}`}
                                   onClick={() => {
                                      if (!kungfuCheck.allowed) {
                                         toast.show({ message: kungfuCheck.reason || 'Syarat kemahiran kungfu belum terpenuhi.', type: 'error' });
                                         return;
                                      }
                                      handleEquip(inv._id);
                                   }}
                                >
                                   <div className="flex items-center gap-3 overflow-hidden">
                                      <div className={`w-10 h-10 bg-black rounded border-2 flex items-center justify-center text-xl shrink-0 ${kungfuCheck.allowed ? getRarityBorderClass(inv.itemId?.rank) : 'border-red-500'}`}>
                                         {inv.itemId?.imageUrl ? <img src={inv.itemId.imageUrl} alt="" className="w-8 h-8 object-contain"/> : (slotKey === 'mount' ? '🐎' : '📦')}
                                      </div>
                                      <div className="min-w-0">
                                         <p className="text-sm font-bold text-gray-200 truncate">{inv.itemId?.name}</p>
                                         <p className="text-xs text-gray-500 capitalize flex items-center gap-1.5">
                                            <span>{slotKey}</span>
                                            {inv.itemId?.category === 'mount' && (
                                               <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1 rounded border border-emerald-800/40">
                                                  {inv.itemId?.staminaReduction ? `-${inv.itemId.staminaReduction} Stamina` : 'Hemat Stamina'}
                                               </span>
                                            )}
                                         </p>
                                         {!kungfuCheck.allowed && (
                                            <div className="text-[10px] text-red-400 font-semibold flex items-center gap-1 mt-0.5">
                                               <Lock size={10} className="shrink-0" />
                                               <span className="truncate">Butuh {kungfuCheck.skillName || kungfuCheck.requiredSkill} Lv.{kungfuCheck.requiredLevel}</span>
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                     <button 
                                        disabled={!kungfuCheck.allowed}
                                        className={`${kungfuCheck.allowed ? 'bg-[#c5a880] text-black hover:bg-[#d8c09d]' : 'bg-red-900/60 text-red-200 cursor-not-allowed'} text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1`}
                                     >
                                        {!kungfuCheck.allowed && <Lock size={12} />}
                                        {kungfuCheck.allowed ? 'Equip' : 'Terkunci'}
                                     </button>
                                  </div>
                               </motion.div>
                            </StatDeltaHover>
                         );
                      })
                   )}
                </div>
            </div>

        </div>

      </div>

      {/* Modal Lembar Status Pendekar */}
      {activeModal === 'stats' && <PlayerStatsModal />}
    </div>
  );
}
