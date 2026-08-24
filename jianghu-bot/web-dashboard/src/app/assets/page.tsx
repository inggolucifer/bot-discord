'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, Pickaxe, CheckCircle2, Clock, AlertTriangle, DollarSign, X, Building, Hammer } from 'lucide-react';
import FallbackImage from '@/components/FallbackImage';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface AssignedWorker {
  workerId: string;
  endTime?: string;
}

interface AssetData {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  quantity: number;
  status: string;
  underConstruction: boolean;
  constructionCompleteAt: string | null;
  assignedWorkers: AssignedWorker[];
  progressHours: number;
}

// Timer Component
const Countdown = ({ targetDate }: { targetDate: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const interval = setInterval(() => {
            const distance = new Date(targetDate).getTime() - new Date().getTime();
            if (distance < 0) {
                setTimeLeft('Selesai (Refresh)');
                clearInterval(interval);
                return;
            }
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${hours}j ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return <span>{timeLeft}</span>;
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ claimed: string[], waiting: string[], other: string[] } | null>(null);

  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [playerInventory, setPlayerInventory] = useState<any[]>([]);
  const [showBlueprints, setShowBlueprints] = useState(false);
  const [buildLoading, setBuildLoading] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);

  const [activeTab, setActiveTab] = useState<'info' | 'move'>('info');
  const [moveLoading, setMoveLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [targetAssetId, setTargetAssetId] = useState('');
  const [selectedWorkerIdToMove, setSelectedWorkerIdToMove] = useState('');

  const { user } = useAuthStore();
  const router = useRouter();

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const [res, bpRes, invRes] = await Promise.all([
        api.get('/player/assets'),
        api.get('/almanack/assets'),
        api.get('/inventory').catch(() => ({ data: { data: [] } })) // gracefully fallback if inventory fetch fails
      ]);
      setAssets(res.data.data);

      const inventory = invRes.data.data || [];
      setPlayerInventory(inventory);

      // Sort: buildable = true first, then buildable = false
      const allAssets = bpRes.data.data.sort((a: any, b: any) => {
          if (a.buildable === b.buildable) return a.name.localeCompare(b.name);
          return a.buildable ? -1 : 1;
      });
      setBlueprints(allAssets);
    } catch (err: any) {
      console.error(err);
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memuat data aset.');
    } finally {
      setLoading(false);
    }
  };

  const checkMaterials = (requirements: any[]) => {
      if (!requirements || requirements.length === 0) return { ok: true, missing: [] };
      const missing = [];
      for (const req of requirements) {
          const owned = playerInventory.find((item: any) => item.name === req.itemName);
          const have = owned ? owned.quantity : 0;
          if (have < req.quantity) {
              missing.push(`${req.itemName} (${have}/${req.quantity})`);
          }
      }
      return { ok: missing.length === 0, missing };
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    const timer = setTimeout(() => fetchAssets(), 0);
    return () => clearTimeout(timer);
  }, [user, router]);

  const handleBuildAsset = async (assetId: string) => {
    setBuildLoading(true);
    setError(null);
    try {
      const res = await api.post('/almanack/build-asset', { assetId });
      setClaimResult({ claimed: [res.data.message], waiting: [], other: [] });
      setShowBlueprints(false);
      await fetchAssets();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Gagal membangun aset.');
    } finally {
      setBuildLoading(false);
    }
  };

  const handleClaimProfit = async () => {
    setClaimLoading(true);
    setClaimResult(null);
    setError(null);
    try {
      const res = await api.post('/player/assets/claim-profit');
      setClaimResult(res.data.data);
      await fetchAssets();
    } catch (err: any) {
      console.error(err);
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal mengklaim profit.');
    } finally {
      setClaimLoading(false);
    }
  };


  const handleWorkSelf = async () => {
      if (!selectedAsset) return;
      try {
          setActionLoading(true);
          const res = await api.post('/player/assets/work-self', { assetId: selectedAsset.id });
          alert(res.data.message);

          const assetsRes = await api.get('/player/assets');
          setAssets(assetsRes.data.data);

          const updatedSelected = assetsRes.data.data.find((a: any) => a.id === selectedAsset.id);
          if (updatedSelected) setSelectedAsset(updatedSelected);

      } catch (err: unknown) {
          console.error(err);
          alert((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memulai kerja mandiri.');
      } finally {
          setActionLoading(false);
      }
  };

  const handleMoveWorker = async () => {
      if (!selectedWorkerIdToMove || !targetAssetId) return;
      setMoveLoading(true);
      try {
          await api.post('/player/assets/move-worker', {
              workerId: selectedWorkerIdToMove,
              targetAssetId: targetAssetId
          });
          await fetchAssets();
          setSelectedAsset(null);
          alert('Berhasil memindahkan pekerja.');
      } catch (err: any) {
          console.error(err);
          alert((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memindah pekerja.');
      } finally {
          setMoveLoading(false);
      }
  };

  if (loading) {
    return <div className="flex justify-center p-20 text-[#c5a880]"><Loader2 className="animate-spin" size={48} /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-bold font-serif text-[#c5a880]">Manajemen Aset</h1>
        <p className="text-gray-400">Pantau operasional properti dan aset milik karakter Anda.</p>
      </div>

      {error && (
        <div className="p-4 rounded border text-center font-bold bg-red-900/30 text-red-400 border-red-800">
          {error}
        </div>
      )}

      <div className="bg-[#1a1a1a] jianghu-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white font-serif">Aset Pribadi</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBlueprints(!showBlueprints)}
              className="flex items-center gap-2 bg-[#8b0000] hover:bg-red-800 text-white text-sm px-4 py-2 rounded border border-red-900 transition-colors shadow-[0_0_10px_rgba(139,0,0,0.5)]"
            >
              <Hammer size={16} />
              Bangun Aset Baru
            </button>
            <button
              onClick={handleClaimProfit}
            disabled={claimLoading || assets.length === 0}
            className="flex items-center gap-2 bg-[#1f402e] hover:bg-green-900 disabled:bg-gray-800 disabled:text-gray-500 text-green-100 text-sm px-4 py-2 rounded border border-green-800 transition-colors shadow-[0_0_10px_rgba(31,64,46,0.5)]"
          >
            {claimLoading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
            Klaim Profit
            </button>
          </div>
        </div>


        {/* Blueprints Section */}
        {showBlueprints && (
          <div className="mb-8 bg-black/60 border border-[#444] rounded p-4">
            <h3 className="text-lg font-bold text-[#c5a880] mb-4 flex items-center gap-2"><Building size={18}/> Daftar Aset & Blueprint</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {blueprints.length === 0 ? (
                 <p className="text-gray-500 text-sm">Tidak ada aset yang tersedia di database.</p>
              ) : blueprints.map(bp => {
                const matCheck = checkMaterials(bp.buildRequirements || []);
                const isBuildable = bp.buildable;
                const canBuild = isBuildable && matCheck.ok;

                return (
                <div key={bp._id} className={`bg-[#1a1a1a] border p-4 rounded flex flex-col gap-3 ${isBuildable ? 'border-[#444] hover:border-[#c5a880]' : 'border-gray-800 opacity-75'}`}>
                  <div className="flex gap-3">
                     <div className="w-12 h-12 bg-black rounded border border-[#444] flex items-center justify-center p-1">
                       <FallbackImage src={bp.imageUrl || ""} alt={bp.name} fallbackNode={<div className="text-xl">🏛️</div>} />
                     </div>
                     <div>
                        <h4 className="font-bold text-[#c5a880]">{bp.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           {isBuildable ? (
                             <span className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded border border-green-800">Bisa Dibangun</span>
                           ) : (
                             <span className="text-[10px] px-1.5 py-0.5 bg-red-900/50 text-red-400 rounded border border-red-800">Tidak Bisa Dibangun</span>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="text-xs text-gray-400 flex-grow">
                    {isBuildable && (
                        <>
                            <p className="text-[10px] text-orange-400 mb-1">Waktu Bangun: {bp.constructionTimeHours} Jam</p>
                            <span className="block mb-1 font-semibold">Bahan Dibutuhkan:</span>
                            {bp.buildRequirements?.length > 0 ? (
                                <ul className="list-disc list-inside">
                                  {bp.buildRequirements.map((req: any, i: number) => {
                                      const owned = playerInventory.find((item: any) => item.name === req.itemName);
                                      const have = owned ? owned.quantity : 0;
                                      const isEnough = have >= req.quantity;
                                      return (
                                          <li key={i} className={isEnough ? "text-green-400" : "text-red-400"}>
                                              {req.itemName}: {have}/{req.quantity}
                                          </li>
                                      );
                                  })}
                                </ul>
                            ) : (
                                <span className="italic">Tidak ada syarat material</span>
                            )}
                            {!matCheck.ok && (
                                <p className="text-[10px] text-red-400 mt-2 bg-red-900/20 p-1 rounded border border-red-900/50">Kurang material: {matCheck.missing.join(', ')}</p>
                            )}
                        </>
                    )}
                    {!isBuildable && (
                        <p className="mt-2 text-gray-500 italic">Aset ini hanya bisa didapatkan melalui cara lain (misalnya Shop atau Event).</p>
                    )}
                  </div>

                  {isBuildable ? (
                      <button
                        onClick={() => handleBuildAsset(bp._id)}
                        disabled={buildLoading || !canBuild}
                        className={`mt-auto w-full text-white text-xs py-2 rounded transition-colors font-bold flex justify-center items-center gap-2 ${canBuild ? 'bg-[#8b0000] hover:bg-red-800' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                      >
                        {buildLoading ? <Loader2 size={12} className="animate-spin" /> : <Hammer size={12}/>}
                        {canBuild ? 'Mulai Bangun' : 'Material Tidak Cukup'}
                      </button>
                  ) : (
                      <button
                        disabled
                        className="mt-auto w-full bg-gray-800 text-gray-500 text-xs py-2 rounded font-bold cursor-not-allowed"
                      >
                        Tidak Bisa Dibangun
                      </button>
                  )}
                </div>
              )})}
            </div>
          </div>
        )}

        {claimResult && (
          <div className="mb-6 p-4 rounded bg-black/50 border border-green-900/50">
            <h3 className="text-green-400 font-bold mb-2">Hasil Klaim:</h3>
            {claimResult.claimed.length > 0 ? (
              <ul className="text-sm text-gray-300 list-disc list-inside">
                {claimResult.claimed.map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Tidak ada profit yang bisa diklaim saat ini.</p>
            )}
          </div>
        )}

        {assets.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Anda belum memiliki aset apapun. Beli aset di Pasar atau bangun menggunakan material.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset, index) => (
              <div
                key={index}
                onClick={() => { setSelectedAsset(asset); setActiveTab('info'); }}
                className="bg-black/40 border border-[#333] rounded-lg p-4 hover:border-[#c5a880] transition-colors relative cursor-pointer group"
              >

                {asset.underConstruction && (
                   <div className="absolute top-2 right-2 bg-orange-900/80 text-orange-200 text-[10px] px-2 py-1 rounded border border-orange-700 flex items-center gap-1 z-10">
                     <Clock size={12} /> Sedang Dibangun
                   </div>
                )}

                {!asset.underConstruction && asset.status === 'Aktif' && (
                   <div className="absolute top-2 right-2 bg-green-900/80 text-green-200 text-[10px] px-2 py-1 rounded border border-green-700 flex items-center gap-1 z-10">
                     <CheckCircle2 size={12} /> {asset.status}
                   </div>
                )}

                {asset.status === 'Halted (Terhenti)' && (
                   <div className="absolute top-2 right-2 bg-red-900/80 text-red-200 text-[10px] px-2 py-1 rounded border border-red-700 flex items-center gap-1 z-10">
                     <AlertTriangle size={12} /> Terhenti
                   </div>
                )}

                <div className="flex gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-900 rounded border border-gray-700 overflow-hidden flex-shrink-0 group-hover:border-[#c5a880] transition-colors">
                    <FallbackImage
                      src={asset.imageUrl || ''}
                      alt={asset.name}
                      fallbackNode={<div className="w-full h-full flex items-center justify-center text-3xl">🏯</div>}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-200 group-hover:text-[#c5a880] transition-colors">{asset.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{asset.description}</p>
                    <p className="text-xs text-[#c5a880] mt-2 font-bold">Jumlah: {asset.quantity}</p>
                  </div>
                </div>

                <div className="border-t border-[#333] pt-3 flex justify-between items-center text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Pickaxe size={14} className="text-gray-500" />
                    <span>Pekerja: {asset.assignedWorkers.length}</span>
                  </div>
                  {!asset.underConstruction && asset.status === 'Aktif' && asset.progressHours > 0 && (
                     <span className="text-green-400">Profit tersedia</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detail Aset */}
      {selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#1a1a1a] border border-[#c5a880] rounded-lg shadow-2xl max-w-md w-full relative flex flex-col max-h-[90vh]">
                  <button
                      onClick={() => setSelectedAsset(null)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10 bg-black/50 rounded-full p-1"
                  >
                      <X size={20} />
                  </button>

                  <div className="h-32 w-full bg-black relative border-b border-[#333]">
                      <FallbackImage
                          src={selectedAsset.imageUrl || ''}
                          alt={selectedAsset.name}
                          fallbackNode={<div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🏯</div>}
                          className="w-full h-full object-cover opacity-50"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent"></div>
                  </div>

                  <div className="p-6 overflow-y-auto">
                      <h2 className="text-2xl font-bold text-[#c5a880] font-serif mb-2">{selectedAsset.name}</h2>

                      <div className="flex border-b border-[#333] mb-4">
                          <button
                             onClick={() => setActiveTab('info')}
                             className={`px-4 py-2 text-sm font-bold ${activeTab === 'info' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
                          >
                              Informasi
                          </button>
                          <button
                             onClick={() => setActiveTab('move')}
                             className={`px-4 py-2 text-sm font-bold ${activeTab === 'move' ? 'text-[#c5a880] border-b-2 border-[#c5a880]' : 'text-gray-500 hover:text-gray-300'}`}
                          >
                              Pindah Pekerja
                          </button>
                      </div>

                      {activeTab === 'info' && (
                          <>
                              <p className="text-sm text-gray-300 mb-4">{selectedAsset.description}</p>

                              <div className="grid grid-cols-2 gap-4 mb-6">
                                  <div className="bg-black/50 p-3 rounded border border-[#333]">
                                      <p className="text-xs text-gray-500">Status</p>
                                      <p className={`font-bold ${selectedAsset.underConstruction ? 'text-orange-400' : selectedAsset.status === 'Halted (Terhenti)' ? 'text-red-400' : 'text-green-400'}`}>
                                          {selectedAsset.underConstruction ? 'Sedang Dibangun' : selectedAsset.status}
                                      </p>
                                  </div>
                                  <div className="bg-black/50 p-3 rounded border border-[#333]">
                                      <p className="text-xs text-gray-500">Jumlah Dimiliki</p>
                                      <p className="font-bold text-white">{selectedAsset.quantity}</p>
                                  </div>
                              </div>

                              {selectedAsset.underConstruction && selectedAsset.constructionCompleteAt && (
                                  <div className="mb-6 p-3 bg-orange-900/20 border border-orange-900/50 rounded">
                                      <p className="text-xs text-orange-400 mb-1 flex items-center gap-2"><Clock size={14}/> Selesai Dalam</p>
                                      <p className="text-lg font-bold text-gray-200">
                                          <Countdown targetDate={selectedAsset.constructionCompleteAt} />
                                      </p>
                                  </div>
                              )}

                              <div className="mb-6">
                                  <h3 className="text-sm font-bold text-gray-400 border-b border-[#333] pb-2 mb-3">Pekerja ({selectedAsset.assignedWorkers.length})</h3>
                                  {selectedAsset.assignedWorkers.length === 0 ? (
                                      <p className="text-xs text-gray-500 italic">Tidak ada pekerja yang ditugaskan.</p>
                                  ) : (
                                      <ul className="space-y-2">
                                          {selectedAsset.assignedWorkers.map((w, i) => (
                                              <li key={i} className="text-xs bg-black/40 p-2 rounded flex justify-between items-center border border-[#333]">
                                                  <span className="text-gray-300"><Pickaxe size={12} className="inline mr-2 text-gray-500"/> {w.workerId.startsWith('NPC') ? w.workerId.substring(0, 15) + '...' : 'Pemain: ' + w.workerId}</span>
                                                  <span className="text-orange-400 flex items-center gap-1">
                                                      {w.endTime && <Clock size={10} />}
                                                      {w.endTime ? <Countdown targetDate={w.endTime} /> : 'Permanen'}
                                                  </span>
                                              </li>
                                          ))}
                                      </ul>
                                  )}
                              </div>

                              <div className="border-t border-[#333] pt-4 mt-auto">

                                  <button onClick={handleWorkSelf} disabled={actionLoading || (!selectedAsset.underConstruction && selectedAsset.assignedWorkers.length >= 1) || selectedAsset.assignedWorkers.some(w => w.workerId === user?.id)} className="w-full bg-[#8b0000]/80 hover:bg-[#8b0000] disabled:bg-gray-800 disabled:text-gray-500 text-red-100 text-sm py-2 rounded transition-colors font-bold flex items-center justify-center gap-2 mb-2">
                                      <Pickaxe size={16} /> Kerja Mandiri di Aset Ini
                                  </button>
                                  <button onClick={() => router.push('/worker')} className="w-full bg-[#1f402e] hover:bg-green-900 text-green-100 text-sm py-2 rounded transition-colors font-bold flex items-center justify-center gap-2">
                                      <Pickaxe size={16} /> Sewa Pekerja dari Papan
                                  </button>
                                  {!selectedAsset.underConstruction && selectedAsset.assignedWorkers.length >= 1 && (
                                      <p className="text-[10px] text-red-400 mt-2 text-center">Aset yang sudah jadi hunknowna bisa ditangani 1 pekerja.</p>
                                  )}
                              </div>
                          </>
                      )}

                      {activeTab === 'move' && (
                          <div className="space-y-4">
                              <p className="text-sm text-gray-400 mb-2">Pindahkan pekerja dari aset ini ke aset lain milikmu.</p>

                              {selectedAsset.assignedWorkers.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-6">Tidak ada pekerja di aset ini untuk dipindahkan.</p>
                              ) : (
                                  <>
                                      <div>
                                          <label className="block text-xs text-gray-500 mb-1">Pilih Pekerja</label>
                                          <select
                                              value={selectedWorkerIdToMove}
                                              onChange={(e) => setSelectedWorkerIdToMove(e.target.value)}
                                              className="w-full bg-black border border-[#555] rounded px-3 py-2 text-white focus:outline-none focus:border-[#c5a880] text-sm"
                                          >
                                              <option value="" disabled>-- Pilih Pekerja --</option>
                                              {selectedAsset.assignedWorkers.map((w, i) => (
                                                  <option key={i} value={w.workerId}>{w.workerId.startsWith('NPC') ? w.workerId.substring(0, 15) + '...' : w.workerId}</option>
                                              ))}
                                          </select>
                                      </div>

                                      <div>
                                          <label className="block text-xs text-gray-500 mb-1">Pilih Aset Tujuan</label>
                                          <select
                                              value={targetAssetId}
                                              onChange={(e) => setTargetAssetId(e.target.value)}
                                              className="w-full bg-black border border-[#555] rounded px-3 py-2 text-white focus:outline-none focus:border-[#c5a880] text-sm"
                                          >
                                              <option value="" disabled>-- Pilih Aset --</option>
                                              {assets.filter(a => a.id !== selectedAsset.id).map(a => (
                                                  <option key={a.id} value={a.id} disabled={!a.underConstruction && a.assignedWorkers.length >= 1}>
                                                      {a.name} {!a.underConstruction && a.assignedWorkers.length >= 1 ? '(Penuh)' : ''}
                                                  </option>
                                              ))}
                                          </select>
                                      </div>

                                      <button
                                          onClick={handleMoveWorker}
                                          disabled={moveLoading || !selectedWorkerIdToMove || !targetAssetId}
                                          className="w-full bg-blue-900/40 hover:bg-blue-800 disabled:bg-gray-800 disabled:text-gray-500 text-blue-100 py-2 rounded transition-colors font-bold mt-4"
                                      >
                                          {moveLoading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Pindahkan'}
                                      </button>
                                  </>
                              )}
                          </div>
                      )}

                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
