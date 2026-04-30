import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Target, QrCode, X, User, Delete, CheckCircle2, 
  ChevronRight, ChevronLeft, Trash2, ScanLine
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
  const [isDirty, setIsDirty] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const availableCategories = useMemo(() => {
    return Array.from(new Set((state.archers || []).map(a => a.category)));
  }, [state.archers]);

  const archersAtTarget = useMemo(() => {
    return (state.archers || []).filter(a => 
      a.targetNo === selectedTarget && 
      (selectedCategory === 'ALL' || a.category === selectedCategory)
    );
  }, [state.archers, selectedTarget, selectedCategory]);

  const selectedArcher = useMemo(() => {
    return (state.archers || []).find(a => a.id === selectedArcherId);
  }, [state.archers, selectedArcherId]);

  const config = selectedArcher ? (state.settings.categoryConfigs || {})[selectedArcher.category as CategoryType] : null;

  useEffect(() => {
    setIsDirty(false);
  }, [selectedArcherId, currentEnd]);

  useEffect(() => {
    if (selectedArcher && config && !isDirty) {
      // 1. Check if there's a draft for THIS specific archer/end
      const draftKey = `scoring_draft_${state.id}_${selectedArcherId}_${currentEnd}`;
      const savedDraft = localStorage.getItem(draftKey);
      
      if (savedDraft) {
        setTempArrows(JSON.parse(savedDraft));
      } else {
        // 2. If no draft, check if there's already a SAVED score
        const existing = (state.scores || [])
          .filter(s => {
            if (s.isDeleted) return false;
            const norm = (s.sessionId === '1' || s.sessionId === '2' || !s.sessionId) ? 'QUAL' : s.sessionId;
            return s.archerId === selectedArcherId && s.endIndex === currentEnd && norm === 'QUAL';
          })
          .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))[0];
        setTempArrows(existing?.arrows ? [...existing.arrows] : new Array(config.arrows).fill(-1));
      }
    }
  }, [selectedArcherId, currentEnd, state.scores, config, state.id, isDirty]);

  // Persist tempArrows to draft as they are entered
  useEffect(() => {
    if (selectedArcherId && tempArrows.length > 0) {
      const draftKey = `scoring_draft_${state.id}_${selectedArcherId}_${currentEnd}`;
      if (tempArrows.some(v => v !== -1)) {
        localStorage.setItem(draftKey, JSON.stringify(tempArrows));
      } else {
        // If everything is cleared, remove the draft so it doesn't re-appear
        localStorage.removeItem(draftKey);
      }
    }
  }, [tempArrows, selectedArcherId, currentEnd, state.id]);

  const keypadValues: (number | 'X' | 'M')[] = useMemo(() => {
    if (config?.targetType === TargetType.PUTA || config?.targetType === TargetType.TRADITIONAL_PUTA) {
      return [2, 1, 'M'];
    } else if (config?.targetType === TargetType.TRADITIONAL_6_RING) {
      return [6, 5, 4, 3, 2, 1, 0];
    } else if (config?.targetType === TargetType.FACE_3X20) {
      return ['X', 10, 9, 8, 7, 6, 0];
    }
    return ['X', 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  }, [config]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or scanner is open
      if (showScanner) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = (e.key || '').toLowerCase();
      
      // Numbers 1-9
      if (/^[1-9]$/.test(key)) {
        const val = parseInt(key);
        if (keypadValues.includes(val)) {
          handleInput(val);
        }
      } 
      // 0 mapped to 10 or 0 depending on context
      else if (key === '0') {
        if (keypadValues.includes(10)) handleInput(10);
        else if (keypadValues.includes(0)) handleInput(0);
      }
      // X for X
      else if (key === 'x' || key === '*') {
        if (keypadValues.includes('X')) handleInput('X');
      }
      // M for Miss
      else if (key === 'm' || key === '/') {
        if (keypadValues.includes('M')) handleInput('M');
        else if (keypadValues.includes(0)) handleInput(0);
      }
      // Backspace to delete
      else if (key === 'backspace' || key === 'delete') {
        const idx = tempArrows.map(x => x !== -1).lastIndexOf(true);
        if (idx !== -1) {
          setIsDirty(true);
          const n = [...tempArrows]; n[idx] = -1; setTempArrows(n);
        }
      }
      // Enter to save
      else if (key === 'enter') {
        const allFilled = tempArrows.every(v => v !== -1);
        if (allFilled || tempArrows.some(v => v !== -1)) {
          handleSave(tempArrows);
        }
      }
      // Navigation
      else if (key === 'arrowleft') {
        setCurrentEnd(prev => Math.max(0, prev - 1));
      }
      else if (key === 'arrowright') {
        setCurrentEnd(prev => Math.min((config?.ends || 7) - 1, prev + 1));
      }
      else if (key === 'arrowup') {
        const archerIdx = archersAtTarget.findIndex(a => a.id === selectedArcherId);
        if (archerIdx > 0) {
          setSelectedArcherId(archersAtTarget[archerIdx - 1].id);
        }
      }
      else if (key === 'arrowdown') {
        const archerIdx = archersAtTarget.findIndex(a => a.id === selectedArcherId);
        if (archerIdx < archersAtTarget.length - 1) {
          setSelectedArcherId(archersAtTarget[archerIdx + 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArcherId, currentEnd, tempArrows, keypadValues, config, archersAtTarget]);

  const handleInput = (val: number | 'X' | 'M') => {
    if (!config) return;
    setIsDirty(true);
    const nextIdx = tempArrows.indexOf(-1);
    if (nextIdx !== -1) {
      const newArrows = [...tempArrows];
      newArrows[nextIdx] = val === 'M' ? 0 : val;
      setTempArrows(newArrows);
      
      if (nextIdx === config.arrows - 1) {
        handleSave(newArrows);
      }
    }
  };

  const handleSave = (arrows: (number | 'X')[]) => {
    if (!selectedArcherId || !config) return;
    
    // Check if it's a reset (all -1)
    const isReset = arrows.every(v => v === -1);
    
    let maxVal = 6;
    if (config.targetType === TargetType.PUTA || config.targetType === TargetType.TRADITIONAL_PUTA) {
      maxVal = 2;
    } else if (config.targetType === TargetType.TRADITIONAL_6_RING) {
      maxVal = 6;
    }

    const total = arrows.reduce<number>((acc, v) => {
      if (v === -1) return acc;
      const scoreVal = v === 'X' ? maxVal : Number(v);
      return acc + scoreVal;
    }, 0);
    
    // Calculate counts for tie-break based on target type
    const targetType = config.targetType;
    let count6 = 0;
    let count5 = 0;

    if (targetType === TargetType.PUTA || targetType === TargetType.TRADITIONAL_PUTA) {
      count6 = arrows.filter(v => v === 2).length;
      count5 = arrows.filter(v => v === 1).length;
    } else if (targetType === TargetType.TRADITIONAL_6_RING) {
      count6 = arrows.filter(v => v === 6).length;
      count5 = arrows.filter(v => v === 5).length;
    } else {
      // Standard 10-ring face (X, 10, 9, 8...)
      count6 = arrows.filter(v => v === 'X' || v === 10).length;
      count5 = arrows.filter(v => v === 9).length;
    }
    
    onSaveScore({
      archerId: selectedArcherId,
      sessionId: 'QUAL',
      endIndex: currentEnd,
      arrows,
      total,
      count6,
      count5,
      lastUpdated: Date.now(),
      isDeleted: isReset
    });

    // Clear draft after successful save
    const draftKey = `scoring_draft_${state.id}_${selectedArcherId}_${currentEnd}`;
    localStorage.removeItem(draftKey);

    // Reset status dirty immediately
    setIsDirty(false);

    if (isReset) {
      setShowToast(`Data Rambahan ${currentEnd + 1} Direset!`);
      setTimeout(() => setShowToast(null), 1500);
      setTempArrows(new Array(config.arrows).fill(-1));
      return;
    }

    // CRITICAL: Reset tempArrows immediately so the "draft saver" effect 
    // doesn't catch the old arrows for the NEW archerId/currentEnd
    setTempArrows(new Array(config.arrows).fill(-1));

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

  const handleResetEnd = () => {
    if (!config || !selectedArcherId) return;
    setIsDirty(true);
    const emptyArrows = new Array(config.arrows).fill(-1);
    setTempArrows(emptyArrows);
    handleSave(emptyArrows);
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

  const getButtonStyles = (val: number | 'X' | 'M') => {
    const targetType = config?.targetType;
    
    if (targetType === TargetType.PUTA || targetType === TargetType.TRADITIONAL_PUTA) {
      if (val === 2) return 'bg-[#800000] text-white border-[#600000]';
      if (val === 1) return 'bg-yellow-400 text-slate-900 border-yellow-600';
      return 'bg-slate-900 text-white border-slate-700'; // M
    }
    
    if (targetType === TargetType.TRADITIONAL_6_RING) {
      if (val === 6 || val === 5 || val === 4) return 'bg-yellow-400 text-slate-900 border-yellow-600';
      if (val === 3) return 'bg-red-600 text-white border-red-800';
      if (val === 2) return 'bg-white text-slate-900 border-slate-200';
      if (val === 1) return 'bg-blue-600 text-white border-blue-800';
      return 'bg-slate-900 text-white border-slate-700';
    }

    if (val === 'X' || val === 10 || val === 9) return 'bg-yellow-400 text-slate-900 border-yellow-600';
    if (val === 8 || val === 7) return 'bg-red-600 text-white border-red-800';
    if (val === 6 || val === 5) return 'bg-blue-600 text-white border-blue-800';
    if (val === 4 || val === 3) return 'bg-slate-900 text-white border-slate-700';
    return 'bg-white text-slate-900 border-slate-200';
  };

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
                   <div className="flex gap-0.5 overflow-hidden max-w-[60px]">
                      {Array.from({ length: (state.settings.categoryConfigs || {})[a.category as CategoryType]?.ends || 6 }).map((_, i) => (
                         <div key={i} className={`w-1 h-1 rounded-full shrink-0 ${(state.scores || []).find(s => s.archerId === a.id && s.endIndex === i && !s.isDeleted) ? 'bg-slate-900' : 'bg-slate-200'}`} />
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
        <div className="flex-1 flex flex-col p-4 sm:p-8 gap-6 justify-between overflow-y-auto bg-white">
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
                      const scoreForEnd = (state.scores || []).find(s => s.archerId === selectedArcherId && s.endIndex === i && !s.isDeleted);
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
                 
                  <div className="flex justify-center flex-wrap gap-2 sm:gap-4">
                    {tempArrows.map((a, i) => (
                      <div 
                        key={i} 
                        className={`w-14 h-14 sm:w-20 sm:h-20 rounded-lg border-2 flex items-center justify-center text-2xl sm:text-4xl font-black transition-all ${a === -1 ? 'border-slate-100 text-slate-100' : 'border-slate-900 text-slate-900 shadow-sm'}`}
                      >
                        {a === -1 ? '' : (a === 0 && config?.targetType === TargetType.PUTA ? 'M' : a)}
                      </div>
                    ))}
                 </div>
              </div>

              {/* High Contrast Sunlight Keypad */}
              <div className="w-full max-w-lg mx-auto flex flex-col gap-2 sm:gap-4 pb-4 sm:pb-8">
                {/* Keyboard Helper */}
                <div className="hidden lg:flex items-center justify-center gap-4 mb-2">
                   <div className="flex items-center gap-1.5 opacity-40">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[9px] font-mono">1-9</kbd>
                      <span className="text-[8px] font-bold uppercase tracking-widest">Score</span>
                   </div>
                   <div className="flex items-center gap-1.5 opacity-40">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[9px] font-mono">0</kbd>
                      <span className="text-[8px] font-bold uppercase tracking-widest">10</span>
                   </div>
                   <div className="flex items-center gap-1.5 opacity-40">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[9px] font-mono">X</kbd>
                      <span className="text-[8px] font-bold uppercase tracking-widest">X</span>
                   </div>
                   <div className="flex items-center gap-1.5 opacity-40">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[9px] font-mono">M</kbd>
                      <span className="text-[8px] font-bold uppercase tracking-widest">Miss</span>
                   </div>
                   <div className="flex items-center gap-1.5 opacity-40">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[9px] font-mono">BS</kbd>
                      <span className="text-[8px] font-bold uppercase tracking-widest">Undo</span>
                   </div>
                   <div className="flex items-center gap-1.5 opacity-40">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[9px] font-mono">↵</kbd>
                      <span className="text-[8px] font-bold uppercase tracking-widest">Save</span>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {keypadValues.map(val => (
                    <button 
                      key={val} 
                      onClick={() => handleInput(val)}
                      className={`h-14 sm:h-20 rounded-2xl text-2xl sm:text-4xl font-black shadow-sm active:scale-95 transition-all flex items-center justify-center border-b-4 ${getButtonStyles(val)}`}
                    >
                      {val}
                    </button>
                  ))}
                  <button 
                    onClick={() => {
                      const idx = tempArrows.map(x => x !== -1).lastIndexOf(true);
                      if (idx !== -1) {
                        setIsDirty(true);
                        const n = [...tempArrows]; n[idx] = -1; setTempArrows(n);
                      }
                    }}
                    className="h-14 sm:h-20 bg-white text-red-500 rounded-2xl flex items-center justify-center active:scale-95 transition-all border-2 border-slate-100 shadow-sm"
                  >
                    <Delete className="w-8 h-8 sm:w-10 sm:h-10" />
                  </button>
                </div>

                <div className="flex gap-2 sm:gap-4">
                    <button 
                      onClick={() => {
                        const allFilled = tempArrows.every(v => v !== -1);
                        if (allFilled || tempArrows.some(v => v !== -1)) {
                          handleSave(tempArrows);
                        }
                      }}
                      className="flex-1 h-14 sm:h-20 bg-emerald-500 text-white rounded-2xl font-black uppercase text-base sm:text-lg tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-emerald-700"
                    >
                      <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" />
                      Simpan Skor
                    </button>
                    <button 
                      onClick={handleResetEnd}
                      className="px-6 h-14 sm:h-20 bg-red-50 text-red-500 border-2 border-red-200 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-tighter sm:tracking-widest shadow-sm active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
                    >
                      <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      RESET
                    </button>
                </div>
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