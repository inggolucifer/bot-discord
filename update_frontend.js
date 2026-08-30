const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jianghu-bot/web-dashboard/src/app/market/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add states for sell to system modal
const statesInjection = `
  const [sellSystemModalOpen, setSellSystemModalOpen] = useState(false);
  const [sellSystemItemId, setSellSystemItemId] = useState('');
  const [sellSystemQuantity, setSellSystemQuantity] = useState(1);
`;
content = content.replace('const [actionLoading, setActionLoading] = useState(false);', 'const [actionLoading, setActionLoading] = useState(false);\n' + statesInjection);

// 2. Add handleSellToSystem function
const functionInjection = `
  const handleSellToSystem = async () => {
      if (!sellSystemItemId || sellSystemQuantity <= 0) return;
      setActionLoading(true);
      try {
          const res = await api.post('/market/shop/sell-to-system', {
              itemId: sellSystemItemId,
              quantity: sellSystemQuantity
          });
          toast.success(res.data.message || 'Item berhasil dijual ke sistem.');
          setSellSystemModalOpen(false);
          setSellSystemItemId('');
          setSellSystemQuantity(1);
          await setTimeout(() => fetchData(), 0);
      } catch(err: any) {
          setError(err.response?.data?.error || 'Gagal menjual item ke sistem.');
      } finally {
          setActionLoading(false);
      }
  };
`;
content = content.replace('const handleOpenBuyModal = ', functionInjection + '\n  const handleOpenBuyModal = ');


// 3. Add Jual ke Sistem button to Toko Sistem header
const shopHeaderSearch = `<div className="bg-[#c5a880]/10 border-b border-[#c5a880]/30 p-4 sm:p-5 flex items-center">
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-[#c5a880] flex items-center gap-2">
                    <Store className="text-[#c5a880] w-5 h-5 sm:w-6 sm:h-6" /> Toko Sistem Tertinggi
                  </h2>
                </div>`;

const shopHeaderReplace = `<div className="bg-[#c5a880]/10 border-b border-[#c5a880]/30 p-4 sm:p-5 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-[#c5a880] flex items-center gap-2">
                    <Store className="text-[#c5a880] w-5 h-5 sm:w-6 sm:h-6" /> Toko Sistem
                  </h2>
                  {user && (
                    <Button onClick={() => setSellSystemModalOpen(true)} size="sm" className="bg-[#c5a880] hover:bg-[#a68a65] text-black border-0">
                        Jual ke Sistem
                    </Button>
                  )}
                </div>`;
content = content.replace(shopHeaderSearch, shopHeaderReplace);

// 4. Add the new Modal at the end
const modalSearch = `{/* Sell Modal */}`;
const modalReplace = `
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
                      {inventory.filter((item: any) => item.basePrice && item.basePrice > 0).map((item: any) => (
                          <option key={item.itemId} value={item.itemId}>
                              {item.name} (Stok: {item.quantity}) - {item.basePrice * 0.2} {item.priceCurrency || 'copper'}/unit
                          </option>
                      ))}
                  </select>
                  {inventory.filter((item: any) => item.basePrice && item.basePrice > 0).length === 0 && (
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
                          max={inventory.find((i: any) => i.itemId === sellSystemItemId)?.quantity || 1}
                          value={sellSystemQuantity}
                          onChange={(e) => setSellSystemQuantity(parseInt(e.target.value) || 1)}
                          className="w-full bg-[#111] border border-[#444] rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c5a880] text-sm font-mono"
                      />
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg border border-[#333] text-center">
                    <p className="text-xs text-gray-400">Total Didapat (20% Harga Dasar):</p>
                    <p className="text-lg font-bold text-[#c5a880] flex items-center justify-center gap-2 mt-1">
                      {(() => {
                         const item = inventory.find((i: any) => i.itemId === sellSystemItemId);
                         if (!item) return '-';
                         const total = Math.floor(item.basePrice * sellSystemQuantity * 0.2);
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

      {/* Sell Modal */}`;

content = content.replace(modalSearch, modalReplace);

fs.writeFileSync(filePath, content);
console.log('Done replacing');
