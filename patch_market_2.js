const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/web-dashboard/src/app/market/page.tsx', 'utf8');

// Modal State
const stateInsert = `
  // Modal states
  const [buyModal, setBuyModal] = useState<{ isOpen: boolean, shopId: string, name: string, isPlayerShop: boolean, maxQuantity?: number } | null>(null);
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [sellModal, setSellModal] = useState<{ isOpen: boolean } | null>(null);
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const [sellPrice, setSellPrice] = useState<number>(1);
  const [sellCurrency, setSellCurrency] = useState<string>('silver');
  const [sellItemId, setSellItemId] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inventory, setInventory] = useState<any[]>([]);
`;
code = code.replace(/const \[message, setMessage\] = useState<[^>]+>\(null\);/, match => match + '\n' + stateInsert);


// handleBuy function modification
const newHandlers = `
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
        setMessage({ text: \`Berhasil membeli \${buyModal.name} dari Toko Player!\`, type: 'success' });
        const playerShopRes = await api.get('/market/player-shop');
        setPlayerShopItems(playerShopRes.data.data);
      } else {
        await api.post('/market/shop/buy', { shopId: buyModal.shopId, quantity: buyQuantity });
        setMessage({ text: \`Berhasil membeli \${buyQuantity} \${buyModal.name}!\`, type: 'success' });
        const shopRes = await api.get('/market/shop');
        setShopItems(shopRes.data.data);
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Gagal membeli.', type: 'error' });
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
    } catch (err) {
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
      setMessage({ text: \`Berhasil memasukkan item ke Toko Player!\`, type: 'success' });
      const myListingsRes = await api.get('/market/player-shop/my-listings');
      setMyListings(myListingsRes.data.data);
      setSellModal(null);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Gagal menjual item.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };
`;

code = code.replace(/const handleBuy = async \([\s\S]*?finally {\s*setActionLoading\(false\);\s*}\s*};/, newHandlers);
code = code.replace(/const handleBuyPlayerShop = async \([\s\S]*?finally {\s*setActionLoading\(false\);\s*}\s*};/, '');

// Fix inline onClick handlers for Beli buttons
code = code.replace(/onClick=\{\(\) => handleBuy\(item\.id, item\.name\)\}/g, "onClick={() => handleOpenBuyModal(item.id, item.name, false)}");
code = code.replace(/onClick=\{\(\) => \{\s*const q = prompt\(`Berapa banyak \$\{item\.name\} yang ingin kamu beli\? \(Maks \$\{item\.quantity\}\)`, "1"\);\s*const numQ = parseInt\(q \|\| "0"\);\s*if\(numQ > 0\) handleBuyPlayerShop\(item\.id, item\.name, numQ\);\s*\}\}/g, "onClick={() => handleOpenBuyModal(item.id, item.name, true, item.quantity)}");


// Add "Jual Item" Button
const buttonInsert = `
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
`;
code = code.replace(/<h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">[\s\S]*?<\/h2>/, buttonInsert);


// Add Modals JSX
const modalsJSX = `
      {/* Buy Modal */}
      {buyModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c5a880] to-transparent opacity-50"></div>
            <h3 className="text-xl font-bold font-serif text-[#c5a880] mb-2 text-center">Beli {buyModal.name}</h3>
            <p className="text-sm text-gray-400 mb-6 text-center">Masukkan jumlah yang ingin dibeli{buyModal.maxQuantity ? \` (Maks \${buyModal.maxQuantity})\` : ''}</p>

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
`;

code = code.replace(/<div className="max-w-6xl mx-auto space-y-8">/, `<div className="max-w-6xl mx-auto space-y-8">\n${modalsJSX}`);

fs.writeFileSync('jianghu-bot/web-dashboard/src/app/market/page.tsx', code);
console.log('patched market');
