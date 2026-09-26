"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import BreakthroughAnimation from '@/components/BreakthroughAnimation';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { Flame } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CultivationData, BreakthroughResponse } from '@/lib/schemas';
import { AxiosError } from 'axios';
import LawCultivationTab from '@/components/cultivation/LawCultivationTab';

export default function CultivationClient() {
    const { token } = useAuthStore();
    const router = useRouter();
    const [showBreakthroughAnim, setShowBreakthroughAnim] = useState(false);
    const [breakthroughResult, setBreakthroughResult] = useState<any>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('jianghu_token') && !token) {
             // Let middleware/auth logic handle redirect
        }
    }, [token]);

    const { data: rawData, isLoading: isCultivationLoading, error: cultivationError, refetch } = useQuery<{data: CultivationData}>({
        queryKey: ['cultivation'],
        queryFn: async () => {
            const { data } = await api.get('/cultivation');
            return data;
        },
        enabled: !!token,
        refetchInterval: 60000
    });

    const cultivationData: CultivationData = rawData?.data || (rawData as any);

    if (isCultivationLoading) return <LoadingState text="Menghubungkan ke Dantian..." />;

    if (!cultivationData) {
        const errorMsg = (cultivationError as any)?.response?.data?.error || (cultivationError as any)?.message || "Tidak dapat memuat data kultivasi.";
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <EmptyState title="Gagal Memuat" description={errorMsg} icon={<Flame size={48} />} />
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 rounded-xl bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-600/50 text-xs font-serif font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                    🔄 Coba Muat Ulang Dantian
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <BreakthroughAnimation isVisible={showBreakthroughAnim} onClose={() => { setShowBreakthroughAnim(false); setBreakthroughResult(null); }} />
            <PageHeader
                title="Kultivasi & Hukum Semesta"
                description="Pantau perkembangan kultivasi spiritual, pelajari Hukum Semesta, dan lakukan terobosan tingkat tinggi."
            />

            {/* Render LawCultivationTab langsung — TANPA Tab 1/Tab 2 */}
            {/* Jika belum punya Law → galeri 15 Law. Jika sudah → dashboard terpadu. */}
            <LawCultivationTab
                realmData={cultivationData}
            />
        </div>
    );
}
