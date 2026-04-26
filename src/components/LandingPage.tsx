import React from 'react';
import { motion } from 'motion/react';
import { 
  Target, Users, Trophy, Zap, ArrowRight, 
  Calendar, MapPin, Menu, X, 
  BarChart3, Smartphone,
  Globe, Clock, Award, Plus,
  ChevronRight,
  ShieldCheck,
  Activity,
  Monitor,
  Share2
} from 'lucide-react';
import { ArcheryEvent, User } from '../types';
import ArcusLogo from './ArcusLogo';

interface Props {
  events: ArcheryEvent[];
  onViewLive: (eventId: string) => void;
  onViewParticipants: (eventId: string) => void;
  onViewInfo: (eventId: string) => void;
  onRegister: (eventId: string) => void;
  onLogin: () => void;
  onScorerLogin: () => void;
  onCreateEvent: () => void;
  onShare: (eventId: string) => void;
  currentUser?: User | null;
  onLogout?: () => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

export default function LandingPage({ 
  events, 
  onViewLive, 
  onViewParticipants, 
  onViewInfo,
  onRegister,
  onLogin, 
  onScorerLogin,
  onCreateEvent,
  onShare,
  currentUser,
  onLogout,
  onRefresh,
  isSyncing
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const activeEvents = events.filter(e => e.status !== 'DRAFT');

  return (
    <div className="min-h-screen bg-[#FBFBFD] font-sans selection:bg-arcus-red selection:text-white overflow-x-hidden">
      {/* Dynamic Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" 
           style={{ backgroundImage: `radial-gradient(#000 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-[100] border-b border-slate-100">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center p-2 group-hover:bg-arcus-red transition-all duration-500 shadow-md">
                <ArcusLogo className="w-full h-full text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black font-oswald uppercase italic leading-none tracking-tighter text-slate-900">ARCUS DIGITAL</span>
                <span className="text-[9px] font-black text-arcus-red uppercase tracking-[0.2em] mt-1">Tournament OS</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-10">
              <a href="#events" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">Event</a>
              <a href="#features" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">Fitur</a>
              
              <div className="h-4 w-px bg-slate-200" />

              <button 
                onClick={onScorerLogin}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-arcus-red transition-all group"
              >
                <div className="p-1 px-2 border-2 border-slate-100 rounded-lg group-hover:border-arcus-red transition-all">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                Akses Scorer
              </button>

              <div className="h-4 w-px bg-slate-200" />

              {currentUser ? (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={onCreateEvent}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-arcus-red transition-all shadow-md active:scale-95 flex items-center gap-2"
                  >
                    DASHBOARD
                  </button>
                  {onLogout && (
                    <button 
                      onClick={onLogout}
                      className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-arcus-red transition-colors"
                    >
                      LOGOUT
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <button onClick={onLogin} className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-slate-900 transition-colors">LOGIN PANITIA</button>
                </div>
              )}
            </div>

            <button className="md:hidden w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-900" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-t border-slate-100 p-6 space-y-6"
          >
            <a href="#events" onClick={() => setIsMenuOpen(false)} className="block text-sm font-black uppercase tracking-widest text-slate-900">Event Terkini</a>
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="block text-sm font-black uppercase tracking-widest text-slate-900">Fitur Sistem</a>
            <div className="pt-6 border-t border-slate-50 flex flex-col gap-4">
              <button 
                onClick={() => { onScorerLogin(); setIsMenuOpen(false); }}
                className="w-full py-4 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black uppercase tracking-widest text-slate-400 hover:text-arcus-red transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                AKSES SCORER
              </button>
              {currentUser ? (
                <>
                  <button onClick={onCreateEvent} className="w-full py-4 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest">Dashboard Saya</button>
                  {onLogout && (
                    <button onClick={onLogout} className="w-full py-4 bg-slate-50 rounded-lg text-xs font-black uppercase tracking-widest text-slate-400">Logout</button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={onLogin} className="w-full py-4 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest">Login Panitia</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-40 pb-20 md:pb-28 px-6 lg:px-12 overflow-hidden">
        <div className="max-w-[1400px] mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center space-y-6 md:space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white border border-slate-100 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-arcus-red animate-pulse" />
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">DIGITAL ARCHERY SCORING SYSTEM</span>
            </div>

            <h1 className="text-4xl md:text-7xl font-black font-oswald text-slate-900 leading-[1] md:leading-[0.95] tracking-tighter uppercase italic">
              REVOLUSI <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-arcus-red to-orange-500">SCORING PANAHAN</span>
            </h1>

            <p className="max-w-xl text-sm md:text-base font-medium text-slate-500 leading-relaxed px-4">
              Platform manajemen turnamen panahan modern. Scoring real-time, manajemen peserta, dan publikasi hasil dalam satu jangkauan.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto px-4 md:px-0">
              <button 
                onClick={onScorerLogin}
                className="w-full sm:w-auto px-10 py-3.5 bg-arcus-red text-white border-2 border-arcus-red rounded-lg font-black font-oswald uppercase italic text-lg hover:bg-white hover:text-arcus-red transition-all shadow-xl shadow-red-200 flex items-center justify-center gap-3 group active:scale-95"
              >
                <ShieldCheck className="w-5 h-5" />
                SCORER ACCESS
              </button>
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-arcus-red/5 rounded-full blur-[100px] -z-10" />
      </section>

      {/* Floating Scorer FAB for Mobile */}
      {!currentUser && (
        <motion.button 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onScorerLogin}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex flex-col items-center justify-center md:hidden border-2 border-arcus-red/20 group"
        >
          <ShieldCheck className="w-6 h-6 text-arcus-red" />
          <span className="text-[6px] font-black uppercase tracking-tighter mt-1">SCORER</span>
        </motion.button>
      )}

      {/* Events Section */}
      <section id="events" className="py-20 md:py-24 px-6 lg:px-12 bg-white relative">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-6 md:gap-8 border-l-4 border-arcus-red pl-6">
            <div className="space-y-2">
              <div className="tech-label">TOURNAMENT BOARD</div>
              <div className="flex items-center gap-4">
                <h2 className="text-4xl md:text-5xl font-black font-oswald uppercase italic text-slate-900 leading-none">EVENT AKTIF</h2>
                {onRefresh && (
                  <button 
                    onClick={onRefresh}
                    disabled={isSyncing}
                    className={`p-2 rounded-lg border border-slate-100 hover:border-arcus-red hover:text-arcus-red transition-all ${isSyncing ? 'animate-spin text-arcus-red' : 'text-slate-400'}`}
                  >
                    <Activity className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <p className="max-w-xs text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
              Turnamen yang sedang berlangsung dan membutuhkan pantauan skor real-time.
            </p>
          </div>

          {activeEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeEvents.map((event, idx) => (
                <motion.div 
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }}
                  className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 relative overflow-hidden"
                >
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-inner">
                        <Trophy className="w-7 h-7" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          event.status === 'ACTIVE' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 
                          event.status === 'UPCOMING' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' :
                          event.status === 'ONGOING' ? 'bg-arcus-red text-white shadow-lg shadow-red-200 animate-pulse' :
                          'bg-slate-900 text-white'
                        }`}>
                          {event.status === 'ACTIVE' ? 'OPEN' : 
                           event.status === 'UPCOMING' ? 'COMING SOON' :
                           event.status === 'ONGOING' ? 'LIVE NOW' :
                           event.status}
                        </span>
                        <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                          ID: {event.id.slice(-6).toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black font-oswald uppercase italic tracking-tighter text-slate-900 mb-2 leading-none group-hover:text-arcus-red transition-colors duration-300 min-h-[3rem] line-clamp-2">
                      {event.settings.tournamentName}
                    </h3>
                    
                    <p className="text-slate-500 text-xs font-medium mb-8 line-clamp-2 italic leading-relaxed opacity-70">
                      {event.settings.description || 'Turnamen panahan prestasi yang dikelola oleh ekosistem ARCUS DIGITAL.'}
                    </p>

                    <div className="space-y-4 mb-10 pb-6 border-b border-slate-50">
                      <div className="flex items-center gap-4 text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{event.settings.location || 'Lokasi Menunggu Update'}</span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{event.settings.eventDate || 'Tanggal Pending'}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        console.log("Register clicked for event:", event.id);
                        onRegister(event.id);
                      }}
                      className="w-full py-4 bg-arcus-red text-white flex items-center justify-center gap-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-200 active:scale-95 mb-3"
                    >
                      <Plus className="w-4 h-4" />
                      DAFTAR SEKARANG
                    </button>

                    <button 
                      onClick={() => onViewParticipants(event.id)}
                      className="w-full py-3 bg-white text-slate-900 border-2 border-slate-100 flex items-center justify-center gap-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-arcus-red hover:text-arcus-red transition-all shadow-sm active:scale-95"
                    >
                      <Users className="w-4 h-4" />
                      DAFTAR PESERTA
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button 
                        onClick={() => onViewInfo(event.id)}
                        className="py-2.5 bg-slate-50 text-slate-500 border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95"
                      >
                        INFO
                      </button>
                      <button 
                        onClick={() => onViewLive(event.id)}
                        className="py-2.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-arcus-red transition-all shadow-sm active:scale-95"
                      >
                        LIVE SCORE
                      </button>
                      <button 
                        onClick={() => onShare(event.id)}
                        className="col-span-2 py-2 bg-slate-50 text-slate-400 border border-dashed border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest hover:border-arcus-red hover:text-arcus-red transition-all flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-3 h-3" />
                        BAGIKAN TURNAMEN
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-16 md:p-24 text-center border-2 border-dashed border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200 group-hover:scale-110 transition-transform duration-700">
                    <Trophy className="w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-black font-oswald uppercase italic text-slate-900 tracking-tighter mb-4">Tidak ada Turnamen Publik</h3>
                  <p className="max-w-xl mx-auto text-sm text-slate-500 font-medium leading-relaxed mb-10">
                    Saat ini belum ada turnamen yang berstatus <span className="font-bold text-blue-600">Publik</span>. Turnamen yang baru dibuat tetap bersifat <span className="font-bold text-amber-600">Draf</span> sampai diaktivasi oleh penyelenggara melalui Dashboard.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {onRefresh && (
                      <button 
                        onClick={onRefresh}
                        disabled={isSyncing}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-arcus-red transition-all shadow-xl active:scale-95 shadow-red-200"
                      >
                        <Activity className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Menghubungkan...' : 'Refresh Cloud'}
                      </button>
                    )}
                    <button 
                      onClick={onLogin}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-slate-900 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-arcus-red" />
                      Buat Turnamen
                    </button>
                  </div>

                  {!currentUser && (
                    <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 max-w-lg mx-auto">
                       <div className="flex items-center gap-3 justify-center mb-2">
                          <Monitor className="w-4 h-4 text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Catatan Data</span>
                       </div>
                       <p className="text-[11px] text-slate-400 font-medium italic">
                         Jika Anda penyelenggara dan tidak melihat turnamen Anda di sini, pastikan Anda sudah <span className="text-arcus-red font-bold">Login</span> dan melakukan Sinkronisasi Cloud. Data lokal hanya tersimpan di perangkat ini.
                       </p>
                    </div>
                  )}
               </div>

               {/* Background Decorative */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-arcus-red/5 rounded-full blur-3xl -mr-32 -mt-32" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-32 -mb-32" />
            </div>
          )}
        </div>
      </section>

      {/* Features Section - Simple & Compact */}
      <section id="features" className="py-20 md:py-24 px-6 lg:px-12 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-white/10" />
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col mb-16 md:mb-20 items-center text-center space-y-2">
            <div className="tech-label text-white/30">CORE CAPABILITIES</div>
            <h2 className="text-4xl md:text-5xl font-black font-oswald uppercase italic text-white tracking-tighter">FITUR UNGGULAN</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Smartphone, title: "MOBILE SCORING", desc: "Input skor langsung dari perangkat wasit tanpa kertas.", color: "bg-blue-600" },
              { icon: Monitor, title: "LIVE BOARD", desc: "Tampilkan skor real-time ke layar besar atau publik.", color: "bg-arcus-red" },
              { icon: Target, title: "CATEGORIES", desc: "Sesuaikan kategori & regulasi sesuai kebutuhan.", color: "bg-orange-600" },
              { icon: BarChart3, title: "AUTO STATS", desc: "Statistik akurasi & penentuan juara otomatis.", color: "bg-emerald-600" },
              { icon: Trophy, title: "ELIMINATION", desc: "Manajemen bracket eliminasi otomatis kualifikasi.", color: "bg-indigo-600" },
              { icon: Globe, title: "PUBLIC PORTAL", desc: "Pendaftaran & hasil web yang mudah diakses.", color: "bg-purple-600" }
            ].map((f, i) => (
              <div key={i} className="p-8 bg-white/5 border border-white/5 rounded-2xl hover:border-white/20 transition-all duration-300 group flex gap-5">
                <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black font-oswald uppercase italic text-white tracking-tight leading-none">{f.title}</h3>
                  <p className="text-[10px] md:text-xs text-white/40 leading-relaxed font-medium">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-slate-50 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "EVENT ARCHER", value: "2.4K+" },
              { label: "TOURNAMENT HELD", value: "850+" },
              { label: "ARROW SHOT", value: "1.2M+" },
              { label: "SYNC UPTIME", value: "99.9%" }
            ].map((s, i) => (
              <div key={i} className="text-center space-y-1">
                <div className="text-3xl md:text-4xl font-black font-oswald italic text-slate-900 tracking-tighter">{s.value}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
        </div>
      </section>

      {/* CTA Section - More Compact */}
      <section className="py-20 md:py-24 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-4xl mx-auto rounded-[2.5rem] md:rounded-[3.5rem] bg-slate-900 p-12 md:p-20 text-center relative overflow-hidden group shadow-2xl">
           <div className="absolute inset-0 bg-arcus-red opacity-10 group-hover:opacity-15 transition-opacity duration-500" />
           <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="relative z-10 space-y-8"
           >
              <h2 className="text-4xl md:text-6xl font-black font-oswald uppercase italic text-white leading-none tracking-tighter">
                MULAI <span className="text-arcus-red">LEVELING</span> <br />
                TURNAMEN ANDA
              </h2>
              <p className="text-white/40 font-medium max-w-sm mx-auto uppercase tracking-widest text-[9px] leading-relaxed">
                Bergabunglah dengan ratusan klub panahan yang telah menggunakan Arcus Digital.
              </p>
              <button 
                onClick={onCreateEvent}
                className="px-10 py-4 bg-white text-slate-900 rounded-xl md:rounded-2xl font-black font-oswald uppercase italic text-xl hover:bg-arcus-red hover:text-white transition-all shadow-xl active:scale-95"
              >
                DAFTAR SEKARANG
              </button>
           </motion.div>
        </div>
      </section>
    </div>
  );
}
