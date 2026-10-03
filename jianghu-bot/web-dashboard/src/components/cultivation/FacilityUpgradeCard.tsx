"use client";

import React from 'react';
import { Button } from '@/components/ui/Button';
import { LawStatusData, FacilityUpgradeQuote } from '@/types/game';
import { Sparkles, AlertCircle, CheckCircle2, XCircle, Coins, Hammer, ArrowUpCircle } from 'lucide-react';

interface FacilityUpgradeCardProps {
  facilityType: 'body_cauldron' | 'gu_crucible' | 'abyssal_altar' | 'formation_hub';
  lawData?: LawStatusData;
  playerCurrency?: {
    gold?: number;
    silver?: number;
    copper?: number;
    jade?: number;
    spirit?: number;
  };
  onUpgrade: (facilityType: string) => void;
  isPending: boolean;
  className?: string;
  customDescription?: string;
}

const FACILITY_FALLBACKS: Record<string, { name: string; icon: string; maxTier: number; desc: string; color: string; border: string; bg: string }> = {
  body_cauldron: {
    name: 'Kuali Bak Mandi Raga',
    icon: '🛁',
    maxTier: 4,
    desc: 'Wadah perendaman herbal & intisari alam untuk penempaan 9 bagian raga vajra.',
    color: 'text-amber-300',
    border: 'border-amber-600/30',
    bg: 'bg-amber-950/20'
  },
  gu_crucible: {
    name: 'Kendi Penyuling Gu Purba',
    icon: '🏺',
    maxTier: 4,
    desc: 'Menentukan batas maksimal mutasi tier cacing Gu dan peluang sintesis fusi aperture batin.',
    color: 'text-emerald-300',
    border: 'border-emerald-600/30',
    bg: 'bg-emerald-950/20'
  },
  abyssal_altar: {
    name: 'Altar Kurban Darah Abyss',
    icon: '🩸',
    maxTier: 3,
    desc: 'Altar persembahan kurban darah untuk memperkuat ikatan kontrak iblis jurang kegelapan.',
    color: 'text-purple-300',
    border: 'border-purple-600/30',
    bg: 'bg-purple-950/20'
  },
  formation_hub: {
    name: 'Hub Formasi Bendera',
    icon: '🚩',
    maxTier: 3,
    desc: 'Pusat matriks formasi segel spiritual sembilan penjuru di atas kavling peta dunia.',
    color: 'text-sky-300',
    border: 'border-sky-600/30',
    bg: 'bg-sky-950/20'
  }
};

