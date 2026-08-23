'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Loader2, Users, Shield, Banknote } from 'lucide-react';
import FallbackImage from '@/components/FallbackImage';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function SectPage() {
  const [sect, setSect] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const fetchSect = async () => {
      try {
        setLoading(true);
        // Note: For full implementation, this should fetch actual sect data based on player's sect string
        // For now, we will query player's sect from profile and mock the rest if no specific endpoint exists,
        // or we could add a new endpoint /api/player/sect
        const res = await api.get('/player/profile');
        const profile = res.data.data;

        if (!profile.sect || profile.sect === 'Tanpa Sekte (Rogue Cultivator)') {
             setSect(null);
        } else {
             // In phase 4, we establish a basic page. A real fetch to a sect model could be done here.
             setSect({
                 name: profile.sect,
                 description: 'Balai pusat perkumpulan para pendekar dan kultivator.',
                 role: 'Anggota' // this could be derived from the database if we build a proper sect API
             });
        }
      } catch (err: unknown) {
        console.error(err);
        setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal memuat data sekte.');
      } finally {
        setLoading(false);
      }
    };

    fetchSect();
  }, [user, router]);

  if (loading) {
    return <div className="flex justify-center p-20 text-[#c5a880]"><Loader2 className="animate-spin" size={48} /></div>;
  }

  if (error) {
    return <div className="text-center p-20 text-red-500 font-bold">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-bold font-serif text-[#c5a880]">Balai Sekte</h1>
        <p className="text-gray-400">Pusat logistik dan koordinasi sekte (Dalam Pengembangan).</p>
      </div>

      <div className="bg-[#1a1a1a] jianghu-border rounded-lg p-6 min-h-[40vh] flex flex-col items-center justify-center">
        {!sect ? (
          <div className="text-center space-y-4">
             <Users size={48} className="mx-auto text-gray-600" />
             <h2 className="text-xl font-bold text-gray-300">Anda adalah Rogue Cultivator</h2>
             <p className="text-gray-500 text-sm max-w-md mx-auto">
               Anda saat ini tidak tergabung dalam sekte manapun. Cari sekte di Discord dan minta undangan dari Ketua Sekte untuk bergabung.
             </p>
          </div>
        ) : (
          <div className="text-center w-full space-y-6">
             <div className="w-24 h-24 mx-auto bg-black rounded-full border-2 border-green-700 flex items-center justify-center mb-4 overflow-hidden">
                <FallbackImage
                   src=""
                   alt="Sect Banner"
                   fallbackHtml='<span class="text-4xl">⛩️</span>'
                   className="w-full h-full object-cover"
                />
             </div>

             <h2 className="text-3xl font-bold text-white font-serif">{sect.name as string}</h2>
             <p className="text-gray-400 max-w-lg mx-auto">{sect.description as string}</p>

             <div className="inline-flex items-center gap-2 bg-green-900/20 text-green-400 px-4 py-2 rounded-full border border-green-800">
               <Shield size={16} /> Jabatan Anda: {sect.role as string}
             </div>

             <div className="border-t border-[#333] pt-8 mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-black/40 p-4 rounded border border-[#333]">
                   <h3 className="font-bold text-[#c5a880] mb-2 flex items-center gap-2"><Users size={16}/> Informasi Keanggotaan</h3>
                   <p className="text-sm text-gray-500">Daftar anggota dan struktur sekte (Segera Hadir)</p>
                </div>
                <div className="bg-black/40 p-4 rounded border border-[#333]">
                   <h3 className="font-bold text-[#c5a880] mb-2 flex items-center gap-2"><Banknote size={16}/> Gudang Sekte</h3>
                   <p className="text-sm text-gray-500">Manajemen kas dan sumber daya sekte (Segera Hadir)</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}