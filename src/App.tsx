import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Bell, BellRing, ArrowLeft, LogIn, Database, Gavel, Wifi, WifiOff,
  Users as UsersIcon, Monitor, Plus, Clock, X, CreditCard, ChevronLeft, GitBranch, 
  ShieldCheck, Settings as SettingsIcon, User as UserIcon, List, Info, CloudOff,
  FileText, Activity, Trophy, Download, Target, Swords, Share2, Check, ShieldAlert,
  RefreshCw, Sparkles, DollarSign, FileDown, Cloud, Zap, LayoutDashboard,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { AppState, ArcheryEvent, CategoryType, User, Archer, GlobalSettings, AppNotification, ScoreEntry, ParticipantRegistration, Match, ScoreLog, DisbursementRequest, TargetType, UserRole } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEY, APP_VERSION } from './constants';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, query, where, onSnapshot, deleteDoc, Timestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';
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
import OperatorCenter from './components/OperatorCenter';
import QuickScoringPanel from './components/QuickScoringPanel';
import ScorerLogin from './components/ScorerLogin';
import ActivateTournament from './components/ActivateTournament';
import OfficialList from './components/OfficialList';
import IdCardEditor from './components/IdCardEditor';
import ResetPasswordPanel from './components/ResetPasswordPanel';

type View = 'LANDING' | 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD' | 'MEMBER_DASHBOARD' | 'PROFILE' | 'EVENT_ADMIN' | 'SETTINGS' | 'REGISTER_PARTICIPANT' | 'SCORING' | 'QUICK_SCORING' | 'LIVE' | 'ARCHERS' | 'OFFICIALS' | 'FINANCE' | 'SUPER_ADMIN' | 'OPERATOR_CENTER' | 'JUDGE_PANEL' | 'ELIMINATION' | 'PUBLIC_LIVE' | 'PUBLIC_ENTRY_LIST' | 'PUBLIC_EVENT_INFO' | 'RESULTS' | 'DOCUMENTATION' | 'PRIVACY' | 'TERMS' | 'SCORER_LOGIN' | 'ACTIVATE_TOURNAMENT' | 'ID_CARD_EDITOR';

import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';

