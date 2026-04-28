import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<Props> = ({ onScan, onClose }) => {
  const [cameras, setCameras] = useState<{ id: string, label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCameraList, setShowCameraList] = useState(false);
  
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = "qr-reader-internal";

  useEffect(() => {
    // 1. Get available cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices.map(d => ({ id: d.id, label: d.label })));
        // Default to the last one (often the better quality/back camera)
        setSelectedCamera(devices[0].id);
      } else {
        setError("Tidak ada kamera yang ditemukan. Pastikan sudah memberikan izin kamera.");
      }
    }).catch(err => {
      console.error("Failed to get cameras", err);
      setError("Gagal mengakses kamera. Silakan periksa pengaturan browser.");
    });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async (cameraId: string) => {
    if (qrCodeInstanceRef.current) {
      await stopScanner();
    }

    try {
      const html5QrCode = new Html5Qrcode(scannerRegionId);
      qrCodeInstanceRef.current = html5QrCode;
      setIsScanning(true);
      setError(null);

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // Failure callback is noisy, ignore
        }
      );
    } catch (err) {
      console.error("Unable to start scanning", err);
      setError("Gagal memulai pemindaian. Pastikan kamera tidak digunakan aplikasi lain.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
        await qrCodeInstanceRef.current.clear();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (selectedCamera) {
      startScanner(selectedCamera);
    }
  }, [selectedCamera]);

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[300] flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 relative">
        
        {/* Header */}
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-arcus-red rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase font-oswald italic tracking-tight">QR SCANNER</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Pilih & Gunakan Webcam PC</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-white/5 hover:bg-arcus-red hover:text-white rounded-2xl transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scanner Area */}
        <div className="p-8">
          <div className="relative group">
            <div 
              id={scannerRegionId} 
              className="overflow-hidden rounded-[2rem] border-4 border-slate-50 bg-slate-100 aspect-square flex items-center justify-center relative"
            >
              {!isScanning && !error && (
                <div className="flex flex-col items-center gap-4 text-slate-400">
                  <RefreshCw className="w-12 h-12 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Menyiapkan Kamera...</p>
                </div>
              )}
              
              {error && (
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed max-w-[200px] mx-auto uppercase italic">
                    {error}
                  </p>
                  <button 
                    onClick={() => selectedCamera && startScanner(selectedCamera)}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {/* Decorative corners for scanner */}
              {isScanning && (
                <>
                  <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-arcus-red rounded-tl-xl z-10" />
                  <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-arcus-red rounded-tr-xl z-10" />
                  <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-arcus-red rounded-bl-xl z-10" />
                  <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-arcus-red rounded-br-xl z-10" />
                </>
              )}
            </div>
          </div>

          {/* Camera Selection Dropdown */}
          {cameras.length > 1 && (
            <div className="mt-8 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-4 italic">
                Sumber Video (Webcam / Mirror)
              </label>
              <button 
                onClick={() => setShowCameraList(!showCameraList)}
                className="w-full bg-slate-50 border-2 border-slate-100 hover:border-slate-900 p-5 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-tight truncate max-w-[250px]">
                    {cameras.find(c => c.id === selectedCamera)?.label || "Pilih Webcam..."}
                  </span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showCameraList ? 'rotate-180' : ''}`} />
              </button>

              {showCameraList && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-[310] overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="max-h-60 overflow-y-auto">
                    {cameras.map(camera => (
                      <button
                        key={camera.id}
                        onClick={() => {
                          setSelectedCamera(camera.id);
                          setShowCameraList(false);
                        }}
                        className={`w-full text-left p-5 text-xs font-bold uppercase transition-all flex items-center gap-4 hover:bg-slate-50 ${selectedCamera === camera.id ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                      >
                        <Camera className="w-4 h-4 opacity-50" />
                        {camera.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-8 bg-slate-50 text-center border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed italic max-w-xs mx-auto">
            Arahkan QR Code ke area pemindaian. Pastikan cahaya cukup dan gambar tidak buring.
          </p>
        </div>

      </div>
    </div>
  );
};

export default QRScanner;
