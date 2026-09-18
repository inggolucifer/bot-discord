'use client';

import React from 'react';
import { 
  Heart, Zap, Compass, Sparkles, Shield, Sword, Footprints, Eye, 
  Flame, Droplets, Wind, Mountain, Trees, Hammer, FlaskConical, 
  Scroll, Pickaxe, Activity, Smile
} from 'lucide-react';
import { PlayerProfile } from '@/types/game';

interface StatGridProps {
  player: Partial<PlayerProfile> | any;
  compact?: boolean;
}

export default function StatGrid({ player, compact = false }: StatGridProps) {
  // Extract or fallback
  const ext = player?.extendedStats || {};
  const combat = player?.combatStats || {};
  const kungfu = player?.kungfuSkills || {};
  const roots = ext.spiritualRoot || { fire: 10, water: 10, lightning: 10, wind: 10, earth: 10, wood: 10 };
  const artisan = ext.artisanship || { alchemy: 5, forge: 5, fengShui: 5, talismans: 5, herbology: 5, mining: 5 };

  // General values
  const age = player?.age || 16;
  const maxLifespan = ext.maxLifespan || 100;
  const mood = ext.mood !== undefined ? ext.mood : 100;
  const health = combat.currentHp !== undefined ? combat.currentHp : (combat.hp || 100);
  const maxHealth = combat.maxHp || combat.hp || 100;
  const stamina = player?.currentStamina !== undefined && player.currentStamina !== null ? player.currentStamina : 100;
  const maxStamina = 100;
  const vitality = ext.vitality || 100;
  const maxVitality = ext.maxVitality || 100;
  const energy = ext.innerEnergy || 100;
  const maxEnergy = ext.maxInnerEnergy || 100;
  const focus = ext.focus || 100;
  const maxFocus = ext.maxFocus || 100;
  const luck = ext.luck || 10;
  const insight = ext.insight || 10;

  // Combat values
  const atk = combat.atk || 15;
  const def = combat.def || 10;
  const crit = combat.critRate !== undefined ? combat.critRate : (ext.critRate || 5);
  const critRes = combat.critRes !== undefined ? combat.critRes : (ext.critResist || 0);
  const agility = combat.agility !== undefined ? combat.agility : (ext.agility || combat.spd || 10);
  const critDmg = combat.critDmg !== undefined ? combat.critDmg : (ext.critDmg || 150);
  const critDr = combat.critDr !== undefined ? combat.critDr : (ext.critDmgReduce || 0);
  const travelSpeed = combat.travelSpeed !== undefined ? combat.travelSpeed : (ext.travelSpeed || 100);
  const martialRes = combat.martialRes !== undefined ? combat.martialRes : (ext.martialRes || 0);
  const spiritualRes = combat.spiritualRes !== undefined ? combat.spiritualRes : (ext.spiritualRes || 0);

  // Martial Arts values (from kungfuSkills)
  const bladeSkill = kungfu.saber || 0;
  const spearSkill = kungfu.staff || 0;
  const swordSkill = kungfu.sword || 0;
  const fistSkill = kungfu.fist || 0;
  const palmSkill = kungfu.special || 0;
  const fingerSkill = kungfu.finger || 0;

  const headerClass = "px-3 py-1 rounded-full bg-[#1b1c24] border border-[#3e3b30] text-[#e0cfb3] text-xs font-serif font-semibold tracking-wider flex items-center justify-center gap-1.5 shadow-md mb-2.5";

  return (
    <div className={`w-full font-serif ${compact ? 'text-xs' : 'text-sm'} text-[#d1c2a5]`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
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

        {/* 2. COMBAT STATS */}
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
              <span className="text-stone-400">🔰 CRIT RES</span>
              <span className="font-semibold text-indigo-300">{critRes}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400">🏃 Agility</span>
              <span className="font-semibold text-sky-300">{agility}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400">⚡ CRIT DMG</span>
              <span className="font-semibold text-amber-300">{critDmg}%</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400">🛡️ CRIT DR</span>
              <span className="font-semibold text-slate-300">{critDr}%</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400">👟 Travel Speed</span>
              <span className="font-semibold text-amber-200">{travelSpeed}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-stone-400">🔮 Martial/Spir RES</span>
              <span className="font-semibold text-amber-200">{martialRes} / {spiritualRes}</span>
            </div>
          </div>
        </div>

        {/* 3. MARTIAL ARTS */}
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
              <span className="text-stone-400 flex items-center gap-1">🖐️ Palm (Telapak)</span>
              <span className="font-semibold text-amber-200">{palmSkill}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-stone-400 flex items-center gap-1">👆 Finger (Totokan)</span>
              <span className="font-semibold text-amber-200">{fingerSkill}</span>
            </div>
          </div>
        </div>

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

        {/* 5. ARTISANSHIP */}
        <div className="bg-[#0e111a]/70 border border-[#2d2920] rounded-lg p-2.5 flex flex-col shadow-inner backdrop-blur-sm">
          <div className={headerClass}>
            <Hammer size={13} className="text-amber-400" />
            Artisanship
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">⚗️ Alchemy</span>
              <span className="font-semibold text-purple-300">{artisan.alchemy}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">⚒️ Forge (Tempa)</span>
              <span className="font-semibold text-orange-300">{artisan.forge}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">🧭 Feng Shui</span>
              <span className="font-semibold text-sky-300">{artisan.fengShui}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">📜 Talismans</span>
              <span className="font-semibold text-yellow-300">{artisan.talismans}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-[#1f222d]">
              <span className="text-stone-400 flex items-center gap-1">🌿 Herbology</span>
              <span className="font-semibold text-emerald-300">{artisan.herbology}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-stone-400 flex items-center gap-1">⛏️ Mining</span>
              <span className="font-semibold text-stone-300">{artisan.mining}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
