'use client';

import React from 'react';
import { 
  Heart, Zap, Compass, Sparkles, Shield, Sword, Footprints, Eye, 
  Flame, Droplets, Wind, Mountain, Trees, Hammer, FlaskConical, 
  Scroll, Pickaxe, Activity, Smile
} from 'lucide-react';
import { PlayerProfile } from '@/types/game';

/**
 * Formula Kurva XP Kemahiran Kungfu (Synchronized dengan utils/kungfuMastery.js)
 * 14 * (L^2.25) + 35 * L
 * Level 1: 49 XP, Level 2: 136 XP
 * XP = 94 -> Level 1
 */
export function getKungfuLevelFromExp(rawExp: number = 0): number {
  const exp = Math.max(0, Math.floor(Number(rawExp) || 0));
  let level = 0;
  while (level < 250) {
    const nextLevel = level + 1;
    const req = Math.floor(14 * Math.pow(nextLevel, 2.25) + (35 * nextLevel));
    if (exp >= req) {
      level = nextLevel;
    } else {
      break;
    }
  }
  return level;
}

interface StatGridProps {
  player: Partial<PlayerProfile> | any;
  compact?: boolean;
  hideCombat?: boolean; // Jika true (misal pada NPC), sembunyikan stats tempur & kemahiran beladiri
}

