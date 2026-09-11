'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Compass, Map, Clock, Swords, Navigation, CheckCircle, PackageOpen, X, RefreshCw, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import api from '@/lib/api';

const getGuidance = (itemName: string) => {
    const name = itemName.toLowerCase();
    if (name.includes('ikan') || name.includes('umpan') || name.includes('kerang')) return 'Memancing / Memasak';
    if (name.includes('batu') || name.includes('bijih') || name.includes('kayu') || name.includes('besi') || name.includes('pasir') || name.includes('lumpur')) return 'Pertukangan';
    if (name.includes('herbal') || name.includes('daun') || name.includes('akar') || name.includes('jamur') || name.includes('bunga') || name.includes('buah') || name.includes('getah') || name.includes('serat')) return 'Alkimia / Pertanian';
    if (name.includes('blueprint')) return 'Gunakan di Inventory';
    if (name.includes('daging') || name.includes('kulit') || name.includes('tulang') || name.includes('bulu')) return 'Penjahit / Memasak';
    return 'Gunakan di Profesi';
};


  const getChanceLabel = (chance: number) => {
    if (chance >= 0.7) return 'Tinggi';
    if (chance >= 0.4) return 'Sedang';
    return 'Rendah';
  };

export default function ExplorePage() {
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showGuidance, setShowGuidance] = useState(false);

  // Claim result modal
  const [claimResult, setClaimResult] = useState<any>(null);

  // Time remaining for active run
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Fetch Locations
  const { data: locData, isLoading: isLoadingLocs } = useQuery({
    queryKey: ['exploreLocations'],
    queryFn: async () => {
      const res = await api.get('/pve/locations');
      return res.data.data;
    }
  });

  // Fetch active exploration status
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['exploreStatus'],
    queryFn: async () => {
      const res = await api.get('/pve/status');
      return res.data.data;
    }
  });

  const activeExp = statusData;
  const isExploring = !!activeExp;
  const isCompleted = isExploring && new Date() >= new Date(activeExp.endTime);

  useEffect(() => {
    if (activeExp && !isCompleted) {
      const interval = setInterval(() => {
        const remaining = new Date(activeExp.endTime).getTime() - new Date().getTime();
        if (remaining <= 0) {
          setTimeRemaining(0);
          queryClient.invalidateQueries({ queryKey: ['exploreStatus'] }); // Refresh state to claimable
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeExp, isCompleted, queryClient]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Start exploration mutation
  const startExpMutation = useMutation({
    mutationFn: async ({ locationId, durationHours }: { locationId: string, durationHours: number }) => {
      const res = await api.post('/pve/start', { locationId, durationHours });
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message || 'Eksplorasi dimulai!');
      setIsConfirmModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['exploreStatus'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Gagal memulai eksplorasi.');
    }
  });

  // Claim exploration mutation
  const claimExpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/pve/claim');
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message || 'Hadiah berhasil diklaim!');
      // Populate drops from data if available, else from activeExp before it's deleted
      setClaimResult(data.drops || activeExp?.drops);
      queryClient.invalidateQueries({ queryKey: ['exploreStatus'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Gagal mengklaim hasil eksplorasi.');
    }
  });

  const handleStart = () => {
    setErrorMsg('');
    if (!selectedLocation || !selectedDuration) {
      setErrorMsg('Pilih lokasi dan durasi terlebih dahulu.');
      return;
    }
    startExpMutation.mutate({ locationId: selectedLocation.id, durationHours: selectedDuration });
  };

  const handleClaim = () => {
    setErrorMsg('');
    claimExpMutation.mutate();
  };

  if (isLoadingLocs || isLoadingStatus) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <RefreshCw className="w-10 h-10 text-[#c5a880] animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col items-center justify-center text-center mb-6">
        <div className="bg-[#c5a880]/10 p-4 rounded-full mb-4 inline-block">
          <Compass className="w-12 h-12 text-[#c5a880]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-serif text-[#c5a880] mb-3 tracking-wider">EKSPLORASI</h1>
        <p className="text-gray-400 max-w-2xl text-lg">
          Kirim karaktermu ke alam liar untuk mencari resource langka, material kultivasi, dan harta karun.
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-10">
        <button
          onClick={() => setShowGuidance(!showGuidance)}
          className="flex items-center gap-2 text-[#c5a880] hover:text-[#e0c298] transition-colors font-medium mx-auto bg-[#c5a880]/10 px-4 py-2 rounded-full border border-[#c5a880]/30"
        >
          <Info className="w-5 h-5" />
          {showGuidance ? "Sembunyikan Panduan Eksplorasi" : "Untuk Apa Eksplorasi? (Panduan Pemula)"}
        </button>
        <AnimatePresence>
          {showGuidance && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="bg-[#111] border border-[#333] p-5 rounded-xl text-gray-300 text-sm leading-relaxed space-y-3">
                <p>
                  <strong>Eksplorasi</strong> adalah sumber utama bahan baku di Jianghu. Item yang didapat dari alam liar digunakan untuk berbagai <strong className="text-[#c5a880]">Profesi</strong> seperti Alkimia, Pertukangan, dan Memasak.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li><strong>Biaya:</strong> Tiap perjalanan butuh <span className="text-amber-500 font-medium">100 Copper per jam</span> dan <span className="text-red-400 font-medium">1x Ransum</span> (beli di Pasar).</li>
                  <li><strong>Energi:</strong> Karaktermu tidak boleh sedang bekerja. Kamu harus memiliki waktu yang pas untuk melakukan eksplorasi.</li>
                  <li><strong>Hasil:</strong> Material yang kamu dapat berbeda tiap lokasi. Cocokkan lokasi dengan Profesi yang ingin kamu latih.</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {errorMsg && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-md mb-6 max-w-2xl mx-auto flex justify-between items-center">
           <span>{errorMsg}</span>
           <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && !claimResult && (
        <div className="bg-green-900/30 border border-green-500/50 text-green-200 px-4 py-3 rounded-md mb-6 max-w-2xl mx-auto flex justify-between items-center">
           <span>{successMsg}</span>
           <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {isExploring ? (
        <div className="bg-[#1a1a1a] border border-[#c5a880]/30 rounded-xl p-8 max-w-3xl mx-auto text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
             {!isCompleted && (
               <motion.div
                 className="h-full bg-[#c5a880]"
                 initial={{ width: "0%" }}
                 animate={{ width: "100%" }}
                 transition={{
                    duration: (new Date(activeExp.endTime).getTime() - new Date().getTime()) / 1000,
                    ease: "linear"
                 }}
               />
             )}
             {isCompleted && <div className="h-full w-full bg-green-500" />}
          </div>

          <Map className={`w-16 h-16 mx-auto mb-6 ${isCompleted ? 'text-green-400' : 'text-[#c5a880] animate-pulse'}`} />

          <h2 className="text-2xl font-bold text-white mb-2">
            Status: {isCompleted ? <span className="text-green-400">Telah Kembali</span> : <span className="text-[#c5a880]">Sedang Menjelajah</span>}
          </h2>
          <p className="text-gray-400 text-lg mb-6">Lokasi: <span className="text-white font-semibold">{activeExp.location}</span></p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
             <div className="bg-black/50 p-4 rounded-lg border border-[#333]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Waktu Berangkat</p>
                <p className="text-sm text-gray-300">{new Date(activeExp.startTime).toLocaleString('id-ID')}</p>
             </div>
             <div className="bg-black/50 p-4 rounded-lg border border-[#333]">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Target Selesai</p>
                <p className="text-sm text-gray-300">{new Date(activeExp.endTime).toLocaleString('id-ID')}</p>
             </div>
          </div>

          {isCompleted ? (
            <button
              onClick={handleClaim}
              disabled={claimExpMutation.isPending}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-md transition-colors flex items-center justify-center mx-auto gap-2 text-lg shadow-[0_0_15px_rgba(34,197,94,0.4)] disabled:opacity-50"
            >
              {claimExpMutation.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <PackageOpen className="w-6 h-6" />}
              Klaim Hasil Eksplorasi
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 text-amber-500 bg-[#111] px-6 py-3 rounded-full border border-[#333] font-mono font-bold text-xl">
              <Clock className="w-6 h-6 text-gray-400" />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locData?.map((loc: any) => (
            <div
              key={loc.id}
              className={`bg-[#111] border ${selectedLocation?.id === loc.id ? 'border-[#c5a880] ring-1 ring-[#c5a880]' : 'border-[#333] hover:border-gray-500'} rounded-xl p-6 transition-all cursor-pointer group flex flex-col h-full`}
              onClick={() => setSelectedLocation(loc)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white group-hover:text-[#c5a880] transition-colors">{loc.name}</h3>
                <Navigation className={`w-5 h-5 ${selectedLocation?.id === loc.id ? 'text-[#c5a880]' : 'text-gray-600'}`} />
              </div>
              <p className="text-gray-400 text-sm mb-4 flex-grow">{loc.description}</p>

              <div className="mb-4">
                 <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Potensi Item:</p>
                 <p className="text-sm text-gray-300 italic line-clamp-2">
                    {loc.drops?.items?.map((i: any) => i.name).join(', ') || 'Belum diketahui'}
                 </p>
              </div>

              <div className="space-y-3 mb-6 bg-black/40 p-4 rounded-lg border border-[#222]">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500 flex items-center gap-2"><Swords className="w-4 h-4" /> Min Realm:</span>
                   <span className="text-gray-300 font-semibold">{loc.minRealmLevel}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Durasi (Jam):</span>
                   <span className="text-gray-300 font-semibold">{loc.durations.join(', ')}</span>
                 </div>
              </div>

              {selectedLocation?.id === loc.id && (
                <div className="mt-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsConfirmModalOpen(true); }}
                    className="w-full bg-[#c5a880] hover:bg-[#d6b991] text-black font-bold py-3 px-4 rounded-md transition-colors"
                  >
                    Siapkan Perjalanan
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && selectedLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111] border border-[#c5a880]/30 rounded-xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold text-[#c5a880] mb-2">{selectedLocation.name}</h2>
              <p className="text-gray-400 text-sm mb-6 border-b border-[#333] pb-4">
                Pilih durasi perjalanan. Semakin lama, semakin banyak biaya yang diperlukan.
              </p>

              <div className="bg-[#1a1a1a] p-4 rounded-lg mb-6 border border-[#333]">
                  <h4 className="text-sm font-bold text-gray-300 mb-2 border-b border-[#333] pb-1">Persyaratan Perjalanan:</h4>
                  <ul className="text-sm text-gray-400 space-y-2">
                      <li className="flex justify-between items-center">
                          <span>Biaya Retribusi:</span>
                          <span className="font-mono text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">{selectedDuration ? selectedDuration * 100 : '?'} Copper</span>
                      </li>
                      <li className="flex justify-between items-center">
                          <span>Item Bekal:</span>
                          <span className="font-mono text-red-400 font-semibold bg-red-400/10 px-2 py-0.5 rounded">1x Ransum</span>
                      </li>
                      <li className="text-xs italic text-gray-500 mt-2 text-center">*Karakter tidak boleh sedang bekerja.</li>
                  </ul>
              </div>


              <div className="bg-[#1a1a1a] p-4 rounded-lg mb-6 border border-[#333]">
                  <h4 className="text-sm font-bold text-gray-300 mb-2 border-b border-[#333] pb-1">Hint Reward (Peluang):</h4>
                  {selectedLocation.drops?.items?.length > 0 ? (
                      <ul className="text-sm text-gray-400 space-y-1 grid grid-cols-2 gap-x-4">
                          {selectedLocation.drops.items.map((drop: any, idx: number) => (
                              <li key={idx} className="flex justify-between items-center bg-black/40 px-2 py-1 rounded">
                                  <span className="truncate" title={drop.name}>{drop.name}</span>
                                  <span className={`text-xs ${getChanceLabel(drop.chance) === 'Tinggi' ? 'text-green-400' : getChanceLabel(drop.chance) === 'Sedang' ? 'text-yellow-400' : 'text-red-400'}`}>
                                      {getChanceLabel(drop.chance)}
                                  </span>
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <p className="text-sm text-gray-500 italic">Reward dibuka saat klaim.</p>
                  )}
              </div>

              <div className="space-y-3 mb-8">
                {selectedLocation.durations.map((hrs: number) => (
                  <label
                    key={hrs}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${selectedDuration === hrs ? 'border-[#c5a880] bg-[#c5a880]/10' : 'border-[#333] bg-black/50 hover:bg-[#222]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="duration"
                        value={hrs}
                        checked={selectedDuration === hrs}
                        onChange={() => setSelectedDuration(hrs)}
                        className="text-[#c5a880] focus:ring-[#c5a880] bg-[#222] border-[#444]"
                      />
                      <span className="text-white font-medium">{hrs} Jam</span>
                    </div>
                    {selectedDuration === hrs && <CheckCircle className="w-5 h-5 text-[#c5a880]" />}
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 bg-transparent hover:bg-[#222] text-gray-300 font-medium py-3 rounded-md border border-[#333] transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleStart}
                  disabled={!selectedDuration || startExpMutation.isPending}
                  className="flex-1 bg-[#c5a880] hover:bg-[#d6b991] text-black font-bold py-3 rounded-md transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {startExpMutation.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Berangkat!'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Claim Result Modal */}
      <AnimatePresence>
        {claimResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-[#111] border-2 border-green-500/30 rounded-xl max-w-lg w-full p-8 shadow-[0_0_40px_rgba(34,197,94,0.15)] relative my-auto"
            >
              <div className="text-center mb-8">
                 <div className="bg-green-500/20 p-4 rounded-full inline-block mb-4">
                    <PackageOpen className="w-12 h-12 text-green-400" />
                 </div>
                 <h2 className="text-3xl font-bold text-[#c5a880] mb-2">Hasil Eksplorasi</h2>
                 <p className="text-gray-400">Berikut adalah item dan resource yang kamu temukan.</p>
              </div>

              <div className="bg-black/50 rounded-lg p-5 border border-[#333] mb-8 space-y-4">
                 <div className="flex flex-wrap gap-4 justify-center border-b border-[#333] pb-4">
                    {(claimResult.copper || 0) > 0 && (
                        <div className="bg-amber-900/30 border border-amber-700/50 px-3 py-1.5 rounded-md text-amber-500 font-mono text-sm flex items-center gap-2">
                           <span>🪙</span> {claimResult.copper} Copper
                        </div>
                    )}
                    {(claimResult.silver || 0) > 0 && (
                        <div className="bg-gray-700/30 border border-gray-500/50 px-3 py-1.5 rounded-md text-gray-300 font-mono text-sm flex items-center gap-2">
                           <span>💿</span> {claimResult.silver} Silver
                        </div>
                    )}
                    {(claimResult.gold || 0) > 0 && (
                        <div className="bg-yellow-900/30 border border-yellow-500/50 px-3 py-1.5 rounded-md text-yellow-400 font-mono text-sm flex items-center gap-2">
                           <span>👑</span> {claimResult.gold} Gold
                        </div>
                    )}
                 </div>

                 {claimResult.items && claimResult.items.length > 0 ? (
                   <ul className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                     {claimResult.items.map((itemObj: any, idx: number) => {
                        const itemName = itemObj.itemId?.name || itemObj.name || "Item Tidak Diketahui";
                        const guidance = getGuidance(itemName);
                        return (
                          <li key={idx} className="flex flex-col gap-1 bg-[#1a1a1a] p-3 rounded-md border border-[#222]">
                            <div className="flex justify-between items-center">
                               <span className="text-white font-semibold">{itemName}</span>
                               <span className="text-[#c5a880] font-mono bg-[#c5a880]/10 px-2 py-0.5 rounded text-sm">x{itemObj.quantity}</span>
                            </div>
                            <span className="text-xs text-gray-500">Saran: <span className="text-gray-400">{guidance}</span></span>
                          </li>
                        )
                     })}
                   </ul>
                 ) : (
                   <p className="text-center text-gray-500 text-sm py-4 italic">Sayang sekali, tidak ada item yang ditemukan kali ini.</p>
                 )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                 <Link href="/inventory" className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-center py-3 rounded-md transition-colors text-sm font-medium border border-gray-600">
                    Cek Inventory
                 </Link>
                 <Link href="/professions" className="flex-1 bg-[#c5a880] hover:bg-[#d6b991] text-black text-center py-3 rounded-md transition-colors text-sm font-bold flex justify-center items-center gap-2">
                    Buka Profesi <ArrowRight className="w-4 h-4" />
                 </Link>
              </div>

              <button
                onClick={() => setClaimResult(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
