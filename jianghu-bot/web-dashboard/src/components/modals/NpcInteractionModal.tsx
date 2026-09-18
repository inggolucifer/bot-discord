'use client';

import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/lib/store';
import api from '@/lib/api';
import { 
  X, MessageSquare, Gift, Swords, Shield, HeartHandshake, UserPlus, 
  HelpCircle, Compass, RefreshCw, AlertTriangle, Skull, Sparkles, BookOpen,
  Award, Heart, Users, ShieldCheck, UserCheck, Flame
} from 'lucide-react';
import AlignmentBar from '@/components/character/AlignmentBar';
import FallbackImage from '@/components/FallbackImage';
import { GLOBAL_ASSETS } from '@/config/globalAssets';

// Sesuai Instruksi User: Hanya tab 'stats', 'family', dan 'social' yang dipertahankan
type NpcTab = 'stats' | 'family' | 'social';

export default function NpcInteractionModal() {
  const { activeModal, activeNpcId, setActiveNpcId, closeModal } = useUIStore();
  const [activeTab, setActiveTab] = useState<NpcTab>('stats');
  const [npcData, setNpcData] = useState<any>(null);
  const [nearbyNpcs, setNearbyNpcs] = useState<any[]>([]);
  const [dialogHistory, setDialogHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isConfirmingHostile, setIsConfirmingHostile] = useState<'theft' | 'attack' | null>(null);

  const isOpen = activeModal === 'npcInteraction' && !!activeNpcId;

  useEffect(() => {
    if (isOpen && activeNpcId) {
      fetchNpcDetails(activeNpcId);
      fetchNearbyNpcs();
    }
  }, [isOpen, activeNpcId]);

  const fetchNpcDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      const res = await api.get(`/world/npc/${id}`);
      if (res.data?.npc) {
        setNpcData(res.data.npc);
      } else {
        setError('Data tokoh Jianghu tidak ditemukan.');
      }

      // Initial greeting talk
      try {
        const talkRes = await api.post(`/world/npc/${id}/talk`, {});
        if (talkRes.data?.message) {
          setDialogHistory([talkRes.data.message]);
        }
      } catch (talkErr) {
        // Fallback greeting
        setDialogHistory(['Salam kenal, rekan sesama pengelana dunia persilatan.']);
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyapa tokoh Jianghu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyNpcs = async () => {
    try {
      const res = await api.get('/world/people');
      if (res.data?.success && res.data?.data) {
        const npcs = res.data.data.npcs || [];
        setNearbyNpcs(npcs);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  const handleAction = async (actionType: string) => {
    if (!activeNpcId) return;
    setActionMessage(null);
    try {
      if (actionType === 'talk') {
        const res = await api.post(`/world/npc/${activeNpcId}/talk`, {});
        const msg = res.data?.message || npcData?.greeting || 'NPC tersenyum ramah dan mengangguk.';
        setDialogHistory(prev => [msg, ...prev.slice(0, 3)]);
        setActionMessage(`💬 ${npcName}: "${msg}"`);
      } else if (actionType === 'gift') {
        setActionMessage('🎁 Kamu mempersembahkan teh harum dan batu giok. Hubungan meningkat (+15 Poin)!');
      } else if (actionType === 'spar') {
        setActionMessage('⚔️ NPC menerima tantangan bertarung latih santai untuk menguji pemahaman Dao!');
      } else if (actionType === 'bond') {
        setActionMessage('🤝 Membina hubungan persaudaraan yang erat dengan tokoh ini.');
      } else if (actionType === 'dualCultivation') {
        setActionMessage('☯️ Duduk bersila bersama menyelaraskan sirkulasi Qi langit dan bumi.');
      } else if (actionType === 'debate') {
        setActionMessage('📜 Bertukar argumen tentang hukum semesta dan kitab suci.');
      } else if (actionType === 'request') {
        setActionMessage('🙏 Memohon bimbingan atau bantuan dari tokoh.');
      } else if (actionType === 'invite') {
        setActionMessage('🗺️ Mengajak tokoh untuk berkelana bersama melintasi Jianghu.');
      } else {
        setActionMessage(`Aksi [${actionType}] berhasil dilakukan.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || `Gagal mengeksekusi aksi ${actionType}.`);
    }
  };

  const handleHostileAction = (type: 'theft' | 'attack') => {
    setIsConfirmingHostile(type);
  };

  const executeHostileAction = async () => {
    if (!isConfirmingHostile || !activeNpcId) return;
    const type = isConfirmingHostile;
    setIsConfirmingHostile(null);
    try {
      if (type === 'attack') {
        setActionMessage('⚔️ Menghunus senjata! Pertarungan hidup mati dipicu...');
      } else {
        setActionMessage('🧤 Mencoba merogoh kantong qiankun target... Target menatap tajam penuh curiga!');
      }
    } catch (err: any) {
      setError('Aksi bermusuhan gagal.');
    }
  };

  if (!isOpen) return null;

  // Hanya 3 Tab yang Dipertahankan
  const tabs: { key: NpcTab; label: string; icon: any }[] = [
    { key: 'stats', label: 'Stats', icon: UserCheck },
    { key: 'family', label: 'Family', icon: Users },
    { key: 'social', label: 'Social', icon: HeartHandshake }
  ];

  const npcName = npcData?.name || 'Tokoh Jianghu';
  const npcSect = npcData?.sect || 'Sacred Spirit Sect Yun Mo Branch';
  const npcPosition = npcData?.position || npcData?.title || 'Tetua (Elder)';
  const npcRealm = npcData?.realm || 'Nascent Soul (VI) Late';
  const npcSex = npcData?.gender || npcData?.sex || 'Perempuan';
  const npcRace = npcData?.race || 'Manusia (Human)';
  const npcCharisma = npcData?.charisma || 'Ilahi (Divine)';
  const npcReputation = npcData?.reputation || 'Termasyhur (Renowned)';
  const npcInterests = npcData?.interests || ['Bambu Kuno', 'Seruling Xiao', 'Kaligrafi Kitab'];
  
  // Status Hubungan
  const relationship = npcData?.relationship || 'Stranger';
  const relationshipPoints = Math.floor(Number(npcData?.relationshipPoints) || 15);
  const npcAlignment = npcData?.alignment || { righteous: 200, demonic: 100 };

  // Resolve standing full-body art from GLOBAL_ASSETS.npcs
  const standingArtUrl = 
    (GLOBAL_ASSETS.npcs as any)?.[npcName] ||
    (activeNpcId && (GLOBAL_ASSETS.npcs as any)?.[activeNpcId]) ||
    (npcData?.slug && (GLOBAL_ASSETS.npcs as any)?.[npcData.slug]) ||
    npcData?.standingImageUrl ||
    (npcSex === 'Perempuan' || npcSex === 'Wanita'
      ? ((GLOBAL_ASSETS.npcs as any)?.['default_standing_female'] || (GLOBAL_ASSETS.npcs as any)?.['Xi Hua'])
      : ((GLOBAL_ASSETS.npcs as any)?.['default_standing_male'] || GLOBAL_ASSETS.ui_panels?.npc_default_male)) ||
    npcData?.avatarUrl ||
    '';

  // Custom Wuxia Standing Silhouette & Halo Fallback Node
  const standingFallbackNode = (
    <div className="w-full h-full min-h-[260px] sm:min-h-[300px] flex flex-col items-center justify-center bg-gradient-to-b from-[#131826] via-[#0c101a] to-[#07090f] p-4 relative overflow-hidden select-none">
      <div className="absolute w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
      <div className="absolute w-28 h-28 rounded-full bg-amber-500/15 blur-xl" />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-900/50 to-[#101420] border-2 border-amber-500/70 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(245,158,11,0.35)] mb-3">
          {npcSex === 'Perempuan' || npcSex === 'Wanita' ? '🧝‍♀️' : '🧙‍♂️'}
        </div>
        <div className="px-3 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs font-serif font-bold tracking-wider shadow-sm">
          {npcName}
        </div>
        <div className="text-[11px] text-stone-400 mt-1">
          {npcPosition}
        </div>
        <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">
          {npcRealm}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      onClick={closeModal}
    >
      {/* Ancient Dark Scroll Frame */}
      <div 
        className="relative w-full max-w-6xl max-h-[96vh] sm:max-h-[92vh] bg-[#0c0f17] border-2 border-[#574730] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-[#d9ceb8] font-serif"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 40px rgba(197, 168, 128, 0.25), inset 0 0 60px rgba(0,0,0,0.9)'
        }}
      >
        {/* Top Row: Nearby NPCs Scrollable Avatars */}
        <div className="bg-[#121622] border-b border-[#3d3322] px-3 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1 flex-1 pr-4">
            <span className="text-[11px] text-stone-400 font-sans uppercase tracking-wider shrink-0 mr-1">
              Tokoh Sekitar:
            </span>
            {nearbyNpcs.length > 0 ? (
              nearbyNpcs.map((n) => {
                const isSelected = n._id === activeNpcId;
                return (
                  <button
                    key={n._id}
                    onClick={() => setActiveNpcId(n._id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs whitespace-nowrap transition-all shrink-0 ${
                      isSelected 
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                        : 'bg-[#181d29] border-[#2e374a] text-stone-300 hover:border-amber-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span>{n.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md border bg-amber-950/80 border-amber-500 text-amber-200 text-xs">
                  {npcName} (Sedang Bicara)
                </span>
              </div>
            )}
          </div>

          <button 
            onClick={closeModal}
            className="p-1 rounded-full bg-[#241c13] hover:bg-rose-900 border border-[#5a4325] text-amber-200 hover:text-white transition-all shadow-md shrink-0"
            title="Tutup Panel Interaksi"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: Full-Body Standing Portrait, Relationship Status & Action Command Column */}
          <div className="w-full md:w-64 lg:w-72 bg-[#090b11] border-b md:border-b-0 md:border-r border-[#382f20] p-3 flex flex-col justify-between overflow-y-auto custom-scrollbar shrink-0">
            <div>
              {/* NPC Full-Body Standing Art Container */}
              <div className="relative w-full aspect-[9/14] max-h-72 sm:max-h-80 rounded-lg overflow-hidden border-2 border-[#52442d] bg-[#0d111a] mb-2.5 shadow-inner group">
                <FallbackImage
                  src={standingArtUrl}
                  alt={npcName}
                  fallbackNode={standingFallbackNode}
                  className="w-full h-full object-contain object-bottom"
                />
                
                {/* Relationship Badge Top-Right (Sesuai Gambar 4: Stranger / Sahabat) */}
                <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-black/85 border border-amber-500/70 text-amber-200 text-[11px] font-sans font-semibold flex items-center gap-1 shadow-md">
                  <Heart size={11} className={relationship === 'Sahabat' || relationship === 'Friend' ? 'text-rose-400 fill-rose-400' : 'text-stone-400'} />
                  <span>{relationship === 'Friend' || relationship === 'Sahabat' ? 'Sahabat' : 'Stranger'}</span>
                </div>

                {/* NPC Standing Art Indicator */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-stone-700 text-stone-400 text-[9px] font-sans">
                  Tokoh Berdiri
                </div>
              </div>

              {/* Affinity / Keakraban Progress Bar */}
              <div className="mb-2.5 px-1">
                <div className="flex justify-between items-center text-[10px] text-stone-400 mb-0.5 font-sans">
                  <span className="flex items-center gap-1">
                    <HeartHandshake size={11} className="text-rose-400" />
                    Tingkat Keakraban
                  </span>
                  <span className="text-amber-300 font-mono font-semibold">{relationshipPoints} / 100</span>
                </div>
                <div className="w-full bg-[#1b2230] rounded-full h-1.5 overflow-hidden border border-[#2d384c]">
                  <div 
                    className="bg-gradient-to-r from-rose-600 to-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, relationshipPoints))}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons (Social Actions: Sapa & Beri Hadiah) */}
              <div className="grid grid-cols-2 gap-2 text-xs font-serif">
                <button 
                  onClick={() => handleAction('talk')}
                  className="py-2 px-3 rounded-lg bg-[#181e2b] hover:bg-[#252f44] border border-[#38435d] text-stone-200 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                >
                  <MessageSquare size={14} className="text-sky-400" /> Sapa (Talk)
                </button>
                <button 
                  onClick={() => handleAction('gift')}
                  className="py-2 px-3 rounded-lg bg-[#181e2b] hover:bg-[#252f44] border border-[#38435d] text-stone-200 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                >
                  <Gift size={14} className="text-amber-400" /> Hadiah (Gift)
                </button>
              </div>

              {/* Hostile Actions */}
              <div className="mt-2.5 pt-2 border-t border-[#262117] grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => handleHostileAction('theft')}
                  className="py-1.5 px-2 rounded-lg bg-[#2a1315] hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 flex items-center justify-center gap-1 transition-all"
                >
                  🧤 Curi (Theft)
                </button>
                <button 
                  onClick={() => handleHostileAction('attack')}
                  className="py-1.5 px-2 rounded-lg bg-gradient-to-r from-red-950 to-rose-900 hover:from-red-900 hover:to-rose-800 border border-red-600 text-red-100 flex items-center justify-center gap-1 font-semibold transition-all shadow-md"
                >
                  <Skull size={14} className="text-red-400" /> Serang!
                </button>
              </div>
            </div>

            {/* Alignment Bar Bottom Left */}
            <div className="mt-2.5 pt-2 border-t border-[#2a2418]">
              <AlignmentBar 
                righteous={Math.floor(Number(npcAlignment.righteous) || 200)} 
                demonic={Math.floor(Number(npcAlignment.demonic) || 100)} 
                compact 
              />
            </div>
          </div>

          {/* Right Panel: Tabs and Detailed Information */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#131722] via-[#0d1017] to-[#080a0f]">
            
            {/* Top Tabs: HANYA Stats, Family, Social */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#3b3223] overflow-x-auto custom-scrollbar shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-1.5 rounded-t-lg font-serif text-xs font-semibold whitespace-nowrap transition-all border-t border-x flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-[#1b212f] text-amber-300 border-[#574730] border-b-transparent shadow-sm' 
                        : 'bg-transparent text-stone-400 border-transparent hover:text-stone-200'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-amber-400' : 'text-stone-500'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Notification messages */}
            {actionMessage && (
              <div className="mx-4 mt-2 p-2 rounded bg-emerald-950/80 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in shrink-0">
                <Sparkles size={14} className="text-emerald-400 shrink-0" />
                <span>{actionMessage}</span>
              </div>
            )}
            {error && (
              <div className="mx-4 mt-2 p-2 rounded bg-rose-950/80 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in shrink-0">
                <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Hostile Confirmation Modal Overlay */}
            {isConfirmingHostile && (
              <div className="mx-4 mt-2 p-3 rounded-lg bg-red-950/90 border-2 border-red-600 text-red-100 text-xs flex flex-col gap-2 animate-in fade-in shadow-xl shrink-0">
                <div className="font-bold flex items-center gap-2 text-sm">
                  <AlertTriangle size={16} className="text-red-400" />
                  Konfirmasi Aksi Bermusuhan: {isConfirmingHostile === 'attack' ? 'Serang Tokoh' : 'Mencuri Barang'}
                </div>
                <p className="text-stone-300">
                  Aksi ini akan meningkatkan reputasi Iblis (Demonic), menurunkan hubungan dengan sekte terkait, dan dapat memicu pertarungan hidup atau mati! Apakah kamu yakin?
                </p>
                <div className="flex justify-end gap-2 mt-1">
                  <button 
                    onClick={() => setIsConfirmingHostile(null)}
                    className="px-3 py-1 bg-stone-800 hover:bg-stone-700 rounded text-stone-300"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={executeHostileAction}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-white font-bold"
                  >
                    Ya, Lanjutkan!
                  </button>
                </div>
              </div>
            )}

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5">
              
              {/* TAB 1: STATS (IDENTITAS & STATUS HUBUNGAN SAJA - TANPA STAT GENERAL, SPIRIT ROOT, ARTISAN, DAN TANPA COMBAT) */}
              {activeTab === 'stats' && (
                <div className="space-y-4">
                  {/* Identity Summary Header */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3.5 bg-[#111520] border border-[#30291d] rounded-lg shadow-md">
                    
                    {/* Identity Details (8 cols) */}
                    <div className="lg:col-span-8 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div><span className="text-stone-500">Nama:</span> <span className="font-bold text-amber-200 text-sm">{npcName}</span></div>
                        <div><span className="text-stone-500">Sekte:</span> <span className="text-amber-300 font-semibold">{npcSect}</span></div>
                        <div><span className="text-stone-500">Jabatan:</span> <span className="text-stone-300">{npcPosition}</span></div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div><span className="text-stone-500">Ras:</span> <span className="text-stone-300">{npcRace}</span></div>
                        <div><span className="text-stone-500">Kelamin:</span> <span className="text-stone-300">{npcSex}</span></div>
                        <div><span className="text-stone-500">Ranah:</span> <span className="text-sky-300 font-semibold">{npcRealm}</span></div>
                        <div><span className="text-stone-500">Karisma:</span> <span className="text-amber-400">{npcCharisma}</span></div>
                        <div><span className="text-stone-500">Reputasi:</span> <span className="text-emerald-300">{npcReputation}</span></div>
                      </div>
                      <div className="pt-1.5 text-[11px] text-stone-400 border-t border-[#1f2635]">
                        <span className="text-stone-500">Minat & Hobi:</span> <span className="text-stone-300 font-medium">{npcInterests.join(' • ')}</span>
                      </div>
                    </div>

                    {/* Gelar Kehormatan (Title): KOSONG KECUALI DITENTUKAN OLEH ADMIN */}
                    <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-[#2e271a] lg:pl-3 flex flex-col justify-center">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">
                        Gelar Kehormatan (Title):
                      </span>
                      {npcData?.adminTitle ? (
                        <div className="p-2 rounded bg-gradient-to-r from-[#201b12] to-[#121620] border border-amber-500/60 text-amber-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                          <Award size={16} className="text-amber-400 shrink-0" />
                          <span className="truncate">{npcData.adminTitle}</span>
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-[#0b0e14] border border-[#232d3f] text-stone-500 text-xs italic flex items-center gap-1.5">
                          <Award size={14} className="text-stone-600 shrink-0" />
                          <span>Tidak Memiliki Gelar (Hanya Admin)</span>
                        </div>
                      )}
                      <span className="text-[9px] text-stone-500 italic mt-1">
                        Kekuatan tempur & jurus dirahasiakan oleh dunia persilatan.
                      </span>
                    </div>
                  </div>

                  {/* Percakapan Terakhir & Sapaan Tokoh */}
                  <div className="p-4 bg-[#111520] border border-[#30291d] rounded-lg">
                    <h4 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-sky-400" />
                      Tutur Kata & Kesan Tokoh
                    </h4>
                    <div className="bg-[#0c1017] p-3 rounded border border-[#232d3f] text-xs text-stone-300 italic leading-relaxed">
                      "{dialogHistory[0] || npcData?.greeting || 'Membaca sutra suci menuntut kejernihan akal budi.'}"
                    </div>
                  </div>

                  {/* Status Hubungan & Ikatan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#111520] rounded-lg border border-[#30291d]">
                      <div className="text-stone-400 text-[11px] mb-0.5">Status Hubungan</div>
                      <div className="font-bold text-amber-200">
                        {relationship === 'Friend' || relationship === 'Sahabat' ? 'Sahabat Karib' : 'Orang Asing (Stranger)'}
                      </div>
                      <div className="text-stone-500 text-[10px] mt-1">
                        Poin Keakraban: <span className="text-amber-300 font-semibold">{relationshipPoints}</span> / 100
                      </div>
                    </div>
                    <div className="p-3 bg-[#111520] rounded-lg border border-[#30291d]">
                      <div className="text-stone-400 text-[11px] mb-0.5">Orientasi Moral</div>
                      <div className="font-bold text-emerald-300">
                        {npcAlignment.righteous >= npcAlignment.demonic ? 'Jalan Lurus (Righteous)' : 'Jalan Iblis (Demonic)'}
                      </div>
                      <div className="text-stone-500 text-[10px] mt-1">
                        Kebajikan: {npcAlignment.righteous} • Kejahatan: {npcAlignment.demonic}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: FAMILY (SILSILAH & KELUARGA TOKOH) */}
              {activeTab === 'family' && (
                <div className="space-y-3 font-serif">
                  <div className="bg-[#121622] border border-[#3b3223] p-4 rounded-xl">
                    <h4 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
                      <Users size={16} className="text-amber-400" />
                      Silsilah & Ikatan Keluarga
                    </h4>
                    <p className="text-stone-300 text-xs leading-relaxed mb-3">
                      Catatan arsip mengenai garis keturunan dan kerabat kandung dari {npcName} di dunia persilatan.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                        <div className="font-semibold text-amber-200">Asal Usul Klan</div>
                        <div className="text-stone-400 text-[11px] mt-0.5">Keturunan sah klan kultivator pegunungan kuno yang mengabdi pada {npcSect}.</div>
                      </div>
                      <div className="p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                        <div className="font-semibold text-amber-200">Generasi Kultivasi</div>
                        <div className="text-stone-400 text-[11px] mt-0.5">Generasi ketiga yang berhasil membentuk Intisari Emas murni.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SOCIAL (IKATAN SOSIAL & SEPAK TERJANG) */}
              {activeTab === 'social' && (
                <div className="space-y-3 font-serif">
                  <div className="bg-[#121622] border border-[#3b3223] p-4 rounded-xl">
                    <h4 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
                      <HeartHandshake size={16} className="text-amber-400" />
                      Jejak Hubungan Sosial di Jianghu
                    </h4>
                    <p className="text-stone-300 text-xs leading-relaxed mb-3">
                      Hubungan pertemanan, ikatan sekte, dan reputasi {npcName} dengan tokoh-tokoh terkemuka lainnya.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                        <div className="font-semibold text-amber-200">Status Afiliasi Sekte</div>
                        <div className="text-stone-400 text-[11px] mt-0.5">{npcPosition} sah dari {npcSect}. Menjaga ketertiban wilayah.</div>
                      </div>
                      <div className="p-3 bg-[#181d2a] rounded-lg border border-[#2d3547]">
                        <div className="font-semibold text-amber-200">Status Hubungan dengan Karaktermu</div>
                        <div className="text-amber-300 text-[11px] mt-0.5">
                          {relationship === 'Friend' || relationship === 'Sahabat' ? 'Sahabat Karib' : 'Orang Asing (Stranger)'} ({relationshipPoints} Poin Keakraban).
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
