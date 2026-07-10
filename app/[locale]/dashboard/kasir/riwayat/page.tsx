'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { AlertIcon, BellIcon } from '../../../components/Icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  menu_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  table_number: string;
  total_price: number;
  status: 'pending' | 'paid';
  created_at: string;
  receipt_path?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  is_ready?: boolean;
  order_items?: OrderItem[];
}

// ─── Deterministik Helpers (Mencegah Hydration Error) ──────────────────────────

function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const thousands = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp\u00A0${thousands}`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return '--:--';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KasirHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [updatingReadyId, setUpdatingReadyId] = useState<string | null>(null);
  
  // Detail Order (Rincian) Drawer State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Helper formatting date
  function getFriendlyDateLabel(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hari Ini - ' + date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin - ' + date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else {
      return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
  
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [shopId, setShopId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>('');

  // Load session & shop info
  useEffect(() => {
    async function loadUserShop() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('role, shop_id')
        .eq('id', session.user.id)
        .single();
      
      if (prof) {
        setUserRole(prof.role);
        setShopId(prof.shop_id);
        
        // Ambil nama toko
        if (prof.shop_id) {
          const { data: s } = await supabase
            .from('shops')
            .select('name')
            .eq('id', prof.shop_id)
            .single();
          if (s) {
            setShopName(s.name);
          }
        }
      }
    }
    loadUserShop();
  }, []);

  // Fetch order_items untuk satu order
  const fetchOrderItems = useCallback(async (orderId: string): Promise<OrderItem[]> => {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (error) {
      console.error(`[QREats] Gagal fetch items untuk order ${orderId}:`, error.message);
      return [];
    }
    return data ?? [];
  }, []);

  // Fetch semua orders
  const fetchOrders = useCallback(async () => {
    const isSuperadmin = userRole === 'superadmin';
    if (!shopId && !isSuperadmin) return;

    console.log('[QREats] Memulai fetch orders...');
    let query = supabase.from('orders').select('*');

    // Filter by shop_id only if NOT superadmin
    if (!isSuperadmin && shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[QREats] Gagal fetch orders:', error.message);
      setLoading(false);
      return;
    }

    console.log(`[QREats] Berhasil fetch ${data?.length || 0} orders, mengambil detail item...`);

    const ordersWithItems = await Promise.all(
      (data ?? []).map(async (o: Order) => {
        const items = await fetchOrderItems(o.id);
        console.log(`[QREats] Order ${o.id} (${o.table_number}) punya ${items.length} item.`);
        return {
          ...o,
          order_items: items,
        };
      })
    );

    setOrders(ordersWithItems);
    setLoading(false);
  }, [fetchOrderItems, shopId, userRole]);

  useEffect(() => {
    if (shopId || userRole === 'superadmin') {
      fetchOrders();
    }
  }, [fetchOrders, shopId, userRole]);

  // Realtime subscription
  useEffect(() => {
    const isSuperadmin = userRole === 'superadmin';
    if (!shopId && !isSuperadmin) return;

    const channel = supabase
      .channel('orders-realtime-history')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            if (!isSuperadmin && newOrder.shop_id !== shopId) return; 

            const items = await fetchOrderItems(newOrder.id);
            const fullOrder: Order = { ...newOrder, order_items: items };

            setOrders((prev) => [fullOrder, ...prev]);
            setNewOrderIds((prev) => new Set(prev).add(newOrder.id));

            setTimeout(() => {
              setNewOrderIds((prev) => {
                const next = new Set(prev);
                next.delete(newOrder.id);
                return next;
              });
            }, 6000);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new;
            
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updatedOrder.id
                  ? {
                      ...o,
                      status: updatedOrder.status,
                      receipt_path: updatedOrder.receipt_path,
                      customer_name: updatedOrder.customer_name,
                      customer_phone: updatedOrder.customer_phone,
                      customer_email: updatedOrder.customer_email,
                      is_ready: updatedOrder.is_ready,
                    }
                  : o
              )
            );

            setSelectedOrder((prev) => {
              if (prev && prev.id === updatedOrder.id) {
                return {
                  ...prev,
                  status: updatedOrder.status,
                  receipt_path: updatedOrder.receipt_path,
                  customer_name: updatedOrder.customer_name,
                  customer_phone: updatedOrder.customer_phone,
                  customer_email: updatedOrder.customer_email,
                  is_ready: updatedOrder.is_ready,
                };
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrderItems, shopId, userRole]);

  // Konfirmasi Lunas
  async function handleConfirmPaid(orderId: string) {
    setConfirmingId(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'paid' } : o))
      );
      
      setSelectedOrder((prev) => {
        if (prev && prev.id === orderId) {
          return { ...prev, status: 'paid' };
        }
        return prev;
      });
    }
    setConfirmingId(null);
  }

  // Tandai Sudah Jadi
  async function handleToggleReady(orderId: string, currentReady: boolean) {
    setUpdatingReadyId(orderId);
    const nextVal = !currentReady;
    const { error } = await supabase
      .from('orders')
      .update({ is_ready: nextVal })
      .eq('id', orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, is_ready: nextVal } : o))
      );
      
      setSelectedOrder((prev) => {
        if (prev && prev.id === orderId) {
          return { ...prev, is_ready: nextVal };
        }
        return prev;
      });
    }
    setUpdatingReadyId(null);
  }

  // Load URL Bukti Bayar dari Storage
  function handleLoadReceiptUrl(receiptPath: string) {
    const { data } = supabase.storage
      .from('payment-receipts')
      .getPublicUrl(receiptPath);
    if (data?.publicUrl) {
      setReceiptUrl(data.publicUrl);
    }
  }

  // Grouping function
  const groupOrdersByDay = (ordersList: Order[]) => {
    const groups: { [key: string]: Order[] } = {};
    ordersList.forEach((order) => {
      const dateKey = new Date(order.created_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(order);
    });
    return groups;
  };

  const groupedHistory = groupOrdersByDay(orders);
  const sortedDateKeys = Object.keys(groupedHistory).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Helper untuk render order card
  const renderOrderCard = (order: Order) => {
    const hasReceipt = !!order.receipt_path;
    return (
      <div
        key={order.id}
        onClick={() => setSelectedOrder(order)}
        className={`bg-white border rounded-xl p-5 cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transition-all duration-300 relative ${
          newOrderIds.has(order.id)
            ? 'border-amber-400 shadow-amber-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 ring-2 ring-amber-300/50'
            : 'border-slate-900/8'
        }`}
      >
        {/* Badge Status */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          {order.is_ready ? (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500 text-white border border-emerald-600">
              ✓ SIAP SAJI
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-900/5 text-slate-900/60 border border-slate-900/10">
              SEDANG DIBUAT
            </span>
          )}

          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
            order.status === 'paid'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {order.status === 'paid' ? 'Lunas' : 'Pending'}
          </span>
        </div>

        <div className="mb-2.5">
          <div className="flex items-center gap-2 mb-1">
            {newOrderIds.has(order.id) && (
              <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                BARU
              </span>
            )}
            <span className="font-bold text-slate-900 text-lg">{order.table_number}</span>
            {order.customer_name && (
              <span className="text-sm font-semibold text-slate-900/60">
                ({order.customer_name})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-900/40" suppressHydrationWarning>
            Jam: {formatTime(order.created_at)} · ID: #{order.id.slice(0, 8)}
          </p>
        </div>

        {/* Summary of items */}
        <div className="text-sm text-slate-900/70 mb-3 flex items-center gap-1">
          <span className="font-bold">{order.order_items?.length} Menu:</span>
          <span className="truncate">
            {order.order_items?.map((item) => `${item.quantity}x ${item.menu_name}`).join(', ')}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-900/5">
          <div>
            <p className="text-[10px] text-slate-900/40 uppercase font-bold tracking-wider">Total Tagihan</p>
            <p className="text-lg font-bold text-slate-900" suppressHydrationWarning>
              {formatRupiah(order.total_price)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasReceipt && (
              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                📸 Ada Bukti Transfer
              </span>
            )}
            <span className="text-xs text-slate-900/40 font-semibold flex items-center gap-1">
              Lihat Rincian
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50">
      {/* Header Info */}
      <div className="border-b border-slate-900/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Riwayat Transaksi {shopName && `· ${shopName}`}</h2>
          <p className="text-xs text-slate-900/40 mt-0.5">Semua riwayat pesanan pelanggan berdasarkan hari</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-900/8 rounded-xl p-8 text-slate-900/30">
            <p className="text-5xl mb-4">📜</p>
            <p className="text-base font-bold">Belum ada riwayat transaksi</p>
            <p className="text-xs mt-1">Semua transaksi yang masuk akan tercatat di sini.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDateKeys.map((dateKey) => (
              <div key={dateKey} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-widest pl-1" suppressHydrationWarning>
                    {getFriendlyDateLabel(dateKey)}
                  </span>
                  <div className="flex-1 h-[1px] bg-slate-900/10" />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {groupedHistory[dateKey].map((order) => renderOrderCard(order))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Drawer Rincian Pesanan (Slide-Over) ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedOrder(null)} />

          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-[#F9F6EE] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 flex flex-col justify-between border-l border-slate-900/10">
              
              {/* Drawer Header */}
              <div className="px-6 py-5 bg-white border-b border-slate-900/10 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Rincian Pesanan</h2>
                  <p className="text-xs text-slate-900/40 mt-0.5">ID: #{selectedOrder.id}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-slate-900/10 flex items-center justify-center text-slate-900 hover:bg-slate-900/20 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                
                {/* Status & Meja */}
                <div className="bg-white rounded-xl p-4 border border-slate-900/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900/40 uppercase tracking-wide">Meja Asal</span>
                    <span className="text-lg font-bold text-slate-900">{selectedOrder.table_number}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-900/5 pt-2">
                    <span className="text-xs font-bold text-slate-900/40 uppercase tracking-wide">Status Pembayaran</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      selectedOrder.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedOrder.status === 'paid' ? '✓ Lunas' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-900/5 pt-2">
                    <span className="text-xs font-bold text-slate-900/40 uppercase tracking-wide">Status Kesiapan</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      selectedOrder.is_ready ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {selectedOrder.is_ready ? '✓ Sudah Jadi' : 'Sedang Dibuat'}
                    </span>
                  </div>
                </div>

                {/* Data Pelanggan (Jika Diisi) */}
                <div className="bg-white rounded-xl p-4 border border-slate-900/5">
                  <h3 className="text-xs font-bold text-slate-900/40 uppercase tracking-wide mb-3">Informasi Pelanggan</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-900/50">Nama Pemesan</span>
                      <span className="font-semibold text-slate-900">{selectedOrder.customer_name || '-'}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-900/5 pt-2">
                      <span className="text-slate-900/50">No. Telepon</span>
                      <span className="font-semibold text-slate-900">{selectedOrder.customer_phone || '-'}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-900/5 pt-2">
                      <span className="text-slate-900/50">Email</span>
                      <span className="font-semibold text-slate-900 truncate max-w-[200px]">{selectedOrder.customer_email || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Item List Menu */}
                <div className="bg-white rounded-xl p-4 border border-slate-900/5">
                  <h3 className="text-xs font-bold text-slate-900/40 uppercase tracking-wide mb-3">Daftar Menu</h3>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div>
                          <p className="font-semibold text-slate-900">{item.menu_name}</p>
                          <p className="text-xs text-slate-900/40" suppressHydrationWarning>
                            {formatRupiah(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-bold text-slate-900 self-center" suppressHydrationWarning>
                          {formatRupiah(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-slate-900/10 pt-3 flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-900/40 uppercase tracking-wide">Total</span>
                      <span className="text-xl font-bold text-slate-900" suppressHydrationWarning>
                        {formatRupiah(selectedOrder.total_price)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bukti Transfer */}
                <div className="bg-white rounded-xl p-4 border border-slate-900/5">
                  <h3 className="text-xs font-bold text-slate-900/40 uppercase tracking-wide mb-3">Bukti Pembayaran</h3>
                  {selectedOrder.receipt_path ? (
                    <div className="space-y-3">
                      <div className="border border-slate-900/10 rounded-xl overflow-hidden bg-slate-50 flex justify-center p-2">
                        <button
                          onClick={() => handleLoadReceiptUrl(selectedOrder.receipt_path!)}
                          className="w-full relative group"
                        >
                          <p className="text-xs font-semibold text-amber-600 mb-1.5">Klik untuk Membuka Bukti Bayar 🔍</p>
                          <span className="text-xs text-slate-900/40 block truncate">{selectedOrder.receipt_path}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-xs text-amber-600 font-medium">Pembeli belum mengunggah bukti transfer.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="px-6 py-5 bg-white border-t border-slate-900/10 flex flex-col gap-2.5">
                {userRole !== 'superadmin' ? (
                  <div className="flex gap-2">
                    {/* Tombol Tandai Sudah Jadi */}
                    <button
                      onClick={() => handleToggleReady(selectedOrder.id, selectedOrder.is_ready || false)}
                      disabled={updatingReadyId === selectedOrder.id}
                      className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${
                        selectedOrder.is_ready
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900'
                      }`}
                    >
                      {updatingReadyId === selectedOrder.id
                        ? 'Memproses...'
                        : selectedOrder.is_ready
                        ? 'Kembalikan Sedang Dibuat'
                        : 'Tandai Sudah Jadi'}
                    </button>

                    {/* Tombol Konfirmasi Lunas */}
                    {selectedOrder.status === 'pending' && (
                      <button
                        onClick={() => handleConfirmPaid(selectedOrder.id)}
                        disabled={confirmingId === selectedOrder.id}
                        className="flex-1 py-3 bg-slate-900 hover:bg-[#333] active:scale-95 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 text-center"
                      >
                        {confirmingId === selectedOrder.id ? 'Memproses...' : '✓ Konfirmasi Lunas'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-center font-bold text-red-500 bg-red-50 border border-red-200 py-2.5 rounded-xl uppercase tracking-wide">
                    Mode Preview: Aksi dinonaktifkan
                  </p>
                )}

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-3 border border-slate-900/15 hover:bg-slate-900/5 text-slate-900 text-xs font-bold rounded-xl transition-colors text-center"
                >
                  Tutup Rincian
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Struk Bukti Bayar Zoom */}
      {receiptUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReceiptUrl(null)} />
          <div className="relative bg-[#F9F6EE] rounded-xl overflow-hidden max-w-sm w-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 border border-slate-900/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-900/10 bg-white">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Preview Struk</h3>
                <p className="text-[10px] text-slate-900/50 mt-0.5">{selectedOrder?.table_number}</p>
              </div>
              <button
                onClick={() => setReceiptUrl(null)}
                className="w-8 h-8 rounded-full bg-slate-900/10 flex items-center justify-center text-slate-900 hover:bg-slate-900/20 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 bg-white flex items-center justify-center min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptUrl}
                alt="Bukti Transfer"
                className="w-full h-auto object-contain max-h-[60vh] rounded-xl border border-slate-900/5"
              />
            </div>
            
            <div className="p-4 bg-slate-50 flex justify-end">
              <button
                onClick={() => setReceiptUrl(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
