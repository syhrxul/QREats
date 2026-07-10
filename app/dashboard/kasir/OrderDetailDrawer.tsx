'use client';

import React from 'react';
import { Order } from './types';
import { formatRupiah, formatTime } from './formatHelpers';

interface OrderDetailDrawerProps {
  selectedOrder: Order;
  onClose: () => void;
  userRole: string | null;
  updatingReadyId: string | null;
  confirmingId: string | null;
  onToggleReady: () => void;
  onConfirmPaid: () => void;
  onReject: () => void;
  onLoadReceipt: (path: string) => void;
}

/**
 * Laci (Drawer) slide-over untuk menampilkan detail lengkap pesanan
 */
export default function OrderDetailDrawer({
  selectedOrder,
  onClose,
  userRole,
  updatingReadyId,
  confirmingId,
  onToggleReady,
  onConfirmPaid,
  onReject,
  onLoadReceipt,
}: OrderDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-[#F9F6EE] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 flex flex-col justify-between border-l border-slate-900/10">
          
          {/* Drawer Header */}
          <div className="px-6 py-5 bg-white border-b border-slate-900/10 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rincian Pesanan</h2>
              <p className="text-xs text-slate-900/40 mt-0.5">ID: #{selectedOrder.id}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-900/10 flex items-center justify-center text-slate-900 hover:bg-slate-900/20 transition-colors"
            >
              Tutup
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            
            {/* Info Meja & Status */}
            <div className="bg-white border border-slate-900/10 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xl font-bold text-slate-900">{selectedOrder.table_number}</p>
                  {selectedOrder.customer_name && (
                    <p className="text-sm text-slate-900/60 font-medium">{selectedOrder.customer_name}</p>
                  )}
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                  selectedOrder.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : selectedOrder.status === 'rejected'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {selectedOrder.status === 'paid' ? 'Lunas' : selectedOrder.status === 'rejected' ? 'Ditolak' : 'Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-900/40" suppressHydrationWarning>
                Waktu Order: {formatTime(selectedOrder.created_at)}
              </p>
            </div>

            {/* List Menu */}
            <div>
              <p className="text-xs font-bold text-slate-900/40 uppercase tracking-wider mb-3">Detail Menu Pesanan</p>
              <div className="space-y-2">
                {selectedOrder.order_items?.map((item) => (
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

            {/* Total tagihan */}
            <div className="bg-slate-900 text-white rounded-xl p-5 flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">TOTAL TAGIHAN</p>
              <p className="text-2xl font-bold" suppressHydrationWarning>{formatRupiah(selectedOrder.total_price)}</p>
            </div>

            {/* Bukti Transfer */}
            {selectedOrder.receipt_path && (
              <div>
                <p className="text-xs font-bold text-slate-900/40 uppercase tracking-wider mb-3">Bukti Pembayaran</p>
                
                {selectedOrder.status === 'rejected' ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-rose-800 uppercase">Alasan Penolakan:</p>
                    <p className="text-xs text-rose-700 mt-1">{selectedOrder.receipt_path}</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-900/10 rounded-xl p-4">
                    <button
                      onClick={() => onLoadReceipt(selectedOrder.receipt_path!)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-[#EAE6DB] text-slate-900 text-xs font-bold rounded-xl transition-all border border-slate-900/10"
                    >
                      Buka Lampiran Bukti Transfer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="px-6 py-5 bg-white border-t border-slate-900/10 flex flex-col gap-2.5">
            {userRole !== 'superadmin' ? (
              <div className="flex gap-2">
                {/* Tombol Kesiapan Sajian */}
                <button
                  onClick={onToggleReady}
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

                {/* Tombol Konfirmasi Lunas / Tolak */}
                {selectedOrder.status === 'pending' && (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={onConfirmPaid}
                      disabled={confirmingId === selectedOrder.id}
                      className="flex-1 py-3 bg-slate-900 hover:bg-[#333] active:scale-95 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 text-center"
                    >
                      {confirmingId === selectedOrder.id ? 'Memproses...' : 'Lunas'}
                    </button>
                    
                    <button
                      onClick={onReject}
                      disabled={confirmingId === selectedOrder.id}
                      className="py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 text-center"
                    >
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-center font-bold text-red-500 bg-red-50 border border-red-200 py-2.5 rounded-xl uppercase tracking-wide">
                Mode Preview: Aksi dinonaktifkan
              </p>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 border border-slate-900/15 hover:bg-slate-900/5 text-slate-900 text-xs font-bold rounded-xl transition-colors text-center"
            >
              Tutup Rincian
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
