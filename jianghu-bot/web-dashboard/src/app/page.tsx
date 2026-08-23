'use client';

import { Coins, Flame, Scroll, Users, Sword } from "lucide-react";
import FallbackImage from "@/components/FallbackImage";
import { useAuthStore } from '@/lib/store';
import { useEffect, useState } from "react";
import api from '@/lib/api';

export default function Home() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get('/player/profile');
        setProfile(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-[#1a1a1a] jianghu-border p-8 text-center">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] pointer-events-none"></div>
        <h1 className="text-3xl md:text-5xl font-bold mb-4 font-serif text-[#c5a880] tracking-wide">
          Gerbang Menuju Dunia Persilatan
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          Selamat datang di Pusat Manajemen Meta-Economy Jianghu RP.
          Silakan login menggunakan akun Discord Anda untuk mengelola Kultivasi, Inventory, dan Aset Anda secara langsung.
        </p>

        {/* Mock Character Status Card (Will be dynamic later) */}
        <div className="bg-black/60 border border-[#333] rounded-lg p-6 flex flex-col md:flex-row items-center gap-6 max-w-3xl mx-auto text-left relative z-10 backdrop-blur-sm">

          {user && profile ? (
            <>
              <div className="relative w-24 h-24 rounded-full border-2 border-[#c5a880] overflow-hidden flex-shrink-0 bg-gray-800 shadow-[0_0_15px_rgba(197,168,128,0.3)]">
                 <FallbackImage
                   src={(profile.characterImage as string) || (profile.discordAvatar as string) || "https://cdn.discordapp.com/embed/avatars/0.png"}
                   alt="Character Avatar"
                   className="w-full h-full object-cover"
                   fallbackHtml='<div class="absolute inset-0 flex items-center justify-center text-4xl">🧑‍🎤</div>'
                 />
              </div>

              <div className="flex-grow space-y-2 w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white font-serif">{profile.characterName as string}</h2>
                    <p className="text-[#c5a880] flex items-center gap-2 text-sm">
                      <Flame size={14} /> {profile.realm as string} - {profile.stage as string}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs bg-[#1f402e] text-green-300 px-2 py-1 rounded border border-green-800">
                      <Users size={12} /> {profile.sect as string}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-gray-900 rounded-full h-2 mt-4 border border-[#333]">
                  <div className="bg-gradient-to-r from-yellow-700 to-[#c5a880] h-2 rounded-full" style={{width: '0%'}}></div>
                </div>
                <p className="text-xs text-right text-gray-500 mt-1">Status Kultivasi: {profile.realm as string} ({profile.stage as string})</p>
              </div>
            </>
          ) : (
             <div className="w-full text-center py-6">
                {loading ? (
                  <p className="text-[#c5a880] animate-pulse">Memuat Profil...</p>
                ) : (
                  <p className="text-gray-500">Silakan login melalui Discord di sudut kanan atas untuk melihat profil Anda.</p>
                )}
             </div>
          )}
        </div>
      </section>

      {/* Currency & Quick Stats */}
      {user && profile && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col items-center justify-center gap-2">
             <div className="w-10 h-10 rounded-full bg-gray-700/30 flex items-center justify-center text-gray-300 border border-gray-600/50">
                <Coins size={20} />
             </div>
             <span className="text-xs text-gray-400">Silver Tael</span>
             <span className="text-xl font-bold text-gray-300">{((profile.currency as Record<string, number>)?.silver) || 0}</span>
          </div>
          <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col items-center justify-center gap-2">
             <div className="w-10 h-10 rounded-full bg-yellow-900/30 flex items-center justify-center text-yellow-500 border border-yellow-700/50">
                <Coins size={20} />
             </div>
             <span className="text-xs text-gray-400">Gold Tael</span>
             <span className="text-xl font-bold text-yellow-500">{((profile.currency as Record<string, number>)?.gold) || 0}</span>
          </div>
          <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
             <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center text-green-400 border border-green-700/50">
                <Coins size={20} />
             </div>
             <span className="text-xs text-gray-400">Jade Tael</span>
             <span className="text-xl font-bold text-green-400">{((profile.currency as Record<string, number>)?.jade) || 0}</span>
          </div>
          <div className="bg-[#1a1a1a] jianghu-border p-4 rounded-lg flex flex-col items-center justify-center gap-2">
             <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-300 border border-blue-900/50">
                <Coins size={20} />
             </div>
             <span className="text-xs text-gray-400">Spirit Stone</span>
             <span className="text-xl font-bold text-blue-300">{((profile.currency as Record<string, number>)?.spirit) || 0}</span>
          </div>
        </section>
      )}

      {/* Quick Actions (Visual Only for now) */}
      <section className="grid md:grid-cols-3 gap-6">
        <a href="/inventory" className="group relative bg-[#1a1a1a] jianghu-border p-6 rounded-lg hover:border-[#c5a880] hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(197,168,128,0.1)] transition-all duration-300 flex flex-col items-center text-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#c5a880]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="p-4 bg-black rounded-full text-[#c5a880] group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(197,168,128,0.4)] transition-all duration-300 relative z-10">
            <Scroll size={32} />
          </div>
          <h3 className="font-bold font-serif text-lg text-white relative z-10">Gudang Penyimpanan</h3>
          <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors relative z-10">Kelola inventory, material, dan mulai meracik item (Crafting).</p>
        </a>

        <a href="/assets" className="group relative bg-[#1a1a1a] jianghu-border p-6 rounded-lg hover:border-[#8b0000] hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(139,0,0,0.1)] transition-all duration-300 flex flex-col items-center text-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#8b0000]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="p-4 bg-black rounded-full text-[#8b0000] group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(139,0,0,0.5)] transition-all duration-300 relative z-10">
            <Sword size={32} />
          </div>
          <h3 className="font-bold font-serif text-lg text-white relative z-10">Manajemen Aset</h3>
          <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors relative z-10">Tugaskan pekerja ke tambang, ladang, dan klaim hasil produksi.</p>
        </a>

        <a href="/sect" className="group relative bg-[#1a1a1a] jianghu-border p-6 rounded-lg hover:border-green-700 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(21,128,61,0.1)] transition-all duration-300 flex flex-col items-center text-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-green-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="p-4 bg-black rounded-full text-green-600 group-hover:text-green-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(21,128,61,0.4)] transition-all duration-300 relative z-10">
            <Users size={32} />
          </div>
          <h3 className="font-bold font-serif text-lg text-white relative z-10">Balai Sekte</h3>
          <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors relative z-10">Pusat logistik dan komunikasi bagi anggota sekte Anda.</p>
        </a>
      </section>
    </div>
  );
}
