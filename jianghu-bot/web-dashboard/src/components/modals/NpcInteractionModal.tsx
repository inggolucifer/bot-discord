'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/lib/store';
import api from '@/lib/api';
import { NpcFullProfile, NpcPlayerRelationData } from '@/types/npc';
import { NpcDialogueScene } from '@/components/npc/NpcDialogueScene';
import { NpcProfilePanel } from '@/components/npc/NpcProfilePanel';
import BattleArena from '@/components/battle/BattleArena';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function NpcInteractionModal() {
  const { activeModal, activeNpcId, npcModalMode, closeModal } = useUIStore();
  const [viewMode, setViewMode] = useState<'dialogue' | 'profile'>('dialogue');
  const [npc, setNpc] = useState<NpcFullProfile | null>(null);
  const [relation, setRelation] = useState<NpcPlayerRelationData | null>(null);
  const [familyData, setFamilyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);

  const isOpen = activeModal === 'npcInteraction' && !!activeNpcId;

  useEffect(() => {
    if (npcModalMode) {
      setViewMode(npcModalMode);
    }
  }, [npcModalMode]);

  useEffect(() => {
    if (isOpen && activeNpcId) {
      fetchNpcData(activeNpcId);
    } else {
      setNpc(null);
      setRelation(null);
      setFamilyData(null);
      setError(null);
      setActiveBattleId(null);
    }
  }, [isOpen, activeNpcId]);

  const fetchNpcData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, relationRes] = await Promise.allSettled([
        api.get(`/npc/profile/${id}`),
        api.get(`/npc/relations/${id}`)
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
        setNpc(profileRes.value.data.npc);
        setRelation(profileRes.value.data.relation);
      } else {
        const errMsg = profileRes.status === 'rejected'
          ? (profileRes.reason?.response?.data?.message || profileRes.reason?.message)
          : 'Data tokoh Jianghu tidak ditemukan.';
        setError(errMsg || 'Gagal memuat profil tokoh.');
      }

      if (relationRes.status === 'fulfilled' && relationRes.value.data?.success) {
        setFamilyData(relationRes.value.data.family || null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal menghubungi tokoh Jianghu.');
    } finally {
      setLoading(false);
    }
  };

  const refreshRelationOnly = async () => {
    if (!activeNpcId) return;
    try {
      const res = await api.get(`/npc/profile/${activeNpcId}`);
      if (res.data?.success) {
        setNpc(res.data.npc);
        setRelation(res.data.relation);
      }
    } catch (err) {
      // Non-blocking refresh
    }
  };

  const handleStartBattle = async (mode: 'npc_spar' | 'npc_duel') => {
    if (!activeNpcId) return;
    try {
      const res = await api.post('/battle/start', {
        targetId: activeNpcId,
        targetType: mode
      });
      if (res.data?.success && res.data.battleId) {
        setActiveBattleId(res.data.battleId);
      } else {
        setError(res.data?.message || 'Gagal memulai pertarungan.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Gagal memicu pertempuran dengan tokoh.');
    }
  };

  if (!isOpen) return null;

  // Active Battle Overlay
  if (activeBattleId) {
    return (
      <BattleArena
        battleId={activeBattleId}
        onBattleEnd={(_result) => {
          setActiveBattleId(null);
          if (activeNpcId) fetchNpcData(activeNpcId);
        }}
      />
    );
  }

  // Loading state
  if (loading && !npc) {
    return (
      <div className="fixed inset-0 z-[99990] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-serif">
        <div className="bg-[#0e121a] border border-amber-600/40 p-6 rounded-xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <h3 className="text-amber-200 text-base font-bold mb-1">Mencari Sosok di Jianghu...</h3>
          <p className="text-xs text-stone-400">Menyelaraskan indra spiritual dengan kehadiran tokoh sekitar.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !npc) {
    return (
      <div className="fixed inset-0 z-[99990] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-serif">
        <div className="bg-[#140e0e] border border-rose-800/60 p-6 rounded-xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center">
          <AlertTriangle className="w-8 h-8 text-rose-400 mb-3" />
          <h3 className="text-rose-200 text-base font-bold mb-1">Sosok Tidak Ditemukan</h3>
          <p className="text-xs text-stone-400 mb-4">{error}</p>
          <button
            onClick={closeModal}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 rounded text-xs transition"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (!npc || !relation) return null;

  // Profile View
  if (viewMode === 'profile') {
    return (
      <NpcProfilePanel
        npc={npc}
        relation={relation}
        familyData={familyData}
        isOpen={true}
        onClose={closeModal}
        onOpenDialogue={() => setViewMode('dialogue')}
      />
    );
  }

  // Dialogue Scene View
  return (
    <NpcDialogueScene
      npc={npc}
      relation={relation}
      isOpen={true}
      onClose={closeModal}
      onOpenProfile={() => setViewMode('profile')}
      onRefreshRelation={refreshRelationOnly}
      onStartBattle={handleStartBattle}
    />
  );
}
