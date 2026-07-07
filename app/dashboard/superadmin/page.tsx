'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../src/lib/supabase';
import Link from 'next/link';

interface WebsiteLog {
  id: string;
  created_at?: string;
  title: string;
  description: string;
  time?: string;
  type: 'system' | 'info' | 'success' | 'alert';
  visitor_ip?: string;
}

export default function SuperadminPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalShops: 0,
    activeShops: 0,
    totalEmployees: 0,
    activeTransactions: 0,
  });

  const [loading, setLoading] = useState(true);
  const [liveLogs, setLiveLogs] = useState<WebsiteLog[]>([]);
  const [logsNotSetup, setLogsNotSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Ambil log aktivitas langsung via Supabase client (pakai session auth user, bukan anon)
  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('website_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Tabel belum dibuat — tampilkan panel setup SQL
        setLogsNotSetup(true);
        return;
      }
      setLogsNotSetup(false);
      setLiveLogs(data ?? []);
    } catch {
      setLogsNotSetup(true);
    }
  }, []);

  // Hapus log lama > 7 hari via API (server-side delete)
  const cleanupOldLogs = useCallback(() => {
    fetch('/api/logs', { method: 'GET' }).catch(() => null);
  }, []);

  async function addWebLog(title: string, description: string, type: WebsiteLog['type'] = 'info') {
    try {
      await supabase.from('website_logs').insert([{ title, description, type }]);
    } catch (error) {
      console.warn('Gagal mencatat log web secara manual:', error);
    }
  }


  // Favicon states
  const [currentFavicon, setCurrentFavicon] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // ─── Auth Guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function checkSuperadmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'superadmin') {
        setAccessDenied(true);
      }
      setAuthChecking(false);
    }
    checkSuperadmin();
  }, []);

  // ─── Fetch Stats Data ────────────────────────────────────────────────────────

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch Shops
      const { data: shops } = await supabase.from('shops').select('id, is_active, trial_ends_at');
      const totalShops = shops?.length ?? 0;
      const activeShops = (shops ?? []).filter(
        (s) => s.is_active && new Date(s.trial_ends_at) > new Date()
      ).length;

      // 2. Fetch Profiles for employee count
      const { data: profiles } = await supabase.from('profiles').select('role');
      const totalEmployees = (profiles ?? []).filter((p) => p.role !== 'owner' && p.role !== 'superadmin').length;

      // 3. Fetch Order Count today
      const today = new Date();
      today.setHours(0,0,0,0);
      const { count: txCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', today.toISOString());

      setStats({
        totalShops,
        activeShops,
        totalEmployees,
        activeTransactions: txCount ?? 0,
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking && !accessDenied) {
      fetchStats();
      fetchLogs();
      cleanupOldLogs();
      // Catat sesi masuk langsung ke Supabase
      supabase.from('website_logs').insert([{
        title: 'Sesi Terhubung',
        description: 'Konsol pemantauan superadmin berhasil dimuat.',
        type: 'system',
      }]).then(({ error }) => {
        if (error) console.warn('Gagal catat sesi (tabel belum dibuat?):', error.message);
      });
    }
  }, [authChecking, accessDenied, cleanupOldLogs, fetchLogs]);

  useEffect(() => {
    if (authChecking || accessDenied) return;
    const interval = window.setInterval(() => {
      fetchLogs();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [authChecking, accessDenied, fetchLogs]);

  // Load current favicon public URL to see if it exists
  useEffect(() => {
    if (authChecking || accessDenied) return;
    const { data } = supabase.storage
      .from('payment-receipts')
      .getPublicUrl('system/favicon.ico');
    if (data?.publicUrl) {
      const img = new Image();
      img.onload = () => setCurrentFavicon(`${data.publicUrl}?t=${Date.now()}`);
      img.src = data.publicUrl;
    }
  }, [authChecking, accessDenied]);

  async function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal adalah 2MB.');
      setUploadSuccess(false);
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const { error } = await supabase.storage
        .from('payment-receipts')
        .upload('system/favicon.ico', file, {
          upsert: true,
          contentType: file.type || 'image/x-icon',
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl('system/favicon.ico');
      
      if (data?.publicUrl) {
        setCurrentFavicon(`${data.publicUrl}?t=${Date.now()}`);
      }
      setUploadSuccess(true);
      const { error: faviconLogError } = await supabase.from('website_logs').insert([{
        title: 'Favicon Diperbarui',
        description: 'Logo favicon website baru berhasil diunggah dan diperbarui.',
        type: 'success',
      }]);
      if (faviconLogError) {
        console.warn('Gagal mencatat log favicon:', faviconLogError.message);
      }
    } catch (err: any) {
      console.error('Error uploading favicon:', err);
      setUploadError('Gagal mengunggah favicon: ' + (err.message || err));
    } finally {
      setUploading(false);
    }
  }

  // ─── Supabase Realtime Website Logs Feed ───────────────────────────────────

  useEffect(() => {
    if (authChecking || accessDenied) return;

    // Menghubungkan realtime Supabase untuk mendengarkan logs baru yang masuk di tabel website_logs secara live
    const channel = supabase
      .channel('superadmin-logs-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'website_logs' },
        (payload: any) => {
          // Format waktu dari created_at DB PostgreSQL
          const time = new Date(payload.new.created_at).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          const newLog = { ...payload.new, time };
          setLiveLogs((prev) => [newLog, ...prev.slice(0, 19)]);
          
          // Jika itu adalah pesanan baru, update transaksi hari ini secara otomatis
          if (payload.new.title === 'Order Baru Dibuat') {
            setStats((prev) => ({ ...prev, activeTransactions: prev.activeTransactions + 1 }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authChecking, accessDenied]);

  // Format IDR Helper
  function formatRupiah(amount: number): string {
    const rounded = Math.round(amount);
    const thousands = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp\u00A0${thousands}`;
  }

  // ─── Guard Render ───────────────────────────────────────────────────────────

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-sans">
        <p className="text-sm text-[#1A1A1A]/40">Memeriksa hak akses superadmin...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">Akses Dibatasi</h1>
          <p className="text-sm text-[#1A1A1A]/50">Halaman ini khusus untuk Superadmin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F2EB] min-h-screen font-sans">
      
      {/* Header */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Superadmin Central</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Statistik keseluruhan platform & log aktivitas transaksi real-time</p>
        </div>
        <button
          onClick={() => {
            fetchStats();
            addWebLog('Penyegaran Data', 'Statistik keseluruhan platform berhasil diperbarui.', 'system');
          }}
          className="px-4 py-2 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          Refresh
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-4">
            <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Total merchant</span>
            <p className="text-2xl font-black text-[#1A1A1A] mt-1">
              {loading ? '...' : stats.totalShops}
            </p>
          </div>
          <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-4">
            <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Merchant Aktif</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {loading ? '...' : stats.activeShops}
            </p>
          </div>
          <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-4">
            <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Staf Karyawan</span>
            <p className="text-2xl font-black text-indigo-600 mt-1">
              {loading ? '...' : stats.totalEmployees}
            </p>
          </div>
          <div className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-4">
            <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Transaksi Hari Ini</span>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {loading ? '...' : stats.activeTransactions}
            </p>
          </div>
        </div>

        {/* Upload Logo QREats (Favicon) */}
        <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm mb-6 space-y-4">
          <div>
            <h3 className="font-bold text-[#1A1A1A] text-base font-sans">Pengaturan Logo & Favicon QREats</h3>
            <p className="text-xs text-[#1A1A1A]/40 mt-0.5 font-sans">Unggah logo utama QREats (format .png, .ico, atau .jpg) yang akan digunakan sebagai ikon situs web (favicon).</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {currentFavicon ? (
                <img src={currentFavicon} alt="Favicon Preview" className="w-10 h-10 object-contain" />
              ) : (
                <span className="text-2xl">🍔</span>
              )}
            </div>
            
            <div className="flex-1 space-y-2 w-full">
              <input
                type="file"
                accept=".ico,.png,.jpg,.jpeg"
                onChange={handleFaviconChange}
                disabled={uploading}
                className="block w-full text-xs text-[#1A1A1A]/50 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1A1A1A] file:text-white hover:file:bg-[#333] cursor-pointer file:cursor-pointer"
              />
              <p className="text-[10px] text-[#1A1A1A]/35 font-sans">Mendukung format file .ico, .png, atau .jpg dengan ukuran maksimal 2MB.</p>
            </div>
          </div>
          
          {uploadError && (
            <p className="text-xs font-semibold text-red-500 font-sans">{uploadError}</p>
          )}
          {uploadSuccess && (
            <p className="text-xs font-semibold text-emerald-600 font-sans">Logo QREats berhasil diunggah! Favicon web otomatis diperbarui.</p>
          )}
        </div>


        {/* Log Website */}
        <div className="bg-[#1A1A1A] text-white rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Log Website</h3>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">Arus log aktivitas dan transaksi platform secara langsung</p>
          </div>

          <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto pr-1 mt-4">
            {liveLogs.length === 0 ? (
              <div className="text-center py-20 text-white/20 text-xs">
                Menunggu log aktivitas baru...
              </div>
            ) : (
              liveLogs.map((log, idx) => {
                let dotColor = 'bg-blue-500';
                if (log.type === 'success') dotColor = 'bg-emerald-500';
                if (log.type === 'info') dotColor = 'bg-indigo-500';
                if (log.type === 'alert') dotColor = 'bg-amber-500';

                return (
                  <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs transition-all hover:bg-white/10 animate-fade-in">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                      <div className="min-w-0">
                        <p className="font-bold text-white leading-tight">{log.title}</p>
                        <p className="text-[10px] text-white/50 mt-1 flex flex-wrap items-center gap-1.5 font-sans">
                          <span className="truncate" title={log.description}>{log.description}</span>
                          {log.visitor_ip && (
                            <span className="bg-white/10 text-white/70 px-1.5 py-0.5 rounded font-mono text-[8px] flex-shrink-0">
                              IP: {log.visitor_ip}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-white/40 ml-4 flex-shrink-0">
                      {log.time || new Date((log as any).created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

    </div>
  );
}
