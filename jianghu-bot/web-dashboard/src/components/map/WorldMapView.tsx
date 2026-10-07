'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import {
  Compass,
  Settings,
  MapPin,
  Sparkles,
  Navigation,
  Mountain,
  Waves,
  Flame,
  Trees,
  Zap,
  ShieldAlert,
  Wind,
  Skull,
  Crosshair,
  Gem,
  Swords
} from 'lucide-react';

export interface Region {
  _id?: string;
  regionSlug: string;
  displayName: string;
  worldMapX: number;
  worldMapY: number;
  centerX: number;
  centerY: number;
  dangerTier: number;
  qiDensityModifier?: number;
  walkDefault?: 'open' | 'restricted' | 'blocked';
  tempRangeC?: { min: number; max: number };
  terrainType?: string;
  description?: string;
  lawAffinities?: string[];
  resourceTags?: string[];
  discovered?: boolean;
}

interface WorldMapViewProps {
  onSelectRegion: (regionSlug: string, centerX?: number, centerY?: number) => void;
  playerPos?: { x: number; y: number };
  currentLocation?: any;
}

// 22 Wilayah Kanonikal Benua Tianyuan 5000×5000 (Otoritatif docs/WORLD_MAP_MASTER_PLAN.md)
export const CANONICAL_REGIONS: Region[] = [
  {
    regionSlug: 'central_plains',
    displayName: 'Central Plains (Dataran Tengah)',
    worldMapX: 50,
    worldMapY: 49,
    centerX: 2500,
    centerY: 2550,
    dangerTier: 1,
    qiDensityModifier: 1.0,
    walkDefault: 'open',
    tempRangeC: { min: 18, max: 26 },
    terrainType: 'plains',
    description: 'Pusat peradaban dunia persilatan, ibu kota ramai, jalur niaga utama, dan zona aman mutlak bebas ambush.',
    lawAffinities: ['righteous_heavenly_merit', 'righteous_pure_yang'],
    resourceTags: ['plain_herb', 'iron_ore', 'spirit_wood', 'merit_crystal']
  },
  {
    regionSlug: 'azure_mountain_range',
    displayName: 'Azure Mountain Range (Rantai Pegunungan Azure)',
    worldMapX: 51,
    worldMapY: 33,
    centerX: 2550,
    centerY: 3350,
    dangerTier: 3,
    qiDensityModifier: 1.5,
    walkDefault: 'restricted',
    tempRangeC: { min: 2, max: 14 },
    terrainType: 'mountain',
    description: 'Dinding pegunungan cadas pemisah utara dan selatan. Wajib melewati 3 Celah Pass (North, Mist, Sword Gorge) jika berjalan kaki.',
    lawAffinities: ['righteous_sword_heart', 'element_roc_wind'],
    resourceTags: ['azure_iron', 'spirit_bamboo', 'sword_shard', 'frost_herb']
  },
  {
    regionSlug: 'northern_desolate',
    displayName: 'Northern Desolate (Tundra Salju Utara)',
    worldMapX: 42,
    worldMapY: 14,
    centerX: 2100,
    centerY: 4300,
    dangerTier: 4,
    qiDensityModifier: 0.9,
    walkDefault: 'restricted',
    tempRangeC: { min: -25, max: -5 },
    terrainType: 'glacial',
    description: 'Lembah beku es abadi bersuhu sub-zero. Tanpa jubah hangat atau Qi murni, kultivator rentan hipotermia ekstrem.',
    lawAffinities: ['element_azure_water', 'body_tempering'],
    resourceTags: ['glacial_ice', 'frost_lotus', 'beast_fur', 'pure_water_essence']
  },
  {
    regionSlug: 'thundersteppe',
    displayName: 'Thundersteppe (Sabana Halilintar)',
    worldMapX: 46,
    worldMapY: 16,
    centerX: 2300,
    centerY: 4200,
    dangerTier: 4,
    qiDensityModifier: 1.4,
    walkDefault: 'open',
    tempRangeC: { min: -5, max: 12 },
    terrainType: 'lightning',
    description: 'Padang rumput gersang berion listrik tinggi, sering disambar petir langit alami tempat latihan kultivasi tubuh petir.',
    lawAffinities: ['element_godthunder_light'],
    resourceTags: ['thunder_stone', 'storm_grass', 'lightning_core']
  },
  {
    regionSlug: 'godthunder_peaks',
    displayName: 'Godthunder Peaks (Puncak Petir Surgawi)',
    worldMapX: 74,
    worldMapY: 10,
    centerX: 3700,
    centerY: 4500,
    dangerTier: 5,
    qiDensityModifier: 1.8,
    walkDefault: 'restricted',
    tempRangeC: { min: -15, max: 5 },
    terrainType: 'lightning',
    description: 'Puncak tebing curam berselimut badai petir kosmik. Tempat menempa pedang petir dewa dan menembus ranah ranah teratas.',
    lawAffinities: ['element_godthunder_light'],
    resourceTags: ['divine_thunder_crystal', 'celestial_essence']
  },
  {
    regionSlug: 'mirror_lake',
    displayName: 'Mirror Lake (Danau Cermin Spiritual)',
    worldMapX: 68,
    worldMapY: 24,
    centerX: 3400,
    centerY: 3800,
    dangerTier: 2,
    qiDensityModifier: 1.6,
    walkDefault: 'restricted',
    tempRangeC: { min: 8, max: 16 },
    terrainType: 'water',
    description: 'Danau jernih memantulkan langit dengan kerapatan Qi murni yang menenangkan hati, kaya akan herba teratai roh.',
    lawAffinities: ['righteous_karmic_mirror', 'element_azure_water'],
    resourceTags: ['mirror_water', 'lotus_seed', 'karma_sand']
  },
  {
    regionSlug: 'beast_prairies',
    displayName: 'Beast Prairies (Padang Satwa Roh)',
    worldMapX: 28,
    worldMapY: 24,
    centerX: 1400,
    centerY: 3800,
    dangerTier: 3,
    qiDensityModifier: 1.1,
    walkDefault: 'open',
    tempRangeC: { min: 5, max: 18 },
    terrainType: 'plains',
    description: 'Sabana luas habitat kawanan binatang buas dan serigala roh. Tempat favorit pemburu binatang dan penjinak hewan tunggangan.',
    lawAffinities: ['natal_beast'],
    resourceTags: ['beast_bone', 'wild_tendon', 'beast_essence_herb']
  },
  {
    regionSlug: 'western_sacred_desert',
    displayName: 'Western Sacred Desert (Gurun Pasir Suci Barat)',
    worldMapX: 16,
    worldMapY: 40,
    centerX: 800,
    centerY: 3000,
    dangerTier: 3,
    qiDensityModifier: 0.9,
    walkDefault: 'open',
    tempRangeC: { min: 35, max: 48 },
    terrainType: 'desert',
    description: 'Hamparan bukit pasir keemasan bersuhu panas terik ekstrem. Menyimpan reruntuhan kuil kuno dan kristal matahari.',
    lawAffinities: ['righteous_pure_yang', 'element_phoenix_fire'],
    resourceTags: ['solar_sand', 'fire_cactus', 'sun_crystal', 'camel_bone']
  },
  {
    regionSlug: 'western_canyon_labyrinth',
    displayName: 'Western Canyon Labyrinth (Ngarai Labirin Barat)',
    worldMapX: 12,
    worldMapY: 66,
    centerX: 600,
    centerY: 1700,
    dangerTier: 4,
    qiDensityModifier: 1.2,
    walkDefault: 'restricted',
    tempRangeC: { min: 30, max: 42 },
    terrainType: 'canyon',
    description: 'Ngarai batu merah sempit bercabang-cabang dan gua-gua tersembunyi berpenghuni monster tanah.',
    lawAffinities: ['body_tempering', 'element_xuanwu_earth'],
    resourceTags: ['earth_marrow', 'granite_core', 'sand_essence']
  },
  {
    regionSlug: 'lava_spine',
    displayName: 'Lava Spine (Rantai Magma Vulkanik)',
    worldMapX: 26,
    worldMapY: 76,
    centerX: 1300,
    centerY: 1200,
    dangerTier: 5,
    qiDensityModifier: 1.7,
    walkDefault: 'restricted',
    tempRangeC: { min: 45, max: 70 },
    terrainType: 'volcanic',
    description: 'Kawah lava mendidih dan sungai magma mengalir. Sumber mineral penempaan api tingkat dewa dan bara api phoenix.',
    lawAffinities: ['element_phoenix_fire', 'body_tempering'],
    resourceTags: ['phoenix_ember', 'molten_slag', 'sulfur_crystal', 'fire_essence']
  },
  {
    regionSlug: 'venom_mire',
    displayName: 'Venom Mire (Rawa Miasma Racun)',
    worldMapX: 10,
    worldMapY: 80,
    centerX: 500,
    centerY: 1000,
    dangerTier: 4,
    qiDensityModifier: 1.1,
    walkDefault: 'restricted',
    tempRangeC: { min: 28, max: 38 },
    terrainType: 'swamp',
    description: 'Lumpur hisap pekat berhawa racun busuk. Tempat tumbuhnya jamur beracun mematikan dan habitat ular beracun purba.',
    lawAffinities: ['demonic_myriad_venom', 'gu_master'],
    resourceTags: ['venom_sac', 'toxic_spore', 'mire_mud', 'poison_herb']
  },
  {
    regionSlug: 'southern_demon_domain',
    displayName: 'Southern Demon Domain (Domain Iblis Selatan)',
    worldMapX: 48,
    worldMapY: 76,
    centerX: 2400,
    centerY: 1200,
    dangerTier: 4,
    qiDensityModifier: 1.3,
    walkDefault: 'open',
    tempRangeC: { min: 26, max: 36 },
    terrainType: 'demonic',
    description: 'Wilayah kekuasaan sekte-sekte ortodoks iblis, diselimuti energi kegelapan yang menyuburkan kultivasi jalan sesat.',
    lawAffinities: ['demonic_turbid_core', 'demonic_nether_darkness'],
    resourceTags: ['turbid_core', 'dark_stone', 'demonic_tendon', 'shadow_grass']
  },
  {
    regionSlug: 'crimson_battlefield',
    displayName: 'Crimson Battlefield (Medan Tempur Darah)',
    worldMapX: 58,
    worldMapY: 84,
    centerX: 2900,
    centerY: 800,
    dangerTier: 5,
    qiDensityModifier: 1.5,
    walkDefault: 'open',
    tempRangeC: { min: 24, max: 34 },
    terrainType: 'battlefield',
    description: 'Tanah merah basah sisa perang akbar klan abadi kuno, dipenuhi hawa arwah penasaran dan sisa senjata patah.',
    lawAffinities: ['demonic_blood_soul'],
    resourceTags: ['blood_vial', 'soul_dust', 'rusted_weapon_shard']
  },
  {
    regionSlug: 'abyssal_scar',
    displayName: 'Abyssal Scar (Jurang Retakan Abyss)',
    worldMapX: 38,
    worldMapY: 88,
    centerX: 1900,
    centerY: 600,
    dangerTier: 5,
    qiDensityModifier: 2.0,
    walkDefault: 'restricted',
    tempRangeC: { min: 15, max: 25 },
    terrainType: 'abyss',
    description: 'Celah retakan dimensi menuju jurang tak berdasar, memancarkan intisari kegelapan Netherworld yang sangat kuat.',
    lawAffinities: ['demonic_abyssal_pact'],
    resourceTags: ['abyssal_scroll', 'nether_shard', 'fiend_blood']
  },
  {
    regionSlug: 'spirit_wood_sea',
    displayName: 'Spirit Wood Sea (Lautan Rimba Purba)',
    worldMapX: 74,
    worldMapY: 74,
    centerX: 3700,
    centerY: 1300,
    dangerTier: 3,
    qiDensityModifier: 1.4,
    walkDefault: 'restricted',
    tempRangeC: { min: 20, max: 28 },
    terrainType: 'forest',
    description: 'Hutan pohon raksasa berusia ribuan tahun dengan kanopi lebat menutupi cahaya matahari, dipenuhi getah vitalitas kayu.',
    lawAffinities: ['element_qingdi_wood', 'natal_beast'],
    resourceTags: ['thousand_year_wood', 'qingdi_sprout', 'vitality_sap']
  },
  {
    regionSlug: 'mist_insect_valley',
    displayName: 'Mist Insect Valley (Lembah Kabut Serangga Gu)',
    worldMapX: 88,
    worldMapY: 78,
    centerX: 4400,
    centerY: 1100,
    dangerTier: 4,
    qiDensityModifier: 1.2,
    walkDefault: 'restricted',
    tempRangeC: { min: 25, max: 35 },
    terrainType: 'swamp',
    description: 'Lembah lembap sarang budidaya ribuan cacing dan serangga Gu esoterik khas kultivasi misterius selatan.',
    lawAffinities: ['gu_master', 'demonic_myriad_venom'],
    resourceTags: ['gu_larva', 'insect_shell', 'gu_food_herb', 'myriad_toxin']
  },
  {
    regionSlug: 'southern_plague_woods',
    displayName: 'Southern Plague Woods (Hutan Hawa Busuk)',
    worldMapX: 68,
    worldMapY: 89,
    centerX: 3400,
    centerY: 550,
    dangerTier: 4,
    qiDensityModifier: 1.0,
    walkDefault: 'restricted',
    tempRangeC: { min: 24, max: 34 },
    terrainType: 'forest',
    description: 'Kawasan jamur hitam dan spora berhawa busuk yang dapat merusak meridian jika dihirup tanpa pelindung Qi.',
    lawAffinities: ['gu_master', 'demonic_myriad_venom'],
    resourceTags: ['plague_spore', 'festering_root', 'black_fungus']
  },
  {
    regionSlug: 'formation_barrens',
    displayName: 'Formation Barrens (Dataran Formasi Kuno)',
    worldMapX: 72,
    worldMapY: 48,
    centerX: 3600,
    centerY: 2600,
    dangerTier: 3,
    qiDensityModifier: 1.6,
    walkDefault: 'open',
    tempRangeC: { min: 16, max: 26 },
    terrainType: 'plains',
    description: 'Dataran berbatu berukir garis-garis formasi segel raksasa peninggalan master susunan formasi pelindung dunia.',
    lawAffinities: ['righteous_formation_array', 'element_xuanwu_earth'],
    resourceTags: ['formation_flag_pole', 'array_jade', 'spirit_magnet']
  },
  {
    regionSlug: 'sword_gorge',
    displayName: 'Sword Gorge (Ngarai Tebas Pedang)',
    worldMapX: 68,
    worldMapY: 38,
    centerX: 3400,
    centerY: 3100,
    dangerTier: 4,
    qiDensityModifier: 1.8,
    walkDefault: 'restricted',
    tempRangeC: { min: 6, max: 16 },
    terrainType: 'canyon',
    description: 'Ngarai terbelah lurus bekas tebasan satu pedang pendekar abadi, masih memancarkan niat pedang (Sword Intent) tajam.',
    lawAffinities: ['righteous_sword_heart', 'natal_artifact'],
    resourceTags: ['sword_intent_stone', 'tempered_steel', 'blade_ore']
  },
  {
    regionSlug: 'ore_teeth_range',
    displayName: 'Ore Teeth Range (Pegunungan Gigi Bijih)',
    worldMapX: 80,
    worldMapY: 56,
    centerX: 4000,
    centerY: 2200,
    dangerTier: 3,
    qiDensityModifier: 1.2,
    walkDefault: 'restricted',
    tempRangeC: { min: 14, max: 24 },
    terrainType: 'mountain',
    description: 'Jajaran puncak batu tajam bergerigi yang kaya akan urat bijih tembaga roh, besi berat, dan butiran emas hitam.',
    lawAffinities: ['natal_artifact', 'element_xuanwu_earth'],
    resourceTags: ['heavy_iron_ore', 'black_gold_grain', 'spirit_copper']
  },
  {
    regionSlug: 'eastern_sea',
    displayName: 'Eastern Sea (Samudra Lepas Ombak Pasang)',
    worldMapX: 88,
    worldMapY: 48,
    centerX: 4400,
    centerY: 2600,
    dangerTier: 3,
    qiDensityModifier: 1.2,
    walkDefault: 'restricted',
    tempRangeC: { min: 18, max: 28 },
    terrainType: 'water',
    description: 'Lautan luas membentang di batas timur dunia. Hanya dapat dijelajahi dengan rakit, kapal cepat, atau pedang terbang.',
    lawAffinities: ['element_azure_water'],
    resourceTags: ['ocean_pearl', 'deep_sea_coral', 'azure_essence', 'spirit_fish']
  },
  {
    regionSlug: 'floating_wind_isles',
    displayName: 'Floating Wind Isles (Kepulauan Karang Melayang)',
    worldMapX: 92,
    worldMapY: 46,
    centerX: 4600,
    centerY: 2700,
    dangerTier: 5,
    qiDensityModifier: 1.9,
    walkDefault: 'restricted',
    tempRangeC: { min: 10, max: 20 },
    terrainType: 'islands',
    description: 'Gugusan pulau karang terpencil di tengah laut timur yang melayang di udara karena medan angin spiritual purba.',
    lawAffinities: ['element_roc_wind'],
    resourceTags: ['wind_feather', 'sky_jade', 'cyclone_core', 'flying_stone']
  }
];

