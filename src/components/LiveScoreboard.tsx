import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Clock, X, Swords, Medal, LayoutList, Target, ChevronRight, Info, Activity, Monitor, Search } from 'lucide-react';
import { ArcheryEvent, CategoryType, Match } from '../types';
import { CATEGORY_LABELS } from '../constants';
import ArcusLogo from './ArcusLogo';

interface Props {
  state: ArcheryEvent;
  onBack: () => void;
}

const SponsorMatras = () => {
  const [index, setIndex] = useState(0);
  const sponsors = [
    { title: "HIT THE TARGET", desc: "ARCUS DIGITAL - SMART ARCHERY SYSTEM", color: "bg-arcus-red" },
    { title: "POWERED BY", desc: "TRADITIONAL ARCHERY INDONESIA", color: "bg-slate-900" },
    { title: "OFFICIAL PARTNER", desc: "LOCAL CLUB ARCHERY INDONESIA", color: "bg-blue-900" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % sponsors.length);
    }, 180000); // 3 Menit (180 detik)
    return () => clearInterval(timer);
  }, []);

  const current = sponsors[index];

  return (
    <div className={`hidden xl:flex items-center gap-4 ${current.color} rounded-lg px-6 py-2 border border-white/10 shadow-lg animate-in fade-in duration-1000 overflow-hidden relative group`}>
       <div className="absolute inset-0 bg-white/5 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-[2000ms]" />
       <div className="relative z-10 flex flex-col">
          <p className="text-[8px] font-black text-white/50 uppercase italic tracking-[0.2em]">{current.title}</p>
          <p className="text-white text-xs font-black uppercase italic tracking-tighter">{current.desc}</p>
       </div>
    </div>
  );
};

