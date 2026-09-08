import React from 'react';

interface ToolPickerProps {
    inventory: any[];
    toolType: string;
    selectedToolId: string;
    onSelect: (toolId: string) => void;
}

export default function ToolPicker({ inventory, toolType, selectedToolId, onSelect }: ToolPickerProps) {
    if (!toolType) {
        return <div className="text-gray-500 text-sm italic">Pilih resep terlebih dahulu untuk melihat alat yang dibutuhkan.</div>;
    }

    const availableTools = inventory?.filter((item: any) =>
        item.itemId?.toolType === toolType && item.durability > 0
    ) || [];

    if (availableTools.length === 0) {
        return <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900/50">Kamu tidak memiliki alat bertipe '{toolType.replace('_', ' ')}' yang bisa digunakan (durability &gt; 0).</div>;
    }

    return (
        <div>
            <label className="block text-sm text-gray-400 mb-2">Pilih Alat</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableTools.map((tool: any) => (
                    <div
                        key={tool.itemId._id}
                        onClick={() => onSelect(tool.itemId._id)}
                        className={`p-3 rounded border cursor-pointer transition-colors flex justify-between items-center ${selectedToolId === tool.itemId._id ? 'bg-amber-900/30 border-amber-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
                    >
                        <div>
                            <div className="font-bold text-gray-200">{tool.itemId.name}</div>
                            <div className="text-xs text-gray-400 mt-1 capitalize">{tool.itemId.toolType.replace('_', ' ')}</div>
                        </div>
                        <div className="text-right">
                            <div className={`text-sm font-bold ${tool.durability < 10 ? 'text-red-400' : 'text-green-400'}`}>
                                {tool.durability} / {tool.itemId.maxDurability || '?'}
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Durability</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
