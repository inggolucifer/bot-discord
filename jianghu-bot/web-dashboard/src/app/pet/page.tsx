'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getRarityColor, getRarityTextClass } from '@/lib/rarity';
import FallbackImage from '@/components/FallbackImage';
import { Shield, Sword, Heart, Zap, XCircle, Loader2, Footprints, AlertCircle, RefreshCw, Drumstick, PlusSquare, Swords } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

const ranks = ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];

interface PetData {
  instanceId: string;
  petId: {
    _id: string;
    name: string;
    description: string;
    element: string;
    rank: string;
    imageUrl: string;
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
  const { user, hasCharacter } = useAuthStore();
  const router = useRouter();
  const [pets, setPets] = useState<PetData[]>([]);
  const [petSlots, setPetSlots] = useState(0);
  const [activeRank, setActiveRank] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Modal States
  const [selectedPet, setSelectedPet] = useState<PetData | null>(null);
  const [modalType, setModalType] = useState<any>(null);
  const [consumables, setConsumables] = useState<{foodItems: any[], healItems: any[]}>({foodItems: [], healItems: []});
  const [selectedItem, setSelectedItem] = useState('');
  const [newName, setNewName] = useState('');
  const [opponentId, setOpponentId] = useState('');

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

  const fetchConsumables = async () => {
      try {
          const res = await api.get('/pet/consumables');
          setConsumables(res.data.data);
      } catch (err: any) {
          console.error(err);
      }
  };

  useEffect(() => {
    if (!hasCharacter) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    setTimeout(() => fetchPets(), 0);
    setTimeout(() => fetchConsumables(), 0);

  }, [hasCharacter]);

  const handleAction = async (endpoint: string, payload: any) => {
      setActionLoading(true);
      setMessage(null);
      try {
          const res = await api.post(endpoint, payload);
          setMessage({ type: 'success', text: res.data.message });
          await setTimeout(() => fetchPets(), 0);
          await setTimeout(() => fetchConsumables(), 0); // Refresh inventory items
          closeModal();
      } catch (err: any) {
          setMessage({ type: 'error', text: err.response?.data?.error || 'Gagal memproses aksi.' });
      } finally {
          setActionLoading(false);
      }
  };


  const [releaseConfirmText, setReleaseConfirmText] = useState("");

  const handleRelease = (instanceId: string) => {
      const pet = pets.find(p => p.instanceId === instanceId);
      if (pet) {
          setSelectedPet(pet);
          setModalType('release');
          setReleaseConfirmText("");
      }
  };

  const _oldHandleRelease = async (instanceId: string) => {
    if (!confirm('Apakah kamu yakin ingin melepas pet ini? Tindakan ini tidak bisa dibatalkan.')) return;
    await handleAction('/pet/release', { instanceId });
  };

  const openModal = (pet: PetData, type: 'feed' | 'heal' | 'rename' | 'battle') => {
      setSelectedPet(pet);
      setModalType(type);
      setSelectedItem('');
      setNewName(pet.nickname || pet.petId.name);
      setOpponentId('');
      setMessage(null);
  };

  const closeModal = () => {
      setSelectedPet(null);
      setModalType(null);
  };

  if (loading) {
    return <LoadingState text="Membuka Kandang Spiritual..." />;
  }

  const filteredPets = pets.filter(pet => activeRank === 'all' || (pet.petId.rank || 'common').toLowerCase() === activeRank.toLowerCase());

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">

      <PageHeader
        title="Pet Spiritual"
        description="Latih dan rawat rekan spiritualmu."
        action={
           <div className="flex flex-wrap sm:flex-row gap-3">
              <div className="bg-[#111] border border-[#333] px-4 py-2 rounded-md flex flex-wrap items-center justify-between sm:justify-start gap-4">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Slot Terpakai</span>
                  <span className="text-lg font-bold text-[#c5a880] font-mono">{pets.length} / {petSlots}</span>
              </div>
              <select
                className="bg-[#111] border border-[#444] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c5a880] appearance-none"
                value={activeRank}
                onChange={(e) => setActiveRank(e.target.value)}
              >
                {ranks.map(r => <option key={r} value={r.toLowerCase()}>{r === 'All' ? 'Semua Rank' : r}</option>)}
              </select>
           </div>
        }
      />

      {message && (
        <div className={`p-4 rounded-lg flex items-center justify-between border ${message.type === 'error' ? 'bg-red-900/20 border-red-900/50 text-red-400' : 'bg-green-900/20 border-green-900/50 text-green-400'}`}>
          <div className="flex items-center gap-2">
             {message.type === 'error' ? <AlertCircle size={16} /> : <Footprints size={16} />}
             <span className="text-sm">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-500 hover:text-white transition-colors"><XCircle size={16} /></button>
        </div>
      )}

      {!hasCharacter ? (
          <EmptyState
            icon={<Footprints />}
            title="Akses Ditolak"
            description="Silakan login menggunakan Discord untuk melihat Pet Anda."
          />
      ) : pets.length === 0 ? (
          <EmptyState
            icon={<Footprints />}
            title="Kandang Kosong"
            description="Anda belum memiliki pet. Dapatkan pet dari Gacha atau Pasar."
          />
      ) : filteredPets.length === 0 ? (
          <EmptyState
            title="Tidak Ditemukan"
            description={`Tidak ada pet dengan rank ${activeRank}.`}
          />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredPets.map((pet) => (
            <div key={pet.instanceId} className={`bg-[#111] border p-4 sm:p-5 rounded-lg flex flex-col relative group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg ${getRarityColor(pet.petId.rank)} hover:border-[#c5a880]/50`}>
              <div className="flex gap-4 mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-md border border-[#333] flex-shrink-0 flex items-center justify-center p-1 relative shadow-inner">
                  <FallbackImage
                    src={pet.petId.imageUrl || ""}
                    alt={pet.petId.name}
                    className="max-w-full max-h-full object-contain"
                    fallbackNode={<div className="text-3xl">🐉</div>}
                  />
                  {pet.isLocked && (
                    <div className="absolute -bottom-2 -right-2 bg-red-900 text-white text-[9px] px-1.5 py-0.5 rounded border border-red-500 shadow">
                      In Battle
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-sm sm:text-base leading-tight mb-1.5 ${getRarityTextClass(pet.petId.rank)} truncate`} title={pet.nickname || pet.petId.name}>
                    {pet.nickname || pet.petId.name}
                  </h3>
                  {pet.nickname && <p className="text-[10px] text-gray-500 truncate mt-0.5">Asli: {pet.petId.name}</p>}

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 h-4 border-[#333] bg-black/40">Lvl {pet.level}</Badge>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 h-4 border-[#333] bg-black/40">{pet.petId.element}</Badge>
                    <Badge variant="rank" rank={pet.petId.rank} className="text-[9px] sm:text-[10px] py-0 h-4">{pet.petId.rank}</Badge>
                  </div>
                </div>
              </div>

              {/* Status Bars */}
              <div className="space-y-3 mb-5 bg-black/40 p-3 sm:p-4 rounded-md border border-[#333]/50">
                <div>
                  <div className="flex justify-between text-[9px] sm:text-[10px] text-gray-400 mb-1.5">
                    <span>HP</span>
                    <span className="font-mono">{pet.hp} / {pet.maxHp} ({Math.round((pet.hp/pet.maxHp)*100)}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#222] rounded-full overflow-hidden border border-[#333]">
                    <div className="h-full bg-red-600 transition-all shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{width: `${(pet.hp/pet.maxHp)*100}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] sm:text-[10px] text-gray-400 mb-1.5">
                    <span>EXP</span>
                    <span className="font-mono">{pet.exp} / {pet.level*100}</span>
                  </div>
                  <div className="h-1.5 bg-[#222] rounded-full overflow-hidden border border-[#333]">
                    <div className="h-full bg-blue-500 transition-all shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: `${(pet.exp/(pet.level*100))*100}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] sm:text-[10px] text-gray-400 mb-1.5">
                    <span>Kenyang</span>
                    <span className="font-mono">{pet.hunger}%</span>
                  </div>
                  <div className="h-1.5 bg-[#222] rounded-full overflow-hidden border border-[#333]">
                    <div className="h-full bg-green-500 transition-all shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{width: `${pet.hunger}%`}}></div>
                  </div>
                </div>
              </div>

              {/* Combat Stats */}
              <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs mb-5">
                 <div className="flex items-center gap-2 text-gray-300 bg-black/30 p-2 rounded border border-[#333]/50">
                    <Heart size={14} className="text-red-400 shrink-0"/> <span className="font-mono">{pet.maxHp}</span> HP
                 </div>
                 <div className="flex items-center gap-2 text-gray-300 bg-black/30 p-2 rounded border border-[#333]/50">
                    <Sword size={14} className="text-orange-400 shrink-0"/> <span className="font-mono">{pet.atk}</span> ATK
                 </div>
                 <div className="flex items-center gap-2 text-gray-300 bg-black/30 p-2 rounded border border-[#333]/50">
                    <Shield size={14} className="text-blue-400 shrink-0"/> <span className="font-mono">{pet.def}</span> DEF
                 </div>
                 <div className="flex items-center gap-2 text-gray-300 bg-black/30 p-2 rounded border border-[#333]/50">
                    <Zap size={14} className="text-yellow-400 shrink-0"/> <span className="font-mono">{pet.spd}</span> SPD
                 </div>
              </div>

              {/* Interaction Buttons */}
              <div className="mt-auto pt-4 border-t border-[#333] grid grid-cols-4 gap-2">
                 <Button variant="outline" size="sm" className="h-9 px-0" onClick={() => openModal(pet, 'feed')} disabled={pet.isLocked} title="Beri Makan"><Drumstick size={16} /></Button>
                 <Button variant="outline" size="sm" className="h-9 px-0 border-green-900/50 text-green-500 hover:bg-green-900/20" onClick={() => openModal(pet, 'heal')} disabled={pet.isLocked} title="Heal"><PlusSquare size={16} /></Button>
                 <Button variant="outline" size="sm" className="h-9 px-0 border-blue-900/50 text-blue-400 hover:bg-blue-900/20" onClick={() => openModal(pet, 'battle')} disabled={pet.isLocked} title="Battle"><Swords size={16} /></Button>
                 <Button variant="outline" size="sm" className="h-9 px-0" onClick={() => openModal(pet, 'rename')} disabled={pet.isLocked} title="Ganti Nama">📝</Button>
              </div>
              <div className="mt-2">
                 <Button variant="destructive" size="sm" className="w-full h-8 text-[10px]" onClick={() => handleRelease(pet.instanceId)} disabled={actionLoading || pet.isLocked}>
                    <XCircle size={12} className="mr-1"/> Lepaskan Pet
                 </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Modal for Pet Actions */}
      <Modal isOpen={!!selectedPet && !!modalType} onClose={closeModal} title={modalType === 'feed' ? 'Beri Makan Pet' : modalType === 'heal' ? 'Sembuhkan Pet' : modalType === 'rename' ? 'Ubah Nama Pet' : 'Tantang Duel'} maxWidth="sm">
          {selectedPet && (
              <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-[#333]">
                      <div className="w-12 h-12 bg-[#111] rounded border border-[#444] p-1 flex items-center justify-center">
                          <FallbackImage src={selectedPet.petId.imageUrl || ""} alt={selectedPet.petId.name} fallbackNode={<span>🐉</span>} />
                      </div>
                      <div>
                          <p className="font-bold text-[#c5a880] text-sm">{selectedPet.nickname || selectedPet.petId.name}</p>
                          <p className="text-xs text-gray-400">Level {selectedPet.level}</p>
                      </div>
                  </div>

                  {modalType === 'feed' && (
                      <div>
                          <label className="block text-xs text-gray-400 mb-2">Pilih Makanan dari Inventory</label>
                          <select className="w-full bg-[#111] border border-[#444] rounded px-3 py-2 text-sm text-white focus:border-[#c5a880]" value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
                              <option value="" disabled>-- Pilih Makanan --</option>
                              {consumables.foodItems.map((item: any, i: number) => (
                                  <option key={i} value={item.item._id}>{item.item.name} (Stok: {item.quantity})</option>
                              ))}
                          </select>
                          {consumables.foodItems.length === 0 && <p className="text-xs text-red-400 mt-2">Tidak ada makanan pet di inventory.</p>}
                          <Button className="w-full mt-4" disabled={!selectedItem || actionLoading} onClick={() => handleAction('/pet/feed', { instanceId: selectedPet.instanceId, itemId: selectedItem })}>
                             {actionLoading ? 'Memproses...' : 'Beri Makan'}
                          </Button>
                      </div>
                  )}

                  {modalType === 'heal' && (
                      <div>
                          <label className="block text-xs text-gray-400 mb-2">Pilih Obat dari Inventory</label>
                          <select className="w-full bg-[#111] border border-[#444] rounded px-3 py-2 text-sm text-white focus:border-[#c5a880]" value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
                              <option value="" disabled>-- Pilih Obat --</option>
                              {consumables.healItems.map((item: any, i: number) => (
                                  <option key={i} value={item.item._id}>{item.item.name} (Stok: {item.quantity})</option>
                              ))}
                          </select>
                          {consumables.healItems.length === 0 && <p className="text-xs text-red-400 mt-2">Tidak ada obat pet di inventory.</p>}
                          <Button className="w-full mt-4" variant="success" disabled={!selectedItem || actionLoading || selectedPet.hp >= selectedPet.maxHp} onClick={() => handleAction('/pet/heal', { instanceId: selectedPet.instanceId, itemId: selectedItem })}>
                             {actionLoading ? 'Memproses...' : 'Sembuhkan'}
                          </Button>
                      </div>
                  )}

                  {modalType === 'rename' && (
                      <div>
                          <label className="block text-xs text-gray-400 mb-2">Nama Baru (Maks 16 karakter)</label>
                          <input type="text" maxLength={16} value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-[#111] border border-[#444] rounded px-3 py-2 text-sm text-white focus:border-[#c5a880]" />
                          <Button className="w-full mt-4" disabled={!newName || actionLoading} onClick={() => handleAction('/pet/rename', { instanceId: selectedPet.instanceId, newName })}>
                             {actionLoading ? 'Menyimpan...' : 'Simpan Nama'}
                          </Button>
                      </div>
                  )}


                  {modalType === 'release' && (
                      <div className="space-y-4">
                          <p className="text-gray-300 text-sm">Apakah kamu yakin ingin melepaskan <strong>{selectedPet.nickname || selectedPet.petId.name}</strong> ke alam liar?</p>
                          <p className="text-red-400 text-xs">Tindakan ini permanen. Pet akan hilang selamanya. Ketik <strong>LEPASKAN</strong> untuk konfirmasi.</p>
                          <input
                            type="text"
                            className="w-full bg-[#111] border border-[#444] rounded p-2 text-white text-sm focus:border-red-500"
                            value={releaseConfirmText}
                            onChange={(e) => setReleaseConfirmText(e.target.value)}
                            placeholder="LEPASKAN"
                          />
                          <Button className="w-full mt-4" variant="destructive" disabled={actionLoading || releaseConfirmText !== 'LEPASKAN'} onClick={() => handleAction('/pet/release', { instanceId: selectedPet.instanceId })}>
                             {actionLoading ? 'Melepaskan...' : 'Lepaskan Pet'}
                          </Button>
                      </div>
                  )}

                  {modalType === 'battle' && (
                      <div>
                          <p className="text-xs text-gray-400 mb-4 bg-blue-900/20 p-2 rounded border border-blue-900/50">Tantang pemain lain untuk duel pet. Pemain lawan harus menerima tantangan ini melalui Discord.</p>
                          <label className="block text-xs text-gray-400 mb-2">ID Discord Lawan</label>
                          <input type="text" placeholder="Contoh: 1234567890..." value={opponentId} onChange={e => setOpponentId(e.target.value)} className="w-full bg-[#111] border border-[#444] rounded px-3 py-2 text-sm text-white focus:border-[#c5a880] font-mono" />
                          <Button className="w-full mt-4" variant="destructive" disabled={!opponentId || actionLoading} onClick={() => handleAction('/pet/battle/challenge', { petInstanceId: selectedPet.instanceId, opponentDiscordId: opponentId })}>
                             {actionLoading ? 'Mengirim Tantangan...' : 'Kirim Tantangan'}
                          </Button>
                      </div>
                  )}
              </div>
          )}
      </Modal>

    </div>
  );
}
