'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Store, Gavel, Coins, Loader2 } from "lucide-react";
import { useAuthStore } from '@/lib/store';
import { getRarityColor, getRarityTextClass } from '@/lib/rarity';
import { useRouter } from 'next/navigation';

interface ShopItem {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  emoji: string;
  stock: number;
  rank: string;
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
  rank: string;
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
  rank: string;
}

export default function MarketPage() {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [playerShopItems, setPlayerShopItems] = useState<PlayerShopItem[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [activeTab, setActiveTab] = useState<'system' | 'player' | 'auction' | 'my-shop'>('system');
  const [activeRank, setActiveRank] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success'|'error' } | null>(null);




  // Modal states
  const [buyModal, setBuyModal] = useState<{ isOpen: boolean, shopId: string, name: string, isPlayerShop: boolean, maxQuantity?: number } | null>(null);
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [sellModal, setSellModal] = useState<{ isOpen: boolean } | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const [sellPrice, setSellPrice] = useState<number>(1);
  const [sellCurrency, setSellCurrency] = useState<string>('silver');
  const [sellItemId, setSellItemId] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inventory, setInventory] = useState<any[]>([]);


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
        setMyListings((await api.get('/market/player-shop/my-listings')).data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router]);



  const handleOpenBuyModal = (shopId: string, name: string, isPlayerShop: boolean, maxQuantity?: number) => {
    setBuyModal({ isOpen: true, shopId, name, isPlayerShop, maxQuantity });
    setBuyQuantity(1);
  };

  const handleBuySubmit = async () => {
    if (!buyModal || !buyQuantity || buyQuantity <= 0) {
      setMessage({ text: 'Jumlah tidak valid.', type: 'error' });
      setBuyModal(null);
      return;
    }

    try {
      setActionLoading(true);
      setMessage(null);

      if (buyModal.isPlayerShop) {
        await api.post('/market/player-shop/buy', { listingId: buyModal.shopId, quantity: buyQuantity });
        setMessage({ text: `Berhasil membeli ${buyModal.name} dari Toko Player!`, type: 'success' });
        const playerShopRes = await api.get('/market/player-shop');
        setPlayerShopItems(playerShopRes.data.data);
      } else {
        await api.post('/market/shop/buy', { shopId: buyModal.shopId, quantity: buyQuantity });
        setMessage({ text: `Berhasil membeli ${buyQuantity} ${buyModal.name}!`, type: 'success' });
        const shopRes = await api.get('/market/shop');
        setShopItems(shopRes.data.data);
      }
    } catch (err) {
      setMessage({ text: (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal membeli.', type: 'error' });
    } finally {
      setActionLoading(false);
      setBuyModal(null);
    }
  };

  const handleOpenSellModal = async () => {
    try {
      setActionLoading(true);
      const res = await api.get('/inventory');
      setInventory(res.data.data);
      setSellModal({ isOpen: true });
      if (res.data.data.length > 0) {
        setSellItemId(res.data.data[0].id);
      }
    } catch {
      setMessage({ text: 'Gagal memuat inventory.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSellSubmit = async () => {
    if (!sellItemId || sellQuantity <= 0 || sellPrice <= 0) {
      setMessage({ text: 'Data tidak valid.', type: 'error' });
      return;
    }

    try {
      setActionLoading(true);
      setMessage(null);
      await api.post('/market/player-shop/my-listings/sell', {
        itemId: sellItemId,
        quantity: sellQuantity,
        pricePerUnit: sellPrice,
        currency: sellCurrency
      });
      setMessage({ text: `Berhasil memasukkan item ke Toko Player!`, type: 'success' });
      const myListingsRes = await api.get('/market/player-shop/my-listings');
      setMyListings(myListingsRes.data.data);
      setSellModal(null);
    } catch (err) {
      setMessage({ text: (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal menjual item.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };



  const handleCancelListing = async (listingId: string) => {
    try {
      setConfirmCancelId(null);
      setActionLoading(true);
      setMessage(null);
      const res = await api.post('/market/player-shop/my-listings/cancel', { listingId });
      setMessage({ text: res.data.message || 'Listing berhasil dibatalkan.', type: 'success' });
      // Refresh my listings
      const myListingsRes = await api.get('/market/player-shop/my-listings');
      setMyListings(myListingsRes.data.data);
    } catch (err) {
      setMessage({ text: (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal membatalkan listing.', type: 'error' });
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
    } catch (err) {
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






      {/* Buy Modal */}
      {buyModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c5a880] to-transparent opacity-50"></div>
            <h3 className="text-xl font-bold font-serif text-[#c5a880] mb-2 text-center">Beli {buyModal.name}</h3>
            <p className="text-sm text-gray-400 mb-6 text-center">Masukkan jumlah yang ingin dibeli{buyModal.maxQuantity ? ` (Maks ${buyModal.maxQuantity})` : ''}</p>

            <div className="mb-6 flex justify-center">
              <input
                type="number"
                min="1"
                max={buyModal.maxQuantity || undefined}
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 0)}
                className="w-32 bg-black/50 border border-[#333] text-white rounded p-3 text-center font-bold text-xl focus:outline-none focus:border-[#c5a880] transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBuyModal(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleBuySubmit}
                disabled={actionLoading || buyQuantity <= 0 || (!!buyModal.maxQuantity && buyQuantity > buyModal.maxQuantity)}
                className="flex-1 px-4 py-2 bg-[#1f402e] hover:bg-green-900 disabled:bg-gray-800 text-green-100 rounded border border-green-800 transition-colors text-sm font-bold disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Beli'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {sellModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-green-900/50 rounded-xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-600 to-transparent opacity-50"></div>
            <h3 className="text-xl font-bold font-serif text-green-400 mb-6 text-center">Jual Item di Toko Player</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pilih Item dari Inventory</label>
                <select
                  value={sellItemId}
                  onChange={(e) => {
                     setSellItemId(e.target.value);
                     setSellQuantity(1);
                  }}
                  className="w-full bg-black/50 border border-[#333] text-white rounded p-2 focus:outline-none focus:border-green-600 transition-colors"
                >
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Tersedia: {item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Jumlah</label>
                    <input
                      type="number"
                      min="1"
                      max={inventory.find(i => i.id === sellItemId)?.quantity || 1}
                      value={sellQuantity}
                      onChange={(e) => setSellQuantity(parseInt(e.target.value) || 0)}
                      className="w-full bg-black/50 border border-[#333] text-white rounded p-2 focus:outline-none focus:border-green-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Mata Uang</label>
                    <select
                      value={sellCurrency}
                      onChange={(e) => setSellCurrency(e.target.value)}
                      className="w-full bg-black/50 border border-[#333] text-white rounded p-2 focus:outline-none focus:border-green-600 transition-colors"
                    >
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="jade">Jade</option>
                      <option value="spirit">Spirit</option>
                    </select>
                  </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Harga per Unit</label>
                <input
                  type="number"
                  min="1"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(parseInt(e.target.value) || 0)}
                  className="w-full bg-black/50 border border-[#333] text-white rounded p-2 focus:outline-none focus:border-green-600 transition-colors"
                />
              </div>

            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setSellModal(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors text-sm font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleSellSubmit}
                disabled={actionLoading || sellQuantity <= 0 || sellPrice <= 0 || !sellItemId || inventory.length === 0}
                className="flex-1 px-4 py-2 bg-green-900 hover:bg-green-800 disabled:bg-gray-800 text-green-100 rounded border border-green-700 transition-colors text-sm font-bold disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Pasang di Toko'}
              </button>
            </div>

            {inventory.length === 0 && (
                <p className="text-red-400 text-xs mt-4 text-center">Inventory kamu kosong. Tidak ada item yang bisa dijual.</p>
            )}
          </div>
        </div>
      )}


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

        <button
          onClick={() => setActiveTab('my-shop')}
          className={`px-6 py-3 font-bold ${activeTab === 'my-shop' ? 'text-green-400 border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Store className="inline mr-2" size={18} /> Toko Saya
        </button>
      </div>

      <div className="grid lg:grid-cols-1 gap-8">

        {/* System Shop Section */}
        {activeTab === 'system' && (
        <section className="bg-[#1a1a1a] jianghu-border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-black/50 border-b border-[#333] p-4 flex items-center justify-between">


            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
              <Store className="text-green-400" /> Jualan Saya
            </h2>
            <button
               onClick={handleOpenSellModal}
               disabled={actionLoading}
               className="bg-[#1f402e] hover:bg-green-900 disabled:bg-gray-800 text-green-100 text-sm px-4 py-2 rounded border border-green-700 transition-colors shadow-[0_0_10px_rgba(31,64,46,0.5)] font-bold flex items-center gap-2"
            >
              + Jual Item
            </button>


          </div>

          <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 flex-grow max-h-[700px] overflow-y-auto custom-scrollbar">
            {shopItems.length === 0 ? (
               <div className="text-center py-10 text-gray-500 col-span-full">Toko sedang kosong.</div>
            ) : shopItems.map(item => (
              <div key={item.id} className={`border rounded p-4 flex items-center justify-between transition-colors ${getRarityColor(item.rank)}`}>
                <div className="flex items-center gap-4">
                  <div className="text-3xl p-2 bg-gray-900 rounded border border-gray-700">{item.emoji}</div>
                  <div>
                    <h3 className={`font-bold ${getRarityTextClass(item.rank)}`}>{item.name}</h3>
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
                     onClick={() => handleOpenBuyModal(item.id, item.name, false)}
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


        {/* My Shop Section */}
        {activeTab === 'my-shop' && (
        <section className="bg-[#1a1a1a] jianghu-border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-green-900/20 border-b border-green-900/50 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
              <Store className="text-green-400" /> Jualan Saya
            </h2>
            <button
               onClick={handleOpenSellModal}
               disabled={actionLoading}
               className="bg-[#1f402e] hover:bg-green-900 disabled:bg-gray-800 text-green-100 text-sm px-4 py-2 rounded border border-green-700 transition-colors shadow-[0_0_10px_rgba(31,64,46,0.5)] font-bold flex items-center gap-2"
            >
              + Jual Item
            </button>
          </div>

          <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 flex-grow max-h-[700px] overflow-y-auto custom-scrollbar">
            {myListings.filter(item => activeRank === 'all' || item.rank?.toLowerCase() === activeRank.toLowerCase()).length === 0 ? (
               <div className="text-center py-10 text-gray-500 col-span-full">Kamu belum memiliki jualan aktif di Toko Player. Gunakan command Discord `/market jual` untuk mulai berjualan.</div>
            ) : myListings.filter(item => activeRank === 'all' || item.rank?.toLowerCase() === activeRank.toLowerCase()).map(item => (
              <div key={item.id} className={`border rounded p-4 flex items-center justify-between transition-colors ${getRarityColor(item.rank)}`}>
                <div className="flex items-center gap-4">
                  <div className="text-3xl p-2 bg-gray-900 rounded border border-gray-700">{item.emoji}</div>
                  <div>
                    <h3 className={`font-bold ${getRarityTextClass(item.rank)}`}>{item.name}</h3>
                    <p className="text-xs text-green-400">Kode: {item.kodeListing}</p>
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
                  {confirmCancelId === item.id ? (
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-xs text-red-400">Yakin batalkan?</span>
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleCancelListing(item.id)}
                          className="bg-red-900 hover:bg-red-800 disabled:bg-gray-800 text-white text-xs px-2 py-1 rounded border border-red-700 transition-colors"
                        >
                          Ya
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => setConfirmCancelId(null)}
                          className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-600 transition-colors"
                        >
                          Tidak
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                       disabled={actionLoading}
                       onClick={() => setConfirmCancelId(item.id)}
                       className="bg-red-900 hover:bg-red-800 disabled:bg-gray-800 text-red-100 text-xs px-3 py-1.5 rounded border border-red-700 transition-colors"
                    >
                      Batalkan Jualan
                    </button>
                  )}
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
            {playerShopItems.filter(item => activeRank === 'all' || item.rank?.toLowerCase() === activeRank.toLowerCase()).length === 0 ? (
               <div className="text-center py-10 text-gray-500 col-span-full">Toko sedang kosong.</div>
            ) : playerShopItems.filter(item => activeRank === 'all' || item.rank?.toLowerCase() === activeRank.toLowerCase()).map(item => (
              <div key={item.id} className={`border rounded p-4 flex items-center justify-between transition-colors ${getRarityColor(item.rank)}`}>
                <div className="flex items-center gap-4">
                  <div className="text-3xl p-2 bg-gray-900 rounded border border-gray-700">{item.emoji}</div>
                  <div>
                    <h3 className={`font-bold ${getRarityTextClass(item.rank)}`}>{item.name}</h3>
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
                         onClick={() => handleOpenBuyModal(item.id, item.name, true, item.quantity)}
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
            {auctions.filter(item => activeRank === 'all' || item.rank?.toLowerCase() === activeRank.toLowerCase()).map(auction => (
              <div key={auction.id} className={`border rounded p-4 transition-colors relative overflow-hidden ${getRarityColor(auction.rank)}`}>
                <div className="absolute top-0 right-0 bg-red-900/80 text-[10px] px-2 py-1 rounded-bl text-red-200">
                  Sisa: {new Date(auction.timeLeft).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className="flex gap-4 mt-2">
                  <div className="text-3xl p-2 bg-gray-900 rounded border border-gray-700 h-fit">{auction.emoji}</div>
                  <div className="flex-grow">
                    <h3 className={`font-bold ${getRarityTextClass(auction.rank)}`}>{auction.name}</h3>
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
