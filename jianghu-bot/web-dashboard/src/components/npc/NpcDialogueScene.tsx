'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { NpcFullProfile, NpcPlayerRelationData, DialogueChoice } from '@/types/npc';

interface NpcDialogueSceneProps {
  npc: NpcFullProfile;
  relation: NpcPlayerRelationData;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onRefreshRelation?: () => void;
  onStartBattle?: (mode: 'npc_spar' | 'npc_duel') => void;
}

const ACTION_CHOICES: DialogueChoice[] = [
  // Sosial
  { id: 'chat', label: 'Bicara Santai', icon: '💬', actionType: 'chat', category: 'social' },
  { id: 'inquire', label: 'Tanya Kabar & Petunjuk', icon: '📜', actionType: 'inquire', category: 'social' },
  { id: 'request_favor', label: 'Minta Bantuan', icon: '🤝', actionType: 'request_favor', category: 'social' },

  // Hadiah & Suap
  { id: 'gift', label: 'Beri Hadiah', icon: '🎁', actionType: 'gift', category: 'gift' },
  { id: 'bribe', label: 'Suap Koin Tembaga', icon: '🪙', actionType: 'bribe', category: 'gift' },

  // Beladiri
  { id: 'spar', label: 'Latihan Sparring', icon: '⚔️', actionType: 'spar', category: 'martial' },
  { id: 'duel', label: 'Tantang Duel Hidup-Mati', icon: '💀', actionType: 'duel', category: 'martial' },

  // Hubungan Khusus
  { id: 'recruit', label: 'Ajak Berpetualang', icon: '🏕️', actionType: 'recruit', category: 'special' },
  { id: 'confess', label: 'Ungkapkan Perasaan', icon: '💌', actionType: 'confess', category: 'special' },
  { id: 'propose', label: 'Lamar Pasangan Dao', icon: '💍', actionType: 'propose', category: 'special' },
  { id: 'adopt', label: 'Angkat Murid Perguruan', icon: '🥋', actionType: 'adopt', category: 'special' },
  { id: 'divorce', label: 'Putus Ikatan Pasangan Dao', icon: '💔', actionType: 'divorce', category: 'special' },
  { id: 'break_relations', label: 'Putus Hubungan', icon: '✂️', actionType: 'break_relations', category: 'special' },

  // Intrik
  { id: 'steal', label: 'Copet Diam-diam', icon: '🧤', actionType: 'steal', category: 'intrigue' },
  { id: 'threaten', label: 'Ancam & Peras', icon: '🗡️', actionType: 'threaten', category: 'intrigue' }
];

