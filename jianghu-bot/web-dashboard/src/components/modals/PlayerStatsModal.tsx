'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/lib/store';
import api from '@/lib/api';
import { 
  X, User, BookOpen, Hammer, Package, Scroll, Users, Sparkles,
  Shield, Sword, Flame, Heart, Zap, RefreshCw, Award, Check, ChevronDown, ShieldAlert
} from 'lucide-react';
import StatGrid from '@/components/character/StatGrid';
import AlignmentBar from '@/components/character/AlignmentBar';
import FallbackImage from '@/components/FallbackImage';
import ConditionTab from '@/components/character/ConditionTab';
import CharacterLayerRenderer from '@/components/character/CharacterLayerRenderer';
import KitabDanHukumAlamView from '@/components/cultivation/KitabDanHukumAlamView';
import { GLOBAL_ASSETS } from '@/config/globalAssets';
import { PlayerProfile } from '@/types/game';
import { getEnglishRealmDisplay } from '@/lib/realmUtils';

type ActiveTab = 'stats' | 'condition' | 'skills' | 'artisan' | 'item' | 'experience' | 'relations';

const ACHIEVEMENT_TITLES = [
  { id: 'title_sword_saint', name: 'Pendekar Pedang Surgawi', color: 'from-amber-500 to-yellow-300', border: 'border-amber-400', desc: 'Menguasai esensi sembilan tebasan langit.' },
  { id: 'title_nine_continents', name: 'Penakluk Sembilan Benua', color: 'from-purple-500 to-indigo-300', border: 'border-purple-400', desc: 'Menjelajahi setiap pelosok dunia persilatan.' },
  { id: 'title_golden_core', name: 'Pewaris Inti Emas', color: 'from-yellow-500 to-amber-200', border: 'border-yellow-400', desc: 'Memiliki dantian murni tanpa cela.' },
  { id: 'title_divine_alchemist', name: 'Pakar Alkimia Ilahi', color: 'from-emerald-500 to-teal-300', border: 'border-emerald-400', desc: 'Peracik pil legendaris penembus ranah.' },
  { id: 'title_thunder_wanderer', name: 'Pengembara Angin & Petir', color: 'from-cyan-500 to-sky-300', border: 'border-cyan-400', desc: 'Melangkah seringan embun secepat kilat.' },
  { id: 'title_grandmaster', name: 'Pendekar Besar Jianghu', color: 'from-rose-500 to-red-400', border: 'border-rose-400', desc: 'Dihormati seluruh pendekar dunia persilatan.' }
];

