import { Package, Search, Filter } from "lucide-react";

export default function InventoryPage() {
  // Mock Data for visual demonstration
  const mockInventory = [
    { id: 1, name: "Besi Mentah", type: "material", rarity: "common", qty: 45, emoji: "🪨" },
    { id: 2, name: "Cangkul Besi", type: "tool", rarity: "uncommon", qty: 1, emoji: "⛏️" },
    { id: 3, name: "Pil Pemulih Qi", type: "consumable", rarity: "rare", qty: 5, emoji: "💊" },
    { id: 4, name: "Kayu Jati", type: "material", rarity: "common", qty: 120, emoji: "🪵" },
    { id: 5, name: "Pedang Bintang", type: "weapon", rarity: "epic", qty: 1, emoji: "⚔️" },
    { id: 6, name: "Bunga Teratai Salju", type: "material", rarity: "legendary", qty: 2, emoji: "🌸" },
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-600 bg-gray-900/50';
      case 'uncommon': return 'border-green-600 bg-green-900/20';
      case 'rare': return 'border-blue-500 bg-blue-900/20';
      case 'epic': return 'border-purple-500 bg-purple-900/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
      case 'legendary': return 'border-yellow-500 bg-yellow-900/20 shadow-[0_0_15px_rgba(234,179,8,0.3)] text-yellow-500';
      default: return 'border-gray-600 bg-gray-900/50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a1a1a] jianghu-border p-6 rounded-lg">
        <div>
          <h1 className="text-3xl font-bold font-serif text-[#c5a880] flex items-center gap-3">
            <Package /> Gudang Penyimpanan
          </h1>
          <p className="text-gray-400 text-sm mt-1">Kapasitas: 6 / 50 Slot</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Cari item..."
              className="w-full bg-black border border-[#333] rounded px-10 py-2 text-sm text-white focus:outline-none focus:border-[#c5a880]"
            />
          </div>
          <button className="bg-black border border-[#333] p-2 rounded hover:text-[#c5a880] hover:border-[#c5a880] transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg">
            <h3 className="font-bold text-[#c5a880] mb-3 border-b border-[#333] pb-2">Kategori</h3>
            <ul className="space-y-1 text-sm">
              <li><button className="w-full text-left px-3 py-2 bg-[#8b0000]/20 text-[#c5a880] border-l-2 border-[#8b0000]">Semua Item</button></li>
              <li><button className="w-full text-left px-3 py-2 text-gray-400 hover:bg-black/50 hover:text-white transition-colors">Bahan Baku (Material)</button></li>
              <li><button className="w-full text-left px-3 py-2 text-gray-400 hover:bg-black/50 hover:text-white transition-colors">Konsumsi (Pil/Herbal)</button></li>
              <li><button className="w-full text-left px-3 py-2 text-gray-400 hover:bg-black/50 hover:text-white transition-colors">Peralatan (Tools)</button></li>
              <li><button className="w-full text-left px-3 py-2 text-gray-400 hover:bg-black/50 hover:text-white transition-colors">Senjata & Armor</button></li>
            </ul>
          </div>
        </div>

        {/* Inventory Grid */}
        <div className="lg:col-span-3">
          <div className="bg-[#1a1a1a] jianghu-border p-6 rounded-lg min-h-[500px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">

              {mockInventory.map((item) => (
                <div key={item.id} className={`relative border rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:scale-105 transition-transform ${getRarityColor(item.rarity)}`}>
                  {/* Quantity Badge */}
                  <div className="absolute -top-2 -right-2 bg-black border border-[#c5a880] text-xs px-2 py-0.5 rounded-full z-10 text-white shadow-lg">
                    x{item.qty}
                  </div>

                  {/* Item Icon */}
                  <div className="text-4xl mb-2 drop-shadow-md">
                    {item.emoji}
                  </div>

                  {/* Item Details */}
                  <div className="w-full mt-auto">
                    <p className="text-xs font-bold text-white truncate px-1">{item.name}</p>
                    <p className="text-[10px] text-gray-400 capitalize mt-0.5">{item.type}</p>
                  </div>
                </div>
              ))}

              {/* Empty Slots Filler */}
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={`empty-${i}`} className="border border-dashed border-[#333] bg-black/20 rounded-lg h-28 flex flex-col items-center justify-center opacity-30">
                  <span className="text-gray-700 text-sm">Kosong</span>
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
