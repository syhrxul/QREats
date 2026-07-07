import { NextResponse } from 'next/server';

/**
 * Webhook endpoint untuk menerima event INSERT dari tabel `orders` di Supabase.
 *
 * Setup sekali di Supabase Dashboard:
 *   Database → Webhooks → Create new webhook
 *   - Table:  orders
 *   - Events: INSERT
 *   - URL:    https://<domain-kamu>/api/webhook/orders
 *   - Secret: isi sesuai WEBHOOK_SECRET di .env.local (opsional tapi direkomendasikan)
 *
 * Cara kerjanya:
 *   Setiap ada pesanan baru dari pelanggan, Supabase langsung memanggil endpoint ini
 *   dari server-side sehingga push notification SELALU terkirim, bahkan jika halaman
 *   pelanggan atau kasir sedang tertutup.
 */
export async function POST(request: Request) {
  try {
    // Verifikasi secret opsional agar endpoint tidak bisa dipanggil sembarang pihak
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();
      if (token !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();

    // Supabase webhook mengirimkan payload dengan format:
    // { type: 'INSERT', table: 'orders', record: { ... }, schema: 'public' }
    const record = body?.record;
    if (!record) {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 });
    }

    const shopId = record.shop_id;
    const tableNumber = record.table_number || 'Meja';
    const totalPrice = record.total_price || 0;
    const customerName = record.customer_name || 'Pelanggan';

    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(totalPrice);

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      console.error('Kredensial OneSignal belum diatur di environment variables');
      return NextResponse.json({ error: 'Konfigurasi push notification belum lengkap' }, { status: 500 });
    }

    // Susun payload push notification OneSignal
    const pushPayload: any = {
      app_id: appId,
      headings: { en: '🔔 Pesanan Baru Masuk' },
      contents: {
        en: `${tableNumber} (${customerName.trim()}) — ${formattedTotal}`,
      },
      // Hanya kirim ke device kasir yang ter-tag dengan shop_id toko ini
      filters: [
        { field: 'tag', key: 'shop_id', relation: '=', value: shopId },
      ],
      // Agar notifikasi terlihat meski device dalam silent mode (Android)
      android_channel_id: shopId,
      priority: 10,
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(pushPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error dari OneSignal:', data);
      return NextResponse.json({ error: data.errors?.[0] || 'Gagal kirim push' }, { status: response.status });
    }

    return NextResponse.json({ success: true, recipients: data.recipients });
  } catch (err: any) {
    console.error('Webhook orders error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
