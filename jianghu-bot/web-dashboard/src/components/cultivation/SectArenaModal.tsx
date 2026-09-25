"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { 
  Swords, Trophy, Shield, Award, Users, Loader2, History, 
  CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Flame, Clock, Sparkles, Settings,
  Target, Crosshair, ArrowUpRight, ArrowDownRight, Package
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import BattleArena from '@/components/battle/BattleArena';

interface SectArenaModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isStandalone?: boolean;
}

interface LadderEntry {
  discordId: string;
  characterName: string;
  sect: string;
  realm: string;
  realmIndex: number;
  rank: number;
  peakRank: number;
  avatar: string | null;
  combatPower: number;
  statsSnapshot?: { hp: number; atk: number; def: number; spd: number };
  wins: number;
  losses: number;
}

interface MatchRecord {
  opponentDiscordId: string;
  opponentName: string;
  opponentRank: number;
  isAttacker: boolean;
  outcome: 'win' | 'loss';
  rankBefore: number;
  rankAfter: number;
  timestamp: string;
}

interface RewardTier {
  tierId: string;
  label: string;
  minRank: number;
  maxRank: number;
  silver: number;
  gold: number;
  spiritStones: number;
  meritTokens: number;
  items: Array<{ itemId: string; name: string; quantity: number }>;
}

interface OverviewData {
  myEntry: {
    discordId: string;
    characterName: string;
    sect: string;
    realm: string;
    realmIndex: number;
    rank: number;
    peakRank: number;
    avatar: string | null;
    combatPower: number;
    statsSnapshot?: { hp: number; atk: number; def: number; spd: number };
    wins: number;
    losses: number;
    dailyChallengesUsed: number;
    challengesRemaining: number;
  };
  totalParticipants: number;
  rivalsAbove: LadderEntry[];
  rivalsBelow: LadderEntry[];
  msUntilSettlement: number;
  nextSettlementAt: string;
  currentMonthKey: string;
  rewardTiers: RewardTier[];
  matchHistory: MatchRecord[];
  isAdmin: boolean;
}

