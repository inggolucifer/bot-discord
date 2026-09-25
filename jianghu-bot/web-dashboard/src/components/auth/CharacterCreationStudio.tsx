'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import CharacterLayerRenderer from '@/components/character/CharacterLayerRenderer';
import { Sparkles, Check, ArrowRight, Loader2, RefreshCw, Shirt, User as UserIcon } from 'lucide-react';

interface CharacterCreationStudioProps {
  onComplete: () => void;
}

type CategoryTab = 'face' | 'backHair' | 'outfit' | 'frontHair';

interface OptionItem {
  id: string;
  name: string;
  desc: string;
  tag?: string;
}

const FACE_OPTIONS: OptionItem[] = [
  {
    id: 'face_01',
    name: 'Pemuda Tatapan Emas',
    desc: 'Tatapan mata emas menyala, rahang tegas, dan pembawaan dingin penuh tekad.',
    tag: 'Rekomendasi Utama'
  },
  {
    id: 'face_02',
    name: 'Kultivator Dingin Angkuh',
    desc: 'Mata tajam beriris biru es mencerminkan aura pendekar misterius.',
  },
  {
    id: 'face_03',
    name: 'Pemuda Heroik Bersemangat',
    desc: 'Wajah hangat dengan senyum tipis pendekar pejuang keadilan.',
  },
  {
    id: 'face_04',
    name: 'Pendekar Anggun Menawan',
    desc: 'Garis wajah halus dan kulit pualam mencerminkan ketenangan Dao sejati.',
  }
];

const BACK_HAIR_OPTIONS: OptionItem[] = [
  {
    id: 'back_hair_01',
    name: 'Kuncir Ekor Kuda Tinggi',
    desc: 'Rambut hitam lebat diikat tinggi menjuntai di balik bahu.',
    tag: 'Klasik Wuxia'
  },
  {
    id: 'back_hair_02',
    name: 'Sanggul Kuno Tradisional',
    desc: 'Sanggul pendekar kerajaan dengan tusuk konde giok hijau.',
  },
  {
    id: 'back_hair_03',
    name: 'Rambut Panjang Terurai',
    desc: 'Rambut hitam lurus tergerai anggun melintasi kedua sisi bahu.',
  },
  {
    id: 'back_hair_04',
    name: 'Rambut Pendek Praktis',
    desc: 'Gaya rambut pendek ringkas para petarung beladiri jarak dekat.',
  }
];

const STARTER_OUTFIT_OPTIONS: OptionItem[] = [
  {
    id: 'outfit_vagrant_black',
    name: 'Jubah Hitam Koyak Kelana',
    desc: 'Jubah hitam lusuh dengan aksen robekan kain di bahu dan dada para pendekar fana.',
    tag: 'Sesuai Gambar Contoh'
  },
  {
    id: 'outfit_mortal_linen',
    name: 'Jubah Linen Fana Xingcun',
    desc: 'Pakaian rami kelabu sederhana khas penduduk pemukiman awal fana.',
  },
  {
    id: 'outfit_outer_disciple',
    name: 'Jubah Murid Luar Perguruan',
    desc: 'Jubah biru muda bersih dengan lis putih murid akademi beladiri.',
  },
  {
    id: 'outfit_wanderer_bamboo',
    name: 'Jubah Pengelana Rimba',
    desc: 'Jubah hijau lumut tahan cuaca dengan tali sabuk serat bambu.',
  },
  {
    id: 'outfit_novice_daoist',
    name: 'Jubah Daois Pemula',
    desc: 'Gamis putih bersih dengan sulaman lambang keseimbangan yin-yang.',
  }
];

const FRONT_HAIR_OPTIONS: OptionItem[] = [
  {
    id: 'front_hair_01',
    name: 'Poni Belah Tengah Alami',
    desc: 'Dua helai poni hitam membingkai dahi dan pelipis mata.',
    tag: 'Standar Wuxia'
  },
  {
    id: 'front_hair_02',
    name: 'Ikat Kepala Pita Kain',
    desc: 'Pita kain hitam petarung yang mengikat kencang helaian poni.',
  },
  {
    id: 'front_hair_03',
    name: 'Mahkota Pita Giok Pemula',
    desc: 'Hiasan rambut simpel dengan juntaian helai samping telinga.',
  },
  {
    id: 'front_hair_04',
    name: 'Poni Acak Liar Pengembara',
    desc: 'Helaian rambut depan menyapu kening mencerminkan jiwa merdeka.',
  }
];

