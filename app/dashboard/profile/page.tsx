'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../src/lib/supabase';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileData) {
        setProfile({
          ...profileData,
          name: user.user_metadata?.name || '',
          email: user.email
        });
        setName(user.user_metadata?.name || '');
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: name.trim() }
      });
      if (error) throw error;
      setAlertMsg({ title: 'Berhasil', message: 'Nama profil berhasil diperbarui.', type: 'success' });
    } catch (e: any) {
      setAlertMsg({ title: 'Gagal', message: e.message, type: 'error' });
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleUpdatePassword(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const inputEl = document.getElementById('profile-password') as HTMLInputElement;
    const currentPassword = password || (inputEl ? inputEl.value : '');

    if (!currentPassword.trim()) {
      setAlertMsg({ title: 'Gagal', message: 'Silakan masukkan kata sandi.', type: 'error' });
      return;
    }
    if (currentPassword.length < 6) {
      setAlertMsg({ title: 'Gagal', message: 'Password minimal 6 karakter.', type: 'error' });
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: currentPassword
      });
      if (error) throw error;
      setAlertMsg({ title: 'Berhasil', message: 'Password berhasil diperbarui.', type: 'success' });
      setPassword('');
    } catch (e: any) {
      setAlertMsg({ title: 'Gagal', message: e.message, type: 'error' });
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin menghapus akun Anda? Tindakan ini tidak dapat dibatalkan.')) return;
    
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesi tidak ditemukan.');

      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus akun.');

      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (e: any) {
      setAlertMsg({ title: 'Gagal', message: e.message, type: 'error' });
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#F5F2EB] min-h-screen flex items-center justify-center p-6">
        <p className="font-bold text-[#1A1A1A]/50 animate-pulse">Memuat profil...</p>
      </div>
    );
  }

  if (profile?.role === 'pelanggan') {
    return (
      <div className="bg-[#F5F2EB] min-h-screen flex items-center justify-center p-6 text-center">
        <p className="font-bold text-[#1A1A1A]/50">Akses Ditolak.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F2EB] min-h-screen font-sans">
      {/* Alert Modal */}
      {alertMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAlertMsg(null)} />
          <div className="relative bg-[#F9F6EE] rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl p-6 text-center border border-[#1A1A1A]/10 animate-fade-in-up">
            <h3 className="font-black text-lg text-[#1A1A1A] mb-2">{alertMsg.title}</h3>
            <p className="text-sm text-[#1A1A1A]/60 leading-relaxed mb-6">{alertMsg.message}</p>
            <button
              onClick={() => setAlertMsg(null)}
              className="w-full py-3 bg-[#1A1A1A] text-white font-bold rounded-xl hover:bg-[#333] transition-all"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h1 className="font-black text-xl text-[#1A1A1A] uppercase tracking-tighter">Profil Pengguna</h1>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">Kelola informasi pribadi dan keamanan akun Anda</p>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        
        {/* Profile Info & Name Form */}
        <div className="bg-white rounded-3xl p-6 border border-[#1A1A1A]/10">
          <h2 className="font-bold text-lg mb-4 text-[#1A1A1A]">Informasi Akun</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#F5F2EB]/50 p-4 rounded-xl border border-[#1A1A1A]/5">
              <span className="text-[10px] font-bold text-[#1A1A1A]/40 block uppercase tracking-wide">Email</span>
              <span className="font-bold text-[#1A1A1A]">{profile?.email}</span>
            </div>
            <div className="bg-[#F5F2EB]/50 p-4 rounded-xl border border-[#1A1A1A]/5">
              <span className="text-[10px] font-bold text-[#1A1A1A]/40 block uppercase tracking-wide">Role / Posisi</span>
              <span className="font-bold text-[#1A1A1A] uppercase">{profile?.role}</span>
            </div>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Nama Panggilan</label>
              <input
                type="text"
                placeholder="Masukkan nama Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#1A1A1A]/10 rounded-xl focus:outline-none text-[#1A1A1A]"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingName}
              className="px-6 py-2.5 bg-[#1A1A1A] text-white font-bold rounded-xl hover:bg-[#333] transition-all disabled:opacity-50"
            >
              {isSavingName ? 'Menyimpan...' : 'Simpan Nama'}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-3xl p-6 border border-[#1A1A1A]/10">
          <h2 className="font-bold text-lg mb-4 text-[#1A1A1A]">Keamanan</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Password Baru</label>
              {/* Hidden username to help password managers */}
              <input type="text" autoComplete="username" style={{ display: 'none' }} />
              <input
                id="profile-password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#1A1A1A]/10 rounded-xl focus:outline-none text-[#1A1A1A]"
              />
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePassword()}
              disabled={isSavingPassword}
              className="px-6 py-2.5 bg-[#1A1A1A] text-white font-bold rounded-xl hover:bg-[#333] transition-all disabled:opacity-50"
            >
              {isSavingPassword ? 'Menyimpan...' : 'Ubah Password'}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-3xl p-6 border border-red-200">
          <h2 className="font-bold text-lg mb-2 text-red-700">Zona Bahaya</h2>
          <p className="text-xs text-red-600/70 mb-4 leading-relaxed">
            Menghapus akun akan memutus akses Anda secara permanen. Jika Anda adalah Owner, pastikan Anda telah menyelesaikan urusan dengan pelanggan sebelum menghapus akun, karena semua akses ke pesanan toko akan hilang.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {isDeleting ? 'Menghapus...' : 'Hapus Akun Saya'}
          </button>
        </div>

      </div>
    </div>
  );
}
