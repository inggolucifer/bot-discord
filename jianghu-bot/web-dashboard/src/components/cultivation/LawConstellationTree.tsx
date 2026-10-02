"use client";

import React, { useState, useMemo } from 'react';
import { LawSkillItem } from '@/types/game';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Sparkles, Lock, CheckCircle2, Zap, Shield, Sword, 
  Flame, Info, ChevronRight, X, AlertTriangle 
} from 'lucide-react';

interface LawConstellationTreeProps {
  skills: LawSkillItem[];
  availablePoints: number;
  combatSignatures?: string[];
  onAllocate: (skillId: string) => void;
  isAllocating?: boolean;
  combatLoadout?: string[];
  onToggleLoadout?: (skillId: string) => void;
}

interface NodePosition {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

function formatSkillEffects(eff: Record<string, any> | undefined, curLevel: number = 1): string[] {
  if (!eff || Object.keys(eff).length === 0) return [];
  const lvl = Math.max(1, curLevel);
  const bullets: string[] = [];

  for (const [k, v] of Object.entries(eff)) {
    if (v === true) {
      if (k === 'swordOnly') bullets.push('Khusus Senjata Pedang');
      else if (k === 'homeOnly') bullets.push('Khusus di Wilayah Markas/Sekte');
      else if (k === 'boundOnly') bullets.push('Khusus saat Entitas Terikat Aktif');
      else bullets.push(`Kondisi: ${k}`);
      continue;
    }
    if (typeof v === 'number') {
      const curTotal = v * lvl;
      if (k === 'atkMult') {
        bullets.push(`+${(v * 100).toFixed(1)}% ATK per level (sekarang +${(curTotal * 100).toFixed(1)}% di Lv.${lvl})`);
      } else if (k === 'defMult') {
        bullets.push(`+${(v * 100).toFixed(1)}% DEF per level (sekarang +${(curTotal * 100).toFixed(1)}% di Lv.${lvl})`);
      } else if (k === 'hpMult') {
        bullets.push(`+${(v * 100).toFixed(1)}% Max HP per level (sekarang +${(curTotal * 100).toFixed(1)}% di Lv.${lvl})`);
      } else if (k === 'spdMult') {
        bullets.push(`+${(v * 100).toFixed(1)}% Speed per level (sekarang +${(curTotal * 100).toFixed(1)}% di Lv.${lvl})`);
      } else if (k === 'flatAtk') {
        bullets.push(`+${v} ATK flat per level (sekarang +${curTotal} di Lv.${lvl})`);
      } else if (k === 'flatDef') {
        bullets.push(`+${v} DEF flat per level (sekarang +${curTotal} di Lv.${lvl})`);
      } else if (k === 'flatHp') {
        bullets.push(`+${v} Max HP flat per level (sekarang +${curTotal} di Lv.${lvl})`);
      } else if (k === 'flatSpd') {
        bullets.push(`+${v} Speed flat per level (sekarang +${curTotal} di Lv.${lvl})`);
      } else if (k === 'crit') {
        bullets.push(`+${(v * 100).toFixed(1)}% Crit Rate per level (sekarang +${(curTotal * 100).toFixed(1)}%)`);
      } else if (k === 'spiritualRes') {
        bullets.push(`+${v} Spiritual RES per level (sekarang +${curTotal})`);
      } else if (k === 'martialRes') {
        bullets.push(`+${v} Martial RES per level (sekarang +${curTotal})`);
      } else if (k === 'burnProcStacks') {
        bullets.push(`Burn proc +${v} stacks / hit (sekarang +${curTotal} stacks)`);
      } else if (k === 'burnTickBonus') {
        bullets.push(`+${(v * 100).toFixed(1)}% Burn DoT Tick bonus`);
      } else if (k === 'venomPoisonProc') {
        bullets.push(`Venom poison proc +${v} stacks / hit (sekarang +${curTotal} stacks)`);
      } else if (k === 'chillProcChance') {
        bullets.push(`+${(v * 100).toFixed(1)}% Peluang Pembekuan (Chill proc)`);
      } else if (k === 'spdSlowOnHit') {
        bullets.push(`-${(v * 100).toFixed(1)}% SPD target saat terkena serangan`);
      } else if (k === 'poisonResist') {
        bullets.push(`+${(v * 100).toFixed(1)}% Resistensi Racun`);
      } else if (k === 'corruptionResist') {
        bullets.push(`+${(v * 100).toFixed(1)}% Resistensi Korupsi`);
      } else if (k === 'reflectPct') {
        bullets.push(`+${(v * 100).toFixed(1)}% Pantulan Kerusakan (Reflect)`);
      } else if (k === 'combatHpRegenPct') {
        bullets.push(`+${(v * 100).toFixed(1)}% Pemulihan HP Tempur tiap ronde`);
      } else if (k === 'essenceGainPct') {
        bullets.push(`+${(v * 100).toFixed(1)}% Efisiensi Serap Esensi`);
      } else if (k === 'defenseUpProcChance') {
        bullets.push(`+${(v * 100).toFixed(1)}% Peluang Pertahanan Kuat (Shield proc)`);
      } else if (k === 'swordBleedChance') {
        bullets.push(`+${(v * 100).toFixed(1)}% Peluang Pendarahan Pedang`);
      } else if (k === 'atkWantedMult') {
        bullets.push(`+${(v * 100).toFixed(1)}% ATK terhadap Buronan/Penjahat`);
      } else if (k === 'dmgVsCorrupted') {
        bullets.push(`+${(v * 100).toFixed(1)}% Kerusakan terhadap Entitas Korup`);
      } else if (k === 'lifesteal') {
        bullets.push(`+${(v * 100).toFixed(1)}% Lifesteal (Penyerapan Darah)`);
      } else if (k === 'stunChance') {
        bullets.push(`+${(v * 100).toFixed(1)}% Peluang Melumpuhkan (Stun)`);
      } else if (k === 'firstStrikeAtkPct') {
        bullets.push(`+${(v * 100).toFixed(1)}% ATK pada Serangan Ronde Pertama`);
      } else if (k === 'yangCleanseChance') {
        bullets.push(`+${(v * 100).toFixed(1)}% Peluang Menghilangkan Debuff`);
      } else if (k === 'unarmedPenaltyMitigation') {
        bullets.push(`+${(v * 100).toFixed(1)}% Mitigasi Penalti Tangan Kosong`);
      } else if (k === 'homeBonusAdd') {
        bullets.push(`+${(v * 100).toFixed(1)}% Efektivitas Pertahanan Markas`);
      } else if (k === 'cooldownRounds') {
        bullets.push(`Cooldown: ${v} Ronde`);
      } else {
        const valStr = v < 1 ? `+${(v * 100).toFixed(1)}%` : `+${v}`;
        bullets.push(`${k}: ${valStr}`);
      }
    }
  }

  return bullets;
}

export default function LawConstellationTree({
  skills,
  availablePoints,
  combatSignatures = [],
  onAllocate,
  isAllocating = false,
  combatLoadout = [],
  onToggleLoadout
}: LawConstellationTreeProps) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  // Group skills by Tier
  const tierGroups = useMemo(() => {
    const groups: Record<number, LawSkillItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    skills.forEach(s => {
      const t = Math.max(0, Math.min(4, s.tier || 0));
      if (!groups[t]) groups[t] = [];
      groups[t].push(s);
    });
    return groups;
  }, [skills]);

