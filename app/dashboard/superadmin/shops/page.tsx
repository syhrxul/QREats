'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';

interface ShopDB {
  id: string;
  name: string;
  is_active: boolean;
  trial_ends_at: string;
  created_at: string;
  owner_id: string;
  employeeCount?: number;
}

import { LockIcon } from '../../../components/Icons';

export default function SuperadminShopsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [shops, setShops] = useState<ShopDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Shop Detail States
  const [selectedShop, setSelectedShop] = useState<ShopDB | null>(null);
  const [shopStats, setShopStats] = useState({
    menuCount: 0,
    employeeCount: 0,
    tableCount: 0,
    orderCount: 0,
    loading: false,
  });

  async function handleOpenShopDetail(shop: ShopDB) {
    setSelectedShop(shop);
    setShopStats((prev) => ({ ...prev, loading: true }));
    try {
      const { count: menuCount } = await supabase
        .from('menus')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id);

      const { count: employeeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .neq('role', 'owner')
        .neq('role', 'superadmin');

      const { count: tableCount } = await supabase
        .from('tables')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id);

      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id);

      setShopStats({
        menuCount: menuCount ?? 0,
        employeeCount: employeeCount ?? 0,
        tableCount: tableCount ?? 0,
        orderCount: orderCount ?? 0,
        loading: false,
      });
    } catch (e) {
      console.error(e);
      setShopStats((prev) => ({ ...prev, loading: false }));
    }
  }

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

  // ─── Fetch Shops & Employee Counts ─────────────────────────────────────────

  const fetchShops = async () => {
    setLoading(true);
    try {
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      if (shopsError) throw shopsError;

      const loadedShops: ShopDB[] = shopsData ?? [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('shop_id, role');

      const employeeMap: { [shopId: string]: number } = {};
      (profiles ?? []).forEach((p) => {
        if (p.shop_id && p.role !== 'owner') {
          employeeMap[p.shop_id] = (employeeMap[p.shop_id] || 0) + 1;
        }
      });

      const shopsWithEmp = loadedShops.map((s) => ({
        ...s,
        employeeCount: employeeMap[s.id] || 0,
      }));

      setShops(shopsWithEmp);
    } catch (e) {
      console.error('Error fetching shops:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking && !accessDenied) {
      fetchShops();
    }
  }, [authChecking, accessDenied]);

  // ─── Impersonate ───────────────────────────────────────────────────────────

  function handleImpersonateShop(shopId: string, shopName: string) {
    localStorage.setItem('impersonated_shop_id', shopId);
    localStorage.setItem('impersonated_shop_name', shopName);
    window.location.href = '/dashboard/menus';
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
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Kelola Merchant Toko</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Daftar toko merchant, masa aktif lisensi, staf karyawan terdaftar</p>
        </div>
        <button
          onClick={fetchShops}
          className="px-4 py-2 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-xs font-bold rounded-xl transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Table Card */}
        <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-base">Toko Terdaftar</h3>
              <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Pantau status & intip dashboard menu kasir toko</p>
            </div>
            <span className="bg-[#1A1A1A] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {shops.length} Toko
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-[#F5F2EB]/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : shops.length === 0 ? (
              <p className="text-xs text-center py-12 text-[#1A1A1A]/30">Belum ada toko yang terdaftar.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F2EB]/60 border-b border-[#1A1A1A]/5 text-[#1A1A1A]/60 font-bold">
                    <th className="p-3">Nama Toko</th>
                    <th className="p-3">ID Toko</th>
                    <th className="p-3 text-center">Staf Karyawan</th>
                    <th className="p-3">Masa Berlaku</th>
                    <th className="p-3 text-center">Monitor</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((s) => {
                    const isTrialActive = new Date(s.trial_ends_at) > new Date();
                    return (
                      <tr 
                        key={s.id} 
                        className="border-b border-[#1A1A1A]/5 last:border-b-0 hover:bg-[#F5F2EB]/10 transition-colors cursor-pointer"
                        onClick={() => handleOpenShopDetail(s)}
                      >
                        <td className="p-3 font-bold text-[#1A1A1A]">
                          {s.name}
                        </td>
                        <td className="p-3 font-mono text-[#1A1A1A]/40 text-[10px]">
                          {s.id}
                        </td>
                        <td className="p-3 text-center font-semibold text-[#1A1A1A]">
                          {s.employeeCount} Staf
                        </td>
                        <td className="p-3 font-semibold">
                          <span className={isTrialActive ? 'text-emerald-600' : 'text-red-500'}>
                            {new Date(s.trial_ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImpersonateShop(s.id, s.name);
                            }}
                            className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#333] active:scale-95 text-white font-bold text-[10px] rounded-lg transition-all"
                          >
                            👁️ Intip Toko
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
      {/* Modal Detail Toko */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedShop(null)} />
          <div className="relative bg-[#F9F6EE] rounded-3xl overflow-hidden max-w-md w-full shadow-2xl border border-[#1A1A1A]/10 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-4">
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-lg font-sans">Detail Merchant Toko</h3>
                <p className="text-xs text-[#1A1A1A]/40 font-mono mt-0.5">ID: {selectedShop.id}</p>
              </div>
              <button onClick={() => setSelectedShop(null)} className="text-xl text-[#1A1A1A]/40 hover:text-[#1A1A1A] cursor-pointer">
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-[#1A1A1A]/5">
                <div>
                  <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Nama Toko</span>
                  <p className="font-bold text-[#1A1A1A] text-sm mt-0.5">{selectedShop.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Status Lisensi</span>
                  <p className="mt-0.5">
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      new Date(selectedShop.trial_ends_at) > new Date()
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {new Date(selectedShop.trial_ends_at) > new Date() ? 'AKTIF' : 'EXPIRED'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide">Statistik Operasional</span>
                {shopStats.loading ? (
                  <p className="text-xs text-[#1A1A1A]/40 animate-pulse py-2">Memuat statistik toko...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-3.5 rounded-xl border border-[#1A1A1A]/5 text-center">
                      <span className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide font-sans">Jumlah Menu</span>
                      <p className="text-xl font-black text-[#1A1A1A] mt-1">{shopStats.menuCount} Item</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-[#1A1A1A]/5 text-center">
                      <span className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide font-sans">Jumlah Karyawan</span>
                      <p className="text-xl font-black text-[#1A1A1A] mt-1">{shopStats.employeeCount} Staf</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-[#1A1A1A]/5 text-center">
                      <span className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide font-sans">Jumlah Meja</span>
                      <p className="text-xl font-black text-[#1A1A1A] mt-1">{shopStats.tableCount} Meja</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-[#1A1A1A]/5 text-center">
                      <span className="text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-wide font-sans">Total Orderan</span>
                      <p className="text-xl font-black text-[#1A1A1A] mt-1">{shopStats.orderCount} Order</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-800 text-[10px] leading-relaxed font-sans">
                🛡️ **Kebijakan Privasi Tenant:** Untuk menjaga privasi merchant, detail personal karyawan, data pelanggan, dan histori transaksi lengkap disembunyikan. Superadmin hanya dapat memantau akumulasi volume operasional agregat.
              </div>
            </div>
            
            <button
              onClick={() => setSelectedShop(null)}
              className="w-full py-3 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-all cursor-pointer font-sans"
            >
              Tutup Detail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
