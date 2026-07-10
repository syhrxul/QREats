'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { logWebsiteEvent } from '@/src/lib/logs';

interface OrderPayload {
  tableNumber: string;
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shopId: string;
  cart: any[];
}

export function useOrder() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderStep, setOrderStep] = useState<'idle' | 'success'>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutTotal, setCheckoutTotal] = useState<number>(0);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');

  async function handleCheckout(payload: OrderPayload, onSuccess: () => void, onError: (msg: string) => void) {
    if (payload.cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_number: payload.tableNumber,
          total_price: payload.totalPrice,
          status: 'pending',
          customer_name: payload.customerName.trim(),
          customer_phone: payload.customerPhone.trim() || null,
          customer_email: payload.customerEmail.trim() || null,
          payment_method: 'qris',
          shop_id: payload.shopId,
        })
        .select('id')
        .single();

      if (orderError || !orderData) throw new Error(orderError?.message ?? 'Gagal membuat pesanan.');

      const newOrderId = orderData.id as string;

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(payload.cart.map((item) => ({
          order_id: newOrderId,
          menu_id: item.id,
          menu_name: item.name,
          price: item.price,
          quantity: item.qty,
        })));

      if (itemsError) throw new Error(itemsError.message);

      void logWebsiteEvent('Order Baru Dibuat', `Pesanan baru dibuat pada meja ${payload.tableNumber} untuk toko ${payload.shopId}. Total ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(payload.totalPrice)}.`, 'info');

      try {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            title: 'Pesanan Baru Masuk',
            message: `Pesanan dari ${payload.tableNumber} (${payload.customerName.trim()}) senilai ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(payload.totalPrice)}`,
            shopId: payload.shopId,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? 'Gagal mengirim notifikasi');
          }
          void logWebsiteEvent('Notifikasi Dikirim', `Push notification berhasil dikirim untuk order ${newOrderId} di toko ${payload.shopId}.`, 'success');
        }).catch(err => {
          console.warn('Gagal dispatch push notification:', err);
          void logWebsiteEvent('Notifikasi Gagal', `Push notification gagal untuk order ${newOrderId}: ${err.message || err}`, 'alert');
        });
      } catch (pushErr: any) {
        console.warn('Gagal memicu push notification:', pushErr);
        void logWebsiteEvent('Notifikasi Error', `Terjadi error saat memicu notifikasi order ${newOrderId}: ${pushErr.message || pushErr}`, 'alert');
      }

      setOrderId(newOrderId);
      setCheckoutTotal(payload.totalPrice);
      setOrderStep('success');
      onSuccess();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  }

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

  function handleDoneOrder(onDone: () => void) {
    setOrderStep('idle');
    setUploadFile(null);
    setUploadStatus('idle');
    setOrderId(null);
    onDone();
  }

  return {
    isSubmitting,
    orderStep,
    orderId,
    checkoutTotal,
    uploadFile,
    setUploadFile,
    uploadStatus,
    handleCheckout,
    handleUploadProof,
    handleDoneOrder
  };
}
