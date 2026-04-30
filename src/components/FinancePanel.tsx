
import React, { useState } from 'react';
import { ArcheryEvent, ParticipantRegistration, Archer, GlobalSettings } from '../types';
import { 
  DollarSign, X, Check, Copy, Landmark, Clock, 
  TrendingUp, CreditCard, ArrowUpRight, AlertCircle, 
  Receipt, ShieldCheck, Zap, Info, Printer
} from 'lucide-react';
import ArcusLogo from './ArcusLogo';
import { CATEGORY_LABELS } from '../constants';

interface Props {
  event: ArcheryEvent;
  globalSettings: GlobalSettings;
  onApproveRegistration: (regId: string) => void;
  onPayPlatformFee: (eventId: string) => void;
  onBack: () => void;
  isSuperAdmin?: boolean;
}

const FinancePanel: React.FC<Props> = ({ event, globalSettings, onApproveRegistration, onPayPlatformFee, onBack, isSuperAdmin = false }) => {
  const [copied, setCopied] = useState(false);
  const [showProofOverlay, setShowProofOverlay] = useState<{ url: string; id: string } | null>(null);
  const [showSavedFlag, setShowSavedFlag] = useState(false);
  const [flagMessage, setFlagMessage] = useState('');

  const isKidsCategory = (cat: string) => {
    return [
      'U18_PUTRA', 'U18_PUTRI', 
      'U12_PUTRA', 'U12_PUTRI', 
      'U9_PUTRA', 'U9_PUTRI'
    ].includes(cat);
  };

  // Use unique participants to avoid double counting revenue/fees
  const uniqueParticipants = Array.from(
    new Map([...(event.registrations || []), ...(event.archers || [])].map(p => [p.id, p])).values()
  );
  
  const totalRevenue = uniqueParticipants.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0);
  
  const totalPlatformFees = event.settings.isFreeEvent ? 0 : uniqueParticipants.reduce((acc, curr) => {
    // If platformFee is missing or 0, fallback to globalSettings fee
    const fee = curr.platformFee && curr.platformFee > 0 
      ? curr.platformFee 
      : (isKidsCategory(curr.category) ? globalSettings.feeKids : globalSettings.feeAdult);
    return acc + fee;
  }, 0);
  const netBalance = totalRevenue - totalPlatformFees;
  const isFeePaid = event.settings.platformFeePaidToOwner || event.settings.isFreeEvent;

  const triggerFlag = (msg: string) => {
    setFlagMessage(msg);
    setShowSavedFlag(true);
    setTimeout(() => setShowSavedFlag(false), 3000);
  };

  const copyRegLink = () => {
    const url = window.location.origin + "?event=" + event.id;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = (id: string) => {
    onApproveRegistration(id);
    triggerFlag("Pendaftaran Berhasil Dikonfirmasi");
  };

  const handlePayFee = () => {
    onPayPlatformFee(event.id);
    triggerFlag("Fee Platform Berhasil Dibayar");
  };

  return (
    <div className="space-y-6 relative">
      {/* Saved Success Flag */}
      {showSavedFlag && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white">
            <Check className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">{flagMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-4">
           <div className="bg-slate-50 p-3 rounded-2xl border">
              <DollarSign className="w-6 h-6 text-arcus-red" />
           </div>
           <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-oswald uppercase italic leading-none">Laporan Finansial</h3>
                {event.settings.isFreeEvent && (
                  <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter">Internal / Free</span>
                )}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sistem: Pembayaran Terpusat (Super Admin)</p>
           </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={copyRegLink}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${copied ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-black'}`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link Pendaftaran' : 'Link Pendaftaran'}
          </button>
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 hover:text-arcus-red rounded-2xl border transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Revenue vs Fee Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl border border-white/5">
           <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
                    <TrendingUp className="w-5 h-5" />
                 </div>
                 <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total Akumulasi Pendaftaran (Bruto)</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="space-y-1">
                   <p className="text-6xl font-black font-oswald italic tracking-tighter tabular-nums text-emerald-400">Rp {totalRevenue.toLocaleString()}</p>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Total uang masuk via Gateway & Manual ke Rekening Pusat</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Total Biaya Platform</span>
                      <span className="text-orange-400">- Rp {totalPlatformFees.toLocaleString()}</span>
                   </div>
                   <div className="h-px bg-white/10"></div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Saldo Bersih Panitia</span>
                      <span className="text-xl font-bold font-oswald text-white tabular-nums">Rp {netBalance.toLocaleString()}</span>
                   </div>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-4">
                 <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Aliran Dana: Dikelola Super Admin</span>
                 </div>
              </div>
           </div>
           <ArcusLogo className="absolute right-[-40px] bottom-[-40px] w-64 h-64 opacity-[0.03] rotate-12 pointer-events-none" />
        </div>

        <div className={`rounded-[3rem] p-10 flex flex-col justify-between relative overflow-hidden shadow-xl border ${isFeePaid ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isFeePaid ? 'text-green-600' : 'text-slate-600'}`}>Status Pencairan Dana</h4>
                 {isFeePaid ? <ShieldCheck className="w-6 h-6 text-green-600" /> : <Clock className="w-6 h-6 text-slate-400" />}
              </div>
              <div>
                 <p className={`text-4xl font-black font-oswald italic leading-none ${isFeePaid ? 'text-green-700' : 'text-slate-700'}`}>Rp {netBalance.toLocaleString()}</p>
                 <p className={`text-[9px] font-bold uppercase mt-2 ${isFeePaid ? 'text-green-600' : 'text-slate-500'}`}>
                    {isFeePaid ? 'Sudah Dicairkan ke Panitia' : 'Tersedia untuk Dicairkan'}
                 </p>
              </div>
           </div>
           
           {!isFeePaid && netBalance > 0 && isSuperAdmin && (
             <button 
               onClick={handlePayFee}
               className="mt-8 bg-emerald-600 text-white w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3"
             >
               Konfirmasi Pencairan <Landmark className="w-4 h-4" />
             </button>
           )}

           {isFeePaid && (
             <div className="mt-8 bg-green-600/10 border border-green-200 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">Dana Telah Ditransfer ke Rekening Panitia</p>
             </div>
           )}
        </div>
      </div>

      {/* Verification List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-8 py-6 bg-slate-50 border-b flex justify-between items-center">
          <h3 className="font-black font-oswald uppercase text-slate-900 flex items-center gap-3 italic text-lg">
            Verifikasi Pendaftaran
          </h3>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">
              Total Pendaftar: {uniqueParticipants.length}
            </div>
            <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-orange-100">
              Menunggu Konfirmasi: {(event.registrations || []).filter(reg => reg.status !== 'APPROVED').length}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white text-[9px] font-black uppercase tracking-widest border-b text-slate-400">
                <th className="px-8 py-4">Pemanah & Klub</th>
                <th className="px-8 py-4">Kontak</th>
                <th className="px-8 py-4">Metode</th>
                <th className="px-8 py-4 text-center">Bukti Bayar</th>
                <th className="px-8 py-4 text-right">Nominal</th>
                <th className="px-8 py-4 text-right pr-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(event.registrations || []).filter(reg => reg.status !== 'APPROVED').map(reg => (
                <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-900 uppercase font-oswald italic leading-none">{reg.name}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase mt-1">{reg.club}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-black text-slate-600">{reg.phone || '-'}</p>
                    <p className="text-[8px] text-slate-400 truncate max-w-[120px]">{reg.email}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md border text-center ${reg.paymentType === 'GATEWAY' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {reg.paymentType}
                      </span>
                      {reg.paymentType === 'GATEWAY' && (
                        <span className="text-[7px] font-bold text-blue-500 uppercase tracking-tighter flex items-center gap-1">
                          <Zap className="w-2 h-2" /> Auto-Verified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    {(reg.paymentProofUrl || reg.paymentProof) ? (
                      <button onClick={() => setShowProofOverlay({ url: reg.paymentProofUrl || reg.paymentProof || '', id: reg.id })} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-md hover:scale-110 transition-transform">
                        <img src={reg.paymentProofUrl || reg.paymentProof} className="w-full h-full object-cover" alt="Proof" />
                      </button>
                    ) : <span className="text-[10px] text-slate-300 italic font-bold">Otomatis/Gateway</span>}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-slate-900">
                    Rp {(reg.totalPaid || 0).toLocaleString()}
                  </td>
                  <td className="px-8 py-6 text-right pr-12">
                    <button 
                      onClick={() => handleApprove(reg.id)}
                      className="bg-red-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-600/10 hover:brightness-110 transition-all active:scale-95"
                    >
                      SETUJU
                    </button>
                  </td>
                </tr>
              ))}
              {event.registrations.filter(reg => reg.status !== 'APPROVED').length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                     <Receipt className="w-12 h-12 mx-auto text-slate-100 mb-4" />
                     <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Semua pendaftar telah masuk ke Daftar Peserta</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Overlay */}
      {showProofOverlay && (
        <div className="fixed inset-0 bg-slate-950/95 z-[500] flex flex-col items-center justify-center p-8 animate-in fade-in" onClick={() => setShowProofOverlay(null)}>
          <div className="relative group max-w-full max-h-[80vh]">
            <img src={showProofOverlay.url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border-4 border-white" alt="Proof" />
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(showProofOverlay.id);
                  setShowProofOverlay(null);
                }}
                className="bg-red-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-red-600/40 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-3"
              >
                <Check className="w-5 h-5" /> SETUJU
              </button>
              <button className="text-white p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all backdrop-blur-md border border-white/20"><X className="w-6 h-6" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePanel;
