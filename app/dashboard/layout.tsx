'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../src/lib/supabase';
import Sidebar from '../components/Sidebar';
import MobileSidebar from '../components/MobileSidebar';
import { AlertIcon } from '../components/Icons';

interface UserProfile {
  email: string;
  role: string;
  shop_id: string | null;
}

interface ShopDetails {
  id: string;
  name: string;
  is_active: boolean;
  trial_ends_at: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [shop, setShop] = useState<ShopDetails | null>(null);
  
  const [menuCount, setMenuCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [delayedOrders, setDelayedOrders] = useState<any[]>([]);

  // Impersonate state
  const [impersonateShopId, setImpersonateShopId] = useState<string | null>(null);
  const [impersonateShopName, setImpersonateShopName] = useState<string | null>(null);

  // Input token aktivasi
  const [activationToken, setActivationToken] = useState('');
  const [activating, setActivating] = useState(false);

  // ─── Fetch Stats & Profile & Shop ──────────────────────────────────────────

  const loadDashboardData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    // Cek custom token/session expiry (1 minggu, batas jam 12 malam)
    const expiryStr = localStorage.getItem('qreats_session_expiry');
    if (expiryStr) {
      const expiryDate = new Date(expiryStr);
      if (new Date() >= expiryDate) {
        localStorage.removeItem('qreats_session_expiry');
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }
    } else {
      // Set default jika tidak ada cache (migrasi sesi lama)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      expiry.setHours(0, 0, 0, 0);
      localStorage.setItem('qreats_session_expiry', expiry.toISOString());
    }

    // 1. Load Profile
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('role, shop_id')
      .eq('id', session.user.id)
      .single();

    if (profErr || !prof) {
      setLoading(false);
      return;
    }

    // Cek Impersonation dari localStorage (khusus Superadmin)
    let activeShopId = prof.shop_id;
    if (prof.role === 'superadmin') {
      const impId = localStorage.getItem('impersonated_shop_id');
      const impName = localStorage.getItem('impersonated_shop_name');
      if (impId) {
        activeShopId = impId;
        setImpersonateShopId(impId);
        setImpersonateShopName(impName);
      } else {
        setImpersonateShopId(null);
        setImpersonateShopName(null);
      }
    }

    setProfile({
      email: session.user.email ?? '',
      role: prof.role,
      shop_id: activeShopId,
    });

    // Jika Superadmin sedang tidak mengintip toko, skip load stats toko
    if (prof.role === 'superadmin' && !activeShopId) {
      setLoading(false);
      return;
    }

    // 2. Load Shop Info
    if (activeShopId) {
      const { data: shopData } = await supabase
        .from('shops')
        .select('id, name, is_active, trial_ends_at')
        .eq('id', activeShopId)
        .single();
      
      if (shopData) {
        setShop(shopData);
      }

      // 3. Load stats menu khusus toko ini
      const { count: menus } = await supabase
        .from('menus')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', activeShopId);
      setMenuCount(menus ?? 0);

      // 4. Load stats pending order khusus toko ini
      const { count: orders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', activeShopId)
        .eq('status', 'pending');
      setPendingOrders(orders ?? 0);
    }

    setLoading(false);
  }, [router]);

