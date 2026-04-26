import React, { useState, useMemo } from 'react';
import { Search, ArrowLeft, Users, Trophy, Target, ChevronRight, Filter, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { ArcheryEvent, CategoryType, Archer } from '../types';
import { CATEGORY_LABELS } from '../constants';
import ArcusLogo from './ArcusLogo';

interface Props {
  event: ArcheryEvent;
  onBack: () => void;
}

export default function EntryList({ event, onBack }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'ARCHERS' | 'OFFICIALS'>('ARCHERS');

  const categories = useMemo(() => {
    return (Object.keys(CategoryType) as CategoryType[]).filter(cat => cat !== CategoryType.OFFICIAL);
  }, []);

  const archers = useMemo(() => {
    return (event.archers || []).filter(a => a.category !== CategoryType.OFFICIAL);
  }, [event.archers]);

  const officials = useMemo(() => {
    return (event.archers || []).filter(a => a.category === CategoryType.OFFICIAL);
  }, [event.archers]);

  const currentList = viewMode === 'ARCHERS' ? archers : officials;

  const filteredData = useMemo(() => {
    return currentList.filter(item => {
      const name = item.name || '';
      const club = item.club || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           club.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = viewMode === 'OFFICIALS' || activeCategory === 'ALL' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [currentList, searchTerm, activeCategory, viewMode]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'APPROVED':
      case 'CONFIRMED':
        return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1"><CheckCircle2 className="w-2 h-2" /> TERVERIFIKASI</span>;
      case 'PENDING':
        return <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-[8px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-1"><Info className="w-2 h-2" /> MENUNGGU</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-[8px] font-black uppercase tracking-widest border border-red-100 italic">DITOLAK</span>;
      default:
        return <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded text-[8px] font-black uppercase tracking-widest border border-slate-100">PROSES</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-arcus-red selection:text-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
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
                <h2 className="text-[10px] md:text-xl font-black font-oswald uppercase italic leading-none tracking-tighter text-slate-900">Daftar Peserta</h2>
                <span className="text-[5px] md:text-[8px] font-black text-arcus-red uppercase tracking-[0.2em]">Tournament OS</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="p-1 px-2 md:p-3 md:px-5 bg-emerald-50 text-emerald-600 rounded-lg md:rounded-2xl border border-emerald-100 text-[7px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100 transition-all"
            >
              <RefreshCw className="w-2.5 h-2.5 md:w-4 md:h-4 animate-spin-slow" /> REFRESH
            </button>
            <div className="flex items-center gap-1 md:gap-2 px-2 md:px-6 py-1.5 md:py-3 bg-slate-50 rounded-lg md:rounded-2xl border border-slate-100 whitespace-nowrap">
              {viewMode === 'ARCHERS' ? <Users className="w-2.5 h-2.5 md:w-4 md:h-4 text-arcus-red" /> : <Users className="w-2.5 h-2.5 md:w-4 md:h-4 text-blue-600" />}
              <span className="text-[7px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest">{filteredData.length} <span className="hidden xs:inline">{viewMode === 'ARCHERS' ? 'Atlet' : 'Official'}</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8 md:py-12">
        {/* Toggle View */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => { setViewMode('ARCHERS'); setActiveCategory('ALL'); }}
            className={`flex-1 py-4 rounded-2xl md:rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${
              viewMode === 'ARCHERS' 
                ? 'bg-arcus-red border-arcus-red text-white shadow-xl shadow-red-200 active:scale-95' 
                : 'bg-red-50/50 border-red-100 text-arcus-red hover:bg-red-50 hover:border-red-200'
            }`}
          >
            <Trophy className={`w-5 h-5 ${viewMode === 'ARCHERS' ? 'text-white' : 'text-arcus-red'}`} />
            <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${viewMode === 'ARCHERS' ? 'text-white' : 'text-arcus-red'}`}>Daftar Atlet</span>
          </button>
          <button 
            onClick={() => { setViewMode('OFFICIALS'); setActiveCategory('ALL'); }}
            className={`flex-1 py-4 rounded-2xl md:rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${
              viewMode === 'OFFICIALS' 
                ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 active:scale-95' 
                : 'bg-blue-50/50 border-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-200'
            }`}
          >
            <Users className={`w-5 h-5 ${viewMode === 'OFFICIALS' ? 'text-white' : 'text-blue-600'}`} />
            <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${viewMode === 'OFFICIALS' ? 'text-white' : 'text-blue-600'}`}>Daftar Official</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className={`mb-8 pl-4 border-l-4 ${viewMode === 'ARCHERS' ? 'border-arcus-red' : 'border-blue-600'}`}>
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900" />
              <input 
                type="text" 
                placeholder={viewMode === 'ARCHERS' ? "Cari nama atlet atau klub..." : "Cari nama official atau klub..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:border-arcus-red transition-all shadow-sm"
              />
            </div>
            {viewMode === 'ARCHERS' && (
              <div className="flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar w-full lg:w-auto pb-2 lg:pb-0">
                <button 
                  onClick={() => setActiveCategory('ALL')}
                  className={`px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-widest transition-all border ${
                    activeCategory === 'ALL' ? 'bg-arcus-red border-arcus-red text-white shadow-sm' : 'bg-white border-slate-100 text-slate-900 hover:text-arcus-red hover:border-arcus-red'
                  }`}
                >
                  Semua
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                      activeCategory === cat ? 'bg-arcus-red border-arcus-red text-white shadow-sm' : 'bg-white border-slate-100 text-slate-900 hover:text-arcus-red hover:border-arcus-red'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Participant Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm md:text-base">
              <thead>
                <tr className="bg-slate-50 text-slate-900 text-[9px] md:text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-4 md:px-10 py-3 md:py-6 w-12 md:w-16">No</th>
                  <th className="px-4 md:px-10 py-3 md:py-6">{viewMode === 'ARCHERS' ? 'Archer' : 'Official Name'}</th>
                  <th className="px-4 md:px-10 py-3 md:py-6 hidden md:table-cell">Club</th>
                  {viewMode === 'ARCHERS' && <th className="px-4 md:px-10 py-3 md:py-6 hidden sm:table-cell">Category</th>}
                  {viewMode === 'ARCHERS' && <th className="px-4 md:px-10 py-3 md:py-6 text-center">Target</th>}
                  <th className="px-4 md:px-10 py-3 md:py-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item, idx) => (
                  <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                    <td className="px-4 md:px-10 py-3 md:py-6">
                      <div className={`w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-lg md:rounded-xl flex items-center justify-center font-black font-oswald italic text-xs md:text-base text-slate-400 group-hover:text-white transition-all ${viewMode === 'ARCHERS' ? 'group-hover:bg-arcus-red' : 'group-hover:bg-blue-600'}`}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-4 md:px-10 py-3 md:py-6">
                      <p className="text-sm md:text-xl font-black font-oswald uppercase italic text-slate-900 leading-none tracking-tight">{item.name}</p>
                      <p className="text-[7px] font-bold text-slate-400 md:hidden uppercase mt-1">{item.club}</p>
                    </td>
                    <td className="px-10 py-6 hidden md:table-cell">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.club}</p>
                    </td>
                    {viewMode === 'ARCHERS' && (
                      <td className="px-10 py-6 hidden sm:table-cell">
                        <span className="px-4 py-2 bg-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {CATEGORY_LABELS[item.category as CategoryType]}
                        </span>
                      </td>
                    )}
                    {viewMode === 'ARCHERS' && (
                      <td className="px-4 md:px-10 py-3 md:py-6 text-center">
                        <span className="text-lg md:text-2xl font-black font-oswald text-arcus-red italic">
                          {item.targetNo > 0 ? `${item.targetNo}${item.position}` : '-'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 md:px-10 py-3 md:py-6 text-right">
                      <div className="flex items-center justify-end">
                        {getStatusBadge(item.status)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="py-24 text-center">
              <Users className="w-16 h-16 text-slate-100 mx-auto mb-6" />
              <p className="text-xl font-black font-oswald uppercase italic text-slate-300">Tidak Ada {viewMode === 'ARCHERS' ? 'Peserta' : 'Official'} Ditemukan</p>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className={`mt-12 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden ${viewMode === 'ARCHERS' ? 'bg-slate-900' : 'bg-blue-900 border-b-8 border-blue-800'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full" />
          <div className="flex items-center gap-6 relative z-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${viewMode === 'ARCHERS' ? 'bg-arcus-red' : 'bg-blue-500'}`}>
              {viewMode === 'ARCHERS' ? <Info className="w-6 h-6" /> : <Users className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm font-black font-oswald uppercase italic text-white tracking-wider">{viewMode === 'ARCHERS' ? 'Informasi Start List' : 'Informasi Official Area'}</p>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                {viewMode === 'ARCHERS' 
                  ? "Nomor bantalan akan diupdate oleh panitia setelah pendaftaran ditutup."
                  : "Official terdaftar mendapatkan akses ke area steril atlit selama perlombaan berlangsung."}
              </p>
            </div>
          </div>
          <a 
            href="https://wa.me/6287834193339"
            target="_blank"
            rel="noreferrer"
            className={`px-8 py-4 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative z-10 flex items-center justify-center ${viewMode === 'ARCHERS' ? 'text-slate-900 hover:bg-arcus-red hover:text-white' : 'text-blue-900 hover:bg-blue-500 hover:text-white'}`}
          >
            Hubungi Panitia
          </a>
        </div>
      </div>
    </div>
  );
}
