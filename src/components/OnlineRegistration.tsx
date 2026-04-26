import React, { useState, useEffect } from 'react';
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
    const parsed = saved ? parseInt(saved) : 1;
    return isNaN(parsed) ? 1 : parsed;
  });
  
  const isRegistrationClosed = (event.settings.registrationDeadline && !isNaN(new Date(event.settings.registrationDeadline).getTime())) 
    ? new Date() > new Date(event.settings.registrationDeadline) 
    : false;

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
      name: '', email: '', club: '', category: '', paymentProof: '',
      paymentType: 'MANUAL', selectedPaymentMethodId: '', regType: 'ARCHER'
    };
  });

  useEffect(() => {
    localStorage.setItem(`reg_draft_${event.id}`, JSON.stringify(formData));
  }, [formData, event.id]);

  useEffect(() => {
    localStorage.setItem(`reg_step_${event.id}`, step.toString());
  }, [step, event.id]);

  useEffect(() => {
    if (globalSettings.paymentGatewayProvider === 'MIDTRANS') {
      const clientKey = globalSettings.paymentGatewayClientKey || "SB-Mid-client-0zW-uI9FidU1T7S4";
      const isProduction = globalSettings.paymentGatewayIsProduction === true || String(globalSettings.paymentGatewayIsProduction) === "true";
      const snapSrc = isProduction ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js";

      const existingScript = document.getElementById('midtrans-snap');
      if (existingScript) {
        if (existingScript.getAttribute('data-client-key') !== clientKey) {
          existingScript.remove();
        } else {
          return;
        }
      }

      const script = document.createElement('script');
      script.src = snapSrc;
      script.id = 'midtrans-snap';
      script.setAttribute('data-client-key', clientKey);
      script.async = true;
      document.body.appendChild(script);
    }
  }, [globalSettings.paymentGatewayClientKey, globalSettings.paymentGatewayProvider, globalSettings.paymentGatewayIsProduction]);

  const categories = event.settings.categoryConfigs && Object.keys(event.settings.categoryConfigs).length > 0
    ? Object.keys(event.settings.categoryConfigs).filter(cat => cat !== CategoryType.OFFICIAL) 
    : (Object.keys(CategoryType) as CategoryType[]).filter(cat => cat !== CategoryType.OFFICIAL);

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

  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [simulatedQR, setSimulatedQR] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const completeSimulation = (newReg: ParticipantRegistration) => {
    setIsSimulatingPayment(false);
    onRegister(newReg);
    localStorage.removeItem(`reg_draft_${event.id}`);
    localStorage.removeItem(`reg_step_${event.id}`);
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!agreedToTerms) {
      toast.error("Anda harus menyetujui Syarat & Ketentuan untuk melanjutkan");
      return;
    }
    
    if (formData.paymentType === 'MANUAL' && !formData.paymentProof) {
      toast.error("Silakan unggah bukti pembayaran terlebih dahulu");
      return;
    }

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
      status: 'PENDING',
      paymentType: formData.paymentType,
      timestamp: Date.now()
    };

    if (formData.paymentType === 'GATEWAY') {
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            amount: totalPaid,
            method: 'GATEWAY',
            provider: globalSettings.paymentGatewayProvider || 'MIDTRANS',
            customerDetails: { name: formData.name, email: formData.email },
            itemDetails: [{ id: newReg.category, price: totalPaid, quantity: 1, name: `Registration ${newReg.category}` }]
          })
        });
        const data = await res.json();
        // @ts-ignore
        if (data.success && data.token && window.snap) {
          // @ts-ignore
          window.snap.pay(data.token, {
            onSuccess: () => { onRegister({ ...newReg, status: 'PAID' }); setStep(3); },
            onPending: () => { onRegister(newReg); setStep(3); },
            onError: () => toast.error("Pembayaran Gagal"),
          });
        } else {
          toast.info("Gunakan simulasi pembayaran");
          setSimulatedQR("https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SIMULASI");
          setIsSimulatingPayment(true);
        }
      } catch (err) {
        toast.error("Gateway error. Cek koneksi.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      onRegister(newReg);
      localStorage.removeItem(`reg_draft_${event.id}`);
      localStorage.removeItem(`reg_step_${event.id}`);
      setStep(3);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={onBack} className="w-8 h-8 md:w-11 md:h-11 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl text-slate-400 hover:text-arcus-red transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-xl font-black font-oswald uppercase italic text-slate-900 tracking-tighter">REGISTRASI</h1>
              <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic truncate max-w-[120px]">{event.settings.tournamentName}</p>
            </div>
          </div>
          <button onClick={onViewParticipants} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <Users className="w-3 h-3" /> PESERTA
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 md:py-8 relative z-10">
        {isRegistrationClosed && step !== 3 && (
          <div className="mb-6 bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] text-center">
             <AlertCircle className="w-8 h-8 text-arcus-red mx-auto mb-4" />
             <h3 className="text-xl font-black font-oswald uppercase italic text-slate-900 mb-2">Pendaftaran Ditutup</h3>
             <button onClick={onBack} className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Kembali</button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-20 space-y-6">
            <Check className="w-16 h-16 text-emerald-500 mx-auto" />
            <h1 className="text-4xl font-black font-oswald text-slate-900 uppercase italic">BERHASIL!</h1>
            <p className="text-xl text-slate-500 italic max-w-md mx-auto">Selamat <strong>{formData.name}</strong>, pendaftaran Anda telah tercatat.</p>
            <button onClick={onBack} className="px-8 py-4 bg-arcus-red text-white rounded-xl font-black uppercase">Kembali ke Beranda</button>
          </div>
        )}

        {step !== 3 && !isRegistrationClosed && (
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-6 mb-10">
              {[1, 2].map(i => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${step >= i ? 'bg-slate-900 text-white' : 'bg-white text-slate-300 border border-slate-100'}`}>{i}</div>
                  <span className="text-[8px] font-black uppercase tracking-widest">{i === 1 ? 'BIODATA' : 'PEMBAYARAN'}</span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl space-y-6">
                <div className="flex gap-4 bg-slate-50 p-2 rounded-2xl">
                  <button type="button" onClick={() => setFormData({...formData, regType: 'ARCHER'})} className={`flex-1 py-4 rounded-xl font-black text-xs ${formData.regType === 'ARCHER' ? 'bg-arcus-red text-white' : 'text-slate-400'}`}>ATLET</button>
                  <button type="button" onClick={() => setFormData({...formData, regType: 'OFFICIAL', category: 'OFFICIAL'})} className={`flex-1 py-4 rounded-xl font-black text-xs ${formData.regType === 'OFFICIAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>OFFICIAL</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input required placeholder="NAMA LENGKAP" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-xl font-black italic border border-slate-100 outline-none focus:border-arcus-red" />
                  <input required type="email" placeholder="EMAIL" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-black italic border border-slate-100 outline-none focus:border-arcus-red" />
                  <input required placeholder="KLUB" value={formData.club} onChange={e => setFormData({...formData, club: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-xl font-black italic border border-slate-100 outline-none focus:border-arcus-red" />
                  {formData.regType === 'ARCHER' && (
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-black italic border border-slate-100 outline-none appearance-none">
                      <option value="">PILIH KATEGORI</option>
                      {categories.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat as CategoryType] || cat}</option>)}
                    </select>
                  )}
                </div>
                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-arcus-red transition-all">Lanjut ke Pembayaran</button>
              </form>
            )}

            {step === 2 && (
              <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl space-y-8">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setFormData({...formData, paymentType: 'MANUAL'})} className={`flex-1 py-3 rounded-lg font-black text-[10px] ${formData.paymentType === 'MANUAL' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}>TRANSFER MANUAL</button>
                  <button onClick={() => setFormData({...formData, paymentType: 'GATEWAY'})} className={`flex-1 py-3 rounded-lg font-black text-[10px] ${formData.paymentType === 'GATEWAY' ? 'bg-arcus-red text-white shadow' : 'text-slate-400'}`}>PAYMENT GATEWAY</button>
                </div>

                {formData.paymentType === 'MANUAL' ? (
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-slate-900 rounded-3xl text-white">
                      <p className="text-xs font-black text-slate-400 uppercase">{activeMethod.provider}</p>
                      <p className="text-3xl font-black font-mono text-arcus-red my-2 tracking-widest">{activeMethod.accountNumber}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase">A/N {activeMethod.accountName}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase text-center">Upload Bukti Transfer</p>
                      <input type="file" onChange={handleFileChange} className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer" />
                    </div>
                  </div>
                ) : (
                  <div className="p-10 bg-slate-900 rounded-3xl text-center space-y-4">
                    <Zap className="w-10 h-10 text-arcus-red mx-auto animate-pulse" />
                    <h3 className="text-xl font-black text-white uppercase italic">Pembayaran Instan</h3>
                    <p className="text-white/40 text-xs italic">Anda akan diarahkan ke portal pembayaran aman.</p>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-1" />
                  <span className="text-[10px] text-slate-500 italic">Saya menyetujui Syarat & Ketentuan Arcus Archery.</span>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black uppercase text-xs">Kembali</button>
                  <button onClick={handleSubmit} disabled={isSubmitting} className="flex-[2] py-4 bg-arcus-red text-white rounded-xl font-black uppercase text-xs hover:bg-red-600">
                    {isSubmitting ? 'Memproses...' : 'Proses Pendaftaran'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {isSimulatingPayment && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center space-y-6 shadow-2xl">
            <h3 className="text-2xl font-black font-oswald italic">SIMULASI PEMBAYARAN</h3>
            <img src={simulatedQR || ""} alt="QR" className="w-48 h-48 mx-auto border-4 border-slate-100 rounded-2xl" />
            <button onClick={() => completeSimulation({ id: 'sim_' + Date.now(), registrationNo: 'SIM-123', name: formData.name, email: formData.email, club: formData.club, category: formData.category, totalPaid: 0, platformFee: 0, status: 'PAID', paymentType: 'GATEWAY', timestamp: Date.now() })} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black uppercase">Berhasil (Mock)</button>
            <button onClick={() => setIsSimulatingPayment(false)} className="text-slate-400 text-xs font-bold uppercase">Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
