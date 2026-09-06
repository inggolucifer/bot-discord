export const getRarityBorderClass = (rank: string) => {
    switch (rank) {
        case 'Uncommon': return 'border-green-500 hover:border-green-400';
        case 'Rare': return 'border-blue-500 hover:border-blue-400';
        case 'Epic': return 'border-purple-500 hover:border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]';
        case 'Legendary': return 'border-yellow-500 hover:border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.7)]';
        case 'Mythical': return 'border-red-500 hover:border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.9)]';
        case 'Common':
        default: return 'border-gray-500 hover:border-gray-400';
    }
};
