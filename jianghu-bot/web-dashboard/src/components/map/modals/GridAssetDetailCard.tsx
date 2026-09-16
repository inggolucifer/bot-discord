'use client';
import React, { useState, useEffect } from 'react';
import { Shield, Clock, Hammer, DoorOpen, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { TileData } from '../TaleOfImmortalCanvas';
import { GLOBAL_ASSETS } from '@/config/globalAssets';

interface GridAssetDetailCardProps {
  tile: TileData;
  playerPos: { x: number; y: number };
  onEnter: (tile: TileData) => void;
  onClose: () => void;
}

export default function GridAssetDetailCard({
  tile,
  playerPos,
  onEnter,
  onClose
}: GridAssetDetailCardProps) {
  const dist = Math.max(Math.abs(playerPos.x - tile.tileX), Math.abs(playerPos.y - tile.tileY));
  const isAdjacentOrOnTile = dist <= 1;

  // Countdown timer jika sedang dalam pembangunan
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(50);

  useEffect(() => {
    if (!tile.isUnderConstruction || !tile.constructionCompleteAt) return;

    const interval = setInterval(() => {
      const diff = new Date(tile.constructionCompleteAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Selesai!');
        setProgressPercent(100);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        setProgressPercent(Math.max(10, Math.min(95, 100 - Math.floor((diff / (3600 * 1000)) * 50))));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tile.isUnderConstruction, tile.constructionCompleteAt]);

  const assetName = tile.buildingName || tile.label || 'Kediaman Kultivator';
  const ownerName = tile.ownerName || (tile.ownerId ? `Pendekar (${tile.ownerId.slice(0, 6)}...)` : 'Tidak Diketahui');
  const hp = tile.assetHp ?? 1000;
  const maxHp = tile.assetMaxHp ?? 1000;
  const hpPercent = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));

  const assetImage = (GLOBAL_ASSETS.assets as any)?.[assetName] || null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#181f2b] to-[#0c1017] border border-amber-600/70 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        {/* Tombol Tutup */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Aset */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-lg bg-[#0e131d] border border-amber-500/50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
            {tile.isUnderConstruction ? (
              <div className="flex flex-col items-center justify-center text-amber-400 animate-pulse">
                <Hammer className="w-8 h-8" />
                <span className="text-[9px] font-bold mt-0.5">Konstruksi</span>
              </div>
            ) : assetImage ? (
              <img src={assetImage} alt={assetName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">🏛️</span>
            )}
          </div>

          <div className="flex-1 pr-6">
            <h3 className="text-base font-serif font-bold text-amber-200 leading-tight">
              {assetName}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Pemilik: <span className="text-amber-300 font-semibold">{ownerName}</span>
            </p>
            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
              Koordinat: ({tile.tileX}, {tile.tileY}) {dist > 0 ? `• Jarak: ${dist} tile` : '• Kamu di sini'}
            </div>
          </div>
        </div>

        {/* Status Kontruksi vs Beroperasi */}
        {tile.isUnderConstruction ? (
          <div className="bg-[#121824] border border-amber-700/50 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" /> Sedang Dibangun
              </span>
              <span className="text-amber-400 font-mono font-bold">{timeLeft || 'Menghitung...'}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-black/60 rounded-full h-2 border border-gray-700 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-600 to-yellow-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 italic">
              Pekerja dan pengrajin sedang menyelesaikan struktur bangunan ini.
            </p>
          </div>
        ) : (
          <div className="bg-[#0f141f] border border-[#263347] rounded-lg p-4 mb-4 space-y-3">
            {/* Bar HP / Durabilitas */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-gray-300 font-medium flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-blue-400" /> Kondisi Fisik / HP Aset
                </span>
                <span className={`font-mono font-bold ${hpPercent > 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {hp} / {maxHp} ({hpPercent}%)
                </span>
              </div>
              <div className="w-full bg-black/60 rounded-full h-2 border border-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-800">
              <span className="text-gray-400">Status Operasi:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Beroperasi Normal
              </span>
            </div>
          </div>
        )}

        {/* Notice Jarak Pemain */}
        {!isAdjacentOrOnTile && (
          <div className="mb-4 bg-amber-950/40 border border-amber-800/60 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              Kamu berada sejauh <strong>{dist} petak</strong>. Berjalanlah dan berdirilah di samping atau tepat di atas bangunan ini untuk memasukinya.
            </span>
          </div>
        )}

        {/* Tombol Aksi Masuk */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>

          <button
            onClick={() => onEnter(tile)}
            disabled={!isAdjacentOrOnTile || tile.isUnderConstruction}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white text-xs font-serif font-bold shadow-lg border border-amber-400/50 flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <DoorOpen className="w-4 h-4 text-amber-200" />
            <span>Masuk ke Dalam</span>
          </button>
        </div>
      </div>
    </div>
  );
}
