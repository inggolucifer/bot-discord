"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { toast as toastManager } from "@/components/ui/Toast";
import { ArrowLeft, Check, X, Ban } from "lucide-react";
import api from "@/lib/api";

interface ItemDetail {
    itemId: { _id: string; name: string };
    quantity: number;
}

interface CurrencyDetail {
    copper: number;
    silver: number;
    gold: number;
    jade: number;
    spirit: number;
}

interface OfferDetail {
    _id: string;
    initiatorId: string;
    targetId: string;
    initiatorName: string;
    targetName: string;
    isInitiator: boolean;
    status: string;
    createdAt: string;
    expiresAt: string;
    initiatorOffer: {
        items: ItemDetail[];
        currency: CurrencyDetail;
    };
    targetOffer: {
        items: ItemDetail[];
        currency: CurrencyDetail;
    };
    locationSnapshot: {
        regionSlug: string;
        settlementName: string;
        buildingName: string | null;
    };
}

export default function BarterDetailPage() {
    const router = useRouter();
    const { id } = useParams();
    const [offer, setOffer] = useState<OfferDetail | null>(null);
    const [playerLocation, setPlayerLocation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [locationWarning, setLocationWarning] = useState<string | null>(null);

    useEffect(() => {
        fetchPlayerProfile();
        fetchOfferDetails();
    }, [id]);

    useEffect(() => {
        if (offer && playerLocation) {
            const pLoc = playerLocation;
            const oLoc = offer.locationSnapshot;
            const isSame = pLoc.regionSlug === oLoc.regionSlug &&
                           pLoc.settlementName === oLoc.settlementName &&
                           (pLoc.buildingName || null) === (oLoc.buildingName || null);

            if (!isSame) {
                setLocationWarning(`PERINGATAN: Lokasi Anda saat ini berbeda dengan lokasi saat tawaran dibuat (${oLoc.regionSlug} - ${oLoc.settlementName}). Menerima barter ini mungkin akan gagal atau otomatis membatalkan tawaran.`);
            } else {
                setLocationWarning(null);
            }
        }
    }, [offer, playerLocation]);

    const fetchPlayerProfile = async () => {
        try {
            const res = await api.get("/player/profile");
            if (res.data && res.data.player) {
                setPlayerLocation(res.data.player.currentLocation);
            }
        } catch (error) {
            console.error("Failed to fetch player profile", error);
        }
    };

    const fetchOfferDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/barter/${id}`);
            const data = res.data;
            if (data.success) {
                setOffer(data.data);
            } else {
                toastManager.show({ message: data.error || "Gagal mengambil detail barter.", type: "error" });
            }
        } catch (error: any) {
            toastManager.show({ message: error.response?.data?.error || "Terjadi kesalahan koneksi.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'accept' | 'reject' | 'cancel') => {
        if (!confirm(`Apakah Anda yakin ingin ${action === 'accept' ? 'menerima' : action === 'reject' ? 'menolak' : 'membatalkan'} tawaran ini?`)) return;

        try {
            setActionLoading(true);
            const res = await api.post(`/barter/${action}/${id}`);
            const data = res.data;

            if (data.success) {
                toastManager.show({ message: data.message, type: "success" });
                fetchOfferDetails(); // Refresh
                if (action === 'cancel' || action === 'reject') {
                    setTimeout(() => router.push('/barter'), 1500);
                }
            } else {
                toastManager.show({ message: data.error, type: "error" });
                // If it automatically expired due to location
                if (data.error.includes("otomatis")) {
                    fetchOfferDetails();
                }
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || "Gagal memproses aksi.";
            toastManager.show({ message: errorMsg, type: "error" });
            if (errorMsg.includes("otomatis")) {
                fetchOfferDetails();
            }
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <LoadingState text="Memuat detail barter..." />;
    if (!offer) return <div className="text-center text-muted-foreground mt-10">Tawaran tidak ditemukan.</div>;

    const renderOfferSection = (title: string, offerData: any, isHighlight: boolean) => (
        <Card className={`p-6 ${isHighlight ? 'border-primary/50' : 'border-white/10'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isHighlight ? 'text-primary' : 'text-amber-50'}`}>{title}</h3>

            <div className="space-y-4">
                <div>
                    <h4 className="text-sm text-muted-foreground mb-2">Currency:</h4>
                    <div className="flex flex-wrap gap-3">
                        {['copper', 'silver', 'gold', 'jade', 'spirit'].map(c => {
                            const val = offerData.currency?.[c];
                            if (val) {
                                return (
                                    <span key={c} className="text-xs bg-black/40 px-2 py-1 rounded border border-white/5">
                                        <span className="font-bold text-amber-50">{val}</span> <span className="capitalize">{c}</span>
                                    </span>
                                );
                            }
                            return null;
                        })}
                        {!Object.values(offerData.currency || {}).some((v: any) => v > 0) && <span className="text-xs text-muted-foreground italic">-</span>}
                    </div>
                </div>

                <div>
                    <h4 className="text-sm text-muted-foreground mb-2">Items:</h4>
                    {offerData.items && offerData.items.length > 0 ? (
                        <ul className="space-y-2">
                            {offerData.items.map((item: any, idx: number) => (
                                <li key={idx} className="text-sm flex justify-between bg-black/40 px-3 py-2 rounded border border-white/5">
                                    <span>{item.itemId?.name || 'Unknown Item'}</span>
                                    <span className="text-primary font-bold">x{item.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">-</span>
                    )}
                </div>
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">


            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/barter')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader title="Detail Barter" description={`Status: ${offer.status.toUpperCase()}`} />
            </div>

            {locationWarning && offer.status === 'pending' && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-sm flex items-start gap-3">
                    <Ban className="w-5 h-5 shrink-0" />
                    <p>{locationWarning}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderOfferSection(`Penawaran ${offer.isInitiator ? '(Anda)' : offer.initiatorName}`, offer.initiatorOffer, offer.isInitiator)}
                {renderOfferSection(`Permintaan ${!offer.isInitiator ? '(Anda)' : offer.targetName}`, offer.targetOffer, !offer.isInitiator)}
            </div>

            {offer.status === 'pending' && (
                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                    {offer.isInitiator ? (
                        <Button
                            variant="destructive"
                            onClick={() => handleAction('cancel')}
                            disabled={actionLoading}
                        >
                            <Ban className="w-4 h-4 mr-2" />
                            Batalkan Tawaran
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="destructive"
                                onClick={() => handleAction('reject')}
                                disabled={actionLoading}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Tolak
                            </Button>
                            <Button
                                onClick={() => handleAction('accept')}
                                disabled={actionLoading || !!locationWarning}
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Terima Barter
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