export const NpcDialogueScene: React.FC<NpcDialogueSceneProps> = ({
  npc,
  relation,
  isOpen,
  onClose,
  onOpenProfile,
  onRefreshRelation,
  onStartBattle
}) => {
  const [activeCategory, setActiveCategory] = useState<'social' | 'gift' | 'martial' | 'special' | 'intrigue'>('social');
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [currentAffinity, setCurrentAffinity] = useState<number>(relation.affinity);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fullTextRef = useRef<string>('');

  const isAlive = npc.vitalStatus?.isAlive !== false;
  const initialGreeting = !isAlive
    ? `Sosok ${npc.name} telah wafat di dunia persilatan. Jasadnya telah bersemayam dalam ketenangan abadi.`
    : (npc.greeting || `Salam, pengelana. Saya ${npc.name}, ${npc.title || 'Warga'} dari ${npc.settlementName}. Ada yang bisa kubantu?`);

  // Typewriter text effect
  const typeText = (fullText: string) => {
    fullTextRef.current = fullText;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setIsTyping(true);
    setDisplayedText('');

    let charIdx = 0;
    typingTimerRef.current = setInterval(() => {
      if (charIdx < fullText.length) {
        setDisplayedText(fullText.slice(0, charIdx + 1));
        charIdx++;
      } else {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsTyping(false);
      }
    }, 18);
  };

  const skipTyping = () => {
    if (isTyping && typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      setDisplayedText(fullTextRef.current);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentAffinity(relation.affinity);
      typeText(initialGreeting);
    }
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [isOpen, npc._id]);

  if (!isOpen) return null;

  const handleActionClick = async (choice: DialogueChoice) => {
    if (loadingAction) return;

    if (isTyping) {
      skipTyping();
      return;
    }

    // Special quick navigation
    if (choice.actionType === 'spar' && onStartBattle) {
      onStartBattle('npc_spar');
      return;
    }
    if (choice.actionType === 'duel' && onStartBattle) {
      onStartBattle('npc_duel');
      return;
    }

    try {
      setLoadingAction(true);
      const res = await api.post(`/npc/action/${npc._id}`, {
        action: choice.actionType,
        payload: { amount: 100 }
      });

      if (res.data.success) {
        if (res.data.newAffinity !== undefined) {
          setCurrentAffinity(res.data.newAffinity);
        }
        typeText(res.data.message);
        if (onRefreshRelation) onRefreshRelation();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Gagal memproses aksi interaksi.';
      typeText(errMsg);
    } finally {
      setLoadingAction(false);
    }
  };

  const getAffinityColor = (aff: number) => {
    if (aff >= 80) return 'text-purple-400 border-purple-500/50 bg-purple-950/60';
    if (aff >= 50) return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/60';
    if (aff >= 20) return 'text-cyan-400 border-cyan-500/50 bg-cyan-950/60';
    if (aff >= 0) return 'text-stone-300 border-stone-600/50 bg-stone-900/60';
    if (aff >= -20) return 'text-amber-400 border-amber-600/50 bg-amber-950/60';
    return 'text-rose-500 border-rose-600/50 bg-rose-950/60';
  };

  const currentChoices = ACTION_CHOICES.filter(c => c.category === activeCategory);

  return (
    <div className="fixed inset-0 z-[99990] bg-black/85 backdrop-blur-md flex flex-col justify-between overflow-hidden font-serif select-none">
      {/* Top Header Bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-[#3d2b1f]/60 bg-gradient-to-b from-[#140e0a]/90 to-transparent">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🏮</span>
          <div>
            <h2 className="text-[#c5a880] text-lg font-bold tracking-wider">{npc.name}</h2>
            <p className="text-xs text-stone-400">{npc.title} • {npc.settlementName} ({npc.buildingName})</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded border text-xs font-mono font-bold ${getAffinityColor(currentAffinity)}`}>
            Afinitas: {currentAffinity > 0 ? `+${currentAffinity}` : currentAffinity}/100
          </div>
          <button
            onClick={onOpenProfile}
            className="px-3 py-1.5 bg-[#251912] hover:bg-[#3d2b1f] border border-[#5a3f2d] text-[#e8d5b5] rounded text-xs transition"
          >
            📋 Buka Profil 7-Tab
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded text-xs transition"
          >
            ✕ Tutup
          </button>
        </div>
      </div>

      {/* Main Character Stage (Portrait + Atmospheric Backdrop) */}
      <div className="flex-1 flex items-center justify-center relative p-4">
        <div className="relative flex flex-col items-center">
          {/* Spiritual Aura Ring */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-amber-600/20 via-cyan-600/10 to-transparent blur-xl pointer-events-none animate-pulse" />

          {/* NPC Portrait / Visual Archetype */}
          <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-[#5a3f2d] overflow-hidden bg-[#12161f] shadow-2xl relative flex items-center justify-center">
            {npc.portraitUrl ? (
              <img src={npc.portraitUrl} alt={npc.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl sm:text-7xl">
                {npc.gender === 'female' ? '🧝‍♀️' : '🥷'}
              </span>
            )}
          </div>

          <div className="mt-3 px-3 py-0.5 bg-[#17110d]/90 border border-[#3d2b1f] rounded-full text-xs text-[#c5a880] font-mono tracking-wider">
            Ranah Tingkat {npc.cultivation.realmIndex} (Tahap {npc.cultivation.stage})
          </div>
        </div>
      </div>

      {/* Bottom Dialogue Box (Dark Ink Silk Scroll) */}
      <div className="w-full max-w-4xl mx-auto px-4 pb-6">
        <div className="bg-[#0e1219]/95 border-2 border-[#3d2b1f] rounded-lg shadow-2xl overflow-hidden backdrop-blur-lg flex flex-col">
          {/* NPC Speaker Tag */}
          <div className="px-5 py-2.5 bg-gradient-to-r from-[#211610] via-[#2d1e15] to-[#211610] border-b border-[#3d2b1f] flex items-center justify-between">
            <span className="text-[#f3e5ab] text-sm font-bold tracking-wide">
              {npc.name}
            </span>
            <span className="text-[11px] text-stone-400 italic">
              Kepribadian: {npc.personality.primary.toUpperCase()}
            </span>
          </div>

          {/* Typewriter Dialogue Text Area */}
          <div
            onClick={skipTyping}
            className="p-5 min-h-[90px] text-sm sm:text-base text-stone-200 leading-relaxed font-sans cursor-pointer hover:bg-white/[0.02] transition"
            title={isTyping ? 'Klik untuk lewati animasi teks' : undefined}
          >
            {displayedText}
            {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-amber-400 animate-ping" />}
          </div>

          {/* Category Tabs */}
          <div className="px-4 py-1.5 bg-[#090c10] border-t border-[#231b14] flex space-x-1.5 overflow-x-auto text-xs">
            {[
              { key: 'social', label: 'Sosial', icon: '💬' },
              { key: 'gift', label: 'Hadiah', icon: '🎁' },
              { key: 'martial', label: 'Beladiri', icon: '⚔️' },
              { key: 'special', label: 'Ikatan', icon: '💍' },
              { key: 'intrigue', label: 'Intrik', icon: '🧤' }
            ].map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key as any)}
                className={`px-3 py-1 rounded transition text-xs flex items-center space-x-1 ${
                  activeCategory === cat.key
                    ? 'bg-[#3d2b1f] text-[#f3e5ab] font-bold shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#1a1410]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Action Choice Buttons */}
          <div className="p-3 bg-[#0d1017] border-t border-[#231b14] grid grid-cols-2 sm:grid-cols-3 gap-2">
            {!isAlive ? (
              <div className="col-span-full py-3 text-center text-xs text-rose-400/90 italic font-serif">
                Sosok ini telah berpulang ke haribaan semesta. Tiada lagi interaksi fana yang dapat dilakukan.
              </div>
            ) : (
              currentChoices.map(choice => (
                <button
                  key={choice.id}
                  onClick={() => handleActionClick(choice)}
                  disabled={loadingAction}
                  className="px-3 py-2 bg-[#171d27]/90 hover:bg-[#252f3f] border border-[#2d2218] hover:border-[#5a3f2d] text-stone-200 rounded text-xs flex items-center space-x-2 transition disabled:opacity-50 text-left"
                >
                  <span className="text-base">{choice.icon}</span>
                  <span className="truncate">{choice.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NpcDialogueScene;
