
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
  updateDoc,
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

  // 2. Authentication & Real-time Subscriptions
  useEffect(() => {
    if (!auth || !db) return;
    
    let unsubUserEvents: (() => void) | null = null;
    let unsubPublicEvents: (() => void) | null = null;

    // A. Global Public Events Listener (always active)
    const publicQ = query(
      collection(db, 'events'),
      where('settings.isActivated', '==', true)
    );
    
    unsubPublicEvents = onSnapshot(publicQ, (snapshot) => {
      const publicEvents = snapshot.docs.map(doc => {
        const d = doc.data();
        const base = d.data || d;
        const settings = {
           ...(base.settings || base || {}),
           ...(d.settings || {})
        };
        return { 
          ...base, 
          ...d,
          id: doc.id, 
          settings,
          status: (d.status || base.status || 'DRAFT').toString().toUpperCase() 
        } as ArcheryEvent;
      });

      setAppState(prev => {
        const eventMap = new Map(prev.events.map(e => [e.id, e]));
        publicEvents.forEach(pe => {
          const existing = eventMap.get(pe.id);
          eventMap.set(pe.id, {
            ...(existing || {}),
            ...pe,
            settings: { ...(existing?.settings || {}), ...pe.settings } as any
          });
        });
        return { ...prev, events: Array.from(eventMap.values()) };
      });
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'profiles', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        let userData: User;

        if (docSnap.exists()) {
          const d = docSnap.data();
          userData = { ...(d.data || d), id: firebaseUser.uid };
        } else {
          const isAdmin = ['poedji.sugianto@gmail.com', 'admin@arcus.id'].includes(firebaseUser.email || '');
          userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: isAdmin ? UserRole.SUPERADMIN : UserRole.PARTICIPANT,
            photoURL: firebaseUser.photoURL || undefined
          };
          await setDoc(docRef, userData);
        }

        setAppState(prev => ({ ...prev, currentUser: userData }));
        
        // B. Subscribe to user-owned events
        if (unsubUserEvents) unsubUserEvents();
        const userQ = query(
          collection(db, 'events'),
          where('ownerId', 'in', [userData.id, userData.email].filter(Boolean))
        );
        
        unsubUserEvents = onSnapshot(userQ, (snapshot) => {
          const userEvents = snapshot.docs.map(doc => {
            const d = doc.data();
            const base = d.data || d;
            const settings = {
               ...(base.settings || base || {}),
               ...(d.settings || {})
            };
            return { 
              ...base, 
              ...d,
              id: doc.id, 
              settings,
              status: (d.status || base.status || 'DRAFT').toString().toUpperCase() 
            } as ArcheryEvent;
          });
          
          setAppState(prev => {
            const eventMap = new Map(prev.events.map(e => [e.id, e]));
            userEvents.forEach(ue => {
              const existing = eventMap.get(ue.id);
              eventMap.set(ue.id, {
                ...(existing || {}),
                ...ue,
                settings: { ...(existing?.settings || {}), ...ue.settings } as any,
                registrations: ue.registrations?.length ? ue.registrations : (existing?.registrations || []),
                archers: ue.archers?.length ? ue.archers : (existing?.archers || []),
                officials: ue.officials?.length ? ue.officials : (existing?.officials || [])
              });
            });
            return { ...prev, events: Array.from(eventMap.values()) };
          });
        });

        fetchCloudData(userData);
      } else {
        if (unsubUserEvents) unsubUserEvents();
        setAppState(prev => ({ ...prev, currentUser: null }));
        fetchCloudData();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUserEvents) unsubUserEvents();
      if (unsubPublicEvents) unsubPublicEvents();
    };
  }, [db]);

  // 3. Active Event & Data Subscriptions
  useEffect(() => {
    if (!db || !appState.activeEventId) return;

    const eventId = appState.activeEventId;
    
    // Subscribe to submissions for the active event
    const unsubSubmissions = onSnapshot(collection(db, 'events', eventId, 'submissions'), (snapshot) => {
      const rawSubmissions = snapshot.docs.map(sd => {
        const d = sd.data();
        const base = d.archerData || d.officialData || d.participantData || d.data || d;
        const regType = d.regType || base.regType || (d.category === 'OFFICIAL' ? 'OFFICIAL' : 'ARCHER');
        return { ...base, ...d, id: sd.id, regType };
      });
      
      const cloudArchers = rawSubmissions.filter(s => s.regType !== 'OFFICIAL');
      const cloudOfficials = rawSubmissions.filter(s => s.regType === 'OFFICIAL');

      setAppState(prev => {
        if (prev.activeEventId !== eventId) return prev;
        const newEvents = prev.events.map(e => {
          if (e.id === eventId) {
            return {
              ...e,
              registrations: rawSubmissions,
              archers: cloudArchers,
              officials: cloudOfficials,
              registrationCount: rawSubmissions.length
            };
          }
          return e;
        });
        return { ...prev, events: newEvents };
      });
    }, (err) => {
      console.error("Submissions subscription error:", err);
    });

    return () => unsubSubmissions();
  }, [db, appState.activeEventId]);

  // 4. SuperAdmin Subscriptions
  useEffect(() => {
    if (!db || appState.currentUser?.role !== UserRole.SUPERADMIN) return;

    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const users = snapshot.docs.map(d => {
        const data = d.data();
        return data.data || data;
      });
      setAppState(prev => ({ ...prev, users }));
    });

    return () => unsubProfiles();
  }, [db, appState.currentUser?.role]);

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
      
      // Fetch public events primarily via API (faster)
      try {
        const res = await fetch('/api/public-events');
        if (res.ok) {
           const data = await res.json();
           cloudEvents = (data.events || []).map((e: any) => {
             const base = e.data || e;
             const settings = {
                ...(base.settings || base || {}),
                ...(e.settings || {})
             };
             return { 
               ...base, 
               ...e, 
               settings,
               status: (e.status || base.status || 'DRAFT').toString().toUpperCase() 
             };
           });
        }
      } catch (apiErr) {
        // Fallback to minimal public fetch
        const eventsSnap = await getDocs(query(collection(db, 'events'), limit(30)));
        cloudEvents = eventsSnap.docs.map(doc => {
          const d = doc.data();
          const base = d.data || d;
          const settings = {
             ...(base.settings || base || {}),
             ...(d.settings || {})
          };
          return { ...base, ...d, id: doc.id, settings, status: (d.status || base.status || 'DRAFT').toString().toUpperCase() } as ArcheryEvent;
        });
      }
      
      setAppState(prev => {
        const eventMap = new Map(prev.events.map(e => [e.id, e]));

        // Upsert cloud events
        cloudEvents.forEach(ce => {
          const existing = eventMap.get(ce.id);
          
          const mergedSettings = {
            ...(existing?.settings || {}),
            ...(ce.settings || {})
          };

          eventMap.set(ce.id, {
            ...(existing || {}),
            ...ce,
            settings: mergedSettings as any,
            registrations: ce.registrations?.length ? ce.registrations : (existing?.registrations || []),
            archers: ce.archers?.length ? ce.archers : (existing?.archers || []),
            officials: ce.officials?.length ? ce.officials : (existing?.officials || []),
            status: (ce.status || existing?.status || 'DRAFT').toUpperCase() as ArcheryEvent['status']
          });
        });

        return {
          ...prev,
          globalSettings: {
            ...cloudSettings,
            paymentGatewayProvider: (cloudSettings.paymentGatewayProvider as any) || 'NONE'
          } as GlobalSettings,
          events: Array.from(eventMap.values()),
          isDataLoaded: true
        };
      });

    } catch (err: any) {
      console.error("Cloud fetch failed:", err.message);
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
    setAppState(prev => {
      const existingEvent = prev.events.find(e => e.id === id);
      if (!existingEvent) return prev;

      // Deep-ish merge for settings
      const newSettings = updated.settings 
        ? { ...existingEvent.settings, ...updated.settings }
        : existingEvent.settings;

      const newEvent = { 
        ...existingEvent, 
        ...updated, 
        settings: newSettings,
        updatedAt: new Date().toISOString() 
      };

      return {
        ...prev,
        events: prev.events.map(e => e.id === id ? newEvent : e)
      };
    });
    
    if (isOnline && db) {
      try {
        // Create a flattened update object for Firestore to avoid overwriting nested objects
        const firestoreUpdate: any = {
          ...updated,
          updatedAt: serverTimestamp()
        };

        // If settings are provided, flatten them for Firestore merge
        if (updated.settings) {
          delete firestoreUpdate.settings;
          Object.entries(updated.settings).forEach(([key, val]) => {
            firestoreUpdate[`settings.${key}`] = val;
          });
        }

        await updateDoc(doc(db, 'events', id), firestoreUpdate);
        pushNotification("Berhasil", "Perubahan disimpan.", "SUCCESS");
      } catch (err: any) {
        console.warn("Update sync failed, falling back to merge setDoc", err);
        
        // Re-calculate flattened update explicitly for fallback
        const fallbackUpdate: any = { ...updated, updatedAt: serverTimestamp() };
        if (updated.settings) {
          delete fallbackUpdate.settings;
          Object.entries(updated.settings).forEach(([key, val]) => {
            fallbackUpdate[`settings.${key}`] = val;
          });
        }

        try {
          await setDoc(doc(db, 'events', id), fallbackUpdate, { merge: true });
          pushNotification("Berhasil (Sync)", "Perubahan disimpan.", "SUCCESS");
        } catch (setErr: any) {
          console.error("Critical Firestore Error:", setErr);
          pushNotification("Gagal Sync", setErr.message || "Network error", "WARNING");
          setHasPendingChanges(true);
        }
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
             if (!e) return false;
             const isOwner = e.settings?.organizerId === appState.currentUser?.id || e.ownerId === appState.currentUser?.id || e.ownerId === appState.currentUser?.email;
             const isScorer = (e as any).scorerAccess?.some((s: any) => s && s.email === appState.currentUser?.email);
             return !!(isOwner || isScorer);
          })}
          onCreateEvent={async (name) => {
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
             
             // Immediate state update
             setAppState(prev => ({ ...prev, events: [newEvent, ...prev.events], activeEventId: id }));
             setView('EVENT_ADMIN');
             
             // Aggressive sync to cloud
             if (isOnline && db) {
               try {
                 await setDoc(doc(db, 'events', id), newEvent);
                 pushNotification('Draft Event Dibuat', 'Tersimpan di cloud.', 'SUCCESS');
               } catch (err: any) {
                 console.error("Create event sync error:", err);
                 setHasPendingChanges(true);
               }
             } else {
               setHasPendingChanges(true);
             }
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
            
            if (!activatingEventId) {
              pushNotification('Error', 'Sesi aktivasi kadaluarsa.', 'WARNING');
              setView('MEMBER_DASHBOARD');
              return;
            }

            if (trimmedCode === expectedCode) {
              const eventToUpdate = appStateRef.current.events.find(e => e.id === activatingEventId);
              if (eventToUpdate) {
                // Ensure we explicitly pass status to UPCOMING and settings.isActivated to true
                handleUpdateEvent(activatingEventId, { 
                  status: 'UPCOMING',
                  settings: { 
                    ...eventToUpdate.settings, 
                    isActivated: true 
                  } 
                }).then(() => {
                  pushNotification('Aktivasi Berhasil', 'Turnamen Anda telah aktif.', 'SUCCESS');
                  setView('MEMBER_DASHBOARD');
                  setActivatingEventId(null);
                  setActivationCode(null);
                });
              } else {
                pushNotification('Error', 'Event tidak ditemukan.', 'WARNING');
                setView('MEMBER_DASHBOARD');
              }
            } else {
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

      case 'ADMIN_DASHBOARD':
        return <AdminDashboard 
          user={appState.currentUser!}
          events={appState.events.filter(e => {
             if (!e) return false;
             const isOwner = e.ownerId === appState.currentUser?.id || e.ownerId === appState.currentUser?.email;
             const isSuperAdmin = appState.currentUser?.role === UserRole.SUPERADMIN;
             return isOwner || isSuperAdmin;
          })}
          onManageEvent={(id) => {
            setAppState(prev => ({ ...prev, activeEventId: id }));
            setView('EVENT_ADMIN');
          }}
          onCreateEvent={() => {
            setView('MEMBER_DASHBOARD');
            pushNotification("Info", "Pilih 'Buat Event Baru' di dashboard member.", "INFO");
          }}
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
