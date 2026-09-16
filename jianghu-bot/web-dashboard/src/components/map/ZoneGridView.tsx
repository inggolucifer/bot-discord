'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import { sound } from '@/lib/soundSynthesizer';
import {
    Map as MapIcon,
    Pickaxe,
    Search,
    Footprints,
    DoorOpen,
    Sparkles,
    Volume2,
    VolumeX,
    Music,
    ShieldAlert
} from 'lucide-react';
import ThermalStatusBadge from '../ui/ThermalStatusBadge';
import PropertyInteriorView from './PropertyInteriorView';

interface Tile {
    _id: string;
    tileX: number;
    tileY: number;
    tileType: string;
    terrainType?: string;
    isSolid?: boolean;
    isClaimable?: boolean;
    baseTemperature?: number;
    label?: string;
    hidden?: boolean;
    resourceType?: string;
    nodeRespawnAt?: string;
    ownerName?: string;
    ownerId?: string;
    ownerType?: string;
    plotPriceSilver?: number;
    isOccupied?: boolean;
    isUnderConstruction?: boolean;
    buildingName?: string;
    propertyStructureId?: string;
}

interface ZoneGridViewProps {
    zoneId: string;
    onBackToWorld: () => void;
}

export default function ZoneGridView({ zoneId, onBackToWorld }: ZoneGridViewProps) {
    const [zoneConfig, setZoneConfig] = useState<any>(null);
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [playerGrid, setPlayerGrid] = useState<any>(null);
    const [selectedTile, setSelectedTile] = useState<{ x: number; y: number; specialTile?: Tile } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [isWalking, setIsWalking] = useState(false);
    const [isBgmOn, setIsBgmOn] = useState(false);
    const [interiorData, setInteriorData] = useState<any | null>(null);
    const [thermalStatus, setThermalStatus] = useState<any | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const walkTimeoutRef = useRef<any>(null);

    // Canvas Virtualization Constants
    const VIEWPORT_WIDTH_TILES = 11;
    const VIEWPORT_HEIGHT_TILES = 9;
    const TILE_SIZE = 56; // pixels per tile on canvas

    const fetchZoneData = async () => {
        try {
            const res = await api.get(`/world/zone/${zoneId}`);
            if (res.data.config) setZoneConfig(res.data.config);
            if (res.data.tiles) setTiles(res.data.tiles);
            if (res.data.playerGrid) setPlayerGrid(res.data.playerGrid);
            setLoading(false);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal memuat zona');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchZoneData();
        return () => {
            if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
            sound.stopBgm();
        };
    }, [zoneId]);

    const handleToggleBgm = () => {
        if (isBgmOn) {
            sound.stopBgm();
            setIsBgmOn(false);
        } else {
            sound.startAmbientBgm();
            setIsBgmOn(true);
        }
    };

    // ==========================================
    // CANVAS HIGH PERFORMANCE RENDERING ENGINE
    // ==========================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !zoneConfig || !playerGrid?.position) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const px = playerGrid.position.tileX ?? 0;
        const py = playerGrid.position.tileY ?? 0;

        const startX = Math.max(0, px - Math.floor(VIEWPORT_WIDTH_TILES / 2));
        const endX = Math.min(zoneConfig.gridWidth - 1, startX + VIEWPORT_WIDTH_TILES - 1);
        const startY = Math.max(0, py - Math.floor(VIEWPORT_HEIGHT_TILES / 2));
        const endY = Math.min(zoneConfig.gridHeight - 1, startY + VIEWPORT_HEIGHT_TILES - 1);

        const exploredSet = new Set(playerGrid.exploredTileIndexes || []);

        // Clear canvas
        ctx.fillStyle = '#06080d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw visible grid tiles
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const screenX = (x - startX) * TILE_SIZE;
                const screenY = (y - startY) * TILE_SIZE;
                const tileIndex = y * zoneConfig.gridWidth + x;
                const isExplored = exploredSet.has(tileIndex);
                const tileObj = tiles.find(t => t.tileX === x && t.tileY === y);

                if (!isExplored) {
                    // Fog of War
                    ctx.fillStyle = '#0a0d14';
                    ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#121620';
                    ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

                    ctx.fillStyle = '#2d3748';
                    ctx.font = '10px monospace';
                    ctx.fillText('?', screenX + TILE_SIZE / 2 - 3, screenY + TILE_SIZE / 2 + 3);
                    continue;
                }

                // Terrain & Tile Background
                let terrainColor = '#151c27';
                const terrain = tileObj?.terrainType || 'plains';

                if (terrain === 'forest') terrainColor = '#0f241d';
                else if (terrain === 'mountain' || tileObj?.isSolid) terrainColor = '#1e2430';
                else if (terrain === 'swamp') terrainColor = '#1c1326';
                else if (terrain === 'glacial') terrainColor = '#0d222e';
                else if (terrain === 'volcanic') terrainColor = '#2b1414';
                else if (terrain === 'settlement') terrainColor = '#241e15';

                ctx.fillStyle = terrainColor;
                ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#232f42';
                ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

                // Coordinate label in subtle text
                ctx.fillStyle = '#4a5568';
                ctx.font = '8px monospace';
                ctx.fillText(`${x},${y}`, screenX + 3, screenY + 10);

                // Tile Elements
                if (tileObj) {
                    if (tileObj.tileType === 'resource_node') {
                        ctx.fillStyle = '#10b981';
                        ctx.beginPath();
                        ctx.arc(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2 - 2, 7, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#a7f3d0';
                        ctx.font = 'bold 8px sans-serif';
                        ctx.fillText('⛏', screenX + TILE_SIZE / 2 - 4, screenY + TILE_SIZE / 2 + 1);
                    } else if (tileObj.tileType === 'hazard') {
                        ctx.fillStyle = '#ef4444';
                        ctx.font = '14px sans-serif';
                        ctx.fillText('☠', screenX + TILE_SIZE / 2 - 6, screenY + TILE_SIZE / 2 + 4);
                    } else if (tileObj.tileType === 'npc_spawn') {
                        ctx.fillStyle = '#a855f7';
                        ctx.beginPath();
                        ctx.arc(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2 - 2, 7, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#f3e8ff';
                        ctx.font = 'bold 8px sans-serif';
                        ctx.fillText('NPC', screenX + TILE_SIZE / 2 - 8, screenY + TILE_SIZE / 2 + 1);
                    } else if (tileObj.tileType === 'buildable_plot') {
                        if (tileObj.isOccupied) {
                            ctx.fillStyle = '#3b82f6';
                            ctx.fillRect(screenX + 8, screenY + 12, TILE_SIZE - 16, TILE_SIZE - 24);
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 7px sans-serif';
                            ctx.fillText('RUMAH', screenX + 11, screenY + TILE_SIZE / 2 + 2);
                        } else {
                            ctx.strokeStyle = '#9ca3af';
                            ctx.setLineDash([2, 2]);
                            ctx.strokeRect(screenX + 8, screenY + 12, TILE_SIZE - 16, TILE_SIZE - 24);
                            ctx.setLineDash([]);
                        }
                    }
                }

                // Selected Tile Ring
                if (selectedTile && selectedTile.x === x && selectedTile.y === y) {
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                    ctx.lineWidth = 1;
                }

                // Player Avatar
                if (px === x && py === y) {
                    ctx.fillStyle = '#2563eb';
                    ctx.beginPath();
                    ctx.arc(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.lineWidth = 1;

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 8px sans-serif';
                    ctx.fillText('P1', screenX + TILE_SIZE / 2 - 5, screenY + TILE_SIZE / 2 + 3);
                }
            }
        }
    }, [zoneConfig, playerGrid, tiles, selectedTile]);

    // Canvas Click Handler
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !zoneConfig || !playerGrid?.position) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const px = playerGrid.position.tileX ?? 0;
        const py = playerGrid.position.tileY ?? 0;
        const startX = Math.max(0, px - Math.floor(VIEWPORT_WIDTH_TILES / 2));
        const startY = Math.max(0, py - Math.floor(VIEWPORT_HEIGHT_TILES / 2));

        const gridX = startX + Math.floor(clickX / TILE_SIZE);
        const gridY = startY + Math.floor(clickY / TILE_SIZE);

        if (gridX < 0 || gridX >= zoneConfig.gridWidth || gridY < 0 || gridY >= zoneConfig.gridHeight) return;

        const specialTile = tiles.find(t => t.tileX === gridX && t.tileY === gridY);
        setSelectedTile({ x: gridX, y: gridY, specialTile });

        const dist = Math.max(Math.abs(px - gridX), Math.abs(py - gridY));
        if (dist === 0) {
            if (specialTile?.tileType === 'buildable_plot' && specialTile.isOccupied) {
                handleEnterProperty(gridX, gridY);
            }
        }
    };

    // Movement Handler
    const handleMove = async (targetX: number, targetY: number) => {
        if (isWalking) {
            setActionMessage('Karakter masih sedang melangkah menuju tujuan!');
            setTimeout(() => setActionMessage(null), 2500);
            return;
        }

        try {
            sound.playGuzheng(440, 0.4);
            const res = await api.post('/world/zone/move', { targetX, targetY, zoneId });
            if (res.data.playerGrid) setPlayerGrid(res.data.playerGrid);

            const durationSec = res.data.durationSeconds || 1;
            setIsWalking(true);
            setActionMessage(`Melangkah ke (${targetX}, ${targetY})... (~${durationSec}s)`);

            if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
            walkTimeoutRef.current = setTimeout(async () => {
                try {
                    const resolveRes = await api.post('/world/zone/resolve-move');
                    setIsWalking(false);
                    if (resolveRes.data.playerGrid) setPlayerGrid(resolveRes.data.playerGrid);
                    if (resolveRes.data.thermalStatus) setThermalStatus(resolveRes.data.thermalStatus);

                    if (resolveRes.data.encounter?.encountered) {
                        const enc = resolveRes.data.encounter;
                        const won = enc.battleResult?.winner === 'player';
                        setActionMessage(`⚔️ Disergap oleh ${enc.enemyName}! Hasil pertarungan: ${won ? 'MENANG' : 'KALAH'}`);
                    } else {
                        setActionMessage(`Tiba di (${targetX}, ${targetY})`);
                    }
                    fetchZoneData();
                    setTimeout(() => setActionMessage(null), 3500);
                } catch {
                    setIsWalking(false);
                    fetchZoneData();
                }
            }, durationSec * 1000);
        } catch (err: any) {
            setActionMessage(err.response?.data?.error || 'Gagal bergerak');
            setTimeout(() => setActionMessage(null), 3000);
        }
    };

    const handleEnterProperty = async (tileX?: number, tileY?: number) => {
        try {
            const tx = tileX !== undefined ? tileX : playerGrid?.position?.tileX;
            const ty = tileY !== undefined ? tileY : playerGrid?.position?.tileY;
            const res = await api.post('/world/zone/enter-property', { tileX: tx, tileY: ty });
            if (res.data.property) {
                setInteriorData(res.data.property);
            }
        } catch (err: any) {
            setActionMessage(err.response?.data?.error || 'Gagal memasuki kediaman');
            setTimeout(() => setActionMessage(null), 3000);
        }
    };

    const handleExitProperty = async () => {
        try {
            await api.post('/world/zone/exit-property');
            setInteriorData(null);
            fetchZoneData();
        } catch (err: any) {
            setInteriorData(null);
        }
    };

    const handleSearch = async () => {
        try {
            const res = await api.post('/world/zone/search', { zoneId });
            if (res.data.playerGrid) setPlayerGrid(res.data.playerGrid);
            if (res.data.tiles) setTiles(res.data.tiles);
            setActionMessage('Pencarian selesai: ' + res.data.message);
            fetchZoneData();
            setTimeout(() => setActionMessage(null), 4000);
        } catch (err: any) {
            setActionMessage(err.response?.data?.error || 'Gagal mencari');
            setTimeout(() => setActionMessage(null), 3000);
        }
    };

    const handleGather = async (tileX: number, tileY: number) => {
        try {
            const res = await api.post('/world/zone/gather', { tileX, tileY, zoneId });
            if (res.data.playerGrid) setPlayerGrid(res.data.playerGrid);
            setActionMessage(res.data.message);
            fetchZoneData();
            setTimeout(() => setActionMessage(null), 4000);
        } catch (err: any) {
            setActionMessage(err.response?.data?.error || 'Gagal panen');
            setTimeout(() => setActionMessage(null), 3000);
        }
    };

    const handleBuyPlot = async (tileX: number, tileY: number) => {
        try {
            const res = await api.post('/world/zone/buy-plot', { tileX, tileY });
            setActionMessage(res.data.message || 'Berhasil membeli plot tanah!');
            fetchZoneData();
            setTimeout(() => setActionMessage(null), 4000);
        } catch (err: any) {
            setActionMessage(err.response?.data?.error || 'Gagal membeli plot tanah');
            setTimeout(() => setActionMessage(null), 3000);
        }
    };

    if (loading) return <div className="w-full h-96 flex items-center justify-center text-gray-400">Memuat Zona...</div>;
    if (error) return <div className="w-full h-96 flex items-center justify-center text-red-500">{error}</div>;

    // Jika sedang berada di dalam interior properti
    if (interiorData) {
        return <PropertyInteriorView propertyData={interiorData} onExit={handleExitProperty} />;
    }

    const currentPx = playerGrid?.position?.tileX ?? 0;
    const currentPy = playerGrid?.position?.tileY ?? 0;
    const selectedDist = selectedTile != null
        ? Math.max(Math.abs(currentPx - selectedTile.x), Math.abs(currentPy - selectedTile.y))
        : null;

    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#2a3142] shadow-2xl bg-[#0b0e14] flex flex-col select-none">
            {/* HUD Top Bar */}
            <div className="absolute top-3 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        onClick={onBackToWorld}
                        className="bg-black/75 hover:bg-black/90 text-white px-3 py-1.5 rounded-lg border border-gray-600 flex items-center gap-2 backdrop-blur-sm transition-colors text-xs font-semibold shadow-md"
                    >
                        <MapIcon className="w-4 h-4" /> Peta Dunia
                    </button>
                    <button
                        onClick={handleToggleBgm}
                        className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 backdrop-blur-sm transition-colors text-xs font-semibold shadow-md
                            ${isBgmOn ? 'bg-amber-950/80 border-amber-500 text-amber-200' : 'bg-black/75 border-gray-700 text-gray-400'}`}
                    >
                        <Music className="w-3.5 h-3.5" />
                        <span>{isBgmOn ? 'Musik: On' : 'Musik: Off'}</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Thermal Status HUD Badge */}
                    <ThermalStatusBadge initialThermalData={thermalStatus} />

                    <div className="bg-black/75 border border-amber-900/60 px-4 py-1.5 rounded-lg backdrop-blur-sm shadow-md flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <h3 className="text-amber-200 font-serif font-bold text-xs tracking-wide">{zoneConfig?.displayName || 'Zone'}</h3>
                        <span className="text-[11px] text-gray-400 font-mono">({currentPx}, {currentPy})</span>
                    </div>
                </div>
            </div>

            {/* Action Notice Alert */}
            {actionMessage && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-black/90 border border-amber-500/70 text-amber-200 px-5 py-2.5 rounded-lg shadow-2xl font-medium text-xs backdrop-blur-md animate-in fade-in">
                    {actionMessage}
                </div>
            )}

            {/* Virtualized Grid Canvas Viewport */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#06080d]">
                <canvas
                    ref={canvasRef}
                    width={VIEWPORT_WIDTH_TILES * TILE_SIZE}
                    height={VIEWPORT_HEIGHT_TILES * TILE_SIZE}
                    onClick={handleCanvasClick}
                    className="cursor-pointer border border-[#1a2333] rounded-lg shadow-2xl max-w-full max-h-full object-contain"
                />
            </div>

            {/* Bottom HUD: Action Bar & Inspector */}
            <div className="bg-[#10151f]/95 border-t border-[#2a3142] px-4 py-2 z-20 flex justify-between items-center backdrop-blur-md">
                <div className="flex items-center gap-3 text-xs text-gray-300">
                    {selectedTile ? (
                        <>
                            <span className="font-semibold text-amber-300">Tile ({selectedTile.x}, {selectedTile.y})</span>
                            <span className="text-gray-500">|</span>
                            <span className="text-gray-400">Jarak: <strong className="text-gray-200">{selectedDist}</strong> tile</span>
                            {selectedTile.specialTile && (
                                <>
                                    <span className="text-gray-500">|</span>
                                    <span className="text-emerald-400 font-medium capitalize">
                                        {selectedTile.specialTile.tileType.replace('_', ' ')}: {selectedTile.specialTile.label || selectedTile.specialTile.buildingName || ''}
                                    </span>
                                </>
                            )}
                        </>
                    ) : (
                        <span className="text-gray-500 italic">Klik sebuah tile pada Canvas untuk memeriksa atau melangkah.</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {selectedTile && selectedDist != null && (
                        <>
                            {selectedTile.specialTile?.tileType === 'resource_node' && selectedDist <= 1 && (
                                <button
                                    onClick={() => handleGather(selectedTile.x, selectedTile.y)}
                                    className="bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-700/50 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-colors"
                                >
                                    <Pickaxe className="w-3.5 h-3.5" /> Panen
                                </button>
                            )}

                            {selectedTile.specialTile?.tileType === 'buildable_plot' && selectedTile.specialTile.isOccupied && selectedDist <= 1 && (
                                <button
                                    onClick={() => handleEnterProperty(selectedTile.x, selectedTile.y)}
                                    className="bg-blue-900/80 hover:bg-blue-800 text-blue-200 px-3 py-1.5 rounded-lg border border-blue-700/50 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-colors"
                                >
                                    <DoorOpen className="w-3.5 h-3.5" /> Masuk Kediaman
                                </button>
                            )}

                            {selectedTile.specialTile?.tileType === 'buildable_plot' && !selectedTile.specialTile.isOccupied && selectedDist <= 1 && (
                                <button
                                    onClick={() => handleBuyPlot(selectedTile.x, selectedTile.y)}
                                    className="bg-amber-900/90 hover:bg-amber-800 text-amber-200 px-3 py-1.5 rounded-lg border border-amber-600/60 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Beli Plot ({selectedTile.specialTile.plotPriceSilver || 500} Silv)
                                </button>
                            )}

                            {selectedDist > 0 && selectedDist <= (zoneConfig?.maxMovePerAction || 5) && (
                                <button
                                    onClick={() => handleMove(selectedTile.x, selectedTile.y)}
                                    disabled={isWalking}
                                    className="bg-amber-900/80 hover:bg-amber-800 disabled:opacity-50 text-amber-200 px-3 py-1.5 rounded-lg border border-amber-700/50 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-colors"
                                >
                                    <Footprints className="w-3.5 h-3.5" /> {isWalking ? 'Melangkah...' : 'Melangkah ke Sini'}
                                </button>
                            )}
                        </>
                    )}

                    <button
                        onClick={handleSearch}
                        className="bg-blue-950/80 hover:bg-blue-900 text-blue-200 px-3 py-1.5 rounded-lg border border-blue-800/60 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-colors"
                    >
                        <Search className="w-3.5 h-3.5" /> Cari Sekitar
                    </button>
                </div>
            </div>
        </div>
    );
}
