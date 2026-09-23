'use client';

import React, { useState } from 'react';
import { PlayerProfile, InventoryItem } from '@/types/game';
import api from '@/lib/api';
import { 
  ShieldAlert, Sparkles, AlertCircle, Heart, Zap, RefreshCw, 
  Droplet, Flame, Snowflake, Skull, Wine, Shield, Wind, Crosshair,
  CheckCircle2, AlertTriangle, ArrowUpRight, HelpCircle
} from 'lucide-react';

interface ConditionTabProps {
  player: PlayerProfile | any;
  onRefresh?: () => void;
}

interface ConditionMeta {
  key: string;
  name: string;
  icon: string;
  color: string;
  barColor: string;
  badgeActiveColor: string;
  summary: string;
  combatEffect: string;
  systemEffect: string;
  elementSynergy: string;
  cureHint: string;
  cureItemKeywords: string[];
}

const CONDITIONS_CONFIG: ConditionMeta[] = [
  {
    key: 'poison',
    name: 'Racun (Poison)',
    icon: '☠️',
    color: 'text-emerald-400',
    barColor: 'from-emerald-600 to-green-400',
    badgeActiveColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/70',
    summary: 'Racun menyengat meridian darah.',
    combatEffect: 'Kehilangan HP saat menyerang / berpindah. Standby / Diam (defend) aman tanpa luka racun.',
    systemEffect: 'Kehilangan HP per petak langkah saat menjelajah peta dunia.',
    elementSynergy: 'Dapat dinetralkan herba dan pil detoks.',
    cureHint: 'Pil Penawar Racun, Herba Detoks, Istirahat.',
    cureItemKeywords: ['penawar', 'antidote', 'detoks', 'racun']
  },
  {
    key: 'injury',
    name: 'Luka Dalam (Injury)',
    icon: '🩹',
    color: 'text-amber-400',
    barColor: 'from-amber-600 to-yellow-400',
    badgeActiveColor: 'bg-amber-950/80 text-amber-300 border-amber-500/70',
    summary: 'Kerusakan meridian dantian dan jaringan organ dalam.',
    combatEffect: 'Mereduksi ATK dan DEF hingga -45% dan memotong batas Max MP/Qi.',
    systemEffect: 'Pemulihan stamina dan peredaran Qi internal terhambat.',
    elementSynergy: 'Memerlukan salep emas atau meditasi pemulihan meridian.',
    cureHint: 'Salep Jin Chuang, Pil Pemulih Meridian, Meditasi Balai Obat.',
    cureItemKeywords: ['jin chuang', 'jinchuang', 'meridian', 'luka dalam', 'injury']
  },
  {
    key: 'bleed',
    name: 'Pendarahan (Bleed)',
    icon: '🩸',
    color: 'text-rose-400',
    barColor: 'from-rose-600 to-red-400',
    badgeActiveColor: 'bg-rose-950/80 text-rose-300 border-rose-500/70',
    summary: 'Luka sobek senjata mengucurkan darah segar.',
    combatEffect: 'Kehilangan HP per ronde, mereda secara alami setiap giliran (-10).',
    systemEffect: 'Darah membeku dan pendarahan perlahan menutup seiring waktu.',
    elementSynergy: 'Dapat segera dibalut perban atau dibekukan.',
    cureHint: 'Perban Sutra, Bubuk Penghenti Darah (Stop Bleed).',
    cureItemKeywords: ['perban', 'bandage', 'darah', 'bleed', 'pendarahan']
  },
  {
    key: 'intox',
    name: 'Mabuk Arak (Intox)',
    icon: '🍶',
    color: 'text-purple-400',
    barColor: 'from-purple-600 to-fuchsia-400',
    badgeActiveColor: 'bg-purple-950/80 text-purple-300 border-purple-500/70',
    summary: 'Pengaruh minuman beralkohol dan anggur spiritual.',
    combatEffect: 'Miss Rate meningkat (+35%), namun jurus Tinju/Pedang Arak (Wine Art) menguat (+30% s/d +60% DMG)!',
    systemEffect: 'Kadar mabuk perlahan diuraikan oleh metabolisme tubuh.',
    elementSynergy: 'Sinergi spesial: Memaksimalkan efektivitas seni beladiri arak.',
    cureHint: 'Teh Pengusir Mabuk, Air Dingin Segar, Istirahat.',
    cureItemKeywords: ['teh', 'sober', 'mabuk', 'air dingin']
  },
  {
    key: 'frozen',
    name: 'Membeku (Frozen)',
    icon: '❄️',
    color: 'text-cyan-400',
    barColor: 'from-cyan-600 to-sky-400',
    badgeActiveColor: 'bg-cyan-950/80 text-cyan-200 border-cyan-400',
    summary: 'Hawa es ekstrem membekukan sendi dan aliran darah.',
    combatEffect: 'Nilai >= 30: Tidak bisa bergerak (Skip Turn). Merapalkan jurus Api langsung mencairkan es!',
    systemEffect: 'Nilai >= 30: Tubuh membeku kaku, langkah di peta diblokir total.',
    elementSynergy: '🔥 Skill Elemen Api langsung memotong -50 Frozen dan memicu UNFROZEN!',
    cureHint: 'Skill Elemen Api, Pil Api Yang, Minyak Penghangat.',
    cureItemKeywords: ['api yang', 'penghangat', 'hangat', 'beku', 'frozen']
  },
  {
    key: 'psychosis',
    name: 'Penyimpangan Qi (Psychosis)',
    icon: '🌀',
    color: 'text-pink-400',
    barColor: 'from-pink-600 to-rose-400',
    badgeActiveColor: 'bg-pink-950/80 text-pink-300 border-pink-500/70',
    summary: 'Dantian bergejolak menimbulkan halusinasi dan kegilaan.',
    combatEffect: 'Peluang hilang kendali: menyerang sekutu (Pet/NPC), melukai diri sendiri, atau meracau.',
    systemEffect: 'Gangguan kejernihan pikiran, fokus meditasi terganggu.',
    elementSynergy: 'Dapat ditenangkan dengan dupa pemurni dan pil pembersih hati.',
    cureHint: 'Pil Hati Jernih (Qingxin Pill), Dupa Penenang Jiwa.',
    cureItemKeywords: ['hati jernih', 'qingxin', 'penenang', 'jiwa']
  },
  {
    key: 'burn',
    name: 'Luka Bakar (Burn)',
    icon: '🔥',
    color: 'text-orange-400',
    barColor: 'from-orange-600 to-amber-400',
    badgeActiveColor: 'bg-orange-950/80 text-orange-200 border-red-500',
    summary: 'Kobaran api menjalar di sekujur badan.',
    combatEffect: 'Kehilangan HP per ronde dan api MEMBURUK (+5/ronde). Pada 75+ jadi Incinerated (-50% Heal)!',
    systemEffect: 'Suhu tubuh meningkat, luka kian parah di wilayah bersuhu panas.',
    elementSynergy: '💧 Skill Elemen Air & Item Air langsung memotong -45 Burn dan memadamkan api!',
    cureHint: 'Skill Elemen Air, Air Embun Sejuk, Salep Salju Dingin, Pil Es.',
    cureItemKeywords: ['air embun', 'salju', 'air gunung', 'embun es', 'burn', 'bakar']
  },
  {
    key: 'knockback',
    name: 'Terpelanting (Knock Back)',
    icon: '💨',
    color: 'text-slate-300',
    barColor: 'from-slate-600 to-gray-400',
    badgeActiveColor: 'bg-slate-900/80 text-slate-200 border-slate-500/70',
    summary: 'Hantaman momentum dahsyat mematahkan keseimbangan.',
    combatEffect: 'Memukul mundur ATB Gauge (-35%), meremukkan Stance, memecahkan Kuda-Kuda Bertahan, dan memicu Wall Slam.',
    systemEffect: 'Terlempar 1 petak mundur saat terkena jebakan atau sergapan musuh.',
    elementSynergy: '⛰️ Kuda-kuda Tanah (Earth) memberikan kekebalan kokoh terhadap knockback.',
    cureHint: 'Kuda-Kuda Kokoh, Memulihkan Keseimbangan.',
    cureItemKeywords: ['kuda-kuda', 'tanah', 'kokoh']
  }
];

