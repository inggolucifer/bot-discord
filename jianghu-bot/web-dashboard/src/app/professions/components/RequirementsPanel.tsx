import React from 'react';

interface Material {
    name: string;
    quantity: number;
}

interface RequirementsPanelProps {
    currentEnergy: number;
    energyCost?: number;
    requiredMaterials: Material[];
    inventory: any[];
    minToolTier?: number;
    selectedToolId?: string;
}

export default function RequirementsPanel({ currentEnergy, energyCost = 10, requiredMaterials, inventory, minToolTier, selectedToolId }: RequirementsPanelProps) {
    const energySufficient = currentEnergy >= energyCost;

    const materialsStatus = requiredMaterials.map(req => {
        const invItem = inventory?.find(i => i.itemId?.name === req.name);
        const owned = invItem ? invItem.quantity : 0;
        return {
            name: req.name,
            required: req.quantity,
            owned: owned,
            sufficient: owned >= req.quantity
        };
    });

    const selectedTool = selectedToolId ? inventory?.find(i => String(i.itemId?._id) === String(selectedToolId)) : null;
    const toolTierSufficient = selectedTool ? (selectedTool.itemId?.tier || 1) >= (minToolTier || 1) : false;

    const allMaterialsSufficient = materialsStatus.every(m => m.sufficient);
    const isReady = energySufficient && allMaterialsSufficient && (minToolTier === undefined || toolTierSufficient);

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h4 className="text-sm font-bold text-gray-300 mb-3 border-b border-gray-700 pb-2">Persyaratan</h4>

            <div className="space-y-3">
                {minToolTier !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Tool Tier (Min {minToolTier})</span>
                        <span className={`font-bold ${toolTierSufficient ? 'text-green-400' : 'text-red-400'}`}>
                            {selectedTool ? (
                                toolTierSufficient ? 'Memenuhi' : `Tidak Cukup (T${selectedTool.itemId?.tier || 1})`
                            ) : 'Belum Dipilih'}
                        </span>
                    </div>
                )}

                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Energy Cost</span>
                    <span className={`font-bold ${energySufficient ? 'text-green-400' : 'text-red-400'}`}>
                        {energyCost} <span className="text-gray-500 font-normal">/ {currentEnergy}</span>
                    </span>
                </div>

                {materialsStatus.length > 0 && (
                    <div className="pt-2 border-t border-gray-800">
                        <div className="text-xs text-gray-500 mb-2">Bahan Baku</div>
                        <div className="space-y-2">
                            {materialsStatus.map((mat, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">{mat.name}</span>
                                    <span className={`font-bold ${mat.sufficient ? 'text-green-400' : 'text-red-400'}`}>
                                        {mat.owned} <span className="text-gray-500 font-normal">/ {mat.required}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {!isReady && (
                <div className="mt-4 p-2 bg-red-900/20 rounded border border-red-900/50 text-xs text-red-400">
                    Kamu tidak memenuhi persyaratan untuk memulai.<br/>
                    {!allMaterialsSufficient && (
                        <span className="text-red-300 mt-1 block">Bahan kurang? Cari material di fitur Explore, Market, atau kumpulkan via profesi lain.</span>
                    )}
                </div>
            )}
        </div>
    );
}
