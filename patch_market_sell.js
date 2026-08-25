const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jianghu-bot/web-dashboard/src/app/market/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add states for Sell Modal
const statesToAdd = `
  // Sell Modal states
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [sellItemId, setSellItemId] = useState('');
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellPrice, setSellPrice] = useState(10);
  const [sellCurrency, setSellCurrency] = useState('silver');

`;
content = content.replace('  // Buy Modal states', statesToAdd + '  // Buy Modal states');

// 2. Add fetchInventory & handleSell function right before handleCancelListing
const functionsToAdd = `
  const fetchInventory = async () => {
    try {
        const res = await api.get('/inventory');
        setInventory(res.data.data.items);
    } catch (err: any) {
        console.error("Failed to load inventory for selling.", err);
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
      if(!sellItemId || sellQuantity <= 0 || sellPrice <= 0) return;
      setActionLoading(true);
      try {
          const res = await api.post('/market/player-shop/my-listings/sell', {
              itemId: sellItemId,
              quantity: sellQuantity,
              pricePerUnit: sellPrice,
              currency: sellCurrency
          });
          setSuccessMessage(res.data.message);
          setSellModalOpen(false);
          await setTimeout(() => fetchData(), 0);
      } catch(err: any) {
          setError(err.response?.data?.error || 'Gagal menjual item.');
      } finally {
          setActionLoading(false);
      }
  };

`;
content = content.replace('  const handleCancelListing = async (listingId: string) => {', functionsToAdd + '  const handleCancelListing = async (listingId: string) => {');

// 3. Add Jual button next to the Jualan Saya header
content = content.replace(
`<h2 className="text-lg sm:text-xl font-bold font-serif text-green-400 flex items-center gap-2">
                    <LogOut className="text-green-500 w-5 h-5 sm:w-6 sm:h-6" /> Jualan Saya
                  </h2>`,
`<div className="flex items-center justify-between w-full">
                    <h2 className="text-lg sm:text-xl font-bold font-serif text-green-400 flex items-center gap-2">
                      <LogOut className="text-green-500 w-5 h-5 sm:w-6 sm:h-6" /> Jualan Saya
                    </h2>
                    <Button onClick={handleOpenSellModal} size="sm" className="bg-green-600 hover:bg-green-500 text-white border-0">
                        + Jual Item
                    </Button>
                  </div>`
);

// 4. Add Sell Modal at the end of the file, right before the Buy Modal
const sellModalJSX = `
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
                      {inventory.map((item: any) => (
                          <option key={item.itemId} value={item.itemId}>
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
                          max={inventory.find((i: any) => i.itemId === sellItemId)?.quantity || 1}
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

      {/* Buy Modal */}
`;

content = content.replace('      {/* Buy Modal */}', sellModalJSX);

fs.writeFileSync(filePath, content);
console.log('Market Sell Feature added successfully.');
