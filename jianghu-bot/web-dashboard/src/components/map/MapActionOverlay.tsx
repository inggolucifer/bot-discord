'use client';
import React from 'react';
import { TileData } from './TaleOfImmortalCanvas';

interface MapActionOverlayProps {
  tile: TileData;
  x: number;
  y: number;
  onWalk: () => void;
  onInspect: () => void;
  onHarvest: () => void;
  onClose: () => void;
}

export default function MapActionOverlay({
  tile,
  x,
  y,
  onWalk,
  onInspect,
  onHarvest,
  onClose
}: MapActionOverlayProps) {
  return (
    <div
      className="absolute z-50 flex flex-col items-center transform -translate-x-1/2 -translate-y-full pb-4 pointer-events-auto"
      style={{ left: x, top: y }}
    >
      {/* Tooltip Arrow */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#292218]" />

      <div className="bg-[#292218] border border-[#524530] shadow-2xl rounded-md flex flex-col min-w-[120px] overflow-hidden">
        {/* Header */}
        <div className="bg-[#1c160f] px-3 py-1.5 flex justify-between items-center border-b border-[#524530]">
          <span className="text-[#d8c3a5] text-xs font-serif font-bold">
            {tile.label || tile.terrainType}
          </span>
          <button
            onClick={onClose}
            className="text-[#8c7a5f] hover:text-[#d8c3a5] ml-2 text-xs font-bold w-5 h-5 flex items-center justify-center rounded hover:bg-[#3d3324]"
          >
            ✕
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col py-1">
          <button
            onClick={onWalk}
            className="px-4 py-1.5 text-left text-sm text-[#e8dcc7] hover:bg-[#3d3324] hover:text-[#ffebb3] transition-colors flex items-center gap-2"
          >
            <span>🚶</span> Berjalan Kemari
          </button>
          
          <button
            onClick={onInspect}
            className="px-4 py-1.5 text-left text-sm text-[#e8dcc7] hover:bg-[#3d3324] hover:text-[#ffebb3] transition-colors flex items-center gap-2"
          >
            <span>👁️</span> Periksa Area
          </button>

          {tile.resourceType && (
            <button
              onClick={onHarvest}
              className="px-4 py-1.5 text-left text-sm text-[#eab308] hover:bg-[#3d3324] hover:text-[#fde047] transition-colors flex items-center gap-2 font-semibold"
            >
              <span>{tile.resourceType === 'ore' ? '⛏' : tile.resourceType === 'herb' ? '🌿' : '🪓'}</span> Panen / Ambil
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
