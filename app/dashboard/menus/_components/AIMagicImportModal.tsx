import React from 'react';
import { Sparkles, Wand2, Loader2, Camera } from 'lucide-react';
import { MenuItem } from '../page';

interface AIMagicImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiLoading: boolean;
  aiError: string;
  aiPreviewMenus: Partial<MenuItem>[];
  handleAiUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBatchSave: () => void;
  handleAiMenuChange: (index: number, field: keyof MenuItem, value: string | number) => void;
}

export function AIMagicImportModal({
  isOpen, onClose, aiLoading, aiError, aiPreviewMenus, handleAiUpload, handleBatchSave, handleAiMenuChange
}: AIMagicImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#F9F6EE] rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h3 className="text-lg font-bold text-[#1A1A1A]">✨ Import Menu Otomatis dengan AI</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A] hover:bg-[#1A1A1A]/20 transition-colors text-sm">
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
                <input type="file" accept="image/*" className="hidden" onChange={handleAiUpload} disabled={aiLoading} />
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
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{aiError}</div>
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
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={m.name || ''}
                            onChange={(e) => handleAiMenuChange(idx, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-[#1A1A1A]/30 outline-none font-medium mb-1 py-1"
                            placeholder="Nama Menu"
                          />
                          <input
                            type="text"
                            value={m.category || ''}
                            onChange={(e) => handleAiMenuChange(idx, 'category', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-[#1A1A1A]/30 outline-none text-xs text-[#1A1A1A]/60 py-0.5"
                            placeholder="Kategori"
                          />
                        </td>
                        <td className="px-4 py-2 text-right align-top">
                          <input
                            type="number"
                            value={m.price || ''}
                            onChange={(e) => handleAiMenuChange(idx, 'price', e.target.value)}
                            className="w-24 bg-transparent border-b border-transparent focus:border-[#1A1A1A]/30 outline-none text-right font-medium py-1"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-[#F5F2EB] p-4 border-t border-[#1A1A1A]/10 text-xs text-[#1A1A1A]/50 flex justify-between items-center">
                <span>{aiPreviewMenus.length} menu ditemukan.</span>
                <span>Klik teks untuk mengedit.</span>
              </div>
            </div>
          )}
        </div>

        {aiPreviewMenus.length > 0 && (
          <div className="mt-6 pt-5 border-t border-[#1A1A1A]/10 flex justify-end gap-3 shrink-0">
            <button onClick={() => { handleAiUpload({ target: { files: [] } } as any); }} className="px-4 py-2 text-sm font-semibold text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors" disabled={aiLoading}>Batal</button>
            <button onClick={handleBatchSave} disabled={aiLoading} className="px-6 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold hover:bg-[#333] transition-all disabled:opacity-50 flex items-center gap-2">
              {aiLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {aiLoading ? 'Menyimpan...' : `Simpan ${aiPreviewMenus.length} Menu`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
