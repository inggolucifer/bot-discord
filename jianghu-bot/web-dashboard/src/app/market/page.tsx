'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Store, Gavel, Coins, Loader2 } from "lucide-react";
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface ShopItem {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  emoji: string;
  stock: number;
}

interface PlayerShopItem {
  id: string;
  name: string;
  sellerId: string;
  sellerName: string;
  price: number;
  currency: string;
  emoji: string;
  quantity: number;
  type: string;
}

interface AuctionItem {
  id: string;
  name: string;
  seller: string;
  currentBid: number;
  currency: string;
  timeLeft: string;
  emoji: string;
  quantity: number;
}

export default function MarketPage() {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [playerShopItems, setPlayerShopItems] = useState<PlayerShopItem[]>([]);
  const [activeTab, setActiveTab] = useState<'system' | 'player' | 'auction'>('system');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success'|'error' } | null>(null);

  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [shopRes, auctionRes] = await Promise.all([
          api.get('/market/shop'),
          api.get('/market/auctions'),
          api.get('/market/player-shop')
        ]);
        setShopItems(shopRes.data.data);
        setAuctions(auctionRes.data.data);
        setPlayerShopItems((await api.get('/market/player-shop')).data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  const handleBuy = async (shopId: string, name: string) => {
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await api.post('/market/shop/buy', { shopId, quantity: 1 });
      setMessage({ text: `Berhasil membeli ${name}!`, type: 'success' });
      // Refresh shop data if needed
      const shopRes = await api.get('/market/shop');
      setShopItems(shopRes.data.data);
    } catch (err: unknown) {
      setMessage({ text: (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal membeli.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyPlayerShop = async (listingId: string, name: string, quantityToBuy: number) => {
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await api.post('/market/player-shop/buy', { listingId, quantity: quantityToBuy });
      setMessage({ text: `Berhasil membeli ${name} dari Toko Player!`, type: 'success' });
      // Refresh player shop data
      const playerShopRes = await api.get('/market/player-shop');
      setPlayerShopItems(playerShopRes.data.data);
    } catch (err: unknown) {
      setMessage({ text: (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal membeli.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBid = async (auctionId: string, currentBid: number) => {
    try {
      setActionLoading(true);
      setMessage(null);
      // Simplify logic: bid current + 1
      const bidAmount = currentBid + 1;
      const res = await api.post(`/market/auctions/${auctionId}/bid`, { bidAmount });
      setMessage({ text: res.data.message, type: 'success' });
      const auctionRes = await api.get('/market/auctions');
      setAuctions(auctionRes.data.data);
    } catch (err: unknown) {
      setMessage({ text: (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal menawar.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20 text-[#c5a880]"><Loader2 className="animate-spin" size={48} /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-bold font-serif text-[#c5a880]">Pusat Perdagangan Jianghu</h1>
        <p className="text-gray-400">Toko Resmi Sistem dan Balai Lelang Antar Pendekar.</p>
      </div>

      {message && (
        <div className={`p-4 rounded border text-center font-bold ${message.type === 'success' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-4 border-b border-[#333] mb-6">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-6 py-3 font-bold ${activeTab === 'system' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Store className="inline mr-2" size={18} /> Toko Sistem
        </button>
        <button
          onClick={() => setActiveTab('player')}
          className={`px-6 py-3 font-bold ${activeTab === 'player' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Coins className="inline mr-2" size={18} /> Toko Player
        </button>
        <button
          onClick={() => setActiveTab('auction')}
          className={`px-6 py-3 font-bold ${activeTab === 'auction' ? 'text-red-400 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Gavel className="inline mr-2" size={18} /> Lelang
        </button>
      </div>

      <div className="grid lg:grid-cols-1 gap-8">

        {/* System Shop Section */}
        {activeTab === 'system' && (
        <section className="bg-[#1a1a1a] jianghu-border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-black/50 border-b border-[#333] p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
              <Store className="text-[#c5a880]" /> Toko Wuxia
            </h2>
          </div>

          <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 flex-grow max-h-[700px] overflow-y-auto custom-scrollbar">
            {shopItems.length === 0 ? (
               <div className="text-center py-10 text-gray-500 col-span-full">Toko sedang kosong.</div>
            ) : shopItems.map(item => (
              <div key={item.id} className="border border-[#333] bg-black/40 rounded p-4 flex items-center justify-between hover:border-[#c5a880] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-3xl p-2 bg-gray-900 rounded border border-gray-700">{item.emoji}</div>
                  <div>
                    <h3 className="font-bold text-gray-200">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.type}</p>
                    {item.stock !== -1 && <p className="text-[10px] text-gray-600 mt-1">Stok: {item.stock}</p>}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-sm font-bold text-gray-300">
                     <span>{item.price}</span>
                     <span className={`text-xs ${item.currency === 'gold' ? 'text-yellow-500' : item.currency === 'jade' ? 'text-green-400' : item.currency === 'spirit' ? 'text-blue-300' : 'text-gray-400'}`}>
                       {item.currency.charAt(0).toUpperCase() + item.currency.slice(1)}
                     </span>
                     <Coins size={14} className={item.currency === 'gold' ? 'text-yellow-500' : item.currency === 'jade' ? 'text-green-400' : item.currency === 'spirit' ? 'text-blue-300' : 'text-gray-400'} />
                  </div>
                  <button
                     disabled={actionLoading}
                     onClick={() => handleBuy(item.id, item.name)}
                     className="bg-[#1f402e] hover:bg-green-900 disabled:bg-gray-800 text-green-100 text-xs px-3 py-1.5 rounded border border-green-800 transition-colors shadow-[0_0_10px_rgba(31,64,46,0.5)]"
                  >
                    Beli
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* Player Shop Section */}
        {activeTab === 'player' && (
        <section className="bg-[#1a1a1a] jianghu-border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-black/50 border-b border-[#333] p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
              <Coins className="text-blue-400" /> Toko Player
            </h2>
          </div>

          <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 flex-grow max-h-[700px] overflow-y-auto custom-scrollbar">
            {playerShopItems.length === 0 ? (
               <div className="text-center py-10 text-gray-500 col-span-full">Toko sedang kosong.</div>
            ) : playerShopItems.map(item => (
              <div key={item.id} className="border border-[#333] bg-black/40 rounded p-4 flex items-center justify-between hover:border-blue-900 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-3xl p-2 bg-gray-900 rounded border border-gray-700">{item.emoji}</div>
                  <div>
                    <h3 className="font-bold text-gray-200">{item.name}</h3>
                    <p className="text-xs text-blue-400">Penjual: {item.sellerName}</p>
                    <p className="text-[10px] text-gray-600 mt-1">Stok: {item.quantity}</p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-sm font-bold text-gray-300">
                     <span>{item.price}</span>
                     <span className={`text-xs ${item.currency === 'gold' ? 'text-yellow-500' : item.currency === 'jade' ? 'text-green-400' : item.currency === 'spirit' ? 'text-blue-300' : 'text-gray-400'}`}>
                       {item.currency.charAt(0).toUpperCase() + item.currency.slice(1)}
                     </span>
                     <Coins size={14} className={item.currency === 'gold' ? 'text-yellow-500' : item.currency === 'jade' ? 'text-green-400' : item.currency === 'spirit' ? 'text-blue-300' : 'text-gray-400'} />
                  </div>
                  <div className="flex items-center gap-2">
                      <button
                         disabled={actionLoading}
                         onClick={() => {
                             const q = prompt(`Berapa banyak ${item.name} yang ingin kamu beli? (Maks ${item.quantity})`, "1");
                             const numQ = parseInt(q || "0");
                             if(numQ > 0) handleBuyPlayerShop(item.id, item.name, numQ);
                         }}
                         className="bg-blue-900 hover:bg-blue-800 disabled:bg-gray-800 text-blue-100 text-xs px-3 py-1.5 rounded border border-blue-700 transition-colors"
                      >
                        Beli
                      </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* Live Auction Section */}
        {activeTab === 'auction' && (
        <section className="bg-[#1a1a1a] jianghu-border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-[#8b0000]/20 border-b border-[#8b0000]/50 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
              <Gavel className="text-red-400" /> Lelang Terbuka (Live)
            </h2>
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>

          <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 flex-grow max-h-[700px] overflow-y-auto custom-scrollbar">
            {auctions.map(auction => (
              <div key={auction.id} className="border border-red-900/30 bg-black/40 rounded p-4 hover:border-red-700/50 transition-colors relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-red-900/80 text-[10px] px-2 py-1 rounded-bl text-red-200">
                  Sisa: {new Date(auction.timeLeft).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className="flex gap-4 mt-2">
                  <div className="text-3xl p-2 bg-gray-900 rounded border border-gray-700 h-fit">{auction.emoji}</div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-red-100">{auction.name}</h3>
                    <p className="text-xs text-gray-500 mb-3">Penjual: {auction.seller}</p>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Penawaran Tertinggi</p>
                        <div className="flex items-center gap-1 font-bold">
                          <span className={auction.currency === 'gold' ? 'text-yellow-500' : auction.currency === 'jade' ? 'text-green-400' : auction.currency === 'spirit' ? 'text-blue-300' : 'text-gray-300'}>{auction.currentBid} Silver</span>
                          <Coins size={14} className={'text-gray-400'} />
                        </div>
                      </div>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleBid(auction.id, auction.currentBid)}
                        className="bg-[#8b0000] hover:bg-red-800 disabled:bg-gray-800 text-white text-xs px-4 py-2 rounded border border-red-700 transition-colors"
                      >
                        Tawar (+1)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {auctions.length === 0 && (
                <div className="col-span-full border border-dashed border-[#333] bg-black/20 rounded p-4 text-center text-gray-500 text-sm mt-4">
                  Tidak ada item lelang saat ini.
                </div>
            )}
          </div>
        </section>
        )}

      </div>
    </div>
  );
}
