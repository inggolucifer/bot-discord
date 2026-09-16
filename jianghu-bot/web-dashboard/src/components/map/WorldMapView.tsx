'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Compass, Settings, MapPin, Sparkles, Navigation, Mountain, Waves, Flame, Trees } from 'lucide-react';

interface Region {
  _id?: string;
  regionSlug: string;
  displayName: string;
  worldMapX: number;
  worldMapY: number;
  regionMapImageUrl?: string | null;
  discovered: boolean;
  terrainType?: string;
  description?: string;
}

interface WorldMapViewProps {
  onSelectRegion: (regionSlug: string) => void;
}

const DEFAULT_REGIONS: Region[] = [
  {
    regionSlug: 'central_plains_bamboo_forest',
    displayName: 'Dataran Tengah (Hutan Bambu)',
    worldMapX: 50,
    worldMapY: 50,
    discovered: true,
    terrainType: 'plains',
    description: 'Pusat peradaban dunia persilatan, pemukiman ramai dan urat spiritual seimbang.'
  },
  {
    regionSlug: 'kunlun_snow_peaks',
    displayName: 'Pegunungan Salju Kunlun',
    worldMapX: 25,
    worldMapY: 28,
    discovered: true,
    terrainType: 'glacial',
    description: 'Puncak es abadi bersuhu beku ekstrem tempat petapa tingkat tinggi menyendiri.'
  },
  {
    regionSlug: 'toxic_swamp_valley',
    displayName: 'Rawa Miasma Beracun',
    worldMapX: 35,
    worldMapY: 72,
    discovered: true,
    terrainType: 'swamp',
    description: 'Kawasan terisolasi yang diselimuti kabut racun rawa dan herba langka mematikan.'
  },
  {
    regionSlug: 'eastern_sea_coast',
    displayName: 'Pesisir Laut Timur',
    worldMapX: 78,
    worldMapY: 45,
    discovered: true,
    terrainType: 'settlement',
    description: 'Pelabuhan niaga tersibuk di Jianghu dengan saudagar rempah dan pesilat pengembara.'
  },
  {
    regionSlug: 'volcanic_crags',
    displayName: 'Kawah Api Vulkanik',
    worldMapX: 72,
    worldMapY: 75,
    discovered: true,
    terrainType: 'volcanic',
    description: 'Lembah lava membara tempat penempaan senjata baja meteor esoterik.'
  }
];

