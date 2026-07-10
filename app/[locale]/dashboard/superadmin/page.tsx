'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link';
import StatsCard from './components/StatsCard';
import FaviconUploader from './components/FaviconUploader';
import LogsFeed from './components/LogsFeed';
import { LockIcon, FoodIcon } from './components/Icons';

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
  // Hapus log lama > 7 hari via API (server-side delete)
  const cleanupOldLogs = useCallback(() => {
    fetch('/api/logs', { method: 'GET' }).catch(() => null);
  }, []);

  async function addWebLog(title: string, description: string, type: 'system' | 'info' | 'success' | 'alert' = 'info') {
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
      cleanupOldLogs();
      // Catat sesi masuk langsung ke Supabase
      (async () => {
        const { error } = await supabase.from('website_logs').insert([{ title: 'Sesi Terhubung', description: 'Konsol pemantauan superadmin berhasil dimuat.', type: 'system' }]);
        if (error) console.warn('Gagal catat sesi (tabel belum dibuat?):', error.message);
      })();
    }
  }, [authChecking, accessDenied, cleanupOldLogs]);



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

  // Format IDR Helper
  function formatRupiah(amount: number): string {
    const rounded = Math.round(amount);
    const thousands = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp\u00A0${thousands}`;
  }

  // ─── Guard Render ───────────────────────────────────────────────────────────

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-sm text-slate-900/40">Memeriksa hak akses superadmin...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <span className="block mb-4"><LockIcon className="w-12 h-12 text-slate-900" /></span>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Akses Dibatasi</h1>
          <p className="text-sm text-slate-900/50">Halaman ini khusus untuk Superadmin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="border-b border-slate-900/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Superadmin Central</h2>
          <p className="text-xs text-slate-900/40 mt-0.5">Statistik keseluruhan platform & log aktivitas transaksi real-time</p>
        </div>
        <button
          onClick={() => {
            fetchStats();
            addWebLog('Penyegaran Data', 'Statistik keseluruhan platform berhasil diperbarui.', 'system');
          }}
          className="px-4 py-2 border border-slate-900/20 hover:bg-slate-900/5 text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          Refresh
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-900/8 rounded-xl p-4">
            <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide">Total merchant</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '...' : stats.totalShops}
            </p>
          </div>
          <div className="bg-white border border-slate-900/8 rounded-xl p-4">
            <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide">Merchant Aktif</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {loading ? '...' : stats.activeShops}
            </p>
          </div>
          <div className="bg-white border border-slate-900/8 rounded-xl p-4">
            <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide">Staf Karyawan</span>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {loading ? '...' : stats.totalEmployees}
            </p>
          </div>
          <div className="bg-white border border-slate-900/8 rounded-xl p-4">
            <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide">Transaksi Hari Ini</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {loading ? '...' : stats.activeTransactions}
            </p>
          </div>
        </div>

        {/* Upload Logo QREats (Favicon) */}
        <div className="bg-white border border-slate-900/8 rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 mb-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base font-sans">Pengaturan Logo & Favicon QREats</h3>
            <p className="text-xs text-slate-900/40 mt-0.5 font-sans">Unggah logo utama QREats (format .png, .ico, atau .jpg) yang akan digunakan sebagai ikon situs web (favicon).</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 border border-slate-900/10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {currentFavicon ? (
                <img src={currentFavicon} alt="Favicon Preview" className="w-10 h-10 object-contain" />
              ) : (
                <FoodIcon className="w-10 h-10 text-slate-900" />
              )}
            </div>
            
            <div className="flex-1 space-y-2 w-full">
              <input
                type="file"
                accept=".ico,.png,.jpg,.jpeg"
                onChange={handleFaviconChange}
                disabled={uploading}
                className="block w-full text-xs text-slate-900/50 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-[#333] cursor-pointer file:cursor-pointer"
              />
              <p className="text-[10px] text-slate-900/35 font-sans">Mendukung format file .ico, .png, atau .jpg dengan ukuran maksimal 2MB.</p>
            </div>
          </div>
          
          {uploadError && (
            <p className="text-xs font-semibold text-red-500 font-sans">{uploadError}</p>
          )}
          {uploadSuccess && (
            <p className="text-xs font-semibold text-emerald-600 font-sans">Logo QREats berhasil diunggah! Favicon web otomatis diperbarui.</p>
          )}
        </div>


      </main>

    </div>
  );
}
