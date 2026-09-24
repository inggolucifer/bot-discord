"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { Swords, Trophy, Shield, Award, Users, Loader2, History, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

interface SectArenaModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isStandalone?: boolean;
}

interface MatchRecord {
  opponentName: string;
  opponentRealm: string;
  outcome: 'win' | 'loss';
  ratingChange: number;
  meritEarned: number;
  timestamp: string;
}

interface LeaderboardCompetitor {
  rank: number;
  name: string;
  sect: string;
  rating: number;
  wins: number;
}

interface TournamentData {
  division: string;
  currentRound: string;
  stats: {
    rating: number;
    wins: number;
    losses: number;
    winRate: number;
    sectMeritTokens: number;
    rankTitle: string;
  };
  leaderboard: LeaderboardCompetitor[];
  matchHistory: MatchRecord[];
}

export default function SectArenaModal({ isOpen = true, onClose = () => {}, isStandalone = false }: SectArenaModalProps) {
  const queryClient = useQueryClient();
  const [selectedDivision, setSelectedDivision] = useState<string>('Mortal');

  const { data: tourneyRes, isLoading } = useQuery<{ success: boolean; data: TournamentData }>({
    queryKey: ['sectTournament', selectedDivision],
    queryFn: async () => {
      const { data } = await api.get('/sect-arena/tournament');
      return data;
    },
    enabled: isOpen
  });

  const tourneyData = tourneyRes?.data || {
    division: 'Mortal',
    currentRound: 'Gelanggang Terbuka Sparring',
    stats: {
      rating: 1000,
      wins: 0,
      losses: 0,
      winRate: 0,
      sectMeritTokens: 0,
      rankTitle: 'Murid Biasa'
    },
    leaderboard: [],
    matchHistory: []
  };

  const sparMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/sect-arena/spar');
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '⚔️ Sparring selesai dengan hasil tercatat!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['sectTournament'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal melakukan sparring.',
        type: 'error'
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (division: string) => {
      const { data } = await api.post('/sect-arena/register', { division });
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '🥋 Berhasil mendaftar turnamen!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['sectTournament'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Pendaftaran gagal.',
        type: 'error'
      });
    }
  });

  const divisions = [
    { id: 'Mortal', label: 'Divisi Mortal' },
    { id: 'QiRefining', label: 'Divisi Qi Refining' },
    { id: 'Foundation', label: 'Divisi Foundation' },
    { id: 'GoldenCore', label: 'Divisi Golden Core' }
  ];

  const innerContent = (
    <div className={`space-y-5 text-stone-200 p-1 text-xs ${isStandalone ? '' : 'max-h-[75vh] overflow-y-auto custom-scrollbar'}`}>
        {/* Banner Gelanggang Sparring */}
        <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-stone-950 via-amber-950/40 to-stone-950 p-5 text-center space-y-2 shadow-2xl backdrop-blur-md">
          <div className="text-5xl filter drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">🥋</div>
          <h3 className="text-xl font-bold font-serif text-amber-300">
            Gelanggang Sparring Sembilan Sekte (Setiap Minggu 16:00–18:00)
          </h3>
          <p className="text-stone-400 max-w-md mx-auto text-[11px] leading-relaxed">
            Panggung adu ketangkasan jurus dan beladiri antar praktisi Jianghu. Uji kekuatanmu secara aman tanpa penalti luka batin dantian!
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              onClick={() => sparMutation.mutate()}
              disabled={sparMutation.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-5 py-2 h-auto text-xs shadow-md"
            >
              {sparMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Bertarung di Gelanggang...
                </span>
              ) : (
                "🥊 Tantang Sparring Gelanggang (-5 Stamina)"
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => registerMutation.mutate(selectedDivision)}
              disabled={registerMutation.isPending}
              className="border-amber-500/50 text-amber-300 hover:bg-amber-950/40 text-xs px-3 py-2 h-auto"
            >
              📝 Daftar Divisi {selectedDivision}
            </Button>
          </div>
        </div>

        {/* Pemilih 4 Divisi Ranah */}
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto">
          {divisions.map((div) => (
            <button
              key={div.id}
              onClick={() => setSelectedDivision(div.id)}
              className={`px-3 py-1.5 rounded text-xs font-serif font-semibold transition-all whitespace-nowrap ${
                selectedDivision === div.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {div.label}
            </button>
          ))}
        </div>

        {/* Statistik Karakter di Gelanggang */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <Card className="p-3 border border-stone-800 bg-stone-950/80 space-y-1">
            <span className="text-[10px] text-stone-500">Rating Gelanggang:</span>
            <div className="text-base font-bold text-amber-300">{tourneyData.stats?.rating || 1000}</div>
            <span className="text-[10px] text-stone-400 block">{tourneyData.stats?.rankTitle}</span>
          </Card>

          <Card className="p-3 border border-stone-800 bg-stone-950/80 space-y-1">
            <span className="text-[10px] text-stone-500">Rekor Tanding:</span>
            <div className="text-sm font-bold text-stone-200">
              {tourneyData.stats?.wins}M / {tourneyData.stats?.losses}K
            </div>
            <span className="text-[10px] text-emerald-400 block">Winrate {tourneyData.stats?.winRate}%</span>
          </Card>

          <Card className="p-3 border border-stone-800 bg-stone-950/80 space-y-1">
            <span className="text-[10px] text-stone-500">Token Jasa Sekte:</span>
            <div className="text-base font-bold text-amber-400">{tourneyData.stats?.sectMeritTokens} Token</div>
            <span className="text-[10px] text-stone-400 block">Dapat ditukar di Paviliun</span>
          </Card>

          <Card className="p-3 border border-stone-800 bg-stone-950/80 space-y-1">
            <span className="text-[10px] text-stone-500">Divisi Saat Ini:</span>
            <div className="text-sm font-bold text-stone-200">{tourneyData.division}</div>
            <span className="text-[10px] text-amber-300/80 block">{tourneyData.currentRound}</span>
          </Card>
        </div>

        {/* 2 Kolom: Riwayat Pertandingan & Leaderboard Divisi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Riwayat Sparring */}
          <Card className="p-4 border border-stone-800 bg-stone-950/80 space-y-3">
            <h4 className="font-serif font-bold text-stone-200 flex items-center gap-2 text-xs">
              <History className="w-4 h-4 text-amber-400" /> Riwayat Pertandingan Terkini
            </h4>

            {(!tourneyData.matchHistory || tourneyData.matchHistory.length === 0) ? (
              <div className="py-6 text-center text-stone-500 font-mono text-xs">
                Belum ada riwayat sparring. Klik "Tantang Sparring Gelanggang" di atas!
              </div>
            ) : (
              <div className="space-y-2">
                {tourneyData.matchHistory.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-stone-800/80 bg-black/40 flex items-center justify-between text-[11px] font-mono"
                  >
                    <div className="flex items-center gap-2">
                      {m.outcome === 'win' ? (
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-red-400 shrink-0" />
                      )}
                      <div>
                        <span className="text-stone-300 font-semibold block">{m.opponentName}</span>
                        <span className="text-[10px] text-stone-500">Divisi {m.opponentRealm}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={m.outcome === 'win' ? 'text-emerald-400 font-bold' : 'text-stone-400'}>
                        {m.ratingChange > 0 ? `+${m.ratingChange}` : m.ratingChange} Rating
                      </span>
                      <span className="block text-[10px] text-amber-400/80">+{m.meritEarned} Token</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Peringkat Top Divisi */}
          <Card className="p-4 border border-stone-800 bg-stone-950/80 space-y-3">
            <h4 className="font-serif font-bold text-stone-200 flex items-center gap-2 text-xs">
              <Trophy className="w-4 h-4 text-amber-400" /> Peringkat Pendekar Divisi {selectedDivision}
            </h4>

            {(!tourneyData.leaderboard || tourneyData.leaderboard.length === 0) ? (
              <div className="py-6 text-center text-stone-500 font-mono text-xs">
                Belum ada data kompetitor di divisi ini.
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {tourneyData.leaderboard.map((comp) => (
                  <div
                    key={comp.rank}
                    className={`p-2 rounded flex items-center justify-between border ${
                      comp.rank === 1
                        ? 'border-amber-500/50 bg-amber-950/20 text-amber-200'
                        : comp.rank === 2
                        ? 'border-stone-600 bg-stone-900/40 text-stone-300'
                        : comp.rank === 3
                        ? 'border-amber-800/40 bg-black/40 text-stone-300'
                        : 'border-stone-900 bg-black/20 text-stone-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 font-bold text-center">#{comp.rank}</span>
                      <div>
                        <span className="font-semibold text-stone-200">{comp.name}</span>
                        <span className="text-[10px] text-stone-500 block">{comp.sect}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-300 font-bold">{comp.rating} Rating</span>
                      <span className="block text-[10px] text-stone-500">{comp.wins} Menang</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
  );

  if (isStandalone) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="🏆 Gelanggang Beladiri Sekte (Sect Arena & Sparring Tournament)"
          description="Turnamen sparring mingguan antar murid sekte sembilan benua. Raih rating, kuasai 4 divisi ranah, dan kumpulkan Sect Merit Tokens."
        />
        {innerContent}
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚔️ Gelanggang Beladiri Sekte (Sect Arena & Sparring Tournament)">
      {innerContent}
    </Modal>
  );
}