  const checkDelayedOrders = useCallback(async () => {
    const activeShopId = profile?.shop_id;
    if (!activeShopId) return;

    const { data, error } = await supabase
      .from('orders')
      .select('id, table_number, created_at, customer_name, total_price')
      .eq('shop_id', activeShopId)
      .eq('status', 'pending');

    if (!error && data) {
      const now = new Date().getTime();
      const delayed = data.filter((o) => {
        const orderTime = new Date(o.created_at).getTime();
        const diffMinutes = (now - orderTime) / (1000 * 60);
        return diffMinutes >= 5; // 5 menit atau lebih
      });
      setDelayedOrders(delayed);
    }
  }, [profile?.shop_id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Realtime subscription & initial check
  useEffect(() => {
    const activeShopId = profile?.shop_id;
    if (!activeShopId) return;

    checkDelayedOrders();

    // Subscribe realtime order status agar badge pending di sidebar sinkron
    const channel = supabase
      .channel('sidebar-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', activeShopId)
            .eq('status', 'pending')
            .then(({ count }) => setPendingOrders(count ?? 0));
          
          checkDelayedOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.shop_id, checkDelayedOrders]);

  // Periodic checker timer (setiap 30 detik)
  useEffect(() => {
    const activeShopId = profile?.shop_id;
    if (!activeShopId) return;

    const interval = setInterval(() => {
      checkDelayedOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [profile?.shop_id, checkDelayedOrders]);

  // Dynamic Tab Title
  useEffect(() => {
    let name = 'QREats';
    if (profile?.role === 'superadmin' && impersonateShopName) {
      name = `${impersonateShopName} (Preview)`;
    } else if (shop?.name) {
      name = shop.name;
    }
    document.title = name;
  }, [shop, profile, impersonateShopName]);

  // Keluar dari mode intip toko
  function handleExitImpersonate() {
    localStorage.removeItem('impersonated_shop_id');
    localStorage.removeItem('impersonated_shop_name');
    setImpersonateShopId(null);
    setImpersonateShopName(null);
    window.location.href = '/dashboard/superadmin/shops';
  }

  // ─── Aktivasi Token dari Banner Kritis ──────────────────────────────────────

  async function handleActivateToken() {
    const tok = activationToken.trim();
    if (!tok || !shop) return;
    setActivating(true);

    try {
      // 1. Validasi Token ke DB
      const { data: tokenData, error: tokError } = await supabase
        .from('activation_tokens')
        .select('*')
        .eq('token', tok)
        .eq('is_used', false)
        .single();

      if (tokError || !tokenData) {
        alert('Token tidak valid atau sudah digunakan.');
        setActivating(false);
        return;
      }

      // 2. Hitung Tanggal Expired baru
      const currentExpiry = new Date(shop.trial_ends_at);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + tokenData.days * 24 * 60 * 60 * 1000).toISOString();

      // 3. Update Toko
      const { error: shopUpdateError } = await supabase
        .from('shops')
        .update({ trial_ends_at: newExpiry, is_active: true })
        .eq('id', shop.id);

      if (shopUpdateError) throw shopUpdateError;

      // 4. Tandai Token Terpakai
      const { error: tokenUpdateError } = await supabase
        .from('activation_tokens')
        .update({ is_used: true, used_by_shop_id: shop.id })
        .eq('token', tok);

      if (tokenUpdateError) throw tokenUpdateError;

      alert(`Sukses! Masa aktif toko berhasil diperpanjang +${tokenData.days} hari.`);
      setActivationToken('');
      await loadDashboardData();

    } catch (e: any) {
      alert('Error aktivasi: ' + e.message);
    } finally {
      setActivating(false);
    }
  }

  // ─── Logout Handler ─────────────────────────────────────────────────────────

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('impersonated_shop_id');
    localStorage.removeItem('impersonated_shop_name');
    void fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Logout Pengguna',
        description: `Pengguna dengan sesi sedang logout dari dashboard.`,
        type: 'info',
      }),
    }).catch(() => null);
    router.push('/login');
    router.refresh();
  }


  // Cek Status Trial & Masa Kritis Toko
  const isSuperadmin = profile?.role === 'superadmin';
  const isTrialActive = shop ? new Date(shop.trial_ends_at) > new Date() : false;
  const isShopExpired = shop ? (!shop.is_active || !isTrialActive) : false;

  const daysLeft = shop
    ? Math.max(0, Math.ceil((new Date(shop.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  const isMasaKritis = shop && isTrialActive && daysLeft <= 3 && !isSuperadmin;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#1A1A1A]/20 border-t-[#1A1A1A] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-[#1A1A1A]/40">Memuat sesi dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F2EB] overflow-hidden font-sans">
      
      {/* ── 1. SIDEBAR DESKTOP ── */}
      <Sidebar
        profile={profile}
        shop={shop}
        menuCount={menuCount}
        pendingOrders={pendingOrders}
        daysLeft={daysLeft}
        isTrialActive={isTrialActive}
        isShopExpired={isShopExpired}
        impersonateShopId={impersonateShopId}
        impersonateShopName={impersonateShopName}
        handleLogout={handleLogout}
      />

      {/* ── 2. HEADER & DRAWER MOBILE ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileSidebar
          profile={profile}
          shop={shop}
          menuCount={menuCount}
          pendingOrders={pendingOrders}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          isShopExpired={isShopExpired}
          daysLeft={daysLeft}
          handleLogout={handleLogout}
          impersonateShopId={impersonateShopId}
        />

        {/* ── 4. DASHBOARD CONTENT ── */}
        <div className="flex-1 overflow-y-auto min-w-0 bg-[#F5F2EB] flex flex-col justify-between">
          
          {/* Banner Impersonate Superadmin */}
          {impersonateShopId && isSuperadmin && (
            <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between shadow-md font-sans">
              <div className="flex items-center gap-3">
                <span className="text-xl">👁️</span>
                <div>
                  <p className="font-bold text-xs leading-none">PREVIEW MODE (BACA SAJA)</p>
                  <p className="text-[10px] text-white/85 mt-1">Anda sedang melihat dashboard kafe: <span className="font-bold">{impersonateShopName}</span>. Aksi perubahan dinonaktifkan.</p>
                </div>
              </div>
              <button
                onClick={handleExitImpersonate}
                className="bg-white text-red-600 hover:bg-white/90 text-xs font-black px-3.5 py-1.5 rounded-xl transition-all shadow"
              >
                Kembali ke Admin ↩
              </button>
            </div>
          )}

          {/* Banner Kritis */}
          {isMasaKritis && (
            <div className="bg-amber-500 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md font-sans">
              <div className="flex items-center gap-3">
                <AlertIcon className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">Masa Aktif Toko Hampir Habis!</p>
                  <p className="text-xs text-white/85">Toko Anda akan kedaluwarsa dalam {daysLeft} hari. Hubungi Superadmin untuk membeli token aktivasi.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Masukkan Token Aktivasi"
                  value={activationToken}
                  onChange={(e) => setActivationToken(e.target.value)}
                  className="bg-white/20 border border-white/30 text-white placeholder-white/60 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-white w-full sm:w-48 font-mono uppercase"
                />
                <button
                  onClick={handleActivateToken}
                  disabled={activating || !activationToken.trim()}
                  className="bg-white text-amber-600 hover:bg-white/90 text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50 flex-shrink-0"
                >
                  {activating ? '...' : 'Aktivasi'}
                </button>
              </div>
            </div>
          )}
          
          {/* Banner Pesanan Terlambat Belum Diproses (Admin/Owner Escalation) */}
          {(profile?.role === 'owner' || profile?.role === 'admin') && delayedOrders.length > 0 && (
            <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-sans animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="text-2xl animate-bounce">🚨</span>
                <div>
                  <p className="font-bold text-sm text-rose-800">
                    Ada {delayedOrders.length} Pesanan Pending Belum Diproses Kasir (&gt; 5 Menit)!
                  </p>
                  <p className="text-xs text-rose-600 mt-1">
                    Meja terpengaruh: <span className="font-bold">{delayedOrders.map(o => o.table_number).join(', ')}</span>. Silakan tindak lanjuti untuk menjaga kenyamanan pelanggan.
                  </p>
                </div>
              </div>
              
              <Link
                href="/dashboard/kasir"
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow flex-shrink-0 text-center"
              >
                Buka Antrean Kasir ➜
              </Link>
            </div>
          )}

          {/* Blokir Layar jika Expired */}
          {isShopExpired && !isSuperadmin && pathname !== '/dashboard/settings' ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="bg-white border border-red-200 rounded-3xl p-8 max-w-sm shadow-md space-y-4">
                <span className="text-5xl block">⏳</span>
                <h3 className="text-xl font-black text-red-600">Masa Aktif Habis</h3>
                <p className="text-sm text-[#1A1A1A]/50">
                  Masa aktif/trial toko **{shop?.name}** telah berakhir. Silakan hubungi Superadmin untuk membeli token aktivasi baru.
                </p>
                <div className="border-t border-[#1A1A1A]/10 pt-4 space-y-3">
                  <p className="text-xs text-[#1A1A1A]/40">Sudah punya token aktivasi? Masukkan di bawah:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="QRE-XXXX-XXXX-XXXX"
                      value={activationToken}
                      onChange={(e) => setActivationToken(e.target.value)}
                      className="bg-[#F5F2EB] border border-[#1A1A1A]/15 text-xs px-3 py-2.5 rounded-xl focus:outline-none w-full font-mono uppercase"
                    />
                    <button
                      onClick={handleActivateToken}
                      disabled={activating || !activationToken.trim()}
                      className="bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
                    >
                      {activating ? '...' : 'Kirim'}
                    </button>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    className="inline-block text-xs font-bold text-[#1A1A1A] underline underline-offset-2 hover:text-[#333] pt-2"
                  >
                    Buka Halaman Lisensi & Staf ↗
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              {children}
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}
