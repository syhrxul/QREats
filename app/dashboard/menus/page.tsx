'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { Sparkles, Wand2, Loader2, Camera } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  description?: string | null;
  category?: string | null;
}

interface MenuFormData {
  name: string;
  price: string;
  description: string;
  category: string;
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
  category: 'Makanan',
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

  const [categories, setCategories] = useState<string[]>(['Makanan', 'Minuman', 'Snack', 'Dessert', 'Lainnya']);
  const [isNewCategory, setIsNewCategory] = useState(false);

  const [shopId, setShopId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // AI Import State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreviewMenus, setAiPreviewMenus] = useState<Partial<MenuItem>[]>([]);
  const [aiError, setAiError] = useState('');

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

  // ─── Fetch Menus & Categories ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authChecking || accessDenied || !shopId) return;
    fetchMenus();
    fetchCategories();
  }, [shopId, authChecking, accessDenied]);

  async function fetchCategories() {
    if (!shopId) return;
    const { data, error } = await supabase
      .from('menu_categories')
      .select('name')
      .eq('shop_id', shopId)
      .order('name', { ascending: true });
    
    if (!error && data) {
      const customCats = data.map((c) => c.name);
      // Gabungkan default dengan custom (unique)
      const merged = Array.from(new Set(['Makanan', 'Minuman', 'Snack', 'Dessert', 'Lainnya', ...customCats]));
      setCategories(merged);
    }
  }


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
      category: menu.category ?? 'Makanan',
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

      const finalCategory = form.category.trim() || 'Makanan';

      // Jika ini kategori baru, simpan ke tabel menu_categories
      if (isNewCategory && shopId) {
        // Abaikan error duplicate key
        await supabase.from('menu_categories').insert({
          shop_id: shopId,
          name: finalCategory
        });
      }

      const payload: Partial<MenuItem> = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || null,
        category: finalCategory,
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
      await fetchCategories();
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

  // ─── AI Extraction Logic ──────────────────────────────────────────────────────

  async function handleAiUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    setAiError('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result;
        try {
          const res = await fetch('/api/ai/extract-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 })
          });
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || 'Failed to extract menu');
          
          if (data.menus && Array.isArray(data.menus)) {
            // Defaulting is_available to true
            const parsed = data.menus.map((m: any) => ({
              ...m,
              is_available: true
            }));
            setAiPreviewMenus(parsed);
          }
        } catch (err: any) {
          setAiError(err.message || String(err));
        } finally {
          setAiLoading(false);
        }
      };
      reader.onerror = () => {
        setAiError('Gagal membaca file gambar');
        setAiLoading(false);
      };
    } catch (err: any) {
      setAiError(err.message);
      setAiLoading(false);
    }
  }

  async function handleBatchSave() {
    if (!shopId || aiPreviewMenus.length === 0) return;
    setAiLoading(true);
    setAiError('');

    try {
      // 1. Dapatkan semua kategori unik dari AI yang bukan default
      const aiCats = Array.from(new Set(aiPreviewMenus.map(m => m.category).filter(Boolean))) as string[];
      for (const cat of aiCats) {
        if (!categories.includes(cat)) {
          // Insert kategori baru
          await supabase.from('menu_categories').insert({ shop_id: shopId, name: cat });
        }
      }

      // 2. Format payload untuk batch insert menus
      const insertPayload = aiPreviewMenus.map(m => ({
        shop_id: shopId,
        name: m.name,
        price: Number(m.price) || 0,
        description: m.description || null,
        category: m.category || 'Makanan',
        is_available: true,
      }));

      const { error } = await supabase.from('menus').insert(insertPayload);
      if (error) throw new Error(error.message);

      // Refresh
      await fetchCategories();
      await fetchMenus();
      setIsAiModalOpen(false);
      setAiPreviewMenus([]);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  function handleAiMenuChange(index: number, field: keyof MenuItem, value: string | number) {
    const updated = [...aiPreviewMenus];
    updated[index] = { ...updated[index], [field]: value };
    setAiPreviewMenus(updated);
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
          <div className="flex gap-2">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#1A1A1A]/10 text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#F5F2EB] hover:border-[#1A1A1A]/20 active:scale-95 transition-all shadow-sm group"
            >
              <Sparkles className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
              <span>Import Menu</span>
            </button>
            <button
              id="btn-add-menu"
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] active:scale-95 transition-all"
            >
              <span>+ Tambah Menu</span>
            </button>
          </div>
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
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#1A1A1A] truncate max-w-[70%]">{menu.name}</h3>
                    {menu.category && (
                      <span className="bg-[#1A1A1A]/5 text-[#1A1A1A]/60 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        {menu.category}
                      </span>
                    )}
                  </div>
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

              {/* Kategori */}
              <div>
                <label className="block text-xs font-medium text-[#1A1A1A]/60 mb-1.5">Kategori *</label>
                <select
                  id="input-menu-category"
                  value={isNewCategory ? '__new__' : form.category}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__new__') {
                      setIsNewCategory(true);
                      setForm({ ...form, category: '' });
                    } else {
                      setIsNewCategory(false);
                      setForm({ ...form, category: val });
                    }
                  }}
                  className="w-full px-4 py-3 bg-white border border-[#1A1A1A]/15 rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all mb-2"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__">+ Tambah Baru...</option>
                </select>
                
                {isNewCategory && (
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Ketik kategori baru..."
                    className="w-full px-4 py-3 bg-[#F5F2EB] border border-[#1A1A1A]/15 rounded-xl text-sm text-[#1A1A1A] placeholder-[#1A1A1A]/30 focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 transition-all"
                    autoFocus
                  />
                )}
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

      {/* AI Import Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsAiModalOpen(false)} />
          <div className="relative bg-[#F9F6EE] rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h3 className="text-lg font-bold text-[#1A1A1A]">
                ✨ Import Menu Otomatis dengan AI
              </h3>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#1A1A1A]/20 transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-2xl flex gap-3 items-start">
                <div className="p-2 bg-amber-100/50 rounded-lg shrink-0">
                  <Wand2 className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
                  Unggah foto atau PDF dari buku menu fisik Anda. AI kami akan mengekstrak daftar makanan, harga, dan kategorinya secara otomatis.
                </p>
              </div>

              {!aiPreviewMenus.length && (
                <div>
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAiUpload}
                      disabled={aiLoading}
                    />
                    <div className={`relative overflow-hidden border-2 border-dashed border-[#1A1A1A]/15 rounded-2xl p-10 text-center transition-all ${aiLoading ? 'bg-[#1A1A1A]/5 border-[#1A1A1A]/30 cursor-wait' : 'hover:bg-white/60 hover:border-[#1A1A1A]/30 cursor-pointer'}`}>
                      {aiLoading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-[#1A1A1A] animate-spin" />
                          <p className="text-sm font-bold text-[#1A1A1A]">AI sedang bekerja...</p>
                          <p className="text-xs text-[#1A1A1A]/50">Membaca menu Anda</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-[#1A1A1A]/5 flex items-center justify-center mb-1">
                            <Camera className="w-5 h-5 text-[#1A1A1A]/60" />
                          </div>
                          <p className="text-sm font-bold text-[#1A1A1A]">Tap untuk pilih foto</p>
                          <p className="text-xs text-[#1A1A1A]/50 font-medium">Mendukung format JPG, PNG, atau PDF</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {aiError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {aiError}
                </div>
              )}

              {aiPreviewMenus.length > 0 && (
                <div className="bg-white border border-[#1A1A1A]/15 rounded-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-sm text-[#1A1A1A]">
                      <thead className="bg-[#F5F2EB] sticky top-0 text-xs text-[#1A1A1A]/60 uppercase border-b border-[#1A1A1A]/10">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Nama & Kategori</th>
                          <th className="px-4 py-3 font-semibold text-right">Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A1A1A]/10">
                        {aiPreviewMenus.map((m, idx) => (
                          <tr key={idx} className="hover:bg-[#1A1A1A]/5">
                            <td className="px-4 py-3 align-top">
                              <input 
                                type="text"
                                value={m.name || ''}
                                onChange={(e) => handleAiMenuChange(idx, 'name', e.target.value)}
                                className="font-bold w-full bg-transparent border-b border-transparent hover:border-[#1A1A1A]/20 focus:border-[#1A1A1A]/50 focus:outline-none transition-colors"
                                placeholder="Nama Menu"
                              />
                              <div className="mt-1">
                                <input
                                  type="text"
                                  value={m.category || ''}
                                  onChange={(e) => handleAiMenuChange(idx, 'category', e.target.value)}
                                  className="text-[10px] uppercase font-bold text-[#1A1A1A] bg-[#1A1A1A]/10 px-1.5 py-0.5 rounded border-none focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/30 w-1/3 min-w-[80px]"
                                  placeholder="KATEGORI"
                                />
                              </div>
                              <div className="mt-1">
                                <input
                                  type="text"
                                  value={m.description || ''}
                                  onChange={(e) => handleAiMenuChange(idx, 'description', e.target.value)}
                                  className="text-xs text-[#1A1A1A]/60 w-full bg-transparent border-b border-transparent hover:border-[#1A1A1A]/20 focus:border-[#1A1A1A]/50 focus:outline-none transition-colors"
                                  placeholder="Deskripsi (Opsional)"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-sm font-semibold">Rp</span>
                                <input
                                  type="number"
                                  value={m.price || ''}
                                  onChange={(e) => handleAiMenuChange(idx, 'price', e.target.value)}
                                  className="w-24 text-right font-semibold bg-transparent border-b border-transparent hover:border-[#1A1A1A]/20 focus:border-[#1A1A1A]/50 focus:outline-none transition-colors"
                                  placeholder="0"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {aiPreviewMenus.length > 0 && (
              <div className="pt-4 shrink-0 mt-2 border-t border-[#1A1A1A]/10">
                <button
                  onClick={handleBatchSave}
                  disabled={aiLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {aiLoading ? 'Menyimpan...' : `Simpan ${aiPreviewMenus.length} Menu ke Database`}
                </button>
                <button
                  onClick={() => setAiPreviewMenus([])}
                  disabled={aiLoading}
                  className="w-full py-2.5 mt-2 text-[#1A1A1A] font-medium text-xs rounded-xl hover:bg-[#1A1A1A]/5 transition-all"
                >
                  Ulangi Upload
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
