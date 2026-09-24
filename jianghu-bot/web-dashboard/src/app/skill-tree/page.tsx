"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { LawSkillItem } from '@/types/game';
import {
  Sparkles, Lock, CheckCircle2, ChevronRight, Shield,
  Sword, Flame, Zap, BookOpen, TreePine
} from 'lucide-react';
import Link from 'next/link';

export default function SkillTreePage() {
  const queryClient = useQueryClient();

  // Fetch Law Status
  const { data: statusRes, isLoading: isStatusLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['lawStatus'],
    queryFn: async () => {
      const { data } = await api.get('/cultivation/law/status');
      return data;
    }
  });

  const lawData = statusRes?.data;

  // Fetch Law Skills Tree
  const { data: skillsRes, isLoading: isSkillsLoading } = useQuery<{ success: boolean; data: { skills: LawSkillItem[]; availablePoints: number } }>({
    queryKey: ['lawSkills'],
    queryFn: async () => {
      const { data } = await api.get('/cultivation/law/skill-tree');
      return data;
    },
    enabled: !!lawData?.hasLaw
  });

  // Allocate Skill Mutation
  const allocateSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const { data } = await api.post('/cultivation/law/skill/allocate', { skillId });
      return data;
    },
    onSuccess: (res) => {
      toast.show({ message: res.message || 'Skill berhasil dipelajari!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lawSkills'] });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal mempelajari skill.', type: 'error' });
    }
  });

  // Update Loadout Mutation
  const updateLoadoutMutation = useMutation({
    mutationFn: async (skillIds: string[]) => {
      const { data } = await api.post('/cultivation/law/combat-loadout', { skillIds });
      return data;
    },
    onSuccess: (res) => {
      toast.show({ message: res.message || 'Loadout jurus aktif diperbarui!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['lawSkills'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal memperbarui loadout.', type: 'error' });
    }
  });

  const handleToggleCombatLoadout = (skillId: string) => {
    const current = [...(lawData?.combatLoadout || [])];
    const idx = current.indexOf(skillId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= 4) {
        toast.show({ message: 'Slot jurus aktif penuh (Maksimal 4 jurus)!', type: 'error' });
        return;
      }
      current.push(skillId);
    }
    updateLoadoutMutation.mutate(current);
  };

  if (isStatusLoading) return <LoadingState text="Memuat Pohon Jurus..." />;

  if (!lawData?.hasLaw) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="🌳 Pohon Jurus Law"
          description="Alokasikan poin skill dan atur loadout jurus aktif untuk pertarungan."
        />
        <EmptyState
          title="Belum Mengikat Hukum Semesta"
          description="Kamu harus mematri salah satu dari 15 Hukum Semesta terlebih dahulu di halaman Kultivasi untuk membuka Pohon Jurus."
          icon={<Lock size={48} />}
        />
        <div className="text-center">
          <Link href="/cultivation">
            <Button className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold">
              Buka Halaman Kultivasi <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const skillsList = skillsRes?.data?.skills || [];
  const availablePoints = skillsRes?.data?.availablePoints ?? lawData.lawSkillPoints;

  // Group skills by tier
  const tiers: Record<number, LawSkillItem[]> = {};
  skillsList.forEach((s) => {
    const t = s.tier || 1;
    if (!tiers[t]) tiers[t] = [];
    tiers[t].push(s);
  });

  const tierNames: Record<number, string> = {
    1: 'Tier 1 — Foundation (Rank 0+)',
    2: 'Tier 2 — Intermediate (Rank 2+)',
    3: 'Tier 3 — Advanced (Rank 4+)',
    4: 'Tier 4 — Master (Rank 6+)',
    5: 'Tier 5 — Pinnacle (Rank 8+)'
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="🌳 Pohon Jurus Law"
        description={`Alokasikan poin skill untuk ${lawData.lawName || 'Hukum Semesta'} dan atur loadout jurus pertarungan.`}
      />

      {/* Header: Law Info & Available Points */}
      <Card className="bg-gradient-to-r from-[#14100c] via-black to-[#14100c] border border-amber-500/30 p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-3xl shadow-xl">
              📜
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-amber-200">{lawData.lawName}</h2>
              <p className="text-sm text-stone-400 font-serif">
                {lawData.rankDisplayName} — Rank {lawData.rank} Stage {lawData.stage}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg px-4 py-2.5 text-center">
              <p className="text-xs text-stone-400 font-serif">Poin Tersedia</p>
              <p className="text-2xl font-bold font-mono text-amber-300">{availablePoints}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Combat Loadout 4+1 */}
      <Card className="bg-stone-950/80 border border-amber-500/30 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h3 className="font-serif font-bold text-base text-amber-200 flex items-center gap-2">
            <Sword className="w-5 h-5 text-amber-400" />
            Combat Loadout (4+1)
          </h3>
          <span className="text-xs text-stone-400 font-mono">
            Terpasang: <strong className="text-amber-400 font-mono">{lawData.combatLoadout?.length || 0}</strong> / 4 Jurus Aktif
          </span>
        </div>
        <p className="text-xs text-stone-500">
          Slot 1 (Wajib): Basic Attack Senjata Adaptif. Slot 2-5: Pilih jurus aktif dari pohon skill di bawah.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((slotIdx) => {
            const skillId = lawData.combatLoadout?.[slotIdx];
            const skill = skillsList.find((s) => s.skillId === skillId);
            return (
              <div
                key={slotIdx}
                className={`p-3 rounded-lg border text-center text-xs transition-all ${
                  skill
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                    : 'border-stone-800 bg-stone-900/50 text-stone-600'
                }`}
              >
                <div className="text-lg mb-1">{skill?.icon || '⬜'}</div>
                <div className="font-serif font-semibold truncate">
                  {skill?.name || `Slot ${slotIdx + 2} (Kosong)`}
                </div>
                {skill && (
                  <button
                    type="button"
                    onClick={() => handleToggleCombatLoadout(skill.skillId)}
                    className="mt-1.5 text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                  >
                    Lepas
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Skill Tree by Tier */}
      {isSkillsLoading ? (
        <LoadingState text="Memuat pohon jurus..." />
      ) : (
        <div className="space-y-6">
          {Object.keys(tiers)
            .map(Number)
            .sort()
            .map((tierNum) => {
              const tierSkills = tiers[tierNum];
              const tierLocked = (tierNum - 1) * 2 > (lawData.rank || 0);

              return (
                <Card key={tierNum} className={`border ${tierLocked ? 'border-stone-800 opacity-60' : 'border-stone-700'} bg-stone-950/70 p-5 space-y-4`}>
                  <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                    <h3 className={`font-serif font-bold text-sm flex items-center gap-2 ${tierLocked ? 'text-stone-500' : 'text-amber-200'}`}>
                      {tierLocked ? <Lock className="w-4 h-4" /> : <TreePine className="w-4 h-4 text-emerald-400" />}
                      {tierNames[tierNum] || `Tier ${tierNum}`}
                    </h3>
                    {tierLocked && (
                      <span className="text-[10px] text-stone-600 bg-stone-900 px-2 py-1 rounded font-mono">
                        Terkunci — Naik Rank untuk Membuka
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tierSkills.map((skill) => {
                      const isUnlocked = skill.isUnlocked;
                      const isEquipped = (lawData.combatLoadout || []).includes(skill.skillId);
                      const isActive = !skill.isPassive;

                      return (
                        <div
                          key={skill.skillId}
                          className={`p-3 rounded-lg border flex items-start gap-3 transition-all ${
                            isEquipped ? 'border-amber-400 bg-amber-500/10' :
                            isUnlocked ? 'border-emerald-500/50 bg-emerald-950/20' :
                            'border-stone-800 bg-black/30'
                          }`}
                        >
                          <div className={`text-2xl flex-shrink-0 p-1.5 rounded-lg border ${
                            isUnlocked ? 'bg-emerald-900/30 border-emerald-500/40' : 'bg-stone-900 border-stone-800'
                          }`}>
                            {skill.icon || '✨'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-serif font-semibold text-sm ${isUnlocked ? 'text-emerald-200' : 'text-stone-400'}`}>
                                {skill.name}
                              </span>
                              <span className="text-[10px] font-mono text-stone-500">
                                {isUnlocked ? 'Terbuka' : `Butuh Rank ${skill.requiredRank}`}
                              </span>
                              {isActive ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                                  PASSIVE
                                </span>
                              )}
                              {isEquipped && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                  EQUIPPED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{skill.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {!tierLocked && !isUnlocked && (
                                <Button
                                  size="sm"
                                  disabled={!skill.canUnlock || allocateSkillMutation.isPending}
                                  onClick={() => allocateSkillMutation.mutate(skill.skillId)}
                                  className="h-6 text-[10px] px-2 bg-emerald-600/80 hover:bg-emerald-500 text-stone-950 font-bold"
                                >
                                  Buka Jurus ({skill.skillPointCost || 1} Poin)
                                </Button>
                              )}
                              {isActive && isUnlocked && (
                                <Button
                                  size="sm"
                                  variant={isEquipped ? "outline" : "default"}
                                  onClick={() => handleToggleCombatLoadout(skill.skillId)}
                                  className={`h-6 text-[10px] px-2 ${
                                    isEquipped
                                      ? 'border-red-500/40 text-red-400 hover:bg-red-950/40'
                                      : 'bg-amber-600/80 hover:bg-amber-500 text-stone-950 font-bold'
                                  }`}
                                >
                                  {isEquipped ? '✕ Lepas Loadout' : '⚔️ Pasang Loadout'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
