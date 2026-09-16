'use client';
import React, { useState, useEffect } from 'react';
import { Hammer, X, Coins, Clock, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { TileData } from '../TaleOfImmortalCanvas';
import api from '@/lib/api';

export interface RealBuildableOption {
  id: string;
  refType: 'blueprint' | 'asset';
  blueprintId?: string;
  name: string;
  category: 'profession' | 'residence' | 'production';
  subCategory?: string;
  desc: string;
  costSilver: number;
  timeSeconds: number;
  timeMinutes: number;
  rank?: string;
  materials: {
    itemId: string | null;
    itemName: string;
    quantity: number;
    have: number;
    isMet: boolean;
  }[];
  canBuild: boolean;
}

interface GridAssetBuildModalProps {
  tile: TileData;
  onBuild: (assetName: string, assetBlueprintId?: string) => void;
  onClose: () => void;
}

export default function GridAssetBuildModal({
  tile,
  onBuild,
  onClose
}: GridAssetBuildModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'profession' | 'residence' | 'production'>('all');
  const [selectedAsset, setSelectedAsset] = useState<RealBuildableOption | null>(null);
  const [options, setOptions] = useState<RealBuildableOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const res = await api.get('/world/zone/buildable-options');
        if (isMounted) {
          if (res.data?.options) {
            setOptions(res.data.options);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.error || err.message || 'Gagal memuat katalog bangunan dari database.');
          setLoading(false);
        }
      }
    };
    fetchOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = options.filter(opt => {
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
              <span>Bangun Fasilitas & Aset Jianghu (MongoDB)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Pilih cetak biru resmi atau fasilitas profesi untuk didirikan di kavlingmu ({tile.tileX}, {tile.tileY}).
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
            Semua Aset ({options.length})
          </button>
          <button
            onClick={() => setActiveTab('profession')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'profession'
                ? 'bg-amber-800 text-amber-100 border border-amber-500'
                : 'bg-black/40 text-gray-400 border border-gray-800 hover:text-gray-200'
            }`}
          >
            Bengkel & Profesi
          </button>
          <button
            onClick={() => setActiveTab('residence')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'residence'
                ? 'bg-amber-800 text-amber-100 border border-amber-500'
                : 'bg-black/40 text-gray-400 border border-gray-800 hover:text-gray-200'
            }`}
          >
            Hunian & Rumah
          </button>
          <button
            onClick={() => setActiveTab('production')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'production'
                ? 'bg-amber-800 text-amber-100 border border-amber-500'
                : 'bg-black/40 text-gray-400 border border-gray-800 hover:text-gray-200'
            }`}
          >
            Produksi & Fasilitas
          </button>
        </div>

        {/* List Aset / Bangunan */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span className="text-xs">Memuat katalog bangunan resmi dari database...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-center text-red-300 text-xs">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs italic">
              Tidak ada bangunan yang tersedia pada kategori ini.
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedAsset?.id === item.id;
              const hasMissingMaterials = item.materials.some(m => !m.isMet);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedAsset(item)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex justify-between gap-4 ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 shadow-md'
                      : 'bg-[#121722]/80 border-gray-800 hover:border-gray-700 hover:bg-[#151c2a]'
                  }`}
                >
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-black/50 border border-amber-800/40 flex items-center justify-center flex-shrink-0 text-xl shadow-inner">
                      {item.category === 'profession' ? '🔨' : item.category === 'residence' ? '🏡' : '🏭'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif font-bold text-amber-200 text-sm">{item.name}</span>
                        {item.rank && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/50">
                            {item.rank}
                          </span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 uppercase font-mono">
                          {item.refType === 'blueprint' ? 'Blueprint' : 'Asset'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>

                      {/* Biaya & Waktu */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono">
                        <span className="flex items-center gap-1 text-amber-300 font-bold">
                          <Coins className="w-3.5 h-3.5 text-amber-400" /> {item.costSilver} Perak
                        </span>
                        <span className="flex items-center gap-1 text-blue-300">
                          <Clock className="w-3.5 h-3.5 text-blue-400" /> ~{item.timeMinutes} Menit
                        </span>
                      </div>

                      {/* Kebutuhan Material Riil dari MongoDB */}
                      {item.materials.length > 0 ? (
                        <div className="mt-2.5 pt-2 border-t border-gray-800/80 flex flex-wrap gap-1.5">
                          <span className="text-[10px] text-gray-500 font-semibold self-center mr-1">Bahan:</span>
                          {item.materials.map((mat, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                                mat.isMet
                                  ? 'bg-green-950/50 border-green-700/60 text-green-300'
                                  : 'bg-red-950/60 border-red-800/70 text-red-300'
                              }`}
                            >
                              {mat.itemName}: {mat.have}/{mat.quantity} {mat.isMet ? '✓' : '✗'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1.5 text-[10px] text-green-400 font-mono">
                          Tanpa material khusus (Hanya biaya perak)
                        </div>
                      )}
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
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-amber-900/40 flex justify-between items-center">
          <div className="text-xs text-gray-400">
            {selectedAsset ? (
              <span>
                Pilihan: <strong className="text-amber-300">{selectedAsset.name}</strong> ({selectedAsset.costSilver} Perak)
                {!selectedAsset.canBuild && (
                  <span className="block text-[11px] text-red-400 mt-0.5">
                    ⚠️ Material atau perak milikmu belum mencukupi.
                  </span>
                )}
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
                if (selectedAsset) onBuild(selectedAsset.name, selectedAsset.id);
              }}
              disabled={!selectedAsset || !selectedAsset.canBuild}
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
