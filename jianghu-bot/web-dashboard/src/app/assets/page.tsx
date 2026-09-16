"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Map,
  Clock,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Hammer,
  Shield,
  Search,
  Filter,
  ExternalLink,
  PlusCircle,
  Wrench,
  CheckCircle2,
  Building,
  Sparkles,
  Info,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import FallbackImage from "@/components/FallbackImage";
import { getRarityColor, getRarityTextClass } from "@/lib/rarity";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

interface Worker {
  workerId: string;
  assignedAt: string;
  endTime: string | null;
}

interface Asset {
  id: string;
  name: string;
  description: string;
  type: string;
  quantity: number;
  assignedWorkers: Worker[];
  underConstruction: boolean;
  constructionCompleteAt: string | null;
  status: string;
  progressHours?: number;
  rank?: string;
  isCraftingStation?: boolean;
  recipes?: any[];
  workerInputMaterials?: any[];
  isDamaged?: boolean;
  damageType?: string | null;
  guardEndTime?: string | null;
  hp?: number;
  maxHp?: number;
  placement?: {
    zoneId: string;
    tileX: number;
    tileY: number;
  } | null;
}

const FILTER_CATEGORIES = [
  "Semua",
  "Pertukangan",
  "Dapur",
  "Alkimia",
  "Pertanian",
  "Kediaman/Lainnya",
];

const getAssetCategory = (assetName: string, assetType: string) => {
  const name = (assetName || "").toLowerCase();
  const type = (assetType || "").toLowerCase();
  const matches = (keywords: string[]) =>
    keywords.some((kw) => name.includes(kw) || type.includes(kw));

  if (matches(["tungku", "anvil", "baja", "besi", "smith", "forge", "pandai besi", "pertukangan"]))
    return "Pertukangan";
  if (matches(["dapur", "masak", "kitchen", "panci", "kuliner", "resep"]))
    return "Dapur";
  if (matches(["kuali", "alkimia", "pil", "elixir", "alchemy", "paviliun"]))
    return "Alkimia";
  if (matches(["lahan", "tani", "pupuk", "kebun", "bibit", "farm", "ladang", "tambak", "kolam"]))
    return "Pertanian";
  return "Kediaman/Lainnya";
};

const Countdown = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = new Date(targetDate).getTime() - new Date().getTime();
      if (diff > 0) {
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours}j ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft("Konstruksi Selesai");
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return <span className="font-mono text-amber-300 font-bold">{timeLeft}</span>;
};

