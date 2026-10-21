import React, { useState } from 'react';
import { useCbt } from '../../context/CbtContext';
import { 
  Network, 
  Key, 
  Globe, 
  CheckCircle2, 
  RefreshCw, 
  Code2, 
  Database, 
  Check, 
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';

export const AcademicApiSettings: React.FC = () => {
  const { apiConfig, updateApiConfig, syncWithSiakad, sessions } = useCbt();
  
  const [endpointUrl, setEndpointUrl] = useState(apiConfig.endpointUrl);
  const [apiKey, setApiKey] = useState(apiConfig.apiKey);
  const [autoPush, setAutoPush] = useState(apiConfig.autoPushGrades);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const completedSessions = sessions.filter(s => s.status === 'completed');

  // Sample real payload transmitted to SIAKAD
  const samplePayload = {
    webhookEvent: 'CBT_EXAM_RESULTS_PUSH',
    timestamp: new Date().toISOString(),
    school: {
      npsn: apiConfig.schoolId,
      name: apiConfig.schoolName,
    },
    academicPeriod: {
      year: '2026/2027',
      semester: 'Ganjil',
    },
    grades: completedSessions.map(s => ({
      nisn: s.nisn,
      studentName: s.studentName,
      className: s.className,
      examCode: 'AM-FIKIH-MTS-2026',
      finalScore: s.score ?? 0,
      passedKkm: s.isPassed,
      correctCount: s.correctCount ?? 0,
      antiCheatIntegrity: s.violationsCount === 0 ? 'CLEAN' : `FLAGGED_${s.violationsCount}_TIMES`,
    })),
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateApiConfig({
      endpointUrl,
      apiKey,
      autoPushGrades: autoPush,
    });
    setTestResult('Konfigurasi API berhasil diperbarui!');
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleSyncNow = async () => {
    setIsTesting(true);
    await syncWithSiakad();
    setIsTesting(false);
    setTestResult(`Berhasil sinkronisasi ${completedSessions.length} nilai siswa ke SIAKAD!`);
    setTimeout(() => setTestResult(null), 4000);
  };

  const copyPayloadJson = () => {
    navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Network className="w-4 h-4" />
            <span>Integrasi Sistem Informasi Akademik (SIAKAD)</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Konektor API & Webhook Nilai Sekolah
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sinkronisasi otomatis daftar siswa, rombel kelas, dan pengiriman nilai ujian akhir ke SIAKAD / Dapodik / LMS.
          </p>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={isTesting}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow cursor-pointer transition"
        >
          <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'Menghubungkan ke SIAKAD...' : 'Sinkronkan Nilai Sekarang'}</span>
        </button>
      </div>

      {testResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Grid: Config Form & Live Connection Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Settings Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Pengaturan Endpoint & Autentikasi API</h3>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                URL Endpoint SIAKAD API
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  required
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://siakad.sekolah.sch.id/api/v2/cbt-sync"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Menerima permintaan POST dengan payload JSON terenkripsi SSL.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                API Secret Key / Bearer Token
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_live_cbt_..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Kunci otorisasi khusus yang diterbitkan oleh administrator IT sekolah.
              </span>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoPush}
                  onChange={(e) => setAutoPush(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Otomatis kirim nilai ke SIAKAD saat siswa menyelesaikan ujian (Real-time Webhook)
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow cursor-pointer transition"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Connection Status & Meta (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Status Koneksi SIAKAD</h3>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Terhubung & Terverifikasi</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Layanan sinkronisasi aktif. Host sekolah menerima paket pengiriman data CBT.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 divide-y divide-slate-100">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Instansi Sekolah:</span>
                <span className="font-semibold text-slate-800">{apiConfig.schoolName}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Nomor Pokok (NPSN):</span>
                <span className="font-semibold font-mono text-slate-800">{apiConfig.schoolId}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Terakhir Disinkronkan:</span>
                <span className="font-semibold text-slate-800">{apiConfig.lastSyncTime || 'Belum pernah'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Total Siswa Terdata:</span>
                <span className="font-semibold text-indigo-600">{apiConfig.totalSyncedStudents} Siswa</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Payload Preview Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Pratinjau Struktur Data Webhook (JSON Payload)</h3>
          </div>
          <button
            onClick={copyPayloadJson}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition"
          >
            {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPayload ? 'Tersalin!' : 'Salin JSON'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Spesifikasi REST API format pertukaran data standar antara CBT dan Sistem Informasi Akademik Sekolah:
        </p>

        <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-64 border border-slate-800">
          {JSON.stringify(samplePayload, null, 2)}
        </pre>
      </div>
    </div>
  );
};
