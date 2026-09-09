import React, { useState } from 'react';
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
}

export default function PlotSelector({ plots, selectedPlotIndex, onSelect }: PlotSelectorProps) {
        const queryClient = useQueryClient();
    const [isUnlocking, setIsUnlocking] = useState(false);

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
    const nextSlot = currentSlots + 1;
    if (nextSlot >= 2 && nextSlot <= 5) costText = "50 Silver";
    else if (nextSlot >= 6 && nextSlot <= 10) costText = "5 Gold";
    else if (nextSlot >= 11 && nextSlot <= 15) costText = "20 Gold";
    else if (nextSlot >= 16 && nextSlot <= 20) costText = "1 Jade";

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm text-gray-400">Pilih Petak Ladang</label>
                {currentSlots < 20 && (
                    <button
                        onClick={handleUnlock}
                        disabled={isUnlocking}
                        className="text-xs px-2 py-1 bg-amber-900/50 hover:bg-amber-800 text-amber-200 border border-amber-700 rounded transition-colors"
                    >
                        {isUnlocking ? '...' : '+ Beli Petak'} <span className="text-gray-400">({costText})</span>
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {plots.map((plot, idx) => {
                    let isReady = false; // "Ready" means clickable to select for plant/harvest
                    let label = "KOSONG";
                    let timeLeftStr = "";
                    const now = new Date().getTime();

                    if (plot.isDepleted && plot.depletedUntil) {
                        const depletedUntil = new Date(plot.depletedUntil).getTime();
                        if (now < depletedUntil) {
                            const diffMs = depletedUntil - now;
                            const hours = Math.floor(diffMs / (1000 * 60 * 60));
                            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            timeLeftStr = hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;
                            label = "GERSANG";
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
                            label = "TUMBUH";
                        } else {
                            isReady = true;
                            label = "PANEN";
                        }
                    } else {
                        isReady = true;
                    }

                    return (
                        <button
                            key={idx}
                            disabled={!isReady}
                            onClick={() => isReady && onSelect(idx)}
                            className={`px-4 py-2 rounded border text-sm font-bold transition-colors ${
                                !isReady
                                    ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
                                    : selectedPlotIndex === idx
                                        ? 'bg-amber-900/50 border-amber-500 text-amber-100'
                                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-amber-500/50 hover:bg-gray-700'
                            }`}
                        >
                            Plot ${idx + 1}
                            <div className={`text-[10px] font-normal mt-1 ${!isReady ? 'text-red-400' : 'text-green-400'}`}>
                                {label} {timeLeftStr && `(${timeLeftStr})`}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
