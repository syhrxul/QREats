import { NextResponse } from 'next/server';

/**
 * Endpoint API internal untuk mengirim push notification via OneSignal
 * tanpa mengekspos REST API Key di sisi client.
 */
export async function POST(request: Request) {
  try {
    const { title, message, shopId } = await request.json();

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      return NextResponse.json(
        { error: 'Kredensial OneSignal belum diatur di file .env.local' },
        { status: 500 }
      );
    }

    // Susun payload OneSignal
    const payload: any = {
      app_id: appId,
      contents: { en: message },
      headings: { en: title },
    };

    // Filter berdasarkan shop_id agar notifikasi multi-tenant tidak bocor ke toko lain
    if (shopId) {
      payload.filters = [
        { field: 'tag', key: 'shop_id', relation: '=', value: shopId }
      ];
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error dari OneSignal API:', data);
      return NextResponse.json(
        { error: data.errors?.[0] || 'Gagal mengirim notifikasi via OneSignal' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('API route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
