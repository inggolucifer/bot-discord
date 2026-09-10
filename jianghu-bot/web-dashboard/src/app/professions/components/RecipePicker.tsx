import React from 'react';

interface Material {
    name: string;
    quantity: number;
}

interface Recipe {
    id: string;
    name: string;
    profession: string;
    toolType: string;
    minToolTier?: number;
    materials: Material[];
    output: { name: string; quantity: number; effectInfo?: { type: string; value: number; desc: string } };
    requiresBlueprint?: boolean;
    blueprintKey?: string;
    unlocked?: boolean;
}

interface RecipePickerProps {
    recipes: Recipe[];
    selectedRecipeId: string;
    onSelect: (recipeId: string) => void;
    isLoading?: boolean;
}

export default function RecipePicker({ recipes, selectedRecipeId, onSelect, isLoading }: RecipePickerProps) {
    if (isLoading) {
        return <div className="text-gray-400 text-sm">Memuat resep...</div>;
    }

    if (!recipes || recipes.length === 0) {
        return <div className="text-gray-400 text-sm">Tidak ada resep yang tersedia.</div>;
    }

    return (
        <div>
            <label className="block text-sm text-gray-400 mb-2">Pilih Resep</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recipes.map((recipe) => {
                    const isLocked = recipe.requiresBlueprint && !recipe.unlocked;
                    return (
                    <div
                        key={recipe.id}
                        onClick={() => !isLocked && onSelect(recipe.id)}
                        className={`p-3 rounded border transition-colors ${isLocked ? 'bg-gray-900 border-gray-800 opacity-60 cursor-not-allowed' : selectedRecipeId === recipe.id ? 'bg-amber-900/30 border-amber-500 cursor-pointer' : 'bg-gray-800 border-gray-700 hover:border-gray-500 cursor-pointer'}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="font-bold text-gray-200">{recipe.name}</div>
                            {isLocked && (
                                <span className="inline-block bg-red-900/50 text-red-200 text-[10px] px-1.5 py-0.5 rounded flex-shrink-0">🔒 Terkunci — butuh {recipe.blueprintKey}</span>
                            )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            {recipe.minToolTier ? <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mr-1 ${recipe.minToolTier >= 6 ? 'bg-red-900/50 text-red-200' : recipe.minToolTier === 5 ? 'bg-yellow-900/50 text-yellow-200' : recipe.minToolTier === 4 ? 'bg-purple-900/50 text-purple-200' : recipe.minToolTier === 3 ? 'bg-blue-900/50 text-blue-200' : recipe.minToolTier === 2 ? 'bg-green-900/50 text-green-200' : 'bg-gray-700 text-gray-300'}`}>T{recipe.minToolTier}</span> : <span className="inline-block bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded mr-1">T1</span>}
                            Bahan: {recipe.materials.length > 0 ? recipe.materials.map(m => `${m.name} x${m.quantity}`).join(', ') : 'Tidak ada'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Alat: <span className="capitalize">{recipe.toolType.replace('_', ' ')}</span> (Min Tier {recipe.minToolTier || 1})
                        </div>
                        {recipe.output && (
                            <div className="mt-2 space-y-1">
                                <div className="text-xs font-bold text-amber-500/80">
                                    Hasil: {recipe.output.name} x{recipe.output.quantity}
                                </div>
                                {recipe.output.effectInfo && (
                                    <div className="text-[10px] text-gray-400 bg-gray-900/50 p-1 rounded border border-gray-700/50">
                                        <span className="text-cyan-400">Efek ({recipe.output.effectInfo.type}):</span> {recipe.output.effectInfo.value > 0 ? `+${recipe.output.effectInfo.value}` : ''}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    );
                })}
            </div>
        </div>
    );
}
