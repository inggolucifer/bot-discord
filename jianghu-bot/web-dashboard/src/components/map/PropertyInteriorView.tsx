'use client';
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useGlobalAssetLoader } from '@/hooks/useGlobalAssetLoader';
import {
  DoorOpen, Sparkles, Flame, Shield, Leaf, Home, User,
  Fish, Utensils, Sprout, Hammer, Coffee, Footprints
} from 'lucide-react';
import AcupointPulseMinigame from '../minigames/AcupointPulseMinigame';
import KataQteMinigame from '../minigames/KataQteMinigame';
import CrucibleEquilibriumMinigame from '../minigames/CrucibleEquilibriumMinigame';
import FishingReelMinigame from '../minigames/FishingReelMinigame';
import CookingFlameMinigame from '../minigames/CookingFlameMinigame';
import HerbHarvestMinigame from '../minigames/HerbHarvestMinigame';

interface PropertyInteriorViewProps {
  propertyData: {
    id: string;
    name: string;
    ownerId: string;
    ownerName: string;
    isOwner: boolean;
    subGridWidth: number;
    subGridHeight: number;
    facilities: {
      qiGatheringArrayTier: number;
      alchemyCrucibleTier: number;
      forgeAnvilTier: number;
      herbPlotsUnlocked: number;
    };
    layout: number[];
    tileMetadata: Record<number, { name: string; isSolid: boolean; interactable: boolean; action?: string }>;
  };
  onExit: () => void;
}

