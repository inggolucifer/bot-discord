"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useUIStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { GLOBAL_ASSETS } from '@/config/globalAssets';
import { LawStatusData, LawSkillItem, LawType } from '@/types/game';
import { CultivationData } from '@/lib/schemas';
import { LAW_RANK_NAMES_EN } from '@/lib/realmUtils';
import Link from 'next/link';
import HeavenlyTribulationModal, { TribulationData } from './HeavenlyTribulationModal';
import MaxLevelCapBanner from './MaxLevelCapBanner';
import LawConstellationTree from './LawConstellationTree';
import {
  Flame,
  Shield,
  Sparkles,
  Zap,
  Sword,
  BookOpen,
  CheckCircle2,
  XCircle,
  Lock,
  ChevronRight,
  Info,
  Clock,
  Award,
  Heart,
  Droplets,
  Wind,
  Mountain,
  Skull,
  ArrowUpCircle,
  TreePine,
  Loader2,
  Activity
} from 'lucide-react';

// 15 Law Catalog untuk Modal Pemilihan Fondasi Fana
const LAW_CATALOG = [
  // 6 Divine Elemental Laws
  {
    type: 'element_phoenix_fire' as LawType,
    category: 'elemental',
    name: 'Hukum Api Nirwana Phoenix',
    element: 'Api (Fire)',
    icon: '🔥',
    color: '#ef4444',
    bgGradient: 'from-red-950/60 to-black',
    desc: 'Menyerap intisari Burung Phoenix purba. Membakar kotoran fana dan terlahir kembali dari abu (Nirvana Rebirth).'
  },
  {
    type: 'element_azure_water' as LawType,
    category: 'elemental',
    name: 'Hukum Samudra Naga Azure',
    element: 'Air (Water)',
    icon: '💧',
    color: '#0ea5e9',
    bgGradient: 'from-cyan-950/60 to-black',
    desc: 'Menyatu dengan kedalaman samudra es kutub utara. Membekukan dan melumpuhkan musuh dengan keanggunan naga.'
  },
  {
    type: 'element_xuanwu_earth' as LawType,
    category: 'elemental',
    name: 'Hukum Inti Bumi Xuanwu',
    element: 'Tanah (Earth)',
    icon: '🗿',
    color: '#d97706',
    bgGradient: 'from-amber-950/60 to-black',
    desc: 'Memperkuat raga sekuat tempurung kura-kura purba Xuanwu penopang benua. Mengonversi DEF menjadi perisai batin.'
  },
  {
    type: 'element_qingdi_wood' as LawType,
    category: 'elemental',
    name: 'Hukum Pohon Hayat Kaisar Hijau',
    element: 'Kayu (Wood)',
    icon: '🌿',
    color: '#22c55e',
    bgGradient: 'from-emerald-950/60 to-black',
    desc: 'Mematri benih Pohon Hayat Semesta Qingdi. Memulihkan luka fana, memperpanjang batas umur, dan regenerasi tanpa akhir.'
  },
  {
    type: 'element_roc_wind' as LawType,
    category: 'elemental',
    name: 'Hukum Badai Sayap Roc',
    element: 'Angin (Wind)',
    icon: '🌪️',
    color: '#06b6d4',
    bgGradient: 'from-sky-950/60 to-black',
    desc: 'Mewarisi tekad Burung Raksasa Roc Sembilan Langit. Kecepatan jelajah tak tertandingi dan tebasan sonik beruntun.'
  },
  {
    type: 'element_godthunder_light' as LawType,
    category: 'elemental',
    name: 'Hukum Guntur Dewa Petir',
    element: 'Petir (Lightning)',
    icon: '⚡',
    color: '#a855f7',
    bgGradient: 'from-purple-950/60 to-black',
    desc: 'Menundukkan kilat hukuman langit para dewa. Serangan rantai petir mematikan mengabaikan pertahanan musuh.'
  },

  // 4 Jalur Raga, Gu, Artifact & Beast
  {
    type: 'body_tempering' as LawType,
    category: 'physical',
    name: 'Penempaan Raga Suci',
    element: 'Fisik Murni (True Qi)',
    icon: '💪',
    color: '#f59e0b',
    bgGradient: 'from-amber-900/60 to-black',
    desc: 'Menempa daging, tulang, dan organ fana menjadi Tubuh Tirani Dewa Iblis Vajra. Menggunakan energi True Qi murni!'
  },
  {
    type: 'gu_master' as LawType,
    category: 'special',
    name: 'Budidaya Serangga Gu',
    element: 'Rongga Aperture & Racun',
    icon: '🐛',
    color: '#84cc16',
    bgGradient: 'from-lime-950/60 to-black',
    desc: 'Membuka rongga Aperture spiritual untuk memelihara, memberi pakan, dan memfusikan kawanan cacing Gu mistis.'
  },
  {
    type: 'natal_artifact' as LawType,
    category: 'companion',
    name: 'Pusaka Jiwa Kelahiran',
    element: 'Benda Common Permanen',
    icon: '🗡️',
    color: '#e2e8f0',
    bgGradient: 'from-slate-900/60 to-black',
    desc: 'Mengikat BENDA COMMON APA SAJA secara permanen (Pedang Karatan, Mangkuk Tanah Liat) hingga berevolusi bernyawa!'
  },
  {
    type: 'natal_beast' as LawType,
    category: 'companion',
    name: 'Satwa Roh Kelahiran',
    element: 'Satwa Common Permanen',
    icon: '🐾',
    color: '#fb923c',
    bgGradient: 'from-orange-950/60 to-black',
    desc: 'Mengikat SATWA COMMON APA SAJA secara permanen (Anak Anjing, Ular Rumput) bertarung bersama dan bermutasi jadi Dewa Purba!'
  },

  // 5 Jalur Demonic Dao Mandiri
  {
    type: 'demonic_turbid_core' as LawType,
    category: 'demonic',
    name: 'Pelebur Inti Siluman Kotor',
    element: 'Dark Yin (Beast Cores)',
    icon: '👹',
    color: '#dc2626',
    bgGradient: 'from-red-950/70 to-black',
    desc: 'Menghisap dan melebur Qi kotor serta inti monster buas tanpa batas untuk mempercepat laju kultivasi kilat.'
  },
  {
    type: 'demonic_blood_soul' as LawType,
    category: 'demonic',
    name: 'Penghisap Darah & Pemanen Ruh',
    element: 'Dark Yin (Darah & Sukma)',
    icon: '🩸',
    color: '#991b1b',
    bgGradient: 'from-rose-950/70 to-black',
    desc: 'Membantai musuh, menghisap esensi darah segar, dan mengikat arwah korban ke dalam Panji Sembilan Ruh.'
  },
  {
    type: 'demonic_myriad_venom' as LawType,
    category: 'demonic',
    name: 'Konsumsi Racun Maut',
    element: 'Poison Toxin',
    icon: '🧪',
    color: '#15803d',
    bgGradient: 'from-green-950/70 to-black',
    desc: 'Mengkonsumsi aneka racun Jianghu paling mematikan untuk membangun Tubuh Berbisa Kebal Maut.'
  },
  {
    type: 'demonic_abyssal_pact' as LawType,
    category: 'demonic',
    name: 'Perjanjian Iblis Purba',
    element: 'Abyssal Chaos',
    icon: '📜',
    color: '#581c87',
    bgGradient: 'from-purple-950/70 to-black',
    desc: 'Menandatangani kontrak darah dengan para entitas Iblis Jurang Abyss. Menyetor upeti demi kekuatan destruktif.'
  },
  {
    type: 'demonic_nether_darkness' as LawType,
    category: 'demonic',
    name: 'Kultivasi Qi Gelap Nether',
    element: 'Nether Yin',
    icon: '🌑',
    color: '#312e81',
    bgGradient: 'from-indigo-950/70 to-black',
    desc: 'Bermeditasi di liang kubur kuno dan jurang tanpa sinar mentari. Menyatu dengan bayangan dan hawa dingin kematian.'
  }
];

// Contoh Benda & Satwa Common untuk Slot 2
const COMMON_PRESETS = [
  { id: 'common_sword', name: 'Pedang Besi Patah', type: 'artifact', icon: '🗡️' },
  { id: 'common_bowl', name: 'Mangkuk Keramik Retak', type: 'artifact', icon: '🥣' },
  { id: 'common_mirror', name: 'Cermin Kuningan Usang', type: 'artifact', icon: '🪞' },
  { id: 'common_pebble', name: 'Kerikil Hitam Kali', type: 'artifact', icon: '🪨' },
  { id: 'common_dog', name: 'Anak Anjing Kampung', type: 'beast', icon: '🐕' },
  { id: 'common_snake', name: 'Ular Rumput Hijau', type: 'beast', icon: '🐍' },
  { id: 'common_crow', name: 'Gagak Hitam Liar', type: 'beast', icon: '🦅' },
  { id: 'common_cat', name: 'Kucing Hutan Belang', type: 'beast', icon: '🐈' }
];

const BODY_PARTS_INFO = [
  { id: 'skin', name: 'Kulit Tembaga', icon: '🛡️', desc: 'Ketahanan fisik & reduksi damage senjata tajam.' },
  { id: 'head', name: 'Mahkota Vajra', icon: '👑', desc: 'Kekebalan stun & serangan kekacauan mental.' },
  { id: 'torso', name: 'Rongga Besi', icon: '🫁', desc: 'Melindungi organ vital dan meningkatkan kapasitas Max HP.' },
  { id: 'spine', name: 'Tulang Naga', icon: '🦴', desc: 'Fondasi postur beladiri, memperkokoh Stance.' },
  { id: 'leftArm', name: 'Lengan Kiri Emas', icon: '🦾', desc: 'Kekuatan tangkisan dan penyerapan impact benturan.' },
  { id: 'rightArm', name: 'Lengan Kanan Perkasa', icon: '🥊', desc: 'Kekuatan pukulan tinju telak & bonus ATK fisik murni.' },
  { id: 'leftLeg', name: 'Kaki Kiri Gesit', icon: '🦵', desc: 'Kelincahan langkah gerak, meningkatkan peluang elak.' },
  { id: 'rightLeg', name: 'Kaki Kanan Kokoh', icon: '🦿', desc: 'Kuda-kuda bumi kokoh & kecepatan jelajah peta dunia.' },
  { id: 'dantian', name: 'Dantian Daging Fana', icon: '🌀', desc: 'Wadah sejati pembentukan True Qi yang murni dari daging fana.' }
];

export const MASTER_REALM_ROADMAP = [
  { idx: 0, name: 'Fondasi Fana', enName: 'Mortal Foundation', levelCap: 20, qiCap: '1.000 s/d 15.000 (Dinamis)', successRate: '100%', tribulation: 'Pembersihan Raga (0 Dmg)', penalty: 'Tanpa Penalti', icon: '🧘', tier: 0 },
  { idx: 1, name: 'Pemurnian Qi', enName: 'Qi Refining', levelCap: 40, qiCap: '5.000 s/d 30.938', successRate: '85%', tribulation: '3 Kilat Ungu (Tier 1)', penalty: '-50% Qi • 1 Jam CD', icon: '💨', tier: 1 },
  { idx: 2, name: 'Pembangunan Fondasi', enName: 'Foundation Establishment', levelCap: 60, qiCap: '25.000 s/d 154.690', successRate: '70%', tribulation: '3 Halilintar Azure (Tier 2)', penalty: '-50% Qi • 2 Jam CD', icon: '🏛️', tier: 2 },
  { idx: 3, name: 'Inti Emas', enName: 'Golden Core', levelCap: 80, qiCap: '125.000 s/d 773.450', successRate: '55%', tribulation: '3 Petir Api Merah (Tier 3)', penalty: '-50% Qi • 4 Jam CD', icon: '🟡', tier: 3 },
  { idx: 4, name: 'Jiwa Baru Lahir', enName: 'Nascent Soul', levelCap: 100, qiCap: '625.000 s/d 3.867.250', successRate: '45%', tribulation: '3 Badai Petir Hitam (Tier 4)', penalty: '-50% Qi • 8 Jam CD', icon: '👶', tier: 4 },
  { idx: 5, name: 'Pembentukan Jiwa', enName: 'Soul Formation', levelCap: 120, qiCap: '3.125.000 s/d 19.336.250', successRate: '35%', tribulation: '3 Guntur Emas Surgawi (Tier 5)', penalty: '-50% Qi • 12 Jam CD', icon: '🔮', tier: 5 },
  { idx: 6, name: 'Pemurnian Kekosongan', enName: 'Void Refinement', levelCap: 140, qiCap: '15.625.000 s/d 96.681.250', successRate: '25%', tribulation: '3 Halilintar Kehancuran (Tier 6)', penalty: '-50% Qi • 24 Jam CD', icon: '🌌', tier: 6 },
  { idx: 7, name: 'Penyatuan Tubuh', enName: 'Body Integration', levelCap: 160, qiCap: '78.125.000 s/d 483.406.250', successRate: '15%', tribulation: '3 Petir Nirwana Kuno (Tier 7)', penalty: '-50% Qi • 48 Jam CD', icon: '⚡', tier: 7 },
  { idx: 8, name: 'Kenaikan Agung', enName: 'Great Ascension', levelCap: 180, qiCap: '500.000.000+', successRate: '10%', tribulation: '9 Guntur Malapetaka (Tier 8)', penalty: '-50% Qi • 72 Jam CD', icon: '👑', tier: 8 }
];

