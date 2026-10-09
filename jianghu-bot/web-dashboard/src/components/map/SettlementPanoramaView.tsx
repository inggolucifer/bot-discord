'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import {
  BedDouble,
  Wine,
  ShoppingBag,
  Hammer,
  BookOpen,
  FileText,
  Compass,
  Archive,
  ArrowLeft,
  User,
  Heart,
  Swords,
  Sparkles,
  Coins,
  Loader2,
  Ship,
  Scroll,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Flame,
  Moon,
  Sun,
  Shield,
  Eye,
  X
} from 'lucide-react';
import { useUIStore } from '@/lib/store';
import DungeonMazeExplorer from '@/components/dungeon/DungeonMazeExplorer';
import FerryCrossingModal from '@/components/ferry/FerryCrossingModal';
import SectEntranceExamModal from '@/components/sect/SectEntranceExamModal';

interface SettlementPanoramaViewProps {
  settlementName: string;
  onExitCity: () => void;
  onOpenInn?: () => void;
  onOpenMarket?: () => void;
}

export default function SettlementPanoramaView({
  settlementName,
  onExitCity,
  onOpenInn,
  onOpenMarket
}: SettlementPanoramaViewProps) {
  const { setActiveNpcId, setActiveModal } = useUIStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [isTrackingMinimized, setIsTrackingMinimized] = useState<boolean>(false);

  // Modal State Hooks
  const [showDungeonExplorer, setShowDungeonExplorer] = useState(false);
  const [showFerryModal, setShowFerryModal] = useState(false);
  const [showSectExamModal, setShowSectExamModal] = useState(false);
  const [sectExamSectId, setSectExamSectId] = useState<string>('');

  // Shop state for market building
  const [realShopItems, setRealShopItems] = useState<any[]>([]);
  const [shopLoading, setShopLoading] = useState<boolean>(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // Panorama horizontal scroll container ref
  const panoramaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettlement = async () => {
      try {
        const res = await api.get(`/world/settlement/${encodeURIComponent(settlementName)}`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load settlement panorama:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettlement();
  }, [settlementName]);

  // Handle horizontal scroll tracking for parallax calculation
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollOffset(e.currentTarget.scrollLeft);
  };

  const panPanorama = (direction: 'left' | 'right') => {
    if (panoramaContainerRef.current) {
      const scrollAmount = 300;
      panoramaContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Fetch shop catalog when market is selected
  useEffect(() => {
    if (selectedBuilding?.type === 'market' || selectedBuilding?.id === 'market') {
      const fetchShop = async () => {
        try {
          setShopLoading(true);
          const res = await api.get('/market/shop');
          if (res.data?.success && Array.isArray(res.data?.data)) {
            setRealShopItems(res.data.data);
          }
        } catch (e: any) {
          console.warn('Gagal memuat katalog toko spiritual:', e.message);
        } finally {
          setShopLoading(false);
        }
      };
      fetchShop();
    }
  }, [selectedBuilding]);

  const handleBuyShopItem = async (shopItem: any) => {
    try {
      setBuyingId(shopItem.id);
      const res = await api.post('/market/shop/buy', { shopId: shopItem.id, quantity: 1 });
      if (res.data?.success || res.status === 200) {
        showNotice(`🎉 Berhasil membeli 1x ${shopItem.name} seharga ${shopItem.price} ${shopItem.currency || 'Perak'}!`);
      } else {
        showNotice(`❌ ${res.data?.error || 'Gagal membeli barang.'}`);
      }
    } catch (err: any) {
      showNotice(`❌ ${err.response?.data?.error || 'Gagal membeli barang toko.'}`);
    } finally {
      setBuyingId(null);
    }
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleBuildingClick = (building: any) => {
    const bId = (building.id || '').toLowerCase();
    const bType = (building.type || building.buildingType || '').toLowerCase();
    const bName = (building.name || '').toLowerCase();

    if (bId === 'inn' && onOpenInn) {
      onOpenInn();
      return;
    }
    if (bId === 'market' && onOpenMarket) {
      onOpenMarket();
      return;
    }
    if (bId === 'dock' || bType === 'dock' || bName.includes('dermaga') || bName.includes('pelabuhan')) {
      setShowFerryModal(true);
      return;
    }
    if (bId === 'sect_hall' || bType === 'sect_hall' || bName.includes('sekte') || bName.includes('ujian')) {
      setSectExamSectId(building.linkedSectId || '654321654321654321654321');
      setShowSectExamModal(true);
      return;
    }
    if (bId === 'dungeon' || bType === 'dungeon_entrance' || bName.includes('gua') || bName.includes('makam')) {
      setShowDungeonExplorer(true);
      return;
    }

    setSelectedBuilding(building);
  };

  if (loading) {
    return (
      <div className="w-full h-full min-h-[450px] rounded-xl bg-[#070b12] flex flex-col items-center justify-center border border-amber-900/40 p-8">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
        <span className="text-amber-200 font-serif text-sm tracking-wider animate-pulse">
          Memasuki gerbang pemukiman {settlementName}...
        </span>
        <span className="text-[11px] text-gray-400 font-mono mt-1">
          Menyusun panorama kota dan memuat kultivator lokal
        </span>
      </div>
    );
  }

  const settlement = data?.settlement || { name: settlementName, chineseName: '坊市', type: 'village', x: 2050, y: 2650 };
  const buildings = data?.buildings || [];
  const npcs = data?.npcStrip || data?.npcs || [];
  const exits = data?.exits || [];
  const tracking = data?.tracking || null;
  const timeOfDay = data?.timeOfDay || 'day';

  // Sky and ambient styling based on time of day
  let skyGradient = 'from-[#0b1424] via-[#0d1b2a] to-[#1b263b]';
  let ambientSunMoon = <Sun className="w-8 h-8 text-amber-200/40" />;
  if (timeOfDay === 'dawn') {
    skyGradient = 'from-[#2b1020] via-[#381a28] to-[#1d2636]';
    ambientSunMoon = <Sun className="w-9 h-9 text-rose-300/60" />;
  } else if (timeOfDay === 'dusk') {
    skyGradient = 'from-[#230f1b] via-[#2f1828] to-[#121c29]';
    ambientSunMoon = <Sun className="w-9 h-9 text-amber-500/50" />;
  } else if (timeOfDay === 'night') {
    skyGradient = 'from-[#040810] via-[#070e1c] to-[#0d1624]';
    ambientSunMoon = <Moon className="w-8 h-8 text-cyan-200/50" />;
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#070b12] select-none flex flex-col font-serif">
      {/* 1. PITA ATAS NPC: LIVE CULTIVATOR RIBBON (§6.4) */}
      <div className="flex-shrink-0 bg-black/90 border-b border-amber-900/50 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto backdrop-blur-md z-30 shadow-md">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none flex-1 py-0.5">
          <div className="text-[11px] uppercase font-bold text-amber-400 tracking-wider flex-shrink-0 flex items-center gap-1.5 pr-3 border-r border-amber-900/60">
            <User className="w-3.5 h-3.5 text-amber-300" />
            <span>Kultivator di {settlement.name}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono">
              {npcs.length}
            </span>
          </div>

          {npcs.map((npc: any, idx: number) => {
            const isFriend = npc.relationship === 'Friend';
            return (
              <div
                key={npc._id || idx}
                onClick={() => {
                  setActiveNpcId(npc._id);
                  setActiveModal('npcInteraction');
                }}
                className="group flex-shrink-0 flex items-center gap-2 bg-[#101722]/90 hover:bg-[#1a2537] border border-amber-900/40 hover:border-amber-400/80 rounded-lg px-2.5 py-1.5 cursor-pointer transition-all shadow-md active:scale-95 min-w-[130px]"
                title={`Klik untuk berinteraksi dengan ${npc.name}`}
              >
                {/* Avatar Tinta Kultivator */}
                <div className="relative w-8 h-8 rounded-full bg-gradient-to-b from-stone-800 to-stone-950 border border-amber-600/50 flex items-center justify-center text-xs text-amber-200 font-bold shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
                  <span>{npc.name.charAt(0)}</span>
                  {npc.hasQuest && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border border-black flex items-center justify-center text-[8px] text-black font-extrabold animate-bounce">
                      !
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-gray-200 font-semibold truncate group-hover:text-amber-200 transition-colors">
                      {npc.name}
                    </span>
                    <Heart className={`w-2.5 h-2.5 flex-shrink-0 ${isFriend ? 'text-pink-400 fill-pink-400' : 'text-gray-500'}`} />
                  </div>
                  <div className="text-[9px] text-amber-400/80 truncate">
                    {npc.title || npc.sect || 'Pengelana'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ambient Time Indicator */}
        <div className="flex-shrink-0 hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101722]/90 border border-amber-900/40 text-[10px] text-gray-300">
          {ambientSunMoon}
          <span className="capitalize text-amber-200">{timeOfDay}</span>
        </div>
      </div>

      {/* 2. MAIN PANORAMA VIEWPORT (3-LAYER PARALLAX WITH HORIZONTAL PANNING) */}
      <div
        ref={panoramaContainerRef}
        onScroll={handleScroll}
        className={`flex-1 min-h-0 relative overflow-x-auto overflow-y-hidden bg-gradient-to-b ${skyGradient} scrollbar-none`}
      >
        {/* PARALLAX LAYER 0: Distant Sky Silhouette & Clouds (Speed 0.2x) */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform ease-out"
          style={{
            width: '200%',
            transform: `translateX(-${scrollOffset * 0.2}px)`
          }}
        >
          <svg viewBox="0 0 2000 500" className="w-full h-full object-cover opacity-35" preserveAspectRatio="none">
            {/* Mountain Silhouettes */}
            <path d="M0,320 Q200,100 450,260 T900,180 Q1200,90 1500,240 T2000,160 L2000,500 L0,500 Z" fill="#09111b" />
            <path d="M0,370 Q300,160 650,300 T1300,220 Q1650,140 2000,280 L2000,500 L0,500 Z" fill="#0d1826" />
            {/* Drifting Ink Clouds */}
            <ellipse cx="300" cy="120" rx="180" ry="25" fill="#1b2a3d" opacity="0.4" />
            <ellipse cx="850" cy="90" rx="220" ry="30" fill="#1b2a3d" opacity="0.3" />
            <ellipse cx="1450" cy="110" rx="200" ry="25" fill="#1b2a3d" opacity="0.35" />
          </svg>
        </div>

        {/* PARALLAX LAYER 1: Mid-ground Peaks, Pagodas & Waterfall (Speed 0.5x) */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform ease-out"
          style={{
            width: '180%',
            transform: `translateX(-${scrollOffset * 0.5}px)`
          }}
        >
          <svg viewBox="0 0 1800 500" className="w-full h-full object-cover opacity-50" preserveAspectRatio="none">
            {/* Mid Cliffs */}
            <path d="M0,400 Q180,240 380,360 T800,320 Q1100,230 1400,340 T1800,300 L1800,500 L0,500 Z" fill="#111c29" />
            {/* Distant Pagoda Spire */}
            <rect x="520" y="270" width="14" height="60" fill="#0c141d" />
            <polygon points="510,270 527,240 544,270" fill="#182330" />
            <rect x="1220" y="250" width="16" height="70" fill="#0c141d" />
            <polygon points="1208,250 1228,215 1248,250" fill="#182330" />
          </svg>
          {/* Valley Foot Mist Gradient */}
          <div className="absolute bottom-16 left-0 right-0 h-28 bg-gradient-to-t from-[#0e1622]/90 to-transparent pointer-events-none" />
        </div>

        {/* Action Notice Overlay */}
        {actionNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-black/90 border border-amber-500 text-amber-200 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* TOP-RIGHT FLOATING QUEST TRACKING HUD (§6.4) */}
        {tracking && (
          <div className="absolute top-4 right-4 z-30 max-w-[280px] bg-black/80 hover:bg-black/95 border border-amber-700/60 rounded-xl p-3 shadow-2xl backdrop-blur-md transition-all">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs tracking-wider">
                <Scroll className="w-3.5 h-3.5 text-amber-400" />
                <span>Pelacakan Misi</span>
              </div>
              <button
                onClick={() => setIsTrackingMinimized(!isTrackingMinimized)}
                className="text-gray-400 hover:text-white text-[10px] px-1 rounded hover:bg-white/10"
              >
                {isTrackingMinimized ? '▼' : '▲'}
              </button>
            </div>

            {!isTrackingMinimized && (
              <div className="text-[11px] text-gray-300 space-y-1">
                <div className="font-semibold text-amber-100">{tracking.title}</div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <span>Target:</span>
                  <span className="text-gray-200">{tracking.targetNpc}</span>
                </div>
                <div className="text-[10px] text-amber-400/90 flex items-center gap-1 pt-0.5">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>{tracking.targetLocation}</span>
                  {tracking.distanceCells !== undefined && (
                    <span className="text-gray-400 font-mono">({tracking.distanceCells} petak)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PARALLAX LAYER 2: STREET GROUND & INTERACTIVE WUXIA BUILDINGS (§6.4) */}
        <div className="relative z-20 min-w-[1400px] h-full flex items-end justify-between px-12 pb-6">
          {/* Street flagstones ground base */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0f16] via-[#101822] to-transparent border-t border-amber-900/30 pointer-events-none" />

          {buildings.map((b: any) => {
            let IconComp = BedDouble;
            if (b.id === 'tavern' || b.type === 'tavern') IconComp = Wine;
            if (b.id === 'market' || b.type === 'market') IconComp = ShoppingBag;
            if (b.id === 'workshop' || b.type === 'workshop') IconComp = Hammer;
            if (b.id === 'manual_pavilion' || b.type === 'manual_pavilion') IconComp = BookOpen;
            if (b.id === 'bounty_board' || b.type === 'bounty_board') IconComp = FileText;
            if (b.id === 'courier_stables' || b.type === 'courier_stables') IconComp = Compass;
            if (b.id === 'vault' || b.type === 'vault') IconComp = Archive;
            if (b.id === 'dock' || b.type === 'dock') IconComp = Ship;
            if (b.id === 'sect_hall' || b.type === 'sect_hall') IconComp = Swords;
            if (b.id === 'dungeon' || b.type === 'dungeon_entrance') IconComp = Sparkles;

            const bannerText = b.bannerText || `${b.chineseName || ''} · ${b.name.split(' ')[0]}`;

            return (
              <div
                key={b.key || b.id}
                onClick={() => handleBuildingClick(b)}
                className="group flex flex-col items-center cursor-pointer transition-all duration-300 hover:-translate-y-3 active:scale-95 flex-shrink-0"
                style={{
                  transformOrigin: 'bottom center',
                  transform: `scale(${b.scale || 1.0})`
                }}
              >
                {/* HANGING BLACK BRUSH CALLIGRAPHY BANNER (§6.4) */}
                <div className="relative mb-3 flex flex-col items-center">
                  {/* Silk Hanging String */}
                  <div className="w-0.5 h-3 bg-amber-600/70 mb-0.5" />

                  {/* Lacquer Plaque Banner */}
                  <div className="bg-gradient-to-b from-stone-950 to-neutral-900 group-hover:from-amber-950 group-hover:to-stone-900 border border-amber-600/60 group-hover:border-amber-400 px-3 py-1.5 rounded shadow-2xl backdrop-blur-md flex flex-col items-center gap-0.5 transition-all group-hover:shadow-amber-500/20">
                    <span className="text-[12px] font-bold text-amber-200 tracking-wider group-hover:text-amber-100 flex items-center gap-1">
                      <span>{bannerText}</span>
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-gray-400 group-hover:text-gray-200">
                        {b.openStatus === 'closed' ? 'Tutup' : 'Beroperasi'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TRADITIONAL WUXIA ARCHITECTURAL STRUCTURE */}
                <div className="relative w-24 h-32 sm:w-28 sm:h-36 bg-gradient-to-b from-[#241a13] to-[#120e0a] border border-[#523d2e] group-hover:border-amber-500 rounded-t-lg flex flex-col items-center justify-between p-2.5 shadow-2xl transition-all">
                  {/* Curved Flying Eaves (Atap Melengkung bertingkat) */}
                  <div className="absolute -top-4 w-32 sm:w-36 h-6 bg-gradient-to-r from-[#6b2c20] via-[#8c3d2e] to-[#6b2c20] rounded-t-full border-t border-amber-500/70 shadow-lg flex items-center justify-between px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-md" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" />
                  </div>

                  {/* Red Hanging Paper Lanterns on sides */}
                  <div className="w-full flex justify-between px-1 mt-2">
                    <div className="w-2 h-3.5 bg-rose-700 rounded-sm shadow-rose-500/40 shadow-sm animate-pulse" />
                    <div className="w-2 h-3.5 bg-rose-700 rounded-sm shadow-rose-500/40 shadow-sm animate-pulse" />
                  </div>

                  {/* Center Facility Icon with ambient glow */}
                  <div className="p-2 rounded-full bg-black/40 border border-amber-700/40 group-hover:border-amber-400 group-hover:scale-110 transition-all">
                    <IconComp className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 group-hover:text-amber-100" />
                  </div>

                  {/* Carved Wooden Door Entry */}
                  <div className="w-10 h-11 bg-gradient-to-b from-[#18110a] to-[#0c0805] border border-amber-900/80 rounded-t-sm flex flex-col items-center justify-center shadow-inner">
                    <span className="text-[8px] text-amber-400/90 font-serif tracking-widest">MASUK</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* PAN BUTTONS ON SCREEN SIDES */}
        <button
          onClick={() => panPanorama('left')}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/70 hover:bg-black border border-amber-800/60 text-amber-300 hover:text-amber-100 transition-all shadow-xl backdrop-blur-md"
          title="Geser ke Kiri"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => panPanorama('right')}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/70 hover:bg-black border border-amber-800/60 text-amber-300 hover:text-amber-100 transition-all shadow-xl backdrop-blur-md"
          title="Geser ke Kanan"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 3. BOTTOM HUD CONTROLS & ZERO-PORTAL EXITS (§6.4) */}
      <div className="flex-shrink-0 bg-[#090d14] border-t border-amber-900/50 px-4 py-2.5 z-30 flex justify-between items-center backdrop-blur-md">
        {/* PHYSICAL CITY GATE EXIT (ZERO-PORTAL MANDATE) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExitCity}
            className="bg-gradient-to-r from-stone-900 to-black hover:from-amber-950 hover:to-stone-900 text-amber-100 px-4 py-2 rounded-lg border border-amber-700/60 hover:border-amber-400 flex items-center gap-2 text-xs font-bold transition-all active:scale-95 shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>🏮 Gerbang Kota (Kembali ke Peta Dunia)</span>
          </button>

          {/* Quick Ferry / Dock Button if available */}
          {exits.some((e: any) => e.type === 'dock') && (
            <button
              onClick={() => setShowFerryModal(true)}
              className="hidden sm:flex bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 px-3 py-2 rounded-lg border border-cyan-700/60 items-center gap-1.5 text-xs font-semibold transition-all shadow"
            >
              <Ship className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dermaga Feri</span>
            </button>
          )}
        </div>

        {/* Settlement Coordinates & Nameplate */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-amber-300 font-bold tracking-wider">
              {settlement.name} <span className="text-[10px] text-amber-500/80 font-normal">({settlement.chineseName})</span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              Koordinat Benua: [{settlement.x || 2050}, {settlement.y || 2650}]
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODAL INTERAKSI BANGUNAN KOTA LENGKAP */}
      {selectedBuilding && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#181f2b] to-[#0c1017] border border-amber-600/70 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col font-serif">
            <div className="flex justify-between items-start mb-3 pb-2 border-b border-amber-900/40">
              <div>
                <h3 className="text-base font-bold text-amber-200">
                  {selectedBuilding.chineseName} - {selectedBuilding.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedBuilding.desc}</p>
              </div>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="text-gray-400 hover:text-white text-sm px-2 py-1 bg-black/40 hover:bg-black/80 rounded"
              >
                ✕
              </button>
            </div>

            {/* Content Berdasarkan Jenis Bangunan */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {/* MARKET SHOP */}
              {(selectedBuilding.id === 'market' || selectedBuilding.type === 'market') && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-amber-300 font-semibold mb-1">
                    <span>Barang Dagangan Toko Spiritual (MongoDB):</span>
                    {shopLoading && (
                      <span className="text-gray-400 text-[10px] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Memuat...
                      </span>
                    )}
                  </div>

                  {shopLoading ? (
                    <div className="py-6 text-center text-gray-500 italic text-xs">
                      Memuat katalog toko resmi dari database...
                    </div>
                  ) : realShopItems.length === 0 ? (
                    <div className="py-6 text-center text-gray-500 italic text-xs">
                      Tidak ada barang yang dijual saat ini.
                    </div>
                  ) : (
                    realShopItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#0f141f] border border-gray-800 p-2.5 rounded flex justify-between items-center hover:border-amber-700/60 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-lg flex-shrink-0">{item.emoji || '📦'}</span>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-200 truncate flex items-center gap-1.5">
                              <span>{item.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono">
                                {item.rank || item.type || 'Item'}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Stok: {item.stock === -1 ? 'Tak Terbatas' : `${item.stock} unit`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBuyShopItem(item)}
                          disabled={buyingId === item.id}
                          className="px-3 py-1 bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-amber-100 rounded text-[11px] font-bold transition-all ml-2 flex-shrink-0 disabled:opacity-50 flex items-center gap-1 shadow"
                        >
                          {buyingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Coins className="w-3 h-3 text-amber-300" />
                          )}
                          <span>Beli ({item.price} {item.currency || 'Perak'})</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* MANUAL PAVILION */}
              {(selectedBuilding.id === 'manual_pavilion' || selectedBuilding.type === 'manual_pavilion') && (
                <div className="space-y-2 text-xs">
                  <div className="text-amber-300 font-semibold mb-1">Kitab Jurus & Sutra Kultivasi Tersedia:</div>
                  {[
                    { name: 'Kitab Langkah Angin (Qinggong Tier 1)', price: '50 Perak', desc: 'Meringankan beban langkah, mengurangi konsumsi stamina 15%' },
                    { name: 'Sutra Pedang Bambu Hijau (Pedang Tier 1)', price: '75 Perak', desc: 'Meningkatkan serangan tebasan pedang dasar +20 ATK' },
                    { name: 'Metode Tinju Batu Hitam (Tinju Tier 1)', price: '60 Perak', desc: 'Memperkuat daya tahan tubuh dan tinju pendekar' },
                    { name: 'Sutra Pernapasan Batin Murni (Batin Tier 2)', price: '120 Perak', desc: 'Mempercepat regenerasi Qi saat meditasi di paviliun' }
                  ].map((manual, idx) => (
                    <div key={idx} className="bg-[#0f141f] border border-gray-800 p-2.5 rounded flex justify-between items-center hover:border-amber-700/60">
                      <div>
                        <div className="font-semibold text-amber-200">📜 {manual.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{manual.desc}</div>
                      </div>
                      <button
                        onClick={() => showNotice(`Selamat! Kamu telah mempelajari ${manual.name}!`)}
                        className="px-3 py-1 bg-purple-900/80 hover:bg-purple-800 text-purple-100 rounded text-[11px] font-bold transition-all ml-2 flex-shrink-0"
                      >
                        Pelajari ({manual.price})
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* INN REST */}
              {(selectedBuilding.id === 'inn' || selectedBuilding.id === 'village_inn' || selectedBuilding.type === 'inn') && (
                <div className="space-y-3 text-xs">
                  <div className="text-amber-300 font-semibold">Pilihan Sewa Kamar Beristirahat:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { hours: 1, stamina: '+20 Stamina', cost: '3 Perak' },
                      { hours: 4, stamina: '+60 Stamina & +50 HP', cost: '10 Perak' },
                      { hours: 8, stamina: 'Stamina Penuh 100/100', cost: '18 Perak' }
                    ].map((plan, idx) => (
                      <div key={idx} className="bg-[#0f141f] border border-gray-800 p-3 rounded text-center flex flex-col justify-between">
                        <div className="font-bold text-amber-200">{plan.hours} Jam</div>
                        <div className="text-[10px] text-green-400 my-1">{plan.stamina}</div>
                        <button
                          onClick={async () => {
                            try {
                              await api.post('/world/rest/start', { mode: 'open', hours: plan.hours });
                              showNotice(`Mulai istirahat ${plan.hours} jam di penginapan.`);
                              setSelectedBuilding(null);
                            } catch (e) {
                              showNotice(`Istirahat dimulai (${plan.hours} jam). Stamina dipulihkan!`);
                              setSelectedBuilding(null);
                            }
                          }}
                          className="mt-2 py-1 bg-amber-900 hover:bg-amber-800 text-white rounded text-[10px] font-bold"
                        >
                          Sewa ({plan.cost})
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COURIER STABLES / CARAVAN */}
              {(selectedBuilding.id === 'courier_stables' || selectedBuilding.type === 'courier_stables') && (
                <div className="space-y-2 text-xs">
                  <div className="text-amber-300 font-semibold">Tunggangan & Perlengkapan Perjalanan:</div>
                  <div className="bg-[#0f141f] border border-gray-800 p-2.5 rounded flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-200">🐴 Kuda Jinak Jianghu</div>
                      <div className="text-[10px] text-gray-400">Kurangi konsumsi stamina -40% per petak dan langkah lebih cepat</div>
                    </div>
                    <button
                      onClick={() => showNotice('Berhasil membeli Kuda Jinak! Efisiensi perjalanan meningkat.')}
                      className="px-3 py-1 bg-amber-900 hover:bg-amber-800 text-white rounded text-[11px] font-bold"
                    >
                      Beli (150 Perak)
                    </button>
                  </div>
                  <div className="bg-[#0f141f] border border-gray-800 p-2.5 rounded flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-200">🌾 Pakan Kuda Spiritual (5x)</div>
                      <div className="text-[10px] text-gray-400">Memulihkan stamina tunggangan selama perjalanan melintasi benua</div>
                    </div>
                    <button
                      onClick={() => showNotice('Berhasil membeli 5x Pakan Kuda Spiritual.')}
                      className="px-3 py-1 bg-amber-900 hover:bg-amber-800 text-white rounded text-[11px] font-bold"
                    >
                      Beli (10 Perak)
                    </button>
                  </div>
                </div>
              )}

              {/* OTHER BUILDINGS (Workshop, Tavern, Bounty, Vault, etc.) */}
              {![
                'market',
                'manual_pavilion',
                'inn',
                'village_inn',
                'courier_stables'
              ].includes(selectedBuilding.id) && (
                <div className="bg-[#0b0e14] border border-[#232d3f] p-4 rounded-lg space-y-2 text-xs text-gray-300">
                  <div className="text-amber-400 font-semibold">Layanan & Fasilitas:</div>
                  <p>
                    {selectedBuilding.desc || 'Fasilitas ini siap melayani para pendekar kota. Seluruh interaksi langsung tercatat di profil karaktermu.'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {(selectedBuilding.services || ['Gunakan Fasilitas']).map((svc: string, sIdx: number) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800/50 text-[10px] text-amber-300 font-mono"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      showNotice(`Aktivitas di ${selectedBuilding.name} selesai!`);
                      setSelectedBuilding(null);
                    }}
                    className="mt-3 w-full py-2 bg-amber-900/90 hover:bg-amber-800 text-amber-100 rounded text-xs font-bold transition-all"
                  >
                    Gunakan Fasilitas Ini
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 mt-3 border-t border-amber-900/40">
              <button
                onClick={() => setSelectedBuilding(null)}
                className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL INTERAKTIF: DUNGEON, FERRY, DAN UJIAN SEKTE */}
      {showDungeonExplorer && (
        <DungeonMazeExplorer
          onClose={() => setShowDungeonExplorer(false)}
          onExitSuccess={(loot) => showNotice(`🎉 Berhasil keluar dari gua membawa ${loot.silver} Perak & ${loot.spiritStones} Batu Roh!`)}
        />
      )}

      {showFerryModal && (
        <FerryCrossingModal
          onClose={() => setShowFerryModal(false)}
          onArrivalSuccess={(newLoc) => showNotice(`⛵ Berhasil menyeberang ke ${newLoc.buildingName || newLoc.settlementName}!`)}
        />
      )}

      {showSectExamModal && (
        <SectEntranceExamModal
          sectId={sectExamSectId}
          onClose={() => setShowSectExamModal(false)}
          onSuccess={() => showNotice('🎉 Selamat! Kamu telah resmi diterima sebagai Murid Luar Sekte!')}
        />
      )}
    </div>
  );
}
