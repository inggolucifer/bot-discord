const fs = require('fs');
const filepath = 'jianghu-bot/web-dashboard/src/app/market/page.tsx';
let code = fs.readFileSync(filepath, 'utf8');

// 1. Add "Toko Saya" tab and its state
code = code.replace(
  "const [activeTab, setActiveTab] = useState<'system' | 'player' | 'auction'>('system');",
  "const [myListings, setMyListings] = useState<any[]>([]);\n  const [activeTab, setActiveTab] = useState<'system' | 'player' | 'auction' | 'my-shop'>('system');"
);

// 2. Fetch data for myListings
code = code.replace(
  "setPlayerShopItems((await api.get('/market/player-shop')).data.data);",
  "setPlayerShopItems((await api.get('/market/player-shop')).data.data);\n        setMyListings((await api.get('/market/player-shop/my-listings')).data.data);"
);

// 3. Add handleBuySystemShop function with confirmation
const handleBuySystemShopStr = `
  const handleBuy = async (shopId: string, name: string) => {
    const q = prompt(\`Berapa banyak \${name} yang ingin kamu beli?\`, "1");
    if (q === null) return;
    const quantityToBuy = parseInt(q || "0");
    if (isNaN(quantityToBuy) || quantityToBuy <= 0) {
      setMessage({ text: 'Jumlah tidak valid.', type: 'error' });
      return;
    }

    try {
      setActionLoading(true);
      setMessage(null);
      const res = await api.post('/market/shop/buy', { shopId, quantity: quantityToBuy });
      setMessage({ text: \`Berhasil membeli \${quantityToBuy} \${name}!\`, type: 'success' });
      const shopRes = await api.get('/market/shop');
      setShopItems(shopRes.data.data);
    } catch (err: unknown) {
      setMessage({ text: (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal membeli.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };
`;
code = code.replace(
  /const handleBuy = async \(shopId: string, name: string\) => {[\s\S]*?};\n/,
  handleBuySystemShopStr
);

// 4. Add handleCancelListing function
const handleCancelListingStr = `
  const handleCancelListing = async (listingId: string) => {
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await api.post('/market/player-shop/my-listings/cancel', { listingId });
      setMessage({ text: res.data.message || 'Listing berhasil dibatalkan.', type: 'success' });
      // Refresh my listings
      const myListingsRes = await api.get('/market/player-shop/my-listings');
      setMyListings(myListingsRes.data.data);
    } catch (err: unknown) {
      setMessage({ text: (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal membatalkan listing.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };
`;
code = code.replace(
  "const handleBuyPlayerShop = async",
  handleCancelListingStr + "\n  const handleBuyPlayerShop = async"
);

// 5. Add "Toko Saya" Tab Button
const tabButtonStr = `
        <button
          onClick={() => setActiveTab('my-shop')}
          className={\`px-6 py-3 font-bold \${activeTab === 'my-shop' ? 'text-green-400 border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-300'}\`}
        >
          <Store className="inline mr-2" size={18} /> Toko Saya
        </button>
      </div>
`;
code = code.replace(
  "</div>\n\n      <div className=\"grid lg:grid-cols-1 gap-8\">",
  tabButtonStr + "\n      <div className=\"grid lg:grid-cols-1 gap-8\">"
);

// 6. Add "Toko Saya" Section Content
const myShopSectionStr = `
        {/* My Shop Section */}
        {activeTab === 'my-shop' && (
        <section className="bg-[#1a1a1a] jianghu-border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-green-900/20 border-b border-green-900/50 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
              <Store className="text-green-400" /> Jualan Saya
            </h2>
          </div>

          <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 flex-grow max-h-[700px] overflow-y-auto custom-scrollbar">
            {myListings.length === 0 ? (
               <div className="text-center py-10 text-gray-500 col-span-full">Kamu belum memiliki jualan aktif di Toko Player. Gunakan command Discord \`/market jual\` untuk mulai berjualan.</div>
            ) : myListings.map(item => (
              <div key={item.id} className="border border-green-900/30 bg-black/40 rounded p-4 flex items-center justify-between hover:border-green-700/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-3xl p-2 bg-gray-900 rounded border border-gray-700">{item.emoji}</div>
                  <div>
                    <h3 className="font-bold text-gray-200">{item.name}</h3>
                    <p className="text-xs text-green-400">Kode: {item.kodeListing}</p>
                    <p className="text-[10px] text-gray-600 mt-1">Stok: {item.quantity}</p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-sm font-bold text-gray-300">
                     <span>{item.price}</span>
                     <span className={\`text-xs \${item.currency === 'gold' ? 'text-yellow-500' : item.currency === 'jade' ? 'text-green-400' : item.currency === 'spirit' ? 'text-blue-300' : 'text-gray-400'}\`}>
                       {item.currency.charAt(0).toUpperCase() + item.currency.slice(1)}
                     </span>
                     <Coins size={14} className={item.currency === 'gold' ? 'text-yellow-500' : item.currency === 'jade' ? 'text-green-400' : item.currency === 'spirit' ? 'text-blue-300' : 'text-gray-400'} />
                  </div>
                  <button
                     disabled={actionLoading}
                     onClick={() => {
                        if (confirm(\`Apakah kamu yakin ingin membatalkan penjualan \${item.name}?\`)) {
                          handleCancelListing(item.id);
                        }
                     }}
                     className="bg-red-900 hover:bg-red-800 disabled:bg-gray-800 text-red-100 text-xs px-3 py-1.5 rounded border border-red-700 transition-colors"
                  >
                    Batalkan Jualan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}
`;

code = code.replace(
  "{/* Player Shop Section */}",
  myShopSectionStr + "\n\n        {/* Player Shop Section */}"
);

fs.writeFileSync(filepath, code);
