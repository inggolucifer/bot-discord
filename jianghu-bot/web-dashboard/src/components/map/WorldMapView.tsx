import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

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
  }, []);

  if (loading) {
    return <div className="w-full h-96 flex items-center justify-center text-gray-400">Memuat Peta Dunia...</div>;
  }

  if (error) {
    return <div className="w-full h-96 flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#2a3142] shadow-2xl bg-black">
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
            {/* Map Pin Icon (Simple CSS circle for now, or SVG) */}
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
  );
}
