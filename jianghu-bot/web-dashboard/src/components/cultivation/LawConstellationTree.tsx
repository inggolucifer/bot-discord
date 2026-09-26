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
  onAllocate: (skillId: string) => void;
  isAllocating?: boolean;
  combatLoadout?: string[];
  onToggleLoadout?: (skillId: string) => void;
}

interface NodePosition {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

export default function LawConstellationTree({
  skills,
  availablePoints,
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
        {selectedSkill && (
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
                    <span className={selectedSkill.isPassive ? 'text-blue-400' : 'text-rose-400'}>
                      {selectedSkill.isPassive ? 'Jurus Pasif' : 'Jurus Aktif'}
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

            {/* Level & Combat XP Indicator */}
            {selectedSkill.isUnlocked && (
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-2.5 mb-3 text-xs">
                <div className="flex items-center justify-between text-amber-200 font-serif font-bold mb-1">
                  <span>Tingkat Penguasaan:</span>
                  <span>Lv. {selectedSkill.level || 1} / {selectedSkill.maxLevel || 5}</span>
                </div>
                <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.floor(((selectedSkill.exp || 0) / (selectedSkill.reqExp || 10)) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-1">
                  <span>⚔️ XP Serangan Tempur Riil</span>
                  <span>{selectedSkill.exp || 0} / {selectedSkill.reqExp || 10} XP</span>
                </div>
              </div>
            )}

            {/* Combat Specs */}
            {!selectedSkill.isPassive && (
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-black/60 p-2.5 rounded-xl border border-stone-800/80 mb-3">
                <div className="text-stone-400">
                  Konsumsi: <strong className="text-stone-200">{selectedSkill.baseCost} {selectedSkill.costType}</strong>
                </div>
                <div className="text-stone-400">
                  Cooldown: <strong className="text-stone-200">{selectedSkill.cooldownTurns} Ronde</strong>
                </div>
                <div className="text-stone-400">
                  Pengganda DMG: <strong className="text-amber-400">{selectedSkill.damageMultiplier}×</strong>
                </div>
                <div className="text-stone-400">
                  Target: <strong className="text-stone-200 capitalize">{selectedSkill.targetType}</strong>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {!selectedSkill.isUnlocked ? (
                <Button
                  size="sm"
                  onClick={() => onAllocate(selectedSkill.skillId)}
                  disabled={!selectedSkill.canUnlock || isAllocating || availablePoints < (selectedSkill.skillPointCost || 1)}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-bold font-serif text-xs py-2 h-auto shadow"
                >
                  {isAllocating ? 'Mempelajari...' : `Pelajari (-${selectedSkill.skillPointCost || 1} SP)`}
                </Button>
              ) : (
                <>
                  {!selectedSkill.isPassive && onToggleLoadout && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onToggleLoadout(selectedSkill.skillId)}
                      className={`flex-1 text-xs py-2 h-auto font-serif ${
                        (combatLoadout || []).includes(selectedSkill.skillId)
                          ? 'border-rose-700 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60'
                          : 'border-amber-600 bg-amber-950/40 text-amber-200 hover:bg-amber-900/60'
                      }`}
                    >
                      {(combatLoadout || []).includes(selectedSkill.skillId) ? 'Lepas dari Loadout' : 'Pasang ke Loadout'}
                    </Button>
                  )}
                  <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1 px-3">
                    <CheckCircle2 size={14} /> Dikuasai
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
