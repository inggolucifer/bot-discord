"use client";

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { Shield, Flame, Swords, Trophy, Skull, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface WorldBossModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WorldBossData {
  bossId: string;
  bossName: string;
  maxHp: number;
  currentHp: number;
  phase: number;
  leaderboard: Array<{
    rank: number;
    name: string;
    sect: string;
    damage: number;
  }>;
}

export default function WorldBossModal({ isOpen, onClose }: WorldBossModalProps) {
  const queryClient = useQueryClient();

  const { data: statusRes, isLoading } = useQuery<{ success: boolean; data: WorldBossData }>({
    queryKey: ['worldBossStatus'],
    queryFn: async () => {
      const { data } = await api.get('/world-boss/status');
      return data;
    },
    enabled: isOpen,
    refetchInterval: 15000
  });

  const attackMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/world-boss/attack');
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '⚔️ Serangan dahsyat berhasil mendarat ke Bos Dunia!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['worldBossStatus'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal melancarkan serangan ke Bos Dunia.',
        type: 'error'
      });
    }
  });

  const bossData = statusRes?.data || {
    bossId: 'boss_flame_kirin',
    bossName: 'Raja Qilin Api Purba (Ancient Flame Kirin / 远古炎麒麟)',
    maxHp: 400000000,
    currentHp: 284500000,
    phase: 2,
    leaderboard: [
      { rank: 1, name: 'Pendekar Pedang Li', sect: 'Kunlun', damage: 4820000 },
      { rank: 2, name: 'Raja Iblis Nether', sect: 'Yin Ghost', damage: 3450000 },
      { rank: 3, name: 'Murid Master Gu', sect: 'Poison Valley', damage: 2110000 }
    ]
  };

  const maxHp = bossData.maxHp || 400000000;
  const currentHp = Math.max(0, bossData.currentHp || 0);
  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));

  const phaseLabels = [
    '',
    'Fase 1: Kesiagaan Purba (75%–100% HP)',
    'Fase 2: Kobaran Samadhi Lahar Panas (25%–75% HP)',
    'Fase 3: Amukan Ekstrem Letusan Lahar (<25% HP)'
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🐉 Pertempuran Bos Dunia Mingguan (World Boss — Setiap Sabtu 20:00)">
      <div className="space-y-5 text-stone-200 p-1 text-xs">
        {/* Banner Bos Dunia 512x512 panggung visual wuxia */}
        <div className="relative overflow-hidden rounded-xl border border-red-500/40 bg-gradient-to-b from-red-950/80 via-black to-stone-950 p-6 text-center space-y-3 shadow-2xl backdrop-blur-md">
          {/* Efek visual glow lava */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-600/10 via-transparent to-transparent pointer-events-none" />

          <div className="text-7xl animate-pulse my-2 filter drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
            🐲
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-bold font-serif text-red-300 tracking-wider">
              {bossData.bossName}
            </h3>
            <span className="inline-block text-xs px-3 py-0.5 rounded-full font-mono bg-red-950/80 text-red-400 border border-red-500/40">
              {phaseLabels[bossData.phase] || phaseLabels[2]}
            </span>
          </div>

          <p className="text-xs text-stone-400 max-w-lg mx-auto leading-relaxed">
            Makhluk dewa purba yang bangkit dari kawah gunung berapi terdalam. Seluruh pemain di sembilan benua Jianghu bahu-membahu menumbangkan 400 juta total darahnya demi hadiah tael perak dan batu roh kuno!
          </p>

          {/* Global Shared HP Bar */}
          <div className="space-y-1.5 pt-2 max-w-md mx-auto">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-stone-400">Total Darah Global Server:</span>
              <span className="text-red-400 font-bold">
                {currentHp.toLocaleString()} / {maxHp.toLocaleString()} ({hpPercent}%)
              </span>
            </div>
            <div className="w-full h-4 bg-stone-950 rounded-full overflow-hidden border border-red-900/60 p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-red-700 via-orange-500 to-yellow-400 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          <div className="pt-3">
            <Button
              size="sm"
              onClick={() => attackMutation.mutate()}
              disabled={attackMutation.isPending || currentHp <= 0}
              className="bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-orange-400 text-stone-950 font-bold px-6 py-2.5 h-auto text-sm shadow-xl shadow-red-600/30 border border-orange-300 transition-all hover:scale-105 active:scale-95"
            >
              {attackMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Merapalkan Serangan Semesta...
                </span>
              ) : currentHp <= 0 ? (
                "🏆 Bos Dunia Telah Ditumbangkan!"
              ) : (
                "⚔️ Lancarkan Serangan Bersama (-10 Stamina)"
              )}
            </Button>
          </div>
        </div>

        {/* Kontribusi Pemain & Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 border border-stone-800 bg-stone-950/70 space-y-2">
            <h4 className="font-serif font-bold text-amber-300 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Aturan Hadiah & Pembagian
            </h4>
            <div className="space-y-1.5 text-stone-400 text-[11px] leading-relaxed">
              <p>• <strong>Top 1–3:</strong> 5 Tael Perak (Silver) + 3 Pil Terobosan Langka + Gelar Kehormatan <em>[Pembantai Qilin]</em>.</p>
              <p>• <strong>Top 4–10:</strong> 2 Tael Perak (Silver) + 1 Pil Terobosan.</p>
              <p>• <strong>Partisipan Umum:</strong> 50 Koin Tembaga (Copper) + 100 Qi Instan per serangan.</p>
            </div>
          </Card>

          <Card className="p-4 border border-stone-800 bg-stone-950/70 space-y-2">
            <h4 className="font-serif font-bold text-stone-300 flex items-center gap-2">
              <Swords className="w-4 h-4 text-stone-400" /> Papan Peringkat Teratas (Server Leaderboard)
            </h4>
            <div className="space-y-1 text-[11px] font-mono">
              {(bossData.leaderboard || []).slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between p-1.5 rounded ${
                    idx === 0
                      ? 'text-amber-300 bg-amber-950/20 border border-amber-500/20'
                      : idx === 1
                      ? 'text-stone-300 bg-stone-900/40'
                      : 'text-amber-600 bg-stone-900/20'
                  }`}
                >
                  <span className="truncate">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {item.rank}. {item.name} ({item.sect})
                  </span>
                  <span className="font-bold flex-shrink-0">{item.damage.toLocaleString()} DMG</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Modal>
  );
}