  // Compute node coordinates based on Tier (Y axis) and index within Tier (X axis)
  const nodePositions = useMemo(() => {
    const map: Record<string, NodePosition> = {};
    const tierY = [86, 68, 50, 32, 14]; // bottom to top

    [0, 1, 2, 3, 4].forEach(tier => {
      const tierSkills = tierGroups[tier] || [];
      const count = tierSkills.length;
      if (count === 0) return;

      tierSkills.forEach((skill, idx) => {
        // Distribute horizontally
        const xStep = 80 / (count + 1);
        const x = 10 + xStep * (idx + 1);
        map[skill.skillId] = { x, y: tierY[tier] };
      });
    });

    return map;
  }, [tierGroups]);

  // Calculate SVG lines connecting parent to child
  const connectionLines = useMemo(() => {
    const lines: Array<{
      id: string;
      from: NodePosition;
      to: NodePosition;
      isUnlocked: boolean;
      canUnlock: boolean;
    }> = [];

    skills.forEach(skill => {
      if (skill.requiredParentSkillId && nodePositions[skill.requiredParentSkillId] && nodePositions[skill.skillId]) {
        lines.push({
          id: `${skill.requiredParentSkillId}->${skill.skillId}`,
          from: nodePositions[skill.requiredParentSkillId],
          to: nodePositions[skill.skillId],
          isUnlocked: skill.isUnlocked,
          canUnlock: skill.canUnlock
        });
      }
    });

    return lines;
  }, [skills, nodePositions]);

