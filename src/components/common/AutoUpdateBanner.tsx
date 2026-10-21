import React from 'react';
import { useCbt } from '../../context/CbtContext';
import { Sparkles, RefreshCw, X, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export const AutoUpdateBanner: React.FC = () => {
  const { isUpdateAvailable, updateInfo, triggerAutoUpdate, dismissUpdateNotification } = useCbt();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-2xl border-2 border-emerald-500/80 backdrop-blur-md relative overflow-hidden">
        {/* Subtle glowing background accent */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/30 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold text-white tracking-tight">
                  Pembaruan Sistem CBT Siap
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 uppercase tracking-wider">
                  {updateInfo?.version || 'v4.9.0'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-300 font-semibold mt-0.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Auto-Update Aktif • Tanpa Perlu Republish</span>
              </p>
            </div>
          </div>

          <button
            onClick={dismissUpdateNotification}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition shrink-0"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-2.5 leading-relaxed relative z-10">
          {updateInfo?.message || 'Naskah ujian atau pengaturan sistem terbaru telah disinkronkan di server cloud. Cukup segarkan (refresh) halaman untuk menerapkan perubahan.'}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 relative z-10">
          <div className="text-[10px] text-slate-400">
            Cukup tekan <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">F5</kbd> atau klik tombol:
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerAutoUpdate}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
