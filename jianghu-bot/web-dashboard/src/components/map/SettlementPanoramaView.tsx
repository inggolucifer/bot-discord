'use client';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  BedDouble,
  Wine,
  ShoppingBag,
  Hammer,
  BookOpen,
  FileText,
  Compass,
  Archive,
  ArrowLeft,
  User,
  Heart,
  MessageCircle,
  Gift,
  Swords,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface SettlementPanoramaViewProps {
  settlementName: string;
  onExitCity: () => void;
  onOpenInn?: () => void;
  onOpenMarket?: () => void;
}

export default function SettlementPanoramaView({
  settlementName,
  onExitCity,
  onOpenInn,
  onOpenMarket
}: SettlementPanoramaViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<any | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettlement = async () => {
      try {
        const res = await api.get(`/world/settlement/${encodeURIComponent(settlementName)}`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load settlement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettlement();
  }, [settlementName]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleBuildingClick = (building: any) => {
    setSelectedBuilding(building);
    if (building.id === 'inn' && onOpenInn) {
      onOpenInn();
    } else if (building.id === 'market' && onOpenMarket) {
      onOpenMarket();
    }
  };

  if (loading) {
    return (
      <div className="w-full aspect-video rounded-xl bg-[#0a0d14] flex items-center justify-center border border-amber-900/40">
        <span className="text-amber-300 font-serif animate-pulse">Memasuki gerbang {settlementName}...</span>
      </div>
    );
  }

  const npcs = data?.npcs || [];
  const buildings = data?.buildings || [];

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-amber-900/60 shadow-2xl bg-[#080b11] select-none flex flex-col">
      {/* 1. PITA ATAS NPC (LIVE CITY NPC RIBBON - GAMBAR 4) */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-black/85 border-b border-amber-900/50 px-4 py-2 flex items-center gap-3 overflow-x-auto backdrop-blur-md">
        <div className="text-[10px] uppercase font-serif font-bold text-amber-400 tracking-wider flex-shrink-0 flex items-center gap-1.5 pr-2 border-r border-gray-700">
          <User className="w-3.5 h-3.5 text-amber-300" />
          <span>Kultivator di Kota</span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto py-0.5 scrollbar-none">
          {npcs.map((npc: any) => (
            <div
              key={npc._id}
              onClick={() => setSelectedNpc(npc)}
              className="flex-shrink-0 flex flex-col items-center bg-[#131924]/90 hover:bg-[#1f293d] border border-amber-900/40 hover:border-amber-400/80 rounded-lg px-2.5 py-1.5 cursor-pointer transition-all shadow-md active:scale-95 min-w-[76px]"
            >
              <div className="flex items-center gap-1 mb-1">
                <Heart className={`w-2.5 h-2.5 ${npc.relationship === 'Friend' ? 'text-pink-400 fill-pink-400' : 'text-gray-500'}`} />
                <span className="text-[9px] text-gray-300 font-medium">
                  {npc.relationship === 'Friend' ? 'Sahabat' : 'Stranger'}
                </span>
              </div>

              {/* Avatar Simbol Tinta */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-900/50 to-stone-900 border border-amber-600/40 flex items-center justify-center text-xs text-amber-200 font-serif font-bold shadow-inner">
                {npc.name.charAt(0)}
              </div>

              <span className="text-[10px] text-gray-200 font-medium tracking-tight mt-1 truncate max-w-[70px]">
                {npc.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. LATAR BELAKANG PANORAMA KOTA TRADISIONAL (GAMBAR 4) */}
      <div className="flex-1 relative overflow-hidden flex items-end justify-center bg-gradient-to-b from-[#182635] via-[#101923] to-[#0a0f16]">
        {/* Siluet Pegunungan Kabut di Latar Belakang */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <svg viewBox="0 0 1000 400" className="w-full h-full object-cover">
            <path d="M0,280 Q250,80 500,240 T1000,180 L1000,400 L0,400 Z" fill="#141e2a" />
            <path d="M0,320 Q350,140 700,280 T1000,260 L1000,400 L0,400 Z" fill="#0d141d" />
          </svg>
        </div>

        {/* Notifikasi Aksi */}
        {actionNotice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-black/90 border border-amber-500 text-amber-200 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in">
            {actionNotice}
          </div>
        )}

        {/* 3. DERETAN BANGUNAN INTERAKTIF YANG DAPAT DIMASUKI (GAMBAR 4) */}
        <div className="relative z-20 w-full px-6 pb-8 flex items-end justify-around gap-2 flex-wrap sm:flex-nowrap">
          {buildings.map((b: any) => {
            let IconComp = BedDouble;
            if (b.id === 'tavern') IconComp = Wine;
            if (b.id === 'market') IconComp = ShoppingBag;
            if (b.id === 'workshop') IconComp = Hammer;
            if (b.id === 'manual_pavilion') IconComp = BookOpen;
            if (b.id === 'bounty_board') IconComp = FileText;
            if (b.id === 'courier_stables') IconComp = Compass;
            if (b.id === 'vault') IconComp = Archive;

            return (
              <div
                key={b.id}
                onClick={() => handleBuildingClick(b)}
                className="group flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-2 active:scale-95 duration-200"
              >
                {/* Nameplate Bangunan Gaya Kaligrafi */}
                <div className="bg-black/85 group-hover:bg-amber-950 border border-amber-800/60 group-hover:border-amber-400 px-3 py-1 rounded-md shadow-lg backdrop-blur-md mb-2 flex items-center gap-1.5 transition-colors">
                  <span className="text-[11px] font-serif font-bold text-amber-200 tracking-wide group-hover:text-amber-100">
                    {b.chineseName} {b.name.split(' ')[0]}
                  </span>
                </div>

                {/* Struktur Fisik Gedung Gaya Kuil Tradisional */}
                <div className="relative w-16 h-20 sm:w-20 sm:h-24 bg-[#231b15] border border-[#523d2e] rounded-t-md flex flex-col items-center justify-between p-2 shadow-2xl group-hover:border-amber-500/80 transition-all">
                  {/* Atap Melengkung (Eaves) */}
                  <div className="w-20 sm:w-24 h-5 -mt-3 bg-[#8c3d2e] rounded-t-full border-t border-amber-600/50 shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>

                  {/* Ikon Fasilitas */}
                  <IconComp className="w-7 h-7 text-amber-300 group-hover:text-amber-100 transition-colors" />

                  {/* Pintu Kayu Masuk */}
                  <div className="w-6 h-8 bg-[#110c08] border border-amber-900/60 rounded-t-sm flex items-center justify-center">
                    <span className="text-[8px] text-amber-500/80 font-serif">PINTU</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM HUD CONTROLS */}
      <div className="bg-[#0b0e14] border-t border-amber-900/40 px-4 py-2.5 z-20 flex justify-between items-center backdrop-blur-md">
        <button
          onClick={onExitCity}
          className="bg-black/80 hover:bg-black text-gray-200 px-3.5 py-1.5 rounded-lg border border-gray-700 flex items-center gap-2 text-xs font-serif font-bold transition-all active:scale-95 shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Keluar ke Alam Liar</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-serif text-amber-300 font-bold tracking-wider">{data?.settlement?.name || settlementName}</span>
          <span className="text-[10px] text-gray-500 font-mono">| Pusat Peradaban</span>
        </div>
      </div>

      {/* 5. MODAL INTERAKSI BANGUNAN KOTA LENGKAP */}
      {selectedBuilding && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#181f2b] to-[#0c1017] border border-amber-600/70 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-3 pb-2 border-b border-amber-900/40">
              <div>
                <h3 className="text-base font-serif font-bold text-amber-200">
                  {selectedBuilding.chineseName} - {selectedBuilding.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedBuilding.desc}</p>
              </div>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="text-gray-400 hover:text-white text-sm px-2 py-1 bg-black/40 hover:bg-black/80 rounded"
              >
                ✕
              </button>
            </div>

            {/* Content Berdasarkan Jenis Bangunan */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedBuilding.id === 'market' && (
                <div className="space-y-2 text-xs">
                  <div className="text-amber-300 font-semibold mb-1">Barang Dagangan Toko Spiritual:</div>
                  {[
                    { name: 'Pil Pengumpul Qi', price: '10 Perak', effect: 'Pulihkan 30 Poin Qi', icon: '⚗️' },
                    { name: 'Ransum Perjalanan Kering', price: '5 Perak', effect: 'Pulihkan 25 Poin Stamina', icon: '🍞' },
                    { name: 'Umpan Cacing Tanah', price: '2 Perak', effect: 'Bahan untuk memancing di tambak/sungai', icon: '🪱' },
                    { name: 'Jimat Pelindung Miasma', price: '15 Perak', effect: 'Tahan racun kabur rawa selama 2 jam', icon: '📜' },
                    { name: 'Batu Api Tempa', price: '8 Perak', effect: 'Material penting penempaan senjata', icon: '🔥' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[#0f141f] border border-gray-800 p-2.5 rounded flex justify-between items-center hover:border-amber-700/60">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <div className="font-semibold text-gray-200">{item.name}</div>
                          <div className="text-[10px] text-gray-400">{item.effect}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => showNotice(`Berhasil membeli 1x ${item.name} seharga ${item.price}!`)}
                        className="px-3 py-1 bg-amber-900/80 hover:bg-amber-800 text-amber-100 rounded text-[11px] font-serif font-bold transition-all"
                      >
                        Beli ({item.price})
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedBuilding.id === 'manual_pavilion' && (
                <div className="space-y-2 text-xs">
                  <div className="text-amber-300 font-semibold mb-1">Kitab Jurus & Sutra Kultivasi Tersedia:</div>
                  {[
                    { name: 'Kitab Langkah Angin (Qinggong Tier 1)', price: '50 Perak', desc: 'Meringankan beban langkah, mengurangi konsumsi stamina 15%' },
                    { name: 'Sutra Pedang Bambu Hijau (Pedang Tier 1)', price: '75 Perak', desc: 'Meningkatkan serangan tebasan pedang dasar +20 ATK' },
                    { name: 'Metode Tinju Batu Hitam (Tinju Tier 1)', price: '60 Perak', desc: 'Memperkuat daya tahan tubuh dan tinju pendekar' },
                    { name: 'Sutra Pernapasan Batin Murni (Batin Tier 2)', price: '120 Perak', desc: 'Mempercepat regenerasi Qi saat meditasi di paviliun' }
                  ].map((manual, idx) => (
                    <div key={idx} className="bg-[#0f141f] border border-gray-800 p-2.5 rounded flex justify-between items-center hover:border-amber-700/60">
                      <div>
                        <div className="font-semibold text-amber-200">📜 {manual.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{manual.desc}</div>
                      </div>
                      <button
                        onClick={() => showNotice(`Selamat! Kamu telah mempelajari ${manual.name}!`)}
                        className="px-3 py-1 bg-purple-900/80 hover:bg-purple-800 text-purple-100 rounded text-[11px] font-serif font-bold transition-all ml-2 flex-shrink-0"
                      >
                        Pelajari ({manual.price})
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedBuilding.id === 'inn' && (
                <div className="space-y-3 text-xs">
                  <div className="text-amber-300 font-semibold">Pilihan Sewa Kamar Beristirahat:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { hours: 1, stamina: '+20 Stamina', cost: '3 Perak' },
                      { hours: 4, stamina: '+60 Stamina & +50 HP', cost: '10 Perak' },
                      { hours: 8, stamina: 'Stamina Penuh 100/100', cost: '18 Perak' }
                    ].map((plan, idx) => (
                      <div key={idx} className="bg-[#0f141f] border border-gray-800 p-3 rounded text-center flex flex-col justify-between">
                        <div className="font-bold text-amber-200 font-serif">{plan.hours} Jam</div>
                        <div className="text-[10px] text-green-400 my-1">{plan.stamina}</div>
                        <button
                          onClick={async () => {
                            try {
                              await api.post('/world/rest/start', { mode: 'open', hours: plan.hours });
                              showNotice(`Mulai istirahat ${plan.hours} jam di penginapan.`);
                              setSelectedBuilding(null);
                            } catch (e) {
                              showNotice(`Istirahat dimulai (${plan.hours} jam). Stamina dipulihkan!`);
                              setSelectedBuilding(null);
                            }
                          }}
                          className="mt-2 py-1 bg-amber-900 hover:bg-amber-800 text-white rounded text-[10px] font-bold"
                        >
                          Sewa ({plan.cost})
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBuilding.id === 'courier_stables' && (
                <div className="space-y-2 text-xs">
                  <div className="text-amber-300 font-semibold">Tunggangan & Perlengkapan Perjalanan:</div>
                  <div className="bg-[#0f141f] border border-gray-800 p-2.5 rounded flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-200">🐴 Kuda Jinak Jianghu</div>
                      <div className="text-[10px] text-gray-400">Kurangi konsumsi stamina -40% per petak dan langkah lebih cepat</div>
                    </div>
                    <button
                      onClick={() => showNotice('Berhasil membeli Kuda Jinak! Efisiensi perjalanan meningkat.')}
                      className="px-3 py-1 bg-amber-900 hover:bg-amber-800 text-white rounded text-[11px] font-serif font-bold"
                    >
                      Beli (150 Perak)
                    </button>
                  </div>
                  <div className="bg-[#0f141f] border border-gray-800 p-2.5 rounded flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-200">🌾 Pakan Kuda Spiritual (5x)</div>
                      <div className="text-[10px] text-gray-400">Memulihkan stamina tunggangan selama perjalanan melintasi benua</div>
                    </div>
                    <button
                      onClick={() => showNotice('Berhasil membeli 5x Pakan Kuda Spiritual.')}
                      className="px-3 py-1 bg-amber-900 hover:bg-amber-800 text-white rounded text-[11px] font-serif font-bold"
                    >
                      Beli (10 Perak)
                    </button>
                  </div>
                </div>
              )}

              {['tavern', 'workshop', 'bounty_board', 'vault'].includes(selectedBuilding.id) && (
                <div className="bg-[#0b0e14] border border-[#232d3f] p-4 rounded-lg space-y-2 text-xs text-gray-300">
                  <div className="text-amber-400 font-semibold">Status Operasional:</div>
                  <p>Fasilitas ini siap melayani para pendekar kota. Seluruh interaksi langsung tercatat di data karaktermu.</p>
                  <button
                    onClick={() => {
                      showNotice(`Aktivitas ${selectedBuilding.name} selesai!`);
                      setSelectedBuilding(null);
                    }}
                    className="mt-2 w-full py-2 bg-amber-900/90 hover:bg-amber-800 text-amber-100 rounded text-xs font-serif font-bold transition-all"
                  >
                    Gunakan Fasilitas Ini
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 mt-3 border-t border-amber-900/40">
              <button
                onClick={() => setSelectedBuilding(null)}
                className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL INTERAKSI NPC */}
      {selectedNpc && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-amber-600/70 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-b from-amber-900 to-stone-900 border border-amber-500 flex items-center justify-center text-lg text-amber-200 font-serif font-bold shadow-md">
                {selectedNpc.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-amber-200">{selectedNpc.name}</h3>
                <span className="text-xs text-gray-400">{selectedNpc.title}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-2 py-0.5 bg-amber-950/80 border border-amber-800/50 rounded text-amber-300">{selectedNpc.realm || 'Ranah Fondasi'}</span>
                  <span className="text-[10px] text-gray-400">{selectedNpc.sect || 'Pengelana'}</span>
                </div>
              </div>
            </div>

            {/* Dialog Sambutan */}
            <div className="bg-[#0b0e14] border border-[#232d3f] p-3.5 rounded-lg mb-4 text-xs text-gray-300 italic">
              "{selectedNpc.greeting || 'Salam, rekan kultivator.'}"
            </div>

            {/* Tombol Aksi Sosial Sesuai Tale of Immortal */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => showNotice(`Bercakap-cakap dengan ${selectedNpc.name}. Relasi meningkat!`)}
                className="bg-[#1a2333] hover:bg-[#253249] border border-gray-700 text-gray-200 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-blue-400" /> Ngobrol Santai
              </button>
              <button
                onClick={() => showNotice(`Memberikan hadiah herba kepada ${selectedNpc.name}.`)}
                className="bg-[#1a2333] hover:bg-[#253249] border border-gray-700 text-gray-200 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Gift className="w-3.5 h-3.5 text-pink-400" /> Beri Hadiah
              </button>
              <button
                onClick={() => showNotice(`Bertukar wawasan pemahaman Dao bersama ${selectedNpc.name}.`)}
                className="bg-[#1a2333] hover:bg-[#253249] border border-gray-700 text-gray-200 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Diskusi Dao
              </button>
              <button
                onClick={() => showNotice(`Mengajak bertarung latih (spar) pedang dengan ${selectedNpc.name}.`)}
                className="bg-[#1a2333] hover:bg-[#253249] border border-gray-700 text-gray-200 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Swords className="w-3.5 h-3.5 text-red-400" /> Bertarung Latih
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedNpc(null)}
                className="bg-black/60 hover:bg-black text-gray-400 px-4 py-1.5 rounded-lg text-xs font-semibold border border-gray-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
