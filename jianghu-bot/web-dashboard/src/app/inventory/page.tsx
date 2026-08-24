'use client';

import { Package, Search, Filter } from "lucide-react";
import FallbackImage from "@/components/FallbackImage";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function InventoryPage() {

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
  const { user } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Meta data states
  const [totalSlots, setTotalSlots] = useState(0);
  const [maxSlots, setMaxSlots] = useState(50);

  // Filter/Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 0);
      return;
    }

    const fetchInventory = async () => {
      try {
        const res = await api.get('/inventory');
        if (isMounted) {
          setInventory(res.data.data);
          if (res.data.meta) {
              setTotalSlots(res.data.meta.totalSlots);
              setMaxSlots(res.data.meta.maxSlots);
          }
        }
      } catch (err: unknown) {
        console.error(err);
        if (isMounted) setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memuat inventory.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInventory();
    return () => { isMounted = false; };
  }, [user]);

  // Derived filtered items
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesCategory = true;
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

    return matchesSearch && matchesCategory;
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'border-gray-600 bg-gray-900/50 hover:border-gray-400';
      case 'uncommon': return 'border-green-600 bg-green-900/20 hover:border-green-400';
      case 'rare': return 'border-blue-500 bg-blue-900/20 hover:border-blue-400';
      case 'epic': return 'border-purple-500 bg-purple-900/20 glow-epic hover:border-purple-400 text-purple-200';
      case 'legendary': return 'border-yellow-500 bg-yellow-900/20 glow-legendary hover:border-yellow-300 text-yellow-200';
      case 'mythical': return 'border-red-500 bg-red-900/20 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:border-red-400 text-red-200';
      default: return 'border-gray-600 bg-gray-900/50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a1a1a] jianghu-border p-6 rounded-lg">
        <div>
          <h1 className="text-3xl font-bold font-serif text-[#c5a880] flex items-center gap-3">
            <Package /> Gudang Penyimpanan
          </h1>
          <p className="text-gray-400 text-sm mt-1">Kapasitas: {totalSlots} / {maxSlots} Slot</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Cari item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-[#333] rounded px-10 py-2 text-sm text-white focus:outline-none focus:border-[#c5a880]"
            />
          </div>
          <button className="bg-black border border-[#333] p-2 rounded hover:text-[#c5a880] hover:border-[#c5a880] transition-colors" title="Filter features">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg">
            <h3 className="font-bold text-[#c5a880] mb-3 border-b border-[#333] pb-2">Kategori</h3>
            <ul className="space-y-1 text-sm">
              <li><button onClick={() => setActiveCategory('all')} className={`w-full text-left px-3 py-2 transition-colors ${activeCategory === 'all' ? 'bg-[#8b0000]/20 text-[#c5a880] border-l-2 border-[#8b0000]' : 'text-gray-400 hover:bg-black/50 hover:text-white'}`}>Semua Item</button></li>
              <li><button onClick={() => setActiveCategory('material')} className={`w-full text-left px-3 py-2 transition-colors ${activeCategory === 'material' ? 'bg-[#8b0000]/20 text-[#c5a880] border-l-2 border-[#8b0000]' : 'text-gray-400 hover:bg-black/50 hover:text-white'}`}>Bahan Baku (Material)</button></li>
              <li><button onClick={() => setActiveCategory('consumable')} className={`w-full text-left px-3 py-2 transition-colors ${activeCategory === 'consumable' ? 'bg-[#8b0000]/20 text-[#c5a880] border-l-2 border-[#8b0000]' : 'text-gray-400 hover:bg-black/50 hover:text-white'}`}>Konsumsi (Pil/Herbal)</button></li>
              <li><button onClick={() => setActiveCategory('tools')} className={`w-full text-left px-3 py-2 transition-colors ${activeCategory === 'tools' ? 'bg-[#8b0000]/20 text-[#c5a880] border-l-2 border-[#8b0000]' : 'text-gray-400 hover:bg-black/50 hover:text-white'}`}>Peralatan (Tools)</button></li>
              <li><button onClick={() => setActiveCategory('equipment')} className={`w-full text-left px-3 py-2 transition-colors ${activeCategory === 'equipment' ? 'bg-[#8b0000]/20 text-[#c5a880] border-l-2 border-[#8b0000]' : 'text-gray-400 hover:bg-black/50 hover:text-white'}`}>Senjata & Armor</button></li>
            </ul>
          </div>
        </div>

        {/* Inventory Grid */}
        <div className="lg:col-span-3">
          <div className="bg-[#1a1a1a] jianghu-border p-6 rounded-lg min-h-[500px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">

              {!user && !loading && (
                <div className="col-span-full py-20 text-center text-gray-500">
                  Silakan login menggunakan Discord untuk melihat Inventory Anda.
                </div>
              )}

              {loading && (
                <div className="col-span-full py-20 text-center text-[#c5a880] animate-pulse">
                  Membongkar tas penyimpanan...
                </div>
              )}

              {error && (
                <div className="col-span-full py-10 text-center text-red-500 bg-red-900/10 border border-red-900/50 rounded-lg">
                  {error}
                </div>
              )}

              {user && !loading && filteredInventory.length === 0 && !error && (
                <div className="col-span-full py-20 text-center text-gray-500">
                  Item tidak ditemukan atau gudang penyimpanan Anda masih kosong.
                </div>
              )}

              {user && !loading && filteredInventory.map((item) => (
                <div key={item.id} className={`group relative border rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ${getRarityColor(item.rarity)}`}>
                  {/* Quantity Badge */}
                  <div className="absolute -top-2 -right-2 bg-black border border-[#c5a880] text-xs px-2 py-0.5 rounded-full z-10 text-white shadow-lg font-bold">
                    x{item.quantity}
                  </div>

                  {/* Item Icon or Image */}
                  <div className="h-12 w-12 flex items-center justify-center mb-2 drop-shadow-md">
                    {item.imageUrl ? (
                      <FallbackImage
                        src={item.imageUrl}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain"
                        fallbackNode={<span className="text-4xl">{item.emoji}</span>}
                      />
                    ) : (
                      <span className="text-4xl">{item.emoji}</span>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="w-full mt-auto pt-2 border-t border-white/5 group-hover:border-white/20 transition-colors">
                    <p className="text-xs font-bold text-gray-100 truncate px-1">{item.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize mt-0.5 group-hover:text-gray-300">{item.type}</p>
                  </div>
                </div>
              ))}

              {/* Empty Slots Filler (only show if logged in and loaded) */}
              {user && !loading && Array.from({ length: Math.max(0, 10 - filteredInventory.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="border border-dashed border-[#333] bg-black/10 rounded-lg h-32 flex flex-col items-center justify-center opacity-30 hover:opacity-50 transition-opacity">
                  <span className="text-gray-700 text-sm">Slot Kosong</span>
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
