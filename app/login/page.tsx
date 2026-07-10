'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabase';
import { logWebsiteEvent } from '../../src/lib/logs';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        void logWebsiteEvent('Login Gagal', `Gagal login ${email}: ${authError?.message ?? 'Unknown error'}`, 'alert');
        setError(authError?.message ?? 'Login gagal. Periksa email dan password Anda.');
        return;
      }

      // Ambil role dari tabel profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        setError('Profil pengguna tidak ditemukan. Hubungi administrator.');
        return;
      }

      // Simpan session expiry (1 minggu, batas jam 12 malam)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      expiry.setHours(0, 0, 0, 0);
      localStorage.setItem('qreats_session_expiry', expiry.toISOString());

      const role: string = profile.role;
      void logWebsiteEvent('Login Berhasil', `Email ${email} berhasil login sebagai ${role}.`, 'success');
      if (role === 'superadmin') {
        window.location.href = '/dashboard/superadmin';
      } else if (role === 'owner' || role === 'admin') {
        window.location.href = '/dashboard/menus';
      } else if (role === 'kasir') {
        window.location.href = '/dashboard/kasir';
      } else {
        setError(`Role tidak dikenali: "${role}". Hubungi administrator.`);
      }
    } catch (err: unknown) {
      console.error('[QREats] Login error detail:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Load failed') || errMsg.includes('fetch')) {
        setError('Koneksi internet gagal. Pastikan HP Anda terhubung ke internet untuk menghubungi server Supabase.');
      } else {
        setError('Terjadi kesalahan sistem. Coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 rounded-xl mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17v3" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">QREats</h1>
          <p className="text-sm text-slate-900/50 mt-1">Sistem Pemesanan Meja Digital</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-900/10 rounded-xl p-8 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Masuk ke Akun</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900/70 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@kafe.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-900/15 rounded-xl text-slate-900 placeholder-[#1A1A1A]/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-slate-900/40 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-900/70 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-900/15 rounded-xl text-slate-900 placeholder-[#1A1A1A]/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-slate-900/40 transition-all"
              />
              <div className="flex justify-end mt-2">
                <a href="/lupa-password" className="text-[11px] text-slate-900/50 hover:text-slate-900 font-medium underline underline-offset-2">
                  Lupa Password?
                </a>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 text-white font-medium text-sm rounded-xl hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sedang masuk...
                </span>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
          <div className="text-center mt-5">
            <a href="/register" className="text-xs text-slate-900/40 font-semibold underline underline-offset-2 hover:text-slate-900">
              Belum punya akun? Daftar sebagai Owner / Karyawan
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-900/30 mt-6">
          QREats © {new Date().getFullYear()} — Akses khusus staf & pengelola
        </p>
      </div>
    </main>
  );
}
