
import React, { useMemo } from 'react';
import { 
  Users, Trophy, DollarSign, Activity, 
  TrendingUp, Calendar, Target, ArrowUpRight,
  ArrowDownRight, CheckCircle2, Clock, AlertCircle, Plus
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { ArcheryEvent, User, CategoryType } from '../types';
import ArcusLogo from './ArcusLogo';

interface Props {
  user: User;
  events: ArcheryEvent[];
  onManageEvent: (id: string) => void;
  onCreateEvent: () => void;
}

const AdminDashboard: React.FC<Props> = ({ user, events = [], onManageEvent, onCreateEvent }) => {
  const stats = useMemo(() => {
    try {
      const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
      const totalEvents = safeEvents.length;
      
      const totalArchers = safeEvents.reduce((acc, e) => {
        try {
          const archers = Array.isArray(e?.archers) ? e.archers : [];
          const count = archers.filter(a => a && a.category !== CategoryType.OFFICIAL).length;
          return acc + Math.max(count, Number((e as any)?.registrationCount) || 0);
        } catch (err) {
          console.warn("Error calculating archers for event", e?.id, err);
          return acc;
        }
      }, 0);

      const totalOfficials = safeEvents.reduce((acc, e) => {
        try {
          const archers = Array.isArray(e?.archers) ? e.archers : [];
          const officials = Array.isArray(e?.officials) ? e.officials : [];
          const fromArchers = archers.filter(a => a && a.category === CategoryType.OFFICIAL).length;
          const fromOfficials = officials.length;
          return acc + Math.max(fromArchers + fromOfficials, Number((e as any)?.officialCount) || 0);
        } catch (err) {
          console.warn("Error calculating officials for event", e?.id, err);
          return acc;
        }
      }, 0);

      const totalPeople = totalArchers + totalOfficials;

      const totalRevenue = safeEvents.reduce((acc, e) => {
        try {
          const archers = Array.isArray(e?.archers) ? e.archers : [];
          const officials = Array.isArray(e?.officials) ? e.officials : [];
          const archerRevenue = archers.reduce((a, arc) => a + (Number(arc?.totalPaid) || 0), 0);
          const officialRevenue = officials.reduce((a, off) => a + (Number(off?.totalPaid) || 0), 0);
          return acc + archerRevenue + officialRevenue;
        } catch (err) {
          console.warn("Error calculating revenue for event", e?.id, err);
          return acc;
        }
      }, 0);

      const activeEvents = safeEvents.filter(e => e?.status === 'ONGOING').length;
      const upcomingEvents = safeEvents.filter(e => e?.status === 'UPCOMING').length;
      const completedEvents = safeEvents.filter(e => e?.status === 'COMPLETED').length;

      // Chart data: Archers per event
      const archerData = safeEvents.slice(0, 5).map(e => {
        const name = e?.settings?.tournamentName || 'UNNAMED';
        const archersCount = Array.isArray(e?.archers) ? e.archers.length : 0;
        return {
          name: name.length > 15 ? name.substring(0, 12) + '...' : name,
          archers: Math.max(archersCount, Number((e as any)?.registrationCount) || 0),
          id: e?.id
        };
      });

      // Status distribution
      const statusData = [
        { name: 'Ongoing', value: activeEvents, color: '#10b981' },
        { name: 'Upcoming', value: upcomingEvents, color: '#3b82f6' },
        { name: 'Completed', value: completedEvents, color: '#64748b' },
        { name: 'Draft', value: safeEvents.filter(e => e?.status === 'DRAFT').length, color: '#f59e0b' }
      ].filter(s => s.value > 0);

      return { 
        totalEvents, totalArchers, totalRevenue, totalPeople, totalOfficials,
        activeEvents, upcomingEvents, completedEvents,
        archerData, statusData
      };
    } catch (criticalErr) {
      console.error("Critical error in AdminDashboard stats memo", criticalErr);
      return {
        totalEvents: 0, totalArchers: 0, totalRevenue: 0, totalPeople: 0, totalOfficials: 0,
        activeEvents: 0, upcomingEvents: 0, completedEvents: 0,
        archerData: [], statusData: []
      };
    }
  }, [events]);

  if (!user) {
    return (
      <div className="p-12 text-center bg-red-50 rounded-3xl border border-red-100 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-xl font-black font-oswald uppercase text-red-900">Sesi Bermasalah</h3>
        <p className="text-sm font-medium text-red-600">Mohon login ulang untuk mengakses dashboard admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Total Event" 
          value={stats.totalEvents} 
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
          trend="+2 bulan ini"
          trendUp={true}
        />
        <DashboardCard 
          title="Total Peserta" 
          value={stats.totalPeople} 
          icon={<Users className="w-6 h-6 text-purple-600" />}
          trend={`${stats.totalArchers} Atlet / ${stats.totalOfficials} Official`}
          trendUp={null}
        />
        <DashboardCard 
          title="Estimasi Omzet" 
          value={`Rp ${stats.totalRevenue.toLocaleString()}`} 
          icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
          trend="+8% pertumbuhan"
          trendUp={true}
        />
        <DashboardCard 
          title="Event Aktif" 
          value={stats.activeEvents} 
          icon={<Activity className="w-6 h-6 text-orange-600" />}
          trend="Sedang berjalan"
          trendUp={null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-slate-50/50 p-8 rounded-[2rem] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black font-oswald uppercase italic">Distribusi Archer</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5 Event Terakhir</p>
            </div>
            <TrendingUp className="w-6 h-6 text-slate-200" />
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.archerData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: 'none' }}
                />
                <Bar dataKey="archers" radius={[8, 8, 0, 0]}>
                  {stats.archerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ef4444' : '#0f172a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-slate-50/50 p-8 rounded-[2rem] space-y-6">
          <div>
            <h3 className="text-xl font-black font-oswald uppercase italic text-slate-900">Status Event</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kondisi Turnamen</p>
          </div>
          
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-2xl font-black font-oswald italic">{stats.totalEvents}</span>
              <span className="text-[8px] font-black uppercase text-slate-400">Total</span>
            </div>
          </div>

          <div className="space-y-3">
            {stats.statusData.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <span className="text-[10px] font-black uppercase text-slate-500">{s.name}</span>
                </div>
                <span className="text-[10px] font-black">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events Table/List */}
      <div className="overflow-hidden">
        <div className="py-8 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black font-oswald uppercase italic text-slate-900">Event Saya</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Daftar turnamen yang Anda kelola</p>
          </div>
          <button 
            onClick={onCreateEvent}
            className="px-6 py-3 bg-arcus-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> BUAT EVENT BARU
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-8 py-4">Turnamen</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Archer</th>
                <th className="px-8 py-4">Tanggal</th>
                <th className="px-8 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events.slice(0, 5).map(event => (
                <tr key={event.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center transition-all group-hover:scale-110">
                        <ArcusLogo className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black uppercase text-xs text-slate-900 leading-tight">{event.settings?.tournamentName || 'Untitled'}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{event.settings?.location || 'No Location'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                      event.status === 'ONGOING' ? 'bg-emerald-100/50 text-emerald-700' :
                      event.status === 'UPCOMING' ? 'bg-blue-100/50 text-blue-700' :
                      event.status === 'DRAFT' ? 'bg-amber-100/50 text-amber-700' :
                      'bg-slate-100/50 text-slate-700'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <Users className="w-3 h-3 text-slate-300" />
                       <span className="text-xs font-bold text-slate-700">
                         {Math.max((event.archers || []).length + (event.officials || []).length, (event as any).registrationCount || 0)}
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-bold text-slate-500">{event.settings?.eventDate || 'TBA'}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => onManageEvent(event.id)}
                      className="p-2 text-slate-400 hover:text-arcus-red transition-all"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DashboardCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean | null;
}> = ({ title, value, icon, trend, trendUp }) => (
  <div className="p-8 rounded-[2rem] space-y-4 hover:bg-slate-50 transition-all group">
    <div className="flex items-center justify-between">
      <div className="p-4 bg-slate-100 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[9px] font-black uppercase ${
          trendUp === true ? 'text-emerald-500' : 
          trendUp === false ? 'text-red-500' : 
          'text-slate-400'
        }`}>
          {trendUp === true && <ArrowUpRight className="w-3 h-3" />}
          {trendUp === false && <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{title}</p>
      <h4 className="text-4xl font-black font-oswald italic text-slate-900 leading-none tracking-tighter">{value}</h4>
    </div>
  </div>
);

export default AdminDashboard;
