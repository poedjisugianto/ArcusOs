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
      text: (
        <div className="space-y-6 text-slate-500 font-medium italic">
          <p>ARCUS DIGITAL berkomitmen untuk melindungi privasi Anda. Halaman ini menjelaskan bagaimana kami mengumpulkan dan menggunakan data Anda.</p>
          <div className="space-y-4">
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest">1. Data yang Dikumpulkan</h4>
            <p>Kami mengumpulkan data peserta meliputi Nama Lengkap, Alamat Email, Nomor WhatsApp, dan Nama Klub untuk keperluan administrasi turnamen dan verifikasi skor.</p>
            
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest">2. Penggunaan Data</h4>
            <p>Data digunakan untuk pembuatan ID Card peserta, pengiriman informasi turnamen via email/WhatsApp, serta sinkronisasi skor pada sistem live-results.</p>
            
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest">3. Keamanan</h4>
            <p>Semua data pribadi disimpan secara aman dan tidak akan dibagikan kepada pihak ketiga atau pengiklan tanpa izin tertulis dari Anda.</p>
          </div>
        </div>
      )
    },
    TERMS: {
      title: 'Syarat & Ketentuan',
      icon: Gavel,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      text: (
        <div className="space-y-6 text-slate-500 font-medium italic">
          <p>Harap baca Syarat dan Ketentuan berikut sebelum menggunakan layanan ARCUS DIGITAL.</p>
          <div className="space-y-4">
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest">1. Pendaftaran & Pembayaran</h4>
            <p>Pendaftaran dianggap sah apabila peserta telah menyelesaikan pembayaran sesuai nominal yang ditentukan. Kami mendukung pembayaran via Transfer Manual dan Payment Gateway (QRIS, VA, E-Wallet).</p>
            
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest">2. Kebijakan Refund (Pengembalian Dana)</h4>
            <p>Dana yang sudah dibayarkan tidak dapat dikembalikan (Non-Refundable) kecuali turnamen dibatalkan sepenuhnya oleh pihak panitia. Dalam hal pembatalan event, proses refund akan dilakukan dalam 7-14 hari kerja.</p>
            
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest">3. Perilaku Peserta</h4>
            <p>Setiap bentuk kecurangan atau manipulasi skor akan berujung pada diskualifikasi permanen dari sistem ARCUS DIGITAL.</p>
            
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest">4. Layanan Pelanggan</h4>
            <p>Jika terdapat kendala transaksi, hubungi Support WhatsApp di nomor yang tertera di menu Kontak Support.</p>
          </div>
        </div>
      )
    },
    DOCUMENTATION: {
      title: 'Dokumentasi & Fitur',
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      text: (
        <div className="space-y-6 text-slate-500 font-medium italic">
          <p>ARCUS DIGITAL Tournament OS adalah solusi manajemen data digital untuk olahraga Panahan.</p>
          <div className="space-y-4">
            <h4 className="text-slate-900 font-black uppercase text-sm tracking-widest">Fitur Utama:</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Manajemen Registrasi Online Terintegrasi.</li>
              <li>Sistem Scoring Digital & Live Scoreboard.</li>
              <li>Manajemen Bagan Eliminasi (H2H) Otomatis.</li>
              <li>PWA Ready (Dapat diinstal di Android/iOS).</li>
            </ul>
          </div>
        </div>
      )
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
