import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trophy, Clock, X, Swords, Medal, LayoutList, Target, ChevronRight, Info, Activity, Monitor, Search, Check, Maximize2, Pause, Play, ChevronLeft } from 'lucide-react';
import { ArcheryEvent, CategoryType, Match, TargetType } from '../types';
import { CATEGORY_LABELS } from '../constants';
import ArcusLogo from './ArcusLogo';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  state: ArcheryEvent;
  onBack: () => void;
  startInTVMode?: boolean;
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
    <div className={`hidden xl:flex items-center gap-4 ${current.color} rounded-lg px-6 py-2 border border-white/10 shadow-lg animate-in fade-in duration-1000 overflow-hidden relative group shrink-0`}>
       <div className="absolute inset-0 bg-white/5 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-[2000ms]" />
       <div className="relative z-10 flex flex-col">
          <p className="text-[8px] font-black text-white/50 uppercase italic tracking-[0.2em]">{current.title}</p>
          <p className="text-white text-xs font-black uppercase italic tracking-tighter">{current.desc}</p>
       </div>
    </div>
  );
};

const LiveScoreboard: React.FC<Props> = ({ state, onBack, startInTVMode = false }) => {
  const [activeTab, setActiveTab] = useState<'KUALIFIKASI' | 'ELIMINASI'>('KUALIFIKASI');
  const [filterCategory, setFilterCategory] = useState<CategoryType>(CategoryType.ADULT_PUTRA);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSession, setActiveSession] = useState<string>('QUAL');
  const [isTVMode, setIsTVMode] = useState(startInTVMode);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const config = (state.settings.categoryConfigs || {})[filterCategory];
  
  const allCategories = useMemo(() => [
    CategoryType.ADULT_PUTRA,
    CategoryType.ADULT_PUTRI,
    CategoryType.U18_PUTRA,
    CategoryType.U18_PUTRI,
    CategoryType.U12_PUTRA,
    CategoryType.U12_PUTRI,
    CategoryType.U9_PUTRA,
    CategoryType.U9_PUTRI
  ], []);

  // TV Mode Auto-Rotation
  useEffect(() => {
    if (!isTVMode || isPaused) return;

    const timer = setInterval(() => {
      setFilterCategory(prev => {
        const currentIndex = allCategories.indexOf(prev);
        const nextIndex = (currentIndex + 1) % allCategories.length;
        return allCategories[nextIndex];
      });
      setActiveSession('QUAL');
      
      // Reset scroll when category changes
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 20000); // Cycle every 20 seconds

    return () => clearInterval(timer);
  }, [isTVMode, isPaused, allCategories]);

  // TV Mode Auto-Scrolling
  useEffect(() => {
    if (!isTVMode || isPaused) return;

    let scrollInterval: NodeJS.Timeout;
    let direction = 1;
    
    const startScrolling = () => {
      scrollInterval = setInterval(() => {
        if (scrollContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
          
          if (direction === 1 && scrollTop + clientHeight >= scrollHeight - 2) {
            // Stay at bottom for a bit
            clearInterval(scrollInterval);
            setTimeout(() => {
              direction = -1;
              startScrolling();
            }, 5000);
          } else if (direction === -1 && scrollTop <= 0) {
            // Stay at top for a bit
            clearInterval(scrollInterval);
            setTimeout(() => {
              direction = 1;
              startScrolling();
            }, 5000);
          } else {
            scrollContainerRef.current.scrollBy({ top: direction * 0.5, behavior: 'auto' });
          }
        }
      }, 30); // Very smooth slow scroll
    };

    startScrolling();
    return () => clearInterval(scrollInterval);
  }, [isTVMode, isPaused, filterCategory]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
        setIsTVMode(true);
    } else {
        document.exitFullscreen();
        setIsTVMode(false);
    }
  };

  const availableSessions = useMemo(() => {
    const sessions = ['QUAL'];
    if (config?.eliminationStages) {
      config.eliminationStages.forEach(size => {
        sessions.push(`ELIM_${size}`);
      });
    }
    return sessions;
  }, [config]);

  const isSmallTarget = config?.targetType === TargetType.PUTA || config?.targetType === TargetType.TRADITIONAL_PUTA;
  const labelSix = isSmallTarget ? '2s' : '6s';
  const labelFive = isSmallTarget ? '1s' : '5s';

  const matches = useMemo(() => {
    return (state.matches as any)[filterCategory] || [];
  }, [state.matches, filterCategory]);

  const eliminationSize = useMemo(() => {
    // Priority 1: Config from admin panel (the official setting)
    if (config?.h2hStartSize) return config.h2hStartSize;
    
    // Priority 2: Derived from matches (fallback if config missing)
    if (matches.length === 0) return 0;
    return Math.max(...matches.map(m => parseInt(m.round)));
  }, [config, matches]);

  const leaderBoard = useMemo(() => {
    const data = state.archers
      .filter(a => a.category === filterCategory)
      .map(archer => {
        const scores = state.scores.filter(s => s.archerId === archer.id && s.sessionId === activeSession && !s.isDeleted);
        const total = scores.reduce((acc, curr) => acc + curr.total, 0);
        
        const manualSixes = scores.reduce((acc, curr) => acc + (curr.count6 || 0), 0);
        const manualFives = scores.reduce((acc, curr) => acc + (curr.count5 || 0), 0);
        
        const allArrows = scores.flatMap(s => s.arrows).filter(v => v !== -1);
        const arrowSixes = allArrows.filter(v => isSmallTarget ? v === 2 : (v === 'X' || v === 6)).length;
        const arrowFives = allArrows.filter(v => isSmallTarget ? v === 1 : v === 5).length;
        
        const hasManual = scores.some(s => s.count6 !== undefined);
        const sixes = hasManual ? manualSixes : arrowSixes;
        const fives = hasManual ? manualFives : arrowFives;
        
        // Map scores for each end
        const endScores = Array.from({ length: config?.ends || 0 }).map((_, i) => {
          const s = scores.find(sc => sc.endIndex === i && sc.sessionId === activeSession);
          return s ? s.total : null;
        });
        
        return { ...archer, total, sixes, fives, endScores };
      })
      .filter(a => activeSession === 'QUAL' || a.total > 0)
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
  }, [state, filterCategory, activeSession, config, isSmallTarget, labelSix, labelFive]);

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
    <div className={`fixed inset-0 z-[100] flex flex-col font-sans transition-colors duration-1000 ${isTVMode ? 'bg-[#0F172A]' : 'bg-[#F8F9FB] text-slate-900'}`}>
      {/* Header */}
      <div className={`${isTVMode ? 'bg-slate-900/50 backdrop-blur-md border-b border-white/5 py-4 shadow-2xl' : 'bg-white border-b py-2 sm:py-3 shadow-sm'} px-6 sm:px-10 flex items-center justify-between shrink-0 transition-all duration-700`}>
        <div className="flex items-center gap-6">
           {!isTVMode && (
             <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
               <X className="w-5 h-5 text-slate-400" />
             </button>
           )}
           <div className="flex items-center gap-4">
             <div className={`${isTVMode ? 'bg-white p-2 rounded-xl' : ''}`}>
               <ArcusLogo className="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-700" />
             </div>
             <div>
               <h1 className={`text-lg sm:text-2xl font-black font-oswald uppercase italic tracking-tighter leading-none ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                 {isTVMode ? 'ARCUS DIGITAL DISPLAY' : 'LIVE BOARD'}
               </h1>
               {isTVMode && (
                 <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                   <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   REALTIME UPDATING • {CATEGORY_LABELS[filterCategory]}
                 </p>
               )}
             </div>
           </div>
        </div>
        
        <div className="flex items-center gap-6">
          <SponsorMatras />
          
          <div className="flex items-center gap-3">
            {isTVMode && (
              <button 
                onClick={() => setIsTVMode(false)}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-white text-slate-900 hover:bg-slate-100"
              >
                <Monitor className="w-4 h-4" />
                <span>Close TV Mode</span>
              </button>
            )}
            
            {isTVMode && (
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={`p-3 rounded-2xl transition-all active:scale-95 ${isPaused ? 'bg-arcus-red text-white shadow-lg shadow-red-500/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {!isTVMode && (
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
             <button onClick={() => setActiveTab('KUALIFIKASI')} className={`px-5 sm:px-8 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'KUALIFIKASI' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Kualifikasi</button>
             <button onClick={() => setActiveTab('ELIMINASI')} className={`px-5 sm:px-8 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ELIMINASI' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Aduan</button>
          </div>
        )}
      </div>

      {!isTVMode && (
        <>
          <div className="bg-[#FBFBFD] border-b flex flex-col md:flex-row md:items-center gap-4 px-10 py-4 shrink-0">
            <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
              {allCategories.map(cat => (
                <button key={cat} onClick={() => {
                  setFilterCategory(cat);
                  setActiveSession('QUAL');
                }} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap border-2 transition-all ${filterCategory === cat ? 'bg-arcus-red border-arcus-red text-white shadow-lg shadow-red-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'KUALIFIKASI' && availableSessions.length > 1 && (
            <div className="bg-white border-b px-10 py-3 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pilih Babak:</span>
                 <div className="flex gap-2">
                    {availableSessions.map(sess => (
                      <button 
                       key={sess} 
                       onClick={() => setActiveSession(sess)} 
                       className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${activeSession === sess ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                      >
                        {sess === 'QUAL' ? 'KUALIFIKASI' : sess.replace('ELIM_', 'ELIMINASI TOP ')}
                      </button>
                    ))}
                 </div>
               </div>
            </div>
          )}

          <div className="bg-[#FBFBFD] border-b px-10 py-4 shrink-0">
            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari nama pemanah..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-5 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-arcus-red transition-all"
              />
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-auto custom-scrollbar ${isTVMode ? 'bg-[#0F172A] p-0' : 'bg-white'}`}
      >
        <div className={`${isTVMode ? 'w-full' : 'w-full max-w-[1600px] mx-auto'}`}>
           {activeTab === 'KUALIFIKASI' ? (
             <div className={`${isTVMode ? 'bg-transparent' : 'bg-white overflow-x-auto sm:overflow-visible'} transition-all duration-700`}>
                <table className="w-full text-left border-collapse table-fixed sm:table-auto">
                    <thead>
                     <tr className={`${isTVMode ? 'bg-slate-800/30 text-white/40' : 'bg-slate-50 text-slate-400'} text-[8px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] border-b border-white/5`}>
                        <th className={`py-2 sm:py-6 text-center ${isTVMode ? 'px-16 w-48' : 'px-1 sm:px-10 w-8 sm:w-32'}`}>Rank</th>
                        <th className={`py-2 sm:py-6 text-center ${isTVMode ? 'px-6 w-48' : 'px-1 sm:px-6 w-8 sm:w-32'}`}>TGT</th>
                        <th className="px-2 sm:px-6 py-2 sm:py-6 w-[25%] sm:w-auto">Info</th>
                        {!isTVMode && <th className="px-1 sm:px-6 py-2 sm:py-6">Scores</th>}
                        <th className="px-1 sm:px-4 py-2 sm:py-6 text-center w-6 sm:w-auto">{labelSix}</th>
                        <th className="px-1 sm:px-4 py-2 sm:py-6 text-center w-6 sm:w-auto">{labelFive}</th>
                        <th className={`py-2 sm:py-6 text-right ${isTVMode ? 'px-16' : 'px-2 sm:px-10'} w-10 sm:w-auto`}>Total</th>
                     </tr>
                   </thead>
                   <tbody className={`divide-y ${isTVMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                     {filteredLeaderBoard.map((row, idx) => {
                       const isLastQualified = eliminationSize > 0 && (idx + 1) === eliminationSize;
                       const isQualified = eliminationSize > 0 && (idx + 1) <= eliminationSize;
                       
                       return (
                          <React.Fragment key={row.id}>
                            <tr className={`group transition-all duration-500 ${isTVMode ? 'hover:bg-white/5' : 'hover:bg-slate-50 italic'} ${isQualified && !isTVMode ? 'bg-emerald-50/10' : ''}`}>
                              <td className={`${isTVMode ? 'py-12 px-16' : 'py-1.5 sm:py-6 px-0.5 sm:px-10'}`}>
                                 <div className={`mx-auto rounded-lg sm:rounded-3xl flex items-center justify-center font-black font-oswald shadow-sm sm:shadow-xl transition-all duration-700 ${isTVMode ? 'w-24 h-24 text-6xl shadow-sun-500/20' : 'w-5 h-5 sm:w-12 sm:h-12 text-[8px] sm:text-2xl'} ${idx < 3 ? 'bg-arcus-sun text-black' : isTVMode ? 'bg-white/10 text-white/50' : 'bg-slate-100 text-slate-400'} ${isQualified && idx >= 3 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : ''}`}>
                                   {idx + 1}
                                 </div>
                              </td>
                              <td className={`${isTVMode ? 'py-12 px-6' : 'py-1.5 sm:py-6 px-0.5 sm:px-6'}`}>
                                 <div className="text-center">
                                   <span className={`font-black font-oswald italic tracking-tighter ${isTVMode ? 'text-7xl text-arcus-sun' : 'text-[9px] sm:text-2xl text-blue-600'}`}>
                                     {row.targetNo > 0 ? `${row.targetNo}${row.position}` : '-'}
                                   </span>
                                 </div>
                              </td>
                              <td className={`${isTVMode ? 'py-12 px-6' : 'py-1.5 sm:py-6 px-1.5 sm:px-6'}`}>
                                 <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1 sm:gap-6 flex-wrap">
                                      <p className={`font-black font-oswald italic uppercase leading-none tracking-tighter transition-colors truncate max-w-full ${isTVMode ? 'text-8xl text-white' : 'text-[8px] sm:text-xl text-slate-900 group-hover:text-arcus-red'}`}>{row.name}</p>
                                      {isQualified && (
                                        <span className={`bg-emerald-500 font-black text-white rounded-md sm:rounded-xl uppercase tracking-[0.1em] sm:tracking-[0.2em] leading-none shadow-md ${isTVMode ? 'px-6 py-3 text-base' : 'px-1 py-0.5 text-[4px] sm:text-[9px]'}`}>QUAL</span>
                                      )}
                                    </div>
                                    <p className={`font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] italic truncate ${isTVMode ? 'text-2xl text-white/30 mt-4' : 'text-[5px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-2'}`}>{row.club}</p>
                                 </div>
                              </td>
                              {!isTVMode && (
                                <td className="py-1.5 sm:py-6 px-0.5 sm:px-6">
                                   <div className="flex items-center gap-0.5 sm:gap-1">
                                      {(row.endScores || []).map((score, sIdx) => (
                                        <div 
                                          key={sIdx} 
                                          className={`w-3 h-3 sm:w-9 sm:h-9 rounded-sm sm:rounded-xl flex flex-col items-center justify-center border transition-all ${score !== null ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                                        >
                                          <span className="text-[2px] sm:text-[6px] font-bold opacity-50 uppercase">R{sIdx + 1}</span>
                                          <span className="text-[4px] sm:text-xs font-black font-oswald">{score !== null ? score : '-'}</span>
                                        </div>
                                      ))}
                                   </div>
                                </td>
                              )}
                              <td className={`text-center ${isTVMode ? 'py-12 px-4' : 'py-1.5 sm:py-6 px-0.5'}`}>
                                 <span className={`font-black font-oswald ${isTVMode ? 'text-5xl text-white/20' : 'text-[8px] sm:text-xl text-slate-300'}`}>{row.sixes}</span>
                              </td>
                              <td className={`text-center ${isTVMode ? 'py-12 px-4' : 'py-1.5 sm:py-6 px-0.5'}`}>
                                 <span className={`font-black font-oswald ${isTVMode ? 'text-5xl text-white/20' : 'text-[8px] sm:text-xl text-slate-300'}`}>{row.fives}</span>
                              </td>
                              <td className={`text-right ${isTVMode ? 'py-12 px-16' : 'py-1.5 sm:py-6 px-1 sm:px-10'}`}>
                                 <span className={`font-black font-oswald tabular-nums tracking-tighter italic ${isTVMode ? 'text-[10rem] text-white animate-pulse' : 'text-[9px] sm:text-5xl text-slate-900'}`}>{row.total}</span>
                              </td>
                           </tr>
                           {isLastQualified && (
                             <tr>
                               <td colSpan={isTVMode ? 6 : 7} className="px-0 py-0">
                                 <div className={`${isTVMode ? 'bg-emerald-500/10' : 'bg-emerald-500'} py-4 flex items-center justify-center gap-6`}>
                                    <div className={`h-px flex-1 ml-16 ${isTVMode ? 'bg-emerald-500/20' : 'bg-white/30'}`} />
                                    <div className="flex items-center gap-4">
                                       <Trophy className={`w-5 h-5 ${isTVMode ? 'text-emerald-500' : 'text-white'}`} />
                                       <span className={`text-xs font-black uppercase tracking-[0.5em] italic ${isTVMode ? 'text-emerald-500' : 'text-white'}`}>BABAK ELIMINASI {eliminationSize} BESAR</span>
                                    </div>
                                    <div className={`h-px flex-1 mr-16 ${isTVMode ? 'bg-emerald-500/20' : 'bg-white/30'}`} />
                                 </div>
                               </td>
                             </tr>
                           )}
                         </React.Fragment>
                       );
                     })}
                   </tbody>
                </table>
                
                {filteredLeaderBoard.length === 0 && (
                   <div className="py-40 text-center">
                      <div className="w-24 h-24 bg-white/5 rounded-[3rem] flex items-center justify-center mx-auto mb-8 border border-white/5">
                        <Monitor className="w-12 h-12 text-white/20" />
                      </div>
                      <p className={`text-2xl font-black uppercase font-oswald italic tracking-[0.4em] ${isTVMode ? 'text-white/10' : 'text-slate-100'}`}>Menunggu Data Skor</p>
                   </div>
                )}
             </div>
           ) : (
             <div className={`${isTVMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} grid gap-4 sm:gap-10`}>
                {matches.length === 0 ? (
                  <div className="col-span-full py-20 sm:py-40 rounded-[2rem] sm:rounded-[4rem] border-4 border-dashed border-slate-100 text-center flex flex-col items-center justify-center space-y-6">
                     <Swords className="w-12 h-12 sm:w-20 sm:h-20 text-slate-100" />
                     <p className="text-xl sm:text-2xl font-black uppercase text-slate-300 tracking-[0.3em] font-oswald italic">Bagan aduan belum tersedia</p>
                  </div>
                ) : (
                   matches.map((match) => {
                    const archerA = state.archers.find(a => a.id === match.archerAId);
                    const archerB = state.archers.find(a => a.id === match.archerBId);
                    
                    return (
                      <div key={match.id} className={`${isTVMode ? 'bg-transparent border-white/5' : 'bg-white border-slate-100 border-2 rounded-2xl sm:rounded-[2.5rem]'} flex flex-col overflow-hidden transition-all duration-700`}>
                         <div className={`${isTVMode ? 'bg-white/5' : 'bg-slate-900/80'} backdrop-blur-md px-6 sm:px-10 py-3 sm:py-5 flex justify-between items-center`}>
                            <div className="flex items-center gap-3 sm:gap-4">
                                <span className={`bg-arcus-red rounded-full ${isTVMode ? 'w-3 h-3' : 'w-2 h-2'}`} />
                                <span className={`font-black uppercase tracking-[0.3em] ${isTVMode ? 'text-white/60 text-lg' : 'text-white/50 text-[8px] sm:text-xs'}`}>Match #{match.matchNo}</span>
                            </div>
                            <span className={`font-black text-arcus-sun uppercase tracking-[0.3em] font-oswald italic ${isTVMode ? 'text-3xl' : 'text-[8px] sm:text-xs'}`}>TOP {match.round}</span>
                         </div>
                         
                         <div className={`${isTVMode ? 'p-0 py-10 space-y-4' : 'p-4 sm:p-10 space-y-3 sm:space-y-8'}`}>
                            {/* Archer A */}
                            <div className={`flex items-center justify-between transition-all duration-500 ${isTVMode ? 'p-8 bg-white/5 border-white/5' : 'p-3 sm:p-8 rounded-xl sm:rounded-3xl border-l-4 sm:border-l-8 shadow-sm sm:shadow-xl'} ${match.winnerId === match.archerAId ? 'bg-emerald-500/20 border-emerald-500' : !isTVMode ? 'bg-slate-50 border-slate-200' : ''}`}>
                               <div className="flex items-center gap-4 sm:gap-10">
                                  <div className={`${isTVMode ? 'w-24 h-24 text-4xl' : 'w-9 h-9 sm:w-16 sm:h-16 text-sm sm:text-2xl'} bg-slate-900 rounded-lg sm:rounded-2xl flex items-center justify-center text-white font-black font-oswald italic shadow-2xl shrink-0`}>
                                     {archerA?.targetNo || '-'}{archerA?.position || ''}
                                  </div>
                                  <div>
                                     <p className={`font-black font-oswald uppercase italic leading-none tracking-tighter ${isTVMode ? 'text-7xl text-white' : 'text-base sm:text-3xl text-slate-900'}`}>{archerA?.name || 'BYE'}</p>
                                     <p className={`font-black uppercase tracking-[0.3em] ${isTVMode ? 'text-xl text-white/30 mt-4' : 'text-[7px] sm:text-[10px] text-slate-400 mt-1 sm:mt-4'}`}>{archerA?.club || '-'}</p>
                                  </div>
                                </div>
                                <div className={`font-black font-oswald italic tracking-tighter tabular-nums ${isTVMode ? 'text-[10rem]' : 'text-3xl sm:text-6xl'} ${match.winnerId === match.archerAId ? 'text-emerald-500' : 'text-white/40'}`}>
                                   {match.scoreA}
                                </div>
                            </div>

                            <div className={`flex justify-center relative z-10 ${isTVMode ? '-my-10' : '-my-6'}`}>
                               <div className={`${isTVMode ? 'w-24 h-24 text-3xl' : 'w-8 h-8 sm:w-14 sm:h-14 text-xs sm:text-xl'} bg-arcus-red rounded-full flex items-center justify-center text-white font-black italic shadow-lg border-2 sm:border-4 border-white`}>VS</div>
                            </div>

                            {/* Archer B */}
                            <div className={`flex items-center justify-between transition-all duration-500 ${isTVMode ? 'p-8 bg-white/5 border-white/5' : 'p-3 sm:p-8 rounded-xl sm:rounded-3xl border-l-4 sm:border-l-8 shadow-sm sm:shadow-xl'} ${match.winnerId === match.archerBId ? 'bg-emerald-500/20 border-emerald-500' : !isTVMode ? 'bg-slate-50 border-slate-200' : ''}`}>
                               <div className="flex items-center gap-4 sm:gap-10">
                                  <div className={`${isTVMode ? 'w-24 h-24 text-4xl' : 'w-9 h-9 sm:w-16 sm:h-16 text-sm sm:text-2xl'} bg-slate-900 rounded-lg sm:rounded-2xl flex items-center justify-center text-white font-black font-oswald italic shadow-2xl shrink-0`}>
                                     {archerB?.targetNo || '-'}{archerB?.position || ''}
                                  </div>
                                  <div>
                                     <p className={`font-black font-oswald uppercase italic leading-none tracking-tighter ${isTVMode ? 'text-7xl text-white' : 'text-base sm:text-3xl text-slate-900'}`}>{archerB?.name || 'BYE'}</p>
                                     <p className={`font-black uppercase tracking-[0.3em] ${isTVMode ? 'text-xl text-white/30 mt-4' : 'text-[7px] sm:text-[10px] text-slate-400 mt-1 sm:mt-4'}`}>{archerB?.club || '-'}</p>
                                  </div>
                               </div>
                               <div className={`font-black font-oswald italic tracking-tighter tabular-nums ${isTVMode ? 'text-[10rem]' : 'text-3xl sm:text-6xl'} ${match.winnerId === match.archerBId ? 'text-emerald-500' : 'text-white/40'}`}>
                                  {match.scoreB}
                               </div>
                            </div>
                         </div>
                         
                         {match.winnerId && (
                           <motion.div 
                             initial={{ opacity: 0, y: 20 }}
                             animate={{ opacity: 1, y: 0 }}
                             className={`bg-emerald-500/20 text-center border-t border-emerald-500/20 ${isTVMode ? 'py-8' : 'py-4'}`}
                           >
                              <p className={`font-black text-emerald-500 uppercase tracking-[0.4em] italic flex items-center justify-center gap-6 ${isTVMode ? 'text-2xl' : 'text-xs'}`}>
                                <Medal className={isTVMode ? 'w-8 h-8' : 'w-4 h-4'} />
                                WINNER: {state.archers.find(a => a.id === match.winnerId)?.name}
                              </p>
                           </motion.div>
                         )}
                      </div>
                    );
                  })
                )}
             </div>
           )}
        </div>
      </div>
      
      {/* Footer Info */}
      <div className={`shrink-0 flex items-center justify-between transition-all duration-700 ${isTVMode ? 'bg-slate-950/80 backdrop-blur-xl border-t border-white/5 p-8' : 'bg-white border-t p-4 px-6 sm:px-10'}`}>
          {!isTVMode ? null : (
            <div className="flex items-center gap-6 sm:gap-12">
                <div className="hidden sm:flex items-center gap-4">
                    <Activity className="w-6 h-6 text-emerald-500 animate-pulse" />
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.3em] leading-none ${isTVMode ? 'text-white/40' : 'text-slate-400'}`}>System Status</p>
                      <p className={`text-[10px] font-black uppercase tracking-[0.1em] mt-1.5 ${isTVMode ? 'text-white' : 'text-slate-900'}`}>Live Data Feed Optimized</p>
                    </div>
                </div>
                <div className={`flex items-center gap-5 sm:border-l sm:pl-12 ${isTVMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <Clock className="w-6 h-6 text-arcus-sun" />
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.3em] leading-none ${isTVMode ? 'text-white/40' : 'text-slate-400'}`}>Local Time</p>
                      <p className={`text-xl font-black font-oswald uppercase tracking-wider mt-1 tabular-nums ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                          {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                </div>
            </div>
          )}
          <div className="flex items-center gap-6 w-full sm:w-auto justify-center sm:justify-end">
              <div className={`px-4 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl border flex items-center gap-2 sm:gap-4 ${isTVMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                    <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                  <p className={`text-[10px] sm:text-sm font-black font-oswald uppercase italic tracking-widest truncate max-w-[200px] ${isTVMode ? 'text-white' : 'text-slate-900'}`}>{state.settings.tournamentName}</p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default LiveScoreboard;
