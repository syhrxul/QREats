'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { Order, OrderItem } from './types';
import { playNotificationSound, initAndUnlockAudio } from './soundHelper';
import { formatRupiah } from './formatHelpers';
import { confirmOrderPaid, rejectOrder, toggleOrderReady } from './dbOperations';
import OrderCard from './OrderCard';
import OrderDetailDrawer from './OrderDetailDrawer';
import ReceiptModal from './ReceiptModal';

/**
 * Halaman Dashboard Utama Kasir untuk memantau pesanan real-time.
 * File ini kurang dari 200 baris dengan memisahkan sub-komponen dan helper.
 */
export default function KasirDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [updatingReadyId, setUpdatingReadyId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [shopId, setShopId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>('');
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tick, setTick] = useState(0);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [isNotificationBlocked, setIsNotificationBlocked] = useState(false);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

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

  // Sinkronisasi tag shop_id kasir ke OneSignal
  useEffect(() => {
    if (!shopId || typeof window === 'undefined') return;

    try {
      const OS = (window as any).OneSignal;
      if (OS && OS.User) {
        OS.User.addTag("shop_id", shopId);
      } else {
        (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
        (window as any).OneSignalDeferred.push(async function(OneSignalInstance: any) {
          OneSignalInstance.User.addTag("shop_id", shopId);
        });
      }
    } catch (err) {
      console.warn("Gagal sinkronisasi tag shop_id ke OneSignal:", err);
    }
  }, [shopId]);

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

  // Meminta izin notifikasi browser secara manual via OneSignal SDK global (atau fallback native jika HTTP bukan localhost)
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
        } else {
          // Fallback native jika HTTP atau SDK belum siap
          if ('Notification' in window) {
            await Notification.requestPermission();
          }
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
        console.warn("Gagal memproses perizinan OneSignal:", err);
      }
    }
  }

  // Muat preferensi suara dan atur timer render ulang berkala
  useEffect(() => {
    const saved = localStorage.getItem('qreats_sound_enabled');
    if (saved !== null) setSoundEnabled(saved === 'true');

    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Muat info sesi user dan toko
  useEffect(() => {
    async function loadUserShop() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: prof } = await supabase.from('profiles').select('role, shop_id').eq('id', session.user.id).single();
      if (prof) {
        setUserRole(prof.role);
        setShopId(prof.shop_id);
        if (prof.shop_id) {
          const { data: s } = await supabase.from('shops').select('name').eq('id', prof.shop_id).single();
          if (s) setShopName(s.name);
        }
      }
    }
    loadUserShop();
  }, []);

  // Ambil detail items untuk satu order
  const fetchOrderItems = useCallback(async (orderId: string): Promise<OrderItem[]> => {
    const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    return error ? [] : (data ?? []);
  }, []);

  // Ambil data antrean pesanan dari database
  const fetchOrders = useCallback(async () => {
    const isSuperadmin = userRole === 'superadmin';
    if (!shopId && !isSuperadmin) return;
    let query = supabase.from('orders').select('*');
    if (!isSuperadmin && shopId) query = query.eq('shop_id', shopId);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) {
      setLoading(false);
      return;
    }
    const ordersWithItems = await Promise.all((data ?? []).map(async (o: Order) => ({
      ...o,
      order_items: await fetchOrderItems(o.id),
    })));
    setOrders(ordersWithItems);
    setLoading(false);
  }, [fetchOrderItems, shopId, userRole]);

  useEffect(() => {
    if (shopId || userRole === 'superadmin') fetchOrders();
  }, [fetchOrders, shopId, userRole]);

  // Listener Real-time Supabase untuk mendeteksi order masuk/update instan
  useEffect(() => {
    const isSuperadmin = userRole === 'superadmin';
    if (!shopId && !isSuperadmin) return;
    const channel = supabase.channel('orders-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
      async (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newOrder = payload.new;
          if (!isSuperadmin && newOrder.shop_id !== shopId) return;
          const items = await fetchOrderItems(newOrder.id);
          const fullOrder: Order = { ...newOrder, order_items: items };
          setOrders((prev) => [fullOrder, ...prev]);
          setNewOrderIds((prev) => new Set(prev).add(newOrder.id));
          if (soundEnabledRef.current) playNotificationSound();
          
          // Kirim notifikasi sistem/window jika diizinkan
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification("Pesanan Baru Masuk", {
                body: `${newOrder.table_number}${newOrder.customer_name ? ` (${newOrder.customer_name})` : ''} - Total ${formatRupiah(newOrder.total_price)}`,
              });
            } catch (err) {
              console.warn("Gagal mengirim notifikasi window:", err);
            }
          }
          
          const toastText = `Pesanan Baru: ${newOrder.table_number}${newOrder.customer_name ? ` (${newOrder.customer_name})` : ''} - ${formatRupiah(newOrder.total_price)}`;
          setToasts((prev) => [...prev, { id: newOrder.id, message: toastText }]);
          setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== newOrder.id)), 6000);
          setTimeout(() => setNewOrderIds((prev) => { const next = new Set(prev); next.delete(newOrder.id); return next; }), 6000);
        } else if (payload.eventType === 'UPDATE') {
          const updatedOrder = payload.new;
          setOrders((prev) => prev.map((o) => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
          setSelectedOrder((prev) => prev && prev.id === updatedOrder.id ? { ...prev, ...updatedOrder } : prev);
        }
      }
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrderItems, shopId, userRole]);

  // Handler konfirmasi lunas
  async function handleConfirmPaidClick(orderId: string) {
    setConfirmingId(orderId);
    const success = await confirmOrderPaid(orderId);
    if (success) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'paid' } : o)));
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: 'paid' } : prev));
    }
    setConfirmingId(null);
  }

  // Handler tolak bukti
  async function handleRejectPromptClick(orderId: string) {
    const reason = prompt('Masukkan alasan penolakan pesanan ini:');
    if (reason === null) return;
    const cleanReason = reason.trim() || 'Pembayaran tidak sesuai / bukti transfer tidak valid.';
    setConfirmingId(orderId);
    const success = await rejectOrder(orderId, cleanReason);
    if (success) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'rejected', receipt_path: cleanReason } : o)));
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, status: 'rejected', receipt_path: cleanReason } : prev));
      alert('Pesanan berhasil ditolak.');
    }
    setConfirmingId(null);
  }

  // Handler kesiapan dapur
  async function handleToggleReadyClick(orderId: string, currentReady: boolean) {
    setUpdatingReadyId(orderId);
    const success = await toggleOrderReady(orderId, currentReady);
    if (success) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, is_ready: !currentReady } : o)));
      setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, is_ready: !currentReady } : prev));
    }
    setUpdatingReadyId(null);
  }

  // Ambil URL public untuk zoom bukti bayar
  function handleLoadReceiptUrl(receiptPath: string) {
    const { data } = supabase.storage.from('payment-receipts').getPublicUrl(receiptPath);
    if (data?.publicUrl) setReceiptUrl(data.publicUrl);
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const activeOrders = orders.filter((o) => (o.status === 'pending' || !o.is_ready) && o.status !== 'rejected');

  return (
    <div className="bg-[#F5F2EB]">
      {/* Header Info */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Daftar Antrean Order {shopName && `· ${shopName}`}</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Realtime monitoring pesanan meja</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const newVal = !soundEnabled;
              setSoundEnabled(newVal);
              localStorage.setItem('qreats_sound_enabled', String(newVal));
              if (newVal) {
                playNotificationSound();
                // Minta izin akses notifikasi jika belum dikonfigurasi
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
              <p className="font-bold text-sm text-amber-800">Aktifkan Notifikasi</p>
              <p className="text-xs text-amber-600 mt-1">Izinkan notifikasi agar Anda mendapatkan pemberitahuan suara dan pop-up saat ada pesanan baru masuk</p>
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
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-white/60 rounded-2xl animate-pulse" />)}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-20 bg-white border border-[#1A1A1A]/8 rounded-3xl p-8 text-[#1A1A1A]/30">
            <p className="text-5xl mb-4">Kotak</p>
            <p className="text-base font-bold">Tidak ada antrean aktif</p>
            <p className="text-xs mt-1">Seluruh pesanan pelanggan sudah tersaji dan lunas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} newOrderIds={newOrderIds} onClick={() => setSelectedOrder(order)} />
            ))}
          </div>
        )}
      </main>

      {/* Drawer Rincian */}
      {selectedOrder && (
        <OrderDetailDrawer
          selectedOrder={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          userRole={userRole}
          updatingReadyId={updatingReadyId}
          confirmingId={confirmingId}
          onToggleReady={() => handleToggleReadyClick(selectedOrder.id, selectedOrder.is_ready || false)}
          onConfirmPaid={() => handleConfirmPaidClick(selectedOrder.id)}
          onReject={() => handleRejectPromptClick(selectedOrder.id)}
          onLoadReceipt={handleLoadReceiptUrl}
        />
      )}

      {/* Zoom Bukti */}
      {receiptUrl && (
        <ReceiptModal receiptUrl={receiptUrl} tableNumber={selectedOrder?.table_number} onClose={() => setReceiptUrl(null)} />
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
