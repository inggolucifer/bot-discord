"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { Swords, Trophy, Shield, Award, Users, Loader2 } from 'lucide-react';

interface SectArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TournamentData {
  currentRound: string;
  upcomingMatch: {
    opponentName: string;
    opponentSect: string;
    scheduledTime: string;
  };
  stats: {
    wins: number;
    losses: number;
    winRate: number;
    sectMeritTokens: number;
    rankTitle: string;
  };
}

export default function SectArenaModal({ isOpen, onClose }: SectArenaModalProps) {
  const queryClient = useQueryClient();
  const [selectedDivision, setSelectedDivision] = useState<'mortal' | 'qi' | 'foundation' | 'core'>('mortal');

  const { data: tourneyRes, isLoading } = useQuery<{ success: boolean; data: TournamentData }>({
    queryKey: ['sectTournament'],
    queryFn: async () => {
      const { data } = await api.get('/sect-arena/tournament');
      return data;
    },
    enabled: isOpen
  });

  const tourneyData = tourneyRes?.data || {
    currentRound: 'Babak 8 Besar',
    upcomingMatch: {
      opponentName: 'Pendekar Pedang Li',
      opponentSect: 'Sekte Huashan',
      scheduledTime: '16:30 Server Time'
    },
    stats: {
      wins: 24,
      losses: 3,
      winRate: 88,
      sectMeritTokens: 850,
      rankTitle: 'Murid Utama'
    }
  };

  const sparMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/sect-arena/spar');
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '⚔️ Sparring selesai dengan kemenangan! (+50 Token Jasa Sekte).',
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚔️ Gelanggang Beladiri Sekte (Sect Arena & Sparring Tournament)">
      <div className="space-y-5 text-stone-200 p-1 text-xs">
        {/* Banner Gelanggang Sparring */}
        <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-stone-950 via-amber-950/40 to-stone-950 p-5 text-center space-y-2 shadow-2xl backdrop-blur-md">
          <div className="text-5xl filter drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">🥋</div>
          <h3 className="text-xl font-bold font-serif text-amber-300">
            Turnamen Beladiri Sembilan Sekte (Setiap Minggu 16:00–18:00)
          </h3>
          <p className="text-stone-400 max-w-md mx-auto text-[11px] leading-relaxed">
            Panggung adu ketangkasan jurus dan hukum antar praktisi dari seluruh sekte besar Jianghu. Dibagi menjadi 4 divisi ranah yang adil tanpa penalti kematian atau luka batin!
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              onClick={() => sparMutation.mutate()}
              disabled={sparMutation.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-4 py-1.5 h-auto text-xs shadow-md"
            >
              {sparMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Bertarung...
                </span>
              ) : (
                "🥊 Sparring Bebas (Bebas Resiko)"
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => registerMutation.mutate(selectedDivision)}
              disabled={registerMutation.isPending}
              className="border-amber-500/50 text-amber-300 hover:bg-amber-950/40 text-xs px-3 py-1.5 h-auto"
            >
              📝 Daftar Divisi Ini
            </Button>
          </div>
        </div>

        {/* Pemilih 4 Divisi Ranah */}
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto">
          {[
            { id: 'mortal', label: 'Divisi Mortal' },
            { id: 'qi', label: 'Divisi Qi Refining' },
            { id: 'foundation', label: 'Divisi Foundation' },
            { id: 'core', label: 'Divisi Core Formation' }
          ].map((div) => (
            <button
              key={div.id}
              onClick={() => setSelectedDivision(div.id as any)}
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

        {/* Visualisasi Bracket 32-Besar */}
        <Card className="p-4 border border-stone-800 bg-stone-950/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-serif font-bold text-stone-200 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Bagan Turnamen 32-Besar Aktif
            </h4>
            <span className="font-mono text-stone-400 font-semibold">{tourneyData.currentRound}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px] font-mono">
            <div className="p-3 rounded-lg bg-black/60 border border-stone-800 space-y-1">
              <span className="text-stone-500 block text-[10px]">Pertandingan Mendatang:</span>
              <div className="font-bold text-amber-300 text-xs">
                Anda vs {tourneyData.upcomingMatch?.opponentName}
              </div>
              <span className="text-stone-400 block text-[10px]">
                {tourneyData.upcomingMatch?.opponentSect}
              </span>
              <span className="text-emerald-400 block text-[10px] pt-1">
                Jadwal: {tourneyData.upcomingMatch?.scheduledTime}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-stone-800 space-y-1">
              <span className="text-stone-500 block text-[10px]">Statistik Karakter:</span>
              <div className="text-stone-200 font-bold">
                Menang: {tourneyData.stats?.wins} | Kalah: {tourneyData.stats?.losses}
              </div>
              <span className="text-amber-400 block text-[10px]">
                Winrate: {tourneyData.stats?.winRate}%
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-stone-800 space-y-1">
              <span className="text-stone-500 block text-[10px]">Poin Jasa Sekte (Merit):</span>
              <div className="text-amber-300 font-bold text-sm">
                {tourneyData.stats?.sectMeritTokens} Token
              </div>
              <span className="text-stone-400 block text-[10px]">
                Pangkat: {tourneyData.stats?.rankTitle}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </Modal>
  );
}
