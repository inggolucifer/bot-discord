import { useState, useEffect } from 'react';
import { X, Loader2, Coins, Shield, Swords, Activity, MapPin, Zap } from 'lucide-react';
import api from '@/lib/api';
import FallbackImage from '@/components/FallbackImage';

interface PlayerProfileModalProps {
  discordId: string;
  onClose: () => void;
}

export default function PlayerProfileModal({ discordId, onClose }: PlayerProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/player/public-profile/${discordId}`);
        setProfile(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Gagal memuat profil pemain.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [discordId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#c5a880]/50 rounded-lg shadow-[0_0_20px_rgba(197,168,128,0.2)] max-w-md w-full relative overflow-hidden flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10 bg-black/50 rounded-full p-1"
        >
          <X size={18} />
        </button>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-[#c5a880]">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p>Mencari jejak pendekar di Jianghu...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            <p>{error}</p>
          </div>
        ) : profile ? (
          <>
            {/* Header / Avatar */}
            <div className="relative h-32 bg-black border-b border-[#333]">
                <div className="absolute inset-0 opacity-30">
                    {/* Optional: background pattern */}
                </div>
                <div className="absolute -bottom-10 left-6">
                    <div className="w-24 h-24 rounded-full border-4 border-[#1a1a1a] bg-black overflow-hidden shadow-lg">
                        <FallbackImage
                            src={profile.characterImage || ''}
                            alt={profile.characterName}
                            fallbackNode={<div className="w-full h-full flex items-center justify-center text-4xl">👤</div>}
                        />
                    </div>
                </div>
            </div>

            <div className="pt-12 px-6 pb-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#c5a880] font-serif leading-tight">{profile.characterName}</h2>
                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                            <MapPin size={12}/> {profile.sect || 'Tanpa Sekte'}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${profile.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {profile.status === 'active' ? 'Aktif' : 'Mati/Beku'}
                        </span>
                    </div>
                </div>

                {/* System Cultivation */}
                <div className="bg-blue-900/10 p-3 rounded border border-blue-900/30 mb-4 flex items-center gap-3">
                    <Zap size={20} className="text-blue-400"/>
                    <div>
                        <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Kultivasi Sistem</p>
                        <p className="text-sm font-bold text-blue-100">
                            {profile.systemCultivation?.realm || 'Fondasi Fana'} <span className="text-blue-300 font-normal text-xs ml-1">(Tahap {profile.systemCultivation?.stage || 0})</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-black/50 p-2 rounded border border-[#333] flex items-center gap-2">
                        <Activity size={16} className="text-[#c5a880]"/>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Ranah RPG</p>
                            <p className="text-sm font-bold text-gray-200">{profile.realm}</p>
                        </div>
                    </div>
                    <div className="bg-black/50 p-2 rounded border border-[#333] flex items-center gap-2">
                        <Swords size={16} className="text-red-400"/>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Tahap RPG</p>
                            <p className="text-sm font-bold text-gray-200">{profile.stage}</p>
                        </div>
                    </div>
                </div>

                {/* Stats Summary */}
                <h3 className="text-sm font-bold text-gray-400 border-b border-[#333] pb-1 mb-3">Statistik Publik</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                        <span className="text-gray-400 flex items-center gap-2"><Coins size={14}/> Total Kekayaan</span>
                        <span className="font-bold text-yellow-500">{profile.totalWealth?.toLocaleString('id-ID') || 0} Copper</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                        <span className="text-gray-400 flex items-center gap-2"><Shield size={14}/> Total Asset / Bangunan</span>
                        <span className="font-bold text-gray-200">{profile.totalAssets || 0}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/30 p-2 rounded">
                        <span className="text-gray-400 flex items-center gap-2">🐾 Total Pet / Tunggangan</span>
                        <span className="font-bold text-gray-200">{profile.totalPets || 0}</span>
                    </div>
                </div>

                {profile.customStatus && (
                    <div className="mt-4 p-3 bg-black/40 rounded border border-[#333] italic text-sm text-gray-300 text-center">
                        &quot;{profile.customStatus}&quot;
                    </div>
                )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
