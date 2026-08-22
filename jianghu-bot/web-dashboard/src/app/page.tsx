import { Coins, Flame, Scroll, Users, Sword } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-[#1a1a1a] jianghu-border p-8 text-center">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] pointer-events-none"></div>
        <h1 className="text-3xl md:text-5xl font-bold mb-4 font-serif text-[#c5a880] tracking-wide">
          Gerbang Menuju Dunia Persilatan
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          Selamat datang di Pusat Manajemen Meta-Economy Jianghu RP.
          Silakan login menggunakan akun Discord Anda untuk mengelola Kultivasi, Inventory, dan Aset Anda secara langsung.
        </p>

        {/* Mock Character Status Card (Will be dynamic later) */}
        <div className="bg-black/60 border border-[#333] rounded-lg p-6 flex flex-col md:flex-row items-center gap-6 max-w-3xl mx-auto text-left relative z-10 backdrop-blur-sm">

          <div className="relative w-24 h-24 rounded-full border-2 border-[#c5a880] overflow-hidden flex-shrink-0 bg-gray-800 shadow-[0_0_15px_rgba(197,168,128,0.3)]">
             <div className="absolute inset-0 flex items-center justify-center text-4xl">🧑‍🎤</div>
          </div>

          <div className="flex-grow space-y-2 w-full">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white font-serif">Pendekar Tanpa Nama</h2>
                <p className="text-[#c5a880] flex items-center gap-2 text-sm">
                  <Flame size={14} /> Mortal - Tahap Awal
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs bg-[#1f402e] text-green-300 px-2 py-1 rounded border border-green-800">
                  <Users size={12} /> Tanpa Sekte
                </span>
              </div>
            </div>

            <div className="w-full bg-gray-900 rounded-full h-2 mt-4 border border-[#333]">
              <div className="bg-gradient-to-r from-yellow-700 to-[#c5a880] h-2 rounded-full" style={{width: '45%'}}></div>
            </div>
            <p className="text-xs text-right text-gray-500 mt-1">Energi Kultivasi: 45/100</p>
          </div>
        </div>
      </section>

      {/* Currency & Quick Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col items-center justify-center gap-2">
           <div className="w-10 h-10 rounded-full bg-orange-900/30 flex items-center justify-center text-orange-500 border border-orange-900/50">
              <Coins size={20} />
           </div>
           <span className="text-xs text-gray-400">Copper</span>
           <span className="text-xl font-bold text-orange-300">1,250</span>
        </div>
        <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col items-center justify-center gap-2">
           <div className="w-10 h-10 rounded-full bg-gray-700/30 flex items-center justify-center text-gray-300 border border-gray-600/50">
              <Coins size={20} />
           </div>
           <span className="text-xs text-gray-400">Silver</span>
           <span className="text-xl font-bold text-gray-300">34</span>
        </div>
        <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col items-center justify-center gap-2">
           <div className="w-10 h-10 rounded-full bg-yellow-900/30 flex items-center justify-center text-yellow-500 border border-yellow-700/50">
              <Coins size={20} />
           </div>
           <span className="text-xs text-gray-400">Gold</span>
           <span className="text-xl font-bold text-yellow-500">2</span>
        </div>
        <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
           <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center text-green-400 border border-green-700/50">
              <Coins size={20} />
           </div>
           <span className="text-xs text-gray-400">Jade</span>
           <span className="text-xl font-bold text-green-400">0</span>
        </div>
      </section>

      {/* Quick Actions (Visual Only for now) */}
      <section className="grid md:grid-cols-3 gap-6">
        <a href="/inventory" className="group bg-[#1a1a1a] jianghu-border p-6 rounded-lg hover:border-[#c5a880] transition-colors flex flex-col items-center text-center gap-3">
          <div className="p-3 bg-black rounded-full text-[#c5a880] group-hover:scale-110 transition-transform">
            <Scroll size={32} />
          </div>
          <h3 className="font-bold font-serif text-lg text-white">Gudang Penyimpanan</h3>
          <p className="text-sm text-gray-400">Kelola inventory, material, dan mulai meracik item (*Crafting*).</p>
        </a>

        <a href="#" className="group bg-[#1a1a1a] jianghu-border p-6 rounded-lg hover:border-[#8b0000] transition-colors flex flex-col items-center text-center gap-3">
          <div className="p-3 bg-black rounded-full text-[#8b0000] group-hover:scale-110 transition-transform">
            <Sword size={32} />
          </div>
          <h3 className="font-bold font-serif text-lg text-white">Manajemen Aset</h3>
          <p className="text-sm text-gray-400">Tugaskan pekerja ke tambang, ladang, dan klaim hasil produksi.</p>
        </a>

        <a href="#" className="group bg-[#1a1a1a] jianghu-border p-6 rounded-lg hover:border-[#1f402e] transition-colors flex flex-col items-center text-center gap-3">
          <div className="p-3 bg-black rounded-full text-[#34d399] group-hover:scale-110 transition-transform">
            <Users size={32} />
          </div>
          <h3 className="font-bold font-serif text-lg text-white">Balai Sekte</h3>
          <p className="text-sm text-gray-400">Pusat logistik dan komunikasi bagi anggota sekte Anda.</p>
        </a>
      </section>
    </div>
  );
}
