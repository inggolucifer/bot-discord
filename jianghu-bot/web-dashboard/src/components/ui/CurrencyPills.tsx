'use client';
import React from 'react';

export interface CurrencyData {
    copper?: number;
    silver?: number;
    gold?: number;
    jade?: number;
    spirit?: number;
}

export interface CurrencyPillsProps {
    currency?: CurrencyData;
    size?: 'xs' | 'sm' | 'md';
    showZero?: boolean;
    compact?: boolean;
    className?: string;
}

export const CURRENCY_TIERS = [
    { key: 'spirit', emoji: '🔮', label: 'Batu Roh', color: 'border-purple-600/40 text-purple-300' },
    { key: 'jade',   emoji: '💎', label: 'Giok',     color: 'border-emerald-600/40 text-emerald-300' },
    { key: 'gold',   emoji: '🥇', label: 'Emas',     color: 'border-amber-600/40 text-amber-200' },
    { key: 'silver', emoji: '🥈', label: 'Perak',    color: 'border-stone-500/40 text-stone-300' },
    { key: 'copper', emoji: '🟤', label: 'Tembaga',  color: 'border-amber-900/40 text-amber-600' },
] as const;

export function getVisibleCurrencyTiers(currency?: CurrencyData, showZero = false) {
    const c = currency || {};
    const tiers = CURRENCY_TIERS.map(t => ({
        ...t,
        value: Math.max(0, Math.floor(Number((c as any)[t.key]) || 0))
    }));
    if (showZero) return tiers;
    const visible = tiers.filter(t => t.value > 0);
    return visible.length > 0 ? visible : [{ ...tiers[4], value: 0 }]; // fallback: 0 Tembaga
}

export default function CurrencyPills({ currency, size = 'sm', showZero = false, compact = false, className = '' }: CurrencyPillsProps) {
    const visible = getVisibleCurrencyTiers(currency, showZero);
    const textSize = size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-xs' : 'text-sm';
    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            {visible.map(t => (
                <span
                    key={t.key}
                    className={`px-1.5 py-0.5 rounded bg-black/60 border ${t.color} ${textSize} font-mono flex items-center gap-1 shadow-sm select-none`}
                    title={`${t.value.toLocaleString('id-ID')} ${t.label}`}
                >
                    <span>{t.emoji}</span>
                    <span>{compact ? t.value.toLocaleString('id-ID') : `${t.value.toLocaleString('id-ID')} ${t.label}`}</span>
                </span>
            ))}
        </div>
    );
}
