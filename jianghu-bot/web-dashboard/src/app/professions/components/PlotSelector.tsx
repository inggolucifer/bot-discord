import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/components/ui/Toast';

interface Plot {
    isDepleted: boolean;
    depletedUntil?: string | null;
    cropId?: any;
    plantedAt?: string | null;
    harvestAt?: string | null;
    [key: string]: any;
}

interface PlotSelectorProps {
    plots: Plot[];
    selectedPlotIndex: number;
    onSelect: (index: number) => void;
    playerCurrency?: {
        copper: number;
        silver: number;
        gold: number;
        jade: number;
    };
}

export default function PlotSelector({ plots, selectedPlotIndex, onSelect, playerCurrency }: PlotSelectorProps) {
    const queryClient = useQueryClient();
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date().getTime());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date().getTime());
        }, 30000); // 30s
        return () => clearInterval(interval);
    }, []);

    const unlockMutation = useMutation({
        mutationFn: () => api.post('/professions/farming/unlock-slot'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            toast.show({ message: 'Berhasil membuka petak baru!', type: 'success' });
            setIsUnlocking(false);
        },
        onError: (err: any) => {
            toast.show({ message: err.response?.data?.error || 'Gagal membuka petak.', type: 'error' });
            setIsUnlocking(false);
        }
    });

    const handleUnlock = () => {
        if (confirm('Beli petak ladang baru?')) {
            setIsUnlocking(true);
            unlockMutation.mutate();
        }
    };

    if (!plots || plots.length === 0) {
        return <div className="text-red-400 text-sm">Tidak ada petak ladang yang tersedia.</div>;
    }

    const currentSlots = plots.length;
    let costText = "";
    let hasEnoughCurrency = true;
    const nextSlot = currentSlots + 1;
    if (nextSlot >= 2 && nextSlot <= 5) {
        costText = "50 Silver";
        hasEnoughCurrency = playerCurrency ? playerCurrency.silver >= 50 : true;
    } else if (nextSlot >= 6 && nextSlot <= 10) {
        costText = "5 Gold";
        hasEnoughCurrency = playerCurrency ? playerCurrency.gold >= 5 : true;
    } else if (nextSlot >= 11 && nextSlot <= 15) {
        costText = "20 Gold";
        hasEnoughCurrency = playerCurrency ? playerCurrency.gold >= 20 : true;
    } else if (nextSlot >= 16 && nextSlot <= 20) {
        costText = "1 Jade";
        hasEnoughCurrency = playerCurrency ? playerCurrency.jade >= 1 : true;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm text-gray-400">Pilih Petak Ladang</label>
                {currentSlots < 20 && (
                    <button
                        onClick={handleUnlock}
                        disabled={isUnlocking || !hasEnoughCurrency}
                        className={`text-xs px-2 py-1 rounded transition-colors border ${
                            isUnlocking || !hasEnoughCurrency
                                ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                                : 'bg-amber-900/50 hover:bg-amber-800 text-amber-200 border-amber-700'
                        }`}
                        title={!hasEnoughCurrency ? "Dana tidak mencukupi" : ""}
                    >
                        {isUnlocking ? '...' : '+ Beli Petak'} <span className={`${!hasEnoughCurrency ? 'text-red-400' : 'text-gray-400'}`}>({costText})</span>
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {plots.map((plot, idx) => {
                    let isReady = false; // "Ready" means clickable to select for plant/harvest
                    let label = "EMPTY";
                    let timeLeftStr = "";
                    const now = currentTime;

                    if (plot.isDepleted && plot.depletedUntil) {
                        const depletedUntil = new Date(plot.depletedUntil).getTime();
                        if (now < depletedUntil) {
                            const diffMs = depletedUntil - now;
                            const hours = Math.floor(diffMs / (1000 * 60 * 60));
                            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            timeLeftStr = hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;
                            label = "DEPLETED";
                        } else {
                            isReady = true;
                        }
                    } else if (plot.cropId && plot.harvestAt) {
                        const harvestAt = new Date(plot.harvestAt).getTime();
                        if (now < harvestAt) {
                            const diffMs = harvestAt - now;
                            const hours = Math.floor(diffMs / (1000 * 60 * 60));
                            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            timeLeftStr = hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;
                            label = "GROWING";
                            isReady = true; // Make it clickable so we can show fertilizer button
                        } else {
                            isReady = true;
                            label = "READY";
                        }
                    } else {
                        isReady = true;
                    }

                    return (
                        <button
                            key={idx}
                            disabled={!isReady && label === "DEPLETED"}
                            onClick={() => isReady && onSelect(idx)}
                            className={`relative px-4 py-2 rounded border text-sm font-bold transition-colors ${
                                (!isReady && label === "DEPLETED")
                                    ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
                                    : selectedPlotIndex === idx
                                        ? 'bg-amber-900/50 border-amber-500 text-amber-100'
                                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-amber-500/50 hover:bg-gray-700'
                            }`}
                        >
                            Plot ${idx + 1}
                            <div className={`text-[10px] font-normal mt-1 ${label === 'DEPLETED' ? 'text-red-400' : label === 'GROWING' ? 'text-blue-400' : label === 'READY' ? 'text-green-400' : 'text-gray-400'}`}>
                                {label} {timeLeftStr && `(${timeLeftStr})`}
                            </div>
                            {plot.fertilizerApplied && (
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[8px] px-1 py-0.5 rounded-full shadow" title="Sudah Dipupuk">
                                    ✨ Pupuk
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
