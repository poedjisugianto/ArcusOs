import React, { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  ArrowLeft,
  Shuffle,
  Loader2,
  QrCode,
  X,
  Check,
  FileDown,
  Plus,
  UserPlus,
  Printer,
  Image as ImageIcon,
  RefreshCw,
  Cloud
} from "lucide-react";
import {
  Archer,
  CategoryType,
  TournamentSettings,
  GlobalSettings,
} from "../types";
import { CATEGORY_LABELS } from "../constants";
import ScoringSheet from "./ScoringSheet";

interface Props {
  archers: Archer[];
  registrations?: any[];
  onAdd: (archer: Archer) => void;
  onUpdate: (archer: Archer) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onBulkUpdate: (updated: Archer[]) => void;
  onGoToIdCardEditor: () => void;
  onRefreshData?: () => void;
  onPushToCloud?: () => void;
  isPushing?: boolean;
  archersPerTarget: number;
  totalTargets: number;
  settings: TournamentSettings;
  eventId: string;
  globalSettings: GlobalSettings;
}

const ArcherList: React.FC<Props> = ({
  archers,
  registrations = [],
  onAdd,
  onUpdate,
  onRemove,
  onBack,
  onBulkUpdate,
  onGoToIdCardEditor,
  onRefreshData,
  onPushToCloud,
  isPushing,
  archersPerTarget,
  totalTargets,
  settings,
  eventId,
  globalSettings,
}) => {
  const [isShuffling, setIsShuffling] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryType | "ALL">(
    "ALL",
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printArcherId, setPrintArcherId] = useState<string | "ALL" | null>(
    null,
  );
  const [filterWave, setFilterWave] = useState<number | "ALL">("ALL");
  const [filterClub, setFilterClub] = useState<string>("ALL");
  const [printAllCategories, setPrintAllCategories] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [newArcher, setNewArcher] = useState({
    name: "",
    email: "",
    phone: "",
    club: "",
    category: CategoryType.ADULT_PUTRA,
    targetNo: 1,
    position: "A" as "A" | "B" | "C" | "D",
    wave: 1,
  });

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArcher.name || !newArcher.club) return;

    const isKids = [
      CategoryType.U18_PUTRA,
      CategoryType.U18_PUTRI,
      CategoryType.U12_PUTRA,
      CategoryType.U12_PUTRI,
      CategoryType.U9_PUTRA,
      CategoryType.U9_PUTRI,
    ].includes(newArcher.category);
    const platformFee = isKids
      ? globalSettings.feeKids
      : globalSettings.feeAdult;

    const archer: Archer = {
      id: "m-arc-" + Math.random().toString(36).substr(2, 9),
      eventId: "", // Will be handled by parent if needed, but App.tsx just spreads it
      name: newArcher.name,
      email: newArcher.email || "-",
      club: newArcher.club,
      category: newArcher.category,
      phone: newArcher.phone || "-",
      status: "APPROVED",
      paymentType: "MANUAL",
      platformFee: platformFee,
      totalPaid: 0,
      createdAt: Date.now(),
      targetNo: newArcher.targetNo,
      position: newArcher.position,
      wave: newArcher.wave,
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
    };

    onAdd(archer);
    setShowAddForm(false);
    setNewArcher({
      name: "",
      email: "",
      phone: "",
      club: "",
      category: CategoryType.ADULT_PUTRA,
      targetNo: 1,
      position: "A",
      wave: 1,
    });
  };

  const handleSmartRandomize = () => {
    const isAll = (activeCategory as any) === "ALL";
    const categoryArchers = isAll ? [...archers] : archers.filter(
      (a) => a.category === activeCategory,
    );
    
    if (categoryArchers.length === 0) {
      alert("Tidak ada peserta yang bisa diacak.");
      return;
    }

    const effectiveArchersPerTarget = Number(archersPerTarget) || 4;
    const effectiveTotalTargets = Number(totalTargets) || 20;

    const categoryLabel = (activeCategory as any) === "ALL" ? "SEMUA KATEGORI" : CATEGORY_LABELS[activeCategory];
    if (
      !confirm(
        `Sistem akan mengacak posisi pemanah untuk ${categoryLabel} dan menyusun nomor bantalan secara otomatis (Kapasitas: ${effectiveTotalTargets} Bantalan x ${effectiveArchersPerTarget} Pemanah). Lanjutkan?`,
      )
    )
      return;

    setIsShuffling(true);
    const shuffleToastId = toast.loading(`Mengacak ${categoryArchers.length} peserta...`);

    setTimeout(() => {
      try {
        console.log(`Starting shuffle for: ${categoryLabel}. Archers to shuffle:`, categoryArchers.map(a => a.name));
        
        // Use a high-quality shuffle
        const shuffled = [...categoryArchers];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const archersPerWave = effectiveTotalTargets * effectiveArchersPerTarget;
        
        const updatedCategoryArchers = shuffled.map((a, index) => {
          const wave = Math.floor(index / archersPerWave) + 1;
          const indexInWave = index % archersPerWave;
          const targetNo = Math.floor(indexInWave / effectiveArchersPerTarget) + 1;
          const posIndex = indexInWave % effectiveArchersPerTarget;
          const position = ["A", "B", "C", "D"][posIndex] as "A" | "B" | "C" | "D";

          console.log(`Assigning ${a.name} to ${targetNo}${position}`);
          return { ...a, targetNo, position, wave };
        });

        if ((activeCategory as any) === "ALL") {
          // If in "ALL" tab, we still need to preserve OFFICIALS if they were excluded from shuffle
          const officials = archers.filter(a => a.category === CategoryType.OFFICIAL);
          onBulkUpdate([...updatedCategoryArchers, ...officials]);
        } else {
          const otherArchers = archers.filter((a) => a.category !== activeCategory);
          console.log(`Updating ${updatedCategoryArchers.length} archers. Keeping ${otherArchers.length} from other categories.`);
          onBulkUpdate([...otherArchers, ...updatedCategoryArchers]);
        }
        
        toast.success(`Berhasil mengacak ${updatedCategoryArchers.length} peserta!`, { id: shuffleToastId });
      } catch (err: any) {
        console.error("Shuffle Error:", err);
        toast.error("Gagal mengacak bantalan: " + err.message, { id: shuffleToastId });
      } finally {
        setIsShuffling(false);
      }
    }, 500); // Reduced delay for better UX
  };

  const handlePrint = (all: boolean = false) => {
    setPrintAllCategories(all);
    setTimeout(() => {
      window.print();
      setPrintAllCategories(false);
    }, 100);
  };

  const handlePrintScoringSheet = (id: string | "ALL") => {
    setPrintArcherId(id);
    setTimeout(() => {
      window.print();
      setPrintArcherId(null);
    }, 500);
  };

  const clubs = useMemo(() => {
    const uniqueClubs = Array.from(new Set(archers.map((a) => a.club))).sort();
    return ["ALL", ...uniqueClubs];
  }, [archers]);

  const filtered = useMemo(() => {
    return archers
      .filter((a) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          a.name.toLowerCase().includes(search) ||
          a.club.toLowerCase().includes(search) ||
          (a.targetNo + a.position).toLowerCase().includes(search);

        const matchesCategory =
        (activeCategory as any) === "ALL" || a.category === activeCategory;
        const matchesWave = filterWave === "ALL" || a.wave === filterWave;
        const matchesClub = filterClub === "ALL" || a.club === filterClub;

        return matchesSearch && matchesCategory && matchesWave && matchesClub;
      })
      .sort((a: Archer, b: Archer) => {
        const wA = a.wave || 1;
        const wB = b.wave || 1;
        if (wA !== wB) return wA - wB;

        const tA = a.targetNo === 0 ? 9999 : a.targetNo;
        const tB = b.targetNo === 0 ? 9999 : b.targetNo;
        if (tA !== tB) return tA - tB;

        return a.position.localeCompare(b.position);
      });
  }, [archers, activeCategory, searchTerm, filterWave, filterClub]);

  return (
    <div className="space-y-6">
      <div className="bg-[#FBFBFD] p-4 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-black font-oswald uppercase italic tracking-tighter text-slate-900">
              Manajemen Peserta
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total: {archers.length} Archer
              </p>
              {searchTerm && (
                <p className="text-[10px] font-black text-arcus-red uppercase tracking-widest">
                  • Filtered: {filtered.length}
                </p>
              )}
            </div>
          </div>
          {onRefreshData && (
            <div className="flex items-center gap-1">
              <button 
                onClick={onRefreshData}
                className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-emerald-500 hover:bg-emerald-50 transition-all active:scale-90"
                title="Tarik Data dari Cloud (Pull)"
              >
                <RefreshCw className={`w-4 h-4 ${(onRefreshData as any).isSyncing ? 'animate-spin' : ''}`} />
              </button>
              {onPushToCloud && (
                <button 
                  onClick={onPushToCloud}
                  disabled={isPushing}
                  className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-blue-500 hover:bg-blue-50 transition-all active:scale-90 disabled:opacity-50"
                  title="Kirim Data ke Cloud (Push)"
                >
                  {isPushing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pending Registrations Alert */}
      {registrations.filter((r) => r.status === "PENDING").length > 0 && (
        <div className="mx-4 bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 print:hidden">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg shrink-0">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="font-black font-oswald uppercase italic text-amber-900 text-lg leading-tight">
                Pendaftaran Baru Menunggu
              </h3>
              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mt-1">
                Ada {registrations.filter((r) => r.status === "PENDING").length}{" "}
                calon peserta baru yang butuh verifikasi pembayaran.
              </p>
            </div>
          </div>
          <p className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-200/50 px-4 py-2 rounded-xl">
            Cek Menu Finance
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 px-4 print:hidden">
          <button
            onClick={onGoToIdCardEditor}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Kartu Peserta
          </button>
          <button
            onClick={() => handlePrintScoringSheet("ALL")}
            className="bg-purple-100 text-purple-600 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-purple-200 transition-all active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5" />
            Scoring Sheet
          </button>
          <div className="relative">
            <button
              onClick={() => setShowPrintOptions(!showPrintOptions)}
              className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-slate-200 transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Daftar
            </button>
            {showPrintOptions && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowPrintOptions(false)}
                ></div>
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      handlePrint(false);
                      setShowPrintOptions(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 border-b border-slate-50"
                  >
                    Kategori Aktif
                  </button>
                  <button
                    onClick={() => {
                      handlePrint(true);
                      setShowPrintOptions(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Semua Kategori
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-arcus-red text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-red-700 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah
          </button>
          <button
            onClick={handleSmartRandomize}
            disabled={isShuffling}
            className="bg-arcus-dark text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
          >
            {isShuffling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Shuffle className="w-3.5 h-3.5 text-arcus-red" />
            )}
            Acak Bantalan
          </button>
        </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-2xl">
                  <UserPlus className="w-6 h-6 text-arcus-red" />
                </div>
                <h3 className="text-2xl font-black font-oswald uppercase italic text-slate-900">
                  Tambah Peserta Manual
                </h3>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 text-slate-300 hover:text-slate-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-1">
                    Nama Lengkap
                  </span>
                  <input
                    type="text"
                    required
                    value={newArcher.name}
                    onChange={(e) =>
                      setNewArcher({ ...newArcher, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-2.5 border font-bold outline-none focus:ring-4 ring-red-500/10 transition-all text-slate-900"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-1">
                    Email Archer (Opsional)
                  </span>
                  <input
                    type="email"
                    value={newArcher.email}
                    onChange={(e) =>
                      setNewArcher({ ...newArcher, email: e.target.value })
                    }
                    className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-2.5 border font-bold outline-none focus:ring-4 ring-red-500/10 transition-all text-slate-900 placeholder:text-slate-400"
                    placeholder="email@archer.com"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-1">
                    Nomor Telepon (WA)
                  </span>
                  <input
                    type="text"
                    value={newArcher.phone}
                    onChange={(e) =>
                      setNewArcher({ ...newArcher, phone: e.target.value })
                    }
                    className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-2.5 border font-bold outline-none focus:ring-4 ring-red-500/10 transition-all text-slate-900"
                    placeholder="0812..."
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-1">
                    Klub / Instansi
                  </span>
                  <input
                    type="text"
                    required
                    value={newArcher.club}
                    onChange={(e) =>
                      setNewArcher({ ...newArcher, club: e.target.value })
                    }
                    className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-2.5 border font-bold outline-none focus:ring-4 ring-red-500/10 transition-all text-slate-900"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-1">
                    Kategori
                  </span>
                  <select
                    value={newArcher.category}
                    onChange={(e) =>
                      setNewArcher({
                        ...newArcher,
                        category: e.target.value as CategoryType,
                      })
                    }
                    className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-2.5 border font-bold outline-none focus:ring-4 ring-red-500/10 transition-all text-slate-900"
                  >
                    {(Object.keys(CategoryType) as CategoryType[])
                      .filter((cat) => cat !== CategoryType.OFFICIAL)
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-1">
                    Bantalan
                  </span>
                  <input
                    type="number"
                    value={newArcher.targetNo}
                    onChange={(e) =>
                      setNewArcher({
                        ...newArcher,
                        targetNo: Math.min(
                          totalTargets,
                          parseInt(e.target.value) || 1,
                        ),
                      })
                    }
                    className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-2.5 border font-bold outline-none focus:ring-4 ring-red-500/10 transition-all text-slate-900"
                    min="1"
                    max={totalTargets}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-1">
                    Posisi
                  </span>
                  <select
                    value={newArcher.position}
                    onChange={(e) =>
                      setNewArcher({
                        ...newArcher,
                        position: e.target.value as any,
                      })
                    }
                    className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-2.5 border font-bold outline-none text-slate-900"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest px-1">
                    Sesi (Wave)
                  </span>
                  <input
                    type="number"
                    value={newArcher.wave}
                    onChange={(e) =>
                      setNewArcher({
                        ...newArcher,
                        wave: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-2.5 border font-bold outline-none text-slate-900 focus:ring-4 ring-red-500/10 transition-all"
                    min="1"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-arcus-red text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all"
              >
                Simpan Peserta
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 print:hidden">
        <button
          onClick={() => setActiveCategory("ALL" as any)}
          className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
            (activeCategory as any) === "ALL"
              ? "bg-slate-900 border-slate-900 text-white shadow-sm"
              : "bg-white border-slate-100 text-slate-900 hover:text-arcus-red hover:border-arcus-red"
          }`}
        >
          Semua Kategori
        </button>
        {(Object.keys(CategoryType) as CategoryType[])
          .filter((cat) => cat !== CategoryType.OFFICIAL)
          .map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeCategory === cat ? "bg-arcus-red border-arcus-red text-white shadow-sm" : "bg-white border-slate-100 text-slate-900 hover:text-arcus-red hover:border-arcus-red"}`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
      </div>

      {/* Printable Area (Hidden in UI, visible in Print) */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white p-4 min-h-screen">
        {printAllCategories ? (
          (Object.keys(CategoryType) as CategoryType[]).map((cat, idx) => {
            const catArchers = archers
              .filter((a) => a.category === cat)
              .sort((a, b) => {
                const wA = a.wave || 1;
                const wB = b.wave || 1;
                if (wA !== wB) return wA - wB;
                const tA = a.targetNo || 999;
                const tB = b.targetNo || 999;
                if (tA !== tB) return tA - tB;
                return a.position.localeCompare(b.position);
              });

            if (catArchers.length === 0) return null;

            return (
              <div
                key={cat}
                className={idx > 0 ? "page-break-before-always mt-10" : ""}
              >
                <div className="text-center mb-8 border-b-2 border-black pb-4">
                  <h1 className="text-2xl font-bold uppercase">
                    {settings.tournamentName}
                  </h1>
                  <h2 className="text-xl font-bold uppercase mt-1">
                    Daftar Peserta & Penempatan Bantalan
                  </h2>
                  <p className="text-lg font-bold uppercase mt-2 bg-slate-100 inline-block px-4 py-1 rounded">
                    Kategori: {CATEGORY_LABELS[cat]}
                  </p>
                </div>

                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-black py-2 px-1 text-[10px] font-bold uppercase w-8">
                        No
                      </th>
                      <th className="border border-black py-2 px-2 text-[10px] font-bold uppercase w-20">
                        Bantalan
                      </th>
                      <th className="border border-black py-2 px-2 text-[10px] font-bold uppercase">
                        Nama Pemanah
                      </th>
                      <th className="border border-black py-2 px-2 text-[10px] font-bold uppercase">
                        Klub / Kota
                      </th>
                      <th className="border border-black py-2 px-1 text-[10px] font-bold uppercase w-16">
                        Sesi
                      </th>
                      <th className="border border-black py-2 px-2 text-[10px] font-bold uppercase w-24">
                        Tanda Tangan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {catArchers.map((a: Archer, aIdx: number) => (
                      <tr key={a.id}>
                        <td className="border border-black py-2 px-1 text-center text-[10px]">
                          {aIdx + 1}
                        </td>
                        <td className="border border-black py-1 px-1 text-center font-bold text-base">
                          {a.targetNo}
                          {a.position}
                        </td>
                        <td className="border border-black py-1 px-2 text-[11px] font-bold uppercase">
                          {a.name}
                        </td>
                        <td className="border border-black py-1 px-2 text-[10px] uppercase">
                          {a.club}
                        </td>
                        <td className="border border-black py-1 px-1 text-center text-[10px] font-bold">
                          {a.wave}
                        </td>
                        <td className="border border-black py-1 px-2 text-center text-[9px] text-slate-300 italic min-h-[30px]">
                          ....................
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-12 flex justify-between items-end">
                  <div className="text-center w-48">
                    <p className="text-[10px] mb-12">
                      Dicetak: {new Date().toLocaleDateString("id-ID")}
                    </p>
                    <div className="border-b border-black mb-1"></div>
                    <p className="font-bold uppercase text-[10px]">
                      Koordinator Lapangan
                    </p>
                  </div>
                  <div className="text-center w-48">
                    <p className="text-[10px] mb-12">
                      {settings.location || "Panitia Pelaksana"}
                    </p>
                    <div className="border-b border-black mb-1"></div>
                    <p className="font-bold uppercase text-[10px]">
                      Ketua Panitia
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div>
            <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold uppercase">
                {settings.tournamentName}
              </h1>
              <h2 className="text-xl font-bold uppercase mt-1">
                Daftar Peserta & Penempatan Bantalan
              </h2>
              <p className="text-lg font-bold uppercase mt-2 bg-slate-100 inline-block px-4 py-1 rounded">
                Kategori: {CATEGORY_LABELS[activeCategory]}
              </p>
            </div>

            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black py-2 px-1 text-[10px] font-bold uppercase w-8">
                    No
                  </th>
                  <th className="border border-black py-2 px-2 text-[10px] font-bold uppercase w-20">
                    Bantalan
                  </th>
                  <th className="border border-black py-2 px-2 text-[10px] font-bold uppercase">
                    Nama Pemanah
                  </th>
                  <th className="border border-black py-2 px-2 text-[10px] font-bold uppercase">
                    Klub / Kota
                  </th>
                  <th className="border border-black py-2 px-1 text-[10px] font-bold uppercase w-16">
                    Sesi
                  </th>
                  <th className="border border-black py-2 px-2 text-[10px] font-bold uppercase w-24">
                    Tanda Tangan
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a: Archer, aIdx: number) => (
                  <tr key={a.id}>
                    <td className="border border-black py-2 px-1 text-center text-[10px]">
                      {aIdx + 1}
                    </td>
                    <td className="border border-black py-1 px-1 text-center font-bold text-base">
                      {a.targetNo}
                      {a.position}
                    </td>
                    <td className="border border-black py-1 px-2 text-[11px] font-bold uppercase">
                      {a.name}
                    </td>
                    <td className="border border-black py-1 px-2 text-[10px] uppercase">
                      {a.club}
                    </td>
                    <td className="border border-black py-1 px-1 text-center text-[10px] font-bold">
                      {a.wave}
                    </td>
                    <td className="border border-black py-1 px-2 text-center text-[9px] text-slate-300 italic min-h-[30px]">
                      ....................
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-12 flex justify-between items-end">
              <div className="text-center w-48">
                <p className="text-[10px] mb-12">
                  Dicetak: {new Date().toLocaleDateString("id-ID")}
                </p>
                <div className="border-b border-black mb-1"></div>
                <p className="font-bold uppercase text-[10px]">
                  Koordinator Lapangan
                </p>
              </div>
              <div className="text-center w-48">
                <p className="text-[10px] mb-12">
                  {settings.location || "Panitia Pelaksana"}
                </p>
                <div className="border-b border-black mb-1"></div>
                <p className="font-bold uppercase text-[10px]">Ketua Panitia</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scoring Sheet Print View */}
      {printArcherId && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[10000]">
          {printArcherId === "ALL" ? (
            filtered.map((a: Archer) => (
              <div key={a.id} className="page-break-after-always">
                <ScoringSheet
                  archer={a}
                  settings={settings}
                  eventId={eventId}
                />
              </div>
            ))
          ) : (
            <ScoringSheet
              archer={archers.find((a) => a.id === printArcherId)!}
              settings={settings}
              eventId={eventId}
            />
          )}
        </div>
      )}

      <div className="bg-white border-y border-slate-100 overflow-hidden print:hidden">
        <div className="p-4 bg-[#FBFBFD] flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, klub, atau bantalan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-arcus-red transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterWave}
              onChange={(e) =>
                setFilterWave(
                  e.target.value === "ALL" ? "ALL" : parseInt(e.target.value),
                )
              }
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none focus:border-arcus-red"
            >
              <option value="ALL">Semua Sesi</option>
              {Array.from(new Set(archers.map((a) => a.wave)))
                .sort((a: any, b: any) => (a as number) - (b as number))
                .map((w) => (
                  <option key={w as number} value={w as number}>
                    Sesi {w as number}
                  </option>
                ))}
            </select>
            <select
              value={filterClub}
              onChange={(e) => setFilterClub(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase outline-none focus:border-arcus-red max-w-[150px]"
            >
              {clubs.map((club: string) => (
                <option key={club} value={club}>
                  {club === "ALL" ? "Semua Klub" : club}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[300px] flex flex-col">
          <table className="w-full text-left text-xs flex-grow">
            <thead>
              <tr className="bg-white border-b text-slate-400 font-black uppercase">
                <th className="p-4 w-12">No.</th>
                <th className="p-4">Bantalan</th>
                <th className="p-4">Nama Pemanah</th>
                <th className="p-4">Kontak</th>
                <th className="p-4">Klub</th>
                <th className="p-4">Kategori</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a: Archer, idx: number) => (
                <tr key={a.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-black text-slate-300">{idx + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-arcus-red text-lg">
                        {a.targetNo > 0 ? `${a.targetNo}${a.position}` : "TBA"}
                        {a.wave > 1 ? `-${a.wave}` : ""}
                      </span>
                      {a.wave > 1 && (
                        <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase border border-blue-100">
                          Sesi {a.wave}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold uppercase underline decoration-slate-100 underline-offset-4">
                    {a.name}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 leading-none">
                        {a.phone || "-"}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 mt-1 leading-none">
                        {a.email || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 font-medium">{a.club}</td>
                  <td className="p-4 text-slate-400 uppercase font-black tracking-tighter">
                    {CATEGORY_LABELS[a.category] || a.category.replace("ADULT_", "")}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handlePrintScoringSheet(a.id)}
                        className="p-2 text-slate-300 hover:text-purple-600 transition-colors"
                        title="Cetak Scoring Sheet"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemove(a.id)}
                        className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-6 h-6 text-slate-200" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-900 uppercase italic">
                  {archers.length > 0 ? "Hasil Filter Kosong" : "Belum Ada Peserta"}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  {archers.length > 0 
                    ? "Coba ubah kata kunci pencarian atau kategori filter." 
                    : "Belum ada peserta yang terdaftar atau data cloud belum terunduh."}
                </p>
              </div>
              {onRefreshData && (
                <button 
                  onClick={onRefreshData}
                  className="px-6 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm"
                >
                  Segarkan dari Cloud
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArcherList;
