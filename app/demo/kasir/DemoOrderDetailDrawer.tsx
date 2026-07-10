'use client';

import React from 'react';
import { Order } from './types';
import { formatRupiah, formatTime } from '../../dashboard/kasir/formatHelpers';

interface DemoOrderDetailDrawerProps {
  selectedOrder: Order;
  onClose: () => void;
  onConfirmPaid: () => void;
  onReject: () => void;
  onToggleReady: () => void;
}

/**
 * Laci (Drawer) detail pesanan khusus mode demo (tanpa emoji)
 */
export default function DemoOrderDetailDrawer({
  selectedOrder,
  onClose,
  onConfirmPaid,
  onReject,
  onToggleReady,
}: DemoOrderDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-[#F9F6EE] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 flex flex-col justify-between border-l border-slate-900/10">
          
          <div className="px-6 py-5 bg-white border-b border-slate-900/10 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rincian Pesanan (Demo)</h2>
              <p className="text-xs text-slate-900/40 mt-0.5">ID: #{selectedOrder.id}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-900/10 flex items-center justify-center text-slate-900 hover:bg-slate-900/20 transition-colors">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="bg-white border border-slate-900/10 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xl font-bold text-slate-900">{selectedOrder.table_number}</p>
                  {selectedOrder.customer_name && (<p className="text-sm text-slate-900/60 font-medium">{selectedOrder.customer_name}</p>)}
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                  selectedOrder.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : selectedOrder.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedOrder.status === 'paid' ? 'Lunas' : selectedOrder.status === 'rejected' ? 'Ditolak' : 'Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-900/40">Waktu: {formatTime(selectedOrder.created_at)}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900/40 uppercase tracking-wider mb-3">Detail Menu Pesanan</p>
              <div className="space-y-2">
                {selectedOrder.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-white border border-slate-900/8 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{item.menu_name}</p>
                      <p className="text-xs text-slate-900/40">{item.quantity}x @ {formatRupiah(item.price)}</p>
                    </div>
                    <p className="font-bold text-sm text-slate-900">{formatRupiah(item.quantity * item.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-5 flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">TOTAL TAGIHAN</p>
              <p className="text-2xl font-bold">{formatRupiah(selectedOrder.total_price)}</p>
            </div>

            {selectedOrder.receipt_path && (
              <div>
                <p className="text-xs font-bold text-slate-900/40 uppercase tracking-wider mb-3">Bukti Transfer</p>
                <div className="bg-white border border-slate-900/10 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl mx-auto mb-2">Struk</div>
                  <p className="text-xs text-slate-900/40">Bukti transfer tersedia (demo)</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-900/10 bg-white space-y-3">
            {selectedOrder.status === 'pending' && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={onConfirmPaid} className="py-3.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all">Konfirmasi Lunas</button>
                <button onClick={onReject} className="py-3.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 active:scale-[0.98] transition-all">Tolak</button>
              </div>
            )}
            {selectedOrder.status === 'paid' && (
              <button onClick={onToggleReady} className={`w-full py-3.5 text-sm font-bold rounded-xl active:scale-[0.98] transition-all ${selectedOrder.is_ready ? 'bg-slate-900/10 text-slate-900 hover:bg-slate-900/15' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                {selectedOrder.is_ready ? 'Kembalikan Sedang Dibuat' : 'Tandai Siap Saji'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
