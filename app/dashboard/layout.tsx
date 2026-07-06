'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../src/lib/supabase';

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

  useEffect(() => {
    loadDashboardData();

    // Subscribe realtime order status agar badge pending di sidebar sinkron
    const channel = supabase
      .channel('sidebar-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          const activeShopId = profile?.shop_id;
          if (activeShopId) {
            supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('shop_id', activeShopId)
              .eq('status', 'pending')
              .then(({ count }) => setPendingOrders(count ?? 0));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData, profile?.shop_id]);

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
    router.push('/login');
    router.refresh();
  }

  // ─── Sidebar Navigation Config ──────────────────────────────────────────────

  const navItems = [
    {
      name: 'Superadmin Central',
      href: '/dashboard/superadmin',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      roles: ['superadmin'],
    },
    {
      name: 'Daftar Merchant',
      href: '/dashboard/superadmin/shops',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      roles: ['superadmin'],
    },
    {
      name: 'Kelola Pengguna',
      href: '/dashboard/superadmin/users',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      roles: ['superadmin'],
    },
    {
      name: 'Kelola Lisensi Platform',
      href: '/dashboard/licenses',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      roles: ['superadmin'],
    },
    {
      name: 'Antrean Kasir',
      href: '/dashboard/kasir',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      badge: pendingOrders > 0 ? pendingOrders : null,
      roles: ['owner', 'admin', 'kasir', 'superadmin'],
    },
    {
      name: 'Riwayat Transaksi',
      href: '/dashboard/kasir/riwayat',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      roles: ['owner', 'admin', 'kasir', 'superadmin'],
    },
    {
      name: 'Analisis & Laporan',
      href: '/dashboard/kasir/analisis',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      roles: ['owner', 'admin', 'kasir', 'superadmin'],
    },
    {
      name: 'Kelola Menu',
      href: '/dashboard/menus',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      badge: menuCount > 0 ? menuCount : null,
      roles: ['owner', 'admin', 'superadmin'],
    },
    {
      name: 'QR Generator Meja',
      href: '/dashboard/qr-generator',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M4 8h16M4 16h16" />
        </svg>
      ),
      roles: ['owner', 'admin', 'superadmin'],
    },
    {
      name: 'Toko & Karyawan',
      href: '/dashboard/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      roles: ['owner', 'superadmin'],
    },
  ];

  // Filter menu berdasarkan role pengguna & status impersonation
  const allowedNavItems = navItems.filter((item) => {
    if (!profile) return false;
    const isOwnerMenu = ['/dashboard/kasir', '/dashboard/kasir/riwayat', '/dashboard/kasir/analisis', '/dashboard/menus', '/dashboard/qr-generator', '/dashboard/settings'].includes(item.href);
    if (profile.role === 'superadmin' && isOwnerMenu && !impersonateShopId) {
      return false;
    }
    return item.roles.includes(profile.role);
  });

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
      <aside className="hidden md:flex md:flex-col md:w-64 bg-[#1A1A1A] text-white flex-shrink-0">
        
        {/* Brand Logo */}
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17v3" />
            </svg>
          </div>
          <div>
            <span className="font-black text-base tracking-tight block truncate max-w-[170px]" title={shop ? shop.name : 'QREats'}>
              {shop ? shop.name : 'QREats'}
            </span>
            <span className="text-[10px] text-white/40 font-semibold tracking-wider uppercase">
              {isSuperadmin ? (impersonateShopId ? 'PREVIEW MODE' : 'Superadmin Portal') : 'Owner Portal'}
            </span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const isActive = pathname === item.href;
            const isClickBlocked = isShopExpired && !isSuperadmin && item.href !== '/dashboard/settings';

            return (
              <Link
                key={item.href}
                href={isClickBlocked ? '#' : item.href}
                onClick={(e) => {
                  if (isClickBlocked) {
                    e.preventDefault();
                    alert('⚠️ Akses ditolak. Masa aktif toko Anda sudah habis. Silakan aktifkan lisensi di tab Toko & Karyawan.');
                  }
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-white text-[#1A1A1A]'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && item.badge !== null && !isClickBlocked && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                    isActive ? 'bg-[#1A1A1A] text-white' : 'bg-amber-500 text-[#1A1A1A]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Info Lisensi Toko */}
        {shop && !isSuperadmin && (
          <div className="mx-4 mb-2 p-3 bg-white/5 rounded-2xl border border-white/10 text-xs">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Masa Aktif</p>
            <p className="font-bold mt-0.5 text-white">
              {isTrialActive ? `${daysLeft} Hari Tersisa` : 'Masa Trial Habis'}
            </p>
            <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${daysLeft <= 3 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (daysLeft / 7) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          {profile && (
            <div className="mb-4 px-2">
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Pengguna</p>
              <p className="text-sm font-bold text-white truncate mt-0.5">{profile.email}</p>
              <span className="inline-block bg-white/10 border border-white/10 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white/80 uppercase mt-1">
                {profile.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-white/20 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/5 active:scale-[0.98] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* ── 2. HEADER MOBILE (Untuk HP) ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden bg-[#1A1A1A] text-white px-4 py-3 flex items-center justify-between z-40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="3">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight truncate max-w-[180px]">
              {shop ? shop.name : 'QREats SaaS'}
            </span>
          </div>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/25 active:scale-95 transition-all"
          >
            {isMobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </header>

        {/* ── 3. DRAWER MENU MOBILE ── */}
        {isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex flex-col bg-[#1A1A1A] pt-16 text-white animate-fade-in">
            <nav className="flex-1 px-6 py-8 space-y-2 overflow-y-auto">
              {allowedNavItems.map((item) => {
                const isActive = pathname === item.href;
                const isClickBlocked = isShopExpired && !isSuperadmin && item.href !== '/dashboard/settings';

                return (
                  <Link
                    key={item.href}
                    href={isClickBlocked ? '#' : item.href}
                    onClick={(e) => {
                      if (isClickBlocked) {
                        e.preventDefault();
                        alert('⚠️ Akses ditolak. Masa aktif toko Anda sudah habis. Silakan aktifkan lisensi di tab Toko & Karyawan.');
                      } else {
                        setIsMobileOpen(false);
                      }
                    }}
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl text-base font-bold transition-all ${
                      isActive ? 'bg-white text-[#1A1A1A]' : 'text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge !== null && !isClickBlocked && (
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                        isActive ? 'bg-[#1A1A1A] text-white' : 'bg-amber-500 text-[#1A1A1A]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-6 border-t border-white/10 bg-black/25">
              {profile && (
                <div className="mb-4">
                  <p className="text-xs text-white/40 uppercase font-semibold tracking-wider">Pengguna</p>
                  <p className="text-sm font-bold text-white truncate">{profile.email}</p>
                  <span className="inline-block bg-white/15 border border-white/10 rounded-full px-2.5 py-0.5 text-[9px] font-bold text-white/80 uppercase mt-1">
                    {profile.role}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 border border-white/20 text-white rounded-2xl text-sm font-bold hover:bg-white/10 active:scale-95 transition-all"
              >
                Keluar Akun
              </button>
            </div>
          </div>
        )}

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
                <span className="text-2xl">⚠️</span>
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
