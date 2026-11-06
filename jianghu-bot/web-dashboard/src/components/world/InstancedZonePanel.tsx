'use client';

import React, { useState } from 'react';
import api from '@/lib/api';

export interface InstancedSessionData {
  _id?: string;
  id?: string;
  zoneId: string;
  zoneName?: string;
  type?: string;
  zoneType: 'spirit_valley' | 'land_of_spirits' | 'defense_circle' | 'elemental_land';
  dangerTier: number;
  tier?: number;
  requiredRealmIndex?: number;
  sessionSeed?: number;
  status: 'active' | 'completed' | 'claimed' | 'abandoned';
  stepIndex?: number;
  currentRoomIndex?: number;
  rooms?: Array<{
    index: number;
    x: number;
    y: number;
    cleared: boolean;
    hasTrap: boolean;
    trapTriggered?: boolean;
    eliteMonster?: {
      name: string;
      hp: number;
      maxHp: number;
      atk: number;
      def: number;
      defeated: boolean;
    };
  }>;
  currentChamber?: number;
  chambers?: Array<{
    chamber: number;
    name: string;
    enemyType: string;
    hp: number;
    atk: number;
    defeated: boolean;
  }>;
  currentWave?: number;
  totalWaves?: number;
  waves?: Array<{
    wave: number;
    label: string;
    enemiesCount: number;
    cleared: boolean;
    isBossWave?: boolean;
  }>;
  element?: string;
  rewards?: any;
  claimedRewards?: any[];
}

interface InstancedZonePanelProps {
  session: InstancedSessionData;
  onUpdateSession: (updated: InstancedSessionData | null) => void;
  onClose: () => void;
  onPlayerHpUpdate?: (newHp: number) => void;
}

