
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Target, CheckCircle2, ChevronRight, ChevronLeft, 
  Save, User, Zap, Hash, Trophy, Keyboard, Search, X, Trash2,
  ScanLine
} from 'lucide-react';
import { ArcheryEvent, ScoreEntry, Archer, CategoryType, TargetType, ScoreLog } from '../types';
import { CATEGORY_LABELS } from '../constants';
import QRScanner from './QRScanner';

interface Props {
  event: ArcheryEvent;
  onSaveScore: (score: ScoreEntry | ScoreEntry[], log?: ScoreLog | ScoreLog[]) => void;
  onBack: () => void;
}

const QuickScoringPanel: React.FC<Props> = ({ event, onSaveScore, onBack }) => {
  const [mode, setMode] = useState<'TARGET' | 'CATEGORY'>('TARGET');
  const [selectedTarget, setSelectedTarget] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [currentEnd, setCurrentEnd] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusedArcher = useRef<string | null>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showScanner) return;
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // Ctrl + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveAll();
      }

      // If not in input, allow arrow navigation
      if (!isInput) {
        if (e.key === 'ArrowLeft') {
          if (mode === 'TARGET') setSelectedTarget(prev => Math.max(1, prev - 1));
          else setCurrentEnd(prev => Math.max(0, prev - 1));
        }
        if (e.key === 'ArrowRight') {
          if (mode === 'TARGET') setSelectedTarget(prev => Math.min(event.settings?.totalTargets || 1, prev + 1));
          else setCurrentEnd(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedTarget, currentEnd, event.settings?.totalTargets]);

  // Local state for inputs to allow "Save All"
  const [localScores, setLocalScores] = useState<Record<string, { total: number; count6: number; count5: number }>>({});

  const availableCategories = useMemo(() => {
    return Array.from(new Set(event.archers.map(a => a.category)));
  }, [event.archers]);

  const archersInScope = useMemo(() => {
    if (mode === 'TARGET') {
      return event.archers.filter(a => a.targetNo === selectedTarget);
    } else {
      return event.archers.filter(a => selectedCategory === 'ALL' || a.category === selectedCategory);
    }
  }, [event.archers, selectedTarget, selectedCategory, mode]);

  const archersToDisplay = useMemo(() => {
    let filtered = [...archersInScope];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        (a.name || '').toLowerCase().includes(term) || 
        (a.club || '').toLowerCase().includes(term) ||
        `${a.targetNo || ''}${a.position || ''}`.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [archersInScope, searchTerm]);

  // Track which rows have been modified locally or are in "reset lock"
  const [dirtyRows, setDirtyRows] = useState<Record<string, number>>( {}); // mapping archerId to timestamp of last local change

  // RESET local state when the scoring context (mode, end, target, category) changes
  useEffect(() => {
    setLocalScores({});
    setDirtyRows({});
    // Also clear input refs to be safe
    inputRefs.current = {};
  }, [currentEnd, mode, selectedTarget, selectedCategory]);

  // Load existing scores into local state when scope or end changes
  useEffect(() => {
    setLocalScores(prev => {
      const updated = { ...prev };
      let changed = false;
      const now = Date.now();

      archersInScope.forEach(a => {
        const existing = event.scores
          .filter(s => {
            if (s.isDeleted) return false;
            const norm = (s.sessionId === '1' || s.sessionId === '2' || !s.sessionId) ? 'QUAL' : s.sessionId;
            return s.archerId === a.id && s.endIndex === currentEnd && norm === 'QUAL';
          })
          .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))[0];
        
        const cloudData = {
          total: existing?.total || 0,
          count6: existing?.count6 || 0,
          count5: existing?.count5 || 0
        };

        // LOCKING MECHANISM: Don't let cloud data overwrite if we have a fresh local change (last 3 seconds)
        const lastDirtyTime = dirtyRows[a.id] || 0;
        const isRecentlyModified = (now - lastDirtyTime) < 3000;

        if (!updated[a.id] || (!isRecentlyModified && focusedArcher.current !== a.id && 
            (updated[a.id].total !== cloudData.total || 
             updated[a.id].count6 !== cloudData.count6 || 
             updated[a.id].count5 !== cloudData.count5))) {
          updated[a.id] = cloudData;
          changed = true;
        }
      });

      return changed ? updated : prev;
    });
  }, [archersInScope, currentEnd, event.scores, dirtyRows]);

  const handleUpdateLocal = (archerId: string, field: 'total' | 'count6' | 'count5', val: number) => {
    setDirtyRows(prev => ({
      ...prev,
      [archerId]: Date.now()
    }));
    setLocalScores(prev => ({
      ...prev,
      [archerId]: {
        ...prev[archerId],
        [field]: Math.max(0, val)
      }
    }));
  };

  const handleKeyDownInInput = (e: React.KeyboardEvent, archerId: string, field: string, index: number) => {
    const fields = ['total', 'count6', 'count5'];
    const currentFieldIndex = fields.indexOf(field);

    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        inputRefs.current[`${archerId}-${nextField}`]?.focus();
      } else {
        const nextArcher = archersToDisplay[index + 1];
        if (nextArcher) {
          inputRefs.current[`${nextArcher.id}-total`]?.focus();
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextArcher = archersToDisplay[index + 1];
      if (nextArcher) {
        inputRefs.current[`${nextArcher.id}-${field}`]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevArcher = archersToDisplay[index - 1];
      if (prevArcher) {
        inputRefs.current[`${prevArcher.id}-${field}`]?.focus();
      }
    } else if (e.key === 'ArrowRight' && (e.currentTarget as HTMLInputElement).selectionEnd === (e.currentTarget as HTMLInputElement).value.length) {
      if (currentFieldIndex < fields.length - 1) {
        e.preventDefault();
        const nextField = fields[currentFieldIndex + 1];
        inputRefs.current[`${archerId}-${nextField}`]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && (e.currentTarget as HTMLInputElement).selectionStart === 0) {
      if (currentFieldIndex > 0) {
        e.preventDefault();
        const prevField = fields[currentFieldIndex - 1];
        inputRefs.current[`${archerId}-${prevField}`]?.focus();
      }
    }
  };

  const handleResetArcher = (archerId: string) => {
    const archer = event.archers.find(a => a.id === archerId);
    if (!confirm(`Reset skor untuk ${archer?.name} di Rambahan ${currentEnd + 1}?`)) return;
    
    const config = (event.settings?.categoryConfigs || {})[archer?.category as CategoryType];
    const dummyArrows: (number | 'X')[] = new Array(config?.arrows || 6).fill(-1);
    
    const now = Date.now();
    
    // Mark as recently modified to prevent cloud sync from overwriting with old data
    setDirtyRows(prev => ({
      ...prev,
      [archerId]: now
    }));

    onSaveScore({
      archerId: archerId,
      sessionId: 'QUAL',
      endIndex: currentEnd,
      arrows: dummyArrows,
      total: 0,
      count6: 0,
      count5: 0,
      lastUpdated: now,
      isDeleted: true
    });
    
    setLocalScores(prev => ({
      ...prev,
      [archerId]: { total: 0, count6: 0, count5: 0 }
    }));
    
    setShowToast("Skor Berhasil Direset!");
    setTimeout(() => setShowToast(null), 1500);
  };

  const handleSaveAll = () => {
    const scoresToSave: ScoreEntry[] = [];
    const now = Date.now();
    
    archersToDisplay.forEach(a => {
      const data = localScores[a.id];
      if (data && dirtyRows[a.id]) {
        const config = (event.settings?.categoryConfigs || {})[a.category as CategoryType];
        const dummyArrows: (number | 'X')[] = new Array(config?.arrows || 6).fill(0);
        
        scoresToSave.push({
          archerId: a.id,
          sessionId: 'QUAL',
          endIndex: currentEnd,
          arrows: dummyArrows,
          total: data.total,
          count6: data.count6,
          count5: data.count5,
          lastUpdated: now
        });
      }
    });

    if (scoresToSave.length > 0) {
      onSaveScore(scoresToSave);
      // We don't clear dirtyRows immediately, the useEffect with timestamp will handle it
    }

    setShowToast(`Skor Rambahan ${currentEnd + 1} Berhasil Disimpan!`);
    setTimeout(() => {
      setShowToast(null);
      
      if (mode === 'TARGET') {
        // Auto advance to next target
        if (selectedTarget < (event.settings?.totalTargets || 0)) {
          setSelectedTarget(prev => prev + 1);
        } else if (currentEnd < 10) { // Arbitrary limit or use config
          setSelectedTarget(1);
          setCurrentEnd(prev => prev + 1);
        }
      } else {
        // Auto advance to next end for category mode
        if (currentEnd < 10) {
          setCurrentEnd(prev => prev + 1);
        }
      }
    }, 1500);
  };

  const handleScan = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'SCORING_SHEET' && parsed.eventId === event.id) {
        setMode('TARGET');
        setSelectedTarget(parsed.targetNo);
        // Find the archer to focus
        setSearchTerm(''); // Clear search to make sure archer is visible
        setShowScanner(false);
        setShowToast(`Bantalan ${parsed.targetNo}${parsed.position} Terpilih!`);
        setTimeout(() => {
          setShowToast(null);
          // Autofocus the first field for this archer
          inputRefs.current[`${parsed.archerId}-total`]?.focus();
        }, 1500);
      } else {
        alert("QR Code tidak valid untuk event ini.");
      }
    } catch (e) {
      alert("Gagal membaca QR Code.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      
      {/* Keyboard Shortcut Info */}
      <div className="px-6 py-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-1.5 rounded-lg">
            <Keyboard className="w-4 h-4 text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Desktop Focus Mode</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2">
            <kbd className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono border border-white/20">Enter</kbd>
            <span className="text-[9px] font-bold text-slate-400">Next Field</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono border border-white/20">Ctrl+S</kbd>
            <span className="text-[9px] font-bold text-slate-400">Quick Save</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono border border-white/20">← / →</kbd>
            <span className="text-[9px] font-bold text-slate-400">Navigation</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-4 md:px-0 mt-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-900 transition-all active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl md:text-3xl font-black font-oswald uppercase italic leading-none text-slate-900">Input Cepat Per-Rambahan</h2>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">
              Mode Input Total Skor {mode === 'TARGET' ? 'Bantalan' : 'Kategori'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <button 
             onClick={() => setShowScanner(true)}
             className="px-6 py-3 bg-arcus-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-3 italic"
           >
             <ScanLine className="w-5 h-5" /> Scan QR
           </button>

           {/* Mode Switcher */}
           <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setMode('TARGET')}
                className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'TARGET' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
              >
                Per Bantalan
              </button>
              <button 
                onClick={() => setMode('CATEGORY')}
                className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'CATEGORY' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
              >
                Per Kategori
              </button>
           </div>

           {mode === 'TARGET' ? (
             <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setSelectedTarget(prev => Math.max(1, prev - 1))} className="p-2 bg-white rounded-lg text-slate-900"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-4 text-xs font-black uppercase font-oswald text-slate-900">Bantalan {selectedTarget}</span>
                <button onClick={() => setSelectedTarget(prev => Math.min(event.settings?.totalTargets || 1, prev + 1))} className="p-2 bg-white rounded-lg text-slate-900"><ChevronRight className="w-4 h-4" /></button>
             </div>
           ) : (
             <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="bg-white px-4 py-2 rounded-lg text-[10px] font-black uppercase outline-none text-slate-900"
                >
                  <option value="ALL">Semua Kategori</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
             </div>
           )}

           <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setCurrentEnd(prev => Math.max(0, prev - 1))} className="p-2 bg-white rounded-lg text-slate-900"><ChevronLeft className="w-4 h-4" /></button>
              <span className="px-4 text-xs font-black uppercase font-oswald text-slate-900">Rambahan {currentEnd + 1}</span>
              <button onClick={() => setCurrentEnd(prev => prev + 1)} className="p-2 bg-white rounded-lg text-slate-900"><ChevronRight className="w-4 h-4" /></button>
           </div>
        </div>
      </div>

      {/* Quick Search Toolbar */}
      <div className="px-4 md:px-0">
        <div className="relative group max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-arcus-red transition-colors" />
          <input 
            type="text" 
            placeholder="Cari nama, klub, atau bantalan (ex: 1A)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-arcus-red focus:ring-4 ring-arcus-red/5 transition-all shadow-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Archer List with Inputs */}
      <div className="grid grid-cols-1 gap-4">
        {archersToDisplay.map((a, archerIdx) => {
          const data = localScores[a.id] || { total: 0, count6: 0, count5: 0 };
          const config = (event.settings?.categoryConfigs || {})[a.category as CategoryType];
          const isPuta = config?.targetType === TargetType.PUTA;

          return (
            <div key={a.id} className="bg-white p-6 sm:p-8 rounded-[1.5rem] flex flex-col md:flex-row items-center gap-8 transition-all hover:bg-slate-50 relative overflow-hidden group">
               {/* Rank Badge */}
               <div className="absolute top-0 right-0 bg-slate-900 text-white px-4 py-1.5 rounded-bl-xl font-black font-oswald italic text-[10px] flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                  <Trophy className="w-3 h-3 text-arcus-sun" />
                  Rank #{event.archers
                    .map(archer => {
                      const scores = event.scores.filter(s => s.archerId === archer.id);
                      const total = scores.reduce((acc, curr) => acc + curr.total, 0);
                      const count6 = scores.reduce((acc, curr) => acc + (curr.count6 || 0), 0);
                      const count5 = scores.reduce((acc, curr) => acc + (curr.count5 || 0), 0);
                      return { id: archer.id, category: archer.category, total, count6, count5 };
                    })
                    .filter(archer => archer.category === a.category)
                    .sort((a, b) => {
                      if (b.total !== a.total) return b.total - a.total;
                      if (b.count6 !== a.count6) return b.count6 - a.count6;
                      return b.count5 - a.count5;
                    })
                    .findIndex(archer => archer.id === a.id) + 1}
               </div>

               <div className="flex items-center gap-6 w-full md:w-1/3">
                  <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center text-white font-black font-oswald text-lg italic shadow-md shrink-0">
                    {a.targetNo}{a.position}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-black font-oswald uppercase italic truncate leading-none text-slate-900">{a.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{a.club}</p>
                  </div>
               </div>

               <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Target className="w-3 h-3" /> Total Skor
                     </label>
                     <input 
                        ref={el => { inputRefs.current[`${a.id}-total`] = el; }}
                        type="number" 
                        value={data.total || ''}
                        onChange={(e) => handleUpdateLocal(a.id, 'total', parseInt(e.target.value) || 0)}
                        onKeyDown={(e) => handleKeyDownInInput(e, a.id, 'total', archerIdx)}
                        onFocus={(e) => {
                          e.target.select();
                          focusedArcher.current = a.id;
                        }}
                        onBlur={() => {
                          focusedArcher.current = null;
                        }}
                        placeholder="0"
                        className="w-full p-6 sm:p-8 border-2 border-slate-200 rounded-lg text-center font-black text-4xl sm:text-5xl text-slate-900 focus:bg-white focus:border-arcus-red focus:ring-8 ring-arcus-red/5 outline-none transition-all shadow-sm"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3" /> {isPuta ? 'Jumlah 2' : 'Jumlah X/10'}
                     </label>
                     <div className="flex items-center gap-2">
                        <input 
                          ref={el => { inputRefs.current[`${a.id}-count6`] = el; }}
                          type="number" 
                          value={data.count6 || ''}
                          onChange={(e) => handleUpdateLocal(a.id, 'count6', parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDownInInput(e, a.id, 'count6', archerIdx)}
                          onFocus={(e) => {
                            e.target.select();
                            focusedArcher.current = a.id;
                          }}
                          onBlur={() => {
                            focusedArcher.current = null;
                          }}
                          placeholder="0"
                           className="w-full p-6 border-2 border-slate-200 rounded-lg text-center font-black text-4xl text-slate-900 focus:bg-white focus:border-arcus-red focus:ring-8 ring-arcus-red/5 outline-none transition-all shadow-sm"
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3" /> {isPuta ? 'Jumlah 1' : 'Jumlah 9'}
                     </label>
                     <div className="flex items-center gap-2">
                        <input 
                          ref={el => { inputRefs.current[`${a.id}-count5`] = el; }}
                          type="number" 
                          value={data.count5 || ''}
                          onChange={(e) => handleUpdateLocal(a.id, 'count5', parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDownInInput(e, a.id, 'count5', archerIdx)}
                          onFocus={(e) => {
                            e.target.select();
                            focusedArcher.current = a.id;
                          }}
                          onBlur={() => {
                            focusedArcher.current = null;
                          }}
                          placeholder="0"
                          className="w-full p-6 border-2 border-slate-200 rounded-lg text-center font-black text-4xl text-slate-900 focus:bg-white focus:border-arcus-red focus:ring-8 ring-arcus-red/5 outline-none transition-all shadow-sm"
                        />
                     </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <button 
                      onClick={() => handleResetArcher(a.id)}
                      className="p-4 bg-red-50 border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all active:scale-90"
                      title="Reset skor pemanah ini"
                    >
                      <Trash2 className="w-5 h-5 font-black" />
                    </button>
                  </div>
               </div>
            </div>
          );
        })}

        {archersToDisplay.length === 0 && (
          <div className="bg-white py-16 px-8 rounded-lg border border-dashed border-slate-200 text-center space-y-4">
             <User className="w-12 h-12 text-slate-200 mx-auto" />
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tidak ada pemanah di {mode === 'TARGET' ? 'bantalan' : 'kategori'} ini</p>
          </div>
        )}
      </div>

      {/* Save Button */}
      {archersToDisplay.length > 0 && (
        <div className="flex justify-center pt-6">
           <button 
            onClick={handleSaveAll}
            className="w-full max-w-md bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 italic"
           >
             <Save className="w-5 h-5" /> Simpan Semua (Ctrl + S)
           </button>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-lg font-black text-[10px] uppercase shadow-2xl animate-in slide-in-from-bottom-10 flex items-center gap-3 z-[300]">
           <CheckCircle2 className="w-5 h-5" /> {showToast}
        </div>
      )}
    </div>
  );
};

export default QuickScoringPanel;
