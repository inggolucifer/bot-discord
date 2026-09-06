import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const StatDeltaHover = ({
    itemHovered,
    equippedItem,
    children
}: {
    itemHovered: any,
    equippedItem: any,
    children: React.ReactNode
}) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const calculateDelta = (statName: string) => {
        const hoverStat = itemHovered?.itemId?.[statName] || 0;
        const equippedStat = equippedItem?.itemId?.[statName] || 0;
        return hoverStat - equippedStat;
    };

    const hpDelta = calculateDelta('baseHp');
    const atkDelta = calculateDelta('baseAtk');
    const defDelta = calculateDelta('baseDef');
    const spdDelta = calculateDelta('baseSpd');

    const hasDelta = hpDelta !== 0 || atkDelta !== 0 || defDelta !== 0 || spdDelta !== 0;

    const renderDelta = (val: number, label: string) => {
        if (val === 0) return null;
        const isPositive = val > 0;
        return (
            <div className="flex justify-between text-xs my-0.5">
                <span className="text-gray-400">{label}:</span>
                <span className={isPositive ? 'text-green-400' : 'text-red-400 font-bold'}>
                    {isPositive ? '+' : ''}{val}
                </span>
            </div>
        );
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
            <AnimatePresence>
                {isHovered && hasDelta && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[#111] border border-[#444] rounded-lg shadow-xl p-3 z-50 pointer-events-none"
                    >
                        <div className="text-xs font-bold text-gray-300 border-b border-[#333] pb-1 mb-2 text-center">
                            Stat Preview
                        </div>
                        {renderDelta(hpDelta, 'HP')}
                        {renderDelta(atkDelta, 'ATK')}
                        {renderDelta(defDelta, 'DEF')}
                        {renderDelta(spdDelta, 'SPD')}

                        {/* Triangle pointer */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#444]"></div>
                        <div className="absolute top-[calc(100%-1px)] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#111]"></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