export function MortalStageRoadmap({ currentStage }: { currentStage: number }) {
  const MORTAL_STAGES = [
    { stage: 1,  maxQi: 1000,  rate: 2 },
    { stage: 2,  maxQi: 1500,  rate: 3 },
    { stage: 3,  maxQi: 2200,  rate: 4 },
    { stage: 4,  maxQi: 3100,  rate: 5 },
    { stage: 5,  maxQi: 4200,  rate: 6 },
    { stage: 6,  maxQi: 5500,  rate: 7 },
    { stage: 7,  maxQi: 7000,  rate: 8 },
    { stage: 8,  maxQi: 9000,  rate: 9 },
    { stage: 9,  maxQi: 11500, rate: 10 },
    { stage: 10, maxQi: 15000, rate: 12 }
  ];

  return (
    <div className="bg-stone-950/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <h4 className="font-serif font-bold text-sm text-amber-200 flex items-center gap-2">
          <span>⚡</span> Progresi Dinamis 10 Tahap Fondasi Fana (Anti-Stagnan)
        </h4>
        <span className="text-[11px] font-mono text-amber-400">
          Tahap Saat Ini: <strong>Stage {currentStage}/10</strong>
        </span>
      </div>
      <p className="text-xs text-stone-400">
        Setiap tahap membutuhkan akumulasi Qi yang bertumbuh secara adiktif diiringi laju penyerapan intisari yang semakin cepat.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {MORTAL_STAGES.map((s) => {
          const isDone = currentStage > s.stage;
          const isCurrent = currentStage === s.stage;
          return (
            <div
              key={s.stage}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                isCurrent
                  ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/20 scale-[1.02]'
                  : isDone
                  ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-300'
                  : 'border-stone-800 bg-black/40 text-stone-600'
              }`}
            >
              <div className="font-mono text-[10px] font-bold">
                {isDone ? '✓ TUNTAS' : isCurrent ? '🔥 AKTIF' : `TAHAP ${s.stage}`}
              </div>
              <div className="font-serif text-xs font-bold truncate mt-1 text-stone-200">
                {s.maxQi.toLocaleString()} Qi
              </div>
              <div className="text-[9px] font-mono text-stone-400 mt-0.5">
                +{s.rate} Qi/mnt
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const LAW_PATH_MODS: Record<string, { mod: number; note: string }> = {
  element_phoenix_fire:     { mod: 1.08, note: 'Api Purba (+8% Dmg Tribulasi)' },
  element_azure_water:      { mod: 1.02, note: 'Arus Samudra (+2% Dmg Tribulasi)' },
  element_xuanwu_earth:     { mod: 0.98, note: 'Pertahanan Xuanwu (-2% Dmg Tribulasi)' },
  element_qingdi_wood:      { mod: 1.00, note: 'Vitalitas Pohon Hayat (Seimbang)' },
  element_roc_wind:         { mod: 1.05, note: 'Badai Astral (+5% Dmg Tribulasi)' },
  element_godthunder_light: { mod: 1.15, note: 'Resonansi Petir Murni (+15% Dmg Tribulasi)' },
  body_tempering:           { mod: 1.00, note: 'True Qi Raga Vajra' },
  gu_master:                { mod: 1.20, note: 'Beban Rongga Cacing Gu (+20% Dmg Tribulasi)' },
  natal_artifact:           { mod: 1.05, note: 'Resonansi Pusaka Batin (+5% Dmg Tribulasi)' },
  natal_beast:              { mod: 1.10, note: 'Ikatan Jiwa Satwa Kembar (+10% Dmg Tribulasi)' },
  demonic_turbid_core:      { mod: 1.40, note: 'Beban Siluman Kotor (+40% Dmg Tribulasi)' },
  demonic_blood_soul:       { mod: 1.55, note: 'Karma Darah & Sukma Maut (+55% Dmg Tribulasi)' },
  demonic_myriad_venom:     { mod: 1.35, note: 'Reaksi Intisari Racun (+35% Dmg Tribulasi)' },
  demonic_abyssal_pact:     { mod: 1.50, note: 'Kutukan Entitas Abyss (+50% Dmg Tribulasi)' },
  demonic_nether_darkness:  { mod: 1.25, note: 'Hawa Dingin Yin Kubur (+25% Dmg Tribulasi)' }
};

export const LAW_RANK_NAMES_ID: Record<string, string[]> = {
  element_phoenix_fire:     ['Percikan Api Kecil', 'Pembakaran Awal', 'Sayap Api Muda', 'Nirwana Pertama', 'Nyala Phoenix Bangkit', 'Lahar Inti Batin', 'Mahkota Api Surgawi', 'Burung Api Abadi', 'Phoenix Sempurna'],
  element_azure_water:      ['Tetesan Embun Pagi', 'Aliran Sungai Perak', 'Gelombang Laut Biru', 'Arus Deras Naga', 'Samudra Batin Jernih', 'Glasier Jiwa Beku', 'Pusaran Abyssal', 'Lautan Langit Tanpa Dasar', 'Naga Azure Sempurna'],
  element_xuanwu_earth:     ['Kerikil Dasar', 'Tanah Liat Padat', 'Batu Karang Kokoh', 'Tebing Baja Bumi', 'Inti Gunung Berapi', 'Lempeng Benua Agung', 'Fondasi Leylines', 'Cangkang Xuanwu Purba', 'Xuanwu Sempurna'],
  element_qingdi_wood:      ['Tunas Biji Pertama', 'Akar Rumput Liar', 'Batang Bambu Kokoh', 'Pohon Tua Berurat', 'Hutan Belantara Hidup', 'Akar Dunia Terhubung', 'Pohon Hayat Berbunga', 'Kanopi Langit Surgawi', 'Kaisar Hijau Sempurna'],
  element_roc_wind:         ['Hembusan Lembut', 'Pusaran Debu Kecil', 'Angin Kencang Padang', 'Topan Bilah Tajam', 'Badai Petir Langit', 'Sayap Roc Terbentang', 'Tornado Sembilan Langit', 'Angin Astral Pembatas', 'Roc Kuno Sempurna'],
  element_godthunder_light: ['Percikan Statis', 'Kilat Jemari Kecil', 'Sambaran Awan Hitam', 'Petir Langit Pertama', 'Rantai Petir Biru', 'Petir Ungu Murni', 'Hukuman Langit Ketujuh', 'Sembilan Petir Suci', 'Dewa Petir Sempurna'],
  body_tempering:           ['Kulit Fana Biasa', 'Pengerasan Daging', 'Tulang Besi Tempa', 'Otot Kawat Baja', 'Meridian Terbuka', 'Organ Emas Murni', 'Darah Naga Mengalir', 'Raga Vajra Tak Tertembus', 'Raga Sempurna'],
  gu_master:                ['Penanam Ulat Kecil', 'Penjaga Sarang Awal', 'Peternak Gu Muda', 'Pengendali Koloni', 'Master Fusi Gu', 'Raja Aperture', 'Penguasa Sepuluh Ribu', 'Rongga Chaos Purba', 'Gu Sempurna'],
  natal_artifact:           ['Benda Fana Biasa', 'Pusaka Berpendar', 'Senjata Roh Muda', 'Artefak Inti Batin', 'Pusaka Batin Hidup', 'Relik Bernapas', 'Senjata Jiwa Terikat', 'Pusaka Surgawi', 'Pusaka Sempurna'],
  natal_beast:              ['Hewan Fana Biasa', 'Satwa Roh Kecil', 'Satwa Berbakat Muda', 'Macan Roh Tumbuh', 'Satwa Metamorfosis', 'Roh Purba Bangkit', 'Satwa Langit Terbang', 'Naga Roh Sejati', 'Satwa Sempurna'],
  demonic_turbid_core:      ['Penghisap Hawa Lemah', 'Penyerap Inti Kotor', 'Pembersih Core Muda', 'Pelebur Aura Siluman', 'Penguasa Miasma', 'Pemakan Hawa Hitam', 'Tiran Core Gelap', 'Raja Siluman Pelebur', 'Iblis Core Sempurna'],
  demonic_blood_soul:       ['Penghisap Setetes Darah', 'Peminum Darah Fana', 'Pengikat Ruh Lemah', 'Panji Ruh Pertama', 'Pencabut Nyawa Diam', 'Lautan Darah Beriak', 'Penguasa Sembilan Ruh', 'Raja Neraka Darah', 'Iblis Darah Sempurna'],
  demonic_myriad_venom:     ['Penjilat Bisa Ringan', 'Peminum Racun Encer', 'Tubuh Toleran Racun', 'Kantung Bisa Terbentuk', 'Racun Seribu Jenis', 'Tubuh Kebal Maut', 'Naga Racun Korosi', 'Lautan Racun Pemusnah', 'Iblis Racun Sempurna'],
  demonic_abyssal_pact:     ['Bisikan Iblis Samar', 'Kontrak Pertama', 'Perjanjian Darah', 'Wadah Iblis Muda', 'Segel Keempat Terbuka', 'Tangan Kanan Iblis', 'Perwujudan Abyss', 'Pewaris Tahta Iblis', 'Iblis Pact Sempurna'],
  demonic_nether_darkness:  ['Bayangan Pudar', 'Kabut Yin Tipis', 'Kegelapan Merayap', 'Jubah Malam Abadi', 'Domain Bayangan', 'Penguasa Nether Yin', 'Kekosongan Sembilan Lapis', 'Raja Kegelapan Kuno', 'Iblis Nether Sempurna']
};

interface MasterRealmRoadmapAccordionProps {
  currentRealmIdx: number;
  activeLawType?: LawType | null;
  activeLawName?: string | null;
}

export function MasterRealmRoadmapAccordion({
  currentRealmIdx,
  activeLawType,
  activeLawName
}: MasterRealmRoadmapAccordionProps) {
  const lawRankNames = activeLawType ? LAW_RANK_NAMES_ID[activeLawType] : null;
  const lawPathMod = activeLawType ? LAW_PATH_MODS[activeLawType] : null;

  return (
    <details className="group border border-stone-800/80 rounded-2xl bg-[#0c0f17]/90 p-5 transition-all shadow-xl backdrop-blur-md">
      <summary className="cursor-pointer font-serif font-bold text-sm text-amber-200 hover:text-amber-300 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">
            📜
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span>Tabel Master 9 Ranah Kultivasi & Batas Level Cap</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-300 font-mono">
                Heavenly Dao Roadmap
              </span>
              {activeLawName && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-stone-300 font-mono">
                  Jalur: {activeLawName}
                </span>
              )}
              {lawPathMod && lawPathMod.mod !== 1.0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-600/50 text-purple-300 font-mono">
                  Tribulasi {lawPathMod.note}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 font-sans font-normal mt-0.5">
              Syarat Max Level Karakter, Kapasitas Qi Dantian, Peluang Terobosan, dan Tingkat Tribulasi Petir Surgawi
            </p>
          </div>
        </div>
        <span className="text-xs text-amber-400 font-mono group-open:rotate-180 transition-transform">
          ▼
        </span>
      </summary>

      <div className="mt-5 pt-4 border-t border-stone-800 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 font-serif">
                <th className="py-2.5 px-3">Ranah Kultivasi</th>
                <th className="py-2.5 px-3">Gelar Jalur Hukum</th>
                <th className="py-2.5 px-3">English Realm</th>
                <th className="py-2.5 px-3">Batas Max Level</th>
                <th className="py-2.5 px-3">Kapasitas Qi</th>
                <th className="py-2.5 px-3">Peluang Sukses</th>
                <th className="py-2.5 px-3">Tribulasi Petir</th>
                <th className="py-2.5 px-3">Penalti Gagal</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-900">
              {MASTER_REALM_ROADMAP.map((realm) => {
                const isCurrent = realm.idx === currentRealmIdx;
                const isPassed = realm.idx < currentRealmIdx;
                const specificLawTitle = lawRankNames?.[realm.idx] || null;

                return (
                  <tr
                    key={realm.idx}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-amber-500/10 font-medium'
                        : isPassed
                        ? 'bg-emerald-950/10 text-stone-300'
                        : 'hover:bg-stone-900/40 text-stone-400'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{realm.icon}</span>
                        <span className={`font-serif ${isCurrent ? 'text-amber-200 font-bold' : isPassed ? 'text-emerald-300' : 'text-stone-300'}`}>
                          {realm.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-serif">
                      {specificLawTitle ? (
                        <span className={`font-semibold ${isCurrent ? 'text-amber-300' : isPassed ? 'text-emerald-300' : 'text-stone-400'}`}>
                          {specificLawTitle}
                        </span>
                      ) : (
                        <span className="text-stone-500 italic text-[11px]">— Mandiri —</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-serif text-stone-300 italic">{realm.enName}</td>
                    <td className="py-3 px-3 font-mono">
                      <span className={`px-2 py-0.5 rounded ${isCurrent ? 'bg-amber-950/80 border border-amber-600/60 text-amber-300 font-bold' : 'text-stone-300'}`}>
                        Lv. {realm.levelCap}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-stone-300">{realm.qiCap} Qi</td>
                    <td className="py-3 px-3 font-mono">
                      <span className={realm.successRate === '100%' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}>
                        {realm.successRate}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-300">
                      <div>
                        <span className={`flex items-center gap-1 ${realm.tier > 0 ? 'text-purple-300' : 'text-emerald-400'}`}>
                          {realm.tier > 0 ? '⚡' : '✨'} {realm.tribulation}
                        </span>
                        {realm.tier > 0 && lawPathMod && lawPathMod.mod !== 1.0 && (
                          <span className="text-[10px] text-purple-400/90 font-mono block">
                            (PathMod: ×{lawPathMod.mod})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-stone-400 font-mono text-[11px]">{realm.penalty}</td>
                    <td className="py-3 px-3 text-right">
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-[10px] font-bold">
                          ● Ranah Aktif
                        </span>
                      ) : isPassed ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold">
                          ✓ Tuntas
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-500 font-mono text-[10px]">
                          🔒 Terkunci
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-stone-800/80 text-[11px] text-stone-400">
          <div className="flex items-start gap-2 bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
            <Lock size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-300 block font-serif">Kunci Max Level Mutlak</strong>
              Setiap terobosan ke ranah berikutnya mewajibkan karakter mencapai Max Level ranah tersebut. Dilarang menerobos sebelum batas tercapai.
            </div>
          </div>
          <div className="flex items-start gap-2 bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
            <Zap size={14} className="text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-300 block font-serif">Formula Ketahanan Raga</strong>
              Survival HP dihitung dari: Max HP + (DEF × 3) + (Vitality × 2) + (Focus × 1.5). Kuatkan fondasi sebelum menghadapi petir langit!
            </div>
          </div>
          <div className="flex items-start gap-2 bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
            <Skull size={14} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-300 block font-serif">Risiko Kegagalan Ranah</strong>
              Kegagalan terobosan mengakibatkan hilangnya 50% Qi dantian dan cooldown meditasi berjam-jam untuk memulihkan meridian yang retak.
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

interface LawCultivationTabProps {
  realmData?: CultivationData;
}

export default function LawCultivationTab({ realmData }: LawCultivationTabProps) {
  const queryClient = useQueryClient();
  const [selectedSlot1Item, setSelectedSlot1Item] = useState<any>(null);
  const [selectedSlot2Item, setSelectedSlot2Item] = useState<any>(null);
  const [slot1PickerOpen, setSlot1PickerOpen] = useState(false);
  const [slot2PickerOpen, setSlot2PickerOpen] = useState(false);
  const [ordinaryConfirmModalOpen, setOrdinaryConfirmModalOpen] = useState(false);
  const [customEntityName, setCustomEntityName] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('skin');

  // Heavenly Tribulation Modal States
  const [tribulationModalOpen, setTribulationModalOpen] = useState(false);
  const [tribulationData, setTribulationData] = useState<TribulationData | null>(null);
  const [tribulationSuccess, setTribulationSuccess] = useState(true);
  const [tribulationMessage, setTribulationMessage] = useState('');
  const [tribulationNewRealm, setTribulationNewRealm] = useState<string | undefined>(undefined);
  const [tribulationNewLevelCap, setTribulationNewLevelCap] = useState<number | null>(null);

  // Fetch Real Inventory for Law Binding (Slot 1 & Slot 2)
  const { data: bindInvRes, isLoading: isBindInvLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['bindingInventory'],
    queryFn: async () => {
      const { data } = await api.get('/cultivation/law/binding/inventory');
      return data;
    }
  });

  const bindingData = bindInvRes?.data;

  // Fetch Player Inventory for fallback references
  const { data: invRes } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await api.get('/inventory');
      return data;
    }
  });

  const inventoryItems: any[] = Array.isArray(invRes?.data) ? invRes.data : [];

  // Fetch Law Status
  const { data: statusRes, isLoading } = useQuery<{ success: boolean; data: LawStatusData }>({
    queryKey: ['lawStatus'],
    queryFn: async () => {
      const { data } = await api.get('/cultivation/law/status');
      return data;
    },
    refetchInterval: 10000 // Poll every 10s for channel time
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

  // Mutations
  const dailyClaimMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/cultivation/law/daily-claim');
      return data;
    },
    onSuccess: (res) => {
      toast.show({ message: res.message || 'Pencerahan harian berhasil diklaim!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal mengklaim pencerahan harian.', type: 'error' });
    }
  });

  const channelMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop') => {
      const { data } = await api.post(`/cultivation/law/channel/${action}`);
      return data;
    },
    onSuccess: (res) => {
      toast.show({ message: res.message || 'Status meditasi diperbarui.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['cultivation'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal mengubah status meditasi.', type: 'error' });
    }
  });

  const miniBreakthroughMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/cultivation/law/breakthrough/stage');
      return data;
    },
    onSuccess: (res) => {
      toast.show({ message: res.message || 'Berhasil menembus stage baru!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['lawSkills'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal melakukan terobosan stage.', type: 'error' });
    }
  });

  const majorBreakthroughMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/cultivation/law/breakthrough/rank');
      return data;
    },
    onSuccess: (res: any) => {
      if (res?.tribulation) {
        setTribulationData(res.tribulation);
        setTribulationSuccess(res.isSuccess !== false);
        setTribulationMessage(res.message || 'Penerobosan Rank Berhasil!');
        setTribulationNewRealm(res.rewards?.rankDisplayName);
        setTribulationNewLevelCap(res.rewards?.levelCapBonus ? ((livePlayer?.level || 1) + res.rewards.levelCapBonus) : null);
        setTribulationModalOpen(true);
      } else {
        toast.show({ message: res.message || 'Penerobosan Agung berhasil!', type: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['lawSkills'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal melakukan terobosan rank.', type: 'error' });
    }
  });

  const globalStamina = useUIStore(s => s.currentStamina);
  const globalMaxStamina = useUIStore(s => s.maxStamina);
  const setGlobalStamina = useUIStore(s => s.setStamina);

  // Query Player Profile for live stamina and cultivation stats
  const { data: profileRes } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['player-profile-private'],
    queryFn: async () => {
      const res = await api.get('/player/profile');
      return res.data;
    }
  });
  const livePlayer = profileRes?.data?.player || profileRes?.data;

  // Sinkronkan stamina dari realmData atau livePlayer jika tersedia
  useEffect(() => {
    if (realmData?.currentStamina !== undefined) {
      setGlobalStamina(realmData.currentStamina, realmData.maxStamina);
    } else if (livePlayer?.currentStamina !== undefined) {
      setGlobalStamina(livePlayer.currentStamina, livePlayer.maxStamina);
    }
  }, [realmData?.currentStamina, realmData?.maxStamina, livePlayer?.currentStamina, livePlayer?.maxStamina, setGlobalStamina]);

  const currentStamina = Math.floor(
    realmData?.currentStamina !== undefined 
      ? realmData.currentStamina 
      : (globalStamina ?? livePlayer?.currentStamina ?? 100)
  );
  const maxStamina = Math.floor(
    realmData?.maxStamina !== undefined 
      ? realmData.maxStamina 
      : (globalMaxStamina ?? livePlayer?.maxStamina ?? 100)
  );

  // Mutation: Latihan Semadi dengan Stamina (Mortal 1-9)
  const staminaTrainMutation = useMutation({
    mutationFn: async (staminaCost: number) => {
      const { data } = await api.post('/cultivation/train', { staminaCost });
      return data;
    },
    onSuccess: (res) => {
      toast.show({ message: res.message || 'Semadi berhasil meningkatkan Qi!', type: 'success' });
      if (res.data?.currentStamina !== undefined) {
        setGlobalStamina(res.data.currentStamina, res.data.maxStamina);
      }
      queryClient.invalidateQueries({ queryKey: ['cultivation'] });
      queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal melakukan semadi Qi.', type: 'error' });
    }
  });

  // Mutation: Terobosan Tahap Mandiri (Mortal 1-9 Direct Stage & Mortal 10 Realm Breakthrough)
  const mortalBreakthroughMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/cultivation/breakthrough', { forceBreakthrough: true });
      return data;
    },
    onSuccess: (res: any) => {
      const respData = res?.data;
      if (respData?.tribulation) {
        setTribulationData(respData.tribulation);
        setTribulationSuccess(res.isSuccess !== false);
        setTribulationMessage(res.message || 'Terobosan Berhasil!');
        setTribulationNewRealm(respData.realm);
        setTribulationNewLevelCap(respData.newLevelCap);
        setTribulationModalOpen(true);
      } else {
        toast.show({ message: res.message || 'Terobosan Berhasil!', type: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['cultivation'] });
      queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal menerobos tahap.', type: 'error' });
    }
  });

  const allocateSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const { data } = await api.post('/cultivation/law/skill/allocate', { skillId });
      return data;
    },
    onSuccess: (res) => {
      toast.show({ message: res.message || 'Jurus berhasil dipelajari!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lawSkills'] });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal mempelajari jurus.', type: 'error' });
    }
  });

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

  const lawActionMutation = useMutation({
    mutationFn: async ({ endpoint, payload = {} }: { endpoint: string; payload?: any }) => {
      const { data } = await api.post(`/cultivation/law/${endpoint}`, payload);
      return data;
    },
    onSuccess: (res) => {
      toast.show({ message: res.message || 'Aktivitas berhasil!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Aktivitas gagal.', type: 'error' });
    }
  });

  // Handler Bind Law (Slot 1 + Slot 2)
  const handleExecuteBind = async () => {
    if (!selectedSlot1Item) {
      toast.show({ message: 'Masukkan Kitab Manual Hukum di Slot 1 terlebih dahulu!', type: 'error' });
      return;
    }

    const reqConfig = bindingData?.requirementsMap?.[selectedSlot1Item.lawType];
    if (reqConfig?.slot2Required && !selectedSlot2Item) {
      toast.show({ message: `Pilih item persyaratan (${reqConfig.name}) di Slot 2!`, type: 'error' });
      return;
    }

    try {
      const payload = {
        slot1ManualItemId: String(selectedSlot1Item.itemId),
        slot2CompanionItemId: selectedSlot2Item ? String(selectedSlot2Item.itemId) : null,
        customEntityName: customEntityName.trim() || (selectedSlot2Item ? selectedSlot2Item.name : null)
      };

      const { data: bindRes } = await api.post('/cultivation/law/bind', payload);
      toast.show({ message: bindRes.message || 'Berhasil mengikat Hukum Semesta!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['bindingInventory'] });
      queryClient.invalidateQueries({ queryKey: ['cultivation'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    } catch (err: any) {
      toast.show({ message: err.response?.data?.error || 'Gagal mematri Hukum Semesta.', type: 'error' });
    }
  };

  const handleConfirmOrdinary = async () => {
    try {
      const { data: ordRes } = await api.post('/cultivation/law/ordinary/confirm', { confirmed: true });
      toast.show({ message: ordRes.message || 'Berhasil memilih Jalur Kultivator Biasa!', type: 'success' });
      setOrdinaryConfirmModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['bindingInventory'] });
      queryClient.invalidateQueries({ queryKey: ['cultivation'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    } catch (err: any) {
      toast.show({ message: err.response?.data?.error || 'Gagal mengonfirmasi jalur Kultivator Biasa.', type: 'error' });
    }
  };

  if (isLoading || isBindInvLoading) {
    return <LoadingState text="Menyelaraskan Hukum Semesta ke Dantian..." />;
  }

  // ═══════════════════════════════════════════════════════════════════
  // KASUS 1: PEMAIN BELUM MEMILIH LAW → 2-SLOT DAO BINDING ALTAR
  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // KASUS 0: PEMAIN MEMILIH JALUR KULTIVATOR BIASA (TANPA HUKUM)
  // ═══════════════════════════════════════════════════════════════════
  if (bindingData?.isNormalCultivator) {
    const normRealmIdx = Number(realmData?.realmIdx) || 0;
    const normStage = Number(realmData?.stage) || 1;
    const normCurrentQi = Math.floor(Number(realmData?.currentQi) || 0);
    const normMaxQi = Math.floor(Number(realmData?.maxQi) || 1000);
    const normRatePerMinute = Math.max(1, Number(realmData?.ratePerMinute) || 1);
    const normQiPercent = Math.min(100, Math.floor((normCurrentQi / normMaxQi) * 100));
    const isReadyForBreakthrough = normCurrentQi >= normMaxQi || Boolean(realmData?.isReadyForBreakthrough);
    const qiNeeded = Math.max(0, normMaxQi - normCurrentQi);

    const normCurrentLevel = livePlayer?.level || realmData?.currentLevel || 1;
    const normLevelCap = realmData?.currentLevelCap || (20 + 20 * normRealmIdx);
    const isLevelMet = normCurrentLevel >= normLevelCap;
    const isMajorBreakthrough = normStage >= 10;
    const successRate = realmData?.effectiveSuccessRate || (isMajorBreakthrough ? (normRealmIdx === 0 ? 100 : Math.max(10, 85 - (normRealmIdx - 1) * 15)) : 100);
    const currentRealmMeta = MASTER_REALM_ROADMAP[normRealmIdx] || MASTER_REALM_ROADMAP[0];
    const nextRealmMeta = MASTER_REALM_ROADMAP[normRealmIdx + 1] || null;

    const canDoBreakthrough = isMajorBreakthrough
      ? (isReadyForBreakthrough && isLevelMet && !mortalBreakthroughMutation.isPending)
      : (isReadyForBreakthrough && !mortalBreakthroughMutation.isPending);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Banner Jalur Kultivator Biasa */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-stone-700 bg-gradient-to-r from-stone-900/90 via-[#0c0f17]/95 to-stone-950/95 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-stone-800/80 border border-stone-600 flex items-center justify-center text-3xl shadow-inner shrink-0">
                🥋
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold font-serif text-amber-200">
                    Jalur Kultivator Biasa ({currentRealmMeta.name})
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 border border-stone-600 text-stone-300 font-mono">
                    {currentRealmMeta.enName} • Tahap {normStage} / 10
                  </span>
                </div>
                <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
                  Kamu melangkah di jalan Dao fana mandiri tanpa keterikatan Hukum Semesta. Mengandalkan penguasaan senjata, 6 disiplin beladiri, dan pernapasan Qi alami.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 text-right">
                <span className="text-[10px] text-stone-400 font-mono block">Batas Level Ranah</span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  Lv. {normCurrentLevel} <span className="text-stone-500 text-xs">/ {normLevelCap}</span>
                </span>
              </div>
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 text-right">
                <span className="text-[10px] text-amber-400/90 font-mono block">Efektivitas Tempur</span>
                <span className="text-sm font-bold text-stone-200 font-serif">× 0.95</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Akumulasi Qi & Semadi Stamina */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Akumulasi Qi & Terobosan */}
          <div className="lg:col-span-7 bg-[#11141e]/90 border border-stone-700 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex justify-between items-center border-b border-stone-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                  <h3 className="font-serif font-bold text-amber-200 text-base">Akumulasi Qi Dantian</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-900/50">
                  <Clock size={12} />
                  <span>+{normRatePerMinute} Qi / Menit</span>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-stone-300 font-semibold">Kapasitas Intisari Qi:</span>
                  <span className="text-amber-300 text-sm font-bold">
                    {normCurrentQi.toLocaleString()} <span className="text-stone-500 text-xs">/ {normMaxQi.toLocaleString()} Qi ({normQiPercent}%)</span>
                  </span>
                </div>

                <div className="w-full bg-[#07090e] rounded-full h-4 overflow-hidden border border-stone-800 p-0.5 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    style={{ width: `${normQiPercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-stone-400 pt-1">
                  <span>{isReadyForBreakthrough ? '✨ Dantian Siap Menerobos' : `Butuh ${qiNeeded.toLocaleString()} Qi lagi`}</span>
                  <span className="font-mono text-amber-400/90">
                    {isMajorBreakthrough
                      ? (nextRealmMeta ? `Menuju ${nextRealmMeta.name} (${nextRealmMeta.enName})` : 'Ranah Tertinggi')
                      : `Menuju Tahap ${normStage + 1}`}
                  </span>
                </div>
              </div>

              {/* Checklist Khusus Terobosan Ranah (Major Breakthrough di Tahap 10) */}
              {isMajorBreakthrough && (
                <div className="mt-5 p-4 rounded-xl bg-black/60 border border-stone-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-stone-800/80">
                    <span className="font-serif font-bold text-amber-300 flex items-center gap-1.5">
                      <Award size={14} className="text-amber-400" /> Prasyarat Terobosan Ranah Agung
                    </span>
                    <span className="font-mono text-[11px] text-stone-400">Peluang Sukses: <strong className="text-emerald-400">{successRate}%</strong></span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between ${isReadyForBreakthrough ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/20 border-rose-800/40 text-rose-300'}`}>
                      <span>Kapasitas Qi (100%)</span>
                      <span className="font-mono font-bold">{isReadyForBreakthrough ? '✓ Penuh' : `${normQiPercent}%`}</span>
                    </div>

                    <div className={`p-2.5 rounded-lg border flex items-center justify-between ${isLevelMet ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/20 border-rose-800/40 text-rose-300'}`}>
                      <span>Syarat Max Level</span>
                      <span className="font-mono font-bold">{isLevelMet ? `✓ Lv. ${normCurrentLevel}` : `Lv. ${normCurrentLevel} / ${normLevelCap}`}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800 text-[11px] flex items-center justify-between text-stone-300">
                    <span className="flex items-center gap-1.5">
                      <Zap size={13} className="text-purple-400" /> Ujian Tribulasi Petir:
                    </span>
                    <span className="font-mono text-purple-300 font-semibold">{currentRealmMeta.tribulation}</span>
                  </div>

                  {!isLevelMet && (
                    <p className="text-[11px] text-rose-400 font-mono flex items-center gap-1">
                      <XCircle size={12} /> Wajib mencapai Max Level {normLevelCap} sebelum menerobos ke ranah berikutnya!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tombol Terobosan Tahap / Ranah */}
            <div className="pt-4 border-t border-stone-800">
              {canDoBreakthrough ? (
                <button
                  onClick={() => mortalBreakthroughMutation.mutate()}
                  disabled={mortalBreakthroughMutation.isPending}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-serif font-bold text-base shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 transform hover:scale-[1.01] active:scale-[0.99] border border-amber-300"
                >
                  {mortalBreakthroughMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Menghadapi Tribulasi & Menerobos...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      <span>
                        {isMajorBreakthrough
                          ? `⚡ HADAPI TRIBULASI & TEROBOS KE ${nextRealmMeta?.name?.toUpperCase() || 'RANAH BERIKUTNYA'}!`
                          : `⚡ TEROBOS KE TAHAP ${normStage + 1} SEKARANG!`}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-xl bg-[#0d1017] border border-stone-800 text-stone-500 font-serif font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-2 cursor-not-allowed">
                  <Lock size={15} />
                  <span>
                    {!isReadyForBreakthrough
                      ? 'Dantian Belum Penuh (Kumpulkan Qi hingga 100% untuk Menerobos)'
                      : !isLevelMet
                      ? `Terkunci: Wajib Mencapai Max Level ${normLevelCap} (Saat ini Lv. ${normCurrentLevel})`
                      : 'Syarat Terobosan Belum Lengkap'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Aksi Latihan Semadi (Stamina) & Disiplin Beladiri */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="bg-[#11141e]/90 border border-stone-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="font-serif font-bold text-amber-200 text-base">Latihan Semadi (Stamina)</h3>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-xs font-mono text-amber-300">
                  {currentStamina} / {maxStamina} STA
                </div>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Pusatkan napas dan salurkan stamina fisikmu untuk menyerap Qi semesta secara langsung ke dantian tanpa perlu menunggu akumulasi pasif.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => staminaTrainMutation.mutate(10)}
                  disabled={staminaTrainMutation.isPending || currentStamina < 10 || isReadyForBreakthrough}
                  className="w-full p-3.5 rounded-xl bg-gradient-to-r from-[#1c1611] to-[#261f16] hover:from-[#2a2118] hover:to-[#382b1d] border border-amber-800/60 hover:border-amber-500/80 transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🧘</span>
                    <div className="text-left">
                      <div className="font-serif font-bold text-amber-200 text-sm">Semadi Qi Terarah</div>
                      <div className="text-[10px] text-stone-400">Konsumsi 10 Stamina • Qi Instan</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-700/50">
                    -10 STA
                  </span>
                </button>

                <button
                  onClick={() => staminaTrainMutation.mutate(30)}
                  disabled={staminaTrainMutation.isPending || currentStamina < 30 || isReadyForBreakthrough}
                  className="w-full p-3.5 rounded-xl bg-gradient-to-r from-[#1f161a] to-[#2d1b22] hover:from-[#2d1f25] hover:to-[#3e232f] border border-rose-900/60 hover:border-rose-500/80 transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">⚡</span>
                    <div className="text-left">
                      <div className="font-serif font-bold text-rose-200 text-sm">Semadi Intensif Dantian</div>
                      <div className="text-[10px] text-stone-400">Konsumsi 30 Stamina • Qi Melimpah</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-300 bg-rose-950/80 px-2.5 py-1 rounded border border-rose-700/50">
                    -30 STA
                  </span>
                </button>
              </div>
            </div>

            {/* Info Card Disiplin Beladiri */}
            <div className="rounded-2xl border border-stone-800 bg-[#0d1017]/90 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-300 font-serif font-bold text-sm">
                  <Sword className="w-4 h-4 text-amber-400" />
                  <span>6 Disiplin Beladiri & Manual</span>
                </div>
                <Link href="/skill-tree">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs">
                    Pohon Manual ➔
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Kembangkan kemahiran bertarung melalui pertarungan dunia nyata dan latihan kitab jurus esoteris.
              </p>
            </div>
          </div>
        </div>

        {/* Master Realm Roadmap Accordion */}
        <MasterRealmRoadmapAccordion currentRealmIdx={normRealmIdx} />

        {/* Heavenly Tribulation Modal */}
        <HeavenlyTribulationModal
          isOpen={tribulationModalOpen}
          onClose={() => setTribulationModalOpen(false)}
          tribulation={tribulationData}
          isSuccess={tribulationSuccess}
          message={tribulationMessage}
          newRealmName={tribulationNewRealm}
          newLevelCap={tribulationNewLevelCap}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // KASUS KHUSUS: MORTAL TAHAP 1 - 9 (LATIHAN STAMINA & PENGUMPULAN QI)
  // ═══════════════════════════════════════════════════════════════════
  const realmIdx = Number(realmData?.realmIdx) || 0;
  const stage = Number(realmData?.stage) || 1;
  const isMortalStage1To9 = (!lawData?.hasLaw) && (realmIdx === 0) && (stage < 10);

  if (isMortalStage1To9) {
    const currentQi = Math.floor(Number(realmData?.currentQi) || 0);
    const maxQi = Math.floor(Number(realmData?.maxQi) || 1000);
    const ratePerMinute = Math.max(1, Number(realmData?.ratePerMinute) || 1);
    const qiPercent = Math.min(100, Math.floor((currentQi / maxQi) * 100));
    const isReadyForBreakthrough = currentQi >= maxQi || Boolean(realmData?.isReadyForBreakthrough);
    const qiNeeded = Math.max(0, maxQi - currentQi);

    const currentLevel = livePlayer?.level || realmData?.currentLevel || 1;
    const currentLevelCap = realmData?.currentLevelCap || 20;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Max Level Cap Banner if reached Level 20 */}
        <MaxLevelCapBanner
          currentLevel={currentLevel}
          currentLevelCap={currentLevelCap}
          realmName="Fondasi Fana"
        />

        {/* Banner Ranah Fondasi Fana */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-600/40 bg-gradient-to-r from-[#171310] via-[#100e14] to-[#171310] p-5 sm:p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-600/30 to-amber-950/80 border-2 border-amber-500/60 flex items-center justify-center text-3xl shadow-inner shrink-0">
                🧘
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-amber-200 font-serif">
                    Chamber Meditasi Fondasi Fana
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/60 text-xs font-mono font-bold text-amber-300">
                    Tahap {stage} / 10
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-xs font-mono text-emerald-400">
                    Peluang Sukses: 100%
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed max-w-2xl">
                  Fondasi Fana adalah fase awal pemurnian daging raga. Latih pernapasan dantian dengan <strong className="text-amber-300">Stamina</strong> untuk mengumpulkan Qi semesta hingga mencapai batas terobosan tahap.
                </p>
              </div>
            </div>

            {/* Level & Stamina Badge */}
            <div className="flex flex-wrap items-center gap-3 shrink-0 self-end sm:self-center">
              <div className="px-3.5 py-2 rounded-xl bg-[#0c0f17] border border-amber-900/50 flex items-center gap-2 shadow-inner">
                <Award size={16} className="text-amber-400" />
                <div className="text-right">
                  <div className="text-[10px] text-stone-400 font-mono">Batas Level Fana</div>
                  <div className="text-sm font-bold font-mono text-amber-300">
                    Lv. {currentLevel} <span className="text-stone-500 text-xs">/ {currentLevelCap}</span>
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#0c0f17] border border-[#2d3748] flex items-center gap-2 shadow-inner">
                <Zap size={16} className="text-amber-400" />
                <div className="text-right">
                  <div className="text-[10px] text-stone-400 font-mono">Stamina Tersedia</div>
                  <div className="text-sm font-bold font-mono text-amber-300">
                    {currentStamina} <span className="text-stone-500 text-xs">/ {maxStamina} STA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2 Kolom: Status Qi & Aksi Semadi */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Kolom Kiri: Akumulasi Qi & Indikator Dantian */}
          <div className="lg:col-span-7 bg-[#11141e]/90 border border-[#4d3e28] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex justify-between items-center border-b border-[#2d2417] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                  <h3 className="font-serif font-bold text-amber-200 text-base">Akumulasi Qi Dantian</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-900/50">
                  <Clock size={12} />
                  <span>+{ratePerMinute} Qi / Menit</span>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-stone-300 font-semibold">Kapasitas Intisari Qi:</span>
                  <span className="text-amber-300 text-sm font-bold">
                    {currentQi.toLocaleString()} <span className="text-stone-500 text-xs">/ {maxQi.toLocaleString()} Qi ({qiPercent}%)</span>
                  </span>
                </div>

                <div className="w-full bg-[#07090e] rounded-full h-4 overflow-hidden border border-[#3e3422] p-0.5 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    style={{ width: `${qiPercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-stone-400 pt-1">
                  <span>{isReadyForBreakthrough ? '✨ Resonansi Penuh' : `Butuh ${qiNeeded.toLocaleString()} Qi lagi`}</span>
                  <span className="font-mono text-amber-400/90">{stage < 10 ? `Menuju Tahap ${stage + 1}` : 'Tahap Puncak'}</span>
                </div>
              </div>
            </div>

            {/* Tombol Terobosan Tahap */}
            <div className="pt-4 border-t border-[#2d2417]">
              {isReadyForBreakthrough ? (
                <button
                  onClick={() => mortalBreakthroughMutation.mutate()}
                  disabled={mortalBreakthroughMutation.isPending}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-serif font-bold text-base shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 transform hover:scale-[1.01] active:scale-[0.99] border border-amber-300"
                >
                  {mortalBreakthroughMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Menerobos Gerbang Meridian...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      <span>⚡ TEROBOS KE TAHAP {stage + 1} SEKARANG! (Peluang 100%)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-xl bg-[#0d1017] border border-stone-800 text-stone-500 font-serif font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-2 cursor-not-allowed">
                  <Lock size={15} />
                  <span>Dantian Belum Penuh (Kumpulkan Qi hingga 100% untuk Menerobos)</span>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Aksi Latihan dengan Stamina */}
          <div className="lg:col-span-5 bg-[#11141e]/90 border border-[#4d3e28] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#2d2417] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="font-serif font-bold text-amber-200 text-base">Latihan Semadi (Stamina)</h3>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-xs font-mono text-amber-300">
                  {currentStamina} / {maxStamina} STA
                </div>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed mb-4">
                Pusatkan napas dan salurkan stamina fisikmu untuk menyerap Qi semesta secara langsung ke dantian tanpa perlu menunggu akumulasi pasif.
              </p>

              <div className="space-y-3">
                {/* Opsi 1: Semadi Ringan (10 STA) */}
                <button
                  onClick={() => staminaTrainMutation.mutate(10)}
                  disabled={staminaTrainMutation.isPending || currentStamina < 10 || isReadyForBreakthrough}
                  className="w-full p-3.5 rounded-xl bg-gradient-to-r from-[#1c1611] to-[#261f16] hover:from-[#2a2118] hover:to-[#382b1d] border border-amber-800/60 hover:border-amber-500/80 transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🧘</span>
                    <div className="text-left">
                      <div className="font-serif font-bold text-amber-200 text-sm">Semadi Qi Terarah</div>
                      <div className="text-[10px] text-stone-400">Konsumsi 10 Stamina • Qi Instan</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-700/50">
                    -10 STA
                  </span>
                </button>

                {/* Opsi 2: Semadi Penuh (30 STA) */}
                <button
                  onClick={() => staminaTrainMutation.mutate(30)}
                  disabled={staminaTrainMutation.isPending || currentStamina < 30 || isReadyForBreakthrough}
                  className="w-full p-3.5 rounded-xl bg-gradient-to-r from-[#1f161a] to-[#2d1b22] hover:from-[#2d1f25] hover:to-[#3e232f] border border-rose-900/60 hover:border-rose-500/80 transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">⚡</span>
                    <div className="text-left">
                      <div className="font-serif font-bold text-rose-200 text-sm">Semadi Intensif Dantian</div>
                      <div className="text-[10px] text-stone-400">Konsumsi 30 Stamina • Qi Melimpah</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-300 bg-rose-950/80 px-2.5 py-1 rounded border border-rose-700/50">
                    -30 STA
                  </span>
                </button>
              </div>
            </div>

            {/* Catatan Gerbang Tahap 10 */}
            <div className="bg-[#0b0e14] border border-[#261f14] rounded-xl p-3 text-[11px] text-stone-400 space-y-1">
              <div className="text-amber-400 font-semibold flex items-center gap-1.5 font-serif">
                <Info size={13} /> Gerbang Tahap 10 (Puncak Mortal):
              </div>
              <p className="leading-snug">
                Begitu menembus hingga <strong className="text-stone-300">Tahap 10</strong> dan mencapai <strong className="text-amber-300">Max Level 20</strong>, Altar Pengikatan Hukum Semesta akan terbuka untuk menerobos ke Ranah Pemurnian Qi (Qi Refining).
              </p>
            </div>
          </div>

        </div>

        {/* Progresi Dinamis 10 Tahap Fondasi Fana */}
        <MortalStageRoadmap currentStage={stage || 1} />

        {/* Master Realm Roadmap Accordion */}
        <MasterRealmRoadmapAccordion currentRealmIdx={0} />

        {/* Heavenly Tribulation Modal */}
        <HeavenlyTribulationModal
          isOpen={tribulationModalOpen}
          onClose={() => setTribulationModalOpen(false)}
          tribulation={tribulationData}
          isSuccess={tribulationSuccess}
          message={tribulationMessage}
          newRealmName={tribulationNewRealm}
          newLevelCap={tribulationNewLevelCap}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // KASUS 1: PEMAIN TAHAP 10 / BELUM MEMILIH LAW → 2-SLOT DAO BINDING ALTAR
  // ═══════════════════════════════════════════════════════════════════
  if (!lawData?.hasLaw) {
    const mortalCurrentQi = Math.floor(Number(realmData?.currentQi) || 0);
    const mortalMaxQi = Math.floor(Number(realmData?.maxQi) || 1000);
    const mortalCurrentLevel = livePlayer?.level || realmData?.currentLevel || 1;
    const mortalLevelCap = 20;

    const isQiMet = mortalCurrentQi >= mortalMaxQi || Boolean(realmData?.isReadyForBreakthrough);
    const isLevelMet = mortalCurrentLevel >= mortalLevelCap;
    const isFoundationChosen = Boolean(lawData?.hasLaw || bindingData?.isNormalCultivator);

    const canBreakthroughToQiRefining = isQiMet && isLevelMet && isFoundationChosen;

    return (
      <div className="space-y-6">
        {/* Max Level Cap Banner if reached Level 20 */}
        <MaxLevelCapBanner
          currentLevel={mortalCurrentLevel}
          currentLevelCap={mortalLevelCap}
          realmName="Fondasi Fana (Puncak)"
        />

        {/* Banner Peringatan Fondasi Fana */}
        <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-black to-amber-950/40 p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-amber-500/20 p-3 text-amber-400 border border-amber-500/30 shrink-0">
              <Award className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-wide text-amber-300 font-serif">
                Altar Pengikatan Fondasi Fana (2-Slot Binding Altar)
              </h2>
              <p className="text-sm text-stone-300 leading-relaxed">
                Kultivator hanya dapat mematri <span className="font-semibold text-amber-300">1 Hukum Semesta Utama</span> ke dalam tubuh saat masih berada di <span className="text-amber-400 font-bold">Ranah Fondasi Fana (Mortal)</span>. Tempatkan Kitab Manual di <strong>Slot 1</strong> dan Item Persyaratan di <strong>Slot 2</strong>. Sekali diikat, keputusan ini bersifat <span className="text-red-400 font-bold">PERMANEN SEUMUR HIDUP</span>!
              </p>
            </div>
          </div>
        </div>

        {/* Gerbang Terobosan Agung: Menuju Ranah Pemurnian Qi (Qi Refining) */}
        <div className="rounded-2xl border-2 border-amber-600/60 bg-gradient-to-r from-[#17130e] via-[#11141e] to-[#17130e] p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold font-serif text-amber-200">
                    Gerbang Terobosan Agung: Ranah Pemurnian Qi (Qi Refining)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-300 font-mono">
                    Tahap 10 ➔ Ranah Index 1
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Syarat mutlak untuk menembus belenggu manusia fana menuju tatanan kultivator sejati.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-stone-800 text-right">
                <span className="text-[10px] text-stone-400 font-mono block">Level Karakter</span>
                <span className={`text-xs font-mono font-bold ${isLevelMet ? 'text-emerald-400' : 'text-amber-300'}`}>
                  Lv. {mortalCurrentLevel} / {mortalLevelCap}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-stone-800 text-right">
                <span className="text-[10px] text-stone-400 font-mono block">Peluang Sukses</span>
                <span className="text-xs font-mono font-bold text-emerald-400">100%</span>
              </div>
            </div>
          </div>

          {/* Checklist Prasyarat */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-xl border flex items-center justify-between ${isQiMet ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/20 border-rose-800/40 text-rose-300'}`}>
              <div className="flex items-center gap-2">
                {isQiMet ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>Akumulasi Qi (1.000)</span>
              </div>
              <span className="font-mono font-bold">{mortalCurrentQi.toLocaleString()} / 1.000</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${isLevelMet ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/20 border-rose-800/40 text-rose-300'}`}>
              <div className="flex items-center gap-2">
                {isLevelMet ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>Syarat Max Level 20</span>
              </div>
              <span className="font-mono font-bold">Lv. {mortalCurrentLevel} / 20</span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${isFoundationChosen ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-300' : 'bg-amber-950/20 border-amber-700/50 text-amber-300'}`}>
              <div className="flex items-center gap-2">
                {isFoundationChosen ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                <span>Pilihan Fondasi</span>
              </div>
              <span className="font-mono text-[11px] font-bold">
                {bindingData?.isNormalCultivator ? 'Kultivator Biasa' : (lawData?.hasLaw ? 'Hukum Terikat' : 'Pilih di Altar')}
              </span>
            </div>
          </div>

          {/* Tombol Terobosan Ranah jika syarat terpenuhi */}
          {canBreakthroughToQiRefining ? (
            <button
              onClick={() => mortalBreakthroughMutation.mutate()}
              disabled={mortalBreakthroughMutation.isPending}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-serif font-bold text-base shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 transform hover:scale-[1.01] active:scale-[0.99] border border-amber-300"
            >
              {mortalBreakthroughMutation.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Membuka Gerbang Pemurnian Qi...</span>
                </>
              ) : (
                <>
                  <Zap size={18} />
                  <span>⚡ TEROBOS KE RANAH PEMURNIAN QI (QI REFINING) SEKARANG!</span>
                </>
              )}
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-black/40 border border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-stone-300">
                <Info size={14} className="text-amber-400" />
                {!isLevelMet
                  ? `Level karakter belum mencapai Max Level 20 (Saat ini Lv. ${mortalCurrentLevel}/20). Latih level melalui pertarungan atau quest!`
                  : !isFoundationChosen
                  ? 'Gunakan Altar di bawah untuk mengikat salah satu dari 15 Hukum Semesta, ATAU pilih Jalur Kultivator Biasa.'
                  : !isQiMet
                  ? 'Kumpulkan Qi hingga mencapai 1.000 sebelum menerobos.'
                  : 'Selesaikan semua prasyarat di atas untuk membuka gerbang terobosan.'}
              </span>
              <span className="text-stone-500 font-mono text-[10px]">Tribulasi: Pembersihan Meridian (0 Dmg)</span>
            </div>
          )}
        </div>

        {/* Banner Pilihan Jalur Kultivator Biasa (Jika mencapai Tahap 10) */}
        {bindingData?.canChooseOrdinary && (
          <div className="relative overflow-hidden rounded-xl border border-stone-600 bg-stone-900/90 p-5 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-stone-800 p-3 text-stone-200 border border-stone-600 shrink-0 text-2xl">
                🥋
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold tracking-wide text-stone-200 font-serif">
                    Gerbang Tahap 10: Jalur Kultivator Biasa
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 border border-stone-600 text-stone-400 font-mono">
                    Alternatif Non-Hukum
                  </span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Kamu telah mencapai puncak fondasi fana. Kamu dapat memilih untuk melangkah sebagai Kultivator Biasa tanpa terikat Hukum Semesta.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOrdinaryConfirmModalOpen(true)}
              className="border-stone-500 hover:border-amber-400 hover:bg-stone-800 text-stone-200 font-serif text-xs shrink-0"
            >
              Lanjutkan Tanpa Hukum Semesta ➔
            </Button>
          </div>
        )}

        {/* 2-SLOT INTERACTIVE ALTAR */}
        {(() => {
          const reqConfig = selectedSlot1Item?.lawType ? bindingData?.requirementsMap?.[selectedSlot1Item.lawType] : null;
          const isSlot2Hidden = reqConfig && reqConfig.slot2Required === false;
          const slot1Meta = selectedSlot1Item?.lawType ? LAW_CATALOG.find(l => l.type === selectedSlot1Item.lawType) : null;
          const isBindReady = selectedSlot1Item && (isSlot2Hidden || selectedSlot2Item);

          return (
            <div className="relative rounded-2xl border-2 border-[#826b48] bg-gradient-to-b from-[#131722]/95 via-[#0c0f17]/95 to-[#080a10]/95 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* Subtle Ambient Halo */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

              <div className="text-center max-w-xl mx-auto mb-8 space-y-1">
                <span className="text-xs uppercase font-serif tracking-widest text-amber-400 font-bold">
                  ✦ Formasi Segel Langit Sembilan Tingkat ✦
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-amber-100">
                  Penyatuan Intisari Dao ke Dantian Fana
                </h3>
                <p className="text-xs text-stone-400">
                  {isSlot2Hidden
                    ? 'Hukum ini berfokus pada penempaan daging raga murni dan tidak membutuhkan item katalis di Slot 2.'
                    : 'Pilih Kitab Manual Hukum dari tas dan padukan dengan item persyaratan pembuka jalurnya.'}
                </p>
              </div>

              <div className={`grid grid-cols-1 ${isSlot2Hidden ? 'lg:grid-cols-1 max-w-2xl mx-auto' : 'lg:grid-cols-11'} gap-4 items-center`}>
                
                {/* SLOT 1: KITAB MANUAL HUKUM SEMESTA */}
                <div className={`${isSlot2Hidden ? 'w-full' : 'lg:col-span-5'} flex flex-col h-full`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-serif font-bold text-amber-300 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      SLOT 1: KITAB MANUAL HUKUM (TAS)
                    </span>
                    {selectedSlot1Item && (
                      <button
                        onClick={() => setSlot1PickerOpen(true)}
                        className="text-[11px] text-amber-400 hover:text-amber-200 underline font-serif"
                      >
                        Ganti Kitab
                      </button>
                    )}
                  </div>

                  {!selectedSlot1Item ? (
                    <div
                      onClick={() => setSlot1PickerOpen(true)}
                      className="flex-1 min-h-[220px] rounded-xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-black/40 hover:bg-amber-950/20 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
                    >
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform mb-3">
                        📜
                      </div>
                      <span className="font-serif font-bold text-sm text-amber-200 group-hover:text-amber-100">
                        Pilih Kitab Manual Hukum
                      </span>
                      <p className="text-xs text-stone-500 mt-1 max-w-xs">
                        Pilih Kitab Manual Hukum Semesta yang kamu miliki di tas inventori
                      </p>
                      <Button
                        size="sm"
                        className="mt-4 bg-amber-600/80 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                      >
                        Buka Tas Inventori
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`flex-1 min-h-[220px] rounded-xl border border-amber-500/60 bg-gradient-to-b ${slot1Meta?.bgGradient || 'from-amber-950/50 to-stone-900/80'} p-5 flex flex-col justify-between shadow-lg relative overflow-hidden`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl p-3 rounded-lg bg-black/60 border border-amber-500/30 shrink-0">
                          {slot1Meta?.icon || '📜'}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-base text-amber-200">
                              {selectedSlot1Item.name}
                            </h4>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-mono border"
                              style={{
                                borderColor: `${slot1Meta?.color || '#f59e0b'}50`,
                                color: slot1Meta?.color || '#f59e0b',
                                backgroundColor: `${slot1Meta?.color || '#f59e0b'}15`
                              }}
                            >
                              {slot1Meta?.element || selectedSlot1Item.rank}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800/80 border border-stone-700 text-amber-300 font-mono">
                              x{selectedSlot1Item.quantity} di Tas
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono block">
                            Hukum: {slot1Meta?.name || selectedSlot1Item.lawType} • {slot1Meta?.category?.toUpperCase() || 'MANUAL'}
                          </span>
                          <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                            {selectedSlot1Item.description || slot1Meta?.desc}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-stone-800 flex justify-between items-center text-xs mt-4">
                        <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                          <CheckCircle2 size={13} /> Kitab Terpasang di Slot 1
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSlot1PickerOpen(true)}
                          className="border-stone-700 text-stone-300 hover:text-white h-7 text-xs"
                        >
                          Ganti
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* CENTER CONNECTOR & SLOT 2 (Hanya jika Slot 2 Dibutuhkan) */}
                {!isSlot2Hidden && (
                  <>
                    {/* CENTER CONNECTOR (1 Col) */}
                    <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 lg:py-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-600 to-amber-900 border border-amber-400 flex items-center justify-center text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                        <Zap size={18} className="animate-pulse" />
                      </div>
                      <span className="text-[9px] font-serif text-amber-400 font-bold uppercase tracking-wider mt-1 hidden lg:block text-center">
                        Penyatuan
                      </span>
                    </div>

                    {/* SLOT 2: ITEM PERSYARATAN DARI TAS (5 Cols) */}
                    <div className="lg:col-span-5 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-serif font-bold text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          SLOT 2: ITEM PERSYARATAN (TAS)
                        </span>
                        {selectedSlot2Item && (
                          <button
                            onClick={() => setSlot2PickerOpen(true)}
                            className="text-[11px] text-amber-400 hover:text-amber-200 underline font-serif"
                          >
                            Ganti Item
                          </button>
                        )}
                      </div>

                      {!selectedSlot1Item ? (
                        <div className="flex-1 min-h-[220px] rounded-xl border-2 border-dashed border-stone-800 bg-black/20 flex flex-col items-center justify-center p-6 text-center text-stone-600">
                          <Lock size={32} className="mb-2 opacity-50" />
                          <span className="font-serif font-semibold text-xs text-stone-500">
                            Slot 2 Terkunci
                          </span>
                          <p className="text-[11px] text-stone-600 mt-1 max-w-xs">
                            Pilih Kitab Manual di Slot 1 terlebih dahulu untuk memunculkan persyaratan khusus.
                          </p>
                        </div>
                      ) : !selectedSlot2Item ? (
                        <div
                          onClick={() => setSlot2PickerOpen(true)}
                          className="flex-1 min-h-[220px] rounded-xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-black/40 hover:bg-amber-950/20 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
                        >
                          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform mb-3">
                            ✨
                          </div>
                          <span className="font-serif font-bold text-sm text-amber-200 group-hover:text-amber-100">
                            Pilih {reqConfig?.name || 'Item Persyaratan'}
                          </span>
                          <p className="text-xs text-stone-400 mt-1 max-w-xs">
                            Wajib memilih item pendukung atau katalis dari tas inventori untuk memicu penyatuan fondasi.
                          </p>
                          <Button
                            size="sm"
                            className="mt-4 bg-amber-600/80 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                          >
                            Buka Tas Persyaratan
                          </Button>
                        </div>
                      ) : (
                        <div className="flex-1 min-h-[220px] rounded-xl border border-amber-500/60 bg-[#121622]/90 p-5 flex flex-col justify-between shadow-lg">
                          <div className="space-y-3">
                            <div className="flex items-start gap-4">
                              <div className="text-3xl p-3 rounded-lg bg-black/60 border border-amber-500/30 shrink-0">
                                💎
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-serif font-bold text-base text-amber-200">
                                    {selectedSlot2Item.name}
                                  </h4>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-amber-300 font-mono">
                                    x{selectedSlot2Item.quantity} di Tas
                                  </span>
                                </div>
                                <span className="text-[10px] text-stone-400 font-mono block">
                                  Kategori: {selectedSlot2Item.category} • {selectedSlot2Item.rank}
                                </span>
                                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                                  {selectedSlot2Item.description || `Item pendukung untuk mengikat ${selectedSlot1Item.name}.`}
                                </p>
                              </div>
                            </div>

                            {/* Nama Julukan khusus bila companion / beast / artifact */}
                            {(selectedSlot1Item.lawType === 'natal_artifact' || selectedSlot1Item.lawType === 'natal_beast') && (
                              <div className="pt-2 border-t border-stone-800">
                                <label className="text-[11px] text-stone-400 block mb-1">
                                  Beri Nama Julukan Khusus (Opsional):
                                </label>
                                <input
                                  type="text"
                                  maxLength={30}
                                  value={customEntityName}
                                  onChange={(e) => setCustomEntityName(e.target.value)}
                                  placeholder={`Contoh: ${selectedSlot2Item.name} Abadi`}
                                  className="w-full rounded bg-stone-950 border border-stone-800 px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-serif"
                                />
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-stone-800 flex justify-between items-center text-xs mt-3">
                            <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                              <CheckCircle2 size={13} /> Item Terpasang di Slot 2
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSlot2PickerOpen(true)}
                              className="border-stone-700 text-stone-300 hover:text-white h-7 text-xs"
                            >
                              Ganti
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

              </div>

              {/* ACTION BUTTON & WARNING */}
              <div className="mt-8 pt-6 border-t border-[#4a3d28] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-stone-400 flex items-center gap-2 max-w-lg">
                  <Info className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    <strong>Keputusan Abadi:</strong> Item di Slot 1 dan Slot 2 akan dikonsumsi permanen dari tas. Setelah dipatri, dantian terkunci pada hukum ini seumur hidup.
                  </span>
                </div>

                <Button
                  size="lg"
                  disabled={!isBindReady}
                  onClick={handleExecuteBind}
                  className={`font-serif font-bold tracking-wider px-8 shadow-xl transition-all ${
                    isBindReady
                      ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95'
                      : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                  }`}
                >
                  ⚡ PATRI HUKUM SEMESTA KE DANTIAN FANA
                </Button>
              </div>
            </div>
          );
        })()}

        {/* MODAL PICKER SLOT 1: KITAB MANUAL HUKUM DARI INVENTORI */}
        <Modal
          isOpen={slot1PickerOpen}
          onClose={() => setSlot1PickerOpen(false)}
          title="Pilih Kitab Manual Hukum Semesta (Tas Inventori)"
        >
          <div className="space-y-4 p-1 text-stone-200 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <p className="text-xs text-stone-400">
              Pilih Kitab Manual Hukum Semesta yang kamu miliki di tas untuk dipatrikan ke dantian fana:
            </p>

            {(!bindingData?.slot1Manuals || bindingData.slot1Manuals.length === 0) ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-stone-800 bg-stone-950/60 space-y-3">
                <div className="text-4xl">📭</div>
                <h5 className="font-serif font-bold text-stone-300 text-sm">
                  Tidak Ada Kitab Manual di Tas Inventori
                </h5>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Kamu belum memiliki Kitab Manual Hukum Semesta di tas. Kitab dapat diperoleh dari hadiah quest, eksplorasi gua kuno, drop monster langka, atau pasar Jianghu.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bindingData.slot1Manuals.map((manual: any) => {
                  const meta = LAW_CATALOG.find(l => l.type === manual.lawType);
                  const isSelected = selectedSlot1Item?.itemId === manual.itemId;
                  return (
                    <button
                      key={manual.inventoryId}
                      type="button"
                      onClick={() => {
                        setSelectedSlot1Item(manual);
                        setSelectedSlot2Item(null);
                        setCustomEntityName('');
                        setSlot1PickerOpen(false);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'border-stone-800 bg-[#121622]/80 hover:border-stone-700 hover:bg-[#181d2a]'
                      }`}
                    >
                      <div className="text-2xl p-2 rounded bg-black/60 border border-stone-700 shrink-0">
                        {meta?.icon || '📜'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-serif font-bold text-xs text-amber-200">
                            {manual.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-amber-950/40 border border-amber-500/40 text-amber-300">
                            x{manual.quantity}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                          {manual.description || meta?.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>

        {/* MODAL PICKER SLOT 2: ITEM PERSYARATAN DARI INVENTORI */}
        <Modal
          isOpen={slot2PickerOpen}
          onClose={() => setSlot2PickerOpen(false)}
          title={`Pilih Item Persyaratan (${bindingData?.requirementsMap?.[selectedSlot1Item?.lawType]?.name || 'Katalis'})`}
        >
          <div className="space-y-4 p-1 text-stone-200 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <p className="text-xs text-stone-400">
              Pilih item persyaratan yang kamu miliki di tas untuk pengikatan <strong>{selectedSlot1Item?.name}</strong>:
            </p>

            {(() => {
              const req = bindingData?.requirementsMap?.[selectedSlot1Item?.lawType];
              const tag = req?.tag;
              const filtered = (bindingData?.slot2Items || []).filter((item: any) => {
                if (!tag) return true;
                if (tag === 'common_artifact') {
                  return item.category === 'weapon' || item.rank === 'Common' || (item.tags && item.tags.includes('common_artifact'));
                }
                if (tag === 'common_beast') {
                  return item.category === 'pet' || item.rank === 'Common' || (item.tags && item.tags.includes('common_beast'));
                }
                return (item.tags && item.tags.includes(tag)) || (item.tags && item.tags.includes('catalyst')) || item.category === 'material';
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center rounded-xl border border-dashed border-stone-800 bg-stone-950/60 space-y-3">
                    <div className="text-4xl">⚠️</div>
                    <h5 className="font-serif font-bold text-stone-300 text-sm">
                      Item Persyaratan Tidak Ditemukan di Tas
                    </h5>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                      Kamu belum memiliki item yang memenuhi syarat: <strong className="text-amber-300">{req?.name}</strong>. Temukan item ini dari eksplorasi atau beli di pasar sebelum melanjutkan.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.map((item: any) => {
                    const isSelected = selectedSlot2Item?.itemId === item.itemId;
                    return (
                      <button
                        key={item.inventoryId}
                        type="button"
                        onClick={() => {
                          setSelectedSlot2Item(item);
                          setSlot2PickerOpen(false);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'border-stone-800 bg-[#121622]/80 hover:border-stone-700 hover:bg-[#181d2a]'
                        }`}
                      >
                        <div className="text-2xl p-2 rounded bg-black/60 border border-stone-700 shrink-0">
                          {item.category === 'weapon' ? '🗡️' : item.category === 'pet' ? '🐾' : '💎'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-serif font-bold text-xs text-amber-200">
                              {item.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-stone-800 border border-stone-700 text-stone-300">
                              x{item.quantity}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono block mt-0.5">
                            Rank: {item.rank} • {item.category}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </Modal>

        {/* MODAL KONFIRMASI JALUR KULTIVATOR BIASA */}
        <Modal
          isOpen={ordinaryConfirmModalOpen}
          onClose={() => setOrdinaryConfirmModalOpen(false)}
          title="Konfirmasi Jalur Kultivator Biasa"
        >
          <div className="space-y-4 p-2 text-stone-200">
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="space-y-1">
                <h5 className="font-serif font-bold text-amber-300 text-sm">
                  Peringatan Pilihan Permanen
                </h5>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Apakah kamu yakin ingin melangkah maju sebagai <strong>Kultivator Biasa (Tanpa Hukum Semesta)</strong>?
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-stone-400 bg-black/40 p-4 rounded-xl border border-stone-800">
              <p className="font-semibold text-stone-200">Konsekuensi Keputusan Ini:</p>
              <ul className="list-disc pl-5 space-y-1 text-stone-400">
                <li>Dantian fana tidak akan terikat kontrak dengan 15 Hukum Semesta semesta raya.</li>
                <li>Stat tempur dasar (HP, MP, ATK, DEF, SPD) disesuaikan sebesar <strong className="text-amber-300">× 0.95</strong> secara permanen.</li>
                <li>Kamu tidak menggunakan Pohon Jurus Hukum Semesta, melainkan mengandalkan jurus manual beladiri fana (Martial Arts) dan senjata.</li>
                <li>Pilihan ini bersifat permanen dan tidak dapat diubah setelah disetujui.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-stone-800">
              <Button
                variant="outline"
                onClick={() => setOrdinaryConfirmModalOpen(false)}
                className="border-stone-700 text-stone-300 text-xs"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmOrdinary}
                className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
              >
                ⚡ Ya, Lanjutkan Sebagai Kultivator Biasa
              </Button>
            </div>
          </div>
        </Modal>

        {/* ENSIKLOPEDIA 15 HUKUM SEMESTA (COLLAPSIBLE ACCORDION) */}
        <details className="group border border-stone-800/80 rounded-xl bg-[#0e121a]/60 p-4 transition-all">
          <summary className="cursor-pointer font-serif font-semibold text-sm text-stone-400 hover:text-amber-300 flex items-center justify-between select-none">
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              📖 Ensiklopedia 15 Hukum Semesta (Referensi Lore & Sifat Beladiri)
            </span>
            <span className="text-xs text-amber-400 font-mono group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-4 mt-3 border-t border-stone-800">
            {LAW_CATALOG.map((law) => (
              <div
                key={law.type}
                className="p-3 rounded-lg border border-stone-800/60 bg-black/40 text-xs space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{law.icon}</span>
                  <span className="font-serif font-bold text-stone-200">{law.name}</span>
                </div>
                <span
                  className="inline-block text-[10px] px-1.5 py-0.2 rounded border font-mono"
                  style={{ borderColor: `${law.color}40`, color: law.color }}
                >
                  {law.element}
                </span>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  {law.desc}
                </p>
              </div>
            ))}
          </div>
        </details>

        {/* Progresi Dinamis 10 Tahap Fondasi Fana */}
        <MortalStageRoadmap currentStage={10} />

        {/* Master Realm Roadmap Accordion */}
        <MasterRealmRoadmapAccordion currentRealmIdx={0} />

        {/* Heavenly Tribulation Modal */}
        <HeavenlyTribulationModal
          isOpen={tribulationModalOpen}
          onClose={() => setTribulationModalOpen(false)}
          tribulation={tribulationData}
          isSuccess={tribulationSuccess}
          message={tribulationMessage}
          newRealmName={tribulationNewRealm}
          newLevelCap={tribulationNewLevelCap}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // KASUS 2: PEMAIN SUDAH MEMILIKI LAW AKTIF → DASHBOARD TERPADU
  // ═══════════════════════════════════════════════════════════════════
  const energyLabel = lawData.qiType === 'true_qi' ? 'True Qi (真气)' : 'Qi Spiritual (灵气)';
  const skillsList = skillsRes?.data?.skills || [];
  const availablePoints = skillsRes?.data?.availablePoints ?? lawData.lawSkillPoints;

  // English Wuxia Law Rank Title
  const activeLawTypeKey = lawData.activeLawType || '';
  const englishRankName = (LAW_RANK_NAMES_EN[activeLawTypeKey] && LAW_RANK_NAMES_EN[activeLawTypeKey][lawData.rank - 1])
    || lawData.rankDisplayName
    || 'Mortal Foundation';

  return (
    <div className="space-y-6">
      {/* Max Level Cap Banner if reached Level Cap of this Realm */}
      <MaxLevelCapBanner
        currentLevel={livePlayer?.level || 1}
        currentLevelCap={lawData.characterLevelCap || (20 + lawData.rank * 20)}
        realmName={lawData.rankDisplayName}
        canBreakthrough={lawData.canMajorBreakthrough}
        onNavigateBreakthrough={() => {
          const el = document.getElementById('major-breakthrough-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 1. UNIFIED HERO CARD: LAW CULTIVATION & REALM MASTER BANNER */}
      <Card className="relative overflow-hidden border border-amber-500/40 bg-gradient-to-r from-[#17120c] via-black to-[#17120c] p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-b from-amber-500/20 to-black border-2 border-amber-400/60 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/20">
                📜
              </div>
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-stone-950 font-bold text-[10px] px-1.5 py-0.5 rounded shadow">
                R{lawData.rank} S{lawData.stage}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-bold font-serif text-amber-200 tracking-wide">
                  {lawData.lawName}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {lawData.category?.toUpperCase()}
                </span>
              </div>
              <p className="text-base text-stone-200 font-serif flex items-center flex-wrap gap-2">
                <span>Realm:</span>
                <span className="font-bold text-amber-300 text-lg sm:text-xl drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)]">
                  {englishRankName}
                </span>
                <span className="text-xs text-amber-400/90 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                  Stage {lawData.stage}/9
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Kapasitas Level: <strong className="text-amber-300 font-mono">Lv. {lawData.characterLevelCap}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Poin Jurus Law: <strong className="text-amber-300 font-mono">{availablePoints}</strong>
                </span>
                <span className="flex items-center gap-1.5 font-mono text-stone-400">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Laju Intisari: <strong className="text-stone-200">+{lawData.channelRatePerMinute} {lawData.qiType === 'true_qi' ? 'True Qi' : 'Qi'}/mnt</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Channeling & Breakthrough) */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            {lawData.canClaimEpiphany && (
              <Button
                size="sm"
                onClick={() => dailyClaimMutation.mutate()}
                disabled={dailyClaimMutation.isPending}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-stone-950 font-bold border border-emerald-300/40 shadow text-xs"
              >
                ✨ Klaim Pencerahan Harian
              </Button>
            )}

            <Button
              variant={lawData.isChanneling ? "outline" : "default"}
              size="sm"
              onClick={() => channelMutation.mutate(lawData.isChanneling ? 'stop' : 'start')}
              disabled={channelMutation.isPending}
              className={lawData.isChanneling
                ? "border-red-500/50 text-red-400 hover:bg-red-950/40 text-xs"
                : "bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"}
            >
              {lawData.isChanneling ? "⏹️ Hentikan Meditasi" : "🧘 Mulai Meditasi"}
            </Button>

            <Button
              size="sm"
              onClick={() => miniBreakthroughMutation.mutate()}
              disabled={!lawData.canMiniBreakthrough || miniBreakthroughMutation.isPending}
              className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-bold border border-yellow-300/40 shadow text-xs"
            >
              ⚡ Terobos Stage (+2 LvCap)
            </Button>

            {lawData.stage === 9 && (
              <Button
                size="sm"
                onClick={() => majorBreakthroughMutation.mutate()}
                disabled={!lawData.canMajorBreakthrough || majorBreakthroughMutation.isPending}
                className="bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold border border-purple-400/50 shadow-lg shadow-purple-500/20 text-xs"
              >
                🌩️ Penerobosan Agung Rank
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar Qi / True Qi */}
        <div className="mt-6 pt-5 border-t border-stone-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-300 flex items-center gap-1.5 font-serif">
              <Flame className="w-4 h-4 text-amber-500" /> Akumulasi {energyLabel}
            </span>
            <span className="font-mono text-stone-400">
              <strong className="text-amber-300">{Math.floor(lawData.qi).toLocaleString()}</strong> / {lawData.maxQi.toLocaleString()} ({lawData.qiProgressPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-stone-950 rounded-full overflow-hidden border border-stone-800 relative">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, lawData.qiProgressPercent)}%` }}
            />
          </div>
        </div>

        {/* Daily Channeling Cap & Streak Bar */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-stone-950/60 p-3 rounded-lg border border-stone-800/80">
          <div className="flex items-center gap-2 text-stone-400">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              Cap Meditasi Harian: <strong className="text-stone-200 font-mono">{lawData.channelMinutesUsedToday}</strong> / {lawData.dailyChannelCapMinutes} mnt
            </span>
          </div>
          <div className="flex items-center gap-2 text-stone-400">
            <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span>
              Login Streak: <strong className="text-orange-400 font-mono">{lawData.loginStreak} Hari</strong> (+{lawData.streakBonusMinutes} mnt bonus)
            </span>
          </div>
          <div className="flex items-center gap-2 text-stone-400 justify-start md:justify-end">
            <span className="font-serif text-[11px] text-emerald-400/90 flex items-center gap-1">
              <CheckCircle2 size={13} /> Fondasi Dantian Sempurna
            </span>
          </div>
        </div>
      </Card>

      {/* CTA Link ke Skill Tree Mandiri */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-stone-800 bg-stone-950/50 backdrop-blur-md">
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <TreePine className="w-4 h-4 text-emerald-400" />
          <span className="font-serif">Pohon Jurus Law ({lawData.combatLoadout?.length || 0}/4 Equipped)</span>
          {availablePoints > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-mono text-[10px] font-bold flex items-center justify-center">
              {availablePoints}
            </span>
          )}
        </div>
        <Link href="/skill-tree">
          <Button size="sm" className="bg-emerald-600/80 hover:bg-emerald-500 text-stone-950 font-bold text-xs">
            🌳 Buka Pohon Jurus <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>

      {/* RINCIAN SPESIALISASI LAW (Selalu tampil, tanpa sub-tab) */}
      {
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. SISI KIRI: SPESIALISASI INTERAKTIF SESUAI HUKUM */}

            {/* KASUS A: PENEMPAAN RAGA SUCI (9 BAGIAN RAGA) */}
            {lawData.activeLawType === 'body_tempering' && (
              <Card className="border border-amber-500/40 bg-stone-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-lg bg-amber-950/40 border border-amber-500/30">💪</span>
                    <div>
                      <h3 className="font-serif font-bold text-base text-amber-200">
                        Penempaan 9 Bagian Raga Suci
                      </h3>
                      <p className="text-xs text-stone-400">
                        Memeras daging fana & mandi rempah untuk memproduksi <strong className="text-amber-400">True Qi (真气)</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 9 Bagian Tubuh Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {BODY_PARTS_INFO.map((part) => {
                    const progress = lawData.bodyTemperingParts?.[part.id] || 0;
                    const isSelected = selectedBodyPart === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => setSelectedBodyPart(part.id)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/10'
                            : 'border-stone-800 bg-black/40 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base">{part.icon}</span>
                          <span className="font-mono text-[10px] text-amber-300 font-bold">{progress}%</span>
                        </div>
                        <div className="text-xs font-serif font-semibold text-stone-200 truncate">
                          {part.name.split(' ')[0]}
                        </div>
                        <div className="w-full h-1 bg-stone-800 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-600 to-yellow-400"
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Info Bagian Terpilih & Aksi Tempa */}
                {(() => {
                  const currentPart = BODY_PARTS_INFO.find(p => p.id === selectedBodyPart) || BODY_PARTS_INFO[0];
                  const currentProgress = lawData.bodyTemperingParts?.[currentPart.id] || 0;
                  return (
                    <div className="bg-black/50 p-3.5 rounded-lg border border-stone-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-serif font-bold text-amber-300 flex items-center gap-1.5">
                          <span>{currentPart.icon}</span> {currentPart.name}
                        </span>
                        <span className="font-mono text-stone-400">Tingkat Penempaan: {currentProgress}%</span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed">
                        {currentPart.desc}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => lawActionMutation.mutate({ endpoint: 'body/temper', payload: { part: currentPart.id } })}
                          disabled={lawActionMutation.isPending}
                          className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs py-1.5 h-auto"
                        >
                          💪 Tempa Bagian Ini (-15 Copper, +10%, +50 True Qi)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => lawActionMutation.mutate({ endpoint: 'body/gather-essence' })}
                          disabled={lawActionMutation.isPending}
                          className="border-stone-700 text-stone-300 hover:bg-stone-800 text-xs py-1.5 h-auto"
                        >
                          🔥 Peras Intisari Fisik (-15 Vit, +75 True Qi)
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}

            {/* KASUS B: GU MASTER (SEPULUH RIBU GU) */}
            {lawData.activeLawType === 'gu_master' && (
              <Card className="border border-emerald-500/40 bg-stone-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">🪱</span>
                    <div>
                      <h3 className="font-serif font-bold text-base text-emerald-300">
                        Rongga Serangga Gu Purba (Gu Aperture)
                      </h3>
                      <p className="text-xs text-stone-400">
                        Memberi pakan herba beracun dan memfusikan cacing Gu demi mutasi biologis.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {(lawData.guSlots && lawData.guSlots.length > 0 ? lawData.guSlots : [
                    { guName: 'Gu Cacing Sutra Roh', guType: 'healing', level: 1, hunger: 80 }
                  ]).map((gu, gIdx) => (
                    <div key={gIdx} className="bg-black/50 p-3.5 rounded-lg border border-stone-800 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-serif font-bold text-stone-200 text-xs flex items-center gap-1.5">
                          <span>🐛</span> {gu.guName} <span className="font-mono text-[10px] text-emerald-400 font-normal">(Lv. {gu.level})</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono">Tipe: {gu.guType}</span>
                        <div className="w-28 h-1.5 bg-stone-800 rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${Math.min(100, gu.hunger || 50)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => lawActionMutation.mutate({ endpoint: 'gu/feed', payload: { slotIndex: gIdx } })}
                          disabled={lawActionMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs py-1 h-auto"
                        >
                          🍖 Beri Pakan (-10 C)
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-stone-800 flex justify-between items-center">
                  <span className="text-xs text-stone-400">Fusi Eksperimental Rongga:</span>
                  <Button
                    size="sm"
                    onClick={() => lawActionMutation.mutate({ endpoint: 'gu/fuse' })}
                    disabled={lawActionMutation.isPending}
                    className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-stone-950 font-bold text-xs py-1.5 h-auto shadow"
                  >
                    🔄 Fusi Dua Gu (+120 Qi)
                  </Button>
                </div>
              </Card>
            )}

            {/* KASUS C: PUSAKA JIWA KELAHIRAN (NATAL ARTIFACT) */}
            {lawData.activeLawType === 'natal_artifact' && (
              <Card className="border border-amber-500/40 bg-stone-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-lg bg-amber-950/40 border border-amber-500/30">🗡️</span>
                    <div>
                      <h3 className="font-serif font-bold text-base text-amber-300">
                        {lawData.boundEntity?.customName || lawData.boundEntity?.originalName || 'Pusaka Jiwa Kelahiran'}
                      </h3>
                      <p className="text-xs text-stone-400">
                        Pusaka jiwa yang ditempa seumur hidup, tumbuh seiring kehendak pendekar.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-black/40 p-4 rounded-lg border border-stone-800 text-xs">
                  <div className="flex justify-between text-stone-300">
                    <span>Tahap Evolusi:</span>
                    <strong className="text-amber-400 font-serif">{lawData.boundEntity?.evolutionStage || 'Fana (Mortal)'}</strong>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Tingkat Pusaka:</span>
                    <strong className="text-stone-200 font-mono">Rank {lawData.boundEntity?.rankLevel || 0}</strong>
                  </div>
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-stone-400 text-[11px]">
                      <span>Intisari Jiwa Pusaka:</span>
                      <span className="font-mono text-amber-300">
                        {lawData.boundEntity?.essence || 0} / {lawData.boundEntity?.maxEssence || 100}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-full"
                        style={{ width: `${Math.min(100, ((lawData.boundEntity?.essence || 0) / (lawData.boundEntity?.maxEssence || 100)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => lawActionMutation.mutate({ endpoint: 'artifact/infuse' })}
                  disabled={lawActionMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs py-2 h-auto"
                >
                  🗡️ Asah & Salurkan Qi Pusaka (-5 Copper, +20 Intisari, +45 Qi)
                </Button>
              </Card>
            )}

            {/* KASUS D: SATWA ROH KELAHIRAN (NATAL BEAST) */}
            {lawData.activeLawType === 'natal_beast' && (
              <Card className="border border-amber-500/40 bg-stone-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-lg bg-amber-950/40 border border-amber-500/30">🐾</span>
                    <div>
                      <h3 className="font-serif font-bold text-base text-amber-300">
                        {lawData.boundEntity?.customName || lawData.boundEntity?.originalName || 'Satwa Roh Kelahiran'}
                      </h3>
                      <p className="text-xs text-stone-400">
                        Sahabat darah yang bertarung di sisimu di setiap medan pertempuran.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-black/40 p-3 rounded-lg border border-stone-800 space-y-1">
                    <span className="text-stone-500 block text-[10px]">Kondisi HP Satwa:</span>
                    <strong className="text-emerald-400 font-mono text-sm">
                      {lawData.boundEntity?.beastCurrentHp || 120} / {lawData.boundEntity?.beastMaxHp || 120}
                    </strong>
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg border border-stone-800 space-y-1">
                    <span className="text-stone-500 block text-[10px]">Tahap Evolusi:</span>
                    <strong className="text-amber-300 font-serif">
                      {lawData.boundEntity?.evolutionStage || 'Feral Liar'} (R{lawData.boundEntity?.rankLevel || 0})
                    </strong>
                  </div>
                </div>

                <div className="bg-black/40 p-3 rounded-lg border border-stone-800 flex justify-between items-center text-xs">
                  <span className="text-stone-400">Statistik Satwa:</span>
                  <span className="font-mono text-amber-300">
                    ATK {lawData.boundEntity?.beastAtk || 18} | DEF {lawData.boundEntity?.beastDef || 12} | SPD {lawData.boundEntity?.beastSpd || 14}
                  </span>
                </div>

                <Button
                  size="sm"
                  onClick={() => lawActionMutation.mutate({ endpoint: 'beast/feed' })}
                  disabled={lawActionMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs py-2 h-auto"
                >
                  🍖 Beri Pakan Daging Roh (-10 Copper, HP Penuh, +25 Intisari, +40 Qi)
                </Button>
              </Card>
            )}

            {/* KASUS E: JALUR IBLIS (DEMONIC DAO LAWS) */}
            {lawData.category === 'demonic' && (
              <Card className="border border-red-500/40 bg-stone-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-lg bg-red-950/40 border border-red-500/30">👹</span>
                    <div>
                      <h3 className="font-serif font-bold text-base text-red-300">
                        Ritual Kultivasi Iblis & Tabu Jianghu
                      </h3>
                      <p className="text-xs text-stone-400">
                        Kekuatan dahsyat berbalut kutukan karma dan hawa kematian.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Konten Khusus per Demonic Law */}
                {lawData.activeLawType === 'demonic_turbid_core' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs bg-black/40 p-3 rounded-lg border border-stone-800">
                      <div>
                        <span className="text-stone-500 block">Inti Dilahap:</span>
                        <strong className="text-stone-200 font-mono">{lawData.demonicData?.turbidCoresConsumed || 0} Inti</strong>
                      </div>
                      <div>
                        <span className="text-stone-500 block">Korupsi Batin:</span>
                        <strong className="text-red-400 font-mono">{lawData.demonicData?.corruptionIndex || 0}%</strong>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => lawActionMutation.mutate({ endpoint: 'demonic/turbid-absorb' })}
                      disabled={lawActionMutation.isPending}
                      className="w-full bg-red-700 hover:bg-red-600 text-white font-bold text-xs py-2 h-auto"
                    >
                      💀 Lahap Inti Siluman (+80 Qi, +3 Korupsi)
                    </Button>
                  </div>
                )}

                {lawData.activeLawType === 'demonic_blood_soul' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs bg-black/40 p-3 rounded-lg border border-stone-800">
                      <div>
                        <span className="text-stone-500 block text-[10px]">Botol Darah:</span>
                        <strong className="text-rose-400 font-mono">{lawData.demonicData?.bloodEssenceVials || 0}</strong>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[10px]">Arwah Panji:</span>
                        <strong className="text-purple-400 font-mono">{lawData.demonicData?.soulBannerCaptures || 0}</strong>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[10px]">Status Buronan:</span>
                        <strong className="text-red-400 font-mono">{lawData.demonicData?.infamy || 0}</strong>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => lawActionMutation.mutate({ endpoint: 'demonic/blood-harvest' })}
                        disabled={lawActionMutation.isPending}
                        className="bg-rose-800 hover:bg-rose-700 text-white font-bold text-xs py-1.5 h-auto"
                      >
                        🩸 Panen Esensi Darah (+65 Qi)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => lawActionMutation.mutate({ endpoint: 'demonic/soul-banner' })}
                        disabled={lawActionMutation.isPending}
                        className="bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs py-1.5 h-auto"
                      >
                        👻 Segel Arwah ke Panji (+70 Qi)
                      </Button>
                    </div>
                  </div>
                )}

                {lawData.activeLawType === 'demonic_myriad_venom' && (
                  <div className="space-y-3">
                    <div className="bg-black/40 p-3 rounded-lg border border-stone-800 flex justify-between items-center text-xs">
                      <span className="text-stone-400">Tingkat Imunitas Racun Tubuh:</span>
                      <strong className="text-emerald-400 font-mono">Lv. {lawData.demonicData?.venomToxinLevel || 0}</strong>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => lawActionMutation.mutate({ endpoint: 'demonic/venom-ingest' })}
                      disabled={lawActionMutation.isPending}
                      className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs py-2 h-auto"
                    >
                      🧪 Tenggak Racun Maut (+1 Toleransi Racun, +75 Qi)
                    </Button>
                  </div>
                )}

                {lawData.activeLawType === 'demonic_abyssal_pact' && (
                  <div className="space-y-3">
                    <div className="bg-black/40 p-3 rounded-lg border border-stone-800 flex justify-between items-center text-xs">
                      <span className="text-stone-400">Tenggat Upeti Jurang Abyss:</span>
                      <strong className="text-purple-300 font-mono">
                        {lawData.demonicData?.abyssalTributeDueAt ? new Date(lawData.demonicData.abyssalTributeDueAt).toLocaleDateString() : 'Belum Ada Upeti'}
                      </strong>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => lawActionMutation.mutate({ endpoint: 'demonic/pact-tribute' })}
                      disabled={lawActionMutation.isPending}
                      className="w-full bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-500/30 font-bold text-xs py-2 h-auto"
                    >
                      📜 Setor Upeti Kurban (-20 Copper, Perpanjang 7 Hari, +80 Qi)
                    </Button>
                  </div>
                )}

                {lawData.activeLawType === 'demonic_nether_darkness' && (
                  <div className="space-y-3">
                    <div className="bg-black/40 p-3 rounded-lg border border-stone-800 flex justify-between items-center text-xs">
                      <span className="text-stone-400">Resonansi Kubur Yin Nether:</span>
                      <strong className="text-indigo-400 font-mono">Aura Kematian Dingin</strong>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => lawActionMutation.mutate({ endpoint: 'demonic/nether-channel' })}
                      disabled={lawActionMutation.isPending}
                      className="w-full bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/30 font-bold text-xs py-2 h-auto"
                    >
                      🌑 Salurkan Hawa Dingin Kubur (+85 Qi, -5 Mood)
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* KASUS F: JALUR 6 ELEMEN DAO (DIVINE ELEMENTAL) */}
            {lawData.category === 'elemental' && (
              <Card className="border border-blue-500/40 bg-stone-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-lg bg-blue-950/40 border border-blue-500/30">🌀</span>
                    <div>
                      <h3 className="font-serif font-bold text-base text-blue-200">
                        Resonansi Elemen Dao: {lawData.element || 'Intisari Semesta'}
                      </h3>
                      <p className="text-xs text-stone-400">
                        Menyelaraskan meridian dengan denyut elemen langit dan bumi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs bg-black/40 p-4 rounded-lg border border-stone-800">
                  <div className="flex justify-between text-stone-300">
                    <span>Penetrasi Serangan Elemen:</span>
                    <strong className="text-cyan-400 font-mono">+{(lawData.rank + 1) * 3}%</strong>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Resistensi Elemen Terkait:</span>
                    <strong className="text-emerald-400 font-mono">+{(lawData.rank + 1) * 5}%</strong>
                  </div>
                  <div className="flex justify-between text-stone-300">
                    <span>Bonus Pertumbuhan Akar Spiritual:</span>
                    <strong className="text-amber-400 font-mono">+{8 + (lawData.rank * 2)} XP per Aksi</strong>
                  </div>
                </div>

                <p className="text-[11px] text-stone-500 leading-relaxed italic">
                  *Kultivator elemen menguasai cuaca dan resonansi spasial di atas grid Tale of Immortal.
                </p>
              </Card>
            )}

            {/* 2. SISI KANAN: KARTU SYARAT BREAKTHROUGH & TRIBULASI */}
            <Card className="border border-stone-800 bg-stone-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <h3 className="font-serif font-bold text-base text-amber-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  {lawData.stage < 9 ? `Syarat Mini-Breakthrough Stage ${lawData.stage + 1}` : `Penerobosan Agung Rank ${lawData.rank + 1}`}
                </h3>
                <span className="text-xs font-mono text-stone-500">
                  {lawData.stage < 9 ? 'Tahap Menengah' : 'Puncak Ranah'}
                </span>
              </div>

              {lawData.stage < 9 ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-stone-800/80 text-stone-300">
                    <span>Peluang Keberhasilan:</span>
                    <strong className="text-emerald-400 font-mono">{lawData.miniBreakthroughSuccessRate}%</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-800/80 text-stone-300">
                    <span>Konsumsi Vitality & Mood:</span>
                    <span className="font-mono text-stone-400">
                      Vitality -{lawData.miniBreakthroughCost?.vitalityCost || 15} | Mood -{lawData.miniBreakthroughCost?.moodCost || 15}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-800/80 text-stone-300">
                    <span>Biaya Material:</span>
                    <span className="font-mono text-amber-400">
                      {lawData.miniBreakthroughCost?.silverCost || 5} Silver ({lawData.miniBreakthroughCost?.materialName || 'Herba Penguat Qi'})
                    </span>
                  </div>
                  <div className="pt-2">
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      *Mini-breakthrough stage memberi kepuasan langsung: +2 Level Cap Karakter, +1 Poin Skill Law, dan lonjakan statistik tempur.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => miniBreakthroughMutation.mutate()}
                    disabled={!lawData.canMiniBreakthrough || miniBreakthroughMutation.isPending}
                    className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-bold border border-yellow-300/40 shadow mt-2"
                  >
                    ⚡ Eksekusi Terobosan Stage (+2 LvCap)
                  </Button>
                </div>
              ) : (
                <div id="major-breakthrough-section" className="space-y-3.5 text-xs">
                  {/* Peringatan Tribulasi Langit */}
                  <div className="p-3 rounded-lg border border-purple-500/40 bg-purple-950/20 text-purple-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-purple-300">
                      <Skull className="w-4 h-4 text-purple-400" />
                      <span>{lawData.tribulationDetails?.tribulationTitle || `Peringatan Tribulasi Petir Surgawi (Tier ${lawData.rank})`}</span>
                    </div>
                    <p className="text-[11px] text-purple-300/80 leading-relaxed">
                      Menerobos ke Rank {lawData.rank + 1} memicu 3 gelombang Petir Surgawi. Kegagalan mengakibatkan deviasi Qi dan cedera dantian berat!
                    </p>
                  </div>

                  {/* Validasi Syarat Max Level */}
                  {(() => {
                    const charLevel = lawData.characterCurrentLevel ?? (livePlayer?.level || 1);
                    const reqLevel = lawData.requiredLevelForNextRank ?? (lawData.characterLevelCap || (20 + 20 * lawData.rank));
                    const isLevelMet = lawData.isLevelMetForNextRank ?? (charLevel >= reqLevel);
                    return (
                      <div className={`p-3 rounded-lg border flex items-center justify-between ${isLevelMet ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/20 border-rose-800/40 text-rose-300'}`}>
                        <div className="flex items-center gap-2">
                          {isLevelMet ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          <span className="font-semibold">Syarat Max Level Ranah:</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold">Lv. {charLevel} / {reqLevel}</span>
                          <span className="block text-[10px] font-sans">
                            {isLevelMet ? '✓ Memenuhi Syarat' : '✗ Wajib Max Level!'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Simulasi 3 Gelombang Petir Surgawi vs Survival HP */}
                  {lawData.tribulationDetails && (
                    <div className="p-3 rounded-lg bg-black/60 border border-stone-800 space-y-2">
                      <div className="flex justify-between items-center text-[11px] pb-1 border-b border-stone-800">
                        <span className="text-stone-300 font-semibold flex items-center gap-1 font-serif">
                          <Zap size={13} className="text-yellow-400" /> Estimasi Kerusakan Petir:
                        </span>
                        <span className="text-stone-400 font-mono">
                          Survival HP: <strong className="text-amber-300">{Math.floor(lawData.tribulationDetails.survivalHP).toLocaleString()}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono">
                        <div className="p-1.5 rounded bg-purple-950/30 border border-purple-800/40">
                          <span className="text-stone-400 block text-[9px]">Gel. 1</span>
                          <span className="text-purple-300 font-bold">~{Math.floor(lawData.tribulationDetails.waves?.[0]?.damage || 0)}</span>
                        </div>
                        <div className="p-1.5 rounded bg-purple-950/30 border border-purple-800/40">
                          <span className="text-stone-400 block text-[9px]">Gel. 2</span>
                          <span className="text-purple-300 font-bold">~{Math.floor(lawData.tribulationDetails.waves?.[1]?.damage || 0)}</span>
                        </div>
                        <div className="p-1.5 rounded bg-purple-950/30 border border-purple-800/40">
                          <span className="text-stone-400 block text-[9px]">Gel. 3</span>
                          <span className="text-purple-300 font-bold">~{Math.floor(lawData.tribulationDetails.waves?.[2]?.damage || 0)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-stone-400">Ketahanan Raga:</span>
                        <span className={`font-semibold flex items-center gap-1 ${lawData.tribulationDetails.canSurvive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {lawData.tribulationDetails.canSurvive ? (
                            <>
                              <Shield size={12} /> Raga Siap Menahan Sambaran
                            </>
                          ) : (
                            <>
                              <Skull size={12} /> Bahaya! Tingkatkan DEF & HP
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Peluang Keberhasilan & Penalti */}
                  <div className="space-y-1.5 bg-stone-950/50 p-2.5 rounded-lg border border-stone-800/80">
                    <div className="flex justify-between text-stone-300">
                      <span>Peluang Keberhasilan:</span>
                      <strong className="text-purple-400 font-mono text-sm">{lawData.majorBreakthroughSuccessRate}%</strong>
                    </div>
                    <div className="flex justify-between text-stone-400 text-[11px]">
                      <span>Penalti Kegagalan:</span>
                      <span className="font-mono text-rose-400">-50% Qi Dantian • Cedera Berat</span>
                    </div>
                  </div>

                  {/* Tombol Terobosan Rank */}
                  <Button
                    size="sm"
                    onClick={() => majorBreakthroughMutation.mutate()}
                    disabled={!lawData.canMajorBreakthrough || majorBreakthroughMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 hover:from-purple-600 hover:to-indigo-500 text-white font-bold border border-purple-400/50 shadow-lg shadow-purple-500/20 py-2.5 h-auto transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {majorBreakthroughMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        <span>Menghadapi Tribulasi Petir...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} className="mr-1 text-yellow-300" />
                        <span>🌩️ Hadapi Tribulasi Langit & Terobos ke Rank {lawData.rank + 1}!</span>
                      </>
                    )}
                  </Button>

                  {!lawData.canMajorBreakthrough && (
                    <p className="text-[11px] text-rose-400 font-mono text-center flex items-center justify-center gap-1">
                      <Lock size={12} /> {lawData.majorBreakthroughBlockingReason || 'Syarat terobosan rank belum terpenuhi'}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* KONSTELASI POHON JURUS HUKUM SEMESTA (CONSTELLATION SKILL TREE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-serif font-bold text-amber-200 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Konstelasi Jurus & Percabangan Dao ({lawData.lawName})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  Poin Dao Tersedia: <strong className="text-amber-200">{availablePoints} SP</strong>
                </span>
                <Link href="/skill-tree">
                  <Button size="sm" variant="outline" className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
                    Buka Halaman Penuh ➔
                  </Button>
                </Link>
              </div>
            </div>

            <LawConstellationTree
              skills={skillsList}
              availablePoints={availablePoints}
              onAllocate={(skillId) => allocateSkillMutation.mutate(skillId)}
              isAllocating={allocateSkillMutation.isPending}
              combatLoadout={lawData.combatLoadout || []}
              onToggleLoadout={handleToggleCombatLoadout}
            />
          </div>

          {/* ROADMAP PANJANG: 90 STAGE KULTIVASI (RANK 0 - 8) */}
          <Card className="border border-stone-800 bg-black/40 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-serif font-bold text-sm text-amber-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Jejak Kultivasi 1000 Hari (9 Rank × 10 Stage = 90 Tahapan)
              </h3>
              <span className="text-xs font-mono text-stone-500">
                Tahap Saat Ini: Rank {lawData.rank} Stage {lawData.stage} ({lawData.rank * 10 + lawData.stage}/90)
              </span>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((rIdx) => {
                const isCurrent = lawData.rank === rIdx;
                const isPassed = lawData.rank > rIdx;
                return (
                  <div
                    key={rIdx}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      isCurrent
                        ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/20'
                        : isPassed
                        ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-300'
                        : 'border-stone-800/80 bg-stone-950/40 text-stone-600'
                    }`}
                  >
                    <div className="font-mono text-[10px] font-bold">R{rIdx}</div>
                    <div className="font-serif text-[11px] truncate mt-0.5">
                      {isCurrent ? (
                        <span className="text-amber-300 font-bold">{lawData.rankDisplayName.split(' ')[0]}</span>
                      ) : isPassed ? (
                        <span className="text-emerald-400">Tuntas</span>
                      ) : (
                        <span>Terkunci</span>
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-stone-500 mt-1">
                      +{rIdx * 2} LvCap
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Master Realm Roadmap Accordion */}
          <MasterRealmRoadmapAccordion
            currentRealmIdx={lawData.rank}
            activeLawType={lawData.activeLawType}
            activeLawName={lawData.lawName}
          />

          {/* Heavenly Tribulation Modal */}
          <HeavenlyTribulationModal
            isOpen={tribulationModalOpen}
            onClose={() => setTribulationModalOpen(false)}
            tribulation={tribulationData}
            isSuccess={tribulationSuccess}
            message={tribulationMessage}
            newRealmName={tribulationNewRealm}
            newLevelCap={tribulationNewLevelCap}
          />
        </div>
      }
    </div>
  );
}
