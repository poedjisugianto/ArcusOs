import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArcheryEvent, GlobalSettings, ParticipantRegistration, CategoryType } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { isValidDate } from '../lib/dateUtils';
import { 
  ArrowLeft, User, Mail, ShieldCheck, CreditCard, 
  Upload, Check, AlertCircle, Zap, Sparkles, 
  Target, Trophy, Users, Activity, Info, FileText, Landmark, Smartphone
} from 'lucide-react';

interface Props {
  event: ArcheryEvent;
  globalSettings: GlobalSettings;
  onRegister: (r: ParticipantRegistration[]) => void;
  onBack: () => void;
  onViewParticipants: () => void;
}

export default function OnlineRegistration({ event, globalSettings, onRegister, onBack, onViewParticipants }: Props) {
  const [regMode, setRegMode] = useState<'INDIVIDUAL' | 'COLLECTIVE'>('INDIVIDUAL');
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(`reg_step_${event.id}`);
    const parsed = saved ? parseInt(saved) : 1;
    return isNaN(parsed) ? 1 : parsed;
  });
  
  const isRegistrationClosed = (event.settings.registrationDeadline && isValidDate(event.settings.registrationDeadline)) 
    ? new Date() > new Date(event.settings.registrationDeadline) 
    : false;

  const [collectiveMembers, setCollectiveMembers] = useState<{name: string, category: string}[]>([]);
  const [newMember, setNewMember] = useState({ name: '', category: '' });

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
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
      name: '', email: '', phone: '', club: '', category: '', paymentProof: '',
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

  const completeSimulation = async (newReg: ParticipantRegistration) => {
    setIsSimulatingPayment(false);
    setIsSubmitting(true);
    try {
      await onRegister([newReg]);
      localStorage.removeItem(`reg_draft_${event.id}`);
      localStorage.removeItem(`reg_step_${event.id}`);
      setStep(3);
    } catch (err) {
      toast.error("Gagal simpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRegistration = () => {
    localStorage.removeItem(`reg_draft_${event.id}`);
    localStorage.removeItem(`reg_step_${event.id}`);
    setFormData({
      name: '', email: '', phone: '', club: '', category: '', paymentProof: '',
      paymentType: 'MANUAL', selectedPaymentMethodId: '', regType: 'ARCHER'
    });
    setAgreedToTerms(false);
    setStep(1);
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

    const registrations: ParticipantRegistration[] = [];
    const year = new Date().getFullYear();

    if (regMode === 'INDIVIDUAL') {
      const random = Math.floor(1000 + Math.random() * 9000);
      const registrationNo = `ARC-${year}-${random}`;
      
      let totalPaid = 0;
      if (formData.regType === 'OFFICIAL') {
        totalPaid = event.settings.officialFee || 0;
      } else {
        const config = event.settings.categoryConfigs?.[formData.category as CategoryType];
        totalPaid = config?.registrationFee || 0;
      }
      
      const isKids = [
        CategoryType.U18_PUTRA, CategoryType.U18_PUTRI, CategoryType.U12_PUTRA,
        CategoryType.U12_PUTRI, CategoryType.U9_PUTRA, CategoryType.U9_PUTRI,
      ].includes(formData.category as CategoryType);

      const platformFee = isKids ? globalSettings.feeKids : globalSettings.feeAdult;

      registrations.push({
        id: 'reg_' + Math.random().toString(36).substr(2, 9),
        registrationNo,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        club: formData.club,
        category: formData.regType === 'OFFICIAL' ? 'OFFICIAL' : formData.category,
        paymentProof: formData.paymentType === 'MANUAL' ? formData.paymentProof : undefined,
        totalPaid,
        platformFee,
        status: 'PENDING',
        paymentType: formData.paymentType,
        timestamp: Date.now()
      });
    } else {
      // Collective logic
      if (collectiveMembers.length === 0) {
        toast.error("Tambahkan minimal satu anggota");
        return;
      }

      collectiveMembers.forEach((member, idx) => {
        const random = Math.floor(1000 + Math.random() * 9000) + idx;
        const registrationNo = `ARC-KOL-${year}-${random}`;
        
        let totalPaid = 0;
        if (member.category === CategoryType.OFFICIAL) {
          totalPaid = event.settings.officialFee || 0;
        } else {
          const config = event.settings.categoryConfigs?.[member.category as CategoryType];
          totalPaid = config?.registrationFee || 0;
        }
        
        const isKids = [
          CategoryType.U18_PUTRA, CategoryType.U18_PUTRI, CategoryType.U12_PUTRA,
          CategoryType.U12_PUTRI, CategoryType.U9_PUTRA, CategoryType.U9_PUTRI,
        ].includes(member.category as CategoryType);

        const platformFee = isKids ? globalSettings.feeKids : globalSettings.feeAdult;

        registrations.push({
          id: 'reg_' + Math.random().toString(36).substr(2, 9),
          registrationNo,
          name: member.name,
          email: formData.email, // Use club contact email
          phone: formData.phone, // Use club contact phone
          club: formData.club,
          category: member.category,
          paymentProof: formData.paymentType === 'MANUAL' ? formData.paymentProof : undefined,
          totalPaid,
          platformFee,
          status: 'PENDING',
          paymentType: formData.paymentType,
          timestamp: Date.now()
        });
      });
    }

    const totalAmount = registrations.reduce((sum, r) => sum + r.totalPaid, 0);

    if (formData.paymentType === 'GATEWAY') {
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            amount: totalAmount,
            method: 'GATEWAY',
            provider: globalSettings.paymentGatewayProvider || 'MIDTRANS',
            customerDetails: { name: formData.name || formData.club, email: formData.email },
            itemDetails: registrations.map(r => ({ id: r.category, price: r.totalPaid, quantity: 1, name: `Reg ${r.name} - ${r.category}` }))
          })
        });
        const data = await res.json();
        // @ts-ignore
        if (data.success && data.token && window.snap) {
          // @ts-ignore
          window.snap.pay(data.token, {
            onSuccess: () => { onRegister(registrations.map(r => ({ ...r, status: 'PAID' }))); setStep(3); },
            onPending: () => { onRegister(registrations); setStep(3); },
            onError: () => toast.error("Pembayaran Gagal"),
          });
        } else {
          toast.info("Gunakan simulasi pendaftaran massal");
          setSimulatedQR("https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=COLLECTIVE");
          setIsSimulatingPayment(true);
        }
      } catch (err) {
        toast.error("Gateway error. Cek koneksi.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(true);
      try {
        await onRegister(registrations);
        setStep(3);
      } catch (err) {
        toast.error("Gagal sinkron cloud. Data tersimpan lokal.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-12 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              tabIndex={-1}
              onClick={onBack} 
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl text-slate-400 hover:text-arcus-red transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xs md:text-lg font-black font-oswald uppercase italic text-slate-900 tracking-tighter leading-none">REGISTRASI</h1>
              <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic truncate max-w-[100px] md:max-w-[200px]">{event.settings.tournamentName}</p>
            </div>
          </div>
          <button onClick={onViewParticipants} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <Users className="w-2.5 h-2.5 md:w-3 md:h-3" /> PESERTA
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-2 md:py-4 relative z-10">
        {step === 3 && (
          <div className="text-center py-10 md:py-16 space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-1000">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl">
                <Check className="w-10 h-10 md:w-12 md:h-12 stroke-[3]" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-black font-oswald text-slate-900 uppercase italic leading-none">BERHASIL!</h1>
              <p className="text-sm md:text-xl text-slate-500 font-bold italic tracking-tight max-w-xs md:max-w-md mx-auto">Selamat <strong>{formData.name}</strong>, pendaftaran Anda telah tercatat.</p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-sm mx-auto space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Pendaftaran Anda Berhasil</p>
                <button 
                  onClick={onViewParticipants} 
                  className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black uppercase text-xs hover:bg-arcus-red transition-all flex items-center justify-center gap-3"
                >
                  <Users className="w-4 h-4" /> CEK DAFTAR PESERTA
                </button>
                <p className="text-[9px] font-bold text-slate-400 italic">Pastikan nama Anda sudah muncul di daftar peserta.</p>
              </div>

              {event.settings.waGroupLink && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">GABUNG GRUP WHATSAPP</p>
                  <a 
                    href={event.settings.waGroupLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Smartphone className="w-4 h-4" /> KLIK GABUNG GRUP WA
                  </a>
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <button 
                  onClick={resetRegistration} 
                  className="w-full py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black uppercase text-xs hover:bg-emerald-100 transition-all"
                >
                  DAFTAR PESERTA LAIN
                </button>
                <button 
                  onClick={onBack} 
                  className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-all"
                >
                  KEMBALI KE BERANDA
                </button>
              </div>
            </div>
          </div>
        )}

        {step !== 3 && (
          <div className="space-y-6">
            {isRegistrationClosed && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3">
                <Info className="w-4 h-4 text-amber-600" />
                <p className="text-[9px] font-bold text-amber-900 uppercase">Perhatian: Pendaftaran melewati tenggat waktu, namun masih dibuka atas kebijakan panitia.</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-6 mb-6">
              {[1, 2].map(i => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all ${step >= i ? 'bg-slate-900 text-white' : 'bg-white text-slate-300 border border-slate-100'}`}>{i}</div>
                  <span className={`text-[7px] font-black uppercase tracking-widest ${step >= i ? 'text-slate-900' : 'text-slate-300'}`}>{i === 1 ? 'BIODATA' : 'PEMBAYARAN'}</span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl space-y-4">
                <div className="flex gap-3 bg-slate-50 p-1 rounded-xl">
                  <button type="button" onClick={() => setRegMode('INDIVIDUAL')} className={`flex-1 py-2.5 rounded-lg font-black text-[10px] transition-all ${regMode === 'INDIVIDUAL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>INDIVIDU</button>
                  <button type="button" onClick={() => setRegMode('COLLECTIVE')} className={`flex-1 py-2.5 rounded-lg font-black text-[10px] transition-all ${regMode === 'COLLECTIVE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>KOLEKTIF (KLUB)</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 space-y-0.5">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase ml-2 italic">Nama Klub</span>
                    <input 
                      required 
                      type="text"
                      placeholder="NAMA KLUB" 
                      value={formData.club} 
                      onChange={e => setFormData({...formData, club: e.target.value.toUpperCase()})} 
                      className="w-full p-2.5 bg-slate-50 rounded-xl font-black italic border border-slate-100 outline-none focus:border-arcus-red text-[11px]" 
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase ml-2 italic">Email Kontak</span>
                    <input required type="email" placeholder="EMAIL" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 bg-slate-50 rounded-xl font-black italic border border-slate-100 outline-none focus:border-arcus-red text-[11px]" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase ml-2 italic">Nomor WA Pengurus</span>
                    <input 
                      required 
                      type="text"
                      placeholder="NOMOR TELEPON (WA)" 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      className="w-full p-2.5 bg-slate-50 rounded-xl font-black italic border border-slate-100 outline-none focus:border-arcus-red text-[11px]" 
                    />
                  </div>
                  
                  {regMode === 'INDIVIDUAL' ? (
                    <>
                      <div className="md:col-span-2 bg-slate-50 p-1 rounded-xl flex gap-1">
                        <button type="button" onClick={() => setFormData({...formData, regType: 'ARCHER'})} className={`flex-1 py-2 rounded-lg font-black text-[9px] transition-all ${formData.regType === 'ARCHER' ? 'bg-arcus-red text-white' : 'text-slate-400'}`}>ATLET</button>
                        <button type="button" onClick={() => setFormData({...formData, regType: 'OFFICIAL', category: 'OFFICIAL'})} className={`flex-1 py-2 rounded-lg font-black text-[9px] transition-all ${formData.regType === 'OFFICIAL' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>OFFICIAL</button>
                      </div>
                      <div className="md:col-span-2 space-y-0.5">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase ml-2 italic">Nama Peserta</span>
                        <input required type="text" placeholder="NAMA LENGKAP" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-50 rounded-xl font-black italic border border-slate-100 outline-none focus:border-arcus-red text-[11px]" />
                      </div>
                      {formData.regType === 'ARCHER' && (
                        <div className="md:col-span-2 space-y-0.5">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase ml-2 italic">Kategori</span>
                          <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2.5 bg-slate-50 rounded-xl font-black italic border border-slate-100 outline-none appearance-none text-[11px]">
                            <option value="">PILIH KATEGORI</option>
                            {categories.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat as CategoryType] || cat}</option>)}
                          </select>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-slate-900 uppercase">Daftar Anggota Klub ({collectiveMembers.length})</h4>
                      </div>
                      
                      {collectiveMembers.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                          {collectiveMembers.map((m, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div>
                                <p className="text-[10px] font-black text-slate-900 uppercase italic">{m.name}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">{CATEGORY_LABELS[m.category as CategoryType] || m.category}</p>
                              </div>
                              <button onClick={() => setCollectiveMembers(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-300 hover:text-arcus-red transition-colors">
                                <AlertCircle className="w-4 h-4 rotate-45" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <p className="text-[8px] font-black text-slate-400 uppercase italic text-center">Tambah Anggota Baru</p>
                        <div className="grid grid-cols-1 gap-2">
                          <input type="text" placeholder="NAMA ANGGOTA" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-white rounded-xl font-black italic border border-slate-200 text-[10px]" />
                          <select value={newMember.category} onChange={e => setNewMember({...newMember, category: e.target.value})} className="w-full p-2.5 bg-white rounded-xl font-black italic border border-slate-200 text-[10px]">
                            <option value="">PILIH KATEGORI</option>
                            {categories.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat as CategoryType] || cat}</option>)}
                            {!categories.includes(CategoryType.OFFICIAL as any) && (
                              <option value={CategoryType.OFFICIAL}>{CATEGORY_LABELS[CategoryType.OFFICIAL]}</option>
                            )}
                          </select>
                          <button 
                            type="button" 
                            onClick={() => {
                              if (!newMember.name || !newMember.category) {
                                toast.error("Isi nama dan kategori");
                                return;
                              }
                              setCollectiveMembers([...collectiveMembers, newMember]);
                              setNewMember({ name: '', category: '' });
                            }}
                            className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px]"
                          >
                            TAMBAH KE DAFTAR
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={regMode === 'COLLECTIVE' && collectiveMembers.length === 0} className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-arcus-red transition-all shadow-lg active:scale-95 text-[10px] disabled:opacity-50">Lanjut ke Pembayaran</button>
              </form>
            )}

            {step === 2 && (
              <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl space-y-5">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setFormData({...formData, paymentType: 'MANUAL'})} className={`flex-1 py-2.5 rounded-lg font-black text-[9px] transition-all ${formData.paymentType === 'MANUAL' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>TRANSFER MANUAL</button>
                  <button onClick={() => setFormData({...formData, paymentType: 'GATEWAY'})} className={`flex-1 py-2.5 rounded-lg font-black text-[9px] transition-all ${formData.paymentType === 'GATEWAY' ? 'bg-arcus-red text-white shadow-md' : 'text-slate-400'}`}>PAYMENT GATEWAY</button>
                </div>

                {formData.paymentType === 'MANUAL' ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-slate-950 rounded-2xl text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10"><Landmark className="w-10 h-10" /></div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{activeMethod.provider}</p>
                      <p className="text-xl md:text-2xl font-black font-mono text-arcus-red my-0.5 tracking-widest italic">{activeMethod.accountNumber}</p>
                      <p className="text-[8px] font-bold text-white/30 uppercase italic leading-none">A/N {activeMethod.accountName}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase italic">Upload Bukti Transfer</p>
                        <p className="text-[6px] font-bold text-slate-300 uppercase italic">Maks 2MB</p>
                      </div>
                      <div className="relative group">
                        <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className={`p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center gap-1.5 ${formData.paymentProof ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                          {formData.paymentProof ? (
                            <>
                              <div className="p-1.5 bg-emerald-500 rounded-full text-white"><Check className="w-3 h-3" /></div>
                              <p className="text-[9px] font-black text-emerald-600 uppercase">Bukti Terpilih</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-slate-300" />
                              <p className="text-[9px] font-black text-slate-400 uppercase">Klik/Drag Bukti Transfer</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-950 rounded-2xl text-center space-y-2.5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-arcus-red/10 to-transparent" />
                    <Zap className="w-8 h-8 text-arcus-red mx-auto animate-pulse relative z-10" />
                    <h3 className="text-lg font-black text-white uppercase italic relative z-10">Pembayaran Instan</h3>
                    <p className="text-white/40 text-[9px] italic relative z-10 tracking-tight">Portal pembayaran aman Midtrans.</p>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <input type="checkbox" id="terms" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-arcus-red focus:ring-arcus-red transition-all cursor-pointer" />
                  <label htmlFor="terms" className="text-[8.5px] text-slate-500 italic leading-snug cursor-pointer select-none">
                    Saya menyatakan data benar dan menyetujui seluruh <strong>Syarat & Ketentuan</strong> Arcus Archery.
                  </label>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="px-5 py-3.5 bg-slate-50 text-slate-400 rounded-xl font-black uppercase text-[10px] hover:bg-slate-100 transition-all">Kembali</button>
                  <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-3.5 bg-arcus-red text-white rounded-xl font-black uppercase text-[10px] hover:bg-red-600 transition-all shadow-lg active:scale-95 disabled:opacity-50">
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
