import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Settings } from 'lucide-react';

interface Region {
  _id: string;
  regionSlug: string;
  displayName: string;
  worldMapX: number;
  worldMapY: number;
  regionMapImageUrl: string | null;
  discovered: boolean;
}

interface WorldMapViewProps {
  onSelectRegion: (regionSlug: string) => void;
}

export default function WorldMapView({ onSelectRegion }: WorldMapViewProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [worldMapUrl, setWorldMapUrl] = useState<string>('https://placehold.co/2560x1440/png?text=World+Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reduceMotion, setReduceMotion] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWorldMap = async () => {
      try {
        const res = await api.get('/map/world');
        setRegions(res.data.regions || []);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch world map', err);
        setError(err.response?.data?.error || 'Gagal memuat peta dunia');
        setLoading(false);
      }
    };

    fetchWorldMap();

    // Check motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const saved = localStorage.getItem('jianghu_reduce_motion');
    if (saved === 'true') {
      setReduceMotion(true);
    } else if (saved === 'false') {
      setReduceMotion(false);
    } else if (mediaQuery.matches) {
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
  };

  if (loading) {
    return <div className="w-full h-96 flex items-center justify-center text-gray-400">Memuat Peta Dunia...</div>;
  }

  if (error) {
    return <div className="w-full h-96 flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#2a3142] shadow-2xl bg-black">
      {/* Settings Toggle */}
      <button
        onClick={toggleReduceMotion}
        className="absolute top-4 left-4 z-30 bg-black/60 hover:bg-black/80 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-600 flex items-center gap-2 backdrop-blur-sm transition-colors text-xs"
        title="Kurangi Animasi (Parallax)"
      >
        <Settings className="w-4 h-4" />
        {reduceMotion ? 'Animasi: OFF' : 'Animasi: ON'}
      </button>

      <div
        ref={mapRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="absolute inset-0 w-full h-full overflow-hidden"
      >
        <div
          className="absolute inset-0 w-full h-full transition-transform duration-200 ease-out"
          style={
            !reduceMotion ? {
              transform: 'translate(calc(var(--mouse-x, 0) * -20px), calc(var(--mouse-y, 0) * -20px)) scale(1.05)'
            } : {}
          }
        >
          {/* Background Layer */}
          <img
            src={worldMapUrl}
            alt="World Map"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.7)' }}
          />

          {/* Pins Layer */}
          {regions.map((region) => {
            const isDiscovered = region.discovered;
            return (
              <div
                key={region.regionSlug}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 group z-10"
                style={{
                  left: `${region.worldMapX}%`,
                  top: `${region.worldMapY}%`,
                  opacity: isDiscovered ? 1 : 0.6
                }}
                onClick={() => onSelectRegion(region.regionSlug)}
              >
                {/* Map Pin Icon */}
                <div className={`w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center ${isDiscovered ? 'bg-amber-600 border-amber-300' : 'bg-gray-700 border-gray-500'}`}>
                   <div className={`w-2 h-2 rounded-full ${isDiscovered ? 'bg-amber-100' : 'bg-gray-400'}`}></div>
                </div>

                {/* Label */}
                <div className="mt-2 px-2 py-1 bg-black/70 border border-gray-700 rounded text-xs font-semibold whitespace-nowrap text-center backdrop-blur-sm pointer-events-none text-white drop-shadow-md">
                  {isDiscovered ? region.displayName : '???'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