export default function AssetsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetSlots, setAssetSlots] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [buySlotModalOpen, setBuySlotModalOpen] = useState(false);
  const [buySlotLoading, setBuySlotLoading] = useState(false);
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairCostText, setRepairCostText] = useState<string | null>(null);
  const [repairLoading, setRepairLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/player/assets");
      setAssets(res.data.data || []);
      if (res.data.assetSlots) {
        setAssetSlots(res.data.assetSlots);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Gagal memuat daftar aset properti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAssets();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleBuySlot = async () => {
    setBuySlotLoading(true);
    try {
      const res = await api.post("/player/assets/tambah-slot");
      setActionMessage({
        type: "success",
        text: res.data.message || "Berhasil menambah slot aset properti!",
      });
      setBuySlotModalOpen(false);
      fetchAssets();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.response?.data?.error || "Gagal membeli slot tambahan.",
      });
    } finally {
      setBuySlotLoading(false);
    }
  };

  const handleOpenRepairModal = async (asset: Asset) => {
    setSelectedAsset(asset);
    setRepairModalOpen(true);
    try {
      const res = await api.post("/player/assets/repair-cost", { assetId: asset.id });
      if (res.data.success) {
        setRepairCostText(res.data.costText);
      }
    } catch (err: any) {
      setRepairCostText(err.response?.data?.error || "Biaya perbaikan: 500 Silver / 2 Kayu Gelondong");
    }
  };

  const handleConfirmRepair = async () => {
    if (!selectedAsset) return;
    setRepairLoading(true);
    try {
      const res = await api.post("/player/assets/repair", { assetId: selectedAsset.id });
      setActionMessage({
        type: "success",
        text: res.data.message || "Bangunan aset berhasil diperbaiki!",
      });
      setRepairModalOpen(false);
      fetchAssets();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.response?.data?.error || "Gagal memperbaiki bangunan aset.",
      });
    } finally {
      setRepairLoading(false);
    }
  };

  const handleNavigateToGrid = (asset: Asset) => {
    const zoneId = asset.placement?.zoneId || "central_plains_bamboo_forest";
    const x = asset.placement?.tileX ?? 10;
    const y = asset.placement?.tileY ?? 10;
    router.push(`/world?zoneId=${zoneId}&tileX=${x}&tileY=${y}`);
  };

  // Filtered Assets
  const filteredAssets = assets.filter((asset) => {
    const matchesCategory =
      activeFilter === "Semua" ||
      getAssetCategory(asset.name, asset.type) === activeFilter;
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.placement?.zoneId || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const underConstructionCount = assets.filter((a) => a.underConstruction).length;
  const damagedCount = assets.filter((a) => a.isDamaged).length;
  const activeCount = assets.filter((a) => !a.underConstruction && !a.isDamaged).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header */}
      <PageHeader
        title="Daftar Kepemilikan Lahan & Properti"
        description="Pantau seluruh properti tanah, bengkel profesi, dan aset bangunan yang kamu miliki di berbagai penjuru benua Jianghu."
      />

      {/* Spatial Grid Redirection Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
              <Map className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-200 flex items-center gap-2">
                Sistem Spasial Peta Dunia Aktif
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Tale of Immortal Mode
                </span>
              </h3>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
                Pembelian plot tanah kosong, pembangunan bengkel profesi (*Pandai Besi, Dapur, Alkimia, Tambak Ikan, Ladang*), serta pengoperasian fasilitas kini dilakukan secara langsung di atas **Peta Grid Spasial**. Klik tombol inspeksi pada daftar aset di bawah untuk langsung menuju koordinat bangunan!
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/world")}
            className="w-full md:w-auto shrink-0 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 border border-amber-400/30"
          >
            Buka Peta Dunia
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-200"
              : "bg-rose-950/50 border-rose-500/30 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Properti Dimiliki</span>
            <Building className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{assets.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Tersebar di berbagai zona</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Slot Properti</span>
            <button
              onClick={() => setBuySlotModalOpen(true)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Beli Slot
            </button>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-300">
            {assets.length} <span className="text-sm font-normal text-slate-400">/ {assetSlots}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Maksimal 5 slot kepemilikan</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Dalam Konstruksi</span>
            <Hammer className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-300">{underConstructionCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {underConstructionCount > 0 ? "Menunggu selesai" : "Tidak ada antrean"}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Status Rusak</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">{damagedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {damagedCount > 0 ? "Perlu segera diperbaiki" : "Semua kondisi prima"}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === cat
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama aset / zona..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <LoadingState text="Memuat inventaris lahan & properti kultivator..." />
      ) : error ? (
        <div className="p-8 text-center text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-xl">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p>{error}</p>
          <Button onClick={fetchAssets} className="mt-4 bg-slate-800 text-slate-200 text-xs">
            Coba Lagi
          </Button>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 text-center">
          <Building className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">
            {assets.length === 0
              ? "Belum Memiliki Properti Tanah atau Bangunan"
              : "Tidak Ada Properti yang Cocok"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {assets.length === 0
              ? "Kunjungi Peta Dunia untuk menemukan plot tanah kosong (buildable plot), membelinya dengan Silver, dan mendirikan bengkel atau kediaman kultivator."
              : "Coba ganti filter kategori atau kata kunci pencarian."}
          </p>
          {assets.length === 0 && (
            <Button
              onClick={() => router.push("/world")}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-5 py-2 text-xs rounded-xl"
            >
              Jelajahi Peta Dunia
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssets.map((asset) => {
            const currentHp = asset.hp ?? (asset.isDamaged ? 30 : 100);
            const maxHp = asset.maxHp ?? 100;
            const hpPercent = Math.min(100, Math.max(0, Math.round((currentHp / maxHp) * 100)));
            const zoneName = asset.placement?.zoneId
              ? asset.placement.zoneId.replace(/_/g, " ").toUpperCase()
              : "ZONA BENUA UTAMA";
            const posX = asset.placement?.tileX ?? "-";
            const posY = asset.placement?.tileY ?? "-";

            return (
              <div
                key={asset.id || Math.random().toString()}
                className="group relative rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-lg hover:border-amber-500/40 transition-all flex flex-col justify-between"
              >
                {/* Top Badge & Status */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700/60">
                        {getAssetCategory(asset.name, asset.type)}
                      </span>
                      {asset.underConstruction ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                          <Hammer className="w-3 h-3 animate-spin" />
                          Membangun
                        </span>
                      ) : asset.isDamaged ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Rusak
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/20">
                      X: {posX} | Y: {posY}
                    </span>
                  </div>

                  {/* Asset Name & Zone */}
                  <h4 className="text-base font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                    {asset.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Map className="w-3 h-3 text-slate-500" />
                    {zoneName}
                  </p>

                  {/* Construction Countdown (if building) */}
                  {asset.underConstruction && asset.constructionCompleteAt && (
                    <div className="mt-3 p-2.5 rounded-lg bg-sky-950/30 border border-sky-500/30 text-xs flex items-center justify-between">
                      <span className="text-sky-300 text-[11px] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        Selesai Dalam:
                      </span>
                      <Countdown targetDate={asset.constructionCompleteAt} />
                    </div>
                  )}

                  {/* HP Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Integritas Fisik (HP)</span>
                      <span
                        className={`font-mono font-semibold ${
                          hpPercent > 60
                            ? "text-emerald-400"
                            : hpPercent > 25
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {currentHp} / {maxHp} ({hpPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          hpPercent > 60
                            ? "bg-emerald-500"
                            : hpPercent > 25
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${hpPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Description / Output */}
                  <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                    {asset.description ||
                      "Fasilitas mandiri yang dapat digunakan untuk crafting, istirahat, atau mempekerjakan pekerja."}
                  </p>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2">
                  <Button
                    onClick={() => handleNavigateToGrid(asset)}
                    className="flex-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Map className="w-3.5 h-3.5" />
                    Lihat di Peta Grid
                  </Button>

                  {asset.isDamaged && (
                    <Button
                      onClick={() => handleOpenRepairModal(asset)}
                      className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold px-3 py-2 rounded-xl flex items-center justify-center gap-1 transition-all"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Perbaiki
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Buy Slot Modal */}
      <Modal
        isOpen={buySlotModalOpen}
        onClose={() => setBuySlotModalOpen(false)}
        title="Beli Tambahan Slot Properti"
      >
        <div className="space-y-4 p-2 text-slate-200">
          <p className="text-xs text-slate-300 leading-relaxed">
            Membuka slot properti tambahan memungkinkan kultivator untuk memiliki lebih banyak tanah dan bangunan secara bersamaan di seluruh benua Jianghu.
          </p>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Slot Saat Ini:</span>
              <span className="font-bold text-slate-200">{assetSlots} / 5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Biaya Pembukaan Slot:</span>
              <span className="font-bold text-amber-400">10,000 Silver / 50 Gold</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setBuySlotModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleBuySlot}
              disabled={buySlotLoading || assetSlots >= 5}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs"
            >
              {buySlotLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : assetSlots >= 5 ? (
                "Slot Maksimal Terpenuhi"
              ) : (
                "Konfirmasi Beli Slot"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Repair Modal */}
      <Modal
        isOpen={repairModalOpen}
        onClose={() => setRepairModalOpen(false)}
        title={`Perbaiki Bangunan: ${selectedAsset?.name || ""}`}
      >
        <div className="space-y-4 p-2 text-slate-200">
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold">Bangunan Sedang Rusak!</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Fasilitas tidak dapat beroperasi dan produktivitas terhenti hingga diperbaiki oleh tukang kayu dan material perbaikan.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Estimasi Biaya:</span>
              <span className="font-semibold text-amber-300">
                {repairCostText || "Memuat estimasi material..."}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setRepairModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmRepair}
              disabled={repairLoading}
              className="bg-rose-600 hover:bg-rose-500 text-slate-100 font-bold text-xs"
            >
              {repairLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Perbaiki Sekarang"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
