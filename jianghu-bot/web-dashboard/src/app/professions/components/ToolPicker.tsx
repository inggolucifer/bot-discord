import React from 'react';

interface ToolPickerProps {
    inventory: any[];
    toolType: string;
    minToolTier?: number;
    selectedToolId: string;
    onSelect: (toolId: string) => void;
}

export default function ToolPicker({ inventory, toolType, minToolTier = 1, selectedToolId, onSelect }: ToolPickerProps) {
    if (!toolType) {
        return <div className="text-gray-500 text-sm italic">Pilih resep terlebih dahulu untuk melihat alat yang dibutuhkan.</div>;
    }

    const availableTools = inventory?.filter((item: any) =>
        item.itemId?.toolType === toolType && (item.durability == null || item.durability > 0)
    ) || [];

    if (availableTools.length === 0) {
        return <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-900/50">
            <p className="font-bold mb-1">Tidak ada alat yang bisa digunakan!</p>
            <p>Kamu butuh alat bertipe <span className="capitalize font-bold text-red-300">'{toolType.replace('_', ' ')}'</span> dengan durability &gt; 0 (minimal Tier {minToolTier}).</p>
            <p className="mt-2 text-xs text-red-300">Beli tool T1 di <a href="/market" className="underline hover:text-white">Market</a> atau craft sendiri via profesi <a href="/professions/smithing" className="underline hover:text-white">Menempa</a>.</p>
        </div>;
    }

    return (
        <div>
            <label className="block text-sm text-gray-400 mb-2">Pilih Alat</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableTools.map((tool: any) => {
                    const toolTier = tool.itemId?.tier || 1;
                    const isSufficient = toolTier >= minToolTier;

                    return (
                        <div
                            key={tool.itemId._id}
                            onClick={() => {
                                if (isSufficient) onSelect(tool.itemId._id);
                            }}
                            className={`p-3 rounded border transition-colors flex justify-between items-center relative ${
                                !isSufficient
                                    ? 'bg-gray-800/50 border-red-900/50 cursor-not-allowed opacity-60'
                                    : selectedToolId === tool.itemId._id
                                        ? 'bg-amber-900/30 border-amber-500 cursor-pointer'
                                        : 'bg-gray-800 border-gray-700 hover:border-gray-500 cursor-pointer'
                            }`}
                        >
                            <div>
                                <div className="font-bold text-gray-200">{tool.itemId.name}</div>
                                <div className="text-xs text-gray-400 mt-1 capitalize">{tool.itemId.toolType.replace('_', ' ')} (Tier {toolTier})</div>
                                {!isSufficient && (
                                    <div className="text-[10px] text-red-400 font-bold mt-1">Tier tidak mencukupi (Butuh T{minToolTier})</div>
                                )}
                            </div>
                        <div className="text-right flex flex-col justify-end h-full mt-1 w-24">
                            {tool.durability == null ? (
                                <div className="text-[10px] text-green-400 italic text-right">Siap pakai</div>
                            ) : (
                                <div className="flex flex-col items-end w-full">
                                    <div className={`text-xs font-bold mb-1 ${tool.durability < 10 ? 'text-red-400' : 'text-gray-300'}`}>
                                        {tool.durability} / {tool.itemId.maxDurability || '?'}
                                    </div>
                                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${
                                                tool.durability / (tool.itemId.maxDurability || 100) > 0.5 ? 'bg-green-500' :
                                                tool.durability / (tool.itemId.maxDurability || 100) > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.min(100, Math.max(0, (tool.durability / (tool.itemId.maxDurability || 100)) * 100))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1 text-right">Durability</div>
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
    );
}
