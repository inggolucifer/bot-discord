"use client";

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { Flame, Sparkles, CheckCircle2, Gift, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

interface DailyHubModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isStandalone?: boolean;
}

interface DailyQuest {
  id: string;
  title: string;
  desc: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  rewardCopper: number;
  rewardItem: string;
}

interface DailyHubData {
  loginStreak: number;
  canClaimStreak: boolean;
  lastStreakClaimDate: string | null;
  canClaimEpiphany: boolean;
  missions: DailyQuest[];
  weeklyProgress: number;
  weeklyTarget: number;
  canClaimWeekly: boolean;
  weeklyChestClaimed: boolean;
}

export default function DailyHubModal({ isOpen = true, onClose = () => {}, isStandalone = false }: DailyHubModalProps) {
  const queryClient = useQueryClient();

  // Fetch Live Daily Hub Status
  const { data: hubRes, isLoading: isHubLoading } = useQuery<{ success: boolean; data: DailyHubData }>({
    queryKey: ['dailyHubStatus'],
    queryFn: async () => {
      const { data } = await api.get('/daily-hub/status');
      return data;
    },
    enabled: isOpen
  });

  const hubData = hubRes?.data;

  // Klaim Login Streak Harian
  const claimStreakMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/daily-hub/claim-streak');
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '🔥 Berhasil mengklaim hadiah Login Streak!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['dailyHubStatus'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal mengklaim login streak.',
        type: 'error'
      });
    }
  });

  // Klaim Pencerahan Harian
  const claimEpiphanyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/daily-hub/claim-epiphany');
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '✨ Berhasil mengklaim pencerahan harian (+30 Koin Tembaga)!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['dailyHubStatus'] });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal mengklaim pencerahan harian.',
        type: 'error'
      });
    }
  });

  // Klaim Misi Harian
  const claimQuestMutation = useMutation({
    mutationFn: async (questId: string) => {
      const { data } = await api.post('/daily-hub/claim-quest', { questId });
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '✨ Berhasil mengklaim hadiah misi!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['dailyHubStatus'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal mengklaim misi.',
        type: 'error'
      });
    }
  });

  // Perawatan Law Aktif
  const maintainLawMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/daily-hub/maintain-law');
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '✨ Law telah dirawat dan diservis hari ini (-10 Copper)!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['dailyHubStatus'] });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal melakukan perawatan.',
        type: 'error'
      });
    }
  });

  // Klaim Peti Mingguan
  const claimWeeklyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/daily-hub/claim-weekly');
      return data;
    },
    onSuccess: (res) => {
      toast.show({
        message: res.message || '🎁 Peti mingguan berhasil dibuka (+3 Silver)!',
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['dailyHubStatus'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({
        message: err.response?.data?.error || 'Gagal mengklaim peti mingguan.',
        type: 'error'
      });
    }
  });

  const streakDays = hubData?.loginStreak || 0;
  const missions = hubData?.missions || [];
  const weeklyProgress = hubData?.weeklyProgress ?? 0;
  const weeklyTarget = hubData?.weeklyTarget ?? 15;
  const canClaimWeekly = hubData?.canClaimWeekly ?? false;

  const innerContent = (
    <div className="space-y-5 text-stone-200 p-1 text-xs">
        {/* Aturan Ekonomi & Anti-Inflasi Banner */}
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-950/20 text-stone-300 flex items-start gap-2.5 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <strong>Sistem Moneter Jianghu:</strong> Koin Tembaga (Copper) adalah urat nadi kehidupan sehari-hari, sedangkan Perak (Silver) sangat berharga. Klaim harian gratis dibatasi <strong>Maksimal 1 Silver</strong> pada puncak Login Streak Hari ke-7!
          </p>
        </div>

        {/* 1. Pencerahan Harian & Login Streak */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Box Pencerahan */}
          <Card className="p-4 border border-stone-800 bg-stone-950/80 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <div>
                  <h4 className="font-serif font-bold text-amber-300">Pencerahan Harian</h4>
                  <span className="text-[10px] text-stone-500 font-mono">Reset Pukul 00:00 Server Time</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Klaim seketika mengisi <strong className="text-amber-300">+120 Qi Semesta</strong> dan memberi hadiah <strong>30 Koin Tembaga (Copper)</strong>.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => claimEpiphanyMutation.mutate()}
              disabled={!hubData?.canClaimEpiphany || claimEpiphanyMutation.isPending}
              className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs py-1.5 h-auto rounded transition-all mt-2"
            >
              {claimEpiphanyMutation.isPending ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengklaim...
                </span>
              ) : hubData?.canClaimEpiphany ? (
                "✨ Klaim Pencerahan (+30 C)"
              ) : (
                "Sudah Diklaim Hari Ini ✓"
              )}
            </Button>
          </Card>

          {/* Box Login Streak 7 Hari */}
          <Card className="p-4 border border-stone-800 bg-stone-950/80 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <h4 className="font-serif font-bold text-orange-300">Login Streak 7 Hari</h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono border border-orange-500/30">
                  Hari ke-{streakDays}
                </span>
              </div>

              {/* 7 Petak Hari */}
              <div className="grid grid-cols-7 gap-1 pt-1">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const isPassed = day <= streakDays;
                  const isCurrent = day === streakDays;
                  const isPeak = day === 7;

                  return (
                    <div
                      key={day}
                      className={`p-1.5 rounded border text-center transition-all ${
                        isCurrent
                          ? 'border-orange-500 bg-orange-500/30 text-orange-200 shadow-sm'
                          : isPassed
                          ? 'border-stone-700 bg-stone-900 text-stone-300'
                          : 'border-stone-800/80 bg-black/40 text-stone-600'
                      }`}
                    >
                      <div className="text-[9px] font-mono">H{day}</div>
                      <div className="text-xs my-0.5">{isPassed ? '🔥' : '💤'}</div>
                      <div className="text-[8px] font-mono text-stone-400">
                        {isPeak ? '1S' : `${15 + day * 12}C`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => claimStreakMutation.mutate()}
              disabled={!hubData?.canClaimStreak || claimStreakMutation.isPending}
              className="w-full bg-orange-600 hover:bg-orange-500 text-stone-950 font-bold text-xs py-1.5 h-auto rounded transition-all mt-2"
            >
              {claimStreakMutation.isPending ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengklaim...
                </span>
              ) : hubData?.canClaimStreak ? (
                "🔥 Klaim Login Streak Hari Ini"
              ) : (
                "Sudah Diklaim Hari Ini ✓"
              )}
            </Button>
          </Card>
        </div>

        {/* 2. Tiga Misi Harian Cepat */}
        <div className="space-y-2">
          <h4 className="font-serif font-bold text-amber-300 flex items-center gap-2">
            <span>📋</span> 3 Misi Praktisi Harian
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {missions.map((m) => (
              <Card key={m.id} className="p-3 border border-stone-800 bg-stone-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-400 font-semibold">{m.title}</span>
                  <span className="text-[10px] font-mono text-stone-500">{m.progress}/{m.target}</span>
                </div>
                <p className="text-stone-300 text-[11px] leading-snug">{m.desc}</p>
                <div className="text-[10px] text-stone-400 font-mono">
                  Hadiah: <strong className="text-amber-300">{m.rewardCopper} Copper</strong> ({m.rewardItem})
                </div>

                <div className="pt-1">
                  {m.claimed ? (
                    <div className="text-center py-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/30 rounded border border-emerald-800/40">
                      Sudah Diklaim ✓
                    </div>
                  ) : m.completed ? (
                    <Button
                      size="sm"
                      onClick={() => claimQuestMutation.mutate(m.id)}
                      disabled={claimQuestMutation.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs py-1 h-auto"
                    >
                      ✓ Klaim Hadiah (+{m.rewardCopper} C)
                    </Button>
                  ) : (
                    <div className="text-center py-1 text-[10px] text-stone-500 font-mono bg-black/40 rounded border border-stone-800">
                      Dalam Progres ({m.progress}/{m.target})...
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 3. Perawatan Harian Law Aktif */}
        <Card className="p-3.5 border border-stone-800 bg-stone-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍖</span>
            <div>
              <h5 className="font-serif font-bold text-stone-200">Perawatan Harian Law Terpilih</h5>
              <p className="text-[11px] text-stone-400">
                Pakan Satwa Roh / Rawat Aperture Gu / Asah Pusaka Jiwa (10 Copper).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => maintainLawMutation.mutate()}
            disabled={maintainLawMutation.isPending}
            className="bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 font-semibold text-xs py-1.5 h-auto"
          >
            {maintainLawMutation.isPending ? "Merawat..." : "Rawat (10 C)"}
          </Button>
        </Card>

        {/* 4. Peti Harta Karun Mingguan */}
        <Card className="p-4 border border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-black flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-amber-400 flex-shrink-0 animate-bounce" />
            <div>
              <h5 className="font-serif font-bold text-amber-300 text-sm">Peti Harta Karun Mingguan</h5>
              <p className="text-[11px] text-stone-300">
                Selesaikan 15 misi dalam seminggu untuk membuka hadiah <strong>3 Tael Perak (Silver)</strong>!
              </p>
              <div className="mt-1 text-[10px] font-mono text-stone-400">
                Progres Minggu Ini: <strong className="text-amber-400">{weeklyProgress} / {weeklyTarget} Poin Misi</strong>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => claimWeeklyMutation.mutate()}
            disabled={!canClaimWeekly || claimWeeklyMutation.isPending}
            className={
              hubData?.weeklyChestClaimed
                ? "bg-stone-900 border border-stone-800 text-stone-500 text-xs py-1.5 h-auto cursor-not-allowed"
                : canClaimWeekly
                ? "bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs py-1.5 h-auto shadow-lg shadow-amber-500/30"
                : "bg-stone-900 border border-stone-800 text-stone-500 text-xs py-1.5 h-auto cursor-not-allowed"
            }
          >
            {hubData?.weeklyChestClaimed
              ? "Sudah Diklaim Minggu Ini ✓"
              : canClaimWeekly
              ? "🎁 Buka Peti Mingguan"
              : `🔒 Butuh ${Math.max(0, weeklyTarget - weeklyProgress)} Poin Lagi`}
          </Button>
        </Card>
      </div>
  );

  if (isStandalone) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="✨ Pusat Kemajuan Harian & Mingguan (Tianji Hub / 天机令阁)"
          description="Selesaikan misi harian, bangun login streak, raih pencerahan seketika, dan kumpulkan peti mingguan tanpa inflasi."
        />
        {innerContent}
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📦 Pusat Kemajuan Harian & Mingguan (Tianji Hub / 天机令阁)">
      {innerContent}
    </Modal>
  );
}