export default function SectArenaModal({ isOpen = true, onClose = () => {}, isStandalone = false }: SectArenaModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'arena' | 'ladder' | 'tiers' | 'history' | 'admin'>('arena');
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Countdown timer state
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  // Admin config state
  const [adminTiers, setAdminTiers] = useState<RewardTier[]>([]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Arena Overview
  const { data: overviewRes, isLoading: isOverviewLoading } = useQuery<{ success: boolean; data: OverviewData }>({
    queryKey: ['sectArenaOverview'],
    queryFn: async () => {
      const { data } = await api.get('/sect-arena/overview');
      return data;
    },
    enabled: isOpen,
    refetchInterval: 12000
  });

  const overview = overviewRes?.data;

  // Countdown settlement timer
  useEffect(() => {
    if (overview?.msUntilSettlement) {
      setCountdownSeconds(Math.floor(overview.msUntilSettlement / 1000));
    }
  }, [overview?.msUntilSettlement]);

  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds]);

  // Fetch Paginated Ladder
  const { data: ladderRes, isLoading: isLadderLoading } = useQuery({
    queryKey: ['sectArenaLadder', currentPage, debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get(`/sect-arena/ladder?page=${currentPage}&limit=10&search=${encodeURIComponent(debouncedSearch)}`);
      return data;
    },
    enabled: isOpen && activeTab === 'ladder'
  });

  // Fetch Admin Config
  const { data: adminConfigRes } = useQuery({
    queryKey: ['sectArenaAdminConfig'],
    queryFn: async () => {
      const { data } = await api.get('/sect-arena/admin/config');
      return data;
    },
    enabled: isOpen && activeTab === 'admin' && !!overview?.isAdmin
  });

  useEffect(() => {
    if (adminConfigRes?.data?.rewardTiers) {
      setAdminTiers(adminConfigRes.data.rewardTiers);
    }
  }, [adminConfigRes]);

  // Challenge Mutation (Mulai Duel Turn-Based)
  const challengeMutation = useMutation({
    mutationFn: async (targetRank: number) => {
      const { data } = await api.post('/sect-arena/challenge', { targetRank });
      return data;
    },
    onSuccess: (res) => {
      if (res.battleId) {
        toast.show({
          message: res.message || '⚔️ Memasuki gelanggang tanding turn-based!',
          type: 'success'
        });
        setActiveBattleId(res.battleId);
      }
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal memulai duel arena.',
        type: 'error'
      });
    }
  });

  // Admin Save Mutation
  const saveAdminMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put('/sect-arena/admin/config', payload);
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '✅ Hadiah 8-Tier Arena berhasil diperbarui!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['sectArenaOverview'] });
      queryClient.invalidateQueries({ queryKey: ['sectArenaAdminConfig'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal menyimpan konfigurasi admin arena.',
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

  // Helper: Visual Card Styling Berdasarkan Peringkat (7 Visual Tiers)
  const getRankStyle = (rank: number) => {
    if (rank === 1) {
      return {
        cardClass: 'border-2 border-amber-400 bg-gradient-to-r from-amber-950/80 via-[#1e1405] to-amber-950/80 shadow-[0_0_30px_rgba(245,158,11,0.35)]',
        badgeClass: 'bg-amber-500 text-stone-950 font-bold px-2.5 py-0.5 rounded-full border border-yellow-200 shadow-md',
        badgeText: '👑 #1 KAMPIUN TERTINGGI',
        nameClass: 'text-amber-200 font-black text-sm sm:text-base font-serif tracking-wider',
        auraGlow: 'drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]'
      };
    }
    if (rank === 2 || rank === 3) {
      return {
        cardClass: 'border-2 border-cyan-400/80 bg-gradient-to-r from-cyan-950/60 via-[#0a1218] to-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.25)]',
        badgeClass: 'bg-cyan-500 text-stone-950 font-bold px-2 py-0.5 rounded-full border border-cyan-200',
        badgeText: rank === 2 ? '🥈 #2 PENGUASA SAYAP PERAK' : '🥉 #3 PELINDUNG GIOK ES',
        nameClass: 'text-cyan-200 font-bold text-sm font-serif',
        auraGlow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]'
      };
    }
    if (rank >= 4 && rank <= 10) {
      return {
        cardClass: 'border border-amber-600/70 bg-gradient-to-r from-stone-950 via-[#18110b] to-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
        badgeClass: 'bg-amber-900/90 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-600/60',
        badgeText: `🔥 #${rank} ELIT SEPULUH`,
        nameClass: 'text-amber-100 font-bold text-sm font-serif',
        auraGlow: ''
      };
    }
    if (rank >= 11 && rank <= 50) {
      return {
        cardClass: 'border border-amber-900/50 bg-[#10121a] hover:border-amber-700/60',
        badgeClass: 'bg-stone-900 text-amber-300/90 font-mono px-1.5 py-0.5 rounded border border-stone-700',
        badgeText: `🌟 #${rank}`,
        nameClass: 'text-stone-200 font-semibold text-xs sm:text-sm font-serif',
        auraGlow: ''
      };
    }
    if (rank >= 51 && rank <= 200) {
      return {
        cardClass: 'border border-stone-800/80 bg-stone-950/90 hover:border-stone-700',
        badgeClass: 'bg-stone-900 text-stone-300 font-mono px-1.5 py-0.5 rounded border border-stone-800',
        badgeText: `⚔️ #${rank}`,
        nameClass: 'text-stone-300 font-medium text-xs font-serif',
        auraGlow: ''
      };
    }
    return {
      cardClass: 'border border-stone-900 bg-black/60 hover:border-stone-800',
      badgeClass: 'bg-black text-stone-500 font-mono px-1.5 py-0.5 rounded border border-stone-900',
      badgeText: `#${rank}`,
      nameClass: 'text-stone-400 text-xs font-serif',
      auraGlow: ''
    };
  };

  // Navigasi lompat ke halaman peringkat saya
  const jumpToMyRank = () => {
    if (!overview?.myEntry?.rank) return;
    const targetPage = Math.ceil(overview.myEntry.rank / 10);
    setCurrentPage(targetPage);
    setActiveTab('ladder');
  };

  // Jika sedang aktif dalam pertempuran turn-based, render layar BattleArena
  if (activeBattleId) {
    return (
      <BattleArena
        battleId={activeBattleId}
        onBattleEnd={(result, rewards) => {
          setActiveBattleId(null);
          queryClient.invalidateQueries({ queryKey: ['sectArenaOverview'] });
          queryClient.invalidateQueries({ queryKey: ['sectArenaLadder'] });
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
        }}
      />
    );
  }

  const myRank = overview?.myEntry?.rank || 1;
  const myStyle = getRankStyle(myRank);

  const innerContent = (
    <div className={`space-y-4 text-stone-200 p-1 text-xs ${isStandalone ? '' : 'max-h-[82vh] overflow-y-auto custom-scrollbar'}`}>
      {/* HEADER & TAB BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('arena')}
            className={`px-3 py-1.5 rounded text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'arena'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" /> Gelanggang Tantangan
          </button>

          <button
            onClick={() => setActiveTab('ladder')}
            className={`px-3 py-1.5 rounded text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ladder'
                ? 'bg-stone-800 text-stone-200 border border-stone-600'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Tangga Peringkat Dunia
          </button>

          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-3 py-1.5 rounded text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'tiers'
                ? 'bg-stone-800 text-amber-300 border border-amber-700/60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Hadiah Bulanan 8-Tier
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-stone-800 text-stone-200 border border-stone-600'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Riwayat Duel
          </button>

          {overview?.isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded text-xs font-serif font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Admin Config
            </button>
          )}
        </div>

        {/* Tiket Harian Indicator */}
        <div className="flex items-center gap-2">
          <div className="bg-black/80 px-3 py-1 rounded-full border border-amber-600/40 text-[11px] font-mono flex items-center gap-1.5">
            <span className="text-stone-400">Tiket Tantangan Hari Ini:</span>
            <strong className={(overview?.myEntry?.challengesRemaining || 0) > 0 ? 'text-emerald-400 font-bold' : 'text-red-400'}>
              {overview?.myEntry?.challengesRemaining || 0} / 3 Tiket
            </strong>
          </div>
        </div>
      </div>

      {/* SPIRITUAL SPARRING ARRAY STATUS BANNER */}
      <div className="bg-gradient-to-r from-blue-950/60 via-[#0d1627] to-cyan-950/60 border border-cyan-800/50 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <div className="text-xs">
            <span className="font-serif font-bold text-cyan-300">Panggung Sparring Ilusi Rohani:</span>
            <span className="text-stone-300 ml-1.5 text-[11px]">
              Formasi Pelindung Tetua aktif. Duel menggunakan 100% Proyeksi HP & Qi — <strong className="text-emerald-300">HP fisik dan vitalitas raga di dunia nyata 100% aman terlindungi</strong> tanpa risiko luka batin atau cedera!
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-700/60 bg-cyan-950/70 text-cyan-200 shrink-0 font-bold hidden md:inline">
          🛡️ Raga Bebas Cedera
        </span>
      </div>

      {/* KARTU POSISI SAYA (HERO BANNER PRESTISIUS) */}
      <div className={`p-4 rounded-xl relative overflow-hidden transition-all ${myStyle.cardClass}`}>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-black/60 border border-amber-500/50 flex items-center justify-center text-2xl font-serif font-black shrink-0 shadow-inner">
              {overview?.myEntry?.avatar ? (
                <img src={overview.myEntry.avatar} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
              ) : (
                '🥋'
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={myStyle.badgeClass}>{myStyle.badgeText}</span>
                <span className="text-[10px] text-stone-400 font-mono">
                  Peak: #{overview?.myEntry?.peakRank || myRank}
                </span>
              </div>
              <h3 className={myStyle.nameClass}>{overview?.myEntry?.characterName || 'Pendekar Fana'}</h3>
              <div className="text-[11px] text-stone-400 flex items-center gap-2 font-mono">
                <span>{overview?.myEntry?.sect}</span>
                <span>•</span>
                <span className="text-amber-400">{overview?.myEntry?.realm}</span>
                <span>•</span>
                <span>CP: {overview?.myEntry?.combatPower?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Statistik Rekor & Tombol Navigasi */}
          <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 border-stone-800/80 pt-2 sm:pt-0">
            <div className="text-right font-mono">
              <span className="text-[10px] text-stone-400 block">Rekor Gelanggang:</span>
              <span className="text-emerald-400 font-bold">{overview?.myEntry?.wins || 0}M</span>
              <span className="text-stone-500"> / </span>
              <span className="text-red-400 font-bold">{overview?.myEntry?.losses || 0}K</span>
            </div>

            <Button
              size="sm"
              onClick={jumpToMyRank}
              variant="outline"
              className="border-amber-500/50 text-amber-300 hover:bg-amber-950/40 text-xs px-3 py-1.5 h-auto flex items-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5" /> Posisi di Tangga
            </Button>
          </div>
        </div>
      </div>

      {/* HITUNG MUNDUR SNAPSHOT BULANAN */}
      <div className="bg-[#120f0a] border border-amber-900/50 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
          <div>
            <span className="font-serif font-bold text-amber-300 text-xs block">
              Snapshot & Pembagian Hadiah Bulanan:
            </span>
            <span className="text-[11px] text-stone-400 font-mono">
              Hadiah 8-Tier dibagikan akhir bulan tanpa me-reset tangga peringkat (Endless Ladder terus berlanjut).
            </span>
          </div>
        </div>
        <div className="text-xs sm:text-sm font-mono font-bold text-amber-400 bg-black/60 px-3 py-1.5 rounded-lg border border-amber-600/30 shrink-0">
          {formatCountdown(countdownSeconds)}
        </div>
      </div>

      {/* TAB 1: ARENA TANTANGAN (5 RIVAL DI ATAS & 5 RIVAL DI BAWAH) */}
      {activeTab === 'arena' && (
        <div className="space-y-4">
          {/* BAGIAN RIVAL DI ATASMU (SIAP DITANTANG) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-bold text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-red-400" /> Rival di Atasmu (Tantang 1–5 Peringkat Lebih Tinggi)
              </h4>
              <span className="text-[10px] text-stone-500 font-mono">
                Menang = Merebut Posisi Target & Menggeser Turun Seluruh Lawan di Antaranya
              </span>
            </div>

            {myRank === 1 ? (
              <div className="p-6 text-center border-2 border-amber-500/60 rounded-xl bg-amber-950/20 space-y-1">
                <div className="text-3xl">👑</div>
                <h5 className="font-serif font-bold text-amber-300 text-sm">
                  Kamu adalah Kampiun Tertinggi Sembilan Benua (Peringkat #1)!
                </h5>
                <p className="text-stone-400 text-xs">
                  Tidak ada lawan di atasmu. Bersiaplah mempertahankan tahtamu dari penantang di bawah!
                </p>
              </div>
            ) : (!overview?.rivalsAbove || overview.rivalsAbove.length === 0) ? (
              <div className="p-4 text-center border border-dashed border-stone-800 rounded-xl text-stone-500 font-mono text-xs">
                Tidak ada rival di atasmu yang ditemukan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {overview.rivalsAbove.map((rival) => {
                  const rStyle = getRankStyle(rival.rank);
                  const isChallenging = challengeMutation.isPending;

                  return (
                    <div
                      key={rival.rank}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${rStyle.cardClass}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className={rStyle.badgeClass}>{rStyle.badgeText}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            CP {rival.combatPower?.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                          {rival.realm}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className={rStyle.nameClass}>{rival.characterName}</div>
                          <span className="text-[10px] text-stone-400 block">{rival.sect}</span>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => challengeMutation.mutate(rival.rank)}
                          disabled={isChallenging || (overview?.myEntry?.challengesRemaining || 0) <= 0}
                          className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold px-3 py-1.5 h-auto text-xs shrink-0 shadow-lg shadow-red-950 border border-amber-400/50 font-serif"
                        >
                          {isChallenging ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            `⚔️ Tantang (#${rival.rank})`
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BAGIAN RIVAL DI BAWAHMU (YANG MENGEJAR POSISIMU) */}
          <div className="space-y-2 pt-2 border-t border-stone-800/80">
            <h4 className="font-serif font-bold text-stone-400 text-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-stone-500" /> Rival di Bawahmu (Siap Mengejar Posisi)
            </h4>

            {(!overview?.rivalsBelow || overview.rivalsBelow.length === 0) ? (
              <div className="p-3 text-center text-stone-600 font-mono text-xs italic">
                Tidak ada rival di bawahmu saat ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {overview.rivalsBelow.map((rival) => {
                  const rStyle = getRankStyle(rival.rank);
                  return (
                    <div
                      key={rival.rank}
                      className="p-2.5 rounded-lg border border-stone-800/70 bg-stone-950/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-amber-500/80">#{rival.rank}</span>
                          <span className="text-stone-300 font-serif font-semibold">{rival.characterName}</span>
                        </div>
                        <span className="text-[10px] text-stone-500 block font-mono">
                          {rival.realm} • CP {rival.combatPower}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TANGGA PERINGKAT LENGKAP DENGAN PAGINASI */}
      {activeTab === 'ladder' && (
        <div className="space-y-3">
          {/* Bar Pencarian & Info Halaman */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pendekar atau sekte..."
                className="w-full bg-black/60 border border-stone-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={jumpToMyRank}
                className="border-amber-500/40 text-amber-300 hover:bg-amber-950/30 text-xs px-2.5 py-1 h-auto"
              >
                🎯 Posisi Saya (#{overview?.myEntry?.rank})
              </Button>
            </div>
          </div>

          {/* Tabel Peringkat */}
          <div className="rounded-xl border border-stone-800 bg-stone-950/90 overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-stone-900/80 text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="p-2.5 w-16">Rank</th>
                  <th className="p-2.5">Karakter</th>
                  <th className="p-2.5 hidden sm:table-cell">Sekte</th>
                  <th className="p-2.5 hidden md:table-cell">Ranah</th>
                  <th className="p-2.5 text-right">Combat Power</th>
                  <th className="p-2.5 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-900">
                {isLadderLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Memuat tangga peringkat dunia...
                    </td>
                  </tr>
                ) : (!ladderRes?.data?.entries || ladderRes.data.entries.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-stone-500 italic">
                      Tidak ada pendekar ditemukan di halaman ini.
                    </td>
                  </tr>
                ) : (
                  ladderRes.data.entries.map((entry: LadderEntry) => {
                    const isMe = entry.discordId === overview?.myEntry?.discordId;
                    const rStyle = getRankStyle(entry.rank);
                    const canChallenge = myRank > entry.rank && entry.rank >= Math.max(1, myRank - 5);

                    return (
                      <tr
                        key={entry.rank}
                        className={`transition-colors ${
                          isMe
                            ? 'bg-amber-950/30 border-l-2 border-l-amber-500'
                            : 'hover:bg-stone-900/40'
                        }`}
                      >
                        <td className="p-2.5 font-bold">
                          {entry.rank === 1 ? (
                            <span className="text-amber-400 font-black">👑 #1</span>
                          ) : entry.rank === 2 ? (
                            <span className="text-cyan-300 font-bold">🥈 #2</span>
                          ) : entry.rank === 3 ? (
                            <span className="text-amber-600 font-bold">🥉 #3</span>
                          ) : (
                            <span className="text-stone-400">#{entry.rank}</span>
                          )}
                        </td>

                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <span className={rStyle.nameClass}>{entry.characterName}</span>
                            {isMe && (
                              <span className="text-[9px] bg-amber-500 text-black px-1 rounded font-bold">
                                SAYA
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-500 sm:hidden block">
                            {entry.sect} • {entry.realm}
                          </span>
                        </td>

                        <td className="p-2.5 text-stone-400 hidden sm:table-cell">{entry.sect}</td>
                        <td className="p-2.5 text-cyan-400 hidden md:table-cell">{entry.realm}</td>
                        <td className="p-2.5 text-right font-bold text-amber-300">
                          {entry.combatPower?.toLocaleString()}
                        </td>

                        <td className="p-2.5 text-center">
                          {canChallenge ? (
                            <button
                              onClick={() => challengeMutation.mutate(entry.rank)}
                              disabled={challengeMutation.isPending || (overview?.myEntry?.challengesRemaining || 0) <= 0}
                              className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-1 rounded shadow"
                            >
                              ⚔️ Tantang
                            </button>
                          ) : isMe ? (
                            <span className="text-[10px] text-stone-500 font-mono">Posisi Saya</span>
                          ) : (
                            <span className="text-[10px] text-stone-600 font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Kontrol Paginasi */}
          {ladderRes?.data?.pagination && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs font-mono">
              <span className="text-stone-500">
                Halaman {ladderRes.data.pagination.currentPage} dari {ladderRes.data.pagination.totalPages} ({ladderRes.data.pagination.totalItems} Pendekar)
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="px-2 py-1 bg-stone-800 rounded font-bold text-amber-300">
                  {currentPage}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(ladderRes.data.pagination.totalPages, prev + 1))}
                  disabled={currentPage >= ladderRes.data.pagination.totalPages}
                  className="p-1.5 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(ladderRes.data.pagination.totalPages)}
                  disabled={currentPage >= ladderRes.data.pagination.totalPages}
                  className="p-1.5 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HADIAH BULANAN 8-TIER */}
      {activeTab === 'tiers' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-serif font-bold text-amber-300">
              🏆 Matriks Hadiah Bulanan Gelanggang Arena (8-Tier)
            </h3>
            <p className="text-[11px] text-stone-400">
              Setiap akhir bulan, sistem mengambil snapshot peringkat. Peringkat kamu tetap berlanjut (tidak di-reset) setelah hadiah dibagikan!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(overview?.rewardTiers || []).map((tier) => (
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

                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px] bg-black/40 p-1.5 rounded">
                  <div>
                    <span className="text-stone-500 block">Perak:</span>
                    <strong className="text-amber-300 font-bold">+{tier.silver} Silver</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Emas:</span>
                    <strong className="text-yellow-400 font-bold">+{tier.gold} Gold</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Batu Roh:</span>
                    <strong className="text-cyan-400 font-bold">+{tier.spiritStones} Roh</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Token:</span>
                    <strong className="text-purple-400 font-bold">+{tier.meritTokens}</strong>
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

      {/* TAB 4: RIWAYAT PERTANDINGAN */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <h4 className="font-serif font-bold text-stone-200 flex items-center gap-2 text-xs sm:text-sm">
            <History className="w-4 h-4 text-amber-400" /> Catatan Duel Terkini
          </h4>

          {(!overview?.matchHistory || overview.matchHistory.length === 0) ? (
            <div className="p-8 text-center border border-dashed border-stone-800 rounded-xl text-stone-500 font-mono text-xs">
              Belum ada riwayat pertandingan. Tantang pendekar di atasmu untuk mulai merebut peringkat!
            </div>
          ) : (
            <div className="space-y-2">
              {overview.matchHistory.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-stone-800 bg-stone-950/80 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    {m.outcome === 'win' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-200 font-serif font-bold">{m.opponentName}</span>
                        <span className="text-[10px] text-stone-500">(Rank #{m.opponentRank})</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block">
                        {m.isAttacker ? 'Kamu sebagai Penantang' : 'Kamu sebagai Bertahan'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    {m.outcome === 'win' && m.rankAfter < m.rankBefore ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
                        <ArrowUpRight className="w-3.5 h-3.5" /> #{m.rankBefore} → #{m.rankAfter}
                      </span>
                    ) : m.outcome === 'loss' && m.rankAfter > m.rankBefore ? (
                      <span className="text-red-400 font-bold flex items-center gap-1 justify-end">
                        <ArrowDownRight className="w-3.5 h-3.5" /> #{m.rankBefore} → #{m.rankAfter}
                      </span>
                    ) : (
                      <span className="text-stone-400 font-bold">
                        Peringkat Tetap (#{m.rankAfter || m.rankBefore})
                      </span>
                    )}
                    <span className="text-[9px] text-stone-600 block">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ADMIN CONFIGURATION */}
      {activeTab === 'admin' && overview?.isAdmin && (
        <Card className="p-4 border border-purple-500/40 bg-purple-950/20 space-y-4">
          <div className="border-b border-purple-800/40 pb-2">
            <h4 className="font-serif font-bold text-purple-300 text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" /> Pengaturan Hadiah 8-Tier Arena Bulanan (Admin Only)
            </h4>
            <p className="text-[11px] text-stone-400">
              Admin dapat menyetel perak, emas, batu roh, dan item hadiah untuk masing-masing dari 8 tier peringkat.
            </p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {adminTiers.map((tier, idx) => (
              <div key={tier.tierId} className="p-2.5 rounded bg-black/40 border border-stone-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-300">{tier.label}</span>
                  <span className="text-[10px] text-stone-500 font-mono">Rank {tier.minRank} - {tier.maxRank}</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-stone-400 block">Silver:</label>
                    <input
                      type="number"
                      value={tier.silver}
                      onChange={(e) => {
                        const updated = [...adminTiers];
                        updated[idx].silver = Number(e.target.value);
                        setAdminTiers(updated);
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded p-1 text-xs text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block">Gold:</label>
                    <input
                      type="number"
                      value={tier.gold}
                      onChange={(e) => {
                        const updated = [...adminTiers];
                        updated[idx].gold = Number(e.target.value);
                        setAdminTiers(updated);
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded p-1 text-xs text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block">Spirit Stones:</label>
                    <input
                      type="number"
                      value={tier.spiritStones}
                      onChange={(e) => {
                        const updated = [...adminTiers];
                        updated[idx].spiritStones = Number(e.target.value);
                        setAdminTiers(updated);
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded p-1 text-xs text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 block">Tokens:</label>
                    <input
                      type="number"
                      value={tier.meritTokens}
                      onChange={(e) => {
                        const updated = [...adminTiers];
                        updated[idx].meritTokens = Number(e.target.value);
                        setAdminTiers(updated);
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded p-1 text-xs text-stone-200"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-purple-800/40 flex justify-end gap-2">
            <Button
              size="sm"
              onClick={() => saveAdminMutation.mutate({ rewardTiers: adminTiers })}
              disabled={saveAdminMutation.isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 text-xs"
            >
              {saveAdminMutation.isPending ? 'Menyimpan...' : '💾 Simpan Konfigurasi Hadiah Arena'}
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
          title="🏆 Gelanggang Peringkat Kultivator Jianghu (Endless Ladder)"
          description="Tangga peringkat abadi 24/7/365 seluruh ranah. Tantang 1–5 peringkat di atasmu, rebut posisi dengan bertarung turn-based RPG, dan nikmati hadiah bulanan 8-Tier!"
        />
        {innerContent}
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🏆 Gelanggang Peringkat Kultivator Jianghu (Endless Ladder)">
      {innerContent}
    </Modal>
  );
}
