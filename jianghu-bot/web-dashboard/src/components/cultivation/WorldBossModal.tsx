"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { 
  Flame, Swords, Trophy, Skull, Loader2, Sparkles, 
  AlertCircle, Settings, Shield, Clock, ChevronRight, 
  CheckCircle2, RefreshCw, X, ChevronLeft, Award, Package, Eye
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import BattleArena from '@/components/battle/BattleArena';
import { GLOBAL_ASSETS } from '@/config/globalAssets';

interface WorldBossModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isStandalone?: boolean;
}

interface RewardTier {
  tierId: string;
  label: string;
  minRank: number;
  maxRank: number;
  silver: number;
  gold: number;
  spiritStones: number;
  exp: number;
  items: Array<{ itemId: string; name: string; quantity: number }>;
}

interface WorldBossData {
  seasonNumber: number;
  bossId: string;
  bossName: string;
  bossImageUrl: string | null;
  maxHp: number;
  currentHp: number;
  phase: number;
  status: string;
  bossStats?: { hp: number; atk: number; def: number; spd: number };
  isSaturday: boolean;
  msUntilNextSaturday: number;
  attemptsUsed: number;
  attemptsLimit: number;
  attemptsRemaining: number;
  myContribution?: {
    rank: number;
    damage: number;
    attackCount: number;
    rewardsClaimed: boolean;
  } | null;
  rewardTiers: RewardTier[];
  leaderboard: Array<{
    rank: number;
    name: string;
    sect: string;
    damage: number;
  }>;
  isAdmin: boolean;
}

