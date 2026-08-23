'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import FallbackImage from '@/components/FallbackImage';
import { Loader2, Heart, Sword, Shield, Zap, XCircle } from 'lucide-react';

interface PetData {
  instanceId: string;
  petId: {
    _id: string;
    name: string;
    imageUrl: string;
    element: string;
    rank: string;
    description: string;
  };
  nickname: string | null;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  hunger: number;
  isLocked: boolean;
}

export default function PetPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [pets, setPets] = useState<PetData[]>([]);
  const [petSlots, setPetSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    const fetchPets = async () => {
      try {
        const res = await api.get('/pet');
        setPets(res.data.data.pets);
        setPetSlots(res.data.data.petSlots);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => fetchPets(), 0);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleRelease = async (instanceId: string) => {
    if (!confirm('Apakah kamu yakin ingin melepas pet ini? Tindakan ini tidak bisa dibatalkan.')) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.post('/pet/release', { instanceId });
      setMessage({ type: 'success', text: res.data.message });
      setPets(pets.filter(p => p.instanceId !== instanceId));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Gagal melepaskan pet.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#c5a880] animate-pulse">Membuka Kandang Spiritual...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-[#333] pb-4">
        <div>
          <h1 className="text-3xl font-bold text-[#c5a880] font-serif flex items-center gap-3">
            🐾 Pet Spiritual
          </h1>
          <p className="text-gray-400 text-sm mt-1">Latih dan rawat rekan spiritualmu.</p>
        </div>
        <div className="bg-black/50 p-2 rounded border border-[#333] text-sm text-gray-300">
          Slot Tersedia: <span className="font-bold text-white">{pets.length} / {petSlots}</span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${message.type === 'error' ? 'bg-red-900/20 border-red-900 text-red-200' : 'bg-green-900/20 border-green-900 text-green-200'}`}>
          {message.text}
        </div>
      )}

      {pets.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-[#1a1a1a] rounded-lg border border-[#333]">
          Anda belum memiliki pet. Dapatkan pet dari Gacha atau Pasar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <div key={pet.instanceId} className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col relative group overflow-hidden">
              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20 bg-black rounded border border-[#333] flex-shrink-0 flex items-center justify-center p-1">
                  <FallbackImage
                    src={pet.petId.imageUrl || ""}
                    alt={pet.petId.name}
                    className="max-w-full max-h-full object-contain"
                    fallbackHtml='<div class="text-3xl">🐉</div>'
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#c5a880] text-lg leading-tight">
                    {pet.nickname || pet.petId.name}
                  </h3>
                  {pet.nickname && <p className="text-[10px] text-gray-500">Asli: {pet.petId.name}</p>}

                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">Lvl {pet.level}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">{pet.petId.element}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-300">{pet.petId.rank}</span>
                  </div>
                </div>
              </div>

              {/* Status Bars */}
              <div className="space-y-2 mb-4 bg-black/40 p-3 rounded border border-[#333]">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>HP ({pet.hp}/{pet.maxHp})</span>
                    <span>{Math.round((pet.hp/pet.maxHp)*100)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 transition-all" style={{width: `${(pet.hp/pet.maxHp)*100}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>EXP</span>
                    <span>{pet.exp}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all" style={{width: `${(pet.exp/(pet.level*100))*100}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Kenyang</span>
                    <span>{pet.hunger}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all" style={{width: `${pet.hunger}%`}}></div>
                  </div>
                </div>
              </div>

              {/* Combat Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                 <div className="flex items-center gap-2 text-gray-300 bg-black/30 p-1.5 rounded border border-[#333]/50">
                    <Heart size={14} className="text-red-400"/> {pet.maxHp} HP
                 </div>
                 <div className="flex items-center gap-2 text-gray-300 bg-black/30 p-1.5 rounded border border-[#333]/50">
                    <Sword size={14} className="text-orange-400"/> {pet.atk} ATK
                 </div>
                 <div className="flex items-center gap-2 text-gray-300 bg-black/30 p-1.5 rounded border border-[#333]/50">
                    <Shield size={14} className="text-blue-400"/> {pet.def} DEF
                 </div>
                 <div className="flex items-center gap-2 text-gray-300 bg-black/30 p-1.5 rounded border border-[#333]/50">
                    <Zap size={14} className="text-yellow-400"/> {pet.spd} SPD
                 </div>
              </div>

              <div className="mt-auto pt-4 border-t border-[#333] flex gap-2">
                 <button
                    disabled={true}
                    className="flex-1 bg-gray-800 text-gray-500 text-xs py-2 rounded cursor-not-allowed border border-gray-700"
                    title="Beri makan via Discord"
                  >
                    Beri Makan
                 </button>
                 <button
                    onClick={() => handleRelease(pet.instanceId)}
                    disabled={actionLoading || pet.isLocked}
                    className="flex-none bg-red-900/30 hover:bg-red-800 text-red-400 hover:text-white px-3 py-2 rounded transition-colors border border-red-900/50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Lepas Pet"
                 >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16}/>}
                 </button>
              </div>

              {pet.isLocked && (
                <div className="absolute top-2 right-2 bg-red-900 text-white text-[10px] px-2 py-1 rounded shadow">
                  Dalam Battle
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
