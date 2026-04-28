import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { auth } from '../firebase';
import { updatePassword, onAuthStateChanged } from 'firebase/auth';
import ArcusLogo from './ArcusLogo';

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

export default function ResetPasswordPanel({ onSuccess, onBack }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setError('Sesi reset password tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !auth.currentUser) return;

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal harus 6 karakter.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await updatePassword(auth.currentUser, password);
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-12 border border-slate-100 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black font-oswald uppercase italic text-slate-900">Password Diperbarui!</h2>
          <p className="text-sm font-bold text-slate-500 leading-relaxed">
            Password Anda telah berhasil diperbarui. Anda akan diarahkan ke halaman utama sebentar lagi.
          </p>
          <div className="pt-4">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 sm:p-12">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-8 sm:p-12 border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 -mr-32 -mt-32 rounded-full group-hover:scale-110 transition-transform" />
        <div className="relative space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArcusLogo className="w-12 h-12" />
              <div>
                <h2 className="text-xl font-black font-oswald uppercase italic text-slate-900 leading-none">Reset Password</h2>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Buat Password Baru Anda</p>
              </div>
            </div>
            <button onClick={onBack} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
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

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password Baru</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  minLength={6}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-slate-900 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="Ulangi password baru"
                />
              </div>
            </div>

            {error && <p className="text-xs text-arcus-red font-bold uppercase tracking-widest text-center">{error}</p>}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>Update Password</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
