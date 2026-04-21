import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, RefreshCw, Mail } from 'lucide-react';
import { ArcheryEvent } from '../types';

interface ActivateTournamentProps {
  event: ArcheryEvent;
  onActivate: (code: string) => void;
  onBack: () => void;
  onResend: () => void;
  userEmail: string;
}

const ActivateTournament: React.FC<ActivateTournamentProps> = ({ 
  event, 
  onActivate, 
  onBack, 
  onResend,
  userEmail
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 4) {
      setError('Kode harus 4 digit');
      return;
    }
    onActivate(code);
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Aktivasi Turnamen
        </h2>
        <p className="text-slate-500 text-center mb-8">
          Masukkan kode aktivasi yang telah dikirim ke <span className="font-semibold text-slate-700">{userEmail}</span> untuk mengaktifkan turnamen <span className="font-semibold text-slate-700">"{event.settings.tournamentName}"</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 text-center">
              Kode Aktivasi (4 Digit)
            </label>
            <input
              type="text"
              maxLength={4}
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setCode(val);
                setError('');
              }}
              className="w-full text-center text-3xl tracking-[1em] font-mono py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="0000"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            Aktifkan Turnamen
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <button
            onClick={onResend}
            className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Kirim Ulang Kode
          </button>
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard
          </button>
        </div>
      </motion.div>

      <div className="mt-8 bg-amber-50 rounded-2xl p-6 border border-amber-100">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-900 text-sm mb-1">Penting</h4>
            <p className="text-amber-700 text-xs leading-relaxed">
              Turnamen Anda saat ini berstatus <strong>Draf</strong> dan tidak akan muncul di halaman utama sampai diaktifkan. Hal ini dilakukan untuk memastikan keamanan dan validitas penyelenggara.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivateTournament;
