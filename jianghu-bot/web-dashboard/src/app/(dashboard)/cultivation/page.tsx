"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, AlertTriangle, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

interface CultivationData {
  realm: string;
  stage: number;
  realmIdx: number;
  currentQi: number;
  maxQi: number;
  ratePerMinute: number;
  isReadyForBreakthrough: boolean;
  baseSuccessRate: number;
  maxStage: number;
  isMaxLevel: boolean;
  pill: {
    name: string;
    count: number;
    itemId: string | null;
  };
}

export default function CultivationPage() {
  const [data, setData] = useState<CultivationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usePill, setUsePill] = useState(false);

  const fetchCultivation = async () => {
    try {
      const res = await api.get("/cultivation");
      setData(res.data.data);
      // Auto-toggle pill off if no pill available
      if (res.data.data.pill.count === 0) setUsePill(false);
    } catch (err: unknown) {
      console.error(err);
      setError(
          err && typeof err === 'object' && 'response' in err
              ? (err as { response: { data: { error: string } } }).response?.data?.error
              : "Gagal memuat data kultivasi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isMounted = true;

    const init = async () => {
        try {
            const res = await api.get("/cultivation");
            if (isMounted) {
                setData(res.data.data);
                if (res.data.data.pill.count === 0) setUsePill(false);
                setLoading(false);
            }
        } catch (err: unknown) {
            console.error(err);
            if (isMounted) {
                setError(
                    err && typeof err === 'object' && 'response' in err
                        ? (err as { response: { data: { error: string } } }).response?.data?.error
                        : "Gagal memuat data kultivasi."
                );
                setLoading(false);
            }
        }
    };
    init();

    // Polling interval to auto-update Qi softly on UI (simulating the background growth)
    const intervalId = setInterval(() => {
        setData(prev => {
            if (!prev || prev.isReadyForBreakthrough) return prev;

            // Add (ratePerMinute / 60) per second
            const qps = prev.ratePerMinute / 60;
            const newQi = Math.min(prev.maxQi, prev.currentQi + qps);

            return {
                ...prev,
                currentQi: newQi,
                isReadyForBreakthrough: newQi >= prev.maxQi
            }
        });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleBreakthrough = async () => {
    if (!data?.isReadyForBreakthrough) return;

    setIsProcessing(true);
    const toastId = toast.loading("Sedang mencoba menerobos batas...");

    try {
      const res = await api.post("/cultivation/breakthrough", { usePill });

      if (res.data.isSuccess) {
          toast.success(res.data.message, { id: toastId, duration: 5000 });
      } else {
          toast.error(res.data.message, { id: toastId, duration: 6000 });
      }

      // Refresh data
      await fetchCultivation();
    } catch (err: unknown) {
      toast.error(
          err && typeof err === 'object' && 'response' in err
              ? (err as { response: { data: { error: string } } }).response?.data?.error
              : "Gagal melakukan terobosan.",
          { id: toastId }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#c5a880]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8 border border-red-500/20 bg-red-500/10 rounded-md">
        <p>{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => { setError(null); setLoading(true); fetchCultivation(); }}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const percentage = Math.min(100, (data.currentQi / data.maxQi) * 100);
  const currentSuccessRate = Math.min(100, data.baseSuccessRate + (usePill ? 5 : 0));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header Info */}
      <div className="bg-[#111] border border-[#333] rounded-lg p-6 relative overflow-hidden">
         {/* Subtle background glow based on ready state */}
         <div className={`absolute -inset-1 blur-3xl opacity-20 transition-colors duration-1000 ${data.isReadyForBreakthrough ? 'bg-green-500' : 'bg-blue-600'}`}></div>

         <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="text-center md:text-left">
                <h1 className="text-2xl font-serif text-[#c5a880] mb-2 font-bold tracking-widest uppercase">
                    Kultivasi Sistem
                </h1>
                <p className="text-gray-400 text-sm">Serap Qi dari alam semesta dan terobos batas kemanusiaan.</p>
            </div>
            <div className="flex flex-col items-center md:items-end">
                <div className="text-3xl font-bold text-white tracking-wider font-serif">
                   {data.realm}
                </div>
                <div className="text-gray-400 mt-1 flex items-center gap-2">
                   {data.realmIdx > 0 ? (
                       <Badge variant="outline" className="bg-[#1a1a1a] text-[#c5a880] border-[#c5a880]/30">Tahap {data.stage}</Badge>
                   ) : (
                       <Badge variant="outline" className="bg-[#1a1a1a] text-gray-400 border-gray-600">Dasar</Badge>
                   )}
                </div>
            </div>
         </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111] border border-[#333] rounded-lg p-6 flex flex-col justify-center items-center min-h-[250px]">

             {/* Circular Progress (CSS based) */}
             <div className="relative w-48 h-48 rounded-full flex justify-center items-center">
                 {/* Background circle */}
                 <svg className="w-full h-full absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                     <circle cx="50" cy="50" r="45" fill="transparent" stroke="#222" strokeWidth="8" />
                     <circle cx="50" cy="50" r="45" fill="transparent" stroke={data.isReadyForBreakthrough ? '#2ecc71' : '#3498db'} strokeWidth="8"
                             strokeDasharray={`${percentage * 2.827} 282.7`} strokeLinecap="round" className="transition-all duration-500" />
                 </svg>
                 <div className="text-center z-10 flex flex-col items-center">
                     <span className="text-4xl font-bold font-serif text-white">{percentage.toFixed(0)}%</span>
                     <span className="text-xs text-gray-500 uppercase tracking-widest mt-1">Qi Terkumpul</span>
                 </div>

                 {/* Sparkles if ready */}
                 {data.isReadyForBreakthrough && (
                     <div className="absolute inset-0 border-4 border-green-500/50 rounded-full animate-ping opacity-20"></div>
                 )}
             </div>

             <div className="mt-6 text-center text-sm font-mono text-gray-400">
                 {Math.floor(data.currentQi).toLocaleString()} / {data.maxQi.toLocaleString()}
             </div>
             <div className="mt-2 text-xs flex items-center gap-1 text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full">
                <Zap className="w-3 h-3" /> +{data.ratePerMinute.toLocaleString()} Qi/menit
             </div>
          </div>

          <div className="bg-[#111] border border-[#333] rounded-lg p-6 flex flex-col">
             <h2 className="text-xl font-bold text-white border-b border-[#333] pb-3 mb-4">Terobosan (Breakthrough)</h2>

             {data.isMaxLevel ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-yellow-500 bg-yellow-900/10 border border-yellow-900/30 rounded-md p-4">
                    <ShieldCheck className="w-12 h-12 mb-3 opacity-80" />
                    <p className="font-semibold text-lg">Puncak Kultivasi</p>
                    <p className="text-sm mt-1 text-yellow-500/80">Tidak ada batasan lagi yang bisa ditembus. Kamu telah mencapai kesempurnaan.</p>
                </div>
             ) : (
                <>
                    <div className="space-y-4 flex-1">
                        <div className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded border border-[#333]">
                           <span className="text-gray-400 text-sm">Peluang Sukses Dasar</span>
                           <span className="text-white font-mono">{data.baseSuccessRate}%</span>
                        </div>

                        <div className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded border border-[#333]">
                           <span className="text-gray-400 text-sm">Penalti Kegagalan</span>
                           <span className="text-red-400 font-mono text-sm flex items-center gap-1">
                               <AlertTriangle className="w-3 h-3" /> Hilang 25% Qi Max
                           </span>
                        </div>

                        {data.realmIdx > 0 && (
                            <div className={`p-4 rounded border ${usePill ? 'bg-green-900/20 border-green-900/50' : 'bg-[#1a1a1a] border-[#333]'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-200">{data.pill.name}</div>
                                        <div className="text-xs text-gray-500">Meningkatkan peluang sukses +5%.</div>
                                    </div>
                                    <Badge variant="outline" className={data.pill.count > 0 ? "text-green-400 border-green-400/50" : "text-gray-500"}>
                                        Dimiliki: {data.pill.count}
                                    </Badge>
                                </div>
                                <Button
                                    variant={usePill ? "default" : "outline"}
                                    size="sm"
                                    className={`w-full mt-2 text-xs ${usePill ? 'bg-green-600 hover:bg-green-700 text-white border-none' : 'border-[#444] text-gray-400'}`}
                                    onClick={() => setUsePill(!usePill)}
                                    disabled={data.pill.count <= 0 || isProcessing}
                                >
                                    {usePill ? '✓ Pil Digunakan (+5%)' : 'Gunakan Pil'}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#333]">
                        <Button
                            className={`w-full py-6 text-lg font-bold tracking-widest transition-all ${
                                data.isReadyForBreakthrough
                                    ? 'bg-[#c5a880] text-black hover:bg-[#d6b991] shadow-[0_0_15px_rgba(197,168,128,0.5)]'
                                    : 'bg-[#222] text-gray-500 cursor-not-allowed'
                            }`}
                            disabled={!data.isReadyForBreakthrough || isProcessing}
                            onClick={handleBreakthrough}
                        >
                            {isProcessing ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : data.isReadyForBreakthrough ? (
                                `MENEROBOS (${currentSuccessRate}%)`
                            ) : (
                                "QI BELUM MENCUKUPI"
                            )}
                        </Button>
                    </div>
                </>
             )}
          </div>
      </div>
    </div>
  );
}
