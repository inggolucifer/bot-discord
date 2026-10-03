"use client";

import React, { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import KitabDanHukumAlamView from '@/components/cultivation/KitabDanHukumAlamView';
import { Flame, Layers, BookOpen, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export default function SkillsClient() {
  const { token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('jianghu_token') && !token) {
      router.push('/auth');
    }
  }, [token, router]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['myTechniques'] });
    queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kitab & Jurus"
        description="Koleksi kitab manual bela diri, jurus bawaan hukum semesta, dan manajemen 4 slot loadout tempur."
      />

      {/* Tri-Tab Quick Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0d14]/90 border border-stone-800 p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-serif font-bold text-amber-200">
            Pusat Keilmuan Beladiri & Dao
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/cultivation">
            <Button size="sm" variant="ghost" className="text-xs text-stone-400 hover:text-amber-200 gap-1.5 cursor-pointer">
              <Flame size={14} className="text-orange-400" />
              <span>Kultivasi & Ranah</span>
            </Button>
          </Link>
          <Link href="/skill-tree">
            <Button size="sm" variant="ghost" className="text-xs text-stone-400 hover:text-amber-200 gap-1.5 cursor-pointer">
              <Layers size={14} className="text-indigo-400" />
              <span>Pohon Dao</span>
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="text-xs border-stone-700 hover:border-amber-500/50 text-stone-300 gap-1 cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* RENDER TERPADU KITAB DAN HUKUM ALAM VIEW */}
      <KitabDanHukumAlamView onRefresh={handleRefresh} />
    </div>
  );
}
