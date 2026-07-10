'use client';

import React from 'react';
import { formatRupiah } from '../../dashboard/kasir/formatHelpers';

interface OrderDummy {
  table: string;
  customer: string;
  items: string;
  total: number;
  status: string;
}

interface OrdersTabProps {
  orders: OrderDummy[];
}

/**
 * Tab panel untuk melihat antrean kasir dalam mode demo (tanpa emoji)
 */
export default function OrdersTab({ orders }: OrdersTabProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="border-b border-slate-900/10 px-2 py-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">Antrean Kasir</h2>
        <p className="text-xs text-slate-900/40 mt-0.5">Realtime monitoring pesanan meja (simulasi)</p>
      </div>
      
      {orders.map((order, i) => (
        <div key={i} className="bg-white border border-slate-900/8 rounded-xl p-5 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg">{order.table}</span>
              <span className="text-sm font-semibold text-slate-900/60">({order.customer})</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
              order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 animate-pulse'
            }`}>
              {order.status === 'paid' ? 'Lunas' : 'Pending'}
            </span>
          </div>
          <p className="text-sm text-slate-900/60 mb-2">{order.items}</p>
          <p className="font-bold text-slate-900">{formatRupiah(order.total)}</p>
        </div>
      ))}
    </div>
  );
}
