import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, Printer, Image as ImageIcon, Plus, Trash2, 
  Settings, User, MapPin, Calendar, Layout, Download,
  Type, Move, Maximize
} from 'lucide-react';
import { Archer, TournamentSettings } from '../types';
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

const IdCardEditor: React.FC<Props> = ({ archers, settings, onBack }) => {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [cardTitle, setCardTitle] = useState(settings.tournamentName || 'KARTU PESERTA');
  const [cardSubtitle, setCardSubtitle] = useState(settings.location || 'ARCUS ARCHERY TOURNAMENT');
  const [cardDate, setCardDate] = useState(settings.eventDate ? new Date(settings.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const [accentColor, setAccentColor] = useState('#ef4444'); // Default red
  const [showEditor, setShowEditor] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
                <h1 className="text-2xl md:text-3xl font-black font-oswald uppercase italic leading-none text-slate-900">Editor Kartu Peserta</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Design & Print Participant ID Cards</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint}
                className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
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
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <h3 className="font-black font-oswald uppercase italic text-slate-900">Logo & Visual</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo Panitia / Sponsor</span>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 transition-all"
                    >
                      <Plus className="w-3 h-3" /> Tambah Logo
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleAddLogo} 
                      className="hidden" 
                      accept="image/*" 
                    />
                  </div>

                  <div className="space-y-3">
                    {logos.map(logo => (
                      <div key={logo.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between gap-4 group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img src={logo.url} alt="" className="w-8 h-8 object-contain bg-white rounded border" />
                          <span className="text-[9px] font-bold text-slate-600 truncate">{logo.name}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <input 
                            type="range" 
                            min="20" 
                            max="150" 
                            value={logo.size} 
                            onChange={e => updateLogo(logo.id, { size: parseInt(e.target.value) })}
                            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <button 
                            onClick={() => removeLogo(logo.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {logos.length === 0 && (
                      <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-center">Belum ada logo diupload</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <label className="block space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Type className="w-3 h-3" /> Judul Kartu
                      </span>
                      <input 
                        type="text" 
                        value={cardTitle}
                        onChange={e => setCardTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-slate-900 focus:ring-2 ring-slate-100"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Layout className="w-3 h-3" /> Warna Aksen
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#000000'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setAccentColor(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${accentColor === color ? 'border-amber-400 scale-110 shadow-lg' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-100/50 p-6 rounded-3xl border border-amber-200/50">
                <div className="flex gap-4">
                   <Settings className="w-6 h-6 text-amber-600 mt-1" />
                   <div>
                     <h4 className="text-xs font-black uppercase italic text-amber-900">Tips Pencetakan</h4>
                     <p className="text-[10px] font-medium text-amber-800/80 leading-relaxed mt-1">
                       Gunakan browser Chrome untuk hasil terbaik. Atur "Margins" ke "None" dan aktifkan "Background Graphics" di pengaturan cetak browser Anda.
                     </p>
                   </div>
                </div>
              </div>
            </div>

            {/* Preview Area */}
            <div className="xl:col-span-2">
              <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden flex items-center justify-center">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                  <ImageIcon className="w-64 h-64 text-white rotate-12" />
                </div>
                
                {/* ID Card Prototype Preview */}
                <div className="relative z-10 w-full max-w-sm">
                  <div className="aspect-[2/3] bg-white rounded-2xl shadow-2xl overflow-hidden relative border-4 border-white">
                    {/* Header with Logos */}
                    <div className="h-24 bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-center gap-4 relative">
                      {logos.map(logo => (
                        <img 
                          key={logo.id} 
                          src={logo.url} 
                          alt="" 
                          style={{ maxHeight: logo.size / 2, width: 'auto' }}
                          className="object-contain"
                        />
                      ))}
                      {logos.length === 0 && <span className="text-[8px] font-black text-slate-300 uppercase italic">Header Area</span>}
                    </div>

                    {/* Participant Info Body */}
                    <div className="p-6 flex flex-col items-center justify-center flex-1 space-y-6">
                      <div className="text-center space-y-1">
                        <h2 className="text-[14px] font-black font-oswald uppercase italic leading-tight text-slate-800">{cardTitle}</h2>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{cardSubtitle}</p>
                      </div>

                      <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-slate-100 p-2">
                        <QRCodeSVG value={archers[0]?.id || 'SAMPLE'} size={80} level="M" />
                      </div>

                      <div className="text-center space-y-2 w-full">
                        <h1 className="text-xl font-black font-oswald uppercase italic leading-none text-slate-900 border-b-2 pb-1" style={{ borderColor: accentColor }}>
                          {archers[0]?.name || 'Nama Peserta'}
                        </h1>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-full uppercase italic">
                            {archers[0]?.club || 'Klub Panahan'}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Bantalan {archers[0]?.targetNo}{archers[0]?.position} • Sesi {archers[0]?.wave}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer / Stripe */}
                    <div className="h-12 flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                       <span className="text-[10px] font-black text-white uppercase italic tracking-tighter">OFFICIAL PARTICIPANT</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contoh Tampilan Kartu</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actual Printable Layout */}
      <div className={`${showEditor ? 'hidden' : 'block'} bg-white`}>
        <div className="grid grid-cols-2 gap-4 p-4">
          {archers.map((archer, idx) => (
            <div key={archer.id} className="w-full aspect-[2/3] border border-slate-200 overflow-hidden flex flex-col break-inside-avoid shadow-sm print:shadow-none">
                {/* Header with Logos */}
                <div className="h-20 bg-slate-50 p-3 border-b border-slate-100 flex items-center justify-center gap-3 relative">
                  {logos.map(logo => (
                    <img 
                      key={logo.id} 
                      src={logo.url} 
                      alt="" 
                      style={{ maxHeight: logo.size / 2, width: 'auto' }}
                      className="object-contain"
                    />
                  ))}
                  {logos.length === 0 && <ImageIcon className="w-10 h-10 text-slate-100" />}
                </div>

                {/* Participant Info Body */}
                <div className="p-5 flex flex-col items-center justify-between flex-1 space-y-4">
                  <div className="text-center space-y-1">
                    <h2 className="text-[10px] font-black font-oswald uppercase italic leading-tight text-slate-800">{cardTitle}</h2>
                    {cardDate && <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{cardDate}</p>}
                  </div>

                  <div className="flex items-center justify-center p-1 border-2 border-slate-100 rounded-lg">
                    <QRCodeSVG value={archer.id} size={70} level="M" />
                  </div>

                  <div className="text-center space-y-2 w-full">
                    <h1 className="text-lg font-black font-oswald uppercase italic leading-none text-slate-900 border-b-2 pb-1" style={{ borderColor: accentColor }}>
                      {archer.name}
                    </h1>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-600 uppercase italic">
                        {archer.club}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {archer.category}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-black">
                          {archer.targetNo}{archer.position}
                        </span>
                        <span className="border border-slate-200 px-2 py-0.5 rounded text-[8px] font-black text-slate-400">
                          SESI {archer.wave}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Stripe */}
                <div className="h-8 flex items-center justify-center mt-auto" style={{ backgroundColor: accentColor }}>
                   <span className="text-[8px] font-black text-white uppercase italic tracking-[0.2em]">{cardSubtitle || 'OFFICIAL PARTICIPANT'}</span>
                </div>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            background: white !important;
          }
          .animate-in {
            animation: none !important;
          }
        }
      `}} />
    </div>
  );
};

export default IdCardEditor;
