'use client';

import { Shield, Users, Banknote, Map, DollarSign, Pickaxe, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import FallbackImage from "@/components/FallbackImage";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

interface SectData {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  totalWealth: number;
  imageUrl: string;
  role: string; // role user saat ini
  currency: { copper: number; silver: number; gold: number; jade: number; spirit: number; }
}

interface Asset {
  id: string;
  name: string;
  description: string;
  quantity: number;
  underConstruction: boolean;
  status: string;
  imageUrl: string;
  profitAvailable: boolean;
  isCraftingStation: boolean;
  constructionCompleteAt: string | null;
}

interface ClaimResult {
    claimedCurrency: string[];
    claimedMaterial: string[];
    distributionSummary: string[];
}

const Countdown = ({ targetDate }: { targetDate: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(targetDate).getTime() - new Date().getTime();

            if (difference > 0) {
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft(`${hours}j ${minutes}m ${seconds}s`);
            } else {
                setTimeLeft('Selesai');
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return <span>{timeLeft}</span>;
};

export default function SectPage() {
  const { user } = useAuthStore();
  const [sect, setSect] = useState<SectData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const fetchSectData = async () => {
      try {
        const res = await api.get('/sect');
        setSect(res.data.data.sect);
        setAssets(res.data.data.assets);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Gagal memuat data sekte.');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (!user) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    setTimeout(() => fetchSectData(), 0);
  }, [user]);


  if (loading) {
      return <LoadingState text="Menghubungkan ke Balai Sekte..." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">
      <PageHeader
        title="Balai Sekte"
        description="Pusat informasi dan manajemen sekte Anda."
      />

      {!user && (
          <EmptyState
            icon={<Shield />}
            title="Akses Ditolak"
            description="Silakan login menggunakan Discord untuk melihat informasi Sekte."
          />
      )}

      {error && !sect && (
          <EmptyState
            icon={<Shield />}
            title="Pengembara Tanpa Tuan"
            description={error}
          />
      )}

      {user && sect && (
          <>
          {/* Hero Profil Sekte */}
          <div className="relative rounded-xl bg-[#111] border border-[#1f402e]/50 overflow-hidden shadow-[0_0_30px_rgba(31,64,46,0.1)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-900/10 rounded-bl-full pointer-events-none"></div>
            <div className="absolute -left-16 -top-16 w-64 h-64 bg-[#1f402e] rounded-full mix-blend-overlay filter blur-[100px] opacity-20"></div>

            <div className="p-6 sm:p-10 text-center relative z-10">
                 <div className="w-20 h-20 sm:w-28 sm:h-28 mx-auto bg-black rounded-full border-2 border-green-700 flex items-center justify-center mb-4 overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                    <FallbackImage
                       src={sect.imageUrl as string || ''}
                       alt="Sect Banner"
                       fallbackNode={<span className="text-4xl sm:text-5xl">⛩️</span>}
                       className="w-full h-full object-cover"
                    />
                 </div>

                 <h2 className="text-2xl sm:text-4xl font-bold text-white font-serif mb-2">{sect.name}</h2>
                 <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mb-6">{sect.description}</p>

                 <div className="inline-flex items-center gap-2 bg-[#1f402e]/30 text-green-400 px-4 py-2 rounded-full border border-green-800/50 shadow-inner text-sm font-semibold">
                   <Shield size={16} /> Jabatan: {sect.role}
                 </div>

                 <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <Card variant="green" className="bg-black/40">
                       <CardContent className="p-4 sm:p-5">
                          <h3 className="font-bold text-green-400 mb-2 flex items-center gap-2"><Users size={16}/> Informasi Keanggotaan</h3>
                          <p className="text-lg text-gray-200 font-semibold mb-1">{sect.memberCount} Anggota</p>
                          <p className="text-xs text-gray-500">Manajemen anggota penuh tersedia di bot Discord (menggunakan komando /sekte).</p>
                       </CardContent>
                    </Card>
                    <Card variant="gold" className="bg-black/40">
                       <CardContent className="p-4 sm:p-5">
                          <h3 className="font-bold text-[#c5a880] mb-2 flex items-center gap-2"><Banknote size={16}/> Gudang Sekte</h3>
                          <p className="text-lg text-gray-200 font-semibold mb-2 font-mono">{(sect.totalWealth).toLocaleString()} Silver (Total)</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                             <Badge variant="outline" className="border-[#8b4513] text-[#cd7f32]">C: {(sect.currency).copper}</Badge>
                             <Badge variant="outline" className="border-gray-700 text-gray-400">S: {(sect.currency).silver}</Badge>
                             <Badge variant="outline" className="border-yellow-900/50 text-yellow-500">G: {(sect.currency).gold}</Badge>
                             <Badge variant="outline" className="border-green-900/50 text-green-400">J: {(sect.currency).jade}</Badge>
                             <Badge variant="outline" className="border-blue-900/50 text-blue-400">SP: {(sect.currency).spirit}</Badge>
                          </div>
                       </CardContent>
                    </Card>
                 </div>
              </div>
          </div>

          {/* Aset Sekte Section */}
          <div className="bg-[#111] border border-[#1f402e]/30 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="flex flex-wrap sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#333] pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-green-500 font-serif flex items-center gap-2"><Map className="w-5 h-5 sm:w-6 sm:h-6" /> Aset Sekte</h2>

            </div>




            {assets.length === 0 ? (
              <EmptyState
                icon={<Map />}
                title="Sekte Miskin"
                description="Sekte ini belum memiliki aset apapun. Gunakan /sekte bangun-asset di Discord."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {assets.map((asset, index) => (
                  <div key={index} className="bg-black/40 border border-[#333] rounded-lg p-4 hover:border-green-800/60 transition-colors relative group">

                    <div className="absolute top-2 right-2 z-10">
                        {asset.underConstruction ? (
                            <Badge variant="warning" className="text-[9px] gap-1"><Clock size={10} /> Membangun</Badge>
                        ) : asset.status === 'Halted (Terhenti)' ? (
                            <Badge variant="destructive" className="text-[9px] gap-1"><AlertTriangle size={10} /> Terhenti</Badge>
                        ) : (
                            <Badge variant="success" className="text-[9px] gap-1 bg-[#1f402e]/80"><CheckCircle2 size={10} /> Aktif</Badge>
                        )}
                    </div>

                    <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-900 rounded-md border border-[#333] overflow-hidden flex-shrink-0 shadow-inner">
                        <FallbackImage
                          src={asset.imageUrl || ''}
                          alt={asset.name}
                          fallbackNode={<div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl">🏯</div>}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 pr-12">
                        <h3 className="font-bold text-gray-200 group-hover:text-green-400 transition-colors text-sm sm:text-base truncate">{asset.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2 leading-tight">{asset.description}</p>
                        <p className="text-[10px] sm:text-xs text-[#c5a880] mt-1.5 font-bold font-mono">Qty: {asset.quantity}</p>
                      </div>
                    </div>

                    <div className="border-t border-[#333] pt-3 flex flex-wrap justify-between items-center gap-2 text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1.5">
                        {asset.isCraftingStation ? (
                            <Badge variant="outline" className="border-blue-900 text-blue-400 py-0 h-5">Fasilitas Crafting</Badge>
                        ) : (
                            <Badge variant="outline" className="border-[#333] text-gray-500 py-0 h-5">Pasif</Badge>
                        )}
                      </div>
                      {!asset.underConstruction && asset.status === 'Aktif' && asset.profitAvailable && (
                         <span className="text-green-400 font-bold animate-pulse flex items-center gap-1">
                             <DollarSign size={12} /> Profit sedia
                         </span>
                      )}
                    </div>

                    {asset.underConstruction && asset.constructionCompleteAt && (
                        <div className="mt-3 p-2 bg-black/60 rounded border border-[#333] flex flex-wrap justify-between items-center gap-1">
                           <p className="text-[9px] sm:text-[10px] text-gray-500">Target Selesai:</p>
                           <p className="text-[10px] sm:text-xs text-orange-400 font-semibold font-mono"><Countdown targetDate={asset.constructionCompleteAt} /></p>
                        </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
          </>
      )}
    </div>
  );
}
