
import React, { useState, useMemo, useEffect } from 'react';
import { ArcheryEvent, GlobalSettings, CategoryType, AppNotification, TargetType, UserRole } from '../types';
import { 
  Plus, Layout, Settings, Monitor, Trash2, Clock, 
  ShieldCheck, UserCheck, CheckCircle, FileText, X, 
  Trophy, ArrowRight, AlertTriangle, CheckCircle2,
  DollarSign, Landmark, CreditCard, Printer, Info, Check, Target, Zap,
  QrCode, Loader2, Smartphone, Share2, Shield, ChevronRight, ShieldAlert,
  Bell, BellRing, Mail, Inbox, Send, MessageSquare, History, RefreshCw,
  TrendingUp, BarChart2, Database, Search, Users, Filter, Calendar, MapPin
} from 'lucide-react';
import ArcusLogo from './ArcusLogo';
import AdminDashboard from './AdminDashboard';

interface Props {
  userName?: string;
  userId: string;
  userRole?: UserRole;
  currentUser?: any;
  isSuperAdmin?: boolean;
  onGoToSuperAdmin?: () => void;
  notifications: AppNotification[];
  onMarkNotifRead: () => void;
  globalSettings: GlobalSettings;
  events: ArcheryEvent[];
  onCreateEvent: (name: string, isFree?: boolean, description?: string) => void;
  onCreatePractice: (name: string, isFree?: boolean) => void;
  onCreateSelfPractice: (name: string, ends: number, arrows: number, targetType: TargetType, distance: number) => void;
  onManageEvent: (id: string) => void;
  onViewLive: (id: string) => void;
  onUpdateEvent: (id: string, updated: Partial<ArcheryEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onRefreshData?: () => void;
  onActivateEvent?: (id: string) => void;
  onShare: (id: string, name: string) => void;
  onSendNotif?: (notif: AppNotification) => void;
  onLogout?: () => void;
}

type CreationStep = 'LIST' | 'AGREEMENT' | 'NAME_INPUT' | 'FINAL_CONFIRM' | 'PRACTICE_INPUT' | 'SELF_PRACTICE_INPUT';
type BillingStep = 'INVOICE' | 'PAYMENT_SELECTION' | 'GATEWAY_PROCESS' | 'SUCCESS';
type InboxTab = 'RECEIVED' | 'COMPOSE' | 'SENT';

const MemberDashboard: React.FC<Props> = ({ userName, userId, userRole, currentUser, isSuperAdmin, onGoToSuperAdmin, notifications, onMarkNotifRead, globalSettings, events, onCreateEvent, onCreatePractice, onCreateSelfPractice, onManageEvent, onViewLive, onUpdateEvent, onDeleteEvent, onRefreshData, onActivateEvent, onShare, onSendNotif, onLogout }) => {
  const [step, setStep] = useState<CreationStep>('LIST');
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [practiceEnds, setPracticeEnds] = useState(10);
  const [practiceArrows, setPracticeArrows] = useState(6);
  const [practiceTargetType, setPracticeTargetType] = useState<TargetType>(TargetType.STANDARD);
  const [practiceDistance, setPracticeDistance] = useState(20);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxTab, setInboxTab] = useState<InboxTab>('RECEIVED');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string, isPractice?: boolean } | null>(null);
  
  // Message Compose States
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'EVENTS'>('DASHBOARD');

  // Billing States
  const [selectedInvoiceEvent, setSelectedInvoiceEvent] = useState<ArcheryEvent | null>(null);
  const [billingStep, setBillingStep] = useState<BillingStep>('INVOICE');
  const [paymentMode, setPaymentMode] = useState<'MANUAL' | 'GATEWAY' | null>(null);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [billingTrxId, setBillingTrxId] = useState<string | null>(null);
  const [billingPaymentStatus, setBillingPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');
  const [eventSearch, setEventSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ONGOING' | 'UPCOMING'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TOURNAMENT' | 'PRACTICE'>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'NAME_ASC'>('NEWEST');

  const filteredEvents = useMemo(() => {
    let result = events.filter(e => {
      const matchesSearch = e.settings.tournamentName.toLowerCase().includes(eventSearch.toLowerCase()) ||
        (e.settings.location?.toLowerCase() || '').includes(eventSearch.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
      
      const isPractice = e.settings.isPractice || e.settings.isSelfPractice;
      const matchesType = typeFilter === 'ALL' || 
        (typeFilter === 'PRACTICE' && isPractice) || 
        (typeFilter === 'TOURNAMENT' && !isPractice);

      const matchesPayment = paymentStatusFilter === 'ALL' || 
        (paymentStatusFilter === 'PAID' && e.settings.platformFeePaidToOwner) || 
        (paymentStatusFilter === 'UNPAID' && !e.settings.platformFeePaidToOwner && !e.settings.isPractice);
        
      return matchesSearch && matchesStatus && matchesType && matchesPayment;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'NEWEST') return (b.settings.createdAt || 0) - (a.settings.createdAt || 0);
      if (sortBy === 'OLDEST') return (a.settings.createdAt || 0) - (b.settings.createdAt || 0);
      if (sortBy === 'NAME_ASC') return a.settings.tournamentName.localeCompare(b.settings.tournamentName);
      return 0;
    });
  }, [events, eventSearch, statusFilter, typeFilter, sortBy]);

  const handleStartCreation = () => {
    setStep('AGREEMENT');
  };

  const handleStartPractice = () => {
    setStep('PRACTICE_INPUT');
    setName(`Latihan Bersama ${new Date().toLocaleDateString('id-ID')}`);
  };

  const handleStartSelfPractice = () => {
    setStep('SELF_PRACTICE_INPUT');
    setName(`Latihan Mandiri ${new Date().toLocaleDateString('id-ID')}`);
  };

  const handleCancel = () => {
    setStep('LIST');
    setAgreed(false);
    setName('');
    setDescription('');
    setPromoCode('');
    setIsFree(false);
  };

  const handleFinalize = () => {
    if (!name.trim()) return;
    onCreateEvent(name, isFree, description);
    setStep('LIST');
    setName('');
    setDescription('');
    setPromoCode('');
    setIsFree(false);
    setAgreed(false);
  };

  const handleFinalizePractice = () => {
    if (!name.trim()) return;
    onCreatePractice(name, isFree);
    setStep('LIST');
    setName('');
    setPromoCode('');
    setIsFree(false);
  };

  const handleFinalizeSelfPractice = () => {
    if (!name.trim()) return;
    onCreateSelfPractice(name, practiceEnds, practiceArrows, practiceTargetType, practiceDistance);
    setStep('LIST');
    setName('');
  };

  const handleRefresh = () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      onRefreshData();
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  const handleSendToMaster = () => {
    if (!msgTitle || !msgContent || !onSendNotif) return;
    
    const newNotif: AppNotification = {
      id: 'notif_' + Math.random().toString(36).substr(2, 9),
      title: msgTitle,
      message: msgContent,
      type: 'INFO',
      timestamp: Date.now(),
      read: false,
      recipientId: 'owner_1', // Target hardcoded ke Master Admin
      senderId: userId
    };

    onSendNotif(newNotif);
    alert('Pesan terkirim ke Master Admin!');
    setMsgTitle('');
    setMsgContent('');
    setInboxTab('SENT');
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string, isPractice?: boolean) => {
    e.stopPropagation();
    setConfirmDelete({ id, name, isPractice });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setDeletingId(id);
    try {
      await onDeleteEvent(id);
    } finally {
      setConfirmDelete(null);
      setDeletingId(null);
    }
  };

  // Payment Gateway Simulation for Platform Fee
  const handlePayPlatformFee = async () => {
    setSimulationProgress(0);
    setBillingPaymentStatus('PENDING');
    
    try {
      const totalFee = selectedInvoiceEvent?.archers.reduce((acc, a) => acc + (a.platformFee || 0), 0) || 0;
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: totalFee, 
          method: 'GATEWAY',
          provider: globalSettings.paymentGatewayProvider,
          customerDetails: {
            first_name: userName,
            email: currentUser?.email
          },
          itemDetails: [{
            id: selectedInvoiceEvent?.id,
            price: totalFee,
            quantity: 1,
            name: `Platform Fee: ${selectedInvoiceEvent?.settings.tournamentName}`
          }]
        })
      });
      const data = await res.json();
      if (data.success) {
        setBillingTrxId(data.transactionId);
        
        if (data.token) {
          // @ts-ignore
          window.snap.pay(data.token, {
            onSuccess: () => {
              setBillingPaymentStatus('PAID');
              setSimulationProgress(100);
            },
            onPending: () => {
              setBillingStep('GATEWAY_PROCESS');
            },
            onError: () => {
              alert("Pembayaran Gagal");
            }
          });
        } else {
          setBillingStep('GATEWAY_PROCESS');
        }
      }
    } catch (err) {
      console.error("Billing init error", err);
    }
  };

  // Poll for Billing Payment Status
  useEffect(() => {
    let pollInterval: any;

    if (billingStep === 'GATEWAY_PROCESS' && billingTrxId && billingPaymentStatus === 'PENDING') {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/payment/status/${billingTrxId}`);
          const data = await res.json();
          if (res.ok && data.success && data.status === 'PAID') {
            setBillingPaymentStatus('PAID');
            setSimulationProgress(100);
            setTimeout(() => {
              if (selectedInvoiceEvent) {
                onUpdateEvent(selectedInvoiceEvent.id, { 
                  settings: { ...selectedInvoiceEvent.settings, platformFeePaidToOwner: true } 
                });
                setBillingStep('SUCCESS');
              }
            }, 1000);
          }
        } catch (err) {
          console.error("Billing polling error", err);
        }
      }, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [billingStep, billingTrxId, billingPaymentStatus, selectedInvoiceEvent, onUpdateEvent]);

  // Visual Progress for Billing
  useEffect(() => {
    if (billingStep === 'GATEWAY_PROCESS' && billingPaymentStatus === 'PENDING') {
      const timer = setInterval(() => {
        setSimulationProgress(prev => {
          if (prev >= 90) return 90;
          return prev + 5;
        });
      }, 500);
      return () => clearInterval(timer);
    }
  }, [billingStep, billingPaymentStatus]);

  const unpaidEvents = events.filter(e => !e.settings.platformFeePaidToOwner && e.archers.length > 0 && !e.settings.isPractice);
  const receivedNotifs = notifications.filter(n => n.recipientId === userId || !n.recipientId);
  const sentNotifs = notifications.filter(n => n.senderId === userId);
  const unreadCount = receivedNotifs.filter(n => !n.read).length;

  const resetBilling = () => {
    setSelectedInvoiceEvent(null);
    setBillingStep('INVOICE');
    setPaymentMode(null);
    setSimulationProgress(0);
  };

  const getExpirationStatus = (event: ArcheryEvent) => {
    const createdAt = event.settings.createdAt || Date.now();
    const ageInDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    const retentionLimit = event.settings.isPractice ? globalSettings.practiceRetentionDays : globalSettings.dataRetentionDays;
    const remainingDays = Math.ceil(retentionLimit - ageInDays);
    
    if (remainingDays <= 3) {
      return { isUrgent: true, message: `Auto-Hapus dalam ${remainingDays} hari` };
    }
    return null;
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-24">
      {/* Header Welcome Card & Notif Icon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900 p-8 sm:p-10 rounded-lg text-white shadow-lg relative overflow-hidden border border-white/5">
        <div className="flex items-center gap-6 relative z-10">
          <div className="bg-white p-4 rounded-lg shadow-xl shadow-arcus-red/20 relative group transition-transform duration-500">
            <ArcusLogo className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl sm:text-4xl font-black font-oswald uppercase leading-none italic tracking-tighter">Halo, {userName || 'Organizer'}!</h2>
              <div className="flex items-center gap-2">
                {userRole && (
                    <div className={`px-3 py-1 rounded text-[8px] font-black uppercase tracking-[0.2em] border ${
                    userRole === UserRole.MASTER_ADMIN ? 'bg-red-500/20 border-red-500/30 text-red-200' :
                    userRole === UserRole.ORGANIZER ? 'bg-arcus-sun/20 border-arcus-sun/30 text-arcus-sun' :
                    'bg-white/10 border-white/20 text-slate-300'
                    }`}>
                    {userRole.replace('_', ' ')}
                    </div>
                )}
                {onLogout && (
                    <button 
                        onClick={onLogout}
                        className="px-3 py-1 bg-white/5 hover:bg-arcus-red border border-white/10 rounded text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                        LOGOUT
                    </button>
                )}
              </div>
            </div>
            <p className="text-slate-400 mt-2 text-sm sm:text-lg font-medium tracking-tight opacity-70">Dashboard manajemen turnamen ARCUS.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 relative z-10">
          {/* Notifications Trigger */}
          <button 
            onClick={() => { setShowInbox(true); onMarkNotifRead(); }}
            className={`p-4 rounded-lg border transition-all relative group active:scale-95 ${unreadCount > 0 ? 'bg-arcus-red border-arcus-red shadow-lg shadow-arcus-red/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
             {unreadCount > 0 ? <BellRing className="w-6 h-6 text-white animate-bounce" /> : <Bell className="w-6 h-6 text-slate-400 group-hover:text-white" />}
             {unreadCount > 0 && (
               <div className="absolute -top-1 -right-1 bg-white text-arcus-red text-[8px] font-black w-6 h-6 rounded-full flex items-center justify-center border border-arcus-red shadow-md">
                 {unreadCount}
               </div>
             )}
          </button>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
             <button 
                onClick={handleRefresh}
                className={`p-3.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-md active:scale-95 flex items-center justify-center ${isRefreshing ? 'animate-spin text-arcus-red' : ''}`}
                title="Refresh Data Cloud"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
             <button 
              onClick={handleStartSelfPractice}
              className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 border border-emerald-400/20"
            >
              <Target className="w-4 h-4" /> MANDIRI
            </button>
             <button 
              onClick={handleStartPractice}
              className="px-5 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 border border-teal-400/20"
            >
              <Zap className="w-4 h-4" /> LATIHAN
            </button>
            <button 
              onClick={handleStartCreation}
              className="px-6 py-3.5 bg-arcus-red text-white rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg active:scale-95"
            >
              <Plus className="w-5 h-5" /> TURNAMEN BARU
            </button>
          </div>
        </div>
        
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-arcus-red/10 rounded-full -mr-40 -mt-40 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full -ml-20 -mb-20 blur-[80px] pointer-events-none" />
      </div>

      {/* Enhanced Inbox Modal (Two-Way Messaging) */}
      {showInbox && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[85vh]">
             <div className="p-8 bg-slate-900 text-white flex flex-col gap-6">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <MessageSquare className="w-6 h-6 text-arcus-red" />
                      <h3 className="text-xl font-black font-oswald uppercase italic leading-none">Pusat Komunikasi Master</h3>
                   </div>
                   <button onClick={() => setShowInbox(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                </div>

                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 self-start">
                   <button 
                    onClick={() => setInboxTab('RECEIVED')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inboxTab === 'RECEIVED' ? 'bg-arcus-red text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                   >
                     Inbox {unreadCount > 0 && `(${unreadCount})`}
                   </button>
                   <button 
                    onClick={() => setInboxTab('SENT')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inboxTab === 'SENT' ? 'bg-arcus-red text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                   >
                     Riwayat Pesan
                   </button>
                   <button 
                    onClick={() => setInboxTab('COMPOSE')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inboxTab === 'COMPOSE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                   >
                     Tulis Pesan Baru
                   </button>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-slate-50">
                {inboxTab === 'RECEIVED' && (
                  receivedNotifs.length === 0 ? (
                    <div className="py-24 text-center space-y-4 opacity-20">
                       <Mail className="w-16 h-16 mx-auto" />
                       <p className="font-black uppercase tracking-widest text-xs">Tidak ada pesan masuk</p>
                    </div>
                  ) : (
                    receivedNotifs.sort((a, b) => b.timestamp - a.timestamp).map(notif => (
                      <div key={notif.id} className={`p-6 rounded-[2rem] border-2 shadow-sm transition-all ${notif.type === 'WARNING' ? 'bg-red-50 border-red-100' : 'bg-white border-white'}`}>
                         <div className="flex justify-between items-start mb-3">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${notif.type === 'WARNING' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>MASTER ADMIN</span>
                            <span className="text-[9px] font-black text-slate-300 uppercase">{new Date(notif.timestamp).toLocaleString('id-ID')}</span>
                         </div>
                         <h4 className="font-black text-slate-900 uppercase font-oswald italic text-lg leading-tight mb-2">{notif.title}</h4>
                         <p className="text-slate-600 text-sm font-medium leading-relaxed italic">"{notif.message}"</p>
                      </div>
                    ))
                  )
                )}

                {inboxTab === 'SENT' && (
                   sentNotifs.length === 0 ? (
                    <div className="py-24 text-center space-y-4 opacity-20">
                       <History className="w-16 h-16 mx-auto" />
                       <p className="font-black uppercase tracking-widest text-xs">Belum ada riwayat pesan</p>
                    </div>
                   ) : (
                    sentNotifs.sort((a, b) => b.timestamp - a.timestamp).map(notif => (
                      <div key={notif.id} className="p-6 rounded-[2rem] bg-white border-2 border-slate-100 shadow-sm opacity-80">
                         <div className="flex justify-between items-start mb-3">
                            <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">Kirim Ke Master</span>
                            <span className="text-[9px] font-black text-slate-300 uppercase">{new Date(notif.timestamp).toLocaleString('id-ID')}</span>
                         </div>
                         <h4 className="font-black text-slate-900 uppercase font-oswald italic text-lg leading-tight mb-2">{notif.title}</h4>
                         <p className="text-slate-500 text-sm font-medium leading-relaxed">"{notif.message}"</p>
                      </div>
                    ))
                   )
                )}

                {inboxTab === 'COMPOSE' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4">
                     <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Subjek Masalah / Aspirasi</label>
                           <input 
                            type="text" 
                            placeholder="Contoh: Kendala Penarikan Dana Gateway" 
                            value={msgTitle}
                            onChange={e => setMsgTitle(e.target.value)}
                            className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:border-blue-600 transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pesan Detail Untuk Master Admin</label>
                           <textarea 
                            placeholder="Tulis kendala Anda secara lengkap di sini..." 
                            value={msgContent}
                            onChange={e => setMsgContent(e.target.value)}
                            className="w-full h-40 p-4 bg-slate-50 border rounded-2xl font-medium text-sm outline-none focus:border-blue-600 transition-all resize-none"
                           />
                        </div>
                        <button 
                          disabled={!msgTitle || !msgContent}
                          onClick={handleSendToMaster}
                          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
                        >
                           Kirim Ke Pusat <Send className="w-4 h-4 text-arcus-red" />
                        </button>
                     </div>
                  </div>
                )}
             </div>
             
             <div className="p-6 bg-white border-t text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Respons Master Admin akan muncul di Tab Inbox.</p>
             </div>
          </div>
        </div>
      )}

      {/* Special Master Control Entry for Super Admin */}
      {isSuperAdmin && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <button 
            onClick={onGoToSuperAdmin}
            className="w-full bg-slate-900 border-2 border-arcus-red/50 p-8 rounded-[2.5rem] text-white flex items-center justify-between hover:bg-black transition-all group shadow-2xl shadow-arcus-red/10"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-arcus-red/20 rounded-[1.5rem] flex items-center justify-center text-arcus-red group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black font-oswald uppercase italic leading-none group-hover:text-arcus-red transition-colors">Buka Master Control</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Akses penuh manajemen platform & komunikasi pusat</p>
              </div>
            </div>
            <ChevronRight className="w-8 h-8 text-slate-700 group-hover:text-white transition-all group-hover:translate-x-2" />
          </button>
        </div>
      )}

      {/* Financial Section - Billing Platform */}
      {unpaidEvents.length > 0 && (
        <div className="bg-orange-50 p-8 rounded-[3rem] border border-orange-100 space-y-6 shadow-sm">
           <div className="flex items-center gap-4">
              <div className="bg-orange-500 p-3 rounded-2xl text-white shadow-lg">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black font-oswald uppercase italic text-orange-900">Tagihan Platform Pending</h3>
                <p className="text-xs text-orange-700 font-bold uppercase tracking-widest mt-0.5">Selesaikan administrasi untuk fitur penuh</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unpaidEvents.map(event => {
                const totalFee = event.archers.reduce((acc, a) => acc + (a.platformFee || 0), 0);
                return (
                  <div key={event.id} className="bg-white p-6 rounded-[2rem] border border-orange-200 shadow-sm flex flex-col justify-between gap-4 group hover:border-orange-500 transition-all">
                     <div>
                       <h4 className="font-black text-slate-900 uppercase font-oswald italic truncate leading-none mb-2">{event.settings.tournamentName}</h4>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.archers.length} Archer Terdaftar</p>
                     </div>
                     <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                        <div className="text-orange-600 font-black font-oswald text-xl leading-none">Rp {totalFee.toLocaleString()}</div>
                        <button 
                          onClick={() => {
                            setSelectedInvoiceEvent(event);
                            setBillingStep('INVOICE');
                          }}
                          className="px-6 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-95 transition-all"
                        >
                          Bayar Sekarang
                        </button>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {/* Creation & Billing Modals */}
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start mb-6 md:mb-8">
        <button 
          onClick={() => setActiveTab('DASHBOARD')}
          className={`px-6 md:px-8 py-2 md:py-2.5 rounded-md md:rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'DASHBOARD' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('EVENTS')}
          className={`px-6 md:px-8 py-2 md:py-2.5 rounded-md md:rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'EVENTS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Trophy className="w-3.5 h-3.5" /> Daftar Event
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari turnamen, latihan, atau lokasi..." 
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-arcus-red transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  Semua Tipe
                </button>
                <button 
                  onClick={() => setTypeFilter('TOURNAMENT')}
                  className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${typeFilter === 'TOURNAMENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  Turnamen
                </button>
                <button 
                  onClick={() => setTypeFilter('PRACTICE')}
                  className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${typeFilter === 'PRACTICE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  Latihan
                </button>
             </div>

             <div className="relative group">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="appearance-none pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest outline-none focus:border-arcus-red transition-all shadow-sm"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="DRAFT">Draf</option>
                  <option value="UPCOMING">Mendatang</option>
                  <option value="ACTIVE">Aktif (Reg)</option>
                  <option value="ONGOING">Sedang Jalan</option>
                  <option value="COMPLETED">Selesai</option>
                </select>
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Layout className="w-3.5 h-3.5" />
                </div>
             </div>

             <div className="relative group">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest outline-none focus:border-blue-600 transition-all shadow-sm"
                >
                  <option value="NEWEST">Terbaru</option>
                  <option value="OLDEST">Terlama</option>
                  <option value="NAME_ASC">Nama A-Z</option>
                </select>
                <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Layout className="w-3.5 h-3.5" />
                </div>
             </div>

             <div className="relative group">
                <select 
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                  className="appearance-none pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest outline-none focus:border-emerald-600 transition-all shadow-sm"
                >
                  <option value="ALL">Semua Biaya</option>
                  <option value="PAID">Lunas Admin</option>
                  <option value="UNPAID">Pending Admin</option>
                </select>
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Layout className="w-3.5 h-3.5" />
                </div>
             </div>
          </div>
        </div>

        {/* Quick Filter Indicators */}
        {(eventSearch || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-2">Filter Aktif:</span>
            {eventSearch && (
              <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black flex items-center gap-2">
                "{eventSearch}" <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setEventSearch('')} />
              </span>
            )}
            {typeFilter !== 'ALL' && (
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[8px] font-black flex items-center gap-2">
                {typeFilter} <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setTypeFilter('ALL')} />
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="bg-arcus-red text-white px-3 py-1 rounded-full text-[8px] font-black flex items-center gap-2">
                STATUS: {statusFilter} <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setStatusFilter('ALL')} />
              </span>
            )}
            {paymentStatusFilter !== 'ALL' && (
              <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[8px] font-black flex items-center gap-2">
                BIAYA: {paymentStatusFilter} <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setPaymentStatusFilter('ALL')} />
              </span>
            )}
            <button 
              onClick={() => { setEventSearch(''); setTypeFilter('ALL'); setStatusFilter('ALL'); setSortBy('NEWEST'); setPaymentStatusFilter('ALL'); }}
              className="text-[8px] font-black text-arcus-red uppercase tracking-widest hover:underline ml-auto"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      {activeTab === 'DASHBOARD' ? (
        <AdminDashboard 
          user={{ id: userId, name: userName || '', email: '', isOrganizer: true, role: userRole }}
          events={events}
          onManageEvent={onManageEvent}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 border-l-4 border-arcus-red mb-2">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 italic font-oswald uppercase tracking-tighter">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Event & Sesi Aktif
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari event..." 
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-arcus-red transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 divide-y divide-slate-100 bg-white border-y border-slate-100">
            {filteredEvents.length === 0 ? (
              <div className="py-12 bg-white rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-3">
                <Layout className="w-12 h-12 opacity-10" />
                <p className="font-medium italic text-xs">
                  {eventSearch ? 'Tidak ada event yang cocok' : 'Anda belum memiliki event yang dikelola.'}
                </p>
              </div>
            ) : (
              filteredEvents.map(event => {
                const expiration = getExpirationStatus(event);
                return (
                  <div key={event.id} className={`p-4 md:px-8 md:py-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-8 hover:bg-slate-50 transition-all group relative overflow-hidden ${deletingId === event.id ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-4 md:gap-8 relative z-10 min-w-0">
                      <div className={`w-10 h-10 md:w-14 md:h-14 shrink-0 rounded-lg flex items-center justify-center font-black font-oswald text-base md:text-xl transition-all duration-500 ${event.settings.isPractice ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-300 group-hover:bg-red-50 group-hover:text-arcus-red'}`}>
                        {event.settings.isPractice ? <Target className="w-5 h-5 md:w-7 md:h-7" /> : event.settings.tournamentName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1 md:space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                          <h4 className="text-lg md:text-2xl font-black text-slate-900 uppercase font-oswald truncate italic leading-none tracking-tighter">{event.settings.tournamentName}</h4>
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                             {event.settings.isPractice && (
                               <span className="bg-teal-50 text-teal-700 text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-teal-100">Latihan</span>
                             )}
                             {event.status === 'DRAFT' && (
                               <span className="bg-amber-50 text-amber-700 text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-amber-100">DRAFT</span>
                             )}
                             {event.status === 'ACTIVE' && (
                               <span className="bg-arcus-red text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-widest">LIVE NOW</span>
                             )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <Users className={`w-4 h-4 ${event.settings.isPractice ? 'text-teal-500' : 'text-arcus-red'}`} />
                            {event.archers.length} Archer <span className="hidden sm:inline">Terdaftar</span>
                          </div>
                          {event.settings.location && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              <MapPin className="w-4 h-4 text-blue-500" />
                              <span className="truncate max-w-[120px]">{event.settings.location}</span>
                            </div>
                          )}
                          {event.settings.eventDate && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              <Calendar className="w-4 h-4 text-emerald-500" />
                              <span>{new Date(event.settings.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            </div>
                          )}
                          {!event.settings.isPractice && (
                            <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${event.settings.platformFeePaidToOwner ? 'text-emerald-500' : 'text-orange-500'}`}>
                              {event.settings.platformFeePaidToOwner ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              Admin: {event.settings.platformFeePaidToOwner ? 'CLEAR' : 'WAITING'}
                            </div>
                          )}
                          {expiration?.isUrgent && (
                             <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-red-100 font-black text-[9px] uppercase tracking-widest animate-pulse">
                               <AlertTriangle className="w-3.5 h-3.5" /> {expiration.message}
                             </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full md:w-auto relative z-10">
                      <div className="grid grid-cols-2 sm:flex gap-3 w-full">
                        <button 
                          onClick={(e) => handleDelete(e, event.id, event.settings.tournamentName, event.settings.isPractice)}
                          className="p-4 sm:p-5 rounded-2xl bg-slate-50 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
                          title="Hapus"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => onShare(event.id, event.settings.tournamentName)} 
                          className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                          title="Share"
                        >
                          <Share2 className="w-5 h-5" />
                          <span className="sm:hidden lg:inline">Share</span>
                        </button>
                        <button onClick={() => onViewLive(event.id)} className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all active:scale-95">
                          <Monitor className="w-5 h-5 text-slate-400" />
                          <span className="sm:hidden lg:inline">Live Board</span>
                        </button>
                        {event.status === 'DRAFT' ? (
                          <button 
                            onClick={() => onActivateEvent?.(event.id)} 
                            className="col-span-2 px-10 py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95"
                          >
                            <ShieldCheck className="w-5 h-5" /> AKTIVASI
                          </button>
                        ) : (
                          <button onClick={() => onManageEvent(event.id)} className={`col-span-2 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 ${event.settings.isPractice ? 'bg-teal-900 text-white hover:bg-black' : 'bg-slate-900 text-white hover:bg-arcus-red'}`}>
                            <Settings className={`w-5 h-5 ${event.settings.isPractice ? 'text-teal-400' : 'text-arcus-red'}`} /> 
                            {event.settings.isPractice ? 'KONTROL' : 'KELOLA'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 opacity-0 group-hover:opacity-100 -mr-24 -mt-24 rounded-full transition-opacity pointer-events-none" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      
      {/* Creation & Billing Modals */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-10 text-center space-y-8 border-4 border-red-50">
              <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center text-red-600 mx-auto animate-bounce">
                <Trash2 className="w-10 h-10" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black font-oswald uppercase italic text-slate-900 leading-none">Hapus Permanen?</h3>
                <p className="text-slate-500 font-medium italic text-sm leading-relaxed">
                  Anda akan menghapus {confirmDelete.isPractice ? 'latihan' : 'turnamen'} <br/>
                  <strong className="text-slate-900 not-italic">"{confirmDelete.name}"</strong> <br/>
                  Seluruh data peserta & skor akan hilang selamanya.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setConfirmDelete(null)} 
                  className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={executeDelete} 
                  className="flex-[2] py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all"
                >
                  Ya, Hapus Sekarang
                </button>
              </div>
           </div>
        </div>
      )}

      {step !== 'LIST' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Agreement Step */}
            {step === 'AGREEMENT' && (
              <div className="p-10 space-y-8">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-arcus-red mx-auto shadow-inner">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black font-oswald uppercase italic">Kebijakan Platform</h3>
                  <p className="text-slate-400 font-medium italic">Harap baca ketentuan biaya sistem ARCUS</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold mt-1">1</div>
                    <p className="text-xs text-slate-600 leading-relaxed">Penyelenggara menyetujui biaya platform sebesar <strong>Rp {globalSettings.feeAdult.toLocaleString()}</strong> (Dewasa) dan <strong>Rp {globalSettings.feeKids.toLocaleString()}</strong> (Anak) per-archer terdaftar.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold mt-1">2</div>
                    <p className="text-xs text-slate-600 leading-relaxed">Tagihan disetorkan kepada pemilik platform setelah pendaftaran ditutup atau saat penarikan dana jika menggunakan gateway.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={handleCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Batal</button>
                  <button onClick={() => setStep('NAME_INPUT')} className="flex-[2] py-4 bg-arcus-red text-white rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all">SETUJU</button>
                </div>
              </div>
            )}

            {/* Name Input Step (Tournament) */}
            {step === 'NAME_INPUT' && (
              <div className="p-10 space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black font-oswald uppercase italic">Nama Turnamen</h3>
                  <p className="text-slate-400 font-medium italic">Berikan nama resmi untuk event Anda</p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Nama Event</label>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Contoh: ARCHERY OPEN 2024" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-xl font-black font-oswald italic uppercase outline-none focus:border-arcus-red transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Keterangan Singkat</label>
                    <textarea 
                      placeholder="Tulis deskripsi singkat tentang turnamen ini..." 
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold outline-none focus:border-arcus-red transition-all h-32 resize-none"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${isFree ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Event Internal / Free</span>
                      </div>
                      {isSuperAdmin && (
                        <button 
                          onClick={() => setIsFree(!isFree)}
                          className={`w-12 h-6 rounded-full transition-all relative ${isFree ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isFree ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      )}
                    </div>

                    {!isFree && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Kode Promo (Opsional)</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Masukkan kode..." 
                            value={promoCode}
                            onChange={e => {
                              const val = e.target.value.toUpperCase();
                              setPromoCode(val);
                              if (val === 'INTERNAL2024') {
                                setIsFree(true);
                              } else if (!isSuperAdmin) {
                                setIsFree(false);
                              }
                            }}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold uppercase outline-none focus:border-emerald-500 transition-all"
                          />
                          {isFree && promoCode === 'INTERNAL2024' && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase">Aktif</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isFree && (
                      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <p className="text-[10px] text-emerald-700 font-bold uppercase leading-relaxed">
                          Event ini ditandai sebagai internal. Biaya platform ditiadakan.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep('AGREEMENT')} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Kembali</button>
                  <button 
                    disabled={!name.trim()}
                    onClick={() => setStep('FINAL_CONFIRM')} 
                    className="flex-[2] py-4 bg-arcus-red text-white rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all disabled:opacity-50"
                  >
                    Konfirmasi Nama <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Final Confirmation (Tournament) */}
            {step === 'FINAL_CONFIRM' && (
              <div className="p-10 space-y-8">
                <div className="w-20 h-20 bg-green-50 rounded-[2rem] flex items-center justify-center text-green-600 mx-auto shadow-xl">
                  <Trophy className="w-10 h-10" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black font-oswald uppercase italic">Siap Meluncur?</h3>
                  <p className="text-slate-400 font-medium px-4">Event <strong>"{name}"</strong> akan segera dibuat. Anda dapat mengatur kategori dan bantalan setelah ini.</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep('NAME_INPUT')} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Cek Lagi</button>
                  <button onClick={handleFinalize} className="flex-[2] py-4 bg-arcus-dark text-white rounded-2xl font-black uppercase text-[10px] shadow-2xl active:scale-95 transition-all">Buat Turnamen Sekarang!</button>
                </div>
              </div>
            )}

            {/* Self Practice Mode Input */}
            {step === 'SELF_PRACTICE_INPUT' && (
              <div className="p-10 space-y-8">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto shadow-inner">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black font-oswald uppercase italic text-emerald-900 leading-none">Latihan Mandiri</h3>
                  <p className="text-slate-400 font-medium italic">Fokus pada performa & grafik kemajuan</p>
                </div>
                <div className="space-y-4">
                   <input 
                    autoFocus
                    type="text" 
                    placeholder="Nama Sesi Latihan..." 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-6 bg-slate-50 border-2 border-emerald-100 rounded-3xl text-xl font-black font-oswald italic uppercase outline-none focus:border-emerald-500 transition-all text-emerald-900"
                  />
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                     <BarChart2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                     <p className="text-[10px] text-emerald-700 font-bold leading-relaxed uppercase">Mode mandiri akan menampilkan grafik performa dan statistik detail untuk Anda sendiri.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End</label>
                       <input 
                        type="number" 
                        value={practiceEnds}
                        onChange={e => setPracticeEnds(parseInt(e.target.value) || 1)}
                        className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:border-emerald-600 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Arrow</label>
                       <input 
                        type="number" 
                        value={practiceArrows}
                        onChange={e => setPracticeArrows(parseInt(e.target.value) || 1)}
                        className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:border-emerald-600 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Jarak (m)</label>
                       <input 
                        type="number" 
                        value={practiceDistance}
                        onChange={e => setPracticeDistance(parseInt(e.target.value) || 1)}
                        className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:border-emerald-600 transition-all"
                       />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Model Face Target</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setPracticeTargetType(TargetType.STANDARD)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${practiceTargetType === TargetType.STANDARD ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100'}`}
                      >
                        <Target className={`w-6 h-6 ${practiceTargetType === TargetType.STANDARD ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className={`text-[9px] font-black uppercase ${practiceTargetType === TargetType.STANDARD ? 'text-emerald-900' : 'text-slate-400'}`}>Standard 6-Ring</span>
                      </button>
                      <button 
                        onClick={() => setPracticeTargetType(TargetType.PUTA)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${practiceTargetType === TargetType.PUTA ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100'}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center ${practiceTargetType === TargetType.PUTA ? 'border-emerald-600' : 'border-slate-200'}`}>
                          <div className={`w-2 h-2 rounded-full ${practiceTargetType === TargetType.PUTA ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                        </div>
                        <span className={`text-[9px] font-black uppercase ${practiceTargetType === TargetType.PUTA ? 'text-emerald-900' : 'text-slate-400'}`}>Puta 2-Ring</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={handleCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Batal</button>
                  <button 
                    disabled={!name.trim()}
                    onClick={handleFinalizeSelfPractice} 
                    className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all disabled:opacity-50"
                  >
                    Mulai Latihan <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Practice Mode Input */}
            {step === 'PRACTICE_INPUT' && (
              <div className="p-10 space-y-8">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mx-auto shadow-inner">
                  <Target className="w-8 h-8" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black font-oswald uppercase italic text-teal-900 leading-none">Latihan Baru</h3>
                  <p className="text-slate-400 font-medium italic">Scoring cepat tanpa pendaftaran</p>
                </div>
                <div className="space-y-6">
                   <input 
                    autoFocus
                    type="text" 
                    placeholder="Nama Sesi Latihan..." 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-6 bg-slate-50 border-2 border-teal-100 rounded-3xl text-xl font-black font-oswald italic uppercase outline-none focus:border-teal-500 transition-all text-teal-900"
                  />
                  
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${isFree ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Free Platform Fee</span>
                      </div>
                      {isSuperAdmin && (
                        <button 
                          onClick={() => setIsFree(!isFree)}
                          className={`w-12 h-6 rounded-full transition-all relative ${isFree ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isFree ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      )}
                    </div>

                    {!isFree && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Kode Promo (Opsional)</label>
                        <input 
                          type="text" 
                          placeholder="Masukkan kode..." 
                          value={promoCode}
                          onChange={e => {
                            const val = e.target.value.toUpperCase();
                            setPromoCode(val);
                            if (val === 'INTERNAL2024') {
                              setIsFree(true);
                            } else if (!isSuperAdmin) {
                              setIsFree(false);
                            }
                          }}
                          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold uppercase outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 flex items-start gap-3">
                     <Zap className="w-4 h-4 text-teal-600 mt-0.5" />
                     <p className="text-[10px] text-teal-700 font-bold leading-relaxed uppercase">Mode latihan gratis & tidak dipungut biaya platform. Maksimal 20 peserta.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={handleCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Batal</button>
                  <button 
                    disabled={!name.trim()}
                    onClick={handleFinalizePractice} 
                    className="flex-[2] py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all disabled:opacity-50"
                  >
                    Mulai Scoring <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              </div>
            )}
           </div>
        </div>
      )}

      {/* Billing Modal */}
      {selectedInvoiceEvent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {billingStep === 'INVOICE' && (
              <div className="p-10 space-y-8">
                 <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-3xl font-black font-oswald uppercase italic leading-none">Invoice Platform</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ARCUS BILLING SYSTEM</p>
                    </div>
                    <button onClick={resetBilling} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-300" /></button>
                 </div>
                 
                 <div className="bg-slate-50 p-6 rounded-[2rem] border space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-500">
                       <span>Total Archer</span>
                       <span className="text-slate-900">{selectedInvoiceEvent?.archers.length || 0} Peserta</span>
                    </div>
                    <div className="border-t border-slate-200 pt-4 space-y-2">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-400">Total Platform Fee</span>
                          <span className="font-black text-slate-900">Rp {selectedInvoiceEvent?.archers.reduce((acc, a) => acc + (a.platformFee || 0), 0).toLocaleString() || 0}</span>
                       </div>
                    </div>
                 </div>

                 <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Total Tagihan</p>
                       <p className="text-3xl font-black font-oswald text-orange-600 italic leading-none mt-1">Rp {selectedInvoiceEvent?.archers.reduce((acc, a) => acc + (a.platformFee || 0), 0).toLocaleString() || 0}</p>
                    </div>
                    <Landmark className="w-10 h-10 text-orange-200" />
                 </div>

                 <button 
                  onClick={() => setBillingStep('PAYMENT_SELECTION')}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all"
                 >
                   Pilih Metode Pembayaran
                 </button>
              </div>
            )}

            {billingStep === 'PAYMENT_SELECTION' && (
              <div className="p-10 space-y-8">
                 <div className="flex items-center gap-4">
                    <button onClick={() => setBillingStep('INVOICE')} className="p-2 bg-slate-50 rounded-xl"><X className="w-5 h-5 rotate-90 text-slate-400" /></button>
                    <h3 className="text-2xl font-black font-oswald uppercase italic">Metode Pembayaran</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => { setPaymentMode('GATEWAY'); handlePayPlatformFee(); }}
                      className="p-6 bg-white border-2 border-slate-100 rounded-3xl flex items-center justify-between hover:border-blue-600 transition-all text-left"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Zap className="w-6 h-6" /></div>
                          <div>
                             <p className="font-black text-sm uppercase">Instant QRIS / VA</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Otomatis Terverifikasi</p>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                    
                    <button 
                      onClick={() => setPaymentMode('MANUAL')}
                      className="p-6 bg-white border-2 border-slate-100 rounded-3xl flex items-center justify-between hover:border-slate-900 transition-all text-left"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><Landmark className="w-6 h-6" /></div>
                          <div>
                             <p className="font-black text-sm uppercase">Transfer Manual</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Hubungi Support ARCUS</p>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                 </div>
              </div>
            )}

            {billingStep === 'GATEWAY_PROCESS' && (
              <div className="p-10 space-y-8">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-slate-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-10 h-10 text-blue-600" />
                    </div>
                    <svg className="absolute inset-0 w-24 h-24 -rotate-90">
                      <circle 
                        cx="48" cy="48" r="44" 
                        fill="none" stroke="currentColor" 
                        strokeWidth="4" 
                        className="text-blue-600 transition-all duration-300"
                        strokeDasharray={276}
                        strokeDashoffset={276 - (276 * simulationProgress / 100)}
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black font-oswald uppercase italic">Menghubungkan Gateway</h3>
                  <p className="text-slate-400 font-medium italic text-sm">Mohon tunggu, sedang memproses pembayaran aman...</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Status</span>
                      <span className="text-blue-600">Enkripsi SSL Aktif</span>
                   </div>
                   <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${simulationProgress}%` }}></div>
                   </div>
                   <div className="flex items-center gap-3 justify-center text-[10px] font-bold text-slate-500">
                      <Shield className="w-3 h-3" /> Terproteksi oleh Arcus Secure Gateway
                   </div>
                </div>
                <div className="flex justify-center gap-4">
                   <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Logo_dana_blue.svg/1200px-Logo_dana_blue.svg.png" alt="DANA" className="h-4 opacity-50 grayscale" referrerPolicy="no-referrer" />
                   <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_ovo_purple.svg/1200px-Logo_ovo_purple.svg.png" alt="OVO" className="h-4 opacity-50 grayscale" referrerPolicy="no-referrer" />
                   <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/1200px-Gopay_logo.svg.png" alt="GOPAY" className="h-4 opacity-50 grayscale" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}

            {billingStep === 'SUCCESS' && (
              <div className="p-16 text-center space-y-10">
                 <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-green-200 ring-8 ring-green-50">
                    <CheckCircle2 className="w-12 h-12" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-4xl font-black font-oswald uppercase italic leading-none">LUNAS!</h3>
                    <p className="text-slate-400 text-sm font-medium italic">Tagihan platform Anda telah diverifikasi otomatis.</p>
                 </div>
                 <button onClick={resetBilling} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Kembali ke Dashboard</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDashboard;
