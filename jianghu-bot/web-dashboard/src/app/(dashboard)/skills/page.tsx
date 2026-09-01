"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookOpen, Shield, Wind, Droplet, Flame, Mountain, Zap, Sun, Moon, Skull, HeartPulse, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SkillsPage() {
    const { token } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (!token) {
            router.push('/auth/login');
            return;
        }
        fetchProfile();
    }, [token]);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/player/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setProfile(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch profile", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingState text="Memuat Kitab & Hukum Alam..." />;

    if (!profile) return <EmptyState title="Gagal Memuat" description="Tidak dapat memuat data skill." icon={<BookOpen size={48} />} />;

    const { laws = [], manuals = [] } = profile;

    const getElementIcon = (element: string) => {
        switch (element?.toLowerCase()) {
            case 'api': return <Flame size={16} className="text-red-500" />;
            case 'air': return <Droplet size={16} className="text-blue-500" />;
            case 'angin': return <Wind size={16} className="text-teal-400" />;
            case 'tanah': return <Mountain size={16} className="text-yellow-700" />;
            case 'petir': return <Zap size={16} className="text-purple-400" />;
            case 'cahaya': return <Sun size={16} className="text-yellow-400" />;
            case 'kegelapan': return <Moon size={16} className="text-gray-400" />;
            default: return <Shield size={16} className="text-gray-500" />;
        }
    };

    const getEffectIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'damage': return <Flame size={16} className="text-red-500 mr-1" />;
            case 'lifesteal': return <HeartPulse size={16} className="text-pink-500 mr-1" />;
            case 'stun': return <Zap size={16} className="text-yellow-400 mr-1" />;
            case 'poison': return <Skull size={16} className="text-green-500 mr-1" />;
            case 'shield': return <Shield size={16} className="text-blue-400 mr-1" />;
            case 'reflect': return <RefreshCw size={16} className="text-purple-400 mr-1" />;
            case 'cleanse': return <Wind size={16} className="text-teal-400 mr-1" />;
            default: return <BookOpen size={16} className="text-gray-400 mr-1" />;
        }
    };

    const formatEffectType = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'damage': return 'Serangan';
            case 'lifesteal': return 'Lifesteal';
            case 'stun': return 'Stun';
            case 'poison': return 'Racun (DoT)';
            case 'shield': return 'Perisai Qi';
            case 'reflect': return 'Refleksi Serangan';
            case 'cleanse': return 'Pembersih Debuff';
            default: return type || 'Pasif';
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Kitab & Hukum Alam"
                description="Koleksi jurus, manual, dan pemahaman hukum alam semesta yang kamu miliki."
            />

            {/* Laws Section */}
            <section>
                <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                    <Wind className="text-teal-400" size={24} />
                    <h2 className="text-2xl font-serif font-bold text-white">Pemahaman Hukum Alam</h2>
                </div>

                {laws.length === 0 ? (
                    <EmptyState title="Belum Memahami Hukum Alam" description="Kamu belum memahami satupun hukum alam semesta. Cari peluang pencerahan!" icon={<Wind size={40} />} className="py-6" />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {laws.map((law: any) => (
                            <Card key={law._id} className="bg-gradient-to-br from-[#111] to-[#1a1a1a] border-[#c5a880]/30 hover:border-[#c5a880] transition-colors relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <CardContent className="p-5 relative z-10">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-lg font-bold text-[#c5a880] flex items-center gap-2">
                                            {getElementIcon(law.element)}
                                            {law.name}
                                        </h3>
                                        <Badge variant="outline" className="text-xs">{law.element || 'Netral'}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 line-clamp-3">{law.description || 'Tidak ada deskripsi.'}</p>
                                    <div className="bg-black/40 p-3 rounded border border-[#333] text-xs space-y-1">
                                        <div className="text-gray-300 font-semibold mb-1 border-b border-[#444] pb-1">Bonus Atribut:</div>
                                        {law.multiplierBonus?.hp > 0 && <div>+{(law.multiplierBonus.hp * 100).toFixed(0)}% HP</div>}
                                        {law.multiplierBonus?.atk > 0 && <div>+{(law.multiplierBonus.atk * 100).toFixed(0)}% Attack</div>}
                                        {law.multiplierBonus?.def > 0 && <div>+{(law.multiplierBonus.def * 100).toFixed(0)}% Defense</div>}
                                        {law.multiplierBonus?.spd > 0 && <div>+{(law.multiplierBonus.spd * 100).toFixed(0)}% Speed</div>}
                                        {(!law.multiplierBonus || Object.values(law.multiplierBonus).every((v: any) => v === 0)) && <div className="text-gray-500 italic">Pasif tersembunyi.</div>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Manuals Section */}
            <section>
                <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2">
                    <BookOpen className="text-[#c5a880]" size={24} />
                    <h2 className="text-2xl font-serif font-bold text-white">Jurus & Manual</h2>
                </div>

                {manuals.length === 0 ? (
                    <EmptyState title="Tidak Ada Jurus" description="Kamu belum mempelajari satupun jurus bela diri." icon={<BookOpen size={40} />} className="py-6" />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {manuals.map((m: any) => (
                            <Card key={m.id} className="bg-[#111] border-[#333] hover:border-[#c5a880]/50 transition-colors">
                                <CardContent className="p-5 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-white">{m.name}</h3>
                                        <Badge variant="default" className="text-xs">Level {m.level} / {m.maxLevel}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4 flex-grow">{m.description || 'Kitab kuno.'}</p>

                                    <div className="mt-auto pt-4 border-t border-[#333]">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Efek Jurus dalam Pertarungan</h4>
                                        <div className="flex items-center justify-between bg-black/50 border border-[#222] rounded p-3">
                                            <div className="flex items-center">
                                                {getEffectIcon(m.effectType)}
                                                <span className="text-sm font-medium text-gray-200">{formatEffectType(m.effectType)}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400">Peluang Aktif</div>
                                                <div className="text-sm font-bold text-yellow-500">{(m.triggerChance * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
