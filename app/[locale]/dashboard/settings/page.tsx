'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { logWebsiteEvent } from '@/src/lib/logs';
import { AlertIcon, BlockIcon, PhoneIcon, CrownIcon, UserGroupIcon, MoneyIcon, InboxIcon, PlusIcon, EditIcon, TrashIcon } from '../../components/Icons';

interface ShopDB {
  id: string;
  name: string;
  join_code: string;
  trial_ends_at: string;
  is_active: boolean;
  subscription_tier?: string;
  base_table_limit?: number;
  base_cashier_limit?: number;
  addon_tables?: number;
  addon_cashiers?: number;
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
  
  // Usage states
  const [tablesCount, setTablesCount] = useState(0);
  const [cashiersCount, setCashiersCount] = useState(0);
  
  // Activation state
  const [tokenInput, setTokenInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [buyingAddon, setBuyingAddon] = useState(false);

  const [userRole, setUserRole] = useState<string | null>(null);

  // QRIS states
  const [qrisPreview, setQrisPreview] = useState<string | null>(null);
  const [uploadingQris, setUploadingQris] = useState(false);

  // Custom alert
  const [alertMsg, setAlertMsg] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);
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
      let totalCashiers = 0;
      for (const emp of empData ?? []) {
        if (emp.role === 'kasir') totalCashiers++;
        loadedEmployees.push({
          id: emp.id,
          email: emp.email || `Staf-${emp.id.slice(0, 5)}@kafe.com`,
          role: emp.role,
        });
      }
      setEmployees(loadedEmployees);
      setCashiersCount(totalCashiers);
      
