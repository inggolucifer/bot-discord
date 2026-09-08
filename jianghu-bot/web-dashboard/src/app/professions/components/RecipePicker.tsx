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
    materials: Material[];
    output: { name: string; quantity: number };
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
                {recipes.map((recipe) => (
                    <div
                        key={recipe.id}
                        onClick={() => onSelect(recipe.id)}
                        className={`p-3 rounded border cursor-pointer transition-colors ${selectedRecipeId === recipe.id ? 'bg-amber-900/30 border-amber-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
                    >
                        <div className="font-bold text-gray-200">{recipe.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                            Bahan: {recipe.materials.length > 0 ? recipe.materials.map(m => `${m.name} x${m.quantity}`).join(', ') : 'Tidak ada'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Alat: <span className="capitalize">{recipe.toolType.replace('_', ' ')}</span>
                        </div>
                        {recipe.output && (
                            <div className="text-xs text-amber-500/80 mt-1">
                                Hasil: {recipe.output.name} x{recipe.output.quantity}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
