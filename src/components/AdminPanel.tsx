
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, Calendar, ImageIcon, FileText, Trophy, Target as TargetIcon, 
  Upload, Trash2, Plus, Landmark, CreditCard, X, MapPin, 
  Link as LinkIcon, Info, Hash, Repeat, Compass, Layers, 
  Users as UsersIcon, AlertTriangle, AlertCircle, ShieldCheck, Zap, ToggleRight, ToggleLeft, Globe,
  FileDown, ExternalLink, HelpCircle, Check, ChevronLeft, Smartphone, Clock, Swords, Monitor
} from 'lucide-react';
import { TournamentSettings, CategoryType, TargetType, PaymentMethod, ScorerAccess, CategoryConfig } from '../types';
import { CATEGORY_LABELS, TARGET_LABELS } from '../constants';

interface Props {
  eventId: string;
  settings: TournamentSettings;
  scorerAccess?: ScorerAccess[];
  status: string;
  onSave: (settings: TournamentSettings, status?: any) => void;
  onUpdateScorers?: (scorers: ScorerAccess[]) => void;
  onClear: () => void;
  onDelete?: () => void;
  onBack: () => void;
  onOpenTV?: () => void;
  isSuperAdmin?: boolean;
}

const AdminPanel: React.FC<Props> = ({ eventId, settings, status: currentStatus, scorerAccess = [], onSave, onUpdateScorers, onClear, onDelete, onBack, onOpenTV, isSuperAdmin = false }) => {
  const [localSettings, setLocalSettings] = useState<TournamentSettings>(() => {
    const savedDraft = localStorage.getItem(`admin_draft_${eventId}`);
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) { console.error("Draft parse failed", e); }
    }
    return {
      ...settings,
      categoryConfigs: settings.categoryConfigs || {}
    };
  });
  const isPractice = localSettings.isPractice;
  const [isDirty, setIsDirty] = useState(false);
  const [localScorers, setLocalScorers] = useState<ScorerAccess[]>(scorerAccess);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  // Sync draft to localStorage when settings change
  useEffect(() => {
    if (isDirty) {
      localStorage.setItem(`admin_draft_${eventId}`, JSON.stringify(localSettings));
    }
  }, [localSettings, eventId, isDirty]);

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'PAYMENT' | 'SCORERS'>('GENERAL');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUploadGuide, setShowUploadGuide] = useState(false);
  const [showSavedFlag, setShowSavedFlag] = useState(false);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);
  const [showModeConfirm, setShowModeConfirm] = useState<{ isOpen: boolean; next: boolean; msg: string }>({ isOpen: false, next: false, msg: '' });
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  
  // Only sync from props if the tournament name changes (indicating a different event)
  // or if we're not currently editing (not dirty)
  useEffect(() => {
    if (!isDirty) {
      setLocalSettings(settings);
      setLocalScorers(scorerAccess);
    }
  }, [settings, scorerAccess, isDirty]);

  const updateSettings = (updates: Partial<TournamentSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
    // Clear validation error when user types
    if (Object.keys(updates).length > 0) {
      const field = Object.keys(updates)[0];
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateCategoryConfig = (cat: CategoryType, field: keyof CategoryConfig, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      categoryConfigs: {
        ...prev.categoryConfigs,
        [cat]: { 
          ...(prev.categoryConfigs?.[cat] as CategoryConfig), 
          [field]: value 
        }
      }
    }));
    setIsDirty(true);
  };

  const addCategory = (cat: CategoryType) => {
    if (localSettings.categoryConfigs?.[cat]) return;
    setLocalSettings(prev => ({
      ...prev,
      categoryConfigs: {
        ...(prev.categoryConfigs || {}),
        [cat]: {
          registrationFee: 0,
          distance: '20m',
          arrows: 36,
          ends: 6,
          targetType: TargetType.STANDARD,
          h2hStartSize: 0,
          eliminationStages: []
        }
      }
    }));
    setIsDirty(true);
  };

  const removeCategory = (cat: CategoryType) => {
    setLocalSettings(prev => {
      const newConfigs = { ...(prev.categoryConfigs || {}) };
      delete newConfigs[cat];
      return { ...prev, categoryConfigs: newConfigs };
    });
    setIsDirty(true);
  };

  const addPaymentMethod = () => {
    const newPm: PaymentMethod = {
      id: 'pm_' + Math.random().toString(36).substr(2, 9),
      provider: 'BCA',
      accountName: 'Bendahara',
      accountNumber: ''
    };
    setLocalSettings(prev => ({ ...prev, paymentMethods: [...(prev.paymentMethods || []), newPm] }));
    setIsDirty(true);
  };

  const removePaymentMethod = (id: string) => {
    setLocalSettings(prev => ({ ...prev, paymentMethods: (prev.paymentMethods || []).filter(pm => pm.id !== id) }));
    setIsDirty(true);
  };

  const updatePaymentMethod = (id: string, field: keyof PaymentMethod, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      paymentMethods: (prev.paymentMethods || []).map(pm => pm.id === id ? { ...pm, [field]: value } : pm)
    }));
    setIsDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleFinalSave = () => {
    const errors: Record<string, string> = {};
    
    // Validation for Tournament (not practice)
    if (!localSettings.isPractice) {
      if (!localSettings.tournamentName?.trim()) errors.tournamentName = 'Nama Turnamen wajib diisi';
      if (!localSettings.description?.trim()) errors.description = 'Deskripsi wajib diisi agar peserta paham';
      if (!localSettings.location?.trim()) errors.location = 'Lokasi wajib diisi';
      if (!localSettings.eventDate?.trim()) errors.eventDate = 'Tanggal wajib diisi';
      
      // These are often missed
      if (!localSettings.pamphletUrl?.trim()) errors.pamphletUrl = 'Link Gambar Pamflet diperlukan untuk tampilan Landing Page';
      if (!localSettings.thbUrl?.trim()) errors.thbUrl = 'Link THB (PDF) diperlukan sebagai panduan peserta';
      
      if ((localSettings.paymentMethods || []).length === 0) {
        errors.paymentMethods = 'Minimal harus ada 1 Rekening Pembayaran agar peserta bisa mendaftar online';
      }

      // Check categories - at least one needed for registration
      if (Object.keys(localSettings.categoryConfigs || {}).length === 0) {
        errors.categories = 'Minimal harus ada 1 Kategori yang aktif';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowValidationSummary(true);
      setShowConfirmModal(false);
      
      // Auto-switch tab if error is in another tab (though mostly in General)
      if (errors.paymentMethods && activeTab !== 'PAYMENT') setActiveTab('PAYMENT');
      else if (activeTab !== 'GENERAL') setActiveTab('GENERAL');
      
      // Scroll to top to see summary
      const form = document.getElementById('settings-form');
      if (form) form.scrollIntoView({ behavior: 'smooth' });
      
      return;
    }

    executeFinalSave();
  };

  const executeFinalSave = () => {
    // Determine status based on activation
    const status = localSettings.isActivated ? (currentStatus === 'DRAFT' ? 'ACTIVE' : currentStatus) : 'DRAFT';
    
    onSave(localSettings, status as any);
    if (onUpdateScorers) onUpdateScorers(localScorers);
    
    // Clear draft
    localStorage.removeItem(`admin_draft_${eventId}`);
    
    setShowConfirmModal(false);
    setShowDraftConfirm(false);
    setShowSavedFlag(true);
    setIsDirty(false);
    setTimeout(() => setShowSavedFlag(false), 3000);
  };

  const addScorer = () => {
    const newScorer: ScorerAccess = {
      id: 'scr_' + Math.random().toString(36).substr(2, 9),
      name: '',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      accessCode: Math.floor(1000 + Math.random() * 9000).toString(),
      eventId: '', // Filled by parent
      permissions: ['INPUT_SCORE']
    };
    setLocalScorers([...localScorers, newScorer]);
    setIsDirty(true);
  };

  const removeScorer = (id: string) => {
    setLocalScorers(localScorers.filter(s => s.id !== id));
    setIsDirty(true);
  };

  const updateScorer = (id: string, field: keyof ScorerAccess, value: any) => {
    setLocalScorers(localScorers.map(s => s.id === id ? { ...s, [field]: value } : s));
    setIsDirty(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const executeDelete = () => {
    if (onDelete) onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50" id="settings-form">
      {/* Saved Success Flag */}
      {showSavedFlag && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-600 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/20">
            <Check className="w-6 h-6" />
            <span className="text-sm font-black uppercase tracking-widest">Pengaturan Berhasil Disimpan</span>
          </div>
        </div>
      )}

      {/* Validation Warning Bar */}
      {showValidationSummary && !showSavedFlag && (
        <div className="sticky top-0 z-[110] bg-amber-500 text-white px-6 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Gagal Menyimpan: {Object.keys(validationErrors).length} Informasi Penting Belum Terisi
            </span>
          </div>
          <button onClick={() => setShowValidationSummary(false)} className="p-1 hover:bg-white/20 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (isDirty) {
                  setShowUnsavedConfirm(true);
                } else {
                  onBack();
                }
              }}
              className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-arcus-red transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black font-oswald uppercase italic leading-none tracking-tighter text-slate-900">
                  {isPractice ? 'KONFIGURASI' : 'KONTROL'}
                </h1>
                {isDirty && (
                  <span className="bg-amber-100 text-amber-700 text-[6px] md:text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-widest border border-amber-200 animate-pulse">
                    UNSAVED
                  </span>
                )}
                {!isPractice && (
                  <div className="flex flex-col">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Public Status</p>
                    <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${localSettings.isActivated !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse'}`}>
                      {localSettings.isActivated !== false ? (
                        <>
                          <Globe className="w-3 h-3 text-emerald-500" /> PUBLISHED
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3 text-orange-500" /> NEEDS ACTIVATION
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[7px] md:text-[9px] font-bold text-slate-900 uppercase tracking-widest mt-0.5 italic truncate max-w-[120px] md:max-w-none">
                {isPractice ? 'Sesi Scoring' : `EVENT: ${localSettings.tournamentName || 'Untitled'}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onOpenTV && (
              <button 
                onClick={onOpenTV}
                className="hidden lg:flex px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest items-center gap-3 text-white hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                <Monitor className="w-4 h-4 shadow-sm" /> BIG SCREEN MODE
              </button>
            )}
            <button 
              onClick={onClear}
              className="hidden sm:flex px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:text-red-600 transition-all font-sans"
            >
              RESET
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!isDirty}
              className={`flex-1 md:flex-none px-6 md:px-8 py-2.5 md:py-3 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 transition-all active:scale-95 ${isDirty ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
            >
              <Save className="w-3.5 h-3.5 md:w-4 md:h-4" /> SIMPAN <span className="hidden sm:inline">KONFIGURASI</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-2 overflow-x-auto no-scrollbar">
          <div className="flex self-start w-fit border-b border-slate-100">
            <button 
              type="button"
              onClick={() => setActiveTab('GENERAL')}
              className={`px-4 md:px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 whitespace-nowrap relative ${activeTab === 'GENERAL' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Trophy className={`w-3.5 h-3.5 ${activeTab === 'GENERAL' ? 'text-arcus-red' : ''}`} /> INFO & KATEGORI
              {activeTab === 'GENERAL' && <motion.div layoutId="admTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-arcus-red" />}
            </button>
            {!isPractice && (
              <button 
                type="button"
                onClick={() => setActiveTab('PAYMENT')}
                className={`px-4 md:px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 whitespace-nowrap relative ${activeTab === 'PAYMENT' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <Landmark className={`w-3.5 h-3.5 ${activeTab === 'PAYMENT' ? 'text-arcus-red' : ''}`} /> PEMBAYARAN
                {activeTab === 'PAYMENT' && <motion.div layoutId="admTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-arcus-red" />}
              </button>
            )}
            <button 
              type="button"
              onClick={() => setActiveTab('SCORERS')}
              className={`px-4 md:px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 whitespace-nowrap relative ${activeTab === 'SCORERS' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${activeTab === 'SCORERS' ? 'text-arcus-red' : ''}`} /> AKSES PANITIA
              {activeTab === 'SCORERS' && <motion.div layoutId="admTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-arcus-red" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 pb-32">
        <form onSubmit={handleSubmit} className="space-y-16">
          
          {activeTab === 'GENERAL' && (
            <div className="space-y-16 animate-in fade-in duration-500">
              {/* Validation Summary Box */}
              {Object.keys(validationErrors).length > 0 && (
                <div className="p-6 bg-red-50 border-2 border-red-200 rounded-[2rem] space-y-4 animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-3 text-red-600">
                    <AlertTriangle className="w-6 h-6" />
                    <h4 className="text-sm font-black uppercase tracking-widest">Wajib Dilengkapi:</h4>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    {Object.values(validationErrors).map((err, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] font-bold text-red-700 italic">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                        {err}
                      </li>
                    ))}
                  </ul>
                  <p className="pt-2 text-[9px] font-medium text-red-500 italic border-t border-red-100">
                    * Pastikan semua field yang ditandai merah sudah diisi agar Turnamen Anda dapat aktif/publik di Landing Page.
                  </p>
                </div>
              )}

              {/* Section: Basic Identity */}
              <div className="space-y-8">
             <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className={`p-2 rounded-xl ${isPractice ? 'bg-teal-50' : 'bg-red-50'}`}>
                  <Info className={`w-5 h-5 ${isPractice ? 'text-teal-600' : 'text-arcus-red'}`} />
                </div>
                <h3 className="text-xl font-black font-oswald uppercase italic text-slate-800">Identitas & Sesi</h3>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <label className="block group">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Nama Sesi / Turnamen</span>
                        {validationErrors.tournamentName && <span className="text-[9px] font-bold text-red-500 italic">{validationErrors.tournamentName}</span>}
                      </div>
                      <input 
                        type="text" 
                        value={localSettings.tournamentName} 
                        onChange={e => updateSettings({ tournamentName: e.target.value })} 
                        className={`mt-1 block w-full rounded-lg p-3 border font-bold text-base outline-none transition-all text-slate-900 ${validationErrors.tournamentName ? 'border-red-500 bg-red-50 focus:border-red-600' : 'border-slate-200 focus:border-arcus-red'}`} 
                        required 
                      />
                    </label>

                    <label className="block group">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Keterangan Singkat</span>
                        {validationErrors.description && <span className="text-[9px] font-bold text-red-500 italic">{validationErrors.description}</span>}
                      </div>
                      <textarea 
                        value={localSettings.description} 
                        onChange={e => updateSettings({ description: e.target.value })} 
                        className={`mt-1 block w-full rounded-lg p-3 border font-bold text-sm outline-none transition-all h-24 resize-none text-slate-900 ${validationErrors.description ? 'border-red-500 bg-red-50 focus:border-red-600' : 'border-slate-200 focus:border-arcus-red'}`} 
                        placeholder="Deskripsi turnamen..."
                      />
                    </label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block group">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Lokasi</span>
                          {validationErrors.location && <span className="text-[9px] font-bold text-red-500 italic">{validationErrors.location}</span>}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Lokasi..." 
                          value={localSettings.location} 
                          onChange={e => updateSettings({ location: e.target.value })} 
                          className={`block mt-1 w-full rounded-lg p-3 border font-bold outline-none transition-all text-slate-900 ${validationErrors.location ? 'border-red-500 bg-red-50 focus:border-red-600' : 'border-slate-200 focus:border-arcus-red'}`} 
                        />
                      </label>

                      <label className="block group">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Tanggal</span>
                          {validationErrors.eventDate && <span className="text-[9px] font-bold text-red-500 italic">{validationErrors.eventDate}</span>}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Tanggal..." 
                          value={localSettings.eventDate} 
                          onChange={e => updateSettings({ eventDate: e.target.value })} 
                          className={`block mt-1 w-full rounded-lg p-3 border font-bold outline-none transition-all text-slate-900 ${validationErrors.eventDate ? 'border-red-500 bg-red-50 focus:border-red-600' : 'border-slate-200 focus:border-arcus-red'}`} 
                        />
                      </label>
                    </div>

                    {!isPractice && (
                      <div className="space-y-6 pt-4 border-t border-slate-100">
                        <label className="block group">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3.5 h-3.5 text-arcus-red" />
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Batas Akhir Pendaftaran Online</span>
                          </div>
                          <input 
                            type="datetime-local" 
                            value={localSettings.registrationDeadline || ''} 
                            onChange={e => updateSettings({ registrationDeadline: e.target.value })} 
                            className="block w-full rounded-lg border-slate-200 p-3 border font-bold text-sm outline-none focus:border-arcus-red transition-all text-slate-900" 
                          />
                        </label>

                        <label className="block group">
                          <div className="flex items-center gap-2 mb-1">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Link WhatsApp Group Peserta</span>
                          </div>
                          <input 
                            type="url" 
                            placeholder="https://chat.whatsapp.com/..."
                            value={localSettings.waGroupLink || ''} 
                            onChange={e => updateSettings({ waGroupLink: e.target.value })} 
                            className="block w-full rounded-lg border-slate-200 p-3 border font-bold text-sm outline-none focus:border-emerald-500 transition-all text-slate-900" 
                          />
                          <p className="mt-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-wider italic">
                            * Link ini akan ditampilkan kepada peserta setelah berhasil mendaftar.
                          </p>
                        </label>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block group">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Total Bantalan</span>
                        <input type="number" value={localSettings.totalTargets} onChange={e => updateSettings({ totalTargets: parseInt(e.target.value) || 1 })} className="block mt-1 w-full rounded-lg border-slate-200 p-3 border font-bold outline-none focus:border-arcus-red text-slate-900" min="1" />
                      </label>

                      <label className="block group">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1 italic">Archer per Target Face</span>
                        <input type="number" value={localSettings.archersPerTarget || 2} onChange={e => updateSettings({ archersPerTarget: parseInt(e.target.value) || 1 })} className="block mt-1 w-full rounded-lg border-slate-200 p-3 border font-bold outline-none focus:border-arcus-red text-slate-900" min="1" max="4" />
                      </label>
                    </div>

                    {/* Mode Toggle */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 border-l-4 border-l-arcus-red">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${localSettings.isPractice ? 'bg-teal-100 text-teal-600' : 'bg-amber-100 text-amber-600'}`}>
                            {localSettings.isPractice ? <Zap className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-900 leading-none">Mode Turnamen</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                              {localSettings.isPractice ? 'Latihan' : 'Turnamen'}
                            </p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            const next = !localSettings.isPractice;
                            const msg = next 
                              ? "Ubah ke Mode Latihan? Fitur pendaftaran online akan dinonaktifkan." 
                              : "Ubah ke Mode Turnamen? Fitur pendaftaran online akan diaktifkan.";
                            setShowModeConfirm({ isOpen: true, next, msg });
                          }}
                          className="transition-all active:scale-90"
                        >
                           {!localSettings.isPractice ? <ToggleRight className="w-10 h-10 text-arcus-red" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                        </button>
                      </div>
                    </div>
                </div>

                {!isPractice && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fitur Pendaftaran</p>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${localSettings.enableGateway ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                                <Zap className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-xs font-black uppercase text-slate-900 leading-none">Payment Gateway</p>
                                <p className="text-[9px] font-bold text-slate-900 uppercase mt-1">Otomatisasi Status Lunas</p>
                             </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => updateSettings({ enableGateway: !localSettings.enableGateway })}
                            className="transition-all active:scale-90"
                          >
                             {localSettings.enableGateway ? <ToggleRight className="w-10 h-10 text-blue-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                          </button>
                       </div>
                       <div className="pt-4 border-t border-slate-200">
                         <label className="block space-y-2">
                            <div className="flex items-center gap-2">
                               <UsersIcon className="w-4 h-4 text-slate-400" />
                               <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Biaya Registrasi Official (Pusat)</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 italic">Rp</span>
                              <input 
                                type="number" 
                                value={localSettings.officialFee || 0} 
                                onChange={e => updateSettings({ officialFee: parseInt(e.target.value) || 0 })} 
                                className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl font-black italic text-lg text-slate-900 outline-none focus:border-blue-500 transition-all shadow-sm" 
                                placeholder="Biaya Official" 
                              />
                            </div>
                         </label>
                       </div>
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* Section: Media & Documents */}
          {!isPractice && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-black font-oswald uppercase text-slate-800 italic">Media & Publikasi</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowUploadGuide(!showUploadGuide)}
                  className="flex items-center gap-2 text-blue-600 text-[9px] font-black uppercase tracking-widest hover:underline"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> Cara Upload
                </button>
              </div>

              {showUploadGuide && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-6 space-y-4 animate-in slide-in-from-top-4">
                  <h4 className="font-black text-blue-900 uppercase text-xs">Langkah Mendapatkan Link Gambar:</h4>
                  <ol className="text-xs text-blue-700 space-y-2 list-decimal pl-4 font-medium italic">
                    <li>Gunakan layanan gratis seperti Imgur.com atau Postimages.org.</li>
                    <li>Upload foto pamflet dari HP/Komputer Anda ke situs tersebut.</li>
                    <li>Setelah terupload, salin "Direct Link" (link yang berakhiran .jpg, .jpeg, atau .png).</li>
                    <li>Tempelkan link tersebut pada kolom input di bawah ini.</li>
                  </ol>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <label className="block group">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Link Gambar Pamflet / Poster (URL)</span>
                        {validationErrors.pamphletUrl && <span className="text-[9px] font-bold text-red-500 italic">{validationErrors.pamphletUrl}</span>}
                      </div>
                      <div className="relative mt-2">
                        <ImageIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${validationErrors.pamphletUrl ? 'text-red-400' : 'text-slate-300'}`} />
                        <input 
                          type="url" 
                          placeholder="https://i.imgur.com/xyz123.jpg"
                          value={localSettings.pamphletUrl} 
                          onChange={e => updateSettings({ pamphletUrl: e.target.value })} 
                          className={`w-full pl-10 pr-5 py-3 rounded-lg font-bold text-sm outline-none transition-all ${validationErrors.pamphletUrl ? 'border-2 border-red-500 bg-red-50 focus:border-red-600' : 'bg-white border border-slate-200 focus:border-arcus-red'}`} 
                        />
                      </div>
                   </label>

                   <label className="block group">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Link Technical Hand Book (THB / PDF URL)</span>
                        {validationErrors.thbUrl && <span className="text-[9px] font-bold text-red-500 italic">{validationErrors.thbUrl}</span>}
                      </div>
                      <div className="relative mt-2">
                        <FileText className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${validationErrors.thbUrl ? 'text-red-400' : 'text-slate-300'}`} />
                        <input 
                          type="url" 
                          placeholder="https://drive.google.com/your-pdf"
                          value={localSettings.thbUrl} 
                          onChange={e => updateSettings({ thbUrl: e.target.value })} 
                          className={`w-full pl-10 pr-5 py-3 rounded-lg font-bold text-sm outline-none transition-all ${validationErrors.thbUrl ? 'border-2 border-red-500 bg-red-50 focus:border-red-600' : 'bg-white border border-slate-200 focus:border-arcus-red'}`} 
                        />
                      </div>
                   </label>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 flex flex-col items-center justify-center gap-4 min-h-[300px] overflow-hidden relative group">
                   {localSettings.pamphletUrl ? (
                     <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                          src={localSettings.pamphletUrl} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110"
                        />
                        <div className="relative z-10 p-6 flex flex-col items-center gap-4">
                           <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em]">Live Preview</p>
                           <img 
                            src={localSettings.pamphletUrl} 
                            alt="Preview" 
                            className="max-h-72 object-contain rounded-xl shadow-2xl border-4 border-white/10" 
                           />
                        </div>
                     </div>
                   ) : (
                     <div className="text-center space-y-4 text-slate-700">
                        <div className="p-8 bg-white/5 rounded-full border border-white/5">
                           <ImageIcon className="w-16 h-16 mx-auto opacity-10" />
                        </div>
                        <p className="text-[10px] font-black uppercase italic tracking-[0.2em]">Belum Ada Preview Pamflet</p>
                     </div>
                   )}
                </div>
              </div>
            </div>
          )}

          {/* Section: Category Rules */}
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isPractice ? 'bg-teal-50' : 'bg-red-50'}`}>
                      <Trophy className={`w-6 h-6 ${isPractice ? 'text-teal-600' : 'text-arcus-red'}`} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-2xl font-black font-oswald uppercase text-slate-800 italic">Aturan Skor Kategori</h3>
                      {validationErrors.categories && <p className="text-[10px] font-bold text-red-500 uppercase italic tracking-widest mt-1">{validationErrors.categories}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <select 
                      onChange={(e) => {
                        if (e.target.value) {
                          addCategory(e.target.value as CategoryType);
                          e.target.value = '';
                        }
                      }}
                      className="bg-arcus-red text-white border-2 border-arcus-red rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-red-700 hover:border-red-700 transition-all shadow-lg active:scale-95 appearance-none"
                    >
                      <option value="" className="bg-white text-slate-900 font-black">+ TAMBAH KATEGORI</option>
                      {(Object.keys(CategoryType) as CategoryType[])
                        .filter(cat => !localSettings.categoryConfigs?.[cat])
                        .map(cat => (
                          <option key={cat} value={cat} className="bg-white text-slate-900 font-bold">{CATEGORY_LABELS[cat] || cat}</option>
                        ))
                      }
                    </select>
                    <Plus className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
                  </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 bg-white border-y border-slate-100 p-6 md:p-10">
              {Object.keys(localSettings.categoryConfigs || {}).length > 0 ? (
                (Object.keys(localSettings.categoryConfigs || {}) as CategoryType[]).map(cat => (
                  <div key={cat} className="p-6 md:p-8 bg-slate-50 border-l-4 border-arcus-red space-y-6 relative group transition-all hover:bg-white shadow-sm">
                    <button 
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
                      <p className="font-bold text-slate-800 text-xl uppercase font-oswald italic">{CATEGORY_LABELS[cat] || cat}</p>
                      {!isPractice && (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-arcus-red opacity-50">Rp</span>
                          <input 
                            type="number" 
                            value={localSettings.categoryConfigs?.[cat]?.registrationFee || 0} 
                            onChange={e => updateCategoryConfig(cat, 'registrationFee', parseInt(e.target.value) || 0)} 
                            className="w-full rounded-lg border-slate-200 p-2.5 pl-8 border font-black text-right shadow-sm focus:border-arcus-red transition-all" 
                          />
                        </div>
                      )}
                    </div>
                    {cat !== CategoryType.OFFICIAL && (
                      <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <label className="block space-y-1">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Jarak</span>
                          <input 
                            type="text" 
                            value={localSettings.categoryConfigs?.[cat]?.distance || ''} 
                            onChange={e => updateCategoryConfig(cat, 'distance', e.target.value)} 
                            className="w-full rounded-lg border-slate-200 p-3 border font-bold text-sm focus:border-arcus-red transition-all text-slate-900" 
                            placeholder="Jarak" 
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Arrow</span>
                          <input 
                            type="number" 
                            value={localSettings.categoryConfigs?.[cat]?.arrows || 0} 
                            onChange={e => updateCategoryConfig(cat, 'arrows', parseInt(e.target.value) || 0)} 
                            className="w-full rounded-lg border-slate-200 p-3 border font-bold text-sm focus:border-arcus-red transition-all text-slate-900" 
                            placeholder="Arrows" 
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Rambahan</span>
                          <input 
                            type="number" 
                            value={localSettings.categoryConfigs?.[cat]?.ends || 0} 
                            onChange={e => updateCategoryConfig(cat, 'ends', parseInt(e.target.value) || 0)} 
                            className="w-full rounded-lg border-slate-200 p-3 border font-bold text-sm focus:border-arcus-red transition-all text-slate-900" 
                            placeholder="Ends" 
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-1">Face Target</span>
                          <select 
                            value={localSettings.categoryConfigs?.[cat]?.targetType || TargetType.STANDARD} 
                            onChange={e => updateCategoryConfig(cat, 'targetType', e.target.value as TargetType)} 
                            className="w-full rounded-lg border-slate-200 p-3 border font-bold text-sm focus:border-arcus-red transition-all text-slate-900"
                          >
                            {(Object.values(TargetType) as TargetType[]).map(t => (
                              <option key={t} value={t}>{TARGET_LABELS[t] || t}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                           <Swords className="w-4 h-4 text-arcus-red" />
                           <p className="text-xs font-black uppercase text-slate-900 tracking-widest">Alur Pertandingan (Eliminasi & Aduan)</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <label className="block space-y-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Aduan (H2H) Dimulai Dari:</span>
                            <select 
                              value={localSettings.categoryConfigs?.[cat]?.h2hStartSize || 0} 
                              onChange={e => updateCategoryConfig(cat, 'h2hStartSize', parseInt(e.target.value))} 
                              className="w-full rounded-xl border-slate-200 p-3 border font-black text-xs focus:border-arcus-red transition-all"
                            >
                              <option value="0">TIDAK ADA ADUAN (HANYA KUALIFIKASI)</option>
                              <option value="32">32 BESAR (ADUAN)</option>
                              <option value="16">16 BESAR (ADUAN)</option>
                              <option value="8">8 BESAR (ADUAN)</option>
                              <option value="4">FINAL 4 (ADUAN)</option>
                            </select>
                            <p className="text-[9px] font-bold text-slate-400 italic">Pilih kapan babak Head-to-Head (bracket) dimulai.</p>
                          </label>

                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Babak Penyaringan Skor (Eliminasi):</span>
                            <div className="flex flex-wrap gap-2">
                              {[32, 16, 8, 4].map(size => {
                                const stages = localSettings.categoryConfigs?.[cat]?.eliminationStages || [];
                                const isSelected = stages.includes(size);
                                const h2hStart = localSettings.categoryConfigs?.[cat]?.h2hStartSize || 0;
                                
                                // DISABLE jika stage >= h2h start (karena sudah masuk aduan)
                                const isDisabled = h2hStart > 0 && size <= h2hStart;

                                return (
                                  <button
                                    key={size}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => {
                                      const currentStages = [...stages];
                                      if (isSelected) {
                                        updateCategoryConfig(cat, 'eliminationStages', currentStages.filter(s => s !== size));
                                      } else {
                                        updateCategoryConfig(cat, 'eliminationStages', [...currentStages, size].sort((a, b) => b - a));
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all ${
                                      isSelected 
                                        ? 'bg-slate-900 border-slate-900 text-white' 
                                        : isDisabled 
                                          ? 'bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed'
                                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                    }`}
                                  >
                                    TOP {size}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 italic">Klik untuk menambah babak penyaringan skor sebelum masuk babak aduan.</p>
                          </div>
                        </div>
                        
                        {(localSettings.categoryConfigs?.[cat]?.eliminationStages?.length || 0) > 0 && (
                          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                            <div className="p-1 bg-emerald-500 rounded-full mt-0.5">
                               <Check className="w-3 h-3 text-white" />
                            </div>
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Alur yang Terbentuk:</p>
                               <ol className="text-[9px] font-bold text-emerald-700 space-y-1 list-decimal pl-4 italic">
                                  <li>Kualifikasi (Semua Peserta)</li>
                                  {localSettings.categoryConfigs?.[cat]?.eliminationStages?.map(stage => (
                                    <li key={stage}>Penyaringan Skor Top {stage}</li>
                                  ))}
                                  {localSettings.categoryConfigs?.[cat]?.h2hStartSize ? (
                                    <li>Bagan Aduan (Head-to-Head) {localSettings.categoryConfigs?.[cat]?.h2hStartSize} Besar</li>
                                  ) : (
                                    <li>Penentuan Pemenang dari Hasil Terakhir</li>
                                  )}
                               </ol>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {cat === CategoryType.OFFICIAL && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
                        <Info className="w-4 h-4 text-blue-500" />
                        <p className="text-[10px] font-bold text-blue-700 uppercase italic">Hanya biaya pendaftaran.</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full p-12 text-center bg-slate-50 border border-dashed border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum Ada Kategori.</p>
                </div>
              )}
            </div>
          </div>

            </div>
          )}

          {activeTab === 'PAYMENT' && !isPractice && (
            <div className="space-y-16 animate-in fade-in duration-500">
              {/* Section: Manual Payment Target */}
              <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-2xl">
                      <Landmark className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-2xl font-black font-oswald uppercase text-slate-800 italic">Metode Pembayaran Transfer</h3>
                      {validationErrors.paymentMethods && <p className="text-[10px] font-bold text-red-500 uppercase italic tracking-widest mt-1">{validationErrors.paymentMethods}</p>}
                    </div>
                </div>
                <button type="button" onClick={addPaymentMethod} className="bg-arcus-dark text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Tambah Rekening
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {(localSettings.paymentMethods || []).map((pm) => (
                  <div key={pm.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 relative group transition-all shadow-sm">
                    <button type="button" onClick={() => removePaymentMethod(pm.id)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Bank / Provider</span>
                        <input type="text" placeholder="Contoh: BCA, Mandiri, Dana" value={pm.provider} onChange={e => updatePaymentMethod(pm.id, 'provider', e.target.value)} className="w-full rounded-xl border-slate-100 bg-slate-50 p-4 border text-sm font-bold" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nomor Rekening</span>
                        <input type="text" placeholder="Masukkan nomor rekening..." value={pm.accountNumber} onChange={e => updatePaymentMethod(pm.id, 'accountNumber', e.target.value)} className="w-full rounded-xl border-slate-100 bg-slate-50 p-4 border text-sm font-black tracking-widest" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Pemilik Akun</span>
                        <input type="text" placeholder="Nama lengkap pemilik rekening..." value={pm.accountName} onChange={e => updatePaymentMethod(pm.id, 'accountName', e.target.value)} className="w-full rounded-xl border-slate-100 bg-slate-50 p-4 border text-sm font-bold" />
                      </div>
                    </div>
                  </div>
                ))}
                {(localSettings.paymentMethods || []).length === 0 && (
                  <div className="col-span-full py-16 text-center space-y-6 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto">
                      <Landmark className="w-10 h-10 text-slate-200" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Belum Ada Rekening Transfer</p>
                       <p className="text-[10px] text-slate-400 font-medium italic max-w-sm mx-auto">
                         Jika tidak ada rekening yang ditambahkan, sistem akan menggunakan setelan default pusat (jika tersedia).
                       </p>
                    </div>
                    <button type="button" onClick={addPaymentMethod} className="bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest mx-auto">
                      Atur Rekening Sekarang
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {activeTab === 'SCORERS' && (
            <div className="space-y-16 animate-in fade-in duration-500">
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-50 rounded-2xl">
                        <UsersIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-2xl font-black font-oswald uppercase text-slate-800 italic">Tim Lapangan (Scorer)</h3>
                  </div>
                  <button type="button" onClick={addScorer} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> Tambah Scorer
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {localScorers.map((scorer) => (
                    <div key={scorer.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 relative group transition-all shadow-sm space-y-6">
                      <button type="button" onClick={() => removeScorer(scorer.id)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Petugas</span>
                        <input 
                          type="text" 
                          value={scorer.name} 
                          onChange={e => updateScorer(scorer.id, 'name', e.target.value)} 
                          className="w-full rounded-xl border-slate-100 bg-slate-50 p-4 border text-sm font-bold" 
                          placeholder="Contoh: Scorer Lapangan 1"
                        />
                      </div>

                      <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl">
                        <div>
                          <span className="text-[9px] font-black text-white/50 uppercase tracking-widest block">Kode Akses</span>
                          <span className="text-2xl font-black font-mono tracking-[0.3em] text-arcus-red">{scorer.accessCode}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => updateScorer(scorer.id, 'accessCode', Math.floor(1000 + Math.random() * 9000).toString())}
                          className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                        >
                          <Repeat className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-1">Izin Akses</span>
                         <div className="flex flex-wrap gap-2">
                            {['INPUT_SCORE', 'EDIT_ARCHER', 'MANAGE_MATCHES'].map(perm => (
                              <button
                                key={perm}
                                type="button"
                                onClick={() => {
                                  const current = scorer.permissions || [];
                                  const next = current.includes(perm as any) 
                                    ? current.filter(p => p !== perm)
                                    : [...current, perm as any];
                                  updateScorer(scorer.id, 'permissions', next);
                                }}
                                className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${(scorer.permissions || []).includes(perm as any) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                              >
                                {perm.replace('_', ' ')}
                              </button>
                            ))}
                         </div>
                      </div>
                    </div>
                  ))}
                  {localScorers.length === 0 && (
                    <div className="md:col-span-2 py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                      <UsersIcon className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada tim lapangan yang ditambahkan</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DANGER ZONE: DELETE EVENT */}
          <div className="bg-red-50 rounded-[3rem] p-12 border-2 border-dashed border-red-200 space-y-8">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-red-600 rounded-2xl text-white shadow-lg">
                   <Trash2 className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-2xl font-black font-oswald uppercase italic text-red-900 leading-none">Danger Zone</h3>
                   <p className="text-xs font-bold text-red-700 uppercase tracking-widest mt-2">Gunakan dengan sangat hati-hati!</p>
                </div>
             </div>
             
             <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <p className="text-sm font-medium text-red-800 leading-relaxed max-w-2xl italic">
                   Jika turnamen ini tidak jadi dilaksanakan atau terdapat kesalahan fatal, Anda dapat menghapusnya. <strong>Tindakan ini permanen</strong> dan akan menghapus seluruh database peserta serta skor yang sudah terekam.
                </p>
                <button 
                  type="button" 
                  onClick={handleDeleteClick}
                  className="bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all whitespace-nowrap"
                >
                   Hapus {isPractice ? 'Latihan' : 'Turnamen'}
                </button>
             </div>
          </div>

          <div className="pt-10 sticky bottom-8 z-40 px-12 pb-12 bg-gradient-to-t from-white via-white/95 to-transparent -mx-12">
            <button type="submit" className={`w-full text-white font-black py-5 rounded-[2rem] shadow-xl transition-all flex items-center justify-center gap-4 text-xl font-oswald uppercase tracking-[0.2em] italic ${isPractice ? 'bg-teal-700' : 'bg-arcus-red shadow-arcus-red/30'}`}>
              <Save className="w-6 h-6" /> {isPractice ? 'Simpan Latihan' : 'Simpan Konfigurasi'}
            </button>
          </div>
        </form>
      </div>

      {showDraftConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center space-y-8 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-100 flex items-center justify-center mx-auto shadow-xl">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black font-oswald uppercase italic tracking-tight text-slate-900">Pengaturan Belum Lengkap</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Beberapa informasi penting belum diisi. Tetap simpan sebagai draft?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowDraftConfirm(false)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Lengkapi</button>
              <button onClick={executeFinalSave} className="py-4 bg-arcus-dark text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Ya, Simpan Draft</button>
            </div>
          </div>
        </div>
      )}

      {showModeConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
              <Repeat className="w-8 h-8 text-blue-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Ubah Mode?</h3>
              <p className="text-slate-500 text-sm">{showModeConfirm.msg}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowModeConfirm({ ...showModeConfirm, isOpen: false })} className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">Batal</button>
              <button 
                onClick={() => {
                  updateSettings({ isPractice: showModeConfirm.next });
                  setShowModeConfirm({ ...showModeConfirm, isOpen: false });
                }} 
                className="py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Ya, Ubah
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnsavedConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Belum Disimpan</h3>
              <p className="text-slate-500 text-sm">
                Perubahan yang Anda buat belum disimpan. Tetap kembali ke dashboard?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowUnsavedConfirm(false)} className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">Batal</button>
              <button onClick={onBack} className="py-3 bg-red-600 text-white rounded-xl font-bold text-xs shadow-md">Ya, Keluar</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${isPractice ? 'bg-teal-50' : 'bg-amber-50'}`}>
              {isPractice ? <Zap className="w-8 h-8 text-teal-500" /> : <AlertTriangle className="w-8 h-8 text-amber-500" />}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Simpan Perubahan?</h3>
              <p className="text-slate-500 text-sm">Data konfigurasi akan segera diterapkan.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">Batal</button>
              <button onClick={handleFinalSave} className={`py-3 text-white rounded-xl font-bold text-xs shadow-md ${isPractice ? 'bg-teal-700' : 'bg-slate-900'}`}>Ya, Simpan</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Hapus {isPractice ? 'Latihan' : 'Turnamen'}?</h3>
              <p className="text-slate-500 text-sm">
                Tindakan ini permanen. Semua data peserta, skor, dan pengaturan akan dihapus selamanya.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">Batal</button>
              <button onClick={executeDelete} className="py-3 bg-red-600 text-white rounded-xl font-bold text-xs shadow-md">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
