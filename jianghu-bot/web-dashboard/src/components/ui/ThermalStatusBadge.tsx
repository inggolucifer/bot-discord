'use client';
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Thermometer, Snowflake, Flame, AlertCircle } from 'lucide-react';

interface ThermalStatusBadgeProps {
    temperature?: number;
    initialThermalData?: any;
}

export default function ThermalStatusBadge({ temperature, initialThermalData }: ThermalStatusBadgeProps) {
    const [thermalData, setThermalData] = useState<any>(initialThermalData || null);

    const fetchThermal = async () => {
        try {
            const res = await api.get('/world/zone/thermal-status');
            if (res.data.success) {
                setThermalData(res.data);
            }
        } catch (err) {
            // Silently ignore or fallback
        }
    };

    useEffect(() => {
        if (!initialThermalData) {
            fetchThermal();
        } else {
            setThermalData(initialThermalData);
        }
    }, [initialThermalData]);

    const temp = temperature !== undefined ? temperature : (thermalData?.gridTemperature ?? 22);
    const inComfort = thermalData?.inComfortZone !== false;
    const isFreezing = temp < 0;
    const isScorching = temp > 45;

    let badgeBg = 'bg-black/70 border-gray-700 text-gray-200';
    let icon = <Thermometer className="w-3.5 h-3.5 text-gray-400" />;

    if (isFreezing || thermalData?.breachType === 'cold') {
        badgeBg = 'bg-blue-950/80 border-blue-600/70 text-blue-200 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
        icon = <Snowflake className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />;
    } else if (isScorching || thermalData?.breachType === 'heat') {
        badgeBg = 'bg-red-950/80 border-red-600/70 text-amber-200 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
        icon = <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />;
    } else if (inComfort) {
        badgeBg = 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200';
        icon = <Thermometer className="w-3.5 h-3.5 text-emerald-400" />;
    }

    return (
        <div className="relative group">
            <div className={`px-2.5 py-1 rounded-lg border backdrop-blur-md text-xs font-mono flex items-center gap-1.5 transition-colors cursor-help ${badgeBg}`}>
                {icon}
                <span className="font-bold">{temp}°C</span>
                {!inComfort && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                )}
            </div>

            {/* Hover Tooltip */}
            <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col z-40 bg-[#0c101a] border border-gray-700 p-2.5 rounded-xl shadow-2xl text-[11px] text-gray-300 w-52 pointer-events-none">
                <span className="font-serif font-bold text-amber-300 mb-1">Termodinamika Tubuh</span>
                <span className="text-[10px] text-gray-400">
                    Suhu Nyaman Ranah: {thermalData?.realmLimits?.minTemp ?? 10}°C s/d {thermalData?.realmLimits?.maxTemp ?? 38}°C
                </span>
                {!inComfort && thermalData?.activeCondition && (
                    <span className="text-[10px] text-red-400 font-semibold mt-1">
                        ⚠️ {thermalData.activeCondition}
                    </span>
                )}
                {thermalData?.hasMeridianDamage && (
                    <span className="text-[10px] text-red-500 font-bold mt-0.5">
                        ⚡ Kerusakan Meridian Aktif (-80% EXP)
                    </span>
                )}
            </div>
        </div>
    );
}
