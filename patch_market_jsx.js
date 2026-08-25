const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jianghu-bot/web-dashboard/src/app/market/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

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

      {/* Buy Modal */}`;

// Before: <Modal isOpen={buyModalOpen}
content = content.replace(
  `<Modal isOpen={buyModalOpen}`,
  sellModalJSX + `\n\n      <Modal isOpen={buyModalOpen}`
);

fs.writeFileSync(filePath, content);
console.log('Injected sell modal JSX');
