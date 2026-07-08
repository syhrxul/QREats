'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';
import { LockIcon } from '../../../components/Icons';
import { Crown, TrendingUp, TrendingDown, Users, DollarSign, Clock, BarChart3, AlertCircle, RefreshCw, Utensils } from 'lucide-react';

interface TableDB {
  id: number;
  name: string;
  is_active: boolean;
}

interface OrderDB {
  id: string;
  table_number: string;
  total_price: number;
  status: 'pending' | 'paid' | 'rejected';
  created_at: string;
  customer_name?: string;
}

interface MenuAnalytic {
  menuName: string;
  qty: number;
  totalSales: number;
}

function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const thousands = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp\u00A0${thousands}`;
}

export default function CashierAnalysisPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats States
  const [revenue, setRevenue] = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [paidOrdersCount, setPaidOrdersCount] = useState(0);
  const [menuAnalytics, setMenuAnalytics] = useState<MenuAnalytic[]>([]);
  
  const [occupiedTables, setOccupiedTables] = useState<string[]>([]);
  const [finishedTables, setFinishedTables] = useState<string[]>([]);
  const [emptyTables, setEmptyTables] = useState<string[]>([]);

  // Pro Features States
  const [subscriptionTier, setSubscriptionTier] = useState<'basic' | 'pro'>('basic');
  const [hourlySales, setHourlySales] = useState<{ hour: string; total: number; count: number }[]>([]);
  const [bottomMenus, setBottomMenus] = useState<MenuAnalytic[]>([]);
  const [aov, setAov] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [repeatCustomersCount, setRepeatCustomersCount] = useState(0);
  const [totalUniqueCustomers, setTotalUniqueCustomers] = useState(0);

  // Upgrade Request States
  const [hasUpgradeRequest, setHasUpgradeRequest] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  // ─── Auth Guard & Load Shop ID ──────────────────────────────────────────────

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('role, shop_id')
        .eq('id', session.user.id)
        .single();
      
      if (!prof || !['owner', 'admin', 'kasir', 'superadmin'].includes(prof.role)) {
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }

      let activeShopId = prof.shop_id;
      if (prof.role === 'superadmin') {
        activeShopId = localStorage.getItem('impersonated_shop_id');
      }
      setShopId(activeShopId);
      setAuthChecking(false);
    }
    checkAuth();
  }, []);

  // ─── Load Analytics Data ────────────────────────────────────────────────────

  const fetchAnalytics = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);

      // 0. Fetch Shop Details
      const { data: shopData } = await supabase
        .from('shops')
        .select('subscription_tier, upgrade_request')
        .eq('id', shopId)
        .single();
      const isPro = shopData?.subscription_tier === 'pro';
      setSubscriptionTier(isPro ? 'pro' : 'basic');
      setHasUpgradeRequest(shopData?.upgrade_request || false);

      // 1. Fetch Meja
      const { data: tablesData } = await supabase
        .from('tables')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      const tablesList: TableDB[] = tablesData ?? [];

      // 2. Fetch Pesanan Hari Ini
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shopId)
        .gt('created_at', startOfDay.toISOString());
      const ordersList: OrderDB[] = ordersData ?? [];

      // 3. Fetch Order Items Hari Ini
      const orderIds = ordersList.map((o) => o.id);
      let itemsList: any[] = [];
      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);
        itemsList = itemsData ?? [];
      }

      // 4. Hitung Pendapatan & Pesanan Lunas
      const paidOrders = ordersList.filter((o) => o.status === 'paid');
      const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total_price, 0);

      setRevenue(totalRevenue);
      setTotalOrdersCount(ordersList.length);
      setPaidOrdersCount(paidOrders.length);

      // 5. Analisis Menu Terlaris
      const menuMap: { [name: string]: { qty: number; sales: number } } = {};
      itemsList.forEach((item) => {
        if (!menuMap[item.menu_name]) {
          menuMap[item.menu_name] = { qty: 0, sales: 0 };
        }
        menuMap[item.menu_name].qty += item.quantity;
        menuMap[item.menu_name].sales += item.quantity * item.price;
      });

      const menuAnalyticsList: MenuAnalytic[] = Object.entries(menuMap)
        .map(([name, val]) => ({
          menuName: name,
          qty: val.qty,
          totalSales: val.sales,
        }))
        .sort((a, b) => b.qty - a.qty);

      setMenuAnalytics(menuAnalyticsList);

      // 6. Analisis Keterisian Meja
      const occupied: string[] = [];
      const finished: string[] = [];
      const empty: string[] = [];

      tablesList.forEach((tbl) => {
        const tblOrders = ordersList.filter(
          (o) => o.table_number.toLowerCase() === tbl.name.toLowerCase()
        );
        if (tblOrders.length === 0) {
          empty.push(tbl.name);
        } else {
          const hasPending = tblOrders.some((o) => o.status === 'pending');
          if (hasPending) {
            occupied.push(tbl.name);
          } else {
            finished.push(tbl.name);
          }
        }
      });

      setOccupiedTables(occupied);
      setFinishedTables(finished);
      setEmptyTables(empty);

      // 7. Pro Analytics
      if (isPro) {
        // A. Peak Hours
        const hourlyData: Record<string, { total: number; count: number }> = {};
        for (let i = 8; i <= 22; i++) {
          hourlyData[i.toString().padStart(2, '0') + ':00'] = { total: 0, count: 0 };
        }
        paidOrders.forEach((o) => {
          const h = new Date(o.created_at).getHours().toString().padStart(2, '0') + ':00';
          if (!hourlyData[h]) hourlyData[h] = { total: 0, count: 0 };
          hourlyData[h].total += o.total_price;
          hourlyData[h].count += 1;
        });
        setHourlySales(Object.entries(hourlyData).map(([hour, val]) => ({ hour, ...val })));

        // B. AOV & Success Rate
        setAov(paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0);
        
        const rejectedOrders = ordersList.filter(o => o.status === 'rejected').length;
        const totalResolved = paidOrders.length + rejectedOrders;
        setSuccessRate(totalResolved > 0 ? (paidOrders.length / totalResolved) * 100 : 0);

        // C. Loyalty
        const customers = paidOrders.filter(o => o.customer_name).map(o => o.customer_name!.toLowerCase().trim());
        const uniqueCustomers = new Set(customers);
        setTotalUniqueCustomers(uniqueCustomers.size);
        setRepeatCustomersCount(customers.length - uniqueCustomers.size);

        // D. Bottom Menus
        const bottom = [...menuAnalyticsList].sort((a, b) => a.qty - b.qty).slice(0, 3);
        setBottomMenus(bottom);
      }

    } catch (e) {
      console.error('[QREats] Gagal load analisis:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      fetchAnalytics();

      // Subscribe realtime pesanan & status untuk sinkronisasi laporan live
      const channel = supabase
        .channel('cashier-live-analytics')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchAnalytics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [shopId]);

  // ─── Upgrade Request Handler ────────────────────────────────────────────────
  const handleUpgradeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !upgradeReason.trim()) return;
    setIsSubmittingUpgrade(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({ upgrade_request: true, upgrade_reason: upgradeReason })
        .eq('id', shopId);
      
      if (error) throw error;
      setHasUpgradeRequest(true);
      setShowUpgradeModal(false);
      setUpgradeReason('');
      alert('Permintaan Upgrade berhasil dikirim! Silakan tunggu konfirmasi Superadmin.');
    } catch (err) {
      console.error('[QREats] Gagal mengirim upgrade request:', err);
      alert('Gagal mengirim permintaan. Silakan coba lagi.');
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  // ─── Guard Render ───────────────────────────────────────────────────────────

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-sans">
        <p className="text-sm text-[#1A1A1A]/60">Memeriksa kredensial kasir...</p>
      </div>
    );
  }

  if (accessDenied || !shopId) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <span className="block mb-4"><LockIcon className="w-12 h-12 text-[#1A1A1A] mx-auto" /></span>
          <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">Akses Dibatasi</h1>
          <p className="text-sm text-[#1A1A1A]/70">Halaman ini hanya untuk manajemen toko.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F2EB] min-h-screen font-sans">
      {/* Header */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white print:hidden">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Analisis Laporan Hari Ini</h2>
          <p className="text-xs text-[#1A1A1A]/60 mt-0.5">Monitoring penjualan harian, menu terlaris, dan keterisian meja secara langsung</p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-4 py-2 border border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-[#F5F2EB] text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Memuat...' : (
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Segarkan
            </span>
          )}
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pendapatan */}
          <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px]">
            <DollarSign className="absolute right-4 bottom-2 w-24 h-24 opacity-10 pointer-events-none" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Pendapatan Lunas (Hari Ini)</span>
            <p className="text-3xl font-black tracking-tight mt-2">{formatRupiah(revenue)}</p>
            <p className="text-[10px] text-emerald-200 mt-2 font-medium">Berdasarkan total pesanan berstatus paid</p>
          </div>

          {/* Transaksi Count */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <span className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-wider">Volume Pesanan</span>
            <div>
              <p className="text-3xl font-black text-[#1A1A1A] mt-2">{totalOrdersCount} Pesanan</p>
              <p className="text-[10px] text-[#1A1A1A]/60 mt-1">
                {paidOrdersCount} lunas · {totalOrdersCount - paidOrdersCount} aktif/pending
              </p>
            </div>
          </div>

          {/* Rerata Transaksi */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <span className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-wider">Rata-rata Transaksi</span>
            <div>
              <p className="text-3xl font-black text-[#1A1A1A] mt-2">
                {paidOrdersCount > 0 ? formatRupiah(revenue / paidOrdersCount) : formatRupiah(0)}
              </p>
              <p className="text-[10px] text-[#1A1A1A]/60 mt-1">Nilai rata-rata pembayaran dari pesanan lunas</p>
            </div>
          </div>
        </div>

        {/* Detailed Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Menu Terlaris Card */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-base">Menu Paling Terlaris</h3>
              <p className="text-xs text-[#1A1A1A]/60 mt-0.5">Daftar item hidangan yang paling sering dipesan hari ini</p>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="space-y-3 py-6 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-[#F5F2EB]/50 rounded-xl" />
                  ))}
                </div>
              ) : menuAnalytics.length === 0 ? (
                <div className="text-center py-16 text-[#1A1A1A]/60 space-y-2">
                  <span className="text-3xl block"><Utensils className="w-8 h-8 text-[#1A1A1A]/20" /></span>
                  <p className="text-xs font-semibold">Belum ada menu yang dipesan hari ini.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F2EB]/60 border-b border-[#1A1A1A]/5 text-[#1A1A1A]/60 font-bold">
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3">Nama Menu</th>
                      <th className="p-3 text-center">Jumlah</th>
                      <th className="p-3 text-right">Total Penjualan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuAnalytics.map((item, idx) => (
                      <tr key={idx} className="border-b border-[#1A1A1A]/5 last:border-b-0 hover:bg-[#F5F2EB]/10 transition-colors">
                        <td className="p-3 text-center font-bold text-[#1A1A1A]/45">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-bold text-[#1A1A1A]">
                          {item.menuName}
                        </td>
                        <td className="p-3 text-center font-bold text-[#1A1A1A]">
                          {item.qty} porsi
                        </td>
                        <td className="p-3 text-right font-semibold text-[#1A1A1A]/80">
                          {formatRupiah(item.totalSales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Analisis Meja Card */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-base">Status Penggunaan Meja</h3>
              <p className="text-xs text-[#1A1A1A]/60 mt-0.5">Analisis keterisian dan riwayat penggunaan meja hari ini</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-3 gap-3 animate-pulse py-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-[#F5F2EB]/50 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Meja Terisi (Occupied) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Sedang Terisi / Aktif ({occupiedTables.length})</h4>
                  </div>
                  {occupiedTables.length === 0 ? (
                    <p className="text-[11px] text-[#1A1A1A]/60 italic pl-4">Tidak ada meja terisi saat ini.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pl-4">
                      {occupiedTables.map((tbl, i) => (
                        <span key={i} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl">
                          {tbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meja Selesai (Finished) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Selesai Dipakai hari ini ({finishedTables.length})</h4>
                  </div>
                  {finishedTables.length === 0 ? (
                    <p className="text-[11px] text-[#1A1A1A]/60 italic pl-4">Belum ada meja selesai dipakai hari ini.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pl-4">
                      {finishedTables.map((tbl, i) => (
                        <span key={i} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
                          {tbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meja Kosong (Empty) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Belum Ditempati / Kosong ({emptyTables.length})</h4>
                  </div>
                  {emptyTables.length === 0 ? (
                    <p className="text-[11px] text-[#1A1A1A]/60 italic pl-4">Semua meja telah ditempati hari ini.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pl-4">
                      {emptyTables.map((tbl, i) => (
                        <span key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 text-xs font-semibold rounded-xl">
                          {tbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Pro Analytics Section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-black text-[#1A1A1A]">Analisis Lanjutan (Pro)</h2>
          </div>
          
          {subscriptionTier === 'pro' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 1. Peak Hours */}
              <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-[#1A1A1A]" />
                  <h3 className="font-bold text-[#1A1A1A]">Grafik Penjualan Per Jam</h3>
                </div>
                <div className="flex items-end gap-2 h-40 mt-4">
                  {hourlySales.map((item, idx) => {
                    const maxTotal = Math.max(...hourlySales.map(h => h.total), 1);
                    const heightPercent = (item.total / maxTotal) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-[#1A1A1A] text-white text-[10px] font-bold py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap transition-opacity z-10">
                          {formatRupiah(item.total)} ({item.count} order)
                        </div>
                        {/* Bar */}
                        <div 
                          className="w-full bg-[#1A1A1A] rounded-t-sm transition-all duration-500"
                          style={{ height: `${heightPercent}%`, minHeight: item.total > 0 ? '4px' : '0' }}
                        />
                        <span className="text-[9px] font-medium text-[#1A1A1A]/60 mt-2">{item.hour.split(':')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Top & Bottom Performers */}
              <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-[#1A1A1A]">Kinerja Menu</h3>
                </div>
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-amber-500" /> Bintang Utama (Top 3)</h4>
                    <div className="space-y-3">
                      {menuAnalytics.slice(0, 3).map((menu, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                          <span className="font-semibold text-[#1A1A1A] text-sm">{menu.menuName}</span>
                          <div className="text-right">
                            <span className="block font-bold text-emerald-700 text-sm">{menu.qty}x Terjual</span>
                            <span className="text-[10px] font-bold text-emerald-600/60">{formatRupiah(menu.totalSales)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-rose-500" /> Butuh Promosi (Bottom 3)</h4>
                    <div className="space-y-3">
                      {bottomMenus.length === 0 ? <p className="text-[11px] text-[#1A1A1A]/60 italic">Data belum cukup.</p> : bottomMenus.map((menu, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-rose-50/50 p-3 rounded-2xl border border-rose-100">
                          <span className="font-semibold text-[#1A1A1A] text-sm">{menu.menuName}</span>
                          <span className="font-bold text-rose-700 text-sm">{menu.qty}x Terjual</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Operational Metrics */}
              <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <DollarSign className="w-5 h-5 text-[#1A1A1A]" />
                  <h3 className="font-bold text-[#1A1A1A]">Finansial & Operasional</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-[#F5F2EB]/50 rounded-2xl border border-[#1A1A1A]/5">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest block mb-1">Rata-rata Uang Belanja Per Order (AOV)</span>
                    <span className="text-2xl font-black text-[#1A1A1A]">{formatRupiah(aov)}</span>
                  </div>
                  <div className="p-4 bg-[#F5F2EB]/50 rounded-2xl border border-[#1A1A1A]/5">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest block mb-1">Tingkat Kesuksesan Pesanan</span>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-[#1A1A1A]">{successRate.toFixed(1)}%</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A1A1A]" style={{ width: `${successRate}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Customer Loyalty */}
              <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-[#1A1A1A]" />
                  <h3 className="font-bold text-[#1A1A1A]">Loyalitas Pelanggan</h3>
                </div>
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-[#F5F2EB] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#1A1A1A]/10">
                    <Users className="w-8 h-8 text-[#1A1A1A]" />
                  </div>
                  <h4 className="text-3xl font-black text-[#1A1A1A] mb-1">{totalUniqueCustomers}</h4>
                  <p className="text-sm font-bold text-[#1A1A1A]/70 mb-6">Pelanggan Unik Hari Ini</p>
                  
                  <div className="bg-emerald-50 text-emerald-800 text-xs font-bold py-3 px-4 rounded-xl inline-flex items-center gap-2 border border-emerald-200">
                    <TrendingUp className="w-4 h-4" />
                    <span>{repeatCustomersCount} pesanan datang dari pelanggan yang melakukan <em>repeat order</em>.</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-[#1A1A1A] text-white rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
              <Crown className="w-32 h-32 text-white/5 absolute -right-6 -top-6 rotate-12" />
              <div className="relative z-10 max-w-md mx-auto">
                <Crown className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-2xl font-black mb-3">Tingkatkan ke Paket Pro</h3>
                <p className="text-white/80 text-sm mb-6 leading-relaxed">
                  Buka fitur analitik mendalam seperti grafik penjualan per jam, performa menu terlaris dan terbawah, rasio kesuksesan, serta metrik loyalitas pelanggan.
                </p>
                {hasUpgradeRequest ? (
                  <button disabled className="bg-white/20 text-white font-bold text-sm px-6 py-3 rounded-xl cursor-not-allowed">
                    Menunggu Persetujuan...
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-white text-[#1A1A1A] font-bold text-sm px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Hubungi Superadmin
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Modal Pengajuan Upgrade */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-[#1A1A1A]">Pengajuan Paket Pro</h3>
            </div>
            <p className="text-sm text-[#1A1A1A]/60 mb-6">
              Beri tahu Superadmin mengapa Anda membutuhkan fitur analitik lanjutan ini.
            </p>
            
            <form onSubmit={handleUpgradeRequest}>
              <textarea
                value={upgradeReason}
                onChange={(e) => setUpgradeReason(e.target.value)}
                placeholder="Cth: Kafe saya semakin ramai, saya butuh melihat grafik jam sibuk untuk mengatur jadwal karyawan..."
                className="w-full bg-[#F5F2EB]/50 border border-[#1A1A1A]/10 rounded-2xl p-4 text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/60 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] min-h-[120px] resize-none mb-6"
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3 px-4 bg-white border border-[#1A1A1A]/10 text-[#1A1A1A] text-sm font-bold rounded-xl hover:bg-[#F5F2EB] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpgrade || !upgradeReason.trim()}
                  className="flex-1 py-3 px-4 bg-[#1A1A1A] text-white text-sm font-bold rounded-xl hover:bg-[#1A1A1A]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingUpgrade ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
