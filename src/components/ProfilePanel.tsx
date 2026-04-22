
import React, { useState } from 'react';
import { User, Mail, Phone, Landmark, ShieldCheck, ArrowLeft, Save, BadgeCheck, Trophy, Info, Lock, Check } from 'lucide-react';
import { User as UserType } from '../types';

interface Props {
  user: UserType;
  eventsManaged: number;
  onUpdate: (user: UserType) => void;
  onBack: () => void;
}

const ProfilePanel: React.FC<Props> = ({ user, eventsManaged, onUpdate, onBack }) => {
  const [formData, setFormData] = useState<UserType>({ ...user });
  const [isEditing, setIsEditing] = useState(false);
  const [showSavedFlag, setShowSavedFlag] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
    setShowSavedFlag(true);
    setTimeout(() => setShowSavedFlag(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Profile Saved Flag */}
      {showSavedFlag && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white">
            <Check className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Profil Berhasil Diperbarui</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <h2 className="text-2xl font-black font-oswald uppercase italic leading-none">Pengaturan Profil</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Kelola informasi akun Anda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Avatar & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm text-center space-y-6">
            <div className="relative inline-block">
              <div className="w-32 h-32 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black font-oswald shadow-2xl">
                {formData.name.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-arcus-red rounded-xl border-4 border-white flex items-center justify-center text-white shadow-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-black font-oswald uppercase italic text-slate-900">{formData.name}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{formData.isSuperAdmin ? 'Master Platform' : 'Tournament Organizer'}</p>
            </div>

            <div className="flex justify-center gap-3">
              {user.isVerified && (
                <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified Account
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
              <div className="text-center">
                <p className="text-2xl font-black font-oswald text-slate-900">{eventsManaged}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Events</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black font-oswald text-slate-900">100%</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reliability</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 space-y-4 shadow-xl relative overflow-hidden">
            <h4 className="text-xs font-black uppercase tracking-widest opacity-40">Informasi Keamanan</h4>
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-arcus-red" />
              <p className="text-[10px] font-bold uppercase leading-relaxed text-slate-400">
                Password Anda dienkripsi dan hanya Anda yang memiliki akses penuh ke akun ini.
              </p>
            </div>
            <Trophy className="absolute -right-8 -bottom-8 w-32 h-32 opacity-5 rotate-12" />
          </div>
        </div>

        {/* Right Column: Form Fields */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-10 py-6 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <User className="w-4 h-4" /> Personal Information
              </h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isEditing ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white hover:bg-black'}`}
              >
                {isEditing ? 'Batal' : 'Edit Profil'}
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Lengkap</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-arcus-red transition-colors" />
                    <input 
                      disabled={!isEditing}
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className={`w-full pl-12 pr-5 py-4 rounded-2xl font-bold text-sm outline-none transition-all border ${isEditing ? 'bg-white border-slate-200 focus:border-arcus-red ring-4 ring-arcus-red/5' : 'bg-slate-50 border-transparent text-slate-500'}`}
                      placeholder="Nama Lengkap"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Institusi (Readonly)</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      disabled={true}
                      type="email" 
                      value={formData.email} 
                      className="w-full pl-12 pr-5 py-4 rounded-2xl font-bold text-sm bg-slate-50 border-transparent text-slate-400"
                      placeholder="Email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nomor WhatsApp</label>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-arcus-red transition-colors" />
                    <input 
                      disabled={!isEditing}
                      type="tel" 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      className={`w-full pl-12 pr-5 py-4 rounded-2xl font-bold text-sm outline-none transition-all border ${isEditing ? 'bg-white border-slate-200 focus:border-arcus-red ring-4 ring-arcus-red/5' : 'bg-slate-50 border-transparent text-slate-500'}`}
                      placeholder="0812..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Klub / Organisasi</label>
                  <div className="relative group">
                    <Landmark className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-arcus-red transition-colors" />
                    <input 
                      disabled={!isEditing}
                      type="text" 
                      value={formData.club || ''} 
                      onChange={e => setFormData({...formData, club: e.target.value})} 
                      className={`w-full pl-12 pr-5 py-4 rounded-2xl font-bold text-sm outline-none transition-all border ${isEditing ? 'bg-white border-slate-200 focus:border-arcus-red ring-4 ring-arcus-red/5' : 'bg-slate-50 border-transparent text-slate-500'}`}
                      placeholder="Klub Panahan"
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="pt-6 border-t border-slate-100 flex gap-4 animate-in slide-in-from-top-4">
                  <button 
                    type="submit" 
                    className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                  >
                    <Save className="w-4 h-4 text-arcus-red" /> Simpan Perubahan
                  </button>
                </div>
              )}

              {!isEditing && (
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-4">
                  <Info className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Pusat Bantuan Profil</p>
                    <p className="text-[11px] text-blue-600 leading-relaxed italic">
                      Jika Anda ingin mengubah email institusi atau status verifikasi, silakan hubungi tim support ARCUS (WA: 087834193339) melalui pusat bantuan.
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
