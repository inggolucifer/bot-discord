'use client';

import React, { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { NPC_FIXTURE, RELATION_FIXTURE } from './fixture';
import { NpcDialogueScene } from '@/components/npc/NpcDialogueScene';
import { NpcProfilePanel } from '@/components/npc/NpcProfilePanel';
import '@/components/npc/npcTheme.css';

export default function NpcPreviewDevPage() {
  // Production guard
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [viewMode, setViewMode] = useState<'dialogue' | 'profile'>('dialogue');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'profile' || v === 'dialogue') {
        setViewMode(v);
      }
    }
  }, []);

  if (!mounted) {
    return (
      <div className="w-screen h-screen bg-[#070a14] flex items-center justify-center text-stone-400 text-sm">
        Memuat Pratinjau Tokoh...
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#070a14] relative">
      {/* Dev Switcher Header */}
      <div className="fixed top-2 left-2 z-[99999] flex items-center gap-2 bg-[#0e0f12]/90 border border-[#2c2e34] px-2 py-1 text-xs text-[#e8e2d0]">
        <span className="font-semibold text-amber-300">DEV PREVIEW:</span>
        <button
          onClick={() => setViewMode('dialogue')}
          className={`px-2 py-0.5 border ${
            viewMode === 'dialogue'
              ? 'bg-[#d8d2c0] text-[#1b1b1b] border-[#8c8672]'
              : 'bg-[#17181c] text-[#e8e2d0] border-[#2c2e34]'
          }`}
        >
          Dialog VN (?view=dialogue)
        </button>
        <button
          onClick={() => setViewMode('profile')}
          className={`px-2 py-0.5 border ${
            viewMode === 'profile'
              ? 'bg-[#d8d2c0] text-[#1b1b1b] border-[#8c8672]'
              : 'bg-[#17181c] text-[#e8e2d0] border-[#2c2e34]'
          }`}
        >
          Panel Profil 5 Pilar (?view=profile)
        </button>
      </div>

      {viewMode === 'dialogue' ? (
        <NpcDialogueScene
          npc={NPC_FIXTURE}
          relation={RELATION_FIXTURE}
          isOpen={true}
          onClose={() => setViewMode('profile')}
          onOpenProfile={() => setViewMode('profile')}
        />
      ) : (
        <NpcProfilePanel
          npc={NPC_FIXTURE}
          relation={RELATION_FIXTURE}
          isOpen={true}
          onClose={() => setViewMode('dialogue')}
          onOpenDialogue={() => setViewMode('dialogue')}
        />
      )}
    </div>
  );
}
