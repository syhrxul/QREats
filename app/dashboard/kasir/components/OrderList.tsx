'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../../src/lib/supabase';
import OrderCard from '../OrderCard';
import { Order, OrderItem } from '../types';

interface Props {
  shopId: string | null;
  userRole: string | null;
  onSelect: (order: Order) => void;
  playSound?: () => void;
}

export default function OrderList({ shopId, userRole, onSelect, playSound }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const soundRef = useRef(playSound);
  useEffect(() => { soundRef.current = playSound; }, [playSound]);

  async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    return error ? [] : (data ?? []);
  }

  async function fetchOrders() {
    const isSuperadmin = userRole === 'superadmin';
    if (!shopId && !isSuperadmin) return setLoading(false);
    let query = supabase.from('orders').select('*');
    if (!isSuperadmin && shopId) query = query.eq('shop_id', shopId);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) return setLoading(false);
    const ordersWithItems = await Promise.all((data ?? []).map(async (o: Order) => ({
      ...o,
      order_items: await fetchOrderItems(o.id),
    })));
    setOrders(ordersWithItems);
    setLoading(false);
  }

  useEffect(() => {
    if (shopId || userRole === 'superadmin') fetchOrders();
  }, [shopId, userRole]);

  useEffect(() => {
    const isSuperadmin = userRole === 'superadmin';
    if (!shopId && !isSuperadmin) return;

    const channel = supabase.channel('orders-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
      async (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newOrder = payload.new as Order;
          if (!isSuperadmin && newOrder.shop_id !== shopId) return;
          const items = await fetchOrderItems(newOrder.id);
          const fullOrder: Order = { ...newOrder, order_items: items };
          setOrders((prev) => [fullOrder, ...prev]);
          setNewOrderIds((prev) => new Set(prev).add(newOrder.id));
          if (soundRef.current) soundRef.current();
          setTimeout(() => setNewOrderIds((prev) => { const next = new Set(prev); next.delete(newOrder.id); return next; }), 6000);
        } else if (payload.eventType === 'UPDATE') {
          const updatedOrder = payload.new as Order;
          setOrders((prev) => prev.map((o) => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
        }
      }
    ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shopId, userRole]);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-white/60 rounded-xl animate-pulse" />)}
        </div>
      </main>
    );
  }

  const activeOrders = orders.filter((o) => (o.status === 'pending' || !o.is_ready) && o.status !== 'rejected');

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {activeOrders.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-900/8 rounded-xl p-8 text-slate-900/30">
          <p className="text-base font-bold">Tidak ada antrean aktif</p>
          <p className="text-xs mt-1">Seluruh pesanan pelanggan sudah tersaji dan lunas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} newOrderIds={newOrderIds} onClick={() => onSelect(order)} />
          ))}
        </div>
      )}
    </main>
  );
}
