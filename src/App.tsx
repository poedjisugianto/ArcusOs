import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Bell, BellRing, ArrowLeft, LogIn, Database, Gavel, Wifi, WifiOff,
  Users as UsersIcon, Monitor, Plus, Clock, X, CreditCard, ChevronLeft, GitBranch, 
  ShieldCheck, Settings as SettingsIcon, User as UserIcon, List, Info, CloudOff,
  FileText, Activity, Trophy, Download, Target, Swords, Share2, Check, ShieldAlert,
  RefreshCw, Sparkles, DollarSign, FileDown, Cloud, Zap, LayoutDashboard
} from 'lucide-react';
import { AppState, ArcheryEvent, CategoryType, User, Archer, GlobalSettings, AppNotification, ScoreEntry, ParticipantRegistration, Match, ScoreLog, DisbursementRequest, TargetType, UserRole } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEY, APP_VERSION } from './constants';
import { supabase } from './supabase';
import ArcusLogo from './components/ArcusLogo';
import AdminPanel from './components/AdminPanel';
import ScoringPanel from './components/ScoringPanel';
import LiveScoreboard from './components/LiveScoreboard';
import ArcherList from './components/ArcherList';
import LandingPage from './components/LandingPage';
import MemberDashboard from './components/MemberDashboard';
import LoginPanel from './components/LoginPanel';
import OnlineRegistration from './components/OnlineRegistration';
import FinancePanel from './components/FinancePanel';
import ProfilePanel from './components/ProfilePanel';
import EntryList from './components/EntryList';
import EventInfo from './components/EventInfo';
import ResultsPanel from './components/ResultsPanel';
import LegalDoc from './components/LegalDoc';
import ShareModal from './components/ShareModal';
import EliminationPanel from './components/EliminationPanel';
import SuperAdminPanel from './components/SuperAdminPanel';
import SelfPracticePanel from './components/SelfPracticePanel';
import OperatorCenter from './components/OperatorCenter';
import QuickScoringPanel from './components/QuickScoringPanel';
import ScorerLogin from './components/ScorerLogin';
import ActivateTournament from './components/ActivateTournament';
import OfficialList from './components/OfficialList';

type View = 'LANDING' | 'LOGIN' | 'REGISTER' | 'MEMBER_DASHBOARD' | 'PROFILE' | 'EVENT_ADMIN' | 'SETTINGS' | 'REGISTER_PARTICIPANT' | 'SCORING' | 'QUICK_SCORING' | 'LIVE' | 'ARCHERS' | 'OFFICIALS' | 'FINANCE' | 'SUPER_ADMIN' | 'OPERATOR_CENTER' | 'JUDGE_PANEL' | 'ELIMINATION' | 'PUBLIC_LIVE' | 'PUBLIC_ENTRY_LIST' | 'PUBLIC_EVENT_INFO' | 'RESULTS' | 'DOCUMENTATION' | 'PRIVACY' | 'TERMS' | 'SELF_PRACTICE' | 'SCORER_LOGIN' | 'ACTIVATE_TOURNAMENT';

import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';