  const selectedSkill = useMemo(() => {
    return skills.find(s => s.skillId === selectedSkillId) || null;
  }, [skills, selectedSkillId]);

  return (
    <div className="space-y-4">
      {/* Header Info & SP Budget Alert */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-950/90 border border-amber-500/30 p-4 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
            <h3 className="font-serif font-bold text-lg text-amber-200">
              Konstelasi Bintang Semesta (Dao Constellation Tree)
            </h3>
          </div>
          <p className="text-xs text-stone-400">
            Pohon percabangan esoteris Wuxia. Alokasikan Poin Skill untuk membuka jurus aktif dan pasif alam semesta.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-black/60 border border-amber-500/40 px-3.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-stone-400 block font-sans uppercase">Sisa Poin Skill</span>
            <strong className="text-amber-300 font-mono text-base">{availablePoints} SP</strong>
          </div>
        </div>
      </div>

      {/* Active Dao Combat Signatures Badges */}
      {combatSignatures && combatSignatures.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-stone-950/80 border border-amber-500/20 shadow-md">
          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Zap size={12} className="text-amber-400" /> Resonansi Dao Tempur:
          </span>
          {combatSignatures.map((sig) => {
            const labels: Record<string, { label: string; color: string; icon: string }> = {
              combatHpRegen: { label: 'Regen Darah', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40', icon: '🌿' },
              burnProc: { label: 'Api Bakar', color: 'text-orange-300 border-orange-500/40 bg-orange-950/40', icon: '🔥' },
              chillProc: { label: 'Hawa Beku', color: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40', icon: '❄️' },
              defenseUpProc: { label: 'Pertahanan', color: 'text-blue-300 border-blue-500/40 bg-blue-950/40', icon: '🛡️' },
              firstStrike: { label: 'Serangan Kilat', color: 'text-sky-300 border-sky-500/40 bg-sky-950/40', icon: '⚡' },
              stunProc: { label: 'Totokan Lumpuh', color: 'text-yellow-300 border-yellow-500/40 bg-yellow-950/40', icon: '⚡' },
              lifesteal: { label: 'Hisap Darah', color: 'text-red-300 border-red-500/40 bg-red-950/40', icon: '🩸' },
              injuryResist: { label: 'Tahan Cedera', color: 'text-amber-300 border-amber-500/40 bg-amber-950/40', icon: '🧘' },
              venomPoisonProc: { label: 'Racun Korosif', color: 'text-lime-300 border-lime-500/40 bg-lime-950/40', icon: '🧪' },
              yangCleanse: { label: 'Pembersih Yang', color: 'text-amber-200 border-amber-400/40 bg-amber-950/40', icon: '☀️' },
              swordBleed: { label: 'Pendarahan Pedang', color: 'text-rose-300 border-rose-500/40 bg-rose-950/40', icon: '🗡️' },
              reflect: { label: 'Pantulan Karma', color: 'text-purple-300 border-purple-500/40 bg-purple-950/40', icon: '🪞' },
              abyssalCurseResist: { label: 'Kebal Kutukan Abyss', color: 'text-violet-300 border-violet-500/40 bg-violet-950/40', icon: '👁️' },
              netherZone: { label: 'Kekuatan Nether', color: 'text-indigo-300 border-indigo-500/40 bg-indigo-950/40', icon: '🌌' },
              corruptionToDef: { label: 'Pertahanan Keruh', color: 'text-stone-300 border-stone-500/40 bg-stone-900/60', icon: '🌑' },
              guSignature: { label: 'Resonansi Gu', color: 'text-green-300 border-green-500/40 bg-green-950/40', icon: '🐛' },
              artifactInfusion: { label: 'Infusi Artefak', color: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40', icon: '💎' },
              beastHeal: { label: 'Pemulihan Roh', color: 'text-teal-300 border-teal-500/40 bg-teal-950/40', icon: '🐾' }
            };
            const info = labels[sig] || { label: sig, color: 'text-stone-300 border-stone-700 bg-stone-900', icon: '✨' };
            return (
              <span
                key={sig}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono border ${info.color} shadow-sm`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Specialization Warning Notice */}
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-600/40 text-[11px] text-amber-300 font-sans">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Hukum Pembatasan Takdir:</strong> Total poin skill kultivator dibatasi secara permanen (~105 SP). Kamu hanya dapat memaksimalkan ~50% dari pohon bintang semesta. Tentukan spesialisasi jalur tempurmu (Serangan, Pertahanan, atau Domain) dengan bijak!
        </span>
      </div>

      {/* Interactive Constellation Canvas */}
      <div className="relative w-full h-[520px] sm:h-[600px] rounded-3xl border border-stone-800 bg-gradient-to-b from-[#090d16] via-black to-[#05070d] overflow-hidden shadow-2xl">
        {/* Background Space & Constellation Star Dust */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-transparent to-black pointer-events-none" />
        
        {/* SVG Bezier Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="unlockedLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="availableLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {connectionLines.map(line => {
            const strokeColor = line.isUnlocked 
              ? 'url(#unlockedLine)' 
              : line.canUnlock 
              ? 'url(#availableLine)' 
              : '#374151';
            const strokeWidth = line.isUnlocked ? 2.5 : line.canUnlock ? 2 : 1.2;
            const strokeDash = line.isUnlocked ? 'none' : line.canUnlock ? '4,4' : '3,3';

            return (
              <line
                key={line.id}
                x1={`${line.from.x}%`}
                y1={`${line.from.y}%`}
                x2={`${line.to.x}%`}
                y2={`${line.to.y}%`}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDash}
                className={line.canUnlock ? 'animate-pulse' : ''}
              />
            );
          })}
        </svg>

        {/* Tier Horizontal Guidelines / Atmosphere Badges */}
        <div className="absolute inset-y-0 left-3 flex flex-col justify-between py-6 pointer-events-none z-0 text-[10px] font-mono text-stone-600">
          <span>TIER 4: AVATAR AGUNG</span>
          <span>TIER 3: DOMAIN SEMESTA</span>
          <span>TIER 2: ILMU MENDALAM</span>
          <span>TIER 1: JURUS SPESIALISASI</span>
          <span>TIER 0: FONDASI LAW</span>
        </div>

        {/* Constellation Star Nodes */}
        <div className="absolute inset-0 z-20">
          {skills.map(skill => {
            const pos = nodePositions[skill.skillId] || { x: 50, y: 50 };
            const isSelected = selectedSkillId === skill.skillId;
            const isEquippedInLoadout = (combatLoadout || []).includes(skill.skillId);

            return (
              <button
                key={skill.skillId}
                onClick={() => setSelectedSkillId(skill.skillId)}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 focus:outline-none ${
                  isSelected ? 'scale-125 z-40' : 'hover:scale-115 z-30'
                }`}
              >
                {/* Outer Glow Halo for Unlocked / Available Nodes */}
                {skill.isUnlocked && (
                  <div className="absolute -inset-2 rounded-full bg-amber-500/30 blur-[6px] animate-pulse" />
                )}
                {skill.canUnlock && (
                  <div className="absolute -inset-2 rounded-full bg-cyan-500/30 blur-[6px] animate-pulse" />
                )}

                {/* Node Disc */}
                <div
                  className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border-2 transition-all shadow-xl ${
                    skill.isUnlocked
                      ? 'bg-gradient-to-br from-amber-900/90 to-black border-amber-400 text-amber-200 shadow-amber-500/40'
                      : skill.canUnlock
                      ? 'bg-gradient-to-br from-cyan-950/90 to-black border-cyan-400 text-cyan-200 shadow-cyan-500/30'
                      : 'bg-stone-950/80 border-stone-800 text-stone-600 opacity-60'
                  } ${isSelected ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-black' : ''}`}
                >
                  <span className="text-lg sm:text-xl drop-shadow">
                    {skill.icon || (skill.isPassive ? '🛡️' : '⚔️')}
                  </span>

                  {/* Status Indicator Icon */}
                  <div className="absolute -top-1.5 -right-1.5 rounded-full p-0.5 shadow">
                    {skill.isUnlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 bg-black rounded-full" />
                    ) : skill.canUnlock ? (
                      <span className="w-3.5 h-3.5 flex items-center justify-center bg-cyan-500 text-stone-950 rounded-full text-[8px] font-mono font-bold">
                        {skill.skillPointCost || 1}
                      </span>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-stone-500 bg-black rounded-full" />
                    )}
                  </div>

                  {/* Loadout Equip Badge */}
                  {isEquippedInLoadout && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white font-mono text-[8px] font-bold px-1 rounded shadow">
                      AKTIF
                    </div>
                  )}
                </div>

                {/* Node Name Tooltip on Hover */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 rounded bg-black/90 border border-stone-800 text-[10px] text-stone-300 font-serif whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                  {skill.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Floating Detail Panel (When a Node is Selected) */}
        {selectedSkill && (() => {
          const rawLevel = Number(selectedSkill.level ?? (selectedSkill as any).currentLevel ?? (selectedSkill.isUnlocked ? 1 : 0));
          const maxLevel = selectedSkill.maxLevel || 5;
          const costPerLevel = selectedSkill.costPerLevel || selectedSkill.skillPointCost || 1;
          const effType = selectedSkill.effectType || (selectedSkill.isPassive ? 'passive' : 'combat_proc');
          const isPassiveOrSystem = effType === 'passive' || effType === 'system';
          const isCombatEquippable = effType === 'combat_proc';
          const eff = selectedSkill.effects || {};

          // Dynamic Type Label
          const typeLabel = effType === 'passive'
            ? 'Pasif'
            : effType === 'combat_proc'
            ? 'Proc Tempur'
            : effType === 'system'
            ? 'Sistem'
            : 'Jurus Aktif';

          const typeColorClass = effType === 'passive'
            ? 'text-blue-400'
            : effType === 'combat_proc'
            ? 'text-rose-400'
            : effType === 'system'
            ? 'text-emerald-400'
            : 'text-amber-400';

          // Konsumsi
          let consumptionText = '—';
          if (effType === 'combat_proc') {
            if (eff.combatQiCost) {
              consumptionText = `${eff.combatQiCost} Combat Qi`;
            } else {
              consumptionText = 'Proc on hit';
            }
          } else if (!isPassiveOrSystem && selectedSkill.baseCost && selectedSkill.baseCost > 0) {
            consumptionText = `${selectedSkill.baseCost} ${selectedSkill.costType}`;
          }

          // Pengganda DMG
          let dmgMultiplierText = '—';
          const dmgParts: string[] = [];
          if (eff.atkMult) {
            const curAtk = (Number(eff.atkMult) * 100 * Math.max(1, rawLevel)).toFixed(1);
            dmgParts.push(`+${curAtk}% ATK`);
          }
          if (eff.flatAtk) {
            const curFlat = Number(eff.flatAtk) * Math.max(1, rawLevel);
            dmgParts.push(`+${curFlat} flat`);
          }
          if (eff.firstStrikeAtkPct) {
            dmgParts.push(`+${(Number(eff.firstStrikeAtkPct) * 100).toFixed(1)}% 1st`);
          }
          if (dmgParts.length > 0) {
            dmgMultiplierText = dmgParts.join(' / ');
          } else if (selectedSkill.damageMultiplier && selectedSkill.damageMultiplier > 0) {
            dmgMultiplierText = `${selectedSkill.damageMultiplier}×`;
          }

          // Cooldown
          let cooldownText = '—';
          if (eff.cooldownRounds) {
            cooldownText = `${eff.cooldownRounds} Ronde`;
          } else if (selectedSkill.cooldownTurns && selectedSkill.cooldownTurns > 0) {
            cooldownText = `${selectedSkill.cooldownTurns} Ronde`;
          }

          // Target
          let targetText = 'Diri';
          if (eff.homeOnly) {
            targetText = 'Kondisional (Markas)';
          } else if (eff.swordOnly) {
            targetText = 'Kondisional (Pedang)';
          } else if (eff.atkWantedMult) {
            targetText = 'Kondisional (Buronan)';
          } else if (effType === 'combat_proc') {
            targetText = 'Musuh';
          } else if (selectedSkill.targetType) {
            targetText = selectedSkill.targetType;
          }

          // Effects bullets
          const effectBullets = formatSkillEffects(eff, rawLevel);

          // Can upgrade check
          const isMax = rawLevel >= maxLevel;
          const canUpgrade = selectedSkill.canUpgrade ?? (
            !isMax &&
            !selectedSkill.lockedReason &&
            availablePoints >= costPerLevel
          );

          return (
            <div className="absolute bottom-4 right-4 z-50 w-80 sm:w-96 bg-stone-950/95 border-2 border-amber-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-start justify-between border-b border-stone-800 pb-2.5 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-1.5 rounded-xl bg-black border border-stone-800">
                    {selectedSkill.icon}
                  </span>
                  <div>
                    <h4 className="font-serif font-bold text-sm sm:text-base text-amber-200">
                      {selectedSkill.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400 mt-0.5">
                      <span>Tier {selectedSkill.tier}</span>
                      <span>•</span>
                      <span className={typeColorClass}>
                        {typeLabel}
                      </span>
                      {selectedSkill.element && (
                        <>
                          <span>•</span>
                          <span className="text-yellow-400">{selectedSkill.element}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSkillId(null)}
                  className="text-stone-500 hover:text-stone-300 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed font-sans mb-3">
                {selectedSkill.description}
              </p>

              {/* Level & SP Progression Indicator (Replacing fake XP) */}
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-2.5 mb-3 text-xs">
                <div className="flex items-center justify-between text-amber-200 font-serif font-bold mb-1">
                  <span>Tingkat Penguasaan SP:</span>
                  <span className="font-mono text-amber-300">
                    Lv. {rawLevel} / {maxLevel}
                  </span>
                </div>
                <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.floor((rawLevel / maxLevel) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-1">
                  <span>✨ Biaya: {costPerLevel} SP</span>
                  <span>{isMax ? 'Maksimal' : rawLevel === 0 ? 'Belum Dipelajari' : `${rawLevel}/${maxLevel} Tahap`}</span>
                </div>
              </div>

              {/* Dynamic Combat Specs */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-black/60 p-2.5 rounded-xl border border-stone-800/80 mb-3">
                <div className="text-stone-400">
                  Konsumsi: <strong className="text-stone-200">{consumptionText}</strong>
                </div>
                <div className="text-stone-400">
                  Cooldown: <strong className="text-stone-200">{cooldownText}</strong>
                </div>
                <div className="text-stone-400">
                  Pengganda DMG: <strong className="text-amber-400">{dmgMultiplierText}</strong>
                </div>
                <div className="text-stone-400">
                  Target: <strong className="text-stone-200 capitalize">{targetText}</strong>
                </div>
              </div>

              {/* Real Human-Readable Effects List */}
              {effectBullets.length > 0 && (
                <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-2.5 mb-3 text-xs">
                  <div className="text-[11px] font-serif font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>Efek Bintang Semesta:</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-stone-300 font-mono">
                    {effectBullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span className="leading-snug">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Locked Reason Notice */}
              {!isMax && selectedSkill.lockedReason && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/50 border border-amber-600/40 text-amber-300 text-xs mb-3 font-sans">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  <span>
                    {selectedSkill.lockedReason === 'need_sp' && 'Poin Skill (SP) tidak mencukupi.'}
                    {selectedSkill.lockedReason === 'need_rank' && 'Tingkat kultivasi (Rank Law) belum mencukupi.'}
                    {selectedSkill.lockedReason === 'need_parent' && 'Syarat node sebelumnya belum dipelajari.'}
                    {selectedSkill.lockedReason === 'branch_locked' && 'Jalur cabang terkunci karena telah memilih cabang lain.'}
                    {selectedSkill.lockedReason === 'max_level' && 'Tingkat penguasaan telah maksimal.'}
                    {!['need_sp', 'need_rank', 'need_parent', 'branch_locked', 'max_level'].includes(selectedSkill.lockedReason) && selectedSkill.lockedReason}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {rawLevel === 0 ? (
                  <Button
                    size="sm"
                    onClick={() => onAllocate(selectedSkill.skillId)}
                    disabled={!canUpgrade || isAllocating}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-bold font-serif text-xs py-2 h-auto shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAllocating ? 'Mempelajari...' : selectedSkill.lockedReason === 'branch_locked' ? 'Cabang Terkunci' : selectedSkill.lockedReason === 'need_rank' ? 'Rank Belum Cukup' : selectedSkill.lockedReason === 'need_parent' ? 'Node Terkunci' : selectedSkill.lockedReason === 'need_sp' || availablePoints < costPerLevel ? 'SP Kurang' : `Pelajari (-${costPerLevel} SP)`}
                  </Button>
                ) : (
                  <>
                    {!isMax && (
                      <Button
                        size="sm"
                        onClick={() => onAllocate(selectedSkill.skillId)}
                        disabled={!canUpgrade || isAllocating}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-bold font-serif text-xs py-2 h-auto shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAllocating ? 'Meningkatkan...' : availablePoints < costPerLevel ? 'SP Kurang' : `Tingkatkan Lv.${rawLevel + 1} (-${costPerLevel} SP)`}
                      </Button>
                    )}
                    {isCombatEquippable && onToggleLoadout ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggleLoadout(selectedSkill.skillId)}
                        className={`text-xs py-2 h-auto font-serif ${
                          (combatLoadout || []).includes(selectedSkill.skillId)
                            ? 'border-rose-700 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60'
                            : 'border-amber-600 bg-amber-950/40 text-amber-200 hover:bg-amber-900/60'
                        }`}
                      >
                        {(combatLoadout || []).includes(selectedSkill.skillId) ? 'Lepas Loadout' : 'Pasang Loadout'}
                      </Button>
                    ) : (
                      <span className="text-[10px] text-stone-500 font-mono italic px-1">
                        {isPassiveOrSystem ? 'Pasif Otomatis' : ''}
                      </span>
                    )}
                    <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1 px-2 whitespace-nowrap">
                      <CheckCircle2 size={14} /> Dikuasai
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
