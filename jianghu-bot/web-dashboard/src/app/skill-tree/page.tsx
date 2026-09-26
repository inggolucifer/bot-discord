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
import { getKungfuLevel, getKungfuBonusSummary, KUNGFU_SKILLS_META } from '@/lib/kungfu';
import {
  Sparkles, Lock, CheckCircle2, ChevronRight, Shield,
  Sword, Flame, Zap, BookOpen, TreePine
} from 'lucide-react';
import Link from 'next/link';
import LawConstellationTree from '@/components/cultivation/LawConstellationTree';

export default function SkillTreePage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'constellation' | 'grid'>('constellation');

  // Fetch Law Status
  const { data: statusRes, isLoading: isStatusLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['lawStatus'],
    queryFn: async () => {
      const { data } = await api.get('/cultivation/law/status');
      return data;
    }
  });

  const lawData = statusRes?.data;

  // Fetch Player Profile (for Ordinary Cultivator martial arts & manuals)
  const { data: profileRes, isLoading: isProfileLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['playerProfile'],
    queryFn: async () => {
      const { data } = await api.get('/player/profile');
      return data;
    },
    enabled: !!lawData?.isNormalCultivator
  });
  const profile = profileRes?.data;

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

  if (lawData?.isNormalCultivator) {
    const kungfuSkills = profile?.kungfuSkills || {};
    const disciplines = [
      { key: 'sword', ...KUNGFU_SKILLS_META.sword },
      { key: 'saber', ...KUNGFU_SKILLS_META.saber },
      { key: 'staff', ...KUNGFU_SKILLS_META.staff },
      { key: 'fist', ...KUNGFU_SKILLS_META.fist },
      { key: 'finger', ...KUNGFU_SKILLS_META.finger },
      { key: 'hiddenWeapon', ...KUNGFU_SKILLS_META.hiddenWeapon }
    ];
    const manuals = profile?.manuals || [];

    return (
      <div className="space-y-6">
        <PageHeader
          title="🥋 Pohon Kemahiran Beladiri & Manual Jianghu"
          description="Jalur Kultivator Biasa: Kuasai 6 Disiplin Beladiri dan pelajari Kitab Manual esoteris tanpa belenggu Hukum Semesta."
        />

        {/* Banner Jalur Biasa */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-stone-700 bg-gradient-to-r from-stone-900/90 via-[#0c0f17]/95 to-stone-950/95 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-stone-800/80 border border-stone-600 flex items-center justify-center text-3xl shadow-inner shrink-0">
                🥋
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold font-serif text-amber-200">
                    Pendekar Jalur Biasa (Mortal Martial Master)
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 border border-stone-600 text-stone-300 font-mono">
                    Dao Fana Murni
                  </span>
                </div>
                <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
                  Dantianmu bebas dari ikatan tunggal satu elemen semesta. Tingkatkan kemahiran senjatamu melalui pertarungan nyata dan pelajari kitab manual dari sekte atau gua kuno.
                </p>
              </div>
            </div>

            <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 text-right">
              <span className="text-[11px] text-amber-400/90 font-mono block">Penyesuaian Stat Tempur</span>
              <span className="text-sm font-bold text-stone-200 font-serif">× 0.95 (Efektivitas Tempur)</span>
            </div>
          </div>
        </div>

        {/* 6 Disiplin Beladiri Jianghu */}
        <div>
          <h3 className="text-lg font-serif font-bold text-amber-100 mb-3 flex items-center gap-2">
            <Sword className="w-5 h-5 text-amber-400" />
            6 Disiplin Beladiri Jianghu
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {disciplines.map((disc) => {
              const rawExp = kungfuSkills[disc.key] || 0;
              const { level, rankTitle, rankColor, progressPercent, expIntoCurrentLevel, expNeededForNextLevel } = getKungfuLevel(rawExp);
              const bonusDesc = getKungfuBonusSummary(disc.key, level);

              return (
                <div
                  key={disc.key}
                  className="rounded-xl border border-stone-800 bg-[#0f131c]/90 p-4 space-y-3 hover:border-amber-500/40 transition-colors shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-2 rounded-lg bg-black/60 border border-stone-800">
                        {disc.icon}
                      </span>
                      <div>
                        <h4 className="font-serif font-bold text-sm text-stone-200">{disc.name}</h4>
                        <span className="text-[10px] font-mono" style={{ color: rankColor }}>
                          {rankTitle}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300">
                      Lv. {level}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                      <span>EXP: {expIntoCurrentLevel} / {expNeededForNextLevel}</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-400 leading-tight border-t border-stone-900 pt-2">
                    💡 <strong className="text-amber-300">{bonusDesc}</strong>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kitab Manual yang Dipelajari */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif font-bold text-amber-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              Kitab Manual Teknik Dipelajari ({manuals.length} Kitab)
            </h3>
            <Link href="/character">
              <Button size="sm" variant="outline" className="border-stone-700 text-stone-300 text-xs hover:border-amber-400">
                Kelola Peralatan & Kitab ➔
              </Button>
            </Link>
          </div>

          {manuals.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-stone-800 bg-[#0f131c]/60 space-y-3">
              <div className="text-4xl">📜</div>
              <h5 className="font-serif font-bold text-stone-300 text-sm">
                Belum Mempelajari Kitab Manual Apapun
              </h5>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                Kitab Manual dapat diperoleh dari perpustakaan sekte, labirin gua kuno, hadiah misi Tianji, atau membelinya dari pasar Jianghu. Gunakan kitab di tas untuk mempelajarinya.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {manuals.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-stone-800 bg-[#0f131c]/90 p-4 space-y-2 hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-amber-200">
                      {m.manualId?.name || m.name || `Kitab Esoteris #${idx + 1}`}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-400 font-mono">
                      Tier {m.tier || m.manualId?.tier || 1}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 line-clamp-2">
                    {m.manualId?.description || 'Kitab jurus teknik rahasia dunia persilatan.'}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono pt-2 border-t border-stone-900">
                    <span>Pemahaman: {m.masteryLevel || 1}</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Aktif
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

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
      <Card className="bg-stone-950/80 border border-amber-500/40 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h3 className="font-serif font-bold text-base text-amber-200 flex items-center gap-2">
            <Sword className="w-5 h-5 text-amber-400" />
            Combat Loadout Terpadu (4 Jurus Law + 1 Basic Attack Senjata)
          </h3>
          <span className="text-xs text-stone-400 font-mono">
            Jurus Law: <strong className="text-amber-400 font-mono">{lawData.combatLoadout?.length || 0}</strong> / 4 Terpasang
          </span>
        </div>
        <p className="text-xs text-stone-400">
          Slot 1 otomatis memuat Serangan Beladiri Dasar sesuai senjata yang kamu gunakan di tas. Slot 2–5 memuat jurus aktif dari Pohon Law di bawah.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1">
          {/* Slot 1: Basic Attack Senjata Adaptif */}
          <div className="p-3 rounded-lg border border-amber-500/60 bg-gradient-to-b from-amber-950/30 to-black text-center text-xs shadow-md">
            <div className="text-xl mb-1">⚔️</div>
            <div className="font-serif font-bold text-amber-300 truncate">
              Basic Attack Senjata
            </div>
            <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              SLOT 1 • WAJIB
            </span>
          </div>

          {/* Slots 2 - 5: 4 Active Skills */}
          {[0, 1, 2, 3].map((slotIdx) => {
            const skillId = lawData.combatLoadout?.[slotIdx];
            const skill = skillsList.find((s) => s.skillId === skillId);
            return (
              <div
                key={slotIdx}
                className={`p-3 rounded-lg border text-center text-xs transition-all ${
                  skill
                    ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-950/30 to-black text-emerald-200 shadow-md'
                    : 'border-stone-800 bg-stone-900/40 text-stone-600'
                }`}
              >
                <div className="text-xl mb-1">{skill?.icon || '⬜'}</div>
                <div className="font-serif font-semibold truncate">
                  {skill?.name || `Slot ${slotIdx + 2} (Kosong)`}
                </div>
                {skill ? (
                  <button
                    type="button"
                    onClick={() => handleToggleCombatLoadout(skill.skillId)}
                    className="mt-1 text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                  >
                    Lepas
                  </button>
                ) : (
                  <span className="text-[10px] text-stone-600 block mt-1 font-mono">
                    Slot {slotIdx + 2}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* View Mode Toggle: Constellation vs Grid */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <h3 className="font-serif font-bold text-base text-amber-200">
          Struktur Cabang Pohon Jurus
        </h3>
        <div className="flex items-center gap-1.5 bg-stone-900/90 p-1 rounded-xl border border-stone-800">
          <button
            type="button"
            onClick={() => setViewMode('constellation')}
            className={`px-3 py-1 rounded-lg text-xs font-serif font-bold transition-all ${
              viewMode === 'constellation'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            ✨ Konstelasi Bintang (SVG)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-lg text-xs font-serif font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            📜 Tampilan Grid Tier
          </button>
        </div>
      </div>

      {isSkillsLoading ? (
        <LoadingState text="Memuat pohon jurus..." />
      ) : viewMode === 'constellation' ? (
        <LawConstellationTree
          skills={skillsList}
          availablePoints={availablePoints}
          onAllocate={(skillId) => allocateSkillMutation.mutate(skillId)}
          isAllocating={allocateSkillMutation.isPending}
          combatLoadout={lawData.combatLoadout || []}
          onToggleLoadout={handleToggleCombatLoadout}
        />
      ) : (
        <div className="space-y-6">
          {Object.keys(tiers)
            .map(Number)
            .sort()
            .map((tierNum, idx) => {
              const tierSkills = tiers[tierNum];
              const tierLocked = (tierNum - 1) * 2 > (lawData.rank || 0);

              return (
                <div key={tierNum} className="space-y-4">
                  {/* Flow Conduit between Tiers */}
                  {idx > 0 && (
                    <div className="flex items-center justify-center my-[-8px] relative z-10">
                      <div className="px-3 py-1 rounded-full bg-stone-900/90 border border-amber-500/40 flex items-center gap-1.5 text-amber-400 text-xs font-serif shadow-lg">
                        <span>↓ Terobosan Jalur Dao ↓</span>
                      </div>
                    </div>
                  )}

                  <Card className={`border ${tierLocked ? 'border-stone-800 opacity-60' : 'border-stone-700 hover:border-amber-500/50'} bg-stone-950/70 p-5 space-y-4 transition-colors`}>
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                      <h3 className={`font-serif font-bold text-sm sm:text-base flex items-center gap-2 ${tierLocked ? 'text-stone-500' : 'text-amber-200'}`}>
                        {tierLocked ? <Lock className="w-4 h-4 text-stone-500" /> : <TreePine className="w-4 h-4 text-emerald-400" />}
                        {tierNames[tierNum] || `Tier ${tierNum}`}
                      </h3>
                      {tierLocked && (
                        <span className="text-[10px] text-stone-600 bg-stone-900 px-2 py-1 rounded font-mono">
                          Terkunci — Butuh Rank {(tierNum - 1) * 2}
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
                            className={`p-3.5 rounded-lg border flex items-start gap-3 transition-all ${
                              isEquipped ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]' :
                              isUnlocked ? 'border-emerald-500/50 bg-emerald-950/20' :
                              'border-stone-800 bg-black/30'
                            }`}
                          >
                            <div className={`text-2xl flex-shrink-0 p-2 rounded-lg border ${
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
                              <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">{skill.description}</p>
                              <div className="flex items-center gap-2 mt-2.5">
                                {!tierLocked && !isUnlocked && (
                                  <Button
                                    size="sm"
                                    disabled={!skill.canUnlock || allocateSkillMutation.isPending}
                                    onClick={() => allocateSkillMutation.mutate(skill.skillId)}
                                    className="h-7 text-xs px-2.5 bg-emerald-600/80 hover:bg-emerald-500 text-stone-950 font-bold"
                                  >
                                    Buka Jurus ({skill.skillPointCost || 1} Poin)
                                  </Button>
                                )}
                                {isActive && isUnlocked && (
                                  <Button
                                    size="sm"
                                    variant={isEquipped ? "outline" : "default"}
                                    onClick={() => handleToggleCombatLoadout(skill.skillId)}
                                    className={`h-7 text-xs px-2.5 ${
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
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
