'use client';
import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Compass,
  Hammer,
  Shield,
  Clock,
  DoorOpen,
  Coins,
  Fish,
  Trees,
  Wheat,
  Building2,
  ShieldAlert,
  Search,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { TileData } from './TaleOfImmortalCanvas';
import { GLOBAL_ASSETS } from '@/config/globalAssets';
import { getLandPriceForPlayer, LandPriceInfo } from '@/lib/landPrice';

interface GridTileInspectorCardProps {
  tile: TileData;
  playerPos: { x: number; y: number };
  currentUserId?: string;
  pathSteps?: number;
  isWalking?: boolean;
  onWalkToTile: (tile: TileData) => void;
  onPurchaseLand?: (tile: TileData) => void;
  onOpenBuildModal?: (tile: TileData) => void;
  onEnterBuilding?: (tile: TileData) => void;
  onEnterSettlement?: (cityName: string) => void;
  onEnterSect?: (sectTile: TileData) => void;
  onEnterExpedition?: (tile: TileData) => void;
  onFish?: () => void;
  onForage?: () => void;
  onPlantCrop?: (tile: TileData) => void;
  onHarvestCrop?: (tile: TileData) => void;
  onSearchArea?: () => void;
  playerLandStats?: {
    ownedPlotsCount: number;
    nextPrice?: LandPriceInfo;
  };
  onClose: () => void;
}

