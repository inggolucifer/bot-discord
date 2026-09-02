'use client';

import { Store, ShoppingBag, Coins, Gavel, LogOut, ArrowRight, X } from "lucide-react";
import FallbackImage from "@/components/FallbackImage";
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getRarityColor, getRarityTextClass } from '@/lib/rarity';
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  currency: string;
  emoji: string;
  rank?: string;
  stock?: number;
}

interface PlayerListing {
    id: string;
    kodeListing: string;
    name: string;
    price: number;
    currency: string;
    emoji: string;
    quantity: number;
    type: string;
    rank?: string;
    sellerName: string;
}

interface AuctionItem {
  id: string;
  name: string;
  seller: string;
  currentBid: number;
  currency: string;
  emoji: string;
  timeLeft: string;
  rank?: string;
}

const ranks = ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];

export default function MarketPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: rawShop, isLoading: shopLoading } = useQuery({
      queryKey: ['market_shop'],
      queryFn: async () => { const { data } = await api.get('/market/shop'); return data; },
      enabled: !!user
  });
  const { data: rawAuctions, isLoading: auctionsLoading } = useQuery({
      queryKey: ['market_auctions'],
      queryFn: async () => { const { data } = await api.get('/market/auctions'); return data; },
      enabled: !!user
  });
  const { data: rawListings, isLoading: listingsLoading } = useQuery({
      queryKey: ['market_listings'],
      queryFn: async () => { const { data } = await api.get('/market/player-shop'); return data; },
      enabled: !!user
  });
  const { data: rawMyListings, isLoading: myListingsLoading } = useQuery({
      queryKey: ['market_my_listings'],
      queryFn: async () => { const { data } = await api.get('/market/player-shop/my-listings'); return data; },
      enabled: !!user
  });

  const shopItems = rawShop?.data || [];
  const auctions = rawAuctions?.data || [];
  const playerShopItems = rawListings?.data || [];
  const myListings = rawMyListings?.data || [];
  const isMarketLoading = shopLoading || auctionsLoading || listingsLoading || myListingsLoading;

  const [activeTab, setActiveTab] = useState<'shop' | 'player' | 'auction' | 'my-shop'>('shop');
  const [activeRank, setActiveRank] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState(false);

  const [sellSystemModalOpen, setSellSystemModalOpen] = useState(false);
  const [sellSystemItemId, setSellSystemItemId] = useState('');
  const [sellSystemQuantity, setSellSystemQuantity] = useState(1);



  // Sell Modal states
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [sellItemId, setSellItemId] = useState('');
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellPrice, setSellPrice] = useState(10);
  const [sellCurrency, setSellCurrency] = useState('copper');

  // Buy Modal states
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buyModalItem, setBuyModalItem] = useState<{id: string, name: string, isPlayerShop: boolean, maxQuantity?: number} | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);






  const handleSellToSystem = async () => {
      if (!sellSystemItemId || sellSystemQuantity <= 0) return;
      setActionLoading(true);
      try {
          const res = await api.post('/market/shop/sell-to-system', {
              itemId: sellSystemItemId,
              quantity: sellSystemQuantity
          });
          alert(res.data.message || 'Item berhasil dijual ke sistem.');
          setSellSystemModalOpen(false);
          setSellSystemItemId('');
          setSellSystemQuantity(1);
          queryClient.invalidateQueries({ queryKey: ['market_shop'] });
queryClient.invalidateQueries({ queryKey: ['market_auctions'] });
queryClient.invalidateQueries({ queryKey: ['market_listings'] });
              queryClient.invalidateQueries({ queryKey: ['market_my_listings'] });

      } catch(err: any) {
          setError((err as Error & { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal menjual item ke sistem.');
      } finally {
          setActionLoading(false);
      }
  };

  const handleOpenBuyModal = (id: string, name: string, isPlayerShop: boolean, maxQuantity?: number) => {
      setBuyModalItem({ id, name, isPlayerShop, maxQuantity });
      setBuyQuantity(1);
      setBuyModalOpen(true);
  };

  const handleBuy = async () => {
      if(!buyModalItem) return;
      setActionLoading(true);
      try {
          const endpoint = buyModalItem.isPlayerShop ? '/market/player-shop/buy' : '/market/shop/buy';
          const payload = buyModalItem.isPlayerShop
             ? { listingId: buyModalItem.id, quantity: buyQuantity }
             : { shopId: buyModalItem.id, quantity: buyQuantity };

          const res = await api.post(endpoint, payload);
          alert(res.data.message);
          setBuyModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['market_shop'] });
queryClient.invalidateQueries({ queryKey: ['market_auctions'] });
queryClient.invalidateQueries({ queryKey: ['market_listings'] });
              queryClient.invalidateQueries({ queryKey: ['market_my_listings'] });

      } catch (err) {
          alert((err as Error & { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal membeli item.');
      } finally {
          setActionLoading(false);
      }
  };

  const handleBid = async (auctionId: string, currentBid: number) => {
      const bidAmount = currentBid + 1; // Simplify for UI
      if(!confirm(`Lakukan penawaran sebesar ${bidAmount} Silver?`)) return;

      setActionLoading(true);
      try {
          const res = await api.post('/market/auction/bid', { auctionId, bidAmount });
          alert(res.data.message);
          queryClient.invalidateQueries({ queryKey: ['market_shop'] });
queryClient.invalidateQueries({ queryKey: ['market_auctions'] });
queryClient.invalidateQueries({ queryKey: ['market_listings'] });
              queryClient.invalidateQueries({ queryKey: ['market_my_listings'] });

      } catch (err) {
          alert((err as Error & { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal melakukan bid.');
      } finally {
          setActionLoading(false);
      }
  };


  const fetchInventory = async () => {
    try {
        const res = await api.get('/inventory');
        setInventory(res.data.data || []);
    } catch (err) {
        console.error("Failed to load inventory for selling.", err);
    }
  };

  const handleOpenSellSystemModal = async () => {
      await fetchInventory();
      setSellSystemModalOpen(true);
      setSellSystemItemId('');
      setSellSystemQuantity(1);
  };

  const handleOpenSellModal = async () => {
      await fetchInventory();
      setSellModalOpen(true);
      setSellItemId('');
      setSellQuantity(1);
      setSellPrice(10);
      setSellCurrency('copper');
  };

  const handleSell = async () => {
      if(!sellItemId || sellQuantity <= 0 || sellPrice <= 0) return;
      setActionLoading(true);
      try {
          const res = await api.post('/market/player-shop/my-listings/sell', {
              itemId: sellItemId,
              quantity: sellQuantity,
              pricePerUnit: sellPrice,
              currency: sellCurrency
          });
          // No success message state exists in this component, just closing the modal is fine. (Or could add a state if needed)
          setSellModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['market_shop'] });
queryClient.invalidateQueries({ queryKey: ['market_auctions'] });
queryClient.invalidateQueries({ queryKey: ['market_listings'] });
              queryClient.invalidateQueries({ queryKey: ['market_my_listings'] });

      } catch(err: any) {
          setError((err as Error & { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal menjual item.');
      } finally {
          setActionLoading(false);
      }
  };

  const handleCancelListing = async (listingId: string) => {
      setActionLoading(true);
      try {
          const res = await api.post('/market/player-shop/my-listings/cancel', { listingId });
          alert(res.data.message);
          setConfirmCancelId(null);
          queryClient.invalidateQueries({ queryKey: ['market_shop'] });
queryClient.invalidateQueries({ queryKey: ['market_auctions'] });
queryClient.invalidateQueries({ queryKey: ['market_listings'] });
              queryClient.invalidateQueries({ queryKey: ['market_my_listings'] });

      } catch (err) {
          alert((err as Error & { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal membatalkan listing.');
      } finally {
          setActionLoading(false);
      }
  };

  const CurrencyIcon = ({ currency, className }: { currency: string, className?: string }) => {
    switch (currency) {
      case 'gold': return <Coins className={`text-yellow-500 ${className}`} />;
      case 'jade': return <Coins className={`text-green-400 ${className}`} />;
      case 'spirit': return <Coins className={`text-blue-300 ${className}`} />;
      case 'copper': return <Coins className={`text-[#cd7f32] ${className}`} />;
      default: return <Coins className={`text-gray-400 ${className}`} />;
    }
  }

  const renderCurrency = (price: number, currency: string) => {
    let colorClass = 'text-gray-400';
    let label = 'Silver';
    if (currency === 'gold') { colorClass = 'text-yellow-500'; label = 'Gold'; }
    if (currency === 'jade') { colorClass = 'text-green-400'; label = 'Jade'; }
    if (currency === 'spirit') { colorClass = 'text-blue-400'; label = 'Spirit'; }
    if (currency === 'copper') { colorClass = 'text-[#cd7f32]'; label = 'Copper'; }

    return (
      <div className="flex items-center gap-1 font-mono">
        <span className={colorClass} title={label}>{price}</span>
        <CurrencyIcon currency={currency} className="w-3 h-3 sm:w-4 sm:h-4" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">
      <PageHeader
        title="Pasar Sentral"
        description="Beli, jual, dan lelang item di Jianghu."
        action={
          <select
            className="w-full sm:w-auto bg-[#111] border border-[#444] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c5a880] appearance-none"
            value={activeRank}
            onChange={(e) => setActiveRank(e.target.value)}
          >
            {ranks.map(r => <option key={r} value={r.toLowerCase()}>{r === 'All' ? 'Filter: Semua Rank' : `Filter: ${r}`}</option>)}
          </select>
        }
      />

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#111] border border-[#333] rounded-lg overflow-hidden flex flex-col sm:flex-row lg:flex-col shadow-md">
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex-1 lg:w-full text-left px-3 py-3 sm:px-4 sm:py-4 transition-colors flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 ${activeTab === 'shop' ? 'bg-[#c5a880]/10 text-[#c5a880] lg:border-l-4 lg:border-b-0 border-b-4 border-[#c5a880]' : 'text-gray-400 hover:bg-black/50 hover:text-white'}`}
            >
              <Store size={20} className="shrink-0" /> <span className="text-[10px] sm:text-sm font-semibold whitespace-nowrap">Toko Sistem</span>
            </button>
            <button
              onClick={() => setActiveTab('player')}
              className={`flex-1 lg:w-full text-left px-3 py-3 sm:px-4 sm:py-4 transition-colors flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 ${activeTab === 'player' ? 'bg-blue-900/20 text-blue-400 lg:border-l-4 lg:border-b-0 border-b-4 border-blue-500' : 'text-gray-400 hover:bg-black/50 hover:text-white'}`}
            >
              <ShoppingBag size={20} className="shrink-0" /> <span className="text-[10px] sm:text-sm font-semibold whitespace-nowrap">Toko Player</span>
            </button>
            <button
              onClick={() => setActiveTab('auction')}
              className={`flex-1 lg:w-full text-left px-3 py-3 sm:px-4 sm:py-4 transition-colors flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 ${activeTab === 'auction' ? 'bg-[#8b0000]/20 text-red-400 lg:border-l-4 lg:border-b-0 border-b-4 border-[#8b0000]' : 'text-gray-400 hover:bg-black/50 hover:text-white'}`}
            >
              <Gavel size={20} className="shrink-0" /> <span className="text-[10px] sm:text-sm font-semibold whitespace-nowrap">Lelang Live</span>
            </button>
            {user && (
              <button
                onClick={() => setActiveTab('my-shop')}
                className={`flex-1 lg:w-full text-left px-3 py-3 sm:px-4 sm:py-4 transition-colors flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 ${activeTab === 'my-shop' ? 'bg-green-900/20 text-green-400 lg:border-l-4 lg:border-b-0 border-b-4 border-green-500' : 'text-gray-400 hover:bg-black/50 hover:text-white'}`}
              >
                <LogOut size={20} className="shrink-0" /> <span className="text-[10px] sm:text-sm font-semibold whitespace-nowrap">Jualan Saya</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {loading ? (
             <LoadingState text="Menghubungkan ke Pasar Sentral..." />
          ) : error ? (
             <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-center text-red-400">
               {error}
             </div>
          ) : (
            <>
              {/* System Shop Section */}
              {activeTab === 'shop' && (
              <section className="bg-[#111] border border-[#333] rounded-xl overflow-hidden flex flex-col shadow-md">
                <div className="bg-[#c5a880]/10 border-b border-[#c5a880]/30 p-4 sm:p-5 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-[#c5a880] flex items-center gap-2">
                    <Store className="text-[#c5a880] w-5 h-5 sm:w-6 sm:h-6" /> Toko Sistem
                  </h2>
                  <Button onClick={handleOpenSellSystemModal} size="sm" className="bg-[#c5a880] hover:bg-[#a68a65] text-black border-0">
                      Jual ke Sistem
                  </Button>
                </div>

                <div className="p-4 sm:p-6 grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {shopItems?.filter((item: any) => activeRank === 'all' || (item.rank || "common").toLowerCase() === activeRank.toLowerCase()).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-gray-500">
                      Toko sedang kosong atau tidak ada item dengan rank tersebut.
                    </div>
                  ) : shopItems?.filter((item: any) => activeRank === 'all' || (item.rank || "common").toLowerCase() === activeRank.toLowerCase())?.map((item: any) => (
                    <div key={item.id} className={`bg-black/40 border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-black/60 hover:shadow-md ${getRarityColor(item.rank || "common")}`}>
                      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="text-2xl sm:text-3xl w-12 h-12 sm:w-14 sm:h-14 bg-[#111] rounded-md border border-[#333] flex items-center justify-center shrink-0 shadow-inner">
                          {item.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-bold text-sm sm:text-base leading-tight truncate ${getRarityTextClass(item.rank || "common")}`} title={item.name}>{item.name}</h3>
                          <div className="flex gap-2 mt-1 items-center">
                            <span className="text-[10px] text-gray-500 capitalize">{item.type}</span>
                            {item.stock !== -1 && (
                                <span className="text-[10px] text-gray-400 bg-[#222] px-1.5 py-0.5 rounded">Stok: {item.stock}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-center sm:justify-between w-full sm:w-auto gap-3 sm:gap-2 border-t sm:border-t-0 border-[#333] pt-3 sm:pt-0">
                        {renderCurrency(item.price, item.currency)}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleOpenBuyModal(item.id, item.name, false, item.stock !== -1 ? item.stock : undefined)}
                          className="h-8 text-xs border-[#c5a880] text-[#c5a880] hover:bg-[#c5a880]/20 w-full sm:w-auto"
                        >
                          Beli
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              )}

              {/* My Listings Section */}
              {activeTab === 'my-shop' && (
              <section className="bg-[#111] border border-[#1f402e]/50 rounded-xl overflow-hidden flex flex-col shadow-[0_0_15px_rgba(31,64,46,0.1)]">
                <div className="bg-[#1f402e]/30 border-b border-[#1f402e]/50 p-4 sm:p-5 flex items-center">
                  <div className="flex items-center justify-between w-full">
                    <h2 className="text-lg sm:text-xl font-bold font-serif text-green-400 flex items-center gap-2">
                      <LogOut className="text-green-500 w-5 h-5 sm:w-6 sm:h-6" /> Jualan Saya
                    </h2>
                    <Button onClick={handleOpenSellModal} size="sm" className="bg-green-600 hover:bg-green-500 text-white border-0">
                        + Jual Item
                    </Button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {myListings?.filter((item: any) => activeRank === 'all' || (item.rank || "common").toLowerCase() === activeRank.toLowerCase()).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-gray-500 bg-black/30 rounded-lg border border-dashed border-[#333]">
                      Kamu belum memiliki jualan aktif di Toko Player. Gunakan command Discord <code className="bg-black text-gray-300 px-1 rounded">/market jual</code> untuk mulai berjualan.
                    </div>
                  ) : myListings?.filter((item: any) => activeRank === 'all' || (item.rank || "common").toLowerCase() === activeRank.toLowerCase())?.map((item: any) => (
                    <div key={item.id} className={`bg-black/40 border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-black/60 ${getRarityColor(item.rank || "common")}`}>
                      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="text-2xl sm:text-3xl w-12 h-12 sm:w-14 sm:h-14 bg-[#111] rounded-md border border-[#333] flex items-center justify-center shrink-0 shadow-inner">
                          {item.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-bold text-sm sm:text-base leading-tight truncate ${getRarityTextClass(item.rank || "common")}`} title={item.name}>{item.name}</h3>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-[10px] text-green-500/80 font-mono">Kode: {item.kodeListing}</p>
                            <p className="text-[10px] text-gray-400">Stok: {item.quantity}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-center sm:justify-between w-full sm:w-auto gap-3 sm:gap-2 border-t sm:border-t-0 border-[#333] pt-3 sm:pt-0">
                        {renderCurrency(item.price, item.currency)}

                        {confirmCancelId === item.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-red-400 ">Yakin?</span>
                            <Button size="sm" variant="destructive" className="h-7 px-2 text-[10px]" disabled={actionLoading} onClick={() => handleCancelListing(item.id)}>Ya</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" disabled={actionLoading} onClick={() => setConfirmCancelId(null)}>Batal</Button>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => setConfirmCancelId(item.id)}
                            className="h-8 text-xs w-full sm:w-auto bg-[#8b0000] hover:bg-red-800"
                          >
                            Batalkan
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              )}


              {/* Player Shop Section */}
              {activeTab === 'player' && (
              <section className="bg-[#111] border border-[#1e3a5f]/50 rounded-xl overflow-hidden flex flex-col shadow-[0_0_15px_rgba(30,58,95,0.1)]">
                <div className="bg-[#1e3a5f]/20 border-b border-[#1e3a5f]/50 p-4 sm:p-5 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-blue-400 flex items-center gap-2">
                    <ShoppingBag className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6" /> Toko Player
                  </h2>
                </div>

                <div className="p-4 sm:p-6 grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {playerShopItems?.filter((item: any) => activeRank === 'all' || (item.rank || "common").toLowerCase() === activeRank.toLowerCase()).length === 0 ? (
                    <div className="col-span-full py-8 text-center text-gray-500">Toko Player sedang kosong.</div>
                  ) : playerShopItems?.filter((item: any) => activeRank === 'all' || (item.rank || "common").toLowerCase() === activeRank.toLowerCase())?.map((item: any) => (
                    <div key={item.id} className={`bg-black/40 border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-black/60 ${getRarityColor(item.rank || "common")}`}>
                      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="text-2xl sm:text-3xl w-12 h-12 sm:w-14 sm:h-14 bg-[#111] rounded-md border border-[#333] flex items-center justify-center shrink-0 shadow-inner">
                          {item.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-bold text-sm sm:text-base leading-tight truncate ${getRarityTextClass(item.rank || "common")}`} title={item.name}>{item.name}</h3>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-[10px] text-blue-400/80">Penjual: {item.sellerName}</p>
                            <p className="text-[10px] text-gray-400">Stok: {item.quantity}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-center sm:justify-between w-full sm:w-auto gap-3 sm:gap-2 border-t sm:border-t-0 border-[#333] pt-3 sm:pt-0">
                        {renderCurrency(item.price, item.currency)}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleOpenBuyModal(item.id, item.name, true, item.quantity)}
                          className="h-8 text-xs border-blue-900 text-blue-400 hover:bg-blue-900/30 w-full sm:w-auto"
                        >
                          Beli
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              )}

              {/* Live Auction Section */}
              {activeTab === 'auction' && (
              <section className="bg-[#111] border border-[#8b0000]/50 rounded-xl overflow-hidden flex flex-col shadow-[0_0_15px_rgba(139,0,0,0.1)]">
                <div className="bg-[#8b0000]/20 border-b border-[#8b0000]/50 p-4 sm:p-5 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-red-400 flex items-center gap-2">
                    <Gavel className="text-red-500 w-5 h-5 sm:w-6 sm:h-6" /> Lelang Terbuka (Live)
                  </h2>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                </div>

                <div className="p-4 sm:p-6 grid gap-4 grid-cols-1 md:grid-cols-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {auctions?.filter((item: any) => activeRank === 'all' || (item.rank || "common").toLowerCase() === activeRank.toLowerCase())?.map((auction: any) => (
                    <div key={auction.id} className={`bg-black/60 border rounded-lg p-4 transition-all relative overflow-hidden group hover:shadow-md ${getRarityColor(auction.rank || "common")}`}>
                      <div className="absolute top-0 right-0 bg-red-900/80 text-[9px] sm:text-[10px] px-2 py-1 rounded-bl-md text-red-100 font-mono">
                        Sisa: {new Date(auction.timeLeft).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <div className="flex gap-3 sm:gap-4 mt-2">
                        <div className="text-2xl sm:text-3xl w-14 h-14 sm:w-16 sm:h-16 bg-[#111] rounded-md border border-[#333] flex items-center justify-center shrink-0 shadow-inner mt-1">
                          {auction.emoji}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h3 className={`font-bold text-sm sm:text-base leading-tight truncate ${getRarityTextClass(auction.rank || "common")}`} title={auction.name}>{auction.name}</h3>
                          <p className="text-[10px] text-gray-500 mt-1 mb-2">Penjual: <span className="text-gray-400">{auction.seller}</span></p>

                          <div className="flex justify-between items-end mt-auto pt-2 border-t border-[#333]/50">
                            <div>
                              <p className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">Penawaran Tertinggi</p>
                              {renderCurrency(auction.currentBid, auction.currency)}
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleBid(auction.id, auction.currentBid)}
                              className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 bg-[#8b0000] hover:bg-red-800"
                            >
                              Tawar (+1)
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {auctions?.length === 0 && (
                      <div className="col-span-full border border-dashed border-[#333] bg-black/20 rounded-lg p-6 text-center text-gray-500 text-sm">
                        Tidak ada item lelang saat ini.
                      </div>
                  )}
                </div>
              </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      <Modal
        isOpen={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        title="Beli Barang"
        maxWidth="sm"
      >
        {buyModalItem && (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">Anda akan membeli <span className="text-[#c5a880] font-bold">{buyModalItem.name}</span>.</p>

            <div className="bg-black/40 p-4 rounded-lg border border-[#333]">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Jumlah Beli {buyModalItem.maxQuantity && `(Max: ${buyModalItem.maxQuantity})`}
              </label>
              <input
                type="number"
                min="1"
                max={buyModalItem.maxQuantity || 999}
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(Number(e.target.value))}
                className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c5a880] text-center text-lg font-mono"
              />
            </div>

            <Button
              variant="default"
              className="w-full"
              disabled={actionLoading || buyQuantity < 1}
              onClick={handleBuy}
            >
              {actionLoading ? 'Memproses...' : 'Konfirmasi Pembelian'}
            </Button>
          </div>
        )}
      </Modal>



      {/* Sell To System Modal */}
      <Modal isOpen={sellSystemModalOpen} onClose={() => setSellSystemModalOpen(false)} title="Jual ke Sistem" maxWidth="sm">
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pilih Item (yang memiliki harga dasar)</label>
                  <select
                      value={sellSystemItemId}
                      onChange={(e) => {
                          setSellSystemItemId(e.target.value);
                          setSellSystemQuantity(1);
                      }}
                      className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c5a880] text-sm appearance-none"
                  >
                      <option value="">-- Pilih Item --</option>
                      {inventory.filter((item: { id: string; name: string; quantity: number; price?: number; priceCurrency?: string }) => item.price && item.price > 0).map((item: any) => (
                          <option key={item.id} value={item.id}>
                              {item.name} (Stok: {item.quantity}) - {Math.floor(item.price * 0.2)} {item.priceCurrency || 'copper'}/unit
                          </option>
                      ))}
                  </select>
                  {inventory.filter((item: { id: string; name: string; quantity: number; price?: number; priceCurrency?: string }) => item.price && item.price > 0).length === 0 && (
                      <p className="text-xs text-red-400 mt-2">Tidak ada item dengan harga dasar di inventory kamu.</p>
                  )}
              </div>

              {sellSystemItemId && (
                <>
                  <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Jumlah Dijual</label>
                      <input
                          type="number"
                          min="1"
                          max={inventory.find((i: { id: string; name: string; quantity: number; price?: number; priceCurrency?: string }) => i.id === sellSystemItemId)?.quantity || 1}
                          value={sellSystemQuantity}
                          onChange={(e) => setSellSystemQuantity(parseInt(e.target.value) || 1)}
                          className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c5a880] text-sm font-mono"
                      />
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg border border-[#333] text-center">
                    <p className="text-xs text-gray-400">Total Didapat (20% Harga Dasar):</p>
                    <p className="text-lg font-bold text-[#c5a880] flex items-center justify-center gap-2 mt-1">
                      {(() => {
                         const item = inventory.find((i: { id: string; name: string; quantity: number; price?: number; priceCurrency?: string }) => i.id === sellSystemItemId);
                         if (!item) return '-';
                         const total = Math.floor(item.price * sellSystemQuantity * 0.2);
                         return renderCurrency(total, item.priceCurrency || 'copper');
                      })()}
                    </p>
                  </div>
                </>
              )}

              <Button
                  onClick={handleSellToSystem}
                  disabled={actionLoading || !sellSystemItemId || sellSystemQuantity <= 0}
                  className="w-full bg-[#c5a880] hover:bg-[#a68a65] text-black mt-2 border-0"
              >
                  {actionLoading ? 'Memproses...' : 'Konfirmasi Jual'}
              </Button>
          </div>
      </Modal>

      {/* Sell Modal */}
      <Modal isOpen={sellModalOpen} onClose={() => setSellModalOpen(false)} title="Jual Item" maxWidth="sm">
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pilih Item</label>
                  <select
                      value={sellItemId}
                      onChange={(e) => {
                          setSellItemId(e.target.value);
                          setSellQuantity(1);
                      }}
                      className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm appearance-none"
                  >
                      <option value="">-- Pilih Item --</option>
                      {inventory.map((item: { id: string; name: string; quantity: number; price?: number; priceCurrency?: string }) => (
                          <option key={item.id} value={item.id}>
                              {item.name} (Stok: {item.quantity})
                          </option>
                      ))}
                  </select>
              </div>

              {sellItemId && (
                <>
                  <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Jumlah Dijual</label>
                      <input
                          type="number"
                          min="1"
                          max={inventory.find((i: { id: string; name: string; quantity: number; price?: number; priceCurrency?: string }) => i.id === sellItemId)?.quantity || 1}
                          value={sellQuantity}
                          onChange={(e) => setSellQuantity(parseInt(e.target.value) || 1)}
                          className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm font-mono"
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Harga / Unit</label>
                          <input
                              type="number"
                              min="1"
                              value={sellPrice}
                              onChange={(e) => setSellPrice(parseInt(e.target.value) || 1)}
                              className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm font-mono"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mata Uang</label>
                          <select
                              value={sellCurrency}
                              onChange={(e) => setSellCurrency(e.target.value)}
                              className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm appearance-none"
                          >
                              <option value="copper">Copper 🟤</option>
                              <option value="silver">Silver 🥈</option>
                              <option value="gold">Gold 🥇</option>
                              <option value="jade">Jade 💎</option>
                              <option value="spirit">Spirit 🔮</option>
                          </select>
                      </div>
                  </div>
                </>
              )}

              <Button
                  onClick={handleSell}
                  disabled={actionLoading || !sellItemId || sellQuantity <= 0 || sellPrice <= 0}
                  className="w-full bg-green-700 hover:bg-green-600 mt-2 border-0"
              >
                  {actionLoading ? 'Memproses...' : 'Pasang di Toko'}
              </Button>
          </div>
      </Modal>
    </div>
  );
}