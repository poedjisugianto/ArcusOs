import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Download, Printer, ArrowLeft, Target, Award, Info, Trash2, ChevronRight, BarChart3 } from 'lucide-react';
import { ArcheryEvent, CategoryType, Archer } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { toast } from 'sonner';
import ArcusLogo from './ArcusLogo';

interface Props {
  state: ArcheryEvent;
  onResetScores: () => void;
  onBack: () => void;
}

export default function ResultsPanel({ state, onResetScores, onBack }: Props) {
  const [activeCategory, setActiveCategory] = useState<CategoryType>(CategoryType.ADULT_PUTRA);

  const rankings = useMemo(() => {
    const data = state.archers
      .filter(a => a.category === activeCategory)
      .map(archer => {
        const scores = state.scores.filter(s => s.archerId === archer.id);
        const total = scores.reduce((acc, curr) => acc + curr.total, 0);
        
        const manualSixes = scores.reduce((acc, curr) => acc + (curr.count6 || 0), 0);
        const manualFives = scores.reduce((acc, curr) => acc + (curr.count5 || 0), 0);
        
        const allArrows = scores.flatMap(s => s.arrows).filter(v => v !== -1);
        const arrowSixes = allArrows.filter(v => v === 'X' || v === 6).length;
        const arrowFives = allArrows.filter(v => v === 5).length;
        
        const hasManual = scores.some(s => s.count6 !== undefined);
        const sixes = hasManual ? manualSixes : arrowSixes;
        const fives = hasManual ? manualFives : arrowFives;
        
        return { ...archer, total, sixes, fives };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.sixes !== a.sixes) return b.sixes - a.sixes;
        return b.fives - a.fives;
      });

    return data.map((item, idx, arr) => {
      const isTie = arr.some((other, oIdx) => 
        oIdx !== idx && other.total === item.total && other.sixes === item.sixes && other.fives === item.fives
      );
      
      let tieLabel = "";
      let displayRank = idx + 1;

      if (isTie) {
        const tieGroup = arr.filter(o => o.total === item.total && o.sixes === item.sixes && o.fives === item.fives);
        const firstInTie = arr.findIndex(o => o.total === item.total && o.sixes === item.sixes && o.fives === item.fives);
        const posInTie = tieGroup.findIndex(o => o.id === item.id);
        tieLabel = String.fromCharCode(65 + posInTie);
        displayRank = firstInTie + 1;
      }
      
      return { ...item, tieLabel, displayRank };
    });
  }, [state, activeCategory]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const headers = ['Rank', 'Nama', 'Klub', 'Kategori', '6s/Xs', '5s', 'Total'];
    const rows = rankings.map(r => [
      r.displayRank + r.tieLabel,
      r.name,
      r.club,
      CATEGORY_LABELS[r.category],
      r.sixes,
      r.fives,
      r.total
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Hasil_${state.settings.tournamentName}_${activeCategory}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Berhasil diunduh");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-arcus-red selection:text-white pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-[1400px] mx-auto px-2 md:px-12 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-6">
            <button 
              onClick={onBack}
              className="p-1.5 md:p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg md:rounded-2xl transition-all"
            >
              <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
            </button>
            <div className="flex items-center gap-1.5 md:gap-3">
              <ArcusLogo className="w-7 h-7 md:w-10 md:h-10" />
              <div className="flex flex-col">
                <h2 className="text-[10px] md:text-xl font-black font-oswald uppercase italic leading-none tracking-tighter text-slate-900">Hasil Lomba</h2>
                <span className="text-[5px] md:text-[8px] font-black text-arcus-red uppercase tracking-[0.2em]">Tournament OS</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-4">
            <button 
              onClick={handlePrint}
              className="p-1.5 md:p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg md:rounded-2xl transition-all"
            >
              <Printer className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button 
              onClick={handleDownloadCSV}
              className="bg-slate-900 text-white px-2.5 md:px-8 py-1.5 md:py-3 rounded-lg md:rounded-2xl text-[7px] md:text-[10px] font-black uppercase tracking-widest hover:bg-arcus-red transition-all shadow-xl flex items-center gap-1 md:gap-2 whitespace-nowrap"
            >
              <Download className="w-3 h-3 md:w-4 md:h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        {/* Category Selector */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-8 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-arcus-red">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black font-oswald uppercase italic text-slate-900 leading-none">Filter Hasil</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pilih Kategori Pertandingan</p>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
              {(Object.keys(CategoryType) as CategoryType[])
                .filter(c => c !== CategoryType.OFFICIAL)
                .map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeCategory === cat ? 'bg-arcus-red text-white shadow-lg shadow-arcus-red/10' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Podium Section */}
        <div className="mb-16">
          <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-0">
            {/* 2nd Place */}
            {rankings[1] && (
              <div className="flex flex-col items-center order-2 md:order-1">
                <div className="w-28 h-28 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 relative shadow-sm border-2 border-white">
                  <Medal className="w-12 h-12 text-slate-400" />
                  <div className="absolute -bottom-3 bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase italic">Silver</div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black font-oswald uppercase italic text-slate-900 leading-none mb-1">{rankings[1].name}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{rankings[1].club}</p>
                  <p className="text-2xl font-black font-oswald text-slate-900 mt-2 italic">{rankings[1].total}</p>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {rankings[0] && (
              <div className="flex flex-col items-center order-1 md:order-2 md:-mx-2 relative z-10">
                <div className="w-40 h-40 bg-arcus-sun rounded-3xl flex items-center justify-center mb-6 relative shadow-lg border-4 border-white">
                  <Trophy className="w-20 h-20 text-black" />
                  <div className="absolute -bottom-4 bg-arcus-red text-white px-6 py-1.5 rounded-xl text-[10px] font-black uppercase italic shadow-md">Winner</div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black font-oswald uppercase italic text-slate-900 leading-none mb-1">{rankings[0].name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{rankings[0].club}</p>
                  <p className="text-5xl font-black font-oswald text-arcus-red mt-4 italic tracking-tighter">{rankings[0].total}</p>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {rankings[2] && (
              <div className="flex flex-col items-center order-3">
                <div className="w-28 h-28 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 relative shadow-sm border-2 border-white">
                  <Medal className="w-12 h-12 text-orange-400" />
                  <div className="absolute -bottom-3 bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase italic">Bronze</div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black font-oswald uppercase italic text-slate-900 leading-none mb-1">{rankings[2].name}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{rankings[2].club}</p>
                  <p className="text-2xl font-black font-oswald text-slate-900 mt-2 italic">{rankings[2].total}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Leaderboard */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-8 py-4 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-lg font-black font-oswald uppercase italic text-slate-900 flex items-center gap-3">
              <Award className="w-5 h-5 text-arcus-red" />
              Leaderboard Lengkap
            </h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{CATEGORY_LABELS[activeCategory]}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[8px] md:text-[9px] font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-4 md:px-8 py-3 md:py-4 w-12 md:w-20 text-center">Rank</th>
                  <th className="px-4 md:px-8 py-3 md:py-4">Nama Atlet</th>
                  <th className="px-8 py-4 hidden md:table-cell">Klub / Kota</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-center">6s/Xs</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-center">5s</th>
                  <th className="px-4 md:px-8 py-3 md:py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rankings.map((row, idx) => (
                  <tr key={row.id} className="group hover:bg-slate-50 transition-all">
                    <td className="px-2 md:px-10 py-3 md:py-6 text-center">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-black font-oswald italic text-xs md:text-xl mx-auto ${
                        idx < 3 ? 'bg-arcus-sun text-black' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {row.displayRank}{row.tieLabel}
                      </div>
                    </td>
                    <td className="px-2 md:px-10 py-3 md:py-6">
                      <p className="text-sm md:text-xl font-black font-oswald uppercase italic text-slate-900 leading-none tracking-tight">{row.name}</p>
                      <p className="text-[7px] md:hidden font-bold text-slate-400 uppercase mt-1">{row.club}</p>
                    </td>
                    <td className="px-4 md:px-10 py-3 md:py-6 hidden md:table-cell">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.club}</p>
                    </td>
                    <td className="px-2 md:px-10 py-3 md:py-6 text-center">
                      <span className="text-sm md:text-lg font-black font-oswald text-slate-400">{row.sixes}</span>
                    </td>
                    <td className="px-2 md:px-10 py-3 md:py-6 text-center">
                      <span className="text-sm md:text-lg font-black font-oswald text-slate-400">{row.fives}</span>
                    </td>
                    <td className="px-2 md:px-10 py-3 md:py-6 text-right">
                      <span className="text-xl md:text-4xl font-black font-oswald text-slate-900 italic tracking-tighter">{row.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tie Breaker Info */}
        <div className="mt-12 bg-white rounded-[2.5rem] p-8 border border-slate-100 flex items-center gap-6 print:hidden">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-black font-oswald uppercase italic text-slate-900 tracking-wider">Aturan Tie-Breaker</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Jika skor total sama, peringkat ditentukan berdasarkan jumlah 6s/Xs, kemudian jumlah 5s. Jika masih sama, label A/B akan diberikan.</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-20 pt-20 border-t border-slate-200 print:hidden">
          <div className="bg-red-50 rounded-[3rem] p-12 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-black font-oswald uppercase italic text-red-600 mb-2">Reset Semua Skor</h3>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Tindakan ini tidak dapat dibatalkan. Semua data skor akan dihapus permanen.</p>
            </div>
            <button 
              onClick={() => {
                if (confirm("Apakah Anda yakin ingin menghapus SEMUA skor untuk event ini?")) {
                  onResetScores();
                  toast.error("Semua skor telah direset");
                }
              }}
              className="px-10 py-5 bg-red-600 text-white rounded-[2rem] font-black font-oswald uppercase italic text-xl hover:bg-slate-900 transition-all shadow-xl shadow-red-200 flex items-center gap-3"
            >
              <Trash2 className="w-6 h-6" />
              Reset Semua Skor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
