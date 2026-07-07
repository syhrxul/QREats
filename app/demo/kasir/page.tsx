'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Order } from './types';
import { playNotificationSound, initAndUnlockAudio } from '../../dashboard/kasir/soundHelper';
import { formatRupiah } from '../../dashboard/kasir/formatHelpers';
import DemoOrderCard from './DemoOrderCard';
import DemoOrderDetailDrawer from './DemoOrderDetailDrawer';

const now = new Date();
function minutesAgo(m: number) {
  return new Date(now.getTime() - m * 60000).toISOString();
}

// Data simulasi pesanan pelanggan
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

/**
 * Halaman utama Demo Kasir dengan data dummy (tidak bergantung Supabase/login).
 * File ini kurang dari 200 baris dengan memecah sub-komponen kartu dan laci detail.
 */
export default function DemoKasirPage() {
  const [orders, setOrders] = useState<Order[]>(DUMMY_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [tick, setTick] = useState(0);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const [isNotificationBlocked, setIsNotificationBlocked] = useState(false);

  // Periksa status izin notifikasi saat dimuat dan dengarkan perubahannya secara real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const updatePermissionStates = () => {
      const state = Notification.permission;
      setShowNotificationBanner(state === 'default');
      setIsNotificationBlocked(state === 'denied');
    };

    // Jalankan pengecekan awal
    updatePermissionStates();

    // Dengarkan perubahan izin jika didukung oleh browser
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' as any }).then((permissionStatus) => {
        permissionStatus.onchange = () => {
          updatePermissionStates();
        };
      }).catch((err) => {
        console.warn("navigator.permissions query notifikasi tidak didukung:", err);
      });
    }
  }, []);

  // Periksa status inisialisasi OneSignal secara global untuk sinkronisasi UI
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const OS = (window as any).OneSignal;
    if (OS && OS.Notifications) {
      const isPermissionDefault = Notification.permission === 'default';
      setShowNotificationBanner(isPermissionDefault);
      setIsNotificationBlocked(Notification.permission === 'denied');
    }
  }, []);

  // Unlock AudioContext pada interaksi pertama (click/touchstart)
  useEffect(() => {
    const handleGesture = () => {
      initAndUnlockAudio();
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
    window.addEventListener('click', handleGesture);
    window.addEventListener('touchstart', handleGesture);
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, []);

  // Meminta izin notifikasi browser secara manual (via OneSignal jika aktif, atau fallback native)
  async function handleEnableNotifications() {
    if (typeof window !== 'undefined') {
      const isSecure = 
        window.location.protocol === 'https:' || 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1';

      try {
        const OS = (window as any).OneSignal;
        if (isSecure && OS && OS.Notifications) {
          await OS.Notifications.requestPermission();
        } else if ('Notification' in window) {
          await Notification.requestPermission();
        }
        if (Notification.permission === 'granted') {
          setShowNotificationBanner(false);
          setIsNotificationBlocked(false);
          playNotificationSound();
        } else if (Notification.permission === 'denied') {
          setShowNotificationBanner(false);
          setIsNotificationBlocked(true);
        }
      } catch (err) {
        console.warn("Gagal memproses perizinan notifikasi:", err);
      }
    }
  }

  useEffect(() => {
    // Minta izin akses notifikasi sistem/window saat pertama kali dibuka
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Simulasi pesanan baru masuk setelah 5 detik
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
      if (soundEnabledRef.current) playNotificationSound();

      // Kirim notifikasi sistem/window jika diizinkan
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification("Pesanan Baru Masuk (Demo)", {
            body: `${newOrder.table_number} (${newOrder.customer_name}) - Total ${formatRupiah(newOrder.total_price)}`,
          });
        } catch (err) {
          console.warn("Gagal mengirim notifikasi window:", err);
        }
      }

      const toastText = `Pesanan Baru (Demo): ${newOrder.table_number} (${newOrder.customer_name}) - Total ${formatRupiah(newOrder.total_price)}`;
      setToasts((prev) => [...prev, { id: newOrder.id, message: toastText }]);
      setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== newOrder.id)), 6000);
      setTimeout(() => setNewOrderId(null), 6000);
    }, 5000);

    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { clearTimeout(timer); clearInterval(interval); };
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
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-bold text-xs">MODE DEMO - Dashboard Kasir</p>
            <p className="text-[10px] text-white/80">Semua data adalah simulasi. Tidak ada data nyata.</p>
          </div>
        </div>
        <Link href="/" className="bg-white text-orange-600 hover:bg-white/90 text-xs font-black px-4 py-2 rounded-xl transition-all shadow">Kembali ke Beranda</Link>
      </div>

      {/* Header */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Daftar Antrean Order · Kafe Demo</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Realtime monitoring pesanan meja (simulasi)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const newVal = !soundEnabled;
              setSoundEnabled(newVal);
              if (newVal) {
                playNotificationSound();
                // Minta izin akses notifikasi sistem jika belum dikonfigurasi
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                  Notification.requestPermission();
                }
              }
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${
              soundEnabled ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
            }`}
          >
            <span>{soundEnabled ? 'Suara Notifikasi: Aktif' : 'Suara Notifikasi: Mati'}</span>
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

      {/* Banner Perizinan Notifikasi Desktop */}
      {showNotificationBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-sans animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">Notifikasi</span>
            <div>
              <p className="font-bold text-sm text-amber-800">Aktifkan Notifikasi Desktop</p>
              <p className="text-xs text-amber-600 mt-1">Izinkan notifikasi agar Anda mendapatkan pemberitahuan suara dan pop-up saat ada pesanan baru masuk seperti pada aplikasi WhatsApp.</p>
            </div>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow flex-shrink-0 cursor-pointer"
          >
            Aktifkan Notifikasi
          </button>
        </div>
      )}

      {/* Banner Notifikasi Diblokir */}
      {isNotificationBlocked && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm font-sans animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">Peringatan</span>
            <div>
              <p className="font-bold text-sm text-rose-800">Notifikasi Diblokir oleh Browser</p>
              <p className="text-xs text-rose-600 mt-1">Anda memblokir izin notifikasi untuk situs ini. Harap aktifkan kembali izin notifikasi melalui ikon gembok di bar alamat browser Anda agar suara pemberitahuan dapat berbunyi.</p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {activeOrders.length === 0 ? (
          <div className="text-center py-20 bg-white border border-[#1A1A1A]/8 rounded-3xl p-8 text-[#1A1A1A]/30">
            <p className="text-base font-bold">Tidak ada antrean aktif</p>
            <p className="text-xs mt-1">Seluruh pesanan pelanggan sudah tersaji dan lunas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {activeOrders.map((order) => (
              <DemoOrderCard key={order.id} order={order} newOrderId={newOrderId} onClick={() => setSelectedOrder(order)} />
            ))}
          </div>
        )}
      </main>

      {/* Drawer */}
      {selectedOrder && (
        <DemoOrderDetailDrawer
          selectedOrder={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirmPaid={() => handleConfirmPaid(selectedOrder.id)}
          onReject={() => handleReject(selectedOrder.id)}
          onToggleReady={() => handleToggleReady(selectedOrder.id)}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div key={t.id} className="bg-[#1A1A1A] text-white border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 pointer-events-auto animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold">{t.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-white/60 hover:text-white text-xs font-bold bg-white/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
