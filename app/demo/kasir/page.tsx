'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertIcon } from '../../components/Icons';
import { Bell, Coffee, Check, X, Clock, ArrowLeft, Camera } from 'lucide-react';

// Synthesize pleasant chime sound
function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);
    
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (err) {
    console.warn('Audio play blocked or failed:', err);
  }
}

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
  status: 'pending' | 'paid' | 'rejected';
  created_at: string;
  receipt_path?: string | null;
  customer_name?: string | null;
  is_ready: boolean;
  order_items: OrderItem[];
}

function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const thousands = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp\u00A0${thousands}`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '--:--';
  }
}

const now = new Date();
function minutesAgo(m: number) {
  return new Date(now.getTime() - m * 60000).toISOString();
}

const DUMMY_ORDERS: Order[] = [
  {
    id: 'demo-001', table_number: 'Meja 3', total_price: 67000, status: 'pending',
    created_at: minutesAgo(2), receipt_path: 'demo-receipt.jpg', customer_name: 'Andi', is_ready: false,
    order_items: [
      { id: 'i1', menu_name: 'Es Kopi Susu', quantity: 2, price: 18000 },
      { id: 'i2', menu_name: 'Nasi Goreng Spesial', quantity: 1, price: 25000 },
      { id: 'i3', menu_name: 'Kentang Goreng', quantity: 1, price: 15000 },
    ],
  },
  {
    id: 'demo-002', table_number: 'Meja 7', total_price: 45000, status: 'pending',
    created_at: minutesAgo(5), receipt_path: null, customer_name: 'Sari', is_ready: false,
    order_items: [
      { id: 'i4', menu_name: 'Mie Ayam Bakso', quantity: 1, price: 20000 },
      { id: 'i5', menu_name: 'Es Teh Manis', quantity: 2, price: 8000 },
      { id: 'i6', menu_name: 'Pisang Goreng', quantity: 1, price: 9000 },
    ],
  },
  {
    id: 'demo-003', table_number: 'Meja 1', total_price: 38000, status: 'paid',
    created_at: minutesAgo(15), receipt_path: 'demo-receipt-2.jpg', customer_name: 'Budi', is_ready: false,
    order_items: [
      { id: 'i7', menu_name: 'Ayam Geprek', quantity: 1, price: 22000 },
      { id: 'i8', menu_name: 'Es Jeruk', quantity: 2, price: 8000 },
    ],
  },
  {
    id: 'demo-004', table_number: 'Meja 5', total_price: 52000, status: 'pending',
    created_at: minutesAgo(8), receipt_path: 'demo-receipt-3.jpg', customer_name: null, is_ready: false,
    order_items: [
      { id: 'i9', menu_name: 'Nasi Uduk', quantity: 2, price: 15000 },
      { id: 'i10', menu_name: 'Teh Tarik', quantity: 2, price: 12000 },
    ],
  },
  {
    id: 'demo-005', table_number: 'Meja 2', total_price: 95000, status: 'paid',
    created_at: minutesAgo(25), receipt_path: 'demo-receipt-4.jpg', customer_name: 'Diana', is_ready: true,
    order_items: [
      { id: 'i11', menu_name: 'Steak Chicken', quantity: 2, price: 35000 },
      { id: 'i12', menu_name: 'Orange Juice', quantity: 2, price: 12500 },
    ],
  },
];

export default function DemoKasirPage() {
  const [orders, setOrders] = useState<Order[]>(DUMMY_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [tick, setTick] = useState(0);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const newOrder: Order = {
        id: 'demo-new-' + Date.now(), table_number: 'Meja 9', total_price: 42000, status: 'pending',
        created_at: new Date().toISOString(), receipt_path: null, customer_name: 'Pelanggan Baru', is_ready: false,
        order_items: [
          { id: 'new1', menu_name: 'Es Kopi Aren', quantity: 2, price: 16000 },
          { id: 'new2', menu_name: 'Roti Bakar Coklat', quantity: 1, price: 10000 },
        ],
      };
      setOrders((prev) => [newOrder, ...prev]);
      setNewOrderId(newOrder.id);

      // Play sound
      if (soundEnabledRef.current) {
        playNotificationSound();
      }

      // Add toast
      const toastText = `🛎️ Pesanan Baru (Demo): ${newOrder.table_number} (${newOrder.customer_name}) - Total ${formatRupiah(newOrder.total_price)}`;
      setToasts((prev) => [...prev, { id: newOrder.id, message: toastText }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter(t => t.id !== newOrder.id));
      }, 6000);

      setTimeout(() => setNewOrderId(null), 6000);
    }, 5000);

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  function handleConfirmPaid(orderId: string) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'paid' as const } : o)));
    setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, status: 'paid' as const } : prev);
  }

  function handleReject(orderId: string) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'rejected' as const } : o)));
    setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, status: 'rejected' as const } : prev);
  }

  function handleToggleReady(orderId: string) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, is_ready: !o.is_ready } : o)));
    setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, is_ready: !prev.is_ready } : prev);
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const activeOrders = orders.filter((o) => (o.status === 'pending' || !o.is_ready) && o.status !== 'rejected');

  return (
    <div className="min-h-screen bg-[#F5F2EB] font-sans">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎯</span>
          <div>
            <p className="font-bold text-xs">MODE DEMO — Dashboard Kasir</p>
            <p className="text-[10px] text-white/80">Semua data adalah simulasi. Tidak ada data nyata.</p>
          </div>
        </div>
        <Link href="/" className="bg-white text-orange-600 hover:bg-white/90 text-xs font-black px-4 py-2 rounded-xl transition-all shadow">← Kembali ke Beranda</Link>
      </div>

      {/* Header */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Daftar Antrean Order · Kafe Demo</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Realtime monitoring pesanan meja (simulasi)</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle Suara Notifikasi */}
          <button
            onClick={() => {
              const newVal = !soundEnabled;
              setSoundEnabled(newVal);
              if (newVal) {
                playNotificationSound();
              }
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${
              soundEnabled
                ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
            }`}
          >
            <span>{soundEnabled ? '🔊 Suara Aktif' : '🔇 Suara Mati'}</span>
          </button>

          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">{pendingCount} PENDING</span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live Monitor
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {activeOrders.length === 0 ? (
          <div className="text-center py-20 bg-white border border-[#1A1A1A]/8 rounded-3xl p-8 text-[#1A1A1A]/30">
            <p className="text-5xl mb-4">🛎️</p>
            <p className="text-base font-bold">Tidak ada antrean aktif</p>
            <p className="text-xs mt-1">Seluruh pesanan pelanggan sudah tersaji & lunas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {activeOrders.map((order) => {
              const orderTime = new Date(order.created_at).getTime();
              const isDelayed = order.status === 'pending' && (new Date().getTime() - orderTime) > 5 * 60 * 1000;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`bg-white border rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all duration-300 relative ${
                    isDelayed
                      ? 'border-red-500 shadow-red-50 shadow-md ring-1 ring-red-400/50'
                      : newOrderId === order.id
                      ? 'border-amber-400 shadow-amber-100 shadow-lg ring-2 ring-amber-300/50'
                      : 'border-[#1A1A1A]/8'
                  }`}
                >
                  <div className="absolute top-5 right-5 flex items-center gap-2">
                    {isDelayed && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-700 border border-red-300 animate-pulse">
                        PENDING &gt; 5 MIN
                      </span>
                    )}
                    {order.is_ready ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500 text-white border border-emerald-600">✓ SIAP SAJI</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#1A1A1A]/5 text-[#1A1A1A]/60 border border-[#1A1A1A]/10">SEDANG DIBUAT</span>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : order.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700 animate-pulse'
                    }`}>
                      {order.status === 'paid' ? 'Lunas' : order.status === 'rejected' ? 'Ditolak' : 'Pending'}
                    </span>
                  </div>
                <div className="mb-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    {newOrderId === order.id && (<span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">BARU</span>)}
                    <span className="font-bold text-[#1A1A1A] text-lg">{order.table_number}</span>
                    {order.customer_name && (<span className="text-sm font-semibold text-[#1A1A1A]/60">({order.customer_name})</span>)}
                  </div>
                  <p className="text-xs text-[#1A1A1A]/40">Jam: {formatTime(order.created_at)} · ID: #{order.id.slice(0, 8)}</p>
                </div>
                <div className="text-sm text-[#1A1A1A]/70 mb-3 flex items-center gap-1">
                  <span className="font-bold">{order.order_items.length} Menu:</span>
                  <span className="truncate">{order.order_items.map((item) => `${item.quantity}x ${item.menu_name}`).join(', ')}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#1A1A1A]/5">
                  <div>
                    <p className="text-[10px] text-[#1A1A1A]/40 uppercase font-bold tracking-wider">Total Tagihan</p>
                    <p className="text-lg font-black text-[#1A1A1A]">{formatRupiah(order.total_price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.receipt_path && (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Camera className="w-3 h-3" /> Ada Bukti Transfer
                      </span>
                    )}
                    <span className="text-xs text-[#1A1A1A]/40 font-semibold flex items-center gap-1">
                      Lihat Rincian
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </main>

      {/* Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-[#F9F6EE] shadow-2xl flex flex-col justify-between border-l border-[#1A1A1A]/10">
              <div className="px-6 py-5 bg-white border-b border-[#1A1A1A]/10 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Rincian Pesanan</h2>
                  <p className="text-xs text-[#1A1A1A]/40 mt-0.5">ID: #{selectedOrder.id}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#1A1A1A]/20 transition-colors">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                <div className="bg-white border border-[#1A1A1A]/10 rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xl font-black text-[#1A1A1A]">{selectedOrder.table_number}</p>
                      {selectedOrder.customer_name && (<p className="text-sm text-[#1A1A1A]/60 font-medium">{selectedOrder.customer_name}</p>)}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 ${
                      selectedOrder.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : selectedOrder.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedOrder.status === 'paid' ? <><Check className="w-3.5 h-3.5"/> Lunas</> : selectedOrder.status === 'rejected' ? <><X className="w-3.5 h-3.5"/> Ditolak</> : <><Clock className="w-3.5 h-3.5"/> Pending</>}
                    </span>
                  </div>
                  <p className="text-xs text-[#1A1A1A]/40">Waktu: {formatTime(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-wider mb-3">Detail Menu Pesanan</p>
                  <div className="space-y-2">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white border border-[#1A1A1A]/8 rounded-xl px-4 py-3">
                        <div>
                          <p className="font-semibold text-sm text-[#1A1A1A]">{item.menu_name}</p>
                          <p className="text-xs text-[#1A1A1A]/40">{item.quantity}x @ {formatRupiah(item.price)}</p>
                        </div>
                        <p className="font-bold text-sm text-[#1A1A1A]">{formatRupiah(item.quantity * item.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#1A1A1A] text-white rounded-2xl p-5 flex justify-between items-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/60">TOTAL TAGIHAN</p>
                  <p className="text-2xl font-black">{formatRupiah(selectedOrder.total_price)}</p>
                </div>
                {selectedOrder.receipt_path && (
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-wider mb-3">Bukti Transfer</p>
                    <div className="bg-white border border-[#1A1A1A]/10 rounded-2xl p-6 text-center">
                      <div className="w-20 h-20 bg-[#F5F2EB] rounded-xl flex items-center justify-center text-3xl mx-auto mb-2">📸</div>
                      <p className="text-xs text-[#1A1A1A]/40">Bukti transfer tersedia (demo)</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-[#1A1A1A]/10 bg-white space-y-3">
                {selectedOrder.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleConfirmPaid(selectedOrder.id)} className="py-3.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all">✓ Konfirmasi Lunas</button>
                    <button onClick={() => handleReject(selectedOrder.id)} className="py-3.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 active:scale-[0.98] transition-all">✕ Tolak</button>
                  </div>
                )}
                {selectedOrder.status === 'paid' && (
                  <button onClick={() => handleToggleReady(selectedOrder.id)} className={`w-full py-3.5 text-sm font-bold rounded-xl active:scale-[0.98] transition-all ${selectedOrder.is_ready ? 'bg-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-[#1A1A1A]/15' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                    {selectedOrder.is_ready ? '↩ Batalkan Siap Saji' : '🍽️ Tandai Siap Saji'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-[#1A1A1A] text-white border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 pointer-events-auto animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🛎️</span>
              <p className="text-xs font-bold">{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-white/60 hover:text-white text-xs font-bold bg-white/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
