'use client';

import React, { useState } from 'react';
import { NpcFullProfile, NpcPlayerRelationData } from '@/types/npc';

interface NpcProfilePanelProps {
  npc: NpcFullProfile;
  relation: NpcPlayerRelationData;
  familyData?: any;
  isOpen: boolean;
  onClose: () => void;
  onOpenDialogue?: () => void;
}

type TabKey = 'overview' | 'attributes' | 'relationships' | 'chronicles' | 'inventory' | 'manuals' | 'interaction_log';

export const NpcProfilePanel: React.FC<NpcProfilePanelProps> = ({
  npc,
  relation,
  familyData,
  isOpen,
  onClose,
  onOpenDialogue
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  if (!isOpen) return null;

  const getTierColor = (tier: string = 'gray') => {
    switch (tier.toLowerCase()) {
      case 'red': return 'text-red-400 border-red-500/50 bg-red-950/40';
      case 'gold': return 'text-amber-300 border-amber-500/50 bg-amber-950/40';
      case 'purple': return 'text-purple-400 border-purple-500/50 bg-purple-950/40';
      case 'blue': return 'text-sky-400 border-sky-500/50 bg-sky-950/40';
      case 'green': return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40';
      default: return 'text-stone-400 border-stone-600/50 bg-stone-900/40';
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

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Ikhtisar', icon: '👤' },
    { key: 'attributes', label: 'Atribut 5-Pilar', icon: '⚡' },
    { key: 'relationships', label: 'Hubungan & Klan', icon: '🌳' },
    { key: 'chronicles', label: 'Riwayat Hidup', icon: '📜' },
    { key: 'inventory', label: 'Inventaris', icon: '🎒' },
    { key: 'manuals', label: 'Manual & Jurus', icon: '📖' },
    { key: 'interaction_log', label: 'Catatan Pribadi', icon: '📝' }
  ];

  return (
    <div className="fixed inset-0 z-[99995] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-serif select-none">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0c1017] border-2 border-[#3d2b1f] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#17110d] via-[#211610] to-[#17110d] border-b border-[#3d2b1f] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full border border-amber-500/40 overflow-hidden bg-[#12161f] flex items-center justify-center shrink-0">
              {npc.portraitUrl ? (
                <img src={npc.portraitUrl} alt={npc.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{npc.gender === 'female' ? '🧝‍♀️' : '🥷'}</span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-[#f3e5ab] text-lg font-bold tracking-wide">{npc.name}</h2>
                {npc.vitalStatus?.isAlive === false ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/80 border border-red-700/80 text-red-300 font-bold">
                    ☠️ Telah Wafat
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/70 border border-amber-700/60 text-amber-300 font-mono">
                    {npc.title || 'Warga Jianghu'}
                  </span>
                )}
                <span className="text-xs text-stone-400">({npc.settlementName})</span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Usia: {npc.lifespan.currentAge}/{npc.lifespan.maxAge} Tahun • Ranah Tingkat {npc.cultivation.realmIndex} (Tahap {npc.cultivation.stage})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenDialogue && (
              <button
                onClick={onOpenDialogue}
                className="px-3 py-1.5 bg-amber-900/60 hover:bg-amber-800/80 border border-amber-600/70 text-amber-200 rounded text-xs transition font-bold"
              >
                💬 Ajak Bicara (VN)
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded text-xs transition"
            >
              ✕ Tutup
            </button>
          </div>
        </div>

        {/* 7 Tabs Bar */}
        <div className="px-4 py-2 bg-[#080a0e] border-b border-[#2d2218] flex space-x-1.5 overflow-x-auto text-xs shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded transition font-medium flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[#3d2b1f] text-[#f3e5ab] font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-[#1a1410]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-stone-200 text-xs sm:text-sm">
          {/* TAB 1: IKHTISAR (OVERVIEW) */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Identity & Personality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                  <h4 className="text-amber-400 font-bold mb-3 flex items-center space-x-2">
                    <span>🎭</span>
                    <span>Kepribadian & Watak</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Kepribadian Primer:</span>
                      <span className="font-bold text-amber-200">{npc.personality.primary.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Kepribadian Sekunder:</span>
                      <span className="text-stone-200">{npc.personality.secondary.toUpperCase()}</span>
                    </div>
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-stone-400">
                        <span>Moralitas (Jahat ↔ Benar)</span>
                        <span>{npc.personality.morality}/100</span>
                      </div>
                      <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                        <div className="bg-emerald-500 h-full" style={{ width: `${npc.personality.morality}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-stone-400">
                        <span>Temperamen (Tenang ↔ Meledak)</span>
                        <span>{npc.personality.temperament}/100</span>
                      </div>
                      <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                        <div className="bg-amber-500 h-full" style={{ width: `${npc.personality.temperament}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cultivation Life & Schedule */}
                <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                  <h4 className="text-amber-400 font-bold mb-3 flex items-center space-x-2">
                    <span>⏳</span>
                    <span>Siklus Hidup & Penjadwalan</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Harapan Hidup:</span>
                      <span className="text-stone-200">{npc.lifespan.currentAge} dari {npc.lifespan.maxAge} Tahun</span>
                    </div>
                    <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                      <div
                        className="bg-cyan-500 h-full"
                        style={{ width: `${Math.min(100, Math.floor((npc.lifespan.currentAge / npc.lifespan.maxAge) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-stone-400">Fasilitas Saat Ini:</span>
                      <span className="text-amber-200 font-mono">{npc.schedule.currentFacility}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Status Aktivitas:</span>
                      <span className="text-stone-300 capitalize">{npc.schedule.activityState}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dao Traits */}
              <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                <h4 className="text-amber-400 font-bold mb-3 flex items-center space-x-2">
                  <span>✨</span>
                  <span>Aspirasi Dao (Dao Traits)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(npc.dao?.traits || []).map(t => (
                    <span key={t} className="px-3 py-1 bg-amber-950/60 border border-amber-700/60 text-amber-200 rounded text-xs font-mono">
                      {t.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  ))}
                  {(!npc.dao?.traits || npc.dao.traits.length === 0) && <span className="text-stone-500 italic">Belum mematri Dao Trait khusus.</span>}
                </div>
              </div>

              {/* Destinies */}
              <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                <h4 className="text-amber-400 font-bold mb-3 flex items-center space-x-2">
                  <span>🌌</span>
                  <span>Takdir Bawaan & Bentukan (Destiny)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-stone-400 text-xs block mb-1">Takdir Bawaan (Innate):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(npc.destiny?.innate || []).map(d => (
                        <span key={d} className={`px-2.5 py-0.5 rounded text-xs border font-mono ${getTierColor('blue')}`}>
                          {d.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {(!npc.destiny?.innate || npc.destiny.innate.length === 0) && <span className="text-stone-500 italic text-xs">Belum ada takdir bawaan.</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-stone-400 text-xs block mb-1">Takdir Bentukan (Acquired):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(npc.destiny?.acquired || []).map(d => (
                        <span key={d} className={`px-2.5 py-0.5 rounded text-xs border font-mono ${getTierColor('purple')}`}>
                          {d.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {(!npc.destiny?.acquired || npc.destiny.acquired.length === 0) && <span className="text-stone-500 italic text-xs">Belum ada takdir bentukan.</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATRIBUT 5-PILAR */}
          {activeTab === 'attributes' && (
            <div className="space-y-5">
              {/* Pillar 1 & 2: General & Combat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                  <h4 className="text-amber-400 font-bold mb-3">1. Parameter Vital & Mental</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>HP: <span className="text-stone-200 font-mono">{npc.attributes.hp}/{npc.attributes.maxHp}</span></div>
                    <div>Vitalitas: <span className="text-stone-200 font-mono">{npc.attributes.vitality}</span></div>
                    <div>Energi Qi: <span className="text-stone-200 font-mono">{npc.attributes.energy}</span></div>
                    <div>Fokus Batin: <span className="text-stone-200 font-mono">{npc.attributes.focus}</span></div>
                    <div>Keberuntungan: <span className="text-stone-200 font-mono">{npc.attributes.luck}</span></div>
                    <div>Insight (Pemahaman): <span className="text-stone-200 font-mono">{npc.attributes.insight}</span></div>
                  </div>
                </div>

                <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                  <h4 className="text-amber-400 font-bold mb-3">2. Parameter Pertempuran</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Serangan (ATK): <span className="text-stone-200 font-mono">{npc.attributes.attack}</span></div>
                    <div>Pertahanan (DEF): <span className="text-stone-200 font-mono">{npc.attributes.defense}</span></div>
                    <div>Kelincahan (SPD): <span className="text-stone-200 font-mono">{npc.attributes.agility}</span></div>
                    <div>Crit Rate: <span className="text-stone-200 font-mono">{npc.attributes.critRate}%</span></div>
                    <div>Crit Damage: <span className="text-stone-200 font-mono">{npc.attributes.critDmg}%</span></div>
                    <div>Kecepatan Jelajah: <span className="text-stone-200 font-mono">{npc.attributes.travelSpeed}</span></div>
                  </div>
                </div>
              </div>

              {/* Pillar 3 & 4: Martial Arts & Roots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                  <h4 className="text-amber-400 font-bold mb-3">3. Kemahiran Beladiri (6 Kungfu)</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Pedang (Sword): <span className="text-stone-200 font-mono">Lv.{npc.attributes.kungfuSkills.sword}</span></div>
                    <div>Golok (Blade): <span className="text-stone-200 font-mono">Lv.{npc.attributes.kungfuSkills.blade}</span></div>
                    <div>Tombak (Spear): <span className="text-stone-200 font-mono">Lv.{npc.attributes.kungfuSkills.spear}</span></div>
                    <div>Tinju (Fist): <span className="text-stone-200 font-mono">Lv.{npc.attributes.kungfuSkills.fist}</span></div>
                    <div>Telapak (Palm): <span className="text-stone-200 font-mono">Lv.{npc.attributes.kungfuSkills.palm}</span></div>
                    <div>Jari (Finger): <span className="text-stone-200 font-mono">Lv.{npc.attributes.kungfuSkills.finger}</span></div>
                  </div>
                </div>

                <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                  <h4 className="text-amber-400 font-bold mb-3">4. Akar Spiritual Elemen (6 Roots)</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Api (Fire): <span className="text-stone-200 font-mono">{npc.attributes.roots.fire}</span></div>
                    <div>Air (Water): <span className="text-stone-200 font-mono">{npc.attributes.roots.water}</span></div>
                    <div>Petir (Lightning): <span className="text-stone-200 font-mono">{npc.attributes.roots.lightning}</span></div>
                    <div>Angin (Wind): <span className="text-stone-200 font-mono">{npc.attributes.roots.wind}</span></div>
                    <div>Tanah (Earth): <span className="text-stone-200 font-mono">{npc.attributes.roots.earth}</span></div>
                    <div>Kayu (Wood): <span className="text-stone-200 font-mono">{npc.attributes.roots.wood}</span></div>
                  </div>
                </div>
              </div>

              {/* Pillar 5: Professions */}
              <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                <h4 className="text-amber-400 font-bold mb-3">5. Keahlian Profesi & Kerajinan</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>Alkimia: <span className="text-stone-200 font-mono">Lv.{npc.attributes.professions.alchemy}</span></div>
                  <div>Pandai Besi: <span className="text-stone-200 font-mono">Lv.{npc.attributes.professions.smithing}</span></div>
                  <div>Pertanian: <span className="text-stone-200 font-mono">Lv.{npc.attributes.professions.farming}</span></div>
                  <div>Penambangan: <span className="text-stone-200 font-mono">Lv.{npc.attributes.professions.mining}</span></div>
                  <div>Memancing: <span className="text-stone-200 font-mono">Lv.{npc.attributes.professions.fishing}</span></div>
                  <div>Memasak: <span className="text-stone-200 font-mono">Lv.{npc.attributes.professions.cooking}</span></div>
                  <div>Jimat Segel: <span className="text-stone-200 font-mono">Lv.{npc.attributes.professions.talismans}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HUBUNGAN & KLAN */}
          {activeTab === 'relationships' && (
            <div className="space-y-5">
              {/* Relation with Current Player */}
              <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                <h4 className="text-amber-400 font-bold mb-2">Hubungan dengan Anda</h4>
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`px-3 py-1 rounded border text-xs font-mono font-bold ${getAffinityColor(relation.affinity)}`}>
                    Tahap: {relation.affinityStage.toUpperCase()} ({relation.affinity > 0 ? `+${relation.affinity}` : relation.affinity}/100)
                  </div>
                  {relation.specialStatus.isDaoCompanion && (
                    <span className="px-2 py-0.5 bg-rose-950 border border-rose-600 text-rose-300 rounded text-xs">
                      💖 Pasangan Dao
                    </span>
                  )}
                  {relation.specialStatus.isSwornSibling && (
                    <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-300 rounded text-xs">
                      🤝 Saudara Sejiwa
                    </span>
                  )}
                </div>
                <div className="w-full bg-stone-900 rounded-full h-2.5 overflow-hidden border border-stone-800">
                  <div
                    className="bg-amber-400 h-full"
                    style={{ width: `${Math.max(0, Math.min(100, Math.floor((relation.affinity + 100) / 2)))}%` }}
                  />
                </div>
              </div>

              {/* Family Tree */}
              <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
                <h4 className="text-amber-400 font-bold mb-3">Silsilah Klan & Keluarga</h4>
                {familyData ? (
                  <div>
                    <p className="text-stone-300 font-bold mb-2">{familyData.familyName} (Prestise: {familyData.clanPrestige})</p>
                    <div className="space-y-1">
                      {familyData.members?.map((m: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-stone-800/40">
                          <span className="text-stone-400">{m.role.toUpperCase()} (Gen {m.generation})</span>
                          <span className="text-stone-200">{m.npcId?.name || 'Anggota Klan'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-stone-500 italic">Karakter ini hidup sebagai pengelana mandiri tanpa klan terdaftar.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: RIWAYAT HIDUP */}
          {activeTab === 'chronicles' && (
            <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
              <h4 className="text-amber-400 font-bold mb-3">Kronik Perjalanan Hidup Jianghu</h4>
              <div className="space-y-3">
                <div className="border-l-2 border-amber-600/60 pl-3 py-1">
                  <span className="text-[10px] text-stone-500 font-mono">Tahun Terbuka</span>
                  <p className="text-stone-300 text-xs mt-0.5">Lahir di {npc.settlementName} dan mulai memupuk fondasi fana.</p>
                </div>
                <div className="border-l-2 border-cyan-600/60 pl-3 py-1">
                  <span className="text-[10px] text-stone-500 font-mono">Kultivasi Aktif</span>
                  <p className="text-stone-300 text-xs mt-0.5">Menembus Ranah Tingkat {npc.cultivation.realmIndex} Tahap {npc.cultivation.stage}.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INVENTARIS */}
          {activeTab === 'inventory' && (
            <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
              <h4 className="text-amber-400 font-bold mb-3">Barang Bawaan & Perlengkapan</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(npc.inventory || []).map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-[#0e1219] border border-[#2d2218] rounded flex items-center justify-between">
                    <div>
                      <span className="text-stone-200 font-medium block">{item.name}</span>
                      <span className="text-[10px] text-stone-500 uppercase">{item.category} • Tier {item.qualityTier || 'common'}</span>
                    </div>
                    <span className="text-amber-400 font-mono font-bold">x{item.quantity}</span>
                  </div>
                ))}
                {(!npc.inventory || npc.inventory.length === 0) && <span className="text-stone-500 italic">Tas kosong atau tersembunyi.</span>}
              </div>
            </div>
          )}

          {/* TAB 6: MANUAL & JURUS */}
          {activeTab === 'manuals' && (
            <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
              <h4 className="text-amber-400 font-bold mb-3">Kitab & Jurus yang Dikuasai</h4>
              <div className="space-y-2">
                <div className="p-3 bg-[#0e1219] border border-[#2d2218] rounded flex items-center justify-between">
                  <div>
                    <span className="text-stone-200 font-bold block">Jurus Intisari {npc.title}</span>
                    <span className="text-xs text-stone-400">Teknik dasar bela diri perguruan.</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-700/60 text-amber-300 rounded text-xs font-mono">
                    Pemahaman Lv.{npc.cultivation?.stage ?? 1}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CATATAN INTERAKSI */}
          {activeTab === 'interaction_log' && (
            <div className="p-4 bg-[#12161f]/80 border border-[#2d2218] rounded-lg">
              <h4 className="text-amber-400 font-bold mb-3">Riwayat Interaksi Anda dengan Tokoh Ini</h4>
              <div className="space-y-2">
                {(relation.history || []).map((h, idx) => (
                  <div key={idx} className="p-2 bg-[#0e1219] border border-[#2d2218] rounded flex justify-between items-center text-xs">
                    <div>
                      <span className="text-amber-300 font-bold uppercase mr-2">[{h.action}]</span>
                      <span className="text-stone-300">{h.note}</span>
                    </div>
                    <span className="text-stone-500 font-mono text-[10px]">
                      {new Date(h.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {(!relation.history || relation.history.length === 0) && (
                  <p className="text-stone-500 italic">Belum ada riwayat interaksi sebelumnya. Mulailah menyapa tokoh ini!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NpcProfilePanel;
