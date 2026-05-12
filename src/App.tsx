
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Trophy, Users, Calendar, Settings, 
  Plus, ChevronRight, LogOut, 
  Menu, X, Bell, User as UserIcon, 
  HardHat, ShieldCheck, Globe, 
  Zap, Cloud, CloudOff, RefreshCw, 
  AlertCircle, Download, Smartphone 
} from 'lucide-react';
import { 
  initializeApp, 
  getApps 
} from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  writeBatch,
  increment,
  getDocFromServer
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';

import firebaseConfig from '../firebase-applet-config.json';
import { 
  AppState, 
  ArcheryEvent, 
  UserRole, 
  TournamentSettings, 
  ParticipantRegistration, 
  RegistrationStatus, 
  User, 
  AppNotification, 
  GlobalSettings,
  ScoreEntry,
  ScoreLog,
  CategoryType
} from './types';
import { STORAGE_KEY, DEFAULT_GLOBAL_SETTINGS } from './constants';

// Clean imports for components
import LandingPage from './components/LandingPage';
import RegistrationPanel from './components/OnlineRegistration';
import AdminDashboard from './components/AdminDashboard';
import MemberDashboard from './components/MemberDashboard';
import AdminPanel from './components/AdminPanel';
import ScoringPanel from './components/ScoringPanel';
import LiveScoreboard from './components/LiveScoreboard';
import LoginPanel from './components/LoginPanel';
import ProfilePanel from './components/ProfilePanel';
import SuperAdminPanel from './components/SuperAdminPanel';
import TournamentCalendar from './components/TournamentCalendar';
import ArcusLogo from './components/ArcusLogo';
import ShareModal from './components/ShareModal';
import QuickScoringPanel from './components/QuickScoringPanel';
import OperatorCenter from './components/OperatorCenter';
import EliminationPanel from './components/EliminationPanel';
import ActivateTournament from './components/ActivateTournament';
import ResultsPanel from './components/ResultsPanel';
import FinancePanel from './components/FinancePanel';
import ArcherList from './components/ArcherList';
import OfficialList from './components/OfficialList';
import EventInfo from './components/EventInfo';
import ScorerLogin from './components/ScorerLogin';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [view, setView] = useState<string>('LANDING');
  // @ts-ignore
  const dummy: 'ACTIVATE_TOURNAMENT' | 'MEMBER_DASHBOARD' = 'ACTIVATE_TOURNAMENT';
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [appState, setAppState] = useState<AppState>({
    events: [],
    users: [],
    notifications: [],
    globalSettings: DEFAULT_GLOBAL_SETTINGS,
    currentUser: null,
    activeEventId: null,
    isDataLoaded: false
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [activatingEventId, setActivatingEventId] = useState<string | null>(null);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [shareData, setShareData] = useState<{isOpen: boolean, url: string, name: string, registerUrl?: string}>({
    isOpen: false,
    url: '',
    name: ''
  });
  
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const isSyncingFromCloud = useRef(false);
  const isCurrentlySyncing = useRef(false);
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(new Set());

  const appStateRef = useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // Catch-all to hide splash screen if loading hangs
  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const pushNotification = (title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' = 'INFO') => {
    const id = Date.now().toString();
    const newNotif: AppNotification = { 
      id, 
      title, 
      message, 
      type: type === 'ERROR' as any ? 'WARNING' : type, 
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // 1. Initial Data Load (Local + Cloud)
  useEffect(() => {
    const loadInitialData = async () => {
      // 1. Load Local Storage
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setAppState(prev => ({ 
            ...prev, 
            ...parsed, 
            isDataLoaded: false // Set false until cloud sync is done
          }));
        } catch (e) {
          console.error("Local storage corrupted", e);
        }
      }

      // 2. Load Cloud Data (Direct Fetch)
      if (isOnline && db) {
        try {
          await fetchCloudData();
        } catch (err: any) {
          console.warn("Cloud data fetch failed, continuing with local state", err.message);
          if (err.message?.includes('quota exceeded')) {
            setQuotaExceeded(true);
            pushNotification("Quota Firestore Habis", "Limit harian tercapai. Mode offline aktif.", "WARNING");
          }
        }
      }
      
      setAppState(prev => ({ ...prev, isDataLoaded: true }));
      setIsCheckingLink(false);
      
      // Force hide splash screen after a small delay to allow initial render
      setTimeout(() => {
        setIsSplashVisible(false);
      }, 500);
    };

    loadInitialData();
  }, []);

  // 2. Authentication Observer
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Build user object from firebase
        const isAdmin = ['poedji.sugianto@gmail.com', 'admin@arcus.id'].includes(firebaseUser.email || '');
        const userData: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User',
          role: isAdmin ? UserRole.SUPERADMIN : UserRole.PARTICIPANT,
          photoURL: firebaseUser.photoURL || undefined
        };

        setAppState(prev => ({ ...prev, currentUser: userData }));
        
        // Re-fetch data for the logged in user using direct profile
        fetchCloudData(userData);
      } else {
        setAppState(prev => ({ ...prev, currentUser: null }));
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchCloudData = async (userOverride?: User) => {
    if (!db || !isOnline || quotaExceeded) return;
    
    try {
      // 1. Fetch Global Settings
      const settingsSnap = await getDoc(doc(db, 'systemConfigs', 'global'));
      let cloudSettings = DEFAULT_GLOBAL_SETTINGS;
      if (settingsSnap.exists()) {
        const d = settingsSnap.data();
        cloudSettings = d.data || d;
      }

      const currentUser = userOverride || appStateRef.current.currentUser;
      let cloudEvents: ArcheryEvent[] = [];
      
      // If user is logged in, fetch their events specifically bypassing cache if needed
      if (currentUser) {
        try {
          const eventsSnap = await getDocs(query(
            collection(db, 'events'),
            where('ownerId', 'in', [currentUser.id, currentUser.email].filter(Boolean))
          ));
          cloudEvents = eventsSnap.docs.map(doc => {
            const d = doc.data();
            const base = d.data || d;
            return { ...base, id: doc.id, status: (d.status || base.status || 'ACTIVE').toString().toUpperCase() };
          });
        } catch (err) {
          console.warn("User-specific event fetch failed, falling back to public", err);
        }
      }

      // Merge with public events
      try {
        const res = await fetch('/api/public-events');
        const contentType = res.headers.get("content-type");
        
        if (res.ok && contentType && contentType.includes("application/json")) {
           const data = await res.json();
           const publicEvents = data.events || [];
           // Merge and deduplicate
           const existingIds = new Set(cloudEvents.map(e => e.id));
           publicEvents.forEach((pe: any) => {
             if (!existingIds.has(pe.id)) {
               cloudEvents.push(pe);
             }
           });
        }
      } catch (apiErr: any) {
        // Silent warning - if this fails, we fall back to direct Firestore. 
        // We only log if it's a real issue that prevents display.
        
        // Fallback: Direct Firestore query from client
        if (db) {
          try {
            const eventsSnap = await getDocs(collection(db, 'events'));
            cloudEvents = eventsSnap.docs.map(doc => {
              const d = doc.data();
              const base = d.data || d;
              return { ...base, id: doc.id, status: (d.status || base.status || 'ACTIVE').toString().toUpperCase() };
            });
          } catch (dbErr: any) {
            console.error("[FETCH-DIRECT] Critical error: All fetch methods failed.", dbErr.message);
          }
        }
      }

      // For Active Event, we might need a more granular fetch including submissions
      let submissionsSnap: any = null;
      if (appStateRef.current.activeEventId) {
        submissionsSnap = await getDocs(query(
          collection(db, 'events', appStateRef.current.activeEventId, 'submissions'),
          limit(3000)
        ));
      }

      // Fetch profiles if Admin
      let profilesSnap: any = null;
      if (appStateRef.current.currentUser?.role === UserRole.SUPERADMIN) {
        profilesSnap = await getDocs(collection(db, 'profiles'));
      }

      setAppState(prev => {
        const activeId = prev.activeEventId;
        const modifiedEvents = cloudEvents.map(ce => {
          if (ce.id === activeId && submissionsSnap) {
            const rawSubmissions = submissionsSnap.docs.map((sd: any) => {
               const d = sd.data();
               const base = d.archerData || d.officialData || d.participantData || d.data || d;
               const regType = d.regType || base.regType || (d.category === 'OFFICIAL' ? 'OFFICIAL' : 'ARCHER');
               return { ...base, ...d, id: sd.id, regType };
            });
            const cloudArchers = rawSubmissions.filter(s => s.regType !== 'OFFICIAL');
            const cloudOfficials = rawSubmissions.filter(s => s.regType === 'OFFICIAL');
            return {
              ...ce,
              registrations: rawSubmissions,
              archers: cloudArchers,
              officials: cloudOfficials,
              registrationCount: rawSubmissions.length
            };
          }
          return ce;
        });

        return {
          ...prev,
          globalSettings: {
            ...cloudSettings,
            paymentGatewayProvider: (cloudSettings.paymentGatewayProvider as any) || 'NONE'
          } as GlobalSettings,
          events: modifiedEvents,
          users: profilesSnap ? profilesSnap.docs.map((d: any) => d.data()?.data || d.data()) : prev.users,
          isDataLoaded: true
        };
      });

    } catch (err: any) {
      console.error("Cloud fetch failed:", err.message);
      throw err;
    }
  };

  const syncCloudData = async (manual = false, overrideState?: AppState) => {
    const state = overrideState || appStateRef.current;
    if (!db || !isOnline || (!state?.currentUser && !state?.activeScorer)) return;
    if (!hasPendingChanges && !manual && !overrideState) return;
    
    if (isCurrentlySyncing.current) return;
    isCurrentlySyncing.current = true;
    setIsSyncing(true);

    try {
      // 1. Sync Global Settings
      if (state.currentUser?.role === UserRole.SUPERADMIN) {
        await setDoc(doc(db, 'systemConfigs', 'global'), { 
          id: 'global', 
          data: state.globalSettings, 
          updatedAt: serverTimestamp() 
        }, { merge: true });
      }

      // 2. Sync User Profile
      if (state.currentUser) {
        await setDoc(doc(db, 'profiles', state.currentUser.id), { 
          id: state.currentUser.id, 
          data: state.currentUser, 
          updatedAt: serverTimestamp() 
        }, { merge: true });
      }

      setHasPendingChanges(false);
      setLastSync(new Date());
      if (manual) pushNotification("Sinkronisasi Selesai", "Data berhasil diperbarui.", "SUCCESS");
    } catch (err: any) {
      console.error("Sync error:", err);
      if (manual) pushNotification("Gagal Sinkron", err.message, "WARNING");
    } finally {
      setIsSyncing(false);
      isCurrentlySyncing.current = false;
    }
  };

  const onLoginSuccess = (user: User) => {
    setAppState(prev => ({ ...prev, currentUser: user }));
    setView('MEMBER_DASHBOARD');
    pushNotification("Selamat Datang", `Halo, ${user.name}!`, "SUCCESS");
    syncCloudData(true);
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    setAppState(prev => ({ ...prev, currentUser: null, activeEventId: null, activeScorer: null }));
    setView('LANDING');
  };

  const handleActivateEvent = (eventId: string) => {
    const event = appState.events.find(e => e.id === eventId);
    if (!event) return;

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setActivationCode(code);
    setActivatingEventId(eventId);

    // Send via email
    fetch('/api/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: appState.currentUser?.email || 'admin@arcus.id',
        subject: `Kode Aktivasi Turnamen: ${event.settings.tournamentName}`,
        message: `Halo ${appState.currentUser?.name},\n\nKode aktivasi Anda untuk turnamen "${event.settings.tournamentName}" adalah: ${code}\n\nMasukkan kode ini di aplikasi untuk melakukan aktivasi.`
      })
    })
    .then(() => pushNotification('OTP Dikirim', 'Cek email Anda untuk kode aktivasi.', 'SUCCESS'))
    .catch(() => pushNotification('Gagal Kirim OTP', 'Cek koneksi atau konfigurasi SMTP.', 'WARNING'));

    setView('ACTIVATE_TOURNAMENT');
  };

  const handleUpdateEvent = async (id: string, updated: Partial<ArcheryEvent>) => {
    setAppState(prev => ({
      ...prev,
      events: prev.events.map(e => e.id === id ? { ...e, ...updated, updatedAt: new Date().toISOString() } : e)
    }));
    
    if (isOnline && db) {
       try {
         await setDoc(doc(db, 'events', id), {
           ...updated,
           updatedAt: serverTimestamp()
         }, { merge: true });
         pushNotification("Berhasil", "Perubahan disimpan.", "SUCCESS");
       } catch (err: any) {
         pushNotification("Gagal Sync", err.message, "WARNING");
         setHasPendingChanges(true);
       }
    } else {
      setHasPendingChanges(true);
    }
  };

  const onDeleteEvent = async (id: string) => {
    if (!confirm("Hapus turnamen ini permanen?")) return;
    try {
      if (db) await deleteDoc(doc(db, 'events', id));
      setAppState(prev => ({
        ...prev,
        events: prev.events.filter(e => e.id !== id)
      }));
      pushNotification("Dihapus", "Turnamen berhasil dihapus.", "SUCCESS");
    } catch (err: any) {
      pushNotification("Error", err.message, "WARNING");
    }
  };

  const onResetSystemData = async () => {
    if (!appState.currentUser?.isSuperAdmin && appState.currentUser?.email !== 'poedji.sugianto@gmail.com') return;
    if (!confirm("Hapus seluruh data sistem?")) return;

    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/nuke-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authEmail: appState.currentUser.email })
      });
      if (res.ok) {
        pushNotification("Reset Berhasil", "Database dibersihkan.", "SUCCESS");
        window.location.reload();
      } else {
        throw new Error("Gagal nuke database");
      }
    } catch (err: any) {
      pushNotification("Gagal", err.message, "WARNING");
    } finally {
      setIsSyncing(false);
    }
  };

  const activeEvent = useMemo(() => 
    appState.events.find(e => e.id === appState.activeEventId) || null
  , [appState.events, appState.activeEventId]);

  // Main UI Router
  const renderView = () => {
    if (quotaExceeded && !isOnline) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-2xl font-black mb-4">MODE OFFLINE DARURAT</h1>
          <p className="text-slate-600 mb-8 max-w-md">Limit Firestore Arcus telah habis hari ini. Sistem beralih ke mode offline sepenuhnya. Data hanya disimpan di perangkat ini.</p>
          <button onClick={() => setQuotaExceeded(false)} className="px-8 py-3 bg-arcus-red text-white rounded-2xl font-bold uppercase tracking-widest">Lanjutkan Offline</button>
        </div>
      );
    }

    switch(view) {
      case 'LANDING':
        return <LandingPage 
          events={appState.events} 
          currentUser={appState.currentUser}
          onViewLive={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            // Logika untuk ke scoreboard (bisa ke PUBLIC_EVENT_INFO dulu atau langsung)
            setView('PUBLIC_EVENT_INFO');
          }}
          onViewParticipants={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('PUBLIC_EVENT_INFO');
          }}
          onViewInfo={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('PUBLIC_EVENT_INFO');
          }}
          onRegister={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('REGISTER_PARTICIPANT');
          }}
          onLogin={() => setView('LOGIN_PANEL')}
          onScorerLogin={() => setView('SCORER_LOGIN')}
          onCreateEvent={() => {
            if (!appState.currentUser) {
              setView('LOGIN_PANEL');
            } else {
              setView('MEMBER_DASHBOARD');
            }
          }}
          onShare={(id) => {
            const ev = appState.events.find(e => e.id === id);
            setShareData({
              isOpen: true,
              url: window.location.origin + '?event=' + id,
              name: ev?.settings.tournamentName || 'Turnamen Panahan'
            });
          }}
          onLogout={handleLogout}
          onRefresh={() => syncCloudData(true)}
          isSyncing={isSyncing}
          quotaExceeded={quotaExceeded}
        />;
      
      case 'REGISTER_PARTICIPANT':
        if (!activeEvent) return null;
        return <RegistrationPanel 
          event={activeEvent}
          globalSettings={appState.globalSettings}
          onRegister={async (regs) => {
            try {
              const res = await fetch("/api/register-participant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  eventId: activeEvent.id,
                  registrations: regs,
                  archers: regs.filter(r => r.regType !== 'OFFICIAL'),
                  officials: regs.filter(r => r.regType === 'OFFICIAL')
                })
              });
              if (!res.ok) throw new Error("Gagal registrasi ke server.");
              pushNotification("Berhasil", "Pendaftaran terkirim.", "SUCCESS");
              setView('LANDING');
            } catch (err: any) {
              pushNotification("Gagal", err.message, "WARNING");
            }
          }}
          onBack={() => setView('LANDING')}
          onViewParticipants={() => setView('PUBLIC_EVENT_INFO')}
        />;

      case 'SCORER_LOGIN':
        return <ScorerLogin 
          events={appState.events}
          onLogin={(event, scorer) => {
            setAppState(prev => ({ ...prev, activeEventId: event.id, activeScorer: scorer }));
            setView('SCORER_PANEL');
            pushNotification("Akses Diterima", `Pencatat Skor: ${scorer.name}`, "SUCCESS");
          }}
          onBack={() => setView('LANDING')}
        />;

      case 'SCORER_PANEL':
        if (!activeEvent) return null;
        return <ScoringPanel 
          state={activeEvent}
          onSaveScore={async (score) => {
            const scores = Array.isArray(score) ? score : [score];
            handleUpdateEvent(activeEvent.id, {
               scores: [...(activeEvent.scores || []), ...scores]
            });
          }}
          onBack={() => setView('LANDING')}
        />;

      case 'LOGIN_PANEL':
        return <LoginPanel 
          onLogin={onLoginSuccess}
          onRegister={(u) => {}}
          onUpdateUser={(u) => {}}
          users={appState.users}
          onBack={() => setView('LANDING')}
        />;

      case 'MEMBER_DASHBOARD':
        return <MemberDashboard 
          userName={appState.currentUser?.name}
          userId={appState.currentUser?.id || ''}
          userRole={appState.currentUser?.role}
          currentUser={appState.currentUser}
          isSuperAdmin={appState.currentUser?.isSuperAdmin}
          onGoToSuperAdmin={() => setView('SUPER_ADMIN')}
          notifications={notifications}
          onMarkNotifRead={() => setNotifications([])}
          globalSettings={appState.globalSettings}
          events={appState.events.filter(e => {
             const isOwner = e.settings.organizerId === appState.currentUser?.id || e.ownerId === appState.currentUser?.id || e.ownerId === appState.currentUser?.email;
             const isScorer = (e as any).scorerAccess?.some((s: any) => s.email === appState.currentUser?.email);
             return isOwner || isScorer;
          })}
          onCreateEvent={(name) => {
             const id = 'evt_' + Date.now();
             const newEvent: ArcheryEvent = {
               id,
               ownerId: appState.currentUser?.id || appState.currentUser?.email || '',
               status: 'DRAFT',
               settings: {
                 tournamentName: name || 'Turnamen Baru',
                 organizerId: appState.currentUser?.id || appState.currentUser?.email || '',
                 eventDate: new Date().toISOString(),
                 location: '',
                 isFreeEvent: false,
                 archersPerTarget: 2,
                 totalTargets: 1,
                 totalArrows: 36,
                 arrowsPerEnd: 6,
                 totalEnds: 6,
                 isActivated: false
               },
               archers: [],
               officials: [],
               registrations: [],
               scores: [],
               scoreLogs: [],
               matches: {} as any
             };
             setAppState(prev => ({ ...prev, events: [newEvent, ...prev.events], activeEventId: id }));
             setView('EVENT_ADMIN');
             setHasPendingChanges(true);
             pushNotification('Draft Event Dibuat', 'Silakan lengkapi konfigurasi turnamen.', 'SUCCESS');
          }}
          onCreatePractice={() => {}}
          onCreateSelfPractice={() => {}}
          onManageEvent={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('EVENT_ADMIN');
          }}
          onViewLive={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('PUBLIC_EVENT_INFO');
          }}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={onDeleteEvent}
          onActivateEvent={handleActivateEvent}
          onShare={(id, name) => {
            setShareData({
              isOpen: true,
              url: window.location.origin + '?event=' + id,
              name: name || 'Turnamen Panahan'
            });
          }}
          onLogout={handleLogout}
          isSyncing={isSyncing}
        />;

      case 'ACTIVATE_TOURNAMENT':
        if (!activatingEventId) {
          setView('MEMBER_DASHBOARD');
          return null;
        }
        const activeEventToActivate = appState.events.find(e => e.id === activatingEventId);
        if (!activeEventToActivate) {
          setView('MEMBER_DASHBOARD');
          return null;
        }
        return <ActivateTournament 
          event={activeEventToActivate}
          userEmail={appState.currentUser?.email || ''}
          onActivate={(code) => {
            const trimmedCode = code.trim();
            const expectedCode = (activationCode || '').trim();
            console.log("[DEBUG] App: onActivate called with code:", trimmedCode, "Expected:", expectedCode);
            
            if (!activatingEventId) {
              console.error("[DEBUG] App: No activatingEventId found!");
              pushNotification('Error', 'Sesi aktivasi kadaluarsa.', 'WARNING');
              setView('MEMBER_DASHBOARD');
              return;
            }

            if (trimmedCode === expectedCode) {
              console.log("[DEBUG] App: Code matched! Activating event:", activatingEventId);
              // Ensure we find the latest event data from state
              const eventToUpdate = appStateRef.current.events.find(e => e.id === activatingEventId);
              if (eventToUpdate) {
                handleUpdateEvent(activatingEventId, { 
                  status: 'UPCOMING',
                  settings: { ...eventToUpdate.settings, isActivated: true } 
                });
                pushNotification('Aktivasi Berhasil', 'Turnamen Anda telah aktif.', 'SUCCESS');
                setView('MEMBER_DASHBOARD');
                setActivatingEventId(null);
                setActivationCode(null);
              } else {
                pushNotification('Error', 'Event tidak ditemukan.', 'WARNING');
                setView('MEMBER_DASHBOARD');
              }
            } else {
              console.warn("[DEBUG] App: Code mismatch.");
              pushNotification('Kode Salah', 'Kode aktivasi tidak valid.', 'WARNING');
            }
          }}
          onBack={() => setView('MEMBER_DASHBOARD')}
          onResend={() => handleActivateEvent(activatingEventId)}
        />;

      case 'EVENT_ADMIN':
        if (!activeEvent) return null;
        return <AdminPanel 
          eventId={activeEvent.id}
          settings={activeEvent.settings}
          scorerAccess={activeEvent.scorerAccess || []}
          onSave={async (updatedSettings) => {
            handleUpdateEvent(activeEvent.id, { settings: updatedSettings });
          }}
          onUpdateScorers={async (scorers) => {
            handleUpdateEvent(activeEvent.id, { scorerAccess: scorers });
          }}
          onClear={() => {}}
          onDelete={() => onDeleteEvent(activeEvent.id)}
          onBack={() => setView('MEMBER_DASHBOARD')}
        />;

      case 'SUPER_ADMIN':
        return <SuperAdminPanel 
          state={appState}
          onUpdateSettings={(gs) => {
            setAppState(prev => ({ ...prev, globalSettings: gs }));
            setHasPendingChanges(true);
          }}
          onResetSystemData={() => onResetSystemData()}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={onDeleteEvent}
          onDeleteUser={(uid) => {}}
          onUpdateUser={(u) => {}}
          onSendNotif={(n) => pushNotification(n.title, n.message, n.type as any)}
          onBack={() => setView('MEMBER_DASHBOARD')}
        />;

      case 'PUBLIC_EVENT_INFO':
        if (!activeEvent) return null;
        return <EventInfo 
          event={activeEvent}
          onRegister={() => setView('REGISTER_PARTICIPANT')}
          onBack={() => setView('LANDING')}
          onShare={() => {
             setShareData({
              isOpen: true,
              url: window.location.origin + '?event=' + activeEvent.id,
              name: activeEvent.settings.tournamentName || 'Turnamen Panahan'
            });
          }}
          onViewParticipants={() => setView('PUBLIC_EVENT_INFO')}
        />;

      default:
        return <LandingPage 
          events={appState.events} 
          currentUser={appState.currentUser}
          onViewLive={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('PUBLIC_EVENT_INFO');
          }}
          onViewParticipants={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('PUBLIC_EVENT_INFO');
          }}
          onViewInfo={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('PUBLIC_EVENT_INFO');
          }}
          onRegister={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('REGISTER_PARTICIPANT');
          }}
          onLogin={() => setView('LOGIN_PANEL')}
          onScorerLogin={() => setView('SCORER_LOGIN')}
          onCreateEvent={() => {
            if (!appState.currentUser) {
              setView('LOGIN_PANEL');
            } else {
              setView('MEMBER_DASHBOARD');
            }
          }}
          onShare={(id) => {
            const ev = appState.events.find(e => e.id === id);
            setShareData({
              isOpen: true,
              url: window.location.origin + '?event=' + id,
              name: ev?.settings.tournamentName || 'Turnamen Panahan'
            });
          }}
          onLogout={handleLogout}
          onRefresh={() => syncCloudData(true)}
          isSyncing={isSyncing}
          quotaExceeded={quotaExceeded}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans selection:bg-arcus-red/10 selection:text-arcus-red">
      {isSplashVisible && (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center animate-out fade-out duration-700 delay-1000 fill-mode-forwards">
          <ArcusLogo className="w-48 h-48 animate-pulse text-arcus-red" />
        </div>
      )}

      {/* Network Status Bar */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest py-1 flex items-center justify-center gap-2">
          <CloudOff className="w-3 h-3" /> BEKERJA OFFLINE (SINKRONISASI AKTIF)
        </div>
      )}

      <main className="relative z-10">{renderView()}</main>

      {/* Persistent Status Indicators */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3">
        {isSyncing && (
          <div className="bg-white/80 backdrop-blur-md border px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-left">
            <RefreshCw className="w-3 h-3 animate-spin text-arcus-red" />
            <span className="text-[10px] font-bold uppercase text-slate-500">Syncing...</span>
          </div>
        )}
        {hasPendingChanges && !isSyncing && (
          <div className="bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <Cloud className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase">Pending</span>
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="fixed top-6 right-6 z-[1000] flex flex-col gap-3 max-w-sm w-full">
          {notifications.map(n => (
            <div key={n.id} className={`p-4 rounded-2xl shadow-xl border-l-4 animate-in slide-in-from-right flex gap-3 ${
              n.type === 'SUCCESS' ? 'bg-white border-green-500' : 
              n.type === 'WARNING' ? 'bg-white border-orange-500' : 
              n.type === 'ERROR' ? 'bg-white border-red-500' : 'bg-white border-blue-500'
            }`}>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{n.title}</p>
                <p className="text-sm font-medium text-slate-600">{n.message}</p>
              </div>
              <button onClick={() => setNotifications(prev => prev.filter(nn => nn.id !== n.id))} className="text-slate-300 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
