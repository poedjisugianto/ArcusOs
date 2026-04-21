
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Calendar, DollarSign, Settings, 
  ShieldCheck, CheckCircle2, 
  AlertCircle, Save, ArrowLeft, Trash2, 
  Search, Eye, ShieldAlert, Activity, Landmark, Check, Mail, Send
} from 'lucide-react';
import { AppState, GlobalSettings, ArcheryEvent, User, AppNotification, CategoryType } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface Props {
  state: AppState;
  onUpdateSettings: (gs: GlobalSettings) => void;
  onUpdateEvent: (eventId: string, updated: Partial<ArcheryEvent>) => void;
  onDeleteEvent: (eventId: string, reason?: string) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateUser: (user: User) => void;
  onSendNotif: (notif: AppNotification) => void;
  onBack: () => void;
}

const SuperAdminPanel: React.FC<Props> = ({ state, onUpdateSettings, onUpdateEvent, onDeleteEvent, onDeleteUser, onUpdateUser, onSendNotif, onBack }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EVENTS' | 'USERS' | 'SETTINGS'>('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSettings, setLocalSettings] = useState<GlobalSettings>(state.globalSettings);
  const [showSavedFlag, setShowSavedFlag] = useState(false);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<{ id: string, name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string, name: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean, message: string } | null>(null);

  const stats = useMemo(() => {
    const totalEvents = state.events.length;
    const totalUsers = state.users.length;
    const totalArchers = state.events.reduce((acc, e) => acc + e.archers.length, 0);
    const potentialFee = state.events.reduce((acc, e) => 
      acc + e.archers.reduce((a, arc) => a + (arc.platformFee || 0), 0), 0
    );
    const collectedFee = state.events
      .filter(e => e.settings.platformFeePaidToOwner)
      .reduce((acc, e) => acc + e.archers.reduce((a, arc) => a + (arc.platformFee || 0), 0), 0);
    
    return { totalEvents, totalUsers, totalArchers, potentialFee, collectedFee, pendingFee: potentialFee - collectedFee };
  }, [state.events, state.users]);

  const handleSaveGlobal = () => {
    onUpdateSettings(localSettings);
    setShowSavedFlag(true);
    setTimeout(() => setShowSavedFlag(false), 3000);
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setIsTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          subject: "ARCUS SMTP Test",
          message: `Halo,\n\nIni adalah email uji coba dari sistem ARCUS Digital Archery.\n\nJika Anda menerima email ini, berarti konfigurasi SMTP Anda sudah benar dan berfungsi dengan baik.\n\nTimestamp: ${new Date().toLocaleString()}`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailResult({ success: true, message: "Email uji coba berhasil dikirim!" });
      } else {
        setTestEmailResult({ success: false, message: "Gagal mengirim email uji coba." });
      }
    } catch (err) {
      setTestEmailResult({ success: false, message: "Terjadi kesalahan sistem." });
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* Global Saved Flag */}
      {showSavedFlag && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white">
            <Check className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Konfigurasi Master Tersimpan</span>
          </div>
        </div>
      )}

      {/* Simple Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 border rounded-2xl text-slate-400 hover:text-slate-900"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h2 className="text-2xl font-black font-oswald uppercase italic">Master Control Center</h2>
            <p className="text-[10px] font-black text-arcus-red uppercase tracking-widest">Manajemen Infrastruktur Sistem</p>
          </div>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border">
          <button onClick={() => setActiveTab('OVERVIEW')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'OVERVIEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Stats</button>
          <button onClick={() => setActiveTab('EVENTS')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'EVENTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Events</button>
          <button onClick={() => setActiveTab('USERS')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'USERS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Users</button>
          <button onClick={() => setActiveTab('SETTINGS')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'SETTINGS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Settings</button>
        </div>
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard title="Pendapatan" value={`Rp ${stats.collectedFee.toLocaleString()}`} icon={<DollarSign className="text-green-600" />} />
          <StatCard title="Piutang" value={`Rp ${stats.pendingFee.toLocaleString()}`} icon={<AlertCircle className="text-orange-600" />} />
          <StatCard title="Total Archer" value={stats.totalArchers} icon={<Users className="text-blue-600" />} />
          <StatCard title="Total User" value={stats.totalUsers} icon={<Users className="text-emerald-600" />} />
          <StatCard title="Total Event" value={stats.totalEvents} icon={<Calendar className="text-arcus-red" />} />
        </div>
      )}

      {activeTab === 'EVENTS' && (
        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
             <h3 className="font-black text-xs uppercase">Semua Event Turnamen</h3>
             <input type="text" placeholder="Cari event..." className="p-2 border rounded-xl text-xs" onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-white border-b text-slate-400 font-black uppercase">
                    <th className="p-6">Tournament & Lokasi</th>
                    <th className="p-6">Penyelenggara</th>
                    <th className="p-6">Kategori</th>
                    <th className="p-6 text-center">Peserta</th>
                    <th className="p-6 text-center">Penagihan</th>
                    <th className="p-6 text-center">Konfirmasi</th>
                    <th className="p-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.events.filter(e => e.settings.tournamentName.toLowerCase().includes(searchTerm.toLowerCase())).map(event => {
                  const organizer = state.users.find(u => u.id === event.settings.organizerId);
                  const activeCategories = Object.keys(event.settings.categoryConfigs || {}).map(cat => CATEGORY_LABELS[cat as CategoryType]);
                  
                  return (
                    <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-6">
                        <p className="font-black uppercase text-slate-900">{event.settings.tournamentName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" /> {event.settings.eventDate || 'TBA'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase flex items-center gap-1 mt-0.5">
                          <Landmark className="w-3 h-3" /> {event.settings.location || 'No Location'}
                        </p>
                      </td>
                      <td className="p-6">
                        <p className="font-black uppercase text-xs text-slate-700">{organizer?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{organizer?.email || '-'}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{organizer?.phone || '-'}</p>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {activeCategories.map((cat, i) => (
                            <span key={i} className="text-[8px] font-black bg-slate-100 px-1.5 py-0.5 rounded uppercase text-slate-500">{cat}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-lg text-slate-900">{event.archers.length}</span>
                          <span className="text-[8px] font-black uppercase text-slate-400">Archers</span>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${event.settings.platformFeePaidToOwner ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {event.settings.platformFeePaidToOwner ? 'Lunas' : 'Tertagih'}
                        </span>
                      </td>
                      <td className="p-6 text-center space-y-2">
                        <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${event.settings.isActivated !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {event.settings.isActivated !== false ? 'Email OK' : 'No Email'}
                        </div>
                        <button
                          onClick={() => onUpdateEvent(event.id, { 
                            settings: { ...event.settings, isConfirmed: !event.settings.isConfirmed } 
                          })}
                          className={`w-full px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${event.settings.isConfirmed !== false ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          {event.settings.isConfirmed !== false ? 'Terkonfirmasi' : 'Belum Konfirmasi'}
                        </button>
                      </td>
                      <td className="p-6 text-right space-x-2">
                         <button 
                          onClick={() => setConfirmDeleteEvent({ id: event.id, name: event.settings.tournamentName })} 
                          className="p-2 hover:text-red-600 transition-colors"
                          title="Hapus Event"
                         >
                          <Trash2 className="w-5 h-5" />
                         </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'USERS' && (
        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
             <h3 className="font-black text-xs uppercase">Manajemen Pengguna Arcus</h3>
             <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari user..." 
                    className="pl-10 pr-4 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-arcus-red outline-none" 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-white border-b text-slate-400 font-black uppercase">
                  <th className="p-6">User Info</th>
                  <th className="p-6">Email / WhatsApp</th>
                  <th className="p-6 text-center">Role</th>
                  <th className="p-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {state.users.filter(u => 
                  u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.phone?.includes(searchTerm)
                ).map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black uppercase text-slate-900">{user.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="font-bold text-slate-600">{user.email || '-'}</p>
                      <p className="text-slate-400">{user.phone || '-'}</p>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${user.isSuperAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.isSuperAdmin ? 'Super Admin' : 'Organizer'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                       {!user.isSuperAdmin && (
                         <button 
                          onClick={() => setConfirmDeleteUser({ id: user.id, name: user.name })} 
                          className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all group"
                          title="Hapus User"
                         >
                          <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'SETTINGS' && (
        <div className="bg-white rounded-[2.5rem] border shadow-sm p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
               <h4 className="font-black text-xs uppercase text-slate-400 border-b pb-2">Biaya Layanan Platform</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase text-slate-400">Fee Dewasa</label>
                     <input type="number" value={localSettings.feeAdult} onChange={e => setLocalSettings({...localSettings, feeAdult: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border rounded-2xl font-black" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase text-slate-400">Fee Anak</label>
                     <input type="number" value={localSettings.feeKids} onChange={e => setLocalSettings({...localSettings, feeKids: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border rounded-2xl font-black" />
                  </div>
               </div>
            </div>
            <div className="space-y-6">
               <h4 className="font-black text-xs uppercase text-slate-400 border-b pb-2">Rekening Settlement Pusat</h4>
               <div className="space-y-4">
                  <input type="text" placeholder="No. Rekening" value={localSettings.bankAccountNumber} onChange={e => setLocalSettings({...localSettings, bankAccountNumber: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" />
                  <input type="text" placeholder="Nama Pemilik" value={localSettings.bankAccountName} onChange={e => setLocalSettings({...localSettings, bankAccountName: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" />
               </div>
            </div>
          </div>

          <div className="space-y-6 border-t pt-10">
             <div className="flex items-center justify-between">
                <h4 className="font-black text-xs uppercase text-slate-400">Konfigurasi Payment Gateway</h4>
                <div className="flex items-center gap-2">
                   <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${localSettings.paymentGatewayIsProduction ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {localSettings.paymentGatewayIsProduction ? 'Production Mode' : 'Sandbox Mode'}
                   </span>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black uppercase text-slate-400">Provider</label>
                   <select 
                     value={localSettings.paymentGatewayProvider} 
                     onChange={e => setLocalSettings({...localSettings, paymentGatewayProvider: e.target.value as any})}
                     className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs"
                   >
                      <option value="NONE">Nonaktif (Manual Only)</option>
                      <option value="MIDTRANS">Midtrans (Indonesia)</option>
                      <option value="XENDIT">Xendit (Indonesia)</option>
                      <option value="STRIPE">Stripe (Global)</option>
                   </select>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black uppercase text-slate-400">Server Key / Secret</label>
                   <input 
                     type="password" 
                     placeholder="SB-Mid-server-..." 
                     value={localSettings.paymentGatewayServerKey || ''} 
                     onChange={e => setLocalSettings({...localSettings, paymentGatewayServerKey: e.target.value})}
                     className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" 
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black uppercase text-slate-400">Client Key / Public</label>
                   <input 
                     type="text" 
                     placeholder="SB-Mid-client-..." 
                     value={localSettings.paymentGatewayClientKey || ''} 
                     onChange={e => setLocalSettings({...localSettings, paymentGatewayClientKey: e.target.value})}
                     className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xs" 
                   />
                </div>
             </div>
             
             <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                <p className="text-[10px] font-medium text-blue-700 leading-relaxed">
                   <strong>PENTING:</strong> Pastikan Server Key disimpan dengan aman. Gunakan Sandbox Mode untuk pengujian sebelum beralih ke Production.
                </p>
                <div className="ml-auto flex items-center gap-2">
                   <span className="text-[9px] font-black uppercase text-slate-400">Production?</span>
                   <button 
                     onClick={() => setLocalSettings({...localSettings, paymentGatewayIsProduction: !localSettings.paymentGatewayIsProduction})}
                     className={`w-12 h-6 rounded-full relative transition-all ${localSettings.paymentGatewayIsProduction ? 'bg-red-500' : 'bg-slate-300'}`}
                   >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.paymentGatewayIsProduction ? 'left-7' : 'left-1'}`} />
                   </button>
                </div>
             </div>
          </div>

          <div className="space-y-6 border-t pt-10">
             <h4 className="font-black text-xs uppercase text-slate-400">Uji Coba Pengiriman Email (SMTP)</h4>
             <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-1.5">
                   <label className="text-[9px] font-black uppercase text-slate-400">Email Tujuan</label>
                   <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        placeholder="Masukkan email untuk testing..." 
                        value={testEmail} 
                        onChange={e => setTestEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl font-bold text-xs outline-none focus:ring-2 ring-arcus-red/10" 
                      />
                   </div>
                </div>
                <button 
                  onClick={handleTestEmail}
                  disabled={isTestingEmail || !testEmail}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                >
                  {isTestingEmail ? <Send className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                  Kirim Test
                </button>
             </div>
             {testEmailResult && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${testEmailResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                   {testEmailResult.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                   <p className="text-[10px] font-bold uppercase tracking-tight">{testEmailResult.message}</p>
                </div>
             )}
          </div>

          <button 
            onClick={handleSaveGlobal}
            className="w-full bg-arcus-red text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-arcus-red/20 flex items-center justify-center gap-3"
          >
            <Save className="w-5 h-5" /> Simpan Konfigurasi Global
          </button>
        </div>
      )}

      {/* Confirmation Modals */}
      {confirmDeleteEvent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center space-y-8 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto shadow-xl">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black font-oswald uppercase italic tracking-tight text-slate-900">Hapus Event?</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Hapus permanen event <strong>"{confirmDeleteEvent.name}"</strong>? Semua data pendaftaran dan skor akan hilang selamanya.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Alasan Penghapusan</label>
              <textarea 
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="Berikan alasan mengapa event ini dihapus..."
                className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setConfirmDeleteEvent(null); setDeleteReason(''); }} className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Batal</button>
              <button 
                onClick={() => {
                  onDeleteEvent(confirmDeleteEvent.id, deleteReason);
                  setConfirmDeleteEvent(null);
                  setDeleteReason('');
                }} 
                disabled={!deleteReason.trim()}
                className={`py-4 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl transition-all ${deleteReason.trim() ? 'bg-red-600 shadow-red-600/20' : 'bg-slate-300 shadow-none cursor-not-allowed'}`}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center space-y-8 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto shadow-xl">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black font-oswald uppercase italic tracking-tight text-slate-900">Hapus Pengguna?</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Hapus akun <strong>"{confirmDeleteUser.name}"</strong> secara permanen? User ini tidak akan bisa login lagi.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmDeleteUser(null)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Batal</button>
              <button 
                onClick={() => {
                  onDeleteUser(confirmDeleteUser.id);
                  setConfirmDeleteUser(null);
                }} 
                className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-red-600/20"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-4">
    <div className="p-4 bg-slate-50 rounded-2xl">{icon}</div>
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-xl font-black font-oswald text-slate-900">{value}</p>
    </div>
  </div>
);

export default SuperAdminPanel;
