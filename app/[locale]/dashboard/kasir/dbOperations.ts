import { supabase } from '@/src/lib/supabase';

/**
 * Mengubah status pesanan menjadi Lunas (paid) di database
 */
export async function confirmOrderPaid(orderId: string): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId);
  return !error;
}

/**
 * Menolak pesanan dengan menulis alasan penolakan di kolom receipt_path
 */
export async function rejectOrder(orderId: string, reason: string): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({ 
      status: 'rejected',
      receipt_path: reason
    })
    .eq('id', orderId);
  return !error;
}

/**
 * Mengubah status kesiapan dapur pesanan (is_ready) di database
 */
export async function toggleOrderReady(orderId: string, currentReady: boolean): Promise<boolean> {
  const nextVal = !currentReady;
  const { error } = await supabase
    .from('orders')
    .update({ is_ready: nextVal })
    .eq('id', orderId);
  return !error;
}