export default function GridTileInspectorCard({
  tile,
  playerPos,
  currentUserId,
  pathSteps = 0,
  isWalking = false,
  onWalkToTile,
  onPurchaseLand,
  onOpenBuildModal,
  onEnterBuilding,
  onEnterSettlement,
  onEnterSect,
  onEnterExpedition,
  onFish,
  onForage,
  onPlantCrop,
  onHarvestCrop,
  onSearchArea,
  playerLandStats,
  onClose
}: GridTileInspectorCardProps) {
  const dist = Math.max(Math.abs(playerPos.x - tile.tileX), Math.abs(playerPos.y - tile.tileY));
  const isAdjacentOrOn = dist <= 1;
  const isDirectlyOn = dist === 0;

  const currentLandPrice = playerLandStats?.nextPrice || getLandPriceForPlayer(playerLandStats?.ownedPlotsCount || 0);

  // Real-time countdown timer jika sedang dibangun
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(45);

  useEffect(() => {
    if (!tile.isUnderConstruction || !tile.constructionCompleteAt) return;

    const updateTimer = () => {
      const diff = new Date(tile.constructionCompleteAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Selesai Dibangun!');
        setProgressPercent(100);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        setProgressPercent(Math.max(10, Math.min(95, 100 - Math.floor((diff / (3600 * 1000)) * 50))));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [tile.isUnderConstruction, tile.constructionCompleteAt]);

  const isOwner = currentUserId && tile.ownerId && (tile.ownerId === currentUserId);
  const assetName = tile.buildingName || tile.label;
  const assetImage = assetName ? (GLOBAL_ASSETS.assets as any)?.[assetName] : null;

  const hp = tile.assetHp ?? 1000;
  const maxHp = tile.assetMaxHp ?? 1000;
  const hpPercent = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));

  // Title resolusi
  let displayTitle = tile.label || tile.settlementName || 'Petak Terbuka';
  if (tile.buildingName) {
    displayTitle = tile.buildingName;
  } else if (tile.isClaimable && !tile.ownerId) {
    displayTitle = 'Kavling Tanah Siap Bangun';
  } else if (tile.isClaimable && tile.ownerId) {
    displayTitle = isOwner ? 'Tanah Milikmu' : `Lahan Milik ${tile.ownerName || 'Pendekar'}`;
  } else if (tile.terrainType === 'river' || tile.terrainType === 'water') {
    displayTitle = 'Aliran Air / Spot Mancing';
  }

  return (
    <div className="absolute top-16 right-4 z-40 w-80 sm:w-88 max-w-[calc(100vw-2rem)] bg-[#0d121c]/95 border border-amber-600/70 rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md overflow-hidden text-xs text-gray-200 select-none animate-in fade-in slide-in-from-right-3 duration-200 flex flex-col max-h-[85vh]">
      {/* Header Card Wuxia */}
      <div className="bg-gradient-to-r from-[#1c160e] via-[#2a2015] to-[#17120a] border-b border-amber-800/60 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <div>
            <h3 className="text-amber-200 font-serif font-bold text-sm leading-tight flex items-center gap-1.5">
              {displayTitle}
            </h3>
            <div className="text-[10px] text-amber-400/80 font-mono">
              Koordinat ({tile.tileX}, {tile.tileY}) • {tile.regionName || 'Central Plains'}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-amber-400/70 hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-1 transition-colors"
          title="Tutup Card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-3 overflow-y-auto scrollbar-thin">
        {/* Status Badge & Jarak */}
        <div className="flex items-center justify-between text-[11px] bg-black/50 px-2.5 py-1.5 rounded-lg border border-gray-800/80">
          <span className="flex items-center gap-1 font-mono text-gray-400">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            {isDirectlyOn ? (
              <strong className="text-emerald-400 font-semibold">📍 Berdiri di sini</strong>
            ) : (
              <>Jarak: <strong className="text-gray-200">{dist} petak</strong> {pathSteps > 0 && `(~${pathSteps} langkah)`}</>
            )}
          </span>

          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            tile.territoryType === 'danger_zone'
              ? 'bg-red-950/80 text-red-300 border-red-700/60'
              : tile.territoryType === 'sect_territory'
              ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
              : tile.territoryType === 'settlement'
              ? 'bg-blue-950/80 text-blue-300 border-blue-700/60'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
          }`}>
            {tile.territoryType === 'danger_zone' ? 'Zona Bahaya' :
             tile.territoryType === 'sect_territory' ? 'Wilayah Sekte' :
             tile.territoryType === 'settlement' ? 'Pemukiman' : 'Wilayah Aman'}
          </span>
        </div>

        {/* 1. SEKSI ASET / BANGUNAN (JIKA ADA) */}
        {(tile.buildingName || tile.isUnderConstruction || tile.propertyStructureId) && (
          <div className="bg-[#121926] border border-amber-700/50 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#0b0e14] border border-amber-500/40 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                {tile.isUnderConstruction ? (
                  <Hammer className="w-6 h-6 text-amber-400 animate-bounce" />
                ) : assetImage ? (
                  <img src={assetImage} alt={assetName || 'Aset'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🏛️</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-serif font-bold text-amber-200 text-xs truncate">
                  {tile.buildingName || 'Bangunan Jianghu'}
                </div>
                <div className="text-[10px] text-gray-400">
                  Pemilik: <span className="text-amber-300 font-semibold">{tile.ownerName || (isOwner ? 'Kamu' : 'Pendekar')}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Tipe: {tile.buildingType || 'Fasilitas Properti'}
                </div>
              </div>
            </div>

            {/* Countdown Jika Sedang Dibangun */}
            {tile.isUnderConstruction ? (
              <div className="bg-black/60 p-2 rounded border border-amber-600/40 space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400 animate-spin" /> Pengerjaan Konstruksi
                  </span>
                  <span className="text-amber-400 font-mono font-bold">{timeLeft || 'Menghitung...'}</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-400" /> Durabilitas HP Aset
                  </span>
                  <span className={`font-mono font-bold ${hpPercent > 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {hp} / {maxHp} ({hpPercent}%)
                  </span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                    }`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. SEKSI KAVLING TANAH KOSONG (JIKA BELUM ADA BANGUNAN) */}
        {tile.isClaimable && !tile.buildingName && !tile.isUnderConstruction && (
          <div className="bg-[#111822] border border-emerald-700/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏷️</span>
              <div>
                <div className="font-semibold text-emerald-300 text-xs">
                  {tile.ownerId ? (isOwner ? 'Tanah Pribadi Milikmu' : `Kavling Milik ${tile.ownerName}`) : 'Kavling Tanah Siap Bangun'}
                </div>
                <div className="text-[10px] text-gray-400">
                  {tile.ownerId
                    ? 'Tanah sudah bersertifikat sah dan siap didirikan fasilitas profesi.'
                    : 'Kavling terbuka belum bertuan. Beli kavling ini untuk membangun properti.'}
                </div>
              </div>
            </div>

            {!tile.ownerId && (
              <div className="flex items-center justify-between text-[11px] bg-black/40 px-2.5 py-1.5 rounded border border-amber-900/40">
                <span className="text-gray-400">Tarif Kavling ke-{currentLandPrice.plotNumber}:</span>
                <span className="font-bold text-amber-300 font-mono flex items-center gap-1.5">
                  <span>{currentLandPrice.currency === 'gold' ? '🪙' : '🟢'}</span>
                  {currentLandPrice.label}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. SEKSI SUMBER DAYA ALAM (AIR / IKAN / HERBA / KAYU) */}
        {(tile.resourceType || tile.terrainType === 'river' || tile.terrainType === 'water') && (
          <div className="bg-[#0f1724] border border-cyan-800/40 rounded-lg p-2.5 flex items-center gap-2.5">
            <span className="text-2xl">
              {tile.resourceType === 'fish' || tile.terrainType === 'river' || tile.terrainType === 'water' ? '🐟' :
               tile.resourceType === 'herb' ? '🌿' :
               tile.resourceType === 'ore' ? '⛏️' : '🌲'}
            </span>
            <div>
              <div className="font-semibold text-cyan-200 text-xs">
                {tile.resourceType === 'fish' || tile.terrainType === 'river' || tile.terrainType === 'water' ? 'Sumber Ikan Spiritual' :
                 tile.resourceType === 'herb' ? 'Rumpun Herba Langka' :
                 tile.resourceType === 'ore' ? 'Urat Bijih Besi' : 'Pohon Kayu Rohani'}
              </div>
              <div className="text-[10px] text-gray-400">
                Dapat dipanen secara langsung untuk bahan peracikan, ransum, atau penempaan.
              </div>
            </div>
          </div>
        )}

        {/* 4. SEKSI TANAMAN FARMING (JIKA ADA) */}
        {tile.cropType && (
          <div className="bg-[#141b14] border border-lime-800/50 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wheat className="w-4 h-4 text-lime-400" />
              <div>
                <div className="font-semibold text-lime-200 text-xs">Tanaman: {tile.cropType}</div>
                <div className="text-[10px] text-gray-400">Tanaman tumbuh subur dan siap dipanen.</div>
              </div>
            </div>
            {onHarvestCrop && isAdjacentOrOn && (
              <button
                onClick={() => onHarvestCrop(tile)}
                className="px-2.5 py-1 bg-lime-900/80 hover:bg-lime-800 text-lime-100 rounded text-[10px] font-bold border border-lime-600/50"
              >
                Panen
              </button>
            )}
          </div>
        )}

        {/* 5. NOTICE JARAK JIKA HARUS MENDEKAT */}
        {!isAdjacentOrOn && (
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-2 flex items-start gap-1.5 text-[10px] text-amber-300/90">
            <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              Karaktermu berada sejauh <strong>{dist} petak</strong>. Klik tombol <strong>"Melangkah Kemari"</strong> untuk berjalan mendekat sebelum berinteraksi.
            </span>
          </div>
        )}

        {/* 6. DAFTAR TOMBOL AKSI LENGKAP & DINAMIS */}
        <div className="pt-1 flex flex-col gap-1.5">
          {/* Aksi Navigasi Jalan */}
          {!isDirectlyOn && (
            <button
              onClick={() => onWalkToTile(tile)}
              disabled={isWalking}
              className="w-full py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-serif font-bold rounded-lg shadow-md border border-amber-400/50 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isWalking ? 'Sedang Melangkah...' : `Melangkah Kemari (~${pathSteps} langkah)`}</span>
            </button>
          )}

          {/* Tombol Beli Kavling Tanah */}
          {tile.isClaimable && !tile.ownerId && onPurchaseLand && (
            <button
              onClick={() => onPurchaseLand(tile)}
              className="w-full py-2 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-serif font-bold rounded-lg shadow-md border border-emerald-500/60 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <span>Beli Kavling Tanah ({currentLandPrice.label})</span>
            </button>
          )}

          {/* Tombol Bangun Aset / Profesi di Tanah Milik */}
          {tile.isClaimable && isOwner && (!tile.buildingName && !tile.isUnderConstruction) && onOpenBuildModal && (
            <button
              onClick={() => onOpenBuildModal(tile)}
              className="w-full py-2 bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-white font-serif font-bold rounded-lg shadow-md border border-amber-400/70 flex items-center justify-center gap-2 transition-all active:scale-98 animate-pulse"
            >
              <Hammer className="w-3.5 h-3.5 text-amber-300" />
              <span>Bangun Aset / Fasilitas Profesi</span>
            </button>
          )}

          {/* Tombol Masuk Bangunan Interior / Workbench Profesi */}
          {(tile.buildingName || tile.isDoor || tile.propertyStructureId) && onEnterBuilding && (
            <button
              onClick={() => onEnterBuilding(tile)}
              disabled={!isAdjacentOrOn || tile.isUnderConstruction}
              className="w-full py-2 bg-gradient-to-r from-teal-800 to-teal-700 hover:from-teal-700 hover:to-teal-600 text-white font-serif font-bold rounded-lg shadow-md border border-teal-500/60 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <DoorOpen className="w-3.5 h-3.5 text-teal-300" />
              <span>
                {tile.isUnderConstruction
                  ? 'Sedang Dibangun (Belum Bisa Masuk)'
                  : isAdjacentOrOn
                  ? `Masuk ke ${tile.buildingName || 'Bangunan'}`
                  : `Mendekat untuk Masuk ${tile.buildingName || 'Bangunan'}`}
              </span>
            </button>
          )}

          {/* Tombol Masuk Kota (Settlement) */}
          {tile.settlementName && onEnterSettlement && (
            <button
              onClick={() => onEnterSettlement(tile.settlementName!)}
              disabled={!isAdjacentOrOn}
              className="w-full py-2 bg-blue-900/90 hover:bg-blue-800 text-blue-100 font-serif font-bold rounded-lg shadow-md border border-blue-500/60 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              <span>Masuk {tile.settlementName}</span>
            </button>
          )}

          {/* Tombol Masuk Balai Sekte */}
          {(tile.territoryType === 'sect_territory' || tile.label?.includes('Sekte') || tile.label?.includes('Dojo')) && onEnterSect && (
            <button
              onClick={() => onEnterSect(tile)}
              disabled={!isAdjacentOrOn}
              className="w-full py-2 bg-purple-900/90 hover:bg-purple-800 text-purple-100 font-serif font-bold rounded-lg shadow-md border border-purple-500/60 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-300" />
              <span>Masuk Balai Sekte</span>
            </button>
          )}

          {/* Tombol Masuk Ekspedisi Dungeon */}
          {(tile.isExpeditionNode || tile.label?.toLowerCase().includes('gua') || tile.label?.toLowerCase().includes('makam') || tile.label?.toLowerCase().includes('ekspedisi')) && onEnterExpedition && (
            <button
              onClick={() => onEnterExpedition(tile)}
              disabled={!isAdjacentOrOn}
              className="w-full py-2 bg-indigo-900/90 hover:bg-indigo-800 text-indigo-100 font-serif font-bold rounded-lg shadow-md border border-indigo-500/60 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-300" />
              <span>Eksplorasi Ekspedisi</span>
            </button>
          )}

          {/* Tombol Mancing */}
          {(tile.resourceType === 'fish' || tile.terrainType === 'water' || tile.terrainType === 'river') && onFish && (
            <button
              onClick={onFish}
              disabled={!isAdjacentOrOn}
              className="w-full py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 font-bold rounded-lg shadow-md border border-cyan-600/60 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Fish className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mulai Memancing</span>
            </button>
          )}

          {/* Tombol Forage / Panen Sumber Daya */}
          {tile.resourceType && tile.resourceType !== 'fish' && onForage && (
            <button
              onClick={onForage}
              disabled={!isAdjacentOrOn}
              className="w-full py-2 bg-teal-950 hover:bg-teal-900 text-teal-200 font-bold rounded-lg shadow-md border border-teal-600/60 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trees className="w-3.5 h-3.5 text-teal-400" />
              <span>Panen Sumber Daya Alam</span>
            </button>
          )}

          {/* Tombol Tanam Gandum */}
          {tile.isClaimable && isOwner && !tile.cropType && onPlantCrop && (
            <button
              onClick={() => onPlantCrop(tile)}
              disabled={!isAdjacentOrOn}
              className="w-full py-2 bg-lime-950 hover:bg-lime-900 text-lime-200 font-bold rounded-lg shadow-md border border-lime-600/60 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Wheat className="w-3.5 h-3.5 text-lime-400" />
              <span>Tanam Gandum Emas</span>
            </button>
          )}

          {/* Tombol Telusuri Sekitar */}
          {onSearchArea && (
            <button
              onClick={onSearchArea}
              className="w-full py-1.5 bg-[#17202c] hover:bg-[#222e40] text-gray-300 font-semibold rounded-lg border border-gray-700/80 flex items-center justify-center gap-1.5 transition-all text-[11px]"
            >
              <Search className="w-3 h-3 text-blue-400" />
              <span>Telusuri Sekitar Petak Ini</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