export default function CharacterCreationStudio({ onComplete }: CharacterCreationStudioProps) {
  const { user, setAppearanceCompleted } = useAuthStore();

  const [activeTab, setActiveTab] = useState<CategoryTab>('face');
  const [selectedFace, setSelectedFace] = useState(user?.character?.body?.face || 'face_01');
  const [selectedBackHair, setSelectedBackHair] = useState(user?.character?.body?.backHair || 'back_hair_01');
  const [selectedOutfit, setSelectedOutfit] = useState(user?.character?.body?.outfit || 'outfit_vagrant_black');
  const [selectedFrontHair, setSelectedFrontHair] = useState(user?.character?.body?.frontHair || 'front_hair_01');

  const [saving, setSaving] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const characterName = user?.character?.characterName || user?.username || 'Pendekar Fana';
  const characterGender = user?.character?.gender || 'Laki-laki';

  // Acak Pilihan (Randomize)
  const handleRandomize = () => {
    const randomFace = FACE_OPTIONS[Math.floor(Math.random() * FACE_OPTIONS.length)].id;
    const randomBack = BACK_HAIR_OPTIONS[Math.floor(Math.random() * BACK_HAIR_OPTIONS.length)].id;
    const randomOutfit = STARTER_OUTFIT_OPTIONS[Math.floor(Math.random() * STARTER_OUTFIT_OPTIONS.length)].id;
    const randomFront = FRONT_HAIR_OPTIONS[Math.floor(Math.random() * FRONT_HAIR_OPTIONS.length)].id;

    setSelectedFace(randomFace);
    setSelectedBackHair(randomBack);
    setSelectedOutfit(randomOutfit);
    setSelectedFrontHair(randomFront);
  };

  // Simpan Penampilan ke Server
  const handleSaveAppearance = async () => {
    setSaving(true);
    setErrorNotice(null);

    try {
      const res = await api.post('/auth/set-appearance', {
        face: selectedFace,
        frontHair: selectedFrontHair,
        backHair: selectedBackHair,
        outfit: selectedOutfit
      });

      if (res.data?.success) {
        setAppearanceCompleted(true, {
          face: selectedFace,
          frontHair: selectedFrontHair,
          backHair: selectedBackHair,
          outfit: selectedOutfit
        });
        onComplete();
      } else {
        setErrorNotice(res.data?.error || 'Gagal menyimpan penampilan.');
      }
    } catch (err: any) {
      setErrorNotice(err.response?.data?.error || 'Koneksi ke server terputus.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] w-screen h-screen overflow-y-auto bg-[#07090f] text-[#f2e7d3] font-serif flex flex-col p-3 sm:p-6 md:p-10 select-none">
      {/* Background Spiritual Vignette */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(24,32,48,0.4)_0%,rgba(7,9,15,0.98)_100%)] pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between pb-4 border-b border-[#30271c] mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-950/70 border border-amber-600/50 text-[11px] text-amber-300 font-sans mb-1 shadow-inner">
            <Sparkles size={12} className="text-amber-400 animate-spin-slow" />
            <span>Studio Penampilan Pendekar • Tale of Immortal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-[#f5ebd7]">
            PAHAT RUPA & JUBAH PENDEKAR
          </h1>
          <p className="text-xs text-stone-400 font-sans mt-0.5">
            Pilih model wajah, gaya rambut, dan jubah fana sebelum meniti tangga keabadian.
          </p>
        </div>

        <button
          onClick={handleRandomize}
          type="button"
          className="px-3.5 py-2 rounded-lg bg-[#141926] hover:bg-[#1f273b] border border-[#443827] text-xs font-sans text-amber-200 transition-all flex items-center gap-2 shadow-sm"
          title="Acak Penampilan"
        >
          <RefreshCw size={14} className="text-amber-400" />
          <span className="hidden sm:inline">Acak Penampilan</span>
        </button>
      </div>

      {/* Main Studio Work Area: Split Preview & Options */}
      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">

        {/* LEFT COLUMN: LIVE CANVAS PREVIEW (512x768 Ratio 2:3 Stacking Preview) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative w-full max-w-[340px] sm:max-w-[380px] rounded-2xl border-2 border-[#826b48] bg-[#0c0f18] p-2 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
            {/* Corner Ornamental Accents */}
            <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none z-50" />
            <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none z-50" />
            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none z-50" />
            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none z-50" />

            {/* LIVE MULTI-LAYER PAPER-DOLL RENDERER */}
            <CharacterLayerRenderer
              face={selectedFace}
              frontHair={selectedFrontHair}
              backHair={selectedBackHair}
              outfit={selectedOutfit}
              className="rounded-xl"
            />
          </div>

          {/* Character Identity Badges Underneath Preview */}
          <div className="w-full max-w-[380px] mt-4 p-3 rounded-xl bg-[#111624]/90 border border-[#3b3223] flex items-center justify-between text-xs font-sans">
            <div>
              <div className="text-stone-400 text-[10px]">Identitas Pendekar:</div>
              <div className="text-amber-300 font-serif font-bold text-sm tracking-wider">
                {characterName}
              </div>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/60 text-amber-200 text-[11px]">
                {characterGender}
              </span>
              <div className="text-[10px] text-stone-500 mt-0.5">Fondasi Fana • Tingkat 0</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CATEGORY TABS & OPTION CARDS */}
        <div className="lg:col-span-7 flex flex-col h-full">

          {/* 4 Category Nav Tabs */}
          <div className="grid grid-cols-4 gap-2 p-1.5 rounded-xl bg-[#101420] border border-[#382f21] mb-5 font-sans">
            <button
              onClick={() => setActiveTab('face')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'face'
                  ? 'bg-amber-900/70 border border-amber-500/80 text-amber-200 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <UserIcon size={14} />
              <span>Wajah & Tubuh</span>
            </button>

            <button
              onClick={() => setActiveTab('backHair')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'backHair'
                  ? 'bg-amber-900/70 border border-amber-500/80 text-amber-200 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>💇‍♂️</span>
              <span>Rambut Belakang</span>
            </button>

            <button
              onClick={() => setActiveTab('outfit')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'outfit'
                  ? 'bg-amber-900/70 border border-amber-500/80 text-amber-200 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Shirt size={14} />
              <span>Jubah Starter</span>
            </button>

            <button
              onClick={() => setActiveTab('frontHair')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'frontHair'
                  ? 'bg-amber-900/70 border border-amber-500/80 text-amber-200 shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>👑</span>
              <span>Rambut Depan</span>
            </button>
          </div>

          {/* Option Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6 overflow-y-auto max-h-[460px] pr-1">

            {/* TAB: FACE & BASE BODY */}
            {activeTab === 'face' &&
              FACE_OPTIONS.map((item) => {
                const isSelected = selectedFace === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedFace(item.id)}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-950/60 to-[#191e2e] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-[#101420]/80 border-[#32291d] hover:border-stone-500 hover:bg-[#141926]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-serif font-bold text-sm text-[#f5ebd7]">
                          {item.name}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-bold shadow-sm">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 font-sans leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    {item.tag && (
                      <div className="mt-3">
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-[10px] text-amber-300 font-sans">
                          {item.tag}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* TAB: BACK HAIR */}
            {activeTab === 'backHair' &&
              BACK_HAIR_OPTIONS.map((item) => {
                const isSelected = selectedBackHair === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedBackHair(item.id)}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-950/60 to-[#191e2e] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-[#101420]/80 border-[#32291d] hover:border-stone-500 hover:bg-[#141926]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-serif font-bold text-sm text-[#f5ebd7]">
                          {item.name}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-bold shadow-sm">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 font-sans leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    {item.tag && (
                      <div className="mt-3">
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-[10px] text-amber-300 font-sans">
                          {item.tag}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* TAB: STARTER OUTFITS */}
            {activeTab === 'outfit' &&
              STARTER_OUTFIT_OPTIONS.map((item) => {
                const isSelected = selectedOutfit === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedOutfit(item.id)}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-950/60 to-[#191e2e] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-[#101420]/80 border-[#32291d] hover:border-stone-500 hover:bg-[#141926]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-serif font-bold text-sm text-[#f5ebd7]">
                          {item.name}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-bold shadow-sm">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 font-sans leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    {item.tag && (
                      <div className="mt-3">
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-[10px] text-amber-300 font-sans">
                          {item.tag}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* TAB: FRONT HAIR */}
            {activeTab === 'frontHair' &&
              FRONT_HAIR_OPTIONS.map((item) => {
                const isSelected = selectedFrontHair === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedFrontHair(item.id)}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-950/60 to-[#191e2e] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-[#101420]/80 border-[#32291d] hover:border-stone-500 hover:bg-[#141926]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-serif font-bold text-sm text-[#f5ebd7]">
                          {item.name}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-bold shadow-sm">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 font-sans leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    {item.tag && (
                      <div className="mt-3">
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-[10px] text-amber-300 font-sans">
                          {item.tag}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

          </div>

          {/* Error notice banner */}
          {errorNotice && (
            <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs font-sans mb-4">
              {errorNotice}
            </div>
          )}

          {/* Submit Action: Confirm Appearance & Enter World */}
          <div className="mt-auto pt-4 border-t border-[#30271c]">
            <button
              onClick={handleSaveAppearance}
              disabled={saving}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#876e47] via-[#c5a880] to-[#876e47] hover:from-[#a08457] hover:to-[#d4bc96] text-stone-950 font-serif font-bold text-base tracking-widest shadow-[0_0_30px_rgba(197,168,128,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin text-stone-950" />
                  <span>Memahat Takdir ke Kitab Jianghu...</span>
                </>
              ) : (
                <>
                  <span>✨ PAHAT TAKDIR & MASUK KE ALAM JIANGHU</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
