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
        const res = await api.get('/sect/profile');
        setSect(res.data.data);
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
      <div className="text-center space-y-4 mb-10 relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none flex justify-center z-0">
           <span className="text-[120px] text-green-900/30 leading-none select-none">⛩️</span>
        </div>
        <h1 className="text-4xl font-bold font-serif text-green-500 relative z-10 drop-shadow-md">Balai Sekte</h1>
        <p className="text-gray-400 relative z-10">Pusat logistik dan koordinasi sekte Anda.</p>
      </div>

      <div className="bg-[#1a1a1a] jianghu-border border-green-900/50 rounded-lg p-6 min-h-[40vh] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-900/10 rounded-bl-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#c5a880]/5 rounded-tr-full pointer-events-none"></div>
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

             <div className="border-t border-green-900/30 pt-8 mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left relative z-10">
                <div className="bg-black/60 p-4 rounded border border-green-900/40 hover:border-green-600 transition-colors">
                   <h3 className="font-bold text-green-400 mb-2 flex items-center gap-2"><Users size={16}/> Informasi Keanggotaan</h3>
                   <p className="text-sm text-gray-300 font-semibold mb-1">Jumlah Anggota: {sect.memberCount as number}</p>
                   <p className="text-xs text-gray-500">Manajemen anggota penuh tersedia di bot Discord (menggunakan komando /sekte).</p>
                </div>
                <div className="bg-black/60 p-4 rounded border border-[#c5a880]/40 hover:border-[#c5a880] transition-colors">
                   <h3 className="font-bold text-[#c5a880] mb-2 flex items-center gap-2"><Banknote size={16}/> Gudang Sekte</h3>
                   <p className="text-sm text-gray-300 font-semibold mb-1">Total Kekayaan: {(sect.totalWealth as number).toLocaleString()} Silver</p>
                   <p className="text-xs text-gray-500">Aset: Spirit ({(sect.currency as Record<string, number>).spirit}), Gold ({(sect.currency as Record<string, number>).gold}), Jade ({(sect.currency as Record<string, number>).jade})</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}