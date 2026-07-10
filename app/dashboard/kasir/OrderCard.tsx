'use client';

import React from 'react';
import { Order } from './types';
import { formatRupiah, formatTime } from './formatHelpers';

interface OrderCardProps {
  order: Order;
  newOrderIds: Set<string>;
  onClick: () => void;
}

/**
 * Komponen untuk menampilkan ringkasan pesanan pelanggan dalam bentuk kartu
 */
export default function OrderCard({ order, newOrderIds, onClick }: OrderCardProps) {
  const hasReceipt = !!order.receipt_path;
  const orderTime = new Date(order.created_at).getTime();
  const isDelayed = order.status === 'pending' && (new Date().getTime() - orderTime) > 5 * 60 * 1000;

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-5 cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transition-all duration-300 relative ${
        isDelayed
          ? 'border-red-500 shadow-red-50 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 ring-1 ring-red-400/50'
          : newOrderIds.has(order.id)
          ? 'border-amber-400 shadow-amber-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 ring-2 ring-amber-300/50'
          : 'border-slate-900/10'
      }`}
    >
      {/* Badge Status */}
      <div className="absolute top-5 right-5 flex items-center gap-2">
        {isDelayed && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-700 border border-red-300 animate-pulse">
            TERLAMBAT &gt; 5 MENIT
          </span>
        )}
        
        {order.is_ready ? (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500 text-white border border-emerald-600">
            SIAP SAJI
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-900/5 text-slate-900/60 border border-slate-900/10">
            SEDANG DIBUAT
          </span>
        )}

        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
          order.status === 'paid'
            ? 'bg-emerald-100 text-emerald-700'
            : order.status === 'rejected'
            ? 'bg-rose-100 text-rose-700'
            : 'bg-amber-100 text-amber-700 animate-pulse'
        }`}>
          {order.status === 'paid' ? 'Lunas' : order.status === 'rejected' ? 'Ditolak' : 'Pending'}
        </span>
      </div>

      <div className="mb-2.5">
        <div className="flex items-center gap-2 mb-1">
          {newOrderIds.has(order.id) && (
            <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
              BARU
            </span>
          )}
          <span className="font-bold text-slate-900 text-lg">{order.table_number}</span>
          {order.customer_name && (
            <span className="text-sm font-semibold text-slate-900/60">
              ({order.customer_name})
            </span>
          )}
        </div>
        <p className="text-xs text-slate-900/40" suppressHydrationWarning>
          Jam: {formatTime(order.created_at)} · ID: #{order.id.slice(0, 8)}
        </p>
      </div>

      {/* Rincian Menu */}
      <div className="text-sm text-slate-900/70 mb-3 flex items-center gap-1">
        <span className="font-bold">{order.order_items?.length} Menu:</span>
        <span className="truncate">
          {order.order_items?.map((item) => `${item.quantity}x ${item.menu_name}`).join(', ')}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-900/5">
        <div>
          <p className="text-[10px] text-slate-900/40 uppercase font-bold tracking-wider">Total Tagihan</p>
          <p className="text-lg font-bold text-slate-900" suppressHydrationWarning>
            {formatRupiah(order.total_price)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasReceipt && (
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
              Bukti Transfer
            </span>
          )}
          <span className="text-xs text-slate-900/40 font-semibold flex items-center gap-1">
            Lihat Rincian
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
