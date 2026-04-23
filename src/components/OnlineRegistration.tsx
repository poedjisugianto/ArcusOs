import React, { useState } from 'react';
import { toast } from 'sonner';
import { ArcheryEvent, GlobalSettings, ParticipantRegistration, CategoryType } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { 
  ArrowLeft, User, Mail, ShieldCheck, CreditCard, 
  Upload, Check, AlertCircle, Zap, Sparkles, 
  Target, Trophy, Users, Activity, Info, FileText, Landmark, Smartphone
} from 'lucide-react';

interface Props {
  event: ArcheryEvent;
  globalSettings: GlobalSettings;
  onRegister: (r: ParticipantRegistration) => void;
  onBack: () => void;
  onViewParticipants: () => void;
}

export default function OnlineRegistration({ event, globalSettings, onRegister, onBack, onViewParticipants }: Props) {
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(`reg_step_${event.id}`);
    return saved ? parseInt(saved) : 1;
  });
  const isRegistrationClosed = event.settings.registrationDeadline && new Date() > new Date(event.settings.registrationDeadline);

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    club: string;
    category: string;
    paymentProof: string;
    paymentType: 'MANUAL' | 'GATEWAY';
    selectedPaymentMethodId: string;
    regType: 'ARCHER' | 'OFFICIAL';
  }>(() => {
    const saved = localStorage.getItem(`reg_draft_${event.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { console.error("Reg draft parse failed", e); }
    }
    return {
      name: '',
      email: '',
      club: '',
      category: '',
      paymentProof: '',
      paymentType: 'MANUAL',
      selectedPaymentMethodId: '',
      regType: 'ARCHER'
    };
  });

  // Persist form data and step
  React.useEffect(() => {
    localStorage.setItem(`reg_draft_${event.id}`, JSON.stringify(formData));
  }, [formData, event.id]);

  React.useEffect(() => {
    localStorage.setItem(`reg_step_${event.id}`, step.toString());
  }, [step, event.id]);

  const allCategories = (Object.keys(CategoryType) as CategoryType[]).filter(cat => cat !== CategoryType.OFFICIAL);
  const categories = event.settings.categoryConfigs && Object.keys(event.settings.categoryConfigs).length > 0
    ? Object.keys(event.settings.categoryConfigs).filter(cat => cat !== CategoryType.OFFICIAL) 
    : allCategories;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File terlalu besar (Maks 2MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, paymentProof: reader.result as string });
        toast.success("Bukti pembayaran siap diunggah");
      };
      reader.readAsDataURL(file);
    }
  };

  const availableManualMethods = (event.settings.paymentMethods && event.settings.paymentMethods.length > 0)
    ? event.settings.paymentMethods
    : [{ 
        id: 'global_default', 
        provider: globalSettings.bankProvider, 
        accountNumber: globalSettings.bankAccountNumber, 
        accountName: globalSettings.bankAccountName 
      }];

  const activeMethod = availableManualMethods.find((m: any) => m.id === formData.selectedPaymentMethodId) || availableManualMethods[0];

  const handleGatewayPayment = async (newReg: ParticipantRegistration) => {
    try {
      let amount = 0;
      if (formData.regType === 'OFFICIAL') {
        amount = event.settings.officialFee || 0;
      } else {
        const config = event.settings.categoryConfigs?.[formData.category as CategoryType];
        amount = config?.registrationFee || 0;
      }

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount,
          method: 'GATEWAY',
          provider: globalSettings.paymentGatewayProvider,
          customerDetails: {
            first_name: formData.name,
            email: formData.email
          },
          itemDetails: [{
            id: formData.regType === 'OFFICIAL' ? 'OFFICIAL' : formData.category,
            price: amount,
            quantity: 1,
            name: `Registrasi ${formData.regType === 'OFFICIAL' ? 'Official' : (CATEGORY_LABELS[formData.category as CategoryType] || formData.category)}`
          }]
        })
      });

      const data = await res.json();
      
      if (data.success && data.token) {
        // @ts-ignore
        window.snap.pay(data.token, {
          onSuccess: (result: any) => {
            onRegister({ ...newReg, status: 'PAID', paymentType: 'GATEWAY' });
            localStorage.removeItem(`reg_draft_${event.id}`);
            localStorage.removeItem(`reg_step_${event.id}`);
            setStep(3);
          },
          onPending: (result: any) => {
            onRegister({ ...newReg, status: 'PENDING', paymentType: 'GATEWAY' });
            setStep(3);
          },
          onError: (result: any) => {
            toast.error("Pembayaran Gagal");
          },
          onClose: () => {
            toast.info("Pembayaran Dibatalkan");
          }
        });
      } else if (data.success && data.qrData) {
        // Simulation mode with QR
        setStep(3);
        onRegister({ ...newReg, status: 'PAID', paymentType: 'GATEWAY' });
        toast.success("Pembayaran Berhasil Diverifikasi (Mode Simulasi)");
      } else {
        toast.error(data.message || "Gagal membuat transaksi");
      }
    } catch (err) {
      toast.error("Gagal menghubungkan ke Gateway");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.paymentType === 'MANUAL' && !formData.paymentProof) {
      toast.error("Silakan unggah bukti pembayaran terlebih dahulu");
      return;
    }
    
    // Generate Registration Number: ARC-[YEAR]-[RANDOM]
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const registrationNo = `ARC-${year}-${random}`;

    let totalPaid = 0;
    if (formData.regType === 'OFFICIAL') {
      totalPaid = event.settings.officialFee || 0;
    } else {
      const config = event.settings.categoryConfigs?.[formData.category as CategoryType];
      totalPaid = config?.registrationFee || 0;
    }
    const platformFee = Math.ceil(totalPaid * (globalSettings.platformFeePercentage / 100));

    const newReg: ParticipantRegistration = {
      id: 'reg_' + Math.random().toString(36).substr(2, 9),
      registrationNo,
      name: formData.name,
      email: formData.email,
      club: formData.club,
      category: formData.regType === 'OFFICIAL' ? 'OFFICIAL' : formData.category,
      paymentProof: formData.paymentType === 'MANUAL' ? formData.paymentProof : undefined,
      totalPaid,
      platformFee,
      status: formData.paymentType === 'GATEWAY' ? 'PENDING' : 'PENDING',
      paymentType: formData.paymentType,
      timestamp: Date.now()
    };

    if (formData.paymentType === 'GATEWAY') {
      handleGatewayPayment(newReg);
    } else {
      onRegister(newReg);
      // Clear drafts on success
      localStorage.removeItem(`reg_draft_${event.id}`);
      localStorage.removeItem(`reg_step_${event.id}`);
      setStep(3);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-slate-100/50 rounded-full blur-3xl -mr-96 -mt-96 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-50/30 rounded-full blur-3xl -ml-64 -mb-64 pointer-events-none" />

      {/* Modern Fixed Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 group">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={onBack}
              className="w-8 h-8 md:w-11 md:h-11 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl text-slate-400 hover:text-arcus-red hover:bg-red-50 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-xl font-black font-oswald uppercase italic text-slate-900 tracking-tighter leading-none">
                REGISTRASI
              </h1>
              <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic truncate max-w-[120px]">
                {event.settings.tournamentName}
              </p>
            </div>
          </div>
          <button 
            onClick={onViewParticipants}
            className="px-3 py-2 bg-slate-900 text-white rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Users className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden xs:inline">PESERTA</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 md:py-8 relative z-10">
        {isRegistrationClosed && step !== 3 && (
          <div className="mb-6 bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] text-center animate-in zoom-in duration-500">
             <div className="w-16 h-16 bg-arcus-red text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200">
                <AlertCircle className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-black font-oswald uppercase italic text-slate-900 leading-none mb-2">Pendaftaran Ditutup</h3>
             <p className="text-[10px] font-black text-arcus-red uppercase tracking-widest leading-loose">
               Waktu pendaftaran untuk event ini telah berakhir pada:<br/>
               {new Date(event.settings.registrationDeadline!).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
             </p>
             <button 
               onClick={onBack}
               className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-arcus-red transition-all active:scale-95 shadow-lg"
             >
               Kembali ke Beranda
             </button>
          </div>
        )}

        {!isRegistrationClosed && (
          <>
            {/* Progress Bar */}
            <div className="flex items-center justify-center gap-2 md:gap-6 mb-4 md:mb-10">
          {[1, 2, 3].map(i => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div className={`w-6 h-6 md:w-12 md:h-12 rounded md:rounded-xl flex items-center justify-center font-black font-oswald text-xs md:text-lg transition-all duration-500 border-2 ${step >= i ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-300 border-slate-100'}`}>
                  {i}
                </div>
                <span className={`text-[5px] md:text-[8px] font-black uppercase tracking-widest ${step >= i ? 'text-slate-900' : 'text-slate-300'}`}>
                  {i === 1 ? 'BIODATA' : i === 2 ? 'PEMBAYARAN' : 'SELESAI'}
                </span>
              </div>
              {i < 3 && <div className={`w-4 sm:w-16 h-0.5 mt-[-0.6rem] md:mt-[-1.5rem] ${step > i ? 'bg-slate-900' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3 md:space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="space-y-1 md:space-y-2 text-center">
              <span className="bg-arcus-red text-white text-[5px] md:text-[7px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest inline-block italic border border-white shadow-sm">Langkah Satu</span>
              <h2 className="text-sm md:text-3xl font-black font-oswald text-slate-900 uppercase italic tracking-tighter leading-none">PENGISIAN BIODATA</h2>
              <p className="text-slate-500 font-medium italic text-[8px] md:text-sm max-w-lg mx-auto px-4 opacity-80">Masukan informasi identitas asli Anda untuk verifikasi lapangan.</p>
            </div>

            <div className="bg-white rounded-xl md:rounded-[2.5rem] p-4 md:p-10 shadow-lg shadow-slate-950/5 border border-slate-100 relative overflow-hidden group mx-0 md:mx-0">
              <form className="space-y-4 md:space-y-8 relative z-10" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                {/* Registration Type Selector */}
                <div className="space-y-2 md:space-y-4">
                  <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center block">Tipe Pendaftaran</label>
                  <div className="flex gap-3 md:gap-6 bg-slate-50 p-1.5 md:p-2.5 rounded-xl md:rounded-3xl border border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, regType: 'ARCHER', category: '' })}
                      className={`flex-1 py-3 md:py-5 rounded-lg md:rounded-2xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 md:gap-2 border-2 ${formData.regType === 'ARCHER' ? 'bg-arcus-red border-arcus-red text-white shadow-xl shadow-red-200' : 'bg-red-50/50 border-red-100 text-arcus-red'}`}
                    >
                      <Target className={`w-4 h-4 md:w-6 md:h-6 ${formData.regType === 'ARCHER' ? 'text-white' : 'text-arcus-red'}`} />
                      ATLET PESERTA
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, regType: 'OFFICIAL', category: 'OFFICIAL' })}
                      className={`flex-1 py-3 md:py-5 rounded-lg md:rounded-2xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 md:gap-2 border-2 ${formData.regType === 'OFFICIAL' ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-blue-50/50 border-blue-100 text-blue-600'}`}
                    >
                      <Users className={`w-4 h-4 md:w-6 md:h-6 ${formData.regType === 'OFFICIAL' ? 'text-white' : 'text-blue-600'}`} />
                      OFFICIAL / PELATIH
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-[7px] md:text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">{formData.regType === 'ARCHER' ? 'Nama Lengkap Archer' : 'Nama Lengkap Official'}</label>
                    <div className="relative group/field">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-5 md:h-5 text-slate-500 group-focus-within/field:text-arcus-red transition-colors" />
                      <input 
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                        className="w-full pl-10 md:pl-14 pr-4 md:pr-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-lg md:rounded-2xl focus:border-arcus-red focus:bg-white transition-all text-xs md:text-base font-black font-oswald uppercase italic text-slate-900 placeholder:text-slate-400 outline-none"
                        placeholder="NAMA LENGKAP"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-[7px] md:text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Email Aktif</label>
                    <div className="relative group/field">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-5 md:h-5 text-slate-500 group-focus-within/field:text-arcus-red transition-colors" />
                      <input 
                        required
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 md:pl-14 pr-4 md:pr-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-lg md:rounded-2xl focus:border-arcus-red focus:bg-white transition-all text-xs md:text-base font-black font-oswald italic text-slate-900 placeholder:text-slate-400 outline-none"
                        placeholder="email@domain.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-[7px] md:text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Klub / Pengcab</label>
                    <div className="relative group/field">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-5 md:h-5 text-slate-500 group-focus-within/field:text-arcus-red transition-colors" />
                      <input 
                        required
                        value={formData.club}
                        onChange={e => setFormData({ ...formData, club: e.target.value.toUpperCase() })}
                        className="w-full pl-10 md:pl-14 pr-4 md:pr-6 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-lg md:rounded-2xl focus:border-arcus-red focus:bg-white transition-all text-xs md:text-base font-black font-oswald uppercase italic text-slate-900 placeholder:text-slate-400 outline-none"
                        placeholder={formData.regType === 'ARCHER' ? "KLUB ARCHERY" : "ASAL KLUB"}
                      />
                    </div>
                  </div>
                  {formData.regType === 'ARCHER' && (
                    <div className="space-y-1 md:space-y-2">
                      <label className="text-[7px] md:text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Kategori Lomba</label>
                      <div className="relative group/field">
                        <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-5 md:h-5 text-slate-500 pointer-events-none group-focus-within/field:text-arcus-red transition-colors" />
                        <select 
                          required
                          value={formData.category}
                          onChange={e => setFormData({ ...formData, category: e.target.value })}
                          className="w-full pl-10 md:pl-14 pr-4 md:pr-10 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-lg md:rounded-2xl focus:border-arcus-red focus:bg-white transition-all text-xs md:text-base font-black font-oswald uppercase italic text-slate-900 appearance-none cursor-pointer outline-none"
                        >
                          <option value="">PILIH KATEGORI</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{CATEGORY_LABELS[cat as CategoryType] || cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  {formData.regType === 'OFFICIAL' && (
                    <div className="space-y-1 md:space-y-2">
                       <label className="text-[7px] md:text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1">Kategori Khusus</label>
                       <div className="relative p-2.5 md:p-4 bg-blue-50 border-2 border-blue-100 rounded-lg md:rounded-2xl flex items-center gap-3">
                          <Users className="w-4 h-4 md:w-6 md:h-6 text-blue-500" />
                          <div className="flex flex-col">
                             <span className="text-[10px] md:text-sm font-black text-blue-900 uppercase italic leading-none">OFFICIAL / PELATIH</span>
                             <span className="text-[7px] md:text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">ID CARD & AKSES AREA STERIL</span>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 md:py-6 bg-slate-900 text-white rounded-lg md:rounded-2xl font-black uppercase tracking-[0.2em] text-[8px] md:text-xs hover:bg-arcus-red transition-all shadow-md flex items-center justify-center gap-2 md:gap-3 group active:scale-[0.98]"
                >
                  LANJUT KE PEMBAYARAN
                  <ArrowLeft className="w-3 h-3 md:w-5 md:h-5 rotate-180 group-hover:translate-x-2 transition-transform" />
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="space-y-4 text-center">
              <span className="bg-arcus-red text-white text-[7px] md:text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest inline-block italic border-2 border-white shadow-lg">Langkah Dua</span>
              <h2 className="text-3xl md:text-5xl font-black font-oswald text-slate-900 uppercase italic tracking-tighter leading-none">MODALITAS PEMBAYARAN</h2>
              <p className="text-slate-500 font-medium italic text-sm md:text-lg max-w-xl mx-auto px-4">Silakan selesaikan pembayaran untuk mengaktifkan status pendaftaran.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-16 shadow-2xl shadow-slate-900/5 border border-slate-100 space-y-8 md:space-y-12 mx-4 md:mx-0">
              {event.settings.enableGateway && (
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button 
                    onClick={() => setFormData({ ...formData, paymentType: 'MANUAL' })}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${formData.paymentType === 'MANUAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  >
                    <Landmark className="w-4 h-4" /> Transfer Manual
                  </button>
                  <button 
                    onClick={() => setFormData({ ...formData, paymentType: 'GATEWAY' })}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${formData.paymentType === 'GATEWAY' ? 'bg-arcus-red text-white shadow-lg' : 'text-slate-400'}`}
                  >
                    <Zap className="w-4 h-4" /> Payment Gateway
                  </button>
                </div>
              )}

              {formData.paymentType === 'MANUAL' ? (
                <>
                  <div className="bg-slate-50 rounded-xl md:rounded-[3rem] p-4 md:p-10 border border-slate-200">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 pb-4 md:pb-8 border-b border-slate-200">
                  <div className="space-y-1 md:space-y-2 text-center md:text-left">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Tagihan ({formData.regType})</p>
                    <p className="text-lg md:text-4xl font-black font-oswald text-slate-900 uppercase italic leading-none">{formData.regType === 'OFFICIAL' ? 'Official / Pelatih' : (CATEGORY_LABELS[formData.category as CategoryType] || formData.category)}</p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-2xl md:text-5xl font-black font-oswald text-arcus-red italic tracking-tighter">
                      Rp {(formData.regType === 'OFFICIAL' ? (event.settings.officialFee || 0) : (event.settings.categoryConfigs?.[formData.category as CategoryType]?.registrationFee || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="pt-8 space-y-6">
                   <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Pilih Rekening Tujuan Transfer</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {availableManualMethods.map((pm: any) => (
                        <button 
                          key={pm.id}
                          onClick={() => setFormData({ ...formData, selectedPaymentMethodId: pm.id })}
                          className={`p-4 rounded-2xl border-2 transition-all text-left space-y-1 ${pm.id === activeMethod.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-900 hover:border-slate-200'}`}
                        >
                           <p className={`text-[8px] font-black uppercase tracking-widest ${pm.id === activeMethod.id ? 'text-white/40' : 'text-slate-400'}`}>{pm.provider}</p>
                           <p className="text-xs font-black truncate">{pm.accountNumber}</p>
                           <p className={`text-[8px] font-bold uppercase truncate ${pm.id === activeMethod.id ? 'text-white/60' : 'text-slate-500'}`}>A/N {pm.accountName}</p>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="pt-4 md:pt-8 space-y-3 md:space-y-6 animate-in slide-in-from-top-4 duration-500" key={activeMethod.id}>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Rincian Rekening Terpilih</p>
                  <div className="bg-slate-900 rounded-xl md:rounded-[2.5rem] p-4 md:p-10 flex flex-col items-center justify-center text-center space-y-2 md:space-y-4 border-b-4 md:border-b-8 border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 space-y-1 md:space-y-3">
                      <p className="text-white text-base md:text-3xl font-black font-oswald uppercase italic tracking-widest">{activeMethod.provider}</p>
                      <p className="text-xl md:text-5xl font-black font-mono text-arcus-red tracking-widest">{activeMethod.accountNumber}</p>
                      <p className="text-[8px] md:text-[12px] font-black text-white/40 uppercase tracking-[0.2em]">A/N {activeMethod.accountName}</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(activeMethod.accountNumber);
                        toast.success('Nomor rekening disalin!');
                      }}
                      className="relative z-10 mt-1 md:mt-2 px-4 py-2 md:px-6 md:py-3 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-lg md:rounded-xl text-[7px] md:text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 md:gap-3 border border-white/10"
                    >
                      <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" /> SALIN REKENING
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-[2rem] p-6 md:p-10 border border-amber-100 flex items-start gap-4 md:gap-6">
                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-amber-600 shrink-0 mt-1" />
                <div className="space-y-1 md:space-y-2">
                  <p className="text-[10px] md:text-sm font-black text-amber-900 uppercase">Penting!</p>
                  <p className="text-[10px] md:text-xs text-amber-800 leading-relaxed font-medium italic line-clamp-3 md:line-clamp-none">
                    Silakan transfer nominal persis. Simpan bukti transfer. Unggah foto bukti pembayaran sah (struk ATM/Mobile Banking) di bawah ini untuk diverifikasi panitia.
                  </p>
                </div>
              </div>

              {/* Upload Section */}
              <div className="space-y-4">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Upload Bukti Pembayaran Sah</p>
                <div className="flex flex-col items-center gap-4">
                   {formData.paymentProof ? (
                     <div className="relative w-full max-w-sm group">
                        <img 
                          src={formData.paymentProof} 
                          alt="Proof of Payment" 
                          referrerPolicy="no-referrer"
                          className="w-full h-64 object-cover rounded-2xl border-4 border-emerald-500 shadow-xl"
                        />
                        <button 
                          onClick={() => setFormData({ ...formData, paymentProof: '' })}
                          className="absolute top-4 right-4 bg-red-600 text-white p-3 rounded-xl shadow-lg hover:bg-red-700 transition-all"
                        >
                          <Upload className="w-5 h-5" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-600 to-transparent p-6 rounded-b-[1.2rem] opacity-0 group-hover:opacity-100 transition-opacity">
                           <p className="text-white text-[10px] font-black uppercase text-center">KLIK IKON UNTUK GANTI GAMBAR</p>
                        </div>
                     </div>
                   ) : (
                     <label className="w-full max-w-sm h-64 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-arcus-red hover:bg-red-50 transition-all cursor-pointer group">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-slate-300 group-hover:text-arcus-red group-hover:scale-110 transition-all">
                           <Upload className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                           <p className="text-xs font-black text-slate-900 tracking-tight uppercase">Pilih File Gambar</p>
                           <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">JPEG, PNG (MAX 2MB)</p>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden" 
                        />
                     </label>
                   )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-5 md:py-7 bg-slate-50 text-slate-500 rounded-2xl md:rounded-3xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all border border-slate-200"
                >
                  BATAL & KEMBALI
                </button>
                <button 
                  onClick={handleSubmit}
                  className="flex-[2] py-5 md:py-7 bg-red-600 text-white rounded-2xl md:rounded-3xl font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-xl hover:bg-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 md:gap-4"
                >
                  <ShieldCheck className="w-5 h-5" /> {(formData.paymentType as any) === 'GATEWAY' ? 'BAYAR SEKARANG' : 'SETUJU'}
                </button>
              </div>
              </>
            ) : (
              <div className="space-y-8 animate-in zoom-in-95 duration-500 py-4">
                <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-center space-y-6 md:space-y-8 border-b-8 border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <div className="w-20 h-20 bg-arcus-red rounded-3xl flex items-center justify-center text-white mx-auto shadow-lg animate-bounce">
                      <Zap className="w-10 h-10" />
                    </div>
                    <h3 className="text-3xl font-black font-oswald text-white uppercase italic tracking-tighter">Otomatisasi Pembayaran</h3>
                    <p className="text-white/60 font-medium italic text-sm md:text-base max-w-sm mx-auto leading-relaxed">
                      Layanan pembayaran instan via e-wallet dan virtual account. Status pendaftaran akan langsung <span className="text-arcus-red font-black">LUNAS</span> secara otomatis.
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                </div>

                <div className="space-y-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Metode Pembayaran Instan Didukung</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: 'QRIS / DANA', icon: <Landmark className="w-5 h-5" />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                      { name: 'GOPAY', icon: <Smartphone className="w-5 h-5" />, color: 'text-blue-500', bg: 'bg-blue-50' },
                      { name: 'OVO', icon: <Activity className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                      { name: 'VIRTUAL ACCOUNT', icon: <CreditCard className="w-5 h-5" />, color: 'text-slate-600', bg: 'bg-slate-50' },
                    ].map((m, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border border-slate-100 ${m.bg} flex flex-col items-center gap-2 group hover:scale-105 transition-all shadow-sm`}>
                        <div className={`${m.color}`}>{m.icon}</div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${m.color}`}>{m.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-widest mt-2 italic">
                    Didukung oleh Midtrans Payment Gateway
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-5 md:py-7 bg-slate-50 text-slate-500 rounded-2xl md:rounded-3xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all border border-slate-200"
                  >
                    KEMBALI
                  </button>
                  <button 
                    onClick={handleSubmit}
                    className="flex-[2] py-5 md:py-7 bg-arcus-red text-white rounded-2xl md:rounded-3xl font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-xl hover:bg-red-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3 md:gap-4 group"
                  >
                    <Sparkles className="w-5 h-5 group-hover:animate-spin" /> PROSES PEMBAYARAN
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6 md:py-20 space-y-6 md:space-y-12 animate-in fade-in zoom-in-95 duration-1000 px-4">
            <div className="relative inline-block group">
               <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
               <div className="relative w-24 h-24 md:w-48 md:h-48 bg-emerald-500 rounded-2xl md:rounded-[3.5rem] flex items-center justify-center text-white mx-auto shadow-2xl rotate-3 translate-y-0 group-hover:-translate-y-4 transition-transform duration-500">
                 <Check className="w-12 h-12 md:w-24 md:h-24 stroke-[3]" />
               </div>
            </div>
            
            <div className="space-y-2 md:space-y-6">
              <h1 className="text-2xl md:text-7xl font-black font-oswald text-slate-900 uppercase italic tracking-tighter leading-none">BERHASIL!</h1>
              <p className="text-xs md:text-2xl text-slate-500 font-bold italic tracking-tight max-w-xs md:max-w-md mx-auto">Selamat <strong>{formData.name}</strong>, pendaftaran Anda telah tercatat.</p>
            </div>

            <div className="bg-slate-950 p-6 md:p-12 rounded-3xl md:rounded-[4rem] shadow-2xl max-w-md mx-auto border-t-4 md:border-t-8 border-arcus-red relative overflow-hidden group">
               <div className="relative z-10 space-y-6 md:space-y-10">
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center justify-center gap-2">
                       <Activity className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                       <span className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">WAITING VERIFICATION</span>
                    </div>
                    <div className="p-4 md:p-6 bg-white/5 rounded-xl md:rounded-3xl border border-white/10">
                       <p className="text-[8px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">KODE PENDAFTARAN</p>
                       <p className="text-xl md:text-4xl font-black font-mono text-white tracking-widest italic truncate">{`ARC24-${Math.random().toString(36).substring(7).toUpperCase()}`}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 md:gap-4">
                    <button 
                      onClick={onBack}
                      className="w-full py-4 md:py-6 bg-arcus-red text-white rounded-lg md:rounded-2xl font-black uppercase text-[9px] md:text-xs tracking-[0.2em] hover:bg-white hover:text-slate-900 transition-all shadow-xl"
                    >
                      KEMBALI KE BERANDA
                    </button>
                    <p className="text-[7px] md:text-[9px] font-black text-white/20 uppercase tracking-[0.3em] italic">SILAKAN SCREENSHOT HALAMAN INI</p>
                  </div>
               </div>
            </div>
          </div>
        )}
        </>
      )}
      </div>
    </div>
  );
}
