import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route untuk menyimpan log aktivitas website secara permanen di Supabase.
 * Menggunakan Service Role Key untuk bypass RLS sehingga log dari anon user
 * (kunjungan landing page) bisa tersimpan tanpa hambatan.
 */

// Helper: buat client dengan service role key jika ada, fallback ke anon
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, serviceKey ?? anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const db = getAdminClient();

    // Bersihkan log lama (> 7 hari) secara otomatis
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.from('website_logs').delete().lt('created_at', oneWeekAgo);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, type } = await request.json();

    if (!title || !type) {
      return NextResponse.json({ error: 'title dan type diperlukan' }, { status: 400 });
    }

    // Ambil IP pengunjung dari headers proxy
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0].trim() : (realIp ?? null);

    const db = getAdminClient();

    const { data, error } = await db
      .from('website_logs')
      .insert([{ title, description, type, visitor_ip: ip }])
      .select()
      .single();

    if (error) {
      // Log error ke server console untuk debugging
      console.error('[api/logs POST] Supabase error:', error.message, '| Hint:', error.hint ?? '-');
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
