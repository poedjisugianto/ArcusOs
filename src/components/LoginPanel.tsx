import React, { useState } from 'react';
import { User as UserIcon, LogIn, Mail, Lock, ArrowLeft, ShieldCheck, Zap, Sparkles, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { User, UserRole } from '../types';
import ArcusLogo from './ArcusLogo';
import { supabase } from '../supabase';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onBack: () => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

export default function LoginPanel({ users, onLogin, onRegister, onUpdateUser, onBack, initialMode = 'LOGIN' }: Props) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Koneksi database tidak tersedia.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (mode === 'LOGIN') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) throw authError;

        if (data.user) {
          // Fetch additional profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const loggedInUser: User = {
            id: data.user.id,
            email: data.user.email || '',
            name: profile?.full_name || data.user.user_metadata.full_name || 'User',
            phone: profile?.phone || '',
            isOrganizer: true,
            isVerified: true,
            isSuperAdmin: profile?.role === 'superadmin' || data.user.email === 'admin@arcus.id',
            role: (profile?.role as UserRole) || UserRole.ORGANIZER
          };
          onLogin(loggedInUser);
        }
      } else {
        if (password !== confirmPassword) {
          setError('Konfirmasi password tidak cocok.');
          setIsLoading(false);
          return;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone: phone
            }
          }
        });

        if (authError) throw authError;

        if (data.user) {
          const newUser: User = {
            id: data.user.id,
            email,
            name,
            phone,
            isOrganizer: true,
            isVerified: true,
            role: UserRole.ORGANIZER
          };
          
          // Triggers in Supabase handles the profiles table entry
          onRegister(newUser);
          onLogin(newUser);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || 'Terjadi kesalahan autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 sm:p-12">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-8 sm:p-12 border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 -mr-32 -mt-32 rounded-full group-hover:scale-110 transition-transform" />
        <div className="relative space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArcusLogo className="w-12 h-12" />
              <div>
                <h2 className="text-xl font-black font-oswald uppercase italic text-slate-900 leading-none">
                  {mode === 'LOGIN' ? 'Admin Login' : 'Daftar Akun'}
                </h2>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tournament OS v1.2.0</p>
              </div>
            </div>
            <button onClick={onBack} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'REGISTER' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap / Organisasi</label>
                  <div className="relative">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-slate-900 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300"
                      placeholder="Contoh: Arcus Archery Club"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor WhatsApp</label>
                  <div className="relative">
                    <Zap className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-slate-900 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300"
                      placeholder="087834193339"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-slate-900 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="admin@arcus.id"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-slate-900 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-slate-900 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
            
            {error && <p className="text-xs text-arcus-red font-bold uppercase tracking-widest text-center">{error}</p>}
            
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {mode === 'LOGIN' ? 'Sign In' : 'Daftar Sekarang'}
                  {mode === 'LOGIN' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-50 text-center space-y-4">
            <button 
              onClick={() => {
                setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                setError('');
              }}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-arcus-red transition-colors"
            >
              {mode === 'LOGIN' ? 'Belum punya akun? Daftar gratis' : 'Sudah punya akun? Silahkan Login'}
            </button>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">ARCUS DIGITAL TOURNAMENT OS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