export default function StatGrid({ player, compact = false, hideCombat = false }: StatGridProps) {
  // Extract or fallback
  const ext = player?.extendedStats || {};
  const combat = player?.combatStats || {};
  const kungfu = player?.kungfuSkills || {};
  const prof = player?.professions || {};
  const rawRoots = ext.spiritualRoot || { fire: 0, water: 0, lightning: 0, wind: 0, earth: 0, wood: 0 };
  const rawArtisan = ext.artisanship || {};

  // 1. General Values (Strictly Integers)
  const age = Math.floor(Number(player?.age) || 16);
  const maxLifespan = Math.floor(Number(ext.maxLifespan) || 100);
  const mood = Math.floor(ext.mood !== undefined ? Number(ext.mood) : 100);
  const rawHp = combat.currentHp !== undefined ? combat.currentHp : (combat.hp !== undefined ? combat.hp : 100);
  const health = Math.floor(Number(rawHp) || 0);
  const rawMaxHp = combat.maxHp !== undefined ? combat.maxHp : (combat.hp !== undefined ? combat.hp : 100);
  const maxHealth = Math.floor(Number(rawMaxHp) || 100);
  const rawStamina = player?.currentStamina !== undefined && player.currentStamina !== null ? player.currentStamina : 100;
  const stamina = Math.floor(Number(rawStamina) || 0);
  const maxStamina = 100;
  const vitality = Math.floor(Number(ext.vitality) || 100);
  const maxVitality = Math.floor(Number(ext.maxVitality) || 100);
  const energy = Math.floor(Number(ext.innerEnergy) || 100);
  const maxEnergy = Math.floor(Number(ext.maxInnerEnergy) || 100);
  const focus = Math.floor(Number(ext.focus) || 100);
  const maxFocus = Math.floor(Number(ext.maxFocus) || 100);
  const luck = Math.floor(Number(ext.luck) || 10);
  const insight = Math.floor(Number(ext.insight) || 10);

  // 2. Combat Values (Strictly Integers)
  const atk = Math.floor(Number(combat.atk) || 15);
  const def = Math.floor(Number(combat.def) || 10);
  const crit = Math.floor(Number(combat.critRate !== undefined ? combat.critRate : (ext.critRate || 5)));
  const critRes = Math.floor(Number(combat.critRes !== undefined ? combat.critRes : (ext.critResist || 0)));

  const critDmg = Math.floor(Number(combat.critDmg !== undefined ? combat.critDmg : (ext.critDmg || 150)));
  const critDr = Math.floor(Number(combat.critDr !== undefined ? combat.critDr : (ext.critDmgReduce || 0)));

  const martialRes = Math.floor(Number(combat.martialRes !== undefined ? combat.martialRes : (ext.martialRes || 0)));
  const spiritualRes = Math.floor(Number(combat.spiritualRes !== undefined ? combat.spiritualRes : (ext.spiritualRes || 0)));

  // 3. Martial Arts Values (Computed Level from XP via getKungfuLevelFromExp)
  const bladeSkill = getKungfuLevelFromExp(kungfu.saber || 0);
  const spearSkill = getKungfuLevelFromExp(kungfu.staff || 0);
  const swordSkill = getKungfuLevelFromExp(kungfu.sword || 0);
  const fistSkill = getKungfuLevelFromExp(kungfu.fist || 0);
  const palmSkill = getKungfuLevelFromExp(kungfu.special || 0);
  const fingerSkill = getKungfuLevelFromExp(kungfu.finger || 0);
  const qimenSkill = getKungfuLevelFromExp(kungfu.qimen || 0);
  const melodySkill = getKungfuLevelFromExp(kungfu.melody || 0);
  const healingSkill = getKungfuLevelFromExp(kungfu.healing || 0);
  const wineArtSkill = getKungfuLevelFromExp(kungfu.wineArt || 0);
  const hiddenWeaponSkill = getKungfuLevelFromExp(kungfu.hiddenWeapon || 0);
  const stealingSkill = getKungfuLevelFromExp(kungfu.stealing || 0);
  const coreSkill = getKungfuLevelFromExp(kungfu.core || 0);
  const forgingSkill = getKungfuLevelFromExp(kungfu.forging || 0);

  // 4. Spiritual Roots (Strictly Integers - Semua Player Start dari 0)
  const roots = {
    fire: Math.floor(Number(rawRoots.fire) || 0),
    water: Math.floor(Number(rawRoots.water) || 0),
    lightning: Math.floor(Number(rawRoots.lightning) || 0),
    wind: Math.floor(Number(rawRoots.wind) || 0),
    earth: Math.floor(Number(rawRoots.earth) || 0),
    wood: Math.floor(Number(rawRoots.wood) || 0)
  };

  // 5. Artisanship & Kemahiran Profesi (Strictly Integers - Sistem Terpadu 1-to-1)
  const artisan = {
    alchemy: Math.floor(prof.alchemy?.isUnlocked ? (prof.alchemy.level || 1) : (Number(rawArtisan.alchemy) || 1)),
    forge: Math.floor(prof.smithing?.isUnlocked ? (prof.smithing.level || 1) : (Number(rawArtisan.forge) || 1)),
    talismans: Math.floor(Number(rawArtisan.talismans) || 1),
    herbology: Math.floor(prof.farming?.isUnlocked ? (prof.farming.level || 1) : (Number(rawArtisan.herbology) || 1)),
    mining: Math.floor(prof.mining?.isUnlocked ? (prof.mining.level || 1) : (Number(rawArtisan.mining) || 1))
  };

  const headerClass = "px-3 py-1 rounded-full bg-[#1b1c24] border border-[#3e3b30] text-[#e0cfb3] text-xs font-serif font-semibold tracking-wider flex items-center justify-center gap-1.5 shadow-md mb-2.5";

  return (
    <div className={`w-full font-serif ${compact ? 'text-xs' : 'text-sm'} text-[#d1c2a5]`}>
      <div className={`grid grid-cols-1 md:grid-cols-2 ${hideCombat ? 'lg:grid-cols-3' : 'lg:grid-cols-5'} gap-3 sm:gap-4`}>
        
        {/* 1. GENERAL STATS */}
        <div className="bg-[#0e111a]/70 border border-[#2d2920] rounded-lg p-2.5 flex flex-col shadow-inner backdrop-blur-sm">
          <div className={headerClass}>
            <Activity size={13} className="text-emerald-400" />
            General
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">⏳ Lifespan</span>
              <span className="font-semibold text-amber-200">{age}/{maxLifespan}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">💛 Mood</span>
              <span className="font-semibold text-amber-200">{mood}/100</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">❤️ Health</span>
              <span className="font-semibold text-emerald-300">{health}/{maxHealth}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">💚 Stamina</span>
              <span className="font-semibold text-emerald-400">{stamina}/{maxStamina}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">💜 Vitality</span>
              <span className="font-semibold text-purple-300">{vitality}/{maxVitality}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">⚡ Energy</span>
              <span className="font-semibold text-sky-300">{energy}/{maxEnergy}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">🎯 Focus</span>
              <span className="font-semibold text-cyan-300">{focus}/{maxFocus}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">🍀 Luck</span>
              <span className="font-semibold text-amber-300">{luck}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-stone-400 flex items-center gap-1">✨ Insight</span>
              <span className="font-semibold text-yellow-300">{insight}</span>
            </div>
          </div>
        </div>

        {/* 2. COMBAT STATS (HANYA DITAMPILKAN JIKA BUKAN NPC / hideCombat === false) */}
        {!hideCombat && (
          <div className="bg-[#0e111a]/70 border border-[#2d2920] rounded-lg p-2.5 flex flex-col shadow-inner backdrop-blur-sm">
            <div className={headerClass}>
              <Sword size={13} className="text-rose-400" />
              Combat
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400">⚔️ ATK</span>
                <span className="font-semibold text-red-300">{atk}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400">🛡️ DEF</span>
                <span className="font-semibold text-blue-300">{def}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400">💥 CRIT</span>
                <span className="font-semibold text-orange-300">{crit}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400">🎯 COMBO</span>
                <span className="font-semibold text-amber-300">{combat.comboRate || 5}%</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400">🔰 CRIT RES</span>
                <span className="font-semibold text-indigo-300">{critRes}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400">🏃 SPD</span>
                <span className="font-semibold text-sky-300">{combat.spd ?? ext.spd ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400">⚡ CRIT DMG</span>
                <span className="font-semibold text-amber-300">{critDmg}%</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400">🛡️ CRIT DR</span>
                <span className="font-semibold text-slate-300">{critDr}%</span>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-stone-400">🔮 Martial/Spir RES</span>
                <span className="font-semibold text-amber-200">{martialRes} / {spiritualRes}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. MARTIAL ARTS (HANYA DITAMPILKAN JIKA BUKAN NPC / hideCombat === false) */}
        {!hideCombat && (
          <div className="bg-[#0e111a]/70 border border-[#2d2920] rounded-lg p-2.5 flex flex-col shadow-inner backdrop-blur-sm">
            <div className={headerClass}>
              <span className="text-amber-400 text-sm">🥋</span>
              Martial Arts
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">🗡️ Blade (Golok)</span>
                <span className="font-semibold text-amber-200">{bladeSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">🥢 Spear (Tongkat)</span>
                <span className="font-semibold text-amber-200">{spearSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">⚔️ Sword (Pedang)</span>
                <span className="font-semibold text-amber-200">{swordSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">👊 Fist (Tinju)</span>
                <span className="font-semibold text-amber-200">{fistSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">👆 Finger (Totokan)</span>
                <span className="font-semibold text-amber-200">{fingerSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">🌀 Special (Palm/Lainnya)</span>
                <span className="font-semibold text-amber-200">{palmSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">⚒️ Forging</span>
                <span className="font-semibold text-amber-200">{forgingSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">☯️ Qimen</span>
                <span className="font-semibold text-amber-200">{qimenSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">🎵 Melody</span>
                <span className="font-semibold text-amber-200">{melodySkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">💊 Healing</span>
                <span className="font-semibold text-amber-200">{healingSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">🍷 Wine Art</span>
                <span className="font-semibold text-amber-200">{wineArtSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">🎯 Hidden Weapon</span>
                <span className="font-semibold text-amber-200">{hiddenWeaponSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
                <span className="text-stone-400 flex items-center gap-1">🕵️ Stealing</span>
                <span className="font-semibold text-amber-200">{stealingSkill}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-stone-400 flex items-center gap-1">🧠 Core</span>
                <span className="font-semibold text-amber-200">{coreSkill}</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. SPIRITUAL ROOT */}
        <div className="bg-[#0e111a]/70 border border-[#2d2920] rounded-lg p-2.5 flex flex-col shadow-inner backdrop-blur-sm">
          <div className={headerClass}>
            <Sparkles size={13} className="text-amber-400" />
            Spiritual Root
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">🔥 Fire (Api)</span>
              <span className="font-semibold text-rose-300">{roots.fire}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">💧 Water (Air)</span>
              <span className="font-semibold text-sky-300">{roots.water}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">⚡ Lightning (Petir)</span>
              <span className="font-semibold text-yellow-300">{roots.lightning}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">🌪️ Wind (Angin)</span>
              <span className="font-semibold text-teal-300">{roots.wind}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">⛰️ Earth (Tanah)</span>
              <span className="font-semibold text-amber-300">{roots.earth}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-stone-400 flex items-center gap-1">🌲 Wood (Kayu)</span>
              <span className="font-semibold text-emerald-300">{roots.wood}</span>
            </div>
          </div>
        </div>

        {/* 5. ARTISANSHIP & KEMAHIRAN PROFESI */}
        <div className="bg-[#0e111a]/70 border border-[#2d2920] rounded-lg p-2.5 flex flex-col shadow-inner backdrop-blur-sm">
          <div className={headerClass}>
            <Hammer size={13} className="text-amber-400" />
            Artisanship & Profesi
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">⚗️ Alchemy (Alkimia)</span>
              <span className="font-semibold text-purple-300">{artisan.alchemy}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">⚒️ Forge (Tempa)</span>
              <span className="font-semibold text-orange-300">{artisan.forge}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">📜 Talismans (Jimat)</span>
              <span className="font-semibold text-yellow-300">{artisan.talismans}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">🌿 Herbology (Tani)</span>
              <span className="font-semibold text-emerald-300">{artisan.herbology}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-stone-400 flex items-center gap-1">⛏️ Mining (Tambang)</span>
              <span className="font-semibold text-stone-300">{artisan.mining}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
