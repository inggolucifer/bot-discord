'use client';

import {
  ShoppingBag,
  Coins,
  Gavel,
  LogOut,
  ArrowRight,
  Map,
  Building2,
  Store,
  Info,
  ExternalLink,
  Sparkles,
  Search,
  Plus,
} from "lucide-react";
import FallbackImage from "@/components/FallbackImage";
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getRarityColor, getRarityTextClass } from '@/lib/rarity';
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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
  hostCity?: string;
  zoneId?: string;
}

const ranks = ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];

export default function MarketClient() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: rawAuctions, isLoading: auctionsLoading } = useQuery<{ data: AuctionItem[] }>({
    queryKey: ['market_auctions'],
    queryFn: async () => {
      const { data } = await api.get('/market/auctions');
      return data;
    },
    enabled: !!user,
  });

  const { data: rawListings, isLoading: listingsLoading } = useQuery<{ data: PlayerListing[] }>({
    queryKey: ['market_listings'],
    queryFn: async () => {
      const { data } = await api.get('/market/player-shop');
      return data;
    },
    enabled: !!user,
  });

  const { data: rawMyListings, isLoading: myListingsLoading } = useQuery<{ data: PlayerListing[] }>({
    queryKey: ['market_my_listings'],
    queryFn: async () => {
      const { data } = await api.get('/market/player-shop/my-listings');
      return data;
    },
    enabled: !!user,
  });

  const auctions: AuctionItem[] = rawAuctions?.data || [];
  const playerShopItems: PlayerListing[] = rawListings?.data || [];
  const myListings: PlayerListing[] = rawMyListings?.data || [];

  // Default active tab: 'player' (Toko Pemain & Barter)
  const [activeTab, setActiveTab] = useState<'player' | 'my-shop' | 'auction' | 'settlement-npc'>('player');
  const [activeRank, setActiveRank] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sell Modal states
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [sellItemId, setSellItemId] = useState('');
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellPrice, setSellPrice] = useState(10);
  const [sellCurrency, setSellCurrency] = useState('silver');

  // Buy Modal states
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buyModalItem, setBuyModalItem] = useState<{ id: string; name: string; maxQuantity?: number } | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleOpenBuyModal = (id: string, name: string, maxQuantity?: number) => {
    setBuyModalItem({ id, name, maxQuantity });
    setBuyQuantity(1);
    setBuyModalOpen(true);
  };

  const handleBuy = async () => {
    if (!buyModalItem) return;
    setActionLoading(true);
    try {
      const res = await api.post('/market/player-shop/buy', {
        listingId: buyModalItem.id,
        quantity: buyQuantity,
      });
      alert(res.data.message || 'Pembelian berhasil!');
      setBuyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['market_listings'] });
      queryClient.invalidateQueries({ queryKey: ['market_my_listings'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal membeli item dari pemain.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory');
      setInventory(res.data.data || []);
    } catch (err) {
      console.error('Failed to load inventory for selling.', err);
    }
  };

  const handleOpenSellModal = async () => {
    await fetchInventory();
    setSellModalOpen(true);
    setSellItemId('');
    setSellQuantity(1);
    setSellPrice(10);
    setSellCurrency('silver');
  };

  const handleSell = async () => {
    if (!sellItemId || sellQuantity <= 0 || sellPrice <= 0) return;
    setActionLoading(true);
    try {
      const res = await api.post('/market/player-shop/my-listings/sell', {
        itemId: sellItemId,
        quantity: sellQuantity,
        pricePerUnit: sellPrice,
        currency: sellCurrency,
      });
      setSellModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['market_listings'] });
      queryClient.invalidateQueries({ queryKey: ['market_my_listings'] });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menggelar lapak jualan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelListing = async (listingId: string) => {
    setActionLoading(true);
    try {
      const res = await api.post('/market/player-shop/my-listings/cancel', { listingId });
      alert(res.data.message || 'Listing berhasil dibatalkan.');
      setConfirmCancelId(null);
      queryClient.invalidateQueries({ queryKey: ['market_listings'] });
      queryClient.invalidateQueries({ queryKey: ['market_my_listings'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal membatalkan listing.');
    } finally {
      setActionLoading(false);
    }
  };

  const CurrencyIcon = ({ currency, className }: { currency: string; className?: string }) => {
    switch (currency) {
      case 'gold':
        return <Coins className={`text-yellow-500 ${className}`} />;
      case 'jade':
        return <Coins className={`text-green-400 ${className}`} />;
      case 'spirit':
        return <Coins className={`text-blue-300 ${className}`} />;
      case 'copper':
        return <Coins className={`text-[#cd7f32] ${className}`} />;
      default:
        return <Coins className={`text-slate-300 ${className}`} />;
    }
  };

  const renderCurrency = (price: number, currency: string) => {
    let colorClass = 'text-slate-200';
    let label = 'Silver';
    if (currency === 'gold') {
      colorClass = 'text-yellow-400';
      label = 'Gold';
    }
    if (currency === 'jade') {
      colorClass = 'text-green-400';
      label = 'Jade';
    }
    if (currency === 'spirit') {
      colorClass = 'text-blue-400';
      label = 'Spirit';
    }
    if (currency === 'copper') {
      colorClass = 'text-amber-600';
      label = 'Copper';
    }

    return (
      <div className="flex items-center gap-1 font-mono">
        <span className={`font-semibold ${colorClass}`} title={label}>
          {price.toLocaleString()}
        </span>
        <CurrencyIcon currency={currency} className="w-3.5 h-3.5" />
      </div>
    );
  };

  const filteredPlayerItems = playerShopItems.filter((item) => {
    const matchesRank =
      activeRank === 'all' || (item.rank || 'common').toLowerCase() === activeRank.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sellerName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRank && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0 py-6">
      {/* Header */}
      <PageHeader
        title="Bursa Perdagangan Jianghu"
        description="Pusat transaksi antarpemain (Player Stalls & Barter), serta warta lelang dan informasi saudagar pemukiman."
        action={
          <div className="flex items-center gap-2">
            <select
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 appearance-none"
              value={activeRank}
              onChange={(e) => setActiveRank(e.target.value)}
            >
              {ranks.map((r) => (
                <option key={r} value={r.toLowerCase()}>
                  {r === 'All' ? 'Semua Kualitas' : `Kualitas: ${r}`}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Spatial Settlement Integration Notice */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
              Sentralisasi Fisik Toko NPC & Balai Lelang
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal">
                Sistem Spasial
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
              Sesuai tata tertib Jianghu, transaksi barang spiritual dengan Saudagar NPC serta penawaran di Balai Lelang resmi kini dilangsungkan secara fisik di dalam **Kota & Pemukiman** pada Peta Dunia. Tab ini melayani khusus **Bursa Antarpemain (Player Stalls & Barter)**.
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/world')}
          className="w-full md:w-auto shrink-0 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 border border-amber-400/30"
        >
          <Map className="w-3.5 h-3.5" />
          Kunjungi Kota di Peta
        </Button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden flex flex-row lg:flex-col shadow-lg p-1.5 gap-1.5">
            <button
              onClick={() => setActiveTab('player')}
              className={`flex-1 lg:w-full text-left px-3.5 py-3 rounded-lg transition-colors flex items-center gap-2.5 text-xs font-semibold ${
                activeTab === 'player'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="truncate">
                <span>Toko Pemain</span>
                <span className="block text-[10px] font-normal text-slate-500">Lapak & Barter</span>
              </div>
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('my-shop')}
                className={`flex-1 lg:w-full text-left px-3.5 py-3 rounded-lg transition-colors flex items-center gap-2.5 text-xs font-semibold ${
                  activeTab === 'my-shop'
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <LogOut className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <span>Lapak Saya</span>
                  <span className="block text-[10px] font-normal text-slate-500">Kelola Jualan</span>
                </div>
              </button>
            )}

            <button
              onClick={() => setActiveTab('auction')}
              className={`flex-1 lg:w-full text-left px-3.5 py-3 rounded-lg transition-colors flex items-center gap-2.5 text-xs font-semibold ${
                activeTab === 'auction'
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Gavel className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="truncate">
                <span>Warta Balai Lelang</span>
                <span className="block text-[10px] font-normal text-slate-500">Pengumuman Kota</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('settlement-npc')}
              className={`flex-1 lg:w-full text-left px-3.5 py-3 rounded-lg transition-colors flex items-center gap-2.5 text-xs font-semibold ${
                activeTab === 'settlement-npc'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Store className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <span>Saudagar NPC</span>
                <span className="block text-[10px] font-normal text-slate-500">Pasar Pemukiman</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {listingsLoading && activeTab === 'player' ? (
            <LoadingState text="Menghubungkan ke Toko Pemain Jianghu..." />
          ) : error ? (
            <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl text-center text-xs text-rose-300">
              {error}
            </div>
          ) : (
            <>
              {/* 1. Player Shop Section (Active default) */}
              {activeTab === 'player' && (
                <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl backdrop-blur-sm">
                  <div className="bg-blue-950/20 border-b border-blue-900/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-blue-300 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-blue-400" />
                        Bursa Lapak & Barter Pemain
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Item yang dijual langsung oleh kultivator lain di seluruh benua.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari item / penjual..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 grid gap-3.5 grid-cols-1 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
                    {filteredPlayerItems.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">Tidak ada barang dagangan yang ditemukan.</p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Kultivator belum menggelar lapak atau kriteria filter tidak cocok.
                        </p>
                      </div>
                    ) : (
                      filteredPlayerItems.map((item) => (
                        <div
                          key={item.id}
                          className={`bg-slate-950/70 border rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all hover:border-blue-500/40 hover:bg-slate-900/60 ${getRarityColor(
                            item.rank || 'common'
                          )}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-2xl w-12 h-12 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                              {item.emoji}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3
                                className={`font-bold text-sm truncate ${getRarityTextClass(
                                  item.rank || 'common'
                                )}`}
                                title={item.name}
                              >
                                {item.name}
                              </h3>
                              <div className="flex flex-col gap-0.5 mt-1 text-[11px]">
                                <span className="text-slate-400">
                                  Penjual: <span className="text-blue-300 font-semibold">{item.sellerName}</span>
                                </span>
                                <span className="text-slate-500">Stok: {item.quantity} unit</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                            {renderCurrency(item.price, item.currency)}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleOpenBuyModal(item.id, item.name, item.quantity)}
                              className="h-7 text-xs border-blue-600/40 text-blue-300 hover:bg-blue-900/30 px-3.5 rounded-lg"
                            >
                              Beli
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* 2. My Listings Section */}
              {activeTab === 'my-shop' && (
                <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl backdrop-blur-sm">
                  <div className="bg-emerald-950/20 border-b border-emerald-900/30 p-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-emerald-300 flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-emerald-400" />
                        Lapak Jualan Saya
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Kelola barang dagangan yang kamu gelar di bursa pasar bebas.
                      </p>
                    </div>
                    <Button
                      onClick={handleOpenSellModal}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Gelar Jualan
                    </Button>
                  </div>

                  <div className="p-4 sm:p-5 grid gap-3.5 grid-cols-1 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
                    {myListings.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        <LogOut className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">Kamu belum menggelar dagangan.</p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Klik tombol &quot;Gelar Jualan&quot; di atas untuk menjual barang dari inventarismu.
                        </p>
                      </div>
                    ) : (
                      myListings.map((item) => (
                        <div
                          key={item.id}
                          className={`bg-slate-950/70 border rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all hover:border-emerald-500/40 hover:bg-slate-900/60 ${getRarityColor(
                            item.rank || 'common'
                          )}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-2xl w-12 h-12 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                              {item.emoji}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3
                                className={`font-bold text-sm truncate ${getRarityTextClass(
                                  item.rank || 'common'
                                )}`}
                                title={item.name}
                              >
                                {item.name}
                              </h3>
                              <div className="flex flex-col gap-0.5 mt-1 text-[11px]">
                                <span className="font-mono text-emerald-400/90">Kode: {item.kodeListing}</span>
                                <span className="text-slate-400">Stok Dijual: {item.quantity} unit</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                            {renderCurrency(item.price, item.currency)}
                            {confirmCancelId === item.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-rose-400">Tarik?</span>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-6 px-2 text-[10px]"
                                  disabled={actionLoading}
                                  onClick={() => handleCancelListing(item.id)}
                                >
                                  Ya
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px]"
                                  disabled={actionLoading}
                                  onClick={() => setConfirmCancelId(null)}
                                >
                                  Batal
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => setConfirmCancelId(item.id)}
                                className="h-7 text-xs px-3 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded-lg"
                              >
                                Tarik Dagangan
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* 3. Auction Announcements Section */}
              {activeTab === 'auction' && (
                <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl backdrop-blur-sm">
                  <div className="bg-rose-950/20 border-b border-rose-900/30 p-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-rose-300 flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-rose-400" />
                        Warta Balai Lelang Dunia
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Jadwal dan daftar lot lelang resmi yang sedang berlangsung di kota-kota Jianghu.
                      </p>
                    </div>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                  </div>

                  <div className="p-4 bg-amber-950/20 border-b border-amber-900/30 text-xs text-amber-200/90 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>
                      <strong>Peraturan Lelang:</strong> Sesuai titah perserikatan pedagang, penawaran resmi hanya dapat diajukan secara fisik di Balai Lelang kota tempat lelang diselenggarakan.
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 grid gap-3.5 grid-cols-1 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
                    {auctions.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        <Gavel className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">Tidak ada lelang aktif saat ini.</p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Nantikan warta lelang langka berikutnya yang akan diumumkan di kota-kota besar.
                        </p>
                      </div>
                    ) : (
                      auctions.map((auction) => {
                        const hostCity = auction.hostCity || 'Kota Pedagang Pusat';
                        return (
                          <div
                            key={auction.id}
                            className={`bg-slate-950/70 border rounded-xl p-4 flex flex-col justify-between gap-3 relative transition-all hover:border-rose-500/40 ${getRarityColor(
                              auction.rank || 'common'
                            )}`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-semibold bg-rose-950/50 text-rose-300 px-2 py-0.5 rounded border border-rose-800/40 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {hostCity}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Batas: {new Date(auction.timeLeft).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className="text-2xl w-12 h-12 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                                  {auction.emoji}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3
                                    className={`font-bold text-sm truncate ${getRarityTextClass(
                                      auction.rank || 'common'
                                    )}`}
                                    title={auction.name}
                                  >
                                    {auction.name}
                                  </h3>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Pelelang: <span className="text-slate-300 font-medium">{auction.seller}</span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-slate-500">Tawaran Tertinggi</p>
                                {renderCurrency(auction.currentBid, auction.currency)}
                              </div>
                              <Button
                                onClick={() => router.push('/world')}
                                className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-slate-100 font-semibold px-3 rounded-lg flex items-center gap-1"
                              >
                                Ke Balai Lelang
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              )}

              {/* 4. Settlement NPC Directory */}
              {activeTab === 'settlement-npc' && (
                <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl backdrop-blur-sm p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-inner">
                    <Store className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">
                    Saudagar NPC & Toko Khusus Pemukiman
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                    Setiap pemukiman dan kota di benua Jianghu memiliki toko saudagar fisik yang menjual pil kultivasi, material langka, serta kitab beladiri sesuai wilayahnya.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-6 text-left">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        Desa Nelayan Pemula
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Menyediakan umpan pancing, jaring ikan, cangkul pemula, dan ransum perjalanan.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        Kota Pedagang Sentral
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Pusat perbekalan spiritual, bijih logam tempa bermutu tinggi, dan bibit tanaman obat.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        Paviliun Kitab & Sekte
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Manual seni beladiri, jurus pedang kultivasi, serta blueprint bangunan langka.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => router.push('/world')}
                    className="mx-auto bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
                  >
                    Buka Peta Dunia & Masuk Pemukiman
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Buy from Player Modal */}
      <Modal
        isOpen={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        title="Beli dari Lapak Pemain"
        maxWidth="sm"
      >
        {buyModalItem && (
          <div className="space-y-4 p-1">
            <p className="text-slate-300 text-xs">
              Membeli <span className="text-blue-300 font-bold">{buyModalItem.name}</span> dari kultivator.
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Jumlah Beli {buyModalItem.maxQuantity && `(Tersedia: ${buyModalItem.maxQuantity})`}
              </label>
              <input
                type="number"
                min="1"
                max={buyModalItem.maxQuantity || 999}
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 text-center text-base font-mono"
              />
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 text-slate-950 font-bold text-xs py-2 rounded-xl"
              disabled={actionLoading || buyQuantity < 1}
              onClick={handleBuy}
            >
              {actionLoading ? 'Memproses Transaksi...' : 'Konfirmasi Pembelian'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Sell Modal */}
      <Modal
        isOpen={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        title="Gelar Lapak Dagangan Baru"
        maxWidth="sm"
      >
        <div className="space-y-4 p-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Pilih Item dari Inventaris
            </label>
            <select
              value={sellItemId}
              onChange={(e) => {
                setSellItemId(e.target.value);
                setSellQuantity(1);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Pilih Item --</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (Stok: {item.quantity})
                </option>
              ))}
            </select>
          </div>

          {sellItemId && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Jumlah Dijual
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={inventory.find((i) => i.id === sellItemId)?.quantity || 1}
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Harga Per Unit (Silver)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs">
                <span className="text-slate-500">Estimasi Total Pendapatan: </span>
                <span className="text-emerald-400 font-bold font-mono">
                  {(sellPrice * sellQuantity).toLocaleString()} Silver
                </span>
              </div>
            </>
          )}

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs py-2 rounded-xl"
            disabled={actionLoading || !sellItemId}
            onClick={handleSell}
          >
            {actionLoading ? 'Mendaftarkan Lapak...' : 'Gelar Lapak Sekarang'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}