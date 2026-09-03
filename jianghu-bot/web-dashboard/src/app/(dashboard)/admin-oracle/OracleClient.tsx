"use client";

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Eye, ShieldAlert, BarChart3, Users, Crown, Banknote } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OracleClient() {
    const { token, user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!token) {
            router.push('/auth/login');
        }
    }, [token]);

    const { data: oracle, isLoading, isError, error } = useQuery({
        queryKey: ['adminOracle'],
        queryFn: async () => {
            const { data } = await api.get('/admin/oracle');
            return data.data;
        },
        enabled: !!token,
        retry: false
    });

    if (isLoading) return <LoadingState text="Membaca Takdir Dunia (Oracle)..." />;

    if (isError || !oracle) {
        return (
            <div className="space-y-8">
                <PageHeader title="Sistem Oracle" description="Pengawasan Ekonomi & Statistik Server" />
                <EmptyState
                    icon={<ShieldAlert size={48} className="text-red-500" />}
                    title="Akses Ditolak"
                    description={error ? (error as any).response?.data?.error : 'Kamu bukan Developer.'}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <PageHeader
                title="Oracle System"
                description="Mata Para Dewa. Analisis Ekonomi & Distribusi Kekayaan Server."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-[#111] border-[#333]">
                    <CardContent className="p-6 text-center space-y-4">
                        <Users size={48} className="mx-auto text-blue-500" />
                        <h3 className="text-xl font-bold text-gray-300">Populasi Dunia</h3>
                        <div className="flex justify-around mt-4">
                            <div>
                                <p className="text-sm text-gray-500">Total Cultivator</p>
                                <p className="text-3xl font-bold text-white">{oracle.totalPlayers}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Sekte</p>
                                <p className="text-3xl font-bold text-white">{oracle.totalSects}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-[#333]">
                    <CardContent className="p-6 text-center space-y-4">
                        <BarChart3 size={48} className="mx-auto text-yellow-500" />
                        <h3 className="text-xl font-bold text-gray-300">Sirkulasi Uang Beredar</h3>
                        <p className="text-sm text-gray-500">Total Nilai dalam Silver (Estimasi)</p>
                        <p className="text-4xl font-bold text-[#c5a880] font-mono">{Math.round(oracle.totalWealth).toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-[#111] border-[#333]">
                <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Banknote className="text-green-500" /> Distribusi Mata Uang</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-black/50 p-4 rounded border border-[#222] text-center">
                            <p className="text-xs text-gray-400 mb-1">Copper</p>
                            <p className="font-mono font-bold text-yellow-700">{oracle.economy.copper.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/50 p-4 rounded border border-[#222] text-center">
                            <p className="text-xs text-gray-400 mb-1">Silver</p>
                            <p className="font-mono font-bold text-gray-300">{oracle.economy.silver.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/50 p-4 rounded border border-[#222] text-center">
                            <p className="text-xs text-gray-400 mb-1">Gold</p>
                            <p className="font-mono font-bold text-yellow-500">{oracle.economy.gold.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/50 p-4 rounded border border-[#222] text-center">
                            <p className="text-xs text-gray-400 mb-1">Jade</p>
                            <p className="font-mono font-bold text-green-400">{oracle.economy.jade.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/50 p-4 rounded border border-[#222] text-center">
                            <p className="text-xs text-gray-400 mb-1">Spirit</p>
                            <p className="font-mono font-bold text-blue-400">{oracle.economy.spirit.toLocaleString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#111] border-[#333]">
                    <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Crown className="text-yellow-500" /> Top 5 Sekte Terkaya</h3>
                        <div className="space-y-4">
                            {oracle.topSects.map((sect: any, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-black/40 p-3 rounded border border-[#222]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-900 flex items-center justify-center font-bold text-white">{i + 1}</div>
                                        <span className="font-semibold text-gray-200">{sect.name}</span>
                                    </div>
                                    <Badge variant="outline" className="border-yellow-900 text-yellow-500 font-mono">{sect.totalWealth.toLocaleString()} Silver</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-[#333]">
                    <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Crown className="text-[#c5a880]" /> Top 5 Cultivator Terkaya</h3>
                        <div className="space-y-4">
                            {oracle.topPlayers.map((player: any, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-black/40 p-3 rounded border border-[#222]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center font-bold text-white">{i + 1}</div>
                                        <span className="font-semibold text-gray-200">{player.characterName}</span>
                                    </div>
                                    <Badge variant="outline" className="border-[#c5a880]/50 text-[#c5a880] font-mono">{player.totalWealth.toLocaleString()} Silver</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