export default function WorldMapView({ onSelectRegion, playerPos, currentLocation }: WorldMapViewProps) {
  const [regions, setRegions] = useState<Region[]>(CANONICAL_REGIONS);
  const [hoveredRegion, setHoveredRegion] = useState<Region | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const px = playerPos?.x ?? 2455;
  const py = playerPos?.y ?? 2485;
  // Konversi spasial 5000x5000 ke koordinat layar CSS (Y=5000 di atas, Y=0 di bawah)
  const playerPercentX = Math.max(5, Math.min(95, Math.round((px / 5000) * 100)));
  const playerPercentY = Math.max(5, Math.min(95, Math.round((1 - (py / 5000)) * 100)));

  useEffect(() => {
    const fetchWorldMap = async () => {
      try {
        const res = await api.get('/map/world');
        if (res.data?.regions && Array.isArray(res.data.regions) && res.data.regions.length > 0) {
          setRegions(res.data.regions);
        }
      } catch (err: any) {
        // Tetap gunakan 22 CANONICAL_REGIONS jika backend belum aktif
        setRegions(CANONICAL_REGIONS);
      }
    };

    fetchWorldMap();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const saved = localStorage.getItem('jianghu_reduce_motion');
    if (saved === 'true' || mediaQuery.matches) {
      setReduceMotion(true);
    }
  }, []);

  const toggleReduceMotion = () => {
    const newVal = !reduceMotion;
    setReduceMotion(newVal);
    localStorage.setItem('jianghu_reduce_motion', String(newVal));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (reduceMotion || !mapRef.current) return;
    const { left, top, width, height } = mapRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    mapRef.current.style.setProperty('--mouse-x', x.toString());
    mapRef.current.style.setProperty('--mouse-y', y.toString());
  };

  const handleMouseLeave = () => {
    if (!mapRef.current) return;
    mapRef.current.style.setProperty('--mouse-x', '0');
    mapRef.current.style.setProperty('--mouse-y', '0');
    setHoveredRegion(null);
  };

  // Helper Ikon Berdasarkan Terrain & Danger
  const getRegionIcon = (region: Region) => {
    const t = region.terrainType || '';
    if (t === 'mountain') return Mountain;
    if (t === 'glacial') return Mountain;
    if (t === 'water' || t === 'islands') return Waves;
    if (t === 'volcanic') return Flame;
    if (t === 'lightning') return Zap;
    if (t === 'desert') return Wind;
    if (t === 'canyon') return Swords;
    if (t === 'swamp' || t === 'demonic' || t === 'abyss') return Skull;
    if (t === 'battlefield') return Swords;
    return Trees;
  };

  const getDangerBadgeColor = (tier: number) => {
    switch (tier) {
      case 1: return { text: 'text-emerald-400', border: 'border-emerald-500/80', bg: 'bg-emerald-950/80', glow: 'rgba(16, 185, 129, 0.6)', label: 'Tier 1 • Aman' };
      case 2: return { text: 'text-cyan-400', border: 'border-cyan-500/80', bg: 'bg-cyan-950/80', glow: 'rgba(6, 182, 212, 0.6)', label: 'Tier 2 • Damai' };
      case 3: return { text: 'text-amber-400', border: 'border-amber-500/80', bg: 'bg-amber-950/80', glow: 'rgba(245, 158, 11, 0.6)', label: 'Tier 3 • Bahaya Sedang' };
      case 4: return { text: 'text-red-400', border: 'border-red-500/80', bg: 'bg-red-950/80', glow: 'rgba(239, 68, 68, 0.7)', label: 'Tier 4 • Berbahaya' };
      case 5: return { text: 'text-purple-400', border: 'border-purple-500/80', bg: 'bg-purple-950/80', glow: 'rgba(168, 85, 247, 0.8)', label: 'Tier 5 • Mematikan' };
      default: return { text: 'text-gray-300', border: 'border-gray-500', bg: 'bg-gray-900', glow: 'rgba(156, 163, 175, 0.5)', label: `Tier ${tier}` };
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden border border-amber-900/60 shadow-2xl bg-[#070a12] select-none flex flex-col font-sans">
      {/* Top HUD Controls */}
      <div className="absolute top-3 left-3 right-3 z-30 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/85 border border-amber-700/70 px-3.5 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-2.5 shadow-xl">
            <Compass className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '16s' }} />
            <div>
              <h3 className="font-serif font-bold text-amber-200 text-xs tracking-wider uppercase">Peta Makro Benua Tianyuan</h3>
              <div className="text-[10px] text-amber-400/80 font-mono">Skala 5000×5000 Petak Spasial • 22 Wilayah Kanonikal</div>
            </div>
          </div>

          <button
            onClick={toggleReduceMotion}
            className="bg-black/70 hover:bg-black/90 text-gray-300 px-2.5 py-1.5 rounded-xl border border-gray-800 flex items-center gap-1.5 backdrop-blur-sm transition-colors text-[11px]"
            title="Animasi Parallax Kartografi"
          >
            <Settings className="w-3.5 h-3.5" />
            Parallax: {reduceMotion ? 'OFF' : 'ON'}
          </button>
        </div>

        {/* Quick Jump to Live Spatial Grid */}
        <button
          onClick={() => onSelectRegion('central_plains', px, py)}
          className="pointer-events-auto bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-500 text-white font-serif font-bold px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-400/60 flex items-center gap-2 text-xs transition-all active:scale-95"
        >
          <Navigation className="w-4 h-4 text-amber-200" />
          <span>Buka Grid Spasial ({px}, {py})</span>
        </button>
      </div>

      {/* Cartographic Map Canvas / Visual Layer */}
      <div
        ref={mapRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 w-full h-full overflow-hidden"
      >
        <div
          className="absolute inset-0 w-full h-full transition-transform duration-200 ease-out flex items-center justify-center"
          style={
            !reduceMotion ? {
              transform: 'translate(calc(var(--mouse-x, 0) * -14px), calc(var(--mouse-y, 0) * -14px)) scale(1.02)'
            } : {}
          }
        >
          {/* Stylized Wuxia Cartography Background (Ink wash + parchment) */}
          <div className="absolute inset-0 bg-[#080d16] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-75" />

          {/* Kartografi Geografis Benua Tianyuan 5000×5000 (SVG Akurat Sesuai Bioma & Barrier) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="none">
            <defs>
              {/* Gradients Bioma */}
              <linearGradient id="azureMountainGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#2563eb" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="easternSeaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0369a1" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="northernTundraGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#082f49" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="westernDesertGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#b45309" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#78350f" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="southernDemonGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#581c87" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#3b0764" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* 1. Samudra Lepas Ombak Pasang (Eastern Sea) di Sisi Timur (Right) */}
            <path d="M 760 0 L 1000 0 L 1000 600 L 760 600 Q 730 400 760 250 T 770 0 Z" fill="url(#easternSeaGrad)" />
            {/* Gelombang laut timur */}
            <path d="M 800 150 Q 850 140 900 160 T 980 150" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="6,4" fill="none" opacity="0.4" />
            <path d="M 780 300 Q 840 280 920 310 T 990 290" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="8,6" fill="none" opacity="0.4" />
            <path d="M 820 450 Q 880 430 940 460 T 990 440" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="6,4" fill="none" opacity="0.4" />

            {/* 2. Tundra Beku Salju (Northern Desolate) di Sisi Atas (Top) */}
            <rect x="100" y="0" width="700" height="170" fill="url(#northernTundraGrad)" />
            {/* Puncak Salju Godthunder & Northern Desolate */}
            <path d="M 180 120 L 220 50 L 260 120 Z" fill="#0284c7" opacity="0.4" stroke="#7dd3fc" strokeWidth="1" />
            <path d="M 360 100 L 400 35 L 440 100 Z" fill="#0284c7" opacity="0.5" stroke="#7dd3fc" strokeWidth="1" />
            <path d="M 680 90 L 730 20 L 780 90 Z" fill="#6366f1" opacity="0.55" stroke="#c084fc" strokeWidth="1.5" />

            {/* 3. Gurun Pasir Suci Barat & Ngarai di Sisi Barat (Left) */}
            <path d="M 0 120 L 320 120 Q 280 300 320 450 L 0 450 Z" fill="url(#westernDesertGrad)" />
            {/* Garis bukit pasir berkilau */}
            <path d="M 40 220 Q 120 200 220 230" stroke="#fbbf24" strokeWidth="1" strokeDasharray="6,4" fill="none" opacity="0.35" />
            <path d="M 60 320 Q 140 300 240 330" stroke="#fbbf24" strokeWidth="1" strokeDasharray="6,4" fill="none" opacity="0.35" />

            {/* 4. Domain Iblis & Rawa Miasma di Sisi Bawah (South) */}
            <rect x="0" y="440" width="800" height="160" fill="url(#southernDemonGrad)" />

            {/* 5. BARRIER OTORITATIF: Rantai Pegunungan Azure (Azure Mountain Range) melintang */}
            {/* Membentang di Top 30% - 37% (Y=3100-3600), Left 30% - 72% (X=1500-3600) */}
            <g id="azure-mountain-barrier" opacity="0.85">
              {/* Blok tebing utama */}
              <path
                d="M 300 215 L 360 185 L 420 210 L 480 180 L 540 215 L 600 185 L 660 210 L 720 190 L 740 235 L 300 235 Z"
                fill="url(#azureMountainGrad)"
                stroke="#60a5fa"
                strokeWidth="1.5"
              />
              {/* Siluet puncak tebing cadas bersusun */}
              <path d="M 310 225 L 340 170 L 370 225 Z" fill="#0f172a" stroke="#93c5fd" strokeWidth="1" />
              <path d="M 370 225 L 410 165 L 450 225 Z" fill="#1e293b" stroke="#93c5fd" strokeWidth="1" />
              <path d="M 470 225 L 510 160 L 550 225 Z" fill="#0f172a" stroke="#93c5fd" strokeWidth="1" />
              <path d="M 570 225 L 610 168 L 650 225 Z" fill="#1e293b" stroke="#93c5fd" strokeWidth="1" />
              <path d="M 670 225 L 705 175 L 735 225 Z" fill="#0f172a" stroke="#93c5fd" strokeWidth="1" />

              {/* Garis lintasan pembatas gunung */}
              <line x1="290" y1="205" x2="745" y2="205" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />
            </g>

            {/* 6. Penanda 3 Celah Pass Resmi di Pegunungan Azure */}
            {/* North Pass di (2200, 3350) -> (440, 200) */}
            <g id="pass-north">
              <circle cx="440" cy="202" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              <text x="440" y="190" fill="#6ee7b7" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily="serif">NORTH PASS</text>
            </g>
            {/* Mist Pass di (2600, 3350) -> (520, 200) */}
            <g id="pass-mist">
              <circle cx="520" cy="202" r="7" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
              <text x="520" y="190" fill="#a5f3fc" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily="serif">MIST PASS</text>
            </g>
            {/* Sword Gorge Pass di (3100, 3350) -> (620, 200) */}
            <g id="pass-sword">
              <circle cx="620" cy="202" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              <text x="620" y="190" fill="#fde68a" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily="serif">SWORD GORGE PASS</text>
            </g>

            {/* Sungai Utama Tianyuan (Aliran dari Pegunungan Azure menuju Laut Timur) */}
            <path d="M 520 215 Q 560 280 620 300 T 780 320" stroke="#38bdf8" strokeWidth="3" fill="none" opacity="0.6" />
            <path d="M 440 215 Q 380 270 340 320 T 300 480" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.45" />

            {/* Garis Lintang & Bujur Emas Kartografi */}
            <circle cx="500" cy="300" r="230" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="6,6" fill="none" opacity="0.25" />
            <circle cx="500" cy="300" r="140" stroke="#f59e0b" strokeWidth="0.6" fill="none" opacity="0.2" />
            <line x1="60" y1="300" x2="940" y2="300" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="4,4" opacity="0.25" />
            <line x1="500" y1="40" x2="500" y2="560" stroke="#f59e0b" strokeWidth="0.6" strokeDasharray="4,4" opacity="0.25" />
          </svg>

          {/* Compass Rose (Pojok Kiri Bawah) */}
          <div className="absolute bottom-4 left-4 opacity-40 pointer-events-none flex flex-col items-center">
            <div className="w-14 h-14 rounded-full border border-amber-500/70 flex items-center justify-center bg-black/40">
              <span className="text-[11px] text-amber-300 font-serif font-bold">UTARA</span>
            </div>
            <span className="text-[8px] text-amber-200/70 mt-1 tracking-widest uppercase">Kompas Benua</span>
          </div>

          {/* 22 Region Pins Layer */}
          {regions.map((region) => {
            const isHovered = hoveredRegion?.regionSlug === region.regionSlug;
            const PinIcon = getRegionIcon(region);
            const danger = getDangerBadgeColor(region.dangerTier || 1);

            return (
              <div
                key={region.regionSlug}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-125 z-20 group"
                style={{
                  left: `${region.worldMapX}%`,
                  top: `${region.worldMapY}%`
                }}
                onMouseEnter={() => setHoveredRegion(region)}
                onClick={() => onSelectRegion(region.regionSlug, region.centerX, region.centerY)}
              >
                {/* Glowing Aura Ring */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 ${danger.border} flex items-center justify-center backdrop-blur-xs transition-all relative`}
                  style={{
                    backgroundColor: 'rgba(10, 15, 26, 0.88)',
                    boxShadow: `0 0 16px ${danger.glow}`
                  }}
                >
                  <PinIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${danger.text} transition-transform group-hover:rotate-12`} />

                  {/* Danger Tier Mini Dot */}
                  <div
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${danger.bg} border ${danger.border} flex items-center justify-center text-[8px] font-bold text-white shadow-sm`}
                  >
                    {region.dangerTier}
                  </div>
                </div>

                {/* Region Label Badge */}
                <div className="mt-1 px-2 py-0.5 bg-black/90 border border-amber-800/80 rounded-full text-[9px] sm:text-[10px] font-serif font-bold text-amber-200 whitespace-nowrap text-center shadow-lg pointer-events-none transition-all group-hover:border-amber-400 group-hover:text-white group-hover:shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                  {region.displayName.split(' (')[0]}
                </div>
              </div>
            );
          })}

          {/* Region Detail Card Tooltip (Muncul saat Pin Di-hover) */}
          {hoveredRegion && (
            <div
              className="absolute bottom-5 right-5 z-40 bg-[#0c1220]/95 border border-amber-600/80 p-4 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md max-w-sm animate-in fade-in slide-in-from-bottom-2 pointer-events-auto"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <h4 className="font-serif font-bold text-amber-100 text-sm leading-snug">
                    {hoveredRegion.displayName}
                  </h4>
                </div>
              </div>

              {/* Danger & Stats Row */}
              <div className="flex items-center gap-2 mb-2 flex-wrap text-[10px]">
                <span className={`px-2 py-0.5 rounded-full border font-bold ${getDangerBadgeColor(hoveredRegion.dangerTier || 1).bg} ${getDangerBadgeColor(hoveredRegion.dangerTier || 1).border} ${getDangerBadgeColor(hoveredRegion.dangerTier || 1).text}`}>
                  {getDangerBadgeColor(hoveredRegion.dangerTier || 1).label}
                </span>

                <span className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-300 font-mono">
                  Qi: {hoveredRegion.qiDensityModifier ?? 1.0}x
                </span>

                {hoveredRegion.tempRangeC && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-900 border border-gray-700 text-gray-300 font-mono">
                    Suhu: {hoveredRegion.tempRangeC.min}°C ~ {hoveredRegion.tempRangeC.max}°C
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-300 leading-relaxed mb-3">
                {hoveredRegion.description || 'Wilayah terbuka yang dapat dijelajahi pada kisi koordinat spasial 5000×5000.'}
              </p>

              {/* Law Affinities & Resources */}
              {hoveredRegion.lawAffinities && hoveredRegion.lawAffinities.length > 0 && (
                <div className="mb-2 text-[10px] text-amber-300/90 flex items-center gap-1.5 flex-wrap">
                  <Gem className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span className="font-semibold text-gray-400">Afinitas Law:</span>
                  {hoveredRegion.lawAffinities.map((law, idx) => (
                    <span key={idx} className="bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60 font-mono text-amber-200">
                      {law.replace('righteous_', '').replace('demonic_', '').replace('element_', '')}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Button: Jelajahi Grid Ini */}
              <button
                onClick={() => onSelectRegion(hoveredRegion.regionSlug, hoveredRegion.centerX, hoveredRegion.centerY)}
                className="w-full mt-2 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-serif font-bold text-xs rounded-xl shadow-lg border border-amber-400/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                Jelajahi Grid Wilayah Ini ({hoveredRegion.centerX}, {hoveredRegion.centerY})
              </button>
            </div>
          )}

          {/* Titik Kuning Posisiku (Pulsing Golden Radar Marker) */}
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
            style={{
              left: `${playerPercentX}%`,
              top: `${playerPercentY}%`
            }}
          >
            {/* Radar Wave Ping */}
            <div className="w-10 h-10 rounded-full border-2 border-yellow-400 animate-ping absolute -top-3 -left-3 opacity-75" />
            <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-white shadow-[0_0_20px_#f59e0b] animate-pulse relative flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-950" />
            </div>

            {/* Badge Posisimu */}
            <div className="mt-1 px-2.5 py-0.5 bg-black/90 border border-yellow-500/80 rounded-full text-[10px] font-serif font-bold text-yellow-300 whitespace-nowrap text-center shadow-xl">
              📍 Posisimu ({px}, {py})
            </div>
          </div>
        </div>

        {/* Info Lokasi Relatif Terhadap Benua (Pojok Kiri Bawah) */}
        <div className="absolute bottom-4 left-4 z-30 bg-[#0b101c]/95 border border-yellow-600/70 p-3 rounded-2xl shadow-2xl backdrop-blur-md max-w-xs pointer-events-none">
          <div className="flex items-center gap-2 text-yellow-400 font-serif font-bold text-xs mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
            <span>Lokasi Pendekar Saat Ini</span>
          </div>
          <div className="text-[11px] text-gray-300 space-y-0.5 font-sans">
            <div>Koordinat: <strong className="text-yellow-300 font-mono">({px}, {py})</strong></div>
            <div>Wilayah: <span className="text-amber-200 capitalize">{(currentLocation?.regionSlug || 'central_plains').replace(/_/g, ' ')}</span></div>
            <div>Dekat: <span className="text-gray-400">{currentLocation?.settlementName || 'Desa Xingcun & Lembah Bambu'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
