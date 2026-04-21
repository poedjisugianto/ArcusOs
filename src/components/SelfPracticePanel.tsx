
import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  Target, TrendingUp, BarChart2, PieChart as PieChartIcon, 
  ArrowLeft, Zap, Clock, Trophy, ChevronRight, Save, Plus, X, Layout
} from 'lucide-react';
import { ArcheryEvent, ScoreEntry, CategoryType, TargetType, ScoreLog } from '../types';
import ArcusLogo from './ArcusLogo';

interface Props {
  event: ArcheryEvent;
  onSaveScore: (score: ScoreEntry | ScoreEntry[], log?: ScoreLog | ScoreLog[]) => void;
  onBack: () => void;
}

const SelfPracticePanel: React.FC<Props> = ({ event, onSaveScore, onBack }) => {
  const archer = event.archers[0]; // Self practice always has one archer
  const [showInput, setShowInput] = useState(false);
  const [inputMode, setInputMode] = useState<'TOTAL' | 'PER_ARROW'>('PER_ARROW');
  const [newScore, setNewScore] = useState({ total: 0, count6: 0, count5: 0 });
  const [arrowScores, setArrowScores] = useState<(number | 'X')[]>([]);
  
  const practiceEnds = event.settings.selfPracticeEnds || 10;
  const practiceArrows = event.settings.selfPracticeArrows || 6;
  const practiceDistance = event.settings.selfPracticeDistance || 0;
  const targetType = event.settings.selfPracticeTargetType || TargetType.STANDARD;
  const isPuta = targetType === TargetType.PUTA;

  const scores = useMemo(() => {
    return event.scores.filter(s => s.archerId === archer?.id).sort((a, b) => {
      if (a.sessionId !== b.sessionId) return Number(a.sessionId) - Number(b.sessionId);
      return (a.endIndex || 0) - (b.endIndex || 0);
    });
  }, [event.scores, archer]);

  const nextEndIndex = useMemo(() => {
    if (scores.length === 0) return 0;
    return Math.max(...scores.map(s => s.endIndex || 0)) + 1;
  }, [scores]);

  const handleSave = () => {
    if (!archer) return;
    
    let finalTotal: number = newScore.total;
    let finalCount6: number = newScore.count6;
    let finalCount5: number = newScore.count5;
    let finalArrows: (number | 'X')[] = new Array(practiceArrows).fill(0);

    if (inputMode === 'PER_ARROW') {
      finalTotal = arrowScores.reduce<number>((acc, a) => acc + (a === 'X' ? 10 : (typeof a === 'number' ? a : 0)), 0);
      finalCount6 = arrowScores.filter(a => a === 'X' || a === 10).length;
      finalCount5 = arrowScores.filter(a => a === 9).length;
      finalArrows = [...arrowScores];
      // Pad if needed
      while (finalArrows.length < practiceArrows) finalArrows.push(0);
    }

    onSaveScore({
      archerId: archer.id,
      sessionId: "1",
      endIndex: nextEndIndex,
      arrows: finalArrows,
      total: finalTotal,
      count6: finalCount6,
      count5: finalCount5,
      lastUpdated: Date.now()
    });
    setShowInput(false);
    setNewScore({ total: 0, count6: 0, count5: 0 });
    setArrowScores([]);
  };

  const handleArrowClick = (val: number | 'X') => {
    if (arrowScores.length < practiceArrows) {
      setArrowScores([...arrowScores, val]);
    }
  };

  const removeLastArrow = () => {
    setArrowScores(arrowScores.slice(0, -1));
  };

  const chartData = useMemo(() => {
    return scores.map((s, idx) => ({
      name: `End ${idx + 1}`,
      score: s.total,
      avg: (s.total / (s.arrows?.length || 1)).toFixed(1)
    }));
  }, [scores]);

  const arrowDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    scores.forEach(s => {
      (s.arrows || []).forEach(a => {
        const val = a === 'X' ? '10' : a.toString();
        dist[val] = (dist[val] || 0) + 1;
      });
    });
    return Object.entries(dist).map(([value, count]) => ({
      name: value,
      value: count
    })).sort((a, b) => parseInt(b.name) - parseInt(a.name));
  }, [scores]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7'];

  const stats = useMemo(() => {
    const total = scores.reduce((acc, s) => acc + s.total, 0);
    const arrowCount = scores.reduce((acc, s) => acc + (s.arrows?.length || 0), 0);
    const avg = arrowCount > 0 ? (total / arrowCount).toFixed(2) : '0.00';
    const xCount = scores.reduce((acc, s) => acc + (s.arrows?.filter(a => a === 'X').length || 0), 0);
    const tenCount = scores.reduce((acc, s) => acc + (s.arrows?.filter(a => a === 10 || a === 'X').length || 0), 0);
    
    return { total, avg, xCount, tenCount, arrowCount };
  }, [scores]);

  if (!archer) return <div>No Archer Found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 bg-slate-50 border rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <ArcusLogo className="w-12 h-12" />
            <div>
              <h2 className="text-3xl font-black font-oswald uppercase italic leading-none">{event.settings.tournamentName}</h2>
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mt-1 flex items-center gap-2">
                <Zap className="w-3 h-3" /> Mode Latihan Mandiri • {practiceDistance}m • {practiceEnds} End × {practiceArrows} Arrow • {isPuta ? 'Puta 2-Ring' : 'Standard 6-Ring'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowInput(true)}
            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Tambah Skor</span>
          </button>
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
            <Clock className="w-4 h-4 text-arcus-red" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {new Date(event.settings.createdAt || Date.now()).toLocaleDateString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Input Modal */}
      {showInput && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Target className="w-6 h-6 text-arcus-red" />
                <h3 className="text-xl font-black font-oswald uppercase italic leading-none">Input Skor End {nextEndIndex + 1}</h3>
              </div>
              <button onClick={() => setShowInput(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-10 space-y-8">
              {/* Mode Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border">
                <button 
                  onClick={() => setInputMode('PER_ARROW')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inputMode === 'PER_ARROW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  Per Arrow
                </button>
                <button 
                  onClick={() => setInputMode('TOTAL')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inputMode === 'TOTAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  Total Skor
                </button>
              </div>

              {inputMode === 'PER_ARROW' ? (
                <div className="space-y-8">
                  {/* Arrow Display */}
                  <div className="flex justify-center gap-3">
                    {Array.from({ length: practiceArrows }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-black text-lg transition-all ${
                          arrowScores[i] !== undefined 
                            ? 'bg-slate-900 border-slate-900 text-white scale-110' 
                            : 'bg-slate-50 border-slate-100 text-slate-300'
                        }`}
                      >
                        {arrowScores[i] !== undefined ? arrowScores[i] : ''}
                      </div>
                    ))}
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-4 gap-3">
                    {(isPuta ? [2, 1, 'M'] : ['X', 10, 9, 8, 7, 6, 5, 'M']).map((val) => (
                      <button
                        key={val}
                        onClick={() => handleArrowClick(val === 'M' ? 0 : (val as any))}
                        disabled={arrowScores.length >= practiceArrows}
                        className={`py-4 rounded-2xl font-black text-lg transition-all active:scale-90 ${
                          val === 'X' || val === 10 || val === 2 ? 'bg-yellow-400 text-yellow-900' :
                          val === 9 || val === 8 || val === 1 ? 'bg-red-500 text-white' :
                          val === 7 || val === 6 ? 'bg-blue-500 text-white' :
                          'bg-slate-100 text-slate-900'
                        } disabled:opacity-20 ${isPuta ? 'col-span-2' : ''}`}
                      >
                        {val}
                      </button>
                    ))}
                    <button 
                      onClick={removeLastArrow}
                      className="col-span-4 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-all"
                    >
                      Hapus Terakhir
                    </button>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sementara</p>
                    <p className="text-4xl font-black font-oswald italic text-slate-900">
                      {arrowScores.reduce((acc: number, a) => acc + (a === 'X' ? 10 : (typeof a === 'number' ? a : 0)), 0)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Skor Rambahan</label>
                    <input 
                      type="number" 
                      autoFocus
                      value={newScore.total || ''}
                      onChange={e => setNewScore({...newScore, total: parseInt(e.target.value) || 0})}
                      className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-3xl font-black font-oswald italic text-center outline-none focus:border-emerald-500 transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        {isPuta ? 'Jumlah 2' : 'Jumlah X/10'}
                      </label>
                      <input 
                        type="number" 
                        value={newScore.count6 || ''}
                        onChange={e => setNewScore({...newScore, count6: parseInt(e.target.value) || 0})}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-center outline-none focus:border-emerald-500 transition-all"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        {isPuta ? 'Jumlah 1' : 'Jumlah 9'}
                      </label>
                      <input 
                        type="number" 
                        value={newScore.count5 || ''}
                        onChange={e => setNewScore({...newScore, count5: parseInt(e.target.value) || 0})}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-center outline-none focus:border-emerald-500 transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={handleSave}
                disabled={inputMode === 'PER_ARROW' && arrowScores.length === 0}
                className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Save className="w-5 h-5" /> Simpan Skor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Progres Sesi" value={`${scores.length} / ${practiceEnds}`} icon={<Layout className="text-purple-500" />} />
        <StatCard title="Total Skor" value={stats.total} icon={<Trophy className="text-yellow-500" />} />
        <StatCard title="Rata-rata / Arrow" value={stats.avg} icon={<TrendingUp className="text-blue-500" />} />
        <StatCard title={isPuta ? "Total 2 / 1" : "Total X / 10"} value={`${stats.xCount} / ${stats.tenCount}`} icon={<Target className="text-arcus-red" />} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Line Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black font-oswald uppercase italic text-xl flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-500" /> Tren Performa
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Arrow Distribution */}
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black font-oswald uppercase italic text-xl flex items-center gap-3">
              <PieChartIcon className="w-6 h-6 text-emerald-500" /> Distribusi Arrow
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={arrowDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {arrowDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Ends Table */}
      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black font-oswald uppercase italic text-xl">Riwayat End</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{scores.length} End Tercatat</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-6">End</th>
                <th className="p-6">Arrow Scores</th>
                <th className="p-6 text-center">Total</th>
                <th className="p-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {scores.slice().reverse().map((s, idx) => (
                <tr key={`${s.sessionId}-${s.endIndex}`} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 font-black text-slate-900">End {scores.length - idx}</td>
                  <td className="p-6">
                    <div className="flex gap-2">
                      {(s.arrows || []).map((a, i) => (
                        <span key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border ${
                          isPuta ? (
                            a === 2 ? 'bg-yellow-400 border-yellow-500 text-yellow-900' :
                            a === 1 ? 'bg-red-500 border-red-600 text-white' :
                            'bg-slate-100 border-slate-200 text-slate-900'
                          ) : (
                            a === 'X' || a === 10 ? 'bg-yellow-400 border-yellow-500 text-yellow-900' :
                            a >= 7 ? 'bg-red-500 border-red-600 text-white' :
                            a >= 5 ? 'bg-blue-500 border-blue-600 text-white' :
                            'bg-slate-100 border-slate-200 text-slate-900'
                          )
                        }`}>
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className="text-xl font-black font-oswald italic text-slate-900">{s.total}</span>
                  </td>
                  <td className="p-6 text-right">
                    <button className="p-2 text-slate-300 hover:text-arcus-red transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {scores.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-slate-300 italic font-medium">
                    Belum ada skor yang dimasukkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex items-center gap-6 hover:border-teal-500 transition-all group">
    <div className="p-5 bg-slate-50 rounded-3xl group-hover:scale-110 transition-transform">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-black font-oswald text-slate-900 italic leading-none">{value}</p>
    </div>
  </div>
);

export default SelfPracticePanel;
