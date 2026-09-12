'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import FallbackImage from '@/components/FallbackImage';
import { Loader2, Coins, Shield, Swords, Activity, MapPin, Zap, Info, Clock, Backpack, Compass, Hammer, Sprout } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { motion } from 'framer-motion';
import { getRarityBorderClass } from './components/RarityHelpers';
import { StatDeltaHover } from './components/StatDeltaHover';
import Link from 'next/link';

export default function ProfilePage() {
  const queryClient = useQueryClient();

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
  const combatStats = profileData.combatStats || { hp: 0, atk: 0, def: 0, spd: 0 };
  const equipment = profile.equipment || {};
  const currentEnergy = profileData.energy?.current || 0;
  const maxEnergy = profileData.maxEnergy || 100;
  const energyPercent = Math.min(100, (currentEnergy / maxEnergy) * 100);

  const currency = profile.currency || { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };

  const equipmentSlots = [
    { id: 'helmet', label: 'Helmet', icon: '🪖' },
    { id: 'weapon', label: 'Weapon', icon: '🗡️' },
    { id: 'armor', label: 'Armor', icon: '👕' },
    { id: 'accessory', label: 'Accessory', icon: '💍' },
    { id: 'pants', label: 'Pants', icon: '👖' },
    { id: 'boots', label: 'Boots', icon: '👢' }
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
    ['weapon', 'armor', 'helmet', 'pants', 'boots', 'accessories'].includes(inv.itemId?.category)
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header Identitas */}
      <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-6 shadow-lg flex flex-col md:flex-row items-center md:items-start gap-4">
         <div className="w-20 h-20 rounded-full border-2 border-[#c5a880] overflow-hidden bg-black flex-shrink-0">
            <FallbackImage src={profile.characterImage || ''} alt={profile.characterName} fallbackNode={<div className="w-full h-full flex items-center justify-center text-3xl">👤</div>} />
         </div>
         <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl font-bold text-gray-200">{profile.characterName}</h2>
            <p className="text-sm text-gray-400 mb-2">{profile.sect || 'Tanpa Sekte'}</p>
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
               <span className="inline-flex items-center gap-1 bg-blue-900/40 border border-blue-900/50 rounded px-2 py-1 text-xs text-blue-300 font-bold">
                  <Zap size={12} /> {profile.realm} (Tahap {profile.stage})
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
         </div>
      </div>

      {/* CTA Navigation Row */}
      <div className="flex flex-wrap gap-4 mb-6">
          <Link href="/inventory" className="flex-1 min-w-[120px] bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#c5a880]/30 rounded-lg p-3 text-center transition-colors group">
              <Backpack className="mx-auto mb-2 text-[#c5a880] group-hover:scale-110 transition-transform" size={24} />
              <span className="text-sm font-bold text-gray-300">Inventory</span>
          </Link>
          <Link href="/professions" className="flex-1 min-w-[120px] bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#c5a880]/30 rounded-lg p-3 text-center transition-colors group">
              <Hammer className="mx-auto mb-2 text-[#c5a880] group-hover:scale-110 transition-transform" size={24} />
              <span className="text-sm font-bold text-gray-300">Profesi</span>
          </Link>
          <Link href="/cultivation" className="flex-1 min-w-[120px] bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#c5a880]/30 rounded-lg p-3 text-center transition-colors group">
              <Compass className="mx-auto mb-2 text-[#c5a880] group-hover:scale-110 transition-transform" size={24} />
              <span className="text-sm font-bold text-gray-300">Kultivasi</span>
          </Link>
          <Link href="/professions/farming" className="flex-1 min-w-[120px] bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#c5a880]/30 rounded-lg p-3 text-center transition-colors group">
              <div className="relative inline-block">
                <Sprout className="mx-auto mb-2 text-[#c5a880] group-hover:scale-110 transition-transform" size={24} />
                {farmSummary.ready > 0 && (
                    <span className="absolute -top-2 -right-2 bg-green-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        Panen x{farmSummary.ready}
                    </span>
                )}
              </div>
              <span className="text-sm font-bold text-gray-300 block">Farming</span>
          </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Resources, Combat Stats, Equipment (Span 6) */}
        <div className="lg:col-span-6 space-y-6 flex flex-col">
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
                  <span className="flex items-center gap-1"><span className="text-cyan-400">💎</span> {currency.spirit?.toLocaleString() || 0}</span>
                  <span className="flex items-center gap-1"><span className="text-emerald-400">🟢</span> {currency.jade?.toLocaleString() || 0}</span>
                  <span className="flex items-center gap-1"><span className="text-yellow-400">🟡</span> {currency.gold?.toLocaleString() || 0}</span>
                  <span className="flex items-center gap-1"><span className="text-gray-300">⚪</span> {currency.silver?.toLocaleString() || 0}</span>
                  <span className="flex items-center gap-1"><span className="text-amber-600">🟤</span> {currency.copper?.toLocaleString() || 0}</span>
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

                   return (
                     <motion.div
                        key={slot.id}
                        whileHover={{ scale: 1.02 }}
                        className={`relative bg-black/60 border-2 rounded-lg p-3 h-24 flex flex-col items-center justify-center cursor-pointer group transition-colors ${equippedInvItem ? getRarityBorderClass(itemData?.rank) : 'border-[#444] hover:border-[#c5a880]/70'}`}
                        onClick={() => equippedId && handleUnequip(slot.id)}
                     >
                       {equippedInvItem ? (
                          <>
                             <div className="text-2xl mb-1">{itemData?.imageUrl ? <img src={itemData.imageUrl} alt={itemData.name} className="w-8 h-8 object-contain"/> : slot.icon}</div>
                             <div className="text-xs text-center text-gray-300 font-medium truncate w-full px-1">{itemData?.name || 'Unknown'}</div>
                             <div className="text-[10px] text-gray-500 mt-1 capitalize">{slot.id}</div>
                             <div className="absolute inset-0 bg-red-900/80 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-xs font-bold text-red-100">Click to Unequip</span>
                             </div>
                          </>
                       ) : (
                          <>
                             <div className="text-3xl opacity-20 mb-1">{slot.icon}</div>
                             <div className="text-xs text-gray-600 font-bold uppercase tracking-wide">{slot.label}</div>
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
                          <span className="font-bold text-green-400 text-lg">{combatStats.hp?.toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500">
                             (Base {combatStats._base?.hp || 0} {combatStats._equip?.hp ? `+ Equip ${combatStats._equip.hp}` : ''})
                          </span>
                       </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                       <span className="text-gray-400 font-bold w-12">ATK</span>
                       <div className="flex flex-col items-end text-sm">
                          <span className="font-bold text-red-400 text-lg">{combatStats.atk?.toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500">
                             (Base {combatStats._base?.atk || 0} {combatStats._equip?.atk ? `+ Equip ${combatStats._equip.atk}` : ''})
                          </span>
                       </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                       <span className="text-gray-400 font-bold w-12">DEF</span>
                       <div className="flex flex-col items-end text-sm">
                          <span className="font-bold text-blue-400 text-lg">{combatStats.def?.toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500">
                             (Base {combatStats._base?.def || 0} {combatStats._equip?.def ? `+ Equip ${combatStats._equip.def}` : ''})
                          </span>
                       </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                       <span className="text-gray-400 font-bold w-12">SPD</span>
                       <div className="flex flex-col items-end text-sm">
                          <span className="font-bold text-yellow-400 text-lg">{combatStats.spd?.toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500">
                             (Base {combatStats._base?.spd || 0} {combatStats._equip?.spd ? `+ Equip ${combatStats._equip.spd}` : ''})
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
                                  <div className="text-[10px] text-gray-500 italic mt-1 px-1">Buka di menu Profesi</div>
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
                       <Link href="/professions/farming" className="text-xs text-[#c5a880] hover:underline">Kelola &rarr;</Link>
                   </div>

                   {farmSummary.ready > 0 && (
                      <div className="mb-3 bg-green-900/40 border border-green-500/50 rounded p-2 text-center">
                          <span className="text-green-400 font-bold text-sm">Ada tanaman siap panen!</span>
                          <Link href="/professions/farming" className="ml-2 text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded transition">Panen Sekarang</Link>
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
                         const slotKey = inv.itemId?.category === 'cloth' ? 'armor' : inv.itemId?.category;
                         const equippedId = equipment[slotKey];
                         const equippedInvItem = equippedId ? profile.inventory?.find((i:any) => i._id === equippedId) : null;

                         return (
                            <StatDeltaHover key={inv._id} itemHovered={inv} equippedItem={equippedInvItem}>
                               <motion.div
                                  whileHover={{ x: 4 }}
                                  className={`bg-black/40 border-l-4 rounded p-3 transition-colors flex justify-between items-center group cursor-pointer ${getRarityBorderClass(inv.itemId?.rank)}`}
                                  onClick={() => handleEquip(inv._id)}
                               >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                     <div className={`w-10 h-10 bg-black rounded border-2 flex items-center justify-center text-xl shrink-0 ${getRarityBorderClass(inv.itemId?.rank)}`}>
                                        {inv.itemId?.imageUrl ? <img src={inv.itemId.imageUrl} alt="" className="w-8 h-8 object-contain"/> : '📦'}
                                     </div>
                                     <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-200 truncate">{inv.itemId?.name}</p>
                                        <p className="text-xs text-gray-500 capitalize">{slotKey}</p>
                                     </div>
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                     <button className="bg-[#c5a880] text-black text-xs font-bold px-3 py-1.5 rounded hover:bg-[#d8c09d]">
                                        Equip
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
    </div>
  );
}
