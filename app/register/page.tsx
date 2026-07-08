'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../src/lib/supabase';
import { logWebsiteEvent } from '../../src/lib/logs';
import { CelebrationIcon } from '../../app/components/Icons';

export default function RegisterPage() {
  const router = useRouter();
  const [registerMode, setRegisterMode] = useState<'owner' | 'staff'>('owner');

  // Input fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Helper untuk generate Join Code acak
  function generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'QRE-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (registerMode === 'owner') {
        if (!shopName.trim()) {
          setError('Nama toko wajib diisi.');
          setLoading(false);
          return;
        }

        // 1. Sign Up User ke Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
          },
        });

        if (authError || !authData.user) {
          throw new Error(authError?.message ?? 'Gagal membuat akun.');
        }

        const ownerId = authData.user.id;
        const code = generateJoinCode();

        // 2. Buat Toko Baru
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .insert({
            name: shopName.trim(),
            owner_id: ownerId,
            join_code: code,
            trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 Hari trial
          })
          .select('id')
          .single();

        if (shopError || !shopData) {
          throw new Error(shopError?.message ?? 'Gagal mendaftarkan toko baru.');
        }

        // 3. Buat Profil Owner (koneksi manual karena trigger handle_new_user default ke kasir)
        // Kita timpa dengan insert/update role owner & shop_id
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: ownerId,
            email: email.trim(),
            role: 'owner',
            shop_id: shopData.id,
          });

        if (profileError) {
          throw new Error(profileError.message);
        }

      } else {
        // REGISTER MODE STAFF (KARYAWAN)
        if (!joinCode.trim()) {
          setError('Join Code toko wajib diisi.');
          setLoading(false);
          return;
        }

        // 1. Cari Toko berdasarkan Join Code dan Limit Kasir
        const { data: shop, error: shopSearchError } = await supabase
          .from('shops')
          .select('id, name, base_cashier_limit, addon_cashiers')
          .eq('join_code', joinCode.trim().toUpperCase())
          .single();

        if (shopSearchError || !shop) {
          throw new Error('Join Code tidak valid atau toko tidak ditemukan.');
        }
        
        // 1b. Hitung jumlah kasir yang ada
        const { count: currentCashiers, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', shop.id)
          .eq('role', 'kasir');
          
        const maxCashiers = (shop.base_cashier_limit || 1) + (shop.addon_cashiers || 0);
        if (currentCashiers !== null && currentCashiers >= maxCashiers) {
          throw new Error(`Toko ini telah mencapai batas maksimal akun kasir (${maxCashiers} Kasir). Minta pemilik toko membeli Add-on Kasir.`);
        }

        // 2. Sign Up User ke Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
          },
        });

        if (authError || !authData.user) {
          throw new Error(authError?.message ?? 'Gagal membuat akun staff.');
        }

        // 3. Daftarkan profil sebagai Kasir terhubung ke toko
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: email.trim(),
            role: 'kasir',
            shop_id: shop.id,
            join_code: joinCode.trim().toUpperCase(),
          });

        if (profileError) {
          throw new Error(profileError.message);
        }
      }

      // Simpan session expiry (1 minggu, batas jam 12 malam)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      expiry.setHours(0, 0, 0, 0);
      localStorage.setItem('qreats_session_expiry', expiry.toISOString());

      void logWebsiteEvent('Registrasi Baru', `Akun ${email} berhasil didaftarkan sebagai ${registerMode === 'owner' ? 'pemilik toko' : 'kasir'}.`, 'success');
      setSuccess(true);
      // Auto redirect ke dashboard secara instan setelah 1.5 detik
      setTimeout(() => {
        if (registerMode === 'owner') {
          window.location.href = '/dashboard/menus';
        } else {
          window.location.href = '/dashboard/kasir';
        }
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mendaftar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tight">QREats</h1>
          <p className="text-xs text-[#1A1A1A]/40 mt-1 uppercase tracking-wider font-bold">Multi-Merchant SaaS Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#1A1A1A]/10 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Pendaftaran Akun</h2>

          {success ? (
            <div className="text-center py-6 space-y-3">
              <span className="block"><CelebrationIcon className="w-12 h-12 text-[#1A1A1A] mx-auto" /></span>
              <p className="font-bold text-[#1A1A1A]">Pendaftaran Berhasil!</p>
              <p className="text-xs text-[#1A1A1A]/50">Mengalihkan Anda ke halaman masuk dalam 3 detik...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Toggle Mode */}
              <div className="grid grid-cols-2 gap-2 bg-[#F5F2EB] p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setRegisterMode('owner')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    registerMode === 'owner' ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
                  }`}
                >
                  💼 Pemilik Toko
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterMode('staff')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    registerMode === 'staff' ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
                  }`}
                >
                  🛎️ Karyawan / Kasir
                </button>
              </div>

              {/* Input Fields */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]/40 transition-all"
                  />
                </div>

                {registerMode === 'owner' && (
                  <div>
                    <label className="block text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5">Nama Toko / Resto</label>
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Contoh: Kopi Kawa"
                      className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]/40 transition-all"
                    />
                  </div>
                )}

                {registerMode === 'staff' && (
                  <div>
                    <label className="block text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5">Join Code Toko</label>
                    <input
                      type="text"
                      required
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Masukkan kode QRE-XXXXXX"
                      className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/30 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]/40 transition-all uppercase"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-[#1A1A1A] placeholder-[#1A1A1A]/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]/40 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3.5 bg-[#1A1A1A] text-white font-bold text-sm rounded-xl hover:bg-[#333] transition-all disabled:opacity-50"
              >
                {loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
              </button>

              <div className="text-center pt-2">
                <a href="/login" className="text-xs text-[#1A1A1A]/40 font-semibold underline underline-offset-2 hover:text-[#1A1A1A]">
                  Sudah punya akun? Masuk di sini
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
