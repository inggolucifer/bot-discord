import React from 'react';

interface ZoneSelectorProps {
    unlockedZones: number[];
    selectedZoneId: number;
    onSelect: (zoneId: number) => void;
}

export default function ZoneSelector({ unlockedZones, selectedZoneId, onSelect }: ZoneSelectorProps) {
    if (!unlockedZones || unlockedZones.length === 0) {
        return <div className="text-red-400 text-sm">Belum ada zona memancing yang terbuka.</div>;
    }

    // Assuming a max of 5 zones for now, we render based on unlocked list
    const maxKnownZones = 5;
    const allZones = Array.from({ length: maxKnownZones }, (_, i) => i + 1);

    return (
        <div>
            <label className="block text-sm text-gray-400 mb-2">Pilih Zona Memancing</label>
            <div className="flex flex-wrap gap-2">
                {allZones.map((zoneId) => {
                    const isUnlocked = unlockedZones.includes(zoneId);

                    return (
                        <button
                            key={zoneId}
                            disabled={!isUnlocked}
                            onClick={() => isUnlocked && onSelect(zoneId)}
                            className={`px-4 py-2 rounded border text-sm font-bold transition-colors ${
                                !isUnlocked
                                    ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
                                    : selectedZoneId === zoneId
                                        ? 'bg-blue-900/50 border-blue-500 text-blue-100'
                                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-blue-500/50 hover:bg-gray-700'
                            }`}
                        >
                            Zona {zoneId}
                            {!isUnlocked && <span className="ml-1 text-[10px]">🔒</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
