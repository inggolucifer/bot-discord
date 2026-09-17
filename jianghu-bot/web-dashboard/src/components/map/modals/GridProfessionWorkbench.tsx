'use client';
import React, { useState } from 'react';
import { Hammer, Utensils, Sparkles, Fish, Wheat, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface GridProfessionWorkbenchProps {
  professionType: 'smithing' | 'cooking' | 'alchemy' | 'fishing' | 'farming';
  buildingName: string;
  tileCoordinates?: { x: number; y: number };
  zoneId?: string;
  onClose: () => void;
  onActionSuccess?: (message: string) => void;
}

export default function GridProfessionWorkbench({
  professionType,
  buildingName,
  tileCoordinates,
  zoneId,
  onClose,
  onActionSuccess
}: GridProfessionWorkbenchProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Formulir / Resep State
  const [selectedRecipe, setSelectedRecipe] = useState<string>('Pedang Besi Tempa');

  const executeCraft = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (professionType === 'smithing') {
        res = await api.post('/grid/profession/craft/smith', { recipe: selectedRecipe });
      } else if (professionType === 'cooking') {
        res = await api.post('/grid/profession/craft/cook', { recipe: selectedRecipe });
      } else if (professionType === 'fishing') {
        res = await api.post('/grid/profession/fish', { zoneId: zoneId || 'central_plains_bamboo_forest' });
      } else if (professionType === 'farming') {
        res = await api.post('/grid/profession/farm/plant', {
          cropName: selectedRecipe || 'Gandum Emas',
          x: tileCoordinates?.x ?? 10,
          y: tileCoordinates?.y ?? 10
        });
      } else {
        res = await api.post('/professions/start', { profession: 'alchemy', action: 'craft_pill' });
      }

      const msg = res.data?.message || 'Aktivitas profesi berhasil diselesaikan!';
      setSuccessNotice(msg);
      if (onActionSuccess) onActionSuccess(msg);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Gagal menjalankan aktivitas profesi.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (professionType === 'smithing') return 'Bengkel Tempa & Penempaan Senjata';
    if (professionType === 'cooking') return 'Dapur Memasak & Pengolahan Ransum';
    if (professionType === 'alchemy') return 'Kuali Alkimia & Peracikan Pil';
    if (professionType === 'fishing') return 'Kolam Ikan Rohani & Penangkapan';
    return 'Lahan Pertanian & Penggarapan Bibit';
  };

  const getIcon = () => {
    if (professionType === 'smithing') return <Hammer className="w-5 h-5 text-amber-400" />;
    if (professionType === 'cooking') return <Utensils className="w-5 h-5 text-orange-400" />;
    if (professionType === 'alchemy') return <Sparkles className="w-5 h-5 text-purple-400" />;
    if (professionType === 'fishing') return <Fish className="w-5 h-5 text-cyan-400" />;
    return <Wheat className="w-5 h-5 text-lime-400" />;
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#181f2b] to-[#0c1017] border border-amber-600/70 rounded-xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          {getIcon()}
          <h2 className="text-base font-serif font-bold text-amber-200">{getTitle()}</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">{buildingName} • Fasilitas kerja mandiri di grid.</p>

        {error && (
          <div className="mb-3 bg-red-950/60 border border-red-700/60 text-red-200 p-2.5 rounded-lg text-xs">
            {error}
          </div>
        )}

        {successNotice && (
          <div className="mb-3 bg-green-950/60 border border-green-700/60 text-green-200 p-2.5 rounded-lg text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Resep & Menu Pilihan */}
        <div className="bg-[#0f141f] border border-gray-800 rounded-lg p-3.5 mb-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-300">Pilih Resep / Aktivitas:</label>
          <select
            value={selectedRecipe}
            onChange={(e) => setSelectedRecipe(e.target.value)}
            className="w-full bg-[#080b11] border border-gray-700 rounded-lg p-2.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
          >
            {professionType === 'smithing' && (
              <>
                <option value="Pedang Besi Tempa">Pedang Besi Tempa (5x Bijih Besi, 2x Arang)</option>
                <option value="Tombak Baja Meteor">Tombak Baja Meteor (3x Baja Meteor, 4x Kayu Rohani)</option>
                <option value="Perisai Kura-Kura Hitam">Perisai Kura-Kura Hitam (8x Bijih Besi, 100 Perak)</option>
              </>
            )}
            {professionType === 'cooking' && (
              <>
                <option value="Sup Rebung Bambu Roh">Sup Rebung Bambu Roh (3x Rebung, 1x Air Murni)</option>
                <option value="Ikan Bakar Rempah Jianghu">Ikan Bakar Rempah Jianghu (1x Ikan Koi, 2x Herba)</option>
                <option value="Daging Rusa Tumis Anggur">Daging Rusa Tumis Anggur (2x Daging Rusa, 1x Arak)</option>
              </>
            )}
            {professionType === 'alchemy' && (
              <>
                <option value="Pil Pengumpul Qi Tingkat Rendah">Pil Pengumpul Qi Tingkat Rendah (5x Herba Roh)</option>
                <option value="Pil Pemulih Meridian">Pil Pemulih Meridian (2x Herba Spiritual, 1x Madu Lebah)</option>
              </>
            )}
            {professionType === 'fishing' && (
              <>
                <option value="Tebar Jala Kolam">Tebar Jala Kolam (Konsumsi 1x Umpan Cacing)</option>
                <option value="Pancing Ikan Koi Langka">Pancing Ikan Koi Langka (Konsumsi 1x Umpan Khusus)</option>
              </>
            )}
            {professionType === 'farming' && (
              <>
                <option value="Tanam Gandum Emas">Tanam Gandum Emas (Bibit Gandum, Waktu Tumbuh: 30 menit)</option>
                <option value="Tanam Rumput Rohani">Tanam Rumput Rohani (Bibit Rumput Roh, Waktu Tumbuh: 1 jam)</option>
              </>
            )}
          </select>

          <div className="text-[11px] text-gray-400 bg-black/40 p-2.5 rounded border border-gray-800/80">
            💡 Aktivitas ini dilakukan langsung pada propertimu. Hasil kerajinan akan langsung masuk ke Tas / Inventory karaktermu.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={executeCraft}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white text-xs font-serif font-bold shadow-lg border border-amber-400/50 flex items-center gap-1.5 transition-all disabled:opacity-50 active:scale-95"
          >
            <span>{loading ? 'Sedang Memproses...' : 'Mulai Pengerjaan'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
