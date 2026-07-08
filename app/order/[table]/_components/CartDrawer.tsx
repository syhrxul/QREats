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
      <div className={`absolute bottom-0 left-0 right-0 bg-[#F5F2EB] rounded-t-3xl shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#1A1A1A]/15 rounded-full" />
        </div>
        <div className="px-5 pb-8 pt-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">Pesanan Kamu</h3>
              <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{tableNumber}</p>
            </div>
            <button id="btn-close-cart" onClick={onClose} className="w-8 h-8 rounded-full bg-[#1A1A1A]/8 flex items-center justify-center text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/15 transition-colors text-sm">
              <X className="w-4 h-4" />
            </button>
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
  );
}
