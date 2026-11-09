'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '@/lib/store';
import api from '@/lib/api';
import { NpcFullProfile, NpcPlayerRelationData } from '@/types/npc';
import { NpcDialogueScene } from '@/components/npc/NpcDialogueScene';
import { NpcProfilePanel } from '@/components/npc/NpcProfilePanel';
import BattleArena from '@/components/battle/BattleArena';
import '@/components/npc/npcTheme.css';

export default function NpcInteractionModal() {
  const { activeModal, activeNpcId, npcModalMode, closeModal } = useUIStore();
  const [viewMode, setViewMode] = useState<'dialogue' | 'profile'>('dialogue');
  const [npc, setNpc] = useState<NpcFullProfile | null>(null);
  const [relation, setRelation] = useState<NpcPlayerRelationData | null>(null);
  const [familyData, setFamilyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const isOpen = activeModal === 'npcInteraction' && !!activeNpcId;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

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
        const errMsg =
          profileRes.status === 'rejected'
            ? profileRes.reason?.response?.data?.message || profileRes.reason?.message
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

  const handleAction = async (action: string, payload?: any) => {
    if (!activeNpcId) return;
    try {
      const res = await api.post(`/npc/action/${activeNpcId}`, {
        action,
        payload: payload || { amount: 100 }
      });
      if (res.data?.success) {
        await refreshRelationOnly();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memproses aksi interaksi.');
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

  if (!isOpen || !mounted) return null;

  // Active Battle Overlay
  if (activeBattleId) {
    const battleNode = (
      <BattleArena
        battleId={activeBattleId}
        onBattleEnd={(_result) => {
          setActiveBattleId(null);
          if (activeNpcId) fetchNpcData(activeNpcId);
        }}
      />
    );
    return typeof document !== 'undefined' ? createPortal(battleNode, document.body) : battleNode;
  }

  // Loading state
  if (loading && !npc) {
    const loadingNode = (
      <div
        data-npc-root="true"
        className="npc-ui fixed inset-0 z-[99990] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(10, 14, 18, 0.92)' }}
      >
        <div
          className="border p-6 flex flex-col items-center max-w-sm w-full text-center"
          style={{
            backgroundColor: 'var(--npc-night, #0e0f12)',
            borderColor: 'var(--npc-line, #2c2e34)',
            borderRadius: 'var(--npc-radius, 2px)'
          }}
        >
          <div className="text-sm font-medium text-[color:var(--npc-cream,#e8e2d0)] mb-1">
            Mencari Sosok di Jianghu...
          </div>
          <div className="text-xs text-[color:var(--npc-mute,#9a9686)]">
            Menyelaraskan indra spiritual dengan kehadiran tokoh sekitar.
          </div>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(loadingNode, document.body) : loadingNode;
  }

  // Error state
  if (error && !npc) {
    const errorNode = (
      <div
        data-npc-root="true"
        className="npc-ui fixed inset-0 z-[99990] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(10, 14, 18, 0.92)' }}
      >
        <div
          className="border p-6 flex flex-col items-center max-w-sm w-full text-center"
          style={{
            backgroundColor: 'var(--npc-night, #0e0f12)',
            borderColor: 'var(--npc-seal, #a3231f)',
            borderRadius: 'var(--npc-radius, 2px)'
          }}
        >
          <div className="text-sm font-bold text-[color:var(--npc-cream,#e8e2d0)] mb-1">
            Sosok Tidak Ditemukan
          </div>
          <div className="text-xs text-[color:var(--npc-mute,#9a9686)] mb-4">{error}</div>
          <button
            onClick={closeModal}
            className="px-4 py-1.5 text-xs font-medium border transition cursor-pointer"
            style={{
              backgroundColor: 'var(--npc-btn, #cfcfcf)',
              color: 'var(--npc-btn-ink, #1b1b1b)',
              borderColor: 'var(--npc-parchment-edge, #8c8672)',
              borderRadius: 'var(--npc-radius, 2px)'
            }}
          >
            Kembali
          </button>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(errorNode, document.body) : errorNode;
  }

  if (!npc || !relation) return null;

  // Profile View
  const modalContent =
    viewMode === 'profile' ? (
      <NpcProfilePanel
        npc={npc}
        relation={relation}
        familyData={familyData}
        isOpen={true}
        onClose={closeModal}
        onOpenDialogue={() => setViewMode('dialogue')}
        onStartBattle={handleStartBattle}
        onAction={handleAction}
      />
    ) : (
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
