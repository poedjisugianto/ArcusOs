import React from 'react';
import { Archer, CategoryType, TournamentSettings, TargetType } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface Props {
  settings: TournamentSettings;
  eventId: string;
  archer: Archer;
}

const ScoringSheet: React.FC<Props> = ({ settings, eventId, archer }) => {
  const config = (settings.categoryConfigs || {})[archer.category as CategoryType] || { arrows: 3, ends: 6, distance: '?', targetType: TargetType.STANDARD };
  const qrData = JSON.stringify({
    type: 'SCORING_SHEET',
    eventId: eventId,
    archerId: archer.id,
    targetNo: archer.targetNo,
    position: archer.position,
    wave: archer.wave
  });

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="bg-white p-12 border-2 border-black w-[210mm] h-[297mm] mx-auto font-serif text-black print:m-0 print:border-0 relative">
      {/* Decorative Book Edge */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-slate-100 border-r border-slate-300 print:hidden"></div>

      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-black flex items-center justify-center rounded-lg">
              <span className="text-white text-2xl font-black italic">A</span>
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{settings.tournamentName}</h1>
              <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">{settings.location} | {settings.eventDate}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase w-20">Nama</span>
              <span className="text-xl font-black uppercase border-b-2 border-black flex-1 pb-1">{archer.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase w-20">Klub</span>
              <span className="text-xl font-black uppercase border-b-2 border-black flex-1 pb-1">{archer.club}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase w-20">Kategori</span>
              <span className="text-xl font-black uppercase border-b-2 border-black flex-1 pb-1">{CATEGORY_LABELS[archer.category]}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase w-20">Jarak</span>
              <span className="text-xl font-black uppercase border-b-2 border-black flex-1 pb-1">{config.distance}</span>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-4">
          <div className="border-4 border-black p-3 text-center min-w-[120px] bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black uppercase tracking-widest">Bantalan</p>
            <p className="text-5xl font-black italic font-oswald">{archer.targetNo}{archer.position}</p>
            <p className="text-xs font-black uppercase border-t-2 border-black mt-2 pt-2">Sesi {archer.wave}</p>
          </div>
          <img src={qrUrl} alt="QR Code" className="w-28 h-28 border-2 border-black p-1 bg-white" />
          <p className="text-[9px] font-black uppercase tracking-tighter bg-black text-white px-2 py-0.5">Scan to Input Score</p>
        </div>
      </div>

      {/* Scoring Table */}
      <table className="w-full border-collapse border-4 border-black text-center">
        <thead>
          <tr className="bg-slate-100">
            <th className="border-2 border-black py-3 w-16 font-black text-lg">R</th>
            {Array.from({ length: config.arrows }).map((_, i) => (
              <th key={i} className="border-2 border-black py-3 font-black text-lg">A{i + 1}</th>
            ))}
            <th className="border-2 border-black py-3 w-20 font-black text-lg">Tot</th>
            <th className="border-2 border-black py-3 w-16 font-black text-lg">{config.targetType === TargetType.PUTA ? '6' : '10'}</th>
            <th className="border-2 border-black py-3 w-16 font-black text-lg">{config.targetType === TargetType.PUTA ? '5' : 'X'}</th>
            <th className="border-2 border-black py-3 w-24 font-black text-lg">Kum.</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: config.ends }).map((_, endIdx) => (
            <tr key={endIdx} className="h-14">
              <td className="border-2 border-black font-black text-xl bg-slate-50">{endIdx + 1}</td>
              {Array.from({ length: config.arrows }).map((_, arrowIdx) => (
                <td key={arrowIdx} className="border-2 border-black"></td>
              ))}
              <td className="border-2 border-black bg-slate-50"></td>
              <td className="border-2 border-black"></td>
              <td className="border-2 border-black"></td>
              <td className="border-2 border-black bg-slate-100 font-black text-xl"></td>
            </tr>
          ))}
          <tr className="h-16 font-black bg-slate-200">
            <td colSpan={config.arrows + 1} className="border-2 border-black text-right pr-6 text-xl uppercase italic">TOTAL AKHIR</td>
            <td className="border-2 border-black"></td>
            <td className="border-2 border-black"></td>
            <td className="border-2 border-black"></td>
            <td className="border-2 border-black bg-black text-white text-2xl"></td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div className="mt-16 grid grid-cols-2 gap-24">
        <div className="text-center">
          <div className="h-24 border-b-2 border-black mb-3"></div>
          <p className="text-sm font-black uppercase tracking-widest italic">Tanda Tangan Pemanah</p>
        </div>
        <div className="text-center">
          <div className="h-24 border-b-2 border-black mb-3"></div>
          <p className="text-sm font-black uppercase tracking-widest italic">Scorer / Judge Lapangan</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-12 text-[11px] text-slate-500 font-bold flex justify-between items-end border-t border-slate-200">
        <div>
          <p className="uppercase tracking-widest">ARCUS Digital Archery System</p>
          <p className="text-[9px] text-slate-400 mt-1">Generated on {new Date().toLocaleString('id-ID')}</p>
        </div>
        <div className="text-right">
          <p className="uppercase">Archer ID: {archer.id}</p>
          <p className="text-[9px] text-slate-400 mt-1">Official Score Sheet v2.5</p>
        </div>
      </div>
    </div>
  );
};

export default ScoringSheet;
