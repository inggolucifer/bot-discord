'use client';
import React, { useState } from 'react';
import { Hammer, X, Coins, Clock, Check, Sparkles, Building2 } from 'lucide-react';
import { TileData } from '../TaleOfImmortalCanvas';
import { GLOBAL_ASSETS } from '@/config/globalAssets';

interface BuildableOption {
  id: string;
  name: string;
  category: 'profession' | 'residence' | 'production';
  desc: string;
  costSilver: number;
  timeHours: number;
  materials: { name: string; qty: number }[];
}

const BUILDABLE_OPTIONS: BuildableOption[] = [
  // Profesi
  {
    id: 'bengkel_tempa',
    name: 'Bengkel Tempa Senjata',
    category: 'profession',
    desc: 'Fasilitas pandai besi untuk menempa senjata spiritual, perisai, dan memperbaiki peralatan yang rusak.',
    costSilver: 150,
    timeHours: 1,
    materials: [{ name: 'Kayu Rohani', qty: 10 }, { name: 'Bijih Besi', qty: 15 }]
  },
  {
    id: 'dapur_kedai',
    name: 'Dapur Masak Kedai',
    category: 'profession',
    desc: 'Dapur kuliner tradisional untuk mengolah daging buruan, ikan, dan rempah menjadi hidangan berkhasiat stamina.',
    costSilver: 120,
    timeHours: 1,
    materials: [{ name: 'Kayu Rohani', qty: 12 }, { name: 'Batu Kali', qty: 8 }]
  },
  {
    id: 'paviliun_alkimia',
    name: 'Paviliun Alkimia Langit',
    category: 'profession',
    desc: 'Tempat peracikan ramuan obat herbal, pil terobosan ranah, dan eliksir meridian menggunakan kuali suci.',
    costSilver: 200,
    timeHours: 2,
    materials: [{ name: 'Kayu Rohani', qty: 15 }, { name: 'Baja Meteor', qty: 5 }]
  },
  {
    id: 'tambak_ikan',
    name: 'Kolam Ikan Koi Spiritual',
    category: 'profession',
    desc: 'Tambak air tawar spiritual untuk budidaya ikan roh dan memancing ikan eksotis bernilai jual tinggi.',
    costSilver: 100,
    timeHours: 1,
    materials: [{ name: 'Batu Kali', qty: 20 }, { name: 'Rebung Bambu', qty: 10 }]
  },
  {
    id: 'lahan_padi',
    name: 'Lahan Padi Sederhana',
    category: 'profession',
    desc: 'Petak persawahan subur untuk menanam gandum emas dan biji-bijian penunjang ransum perjalanan.',
    costSilver: 80,
    timeHours: 1,
    materials: [{ name: 'Kayu Rohani', qty: 5 }, { name: 'Pupuk Alami', qty: 5 }]
  },
  {
    id: 'petak_herbal',
    name: 'Petak Herbal Rohani',
    category: 'profession',
    desc: 'Tanah bercampur pasir giok untuk membudidayakan herba langka bertingkat spiritual.',
    costSilver: 140,
    timeHours: 1,
    materials: [{ name: 'Batu Rohani', qty: 5 }, { name: 'Bambu Roh', qty: 8 }]
  },

  // Hunian & Produksi
  {
    id: 'kediaman_kultivator',
    name: 'Kediaman Kultivator',
    category: 'residence',
    desc: 'Rumah pribadi dengan formasi pengumpul Qi untuk bermeditasi dan menyimpan barang berlebih.',
    costSilver: 250,
    timeHours: 3,
    materials: [{ name: 'Kayu Rohani', qty: 25 }, { name: 'Batu Kali', qty: 20 }]
  },
  {
    id: 'pusat_kayu',
    name: 'Pusat Pemotongan Kayu Liar',
    category: 'production',
    desc: 'Fasilitas penggergajian kayu otomatis yang mempekerjakan buruh untuk menghasilkan kayu gelondongan.',
    costSilver: 180,
    timeHours: 2,
    materials: [{ name: 'Kayu Rohani', qty: 15 }, { name: 'Besi Batangan', qty: 10 }]
  },
  {
    id: 'tambang_batu',
    name: 'Tambang Batu Dangkal',
    category: 'production',
    desc: 'Galian tambang permukaan untuk menambang bijih besi, tembaga, dan batu bangunan.',
    costSilver: 180,
    timeHours: 2,
    materials: [{ name: 'Batu Kali', qty: 25 }, { name: 'Penyangga Kayu', qty: 10 }]
  }
];

