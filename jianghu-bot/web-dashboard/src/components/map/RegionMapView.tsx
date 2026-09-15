import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Shield, Home, Sword, MapPin, Map as MapIcon, Compass } from 'lucide-react';

interface Settlement {
  name: string;
  regionSlug: string;
  mapX: number;
  mapY: number;
  mapIconType: string | null;
  minRealmIndex: number;
  discovered: boolean;
  key: string;
}

interface Edge {
  from: string;
  to: string;
  distanceLi: number;
}

interface RegionMapViewProps {
  regionSlug: string;
  onBackToWorld: () => void;
  onSelectSettlement: (settlementName: string) => void;
  onStartTravelTo: (settlementName: string) => void;
  currentLocationName: string | null;
  travelStatus: any;
}

export default function RegionMapView({
  regionSlug,
  onBackToWorld,
  onSelectSettlement,
  onStartTravelTo,
  currentLocationName,
  travelStatus
}: RegionMapViewProps) {
  const [region, setRegion] = useState<any>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRealmIndex, setPlayerRealmIndex] = useState<number>(0);

  // For travel animation
  const [playerPos, setPlayerPos] = useState<{x: number, y: number} | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const fetchRegionData = async () => {
      try {
        const [regionRes, setRes] = await Promise.all([
          api.get(`/map/region/${regionSlug}`),
          api.get('/world/settlements') // we need playerRealmIndex from here for now
        ]);

        setRegion(regionRes.data.region);
        setSettlements(regionRes.data.settlements || []);
        setEdges(regionRes.data.edges || []);
        setPlayerRealmIndex(setRes.data.playerRealmIndex || 0);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch region map', err);
        setError(err.response?.data?.error || 'Gagal memuat peta region');
        setLoading(false);
      }
    };

    fetchRegionData();
  }, [regionSlug]);

  useEffect(() => {
    // Lerp logic for player marker
    if (!settlements.length) return;

    const updatePlayerPosition = () => {
      if (travelStatus && travelStatus.status === 'traveling' && travelStatus.to.regionSlug === regionSlug && travelStatus.from.regionSlug === regionSlug) {
        const fromSettlement = settlements.find(s => s.name === travelStatus.from.settlementName);
        const toSettlement = settlements.find(s => s.name === travelStatus.to.settlementName);

        if (fromSettlement && toSettlement) {
          const startTime = new Date(travelStatus.startTime).getTime();
          const arrivalTime = new Date(travelStatus.arrivalTime).getTime();
          const now = Date.now();

          let t = (now - startTime) / (arrivalTime - startTime);
          t = Math.max(0, Math.min(1, t)); // clamp 0-1

          const currentX = fromSettlement.mapX + (toSettlement.mapX - fromSettlement.mapX) * t;
          const currentY = fromSettlement.mapY + (toSettlement.mapY - fromSettlement.mapY) * t;

          setPlayerPos({ x: currentX, y: currentY });

          if (t < 1) {
            animationRef.current = requestAnimationFrame(updatePlayerPosition);
          }
        }
      } else if (currentLocationName) {
        // Idle at current location
        const currentSet = settlements.find(s => s.name === currentLocationName);
        if (currentSet) {
          setPlayerPos({ x: currentSet.mapX, y: currentSet.mapY });
        }
      }
    };

    updatePlayerPosition();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [travelStatus, settlements, currentLocationName, regionSlug]);

  const getIconForType = (type: string | null) => {
    switch (type) {
      case 'city': return <Home className="w-4 h-4" />;
      case 'village': return <Home className="w-3 h-3" />;
      case 'sect_hall': return <Shield className="w-4 h-4 text-purple-400" />;
      case 'dojo': return <Sword className="w-4 h-4 text-red-400" />;
      case 'danger_zone': return <Sword className="w-4 h-4 text-red-600" />;
      case 'landmark': return <MapPin className="w-4 h-4 text-amber-400" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const handleSettlementClick = (settlement: Settlement) => {
    if (settlement.discovered) {
      onSelectSettlement(settlement.name);
    } else {
      // Check if there is an edge from current location
      if (currentLocationName) {
        const hasEdge = edges.some(e =>
          (e.from === currentLocationName && e.to === settlement.name) ||
          (e.to === currentLocationName && e.from === settlement.name)
        );
        if (hasEdge && playerRealmIndex >= settlement.minRealmIndex) {
          if (window.confirm(`Mulai perjalanan ke ${settlement.name}?`)) {
             onStartTravelTo(settlement.name);
          }
        }
      }
    }
  };

  if (loading) return <div className="w-full h-96 flex items-center justify-center text-gray-400">Memuat Peta Region...</div>;
  if (error) return <div className="w-full h-96 flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#2a3142] shadow-2xl bg-black">
      {/* Back Button */}
      <button
        onClick={onBackToWorld}
        className="absolute top-4 left-4 z-20 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg border border-gray-600 flex items-center gap-2 backdrop-blur-sm transition-colors text-sm"
      >
        <MapIcon className="w-4 h-4" /> Peta Dunia
      </button>

      {/* Region Title */}
      <div className="absolute top-4 right-4 z-20 bg-black/60 border border-amber-900/50 px-4 py-2 rounded-lg backdrop-blur-sm">
         <h3 className="text-amber-200 font-serif font-bold flex items-center gap-2">
            <Compass className="w-4 h-4" /> {region?.displayName || 'Region'}
         </h3>
      </div>

      {/* Background */}
      <img
        src={region?.regionMapImageUrl || 'https://placehold.co/1920x1080/2a3142/fff?text=Region+Map'}
        alt="Region Map"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />

      {/* SVG Overlay for Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}>
        {edges.map((edge, idx) => {
          const fromNode = settlements.find(s => s.name === edge.from);
          const toNode = settlements.find(s => s.name === edge.to);
          if (!fromNode || !toNode) return null;

          // Determine danger visually (just basic styling for now, if region danger is high)
          const isDanger = (region?.dangerTier || 1) >= 3;

          return (
            <line
              key={`edge-${idx}`}
              x1={`${fromNode.mapX}%`}
              y1={`${fromNode.mapY}%`}
              x2={`${toNode.mapX}%`}
              y2={`${toNode.mapY}%`}
              stroke={isDanger ? '#ef4444' : '#b45309'}
              strokeWidth="2"
              className={isDanger ? "animate-pulse" : ""}
              strokeDasharray={isDanger ? "4 4" : "none"}
              opacity="0.6"
            />
          );
        })}
      </svg>

      {/* Settlements Pins */}
      {settlements.map((settlement) => {
        const isDiscovered = settlement.discovered;
        const isCurrent = settlement.name === currentLocationName;

        return (
          <div
            key={settlement.key}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110 z-10 flex flex-col items-center
              ${!isDiscovered ? 'opacity-40 grayscale hover:opacity-80' : ''}`}
            style={{
              left: `${settlement.mapX}%`,
              top: `${settlement.mapY}%`
            }}
            onClick={() => handleSettlementClick(settlement)}
          >
            <div className={`w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center
              ${isCurrent ? 'bg-green-600/80 border-green-300 animate-pulse' :
                isDiscovered ? 'bg-amber-900/80 border-amber-500' : 'bg-gray-800 border-gray-600'}`}
            >
               {getIconForType(settlement.mapIconType)}
            </div>
            <div className="mt-1 px-2 py-0.5 bg-black/80 border border-gray-700/50 rounded text-[10px] font-semibold whitespace-nowrap text-gray-200 backdrop-blur-sm pointer-events-none drop-shadow-md text-center leading-tight">
              {isDiscovered ? settlement.name : '???'}
              {settlement.minRealmIndex > playerRealmIndex && !isDiscovered && (
                <span className="block text-red-400 text-[9px]">(Terkunci)</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Player Marker (Moving or Idle) */}
      {playerPos && (
         <div
           className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-75"
           style={{ left: `${playerPos.x}%`, top: `${playerPos.y}%` }}
         >
           <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)] z-10 relative animate-bounce"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500/40 rounded-full animate-ping"></div>
           </div>
         </div>
      )}
    </div>
  );
}