export default function ConditionTab({ player, onRefresh }: ConditionTabProps) {
  const [curingKey, setCuringKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const rawConditions = player?.conditions || {};
  const conditions: Record<string, number> = {
    poison: Math.max(0, Math.floor(Number(rawConditions.poison) || 0)),
    injury: Math.max(0, Math.floor(Number(rawConditions.injury) || 0)),
    bleed: Math.max(0, Math.floor(Number(rawConditions.bleed) || 0)),
    intox: Math.max(0, Math.floor(Number(rawConditions.intox) || 0)),
    frozen: Math.max(0, Math.floor(Number(rawConditions.frozen) || 0)),
    psychosis: Math.max(0, Math.floor(Number(rawConditions.psychosis) || 0)),
    burn: Math.max(0, Math.floor(Number(rawConditions.burn) || 0)),
    knockback: Math.max(0, Math.floor(Number(rawConditions.knockback) || 0)),
  };

  const inventory: InventoryItem[] = Array.isArray(player?.inventory) ? player.inventory : [];

  // Hitung Skor Kondisi Tubuh Total (0 = Bebas Kondisi / Prima)
  const totalNegativePoints = 
    conditions.poison + conditions.injury + conditions.bleed + 
    conditions.frozen + conditions.psychosis + conditions.burn + conditions.knockback;
  
  const isHealthy = totalNegativePoints === 0 && conditions.intox === 0;
  const isCritical = conditions.burn >= 75 || conditions.frozen >= 30 || conditions.injury >= 60 || conditions.poison >= 60;

  // Temukan obat yang cocok dari inventori untuk kondisi tertentu
  const findCureItemForCondition = (keywords: string[]): InventoryItem | null => {
    return inventory.find(inv => {
      if (!inv.itemId || inv.quantity <= 0) return false;
      const it = typeof inv.itemId === 'object' ? inv.itemId : null;
      if (!it || !it.name) return false;
      const itName = it.name.toLowerCase();
      const itDesc = (it.description || '').toLowerCase();
      return keywords.some(k => itName.includes(k) || itDesc.includes(k));
    }) || null;
  };

  // Handler Penggunaan Obat Cepat
  const handleQuickCure = async (condKey: string, keywords: string[]) => {
    const cureInv = findCureItemForCondition(keywords);
    if (!cureInv || !cureInv.itemId) {
      setToastMessage({
        text: 'Tidak ada item obat yang cocok di tas inventori.',
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const itId = typeof cureInv.itemId === 'object' ? cureInv.itemId._id : cureInv.itemId;
    setCuringKey(condKey);

    try {
      const res = await api.post('/player/quick-cure', { itemId: itId, conditionKey: condKey });
      if (res.data?.success) {
        setToastMessage({
          text: res.data.message || 'Kondisi berhasil diobati!',
          type: 'success'
        });
        if (onRefresh) onRefresh();
      } else {
        setToastMessage({
          text: res.data?.error || 'Gagal menggunakan obat.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setToastMessage({
        text: err.response?.data?.error || 'Gagal terhubung ke server pengobatan.',
        type: 'error'
      });
    } finally {
      setCuringKey(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const getSeverityBadge = (key: string, val: number) => {
    if (val === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
          <CheckCircle2 size={11} /> Normal (0)
        </span>
      );
    }

    if (key === 'frozen') {
      if (val >= 30) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-200 border border-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.4)]">
            <Snowflake size={11} className="animate-spin" /> Membeku Kaku ({val})
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-700/70">
          Hawa Dingin ({val})
        </span>
      );
    }

    if (key === 'burn') {
      if (val >= 75) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950 text-red-200 border border-orange-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]">
            <Flame size={11} /> Incinerated! ({val})
          </span>
        );
      }
    }

    if (val <= 25) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-700/60">
          Ringan ({val})
        </span>
      );
    } else if (val <= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-950/80 text-orange-300 border border-orange-600/70">
          Sedang ({val})
        </span>
      );
    } else if (val <= 75) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-600/80">
          Berat ({val})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950 text-red-200 border border-red-500 animate-pulse">
          Kritis ({val})
        </span>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto space-y-4 text-[#e3d7bf] scrollbar-thin">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between shadow-xl animate-in fade-in duration-200 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200 shadow-emerald-950/50' 
            : 'bg-rose-950/95 border-rose-500 text-rose-200 shadow-rose-950/50'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header Status Ringkasan Kondisi Dantian */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Status Tubuh Keseluruhan */}
        <div className="bg-[#141926]/90 border border-[#826b48]/60 rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-md relative overflow-hidden">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${
            isHealthy 
              ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
              : isCritical 
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'bg-amber-950/70 border-amber-500/70 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
          }`}>
            {isHealthy ? '✨' : isCritical ? '💀' : '🩹'}
          </div>
          <div>
            <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Status Dantian</div>
            <div className="text-sm sm:text-base font-serif font-bold text-amber-200">
              {isHealthy ? 'Sehat Walafiat (Prima)' : isCritical ? 'Kritis / Terluka Parah' : 'Terganggu Kondisi'}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              {isHealthy 
                ? 'Bebas racun, luka, dan hawa es.' 
                : `${totalNegativePoints} total akumulasi poin gangguan.`}
            </div>
          </div>
        </div>

        {/* Card 2: Pengaruh Alkohol & Seni Beladiri Arak */}
        <div className="bg-[#141926]/90 border border-[#826b48]/60 rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-purple-950/70 border border-purple-500/70 flex items-center justify-center text-2xl text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            🍶
          </div>
          <div>
            <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Kadar Arak (Intox)</div>
            <div className="text-sm sm:text-base font-serif font-bold text-purple-200">
              {conditions.intox === 0 ? 'Sadar Penuh (0)' : `Mabuk Arak (${conditions.intox})`}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              {conditions.intox > 0 
                ? `+${Math.floor(conditions.intox * 0.6)}% Drunken DMG / Miss +${Math.floor(conditions.intox * 0.35)}%` 
                : 'Siap mengonsumsi arak spiritual.'}
            </div>
          </div>
        </div>

        {/* Card 3: Resonansi Elemen Aktif */}
        <div className="bg-[#141926]/90 border border-[#826b48]/60 rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/70 border border-cyan-500/70 flex items-center justify-center text-2xl text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            ☯️
          </div>
          <div>
            <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Resonansi Elemen</div>
            <div className="text-xs font-serif font-bold text-cyan-200">
              Air 💧 Padamkan Api | Api 🔥 Cairkan Es
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              Gunakan jurus elemen air/api untuk counter kondisi.
            </div>
          </div>
        </div>
      </div>

      {/* TABEL KONDISI LENGKAP DENGAN DESAIN DARK INK WUXIA */}
      <div className="bg-[#0f121b] border-2 border-[#4d3e28] rounded-xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3 bg-gradient-to-r from-[#1c1812] via-[#2a2217] to-[#1c1812] border-b border-[#4d3e28] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-400" />
            <h3 className="font-serif font-bold text-amber-200 text-sm sm:text-base tracking-wider">
              TABEL KONDISI & STATUS ANATOMI PENDEKAR
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#a89980] hidden sm:inline">
            Sistem Kondisi Authoritative • Nilai 0 = Normal
          </span>
        </div>

        {/* Tabel Grid Responsif */}
        <div className="divide-y divide-[#261f14]">
          {CONDITIONS_CONFIG.map((cfg) => {
            const val = conditions[cfg.key] || 0;
            const cureItem = findCureItemForCondition(cfg.cureItemKeywords);
            const isProcessingThis = curingKey === cfg.key;
            const percent = Math.min(100, val);

            return (
              <div 
                key={cfg.key} 
                className={`p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  val > 0 ? 'bg-[#18151a]/40 hover:bg-[#1f1a22]/60' : 'hover:bg-[#141722]/40'
                }`}
              >
                {/* Kolom 1: Ikon, Nama, dan Progress Gauge */}
                <div className="flex items-center gap-3 min-w-[220px] sm:min-w-[260px]">
                  <div className="w-10 h-10 rounded-lg bg-[#1a140c] border border-[#6b5230] flex items-center justify-center text-xl shrink-0 shadow-inner">
                    {cfg.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-serif font-bold text-xs sm:text-sm ${val > 0 ? cfg.color : 'text-stone-300'}`}>
                        {cfg.name}
                      </span>
                      {getSeverityBadge(cfg.key, val)}
                    </div>

                    {/* Progress Bar Gauge Nilai Kondisi */}
                    <div className="w-full h-1.5 bg-[#090b10] rounded-full overflow-hidden border border-stone-800 mt-1.5 max-w-[200px]">
                      <div 
                        className={`h-full bg-gradient-to-r ${cfg.barColor} transition-all duration-300`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Kolom 2: Rincian Mekanisme Kombat & Peta Spasial */}
                <div className="flex-1 text-xs space-y-1 pr-2">
                  <div className="flex items-start gap-1.5 text-stone-300 leading-snug">
                    <span className="text-amber-400/90 font-mono font-semibold shrink-0">⚔️ Kombat:</span>
                    <span>{cfg.combatEffect}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-stone-400 leading-snug text-[11px]">
                    <span className="text-sky-400/90 font-mono font-semibold shrink-0">🗺️ Peta/Sistem:</span>
                    <span>{cfg.systemEffect}</span>
                  </div>
                  {/* Resonansi Antar-Skill */}
                  <div className="flex items-start gap-1.5 text-cyan-300/90 leading-snug text-[11px] font-mono">
                    <span className="text-cyan-400 font-bold shrink-0">⚡ Resonansi:</span>
                    <span>{cfg.elementSynergy}</span>
                  </div>
                </div>

                {/* Kolom 3: Penawar & Tombol Aksi Pengobatan Cepat */}
                <div className="flex items-center md:flex-col lg:flex-row gap-2 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-stone-800/60">
                  <div className="text-[11px] text-stone-400 hidden lg:block text-right">
                    <div className="font-mono text-amber-300/80">Penawar Terdaftar:</div>
                    <div className="truncate max-w-[140px] text-[10px]">{cfg.cureHint}</div>
                  </div>

                  {val > 0 ? (
                    cureItem ? (
                      <button
                        onClick={() => handleQuickCure(cfg.key, cfg.cureItemKeywords)}
                        disabled={isProcessingThis}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-500 border border-amber-400/80 text-white font-serif text-xs font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)] transition-all flex items-center gap-1.5 shrink-0"
                        title={`Gunakan [${typeof cureItem.itemId === 'object' ? cureItem.itemId.name : 'Obat'}] dari tas`}
                      >
                        <RefreshCw size={13} className={isProcessingThis ? 'animate-spin' : ''} />
                        <span>Obati ({cureItem.quantity})</span>
                      </button>
                    ) : (
                      <div className="px-2.5 py-1 rounded bg-[#1c130d] border border-amber-900/60 text-stone-400 text-[10px] font-mono shrink-0 flex items-center gap-1">
                        <AlertTriangle size={11} className="text-amber-500" />
                        <span>Butuh Obat</span>
                      </div>
                    )
                  ) : (
                    <span className="text-[11px] font-mono text-emerald-400/80 px-2 py-1 bg-emerald-950/40 rounded border border-emerald-900/40 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Tubuh Bersih
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Petunjuk & Pedoman Dao Pengobatan */}
      <div className="bg-[#121622]/80 border border-[#3b3225] rounded-xl p-3 sm:p-4 text-xs space-y-1.5 text-stone-400">
        <div className="font-serif font-bold text-amber-300 flex items-center gap-1.5 text-xs sm:text-sm">
          <HelpCircle size={15} /> Pedoman Pemulihan & Resonansi Alami Dantian:
        </div>
        <p>
          • <strong>Nilai $0$</strong> merepresentasikan kondisi sempurna tanpa efek samping. Setiap poin penambahan memperparah dampak negatif di medan laga.
        </p>
        <p>
          • <strong>Resonansi Elemen Jurus</strong>: Melancarkan jurus ber-elemen <span className="text-cyan-300 font-bold">Air (Water)</span> dapat memadamkan kobaran api <span className="text-orange-300 font-bold">Burn</span>, sedangkan melancarkan jurus ber-elemen <span className="text-red-300 font-bold">Api (Fire)</span> menyalurkan energi Yang untuk mencairkan tubuh yang <span className="text-sky-300 font-bold">Frozen</span>.
        </p>
        <p>
          • <strong>Luka Dalam (Injury)</strong> memangkas ketajaman serangan (ATK), ketahanan zirah (DEF), dan daya tampung intisari Qi dantian secara drastis. Segera balur dengan Salep Jin Chuang saat berada di pemukiman.
        </p>
      </div>
    </div>
  );
}