      const { count: tCount } = await supabase
        .from('tables')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId);
      setTablesCount(tCount || 0);

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
        setAlertMsg({ title: 'Gagal Aktivasi', message: 'Token aktivasi tidak valid atau sudah digunakan.', type: 'error' });
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

      setAlertMsg({ title: 'Aktivasi Berhasil', message: `Sukses! Toko diperpanjang +${tokenData.days} hari.`, type: 'success' });
      setTokenInput('');
      
      // Reload
      await loadShopData(shop.id);

    } catch (e: any) {
      setAlertMsg({ title: 'Error', message: 'Error aktivasi token: ' + e.message, type: 'error' });
    } finally {
      setActivating(false);
    }
  }

  async function handleBuyAddon(type: 'table' | 'cashier') {
    if (!shop) return;
    setBuyingAddon(true);
    
    try {
      const updateData: any = {};
      let alertMsg = '';
      if (type === 'table') {
        updateData.addon_tables = (shop.addon_tables || 0) + 10;
        alertMsg = 'Berhasil mensimulasikan pembelian Add-on 10 Meja!';
      } else {
        updateData.addon_cashiers = (shop.addon_cashiers || 0) + 1;
        alertMsg = 'Berhasil mensimulasikan pembelian Add-on 1 Kasir!';
      }
      
      const { error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', shop.id);
        
      if (error) throw error;
      setAlertMsg({ title: 'Berhasil', message: alertMsg, type: 'success' });
      await loadShopData(shop.id);
    } catch (e: any) {
      setAlertMsg({ title: 'Gagal', message: 'Error membeli addon: ' + e.message, type: 'error' });
    } finally {
      setBuyingAddon(false);
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
      setAlertMsg({ title: 'Gagal', message: 'Ukuran file QRIS maksimal adalah 2MB.', type: 'error' });
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
      setAlertMsg({ title: 'Berhasil', message: 'QRIS merchant berhasil diunggah!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setAlertMsg({ title: 'Gagal', message: 'Gagal mengunggah QRIS: ' + (err.message || err), type: 'error' });
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-sm text-slate-900/40">Memeriksa hak akses toko...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-xl mx-auto flex items-center justify-center mb-4">
            <BlockIcon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Akses Ditolak</h1>
          <p className="text-sm text-slate-900/50">
            Halaman pengaturan toko & karyawan ini hanya dapat diakses oleh Owner toko.
          </p>
          <a href="/login" className="inline-block mt-6 px-6 py-3 bg-slate-900 text-white text-xs font-bold rounded-xl">
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
    <div className="bg-slate-50 min-h-screen font-sans">
      
      {/* Custom Alert Modal */}
      {alertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAlertMsg(null)} />
          <div className="relative bg-[#F9F6EE] rounded-xl overflow-hidden max-w-sm w-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 p-6 text-center border border-slate-900/10 animate-fade-in-up">
            <div className={`w-16 h-16 rounded-xl mx-auto flex items-center justify-center mb-4 ${alertMsg.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
               <AlertIcon className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">{alertMsg.title}</h3>
            <p className="text-sm text-slate-900/60 leading-relaxed mb-6">{alertMsg.message}</p>
            <button
              onClick={() => setAlertMsg(null)}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-[#333] transition-all"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
      
      {/* Header Info */}
      <div className="border-b border-slate-900/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Profil Toko & Karyawan</h2>
          <p className="text-xs text-slate-900/40 mt-0.5">Kelola staf, lisensi langganan, dan pantau omzet toko</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-min">
        
        {/* Info Toko (Row Span 2) */}
        <div className="bg-white border border-slate-900/8 rounded-xl p-6 space-y-4 lg:col-span-4 lg:row-span-2 flex flex-col h-full">
            <div>
              <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide">Nama Usaha / Toko</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{shop?.name}</h3>
            </div>
            
            <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-900/5 space-y-2">
              <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide block">Kode Gabung Karyawan (Join Code)</span>
              <p className="font-mono text-lg font-bold text-slate-900 text-center select-all bg-white border border-slate-900/10 py-1.5 rounded-lg cursor-pointer" title="Klik untuk salin">
                {shop?.join_code}
              </p>
              <p className="text-[10px] text-slate-900/50 text-center leading-relaxed">
                Bagikan kode unik di atas kepada kasir/admin Anda agar mereka dapat mendaftar.
              </p>
            </div>

            {/* QRIS Upload */}
            <div className="border-t border-slate-900/5 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide block">QRIS Pembayaran Toko</span>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-50 border border-slate-900/10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {qrisPreview ? (
                    <img 
                      src={qrisPreview} 
                      alt="QRIS Preview" 
                      className="w-full h-full object-contain" 
                      onError={() => setQrisPreview(null)}
                    />
                  ) : (
                    <PhoneIcon className="w-6 h-6 text-slate-900/40" />
                  )}
                </div>
                
                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrisUpload}
                    disabled={uploadingQris}
                    className="block w-full text-[10px] text-slate-900/50 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-[#333] cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-900/30 font-sans">Format .png, .jpg (maks. 2MB).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lisensi Toko */}
          <div className="bg-white border border-slate-900/8 rounded-xl p-6 space-y-4 lg:col-span-4">
            <div>
              <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide">Status Lisensi SaaS</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {isTrialActive ? (
                  <span className="text-emerald-600 flex items-center gap-1"><AlertIcon className="w-5 h-5" /> Lisensi Aktif ({daysLeft} Hari Tersisa)</span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1"><AlertIcon className="w-5 h-5" /> Masa Aktif Habis (Kedaluwarsa)</span>
                )}
              </h3>
              <p className="text-xs text-slate-900/40 mt-1">
                Lisensi sampai: {shop && new Date(shop.trial_ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Input Activation Token */}
            {userRole !== 'superadmin' ? (
              <div className="border-t border-slate-900/5 pt-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <AlertIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-slate-900/60">Aktivasi Token Lisensi Baru</p>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Masukkan Token (contoh: QRE-XXXX-XXXX-XXXX)"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-900/10 rounded-xl text-sm font-mono uppercase focus:outline-none text-slate-900 placeholder-[#1A1A1A]/40"
                  />
                  <button
                    onClick={handleActivateToken}
                    disabled={activating || !tokenInput.trim()}
                    className="bg-slate-900 hover:bg-[#333] active:scale-[0.98] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    {activating ? 'Memproses...' : 'Aktivasi'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-900/5 pt-4">
                <div className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center justify-center gap-2 uppercase tracking-wide">
                  <AlertIcon className="w-4 h-4 flex-shrink-0" />
                  <span>Mode Preview: Aktivasi Lisensi dinonaktifkan</span>
                </div>
              </div>
            )}
              <p className="text-[10px] text-slate-900/40 mt-4">
                Hubungi Superadmin platform untuk memesan dan membeli token aktivasi berlangganan kafe Anda.
              </p>
            </div>

          {/* Langganan & Add-on (New Col) */}
          <div className="bg-white border border-slate-900/8 rounded-xl p-6 space-y-4 lg:col-span-4">
            <div>
              <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide">Langganan & Add-on</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1 capitalize">Paket {shop?.subscription_tier || 'Basic'}</h3>
            </div>
            
            <div className="space-y-3">
              {/* Meja */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-900/5 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-900/40 uppercase block">Kuota Meja (QR)</span>
                  <span className="text-sm font-bold text-slate-900">{tablesCount} / {(shop?.base_table_limit || 20) + (shop?.addon_tables || 0)}</span>
                </div>
              </div>
              
              {/* Kasir */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-900/5 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-900/40 uppercase block">Kuota Kasir</span>
                  <span className="text-sm font-bold text-slate-900">{cashiersCount} / {(shop?.base_cashier_limit || 1) + (shop?.addon_cashiers || 0)}</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-slate-900/40 leading-relaxed pt-2">
              Batas kuota tidak dapat ditambah sendiri. Silakan hubungi Superadmin platform untuk melakukan upgrade paket atau pembelian Add-on Kuota.
            </p>
          </div>

        {/* Kelola Staf Karyawan */}
        <div className="bg-white border border-slate-900/8 rounded-xl p-6 space-y-4 lg:col-span-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Daftar Karyawan</h3>
                <p className="text-xs text-slate-900/40 mt-0.5">Daftar staf kasir yang tergabung ke toko Anda</p>
              </div>

            </div>



            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {employees.length === 0 ? (
                <div className="text-center py-8 bg-slate-50/30 rounded-xl border border-dashed border-slate-900/10">
                  <p className="text-xs text-slate-900/30">Belum ada karyawan terdaftar.</p>
                </div>
              ) : (
                employees.map((emp) => (
                  <div key={emp.id} className="border border-slate-900/5 rounded-xl p-3 flex items-center justify-between text-xs hover:bg-slate-50/10">
                    <div>
                      <p className="font-bold text-slate-900">{emp.email}</p>
                      <p className="text-[9px] text-slate-900/30 font-mono mt-0.5">ID: {emp.id.slice(0, 10)}...</p>
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
          <div className="bg-white border border-slate-900/8 rounded-xl p-6 space-y-4 lg:col-span-12">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Statistik Pendapatan</h3>
                <p className="text-xs text-slate-900/40 mt-0.5">Total omzet bisnis berdasarkan pesanan terverifikasi lunas</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-wide block">Akumulasi Total</span>
                <span className="text-base font-bold text-slate-900" suppressHydrationWarning>
                  {formatRupiah(totalEarningsAllTime)}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {revenues.length === 0 ? (
                <p className="text-xs text-slate-900/30 text-center py-10">Belum ada omzet harian yang lunas.</p>
              ) : (
                <div className="border border-slate-900/8 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-900/8 font-bold text-slate-900">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3 text-center">Jumlah Order</th>
                        <th className="p-3 text-right">Pendapatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenues.map((rev) => (
                        <tr key={rev.date} className="border-b border-slate-900/5 last:border-b-0 hover:bg-slate-50/10 transition-colors">
                          <td className="p-3 font-semibold text-slate-900">{rev.date}</td>
                          <td className="p-3 text-center font-medium text-slate-900/60">{rev.ordersCount}x order</td>
                          <td className="p-3 text-right font-bold text-slate-900" suppressHydrationWarning>
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

      </main>

    </div>
  );
}
