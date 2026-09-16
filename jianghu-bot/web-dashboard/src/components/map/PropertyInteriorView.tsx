'use client';
import React, { useState } from 'react';
import api from '@/lib/api';
import { DoorOpen, Sparkles, Flame, Shield, Leaf, ArrowUpCircle, Info, Home, User } from 'lucide-react';
import AcupointPulseMinigame from '../minigames/AcupointPulseMinigame';
import KataQteMinigame from '../minigames/KataQteMinigame';
import CrucibleEquilibriumMinigame from '../minigames/CrucibleEquilibriumMinigame';

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
    const [facilities, setFacilities] = useState(propertyData.facilities);
    const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 5, y: 10 }); // Di depan pintu keluar
    const [activeMinigame, setActiveMinigame] = useState<'acupoint' | 'kata' | 'crucible' | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isUpgrading, setIsUpgrading] = useState<boolean>(false);

    const width = propertyData.subGridWidth || 12;
    const height = propertyData.subGridHeight || 12;

    const handleTileClick = (x: number, y: number) => {
        const tileVal = propertyData.layout[y * width + x];
        const meta = propertyData.tileMetadata[tileVal];

        if (meta?.isSolid) {
            // Jika solid tapi interactable (seperti meja, kuali, anvil)
            if (meta.interactable) {
                triggerAction(meta.action);
            }
            return;
        }

        // Pindah langkah player
        setPlayerPos({ x, y });

        // Trigger action jika ada
        if (meta?.interactable && meta.action) {
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
        } else if (action === 'reception_chat') {
            setNotice('Kamu duduk menikmati teh hangat harum melati di Aula Utama kediaman.');
            setTimeout(() => setNotice(null), 3500);
        } else if (action === 'harvest_herbs') {
            setNotice('Tanaman obat di petak rohani sedang bertumbuh menyerap embun pagi.');
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

    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-amber-900/60 shadow-2xl bg-[#090c13] flex flex-col select-none">
            {/* HUD Top Bar */}
            <div className="absolute top-3 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
                <button
                    onClick={onExit}
                    className="pointer-events-auto bg-black/75 hover:bg-black/90 text-amber-200 px-3 py-1.5 rounded-lg border border-amber-800/60 flex items-center gap-2 backdrop-blur-sm transition-colors text-xs font-semibold shadow-lg"
                >
                    <DoorOpen className="w-4 h-4" /> Keluar ke Dunia Luar
                </button>

                <div className="bg-black/80 border border-amber-700/60 px-4 py-1.5 rounded-lg backdrop-blur-md shadow-lg flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-200 font-serif font-bold text-sm">{propertyData.name}</span>
                    <span className="text-xs text-gray-400">({propertyData.ownerName})</span>
                </div>
            </div>

            {/* Notice Alert */}
            {notice && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-black/90 border border-amber-500/70 text-amber-200 px-5 py-2.5 rounded-lg shadow-2xl font-medium text-xs backdrop-blur-md animate-in fade-in">
                    {notice}
                </div>
            )}

            {/* Interior Sub-Grid 12x12 Rendering */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden p-2">
                <div
                    className="grid gap-1 bg-[#101522] p-2.5 rounded-2xl border border-[#2b354d] shadow-2xl"
                    style={{
                        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
                        width: 'min(75vh, 92%)',
                        height: 'min(75vh, 92%)'
                    }}
                >
                    {Array.from({ length: height }).map((_, y) =>
                        Array.from({ length: width }).map((_, x) => {
                            const tileVal = propertyData.layout[y * width + x];
                            const isPlayerHere = playerPos.x === x && playerPos.y === y;

                            // Tile style classes based on value
                            let tileClass = 'bg-[#161e2e] border-gray-800 hover:bg-[#202b40]';
                            let icon = null;
                            let label = '';

                            if (tileVal === 1) {
                                // Wall
                                tileClass = 'bg-[#0d1017] border-amber-950/70 opacity-90';
                            } else if (tileVal === 2) {
                                // Reception Table
                                tileClass = 'bg-amber-950/60 border-amber-600/50 cursor-pointer shadow-md';
                                label = 'Meja Teh';
                            } else if (tileVal === 3) {
                                // Cultivation Mat
                                tileClass = 'bg-cyan-950/80 border-cyan-500/80 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.4)] animate-pulse';
                                icon = <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
                                label = `Qi T${facilities.qiGatheringArrayTier}`;
                            } else if (tileVal === 4) {
                                // Alchemy Crucible
                                tileClass = 'bg-red-950/80 border-red-500/80 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.4)]';
                                icon = <Flame className="w-3.5 h-3.5 text-amber-400" />;
                                label = `Kuali T${facilities.alchemyCrucibleTier}`;
                            } else if (tileVal === 5) {
                                // Blacksmith Anvil
                                tileClass = 'bg-slate-900 border-slate-500/80 cursor-pointer shadow-[0_0_10px_rgba(148,163,184,0.3)]';
                                icon = <Shield className="w-3.5 h-3.5 text-gray-300" />;
                                label = `Tempa T${facilities.forgeAnvilTier}`;
                            } else if (tileVal === 6) {
                                // Herb Plot
                                tileClass = 'bg-emerald-950/80 border-emerald-600/60 cursor-pointer';
                                icon = <Leaf className="w-3.5 h-3.5 text-emerald-400" />;
                                label = 'Herba';
                            } else if (tileVal === 7) {
                                // Exit Door
                                tileClass = 'bg-amber-900/60 border-amber-500/80 cursor-pointer';
                                icon = <DoorOpen className="w-3.5 h-3.5 text-amber-300" />;
                                label = 'Pintu';
                            }

                            return (
                                <div
                                    key={`${x}-${y}`}
                                    onClick={() => handleTileClick(x, y)}
                                    className={`relative rounded-lg border flex flex-col items-center justify-center transition-all p-0.5 text-center
                                        ${tileClass} ${isPlayerHere ? 'ring-2 ring-blue-400 z-20' : ''}`}
                                >
                                    {icon}
                                    {label && <span className="text-[7px] font-bold text-gray-200 mt-0.5 leading-none truncate max-w-full">{label}</span>}
                                    {isPlayerHere && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.9)] flex items-center justify-center">
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

            {/* Bottom HUD: Facility Tiers & Owner Upgrades */}
            <div className="bg-[#101520]/95 border-t border-amber-950/80 px-4 py-2 z-20 flex justify-between items-center backdrop-blur-md">
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Formasi Qi: <strong className="text-cyan-300 font-mono">T{facilities.qiGatheringArrayTier}</strong>
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-400" /> Kuali Alkimia: <strong className="text-amber-300 font-mono">T{facilities.alchemyCrucibleTier}</strong>
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-gray-400" /> Landasan Tempa: <strong className="text-gray-200 font-mono">T{facilities.forgeAnvilTier}</strong>
                    </span>
                </div>

                {propertyData.isOwner && (
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={isUpgrading || facilities.qiGatheringArrayTier >= 5}
                            onClick={() => handleUpgradeFacility('qi_array')}
                            className="text-[10px] bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 px-2.5 py-1 rounded-md transition-colors"
                        >
                            Upgrade Qi (+{facilities.qiGatheringArrayTier * 800} Silv)
                        </button>
                        <button
                            disabled={isUpgrading || facilities.alchemyCrucibleTier >= 5}
                            onClick={() => handleUpgradeFacility('crucible')}
                            className="text-[10px] bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 px-2.5 py-1 rounded-md transition-colors"
                        >
                            Upgrade Kuali (+{facilities.alchemyCrucibleTier * 600} Silv)
                        </button>
                    </div>
                )}
            </div>

            {/* Minigame Modal Overlays */}
            {activeMinigame === 'acupoint' && (
                <AcupointPulseMinigame
                    onClose={() => setActiveMinigame(null)}
                    onCompleted={(res) => {
                        setNotice(`Latihan Qi selesai: ${res.message}`);
                        setTimeout(() => setNotice(null), 4000);
                    }}
                />
            )}
            {activeMinigame === 'crucible' && (
                <CrucibleEquilibriumMinigame
                    onClose={() => setActiveMinigame(null)}
                    onCompleted={(res) => {
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
                        setNotice(res.message);
                        setTimeout(() => setNotice(null), 4000);
                    }}
                />
            )}
        </div>
    );
}
