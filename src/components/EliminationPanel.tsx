
import React, { useState, useMemo, useEffect } from 'react';
import { ArcheryEvent, CategoryType, Match, Archer } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { Trophy, GitBranch, User, Save, RefreshCw, ChevronRight, Swords, ArrowLeft, Trash2, Settings2, Zap, Medal, Plus, Minus, Check, FileText, X } from 'lucide-react';

interface Props {
  event: ArcheryEvent;
  onUpdateMatches: (matches: Record<CategoryType, Match[]>) => void;
  onBack: () => void;
}

const EliminationPanel: React.FC<Props> = ({ event, onUpdateMatches, onBack }) => {
  const [activeCategory, setActiveCategory] = useState<CategoryType>(() => {
    const saved = localStorage.getItem(`elim_cat_${event.id}`);
    return (saved as CategoryType) || CategoryType.ADULT_PUTRA;
  });
  const [showSavedFlag, setShowSavedFlag] = useState(false);
  const [flagMessage, setFlagMessage] = useState('');

  // Persist active category
  useEffect(() => {
    localStorage.setItem(`elim_cat_${event.id}`, activeCategory);
  }, [activeCategory, event.id]);
  
  const [selectedMatchForEnds, setSelectedMatchForEnds] = useState<Match | null>(null);

  const currentMatches = event.matches[activeCategory] || [];

  const triggerFlag = (msg: string) => {
    setFlagMessage(msg);
    setShowSavedFlag(true);
    setTimeout(() => setShowSavedFlag(false), 3000);
  };

  const archersInCategory = useMemo(() => {
    return event.archers.filter(a => a.category === activeCategory);
  }, [event.archers, activeCategory]);

  const config = (event.settings.categoryConfigs || {})[activeCategory as CategoryType];

  const rankedArchers = useMemo(() => {
    // Tentukan sesi mana yang menjadi dasar peringkat untuk aduan
    // Jika ada eliminationStages, ambil yang terakhir (terkecil)
    let baseSession = 'QUAL';
    if (config?.eliminationStages && config.eliminationStages.length > 0) {
      const smallestStage = Math.min(...config.eliminationStages);
      baseSession = `ELIM_${smallestStage}`;
    }

    return archersInCategory.map(archer => {
      const archerScores = event.scores.filter(s => s.archerId === archer.id && s.sessionId === baseSession);
      const total = archerScores.reduce((acc, curr) => acc + curr.total, 0);
      
      const manualSixes = archerScores.reduce((acc, curr) => acc + (curr.count6 || 0), 0);
      const manualFives = archerScores.reduce((acc, curr) => acc + (curr.count5 || 0), 0);
      
      const isSmallTarget = config?.targetType === TargetType.PUTA || config?.targetType === TargetType.TRADITIONAL_PUTA;
      const allArrows = archerScores.flatMap(s => s.arrows).filter(v => v !== -1);
      const arrowSixes = allArrows.filter(v => isSmallTarget ? v === 2 : (v === 'X' || v === 6)).length;
      const arrowFives = allArrows.filter(v => isSmallTarget ? v === 1 : v === 5).length;
      
      const hasManual = archerScores.some(s => s.count6 !== undefined);
      const sixes = hasManual ? manualSixes : arrowSixes;
      const fives = hasManual ? manualFives : arrowFives;

      return { ...archer, total, sixes, fives };
    })
    .filter(a => baseSession === 'QUAL' || a.total > 0) // Pastikan hanya yang ikut eliminasi terakhir
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.sixes !== a.sixes) return b.sixes - a.sixes;
      return b.fives - a.fives;
    });
  }, [archersInCategory, event.scores, config]);

  const initializeBracket = (size: number, fromQual = false) => {
    const newMatches: Match[] = [];
    let currentRoundSize = size;
    const config = (event.settings.categoryConfigs || {})[activeCategory as CategoryType];
    const numEnds = config?.ends || 5;
    
    while (currentRoundSize >= 2) {
      const numMatchesInRound = currentRoundSize / 2;
      for (let i = 1; i <= numMatchesInRound; i++) {
        newMatches.push({
          id: `m-${activeCategory}-${currentRoundSize}-${i}`,
          category: activeCategory,
          archerAId: undefined,
          archerBId: undefined,
          scoreA: 0,
          scoreB: 0,
          endsA: Array(numEnds).fill(0),
          endsB: Array(numEnds).fill(0),
          winnerId: undefined,
          round: currentRoundSize.toString(),
          matchNo: i,
          status: 'PENDING'
        });
      }
      currentRoundSize /= 2;
    }

    newMatches.push({
      id: `m-${activeCategory}-1-1`,
      category: activeCategory,
      archerAId: undefined,
      archerBId: undefined,
      scoreA: 0,
      scoreB: 0,
      endsA: Array(numEnds).fill(0),
      endsB: Array(numEnds).fill(0),
      winnerId: undefined,
      round: "1", 
      matchNo: 1,
      status: 'PENDING'
    });

    if (fromQual) {
      const seeds = rankedArchers.slice(0, size);
      const firstRoundMatches = newMatches.filter(m => m.round === size.toString());
      for (let i = 0; i < firstRoundMatches.length; i++) {
        const m = firstRoundMatches[i];
        m.archerAId = seeds[i]?.id;
        m.archerBId = seeds[size - 1 - i]?.id;
      }
    }

    onUpdateMatches({ ...event.matches, [activeCategory]: newMatches });
    triggerFlag(`Bagan ${size} Besar Berhasil Dibuat`);
  };

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const updateMatch = (matchId: string, updates: Partial<Match>) => {
    let updated = currentMatches.map((m: Match) => {
      if (m.id === matchId) {
        const newMatch = { ...m, ...updates };
        // Recalculate total scores if ends are updated
        if (updates.endsA) newMatch.scoreA = updates.endsA.reduce((a: number, b: number) => a + b, 0);
        if (updates.endsB) newMatch.scoreB = updates.endsB.reduce((a: number, b: number) => a + b, 0);
        return newMatch;
      }
      return m;
    });
    const targetMatch = updated.find(m => m.id === matchId);
    
    if (targetMatch) {
      // If winnerId is being updated (either set or cleared)
      if ('winnerId' in updates) {
        const winnerId = updates.winnerId;
        const currentRound = parseInt(targetMatch.round);
        const nextRound = currentRound / 2;
        
        // Advance winner to next round
        if (nextRound >= 2) {
          const nextMatchNo = Math.ceil((targetMatch.matchNo || 0) / 2);
          const nextMatchId = `m-${activeCategory}-${nextRound}-${nextMatchNo}`;
          const isA = (targetMatch.matchNo || 0) % 2 !== 0;
          
          updated = updated.map((um: Match) => {
            if (um.id === nextMatchId) {
              return isA ? { ...um, archerAId: winnerId } : { ...um, archerBId: winnerId };
            }
            return um;
          });
        }

        // Handle losers in Semi-Finals (Round 4) moving to Bronze Match (Round 1)
        if (currentRound === 4) {
          const loserId = winnerId ? (winnerId === targetMatch.archerAId ? targetMatch.archerBId : targetMatch.archerAId) : undefined;
          const bronzeMatchId = `m-${activeCategory}-1-1`;
          const isA = targetMatch.matchNo === 1;
          
          updated = updated.map((um: Match) => {
            if (um.id === bronzeMatchId) {
              return isA ? { ...um, archerAId: loserId } : { ...um, archerBId: loserId };
            }
            return um;
          });
        }

        // Auto-scroll to next round if a winner was selected
        if (winnerId && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const currentRoundIndex = roundsData.findIndex(r => r.round === currentRound);
          if (currentRoundIndex !== -1 && currentRoundIndex < roundsData.length - 1) {
             setTimeout(() => {
               const nextRoundElement = container.children[currentRoundIndex + 1] as HTMLElement;
               if (nextRoundElement) {
                 container.scrollTo({
                   left: nextRoundElement.offsetLeft - 40,
                   behavior: 'smooth'
                 });
               }
             }, 100);
          }
        }
      }
    }
    onUpdateMatches({ ...event.matches, [activeCategory]: updated });
    if (updates.winnerId) triggerFlag("Pemenang Match Berhasil Disimpan");
    
    // Update local state if modal is open
    if (selectedMatchForEnds?.id === matchId) {
      setSelectedMatchForEnds(updated.find(m => m.id === matchId) || null);
    }
  };

  const autoSelectWinner = (match: Match) => {
    if (!match.archerAId || !match.archerBId) return;
    if (match.scoreA === match.scoreB) {
      triggerFlag("Skor Seri! Pilih Pemenang Manual (Shoot-off)");
      return;
    }
    const winnerId = match.scoreA > match.scoreB ? match.archerAId : match.archerBId;
    updateMatch(match.id, { winnerId });
  };

  const getArcherName = (id: string | undefined) => {
    return archersInCategory.find(a => a.id === id)?.name || 'TBA';
  };

  const roundsData = useMemo(() => {
    const rounds: Record<string, Match[]> = {};
    currentMatches.forEach((m: Match) => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });
    
    const sortedRounds = Object.keys(rounds).sort((a, b) => parseInt(b) - parseInt(a));
    const data = sortedRounds.filter(r => parseInt(r) > 1).map(r => {
      const roundNum = parseInt(r);
      return {
        label: roundNum === 2 ? 'FINAL' : roundNum === 4 ? 'SEMI FINAL (4 BESAR)' : roundNum === 8 ? 'QUARTER FINAL (8 BESAR)' : roundNum === 16 ? '1/8 FINAL (16 BESAR)' : roundNum === 32 ? '1/16 FINAL (32 BESAR)' : roundNum === 64 ? '1/32 FINAL (64 BESAR)' : `1/${roundNum/2} FINAL`,
        round: roundNum,
        matches: rounds[r].sort((a, b) => (a.matchNo || 0) - (b.matchNo || 0))
      };
    });

    if (rounds["1"]) {
      data.push({ label: 'PEREBUTAN JUARA 3 / PENENTUAN JUARA', round: 1, matches: rounds["1"] });
    }
    return data;
  }, [currentMatches]);

  const finalMatch = currentMatches.find(m => m.round === "2");
  const bronzeMatch = currentMatches.find(m => m.round === "1");
  const winners = {
    juara1: finalMatch?.winnerId,
    juara2: finalMatch?.winnerId ? (finalMatch.winnerId === finalMatch.archerAId ? finalMatch.archerBId : finalMatch.archerAId) : undefined,
    juara3: bronzeMatch?.winnerId,
    juara4: bronzeMatch?.winnerId ? (bronzeMatch.winnerId === bronzeMatch.archerAId ? bronzeMatch.archerBId : bronzeMatch.archerAId) : undefined
  };

  return (
    <div className="space-y-6 relative">
      {/* Saved Success Flag */}
      {showSavedFlag && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white">
            <Check className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">{flagMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h2 className="text-xl font-black font-oswald uppercase italic leading-none">Manajemen Bagan Eliminasi / Aduan</h2>
            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mt-1">Sistem Input Cepat & Penentuan Juara</p>
          </div>
        </div>
        
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border overflow-x-auto max-w-full no-scrollbar">
          {(Object.keys(CategoryType) as CategoryType[]).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
            >
              {cat.replace('ADULT_', '').replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {currentMatches.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-12 lg:p-20 border-2 border-dashed border-slate-200 text-center space-y-8 animate-in fade-in zoom-in-95">
          <div className="bg-purple-50 p-8 rounded-full inline-block">
            <Zap className="w-16 h-16 text-purple-400" />
          </div>
          <div className="max-w-xl mx-auto space-y-6">
            <h3 className="text-2xl font-black font-oswald uppercase italic text-slate-900">Mulai Babak Eliminasi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Auto-Seeding Hasil Peringkat</p>
                {config?.h2hStartSize && config.h2hStartSize > 0 && (
                  <div className="flex items-center justify-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 mb-1">
                    <Zap className="w-3 h-3 fill-current" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Sesuai Alur: {config.h2hStartSize} Besar</span>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  {[8, 16, 32].map(s => {
                    const isRecommended = config?.h2hStartSize === s;
                    return (
                      <button 
                        key={s} 
                        onClick={() => initializeBracket(s, true)} 
                        className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all flex flex-col items-center ${
                          isRecommended ? 'bg-blue-600 text-white shadow-blue-500/20 scale-110' : 'bg-purple-600 text-white shadow-purple-500/20 hover:scale-105'
                        }`}
                      >
                        <span>Top {s}</span>
                        <span className="text-[7px] opacity-70 mt-0.5">{s === 8 ? 'Quarter' : s === 32 ? '1/16' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bagan Manual</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[8, 16, 32, 64].map(s => (
                    <button key={s} onClick={() => initializeBracket(s, false)} className="px-4 py-3 bg-white text-slate-600 border rounded-xl font-black text-[10px] uppercase hover:bg-slate-100 transition-all flex flex-col items-center">
                      <span>{s} Besar</span>
                      <span className="text-[7px] text-slate-400 mt-0.5">{s === 8 ? 'Bagan Aduan' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Winners / Podium Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Juara 1', archer: winners.juara1, color: 'text-yellow-500 bg-yellow-50 border-yellow-200 shadow-yellow-100' },
              { label: 'Juara 2', archer: winners.juara2, color: 'text-slate-500 bg-slate-50 border-slate-200' },
              { label: 'Juara 3', archer: winners.juara3, color: 'text-orange-500 bg-orange-50 border-orange-200' },
              { label: 'Juara 4', archer: winners.juara4, color: 'text-slate-400 bg-white border-slate-100' }
            ].map((p, i) => (
              <div key={i} className={`p-6 rounded-[2rem] border-2 ${p.color} text-center space-y-2 relative overflow-hidden shadow-sm`}>
                <Medal className="w-8 h-8 mx-auto opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{p.label}</p>
                <h4 className="text-lg font-black font-oswald uppercase italic leading-none truncate">{p.archer ? getArcherName(p.archer) : 'TBA'}</h4>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
             <button 
               onClick={() => { if(window.confirm('Hapus seluruh bagan untuk kategori ini?')) { onUpdateMatches({ ...event.matches, [activeCategory]: [] }); triggerFlag("Bagan Berhasil Direset"); } }}
               className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
             >
               <Trash2 className="w-4 h-4" /> Reset Bagan
             </button>
          </div>

          {/* Bracket Visualization - Input Skor Se-mudah Mungkin */}
          <div ref={scrollContainerRef} className="flex gap-12 overflow-x-auto pb-12 pt-4 px-4 no-scrollbar scroll-smooth">
            {roundsData.map((round, rIndex) => (
              <div key={round.round} className="flex flex-col gap-8 min-w-[340px]">
                <div className="text-center">
                  <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic border-2 shadow-lg ${round.round === 1 ? 'bg-orange-600 border-orange-400 text-white' : 'bg-slate-900 border-purple-500 text-white'}`}>
                    {round.label}
                  </span>
                </div>
                
                <div className="flex flex-col h-full justify-around gap-8">
                  {round.matches.map((match) => (
                    <div key={match.id} className="relative group">
                      <div className={`bg-white rounded-[2.5rem] border-2 overflow-hidden shadow-lg transition-all hover:shadow-2xl ${match.winnerId ? 'border-purple-200 ring-4 ring-purple-50' : 'border-slate-100'}`}>
                        {/* Slot A - Quick Input */}
                        <div className={`p-6 flex items-center justify-between gap-4 border-b ${match.winnerId === match.archerAId ? 'bg-purple-50/50' : ''}`}>
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${match.winnerId === match.archerAId ? 'bg-purple-600 text-white shadow-lg' : match.scoreA > match.scoreB ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                               {match.winnerId === match.archerAId ? <Check className="w-5 h-5" /> : 'A'}
                             </div>
                             <span className={`font-black uppercase font-oswald text-sm italic truncate ${match.winnerId === match.archerAId ? 'text-purple-700' : 'text-slate-600'}`}>
                               {getArcherName(match.archerAId)}
                             </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <button onClick={() => updateMatch(match.id, { scoreA: Math.max(0, match.scoreA - 1) })} className="w-8 h-8 rounded-lg bg-slate-50 border flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all text-slate-400"><Minus className="w-4 h-4" /></button>
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black font-oswald border-2 shadow-inner ${match.scoreA > match.scoreB ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-100 text-slate-900'}`}>
                               {match.scoreA}
                             </div>
                             <button onClick={() => updateMatch(match.id, { scoreA: match.scoreA + 1 })} className="w-8 h-8 rounded-lg bg-purple-50 border-purple-100 border flex items-center justify-center hover:bg-purple-100 active:scale-90 transition-all text-purple-600"><Plus className="w-4 h-4" /></button>
                          </div>
                        </div>

                        {/* Slot B - Quick Input */}
                        <div className={`p-6 flex items-center justify-between gap-4 ${match.winnerId === match.archerBId ? 'bg-purple-50/50' : ''}`}>
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${match.winnerId === match.archerBId ? 'bg-purple-600 text-white shadow-lg' : match.scoreB > match.scoreA ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                               {match.winnerId === match.archerBId ? <Check className="w-5 h-5" /> : 'B'}
                             </div>
                             <span className={`font-black uppercase font-oswald text-sm italic truncate ${match.winnerId === match.archerBId ? 'text-purple-700' : 'text-slate-600'}`}>
                               {getArcherName(match.archerBId)}
                             </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <button onClick={() => updateMatch(match.id, { scoreB: Math.max(0, match.scoreB - 1) })} className="w-8 h-8 rounded-lg bg-slate-50 border flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all text-slate-400"><Minus className="w-4 h-4" /></button>
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black font-oswald border-2 shadow-inner ${match.scoreB > match.scoreA ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-100 text-slate-900'}`}>
                               {match.scoreB}
                             </div>
                             <button onClick={() => updateMatch(match.id, { scoreB: match.scoreB + 1 })} className="w-8 h-8 rounded-lg bg-purple-50 border-purple-100 border flex items-center justify-center hover:bg-purple-100 active:scale-90 transition-all text-purple-600"><Plus className="w-4 h-4" /></button>
                          </div>
                        </div>

                        {/* Winner Decision Buttons - Instant & Easy */}
                        <div className="bg-slate-50 px-6 py-4 flex flex-col gap-3 border-t">
                           <div className="flex gap-3">
                             <button 
                               disabled={!match.archerAId}
                               onClick={() => updateMatch(match.id, { winnerId: match.archerAId })} 
                               className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${match.winnerId === match.archerAId ? 'bg-purple-600 text-white border-purple-600 shadow-xl' : match.scoreA > match.scoreB ? 'bg-white border-green-500 text-green-600 ring-4 ring-green-50' : 'bg-white text-slate-400 border-slate-200 hover:border-purple-300'}`}
                             >
                               {match.winnerId === match.archerAId ? 'A Menang' : match.scoreA > match.scoreB ? 'A Unggul' : 'Pilih A'}
                             </button>
                             <button 
                               disabled={!match.archerBId}
                               onClick={() => updateMatch(match.id, { winnerId: match.archerBId })} 
                               className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${match.winnerId === match.archerBId ? 'bg-purple-600 text-white border-purple-600 shadow-xl' : match.scoreB > match.scoreA ? 'bg-white border-green-500 text-green-600 ring-4 ring-green-50' : 'bg-white text-slate-400 border-slate-200 hover:border-purple-300'}`}
                             >
                               {match.winnerId === match.archerBId ? 'B Menang' : match.scoreB > match.scoreA ? 'B Unggul' : 'Pilih B'}
                             </button>
                           </div>

                           <button 
                             onClick={() => setSelectedMatchForEnds(match)}
                             className="w-full py-3 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all border border-slate-200"
                           >
                             <FileText className="w-3 h-3" /> Input Skor Per-Rambahan
                           </button>
                           
                           {!match.winnerId && match.archerAId && match.archerBId && (match.scoreA > 0 || match.scoreB > 0) && (
                             <button 
                               onClick={() => autoSelectWinner(match)}
                               className="w-full py-3 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-200 transition-all border border-purple-200"
                             >
                               <Zap className="w-3 h-3" /> Selesai & Lanjut
                             </button>
                           )}

                           {match.winnerId && (
                             <button onClick={() => updateMatch(match.id, { winnerId: undefined })} className="w-full py-2 bg-white text-slate-300 hover:text-red-500 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest">
                               <RefreshCw className="w-3 h-3" /> Reset Pemenang
                             </button>
                           )}
                        </div>
                      </div>
                      
                      {/* Connector Line Visualization */}
                      {rIndex < roundsData.length - 1 && round.round !== 1 && (
                        <div className="absolute top-1/2 -right-12 w-12 h-[2px] bg-slate-100 pointer-events-none"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-End Score Input Modal */}
      {selectedMatchForEnds && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
               <div>
                  <h3 className="text-xl font-black font-oswald uppercase italic leading-none">Input Skor Per-Rambahan</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Match ID: {selectedMatchForEnds.id}</p>
               </div>
               <button onClick={() => setSelectedMatchForEnds(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
               {/* Archer A */}
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black">A</div>
                     <h4 className="text-xl font-black font-oswald uppercase italic text-slate-900">{getArcherName(selectedMatchForEnds.archerAId)}</h4>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                     {(selectedMatchForEnds.endsA || Array(5).fill(0)).map((score, idx) => (
                        <div key={idx} className="space-y-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase text-center">End {idx + 1}</p>
                           <input 
                              type="number" 
                              value={score} 
                              onChange={(e) => {
                                 const newEnds = [...(selectedMatchForEnds.endsA || Array(5).fill(0))];
                                 newEnds[idx] = parseInt(e.target.value) || 0;
                                 updateMatch(selectedMatchForEnds.id, { endsA: newEnds });
                              }}
                              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-lg focus:border-purple-600 outline-none transition-all"
                           />
                        </div>
                     ))}
                  </div>
               </div>

               <div className="h-px bg-slate-100" />

               {/* Archer B */}
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black">B</div>
                     <h4 className="text-xl font-black font-oswald uppercase italic text-slate-900">{getArcherName(selectedMatchForEnds.archerBId)}</h4>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                     {(selectedMatchForEnds.endsB || Array(5).fill(0)).map((score, idx) => (
                        <div key={idx} className="space-y-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase text-center">End {idx + 1}</p>
                           <input 
                              type="number" 
                              value={score} 
                              onChange={(e) => {
                                 const newEnds = [...(selectedMatchForEnds.endsB || Array(5).fill(0))];
                                 newEnds[idx] = parseInt(e.target.value) || 0;
                                 updateMatch(selectedMatchForEnds.id, { endsB: newEnds });
                              }}
                              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-lg focus:border-purple-600 outline-none transition-all"
                           />
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="p-8 bg-slate-50 border-t flex items-center justify-between">
               <div className="flex gap-10">
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase">Total A</p>
                     <p className="text-2xl font-black font-oswald text-purple-600 leading-none">{selectedMatchForEnds.scoreA}</p>
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase">Total B</p>
                     <p className="text-2xl font-black font-oswald text-slate-900 leading-none">{selectedMatchForEnds.scoreB}</p>
                  </div>
               </div>
               <button onClick={() => setSelectedMatchForEnds(null)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Simpan & Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EliminationPanel;
