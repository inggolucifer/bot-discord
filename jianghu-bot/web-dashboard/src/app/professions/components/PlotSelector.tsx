import React from 'react';

interface Plot {
    isDepleted: boolean;
    depletedUntil?: string | null;
    [key: string]: any;
}

interface PlotSelectorProps {
    plots: Plot[];
    selectedPlotIndex: number;
    onSelect: (index: number) => void;
}

export default function PlotSelector({ plots, selectedPlotIndex, onSelect }: PlotSelectorProps) {
    if (!plots || plots.length === 0) {
        return <div className="text-red-400 text-sm">Tidak ada petak ladang yang tersedia.</div>;
    }

    return (
        <div>
            <label className="block text-sm text-gray-400 mb-2">Pilih Petak Ladang</label>
            <div className="flex flex-wrap gap-2">
                {plots.map((plot, idx) => {
                    let isReady = !plot.isDepleted;
                    let timeLeftStr = "";

                    if (plot.isDepleted && plot.depletedUntil) {
                        const now = new Date();
                        const depletedUntil = new Date(plot.depletedUntil);
                        if (now < depletedUntil) {
                            const diffMs = depletedUntil.getTime() - now.getTime();
                            const hours = Math.floor(diffMs / (1000 * 60 * 60));
                            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            timeLeftStr = hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;
                        } else {
                            isReady = true; // should be updated on backend side actually, but allow selection
                        }
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
                            Plot {idx + 1}
                            {!isReady && <div className="text-[10px] font-normal text-red-400 mt-1">{timeLeftStr}</div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
