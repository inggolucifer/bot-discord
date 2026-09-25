'use client';

import { Package, Search, Filter, Hammer, Loader2, XCircle, Sparkles, Scroll, Shield, Layers, ArrowRight } from "lucide-react";
import FallbackImage from "@/components/FallbackImage";
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getRarityColor, getRarityTextClass } from '@/lib/rarity';
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Interface for API data
interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  rarity: string;
  quantity: number;
  price: number;
  imageUrl: string | null;
  emoji: string;
  effectType?: string;
  effectValue?: number;
  effectDurationMinutes?: number;
  effectTierGate?: number;
  toolType?: string;
  durability?: number;
  weaponType?: string;
  requiredKungfuSkill?: string;
  requiredKungfuLevel?: number;
}

const getHumanReadableEffect = (item: InventoryItem) => {
  if (item.name.startsWith('Blueprint:')) return "Unlock resep signature di Profesi";
  if (item.effectType === 'energy_restore') return `Memulihkan ${item.effectValue || ''} Energy`;
  if (item.effectType === 'combat_buff_atk') return `Buff ATK ${item.effectValue ? '+'+item.effectValue : ''}`;
  if (item.effectType === 'combat_buff_def') return `Buff DEF ${item.effectValue ? '+'+item.effectValue : ''}`;
  if (item.effectType === 'combat_buff_hp') return `Buff HP ${item.effectValue ? '+'+item.effectValue : ''}`;
  if (item.effectType === 'breakthrough_success_bonus') return `Bonus peluang terobosan ${item.effectValue ? '+'+item.effectValue+'%' : ''}`;
  if (item.effectType === 'farm_grow_speed') return "Percepat pertumbuhan tanaman (pakai di Farming)";
  if (item.effectType === 'exp_bonus_short') return `Bonus EXP ${item.effectValue ? '+'+item.effectValue+'%' : ''}`;
  if (item.effectType) return `${item.effectType.replace(/_/g, ' ')} ${item.effectValue ? '+'+item.effectValue : ''}`;
  return '';
};

