'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Compass, Map, Clock, Swords, Navigation, CheckCircle, PackageOpen, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import api from '@/lib/api';

export default function ExplorePage() {
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  const activeExp = statusData;
  const isExploring = !!activeExp;
  const isCompleted = isExploring && new Date() >= new Date(activeExp.endTime);

  if (isLoadingLocs || isLoadingStatus) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <RefreshCw className="w-10 h-10 text-[#c5a880] animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col items-center justify-center text-center mb-10">
        <div className="bg-[#c5a880]/10 p-4 rounded-full mb-4 inline-block">
          <Compass className="w-12 h-12 text-[#c5a880]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-serif text-[#c5a880] mb-3 tracking-wider">EKSPLORASI</h1>
        <p className="text-gray-400 max-w-2xl text-lg">
          Kirim karaktermu ke alam liar untuk mencari resource langka, material kultivasi, dan harta karun.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-md mb-6 max-w-2xl mx-auto flex justify-between items-center">
           <span>{errorMsg}</span>
           <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
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
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Berangkat</p>
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
              Buka Hasil Eksplorasi
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 text-gray-400 bg-[#111] px-6 py-3 rounded-full border border-[#333]">
              <Clock className="w-5 h-5" />
              Menunggu karakter menyelesaikan tugas...
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
              <p className="text-gray-400 text-sm mb-6 flex-grow">{loc.description}</p>

              <div className="space-y-3 mb-6 bg-black/40 p-4 rounded-lg border border-[#222]">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500 flex items-center gap-2"><Swords className="w-4 h-4" /> Min Realm:</span>
                   <span className="text-gray-300 font-semibold">{loc.minRealmLevel}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500 flex items-center gap-2"><Clock className="w-4 h-4" /> Durasi:</span>
                   <span className="text-gray-300 font-semibold">{loc.durations.join(', ')} Jam</span>
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
                Pilih durasi perjalanan. Semakin lama, semakin banyak hadiah yang bisa didapatkan.
              </p>

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
    </div>
  );
}