export default function WorldBossModal({ isOpen = true, onClose = () => {}, isStandalone = false }: WorldBossModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'arena' | 'tiers' | 'leaderboard' | 'admin'>('arena');
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  // Admin form state
  const [adminSelectedMonster, setAdminSelectedMonster] = useState<string>('');
  const [adminBossName, setAdminBossName] = useState<string>('');
  const [adminBossImageUrl, setAdminBossImageUrl] = useState<string>('');
  const [adminMaxHp, setAdminMaxHp] = useState<number>(400000000);
  const [adminTiers, setAdminTiers] = useState<RewardTier[]>([]);
  const [adminOverrideSaturday, setAdminOverrideSaturday] = useState<boolean>(false);

  const { data: statusRes, isLoading } = useQuery<{ success: boolean; data: WorldBossData }>({
    queryKey: ['worldBossStatus'],
    queryFn: async () => {
      const { data } = await api.get('/world-boss/status');
      return data;
    },
    enabled: isOpen,
    refetchInterval: 15000
  });

  const bossData = statusRes?.data;

  // Countdown timer
  useEffect(() => {
    if (bossData?.msUntilNextSaturday) {
      setCountdownSeconds(Math.floor(bossData.msUntilNextSaturday / 1000));
    }
  }, [bossData?.msUntilNextSaturday]);

  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds]);

  // Fetch admin config if admin tab clicked
  const { data: adminConfigRes } = useQuery({
    queryKey: ['worldBossAdminConfig'],
    queryFn: async () => {
      const { data } = await api.get('/world-boss/admin/config');
      return data;
    },
    enabled: isOpen && activeTab === 'admin' && !!bossData?.isAdmin
  });

  useEffect(() => {
    if (adminConfigRes?.data) {
      const d = adminConfigRes.data;
      setAdminBossName(d.bossName || '');
      setAdminBossImageUrl(d.bossImageUrl || '');
      setAdminMaxHp(d.maxHp || 400000000);
      setAdminTiers(d.rewardTiers || []);
    }
  }, [adminConfigRes]);

  // Start Real RPG Battle Mutation
  const startBattleMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/world-boss/battle/start', {
        adminOverride: adminOverrideSaturday
      });
      return data;
    },
    onSuccess: (res) => {
      if (res.battleId) {
        toast.show({
          message: '⚔️ Memasuki Kawah Purba! Pertempuran RPG Turn-Based Dimulai!',
          type: 'success'
        });
        setActiveBattleId(res.battleId);
      }
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal memasuki pertempuran Bos Dunia.',
        type: 'error'
      });
    }
  });

  // Admin Save Mutation
  const saveAdminMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put('/world-boss/admin/config', payload);
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '✅ Pengaturan Bos Dunia berhasil disimpan!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['worldBossStatus'] });
      queryClient.invalidateQueries({ queryKey: ['worldBossAdminConfig'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal menyimpan pengaturan admin.',
        type: 'error'
      });
    }
  });

  const formatCountdown = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days} Hari ${String(hours).padStart(2, '0')} Jam ${String(minutes).padStart(2, '0')} Menit ${String(seconds).padStart(2, '0')} Detik`;
  };

  // Resolve Boss Visual Art
  const getBossImage = () => {
    if (!bossData) return null;
    if (bossData.bossImageUrl && bossData.bossImageUrl.trim()) {
      return bossData.bossImageUrl;
    }
    const assetRegistry = (GLOBAL_ASSETS as any).world_bosses;
    if (assetRegistry && assetRegistry[bossData.bossId] && assetRegistry[bossData.bossId].trim()) {
      return assetRegistry[bossData.bossId];
    }
    if (assetRegistry && assetRegistry.default_boss && assetRegistry.default_boss.trim()) {
      return assetRegistry.default_boss;
    }
    return null;
  };

  const bossImageUrl = getBossImage();
  const maxHp = bossData?.maxHp || 400000000;
  const currentHp = Math.max(0, bossData?.currentHp || 0);
  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));

  const phaseLabels = [
    '',
    'Fase 1: Kesiagaan Purba (75%–100% HP)',
    'Fase 2: Kobaran Samadhi Lahar Panas (25%–75% HP)',
    'Fase 3: Amukan Ekstrem Letusan Lahar (<25% HP)'
  ];

  // Jika sedang aktif dalam pertempuran turn-based, render layar BattleArena
  if (activeBattleId) {
    return (
      <BattleArena
        battleId={activeBattleId}
        onBattleEnd={(result, rewards) => {
          setActiveBattleId(null);
          queryClient.invalidateQueries({ queryKey: ['worldBossStatus'] });
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
        }}
      />
    );
  }

  const innerContent = (
    <div className="space-y-5 text-stone-200 p-1 text-xs">
      {/* Tab Navigasi Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('arena')}
            className={`px-3 py-1.5 rounded text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'arena'
                ? 'bg-red-950/80 text-red-300 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" /> Medan Tempur Sabtu
          </button>

          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-3 py-1.5 rounded text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'tiers'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Hadiah 8-Tier
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-stone-800 text-stone-200 border border-stone-600'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> Peringkat Kontributor
          </button>

          {bossData?.isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Pengaturan Admin
            </button>
          )}
        </div>

        {/* Status Sabtu Badge */}
        <div className="hidden sm:flex items-center gap-1.5">
          {bossData?.isSaturday ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 animate-pulse">
              ● SABTU AKTIF (GERBANG TERBUKA)
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 text-amber-400 border border-stone-700 flex items-center gap-1">
              <Clock className="w-3 h-3" /> HIBERNASI PURBA
            </span>
          )}
        </div>
      </div>

      {activeTab === 'arena' && (
        <div className="space-y-4">
          {/* SPIRITUAL PROJECTION REASSURANCE BANNER */}
          <div className="bg-gradient-to-r from-purple-950/60 via-[#160b1c] to-amber-950/60 border border-amber-600/50 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div className="text-xs">
                <span className="font-serif font-bold text-amber-300">Ekspedisi Sukma Astral (Qi Projection):</span>
                <span className="text-stone-300 ml-1.5 text-[11px]">
                  Menyerbu dengan proyeksi kesadaran batin 100% Max HP & Qi — <strong className="text-emerald-300">Tubuh fisik dan vitalitas di dunia nyata tidak berkurang</strong> serta bebas penalti kematian!
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-600/60 bg-amber-950/70 text-amber-200 shrink-0 font-bold hidden md:inline">
              🌌 Raga Nyata Aman
            </span>
          </div>

          {/* BANNER UTAMA BOS DUNIA */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-red-500/50 bg-gradient-to-b from-[#1c0808] via-[#0d0404] to-black p-5 sm:p-7 text-center space-y-4 shadow-2xl backdrop-blur-md">
            {/* Latar Visual Efek Lava / Lukisan Bos */}
            {bossImageUrl ? (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity filter blur-sm pointer-events-none"
                style={{ backgroundImage: `url(${bossImageUrl})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/20 via-transparent to-transparent pointer-events-none" />
            )}

            {/* Gambar Ilustrasi Bos atau Emoji Fallback */}
            <div className="relative z-10 flex flex-col items-center">
              {bossImageUrl ? (
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-amber-500/80 shadow-[0_0_35px_rgba(239,68,68,0.5)] my-1 bg-black/60">
                  <img 
                    src={bossImageUrl} 
                    alt={bossData?.bossName || 'World Boss'} 
                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500" 
                  />
                </div>
              ) : (
                <div className="text-7xl sm:text-8xl animate-pulse my-2 filter drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]">
                  🐲
                </div>
              )}

              <div className="space-y-1.5 mt-2">
                <h3 className="text-2xl sm:text-3xl font-bold font-serif text-amber-200 tracking-wider">
                  {bossData?.bossName || 'Raja Qilin Api Purba'}
                </h3>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-xs px-3 py-0.5 rounded-full font-mono bg-red-950/90 text-red-400 border border-red-500/50 shadow-inner">
                    {phaseLabels[bossData?.phase || 1]}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-stone-900 text-stone-400 border border-stone-700">
                    Sabtu 00:00 – 23:59 WIB
                  </span>
                </div>
              </div>

              <p className="text-xs text-stone-300 max-w-xl mx-auto leading-relaxed mt-2 font-sans">
                Raksasa dewa purba yang bangkit dari kawah letusan lahar terdalam. Seluruh pendekar sembilan benua bahu-membahu melancarkan serangan nyata dalam pertempuran RPG turn-based demi memperebutkan hadiah 8-Tier tael perak dan pil terobosan ilahi!
              </p>
            </div>

            {/* HP BAR GLOBAL */}
            <div className="relative z-10 space-y-1.5 max-w-lg mx-auto pt-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-stone-400">Total Darah Global Server:</span>
                <span className="text-red-400 font-bold">
                  {currentHp.toLocaleString()} / {maxHp.toLocaleString()} ({hpPercent}%)
                </span>
              </div>
              <div className="w-full h-5 bg-stone-950 rounded-full overflow-hidden border border-red-900/80 p-0.5 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-red-700 via-orange-500 to-amber-400 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            {/* KARTU STATUS SERANGAN PEMAIN & TOMBOL MASUK TEMPUR */}
            <div className="relative z-10 pt-3 flex flex-col items-center gap-3">
              {/* Indikator Sisa Jatah Serangan */}
              <div className="inline-flex items-center gap-2 bg-black/80 px-4 py-1.5 rounded-full border border-amber-600/40 text-xs font-mono">
                <span className="text-stone-400">Jatah Serangan Hari Ini:</span>
                <strong className={bossData?.attemptsRemaining && bossData.attemptsRemaining > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {bossData?.attemptsRemaining || 0} / {bossData?.attemptsLimit || 3} Kesempatan
                </strong>
              </div>

              {/* Status Hari Sabtu vs Bukan Sabtu */}
              {!bossData?.isSaturday && !adminOverrideSaturday ? (
                <div className="bg-[#120808]/90 border border-amber-500/40 p-3.5 rounded-xl max-w-md w-full text-center space-y-1">
                  <div className="text-xs text-amber-300 font-serif font-bold flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Gerbang Kawah Tertutup Kabut Segel (Menanti Hari Sabtu)</span>
                  </div>
                  <div className="text-sm sm:text-base font-mono font-bold text-amber-400">
                    {formatCountdown(countdownSeconds)}
                  </div>
                  <p className="text-[10px] text-stone-400">
                    Raja Siluman Dunia hanya membuka segel kawahnya setiap hari Sabtu pukul 00:00–23:59 WIB.
                  </p>
                  {bossData?.isAdmin && (
                    <button
                      onClick={() => setAdminOverrideSaturday(true)}
                      className="mt-2 text-[10px] text-purple-400 hover:text-purple-300 underline font-mono"
                    >
                      [Admin Test: Bypass Hari Sabtu]
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-2">
                  <Button
                    size="lg"
                    onClick={() => startBattleMutation.mutate()}
                    disabled={startBattleMutation.isPending || currentHp <= 0 || (bossData?.attemptsRemaining || 0) <= 0}
                    className="bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-orange-400 text-stone-950 font-bold px-8 py-3 h-auto text-sm sm:text-base shadow-2xl shadow-red-600/40 border border-orange-300 transition-all hover:scale-105 active:scale-95 rounded-xl font-serif"
                  >
                    {startBattleMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Menghubungkan ke Medan Tempur...
                      </span>
                    ) : currentHp <= 0 ? (
                      "🏆 Raja Siluman Purba Telah Ditumbangkan!"
                    ) : (bossData?.attemptsRemaining || 0) <= 0 ? (
                      "⏳ Seluruh Jatah 3 Serangan Hari Ini Telah Digunakan"
                    ) : (
                      "⚔️ Hadapi Bos Dunia dalam Pertempuran RPG (Turn-Based)"
                    )}
                  </Button>
                  <span className="text-[10px] text-stone-400 font-mono">
                    🛡️ Fair Play Rule: HP karakter dipulihkan 100% setelah pertempuran. Tanpa penalti pemulihan 4 jam!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2 KARTU STATUS: KONTRIBUSI SAYA & TOP 3 SERVER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Kontribusi Saya */}
            <Card className="p-4 border border-stone-800 bg-stone-950/80 space-y-2.5">
              <h4 className="font-serif font-bold text-amber-300 flex items-center gap-2 text-xs sm:text-sm">
                <Flame className="w-4 h-4 text-amber-400" /> Kontribusi Kerusakan Saya Minggu Ini
              </h4>
              {bossData?.myContribution ? (
                <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-lg bg-black/60 border border-stone-800/80 font-mono">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Peringkat Saya:</span>
                    <strong className="text-base text-amber-300 font-serif">#{bossData.myContribution.rank}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Total Damage:</span>
                    <strong className="text-sm text-red-400">{bossData.myContribution.damage.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Kali Serang:</span>
                    <strong className="text-sm text-stone-200">{bossData.myContribution.attackCount}x</strong>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-stone-500 font-mono text-xs italic">
                  Belum melancarkan serangan minggu ini. Klik tombol merah di atas untuk bertarung!
                </div>
              )}
            </Card>

            {/* Top 3 Peringkat Tertinggi */}
            <Card className="p-4 border border-stone-800 bg-stone-950/80 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-serif font-bold text-stone-200 flex items-center gap-2 text-xs sm:text-sm">
                  <Trophy className="w-4 h-4 text-amber-400" /> Top 3 Kontributor Server
                </h4>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className="text-[10px] text-amber-400 hover:underline font-mono"
                >
                  Lihat Semua →
                </button>
              </div>
              <div className="space-y-1 font-mono text-xs">
                {(bossData?.leaderboard || []).slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between items-center p-1.5 rounded ${
                      idx === 0
                        ? 'text-amber-300 bg-amber-950/30 border border-amber-500/30'
                        : idx === 1
                        ? 'text-stone-300 bg-stone-900/40 border border-stone-700/30'
                        : 'text-amber-600 bg-stone-900/20 border border-amber-800/20'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                      <strong className="text-stone-200">{item.name}</strong>
                      <span className="text-[10px] text-stone-500">({item.sect})</span>
                    </span>
                    <span className="font-bold flex-shrink-0 text-red-400">{item.damage.toLocaleString()} DMG</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIKS HADIAH 8-TIER */}
      {activeTab === 'tiers' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-serif font-bold text-amber-300">
                🏆 Distribusi Hadiah Bos Dunia (8-Tier System)
              </h3>
              <p className="text-[11px] text-stone-400">
                Hadiah dibagikan secara otomatis sesuai total peringkat kerusakan saat Bos Dunia tumbang atau hari Sabtu berakhir.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(bossData?.rewardTiers || []).map((tier) => (
              <Card
                key={tier.tierId}
                className="p-3 border border-stone-800 bg-stone-950/80 space-y-2 relative overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-stone-800 pb-1.5">
                  <span className="font-serif font-bold text-xs text-amber-200">{tier.label}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                    Rank {tier.minRank} - {tier.maxRank}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] bg-black/40 p-1.5 rounded">
                  <div>
                    <span className="text-stone-500 block">Perak:</span>
                    <strong className="text-amber-300 font-bold">+{tier.silver} Silver</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Batu Roh:</span>
                    <strong className="text-cyan-400 font-bold">+{tier.spiritStones} Roh</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">EXP:</span>
                    <strong className="text-emerald-400 font-bold">+{tier.exp.toLocaleString()}</strong>
                  </div>
                </div>

                {tier.items && tier.items.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1">
                    {tier.items.map((it, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-amber-950/50 border border-amber-600/40 text-amber-200 px-2 py-0.5 rounded font-mono"
                      >
                        📦 {it.name} <strong className="text-amber-400">x{it.quantity}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LEADERBOARD LENGKAP KONTRIBUTOR */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-serif font-bold text-stone-200">
              ⚔️ Papan Peringkat Kontribusi Kerusakan Server
            </h3>
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-950/90 overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-stone-900/80 text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="p-2.5">Peringkat</th>
                  <th className="p-2.5">Nama Pendekar</th>
                  <th className="p-2.5">Sekte</th>
                  <th className="p-2.5 text-right">Total Damage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-900">
                {(!bossData?.leaderboard || bossData.leaderboard.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-stone-500 italic">
                      Belum ada pendekar yang melancarkan serangan minggu ini.
                    </td>
                  </tr>
                ) : (
                  bossData.leaderboard.map((c) => (
                    <tr key={c.rank} className="hover:bg-stone-900/40 transition-colors">
                      <td className="p-2.5 font-bold">
                        {c.rank === 1 ? '🥇 #1' : c.rank === 2 ? '🥈 #2' : c.rank === 3 ? '🥉 #3' : `#${c.rank}`}
                      </td>
                      <td className="p-2.5 text-stone-200 font-serif">{c.name}</td>
                      <td className="p-2.5 text-stone-400">{c.sect}</td>
                      <td className="p-2.5 text-right text-red-400 font-bold">
                        {c.damage.toLocaleString()} DMG
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PANEL PENGATURAN ADMIN */}
      {activeTab === 'admin' && bossData?.isAdmin && (
        <Card className="p-4 border border-purple-500/40 bg-purple-950/20 space-y-4">
          <div className="border-b border-purple-800/40 pb-2">
            <h4 className="font-serif font-bold text-purple-300 text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" /> Pengaturan Bos Dunia & Matriks Hadiah (Admin Only)
            </h4>
            <p className="text-[11px] text-stone-400">
              Admin dapat dengan mudah mengganti monster bos, mengisi link gambar lore, atau menyetel hadiah item untuk setiap tier.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Ganti Bos dari Katalog Monster */}
            <div className="space-y-1">
              <label className="text-stone-300 font-semibold block">Pilih Monster dari Katalog:</label>
              <select
                value={adminSelectedMonster}
                onChange={(e) => {
                  const mKey = e.target.value;
                  setAdminSelectedMonster(mKey);
                  const found = adminConfigRes?.data?.monsterCatalog?.find((m: any) => m.key === mKey);
                  if (found) {
                    setAdminBossName(found.name);
                    setAdminMaxHp(found.statBlock?.hp ? found.statBlock.hp * 100000 : 400000000);
                  }
                }}
                className="w-full bg-black/60 border border-stone-700 rounded p-2 text-stone-200 text-xs"
              >
                <option value="">-- Pilih Monster Katalog --</option>
                {(adminConfigRes?.data?.monsterCatalog || []).map((m: any) => (
                  <option key={m.key} value={m.key}>
                    [{m.regionSlug}] {m.name} (Tier {m.tier})
                  </option>
                ))}
              </select>
            </div>

            {/* Nama Bos Kustom */}
            <div className="space-y-1">
              <label className="text-stone-300 font-semibold block">Nama Bos Dunia:</label>
              <input
                type="text"
                value={adminBossName}
                onChange={(e) => setAdminBossName(e.target.value)}
                placeholder="Raja Qilin Api Purba"
                className="w-full bg-black/60 border border-stone-700 rounded p-2 text-stone-200 text-xs"
              />
            </div>

            {/* Link Gambar Bos */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-stone-300 font-semibold block">
                Link URL Gambar Bos (Atau daftarkan di globalAssets.ts):
              </label>
              <input
                type="text"
                value={adminBossImageUrl}
                onChange={(e) => setAdminBossImageUrl(e.target.value)}
                placeholder="https://.../boss_image.png"
                className="w-full bg-black/60 border border-stone-700 rounded p-2 text-stone-200 text-xs font-mono"
              />
            </div>

            {/* Max HP Bos */}
            <div className="space-y-1">
              <label className="text-stone-300 font-semibold block">Total Darah Max HP:</label>
              <input
                type="number"
                value={adminMaxHp}
                onChange={(e) => setAdminMaxHp(Number(e.target.value))}
                className="w-full bg-black/60 border border-stone-700 rounded p-2 text-stone-200 text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-purple-800/40 flex justify-end gap-2">
            <Button
              size="sm"
              onClick={() => {
                saveAdminMutation.mutate({
                  bossId: adminSelectedMonster || bossData.bossId,
                  bossName: adminBossName,
                  bossImageUrl: adminBossImageUrl,
                  maxHp: adminMaxHp,
                  rewardTiers: adminTiers
                });
              }}
              disabled={saveAdminMutation.isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 text-xs"
            >
              {saveAdminMutation.isPending ? 'Menyimpan...' : '💾 Simpan Konfigurasi Admin'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );

  if (isStandalone) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="🐉 Pertempuran Bos Dunia Eksklusif Sabtu (World Boss)"
          description="Raja Siluman Purba bangkit setiap hari Sabtu (00:00–23:59 WIB). 3x kesempatan bertarung RPG turn-based, tanpa sanksi dantian."
        />
        {innerContent}
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🐉 Pertempuran Bos Dunia Eksklusif Sabtu (World Boss)">
      {innerContent}
    </Modal>
  );
}