export default function WorldMapView({ onSelectRegion }: WorldMapViewProps) {
  const [regions, setRegions] = useState<Region[]>(DEFAULT_REGIONS);
  const [loading, setLoading] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<Region | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWorldMap = async () => {
      try {
        const res = await api.get('/map/world');
        if (res.data.regions && res.data.regions.length > 0) {
          setRegions(res.data.regions);
        }
      } catch (err: any) {
        // Gunakan default regions jika API belum terisi
        setRegions(DEFAULT_REGIONS);
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

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-amber-900/60 shadow-2xl bg-[#0a0d14] select-none flex flex-col">
      {/* Top HUD Controls */}
      <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/80 border border-amber-800/60 px-3.5 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2 shadow-lg">
            <Compass className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '12s' }} />
            <h3 className="font-serif font-bold text-amber-200 text-xs tracking-wider uppercase">Peta Makro Benua Jianghu</h3>
          </div>

          <button
            onClick={toggleReduceMotion}
            className="bg-black/60 hover:bg-black/80 text-gray-300 px-2.5 py-1.5 rounded-lg border border-gray-700 flex items-center gap-1.5 backdrop-blur-sm transition-colors text-[11px]"
            title="Animasi Parallax"
          >
            <Settings className="w-3.5 h-3.5" />
            {reduceMotion ? 'OFF' : 'ON'}
          </button>
        </div>

        {/* Quick Jump to Live Spatial Grid */}
        <button
          onClick={() => onSelectRegion('central_plains_bamboo_forest')}
          className="pointer-events-auto bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-serif font-bold px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400/50 flex items-center gap-2 text-xs transition-all active:scale-95"
        >
          <Navigation className="w-4 h-4 text-amber-200" />
          Buka Grid Spasial Eksplorasi
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
              transform: 'translate(calc(var(--mouse-x, 0) * -16px), calc(var(--mouse-y, 0) * -16px)) scale(1.03)'
            } : {}
          }
        >
          {/* Stylized Wuxia Cartography Background (Ink wash + parchment) */}
          <div className="absolute inset-0 bg-[#090d15] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />

          {/* Golden Longitude/Latitude Grid lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 1000 600">
            {/* Grid coordinates */}
            <circle cx="500" cy="300" r="220" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6,6" fill="none" />
            <circle cx="500" cy="300" r="140" stroke="#f59e0b" strokeWidth="0.8" fill="none" />
            <line x1="100" y1="300" x2="900" y2="300" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="4,4" />
            <line x1="500" y1="50" x2="500" y2="550" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="4,4" />

            {/* River Lines */}
            <path d="M 200 200 Q 350 250 500 300 T 800 420" stroke="#38bdf8" strokeWidth="3" fill="none" opacity="0.4" />
            <path d="M 450 100 Q 520 220 500 300 T 350 500" stroke="#38bdf8" strokeWidth="2.5" fill="none" opacity="0.3" />

            {/* Mountain Contour Silhouettes */}
            <path d="M 220 250 L 260 180 L 300 250 Z" fill="#1e293b" opacity="0.6" stroke="#475569" strokeWidth="1" />
            <path d="M 270 260 L 320 160 L 370 260 Z" fill="#1e293b" opacity="0.7" stroke="#475569" strokeWidth="1" />
            <path d="M 680 500 L 730 410 L 780 500 Z" fill="#3f1c1c" opacity="0.6" stroke="#7f1d1d" strokeWidth="1" />
            <path d="M 740 510 L 800 390 L 860 510 Z" fill="#3f1c1c" opacity="0.7" stroke="#7f1d1d" strokeWidth="1" />
          </svg>

          {/* Compass Rose (Pojok Kiri Bawah) */}
          <div className="absolute bottom-6 left-6 opacity-30 pointer-events-none flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border border-amber-500/60 flex items-center justify-center">
              <span className="text-[10px] text-amber-300 font-serif font-bold">N</span>
            </div>
            <span className="text-[8px] text-amber-200/60 mt-1 tracking-widest uppercase">Jianghu Compass</span>
          </div>

          {/* Region Pins Layer */}
          {regions.map((region) => {
            const isHovered = hoveredRegion?.regionSlug === region.regionSlug;
            let PinIcon = Trees;
            let iconColor = 'text-amber-300';
            let pinGlow = 'rgba(245, 158, 11, 0.6)';

            if (region.terrainType === 'glacial') {
              PinIcon = Mountain;
              iconColor = 'text-cyan-300';
              pinGlow = 'rgba(6, 182, 212, 0.7)';
            } else if (region.terrainType === 'swamp') {
              PinIcon = Waves;
              iconColor = 'text-purple-300';
              pinGlow = 'rgba(168, 85, 247, 0.7)';
            } else if (region.terrainType === 'volcanic') {
              PinIcon = Flame;
              iconColor = 'text-red-400';
              pinGlow = 'rgba(239, 68, 68, 0.7)';
            }

            return (
              <div
                key={region.regionSlug}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-125 z-20 group"
                style={{
                  left: `${region.worldMapX}%`,
                  top: `${region.worldMapY}%`
                }}
                onMouseEnter={() => setHoveredRegion(region)}
                onClick={() => onSelectRegion(region.regionSlug)}
              >
                {/* Glowing Aura Ring */}
                <div
                  className="w-10 h-10 rounded-full border-2 border-amber-400/80 flex items-center justify-center backdrop-blur-xs transition-all"
                  style={{
                    backgroundColor: 'rgba(14, 20, 31, 0.85)',
                    boxShadow: `0 0 16px ${pinGlow}`
                  }}
                >
                  <PinIcon className={`w-5 h-5 ${iconColor} transition-transform group-hover:rotate-12`} />
                </div>

                {/* Region Label Badge */}
                <div className="mt-1 px-2.5 py-0.5 bg-black/85 border border-amber-700/60 rounded-full text-[10px] font-serif font-bold text-amber-200 whitespace-nowrap text-center shadow-lg pointer-events-none transition-all group-hover:border-amber-400 group-hover:text-white">
                  {region.displayName}
                </div>
              </div>
            );
          })}

          {/* Region Detail Card Tooltip */}
          {hoveredRegion && (
            <div
              className="absolute bottom-6 right-6 z-40 bg-[#0e1422]/95 border border-amber-600/70 p-4 rounded-xl shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in slide-in-from-bottom-2 pointer-events-none"
            >
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-amber-400" />
                <h4 className="font-serif font-bold text-amber-200 text-sm">{hoveredRegion.displayName}</h4>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {hoveredRegion.description || 'Wilayah terbuka yang dapat dijelajahi pada kisi koordinat spasial.'}
              </p>
              <div className="mt-2.5 pt-2 border-t border-gray-800 text-[10px] text-amber-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Klik untuk menjelajahi Grid Wilayah ini
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
