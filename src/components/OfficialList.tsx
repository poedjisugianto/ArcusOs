import React, { useState, useMemo } from 'react';
import { 
  Search, Trash2, ArrowLeft, 
  X, Check, UserPlus, Printer, Users as UsersIcon, Image as ImageIcon, FileDown
} from 'lucide-react';
import { Archer, CategoryType, TournamentSettings, GlobalSettings, RegistrationStatus } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface Props {
  officials: Archer[];
  onUpdate: (official: Archer) => void;
  onRemove: (id: string) => void;
  onGoToIdCardEditor: () => void;
  onBack: () => void;
  settings: TournamentSettings;
}

const OfficialList: React.FC<Props> = ({ officials, onUpdate, onRemove, onGoToIdCardEditor, onBack, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return (officials || []).filter(o => 
      !o ? false : (
        (o.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (o.club || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (o.email || '').toLowerCase().includes((searchTerm || '').toLowerCase())
      )
    ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [officials, searchTerm]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    try {
      const dataToExport = filtered;
      if (dataToExport.length === 0) {
        alert("Tidak ada data untuk diekspor");
        return;
      }

      const headers = ["Nama", "Klub", "Kontak", "Email", "Status"];
      const csvRows = [];
      csvRows.push(headers.join(","));

      for (const o of dataToExport) {
        const row = [
          `"${o.name}"`,
          `"${o.club}"`,
          `"${o.phone || '-'}"`,
          `"${o.email || '-'}"`,
          `"${o.status}"`
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Data_Official_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Gagal mengekspor data: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#FBFBFD] p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
          <div className="flex flex-col">
             <h2 className="text-xl font-black font-oswald uppercase italic tracking-tighter text-slate-900">Manajemen Official</h2>
             <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none">Database Tim Pendukung</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={onGoToIdCardEditor}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Kartu Official
          </button>
          <button 
            onClick={handlePrint}
            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-slate-200 transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Daftar
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-100"
          >
            <FileDown className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="Cari nama atau klub official..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white transition-all text-xs font-bold outline-none text-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Official / Pelatih</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Klub / Pengcab</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Kontak</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs">
                        {(o.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-black text-slate-900 uppercase italic font-oswald">{o.name || 'TANPA NAMA'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{o.club}</td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-black text-slate-600">{o.phone || '-'}</p>
                    <p className="text-[8px] font-bold text-slate-400">{o.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      o.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      o.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}>
                      {o.status === 'APPROVED' ? 'Tervalidasi' : 'Menunggu'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {o.status !== 'APPROVED' && (
                         <button 
                           onClick={() => onUpdate({ ...o, status: RegistrationStatus.APPROVED })}
                           className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                           title="Validasi Akreditasi"
                         >
                           <Check className="w-4 h-4" />
                         </button>
                       )}
                       <button 
                         onClick={() => {
                           if(confirm(`Hapus data official ${o.name}?`)) onRemove(o.id);
                         }} 
                         className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <UsersIcon className="w-12 h-12" />
                      <p className="text-xs font-black uppercase tracking-widest">Tidak ada data official</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Print Content */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8">
         <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold uppercase">{settings.tournamentName}</h1>
            <h2 className="text-xl font-bold uppercase mt-1">Daftar Akreditasi Official / Manager</h2>
         </div>
         <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-black p-2 text-sm text-left">Nama Lengkap</th>
                <th className="border border-black p-2 text-sm text-left">Asal Klub</th>
                <th className="border border-black p-2 text-sm text-left">Status</th>
                <th className="border border-black p-2 text-sm text-right">TTD</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td className="border border-black p-2 text-xs uppercase font-bold">{o.name}</td>
                  <td className="border border-black p-2 text-xs uppercase">{o.club}</td>
                  <td className="border border-black p-2 text-xs uppercase">{o.status === 'APPROVED' ? 'TERVALIDASI' : 'PENDING'}</td>
                  <td className="border border-black p-2 text-xs h-12 w-32"></td>
                </tr>
              ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};

export default OfficialList;
