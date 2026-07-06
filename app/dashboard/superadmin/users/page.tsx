'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface ProfileDB {
  id: string;
  email: string;
  role: string;
  shop_id: string | null;
  shops?: { name: string } | null;
}

interface ShopOption {
  id: string;
  name: string;
}

export default function SuperadminUsersPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [profiles, setProfiles] = useState<ProfileDB[]>([]);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'owner' | 'admin' | 'kasir'>('kasir');
  const [newShopId, setNewShopId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Edit user states
  const [editingUser, setEditingUser] = useState<ProfileDB | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'owner' | 'admin' | 'kasir'>('kasir');
  const [editShopId, setEditShopId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // ─── Auth Guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!profile || profile.role !== 'superadmin') {
        setAccessDenied(true);
      }
      setAuthChecking(false);
    }
    checkAccess();
  }, []);

  // ─── Fetch Users & Shops ────────────────────────────────────────────────────

  const fetchUsersAndShops = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profiles + Shop Name join
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, role, shop_id, shops (name)')
        .order('email', { ascending: true });

      if (profErr) throw profErr;
      setProfiles((profData as any) ?? []);

      // 2. Fetch Shops for select option
      const { data: shopsData } = await supabase
        .from('shops')
        .select('id, name')
        .order('name', { ascending: true });
      
      setShops(shopsData ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecking && !accessDenied) {
      fetchUsersAndShops();
    }
  }, [authChecking, accessDenied]);

  // ─── User Creator (persistSession: false) ──────────────────────────────────

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess(false);
    setRegistering(true);

    if (!newEmail.trim() || !newPassword || !newName.trim()) {
      setRegisterError('Semua field nama, email, dan password wajib diisi.');
      setRegistering(false);
      return;
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: {
          data: { display_name: newName.trim() },
        },
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message ?? 'Gagal membuat akun auth.');
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: newEmail.trim(),
          role: newRole,
          shop_id: newShopId ? newShopId : null,
        });

      if (profileError) throw profileError;

      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('kasir');
      setNewShopId('');
      setRegisterSuccess(true);
      await fetchUsersAndShops();

    } catch (err: any) {
      console.error(err);
      setRegisterError(err.message || 'Terjadi kesalahan.');
    } finally {
      setRegistering(false);
    }
  }

  function handleOpenEditModal(user: ProfileDB) {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditRole(user.role as any);
    setEditShopId(user.shop_id || '');
    setEditPassword('');
    setUpdateError('');
    setUpdateSuccess(false);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    setUpdateError('');
    setUpdateSuccess(false);

    try {
      // Update profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: editEmail.trim(),
          role: editRole,
          shop_id: editShopId ? editShopId : null,
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      if (editPassword.trim()) {
        alert('Informasi: Email, Role, dan Toko berhasil diperbarui. Mengubah password akun auth user lain memerlukan Supabase Service Role Key (Admin API) demi alasan keamanan.');
      } else {
        setUpdateSuccess(true);
      }

      await fetchUsersAndShops();
      setTimeout(() => {
        setEditingUser(null);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setUpdateError(err.message || 'Terjadi kesalahan.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteUser() {
    if (!editingUser) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus profil pengguna ${editingUser.email}?`)) return;

    setUpdating(true);
    setUpdateError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', editingUser.id);

      if (error) throw error;

      alert('Profil pengguna berhasil dihapus dari database.');
      await fetchUsersAndShops();
      setEditingUser(null);
    } catch (err: any) {
      console.error(err);
      setUpdateError(err.message || 'Gagal menghapus pengguna.');
    } finally {
      setUpdating(false);
    }
  }

  // ─── Guard Render ───────────────────────────────────────────────────────────

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-sans">
        <p className="text-sm text-[#1A1A1A]/40">Memeriksa hak akses superadmin...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">Akses Dibatasi</h1>
          <p className="text-sm text-[#1A1A1A]/50">Halaman ini khusus untuk Superadmin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F2EB] min-h-screen font-sans">
      
      {/* Header */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Kelola Pengguna Platform</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Daftarkan akun kasir, owner baru, dan pantau profil pengguna aktif</p>
        </div>
        <button
          onClick={fetchUsersAndShops}
          className="px-4 py-2 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-xs font-bold rounded-xl transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Add User */}
          <div className="bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm space-y-4 self-start">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-base">Registrasi User Baru</h3>
              <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Buat akun untuk pemilik kafe atau karyawan staf</p>
            </div>

            {registerSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold text-center">
                User baru berhasil ditambahkan!
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-3 py-2 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full px-3 py-2 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="w-full px-3 py-2 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Role Akun</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-2 py-2 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-lg focus:outline-none font-bold"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="kasir">Kasir</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Pilih Toko</label>
                  <select
                    value={newShopId}
                    onChange={(e) => setNewShopId(e.target.value)}
                    className="w-full px-2 py-2 bg-[#F5F2EB] border border-[#1A1A1A]/10 rounded-lg focus:outline-none font-bold"
                  >
                    <option value="">-- Tanpa Toko --</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {registerError && (
                <p className="text-[10px] text-red-500 font-bold">{registerError}</p>
              )}

              <button
                type="submit"
                disabled={registering}
                className="w-full py-3 bg-[#1A1A1A] text-white font-bold rounded-xl hover:bg-[#333] transition-all disabled:opacity-50"
              >
                {registering ? 'Mendaftarkan...' : 'Daftarkan Akun'}
              </button>
            </form>
          </div>

          {/* Table Users */}
          <div className="lg:col-span-2 bg-white border border-[#1A1A1A]/8 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A] text-base">Daftar Akun Pengguna</h3>
              <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Daftar email, role, dan relasi merchant di platform</p>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="space-y-3 py-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-[#F5F2EB]/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F2EB]/60 border-b border-[#1A1A1A]/5 text-[#1A1A1A]/60 font-bold">
                      <th className="p-3">Email Pengguna</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Toko Terkait</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr 
                        key={p.id} 
                        className="border-b border-[#1A1A1A]/5 last:border-b-0 hover:bg-[#F5F2EB]/10 transition-colors cursor-pointer"
                        onClick={() => handleOpenEditModal(p)}
                      >
                        <td className="p-3 font-semibold text-[#1A1A1A]">
                          {p.email}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full ${
                            p.role === 'superadmin'
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : p.role === 'owner'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-[#1A1A1A]">
                          {p.shops?.name || (p.role === 'superadmin' ? 'Pusat Platform' : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Modal Edit Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative bg-[#F9F6EE] rounded-3xl overflow-hidden max-w-md w-full shadow-2xl border border-[#1A1A1A]/10 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-4">
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-lg font-sans">Edit Profil Pengguna</h3>
                <p className="text-xs text-[#1A1A1A]/40 font-mono mt-0.5">ID: {editingUser.id}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-xl text-[#1A1A1A]/40 hover:text-[#1A1A1A] cursor-pointer">
                ✕
              </button>
            </div>
            
            {updateSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold text-center font-sans">
                Data pengguna berhasil diperbarui!
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1 font-sans">Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#1A1A1A]/10 rounded-lg focus:outline-none font-bold text-[#1A1A1A] text-xs font-sans"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1 font-sans">Password Baru</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak diubah"
                  className="w-full px-3 py-2.5 bg-white border border-[#1A1A1A]/10 rounded-lg focus:outline-none text-xs font-sans"
                />
                <p className="text-[9px] text-[#1A1A1A]/35 mt-1 font-sans">Catatan: Mengubah password akun user lain membutuhkan Admin API (Service Role Key).</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1 font-sans">Role Akun</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-2.5 py-2.5 bg-white border border-[#1A1A1A]/10 rounded-lg focus:outline-none font-bold text-[#1A1A1A] font-sans"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="kasir">Kasir</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1 font-sans">Hubungkan Toko</label>
                  <select
                    value={editShopId}
                    onChange={(e) => setEditShopId(e.target.value)}
                    className="w-full px-2.5 py-2.5 bg-white border border-[#1A1A1A]/10 rounded-lg focus:outline-none font-bold text-[#1A1A1A] font-sans"
                  >
                    <option value="">-- Tanpa Toko --</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {updateError && (
                <p className="text-[10px] text-red-500 font-bold font-sans">{updateError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={updating}
                  className="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all active:scale-[0.98] cursor-pointer font-sans"
                >
                  Hapus User
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-3 bg-[#1A1A1A] text-white font-bold rounded-xl hover:bg-[#333] transition-all active:scale-[0.98] cursor-pointer font-sans"
                >
                  {updating ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
