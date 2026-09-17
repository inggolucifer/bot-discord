'use client';
import React, { useState } from 'react';
import { Hammer, Utensils, Sparkles, Fish, Wheat, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import CrucibleEquilibriumMinigame from '@/components/minigames/CrucibleEquilibriumMinigame';
import KataQteMinigame from '@/components/minigames/KataQteMinigame';
import FishingReelMinigame from '@/components/minigames/FishingReelMinigame';
import CookingFlameMinigame from '@/components/minigames/CookingFlameMinigame';
import HerbHarvestMinigame from '@/components/minigames/HerbHarvestMinigame';

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
  const [activeMinigame, setActiveMinigame] = useState<'crucible' | 'kata' | 'fishing' | 'cooking' | 'harvest' | null>(null);

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
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#181f2b] to-[#0c1017] border border-amber-600/70 rounded-xl max-w-lg landscape:max-w-xl w-full p-4 sm:p-6 landscape:p-3 shadow-2xl relative max-h-[95vh] overflow-y-auto flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          {getIcon()}
          <h2 className="text-sm sm:text-base font-serif font-bold text-amber-200">{getTitle()}</h2>
        </div>
        <p className="text-[11px] sm:text-xs text-gray-400 mb-2.5 sm:mb-4">{buildingName} • Fasilitas kerja mandiri di grid.</p>

        {error && (
          <div className="mb-2.5 bg-red-950/60 border border-red-700/60 text-red-200 p-2 sm:p-2.5 rounded-lg text-xs">
            {error}
          </div>
        )}

        {successNotice && (
          <div className="mb-2.5 bg-green-950/60 border border-green-700/60 text-green-200 p-2 sm:p-2.5 rounded-lg text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Resep & Menu Pilihan */}
        <div className="bg-[#0f141f] border border-gray-800 rounded-lg p-2.5 sm:p-3.5 mb-2.5 sm:mb-4 space-y-2 sm:space-y-3">
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

        {/* Tombol Peluncuran Minigame Interaktif untuk Semua Profesi */}
        <button
          onClick={() => {
            if (professionType === 'alchemy') setActiveMinigame('crucible');
            else if (professionType === 'smithing') setActiveMinigame('kata');
            else if (professionType === 'fishing') setActiveMinigame('fishing');
            else if (professionType === 'cooking') setActiveMinigame('cooking');
            else if (professionType === 'farming') setActiveMinigame('harvest');
          }}
          className="w-full mb-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-950 via-amber-950 to-cyan-950 hover:from-purple-900 hover:to-cyan-900 border border-amber-500/70 text-amber-200 text-xs font-serif font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>
            {professionType === 'alchemy' && '🔥 Mainkan Minigame Kendali Suhu Kuali (Bonus Qi & Kemurnian)'}
            {professionType === 'smithing' && '⚒️ Mainkan Minigame Ritme Pukulan Palu Tempa'}
            {professionType === 'fishing' && '🎣 Mainkan Minigame Tarik Joran Ikan Spiritual'}
            {professionType === 'cooking' && '🍳 Mainkan Minigame Panas Wajan & Racik Bumbu'}
            {professionType === 'farming' && '🌿 Mainkan Minigame Cabut Akar Herba & Panen Presisi'}
          </span>
        </button>

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
            <span>{loading ? 'Sedang Memproses...' : 'Mulai Pengerjaan Langsung'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minigame Overlays */}
      {activeMinigame === 'crucible' && (
        <CrucibleEquilibriumMinigame
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            setSuccessNotice(res.message);
            if (onActionSuccess) onActionSuccess(res.message);
          }}
        />
      )}
      {activeMinigame === 'kata' && (
        <KataQteMinigame
          discipline="sword"
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            setSuccessNotice(res.message);
            if (onActionSuccess) onActionSuccess(res.message);
          }}
        />
      )}
      {activeMinigame === 'fishing' && (
        <FishingReelMinigame
          zoneId={zoneId}
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            const msg = `🎣 Berhasil menangkap 1x ${res.fishName || 'Ikan Spiritual'}!`;
            setSuccessNotice(msg);
            if (onActionSuccess) onActionSuccess(msg);
          }}
        />
      )}
      {activeMinigame === 'cooking' && (
        <CookingFlameMinigame
          dishName={selectedRecipe}
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            const msg = res.message || `🍲 Masakan ${selectedRecipe} berhasil disajikan!`;
            setSuccessNotice(msg);
            if (onActionSuccess) onActionSuccess(msg);
          }}
        />
      )}
      {activeMinigame === 'harvest' && (
        <HerbHarvestMinigame
          cropName={selectedRecipe}
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            const msg = res.message || `🌿 Berhasil memanen tanaman ${selectedRecipe}!`;
            setSuccessNotice(msg);
            if (onActionSuccess) onActionSuccess(msg);
          }}
        />
      )}
    </div>
  );
}