export const InstancedZonePanel: React.FC<InstancedZonePanelProps> = ({
  session,
  onUpdateSession,
  onClose,
  onPlayerHpUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [claimedRewards, setClaimedRewards] = useState<any[] | null>(null);

  const handleStepAction = async (action: string, options: any = {}) => {
    if (loading) return;
    setLoading(true);
    setLogMessage(null);

    try {
      const res = await api.post('/instanced-zones/step', { action, options });

      if (res.data?.success) {
        onUpdateSession(res.data.session);
        if (res.data.stepResult?.damageIgnoringDef && onPlayerHpUpdate) {
          setLogMessage(`⚠️ Anda terkena jebakan! Mengalami luka dalam ${res.data.stepResult.damageIgnoringDef} HP.`);
        } else if (res.data.stepResult?.completed) {
          setLogMessage('✨ Seluruh tantangan berhasil dilewati! Silakan klaim hadiah ekspedisi.');
        } else if (res.data.stepResult?.trapDisarmed) {
          setLogMessage('🛡️ Jebakan berhasil dijinakkan dengan selamat.');
        } else {
          setLogMessage('⚔️ Berhasil melewati tantangan petak ini.');
        }
      }
    } catch (err: any) {
      setLogMessage(err.response?.data?.error || 'Gagal menjalankan aksi zona.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post('/instanced-zones/claim');
      if (res.data?.success) {
        setClaimedRewards(res.data.rewards || []);
        setLogMessage('🎉 Hadiah berhasil diklaim dan dimasukkan ke dalam kantong penyimpanan!');
      }
    } catch (err: any) {
      setLogMessage(err.response?.data?.error || 'Gagal mengklaim hadiah.');
    } finally {
      setLoading(false);
    }
  };

  const handleAbandon = async () => {
    if (!confirm('Apakah Anda yakin ingin meninggalkan ekspedisi ini? Progres akan hilang.')) return;
    setLoading(true);
    try {
      await api.post('/instanced-zones/abandon');
      onUpdateSession(null);
      onClose();
    } catch (err: any) {
      setLogMessage(err.response?.data?.error || 'Gagal membatalkan ekspedisi.');
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = session.status === 'completed' || claimedRewards !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0b0f19] border border-[#c5a880]/40 rounded-2xl shadow-2xl overflow-hidden font-sans">
        
        {/* Header Panel */}
        <div className="px-5 py-4 border-b border-[#c5a880]/20 bg-[#121826]/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">
              {session.zoneType === 'spirit_valley' ? '🌀' :
               session.zoneType === 'land_of_spirits' ? '⛩️' :
               session.zoneType === 'defense_circle' ? '🛡️' : '⚡'}
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#f5ebd7] tracking-wide">
                {session.zoneName || 'Area Ekspedisi Kuno'}
              </h2>
              <div className="flex items-center space-x-2 text-xs text-[#a39882] mt-0.5">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                  Tier {session.dangerTier || session.tier || 1}
                </span>
                <span className="capitalize">{session.zoneType.replace(/_/g, ' ')}</span>
                <span>•</span>
                <span className={`font-medium ${session.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {session.status === 'completed' ? 'Terselesaikan' : 'Dalam Ekspedisi'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={session.status === 'completed' || claimedRewards ? onClose : handleAbandon}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
          >
            {session.status === 'completed' || claimedRewards ? 'Tutup' : 'Tinggalkan'}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Notification / Event Log */}
          {logMessage && (
            <div className="p-3 text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200">
              {logMessage}
            </div>
          )}

          {/* Claimed Rewards Modal Card */}
          {claimedRewards && (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-3">
              <div className="text-2xl">🎁</div>
              <h3 className="text-base font-bold text-emerald-300">Hadiah Berhasil Diperoleh!</h3>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {claimedRewards.map((rw: any, idx: number) => (
                  <span key={idx} className="px-3 py-1 rounded bg-[#151c2d] border border-emerald-500/30 text-xs text-emerald-200">
                    {rw.name || rw.item} x{rw.quantity || rw.amount || 1}
                  </span>
                ))}
              </div>
              <button
                onClick={onClose}
                className="mt-3 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
              >
                Kembali ke Peta Dunia
              </button>
            </div>
          )}

          {/* 1. LEMBAH ROH (spirit_valley: 3x3 Grid) */}
          {!claimedRewards && session.zoneType === 'spirit_valley' && (
            <div className="space-y-4">
              <div className="text-xs text-[#a39882] flex justify-between items-center">
                <span>Peta Formasi 9 Kamar Lembah Roh:</span>
                <span>Kamar {((session.currentRoomIndex ?? 0) + 1)} / 9</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
                {session.rooms && session.rooms.map((room) => {
                  const isCurrent = room.index === session.currentRoomIndex;
                  return (
                    <div
                      key={room.index}
                      className={`h-20 rounded-xl border p-2 flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                          : room.cleared
                          ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300 opacity-80'
                          : 'border-slate-800 bg-[#0e1422] text-slate-500'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[11px] font-semibold">
                        <span>#{room.index + 1}</span>
                        {room.cleared && <span className="text-emerald-400">✓ Selesai</span>}
                        {isCurrent && !room.cleared && <span className="text-amber-300">Aktif</span>}
                      </div>

                      <div className="text-center text-xs">
                        {room.hasTrap && !room.trapTriggered && !room.cleared ? (
                          <span className="text-amber-400 text-[11px]">⚠️ Jebakan</span>
                        ) : room.cleared ? (
                          <span className="text-emerald-400/80 text-[10px]">Aman</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Terkunci</span>
                        )}
                      </div>

                      <div className="text-[9px] text-right text-slate-400 truncate">
                        {room.eliteMonster ? room.eliteMonster.name : 'Penjaga'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons for Spirit Valley */}
              {!isCompleted && (
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {session.rooms && session.rooms[session.currentRoomIndex || 0]?.hasTrap && (
                    <button
                      onClick={() => handleStepAction('disarm_trap')}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg border border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium transition"
                    >
                      🛡️ Jinakkan Jebakan
                    </button>
                  )}
                  <button
                    onClick={() => handleStepAction('clear_room')}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-900 font-bold text-xs tracking-wide shadow-md transition"
                  >
                    ⚔️ Hadapi Penjaga & Terobos Kamar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. TANAH ROH (land_of_spirits: 5 Chambers) */}
          {!claimedRewards && session.zoneType === 'land_of_spirits' && (
            <div className="space-y-4">
              <div className="text-xs text-[#a39882] flex justify-between items-center">
                <span>Lorong 5 Ruang Warisan Leluhur:</span>
                <span>Ruang {session.currentChamber || 1} / 5</span>
              </div>

              <div className="space-y-2">
                {session.chambers && session.chambers.map((ch) => {
                  const isCurrent = ch.chamber === session.currentChamber;
                  return (
                    <div
                      key={ch.chamber}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/10'
                          : ch.defeated
                          ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                          : 'border-slate-800 bg-[#0e1422] text-slate-500'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-sm">#{ch.chamber}</span>
                        <div>
                          <div className={`font-semibold ${isCurrent ? 'text-amber-200' : ''}`}>{ch.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {ch.enemyType === 'boss' ? '👑 Bos Kuno' : 'Penjaga Hawa Murni'} • HP: {ch.hp}
                          </div>
                        </div>
                      </div>
                      <div>
                        {ch.defeated ? (
                          <span className="text-emerald-400 font-medium">✓ Terkalahkan</span>
                        ) : isCurrent ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">Aktif</span>
                        ) : (
                          <span className="text-slate-600">Menunggu</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isCompleted && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => handleStepAction('clear_chamber')}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-900 font-bold text-xs tracking-wide shadow-md transition"
                  >
                    ⚔️ Serbu & Taklukkan Ruang Ini
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. LINGKARAN PERTAHANAN (defense_circle: 5 Waves) */}
          {!claimedRewards && session.zoneType === 'defense_circle' && (
            <div className="space-y-4">
              <div className="text-xs text-[#a39882] flex justify-between items-center">
                <span>Moda Bertahan Segel (Survival):</span>
                <span>Gelombang {session.currentWave || 1} / 5</span>
              </div>

              <div className="space-y-2">
                {session.waves && session.waves.map((w) => {
                  const isCurrent = w.wave === session.currentWave;
                  return (
                    <div
                      key={w.wave}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/10'
                          : w.cleared
                          ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                          : 'border-slate-800 bg-[#0e1422] text-slate-500'
                      }`}
                    >
                      <div>
                        <div className={`font-semibold ${isCurrent ? 'text-amber-200' : ''}`}>{w.label}</div>
                        <div className="text-[10px] text-slate-400">
                          {w.enemiesCount} Siluman • {w.isBossWave ? 'Panglima Siluman' : 'Kawanan Menyerbu'}
                        </div>
                      </div>
                      <div>
                        {w.cleared ? (
                          <span className="text-emerald-400 font-medium">✓ Bertahan</span>
                        ) : isCurrent ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">Bertahan Sekarang</span>
                        ) : (
                          <span className="text-slate-600">Menunggu</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isCompleted && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => handleStepAction('clear_wave')}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-900 font-bold text-xs tracking-wide shadow-md transition"
                  >
                    🛡️ Tahan Serbuan Gelombang
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. TANAH ELEMEN (elemental_land: Shards & Waves) */}
          {!claimedRewards && session.zoneType === 'elemental_land' && (
            <div className="space-y-4">
              <div className="text-xs text-[#a39882] flex justify-between items-center">
                <span className="capitalize">Intisari Roh Elemen {session.element || 'Api'}</span>
                <span>Gelombang {session.currentWave || 1} / {session.totalWaves || 3}</span>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center space-y-2">
                <div className="text-3xl">✨</div>
                <div className="text-sm font-bold text-amber-200">
                  Kepingan Intisari Menanti Penempaan
                </div>
                <p className="text-xs text-amber-300/80 max-w-md mx-auto">
                  Kalahkan seluruh siluman elemen untuk mengumpulkan kepingan roh murni. Kepingan ini dapat ditempa di Bengkel Pemukiman (Workshop V20) menjadi Kristal Roh Tingkat Tinggi!
                </p>
              </div>

              {!isCompleted && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => handleStepAction('clear_wave')}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-900 font-bold text-xs tracking-wide shadow-md transition"
                  >
                    ⚔️ Taklukkan Siluman Elemental
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Button Klaim Hadiah saat Ekspedisi Selesai */}
          {session.status === 'completed' && !claimedRewards && (
            <div className="pt-4 border-t border-amber-500/20 text-center space-y-3">
              <div className="text-sm font-semibold text-emerald-400">
                ✨ Ekspedisi berhasil dituntaskan dengan gemilang!
              </div>
              <button
                onClick={handleClaimReward}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-900/40 transition animate-pulse"
              >
                🎁 Klaim Hadiah Ekspedisi
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InstancedZonePanel;
