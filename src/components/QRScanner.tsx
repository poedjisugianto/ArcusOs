import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<Props> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
      },
      (error) => {
        // console.warn(error);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[200] flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black uppercase font-oswald italic">Scan Scoring Sheet</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Arahkan kamera ke QR Code</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div id="qr-reader" className="overflow-hidden rounded-2xl border-4 border-slate-100"></div>
        </div>

        <div className="p-6 bg-slate-50 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
            Pastikan QR Code terlihat jelas dan berada di dalam kotak pemindai
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