export default function PlayerStatsModal() {
  const { activeModal, closeModal } = useUIStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [player, setPlayer] = useState<PlayerProfile | any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [equippedTitle, setEquippedTitle] = useState<string | null>(null);
  const [titleNotice, setTitleNotice] = useState<string | null>(null);

  const isOpen = activeModal === 'stats';

  useEffect(() => {
    if (isOpen) {
      fetchPlayerProfile();
    }
  }, [isOpen]);

  const fetchPlayerProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/player/profile');
      if (res.data?.success && res.data?.data) {
        const p = res.data.data;
        setPlayer(p);
        setEquippedTitle(p.body?.title || null);
      } else {
        setError('Gagal memuat profil pendekar.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Koneksi ke server terputus.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTitle = async (titleName: string) => {
    try {
        const res = await api.patch('/player/profile', {
            body: { title: titleName }
        });
        if (res.data?.success) {
            setEquippedTitle(titleName);
            setShowTitleModal(false);
            setTitleNotice(`Gelar aktif diubah: [${titleName}]`);
            setTimeout(() => setTitleNotice(null), 3500);
        } else {
            setTitleNotice(`Gagal merubah gelar: ${res.data?.error || 'Unknown error'}`);
            setTimeout(() => setTitleNotice(null), 3500);
        }
    } catch (error: any) {
        setTitleNotice(`Gagal merubah gelar: ${error.response?.data?.error || 'Koneksi ke server terputus.'}`);
        setTimeout(() => setTitleNotice(null), 3500);
    }
  };

  if (!isOpen) return null;

  const characterName = player?.characterName || 'Pendekar Fana';
  const sectName = player?.sect || 'Tanpa Sekte (Rogue Cultivator)';
  const realmDisplay = getEnglishRealmDisplay(player);
  const realmName = realmDisplay.fullTitle;
  const stage = Math.floor(Number(player?.systemCultivation?.stage) || 0);
  const gender = player?.gender || 'Laki-laki';
  const age = Math.floor(Number(player?.age) || 16);
  const race = player?.race || 'Manusia';
  const charisma = player?.charisma || 'Menawan (Attractive)';
  const reputation = Math.floor(Number(player?.reputation) || 100);
  const reputationTitle = player?.reputationTitle || 'Terkenal (Renowned)';
  const interests = player?.interests || ['Bambu Kuno', 'Seruling Bambu', 'Kitab Kuning'];

  const qi = Math.floor(Number(player?.systemCultivation?.qi) || 0);
  const maxQi = Math.max(100, (stage + 1) * 100);
  const qiPercent = Math.min(100, Math.max(0, Math.floor((qi / maxQi) * 100)));

  const gold = Math.floor(Number(player?.currency?.gold) || 0);
  const silver = Math.floor(Number(player?.currency?.silver) || 0);
  const copper = Math.floor(Number(player?.currency?.copper) || 0);
  const jade = Math.floor(Number(player?.currency?.jade) || 0);
  const spirit = Math.floor(Number(player?.currency?.spirit) || 0);

  const avatar = player?.characterImage || player?.avatarUrl || player?.discordAvatar || '';
  
  // Resolve Standing Full-Body Art
  const standingArtUrl = 
    (gender === 'Perempuan' 
      ? GLOBAL_ASSETS.character_standing?.default_female 
      : GLOBAL_ASSETS.character_standing?.default_male) ||
    player?.fullBodyImage ||
    player?.characterImage ||
    avatar;

  // Elegant Standing Character Silhouette & Daoist Halo Fallback
  const standingCharacterFallback = (
    <div className="w-full h-full min-h-[280px] sm:min-h-[340px] flex flex-col items-center justify-center bg-gradient-to-b from-[#151a27] via-[#0d1017] to-[#07090f] p-4 relative overflow-hidden select-none">
      {/* Background Spiritual Aura Halo */}
      <div className="absolute w-44 h-44 rounded-full bg-amber-500/15 blur-3xl animate-pulse" />
      <div className="absolute w-28 h-28 rounded-full bg-sky-500/15 blur-xl" />
      
      {/* Standing Character Visual Frame */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-b from-amber-700/60 to-[#101420] border-2 border-amber-500/80 flex items-center justify-center text-5xl shadow-[0_0_25px_rgba(245,158,11,0.35)] mb-3">
          {gender === 'Perempuan' ? '🧝‍♀️' : '🧙‍♂️'}
        </div>
        <div className="px-3 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs font-serif font-bold tracking-wider shadow-sm">
          {characterName}
        </div>
        <div className="text-[11px] text-stone-400 mt-1">
          {sectName}
        </div>
        <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
          {realmDisplay.fullTitle}
        </div>
      </div>

      {/* Decorative Bottom Mist */}
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
    </div>
  );

  const navItems: { key: ActiveTab; label: string; icon: any }[] = [
    { key: 'stats', label: 'Stats', icon: User },
    { key: 'condition', label: 'Kondisi', icon: ShieldAlert },
    { key: 'skills', label: 'Kitab & Jurus', icon: BookOpen },
    { key: 'artisan', label: 'Artisan', icon: Hammer },
    { key: 'item', label: 'Item', icon: Package },
    { key: 'experience', label: 'Experie', icon: Scroll },
    { key: 'relations', label: 'Relatio', icon: Users },
  ];

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      onClick={closeModal}
    >
      {/* Ancient Parchment Scroll Frame */}
      <div 
        className="relative w-full max-w-6xl max-h-[96vh] sm:max-h-[92vh] bg-[#10131d] border-2 border-[#826b48] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-[#e3d7bf]"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 40px rgba(197, 168, 128, 0.2), inset 0 0 60px rgba(0,0,0,0.8)'
        }}
      >
        {/* Ornate Top Bar with Close Button */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#171a24] via-[#221e17] to-[#171a24] border-b border-[#4d3e28]">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-serif font-bold text-sm sm:text-lg tracking-widest flex items-center gap-2">
              📜 LEMBAR STATISTIK PENDEKAR (IMMORTAL STATUS)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPlayerProfile}
              disabled={loading}
              className="p-1.5 text-[#a89980] hover:text-amber-300 transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={closeModal}
              className="p-1.5 rounded-full bg-[#2a2217] hover:bg-rose-900/60 border border-[#6b5230] text-amber-200 hover:text-white transition-all shadow-md"
              title="Tutup Lembar Status"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Title Change Notification Toast */}
        {titleNotice && (
          <div className="mx-4 mt-2 p-2 rounded bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs flex items-center gap-2 animate-in fade-in shadow-lg">
            <Award size={15} className="text-amber-400 shrink-0" />
            <span>{titleNotice}</span>
          </div>
        )}

        {/* Modal Body: Left Vertical Navigation + Main Scrollable Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Vertical Nav Icons */}
          <div className="w-14 sm:w-20 bg-[#0d1017] border-r border-[#382f21] flex flex-col items-center py-4 gap-3 shrink-0 select-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all group ${
                    isActive 
                      ? 'bg-gradient-to-b from-[#4d3b20] to-[#2b2112] text-amber-300 border border-[#967744] shadow-[0_0_12px_rgba(197,168,128,0.4)] scale-105' 
                      : 'text-stone-400 hover:text-amber-200 hover:bg-[#181d28] border border-transparent'
                  }`}
                  title={item.label}
                >
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border ${
                    isActive ? 'border-amber-400/80 bg-[#1e170d]' : 'border-stone-700 bg-[#121622]'
                  }`}>
                    <Icon size={18} className={isActive ? 'text-amber-300 animate-pulse' : 'text-stone-400'} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-serif font-medium mt-1 tracking-wider">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Scrollable Tab Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#171b26] via-[#0f121a] to-[#0a0c12]">
            {loading && !player ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-amber-200/70">
                <RefreshCw size={32} className="animate-spin text-amber-400" />
                <p className="font-serif">Menyelaraskan Qi dan Meridian Karakter...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-rose-400 font-serif">
                <p>{error}</p>
                <button 
                  onClick={fetchPlayerProfile}
                  className="mt-4 px-4 py-1.5 bg-[#2b1717] border border-rose-800 rounded text-sm text-rose-200"
                >
                  Coba Lagi
                </button>
              </div>
            ) : (
              <>
                {/* TAB 1: STATS (MAIN SHEET WITH FULL-BODY CHARACTER & TITLE FLEXING) */}
                {activeTab === 'stats' && (
                  <div className="space-y-4">
                    
                    {/* Top Hero Section: Full Body Standing Character (Left) + Identity & Title (Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-[#121622]/85 border border-[#3b3323] p-3 sm:p-4 rounded-xl shadow-lg">
                      
                      {/* Left: Full-Body Standing Character Column (5 cols) */}
                      <div className="md:col-span-5 lg:col-span-4 flex flex-col items-center">
                        <div className="relative w-full aspect-[2/3] max-h-80 sm:max-h-96 rounded-lg overflow-hidden border-2 border-[#6b5433] bg-[#0c0f17] shadow-inner group">
                          <CharacterLayerRenderer
                            face={player?.body?.face || 'face_01'}
                            frontHair={player?.body?.frontHair || 'front_hair_01'}
                            backHair={player?.body?.backHair || 'back_hair_01'}
                            outfit={player?.body?.outfit || 'outfit_vagrant_black'}
                            className="w-full h-full"
                          />

                          {/* Daoist Realm Seal Bottom-Left */}
                          <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-900 to-amber-700 border border-amber-400 text-amber-100 text-[10px] font-serif font-bold shadow-md z-50">
                            {realmDisplay.fullTitle}
                          </div>

                          {/* Wardrobe Indicator Tag (Foundation for outfits) */}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-stone-700 text-stone-300 text-[9px] font-serif flex items-center gap-1 z-50">
                            <span>👘</span>
                            <span className="capitalize">{player?.body?.outfit?.replace('outfit_', '').replace(/_/g, ' ') || 'Jubah Pendekar'}</span>
                          </div>
                        </div>

                        {/* Wardrobe Future Change Action Hint */}
                        <div className="w-full mt-2 flex items-center justify-between px-2 py-1 bg-[#171c29] border border-[#2e374a] rounded-lg text-[10px] text-stone-400">
                          <span className="flex items-center gap-1">
                            <Sparkles size={11} className="text-amber-400" /> Lemari Pakaian (Wardrobe)
                          </span>
                          <span className="text-amber-300/80 font-medium">Baju & Kostum</span>
                        </div>

                        {/* Alignment bar under standing portrait */}
                        <div className="w-full mt-2.5 px-1">
                          <AlignmentBar 
                            righteous={Math.floor(Number(player?.alignment?.righteous) || 50)} 
                            demonic={Math.floor(Number(player?.alignment?.demonic) || 0)} 
                            compact 
                          />
                        </div>
                      </div>

                      {/* Right: Identity Details, Title Flexing, Currencies & Qi (7 cols) */}
                      <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-between space-y-3 font-serif">
                        
                        {/* 1. TITLE PENCAPAIAN (ACHIEVEMENT TITLE FLEXING BAR) */}
                        <div className="p-2.5 bg-gradient-to-r from-[#1f1a12] via-[#2a2215] to-[#171a24] border border-[#695333] rounded-lg flex flex-wrap items-center justify-between gap-2 shadow-md">
                          <div className="flex items-center gap-2">
                            <Award size={18} className="text-amber-400 animate-pulse shrink-0" />
                            <div>
                              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Gelar Pencapaian (Title):</span>
                              <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-wide">
                                🎖️ [{equippedTitle}]
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setShowTitleModal(!showTitleModal)}
                            className="px-2.5 py-1 rounded bg-[#382b18] hover:bg-[#523d20] border border-amber-600/70 text-amber-200 text-xs font-semibold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                          >
                            <span>Ganti Gelar</span>
                            <ChevronDown size={13} className={`transition-transform ${showTitleModal ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {/* Dropdown / Modal Pemilihan Gelar Pencapaian */}
                        {showTitleModal && (
                          <div className="p-3 bg-[#111622] border border-[#524128] rounded-lg space-y-2 animate-in fade-in shadow-xl">
                            <span className="text-xs font-bold text-amber-300 block mb-1">
                              Pilih Gelar Kehormatan untuk Dipamerkan (Flexing):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {player?.unlockedTitles?.length > 0 ? (
                                player.unlockedTitles.map((t: string, index: number) => {
                                  const isSelected = equippedTitle === t;
                                  return (
                                    <button
                                      key={index}
                                      onClick={() => handleSelectTitle(t)}
                                      className={`p-2 rounded-lg border text-left flex items-start justify-between gap-2 transition-all ${
                                        isSelected
                                          ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                          : 'bg-[#181e2b] border-[#2f384c] text-stone-300 hover:border-amber-700'
                                      }`}
                                    >
                                      <div>
                                        <div className="font-bold flex items-center gap-1">
                                          <span>[{t}]</span>
                                        </div>
                                      </div>
                                      {isSelected && <Check size={14} className="text-amber-400 shrink-0 mt-0.5" />}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="col-span-full text-center text-stone-500 py-4 italic">
                                  Belum ada gelar. Raih dari pencapaian, quest, atau sekte.
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 2. Character Name & Sect */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-2xl sm:text-3xl font-bold text-amber-200 tracking-wide font-serif">
                              {characterName}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-950/80 to-amber-900/80 border border-amber-500/60 text-amber-200 text-xs font-serif font-bold shadow-md">
                              {realmDisplay.fullTitle}
                            </span>
                          </div>
                          <p className="text-stone-400 text-xs mt-0.5">
                            Sekte: <span className="text-amber-300 font-semibold">{sectName}</span>
                          </p>
                        </div>

                        {/* 3. Core Attributes (Integer values) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-stone-300 bg-[#0e121a] p-2.5 rounded-lg border border-[#262e3d]">
                          <div>
                            <span className="text-stone-500 block text-[10px]">Ras</span>
                            <span className="font-semibold">{race}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">Kelamin</span>
                            <span className="font-semibold">{gender}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">Karisma</span>
                            <span className="text-amber-300 font-semibold">{charisma}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">Reputasi</span>
                            <span className="text-emerald-300 font-semibold">{reputationTitle} ({reputation})</span>
                          </div>
                        </div>

                        {/* 4. Currencies Bar (Integer numbers) */}
                        <div className="flex flex-wrap items-center gap-2 bg-[#0e121a] p-2 rounded-lg border border-[#262e3d]">
                          <span className="text-[11px] text-stone-400 mr-1">Kas Saldo:</span>
                          <span className="px-2 py-0.5 rounded bg-black/60 border border-amber-600/40 text-xs font-mono text-amber-200 flex items-center gap-1">
                            <span>🥇</span> {gold} Emas
                          </span>
                          <span className="px-2 py-0.5 rounded bg-black/60 border border-stone-600/40 text-xs font-mono text-stone-300 flex items-center gap-1">
                            <span>🥈</span> {silver} Perak
                          </span>
                          <span className="px-2 py-0.5 rounded bg-black/60 border border-amber-900/40 text-xs font-mono text-amber-600 flex items-center gap-1">
                            <span>🟤</span> {copper} Tembaga
                          </span>
                          <span className="px-2 py-0.5 rounded bg-black/60 border border-emerald-600/40 text-xs font-mono text-emerald-300 flex items-center gap-1">
                            <span>💠</span> {jade} Giok
                          </span>
                          <span className="px-2 py-0.5 rounded bg-black/60 border border-purple-600/40 text-xs font-mono text-purple-300 flex items-center gap-1">
                            <span>🔮</span> {spirit} Batu Roh
                          </span>
                        </div>

                        {/* 5. Qi Cultivation Progress Bar */}
                        <div className="bg-[#0e121a] p-2.5 rounded-lg border border-[#262e3d] space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-stone-400 flex items-center gap-1">
                              <Zap size={13} className="text-amber-400" />
                              Intisari Qi Kultivasi
                            </span>
                            <span className="text-amber-300 font-mono font-bold">
                              {qi} / {maxQi} Qi ({qiPercent}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#1b2230] rounded-full h-2.5 overflow-hidden border border-[#313e56]">
                            <div 
                              className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${qiPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* 6. Interests / Hobbies */}
                        <div className="text-xs pt-1 border-t border-[#2a2419]">
                          <span className="text-stone-500">Minat & Hobi: </span>
                          <span className="text-stone-300 font-medium">{interests.join(' • ')}</span>
                        </div>

                      </div>

                    </div>

                    {/* Bottom Section: 5 Detailed Stat Categories (General, Combat, Martial Arts, Spiritual Root, Artisanship) */}
                    {/* All values are strictly integers, and sword skill displays pure integer Level (Lv. 1) */}
                    <div className="pt-2">
                      <StatGrid player={player} />
                    </div>

                  </div>
                )}

                {/* TAB 2: CONDITION (KONDISI & EFEK STATUS STATUS KARAKTER) */}
                {activeTab === 'condition' && (
                  <ConditionTab player={player} onRefresh={fetchPlayerProfile} />
                )}

                {/* TAB 3: SKILLS (KITAB & HUKUM ALAM TERPADU) */}
                {activeTab === 'skills' && (
                  <KitabDanHukumAlamView onRefresh={fetchPlayerProfile} />
                )}

                {/* TAB 3: ARTISAN (PROFESSIONS) */}
                {activeTab === 'artisan' && (
                  <div className="space-y-4">
                    <div className="bg-[#121622] border border-[#3b3323] p-4 rounded-xl">
                      <h3 className="text-lg font-serif font-bold text-amber-300 mb-3 flex items-center gap-2">
                        <Hammer size={18} className="text-amber-400" />
                        Profesi & Kemahiran Pengrajin (7 Disiplin)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          { name: 'Alkimia (Alchemy)', level: Math.max(1, Math.floor(player?.professions?.alchemy?.level || player?.extendedStats?.artisanship?.alchemy || 1)), icon: '⚗️', desc: 'Meracik pil obat dan intisari Qi' },
                          { name: 'Penempa (Forge / Smithing)', level: Math.max(1, Math.floor(player?.professions?.smithing?.level || player?.extendedStats?.artisanship?.forge || 1)), icon: '⚒️', desc: 'Menempa pedang, baju zirah, dan perkakas' },
                          { name: 'Kertas Jimat (Talismans)', level: Math.max(1, Math.floor(player?.extendedStats?.artisanship?.talismans || 1)), icon: '📜', desc: 'Menuliskan segel mantra pertahanan' },
                          { name: 'Herbalis & Tani (Herbology)', level: Math.max(1, Math.floor(player?.professions?.farming?.level || player?.extendedStats?.artisanship?.herbology || 1)), icon: '🌿', desc: 'Mengenali dan memanen tanaman obat langka' },
                          { name: 'Penambang (Mining)', level: Math.max(1, Math.floor(player?.professions?.mining?.level || player?.extendedStats?.artisanship?.mining || 1)), icon: '⛏️', desc: 'Mengekstraksi bijih besi dingin dan giok roh' },
                          { name: 'Memancing (Fishing)', level: Math.max(1, Math.floor(player?.professions?.fishing?.level || player?.extendedStats?.artisanship?.fishing || 1)), icon: '🎣', desc: 'Menangkap ikan roh di perairan Jianghu' },
                          { name: 'Kuliner & Masak (Cooking)', level: Math.max(1, Math.floor(player?.professions?.cooking?.level || player?.extendedStats?.artisanship?.cooking || 1)), icon: '🍳', desc: 'Mengolah ransum dan masakan pemulih energi' }
                        ].map((art, idx) => (
                          <div key={idx} className="bg-[#181d2a] border border-[#2d3547] p-3 rounded-lg flex items-center gap-3">
                            <div className="text-2xl p-2 bg-[#10131d] rounded-md border border-[#384157]">
                              {art.icon}
                            </div>
                            <div>
                              <div className="font-bold text-amber-200 text-xs sm:text-sm">{art.name}</div>
                              <div className="text-[11px] text-amber-400 font-semibold font-mono">Tingkat Kemahiran: Lv. {art.level}</div>
                              <div className="text-[10px] text-stone-400 mt-0.5">{art.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: ITEM (EQUIPMENT SUMMARY) */}
                {activeTab === 'item' && (
                  <div className="space-y-4">
                    <div className="bg-[#121622] border border-[#3b3323] p-4 rounded-xl">
                      <h3 className="text-lg font-serif font-bold text-amber-300 mb-3 flex items-center gap-2">
                        <Package size={18} className="text-amber-400" />
                        Peralatan & Perlengkapan Tempur
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {[
                          { slot: 'Senjata', val: player?.equipment?.weapon, icon: '🗡️' },
                          { slot: 'Baju Zirah', val: player?.equipment?.armor, icon: '🥋' },
                          { slot: 'Helm', val: player?.equipment?.helmet, icon: '👑' },
                          { slot: 'Celana', val: player?.equipment?.pants, icon: '👖' },
                          { slot: 'Sepatu', val: player?.equipment?.boots, icon: '👢' },
                          { slot: 'Aksesoris', val: player?.equipment?.accessory, icon: '📿' },
                          { slot: 'Tunggangan', val: player?.equipment?.mount || player?.equippedMount, icon: '🐎' },
                        ].map((eq, idx) => (
                          <div key={idx} className="bg-[#171c29] border border-[#323c52] p-2.5 rounded-lg flex flex-col items-center text-center">
                            <span className="text-stone-400 text-[11px] mb-1">{eq.slot}</span>
                            <span className="text-2xl mb-1">{eq.icon}</span>
                            <span className="text-amber-200 font-semibold text-[11px] truncate w-full">
                              {typeof eq.val === 'object' && eq.val !== null ? (eq.val as any).name : (eq.val || 'Kosong')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: EXPERIENCE (CULTIVATION REALM PROGRESS) */}
                {activeTab === 'experience' && (
                  <div className="space-y-4">
                    <div className="bg-[#121622] border border-[#3b3323] p-4 rounded-xl font-serif">
                      <h3 className="text-lg font-bold text-amber-300 mb-3 flex items-center gap-2">
                        <Scroll size={18} className="text-amber-400" />
                        Jejak Perjalanan Dao & Terobosan
                      </h3>
                      <div className="space-y-3 text-xs sm:text-sm">
                        <div className="flex justify-between items-center p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <span className="text-stone-400">Ranah Kultivasi Saat Ini:</span>
                          <span className="font-bold text-amber-300 text-base">{realmDisplay.fullTitle}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <span className="text-stone-400">Total Akumulasi Qi:</span>
                          <span className="font-bold text-sky-300">{qi} Intisari Qi</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <span className="text-stone-400">Kondisi Fondasi Dantian:</span>
                          <span className={`font-bold ${player?.systemCultivation?.isFlawedFoundation ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {player?.systemCultivation?.isFlawedFoundation ? 'Cacat / Rusak (Flawed Foundation)' : 'Murni & Sempurna (Flawless)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: RELATIONS (SECT, PETS, ALLIES) */}
                {activeTab === 'relations' && (
                  <div className="space-y-4">
                    <div className="bg-[#121622] border border-[#3b3323] p-4 rounded-xl font-serif">
                      <h3 className="text-lg font-bold text-amber-300 mb-3 flex items-center gap-2">
                        <Users size={18} className="text-amber-400" />
                        Ikatan Sosial & Sekutu
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <h4 className="font-bold text-amber-300 text-sm mb-1">Afiliasi Sekte</h4>
                          <p className="text-stone-300">{sectName}</p>
                          <p className="text-stone-500 text-[11px] mt-1">Status: Anggota Sah</p>
                        </div>
                        <div className="p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                          <h4 className="font-bold text-amber-300 text-sm mb-1">Pernikahan / Pasangan Dao</h4>
                          <p className="text-stone-300">
                            {player?.marriage?.status === 'married' ? 'Telah Memiliki Pasangan Dao' : 'Lajang (Single)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
