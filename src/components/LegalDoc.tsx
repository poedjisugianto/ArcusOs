import React from 'react';
import { ArrowLeft, ShieldCheck, Gavel, FileText, Info, Sparkles } from 'lucide-react';

interface Props {
  type: 'PRIVACY' | 'TERMS' | 'DOCUMENTATION';
  onBack: () => void;
}

export default function LegalDoc({ type, onBack }: Props) {
  const content = {
    PRIVACY: {
      title: 'Kebijakan Privasi',
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      text: `ARCUS DIGITAL berkomitmen untuk melindungi privasi Anda. Kami hanya mengumpulkan data yang diperlukan untuk manajemen turnamen panahan, seperti nama, email, dan klub panahan. Data Anda tidak akan dibagikan kepada pihak ketiga tanpa persetujuan Anda.`
    },
    TERMS: {
      title: 'Syarat & Ketentuan',
      icon: Gavel,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      text: `Dengan menggunakan platform ARCUS DIGITAL, Anda setuju untuk mematuhi semua aturan dan regulasi yang ditetapkan oleh panitia turnamen. Penyalahgunaan sistem scoring atau manipulasi data dapat mengakibatkan diskualifikasi.`
    },
    DOCUMENTATION: {
      title: 'Dokumentasi',
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      text: `ARCUS DIGITAL Tournament OS adalah platform manajemen turnamen panahan modern. Fitur utama meliputi scoring real-time, manajemen eliminasi otomatis, dan live scoreboard publik.`
    }
  };

  const doc = content[type];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack}
              className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl font-black font-oswald uppercase italic text-slate-900 leading-none tracking-tight">{doc.title}</h2>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Tournament OS v1.2.0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-12">
        <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-slate-200 border border-slate-100 space-y-10">
          <div className={`w-20 h-20 ${doc.bg} rounded-[2rem] flex items-center justify-center`}>
            <doc.icon className={`w-10 h-10 ${doc.color}`} />
          </div>
          <div className="prose prose-slate max-w-none">
            <h3 className="text-4xl font-black font-oswald uppercase italic text-slate-900 tracking-tight mb-8">{doc.title}</h3>
            <p className="text-slate-500 text-lg leading-relaxed font-medium">
              {doc.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
