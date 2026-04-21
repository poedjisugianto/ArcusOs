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

type BgPattern = 'CLEAN' | 'SPORTY_MESH' | 'DIAGONAL_SPEED' | 'DYNAMIC_WAVES' | 'CARBON';

const IdCardEditor: React.FC<Props> = ({ archers, settings, onBack }) => {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [cardTitle, setCardTitle] = useState(settings.tournamentName || 'KARTU PESERTA');
  const [cardSubtitle, setCardSubtitle] = useState(settings.location || 'ARCUS ARCHERY TOURNAMENT');
  const [cardDate, setCardDate] = useState(settings.eventDate ? new Date(settings.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const [accentColor, setAccentColor] = useState('#ef4444'); // Default red
  const [bgPattern, setBgPattern] = useState<BgPattern>('SPORTY_MESH');
  const [showEditor, setShowEditor] = useState(true);
  
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
      default:
        return {};
    }
  };

  const renderCard = (person: Archer, isOfficial: boolean) => (
    <div key={person.id} className="w-full aspect-[2/3] border border-slate-200 overflow-hidden flex flex-col break-inside-avoid shadow-sm print:shadow-none bg-white relative">
      {/* Sporty Background Layer */}
      <div className="absolute inset-0 opacity-50" style={getPatternStyles(bgPattern, accentColor)} />
      
      {/* Decorative Side Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accentColor }} />

      {/* Header with Logos */}
      <div className="h-20 bg-white/80 backdrop-blur-sm p-3 border-b border-slate-100 flex items-center justify-center gap-3 relative z-10">
        {logos.map(logo => (
          <img 
            key={logo.id} 
            src={logo.url} 
            alt="" 
            style={{ maxHeight: logo.size / 2, width: 'auto' }}
            className="object-contain"
          />
        ))}
        {logos.length === 0 && <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200"><ImageIcon className="w-5 h-5 text-slate-200" /></div>}
      </div>

      {/* Participant Info Body */}
      <div className="p-5 flex flex-col items-center justify-between flex-1 space-y-4 relative z-10">
        <div className="text-center space-y-1">
          <h2 className="text-[10px] font-black font-oswald uppercase italic leading-tight text-slate-800">{cardTitle}</h2>
          {cardDate && <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{cardDate}</p>}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-md">
            <QRCodeSVG value={person.id} size={70} level="M" />
          </div>
          <span className="text-[7px] font-mono text-slate-400">{person.id}</span>
        </div>

        <div className="text-center space-y-2 w-full">
          <div className="flex flex-col items-center gap-1">
            <span 
              className="text-[8px] font-black px-3 py-0.5 rounded-full text-white uppercase italic tracking-widest"
              style={{ backgroundColor: isOfficial ? '#2563eb' : accentColor }}
            >
              {isOfficial ? 'OFFICIAL TEAM' : 'ATHLETE'}
            </span>
            <h1 className="text-lg font-black font-oswald uppercase italic leading-none text-slate-900 border-b-2 pb-1 pt-1" style={{ borderColor: accentColor }}>
              {person.name}
            </h1>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-600 uppercase italic">
              {person.club}
            </span>
            {!isOfficial ? (
               <>
                 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                   {person.category}
                 </span>
                 <div className="flex items-center gap-2 mt-1.5">
                   <div className="flex flex-col items-center bg-slate-900 text-white px-3 py-1 rounded-lg">
                      <span className="text-[6px] font-black opacity-50 leading-none">TARGET</span>
                      <span className="text-[10px] font-black leading-none mt-1">{person.targetNo}{person.position}</span>
                   </div>
                   <div className="flex flex-col items-center border border-slate-200 px-3 py-1 rounded-lg bg-white">
                      <span className="text-[6px] font-black text-slate-400 leading-none uppercase">Session</span>
                      <span className="text-[10px] font-black text-slate-900 leading-none mt-1">{person.wave}</span>
                   </div>
                 </div>
               </>
            ) : (
               <div className="mt-2 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                  <ShieldCheck className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Verified Official</span>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Stripe */}
      <div className="h-8 flex items-center justify-center mt-auto relative z-10" style={{ backgroundColor: isOfficial ? '#1e3a8a' : accentColor }}>
         <span className="text-[8px] font-black text-white uppercase italic tracking-[0.2em]">{isOfficial ? 'OFFICIAL PASS' : 'PARTICIPANT PASS'}</span>
      </div>
    </div>
  );

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
                  <div className="space-y-4">
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
                       {(['CLEAN', 'SPORTY_MESH', 'DIAGONAL_SPEED', 'DYNAMIC_WAVES', 'CARBON'] as BgPattern[]).map(p => (
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
                      {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#000000'].map(color => (
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
