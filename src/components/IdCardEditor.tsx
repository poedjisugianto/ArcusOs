import React, { useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Printer, Image as ImageIcon, Plus, Trash2, 
  Settings, User, MapPin, Calendar, Layout, Download,
  Type, Move, Maximize, Activity, CreditCard, ShieldCheck
} from 'lucide-react';
import { Archer, TournamentSettings, CategoryType } from '../types';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  archers: Archer[];
  settings: TournamentSettings;
  onBack: () => void;
}

interface Logo {
  id: string;
  url: string;
  name: string;
  x: number;
  y: number;
  size: number;
}

type BgPattern = 'CLEAN' | 'SPORTY_MESH' | 'DIAGONAL_SPEED' | 'DYNAMIC_WAVES' | 'CARBON' | 'HERITAGE_PAPER' | 'BAMBOO_WEAVE' | 'ETHNIC_MODERN';
type CardTheme = 'SPORTY_MODERN' | 'TRADITIONAL_HERITAGE' | 'ELITE_DARK' | 'MINIMAL_PRO';

const IdCardEditor: React.FC<Props> = ({ archers, settings, onBack }) => {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [cardTitle, setCardTitle] = useState(settings.tournamentName || 'KARTU PESERTA');
  const [cardSubtitle, setCardSubtitle] = useState(settings.location || 'ARCUS ARCHERY TOURNAMENT');
  const [cardDate, setCardDate] = useState(settings.eventDate ? new Date(settings.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const [accentColor, setAccentColor] = useState('#ef4444'); // Default red
  const [bgPattern, setBgPattern] = useState<BgPattern>('SPORTY_MESH');
  const [cardTheme, setCardTheme] = useState<CardTheme>('SPORTY_MODERN');
  const [showEditor, setShowEditor] = useState(true);
  const [viewMode, setViewMode] = useState<'DESIGNER' | 'FULL_PREVIEW'>('DESIGNER');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const participants = useMemo(() => archers.filter(a => a.category !== CategoryType.OFFICIAL), [archers]);
  const officials = useMemo(() => archers.filter(a => a.category === CategoryType.OFFICIAL), [archers]);

  const handleAddLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newLogo: Logo = {
            id: 'logo_' + Math.random().toString(36).substr(2, 9),
            url: event.target.result as string,
            name: file.name,
            x: 20,
            y: 20,
            size: 60
          };
          setLogos([...logos, newLogo]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = (id: string) => {
    setLogos(logos.filter(l => l.id !== id));
  };

  const updateLogo = (id: string, updates: Partial<Logo>) => {
    setLogos(logos.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handlePrint = () => {
    setShowEditor(false);
    setTimeout(() => {
      window.print();
      setShowEditor(true);
    }, 500);
  };

  const getPatternStyles = (pattern: BgPattern, color: string) => {
    switch (pattern) {
      case 'SPORTY_MESH':
        return {
          backgroundImage: `radial-gradient(${color}22 1px, transparent 1px)`,
          backgroundSize: '10px 10px'
        };
      case 'DIAGONAL_SPEED':
        return {
          backgroundImage: `repeating-linear-gradient(45deg, ${color}08, ${color}08 10px, transparent 10px, transparent 20px)`
        };
      case 'DYNAMIC_WAVES':
        return {
          backgroundImage: `linear-gradient(135deg, ${color}05 25%, transparent 25%), linear-gradient(225deg, ${color}05 25%, transparent 25%)`,
          backgroundSize: '40px 40px'
        };
      case 'CARBON':
        return {
          backgroundColor: '#f8fafc',
          backgroundImage: `linear-gradient(45deg, ${color}05 25%, transparent 25%, transparent 75%, ${color}05 75%, ${color}05), linear-gradient(45deg, ${color}05 25%, transparent 25%, transparent 75%, ${color}05 75%, ${color}05)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px'
        };
      case 'HERITAGE_PAPER':
        return {
          backgroundColor: '#fdf6e3',
          backgroundImage: `url("https://www.transparenttextures.com/patterns/pinstripe-light.png"), radial-gradient(${color}11 1px, transparent 1px)`,
          backgroundSize: 'auto, 20px 20px'
        };
      case 'BAMBOO_WEAVE':
        return {
          backgroundColor: '#f4f4f5',
          backgroundImage: `linear-gradient(90deg, ${color}08 1px, transparent 1px), linear-gradient(${color}08 1px, transparent 1px)`,
          backgroundSize: '15px 15px'
        };
      case 'ETHNIC_MODERN':
        return {
          backgroundColor: '#ffffff',
          backgroundImage: `repeating-linear-gradient(45deg, ${color}05 0px, ${color}05 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, ${color}05 0px, ${color}05 2px, transparent 2px, transparent 8px)`,
          backgroundSize: '20px 20px'
        };
      default:
        return {};
    }
  };

  const renderCard = (person: Archer, isOfficial: boolean) => {
    const isTraditional = cardTheme === 'TRADITIONAL_HERITAGE';
    const isElite = cardTheme === 'ELITE_DARK';
    const cardAccent = isElite ? '#facc15' : (isOfficial ? (isTraditional ? '#78350f' : '#2563eb') : accentColor);
    const textPrimary = isElite ? 'text-white' : 'text-slate-900';
    const textSecondary = isElite ? 'text-slate-400' : 'text-slate-600';
    const bgBase = isElite ? 'bg-[#0f172a]' : 'bg-white';

    return (
      <div key={person.id} className={`w-full aspect-[2/3] border border-slate-200 overflow-hidden flex flex-col break-inside-avoid shadow-sm print:shadow-none relative transition-all duration-500 ${bgBase}`}>
        {/* Pattern Layer */}
        <div className="absolute inset-0 opacity-40" style={getPatternStyles(bgPattern, cardAccent)} />
        
        {/* Frame / Side Bar */}
        {isTraditional ? (
          <div className="absolute inset-0 border-[6px] border-double m-2 pointer-events-none z-20" style={{ borderColor: `${cardAccent}22` }} />
        ) : (
          <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: cardAccent }} />
        )}

        {/* Header */}
        <div className={`h-22 p-4 flex items-center justify-center gap-3 relative z-10 ${isElite ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-md border-b border-white/10`}>
          {logos.map(logo => (
            <img 
              key={logo.id} 
              src={logo.url} 
              alt="" 
              style={{ maxHeight: logo.size / 2.2, width: 'auto' }}
              className="object-contain drop-shadow-sm"
            />
          ))}
          {logos.length === 0 && <div className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200/50"><ImageIcon className="w-6 h-6 text-slate-300" /></div>}
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center justify-between flex-1 gap-4 relative z-10">
          <div className="text-center space-y-1.5">
            <h2 className={`text-[11px] font-black uppercase tracking-tight leading-tight ${isTraditional ? 'font-serif' : 'font-oswald italic'} ${textPrimary}`}>
              {cardTitle}
            </h2>
            {cardDate && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">{cardDate}</p>}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className={`p-2.5 rounded-2xl shadow-xl ${isElite ? 'bg-white' : 'bg-white'}`}>
              <QRCodeSVG value={person.id} size={75} level="M" />
            </div>
            <span className="text-[7px] font-mono font-bold text-slate-400 uppercase tracking-widest">{person.id.substring(0, 8)}</span>
          </div>

          <div className="text-center space-y-3 w-full">
            <div className="flex flex-col items-center gap-1.5">
              <span 
                className={`text-[8px] font-black px-4 py-1 rounded-full text-white uppercase tracking-[0.15em] ${isTraditional ? 'rounded-lg' : 'italic'}`}
                style={{ backgroundColor: cardAccent }}
              >
                {isOfficial ? 'OFFICIAL PASS' : 'ARCHERY ATHLETE'}
              </span>
              <h1 className={`text-xl font-black uppercase leading-none border-b-2 pb-1.5 pt-1 ${isTraditional ? 'font-serif tracking-normal' : 'font-oswald italic tracking-tighter'} ${textPrimary}`} style={{ borderColor: `${cardAccent}44` }}>
                {person.name}
              </h1>
            </div>
            
            <div className="flex flex-col items-center">
              <span className={`text-[11px] font-black uppercase ${isTraditional ? 'font-serif' : 'italic'} ${textSecondary}`}>
                {person.club}
              </span>
              
              {!isOfficial ? (
                 <div className="mt-3 flex flex-col items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {person.category}
                    </span>
                    <div className="flex items-center gap-2.5">
                       <div className={`flex flex-col items-center px-4 py-1.5 rounded-xl ${isElite ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/20' : 'bg-slate-900 text-white'}`}>
                          <span className="text-[6px] font-black opacity-60 leading-none uppercase tracking-tighter">Target</span>
                          <span className="text-[12px] font-black leading-none mt-1.5">{person.targetNo}{person.position}</span>
                       </div>
                       <div className={`flex flex-col items-center px-4 py-1.5 rounded-xl border ${isElite ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white shadow-sm'}`}>
                          <span className="text-[6px] font-black text-slate-400 leading-none uppercase tracking-tighter">Session</span>
                          <span className={`text-[12px] font-black leading-none mt-1.5 ${textPrimary}`}>{person.wave}</span>
                       </div>
                    </div>
                 </div>
              ) : (
                 <div className={`mt-3 flex items-center justify-center gap-2 border px-5 py-2 rounded-full ${isElite ? 'border-amber-400/30 text-amber-400 bg-amber-400/5' : 'border-blue-100 text-blue-600 bg-blue-50'}`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest italic">Authorized Personal</span>
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className={`h-10 flex items-center justify-center mt-auto relative z-10`} style={{ backgroundColor: cardAccent }}>
           <span className="text-[9px] font-black text-white uppercase italic tracking-[0.25em] drop-shadow-sm">
             {isOfficial ? 'STAFF IDENTIFICATION' : 'TOURNAMENT PARTICIPANT'}
           </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Editor UI - Hidden on Print */}
      {showEditor && (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 print:hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack} 
                className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-900 transition-all active:scale-90 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-black font-oswald uppercase italic leading-none text-slate-900">Digital ID Card Forge</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Design & Automate Crew Identification</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                <button 
                  onClick={() => setViewMode('DESIGNER')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'DESIGNER' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  Designer
                </button>
                <button 
                  onClick={() => setViewMode('FULL_PREVIEW')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'FULL_PREVIEW' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Preview
                </button>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-slate-200/50 p-1 rounded-xl">
                 <div className="px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                   {participants.length} Athletes • {officials.length} Officials
                 </div>
              </div>
              <button 
                onClick={handlePrint}
                className="bg-arcus-red text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-red-600/20 active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" />
                Cetak {archers.length} Kartu
              </button>
            </div>
          </div>

          {viewMode === 'DESIGNER' ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Design Controls */}
              <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <Layout className="w-4 h-4" />
                    </div>
                    <h3 className="font-black font-oswald uppercase italic text-slate-900">Custom Design</h3>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pro Master Templates</span>
                    <div className="grid grid-cols-2 gap-2">
                       {([
                         { id: 'SPORTY_MODERN', name: 'Modern Sporty', icon: Activity, color: '#ef4444', pattern: 'SPORTY_MESH' },
                         { id: 'TRADITIONAL_HERITAGE', name: 'Heritage Classic', icon: ShieldCheck, color: '#78350f', pattern: 'HERITAGE_PAPER' },
                         { id: 'ELITE_DARK', name: 'Elite Dark Mode', icon: Maximize, color: '#facc15', pattern: 'CARBON' },
                         { id: 'MINIMAL_PRO', name: 'Minimal White', icon: Layout, color: '#000000', pattern: 'CLEAN' }
                       ] as const).map(t => (
                         <button 
                           key={t.id}
                           onClick={() => {
                             setCardTheme(t.id);
                             setAccentColor(t.color);
                             setBgPattern(t.pattern);
                           }}
                           className={`p-3 rounded-2xl border-2 transition-all flex flex-col gap-2 items-start group relative overflow-hidden ${cardTheme === t.id ? 'border-slate-900 bg-slate-900 text-white shadow-xl' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}
                         >
                           <t.icon className={`w-4 h-4 ${cardTheme === t.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
                           <span className="text-[8px] font-black uppercase tracking-tighter text-left leading-tight">{t.name}</span>
                           {cardTheme === t.id && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20" />}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organisasi / Sponsor Logo</span>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 transition-all"
                      >
                        <Plus className="w-3 h-3" /> Add Logo
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleAddLogo} className="hidden" accept="image/*" />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {logos.map(logo => (
                        <div key={logo.id} className="relative group">
                          <img src={logo.url} alt="" className="w-12 h-12 object-contain bg-slate-50 rounded-xl border border-slate-100 p-1" />
                          <button 
                            onClick={() => removeLogo(logo.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sporty Background Pattern</span>
                    <div className="grid grid-cols-2 gap-2">
                       {(['CLEAN', 'SPORTY_MESH', 'DIAGONAL_SPEED', 'DYNAMIC_WAVES', 'CARBON', 'HERITAGE_PAPER', 'BAMBOO_WEAVE', 'ETHNIC_MODERN'] as BgPattern[]).map(p => (
                         <button 
                           key={p}
                           onClick={() => setBgPattern(p)}
                           className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${bgPattern === p ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                         >
                           {p.replace('_', ' ')}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 space-y-4">
                    <label className="block space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Type className="w-3 h-3" /> Event Name
                      </span>
                      <input 
                        type="text" 
                        value={cardTitle}
                        onChange={e => setCardTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-slate-900 focus:ring-2 ring-slate-100"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Tagline / Location
                      </span>
                      <input 
                        type="text" 
                        value={cardSubtitle}
                        onChange={e => setCardSubtitle(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-slate-900 focus:ring-2 ring-slate-100"
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Theme Visual Identity</span>
                    <div className="flex flex-wrap gap-2">
                      {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#000000', '#78350f', '#166534', '#991b1b'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setAccentColor(color)}
                          className={`w-10 h-10 rounded-2xl border-2 transition-all ${accentColor === color ? 'border-amber-400 scale-110 shadow-lg' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1e293b] p-6 rounded-[2rem] text-white shadow-xl shadow-slate-900/20">
                <div className="flex gap-4">
                   <Activity className="w-6 h-6 text-emerald-400 mt-1" />
                   <div>
                     <h4 className="text-xs font-black uppercase italic tracking-widest text-emerald-400">Smart Printing Engine</h4>
                     <p className="text-[10px] font-medium text-slate-400 leading-relaxed mt-2 uppercase">
                       Sistem secara otomatis memisahkan <span className="text-white font-bold">{participants.length} Atlet</span> dan <span className="text-white font-bold">{officials.length} Official</span> untuk mencegah kekeliruan akses saat event.
                     </p>
                   </div>
                </div>
              </div>
            </div>

            {/* Preview Area */}
            <div className="xl:col-span-2 space-y-8">
              <div className="flex flex-col md:flex-row gap-6">
                 {/* Athlete Preview */}
                 <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 px-6">
                       <CreditCard className="w-4 h-4 text-arcus-red" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Athlete Style</span>
                    </div>
                    <div className="max-w-xs mx-auto">
                       {participants[0] ? renderCard(participants[0], false) : (
                          <div className="aspect-[2/3] bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                             <User className="w-12 h-12 mb-4 opacity-20" />
                             <span className="text-[10px] font-black uppercase tracking-widest">No Athlete Data</span>
                          </div>
                       )}
                    </div>
                 </div>

                 {/* Official Preview */}
                 <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 px-6">
                       <ShieldCheck className="w-4 h-4 text-blue-600" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Official Style</span>
                    </div>
                    <div className="max-w-xs mx-auto">
                       {officials[0] ? renderCard(officials[0], true) : (
                          <div className="aspect-[2/3] bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                             <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
                             <span className="text-[10px] font-black uppercase tracking-widest">No Official Data</span>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          </div>
          ) : (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 min-h-screen">
              <div className="flex items-center justify-between mb-12 px-6">
                 <div>
                   <h3 className="text-2xl font-black font-oswald uppercase italic text-slate-900">Pre-Print Inspection</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Reviewing {archers.length} generated identifiers</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-400 uppercase">Estimated Pages</span>
                       <span className="text-xl font-black text-slate-900">{Math.ceil(archers.length / 4)} × A4Sheets</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-16">
                 {participants.length > 0 && (
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 border-l-4 border-arcus-red pl-4">
                         <span className="font-black font-oswald uppercase italic text-slate-900 text-xl">Athletes List</span>
                         <span className="px-3 py-1 bg-red-50 text-arcus-red text-[10px] font-black rounded-full uppercase italic">{participants.length}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                         {participants.map(p => (
                            <div key={p.id} className="scale-100 transform transform-gpu origin-top">
                               {renderCard(p, false)}
                            </div>
                         ))}
                      </div>
                   </div>
                 )}

                 {officials.length > 0 && (
                   <div className="space-y-6 pt-12 border-t border-slate-100">
                      <div className="flex items-center gap-3 border-l-4 border-blue-600 pl-4">
                         <span className="font-black font-oswald uppercase italic text-slate-900 text-xl">Official Crew</span>
                         <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase italic">{officials.length}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                         {officials.map(o => (
                            <div key={o.id} className="scale-100 transform transform-gpu origin-top">
                               {renderCard(o, true)}
                            </div>
                         ))}
                      </div>
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actual Printable Layout */}
      <div className={`${showEditor ? 'hidden' : 'block'} bg-white`}>
        {/* Participants Group */}
        {participants.length > 0 && (
           <div className="mb-12">
             <div className="grid grid-cols-2 gap-4 p-4">
               {participants.map(archer => renderCard(archer, false))}
             </div>
           </div>
        )}

        {/* Officials Group */}
        {officials.length > 0 && (
           <div className="page-break-before">
             <div className="grid grid-cols-2 gap-4 p-4">
               {officials.map(official => renderCard(official, true))}
             </div>
           </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white !important;
          }
          .page-break-before {
             page-break-before: always;
          }
          .animate-in {
            animation: none !important;
          }
          .aspect-[2/3] {
             width: 10cm !important;
             height: 15cm !important;
          }
        }
      `}} />
    </div>
  );
};

export default IdCardEditor;
