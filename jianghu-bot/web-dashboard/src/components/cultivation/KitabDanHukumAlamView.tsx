"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  BookOpen, Zap, Trash2, Shield, Flame, Sparkles, 
  AlertTriangle, CheckCircle2, Swords, Info, Loader2,
  ChevronRight, RefreshCw, Layers, Award
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ManualTechnique {
  manualId: string;
  name: string;
  icon: string;
  tier: number;
  level: number;
  exp: number;
  reqExp: number;
  maxLevel: number;
  type: string;
  element: string;
  description: string;
  basePower: number;
  qiCost: number;
}

interface LawSkillTechnique {
  skillId: string;
  name: string;
  icon: string;
  tier: number;
  level: number;
  exp: number;
  reqExp: number;
  maxLevel: number;
  type: string;
  element: string;
  description: string;
  basePower: number;
  qiCost: number;
  isEquipped: boolean;
}

interface TechniquesData {
  core: number;
  currentManualCount: number;
  maxManualCapacity: number;
  manuals: ManualTechnique[];
  lawSkills: LawSkillTechnique[];
  combatLoadout: string[];
}

interface KitabDanHukumAlamViewProps {
  onRefresh?: () => void;
}

export default function KitabDanHukumAlamView({ onRefresh }: KitabDanHukumAlamViewProps) {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<'all' | 'manuals' | 'law' | 'loadout'>('all');
  const [manualToForget, setManualToForget] = useState<ManualTechnique | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Fetch Techniques Data
  const { data: techniquesRes, isLoading, refetch } = useQuery<{ success: boolean; data: TechniquesData }>({
    queryKey: ['myTechniques'],
    queryFn: async () => {
      const { data } = await api.get('/manuals/my-techniques');
      return data;
    }
  });

  const techData = techniquesRes?.data;

  // Mutation: Forget Manual
  const forgetMutation = useMutation({
    mutationFn: async (manualId: string) => {
      const { data } = await api.post('/manuals/forget', { manualId });
      return data;
    },
    onSuccess: (res) => {
      setNoticeMessage(res.message || 'Manual berhasil dilupakan.');
      setManualToForget(null);
      queryClient.invalidateQueries({ queryKey: ['myTechniques'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      if (onRefresh) onRefresh();
      setTimeout(() => setNoticeMessage(null), 4000);
    },
    onError: (err: any) => {
      setNoticeMessage(err.response?.data?.error || 'Gagal melupakan manual.');
      setTimeout(() => setNoticeMessage(null), 4000);
    }
  });

  // Mutation: Save Loadout
  const loadoutMutation = useMutation({
    mutationFn: async (newLoadout: string[]) => {
      const { data } = await api.post('/manuals/loadout', { combatLoadout: newLoadout });
      return data;
    },
    onSuccess: (res) => {
      setNoticeMessage(res.message || 'Loadout tempur diperbarui.');
      queryClient.invalidateQueries({ queryKey: ['myTechniques'] });
      setTimeout(() => setNoticeMessage(null), 3000);
    },
    onError: (err: any) => {
      setNoticeMessage(err.response?.data?.error || 'Gagal memperbarui loadout.');
      setTimeout(() => setNoticeMessage(null), 3000);
    }
  });

  const handleToggleLoadout = (skillId: string) => {
    if (!techData) return;
    const current = techData.combatLoadout || [];
    let updated: string[];

    if (current.includes(skillId)) {
      updated = current.filter(id => id !== skillId);
    } else {
      if (current.length >= 4) {
        setNoticeMessage('Maksimal 4 jurus aktif di loadout tempur! Lepaskan salah satu jurus terlebih dahulu.');
        setTimeout(() => setNoticeMessage(null), 3500);
        return;
      }
      updated = [...current, skillId];
    }
    loadoutMutation.mutate(updated);
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'border-stone-600 text-stone-300 bg-stone-900/60';
      case 2: return 'border-emerald-600 text-emerald-300 bg-emerald-950/40';
      case 3: return 'border-cyan-600 text-cyan-300 bg-cyan-950/40';
      case 4: return 'border-purple-600 text-purple-300 bg-purple-950/40';
      case 5: return 'border-amber-500 text-amber-300 bg-amber-950/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
      default: return 'border-stone-700 text-stone-300 bg-stone-900/40';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="font-serif text-sm">Menelaah Kitab & Hukum Alam...</span>
      </div>
    );
  }

  const manuals = techData?.manuals || [];
  const lawSkills = techData?.lawSkills || [];
  const coreVal = techData?.core || 0;
  const currentCount = techData?.currentManualCount || 0;
  const maxCapacity = techData?.maxManualCapacity || 4;
  const capacityPercent = Math.min(100, Math.floor((currentCount / maxCapacity) * 100));

  return (
    <div className="space-y-4 text-stone-200">
      {/* NOTICE TOAST */}
      {noticeMessage && (
        <div className="bg-amber-950/90 border border-amber-500/70 text-amber-200 px-4 py-2.5 rounded-xl text-xs font-serif flex items-center justify-between shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button onClick={() => setNoticeMessage(null)} className="text-stone-400 hover:text-white ml-2">×</button>
        </div>
      )}

      {/* CORE STAT & MANUAL CAPACITY BANNER */}
      <div className="bg-gradient-to-r from-[#17141f] via-[#1a1c29] to-[#121520] border-2 border-amber-600/50 rounded-2xl p-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h3 className="font-serif font-bold text-base text-amber-200 tracking-wide">
                Kapasitas Pemahaman Kitab & Hukum Alam
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-1 max-w-xl">
              Kapasitas dasar <strong className="text-amber-300">4 Manual</strong>. Setiap 5 poin stat <strong className="text-amber-300">Core</strong> menambah <strong className="text-amber-300">+1 Slot</strong>. Jurus pohon Law tidak memakan kuota manual.
            </p>
          </div>

          {/* Core Stat Badge */}
          <div className="flex items-center gap-3 shrink-0 bg-black/60 px-3.5 py-2 rounded-xl border border-amber-500/40">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-stone-400 font-mono block">STAT CORE SAAT INI</span>
              <span className="text-sm font-bold text-amber-300 font-mono">
                {coreVal} Core <span className="text-[10px] text-stone-500 font-normal">(+⌊{coreVal}/5⌋ Slot = +{Math.floor(coreVal / 5)})</span>
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar Kapasitas */}
        <div className="mt-3.5 pt-3 border-t border-stone-800/80">
          <div className="flex justify-between items-center text-xs font-mono mb-1.5">
            <span className="text-stone-300 font-serif flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Kuota Kitab Manual Luar
            </span>
            <span className={currentCount >= maxCapacity ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>
              {currentCount} / {maxCapacity} Manual {currentCount >= maxCapacity ? '(PENUH)' : ''}
            </span>
          </div>

          <div className="w-full bg-black/80 rounded-full h-2.5 overflow-hidden border border-stone-800 shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                currentCount >= maxCapacity 
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                  : 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-500 font-mono mt-1.5">
            <span>✨ Stat Core bertambah +1 setiap kali ada manual/skill naik level di pertarungan riil.</span>
            <span>Sisa Slot Bebas: {Math.max(0, maxCapacity - currentCount)}</span>
          </div>
        </div>
      </div>

      {/* FILTER TABS & ACTIONS */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('all')}
            className={`text-xs px-3 py-1.5 h-auto font-serif ${
              activeFilter === 'all' 
                ? 'bg-amber-600 text-stone-950 font-bold' 
                : 'border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Semua ({manuals.length + lawSkills.length})
          </Button>

          <Button
            size="sm"
            variant={activeFilter === 'manuals' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('manuals')}
            className={`text-xs px-3 py-1.5 h-auto font-serif ${
              activeFilter === 'manuals' 
                ? 'bg-amber-600 text-stone-950 font-bold' 
                : 'border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Kitab Manual Luar ({manuals.length})
          </Button>

          <Button
            size="sm"
            variant={activeFilter === 'law' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('law')}
            className={`text-xs px-3 py-1.5 h-auto font-serif ${
              activeFilter === 'law' 
                ? 'bg-amber-600 text-stone-950 font-bold' 
                : 'border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Jurus Hukum Semesta ({lawSkills.length})
          </Button>

          <Button
            size="sm"
            variant={activeFilter === 'loadout' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('loadout')}
            className={`text-xs px-3 py-1.5 h-auto font-serif ${
              activeFilter === 'loadout' 
                ? 'bg-amber-600 text-stone-950 font-bold' 
                : 'border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            Loadout Tempur ({techData?.combatLoadout?.length || 0}/4)
          </Button>
        </div>

        <button
          onClick={() => refetch()}
          className="text-stone-400 hover:text-amber-300 p-1.5 text-xs flex items-center gap-1 transition-colors"
          title="Segarkan Data"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Segarkan
        </button>
      </div>

      {/* COMBAT LOADOUT PREVIEW SECTION */}
      {(activeFilter === 'all' || activeFilter === 'loadout') && (
        <div className="bg-[#10131d] border border-amber-900/40 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-serif font-bold text-xs text-amber-300 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-rose-400" />
              Bar Jurus Tempur Aktif (Maksimal 4 Slot)
            </h4>
            <span className="text-[10px] text-stone-400 font-mono">
              Slot 1: Basic Attack Senjata (Adaptif) | Slot 2–5: Jurus Pilihanmu
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((slotIdx) => {
              const skillId = techData?.combatLoadout?.[slotIdx];
              const matchedSkill = skillId 
                ? lawSkills.find(s => s.skillId === skillId) || manuals.find(m => m.manualId === skillId)
                : null;

              return (
                <div 
                  key={slotIdx}
                  className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${
                    matchedSkill
                      ? 'border-amber-500/50 bg-amber-950/20 text-stone-200'
                      : 'border-dashed border-stone-800 bg-stone-950/40 text-stone-600'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-black border border-stone-800 flex items-center justify-center text-sm shrink-0">
                    {matchedSkill?.icon || (slotIdx + 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-stone-500 block font-mono">Slot {slotIdx + 1}</span>
                    <span className="text-xs font-serif font-bold text-amber-200 truncate block">
                      {matchedSkill?.name || 'Kosong'}
                    </span>
                  </div>
                  {matchedSkill && (
                    <button
                      onClick={() => handleToggleLoadout(skillId!)}
                      className="text-stone-500 hover:text-rose-400 p-1 text-xs"
                      title="Lepas dari Loadout"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 1: EXTERNAL MANUALS (KITAB MANUAL LUAR) */}
      {(activeFilter === 'all' || activeFilter === 'manuals') && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-sm text-amber-300 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Kitab Manual Luar yang Dikuasai ({manuals.length} / {maxCapacity})
            </h4>
            <span className="text-[10px] text-stone-500 font-mono">
              Membutuhkan Slot Kapasitas Pemahaman
            </span>
          </div>

          {manuals.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-stone-800 rounded-xl bg-stone-950/40 text-stone-500 text-xs font-serif">
              Belum ada kitab manual luar yang dipelajari. Gunakan kitab manual dari tas inventori untuk mulai membaca dan memahami jurus.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {manuals.map((m) => {
                const tierClass = getTierColor(m.tier);
                const expPercent = Math.min(100, Math.floor((m.exp / (m.reqExp || 10)) * 100));

                return (
                  <div 
                    key={m.manualId}
                    className="p-3.5 rounded-xl border border-stone-800/80 bg-gradient-to-b from-[#141824] to-[#0e111a] hover:border-amber-600/50 transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-10 h-10 rounded-lg bg-black border border-stone-800 flex items-center justify-center text-xl shrink-0">
                            {m.icon || '📜'}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${tierClass}`}>
                                Tier {m.tier}
                              </span>
                              <span className="text-[10px] font-mono text-cyan-400 capitalize">
                                {m.element || 'Netral'}
                              </span>
                            </div>
                            <h5 className="font-serif font-bold text-sm text-amber-200 mt-0.5">
                              {m.name}
                            </h5>
                          </div>
                        </div>

                        {/* Tombol Lupakan Manual */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setManualToForget(m)}
                          className="text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 p-1.5 h-auto text-xs shrink-0"
                          title="Lupakan Manual (Kosongkan Slot)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <p className="text-xs text-stone-400 line-clamp-2 font-sans mb-3">
                        {m.description || 'Kitab manual warisan ilmu beladiri Jianghu.'}
                      </p>
                    </div>

                    {/* Progress Level & Attack XP Tempur */}
                    <div className="pt-2 border-t border-stone-800/80 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-amber-400 font-bold font-serif">
                          Tingkat Lv. {m.level} / {m.maxLevel}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {m.exp} / {m.reqExp} XP Serangan
                        </span>
                      </div>

                      <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-stone-800">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-300"
                          style={{ width: `${expPercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-stone-500 font-mono">
                        <span>⚔️ Naikkan level via serangan di combat asli</span>
                        <span>Power: {m.basePower + (m.level - 1) * 5} • Qi: {m.qiCost}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: LAW CONSTELLATION SKILLS */}
      {(activeFilter === 'all' || activeFilter === 'law') && (
        <div className="space-y-2.5 pt-2 border-t border-stone-800/80">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-sm text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              Jurus Bawaan Hukum Semesta / Law ({lawSkills.length})
            </h4>
            <span className="text-[10px] text-emerald-400 font-mono">
              🛡️ Bebas Kuota (Tidak Memakan Kapasitas Manual)
            </span>
          </div>

          {lawSkills.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-stone-800 rounded-xl bg-stone-950/40 text-stone-500 text-xs font-serif">
              Belum ada jurus Law yang dipelajari. Buka tab Hukum Semesta (Law Cultivation) untuk mengalokasikan Skill Point (SP) ke pohon jurus.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lawSkills.map((s) => {
                const tierClass = getTierColor(s.tier);
                const expPercent = Math.min(100, Math.floor((s.exp / (s.reqExp || 10)) * 100));

                return (
                  <div 
                    key={s.skillId}
                    className="p-3.5 rounded-xl border border-stone-800/80 bg-gradient-to-b from-[#111726] to-[#0c101a] hover:border-cyan-600/50 transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-10 h-10 rounded-lg bg-black border border-stone-800 flex items-center justify-center text-xl shrink-0">
                            {s.icon || '✨'}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${tierClass}`}>
                                Tier {s.tier}
                              </span>
                              <span className={s.type === 'passive' ? 'text-[10px] text-blue-400' : 'text-[10px] text-rose-400'}>
                                {s.type === 'passive' ? 'Pasif' : 'Aktif'}
                              </span>
                              {s.element && (
                                <span className="text-[10px] font-mono text-yellow-400">
                                  {s.element}
                                </span>
                              )}
                            </div>
                            <h5 className="font-serif font-bold text-sm text-cyan-200 mt-0.5">
                              {s.name}
                            </h5>
                          </div>
                        </div>

                        {/* Tombol Toggle Loadout Tempur */}
                        {s.type !== 'passive' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleLoadout(s.skillId)}
                            className={`text-[10px] px-2.5 py-1 h-auto font-serif shrink-0 ${
                              s.isEquipped
                                ? 'border-rose-600 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60'
                                : 'border-amber-600/70 bg-amber-950/40 text-amber-200 hover:bg-amber-900/60'
                            }`}
                          >
                            {s.isEquipped ? 'Lepas Loadout' : '+ Pasang'}
                          </Button>
                        )}
                      </div>

                      <p className="text-xs text-stone-400 line-clamp-2 font-sans mb-3">
                        {s.description || 'Jurus esoteris warisan Hukum Alam Semesta.'}
                      </p>
                    </div>

                    {/* Progress Level & Attack XP Tempur */}
                    <div className="pt-2 border-t border-stone-800/80 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-cyan-400 font-bold font-serif">
                          Tingkat Lv. {s.level} / {s.maxLevel}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {s.exp} / {s.reqExp} XP Serangan
                        </span>
                      </div>

                      <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-stone-800">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-blue-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${expPercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-stone-500 font-mono">
                        <span>⚔️ Naikkan level via serangan di combat asli</span>
                        <span>Power: {s.basePower} • Qi: {s.qiCost}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL KONFIRMASI LUPAKAN MANUAL */}
      {manualToForget && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#12141f] border-2 border-rose-600/70 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-serif font-bold text-base">Konfirmasi Lupakan Manual</h4>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              Apakah kamu yakin ingin melupakan kitab <strong className="text-amber-300">[{manualToForget.name}]</strong>?
              <br /><br />
              <span className="text-stone-400">
                Dengan melupakan teknik ini, 1 slot kapasitas pemahaman akan dikosongkan. Jika ingin mempelajarinya kembali di masa depan, kamu harus menggunakan kitab manual yang bersangkutan lagi dari inventori.
              </span>
            </p>

            <div className="flex items-center gap-2.5 pt-2 border-t border-stone-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualToForget(null)}
                className="flex-1 border-stone-700 text-stone-300 hover:bg-stone-800 text-xs py-2 h-auto"
              >
                Batal
              </Button>

              <Button
                variant="destructive"
                size="sm"
                disabled={forgetMutation.isPending}
                onClick={() => forgetMutation.mutate(manualToForget.manualId)}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold font-serif text-xs py-2 h-auto"
              >
                {forgetMutation.isPending ? 'Melupakan...' : 'Ya, Lupakan Teknik'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
