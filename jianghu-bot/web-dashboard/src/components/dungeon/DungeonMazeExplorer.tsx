'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Shield,
  Heart,
  Zap,
  Package,
  DoorOpen,
  AlertTriangle,
  Skull,
  Coins,
  Gem,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { GLOBAL_ASSETS } from '@/config/globalAssets';

interface DungeonTile {
  x: number;
  y: number;
  isRevealed: boolean;
  isWall?: boolean;
  isEntrance?: boolean;
  isExit?: boolean;
  trapType?: 'spike' | 'poison' | null;
  isTrapTriggered?: boolean;
  chest?: {
    isChest: boolean;
    opened: boolean;
    lootPreview?: string | null;
  } | null;
  monster?: {
    name: string;
    hp: number;
    isBoss?: boolean;
  } | null;
}

interface DungeonData {
  id: string;
  dungeonName: string;
  rank: 'Rank_1_8x8' | 'Rank_2_20x20' | 'Rank_3_40x40';
  gridWidth: number;
  gridHeight: number;
  playerPos: { x: number; y: number };
  exitPos: { x: number; y: number };
  status: string;
  accumulatedLoot: {
    silver: number;
    spiritStones: number;
    items: Array<{ name: string; quantity: number; rank: string }>;
  };
  tiles: DungeonTile[];
}

interface DungeonMazeExplorerProps {
  rank?: 'Rank_1_8x8' | 'Rank_2_20x20' | 'Rank_3_40x40';
  dungeonKey?: string;
  onClose: () => void;
  onExitSuccess?: (loot: { silver: number; spiritStones: number }) => void;
}

