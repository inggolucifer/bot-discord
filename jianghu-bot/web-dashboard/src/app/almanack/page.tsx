'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import FallbackImage from '@/components/FallbackImage';
import { getRarityColor, getRarityTextClass } from '@/lib/rarity';
import { BookOpen, Search, Package, PackageOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const ranks = ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine'];

export default function AlmanackPage() {
  const [items, setItems] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]); // Includes both blueprints and built assets
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'error'|'success', text: string} | null>(null);

  const [activeTab, setActiveTab] = useState<'item' | 'asset'>('item');
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
        const [itemsRes, assetsRes] = await Promise.all([
          api.get('/almanack/items'),
          api.get('/almanack/assets')
        ]);
        setItems(itemsRes.data.data);
        setAssets(assetsRes.data.data);
      } catch (err: any) {
        console.error(err);
        setMessage({ type: 'error', text: err.response?.data?.error || 'Gagal memuat Almanack.' });
      } finally {
        setLoading(false);
      }
    };

    fetchAlmanack();
  }, []);

  const filterBySearchAndRank = (list: any[]) => {
    return list.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchRank = activeRank === 'all' || item.rank?.toLowerCase() === activeRank.toLowerCase();
      return matchSearch && matchRank;
    });
  };

  const filteredItems = filterBySearchAndRank(items);
  const filteredAssets = filterBySearchAndRank(assets);

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">
      <PageHeader
        title="Almanack Jianghu"
        description="Kitab panduan lengkap pusaka, item, dan cetak biru bangunan."
        action={
          <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative w-full sm:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
               <input
                 type="text"
                 placeholder="Cari..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-[#111] border border-[#444] rounded-md pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#c5a880] transition-colors"
               />
             </div>
             <select
               className="bg-[#111] border border-[#444] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c5a880] appearance-none"
               value={activeRank}
               onChange={(e) => setActiveRank(e.target.value)}
             >
               {ranks.map(r => <option key={r} value={r.toLowerCase()}>{r === 'All' ? 'Semua Rank' : r}</option>)}
             </select>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-[#333] gap-4 sm:gap-6 overflow-x-auto custom-scrollbar">
        <button
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'item' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => {setActiveTab('item'); setMessage(null);}}
        >
          <Package size={16} /> Item ({filteredItems.length})
        </button>
        <button
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'asset' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => {setActiveTab('asset'); setMessage(null);}}
        >
          <PackageOpen size={16} /> Asset ({filteredAssets.length})
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${message.type === 'error' ? 'bg-red-900/20 border-red-900/50 text-red-400' : 'bg-green-900/20 border-green-900/50 text-green-400'}`}>
          {message.text}
        </div>
      )}

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
                   <p className="flex justify-between"><span>Profit Harian:</span> <span className="text-yellow-500 font-mono">{asset.dailyProfit} {asset.profitCurrency}</span></p>
                )}
                {asset.workerOutputQuantity > 0 && (
                   <p className="flex justify-between"><span>Output Produksi:</span> <span className="text-purple-400 font-mono">{asset.workerOutputQuantity}x {asset.workerOutputItemName}</span></p>
                )}
                {asset.basePrice > 0 && !asset.buildable && (
                   <p className="flex justify-between"><span>Harga (Shop):</span> <span className="text-gray-300 font-mono">{asset.basePrice} {asset.priceCurrency}</span></p>
                )}

                {asset.buildable && (
                   <>
                       <p className="flex justify-between"><span>Waktu Bangun:</span> <span className="text-orange-400 font-mono">{asset.constructionTimeHours} Jam</span></p>
                       <div className="mt-2 bg-black/40 p-2 rounded border border-[#333]/50">
                           <span className="text-gray-400 block mb-1.5 font-semibold">Material Dibutuhkan:</span>
                           {asset.buildRequirements && asset.buildRequirements.length > 0 ? (
                               <div className="flex flex-wrap gap-1.5">
                                   {asset.buildRequirements.map((req: any, i: number) => (
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

        </div>
      )}
    </div>
  );
}
