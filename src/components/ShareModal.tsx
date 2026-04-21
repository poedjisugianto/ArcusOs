import React from 'react';
import { X, Copy, Check, Share2, Globe, MessageCircle, Twitter, Facebook } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tournamentName: string;
  url: string;
}

export default function ShareModal({ isOpen, onClose, tournamentName, url }: Props) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { name: 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-500', link: `https://wa.me/?text=${encodeURIComponent(`Ikuti turnamen ${tournamentName} di Arcus Digital: ${url}`)}` },
    { name: 'Facebook', icon: Facebook, color: 'bg-blue-600', link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { name: 'Twitter', icon: Twitter, color: 'bg-slate-900', link: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Ikuti turnamen ${tournamentName} di Arcus Digital: ${url}`)}` }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black font-oswald uppercase italic text-slate-900 leading-none">Bagikan Event</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tournament OS v1.2.0</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link Turnamen</p>
            <div className="flex gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100">
              <input 
                readOnly
                value={url}
                className="flex-1 bg-transparent px-4 text-xs font-bold text-slate-900 outline-none"
              />
              <button 
                onClick={handleCopy}
                className={`px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {shareOptions.map(option => (
              <a 
                key={option.name}
                href={option.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 group"
              >
                <div className={`w-14 h-14 ${option.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <option.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{option.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