interface GridAssetBuildModalProps {
  tile: TileData;
  onBuild: (assetName: string) => void;
  onClose: () => void;
}

export default function GridAssetBuildModal({
  tile,
  onBuild,
  onClose
}: GridAssetBuildModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'profession' | 'residence' | 'production'>('all');
  const [selectedAsset, setSelectedAsset] = useState<BuildableOption | null>(null);

  const filtered = BUILDABLE_OPTIONS.filter(opt => {
    if (activeTab === 'all') return true;
    return opt.category === activeTab;
  });

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#181f2b] to-[#0b0e14] border border-amber-600/80 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 pb-3 border-b border-amber-900/40">
          <div>
            <h2 className="text-lg font-serif font-bold text-amber-200 flex items-center gap-2">
              <Hammer className="w-5 h-5 text-amber-400" />
              <span>Bangun Aset & Fasilitas Profesi</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Pilih fasilitas yang ingin didirikan di atas kavling tanahmu ({tile.tileX}, {tile.tileY}).
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Kategori */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-amber-800 text-amber-100 border border-amber-500'
                : 'bg-black/40 text-gray-400 border border-gray-800 hover:text-gray-200'
            }`}
          >
            Semua Aset
          </button>
          <button
            onClick={() => setActiveTab('profession')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'profession'
                ? 'bg-amber-800 text-amber-100 border border-amber-500'
                : 'bg-black/40 text-gray-400 border border-gray-800 hover:text-gray-200'
            }`}
          >
            🔨 Bangunan Profesi
          </button>
          <button
            onClick={() => setActiveTab('residence')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'residence'
                ? 'bg-amber-800 text-amber-100 border border-amber-500'
                : 'bg-black/40 text-gray-400 border border-gray-800 hover:text-gray-200'
            }`}
          >
            🏛️ Hunian & Paviliun
          </button>
          <button
            onClick={() => setActiveTab('production')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'production'
                ? 'bg-amber-800 text-amber-100 border border-amber-500'
                : 'bg-black/40 text-gray-400 border border-gray-800 hover:text-gray-200'
            }`}
          >
            ⛏️ Fasilitas Produksi
          </button>
        </div>

        {/* List Aset Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[50vh]">
          {filtered.map(item => {
            const isSelected = selectedAsset?.id === item.id;
            const assetImg = (GLOBAL_ASSETS.assets as any)?.[item.name] || null;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedAsset(item)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-950/60 border-amber-400/90 shadow-lg'
                    : 'bg-[#0f141f] border-gray-800 hover:border-gray-700 hover:bg-[#151c2a]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded bg-[#0b0e14] border border-amber-900/60 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                    {assetImg ? (
                      <img src={assetImg} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">
                        {item.category === 'profession' ? '🔨' : item.category === 'residence' ? '🏯' : '⛏️'}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-serif font-bold text-amber-200">{item.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    
                    {/* Material & Waktu */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 font-mono">
                      <span className="flex items-center gap-1 text-amber-300 font-bold">
                        <Coins className="w-3 h-3 text-amber-400" /> {item.costSilver} Perak
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" /> ~{item.timeHours} Jam
                      </span>
                      <span className="text-gray-500">
                        Bahan: {item.materials.map(m => `${m.qty}x ${m.name}`).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center self-center">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-amber-500 border-amber-400 text-black' : 'border-gray-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-amber-900/40 flex justify-between items-center">
          <div className="text-xs text-gray-400">
            {selectedAsset ? (
              <span>
                Pilihan: <strong className="text-amber-300">{selectedAsset.name}</strong> ({selectedAsset.costSilver} Perak)
              </span>
            ) : (
              <span className="italic text-gray-500">Pilih salah satu bangunan di atas untuk memulai pembangunan.</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (selectedAsset) onBuild(selectedAsset.name);
              }}
              disabled={!selectedAsset}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white text-xs font-serif font-bold shadow-lg border border-amber-400/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              Mulai Konstruksi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
