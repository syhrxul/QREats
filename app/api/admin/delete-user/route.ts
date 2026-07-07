import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logWebsiteEventServer } from '../../../src/lib/server-logs';

/**
 * API route server-side untuk menghapus user dari auth.users Supabase.
 * Menggunakan Service Role Key untuk akses admin penuh.
 *
 * Verifikasi superadmin dilakukan dengan membuat supabase client
 * menggunakan JWT token milik pemanggil, lalu mengecek role-nya.
 */
export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di .env.local' },
        { status: 500 }
      );
    }

    // ── Verifikasi: cek role pemanggil pakai JWT-nya sendiri ──────────────────
    const authHeader = request.headers.get('authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();

    if (!userToken) {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 401 });
    }

    // Buat client dengan token user (bukan service role) untuk cek role-nya
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Dapatkan user dari JWT-nya (getUser() memakai header Authorization otomatis)
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Sesi tidak valid, silakan login ulang' }, { status: 401 });
    }

    // Cek apakah user yang memanggil adalah superadmin
    const { data: callerProfile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Akses ditolak — bukan superadmin' }, { status: 403 });
    }

    // ── Hapus user menggunakan service role ───────────────────────────────────
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Hapus dari profiles dulu (hindari FK constraint)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Hapus dari auth.users — ini yang utama, menghapus akun login sepenuhnya
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logWebsiteEventServer(
      'User Dihapus',
      `Superadmin menghapus user dengan id ${userId}.`,
      'alert'
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
