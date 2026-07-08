'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/lib/supabase';

interface LicenseDB {
  token: string;
  days: number;
  is_used: boolean;
  used_by_shop_id: string | null;
  created_at: string;
  shops?: { name: string } | null;
}

export default function SuperadminLicensesPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [licenses, setLicenses] = useState<LicenseDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unused' | 'used'>('all');

  // Generator states
  const [tokenDays, setTokenDays] = useState<number>(30);
  const [generating, setGenerating] = useState(false);

  // ─── Auth Guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAccess() {
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
    checkAccess();
  }, []);

  // ─── Fetch Licenses ─────────────────────────────────────────────────────────

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activation_tokens')
        .select('token, days, is_used, used_by_shop_id, created_at, shops (name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLicenses((data as any) ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking && !accessDenied) {
      fetchLicenses();
    }
  }, [authChecking, accessDenied]);

  // ─── Generator Helper ──────────────────────────────────────────────────────

  function generateRandomTokenStr(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let p1 = '';
    let p2 = '';
    let p3 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
      p3 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `QRE-${p1}-${p2}-${p3}`;
  }

  async function handleGenerateToken() {
    setGenerating(true);
    const newTokenStr = generateRandomTokenStr();

    try {
      const { error } = await supabase
        .from('activation_tokens')
        .insert({
          token: newTokenStr,
          days: tokenDays,
        });

      if (error) throw error;
      await fetchLicenses();
    } catch (err: any) {
      alert('Gagal membuat token: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filteredLicenses = licenses.filter((lic) => {
    if (activeFilter === 'unused') return !lic.is_used;
    if (activeFilter === 'used') return lic.is_used;
    return true;
  });

  // ─── Guard Render ───────────────────────────────────────────────────────────

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-sans">
        <p className="text-sm text-[#1A1A1A]/40">Memeriksa otoritas superadmin...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <span className="block mb-4"><LockIcon className="w-12 h-12 text-[#1A1A1A] mx-auto" /></span>
          <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">Akses Dibatasi</h1>
          <p className="text-sm text-[#1A1A1A]/50">Halaman ini khusus untuk Superadmin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F2EB] min-h-screen font-sans">
      
      {/* Header */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white print:hidden">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Kelola Lisensi Toko</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Generate token aktivasi & pantau penggunaan lisensi platform</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        
        {/* Generator Widget */}
        <div className="bg-[#1A1A1A] text-white rounded-3xl p-6 shadow-sm">
          <div className="max-w-xl">
            <h3 className="text-lg font-bold">Generate Token Baru</h3>
            <p className="text-xs text-white/50 mt-1 mb-6">Buat token lisensi baru untuk dipasang di toko merchant.</p>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Masa Durasi Token</label>
                <select
                  value={tokenDays}
                  onChange={(e) => setTokenDays(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl text-sm focus:outline-none text-white font-bold"
                >
                  <option className="text-black" value={7}>7 Hari (Trial)</option>
                  <option className="text-black" value={30}>30 Hari (1 Bulan)</option>
                  <option className="text-black" value={90}>90 Hari (3 Bulan)</option>
                  <option className="text-black" value={365}>365 Hari (1 Tahun)</option>
                </select>
              </div>

              <div className="self-end">
                <button
                  onClick={handleGenerateToken}
                  disabled={generating}
                  className="px-6 py-3.5 bg-white text-[#1A1A1A] font-black text-xs rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-md uppercase tracking-wider"
                >
                  {generating ? 'Generating...' : '🛠️ Generate Token'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Filter & List Token */}
        <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A1A]/5 pb-3">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-base">Daftar Token Lisensi</h3>
              <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Daftar seluruh token yang terdaftar di sistem</p>
            </div>
            
            <div className="flex bg-[#F5F2EB] p-1 rounded-xl gap-1 self-start text-xs font-bold">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeFilter === 'all' ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
                }`}
              >
                Semua ({licenses.length})
              </button>
              <button
                onClick={() => setActiveFilter('unused')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeFilter === 'unused' ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
                }`}
              >
                Belum Dipakai ({licenses.filter(l => !l.is_used).length})
              </button>
              <button
                onClick={() => setActiveFilter('used')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeFilter === 'used' ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
                }`}
              >
                Sudah Dipakai ({licenses.filter(l => l.is_used).length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredLicenses.length === 0 ? (
              <p className="text-xs text-[#1A1A1A]/30 text-center py-12">Tidak ada token dalam filter ini.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F2EB]/60 border-b border-[#1A1A1A]/5 text-[#1A1A1A]/60 font-bold">
                    <th className="p-3">Token</th>
                    <th className="p-3 text-center">Durasi</th>
                    <th className="p-3">Tanggal Dibuat</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Digunakan Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLicenses.map((lic) => (
                    <tr key={lic.token} className="border-b border-[#1A1A1A]/5 last:border-b-0 hover:bg-[#F5F2EB]/10 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#1A1A1A] select-all cursor-pointer" title="Klik untuk salin">
                        {lic.token}
                      </td>
                      <td className="p-3 text-center font-bold text-[#1A1A1A]">
                        {lic.days} Hari
                      </td>
                      <td className="p-3 text-[#1A1A1A]/50">
                        {new Date(lic.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          lic.is_used
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {lic.is_used ? 'TERPAKAI' : 'READY'}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-[#1A1A1A]">
                        {lic.is_used ? (lic.shops?.name || `Toko ID: ${lic.used_by_shop_id?.slice(0,8)}...`) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>

    </div>
  );
}