export default function PropertyInteriorView({ propertyData, onExit }: PropertyInteriorViewProps) {
  const { loadedImages } = useGlobalAssetLoader();
  const [facilities, setFacilities] = useState(propertyData.facilities);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 5, y: 10 }); // Di depan pintu keluar
  const [activeMinigame, setActiveMinigame] = useState<
    'acupoint' | 'kata' | 'crucible' | 'fishing' | 'cooking' | 'harvest' | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);

  const width = propertyData.subGridWidth || 12;
  const height = propertyData.subGridHeight || 12;

  // Gabungkan tile metadata standar dengan workstation lengkap
  const metadata: Record<number, { name: string; isSolid: boolean; interactable: boolean; action?: string }> = {
    0: { name: 'Lantai Kayu', isSolid: false, interactable: false },
    1: { name: 'Dinding Kayu', isSolid: true, interactable: false },
    2: { name: 'Meja Teh', isSolid: true, interactable: true, action: 'reception_chat' },
    3: { name: 'Bantal Semadi', isSolid: false, interactable: true, action: 'minigame_acupoint' },
    4: { name: 'Kuali Alkimia', isSolid: true, interactable: true, action: 'minigame_crucible' },
    5: { name: 'Landasan Tempa', isSolid: true, interactable: true, action: 'minigame_kata' },
    6: { name: 'Petak Herbal', isSolid: false, interactable: true, action: 'minigame_harvest' },
    7: { name: 'Pintu Keluar', isSolid: false, interactable: true, action: 'exit_property' },
    8: { name: 'Kolam Ikan Rohani', isSolid: true, interactable: true, action: 'minigame_fishing' },
    9: { name: 'Dapur Masak', isSolid: true, interactable: true, action: 'minigame_cooking' },
    ...(propertyData.tileMetadata || {})
  };

  // Keyboard Navigation WASD / Panah di dalam Interior
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeMinigame) return;

      let dx = 0;
      let dy = 0;
      const key = e.key.toLowerCase();

      if (key === 'arrowup' || key === 'w') dy = -1;
      else if (key === 'arrowdown' || key === 's') dy = 1;
      else if (key === 'arrowleft' || key === 'a') dx = -1;
      else if (key === 'arrowright' || key === 'd') dx = 1;
      else return;

      e.preventDefault();
      const targetX = Math.max(0, Math.min(width - 1, playerPos.x + dx));
      const targetY = Math.max(0, Math.min(height - 1, playerPos.y + dy));

      handleTileClick(targetX, targetY);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, activeMinigame, width, height]);

  const handleTileClick = (x: number, y: number) => {
    const tileVal = propertyData.layout[y * width + x] ?? 0;
    const meta = metadata[tileVal] || { name: 'Lantai', isSolid: false, interactable: false };

    if (meta.isSolid) {
      if (meta.interactable && meta.action) {
        triggerAction(meta.action);
      }
      return;
    }

    setPlayerPos({ x, y });

    if (meta.interactable && meta.action) {
      triggerAction(meta.action);
    }
  };

  const triggerAction = (action?: string) => {
    if (!action) return;

    if (action === 'exit_property') {
      onExit();
    } else if (action === 'minigame_acupoint') {
      setActiveMinigame('acupoint');
    } else if (action === 'minigame_crucible') {
      setActiveMinigame('crucible');
    } else if (action === 'minigame_kata') {
      setActiveMinigame('kata');
    } else if (action === 'minigame_fishing') {
      setActiveMinigame('fishing');
    } else if (action === 'minigame_cooking') {
      setActiveMinigame('cooking');
    } else if (action === 'minigame_harvest' || action === 'harvest_herbs') {
      setActiveMinigame('harvest');
    } else if (action === 'reception_chat') {
      setNotice('Kamu duduk menikmati secangkir teh harum melati yang menenangkan batin.');
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handleUpgradeFacility = async (type: 'qi_array' | 'crucible' | 'forge' | 'herb_plots') => {
    setIsUpgrading(true);
    try {
      const res = await api.post('/world/zone/upgrade-property-facility', {
        propertyId: propertyData.id,
        facilityType: type
      });
      if (res.data.facilities) {
        setFacilities(res.data.facilities);
      }
      setNotice(res.data.message);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice(err.response?.data?.error || 'Gagal memperbarui fasilitas');
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Render Visual Tile Interior dengan fallback ke procedural art
  const renderTileContent = (tileVal: number) => {
    const interactives = loadedImages.interior_interactives;

    // 3: Bantal Semadi
    if (tileVal === 3) {
      if (interactives?.meditation_mat) {
        return <img src={interactives.meditation_mat.src} alt="Semadi" className="w-full h-full object-contain p-0.5 pointer-events-none drop-shadow-md" />;
      }
      return <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />;
    }

    // 4: Kuali Alkimia
    if (tileVal === 4) {
      if (interactives?.alchemy_furnace) {
        return <img src={interactives.alchemy_furnace.src} alt="Alkimia" className="w-full h-full object-contain p-0.5 pointer-events-none drop-shadow-md" />;
      }
      return <Flame className="w-4 h-4 text-amber-400 animate-bounce" />;
    }

    // 5: Landasan Tempa
    if (tileVal === 5) {
      if (interactives?.forge_anvil) {
        return <img src={interactives.forge_anvil.src} alt="Tempa" className="w-full h-full object-contain p-0.5 pointer-events-none drop-shadow-md" />;
      }
      return <Hammer className="w-4 h-4 text-gray-300" />;
    }

    // 6: Petak Herba
    if (tileVal === 6) {
      if (interactives?.farm_plot) {
        return <img src={interactives.farm_plot.src} alt="Herba" className="w-full h-full object-contain p-0.5 pointer-events-none drop-shadow-md" />;
      }
      return <Leaf className="w-4 h-4 text-emerald-400" />;
    }

    // 8: Kolam Ikan Rohani
    if (tileVal === 8) {
      if (interactives?.fish_pond) {
        return <img src={interactives.fish_pond.src} alt="Kolam Ikan" className="w-full h-full object-contain p-0.5 pointer-events-none drop-shadow-md" />;
      }
      return <Fish className="w-4 h-4 text-cyan-300 animate-pulse" />;
    }

    // 9: Dapur Masak
    if (tileVal === 9) {
      if (interactives?.kitchen_stove) {
        return <img src={interactives.kitchen_stove.src} alt="Dapur" className="w-full h-full object-contain p-0.5 pointer-events-none drop-shadow-md" />;
      }
      return <Utensils className="w-4 h-4 text-orange-400" />;
    }

    // 2: Meja Teh
    if (tileVal === 2) {
      return <Coffee className="w-4 h-4 text-amber-400" />;
    }

    // 7: Pintu Keluar
    if (tileVal === 7) {
      return <DoorOpen className="w-4 h-4 text-amber-300 animate-pulse" />;
    }

    return null;
  };

  return (
    <div className="relative w-full h-full max-h-[88vh] rounded-xl overflow-hidden border border-amber-900/60 shadow-2xl bg-[#090c13] flex flex-col select-none">
      {/* HUD Top Bar */}
      <div className="flex-shrink-0 bg-[#0e131d]/95 border-b border-amber-900/50 px-3 py-1.5 sm:px-4 sm:py-2 z-20 flex justify-between items-center">
        <button
          onClick={onExit}
          className="bg-black/75 hover:bg-black/90 text-amber-200 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-amber-800/60 flex items-center gap-1.5 backdrop-blur-sm transition-colors text-[11px] sm:text-xs font-semibold shadow-lg active:scale-95"
        >
          <DoorOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Keluar ke Peta Dunia
        </button>

        <div className="bg-black/80 border border-amber-700/60 px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg backdrop-blur-md shadow-lg flex items-center gap-2">
          <Home className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-200 font-serif font-bold text-xs sm:text-sm">{propertyData.name}</span>
          <span className="text-[10px] sm:text-xs text-gray-400">({propertyData.ownerName})</span>
        </div>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div className="absolute top-10 sm:top-14 left-1/2 -translate-x-1/2 z-30 bg-black/90 border border-amber-500/70 text-amber-200 px-4 py-1.5 sm:px-5 sm:py-2.5 rounded-lg shadow-2xl font-medium text-[11px] sm:text-xs backdrop-blur-md animate-in fade-in">
          {notice}
        </div>
      )}

      {/* Interior Sub-Grid Rendering */}
      <div className="flex-1 min-h-0 flex items-center justify-center relative overflow-auto p-1.5 sm:p-3 bg-gradient-to-b from-[#090d16] to-[#04060a]">
        <div
          className="grid gap-1 bg-[#101522] p-2.5 rounded-2xl border border-[#2b354d] shadow-2xl"
          style={{
            gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            width: 'min(50vh, 94%)',
            height: 'min(50vh, 94%)'
          }}
        >
          {Array.from({ length: height }).map((_, y) =>
            Array.from({ length: width }).map((_, x) => {
              const tileVal = propertyData.layout[y * width + x] ?? 0;
              const isPlayerHere = playerPos.x === x && playerPos.y === y;
              const meta = metadata[tileVal] || { name: 'Lantai', isSolid: false, interactable: false };

              let tileClass = 'bg-[#161e2e] border-gray-800/80 hover:bg-[#202b40]';
              let label = '';

              if (tileVal === 1) {
                // Wall
                tileClass = 'bg-[#0d1017] border-amber-950/70 opacity-90';
              } else if (tileVal === 2) {
                tileClass = 'bg-amber-950/60 border-amber-600/50 cursor-pointer shadow-md';
                label = 'Meja Teh';
              } else if (tileVal === 3) {
                tileClass = 'bg-cyan-950/80 border-cyan-500/80 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.4)]';
                label = `Semadi Qi`;
              } else if (tileVal === 4) {
                tileClass = 'bg-red-950/80 border-red-500/80 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.4)]';
                label = `Kuali Alkimia`;
              } else if (tileVal === 5) {
                tileClass = 'bg-slate-900 border-slate-500/80 cursor-pointer shadow-[0_0_12px_rgba(148,163,184,0.3)]';
                label = `Tempa Besi`;
              } else if (tileVal === 6) {
                tileClass = 'bg-emerald-950/80 border-emerald-600/60 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]';
                label = 'Petak Herba';
              } else if (tileVal === 7) {
                tileClass = 'bg-amber-900/60 border-amber-500/80 cursor-pointer';
                label = 'Pintu';
              } else if (tileVal === 8) {
                tileClass = 'bg-blue-950/80 border-blue-500/80 cursor-pointer shadow-[0_0_12px_rgba(59,130,246,0.4)]';
                label = 'Kolam Ikan';
              } else if (tileVal === 9) {
                tileClass = 'bg-orange-950/80 border-orange-500/80 cursor-pointer shadow-[0_0_12px_rgba(249,115,22,0.4)]';
                label = 'Dapur Masak';
              }

              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleTileClick(x, y)}
                  className={`relative rounded-lg border flex flex-col items-center justify-center transition-all p-0.5 text-center overflow-hidden
                    ${tileClass} ${isPlayerHere ? 'ring-2 ring-blue-400 z-20' : ''}`}
                >
                  {renderTileContent(tileVal)}
                  {label && (
                    <span className="text-[7px] font-bold text-gray-200 mt-0.5 leading-none truncate max-w-full">
                      {label}
                    </span>
                  )}
                  {isPlayerHere && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.9)] flex items-center justify-center animate-pulse">
                        <span className="text-[8px] text-white font-bold">P1</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom HUD: Facility Tiers & Controls */}
      <div className="flex-shrink-0 bg-[#101520]/95 border-t border-amber-950/80 px-3 py-1.5 sm:px-4 sm:py-2 z-20 flex justify-between items-center backdrop-blur-md overflow-x-auto text-[10px] sm:text-xs">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" /> Formasi Qi: <strong className="text-cyan-300 font-mono">T{facilities.qiGatheringArrayTier}</strong>
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 flex items-center gap-1">
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" /> Kuali: <strong className="text-amber-300 font-mono">T{facilities.alchemyCrucibleTier}</strong>
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 flex items-center gap-1">
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" /> Tempa: <strong className="text-gray-200 font-mono">T{facilities.forgeAnvilTier}</strong>
          </span>
        </div>

        {propertyData.isOwner && (
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-2">
            <button
              disabled={isUpgrading || facilities.qiGatheringArrayTier >= 5}
              onClick={() => handleUpgradeFacility('qi_array')}
              className="text-[9px] sm:text-[10px] bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-colors"
            >
              Upgrade Qi
            </button>
            <button
              disabled={isUpgrading || facilities.alchemyCrucibleTier >= 5}
              onClick={() => handleUpgradeFacility('crucible')}
              className="text-[9px] sm:text-[10px] bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition-colors"
            >
              Upgrade Kuali
            </button>
          </div>
        )}
      </div>

      {/* Minigame Modal Overlays */}
      {activeMinigame === 'acupoint' && (
        <AcupointPulseMinigame
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            setNotice(`Latihan Qi selesai: ${res.message}`);
            setTimeout(() => setNotice(null), 4000);
          }}
        />
      )}
      {activeMinigame === 'crucible' && (
        <CrucibleEquilibriumMinigame
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            setNotice(res.message);
            setTimeout(() => setNotice(null), 4000);
          }}
        />
      )}
      {activeMinigame === 'kata' && (
        <KataQteMinigame
          discipline="sword"
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            setNotice(res.message);
            setTimeout(() => setNotice(null), 4000);
          }}
        />
      )}
      {activeMinigame === 'fishing' && (
        <FishingReelMinigame
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            setNotice(`🎣 Berhasil menangkap 1x ${res.fishName || 'Ikan Spiritual'}!`);
            setTimeout(() => setNotice(null), 4000);
          }}
        />
      )}
      {activeMinigame === 'cooking' && (
        <CookingFlameMinigame
          dishName="Sup Ikan Mas"
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            setNotice(res.message);
            setTimeout(() => setNotice(null), 4000);
          }}
        />
      )}
      {activeMinigame === 'harvest' && (
        <HerbHarvestMinigame
          cropName="Herba Rohani"
          onClose={() => setActiveMinigame(null)}
          onCompleted={(res) => {
            setActiveMinigame(null);
            setNotice(res.message);
            setTimeout(() => setNotice(null), 4000);
          }}
        />
      )}
    </div>
  );
}
