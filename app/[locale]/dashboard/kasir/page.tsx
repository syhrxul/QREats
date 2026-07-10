'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Order, OrderItem } from './types';
import { playNotificationSound, initAndUnlockAudio } from './soundHelper';
import { formatRupiah } from './formatHelpers';
import { logWebsiteEvent } from '@/src/lib/logs';
import { confirmOrderPaid, rejectOrder, toggleOrderReady } from './dbOperations';
import OrderCard from './OrderCard';
import OrderDetailDrawer from './OrderDetailDrawer';
import ReceiptModal from './ReceiptModal';
import OrderList from './components/OrderList';
import KasirHeader from './components/KasirHeader';
import Toasts from './components/Toasts';
import { BellIcon } from '../../components/Icons';

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

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const updatePermissionStates = () => {
      const state = Notification.permission;
      setShowNotificationBanner(state === 'default');
      setIsNotificationBlocked(state === 'denied');
    };

    updatePermissionStates();

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

  const syncOneSignalTag = (id: string) => {
    if (typeof window === 'undefined') return;
    const doTag = (OS: any) => {
      try {
        OS.User.addTag('shop_id', id);
        console.log('OneSignal tag shop_id berhasil disinkronisasi:', id);
      } catch (e) {
        console.warn('Gagal set tag shop_id:', e);
      }
    };
    const OS = (window as any).OneSignal;
    if (OS && OS.User) {
      doTag(OS);
    } else {
      (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
      (window as any).OneSignalDeferred.push((OneSignalInstance: any) => doTag(OneSignalInstance));
    }
  };

  useEffect(() => {
    if (!shopId) return;
    syncOneSignalTag(shopId);
  }, [shopId]);

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

  async function handleEnableNotifications() {
    if (typeof window === 'undefined') return;

    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isAllowedDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'qr-eats-umber.vercel.app';

    try {
      const OS = (window as any).OneSignal;
      if (isAllowedDomain && OS && OS.Notifications) {
        // Minta izin via OneSignal SDK agar device terdaftar di push server OneSignal
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
        if (shopId) syncOneSignalTag(shopId);
        playNotificationSound();
      } else if (Notification.permission === 'denied') {
        setShowNotificationBanner(false);
        setIsNotificationBlocked(true);
      }
    } catch (err) {
      console.warn('Gagal memproses perizinan OneSignal:', err);
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
    const channel = supabase.channel(`orders-realtime-${Math.random()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
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
      void logWebsiteEvent('Order Lunas', `Pesanan ${orderId} ditandai lunas oleh kasir.`, 'success');
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
      void logWebsiteEvent('Order Ditolak', `Pesanan ${orderId} ditolak. Alasan: ${cleanReason}`, 'alert');
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
      void logWebsiteEvent('Order Siap', `Status kesiapan pesanan ${orderId} diubah menjadi ${!currentReady ? 'siap' : 'belum siap'}.`, 'info');
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
    <div className="bg-slate-50">
      <KasirHeader
        shopName={shopName}
        pendingCount={pendingCount}
        soundEnabled={soundEnabled}
        onToggleSound={(v) => { setSoundEnabled(v); localStorage.setItem('qreats_sound_enabled', String(v)); if (v) playNotificationSound(); }}
        onEnableNotifications={handleEnableNotifications}
      />

      {/* Banner Perizinan Notifikasi Desktop */}
      {showNotificationBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 font-sans animate-fade-in">
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
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 font-sans animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">Peringatan</span>
            <div>
              <p className="font-bold text-sm text-rose-800">Notifikasi Diblokir oleh Browser</p>
              <p className="text-xs text-rose-600 mt-1">Anda memblokir izin notifikasi untuk situs ini. Harap aktifkan kembali izin notifikasi melalui ikon gembok di bar alamat browser Anda agar suara pemberitahuan dapat berbunyi.</p>
            </div>
          </div>
        </div>
      )}

      <OrderList shopId={shopId} userRole={userRole} onSelect={(o) => setSelectedOrder(o)} playSound={() => { if (soundEnabled) playNotificationSound(); }} />

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

      <Toasts toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
