'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  description?: string | null;
}

interface MenuFormData {
  name: string;
  price: string;
  description: string;
  is_available: boolean;
}

type ModalMode = 'add' | 'edit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

const EMPTY_FORM: MenuFormData = {
  name: '',
  price: '',
  description: '',
  is_available: true,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MenusDashboardPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuFormData>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [shopId, setShopId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // ─── Auth & Role Check ──────────────────────────────────────────────────────

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccessDenied(true); setAuthChecking(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, shop_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setAccessDenied(true);
        setAuthChecking(false);
        return;
      }

      setRole(profile.role);

      if (profile.role === 'superadmin') {
        // Cek impersonate shop id di localStorage
        const impId = localStorage.getItem('impersonated_shop_id');
        if (impId) {
          setShopId(impId);
        } else {
          setAccessDenied(true);
        }
      } else if (profile.role !== 'owner' && profile.role !== 'admin') {
        setAccessDenied(true);
      } else {
        setShopId(profile.shop_id);
      }
      setAuthChecking(false);
    }
    checkAccess();
  }, []);

  // ─── Fetch Menus ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authChecking || accessDenied || !shopId) return;
    fetchMenus();
  }, [authChecking, accessDenied, shopId]);

  async function fetchMenus() {
    if (!shopId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('shop_id', shopId)
      .order('name', { ascending: true });
    if (!error) setMenus(data ?? []);
    setLoading(false);
  }

  // ─── Modal Helpers ──────────────────────────────────────────────────────────

  function openAddModal() {
    setForm(EMPTY_FORM);
    setImageFile(null);
    setFormError('');
    setEditingId(null);
    setModalMode('add');
    setIsModalOpen(true);
  }

  function openEditModal(menu: MenuItem) {
    setForm({
      name: menu.name,
      price: String(menu.price),
      description: menu.description ?? '',
      is_available: menu.is_available,
    });
    setImageFile(null);
    setFormError('');
    setEditingId(menu.id);
    setModalMode('edit');
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setImageFile(null);
    setFormError('');
  }

  // ─── Save Menu ──────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim() || !form.price) {
      setFormError('Nama dan harga wajib diisi.');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      let imageUrl: string | null = null;

      // Upload gambar jika ada
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const fileName = `menu-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('menu-images')
          .upload(fileName, imageFile, { upsert: true });

        if (uploadErr) throw new Error('Gagal upload gambar: ' + uploadErr.message);

        const { data: publicData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);
        imageUrl = publicData.publicUrl;
      }

      const payload: Partial<MenuItem> = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || null,
        is_available: form.is_available,
        ...(imageUrl !== null ? { image_url: imageUrl } : {}),
      };

      if (modalMode === 'add') {
        const insertPayload = {
          ...payload,
          shop_id: shopId,
        };
        const { error } = await supabase.from('menus').insert(insertPayload);
        if (error) {
          // Tampilkan pesan + kode error Supabase untuk debugging
          const hint = (error as { hint?: string }).hint;
          const detail = (error as { details?: string }).details;
          const msg = [
            error.message,
            error.code ? `(kode: ${error.code})` : '',
            hint ? `Petunjuk: ${hint}` : '',
            detail ? `Detail: ${detail}` : '',
          ].filter(Boolean).join(' — ');
          throw new Error(msg);
        }
      } else if (editingId) {
        const { error } = await supabase.from('menus').update(payload).eq('id', editingId);
        if (error) {
          const hint = (error as { hint?: string }).hint;
          const msg = [
            error.message,
            error.code ? `(kode: ${error.code})` : '',
            hint ? `Petunjuk: ${hint}` : '',
          ].filter(Boolean).join(' — ');
          throw new Error(msg);
        }
      }

      await fetchMenus();
      closeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[QREats] Gagal simpan menu:', msg);
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete Menu ────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Hapus menu ini? Tindakan tidak bisa dibatalkan.')) return;
    setDeletingId(id);
    await supabase.from('menus').delete().eq('id', id);
    setMenus((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
  }

  // ─── Toggle Availability ────────────────────────────────────────────────────

  async function handleToggleAvailability(menu: MenuItem) {
    const next = !menu.is_available;
    await supabase.from('menus').update({ is_available: next }).eq('id', menu.id);
    setMenus((prev) => prev.map((m) => m.id === menu.id ? { ...m, is_available: next } : m));
  }

  // ─── Access Denied / Loading ────────────────────────────────────────────────

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center">
        <p className="text-[#1A1A1A]/40 text-sm">Memeriksa akses...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Access Denied</h1>
          <p className="text-sm text-[#1A1A1A]/50">
            Halaman ini hanya dapat diakses oleh Owner atau Admin. Silakan login dengan akun yang tepat.
          </p>
          <a
            href="/login"
            className="inline-block mt-6 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-colors"
          >
            Kembali ke Login
          </a>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="bg-[#F5F2EB]">
      {/* Header Info */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Kelola Menu Kafe</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{menus.length} item aktif terdaftar</p>
        </div>
        {role !== 'superadmin' && (
          <button
            id="btn-add-menu"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] active:scale-95 transition-all"
          >
            <span>+ Tambah Menu</span>
          </button>
        )}
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-white/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : menus.length === 0 ? (
          <div className="text-center py-24 text-[#1A1A1A]/30">
            <p className="text-5xl mb-4">🍽️</p>
            <p className="text-lg font-medium">Belum ada menu</p>
            <p className="text-sm mt-1">Klik &ldquo;Tambah Menu&rdquo; untuk memulai</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="bg-white border border-[#1A1A1A]/8 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Foto */}
                <div className="h-36 bg-[#F5F2EB] relative">
                  {menu.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={menu.image_url}
                      alt={menu.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🍴</div>
                  )}
                  {/* Status badge */}
                  <button
                    id={`btn-toggle-${menu.id}`}
                    onClick={() => role !== 'superadmin' && handleToggleAvailability(menu)}
                    disabled={role === 'superadmin'}
                    className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                      role === 'superadmin' ? 'cursor-not-allowed opacity-80' : ''
                    } ${
                      menu.is_available
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    {menu.is_available ? 'Tersedia' : 'Habis'}
                  </button>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-[#1A1A1A] truncate">{menu.name}</h3>
                  {menu.description && (
                    <p className="text-xs text-[#1A1A1A]/40 mt-0.5 line-clamp-1">{menu.description}</p>
                  )}
                  <p className="text-base font-bold text-[#1A1A1A] mt-1.5">{formatRupiah(menu.price)}</p>

                  {role !== 'superadmin' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        id={`btn-edit-${menu.id}`}
                        onClick={() => openEditModal(menu)}
                        className="flex-1 py-2 text-xs border border-[#1A1A1A]/20 text-[#1A1A1A] rounded-lg hover:bg-[#1A1A1A]/5 transition-colors font-medium"
                      >
                        Edit
                      </button>
                      <button
                        id={`btn-delete-${menu.id}`}
                        onClick={() => handleDelete(menu.id)}
                        disabled={deletingId === menu.id}
                        className="flex-1 py-2 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
                      >
                        {deletingId === menu.id ? '...' : 'Hapus'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[#F9F6EE] rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#1A1A1A]">
                {modalMode === 'add' ? 'Tambah Menu Baru' : 'Edit Menu'}
              </h3>
              <button
                id="btn-close-modal"
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#1A1A1A]/20 transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-xs font-medium text-[#1A1A1A]/60 mb-1.5">Nama Menu *</label>
                <input
                  id="input-menu-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Nasi Goreng Spesial"
                  className="w-full px-4 py-3 bg-white border border-[#1A1A1A]/15 rounded-xl text-sm text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all"
                />
              </div>

              {/* Harga */}
              <div>
                <label className="block text-xs font-medium text-[#1A1A1A]/60 mb-1.5">Harga (Rp) *</label>
                <input
                  id="input-menu-price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="25000"
                  className="w-full px-4 py-3 bg-white border border-[#1A1A1A]/15 rounded-xl text-sm text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-medium text-[#1A1A1A]/60 mb-1.5">Deskripsi</label>
                <textarea
                  id="input-menu-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi singkat menu..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-[#1A1A1A]/15 rounded-xl text-sm text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all resize-none"
                />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-xs font-medium text-[#1A1A1A]/60 mb-1.5">Foto Menu</label>
                <label className="block cursor-pointer">
                  <input
                    id="input-menu-image"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="border border-dashed border-[#1A1A1A]/20 rounded-xl p-4 text-center hover:bg-white/50 transition-colors">
                    {imageFile ? (
                      <p className="text-sm text-[#1A1A1A]/70 truncate">{imageFile.name}</p>
                    ) : (
                      <p className="text-sm text-[#1A1A1A]/40">Tap untuk pilih gambar</p>
                    )}
                  </div>
                </label>
              </div>

              {/* Toggle ketersediaan */}
              <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-[#1A1A1A]/10">
                <span className="text-sm font-medium text-[#1A1A1A]">Tersedia dijual</span>
                <button
                  id="toggle-availability"
                  type="button"
                  onClick={() => setForm({ ...form, is_available: !form.is_available })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.is_available ? 'bg-[#1A1A1A]' : 'bg-[#1A1A1A]/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      form.is_available ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {formError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {formError}
                </div>
              )}

              <button
                id="btn-save-menu"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 bg-[#1A1A1A] text-white font-medium text-sm rounded-xl hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : modalMode === 'add' ? 'Tambah Menu' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
