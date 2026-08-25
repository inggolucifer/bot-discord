export const getRarityColor = (rarity: string) => {
  switch (rarity?.toLowerCase()) {
    case 'common': return 'border-gray-600 bg-gray-900/50 hover:border-gray-400';
    case 'uncommon': return 'border-green-600 bg-green-900/20 hover:border-green-400';
    case 'rare': return 'border-blue-500 bg-blue-900/20 hover:border-blue-400';
    case 'epic': return 'border-purple-500 bg-purple-900/20 glow-epic hover:border-purple-400 text-purple-200';
    case 'legendary': return 'border-yellow-500 bg-yellow-900/20 glow-legendary hover:border-yellow-300 text-yellow-200';
    case 'mythical': return 'border-red-500 bg-red-900/20 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:border-red-400 text-red-200';
    default: return 'border-gray-600 bg-gray-900/50 hover:border-gray-400';
  }
};

export const getRarityTextClass = (rarity: string) => {
  switch (rarity?.toLowerCase()) {
    case 'common': return 'text-gray-400';
    case 'uncommon': return 'text-green-400';
    case 'rare': return 'text-blue-400';
    case 'epic': return 'text-purple-400';
    case 'legendary': return 'text-yellow-400 font-bold';
    case 'mythical': return 'text-red-400 font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]';
    default: return 'text-gray-400';
  }
};

export const ranks = ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];