export function App() {
  const [view, setView] = useState<View>('LANDING');
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [shareData, setShareData] = useState<{ isOpen: boolean; name: string; url: string }>({ isOpen: false, name: '', url: '' });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(new Set());

  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initialSettings: GlobalSettings = {
      feeAdult: 10000, feeKids: 5000, maintenanceMode: false,
      contactSupport: '08123456789', bankProvider: 'BCA',
      bankAccountNumber: '0987654321', bankAccountName: 'ADMIN ARCUS CENTRAL',
      dataRetentionDays: 90, practiceRetentionDays: 7,
      paymentGatewayProvider: 'NONE',
      paymentGatewayIsProduction: false,
      platformFeePercentage: 3
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, globalSettings: parsed.globalSettings || initialSettings, notifications: parsed.notifications || [] };
      } catch (e) { console.error("Parse failed", e); }
    }
    
    return {
      events: [],
      users: [{ id: 'owner_1', email: 'admin@arcus.id', name: 'Master Admin', password: 'admin', isOrganizer: true, isSuperAdmin: true, isVerified: true }],
      currentUser: null, activeEventId: null, globalSettings: initialSettings, notifications: []
    };
  });

  const pushNotification = (title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' = 'INFO') => {
    const newNotif: AppNotification = {
      id: 'ntf_' + Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false
    };
    setAppState(prev => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications].slice(0, 50)
    }));
  };

  const fetchCloudData = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const { data: configData } = await supabase.from('system_configs').select('data').eq('id', 'global').single();
      
      let eventsQuery = supabase.from('events').select('data');
      // If not logged in or is super admin, fetch all events. 
      // Otherwise (regular organizer), fetch only their events for the dashboard.
      // NOTE: For landing page, we might want ALL events even for organizers.
      // For now, let's fetch all if guest/superadmin, and user-specific if organizer.
      if (appState.currentUser && !appState.currentUser.isSuperAdmin) {
        eventsQuery = eventsQuery.eq('user_id', appState.currentUser.id);
      }
      
      const { data: eventsData } = await eventsQuery;
      const { data: profilesData } = await supabase.from('profiles').select('data');

      setAppState(prev => {
        const cloudUsers = profilesData ? profilesData.map(p => p.data) : [];
        const finalUsers = cloudUsers.length > 0 ? cloudUsers : prev.users;
        
        const cloudEvents = eventsData ? eventsData.map(e => e.data as ArcheryEvent) : [];
        
        // Filter out events that are currently being deleted locally
        const filteredCloudEvents = cloudEvents.filter(ce => !deletedEventIds.has(ce.id));
        
        // SMART MERGE: Don't just overwrite, merge local changes that haven't synced yet
        const mergedEvents = prev.events.map(localEvent => {
          const cloudEvent = filteredCloudEvents.find(ce => ce.id === localEvent.id);
          if (!cloudEvent) return localEvent;
          
          // Merge archers: Keep all from cloud, add local ones that are missing in cloud
          const mergedArchers = [...cloudEvent.archers];
          localEvent.archers.forEach(la => {
            if (!mergedArchers.some(ca => ca.id === la.id)) {
              mergedArchers.push(la);
            }
          });
          
          // Merge registrations
          const mergedRegs = [...cloudEvent.registrations];
          localEvent.registrations.forEach(lr => {
            if (!mergedRegs.some(cr => cr.id === lr.id)) {
              mergedRegs.push(lr);
            }
          });
          
          return {
            ...cloudEvent,
            archers: mergedArchers,
            registrations: mergedRegs,
            // Keep local scores if cloud is empty (prevent race condition during registration)
            scores: cloudEvent.scores.length > 0 ? cloudEvent.scores : localEvent.scores,
            scoreLogs: cloudEvent.scoreLogs.length > 0 ? cloudEvent.scoreLogs : localEvent.scoreLogs
          };
        });
        
        // Add cloud events that aren't in local state
        filteredCloudEvents.forEach(ce => {
          if (!mergedEvents.some(me => me.id === ce.id)) {
            mergedEvents.push(ce);
          }
        });
        
        return {
          ...prev,
          globalSettings: configData ? { ...prev.globalSettings, ...configData.data } : prev.globalSettings,
          events: mergedEvents,
          users: finalUsers
        };
      });
      setLastSync(new Date());
      if (appState.currentUser) {
        pushNotification("Data Sinkron", "Data terbaru telah dimuat dari cloud.", "SUCCESS");
      }
    } catch (err) { 
      console.error("Fetch error", err);
      if (appState.currentUser) {
        pushNotification("Gagal Sinkron", "Gagal memuat data terbaru dari cloud.", "WARNING");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchCloudData();
  }, [appState.currentUser?.id]);

  // Handle URL Parameters for Sharing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    const viewParam = params.get('view');

    if (eventId && appState.events.length > 0) {
      const eventExists = appState.events.some(e => e.id === eventId);
      if (eventExists) {
        setAppState(prev => ({ ...prev, activeEventId: eventId }));
        
        if (viewParam === 'live') {
          setView('PUBLIC_LIVE');
        } else if (viewParam === 'entry-list') {
          setView('PUBLIC_ENTRY_LIST');
        } else {
          setView('PUBLIC_EVENT_INFO');
        }
        
        // Clear URL params to avoid re-triggering
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [appState.events.length]);

  // Multi-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          setAppState(newState);
        } catch (err) {
          console.error("Failed to sync from storage event", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    setHasPendingChanges(true);
  }, [appState.events, appState.globalSettings, appState.currentUser]);

  useEffect(() => {
    const syncToCloud = async () => {
      if (!supabase || !isOnline || !hasPendingChanges) return;
      
      setIsSyncing(true);
      try {
        // 1. Sync User Profile (Only if logged in)
        if (appState.currentUser) {
          if (appState.currentUser.isSuperAdmin) {
            await supabase.from('system_configs').upsert({ id: 'global', data: appState.globalSettings, updated_at: new Date() });
          }
          await supabase.from('profiles').upsert({ id: appState.currentUser.id, data: appState.currentUser, updated_at: new Date() });
        }
        
        // 2. Sync Events
        let eventsToSync: ArcheryEvent[] = [];
        if (appState.currentUser) {
          eventsToSync = appState.events.filter(e => 
            (e.settings.organizerId === appState.currentUser?.id || appState.currentUser?.isSuperAdmin) &&
            !e.settings.isPractice && 
            !e.settings.isSelfPractice
          );
        } else if (appState.activeEventId) {
          const activeEvent = appState.events.find(e => e.id === appState.activeEventId);
          if (activeEvent && !activeEvent.settings.isPractice && !activeEvent.settings.isSelfPractice) {
            eventsToSync = [activeEvent];
          }
        }
        
        for (const event of eventsToSync) {
          await supabase.from('events').upsert({ 
            id: event.id, 
            user_id: event.settings.organizerId, 
            data: event, 
            updated_at: new Date() 
          });
        }
        
        setLastSync(new Date());
        setHasPendingChanges(false);
      } catch (err) { 
        console.error("Sync error", err); 
      } finally {
        setIsSyncing(false);
      }
    };
    
    const debounce = setTimeout(syncToCloud, 3000); // 3s for batching
    return () => clearTimeout(debounce);
  }, [appState.events, appState.globalSettings, appState.currentUser, isOnline, hasPendingChanges]);

  const activeEvent = appState.events.find(e => e.id === appState.activeEventId);

  useEffect(() => {
    if (activeEvent?.status === 'DRAFT' && view.startsWith('PUBLIC_')) {
      setView('LANDING');
      pushNotification("Turnamen Belum Aktif", "Turnamen ini masih dalam status draf dan belum diaktifkan oleh penyelenggara.", "WARNING");
    }
  }, [activeEvent, view]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleUpdate = () => setUpdateAvailable(true);
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('arcusUpdateAvailable', handleUpdate);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('arcusUpdateAvailable', handleUpdate);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setAppState(prev => ({ ...prev, currentUser: null, activeEventId: null }));
    setView('LANDING');
  };

  const handleUpdateEvent = (id: string, updated: Partial<ArcheryEvent>) => {
     setAppState(prev => ({ ...prev, events: prev.events.map(e => e.id === id ? { ...e, ...updated } : e) }));
  };

  const handleDeleteEvent = async (id: string) => {
    if (!id) return;
    
    const eventToDelete = appState.events.find(e => e.id === id);
    if (!eventToDelete) {
      console.warn("Event not found for deletion:", id);
      return;
    }

    const typeLabel = eventToDelete.settings.isPractice ? "Latihan" : "Turnamen";
    const eventName = eventToDelete.settings.tournamentName;

    // Track as deleted to prevent fetchCloudData from restoring it
    setDeletedEventIds(prev => new Set(prev).add(id));

    // 1. Immediate Local Update (Optimistic)
    setAppState(prev => {
      const updatedEvents = prev.events.filter(e => e.id !== id);
      return { 
        ...prev, 
        events: updatedEvents,
        activeEventId: prev.activeEventId === id ? null : prev.activeEventId 
      };
    });
    
    // 2. Navigation
    const eventViews = ['EVENT_ADMIN', 'SETTINGS', 'ARCHERS', 'SCORING', 'OPERATOR_CENTER', 'ELIMINATION', 'RESULTS', 'FINANCE', 'LIVE'];
    if (eventViews.includes(view)) {
      setView('MEMBER_DASHBOARD');
    }

    pushNotification("Menghapus...", `Sedang menghapus ${typeLabel} "${eventName}"...`, "INFO");

    // 3. Cloud Sync (Supabase)
    if (supabase && !eventToDelete.settings.isPractice && !eventToDelete.settings.isSelfPractice) {
      try {
        const { error, status } = await supabase
          .from('events')
          .delete()
          .eq('id', id);

        if (error) {
          console.error("Supabase delete error:", error);
          pushNotification("Gagal Hapus Cloud", `Error: ${error.message} (Status: ${status}). Data lokal tetap dihapus.`, "WARNING");
        } else {
          console.log("Supabase delete success for ID:", id);
          pushNotification("Berhasil Dihapus", `${typeLabel} "${eventName}" telah dihapus secara permanen.`, "SUCCESS");
        }
      } catch (err: any) {
        console.error("Supabase delete exception:", err);
        pushNotification("Koneksi Bermasalah", `Gagal menghubungi server: ${err.message || 'Unknown error'}`, "WARNING");
      }
    } else {
      pushNotification("Berhasil Dihapus", `${typeLabel} "${eventName}" telah dihapus dari penyimpanan lokal.`, "SUCCESS");
    }
    
    // Cleanup deleted ID after some time (enough for cloud to settle)
    setTimeout(() => {
      setDeletedEventIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 10000);
  };

  const handleDeleteUser = async (userId: string) => {
    const user = appState.users.find(u => u.id === userId);
    if (!user) return;

    if (user.isSuperAdmin) {
      pushNotification("Aksi Ditolak", "Tidak dapat menghapus Super Admin.", "WARNING");
      return;
    }

    setAppState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));

    pushNotification("Menghapus User", `Menghapus akun ${user.name}...`, "INFO");

    if (supabase) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) {
          pushNotification("Gagal Hapus Cloud", error.message, "WARNING");
        } else {
          pushNotification("User Dihapus", `Akun ${user.name} telah dihapus permanen.`, "SUCCESS");
        }
      } catch (err: any) {
        pushNotification("Error", err.message, "WARNING");
      }
    }
  };

  const onCreateSelfPractice = (name: string, ends: number, arrows: number, targetType: TargetType, distance: number) => {
    const e: ArcheryEvent = { 
      id: 'evt_'+Math.random().toString(36).substr(2,9), 
      settings: { 
        ...DEFAULT_SETTINGS, 
        tournamentName: name, 
        organizerId: appState.currentUser?.id || '', 
        isPractice: true, 
        isSelfPractice: true,
        selfPracticeEnds: ends,
        selfPracticeArrows: arrows,
        selfPracticeTargetType: targetType,
        selfPracticeDistance: distance,
        createdAt: Date.now() 
      }, 
      archers: [{
        id: appState.currentUser!.id,
        name: appState.currentUser!.name,
        email: appState.currentUser!.email,
        club: appState.currentUser!.club || '-',
        category: CategoryType.ADULT_PUTRA, // Default
        phone: appState.currentUser!.phone || '-',
        status: 'APPROVED',
        targetNo: 1,
        position: 'A',
        wave: 1,
        pin: '0000',
        eventId: '', // Will be filled
        paymentType: 'MANUAL',
        platformFee: 0,
        totalPaid: 0,
        createdAt: Date.now()
      }], 
      scores: [], 
      scoreLogs: [], 
      matches: {} as any, 
      registrations: [], 
      disbursementRequests: [], 
      status: 'ONGOING' 
    };
    e.archers[0].eventId = e.id;
    
    setAppState(prev => ({ ...prev, events: [e, ...prev.events], activeEventId: e.id }));
    setView('SELF_PRACTICE');
    pushNotification("Latihan Mandiri", `Sesi "${name}" dimulai.`, "SUCCESS");
  };

  const onSaveScore = (score: ScoreEntry | ScoreEntry[], log?: ScoreLog | ScoreLog[]) => {
    if (!activeEvent) return;
    const scoresArray = Array.isArray(score) ? score : [score];
    const logsArray = Array.isArray(log) ? log : (log ? [log] : []);
    
    setAppState(prev => {
      const event = prev.events.find(e => e.id === activeEvent.id);
      if (!event) return prev;
      
      let newScores = [...event.scores];
      scoresArray.forEach(s => {
        newScores = newScores.filter(existing => !(
          existing.archerId === s.archerId && 
          existing.sessionId === s.sessionId && 
          existing.endIndex === s.endIndex
        ));
        newScores.push(s);
      });
      
      const newState = {
        ...prev,
        events: prev.events.map(e => e.id === event.id ? {
          ...e,
          scores: newScores,
          scoreLogs: [...logsArray, ...e.scoreLogs]
        } : e)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-arcus-red selection:text-white">
      {updateAvailable && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-slate-700">
            <div className="flex flex-col">
              <span className="text-[10px] font-black font-oswald uppercase italic tracking-widest text-arcus-red">Update Tersedia</span>
              <span className="text-xs font-bold">Versi baru ARCUS telah siap.</span>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-arcus-red text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      <main className="min-h-screen">
        {view === 'LANDING' && (
          <LandingPage 
            events={appState.events.filter(e => !e.settings.isPractice && e.status !== 'DRAFT')} 
            onViewLive={(id) => { setAppState(prev => ({ ...prev, activeEventId: id })); setView('PUBLIC_LIVE'); }} 
            onViewParticipants={(id) => { setAppState(prev => ({ ...prev, activeEventId: id })); setView('PUBLIC_ENTRY_LIST'); }} 
            onViewInfo={(id) => { setAppState(prev => ({ ...prev, activeEventId: id })); setView('PUBLIC_EVENT_INFO'); }} 
            onShare={(id) => {
              const event = appState.events.find(e => e.id === id);
              setShareData({ isOpen: true, name: event?.settings.tournamentName || 'Event', url: `${window.location.origin}?event=${id}` });
            }} 
            currentUser={appState.currentUser}
            onLogout={handleLogout}
            onLogin={() => setView('LOGIN')}
            onCreateEvent={() => {
              if (appState.currentUser) setView('MEMBER_DASHBOARD');
              else setView('REGISTER');
            }}
          />
        )}
        {view === 'SCORER_LOGIN' && (
          <ScorerLogin 
            events={appState.events} 
            onLogin={(event, scorer) => {
              setAppState(prev => ({ 
                ...prev, 
                activeEventId: event.id, 
                activeScorer: scorer,
                currentUser: {
                  id: scorer.id,
                  name: scorer.name,
                  email: 'scorer@field.arcus',
                  isOrganizer: false,
                  role: UserRole.SCORER
                }
              }));
              setView('EVENT_ADMIN');
              pushNotification("Login Scorer", `Selamat bertugas, ${scorer.name}!`, "SUCCESS");
            }}
            onBack={() => setView('LANDING')}
          />
        )}

        {(view === 'LOGIN' || view === 'REGISTER') && (
          <LoginPanel 
            users={appState.users} 
            initialMode={view === 'REGISTER' ? 'REGISTER' : 'LOGIN'}
            onLogin={(u) => { 
              setAppState(prev => {
                // Update local events that don't have an organizerId to the new user's ID
                const updatedEvents = prev.events.map(e => {
                  if (!e.settings.organizerId) {
                    return { ...e, settings: { ...e.settings, organizerId: u.id } };
                  }
                  return e;
                });
                return { ...prev, currentUser: u, events: updatedEvents };
              }); 
              setView('MEMBER_DASHBOARD'); 
            }} 
            onRegister={(u) => setAppState(prev => ({ ...prev, users: [...prev.users, u] }))} 
            onUpdateUser={(u) => setAppState(prev => ({ ...prev, users: prev.users.map(usr => usr.id === u.id ? u : usr) }))} 
            onBack={() => setView('LANDING')} 
          />
        )}
        {view === 'ACTIVATE_TOURNAMENT' && appState.activeEventId && (
          <ActivateTournament
            event={appState.events.find(e => e.id === appState.activeEventId)!}
            userEmail={appState.currentUser?.email || ''}
            onActivate={(code: string) => {
              const event = appState.events.find(e => e.id === appState.activeEventId);
              if (event && event.settings.activationCode === code) {
                setAppState(prev => ({
                  ...prev,
                  events: prev.events.map(e => 
                    e.id === appState.activeEventId 
                      ? { ...e, status: 'UPCOMING', settings: { ...e.settings, isActivated: true } } 
                      : e
                  )
                }));
                setView('EVENT_ADMIN');
                pushNotification("Aktivasi Berhasil", `Turnamen "${event.settings.tournamentName}" telah diaktifkan dan sekarang publik.`, "SUCCESS");
              } else {
                pushNotification("Kode Salah", "Kode aktivasi yang Anda masukkan tidak valid.", "WARNING");
              }
            }}
            onBack={() => setView('MEMBER_DASHBOARD')}
            onResend={async () => {
              const event = appState.events.find(e => e.id === appState.activeEventId);
              if (event) {
                try {
                  const response = await fetch('/api/send-email-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: appState.currentUser!.email,
                      subject: "Aktivasi Turnamen ARCUS (Kirim Ulang)",
                      message: `Halo ${appState.currentUser!.name},\n\nKode aktivasi untuk turnamen "${event.settings.tournamentName}" adalah: ${event.settings.activationCode}\n\nSilakan masukkan kode ini di dashboard untuk mengaktifkan turnamen Anda.`
                    })
                  });
                  const result = await response.json();
                  if (!response.ok || !result.success) {
                    throw new Error(result.message || "Gagal mengirim email");
                  }

                  if (result.isSimulated) {
                    pushNotification("Mode Simulasi", "Kode aktivasi (Simulasi): " + event.settings.activationCode, "SUCCESS");
                  } else {
                    pushNotification("Email Terkirim", "Kode aktivasi telah dikirim ulang ke email Anda.", "INFO");
                  }
                } catch (err) {
                  console.error("Failed to resend activation email", err);
                  pushNotification("Gagal Kirim Email", "Gagal mengirim ulang kode aktivasi.", "WARNING");
                }
              }
            }}
          />
        )}

        {view === 'MEMBER_DASHBOARD' && appState.currentUser && (
          <MemberDashboard 
            userName={appState.currentUser.name} 
            userId={appState.currentUser.id} 
            userRole={appState.currentUser.role}
            currentUser={appState.currentUser}
            isSuperAdmin={appState.currentUser.isSuperAdmin} 
            notifications={appState.notifications} 
            onMarkNotifRead={() => setAppState(prev => ({ ...prev, notifications: prev.notifications.map(n => ({ ...n, read: true })) }))} 
            globalSettings={appState.globalSettings} 
            onLogout={handleLogout}
            events={appState.events.filter(e => e.settings.organizerId === appState.currentUser?.id || appState.currentUser?.isSuperAdmin)} 
            onCreateEvent={async (n, isFree, desc) => { 
              const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
              const e: ArcheryEvent = { 
                id: 'evt_'+Math.random().toString(36).substr(2,9), 
                settings: { 
                  ...DEFAULT_SETTINGS, 
                  tournamentName: n, 
                  description: desc || '',
                  organizerId: appState.currentUser!.id, 
                  isFreeEvent: isFree,
                  createdAt: Date.now(),
                  activationCode
                }, 
                archers: [], 
                scores: [], 
                scoreLogs: [], 
                matches: {} as any, 
                registrations: [], 
                disbursementRequests: [], 
                status: 'DRAFT' as const 
              }; 
              
              setAppState(prev => ({ ...prev, events: [e, ...prev.events], activeEventId: e.id })); 
              
              // Send Activation Email
              try {
                const response = await fetch('/api/send-email-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: appState.currentUser!.email,
                    subject: "Aktivasi Turnamen ARCUS",
                    message: `Halo ${appState.currentUser!.name},\n\nKode aktivasi untuk turnamen "${n}" adalah: ${activationCode}\n\nSilakan masukkan kode ini di dashboard untuk mengaktifkan turnamen Anda.`
                  })
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                  throw new Error(result.message || "Gagal mengirim email");
                }
                
                if (result.isSimulated) {
                  pushNotification("Mode Simulasi", "Kode aktivasi (Simulasi): " + activationCode, "SUCCESS");
                } else {
                  pushNotification("Email Terkirim", "Kode aktivasi telah dikirim ke email Anda.", "INFO");
                }
              } catch (err) {
                console.error("Failed to send activation email", err);
                pushNotification("Gagal Kirim Email", "Gagal mengirim kode aktivasi. Cek koneksi Anda.", "WARNING");
              }

              setView('ACTIVATE_TOURNAMENT'); 
            }} 
            onCreatePractice={(n, isFree) => { 
              const e: ArcheryEvent = { 
                id: 'evt_'+Math.random().toString(36).substr(2,9), 
                settings: { 
                  ...DEFAULT_SETTINGS, 
                  tournamentName: n, 
                  organizerId: appState.currentUser!.id, 
                  isPractice: true, 
                  isFreeEvent: isFree,
                  createdAt: Date.now() 
                }, 
                archers: [], 
                scores: [], 
                scoreLogs: [], 
                matches: {} as any, 
                registrations: [], 
                disbursementRequests: [], 
                status: 'UPCOMING' as const 
              }; 
              setAppState(prev => ({ ...prev, events: [e, ...prev.events], activeEventId: e.id })); 
              setView('EVENT_ADMIN'); 
              pushNotification("Sesi Latihan", `Latihan "${n}" siap digunakan${isFree ? ' (Bebas Biaya Platform)' : ''}.`, "SUCCESS"); 
            }} 
            onCreateSelfPractice={onCreateSelfPractice} 
            onManageEvent={(id) => { 
              const ev = appState.events.find(e => e.id === id); 
              setAppState(prev => ({ ...prev, activeEventId: id })); 
              if (ev?.status === 'DRAFT') {
                setView('ACTIVATE_TOURNAMENT');
              } else if (ev?.settings.isSelfPractice) { 
                setView('SELF_PRACTICE'); 
              } else { 
                setView('EVENT_ADMIN'); 
              } 
            }} 
            onActivateEvent={(id) => { 
              setAppState(prev => ({ ...prev, activeEventId: id })); 
              setView('ACTIVATE_TOURNAMENT'); 
            }}
            onViewLive={(id) => { 
              setAppState(prev => ({ ...prev, activeEventId: id })); 
              setView('LIVE'); 
            }} 
            onUpdateEvent={handleUpdateEvent} 
            onDeleteEvent={handleDeleteEvent} 
            onRefreshData={fetchCloudData} 
            onShare={(id, name) => setShareData({ isOpen: true, name, url: `${window.location.origin}?event=${id}` })} 
            onGoToSuperAdmin={() => setView('SUPER_ADMIN')} 
          />
        )}
        {view === 'SELF_PRACTICE' && activeEvent && <SelfPracticePanel event={activeEvent} onSaveScore={onSaveScore} onBack={() => setView('MEMBER_DASHBOARD')} />}
        {view === 'SUPER_ADMIN' && appState.currentUser?.isSuperAdmin && <SuperAdminPanel state={appState} onUpdateSettings={(gs) => setAppState(prev => ({ ...prev, globalSettings: gs }))} onUpdateEvent={handleUpdateEvent} onDeleteEvent={handleDeleteEvent} onDeleteUser={handleDeleteUser} onUpdateUser={(u) => setAppState(prev => ({ ...prev, users: prev.users.map(usr => usr.id === u.id ? u : usr) }))} onSendNotif={(n) => setAppState(prev => ({ ...prev, notifications: [n, ...prev.notifications] }))} onBack={() => setView('MEMBER_DASHBOARD')} />}
        {view === 'PROFILE' && appState.currentUser && <ProfilePanel user={appState.currentUser} eventsManaged={appState.events.filter(e => e.settings.organizerId === appState.currentUser?.id).length} onUpdate={(u) => setAppState(prev => ({ ...prev, users: prev.users.map(usr => usr.id === u.id ? u : usr), currentUser: u }))} onBack={() => setView('MEMBER_DASHBOARD')} />}
        {view === 'EVENT_ADMIN' && activeEvent && (
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24 animate-in fade-in duration-700 px-4 md:px-0">
            {/* Console Header */}
            <div className="relative group overflow-hidden bg-slate-50/50 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full -mr-32 -mt-32 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 relative z-10 w-full lg:w-auto">
                <button 
                  onClick={() => {
                    if (appState.activeScorer) {
                      setAppState(prev => ({ ...prev, activeScorer: null, currentUser: null, activeEventId: null }));
                      setView('LANDING');
                    } else {
                      setView('MEMBER_DASHBOARD');
                    }
                  }} 
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white rounded-xl text-slate-400 hover:text-arcus-red hover:bg-red-50 transition-all active:scale-90 group/btn"
                >
                  <ArrowLeft className="w-5 h-5 group-hover/btn:-translate-x-1 transition-transform" />
                </button>
                <div className="space-y-0.5 md:space-y-1">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="bg-arcus-red text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest italic animate-pulse">Live Console</span>
                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">ARCUS TOUR-OS v2.0</span>
                  </div>
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-black font-oswald uppercase italic leading-none tracking-tighter text-slate-900 drop-shadow-sm">{activeEvent.settings.tournamentName}</h2>
                  <p className="flex items-center gap-2 text-[9px] md:text-[11px] font-bold text-slate-500 italic">
                    <Activity className="w-2.5 h-2.5 text-emerald-500" />
                    {appState.activeScorer ? `Petugas: ${appState.activeScorer.name}` : 'Akses Penuh: Penyelenggara'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap md:flex-nowrap gap-2 relative z-10 w-full lg:w-auto">
                 {!appState.activeScorer && (
                   <button 
                     onClick={() => setView('FINANCE')} 
                     className="flex-1 md:flex-none px-4 py-3 md:px-6 md:py-3.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                   >
                     <DollarSign className="w-3.5 h-3.5" /> KEUANGAN
                   </button>
                 )}
                 <button 
                   onClick={() => setView('LIVE')} 
                   className="flex-1 md:flex-none px-4 py-3 md:px-6 md:py-3.5 bg-arcus-red text-white rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-arcus-red/20"
                 >
                   <Monitor className="w-3.5 h-3.5 animate-pulse" /> LIVE BOARD
                 </button>
              </div>
            </div>

            {/* Console App Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                {(!appState.activeScorer) && (
                  <button onClick={() => setView('SETTINGS')} className="group p-5 md:p-8 bg-slate-50/50 rounded-[1.5rem] md:rounded-[2rem] hover:bg-slate-100 transition-all text-left relative overflow-hidden active:scale-95">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-slate-900 transition-colors">
                      <SettingsIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <p className="font-black uppercase font-oswald italic text-lg md:text-xl tracking-tighter text-slate-900 mb-0.5 md:mb-1 leading-none">PENGATURAN</p>
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Konfigurasi Event</p>
                  </button>
                )}
                
                {( !appState.activeScorer || appState.activeScorer.permissions.includes('EDIT_ARCHER')) && (
                  <button onClick={() => setView('ARCHERS')} className="group p-5 md:p-8 bg-slate-50/50 rounded-[1.5rem] md:rounded-[2rem] hover:bg-blue-50 transition-all text-left relative overflow-hidden active:scale-95">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-blue-600 transition-colors">
                      <UsersIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <p className="font-black uppercase font-oswald italic text-lg md:text-xl tracking-tighter text-slate-900 mb-0.5 md:mb-1 leading-none">PESERTA</p>
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Database Archer</p>
                  </button>
                )}

                {!appState.activeScorer && (
                  <button onClick={() => setView('OFFICIALS')} className="group p-5 md:p-8 bg-slate-50/50 rounded-[1.5rem] md:rounded-[2rem] hover:bg-blue-50 transition-all text-left relative overflow-hidden active:scale-95">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-blue-600 transition-colors">
                      <UsersIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <p className="font-black uppercase font-oswald italic text-lg md:text-xl tracking-tighter text-slate-900 mb-0.5 md:mb-1 leading-none">OFFICIAL</p>
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Manajer & Pelatih</p>
                  </button>
                )}

                {( !appState.activeScorer || appState.activeScorer.permissions.includes('INPUT_SCORE')) && (
                  <>
                    <button onClick={() => setView('SCORING')} className="group p-5 md:p-8 bg-slate-50/50 rounded-[1.5rem] md:rounded-[2rem] hover:bg-emerald-50 transition-all text-left relative overflow-hidden active:scale-95">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-emerald-600 transition-colors">
                        <Target className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                      <p className="font-black uppercase font-oswald italic text-lg md:text-xl tracking-tighter text-slate-900 mb-0.5 md:mb-1 leading-none">SCORING</p>
                      <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Input Skor</p>
                    </button>
                    <button onClick={() => setView('QUICK_SCORING')} className="group p-5 md:p-8 bg-emerald-50 rounded-[1.5rem] md:rounded-[2rem] border border-emerald-100 hover:bg-emerald-100 transition-all text-left relative overflow-hidden active:scale-95">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-emerald-600 transition-colors border border-emerald-100">
                        <Zap className="w-5 h-5 text-emerald-500 group-hover:text-white transition-all group-hover:scale-110" />
                      </div>
                      <p className="font-black uppercase font-oswald italic text-lg md:text-xl tracking-tighter text-emerald-900 mb-0.5 md:mb-1 leading-none">INPUT CEPAT</p>
                      <p className="text-[8px] md:text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Entry Kilat</p>
                    </button>
                  </>
                )}

                {( !appState.activeScorer || appState.activeScorer.permissions.includes('INPUT_SCORE')) && (
                  <button onClick={() => setView('OPERATOR_CENTER')} className="group p-5 md:p-8 bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] hover:bg-black transition-all text-left relative overflow-hidden active:scale-95">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-arcus-red transition-all border border-white/10">
                      <Database className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                    </div>
                    <p className="font-black uppercase font-oswald italic text-lg md:text-xl tracking-tighter text-white mb-0.5 md:mb-1 leading-none">OPERATOR</p>
                    <p className="text-[8px] md:text-[9px] font-black text-white/30 uppercase tracking-widest">Kontrol Alur</p>
                  </button>
                )}

                {( !appState.activeScorer || appState.activeScorer.permissions.includes('MANAGE_MATCHES')) && (
                  <button onClick={() => setView('ELIMINATION')} className="group p-5 md:p-8 bg-slate-50/50 rounded-[1.5rem] md:rounded-[2rem] hover:bg-amber-50 transition-all text-left relative overflow-hidden active:scale-95">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-amber-500 transition-colors">
                      <Swords className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <p className="font-black uppercase font-oswald italic text-lg md:text-xl tracking-tighter text-slate-900 mb-0.5 md:mb-1 leading-none">ELIMINASI</p>
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bracket & Aduan</p>
                  </button>
                )}
                <button onClick={() => setView('RESULTS')} className="group p-5 md:p-8 bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] hover:bg-black transition-all text-left relative overflow-hidden active:scale-95">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-arcus-red transition-all border border-white/10">
                      <FileDown className="w-5 h-5 text-arcus-red group-hover:text-white transition-colors" />
                    </div>
                    <p className="font-black uppercase font-oswald italic text-lg md:text-xl tracking-tighter text-white mb-0.5 md:mb-1 leading-none">LAPORAN</p>
                    <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">Ekspor & Data Final</p>
                </button>
            </div>
          </div>
        )}
        {view === 'SETTINGS' && activeEvent && (
          <AdminPanel 
            settings={activeEvent.settings} 
            scorerAccess={activeEvent.scorerAccess || []}
            isSuperAdmin={appState.currentUser?.isSuperAdmin}
            onSave={(s) => handleUpdateEvent(activeEvent.id, { settings: s })} 
            onUpdateScorers={(scorers) => handleUpdateEvent(activeEvent.id, { scorerAccess: scorers })}
            onClear={() => {}} 
            onDelete={() => handleDeleteEvent(activeEvent.id)} 
            onBack={() => setView('EVENT_ADMIN')} 
          />
        )}
        {view === 'ARCHERS' && activeEvent && (
          <ArcherList 
            archers={activeEvent.archers} 
            archersPerTarget={activeEvent.settings.archersPerTarget} 
            totalTargets={activeEvent.settings.totalTargets} 
            settings={activeEvent.settings}
            eventId={activeEvent.id}
            globalSettings={appState.globalSettings}
            onAdd={(a) => handleUpdateEvent(activeEvent.id, { archers: [...activeEvent.archers, a] })} 
            onUpdate={(a) => handleUpdateEvent(activeEvent.id, { archers: activeEvent.archers.map(arc => arc.id === a.id ? a : arc) })} 
            onRemove={(id) => handleUpdateEvent(activeEvent.id, { archers: activeEvent.archers.filter(a => a.id !== id) })} 
            onBulkUpdate={(updated) => handleUpdateEvent(activeEvent.id, { archers: updated })} 
            onBack={() => setView('EVENT_ADMIN')} 
          />
        )}
        {view === 'OFFICIALS' && activeEvent && (
          <OfficialList 
            officials={activeEvent.archers.filter(a => a.category === CategoryType.OFFICIAL)}
            settings={activeEvent.settings}
            onUpdate={(o) => handleUpdateEvent(activeEvent.id, { archers: activeEvent.archers.map(arc => arc.id === o.id ? o : arc) })}
            onRemove={(id) => handleUpdateEvent(activeEvent.id, { archers: activeEvent.archers.filter(a => a.id !== id) })}
            onBack={() => setView('EVENT_ADMIN')}
          />
        )}
        {view === 'SCORING' && activeEvent && <ScoringPanel state={activeEvent} onSaveScore={onSaveScore} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'QUICK_SCORING' && activeEvent && <QuickScoringPanel event={activeEvent} onSaveScore={onSaveScore} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'OPERATOR_CENTER' && activeEvent && <OperatorCenter event={activeEvent} onSaveScore={onSaveScore} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'ELIMINATION' && activeEvent && <EliminationPanel event={activeEvent} onUpdateMatches={(m) => handleUpdateEvent(activeEvent.id, { matches: m })} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'RESULTS' && activeEvent && <ResultsPanel state={activeEvent} onResetScores={() => handleUpdateEvent(activeEvent.id, { scores: [], scoreLogs: [] })} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'FINANCE' && activeEvent && (
          <FinancePanel 
            event={activeEvent} 
            isSuperAdmin={appState.currentUser?.isSuperAdmin}
            onApproveRegistration={async (regId) => { 
          const reg = activeEvent.registrations.find(r => r.id === regId); 
          if (reg) { 
            const existingArcher = activeEvent.archers.find(a => a.id === regId);
            let finalPin = '';
            if (existingArcher) {
              finalPin = existingArcher.pin;
              // Just update status if already an archer
              handleUpdateEvent(activeEvent.id, {
                archers: activeEvent.archers.map(a => a.id === regId ? { ...a, status: 'APPROVED' } : a),
                registrations: activeEvent.registrations.map(r => r.id === regId ? { ...r, status: 'APPROVED' } : r)
              });
            } else {
              // Move/Add to archers if not there
              finalPin = Math.floor(1000 + Math.random() * 9000).toString();
              const newArcher: Archer = { ...reg, status: 'APPROVED', targetNo: 0, position: 'A', wave: 1, pin: finalPin }; 
              handleUpdateEvent(activeEvent.id, { 
                registrations: activeEvent.registrations.map(r => r.id === regId ? { ...r, status: 'APPROVED' } : r), 
                archers: [...activeEvent.archers, newArcher] 
              }); 
            }

            // Send Confirmation Email
            try {
              const response = await fetch('/api/send-email-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: reg.email,
                  subject: `Konfirmasi Pendaftaran: ${activeEvent.settings.tournamentName}`,
                  message: `Halo ${reg.name},\n\nPendaftaran Anda untuk event "${activeEvent.settings.tournamentName}" telah DISETUJUI.\n\nDetail Pendaftaran:\n- Kategori: ${reg.category}\n- Klub: ${reg.club}\n\nLihat daftar peserta: ${window.location.origin}?event=${activeEvent.id}&view=entry-list\n\nLihat Live Score: ${window.location.origin}?event=${activeEvent.id}&view=live\n\nSelamat bertanding!`
                })
              });
              if (response.ok) {
                pushNotification("Email Terkirim", `Konfirmasi pendaftaran telah dikirim ke ${reg.email}`, "SUCCESS");
              }
            } catch (err) {
              console.error("Failed to send confirmation email", err);
            }
          } 
        }} onPayPlatformFee={(id) => handleUpdateEvent(id, { settings: { ...activeEvent.settings, platformFeePaidToOwner: true } })} onBack={() => setView('EVENT_ADMIN')} />
        )}
        {view === 'LIVE' && activeEvent && <LiveScoreboard state={activeEvent} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'REGISTER_PARTICIPANT' && activeEvent && <OnlineRegistration event={activeEvent} globalSettings={appState.globalSettings} onRegister={async (r) => {
          const pin = Math.floor(1000 + Math.random() * 9000).toString();
          const newArcher: Archer = {
            ...r,
            targetNo: 0,
            position: 'A',
            wave: 1,
            pin: pin
          };
          handleUpdateEvent(activeEvent.id, { 
            registrations: [...activeEvent.registrations, r],
            archers: [...activeEvent.archers, newArcher]
          });
          pushNotification("Pendaftaran Berhasil", `Selamat ${r.name}, Anda telah terdaftar! Sedang menyinkronkan data...`, "SUCCESS");

          // Auto-send confirmation email if approved immediately (Gateway)
          if (r.status === 'APPROVED' || r.status === 'PAID') {
            try {
              await fetch('/api/send-email-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: r.email,
                  subject: `Konfirmasi Pendaftaran: ${activeEvent.settings.tournamentName}`,
                  message: `Halo ${r.name},\n\nTerima kasih telah mendaftar di event "${activeEvent.settings.tournamentName}".\n\nDetail Pendaftaran:\n- Kategori: ${r.category}\n- Klub: ${r.club}\n\nLihat daftar peserta: ${window.location.origin}?event=${activeEvent.id}&view=entry-list\n\nLihat Live Score: ${window.location.origin}?event=${activeEvent.id}&view=live\n\nSelamat bertanding!`
                })
              });
              pushNotification("Email Terkirim", `Konfirmasi pendaftaran telah dikirim ke ${r.email}`, "INFO");
            } catch (err) {
              console.error("Failed to send auto-confirmation email", err);
            }
          } else {
            // For manual payment, send "Registration Received" email
            try {
              await fetch('/api/send-email-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: r.email,
                  subject: `Pendaftaran Diterima: ${activeEvent.settings.tournamentName}`,
                  message: `Halo ${r.name},\n\nPendaftaran Anda untuk event "${activeEvent.settings.tournamentName}" telah kami terima.\n\nStatus: Menunggu Verifikasi Pembayaran.\n\nLihat daftar peserta: ${window.location.origin}?event=${activeEvent.id}&view=entry-list\n\nKami akan mengirimkan email konfirmasi setelah pembayaran Anda diverifikasi oleh panitia.`
                })
              });
            } catch (err) {
              console.error("Failed to send registration received email", err);
            }
          }
        }} onBack={() => setView('LANDING')} onViewParticipants={() => setView('PUBLIC_ENTRY_LIST')} />}
        {view === 'PUBLIC_LIVE' && activeEvent && (
          <LiveScoreboard state={activeEvent} onBack={() => setView('LANDING')} />
        )}
        {view === 'PUBLIC_ENTRY_LIST' && activeEvent && <EntryList event={activeEvent} onBack={() => setView('LANDING')} />}
        {view === 'PUBLIC_EVENT_INFO' && activeEvent && (
          <EventInfo 
            event={activeEvent} 
            onBack={() => setView('LANDING')} 
            onRegister={() => setView('REGISTER_PARTICIPANT')} 
            onShare={() => setShareData({ isOpen: true, name: activeEvent.settings.tournamentName, url: `${window.location.origin}?event=${appState.activeEventId}` })} 
          />
        )}
        {(view === 'PRIVACY' || view === 'TERMS' || view === 'DOCUMENTATION') && (
          <LegalDoc type={view} onBack={() => setView('LANDING')} />
        )}
      </main>

      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex items-center gap-3">
                <ArcusLogo className="w-8 h-8" />
                <div className="flex flex-col">
                  <h3 className="text-xl font-black font-oswald uppercase italic tracking-tighter leading-none text-slate-900">ARCUS DIGITAL</h3>
                  <span className="text-[7px] font-black text-arcus-red uppercase tracking-[0.2em]">Tournament OS</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-8">
                <button onClick={() => setView('PRIVACY')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-arcus-red transition-colors">Kebijakan Privasi</button>
                <button onClick={() => setView('TERMS')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-arcus-red transition-colors">Syarat & Ketentuan</button>
                <button onClick={() => setView('DOCUMENTATION')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-arcus-red transition-colors">Dokumentasi</button>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Kontak Support</p>
              <p className="text-xl font-black font-oswald uppercase italic tracking-wider text-slate-900">WA: {appState.globalSettings.contactSupport}</p>
              <div className="mt-6 pt-6 border-t border-slate-50">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Tournament OS v{APP_VERSION} &copy; 2026</p>
              </div>
            </div>
         </div>
       </div>
      </footer>
      <ShareModal isOpen={shareData.isOpen} onClose={() => setShareData({ ...shareData, isOpen: false })} tournamentName={shareData.name} url={shareData.url} />
    </div>
  );
}

export default App;