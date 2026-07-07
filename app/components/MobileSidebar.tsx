'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

interface MobileSidebarProps {
  profile: UserProfile | null;
  shop: ShopDetails | null;
  menuCount: number;
  pendingOrders: number;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isShopExpired: boolean;
  daysLeft: number;
  handleLogout: () => void;
  impersonateShopId: string | null;
}

export default function MobileSidebar({
  profile,
  shop,
  menuCount,
  pendingOrders,
  isMobileOpen,
  setIsMobileOpen,
  isShopExpired,
  daysLeft,
  handleLogout,
  impersonateShopId,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const isSuperadmin = profile?.role === 'superadmin';

  const navItems = [
    {
      name: 'Superadmin Central',
      href: '/dashboard/superadmin',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      roles: ['superadmin'],
    },
    {
      name: 'Monitor Database',
      href: '/dashboard/superadmin/database',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      roles: ['superadmin'],
    },
    {
      name: 'Daftar Merchant',
      href: '/dashboard/superadmin/shops',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      roles: ['superadmin'],
    },
    {
      name: 'Kelola Pengguna',
      href: '/dashboard/superadmin/users',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      roles: ['superadmin'],
    },
    {
      name: 'Kelola Lisensi Platform',
      href: '/dashboard/licenses',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      roles: ['superadmin'],
    },
    {
      name: 'Antrean Kasir',
      href: '/dashboard/kasir',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
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
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      roles: ['owner', 'admin', 'kasir', 'superadmin'],
    },
    {
      name: 'Analisis & Laporan',
      href: '/dashboard/kasir/analisis',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      roles: ['owner', 'admin', 'kasir', 'superadmin'],
    },
    {
      name: 'Kelola Menu',
      href: '/dashboard/menus',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
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
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M4 8h16M4 16h16" />
        </svg>
      ),
      roles: ['owner', 'admin', 'superadmin'],
    },
    {
      name: 'Toko & Karyawan',
      href: '/dashboard/settings',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      roles: ['owner', 'superadmin'],
    },
  ];

  const allowedNavItems = navItems.filter((item) => {
    if (!profile) return false;
    const isOwnerMenu = ['/dashboard/kasir', '/dashboard/kasir/riwayat', '/dashboard/kasir/analisis', '/dashboard/menus', '/dashboard/qr-generator', '/dashboard/settings'].includes(item.href);
    if (profile.role === 'superadmin' && isOwnerMenu && !impersonateShopId) {
      return false;
    }
    return item.roles.includes(profile.role);
  });

  return (
    <>
      {/* Header Mobile Bar */}
      <header className="md:hidden bg-[#1A1A1A] text-white px-4 py-3 flex items-center justify-between z-40 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="3">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
            </svg>
          </div>
          <span className="font-bold text-sm tracking-tight truncate max-w-[180px]">
            {shop ? shop.name : 'QREats'}
          </span>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
        >
          {isMobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Drawer Overlay & Menu */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex flex-col bg-[#1A1A1A] pt-14 text-white animate-fade-in">
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
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
                      alert('Akses ditolak. Masa aktif toko Anda sudah habis. Silakan aktifkan lisensi di tab Toko & Karyawan.');
                    } else {
                      setIsMobileOpen(false);
                    }
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    isActive ? 'bg-white text-[#1A1A1A] shadow-md' : 'text-white/60 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-[#1A1A1A]' : 'text-white/50'}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && item.badge !== null && !isClickBlocked && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-[#1A1A1A] text-white' : 'bg-[#FF9F43] text-[#1A1A1A]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Footer Profile */}
          <div className="p-5 border-t border-white/5 bg-black/25 space-y-3">
            {profile && (
              <div className="space-y-0.5">
                <span className="text-[9px] text-white/40 uppercase font-semibold tracking-wider block">Pengguna</span>
                <p className="text-xs font-bold text-white truncate">{profile.email}</p>
                <span className="inline-block bg-white/10 border border-white/10 rounded-full px-2 py-0.5 text-[9px] font-bold text-white/80 uppercase">
                  {profile.role}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-white/20 text-white rounded-xl text-xs font-bold hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              Keluar Akun
            </button>
          </div>
        </div>
      )}
    </>
  );
}
