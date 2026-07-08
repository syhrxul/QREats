'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';
import { LockIcon } from '../../../components/Icons';

interface TableDB {
  id: number;
  name: string;
  is_active: boolean;
}

interface OrderDB {
  id: string;
  table_number: string;
  total_price: number;
  status: 'pending' | 'paid';
  created_at: string;
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

  // ─── Guard Render ───────────────────────────────────────────────────────────

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-sans">
        <p className="text-sm text-[#1A1A1A]/40">Memeriksa kredensial kasir...</p>
      </div>
    );
  }

  if (accessDenied || !shopId) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <span className="block mb-4"><LockIcon className="w-12 h-12 text-[#1A1A1A] mx-auto" /></span>
          <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">Akses Dibatasi</h1>
          <p className="text-sm text-[#1A1A1A]/50">Halaman ini hanya untuk manajemen toko.</p>
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
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Monitoring penjualan harian, menu terlaris, dan keterisian meja secara langsung</p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-4 py-2 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Memuat...' : '🔄 Segarkan'}
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pendapatan */}
          <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px]">
            <div className="absolute right-4 bottom-2 text-7xl opacity-10 pointer-events-none">💰</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Pendapatan Lunas (Hari Ini)</span>
            <p className="text-3xl font-black tracking-tight mt-2">{formatRupiah(revenue)}</p>
            <p className="text-[10px] text-emerald-200 mt-2 font-medium">Berdasarkan total pesanan berstatus paid</p>
          </div>

          {/* Transaksi Count */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wider">Volume Pesanan</span>
            <div>
              <p className="text-3xl font-black text-[#1A1A1A] mt-2">{totalOrdersCount} Pesanan</p>
              <p className="text-[10px] text-[#1A1A1A]/40 mt-1">
                {paidOrdersCount} lunas · {totalOrdersCount - paidOrdersCount} aktif/pending
              </p>
            </div>
          </div>

          {/* Rerata Transaksi */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <span className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wider">Rata-rata Transaksi</span>
            <div>
              <p className="text-3xl font-black text-[#1A1A1A] mt-2">
                {paidOrdersCount > 0 ? formatRupiah(revenue / paidOrdersCount) : formatRupiah(0)}
              </p>
              <p className="text-[10px] text-[#1A1A1A]/40 mt-1">Nilai rata-rata pembayaran dari pesanan lunas</p>
            </div>
          </div>
        </div>

        {/* Detailed Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Menu Terlaris Card */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-base">Menu Paling Terlaris</h3>
              <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Daftar item hidangan yang paling sering dipesan hari ini</p>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="space-y-3 py-6 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-[#F5F2EB]/50 rounded-xl" />
                  ))}
                </div>
              ) : menuAnalytics.length === 0 ? (
                <div className="text-center py-16 text-[#1A1A1A]/30 space-y-2">
                  <span className="text-3xl block">🍽️</span>
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
              <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Analisis keterisian dan riwayat penggunaan meja hari ini</p>
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
                    <p className="text-[11px] text-[#1A1A1A]/30 italic pl-4">Tidak ada meja terisi saat ini.</p>
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
                    <p className="text-[11px] text-[#1A1A1A]/30 italic pl-4">Belum ada meja selesai dipakai hari ini.</p>
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
                    <p className="text-[11px] text-[#1A1A1A]/30 italic pl-4">Semua meja telah ditempati hari ini.</p>
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

      </main>
    </div>
  );
}
