'use client';

import { Package, Search, Filter, Hammer, Loader2, XCircle } from "lucide-react";
import FallbackImage from "@/components/FallbackImage";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getRarityColor, getRarityTextClass } from '@/lib/rarity';
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";

// Interface for API data
interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  quantity: number;
  price: number;
  imageUrl: string | null;
  emoji: string;
}

export default function InventoryPage() {
  const { user } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [itemToDiscard, setItemToDiscard] = useState<InventoryItem | null>(null);
  const [discardQuantity, setDiscardQuantity] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const handleDiscard = async () => {
    if (!itemToDiscard) return;
    setActionLoading(true);
    try {
      await api.post('/inventory/discard', { itemId: itemToDiscard.id, quantity: discardQuantity });
      setDiscardModalOpen(false);
      setItemToDiscard(null);
      setDiscardQuantity(1);
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal membuang item.');
    } finally {
      setActionLoading(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Meta data states
  const [totalSlots, setTotalSlots] = useState(0);
  const [maxSlots, setMaxSlots] = useState(50);

  // Filter/Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeRank] = useState<string>('all');

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

  const fetchInventoryAndRecipes = async () => {
      try {
        const [invRes, craftRes] = await Promise.all([
            api.get('/inventory'),
            api.get('/inventory/craft-recipes').catch(() => ({ data: { data: [] } }))
        ]);

        setInventory(invRes.data.data);
        if (invRes.data.meta) {
            setTotalSlots(invRes.data.meta.totalSlots);
            setMaxSlots(invRes.data.meta.maxSlots);
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

  // Derived filtered items
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesCategory = true;
    let matchesRank = true;
    if (activeRank !== 'all') {
      matchesRank = (item.rarity || "").toLowerCase() === activeRank.toLowerCase();
    }
    if (activeCategory !== 'all') {
        if (activeCategory === 'material') {
             matchesCategory = item.type === 'material' || item.type === 'herb';
        } else if (activeCategory === 'consumable') {
             matchesCategory = item.type === 'pill' || item.type === 'consume';
        } else if (activeCategory === 'tools') {
             matchesCategory = item.type === 'none' || !item.type; // Assuming default none/tools
        } else if (activeCategory === 'equipment') {
             matchesCategory = item.type === 'weapon' || item.type === 'cloth' || item.type === 'accessories' || item.type === 'artifact';
        }
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">

      <PageHeader
        title="Gudang Penyimpanan"
        description={`Kapasitas: ${totalSlots} / ${maxSlots} Slot`}
        action={
            <Button
                variant="outline"
                onClick={() => { setCraftModalOpen(true); setActionMessage(null); }}
                className="border-blue-800 text-blue-400 hover:bg-blue-900/30"
            >
                <Hammer className="w-4 h-4 mr-2" />
                Crafting Area
            </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-[#111] border border-[#333] p-4 rounded-lg shadow-md">
        <div className="flex gap-2 w-full overflow-x-auto pb-2 sm:pb-0 custom-scrollbar sm:w-auto">
             <Button size="sm" variant={activeCategory === 'all' ? 'default' : 'ghost'} onClick={() => setActiveCategory('all')} className="whitespace-nowrap">Semua</Button>
             <Button size="sm" variant={activeCategory === 'material' ? 'default' : 'ghost'} onClick={() => setActiveCategory('material')} className="whitespace-nowrap">Material</Button>
             <Button size="sm" variant={activeCategory === 'consumable' ? 'default' : 'ghost'} onClick={() => setActiveCategory('consumable')} className="whitespace-nowrap">Konsumsi</Button>
             <Button size="sm" variant={activeCategory === 'equipment' ? 'default' : 'ghost'} onClick={() => setActiveCategory('equipment')} className="whitespace-nowrap">Equipment</Button>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-[#444] rounded-md pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#c5a880] transition-colors"
            />
          </div>
          <Button variant="outline" size="icon" title="Filter features" className="shrink-0 border-[#444]">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="bg-[#111] border border-[#333] p-4 sm:p-6 rounded-lg min-h-[500px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">

          {!user && !loading && (
            <div className="col-span-full">
              <EmptyState
                icon={<Package />}
                title="Akses Ditolak"
                description="Silakan login menggunakan Discord untuk melihat Inventory Anda."
              />
            </div>
          )}

          {loading && (
            <div className="col-span-full">
               <LoadingState text="Membongkar tas penyimpanan..." />
            </div>
          )}

          {error && (
            <div className="col-span-full py-10 text-center text-red-500 bg-red-900/10 border border-red-900/50 rounded-lg">
              {error}
            </div>
          )}

          {user && !loading && filteredInventory.length === 0 && !error && (
            <div className="col-span-full">
               <EmptyState
                 icon={<Package />}
                 title="Gudang Kosong"
                 description="Item tidak ditemukan atau gudang penyimpanan Anda masih kosong."
               />
            </div>
          )}

          {user && !loading && filteredInventory.map((item) => (
            <div key={item.id} className={`group relative bg-black/60 border rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-[0_5px_15px_rgba(197,168,128,0.15)] transition-all duration-300 ${getRarityColor(item.rarity)}`}>
              {/* Quantity Badge */}
              <div className="absolute -top-2 -right-2 bg-black border border-current text-xs px-2 py-0.5 rounded-full z-10 text-white shadow-lg font-bold font-mono">
                x{item.quantity}
              </div>

              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-red-500 border-red-500/50 hover:bg-red-500/20 absolute bottom-2 right-2" onClick={(e) => { e.stopPropagation(); setItemToDiscard(item); setDiscardQuantity(1); setDiscardModalOpen(true); }}>Buang</Button>

              {/* Item Icon or Image */}
              <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center mb-2 drop-shadow-md">
                {item.imageUrl ? (
                  <FallbackImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain"
                    fallbackNode={<span className="text-2xl sm:text-4xl">{item.emoji}</span>}
                  />
                ) : (
                  <span className="text-2xl sm:text-4xl">{item.emoji}</span>
                )}
              </div>

              {/* Item Details */}
              <div className="w-full mt-auto pt-2 border-t border-white/10 group-hover:border-white/30 transition-colors">
                <p className={`text-[10px] sm:text-xs font-bold truncate px-1 ${getRarityTextClass(item.rarity)}`} title={item.name}>{item.name}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-500 capitalize mt-0.5 group-hover:text-gray-300 truncate">{item.type}</p>
              </div>
            </div>
          ))}

          {/* Empty Slots Filler (only show if logged in and loaded) */}
          {user && !loading && Array.from({ length: Math.max(0, 10 - filteredInventory.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="border border-dashed border-[#333] bg-black/20 rounded-lg h-24 sm:h-32 flex flex-col items-center justify-center opacity-30">
              <span className="text-[10px] sm:text-sm text-gray-600">Slot Kosong</span>
            </div>
          ))}

        </div>
      </div>

      {/* Crafting Modal */}
      <Modal isOpen={craftModalOpen} onClose={() => setCraftModalOpen(false)} title="Crafting Area" maxWidth="md">
         {craftingStations.length === 0 ? (
             <div className="text-center py-8 text-gray-500">
                 <Hammer className="w-12 h-12 mx-auto mb-3 opacity-50" />
                 <p>Anda belum memiliki fasilitas Crafting yang selesai dibangun.</p>
                 <p className="text-xs mt-2">Dapatkan Blueprint dari toko atau misi.</p>
             </div>
         ) : (
             <div className="space-y-4">
                 {actionMessage && (
                     <div className={`p-3 rounded flex items-center justify-between text-sm ${actionMessage.type === 'error' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                         <span>{actionMessage.text}</span>
                         <button onClick={() => setActionMessage(null)}><XCircle size={14}/></button>
                     </div>
                 )}

                 <div>
                     <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pilih Fasilitas</label>
                     <select
                         className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                         value={selectedStation}
                         onChange={(e) => { setSelectedStation(e.target.value); setSelectedRecipe(''); }}
                     >
                         <option value="" disabled>-- Pilih Stasiun --</option>
                         {craftingStations.map(station => (
                             <option key={station.id} value={station.id} disabled={station.isUnderConstruction}>
                                 {station.name} {station.isUnderConstruction ? '(Sedang Dibangun)' : ''}
                             </option>
                         ))}
                     </select>
                 </div>

                 {selectedStation && (
                     <div>
                         <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pilih Resep</label>
                         <select
                             className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                             value={selectedRecipe}
                             onChange={(e) => setSelectedRecipe(e.target.value)}
                         >
                             <option value="" disabled>-- Pilih Item --</option>
                             {craftingStations.find(s => s.id === selectedStation)?.recipes.map((r: any) => (
                                 <option key={r.recipeName} value={r.recipeName}>{r.recipeName}</option>
                             ))}
                         </select>
                     </div>
                 )}

                 {getSelectedRecipeObj() && (
                     <div className="bg-black/40 border border-[#333] p-4 rounded-lg">
                         <h4 className="font-bold text-[#c5a880] mb-2 flex justify-between">
                            <span>Hasil: {getSelectedRecipeObj()?.resultItemName || getSelectedRecipeObj()?.recipeName}</span>
                            <span className="text-blue-400 font-mono">x{(getSelectedRecipeObj()?.resultQuantity || 1) * craftTimes}</span>
                         </h4>

                         <div className="mb-4">
                             <p className="text-xs text-gray-500 mb-1">Bahan Diperlukan:</p>
                             <ul className="text-sm space-y-1">
                                 {getSelectedRecipeObj()?.materials.map((m: RecipeMaterial, i: number) => {
                                     // Temukan jumlah yg dimiliki di inventory
                                     const invItem = inventory.find(inv => inv.name === m.itemName);
                                     const have = invItem ? invItem.quantity : 0;
                                     const need = m.quantity * craftTimes;
                                     const isEnough = have >= need;

                                     return (
                                         <li key={i} className="flex flex-wrap justify-between items-center gap-1 bg-[#111] p-1.5 rounded">
                                             <span className="text-gray-300">{m.itemName}</span>
                                             <span className={`font-mono text-xs ${isEnough ? 'text-green-400' : 'text-red-400'}`}>
                                                 {have} / {need}
                                             </span>
                                         </li>
                                     );
                                 })}
                             </ul>
                         </div>

                         <div className="flex flex-wrap sm:flex-nowrap items-end justify-between mt-4 pt-4 gap-4 border-t border-[#333]">
                             <div>
                                 <label className="block text-xs text-gray-500 mb-1">Jumlah Craft</label>
                                 <input
                                    type="number"
                                    min="1"
                                    value={craftTimes}
                                    onChange={(e) => setCraftTimes(parseInt(e.target.value) || 1)}
                                    className="w-20 bg-[#111] border border-[#444] rounded px-2 py-1 text-white text-center font-mono text-sm focus:border-blue-500 outline-none"
                                 />
                             </div>
                             <Button
                                onClick={handleCraft}
                                disabled={actionLoading}
                                className="bg-blue-900/80 hover:bg-blue-800"
                             >
                                {actionLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Hammer size={16} className="mr-2" />}
                                Craft
                             </Button>
                         </div>
                     </div>
                 )}
             </div>
         )}
      </Modal>

      {/* Discard Modal */}
      <Modal isOpen={discardModalOpen} onClose={() => setDiscardModalOpen(false)} title="Buang Item">
        <div className="space-y-4">
          <p className="text-gray-300">Buang <strong>{itemToDiscard?.name}</strong>?</p>
          <input
            type="number"
            min={1}
            max={itemToDiscard?.quantity || 1}
            className="w-full bg-[#111] border border-[#444] rounded p-2 text-white"
            value={discardQuantity}
            onChange={(e) => setDiscardQuantity(Number(e.target.value))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDiscardModalOpen(false)}>Batal</Button>
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10" onClick={handleDiscard} disabled={actionLoading}>Buang</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
