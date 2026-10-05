"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

export interface EligibleInventoryItem {
  inventoryId?: string;
  itemId: string;
  name: string;
  emoji?: string;
  description?: string;
  quantity: number;
  tier: number;
  playerTier: number;
  tags?: string[];
  category?: string;
  efficiency: number;
  allowed: boolean;
  lockedReason?: string | null;
  reason?: string | null;
}

interface LawInventoryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  purpose: string;
  lawType?: string | null;
  title: string;
  description?: string;
  actionLabel?: string;
  onSelect: (item: EligibleInventoryItem) => void;
  isPending?: boolean;
}

export default function LawInventoryPicker({
  isOpen,
  onClose,
  purpose,
  lawType,
  title,
  description,
  actionLabel = 'Pilih',
  onSelect,
  isPending = false
}: LawInventoryPickerProps) {
  const { data: eligibleRes, isLoading, isError } = useQuery<{
    success: boolean;
    data: {
      purpose: string;
      playerTier: number;
      lawType: string;
      items: EligibleInventoryItem[];
    };
  }>({
    queryKey: ['law-eligible', purpose, lawType],
    queryFn: async () => {
      const { data } = await api.get('/cultivation/law/inventory/eligible', {
        params: { purpose, lawType }
      });
      return data;
    },
    enabled: isOpen
  });

  const items = eligibleRes?.data?.items || [];
  const playerTier = eligibleRes?.data?.playerTier || 1;

  const getEmptyAdvice = () => {
    switch (purpose) {
      case 'gu_feed':
        return 'Kumpulkan larva serangga tanah, madu ratu, daging monster, atau bahan pakan di alam liar. Pastikan item bertag gu_food / material esensi, atau gunakan opsi Tetes Darah Sendiri.';
      case 'essence_absorb':
        return 'Kumpulkan herba spiritual, kristal esensi, atau bahan alkimia di alam bebas. Pastikan item bertag esensi selaras.';
      case 'beast_feed':
        return 'Kumpulkan daging monster segar, ikan roh dari danau, atau ransum bergizi (tag: beast_food, meat).';
      case 'natal_infuse':
      case 'artifact_infuse':
        return 'Tambang mineral spiritual, bijih besi di tebing batu, atau beli batu asah di pandai besi kota (tag: ore, whetstone, mineral).';
      case 'element_absorb':
        return 'Kumpulkan herba berunsur elemen selaras atau intisari kristal spiritual di alam liar (tag: catalyst, essence elemen).';
      case 'turbid_absorb':
      case 'demonic_absorb':
        return 'Buru siluman liar dan monster buas di peta dunia atau labirin gua kuno untuk memanen intinya (tag: beast_core, turbid_core).';
      case 'blood_absorb':
        return 'Kalahkan musuh bandit atau kultivator lawan untuk memanen botol darah esensi (tag: blood_vial, blood).';
      case 'nether_absorb':
        return 'Eksplorasi wilayah makam kuno atau jurang kematian untuk menambang batu berhawa Yin (tag: yin_stone, nether).';
      case 'tribute_absorb':
        return 'Kumpulkan botol darah, inti siluman, atau batu obsidian berhawa kematian untuk dipersembahkan di altar (tag: abyssal, obsidian).';
      case 'venom_absorb':
        return 'Racik ramuan beracun di meja Alkimia atau buru monster rawa berbisa untuk mengumpulkan bisanya (tag: venom_sac, poison).';
      case 'bt_pill':
      case 'breakthrough_mini':
        return 'Racik pil penerobosan di Balai Alkimia atau peroleh dari hadiah gelanggang dan bos dunia.';
      default:
        return `Aktivitas [${purpose}]: Pastikan item di tas memiliki tag yang selaras (seperti material esensi atau tag khusus ${purpose}).`;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
    >
      <div className="space-y-3 p-1 text-stone-200 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {description && (
          <div className="p-2.5 rounded bg-amber-950/20 border border-amber-600/30 text-xs text-stone-300 leading-relaxed">
            {description}
          </div>
        )}

        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3 text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-xs font-mono">Memeriksa tas inventori kultivator...</span>
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-xs text-rose-400 space-y-2 border border-rose-900/50 rounded-lg bg-rose-950/20">
            <p className="font-semibold">Gagal memuat item dari tas inventori</p>
            <p className="text-[11px] text-stone-400">Periksa koneksi atau coba beberapa saat lagi.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400 space-y-2 border border-dashed border-stone-800 rounded-lg">
            <span className="text-3xl block">🎒</span>
            <p className="font-semibold text-stone-300">Tidak ada Item yang Memenuhi Syarat di Tas</p>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              {getEmptyAdvice()}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const itemTier = item.tier || 1;
              const isLocked = !item.allowed;
              const isOptimal = item.efficiency >= 1.0;
              const effPercent = Math.round(item.efficiency * 100);

              return (
                <div
                  key={item.inventoryId || item.itemId}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    isLocked
                      ? 'border-stone-800/80 bg-stone-950/40 opacity-60'
                      : 'border-stone-800 bg-stone-900/70 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl p-2 rounded bg-stone-950/60 border border-stone-800 shrink-0">
                      {item.emoji || '✨'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-serif font-bold text-xs text-stone-200 flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{item.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 shrink-0">
                          Tier {itemTier} • x{item.quantity}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                      {isLocked ? (
                        <span className="text-[9px] font-mono text-rose-400 font-bold block mt-0.5">
                          🔒 {item.lockedReason || item.reason || `Ditolak Dantian (Item Tier ${itemTier} > Ranahmu Tier ${playerTier})`}
                        </span>
                      ) : isOptimal ? (
                        <span className="text-[9px] font-mono text-emerald-400 font-bold block mt-0.5">
                          ⭐ Efisiensi Optimal 100%
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-amber-400 font-bold block mt-0.5">
                          ⚠️ Efisiensi ~{effPercent}% (Tier {itemTier} di bawah Ranah {playerTier})
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={isLocked || isPending}
                    title={isLocked ? (item.reason || 'Di atas ranah') : undefined}
                    onClick={() => {
                      if (!isLocked) onSelect(item);
                    }}
                    className={`text-xs py-1 px-3 h-auto whitespace-nowrap font-bold shrink-0 ${
                      isLocked
                        ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/50'
                        : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                    }`}
                  >
                    {isLocked ? 'Di atas Ranah' : actionLabel}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
