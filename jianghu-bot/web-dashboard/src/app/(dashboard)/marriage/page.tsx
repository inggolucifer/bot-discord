'use client';

import React, { useState, useEffect } from 'react';

export default function MarriagePage() {
  const [marriageData, setMarriageData] = useState<any>(null);
  const [eligiblePlayers, setEligiblePlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [proposeTarget, setProposeTarget] = useState('');
  const [dowry, setDowry] = useState({ copper: 0, silver: 0, gold: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMarriageData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const [meRes, eligibleRes] = await Promise.all([
        fetch('/api/marriage/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/marriage/eligible-nearby', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (meRes.ok) setMarriageData(await meRes.json());
      if (eligibleRes.ok) setEligiblePlayers(await eligibleRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarriageData();
  }, []);

  const handleAction = async (endpoint: string, method: string = 'POST', body: any = null) => {
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/marriage/${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : null
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message });
        fetchMarriageData(); // Refresh data
        if (endpoint === 'propose') {
          setProposeTarget('');
          setDowry({ copper: 0, silver: 0, gold: 0 });
        }
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Terjadi kesalahan.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Koneksi ke server gagal.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-300">Memuat data pernikahan...</div>;

  const { playerMarriage, marriage, outgoingProposal, incomingProposal } = marriageData || {};

  return (
    <div className="container mx-auto p-4 max-w-5xl text-gray-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37] flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Pernikahan
          </h1>
          <p className="text-gray-400 mt-2">Cari pasangan kultivasi untuk menemani perjalanan Dao-mu.</p>
        </div>
        <button onClick={fetchMarriageData} className="px-4 py-2 bg-[#d4af37] text-black font-semibold rounded hover:bg-[#b5952f] transition-colors flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Refresh
        </button>
      </div>

      {actionMessage && (
        <div className={`mb-6 p-4 rounded border ${actionMessage.type === 'error' ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-green-900/50 border-green-500 text-green-200'}`}>
          {actionMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Pernikahan */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-[#d4af37] mb-6">Status Pernikahan</h2>
          {playerMarriage?.status === 'married' ? (
             <div>
                <p className="text-gray-400 mb-1">Pasangan</p>
                <p className="text-xl font-medium text-white mb-6">Mortal #{playerMarriage.spouseId}</p>
                <p className="text-gray-400 mb-1">Menikah Sejak</p>
                <p className="text-white mb-8">{marriage?.marriedAt ? new Date(marriage.marriedAt).toLocaleDateString() : '-'}</p>

                <div className="pt-6 border-t border-gray-800">
                    <p className="text-sm text-gray-500 mb-4">Menceraikan pasangan akan dikenakan biaya 1000 Copper.</p>
                    <button
                        onClick={() => { if(confirm('Yakin ingin bercerai? Biaya: 1000 Copper')) handleAction('divorce') }}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50"
                    >
                        Bercerai
                    </button>
                </div>
             </div>
          ) : (
              <div>
                  <p className="text-gray-400 mb-1">Status Saat Ini</p>
                  <p className="text-2xl font-bold text-white mb-4">
                      {playerMarriage?.status === 'single' ? 'Lajang' : 'Bertunangan (Menunggu Lamaran)'}
                  </p>
              </div>
          )}
        </div>

        {/* Lamaran (Incoming & Outgoing) */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-6">
           <h2 className="text-2xl font-semibold text-[#d4af37] mb-6">Lamaran</h2>

           {!incomingProposal && !outgoingProposal && (
               <div className="flex items-center justify-center h-40 text-gray-500">
                   Tidak ada lamaran yang pending.
               </div>
           )}

           {incomingProposal && (
               <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                   <h3 className="text-lg font-medium text-white mb-2">Lamaran Diterima</h3>
                   <p className="text-gray-300 mb-4">Dari: Player #{incomingProposal.proposedBy}</p>

                   <div className="mb-4 text-sm bg-black/30 p-3 rounded">
                       <p className="text-gray-400 mb-1">Mahar Ditawarkan:</p>
                       <p className="text-[#d4af37]">
                           {incomingProposal.dowry.gold} G, {incomingProposal.dowry.silver} S, {incomingProposal.dowry.copper} C
                       </p>
                   </div>

                   <div className="flex gap-3 mt-4">
                       <button onClick={() => handleAction(`proposals/${incomingProposal._id}/accept`)} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors disabled:opacity-50">
                           Terima
                       </button>
                       <button onClick={() => handleAction(`proposals/${incomingProposal._id}/reject`)} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50">
                           Tolak
                       </button>
                   </div>
               </div>
           )}

           {outgoingProposal && (
               <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                   <h3 className="text-lg font-medium text-white mb-2">Lamaran Dikirim</h3>
                   <p className="text-gray-300 mb-4">Ke: Player #{outgoingProposal.partnerB}</p>

                   <div className="mb-4 text-sm bg-black/30 p-3 rounded">
                       <p className="text-gray-400 mb-1">Mahar Ditawarkan:</p>
                       <p className="text-[#d4af37]">
                           {outgoingProposal.dowry.gold} G, {outgoingProposal.dowry.silver} S, {outgoingProposal.dowry.copper} C
                       </p>
                   </div>

                   <button onClick={() => handleAction(`proposals/${outgoingProposal._id}/cancel`)} disabled={isSubmitting} className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded transition-colors mt-2 disabled:opacity-50">
                       Batalkan Lamaran
                   </button>
               </div>
           )}
        </div>
      </div>

      {/* Form Lamaran */}
      {playerMarriage?.status === 'single' && !outgoingProposal && (
          <div className="bg-black/40 border border-[#8a1c3f] rounded-lg p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-48 w-48" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
              </div>

              <h2 className="text-2xl font-semibold text-[#d4af37] mb-2 relative z-10">Lamar Seseorang</h2>
              <p className="text-gray-400 text-sm mb-6 max-w-3xl relative z-10">
                  Anda hanya bisa melamar pemain lajang yang berada di lokasi yang sama dengan Anda dan tidak sedang bepergian. Biaya upacara (500 Copper) akan dikenakan saat lamaran diterima.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                  <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Pilih Target</label>
                      <select
                          className="w-full bg-black border border-gray-700 text-white rounded p-2.5 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none"
                          value={proposeTarget}
                          onChange={(e) => setProposeTarget(e.target.value)}
                      >
                          <option value="">-- Pilih Pemain --</option>
                          {eligiblePlayers.map(p => (
                              <option key={p.discordId} value={p.discordId}>
                                  {p.characterName} (ID: {p.discordId}) - {p.systemCultivation?.realm || 'Mortal'}
                              </option>
                          ))}
                      </select>
                      {eligiblePlayers.length === 0 && (
                          <p className="text-sm text-yellow-500 mt-2">Tidak ada pemain lajang di lokasi Anda.</p>
                      )}
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Tawarkan Mahar (Opsional)</label>
                      <div className="grid grid-cols-3 gap-3">
                          <div>
                              <span className="block text-xs text-gray-500 mb-1">Gold</span>
                              <input
                                  type="number" min="0"
                                  className="w-full bg-black border border-gray-700 text-white rounded p-2 focus:border-[#d4af37] outline-none"
                                  value={dowry.gold} onChange={(e) => setDowry({...dowry, gold: parseInt(e.target.value) || 0})}
                              />
                          </div>
                          <div>
                              <span className="block text-xs text-gray-500 mb-1">Silver</span>
                              <input
                                  type="number" min="0"
                                  className="w-full bg-black border border-gray-700 text-white rounded p-2 focus:border-[#d4af37] outline-none"
                                  value={dowry.silver} onChange={(e) => setDowry({...dowry, silver: parseInt(e.target.value) || 0})}
                              />
                          </div>
                          <div>
                              <span className="block text-xs text-gray-500 mb-1">Copper</span>
                              <input
                                  type="number" min="0"
                                  className="w-full bg-black border border-gray-700 text-white rounded p-2 focus:border-[#d4af37] outline-none"
                                  value={dowry.copper} onChange={(e) => setDowry({...dowry, copper: parseInt(e.target.value) || 0})}
                              />
                          </div>
                      </div>
                  </div>
              </div>

              <div className="mt-8 relative z-10">
                  <button
                      onClick={() => handleAction('propose', 'POST', { toUserId: proposeTarget, dowry })}
                      disabled={!proposeTarget || isSubmitting}
                      className="w-full py-3 bg-[#8a1c3f] hover:bg-[#a6234d] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Kirim Lamaran
                  </button>
              </div>
          </div>
      )}

    </div>
  );
}
