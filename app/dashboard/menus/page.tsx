'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { Sparkles, Edit2, Trash2 } from 'lucide-react';
import { AIMagicImportModal } from './_components/AIMagicImportModal';
import { MenuEditorModal } from './_components/MenuEditorModal';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  description?: string | null;
  category?: string | null;
}

export interface MenuFormData {
  name: string;
  price: string;
  description: string;
  category: string;
  is_available: boolean;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const EMPTY_FORM: MenuFormData = { name: '', price: '', description: '', category: 'Makanan', is_available: true };

export default function MenusDashboardPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuFormData>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const [categories, setCategories] = useState<string[]>(['Makanan', 'Minuman', 'Snack', 'Dessert', 'Lainnya']);
  const [isNewCategory, setIsNewCategory] = useState(false);

  const [shopId, setShopId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreviewMenus, setAiPreviewMenus] = useState<Partial<MenuItem>[]>([]);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccessDenied(true); setAuthChecking(false); return; }
      const { data: profile } = await supabase.from('profiles').select('role, shop_id').eq('id', user.id).single();
      if (!profile) { setAccessDenied(true); setAuthChecking(false); return; }
      setRole(profile.role);
      if (profile.role === 'superadmin') {
        const impId = localStorage.getItem('impersonated_shop_id');
        if (impId) setShopId(impId); else setAccessDenied(true);
      } else if (profile.role !== 'owner' && profile.role !== 'admin') {
        setAccessDenied(true);
      } else {
        setShopId(profile.shop_id);
      }
      setAuthChecking(false);
    }
    checkAccess();
  }, []);

  useEffect(() => {
    if (authChecking || accessDenied || !shopId) return;
    fetchMenus();
    fetchCategories();
  }, [shopId, authChecking, accessDenied]);

  async function fetchCategories() {
    if (!shopId) return;
    const { data, error } = await supabase.from('menu_categories').select('name').eq('shop_id', shopId).order('name', { ascending: true });
    if (!error && data) {
      const customCats = data.map((c) => c.name);
      setCategories(Array.from(new Set(['Makanan', 'Minuman', 'Snack', 'Dessert', 'Lainnya', ...customCats])));
    }
  }

  async function fetchMenus() {
    if (!shopId) return;
    setLoading(true);
    const { data, error } = await supabase.from('menus').select('*').eq('shop_id', shopId).order('name', { ascending: true });
    if (!error) setMenus(data ?? []);
    setLoading(false);
  }

  function openAddModal() {
    setForm(EMPTY_FORM); setImageFile(null); setFormError(''); setEditingId(null); setModalMode('add'); setIsModalOpen(true);
  }

  function openEditModal(menu: MenuItem) {
    setForm({ name: menu.name, price: String(menu.price), description: menu.description ?? '', category: menu.category ?? 'Makanan', is_available: menu.is_available });
    setImageFile(null); setFormError(''); setEditingId(menu.id); setModalMode('edit'); setIsModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) { setFormError('Nama dan harga wajib diisi.'); return; }
    setSaving(true); setFormError('');
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const fileName = `menu-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('menu-images').upload(fileName, imageFile, { upsert: true });
        if (uploadErr) throw new Error('Gagal upload: ' + uploadErr.message);
        const { data: publicData } = supabase.storage.from('menu-images').getPublicUrl(fileName);
        imageUrl = publicData.publicUrl;
      }
      const finalCategory = form.category.trim() || 'Makanan';
      if (isNewCategory && shopId) await supabase.from('menu_categories').insert({ shop_id: shopId, name: finalCategory });

      const payload: Partial<MenuItem> = {
        name: form.name.trim(), price: Number(form.price), description: form.description.trim() || null,
        category: finalCategory, is_available: form.is_available, ...(imageUrl !== null ? { image_url: imageUrl } : {}),
      };

      if (modalMode === 'add') {
        const { error } = await supabase.from('menus').insert({ ...payload, shop_id: shopId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('menus').update(payload).eq('id', editingId);
        if (error) throw new Error(error.message);
      }

      await fetchCategories();
      await fetchMenus();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus menu ini?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('menus').delete().eq('id', id);
    if (!error) await fetchMenus();
    else alert('Gagal menghapus menu: ' + error.message);
    setDeletingId(null);
  }

  async function handleToggleAvailability(menu: MenuItem) {
    const { error } = await supabase.from('menus').update({ is_available: !menu.is_available }).eq('id', menu.id);
    if (!error) setMenus(menus.map(m => m.id === menu.id ? { ...m, is_available: !menu.is_available } : m));
    else alert('Gagal update status: ' + error.message);
  }

  async function handleAiUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiLoading(true); setAiError('');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const res = await fetch('/api/ai/extract-menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: reader.result }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to extract menu');
          if (data.menus && Array.isArray(data.menus)) setAiPreviewMenus(data.menus.map((m: any) => ({ ...m, is_available: true })));
        } catch (err: any) { setAiError(err.message || String(err)); } finally { setAiLoading(false); }
      };
      reader.onerror = () => { setAiError('Gagal membaca file gambar'); setAiLoading(false); };
    } catch (err: any) { setAiError(err.message); setAiLoading(false); }
  }

  async function handleBatchSave() {
    if (!shopId || aiPreviewMenus.length === 0) return;
    setAiLoading(true); setAiError('');
    try {
      const aiCats = Array.from(new Set(aiPreviewMenus.map(m => m.category).filter(Boolean))) as string[];
      for (const cat of aiCats) if (!categories.includes(cat)) await supabase.from('menu_categories').insert({ shop_id: shopId, name: cat });
      const insertPayload = aiPreviewMenus.map(m => ({
        shop_id: shopId, name: m.name, price: Number(m.price) || 0, description: m.description || null, category: m.category || 'Makanan', is_available: true,
      }));
      const { error } = await supabase.from('menus').insert(insertPayload);
      if (error) throw new Error(error.message);
      await fetchCategories(); await fetchMenus(); setIsAiModalOpen(false); setAiPreviewMenus([]);
    } catch (err: any) { setAiError(err.message); } finally { setAiLoading(false); }
  }

  function handleAiMenuChange(index: number, field: keyof MenuItem, value: string | number) {
    const updated = [...aiPreviewMenus];
    updated[index] = { ...updated[index], [field]: value };
    setAiPreviewMenus(updated);
  }

  if (authChecking) return <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center"><p className="text-[#1A1A1A]/40 text-sm">Memeriksa akses...</p></div>;
  if (accessDenied) return <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center p-6"><div className="text-center max-w-sm"><div className="text-5xl mb-4">🚫</div><h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Access Denied</h1><a href="/login" className="inline-block mt-6 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-colors">Kembali ke Login</a></div></div>;

  return (
    <div className="bg-[#F5F2EB] min-h-screen">
      <div className="border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Kelola Menu Kafe</h2>
          <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{menus.length} item aktif terdaftar</p>
        </div>
        {role !== 'superadmin' && (
          <div className="flex gap-2">
            <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#1A1A1A]/10 text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#F5F2EB] hover:border-[#1A1A1A]/20 active:scale-95 transition-all shadow-sm group">
              <Sparkles className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
              <span>Import Menu</span>
            </button>
            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-[#333] active:scale-95 transition-all">
              <span>+ Tambah Menu</span>
            </button>
          </div>
        )}
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-[280px] bg-white rounded-2xl animate-pulse border border-[#1A1A1A]/5" />)}
          </div>
        ) : menus.length === 0 ? (
          <div className="text-center py-20 bg-white border border-[#1A1A1A]/5 rounded-3xl">
            <div className="text-4xl mb-3">🍽️</div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Menu Masih Kosong</h3>
            <p className="text-sm text-[#1A1A1A]/50 max-w-sm mx-auto mb-6">Belum ada menu yang ditambahkan.</p>
            {role !== 'superadmin' && <button onClick={openAddModal} className="px-6 py-3 bg-[#1A1A1A] text-white font-medium text-sm rounded-xl hover:bg-[#333] transition-colors">+ Tambah Menu Pertama</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menus.map((menu) => (
              <div key={menu.id} className={`group bg-white rounded-2xl border border-[#1A1A1A]/5 p-4 flex flex-col justify-between transition-all hover:border-[#1A1A1A]/20 hover:shadow-md ${!menu.is_available ? 'opacity-60 grayscale' : ''}`}>
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl bg-[#F5F2EB] flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {menu.image_url ? <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="text-2xl opacity-40">🍲</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1A1A1A] text-base leading-tight mb-1 truncate" title={menu.name}>{menu.name}</h3>
                    <p className="font-mono font-medium text-sm text-[#1A1A1A]/80 mb-1.5">{formatRupiah(menu.price)}</p>
                    <span className="inline-block px-2 py-0.5 bg-[#F5F2EB] text-[#1A1A1A]/60 text-[10px] font-bold uppercase tracking-wider rounded-md truncate max-w-full">{menu.category || 'Umum'}</span>
                  </div>
                </div>
                {menu.description && <p className="text-xs text-[#1A1A1A]/50 mt-3 line-clamp-2 leading-relaxed">{menu.description}</p>}
                {role !== 'superadmin' && (
                  <div className="mt-4 pt-4 border-t border-[#1A1A1A]/5 flex items-center justify-between">
                    <button onClick={() => handleToggleAvailability(menu)} className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${menu.is_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-[#F5F2EB] text-[#1A1A1A]/40 hover:bg-[#1A1A1A]/10'}`}>
                      {menu.is_available ? '✅ Tersedia' : '❌ Habis'}
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(menu)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Menu"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(menu.id)} disabled={deletingId === menu.id} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Hapus Menu"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <MenuEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} modalMode={modalMode} form={form} setForm={setForm} categories={categories} isNewCategory={isNewCategory} setIsNewCategory={setIsNewCategory} imageFile={imageFile} setImageFile={setImageFile} formError={formError} saving={saving} handleSave={handleSave} />
      <AIMagicImportModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} aiLoading={aiLoading} aiError={aiError} aiPreviewMenus={aiPreviewMenus} handleAiUpload={handleAiUpload} handleBatchSave={handleBatchSave} handleAiMenuChange={handleAiMenuChange} />
    </div>
  );
}
