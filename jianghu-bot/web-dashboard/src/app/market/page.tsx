import { Store, Gavel, Coins } from "lucide-react";

export default function MarketPage() {
  const mockShopItems = [
    { id: 1, name: "Beliung Biasa", type: "Alat", price: 50, currency: "Copper", emoji: "⛏️" },
    { id: 2, name: "Buku Panduan Meditasi", type: "Buku", price: 2, currency: "Silver", emoji: "📜" },
    { id: 3, name: "Pil Peringan Tubuh", type: "Pil", price: 5, currency: "Silver", emoji: "💊" },
  ];

  const mockAuctions = [
    { id: 101, name: "Pedang Naga Puspa", seller: "Pendekar Mata Elang", currentBid: 5, currency: "Gold", timeLeft: "02:14:30", emoji: "🗡️" },
    { id: 102, name: "Inti Siluman Rubah (Tier 3)", seller: "Rogue Cultivator", currentBid: 12, currency: "Silver", timeLeft: "00:45:12", emoji: "🔮" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-bold font-serif text-[#c5a880]">Pusat Perdagangan Jianghu</h1>
        <p className="text-gray-400">Toko Resmi Sistem dan Balai Lelang Antar Pendekar.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* System Shop Section */}
        <section className="bg-[#1a1a1a] jianghu-border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-black/50 border-b border-[#333] p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
              <Store className="text-[#c5a880]" /> Toko Wuxia
            </h2>
          </div>

          <div className="p-6 grid gap-4 flex-grow">
            {mockShopItems.map(item => (
              <div key={item.id} className="border border-[#333] bg-black/40 rounded p-4 flex items-center justify-between hover:border-[#c5a880] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-3xl p-2 bg-gray-900 rounded border border-gray-700">{item.emoji}</div>
                  <div>
                    <h3 className="font-bold text-gray-200">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.type}</p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-sm font-bold text-gray-300">
                     <span>{item.price}</span>
                     <span className={`text-xs ${item.currency === 'Gold' ? 'text-yellow-500' : item.currency === 'Silver' ? 'text-gray-400' : 'text-orange-500'}`}>
                       {item.currency}
                     </span>
                     <Coins size={14} className={item.currency === 'Gold' ? 'text-yellow-500' : item.currency === 'Silver' ? 'text-gray-400' : 'text-orange-500'} />
                  </div>
                  <button className="bg-[#1f402e] hover:bg-green-900 text-green-100 text-xs px-3 py-1.5 rounded border border-green-800 transition-colors shadow-[0_0_10px_rgba(31,64,46,0.5)]">
                    Beli
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Auction Section */}
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

          <div className="p-6 grid gap-4 flex-grow">
            {mockAuctions.map(auction => (
              <div key={auction.id} className="border border-red-900/30 bg-black/40 rounded p-4 hover:border-red-700/50 transition-colors relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-red-900/80 text-xs px-2 py-1 rounded-bl text-red-200">
                  Sisa: {auction.timeLeft}
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
                          <span className={auction.currency === 'Gold' ? 'text-yellow-500' : 'text-gray-300'}>{auction.currentBid} {auction.currency}</span>
                          <Coins size={14} className={auction.currency === 'Gold' ? 'text-yellow-500' : 'text-gray-400'} />
                        </div>
                      </div>
                      <button className="bg-[#8b0000] hover:bg-red-800 text-white text-xs px-4 py-2 rounded border border-red-700 transition-colors">
                        Tawar (Bid)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="border border-dashed border-[#333] bg-black/20 rounded p-4 text-center text-gray-500 text-sm mt-4">
              Tidak ada item lelang lain saat ini.
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
