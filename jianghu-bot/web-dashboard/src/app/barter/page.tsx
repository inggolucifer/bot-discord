"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { toast as toastManager } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { ArrowRightLeft, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/api";

interface ItemOffer {
    itemId: string;
    quantity: number;
}

interface CurrencyOffer {
    copper: number;
    silver: number;
    gold: number;
    jade: number;
    spirit: number;
}

interface OfferPayload {
    items: ItemOffer[];
    currency: CurrencyOffer;
}

interface BarterOffer {
    _id: string;
    initiatorName: string;
    targetName: string;
    isInitiator: boolean;
    status: string;
    createdAt: string;
    locationSnapshot?: {
        regionSlug: string;
        settlementName: string;
        buildingName: string | null;
    };
}

interface PlayerSearch {
    discordId: string;
    characterName: string;
}

interface AlmanackItem {
    _id: string;
    name: string;
}

export default function BarterPage() {
    const router = useRouter();
    const [offers, setOffers] = useState<BarterOffer[]>([]);
    const [loading, setLoading] = useState(true);

    const [playerLocation, setPlayerLocation] = useState<any>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [playersInLocation, setPlayersInLocation] = useState<PlayerSearch[]>([]);
    const [selectedTargetId, setSelectedTargetId] = useState("");
    const [allItems, setAllItems] = useState<AlmanackItem[]>([]);

    const [initiatorCurrency, setInitiatorCurrency] = useState<CurrencyOffer>({ copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 });
    const [targetCurrency, setTargetCurrency] = useState<CurrencyOffer>({ copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 });

    const [initiatorItems, setInitiatorItems] = useState<ItemOffer[]>([]);
    const [targetItems, setTargetItems] = useState<ItemOffer[]>([]);

    useEffect(() => {
        fetchPlayerProfile();
        fetchOffers();
    }, []);

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

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const res = await api.get("/barter/list");
            const data = res.data;
            if (data.success) {
                setOffers(data.data);
            } else {
                toastManager.show({ message: data.error || "Gagal mengambil daftar barter.", type: "error" });
            }
        } catch (error: any) {
            toastManager.show({ message: error.response?.data?.error || "Terjadi kesalahan koneksi.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const fetchAlmanackItems = async () => {
        try {
            const res = await api.get("/almanack/items?limit=1000"); // Just to get list for dropdown
            const data = res.data;
            if (data.success) {
                setAllItems(data.data.items || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
        fetchAlmanackItems();
    };

    const handleSubmitOffer = async () => {
        if (!selectedTargetId) {
            toastManager.show({ message: "Silakan pilih target pemain.", type: "error" });
            return;
        }

        try {
            const payload = {
                targetId: selectedTargetId,
                initiatorOffer: {
                    items: initiatorItems.filter(i => i.itemId && i.quantity > 0),
                    currency: initiatorCurrency
                },
                targetOffer: {
                    items: targetItems.filter(i => i.itemId && i.quantity > 0),
                    currency: targetCurrency
                }
            };

            const res = await api.post("/barter/offer", payload);
            const data = res.data;

            if (data.success) {
                toastManager.show({ message: "Tawaran barter berhasil diajukan.", type: "success" });
                setIsModalOpen(false);
                fetchOffers();
                // Reset form
                setSelectedTargetId("");
                setInitiatorCurrency({ copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 });
                setTargetCurrency({ copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 });
                setInitiatorItems([]);
                setTargetItems([]);
            } else {
                toastManager.show({ message: data.error, type: "error" });
            }
        } catch (error: any) {
            toastManager.show({ message: error.response?.data?.error || "Gagal mengajukan barter.", type: "error" });
        }
    };

    const handleAddItem = (type: 'initiator' | 'target') => {
        if (type === 'initiator') {
            setInitiatorItems([...initiatorItems, { itemId: "", quantity: 1 }]);
        } else {
            setTargetItems([...targetItems, { itemId: "", quantity: 1 }]);
        }
    };

    const handleRemoveItem = (index: number, type: 'initiator' | 'target') => {
        if (type === 'initiator') {
            setInitiatorItems(initiatorItems.filter((_, i) => i !== index));
        } else {
            setTargetItems(targetItems.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index: number, field: string, value: string | number, type: 'initiator' | 'target') => {
        const list = type === 'initiator' ? [...initiatorItems] : [...targetItems];
        list[index] = { ...list[index], [field]: value };
        if (type === 'initiator') setInitiatorItems(list as any);
        else setTargetItems(list as any);
    };

    return (
        <div className="space-y-6">


            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageHeader title="Barter" description="Tukar menukar barang dengan pemain lain di lokasi yang sama." />
                <Button onClick={handleOpenModal} className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    Ajukan Barter
                </Button>
            </div>

            {loading ? (
                <LoadingState text="Memuat daftar barter..." />
            ) : offers.length === 0 ? (
                <EmptyState icon={<ArrowRightLeft className="w-12 h-12 text-primary/40" />} title="Tidak ada Barter" description="Anda tidak memiliki tawaran barter yang tertunda." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {offers.map((offer) => (
                        <Card key={offer._id} className="p-4 hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-center mb-4">
                                <Badge variant={offer.isInitiator ? "default" : "secondary"}>{offer.isInitiator ? "Anda Mengajukan" : "Tawaran Masuk"}</Badge>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(offer.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            {playerLocation && offer.locationSnapshot && (
                                (() => {
                                    const isSameLoc = playerLocation.regionSlug === offer.locationSnapshot.regionSlug &&
                                                      playerLocation.settlementName === offer.locationSnapshot.settlementName &&
                                                      (playerLocation.buildingName || null) === (offer.locationSnapshot.buildingName || null);
                                    if (!isSameLoc) {
                                        return (
                                            <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/50 p-2 rounded">
                                                ⚠ Lokasi Berbeda (Batal jika diterima)
                                            </div>
                                        );
                                    }
                                    return null;
                                })()
                            )}

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground w-16">Dari:</span>
                                    <span className="font-medium text-amber-50">{offer.initiatorName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground w-16">Ke:</span>
                                    <span className="font-medium text-amber-50">{offer.targetName}</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push(`/barter/${offer._id}`)}
                            >
                                Lihat Detail
                            </Button>
                        </Card>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ajukan Tawaran Barter">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-amber-50">Target Pemain (Discord ID)</label>
                        <input
                            type="text"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Masukkan Discord ID target..."
                            value={selectedTargetId}
                            onChange={(e) => setSelectedTargetId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Pastikan target berada di lokasi yang sama persis dengan Anda.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* INITIATOR OFFER */}
                        <div className="space-y-4 border border-white/5 p-4 rounded-lg bg-black/20">
                            <h3 className="font-bold text-primary border-b border-primary/20 pb-2">Penawaran Anda</h3>

                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Currency</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['copper', 'silver', 'gold', 'jade', 'spirit'] as const).map(curr => (
                                        <div key={curr} className="flex items-center gap-2">
                                            <span className="text-xs w-10 capitalize">{curr}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                value={initiatorCurrency[curr] || ''}
                                                onChange={(e) => setInitiatorCurrency({ ...initiatorCurrency, [curr]: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-muted-foreground">Items</label>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleAddItem('initiator')}>+ Tambah</Button>
                                </div>
                                {initiatorItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <select
                                            className="flex h-8 w-full flex-1 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={item.itemId}
                                            onChange={(e) => handleItemChange(idx, 'itemId', e.target.value, 'initiator')}
                                        >
                                            <option value="">-- Pilih Item --</option>
                                            {allItems.map(ai => (
                                                <option key={ai._id} value={ai._id}>{ai.name}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            className="flex h-8 w-16 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1, 'initiator')}
                                        />
                                        <button onClick={() => handleRemoveItem(idx, 'initiator')} className="text-red-400 hover:text-red-300"><X className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* TARGET OFFER */}
                        <div className="space-y-4 border border-white/5 p-4 rounded-lg bg-black/20">
                            <h3 className="font-bold text-blue-400 border-b border-blue-400/20 pb-2">Permintaan Anda</h3>

                            <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Currency</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['copper', 'silver', 'gold', 'jade', 'spirit'] as const).map(curr => (
                                        <div key={curr} className="flex items-center gap-2">
                                            <span className="text-xs w-10 capitalize">{curr}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 border-blue-500/50 focus-visible:ring-blue-500"
                                                value={targetCurrency[curr] || ''}
                                                onChange={(e) => setTargetCurrency({ ...targetCurrency, [curr]: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-muted-foreground">Items</label>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleAddItem('target')}>+ Tambah</Button>
                                </div>
                                {targetItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <select
                                            className="flex h-8 w-full flex-1 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={item.itemId}
                                            onChange={(e) => handleItemChange(idx, 'itemId', e.target.value, 'target')}
                                        >
                                            <option value="">-- Pilih Item --</option>
                                            {allItems.map(ai => (
                                                <option key={ai._id} value={ai._id}>{ai.name}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            className="flex h-8 w-16 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1, 'target')}
                                        />
                                        <button onClick={() => handleRemoveItem(idx, 'target')} className="text-red-400 hover:text-red-300"><X className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t border-white/10">
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmitOffer}>Ajukan Tawaran</Button>
                    </div>

                </div>
            </Modal>
        </div>
    );
}