export function App() {
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem('ARCUS_CURRENT_VIEW');
    return (saved as View) || 'LANDING';
  });
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [shareData, setShareData] = useState<{ isOpen: boolean; name: string; url: string; registerUrl?: string }>({ isOpen: false, name: '', url: '' });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(new Set());
  const [liveBoardTVMode, setLiveBoardTVMode] = useState(false);
  const isSyncingFromCloud = React.useRef(false);

  const [appState, setAppState] = useState<AppState>(() => {
    const initialSettings: GlobalSettings = {
      feeAdult: 0, 
      feeKids: 0, 
      maintenanceMode: false,
      contactSupport: '', 
      bankProvider: '',
      bankAccountNumber: '', 
      bankAccountName: '',
      dataRetentionDays: 90, 
      practiceRetentionDays: 7,
      paymentGatewayProvider: 'NONE',
      paymentGatewayIsProduction: false,
      platformFeePercentage: 0
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // We restore everything BUT force isDataLoaded to false so we fetch fresh from cloud
        return { 
          ...parsed, 
          isDataLoaded: false,
          notifications: parsed.notifications || []
        };
      }
    } catch (e) {
      console.error("Local storage recovery failed:", e);
    }

    return {
      events: [],
      users: [],
      currentUser: null, 
      activeEventId: null, 
      globalSettings: initialSettings, 
      notifications: [],
      isDataLoaded: false,
      drafts: { scoring: {}, adminSettings: {}, activeCategory: {} }
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

  const fetchCloudData = async (manual = false) => {
    if (!db) return;
    if (manual) setIsSyncing(true);
    
    // Safety: If we have pending local changes, don't overwrite with cloud data
    // unless explicitly requested via manual refresh
    if (hasPendingChanges && !manual) {
      return;
    }

    try {
      isSyncingFromCloud.current = true;
      
      // 1. Fetch System Config
      const configSnap = await getDoc(doc(db, 'systemConfigs', 'global'));
      const cloudSettings = configSnap.exists() ? configSnap.data().data : null;
      
      // 2. Fetch Events (Only relevant ones if possible, but for now we pull list)
      const eventsSnap = await getDocs(collection(db, 'events'));
      const cloudEvents = eventsSnap.docs.map(doc => {
        const e = doc.data();
        return { ...e.data, id: e.id, ownerId: e.userId, status: e.status || e.data?.status || 'DRAFT' };
      });

      // 3. Profiles
      const profilesSnap = await getDocs(collection(db, 'profiles'));
      const cloudUsers = profilesSnap.docs.map(doc => doc.data().data);
      
      setAppState(prev => ({
        ...prev,
        globalSettings: cloudSettings || prev.globalSettings,
        events: cloudEvents.length > 0 ? cloudEvents : prev.events,
        users: cloudUsers.length > 0 ? cloudUsers : prev.users,
        isDataLoaded: true
      }));

      setLastSync(new Date());
    } catch (err: any) { 
      console.error("Fetch Cloud Error:", err);
      if (manual) pushNotification("Gagal Sinkron", err.message, "WARNING");
      // Set to loaded even on error to allow app to use local state fallback
      setAppState(prev => ({ ...prev, isDataLoaded: true }));
    } finally {
      setIsSyncing(false);
      isSyncingFromCloud.current = false;
    }
  };

  useEffect(() => {
    fetchCloudData().catch(err => console.error("Initial fetch error:", err));
  }, [appState.currentUser?.id, appState.activeEventId]);

  const [isCheckingLink, setIsCheckingLink] = useState(false);

  // Handle URL Parameters for Sharing
  useEffect(() => {
    const handleDeepLink = async () => {
      const hash = window.location.hash;
      if (hash.includes('type=recovery')) {
        setView('RESET_PASSWORD');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('event');
      const registerId = params.get('register');
      const viewParam = params.get('view');

      if (!eventId && !registerId) return;

      if (!db) {
        console.log("Deep link validation skipped: Database not ready.");
        return;
      }

      setIsCheckingLink(true);

      // Safety timeout to prevent infinite loading if something goes wrong
      const safetyTimeout = setTimeout(() => {
        setIsCheckingLink(false);
      }, 5000);

      try {
        const idToFetch = eventId || registerId;
        if (idToFetch) {
          console.log("Deep link validation starting for:", idToFetch);
          const eventSnap = await getDoc(doc(db, 'events', idToFetch));

          if (eventSnap.exists()) {
            console.log("Deep link data found in Firestore.");
            const eventRecord = eventSnap.data();
            const targetEvent = eventRecord.data as ArcheryEvent;
            
            // Inject into state and activate
            setAppState(prev => {
              const exists = prev.events.some(e => e.id === targetEvent.id);
              return { 
                ...prev, 
                events: exists ? prev.events.map(e => e.id === targetEvent.id ? targetEvent : e) : [targetEvent, ...prev.events],
                activeEventId: targetEvent.id
              };
            });

            // Navigate based on view
            if (registerId) setView('REGISTER_PARTICIPANT');
            else if (viewParam === 'live') setView('PUBLIC_LIVE');
            else if (viewParam === 'entry-list') setView('PUBLIC_ENTRY_LIST');
            else setView('PUBLIC_EVENT_INFO');
            
          } else {
            console.warn("Shared event not found in cloud:", idToFetch);
            pushNotification("Turnamen Tidak Ditemukan", "Data turnamen tidak ditemukan di awan. Pastikan penyelenggara sudah mengaktifkan turnamen.", "WARNING");
          }
        }
      } catch (err) {
        console.error("Deep link fetch error:", err);
      } finally {
        setIsCheckingLink(false);
        clearTimeout(safetyTimeout);
      }
    };

    handleDeepLink();
    fetchCloudData().catch(err => console.error("Cloud ready fetch error:", err));
  }, [db]); // Run once when db is ready

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

  // Firebase Auth Listener
  useEffect(() => {
    if (!auth) return;

    // Listen for auth changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        handleBackgroundLogin(user);
      } else {
        setAppState(prev => ({ ...prev, currentUser: null, activeEventId: null }));
        setView('LANDING');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleBackgroundLogin = async (user: any) => {
    if (!db) return;
    try {
      const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
      const profileData = profileSnap.exists() ? profileSnap.data().data : null;

      const isSuper = profileData?.role === 'SUPERADMIN' || 
                     profileData?.role === 'superadmin' || 
                     user.email === 'admin@arcus.id' || 
                     user.email === 'poedji.sugianto@gmail.com';

      const loggedInUser: User = {
        id: user.uid,
        email: user.email || '',
        name: profileData?.name || user.displayName || 'User',
        phone: profileData?.phone || '',
        isOrganizer: true,
        isVerified: true,
        isSuperAdmin: isSuper,
        role: isSuper ? UserRole.SUPERADMIN : ((profileData?.role as UserRole) || UserRole.ORGANIZER)
      };

      setAppState(prev => ({ ...prev, currentUser: loggedInUser }));
      fetchCloudData().catch(err => console.error("Post-login fetch error:", err));
    } catch (err) {
      console.error("Profile sync error:", err);
    }
  };

  const activeEvent = appState.events.find(e => e.id === appState.activeEventId);

  useEffect(() => {
    // Only save to localStorage after initial cloud fetch to avoid overwriting cloud with stale local data
    if (appState.isDataLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }
  }, [appState]);

  useEffect(() => {
    localStorage.setItem('ARCUS_CURRENT_VIEW', view);
  }, [view]);

  useEffect(() => {
    if (!isSyncingFromCloud.current && appState.isDataLoaded) {
      setHasPendingChanges(true);
    }
  }, [appState.events, appState.globalSettings, appState.currentUser, appState.isDataLoaded]);

  const syncCloudData = async (manual = false) => {
    if (!db || !isOnline) return;
    
    // Safety check: Don't sync if data hasn't been loaded from cloud yet
    if (!appState.isDataLoaded && !manual) return;

    setIsSyncing(true);
    try {
      // 1. Sync Global Settings (Only SuperAdmin)
      if (appState.currentUser?.isSuperAdmin) {
        await setDoc(doc(db, 'systemConfigs', 'global'), { 
          id: 'global', 
          data: appState.globalSettings, 
          updatedAt: new Date().toISOString() 
        }, { merge: true });
      }

      // 2. Sync User Profile
      if (appState.currentUser) {
        await setDoc(doc(db, 'profiles', appState.currentUser.id), { 
          id: appState.currentUser.id, 
          data: appState.currentUser, 
          updatedAt: new Date().toISOString() 
        }, { merge: true });
      }
      
      // 3. Sync Active Event (Sync all including practice)
      if (activeEvent) {
        const isAuthorizedAtCloud = appState.currentUser?.isSuperAdmin || 
                                   activeEvent.settings.organizerId === appState.currentUser?.id || 
                                   activeEvent.ownerId === appState.currentUser?.id;
                                   
        if (isAuthorizedAtCloud) {
          await setDoc(doc(db, 'events', activeEvent.id), { 
            id: activeEvent.id, 
            userId: activeEvent.settings.organizerId || appState.currentUser?.id || null, 
            data: activeEvent,
            updatedAt: new Date().toISOString() 
          }, { merge: true });
        }
      }
      
      setLastSync(new Date());
      setHasPendingChanges(false);
      if (manual) pushNotification("Sinkronisasi Selesai", "Data telah aman di cloud.", "SUCCESS");
    } catch (err) { 
      console.error("Sync error", err); 
      if (manual) pushNotification("Gagal Sinkron", "Gagal menyimpan data ke cloud.", "WARNING");
    } finally {
      setIsSyncing(false);
    }
  };

  // Real-time Subscriptions - Only for active event when necessary
  useEffect(() => {
    if (!db || !appState.activeEventId) return;
    
    // Only subscribe in views that need live updates
    const liveViews = ['LIVE', 'PUBLIC_LIVE', 'SCORING', 'QUICK_SCORING', 'OPERATOR_CENTER', 'ARCHERS', 'FINANCE'];
    if (!liveViews.includes(view)) return;

    const unsub = onSnapshot(doc(db, 'events', appState.activeEventId), (docSnap) => {
      if (docSnap.exists()) {
        // IMPROVEMENT: Use metadata to check if the change is local or remote
        // If it's a remote change AND we don't have pending changes, update local state
        // OR if it's a remote change and we ARE in a live view (LiveBoard), always sync to keep board updated
        const isRemoteChange = !docSnap.metadata.hasPendingWrites;
        const isLiveView = view === 'LIVE' || view === 'PUBLIC_LIVE';
        
        if (isRemoteChange && (!hasPendingChanges || isLiveView)) {
          console.log("Cloud update received for active event:", appState.activeEventId);
          const cloudEventData = docSnap.data().data as ArcheryEvent;
          const cloudStatus = docSnap.data().status;
          
          setAppState(prev => ({
            ...prev,
            events: prev.events.map(e => 
              e.id === appState.activeEventId 
                ? { ...cloudEventData, id: e.id, status: cloudStatus } 
                : e
            )
          }));
        }
      }
    }, (error) => {
      console.error("Event Snapshot Error:", error);
    });

    return () => unsub();
  }, [db, appState.activeEventId, view, hasPendingChanges]);

  // Global Config Subscription
  useEffect(() => {
    if (!db) return;
    const unsubConfig = onSnapshot(doc(db, 'systemConfigs', 'global'), (docSnap) => {
      if (docSnap.exists() && !hasPendingChanges) {
        const cloudSettings = docSnap.data().data as GlobalSettings;
        setAppState(prev => ({ ...prev, globalSettings: cloudSettings }));
      }
    });
    return () => unsubConfig();
  }, [db, hasPendingChanges]);

  // Debounced Sync for Profile, Global Settings, and Events (Pushes)
  useEffect(() => {
    if (!hasPendingChanges) return;
    const debounce = setTimeout(() => {
      console.log("Auto-syncing all pending changes...");
      syncCloudData(false).then(() => {
        setHasPendingChanges(false);
      });
    }, 1500); 
    return () => clearTimeout(debounce);
  }, [appState.globalSettings, appState.currentUser, appState.events, hasPendingChanges]);
/*
  useEffect(() => {
    const debounce = setTimeout(syncCloudData, 3000); // 3s for batching
    return () => clearTimeout(debounce);
  }, [appState.events, appState.globalSettings, appState.currentUser, isOnline, hasPendingChanges]);
*/

  // Consistency Check for View and State - Wait for data to be loaded to avoid false kicks
  useEffect(() => {
    if (!appState.isDataLoaded || isCheckingLink) return;

    const eventRequiredViews = ['EVENT_ADMIN', 'ARCHERS', 'OFFICIALS', 'FINANCE', 'ELIMINATION', 'ACTIVATE_TOURNAMENT', 'SCORING', 'QUICK_SCORING', 'JUDGE_PANEL', 'LIVE', 'PUBLIC_LIVE', 'PUBLIC_ENTRY_LIST', 'PUBLIC_EVENT_INFO', 'REGISTER_PARTICIPANT'];
    if (eventRequiredViews.includes(view) && !activeEvent) {
      if (['PUBLIC_LIVE', 'PUBLIC_ENTRY_LIST', 'PUBLIC_EVENT_INFO', 'REGISTER_PARTICIPANT'].includes(view as any)) {
        setView('LANDING');
      } else {
        setView('MEMBER_DASHBOARD');
      }
    }
    const authViews = ['MEMBER_DASHBOARD', 'PROFILE', 'SUPER_ADMIN', 'OPERATOR_CENTER'];
    if (authViews.includes(view) && !appState.currentUser) {
      setView('LANDING');
    }
  }, [view, activeEvent, appState.currentUser, appState.isDataLoaded, isCheckingLink]);

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
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger immediate sync when coming back online
      pushNotification("Kembali Online", "Menghubungkan ke cloud...", "INFO");
      syncCloudData(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      pushNotification("Sedang Offline", "Bekerja dalam mode lokal. Data akan disimpan di perangkat.", "WARNING");
    };
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

  // Polling for registration updates when in admin screens
  useEffect(() => {
    if (!db || !isOnline) return;
    const adminViews = ['EVENT_ADMIN', 'ARCHERS', 'OFFICIALS', 'FINANCE', 'SCORING', 'QUICK_SCORING', 'OPERATOR_CENTER', 'LIVE', 'PUBLIC_LIVE'];
    if (adminViews.includes(view)) {
      const interval = setInterval(() => {
        // Polling faster for live views, slower for admin views
        const isLive = view === 'LIVE' || view === 'PUBLIC_LIVE';
        console.log(`Auto-polling cloud updates (${isLive ? 'RAID' : 'STANDARD'})...`);
        fetchCloudData().catch(err => console.error("Polling fetch error:", err));
      }, view === 'LIVE' || view === 'PUBLIC_LIVE' ? 8000 : 15000); 
      return () => clearInterval(interval);
    }
  }, [view, isOnline]);

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
    if (auth) await signOut(auth);
    setAppState(prev => ({ ...prev, currentUser: null, activeEventId: null }));
    setView('LANDING');
  };

  const saveEventToCloud = async (event: ArcheryEvent) => {
    if (!db) return;
    
    try {
      await setDoc(doc(db, 'events', event.id), {
        id: event.id,
        userId: event.settings.organizerId || appState.currentUser?.id || 'guest',
        data: event,
        status: event.status,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`Firestore sync success for event: ${event.id} (Status: ${event.status})`);
    } catch (err: any) {
      console.error(`Firestore sync failed for event ${event.id}:`, err);
    }
  };

  const handleUpdateEvent = async (id: string, updated: Partial<ArcheryEvent>) => {
    let finalEvent: ArcheryEvent | null = null;
    setAppState(prev => {
      const event = prev.events.find(e => e.id === id);
      if (!event) return prev;

      finalEvent = { ...event, ...updated, localUpdatedAt: new Date().toISOString() };
      return { 
        ...prev, 
        events: prev.events.map(e => e.id === id ? finalEvent! : e) 
      };
    });

    setHasPendingChanges(true);
    // CRITICAL: Immediately sync management changes to cloud to avoid race conditions
    if (finalEvent && db && isOnline) {
      await saveEventToCloud(finalEvent);
      setHasPendingChanges(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!id) return;
    
    const eventToDelete = appState.events.find(e => e.id === id);
    if (!eventToDelete) return;

    setDeletedEventIds(prev => new Set(prev).add(id));

    setAppState(prev => ({ 
      ...prev, 
      events: prev.events.filter(e => e.id !== id),
      activeEventId: prev.activeEventId === id ? null : prev.activeEventId 
    }));
    
    if (view !== 'MEMBER_DASHBOARD' && activeEvent?.id === id) setView('MEMBER_DASHBOARD');

    if (db) {
      try {
        await deleteDoc(doc(db, 'events', id));
        pushNotification("Berhasil Dihapus", `Event telah dihapus dari cloud.`, "SUCCESS");
      } catch (err: any) {
        pushNotification("Error", err.message, "WARNING");
      }
    }
    
    setTimeout(() => {
      setDeletedEventIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 5000);
  };

  const handleShare = (id: string, name?: string) => {
    const event = appState.events.find(e => e.id === id);
    const eventName = name || event?.settings.tournamentName || 'Tournament';
    
    // Gunakan origin jika bukan localhost, jika localhost coba gunakan Fallback Production URL jika ada
    const currentOrigin = window.location.origin;
    const isLocal = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');
    const baseUrl = isLocal 
      ? 'https://arcus-digital.arcus.field' // Nama alias jika lokal (informasi saja)
      : currentOrigin;

    setShareData({
      isOpen: true,
      name: eventName,
      url: `${baseUrl}?event=${id}`,
      registerUrl: `${baseUrl}?register=${id}`
    });

    if (isLocal) {
      pushNotification("Lokal Detected", "Link berbagi menggunakan alamat lokal. Pastikan sinkronisasi cloud aktif agar orang lain bisa melihat data ini.", "INFO");
    }
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

    if (db) {
      try {
        await deleteDoc(doc(db, 'profiles', userId));
        pushNotification("User Dihapus", `Akun ${user.name} telah dihapus permanen.`, "SUCCESS");
      } catch (err: any) {
        pushNotification("Error", err.message, "WARNING");
      }
    }
  };

  const onSaveScore = async (score: ScoreEntry | ScoreEntry[], log?: ScoreLog | ScoreLog[]) => {
    if (!activeEvent) return;
    const now = Date.now();
    const scoresArray = (Array.isArray(score) ? score : [score]).map(s => ({ ...s, lastUpdated: now }));
    const logsArray = Array.isArray(log) ? log : (log ? [log] : []);
    
    // Calculate the updated event first to ensure we sync the EXACT SAME data we set in state
    let updatedEvent: ArcheryEvent | null = null;

    setAppState(prev => {
      const event = prev.events.find(e => e.id === activeEvent.id);
      if (!event) return prev;
      
      let newScores = [...event.scores];
      scoresArray.forEach(s => {
        const normalizedS = (s.sessionId === '1' || s.sessionId === '2' || !s.sessionId) ? 'QUAL' : s.sessionId;
        const entryToSave = { ...s, sessionId: normalizedS };

        newScores = newScores.filter(existing => {
          const normalizedExisting = (existing.sessionId === '1' || existing.sessionId === '2' || !existing.sessionId) ? 'QUAL' : existing.sessionId;
          return !(
            existing.archerId === s.archerId && 
            normalizedExisting === normalizedS && 
            existing.endIndex === s.endIndex
          );
        });
        newScores.push(entryToSave);
      });
      
      updatedEvent = {
        ...event,
        scores: newScores,
        scoreLogs: [...logsArray, ...event.scoreLogs],
        localUpdatedAt: new Date().toISOString()
      };

      return {
        ...prev,
        events: prev.events.map(e => e.id === event.id ? updatedEvent! : e)
      };
    });

    setHasPendingChanges(true);

    // Direct Sync to Cloud (Parking Lot to Highway)
    if (updatedEvent) {
      await saveEventToCloud(updatedEvent);
      setHasPendingChanges(false);
    }
  };

  const onResetScores = async () => {
    if (!activeEvent) return;
    if (!confirm("PERINGATAN: Ini akan MENGHAPUS SEMUA SKOR secara permanen dari Cloud dan Lokal. Lanjutkan?")) return;

    const now = Date.now();
    let updatedEvent: ArcheryEvent | null = null;

    setAppState(prev => {
      const event = prev.events.find(e => e.id === activeEvent.id);
      if (!event) return prev;
      
      updatedEvent = {
        ...event,
        scores: [], 
        scoreLogs: [
          {
            id: 'reset_' + now,
            archerId: 'SYSTEM',
            oldTotal: 0,
            newTotal: 0,
            timestamp: now,
            reason: "PERMANENT HARD RESET",
            operatorName: "ADMIN"
          },
          ...event.scoreLogs
        ],
        settings: {
          ...event.settings,
          lastResetAt: now 
        },
        localUpdatedAt: new Date().toISOString()
      };

      return {
        ...prev,
        events: prev.events.map(e => e.id === event.id ? updatedEvent! : e)
      };
    });

    setHasPendingChanges(true);
    if (updatedEvent) {
      await saveEventToCloud(updatedEvent);
      setHasPendingChanges(false);
      pushNotification("Reset Berhasil", "Semua skor telah dihapus dari cloud.", "SUCCESS");
    }
  };

  const onResetSystemData = async () => {
    if (!appState.currentUser?.isSuperAdmin) return;
    if (!confirm("PERINGATAN KRITIS: Anda akan menghapus SELURUH DATA SISTEM (Events, Profiles, Configs) dari Cloud. Tindakan ini tidak dapat dibatalkan. Lanjutkan?")) return;
    if (!confirm("KONFIRMASI TERAKHIR: Semua data akan hilang selamanya. Anda yakin?")) return;

    setIsSyncing(true);
    try {
      pushNotification("Hard Reset", "Memulai pembersihan data cloud...", "WARNING");
      
      // 1. Delete all events
      const eventsSnap = await getDocs(collection(db, 'events'));
      for (const d of eventsSnap.docs) {
        await deleteDoc(doc(db, 'events', d.id));
      }

      // 2. Delete all profiles (except self)
      const profilesSnap = await getDocs(collection(db, 'profiles'));
      for (const d of profilesSnap.docs) {
        if (d.id !== appState.currentUser.id) {
          await deleteDoc(doc(db, 'profiles', d.id));
        }
      }

      // 3. Reset Global Settings to null/defaults
      const initialSettings: GlobalSettings = {
        feeAdult: 0, 
        feeKids: 0, 
        maintenanceMode: false,
        contactSupport: '', 
        bankProvider: '',
        bankAccountNumber: '', 
        bankAccountName: '',
        dataRetentionDays: 90, 
        practiceRetentionDays: 7,
        paymentGatewayProvider: 'NONE',
        paymentGatewayIsProduction: false,
        platformFeePercentage: 0
      };
      
      await setDoc(doc(db, 'systemConfigs', 'global'), { 
        id: 'global', 
        data: initialSettings, 
        updatedAt: new Date().toISOString() 
      });

      // Clear Local Storage - CRITICAL to prevent re-syncing old data back to cloud
      localStorage.removeItem(STORAGE_KEY);
      localStorage.clear();

      pushNotification("Reset Berhasil", "Sistem telah dibersihkan. Memuat ulang...", "SUCCESS");
      
      // Force reload state
      setAppState(prev => ({
        ...prev,
        events: [],
        users: prev.users.filter(u => u.id === appState.currentUser?.id),
        globalSettings: initialSettings,
        activeEventId: null
      }));

      setTimeout(() => window.location.reload(), 2000);

    } catch (err: any) {
      console.error("Hard Reset Error:", err);
      pushNotification("Reset Gagal", err.message, "WARNING");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateGlobalSettings = (newSettings: GlobalSettings) => {
    setAppState(prev => {
      const newState = { ...prev, globalSettings: newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
    setHasPendingChanges(true);
    // Trigger immediate sync for global settings
    setTimeout(() => syncCloudData(true), 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-arcus-red selection:text-white relative">
      <Toaster position="top-right" richColors closeButton toastOptions={{ className: 'print:hidden' }} />
      {/* Global Cloud Sync Status Bar */}
      <div className={`fixed top-0 left-0 right-0 z-[200] px-4 py-1.5 flex items-center justify-between transition-all duration-500 border-b shadow-sm print:hidden ${
        !db ? 'bg-emerald-500 text-white border-emerald-600' :
        isSyncing ? 'bg-blue-600 text-white border-blue-700' :
        hasPendingChanges ? 'bg-indigo-600 text-white border-indigo-700' :
        'bg-slate-900 text-white border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          {!db ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-white animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest">MODE LOKAL (Cloud Offline)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-white animate-pulse' : (hasPendingChanges ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500')}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {isSyncing ? 'Sinkronisasi Cloud...' : (hasPendingChanges ? 'Data belum sinkron...' : 'Cloud Terhubung')}
              </span>
            </div>
          )}
          {lastSync && (
            <span className="hidden lg:inline text-[8px] font-bold opacity-50 uppercase tracking-tighter">
              Update: {lastSync.toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {(window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) && (
            <div className="hidden md:flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-[8px] font-black animate-pulse">
              <Monitor className="w-3 h-3" /> LOCAL ENVIRONMENT
            </div>
          )}
          {appState.currentUser && (
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">
              {appState.currentUser.email}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(isSplashVisible || isCheckingLink) && (
          <motion.div 
            key="splash"
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[10000] bg-slate-900 flex flex-col items-center justify-center p-8 overflow-hidden"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-arcus-red/20 blur-[120px] rounded-full scale-150 animate-pulse" />
              <ArcusLogo className="w-40 h-40 md:w-56 md:h-56 text-white relative z-10 filter drop-shadow-[0_0_50px_rgba(239,68,68,0.5)]" />
            </motion.div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 text-center relative z-10"
            >
              <h1 className="text-5xl md:text-7xl font-black font-oswald text-white uppercase italic tracking-tighter leading-none">
                ARCUS <span className="text-arcus-red">ARCHERY</span>
              </h1>
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-arcus-red rounded-full animate-ping" />
                  <p className="text-[12px] font-black text-white/40 uppercase tracking-[0.5em]">
                    {isCheckingLink ? 'VALIDATING LINK...' : 'TOURNAMENT OS INITIALIZING'}
                  </p>
                </div>
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-1/2 h-full bg-arcus-red shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <main className="min-h-screen pt-10 sm:pt-11">
        {view === 'LANDING' && (
          <LandingPage 
            events={appState.events.filter(e => !e.settings.isPractice && e.status !== 'DRAFT')} 
            onViewLive={(id) => { setAppState(prev => ({ ...prev, activeEventId: id })); setView('PUBLIC_LIVE'); }} 
            onViewParticipants={(id) => { setAppState(prev => ({ ...prev, activeEventId: id })); setView('PUBLIC_ENTRY_LIST'); }} 
            onViewInfo={(id) => { setAppState(prev => ({ ...prev, activeEventId: id })); setView('PUBLIC_EVENT_INFO'); }} 
            onRegister={(id) => { 
              console.log("App: onRegister called for", id);
              setAppState(prev => ({ ...prev, activeEventId: id })); 
              setView('REGISTER_PARTICIPANT'); 
              pushNotification("Membuka Pendaftaran", "Menyiapkan formulir pendaftaran...", "INFO");
            }}
            onScorerLogin={() => setView('SCORER_LOGIN')}
            onRefresh={() => fetchCloudData(true)}
            isSyncing={isSyncing}
            onShare={handleShare} 
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
                const updatedEvents = prev.events.map(e => {
                  if (!e.settings.organizerId || e.settings.organizerId === 'guest') {
                    const updated = { ...e, settings: { ...e.settings, organizerId: u.id } };
                    // Sync this specific event to cloud
                    saveEventToCloud(updated);
                    return updated;
                  }
                  return e;
                });
                return { ...prev, currentUser: u, events: updatedEvents };
              }); 
              setView('MEMBER_DASHBOARD'); 
              // Clear URL params to avoid re-triggering login view if we came from a link
              window.history.replaceState({}, document.title, window.location.pathname);
            }} 
            onRegister={async (u) => {
              setAppState(prev => ({ ...prev, users: [...prev.users, u] }));
              if (db) {
                await setDoc(doc(db, 'profiles', u.id), {
                  id: u.id,
                  data: u,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
              }
            }} 
            onUpdateUser={async (u) => {
              setAppState(prev => ({ ...prev, users: prev.users.map(usr => usr.id === u.id ? u : usr) }));
              if (db) {
                try {
                  await setDoc(doc(db, 'profiles', u.id), u, { merge: true });
                  pushNotification("Profil Diperbarui", "User berhasil diperbarui di cloud.", "SUCCESS");
                } catch (err: any) {
                  handleFirestoreError(err, OperationType.WRITE, `profiles/${u.id}`);
                }
              }
            }} 
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
                handleUpdateEvent(event.id, { 
                  status: 'UPCOMING', 
                  settings: { ...event.settings, isActivated: true } 
                });
                setView('EVENT_ADMIN');
                pushNotification("Aktivasi Berhasil", `Turnamen "${event.settings.tournamentName}" telah diaktifkan dan sekarang publik.`, "SUCCESS");
                
                // Force comprehensive sync to ensure everyone else sees it
                setTimeout(() => syncCloudData(true), 800);
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
                    throw new Error(result.error || result.message || "Gagal mengirim email");
                  }

                  if (result.isSimulated) {
                    pushNotification("Mode Simulasi", "Kode aktivasi (Simulasi): " + event.settings.activationCode, "SUCCESS");
                  } else {
                    pushNotification("Email Terkirim", "Kode aktivasi telah dikirim ulang ke email Anda.", "INFO");
                  }
                } catch (err: any) {
                  console.error("Failed to resend activation email", err);
                  pushNotification("Gagal Kirim Email", err.message, "WARNING");
                }
              }
            }}
          />
        )}

        {view === 'RESET_PASSWORD' && (
          <ResetPasswordPanel 
            onSuccess={() => setView('LOGIN')}
            onBack={() => setView('LANDING')}
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
              
              setAppState(prev => {
                const newState = { ...prev, events: [e, ...prev.events], activeEventId: e.id };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
                return newState;
              });
              
              saveEventToCloud(e);
              setView('ACTIVATE_TOURNAMENT'); 
              
              fetch('/api/send-email-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: appState.currentUser!.email,
                  subject: "Aktivasi Turnamen ARCUS",
                  message: `Halo ${appState.currentUser!.name},\n\nKode aktivasi untuk turnamen "${n}" adalah: ${activationCode}\n\nSilakan masukkan kode ini di dashboard untuk mengaktifkan turnamen Anda.`
                })
              }).then(async (response) => {
                const result = await response.json();
                if (!response.ok || !result.success) {
                  throw new Error(result.message || "Gagal mengirim email");
                }
                
                if (result.isSimulated) {
                  pushNotification("Mode Simulasi", "Kode aktivasi (Simulasi): " + activationCode, "SUCCESS");
                } else {
                  pushNotification("Email Terkirim", "Kode aktivasi telah dikirim ke email Anda.", "INFO");
                }
              }).catch((err) => {
                console.error("Failed to send activation email", err);
                pushNotification("Gagal Kirim Email", "Gagal mengirim kode aktivasi otomatis. Gunakan tombol Kirim Ulang.", "WARNING");
              });
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
            onCreateSelfPractice={() => {}} 
            onManageEvent={(id) => { 
                const ev = appState.events.find(e => e.id === id); 
                setAppState(prev => ({ ...prev, activeEventId: id })); 
                if (ev?.status === 'DRAFT') {
                  setView('ACTIVATE_TOURNAMENT');
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
            onRefreshData={() => fetchCloudData(true)} 
            onSyncNow={() => syncCloudData(true)}
            isSyncing={isSyncing}
            lastSync={lastSync}
            onShare={handleShare} 
            onGoToSuperAdmin={() => setView('SUPER_ADMIN')} 
          />
        )}
        {view === 'SUPER_ADMIN' && appState.currentUser?.isSuperAdmin && (
          <SuperAdminPanel 
            state={appState} 
            onUpdateSettings={handleUpdateGlobalSettings} 
            onResetSystemData={onResetSystemData}
            onUpdateEvent={handleUpdateEvent} 
            onDeleteEvent={handleDeleteEvent} 
            onDeleteUser={handleDeleteUser} 
            onUpdateUser={async (u) => {
              setAppState(prev => ({ ...prev, users: prev.users.map(usr => usr.id === u.id ? u : usr) }));
              if (db) {
                try {
                  await setDoc(doc(db, 'profiles', u.id), u);
                  pushNotification("Profil Diperbarui", "User berhasil diperbarui di cloud.", "SUCCESS");
                } catch (err: any) {
                  handleFirestoreError(err, OperationType.WRITE, `profiles/${u.id}`);
                }
              }
            }} 
            onSendNotif={(n) => setAppState(prev => ({ ...prev, notifications: [n, ...prev.notifications] }))} 
            onBack={() => setView('MEMBER_DASHBOARD')} 
          />
        )}
        {view === 'PROFILE' && appState.currentUser && <ProfilePanel user={appState.currentUser} eventsManaged={appState.events.filter(e => e.settings.organizerId === appState.currentUser?.id).length} onUpdate={(u) => setAppState(prev => ({ ...prev, users: prev.users.map(usr => usr.id === u.id ? u : usr), currentUser: u }))} onBack={() => setView('MEMBER_DASHBOARD')} contactSupport={appState.globalSettings.contactSupport} />}
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
                <button onClick={() => setView('ID_CARD_EDITOR')} className="group p-5 md:p-8 bg-blue-50 rounded-[1.5rem] md:rounded-[2rem] border border-blue-100 hover:bg-blue-100 transition-all text-left relative overflow-hidden active:scale-95">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-blue-600 transition-all border border-blue-100">
                      <CreditCard className="w-5 h-5 text-blue-500 group-hover:text-white transition-colors" />
                    </div>
                    <p className="font-black uppercase font-oswald italic text-lg md:text-xl tracking-tighter text-blue-900 mb-0.5 md:mb-1 leading-none">ID CARD</p>
                    <p className="text-[8px] md:text-[9px] font-black text-blue-600/40 uppercase tracking-widest">Desain & Cetak</p>
                </button>
            </div>
          </div>
        )}
        {view === 'SETTINGS' && activeEvent && (
          <AdminPanel 
            eventId={activeEvent.id}
            settings={activeEvent.settings} 
            scorerAccess={activeEvent.scorerAccess || []}
            isSuperAdmin={appState.currentUser?.isSuperAdmin}
            onSave={(s) => handleUpdateEvent(activeEvent.id, { settings: s })} 
            onUpdateScorers={(scorers) => handleUpdateEvent(activeEvent.id, { scorerAccess: scorers })}
            onClear={() => {}} 
            onDelete={() => handleDeleteEvent(activeEvent.id)} 
            onBack={() => setView('EVENT_ADMIN')} 
            onOpenTV={() => {
              setLiveBoardTVMode(true);
              setView('LIVE');
            }}
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
            onGoToIdCardEditor={() => setView('ID_CARD_EDITOR')}
            onRefreshData={() => fetchCloudData(true)}
            onPushToCloud={() => syncCloudData(true)}
            isPushing={isSyncing}
            onBack={() => setView('EVENT_ADMIN')} 
          />
        )}
        {view === 'ID_CARD_EDITOR' && activeEvent && (
          <IdCardEditor 
            archers={activeEvent.archers} 
            settings={activeEvent.settings} 
            onBack={() => setView('ARCHERS')} 
          />
        )}
        {view === 'OFFICIALS' && activeEvent && (
          <OfficialList 
            officials={activeEvent.archers.filter(a => a.category === CategoryType.OFFICIAL)}
            settings={activeEvent.settings}
            onUpdate={(o) => handleUpdateEvent(activeEvent.id, { archers: activeEvent.archers.map(arc => arc.id === o.id ? o : arc) })}
            onRemove={(id) => handleUpdateEvent(activeEvent.id, { archers: activeEvent.archers.filter(a => a.id !== id) })}
            onGoToIdCardEditor={() => setView('ID_CARD_EDITOR')}
            onBack={() => setView('EVENT_ADMIN')}
          />
        )}
        {view === 'SCORING' && activeEvent && <ScoringPanel state={activeEvent} onSaveScore={onSaveScore} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'QUICK_SCORING' && activeEvent && <QuickScoringPanel event={activeEvent} onSaveScore={onSaveScore} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'OPERATOR_CENTER' && activeEvent && <OperatorCenter event={activeEvent} onSaveScore={onSaveScore} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'ELIMINATION' && activeEvent && <EliminationPanel event={activeEvent} onUpdateMatches={(m) => handleUpdateEvent(activeEvent.id, { matches: m })} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'RESULTS' && activeEvent && <ResultsPanel state={activeEvent} onResetScores={onResetScores} onBack={() => setView('EVENT_ADMIN')} />}
        {view === 'FINANCE' && activeEvent && (
          <FinancePanel 
            event={activeEvent} 
            globalSettings={appState.globalSettings}
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
        {view === 'LIVE' && activeEvent && (
          <LiveScoreboard 
            state={activeEvent} 
            startInTVMode={liveBoardTVMode}
            onBack={() => {
              setLiveBoardTVMode(false);
              setView('EVENT_ADMIN');
            }} 
          />
        )}
        {view === 'REGISTER_PARTICIPANT' && activeEvent && <OnlineRegistration event={activeEvent} globalSettings={appState.globalSettings} onRegister={async (r) => {
          const pin = Math.floor(1000 + Math.random() * 9000).toString();
          const newArcher: Archer = {
            ...r,
            targetNo: 0,
            position: 'A',
            wave: 1,
            pin: pin
          };

          const registerLocallyOnly = () => {
            setAppState(prev => {
              const event = prev.events.find(e => e.id === (activeEvent as any).id);
              if (!event) return prev;
              const updatedEvent = { 
                ...event, 
                registrations: [...(event.registrations || []), r],
                archers: [...(event.archers || []), newArcher],
                localUpdatedAt: new Date().toISOString()
              };
              const newState = {
                ...prev,
                events: prev.events.map(e => e.id === event.id ? updatedEvent : e)
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
              return newState;
            });
            setHasPendingChanges(true);
            pushNotification("Pendaftaran Lokal", "Data disimpan di perangkat. Akan dikirim ke cloud saat online.", "INFO");
          };

          if (!isOnline) {
            registerLocallyOnly();
            return;
          }

          try {
            const response = await fetch('/api/register-participant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventId: activeEvent.id,
                registration: r,
                archer: newArcher
              })
            });
            
            const result = await response.json();
            
            if (!result.success) {
              throw new Error(result.error || "Gagal menyimpan pendaftaran ke cloud");
            }

            pushNotification("Pendaftaran Berhasil", `Selamat ${r.name}, pendaftaran cloud sukses!`, "SUCCESS");
            
            // Sync local state for immediate feedback
            setAppState(prev => {
              const event = prev.events.find(e => e.id === (activeEvent as any).id);
              if (!event) return prev;
              const updatedEvent = { 
                ...event, 
                registrations: [...(event.registrations || []), r],
                archers: [...(event.archers || []), newArcher],
                localUpdatedAt: new Date().toISOString()
              };
              const newState = {
                ...prev,
                events: prev.events.map(e => e.id === event.id ? updatedEvent : e)
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
              return newState;
            });

            // Re-fetch after a short delay to ensure everything is synced
            setTimeout(() => {
              fetchCloudData(true);
            }, 3000);

            // Auto-send confirmation email
            const isAutoConfirm = r.status === 'APPROVED' || r.status === 'PAID';
            const subject = isAutoConfirm ? `Konfirmasi Pendaftaran: ${activeEvent.settings.tournamentName}` : `Pendaftaran Diterima: ${activeEvent.settings.tournamentName}`;
            const message = isAutoConfirm 
              ? `Halo ${r.name},\n\nTerima kasih telah mendaftar di event "${activeEvent.settings.tournamentName}".\n\nPendaftaran Anda telah BERHASIL diverifikasi.\n\nLihat daftar peserta: ${window.location.origin}?event=${activeEvent.id}&view=entry-list\n\nSelamat bertanding!`
              : `Halo ${r.name},\n\nPendaftaran Anda untuk event "${activeEvent.settings.tournamentName}" telah kami terima.\n\nStatus: Menunggu Verifikasi Pembayaran.\n\nKami akan mengirimkan email konfirmasi setelah pembayaran Anda diverifikasi oleh panitia.`;

            await fetch('/api/send-email-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: r.email,
                subject,
                message
              })
            });
            
          } catch (error: any) {
            console.error("Online registration error:", error);
            registerLocallyOnly();
            pushNotification("Cloud Error", "Gagal mengirim ke cloud, data disimpan secara lokal sementara.", "WARNING");
          }
        }} onBack={() => setView('LANDING')} onViewParticipants={() => setView('PUBLIC_ENTRY_LIST')} />}
        {view === 'PUBLIC_LIVE' && activeEvent && (
          <LiveScoreboard state={activeEvent} onBack={() => setView('LANDING')} />
        )}
        {view === 'PUBLIC_ENTRY_LIST' && activeEvent && (
          <EntryList 
            event={activeEvent} 
            onBack={() => setView('LANDING')} 
            onRefresh={() => fetchCloudData(true)}
            isSyncing={isSyncing}
          />
        )}
        {view === 'PUBLIC_EVENT_INFO' && activeEvent && (
          <EventInfo 
            event={activeEvent} 
            onBack={() => setView('LANDING')} 
            onRegister={() => setView('REGISTER_PARTICIPANT')} 
            onShare={() => handleShare(appState.activeEventId!)} 
            onViewParticipants={() => setView('PUBLIC_ENTRY_LIST')}
          />
        )}
        {(view === 'PRIVACY' || view === 'TERMS' || view === 'DOCUMENTATION') && (
          <LegalDoc type={view} onBack={() => setView('LANDING')} />
        )}
      </main>

      <footer className="py-12 bg-white border-t border-slate-100 print:hidden">
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

      <AnimatePresence>
        {showInstallBanner && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 sm:bottom-12 left-6 right-6 md:left-auto md:right-12 md:max-w-md z-[1000] bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl border border-white/10"
          >
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-arcus-red rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg rotate-3">
                <ArcusLogo className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-black font-oswald uppercase italic tracking-tight">Instal Arcus Archery</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                  Akses lebih cepat, offline ready, dan pengalaman aplikasi yang lebih lancar di perangkat Anda.
                </p>
              </div>
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mt-8 flex gap-3">
              <button 
                onClick={handleInstallClick}
                className="flex-1 bg-white text-slate-900 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-arcus-red hover:text-white transition-all active:scale-95 shadow-xl"
              >
                Instal Sekarang
              </button>
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="px-6 py-5 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-white transition-all"
              >
                Nanti
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareModal 
        isOpen={shareData.isOpen} 
        onClose={() => setShareData(prev => ({ ...prev, isOpen: false }))} 
        tournamentName={shareData.name} 
        url={shareData.url} 
        registerUrl={shareData.registerUrl}
      />
    </div>
  );
}

export default App;