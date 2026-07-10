'use client';

import { X } from 'lucide-react';
import { formatRupiah } from '../utils';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerEmail: string;
  setCustomerEmail: (email: string) => void;
  showNameError: boolean;
  totalItems: number;
  totalPrice: number;
  handleCheckout: () => void;
  isSubmitting: boolean;
}

export function CartDrawer({
  isOpen,
  onClose,
  tableNumber,
  cart,
  addToCart,
  removeFromCart,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  showNameError,
  totalItems,
  totalPrice,
  handleCheckout,
  isSubmitting,
}: CartDrawerProps) {
  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-3xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-900/15 rounded-full" />
        </div>
        <div className="px-5 pb-8 pt-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Pesanan Kamu</h3>
              <p className="text-xs text-slate-900/40 mt-0.5">{tableNumber}</p>
            </div>
            <button id="btn-close-cart" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-900/8 flex items-center justify-center text-slate-900/60 hover:bg-slate-900/15 transition-colors text-sm">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="space-y-2.5 mb-5 max-h-[25vh] overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex-shrink-0 overflow-hidden">
                  {item.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">🍴</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-900/40" suppressHydrationWarning>{formatRupiah(item.price)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-lg border border-slate-900/15 flex items-center justify-center text-slate-900 hover:bg-slate-900/5 active:scale-90 transition-all text-base">−</button>
                  <span className="w-5 text-center text-sm font-bold text-slate-900">{item.qty}</span>
                  <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white hover:bg-[#333] active:scale-90 transition-all text-base">+</button>
                </div>
                <p className="font-bold text-sm text-slate-900 w-16 text-right flex-shrink-0">
                  <span suppressHydrationWarning>{formatRupiah(item.price * item.qty)}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Form Identitas Pelanggan */}
          <div className="bg-white rounded-xl p-4 mb-4 border border-slate-900/5">
            <h4 className="text-xs font-bold text-slate-900/60 uppercase tracking-wide mb-3">Informasi Pelanggan</h4>
            <div className="space-y-2">
              <div>
                <input
                  id="input-customer-name"
                  type="text"
                  placeholder="Nama Pemesan * (Wajib)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20 transition-all ${
                    showNameError ? 'border-red-400 bg-red-50/20' : 'border-slate-900/10'
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-900/10 rounded-xl text-xs text-slate-900 placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20"
                />
                <input
                  id="input-customer-email"
                  type="email"
                  placeholder="Email (Opsional)"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-900/10 rounded-xl text-xs text-slate-900 placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20"
                />
              </div>
            </div>
          </div>

          {/* Subtotal */}
          <div className="bg-white rounded-xl p-4 mb-4 border border-slate-900/5">
            <div className="flex justify-between items-center text-xs text-slate-900/50">
              <span>Subtotal ({totalItems} item)</span>
              <span suppressHydrationWarning>{formatRupiah(totalPrice)}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-900/6 flex justify-between items-center">
              <span className="font-semibold text-xs text-slate-900">Total Pembayaran</span>
              <span className="text-base font-bold text-slate-900" suppressHydrationWarning>{formatRupiah(totalPrice)}</span>
            </div>
          </div>

          <button
            id="btn-checkout"
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="w-full py-4 bg-slate-900 text-white font-bold text-base rounded-xl hover:bg-[#2a2a2a] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting
              ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Memproses...</span>
              : '🛎️  Bayar Sekarang (QRIS)'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
