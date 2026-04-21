import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Target, QrCode, X, User, Delete, CheckCircle2, 
  ChevronRight, ChevronLeft, BellRing, ScanLine
} from 'lucide-react';
import { ArcheryEvent, ScoreEntry, Archer, TargetType, ScoreLog, CategoryType } from '../types';
import { CATEGORY_LABELS } from '../constants';
import QRScanner from './QRScanner';

interface Props {
  state: ArcheryEvent;
  onSaveScore: (score: ScoreEntry | ScoreEntry[], log?: ScoreLog | ScoreLog[]) => void;
  onBack?: () => void;
}

const ScoringPanel: React.FC<Props> = ({ state, onSaveScore, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [selectedTarget, setSelectedTarget] = useState(1);
  const [selectedArcherId, setSelectedArcherId] = useState<string | null>(null);
  const [currentEnd, setCurrentEnd] = useState(0);
  const [tempArrows, setTempArrows] = useState<(number | 'X')[]>([]);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(state.archers.map(a => a.category)));
  }, [state.archers]);

  const archersAtTarget = useMemo(() => {
    return state.archers.filter(a => 
      a.targetNo === selectedTarget && 
      (selectedCategory === 'ALL' || a.category === selectedCategory)
    );
  }, [state.archers, selectedTarget, selectedCategory]);

  const selectedArcher = useMemo(() => {
    return state.archers.find(a => a.id === selectedArcherId);
  }, [state.archers, selectedArcherId]);

  const config = selectedArcher ? (state.settings.categoryConfigs || {})[selectedArcher.category as CategoryType] : null;

  useEffect(() => {
    if (selectedArcher && config) {
      const existing = state.scores.find(s => 
        s.archerId === selectedArcherId && s.endIndex === currentEnd
      );
      setTempArrows(existing?.arrows ? [...existing.arrows] : new Array(config.arrows).fill(-1));
    }
  }, [selectedArcherId, currentEnd, state.scores, config]);

  const handleInput = (val: number | 'X') => {
    if (!config) return;
    const nextIdx = tempArrows.indexOf(-1);
    if (nextIdx !== -1) {
      const newArrows = [...tempArrows];
      newArrows[nextIdx] = val;
      setTempArrows(newArrows);
      
      if (nextIdx === config.arrows - 1) {
        handleSave(newArrows);
      }
    }
  };

  const handleSave = (arrows: (number | 'X')[]) => {
    if (!selectedArcherId || !config) return;
    const maxVal = config.targetType === TargetType.PUTA ? 2 : 6;
    const total = arrows.reduce<number>((acc, v) => {
      if (v === -1) return acc;
      const scoreVal = v === 'X' ? maxVal : Number(v);
      return acc + scoreVal;
    }, 0);
    
    // Calculate counts for tie-break
    const isPuta = config.targetType === TargetType.PUTA;
    const count6 = isPuta 
      ? arrows.filter(v => v === 2).length 
      : arrows.filter(v => v === 'X' || v === 6).length;
    const count5 = isPuta 
      ? arrows.filter(v => v === 1).length 
      : arrows.filter(v => v === 5).length;
    
    onSaveScore({
      archerId: selectedArcherId,
      sessionId: (selectedArcher?.wave || 1).toString(),
      endIndex: currentEnd,
      arrows,
      total,
      count6,
      count5,
      lastUpdated: Date.now()
    });

    setShowToast(`Skor ${selectedArcher?.name} Disimpan!`);
    setTimeout(() => setShowToast(null), 1500);

    // Auto Advance logic (Pindah Archer -> Pindah Rambahan)
    const archerIdx = archersAtTarget.findIndex(a => a.id === selectedArcherId);
    if (archerIdx < archersAtTarget.length - 1) {
      setSelectedArcherId(archersAtTarget[archerIdx + 1].id);
    } else if (currentEnd < config.ends - 1) {
      setSelectedArcherId(archersAtTarget[0].id);
      setCurrentEnd(currentEnd + 1);
    }
  };

  const handleScan = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'SCORING_SHEET' && parsed.eventId === state.id) {
        setSelectedTarget(parsed.targetNo);
        setSelectedArcherId(parsed.archerId);
        setShowScanner(false);
        setShowToast(`Pemanah ${parsed.targetNo}${parsed.position} Terpilih!`);
        setTimeout(() => setShowToast(null), 2000);
      } else {
        alert("QR Code tidak valid untuk event ini.");
      }
    } catch (e) {
      alert("Gagal membaca QR Code.");
    }
  };

  const keypadValues = config?.targetType === TargetType.PUTA ? [2, 1, 0] : ['X' as const, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col font-inter overflow-hidden select-none">
      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      
      {/* High Contrast Header (Sunlight Optimized) */}
      <div className="bg-white text-slate-900 px-4 py-3 flex flex-col gap-3 shrink-0 shadow-sm border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-3 bg-slate-100 rounded-lg active:scale-90 text-slate-600"><ArrowLeft className="w-6 h-6" /></button>
            <div>
              <h2 className="text-base font-black uppercase font-oswald leading-none tracking-tight text-slate-900">Bantalan {selectedTarget}</h2>
              <p className="text-[9px] font-bold uppercase mt-1 tracking-widest text-slate-900">Field Score Terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-sans">
             <button onClick={() => setShowScanner(true)} className="p-3 bg-arcus-red text-white rounded-lg active:scale-90 transition-all shadow-md"><ScanLine className="w-5 h-5" /></button>
             <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px] px-2 bg-slate-50 border border-slate-100 p-1 rounded-lg">
                {Array.from({ length: state.settings.totalTargets }).map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setSelectedTarget(i + 1)}
                    className={`shrink-0 w-8 h-8 rounded-lg font-black text-[10px] transition-all border ${selectedTarget === i + 1 ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-transparent border-transparent text-slate-900 opacity-60'}`}
                  >
                    {i + 1}
                  </button>
                ))}
             </div>
          </div>
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            ALL
          </button>
          {availableCategories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat as CategoryType)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row bg-slate-50 overflow-hidden">
        {/* Archer Selection - High Visibility Vertical Bar */}
        <div className="w-full md:w-64 bg-[#FBFBFD] border-r border-slate-200 p-2 overflow-x-auto no-scrollbar flex md:flex-col gap-2 shrink-0">
          {archersAtTarget.map(a => (
            <button 
              key={a.id} 
              onClick={() => setSelectedArcherId(a.id)}
              className={`flex-1 md:flex-none p-4 rounded-lg text-left border transition-all duration-200 ${selectedArcherId === a.id ? 'bg-arcus-sun border-yellow-500 text-black shadow-md' : 'bg-white border-slate-200 text-slate-900'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest">{a.targetNo}{a.position}</p>
                <div className="flex items-center gap-2">
                   <div className="flex gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                         <div key={i} className={`w-1.5 h-1.5 rounded-full ${state.scores.find(s => s.archerId === a.id && s.endIndex === i) ? 'bg-slate-900' : 'bg-slate-200'}`} />
                      ))}
                   </div>
                </div>
              </div>
              <p className={`font-black uppercase font-oswald text-base truncate mt-1 italic tracking-tight ${selectedArcherId === a.id ? 'text-black' : 'text-slate-600'}`}>{a.name}</p>
            </button>
          ))}
          {archersAtTarget.length === 0 && (
            <div className="p-8 text-center text-slate-900 font-bold italic text-xs uppercase">Bantalan Kosong</div>
          )}
        </div>

        {/* Scoring Area - Single Screen Layout */}
        <div className="flex-1 flex flex-col p-4 sm:p-8 gap-6 justify-between overflow-hidden bg-white">
          {!selectedArcher ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-200 gap-6">
              <User className="w-24 h-24" />
              <p className="text-xs font-black uppercase tracking-[0.4em] italic text-slate-400">Silakan Pilih Pemanah</p>
            </div>
          ) : (
            <>
              {/* Progress & Current Score Display */}
              <div className="space-y-6 text-center">
                  <div className="flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
                    {Array.from({ length: config?.ends || 7 }).map((_, i) => {
                      const scoreForEnd = state.scores.find(s => s.archerId === selectedArcherId && s.endIndex === i);
                      return (
                        <button 
                          key={i} 
                          onClick={() => setCurrentEnd(i)} 
                          className={`min-w-10 h-10 rounded-lg text-xs font-black border transition-all flex flex-col items-center justify-center ${currentEnd === i ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : scoreForEnd ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-slate-100 text-slate-300'}`}
                        >
                          <span className="text-[9px]">R{i + 1}</span>
                          {scoreForEnd && <span className="text-[8px] opacity-70">{scoreForEnd.total}</span>}
                        </button>
                      );
                    })}
                  </div>
                 
                 <div className="flex justify-center gap-3">
                    {tempArrows.map((a, i) => (
                      <div 
                        key={i} 
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 flex items-center justify-center text-3xl font-black transition-all ${a === -1 ? 'bg-slate-50 border-slate-100 text-slate-200' : 'bg-slate-900 border-slate-900 text-white shadow-xl rotate-2'}`}
                      >
                        {a === -1 ? '' : a}
                      </div>
                    ))}
                 </div>
              </div>

              {/* High Contrast Sunlight Keypad */}
              <div className="w-full max-w-lg mx-auto grid grid-cols-3 gap-3 pb-8">
                {keypadValues.map(val => (
                  <button 
                    key={val} 
                    onClick={() => handleInput(val)}
                    className="h-14 sm:h-18 bg-slate-900 text-white rounded-lg text-2xl font-black shadow-md active:bg-black active:scale-95 transition-all flex items-center justify-center border-b-2 border-slate-700"
                  >
                    {val}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    const idx = tempArrows.map(x => x !== -1).lastIndexOf(true);
                    if (idx !== -1) {
                      const n = [...tempArrows]; n[idx] = -1; setTempArrows(n);
                    }
                  }}
                  className="h-14 sm:h-18 bg-white text-red-500 rounded-lg flex items-center justify-center active:scale-95 transition-all border border-slate-100 shadow-sm"
                >
                  <Delete className="w-7 h-7" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instant Notification Toast */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase shadow-2xl animate-in slide-in-from-bottom-10 flex items-center gap-3 border-2 border-white/20">
           <CheckCircle2 className="w-5 h-5" /> {showToast}
        </div>
      )}
    </div>
  );
};

export default ScoringPanel;