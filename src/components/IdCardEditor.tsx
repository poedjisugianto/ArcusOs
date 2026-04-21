import React, { useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Printer, Image as ImageIcon, Plus, Trash2, 
  Settings, User, MapPin, Calendar, Layout, Download,
  Type, Move, Maximize, Activity, CreditCard, ShieldCheck, Star, Trophy, Crown, Crosshair, Target
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

type BgPattern = 'CLEAN' | 'SPORTY_MESH' | 'DIAGONAL_SPEED' | 'DYNAMIC_WAVES' | 'CARBON' | 'HERITAGE_PAPER' | 'BAMBOO_WEAVE' | 'ETHNIC_MODERN' | 'SPORTY_BURST';
type CardTheme = 'SPORTY_MODERN' | 'TRADITIONAL_LEGACY' | 'STEALTH_ELITE' | 'ASYMETRIC_PRO' | 'GLORY_ULTIMATE' | 'CHAMPION_ELITE' | 'PRO_ARCHER_X';

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
      case 'SPORTY_BURST':
        return {
          backgroundImage: `linear-gradient(120deg, ${color}11 0%, transparent 50%), linear-gradient(-120deg, ${color}08 0%, transparent 50%), repeating-linear-gradient(45deg, transparent, transparent 15px, ${color}05 15px, ${color}05 16px)`
        };
      default:
        return {};
    }
  };

  const renderCard = (person: Archer, isOfficial: boolean) => {
    const isLegacy = cardTheme === 'TRADITIONAL_LEGACY';
    const isStealth = cardTheme === 'STEALTH_ELITE';
    const isAsymmetric = cardTheme === 'ASYMETRIC_PRO';
    const isGlory = cardTheme === 'GLORY_ULTIMATE';
    const isChampion = cardTheme === 'CHAMPION_ELITE';
    const isProX = cardTheme === 'PRO_ARCHER_X';
    
    const cardAccent = isStealth ? '#E61E2A' : (isOfficial ? (isLegacy ? '#78350f' : '#2563eb') : accentColor);
    const textPrimary = (isStealth || isChampion || isProX) ? 'text-white' : 'text-slate-900';
    const textSecondary = (isStealth || isChampion || isProX) ? 'text-slate-100/70' : 'text-slate-600';
    const bgBase = isStealth ? 'bg-[#0a0a0a]' : isChampion ? 'bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900' : isProX ? 'bg-[#0f172a]' : 'bg-white';

    return (
      <div key={person.id} className={`w-full aspect-[2/3] border border-slate-200 overflow-hidden flex flex-col break-inside-avoid shadow-sm print:shadow-none relative transition-all duration-700 ${bgBase}`}>
        {/* Pattern Layer */}
        {!isChampion && !isProX && <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={getPatternStyles(bgPattern, cardAccent)} />}
        
        {/* Pro Archer X specific Graphics */}
        {isProX && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Dynamic Bow Limb Graphics */}
            <div className="absolute -right-24 top-0 bottom-0 w-72 border-l-[35px] border-white/5 rounded-full z-0" />
            <div className="absolute -right-28 top-10 bottom-10 w-72 border-l-[2px] border-yellow-500/30 rounded-full z-0" />
            
            {/* Precision Trajectory Lines */}
            <div className="absolute top-[42%] -left-10 w-full h-[0.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-[-12deg] z-0" />
            <div className="absolute top-[44%] -left-10 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent rotate-[-12deg] z-0" />
            
            {/* Motion Blur Shapes */}
            <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-yellow-500/5 skew-x-[-25deg] rotate-[-15deg] z-0" />
            
            {/* Pro Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
          </div>
        )}

        {/* Champion Mesh Gradient / Atmosphere */}
        {isChampion && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[100px]" />
            <div className="absolute top-[30%] right-[-20%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[80px]" />
            {/* Sporty Speed Lines (Champion Version) */}
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(255,255,255,0.2)_20px,rgba(255,255,255,0.2)_21px)]" />
          </div>
        )}

        {/* Target Motif / Face Target Layer */}
        {isGlory || isChampion || isProX ? (
          <div className={`absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] aspect-square ${isChampion || isProX ? 'opacity-30 scale-125' : 'opacity-20'} pointer-events-none`}>
             {/* Realistic Face Target */}
             <div className="absolute inset-0 rounded-full border-[20px] border-white/80 shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]" />
             <div className="absolute inset-[20px] rounded-full border-[20px] border-slate-900/90 shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]" />
             <div className="absolute inset-[40px] rounded-full border-[20px] border-blue-600/90 shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]" />
             <div className="absolute inset-[60px] rounded-full border-[20px] border-red-600/90 shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]" />
             <div className="absolute inset-[80px] rounded-full bg-yellow-400 shadow-[0_0_60px_rgba(250,204,21,0.4),inset_0_0_30px_rgba(0,0,0,0.2)]" />
             
             {isGlory && (
               <>
                 <div className="absolute inset-0 bg-[repeating-linear-gradient(60deg,transparent,transparent_40px,rgba(255,255,255,0.1)_40px,rgba(255,255,255,0.1)_41px)]" />
                 <div className="absolute inset-0 bg-[repeating-linear-gradient(-30deg,transparent,transparent_60px,rgba(255,255,255,0.05)_60px,rgba(255,255,255,0.05)_61px)]" />
               </>
             )}
          </div>
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-slate-200/20 pointer-events-none">
             <div className="absolute inset-10 rounded-full border border-slate-200/20" />
             <div className="absolute inset-20 rounded-full border border-slate-200/20" />
             <div className="absolute inset-30 rounded-full border border-slate-200/20" />
          </div>
        )}

        {/* Framing / Engravings / Champion Gold Frame / Pro Frame */}
        {isProX ? (
          <>
             <div className="absolute inset-2 border-[12px] border-double opacity-10 z-20 pointer-events-none" style={{ borderColor: accentColor }} />
             <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-yellow-500 z-30" />
             {/* Dynamic Aim Reticle Corners */}
             <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-yellow-500 z-30" />
             <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-yellow-500 z-30" />
             <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-yellow-500 z-30" />
             <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-yellow-500 z-30" />
          </>
        ) : isChampion ? (
          <>
            {/* Bold Engraved Gold Frame */}
            <div className="absolute inset-2 border-[6px] border-double pointer-events-none z-20 shadow-[0_0_20px_rgba(234,179,8,0.2)]" 
                 style={{ borderColor: '#eab30866', borderStyle: 'double' }} />
            <div className="absolute inset-[10px] border-[1px] border-white/10 pointer-events-none z-20" />
            
            {/* Corner Ornaments - Championship Style */}
            <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none z-30 opacity-80">
              <div className="absolute top-3 left-3 w-4 h-4 border-t-4 border-l-4 border-yellow-500 rounded-tl-sm" />
              <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-yellow-500/40" />
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-30 opacity-80">
              <div className="absolute top-3 right-3 w-4 h-4 border-t-4 border-r-4 border-yellow-500 rounded-tr-sm" />
              <div className="absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 border-yellow-500/40" />
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none z-30 opacity-80">
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-4 border-l-4 border-yellow-500 rounded-bl-sm" />
              <div className="absolute bottom-5 left-5 w-8 h-8 border-b-2 border-l-2 border-yellow-500/40" />
            </div>
            <div className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none z-30 opacity-80">
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-4 border-r-4 border-yellow-500 rounded-br-sm" />
              <div className="absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 border-yellow-500/40" />
            </div>
          </>
        ) : isGlory ? (
          <>
            <div className="absolute inset-3 border-4 pointer-events-none z-20" style={{ borderColor: `${cardAccent}22`, borderStyle: 'double' }} />
            <div className="absolute inset-5 border border-dashed pointer-events-none z-20 opacity-30" style={{ borderColor: cardAccent }} />
            <div className="absolute top-2 left-2 w-10 h-10 border-t-4 border-l-4 z-30" style={{ borderColor: cardAccent, borderRadius: '8px 0 20px 0' }} />
            <div className="absolute top-2 right-2 w-10 h-10 border-t-4 border-r-4 z-30" style={{ borderColor: cardAccent, borderRadius: '0 8px 0 20px' }} />
            <div className="absolute bottom-2 left-2 w-10 h-10 border-b-4 border-l-4 z-30" style={{ borderColor: cardAccent, borderRadius: '0 20px 8px 0' }} />
            <div className="absolute bottom-2 right-2 w-10 h-10 border-b-4 border-r-4 z-30" style={{ borderColor: cardAccent, borderRadius: '20px 0 0 8px' }} />
            <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full z-40" style={{ backgroundColor: cardAccent }} />
            <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full z-40" style={{ backgroundColor: cardAccent }} />
            <div className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full z-40" style={{ backgroundColor: cardAccent }} />
            <div className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full z-40" style={{ backgroundColor: cardAccent }} />
          </>
        ) : isLegacy ? (
          <div className="absolute inset-4 border border-double pointer-events-none z-20" style={{ borderColor: `${cardAccent}33`, borderWidth: '3px' }} />
        ) : (
          !isAsymmetric && <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: cardAccent }} />
        )}

        {/* Header */}
        <div className={`h-24 p-5 flex items-center justify-between relative z-10 ${isAsymmetric ? 'flex-row-reverse' : ''}`}>
          <div className="flex -space-x-2">
            {logos.map(logo => (
              <img 
                key={logo.id} 
                src={logo.url} 
                alt="" 
                style={{ maxHeight: logo.size / 2, width: 'auto' }}
                className="object-contain ring-2 ring-white rounded-lg bg-white shadow-lg"
              />
            ))}
            {logos.length === 0 && <div className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm"><ImageIcon className="w-5 h-5 text-slate-300" /></div>}
          </div>
          <div className="text-right">
             <div className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 ${isChampion || isProX ? 'text-yellow-400 opacity-100' : 'opacity-40'}`}>E-PASS ID</div>
             <div className={`text-[12px] font-mono font-black ${isChampion || isProX ? 'text-white' : ''}`} style={{ color: (isChampion || isProX) ? undefined : cardAccent }}>{person.id.substring(0, 8)}</div>
          </div>
        </div>

        {/* Dynamic Sporty Lines for Glory/Champion theme */}
        {(isGlory || isChampion) && (
          <div className="absolute top-24 left-0 w-full h-1 opacity-20 z-10" style={{ background: `linear-gradient(90deg, transparent, ${isChampion ? '#eab308' : cardAccent}, transparent)` }} />
        )}

        {/* Main Content Area */}
        <div className={`p-6 flex flex-col flex-1 relative z-10 ${isAsymmetric ? 'items-start pl-8' : 'items-center'}`}>
          <div className={`w-full mb-6 ${isAsymmetric ? 'text-left' : 'text-center'}`}>
            <h2 className={`text-[12px] font-black uppercase tracking-[0.3em] mb-1 scale-y-110 ${isLegacy || isGlory || isChampion || isProX ? 'font-serif italic' : 'font-oswald'} ${textPrimary}`}>
              {cardTitle}
            </h2>
            <div className={`h-px w-16 mx-auto mt-2 ${isChampion || isProX ? 'bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent' : 'bg-slate-200'}`} style={{ backgroundColor: (isAsymmetric || isChampion || isProX) ? undefined : `${cardAccent}33` }} />
          </div>

          <div className={`flex flex-col gap-6 w-full ${isAsymmetric ? 'items-start' : 'items-center'}`}>
            {/* Name Section with Custom Typography */}
            <div className="relative group text-center">
              {(isLegacy || isGlory || isChampion || isProX) && (
                <div className={`absolute -top-4 left-0 w-full text-center text-[10px] uppercase font-black tracking-[0.3em] ${isChampion || isProX ? 'text-yellow-500' : 'font-serif italic text-slate-400 opacity-50'}`}>
                  {isChampion || isProX ? 'Elite Pro Archer' : 'Grand Athlete'}
                </div>
              )}
              <h1 className={`text-4xl leading-[0.85] font-black uppercase mb-1 drop-shadow-sm ${isProX ? 'font-oswald italic tracking-tighter' : isLegacy || isGlory || isChampion ? 'font-serif tracking-normal' : 'font-oswald italic tracking-tighter'} ${textPrimary}`}>
                {isChampion || isProX ? (
                  <>
                    <span className="block drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{person.name.split(' ')[0]}</span>
                    <span className="text-yellow-400 block mt-1 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]">{person.name.split(' ').slice(1).join(' ')}</span>
                  </>
                ) : (
                  <>
                    {person.name.split(' ')[0]}<br/>
                    <span style={{ color: (isLegacy || isGlory) ? '#78350f' : cardAccent }}>{person.name.split(' ').slice(1).join(' ')}</span>
                  </>
                )}
              </h1>
              <p className={`text-[12px] font-black mt-2 tracking-widest ${textSecondary}`}>
                {person.club}
              </p>
            </div>

            {/* QR Section with Premium Container */}
            <div className={`flex items-end gap-6 ${isAsymmetric ? 'flex-row' : 'flex-col'}`}>
              <div className={`p-4 rounded-[2rem] shadow-2xl relative group ${isChampion || isProX ? 'bg-white/10 backdrop-blur-md border border-white/20' : isStealth || isGlory ? 'bg-white' : 'bg-white shadow-slate-200'}`}>
                 {(isChampion || isProX) && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]" />}
                 <div className="bg-white p-1 rounded-lg">
                    <QRCodeSVG value={person.id} size={person.id.length > 20 ? 80 : 100} level="H" />
                 </div>
              </div>
              
              <div className={`flex flex-col ${isAsymmetric ? 'items-start' : 'items-center'} gap-2`}>
                <span className={`text-[10px] font-black px-6 py-2 rounded-full text-white uppercase tracking-[0.2em] shadow-lg ${isLegacy || isGlory || isChampion || isProX ? 'rounded-none border-y-2 border-white/20' : 'skew-x-[-10deg]'}`} style={{ backgroundColor: (isChampion || isProX) ? '#ca8a04' : cardAccent }}>
                  {isOfficial ? 'CREW' : person.category}
                </span>
                {(isChampion || isProX) && <div className="text-[8px] font-black uppercase text-yellow-500 tracking-[0.4em] mt-1">Official Member</div>}
              </div>
            </div>
          </div>

          {/* Technical Data Grid with Glare Effect */}
          {!isOfficial && (
            <div className={`mt-auto w-full grid grid-cols-2 gap-px bg-slate-100 border border-slate-100 rounded-3xl overflow-hidden shadow-2xl ${isChampion || isProX ? 'border-white/10 bg-white/5 backdrop-blur-md' : isGlory ? 'border-amber-200/50' : ''}`}>
               <div className={`${isStealth ? 'bg-slate-900' : (isChampion || isProX) ? 'bg-white/5' : 'bg-white/50'} p-4 flex flex-col items-center relative overflow-hidden`}>
                  {(isGlory || isChampion || isProX) && <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: (isChampion || isProX) ? '#eab308' : cardAccent }} />}
                  <span className={`text-[7px] font-black uppercase tracking-widest mb-1 ${(isChampion || isProX) ? 'text-yellow-500' : 'text-slate-400'}`}>Target</span>
                  <span className={`text-2xl font-black ${textPrimary}`}>{person.targetNo}{person.position}</span>
               </div>
               <div className={`${isStealth ? 'bg-slate-900' : (isChampion || isProX) ? 'bg-white/5' : 'bg-white/50'} p-4 flex flex-col items-center relative overflow-hidden`}>
                  {(isGlory || isChampion || isProX) && <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: (isChampion || isProX) ? '#eab308' : cardAccent }} />}
                  <span className={`text-[7px] font-black uppercase tracking-widest mb-1 ${(isChampion || isProX) ? 'text-yellow-500' : 'text-slate-400'}`}>Session</span>
                  <span className={`text-2xl font-black ${textPrimary}`}>{person.wave}</span>
               </div>
            </div>
          )}
          
          {isOfficial && (
            <div className={`mt-auto w-full p-4 rounded-3xl border flex items-center justify-between ${(isChampion || isProX) ? 'border-yellow-500/30 bg-yellow-500/5 backdrop-blur-md' : isStealth || isGlory ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
               <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl shadow-lg ${(isChampion || isProX) ? 'bg-yellow-500' : 'bg-blue-600'}`}>
                     <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                     <p className={`text-[12px] font-black leading-none uppercase ${(isChampion || isProX) ? 'text-white' : isGlory ? 'text-slate-900' : textPrimary}`}>Full Access</p>
                     <p className={`text-[8px] font-bold uppercase mt-1.5 ${(isChampion || isProX) ? 'text-yellow-500' : 'text-slate-400'}`}>Verified Personnel</p>
                  </div>
               </div>
               <div className={`text-[10px] font-black font-mono rotate-90 opacity-40 italic ${(isChampion || isProX) ? 'text-yellow-500' : ''}`}>AUTHORIZED</div>
            </div>
          )}
        </div>

        {/* Side Rail Text */}
        {isAsymmetric && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-slate-900 flex items-center justify-center p-2">
             <span className="text-[10px] font-black text-white uppercase tracking-[0.5em] whitespace-nowrap rotate-90" style={{ color: cardAccent }}>
                {cardSubtitle || 'TOURNAMENT PRESTIGE'}
             </span>
          </div>
        )}

        {/* Global Footer (Non-Glory / Non-Champion / Non-ProX) */}
        {(!isAsymmetric && !isGlory && !isChampion && !isProX) && (
          <div className="h-12 flex items-center justify-center relative z-10 pt-2" style={{ borderTop: `1px solid ${cardAccent}22` }}>
             <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${textSecondary}`}>
                • {cardSubtitle} •
             </span>
          </div>
        )}

        {/* Glory / Champion / ProX Footer with Premium Shine */}
        {(isGlory || isChampion || isProX) && (
           <div className={`h-12 flex items-center justify-between px-6 relative z-10 overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.2)]`} 
                style={{ backgroundColor: (isChampion || isProX) ? (isProX ? '#eab308' : '#ca8a04') : cardAccent }}>
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] translate-x-[-100%] animate-[shimmer_3s_infinite]" />
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(0,0,0,0.4)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.4)_50%,rgba(0,0,0,0.4)_75%,transparent_75%,transparent)] bg-[length:10px_10px]" />
              
              <div className="flex flex-col items-start relative z-10">
                 <span className={`text-[11px] font-black uppercase italic tracking-[0.2em] ${isProX ? 'text-slate-900' : 'text-white'} drop-shadow-sm`}>
                   {cardSubtitle}
                 </span>
                 {isProX && <span className="text-[6px] font-bold text-slate-800 uppercase tracking-[0.3em] leading-none">Official Pro Circuit</span>}
              </div>
              
              {(isProX) && <Target className="w-5 h-5 text-slate-900 opacity-80 relative z-10" />}
           </div>
        )}
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
                         { id: 'PRO_ARCHER_X', name: 'X-Dynamic', icon: Crosshair, color: '#eab308', pattern: 'SPORTY_BURST' },
                         { id: 'CHAMPION_ELITE', name: 'Champion Elite', icon: Trophy, color: '#eab308', pattern: 'SPORTY_BURST' },
                         { id: 'GLORY_ULTIMATE', name: 'Glory Ultimate', icon: Star, color: '#f59e0b', pattern: 'SPORTY_BURST' },
                         { id: 'SPORTY_MODERN', name: 'Modern Sporty', icon: Activity, color: '#ef4444', pattern: 'SPORTY_MESH' },
                         { id: 'TRADITIONAL_LEGACY', name: 'Legacy Heritage', icon: ShieldCheck, color: '#78350f', pattern: 'HERITAGE_PAPER' },
                         { id: 'STEALTH_ELITE', name: 'Elite Stealth', icon: Maximize, color: '#E61E2A', pattern: 'CARBON' },
                         { id: 'ASYMETRIC_PRO', name: 'Asymmetric Pro', icon: Layout, color: '#2563eb', pattern: 'BAMBOO_WEAVE' }
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
                           <div className="flex flex-col items-start">
                             <span className="text-[8px] font-black uppercase tracking-tighter text-left leading-tight">{t.name}</span>
                             {t.id === 'CHAMPION_ELITE' && <span className="text-[6px] font-bold text-yellow-500 uppercase tracking-widest mt-0.5">Ultra Premium</span>}
                             {t.id === 'PRO_ARCHER_X' && <span className="text-[6px] font-bold text-yellow-500 uppercase tracking-widest mt-0.5">Sports Dynamic</span>}
                           </div>
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
                       {(['CLEAN', 'SPORTY_MESH', 'DIAGONAL_SPEED', 'DYNAMIC_WAVES', 'CARBON', 'HERITAGE_PAPER', 'BAMBOO_WEAVE', 'ETHNIC_MODERN', 'SPORTY_BURST'] as BgPattern[]).map(p => (
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