export default function FacilityUpgradeCard({
  facilityType,
  lawData,
  playerCurrency,
  onUpgrade,
  isPending,
  className = '',
  customDescription
}: FacilityUpgradeCardProps) {
  const meta = FACILITY_FALLBACKS[facilityType] || {
    name: 'Fasilitas Kultivasi',
    icon: '🏛️',
    maxTier: 4,
    desc: 'Fasilitas penunjang jalur hukum alam semesta.',
    color: 'text-amber-300',
    border: 'border-stone-800',
    bg: 'bg-stone-900/40'
  };

  const quote: FacilityUpgradeQuote | undefined = lawData?.facilities?.upgrades?.[facilityType];

  const currentTier = quote?.currentTier ?? (
    facilityType === 'body_cauldron' ? (lawData?.facilities?.bodyCauldronTier ?? 0) :
    facilityType === 'gu_crucible' ? (lawData?.facilities?.guCrucibleTier ?? 1) :
    facilityType === 'abyssal_altar' ? (lawData?.facilities?.abyssalAltarTier ?? 0) :
    (lawData?.facilities?.formationHubTier ?? 0)
  );

  const maxTier = quote?.maxTier ?? meta.maxTier;
  const isMaxTier = quote?.isMaxTier ?? (currentTier >= maxTier);
  const nextTier = quote?.nextTier ?? (isMaxTier ? currentTier : currentTier + 1);

  // Player Currency Formatted
  const gold = Math.floor(Number(playerCurrency?.gold) || 0);
  const silver = Math.floor(Number(playerCurrency?.silver) || 0);
  const copper = Math.floor(Number(playerCurrency?.copper) || 0);

  // Fallback checks if quote not yet populated
  const canAfford = quote ? quote.canAfford : true;
  const hasMaterials = quote ? quote.hasMaterials : true;
  const materials = quote?.materials || [];
  const costSilver = quote?.costSilver ?? 0;
  const costFormatted = quote?.costFormatted ?? `${costSilver * 100} Copper`;

  const isBuilt = currentTier > 0;
  const buttonLabel = isPending
    ? 'Memproses...'
    : isBuilt
      ? `⬆️ Upgrade ke Tier ${nextTier}`
      : `🔨 Dirikan ${meta.name}`;

  return (
    <div className={`p-3.5 rounded-xl border ${meta.border} ${meta.bg} backdrop-blur-sm space-y-3 ${className}`}>
      {/* Header Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">{quote?.icon || meta.icon}</span>
            <span className={`font-serif font-bold text-sm ${meta.color}`}>
              {quote?.facilityName || meta.name}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-900/80 border border-stone-700/60 text-stone-200">
              {isBuilt ? `Tier ${currentTier} / Max ${maxTier}` : `Belum Dibuat / Max ${maxTier}`}
            </span>
            {quote?.requiresMapTile && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                📍 Butuh Lahan Peta
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            {customDescription || meta.desc}
          </p>
        </div>
      </div>

      {/* Upgrade Requirements & Cost Breakdown */}
      {isMaxTier ? (
        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Fasilitas telah mencapai tingkat maksimal (Tier {maxTier}). Manfaat fasilitas bekerja optimal.</span>
        </div>
      ) : (
        <div className="space-y-2 pt-1 border-t border-stone-800/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-serif font-semibold text-stone-300 flex items-center gap-1.5">
              <span>📋</span> Biaya Upgrade ke <strong className="text-amber-300 font-mono">Tier {nextTier}</strong>:
            </span>
            {/* Saldo Status Badge */}
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-1 ${
              canAfford && hasMaterials
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/70 border-red-500/40 text-red-300'
            }`}>
              {canAfford && hasMaterials ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Siap Upgrade</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-red-400" />
                  <span>Syarat Belum Cukup</span>
                </>
              )}
            </span>
          </div>

          {/* List of Costs */}
          <div className="bg-black/50 p-2.5 rounded-lg border border-stone-800/80 space-y-1.5 text-xs">
            {/* Silver Cost */}
            <div className="flex items-center justify-between">
              <span className="text-stone-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-slate-300" />
                <span>Biaya Perak:</span>
                <strong className="text-slate-100 font-mono">{costSilver} Silver</strong>
                <span className="text-[10px] text-stone-500 font-mono">(≈ {costFormatted})</span>
              </span>
              <span className={`text-[11px] font-mono ${canAfford ? 'text-emerald-400 font-semibold' : 'text-red-400'}`}>
                {canAfford ? '✅ Saldo Cukup' : '❌ Saldo Kurang'}
              </span>
            </div>

            {/* Materials List */}
            {materials.length > 0 ? (
              <div className="space-y-1 pt-1 border-t border-stone-800/50">
                <span className="text-[10px] text-stone-400 block font-serif">Bahan Material yang Dibutuhkan:</span>
                {materials.map((mat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] pl-2">
                    <span className="text-stone-300 flex items-center gap-1.5">
                      <span className="text-stone-500">•</span>
                      <span>{mat.requiredQty}× {mat.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        (Tersedia: <strong className={mat.hasEnough ? 'text-emerald-300' : 'text-red-400'}>{mat.availableQty}</strong>)
                      </span>
                    </span>
                    <span className={`text-[10px] font-mono ${mat.hasEnough ? 'text-emerald-400' : 'text-red-400'}`}>
                      {mat.hasEnough ? '✅ Cukup' : '❌ Kurang'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-stone-400 pt-0.5 italic pl-2">
                • Tidak memerlukan bahan material tambahan.
              </div>
            )}
          </div>

          {/* Saldo Ringkas & Hint */}
          <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 font-mono">
            <span className="flex items-center gap-1.5">
              <span>Saldo Pemain:</span>
              <strong className="text-yellow-400">{gold}G</strong>
              <span>·</span>
              <strong className="text-slate-200">{silver}S</strong>
              <span>·</span>
              <strong className="text-amber-500">{copper}C</strong>
            </span>
            <span
              className="text-[10px] text-stone-400 cursor-help underline decoration-dotted"
              title="Sistem pembayaran otomatis mengonversi koin: 100 Copper = 1 Silver, 100 Silver = 1 Gold. Pembayaran tidak akan gagal selama total kekayaan mencukupi."
            >
              ℹ️ Auto-convert 100:1
            </span>
          </div>

          {/* Action Button */}
          <div className="pt-1">
            <Button
              size="sm"
              onClick={() => onUpgrade(facilityType)}
              disabled={isPending || !canAfford || !hasMaterials}
              className={`w-full font-bold text-xs py-2 h-auto shadow transition-all duration-200 ${
                !canAfford || !hasMaterials
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  : facilityType === 'body_cauldron'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 border border-amber-400/50'
                    : facilityType === 'gu_crucible'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 border border-emerald-400/50'
                      : facilityType === 'abyssal_altar'
                        ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-400/50'
                        : 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-stone-950 border border-sky-400/50'
              }`}
            >
              {buttonLabel}
            </Button>
            {(!canAfford || !hasMaterials) && (
              <p className="text-[10px] text-amber-400/80 text-center mt-1">
                {!canAfford && !hasMaterials
                  ? '⚠️ Saldo perak setara dan bahan material belum mencukupi.'
                  : !canAfford
                    ? '⚠️ Saldo mata uang (setara perak) belum mencukupi.'
                    : '⚠️ Bahan material di dalam tas inventori belum mencukupi.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
