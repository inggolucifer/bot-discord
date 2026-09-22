'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2, Backpack, Lock, Info } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { motion } from 'framer-motion';
import { getRarityBorderClass } from '../profile/components/RarityHelpers';
import { StatDeltaHover } from '../profile/components/StatDeltaHover';
import Link from 'next/link';
import { checkClientKungfuRequirement } from '@/lib/kungfu';

export default function CharacterPage() {
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
      toast.show({ message: data.message ?? 'Item equipped', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error ?? 'Failed to equip item', type: 'error' });
    }
  });

  const unequipMutation = useMutation({
    mutationFn: async (slot: string) => {
      const res = await api.post('/equipment/unequip', { slot });
      return res.data;
    },
    onSuccess: (data) => {
      toast.show({ message: data.message ?? 'Item unequipped', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error ?? 'Failed to unequip item', type: 'error' });
    }
  });

  const [activeTab, setActiveTab] = useState<'peralatan' | 'kitab'>('peralatan');

  const unlearnMutation = useMutation({
    mutationFn: async (manualId: string) => {
      const res = await api.post('/player/manuals/unlearn', { manualId });
      return res.data;
    },
    onSuccess: (data) => {
      toast.show({ message: data.message ?? 'Manual berhasil dilupakan', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error ?? 'Gagal unlearn manual', type: 'error' });
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#c5a880]" />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="p-8 text-center text-red-400">
        <p>Gagal memuat profil karakter.</p>
      </div>
    );
  }

  const profile = profileData.player ?? profileData;
  const combatStats = profileData.combatStats ?? profile.combatStats ?? { hp: 0, atk: 0, def: 0, spd: 0 };
  const equipment = profile.equipment ?? {};

  const equipmentSlots = [
    { id: 'helmet', label: 'Helmet', icon: '🪖' },
    { id: 'weapon', label: 'Weapon', icon: '🗡️' },
    { id: 'armor', label: 'Armor', icon: '👕' },
    { id: 'accessory', label: 'Accessory', icon: '💍' },
    { id: 'pants', label: 'Pants', icon: '👖' },
    { id: 'boots', label: 'Boots', icon: '👢' },
    { id: 'talisman', label: 'Talisman', icon: '📜' },
    { id: 'artifact', label: 'Artifact', icon: '🔮' },
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

  const equippedInventoryIds = Object.values(equipment ?? {}).map(id => String(id));
  const equipableItems = profile.inventory?.filter((inv: any) => {
    if (inv.isEquipped) return false;
    if (!inv.itemId || !inv.itemId.category) return false;

    // Convert alias categories to slot key for validation
    const slotKey = inv.itemId.category === 'cloth' ? 'armor'
      : inv.itemId.category === 'accessories' ? (inv.itemId.capacityType === 'horse' ? 'mount' : 'accessory')
      : inv.itemId.category;

    const isValidCategory = ['weapon', 'armor', 'helmet', 'pants', 'boots', 'accessory', 'talisman', 'artifact', 'mount'].includes(slotKey);
    const isAlreadyEquipped = equippedInventoryIds.includes(String(inv._id));

    return isValidCategory && !isAlreadyEquipped;
  }) ?? [];

  const maxManualSlots = 5 + Math.floor((profile.kungfuSkills?.core || 0) / 5);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#c5a880] flex items-center gap-3">
          <span className="bg-[#c5a880]/10 p-2 rounded-lg border border-[#c5a880]/30">
            <Backpack className="w-6 h-6 text-amber-400" />
          </span>
          Peralatan & Status
        </h1>

        {/* Tabs Desktop & Mobile */}
        <div className="mt-4 sm:mt-0 flex border-b border-[#3b3322] w-full max-w-[300px]">
          <button
            className={`w-1/2 py-2 font-serif font-bold text-sm transition-colors ${activeTab === 'peralatan' ? 'text-amber-200 border-b-2 border-amber-400' : 'text-stone-500 hover:text-stone-300'}`}
            onClick={() => setActiveTab('peralatan')}
          >
            Peralatan
          </button>
          <button
            className={`w-1/2 py-2 font-serif font-bold text-sm transition-colors ${activeTab === 'kitab' ? 'text-amber-200 border-b-2 border-amber-400' : 'text-stone-500 hover:text-stone-300'}`}
            onClick={() => setActiveTab('kitab')}
          >
            Kitab & Jurus
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-b from-[#11141d] to-[#0d0f16] border border-[#c5a880]/30 rounded-xl p-4 sm:p-6 shadow-xl flex flex-col w-full h-full lg:min-h-[700px]">
        {activeTab === 'peralatan' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full h-full items-stretch flex-1">
          {/* Left Column: Equipped Items & Desktop Stats */}
          <div className="flex flex-col items-center space-y-6 order-1 h-full">
            <div className="w-full bg-[#181d2a]/80 p-4 rounded-xl border border-[#2e3748] shadow-inner">
               <h3 className="text-lg font-bold text-[#c5a880] w-full text-center border-b border-[#3b3322] pb-3 mb-4 font-serif">Equipped Items</h3>
               <div className="flex justify-center">
                 <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-[320px] relative">
                   {/* Decorative center line */}
                   <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-[#c5a880]/20 to-transparent -translate-x-1/2"></div>

                   {equipmentSlots.map(slot => {
                      const equippedId = equipment[slot.id];
                      const equippedInvItem = equippedId ? profile.inventory?.find((i:any) => String(i._id) === String(equippedId)) : null;
                      const itemData = equippedInvItem?.itemId;
                      const isMount = slot.id === 'mount';

                      return (
                        <motion.div
                           key={slot.id}
                           whileHover={{ scale: 1.02 }}
                           className={`relative bg-[#0d1017] border-2 rounded-xl p-3 h-24 sm:h-28 flex flex-col items-center justify-center cursor-pointer group transition-all shadow-md hover:shadow-[#c5a880]/10 ${isMount ? 'col-span-2 bg-gradient-to-r from-[#211812] via-[#100c09] to-[#211812] border-amber-900/40' : ''} ${equippedInvItem ? getRarityBorderClass(itemData?.rank) : 'border-[#2e3748] hover:border-[#c5a880]/50'}`}
                           onClick={() => equippedId && handleUnequip(slot.id)}
                        >
                          {equippedInvItem ? (
                             <>
                                <div className="text-2xl sm:text-3xl mb-1 drop-shadow-md">
                                  {itemData?.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={itemData.imageUrl} alt={itemData.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"/>
                                  ) : slot.icon}
                                </div>
                                <div className="text-xs sm:text-sm text-center text-stone-200 font-semibold truncate w-full px-1">{itemData?.name ?? 'Unknown'}</div>
                                <div className="text-[10px] sm:text-xs text-stone-500 mt-0.5 capitalize flex items-center gap-1 font-medium">
                                  {isMount ? (
                                    <span className="text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-900/50">
                                      {itemData?.staminaReduction ? `-${itemData.staminaReduction} STA/Langkah` : itemData?.travelSpeedBonus ? `+${Math.round(itemData.travelSpeedBonus * 100)}% Speed` : 'Efisiensi Stamina'}
                                    </span>
                                  ) : (
                                    slot.id
                                  )}
                                </div>
                                <div className="absolute inset-0 bg-red-950/90 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm border border-red-900/50">
                                   <span className="text-sm font-bold text-red-200 shadow-sm">Lepas {slot.label}</span>
                                </div>
                             </>
                          ) : (
                             <>
                                <div className="text-3xl sm:text-4xl opacity-20 mb-1.5 grayscale">{slot.icon}</div>
                                <div className="text-[10px] sm:text-xs text-stone-600 font-bold uppercase tracking-widest">{isMount ? '🐎 Slot Tunggangan' : slot.label}</div>
                                {isMount && <div className="text-[9px] sm:text-[10px] text-stone-600 mt-1">Stamina & Travel Speed</div>}
                             </>
                          )}
                        </motion.div>
                      );
                    })}
                 </div>
               </div>
            </div>

            {/* Desktop Only Stats Component */}
            <div className="w-full bg-[#181d2a]/80 p-5 rounded-xl border border-[#2e3748] flex-shrink-0 mt-auto hidden lg:block shadow-inner">
               <h3 className="text-sm text-amber-200/70 uppercase font-bold tracking-wider mb-4 border-b border-[#3b3322] pb-2 font-serif flex items-center gap-2">
                 <SwordsIcon /> Combat Stats
               </h3>
               <div className="grid grid-cols-1 gap-y-3 font-mono">
                  <StatRow label="HP" color="text-green-400" current={combatStats.hp ?? combatStats.maxHp ?? combatStats.currentHp ?? profile.currentHp ?? combatStats._base?.hp ?? 0} base={combatStats._base?.hp ?? combatStats.hp ?? 0} equip={combatStats._equip?.hp} />
                  <StatRow label="ATK" color="text-red-400" current={combatStats.atk ?? combatStats._base?.atk ?? 0} base={combatStats._base?.atk ?? combatStats.atk ?? 0} equip={combatStats._equip?.atk} />
                  <StatRow label="DEF" color="text-blue-400" current={combatStats.def ?? combatStats._base?.def ?? 0} base={combatStats._base?.def ?? combatStats.def ?? 0} equip={combatStats._equip?.def} />
                  <StatRow label="SPD" color="text-yellow-400" current={combatStats.spd ?? combatStats._base?.spd ?? 0} base={combatStats._base?.spd ?? combatStats.spd ?? 0} equip={combatStats._equip?.spd} />
               </div>
               <p className="text-[10px] text-stone-500 mt-4 pt-3 border-t border-[#3b3322] flex items-center gap-1.5">
                  <Info size={14} className="text-stone-400"/> Status di atas merupakan kalkulasi akhir dari <span className="text-amber-200/50">Base + Equip + Buff + Kultivasi</span>.
               </p>
            </div>
          </div>

          {/* Right Column: Inventory to Equip */}
          <div className="w-full flex flex-col order-2 h-full lg:border-l lg:border-[#2e3748] lg:pl-6">
             <div className="bg-[#181d2a]/80 p-4 rounded-xl border border-[#2e3748] shadow-inner h-full flex flex-col">
                <h3 className="text-lg font-bold text-[#c5a880] text-center w-full mb-4 border-b border-[#3b3322] pb-3 flex justify-between items-center px-2 font-serif">
                   <span>Available Equipment</span>
                   <span className="text-xs bg-[#0d1017] px-2.5 py-1 rounded-md text-amber-200/70 border border-[#c5a880]/20 font-sans shadow-sm">
                     {equipableItems.length} Item
                   </span>
                </h3>

                <div className="flex-1 overflow-y-auto max-h-[600px] lg:max-h-full custom-scrollbar pr-2 space-y-3 pb-2 h-full min-h-[300px]">
                   {equipableItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-stone-500 text-sm text-center py-16 px-4 border-2 border-dashed border-[#2e3748] rounded-xl bg-[#0d1017]/50">
                         <Backpack size={40} className="mb-4 text-stone-600 opacity-50" />
                         <p className="mb-3 text-stone-400 font-serif">Tidak ada equipment yang cocok di dalam tas.</p>
                         <Link href="/inventory" className="px-4 py-2 bg-[#c5a880]/10 hover:bg-[#c5a880]/20 border border-[#c5a880]/30 rounded-lg text-[#c5a880] hover:text-amber-200 transition-colors text-xs font-bold">
                           Periksa Inventory
                         </Link>
                      </div>
                   ) : (
                      equipableItems.map((inv: any) => {
                          const slotKey = inv.itemId?.category === 'cloth' ? 'armor'
                            : inv.itemId?.category === 'accessories' ? (inv.itemId?.capacityType === 'horse' ? 'mount' : 'accessory')
                            : inv.itemId?.category;
                          const equippedId = equipment[slotKey];
                          const equippedInvItem = equippedId ? profile.inventory?.find((i:any) => String(i._id) === String(equippedId)) : null;
                          const kungfuCheck = checkClientKungfuRequirement(profile.kungfuSkills, inv.itemId);

                          return (
                             <StatDeltaHover key={inv._id} itemHovered={inv} equippedItem={equippedInvItem}>
                                <motion.div
                                   whileHover={{ x: 4 }}
                                   className={`bg-[#0d1017] border-l-4 rounded-lg p-3 transition-all flex justify-between items-center group cursor-pointer shadow-sm hover:shadow-md ${kungfuCheck.allowed ? getRarityBorderClass(inv.itemId?.rank) : 'border-red-900/70 opacity-70 hover:opacity-90'}`}
                                   onClick={() => {
                                      if (!kungfuCheck.allowed) {
                                         toast.show({ message: kungfuCheck.reason ?? 'Syarat kemahiran kungfu belum terpenuhi.', type: 'error' });
                                         return;
                                      }
                                      handleEquip(inv._id);
                                   }}
                                >
                                   <div className="flex items-center gap-3.5 overflow-hidden">
                                      <div className={`w-12 h-12 bg-black/60 rounded-lg border-2 flex items-center justify-center text-2xl shrink-0 shadow-inner ${kungfuCheck.allowed ? getRarityBorderClass(inv.itemId?.rank) : 'border-red-900/50'}`}>
                                         {inv.itemId?.imageUrl ? (
                                           // eslint-disable-next-line @next/next/no-img-element
                                           <img src={inv.itemId.imageUrl} alt="" className="w-9 h-9 object-contain drop-shadow-md"/>
                                         ) : (slotKey === 'mount' ? '🐎' : '📦')}
                                      </div>
                                      <div className="min-w-0">
                                         <p className="text-sm font-bold text-stone-200 truncate">{inv.itemId?.name}</p>
                                         <p className="text-xs text-stone-400 capitalize flex items-center gap-1.5 mt-0.5">
                                            <span>{slotKey}</span>
                                            {inv.itemId?.category === 'mount' && (
                                               <span className="text-[10px] text-emerald-400/90 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/30 font-medium">
                                                  {inv.itemId?.staminaReduction ? `-${inv.itemId.staminaReduction} STA` : 'Bonus Kecepatan'}
                                               </span>
                                            )}
                                         </p>
                                         {!kungfuCheck.allowed && (
                                            <div className="text-[10px] text-red-400/90 font-semibold flex items-center gap-1 mt-1 bg-red-950/30 px-1.5 py-0.5 rounded w-max">
                                               <Lock size={10} className="shrink-0" />
                                               <span className="truncate">Syarat: {kungfuCheck.skillName ?? kungfuCheck.requiredSkill} Lv.{kungfuCheck.requiredLevel}</span>
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                     <button
                                        disabled={!kungfuCheck.allowed || equipMutation.isPending || unequipMutation.isPending}
                                        className={`${kungfuCheck.allowed ? 'bg-gradient-to-r from-[#c5a880] to-[#b0926b] text-black hover:from-[#d8c09d] hover:to-[#c5a880] shadow-[0_0_10px_rgba(197,168,128,0.2)]' : 'bg-red-950 text-red-300/50 cursor-not-allowed border border-red-900/30'} text-xs font-bold px-4 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-50 transition-all`}
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

          {/* Mobile Stats Component (Order 3) */}
          <div className="w-full bg-[#181d2a]/80 p-5 rounded-xl border border-[#2e3748] flex-shrink-0 block lg:hidden order-3 mt-2 shadow-inner">
             <h3 className="text-sm text-amber-200/70 uppercase font-bold tracking-wider mb-4 border-b border-[#3b3322] pb-2 font-serif flex items-center gap-2">
               <SwordsIcon /> Combat Stats
             </h3>
             <div className="grid grid-cols-1 gap-y-3 font-mono">
                <StatRow label="HP" color="text-green-400" current={combatStats.hp ?? combatStats.maxHp ?? combatStats.currentHp ?? profile.currentHp ?? combatStats._base?.hp ?? 0} base={combatStats._base?.hp ?? combatStats.hp ?? 0} equip={combatStats._equip?.hp} />
                <StatRow label="ATK" color="text-red-400" current={combatStats.atk ?? combatStats._base?.atk ?? 0} base={combatStats._base?.atk ?? combatStats.atk ?? 0} equip={combatStats._equip?.atk} />
                <StatRow label="DEF" color="text-blue-400" current={combatStats.def ?? combatStats._base?.def ?? 0} base={combatStats._base?.def ?? combatStats.def ?? 0} equip={combatStats._equip?.def} />
                <StatRow label="SPD" color="text-yellow-400" current={combatStats.spd ?? combatStats._base?.spd ?? 0} base={combatStats._base?.spd ?? combatStats.spd ?? 0} equip={combatStats._equip?.spd} />
                <StatRow label="COMBO" color="text-amber-400" current={(combatStats.comboRate || 5) + '%'} base={(combatStats._base?.comboRate || 5) + '%'} />
             </div>
             <p className="text-[10px] text-stone-500 mt-4 pt-3 border-t border-[#3b3322] flex items-center gap-1.5">
                <Info size={14} className="text-stone-400"/> Status akhir: Base + Equip + Buff.
             </p>
          </div>
        </div>
        ) : (
          /* Tab Kitab & Jurus */
          <div className="flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center bg-[#181d2a]/80 p-4 rounded-xl border border-[#2e3748] shadow-inner">
                <div>
                   <h3 className="text-lg font-bold text-[#c5a880] font-serif">Kitab Dipelajari</h3>
                   <p className="text-sm text-stone-400">Total slot aktif bergantung pada poin Core (Inti).</p>
                </div>
                <div className="text-right">
                   <div className="text-2xl font-bold font-mono text-amber-200">
                      {profile.manuals?.length || 0} <span className="text-stone-500 text-lg">/ {maxManualSlots}</span>
                   </div>
                   <div className="text-xs text-stone-400">Slot Terpakai</div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(!profile.manuals || profile.manuals.length === 0) ? (
                   <div className="col-span-full h-40 flex flex-col items-center justify-center text-stone-500 text-sm border-2 border-dashed border-[#2e3748] rounded-xl bg-[#0d1017]/50">
                      <span className="text-3xl mb-2">📜</span>
                      <p className="font-serif">Belum ada kitab yang dipelajari.</p>
                   </div>
                ) : (
                   profile.manuals.map((manual: any, idx: number) => (
                      <div key={idx} className="bg-[#0d1017] border border-[#2e3748] rounded-xl p-4 flex flex-col shadow-sm relative overflow-hidden group">
                         <div className="flex justify-between items-start mb-2">
                            <h4 className="text-amber-200 font-bold font-serif text-lg">{manual.name || 'Kitab Misterius'}</h4>
                            <span className="bg-[#181d2a] text-amber-400/80 px-2 py-0.5 rounded text-xs font-mono border border-[#3b3322]">
                               Lv.{manual.level}/{manual.maxLevel}
                            </span>
                         </div>
                         <p className="text-xs text-stone-400 mb-4 flex-1 line-clamp-3">{manual.description}</p>

                         <div className="pt-3 border-t border-[#2e3748] flex justify-end">
                            <button
                               disabled={unlearnMutation.isPending}
                               onClick={() => {
                                  if(confirm(`Yakin ingin melupakan kitab ${manual.name}? Tindakan ini tidak mengembalikan item kitab, XP, atau core points.`)) {
                                     unlearnMutation.mutate(manual.id);
                                  }
                               }}
                               className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 px-3 py-1.5 rounded transition-colors"
                            >
                               Lupakan Kitab
                            </button>
                         </div>
                      </div>
                   ))
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, color, current, base, equip }: { label: string, color: string, current: number | string, base: number | string, equip?: number | string }) {
  const currentVal = Math.floor(Number(current));
  const baseVal = Math.floor(Number(base));
  const equipVal = equip ? Math.floor(Number(equip)) : 0;

  return (
    <div className="flex justify-between items-center bg-[#0d1017]/60 p-2.5 rounded-lg border border-[#2e3748]/50 hover:bg-[#12151e] transition-colors">
       <span className="text-stone-400 font-bold w-12 text-sm">{label}</span>
       <div className="flex flex-col items-end text-sm">
          <span className={`font-bold ${color} text-lg drop-shadow-sm`}>{currentVal.toLocaleString()}</span>
          <span className="text-[10px] text-stone-500 font-sans tracking-wide">
             (Base {baseVal} {equipVal > 0 ? <span className="text-amber-200/70 ml-1">+ Equip {equipVal}</span> : ''})
          </span>
       </div>
    </div>
  );
}

function SwordsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
      <line x1="13" x2="19" y1="19" y2="13"/>
      <line x1="16" x2="20" y1="16" y2="20"/>
      <line x1="19" x2="21" y1="21" y2="19"/>
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/>
      <line x1="5" x2="9" y1="14" y2="18"/>
      <line x1="7" x2="4" y1="17" y2="20"/>
      <line x1="3" x2="5" y1="19" y2="21"/>
    </svg>
  );
}
