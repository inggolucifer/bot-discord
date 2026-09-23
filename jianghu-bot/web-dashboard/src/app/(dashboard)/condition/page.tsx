'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Loader2, ShieldAlert, RefreshCw, Heart, Zap, Activity } from 'lucide-react';
import ConditionTab from '@/components/character/ConditionTab';
import { PlayerProfile } from '@/types/game';

export default function ConditionPage() {
  const queryClient = useQueryClient();

  const { data: profileData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['player-profile-private'],
    queryFn: async () => {
      const res = await api.get('/player/profile');
      return res.data.data;
    }
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['player-profile-private'] });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] flex-col items-center justify-center gap-3 text-amber-200">
        <Loader2 size={36} className="animate-spin text-amber-400" />
        <p className="font-serif tracking-wider text-sm">Menyelaraskan Qi dan Meridian Karakter...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center bg-[#151117] border border-rose-900/60 rounded-xl shadow-xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-serif font-bold text-rose-300 mb-1">Gagal Memuat Kondisi Tubuh</h2>
        <p className="text-xs text-stone-400 mb-4">Terjadi kendala saat menghubungkan meridian ke server Jianghu.</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 rounded-lg text-xs font-serif font-bold text-rose-200 transition-all"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  const profile: any = profileData.player ?? profileData;
  const characterName = profile?.characterName || 'Pendekar Fana';
  const realm = profile?.systemCultivation?.realm || 'Fondasi Fana';
  const stage = profile?.systemCultivation?.stage || 0;
  const currentHp = Math.floor(profile?.stats?.hp ?? profile?.combatStats?.hp ?? 100);
  const maxHp = Math.floor(profile?.stats?.maxHp ?? profile?.combatStats?.maxHp ?? 100);
  const currentStamina = Math.floor(profile?.stats?.stamina ?? profile?.energy?.current ?? 100);
  const maxStamina = Math.floor(profile?.stats?.maxStamina ?? profile?.maxEnergy ?? 100);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#171a24] via-[#121622] to-[#171a24] border border-[#c5a880]/30 rounded-xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#2a2217] to-[#141824] border border-[#c5a880]/60 flex items-center justify-center shadow-inner shrink-0">
            <ShieldAlert className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#c5a880] tracking-wide">
                Kondisi Tubuh & Status Meridian
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/50 text-[10px] font-mono text-amber-300">
                Authoritative Status
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Pantau 8 kondisi tubuh, efek pertempuran, penalti luka dalam, dan pulihkan dantian dengan obat-obatan herbal.
            </p>
          </div>
        </div>

        {/* Right Status Snapshot & Refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-[#2d3548]">
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1 rounded bg-[#0d1017] border border-stone-800 text-stone-300 flex items-center gap-1.5">
              <span className="text-amber-400">👤 {characterName}</span>
              <span className="text-stone-500">|</span>
              <span className="text-amber-300/90">{realm} Tk.{stage}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 flex items-center gap-1">
              <Heart size={12} className="text-emerald-400" />
              <span>{currentHp}/{maxHp}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-900/60 text-amber-300 flex items-center gap-1">
              <Zap size={12} className="text-amber-400" />
              <span>{currentStamina}/{maxStamina}</span>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isFetching}
            title="Muat Ulang Status"
            className="p-2 rounded-lg bg-[#181d2a] hover:bg-[#232b3d] border border-stone-700 hover:border-amber-500/60 text-stone-300 hover:text-amber-200 transition-all shrink-0"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin text-amber-400' : ''} />
          </button>
        </div>
      </div>

      {/* Main Condition Tab Component Content */}
      <div className="bg-gradient-to-b from-[#11141d] to-[#0d0f16] border border-[#c5a880]/30 rounded-xl p-4 sm:p-6 shadow-2xl">
        <ConditionTab player={profile} onRefresh={handleRefresh} />
      </div>

    </div>
  );
}