const LiveScoreboard: React.FC<Props> = ({ state, onBack }) => {
  const [activeTab, setActiveTab] = useState<'KUALIFIKASI' | 'ELIMINASI'>('KUALIFIKASI');
  const [filterCategory, setFilterCategory] = useState<CategoryType>(CategoryType.ADULT_PUTRA);
  const [searchTerm, setSearchTerm] = useState('');

  const config = (state.settings.categoryConfigs || {})[filterCategory];
  const isPuta = config?.targetType === 'PUTA';
  const labelSix = isPuta ? '2s' : '6s';
  const labelFive = isPuta ? '1s' : '5s';

  const matches = useMemo(() => {
    return state.matches[filterCategory] || [];
  }, [state.matches, filterCategory]);

  const leaderBoard = useMemo(() => {
    const data = state.archers
      .filter(a => a.category === filterCategory)
      .map(archer => {
        const scores = state.scores.filter(s => s.archerId === archer.id);
        const total = scores.reduce((acc, curr) => acc + curr.total, 0);
        
        const manualSixes = scores.reduce((acc, curr) => acc + (curr.count6 || 0), 0);
        const manualFives = scores.reduce((acc, curr) => acc + (curr.count5 || 0), 0);
        
        const allArrows = scores.flatMap(s => s.arrows).filter(v => v !== -1);
        const arrowSixes = allArrows.filter(v => isPuta ? v === 2 : (v === 'X' || v === 6)).length;
        const arrowFives = allArrows.filter(v => isPuta ? v === 1 : v === 5).length;
        
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
      
      return { ...item, tieLabel, displayRank, labelSix, labelFive };
    });
  }, [state, filterCategory]);

  const filteredLeaderBoard = useMemo(() => {
    if (!searchTerm) return leaderBoard;
    const search = searchTerm.toLowerCase();
    return leaderBoard.filter(a => 
      a.name.toLowerCase().includes(search) || 
      a.club.toLowerCase().includes(search) ||
      (a.targetNo + a.position).toLowerCase().includes(search)
    );
  }, [leaderBoard, searchTerm]);

  return (
    <div className="fixed inset-0 bg-[#F8F9FB] z-[100] flex flex-col text-slate-900 overflow-hidden font-sans selection:bg-arcus-red selection:text-white">
      <div className="bg-white border-b px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4">
           <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-xl transition-all"><X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" /></button>
           <div className="flex items-center gap-2 sm:gap-3">
             <ArcusLogo className="w-6 h-6 sm:w-8 sm:h-8" />
             <h1 className="text-sm sm:text-lg font-black font-oswald uppercase italic tracking-tighter">ARCUS LIVE Board</h1>
           </div>
        </div>
        
        <SponsorMatras />

        <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
           <button onClick={() => setActiveTab('KUALIFIKASI')} className={`px-4 sm:px-6 py-1.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'KUALIFIKASI' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-400'}`}>Kualifikasi</button>
           <button onClick={() => setActiveTab('ELIMINASI')} className={`px-4 sm:px-6 py-1.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ELIMINASI' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-400'}`}>Aduan</button>
        </div>
      </div>

      <div className="bg-[#FBFBFD] border-b flex flex-col md:flex-row md:items-center gap-4 px-4 sm:px-12 py-3 shrink-0">
        <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1 pb-1 md:pb-0">
          {(Object.keys(CategoryType) as CategoryType[]).map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 sm:px-5 py-2 rounded-lg text-[7px] sm:text-[8px] font-black uppercase whitespace-nowrap border transition-all ${filterCategory === cat ? 'bg-arcus-red border-arcus-red text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'}`}>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari pemanah..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-arcus-red transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white custom-scrollbar">
        <div className="w-full mx-auto">
           {activeTab === 'KUALIFIKASI' ? (
             <div className="border-t border-slate-100 overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <table className="w-full text-left">
                      <thead>
                       <tr className="bg-[#FBFBFD] text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                          <th className="px-12 py-4 w-28 text-center">Rank</th>
                          <th className="px-6 py-4 w-28">Target</th>
                          <th className="px-6 py-4">Athlete Name</th>
                          <th className="px-6 py-4">Club / Region</th>
                          <th className="px-4 py-4 text-center">{labelSix}</th>
                          <th className="px-4 py-4 text-center">{labelFive}</th>
                          <th className="px-12 py-4 text-right">Total</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {filteredLeaderBoard.map((row, idx) => (
                         <tr key={row.id} className="broadcast-row group hover:bg-slate-50 transition-all">
                            <td className="px-12 py-4">
                               <div className={`w-9 h-9 mx-auto rounded-lg flex items-center justify-center font-black font-oswald text-lg shadow-sm ${idx < 3 ? 'bg-arcus-sun text-black ring-1 ring-yellow-400/20' : 'bg-slate-100 text-slate-400'}`}>
                                 {idx + 1}
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <span className="text-xl font-black font-oswald text-blue-600 italic tracking-tighter">{row.targetNo > 0 ? `${row.targetNo}${row.position}` : 'TBA'}</span>
                            </td>
                            <td className="px-6 py-4 min-w-[200px]">
                               <p className="text-xl font-black font-oswald italic uppercase leading-none tracking-tighter">{row.name}</p>
                            </td>
                            <td className="px-6 py-4">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60 italic">{row.club}</p>
                            </td>
                            <td className="px-4 py-4 text-center">
                               <span className="text-lg font-black font-oswald text-slate-300">{row.sixes}</span>
                            </td>
                            <td className="px-4 py-4 text-center">
                               <span className="text-lg font-black font-oswald text-slate-300">{row.fives}</span>
                            </td>
                            <td className="px-12 py-4 text-right">
                               <span className="text-4xl font-black font-oswald tabular-nums text-slate-900 tracking-tighter italic">{row.total}</span>
                            </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden divide-y divide-slate-100">
                   {filteredLeaderBoard.map((row, idx) => (
                     <div key={row.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-all">
                        <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-black font-oswald text-lg shadow-md ${idx < 3 ? 'bg-arcus-sun text-black' : 'bg-slate-100 text-slate-400'}`}>
                           {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-0.5">
                              <span className="px-1 py-0.5 bg-slate-900 rounded text-[8px] font-black text-white font-oswald">
                                 {row.targetNo > 0 ? `${row.targetNo}${row.position}` : 'TBA'}
                              </span>
                              <p className="font-black font-oswald uppercase italic text-base truncate leading-tight">{row.name}</p>
                           </div>
                           <div className="flex items-center gap-2">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px]">{row.club}</p>
                              <div className="flex items-center gap-1.5">
                                 <span className="text-[8px] font-black text-slate-300 uppercase">{labelSix}: {row.sixes}</span>
                                 <span className="text-[8px] font-black text-slate-300 uppercase">{labelFive}: {row.fives}</span>
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-2xl font-black font-oswald text-slate-900 italic tracking-tighter">{row.total}</p>
                        </div>
                     </div>
                   ))}
                </div>

                {leaderBoard.length === 0 && (
                  <div className="py-20 sm:py-40 text-center opacity-10">
                     <Monitor className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4" />
                     <p className="text-sm sm:text-xl font-black uppercase font-oswald italic tracking-widest">Belum Ada Data Skor Masuk</p>
                  </div>
                )}
             </div>
           ) : (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {matches.length === 0 ? (
                  <div className="col-span-full bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-200 text-center space-y-4">
                     <Monitor className="w-16 h-16 text-slate-200 mx-auto" />
                     <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Belum ada bagan aduan untuk kategori ini</p>
                  </div>
                ) : (
                   matches.map((match) => {
                    const archerA = state.archers.find(a => a.id === match.archerAId);
                    const archerB = state.archers.find(a => a.id === match.archerBId);
                    
                    return (
                      <div key={match.id} className="bg-white border border-slate-100 flex flex-col shadow-sm">
                         <div className="bg-slate-900 px-6 py-3 flex justify-between items-center">
                            <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Match #{match.matchNo}</span>
                            <span className="text-[9px] font-black text-arcus-sun uppercase tracking-widest">Round of {match.round}</span>
                         </div>
                         
                         <div className="p-4 sm:p-6 space-y-4">
                            {/* Archer A */}
                            <div className={`flex items-center justify-between p-4 sm:p-5 border-l-4 transition-all ${match.winnerId === match.archerAId ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200'}`}>
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-white font-black font-oswald italic text-sm">
                                     {archerA?.targetNo}{archerA?.position}
                                  </div>
                                  <div>
                                     <p className="font-black font-oswald uppercase italic text-base leading-none tracking-tighter">{archerA?.name || 'BYE'}</p>
                                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{archerA?.club || '-'}</p>
                                  </div>
                                </div>
                                <div className="text-3xl font-black font-oswald italic text-slate-900 tracking-tighter">
                                   {match.scoreA}
                                </div>
                            </div>

                            <div className="flex justify-center -my-2 relative z-10">
                               <div className="w-8 h-8 bg-arcus-red rounded-full flex items-center justify-center text-white font-black italic text-[10px] shadow-md border-2 border-white">VS</div>
                            </div>

                            {/* Archer B */}
                            <div className={`flex items-center justify-between p-4 sm:p-5 border-l-4 transition-all ${match.winnerId === match.archerBId ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200'}`}>
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-white font-black font-oswald italic text-sm">
                                     {archerB?.targetNo}{archerB?.position}
                                  </div>
                                  <div>
                                     <p className="font-black font-oswald uppercase italic text-base leading-none tracking-tighter">{archerB?.name || 'BYE'}</p>
                                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{archerB?.club || '-'}</p>
                                  </div>
                               </div>
                               <div className="text-3xl font-black font-oswald italic text-slate-900 tracking-tighter">
                                  {match.scoreB}
                               </div>
                            </div>
                         </div>
                         
                         {match.winnerId && (
                           <div className="bg-emerald-500 px-6 py-2 text-center">
                              <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] italic">Winner: {state.archers.find(a => a.id === match.winnerId)?.name}</p>
                           </div>
                         )}
                      </div>
                    );
                  })
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default LiveScoreboard;
