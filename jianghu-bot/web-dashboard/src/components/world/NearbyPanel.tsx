'use client';

/**
 * JIANGHU BOT & IMMORTAL-X — NEARBY PANEL (components/world/NearbyPanel.tsx)
 * V21 F3: Panel teks daftar entitas 'Sekitar Anda' (Anti-Lag Multi-Pemain)
 * - Gaya estetika Dark Ink Wuxia & Amber Gold (#c5a880)
 * - Menampilkan bangunan, kultivator lain, dan POI dalam radius <= 2 chunk
 * - Arah 8 mata angin dan jarak kualitatif (dekat, sedang, jauh)
 * - Menerima delta batching Socket.io (nearby_delta) tanpa re-render berat
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { socket } from '@/lib/socket';
import api from '@/lib/api';

export interface NearbyEntityItem {
  id: string;
  type: 'player' | 'building' | 'monster' | 'npc' | 'poi' | 'hazard' | string;
  name: string;
  x: number;
  y: number;
  chunkX: number;
  chunkY: number;
  dist: number;
  dir: string;
  distanceLabel: 'dekat' | 'sedang' | 'jauh' | string;
  status?: string;
  ownerId?: string | null;
  sectId?: string | null;
  visibility?: string;
}

interface NearbyResponse {
  center: { chunkX: number; chunkY: number; tileX: number; tileY: number };
  radiusChunks: number;
  totalCount: number;
  countOthers: number;
  items: NearbyEntityItem[];
}

interface NearbyPanelProps {
  playerX: number;
  playerY: number;
  isOpen: boolean;
  onToggle: () => void;
  onNavigateToTile?: (x: number, y: number) => void;
  onAction?: (action: 'enter' | 'visit' | 'greet', entity: NearbyEntityItem) => void;
}

export const NearbyPanel: React.FC<NearbyPanelProps> = ({
  playerX,
  playerY,
  isOpen,
  onToggle,
  onNavigateToTile,
  onAction
}) => {
  const [entities, setEntities] = useState<NearbyEntityItem[]>([]);
  const [countOthers, setCountOthers] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'player' | 'building' | 'hazard'>('all');
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(0);
  const [greetedIds, setGreetedIds] = useState<Set<string>>(new Set());

  const currentCx = useMemo(() => Math.floor(playerX / 32), [playerX]);
  const currentCy = useMemo(() => Math.floor(playerY / 32), [playerY]);

  // Fetch data dari endpoint REST /api/world/nearby
  const fetchNearby = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchedAt < 1500) return; // Client throttle

    try {
      setLoading(true);
      const res = await api.get<NearbyResponse>(
        `/world/nearby?cx=${currentCx}&cy=${currentCy}&tileX=${playerX}&tileY=${playerY}&r=1`
      );
      if (res.data && Array.isArray(res.data.items)) {
        setEntities(res.data.items);
        setCountOthers(res.data.countOthers || 0);
        setLastFetchedAt(now);
      }
    } catch (err) {
      console.warn('[NEARBY-FETCH-ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, [currentCx, currentCy, playerX, playerY, lastFetchedAt]);

  // Fetch saat koordinat chunk berpindah atau panel dibuka
  useEffect(() => {
    if (isOpen) {
      fetchNearby();
    }
  }, [isOpen, currentCx, currentCy, fetchNearby]);

  // Listen ke event Socket.io 'nearby_delta'
  useEffect(() => {
    if (!isOpen) return;

    const handleDelta = (delta: {
      chunk: string;
      entered?: Array<{ id: string; name: string; type: string; x: number; y: number; status?: string }>;
      moved?: Array<{ id: string; x: number; y: number; status?: string }>;
      left?: string[];
    }) => {
      setEntities((prev) => {
        const map = new Map(prev.map((e) => [e.id, { ...e }]));

        // Proses Left
        if (Array.isArray(delta.left)) {
          for (const leftId of delta.left) {
            map.delete(leftId);
            map.delete(`player_${leftId}`);
          }
        }

        // Proses Entered
        if (Array.isArray(delta.entered)) {
          for (const ent of delta.entered) {
            const dx = ent.x - playerX;
            const dy = ent.y - playerY;
            const dist = Math.max(Math.abs(dx), Math.abs(dy));
            map.set(ent.id, {
              id: ent.id,
              name: ent.name,
              type: ent.type,
              x: ent.x,
              y: ent.y,
              chunkX: Math.floor(ent.x / 32),
              chunkY: Math.floor(ent.y / 32),
              dist,
              dir: 'Dekat',
              distanceLabel: dist <= 5 ? 'dekat' : dist <= 15 ? 'sedang' : 'jauh',
              status: ent.status
            });
          }
        }

        // Proses Moved
        if (Array.isArray(delta.moved)) {
          for (const m of delta.moved) {
            const existing = map.get(m.id) || map.get(`player_${m.id}`);
            if (existing) {
              const dx = m.x - playerX;
              const dy = m.y - playerY;
              const dist = Math.max(Math.abs(dx), Math.abs(dy));
              existing.x = m.x;
              existing.y = m.y;
              existing.dist = dist;
              existing.distanceLabel = dist <= 5 ? 'dekat' : dist <= 15 ? 'sedang' : 'jauh';
              if (m.status) existing.status = m.status;
            }
          }
        }

        const updated = Array.from(map.values()).sort((a, b) => a.dist - b.dist);
        return updated.slice(0, 30);
      });
    };

    socket.on('nearby_delta', handleDelta);
    return () => {
      socket.off('nearby_delta', handleDelta);
    };
  }, [isOpen, playerX, playerY]);

  const filteredEntities = useMemo(() => {
    if (filter === 'all') return entities;
    return entities.filter((e) => e.type === filter);
  }, [entities, filter]);

  const handleGreet = (item: NearbyEntityItem) => {
    setGreetedIds((prev) => new Set(prev).add(item.id));
    if (onAction) {
      onAction('greet', item);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'player':
        return '🧘';
      case 'building':
        return '🏛️';
      case 'monster':
        return '👹';
      case 'hazard':
        return '⚠️';
      case 'npc':
        return '👤';
      default:
        return '📍';
    }
  };

  const getDistanceBadgeColor = (label: string) => {
    switch (label) {
      case 'dekat':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
      case 'sedang':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      default:
        return 'bg-stone-900/80 text-stone-400 border-stone-700/60';
    }
  };

  return (
    <aside
      aria-label="Panel Sekitar Anda"
      className={`absolute bottom-4 right-4 z-40 transition-all duration-300 ease-out font-serif ${
        isOpen
          ? 'w-80 sm:w-96 max-h-[75vh] opacity-100 translate-y-0 pointer-events-auto'
          : 'w-80 sm:w-96 max-h-0 opacity-0 translate-y-4 pointer-events-none overflow-hidden'
      }`}
    >
      <div className="bg-[#0b0e14]/95 border border-[#3d2b1f] rounded-lg shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#17110d] via-[#1f1712] to-[#17110d] border-b border-[#3d2b1f] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-amber-500 text-lg">🧭</span>
            <div>
              <h3 className="text-[#c5a880] text-sm font-bold tracking-wide">SEKITAR ANDA</h3>
              <p className="text-[10px] text-stone-400">
                Posisi: ({playerX}, {playerY}) • Radius 1 Chunk
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={fetchNearby}
              disabled={loading}
              title="Segarkan data"
              className="px-2 py-1 text-xs text-amber-200/80 hover:text-amber-300 hover:bg-[#2d2218] rounded transition disabled:opacity-40"
            >
              {loading ? '⏳' : '🔄'}
            </button>
            <button
              onClick={onToggle}
              title="Tutup panel"
              className="px-2 py-1 text-xs text-stone-400 hover:text-stone-200 hover:bg-[#2d2218] rounded transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-[#2d2218] bg-[#080a0e] px-2 py-1.5 space-x-1 text-xs">
          {(
            [
              { key: 'all', label: 'Semua' },
              { key: 'player', label: 'Kultivator' },
              { key: 'building', label: 'Bangunan' },
              { key: 'hazard', label: 'Bahaya' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                filter === tab.key
                  ? 'bg-[#3d2b1f] text-[#f3e5ab] shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-[#1a1410]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Entity List */}
        <div className="p-2 overflow-y-auto max-h-[50vh] space-y-1.5 text-xs">
          {filteredEntities.length === 0 ? (
            <div className="py-8 text-center text-stone-500 italic">
              {loading ? 'Mendeteksi aura di sekitar...' : 'Suasana hening. Tidak ada entitas di dekat sini.'}
            </div>
          ) : (
            filteredEntities.map((item) => {
              const isPlayer = item.type === 'player';
              const isBuilding = item.type === 'building';
              const isGreeted = greetedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-[#12161f]/80 hover:bg-[#1a202c]/90 border border-[#2d2218] hover:border-[#523d2c] rounded p-2 transition flex items-center justify-between space-x-2"
                >
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <span className="text-base select-none mt-0.5">{getEntityIcon(item.type)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-stone-200 truncate max-w-[130px] sm:max-w-[160px]">
                          {item.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${getDistanceBadgeColor(
                            item.distanceLabel
                          )}`}
                        >
                          {item.dir} • {item.dist}t
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">
                        {item.status || (isPlayer ? 'Mengembara' : isBuilding ? 'Bangunan Mandiri' : item.type === 'hazard' ? 'Zona Bahaya' : 'Entitas')}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {onNavigateToTile && (
                      <button
                        onClick={() => onNavigateToTile(item.x, item.y)}
                        title="Arahkan kamera ke lokasi ini"
                        className="px-2 py-0.5 bg-[#1f1914] hover:bg-[#2d2218] text-[#c5a880] border border-[#3d2b1f] rounded text-[10px] transition"
                      >
                        Lihat
                      </button>
                    )}

                    {isBuilding && onAction && (
                      <button
                        onClick={() => onAction('enter', item)}
                        className="px-2 py-0.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border border-amber-700/50 rounded text-[10px] transition font-bold"
                      >
                        Masuk
                      </button>
                    )}

                    {isPlayer && onAction && (
                      <button
                        onClick={() => handleGreet(item)}
                        disabled={isGreeted}
                        className={`px-2 py-0.5 rounded text-[10px] transition border ${
                          isGreeted
                            ? 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
                            : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/50 font-bold'
                        }`}
                      >
                        {isGreeted ? 'Disapa' : 'Sapa'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {countOthers > 0 && (
            <div className="py-1 text-center text-[10px] text-stone-400 font-mono italic">
              ... dan {countOthers} entitas lainnya di area ini.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default NearbyPanel;
