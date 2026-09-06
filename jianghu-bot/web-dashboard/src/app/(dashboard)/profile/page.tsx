"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import FallbackImage from '@/components/FallbackImage';
import { Loader2, Coins, Shield, Swords, Activity, MapPin, Zap, Info } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { motion } from 'framer-motion';
import { getRarityBorderClass } from './components/RarityHelpers';
import { StatDeltaHover } from './components/StatDeltaHover';

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ['player-profile-private'],
    queryFn: async () => {
      // Need a private profile endpoint or use existing to get full stats and inventory
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

  const profile = profileData.player || profileData; // Handle standard API nesting fallback
  const combatStats = profileData.combatStats || { hp: 0, atk: 0, def: 0, spd: 0 };
  const equipment = profile.equipment || {};

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

  // Filter unequiped equipable items
  const equipableItems = profile.inventory?.filter((inv: any) =>
    !inv.isEquipped &&
    ['weapon', 'armor', 'helmet', 'pants', 'boots', 'accessories'].includes(inv.itemId?.category)
  ) || [];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold font-serif text-[#c5a880] mb-8">Character & Equipment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Stats & Profile Info */}
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-6 shadow-lg">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full border-2 border-[#c5a880] overflow-hidden bg-black flex-shrink-0">
                   <FallbackImage src={profile.characterImage || ''} alt={profile.characterName} fallbackNode={<div className="w-full h-full flex items-center justify-center text-3xl">👤</div>} />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-gray-200">{profile.characterName}</h2>
                   <p className="text-sm text-gray-400">{profile.sect || 'Tanpa Sekte'}</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="bg-blue-900/20 p-3 rounded border border-blue-900/50">
                   <div className="flex items-center gap-2 mb-1">
                      <Zap size={16} className="text-blue-400" />
                      <span className="text-xs text-blue-400 uppercase font-bold tracking-wider">Kultivasi Sistem</span>
                   </div>
                   <div className="text-gray-200 font-bold flex items-center flex-wrap gap-2">
                      <span>{profile.systemCultivation?.realm || 'Fondasi Fana'} <span className="text-blue-300 font-normal text-sm ml-1">(Tahap {profile.systemCultivation?.stage || 0})</span></span>
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

                <div className="bg-black/40 p-4 rounded border border-[#333]">
                   <h3 className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-3 border-b border-[#333] pb-2">Combat Stats (Total)</h3>
                   <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      <div className="flex justify-between">
                         <span className="text-gray-500">HP</span>
                         <span className="font-bold text-green-400">{combatStats.hp?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-gray-500">ATK</span>
                         <span className="font-bold text-red-400">{combatStats.atk?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-gray-500">DEF</span>
                         <span className="font-bold text-blue-400">{combatStats.def?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-gray-500">SPD</span>
                         <span className="font-bold text-yellow-400">{combatStats.spd?.toLocaleString()}</span>
                      </div>
                   </div>
                   <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-[#333] flex items-center gap-1">
                      <Info size={12}/> Sudah termasuk buff, equipment, dan kultivasi.
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Middle Column: Paperdoll */}
        <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-6 shadow-lg flex flex-col items-center">
            <h3 className="text-lg font-bold text-[#c5a880] mb-6 w-full text-center border-b border-[#333] pb-2">Equipped Items</h3>

            <div className="grid grid-cols-2 gap-6 w-full max-w-xs relative">
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

                           {/* Hover tooltip hint */}
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
        </div>

        {/* Right Column: Inventory to Equip */}
        <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-lg p-6 shadow-lg flex flex-col h-[600px]">
            <h3 className="text-lg font-bold text-[#c5a880] mb-4 border-b border-[#333] pb-2 flex justify-between items-center">
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
  );
}
