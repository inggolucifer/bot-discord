"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import LawConstellationTree from '@/components/cultivation/LawConstellationTree';
import { 
  Sparkles, Layers, BookOpen, Flame, Shield, 
  Info, AlertTriangle, ArrowRight, RefreshCw, Award
} from 'lucide-react';
import Link from 'next/link';

export default function SkillTreeClient() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  // Fetch Law Status (Active Law info)
  const { data: statusRes, isLoading: isStatusLoading } = useQuery({
    queryKey: ['lawStatus'],
    queryFn: async () => {
      const { data } = await api.get('/cultivation/law/status');
      return data;
    },
    enabled: !!token
  });

  // Fetch Skills Tree
  const { data: skillsRes, isLoading: isSkillsLoading, refetch: refetchSkills } = useQuery({
    queryKey: ['lawSkills'],
    queryFn: async () => {
      const { data } = await api.get('/cultivation/law/skills');
      return data;
    },
    enabled: !!token
  });

  const lawData = statusRes?.data;
  const treeData = skillsRes?.data;
  const skillsList = treeData?.skills || [];
  const availablePoints = treeData?.availablePoints || 0;
  const combatSignatures = treeData?.combatSignatures || lawData?.skillTree?.combatSignatures || lawData?.uniquePanel?.combatSignatures || [];
  const combatLoadout = lawData?.combatLoadout || [];

  // Mutation: Allocate SP to Skill Node
  const allocateMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const { data } = await api.post('/cultivation/law/skill/allocate', { skillId });
      return data;
    },
    onSuccess: (res) => {
      setNotice(res.message || '✨ Berhasil mempelajari jurus!');
      queryClient.invalidateQueries({ queryKey: ['lawSkills'] });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['myTechniques'] });
      queryClient.invalidateQueries({ queryKey: ['cultivation'] });
      toast.show({ message: res.message || 'Jurus berhasil dipelajari.', type: 'success' });
      setTimeout(() => setNotice(null), 4500);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Gagal mengalokasikan poin skill.';
      setNotice(msg);
      toast.show({ message: msg, type: 'error' });
      setTimeout(() => setNotice(null), 4500);
    }
  });

  // Mutation: Toggle Combat Loadout
  const loadoutMutation = useMutation({
    mutationFn: async (newLoadout: string[]) => {
      const { data } = await api.post('/cultivation/law/loadout', { skillIds: newLoadout });
      return data;
    },
    onSuccess: (res) => {
      setNotice('✅ Loadout jurus tempur diperbarui.');
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['lawSkills'] });
      queryClient.invalidateQueries({ queryKey: ['myTechniques'] });
      setTimeout(() => setNotice(null), 3000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Gagal mengubah loadout.';
      setNotice(msg);
      setTimeout(() => setNotice(null), 3000);
    }
  });

  const handleToggleLoadout = (skillId: string) => {
    let updated: string[];
    if (combatLoadout.includes(skillId)) {
      updated = combatLoadout.filter((id: string) => id !== skillId);
    } else {
      if (combatLoadout.length >= 4) {
        setNotice('Maksimal 4 jurus aktif terpilih.');
        setTimeout(() => setNotice(null), 3000);
        return;
      }
      updated = [...combatLoadout, skillId];
    }
    loadoutMutation.mutate(updated);
  };

  if (isStatusLoading || isSkillsLoading) {
    return <LoadingState text="Menghubungkan ke Konstelasi Bintang Semesta..." />;
  }

  // Jika belum memilih Law
  if (!lawData?.activeLawType) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pohon Dao (Konstelasi Bintang Semesta)"
          description="Pohon percabangan esoteris Wuxia untuk membuka jurus aktif dan pasif alam semesta."
        />
        <div className="max-w-2xl mx-auto py-12 text-center space-y-5">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl shadow-xl">
            🌌
          </div>
          <h2 className="text-2xl font-serif font-bold text-amber-200">
            Belum Mengikat Hukum Alam Semesta (Law)
          </h2>
          <p className="text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
            Untuk membuka percabangan Pohon Dao dan konstelasi jurus bintang semesta, kamu wajib mengikat takdirmu dengan salah satu dari 15 Hukum Semesta di Ranah Fondasi Fana.
          </p>
          <div className="pt-2">
            <Link href="/cultivation">
              <Button className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-serif font-bold px-6 py-3 rounded-xl shadow-lg border border-amber-400/40">
                Pilih Hukum Alam di Tab Kultivasi ➔
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pohon Dao (Konstelasi Bintang Semesta)"
        description={`Pohon percabangan esoteris ${lawData.lawName}. Alokasikan Poin Skill untuk membuka jurus aktif dan pasif alam semesta.`}
      />

      {/* Quick Nav Bar between Cultivation, Skill Tree, and Kitab & Jurus */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0d14]/90 border border-stone-800 p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-serif font-bold text-stone-400">Jalur Terpilih:</span>
          <span className="text-xs font-serif font-bold text-amber-300 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40">
            {lawData.lawName}
          </span>
          <span className="text-xs font-mono text-stone-400 px-2 py-0.5 rounded bg-black/60 border border-stone-800">
            Rank {lawData.rank} ({lawData.rankDisplayName})
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/cultivation">
            <Button size="sm" variant="ghost" className="text-xs text-stone-400 hover:text-amber-200 gap-1.5 cursor-pointer">
              <Flame size={14} className="text-orange-400" />
              <span>Kultivasi & Ranah</span>
            </Button>
          </Link>
          <Link href="/skills">
            <Button size="sm" variant="ghost" className="text-xs text-stone-400 hover:text-amber-200 gap-1.5 cursor-pointer">
              <BookOpen size={14} className="text-amber-400" />
              <span>Kitab & Jurus</span>
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchSkills()}
            className="text-xs border-stone-700 hover:border-amber-500/50 text-stone-300 gap-1 cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner Notice */}
      {notice && (
        <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs font-sans flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-amber-400 hover:text-amber-200 font-bold ml-3">✕</button>
        </div>
      )}

      {/* RENDER POHON KONSTELASI RASI BINTANG */}
      <LawConstellationTree
        skills={skillsList}
        availablePoints={availablePoints}
        combatSignatures={combatSignatures}
        onAllocate={(skillId) => allocateMutation.mutate(skillId)}
        isAllocating={allocateMutation.isPending}
        combatLoadout={combatLoadout}
        onToggleLoadout={handleToggleLoadout}
      />

      {/* Panduan Skala SP Bertingkat & Spesialisasi */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
        <Card className="border border-stone-800/80 bg-stone-950/60 p-3 text-center">
          <span className="text-[10px] font-mono text-stone-500 block uppercase">Tier 1: Fondasi</span>
          <strong className="text-amber-300 font-mono text-sm">1 SP</strong>
          <p className="text-[10px] text-stone-400 mt-1">Jurus dasar & pasif awal (Max Lv. 3)</p>
        </Card>
        <Card className="border border-stone-800/80 bg-stone-950/60 p-3 text-center">
          <span className="text-[10px] font-mono text-stone-500 block uppercase">Tier 2: Ilmu Mendalam</span>
          <strong className="text-amber-300 font-mono text-sm">2 SP</strong>
          <p className="text-[10px] text-stone-400 mt-1">Buff ATK, perisai & AoE (Max Lv. 5)</p>
        </Card>
        <Card className="border border-stone-800/80 bg-stone-950/60 p-3 text-center">
          <span className="text-[10px] font-mono text-stone-500 block uppercase">Tier 3: Domain Semesta</span>
          <strong className="text-amber-300 font-mono text-sm">3 SP</strong>
          <p className="text-[10px] text-stone-400 mt-1">Domain AoE & Crowd Control (Max Lv. 7)</p>
        </Card>
        <Card className="border border-stone-800/80 bg-stone-950/60 p-3 text-center">
          <span className="text-[10px] font-mono text-stone-500 block uppercase">Tier 4: Avatar Agung</span>
          <strong className="text-amber-300 font-mono text-sm">5 SP</strong>
          <p className="text-[10px] text-stone-400 mt-1">Wujud purba stat ×2 (Max Lv. 9)</p>
        </Card>
        <Card className="border border-amber-500/40 bg-amber-950/30 p-3 text-center shadow-md">
          <span className="text-[10px] font-mono text-amber-400 block uppercase">Tier 5: Mahadewa</span>
          <strong className="text-yellow-300 font-mono text-sm">7 SP</strong>
          <p className="text-[10px] text-amber-200/80 mt-1">1000% Cataclysm & Kebal Ilahi (Max Lv. 10)</p>
        </Card>
      </div>
    </div>
  );
}
