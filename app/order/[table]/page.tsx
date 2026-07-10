'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../src/lib/supabase';
import useToast from '../../hooks/useToast';
import ToastContainer from '../../components/Toast';
import { MenuItem } from './types';
import { formatRupiah } from './utils';
import { MenuGrid } from './_components/MenuGrid';
import { CartDrawer } from './_components/CartDrawer';
import { PaymentModal } from './_components/PaymentModal';
import { useCart } from './_hooks/useCart';
import { useOrder } from './_hooks/useOrder';
import { FeedbackModal } from './_components/FeedbackModal';
import { Coffee, AlertCircle, RefreshCw, Upload, CheckCircle, Clock, MessageSquare } from 'lucide-react';

interface RecentOrder {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  receipt_path: string | null;
  customer_name: string | null;
  order_items?: { menu_name: string; quantity: number }[];
}

export default function OrderPage({ params }: { params: Promise<{ table: string }> }) {
  const unwrappedParams = use(params);
  
  const [tableNumber, setTableNumber] = useState<string>('');
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>('');
  const [tokenError, setTokenError] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'menu' | 'history'>('menu');

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [menuError, setMenuError] = useState('');
  
  const [activeCategory, setActiveCategory] = useState<string>('Semua');

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showNameError, setShowNameError] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Recent Orders State
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  
  // Track files being uploaded per order in history tab
  const [historyUploadFiles, setHistoryUploadFiles] = useState<{ [orderId: string]: File }>({});
  const [historyUploadStatus, setHistoryUploadStatus] = useState<{ [orderId: string]: 'idle' | 'uploading' | 'done' | 'error' }>({});
  
  const { toasts, addToast, removeToast } = useToast();

  const {
    cart,
    addToCart,
    removeFromCart,
    getQty,
    clearCart,
    totalItems,
    totalPrice,
    justAdded,
  } = useCart();

  const {
    isSubmitting,
    orderStep,
    checkoutTotal,
    uploadFile,
    setUploadFile,
    uploadStatus,
    handleCheckout,
    handleUploadProof,
    handleDoneOrder
  } = useOrder();

  // QRIS state
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);

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

  // Validasi Token
  useEffect(() => {
    async function init() {
      const token = decodeURIComponent(unwrappedParams.table);
      const { data, error } = await supabase
        .from('tables')
        .select('name, is_active, shop_id')
        .eq('token', token)
        .single();

      if (error || !data || !data.is_active) {
        setTokenError(true);
      } else {
        setTableNumber(data.name);
        setShopId(data.shop_id);
        
        if (data.shop_id) {
          const { data: s } = await supabase
            .from('shops')
            .select('name, is_active, trial_ends_at')
            .eq('id', data.shop_id)
            .single();
          if (s) {
            setShopName(s.name);
            const isTrialActive = new Date(s.trial_ends_at) > new Date();
            if (!s.is_active || !isTrialActive) {
              setTokenError(true);
            }
          }
        }
      }
      setTokenLoading(false);
    }
    init();
  }, [unwrappedParams]);

  // Fetch Menu
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

  // Fetch Recent Orders
  const fetchRecentOrders = async () => {
    if (!tableNumber) return;
    setLoadingRecent(true);
    try {
      const dateLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, total_price, status, receipt_path, customer_name')
        .eq('table_number', tableNumber)
        .gt('created_at', dateLimit)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const filtered = data ?? [];
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

  // Category Filter
  const categories = ['Semua', ...Array.from(new Set(menus.map((m) => m.category ?? 'Lainnya')))];
  const filteredMenus =
    activeCategory === 'Semua'
      ? menus
      : menus.filter((m) => (m.category ?? 'Lainnya') === activeCategory);

  // Reset form error saat nama diketik
  useEffect(() => {
    if (customerName.trim()) {
      setShowNameError(false);
    }
  }, [customerName]);

  // Upload History Receipt
  async function handleHistoryUpload(orderIdToUpdate: string) {
    const file = historyUploadFiles[orderIdToUpdate];
    if (!file) return;

    setHistoryUploadStatus(prev => ({ ...prev, [orderIdToUpdate]: 'uploading' }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderIdToUpdate}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('orders')
        .update({ receipt_path: publicUrl, status: 'pending' })
        .eq('id', orderIdToUpdate);

      if (updateError) throw updateError;

      setHistoryUploadStatus(prev => ({ ...prev, [orderIdToUpdate]: 'done' }));
      addToast('Bukti transfer berhasil diupload.', 'success');
      fetchRecentOrders();
    } catch (e: any) {
      setHistoryUploadStatus(prev => ({ ...prev, [orderIdToUpdate]: 'error' }));
      addToast(e.message || 'Gagal upload. Coba lagi.', 'error');
    }
  }

  // Wrapper for Checkout
  const doCheckout = () => {
    if (!customerName.trim()) {
      setShowNameError(true);
      addToast('Mohon isi Nama Pemesan terlebih dahulu.', 'error');
      return;
    }

    handleCheckout({
      tableNumber,
      totalPrice,
      customerName,
      customerPhone,
      customerEmail,
      shopId: shopId || '',
      cart
    }, () => {
        addToast('Pesanan berhasil dibuat!', 'success');
        clearCart();
        setIsCartOpen(false);
    }, (msg) => {
        addToast(msg, 'error');
    });
  };

  // ─── Render Logics ────────────────────────────────────────────────────────
  if (tokenLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-slate-900/20 border-t-[#1A1A1A] rounded-full animate-spin"></div>
        <p className="mt-4 font-medium text-slate-900">Memuat Data Meja...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900">
          <AlertCircle className="w-10 h-10 text-rose-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Meja Tidak Valid</h1>
        <p className="text-slate-900/70 mb-8 max-w-sm">QR Code yang Anda scan tidak valid, sudah kadaluarsa, atau langganan restoran ini sudah tidak aktif.</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 hover:bg-black transition">Coba Scan Ulang</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans selection:bg-slate-900 selection:text-white">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="bg-slate-900 text-[#F5F2EB] sticky top-0 z-40 rounded-b-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/5">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-0.5">Memesan dari</p>
              <h1 className="text-2xl font-bold tracking-tight">{shopName || 'Toko'}</h1>
            </div>
          </div>
        </div>

        <div className="flex px-2 pb-2">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-3 text-sm font-bold text-center rounded-xl transition-all duration-300 ${activeTab === 'menu' ? 'bg-slate-50 text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
          >
            Pesan Menu
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold text-center rounded-xl transition-all duration-300 ${activeTab === 'history' ? 'bg-slate-50 text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
          >
            Pesanan Saya
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto relative pt-4">
        {activeTab === 'menu' && (
          <>
            {/* Categories */}
            <div className="px-4 mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {categories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveCategory(cat)}
                    className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeCategory === cat ? 'bg-slate-900 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900' : 'bg-white text-slate-900/70 border border-slate-900/10 hover:bg-gray-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menus Grid */}
            <div className="px-4">
              {loadingMenus ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-black/5 rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <MenuGrid
                  menus={filteredMenus}
                  getQty={getQty}
                  addToCart={addToCart}
                  removeFromCart={removeFromCart}
                  justAdded={justAdded}
                />
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="px-4 pb-10 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-900">Pesanan Terakhir</h2>
              <button onClick={fetchRecentOrders} className="p-2 bg-white rounded-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 text-slate-900 hover:bg-gray-50 transition active:scale-95">
                <RefreshCw className={`w-4 h-4 ${loadingRecent ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {recentOrders.length === 0 && !loadingRecent ? (
              <div className="text-center py-20 bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 border border-slate-900/5">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-slate-900/30" />
                </div>
                <p className="text-slate-900/50 font-medium">Belum ada pesanan terbaru hari ini.</p>
              </div>
            ) : (
              recentOrders.map((order) => {
                const isPaid = order.status === 'paid';
                const isRejected = order.status === 'rejected';

                return (
                  <div key={order.id} className="bg-white p-5 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 border border-slate-900/5 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs font-bold text-slate-900/40 uppercase tracking-widest mb-1">Order ID</p>
                        <p className="text-sm font-mono font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-lg inline-block">{order.id.slice(0,8).toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-900/50 font-medium mb-1.5">
                          {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {isPaid ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Lunas
                          </span>
                        ) : isRejected ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Ditolak
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Menunggu
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 bg-slate-50/50 p-4 rounded-xl">
                      {order.order_items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-medium text-slate-900"><span className="text-slate-900/50 font-bold mr-1">{item.quantity}x</span> {item.menu_name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-900/5">
                      <span className="text-sm font-bold text-slate-900/50 uppercase tracking-wide">Total</span>
                      <span className="text-lg font-bold text-slate-900">{formatRupiah(order.total_price)}</span>
                    </div>

                    {!isPaid && !isRejected && order.receipt_path === null && (
                       <div className="mt-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100/50">
                         {historyUploadStatus[order.id] === 'uploading' ? (
                           <div className="text-center py-2">
                             <div className="w-5 h-5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-2"></div>
                             <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Mengupload...</p>
                           </div>
                         ) : (
                           <div className="space-y-3">
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                               <AlertCircle className="w-3.5 h-3.5" /><span>Belum Bayar?</span>
                             </div>
                             <p className="text-xs text-amber-800/70 font-medium">Silakan transfer sesuai total ke kasir dan upload buktinya di sini.</p>
                             <label className="block cursor-pointer">
                               <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                 if (e.target.files && e.target.files[0]) {
                                   setHistoryUploadFiles(prev => ({ ...prev, [order.id]: e.target.files![0] }));
                                 }
                               }} />
                               <div className="w-full py-2.5 px-4 bg-white text-slate-900 text-xs font-bold rounded-xl border border-slate-900/10 text-center hover:bg-gray-50 transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 flex items-center justify-center gap-2">
                                  <Upload className="w-4 h-4" />
                                  {historyUploadFiles[order.id] ? 'Ganti File Bukti' : 'Pilih Bukti Transfer'}
                               </div>
                             </label>
                             {historyUploadFiles[order.id] && (
                               <button
                                 onClick={() => handleHistoryUpload(order.id)}
                                 className="w-full py-2.5 px-4 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 hover:bg-black transition active:scale-95"
                               >
                                 Upload Sekarang
                               </button>
                             )}
                           </div>
                         )}
                       </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-[#F5F2EB] via-[#F5F2EB]/90 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto relative">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-slate-900 text-white px-5 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 flex items-center justify-between hover:bg-black transition-all active:scale-[0.98] group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <span className="font-bold text-sm">{totalItems}</span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-widest mb-0.5">Total Pesanan</p>
                  <p className="font-bold text-sm">{formatRupiah(totalPrice)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold relative z-10 bg-white/10 px-4 py-2 rounded-xl border border-white/10 group-hover:bg-white/20 transition-colors">
                Lanjut <CheckCircle className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      <CartDrawer 
         cart={cart}
         isOpen={isCartOpen}
         onClose={() => setIsCartOpen(false)}
         tableNumber={tableNumber}
         totalItems={totalItems}
         totalPrice={totalPrice}
         customerName={customerName}
         setCustomerName={setCustomerName}
         customerPhone={customerPhone}
         setCustomerPhone={setCustomerPhone}
         customerEmail={customerEmail}
         setCustomerEmail={setCustomerEmail}
         showNameError={showNameError}
         isSubmitting={isSubmitting}
         handleCheckout={doCheckout}
         addToCart={addToCart}
         removeFromCart={removeFromCart}
      />

      <PaymentModal 
         isOpen={orderStep === 'success'}
         tableNumber={tableNumber}
         customerName={customerName}
         totalPrice={checkoutTotal}
         qrisUrl={qrisUrl}
         uploadStatus={uploadStatus}
         uploadFile={uploadFile}
         setUploadFile={setUploadFile}
         handleUploadProof={handleUploadProof}
         handleDoneOrder={() => handleDoneOrder(() => {
           setActiveTab('history');
           fetchRecentOrders();
         })}
      />

      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        shopId={shopId}
        addToast={addToast}
      />

      {/* Tombol Kritik & Saran */}
      <button
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-28 right-4 z-40 bg-white border border-slate-900/10 text-slate-900 p-3.5 rounded-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 hover:bg-gray-50 active:scale-95 transition-all"
        title="Kritik & Saran"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

    </div>
  );
}
