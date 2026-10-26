import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const msg = (error?.message || '').toLowerCase();
    const stack = (error?.stack || '').toLowerCase();
    const name = (error?.name || '').toLowerCase();
    if (
      msg.includes('cannot set property fetch') ||
      msg.includes('has only a getter') ||
      msg.includes('chrome-extension') ||
      stack.includes('chrome-extension') ||
      msg.includes('eppiocemhmnlbhjplcgkofciiegomcon') ||
      msg.includes('quota') ||
      msg.includes('exceeded the quota') ||
      name.includes('quota')
    ) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && (k.includes('audit_logs') || k.includes('sessions') || k.includes('cbt_token_'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => window.localStorage.removeItem(k));
        }
      } catch {}
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RootErrorBoundary] Unhandled runtime error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Terjadi Kendala Memuat Aplikasi</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Browser mendeteksi kesalahan sementara pada sesi atau cache penyimpanan aplikasi.
            </p>
            {this.state.error?.message && (
              <div className="p-3 mb-5 bg-slate-950/70 border border-slate-800 rounded-lg text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                Muat Ulang Aplikasi
              </button>
              <button
                onClick={this.handleResetStorage}
                className="w-full py-2.5 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-all border border-slate-600 active:scale-95"
              >
                Bersihkan Cache & Reset Penyimpanan
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function mountApp() {
  try {
    const rootEl = document.getElementById('root');
    if (!rootEl) {
      console.error('[EduExam] Root element #root not found in document');
      return;
    }

    const root = createRoot(rootEl);
    root.render(
      <StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </StrictMode>,
    );

    // Notify watchdog that React has mounted successfully
    if (typeof window !== 'undefined') {
      (window as any).__EDUEAM_MOUNTED__ = true;
    }
  } catch (mountErr: any) {
    console.error('[EduExam] Fatal mounting error:', mountErr);
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; padding: 24px; text-align: center;">
          <div style="max-width: 440px; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="width: 56px; height: 56px; margin: 0 auto 16px; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px;">⚠️</div>
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff;">Inisialisasi CBT Siap Dipulihkan</h2>
            <p style="font-size: 13px; color: #94a3b8; margin: 0 0 20px 0; line-height: 1.5;">Peramban mendeteksi kendala pada cache skrip lokal. Silakan klik tombol di bawah untuk menyegarkan sistem.</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button onclick="window.location.reload(true)" style="width: 100%; padding: 12px; background: #4f46e5; color: #ffffff; border: none; border-radius: 12px; font-weight: 600; font-size: 13px; cursor: pointer;">Segarkan & Muat Ulang</button>
              <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload(true)" style="width: 100%; padding: 10px; background: #334155; color: #cbd5e1; border: 1px solid #475569; border-radius: 12px; font-size: 12px; cursor: pointer;">Bersihkan Cache & Buka Baru</button>
            </div>
          </div>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
