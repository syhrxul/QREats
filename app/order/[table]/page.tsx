'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { logWebsiteEvent } from '../../../src/lib/logs';
import { AlertIcon } from '../../components/Icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  description?: string | null;
  category?: string | null;
}

interface CartItem extends MenuItem {
  qty: number;
}

interface RecentOrder {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  receipt_path: string | null;
  customer_name: string | null;
  order_items?: { menu_name: string; quantity: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Format deterministik — tidak bergantung locale sistem
function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const thousands = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp\u00A0${thousands}`;
}

// Skeleton Card
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="h-40 bg-[#E8E4DC]" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-[#E8E4DC] rounded-full w-3/4" />
        <div className="h-3 bg-[#E8E4DC] rounded-full w-1/2" />
        <div className="h-4 bg-[#E8E4DC] rounded-full w-1/3 mt-1" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrderPage({ params }: { params: Promise<{ table: string }> }) {
  // `table` param adalah UUID token meja
  const [tableNumber, setTableNumber] = useState<string>('');
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>('');
  const [tokenError, setTokenError] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'menu' | 'history'>('menu');

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [menuError, setMenuError] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderStep, setOrderStep] = useState<'idle' | 'success'>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);
  
  // Data Pembeli
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // QRIS state
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [showNameError, setShowNameError] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const cartBarRef = useRef<HTMLDivElement>(null);

  // Recent Orders (30 Menit Terakhir) State
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  
  // Track files being uploaded per order in history tab
  const [historyUploadFiles, setHistoryUploadFiles] = useState<{ [orderId: string]: File }>({});
  const [historyUploadStatus, setHistoryUploadStatus] = useState<{ [orderId: string]: 'idle' | 'uploading' | 'done' | 'error' }>({});
  // Dynamic Tab Title
  useEffect(() => {
    document.title = shopName || 'QREats';
  }, [shopName]);

  // Load merchant QRIS image dynamically if exists
  useEffect(() => {
    if (shopId) {
      const { data } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(`qris/${shopId}.png`);
      
      if (data?.publicUrl) {
        setQrisUrl(`${data.publicUrl}?t=${Date.now()}`);
      } else {
        setQrisUrl(null);
      }
    }
  }, [shopId]);

  // ─── Validasi Token → cari nama meja ────────────────────────────────────────

  useEffect(() => {
    params.then(async (p) => {
      const token = decodeURIComponent(p.table);

      const { data, error } = await supabase
        .from('tables')
        .select('name, is_active, shop_id')
        .eq('token', token)
        .single();

      if (error || !data || !data.is_active) {
        setTokenError(true);
      } else {
        setTableNumber(data.name); // e.g. "Meja-01"
        setShopId(data.shop_id);
        
        // Ambil nama toko
        if (data.shop_id) {
          const { data: s } = await supabase
            .from('shops')
            .select('name')
            .eq('id', data.shop_id)
            .single();
          if (s) {
            setShopName(s.name);
          }
        }
      }
      setTokenLoading(false);
    });
  }, [params]);

  // ─── Fetch Menu ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!tableNumber || !shopId) return;
    async function fetchMenus() {
      setLoadingMenus(true);
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_available', true)
        .order('name', { ascending: true });

      if (error) {
        setMenuError('Gagal memuat menu. Pastikan koneksi internet kamu aktif.');
      } else {
        setMenus(data ?? []);
      }
      setLoadingMenus(false);
    }
    fetchMenus();
  }, [tableNumber, shopId]);

  // ─── Fetch Recent Orders (30 Menit Terakhir, Belum Lunas) ────────────────────

  const fetchRecentOrders = async () => {
    if (!tableNumber) return;
    setLoadingRecent(true);
    try {
      // Ambil order dalam 24 jam terakhir (today's orders)
      const dateLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, total_price, status, receipt_path, customer_name')
        .eq('table_number', tableNumber)
        .gt('created_at', dateLimit)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filtered = data ?? [];

      // Fetch items untuk tiap order
      const fullRecentOrders = await Promise.all(
        filtered.map(async (o) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('menu_name, quantity')
            .eq('order_id', o.id);
          return {
            ...o,
            order_items: items ?? [],
          };
        })
      );

      setRecentOrders(fullRecentOrders);
    } catch (e) {
      console.error('Gagal memuat pesanan terbaru:', e);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchRecentOrders();
    }
  }, [activeTab, tableNumber]);

  // ─── Category Filter ─────────────────────────────────────────────────────────

  const categories = ['Semua', ...Array.from(new Set(menus.map((m) => m.category ?? 'Lainnya')))];
  const filteredMenus =
    activeCategory === 'Semua'
      ? menus
      : menus.filter((m) => (m.category ?? 'Lainnya') === activeCategory);

  // ─── Cart Logic ──────────────────────────────────────────────────────────────

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Reset form error saat nama diketik
  useEffect(() => {
    if (customerName.trim()) {
      setShowNameError(false);
    }
  }, [customerName]);

  function addToCart(menu: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === menu.id);
      if (existing) return prev.map((c) => c.id === menu.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...menu, qty: 1 }];
    });
    setJustAdded(menu.id);
    setTimeout(() => setJustAdded(null), 600);
  }

  function removeFromCart(menuId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === menuId);
      if (!existing) return prev;
      if (existing.qty === 1) return prev.filter((c) => c.id !== menuId);
      return prev.map((c) => c.id === menuId ? { ...c, qty: c.qty - 1 } : c);
    });
  }

  function getQty(menuId: string): number {
    return cart.find((c) => c.id === menuId)?.qty ?? 0;
  }

  // ─── Checkout ────────────────────────────────────────────────────────────────

  async function handleCheckout() {
    if (cart.length === 0 || isSubmitting) return;

    // VALIDASI: Nama Pemesan Wajib Diisi
    if (!customerName.trim()) {
      setShowNameError(true);
      alert('Mohon isi Nama Pemesan terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_number: tableNumber,
          total_price: totalPrice,
          status: 'pending',
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          customer_email: customerEmail.trim() || null,
          payment_method: 'qris', // Selalu QRIS untuk menghindari sabotase
          shop_id: shopId,
        })
        .select('id')
        .single();

      if (orderError || !orderData) throw new Error(orderError?.message ?? 'Gagal membuat pesanan.');

      const newOrderId = orderData.id as string;

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(cart.map((item) => ({
          order_id: newOrderId,
          menu_id: item.id,
          menu_name: item.name,
          price: item.price,
          quantity: item.qty,
        })));

      if (itemsError) throw new Error(itemsError.message);

      void logWebsiteEvent('Order Baru Dibuat', `Pesanan baru dibuat pada meja ${tableNumber} untuk toko ${shopId}. Total ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPrice)}.`, 'info');

      // Kirim push notification ke kasir via OneSignal.
      // keepalive: true memastikan request tetap selesai meski pelanggan tutup tab setelah pesan.
      try {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            title: 'Pesanan Baru Masuk',
            message: `Pesanan dari ${tableNumber} (${customerName.trim()}) senilai ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPrice)}`,
            shopId: shopId,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? 'Gagal mengirim notifikasi');
          }
          void logWebsiteEvent('Notifikasi Dikirim', `Push notification berhasil dikirim untuk order ${newOrderId} di toko ${shopId}.`, 'success');
        }).catch(err => {
          console.warn('Gagal dispatch push notification:', err);
          void logWebsiteEvent('Notifikasi Gagal', `Push notification gagal untuk order ${newOrderId}: ${err.message || err}`, 'alert');
        });
      } catch (pushErr: any) {
        console.warn('Gagal memicu push notification:', pushErr);
        void logWebsiteEvent('Notifikasi Error', `Terjadi error saat memicu notifikasi order ${newOrderId}: ${pushErr.message || pushErr}`, 'alert');
      }

      setOrderId(newOrderId);
      setIsCartOpen(false);
      setOrderStep('success');
    } catch (err: unknown) {
      alert('❌ ' + (err instanceof Error ? err.message : 'Terjadi kesalahan.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Upload Bukti (Layar Checkout Sukses) ────────────────────────────────────

  async function handleUploadProof() {
    if (!uploadFile || !orderId) return;
    setUploadStatus('uploading');
    try {
      const ext = uploadFile.name.split('.').pop();
      const fileName = `order-${orderId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, uploadFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          receipt_path: fileName,
          status: 'pending'
        })
        .eq('id', orderId);
      if (updateError) throw updateError;

      setUploadStatus('done');
    } catch (err) {
      console.error('Gagal upload bukti bayar:', err);
      setUploadStatus('error');
    }
  }

  // ─── Upload Bukti dari Tab Riwayat (History Tab) ─────────────────────────────

  async function handleUploadProofFromHistory(targetOrderId: string) {
    const file = historyUploadFiles[targetOrderId];
    if (!file) return;

    setHistoryUploadStatus((prev) => ({ ...prev, [targetOrderId]: 'uploading' }));

    try {
      const ext = file.name.split('.').pop();
      const fileName = `order-${targetOrderId}-${Date.now()}.${ext}`;

      // 1. Upload ke Storage
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      // 2. Update Database
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          receipt_path: fileName,
          status: 'pending'
        })
        .eq('id', targetOrderId);
      if (updateError) throw updateError;

      setHistoryUploadStatus((prev) => ({ ...prev, [targetOrderId]: 'done' }));

      // Refresh list riwayat order
      await fetchRecentOrders();
    } catch (err) {
      console.error('Gagal upload bukti bayar dari riwayat:', err);
      setHistoryUploadStatus((prev) => ({ ...prev, [targetOrderId]: 'error' }));
    }
  }

  function handleDoneOrder() {
    setOrderStep('idle');
    setCart([]);
    setUploadFile(null);
    setUploadStatus('idle');
    setOrderId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setShowNameError(false);
  }

  // ─── Loading Token ────────────────────────────────────────────────────────────

  if (tokenLoading) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#1A1A1A]/20 border-t-[#1A1A1A] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#1A1A1A]/40">Memuat meja...</p>
        </div>
      </div>
    );
  }

  // ─── Token Invalid ────────────────────────────────────────────────────────────

  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9 9 0 0119.364 8.05M5.636 15.95A9 9 0 014.636 8.94M3 3l3.64 3.64" />
              <path d="M21 21l-3.64-3.64" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">QR Code Tidak Valid</h1>
          <p className="text-white/40 text-sm leading-relaxed">
            QR Code ini tidak dikenali atau sudah tidak aktif.
            <br />Minta staf untuk mendapatkan QR Code yang benar.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F2EB] font-sans">

      {/* Hero Header */}
      <header className="relative overflow-hidden bg-[#1A1A1A] text-white px-5 pt-10 pb-8">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17v3" />
                </svg>
              </div>
              <span className="font-bold text-base tracking-tight">QREats {shopName && `· ${shopName}`}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold text-white/80">
              {tableNumber}
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight mt-6 mb-1">Selamat Datang! 👋</h1>
          <p className="text-white/50 text-sm">Pilih menu favoritmu di {shopName || 'restoran kami'} dan biarkan kami siapkan pesananmu</p>
        </div>
      </header>

      {/* ── Tab Navigasi Menu vs Pesanan Saya ── */}
      <div className="sticky top-0 z-30 bg-[#F5F2EB] border-b border-[#1A1A1A]/10 px-4 pt-3 pb-0">
        <div className="max-w-lg mx-auto flex gap-6 text-sm font-bold justify-center">
          <button
            onClick={() => setActiveTab('menu')}
            className={`pb-3 px-2 border-b-2 transition-all ${
              activeTab === 'menu'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
            }`}
          >
            🍽️ Pesan Menu
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-2 border-b-2 transition-all relative ${
              activeTab === 'history'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60'
            }`}
          >
            🧾 Pesanan Saya
            {recentOrders.length > 0 && activeTab !== 'history' && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* ── TAB CONTENT: PESAN MENU ── */}
      {activeTab === 'menu' && (
        <>
          {/* Category Filter */}
          {!loadingMenus && menus.length > 0 && categories.length > 1 && (
            <div className="bg-[#F5F2EB]/95 backdrop-blur-sm border-b border-[#1A1A1A]/8 px-4 py-3 sticky top-[49px] z-20">
              <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto pb-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    id={`cat-${cat}`}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activeCategory === cat
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-white border border-[#1A1A1A]/10 text-[#1A1A1A]/50 hover:border-[#1A1A1A]/25'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Menu Grid */}
          <main className="max-w-lg mx-auto px-4 pt-5 pb-36">
            {loadingMenus && (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {!loadingMenus && menuError && (
              <div className="text-center py-24">
                <div className="flex justify-center mb-4"><AlertIcon className="w-12 h-12 text-amber-600" /></div>
                <p className="font-semibold text-[#1A1A1A] mb-1">Gagal Memuat Menu</p>
                <p className="text-sm text-[#1A1A1A]/50">{menuError}</p>
                <button onClick={() => window.location.reload()} className="mt-5 px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-xl">Coba Lagi</button>
              </div>
            )}

            {!loadingMenus && !menuError && filteredMenus.length === 0 && (
              <div className="text-center py-24 text-[#1A1A1A]/30">
                <div className="text-5xl mb-3">🍽️</div>
                <p className="font-medium">Belum ada menu tersedia</p>
                <p className="text-sm mt-1">Coba kategori lain</p>
              </div>
            )}

            {!loadingMenus && !menuError && filteredMenus.length > 0 && (
              <>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#1A1A1A]">
                    {activeCategory === 'Semua' ? 'Semua Menu' : activeCategory}
                  </h2>
                  <span className="text-xs text-[#1A1A1A]/40">{filteredMenus.length} item</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {filteredMenus.map((menu) => {
                    const qty = getQty(menu.id);
                    const isJustAdded = justAdded === menu.id;
                    return (
                      <div
                        key={menu.id}
                        className={`bg-white rounded-2xl overflow-hidden border transition-all duration-200 ${
                          isJustAdded ? 'border-[#1A1A1A]/40 shadow-md scale-[0.98]' : 'border-[#1A1A1A]/6 hover:shadow-sm hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="relative h-36 bg-[#F0EDE6] overflow-hidden">
                          {menu.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">🍴</div>
                          )}
                          {qty > 0 && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-[#1A1A1A] rounded-full flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold">{qty}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-[#1A1A1A] text-sm leading-snug line-clamp-2 mb-0.5">{menu.name}</h3>
                          {menu.description && (
                            <p className="text-[11px] text-[#1A1A1A]/40 line-clamp-1 mb-1.5">{menu.description}</p>
                          )}
                          <p className="text-sm font-bold text-[#1A1A1A] mb-3">
                            <span suppressHydrationWarning>{formatRupiah(menu.price)}</span>
                          </p>
                          {qty === 0 ? (
                            <button
                              id={`btn-add-${menu.id}`}
                              onClick={() => addToCart(menu)}
                              className="w-full py-2 bg-[#1A1A1A] text-white text-xs font-semibold rounded-xl hover:bg-[#333] active:scale-95 transition-all"
                            >
                              + Tambah
                            </button>
                          ) : (
                            <div className="flex items-center justify-between bg-[#F5F2EB] rounded-xl p-1">
                              <button id={`btn-remove-${menu.id}`} onClick={() => removeFromCart(menu.id)} className="w-8 h-8 flex items-center justify-center text-[#1A1A1A] font-bold text-base hover:bg-white rounded-lg transition-colors">−</button>
                              <span className="text-sm font-bold text-[#1A1A1A] min-w-[1.5rem] text-center">{qty}</span>
                              <button id={`btn-add-${menu.id}`} onClick={() => addToCart(menu)} className="w-8 h-8 bg-[#1A1A1A] flex items-center justify-center text-white font-bold text-base rounded-lg hover:bg-[#333] transition-colors">+</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </main>
        </>
      )}

      {/* ── TAB CONTENT: PESANAN SAYA ── */}
      {activeTab === 'history' && (
        <main className="max-w-lg mx-auto px-4 py-6">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">Daftar Pesanan Meja</h2>
          <p className="text-xs text-[#1A1A1A]/40 mb-5">Daftar semua pesanan meja ini dalam 24 jam terakhir</p>

          {loadingRecent ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-20 bg-white border border-[#1A1A1A]/6 rounded-2xl p-5">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-sm font-medium text-[#1A1A1A]">Belum ada riwayat pesanan</p>
              <p className="text-xs text-[#1A1A1A]/40 mt-1">Silakan melakukan pemesanan di tab &quot;Pesan Menu&quot;.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const isPaid = order.status === 'paid';
                const isRejected = order.status === 'rejected';
                const isUploaded = !!order.receipt_path && !isRejected;
                
                const fileForThisOrder = historyUploadFiles[order.id];
                const statusForThisOrder = historyUploadStatus[order.id] || 'idle';

                return (
                  <div key={order.id} className="bg-white border border-[#1A1A1A]/8 rounded-2xl p-4 shadow-sm space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-[#1A1A1A]/5 pb-2">
                      <div>
                        <p className="font-bold text-xs text-[#1A1A1A]/40">ID: #{order.id.slice(0, 8)}</p>
                        {order.customer_name && (
                          <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">Pemesan: {order.customer_name}</p>
                        )}
                      </div>
                      
                      {isPaid ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                          ✓ Lunas
                        </span>
                      ) : isRejected ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg">
                          ❌ Ditolak
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                          ⏳ Menunggu Verifikasi
                        </span>
                      )}
                    </div>

                    {/* Items */}
                    <div className="text-xs text-[#1A1A1A]/70 space-y-1">
                      {order.order_items?.map((it, idx) => (
                        <p key={idx}>• {it.quantity}x {it.menu_name}</p>
                      ))}
                    </div>

                    {/* Total Tagihan */}
                    <div className="flex justify-between items-baseline pt-2 border-t border-[#1A1A1A]/5">
                      <span className="text-[11px] text-[#1A1A1A]/40 font-bold uppercase tracking-wide">Total</span>
                      <span className="text-base font-bold text-[#1A1A1A]" suppressHydrationWarning>
                        {formatRupiah(order.total_price)}
                      </span>
                    </div>

                    {/* Area Upload Bukti Bayar */}
                    <div className="pt-2 border-t border-[#1A1A1A]/5">
                      {isPaid ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          <span>Pembayaran lunas, pesanan diproses</span>
                        </div>
                      ) : isRejected ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs space-y-1">
                            <p className="font-bold">❌ Bukti Transfer Ditolak Kasir</p>
                            <p className="font-sans leading-relaxed mt-0.5">{order.receipt_path}</p>
                          </div>
                          
                          <div className="space-y-2.5">
                            <p className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-wide">📎 Kirim Ulang Bukti Transfer Baru</p>
                            <label className="block cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setHistoryUploadFiles((prev) => ({ ...prev, [order.id]: file }));
                                  }
                                }}
                              />
                              <div className="border border-dashed border-[#1A1A1A]/20 rounded-xl p-3 text-center text-xs text-[#1A1A1A]/50 hover:bg-[#1A1A1A]/5 transition-colors">
                                {fileForThisOrder ? `🖼️ ${fileForThisOrder.name}` : 'Tap untuk melampirkan screenshot bukti baru'}
                              </div>
                            </label>

                            {fileForThisOrder && statusForThisOrder !== 'done' && (
                              <button
                                onClick={() => handleUploadProofFromHistory(order.id)}
                                disabled={statusForThisOrder === 'uploading'}
                                className="w-full py-2 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-all disabled:opacity-50"
                              >
                                {statusForThisOrder === 'uploading' ? 'Mengunggah...' : 'Kirim Bukti Bayar'}
                              </button>
                            )}

                            {statusForThisOrder === 'error' && (
                              <p className="text-[10px] text-red-500 font-bold text-center">Gagal upload. Silakan coba lagi.</p>
                            )}
                          </div>
                        </div>
                      ) : isUploaded ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          <span>Bukti transfer terkirim, menunggu verifikasi</span>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-wide"><AlertIcon className="w-3.5 h-3.5" /><span>Upload Bukti Transfer Sekarang</span></div>
                          <label className="block cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                  if (file) {
                                    setHistoryUploadFiles((prev) => ({ ...prev, [order.id]: file }));
                                  }
                                }}
                              />
                            <div className="border border-dashed border-[#1A1A1A]/20 rounded-xl p-3 text-center text-xs text-[#1A1A1A]/50 hover:bg-[#1A1A1A]/5 transition-colors">
                              {fileForThisOrder ? `🖼️ ${fileForThisOrder.name}` : '📎 Tap untuk melampirkan screenshot bukti transfer'}
                            </div>
                          </label>

                          {fileForThisOrder && statusForThisOrder !== 'done' && (
                            <button
                              onClick={() => handleUploadProofFromHistory(order.id)}
                              disabled={statusForThisOrder === 'uploading'}
                              className="w-full py-2 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-all disabled:opacity-50"
                            >
                              {statusForThisOrder === 'uploading' ? 'Mengunggah...' : 'Kirim Bukti Bayar'}
                            </button>
                          )}
                          
                          {statusForThisOrder === 'error' && (
                            <p className="text-[10px] text-red-500 font-bold text-center">Gagal upload. Silakan coba lagi.</p>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* Sticky Cart Bar */}
      {totalItems > 0 && activeTab === 'menu' && (
        <div
          ref={cartBarRef}
          className="fixed bottom-0 left-0 right-0 z-40 p-4 transition-all duration-300"
        >
          <div className="max-w-lg mx-auto">
            <button
              id="btn-open-cart"
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-[#1A1A1A] text-white rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-[#2a2a2a] active:scale-[0.98] transition-all shadow-2xl"
              style={{ boxShadow: '0 8px 32px rgba(26,26,26,0.35)' }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-[#1A1A1A] text-[9px] font-bold rounded-full flex items-center justify-center">{totalItems}</span>
                </div>
                <span className="font-semibold text-sm">Lihat Pesanan</span>
              </div>
              <span className="font-bold text-sm" suppressHydrationWarning>{formatRupiah(totalPrice)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${isCartOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsCartOpen(false)} />
        <div className={`absolute bottom-0 left-0 right-0 bg-[#F5F2EB] rounded-t-3xl shadow-2xl transition-transform duration-300 ${isCartOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#1A1A1A]/15 rounded-full" />
          </div>
          <div className="px-5 pb-8 pt-3">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-[#1A1A1A]">Pesanan Kamu</h3>
                <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{tableNumber}</p>
              </div>
              <button id="btn-close-cart" onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-full bg-[#1A1A1A]/8 flex items-center justify-center text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/15 transition-colors text-sm">✕</button>
            </div>

            {/* Cart Items */}
            <div className="space-y-2.5 mb-5 max-h-[25vh] overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F2EB] flex-shrink-0 overflow-hidden">
                    {item.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🍴</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1A1A1A] truncate">{item.name}</p>
                    <p className="text-xs text-[#1A1A1A]/40" suppressHydrationWarning>{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-lg border border-[#1A1A1A]/15 flex items-center justify-center text-[#1A1A1A] hover:bg-[#1A1A1A]/5 active:scale-90 transition-all text-base">−</button>
                    <span className="w-5 text-center text-sm font-bold text-[#1A1A1A]">{item.qty}</span>
                    <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white hover:bg-[#333] active:scale-90 transition-all text-base">+</button>
                  </div>
                  <p className="font-bold text-sm text-[#1A1A1A] w-16 text-right flex-shrink-0">
                    <span suppressHydrationWarning>{formatRupiah(item.price * item.qty)}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Form Identitas Pelanggan */}
            <div className="bg-white rounded-2xl p-4 mb-4 border border-[#1A1A1A]/5">
              <h4 className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-wide mb-3">Informasi Pelanggan</h4>
              <div className="space-y-2">
                <div>
                  <input
                    id="input-customer-name"
                    type="text"
                    placeholder="Nama Pemesan * (Wajib)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-[#F5F2EB] border rounded-xl text-xs text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20 transition-all ${
                      showNameError ? 'border-red-400 bg-red-50/20' : 'border-[#1A1A1A]/10'
                    }`}
                  />
                  {showNameError && (
                    <span className="text-[10px] text-red-500 font-semibold mt-1 block">Nama pemesan wajib diisi!</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    id="input-customer-phone"
                    type="tel"
                    placeholder="No. Telepon (Opsional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-xl text-xs text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20"
                  />
                  <input
                    id="input-customer-email"
                    type="email"
                    placeholder="Email (Opsional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-xl text-xs text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20"
                  />
                </div>
              </div>
            </div>

            {/* Subtotal */}
            <div className="bg-white rounded-2xl p-4 mb-4 border border-[#1A1A1A]/5">
              <div className="flex justify-between items-center text-xs text-[#1A1A1A]/50">
                <span>Subtotal ({totalItems} item)</span>
                <span suppressHydrationWarning>{formatRupiah(totalPrice)}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-[#1A1A1A]/6 flex justify-between items-center">
                <span className="font-semibold text-xs text-[#1A1A1A]">Total Pembayaran</span>
                <span className="text-base font-bold text-[#1A1A1A]" suppressHydrationWarning>{formatRupiah(totalPrice)}</span>
              </div>
            </div>

            <button
              id="btn-checkout"
              onClick={handleCheckout}
              disabled={isSubmitting}
              className="w-full py-4 bg-[#1A1A1A] text-white font-bold text-base rounded-2xl hover:bg-[#2a2a2a] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Memproses...</span>
                : '🛎️  Bayar Sekarang (QRIS)'
              }
            </button>
          </div>
        </div>
      </div>

      {/* Payment / Success Modal */}
      {orderStep === 'success' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-[#F9F6EE] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl overflow-y-auto max-h-[95vh]">
            
            {/* Header Success */}
            <div className="bg-[#1A1A1A] px-6 pt-6 pb-8 rounded-t-3xl text-center">
              <div className="w-14 h-14 bg-white rounded-2xl mx-auto mb-3 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h3 className="text-white font-bold text-xl">Pesanan Masuk!</h3>
              <p className="text-white/50 text-sm mt-1">Silakan selesaikan pembayaran QRIS</p>
            </div>

            <div className="px-6 pb-6 -mt-2">
              {/* Info Meja & Total */}
              <div className="bg-white rounded-2xl p-4 mb-4 border border-[#1A1A1A]/6">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-[#1A1A1A]/50">Meja</span>
                  <span className="font-bold text-[#1A1A1A]">{tableNumber}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-[#1A1A1A]/50">Pemesan</span>
                  <span className="font-semibold text-[#1A1A1A]">{customerName}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-[#1A1A1A]/5 pt-2">
                  <span className="text-[#1A1A1A]/50">Total Tagihan</span>
                  <span className="font-bold text-xl text-[#1A1A1A]" suppressHydrationWarning>{formatRupiah(totalPrice)}</span>
                </div>
              </div>

              {/* TAMPILAN QRIS */}
              <div className="bg-white border-2 border-dashed border-[#1A1A1A]/10 rounded-2xl px-6 py-6 text-center mb-4 space-y-3">
                <p className="font-bold text-[#1A1A1A] text-sm">QRIS Kafe</p>
                {qrisUrl ? (
                  <div className="flex justify-center max-w-[180px] mx-auto bg-white p-2 border border-[#1A1A1A]/10 rounded-xl">
                    <img 
                      src={qrisUrl} 
                      alt="QRIS Merchant" 
                      className="w-full object-contain" 
                      onError={() => setQrisUrl(null)}
                    />
                  </div>
                ) : (
                  <div className="text-6xl py-4">📱</div>
                )}
                <p className="text-xs text-[#1A1A1A]/40">Scan QR Code ini untuk membayar</p>
                <div className="bg-[#F5F2EB] rounded-xl px-4 py-2">
                  <p className="text-xs text-[#1A1A1A]/50">Nominal transfer</p>
                  <p className="font-bold text-lg text-[#1A1A1A]" suppressHydrationWarning>{formatRupiah(totalPrice)}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-[#1A1A1A]/60 mb-2 uppercase tracking-wide">Bukti Pembayaran</p>
                <label className="block cursor-pointer">
                  <input id="input-upload-receipt animate" type="file" accept="image/*" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                  <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${uploadFile ? 'border-[#1A1A1A]/30 bg-[#1A1A1A]/5' : 'border-[#1A1A1A]/15 hover:border-[#1A1A1A]/30'}`}>
                    {uploadFile
                      ? <div><div className="text-2xl mb-1">🖼️</div><p className="text-sm font-medium text-[#1A1A1A] truncate">{uploadFile.name}</p></div>
                      : <div><div className="text-2xl mb-1">📎</div><p className="text-sm font-medium text-[#1A1A1A]/60">Upload screenshot bukti transfer</p></div>
                    }
                  </div>
                </label>
                {uploadFile && uploadStatus !== 'done' && (
                  <button id="btn-upload-proof" onClick={handleUploadProof} disabled={uploadStatus === 'uploading'} className="w-full mt-2.5 py-3 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                    {uploadStatus === 'uploading' ? 'Mengunggah...' : 'Kirim Bukti Bayar'}
                  </button>
                )}
                {uploadStatus === 'done' && (
                  <div className="flex items-center justify-center gap-2 mt-2.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span className="text-sm font-medium text-emerald-700">Bukti berhasil dikirim!</span>
                  </div>
                )}
                {uploadStatus === 'error' && <p className="text-xs text-red-500 text-center mt-2 font-sans">Gagal upload. Coba lagi.</p>}
              </div>

              <button 
                id="btn-done" 
                onClick={handleDoneOrder} 
                disabled={uploadStatus !== 'done'}
                className="w-full py-3.5 border border-[#1A1A1A]/15 text-[#1A1A1A] text-sm font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#1A1A1A] text-white hover:bg-[#333] disabled:bg-[#F5F2EB] disabled:text-[#1A1A1A]/40 font-sans"
              >
                {uploadStatus === 'done' ? 'Selesai' : 'Wajib Unggah Bukti Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