export default function InventoryPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryWeight, setInventoryWeight] = useState<number>(0);
  const [carryCapacity, setCarryCapacity] = useState<number>(0);

  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [itemToDiscard, setItemToDiscard] = useState<InventoryItem | null>(null);
  const [discardQuantity, setDiscardQuantity] = useState(1);

  const [useConfirmModalOpen, setUseConfirmModalOpen] = useState(false);
  const [itemToUse, setItemToUse] = useState<InventoryItem | null>(null);
  const [itemDetailModalOpen, setItemDetailModalOpen] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Meta data states
  const [maxSlots, setMaxSlots] = useState(50);

  // Filter/Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeRank, setActiveRank] = useState<string>('all');

  // Crafting states
  interface RecipeMaterial {
    itemId: string;
    name: string;
    itemName?: string;
    quantity: number;
    owned: number;
  }
  interface Recipe {
    recipeName: string;
    materials: RecipeMaterial[];
    resultQuantity: number;
    description: string;
    resultItemName?: string;
  }
  interface CraftingStation {
    id: string;
    name: string;
    recipes: Recipe[];
    isUnderConstruction?: boolean;
  }
  const [craftingStations, setCraftingStations] = useState<CraftingStation[]>([]);
  const [craftModalOpen, setCraftModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedRecipe, setSelectedRecipe] = useState<string>('');
  const [craftTimes, setCraftTimes] = useState<number>(1);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'error'|'success', text: string}|null>(null);

  const handleUseItem = async () => {
    if (!itemToUse) return;
    setActionLoading(true);
    try {
      const res = await api.post('/inventory/use-consumable', { itemId: itemToUse.id });
      let extraMessage = '';
      if (res.data.effectsApplied && res.data.effectsApplied.length > 0) {
        const blueprintEffect = res.data.effectsApplied.find((e: string) => e.startsWith('blueprint_unlocked:'));
        if (blueprintEffect) {
           const blueprintName = blueprintEffect.split(':')[1];
           extraMessage = `\nResep terbuka: ${blueprintName.replace('Blueprint: ', '')}`;
        } else {
           const energyEffect = res.data.effectsApplied.find((e: string) => e.startsWith('energy_restored_'));
           if (energyEffect) {
              const energyVal = energyEffect.split('_')[2];
              extraMessage = `\n(Energy bertambah ${energyVal})`;
           }
        }
      }
      toast.show({ message: (res.data.message || 'Item berhasil digunakan.') + extraMessage, type: 'success' });
      setUseConfirmModalOpen(false);
      setItemToUse(null);
      fetchInventoryAndRecipes();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err: any) {
      toast.show({ message: err.response?.data?.error || 'Gagal menggunakan item.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!itemToDiscard) return;
    setActionLoading(true);
    try {
      await api.post('/inventory/discard', { itemId: itemToDiscard.id, quantity: discardQuantity });
      toast.show({ message: `Berhasil membuang ${discardQuantity}x ${itemToDiscard.name}`, type: 'success' });
      setDiscardModalOpen(false);
      setItemToDiscard(null);
      setDiscardQuantity(1);
      fetchInventoryAndRecipes();
    } catch (err: any) {
      toast.show({ message: err.response?.data?.error || 'Gagal membuang item.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUseLawManual = async (item: InventoryItem) => {
    setActionLoading(true);
    try {
      if (item.category === 'law') {
        const res = await api.post('/inventory/use-law', { itemId: item.id });
        toast.show({ message: res.data.message || 'Berhasil mempelajari Hukum Alam', type: 'success' });
      } else if (item.category === 'manual') {
        const res = await api.post('/inventory/use-manual', { itemId: item.id });
        toast.show({ message: res.data.message || 'Berhasil mulai membaca Manual', type: 'success' });
      }
      fetchInventoryAndRecipes();
    } catch (err: any) {
      toast.show({ message: err.response?.data?.error || 'Gagal mempelajari kitab', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchInventoryAndRecipes = async () => {
      try {
        const [invRes, craftRes, profileRes] = await Promise.all([
            api.get('/inventory'),
            api.get('/inventory/craft-recipes').catch(() => ({ data: { data: [] } })),
            api.get('/player/profile').catch(() => ({ data: { data: {} } }))
        ]);
        if (profileRes.data && profileRes.data.data) {
            setInventoryWeight(profileRes.data.data.inventoryWeight || 0);
            setCarryCapacity(profileRes.data.data.carryCapacity || 0);
        }

        setInventory(invRes.data.data || []);
        if (invRes.data.meta) {
            setMaxSlots(invRes.data.meta.maxSlots || 50);
        }
        setCraftingStations(craftRes.data.data || []);
      } catch (err: unknown) {
        console.error(err);
        setError((err as any).response?.data?.error || 'Gagal memuat inventory.');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (!user) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    setTimeout(() => fetchInventoryAndRecipes(), 0);
  }, [user]);

  // Category classification helper
  const getItemCategoryBucket = (item: InventoryItem): string => {
    const isBlueprint = item.name.startsWith('Blueprint:');
    const isPupuk = item.effectType === 'farm_grow_speed';
    const isLawOrManual = item.category === 'law' || item.category === 'manual';
    const isTool = item.category === 'tool' || item.toolType != null;
    const isEquipment = ['weapon', 'cloth', 'armor', 'accessories', 'artifact', 'mount'].includes(item.category) || ['weapon', 'cloth', 'accessories', 'artifact'].includes(item.type);
    const isConsumable = !isPupuk && !isLawOrManual && !isBlueprint && (item.category === 'consume' || item.category === 'pill' || item.effectType != null);

    if (isBlueprint) return 'blueprint';
    if (isLawOrManual) return 'manual';
    if (isTool) return 'tools';
    if (isEquipment) return 'equipment';
    if (isConsumable || isPupuk) return 'consumable';
    return 'material';
  };

  // Compute category counts
  const categoryCounts = {
    all: inventory.length,
    equipment: inventory.filter(i => getItemCategoryBucket(i) === 'equipment').length,
    consumable: inventory.filter(i => getItemCategoryBucket(i) === 'consumable').length,
    manual: inventory.filter(i => getItemCategoryBucket(i) === 'manual').length,
    material: inventory.filter(i => getItemCategoryBucket(i) === 'material').length,
    tools: inventory.filter(i => getItemCategoryBucket(i) === 'tools').length,
    blueprint: inventory.filter(i => getItemCategoryBucket(i) === 'blueprint').length,
  };

  // Derived filtered items
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesRank = true;
    if (activeRank !== 'all') {
      matchesRank = (item.rarity || "").toLowerCase() === activeRank.toLowerCase();
    }

    let matchesCategory = true;
    if (activeCategory !== 'all') {
      matchesCategory = getItemCategoryBucket(item) === activeCategory;
    }

    return matchesSearch && matchesCategory && matchesRank;
  });

  const handleCraft = async () => {
      if(!selectedStation || !selectedRecipe) return;
      setActionLoading(true);
      setActionMessage(null);
      try {
          const res = await api.post('/inventory/craft', {
              assetId: selectedStation,
              recipeName: selectedRecipe,
              times: craftTimes
          });
          setActionMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchInventoryAndRecipes(), 0); // Refresh inventory
      } catch (err) {
          const error = err as { response?: { data?: { error?: string } } };
          setActionMessage({ type: 'error', text: error.response?.data?.error || 'Gagal melakukan crafting.' });
      } finally {
          setActionLoading(false);
      }
  };

  const getSelectedRecipeObj = (): Recipe | null => {
      if(!selectedStation || !selectedRecipe) return null;
      const station = craftingStations.find(s => s.id === selectedStation);
      if(!station) return null;
      return station.recipes.find((r: Recipe) => r.recipeName === selectedRecipe) || null;
  };

  const categories = [
    { id: 'all', label: 'Semua', count: categoryCounts.all, icon: Package },
    { id: 'equipment', label: 'Peralatan', count: categoryCounts.equipment, icon: Shield },
    { id: 'consumable', label: 'Pil & Obat', count: categoryCounts.consumable, icon: Sparkles },
    { id: 'manual', label: 'Kitab Jurus', count: categoryCounts.manual, icon: Scroll },
    { id: 'material', label: 'Material', count: categoryCounts.material, icon: Layers },
    { id: 'tools', label: 'Alat', count: categoryCounts.tools, icon: Hammer },
    { id: 'blueprint', label: 'Resep', count: categoryCounts.blueprint, icon: Filter },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">

      {/* Header Banner - Murim Qiankun Bag Aesthetic */}
      <div className="bg-gradient-to-r from-[#121622] via-[#0d1017] to-[#121622] border border-[#c5a880]/30 rounded-xl p-3.5 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#2b2014] to-[#120e09] border border-[#c5a880]/60 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(197,168,128,0.25)] shrink-0">
            <Package className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold font-serif text-amber-200">
                Gudang & Tas Pusaka
              </h1>
              <span className="text-[10px] font-serif px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 hidden sm:inline">
                乾坤袋
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Penyimpanan bekal, pil spiritual, kitab esoteris, dan material Jianghu
            </p>
          </div>
        </div>

        {/* Meters & Action Area */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Capacity Meter */}
          <div className="flex-1 sm:flex-initial flex flex-col justify-center bg-[#090c13] px-3 py-2 rounded-lg border border-[#2b3345] min-w-[130px]">
            <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-serif mb-1">
              <span className="text-stone-400">Slot Terpakai:</span>
              <span className="font-mono font-bold text-amber-300">{inventory.length} / {maxSlots}</span>
            </div>
            <div className="w-full bg-[#1b2230] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full transition-all"
                style={{ width: `${Math.min(100, (inventory.length / (maxSlots || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Weight Indicator */}
          {carryCapacity > 0 && (
            <div className="hidden xs:flex flex-col justify-center bg-[#090c13] px-3 py-2 rounded-lg border border-[#2b3345] min-w-[110px]">
              <span className="text-[10px] text-stone-400 font-serif">Berat Barang:</span>
              <span className="font-mono font-bold text-stone-200 text-xs">{inventoryWeight} / {carryCapacity}</span>
            </div>
          )}

          {/* Crafting Button */}
          <Button
            variant="outline"
            onClick={() => { setCraftModalOpen(true); setActionMessage(null); }}
            className="border-[#c5a880]/50 hover:border-amber-400 text-amber-200 hover:bg-[#c5a880]/15 text-xs font-serif font-bold h-9 sm:h-10 px-3 sm:px-4 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Hammer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span>Tempa / Craft</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar (Wrapping & Responsive - Zero Horizontal Scroll!) */}
      <div className="bg-[#0b0e15] border border-[#2b3345] p-3 sm:p-4 rounded-xl shadow-md space-y-3">
        {/* Category Chips (Naturally wraps on mobile without needing horizontal scroll) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-serif transition-all cursor-pointer select-none',
                  isActive
                    ? 'bg-[#c5a880]/20 text-amber-200 border border-[#c5a880]/70 shadow-[0_0_12px_rgba(197,168,128,0.2)] font-bold'
                    : 'bg-[#121622] text-stone-400 hover:text-stone-200 hover:bg-[#1a2030] border border-[#252e40]'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-amber-300' : 'text-stone-400')} />
                <span>{cat.label}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                    isActive ? 'bg-amber-400/25 text-amber-200' : 'bg-black/40 text-stone-500'
                  )}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Rank Dropdown Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#1f2738]">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari pusaka, bekal, atau material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121622] border border-[#2e3748] rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-[#c5a880] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
            {/* Rarity Rank Filter */}
            <select
              value={activeRank}
              onChange={(e) => setActiveRank(e.target.value)}
              className="bg-[#121622] border border-[#2e3748] text-stone-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#c5a880] w-full sm:w-auto font-serif"
            >
              <option value="all">Semua Kualitas (Rarity)</option>
              <option value="common">Common / Mortal</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare / Spiritual</option>
              <option value="epic">Epic / Earth</option>
              <option value="legendary">Legendary / Heaven</option>
              <option value="mythic">Mythic / Divine</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid View (Mobile-Friendly, Touch-Optimized, Clean Cards) */}
      <div className="bg-[#0b0e15] border border-[#2b3345] p-3 sm:p-5 rounded-xl min-h-[450px]">
        {/* State Banners */}
        {!user && !loading && (
          <div className="py-12">
            <EmptyState
              icon={<Package className="w-10 h-10 text-stone-600" />}
              title="Akses Ditolak"
              description="Silakan login terlebih dahulu untuk mengakses tas dan perbekalan Anda."
            />
          </div>
        )}

        {loading && (
          <div className="py-16">
            <LoadingState text="Membuka lipatan tas Qiankun..." />
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-red-400 bg-red-950/20 border border-red-900/40 rounded-xl my-4">
            <p>{error}</p>
          </div>
        )}

        {user && !loading && filteredInventory.length === 0 && !error && (
          <div className="py-16">
            <EmptyState
              icon={<Package className="w-10 h-10 text-stone-600" />}
              title="Tas Kosong"
              description="Tidak ada item yang cocok dengan kriteria pencarian atau kategori ini."
            />
          </div>
        )}

        {/* Item Cards Grid (Clean, Responsive, No Overlapping Buttons!) */}
        {user && !loading && filteredInventory.length > 0 && (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3.5">
            {filteredInventory.map((item) => {
              const bucket = getItemCategoryBucket(item);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItemDetail(item);
                    setItemDetailModalOpen(true);
                  }}
                  className={cn(
                    'group relative bg-[#0e121b] border rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-200 shadow-md hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(197,168,128,0.2)] select-none',
                    getRarityColor(item.rarity)
                  )}
                >
                  {/* Quantity Badge - Top Right */}
                  <div className="absolute top-1.5 right-1.5 bg-[#080b11]/90 border border-current text-[10px] px-1.5 py-0.2 rounded font-mono font-bold text-amber-200 shadow-md z-10">
                    x{item.quantity}
                  </div>

                  {/* Category Mini Badge - Top Left */}
                  <div className="absolute top-1.5 left-1.5 text-[10px] opacity-75">
                    {bucket === 'manual' ? '📜' :
                     bucket === 'consumable' ? '🧪' :
                     bucket === 'equipment' ? '⚔️' :
                     bucket === 'tools' ? '🔨' :
                     bucket === 'blueprint' ? '📐' : '📦'}
                  </div>

                  {/* Item Image / Emoji */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center my-1.5 sm:my-2 shrink-0 group-hover:scale-105 transition-transform drop-shadow-md">
                    <FallbackImage
                      src={item.imageUrl || ''}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                      fallbackNode={<span className="text-3xl sm:text-4xl">{item.emoji || '📦'}</span>}
                    />
                  </div>

                  {/* Item Info Footer */}
                  <div className="w-full pt-1.5 border-t border-white/10 group-hover:border-white/20 transition-colors">
                    <p
                      className={cn('text-xs font-serif font-bold truncate w-full px-0.5', getRarityTextClass(item.rarity))}
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <p className="text-[10px] text-stone-400 capitalize mt-0.5 truncate">
                      {item.type || item.category}
                    </p>

                    {item.effectType && (
                      <div className="mt-1">
                        <span className="text-[9px] bg-blue-950/60 border border-blue-800/40 text-blue-300 px-1.5 py-0.2 rounded font-sans truncate block">
                          {item.effectType.replace(/_/g, ' ')} {item.effectValue ? `+${item.effectValue}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Desktop Hover Quick Action Notice */}
                  <div className="absolute inset-0 bg-[#080b11]/90 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px] p-2 pointer-events-none hidden md:flex">
                    <span className="text-xs font-serif font-bold text-amber-200 bg-[#141a26] border border-[#c5a880]/50 px-3 py-1.5 rounded-lg shadow-lg">
                      Kelola Item
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Empty Slots Filler */}
            {Array.from({ length: Math.max(0, 12 - filteredInventory.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="border border-dashed border-[#242b3b] bg-black/20 rounded-xl h-28 sm:h-36 flex flex-col items-center justify-center opacity-30 select-none"
              >
                <span className="text-[10px] sm:text-xs text-stone-600 font-serif">Slot Kosong</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Detail & Action Modal (Mobile & PC Hub - All Actions Centralized Here) */}
      <Modal
        isOpen={itemDetailModalOpen}
        onClose={() => setItemDetailModalOpen(false)}
        title="Detail & Pengelolaan Pusaka"
      >
        {selectedItemDetail && (() => {
          const bucket = getItemCategoryBucket(selectedItemDetail);
          const isUsableConsumable = bucket === 'consumable' && selectedItemDetail.effectType !== 'farm_grow_speed';
          const isPupuk = selectedItemDetail.effectType === 'farm_grow_speed';
          const isLawOrManual = bucket === 'manual';
          const isEquipment = bucket === 'equipment';

          return (
            <div className="space-y-4">
              {/* Header Box: Image, Name, Badges */}
              <div className="flex items-center gap-3.5 bg-[#0e121a] p-3 rounded-xl border border-[#2e3748]">
                <div
                  className={cn(
                    'w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-xl border bg-black/50 shrink-0 shadow-inner',
                    getRarityColor(selectedItemDetail.rarity)
                  )}
                >
                  <FallbackImage
                    src={selectedItemDetail.imageUrl || ''}
                    alt={selectedItemDetail.name}
                    className="max-h-full max-w-full object-contain p-2 drop-shadow-md"
                    fallbackNode={<span className="text-3xl sm:text-4xl">{selectedItemDetail.emoji || '📦'}</span>}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={cn('text-base sm:text-lg font-bold font-serif truncate', getRarityTextClass(selectedItemDetail.rarity))}>
                    {selectedItemDetail.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] bg-[#181d2a] border border-[#3b3322] text-amber-200 px-2 py-0.5 rounded capitalize font-serif">
                      {selectedItemDetail.rarity || 'Common'}
                    </span>
                    <span className="text-[10px] bg-[#141822] text-stone-400 px-2 py-0.5 rounded capitalize">
                      {selectedItemDetail.type || selectedItemDetail.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400 font-mono">
                    <span>Dimiliki: <strong className="text-amber-200 font-bold">x{selectedItemDetail.quantity}</strong></span>
                    {selectedItemDetail.price > 0 && (
                      <span>Harga Jual: <strong className="text-stone-300">{selectedItemDetail.price} Perak</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description / Lore */}
              <div className="bg-[#0b0e15] p-3 rounded-xl border border-[#2b3345]">
                <p className="text-xs text-stone-300 italic leading-relaxed">
                  "{selectedItemDetail.description || 'Tidak ada catatan sejarah mengenai pusaka ini.'}"
                </p>

                {/* Effect Details */}
                {(selectedItemDetail.effectType || selectedItemDetail.name.startsWith('Blueprint:')) && (
                  <div className="mt-3 pt-2.5 border-t border-[#1f2738]">
                    <span className="text-[11px] text-amber-400 font-serif font-bold uppercase tracking-wider block mb-1">
                      Khasiat & Pengaruh:
                    </span>
                    <p className="text-xs text-stone-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>{getHumanReadableEffect(selectedItemDetail)}</span>
                    </p>
                    {selectedItemDetail.effectDurationMinutes && (
                      <p className="text-xs text-stone-400 mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span>Durasi Pengaruh: {selectedItemDetail.effectDurationMinutes} menit</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Tool Properties */}
                {(selectedItemDetail.category === 'tool' || selectedItemDetail.toolType) && (
                  <div className="mt-3 pt-2.5 border-t border-[#1f2738]">
                    <span className="text-[11px] text-yellow-400 font-serif font-bold uppercase tracking-wider block mb-1">
                      Kondisi Perkakas:
                    </span>
                    <p className="text-xs text-stone-300">
                      Tipe: <span className="capitalize text-stone-200 font-semibold">{selectedItemDetail.toolType?.replace(/_/g, ' ') || 'Alat Kerja'}</span>
                      {selectedItemDetail.durability != null && ` • Durabilitas: ${selectedItemDetail.durability}`}
                    </p>
                  </div>
                )}

                {/* Kungfu Requirements */}
                {selectedItemDetail.requiredKungfuSkill && (selectedItemDetail.requiredKungfuLevel ?? 0) > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#1f2738]">
                    <span className="text-[11px] text-red-400 font-serif font-bold uppercase tracking-wider block mb-1">
                      Syarat Kemahiran Beladiri:
                    </span>
                    <p className="text-xs text-amber-300 font-medium">
                      Membutuhkan kemahiran <span className="capitalize font-bold text-amber-200">{selectedItemDetail.requiredKungfuSkill}</span> tingkat {selectedItemDetail.requiredKungfuLevel}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons Bar (Large, Touch-Friendly, Clear Choices) */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#2e3748]">
                {/* Consumable Action */}
                {isUsableConsumable && (
                  <Button
                    onClick={() => {
                      setItemDetailModalOpen(false);
                      setItemToUse(selectedItemDetail);
                      setUseConfirmModalOpen(true);
                    }}
                    disabled={actionLoading}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-serif font-bold text-xs px-4 py-2 rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Gunakan Item
                  </Button>
                )}

                {/* Law or Manual Action */}
                {isLawOrManual && (
                  <Button
                    onClick={async () => {
                      setItemDetailModalOpen(false);
                      await handleUseLawManual(selectedItemDetail);
                    }}
                    disabled={actionLoading}
                    className="bg-amber-700 hover:bg-amber-600 text-white font-serif font-bold text-xs px-4 py-2 rounded-lg shadow-[0_0_12px_rgba(217,119,6,0.3)] transition-all cursor-pointer"
                  >
                    <Scroll className="w-3.5 h-3.5 mr-1.5" />
                    Pelajari Kitab
                  </Button>
                )}

                {/* Pupuk Action */}
                {isPupuk && (
                  <Link
                    href="/world"
                    className="bg-yellow-700 hover:bg-yellow-600 text-white font-serif font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-md"
                  >
                    <span>Pakai di Lahan Dunia</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                {/* Equipment Action */}
                {isEquipment && (
                  <Link
                    href="/character"
                    className="bg-blue-800 hover:bg-blue-700 text-white font-serif font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-md"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Pasang di Karakter</span>
                  </Link>
                )}

                {/* Discard Action */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setItemDetailModalOpen(false);
                    setItemToDiscard(selectedItemDetail);
                    setDiscardQuantity(1);
                    setDiscardModalOpen(true);
                  }}
                  disabled={actionLoading}
                  className="border-red-900/60 text-red-400 hover:bg-red-950/40 text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Buang
                </Button>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  onClick={() => setItemDetailModalOpen(false)}
                  className="text-stone-400 hover:text-stone-200 text-xs px-3 py-2 rounded-lg cursor-pointer"
                >
                  Tutup
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Discard Modal */}
      <Modal isOpen={discardModalOpen} onClose={() => setDiscardModalOpen(false)} title="Buang Pusaka / Barang">
        <div className="space-y-4">
          <p className="text-stone-300 text-sm">
            Apakah Anda yakin ingin membuang <strong className="text-amber-200">{itemToDiscard?.name}</strong>?
          </p>

          <div>
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1.5">
              <span>Jumlah Dibuang:</span>
              <span>Maksimal: {itemToDiscard?.quantity || 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDiscardQuantity(1)}
                className="px-2.5 py-1.5 bg-[#121622] hover:bg-[#1a2030] border border-[#2e3748] rounded text-xs text-stone-300"
              >
                Min
              </button>
              <input
                type="number"
                min={1}
                max={itemToDiscard?.quantity || 1}
                className="w-full bg-[#121622] border border-[#2e3748] rounded-lg p-2 text-white font-mono text-center text-sm focus:border-red-500 outline-none"
                value={discardQuantity}
                onChange={(e) => setDiscardQuantity(Math.max(1, Math.min(itemToDiscard?.quantity || 1, Number(e.target.value) || 1)))}
              />
              <button
                onClick={() => setDiscardQuantity(itemToDiscard?.quantity || 1)}
                className="px-2.5 py-1.5 bg-[#121622] hover:bg-[#1a2030] border border-[#2e3748] rounded text-xs text-stone-300"
              >
                Max
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#2e3748]">
            <Button variant="ghost" onClick={() => setDiscardModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-950/40"
              onClick={handleDiscard}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Buang Permanen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Use Confirm Modal */}
      <Modal isOpen={useConfirmModalOpen} onClose={() => setUseConfirmModalOpen(false)} title="Konfirmasi Penggunaan">
        <div className="space-y-4">
          <p className="text-stone-300 text-sm leading-relaxed">
            {itemToUse?.name.startsWith('Blueprint:')
              ? `Gunakan blueprint ini untuk membuka resep signature di sistem Profesi? Item akan dikonsumsi.`
              : (['S','SS','SSS','Mythic','Divine','Legendary'].includes(itemToUse?.rarity || '') || (itemToUse?.price && itemToUse.price > 1000)
                ? `Pusaka ${itemToUse?.name} bernilai tinggi. Apakah Anda yakin ingin mengonsumsinya sekarang?`
                : `Gunakan ${itemToUse?.name} sekarang?`
              )}
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#2e3748]">
            <Button variant="ghost" onClick={() => setUseConfirmModalOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-serif font-bold text-xs"
              onClick={handleUseItem}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Gunakan Sekarang
            </Button>
          </div>
        </div>
      </Modal>

      {/* Crafting Modal */}
      <Modal isOpen={craftModalOpen} onClose={() => setCraftModalOpen(false)} title="Pusat Tempa & Crafting" maxWidth="md">
         {craftingStations.length === 0 ? (
             <div className="text-center py-8 text-stone-500">
                 <Hammer className="w-12 h-12 mx-auto mb-3 opacity-50" />
                 <p className="text-sm">Anda belum memiliki fasilitas Crafting yang selesai dibangun.</p>
                 <p className="text-xs text-stone-600 mt-1">Dapatkan Blueprint dari toko atau misi Jianghu.</p>
             </div>
         ) : (
             <div className="space-y-4">
                 {actionMessage && (
                     <div className={`p-3 rounded-lg flex items-center justify-between text-xs ${actionMessage.type === 'error' ? 'bg-red-950/40 border border-red-800 text-red-300' : 'bg-green-950/40 border border-green-800 text-green-300'}`}>
                         <span>{actionMessage.text}</span>
                         <button onClick={() => setActionMessage(null)}><XCircle size={14}/></button>
                     </div>
                 )}

                 <div>
                     <label className="block text-xs font-serif font-bold text-amber-300 uppercase tracking-wider mb-1.5">
                       Pilih Fasilitas Bangunan
                     </label>
                     <select
                         className="w-full bg-[#121622] border border-[#2e3748] rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-[#c5a880]"
                         value={selectedStation}
                         onChange={(e) => { setSelectedStation(e.target.value); setSelectedRecipe(''); }}
                     >
                         <option value="" disabled>-- Pilih Fasilitas Tempa --</option>
                         {craftingStations.map(station => (
                             <option key={station.id} value={station.id} disabled={station.isUnderConstruction}>
                                 {station.name} {station.isUnderConstruction ? '(Sedang Dibangun)' : ''}
                             </option>
                         ))}
                     </select>
                 </div>

                 {selectedStation && (
                     <div>
                         <label className="block text-xs font-serif font-bold text-amber-300 uppercase tracking-wider mb-1.5">
                           Pilih Resep Pembuatan
                         </label>
                         <select
                             className="w-full bg-[#121622] border border-[#2e3748] rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-[#c5a880]"
                             value={selectedRecipe}
                             onChange={(e) => setSelectedRecipe(e.target.value)}
                         >
                             <option value="" disabled>-- Pilih Hasil Tempa --</option>
                             {craftingStations.find(s => s.id === selectedStation)?.recipes.map((r: any) => (
                                 <option key={r.recipeName} value={r.recipeName}>{r.recipeName}</option>
                             ))}
                         </select>
                     </div>
                 )}

                 {getSelectedRecipeObj() && (
                     <div className="bg-[#0b0e15] border border-[#2e3748] p-3.5 rounded-xl space-y-3">
                         <div className="flex justify-between items-center border-b border-[#1f2738] pb-2">
                            <span className="font-serif font-bold text-amber-200 text-sm">
                              Hasil: {getSelectedRecipeObj()?.resultItemName || getSelectedRecipeObj()?.recipeName}
                            </span>
                            <span className="text-amber-400 font-mono text-xs font-bold bg-[#141a26] px-2 py-0.5 rounded border border-[#3b3322]">
                              x{(getSelectedRecipeObj()?.resultQuantity || 1) * craftTimes}
                            </span>
                         </div>

                         <div>
                             <p className="text-[11px] text-stone-400 font-serif mb-1.5">Bahan yang Dibutuhkan:</p>
                             <ul className="text-xs space-y-1">
                                 {getSelectedRecipeObj()?.materials.map((m: RecipeMaterial, i: number) => {
                                     const invItem = inventory.find(inv => inv.name === (m.itemName || m.name));
                                     const have = invItem ? invItem.quantity : 0;
                                     const need = m.quantity * craftTimes;
                                     const isEnough = have >= need;

                                     return (
                                         <li key={i} className="flex justify-between items-center bg-[#121622] p-1.5 rounded-lg border border-[#1f2738]">
                                             <span className="text-stone-300">{m.itemName || m.name}</span>
                                             <span className={`font-mono text-xs font-bold ${isEnough ? 'text-emerald-400' : 'text-red-400'}`}>
                                                 {have} / {need}
                                             </span>
                                         </li>
                                     );
                                 })}
                             </ul>
                         </div>

                         <div className="flex items-center justify-between pt-2 border-t border-[#1f2738]">
                             <div className="flex items-center gap-2">
                                 <label className="text-xs text-stone-400 font-serif">Jumlah:</label>
                                 <input
                                    type="number"
                                    min="1"
                                    value={craftTimes}
                                    onChange={(e) => setCraftTimes(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 bg-[#121622] border border-[#2e3748] rounded px-2 py-1 text-white text-center font-mono text-xs focus:border-[#c5a880] outline-none"
                                 />
                             </div>
                             <Button
                                onClick={handleCraft}
                                disabled={actionLoading}
                                className="bg-amber-800 hover:bg-amber-700 text-amber-100 font-serif font-bold text-xs px-4 py-1.5 rounded-lg cursor-pointer"
                             >
                                {actionLoading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Hammer size={14} className="mr-1.5" />}
                                Tempa Sekarang
                             </Button>
                         </div>
                     </div>
                 )}
             </div>
         )}
      </Modal>

    </div>
  );
}
