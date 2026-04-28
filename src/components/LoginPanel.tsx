import React, { useState } from 'react';
import { User as UserIcon, LogIn, Mail, Lock, ArrowLeft, ShieldCheck, Zap, Sparkles, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { User, UserRole } from '../types';
import ArcusLogo from './ArcusLogo';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) {
      setError('Koneksi database tidak tersedia.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'LOGIN') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user) {
          // Fetch additional profile data from Firestore
          const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
          const profileData = profileSnap.exists() ? profileSnap.data().data : null;

          const loggedInUser: User = {
            id: user.uid,
            email: user.email || '',
            name: profileData?.name || user.displayName || 'User',
            phone: profileData?.phone || '',
            isOrganizer: true,
            isVerified: user.emailVerified,
            isSuperAdmin: profileData?.role === 'superadmin' || user.email === 'admin@arcus.id' || user.email === 'poedji.sugianto@gmail.com',
            role: (profileData?.role as UserRole) || UserRole.ORGANIZER
          };
          onLogin(loggedInUser);
        }
      } else {
        if (password !== confirmPassword) {
          setError('Konfirmasi password tidak cocok.');
          setIsLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (user) {
          await updateProfile(user, { displayName: name });
          
          const newUser: User = {
            id: user.uid,
            email,
            name,
            phone,
            isOrganizer: true,
            isVerified: false,
            role: UserRole.ORGANIZER
          };
          
          // Create profile in Firestore
          await setDoc(doc(db, 'profiles', user.uid), {
            id: user.uid,
            data: newUser,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          onRegister(newUser);
          onLogin(newUser);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err.message || 'Terjadi kesalahan autentikasi.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Email atau Password salah. Silakan coba lagi.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Email sudah terdaftar. Silakan login atau gunakan email lain.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Silakan masukkan email Anda terlebih dahulu.');
      return;
    }
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Instruksi reset password telah dikirim ke email Anda. Silakan cek kotak masuk atau folder spam.');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim email reset password.');
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
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                {mode === 'LOGIN' && (
                  <button 
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[10px] font-bold text-slate-400 underline hover:text-arcus-red transition-colors"
                  >
                    Lupa Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  minLength={6}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-slate-900 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="Minimal 6 karakter"
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
                    minLength={6}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-slate-900 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300"
                    placeholder="Minimal 6 karakter"
                  />
                </div>
              </div>
            )}
            
            {error && <p className="text-xs text-arcus-red font-bold uppercase tracking-widest text-center">{error}</p>}
            {success && <p className="text-xs text-green-600 font-bold uppercase tracking-widest text-center bg-green-50 p-3 rounded-xl border border-green-100">{success}</p>}
            
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
            {mode === 'LOGIN' && (
              <button 
                onClick={handleResetPassword}
                type="button"
                className="block w-full text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                Lupa Password?
              </button>
            )}
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">ARCUS DIGITAL TOURNAMENT OS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
