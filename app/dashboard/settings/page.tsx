'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { logWebsiteEvent } from '../../../src/lib/logs';
import { AlertIcon } from '../../components/Icons';

interface ShopDB {
  id: string;
  name: string;
  join_code: string;
  trial_ends_at: string;
  is_active: boolean;
}

interface EmployeeDB {
  id: string;
  email: string;
  role: string;
}

interface DailyRevenue {
  date: string;
  amount: number;
  ordersCount: number;
}

export default function SettingsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  const [shop, setShop] = useState<ShopDB | null>(null);
  const [employees, setEmployees] = useState<EmployeeDB[]>([]);
  const [revenues, setRevenues] = useState<DailyRevenue[]>([]);
  
  // Activation state
  const [tokenInput, setTokenInput] = useState('');
  const [activating, setActivating] = useState(false);

  const [userRole, setUserRole] = useState<string | null>(null);

  // QRIS states
  const [qrisPreview, setQrisPreview] = useState<string | null>(null);
  const [uploadingQris, setUploadingQris] = useState(false);

  // Form add employee states
  const [showAddForm, setShowAddForm] = useState(false);
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRole, setEmpRole] = useState<'admin' | 'kasir'>('kasir');
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  // ─── Auth Guard & Access Check ──────────────────────────────────────────────

  useEffect(() => {
    async function checkOwner() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, shop_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }

      setUserRole(profile.role);

      if (profile.role === 'superadmin') {
        const impId = localStorage.getItem('impersonated_shop_id');
        if (impId) {
          await loadShopData(impId);
        } else {
          setAccessDenied(true);
        }
      } else if (profile.role !== 'owner') {
        setAccessDenied(true);
      } else {
        if (profile.shop_id) {
          await loadShopData(profile.shop_id);
        }
      }
      setAuthChecking(false);
    }
    checkOwner();
  }, []);

  // ─── Load Data ──────────────────────────────────────────────────────────────

  async function loadShopData(shopId: string) {
    setLoading(true);
    try {
      // 1. Fetch Toko
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();
      if (shopData) setShop(shopData);

      const { data: empData } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('shop_id', shopId)
        .neq('role', 'owner');
      
      const loadedEmployees: EmployeeDB[] = [];
      for (const emp of empData ?? []) {
        loadedEmployees.push({
          id: emp.id,
          email: emp.email || `Staf-${emp.id.slice(0, 5)}@kafe.com`,
          role: emp.role,
        });
      }
      setEmployees(loadedEmployees);

      // 3. Fetch Omzet Pendapatan Harian (Orders Lunas milik toko)
      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total_price')
        .eq('shop_id', shopId)
        .eq('status', 'paid');

      // Kelompokkan pendapatan berdasarkan tanggal (YYYY-MM-DD)
      const revenueMap: { [date: string]: { amount: number; count: number } } = {};
      
      (orders ?? []).forEach((o) => {
        const dateStr = new Date(o.created_at).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        if (!revenueMap[dateStr]) {
          revenueMap[dateStr] = { amount: 0, count: 0 };
        }
        revenueMap[dateStr].amount += o.total_price;
        revenueMap[dateStr].count += 1;
      });

      const formattedRevenues: DailyRevenue[] = Object.keys(revenueMap).map((date) => ({
        date,
        amount: revenueMap[date].amount,
        ordersCount: revenueMap[date].count,
      })).sort((a, b) => {
        // Sorting tanggal terbaru di atas
        const parseDate = (dStr: string) => {
          const parts = dStr.split('/');
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
        };
        return parseDate(b.date) - parseDate(a.date);
      });

      setRevenues(formattedRevenues);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // ─── Aktivasi Token Lisensi ──────────────────────────────────────────────────

  async function handleActivateToken() {
    const tok = tokenInput.trim();
    if (!tok || !shop) return;
    setActivating(true);

    try {
      // 1. Validasi Token
      const { data: tokenData, error: tokError } = await supabase
        .from('activation_tokens')
        .select('*')
        .eq('token', tok)
        .eq('is_used', false)
        .single();

      if (tokError || !tokenData) {
        alert('Token aktivasi tidak valid atau sudah digunakan.');
        setActivating(false);
        return;
      }

      // 2. Hitung penambahan masa aktif baru
      const currentExpiry = new Date(shop.trial_ends_at);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + tokenData.days * 24 * 60 * 60 * 1000).toISOString();

      // 3. Update Toko
      const { error: shopUpdateError } = await supabase
        .from('shops')
        .update({ trial_ends_at: newExpiry, is_active: true })
        .eq('id', shop.id);

      if (shopUpdateError) throw shopUpdateError;

      // 4. Tandai token sudah terpakai
      const { error: tokenUpdateError } = await supabase
        .from('activation_tokens')
        .update({ is_used: true, used_by_shop_id: shop.id })
        .eq('token', tok);

      if (tokenUpdateError) throw tokenUpdateError;

      alert(`Sukses! Toko diperpanjang +${tokenData.days} hari.`);
      setTokenInput('');
      
      // Reload
      await loadShopData(shop.id);

    } catch (e: any) {
      alert('Error aktivasi token: ' + e.message);
    } finally {
      setActivating(false);
    }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setAddError('');
    setAddSuccess(false);
    setAddingEmployee(true);

    if (!empEmail.trim() || !empPassword.trim()) {
      setAddError('Email dan password wajib diisi.');
      setAddingEmployee(false);
      return;
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const { createClient } = await import('@supabase/supabase-js');
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: empEmail.trim(),
        password: empPassword,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message ?? 'Gagal membuat akun auth.');
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: empEmail.trim(),
          role: empRole,
          shop_id: shop.id,
        });

      if (profileError) throw profileError;

      setEmpEmail('');
      setEmpPassword('');
      setEmpRole('kasir');
      setAddSuccess(true);
      await loadShopData(shop.id);
      void logWebsiteEvent(
        'Staf Ditambahkan',
        `Staf baru dengan email ${empEmail.trim()} ditambahkan ke toko ${shop.name} sebagai ${empRole}.`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      setAddError(err.message || 'Gagal menambahkan staf baru.');
    } finally {
      setAddingEmployee(false);
    }
  }

  // Load current QRIS preview
  useEffect(() => {
    if (shop?.id) {
      const { data } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(`qris/${shop.id}.png`);
      
      if (data?.publicUrl) {
        setQrisPreview(`${data.publicUrl}?t=${Date.now()}`);
      } else {
        setQrisPreview(null);
      }
    }
  }, [shop?.id]);

  async function handleQrisUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !shop) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file QRIS maksimal adalah 2MB.');
      return;
    }

    setUploadingQris(true);

    try {
      const { error } = await supabase.storage
        .from('payment-receipts')
        .upload(`qris/${shop.id}.png`, file, {
          upsert: true,
          contentType: file.type || 'image/png',
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(`qris/${shop.id}.png`);
      
      if (data?.publicUrl) {
        setQrisPreview(`${data.publicUrl}?t=${Date.now()}`);
      }
      alert('QRIS merchant berhasil diunggah!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengunggah QRIS: ' + (err.message || err));
    } finally {
      setUploadingQris(false);
    }
  }

  // Helper rupiah format
  function formatRupiah(amount: number): string {
    const rounded = Math.round(amount);
    const thousands = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp\u00A0${thousands}`;
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-sans">
        <p className="text-sm text-[#1A1A1A]/40">Memeriksa hak akses toko...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <span className="text-5xl block mb-4">🚫</span>
          <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">Akses Ditolak</h1>
          <p className="text-sm text-[#1A1A1A]/50">
            Halaman pengaturan toko & karyawan ini hanya dapat diakses oleh Owner toko.
          </p>
          <a href="/login" className="inline-block mt-6 px-6 py-3 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl">
            Kembali ke Login
          </a>
        </div>
      </div>
    );
  }

  const isTrialActive = shop ? new Date(shop.trial_ends_at) > new Date() : false;
  const daysLeft = shop
    ? Math.max(0, Math.ceil((new Date(shop.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const totalEarningsAllTime = revenues.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="bg-[#F5F2EB] min-h-screen font-sans">
      
      {/* Header Info */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Profil Toko & Karyawan</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Kelola staf, lisensi langganan, dan pantau omzet toko</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        
        {/* Row 1: Toko Details & License */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Info Toko */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Nama Usaha / Toko</span>
              <h3 className="text-xl font-black text-[#1A1A1A] mt-1">{shop?.name}</h3>
            </div>
            
            <div className="bg-[#F5F2EB]/60 rounded-2xl p-4 border border-[#1A1A1A]/5 space-y-2">
              <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide block">Kode Gabung Karyawan (Join Code)</span>
              <p className="font-mono text-lg font-black text-[#1A1A1A] text-center select-all bg-white border border-[#1A1A1A]/10 py-1.5 rounded-lg cursor-pointer" title="Klik untuk salin">
                {shop?.join_code}
              </p>
              <p className="text-[10px] text-[#1A1A1A]/50 text-center leading-relaxed">
                Bagikan kode unik di atas kepada kasir/admin Anda agar mereka dapat mendaftar.
              </p>
            </div>

            {/* QRIS Upload */}
            <div className="border-t border-[#1A1A1A]/5 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide block">QRIS Pembayaran Toko</span>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {qrisPreview ? (
                    <img 
                      src={qrisPreview} 
                      alt="QRIS Preview" 
                      className="w-full h-full object-contain" 
                      onError={() => setQrisPreview(null)}
                    />
                  ) : (
                    <span className="text-xl">📱</span>
                  )}
                </div>
                
                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrisUpload}
                    disabled={uploadingQris}
                    className="block w-full text-[10px] text-[#1A1A1A]/50 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#1A1A1A] file:text-white hover:file:bg-[#333] cursor-pointer"
                  />
                  <p className="text-[9px] text-[#1A1A1A]/30 font-sans">Format .png, .jpg (maks. 2MB).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lisensi Toko */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 space-y-4 col-span-2">
            <div>
              <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Status Lisensi SaaS</span>
              <h3 className="text-lg font-black text-[#1A1A1A] mt-1">
                {isTrialActive ? (
                  <span className="text-emerald-600">✓ Lisensi Aktif ({daysLeft} Hari Tersisa)</span>
                ) : (
                  <span className="text-red-500">⏳ Masa Aktif Habis (Kedaluwarsa)</span>
                )}
              </h3>
              <p className="text-xs text-[#1A1A1A]/40 mt-1">
                Lisensi sampai: {shop && new Date(shop.trial_ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Input Activation Token */}
            {userRole !== 'superadmin' ? (
              <div className="border-t border-[#1A1A1A]/5 pt-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <AlertIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-[#1A1A1A]/60">Aktivasi Token Lisensi Baru</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Masukkan Token (contoh: QRE-XXXX-XXXX-XXXX)"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-xl text-sm font-mono uppercase focus:outline-none"
                  />
                  <button
                    onClick={handleActivateToken}
                    disabled={activating || !tokenInput.trim()}
                    className="bg-[#1A1A1A] hover:bg-[#333] active:scale-[0.98] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    {activating ? 'Memproses...' : 'Aktivasi'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-[#1A1A1A]/5 pt-4">
                <div className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center justify-center gap-2 uppercase tracking-wide">
                  <AlertIcon className="w-4 h-4 flex-shrink-0" />
                  <span>Mode Preview: Aktivasi Lisensi dinonaktifkan</span>
                </div>
              </div>
            )}
              <p className="text-[10px] text-[#1A1A1A]/40">
                Hubungi Superadmin platform untuk memesan dan membeli token aktivasi berlangganan kafe Anda.
              </p>
            </div>
          </div>

        {/* Row 2: Staf & Pendapatan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Kelola Staf Karyawan */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-base">Daftar Karyawan</h3>
                <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Daftar staf kasir yang tergabung ke toko Anda</p>
              </div>
              {userRole !== 'superadmin' && (
                <button
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setAddSuccess(false);
                    setAddError('');
                  }}
                  className="px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333] active:scale-95 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                >
                  {showAddForm ? 'Batal' : '➕ Tambah'}
                </button>
              )}
            </div>

            {showAddForm && (
              <form onSubmit={handleAddEmployee} className="p-3 bg-[#F5F2EB]/60 rounded-2xl border border-[#1A1A1A]/5 space-y-2.5 text-xs font-sans">
                <span className="font-bold text-[#1A1A1A]/60 block uppercase tracking-wider text-[9px]">Registrasi Staf Baru</span>
                
                {addSuccess && (
                  <p className="text-[10px] text-emerald-600 font-bold text-center">Staf baru berhasil didaftarkan!</p>
                )}

                <div>
                  <input
                    type="email"
                    required
                    placeholder="Email staf"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#1A1A1A]/10 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#1A1A1A]/10 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#1A1A1A]/10 rounded-lg focus:outline-none font-bold"
                    >
                      <option value="kasir">Kasir</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={addingEmployee}
                    className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333] active:scale-95 text-white font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {addingEmployee ? '...' : 'Simpan'}
                  </button>
                </div>

                {addError && (
                  <p className="text-[9px] text-red-500 font-bold">{addError}</p>
                )}
              </form>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {employees.length === 0 ? (
                <div className="text-center py-8 bg-[#F5F2EB]/30 rounded-2xl border border-dashed border-[#1A1A1A]/10">
                  <p className="text-xs text-[#1A1A1A]/30">Belum ada karyawan terdaftar.</p>
                </div>
              ) : (
                employees.map((emp) => (
                  <div key={emp.id} className="border border-[#1A1A1A]/5 rounded-xl p-3 flex items-center justify-between text-xs hover:bg-[#F5F2EB]/10">
                    <div>
                      <p className="font-bold text-[#1A1A1A]">{emp.email}</p>
                      <p className="text-[9px] text-[#1A1A1A]/30 font-mono mt-0.5">ID: {emp.id.slice(0, 10)}...</p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase">
                      {emp.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pendapatan Harian */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 space-y-4 col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-base">Statistik Pendapatan</h3>
                <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Total omzet bisnis berdasarkan pesanan terverifikasi lunas</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide block">Akumulasi Total</span>
                <span className="text-base font-black text-[#1A1A1A]" suppressHydrationWarning>
                  {formatRupiah(totalEarningsAllTime)}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {revenues.length === 0 ? (
                <p className="text-xs text-[#1A1A1A]/30 text-center py-10">Belum ada omzet harian yang lunas.</p>
              ) : (
                <div className="border border-[#1A1A1A]/8 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F5F2EB]/80 border-b border-[#1A1A1A]/8 font-bold text-[#1A1A1A]">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3 text-center">Jumlah Order</th>
                        <th className="p-3 text-right">Pendapatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenues.map((rev) => (
                        <tr key={rev.date} className="border-b border-[#1A1A1A]/5 last:border-b-0 hover:bg-[#F5F2EB]/10 transition-colors">
                          <td className="p-3 font-semibold text-[#1A1A1A]">{rev.date}</td>
                          <td className="p-3 text-center font-medium text-[#1A1A1A]/60">{rev.ordersCount}x order</td>
                          <td className="p-3 text-right font-bold text-[#1A1A1A]" suppressHydrationWarning>
                            {formatRupiah(rev.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
