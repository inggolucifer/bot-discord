'use client';

import { useState, useEffect } from 'react';
import { Search, Package, PackageOpen, Wrench, BookOpen } from 'lucide-react';
import FallbackImage from '@/components/FallbackImage';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

type TabType = 'item' | 'asset';

export default function AlmanackPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('item');
  const [items, setItems] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemRes, assetRes] = await Promise.all([
        api.get('/almanack/items'),
        api.get('/almanack/assets')
      ]);
      setItems(itemRes.data.data);
      setAssets(assetRes.data.data);
    } catch (error) {
      console.error("Error fetching almanack data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  ;

  // Filter and sort items/assets based on search and tab logic
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#c5a880] flex items-center gap-2">
            <BookOpen size={28} />
            Almanack Jianghu
          </h1>
          <p className="text-gray-400 text-sm mt-1">Kitab panduan lengkap pusaka, item, dan cetak biru bangunan.</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari..."
            className="w-full md:w-64 bg-black/50 border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#c5a880] transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#333] gap-6">
        <button
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'item' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => {setActiveTab('item'); setMessage(null);}}
        >
          <Package size={16} /> Item
        </button>
        <button
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'asset' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => {setActiveTab('asset'); setMessage(null);}}
        >
          <PackageOpen size={16} /> Asset
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${message.type === 'error' ? 'bg-red-900/20 border-red-900 text-red-200' : 'bg-green-900/20 border-green-900 text-green-200'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-[#c5a880] animate-pulse">Memuat Kitab Almanack...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* TAB ITEM */}
          {activeTab === 'item' && filteredItems.map((item) => (
            <div key={item._id} className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-black rounded border border-[#333] flex-shrink-0 flex items-center justify-center p-1">
                  <FallbackImage
                    src={item.imageUrl || ""}
                    alt={item.name}
                    className="max-w-full max-h-full object-contain"
                    fallbackNode={<div className="text-2xl">{item.category === 'weapon' ? '⚔️' : item.category === 'herb' ? '🌿' : '📦'}</div>}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-[#c5a880]">{item.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">{item.rank}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 capitalize">{item.category}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 italic line-clamp-3">{item.description}</p>

              <div className="mt-auto pt-3 border-t border-[#333]/50 text-xs text-gray-500 space-y-1">

                {item.effect && <p><span className="text-gray-400">Efek:</span> {item.effect}</p>}
                {item.basePrice > 0 && <p><span className="text-gray-400">Harga Dasar:</span> {item.basePrice} {item.priceCurrency}</p>}
                {item.obtainedFrom && item.obtainedFrom.length > 0 && (
                    <div className="mt-2">
                        <span className="text-gray-400 block mb-1">Dapat Dari:</span>
                        <ul className="list-disc list-inside text-[10px] text-gray-300 space-y-0.5">
                            {item.obtainedFrom.map((source: string, i: number) => (
                                <li key={i}>{source}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {item.usedFor && item.usedFor.length > 0 && (
                    <div className="mt-2">
                        <span className="text-gray-400 block mb-1">Kegunaan:</span>
                        <ul className="list-disc list-inside text-[10px] text-gray-300 space-y-0.5">
                            {item.usedFor.map((usage: string, i: number) => (
                                <li key={i}>{usage}</li>
                            ))}
                        </ul>
                    </div>
                )}
              </div>
            </div>
          ))}

          {/* TAB ASSET (Gabungan semua aset) */}
          {activeTab === 'asset' && filteredAssets.map((asset) => (
            <div key={asset._id} className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col gap-3">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-black rounded border border-[#333] flex-shrink-0 flex items-center justify-center p-1">
                  <FallbackImage
                    src={asset.imageUrl || ""}
                    alt={asset.name}
                    className="max-w-full max-h-full object-contain"
                    fallbackNode={<div className="text-2xl">🏛️</div>}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-[#c5a880]">{asset.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {asset.buildable && <span className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded border border-green-800">Blueprint (Bisa Dibangun)</span>}
                    {!asset.buildable && <span className="text-[10px] px-1.5 py-0.5 bg-gray-900/50 text-gray-400 rounded border border-gray-700">Aset Jadi</span>}
                    {asset.isCraftingStation && <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded border border-blue-900">Crafting Station</span>}
                    {asset.dailyProfit > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-900/50 text-yellow-500 rounded border border-yellow-700">Income</span>}
                    {asset.workerOutputItemId && <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/50 text-purple-400 rounded border border-purple-800">Production</span>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 italic mb-2">{asset.description}</p>

              <div className="mt-auto pt-3 border-t border-[#333]/50 text-xs text-gray-400 space-y-2">
                {asset.dailyProfit > 0 && (
                   <p className="flex justify-between"><span>Profit Harian:</span> <span className="text-yellow-500">{asset.dailyProfit} {asset.profitCurrency}</span></p>
                )}
                {asset.workerOutputQuantity > 0 && (
                   <p className="flex justify-between"><span>Output Produksi:</span> <span className="text-purple-400">{asset.workerOutputQuantity}x {asset.workerOutputItemName}</span></p>
                )}
                {asset.basePrice > 0 && !asset.buildable && (
                   <p className="flex justify-between"><span>Harga Beli (Shop):</span> <span className="text-gray-300">{asset.basePrice} {asset.priceCurrency}</span></p>
                )}

                {asset.buildable && (
                   <>
                       <p className="flex justify-between"><span>Waktu Pembangunan:</span> <span className="text-orange-400">{asset.constructionTimeHours} Jam</span></p>
                       <div className="mt-2">
                           <span className="text-gray-400 block mb-1">Material Dibutuhkan:</span>
                           {asset.buildRequirements && asset.buildRequirements.length > 0 ? (
                               <div className="flex flex-wrap gap-2">
                                   {asset.buildRequirements.map((req: any, i: number) => (
                                       <div key={i} className="flex items-center gap-1 bg-black/50 border border-[#444] px-2 py-1 rounded">
                                           <span className="text-[#c5a880]">{req.itemName}</span>
                                           <span className="text-gray-500">x{req.quantity}</span>
                                       </div>
                                   ))}
                               </div>
                           ) : (
                               <span className="text-gray-500 italic">Tidak ada material khusus.</span>
                           )}
                       </div>
                   </>
                )}
              </div>
            </div>
          ))}

          {/* Empty States */}
          {activeTab === 'item' && filteredItems.length === 0 && (
             <div className="col-span-full text-center py-10 text-gray-500">Item tidak ditemukan.</div>
          )}
          {activeTab === 'asset' && filteredAssets.length === 0 && (
             <div className="col-span-full text-center py-10 text-gray-500">Aset tidak ditemukan.</div>
          )}


        </div>
      )}
    </div>
  );
}
