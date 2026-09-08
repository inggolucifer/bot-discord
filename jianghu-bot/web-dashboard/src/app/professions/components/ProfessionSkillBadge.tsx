import React from 'react';

interface ProfessionSkillBadgeProps {
    level: number;
    exp: number;
}

export default function ProfessionSkillBadge({ level, exp }: ProfessionSkillBadgeProps) {
    const maxExp = level * 100;
    const progress = Math.min(100, Math.max(0, (exp / maxExp) * 100));

    return (
        <div className="bg-gray-900 border border-gray-700 rounded p-3 w-full sm:w-auto min-w-[200px]">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-amber-500">Lv. {level}</span>
                <span className="text-xs text-gray-400 font-medium">{exp} / {maxExp} XP</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                    className="bg-amber-500 h-1.5 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
}
