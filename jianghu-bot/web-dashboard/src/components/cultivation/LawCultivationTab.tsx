"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
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
import {
  Flame,
  Shield,
  Sparkles,
  Zap,
  Sword,
  BookOpen,
  CheckCircle2,
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
  TreePine
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
    onSuccess: (res) => {
      toast.show({ message: res.message || 'Penerobosan Agung berhasil!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['lawStatus'] });
      queryClient.invalidateQueries({ queryKey: ['lawSkills'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    },
    onError: (err: any) => {
      toast.show({ message: err.response?.data?.error || 'Gagal melakukan terobosan rank.', type: 'error' });
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
    return (
      <div className="space-y-6">
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
                    Jalur Kultivator Biasa (Tanpa Hukum Semesta)
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 border border-stone-600 text-stone-300 font-mono">
                    Dao Fana Murni
                  </span>
                </div>
                <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
                  Kamu telah memilih jalan keteguhan pribadi tanpa belenggu ikatan Hukum Semesta. Tubuh fana mengandalkan disiplin beladiri murni (Martial Arts), senjata, dan pil kultivasi.
                </p>
              </div>
            </div>

            <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 text-right">
              <span className="text-[11px] text-amber-400/90 font-mono block">Penyesuaian Stat Tempur</span>
              <span className="text-sm font-bold text-stone-200 font-serif">× 0.95 (Efektivitas Tempur)</span>
            </div>
          </div>
        </div>

        {/* Info Card & Action Link to Skill Tree */}
        <div className="rounded-xl border border-stone-800 bg-[#0d1017]/90 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-300 font-serif font-bold text-sm">
              <Sword className="w-4 h-4 text-amber-400" />
              <span>Disiplin Beladiri Jianghu & Kitab Manual</span>
            </div>
            <Link href="/skill-tree">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs">
                Buka Pohon Kemahiran & Manual ➔
              </Button>
            </Link>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Sebagai Kultivator Biasa, seluruh kemahiran bertarung terpusat pada 6 Disiplin Beladiri (Pedang, Golok, Tombak, Tinju, Telapak, Jari) serta Kitab Manual yang kamu pelajari dari dunia. Latih kemahiranmu melalui pertarungan dan sparring sekte!
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // KASUS 1: PEMAIN BELUM MEMILIH LAW → 2-SLOT DAO BINDING ALTAR
  // ═══════════════════════════════════════════════════════════════════
  if (!lawData?.hasLaw) {
    return (
      <div className="space-y-6">
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
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-purple-500/40 bg-purple-950/20 text-purple-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-purple-300">
                      <Skull className="w-4 h-4 text-purple-400" /> Peringatan Tribulasi Langit!
                    </div>
                    <p className="text-[11px] text-purple-300/80 leading-relaxed">
                      Menerobos ke Rank {lawData.rank + 1} memicu 3 gelombang Petir Surgawi. Kegagalan mengakibatkan deviasi Qi dan cedera dantian berat!
                    </p>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-800/80 text-stone-300">
                    <span>Peluang Keberhasilan:</span>
                    <strong className="text-purple-400 font-mono">{lawData.majorBreakthroughSuccessRate}%</strong>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => majorBreakthroughMutation.mutate()}
                    disabled={!lawData.canMajorBreakthrough || majorBreakthroughMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold border border-purple-400/50 shadow-lg shadow-purple-500/20 py-2 h-auto"
                  >
                    🌩️ Hadapi Tribulasi & Terobos Rank
                  </Button>
                </div>
              )}
            </Card>
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
        </div>
      }
    </div>
  );
}
