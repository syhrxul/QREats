import React, { useRef } from 'react';
import { Camera } from 'lucide-react';
import { MenuFormData } from '../page';

interface MenuEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalMode: 'add' | 'edit';
  form: MenuFormData;
  setForm: React.Dispatch<React.SetStateAction<MenuFormData>>;
  categories: string[];
  isNewCategory: boolean;
  setIsNewCategory: (val: boolean) => void;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  formError: string;
  saving: boolean;
  handleSave: () => void;
}

export function MenuEditorModal({
  isOpen, onClose, modalMode, form, setForm, categories, isNewCategory, setIsNewCategory,
  imageFile, setImageFile, formError, saving, handleSave
}: MenuEditorModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-md shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-900/5 flex items-center justify-between z-10">
          <h3 className="text-xl font-bold text-slate-900">
            {modalMode === 'add' ? 'Tambah Menu' : 'Edit Menu'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-900/5 flex items-center justify-center text-slate-900 hover:bg-slate-900/10 transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-col items-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 rounded-xl bg-slate-50 border-2 border-dashed border-slate-900/20 flex flex-col items-center justify-center text-slate-900/40 hover:bg-slate-900/5 hover:border-slate-900/40 transition-all cursor-pointer overflow-hidden relative group"
            >
              {imageFile ? (
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <>
                  <Camera className="w-8 h-8 mb-2 text-slate-900/30 group-hover:text-slate-900/50 transition-colors" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Foto Menu</span>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
              }}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-900/40 mb-1.5">Nama Menu *</label>
              <input
                type="text"
                placeholder="Contoh: Nasi Goreng Spesial"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:border-slate-900/20 focus:ring-0 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-900/40 mb-1.5">Harga (Rp) *</label>
              <input
                type="number"
                placeholder="Contoh: 25000"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:border-slate-900/20 focus:ring-0 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-900/40 mb-1.5">Kategori</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setIsNewCategory(false); setForm({ ...form, category: categories[0] || 'Makanan' }); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${!isNewCategory ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900/50 hover:bg-slate-900/10'}`}
                >Pilih Kategori</button>
                <button
                  type="button"
                  onClick={() => { setIsNewCategory(true); setForm({ ...form, category: '' }); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${isNewCategory ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900/50 hover:bg-slate-900/10'}`}
                >Kategori Baru</button>
              </div>

              {!isNewCategory ? (
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:border-slate-900/20 focus:ring-0 outline-none transition-all appearance-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ketik kategori baru..."
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:border-slate-900/20 focus:ring-0 outline-none transition-all"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-900/40 mb-1.5">Deskripsi Singkat</label>
              <textarea
                placeholder="Deskripsikan menu ini..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:border-slate-900/20 focus:ring-0 outline-none transition-all min-h-[80px]"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-900">Tersedia</p>
                <p className="text-[10px] text-slate-900/50 uppercase tracking-wider font-bold">Status Stok Menu</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_available: !form.is_available })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_available ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_available ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {formError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {formError}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 bg-slate-900 text-white font-medium text-sm rounded-xl hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : modalMode === 'add' ? 'Tambah Menu' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
