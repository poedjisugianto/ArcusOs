import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Database, ArrowLeft, ShieldAlert, Edit3, 
  User, FileText, CheckCircle2, History, AlertCircle, 
  ChevronRight, Hash, Trash2, Download, Printer, FileDown,
  Delete, X as CloseIcon, Save, Plus, Minus, ScanLine
} from 'lucide-react';
import { ArcheryEvent, ScoreEntry, ScoreLog, Archer, CategoryType, TargetType } from '../types';
import { CATEGORY_LABELS } from '../constants';
import QRScanner from './QRScanner';

interface Props {
  event: ArcheryEvent;
  onSaveScore: (score: ScoreEntry | ScoreEntry[], log?: ScoreLog | ScoreLog[]) => void;
  onBack: () => void;
}

const OperatorCenter: React.FC<Props> = ({ event, onSaveScore, onBack }) => {
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem('op_name_draft') || '');
  const [editReason, setEditReason] = useState(() => localStorage.getItem('op_reason_draft') || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [selectedArcherId, setSelectedArcherId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'ARROW' | 'RAMBAHAN'>('ARROW');
  const [showScanner, setShowScanner] = useState(false);
  
  // Persist operator name and reason
  useEffect(() => {
    localStorage.setItem('op_name_draft', operatorName);
  }, [operatorName]);

  useEffect(() => {
    localStorage.setItem('op_reason_draft', editReason);
  }, [editReason]);

  // States for Rambahan Input
  const [rambahanScore, setRambahanScore] = useState(0);
  const [rambahan6s, setRambahan6s] = useState(0);
  const [rambahan5s, setRambahan5s] = useState(0);
  const [targetEnd, setTargetEnd] = useState(0);
  const [activeSession, setActiveSession] = useState<string>('QUAL');

  const availableCategories = useMemo(() => {
    return Array.from(new Set(event.archers.map(a => a.category)));
  }, [event.archers]);

  const filteredArchers = useMemo(() => {
    return event.archers.filter(a => 
      (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       a.club.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedCategory === 'ALL' || a.category === selectedCategory)
    );
  }, [event.archers, searchTerm, selectedCategory]);

  const selectedArcher = event.archers.find(a => a.id === selectedArcherId);
  const config = selectedArcher ? (event.settings.categoryConfigs || {})[selectedArcher.category as CategoryType] : null;

  const availableSessions = useMemo(() => {
    if (!selectedArcher || !config) return ['QUAL'];
    const sessions = ['QUAL'];
    if (config.eliminationStages) {
      config.eliminationStages.forEach(size => {
        sessions.push(`ELIM_${size}`);
      });
    }
    return sessions;
  }, [selectedArcher, config]);

  const handleSaveRambahan = () => {
    if (!selectedArcher || !operatorName || !editReason) {
      alert("Nama Operator dan Alasan Audit wajib diisi!");
      return;
    }

    const dummyArrows: (number | 'X')[] = new Array(config?.arrows || 6).fill(0);
    for(let i=0; i<rambahan6s; i++) { if(i < dummyArrows.length) dummyArrows[i] = 'X'; }
    
    const scoreEntry: ScoreEntry = {
      archerId: selectedArcher.id,
      sessionId: activeSession,
      endIndex: targetEnd,
      arrows: dummyArrows,
      total: rambahanScore,
      count6: rambahan6s,
      count5: rambahan5s,
      lastUpdated: Date.now()
    };

    const log: ScoreLog = {
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      archerId: selectedArcher.id,
      sessionId: activeSession,
      endIndex: targetEnd,
      oldTotal: 0,
      newTotal: rambahanScore,
      timestamp: Date.now(),
      operatorName,
      reason: `Manual Rambahan Input: ${editReason} (6s: ${rambahan6s}, 5s: ${rambahan5s})`
    };

    onSaveScore(scoreEntry, log);
    alert('Input Rambahan Berhasil!');
    setRambahanScore(0);
    setRambahan6s(0);
    setRambahan5s(0);
  };

  const handleScan = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'SCORING_SHEET' && parsed.eventId === event.id) {
        setSelectedCategory('ALL');
        setSearchTerm('');
        setSelectedArcherId(parsed.archerId);
        setShowScanner(false);
      } else {
        alert("QR Code tidak valid untuk event ini.");
      }
    } catch (e) {
      alert("Gagal membaca QR Code.");
    }
  };

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto pb-20">
      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-all">
            <ArrowLeft className="w-6 h-6 text-slate-500" />
          </button>
          <div>
            <h2 className="text-2xl font-black font-oswald uppercase italic">Operator Data Console</h2>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Audit Log & Skor Per-Rambahan</p>
          </div>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => setShowScanner(true)}
             className="bg-arcus-red text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 shadow-lg active:scale-95 transition-all"
           >
             <ScanLine className="w-5 h-5" /> Scan Sheet
           </button>
           <input 
            type="text" 
            placeholder="Nama Operator..." 
            value={operatorName}
            onChange={e => setOperatorName(e.target.value)}
            className="p-4 bg-slate-50 border rounded-2xl text-xs font-bold"
           />
           <button onClick={() => setInputMode(inputMode === 'ARROW' ? 'RAMBAHAN' : 'ARROW')} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase">
             Mode: {inputMode === 'ARROW' ? 'Per-Arrow' : 'Per-Rambahan'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-4 bg-white rounded-[2.5rem] border overflow-hidden flex flex-col h-[600px]">
           <div className="p-6 bg-slate-50 border-b space-y-4">
              <input 
                type="text" 
                placeholder="Cari Pemanah..." 
                className="w-full p-4 border rounded-2xl text-xs font-bold"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 whitespace-nowrap transition-all ${selectedCategory === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  Semua
                </button>
                {availableCategories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat as CategoryType)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredArchers.map(a => (
                <button 
                  key={a.id} 
                  onClick={() => setSelectedArcherId(a.id)}
                  className={`w-full p-6 text-left rounded-2xl border-2 transition-all ${selectedArcherId === a.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-transparent hover:border-slate-100'}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{a.targetNo}{a.position}</p>
                  <p className="font-black font-oswald uppercase text-lg italic">{a.name}</p>
                </button>
              ))}
           </div>
        </div>

        <div className="xl:col-span-8">
           {!selectedArcher ? (
             <div className="h-full flex items-center justify-center text-slate-300 italic uppercase font-black tracking-widest border-2 border-dashed rounded-[3rem]">
               Pilih Pemanah untuk Audit
             </div>
           ) : (
             <div className="bg-white rounded-[3rem] border p-10 space-y-10 animate-in fade-in">
                <div className="flex justify-between items-center border-b pb-8">
                   <div>
                     <h3 className="text-3xl font-black font-oswald uppercase italic">{selectedArcher.name}</h3>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedArcher.club} • {selectedArcher.category}</p>
                   </div>
                   <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 font-black font-oswald text-2xl italic">
                     {inputMode} MODE
                   </div>
                </div>

                {inputMode === 'RAMBAHAN' && (
                  <div className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-slate-400">Babak Pertandingan</label>
                           <select 
                            value={activeSession} 
                            onChange={e => setActiveSession(e.target.value)} 
                            className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-xs font-oswald uppercase italic outline-none focus:border-blue-500"
                           >
                              {availableSessions.map(s => (
                                <option key={s} value={s}>
                                  {s === 'QUAL' ? 'KUALIFIKASI' : s.replace('ELIM_', 'ELIMINASI TOP ')}
                                </option>
                              ))}
                           </select>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-slate-400">Pilih Rambahan</label>
                           <select value={targetEnd} onChange={e => setTargetEnd(Number(e.target.value))} className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-xs font-oswald italic outline-none focus:border-blue-500">
                              {Array.from({ length: config?.ends || 7 }).map((_, i) => {
                                const existing = event.scores.find(s => s.archerId === selectedArcherId && s.endIndex === i && s.sessionId === activeSession && !s.isDeleted);
                                return (
                                  <option key={i} value={i}>
                                    Rambahan #{i + 1} {existing ? `(Skor: ${existing.total})` : '(Belum Ada)'}
                                  </option>
                                );
                              })}
                           </select>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-slate-400">Total Skor Rambahan</label>
                           <input type="number" value={rambahanScore} onChange={e => setRambahanScore(Number(e.target.value))} className="w-full p-5 bg-slate-50 border rounded-2xl font-black text-2xl font-oswald outline-none focus:border-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-slate-400">
                                {selectedArcher && (
                                  (event.settings.categoryConfigs || {})[selectedArcher.category as CategoryType]?.targetType === TargetType.PUTA || 
                                  (event.settings.categoryConfigs || {})[selectedArcher.category as CategoryType]?.targetType === TargetType.TRADITIONAL_PUTA
                                ) ? 'Jumlah 2' : 'Jumlah 6 (X)'}
                              </label>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setRambahan6s(Math.max(0, rambahan6s - 1))} className="p-2 bg-slate-100 rounded-lg"><Minus className="w-4 h-4" /></button>
                                <span className="flex-1 text-center font-black text-xl">{rambahan6s}</span>
                                <button onClick={() => setRambahan6s(rambahan6s + 1)} className="p-2 bg-slate-100 rounded-lg"><Plus className="w-4 h-4" /></button>
                              </div>
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-slate-400">
                                {selectedArcher && (
                                  (event.settings.categoryConfigs || {})[selectedArcher.category as CategoryType]?.targetType === TargetType.PUTA || 
                                  (event.settings.categoryConfigs || {})[selectedArcher.category as CategoryType]?.targetType === TargetType.TRADITIONAL_PUTA
                                ) ? 'Jumlah 1' : 'Jumlah 5'}
                              </label>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setRambahan5s(Math.max(0, rambahan5s - 1))} className="p-2 bg-slate-100 rounded-lg"><Minus className="w-4 h-4" /></button>
                                <span className="flex-1 text-center font-black text-xl">{rambahan5s}</span>
                                <button onClick={() => setRambahan5s(rambahan5s + 1)} className="p-2 bg-slate-100 rounded-lg"><Plus className="w-4 h-4" /></button>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400">Alasan Audit / Perubahan</label>
                        <textarea value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Tulis alasan audit..." className="w-full p-6 bg-slate-50 border rounded-3xl font-medium italic resize-none h-32" />
                     </div>

                     <button onClick={handleSaveRambahan} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:brightness-110 active:scale-95 transition-all">
                       Simpan Skor Rambahan & Log Audit
                     </button>
                  </div>
                )}

                {inputMode === 'ARROW' && (
                  <div className="py-20 text-center text-slate-300 italic font-black uppercase tracking-[0.2em]">
                    Fitur Input Per-Arrow di Operator Center sedang dikembangkan. Gunakan Field Scorer untuk input detail.
                  </div>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default OperatorCenter;