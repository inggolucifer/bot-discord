
"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, BookOpen, Package, PackageOpen } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';
import FallbackImage from '@/components/FallbackImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

// Define base properties
interface BaseEntity {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
  rank: string;
}

// Define specific properties
interface Item extends BaseEntity {
  category: string;
  effect: string;
  basePrice: number;
  priceCurrency: string;
  obtainedFrom: string[];
  usedFor: string[];
}

interface AssetRequirement {
  itemId: string;
  itemName: string;
  quantity: number;
}

interface Asset extends BaseEntity {
  buildable: boolean;
  isCraftingStation: boolean;
  dailyProfit: number;
  profitCurrency: string;
  workerOutputItemId: string;
  workerOutputItemName: string;
  workerOutputQuantity: number;
  basePrice: number;
  priceCurrency: string;
  constructionTimeHours: number;
  buildRequirements: AssetRequirement[];
  recipes?: {
    recipeName: string;
    resultItemId: string;
    resultItemName: string;
    resultQuantity: number;
    materials: AssetRequirement[];
  }[];
}

interface Pet extends BaseEntity {
  tier: number;
  element: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
}

const ranks = ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];

export default function AlmanackPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]); // Includes both blueprints and built assets
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'error'|'success', text: string} | null>(null);

  const [activeTab, setActiveTab] = useState<'item' | 'asset' | 'pet'>('item');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRank, setActiveRank] = useState('all');

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedAssets, setExpandedAssets] = useState<Record<string, boolean>>({});

  const toggleItemExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAssetExpand = (id: string) => {
    setExpandedAssets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const fetchAlmanack = async () => {
      try {
        const [itemsRes, assetsRes, petsRes] = await Promise.all([
          api.get('/almanack/items'),
          api.get('/almanack/assets'),
          api.get('/almanack/pets')
        ]);
        setItems(itemsRes.data.data);
        setAssets(assetsRes.data.data);
        setPets(petsRes.data.data);
      } catch (err: unknown) {
        console.error(err);
        setMessage({ type: 'error', text: (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memuat Almanack.' });
      } finally {
        setLoading(false);
      }
    };

    fetchAlmanack();
  }, []);

  const filterBySearchAndRank = (list: (Item | Asset | Pet)[]) => {
    return list.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchRank = activeRank === 'all' || item.rank?.toLowerCase() === activeRank.toLowerCase();
      return matchSearch && matchRank;
    });
  };

  const filteredItems = filterBySearchAndRank(items) as Item[];
  const filteredAssets = filterBySearchAndRank(assets) as Asset[];
  const filteredPets = filterBySearchAndRank(pets) as Pet[];

  const getRarityColor = (rank: string) => {
    switch (rank?.toLowerCase()) {
      case 'uncommon': return 'border-green-800 shadow-[0_0_15px_rgba(22,163,74,0.1)]';
      case 'rare': return 'border-blue-700 shadow-[0_0_15px_rgba(29,78,216,0.1)]';
      case 'epic': return 'border-purple-700 shadow-[0_0_15px_rgba(126,34,206,0.1)]';
      case 'legendary': return 'border-yellow-600 shadow-[0_0_15px_rgba(202,138,4,0.15)]';
      case 'mythical': return 'border-red-700 shadow-[0_0_15px_rgba(185,28,28,0.15)]';
      default: return 'border-[#333]';
    }
  };

  const getRarityTextClass = (rank: string) => {
    switch (rank?.toLowerCase()) {
      case 'uncommon': return 'text-green-500';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]';
      case 'mythical': return 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#333] pb-6 relative">
         <div className="absolute top-0 right-0 w-32 h-32 bg-[url('/img/dragon-watermark.png')] bg-contain bg-no-repeat opacity-10 pointer-events-none"></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#c5a880] mb-2 flex items-center gap-2">
            <BookOpen className="text-red-900" size={28} />
            Kitab Almanack
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
            Ensiklopedia lengkap dunia Jianghu. Pelajari berbagai item, blueprint, dan bangunan yang tersebar di daratan ini.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-3 sm:p-4 rounded border ${message.type === 'error' ? 'bg-red-950/50 border-red-900 text-red-200' : 'bg-green-950/50 border-green-900 text-green-200'} flex items-start gap-3`}>
          <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Controls: Search, Tabs, Rank Filter */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-[#111] p-4 rounded-lg border border-[#333] shadow-inner">

        {/* Search */}
        <div className="relative w-full lg:w-72">
          <input
            type="text"
            placeholder="Cari nama atau deskripsi..."
            className="w-full bg-black/50 border border-[#333] rounded-md py-2 pl-9 pr-4 text-sm text-gray-200 focus:outline-none focus:border-[#c5a880] transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
        </div>

        {/* Tabs Desktop & Mobile Scrollable */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 sm:gap-4 border-b lg:border-b-0 border-[#333] pb-2 lg:pb-0">
          <button
            className={`pb-3 lg:pb-0 lg:py-2 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'item' ? 'text-red-400 border-b-2 lg:border-b-0 lg:text-[#c5a880] border-red-400 lg:bg-[#222] lg:px-4 lg:rounded-md' : 'text-gray-500 hover:text-gray-300 lg:px-4'}`}
            onClick={() => {setActiveTab('item'); setMessage(null);}}
          >
            <Package size={16} /> Item ({filteredItems.length})
          </button>
          <button
            className={`pb-3 lg:pb-0 lg:py-2 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'asset' ? 'text-blue-400 border-b-2 lg:border-b-0 lg:text-[#c5a880] border-blue-400 lg:bg-[#222] lg:px-4 lg:rounded-md' : 'text-gray-500 hover:text-gray-300 lg:px-4'}`}
            onClick={() => {setActiveTab('asset'); setMessage(null);}}
          >
            <PackageOpen size={16} /> Asset ({filteredAssets.length})
          </button>
          <button
            className={`pb-3 lg:pb-0 lg:py-2 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'pet' ? 'text-green-400 border-b-2 lg:border-b-0 lg:text-[#c5a880] border-green-400 lg:bg-[#222] lg:px-4 lg:rounded-md' : 'text-gray-500 hover:text-gray-300 lg:px-4'}`}
            onClick={() => {setActiveTab('pet'); setMessage(null);}}
          >
            🐾 Pet ({filteredPets.length})
          </button>
        </div>

        {/* Rank Filter */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
          <Filter size={16} className="text-gray-500 " />
          {ranks.map(rank => (
            <button
              key={rank}
              onClick={() => setActiveRank(rank.toLowerCase())}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeRank === rank.toLowerCase() ? 'bg-[#c5a880] text-black' : 'bg-[#222] text-gray-400 hover:bg-[#333]'}`}
            >
              {rank}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState text="Membuka Kitab Almanack..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* TAB ITEM */}
          {activeTab === 'item' && filteredItems.map((item) => (
            <div key={item._id} className={`bg-[#111] border p-4 sm:p-5 rounded-lg flex flex-col gap-3 relative overflow-hidden group hover:border-blue-900/50 hover:shadow-lg transition-all ${getRarityColor(item.rank)}`}>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-md border border-[#333] flex-shrink-0 flex items-center justify-center p-1 shadow-inner">
                  <FallbackImage
                    src={item.imageUrl || ""}
                    alt={item.name}
                    className="max-w-full max-h-full object-contain"
                    fallbackNode={<div className="text-2xl sm:text-4xl">{item.category === 'weapon' ? '⚔️' : item.category === 'herb' ? '🌿' : '📦'}</div>}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-sm sm:text-base leading-tight mb-1.5 ${getRarityTextClass(item.rank)} truncate`} title={item.name}>{item.name}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="rank" rank={item.rank} className="text-[9px] sm:text-[10px] py-0 h-4">{item.rank}</Badge>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 h-4 border-[#333] bg-black/40 capitalize">{item.category}</Badge>
                  </div>
                </div>
              </div>
              <div className="bg-black/30 p-2 rounded border border-[#333]/50">
                  <p className={`text-[10px] sm:text-xs text-gray-400 italic leading-relaxed ${expandedItems[item._id] ? '' : 'line-clamp-3'}`}>
                      {item.description}
                  </p>
                  {item.description && item.description.length > 100 && (
                      <button
                          onClick={() => toggleItemExpand(item._id)}
                          className="text-[10px] text-[#c5a880] hover:text-white mt-1 flex items-center gap-1 w-full justify-center"
                      >
                          {expandedItems[item._id] ? 'Tutup' : 'Selengkapnya'}
                          <span className={`transform transition-transform ${expandedItems[item._id] ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                  )}
              </div>

              <div className="mt-auto pt-3 border-t border-[#333] text-[10px] sm:text-xs text-gray-500 space-y-1.5">

                {item.effect && <p><span className="text-gray-400 font-semibold">Efek:</span> {item.effect}</p>}
                {item.basePrice > 0 && <p><span className="text-gray-400 font-semibold">Harga Dasar:</span> {item.basePrice} {item.priceCurrency}</p>}
                {item.obtainedFrom && item.obtainedFrom.length > 0 && (
                    <div className="mt-2">
                        <span className="text-gray-400 font-semibold block mb-1">Dapat Dari:</span>
                        <ul className="list-disc list-inside text-gray-300 space-y-0.5 ml-1">
                            {item.obtainedFrom.map((source: string, i: number) => (
                                <li key={i}>{source}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {item.usedFor && item.usedFor.length > 0 && (
                    <div className="mt-2">
                        <span className="text-gray-400 font-semibold block mb-1">Kegunaan:</span>
                        <ul className="list-disc list-inside text-gray-300 space-y-0.5 ml-1">
                            {item.usedFor.map((usage: string, i: number) => (
                                <li key={i}>{usage}</li>
                            ))}
                        </ul>
                    </div>
                )}
              </div>
            </div>
          ))}

          {/* TAB ASSET */}
          {activeTab === 'asset' && filteredAssets.map((asset) => (
            <div key={asset._id} className={`bg-[#111] border p-4 sm:p-5 rounded-lg flex flex-col gap-3 relative overflow-hidden group hover:border-blue-900/50 hover:shadow-lg transition-all ${getRarityColor(asset.rank)}`}>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-md border border-[#333] flex-shrink-0 flex items-center justify-center p-1 shadow-inner">
                  <FallbackImage
                    src={asset.imageUrl || ""}
                    alt={asset.name}
                    className="max-w-full max-h-full object-contain"
                    fallbackNode={<div className="text-2xl sm:text-4xl">🏛️</div>}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-sm sm:text-base leading-tight mb-1.5 ${getRarityTextClass(asset.rank)} truncate`} title={asset.name}>{asset.name}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.buildable && <Badge variant="success" className="text-[9px] sm:text-[10px] py-0 h-4 bg-[#1f402e]/80">Blueprint</Badge>}
                    {!asset.buildable && <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 h-4 border-[#333] bg-black/40">Aset Jadi</Badge>}
                    {asset.isCraftingStation && <Badge variant="secondary" className="text-[9px] sm:text-[10px] py-0 h-4">Station</Badge>}
                    {asset.dailyProfit > 0 && <Badge variant="warning" className="text-[9px] sm:text-[10px] py-0 h-4 bg-yellow-900/80">Income</Badge>}
                    {asset.workerOutputItemId && <Badge variant="default" className="text-[9px] sm:text-[10px] py-0 h-4 bg-purple-900/80 text-white">Production</Badge>}
                  </div>
                </div>
              </div>
              <div className="mb-2 bg-black/30 p-2 rounded border border-[#333]/50">
                  <p className={`text-[10px] sm:text-xs text-gray-400 italic leading-relaxed ${expandedAssets[asset._id] ? '' : 'line-clamp-3'}`}>
                      {asset.description}
                  </p>
                  {asset.description && asset.description.length > 100 && (
                      <button
                          onClick={() => toggleAssetExpand(asset._id)}
                          className="text-[10px] text-[#c5a880] hover:text-white mt-1 flex items-center gap-1 w-full justify-center"
                      >
                          {expandedAssets[asset._id] ? 'Tutup' : 'Selengkapnya'}
                          <span className={`transform transition-transform ${expandedAssets[asset._id] ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                  )}
              </div>

              <div className="mt-auto pt-3 border-t border-[#333] text-[10px] sm:text-xs text-gray-400 space-y-2">
                {asset.dailyProfit > 0 && (
                   <p className="flex flex-wrap sm:flex-nowrap justify-between gap-x-2"><span>Profit Harian:</span> <span className="text-yellow-500 font-mono">{asset.dailyProfit} {asset.profitCurrency}</span></p>
                )}
                {asset.workerOutputQuantity > 0 && (
                   <p className="flex flex-wrap sm:flex-nowrap justify-between gap-x-2"><span>Output Produksi:</span> <span className="text-purple-400 font-mono">{asset.workerOutputQuantity}x {asset.workerOutputItemName}</span></p>
                )}
                {asset.basePrice > 0 && !asset.buildable && (
                   <p className="flex flex-wrap sm:flex-nowrap justify-between gap-x-2"><span>Harga (Shop):</span> <span className="text-gray-300 font-mono">{asset.basePrice} {asset.priceCurrency}</span></p>
                )}

                {asset.buildable && (
                   <>
                       <p className="flex flex-wrap sm:flex-nowrap justify-between gap-x-2"><span>Waktu Bangun:</span> <span className="text-orange-400 font-mono">{asset.constructionTimeHours} Jam</span></p>
                       <div className="mt-2 bg-black/40 p-2 rounded border border-[#333]/50">
                           <span className="text-gray-400 block mb-1.5 font-semibold">Material Dibutuhkan:</span>
                           {asset.buildRequirements && asset.buildRequirements.length > 0 ? (
                               <div className="flex flex-wrap gap-1.5">
                                   {asset.buildRequirements.map((req: AssetRequirement, i: number) => (
                                       <div key={i} className="flex items-center gap-1 bg-[#111] border border-[#444] px-1.5 py-0.5 rounded-sm">
                                           <span className="text-[#c5a880] truncate max-w-[80px]" title={req.itemName}>{req.itemName}</span>
                                           <span className="text-gray-500 font-mono">x{req.quantity}</span>
                                       </div>
                                   ))}
                               </div>
                           ) : (
                               <span className="text-gray-600 italic">Tidak ada material khusus.</span>
                           )}
                       </div>
                   </>
                )}

                {asset.isCraftingStation && asset.recipes && asset.recipes.length > 0 && (
                   <div className="mt-2 bg-black/40 p-2 rounded border border-[#333]/50">
                       <span className="text-gray-400 block mb-1.5 font-semibold">Resep Crafting:</span>
                       <div className="space-y-2">
                           {asset.recipes.map((recipe, i: number) => (
                               <div key={i} className="text-[10px] sm:text-xs">
                                   <div className="text-white font-medium mb-1">
                                       <span className="text-blue-400">{recipe.recipeName}</span> → {recipe.resultQuantity}x <span className="text-purple-400">{recipe.resultItemName}</span>
                                   </div>
                                   <div className="flex flex-wrap gap-1.5">
                                       {recipe.materials && recipe.materials.map((mat, j) => (
                                           <div key={j} className="flex items-center gap-1 bg-[#111] border border-[#444] px-1.5 py-0.5 rounded-sm">
                                               <span className="text-[#c5a880] truncate max-w-[80px]" title={mat.itemName}>{mat.itemName}</span>
                                               <span className="text-gray-500 font-mono">x{mat.quantity}</span>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
                )}
              </div>
            </div>
          ))}

          {/* TAB PET */}
          {activeTab === 'pet' && filteredPets.map((pet) => (
            <div key={pet._id} className={`bg-[#111] border p-4 sm:p-5 rounded-lg flex flex-col gap-3 relative overflow-hidden group hover:border-blue-900/50 hover:shadow-lg transition-all ${getRarityColor(pet.rank)}`}>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-md border border-[#333] flex-shrink-0 flex items-center justify-center p-1 shadow-inner">
                  <FallbackImage
                    src={pet.imageUrl || ""}
                    alt={pet.name}
                    className="max-w-full max-h-full object-contain"
                    fallbackNode={<div className="text-2xl sm:text-4xl">🐾</div>}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-sm sm:text-base leading-tight mb-1.5 ${getRarityTextClass(pet.rank)} truncate`} title={pet.name}>{pet.name}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="rank" rank={pet.rank} className="text-[9px] sm:text-[10px] py-0 h-4">{pet.rank}</Badge>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 h-4 border-[#333] bg-black/40 capitalize">Tier {pet.tier}</Badge>
                    {pet.element && <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 h-4 border-[#333] bg-black/40 capitalize">{pet.element}</Badge>}
                  </div>
                </div>
              </div>
              <div className="mb-2 bg-black/30 p-2 rounded border border-[#333]/50">
                  <p className={`text-[10px] sm:text-xs text-gray-400 italic leading-relaxed`}>
                      {pet.description || 'Tidak ada deskripsi.'}
                  </p>
              </div>

              <div className="mt-auto pt-3 border-t border-[#333] text-[10px] sm:text-xs text-gray-400">
                <div className="grid grid-cols-2 gap-2">
                   <p className="flex flex-wrap sm:flex-nowrap justify-between gap-x-2"><span>HP:</span> <span className="text-green-500 font-mono">{pet.baseHp}</span></p>
                   <p className="flex flex-wrap sm:flex-nowrap justify-between gap-x-2"><span>ATK:</span> <span className="text-red-400 font-mono">{pet.baseAtk}</span></p>
                   <p className="flex flex-wrap sm:flex-nowrap justify-between gap-x-2"><span>DEF:</span> <span className="text-blue-400 font-mono">{pet.baseDef}</span></p>
                   <p className="flex flex-wrap sm:flex-nowrap justify-between gap-x-2"><span>SPD:</span> <span className="text-yellow-400 font-mono">{pet.baseSpd}</span></p>
                </div>
              </div>
            </div>
          ))}

          {/* Empty States */}
          {activeTab === 'item' && filteredItems.length === 0 && (
             <div className="col-span-full">
               <EmptyState icon={<BookOpen />} title="Item Tidak Ditemukan" description="Tidak ada item yang cocok dengan pencarian Anda." />
             </div>
          )}
          {activeTab === 'asset' && filteredAssets.length === 0 && (
             <div className="col-span-full">
               <EmptyState icon={<BookOpen />} title="Asset Tidak Ditemukan" description="Tidak ada aset yang cocok dengan pencarian Anda." />
             </div>
          )}
          {activeTab === 'pet' && filteredPets.length === 0 && (
             <div className="col-span-full">
               <EmptyState icon={<BookOpen />} title="Pet Tidak Ditemukan" description="Tidak ada pet yang cocok dengan pencarian Anda." />
             </div>
          )}
        </div>
      )}
    </div>
  );
}