export default function DungeonMazeExplorer({
  rank = 'Rank_1_8x8',
  dungeonKey = 'ancient_mortal_cave',
  onClose,
  onExitSuccess
}: DungeonMazeExplorerProps) {
  const [dungeon, setDungeon] = useState<DungeonData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [moving, setMoving] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerStamina, setPlayerStamina] = useState<number>(50);

  // Inisialisasi / Ambil data gua aktif
  const loadDungeon = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.post('/dungeon/enter', { rank, dungeonKey });
      if (res.data?.dungeon) {
        setDungeon(res.data.dungeon);
        setLogs(prev => [res.data.message || 'Memasuki labirin gua purba...', ...prev]);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Gagal memuat labirin gua.';
      setLogs(prev => [`[ERROR]: ${errMsg}`, ...prev]);
    } finally {
      setLoading(false);
    }
  }, [rank, dungeonKey]);

  useEffect(() => {
    loadDungeon();
  }, [loadDungeon]);

  // Handler Melangkah
  const handleMove = useCallback(async (dx: number, dy: number) => {
    if (moving || !dungeon) return;
    try {
      setMoving(true);
      const res = await api.post('/dungeon/move', { dx, dy });
      if (res.data?.success && res.data.dungeon) {
        setDungeon(res.data.dungeon);
        if (res.data.currentHp !== undefined) setPlayerHp(res.data.currentHp);
        if (res.data.currentStamina !== undefined) setPlayerStamina(res.data.currentStamina);
        if (res.data.eventLog) {
          setLogs(prev => [res.data.eventLog, ...prev.slice(0, 8)]);
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Langkah terhalang.';
      setLogs(prev => [errMsg, ...prev.slice(0, 8)]);
    } finally {
      setMoving(false);
    }
  }, [moving, dungeon]);

  // Dukungan tombol Keyboard (WASD & Panah)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) handleMove(0, -1);
      else if (['ArrowDown', 'KeyS'].includes(e.code)) handleMove(0, 1);
      else if (['ArrowLeft', 'KeyA'].includes(e.code)) handleMove(-1, 0);
      else if (['ArrowRight', 'KeyD'].includes(e.code)) handleMove(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  // Handler Buka Peti
  const handleOpenChest = async () => {
    try {
      const res = await api.post('/dungeon/interact', { action: 'open_chest' });
      if (res.data?.success && res.data.dungeon) {
        setDungeon(res.data.dungeon);
        setLogs(prev => [res.data.message || 'Peti berhasil dibuka!', ...prev]);
      }
    } catch (err: any) {
      setLogs(prev => [err.response?.data?.error || 'Gagal membuka peti.', ...prev]);
    }
  };

  // Handler Keluar Gua
  const handleExit = async () => {
    try {
      const res = await api.post('/dungeon/interact', { action: 'exit' });
      if (res.data?.success) {
        if (onExitSuccess && res.data.broughtLoot) {
          onExitSuccess(res.data.broughtLoot);
        }
        onClose();
      }
    } catch (err: any) {
      setLogs(prev => [err.response?.data?.error || 'Gagal keluar dari gua.', ...prev]);
    }
  };

  // Viewport Kamera Dinamis (Menampilkan area 9x9 di sekitar pemain untuk gua besar 20x20 dan 40x40)
  const VIEWPORT_RADIUS = dungeon?.gridWidth === 8 ? 4 : 4; // 9x9 tiles
  const visibleViewport = useMemo(() => {
    if (!dungeon) return [];
    const px = dungeon.playerPos.x;
    const py = dungeon.playerPos.y;
    const tileMap = new Map<string, DungeonTile>();
    for (const t of dungeon.tiles) {
      tileMap.set(`${t.x},${t.y}`, t);
    }

    const rows = [];
    const startY = dungeon.gridHeight <= 8 ? 0 : Math.max(0, Math.min(dungeon.gridHeight - 9, py - VIEWPORT_RADIUS));
    const startX = dungeon.gridWidth <= 8 ? 0 : Math.max(0, Math.min(dungeon.gridWidth - 9, px - VIEWPORT_RADIUS));
    const size = dungeon.gridWidth <= 8 ? 8 : 9;

    for (let y = startY; y < startY + size; y++) {
      const row = [];
      for (let x = startX; x < startX + size; x++) {
        const tile = tileMap.get(`${x},${y}`) || { x, y, isRevealed: false };
        row.push(tile);
      }
      rows.push(row);
    }
    return rows;
  }, [dungeon, VIEWPORT_RADIUS]);

  // Petak pemain saat ini
  const currentTile = useMemo(() => {
    if (!dungeon) return null;
    return dungeon.tiles.find(t => t.x === dungeon.playerPos.x && t.y === dungeon.playerPos.y);
  }, [dungeon]);

  const isStandingOnChest = currentTile?.chest?.isChest && !currentTile.chest.opened;
  const isStandingOnExit = currentTile?.isExit;
  const isStandingOnEntrance = currentTile?.isEntrance;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-amber-200 font-serif font-bold text-base">Memasuki lorong gua kuno...</p>
        <p className="text-gray-400 text-xs mt-1">Mengukir formasi labirin bawah tanah</p>
      </div>
    );
  }

  if (!dungeon) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-2 sm:p-4 select-none overflow-hidden">
      {/* Top Header HUD */}
      <div className="w-full max-w-4xl bg-[#121620] border border-amber-900/40 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 shadow-xl shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕳️</span>
          <div>
            <h2 className="text-amber-300 font-serif font-bold text-sm sm:text-base leading-tight">
              {dungeon.dungeonName}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="bg-amber-950/60 text-amber-400 border border-amber-800/40 px-1.5 py-0.2 rounded font-mono">
                {dungeon.gridWidth}x{dungeon.gridHeight} Petak
              </span>
              <span>Pos: ({dungeon.playerPos.x}, {dungeon.playerPos.y})</span>
            </div>
          </div>
        </div>

        {/* Status & Harta Terkumpul */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-black/40 border border-gray-800 px-2.5 py-1 rounded">
            <Coins size={14} className="text-yellow-400" />
            <span className="font-mono text-gray-200">{dungeon.accumulatedLoot.silver} Perak</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 border border-gray-800 px-2.5 py-1 rounded">
            <Gem size={14} className="text-cyan-400" />
            <span className="font-mono text-gray-200">{dungeon.accumulatedLoot.spiritStones} Batu Roh</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition-colors ml-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Grid Viewport (Tampilan Labirin & Fog of War) */}
      <div className="flex-1 w-full max-w-4xl flex items-center justify-center my-2 overflow-hidden relative">
        <div className="bg-[#0b0e14] border-2 border-amber-900/40 rounded-xl p-2 sm:p-3 shadow-[0_0_30px_rgba(0,0,0,0.8)] max-h-full flex flex-col items-center justify-center">
          <div className="grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${visibleViewport[0]?.length || 8}, minmax(0, 1fr))` }}>
            {visibleViewport.map((row, ry) =>
              row.map((tile, rx) => {
                const isPlayerHere = tile.x === dungeon.playerPos.x && tile.y === dungeon.playerPos.y;

                // Petak Tertutup Fog of War
                if (!tile.isRevealed) {
                  return (
                    <div
                      key={`${tile.x}-${tile.y}`}
                      className="w-8 h-8 sm:w-11 sm:h-11 bg-black rounded border border-gray-900/60 flex items-center justify-center"
                    >
                      <span className="text-[10px] opacity-20">🌫️</span>
                    </div>
                  );
                }

                // Dinding Tebing Batu
                if (tile.isWall) {
                  return (
                    <div
                      key={`${tile.x}-${tile.y}`}
                      className="w-8 h-8 sm:w-11 sm:h-11 bg-[#1a1c23] border border-[#2b2f3d] rounded flex items-center justify-center shadow-inner"
                      title="Dinding Gua Kokoh"
                    >
                      <span className="text-xs sm:text-sm opacity-40">🪨</span>
                    </div>
                  );
                }

                // Koridor Bebas
                return (
                  <div
                    key={`${tile.x}-${tile.y}`}
                    className={`relative w-8 h-8 sm:w-11 sm:h-11 rounded border flex items-center justify-center transition-all duration-300 ${
                      isPlayerHere
                        ? 'bg-amber-950/70 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] z-10 scale-105'
                        : 'bg-[#121620] border-gray-800/80 hover:border-gray-700'
                    }`}
                  >
                    {/* Pemain */}
                    {isPlayerHere ? (
                      <span className="text-lg sm:text-2xl animate-bounce">🥋</span>
                    ) : tile.isExit ? (
                      <span className="text-base sm:text-xl animate-pulse" title="Portal Keluar">🌀</span>
                    ) : tile.isEntrance ? (
                      <span className="text-base sm:text-xl opacity-70" title="Pintu Masuk">🚪</span>
                    ) : tile.chest?.isChest ? (
                      tile.chest.opened ? (
                        <span className="text-xs sm:text-sm opacity-30">📦</span>
                      ) : (
                        <span className="text-base sm:text-xl animate-bounce" title="Peti Harta!">🎁</span>
                      )
                    ) : tile.monster ? (
                      <span className="text-base sm:text-xl" title={tile.monster.name}>👹</span>
                    ) : tile.trapType && tile.isTrapTriggered ? (
                      <span className="text-xs opacity-60">⚠️</span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Control Deck (D-Pad Virtual, Action Buttons, & Log) */}
      <div className="w-full max-w-4xl bg-[#121620] border border-amber-900/40 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl shrink-0">
        {/* Action Buttons (Interaksi) */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isStandingOnChest && (
            <button
              onClick={handleOpenChest}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-serif font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-1.5"
            >
              <Package size={16} /> Buka Peti Harta
            </button>
          )}

          {(isStandingOnExit || isStandingOnEntrance) && (
            <button
              onClick={handleExit}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-serif font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-1.5"
            >
              <DoorOpen size={16} />
              {isStandingOnExit ? 'Keluar Bawa Harta' : 'Kabur dari Gua'}
            </button>
          )}

          <div className="hidden sm:block text-[11px] text-gray-400 font-mono bg-black/40 px-2 py-1 rounded">
            Gunakan tombol WASD / Arah Panah untuk melangkah
          </div>
        </div>

        {/* Virtual D-Pad untuk Mobile / Touch */}
        <div className="grid grid-cols-3 gap-1 w-32 h-24 shrink-0">
          <div />
          <button
            onClick={() => handleMove(0, -1)}
            disabled={moving}
            className="bg-gray-800 hover:bg-gray-700 active:bg-amber-700 rounded flex items-center justify-center text-gray-200 shadow"
          >
            <ArrowUp size={16} />
          </button>
          <div />
          <button
            onClick={() => handleMove(-1, 0)}
            disabled={moving}
            className="bg-gray-800 hover:bg-gray-700 active:bg-amber-700 rounded flex items-center justify-center text-gray-200 shadow"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center justify-center text-[10px] text-gray-500 font-mono">D-PAD</div>
          <button
            onClick={() => handleMove(1, 0)}
            disabled={moving}
            className="bg-gray-800 hover:bg-gray-700 active:bg-amber-700 rounded flex items-center justify-center text-gray-200 shadow"
          >
            <ArrowRight size={16} />
          </button>
          <div />
          <button
            onClick={() => handleMove(0, 1)}
            disabled={moving}
            className="bg-gray-800 hover:bg-gray-700 active:bg-amber-700 rounded flex items-center justify-center text-gray-200 shadow"
          >
            <ArrowDown size={16} />
          </button>
          <div />
        </div>
      </div>

      {/* Mini Event Ticker */}
      <div className="w-full max-w-4xl mt-1 text-[11px] text-amber-200/90 font-serif truncate text-center">
        {logs[0] || 'Menjelajahi lorong labirin batu...'}
      </div>
    </div>
  );
}
