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

    const { data: rawData, isLoading: isCultivationLoading } = useQuery<{data: CultivationData}>({
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

    if (!cultivationData) return <EmptyState title="Gagal Memuat" description="Tidak dapat memuat data kultivasi." icon={<Flame size={48} />} />;

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
