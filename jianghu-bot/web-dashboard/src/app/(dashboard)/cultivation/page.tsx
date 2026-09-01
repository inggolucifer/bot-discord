"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Flame, ArrowUpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CultivationPage() {
    const { token } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [cultivationData, setCultivationData] = useState<any>(null);
    const [breakthroughModalOpen, setBreakthroughModalOpen] = useState(false);

    useEffect(() => {
        if (!token) {
            router.push('/auth/login');
            return;
        }
        fetchCultivation();
        const interval = setInterval(fetchCultivation, 60000); // Poll every minute for smooth Qi updates
        return () => clearInterval(interval);
    }, [token]);

    const fetchCultivation = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/cultivation`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setCultivationData(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch cultivation", error);
            // Ignore error for now, handle loading state
        } finally {
            setLoading(false);
        }
    };

    const handleBreakthrough = async (usePill: boolean) => {
        setActionLoading(true);
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/cultivation/breakthrough`,
                { usePill },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                if (res.data.isSuccess) {
                    toast.show({ message: res.data.message, type: 'success' });
                } else {
                    toast.show({ message: res.data.message, type: 'error' });
                }
                setBreakthroughModalOpen(false);
                fetchCultivation(); // Refresh immediately
            }
        } catch (error: any) {
            toast.show({ message: error.response?.data?.error || 'Gagal melakukan terobosan.', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <LoadingState text="Menghubungkan ke Dantian..." />;

    if (!cultivationData) return <EmptyState title="Gagal Memuat" description="Tidak dapat memuat data kultivasi." icon={<Flame size={48} />} />;

    const { realm, stage, currentQi, maxQi, ratePerMinute, isReadyForBreakthrough, baseSuccessRate, isMaxLevel, pill } = cultivationData;
    const progressPercent = Math.min(100, Math.max(0, (currentQi / maxQi) * 100));

    return (
        <div className="space-y-6">
            <PageHeader
                title="Kultivasi Spiritual"
                description="Pantau perkembangan Qi dan lakukan terobosan untuk mencapai Realm yang lebih tinggi."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1 lg:col-span-2 bg-[#111] border-[#c5a880]/30">
                    <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
                        <div className="relative">
                            <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full border-4 border-[#333] flex items-center justify-center relative overflow-hidden bg-black shadow-[0_0_30px_rgba(197,168,128,0.1)]">
                                {/* Water fill effect for Qi */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-blue-500/30 transition-all duration-1000 ease-in-out"
                                    style={{ height: `${progressPercent}%` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#c5a880]/20 to-transparent opacity-50" />
                                <div className="relative z-10 flex flex-col items-center">
                                    <Flame size={48} className="text-[#c5a880] mb-2 animate-pulse" />
                                    <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                                        {Math.floor(currentQi).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-gray-400">/ {maxQi.toLocaleString()} Qi</span>
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-[#1f402e] border border-green-800 rounded-full p-2 text-green-400 text-xs font-bold shadow-lg" title="Qi Generasi">
                                +{ratePerMinute.toFixed(1)}/mnt
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#c5a880] mb-2">{realm}</h2>
                            <p className="text-lg text-gray-300">Tahap {stage}</p>
                            {isMaxLevel && (
                                <p className="text-sm text-yellow-500 mt-2 font-semibold">Puncak Alam Semesta Tercapai!</p>
                            )}
                        </div>

                        <div className="w-full max-w-md mt-4">
                            {!isMaxLevel && (
                                <Button
                                    className="w-full bg-[#1e3a5f] hover:bg-blue-900 border border-blue-800 text-white font-bold py-3 text-lg"
                                    disabled={!isReadyForBreakthrough}
                                    onClick={() => setBreakthroughModalOpen(true)}
                                >
                                    <ArrowUpCircle className="mr-2" />
                                    {isReadyForBreakthrough ? 'Lakukan Terobosan' : 'Qi Belum Mencukupi'}
                                </Button>
                            )}
                            {!isReadyForBreakthrough && !isMaxLevel && (
                                <div className="w-full bg-[#222] rounded-full h-2 mt-4 overflow-hidden border border-[#444]">
                                    <div className="bg-[#c5a880] h-2 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Breakthrough Modal */}
            <Modal
                isOpen={breakthroughModalOpen}
                onClose={() => !actionLoading && setBreakthroughModalOpen(false)}
                title="Konfirmasi Terobosan"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-300">
                        Kamu akan mencoba menerobos batas ke tingkat selanjutnya. Proses ini memiliki risiko kegagalan yang dapat mengurangi Qi kamu secara drastis jika pondasimu tidak stabil.
                    </p>
                    <div className="bg-black/50 border border-[#333] rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Realm Saat Ini:</span>
                            <span className="font-bold text-white">{realm} (Tahap {stage})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Peluang Sukses Dasar:</span>
                            <span className="font-bold text-yellow-500">{baseSuccessRate}%</span>
                        </div>
                    </div>

                    {pill && pill.itemId && (
                        <div className="bg-[#1f402e]/30 border border-green-800 rounded-lg p-4 mt-4">
                            <p className="text-sm text-gray-300 mb-2">Kamu memiliki <span className="font-bold text-green-400">{pill.name}</span> (x{pill.count}). Menggunakan pil ini akan meningkatkan peluang sukses sebesar 25%.</p>
                            <Button
                                onClick={() => handleBreakthrough(true)}
                                disabled={actionLoading || pill.count < 1}
                                className="w-full bg-green-700 hover:bg-green-600 mb-2"
                            >
                                Gunakan Pil & Terobosan
                            </Button>
                        </div>
                    )}

                    <Button
                        onClick={() => handleBreakthrough(false)}
                        disabled={actionLoading}
                        variant="outline"
                        className="w-full"
                    >
                        Terobosan Tanpa Pil
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
