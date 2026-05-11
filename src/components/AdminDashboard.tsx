
import React, { useMemo } from 'react';
import { 
  Users, Trophy, DollarSign, Activity, 
  TrendingUp, Calendar, Target, ArrowUpRight,
  ArrowDownRight, CheckCircle2, Clock, AlertCircle
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
}

const AdminDashboard: React.FC<Props> = ({ user, events = [], onManageEvent }) => {
  const stats = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    const totalEvents = safeEvents.length;
    const totalArchers = safeEvents.reduce((acc, e) => 
      acc + Math.max((e?.archers || []).filter(a => a && a.category !== CategoryType.OFFICIAL).length, (e as any).registrationCount || 0), 0
    );
    const totalOfficials = safeEvents.reduce((acc, e) => {
      const fromArchers = (e?.archers || []).filter(a => a && a.category === CategoryType.OFFICIAL).length;
      const fromOfficials = (e?.officials || []).length;
      return acc + Math.max(fromArchers + fromOfficials, (e as any).officialCount || 0);
    }, 0);
    const totalPeople = totalArchers + totalOfficials;

    const totalRevenue = safeEvents.reduce((acc, e) => {
      const archerRevenue = (e?.archers || []).reduce((a, arc) => a + (arc?.totalPaid || 0), 0);
      const officialRevenue = (e?.officials || []).reduce((a, off) => a + (off?.totalPaid || 0), 0);
      return acc + archerRevenue + officialRevenue;
    }, 0);
    const activeEvents = safeEvents.filter(e => e?.status === 'ONGOING').length;
    const upcomingEvents = safeEvents.filter(e => e?.status === 'UPCOMING').length;
    const completedEvents = safeEvents.filter(e => e?.status === 'COMPLETED').length;

    // Chart data: Archers per event
    const archerData = safeEvents.slice(0, 5).map(e => ({
      name: (e?.settings?.tournamentName || 'UNNAMED').length > 15 
        ? (e?.settings?.tournamentName || 'UNNAMED').substring(0, 12) + '...' 
        : (e?.settings?.tournamentName || 'UNNAMED'),
      archers: Math.max((e?.archers || []).length, (e as any).registrationCount || 0),
      id: e?.id
    }));

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
  }, [events]);

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
          <h3 className="text-xl font-black font-oswald uppercase italic">Event Terbaru</h3>
          <button className="text-[10px] font-black uppercase text-arcus-red hover:underline">Lihat Semua</button>
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
